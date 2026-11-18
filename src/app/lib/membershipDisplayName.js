export function formatPersonName(first, last) {
  return [first, last].filter(Boolean).join(" ").trim();
}

export function looksLikeEmail(label) {
  const text = String(label || "").trim();
  return text.includes("@") && text.includes(".");
}

export function displayNameFromProfile(profile, fallbackEmail = "") {
  const fromProfile = formatPersonName(profile?.first_name, profile?.last_name);
  if (fromProfile) return fromProfile;
  if (profile?.email) return profile.email;
  if (fallbackEmail) return fallbackEmail;
  return "";
}

export function displayNameFromMembershipRow(row, profileByUserId = {}) {
  if (!row) return "Member";
  const profile = row.user_id ? profileByUserId[row.user_id] : null;
  const fromProfile = formatPersonName(profile?.first_name, profile?.last_name);
  if (fromProfile) return fromProfile;
  const legacy = formatPersonName(row.primary_first_name, row.primary_last_name);
  if (legacy) return legacy;
  const fromClubMember = row._clubMemberName;
  if (fromClubMember) return fromClubMember;
  if (profile?.email) return profile.email;
  if (row.email) return row.email;
  return `Member ${String(row.id).slice(0, 8)}`;
}

export async function fetchMembershipDisplayNameMap(supabase, membershipIds) {
  const map = {};
  const ids = Array.from(new Set((membershipIds || []).filter(Boolean)));
  if (!ids.length) return map;

  const { data: rows, error } = await supabase
    .from("household_memberships")
    .select("id, user_id, email, primary_first_name, primary_last_name")
    .in("id", ids);

  if (error) {
    console.warn("fetchMembershipDisplayNameMap", error);
    return map;
  }

  const userIds = Array.from(new Set((rows || []).map((r) => r.user_id).filter(Boolean)));
  let profileByUserId = {};
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", userIds);
    (profiles || []).forEach((p) => {
      profileByUserId[p.id] = p;
    });
  }

  (rows || []).forEach((row) => {
    map[row.id] = displayNameFromMembershipRow(row, profileByUserId);
  });

  const needsHouseholdName = ids.filter((id) => {
    const label = map[id];
    return !label || looksLikeEmail(label) || /^Member [0-9a-f]{8}$/i.test(label);
  });

  if (needsHouseholdName.length) {
    const { data: clubMembers } = await supabase
      .from("club_members")
      .select("membership_id, first_name, last_name")
      .in("membership_id", needsHouseholdName);

    const memberNameByMembership = new Map();
    (clubMembers || []).forEach((member) => {
      const name = formatPersonName(member.first_name, member.last_name);
      if (!name || memberNameByMembership.has(member.membership_id)) return;
      memberNameByMembership.set(member.membership_id, name);
    });

    needsHouseholdName.forEach((id) => {
      const fromMember = memberNameByMembership.get(id);
      if (fromMember) map[id] = fromMember;
    });

    const stillNeedsName = needsHouseholdName.filter((id) => {
      const label = map[id];
      return !label || looksLikeEmail(label) || /^Member [0-9a-f]{8}$/i.test(label);
    });

    if (stillNeedsName.length) {
      const { data: drivers } = await supabase
        .from("drivers")
        .select("membership_id, first_name, last_name")
        .in("membership_id", stillNeedsName);

      const driverNameByMembership = new Map();
      (drivers || []).forEach((driver) => {
        const name = formatPersonName(driver.first_name, driver.last_name);
        if (!name || driverNameByMembership.has(driver.membership_id)) return;
        driverNameByMembership.set(driver.membership_id, name);
      });

      stillNeedsName.forEach((id) => {
        const fromDriver = driverNameByMembership.get(id);
        if (fromDriver) map[id] = fromDriver;
      });
    }
  }

  return map;
}

/** Fill missing membership labels from member message senders (when profile link works but membership row is sparse). */
export async function enrichMembershipDisplayNameMapFromMessages(
  supabase,
  messages,
  nameMap = {}
) {
  const next = { ...nameMap };
  const senderByMembership = new Map();
  (messages || []).forEach((msg) => {
    if (msg.sender_role !== "member" || !msg.membership_id || !msg.sender_user_id) return;
    if (!senderByMembership.has(msg.membership_id)) {
      senderByMembership.set(msg.membership_id, msg.sender_user_id);
    }
  });
  const needProfile = [];
  senderByMembership.forEach((userId, membershipId) => {
    const label = next[membershipId];
    if (!label || label === "Member" || /^Member [0-9a-f]{8}$/i.test(label) || looksLikeEmail(label)) {
      needProfile.push(userId);
    }
  });
  if (!needProfile.length) return next;
  const senderNames = await fetchSenderDisplayNameMap(supabase, needProfile);
  senderByMembership.forEach((userId, membershipId) => {
    const label = next[membershipId];
    const shouldReplace =
      !label ||
      label === "Member" ||
      /^Member [0-9a-f]{8}$/i.test(label) ||
      looksLikeEmail(label);
    if (!shouldReplace) return;
    const fromSender = senderNames[userId];
    if (fromSender && fromSender !== "Member" && !looksLikeEmail(fromSender)) {
      next[membershipId] = fromSender;
    }
  });
  return next;
}

export async function fetchSenderDisplayNameMap(supabase, senderUserIds) {
  const map = {};
  const ids = Array.from(new Set((senderUserIds || []).filter(Boolean)));
  if (!ids.length) return map;
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .in("id", ids);
  (profiles || []).forEach((p) => {
    const name = formatPersonName(p.first_name, p.last_name);
    map[p.id] = name || "Member";
  });
  return map;
}
