# Nomination Checkout — Status & Next Steps

## Where things stand
[EventNominate.jsx](../../../app/pages/events/EventNominate.jsx) is the live "Nominate" page (`/:clubSlug/app/events/:eventId/nominate`). It now:

- Uses `PageTitle` (icon + "Nominate") and the shared `useTheme()` palette, matching `EventDetails.jsx`.
- Renders a Event Details-style card: gradient header with club logo + event name.
- Shows read-only event fields (type, track, class limit, preference limit, nominations open/close).
- Lists household drivers (name only — number/nickname removed).
- Per driver:
  - Multi-day events: one dropdown per day, options from that day's `classes_by_day` entry.
  - Single-day events: `class_limit` dropdowns from `event.classes`, resolved via `club_classes`.
  - Preference dropdown (if `preference_enabled`) built from the driver's selected classes.
  - Merchandise: interactive qty inputs + option-group dropdowns, respecting `included` / `compulsory` / `max_qty`.
  - Class add-ons: same pattern, filtered to add-ons whose `classes` intersect the driver's selected classes, respecting `required`.
- Totals use `calculateUserPricing` (`events-sections/calculatePricing.js`) for per_entry/tiered/per_class pricing, plus merchandise/add-on costs.
- Data-loading bug fixed: previously queried the never-populated `nomination_classes`/`event_classes` tables. Now reads classes from `events.classes_by_day` / `events.classes` + `club_classes` (the real schema per `docs/Developer/Admin/Admin CLasses.md` and `Admin Nominations.md`).
- Same `event_classes` → `club_classes` fix applied to `NominationsView.jsx` and `AdminEventNominations.jsx` so submitted nominations display class names correctly.

## What's stubbed / not real yet
- **Payment is fake.** "Pay with Stripe" / "Pay with PayPal" buttons just set local state (`paymentMethod`, `paymentConfirmed`) — there is no session creation, redirect, or webhook. Clicking either button immediately unlocks the "Confirm Payment & Nominations" button.
- **Save-on-confirm.** `confirmPaymentAndNominations()` writes to `nominations` + `nomination_entries` via Supabase directly from the client, marking `paid: true` unconditionally. This needs to move behind real payment verification once a payment provider is wired up.
- Dead/legacy pages still exist but are **not routed** (safe to ignore or delete later): `src/app/pages/nominations/NominationsStart.jsx`, `NominationsReview.jsx`, `NominationsSelectClass.jsx`, `NominationsComplete.jsx`, `NominationsConfirmation.jsx`. `NominationsComplete.jsx` already references a `/api/payments/square|paypal/create-session` pattern that could be a useful reference shape for the real integration.

## To finish real payment integration
1. **Choose provider(s) and confirm requirements** — Stripe Checkout (redirect) is the simplest to implement; PayPal Orders API is the equivalent for PayPal.
2. **Add Supabase Edge Functions** under `supabase/functions/` (pattern to follow: `supabase/functions/lookup-membership`):
   - `create-checkout-session` — takes `{ eventId, driverSelections, total }`, creates a Stripe Checkout Session / PayPal Order server-side (using secret keys from env, never exposed to client), returns a redirect URL.
   - `payment-webhook` (Stripe) or order-capture endpoint (PayPal) — verifies payment succeeded server-side, then performs the actual `nominations`/`nomination_entries` insert (move the save logic out of the client and into this function so an unpaid nomination can never be marked `paid: true` from the browser).
3. **Env vars needed:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (or PayPal client id/secret), plus a publishable/client key on the frontend.
4. **Frontend changes in `EventNominate.jsx`:**
   - Replace `startPayment()` stub with a call to `create-checkout-session`, then `window.location.href = data.redirectUrl`.
   - On return, land on a confirmation route (e.g. `/:clubSlug/app/events/:eventId/nominations`) that reads the saved nomination (already written server-side by the webhook) instead of re-submitting from the client.
   - Remove the client-side `paid: true` insert once the webhook/backend handles it.
5. **Testing:** Stripe test mode + PayPal sandbox; verify webhook signature validation; verify nominations are only created after confirmed payment.

## Open questions to resolve before building the above
- Which provider(s) are actually required for launch — both, or start with one?
- Should partial/failed payments leave a "pending" nomination row for retry, or nothing at all until success?
- Where should the Edge Functions get Supabase service-role access from (same pattern as `lookup-membership`)?
