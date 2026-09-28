// src/app/pages/admin/settings/TrackEditor.jsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useClub } from "@/app/providers/ClubProvider";
import { supabase } from "@/supabaseClient";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

import {
  ArrowLeftIcon,
  TrashIcon,
  CheckIcon,
} from "@heroicons/react/24/solid";

import { toast } from "react-hot-toast";

export default function TrackEditor({ mode }) {
  const navigate = useNavigate();
  const { clubSlug, trackId } = useParams();
  const { club } = useClub();

  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const isEdit = mode === "edit";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(isEdit);

  /* LOAD EXISTING TRACK */
  useEffect(() => {
    if (!isEdit || !trackId) return;

    async function loadTrack() {
      const { data, error } = await supabase
        .from("tracks")
        .select("*")
        .eq("id", trackId)
        .maybeSingle();

      if (error) {
        console.error(">>> loadTrack error", error);
        toast.error("Error loading track");
        return;
      }

      if (data) {
        setName(data.name || "");
        setDescription(data.description || "");
      }

      setLoading(false);
    }

    loadTrack();
  }, [isEdit, trackId]);

  /* SAVE TRACK */
  async function saveTrack() {
    if (!name.trim()) {
      toast.error("Track name is required");
      return;
    }

    if (isEdit) {
      const { error } = await supabase
        .from("tracks")
        .update({ name, description })
        .eq("id", trackId);

      if (error) {
        console.error(">>> update track error", error);
        toast.error("Error updating track");
        return;
      }
    } else {
      const { error } = await supabase.from("tracks").insert({
        club_id: club.id,
        name,
        description,
      });

      if (error) {
        console.error(">>> create track error", error);
        toast.error("Error creating track");
        return;
      }
    }

    toast.success("Track saved");
    navigate(`/${clubSlug}/app/admin/settings/classes`);
  }

  /* DELETE TRACK */
  async function deleteTrack() {
    if (!confirm("Delete this track?")) return;

    const { error } = await supabase
      .from("tracks")
      .delete()
      .eq("id", trackId);

    if (error) {
      console.error(">>> delete track error", error);
      toast.error("Error deleting track");
      return;
    }

    toast.success("Track deleted");
    navigate(`/${clubSlug}/app/admin/settings/classes`);
  }

  return (
    <div className="min-h-screen w-full bg-background text-text-base">

      {/* PAGE HEADER */}
      <section className="w-full border-b border-surfaceBorder bg-surface">
        <div className="w-full max-w-[720px] mx-auto px-4 py-4 flex items-center gap-2">
          <ArrowLeftIcon
            className="h-5 w-5 cursor-pointer"
            style={{ color: brand }}
            onClick={() =>
              navigate(`/${clubSlug}/app/admin/settings/classes`)
            }
          />
          <h1 className="text-xl font-semibold tracking-tight">
            {isEdit ? "Edit Track" : "Add Track"}
          </h1>
        </div>
      </section>

      {/* MAIN */}
      <main className="app-page-main space-y-10">

        <Card
          className="rounded-xl shadow-sm overflow-hidden !p-0 !pt-0"
          style={{ border: `2px solid ${brand}`, background: "white" }}
        >
          {/* BLUE HEADER BAR */}
          <div
            className="px-5 py-3"
            style={{ background: brand, color: "white" }}
          >
            <h2 className="text-base font-semibold">
              {isEdit ? "Edit Track" : "Create New Track"}
            </h2>
          </div>

          {/* BODY */}
          <div className="p-5 space-y-6">

            <Input
              label="Track Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Offroad, Onroad, Oval"
            />

            <Input
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />

            <div className="flex justify-between items-center pt-4">

              {isEdit ? (
                <Button
                  className="!rounded-lg !py-3 !px-4 bg-red-600 text-white flex items-center gap-2"
                  onClick={deleteTrack}
                >
                  <TrashIcon className="w-5 h-5 text-white" />
                  Delete
                </Button>
              ) : (
                <div />
              )}

              <Button
                className="!rounded-lg !py-3 !px-4 text-white font-medium flex items-center gap-2"
                style={{ background: brand }}
                onClick={saveTrack}
              >
                <CheckIcon className="w-5 h-5 text-white" />
                Save
              </Button>
            </div>

          </div>
        </Card>

      </main>
    </div>
  );
}
