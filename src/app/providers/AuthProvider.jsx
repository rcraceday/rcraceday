// src/app/providers/AuthProvider.jsx
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/supabaseClient";
import { setPrimaryClubSlugInStorage } from "@/app/lib/primaryClub";
import {
  clearSkipClubSelection,
  clearSkipRedirectPending,
} from "@/app/lib/platformHomePrefs";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [signupEmail, setSignupEmail] = useState("");
  const signedOutRef = useRef(false);

  async function handleSession(newSession) {
    setSession(newSession);
  }

  /**
   * getSession() only reads local storage; JWTs stay until expiry after server-side user delete.
   * getUser() hits Auth — invalid / deleted users must clear the client session.
   */
  async function validateStoredSessionWithServer() {
    const {
      data: { session: stored },
    } = await supabase.auth.getSession();
    if (!stored) {
      await handleSession(null);
      return;
    }
    const { error } = await supabase.auth.getUser();
    if (error) {
      await supabase.auth.signOut();
      await handleSession(null);
      return;
    }
    const {
      data: { session: current },
    } = await supabase.auth.getSession();
    await handleSession(current ?? stored);
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await validateStoredSessionWithServer();

        if (!mounted) return;
      } catch (err) {
        console.error(">>> AuthProvider init error", err);
      } finally {
        if (mounted) {
          setLoadingUser(false);
        }
      }
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        if (event === "PASSWORD_RECOVERY") {
          await handleSession(newSession);
          setLoadingUser(false);
          return;
        }

        if (event === "SIGNED_OUT") {
          signedOutRef.current = true;
          setPrimaryClubSlugInStorage("");
          clearSkipClubSelection();
          clearSkipRedirectPending();
          setSession(null);
          setLoadingUser(false);
          return;
        }

        if (event === "SIGNED_IN") {
          signedOutRef.current = false;
        }

        // Restored from storage can still be stale if the user was deleted in the dashboard.
        if (event === "INITIAL_SESSION" && newSession) {
          setLoadingUser(true);
          try {
            await validateStoredSessionWithServer();
          } finally {
            if (mounted) setLoadingUser(false);
          }
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

  // Client navigation can render /:club/app before onAuthStateChange runs; session may be null briefly
  // while Supabase still has tokens — recover so ProtectedAppRoute does not bounce to platform login.
  useEffect(() => {
    if (loadingUser || session?.user || signedOutRef.current) return;
    let cancelled = false;
    (async () => {
      const {
        data: { session: stored },
      } = await supabase.auth.getSession();
      if (cancelled || signedOutRef.current || !stored?.user) return;
      const { error } = await supabase.auth.getUser();
      if (cancelled || signedOutRef.current || error) return;
      setSession(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadingUser, session?.user]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loadingUser,
        signupEmail,
        setSignupEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
