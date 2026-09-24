import CMSButton from "@cms/CMSButton";

import {
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  SquaresPlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";

const gray = "#2f3033";
const adminRed = "#ed2024";

// --- ACTION BUTTONS WITH ICONS ---

export const EditButton = ({ children = "Edit", ...props }) => (
  <CMSButton {...props}>
    <PencilSquareIcon style={{ width: 16, height: 16, color: gray }} />
    {children}
  </CMSButton>
);

export const DeleteButton = ({ children = "Delete", className = "", ...props }) => (
  <CMSButton
    {...props}
    className={`admin-action-btn-fixed ${className}`.trim()}
    style={{ color: gray, justifyContent: "center" }}
  >
    <TrashIcon style={{ width: 16, height: 16, color: adminRed }} />
    {children}
  </CMSButton>
);

export const RemoveButton = ({ children = "Remove", className = "", ...props }) => (
  <CMSButton
    {...props}
    className={`admin-action-btn-fixed ${className}`.trim()}
    style={{ color: gray, justifyContent: "center" }}
  >
    <TrashIcon style={{ width: 16, height: 16, color: adminRed }} />
    {children}
  </CMSButton>
);

export const DeleteEventButton = ({ children = "Delete Event", disabled, ...props }) => (
  <button type="button" className="admin-btn-danger" disabled={disabled} {...props}>
    {children}
  </button>
);

export const AddButton = ({ children = "Add", ...props }) => (
  <CMSButton {...props}>
    <PlusIcon style={{ width: 16, height: 16, color: gray }} />
    {children}
  </CMSButton>
);

export const BulkButton = ({ children = "Bulk", ...props }) => (
  <CMSButton {...props}>
    <SquaresPlusIcon style={{ width: 16, height: 16, color: gray }} />
    {children}
  </CMSButton>
);

export const ExpandButton = ({ children = "Expand", ...props }) => (
  <CMSButton {...props}>
    <ChevronDownIcon style={{ width: 16, height: 16, color: gray }} />
    {children}
  </CMSButton>
);

export const CollapseButton = ({ children = "Collapse", ...props }) => (
  <CMSButton {...props}>
    <ChevronRightIcon style={{ width: 16, height: 16, color: gray }} />
    {children}
  </CMSButton>
);

// --- SAVE / CANCEL (NO ICONS, SMALLER SIZE) ---

export const SaveButton = ({ children = "Save", ...props }) => (
  <CMSButton
    {...props}
    style={{ fontSize: "11px", padding: "4px 8px" }}
  >
    {children}
  </CMSButton>
);

export const CancelButton = ({ children = "Cancel", ...props }) => (
  <CMSButton
    {...props}
    style={{ fontSize: "11px", padding: "4px 8px", color: gray }}
  >
    {children}
  </CMSButton>
);

// --- NEW BUTTONS (UPLOAD / REMOVE IMAGE) ---

export const UploadButton = ({ children = "Upload", ...props }) => (
  <CMSButton {...props}>
    <ArrowUpTrayIcon style={{ width: 16, height: 16, color: gray }} />
    {children}
  </CMSButton>
);

export const RemoveImageButton = ({ children = "Remove Image", ...props }) => (
  <CMSButton {...props} style={{ color: "#2f3033" }}>
    <TrashIcon style={{ width: 16, height: 16, color: "#2f3033" }} />
    {children}
  </CMSButton>
);

export function ClearFieldButton({
  onClick,
  title = "Remove",
  className = "",
  style = {},
  children = "×",
  ...props
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`admin-clear-field-btn ${className}`.trim()}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
}

/** Vertically centers a clear button beside labeled CMS fields (38px control row). */
export function FieldRowClearButton({ onClick, title, ...props }) {
  return (
    <div className="admin-field-row-clear">
      <ClearFieldButton onClick={onClick} title={title} {...props} />
    </div>
  );
}
