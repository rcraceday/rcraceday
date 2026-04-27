// src/app/providers/ClubProvider.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";

const ClubContext = createContext({
  club: null,
  loadingClub: true,
  refreshClub: async () => {},
});

export function useClub() {
  return useContext(ClubContext);
}

/**
 * Check if a user already belongs to a given club.
 * This is safe to use in routing logic (e.g. ClubSelect).
 */
export async function userBelongsToClub(userId, clubId) {
  if (!userId || !clubId) return false;

  // Check for an existing household_membership for this user + club
  const { data: membership, error } = await supabase
    .from("household_memberships")
    .select("id, status, membership_type")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("userBelongsToClub error:", error);
    return false;
  }

  // You can tighten this if you only want active members/admins
  return !!membership;
}

export default function ClubProvider({ children }) {
  const location = useLocation();
  const { user, loadingUser } = useAuth();

  const RESERVED_TOP_SEGMENTS = new Set([
    "home",
    "public",
    "app",
    "login",
    "admin",
    "api",
    "static",
    "assets",
  ]);

  const clubSlug = (() => {
    const parts = (location.pathname || "").split("/").filter(Boolean);
    const first = parts.length > 0 ? parts[0] : null;
    if (!first) return null;
    if (RESERVED_TOP_SEGMENTS.has(first.toLowerCase())) return null;
    return first;
  })();

  const [club, setClub] = useState(null);
  const [loadingClub, setLoadingClub] = useState(true);

  /* ------------------------------------------------------------
     Load club
     ------------------------------------------------------------ */
  async function loadClub() {
    if (!clubSlug) {
      setClub(null);
      setLoadingClub(true);
      return;
    }

    setLoadingClub(true);

    try {
      const { data, error } = await supabase
        .from("clubs")
        .select("*")
        .eq("slug", clubSlug)
        .maybeSingle();

      if (error) {
        setClub(null);
      } else if (data) {
        let theme = data.theme;

        if (!theme) theme = {};
        if (typeof theme === "string") {
          try {
            theme = JSON.parse(theme);
          } catch {
            theme = {};
          }
        }

        theme.colors = theme.colors || {};
        theme.hero = theme.hero || {};

        setClub({
          ...data,
          theme,
          member_badge_url: data.member_badge_url || null,
        });
      } else {
        setClub(null);
      }
    } catch (err) {
      console.error("ClubProvider loadClub caught:", err);
      setClub(null);
    } finally {
      setLoadingClub(false);
    }
  }

  /* ------------------------------------------------------------
     Ensure profile exists
     ------------------------------------------------------------ */
  async function ensureProfile() {
    if (!user?.id || !club) return null;

    const { data: existingProfile, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      console.error("Profile lookup error:", profileErr);
      return null;
    }

    if (existingProfile) return existingProfile;

    const firstName = user.user_metadata?.first_name || "";
    const lastName = user.user_metadata?.last_name || "";

    const { data: newProfile, error: insertErr } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email?.toLowerCase(),
        first_name: firstName,
        last_name: lastName,
        club_id: club.id,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Profile creation error:", insertErr);
      return null;
    }

    return newProfile;
  }

  /* ------------------------------------------------------------
     Ensure membership exists for this club
     (multi-club safe: we DO NOT auto-create new memberships here)
     ------------------------------------------------------------ */
  async function ensureMembership(profile) {
    if (!user?.id || !club) return;

    const userEmail = user.email?.toLowerCase();
    if (!userEmail) return;

    // 1️⃣ Look for membership already linked to this user
    const { data: userMembership, error: userMembershipErr } = await supabase
      .from("household_memberships")
      .select("*")
      .eq("club_id", club.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (userMembershipErr) {
      console.error("Membership lookup by user_id error:", userMembershipErr);
      return;
    }

    if (userMembership) {
      // Already linked — do nothing
      return;
    }

    // 2️⃣ Look for unclaimed membership by email
    const { data: emailMembership, error: emailMembershipErr } = await supabase
      .from("household_memberships")
      .select("*")
      .eq("club_id", club.id)
      .ilike("email", userEmail)
      .maybeSingle();

    if (emailMembershipErr) {
      console.error("Membership lookup by email error:", emailMembershipErr);
      return;
    }

    const firstName = profile?.first_name || user.user_metadata?.first_name || "";
    const lastName = profile?.last_name || user.user_metadata?.last_name || "";

    // 3️⃣ If unclaimed membership exists → link it
    if (emailMembership && !emailMembership.user_id) {
      const { error: linkErr } = await supabase
        .from("household_memberships")
        .update({
          user_id: user.id,
          primary_first_name: firstName,
          primary_last_name: lastName,
        })
        .eq("id", emailMembership.id);

      if (linkErr) {
        console.error("Membership linking error:", linkErr);
      }

      return;
    }

    // 4️⃣ No membership exists → DO NOTHING
    // Multi-club safe: we do not auto-create a membership row just
    // because a logged-in user visited this club.
  }

  /* ------------------------------------------------------------
     Combined membership + profile logic
     ------------------------------------------------------------ */
  async function handleMembershipFlow() {
    if (!user?.id || !club) return;

    const profile = await ensureProfile();
    await ensureMembership(profile);
  }

  /* ------------------------------------------------------------
     Load club when user hydration completes
     ------------------------------------------------------------ */
  useEffect(() => {
    if (loadingUser) return;
    loadClub();
  }, [clubSlug, loadingUser]);

  /* ------------------------------------------------------------
     Run membership flow when both user + club are ready
     ------------------------------------------------------------ */
  useEffect(() => {
    if (!loadingUser && !loadingClub && user && club) {
      handleMembershipFlow();
    }
  }, [loadingUser, loadingClub, user, club]);

  /* ------------------------------------------------------------
     Provider output
     ------------------------------------------------------------ */
  if (loadingUser || !clubSlug || loadingClub) {
    return (
      <ClubContext.Provider
        value={{
          club: null,
          loadingClub: true,
          refreshClub: loadClub,
        }}
      >
        {children}
      </ClubContext.Provider>
    );
  }

  return (
    <ClubContext.Provider
      value={{
        club,
        loadingClub,
        refreshClub: loadClub,
      }}
    >
      {children}
    </ClubContext.Provider>
  );
}
