// src/app/pages/public/Login.jsx
import { useState, useEffect } from "react";
import {
  useNavigate,
  useParams,
  useOutletContext,
  Link,
  useSearchParams,
} from "react-router-dom";
import { supabase } from "@/supabaseClient";
import TextInput from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/app/i18n/I18nContext";
import {
  isSafeClubAppReturnPath,
  publicCheckEmailPath,
  publicSignupPath,
  returnToFromSearch,
} from "@/app/lib/publicAuthRedirect";
import { reconcileClubAccess } from "@/app/lib/reconcileClubAccess";

function hasAuthCallbackInUrl() {
  const { hash, search } = window.location;
  return (
    hash.includes("access_token") ||
    hash.includes("type=signup") ||
    search.includes("code=") ||
    search.includes("token_hash=")
  );
}

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
  const safeLoginReturnTo =
    loginReturnTo && isSafeClubAppReturnPath(loginReturnTo, clubSlug)
      ? loginReturnTo
      : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingExistingSession, setCheckingExistingSession] = useState(true);

  // ⭐ ALL HOOKS MUST RUN BEFORE ANY RETURN
  useEffect(() => {
    if (!club) return;

    let cancelled = false;
    let authListener = null;

    async function completeEmailConfirmationLogin(user) {
      clearAuthCallbackFromUrl();
      const freshUser = (await resolveFreshUser()) || user;
      await reconcileClubAccess({
        user: freshUser,
        club,
        clubSlug,
        navigate,
        userNotFoundMessage: t("auth.userNotFoundSignup"),
        returnTo: safeLoginReturnTo,
        onError: (message) => {
          if (!cancelled) setErrorMsg(message);
        },
      });
      if (!cancelled) setCheckingExistingSession(false);
    }

    async function checkSession() {
      const authCallback = hasAuthCallbackInUrl();

      if (authCallback) {
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
        return;
      }

      const { data } = await supabase.auth.getUser();
      const existingUser = data?.user;

      if (!existingUser) {
        setCheckingExistingSession(false);
        return;
      }

      if (!existingUser.email_confirmed_at) {
        await supabase.auth.signOut();
        setCheckingExistingSession(false);
        return;
      }

      await reconcileClubAccess({
        user: existingUser,
        club,
        clubSlug,
        navigate,
        userNotFoundMessage: t("auth.userNotFoundSignup"),
        returnTo: safeLoginReturnTo,
        onError: (message) => {
          if (!cancelled) setErrorMsg(message);
        },
      });
      if (!cancelled) setCheckingExistingSession(false);
    }

    checkSession();

    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe();
    };
  }, [club, clubSlug, navigate, safeLoginReturnTo, t]);

  // ⭐ SAFE CONDITIONAL RETURNS (AFTER HOOKS)
  if (!club) {
    return <div style={{ padding: "24px", textAlign: "center" }}>{t("loading.loading")}</div>;
  }

  if (checkingExistingSession) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        {t("loading.checkingSession")}
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

  async function handleLogin(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim() || !password) {
      setErrorMsg("Please enter your email and password.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        navigate(
          publicCheckEmailPath(
            clubSlug,
            email.trim().toLowerCase(),
            safeLoginReturnTo
          )
        );
      } else if (error.message.includes("Invalid login credentials")) {
        navigate(publicSignupPath(clubSlug, safeLoginReturnTo), {
          state: {
            message: t("auth.userNotFoundSignup"),
          },
        });
      } else {
        setErrorMsg(error.message);
      }
      setLoading(false);
      return;
    }

    const user = await resolveFreshUser();

    if (!user) {
      setErrorMsg("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    await reconcileClubAccess({
      user,
      club,
      clubSlug,
      navigate,
      userNotFoundMessage: t("auth.userNotFoundSignup"),
      returnTo: safeLoginReturnTo,
      onError: (message) => setErrorMsg(message),
    });
    setLoading(false);
  }

  return (
    <div
      style={{
        padding: "32px 24px 0 24px",
        width: "100%",
        maxWidth: "360px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        boxSizing: "border-box",
        minHeight: "100vh",
        justifyContent: "flex-start",
      }}
    >
      {logoSrc && (
        <img
          src={logoSrc}
          alt={club.name}
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
        {t("auth.logIn")}
      </h1>

      {errorMsg && (
        <p style={{ color: "#dc2626", fontSize: "14px", textAlign: "center", marginBottom: "16px" }}>
          {errorMsg}
        </p>
      )}

      <form
        onSubmit={handleLogin}
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <TextInput
          label={t("auth.email")}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <TextInput
          label={t("auth.password")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? t("auth.loggingIn") : t("auth.logIn")}
        </Button>
      </form>

      <p style={{ textAlign: "center", marginTop: "24px", color: "#666" }}>
        {t("auth.noAccount")}{" "}
        <Link
          to={publicSignupPath(clubSlug, safeLoginReturnTo)}
          style={{ color: "#2563eb", textDecoration: "underline" }}
        >
          {t("auth.signUp")}
        </Link>
      </p>

      <div
        style={{
          width: "100%",
          marginTop: "6px",
          textAlign: "center",
          fontSize: "14px",
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          flexWrap: "nowrap",
        }}
      >
        <Link
          to={`/${clubSlug}/public/forgot-email`}
          style={{ color: "#2563eb", whiteSpace: "nowrap" }}
        >
          {t("auth.forgotEmail")}
        </Link>

        <Link
          to={`/${clubSlug}/public/forgot-password`}
          style={{ color: "#2563eb", whiteSpace: "nowrap" }}
        >
          {t("auth.forgotPassword")}
        </Link>
      </div>

      <div
        style={{
          marginTop: "16px",
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Button onClick={() => navigate("/")}>{t("auth.backToClubs")}</Button>
      </div>
    </div>
  );
}
