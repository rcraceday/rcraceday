import React, { useState } from "react";
import CMSCard from "@cms/CMSCard";
import CMSInput from "@cms/CMSInput";
import CMSButton from "@cms/CMSButton";
import { ClearFieldButton } from "@cms/CMSButtonSet";
import CMSImageUpload from "@cms/CMSImageUpload";
import { supabase } from "@/supabaseClient";
import { useTranslation } from "@/app/i18n/I18nContext";
import {
  classAddonPhotoPath,
  uploadClubAsset,
} from "@/app/lib/clubAssetStorage";

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
  const { t } = useTranslation();
  const [newValue, setNewValue] = useState("");

  const uploadOptionPhoto = async (file, previousUrl, slot) => {
    if (!file || !event?.club_slug) return null;

    const baseId = item?.id || "item";
    const objectPath = classAddonPhotoPath(event.club_slug, baseId, slot, file);
    const { publicUrl, error } = await uploadClubAsset(supabase, {
      objectPath,
      file,
      previousUrlOrPath: previousUrl,
    });

    if (error || !publicUrl) return null;
    return publicUrl;
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
        labelKey="cms.groupName"
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
                labelKey="cms.labelField"
                value={val.label}
                onChange={(v) => onUpdateValue(vi, v)}
              />

              <CMSImageUpload
                labelKey="cms.optionPhoto"
                value={val.photo_url}
                filePreview={val.photo_file}
                onChange={async (fileOrUrl) => {
                  if (fileOrUrl === null) {
                    onUpdateValuePhoto(vi, { photo_file: null, photo_url: null });
                    return;
                  }

                  if (fileOrUrl instanceof File) {
                    const slot = `opt_${(group.name || "group").replace(/\s+/g, "_")}_${vi}`;
                    const url = await uploadOptionPhoto(fileOrUrl, val.photo_url, slot);
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
            labelKey="cms.addValue"
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
