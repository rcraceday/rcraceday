# Signup and club access — Developer Documentation

## Platform auth (current — Phase 0)

New accounts are created at **`/`** with `?signup=1` (`PlatformHome.jsx`), not on a club signup wizard.

| URL | Behavior |
|-----|----------|
| `/:clubSlug/public/signup` | `RedirectClubSignup.jsx` → logged out: `/?signup=1&returnTo=/{slug}/public/claim-membership?…`; logged in: claim-membership |
| After signup + email confirm | User signs in at `/`, then **club access** links `household_memberships` (`ClaimMembership.jsx`, `claim_household_membership` RPC) |
| `/:clubSlug/public/login` | `ClubPublicLoginEntry` → platform login, **or** `Login.jsx` for Supabase email/auth callbacks only |

Redirect helpers: `platformSignupPathForClub`, `publicClaimMembershipPath`, `platformLoginPathForClub` in `src/app/lib/publicAuthRedirect.js`.

Post-auth routing: `reconcileClubAccess.js` (membership link, visitor `non_member`, nominate deep links, membership pitch overlay).

### Public routes that remain club-scoped

```text
/:clubSlug/public/claim-membership   (alias /access)
/:clubSlug/public/check-email
/:clubSlug/public/reset-password       (Supabase allow-list)
/:clubSlug/public/login                (callbacks + redirect)
/:clubSlug/public/signup               (redirect only)
```

### Provider boundaries

Public pages use `ClubProvider` + `ThemeProvider` + `PublicLayout` only — no `MembershipProvider` / `DriverProvider`.

Authenticated `/app/*` uses `ProtectedAppRoute` (see `ProtectedAppRoute.md`).

### Files to change together (platform flow)

- `src/app/pages/global/PlatformHome.jsx` — signup + login
- `src/app/pages/public/RedirectClubSignup.jsx`
- `src/app/pages/public/ClaimMembership.jsx`
- `src/app/pages/public/Login.jsx` — auth callbacks
- `src/app/lib/reconcileClubAccess.js`
- `src/app/routes/ProtectedAppRoute.jsx`
- `supabase/functions/create-user` — used from platform signup (not club `Signup.jsx` route)

---

## Legacy club `Signup.jsx` (not mounted on routes)

`src/app/pages/public/Signup.jsx` is the **old** multi-step club signup (member lookup + `create-user` edge function). The router uses `RedirectClubSignup` instead. Keep the file only until edge-function usage is fully migrated and audited (roadmap open decision §12).

The sections below describe that **legacy** flow for reference when debugging old accounts or metadata (`signup_type`, `club_id` in user metadata).

### Legacy overview

Signup and login were club-scoped under `/:clubSlug/public/*`. `Signup.jsx` created the Supabase Auth user and profile. `Login.jsx` reconciled Auth with `household_memberships` before app entry.

### Legacy provider chain

```text
ClubProvider → ThemeProvider → PublicLayout → Login / Signup / CheckEmail
```

### Legacy signup branches

```text
memberQuestion → memberLookup → memberCreatePassword
memberQuestion → nonMemberSignup
```

Both called `create-user` with metadata including `club_id`, `signup_type`, optional `membership_id`.

### Legacy login reconciliation

After `signInWithPassword`, membership was resolved by `user_id`, then email, with optional `non_member` creation from metadata. **Current code** uses `reconcileClubAccess` for the same outcomes after platform login or email callback.

### Legacy failure cases

- Wrong `clubSlug` in URL vs metadata `club_id`
- Email not confirmed → check-email
- No membership at club after login → claim flow (platform) or legacy signup metadata rules

When changing auth, prefer updating the **platform** file list above; do not re-enable the club signup route without an explicit product decision.
