Page Structure Guidelines — Developer Documentation
Overview
Every page under:

Code
/:clubSlug/app/*
must follow a consistent structure so that:

layout is unified

theme is applied correctly

page headers are consistent

spacing is predictable

components behave the same across all pages

Pages do not render their own layout, header, background, or spacing wrappers.
All layout responsibilities belong to AppLayout.

Pages only provide:

✔ Page metadata (title + icon)
✔ Page content
✔ Page‑specific logic
Nothing else.

Page Structure Template
Every page must follow this structure:

jsx
import { SomeIcon } from "@heroicons/react/24/solid";

export default function PageName() {
  return (
    <Outlet context={{
      pageTitle: "Page Name",
      pageIcon: SomeIcon
    }}>
      {/* PAGE CONTENT GOES HERE */}
    </Outlet>
  );
}
Required fields:
Field	Type	Description
pageTitle	string	Title shown in the white header bar
pageIcon	Heroicon component	Icon shown next to the title


If either is missing, the page header will not render.

Page Content Rules
✔ 1. No page header markup
Do not write:

<section>

<header>

<h1>

icons

borders

backgrounds

The header is rendered by AppLayout.

✔ 2. No layout wrappers
Do not write:

full‑width containers

background gradients

page padding

max‑width wrappers

AppLayout already provides:

Code
max-width: 1200px
padding: 40px 16px
gradient background
white header bar
global header
✔ 3. Use theme variables for all colours
Never hard‑code colours.

Use:

css
color: var(--brand-primary);
background: var(--brand-surface);
color: var(--brand-text-muted);
✔ 4. Use standard spacing
Inside the page content:

vertical spacing: space-y-8

section spacing: mb-2 or mb-4

card spacing: p-4

grid spacing: gap-3 or gap-4

This keeps all pages visually consistent.

✔ 5. Use standard section structure
Each section should follow this pattern:

jsx
<section className="flex flex-col gap-4">
  <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-text-muted mb-2">
    Section Title
  </h2>

  {/* Section content */}
</section>
This ensures:

consistent typography

consistent spacing

consistent hierarchy

✔ 6. Use standard card structure
jsx
<div className="rounded-md p-4 bg-[var(--brand-surface)] shadow-sm">
  {/* Card content */}
</div>
✔ 7. Use standard button structure
jsx
<Button
  className="!rounded-md !px-3 !py-2 text-sm font-medium"
  style={{ backgroundColor: "var(--brand-primary)" }}
>
  Label
</Button>
Page Structure Example — Home
jsx
import { HomeIcon } from "@heroicons/react/24/solid";

export default function Home() {
  return (
    <Outlet context={{
      pageTitle: "Home",
      pageIcon: HomeIcon
    }}>
      <main className="max-w-[720px] mx-auto px-4 pb-10 flex flex-col space-y-8">

        {/* Section */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-text-muted mb-2">
            Coming Events
          </h2>

          {/* Cards */}
        </section>

        {/* Section */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-text-muted mb-2">
            Quick Actions
          </h2>

          {/* Buttons */}
        </section>

      </main>
    </Outlet>
  );
}
Common Pitfalls
❌ Rendering headers inside pages
Breaks layout consistency.

❌ Hard‑coding colours
Breaks multi‑club branding.

❌ Adding full‑width wrappers
Breaks AppLayout’s gradient + spacing.

❌ Using inline spacing everywhere
Use Tailwind spacing utilities instead.

❌ Forgetting to pass pageTitle/pageIcon
Page header disappears.

Developer Checklist
Before submitting a page:

[ ] Does the page use <Outlet context={...}>?

[ ] Does the page avoid rendering its own header?

[ ] Does the page avoid layout wrappers?

[ ] Are all colours theme variables?

[ ] Are sections structured consistently?

[ ] Are cards using the standard card pattern?

[ ] Are buttons using the standard button pattern?

[ ] Is spacing consistent with other pages?

If all are YES — the page is correct.