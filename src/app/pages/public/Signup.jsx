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

  const logoSrc = club?.logo_url || club?.logo || null;

  const isValidEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  async function handleSignup(e) {
    e.preventDefault();

    console.log("🔥 handleSignup CALLED");

    setErrorMsg("");

    if (!name.trim()) {
      console.log("❌ Name invalid");
      return setErrorMsg("Please enter your full name.");
    }
    if (!isValidEmail(email.trim())) {
      console.log("❌ Email invalid");
      return setErrorMsg("Please enter a valid email address.");
    }
    if (password.length < 6) {
      console.log("❌ Password too short");
      return setErrorMsg("Password must be at least 6 characters long.");
    }
    if (password !== confirmPassword) {
      console.log("❌ Passwords do not match");
      return setErrorMsg("Passwords do not match.");
    }

    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    console.log("🔥 Checking existing profile for:", cleanEmail);

    const { data: existingUser, error: existingError } = await supabase
      .from("profiles")
      .select("email")
      .eq("email", cleanEmail)
      .maybeSingle();

    console.log("🔥 existingUser result:", existingUser, existingError);

    if (existingError) {
      console.log("❌ Profile lookup error:", existingError);
      setErrorMsg("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    if (existingUser) {
      console.log("❌ Email already exists in profiles");
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

    console.log("🔥 SIGNUP PAYLOAD:", JSON.stringify(payload, null, 2));
    console.log("🔥 Calling supabase.auth.signUp…");

    const { data, error } = await supabase.auth.signUp(payload);

    console.log("🔥 signUp RESPONSE:", { data, error });

    if (error) {
      console.log("❌ Signup error:", error);
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    // 🔥 IMPORTANT: Immediately sign out to avoid authenticated state freezing RLS
    await supabase.auth.signOut();

    console.log("✅ Signup success, navigating to check-email");

    navigate(
      `/${clubSlug}/public/check-email?email=${encodeURIComponent(cleanEmail)}`
    );

    setLoading(false);
  }

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          paddingTop: 0,
          paddingBottom: 0,
        }}
      >
        <div
          className="public-column"
          style={{
            width: "100%",
            maxWidth: "320px",
            marginLeft: "auto",
            marginRight: "auto",
            boxSizing: "border-box",
          }}
        >
          {logoSrc && (
            <img
              src={logoSrc}
              alt={club?.name}
              style={{
                height: 64,
                width: "auto",
                objectFit: "contain",
                marginBottom: 16,
                display: "block",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            />
          )}

          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, textAlign: "center" }}>
            Create Account
          </h1>

          <form onSubmit={handleSignup} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
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
              <p style={{ color: "#dc2626", fontSize: 14, textAlign: "center" }}>
                {errorMsg}
              </p>
            )}

            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Creating account…" : "Sign Up"}
            </Button>
          </form>

          <p style={{ textAlign: "center", marginTop: 24, color: "#6b7280" }}>
            Already have an account?{" "}
            <Link to={`/${clubSlug}/public/login`} style={{ color: "#0A66C2", textDecoration: "underline" }}>
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
