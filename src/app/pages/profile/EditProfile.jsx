// src/app/pages/profile/EditProfile.jsx

import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";

import { useDrivers } from "@/app/providers/DriverProvider";
import { useMembership } from "@/app/providers/MembershipProvider";
import useTheme from "@/app/providers/useTheme";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageTitle from "@/components/ui/PageTitle";
import { useTranslation } from "@/app/i18n/I18nContext";

import EditDriverProfileCard from "@/components/driver/EditDriverProfileCard";

import { ArrowLeftIcon, PencilSquareIcon } from "@heroicons/react/24/solid";

import { supabase } from "@/supabaseClient";
import {
  removeDriverAvatarFromStorage,
  uploadDriverAvatar,
} from "@/app/lib/driverAvatarStorage";

const INTEGER_DRIVER_FIELDS = ["permanent_number", "year_of_birth", "year_started"];

function buildDriverUpdatePayload(driver) {
  const updatePayload = { ...driver };

  delete updatePayload.id;
  delete updatePayload.created_at;
  delete updatePayload.avatar_file;
  delete updatePayload.avatar_preview_url;
  delete updatePayload.avatar_removed;
  delete updatePayload.avatar_previous_url;

  if (
    typeof updatePayload.avatar_url === "string" &&
    updatePayload.avatar_url.startsWith("blob:")
  ) {
    delete updatePayload.avatar_url;
  }

  for (const field of INTEGER_DRIVER_FIELDS) {
    const value = updatePayload[field];
    if (value === "" || value === undefined) {
      updatePayload[field] = null;
    } else if (value !== null && value !== "") {
      const parsed = Number(value);
      updatePayload[field] = Number.isNaN(parsed) ? null : parsed;
    }
  }

  return updatePayload;
}

