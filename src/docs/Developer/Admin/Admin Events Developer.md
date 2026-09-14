1. Event Payload Schema (Authoritative)
This is the exact shape saved to Supabase.
All admin modules and user‑side logic must conform to this structure.

js
{
  club_id: number | null,
  name: string,
  description: string | null,
  event_type: string | null,
  track: string | null,
  logourl: string | null,

  is_multi_day: boolean,

  event_date: string | null, // single-day only

  days: [
    {
      date: string | null,      // "YYYY-MM-DD"
      label: string,            // optional day name
      gates_open_at: string,    // "HH:MM" or ""
      practice_at: string,      // "HH:MM" or ""
      drivers_brief_at: string, // "HH:MM" or ""
      race_start_at: string,    // "HH:MM" or ""
    }
  ],

  nominations_open: string | null,  // ISO datetime
  nominations_close: string | null, // ISO datetime

  classes_by_day: [
    {
      date: string | null,
      label: string,
      classes: [string], // class IDs, ordered
    }
  ],

  classes: [string], // legacy single-day only

  merchandise: [
    {
      id: string,
      name: string,
      description: string,
      price: number,
      included: boolean,
      compulsory: boolean,
      max_qty: number,
      photo_url: string | null,
      options: [
        {
          name: string,
          values: [
            { label: string, price: number, photo_url: string | null }
          ]
        }
      ],
      classes: [], // always empty for merchandise
    }
  ],

  class_add_ons: [
    {
      id: string,
      name: string,
      description: string,
      price: number,
      required: boolean,
      max_qty: number,
      photo_url: string | null,
      options: [
        {
          name: string,
          values: [
            { label: string, price: number, photo_url: string | null }
          ]
        }
      ],
      classes: [string],   // class IDs
      class_rules: object, // arbitrary rules per class
    }
  ],

  pricing: {
    mode: "per_entry" | "tiered" | "per_class",

    global: {
      free: boolean,
      member: number,
      non_member: number,
      junior: number,
    },

    tiered: {
      member: { first_class: number, additional_class: number },
      non_member: { first_class: number, additional_class: number },
      junior: { first_class: number, additional_class: number },
    },

    class_prices: {
      [classId: string]: {
        free: boolean,
        member: number,
        non_member: number,
        junior: number,
      }
    },

    charge_preferences: boolean,
    late_fee: number,
  },

  is_published: boolean,
  class_limit: number,
  preference_enabled: boolean,
}
2. Normalization Rules (Save Handler)
These rules define how raw admin data becomes the final payload.

2.1 normalizeDate(v)
null / undefined → null

Date → ISO string

"" → null

"2026-09-11" → unchanged

2.2 Days normalization
js
days = eventData.days.map(d => ({
  date: normalizeDate(d.date),
  label: d.label ?? "",
  gates_open_at: d.gates_open_at ?? "",
  practice_at: d.practice_at ?? "",
  drivers_brief_at: d.drivers_brief_at ?? "",
  race_start_at: d.race_start_at ?? "",
}));
2.3 classes_by_day normalization
Always aligned with days:

js
classes_by_day = days.map((d, i) => ({
  date: d.date,
  label: d.label,
  classes: eventData.classes_by_day?.[i]?.classes ?? [],
}));
2.4 Single‑day vs multi‑day
Single‑day:

event_date = normalized date

days = [ { date: event_date } ]

classes_by_day = [ { classes: event.classes } ]

classes is used

Multi‑day:

event_date = null

days = [...]

classes_by_day = [...]

classes = []

3. Admin Modules (Editing Behavior)
3.1 EventBasicsCard
Basic metadata: name, description, event_type, track.

Logo upload.

Multi‑day toggle.

Single‑day uses event_date.

Multi‑day uses days[].

3.2 EventTimingCard
Edits days[].

Syncs event_date for single‑day.

Copy timing to all days.

Time fields may be "" or null.

3.3 EventNominationsCard
Edits nomination windows.

Late entry system.

Multi‑day displays day chips.

3.4 ClassesCard
Edits class_limit, preference_enabled, preference_limit.

Builds classes_by_day aligned with days.

Drag‑and‑drop ordering via SortableClassItem.

Class IDs must be unique per day.

3.5 EventPricingCard
Supports three modes:

Per Entry
pricing.global.free

Member / Non‑Member / Junior prices

charge_preferences

Tiered
First vs additional class per membership type

charge_preferences

Per Class
Per‑class overrides

class_prices[classId]

free flag

charge_preferences

Late Fee
Shown only if late_entries_enabled.

3.6 EventMerchandiseCard
Global merchandise items.

