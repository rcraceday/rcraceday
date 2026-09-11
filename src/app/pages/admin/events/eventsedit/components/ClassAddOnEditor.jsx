import React from "react";
import CMSCard from "@cms/CMSCard";
import CMSInput from "@cms/CMSInput";
import CMSTextarea from "@cms/CMSTextarea";
import CMSToggle from "@cms/CMSToggle";
import CMSImageUpload from "@cms/CMSImageUpload";
import CMSButton from "@cms/CMSButton";
import { supabase } from "@/supabaseClient";

import OptionGroupEditor from "./OptionGroupEditor";

export default function ClassAddOnEditor({ item, event, setItem }) {
  const update = (field, value) => {
    setItem((prev) => ({ ...prev, [field]: value }));
  };

  const updateClasses = (classId) => {
    const current = Array.isArray(item.classes) ? [...item.classes] : [];
    const has = current.includes(classId);
    const nextClasses = has ? current.filter((c) => c !== classId) : [...current, classId];

    const nextRules = { ...(item.class_rules || {}) };
    if (!has) {
      nextRules[classId] = nextRules[classId] || {
        price: "",
        required: false,
        max_qty: "",
        photo_file: null,
        photo_url: null,
        description: "",
        options: [],
      };
    }

    setItem((prev) => ({
      ...prev,
      classes: nextClasses,
      class_rules: nextRules,
    }));
  };

  const uploadPhoto = async (file, classId = null) => {
    if (!file || !event?.club_id) return null;

    const safeName = file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_.-]/g, "");
    const timestamp = Date.now();
    const baseId = item.id || "item";
    const suffix = classId ? `_${classId}` : "";
    const path = `${event.club_id}/merch/${baseId}${suffix}_${timestamp}_${safeName}`;

    const { error } = await supabase.storage
      .from("club-assets")
      .upload(path, file, { upsert: true });

    if (error) return null;

    const res = supabase.storage.from("club-assets").getPublicUrl(path);
    return res?.publicURL ?? res?.data?.publicUrl ?? null;
  };

  return (
    <CMSCard title="Add‑on Options">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Helper text under the Add-on Options heading */}
        <div style={{ fontSize: 12, color: "#666", marginTop: -8 }}>
          Use descriptive group names (e.g. Tire Compund, Wheel Colour). Add option values and optional photos here.
        </div>

        <CMSInput
          label="Name"
          value={item.name}
          onChange={(v) => update("name", v)}
        />

        <CMSTextarea
          label="Description"
          value={item.description}
          onChange={(v) => update("description", v)}
        />

        <CMSInput
          label="Price"
          type="number"
          value={item.price}
          onChange={(v) => update("price", Number(v))}
        />

        <div style={{ display: "flex", gap: 12 }}>
          <CMSToggle
            label="Required Add‑On"
            checked={item.required}
            onChange={(v) => update("required", v)}
          />

          <CMSInput
            label="Max Qty"
            type="number"
            value={item.max_qty}
            onChange={(v) => update("max_qty", Number(v))}
          />
        </div>

        <CMSImageUpload
          label="Photo"
          value={item.photo_url}
          filePreview={item.photo_file}
          onChange={(fileOrNull) => {
            if (fileOrNull === null) {
              update("photo_file", null);
              update("photo_url", null);
            } else if (fileOrNull instanceof File) {
              update("photo_file", fileOrNull);
            } else {
              update("photo_url", fileOrNull);
            }
          }}
        />

        <CMSCard title="Add‑on Options">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>Groups</strong>
            <CMSButton
              type="button"
              onClick={() =>
                update("options", [...(item.options || []), { name: "", values: [] }])
              }
            >
              New Option Group
            </CMSButton>
          </div>

          {(item.options || []).map((group, gi) => (
            <OptionGroupEditor
              key={gi}
              group={group}
              onRename={(name) => {
                const updated = [...(item.options || [])];
                updated[gi].name = name;
                update("options", updated);
              }}
onAddValue={(val) => {
  const updated = [...(item.options || [])];
  updated[gi].values.push({
    label: val,
    photo_url: null,
    photo_file: null,
  });
  update("options", updated);
}}
              onRemoveValue={(vi) => {
                const updated = [...(item.options || [])];
                updated[gi].values.splice(vi, 1);
                update("options", updated);
              }}
              onRemoveGroup={() => {
                const updated = [...(item.options || [])];
                updated.splice(gi, 1);
                update("options", updated);
              }}
            />
          ))}
        </CMSCard>

        <CMSCard title="Apply to Classes">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ color: "#444", fontSize: 13 }}>Select classes this add‑on applies to</div>

            {(event?.available_classes || []).map((c) => {
              const checked = Array.isArray(item.classes) && item.classes.includes(c.id);
              return (
                <label
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    borderRadius: 6,
                    background: checked ? "#f3f4f6" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => updateClasses(c.id)}
                    style={{ width: 16, height: 16 }}
                  />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: 14 }}>{c.name}</div>
                    {c.short_description && (
                      <div style={{ fontSize: 12, color: "#666" }}>{c.short_description}</div>
                    )}
                  </div>
                </label>
              );
            })}

            {(!event?.available_classes || event.available_classes.length === 0) && (
              <div style={{ color: "#666" }}>No classes available for this event.</div>
            )}
          </div>
        </CMSCard>
      </div>
    </CMSCard>
  );
}
