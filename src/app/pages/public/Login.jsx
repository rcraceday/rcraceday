// src/app/pages/public/Login.jsx
import { useState } from "react";
import { useNavigate, useParams, useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import TextInput from "@/components/ui/TextInput";
import Button from "@/components/ui/Button";

// RC RaceDay global logo
import rcracedayLogo from "@/assets/rcraceday_logo.png";

export default function Login() {
  const { club } = useOutletContext();
  const { clubSlug } = useParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
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
      setErrorMsg(
        error.message.includes("Invalid login credentials")
          ? "Incorrect email or password."
          : error.message
      );
      setLoading(false);
      return;
    }

    navigate(`/${clubSlug}/app/`);
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
            maxWidth: "160px", // 🔥 Hard cap so it NEVER explodes again
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
        Log In
      </h1>

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
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <TextInput
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* Forgot password + forgot email */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "-8px",
            marginBottom: "4px",
          }}
        >
          <Link
            to={`/${clubSlug}/public/forgot-password`}
            style={{ fontSize: "14px", color: "#2563eb" }}
          >
            Forgot password?
          </Link>

          <Link
            to={`/${clubSlug}/public/forgot-email`}
            style={{ fontSize: "14px", color: "#2563eb" }}
          >
            Forgot email?
          </Link>
        </div>

        {errorMsg && (
          <p style={{ color: "#dc2626", fontSize: "14px", textAlign: "center" }}>
            {errorMsg}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Logging in…" : "Log In"}
        </Button>
      </form>

      <p style={{ textAlign: "center", marginTop: "24px", color: "#666" }}>
        Don’t have an account?{" "}
        <Link
          to={`/${clubSlug}/public/signup`}
          style={{ color: "#2563eb", textDecoration: "underline" }}
        >
          Sign up
        </Link>
      </p>

      {/* RC RaceDay global home link */}
      <div style={{ marginTop: "40px", display: "flex", justifyContent: "center" }}>
        <img
          src={rcracedayLogo}
          alt="RC RaceDay"
          onClick={() => navigate("/")}
          style={{
            width: "96px",
            height: "auto",
            cursor: "pointer",
            transition: "transform 0.2s ease",
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
        />
      </div>
    </div>
  );
}
