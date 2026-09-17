AppLayout — Developer Documentation
Overview
AppLayout is the primary layout for all authenticated user pages under:

Code
/:clubSlug/app/*
It provides:

Global club header

Dynamic page header (title + icon)

Full‑width gradient background

Standard page container

Theme‑driven colours

Consistent spacing and structure

Pages do not render their own headers or layout wrappers.
They only provide content + metadata.

Responsibilities
AppLayout is responsible for:

1. Rendering the global club header
This comes from Header and includes:

club logo

club name

navigation

user menu

2. Rendering the dynamic page header
This is the white bar under the global header.

It displays:

page icon

page title

Both are provided by the page using Outlet context.

3. Applying the theme
All colours come from CSS variables set by ClubLayout:

Code
--brand-primary
--brand-header-bg
--brand-header-text
--brand-text
--brand-text-muted
--brand-surface
--brand-surface-alt
4. Rendering the gradient background
The gradient is full‑width and sits below the page header.

5. Rendering page content
Content is wrapped in a centered container:

Code
max-width: 1200px
padding: 40px 16px
How Pages Provide Header Metadata
Pages do not render headers.
Instead, they pass metadata to AppLayout:

jsx
import { HomeIcon } from "@heroicons/react/24/solid";

export default function Home() {
  return (
    <Outlet context={{
      pageTitle: "Home",
      pageIcon: HomeIcon
    }} />
  );
}
Required fields:
Field	Type	Description
pageTitle	string	The title displayed in the page header
pageIcon	React component	Heroicon component rendered next to the title


If either is missing, the page header is not rendered.

Layout Structure
Code
<AppLayout>
 ├── Global Header (club)
 ├── Page Header (white bar)
 ├── Gradient Background
 │     └── Page Content (Outlet)
 └── Footer (optional)
</AppLayout>
Theme Usage
All colours come from CSS variables set by ClubLayout.

Example usage inside AppLayout:

css
background: var(--brand-header-bg);
color: var(--brand-header-text);
Gradient:

css
linear-gradient(
  to bottom,
  var(--brand-primary) 0%,
  white 40%,
  white 60%,
  var(--brand-primary) 100%
)
Icon colour:

css
color: var(--brand-primary)
This ensures:

clubs can change colours

admin branding page can update theme

no inline colours

no duplicated theme logic

Extending AppLayout
Developers may safely extend:

footer

global header

gradient style

page container spacing

Developers must not:

add layout wrappers inside pages

add page headers inside pages

override theme variables inside pages

wrap AppLayout inside other components that swallow Outlet context

Common Pitfalls
❌ Wrapping AppLayout inside another layout
This breaks Outlet context.

❌ Rendering page headers inside pages
This duplicates layout and breaks consistency.

❌ Using inline colours
Always use theme variables.

❌ Forgetting to pass pageTitle or pageIcon
The page header will not render.

Example Page
jsx
import { CalendarDaysIcon } from "@heroicons/react/24/solid";

export default function Events() {
  return (
    <Outlet context={{
      pageTitle: "Events",
      pageIcon: CalendarDaysIcon
    }} />
  );
}
Example Theme Variables (set in ClubLayout)
css
:root {
  --brand-primary: #005BBB;
  --brand-header-bg: #ffffff;
  --brand-header-text: #1a1a1a;
  --brand-surface: #ffffff;
  --brand-surface-alt: #f7f7f7;
  --brand-text: #1a1a1a;
  --brand-text-muted: #6b7280;
}