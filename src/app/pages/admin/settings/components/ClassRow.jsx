// components/ClassRow.jsx
import CMSInput from "@cms/CMSInput";
import CMSTextarea from "@cms/CMSTextarea";

import {
  MiniEditButton,
  MiniDeleteButton,
  MiniSaveButton,
  MiniCancelButton,
} from "@cms/CMSMiniButtonSet";

export default function ClassRow({
  cls,
  isEditing,

  editClassName,
  editClassDesc,

  onStartEditClass,
  onCancelEditClass,
  onSaveEditClass,
  onDeleteClass,

  setEditClassName,
  setEditClassDesc,

  trackId,
  LivetimeNotice,
}) {
  return (
    <div
      style={{
        padding: "6px 0",
        borderTop: "1px solid #E5E7EB",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      {!isEditing ? (
        <>
          {/* Header row: name + buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: "13px" }}>
              {cls.name}
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              <MiniEditButton onClick={() => onStartEditClass(trackId, cls)}>
                Edit
              </MiniEditButton>

              <MiniDeleteButton onClick={() => onDeleteClass(trackId, cls.id)}>
                Delete
              </MiniDeleteButton>
            </div>
          </div>

          {/* Description stays stable — DO NOT MOVE THIS */}
          {cls.description && (
            <div
              style={{
                fontSize: "11px",
                color: "#6B7280",
              }}
            >
              {cls.description}
            </div>
          )}
        </>
      ) : (
        <>
          <CMSInput
            label="Class Name"
            value={editClassName}
            onChange={(value) => setEditClassName(value)}
          />

          <CMSTextarea
            label="Description (optional)"
            value={editClassDesc}
            onChange={(value) => setEditClassDesc(value)}
          />

          <LivetimeNotice />

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
              marginTop: "6px",
            }}
          >
            <MiniSaveButton onClick={() => onSaveEditClass(trackId)}>
              Save
            </MiniSaveButton>

            <MiniCancelButton onClick={onCancelEditClass}>
              Cancel
            </MiniCancelButton>
          </div>
        </>
      )}
    </div>
  );
}
