// src/app/pages/public/ResetPassword.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams, useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import TextInput from "@/components/ui/TextInput";
import Button from "@/components/ui/Button";

export default function ResetPassword() {
  const { club } = useOutletContext();
  const { clubSlug } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);

  if (!club) return <div style={{ padding: "24px", textAlign: "center" }}>Loading…</div>;

  const logoSrc =
    club?.logoUrl ||
    club?.logo ||
    club?.logo_url ||
    club?.theme?.hero?.logo ||
    club?.branding?.logo ||
    club?.assets?.logo ||
    null;

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", "?"));
    const accessToken = params.get("access_token");

    if (!accessToken) {
      setErrorMsg("Invalid or expired reset link.");
      return;
    }

    setToken(accessToken);
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

    if (!token) {
      setErrorMsg("Missing or invalid reset token.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser(
      { password },
      { accessToken: token }
    );

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    setMessage("Your password has been updated.");
    setLoading(false);

    setTimeout(() => {
      navigate(`/${clubSlug}/public/login`);
    }, 1500);
  }

  return (
    <div
      style={{
        padding: "32px 24px",
        width: "100%",
        maxWidth: "360px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
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
        Set New Password
      </h1>

      {!token && (
        <p style={{ color: "#dc2626", textAlign: "center", marginBottom: "24px" }}>
          Invalid or expired reset link.
        </p>
      )}

      {token && (
        <form
          onSubmit={handleReset}
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <TextInput
            label="New Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errorMsg.includes("Password") ? errorMsg : ""}
          />

          <TextInput
            label="Confirm Password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errorMsg.includes("match") ? errorMsg : ""}
          />

          {errorMsg && (
            <p style={{ color: "#dc2626", fontSize: "14px", textAlign: "center" }}>
              {errorMsg}
            </p>
          )}

          {message && (
            <p style={{ color: "#059669", fontSize: "14px", textAlign: "center" }}>
              {message}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Updating…" : "Update Password"}
          </Button>
        </form>
      )}

      <p style={{ textAlign: "center", marginTop: "24px", color: "#666" }}>
        Back to{" "}
        <Link
          to={`/${clubSlug}/public/login`}
          style={{ color: "#2563eb", textDecoration: "underline" }}
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
