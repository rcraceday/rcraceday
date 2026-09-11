// src/app/pages/admin/events/eventsedit/components/SortableClassItem.jsx
import React from "react";
import CMSSelect from "@cms/CMSSelect";
import CMSButton from "@cms/CMSButton";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * SortableClassItem
 *
 * - Drag handle is integrated into the left of the selector and is visually part of the row.
 * - No separate arrow buttons.
 * - Props:
 *   - id: unique sortable id (string)
 *   - value: selected class id
 *   - availableClasses: [{id, name}, ...]
 *   - onChange(value)
 *   - onRemove()
 *   - label: label text for the selector
 */
export default function SortableClassItem({
  id,
  value,
  availableClasses = [],
  onChange,
  onRemove,
  label = "Class",
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: "flex",
    gap: 12,
    alignItems: "flex-end",
    width: "100%",
  };

  const options =
    availableClasses && availableClasses.length > 0
      ? availableClasses.map((cls) => ({ label: cls.name, value: cls.id }))
      : [];

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* integrated drag handle (same height as select) */}
      <div
        {...listeners}
        style={{
          width: 40,
          height: 40,
          borderRadius: 6,
          background: "#F3F4F6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "grab",
          fontSize: 14,
          color: "#374151",
          flexShrink: 0,
        }}
        aria-label="drag-handle"
      >
        ☰
      </div>

      <div style={{ flex: 1 }}>
        <CMSSelect
          label={label}
          value={value || ""}
          onChange={onChange}
          options={options}
          placeholder={options.length === 0 ? "No classes available" : "Select class..."}
        />
      </div>

      <div style={{ flexShrink: 0 }}>
        <CMSButton variant="danger" onClick={onRemove} style={{ height: 40, padding: "8px 12px" }}>
          Remove
        </CMSButton>
      </div>
    </div>
  );
}
