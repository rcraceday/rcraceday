// src/app/pages/public/Signup.jsx
import { useOutletContext, Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/supabaseClient";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function Signup() {
  const { club } = useOutletContext();
  const { clubSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const clubId = club?.id;
  const createUserUrl =
    "https://mvcttnmclrvaatdgzhpb.supabase.co/functions/v1/create-user";

  const [step, setStep] = useState("memberQuestion");

  const [membershipEmail, setMembershipEmail] = useState("");
  const [membership, setMembership] = useState(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState(location.state?.message || "");
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

        {errorMsg && (
          <p style={{ color: "#dc2626", fontSize: "14px", textAlign: "center", marginBottom: "16px" }}>
            {errorMsg}
          </p>
        )}

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
  // STEP 2 — Member Lookup (EMAIL ONLY — correct schema)
  // ------------------------------------------------------------
  async function handleLookupMembership(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!isValidEmail(membershipEmail.trim())) {
      return setErrorMsg("Please enter the email you gave the club.");
    }

    setLoading(true);

    const cleanEmail = membershipEmail.trim().toLowerCase();

    const { data, error } = await supabase
      .from("household_memberships")
      .select("*")
      .eq("club_id", clubId)
      .ilike("email", cleanEmail)
      .maybeSingle();

    setLoading(false);

    if (error) {
      console.error("Lookup error:", error);
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
    setEmail(cleanEmail);
    setStep("memberCreatePassword");
  }

  // ------------------------------------------------------------
  // RENDER STEP 2 — Member Lookup
  // ------------------------------------------------------------
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

          <Button
            variant="secondary"
            size="lg"
            onClick={() => setStep("memberQuestion")}
          >
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

    // Create the Auth user only. Membership/profile provisioning happens after confirmation on first login.
    const response = await fetch(
      createUserUrl,
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
            email_redirect_to: `${window.location.origin}/${clubSlug}/public/login`,
            signup_type: membership?.id
              ? "member_signup"
              : "non_member_signup",
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

    navigate(
      `/${clubSlug}/public/check-email?email=${encodeURIComponent(email.trim().toLowerCase())}`
    );
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
  // STEP 4 — Non-member Signup (Edge Function)
  // ------------------------------------------------------------
async function handleNonMemberSignup(e) {
  e.preventDefault();
  setErrorMsg("");

  if (!name.trim()) {
    return setErrorMsg("Please enter your full name.");
  }
  if (!isValidEmail(email.trim())) {
    return setErrorMsg("Please enter a valid email address.");
  }
  if (!password || password.length < 6) {
    return setErrorMsg("Password must be at least 6 characters.");
  }
  if (password !== confirmPassword) {
    return setErrorMsg("Passwords do not match.");
  }
  if (!clubId) {
    return setErrorMsg("Club not loaded. Please refresh and try again.");
  }

  setLoading(true);

  const cleanEmail = email.trim().toLowerCase();
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : firstName;

  // Block: this email already belongs to a membership at this club
  const { data: existingMembership } = await supabase
    .from("household_memberships")
    .select("id, status")
    .eq("club_id", clubId)
    .ilike("email", cleanEmail)
    .maybeSingle();

  if (existingMembership) {
    setLoading(false);
    return setErrorMsg(
      "This email is already associated with a membership at this club. Please use the 'I am a member' option and the email you gave the club."
    );
  }

  try {
    const response = await fetch(
      createUserUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          metadata: {
            full_name: name.trim(),
            first_name: firstName,
            last_name: lastName,
            club_id: clubId,
            club_name: club?.name,
            club_logo_url: club?.logo_url,
            email_redirect_to: `${window.location.origin}/${clubSlug}/public/login`,
            signup_type: "non_member_signup",
          },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Signup failed");
    }

    navigate(
      `/${clubSlug}/public/check-email?email=${encodeURIComponent(cleanEmail)}`
    );
  } catch (err) {
    console.error("Non-member signup error", err);
    setErrorMsg(err.message || "Failed to create account.");
  } finally {
    setLoading(false);
  }
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
