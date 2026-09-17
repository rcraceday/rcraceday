providers.md
RCRaceDay Provider Architecture — Developer Reference
1. Purpose
This document explains the provider system used across RCRaceDay.

It covers:

What each provider does

Where each provider lives

Which parts of the app depend on which provider

How providers must be nested

How to safely add new providers

How to restore provider integrity if anything breaks

This prevents:

missing context

broken layouts

undefined user/club/profile data

inconsistent theme behavior

admin/user/public context crossover

2. Provider Files (Actual)
Your project contains the following providers:

Code
src/app/providers/
  AppContext.jsx
  AppProviders.jsx
  AuthProvider.jsx
  ClubProvider.jsx
  DriverContext.jsx
  DriverProvider.jsx
  MembershipProvider.jsx
  NotificationContext.jsx
  NotificationProvider.jsx
  NumberProvider.jsx
  ProfileContext.jsx
  ProfileProvider.jsx
  RacerDirectoryContext.jsx
  RacerDirectoryProvider.jsx
  ThemeProvider.jsx
  useTheme.js
These providers form the global state backbone of RCRaceDay.

3. Provider Responsibilities
A. AuthProvider.jsx
Purpose: Authentication state
Provides:

user

loadingUser

signIn()

signOut()

session refresh

Supabase auth integration

Used by:

ProtectedAppRoute

AppLayout

AdminLayout

User pages

Admin pages

B. ClubProvider.jsx
Purpose: Club context
Provides:

club (name, colors, settings, branding)

club loading state

club theme injection (via applyClubTheme)

Used by:

ClubLayout

AppLayout

AdminLayout

PublicLayout

All club‑scoped pages

C. ProfileProvider.jsx
Purpose: User profile data
Provides:

profile

loadingProfile

profile update functions

Used by:

AppLayout

User pages

Admin pages (when editing users)

D. MembershipProvider.jsx
Purpose: Membership state
Provides:

membership status

membership renewal/join/upgrade logic

membership pricing

Used by:

Membership pages

Admin membership management

AppLayout (loading gate)

E. DriverProvider.jsx
Purpose: Driver management
Provides:

driver list

driver profile

driver editing

driver creation

driver number selection

Used by:

DriverManager

AddDriver

EditProfile

DriverProfile

Admin driver tools

F. RacerDirectoryProvider.jsx
Purpose: Global racer directory
Provides:

racer search

racer filtering

racer metadata

Used by:

RacerDirectory

Admin racer tools

G. NotificationProvider.jsx
Purpose: Global notifications
Provides:

toast notifications

alerts

banners

global message queue

Used by:

AppLayout

AdminLayout

User pages

Admin pages

H. NumberProvider.jsx
Purpose: Driver number assignment
Provides:

available numbers

number validation

number reservation

Used by:

ChooseNumber

DriverProfile

Admin driver tools

I. ThemeProvider.jsx
Purpose: Global theme state
Provides:

dark/light mode

theme toggling

theme persistence

Used by:

AppLayout

PublicLayout

AdminLayout

ClubLayout

J. AppProviders.jsx
Purpose: Provider composition
Provides:

A single place to wrap multiple providers

Used in main.jsx or top‑level app entry

4. Provider Nesting (Canonical)
Public Pages
Code
ClubProvider
  ThemeProvider
    NotificationProvider
      PublicLayout
User App Pages
Code
ClubProvider
  AuthProvider
    ProfileProvider
      MembershipProvider
        ThemeProvider
          NotificationProvider
            DriverProvider (only in driver pages)
              AppLayout
Admin Pages
Code
ClubProvider
  AuthProvider
    ProfileProvider
      MembershipProvider
        ThemeProvider
          NotificationProvider
            AdminLayout
This ensures:

club data is always available

auth state is always available

profile/membership data loads before layout

theme is applied globally

notifications work everywhere

5. Routing + Provider Interaction
ProtectedAppRoute
Depends on:

AuthProvider

ClubProvider

Used for:

User routes

Admin routes

AppLayout
Depends on:

AuthProvider

ProfileProvider

MembershipProvider

ClubProvider

ThemeProvider

AdminLayout
Depends on:

AuthProvider

ClubProvider

ThemeProvider

Admin pages do not depend on ClubLayout.

6. Safe Rules for Adding New Providers
✔ Wrap providers at the highest level where they are needed
✔ Never wrap admin routes in ClubLayout
✔ Never wrap providers inside individual pages unless scoped
✔ Keep provider order consistent
✔ Keep provider responsibilities separated
7. How to Restore Provider Integrity if Broken
Symptom: user or admin pages show “undefined” club
Fix: Ensure ClubProvider wraps all routes.

Symptom: user pages redirect to login unexpectedly
Fix: Ensure AuthProvider wraps /app/* and /app/admin/*.

Symptom: profile or membership data missing
Fix: Ensure ProfileProvider and MembershipProvider wrap user/admin routes.

Symptom: theme not applying
Fix: Ensure ThemeProvider wraps all layouts.

Symptom: notifications not appearing
Fix: Ensure NotificationProvider wraps all layouts.

8. Version Tag
Provider Architecture v1.0 — 2026‑09‑17  
Aligned with your actual provider tree and routing structure.