// supabase/functions/send-recovery-email/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, prefer",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const SUPABASE_BLOCKED_SMTP_PORTS = new Set([25, 587]);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function extractReplyTo(message: string): string | null {
  const match = message.match(/^Reply-to:\s*(\S+)/im);
  if (!match) return null;
  const email = match[1].trim().toLowerCase();
  return EMAIL_PATTERN.test(email) ? email : null;
}

function mailFromAddress() {
  return (
    Deno.env.get("SUPPORT_MAIL_FROM")?.trim() ||
    "RCRaceday <noreply@rcraceday.com>"
  );
}

function smtpConnection() {
  const host = Deno.env.get("SMTP_HOST")?.trim();
  const user = Deno.env.get("SMTP_USER")?.trim();
  const pass = Deno.env.get("SMTP_PASS")?.trim();
  const portRaw = Deno.env.get("SMTP_PORT")?.trim() || "465";
  const port = Number(portRaw);
  const secureFlag = Deno.env.get("SMTP_SECURE")?.trim().toLowerCase();
  const tls =
    secureFlag === "true" ? true : secureFlag === "false" ? false : port === 465;

  if (!host || !user || !pass) {
    return {
      ok: false as const,
      error:
        "SMTP_HOST, SMTP_USER, and SMTP_PASS must be set as Edge secrets.",
    };
  }
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    return { ok: false as const, error: "SMTP_PORT is invalid." };
  }
  if (SUPABASE_BLOCKED_SMTP_PORTS.has(port)) {
    return {
      ok: false as const,
      error:
        `SMTP port ${port} is blocked on Supabase Edge Functions. Use port 465 (implicit TLS), your provider alternate SMTP port (for example 2525 or 2587), or set EMAIL_TRANSPORT=resend when RESEND_API_KEY is configured.`,
    };
  }

  return {
    ok: true as const,
    connection: {
      hostname: host,
      port,
      tls,
      auth: { username: user, password: pass },
    },
  };
}

async function sendWithSmtp({
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
}) {
  const cfg = smtpConnection();
  if (!cfg.ok) {
    return { ok: false, error: cfg.error, transport: "smtp" as const };
  }

  const client = new SMTPClient({ connection: cfg.connection });

  try {
    await client.send({
      from: mailFromAddress(),
      to,
      replyTo: replyTo || undefined,
      subject,
      content: text,
      html,
    });
    await client.close();
    return { ok: true, id: null, transport: "smtp" as const };
  } catch (err) {
    try {
      await client.close();
    } catch {
      // ignore
    }
    const message = err instanceof Error ? err.message : "SMTP send failed";
    return { ok: false, error: message, transport: "smtp" as const };
  }
}

async function sendWithResend({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string | null;
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error: "RESEND_API_KEY is not configured on the server.",
      transport: "resend" as const,
    };
  }

  const payload: Record<string, unknown> = {
    from: mailFromAddress(),
    to: [to],
    subject,
    html,
  };
  if (replyTo) payload.reply_to = replyTo;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.message === "string"
        ? data.message
        : typeof data?.error === "string"
          ? data.error
          : `Resend returned HTTP ${res.status}`;
    return { ok: false, error: message, transport: "resend" as const };
  }

  return { ok: true, id: data?.id ?? null, transport: "resend" as const };
}

async function deliverEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
}) {
  const mode = (Deno.env.get("EMAIL_TRANSPORT")?.trim().toLowerCase() || "auto");
  const smtpPort = Number(Deno.env.get("SMTP_PORT")?.trim() || "465");
  const smtpBlocked = SUPABASE_BLOCKED_SMTP_PORTS.has(smtpPort);

  if (mode === "resend") {
    return sendWithResend(opts);
  }

  if (mode === "smtp") {
    return sendWithSmtp(opts);
  }

  if (smtpBlocked) {
    const resend = await sendWithResend(opts);
    if (resend.ok) return resend;
    const cfg = smtpConnection();
    if (!cfg.ok) {
      return { ok: false, error: cfg.error };
    }
    return resend;
  }

  const smtp = await sendWithSmtp(opts);
  if (smtp.ok) return smtp;

  if (Deno.env.get("RESEND_API_KEY")?.trim()) {
    const resend = await sendWithResend(opts);
    if (resend.ok) return resend;
    return {
      ok: false,
      error: `SMTP failed (${smtp.error}). Resend fallback failed (${resend.error}).`,
    };
  }

  return smtp;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const fullName = String(body?.fullName || "").trim();
    const message = String(body?.message || "").trim();
    const clubName = String(body?.clubName || "RCRaceday").trim() || "RCRaceday";
    const clubLogo = String(body?.clubLogo || "").trim();
    const supportEmail = String(body?.supportEmail || "").trim().toLowerCase();
    const ip = String(body?.ip || "unknown").trim();
    const clubSlug = String(body?.clubSlug || "").trim();

    if (!fullName) {
      return jsonResponse({ error: "fullName is required" }, 400);
    }
    if (!supportEmail || !EMAIL_PATTERN.test(supportEmail)) {
      return jsonResponse({ error: "supportEmail is invalid" }, 400);
    }
    if (fullName.length > 200) {
      return jsonResponse({ error: "fullName is too long" }, 400);
    }
    if (message.length > 10000) {
      return jsonResponse({ error: "message is too long" }, 400);
    }

    const replyTo = extractReplyTo(message);
    const subject = clubSlug
      ? `[${clubName}] Support request from ${fullName}`
      : `[RCRaceday] Message from ${fullName}`;

    const logoBlock = clubLogo
      ? `<p><img src="${escapeHtml(clubLogo)}" alt="" style="max-width:160px;height:auto;" /></p>`
      : "";

    const plainBody = message || "(no message)";

    const html = `
      <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111827;">
        ${logoBlock}
        <p><strong>${escapeHtml(clubName)}</strong> support request</p>
        <p><strong>From:</strong> ${escapeHtml(fullName)}</p>
        ${clubSlug ? `<p><strong>Club slug:</strong> ${escapeHtml(clubSlug)}</p>` : ""}
        <p><strong>IP:</strong> ${escapeHtml(ip)}</p>
        <hr />
        <pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(plainBody)}</pre>
      </div>
    `;

    const text = [
      `${clubName} support request`,
      `From: ${fullName}`,
      clubSlug ? `Club slug: ${clubSlug}` : "",
      `IP: ${ip}`,
      "",
      plainBody,
    ]
      .filter(Boolean)
      .join("\n");

    const sent = await deliverEmail({
      to: supportEmail,
      subject,
      html,
      text,
      replyTo,
    });

    if (!sent.ok) {
      console.error("send-recovery-email", sent.error);
      return jsonResponse({ error: sent.error }, 503);
    }

    return jsonResponse({
      success: true,
      id: sent.id,
      transport: "transport" in sent ? sent.transport : undefined,
    });
  } catch (err) {
    console.error("send-recovery-email", err);
    return jsonResponse(
      {
        error: err instanceof Error ? err.message : "Unknown error",
      },
      500,
    );
  }
});
