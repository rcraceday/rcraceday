// src/app/pages/public/ForgotPassword.jsx
import { useState } from "react";
import { useParams, useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/app/i18n/I18nContext";
import {
  passwordResetRedirectUrl,
} from "@/app/lib/publicAuthRedirect";
import rcracedayLogo from "@/assets/rcraceday_logo.png";

export default function ForgotPassword() {
  const outlet = useOutletContext();
  const club = outlet?.club;
  const { clubSlug } = useParams();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (clubSlug && !club) return <div style={{ padding: "24px", textAlign: "center" }}>{t("loading.loading")}</div>;

  const logoSrc =
    club?.logoUrl ||
    club?.logo ||
    club?.logo_url ||
    club?.theme?.hero?.logo ||
    club?.branding?.logo ||
    club?.assets?.logo ||
    rcracedayLogo;

  async function handleReset(e) {
    e.preventDefault();
    setErrorMsg("");
    setMessage("");

    if (!email.trim()) {
      setErrorMsg("Please enter your email address.");
      return;
    }

    setLoading(true);

    const redirectUrl = passwordResetRedirectUrl(clubSlug);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: redirectUrl }
    );

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    setMessage("A password reset link has been sent to your email.");
    setLoading(false);
  }

  return (
    <div className="public-auth">
      {logoSrc ? (
        <img src={logoSrc} alt={club?.name || t("header.brandAlt")} className="public-auth-logo" />
      ) : null}

      <h1 className="public-auth-title">{t("auth.forgotPasswordTitle")}</h1>

      <form onSubmit={handleReset} className="public-auth-form">
        <Input
          label={t("auth.email")}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {errorMsg ? <p className="public-auth-error">{errorMsg}</p> : null}
        {message ? <p className="public-auth-success">{message}</p> : null}

        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? t("auth.sending") : t("auth.sendResetLink")}
        </Button>
      </form>

      <p className="public-auth-footer">
        Remember your password?{" "}
        <Link to="/" className="public-auth-link">
          {t("auth.logIn")}
        </Link>
      </p>
    </div>
  );
}
