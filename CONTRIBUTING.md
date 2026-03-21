Contributing to RCRaceDay
This document explains how to safely contribute to the RCRaceDay codebase. The platform is a multi‑club, multi‑tenant system with strict architectural rules. Following these guidelines ensures stability, prevents regressions, and keeps the app predictable for clubs and racers.

🧭 Core Principles
Public and private routes must never mix.

Provider order must never change.

Every provider must wait for its prerequisites.

ClubLayout must treat public and private routes differently.

No component should assume data exists unless its provider guarantees it.

Breaking any of these rules can cause blank screens, infinite loading, or provider crashes.

🏗️ Provider Architecture (MUST remain in this exact order)
Code
<AuthProvider>
  <ClubProvider>
    <ProfileProvider>
      <MembershipProvider>
        <DriverProvider>
          <NumberProvider>
            <NotificationProvider>
              <Outlet />
What each provider depends on
AuthProvider — no dependencies

ClubProvider — depends on router (clubSlug)

ProfileProvider — depends on user

MembershipProvider — depends on user + club + profile

DriverProvider — depends on membership

NumberProvider — depends on membership/drivers

NotificationProvider — depends on club + user

If you add a new provider, place it after all providers it depends on and before all providers that depend on it.

Never wrap public routes in providers that require user/profile/membership.

🧭 Routing Rules
Route order (MUST remain in this order)
Code
/                          → ClubSelect
/:clubSlug                 → redirect to /:clubSlug/public/login

/:clubSlug/public/*        → PublicLayout (club only)
/:clubSlug/app/*           → AppLayout (club + user + profile + membership)
/:clubSlug/admin/*         → AdminLayout (club + user + profile + membership + admin)
Why this order matters
React Router matches top‑to‑bottom.
If private routes appear before public routes, the login page will never render.

Adding new routes
Public pages → add under /:clubSlug/public/*

Authenticated pages → add under /:clubSlug/app/*

Admin pages → add under /:clubSlug/admin/*

Never create new top‑level club routes outside these three groups.

🎨 ClubLayout Rules
ClubLayout has two modes:

Public Mode (/public/*)
Requires club only

Must not require user, profile, or membership

Must not redirect to login

Must render login/signup immediately

Private Mode (/app/*, /admin/*)
Requires club + user + profile + membership

Redirects to login if user is null

Must wait for all providers to finish loading

If you modify ClubLayout, ensure both modes remain intact.

🔄 Data Loading Sequence
Each provider must wait for its prerequisites:

Code
AuthProvider:
  getSession()
  getUser()
  loadProfile()

ClubProvider:
  loadClub()

ProfileProvider:
  loadProfile()   ← only if user exists

MembershipProvider:
  loadMembership() ← only if user + club + profile exist

DriverProvider:
  loadDrivers()    ← only if membership exists
If you add new data dependencies, follow this pattern.

🧪 Adding New Pages
When adding a new page:

Decide whether it is public, private, or admin.

Place it in the correct folder:

pages/public/

pages/home/, pages/events/, etc.

pages/admin/

Add it to the correct route group in routes.jsx.

Ensure it does not assume data that its provider has not guaranteed.

Example mistakes to avoid
Using useProfile() on a public page

Using useMembership() before membership is loaded

Using useClub() outside club‑scoped routes

Adding a new route under /:clubSlug/* instead of /public/* or /app/*

🧱 Adding New Providers
If you add a new provider:

Identify what it depends on

Identify what depends on it

Insert it into AppProviders.jsx in the correct position

Never wrap public routes in providers that require user/profile/membership

If unsure, update ARCHITECTURE.md with a dependency diagram.

🧼 Code Style
Use full files when making changes (no patches).

Keep providers pure and predictable.

Avoid side effects in components.

Prefer hooks for data access (useAuth, useClub, useProfile, etc.).

Keep logs during development; remove noisy logs before production.

🧪 Testing Checklist (before pushing)
Visit /chargers-rc/public/login while logged out → login page must appear

Visit /chargers-rc/app while logged out → must redirect to login

Visit /chargers-rc/app while logged in → app loads normally

Visit /chargers-rc/admin as non-admin → must redirect or deny access

Switch clubs → theme updates correctly

Refresh on any route → no crashes, no blank screens

📘 Architecture Reference
See ARCHITECTURE.md for the full provider and routing diagram.