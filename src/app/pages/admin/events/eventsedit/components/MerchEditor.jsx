// src/app/pages/admin/events/eventsedit/components/MerchEditor.jsx
import React from "react";
import CMSCard from "@cms/CMSCard";
import CMSInput from "@cms/CMSInput";
import CMSTextarea from "@cms/CMSTextarea";
import CMSToggle from "@cms/CMSToggle";
import CMSImageUpload from "@cms/CMSImageUpload";
import CMSButton from "@cms/CMSButton";
import { ClearFieldButton, RemoveButton } from "@cms/CMSButtonSet";

import OptionGroupEditor from "./OptionGroupEditor";

const normalizeRequirements = (requirements) =>
  (Array.isArray(requirements) ? requirements : []).map((requirement) => ({
    description: requirement?.description || "",
    items: (Array.isArray(requirement?.items) ? requirement.items : []).map((item) => ({
      label: item?.label || "",
    })),
  }));

export default function MerchEditor({ item, setItem }) {
  const update = (field, value) => {
    setItem((prev) => ({ ...prev, [field]: value }));
  };

  const options = Array.isArray(item.options) ? item.options : [];
  const requirements = normalizeRequirements(item.requirements);

  return (
    <CMSCard title="Merchandise Item">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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

        <div style={{ display: "flex", gap: 12 }}>
          <CMSInput
            label="Price"
            type="number"
            value={item.price}
            onChange={(v) => update("price", Number(v))}
          />

          <CMSInput
            label="Max Qty"
            type="number"
            value={item.max_qty}
            onChange={(v) => update("max_qty", Number(v))}
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <CMSToggle
            label="Included in Entry"
            checked={item.included}
            onChange={(v) => update("included", v)}
          />

          <CMSToggle
            label="Compulsory Item"
            checked={item.compulsory}
            onChange={(v) => update("compulsory", v)}
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

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>Item Options</strong>
            <CMSButton
              type="button"
              onClick={() =>
                update("options", [
                  ...options,
                  { name: "", values: [] }, // create with empty name so placeholder shows
                ])
              }
            >
              New Option Group
            </CMSButton>
          </div>

          {/* Helper text under the Add-on Options heading */}
          <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
            Use descriptive group names (e.g. Colour, Size). Add option values and optional photos here.
          </div>

          {options.map((group, gi) => (
            <OptionGroupEditor
              key={gi}
              group={group}
              onRename={(name) => {
                const updated = [...options];
                updated[gi].name = name;
                update("options", updated);
              }}
              onAddValue={(val) => {
                const updated = [...options];
                updated[gi].values.push({
                  label: val,
                  photo_url: null,
                  photo_file: null,
                });
                update("options", updated);
              }}
              onUpdateValue={(vi, newVal) => {
                const updated = [...options];
                updated[gi].values[vi].label = newVal;
                update("options", updated);
              }}
              onUpdateValuePhoto={(vi, fileOrUrl) => {
                const updated = [...options];
                const value = updated[gi].values[vi];

                if (fileOrUrl === null) {
                  value.photo_file = null;
                  value.photo_url = null;
                } else if (fileOrUrl instanceof File) {
                  value.photo_file = fileOrUrl;
                } else {
                  value.photo_url = fileOrUrl;
                }

                update("options", updated);
              }}
              onRemoveValue={(vi) => {
                const updated = [...options];
                updated[gi].values.splice(vi, 1);
                update("options", updated);
              }}
              onRemoveGroup={() => {
                const updated = [...options];
                updated.splice(gi, 1);
                update("options", updated);
              }}
            />
          ))}
        </div>

        <CMSCard title="Requirements">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Checklist Requirements</strong>
              <CMSButton
                type="button"
                onClick={() =>
                  update("requirements", [
                    ...requirements,
                    { description: "", items: [] },
                  ])
                }
              >
                Add Requirements
              </CMSButton>
            </div>

            {requirements.map((requirement, ri) => (
              <div
                key={ri}
                style={{
                  border: "1px solid #DDD",
                  borderRadius: 6,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  background: "#FAFAFA",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <CMSInput
                      label="Description"
                      value={requirement.description}
                      onChange={(description) => {
                        const nextRequirements = requirements.map((entry, index) =>
                          index === ri ? { ...entry, description } : entry
                        );
                        update("requirements", nextRequirements);
                      }}
                    />
                  </div>
                  <CMSButton
                    type="button"
                    onClick={() => {
                      const nextRequirements = requirements.map((entry, index) =>
                        index === ri
                          ? {
                              ...entry,
                              items: [...entry.items, { label: "" }],
                            }
                          : entry
                      );
                      update("requirements", nextRequirements);
                    }}
                  >
                    Add Item
                  </CMSButton>
                  <ClearFieldButton
                    type="button"
                    onClick={() =>
                      update(
                        "requirements",
                        requirements.filter((_, index) => index !== ri)
                      )
                    }
                    style={{ alignSelf: "flex-end" }}
                  />
                </div>

                {requirement.items.map((entry, ii) => (
                  <div key={ii} style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <CMSInput
                        label={`Item ${ii + 1}`}
                        value={entry.label}
                        onChange={(label) => {
                          const nextRequirements = requirements.map((req, reqIndex) =>
                            reqIndex === ri
                              ? {
                                  ...req,
                                  items: req.items.map((itemEntry, itemIndex) =>
                                    itemIndex === ii ? { ...itemEntry, label } : itemEntry
                                  ),
                                }
                              : req
                          );
                          update("requirements", nextRequirements);
                        }}
                      />
                    </div>
                    <RemoveButton
                      type="button"
                      onClick={() => {
                        const nextRequirements = requirements.map((req, reqIndex) =>
                          reqIndex === ri
                            ? {
                                ...req,
                                items: req.items.filter((_, itemIndex) => itemIndex !== ii),
                              }
                            : req
                        );
                        update("requirements", nextRequirements);
                      }}
                      style={{ alignSelf: "flex-end", marginBottom: 4 }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CMSCard>
      </div>
    </CMSCard>
  );
}
