import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useClub } from "@/app/providers/ClubProvider";
import { useProfile } from "@/app/providers/ProfileProvider";
import { useAdminAccess } from "@/app/providers/AdminAccessProvider";
import {
  ADMIN_PERMISSION_KEYS,
  detectPresetId,
  emptyAdminPermissions,
  fetchClubAdminGrantsForClub,
  hasAnyPermission,
  isFullProfileAdmin,
  normalizeAdminPermissions,
  permissionsFromPreset,
  targetHasProtectedClubAdmin,
} from "@/app/lib/adminPermissions";
import { mapClubAdminGrantError } from "@/app/lib/clubAdminGrantErrors";
import {
  displayNameFromProfile,
  formatPersonName,
} from "@/app/lib/membershipDisplayName";
import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";
import CMSToggle from "@cms/CMSToggle";
import CMSSelect from "@cms/CMSSelect";
import AdminMemberAccountSearch from "@/app/pages/admin/settings/components/AdminMemberAccountSearch";
import { useTranslation } from "@/app/i18n/I18nContext";

const bannerStyle = (kind) => ({
  padding: "12px 16px",
  borderRadius: "6px",
  backgroundColor: kind === "error" ? "#FEE2E2" : kind === "warn" ? "#FEF3C7" : "#DCFCE7",
  color: kind === "error" ? "#991B1B" : kind === "warn" ? "#92400E" : "#166534",
  fontSize: "14px",
});

function mergeAdminRows(grants, profilesById, legacyFullAdminIds) {
  const byUser = new Map();

  (grants || []).forEach((grant) => {
    byUser.set(grant.user_id, {
      userId: grant.user_id,
      grantId: grant.id,
      permissions: normalizeAdminPermissions(grant.permissions),
      legacyFullAdmin: false,
      profile: profilesById[grant.user_id] || null,
    });
  });

  legacyFullAdminIds.forEach((userId) => {
    const existing = byUser.get(userId);
    if (existing) {
      byUser.set(userId, {
        ...existing,
        legacyFullAdmin: true,
        permissions: permissionsFromPreset("full"),
      });
      return;
    }
    byUser.set(userId, {
      userId,
      grantId: null,
      permissions: permissionsFromPreset("full"),
      legacyFullAdmin: true,
      profile: profilesById[userId] || null,
    });
  });

  return Array.from(byUser.values()).sort((a, b) => {
    const nameA = displayNameFromProfile(a.profile, a.profile?.email || "");
    const nameB = displayNameFromProfile(b.profile, b.profile?.email || "");
    return nameA.localeCompare(nameB);
  });
}

