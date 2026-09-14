ClubLayout — Developer Documentation
Overview
ClubLayout is the top‑level wrapper for all club‑specific routes:

Code
/:clubSlug/public/*
/:clubSlug/app/*
/:clubSlug/app/admin/*
It is responsible for:

✔ Loading the club
✔ Applying the club’s theme (CSS variables)
✔ Providing club context to all children
✔ Rendering children exactly as-is
It does not render layout, spacing, headers, backgrounds, or containers.
It does not interfere with AppLayout or ProtectedAppRoute.

Responsibilities
1. Load the club
It uses useClub() to fetch:

club name

slug

branding colours

logo

theme settings

2. Apply theme variables
It sets CSS variables on document.documentElement:

Code
--brand-primary
--brand-primary-light
--brand-primary-dark

--brand-surface
--brand-surface-alt

--brand-text
--brand-text-muted

--brand-header-bg
--brand-header-text

--brand-logo
These variables are used by:

AppLayout

Header

Buttons

Cards

PageHeader

Future Branding admin page

3. Provide club context
All children can access the club via:

jsx
const { club } = useClub();
4. Render children without modification
It does not wrap children in containers or layout elements.

What ClubLayout Does NOT Do
❌ No layout
❌ No header
❌ No background
❌ No spacing
❌ No containers
❌ No UI
❌ No gradient
❌ No page header
❌ No Outlet context manipulation
This is critical — it ensures AppLayout remains the sole owner of layout and page structure.

Minimal Implementation
jsx
// src/app/providers/ClubLayout.jsx
import { useEffect } from "react";
import { useClub } from "@/app/providers/ClubProvider";

export default function ClubLayout({ children }) {
  const { club, loadingClub } = useClub();

  // Apply theme once club loads
  useEffect(() => {
    if (!club) return;

    const root = document.documentElement;

    root.style.setProperty("--brand-primary", club.brand_primary || "#005BBB");
    root.style.setProperty("--brand-primary-light", club.brand_primary_light || `${club.brand_primary}20`);
    root.style.setProperty("--brand-primary-dark", club.brand_primary_dark || `${club.brand_primary}cc`);

    root.style.setProperty("--brand-surface", club.surface || "#ffffff");
    root.style.setProperty("--brand-surface-alt", club.surface_alt || "#f7f7f7");

    root.style.setProperty("--brand-text", club.text || "#1a1a1a");
    root.style.setProperty("--brand-text-muted", club.text_muted || "#6b7280");

    root.style.setProperty("--brand-header-bg", club.header_bg || "#ffffff");
    root.style.setProperty("--brand-header-text", club.header_text || "#1a1a1a");

    if (club.logo_url) {
      root.style.setProperty("--brand-logo", `url(${club.logo_url})`);
    }
  }, [club]);

  if (loadingClub) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading club…
      </div>
    );
  }

  return <>{children}</>;
}
Theme Variables
These variables define the entire app’s look:

Variable	Purpose
--brand-primary	Main accent colour
--brand-primary-light	Light variant (hover, backgrounds)
--brand-primary-dark	Dark variant (borders, shadows)
--brand-surface	Card + panel background
--brand-surface-alt	Secondary surface background
--brand-text	Primary text colour
--brand-text-muted	Muted text colour
--brand-header-bg	Page header background
--brand-header-text	Page header text colour
--brand-logo	Club logo URL


These variables are used everywhere in the app.

Route Structure
ClubLayout must wrap the route, not the layout:

✔ Correct
Code
<Route
  path="/:clubSlug/app/*"
  element={
    <ClubLayout>
      <ProtectedAppRoute />
    </ClubLayout>
  }
>
  <Route element={<AppLayout />}>
    <Route index element={<Home />} />
    ...
  </Route>
</Route>
❌ Wrong
Code
<ClubLayout>
  <AppLayout />
</ClubLayout>
This breaks layout and theme inheritance.

Why This Matters
✔ Ensures consistent theme across all pages
✔ Allows clubs to change colours + logo
✔ Makes Branding admin page possible
✔ Keeps layout clean
✔ Keeps routing predictable
✔ Keeps Outlet context intact
✔ Makes the app maintainable
This is the correct architecture for a multi‑club system.

Extending ClubLayout
Developers may safely add:

additional theme variables

club‑specific feature flags

analytics hooks

global providers

Developers must not:

add layout

add UI

wrap AppLayout

override theme inside pages

swallow children

return containers that break layout