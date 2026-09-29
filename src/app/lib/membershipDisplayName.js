export function formatPersonName(first, last) {
  return [first, last].filter(Boolean).join(" ").trim();
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
  const fromProfile = displayNameFromProfile(profile, row.email);
  if (fromProfile) return fromProfile;
  const legacy = formatPersonName(
    row.primary_first_name ?? row.first_name,
    row.primary_last_name ?? row.last_name
  );
  if (legacy) return legacy;
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
    if (!label || label === "Member" || /^Member [0-9a-f]{8}$/i.test(label)) {
      needProfile.push(userId);
    }
  });
  if (!needProfile.length) return next;
  const senderNames = await fetchSenderDisplayNameMap(supabase, needProfile);
  senderByMembership.forEach((userId, membershipId) => {
    const label = next[membershipId];
    if (!label || label === "Member" || /^Member [0-9a-f]{8}$/i.test(label)) {
      const fromSender = senderNames[userId];
      if (fromSender && fromSender !== "Member") next[membershipId] = fromSender;
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
    map[p.id] = displayNameFromProfile(p) || p.email || "Member";
  });
  return map;
}
