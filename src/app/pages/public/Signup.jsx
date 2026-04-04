// src/app/pages/public/Signup.jsx
import { useOutletContext, Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/supabaseClient";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function Signup() {
  const { club } = useOutletContext();
  const { clubSlug } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  if (!club) return <div style={{ padding: 24, textAlign: "center" }}>Loading…</div>;

  // ⭐ KEEP the Chargers logo (club logo)
  const logoSrc =
    club?.logo_url ||
    club?.logo ||
    club?.theme?.hero?.logo ||
    club?.branding?.logo ||
    club?.assets?.logo ||
    null;

  const isValidEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  async function handleSignup(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) return setErrorMsg("Please enter your full name.");
    if (!isValidEmail(email.trim())) return setErrorMsg("Please enter a valid email address.");
    if (password.length < 6) return setErrorMsg("Password must be at least 6 characters long.");
    if (password !== confirmPassword) return setErrorMsg("Passwords do not match.");

    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    const { data: existingUser, error: existingError } = await supabase
      .from("profiles")
      .select("email")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingError) {
      setErrorMsg("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    if (existingUser) {
      setErrorMsg("This email is already registered. Please log in instead.");
      setLoading(false);
      return;
    }

    const redirectUrl = `${window.location.origin}/${clubSlug}/public/login/`;

    const parts = name.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : firstName;

    const payload = {
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        shouldCreateUser: true,
        data: {
          full_name: name.trim(),
          first_name: firstName,
          last_name: lastName,
          email: cleanEmail,
          club_name: club?.name || "",
          club_logo_url: club?.logo_url || club?.logo || "",
        },
      },
    };

    const { error } = await supabase.auth.signUp(payload);

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();

    navigate(
      `/${clubSlug}/public/check-email?email=${encodeURIComponent(cleanEmail)}`
    );

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
      {/* ⭐ Chargers logo stays */}
      {logoSrc && (
        <img
          src={logoSrc}
          alt={club?.name}
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
        Create Account
      </h1>

      <form
        onSubmit={handleSignup}
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <Input
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Input
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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

        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Creating account…" : "Sign Up"}
        </Button>
      </form>

      <p style={{ textAlign: "center", marginTop: "24px", color: "#666" }}>
        Already have an account?{" "}
        <Link
          to={`/${clubSlug}/public/login`}
          style={{ color: "#2563eb", textDecoration: "underline" }}
        >
          Log in
        </Link>
      </p>

      {/* ⭐ Back to Clubs button */}
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
