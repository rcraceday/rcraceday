// src/app/pages/public/Login.jsx
import { useState } from "react";
import { useNavigate, useParams, useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function Login() {
  const { club } = useOutletContext();
  const { clubSlug } = useParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  if (!club) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        Loading…
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
      setErrorMsg(
        error.message.includes("Invalid login credentials")
          ? "Incorrect email or password."
          : error.message
      );
      setLoading(false);
      return;
    }

    navigate(`/${clubSlug}/app`);
  }

  return (
    <div style={{ padding: "24px" }}>
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          paddingTop: "0px",
          paddingBottom: "0px",
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
              alt={club.name}
              style={{
                height: "88px",
                width: "auto",
                objectFit: "contain",
                marginBottom: "16px",
                display: "block",
                marginLeft: "auto",
                marginRight: "auto",
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

            {errorMsg && (
              <p style={{ color: "red", fontSize: "14px", textAlign: "center" }}>
                {errorMsg}
              </p>
            )}

            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Logging in…" : "Log In"}
            </Button>
          </form>

          <p style={{ marginTop: "24px", color: "#555", textAlign: "center" }}>
            Don’t have an account?{" "}
            <Link to={`/${clubSlug}/public/signup`} style={{ color: "#0A66C2" }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
