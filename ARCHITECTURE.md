Overview
The RCRaceDay app is a club‑scoped multi‑tenant application with two major route types:

Public routes (login, signup, password reset)

Private routes (app, admin)

Every route is scoped by a clubSlug, and every provider depends on the one above it. The system only works when providers and routes are composed in the correct order.

Provider Stack (MUST remain in this exact order)
Code
<AuthProvider>
  <ClubProvider>
    <ProfileProvider>
      <MembershipProvider>
        <DriverProvider>
          <NumberProvider>
            <NotificationProvider>
              <Outlet />
Why this order is required
AuthProvider restores the session and loads the user profile.

ClubProvider loads the club theme and metadata for both public and private routes.

ProfileProvider loads the user profile only when a user exists.

MembershipProvider loads membership only when user + club + profile exist.

DriverProvider loads drivers only when membership exists.

NumberProvider and NotificationProvider depend on membership and drivers.

If this order changes, the app will break.

Routing Structure (MUST remain in this order)
Code
/                          → ClubSelect
/:clubSlug                 → redirect to /:clubSlug/public/login

/:clubSlug/public/*        → PublicLayout (club only)
/:clubSlug/app/*           → AppLayout (club + user + profile + membership)
/:clubSlug/admin/*         → AdminLayout (club + user + profile + membership + admin)
Why public routes must come first
React Router matches top‑to‑bottom.
If /:clubSlug/* or /:clubSlug/app/* appears before /:clubSlug/public/*, the login page will never render.

ClubLayout Behavior (critical)
ClubLayout must operate in two modes:

Public Mode (for /public/*)
Requires club only

Does NOT require:

user

profile

membership

Must not redirect to login

Must not wait for profile or membership

Must render login/signup immediately

Private Mode (for /app/* and /admin/*)
Requires:

club

user

profile

membership

If user === null, redirect to /public/login

Must wait for all providers to finish loading

This separation prevents the “blank login page” failure.

Data Loading Sequence (MUST remain in this order)
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
If any provider runs before its prerequisites, the app will crash.

Public Route Requirements
Public routes must:

Load the club (for theme)

Not require user

Not require profile

Not require membership

Never redirect to login

Never be wrapped in private logic

Private Route Requirements
Private routes must:

Require user

Require profile

Require membership

Redirect to login if user is null

Summary Diagram
Code
┌──────────────────────────────────────────────────────────────┐
│                        AuthProvider                           │
└───────────────┬──────────────────────────────────────────────┘
                │
┌──────────────────────────────────────────────────────────────┐
│                        ClubProvider                           │
└───────────────┬──────────────────────────────────────────────┘
                │
┌──────────────────────────────────────────────────────────────┐
│                        ProfileProvider                        │
└───────────────┬──────────────────────────────────────────────┘
                │
┌──────────────────────────────────────────────────────────────┐
│                     MembershipProvider                        │
└───────────────┬──────────────────────────────────────────────┘
                │
┌──────────────────────────────────────────────────────────────┐
│                       DriverProvider                          │
└───────────────┬──────────────────────────────────────────────┘
                │
┌──────────────────────────────────────────────────────────────┐
│                 NumberProvider / NotificationProvider         │
└───────────────┬──────────────────────────────────────────────┘
                │
┌──────────────────────────────────────────────────────────────┐
│                         Layouts                               │
│   PUBLIC:  ClubLayout(public) → PublicLayout → Login, Signup  │
│   PRIVATE: ClubLayout(private) → AppLayout/AdminLayout        │
└──────────────────────────────────────────────────────────────┘
Deployment Safety
This architecture will deploy cleanly because:

Public routes no longer depend on user/profile/membership.

ClubLayout no longer blocks login pages.

Provider order is correct and stable.

All loading guards are now aligned with the routing model.

Production and local behavior are now identical.

If this architecture is preserved, you will never see:

blank login pages

“membership is null” crashes

“profile is null” crashes

infinite loading loops

provider order regressions