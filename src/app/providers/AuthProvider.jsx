// src/app/providers/AuthProvider.jsx
// AuthProvider: restores session, loads profile, and exposes auth state via context.

console.log(">>> AUTH PROVIDER MODULE LOADED", import.meta.url);

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";

console.log(">>> SUPABASE CLIENT (module) READY", {
  supabaseUrlPresent: !!import.meta.env.VITE_SUPABASE_URL,
  anonKeyPresent: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
});

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [hydrated, setHydrated] = useState(false);   // ⭐ NEW: hydration guard
  const [signupEmail, setSignupEmail] = useState("");

  async function loadProfile(userId) {
    console.log(">>> loadProfile", { userId });
    if (!userId) {
      setProfile(null);
      return;
    }

    try {
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

      console.log(">>> loadProfile result", { data });
      setProfile(data || null);
    } catch (err) {
      console.error(">>> loadProfile exception", err);
      setProfile(null);
    }
  }

  async function refreshUser() {
    console.log(">>> refreshUser: calling supabase.auth.getUser()");
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error(">>> refreshUser error", error);
        return null;
      }
      console.log(">>> refreshUser result", { user: data?.user ?? null });
      return data?.user ?? null;
    } catch (err) {
      console.error(">>> refreshUser exception", err);
      return null;
    }
  }

  async function handleSession(newSession) {
    console.log(">>> handleSession", { newSession });
    setSession(newSession ?? null);

    const user = newSession?.user ?? (await refreshUser());
    console.log(">>> handleSession resolved user", { user });

    if (user?.id) {
      await loadProfile(user.id);
    } else {
      setProfile(null);
    }
  }

  useEffect(() => {
    let mounted = true;
    console.log(">>> AuthProvider useEffect mount (browser?)", {
      isBrowser: typeof window !== "undefined",
    });

    async function loadInitial() {
      console.log(">>> loadInitial: calling supabase.auth.getSession()");
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error(">>> getSession error", error);
        }
        console.log(">>> getSession result", { session: data?.session ?? null });
        if (!mounted) return;

        await handleSession(data?.session ?? null);

        if (mounted) setLoadingUser(false);
      } catch (err) {
        console.error(">>> loadInitial exception", err);
        if (mounted) setLoadingUser(false);
      }
    }

    loadInitial();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(">>> onAuthStateChange", { event, newSession });
        if (!mounted) return;

        if (event === "INITIAL_SESSION") {
          console.log(">>> INITIAL_SESSION hydration complete");
          setHydrated(true);   // ⭐ hydration finished
        }

        if (event === "SIGNED_OUT") {
          setSession(null);
          setProfile(null);
          setLoadingUser(false);
          return;
        }

        await handleSession(newSession);
        setLoadingUser(false);
      }
    );

    // ⭐ If Supabase already has a session, hydrate immediately
    supabase.auth.getSession().then(() => {
      console.log(">>> manual hydration complete");
      setHydrated(true);
    });

    return () => {
      mounted = false;
      console.log(">>> AuthProvider unmounting, unsubscribing listener");
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  // ⭐ BLOCK THE APP until hydration is complete
  if (!hydrated) {
    console.log(">>> AuthProvider waiting for hydration…");
    return <div style={{ padding: 24, textAlign: "center" }}>Loading…</div>;
  }

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
