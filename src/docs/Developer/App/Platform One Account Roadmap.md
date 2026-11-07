# Platform one-account roadmap

Living plan for **one RCRaceday login**, **club access (not club login)**, **global racers + transponders**, and **auto-fill at each club** with only club-specific overrides where racing actually differs.

Last aligned with product direction: Nov 2026.

---

## 1. Principles

| Principle | Meaning |
|-----------|---------|
| **One auth account** | Single email/password (Supabase) for all clubs. |
| **Club = context, not identity** | URLs stay `/:clubSlug/...` for events, nominations, admin; that is tenant context, not a second login. |
| **Club access ≠ login** | Opening a club links membership (email) and provisions racing data; no duplicate sign-in UI. |
| **Global kit, local grid** | Names/colours/manufacturer can default globally; **classes, numbers, club rules** stay per club; **transponder numbers** are user-owned inventory reused everywhere. |
| **Enter once, override when needed** | Default copy from platform → club; user edits only what differs (e.g. different name at one club, 1/10 vs 1/8 class list). |

---

## 2. Target user journeys

### 2.1 New racer

1. Sign up at **`/`** (platform home).
2. Find club → **Club access** (`/:slug/public/claim-membership` or `/access`).
3. Enter **membership email** if different from login email → link `household_memberships`.
4. **Bring your racers** (from platform roster or copy from another club) — not empty “welcome type names”.
5. Register **transponders once** (account or per-person inventory).
6. Map **this club’s classes** → pick transponders from inventory.
7. Land in **`/:slug/app`** (optional first-time driver tips, not full re-setup).

### 2.2 Existing member, second club (e.g. state titles at Club B)

1. Already logged in at **`/`**.
2. Open Club B → **Club access** (membership link if needed).
3. **Auto-provision**: copy platform racers + transponders; user only maps Club B **classes** to existing transponders.
4. Nominate — same transponder numbers as Club A.

### 2.3 Returning to a club already linked

1. Tap club on home / finder → **`/:slug/app`** directly (membership active, drivers exist).
2. No login page, no welcome wizard unless zero drivers and no roster to copy.

### 2.4 Log out

1. Sign out → **`/`** (platform home), not `/:slug/public/login`.

---

## 3. Data model: today → target

### 3.1 Keep (unchanged role)

| Store | Scope | Purpose |
|-------|--------|---------|
| `auth.users` | Global | Login |
| `profiles` | Global | Account contact, language, timezone, `primary_club_id`, `favorite_club_ids` |
| `household_memberships` | Per club | Paid/visitor household at club; link via `user_id` + membership **email** |
| `club_members` | Per club | Family roster slots at that club |
| `drivers` | Per club (row) | **Club participation** — LiveTime name, colours, number, club naming rules |
| `driver_classes` | Per club | Class assignment at this club (+ transponder **usage** at this club) |
| `numbers` | Per club | Club number pool |
| `clubs.driver_settings` | Per club | Admin policy (naming, required fields, juniors, etc.) |
| `club_classes`, tracks, events, nominations | Per club | Racing operations |

### 3.2 Add (platform layer)

| Store | Scope | Purpose |
|-------|--------|---------|
| **`platform_people`** (name TBD) | Global, `user_id` | Household racers: legal first/last, `is_junior`, optional default colours/manufacturer/avatar |
| **`user_transponders`** (name TBD) | Global, `user_id` + optional `person_id` | Inventory of transponder numbers (and optional label: “1/8”, “1/10”) |
| **`drivers.platform_person_id`** (FK, nullable) | Link | Club driver row ↔ global person |
| **`drivers.source_driver_id`** (FK, nullable) | Link | Optional “copied from” for audit |
| **`driver_classes.transponder_id`** (FK, nullable) | Link | Class at club uses inventory row; keep `transponder_number` denormalized for exports |

### 3.3 Deprecate / shrink (conceptual)

