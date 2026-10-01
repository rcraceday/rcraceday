import React, { useRef, useEffect, useState } from "react";
import { UploadButton, DeleteButton } from "@cms/CMSButtonSet";
import { cmsStyles } from "./styles";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function CMSImageUpload({ label, value, filePreview, onChange }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [objectUrl, setObjectUrl] = useState(null);

  // ⭐ Create object URL only when filePreview changes
  useEffect(() => {
    if (filePreview instanceof File) {
      const url = URL.createObjectURL(filePreview);
      setObjectUrl(url);

      return () => URL.revokeObjectURL(url);
    }

    setObjectUrl(null);
  }, [filePreview]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange(file);
  };

  const handleRemove = () => {
    onChange(null);
  };

  // ⭐ Determine preview source
  const previewSrc = objectUrl || (typeof value === "string" ? value : null);

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
          {previewSrc ? (
            <img
              src={previewSrc}
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

          <UploadButton onClick={() => fileInputRef.current?.click()}>
            Choose File
          </UploadButton>

          {previewSrc && (
            <DeleteButton onClick={handleRemove}>
              Remove Image
            </DeleteButton>
          )}
        </div>
      </div>
    </div>
  );
}
