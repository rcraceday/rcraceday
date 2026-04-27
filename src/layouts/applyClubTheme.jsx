export function applyClubTheme(club) {
  if (!club) return;

  const root = document.documentElement;

  root.style.setProperty("--primary", club.primary_color || "#005BBB");
  root.style.setProperty("--button-bg", club.button_color || club.primary_color || "#005BBB");
  root.style.setProperty("--button-text", club.button_text_color || "#FFFFFF");
  root.style.setProperty("--header-text", club.header_text_color || "#FFFFFF");
}
