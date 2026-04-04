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

  const clubSlug = (() => {
    const parts = (location.pathname || "").split("/").filter(Boolean);
    const first = parts.length > 0 ? parts[0] : null;
    if (!first) return null;
    if (RESERVED_TOP_SEGMENTS.has(first.toLowerCase())) return null;
    return first;
  })();

  const [club, setClub] = useState(null);
  const [loadingClub, setLoadingClub] = useState(true);

  // ⭐ FIXED — no useCallback, no stale closures
  async function loadClub() {
    console.log("ClubProvider.loadClub start", {
      clubSlug,
      pathname: location.pathname,
    });

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
        console.warn("ClubProvider loadClub error:", error);
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
      console.log("ClubProvider.loadClub finished", { clubSlug });
    }
  }

  // ⭐ FIXED EFFECT — always re-runs when loadingUser flips
  useEffect(() => {
    console.log("ClubProvider useEffect triggered", {
      clubSlug,
      pathname: location.pathname,
      loadingUser,
    });

    if (loadingUser) {
      console.log("ClubProvider: waiting for AuthProvider hydration");
      return;
    }

    loadClub();
  }, [clubSlug, loadingUser]);

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
