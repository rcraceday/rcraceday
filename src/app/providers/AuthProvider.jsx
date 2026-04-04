// src/app/providers/AuthProvider.jsx
// FINAL VERSION — prevents lock collisions during USER_UPDATED

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [signupEmail, setSignupEmail] = useState("");

  /* ------------------------------------------------------------
     Load profile
     ------------------------------------------------------------ */
  async function loadProfile(userId) {
    if (!userId) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(">>> loadProfile error", error);
      setProfile(null);
      return;
    }

    setProfile(data || null);
  }

  /* ------------------------------------------------------------
     Handle session
     ------------------------------------------------------------ */
  async function handleSession(newSession) {
    setSession(newSession);

    const user = newSession?.user ?? null;

    if (user?.id) {
      await loadProfile(user.id);
    } else {
      setProfile(null);
    }
  }

  /* ------------------------------------------------------------
     Mount: ONE getSession call
     ------------------------------------------------------------ */
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

    /* ------------------------------------------------------------
       Auth state listener — now with USER_UPDATED guard
       ------------------------------------------------------------ */
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        // ⭐ CRITICAL FIX ⭐
        // Prevent MembershipProvider + DriverProvider + NotificationProvider
        // from reloading during password update (USER_UPDATED).
        //
        // This stops the Supabase lock collision and prevents EditProfile
        // from unmounting and wiping out the success message.
        if (event === "USER_UPDATED") {
          return;
        }

        if (event === "SIGNED_OUT") {
          setSession(null);
          setProfile(null);
          setLoadingUser(false);
          return;
        }

        // Supabase already includes the updated user in newSession
        await handleSession(newSession);
        setLoadingUser(false);
      }
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  /* ------------------------------------------------------------
     Merged user
     ------------------------------------------------------------ */
  const mergedUser =
    session?.user && profile
      ? { ...session.user, ...profile }
      : session?.user ?? null;

  return (
    <AuthContext.Provider
      value={{
        session,
        user: mergedUser,
        profile,
        loadingUser,
        signupEmail,
        setSignupEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
