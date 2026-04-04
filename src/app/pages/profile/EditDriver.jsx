// src/app/pages/profile/EditDriver.jsx

import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import { useMembership } from "@/app/providers/MembershipProvider";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

import { COUNTRIES } from "../../../data/countries";

import DriverProfileCard from "@/components/driver/DriverProfileCard";

import { IdentificationIcon } from "@heroicons/react/24/solid";

export default function EditDriver() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { club } = useOutletContext();
  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const { membership } = useMembership();
  const isMember =
    membership &&
    membership.membership_type &&
    membership.membership_type !== "non_member";

  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ------------------------------------------------------------
  // LOAD DRIVER (UNIFIED TABLE)
  // ------------------------------------------------------------
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setDriver(data);
      setLoading(false);
    }

    load();
  }, [id]);

  // ------------------------------------------------------------
  // UPDATE ANY FIELD IN drivers TABLE
  // ------------------------------------------------------------
  const update = async (field, value) => {
    if (!driver) return;

    console.log("Updating field", field, "value", value, "driver.id", driver.id);


    setDriver((prev) => ({ ...prev, [field]: value }));

    const { error } = await supabase
      .from("drivers")
      .update({ [field]: value })
      .eq("id", driver.id);

    if (error) console.error("Update error:", error);
  };

  // ------------------------------------------------------------
  // PHONETIC NAME
  // ------------------------------------------------------------
  const generatePhoneticName = (d) => {
    const num = d.permanent_number ? d.permanent_number.toString() : "";
    const first = d.first_name?.trim() || "";
    const last = d.last_name?.trim() || "";

    if (num) return `${num} ${first} ${last}`.trim();
    return `${first} ${last}`.trim();
  };

  // ------------------------------------------------------------
  // AVATAR UPLOAD + CROP
  // ------------------------------------------------------------
  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    update("avatar_url", previewUrl);

    const croppedBlob = await cropToSquare(file);
    await uploadAvatarBlob(croppedBlob);
  };

  const cropToSquare = (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(
          img,
          (img.width - size) / 2,
          (img.height - size) / 2,
          size,
          size,
          0,
          0,
          size,
          size
        );

        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadAvatarBlob = async (blob) => {
    const fileName = `${driver.id}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("driver-avatars")
      .upload(fileName, blob, {
        upsert: true,
        contentType: "image/jpeg",
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("driver-avatars")
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    await update("avatar_url", publicUrl);
  };

  const handleRemoveAvatar = async () => {
    const fileName = `${driver.id}.jpg`;

    await supabase.storage.from("driver-avatars").remove([fileName]);

    await update("avatar_url", null);
  };

  // ------------------------------------------------------------
  // SAVE DRIVER (ONLY DRIVER FIELDS)
  // ------------------------------------------------------------
  async function save() {
    if (!driver) return;

    setSaving(true);

    const phonetic = generatePhoneticName(driver);

    const { error } = await supabase
  .from("drivers")
  .update({
    first_name: driver.first_name,
    last_name: driver.last_name,
    gender: driver.gender,
    country: driver.country,
    permanent_number: driver.permanent_number,
  })
  .eq("id", id);


    if (error) console.error("Save error:", error);

    setSaving(false);
    navigate(-1);
  }

  // ------------------------------------------------------------
  // LOADING GUARD
  // ------------------------------------------------------------
  if (loading || !driver) {
    return <div className="p-6 text-center text-gray-600">Loading…</div>;
  }

  // ------------------------------------------------------------
  // LIVE PREVIEW COLORS
  // ------------------------------------------------------------
  const primaryColor = driver.primary_color || "#000000";
  const secondaryColor = driver.secondary_color || "#ffffff";
  const previewNumber =
    driver.permanent_number !== null && driver.permanent_number !== undefined
      ? driver.permanent_number
      : "";

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2">
          <IdentificationIcon className="h-5 w-5" style={{ color: brand }} />
          <h1 className="text-xl font-semibold tracking-tight">Edit Driver</h1>
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-10">

        {/* BASIC INFO CARD */}
        <Card
          className="p-0"
          style={{
            border: `2px solid ${brand}`,
            borderRadius: "14px",
            padding: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              backgroundColor: brand,
              color: "white",
              padding: "20px 24px",
              fontWeight: 600,
              fontSize: "1.1rem",
            }}
          >
            Basic Info
          </div>

          <div style={{ backgroundColor: "white", padding: "24px" }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={driver.first_name || ""}
                onChange={(e) => update("first_name", e.target.value)}
              />

              <Input
                label="Last Name"
                value={driver.last_name || ""}
                onChange={(e) => update("last_name", e.target.value)}
              />

              <Input
                label="Nickname"
                value={driver.nickname || ""}
                onChange={(e) => update("nickname", e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium mb-1">Gender</label>
                <select
                  value={driver.gender || ""}
                  onChange={(e) => update("gender", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-sm"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-Binary">Non-Binary</option>
                  <option value="Prefer Not To Say">Prefer Not To Say</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <select
                  value={driver.country || ""}
                  onChange={(e) => update("country", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-sm"
                >
                  <option value="">Select country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* FULL DRIVER PROFILE CARD */}
        <DriverProfileCard
          driver={driver}
          update={update}
          isMember={isMember}
          brand={brand}
          navigate={navigate}
          club={club}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          previewNumber={previewNumber}
          handleAvatarSelect={handleAvatarSelect}
          handleRemoveAvatar={handleRemoveAvatar}
        />

        {!isMember && (
          <Card className="p-6 space-y-4 bg-blue-50 border border-blue-200">
            <h3 className="font-semibold text-blue-700">
              Become a Member to Unlock Full Driver Profile
            </h3>
            <p className="text-sm text-blue-700">
              Members can set permanent numbers, car details, sponsors, team
              info, and more.
            </p>
            <Button
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => navigate(`/${club.slug}/app/membership`)}
            >
              Join as a Member
            </Button>
          </Card>
        )}

        <Button
          className={`w-full py-3 ${
            isMember
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-300 text-gray-600 cursor-not-allowed"
          }`}
          disabled={!isMember || saving}
          onClick={save}
        >
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </main>
    </div>
  );
}
