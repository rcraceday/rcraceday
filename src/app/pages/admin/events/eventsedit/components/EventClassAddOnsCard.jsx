import React, { useState } from "react";
import CMSCard from "@cms/CMSCard";
import CMSButton from "@cms/CMSButton";
import { supabase } from "@/supabaseClient";

import ClassAddOnEditor from "./ClassAddOnEditor";

export default function EventClassAddOnsCard({
  event = {},
  onChange = () => {},
}) {
  const [editingItem, setEditingItem] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const addOns = Array.isArray(event.class_add_ons)
    ? event.class_add_ons
    : [];

  const openNewItemDrawer = () => {
    setEditingItem({
      id: crypto.randomUUID(),
      name: "",
      description: "",
      price: 0,
      required: false,
      max_qty: 1,
      photo_file: null,
      photo_url: null,
      options: [],
      classes: [],
      class_rules: {},
    });
    setDrawerOpen(true);
  };

  const openEditDrawer = (item) => {
    setEditingItem({
      ...item,
      photo_file: null,
      options: item.options || [],
      class_rules: item.class_rules || {},
    });
    setDrawerOpen(true);
  };

  const duplicateItem = (item) => {
    const copy = {
      ...item,
      id: crypto.randomUUID(),
    };
    const updated = [...addOns, copy];
    onChange("class_add_ons", updated);
  };

  const uploadPhoto = async (file, pathSuffix) => {
    if (!file) return null;
    if (!event?.club_id) return null;

    const safeName = file.name
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_.-]/g, "");
    const timestamp = Date.now();
    const baseId = editingItem?.id || "addon";
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
    };

    const updated = addOns.filter((m) => m.id !== cleanItem.id);
    updated.push(cleanItem);
    onChange("class_add_ons", updated);

    setEditingItem(null);
    setDrawerOpen(false);
  };

  const deleteItem = (id) => {
    const updated = addOns.filter((m) => m.id !== id);
    onChange("class_add_ons", updated);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 700 }}>Class Add‑Ons</div>
        <CMSButton type="button" onClick={openNewItemDrawer}>
          Add Class Add‑On
        </CMSButton>
      </div>

      {addOns.length === 0 && (
        <div style={{ padding: "8px 0", color: "#666" }}>
          No class add‑ons configured.
        </div>
      )}

      {addOns.map((item) => (
        <CMSCard key={item.id} title={item.name}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>{item.description}</div>
            <div>Price: ${item.price ?? 0}</div>
            <div>Max Qty: {item.max_qty ?? 1}</div>

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <CMSButton type="button" onClick={() => openEditDrawer(item)}>
                Edit
              </CMSButton>
              <CMSButton
                type="button"
                variant="secondary"
                onClick={() => duplicateItem(item)}
              >
                Duplicate
              </CMSButton>
              <CMSButton
                type="button"
                variant="danger"
                onClick={() => deleteItem(item.id)}
              >
                Remove
              </CMSButton>
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
              <h2 style={{ margin: 0, fontSize: 18 }}>Edit Class Add‑On</h2>
              <CMSButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingItem(null);
                  setDrawerOpen(false);
                }}
              >
                Close
              </CMSButton>
            </div>

            <ClassAddOnEditor
              item={editingItem}
              event={event}
              setItem={setEditingItem}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <CMSButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingItem(null);
                  setDrawerOpen(false);
                }}
              >
                Cancel
              </CMSButton>
              <CMSButton
                type="button"
                variant="primary"
                onClick={() => saveItem(editingItem)}
              >
                Save Add‑On
              </CMSButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
