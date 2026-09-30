// src/app/pages/public/Login.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams, useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import TextInput from "@/components/ui/Input";
import Button from "@/components/ui/Button";

function hasAuthCallbackInUrl() {
  const { hash, search } = window.location;
  return (
    hash.includes("access_token") ||
    hash.includes("type=signup") ||
    search.includes("code=") ||
    search.includes("token_hash=")
  );
}

function clearAuthCallbackFromUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  if (url.searchParams.has("code")) url.searchParams.delete("code");
  if (url.searchParams.has("token_hash")) url.searchParams.delete("token_hash");
  const search = url.searchParams.toString();
  window.history.replaceState(
    {},
    document.title,
    `${url.pathname}${search ? `?${search}` : ""}`
  );
}

async function resolveFreshUser() {
  const { data: refreshData, error: refreshError } =
    await supabase.auth.refreshSession();
  if (refreshError) {
    console.warn("Login refreshSession:", refreshError.message);
  }
  const sessionUser = refreshData?.session?.user;
  if (sessionUser) return sessionUser;

  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

async function reconcileClubAccess({ user, club, clubSlug, navigate, onError }) {
  if (!user?.email_confirmed_at) {
    navigate(
      `/${clubSlug}/public/check-email?email=${encodeURIComponent(user?.email || "")}`
    );
    return false;
  }

  const userId = user.id;
  const userEmail = user.email?.toLowerCase();
  const metadata = user.user_metadata || {};

  let { data: membership, error: membershipLookupError } = await supabase
    .from("household_memberships")
    .select("*")
    .eq("club_id", club.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipLookupError) {
    onError?.(membershipLookupError.message);
    return false;
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
      onError?.(membershipLookupError.message);
      return false;
    }
  }

  if (!membership && metadata.membership_id) {
    const idLookup = await supabase
      .from("household_memberships")
      .select("*")
      .eq("club_id", club.id)
      .eq("id", metadata.membership_id)
      .maybeSingle();

    membership = idLookup.data;
    if (idLookup.error) {
      onError?.(idLookup.error.message);
      return false;
    }
  }

  let firstLogin = false;
  let membershipUpdates = {};

  if (!membership) {
    const signupType = metadata.signup_type;
    const isNonMemberSignup =
      String(metadata.club_id) === String(club.id) &&
      signupType === "non_member_signup";

    if (!isNonMemberSignup) {
      await supabase.auth.signOut();
      navigate(`/${clubSlug}/public/signup`, {
        state: {
          message:
            "This user or email was not found in the system. Please sign up.",
        },
      });
      return false;
    }

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
      onError?.("Unable to create your club access. Please try again.");
      return false;
    }

    firstLogin = true;
    membership = createdMembership;
  }

  if (membership.user_id && membership.user_id !== userId) {
    await supabase.auth.signOut();
    onError?.("This membership is already linked to another account.");
    return false;
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
    const { error: updateError } = await supabase
      .from("household_memberships")
      .update(membershipUpdates)
      .eq("id", membership.id);

    if (updateError) {
      onError?.("Unable to link your membership. Please try again.");
      return false;
    }
  }

  navigate(`/${clubSlug}/app/${firstLogin ? "profile/drivers/welcome" : ""}`);
  return true;
}

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
    if (!club) return;

    let cancelled = false;
    let authListener = null;

    async function completeEmailConfirmationLogin(user) {
      clearAuthCallbackFromUrl();
      const freshUser = (await resolveFreshUser()) || user;
      await reconcileClubAccess({
        user: freshUser,
        club,
        clubSlug,
        navigate,
        onError: (message) => {
          if (!cancelled) setErrorMsg(message);
        },
      });
      if (!cancelled) setCheckingExistingSession(false);
    }

    async function checkSession() {
      const authCallback = hasAuthCallbackInUrl();

      if (authCallback) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (session?.user?.email_confirmed_at) {
          await completeEmailConfirmationLogin(session.user);
          return;
        }

        const { data: listener } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (cancelled) return;
            if (
              event !== "SIGNED_IN" &&
              event !== "INITIAL_SESSION" &&
              event !== "TOKEN_REFRESHED"
            ) {
              return;
            }
            const confirmedUser = newSession?.user;
            if (!confirmedUser?.email_confirmed_at) return;

            listener.subscription.unsubscribe();
            await completeEmailConfirmationLogin(confirmedUser);
          }
        );
        authListener = listener;

        window.setTimeout(() => {
          if (!cancelled) setCheckingExistingSession(false);
        }, 10000);
        return;
      }

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

    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe();
    };
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

    const user = await resolveFreshUser();

    if (!user) {
      setErrorMsg("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    await reconcileClubAccess({
      user,
      club,
      clubSlug,
      navigate,
      onError: (message) => setErrorMsg(message),
    });
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
