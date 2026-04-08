// src/app/providers/MembershipProvider.jsx

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

export const MembershipContext = createContext({
  membership: null,
  loadingMembership: true,
  refreshMembership: async () => {},
});

export function useMembership() {
  return useContext(MembershipContext);
}

export default function MembershipProvider({ children }) {
  const { user, loadingUser } = useAuth();

  const [membership, setMembership] = useState(null);
  const [loadingMembership, setLoadingMembership] = useState(true);

  const inFlightRef = useRef(false);

  // Freeze during USER_UPDATED
  const lastAuthEvent = supabase.auth._state?.event;

  const loadMembership = useCallback(async () => {
    console.debug("MembershipProvider.loadMembership start", {
      userId: user?.id,
      clubId: user?.club_id,
    });

    if (lastAuthEvent === "USER_UPDATED") {
      console.debug(
        "[MembershipProvider] freeze — USER_UPDATED in progress, skipping reload"
      );
      return;
    }

    if (inFlightRef.current) return;

    if (!user?.id) {
      setMembership(null);
      setLoadingMembership(false);
      return;
    }

    inFlightRef.current = true;
    setLoadingMembership(true);

    try {
      const { data, error } = await supabase
        .from("household_memberships")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.warn("[MembershipProvider] select error", error);
        setMembership(null);
      } else {
        setMembership(data || null);
      }
    } catch (err) {
      console.error("[MembershipProvider] loadMembership caught", err);
      setMembership(null);
    } finally {
      inFlightRef.current = false;
      setLoadingMembership(false);
    }
  }, [user?.id, user?.club_id, lastAuthEvent]);

  // Trigger reload when user or club changes
  useEffect(() => {
    if (loadingUser) return;

    if (!user?.id) {
      setMembership(null);
      setLoadingMembership(false);
      return;
    }

    loadMembership();
  }, [user?.id, user?.club_id, loadingUser, loadMembership]);

  return (
    <MembershipContext.Provider
      value={{
        membership,
        loadingMembership,
        refreshMembership: loadMembership,
      }}
    >
      {children}
    </MembershipContext.Provider>
  );
}
