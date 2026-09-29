// src/components/ui/AvatarMenu.jsx
import { useState } from "react";
import { useMembership } from "@app/providers/MembershipProvider";
import UserStatusIcon from "@/components/ui/UserStatusIcon";

export default function AvatarMenu({ isAdmin, compact = false, variant = "default" }) {
  const isHeader = variant === "header";
  const [open, setOpen] = useState(false);
  const { membership } = useMembership();

  const type = membership?.membership_type;

  const label =
    type === "family"
      ? "Family Member"
      : type === "junior"
      ? "Junior Member"
      : type === "single"
      ? "Single Member"
      : type === "non_member"
      ? "Non‑Member"
      : "Member";

  return (
    <div
      className={`relative avatar-wrapper cursor-default ${
        isHeader
          ? "h-10 w-10 flex items-center justify-center shrink-0"
          : compact
            ? "flex flex-col items-center gap-0.5 leading-none"
            : "flex items-center gap-2"
      }`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className={isHeader ? "relative shrink-0" : undefined}>
        <UserStatusIcon compact={compact && !isHeader} variant={isHeader ? "header" : "default"} />

        {isHeader && isAdmin && (
          <span
            className="absolute left-1/2 bottom-0 z-10 -translate-x-1/2 translate-y-[35%] px-1 py-px text-[7px] font-bold leading-none text-white rounded-sm whitespace-nowrap"
            style={{ backgroundColor: "var(--admin-accent, #ed2024)" }}
          >
            Admin
          </span>
        )}
      </div>

      {!isHeader && compact && isAdmin && (
        <span
          className="px-1 py-0 text-[8px] font-semibold rounded text-white leading-tight"
          style={{ backgroundColor: "var(--admin-accent, #ed2024)" }}
        >
          Admin
        </span>
      )}

      {!isHeader && !compact && isAdmin && (
        <span
          className="px-2 py-0.5 text-xs font-semibold rounded-md text-white"
          style={{ backgroundColor: "var(--admin-accent, #ed2024)" }}
        >
          Admin
        </span>
      )}

      <div
        className={`avatar-dropdown ${open ? "open" : ""} ${isHeader ? "avatar-dropdown-left" : ""}`}
      >
        <div className="avatar-status">{label}</div>
      </div>
    </div>
  );
}
