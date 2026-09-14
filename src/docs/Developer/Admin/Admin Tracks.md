1. Purpose
Tracks represent physical racing venues used by the club.
Each track defines:

Track name

Location (optional)

Description (optional)

Assigned classes (which classes can race at this track)

Optional track image or layout (future extension)

Tracks are global to the club, not per‑event.

Events select a track, and that track determines:

Which classes are available

Which classes can be nominated

Which classes can have merchandise rules

Which classes appear in the user UI

2. Data Model
Tracks are stored in Supabase under:

Code
club_tracks
Table Structure
column_name	data_type
id	uuid
club_id	uuid
name	text
description	text
created_at	timestamp


Example Track Record
json
{
  "id": "track-123",
  "club_id": "club-001",
  "name": "Dirt Track",
  "description": "Outdoor clay track with jumps",
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
Tracks are managed inside the Track & Class Manager page.

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

TracksCard Responsibilities
Display list of tracks

Add new track

Edit track name/description

Delete track

Trigger class assignment UI

AssignmentsCard Responsibilities
Show all classes

Toggle class assignment for the selected track

Update club_track_classes table

Update local state

5. CRUD Operations
Create Track
Admin enters track name + optional description

Insert into club_tracks

Append to local state

Edit Track
Inline editing

Update row in Supabase

Replace in local state

Delete Track
Remove from club_tracks

Remove all club_track_classes rows for that track

Remove from local state

Remove from assignments map

Bulk Add Tracks (future)
Not currently implemented, but easy to add.

6. How Tracks Flow Through the System
Tracks are used in three major systems:

6.1 Events
Events store:

Code
event.track_id
When an admin selects a track:

System loads all classes assigned to that track

These become event.available_classes

Nominations can only use these classes

Merchandise can only apply rules to these classes

User UI only shows these classes

6.2 Nominations
Nominations store:

Code
event.nominations.classes_by_day
These classes must be:

Assigned to the selected track

Present in event.available_classes

If a track changes:

Invalid classes are purged

Nominations update automatically

Merchandise class rules update automatically

6.3 Merchandise
Merchandise items reference classes:

Code
item.classes = ["classA", "classB"]
Class‑specific rules:

Code
item.class_rules[classId]
Tracks determine:

Which classes appear in the merchandise drawer

Which classes can have rule overrides

Which classes appear in the user UI

7. User Workflow (Admin)
Step 1 — Create Tracks
Admin creates one or more tracks.

Step 2 — Create Classes
Admin creates all classes the club supports.

Step 3 — Assign Classes to Tracks
Admin assigns classes to each track.

Step 4 — Create Event
Admin selects a track for the event.

Step 5 — Event inherits allowed classes
Event now knows which classes are valid.

Step 6 — Admin assigns classes per day
Nominations use these classes.

Step 7 — Merchandise uses these classes
Class‑specific rules appear only for allowed classes.

8. User Workflow (Driver)
Drivers never interact with tracks directly.

Tracks influence:

Which classes appear

Which merchandise rules apply

Which nomination options exist

Driver flow:

Driver opens event page

Driver sees classes allowed at the selected track

Driver nominates into one

Merchandise + pricing update based on class

Driver completes registration

9. Extending the Track System
Add Track Images
Add:

Code
image_url
Then:

Add CMSImageUpload to TracksCard

Store image in Supabase

Display image in user UI

Add Track Location
Add:

Code
location: "123 Dirt Road, Brisbane"
Add Track Layout Map
Add:

Code
layout_url
Add Track Surface Type
Add:

Code
surface: "Clay" | "Astro" | "Carpet"
Add Track Length / Lap Time
Add:

Code
length_meters
average_lap_time
10. Related Documentation
Classes

Events

Nominations

Merchandise

User Event Page

11. Summary
The Tracks system is:

Global

Class‑driven

Event‑dependent

Merchandise‑aware

User‑invisible but essential

Tracks determine:

Which classes can race

Which classes appear in events

Which classes appear in nominations

Which classes appear in merchandise

Which classes appear in the user UI

This documentation should be updated whenever:

Track fields change

Class assignment logic changes

Event nomination logic changes

Merchandise override logic changes