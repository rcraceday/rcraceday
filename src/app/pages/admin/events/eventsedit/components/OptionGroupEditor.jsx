import React, { useState } from "react";
import CMSCard from "@cms/CMSCard";
import CMSInput from "@cms/CMSInput";
import CMSButton from "@cms/CMSButton";
import { ClearFieldButton } from "@cms/CMSButtonSet";
import CMSImageUpload from "@cms/CMSImageUpload";
import { supabase } from "@/supabaseClient";

export default function OptionGroupEditor({
  group,
  event,
  item,
  onRename,
  onAddValue,
  onUpdateValue,
  onUpdateValuePhoto,
  onRemoveValue,
  onRemoveGroup,
}) {
  const [newValue, setNewValue] = useState("");

  const uploadOptionPhoto = async (file) => {
    if (!file || !event?.club_id) return null;

    const safeName = file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_.-]/g, "");
    const timestamp = Date.now();
    const baseId = item?.id || "item";
    const groupName = (group.name || "group").replace(/\s+/g, "_");

    const path = `${event.club_id}/merch/${baseId}_opt_${groupName}_${timestamp}_${safeName}`;

    const { error } = await supabase.storage
      .from("club-assets")
      .upload(path, file, { upsert: true });

    if (error) return null;

    const res = supabase.storage.from("club-assets").getPublicUrl(path);
    return res?.publicURL ?? res?.data?.publicUrl ?? null;
  };

  const addValue = () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    onAddValue(trimmed);
    setNewValue("");
  };

  return (
    <CMSCard title={group.name || "Option Group"}>
      <CMSInput
        label="Group Name"
        placeholder="e.g. Colour or Size"
        value={group.name}
        onChange={onRename}
      />

      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {group.values.map((val, vi) => (
            <div
              key={vi}
              style={{
                padding: "12px",
                border: "1px solid #DDD",
                borderRadius: "6px",
                background: "#FAFAFA",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <CMSInput
                label="Label"
                value={val.label}
                onChange={(v) => onUpdateValue(vi, v)}
              />

              <CMSImageUpload
                label="Option Photo"
                value={val.photo_url}
                filePreview={val.photo_file}
                onChange={async (fileOrUrl) => {
                  if (fileOrUrl === null) {
                    onUpdateValuePhoto(vi, { photo_file: null, photo_url: null });
                    return;
                  }

                  if (fileOrUrl instanceof File) {
                    const url = await uploadOptionPhoto(fileOrUrl);
                    onUpdateValuePhoto(vi, {
                      photo_file: null,
                      photo_url: url,
                    });
                    return;
                  }

                  onUpdateValuePhoto(vi, {
                    photo_file: null,
                    photo_url: fileOrUrl,
                  });
                }}
              />

              <ClearFieldButton
                type="button"
                onClick={() => onRemoveValue(vi)}
                title="Remove option"
                style={{ alignSelf: "flex-end" }}
              />
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          <CMSInput
            label="Add Value"
            placeholder="e.g. Black, Red, Blue"
            value={newValue}
            onChange={setNewValue}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addValue();
              }
            }}
          />

          <CMSButton type="button" onClick={addValue} style={{ marginTop: 8 }}>
            Add Option Value
          </CMSButton>
        </div>
      </div>

      <ClearFieldButton
        type="button"
        onClick={onRemoveGroup}
        title="Remove group"
        style={{ marginTop: 16 }}
      />
    </CMSCard>
  );
}
