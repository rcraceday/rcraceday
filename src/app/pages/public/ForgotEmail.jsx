// src/app/pages/public/ForgotEmail.jsx

import { useState } from "react";
import { useParams, useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function ForgotEmail() {
  const { club } = useOutletContext();
  const { clubSlug } = useParams();
  const { t } = useTranslation();

  const [fullName, setFullName] = useState("");
  const [messageText, setMessageText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!club) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        {t("loading.loading")}
      </div>
    );
  }

  const supportEmail =
    club?.system_support_email ||
    club?.support_email ||
    club?.club_email ||
    null;

  const logoSrc =
    club?.logo_url ||
    club?.logo ||
    club?.theme?.hero?.logo ||
    club?.branding?.logo ||
    club?.assets?.logo ||
    null;

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setMessage("");

    if (!fullName.trim()) {
      setErrorMsg(t("signup.nameRequired"));
      return;
    }

    if (!supportEmail) {
      setErrorMsg(t("signup.noSupportEmail"));
      return;
    }

    setLoading(true);

    let ip = "";
    try {
      const ipRes = await fetch("https://api.ipify.org?format=json");
      const ipJson = await ipRes.json();
      ip = ipJson.ip;
    } catch {
      ip = "0.0.0.0";
    }

    const { error } = await supabase.functions.invoke("send-recovery-email", {
      body: {
        fullName: fullName.trim(),
        message: messageText.trim(),
        clubName: club?.name,
        clubLogo: logoSrc,
        supportEmail,
        ip,
        clubSlug,
      },
    });

    if (error) {
      setErrorMsg(t("signup.sendFailed"));
      setLoading(false);
      return;
    }

    setMessage(t("signup.requestSent"));
    setLoading(false);
  }

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        padding: "32px 24px",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
        }}
      >
        {logoSrc && (
          <img
            src={logoSrc}
            alt={club?.name}
            style={{
              maxWidth: "160px",
              width: "100%",
              height: "auto",
              display: "block",
              marginBottom: "20px",
            }}
          />
        )}

        <h1
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          {t("auth.forgotEmailTitle")}
        </h1>

        <form
          onSubmit={handleSubmit}
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            boxSizing: "border-box",
          }}
        >
          <Input
            label={t("signup.fullName")}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <Input
            label={t("signup.messageOptional")}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
          />

          {errorMsg && (
            <p
              style={{
                color: "#dc2626",
                fontSize: "14px",
                textAlign: "center",
                wordBreak: "break-word",
              }}
            >
              {errorMsg}
            </p>
          )}

          {message && (
            <p
              style={{
                color: "#059669",
                fontSize: "14px",
                textAlign: "center",
                wordBreak: "break-word",
              }}
            >
              {message}
            </p>
          )}

          <div style={{ width: "100%", maxWidth: "360px", margin: "0 auto" }}>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? t("auth.sending") : t("auth.sendResetLink")}
            </Button>
          </div>
        </form>

        <p style={{ textAlign: "center", marginTop: "24px", color: "#666" }}>
          {t("signup.backTo")}{" "}
          <Link
            to={`/${clubSlug}/public/login/`}
            replace={true}
            style={{ color: "#2563eb", textDecoration: "underline" }}
          >
            {t("auth.logIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