| Item | Action |
|------|--------|
| Per-club **login/signup as primary UX** | Retire UI; keep thin routes only for auth email callbacks if needed |
| **`WelcomeAddDrivers` as blank-slate only** | Replace with “enable roster at this club” + class mapping |
| **Transponder as club-only strings** | Migrate to inventory-backed; combobox reads global list |
| **Duplicate data entry** | Same field typed at every club without import |

---

## 4. Routes & public surface

### 4.1 Platform (global)

| Path | Role |
|------|------|
| `/` | Login, signup, favorites, open club |
| `/find-club` | Directory |
| `/forgot-password`, `/forgot-email`, `/reset-password` | Account recovery |
| **`/account`** (new) | Global settings: profile, **my transponders**, **my racers** (platform_people) |

### 4.2 Per club (public, no login form)

| Path | Role |
|------|------|
| `/:slug/public/claim-membership` | **Club access** — membership email, link household |
| `/:slug/public/access` | Alias → same component |
| `/:slug/public/check-email` | Confirm email (returnTo preserved) |
| `/:slug/public/login` | **Legacy redirect** → `/` or claim; auth callback handler only |
| `/:slug/public/signup` | **Legacy redirect** → `/?signup=1&returnTo=...` |
| Password reset under club URL | Keep for Supabase redirect allow-list |

### 4.3 Per club (app)

| Path | Role |
|------|------|
| `/:slug/app/*` | Unchanged; gates use platform login + club access |
| `/:slug/app/profile/drivers/welcome` | **Repurpose** → “Set up at this club” (roster + class map), not create identity from scratch |

---

## 5. Auth & gates (target behavior)

```
Not logged in + need club app
  → /?returnTo=/{slug}/public/claim-membership?returnTo=...

Logged in + no membership / inactive
  → /{slug}/public/claim-membership

Logged in + membership + no club drivers but platform_people exist
  → auto-provision drivers + driver_classes (class map step)

Logged in + membership + drivers OK
  → /{slug}/app
```

**Remove:** redirect to `/:slug/public/login` for unauthenticated users (grep remaining references).

**Done:** `platformLoginPathForClub`, `ProtectedAppRoute`, `PlatformHome`, `ClubFinder`, `ClaimMembership`, logout → `/`, `ClubPublicLoginEntry`, `RedirectClubSignup`, membership pitch overlay, developer docs (`Login.md`, `Signup.md`, `ProtectedAppRoute.md`, `Routes.md`, `Layouts.md`, `ARCHITECTURE.md`, `DEVELOPMENT.md`, `CONTRIBUTING.md`).

**Ops (per environment):** Run `scripts/add-platform-auth-email-registered-rpc.sql`, directory SQL + `platform_subscribed` for pilot clubs; paste Supabase email templates; deploy `public/` logo assets.

---

## 6. Application layers (providers)

Provider **order** stays as today (`ARCHITECTURE.md` stack). Add optional **`PlatformRosterProvider`** (or load in `ProfileProvider`):

- Loads `platform_people` + `user_transponders` when `user` exists (global, not club-scoped).
- `DriverProvider` stays club-scoped but **seeds** from platform roster on first club visit.

No second login provider; club providers still wait on membership for **club** `drivers`.

---

## 7. Feature matrix: remove / keep / add

### Remove or retire (UX & code)

- [x] Club **login form** as default entry (callback-only `Login.jsx` + `ClubPublicLoginEntry`).
- [x] Club **signup** route → platform `/?signup=1` (`RedirectClubSignup`).
- [ ] **`WelcomeAddDrivers`** flow that only inserts empty names with no global roster.
- [x] Stale top-level docs stating `ClubSelect` at `/` and club login as primary (`ARCHITECTURE.md`, `DEVELOPMENT.md` partial).
- [x] Logout / menu links to `/:slug/public/login`.
- [ ] Transponders stored **only** as repeated text on each club’s `driver_classes` (Phase 1).

