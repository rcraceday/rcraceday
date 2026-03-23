// src/app/providers/ClubProvider.jsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";   // ⭐ NEW

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
  const { loadingUser } = useAuth();   // ⭐ NEW — wait for auth hydration

  // Reserved top-level segments that are NOT club slugs
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

  // Derive the top-level slug deterministically from the pathname
  const clubSlug = (() => {
    const parts = (location.pathname || "").split("/").filter(Boolean);
    const first = parts.length > 0 ? parts[0] : null;
    if (!first) return null;
    if (RESERVED_TOP_SEGMENTS.has(first.toLowerCase())) return null;
    return first;
  })();

  const [club, setClub] = useState(null);
  const [loadingClub, setLoadingClub] = useState(true);

  const loadClub = useCallback(async () => {
    console.log("ClubProvider.loadClub start", {
      clubSlug,
      pathname: location.pathname,
    });

    // If slug is not ready, do NOT load yet
    if (!clubSlug) {
      console.log("ClubProvider: slug not ready — staying in loading state", {
        clubSlug,
        pathname: location.pathname,
      });
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

        const loadedClub = {
          ...data,
          theme,
        };

        console.log("ClubProvider: club loaded", {
          slug: clubSlug,
          id: data.id,
        });
        setClub(loadedClub);
      } else {
        console.log("ClubProvider: no club found for slug", { clubSlug });
        setClub(null);
      }
    } catch (err) {
      console.error("ClubProvider loadClub caught:", err);
      setClub(null);
    } finally {
      setLoadingClub(false);
      console.log("ClubProvider.loadClub finished", { clubSlug });
    }
  }, [clubSlug, location.pathname]);

  useEffect(() => {
    console.log("ClubProvider useEffect triggered", {
      clubSlug,
      pathname: location.pathname,
      loadingUser,
    });

    // ⭐ NEW: do NOT load club until auth is hydrated
    if (loadingUser) {
      console.log("ClubProvider: waiting for AuthProvider hydration");
      return;
    }

    loadClub();
  }, [clubSlug, loadClub, loadingUser]);

  // ⭐ NEW: block rendering until BOTH auth + club are ready
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
