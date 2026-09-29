// src/components/ui/UserStatusIcon.jsx
import { useAuth } from "@/app/providers/AuthProvider";
import { useMembership } from "@app/providers/MembershipProvider";
import useTheme from "@/app/providers/useTheme";

export default function UserStatusIcon({ compact = false, variant = "default" }) {
  const { user } = useAuth();
  const { membership } = useMembership();
  const { palette } = useTheme();
  const brand = palette?.primary || "#00438a";

  // Extract initials from user full name
  const fullName = user?.user_metadata?.full_name || user?.full_name || "";
  const parts = fullName.trim().split(" ");
  const firstInitial = parts[0]?.[0] || "";
  const lastInitial = parts[1]?.[0] || "";
  const initials = (firstInitial + lastInitial).toUpperCase();

  // Membership badge text
  const type = membership?.membership_type;
  const badge =
    type === "family" ? "FM" :
    type === "junior" ? "JM" :
    type === "single" ? "SM" :
    type === "non_member" ? "NM" :
    "";

  const isHeader = variant === "header";
  const sizeClass = isHeader
    ? "w-7 h-7 text-[11px]"
    : compact
      ? "w-4 h-4 text-[9px]"
      : "w-8 h-8 text-sm";
  const badgeSize = isHeader
    ? "w-3.5 h-3.5 text-[6px]"
    : compact
      ? "w-2 h-2 text-[5px]"
      : "w-4 h-4 text-[8px]";
  const wrapClass = isHeader ? "w-7 h-7" : compact ? "w-4 h-4" : "w-8 h-8";

  return (
    <div className={`relative select-none ${wrapClass}`}>
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center text-white font-semibold leading-none`}
        style={{ backgroundColor: brand }}
      >
        {initials}
      </div>

      {badge && (
        <div
          className={`absolute bottom-0 right-0 ${badgeSize} rounded-full bg-green-600 font-bold text-white flex items-center justify-center leading-none`}
        >
          {badge}
        </div>
      )}
    </div>
  );
}
