Event Management — Developer Documentation
This document explains how the Admin Event Management System works inside the CMS, including:

Event data model

Multi‑day event logic

Tracks & Classes integration

Nominations integration

Pricing integration

Merchandise integration

Event logo & branding

Timing & scheduling

Component architecture

How the user UI consumes event data

How to extend the system safely

1. Purpose
The Event Management system allows club administrators to create, configure, publish, and manage racing events.
It is the central configuration hub for:

Event details

Multi‑day scheduling

Track selection

Class availability

Nominations

Pricing

Merchandise

Branding

Timing

Event status (draft/published)

The Event page is the root configuration object for everything the user sees on the public event page.

2. Event Data Model
Events are stored in Supabase under:

Code
club_events
Event Structure
json
{
  "id": "uuid",
  "club_id": "uuid",
  "name": "Dirt Track Clubby",
  "description": "Optional long-form description",
  "event_type": "Club Meet",
  "track_id": "uuid",
  "is_multi_day": true,
  "event_date": "2026-09-05",
  "days": ["2026-09-05", "2026-09-06"],
  "logo_url": "https://...",
  "published": true,

  "timing": {
    "opens_at": "2026-09-05T09:00:00Z",
    "briefing_at": "2026-09-05T09:30:00Z",
    "closes_at": "2026-09-05T17:00:00Z",
    "location": "123 Dirt Track Road"
  },

  "nominations": {
    "open": "2026-09-04T10:00:00Z",
    "close": "2026-09-05T08:00:00Z",
    "classes_by_day": {
      "2026-09-05": ["classA", "classB"],
      "2026-09-06": ["classB", "classC"]
    }
  },

  "pricing": {
    "base_entry": 25,
    "extra_classes": 10,
    "late_fee": 5
  },

  "merchandise": [],

  "settings": {
    "allow_multiple_classes": true,
    "allow_late_nominations": false
  }
}
3. Multi‑Day Event Logic
Events can be:

Single‑day

Multi‑day

Single‑Day Mode
Code
is_multi_day = false
days = []
event_date = "YYYY-MM-DD"
Multi‑Day Mode
Code
is_multi_day = true
days = ["YYYY-MM-DD", "YYYY-MM-DD", ...]
event_date = first day
UI Behaviour
Toggling “Multi‑Day Event?” switches between modes

Adding/removing days updates days[]

Nominations and classes are assigned per day

User UI shows a tab or section for each day

4. Tracks & Classes Integration
Events do not store classes directly.

Instead, classes come from:

Code
event.nominations.classes_by_day
And class metadata comes from:

Code
event.available_classes
Which is derived from:

The selected track

The track’s assigned classes (from Tracks & Classes Manager)

Flow
Admin selects a track

System loads classes assigned to that track

These become available_classes

Admin assigns classes to each event day

Merchandise, pricing, and user UI all reference these classes

5. Nominations System
Nominations define:

When drivers can nominate

Which classes are available on each day

How many classes a driver can enter

Whether late nominations are allowed

Structure
json
{
  "open": "datetime",
  "close": "datetime",
  "classes_by_day": {
    "2026-09-05": ["classA", "classB"],
    "2026-09-06": ["classB", "classC"]
  }
}
UI Behaviour
Date/time pickers for open/close

Per‑day class assignment

Add/remove class rows

Validation: cannot assign classes not available on the track

6. Pricing System
Pricing defines:

Base entry fee

Extra class fee

Late nomination fee

Optional per‑class pricing (future extension)

Structure
json
{
  "base_entry": 25,
  "extra_classes": 10,
  "late_fee": 5
}
7. Merchandise System
Events include a merchandise array:

Code
event.merchandise[]
See full documentation:
Merchandise Developer Manual

8. Event Logo & Branding
Events can upload a logo stored in:

Code
storage: club-assets/event-logos
Behaviour
Upload via CMSImageUpload

Remove resets logo_url

User UI displays logo at top of event page

9. Timing & Scheduling
Timing includes:

Event opens

Drivers briefing

Event closes

Location

All stored as ISO datetimes.

10. Component Architecture
The Event Editor is composed of multiple CMS components:

Main Page
AdminEventEdit.jsx

Sub‑components
EventDetailsCard

EventTimingCard

EventNominationsCard

EventPricingCard

EventMerchandiseCard

EventSettingsCard

Each section uses:

CMSCard

CMSInput

CMSToggle

CMSSelect

CMSImageUpload

CMSButton

Drawer Components
Merchandise uses:

MerchGlobalEditor

MerchClassRuleEditor

OptionGroupEditor

11. User Event Page Consumption
The user event page reads:

Event details

Event logo

Event days

Classes available

Pricing

Merchandise

Timing

Nominations open/close

Track details

Merchandise Logic
User UI must:

Detect driver’s class

Apply class‑specific overrides

Fall back to global rules

Show correct photos

Show correct option groups

Enforce max quantity

Enforce included logic

12. Extending the Event System
Adding new fields
Add to:

EventDetailsCard

AdminEventEdit save logic

User Event Page

Adding new pricing rules
Extend:

Code
event.pricing
Adding new nomination rules
Extend:

Code
event.nominations
Adding new merchandise rules
Extend:

Code
event.merchandise
13. Summary
The Event Management system is the central configuration hub for all event‑related data.
It integrates:

Tracks

Classes

Nominations

Pricing

Merchandise

Branding

Timing

This documentation should be updated whenever:

New event fields are added

UI changes

User flow changes

Data model changes