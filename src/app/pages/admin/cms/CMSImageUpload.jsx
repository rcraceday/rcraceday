import React, { useRef } from "react";
import CMSButton from "./CMSButton";
import { cmsStyles } from "./styles";

export default function CMSImageUpload({ label, value, onChange }) {
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Pass the file back to the parent (upload handled outside)
    onChange(file);
  };

  const handleRemove = () => {
    onChange(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && <label style={cmsStyles.label}>{label}</label>}

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "16px",
        }}
      >
        {/* PREVIEW BOX */}
        <div
          style={{
            width: "120px",
            height: "120px",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            background: "#FFFFFF",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {value ? (
            <img
              src={typeof value === "string" ? value : URL.createObjectURL(value)}
              alt="Preview"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          ) : (
            <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
              No image
            </span>
          )}
        </div>

        {/* CONTROLS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />

          <CMSButton
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose File
          </CMSButton>

          {value && (
            <CMSButton variant="danger" onClick={handleRemove}>
              Remove
            </CMSButton>
          )}
        </div>
      </div>
    </div>
  );
}
