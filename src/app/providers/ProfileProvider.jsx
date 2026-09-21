// src/app/providers/ProfileProvider.jsx

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";

const ProfileContext = createContext({
  user: null,
  profile: null,
  loadingProfile: true,
  refreshProfile: async () => {},
});

export function useProfile() {
  return useContext(ProfileContext);
}

export default function ProfileProvider({ children }) {
  const { user, loadingUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const loadProfile = useCallback(async () => {
    // Do NOT run while auth is still hydrating
    if (loadingUser) return;

    // No user → no profile
    if (!user?.id) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    if (!user.email_confirmed_at) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("ProfileProvider SELECT error:", error);
      }

      if (data) {
        setProfile({
          ...data,
          email: user.email,
        });
      } else {
        // Do NOT auto-create a profile here. A missing profile means the user
        // has not completed the membership/signup flow (see Login.jsx), which
        // is the only place a profile row should be created.
        setProfile(null);
      }
    } catch (err) {
      console.error("ProfileProvider loadProfile exception:", err);
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [user?.id, loadingUser]);

  useEffect(() => {
    if (!loadingUser) {
      loadProfile();
    }
  }, [loadingUser, user?.id, loadProfile]);

  return (
    <ProfileContext.Provider
      value={{
        user,
        profile,
        loadingProfile,
        refreshProfile: loadProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
