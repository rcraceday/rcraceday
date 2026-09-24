// src/app/pages/admin/events/eventsedit/components/SortableClassItem.jsx
import React from "react";
import CMSSelect from "@cms/CMSSelect";
import CMSInput from "@cms/CMSInput";
import { FieldRowClearButton } from "@cms/CMSButtonSet";
import { cmsLayout } from "@cms/layout";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const CONTROL_HEIGHT = cmsLayout.controlHeight;

const alignedControlStyle = {
  height: CONTROL_HEIGHT,
  minHeight: CONTROL_HEIGHT,
  boxSizing: "border-box",
};

const LABEL_ROW_TEXT = "Max Entries";

function SortableLabelRow({ children, hidden = false }) {
  return (
    <div
      className={`sortable-class-row__label-row${hidden ? " sortable-class-row__label-row--hidden" : ""}`}
      aria-hidden={hidden ? true : undefined}
    >
      {hidden ? "\u00a0" : children}
    </div>
  );
}

export default function SortableClassItem({
  id,
  value,
  availableClasses = [],
  onChange,
  onRemove,
  label = "Class",
  maxEntries = "",
  onMaxEntriesChange,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const options =
    availableClasses && availableClasses.length > 0
      ? availableClasses.map((cls) => ({ label: cls.name, value: cls.id }))
      : [];

  const selectedLabel = options.find((opt) => opt.value === value)?.label ?? "";

  return (
    <div
      ref={setNodeRef}
      className="sortable-class-row"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <SortableLabelRow hidden>{LABEL_ROW_TEXT}</SortableLabelRow>
        <div className="sortable-class-row__control-slot">
          <div
            {...listeners}
            style={{
              width: CONTROL_HEIGHT,
              height: CONTROL_HEIGHT,
              borderRadius: 6,
              background: "#F3F4F6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "grab",
              fontSize: 14,
              color: "#374151",
              boxSizing: "border-box",
            }}
            aria-label="drag-handle"
          >
            ☰
          </div>
        </div>
      </div>

      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <SortableLabelRow>{label}</SortableLabelRow>
        <div className="sortable-class-row__control-slot sortable-class-row__control-slot--fill">
          <CMSSelect
            label=""
            value={value || ""}
            onChange={onChange}
            options={options}
            placeholder={options.length === 0 ? "No classes available" : "Select class..."}
            selectClassName="admin-class-select"
            style={{ ...alignedControlStyle, padding: "8px 10px" }}
            title={selectedLabel}
          />
        </div>
      </div>

      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <SortableLabelRow>{LABEL_ROW_TEXT}</SortableLabelRow>
        <div className="sortable-class-row__control-slot sortable-class-row__control-slot--fill">
          <CMSInput
            type="number"
            min="0"
            label=""
            value={maxEntries === null || maxEntries === undefined ? "" : String(maxEntries)}
            onChange={(v) => onMaxEntriesChange?.(v === "" ? "" : v)}
            placeholder="Unlimited"
            disabled={!value}
            inputStyle={alignedControlStyle}
          />
        </div>
      </div>

      <div className="sortable-class-row__clear" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <SortableLabelRow hidden>{LABEL_ROW_TEXT}</SortableLabelRow>
        <div className="sortable-class-row__control-slot">
          <FieldRowClearButton onClick={onRemove} />
        </div>
      </div>
    </div>
  );
}
