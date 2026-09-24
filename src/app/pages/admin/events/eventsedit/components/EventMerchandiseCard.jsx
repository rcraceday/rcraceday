// src/app/pages/admin/events/eventsedit/components/EventMerchandiseCard.jsx
import React, { useState } from "react";
import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";
import { RemoveButton } from "@cms/CMSButtonSet";
import { supabase } from "@/supabaseClient";

import MerchEditor from "./MerchEditor";

const normalizeRequirements = (requirements) =>
  (Array.isArray(requirements) ? requirements : []).map((requirement) => ({
    description: requirement?.description || "",
    items: (Array.isArray(requirement?.items) ? requirement.items : []).map((item) => ({
      label: item?.label || "",
    })),
  }));

export default function EventMerchandiseCard({ event = {}, onChange = () => {} }) {
  const [editingItem, setEditingItem] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const merchandise = Array.isArray(event.merchandise) ? event.merchandise : [];

  const openNewItemDrawer = () => {
    setEditingItem({
      id: crypto.randomUUID(),
      name: "",
      description: "",
      price: 0,
      included: false,
      compulsory: false,
      max_qty: 1,
      photo_file: null,
      photo_url: null,
      options: [],
      requirements: [],
      classes: [], // merch has no classes
    });
    setDrawerOpen(true);
  };

  const openEditDrawer = (item) => {
    setEditingItem({
      ...item,
      photo_file: null,
      options: item.options || [],
      requirements: normalizeRequirements(item.requirements),
    });
    setDrawerOpen(true);
  };

  const duplicateItem = (item) => {
    const copy = {
      ...item,
      id: crypto.randomUUID(),
      requirements: normalizeRequirements(item.requirements),
      classes: [], // clear classes for merch
    };
    const updated = [...merchandise, copy];
    onChange("merchandise", updated);
  };

  const uploadPhoto = async (file, pathSuffix) => {
    if (!file) return null;
    if (!event?.club_id) return null;

    const safeName = file.name
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_.-]/g, "");
    const timestamp = Date.now();
    const baseId = editingItem?.id || "item";
    const path = `${event.club_id}/merch/${baseId}_${pathSuffix}_${timestamp}_${safeName}`;

    const { error } = await supabase.storage
      .from("club-assets")
      .upload(path, file, { upsert: true });

    if (error) return null;

    const res = supabase.storage.from("club-assets").getPublicUrl(path);
    return res?.publicURL ?? res?.data?.publicUrl ?? null;
  };

  const saveItem = async (item) => {
    let photoUrl = item.photo_url;

    if (item.photo_file instanceof File) {
      const url = await uploadPhoto(item.photo_file, "main");
      if (url) photoUrl = url;
    }

    const optionsWithPhotos = await Promise.all(
      (item.options || []).map(async (group, gi) => {
        const values = await Promise.all(
          (group.values || []).map(async (val, vi) => {
            let vPhotoUrl = val.photo_url;

            if (val.photo_file instanceof File) {
              const url = await uploadPhoto(
                val.photo_file,
                `opt_${gi}_${vi}`
              );
              if (url) vPhotoUrl = url;
            }

            return {
              ...val,
              photo_url: vPhotoUrl || null,
              photo_file: null,
            };
          })
        );

        return {
          ...group,
          values,
        };
      })
    );

    const cleanItem = {
      ...item,
      photo_url: photoUrl || null,
      photo_file: null,
      options: optionsWithPhotos,
      requirements: normalizeRequirements(item.requirements),
      classes: [], // merch has no classes
    };

    const updated = merchandise.filter((m) => m.id !== cleanItem.id);
    updated.push(cleanItem);
    onChange("merchandise", updated);

    setEditingItem(null);
    setDrawerOpen(false);
  };

  const deleteItem = (id) => {
    const updated = merchandise.filter((m) => m.id !== id);
    onChange("merchandise", updated);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 700 }}>Event Merchandise</div>
        <CMSButton onClick={openNewItemDrawer}>Add Merchandise Item</CMSButton>
      </div>

      {merchandise.length === 0 && (
        <div style={{ padding: "8px 0", color: "#666" }}>
          No merchandise configured.
        </div>
      )}

      {merchandise.map((item) => (
        <CMSCard key={item.id} title={item.name}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>{item.description}</div>
            <div>
              {item.included
                ? "Included in Entry"
                : `Price: $${item.price ?? 0}`}
            </div>
            <div>Max Qty: {item.max_qty ?? 1}</div>
            {item.compulsory && (
              <div style={{ color: "#b91c1c", fontSize: 13 }}>
                Compulsory item – nomination cannot be submitted without this.
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <CMSButton onClick={() => openEditDrawer(item)}>Edit</CMSButton>
              <CMSButton variant="secondary" onClick={() => duplicateItem(item)}>
                Duplicate
              </CMSButton>
              <RemoveButton type="button" onClick={() => deleteItem(item.id)} />
            </div>
          </div>
        </CMSCard>
      ))}

      {drawerOpen && editingItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "flex-end",
            zIndex: 50,
          }}
        >
<div
  style={{
    width: "420px",
    maxWidth: "100%",
    backgroundColor: "#fff",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: 16,

    // FIXED SCROLLING
    overflowY: "auto",
    maxHeight: "100vh",
  }}
>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18 }}>Edit Merchandise Item</h2>
              <CMSButton
                variant="secondary"
                onClick={() => {
                  setEditingItem(null);
                  setDrawerOpen(false);
                }}
              >
                Close
              </CMSButton>
            </div>

            <MerchEditor item={editingItem} setItem={setEditingItem} />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <CMSButton
                variant="secondary"
                onClick={() => {
                  setEditingItem(null);
                  setDrawerOpen(false);
                }}
              >
                Cancel
              </CMSButton>
              <CMSButton variant="primary" onClick={() => saveItem(editingItem)}>
                Save Item
              </CMSButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