### Keep

- [ ] Club-scoped **events, nominations, results, admin**.
- [ ] **`household_memberships`** + **claim** RPC (`claim_household_membership`).
- [ ] **`clubs.driver_settings`** (policy per club).
- [ ] **Numbers** per club pool.
- [ ] **`driver_classes`** per club (class list differs by venue/scale).
- [ ] **Cross-club import** (evolve into roster copy + class map).
- [ ] **`ensureHostClubVisitorDriver`** for nominate deep links (should use roster defaults).

### Add

- [ ] SQL: `platform_people`, `user_transponders`, FKs on `drivers` / `driver_classes`.
- [ ] RLS: user owns their people + transponders.
- [ ] **`/account`** (or settings section on `/` when logged in): manage transponders + household racers.
- [ ] **Club access** post-link: **“Use my RCRaceday racers”** → create/link `drivers` rows.
- [ ] **Class mapping UI** at club (reuse import mapping components).
- [ ] **Transponder picker** backed by inventory (`TransponderCombobox` suggestions global).
- [ ] **Auto-fill on club access**: profile name → primary person; existing transponders → default assignments where class names match.
- [ ] **Migration script**: extract distinct transponder numbers from all `driver_classes` for user → `user_transponders`.
- [ ] **Migration script**: dedupe drivers across clubs into `platform_people` (heuristic: same user + same normalized name).

---

## 8. Phased build plan

Dependencies flow top to bottom. Ship each phase in a releasable state.

**Pilot context (Nov 2026):** Only two live tenants — **`chargers-rc`** (production club) and **`rcraceday`** (sandbox/demo). Validate every phase on Chargers first; use `rcraceday` to exercise cross-club flows (different `club_classes`, scales, `driver_settings`) without hardcoding either slug in app logic. See **§15**.

### Phase 0 — Align auth UX ✅ (Nov 2026)

- Platform login, club access, returnTo, no club login for logged-out users.
- Club `/public/login` and `/public/signup` redirect to platform; login URL retained for Supabase email callbacks.
- Logout → `/`; menu uses `/:slug/app/logout`.
- Visitor membership **pitch overlay** (optional join; dismiss per club).
- **Docs:** developer auth/routing docs and top-level testing checklists aligned.

**Exit:** New user never sees club email/password form except auth email links / callback handling.

**Deferred to later phases:** blank-slate `WelcomeAddDrivers` (Phase 2–3); retire legacy `Signup.jsx` file (Phase 4); global transponders (Phase 1).

### Phase 1 — Global transponders (in progress)

- [x] SQL + RLS `user_transponders` + optional `driver_classes.user_transponder_id` (`scripts/add-user-transponders.sql`).
- [x] Backfill script from `driver_classes` (`scripts/backfill-user-transponders-from-driver-classes.sql`).
- [x] Account UI: **Settings → Account → My transponders**.
- [x] Driver manager + nominate: suggestions from inventory; save writes FK when migration applied.
- [ ] Run SQL + backfill in Supabase for each environment.

**Exit:** User registers three transponders once; all clubs suggest the same three.

### Phase 2 — Global roster (`platform_people`)

- [x] SQL + RLS `platform_people` + `drivers.platform_person_id` (`scripts/add-platform-people.sql`).
- [x] Backfill script (`scripts/backfill-platform-people-from-drivers.sql`).
- [x] Account UI: **Settings → Account → My racers**.
- [x] Link `drivers.platform_person_id` on create/import (Add driver + cross-club import).
- [ ] Run SQL (+ optional backfill) in Supabase for each environment.
- [x] **Club access** step: “Add these racers to {club}” (checkboxes) on `/public/claim-membership` after a successful membership link.
- [x] Welcome screen: add from **My racers** (`WelcomeAddDrivers.jsx` + roster checkboxes when `platform_people` exists).

