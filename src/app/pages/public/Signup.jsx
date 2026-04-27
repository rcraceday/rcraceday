// src/app/pages/public/Signup.jsx
import { useOutletContext, Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/supabaseClient";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/app/providers/AuthProvider";

export default function Signup() {
  const { club } = useOutletContext();
  const { clubSlug } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const clubId = club?.id;

  const [step, setStep] = useState("memberQuestion");

  const [membershipEmail, setMembershipEmail] = useState("");
  const [membership, setMembership] = useState(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  if (!club || !clubId) {
    return <div style={{ padding: 24, textAlign: "center" }}>Loading…</div>;
  }

  const logoSrc =
    club?.logo_url ||
    club?.logo ||
    club?.theme?.hero?.logo ||
    club?.branding?.logo ||
    club?.assets?.logo ||
    null;

  const isValidEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  // ------------------------------------------------------------
  // STEP 1 — Member Question
  // ------------------------------------------------------------
  function renderMemberQuestion() {
    return (
      <div
        style={{
          padding: "32px 24px 0 24px",
          width: "100%",
          maxWidth: "360px",
          margin: "0 auto",
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        {logoSrc && (
          <img
            src={logoSrc}
            alt={club?.name}
            style={{
              maxWidth: "160px",
              width: "100%",
              height: "auto",
              marginBottom: "20px",
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
          Create Account
        </h1>

        <p style={{ textAlign: "center", marginBottom: "24px" }}>
          Are you currently a financial member of {club?.name}?
        </p>

        <Button
          variant="primary"
          size="lg"
          onClick={() => setStep("memberLookup")}
          style={{ width: "100%", marginBottom: "12px" }}
        >
          Yes, I am a current member
        </Button>

        <Button
          variant="secondary"
          size="lg"
          onClick={() => setStep("nonMemberSignup")}
          style={{ width: "100%" }}
        >
          No, I am not a member
        </Button>

        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <Button size="lg" onClick={() => navigate("/")}>← Back to Clubs</Button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // STEP 2 — Member Lookup
  // ------------------------------------------------------------
  async function handleLookupMembership(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!isValidEmail(membershipEmail.trim())) {
      return setErrorMsg("Please enter a valid email address.");
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("household_memberships")
      .select("*")
      .ilike("email", membershipEmail.trim())
      .eq("club_id", clubId)
      .maybeSingle();

    setLoading(false);

    if (error) {
      return setErrorMsg("Something went wrong. Please try again.");
    }

    if (!data) {
      return setErrorMsg(
        "We could not find a membership with that email for this club."
      );
    }

    setMembership(data);
    setName(
      `${data.primary_first_name || ""} ${data.primary_last_name || ""}`.trim()
    );
    setEmail(membershipEmail.trim().toLowerCase());
    setStep("memberCreatePassword");
  }

  function renderMemberLookup() {
    return (
      <div
        style={{
          padding: "32px 24px 0 24px",
          width: "100%",
          maxWidth: "360px",
          margin: "0 auto",
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        {logoSrc && (
          <img
            src={logoSrc}
            alt={club?.name}
            style={{
              maxWidth: "160px",
              width: "100%",
              height: "auto",
              marginBottom: "20px",
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
          Find Your Membership
        </h1>

        <form
          onSubmit={handleLookupMembership}
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <Input
            label="Membership Email"
            type="email"
            value={membershipEmail}
            onChange={(e) => setMembershipEmail(e.target.value)}
          />

          {errorMsg && (
            <p style={{ color: "#dc2626", fontSize: "14px", textAlign: "center" }}>
              {errorMsg}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" disabled={loading}>
            {loading ? "Searching…" : "Find Membership"}
          </Button>

          <Button variant="secondary" size="lg" onClick={() => setStep("memberQuestion")}>
            Back
          </Button>
        </form>
      </div>
    );
  }

  // ------------------------------------------------------------
  // STEP 3 — Member Create Password (NO CONFIRMATION)
  // ------------------------------------------------------------
  async function handleMemberCreatePassword(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) return setErrorMsg("Please enter your full name.");
    if (password.length < 6) return setErrorMsg("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setErrorMsg("Passwords do not match.");

    setLoading(true);

    const parts = name.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : firstName;

    // ⭐ EXISTING MEMBER — create user via Edge Function (no email confirmation)
    const response = await fetch(
      "https://mvcttnmclrvaatdgzhpb.supabase.co/functions/v1/create-user",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email,
          password,
          metadata: {
            full_name: name.trim(),
            first_name: firstName,
            last_name: lastName,
            club_id: clubId,
            club_name: club?.name,
            club_logo_url: club?.logo_url,
            ...(membership?.id ? { membership_id: membership.id } : {}),
          },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      setLoading(false);
      return setErrorMsg(result.error || "Signup failed");
    }

    const user = result.user;

    if (user) {
      await supabase
        .from("household_memberships")
        .update({
          user_id: user.id,
          primary_first_name: firstName,
          primary_last_name: lastName,
          status: "active",
        })
        .eq("id", membership.id);
    }

    // ⭐ ALWAYS SIGN OUT
    await supabase.auth.signOut();

    // ⭐ 500ms delay before showing success screen
    setTimeout(() => {
      setStep("signupSuccess");
    }, 500);

    setLoading(false);
  }

  function renderMemberCreatePassword() {
    return (
      <div
        style={{
          padding: "32px 24px 0 24px",
          width: "100%",
          maxWidth: "360px",
          margin: "0 auto",
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        {logoSrc && (
          <img
            src={logoSrc}
            alt={club?.name}
            style={{
              maxWidth: "160px",
              width: "100%",
              height: "auto",
              marginBottom: "20px",
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
          Confirm Your Details
        </h1>

        <form
          onSubmit={handleMemberCreatePassword}
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />

          <Input label="Email" value={email} disabled />

          <Input
            label="Create Password"
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
            <p style={{ color: "#dc2626", fontSize: "14px", textAlign: "center" }}>
              {errorMsg}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" disabled={loading}>
            {loading ? "Creating account…" : "Create Account"}
          </Button>

          <Button variant="secondary" size="lg" onClick={() => setStep("memberLookup")}>
            Back
          </Button>
        </form>
      </div>
    );
  }

  // ------------------------------------------------------------
  // STEP 4 — Non-member Signup (AUTH-AWARE)
  // ------------------------------------------------------------
async function handleNonMemberSignup(e) {
  e.preventDefault();
  setErrorMsg("");

  if (!name.trim()) return setErrorMsg("Please enter your full name.");
  if (!isValidEmail(email.trim())) return setErrorMsg("Please enter a valid email address.");
  if (password.length < 6) return setErrorMsg("Password must be at least 6 characters.");
  if (password !== confirmPassword) return setErrorMsg("Passwords do not match.");

  setLoading(true);

  const cleanEmail = email.trim().toLowerCase();

  const parts = name.trim().split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : firstName;

  // ⭐ Non-member → use normal signUp so Supabase sends confirmation email
  const { data: signUpData, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/${clubSlug}/public/login`,
      data: {
        full_name: name.trim(),
        first_name: firstName,
        last_name: lastName,
        club_id: clubId,
        club_name: club.name,
        club_logo_url: club.logo_url,
      },
    },
  });

  if (error) {
    setLoading(false);
    return setErrorMsg(error.message);
  }

  // ⭐ Insert membership row (user is not logged in yet)
  if (signUpData?.user) {
    await supabase.from("household_memberships").insert({
      user_id: signUpData.user.id,
      email: cleanEmail,
      primary_first_name: firstName,
      primary_last_name: lastName,
      status: "pending", // ⭐ stays pending until email confirmed
      membership_type: "non_member",
      club_id: clubId,
    });
  }

  // ⭐ Redirect to check-email page (confirmation email WAS sent)
  navigate(`/${clubSlug}/public/check-email?email=${encodeURIComponent(cleanEmail)}`);

  setLoading(false);
}
  function renderNonMemberSignup() {
    return (
      <div
        style={{
          padding: "32px 24px 0 24px",
          width: "100%",
          maxWidth: "360px",
          margin: "0 auto",
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        {logoSrc && (
          <img
            src={logoSrc}
            alt={club?.name}
            style={{
              maxWidth: "160px",
              width: "100%",
              height: "auto",
              marginBottom: "20px",
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
          Create Account
        </h1>

        <form
          onSubmit={handleNonMemberSignup}
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />

          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

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
            <p style={{ color: "#dc2626", fontSize: "14px", textAlign: "center" }}>
              {errorMsg}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" disabled={loading}>
            {loading ? "Creating account…" : "Sign Up"}
          </Button>

          <p style={{ textAlign: "center", marginTop: "24px", color: "#666" }}>
            Already have an account?{" "}
            <Link
              to={`/${clubSlug}/public/login`}
              style={{ color: "#2563eb", textDecoration: "underline" }}
            >
              Log in
            </Link>
          </p>

          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <Button size="lg" onClick={() => navigate("/")}>← Back to Clubs</Button>
          </div>
        </form>
      </div>
    );
  }

  // ------------------------------------------------------------
  // STEP 5 — Signup Success Screen
  // ------------------------------------------------------------
  function renderSignupSuccess() {
    return (
      <div
        style={{
          padding: "32px 24px 0 24px",
          width: "100%",
          maxWidth: "360px",
          margin: "0 auto",
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        {logoSrc && (
          <img
            src={logoSrc}
            alt={club?.name}
            style={{
              maxWidth: "160px",
              width: "100%",
              height: "auto",
              marginBottom: "20px",
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
            marginBottom: "16px",
            textAlign: "center",
          }}
        >
          Account Created
        </h1>

        <p style={{ textAlign: "center", marginBottom: "24px", color: "#444" }}>
          Your account has been created successfully.  
          Please log in to continue.
        </p>

        <Button
          variant="primary"
          size="lg"
          style={{ width: "100%" }}
          onClick={() =>
            navigate(`/${clubSlug}/public/login`, { replace: true })
          }
        >
          Proceed to Login
        </Button>
      </div>
    );
  }

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------
  if (step === "memberQuestion") return renderMemberQuestion();
  if (step === "memberLookup") return renderMemberLookup();
  if (step === "memberCreatePassword") return renderMemberCreatePassword();
  if (step === "nonMemberSignup") return renderNonMemberSignup();
  if (step === "signupSuccess") return renderSignupSuccess();

  return null;
}
