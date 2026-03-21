RCRaceDay — Development Guide
This document explains how to set up, run, debug, and safely extend the RCRaceDay codebase. It complements README.md (project overview) and ARCHITECTURE.md (provider + routing architecture).

The goal is to ensure a stable, predictable development workflow and prevent regressions in the multi‑club architecture.

🧰 Prerequisites
Node.js 18+

npm 9+

Git

Supabase project (URL + anon key)

VS Code (recommended)

📦 Install Dependencies
bash
npm install
🔐 Environment Variables
Create a .env file in the project root:

Code
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key
These values come from your Supabase project settings.

▶️ Running the App Locally
Start the Vite dev server:

bash
npm run dev
The app will be available at:

Code
http://localhost:5173
First‑time local run checklist
Visit / → ClubSelect should load

Choose a club → /chargers-rc/public/login

Login → should redirect to /chargers-rc/app

Refresh on any route → no crashes

Switch clubs → theme updates correctly

If any of these fail, check ARCHITECTURE.md for provider/routing rules.

🧭 Routing During Development
Public routes
Code
/:clubSlug/public/login
/:clubSlug/public/signup
/:clubSlug/public/forgot-password
/:clubSlug/public/reset-password
These routes:

Load the club

Do not require user/profile/membership

Must render instantly

Private routes
Code
/:clubSlug/app/*
/:clubSlug/admin/*
These routes:

Require user + profile + membership

Redirect to login if user is null

Common local mistake
If you see a blank login page, it means:

ClubLayout is treating a public route like a private route

Or provider order was changed

Or routing order was changed

See ARCHITECTURE.md for the fix.

🏗️ Provider Debugging
Each provider logs its mount and loading state.
If something breaks, check the console in this order:

AuthProvider

ClubProvider

ProfileProvider

MembershipProvider

DriverProvider

If a provider logs before its prerequisites are ready, the provider order is wrong.

🧪 Testing Scenarios
Logged‑out tests
/chargers-rc/public/login → should show login

/chargers-rc/app → should redirect to login

/chargers-rc/admin → should redirect to login

Logged‑in tests
/chargers-rc/app → loads home

/chargers-rc/app/profile → loads profile

/chargers-rc/app/events → loads events

/chargers-rc/admin → loads admin dashboard (if admin)

Club switching
Switch clubs → theme updates

Refresh → stays on correct club

🧼 Code Style & Conventions
1. Full‑file changes only
Never send patches or partial diffs.
Always rewrite the full file when making structural changes.

2. Provider purity
Providers must:

Not assume data exists

Not run until prerequisites are ready

Not render children prematurely

3. Routing clarity
All routes must live under:

/public/*

/app/*

/admin/*

Never add new club‑scoped routes outside these groups.

4. No circular dependencies
If a provider depends on another provider, it must appear below it in AppProviders.jsx.

🧪 Adding New Pages
When adding a new page:

Decide if it’s public, private, or admin

Place it in the correct folder

Add it to the correct route group

Ensure it only uses hooks allowed for that route type

Allowed hooks by route type
Hook	Public	Private	Admin
useClub	✔️	✔️	✔️
useAuth	✔️	✔️	✔️
useProfile	❌	✔️	✔️
useMembership	❌	✔️	✔️
useDrivers	❌	✔️	✔️
🧱 Adding New Providers
If you add a provider:

Identify its dependencies

Insert it into AppProviders.jsx in the correct position

Update ARCHITECTURE.md

Ensure it never blocks public routes

🧪 Debugging Common Issues
Blank login page
Cause: ClubLayout treating public route as private
Fix: Check isPublicRoute logic in ClubLayout

“membership is null” crash
Cause: DriverProvider mounted before MembershipProvider
Fix: Check provider order in AppProviders.jsx

Infinite loading
Cause: A provider waiting for data that will never load
Fix: Check loading guards in providers

Wrong club theme
Cause: ClubProvider not loading before layout
Fix: Ensure ClubProvider wraps everything

🚢 Deployment Workflow
Build
bash
npm run build
Preview
bash
npm run preview
Deploy to Cloudflare Pages / Netlify / Vercel
Ensure SPA fallback is enabled

Ensure environment variables are set

Ensure /manifest.json and /service-worker.js are at root

Post‑deploy checklist
/ loads

/chargers-rc/public/login loads

/chargers-rc/app loads when logged in

Refresh on any route works

Switching clubs works

📘 Architecture Reference
See ARCHITECTURE.md for the full provider + routing diagram.