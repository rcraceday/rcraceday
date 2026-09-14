1. Purpose
The Merchandise system allows clubs to configure event‑specific purchasable items, such as:

Control tyres

Fuel

Transponders

T‑shirts

Hoodies

Stickers

Lunch vouchers

Any other add‑on

Each item supports:

Global settings

Class‑specific overrides

Option groups (e.g., Size, Compound, Colour)

Photos (global + per‑class)

Included vs paid

Max quantity limits

This system is used by both:

Admin CMS (configuration)

User Event Page (driver purchasing)

2. Data Model
Each merchandise item is stored inside:

Code
event.merchandise: jsonb[]
Item Structure
json
{
  "id": "uuid",
  "name": "Control Tyres",
  "description": "Default tyre set for the event",
  "price": 35,
  "included": false,
  "max_qty": 2,
  "photo_url": "https://...",
  "options": [
    {
      "name": "Compound",
      "values": ["Soft", "Medium", "Hard"]
    }
  ],
  "classes": ["classIdA", "classIdB"],
  "class_rules": {
    "classIdA": {
      "price": 30,
      "included": false,
      "max_qty": 1,
      "photo_url": "https://...",
      "description": "Soft compound only",
      "options": [
        {
          "name": "Compound",
          "values": ["Soft"]
        }
      ]
    }
  }
}
3. Global vs Class‑Specific Logic
The system uses a strict override model:

Global Settings
Used when:

The item has no classes selected, OR

A class has no rule block

Class‑Specific Settings
Used when:

The class is selected

The class has a rule block inside class_rules[classId]

Override Rules
Class rules override everything, including:

Price

Included

Max quantity

Description

Photo

Option groups

If a field is missing in the class rule, the system does not fall back — class rules must be complete.

4. Option Groups
Option groups allow admins to define selectable variations:

Examples:

Size → Small, Medium, Large

Compound → Soft, Medium, Hard

Colour → Red, Blue, Black

Global Option Groups
Apply to all classes unless overridden.

Class‑Specific Option Groups
Replace global groups entirely for that class.

UI Behaviour
Option groups use a controlled input:

Admin types a value

Presses Enter or clicks Add

Value is appended

Input clears

No more “one letter only” bug

5. Image Handling
Images are uploaded to:

Code
supabase.storage.from("club-assets")
Path format:

Code
{club_id}/merch/{itemId}_{classId?}_{timestamp}_{filename}
Global Photo
Used when:

No class‑specific photo exists

Class‑Specific Photo
Overrides global photo.

6. Component Architecture
The merchandise system is split into three components:

6.1 EventMerchandiseCard.jsx
Controller component:

Renders merchandise list

Opens/closes drawer

Loads classes from classes_by_day

Purges invalid classes when track changes

Saves final merged item

Fixed header + scrollable content

6.2 MerchGlobalEditor.jsx
Handles:

Name

Description

Price

Included

Max qty

Global photo

Global option groups

Class selection

6.3 MerchClassRuleEditor.jsx
Handles:

Class‑specific description

Class‑specific price

Class‑specific included

Class‑specific max qty

Class‑specific photo

Class‑specific option groups

6.4 OptionGroupEditor.jsx
Reusable editor for:

Group name

Values

Add value

Remove value

Remove group

7. Class Detection
Classes are not stored directly in event.classes.
Instead, they come from:

Code
event.classes_by_day
Example:

json
{
  "2026-09-10": { "classes": ["A", "B"] },
  "2026-09-11": { "classes": ["B", "C"] }
}
The system merges all days:

js
const classes = unique(all classes across all days)
Then filters against:

Code
event.available_classes
This ensures:

Only valid classes appear

Class names are available

No ghost classes remain

8. User Event Page Consumption
The user UI must:

Detect the driver’s selected class

Load merchandise

For each item:

If class rule exists → use it

Else → use global

Show correct:

Price

Included

Max qty

Description

Photo

Option groups

This ensures drivers see exactly what applies to their class.

9. Extending the System
This section explains how to safely extend the merchandise system.

Adding New Fields
Add the field to:

Global editor

Class rule editor

Data model

User UI

Adding New Option Group Types
Option groups are generic — no changes needed.

Adding Inventory Tracking
Add:

Code
inventory: number
Then enforce limits in user UI.

Adding Required Options
Add:

Code
required: boolean
Then enforce selection in user UI.

10. Related Documentation
Tracks

Classes

Event Page

User Event UI

11. Summary
The merchandise system is now:

Modular

Predictable

Fully documented

Class‑aware

Override‑capable

User‑friendly

Admin‑friendly

Easy to extend

This .md file should be updated whenever:

New fields are added

UI changes

User flow changes

Data model changes