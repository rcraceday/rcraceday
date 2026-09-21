// src/app/pages/public/Login.jsx
import { useState, useEffect } from "react";
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
  const [checkingExistingSession, setCheckingExistingSession] = useState(true);

  // ⭐ ALL HOOKS MUST RUN BEFORE ANY RETURN
  useEffect(() => {
    if (!club) return; // club not ready yet

    async function checkSession() {
      const { data } = await supabase.auth.getUser();
      const existingUser = data?.user;

      if (!existingUser) {
        setCheckingExistingSession(false);
        return;
      }

      await supabase.auth.signOut();

      setCheckingExistingSession(false);
    }

    checkSession();
  }, [club, clubSlug, navigate]);

  // ⭐ SAFE CONDITIONAL RETURNS (AFTER HOOKS)
  if (!club) {
    return <div style={{ padding: "24px", textAlign: "center" }}>Loading…</div>;
  }

  if (checkingExistingSession) {
    return <div style={{ padding: "24px", textAlign: "center" }}>Checking session…</div>;
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
      if (error.message.toLowerCase().includes("email not confirmed")) {
        navigate(
          `/${clubSlug}/public/check-email?email=${encodeURIComponent(email.trim().toLowerCase())}`
        );
      } else if (error.message.includes("Invalid login credentials")) {
        navigate(`/${clubSlug}/public/signup`, {
          state: {
            message: "This user or email was not found in the system. Please sign up.",
          },
        });
      } else {
        setErrorMsg(error.message);
      }
      setLoading(false);
      return;
    }

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

    let { data: membership, error: membershipLookupError } = await supabase
      .from("household_memberships")
      .select("*")
      .eq("club_id", club.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipLookupError) {
      setErrorMsg(membershipLookupError.message);
      setLoading(false);
      return;
    }

    if (!membership) {
      const emailLookup = await supabase
        .from("household_memberships")
        .select("*")
        .eq("club_id", club.id)
        .ilike("email", userEmail)
        .maybeSingle();

      membership = emailLookup.data;
      membershipLookupError = emailLookup.error;

      if (membershipLookupError) {
        setErrorMsg(membershipLookupError.message);
        setLoading(false);
        return;
      }
    }

    let firstLogin = false;
    let membershipUpdates = {};

    if (!membership) {
      if (
        user.user_metadata?.club_id !== club.id ||
        user.user_metadata?.signup_type !== "non_member_signup"
      ) {
        await supabase.auth.signOut();
        navigate(`/${clubSlug}/public/signup`, {
          state: {
            message: "This user or email was not found in the system. Please sign up.",
          },
        });
        setLoading(false);
        return;
      }

      const metadata = user.user_metadata || {};
      const { data: createdMembership, error: membershipError } = await supabase
        .from("household_memberships")
        .insert({
          user_id: userId,
          email: userEmail,
          primary_first_name: metadata.first_name || "",
          primary_last_name: metadata.last_name || "",
          membership_type: "non_member",
          status: "active",
          club_id: club.id,
        })
        .select("*")
        .single();

      if (membershipError) {
        setErrorMsg("Unable to create your club access. Please try again.");
        setLoading(false);
        return;
      }

      firstLogin = true;
      membership = createdMembership;
    }

    if (membership.user_id && membership.user_id !== userId) {
      await supabase.auth.signOut();
      setErrorMsg("This membership is already linked to another account.");
      setLoading(false);
      return;
    }

    if (!membership.user_id) {
      membershipUpdates.user_id = userId;
      firstLogin = true;
    }

    if (
      membership.membership_type === "non_member" &&
      membership.status !== "active"
    ) {
      membershipUpdates.status = "active";
    }

    if (Object.keys(membershipUpdates).length > 0) {
      await supabase
        .from("household_memberships")
        .update(membershipUpdates)
        .eq("id", membership.id);
    }

    navigate(`/${clubSlug}/app/${firstLogin ? "profile/drivers/welcome" : ""}`);
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
