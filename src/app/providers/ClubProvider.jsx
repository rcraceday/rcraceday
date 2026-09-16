// src/app/providers/ClubProvider.jsx

import { createContext, useContext, useEffect, useState, useCallback } from "react";
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
 * ✔ REQUIRED BY ClubSelect.jsx
 */
export async function userBelongsToClub(userId, clubId) {
  if (!userId || !clubId) return false;

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

  return !!membership;
}

export default function ClubProvider({ children }) {
  const location = useLocation();
  const { loadingUser } = useAuth();

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

  // ⭐ FIXED SLUG DETECTION
  const clubSlug = (() => {
    const parts = (location.pathname || "").split("/").filter(Boolean);
    const [first, second] = parts;

    if (!first) return null;

    // If first segment is reserved, slug is the second segment
    if (RESERVED_TOP_SEGMENTS.has(first.toLowerCase())) {
      return second || null;
    }

    return first;
  })();

  const [club, setClub] = useState(null);
  const [loadingClub, setLoadingClub] = useState(true);

  const loadClub = useCallback(async () => {
    if (!clubSlug) {
      setClub(null);
      setLoadingClub(false);
      return;
    }

    setLoadingClub(true);

    try {
      const { data, error } = await supabase
        .from("clubs")
        .select("*")
        .eq("slug", clubSlug)
        .maybeSingle();

      if (error || !data) {
        setClub(null);
      } else {
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
      }
    } catch (err) {
      console.error("ClubProvider loadClub caught:", err);
      setClub(null);
    } finally {
      setLoadingClub(false);
    }
  }, [clubSlug]);

  useEffect(() => {
    if (!loadingUser) {
      loadClub();
    }
  }, [loadingUser, clubSlug, loadClub]);

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
