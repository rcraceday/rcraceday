// src/components/ui/AvatarMenu.jsx
import { useState } from "react";
import { useMembership } from "@app/providers/MembershipProvider";
import UserStatusIcon from "@/components/ui/UserStatusIcon";

export default function AvatarMenu({ isAdmin }) {
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
      className="relative avatar-wrapper cursor-default flex items-center gap-2"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <UserStatusIcon />

      {isAdmin && (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-blue-600 text-white">
          Admin
        </span>
      )}

      <div className={`avatar-dropdown ${open ? "open" : ""}`}>
        <div className="avatar-status">{label}</div>
      </div>
    </div>
  );
}
