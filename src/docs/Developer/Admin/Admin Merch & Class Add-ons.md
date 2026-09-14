Developer Guide
Purpose
MerchEditor and ClassAddOnEditor let admins define option groups (e.g., Colour, Size) and option values (e.g., Red, Large) with optional photos and per‑class application.

EventClassAddOnsCard manages the collection of class add‑ons for an event and persists changes via the parent onChange handler.

State and Data Shape
Use this canonical example for class_add_ons and options:

json
{
  "class_add_ons": [
    {
      "id": "uuid",
      "name": "T‑shirt",
      "description": "Event tee",
      "price": 25,
      "required": false,
      "max_qty": 2,
      "photo_url": "https://...",
      "options": [
        {
          "name": "Colour",
          "values": [
            { "id": "v1", "label": "Red", "price": 0, "photo_url": null },
            { "id": "v2", "label": "Blue", "price": 0, "photo_url": null }
          ]
        }
      ],
      "classes": ["classId1", "classId2"],
      "class_rules": {
        "classId1": { "price": 20, "required": false, "max_qty": 1 }
      }
    }
  ]
}
Integration Points
Parent component must pass event into ClassAddOnEditor and EventClassAddOnsCard so event.club_id and event.available_classes are available.

onChange signature used in examples: onChange(fieldName, value) where fieldName is "class_add_ons" or "options" depending on context.

Important Implementation Notes
Always pass event into ClassAddOnEditor:

jsx
<ClassAddOnEditor item={editingItem} event={event} setItem={setEditingItem} />
Create new option groups with an empty name so the editor shows the placeholder:

js
update("options", [...options, { name: "", values: [] }])
Ensure CMSButton forwards type to underlying <button> or pass type="button" to avoid accidental form submits.

File uploads use Supabase storage; ensure event.club_id exists before uploading.

Component APIs
EventClassAddOnsCard
Props

event object — event data; expects class_add_ons, club_id, available_classes.

onChange function — (fieldName, value) => void.

Behavior

Renders list of add‑ons.

Opens drawer with ClassAddOnEditor for create/edit.

Handles photo uploads via supabase.storage.

Duplicate creates a new id and clears classes by default.

Key functions

openNewItemDrawer() — initializes editingItem with id: crypto.randomUUID(), name: "", ....

saveItem(item) — uploads photos, normalizes options, calls onChange("class_add_ons", updated).

ClassAddOnEditor
Props

item object — the add‑on being edited.

event object — required for club_id and available_classes.

setItem function — setter to update item state.

Responsibilities

Edit name, description, price, required, max_qty, photo.

Manage Add‑on Options (groups) via OptionGroupEditor.

Apply add‑on to classes via checkbox list (preferred over multi‑select).

Initialize and preserve class_rules when toggling classes.

Recommended helper

updateClasses(classId) toggles membership and ensures class_rules[classId] exists.

MerchEditor
Props

item object — merch item.

setItem function.

Behavior

Same option group UX as class add‑ons.

Helper text under Add‑on Options heading.

New groups created with name: "".

OptionGroupEditor
Props

group object — { name, values }.

onRename(name) — update group name.

onAddValue(label) — add a new value with label.

onUpdateValue(index, label) — update value label.

onUpdateValuePhoto(index, fileOrUrl) — update value photo.

onRemoveValue(index) — remove value.

onRemoveGroup() — remove group.

UX

Group Name input placeholder: e.g. Colour or Size.

Add Option Value button text.

Buttons must be type="button".

UX Copy and Behavior
Headings and labels

Section title: Add‑on Options

Group card title fallback: Option Group

Group name placeholder: e.g. Colour or Size

New group button: New Option Group

Add value button: Add Option Value

Helper text under Add‑on Options heading:

Use descriptive group names (e.g. Colour, Size). Add option values and optional photos here.

Class assignment

Use a checkbox list for classes instead of a multi‑select dropdown for clarity and faster toggling.

Each checkbox toggles class membership and initializes class_rules for that class.

Photos

Global photo for item and per‑value photos supported.

Upload path pattern: ${event.club_id}/merch/${baseId}_${suffix}_${timestamp}_${safeName}.

Always check event.club_id before uploading.

Troubleshooting and Common Fixes
Symptom: Drawer shows the parent card again or duplicate UI

Cause: Editor crashed due to missing prop or runtime error; React re‑renders parent inside drawer.

Fix: Ensure event is passed to ClassAddOnEditor. Check console for errors.

Symptom: Clicking buttons navigates or reloads page

Cause: <button> default type="submit" inside a form or CMSButton not forwarding type.

Fix: Pass type="button" to all action buttons or update CMSButton to forward type.

Symptom: New group title shows "New Option Group"

Cause: Parent creates group with name: "New Option Group".

Fix: Create groups with name: "" so the editor shows the placeholder. Search project for the literal string and replace.

Symptom: Class list not updating

Cause: updateClasses not toggling correctly or item.classes not an array.

Fix: Ensure item.classes is an array before toggling. Use:

js
const current = Array.isArray(item.classes) ? [...item.classes] : [];
and then set classes and class_rules together.

Symptom: Photo upload fails

Cause: Missing event.club_id or Supabase error.

Fix: Validate event.club_id before upload and log error returned by Supabase.

Debugging tips

Restart dev server after file changes to clear Vite cache.

Search for literal strings when UI text doesn’t update:

bash
rg "New Option Group" || grep -R "New Option Group" .
Inspect console for runtime exceptions; they often point to missing props or undefined values.

Appendix Quick Examples
Create empty option group

js
update("options", [...(item.options || []), { name: "", values: [] }])
Toggle class membership

js
function updateClasses(classId) {
  const current = Array.isArray(item.classes) ? [...item.classes] : [];
  const next = current.includes(classId) ? current.filter(c => c !== classId) : [...current, classId];
  setItem(prev => ({ ...prev, classes: next, class_rules: { ...(prev.class_rules || {}), [classId]: prev.class_rules?.[classId] || defaultRule } }));
}
Default rule

js
const defaultRule = { price: "", required: false, max_qty: "", photo_file: null, 