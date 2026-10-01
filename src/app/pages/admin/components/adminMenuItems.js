import {
  Squares2X2Icon,
  CalendarDaysIcon,
  UserPlusIcon,
  IdentificationIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ArchiveBoxIcon,
  HomeIcon,
  ChatBubbleLeftRightIcon,
  NewspaperIcon,
  TrophyIcon,
} from "@heroicons/react/24/solid";

export function buildAdminMenuItems({ clubSlug, t }) {
  const tr = t || ((key) => key);

  return [
    {
      label: tr("adminNav.dashboard"),
      icon: Squares2X2Icon,
      to: `/${clubSlug}/app/admin`,
    },
    {
      label: tr("adminNav.events"),
      icon: CalendarDaysIcon,
      to: `/${clubSlug}/app/admin/events`,
    },
    {
      label: tr("adminNav.nominations"),
      icon: UserPlusIcon,
      to: `/${clubSlug}/app/admin/nominations`,
    },
    {
      label: tr("adminNav.messages"),
      icon: ChatBubbleLeftRightIcon,
      to: `/${clubSlug}/app/admin/messages`,
      messagesMenu: true,
    },
    {
      label: tr("adminNav.news"),
      icon: NewspaperIcon,
      to: `/${clubSlug}/app/admin/news`,
    },
    {
      label: tr("adminNav.membership"),
      icon: IdentificationIcon,
      to: `/${clubSlug}/app/admin/membership`,
    },
    {
      label: tr("adminNav.drivers"),
      icon: UserGroupIcon,
      to: `/${clubSlug}/app/admin/drivers`,
    },
    {
      label: tr("adminNav.championships"),
      icon: TrophyIcon,
      to: `/${clubSlug}/app/admin/championships`,
    },
    {
      label: tr("adminNav.settings"),
      icon: Cog6ToothIcon,
      to: `/${clubSlug}/app/admin/settings`,
    },
    {
      label: tr("adminNav.archives"),
      icon: ArchiveBoxIcon,
      to: `/${clubSlug}/app/admin/archives`,
    },
    {
      label: tr("adminNav.home"),
      icon: HomeIcon,
      to: `/${clubSlug}/app`,
      usePrimaryColor: true,
    },
  ];
}
