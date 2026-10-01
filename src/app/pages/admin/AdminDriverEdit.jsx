import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuth } from "@/app/providers/AuthProvider";
import { useClub } from "@/app/providers/ClubProvider";
import { displayNameFromMembershipRow } from "@/app/lib/membershipDisplayName";
import {
  linkDriverHousehold,
  syncDriverNameToClubMember,
} from "@/app/lib/syncClubMembers";
import {
  removeDriverAvatarFromStorage,
  uploadDriverAvatar,
} from "@/app/lib/driverAvatarStorage";
import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";
import CMSInput from "@cms/CMSInput";
import CMSSelect from "@cms/CMSSelect";
import CMSToggle from "@cms/CMSToggle";
import CMSColorPicker from "@cms/CMSColorPicker";
import CMSImageUpload from "@cms/CMSImageUpload";
import { cmsStyles } from "@cms/styles";
import { cmsLayout } from "@cms/layout";
import { useTranslation } from "@/app/i18n/I18nContext";

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Non-Binary", label: "Non-Binary" },
  { value: "Prefer Not To Say", label: "Prefer not to say" },
];

const emptyDriver = {
  first_name: "",
  last_name: "",
  nickname: "",
  is_junior: false,
  membership_id: "",
  permanent_number: "",
  primary_color: "#000000",
  secondary_color: "#ffffff",
  year_of_birth: "",
  hometown: "",
  gender: "",
  country: "",
  occupation: "",
  avatar_url: "",
};

function toIntOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

async function unassignDriverNumber(clubId, driverId) {
  await supabase
    .from("numbers")
    .update({
      status: "available",
      assigned_to_driver: null,
      assigned_driver_name: null,
      assigned_driver_email: null,
    })
    .eq("club_id", clubId)
    .eq("assigned_to_driver", driverId);

  return supabase.from("drivers").update({ permanent_number: null }).eq("id", driverId);
}

