// src/app/pages/public/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams, useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import TextInput from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { userBelongsToClub } from "@/app/providers/ClubProvider";

export default function Login() {
  const { club } = useOutletContext();
  const { clubSlug } = useParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [checkingExistingSession, setCheckingExistingSession] = useState(true);

  if (!club) {
    return <div style={{ padding: "24px", textAlign: "center" }}>Loading…</div>;
  }

  const logoSrc =
    club?.logoUrl ||
    club?.logo ||
    club?.logo_url ||
    club?.theme?.hero?.logo ||
    club?.branding?.logo ||
    club?.assets?.logo ||
    null;

  /* ------------------------------------------------------------
     1️⃣ If user is already logged in, check if they belong to this club
     ------------------------------------------------------------ */
  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getUser();
      const existingUser = data?.user;

      if (!existingUser) {
        setCheckingExistingSession(false);
        return;
      }

      const belongs = await userBelongsToClub(existingUser.id, club.id);

      if (belongs) {
        navigate(`/${clubSlug}/app/`);
      } else {
        // User logged in but NOT a member of this club
        setErrorMsg(
          "You are logged in with an account that does not belong to this club. Please log in with a different account."
        );
      }

      setCheckingExistingSession(false);
    }

    checkSession();
  }, [club, clubSlug, navigate]);

  if (checkingExistingSession) {
    return <div style={{ padding: "24px", textAlign: "center" }}>Checking session…</div>;
  }

  /* ------------------------------------------------------------
     2️⃣ Handle login
     ------------------------------------------------------------ */
  async function handleLogin(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim() || !password) {
      setErrorMsg("Please enter your email and password.");
      return;
    }

    setLoading(true);

    // LOGIN
    const { data: loginData, error } = await supabase.auth.signInWithPassword({
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

    // GET USER
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMsg("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    const userId = user.id;
    const userEmail = user.email?.toLowerCase();

    // CHECK MEMBERSHIP FOR THIS CLUB
    const { data: membership } = await supabase
      .from("household_memberships")
      .select("*")
      .eq("club_id", club.id)
      .ilike("email", userEmail)
      .maybeSingle();

    if (!membership) {
      // ❌ DO NOT auto-create membership
      setErrorMsg(
        "This email is not registered with this club. Please contact the club or use a different account."
      );
      setLoading(false);
      return;
    }

    // LINK MEMBERSHIP TO USER IF NEEDED
    if (!membership.user_id) {
      await supabase
        .from("household_memberships")
        .update({
          user_id: userId,
          status: "active",
        })
        .eq("id", membership.id);
    }

    // UPDATE PROFILE WITH MEMBERSHIP ID
    await supabase
      .from("profiles")
      .update({
        membership_id: membership.id,
        club_id: club.id,
      })
      .eq("id", userId);

    // SUCCESS → ENTER APP
    navigate(`/${clubSlug}/app/`);
  }

  /* ------------------------------------------------------------
     3️⃣ UI
     ------------------------------------------------------------ */
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
        Log In
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

      <div
        style={{
          marginTop: "16px",
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Button onClick={() => navigate("/")}>← Back to Clubs</Button>
      </div>
    </div>
  );
}
