Classes — Developer Documentation
This document explains how Classes are defined, stored, managed, and consumed across the RC Raceday CMS.

It covers:

Data model

CRUD operations

Track assignments

Event integration

Nominations integration

Merchandise integration

Component architecture

Class limits & preferences

How classes flow through the system

How to extend the system safely

1. Purpose
Classes represent vehicle categories or race categories that drivers can nominate into.

Examples:

1/8 Nitro Buggy

1/8 E‑Buggy

2WD Modified Buggy

Stadium Truck

Vintage Jackaroos

Classes are global to the club, not per‑event.

Tracks determine which classes are allowed at each venue.
Events then select classes per day from the track’s allowed classes.

2. Data Model
Classes are stored in Supabase under:

Code
club_classes
Table Structure
column_name	data_type
id	uuid
club_id	uuid
name	text
description	text
created_at	timestamp


Example Class Record
json
{
  "id": "uuid",
  "club_id": "uuid",
  "name": "1/8 Nitro Buggy",
  "description": "Standard 1/8 scale nitro buggy class",
  "created_at": "2026-01-01T10:00:00Z"
}
3. Track ↔ Class Assignment Model
Tracks determine which classes are allowed at that venue.

Assignments are stored in:

Code
club_track_classes
Table Structure
column_name	data_type
id	uuid
track_id	uuid
class_id	uuid
created_at	timestamp


Purpose
Tracks define allowed classes

Events inherit allowed classes from the selected track

Nominations and merchandise use these allowed classes

Example Assignment
json
{
  "track_id": "track-123",
  "class_id": "class-456"
}
4. Component Architecture
Classes are managed inside the Track & Class Manager page.

Main Page
TracksClassesSettings.jsx

Child Components
TracksCard

ClassesCard

AssignmentsCard

These components receive:

tracks

classes

assignments

CRUD handlers

Assignment toggle handlers

5. CRUD Operations
Create Class
Admin enters class name + optional description

Insert into club_classes

Append to local state

No assignments created automatically

Edit Class
Inline editing

Update row in Supabase

Replace in local state

Delete Class
Remove from club_classes

Remove all club_track_classes rows for that class

Remove from local state

Remove from assignments map

Bulk Add Classes
Multi‑line input

Each line becomes a new class

Insert in one Supabase call

Merge returned rows into local state

6. Class Limits & Preferences (NEW)
Events now support:

class_limit
Maximum number of classes a driver may nominate.

preference_enabled
Whether drivers may select preference classes.

preference_limit
Maximum number of preferences allowed.

These fields are stored directly on the event:

json
{
  "class_limit": 2,
  "preference_enabled": true,
  "preference_limit": 1
}
7. Classes Per Day (NEW)
Events store class assignments per day:

Code
event.classes_by_day
Example
json
{
  "2026-09-05": { "classes": ["classA", "classB"] },
  "2026-09-06": { "classes": ["classB", "classC"] }
}
Features
Supports multi‑day events

Drag‑and‑drop ordering

No progressive empty slot

Explicit class entries only

“Add Class” button adds a new slot

Removing a class removes the slot

8. How Classes Flow Through the System
Classes are used in three major systems:

8.1 Tracks
Tracks define which classes are allowed.

Flow:

Admin creates classes

Admin assigns classes to tracks

Tracks now have allowed classes

8.2 Events
Events do not store classes directly.
Instead, events store:

Code
event.available_classes
which is derived from:

The selected track

The track’s assigned classes

Events also store:

Code
event.classes_by_day
Merged across all days:

js
const allClasses = unique(all classes across all days)
Filtered against:

Code
event.available_classes
This prevents:

Ghost classes

Deleted classes

Classes not allowed on the track

8.3 Nominations
Nominations use classes to:

Show available classes

Enforce class limits

Enforce preference limits

Apply class‑specific pricing

Apply class‑specific merchandise rules

Driver Flow
Driver selects a class

UI loads class‑specific rules

Pricing updates

Merchandise updates

Schedule updates

9. Merchandise Integration
Merchandise items reference classes:

Code
item.classes = ["classA", "classB"]
Class‑specific rules:

Code
item.class_rules[classId]
Classes determine:

Which rule blocks appear

Which overrides apply

Which photos apply

Which option groups apply

10. Class Selection Logic
In TracksClassesSettings
Classes are global

Tracks assign classes

Assignments stored in club_track_classes

In Events
Events derive classes from:

Code
event.classes_by_day
Filtered against:

Code
event.available_classes
In User UI
Only allowed classes appear

Only classes assigned to that day appear

Order matches admin drag‑and‑drop order

11. Extending the Class System
Add Class Categories (future)
Code
category: "Buggy" | "Truck" | "Vintage"
Add Class Restrictions (future)
Code
min_age
max_age
engine_type
weight_limit
Add Class Icons (future)
Code
icon_url
Add Class Ordering (future)
Code
sort_order
12. Summary
The Classes system is:

Global

Track‑controlled

Event‑filtered

Merchandise‑aware

User‑driven

It is the backbone of:

Track configuration

Event configuration

Nominations

Merchandise overrides

User UI logic

This documentation should be updated whenever:

Class fields change

Track assignment logic changes

Event nomination logic changes

Merchandise override logic changes