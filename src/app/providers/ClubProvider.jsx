// src/app/providers/ClubProvider.jsx
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
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

  // ⭐ Reserved segments to avoid confusion with club slugs
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

  // ⭐ Extract club slug from the URL
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

  // ⭐ State for club and loading status
  const [club, setClub] = useState(null);
  const [loadingClub, setLoadingClub] = useState(true);

  // ⭐ Memoized function to load club data
  const loadClub = useCallback(async () => {
    if (!clubSlug) {
      setClub(null);
      setLoadingClub(false);
      console.log("❌ No club slug found, skipping club load");
      return;
    }

    setLoadingClub(true);
    console.log("🔄 Loading club data for slug:", clubSlug);

    try {
      const { data, error } = await supabase
        .from("clubs")
        .select("*")
        .eq("slug", clubSlug)
        .maybeSingle();

      if (error || !data) {
        console.error("❌ Error fetching club data:", error);
        setClub(null);
      setLoadingClub(false);
      } else {
        // ⭐ Parse and normalize club theme
        let theme = data.theme;

        if (!theme) theme = {};
        if (typeof theme === "string") {
          try {
            theme = JSON.parse(theme);
          } catch {
            theme = {};
            console.warn("⚠️ Failed to parse club theme JSON, using empty object");
    }
        }

        // ⭐ Ensure theme has colors and hero properties
        theme.colors = theme.colors || {};
        theme.hero = theme.hero || {};

        // ⭐ Set club with theme and badge URL
        setClub({
          ...data,
          theme,
          member_badge_url: data.member_badge_url || null,
        });
        setLoadingClub(false);
        console.log("✅ Club data loaded successfully:", data);
      }
    } catch (err) {
      console.error("ClubProvider loadClub caught:", err);
      setClub(null);
      setLoadingClub(false);
    } finally {
      setLoadingClub(false);
    }
  }, [clubSlug]);

  // ⭐ Load club only when user is authenticated
  useEffect(() => {
    if (!loadingUser) {
      loadClub();
    }
  }, [loadingUser, clubSlug, loadClub]);

  // ⭐ Add caching to avoid redundant loads
  const cachedClub = useMemo(() => {
    if (!club || !clubSlug) return null;
    return club;
  }, [club, clubSlug]);

  return (
    <ClubContext.Provider
      value={{
        club: cachedClub,
        loadingClub,
        refreshClub: loadClub,
      }}
    >
      {children}
    </ClubContext.Provider>
  );
}

