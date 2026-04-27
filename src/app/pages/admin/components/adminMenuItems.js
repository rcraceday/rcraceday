// src/app/pages/admin/components/adminMenuItems.js
import {
  Squares2X2Icon,
  CalendarDaysIcon,
  UserPlusIcon,
  IdentificationIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";

export function buildAdminMenuItems({ clubSlug }) {
  return [
    {
      label: "Dashboard",
      icon: Squares2X2Icon,
      to: `/${clubSlug}/app/admin`,
    },
    {
      label: "Events",
      icon: CalendarDaysIcon,
      to: `/${clubSlug}/app/admin/events`,
    },
    {
      label: "Nominations",
      icon: UserPlusIcon,
      to: `/${clubSlug}/app/admin/nominations`,
    },
    {
      label: "Membership",
      icon: IdentificationIcon,
      to: `/${clubSlug}/app/admin/membership`,
    },
    {
      label: "Drivers",
      icon: UserGroupIcon,
      to: `/${clubSlug}/app/admin/drivers`,
    },
    {
      label: "Settings",
      icon: Cog6ToothIcon,
      to: `/${clubSlug}/app/admin/settings`,
    },
    {
      label: "Home",
      icon: HomeIcon,
      to: `/${clubSlug}/app`,   // ⭐ NEW HOME LINK
    },
  ];
}
