# Nomination Form — Build & Behaviour Spec

Canonical reference for how the driver-facing nomination/checkout form works. Written from the requirements given during development and the two examples used as the design baseline: **Event Details** (`src/app/pages/events/EventDetails.jsx`) for layout/theme conventions, and **LiveTime Export** (`src/app/pages/nominations/LiveTimeExport.js`) for what data the finished nomination must ultimately support downstream.

Implementation lives in [EventNominate.jsx](../../../app/pages/events/EventNominate.jsx).

## 1. Purpose

The nomination page is a **checkout form**, not a database-editing screen. A driver's household comes here to:

1. Pick which days/classes each driver in the household is racing.
2. Add any merchandise or class add-ons.
3. See a running total.
4. Pay (Stripe or PayPal).
5. Only once payment is confirmed, the nomination is written to the database.

Nothing is saved to Supabase until the payment step completes. See "Payment & Save Flow" below.

## 2. Page chrome (matches Event Details conventions)

- `PageTitle` component, used the same way as `EventDetails.jsx`'s `PageHeader`: an icon (`ClipboardDocumentCheckIcon`), title text ("Nominate"), themed via `style={{ color: brand }}`, and a "Back" action button in the `actions` slot.
- `brand` / `contentText` / surface colours all come from `useTheme()` → `palette`, never from ad-hoc `club.theme.*` lookups. This keeps the page consistent with every other themed page (`AdminEventNominations.jsx`, `NominationsView.jsx`, `EventDetails.jsx`).
- Card header block is a direct copy of the Event Details pattern: a gradient (`brand` → `palette.surfaceAlt`) strip containing the club/event logo (same Supabase storage URL construction) and the event name centered underneath.
- Below the header, event info is shown as **read-only "form fields"** (label + boxed value, styled like a disabled input) even though the driver can't edit them — this is deliberate, so the page reads as a form top-to-bottom rather than a mix of prose and inputs. Fields shown: Event Type, Track, Class Limit, Preferences (enabled + limit), Nominations Open, Nominations Close.

## 3. Data model dependencies

The form must only read from the real schema (see `Admin Events Developer.md`, `Admin CLasses.md`, `Admin Nominations.md`, `Admin Pricing.md` for authoritative shapes). Do **not** reintroduce the legacy `nomination_classes` / `event_classes` tables — they are never populated anywhere in the app and caused the original "Unable to load this event nomination" bug.

| Need | Source |
|---|---|
| Event core fields | `events` row (`select *`) |
| Classes for a single-day event | `events.classes` (array of class IDs) |
| Classes for a multi-day event, per day | `events.classes_by_day[dayIndex].classes` |
| Class display names | `club_classes` table, `.in("id", classIds)` |
| Pricing rules | `events.pricing` (`per_entry` / `tiered` / `per_class`) via `calculateUserPricing()` in `events-sections/calculatePricing.js`. Legacy events without `pricing.mode` fall back to a synthetic `per_entry` config built from `member_price` / `non_member_price` / `junior_price`. |
| Merchandise | `events.merchandise[]` — `included`, `compulsory`, `price`, `max_qty`, `options[]` (each an option group with `values[{label, price, photo_url}]`) |
| Class add-ons | `events.class_add_ons[]` — same shape as merchandise plus `required`, `classes[]` (which class IDs the add-on applies to), `class_rules` |
| Household drivers | `useDrivers()` (`DriverProvider`) |
| Household/membership | `useMembership()` — `membership.id` (used as `nominations.group_id`), `membership.isMember` (drives member vs non-member pricing) |

## 4. Per-driver fields

- **Name only.** Permanent number and nickname are intentionally not shown on this form (they belong to the driver profile, not the nomination). Do not re-add them here.
- **Days Racing & Classes**
  - Multi-day events: one `<select>` per event day, options limited to that day's `classes_by_day` entry. A day can be left as "Not racing this day".
  - Single-day events: `event.class_limit` separate `<select>` dropdowns, each offering the full `event.classes` list. Dropdowns (not checkboxes/lists) because some clubs run large class counts.
  - Preference `<select>` (only rendered when `event.preference_enabled`) is populated from whatever classes the driver has already selected — you can't set a preference for a class you didn't pick.
