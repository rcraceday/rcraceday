import { supabase } from "@/supabaseClient";
import {
  isSafeClubAppReturnPath,
  publicCheckEmailPath,
  publicSignupPath,
  resolvePostAuthAppPath,
} from "@/app/lib/publicAuthRedirect";

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

function isClubNonMemberSignup(user, club) {
  const metadata = user.user_metadata || {};
  return (
    String(metadata.club_id) === String(club.id) &&
    metadata.signup_type === "non_member_signup"
  );
}

/**
 * Ensures the authenticated user has club access for the current tenant.
 * Creates an active non_member household when they have an account at another club.
 */
export async function reconcileClubAccess({
  user,
  club,
  clubSlug,
  navigate,
  onError,
  userNotFoundMessage,
  returnTo,
}) {
  const safeReturnTo =
    returnTo && isSafeClubAppReturnPath(returnTo, clubSlug) ? returnTo : "";

  if (!user?.email_confirmed_at) {
    navigate(publicCheckEmailPath(clubSlug, user?.email || "", safeReturnTo));
    return false;
  }

  const userId = user.id;
  const userEmail = user.email?.toLowerCase();
  const metadata = user.user_metadata || {};

  let { data: membership, error: membershipLookupError } = await supabase
    .from("household_memberships")
    .select("*")
    .eq("club_id", club.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipLookupError) {
    onError?.(membershipLookupError.message);
    return false;
  }

  if (!membership) {
    const emailLookup = await supabase
      .from("household_memberships")
      .select("*")
      .eq("club_id", club.id)
      .ilike("email", userEmail)
      .maybeSingle();

    membership = emailLookup.data;
    membershipLookupError = emailLookup.error;

    if (membershipLookupError) {
      onError?.(membershipLookupError.message);
      return false;
    }
  }

  if (!membership && metadata.membership_id) {
    const idLookup = await supabase
      .from("household_memberships")
      .select("*")
      .eq("club_id", club.id)
      .eq("id", metadata.membership_id)
      .maybeSingle();

    membership = idLookup.data;
    if (idLookup.error) {
      onError?.(idLookup.error.message);
      return false;
    }
  }

  let firstLogin = false;
  let membershipUpdates = {};

  if (!membership) {
    const canProvisionVisitor =
      isClubNonMemberSignup(user, club) || Boolean(user.email_confirmed_at);

    if (!canProvisionVisitor) {
      await supabase.auth.signOut();
      navigate(publicSignupPath(clubSlug, safeReturnTo), {
        state: {
          message: userNotFoundMessage,
        },
      });
      return false;
    }

    const { first, last } = await resolveMembershipNames(user);

    const { data: createdMembership, error: membershipError } = await supabase
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

    if (membershipError) {
      onError?.("Unable to create your club access. Please try again.");
      return false;
    }

    firstLogin = true;
    membership = createdMembership;
  }

  if (membership.user_id && membership.user_id !== userId) {
    await supabase.auth.signOut();
    onError?.("This membership is already linked to another account.");
    return false;
  }

  if (!membership.user_id) {
    membershipUpdates.user_id = userId;
    firstLogin = true;
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

  navigate(
    resolvePostAuthAppPath({
      clubSlug,
      firstLogin,
      returnTo: safeReturnTo,
    })
  );
  return true;
}
