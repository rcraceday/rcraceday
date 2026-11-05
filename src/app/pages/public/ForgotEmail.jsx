// src/app/pages/public/ForgotEmail.jsx

import { useState } from "react";
import { useParams, useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/app/i18n/I18nContext";
import { platformSignInPath } from "@/app/lib/publicAuthRedirect";
import rcracedayLogo from "@/assets/rcraceday_logo.png";

const PLATFORM_SUPPORT_EMAIL = "info@rcraceday.com";

export default function ForgotEmail() {
  const outlet = useOutletContext();
  const club = outlet?.club;
  const { clubSlug } = useParams();
  const { t } = useTranslation();

  const [fullName, setFullName] = useState("");
  const [messageText, setMessageText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (clubSlug && !club) {
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
    PLATFORM_SUPPORT_EMAIL;

  const logoSrc =
    club?.logo_url ||
    club?.logo ||
    club?.theme?.hero?.logo ||
    club?.branding?.logo ||
    club?.assets?.logo ||
    rcracedayLogo;

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
        clubName: club?.name || "RCRaceday",
        clubLogo: logoSrc,
        supportEmail,
        ip,
        clubSlug: clubSlug || "",
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
    <div className="public-auth">
        {logoSrc ? (
          <img src={logoSrc} alt={club?.name || t("header.brandAlt")} className="public-auth-logo" />
        ) : null}

        <h1 className="public-auth-title">{t("auth.forgotEmailTitle")}</h1>
        <p className="public-auth-lead">
          {clubSlug ? t("auth.forgotEmailHint") : t("auth.forgotEmailHintPlatform")}
        </p>

        <form onSubmit={handleSubmit} className="public-auth-form">
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

          {errorMsg ? <p className="public-auth-error">{errorMsg}</p> : null}
          {message ? <p className="public-auth-success">{message}</p> : null}

          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? t("auth.sending") : t("auth.sendResetLink")}
          </Button>
        </form>

        <p className="public-auth-footer">
          {t("signup.backTo")}{" "}
          <Link to="/" replace className="public-auth-link">
            {t("auth.logIn")}
          </Link>
        </p>
    </div>
  );
}
