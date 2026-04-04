// src/app/providers/ProfileProvider.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";

const ProfileContext = createContext({
  user: null,              // ⭐ ADDED
  profile: null,
  loadingProfile: true,
  refreshProfile: async () => {},
});

export function useProfile() {
  return useContext(ProfileContext);
}

export default function ProfileProvider({ children }) {
  const { user, loadingUser } = useAuth();   // ⭐ AuthProvider user
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  async function loadProfile() {
    // ⭐ Wait for AuthProvider hydration
    if (loadingUser) {
      setLoadingProfile(true);
      return;
    }

    if (!user?.id) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);

    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setProfile({
          ...data,
          email: user.email,
        });
        setLoadingProfile(false);
        return;
      }

      // Create profile if missing
      const meta = user.user_metadata || {};

      const firstName =
        meta.first_name ||
        meta.full_name?.split(" ")?.[0] ||
        "";
      const lastName =
        meta.last_name ||
        meta.full_name?.split(" ")?.slice(1).join(" ") ||
        "";

      const fullName =
        meta.full_name ||
        `${firstName} ${lastName}`.trim();

      const { data: created, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email,
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
        })
        .select()
        .single();

      if (insertError) {
        console.error("ProfileProvider failed to create profile:", insertError);
        setProfile(null);
        setLoadingProfile(false);
        return;
      }

      setProfile({
        ...created,
        email: user.email,
      });
      setLoadingProfile(false);
    } catch (err) {
      console.error("ProfileProvider loadProfile exception:", err);
      setProfile(null);
      setLoadingProfile(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, [user?.id, loadingUser]);

  return (
    <ProfileContext.Provider
      value={{
        user,              // ⭐ FIX — expose the real user
        profile,
        loadingProfile,
        refreshProfile: loadProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