export default function EditProfile() {
  const navigate = useNavigate();
  const { club } = useOutletContext();
  const { palette } = useTheme();
  const { t } = useTranslation();
  const brand = palette.primary;

  const { id, clubSlug } = useParams();
  const { drivers, loadingDrivers, refreshDrivers, deleteDriver } = useDrivers();
  const { membership } = useMembership();

  const [driver, setDriver] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [pendingDestination, setPendingDestination] = useState(null);
  const [originalName, setOriginalName] = useState(null);
  const [showNameWarning, setShowNameWarning] = useState(false);

  const [previewNumber, setPreviewNumber] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  // LOAD DRIVER
  useEffect(() => {
    if (!loadingDrivers && drivers?.length > 0) {
      const d = drivers.find((dr) => String(dr.id) === String(id));

      if (dirty) return;

      setDriver(d || null);

      if (d) {
        setOriginalName({
          first_name: d.first_name || "",
          last_name: d.last_name || "",
        });
      }

      if (d?.permanent_number !== undefined) {
        setPreviewNumber(d.permanent_number);
      }
    }
  }, [loadingDrivers, drivers, id, dirty]);

  // UPDATE FIELD
  const update = (field, value) => {
    setDirty(true);
    setDriver((prev) => ({ ...prev, [field]: value }));
  };

  // AVATAR HANDLERS
  const handleAvatarSelect = (file) => {
    if (!file) return;
    setDirty(true);
    const previewUrl = URL.createObjectURL(file);
    setDriver((prev) => {
      if (prev?.avatar_preview_url) {
        URL.revokeObjectURL(prev.avatar_preview_url);
      }
      const previousAvatarUrl =
        prev?.avatar_url && !prev.avatar_url.startsWith("blob:")
          ? prev.avatar_url
          : prev?.avatar_previous_url ?? null;
      return {
        ...prev,
        avatar_file: file,
        avatar_preview_url: previewUrl,
        avatar_url: previewUrl,
        avatar_previous_url: previousAvatarUrl,
        avatar_removed: false,
      };
    });
  };

  const handleRemoveAvatar = () => {
    setDirty(true);
    setDriver((prev) => {
      if (prev?.avatar_preview_url) {
        URL.revokeObjectURL(prev.avatar_preview_url);
      }
      const previousAvatarUrl =
        prev?.avatar_url && !prev.avatar_url.startsWith("blob:")
          ? prev.avatar_url
          : prev?.avatar_previous_url ?? null;
      const next = {
        ...prev,
        avatar_url: null,
        avatar_file: null,
        avatar_previous_url: previousAvatarUrl,
        avatar_removed: true,
      };
      delete next.avatar_preview_url;
      return next;
    });
  };

  const nameChanged =
    originalName &&
    ((driver?.first_name || "") !== originalName.first_name ||
      (driver?.last_name || "") !== originalName.last_name);

  const showLivetimeNameNotice = Boolean(nameChanged);

  // SAVE DRIVER
  const save = async ({ skipNameWarning = false } = {}) => {
    if (!driver || saving) return false;

    if (nameChanged && !skipNameWarning) {
      setShowNameWarning(true);
      return false;
    }

    setSaving(true);
    setSaveError("");

    let savedAvatarUrl;

    try {
      if (driver.avatar_file) {
        const { publicUrl, error: uploadError } = await uploadDriverAvatar(
          supabase,
          {
            driverId: driver.id,
            file: driver.avatar_file,
            previousAvatarUrl: driver.avatar_previous_url,
            clubOrSlug: club?.slug || clubSlug,
          }
        );

        if (uploadError || !publicUrl) {
          const message =
            uploadError?.message || "Could not upload profile photo.";
          setSaveError(message);
          console.error("Failed to upload avatar:", uploadError);
          return false;
        }

        savedAvatarUrl = publicUrl;
      } else if (driver.avatar_removed) {
        savedAvatarUrl = null;
        await removeDriverAvatarFromStorage(
          supabase,
          driver.avatar_previous_url
        );
      }

      const updatePayload = buildDriverUpdatePayload(driver);

      if (savedAvatarUrl !== undefined) {
        updatePayload.avatar_url = savedAvatarUrl;
      }

      const { error } = await supabase
        .from("drivers")
        .update(updatePayload)
        .eq("id", driver.id);

      if (error) {
        setSaveError(error.message || "Could not save driver profile.");
        console.error("Failed to update driver:", error);
        return false;
      }

      if (driver.avatar_preview_url) {
        URL.revokeObjectURL(driver.avatar_preview_url);
      }

      if (savedAvatarUrl !== undefined) {
        setDriver((prev) => {
          const next = { ...prev, avatar_url: savedAvatarUrl };
          delete next.avatar_file;
          delete next.avatar_preview_url;
          delete next.avatar_removed;
          delete next.avatar_previous_url;
          return next;
        });
      } else {
        setDriver((prev) => {
          const next = { ...prev };
          delete next.avatar_file;
          delete next.avatar_preview_url;
          delete next.avatar_removed;
          delete next.avatar_previous_url;
          return next;
        });
      }

      setDirty(false);
      setOriginalName({
        first_name: driver.first_name || "",
        last_name: driver.last_name || "",
      });
      setShowNameWarning(false);
      await refreshDrivers();
      return true;
    } finally {
      setSaving(false);
    }
  };

  // GUARDED NAVIGATION
  const requestNavigate = (to) => {
    if (!dirty) {
      navigate(to);
      return;
    }
    setPendingDestination(to);
    setShowPrompt(true);
  };

  const handleConfirmSave = async () => {
    const saved = await save();
    if (!saved) return;
    const target = pendingDestination ?? null;
    setShowPrompt(false);
    setPendingDestination(null);
    if (target) navigate(target);
  };

  const handleConfirmNameChange = async () => {
    const saved = await save({ skipNameWarning: true });
    if (!saved) return;
    const target = pendingDestination ?? null;
    setShowNameWarning(false);
    setShowPrompt(false);
    setPendingDestination(null);
    if (target) navigate(target);
  };

  const handleDiscard = () => {
    const target = pendingDestination ?? -1;
    setDirty(false);
    setShowPrompt(false);
    setPendingDestination(null);
    navigate(target);
  };

  const handleCancelPrompt = () => {
    setShowPrompt(false);
    setPendingDestination(null);
  };

  // BEFORE UNLOAD
  useEffect(() => {
    const handler = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  if (loadingDrivers) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-text-muted">Loading driver…</p>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card
          className="p-6 max-w-sm w-full text-center text-sm text-text-muted"
        >
          Driver not found.
        </Card>
      </div>
    );
  }

  const isMember = membership && membership.membership_type !== "non_member";

  return (
    <div className="min-h-screen w-full bg-background text-text-base">
      <PageTitle
        icon={PencilSquareIcon}
        title={t("drivers.editTitle")}
        style={{ color: brand }}
        actions={
          <Button
            variant="primary"
            className="!py-1 !px-3 !text-xs !rounded-sm flex items-center gap-1"
            onClick={() =>
              requestNavigate(`/${club.slug}/app/profile/drivers`)
            }
          >
            <ArrowLeftIcon className="h-3 w-3" />
            Back
          </Button>
        }
      />

      {/* MAIN */}
      <main className="app-page-main !py-4">
        <EditDriverProfileCard
          driver={driver}
          update={update}
          isMember={isMember}
          brand={brand}
          club={club}
          navigate={navigate}
          previewNumber={previewNumber}
          setPreviewNumber={setPreviewNumber}
          handleAvatarSelect={handleAvatarSelect}
          handleRemoveAvatar={handleRemoveAvatar}
          save={save}
          saving={saving}
          saveError={saveError}
          deleteDriver={deleteDriver}
          showLivetimeNameNotice={showLivetimeNameNotice}
        />
      </main>

      {showNameWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Card className="p-6 space-y-4 bg-white max-w-sm w-full">
            <h3 className="text-lg font-semibold">Livetime name match</h3>
            <p className="text-sm text-gray-700">
              If this driver has raced with this club before, the name must
              match <strong>exactly</strong> how it appears in Livetime —
              including spelling, spacing, and capitalisation. Any difference
              will be treated as a new racer and previous results or seeding
              will not link.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setShowNameWarning(false)}
              >
                Cancel
              </Button>
              <Button className="w-full" onClick={handleConfirmNameChange}>
                Save anyway
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* UNSAVED CHANGES MODAL */}
      {showPrompt && !showNameWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Card
            className="p-6 space-y-4 bg-white max-w-sm w-full"
          >
            <h3 className="text-lg font-semibold">Unsaved changes</h3>
            <p className="text-sm text-gray-700">
              You have unsaved changes. Save before leaving?
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleCancelPrompt}
              >
                Cancel
              </Button>

              <Button
                variant="danger"
                className="w-full"
                onClick={handleDiscard}
              >
                Discard
              </Button>

              <Button
                className="w-full bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleConfirmSave}
              >
                Save
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
