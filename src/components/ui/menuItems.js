// src/components/ui/menuItems.js
import {
  HomeIcon,
  CalendarDaysIcon,
  CalendarIcon,
  IdentificationIcon,
  UserPlusIcon,
  UsersIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  ChatBubbleLeftRightIcon,
  NewspaperIcon,
  TrophyIcon,
} from "@heroicons/react/24/solid";

export function buildMenuItems({ clubSlug, isAdmin, user, t }) {
  const tr = t || ((key) => key);

  return [
    {
      label: tr("nav.home"),
      icon: HomeIcon,
      to: `/${clubSlug}/app`,
    },
    {
      label: tr("nav.events"),
      icon: CalendarDaysIcon,
      to: `/${clubSlug}/app/events`,
    },
    {
      label: tr("nav.calendar"),
      icon: CalendarIcon,
      to: `/${clubSlug}/app/calendar`,
    },
    {
      label: tr("nav.news"),
      icon: NewspaperIcon,
      to: `/${clubSlug}/app/news`,
    },
    {
      label: tr("nav.myNoms"),
      icon: UserPlusIcon,
      to: `/${clubSlug}/app/nominations`,
    },
    {
      label: tr("nav.results"),
      icon: TrophyIcon,
      to: `/${clubSlug}/app/results`,
    },
    {
      label: tr("nav.championships"),
      icon: TrophyIcon,
      to: `/${clubSlug}/app/championships`,
    },
    {
      label: tr("nav.messages"),
      icon: ChatBubbleLeftRightIcon,
      to: `/${clubSlug}/app/messages`,
      messagesMenu: true,
    },
    {
      label: tr("nav.driverManager"),
      icon: UsersIcon,
      to: `/${clubSlug}/app/profile/drivers`,
    },
    {
      label: tr("nav.membership"),
      icon: IdentificationIcon,
      to: `/${clubSlug}/app/membership`,
    },
    {
      label: tr("nav.settings"),
      icon: Cog6ToothIcon,
      to: `/${clubSlug}/app/settings`,
    },
    ...(isAdmin
      ? [
          {
            label: tr("nav.adminPortal"),
            icon: ShieldCheckIcon,
            to: `/${clubSlug}/app/admin`,
            useAdminColor: true,
          },
        ]
      : []),
    ...(user
      ? [
          {
            label: tr("nav.logout"),
            icon: ArrowRightOnRectangleIcon,
            to: `/${clubSlug}/public/login`,
            logout: true,
          },
        ]
      : []),
  ];
}
