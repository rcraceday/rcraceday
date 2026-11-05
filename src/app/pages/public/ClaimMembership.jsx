import { useEffect, useState } from "react";
import {
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useTranslation } from "@/app/i18n/I18nContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { claimHouseholdMembership } from "@/app/lib/claimClubMembership";
import { reconcileClubAccess } from "@/app/lib/reconcileClubAccess";
import {
  platformHomePath,
  publicClaimMembershipPath,
  resolvePostAuthAppPath,
  returnToFromSearch,
  sanitizeClubAppReturnPath,
} from "@/app/lib/publicAuthRedirect";

export default function ClaimMembership() {
  const { club } = useOutletContext();
  const { clubSlug } = useParams();
  const { user, loadingUser } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [membershipEmail, setMembershipEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [checkingLoginEmail, setCheckingLoginEmail] = useState(true);

  const returnTo = returnToFromSearch(searchParams);
  const safeReturnTo = sanitizeClubAppReturnPath(returnTo, clubSlug);
  const loginEmail = user?.email || "";
  const logoSrc = club?.logo_url || club?.logo || null;

  useEffect(() => {
    if (loadingUser) return;
    if (!user) {
      navigate(
        platformHomePath(publicClaimMembershipPath(clubSlug, safeReturnTo)),
        { replace: true }
      );
      return;
    }
    setCheckingLoginEmail(false);
  }, [loadingUser, user, clubSlug, navigate, safeReturnTo]);

  useEffect(() => {
    if (!loginEmail || membershipEmail) return;
    setMembershipEmail(loginEmail);
  }, [loginEmail, membershipEmail]);

  async function handleClaim(e) {
    e.preventDefault();
    setErrorMsg("");

    const email = membershipEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg(t("signup.enterClubEmail"));
      return;
    }

    setLoading(true);
    const result = await claimHouseholdMembership({
      clubId: club.id,
      membershipEmail: email,
    });
    setLoading(false);

    if (!result.ok) {
      const key = {
        not_found: "claimMembership.notFound",
        already_linked: "claimMembership.alreadyLinked",
        already_has_membership: "claimMembership.alreadyHasMembership",
      }[result.error];
      setErrorMsg(t(key || "claimMembership.failed"));
      return;
    }

    navigate(
      resolvePostAuthAppPath({
        clubSlug,
        firstLogin: true,
        returnTo: safeReturnTo,
      })
    );
  }

  async function handleContinueVisitor() {
    setErrorMsg("");
    setContinuing(true);
    await reconcileClubAccess({
      user,
      club,
      clubSlug,
      navigate,
      returnTo: safeReturnTo,
      skipMembershipClaim: true,
      onError: (message) => setErrorMsg(message),
    });
    setContinuing(false);
  }

  if (loadingUser || !club || checkingLoginEmail || !user) {
    return <div style={{ padding: "24px", textAlign: "center" }}>{t("loading.loading")}</div>;
  }

  return (
    <div className="public-auth">
      {logoSrc ? <img src={logoSrc} alt={club.name} className="public-auth-logo" /> : null}

      <h1 className="public-auth-title">{t("claimMembership.title")}</h1>
      <p className="public-auth-lead">
        {t("claimMembership.signedInAs", { email: loginEmail })}
      </p>
      <p className="public-auth-lead">
        {t("claimMembership.membershipEmailHelp", { clubName: club.name })}
      </p>

      {errorMsg ? <p className="public-auth-error">{errorMsg}</p> : null}

      <form onSubmit={handleClaim} className="public-auth-form">
        <Input
          label={t("claimMembership.membershipEmail")}
          type="email"
          value={membershipEmail}
          onChange={(e) => setMembershipEmail(e.target.value)}
          required
        />
        <Button type="submit" variant="primary" disabled={loading || continuing}>
          {loading ? t("claimMembership.linking") : t("claimMembership.submit")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={loading || continuing}
          onClick={handleContinueVisitor}
        >
          {continuing ? t("claimMembership.continuing") : t("claimMembership.continueVisitor")}
        </Button>
      </form>
    </div>
  );
}
