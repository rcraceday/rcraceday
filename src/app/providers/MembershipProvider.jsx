// src/app/providers/MembershipProvider.jsx
console.log(">>> MEMBERSHIP PROVIDER MOUNTED", import.meta.url);

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useClub } from "@/app/providers/ClubProvider";
import { useAuth } from "@/app/providers/AuthProvider";

export const MembershipContext = createContext(null);

export function useMembership() {
  return useContext(MembershipContext);
}

export default function MembershipProvider({ children }) {
  const { user, loadingUser } = useAuth();            // ⭐ NEW
  const { club, loadingClub } = useClub();
  const { profile, loadingProfile } = useProfile();

  const [membership, setMembership] = useState(null);
  const [loadingMembership, setLoadingMembership] = useState(true);

  const startedRef = useRef(false);

  useEffect(() => {
    console.log("MembershipProvider useEffect", {
      user: user ? { id: user.id, email: user.email } : null,
      club: club ? { id: club.id, slug: club.slug } : null,
      profile: profile ? { id: profile.id, role: profile.role } : null,
      loadingUser,                 // ⭐ NEW
      loadingClub,
      loadingProfile,
      started: startedRef.current,
    });

    // ⭐ NEW: do NOT run until AuthProvider hydration is complete
    if (loadingUser) return;

    if (!user || !club || !profile) return;
    if (loadingClub || loadingProfile) return;

    if (startedRef.current) return;
    startedRef.current = true;

    loadMembership();
  }, [user, club, profile, loadingUser, loadingClub, loadingProfile]);   // ⭐ NEW: loadingUser added

  async function loadMembership() {
    console.log("MembershipProvider.loadMembership start", {
      userId: user?.id,
      clubId: club?.id,
    });

    setLoadingMembership(true);

    try {
      // GLOBAL ADMIN BYPASS
      if (profile.role === "admin") {
        const synthetic = {
          id: "GLOBAL_ADMIN",
          user_id: user.id,
          club_id: club.id,
          membership_type: "global_admin",
          status: "active",
          email: profile.email,
          end_date: null,
          endDateObj: null,
          isAdmin: true,
        };

        setMembership(synthetic);
        setLoadingMembership(false);
        return;
      }

      // LOOKUP BY USER_ID + CLUB_ID
      const { data: existingByUser } = await supabase
        .from("household_memberships")
        .select("*")
        .eq("user_id", user.id)
        .eq("club_id", club.id)
        .maybeSingle();

      if (existingByUser) {
        const normalized = normalize(existingByUser);
        normalized.isAdmin = await checkClubAdmin(user.id, club.id);

        setMembership(normalized);
        setLoadingMembership(false);
        return;
      }

      // CREATE NEW MEMBERSHIP (non_member)
      const { data: created, error: insertError } = await supabase
        .from("household_memberships")
        .insert({
          user_id: user.id,
          club_id: club.id,
          email: profile.email,
          status: "non_member",
          membership_type: "non_member",
          primary_first_name: profile.first_name,
          primary_last_name: profile.last_name,
        })
        .select()
        .single();

      if (insertError) {
        console.error("[MembershipProvider] insert error", insertError);
        setMembership(null);
        setLoadingMembership(false);
        return;
      }

      const normalized = normalize(created);
      normalized.isAdmin = false;

      setMembership(normalized);
      setLoadingMembership(false);
    } catch (err) {
      console.error("[MembershipProvider] ERROR", err);
      setMembership(null);
      setLoadingMembership(false);
    }
  }

  async function checkClubAdmin(userId, clubId) {
    const { data } = await supabase
      .from("club_admins")
      .select("*")
      .eq("user_id", userId)
      .eq("club_id", clubId)
      .maybeSingle();

    return !!data;
  }

  function normalize(row) {
    const m = { ...row };

    m.membership_type = (m.membership_type || "").toLowerCase().trim();
    m.status = (m.status || "").toLowerCase().trim();

    if (m.end_date) {
      const parsed = new Date(m.end_date);
      m.endDateObj = Number.isNaN(parsed.getTime()) ? null : parsed;
      m.end_date = parsed.toISOString();
    } else {
      m.endDateObj = null;
    }

    return m;
  }

  const isNonMember = membership?.membership_type === "non_member";
  const isPaidMember =
    membership &&
    membership.membership_type !== "non_member" &&
    membership.membership_type !== "global_admin";

  return (
    <MembershipContext.Provider
      value={{
        membership,
        loadingMembership,

        isNonMember,
        isMember: isPaidMember,
        isJunior: membership?.membership_type === "junior",
        isSingle: membership?.membership_type === "single",
        isFamily: membership?.membership_type === "family",
        isAdmin: membership?.isAdmin === true,
      }}
    >
      {children}
    </MembershipContext.Provider>
  );
}
