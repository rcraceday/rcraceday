import { supabase } from "@/supabaseClient";
import { pickHouseholdMembership } from "@/app/lib/householdMembership";
import {
  publicCheckEmailPath,
  publicClaimMembershipPath,
  resolvePostAuthAppPath,
  sanitizeClubAppReturnPath,
} from "@/app/lib/publicAuthRedirect";
import { isNominateAppReturnPath } from "@/app/lib/nominationLinks";
import { ensureHostClubVisitorDriver } from "@/app/lib/ensureHostClubVisitorDriver";

function isVisitorMembership(membership) {
  return !membership || membership.membership_type === "non_member";
}

async function resolveMembershipNames(user) {
  const metadata = user.user_metadata || {};
  let first = String(metadata.first_name || "").trim();
  let last = String(metadata.last_name || "").trim();

  if (!first) {
    const full = String(metadata.full_name || "").trim();
    if (full) {
      const parts = full.split(/\s+/);
      first = parts[0] || "";
      last = parts.length > 1 ? parts.slice(1).join(" ") : first;
    }
  }

  if (!first) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      first = String(profile.first_name || "").trim();
      last = String(profile.last_name || "").trim();
      if (!first && profile.full_name) {
        const parts = String(profile.full_name).trim().split(/\s+/);
        first = parts[0] || "";
        last = parts.length > 1 ? parts.slice(1).join(" ") : first;
      }
    }
  }

  if (!first) first = "Driver";
  if (!last) last = first;

  return { first, last };
}

async function loadMembershipByUserId(clubId, userId) {
  const { data, error } = await supabase
    .from("household_memberships")
    .select("*")
    .eq("club_id", clubId)
    .eq("user_id", userId);
  if (error) return { data: null, error };
  return { data: pickHouseholdMembership(data), error: null };
}

async function loadMembershipByEmail(clubId, email) {
  const { data, error } = await supabase
    .from("household_memberships")
    .select("*")
    .eq("club_id", clubId)
    .ilike("email", email);

  if (error) return { data: null, error };

  const rows = data || [];
  const real = rows.find((row) => row.membership_type !== "non_member");
  return { data: real || rows[0] || null, error: null };
}

async function provisionVisitorMembership(user, club) {
  const userId = user.id;
  const userEmail = user.email?.toLowerCase();
  const metadata = user.user_metadata || {};
  const { first, last } = await resolveMembershipNames(user);

  const { data, error } = await supabase
    .from("household_memberships")
    .insert({
      user_id: userId,
      email: userEmail,
      primary_first_name: metadata.first_name || first,
      primary_last_name: metadata.last_name || last,
      membership_type: "non_member",
      status: "active",
      club_id: club.id,
    })
    .select("*")
    .single();

  return { data, error };
}

async function finishClubEntry({
  user,
  club,
  clubSlug,
  membership,
  firstLogin,
  returnTo,
  navigate,
  onError,
}) {
  const userId = user.id;
  const safeReturnTo = sanitizeClubAppReturnPath(returnTo, clubSlug);

  if (membership.user_id && membership.user_id !== userId) {
    await supabase.auth.signOut();
    onError?.("This membership is already linked to another account.");
    return false;
  }

  const membershipUpdates = {};
  let linkedFirstLogin = firstLogin;

  if (!membership.user_id) {
    membershipUpdates.user_id = userId;
    linkedFirstLogin = true;
  }

  if (
    membership.membership_type === "non_member" &&
    membership.status !== "active"
  ) {
    membershipUpdates.status = "active";
  }

  if (Object.keys(membershipUpdates).length > 0) {
    const { error: updateError } = await supabase
      .from("household_memberships")
      .update(membershipUpdates)
      .eq("id", membership.id);

    if (updateError) {
      onError?.("Unable to link your membership. Please try again.");
      return false;
    }
  }

  let navigateFirstLogin = linkedFirstLogin;
  if (safeReturnTo && isNominateAppReturnPath(safeReturnTo)) {
    const ensured = await ensureHostClubVisitorDriver({
      userId,
      clubId: club.id,
      membership,
    });
    if (ensured) {
      navigateFirstLogin = false;
    }
  }

  navigate(
    resolvePostAuthAppPath({
      clubSlug,
      firstLogin: navigateFirstLogin,
      returnTo: safeReturnTo,
    }),
    { replace: true }
  );
  return true;
}

/**
 * Ensures the authenticated user has club access for the current tenant.
 * Tries the RCRaceday login email first, then asks for a different membership email.
 */
export async function reconcileClubAccess({
  user,
  club,
  clubSlug,
  navigate,
  onError,
  returnTo,
  skipMembershipClaim = false,
}) {
  const safeReturnTo = sanitizeClubAppReturnPath(returnTo, clubSlug);

  if (!user?.email_confirmed_at) {
    navigate(publicCheckEmailPath(clubSlug, user?.email || "", safeReturnTo));
    return false;
  }

  const userId = user.id;
  const userEmail = user.email?.toLowerCase();
  const metadata = user.user_metadata || {};

  const byUser = await loadMembershipByUserId(club.id, userId);
  if (byUser.error) {
    onError?.(byUser.error.message);
    return false;
  }

  let byEmail = { data: null, error: null };
  if (userEmail) {
    byEmail = await loadMembershipByEmail(club.id, userEmail);
    if (byEmail.error) {
      onError?.(byEmail.error.message);
      return false;
    }
  }

  let byMetadata = { data: null };
  if (!byUser.data && !byEmail.data && metadata.membership_id) {
    byMetadata = await supabase
      .from("household_memberships")
      .select("*")
      .eq("club_id", club.id)
      .eq("id", metadata.membership_id)
      .maybeSingle();
    if (byMetadata.error) {
      onError?.(byMetadata.error.message);
      return false;
    }
  }

  const emailMembership = isVisitorMembership(byEmail.data) ? null : byEmail.data;
  const userMembership = isVisitorMembership(byUser.data) ? null : byUser.data;
  const metaMembership = isVisitorMembership(byMetadata.data) ? null : byMetadata.data;
  const realMembership = emailMembership || userMembership || metaMembership;

  if (realMembership) {
    return finishClubEntry({
      user,
      club,
      clubSlug,
      membership: realMembership,
      firstLogin: !realMembership.user_id || realMembership.user_id !== userId,
      returnTo: safeReturnTo,
      navigate,
      onError,
    });
  }

  if (byUser.data) {
    return finishClubEntry({
      user,
      club,
      clubSlug,
      membership: byUser.data,
      firstLogin: false,
      returnTo: safeReturnTo,
      navigate,
      onError,
    });
  }

  if (!skipMembershipClaim) {
    navigate(publicClaimMembershipPath(clubSlug, safeReturnTo));
    return false;
  }

  const { data: createdMembership, error: membershipError } =
    await provisionVisitorMembership(user, club);

  if (membershipError) {
    onError?.("Unable to create your club access. Please try again.");
    return false;
  }

  return finishClubEntry({
    user,
    club,
    clubSlug,
    membership: createdMembership,
    firstLogin: true,
    returnTo: safeReturnTo,
    navigate,
    onError,
  });
}
