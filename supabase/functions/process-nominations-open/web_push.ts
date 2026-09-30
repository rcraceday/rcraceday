export type WebPushNotification = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  type?: string;
};

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hkdf(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt, info },
      key,
      length * 8
    )
  );
}

async function importVapidSigningKey(publicKeyB64: string, privateKeyB64: string) {
  const pub = base64UrlToBytes(publicKeyB64);
  const priv = base64UrlToBytes(privateKeyB64);
  if (pub.length !== 65 || pub[0] !== 4) {
    throw new Error("VAPID_PUBLIC_KEY must be an uncompressed P-256 key");
  }
  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: bytesToBase64Url(pub.slice(1, 33)),
    y: bytesToBase64Url(pub.slice(33, 65)),
    d: bytesToBase64Url(priv),
    ext: true,
  };
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

async function createVapidJwt(endpoint: string, subject: string, signingKey: CryptoKey) {
  const encoder = new TextEncoder();
  const header = bytesToBase64Url(encoder.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = bytesToBase64Url(
    encoder.encode(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: subject,
      })
    )
  );
  const data = encoder.encode(`${header}.${payload}`);
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signingKey, data)
  );
  return `${header}.${payload}.${bytesToBase64Url(signature)}`;
}

async function encryptPayload(
  plaintext: Uint8Array,
  userPublicRaw: Uint8Array,
  userAuth: Uint8Array
): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const localKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const localPublic = new Uint8Array(await crypto.subtle.exportKey("raw", localKeys.publicKey));
  const userPublic = await crypto.subtle.importKey(
    "raw",
    userPublicRaw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: userPublic }, localKeys.privateKey, 256)
  );
  const encoder = new TextEncoder();
  const ikm = await hkdf(
    ecdhSecret,
    userAuth,
    concatBytes(encoder.encode("WebPush: info\0"), userPublicRaw, localPublic),
    32
  );
  const cek = await hkdf(ikm, salt, encoder.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(ikm, salt, encoder.encode("Content-Encoding: nonce\0"), 12);
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const padded = concatBytes(plaintext, new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded)
  );
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concatBytes(salt, rs, new Uint8Array([localPublic.length]), localPublic, ciphertext);
}

async function sendOne(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublic: string,
  vapidSubject: string,
  signingKey: CryptoKey
) {
  const body = await encryptPayload(
    new TextEncoder().encode(payload),
    base64UrlToBytes(subscription.keys.p256dh),
    base64UrlToBytes(subscription.keys.auth)
  );
  const jwt = await createVapidJwt(subscription.endpoint, vapidSubject, signingKey);
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapidPublic}`,
      TTL: "86400",
      Urgency: "high",
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
    },
    body,
  });
  if (!response.ok) {
    const err = new Error(`Push endpoint ${response.status}`) as Error & { statusCode?: number };
    err.statusCode = response.status;
    throw err;
  }
}

export async function sendWebPushToUsers(
  supabase: any,
  userIds: string[],
  notification: WebPushNotification
): Promise<{ sent: number; failed: number; removed: number; note: string }> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { sent: 0, failed: 0, removed: 0, note: "no users selected for push" };
  }

  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:info@rcraceday.com";
  if (!publicKey || !privateKey) {
    console.warn("web push skipped: VAPID keys not configured");
    return { sent: 0, failed: 0, removed: 0, note: "VAPID secrets missing on Edge Function" };
  }

  let signingKey: CryptoKey;
  try {
    signingKey = await importVapidSigningKey(publicKey, privateKey);
  } catch (err) {
    console.warn("vapid key import failed", err);
    return { sent: 0, failed: 0, removed: 0, note: "VAPID keys could not be imported" };
  }

  const { data: rows, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, subscription")
    .in("user_id", uniqueIds);

  if (error) {
    console.warn("push_subscriptions select", error);
    return { sent: 0, failed: 0, removed: 0, note: error.message };
  }
  if (!rows?.length) {
    return { sent: 0, failed: 0, removed: 0, note: "no device subscriptions; members must tap Enable push in RCRaceday Settings" };
  }

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body ?? "",
    url: notification.url ?? "/",
    tag: notification.tag ?? notification.type ?? "rcraceday",
  });

  let sent = 0;
  let failed = 0;
  let removed = 0;

  for (const row of rows) {
    const sub = row.subscription as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      failed += 1;
      continue;
    }
    try {
      await sendOne(
        { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
        payload,
        publicKey,
        subject,
        signingKey
      );
      sent += 1;
    } catch (err: unknown) {
      failed += 1;
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", row.id);
        removed += 1;
      }
      console.warn("web push send failed", row.endpoint, err);
    }
  }

  return { sent, failed, removed, note: sent ? "" : "push endpoints rejected every device" };
}
