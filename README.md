RCRaceDay — Multi‑Club RC Racing Platform
RCRaceDay is a multi‑tenant SaaS platform for RC racing clubs. Each club has its own theme, branding, membership system, events, drivers, and admin tools — all under a unified architecture designed for scalability and clarity.

This document provides a complete overview of the project structure, routing model, provider architecture, and development workflow.

🚀 Features
Multi‑club architecture using /:clubSlug/* routing

Club‑scoped public and private routes

Full membership system (join, renew, upgrade)

Driver management

Event calendar, event details, nominations

Admin dashboard with class manager, event editor, championships

Theming system driven by club configuration

PWA‑ready with service worker + manifest

Supabase backend for auth, profiles, clubs, memberships, drivers, events, and admin roles

📁 Project Structure
Code
src/
  app/
    providers/
      AuthProvider.jsx
      ClubProvider.jsx
      ProfileProvider.jsx
      MembershipProvider.jsx
      DriverProvider.jsx
      NumberProvider.jsx
      NotificationProvider.jsx
      ClubLayout.jsx
      AppProviders.jsx

    pages/
      global/
      public/
      home/
      events/
      profile/
      membership/
      admin/

    routes.jsx

  layouts/
    PublicLayout.jsx
    AppLayout.jsx
    AdminLayout.jsx

  supabaseClient.js
  main.jsx
🧭 Routing Model
RCRaceDay uses a strict routing hierarchy to ensure public and private routes behave correctly.

Global Routes
Code
/                       → ClubSelect
Club‑Scoped Public Routes
Code
/:clubSlug/public/login
/:clubSlug/public/signup
/:clubSlug/public/forgot-password
/:clubSlug/public/reset-password
Club‑Scoped Private Routes
Code
/:clubSlug/app/*        → authenticated user area
/:clubSlug/admin/*      → admin-only area
Redirects
Code
/:clubSlug              → /:clubSlug/public/login
Public routes must always be matched before private routes.

🏗️ Provider Architecture
The provider stack is the backbone of the app. It must remain in this exact order:

Code
<AuthProvider>
  <ClubProvider>
    <ProfileProvider>
      <MembershipProvider>
        <DriverProvider>
          <NumberProvider>
            <NotificationProvider>
              <Outlet />
Provider Responsibilities
AuthProvider — restores session, loads profile if user exists

ClubProvider — loads club by slug for both public + private routes

ProfileProvider — loads profile only if user exists

MembershipProvider — loads membership only when user + club + profile exist

DriverProvider — loads drivers only when membership exists

NumberProvider — manages race numbers

NotificationProvider — loads club‑scoped notifications

If this order changes, the app will break.

🎨 ClubLayout Behavior
ClubLayout is responsible for determining whether a route is public or private.

Public Mode (/public/*)
Requires club only

Does not require user, profile, or membership

Must render login/signup immediately

Private Mode (/app/*, /admin/*)
Requires club + user + profile + membership

Redirects to login if user is null

This separation prevents blank login pages and loading loops.

🔄 Data Loading Sequence
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
Each provider waits for its prerequisites before running.

🛠️ Development
Install dependencies
bash
npm install
Run locally
bash
npm run dev
Build for production
bash
npm run build
Preview production build
bash
npm run preview
🔐 Environment Variables
Create a .env file with:

Code
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
🚢 Deployment
The app is designed for:

Vite static hosting (Cloudflare Pages, Netlify, Vercel, GitHub Pages)

Supabase backend

Ensure:

/manifest.json and /service-worker.js are at the root

Club routes are handled by SPA fallback

Environment variables are set in the hosting platform

📘 Architecture Reference
See ARCHITECTURE.md for the complete provider + routing diagram and rules.