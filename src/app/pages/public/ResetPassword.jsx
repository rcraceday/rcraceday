// src/app/pages/public/ResetPassword.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams, useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/app/i18n/I18nContext";
import {
  clearAuthCallbackErrorsFromUrl,
  getAuthCallbackErrorFromLocation,
  normalizeResetPasswordLocation,
} from "@/app/lib/publicAuthRedirect";
import rcracedayLogo from "@/assets/rcraceday_logo.png";

function hasRecoveryCallbackInUrl() {
  const { hash, search } = window.location;
  return (
    hash.includes("access_token") ||
    search.includes("code=") ||
    search.includes("token_hash=")
  );
}

function clearAuthCallbackFromUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  ["code", "token_hash", "type"].forEach((key) => {
    url.searchParams.delete(key);
  });
  const search = url.searchParams.toString();
  window.history.replaceState(
    {},
    document.title,
    `${url.pathname}${search ? `?${search}` : ""}`
  );
}

function recoveryTypeFromSearch(typeParam) {
  const t = String(typeParam || "").toLowerCase();
  if (t === "recovery" || t === "signup" || t === "email" || t === "invite") {
    return t;
  }
  return "recovery";
}

export default function ResetPassword() {
  const outlet = useOutletContext();
  const club = outlet?.club;
  const { clubSlug } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkStatus, setLinkStatus] = useState("pending");

  useEffect(() => {
    let cancelled = false;
    let authListener = null;

    function markReady() {
      if (cancelled) return;
      setLinkStatus("ready");
    }

    function markInvalid(message) {
      if (cancelled) return;
      setErrorMsg(message || t("auth.resetLinkInvalid"));
      setLinkStatus("invalid");
    }

    async function resolveRecoveryLink() {
      normalizeResetPasswordLocation();

      const callbackError = getAuthCallbackErrorFromLocation();
      if (callbackError) {
        clearAuthCallbackErrorsFromUrl();
        const msg =
          callbackError.errorCode === "otp_expired" ||
          /expired|invalid/i.test(callbackError.description)
            ? t("auth.resetLinkExpired")
            : callbackError.description || t("auth.resetLinkInvalid");
        markInvalid(msg);
        return;
      }

      const searchParams = new URLSearchParams(window.location.search);
      const tokenHash = searchParams.get("token_hash");
      const otpType = recoveryTypeFromSearch(searchParams.get("type"));

      if (tokenHash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });
        if (verifyError) {
          console.warn("ResetPassword verifyOtp:", verifyError.message);
          markInvalid(verifyError.message);
          return;
        }
        clearAuthCallbackFromUrl();
        markReady();
        return;
      }

      const hashParams = new URLSearchParams(
        window.location.hash.replace(/^#/, "?")
      );
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          console.warn("ResetPassword setSession:", sessionError.message);
          markInvalid(sessionError.message);
          return;
        }
        clearAuthCallbackFromUrl();
        markReady();
        return;
      }

      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.warn(
            "ResetPassword exchangeCodeForSession:",
            exchangeError.message
          );
          if (/code verifier|pkce/i.test(exchangeError.message)) {
            markInvalid(t("auth.resetLinkPkce"));
          } else {
            markInvalid(exchangeError.message);
          }
          return;
        }
        clearAuthCallbackFromUrl();
        markReady();
        return;
      }

      const hasCallback = hasRecoveryCallbackInUrl();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        if (hasCallback) clearAuthCallbackFromUrl();
        markReady();
        return;
      }

      if (!hasCallback) {
        markInvalid(t("auth.resetLinkInvalid"));
        return;
      }

      const { data: listener } = supabase.auth.onAuthStateChange(
        (event, newSession) => {
          if (cancelled) return;
          if (
            event !== "PASSWORD_RECOVERY" &&
            event !== "SIGNED_IN" &&
            event !== "INITIAL_SESSION"
          ) {
            return;
          }
          if (!newSession?.user) return;
          listener.subscription.unsubscribe();
          clearAuthCallbackFromUrl();
          markReady();
        }
      );
      authListener = listener;

      window.setTimeout(async () => {
        if (cancelled) return;
        const {
          data: { session: lateSession },
        } = await supabase.auth.getSession();
        if (lateSession?.user) {
          clearAuthCallbackFromUrl();
          markReady();
          return;
        }
        markInvalid(t("auth.resetLinkInvalid"));
      }, 8000);
    }

    resolveRecoveryLink();

    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe();
    };
  }, [t]);

  async function handleReset(e) {
    e.preventDefault();
    setErrorMsg("");
    setMessage("");

    if (!password || !confirm) {
      setErrorMsg("Please enter and confirm your new password.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (linkStatus !== "ready") {
      setErrorMsg("Missing or invalid reset token.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();

    setMessage("Your password has been updated.");
    setLoading(false);

    setTimeout(() => {
      navigate("/");
    }, 1500);
  }

  if (clubSlug && !club) {
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
    rcracedayLogo;

  const canShowForm = linkStatus === "ready";
  const checkingLink = linkStatus === "pending";

  return (
    <div className="public-auth" style={!club ? { padding: 0 } : undefined}>
      {logoSrc ? (
        <img
          src={logoSrc}
          alt={club?.name || t("header.brandAlt")}
          className={club ? "public-auth-logo" : "public-brand-logo"}
        />
      ) : null}

      <h1 className="public-auth-title">{t("auth.resetPasswordTitle")}</h1>

      {checkingLink ? (
        <p className="public-auth-lead">{t("loading.checkingSession")}</p>
      ) : null}

      {linkStatus === "invalid" ? (
        <>
          <p className="public-auth-error">{errorMsg || t("auth.resetLinkInvalid")}</p>
          <p className="public-auth-footer">
            <Link to="/forgot-password" className="public-auth-link">
              {t("auth.forgotPasswordTitle")}
            </Link>
          </p>
        </>
      ) : null}

      {canShowForm ? (
        <form onSubmit={handleReset} className="public-auth-form">
          <Input
            label="New Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Input
            label="Confirm Password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          {errorMsg ? <p className="public-auth-error">{errorMsg}</p> : null}
          {message ? <p className="public-auth-success">{message}</p> : null}

          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? t("common.updating") : t("auth.updatePassword")}
          </Button>
        </form>
      ) : null}

      <p className="public-auth-footer">
        Back to{" "}
        <Link to="/" className="public-auth-link">
          {t("auth.logIn")}
        </Link>
      </p>
    </div>
  );
}
