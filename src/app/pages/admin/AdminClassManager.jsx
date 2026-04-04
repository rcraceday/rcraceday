// =========================
// 1. IMPORTS
// =========================

import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient";
import { useParams } from "react-router-dom";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import SortableItem from "@/components/ui/SortableItem";

import {
  InformationCircleIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import { useClub } from "@/app/providers/ClubProvider";

// =========================
// 2. COMPONENT
// =========================

export default function AdminClassManager() {
  const { clubSlug } = useParams();
  const { club } = useClub();
  const brand = club?.theme?.hero?.backgroundColor || "#0A66C2";

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [tooltipId, setTooltipId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // ===========================
  // LOAD CLUB CLASSES
  // ===========================

  useEffect(() => {
    async function loadClasses() {
      setLoading(true);

      const { data, error } = await supabase
        .from("club_classes")
        .select("*")
        .eq("club_id", club.id)
        .order("order_index", { ascending: true });

      if (!error && data) setClasses(data);

      setLoading(false);
    }

    if (club?.id) loadClasses();
  }, [club]);

  // ===========================
  // SAVE CLASS (ADD OR EDIT)
  // ===========================

  async function saveClass() {
    if (!name.trim()) return;

    if (editingClass) {
      await supabase
        .from("club_classes")
        .update({
          name,
          description,
        })
        .eq("id", editingClass.id);
    } else {
      await supabase.from("club_classes").insert({
        club_id: club.id,
        name,
        description,
        order_index: classes.length + 1, // 1-based
      });
    }

    setShowForm(false);
    setEditingClass(null);
    setName("");
    setDescription("");

    const { data } = await supabase
      .from("club_classes")
      .select("*")
      .eq("club_id", club.id)
      .order("order_index", { ascending: true });

    setClasses(data);
  }

  // ===========================
  // DELETE CLASS
  // ===========================

  async function deleteClass(cls) {
    const confirmDelete = window.confirm(
      `Delete "${cls.name}"?\n\nThis will permanently delete this class from your club.\nIt will also remove this class from all future events.\n\nThis action cannot be undone.`
    );

    if (!confirmDelete) return;

    await supabase.from("club_classes").delete().eq("id", cls.id);

    const { data } = await supabase
      .from("club_classes")
      .select("*")
      .eq("club_id", club.id)
      .order("order_index", { ascending: true });

    setClasses(data);
  }

  // ===========================
  // DRAG & DROP REORDER
  // ===========================

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = classes.findIndex((c) => c.id === active.id);
    const newIndex = classes.findIndex((c) => c.id === over.id);

    const newOrder = arrayMove(classes, oldIndex, newIndex);
    setClasses(newOrder);

    await Promise.all(
      newOrder.map((cls, index) =>
        supabase
          .from("club_classes")
          .update({ order_index: index + 1 }) // 1-based
          .eq("id", cls.id)
      )
    );
  }

  // ===========================
  // OPEN EDIT FORM
  // ===========================

  function openEditForm(cls) {
    setEditingClass(cls);
    setName(cls.name);
    setDescription(cls.description || "");
    setShowForm(true);
  }

  // ===========================
  // UI
  // ===========================

  if (loading) {
    return (
      <div className="p-6 text-text-muted">
        Loading classes…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">

      {/* PAGE HEADER */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Club Classes</h1>
        <p className="text-text-muted">
          Manage your club’s racing classes, descriptions, and display order.
        </p>
      </div>

      {/* ACTION BAR */}
      <div className="flex justify-end">
        <Button
          style={{ backgroundColor: brand }}
          className="text-white"
          onClick={() => {
            setEditingClass(null);
            setName("");
            setDescription("");
            setShowForm(true);
          }}
        >
          Add Class
        </Button>
      </div>

      {/* ADD / EDIT FORM */}
      {showForm && (
        <Card
          className="p-6 space-y-6"
          style={{ border: `2px solid ${brand}` }}
        >
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">
              {editingClass ? "Edit Class" : "Add Class"}
            </h2>
            <p className="text-text-muted text-sm">
              Class name and description will appear on event nomination pages.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Class Name</label>
              <input
                className="w-full p-2 border rounded-md"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 2WD Stock Buggy"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full p-2 border rounded-md"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              style={{ backgroundColor: brand }}
              className="text-white"
              onClick={saveClass}
            >
              Save
            </Button>

            <Button
              className="bg-gray-200"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* CLASS LIST */}
      <Card
        className="p-6 space-y-4"
        style={{ border: `2px solid ${brand}` }}
      >
        <h2 className="text-lg font-semibold">Class List</h2>

        {classes.length === 0 && (
          <p className="text-text-muted">No classes yet.</p>
        )}

        {classes.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={classes.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {classes.map((cls) => (
                  <SortableItem key={cls.id} id={cls.id}>
                    <div className="flex items-center justify-between p-3 border rounded-md bg-white">

                      {/* LEFT SIDE */}
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{cls.name}</span>

                        <div className="relative">
                          <InformationCircleIcon
                            className="h-5 w-5 cursor-pointer"
                            style={{ color: brand }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setTooltipId(
                                tooltipId === cls.id ? null : cls.id
                              );
                            }}
                          />

                          {tooltipId === cls.id && cls.description && (
                            <div
                              className="absolute z-50 text-white text-xs p-2 rounded shadow-lg"
                              style={{
                                backgroundColor: brand,
                                top: "120%",
                                left: 0,
                                width: "220px",
                                lineHeight: "1.3",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {cls.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ACTIONS */}
                      <div className="flex items-center gap-3">
                        <PencilIcon
                          className="h-5 w-5 cursor-pointer text-gray-600"
                          onClick={() => openEditForm(cls)}
                        />

                        <TrashIcon
                          className="h-5 w-5 cursor-pointer text-red-600"
                          onClick={() => deleteClass(cls)}
                        />
                      </div>
                    </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </Card>
    </div>
  );
}
