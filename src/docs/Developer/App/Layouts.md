developer.md — Layout & Routing Architecture
This document explains how the layout system works across the entire RC RaceDay application. It describes how public pages, authenticated user pages, and admin CMS pages are structured, themed, and routed.

The goal is to make the layout architecture predictable, maintainable, and easy to reason about.

🧩 1. Providers Overview
The app relies on two global providers for every route section:

ClubProvider
Loads the club based on /:clubSlug and provides:

club

loadingClub

club metadata (name, logo, theme overrides)

ThemeProvider
Applies the club’s branding:

colors

hero background

admin/drivers palette

theme overrides

ThemeProvider replaces all manual theme injection.

🧱 2. Layouts Overview
The app uses three layouts, each responsible for a different part of the product.

PublicLayout
Used for unauthenticated public pages:

Login

Signup

Forgot password

Reset password

Check email

Responsibilities
Centered column (maxWidth: 720px)

Public spacing

No header

No footer

Receives club via Outlet context

AppLayout
Used for authenticated user pages:

Home

Events

Calendar

Membership

Profile

Drivers

Style Guide

Responsibilities
Global header

Global footer

Centered column (maxWidth: 720px)

Theme‑aware background/text

Auth gating handled by ProtectedAppRoute

Club context forwarded to pages

Loading screens for user/profile/membership/club

AdminLayout
Used for admin CMS pages:

Dashboard

Events

Nominations

Championships

Settings

Tracks & Classes

Membership admin

Responsibilities
Admin top bar

Admin spacing

Admin background

Centered column (maxWidth: 720px)

Club context forwarded to pages

Admin theme mode (mode="admin")

Auth gating handled by ProtectedAppRoute admin

🔐 3. ProtectedAppRoute
This component ensures only authenticated users can access:

AppLayout

AdminLayout

Responsibilities
Redirect unauthenticated users to /public/login

Wait for user loading

Support admin mode for admin‑only routes

🛣️ 4. Routing Architecture (routes.jsx)
Routing is divided into three sections:

Public
Code
/:clubSlug/public/*
User App
Code
/:clubSlug/app/*
Admin CMS
Code
/:clubSlug/app/admin/*
Each section is wrapped with:

ClubProvider

ThemeProvider

(for authenticated sections) ProtectedAppRoute

Public Routes Structure
jsx
<ClubProvider>
  <ThemeProvider>
    <PublicLayout>
      <Outlet />
    </PublicLayout>
  </ThemeProvider>
</ClubProvider>
User App Routes Structure
jsx
<ClubProvider>
  <ThemeProvider>
    <ProtectedAppRoute>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ProtectedAppRoute>
  </ThemeProvider>
</ClubProvider>
Admin Routes Structure
jsx
<ClubProvider>
  <ThemeProvider mode="admin">
    <ProtectedAppRoute admin>
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    </ProtectedAppRoute>
  </ThemeProvider>
</ClubProvider>
🎨 5. Theme System
ThemeProvider merges:

base palette

club theme overrides

admin/drivers palette

hero background

Pages access theme via:

jsx
const { palette } = useTheme();
No layout sets CSS variables manually.

🧭 6. Layout Width Rules
All layouts use:

Code
maxWidth: 720px
margin: 0 auto
This ensures:

consistent spacing

predictable page structure

no full‑width drift

🧩 7. Club Context Forwarding
Every layout forwards club context:

jsx
<Outlet context={{ club }} />
Pages access it via:

jsx
const { club } = useOutletContext();
🧩 8. Loading Behavior
PublicLayout
Only waits for club load.

AppLayout
Waits for:

club

user

profile

membership

AdminLayout
Waits for:

club

user (admin)

🧱 9. Summary
The layout architecture is built around three clear layers:

PublicLayout
Unauthenticated, simple, centered.

AppLayout
Authenticated, full app structure, header + footer.

AdminLayout
Admin CMS, admin top bar, admin theme.

All layouts are wrapped by:

ClubProvider

ThemeProvider

ProtectedAppRoute (for authenticated sections)

This creates a clean, predictable, multi‑tenant layout system.