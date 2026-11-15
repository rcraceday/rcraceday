// supabase/functions/send-recovery-email/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

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
    return { ok: false, error: "RESEND_API_KEY is not configured on the server." };
  }

  const from =
    Deno.env.get("SUPPORT_MAIL_FROM")?.trim() ||
    "RCRaceday <noreply@rcraceday.com>";

  const payload: Record<string, unknown> = {
    from,
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
    return { ok: false, error: message };
  }

  return { ok: true, id: data?.id ?? null };
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

    const html = `
      <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111827;">
        ${logoBlock}
        <p><strong>${escapeHtml(clubName)}</strong> support request</p>
        <p><strong>From:</strong> ${escapeHtml(fullName)}</p>
        ${clubSlug ? `<p><strong>Club slug:</strong> ${escapeHtml(clubSlug)}</p>` : ""}
        <p><strong>IP:</strong> ${escapeHtml(ip)}</p>
        <hr />
        <pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(message || "(no message)")}</pre>
      </div>
    `;

    const sent = await sendWithResend({
      to: supportEmail,
      subject,
      html,
      replyTo,
    });

    if (!sent.ok) {
      console.error("send-recovery-email", sent.error);
      return jsonResponse({ error: sent.error }, 503);
    }

    return jsonResponse({ success: true, id: sent.id });
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
