// src/app/pages/public/CheckEmail.jsx
import { useOutletContext, useParams, Link } from "react-router-dom";
import { useTranslation } from "@/app/i18n/I18nContext";
import {
  platformSignInPath,
  publicClaimMembershipPath,
  returnToFromSearch,
  sanitizeClubAppReturnPath,
} from "@/app/lib/publicAuthRedirect";
import RequestConfirmationEmailHelp from "@/app/components/auth/RequestConfirmationEmailHelp";

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

  if (!club) return <div className="p-6 text-center">{t("loading.loading")}</div>;

  const logoSrc = club?.logo_url || club?.logo || null;

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

      <RequestConfirmationEmailHelp
        email={email}
        club={club}
        clubSlug={clubSlug}
        clubLogo={logoSrc || ""}
      />

      <p className="text-center mt-8 text-gray-600">
        {t("signup.alreadyConfirmed")}{" "}
        <Link to={signInPath} className="public-auth-link">
          {t("auth.logIn")}
        </Link>
      </p>
    </div>
  );
}
