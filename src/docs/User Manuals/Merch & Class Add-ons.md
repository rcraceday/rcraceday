User Manual
Overview
Use the Merch and Class Add‑Ons editors to create items and add‑ons that customers can select when registering for events. Option groups let you group choices (Colour, Size) and attach photos and optional prices to each value.

Merch Editor workflow
Open the event and navigate to the Merchandise section.

Select or create an item. Fill in:

Name — item title.

Description — item details.

Price — base price.

Max Qty — maximum quantity per order.

Included in Entry — toggle to include automatically.

Compulsory Item — toggle to force inclusion.

Photo — upload main image.

Add‑on Options:

Click New Option Group to add a group. The group name field shows the placeholder e.g. Colour or Size.

Use the helper text under the heading for guidance: Use descriptive group names (e.g. Colour, Size). Add option values and optional photos here.

Option Group Editor workflow
Group Name — enter a descriptive name (Colour, Size). If left empty the placeholder appears.

Add Option Value — type a label (e.g. Red, Large) and click Add Option Value or press Enter.

Option Photo — upload an image for a value using the photo control.

Remove Option — click Remove Option to delete a value.

Remove Group — click Remove Group to delete the entire group.

Notes

New groups are created with an empty name so the placeholder is visible.

Photos are uploaded when you save the parent item. Unsaved uploads are temporary until you click Save.

Class Add‑Ons workflow
Open the Class Add‑Ons card for the event.

Add Class Add‑On or Edit an existing one.

Fill in name, description, price, required flag, max qty, and upload a photo.

Add‑on Options — use the same Option Group Editor to define groups and values.

Apply to Classes — toggle the checkbox next to each class to include the add‑on for that class. Toggling initializes per‑class rules so you can later set class‑specific overrides.

Saving and uploads
Save to persist changes. On save the system uploads new photos, replaces photo_file with photo_url, and normalizes option values.

Photo uploads require a valid club_id on the event. If uploads fail, check the console for Supabase errors.

Troubleshooting and FAQ
New group shows literal text "New Option Group"

Cause: Parent component created the group with name: "New Option Group".

Fix: Ensure new groups are created with name: "". Search the codebase for the literal string and replace.

Buttons navigate away or reload the page

Cause: <button> default type="submit" or CMSButton not forwarding type.

Fix: Pass type="button" to action buttons or update CMSButton to forward type.

Photos not uploading

Cause: Missing event.club_id or Supabase error.

Fix: Confirm event.club_id exists and check the browser console for Supabase error details.

Class checkboxes not updating

Cause: item.classes not an array or updateClasses logic broken.

Fix: Ensure item.classes is an array before toggling:

js
const current = Array.isArray(item.classes) ? [...item.classes] : [];
Accidental deletion

Note: If you remove a group or value and haven’t saved, canceling the editor will discard unsaved changes. If you saved, you must recreate the group/value manually.

Appendix Examples
Create empty option group

js
update("options", [...(item.options || []), { name: "", values: [] }])
Toggle class membership and initialize rules

js
const defaultRule = {
  price: "",
  required: false,
  max_qty: "",
  photo_file: null,
  photo_url: null,
  description: "",
  options: []
};

function updateClasses(classId) {
  const current = Array.isArray(item.classes) ? [...item.classes] : [];
  const has = current.includes(classId);
  const next = has ? current.filter(c => c !== classId) : [...current, classId];
  const nextRules = { ...(item.class_rules || {}) };
  if (!has) nextRules[classId] = nextRules[classId] || defaultRule;
  setItem(prev => ({ ...prev, classes: next, class_rules: nextRules }));
}
Upload path pattern

Code
${event.club_id}/merch/${baseId}${suffix}_${timestamp}_${safeName}