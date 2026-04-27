// src/app/pages/profile/EditMember.jsx

import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import { supabase } from "@/supabaseClient";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

import { IdentificationIcon } from "@heroicons/react/24/solid";

export default function EditMember() {
  const navigate = useNavigate();
  const { memberId } = useParams();
  const { club } = useOutletContext();
  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";
  const clubSlug = club?.slug;

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load member
  useEffect(() => {
    const loadMember = async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("id", memberId)
        .single();

      if (error) {
        console.error("Load member error:", error);
        return;
      }

      setMember(data);
      setLoading(false);
    };

    loadMember();
  }, [memberId]);

  const updateField = (field, value) => {
    setMember((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);

    const { error } = await supabase
      .from("members")
      .update({
        first_name: member.first_name,
        last_name: member.last_name,
        is_junior: member.is_junior,
      })
      .eq("id", member.id);

    setSaving(false);

    if (error) {
      console.error("Save member error:", error);
      alert("Failed to save member.");
      return;
    }

    navigate(`/${clubSlug}/app/profile/drivers`);
  };

  const handleAddAsDriver = async () => {
    const { error } = await supabase.from("drivers").insert({
      member_id: member.id,
      first_name: member.first_name,
      last_name: member.last_name,
      is_junior: member.is_junior,
      club_id: club.id,
    });

    if (error) {
      console.error("Add as driver error:", error);
      alert("Failed to add as driver.");
      return;
    }

    navigate(`/${clubSlug}/app/profile/drivers`);
  };

  const handleDeleteMember = async () => {
    setDeleting(true);

    const { error } = await supabase
      .from("members")
      .delete()
      .eq("id", member.id);

    setDeleting(false);

    if (error) {
      console.error("Delete member error:", error);
      alert("Failed to delete member.");
      return;
    }

    navigate(`/${clubSlug}/app/profile/drivers`);
  };

  if (loading || !member) {
    return (
      <div className="min-h-screen w-full bg-background text-text-base flex justify-center items-center">
        <p className="text-sm text-text-muted">Loading member…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* PAGE HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="w-full mx-auto px-4 py-4 flex items-center gap-2">
          <IdentificationIcon className="h-5 w-5" style={{ color: brand }} />
          <h1 className="text-xl font-semibold tracking-tight">Edit Member</h1>
        </div>
      </section>

      {/* CENTERED CONTENT */}
      <div className="w-full flex justify-center">
        <main className="max-w-3xl w-full px-4 py-10 flex flex-col gap-8">

          {/* EDIT MEMBER CARD */}
          <Card
            className="w-full rounded-xl shadow-sm overflow-hidden p-6 space-y-6 bg-white"
            style={{ border: `2px solid ${brand}` }}
          >
            <Input
              label="First Name"
              value={member.first_name}
              onChange={(e) => updateField("first_name", e.target.value)}
              required
            />

            <Input
              label="Last Name"
              value={member.last_name}
              onChange={(e) => updateField("last_name", e.target.value)}
              required
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={member.is_junior}
                onChange={(e) => updateField("is_junior", e.target.checked)}
              />
              Junior Member
            </label>

            <Button
              onClick={handleSave}
              className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </Card>

          {/* ACTIONS: ADD AS DRIVER + DELETE MEMBER */}
          <Card
            className="p-6 space-y-4 bg-red-50"
            style={{ border: `2px solid ${brand}` }}
          >
            <h3 className="text-lg font-semibold">Member Actions</h3>

            <Button
              onClick={handleAddAsDriver}
              className="w-full py-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              Add as Driver
            </Button>

            <Button
              className="w-full bg-red-600 text-white hover:bg-red-700"
              onClick={handleDeleteMember}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete Member"}
            </Button>

            <Button
              variant="secondary"
              className="w-full"
              onClick={() => navigate(`/${clubSlug}/app/profile/drivers`)}
            >
              Cancel
            </Button>
          </Card>

        </main>
      </div>
    </div>
  );
}
