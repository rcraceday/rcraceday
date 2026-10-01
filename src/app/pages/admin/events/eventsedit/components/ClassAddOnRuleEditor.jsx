import React from "react";
import CMSCard from "@cms/CMSCard";
import CMSInput from "@cms/CMSInput";
import CMSTextarea from "@cms/CMSTextarea";
import CMSToggle from "@cms/CMSToggle";
import CMSImageUpload from "@cms/CMSImageUpload";
import { supabase } from "@/supabaseClient";
import { useTranslation } from "@/app/i18n/I18nContext";
import {
  classAddonPhotoPath,
  uploadClubAsset,
} from "@/app/lib/clubAssetStorage";

export default function ClassAddOnRuleEditor({ cid, cls, item, setItem, event }) {
  const { t } = useTranslation();
  const rule = item.class_rules?.[cid] || {
    price: "",
    required: false,
    max_qty: "",
    photo_file: null,
    photo_url: null,
    description: "",
    options: [],
  };

  const updateRule = (field, value) => {
    setItem((prev) => ({
      ...prev,
      class_rules: {
        ...prev.class_rules,
        [cid]: {
          ...(prev.class_rules?.[cid] || {}),
          [field]: value,
        },
      },
    }));
  };

  const uploadPhoto = async (file, previousUrl = null) => {
    if (!file || !event?.club_slug) return null;

    const baseId = item.id || "item";
    const objectPath = classAddonPhotoPath(event.club_slug, baseId, `class_${cid}`, file);
    const { publicUrl, error } = await uploadClubAsset(supabase, {
      objectPath,
      file,
      previousUrlOrPath: previousUrl,
    });

    if (error || !publicUrl) return null;
    return publicUrl;
  };

  return (
    <CMSCard title={`Overrides for ${cls.name}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Price */}
        <CMSInput
          labelKey="cms.priceOverride"
          type="number"
          value={rule.price}
          onChange={(v) => updateRule("price", Number(v))}
        />

        {/* Required */}
        <CMSToggle
          labelKey="cms.requiredForClass"
          checked={rule.required}
          onChange={(v) => updateRule("required", v)}
        />

        {/* Max Qty */}
        <CMSInput
          labelKey="cms.maxQtyOverride"
          type="number"
          value={rule.max_qty}
          onChange={(v) => updateRule("max_qty", Number(v))}
        />

        {/* Description */}
        <CMSTextarea
          labelKey="cms.classDescriptionOverride"
          value={rule.description}
          onChange={(v) => updateRule("description", v)}
        />

{/* Photo Override */}
<CMSImageUpload
  labelKey="cms.photoOverride"
  value={rule.photo_url}
  filePreview={rule.photo_file}
  onChange={async (fileOrNull) => {
    if (fileOrNull === null) {
      updateRule("photo_file", null);
      updateRule("photo_url", null);
      return;
    }

    if (fileOrNull instanceof File) {
      updateRule("photo_file", fileOrNull);

      // Upload immediately for class‑specific override
      const url = await uploadPhoto(fileOrNull, rule.photo_url);
      if (url) updateRule("photo_url", url);

      return;
    }

    // Existing URL
    updateRule("photo_url", fileOrNull);
  }}
/>
      </div>
    </CMSCard>
  );
}
