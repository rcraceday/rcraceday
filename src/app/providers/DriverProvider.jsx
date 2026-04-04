// src/app/providers/DriverProvider.jsx
console.log("DriverProvider: render");

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";
import { useMembership } from "@/app/providers/MembershipProvider";

export const DriverContext = createContext({
  drivers: [],
  loadingDrivers: true,
  refreshDrivers: async () => {},
});

export function useDrivers() {
  return useContext(DriverContext);
}

export default function DriverProvider({ children }) {
  const { user, loadingUser } = useAuth();
  const { membership, loadingMembership } = useMembership();

  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);

  const inFlightRef = useRef(false);
  const watchdogRef = useRef(null);

  const clearWatchdog = () => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  };

  const loadDrivers = useCallback(async () => {
    console.debug("[DriverProvider] loadDrivers called");

    if (inFlightRef.current) {
      console.debug("[DriverProvider] loadDrivers skipped — already in flight");
      return;
    }

    if (
      typeof loadingUser !== "boolean" ||
      typeof loadingMembership !== "boolean"
    ) {
      console.debug("[DriverProvider] loadDrivers deferred — loading flags not boolean");
      return;
    }

    if (loadingUser || loadingMembership) {
      console.debug("[DriverProvider] loadDrivers deferred — still loading");
      return;
    }

    if (!membership) {
      console.debug("[DriverProvider] membership temporarily undefined — skipping load");
      return;
    }

    if (!membership.id) {
      console.debug("[DriverProvider] membership exists but has no id — clearing drivers");
      setDrivers([]);
      setLoadingDrivers(false);
      return;
    }

    inFlightRef.current = true;
    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      console.warn("[DriverProvider] watchdog: clearing inFlightRef after timeout");
      inFlightRef.current = false;
      watchdogRef.current = null;
    }, 30000);

    console.debug("[DriverProvider] loadDrivers start", {
      userId: user?.id,
      membershipId: membership?.id,
      membershipType: membership?.membership_type,
      clubId: membership?.club_id,
    });

    setLoadingDrivers(true);

    try {
      let response;

      // ------------------------------------------------------------
      // GLOBAL ADMIN — LOAD ALL DRIVERS IN CLUB
      // ------------------------------------------------------------
      if (membership.membership_type === "global_admin") {
        response = await supabase
          .from("drivers")
          .select("*")
          .eq("club_id", membership.club_id)
          .order("created_at", { ascending: true });

        console.debug("[DriverProvider] global admin load — by club_id", {
          clubId: membership.club_id,
          status: response.status,
          error: response.error,
          rows: response.data?.length || 0,
        });
      }

      // ------------------------------------------------------------
      // NORMAL USER — LOAD BY membership_id
      // ------------------------------------------------------------
      else {
        response = await supabase
          .from("drivers")
          .select("*")
          .eq("membership_id", membership.id)
          .order("created_at", { ascending: true });

        console.debug("[DriverProvider] normal load — by membership_id", {
          membershipId: membership.id,
          status: response.status,
          error: response.error,
          rows: response.data?.length || 0,
        });
      }

      if (response.error) {
        console.warn("[DriverProvider] supabase returned error", response.error);
        setDrivers([]);
      } else {
        setDrivers(response.data || []);
        console.debug("[DriverProvider] drivers state", response.data);
      }
    } catch (err) {
      console.error("[DriverProvider] loadDrivers caught", err);
      setDrivers([]);
    } finally {
      setLoadingDrivers(false);
      inFlightRef.current = false;
      clearWatchdog();
      console.debug("[DriverProvider] loadDrivers finished", {
        loadingDrivers: false,
      });
    }
  }, [
    membership,
    membership?.id,
    membership?.membership_type,
    membership?.club_id,
    user?.id,
    loadingUser,
    loadingMembership,
  ]);

  // ------------------------------------------------------------
  // EFFECT: TRIGGER LOAD WHEN MEMBERSHIP OR USER CHANGES
  // ------------------------------------------------------------
  useEffect(() => {
    if (
      typeof loadingUser !== "boolean" ||
      typeof loadingMembership !== "boolean"
    ) {
      return;
    }

    if (loadingUser || loadingMembership) {
      return;
    }

    if (!membership) {
      return;
    }

    if (!membership.id) {
      setDrivers([]);
      setLoadingDrivers(false);
      return;
    }

    (async () => {
      try {
        await loadDrivers();
      } catch (err) {
        console.error("[DriverProvider] loadDrivers invocation error", err);
      }
    })();
  }, [
    membership,
    membership?.id,
    membership?.membership_type,
    membership?.club_id,
    loadingUser,
    loadingMembership,
    loadDrivers,
  ]);

  if (!user || loadingUser || loadingMembership) {
    return children;
  }

  return (
    <DriverContext.Provider
      value={{ drivers, loadingDrivers, refreshDrivers: loadDrivers }}
    >
      {children}
    </DriverContext.Provider>
  );
}
