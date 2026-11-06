## Login (platform + auth callbacks)

Day-to-day sign-in is on **`/`** (`PlatformHome.jsx`) via `supabase.auth.signInWithPassword`. Club URLs do **not** show an email/password form except while processing Supabase auth links.

### Entry points

| Situation | Destination |
|-----------|-------------|
| Logged out, needs `/:clubSlug/app/*` | `platformLoginPathForClub` → `/?returnTo=/{slug}/public/claim-membership?…` |
| User opens `/:clubSlug/public/login` (no tokens) | `ClubPublicLoginEntry` → same platform URL |
| Email confirm / OAuth lands on `/:clubSlug/public/login` with hash or `token_hash` | `Login.jsx` → session refresh → `reconcileClubAccess` |
| Already logged in on callback URL | `Login.jsx` / `reconcileClubAccess` |

Helpers live in `src/app/lib/publicAuthRedirect.js`. Membership linking after auth is in `src/app/lib/reconcileClubAccess.js` (not inline in the login form).

### `Login.jsx` responsibilities

1. Handle auth callbacks only (`hasAuthCallbackInUrl()`).
2. Otherwise redirect to platform login (defense in depth; `ClubPublicLoginEntry` also redirects).
3. On confirmed session, run `reconcileClubAccess` (link membership, visitor provisioning, `returnTo`, membership pitch state for visitors).
4. If the callback stalls, show a short “check your email” style message with link back to `/`.

There is **no** `signInWithPassword` on this page anymore.

### Related files

- `src/app/pages/public/ClubPublicLoginEntry.jsx` — route wrapper for `/public/login`
- `src/app/pages/global/PlatformHome.jsx` — primary login UI
- `src/app/routes/ProtectedAppRoute.jsx` — unauthenticated → `platformLoginPathForClub`
- `src/app/pages/public/ClaimMembership.jsx` — club access after platform login

See also `Platform One Account Roadmap.md` Phase 0.
