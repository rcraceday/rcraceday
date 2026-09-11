// src/app/pages/admin/components/LogoPicker.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import CMSButton from "@cms/CMSButton";
import CMSInput from "@cms/CMSInput";
import { supabase } from "@/supabaseClient";

/**
 * LogoPicker
 *
 * - Compact chooser UI: preview + "Choose logo" button that opens a modal listing bucket files.
 * - Upload uses an explicit input ref to reliably open the file picker.
 * - Robust URL resolution for Supabase SDK variations and optional signed URLs.
 *
 * Props:
 * - bucketName string (default "logos")
 * - prefix string optional path prefix inside bucket
 * - value string current selected storage path (optional)
 * - onSelect(filePath, publicUrl) called when admin picks an existing file
 * - onUpload(filePath, publicUrl) called after a successful upload
 * - pageSize number optional default 24
 * - useSignedUrls boolean optional default false
 */
export default function LogoPicker({
  bucketName = "logos",
  prefix = "",
  value = "",
  onSelect = () => {},
  onUpload = () => {},
  pageSize = 24,
  useSignedUrls = false,
}) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fileInputRef = useRef(null);

  const buildPath = (name) => (prefix ? `${prefix}/${name}` : name);

  // Robust getUrlFor that handles SDK return-shape differences and logs issues
  const getUrlFor = async (filePath) => {
    if (!filePath) return null;
    try {
      if (useSignedUrls) {
        const { data, error } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(filePath, 60);
        if (error) {
          console.error("LogoPicker signed url error", error);
          return null;
        }
        const signed = data?.signedURL ?? data?.signedUrl ?? null;
        if (!signed) {
          console.error("LogoPicker signed url missing for", filePath, data);
        }
        return signed;
      } else {
        const res = supabase.storage.from(bucketName).getPublicUrl(filePath);
        const publicURL = res?.publicURL ?? res?.data?.publicUrl ?? null;
        if (!publicURL) {
          console.warn("LogoPicker public url missing for", filePath, res);
        }
        return publicURL;
      }
    } catch (err) {
      console.error("LogoPicker getUrlFor error", err);
      return null;
    }
  };

  const listFiles = useCallback(async () => {
    setLoading(true);
    try {
      const path = prefix || "";
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(path, {
          limit: pageSize,
          offset: page * pageSize,
          sortBy: { column: "name", order: "asc" },
        });

      if (error) {
        console.error("LogoPicker list error", error);
        setFiles([]);
        setLoading(false);
        return;
      }

      const filtered = (data || []).filter((f) =>
        f.name.toLowerCase().includes(search.trim().toLowerCase())
      );

      const withUrls = await Promise.all(
        filtered.map(async (f) => {
          const filePath = buildPath(f.name);
          const url = await getUrlFor(filePath);
          return { ...f, path: filePath, publicUrl: url };
        })
      );

      setFiles(withUrls);
    } catch (ex) {
      console.error("LogoPicker unexpected error", ex);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [bucketName, prefix, page, pageSize, search, useSignedUrls]);

  // Only list files when modal opens (keeps page compact)
  useEffect(() => {
    if (modalOpen) {
      listFiles();
    }
  }, [modalOpen, listFiles]);

  // Update preview when parent value changes
  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    (async () => {
      const url = await getUrlFor(value);
      setPreviewUrl(url);
    })();
  }, [value, bucketName, useSignedUrls]);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const timestamp = Date.now();
      const safeName = file.name.replace(/\s+/g, "_");
      const filePath = buildPath(`${timestamp}_${safeName}`);

      const { error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (error) {
        console.error("LogoPicker upload error", error);
        setUploading(false);
        return;
      }

      const url = await getUrlFor(filePath);
      if (modalOpen) await listFiles();
      onUpload(filePath, url);
      onSelect(filePath, url);
      setPreviewUrl(url);
    } catch (ex) {
      console.error("LogoPicker upload exception", ex);
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) handleUpload(f);
    e.target.value = null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Top row: preview + chooser button */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div
          style={{
            width: 120,
            height: 80,
            border: "1px solid #E5E7EB",
            borderRadius: 6,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fff",
          }}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Selected logo"
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />
          ) : (
            <div style={{ color: "#6B7280", fontSize: 13 }}>No logo selected</div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ color: "#6B7280", fontSize: 13 }}>
            Click to open the logo chooser (lists files from the storage bucket).
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setModalOpen(true);
                setPage(0);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #E5E7EB",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Choose logo
            </button>

            {/* Hidden input + explicit click to reliably open file dialog */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              disabled={uploading}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.click();
              }}
              disabled={uploading}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #E5E7EB",
                background: "#fff",
                cursor: uploading ? "not-allowed" : "pointer",
              }}
            >
              {uploading ? "Uploading…" : "Upload new"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal: only render when modalOpen is true */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.4)",
            zIndex: 9999,
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            style={{
              width: "min(1100px, 96%)",
              maxHeight: "90vh",
              overflow: "auto",
              background: "#fff",
              borderRadius: 8,
              padding: 16,
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 600 }}>Choose a logo</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 300 }}>
                  <CMSInput
                    label=""
                    value={search}
                    placeholder="Search filenames..."
                    onChange={(v) => {
                      setSearch(v);
                      setPage(0);
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid #E5E7EB",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Grid area */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12 }}>
              {loading ? (
                <div>Loading…</div>
              ) : files.length === 0 ? (
                <div style={{ color: "#6B7280" }}>No logos found</div>
              ) : (
                files.map((f) => (
                  <div
                    key={f.path}
                    onClick={() => {
                      setPreviewUrl(f.publicUrl);
                      onSelect(f.path, f.publicUrl);
                      setModalOpen(false);
                    }}
                    style={{
                      cursor: "pointer",
                      border: value === f.path ? "2px solid #2563EB" : "1px solid #E5E7EB",
                      borderRadius: 6,
                      padding: 8,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      background: "#fff",
                    }}
                  >
                    <div style={{ width: 96, height: 64, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src={f.publicUrl} alt={f.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    </div>
                    <div style={{ fontSize: 12, color: "#374151", textAlign: "center", wordBreak: "break-word" }}>{f.name}</div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination controls */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <div style={{ color: "#6B7280", fontSize: 13 }}>Page {page + 1}</div>

              <div style={{ display: "flex", gap: 8 }}>
                <CMSButton
                  variant="secondary"
                  onClick={async () => {
                    setPage((p) => Math.max(0, p - 1));
                    await listFiles();
                  }}
                  disabled={page === 0}
                >
                  Prev
                </CMSButton>
                <CMSButton
                  onClick={async () => {
                    setPage((p) => p + 1);
                    await listFiles();
                  }}
                  disabled={files.length < pageSize}
                >
                  Next
                </CMSButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