export default function AdminDriverEdit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { clubSlug, id } = useParams();
  const { club } = useClub();
  const { user } = useAuth();
  const isNew = !id || id === "new";

  const [driver, setDriver] = useState(emptyDriver);
  const [originalMembershipId, setOriginalMembershipId] = useState(null);
  const [originalNumber, setOriginalNumber] = useState("");
  const [originalName, setOriginalName] = useState({ first_name: "", last_name: "" });
  const [households, setHouseholds] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const householdOptions = [
    { value: "none", label: "No household" },
    ...households.map((row) => {
      const name = displayNameFromMembershipRow(row);
      const email = (row.email || "").trim();
      const label =
        email && name.toLowerCase() !== email.toLowerCase()
          ? `${name} (${email})`
          : name;
      return { value: row.id, label };
    }),
  ];

  async function loadHouseholds() {
    if (!club?.id) return;
    const { data } = await supabase
      .from("household_memberships")
      .select("id, email, primary_first_name, primary_last_name, membership_type, status")
      .eq("club_id", club.id)
      .order("primary_last_name", { ascending: true })
      .order("primary_first_name", { ascending: true });
    setHouseholds(data || []);
  }

  async function loadExisting() {
    if (!id || isNew) return;
    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (loadError || !data) {
      setError(loadError?.message || "Driver not found.");
      setLoading(false);
      return;
    }

    setDriver({
      ...emptyDriver,
      ...data,
      membership_id: data.membership_id || "",
      permanent_number: data.permanent_number ?? "",
      year_of_birth: data.year_of_birth ?? "",
      nickname: data.nickname || "",
      hometown: data.hometown || "",
      gender: data.gender || "",
      country: data.country || "",
      occupation: data.occupation || "",
      avatar_url: data.avatar_url || "",
      primary_color: data.primary_color || "#000000",
      secondary_color: data.secondary_color || "#ffffff",
    });
    setOriginalMembershipId(data.membership_id || null);
    setOriginalNumber(data.permanent_number == null ? "" : String(data.permanent_number));
    setOriginalName({
      first_name: data.first_name || "",
      last_name: data.last_name || "",
    });
    setAvatarFile(null);
    setAvatarRemoved(false);
    setLoading(false);
  }

  useEffect(() => {
    loadHouseholds();
  }, [club?.id]);

  useEffect(() => {
    if (isNew) {
      setDriver(emptyDriver);
      setOriginalMembershipId(null);
      setOriginalNumber("");
      setOriginalName({ first_name: "", last_name: "" });
      setAvatarFile(null);
      setAvatarRemoved(false);
      setLoading(false);
      setError("");
      setStatus("");
      return;
    }
    loadExisting();
  }, [id]);

  const update = (field, value) => {
    setDriver((prev) => ({ ...prev, [field]: value }));
  };

  async function nameIsTaken(firstName, lastName, excludeId) {
    let query = supabase
      .from("drivers")
      .select("id")
      .eq("club_id", club.id)
      .eq("first_name", firstName)
      .eq("last_name", lastName)
      .limit(1);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error: lookupError } = await query;
    if (lookupError) throw lookupError;
    return (data || []).length > 0;
  }

  async function applyNumber(driverId, nextNumber, firstName, lastName) {
    const current = String(originalNumber ?? "");
    const next = nextNumber === "" || nextNumber === null || nextNumber === undefined
      ? ""
      : String(nextNumber);

    if (next === current) return { error: null };

    if (next === "") {
      const { error: clearError } = await unassignDriverNumber(club.id, driverId);
      return { error: clearError };
    }

    const parsed = Number(next);
    if (Number.isNaN(parsed)) {
      return { error: { message: "Permanent number must be a number." } };
    }

    const { error: rpcError } = await supabase.rpc("assign_number", {
      p_club_id: club.id,
      p_driver_id: driverId,
      p_number: parsed,
    });
    if (rpcError) return { error: rpcError };

    await supabase
      .from("numbers")
      .update({
        assigned_driver_name: `${firstName} ${lastName}`.trim(),
      })
      .eq("club_id", club.id)
      .eq("assigned_to_driver", driverId);

    return { error: null };
  }

  async function handleSave() {
    if (!club?.id) return;
    const firstName = (driver.first_name || "").trim();
    const lastName = (driver.last_name || "").trim();
    if (!firstName || !lastName) {
      setError("First and last name are required.");
      return;
    }

    setSaving(true);
    setError("");
    setStatus("");

    try {
      if (await nameIsTaken(firstName, lastName, isNew ? null : id)) {
        setError(
          "This first and last name already exists at this club. LiveTime requires unique names."
        );
        setSaving(false);
        return;
      }

      const membershipId =
        !driver.membership_id || driver.membership_id === "none"
          ? null
          : driver.membership_id;

      const payload = {
        club_id: club.id,
        first_name: firstName,
        last_name: lastName,
        nickname: (driver.nickname || "").trim() || null,
        is_junior: !!driver.is_junior,
        membership_id: membershipId,
        primary_color: driver.primary_color || "#000000",
        secondary_color: driver.secondary_color || "#ffffff",
        year_of_birth: toIntOrNull(driver.year_of_birth),
        hometown: (driver.hometown || "").trim() || null,
        gender: driver.gender || null,
        country: (driver.country || "").trim() || null,
        occupation: (driver.occupation || "").trim() || null,
      };

      let driverId = id;

      if (isNew) {
        const { data, error: insertError } = await supabase
          .from("drivers")
          .insert({
            ...payload,
            created_by: user?.id || null,
          })
          .select("id")
          .single();

        if (insertError) {
          setError(insertError.message || "Could not create driver.");
          setSaving(false);
          return;
        }
        driverId = data.id;
      } else {
        const { error: updateError } = await supabase
          .from("drivers")
          .update(payload)
          .eq("id", id);

        if (updateError) {
          setError(updateError.message || "Could not save driver.");
          setSaving(false);
          return;
        }
      }

      if (avatarFile) {
        const { publicUrl, error: uploadError } = await uploadDriverAvatar(supabase, {
          driverId,
          file: avatarFile,
          previousAvatarUrl: driver.avatar_url,
          clubOrSlug: club.slug || clubSlug,
        });
        if (uploadError || !publicUrl) {
          setError(uploadError?.message || "Could not upload photo.");
          setSaving(false);
          return;
        }
        await supabase.from("drivers").update({ avatar_url: publicUrl }).eq("id", driverId);
      } else if (avatarRemoved && driver.avatar_url) {
        await removeDriverAvatarFromStorage(supabase, driver.avatar_url);
        await supabase.from("drivers").update({ avatar_url: null }).eq("id", driverId);
      }

      const { error: numberError } = await applyNumber(
        driverId,
        driver.permanent_number,
        firstName,
        lastName
      );
      if (numberError) {
        setError(numberError.message || "Could not assign that number.");
        if (isNew) {
          navigate(`/${clubSlug}/app/admin/drivers/${driverId}`, { replace: true });
        }
        setSaving(false);
        return;
      }

      const { error: linkError } = await linkDriverHousehold(supabase, {
        driverId,
        previousMembershipId: originalMembershipId,
        nextMembershipId: membershipId,
      });
      if (linkError) {
        setError(linkError.message || "Could not link household.");
        setSaving(false);
        return;
      }

      await syncDriverNameToClubMember(supabase, {
        id: driverId,
        first_name: firstName,
        last_name: lastName,
        is_junior: !!driver.is_junior,
      });

      if (isNew) {
        navigate(`/${clubSlug}/app/admin/drivers/${driverId}`, { replace: true });
        return;
      }

      setOriginalMembershipId(membershipId);
      setOriginalNumber(
        driver.permanent_number === "" || driver.permanent_number == null
          ? ""
          : String(driver.permanent_number)
      );
      setOriginalName({ first_name: firstName, last_name: lastName });
      setAvatarFile(null);
      setAvatarRemoved(false);
      setStatus("Driver saved.");
      await loadExisting();
    } catch (err) {
      setError(err.message || "Could not save driver.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (isNew) return;
    const confirmed = window.confirm(
      `Delete ${driver.first_name} ${driver.last_name}? This cannot be undone. Household members stay, without this driver profile.`
    );
    if (!confirmed) return;

    setSaving(true);
    setError("");

    await linkDriverHousehold(supabase, {
      driverId: id,
      previousMembershipId: originalMembershipId,
      nextMembershipId: null,
    });
    await unassignDriverNumber(club.id, id);
    if (driver.avatar_url) {
      await removeDriverAvatarFromStorage(supabase, driver.avatar_url);
    }
    const { error: deleteError } = await supabase.from("drivers").delete().eq("id", id);
    setSaving(false);
    if (deleteError) {
      setError(deleteError.message || "Could not delete driver.");
      return;
    }
    navigate(`/${clubSlug}/app/admin/drivers`);
  }

  if (loading) {
    return (
      <div style={cmsStyles.pageContainer}>
        <div style={cmsStyles.pageContent}>
          <p style={{ color: "#6B7280" }}>Loading driver…</p>
        </div>
      </div>
    );
  }

  const nameChanged =
    !isNew &&
    ((driver.first_name || "") !== originalName.first_name ||
      (driver.last_name || "") !== originalName.last_name);

  return (
    <div style={cmsStyles.pageContainer}>
      <div style={cmsStyles.pageContent}>
        <div style={cmsStyles.sectionHeaderWithActions}>
          <header style={cmsStyles.sectionHeader}>
            <h1 style={cmsStyles.sectionHeaderTitle}>
              {isNew ? "Add driver" : "Edit driver"}
            </h1>
            <p style={cmsStyles.sectionHeaderSubtitle}>
              Driver identity, number, and household.
            </p>
          </header>
          <CMSButton
            variant="secondary"
            onClick={() => navigate(`/${clubSlug}/app/admin/drivers`)}
          >
            ← Back
          </CMSButton>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 6,
              backgroundColor: "#FEE2E2",
              color: "#991B1B",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}
        {status && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 6,
              backgroundColor: "#DCFCE7",
              color: "#166534",
              fontSize: 14,
            }}
          >
            {status}
          </div>
        )}

        <CMSCard title="Driver">
          <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 8 }}>
            <CMSImageUpload
              label="Photo"
              value={driver.avatar_url || ""}
              filePreview={avatarFile}
              onChange={(file) => {
                if (file) {
                  setAvatarFile(file);
                  setAvatarRemoved(false);
                } else {
                  setAvatarFile(null);
                  setAvatarRemoved(true);
                  update("avatar_url", "");
                }
              }}
            />

            <div style={cmsLayout.row}>
              <div style={cmsLayout.column}>
                <CMSInput
                  label="First name"
                  value={driver.first_name}
                  onChange={(value) => update("first_name", value)}
                />
              </div>
              <div style={cmsLayout.column}>
                <CMSInput
                  label="Last name"
                  value={driver.last_name}
                  onChange={(value) => update("last_name", value)}
                />
              </div>
            </div>

            {nameChanged && (
              <p style={{ ...cmsLayout.muted, color: "#92400E" }}>
                LiveTime matches names exactly. Changing spelling, spacing, or capitalisation
                creates a new racer and previous results will not link.
              </p>
            )}

            <div style={cmsLayout.row}>
              <div style={cmsLayout.column}>
                <CMSInput
                  label="Nickname"
                  value={driver.nickname || ""}
                  onChange={(value) => update("nickname", value)}
                />
              </div>
              <div style={cmsLayout.column}>
                <CMSInput
                  label="Permanent number"
                  type="number"
                  value={driver.permanent_number ?? ""}
                  onChange={(value) => update("permanent_number", value)}
                />
              </div>
            </div>

            <CMSToggle
              label="Junior"
              checked={!!driver.is_junior}
              onChange={(checked) => update("is_junior", checked)}
            />

            <CMSSelect
              label="Household"
              value={driver.membership_id || "none"}
              onChange={(value) => update("membership_id", value)}
              options={householdOptions}
              sortOptions={false}
            />

            {driver.membership_id && driver.membership_id !== "none" && (
              <div>
                <CMSButton
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    navigate(`/${clubSlug}/app/admin/membership/${driver.membership_id}`)
                  }
                >
                  Open household
                </CMSButton>
              </div>
            )}

            <div style={cmsLayout.row}>
              <div style={cmsLayout.column}>
                <CMSColorPicker
                  label="Primary colour"
                  value={driver.primary_color || "#000000"}
                  onChange={(value) => update("primary_color", value)}
                />
              </div>
              <div style={cmsLayout.column}>
                <CMSColorPicker
                  label="Secondary colour"
                  value={driver.secondary_color || "#ffffff"}
                  onChange={(value) => update("secondary_color", value)}
                />
              </div>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 8,
                  backgroundColor: driver.primary_color || "#000000",
                  border: `3px solid ${driver.secondary_color || "#ffffff"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: driver.secondary_color || "#ffffff",
                  fontWeight: 700,
                  fontSize: 22,
                  alignSelf: "flex-end",
                }}
              >
                {driver.permanent_number || "—"}
              </div>
            </div>

            <div style={cmsLayout.row}>
              <div style={cmsLayout.column}>
                <CMSSelect
                  label="Gender"
                  value={driver.gender || ""}
                  onChange={(value) => update("gender", value)}
                  options={GENDER_OPTIONS}
                  sortOptions={false}
                  placeholder="Not set"
                />
              </div>
              <div style={cmsLayout.column}>
                <CMSInput
                  label="Country"
                  value={driver.country || ""}
                  onChange={(value) => update("country", value)}
                />
              </div>
            </div>

            <div style={cmsLayout.row}>
              <div style={cmsLayout.column}>
                <CMSInput
                  label="Year of birth"
                  type="number"
                  value={driver.year_of_birth ?? ""}
                  onChange={(value) => update("year_of_birth", value)}
                />
              </div>
              <div style={cmsLayout.column}>
                <CMSInput
                  label="Hometown"
                  value={driver.hometown || ""}
                  onChange={(value) => update("hometown", value)}
                />
              </div>
            </div>

            <CMSInput
              label="Occupation"
              value={driver.occupation || ""}
              onChange={(value) => update("occupation", value)}
            />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <CMSButton type="button" disabled={saving} onClick={handleSave}>
                {saving ? "Saving…" : isNew ? "Create driver" : "Save driver"}
              </CMSButton>
              {!isNew && (
                <CMSButton type="button" variant="secondary" onClick={handleDelete}>
                  Delete driver
                </CMSButton>
              )}
            </div>
          </div>
        </CMSCard>
      </div>
    </div>
  );
}
