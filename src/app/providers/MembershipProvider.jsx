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
import { useClub } from "@/app/providers/ClubProvider";
import {
  pickHouseholdMembership,
  withMembershipFlags,
} from "@/app/lib/householdMembership";

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
  const { club, loadingClub } = useClub();

  const [membership, setMembership] = useState(null);
  const [loadingMembership, setLoadingMembership] = useState(true);

  const inFlightRef = useRef(false);

  const loadMembership = useCallback(async () => {
    if (inFlightRef.current) return;

    // If auth or club isn't ready, do NOT flip loadingMembership repeatedly
    if (loadingUser || loadingClub) return;

    if (!user?.id || !club?.id) {
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
        .eq("club_id", club.id);

      if (error) {
        console.warn("[MembershipProvider] select error", error);
        setMembership(null);
      } else {
        setMembership(withMembershipFlags(pickHouseholdMembership(data)));
      }
    } catch (err) {
      console.error("[MembershipProvider] loadMembership caught", err);
      setMembership(null);
    } finally {
      inFlightRef.current = false;
      setLoadingMembership(false);
    }
  }, [user?.id, loadingUser, loadingClub, club?.id]);

  useEffect(() => {
    // Only run when ALL dependencies are ready
    if (!loadingUser && !loadingClub) {
      loadMembership();
    }
  }, [loadingUser, loadingClub, user?.id, club?.id, loadMembership]);

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
