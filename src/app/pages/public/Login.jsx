// src/app/pages/public/Login.jsx
import { useState } from "react";
import { useNavigate, useParams, useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import TextInput from "@/components/ui/Input";
import Button from "@/components/ui/Button";

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
        padding: "32px 24px 0 24px",   // no bottom padding
        width: "100%",
        maxWidth: "360px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        boxSizing: "border-box",
        minHeight: "100vh",            // forces scroll on mobile
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

        {errorMsg && (
          <p style={{ color: "#dc2626", fontSize: "14px", textAlign: "center" }}>
            {errorMsg}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Logging in…" : "Log In"}
        </Button>
      </form>

      {/* SIGNUP CTA */}
      <p style={{ textAlign: "center", marginTop: "24px", color: "#666" }}>
        Don’t have an account?{" "}
        <Link
          to={`/${clubSlug}/public/signup`}
          style={{ color: "#2563eb", textDecoration: "underline" }}
        >
          Sign up
        </Link>
      </p>

      {/* ONE-LINE CENTERED LINKS BELOW CTA */}
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
          Forgot email?
        </Link>

        <Link
          to={`/${clubSlug}/public/forgot-password`}
          style={{ color: "#2563eb", whiteSpace: "nowrap" }}
        >
          Forgot password?
        </Link>
      </div>

      {/* 🔴 BACK TO CLUBS BUTTON */}
      <div
  style={{
    marginTop: "16px",
    width: "100%",
    display: "flex",
    justifyContent: "center",
  }}
>
  <Button
    onClick={() => navigate("/")}
    className="w-full py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700"
  >
    ← Back to Clubs
  </Button>
</div>

    </div>
  );
}
