// src/components/ui/UserStatusIcon.jsx
import { useAuth } from "@/app/providers/AuthProvider";
import { useMembership } from "@app/providers/MembershipProvider";
import useTheme from "@/app/providers/useTheme";

export default function UserStatusIcon() {
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

  return (
    <div className="relative w-8 h-8 select-none">
      {/* Avatar circle using the SAME blue as buttons */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold"
        style={{ backgroundColor: brand }}
      >
        {initials}
      </div>

      {/* Membership badge */}
      {badge && (
        <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-600 text-[8px] font-bold text-white flex items-center justify-center">
          {badge}
        </div>
      )}
    </div>
  );
}
