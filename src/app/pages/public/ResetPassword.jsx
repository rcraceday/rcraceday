// src/app/pages/public/ResetPassword.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams, useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/app/i18n/I18nContext";
import { normalizeResetPasswordLocation } from "@/app/lib/publicAuthRedirect";

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
  if (url.searchParams.has("code")) url.searchParams.delete("code");
  if (url.searchParams.has("token_hash")) url.searchParams.delete("token_hash");
  const search = url.searchParams.toString();
  window.history.replaceState(
    {},
    document.title,
    `${url.pathname}${search ? `?${search}` : ""}`
  );
}

export default function ResetPassword() {
  const { club } = useOutletContext();
  const { clubSlug } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkStatus, setLinkStatus] = useState("pending");
  const [legacyAccessToken, setLegacyAccessToken] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let authListener = null;

    function markReady(accessToken = null) {
      if (cancelled) return;
      if (accessToken) setLegacyAccessToken(accessToken);
      setLinkStatus("ready");
    }

    function markInvalid() {
      if (cancelled) return;
      setLinkStatus("invalid");
      setErrorMsg("Invalid or expired reset link.");
    }

    async function resolveRecoveryLink() {
      normalizeResetPasswordLocation();

      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const otpType = searchParams.get("type");

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.warn(
            "ResetPassword exchangeCodeForSession:",
            exchangeError.message
          );
        } else {
          clearAuthCallbackFromUrl();
          markReady();
          return;
        }
      }

      if (tokenHash && otpType) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });
        if (!verifyError) {
          clearAuthCallbackFromUrl();
          markReady();
          return;
        }
        console.warn("ResetPassword verifyOtp:", verifyError.message);
      }

      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.replace(/^#/, "?"));
      const accessToken = hashParams.get("access_token");

      if (accessToken) {
        clearAuthCallbackFromUrl();
        markReady(accessToken);
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
        markInvalid();
        return;
      }

      const { data: listener } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          if (cancelled) return;
          if (
            event !== "SIGNED_IN" &&
            event !== "INITIAL_SESSION" &&
            event !== "PASSWORD_RECOVERY" &&
            event !== "TOKEN_REFRESHED"
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

        setLinkStatus((current) => {
          if (current === "pending") {
            setErrorMsg("Invalid or expired reset link.");
            return "invalid";
          }
          return current;
        });
      }, 10000);
    }

    resolveRecoveryLink();

    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

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

    const { error } = legacyAccessToken
      ? await supabase.auth.updateUser(
          { password },
          { accessToken: legacyAccessToken }
        )
      : await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();

    setMessage("Your password has been updated.");
    setLoading(false);

    setTimeout(() => {
      navigate(`/${clubSlug}/public/login`);
    }, 1500);
  }

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

  const canShowForm = linkStatus === "ready";
  const checkingLink = linkStatus === "pending";

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
          {t("auth.resetPasswordTitle")}
        </h1>

        {checkingLink && (
          <p style={{ textAlign: "center", marginBottom: "24px", color: "#666" }}>
            {t("loading.checkingSession")}
          </p>
        )}

        {linkStatus === "invalid" && (
          <p
            style={{
              color: "#dc2626",
              textAlign: "center",
              marginBottom: "24px",
              wordBreak: "break-word",
            }}
          >
            {errorMsg || "Invalid or expired reset link."}
          </p>
        )}

        {canShowForm && (
          <form
            onSubmit={handleReset}
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              boxSizing: "border-box",
            }}
          >
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
                {loading ? t("common.updating") : t("auth.updatePassword")}
              </Button>
            </div>
          </form>
        )}

        <p style={{ textAlign: "center", marginTop: "24px", color: "#666" }}>
          Back to{" "}
          <Link
            to={`/${clubSlug}/public/login`}
            style={{ color: "#2563eb", textDecoration: "underline" }}
          >
            {t("auth.logIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
