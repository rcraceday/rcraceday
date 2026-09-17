developer-routing.md
RCRaceDay Routing Architecture — Developer Reference
1. Routing Overview
RCRaceDay uses a three‑layer routing system:

Public Routes

User App Routes

Admin Routes

Each layer has its own layout, providers, and wrappers.
Mixing these layers is what breaks the UI (admin looking like user, etc).

This file explains:

what each layer does

which layout it must use

which providers wrap it

how to restore routing if it breaks

how to safely add new routes

2. Golden Rule
Admin routes must NEVER be wrapped in ClubLayout.
If admin is inside ClubLayout, the entire admin dashboard inherits:

user header

user theme

user spacing

user CMS styles

user wrappers

This is the exact failure mode we just fixed.

3. Route Layers (Correct Structure)
A. Public Routes
Path pattern:
/:clubSlug/public/*

Layout chain:

Code
ClubProvider
  ClubLayout
    PublicLayout
      Public Pages
Used for:

login

signup

password reset

public info pages

Public pages do not require authentication.

B. User App Routes
Path pattern:
/:clubSlug/app/*

Layout chain:

Code
ClubProvider
  ClubLayout
    ProtectedAppRoute
      AppLayout
        User Pages
Used for:

events

calendar

membership

profile

drivers

style guide

User pages require authentication.

C. Admin Routes (Critical)
Path pattern:
/:clubSlug/app/admin/*

Layout chain:

Code
ClubProvider
  ProtectedAppRoute
    AdminLayout
      Admin Pages
Admin pages must NOT be wrapped in ClubLayout.

AdminLayout provides:

AdminTopBar

Admin CMS styling

Admin spacing

Admin buttons

Admin dashboard layout

If ClubLayout wraps admin, admin UI breaks.

4. Correct Admin Route Block (Copy/Paste)
jsx
<Route
  path="/:clubSlug/app/admin/*"
  element={
    <ClubProvider>
      <ProtectedAppRoute>
        <AdminLayout />
      </ProtectedAppRoute>
    </ClubProvider>
  }
>
  <Route index element={<AdminDashboard />} />
  <Route path="settings" element={<AdminSettingsIndex />} />
  <Route path="settings/club-info" element={<ClubInfoSettings />} />
  <Route path="settings/branding" element={<BrandingSettings />} />
  <Route path="settings/system" element={<SystemSettings />} />
  <Route path="settings/cms" element={<CMSSettings />} />
  <Route path="settings/users" element={<UserSettings />} />
  <Route path="settings/membership" element={<MembershipSettings />} />
  <Route path="settings/event-defaults" element={<EventDefaultsSettings />} />
  <Route path="settings/driver" element={<DriverSettings />} />
  <Route path="settings/tracks-and-classes" element={<TracksClassesSettings />} />
  <Route path="events" element={<AdminEvents />} />
  <Route path="events/new" element={<AdminEventEdit />} />
  <Route path="events/:id" element={<AdminEventEdit />} />
  <Route path="events/:id/nominations" element={<AdminEventNominations />} />
  <Route path="events/:id/nominations/export" element={<NominationsExport />} />
  <Route path="championships" element={<ChampionshipsList />} />
  <Route path="championships/create" element={<CreateChampionship />} />
</Route>
This block is the canonical version.
If admin ever breaks again, restore this block exactly.

5. How to Detect Routing Breakage
If routing breaks, you will see one of these symptoms:

Symptom A — Admin looks like user pages
Cause: Admin wrapped in ClubLayout
Fix: Restore admin block above

Symptom B — Admin header missing
Cause: AdminLayout not applied
Fix: Restore admin block above

Symptom C — Admin pages full width
Cause: ClubLayout wrapper applied
Fix: Restore admin block above

Symptom D — Admin CMS styles missing
Cause: AdminLayout bypassed
Fix: Restore admin block above

Symptom E — Admin pages show ClubLayout descriptors
Cause: Admin inside ClubLayout
Fix: Restore admin block above

6. Safe Rules for Adding New Routes
Public pages
Add inside:
/:clubSlug/public/*  
Use:
PublicLayout

User pages
Add inside:
/:clubSlug/app/*  
Use:
AppLayout

Admin pages
Add inside:
/:clubSlug/app/admin/*  
Use:
AdminLayout  
Never wrap in ClubLayout.

7. Quick Restore Checklist
If routing breaks:

Check admin block

Ensure ClubLayout is NOT wrapping admin

Ensure AdminLayout is the top-level wrapper

Ensure ProtectedAppRoute wraps admin

Ensure ClubProvider wraps admin

Ensure admin path is /:clubSlug/app/admin/*

This restores admin instantly.

8. Developer Notes
ClubLayout is ONLY for public + user pages

AdminLayout is ONLY for admin pages

AppLayout is ONLY for user pages

PublicLayout is ONLY for public pages

ClubProvider must wrap all three

ProtectedAppRoute must wrap user + admin

Admin must NEVER inherit user theme

Admin must NEVER inherit user header

Admin must NEVER inherit user wrappers

9. Version Tag
Routing Architecture v1.0 — 2026‑09‑17  
Created for Jason (Chargers RC)
Purpose: Prevent layout crossover and admin UI corruption