**Exit:** Junior + adults defined once; each club gets linked driver rows.

### Phase 3 — Auto-fill at club access

- [x] After membership link: if no drivers at club, run **provision from roster** (names, juniors, defaults) — claim-membership roster checkboxes.
- [x] **Class map** screen: `/:slug/app/profile/drivers/setup` maps other-club classes ↔ this club (`suggestTargetClassId`) and copies transponders (inventory FK when present).
- [x] Skip welcome when provision succeeds — roster add goes to class map, not blank-name welcome.
- [x] Smart defaults: match class names across clubs (`suggestTargetClassId`).

**Exit:** Club B setup is membership email + class map only for state titles.

### Phase 4 — Cleanup & deprecation

- Redirect `/public/signup`, `/public/login` (GET) to platform or claim.
- Remove dead code paths; update developer docs.
- Optional: rename UI “Club access” everywhere; route `access` canonical.

**Exit:** Single mental model in app + docs.

### Phase 5 — Nice-to-have

- Sync account name → `platform_people` (not every club driver automatically unless policy says so).
- Per-club **display name override** field on `drivers` only.
- Admin visibility: transponder inventory on member lookup (support).

---

## 9. What stays club-specific (do not globalize)

- Membership type, fees, renewal (`memberships` products, club rules).
- **Race numbers** (club pool + `permanent_number` at that club).
- **Class catalog** and track/class links.
- Nomination windows, pricing, championships.
- **LiveTime export club name** override (`driver_settings.livetime`).
- Naming uniqueness **per club** (`unique_name_per_club`).

---

## 10. Migration & risk

| Risk | Mitigation |
|------|------------|
| Existing users have drivers only at one club | Backfill `platform_people` from drivers; backfill transponders from `driver_classes` |
| Duplicate names across clubs | One `platform_person` per normalized name per user; multiple `drivers` rows linked |
| Nomination/export expects `transponder_number` text | Keep denormalized column; sync from inventory on write |
| Supabase redirect URLs | Add apex `/reset-password`; keep club URLs during transition |
| RLS on new tables | Mirror `household_memberships.user_id = auth.uid()` pattern |

---

## 11. Verification checklist (per phase)

### Phase 0 (complete)

- [x] Logged out: `/chargers-rc/public/login` → `/` with returnTo chain (no club login form).
- [x] Logged out: `/chargers-rc/app` → platform login → club access.
- [x] Logged in, no membership → claim-membership, not login.
- [x] Log out → `/`.
- [x] Visitor overlay + membership page Back (non-members).
- [ ] Production: Supabase RPC + email templates + directory SQL (ops).

### Phase 1+ (ongoing)

Use **`chargers-rc`** as the primary sign-off club. Repeat critical paths on **`rcraceday`** when the phase involves class lists, import, or club policy differences.

- [ ] Logged out: open club from finder → `/` → login → club access (not club login).
- [ ] Logged in, member at Chargers, open **`rcraceday`** → club access → class map (when built) → nominate with same transponders.
- [ ] Logged in, member at Chargers, open Chargers → straight to app.
- [ ] Logged out visitor at Chargers: membership pitch overlay → No thanks → home/nominate; Find out more → membership page with Back.
- [ ] Log out → `/`.
- [ ] Email confirm / password reset links still work.
- [ ] Public nominate link (visitor) still creates minimal driver when needed.
- [ ] Admin driver edit unchanged for club ops.

---

## 12. Open decisions

1. **`platform_people` vs metadata-only** — table recommended for juniors/multi-driver households.
2. **Transponders per user vs per person** — recommend **per person** (each kid has their own chips); account owner manages all.
3. **Auto-sync legal name** from profile to all club drivers — default **no**; offer “Update all clubs from RCRaceday profile”.
4. **Retire `/:slug/public/signup` create-user edge flow** — move to platform signup + club access only; audit `Signup.jsx` edge function usage.

