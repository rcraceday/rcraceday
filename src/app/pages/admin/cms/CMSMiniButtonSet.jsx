// @cms/CMSMiniButtonSet.jsx
import CMSButton from "@cms/CMSButton";

import { useTranslation } from "@/app/i18n/I18nContext";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  SquaresPlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const gray = "#2f3033";

const miniStyle = {
  fontSize: "11px",
  padding: "4px 8px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const miniIcon = {
  width: 14,
  height: 14,
};

// --- MINI ACTION BUTTONS ---

export const MiniEditButton = ({ children = "Edit", ...props }) => (
  <CMSButton {...props} style={{ ...miniStyle, ...props.style }}>
    <PencilSquareIcon style={{ ...miniIcon, color: gray }} />
    {children}
  </CMSButton>
);

export const MiniDeleteButton = ({ children = "Delete", ...props }) => (
  <CMSButton {...props} style={{ ...miniStyle, color: gray, ...props.style }}>
    <TrashIcon style={{ ...miniIcon, color: gray }} />
    {children}
  </CMSButton>
);

export const MiniAddButton = ({ children = "Add", ...props }) => (
  <CMSButton {...props} style={{ ...miniStyle, ...props.style }}>
    <PlusIcon style={{ ...miniIcon, color: gray }} />
    {children}
  </CMSButton>
);

export const MiniBulkButton = ({ children = "Bulk", ...props }) => (
  <CMSButton {...props} style={{ ...miniStyle, ...props.style }}>
    <SquaresPlusIcon style={{ ...miniIcon, color: gray }} />
    {children}
  </CMSButton>
);

// --- MINI EXPAND / COLLAPSE ---

export const MiniExpandButton = ({ children = "Expand", ...props }) => (
  <CMSButton {...props} style={{ ...miniStyle, ...props.style }}>
    <ChevronDownIcon style={{ ...miniIcon, color: gray }} />
    {children}
  </CMSButton>
);

export const MiniCollapseButton = ({ children = "Collapse", ...props }) => (
  <CMSButton {...props} style={{ ...miniStyle, ...props.style }}>
    <ChevronRightIcon style={{ ...miniIcon, color: gray }} />
    {children}
  </CMSButton>
);

// --- MINI TRACKCARD-SPECIFIC BUTTONS ---

export const MiniAddClassButton = ({ children = "Add Class", ...props }) => (
  <CMSButton {...props} style={{ ...miniStyle, ...props.style }}>
    <PlusIcon style={{ ...miniIcon, color: gray }} />
    {children}
  </CMSButton>
);

export const MiniBulkAddButton = ({ children = "Bulk Add", ...props }) => (
  <CMSButton {...props} style={{ ...miniStyle, ...props.style }}>
    <SquaresPlusIcon style={{ ...miniIcon, color: gray }} />
    {children}
  </CMSButton>
);

export const MiniDeleteTrackButton = ({
  children = "Delete Track",
  ...props
}) => (
  <CMSButton {...props} style={{ ...miniStyle, color: gray, ...props.style }}>
    <TrashIcon style={{ ...miniIcon, color: gray }} />
    {children}
  </CMSButton>
);

// --- MINI SAVE / CANCEL ---

export const MiniSaveButton = ({ children = "Save", ...props }) => (
  <CMSButton {...props} style={{ ...miniStyle, ...props.style }}>
    {children}
  </CMSButton>
);

export const MiniCancelButton = ({ children = "Cancel", ...props }) => (
  <CMSButton
    {...props}
    style={{ ...miniStyle, color: gray, ...props.style }}
  >
    {children}
  </CMSButton>
);
