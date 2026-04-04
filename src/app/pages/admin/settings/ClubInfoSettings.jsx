// src/app/pages/admin/settings/ClubInfoSettings.jsx

import { useState, useEffect } from "react";
import { useClub } from "@/app/providers/ClubProvider";
import { supabase } from "@/supabaseClient";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import { InformationCircleIcon } from "@heroicons/react/24/solid";

export default function ClubInfoSettings() {
  return <div>Club Info Settings</div>;
  const { club, refreshClub } = useClub();

  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");

  /* ===========================
     LOAD EXISTING CLUB INFO
     =========================== */
  useEffect(() => {
    if (!club) return;

    setName(club.name || "");
    setShortName(club.short_name || "");
    setEmail(club.contact_email || "");
    setWebsite(club.website || "");
    setDescription(club.description || "");
  }, [club]);

  /* ===========================
     SAVE CLUB INFO
     =========================== */
  async function handleSave() {
    if (!club?.id) return;

    setSaving(true);

    const { error } = await supabase
      .from("clubs")
      .update({
        name,
        short_name: shortName,
        contact_email: email,
        website,
        description,
      })
      .eq("id", club.id);

    setSaving(false);

    if (!error) {
      refreshClub(); // reload club context
      alert("Club information updated.");
    } else {
      alert("Error saving club info.");
    }
  }

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-2">
          <InformationCircleIcon className="h-5 w-5" style={{ color: brand }} />
          <h1 className="text-xl font-semibold tracking-tight">Club Information</h1>
        </div>
      </section>

      {/* MAIN */}
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">

        <Card
          className="rounded-xl shadow-sm overflow-hidden !p-0"
          style={{ border: `2px solid ${brand}`, background: "white" }}
        >
          {/* BLUE HEADER BAR */}
          <div
            className="px-5 py-3"
            style={{ background: brand, color: "white" }}
          >
            <h2 className="text-base font-semibold">General Information</h2>
          </div>

          {/* FORM */}
          <div className="p-6 space-y-6">

            {/* Club Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Club Name</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Short Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Short Name</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
              />
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-sm font-medium mb-1">Contact Email</label>
              <input
                type="email"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium mb-1">Website</label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="w-full rounded-md border border-gray-300 px-3 py-2 h-32"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* SAVE BUTTON */}
            <div className="pt-4">
              <Button
                className="!rounded-lg !py-3 px-6 text-white font-medium"
                style={{ background: brand }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>

          </div>
        </Card>

      </main>
    </div>
  );
}
