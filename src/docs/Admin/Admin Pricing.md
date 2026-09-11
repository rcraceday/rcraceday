Pricing.md
markdown
# Pricing

**Purpose**  
Developer reference for the event pricing system. Use this file as the canonical source of truth when changing pricing behavior, debugging display issues, or onboarding new developers.

---

## Overview
- **Supported modes**: `per_entry`, `tiered`, `per_class`.  
- **Storage**: `events.pricing` (JSONB).  
- **UI responsibilities**: Admin UI writes the canonical JSON shape. Any consumer that renders pricing must explicitly select `pricing` from the database.  
- **Common failure mode**: PostgREST schema caching can cause `.select("*")` to omit newly added JSONB columns. Always explicitly select `pricing` when you need it.

---

## JSON Shapes

### Per Entry
```json
{
  "mode": "per_entry",
  "global": {
    "free": false,
    "member": 20,
    "non_member": 30,
    "junior": 10
  },
  "charge_preferences": true,
  "late_fee": 5
}
Tiered
json
{
  "mode": "tiered",
  "tiered": {
    "member": { "first_class": 20, "additional_class": 10 },
    "non_member": { "first_class": 30, "additional_class": 15 },
    "junior": { "first_class": 10, "additional_class": 5 }
  },
  "charge_preferences": true,
  "late_fee": 5
}
Per Class
json
{
  "mode": "per_class",
  "class_prices": {
    "123": { "member": 20, "non_member": 30, "junior": 10, "free": false },
    "456": { "free": true }
  },
  "charge_preferences": true,
  "late_fee": 5
}
Save Patterns
Update pricing

js
await supabase
  .from('events')
  .update({ pricing })
  .eq('id', eventId);
Notes

The Admin edit form should produce the canonical JSON shape above.

Validate shape on save where possible (basic presence and types).

Load Patterns
Always explicitly select pricing

js
supabase.from('events').select('*, pricing')
Why

Avoids PostgREST schema caching issues where * may not include newly added JSONB columns.

Display Helpers
Mode label

js
const modeLabel = {
  per_entry: "Per Entry",
  tiered: "Tiered",
  per_class: "Per Class"
}[pricing.mode] || pricing.mode;
Per Class name resolution

js
const className = classMap[classId] || `Class ${classId}`;
Safe numeric display

js
const displayPrice = (v) => (typeof v === 'number' ? `$${v}` : '—');
Troubleshooting Checklist
Pricing missing in lists: confirm .select('*, pricing') is used.

.select('*') returns incomplete fields: run NOTIFY pgrst, 'reload schema'; in SQL editor.

Per Class shows IDs: ensure club_classes are loaded and classMap is built before rendering.

Mode label shows raw key: use modeLabel mapping.

Tests to add
Save and load roundtrip for each pricing mode.

Rendering tests for each mode in AdminEvents and User Events.

Edge cases: missing global, missing class_prices, free: true cases.

Code

---

### Timing.md

```markdown
# Timing

**Purpose**  
Developer reference for event timing, multi‑day structure, nomination windows, gates, and display rules.

---

## Core fields in events table
- **event_date** — date (single‑day primary date)  
- **days** — jsonb array of day objects for multi‑day events  
- **nominations_open** — timestamptz  
- **nominations_close** — timestamptz  
- **gates_open** — timestamptz (optional)  
- **gates_close** — timestamptz (optional)  
- **is_multi_day** — boolean (optional; can be inferred from `days`)

---

## Multi‑Day days shape
```json
{
  "days": [
    { "id": "day1", "date": "2026-09-12", "classes": ["123","456"], "notes": "" },
    { "id": "day2", "date": "2026-09-13", "classes": ["789"], "notes": "" }
  ]
}
Rendering rules

If days exists and days.length > 1 → treat as multi‑day.

Group classes by date and render per‑day lists.

Prefer days.length over is_multi_day for truth.