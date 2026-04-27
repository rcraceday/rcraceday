// src/app/pages/profile/EditProfile.jsx

import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";

import { useDrivers } from "@/app/providers/DriverProvider";
import { useMembership } from "@/app/providers/MembershipProvider";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import EditDriverProfileCard from "@/components/driver/EditDriverProfileCard";

import { PencilSquareIcon } from "@heroicons/react/24/solid";

import { supabase } from "@/supabaseClient";

export default function EditProfile() {
  const navigate = useNavigate();
  const { club } = useOutletContext();
  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const { id } = useParams();
  const { drivers, loadingDrivers, refreshDrivers, deleteDriver } = useDrivers();
  const { membership } = useMembership();

  const [driver, setDriver] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [pendingDestination, setPendingDestination] = useState(null);

  const [previewNumber, setPreviewNumber] = useState(null);

  // LOAD DRIVER
  useEffect(() => {
    if (!loadingDrivers && drivers?.length > 0) {
      const d = drivers.find((dr) => String(dr.id) === String(id));
      setDriver(d || null);

      if (d?.permanent_number !== undefined) {
        setPreviewNumber(d.permanent_number);
      }
    }
  }, [loadingDrivers, drivers, id]);

  // UPDATE FIELD
  const update = (field, value) => {
    setDirty(true);
    setDriver((prev) => ({ ...prev, [field]: value }));
  };

  // AVATAR HANDLERS
  const handleAvatarSelect = (file) => {
    setDirty(true);
    update("avatar_file", file);
  };

  const handleRemoveAvatar = () => {
    setDirty(true);
    update("avatar_url", null);
  };

  // SAVE DRIVER
  const save = async () => {
    if (!driver) return;

    const updatePayload = { ...driver };
    delete updatePayload.avatar_file;

    const { error } = await supabase
      .from("drivers")
      .update(updatePayload)
      .eq("id", driver.id);

    if (error) {
      console.error("Failed to update driver:", error);
      return;
    }

    if (driver.avatar_file) {
      const file = driver.avatar_file;
      const filePath = `avatars/${driver.id}-${Date.now()}`;

      const { error: uploadError } = await supabase.storage
        .from("driver-avatars")
        .upload(filePath, file, { upsert: true });

      if (!uploadError) {
        const { data: publicUrl } = supabase.storage
          .from("driver-avatars")
          .getPublicUrl(filePath);

        await supabase
          .from("drivers")
          .update({ avatar_url: publicUrl.publicUrl })
          .eq("id", driver.id);
      }
    }

    setDirty(false);
    refreshDrivers();
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
    const target = pendingDestination ?? null;
    setShowPrompt(false);
    setPendingDestination(null);
    await save();
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
          style={{ border: `2px solid ${brand}` }}
        >
          Driver not found.
        </Card>
      </div>
    );
  }

  const isMember = membership && membership.membership_type !== "non_member";

  return (
    <div className="min-h-screen w-full bg-background text-text-base">
<section className="w-full border-b border-surfaceBorder bg-surface">
  <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
<div className="flex items-center gap-2">
  <PencilSquareIcon className="w-5 h-5" style={{ color: brand }} />
  <h1 className="text-xl font-semibold tracking-tight">
    Edit Driver Profile
  </h1>
</div>

    <Button
      variant="secondary"
      className="!py-1 !px-3 !text-xs !rounded-sm"
      onClick={() =>
        requestNavigate(`/${club.slug}/app/profile/drivers`)
      }
    >
      Back
    </Button>
  </div>
</section>

      {/* MAIN */}
      <main className="max-w-[720px] mx-auto px-4 py-4">
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
          deleteDriver={deleteDriver}
        />
      </main>

      {/* UNSAVED CHANGES MODAL */}
      {showPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <Card
            className="p-6 space-y-4 bg-white max-w-sm w-full"
            style={{ border: `2px solid ${brand}` }}
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
