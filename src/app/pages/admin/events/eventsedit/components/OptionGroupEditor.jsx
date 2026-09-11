import React, { useState } from "react";
import CMSCard from "@cms/CMSCard";
import CMSInput from "@cms/CMSInput";
import CMSButton from "@cms/CMSButton";
import CMSImageUpload from "@cms/CMSImageUpload";

export default function OptionGroupEditor({
  group,
  onRename,
  onAddValue,
  onUpdateValue,
  onUpdateValuePhoto,
  onRemoveValue,
  onRemoveGroup,
}) {
  const [newValue, setNewValue] = useState("");

  const handleAdd = () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    onAddValue(trimmed);
    setNewValue("");
  };

  return (
    <CMSCard title={group.name || "Option Group"}>
      {/* Group Name */}
      <CMSInput
        label="Group Name"
        placeholder="e.g. Colour or Size"
        value={group.name}
        onChange={onRename}
      />

      <div style={{ marginTop: 12 }}>
        <strong>Values</strong>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
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
              {/* Option Label */}
              <CMSInput
                label="Label"
                value={val.label}
                onChange={(v) => onUpdateValue(vi, v)}
              />

              {/* Option Photo */}
              <CMSImageUpload
                label="Option Photo"
                value={val.photo_url}
                filePreview={val.photo_file}
                onChange={(fileOrUrl) => onUpdateValuePhoto(vi, fileOrUrl)}
              />

              {/* Remove Value */}
              <CMSButton
                variant="danger"
                type="button"
                onClick={() => onRemoveValue(vi)}
              >
                Remove Option
              </CMSButton>
            </div>
          ))}
        </div>

        {/* Add Value */}
        <div style={{ marginTop: 12 }}>
          <CMSInput
            label="Add Value"
            placeholder="e.g. Black, Red, Blue"
            value={newValue}
            onChange={setNewValue}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
          />

          <CMSButton
            type="button"
            onClick={handleAdd}
            style={{ marginTop: 8 }}
          >
            Add Option Value
          </CMSButton>
        </div>
      </div>

      {/* Remove Group */}
      <CMSButton
        variant="danger"
        type="button"
        onClick={onRemoveGroup}
        style={{ marginTop: 16 }}
      >
        Remove Group
      </CMSButton>
    </CMSCard>
  );
}