included (auto‑selected, free).

compulsory (must be selected).

max_qty.

Option groups with photos.

classes = [] always.

3.7 EventClassAddOnsCard
Class‑specific add‑ons.

required (must be selected).

max_qty.

Option groups with photos.

classes = [classId].

class_rules for advanced logic.

4. User‑Side Consumption Rules
4.1 Timing
Single‑day: use event_date + days[0].

Multi‑day: use days[].

Show label if present.

4.2 Nominations
Use nominations_open / nominations_close.

If late_entries_enabled:

Apply late fee after late_fee_activation.

Stop accepting late entries after late_entries_close.

4.3 Classes
Always read from classes_by_day.

Respect order.

Filter add‑ons by class ID.

4.4 Pricing
Use pricing.mode.

Apply membership type.

Apply preference charges.

Apply late fee.

Per‑class overrides take priority.

4.5 Merchandise
Global items.

Respect included, compulsory, max_qty.

Option groups and photos.

4.6 Class Add‑Ons
Filter by selected class.

Respect required, max_qty.

Apply class_rules.

5. Extension Guidelines
5.1 Adding new fields
You must update:

Admin edit card

Save handler payload

Admin listing

User‑side consumer

Never add fields in only one place.

5.2 Changing field types
Update all admin cards.

Update save handler.

Update user‑side logic.

Consider migration.

5.3 Multi‑day safety
days.length must always match classes_by_day.length.

Never store classes for multi‑day.

6. Debugging Guidelines
6.1 Classes not showing
Check:

classes_by_day[index].classes

available_classes

days alignment

6.2 Pricing wrong
Check:

pricing.mode

pricing.global

pricing.tiered

pricing.class_prices

pricing.late_fee

6.3 Merchandise/add‑ons missing
Check:

Arrays not null

IDs unique

Options arrays not empty

6.4 Timing wrong
Check:

days[] normalization

Single‑day sync with event_date

7. How to Work on Events (Developer Workflow)
Start with the payload schema  
Everything must match it.

Edit admin modules  
Add UI fields and ensure they write into eventData.

Update save handler  
Add new fields to payload.

Update AdminEvents listing  
Show new fields in summary.

Update user‑side logic  
Consume new fields correctly.

Test single‑day and multi‑day  
They behave differently.

Test pricing modes  
Per‑entry, tiered, per‑class.

Test merchandise and add‑ons  
Photos, options, required flags.

Test nominations windows  
Open, closed, late entry.

Test publication  
is_published controls visibility.

8. Memory Seed (Paste This to Me Anytime)
“The event payload saved to Supabase is exactly this shape:”

{
  club_id: number | null,
  name: string,
  description: string | null,
  event_type: string | null,
  track: string | null,
  logourl: string | null,

  is_multi_day: boolean,

  event_date: string | null, // single-day only

  days: [
    {
      date: string | null, // YYYY-MM-DD
      label: string,
      gates_open_at: string | null,
      practice_at: string | null,
      drivers_brief_at: string | null,
      race_start_at: string | null
    }
  ],

  nominations_open: string | null,
  nominations_close: string | null,

  classes_by_day: [
    {
      date: string | null,
      label: string,
      classes: [string] // class IDs
    }
  ],

  classes: [string], // legacy single-day only

  merchandise: [
    {
      id: string,
      name: string,
      description: string,
      price: number,
      included: boolean,
      compulsory: boolean,
      max_qty: number,
      photo_url: string | null,
      options: [
        {
          name: string,
          values: [
            { label: string, price: number, photo_url: string | null }
          ]
        }
      ],
      classes: []
    }
  ],

  class_add_ons: [
    {
      id: string,
      name: string,
      description: string,
      price: number,
      required: boolean,
      max_qty: number,
      photo_url: string | null,
      options: [
        {
          name: string,
          values: [
            { label: string, price: number, photo_url: string | null }
          ]
        }
      ],
      classes: [string],
      class_rules: object
    }
  ],

  pricing: {
    mode: "per_entry" | "tiered" | "per_class",

    global: {
      free: boolean,
      member: number,
      non_member: number,
      junior: number
    },

    tiered: {
      member: { first_class: number, additional_class: number },
      non_member: { first_class: number, additional_class: number },
      junior: { first_class: number, additional_class: number }
    },

    class_prices: {
      [classId: string]: {
        free: boolean,
        member: number,
        non_member: number,
        junior: number
      }
    },

    charge_preferences: boolean,
    late_fee: number
  },

  is_published: boolean,
  class_limit: number,
  preference_enabled: boolean
}


This instantly restores my full understanding of the event system.