---

## 13. Related code (starting points)

| Area | Path |
|------|------|
| Auth redirects | `src/app/lib/publicAuthRedirect.js` |
| Club access UI | `src/app/pages/public/ClaimMembership.jsx` |
| Reconcile / auto visitor | `src/app/lib/reconcileClubAccess.js`, `ensureHostClubVisitorDriver.js` |
| Cross-club copy | `src/app/lib/crossClubDriverImport.js`, `ImportDriverFromOtherClubs.jsx` |
| Transponder UI | `TransponderCombobox.jsx`, `DriverListCard.jsx`, `EventNominate.jsx` |
| Club policy | `src/app/lib/driverClubSettings.js` |
| Welcome (to repurpose) | `src/app/pages/profile/WelcomeAddDrivers.jsx` |
| Gates | `src/app/routes/ProtectedAppRoute.jsx`, `src/layouts/AppLayout.jsx` |

---

## 14. Doc debt (update when phases land)

- ~~`Login.md`, `Signup.md`, `ProtectedAppRoute.md`, `Routes.md`, `Layouts.md` — Phase 0 auth~~
- `ARCHITECTURE.md` — optional `PlatformRosterProvider` when Phase 2 lands.
- `DEVELOPMENT.md` — keep redirect URLs in sync with Supabase dashboard.

---

## 15. Pilot tenants & extensibility (Nov 2026)

### Current clubs

| Club | Slug (expected) | Role |
|------|-----------------|------|
| **Chargers RC** | `chargers-rc` | Production pilot — all phases must work here before wider rollout. |
| **RCRaceday sandbox** | `rcraceday` | Demo / second tenant — different classes or scales on purpose to stress import, class map, and admin settings without a third real club yet. |

Directory: enable `platform_subscribed` for both tenants after `scripts/add-platform-directory-primary-club.sql`:

```sql
update public.clubs set platform_subscribed = true where slug in ('chargers-rc', 'rcraceday');
```

### Build rules while the fleet is small

1. **No Chargers-only product logic** in shared code — only docs, SQL comments, and test checklists may name `chargers-rc`. Club behavior comes from **DB config**: `clubs.driver_settings`, `club_classes`, `membership_type_configs`, `directory_profile`, event/pricing admin.
2. **Global layer stays dumb** — `user_transponders` and `platform_people` are account-owned; **which class uses which chip** stays on `driver_classes` per club.
3. **Class / scale differences** — mapping UI (Phase 3) must not assume Chargers’ class names; reuse `crossClubDriverImport` / `suggestTargetClassId` name matching, admin-defined catalogs, and future directory discipline tags — not hardcoded lists.
4. **Two-club testing** — Before a third club joins, run “Club A = `chargers-rc`, Club B = `rcraceday`” for: link membership → copy roster → map classes → nominate with shared transponders.
5. **Known debt** — a few dev conveniences still mention `chargers-rc` (e.g. admin branding back link); replace with `clubSlug` from route params as touch those files.

### Practical phase order for this pilot

| Phase | Chargers focus | Keep flexible for future clubs |
|-------|----------------|--------------------------------|
| **0** (wrap-up) | Visitor overlay, club access, emails, directory go-live | Same UX for any slug |
| **1** Transponders | Backfill from Chargers `driver_classes`; combobox on nominate | Inventory global; assignments per club |
| **2** Roster | Household juniors/adults as Chargers families use them | `platform_people` schema not tied to one class list |
| **3** Auto-fill | `chargers-rc` ↔ `rcraceday` class map test | Mapping table driven by target club’s `club_classes` |
| **4** Cleanup | Redirect URLs for both slugs in Supabase | Pattern `/*/` not per-club code |

When new clubs onboard, expect **per-club tuning** in admin (membership products, class catalog, driver profile sections, nominate required fields) — not new platform phases unless their needs expose a gap in the global roster or transponder model.