export default function ClubAdminGrantsPanel({ focusUserId = null } = {}) {
  const { t } = useTranslation();
  const { club } = useClub();
  const { profile } = useProfile();
  const {
    refreshAdminAccess,
    canManageClubAdmins,
    limitedClubAdminManagement,
  } = useAdminAccess();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const [memberOptions, setMemberOptions] = useState([]);
  const [selectedAddUserId, setSelectedAddUserId] = useState(null);
  const [addPreset, setAddPreset] = useState("content");
  const [addPermissions, setAddPermissions] = useState(() => permissionsFromPreset("content"));
  const [adding, setAdding] = useState(false);

  const [editingUserId, setEditingUserId] = useState(null);
  const [editPreset, setEditPreset] = useState("custom");
  const [editPermissions, setEditPermissions] = useState(emptyAdminPermissions());
  const [savingEdit, setSavingEdit] = useState(false);

  const [removeConfirmUserId, setRemoveConfirmUserId] = useState(null);
  const [removeAcknowledged, setRemoveAcknowledged] = useState(false);
  const [removing, setRemoving] = useState(false);

  const canManage = canManageClubAdmins;
  const limitedMode = limitedClubAdminManagement;

  const presetOptions = useMemo(() => {
    const all = [
      { value: "full", label: t("admin.userSettings.presetFull") },
      { value: "content", label: t("admin.userSettings.presetContent") },
      { value: "events", label: t("admin.userSettings.presetEvents") },
      { value: "custom", label: t("admin.userSettings.presetCustom") },
    ];
    return limitedMode ? all.filter((o) => o.value !== "full") : all;
  }, [t, limitedMode]);

  const permissionLabels = useMemo(
    () => ({
      events: t("admin.userSettings.permEvents"),
      nominations: t("admin.userSettings.permNominations"),
      messages: t("admin.userSettings.permMessages"),
      news: t("admin.userSettings.permNews"),
      membership: t("admin.userSettings.permMembership"),
      drivers: t("admin.userSettings.permDrivers"),
      championships: t("admin.userSettings.permChampionships"),
      settings: t("admin.userSettings.permSettings"),
      archives: t("admin.userSettings.permArchives"),
    }),
    [t]
  );

  const load = useCallback(async () => {
    if (!club?.id) return;
    setLoading(true);
    setError("");
    setStatus("");

    try {
      const { rows: grants, missingTable: tableMissing } = await fetchClubAdminGrantsForClub(
        supabase,
        club.id
      );
      setMissingTable(tableMissing);

      const { data: memberships, error: membershipError } = await supabase
        .from("household_memberships")
        .select("user_id")
        .eq("club_id", club.id)
        .not("user_id", "is", null);

      if (membershipError) {
        setError(membershipError.message);
        setLoading(false);
        return;
      }

      const memberUserIds = (memberships || []).map((m) => m.user_id).filter(Boolean);
      let legacyFullAdminIds = [];
      if (memberUserIds.length) {
        const { data: adminProfiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, role")
          .in("id", memberUserIds)
          .eq("role", "admin");
        if (profileError) {
          setError(profileError.message);
          setLoading(false);
          return;
        }
        legacyFullAdminIds = (adminProfiles || []).map((p) => p.id);
      }

      const grantUserIds = (grants || []).map((g) => g.user_id);
      const allUserIds = Array.from(new Set([...grantUserIds, ...legacyFullAdminIds]));

      let profilesById = {};
      if (allUserIds.length) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, role")
          .in("id", allUserIds);
        if (profilesError) {
          setError(profilesError.message);
          setLoading(false);
          return;
        }
        (profiles || []).forEach((p) => {
          profilesById[p.id] = p;
        });
      }

      let merged = mergeAdminRows(grants, profilesById, legacyFullAdminIds);
      if (focusUserId) {
        merged = merged.filter((row) => row.userId === focusUserId);
      }
      setRows(merged);
    } catch (err) {
      setError(err.message || t("admin.userSettings.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [club?.id, t, focusUserId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (focusUserId) {
      setSelectedAddUserId(focusUserId);
    }
  }, [focusUserId]);

  const loadMemberOptions = useCallback(async () => {
    if (!club?.id) return;
    const { data: memberships, error: membershipError } = await supabase
      .from("household_memberships")
      .select("user_id, email, primary_first_name, primary_last_name")
      .eq("club_id", club.id)
      .not("user_id", "is", null);

    if (membershipError) {
      console.warn("loadMemberOptions", membershipError);
      setMemberOptions([]);
      return;
    }

    const userIds = Array.from(
      new Set((memberships || []).map((row) => row.user_id).filter(Boolean))
    );
    if (!userIds.length) {
      setMemberOptions([]);
      return;
    }

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", userIds);

    if (profileError) {
      console.warn("loadMemberOptions profiles", profileError);
      setMemberOptions([]);
      return;
    }

    const profilesById = {};
    (profiles || []).forEach((p) => {
      profilesById[p.id] = p;
    });

    const options = (memberships || [])
      .filter((row) => row.user_id)
      .map((row) => {
        const profile = profilesById[row.user_id];
        const name =
          displayNameFromProfile(profile, row.email) ||
          formatPersonName(row.primary_first_name, row.primary_last_name);
        const email = (profile?.email || row.email || "").trim();
        return {
          userId: row.user_id,
          name,
          email,
          searchText: [name, email].filter(Boolean).join(" ").toLowerCase(),
        };
      });

    const byUser = new Map();
    options.forEach((opt) => {
      if (!byUser.has(opt.userId)) byUser.set(opt.userId, opt);
    });
    setMemberOptions(
      Array.from(byUser.values()).sort((a, b) =>
        (a.name || a.email).localeCompare(b.name || b.email)
      )
    );
  }, [club?.id]);

  useEffect(() => {
    loadMemberOptions();
  }, [loadMemberOptions]);

  const addableMemberOptions = useMemo(() => {
    const adminIds = new Set(rows.map((row) => row.userId));
    return memberOptions.filter((opt) => !adminIds.has(opt.userId));
  }, [memberOptions, rows]);

  const applyPresetToAdd = (presetId) => {
    setAddPreset(presetId);
    if (presetId === "custom") return;
    setAddPermissions(permissionsFromPreset(presetId));
  };

  const applyPresetToEdit = (presetId) => {
    setEditPreset(presetId);
    if (presetId === "custom") return;
    setEditPermissions(permissionsFromPreset(presetId));
  };

  const permissionKeyDisabled = (key) => limitedMode && key === "settings";

  const toggleAddPermission = (key, checked) => {
    if (permissionKeyDisabled(key)) return;
    setAddPreset("custom");
    setAddPermissions((prev) => ({ ...prev, [key]: checked }));
  };

  const toggleEditPermission = (key, checked) => {
    if (permissionKeyDisabled(key)) return;
    setEditPreset("custom");
    setEditPermissions((prev) => ({ ...prev, [key]: checked }));
  };

  const formatGrantError = (err) => {
    const code = mapClubAdminGrantError(err?.message);
    if (code) return t(`admin.userSettings.${code}`);
    return err?.message || t("admin.userSettings.loadFailed");
  };

  const startEdit = (row) => {
    setEditingUserId(row.userId);
    const preset = detectPresetId(row.permissions);
    setEditPreset(preset);
    setEditPermissions(normalizeAdminPermissions(row.permissions));
    setStatus("");
    setError("");
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditPermissions(emptyAdminPermissions());
  };

  const upsertGrant = async (userId, permissions) => {
    const payload = {
      club_id: club.id,
      user_id: userId,
      permissions: normalizeAdminPermissions(permissions),
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("club_admin_grants")
      .upsert(payload, { onConflict: "club_id,user_id" });

    return upsertError;
  };

  const syncLegacyRole = async (userId, permissions) => {
    if (!isFullProfileAdmin(profile)) return null;
    const makeFull = ADMIN_PERMISSION_KEYS.every((key) => permissions[key]);
    const nextRole = makeFull ? "admin" : "member";
    const { error: roleError } = await supabase
      .from("profiles")
      .update({ role: nextRole })
      .eq("id", userId);
    return roleError;
  };

  const handleAdd = async () => {
    if (!club?.id) return;
    if (!selectedAddUserId) {
      setError(t("admin.userSettings.memberRequired"));
      return;
    }
    if (!hasAnyPermission(addPermissions)) {
      setError(t("admin.userSettings.permissionRequired"));
      return;
    }
    if (limitedMode && addPermissions.settings) {
      setError(t("admin.userSettings.cannotGrantSettings"));
      return;
    }

    setAdding(true);
    setError("");
    setStatus("");

    const upsertError = await upsertGrant(selectedAddUserId, addPermissions);
    if (upsertError) {
      setAdding(false);
      setError(formatGrantError(upsertError));
      return;
    }

    const roleError = await syncLegacyRole(selectedAddUserId, addPermissions);
    if (roleError) {
      setAdding(false);
      setError(roleError.message);
      return;
    }

    setSelectedAddUserId(null);
    applyPresetToAdd("content");
    setAdding(false);
    setStatus(t("admin.userSettings.added"));
    await load();
    await refreshAdminAccess?.();
  };

  const handleSaveEdit = async () => {
    if (!editingUserId || !club?.id) return;
    if (!hasAnyPermission(editPermissions)) {
      setError(t("admin.userSettings.permissionRequired"));
      return;
    }

    setSavingEdit(true);
    setError("");
    setStatus("");

    if (limitedMode && editPermissions.settings) {
      setSavingEdit(false);
      setError(t("admin.userSettings.cannotGrantSettings"));
      return;
    }

    const upsertError = await upsertGrant(editingUserId, editPermissions);
    if (upsertError) {
      setSavingEdit(false);
      setError(formatGrantError(upsertError));
      return;
    }

    const roleError = await syncLegacyRole(editingUserId, editPermissions);
    if (roleError) {
      setSavingEdit(false);
      setError(roleError.message);
      return;
    }

    setSavingEdit(false);
    setStatus(t("admin.userSettings.saved"));
    cancelEdit();
    await load();
    await refreshAdminAccess?.();
  };

  const requestRemove = (row) => {
    if (!row?.userId) return;
    if (row.userId === profile?.id) {
      setError(t("admin.userSettings.cannotRemoveSelf"));
      return;
    }
    if (limitedMode && targetHasProtectedClubAdmin(row)) {
      setError(t("admin.userSettings.cannotModifyProtected"));
      return;
    }
    setRemoveConfirmUserId(row.userId);
    setRemoveAcknowledged(false);
    setError("");
    setStatus("");
  };

  const cancelRemove = () => {
    setRemoveConfirmUserId(null);
    setRemoveAcknowledged(false);
  };

  const confirmRemove = async () => {
    const row = rows.find((r) => r.userId === removeConfirmUserId);
    if (!club?.id || !row?.userId || !removeAcknowledged) return;

    setRemoving(true);
    setError("");
    setStatus("");

    if (row.grantId) {
      const { error: deleteError } = await supabase
        .from("club_admin_grants")
        .delete()
        .eq("id", row.grantId);
      if (deleteError) {
        setRemoving(false);
        setError(formatGrantError(deleteError));
        return;
      }
    }

    if (row.legacyFullAdmin && isFullProfileAdmin(profile)) {
      const { error: roleError } = await supabase
        .from("profiles")
        .update({ role: "member" })
        .eq("id", row.userId);
      if (roleError) {
        setRemoving(false);
        setError(roleError.message);
        return;
      }
    }

    if (editingUserId === row.userId) cancelEdit();
    cancelRemove();
    setRemoving(false);
    setStatus(t("admin.userSettings.removed"));
    await load();
    await refreshAdminAccess?.();
  };

  if (!canManage) {
    return (
      <div style={bannerStyle("error")}>{t("admin.userSettings.accessDenied")}</div>
    );
  }

  const visibleRows = rows;
  const showAddCard = !focusUserId || (focusUserId && visibleRows.length === 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {missingTable ? (
        <div style={bannerStyle("warn")}>{t("admin.userSettings.migrationHint")}</div>
      ) : null}
      {limitedMode ? (
        <div style={bannerStyle("warn")}>{t("admin.userSettings.limitedModeHint")}</div>
      ) : null}
      {error ? <div style={bannerStyle("error")}>{error}</div> : null}
      {status ? <div style={bannerStyle("success")}>{status}</div> : null}

      {showAddCard ? (
      <CMSCard title={t("admin.userSettings.addTitle")}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#6B7280", lineHeight: 1.5 }}>
            {t("admin.userSettings.addHelp")}
          </p>
          {focusUserId ? null : (
            <AdminMemberAccountSearch
              label={t("admin.userSettings.memberSearchLabel")}
              options={addableMemberOptions}
              selectedUserId={selectedAddUserId}
              onSelect={setSelectedAddUserId}
              disabled={adding}
            />
          )}
          <CMSSelect
            label={t("admin.userSettings.presetLabel")}
            value={addPreset}
            onChange={(value) => applyPresetToAdd(value)}
            options={presetOptions}
            sortOptions={false}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            {ADMIN_PERMISSION_KEYS.map((key) => (
              <CMSToggle
                key={`add-${key}`}
                label={permissionLabels[key]}
                checked={addPermissions[key]}
                disabled={permissionKeyDisabled(key)}
                onChange={(checked) => toggleAddPermission(key, checked)}
              />
            ))}
          </div>
          <div>
            <CMSButton variant="primary" onClick={handleAdd} disabled={adding}>
              {adding ? t("admin.userSettings.adding") : t("admin.userSettings.addAdmin")}
            </CMSButton>
          </div>
        </div>
      </CMSCard>
      ) : null}

      <CMSCard title={focusUserId ? t("admin.userSettings.accountAdminTitle") : t("admin.userSettings.listTitle")}>
        {loading ? (
          <p style={{ margin: 0, color: "#6B7280" }}>{t("admin.userSettings.loading")}</p>
        ) : visibleRows.length === 0 ? (
          <p style={{ margin: 0, color: "#6B7280" }}>
            {focusUserId ? t("admin.userSettings.accountNotAdmin") : t("admin.userSettings.empty")}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {visibleRows.map((row) => {
              const protectedAdmin = targetHasProtectedClubAdmin(row);
              const removeBlocked =
                row.userId === profile?.id || (limitedMode && protectedAdmin);
              const name = displayNameFromProfile(row.profile, row.profile?.email || "");
              const email = row.profile?.email || "—";
              const isEditing = editingUserId === row.userId;
              const presetId = detectPresetId(row.permissions);
              const presetLabelKey = {
                full: "admin.userSettings.presetFull",
                content: "admin.userSettings.presetContent",
                events: "admin.userSettings.presetEvents",
                custom: "admin.userSettings.presetCustom",
              }[presetId];
              const presetLabel = t(presetLabelKey);

              return (
                <div
                  key={row.userId}
                  style={{
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    padding: "14px 16px",
                    backgroundColor: "#fff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "12px",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "#111827" }}>{name || email}</div>
                      <div style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>
                        {email}
                      </div>
                      <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "6px" }}>
                        {row.legacyFullAdmin
                          ? t("admin.userSettings.legacyFullBadge")
                          : presetLabel}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {!isEditing && !(limitedMode && protectedAdmin) ? (
                        <CMSButton variant="secondary" onClick={() => startEdit(row)}>
                          {t("admin.common.edit")}
                        </CMSButton>
                      ) : null}
                      <CMSButton
                        variant="secondary"
                        disabled={removeBlocked}
                        onClick={() => requestRemove(row)}
                      >
                        {t("admin.userSettings.remove")}
                      </CMSButton>
                    </div>
                  </div>

                  {isEditing ? (
                    <div
                      style={{
                        marginTop: "16px",
                        paddingTop: "16px",
                        borderTop: "1px solid #E5E7EB",
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                      }}
                    >
                      <CMSSelect
                        label={t("admin.userSettings.presetLabel")}
                        value={editPreset}
                        onChange={(value) => applyPresetToEdit(value)}
                        options={presetOptions}
                        sortOptions={false}
                      />
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: "12px",
                        }}
                      >
                        {ADMIN_PERMISSION_KEYS.map((key) => (
                          <CMSToggle
                            key={`edit-${row.userId}-${key}`}
                            label={permissionLabels[key]}
                            checked={editPermissions[key]}
                            disabled={permissionKeyDisabled(key)}
                            onChange={(checked) => toggleEditPermission(key, checked)}
                          />
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <CMSButton
                          variant="primary"
                          onClick={handleSaveEdit}
                          disabled={savingEdit}
                        >
                          {savingEdit ? t("admin.userSettings.saving") : t("admin.userSettings.save")}
                        </CMSButton>
                        <CMSButton variant="secondary" onClick={cancelEdit}>
                          {t("admin.userSettings.cancel")}
                        </CMSButton>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px",
                        marginTop: "12px",
                      }}
                    >
                      {ADMIN_PERMISSION_KEYS.filter((key) => row.permissions[key]).map((key) => (
                        <span
                          key={`${row.userId}-${key}`}
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "4px 8px",
                            borderRadius: "999px",
                            backgroundColor: "#EFF6FF",
                            color: "#1D4ED8",
                          }}
                        >
                          {permissionLabels[key]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CMSCard>

      {removeConfirmUserId ? (
        <CMSCard title={t("admin.userSettings.removeConfirmTitle")}>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
            {t("admin.userSettings.removeConfirmBody")}
          </p>
          <label
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              fontSize: 13,
              color: "#374151",
              marginBottom: 16,
            }}
          >
            <input
              type="checkbox"
              checked={removeAcknowledged}
              onChange={(e) => setRemoveAcknowledged(e.target.checked)}
            />
            <span>{t("admin.userSettings.removeAcknowledge")}</span>
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <CMSButton
              variant="primary"
              disabled={!removeAcknowledged || removing}
              onClick={confirmRemove}
              style={{ backgroundColor: "#B91C1C", borderColor: "#991B1B" }}
            >
              {removing ? t("admin.userSettings.removing") : t("admin.userSettings.removeConfirm")}
            </CMSButton>
            <CMSButton variant="secondary" onClick={cancelRemove} disabled={removing}>
              {t("admin.userSettings.cancel")}
            </CMSButton>
          </div>
        </CMSCard>
      ) : null}
    </div>
  );
}
