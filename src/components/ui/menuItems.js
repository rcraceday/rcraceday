// src/components/ui/menuItems.js
import {
  HomeIcon,
  CalendarDaysIcon,
  CalendarIcon,
  IdentificationIcon,
  UserCircleIcon,
  UserPlusIcon,
  UsersIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/solid";

export function buildMenuItems({ clubSlug, isAdmin, user }) {
  return [
    {
      label: "Home",
      icon: HomeIcon,
      to: `/${clubSlug}/app`,
    },
    {
      label: "Events",
      icon: CalendarDaysIcon,
      to: `/${clubSlug}/app/events`,
    },
    {
      label: "Calendar",
      icon: CalendarIcon,
      to: `/${clubSlug}/app/calendar`,
    },
    {
      label: "My Noms",
      icon: UserPlusIcon,
      to: `/${clubSlug}/app/nominations`,
    },
    {
      label: "Driver Manager",
      icon: UsersIcon,
      to: `/${clubSlug}/app/profile/drivers`,
    },
        {
      label: "Membership",
      icon: IdentificationIcon,
      to: `/${clubSlug}/app/membership`,
    },

        {
      label: "User Account",
      icon: UserCircleIcon,
      to: `/${clubSlug}/app/profile`,
    },

    {
      label: "Settings",
      icon: Cog6ToothIcon,
      to: `/${clubSlug}/app/settings`,
    },
    ...(isAdmin
      ? [
          {
            label: "Admin Portal",
            icon: ShieldCheckIcon,
            to: `/${clubSlug}/app/admin`,
            useAdminColor: true,
          },
        ]
      : []),
    ...(user
      ? [
          {
            label: "Logout",
            icon: ArrowRightOnRectangleIcon,
            to: `/${clubSlug}/public/login`,
            logout: true,
          },
        ]
      : []),
  ];
}
