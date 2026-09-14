Nominations — Developer & User Documentation
This document explains how Nominations are defined, stored, managed, and consumed across the RC Raceday CMS.
It covers:

Data model

Nomination windows

Multi‑day class assignment

Track/class integration

Event integration

User nomination flow

Component architecture

How to extend the system safely

1. Purpose
Nominations allow drivers to enter classes for an event.

The nomination system controls:

When drivers can nominate

Which classes are available on each day

How many classes a driver can enter

Whether late nominations are allowed

How class availability interacts with tracks

How merchandise rules apply per class

Nominations are event‑specific, not global.

2. Data Model
Nominations are stored inside the event object:

Code
event.nominations
Structure
json
{
  "open": "2026-09-04T10:00:00Z",
  "close": "2026-09-05T08:00:00Z",
  "classes_by_day": {
    "2026-09-05": ["classA", "classB"],
    "2026-09-06": ["classB", "classC"]
  }
}
Fields
Field	Type	Description
open	datetime	When nominations open
close	datetime	When nominations close
classes_by_day	object	Map of event day → array of class IDs


3. Nomination Windows
Nominations use two timestamps:

open
When drivers can start nominating.

close
When nominations close.

Behaviour
Before open: drivers see “Nominations not open yet”

Between open and close: drivers can nominate

After close: drivers see “Nominations closed”

If allow_late_nominations is enabled, drivers may still nominate (with late fee)

4. Multi‑Day Class Assignment
Events may be:

Single‑day

Multi‑day

Classes are assigned per day.

Example:

json
{
  "2026-09-05": ["Nitro", "E-Buggy"],
  "2026-09-06": ["E-Buggy", "Truggy"]
}
Why per‑day assignment matters
Some classes only run on certain days

Drivers nominate into classes based on the day they attend

Merchandise rules apply per class

Pricing may apply per class (future)

Scheduling is based on day/class combinations

5. Track ↔ Class Integration
Tracks determine which classes are allowed.

Events inherit allowed classes from:

Code
event.available_classes
Which is derived from:

The selected track

The track’s assigned classes

Validation
When assigning classes to days:

Only classes allowed on the track appear

If track changes, invalid classes are purged

Merchandise class rules are also purged

6. Component Architecture
Nominations are managed inside:

EventNominationsCard.jsx
This component handles:

Nomination open/close times

Multi‑day class assignment

Validation against track classes

Updating event.nominations

Rendering per‑day class selectors

Sub‑components (internal)
Date/time pickers

Class selector rows

Add/remove class buttons

7. CRUD Operations
Set Nomination Window
Admin selects:

Open datetime

Close datetime

Stored directly in event.nominations.

Add Class to Day
Admin selects a class from dropdown

Class is appended to classes_by_day[day]

Remove Class from Day
Class removed from array

Class rule blocks in merchandise are purged automatically

Add Day (multi‑day events)
Admin adds a new day

A new empty array is created in classes_by_day

Remove Day
Entire day entry removed

All class rules for that day’s classes are purged

8. How Nominations Flow Through the System
Nominations affect:

8.1 Events
Events store:

Code
event.nominations.classes_by_day
This determines:

Which classes appear in the user UI

Which classes merchandise can override

Which classes pricing applies to

Which classes scheduling applies to

8.2 Merchandise
Merchandise items reference classes:

Code
item.classes = ["classA", "classB"]
Class‑specific rules:

Code
item.class_rules[classId]
Nominations determine:

Which classes appear in the merchandise drawer

Which classes can have rule overrides

Which classes appear in the user UI

8.3 User Event Page
Drivers see:

Classes available on each day

Nomination open/close status

Class‑specific merchandise

Class‑specific pricing (future)

Driver flow:

Driver selects a day

Driver sees classes for that day

Driver selects a class

Merchandise + pricing update

Driver completes nomination

9. User Workflow (Admin)
Step 1 — Select Track
Event loads allowed classes.

Step 2 — Set Nomination Window
Admin sets open/close times.

Step 3 — Assign Classes Per Day
Admin assigns classes to each event day.

Step 4 — Save Event
Event now has complete nomination configuration.

10. User Workflow (Driver)
Step 1 — Open Event Page
Driver sees nomination status.

Step 2 — Select Day
Driver sees classes available on that day.

Step 3 — Select Class
Driver sees:

Class‑specific merchandise

Class‑specific pricing

Class‑specific schedule (future)

Step 4 — Complete Nomination
Driver submits entry.

11. Extending the Nomination System
Add Class Limits
Add:

Code
max_entries_per_class
Add Driver Limits
Add:

Code
max_classes_per_driver
Add Heat/Final Scheduling
Add:

Code
schedule: { day → class → heats }
Add Class Fees (per class)
Add:

Code
pricing: { classId → fee }
Add Late Nomination Rules
Add:

Code
allow_late_nominations
late_fee
12. Related Documentation
Tracks

Classes

Events

Merchandise

User Event Page

13. Summary
The Nominations system is:

Event‑specific

Track‑filtered

Class‑driven

Merchandise‑aware

User‑dependent

It controls:

When drivers can nominate

Which classes appear

How multi‑day events work

How class‑specific rules apply

This documentation should be updated whenever:

Nomination fields change

Class assignment logic changes

Event scheduling changes

