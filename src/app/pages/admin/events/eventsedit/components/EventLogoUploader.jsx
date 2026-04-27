import { useState } from "react";
import CMSButton from "@cms/CMSButton";
import { supabase } from "@/supabaseClient";

export default function EventLogoUploader({ logourl, onChange }) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `event-logo-${Date.now()}.${fileExt}`;
      const filePath = `event-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("public")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload failed:", uploadError);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("public")
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        onChange(urlData.publicUrl);
      }
    } catch (err) {
      console.error("Unexpected upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <label
        style={{
          fontSize: "13px",
          fontWeight: 500,
          marginBottom: "4px",
        }}
      >
        Event Logo
      </label>

      {logourl && (
        <img
          src={logourl}
          alt="Event Logo"
          style={{
            width: "160px",
            height: "auto",
            borderRadius: "6px",
            objectFit: "contain",
            background: "#F3F4F6",
            padding: "6px",
          }}
        />
      )}

      <CMSButton variant="secondary">
        <label style={{ cursor: "pointer" }}>
          {uploading ? "Uploading…" : "Choose File"}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </label>
      </CMSButton>
    </div>
  );
}
