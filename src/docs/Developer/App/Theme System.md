Theme System — Developer Documentation (2026 Architecture)
🧩 Overview
The Theme System provides club‑specific branding across the entire application using a centralized React context called ThemeProvider.

It is designed to be:

Simple — theme values come from one provider

Safe — only approved palette fields can be overridden

Scalable — supports unlimited clubs with unique branding

Centralized — all theme logic lives in ThemeProvider

Future‑proof — integrates directly with Branding Admin

Every page, component, and layout uses the theme via React context, not CSS variables.

🧱 Where Theme Is Applied
Theme is applied once inside:

Code
src/app/providers/ThemeProvider.jsx
This ensures:

Public pages

App pages

Admin pages

Layouts

Components

all share the same theme.

ThemeProvider wraps each route section in routes.jsx:

jsx
<ClubProvider>
  <ThemeProvider>
    <PublicLayout />
  </ThemeProvider>
</ClubProvider>
jsx
<ClubProvider>
  <ThemeProvider>
    <ProtectedAppRoute>
      <AppLayout />
    </ProtectedAppRoute>
  </ThemeProvider>
</ClubProvider>
jsx
<ClubProvider>
  <ThemeProvider mode="admin">
    <ProtectedAppRoute admin>
      <AdminLayout />
    </ProtectedAppRoute>
  </ThemeProvider>
</ClubProvider>
🎨 Theme Structure
The theme consists of a palette object provided by ThemeProvider:

js
{
  primary,
  primaryLight,
  primaryDark,

  surface,
  surfaceAlt,

  text,
  textMuted,

  headerBg,
  headerText,

  logoUrl
}
These values come from:

Base palette

Club theme overrides

Admin/drivers palette (mode-based)

🧩 How Theme Is Set (ThemeProvider)
ThemeProvider merges all theme sources:

jsx
const palette = {
  ...basePalette,
  ...clubThemeOverrides,
  ...(mode === "admin" ? adminPalette : {}),
  ...(mode === "drivers" ? driversPalette : {})
};
It then exposes the theme via React context:

jsx
const { palette, logoUrl } = useTheme();
Important
Theme is not applied via CSS variables

Theme is not set via document.documentElement

Theme is not set inside layouts

Theme updates automatically when the club changes

No other file should modify theme values

🧱 How Theme Is Used
Components and layouts access theme using:

jsx
import { useTheme } from "@/app/providers/useTheme";

const { palette } = useTheme();
Examples
AppLayout background:
jsx
backgroundColor: palette.background
Header:
jsx
backgroundColor: palette.headerBg
color: palette.headerText
Buttons:
jsx
backgroundColor: palette.primary
color: "#fff"
Cards:
jsx
backgroundColor: palette.surface
Text:
jsx
color: palette.text
Muted text:
jsx
color: palette.textMuted
🛠 Branding Admin Page
The Branding Admin page allows clubs to update:

Primary colour

Header background

Header text colour

Surface colours

Text colours

Logo

These values are saved in the database and automatically applied by ThemeProvider.

No other part of the app needs to change.

📐 Developer Guidelines
✔ Always use theme values
Never hard‑code colours.

✔ Never override theme inside components
Use:

jsx
color: palette.primary
✔ Never set theme in layouts
ThemeProvider is the only place theme is defined.

✔ Keep theme field names stable
Changing names breaks the entire app.

✔ Use mode="admin" or mode="drivers" when needed
Admin and driver portals have their own palettes.

🧩 Extending the Theme
Developers may safely add:

border

radius

shadow

buttonHover

But only inside ThemeProvider, never inside layouts or components.

⚠️ Common Pitfalls
❌ Hard‑coding colours
Breaks multi‑club branding.

❌ Setting theme in multiple files
Causes inconsistent UI.

❌ Using inline colours instead of palette
Prevents theme updates.

❌ Adding theme logic to layouts
ThemeProvider must remain the single source of truth.