- **Merchandise** (household-relevant, shown per driver since sizing/options are per-person):
  - `included` items: free, quantity locked at 1, but still show option-group dropdowns (e.g. size/colour) if present.
  - `compulsory` items: must be paid, quantity locked at 1, option dropdowns shown.
  - Everything else: optional, quantity input `0..max_qty`, option dropdowns only appear once qty > 0.
- **Class Add-Ons**
  - Filtered per driver: only show an add-on if its `classes[]` is empty (applies to all) or intersects the driver's currently selected class IDs.
  - `required` add-ons behave like compulsory merchandise (locked qty 1).
  - Optional add-ons get a qty input the same way merchandise does.
  - Option groups (with per-value price deltas) render the same `OptionGroups` control used for merchandise.

## 5. Totals

`driverTotal(driver)` = `calculateUserPricing(...)` result (handles per_entry/tiered/per_class + late fee + preference charging rules) **plus** the sum of that driver's merchandise cost **plus** that driver's add-on cost. Household total is the sum across all drivers. Merchandise/add-on option price deltas (`value.price`) are added per unit, multiplied by quantity.

## 6. Payment & save flow

This is a checkout, matching how the club's LiveTime export ultimately expects a `paid` flag per nomination:

1. Driver reviews selections and the household total.
2. Driver clicks **Pay with Stripe** or **Pay with PayPal**.
3. **Current state: stubbed.** Clicking either button just flips local state (`paymentMethod`, `paymentConfirmed = true`) to simulate a successful return from the payment provider. See `Nomination Checkout - TODO.md` in this same folder for what real Stripe/PayPal wiring requires (Edge Functions, webhook-verified save, secret keys).
4. Once `paymentConfirmed` is true, **Confirm Payment & Nominations** becomes available. Only this action writes anything to Supabase:
   - Deletes any prior `nominations`/`nomination_entries` rows for this household+event (so re-submitting replaces, not duplicates).
   - Inserts one `nominations` row per driver with a class selection, storing `total_fee`, `paid: true`, and a `merchandise` JSON blob containing `{ merch, addons, payment_method }` for that driver's selections.
   - Inserts `nomination_entries` rows (one per selected class, plus one `is_preference` row if a preference was set) referencing `club_classes.id` as `class_id`.
5. Navigates to `NominationsView.jsx` to show the submitted nomination.

**Important:** `paid: true` is currently set unconditionally by the client. Once real payment integration exists, this must move server-side (a webhook/edge function should be the only thing allowed to mark a nomination paid) — do not treat the current client-side flag as production-ready.

## 7. Downstream consumers this form must stay compatible with

- **`NominationsView.jsx`** and **`AdminEventNominations.jsx`** read `nomination_entries.class_id` and resolve names via `club_classes` (not `event_classes` — fixed alongside this form). Any change to how class IDs are stored must keep these working.
- **LiveTime Export** (`LiveTimeExport.js` → `buildLiveTimeRows`/`buildLiveTimeCsv`, surfaced in `AdminEventNominations.jsx`'s Export tab) pulls its columns from the **driver profile** (`first_name`, `last_name`, `nickname`, `permanent_number`, colours, `manufacturer`, transponder, sponsors, gender, country) and **membership** record, plus `nomination.paid` and the class name via `class_id`. The nomination form does not need to collect any of those driver-profile fields itself — they come from the driver's existing profile, not from this form. It only needs to make sure `nominations.paid` and `nomination_entries.class_id` are populated correctly so the export continues to work.

## 8. Things intentionally out of scope for this form

- Editing driver profile details (number, nickname, sponsors, etc.) — done elsewhere (`DriverManager`/`EditProfile`).
- Admin-side event/class/pricing/merchandise configuration — done in `AdminEventEdit.jsx` and its cards.
- Real payment processing — tracked separately in `Nomination Checkout - TODO.md`.
