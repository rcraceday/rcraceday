export default function MenuUnreadBadge({ count, accentColor = "#0A66C2" }) {
  if (!count || count <= 0) return null;
  return (
    <span
      className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none text-white"
      style={{ backgroundColor: accentColor }}
      aria-label={`${count} unread`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
