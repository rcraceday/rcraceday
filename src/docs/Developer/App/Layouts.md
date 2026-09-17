layouts.md
RCRaceDay Layout Architecture — Developer Reference
1. Purpose
This document defines the layout system used across RCRaceDay.
It explains:

What each layout does

Where each layout lives

Which routes use which layout

How layouts must be nested

How to safely add new pages

How to restore layout integrity if anything breaks

This prevents layout crossover issues such as:

Admin pages inheriting user layout

User pages inheriting admin layout

Public pages inheriting club layout incorrectly

Theme bleed between sections

2. Layout Components (Actual Files)
Your project contains four layout components:

Code
src/layouts/AppLayout.jsx
src/layouts/ClubLayout.jsx
src/layouts/PublicLayout.jsx
src/layouts/AdminLayout.jsx
These are the only layout components in the system.

Each layout has a specific responsibility and must only be used in its correct routing layer.

3. Layout Responsibilities
A. ClubLayout.jsx
Location: src/layouts/ClubLayout.jsx  
Used for: Public + User App routes
Provides:

Club theme injection

Club header (user header)

Public header (for /public/*)

Global page wrapper

Footer

Club context

Public/private route branching

Never used for admin routes.

B. AppLayout.jsx
Location: src/layouts/AppLayout.jsx  
Used for: Authenticated user app pages
Provides:

User header

User theme

User spacing

User wrappers

<Outlet context={{ club }}>

Auth gating (via ProtectedAppRoute)

Never used for admin or public routes.

C. PublicLayout.jsx
Location: src/layouts/PublicLayout.jsx  
Used for: Public pages (login, signup, password reset)
Provides:

Public header

Public spacing

Public wrappers

Public theme

Never used for user or admin routes.

D. AdminLayout.jsx
Location: src/layouts/AdminLayout.jsx  
Used for: Admin dashboard + CMS
Provides:

<AdminTopBar />

Admin background

Admin spacing

Admin maxWidth (720px)

Admin theme isolation

<Outlet context={ctx}> forwarding club context

Never wrapped in ClubLayout.  
Never used for user or public routes.

4. Correct Layout Nesting (Canonical)
Public Pages
Code
ClubProvider
  ClubLayout
    PublicLayout
      Public pages
User App Pages
Code
ClubProvider
  ClubLayout
    ProtectedAppRoute
      AppLayout
        User pages
Admin Pages
Code
ClubProvider
  ProtectedAppRoute
    AdminLayout
      Admin pages
This is the only correct layout structure.

5. Routing Rules (Critical)
Rule 1 — Admin routes must NOT use ClubLayout
If admin is wrapped in ClubLayout:

Admin header disappears

Admin spacing breaks

Admin CMS styles break

Admin pages look like user pages

This was the root cause of the previous failure.

Rule 2 — AdminLayout must be the top-level admin wrapper
AdminLayout is the admin equivalent of AppLayout and PublicLayout.

Rule 3 — ClubLayout is ONLY for public + user routes
Never admin.

Rule 4 — ProtectedAppRoute wraps both user + admin
But only user routes get ClubLayout.

Rule 5 — All layouts must render <Outlet />
This ensures nested pages render correctly.

6. Safe Pattern for Adding New Pages
Public page
Add under:
/:clubSlug/public/*  
Uses:
PublicLayout inside ClubLayout

User app page
Add under:
/:clubSlug/app/*  
Uses:
AppLayout inside ClubLayout

Admin page
Add under:
/:clubSlug/app/admin/*  
Uses:
AdminLayout directly
Never wrap in ClubLayout.

7. How to Restore Layout Integrity if Broken
Symptom: Admin looks like user pages
Fix: Remove ClubLayout from admin routes

Symptom: Admin header missing
Fix: Ensure AdminLayout is top-level wrapper

Symptom: Admin pages full width
Fix: Ensure AdminLayout is applied

Symptom: Public pages show user header
Fix: Ensure PublicLayout is inside ClubLayout

Symptom: User pages show admin header
Fix: Ensure AppLayout is used for /app/*

8. Version Tag
Layouts Architecture v1.2 — 2026‑09‑17  
Updated after moving AdminLayout.jsx into /src/layouts.