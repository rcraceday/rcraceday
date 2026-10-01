// src/app/pages/public/Signup.jsx
import { useOutletContext, Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function Signup() {
  const { club } = useOutletContext();
  const { clubSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const clubId = club?.id;
  const createUserUrl =
    "https://mvcttnmclrvaatdgzhpb.supabase.co/functions/v1/create-user";
  const lookupMembershipUrl =
    "https://mvcttnmclrvaatdgzhpb.supabase.co/functions/v1/lookup-membership";
  const { t } = useTranslation();

  async function lookupMembership(cleanEmail) {
    const response = await fetch(lookupMembershipUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email: cleanEmail, club_id: clubId }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || t("signup.lookupFailed"));
    }

    return result.membership;
  }

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
    return <div style={{ padding: 24, textAlign: "center" }}>{t("loading.loading")}</div>;
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
          {t("auth.createAccount")}
        </h1>

        <p style={{ textAlign: "center", marginBottom: "24px" }}>
          {t("signup.memberQuestion", { clubName: club?.name })}
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
          {t("signup.yesMember")}
        </Button>

        <Button
          variant="secondary"
          size="lg"
          onClick={() => setStep("nonMemberSignup")}
          style={{ width: "100%" }}
        >
          {t("signup.noMember")}
        </Button>

        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <Button size="lg" onClick={() => navigate("/")}>{t("auth.backToClubs")}</Button>
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
      return setErrorMsg(t("signup.enterClubEmail"));
    }

    setLoading(true);

    const cleanEmail = membershipEmail.trim().toLowerCase();

    let data;
    try {
      data = await lookupMembership(cleanEmail);
    } catch (err) {
      console.error("Lookup error:", err);
      setLoading(false);
      return setErrorMsg(t("errors.generic"));
    }

    setLoading(false);

    if (!data) {
      return setErrorMsg(t("signup.notFoundForClub"));
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
          {t("signup.findMembershipTitle")}
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
            label={t("signup.membershipEmail")}
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
            {loading ? t("signup.searching") : t("signup.findMembership")}
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={() => setStep("memberQuestion")}
          >
            {t("signup.back")}
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

    if (!name.trim()) return setErrorMsg(t("signup.nameRequired"));
    if (password.length < 6) return setErrorMsg(t("signup.passwordMinLength"));
    if (password !== confirmPassword) return setErrorMsg(t("signup.passwordsMismatch"));

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
      return setErrorMsg(result.error || t("signup.signupFailed"));
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
          {t("signup.confirmDetailsTitle")}
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
          <Input label={t("signup.fullName")} value={name} onChange={(e) => setName(e.target.value)} />

          <Input label={t("auth.email")} value={email} disabled />

          <Input
            label={t("signup.createPassword")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Input
            label={t("signup.confirmPasswordLabel")}
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
            {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
          </Button>

          <Button variant="secondary" size="lg" onClick={() => setStep("memberLookup")}>
            {t("signup.back")}
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
    return setErrorMsg(t("signup.nameRequired"));
  }
  if (!isValidEmail(email.trim())) {
    return setErrorMsg(t("signup.validEmailRequired"));
  }
  if (!password || password.length < 6) {
    return setErrorMsg(t("signup.passwordMinLength"));
  }
  if (password !== confirmPassword) {
    return setErrorMsg(t("signup.passwordsMismatch"));
  }
  if (!clubId) {
    return setErrorMsg(t("signup.clubNotLoaded"));
  }

  setLoading(true);

  const cleanEmail = email.trim().toLowerCase();
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : firstName;

  // Block: this email already belongs to a membership at this club
  let existingMembership;
  try {
    existingMembership = await lookupMembership(cleanEmail);
  } catch (err) {
    console.error("Lookup error:", err);
    setLoading(false);
    return setErrorMsg(t("errors.generic"));
  }

  if (existingMembership) {
    setLoading(false);
    return setErrorMsg(t("signup.emailHasMembership"));
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
      throw new Error(result.error || t("signup.signupFailed"));
    }

    navigate(
      `/${clubSlug}/public/check-email?email=${encodeURIComponent(cleanEmail)}`
    );
  } catch (err) {
    console.error("Non-member signup error", err);
    setErrorMsg(err.message || t("signup.failedCreateAccount"));
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
          {t("auth.createAccount")}
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
          <Input label={t("signup.fullName")} value={name} onChange={(e) => setName(e.target.value)} />

          <Input label={t("auth.email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

          <Input
            label={t("signup.password")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Input
            label={t("signup.confirmPasswordLabel")}
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
            {loading ? t("auth.creatingAccount") : t("auth.signUp")}
          </Button>

          <p style={{ textAlign: "center", marginTop: "24px", color: "#666" }}>
            {t("auth.alreadyHaveAccount")}{" "}
            <Link
              to={`/${clubSlug}/public/login`}
              style={{ color: "#2563eb", textDecoration: "underline" }}
            >
              {t("auth.logIn")}
            </Link>
          </p>

          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <Button size="lg" onClick={() => navigate("/")}>{t("auth.backToClubs")}</Button>
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
          {t("signup.accountCreatedTitle")}
        </h1>

        <p style={{ textAlign: "center", marginBottom: "24px", color: "#444" }}>
          {t("signup.accountCreatedBody")}
        </p>

        <Button
          variant="primary"
          size="lg"
          style={{ width: "100%" }}
          onClick={() =>
            navigate(`/${clubSlug}/public/login`, { replace: true })
          }
        >
          {t("signup.proceedToLogin")}
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
