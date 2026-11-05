import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useTranslation } from "@/app/i18n/I18nContext";
import {
  platformSignupPathForClub,
  publicClaimMembershipPath,
  returnToFromSearch,
  sanitizeClubAppReturnPath,
} from "@/app/lib/publicAuthRedirect";

/** Club signup URLs redirect to platform signup, then club access for this tenant. */
export default function RedirectClubSignup() {
  const { user, loadingUser } = useAuth();
  const { clubSlug } = useParams();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const safeReturnTo = sanitizeClubAppReturnPath(
    returnToFromSearch(searchParams),
    clubSlug
  );

  if (loadingUser) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        {t("loading.loading")}
      </div>
    );
  }

  if (user) {
    return (
      <Navigate
        to={publicClaimMembershipPath(clubSlug, safeReturnTo)}
        replace
      />
    );
  }

  return (
    <Navigate to={platformSignupPathForClub(clubSlug, safeReturnTo)} replace />
  );
}
