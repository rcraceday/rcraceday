// Auth callback handler for /:clubSlug/public/login (email confirm, etc.).
// Day-to-day sign-in is at / — see ClubPublicLoginEntry.jsx.
import { useState, useEffect } from "react";
import {
  useNavigate,
  useParams,
  useOutletContext,
  Link,
  useSearchParams,
} from "react-router-dom";
import { supabase } from "@/supabaseClient";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/app/i18n/I18nContext";
import {
  hasAuthCallbackInUrl,
  platformLoginPathForClub,
  publicLoginPath,
  returnToFromSearch,
  sanitizeClubAppReturnPath,
} from "@/app/lib/publicAuthRedirect";
import { reconcileClubAccess } from "@/app/lib/reconcileClubAccess";

function clearAuthCallbackFromUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  if (url.searchParams.has("code")) url.searchParams.delete("code");
  if (url.searchParams.has("token_hash")) url.searchParams.delete("token_hash");
  const search = url.searchParams.toString();
  window.history.replaceState(
    {},
    document.title,
    `${url.pathname}${search ? `?${search}` : ""}`
  );
}

async function resolveFreshUser() {
  const { data: refreshData, error: refreshError } =
    await supabase.auth.refreshSession();
  if (refreshError) {
    console.warn("Login refreshSession:", refreshError.message);
  }
  const sessionUser = refreshData?.session?.user;
  if (sessionUser) return sessionUser;

  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export default function Login() {
  const { club } = useOutletContext();
  const { clubSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const loginReturnTo = returnToFromSearch(searchParams);
  const safeLoginReturnTo = sanitizeClubAppReturnPath(loginReturnTo, clubSlug);

  const [errorMsg, setErrorMsg] = useState("");
  const [checkingExistingSession, setCheckingExistingSession] = useState(true);

  useEffect(() => {
    if (!club) return;

    let cancelled = false;
    let authListener = null;

    function goAfterAuth(to) {
      navigate(to, { replace: true });
    }

    async function completeEmailConfirmationLogin(user) {
      clearAuthCallbackFromUrl();
      const freshUser = (await resolveFreshUser()) || user;
      await reconcileClubAccess({
        user: freshUser,
        club,
        clubSlug,
        navigate: goAfterAuth,
        returnTo: safeLoginReturnTo,
        onError: (message) => {
          if (!cancelled) setErrorMsg(message);
        },
      });
      if (!cancelled) setCheckingExistingSession(false);
    }

    async function checkSession() {
      if (loginReturnTo && loginReturnTo !== safeLoginReturnTo) {
        navigate(publicLoginPath(clubSlug, safeLoginReturnTo), { replace: true });
        return;
      }

      if (!hasAuthCallbackInUrl()) {
        navigate(platformLoginPathForClub(clubSlug, safeLoginReturnTo), {
          replace: true,
        });
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (session?.user?.email_confirmed_at) {
        await completeEmailConfirmationLogin(session.user);
        return;
      }

      const { data: listener } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          if (cancelled) return;
          if (
            event !== "SIGNED_IN" &&
            event !== "INITIAL_SESSION" &&
            event !== "TOKEN_REFRESHED"
          ) {
            return;
          }
          const confirmedUser = newSession?.user;
          if (!confirmedUser?.email_confirmed_at) return;

          listener.subscription.unsubscribe();
          await completeEmailConfirmationLogin(confirmedUser);
        }
      );
      authListener = listener;

      window.setTimeout(() => {
        if (!cancelled) setCheckingExistingSession(false);
      }, 10000);
    }

    checkSession();

    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe();
    };
  }, [club, clubSlug, loginReturnTo, navigate, safeLoginReturnTo]);

  if (!club) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        {t("loading.loading")}
      </div>
    );
  }

  const logoSrc =
    club?.logoUrl ||
    club?.logo ||
    club?.logo_url ||
    club?.theme?.hero?.logo ||
    club?.branding?.logo ||
    club?.assets?.logo ||
    null;

  if (checkingExistingSession) {
    return (
      <div className="public-auth">
        {logoSrc ? (
          <img src={logoSrc} alt={club.name} className="public-auth-logo" />
        ) : null}
        <p style={{ textAlign: "center" }}>{t("loading.checkingSession")}</p>
      </div>
    );
  }

  return (
    <div className="public-auth">
      {logoSrc ? (
        <img src={logoSrc} alt={club.name} className="public-auth-logo" />
      ) : null}
      <h1 className="public-auth-title">{t("auth.checkEmailTitle")}</h1>
      {errorMsg ? <p className="public-auth-error">{errorMsg}</p> : null}
      <p className="public-auth-lead">{t("auth.checkEmailBody")}</p>
      <p className="public-auth-footer">
        <Link to="/" className="public-auth-link">
          {t("platformHome.backHome")}
        </Link>
      </p>
      <div className="public-auth-actions">
        <Button onClick={() => navigate("/")}>{t("auth.backToClubs")}</Button>
      </div>
    </div>
  );
}
