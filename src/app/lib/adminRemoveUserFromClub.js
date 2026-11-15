export async function adminRemoveUserFromClub(supabase, { clubId, userId }) {
  if (!clubId || !userId) {
    return { data: null, error: new Error("missing_club_or_user") };
  }

  const { data, error } = await supabase.rpc("admin_remove_user_from_club", {
    p_club_id: clubId,
    p_user_id: userId,
  });

  return { data, error };
}

export function mapRemoveUserFromClubError(error, t) {
  const code = error?.message || error?.code || "";
  if (code.includes("not_authenticated")) {
    return t("admin.removeClubUser.errNotAuthenticated");
  }
  if (code.includes("permission_denied")) {
    return t("admin.removeClubUser.errPermission");
  }
  if (code.includes("cannot_remove_self")) {
    return t("admin.removeClubUser.errSelf");
  }
  if (code.includes("nothing_to_remove")) {
    return t("admin.removeClubUser.errNothing");
  }
  if (code.includes("invalid_arguments")) {
    return t("admin.removeClubUser.errInvalid");
  }
  if (code.includes("Could not find the function")) {
    return t("admin.removeClubUser.errNotDeployed");
  }
  return error?.message || t("admin.removeClubUser.errGeneric");
}