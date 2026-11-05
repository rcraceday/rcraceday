// src/app/pages/public/CheckEmail.jsx
import { useOutletContext, useParams, Link } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/supabaseClient";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/app/i18n/I18nContext";
import {
  platformConfirmEmailRedirectUrl,
  platformSignInPath,
  publicClaimMembershipPath,
  returnToFromSearch,
  sanitizeClubAppReturnPath,
} from "@/app/lib/publicAuthRedirect";

export default function CheckEmail() {
  const { club } = useOutletContext();
  const { clubSlug } = useParams();
  const { t } = useTranslation();

  const params = new URLSearchParams(window.location.search);
  const email = params.get("email");
  const returnTo = returnToFromSearch(params);
  const safeReturnTo = sanitizeClubAppReturnPath(returnTo, clubSlug);
  const signInPath = platformSignInPath(
    publicClaimMembershipPath(clubSlug, safeReturnTo)
  );

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!club) return <div className="p-6 text-center">{t("loading.loading")}</div>;

  // Clean, safe logo resolution
  const logoSrc = club?.logo_url || club?.logo || null;

  async function resendEmail() {
    setLoading(true);
    setMessage("");

    const redirectUrl = platformConfirmEmailRedirectUrl();

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: redirectUrl,
      }
    });

    setMessage(error ? error.message : t("signup.resendSent"));
    setLoading(false);
  }

  return (
    <div className="public-auth">

      {logoSrc && (
        <img
          src={logoSrc}
          alt={club?.name}
          className="public-auth-logo"
        />
      )}

      <h1 className="public-auth-title">{t("auth.checkEmailTitle")}</h1>

      <p className="text-center text-gray-700 mb-6">
        {t("signup.checkEmailSentTo")}
        <br />
        <span className="font-semibold">{email}</span>
      </p>

      <Button onClick={resendEmail} disabled={loading} variant="primary">
        {loading ? t("signup.resending") : t("signup.resendEmail")}
      </Button>

      {message && (
        <p className="text-center text-sm mt-4 text-gray-600">{message}</p>
      )}

      <p className="text-center mt-8 text-gray-600">
        {t("signup.alreadyConfirmed")}{" "}
        <Link to={signInPath} className="public-auth-link">
          {t("auth.logIn")}
        </Link>
      </p>
    </div>
  );
}
