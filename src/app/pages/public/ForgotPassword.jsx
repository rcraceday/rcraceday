// src/app/pages/public/ForgotPassword.jsx
import { useState } from "react";
import { useNavigate, useParams, useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function ForgotPassword() {
  const { club } = useOutletContext();
  const { clubSlug } = useParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!club) return <div style={{ padding: "24px", textAlign: "center" }}>Loading…</div>;

  const logoSrc =
    club?.logoUrl ||
    club?.logo ||
    club?.logo_url ||
    club?.theme?.hero?.logo ||
    club?.branding?.logo ||
    club?.assets?.logo ||
    null;

  async function handleReset(e) {
    e.preventDefault();
    setErrorMsg("");
    setMessage("");

    if (!email.trim()) {
      setErrorMsg("Please enter your email address.");
      return;
    }

    setLoading(true);

    const redirectUrl = `${window.location.origin}/${clubSlug}/public/reset-password/`;

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
    <div
      style={{
        padding: "32px 24px",
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
        Reset Password
      </h1>

      <form
        onSubmit={handleReset}
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {errorMsg && (
          <p style={{ color: "#dc2626", fontSize: "14px", textAlign: "center", wordBreak: "break-word" }}>
            {errorMsg}
          </p>
        )}

        {message && (
          <p style={{ color: "#059669", fontSize: "14px", textAlign: "center", wordBreak: "break-word" }}>
            {message}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Sending…" : "Send Reset Link"}
        </Button>
      </form>

      <p style={{ textAlign: "center", marginTop: "24px", color: "#666" }}>
        Remember your password?{" "}
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
