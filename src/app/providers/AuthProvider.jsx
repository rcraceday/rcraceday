// src/app/providers/AuthProvider.jsx
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/supabaseClient";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// ------------------------------------------------------------
// Helper: wait for membership to appear AND become active
// ------------------------------------------------------------
async function waitForMembership(userId, clubId) {
  const maxAttempts = 6;
  const delay = 250;

  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await supabase
      .from("household_memberships")
      .select("*")
      .eq("user_id", userId)
      .eq("club_id", clubId)
      .maybeSingle();

    if (data && data.status === "active") return data;

    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return null;
}

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [membership, setMembership] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [signupEmail, setSignupEmail] = useState("");

  // ⭐ Tracks whether hydration is running (prevents logout overwrite)
  const hydratingRef = useRef(false);

  // ------------------------------------------------------------
  // Hydrate profile + membership
  // ------------------------------------------------------------
  async function hydrateUser(newSession) {
    if (!newSession?.user) {
      setProfile(null);
      setMembership(null);
      return;
    }

    hydratingRef.current = true;

    const userId = newSession.user.id;

    // Load profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!hydratingRef.current) return;
    setProfile(profileData || null);

    const clubId = profileData?.club_id;

    // Load membership (first attempt)
    let { data: membershipData } = await supabase
      .from("household_memberships")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!hydratingRef.current) return;

    // ------------------------------------------------------------
    // ⭐ POST-CONFIRMATION MEMBERSHIP INSERT
    // If user confirmed email and logs in for the first time,
    // membership row does NOT exist yet → create it now.
    // ------------------------------------------------------------
    if (!membershipData && clubId) {
      const { data: inserted, error: insertError } = await supabase
        .from("household_memberships")
        .insert({
          user_id: userId,
          email: newSession.user.email,
          primary_first_name: profileData?.first_name,
          primary_last_name: profileData?.last_name,
          status: "pending", // becomes active later
          membership_type: "non_member",
          club_id: clubId,
        })
        .select()
        .maybeSingle();

      if (!insertError) {
        membershipData = inserted;
      }
    }

    if (!hydratingRef.current) return;

    // ------------------------------------------------------------
    // ⭐ Wait for membership to become active (new users)
    // ------------------------------------------------------------
    if (!membershipData || membershipData.status !== "active") {
      membershipData = await waitForMembership(userId, clubId);
    }

    if (!hydratingRef.current) return;
    setMembership(membershipData || null);

    hydratingRef.current = false;
  }

  // ------------------------------------------------------------
  // Handle session changes
  // ------------------------------------------------------------
  async function handleSession(newSession) {
    setSession(newSession);
    await hydrateUser(newSession);
  }

  // ------------------------------------------------------------
  // Mount: ONE getSession call + listener
  // ------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const initialSession = sessionData?.session ?? null;

        if (!mounted) return;

        await handleSession(initialSession);
      } catch (err) {
        console.error(">>> AuthProvider init error", err);
      } finally {
        if (mounted) setLoadingUser(false);
      }
    }

    init();

    // ------------------------------------------------------------
    // Auth state listener
    // ------------------------------------------------------------
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        if (event === "PASSWORD_RECOVERY") return;

        if (event === "SIGNED_OUT") {
          // ⭐ STOP hydration immediately
          hydratingRef.current = false;

          setSession(null);
          setProfile(null);
          setMembership(null);
          setLoadingUser(false);
          return;
        }

        await handleSession(newSession);
        setLoadingUser(false);
      }
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        membership,
        loadingUser,
        signupEmail,
        setSignupEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
