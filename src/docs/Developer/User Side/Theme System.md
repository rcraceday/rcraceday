Theme System — Developer Documentation
Overview
The Theme System provides club‑specific branding across the entire application using a single set of CSS variables.

It is designed to be:

Simple — only one place sets theme values

Safe — limited colour options to avoid breaking UI

Scalable — supports multiple clubs with different branding

Centralized — all theme logic lives in ClubLayout

Future‑proof — ready for the Branding Admin page

Every page, component, and layout uses these variables instead of hard‑coded colours.

Where Theme Is Applied
Theme variables are set once in:

Code
src/app/providers/ClubLayout.jsx
This ensures:

Public pages

App pages

Admin pages

Layouts

Components

all share the same theme.

Theme Variables
The theme consists of 10 CSS variables that define the entire visual identity of a club.

css
:root {
  --brand-primary: #005BBB;
  --brand-primary-light: #4D8FEF;
  --brand-primary-dark: #003366;

  --brand-surface: #ffffff;
  --brand-surface-alt: #f7f7f7;

  --brand-text: #1a1a1a;
  --brand-text-muted: #6b7280;

  --brand-header-bg: #ffffff;
  --brand-header-text: #1a1a1a;

  --brand-logo: url('/default-logo.png');
}
Primary Colours
Variable	Purpose
--brand-primary	Main accent colour (buttons, icons, highlights)
--brand-primary-light	Light variant (hover, subtle backgrounds)
--brand-primary-dark	Dark variant (borders, shadows)


Surfaces
Variable	Purpose
--brand-surface	Card backgrounds
--brand-surface-alt	Secondary card backgrounds


Text
Variable	Purpose
--brand-text	Primary text
--brand-text-muted	Muted text


Header
Variable	Purpose
--brand-header-bg	Page header background
--brand-header-text	Page header text


Logo
Variable	Purpose
--brand-logo	Club logo URL


How Theme Variables Are Set
Theme variables are applied inside ClubLayout:

jsx
useEffect(() => {
  if (!club) return;

  const root = document.documentElement;

  root.style.setProperty("--brand-primary", club.brand_primary);
  root.style.setProperty("--brand-primary-light", club.brand_primary_light);
  root.style.setProperty("--brand-primary-dark", club.brand_primary_dark);

  root.style.setProperty("--brand-surface", club.surface);
  root.style.setProperty("--brand-surface-alt", club.surface_alt);

  root.style.setProperty("--brand-text", club.text);
  root.style.setProperty("--brand-text-muted", club.text_muted);

  root.style.setProperty("--brand-header-bg", club.header_bg);
  root.style.setProperty("--brand-header-text", club.header_text);

  root.style.setProperty("--brand-logo", `url(${club.logo_url})`);
}, [club]);
Important
Theme is applied globally using document.documentElement.

Theme updates automatically when the club changes.

No other file should set theme variables.

How Theme Variables Are Used
AppLayout
Gradient:

css
background: linear-gradient(
  to bottom,
  var(--brand-primary) 0%,
  white 40%,
  white 60%,
  var(--brand-primary) 100%
);
Page header:

css
background: var(--brand-header-bg);
color: var(--brand-header-text);
Icon:

css
color: var(--brand-primary);
Buttons
css
background-color: var(--brand-primary);
color: white;
Cards
css
background: var(--brand-surface);
Text
css
color: var(--brand-text);
Muted text:

css
color: var(--brand-text-muted);
Branding Admin Page
The Branding Admin page will allow clubs to update:

Primary colour

Header background

Header text colour

Surface colours

Text colours

Logo

These values will be saved in the database and automatically applied by ClubLayout.

No other part of the app needs to change.
Developer Guidelines
✔ Always use theme variables
Never hard‑code colours.

✔ Never override theme variables inside components
If a component needs a colour, use:

css
color: var(--brand-primary);
✔ Never set theme in AppLayout or pages
Theme belongs ONLY in ClubLayout.

✔ Never wrap AppLayout in another layout
It breaks theme inheritance and Outlet context.

✔ Keep theme variable names stable
Changing names breaks the entire app.

Extending the Theme
Developers may safely add:

--brand-border

--brand-radius

--brand-shadow

--brand-button-hover

But only if needed for new UI components.

Common Pitfalls
❌ Hard‑coding colours
Breaks multi‑club branding.

❌ Setting theme variables in multiple files
Causes inconsistent UI.

❌ Using inline styles instead of CSS variables
Prevents theme updates.

❌ Adding layout to ClubLayout
Breaks AppLayout.