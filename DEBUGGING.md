Debugging Guide

This guide provides a structured approach to diagnosing and resolving issues in your application. It focuses on common root causes such as render loops, rogue imports, layout chain problems, and stale files.

1. Infinite Render Loops

Symptoms

Browser freezes

High CPU usage

No console errors

Page fails to load

Checklist

Does a useEffect depend on a value that changes every render?

Does the effect call setState without proper guards?

Is the data shape different than expected (e.g., object vs. array)?

Are you spreading undefined into state?

Quick Test

Add logs:

console.log("EFFECT RUNNING", driver_profiles);

If the effect fires repeatedly, you have an infinite loop.

Fix Pattern

Guard the effect

Normalize the data shape

Avoid setting state from unstable or undefined values

2. Rogue Imports

Symptoms

A page logs before ClubLayout

A page loads even when not on that route

Context is undefined

Layout never renders

Unexpected order of logs

Checklist

Search for:

Welcome.jsx

pages/public/Welcome

export *

import *

Fix Pattern

Remove direct imports of pages

Ensure pages load only through <Route>

Add file-loaded logs to confirm:

console.log("WELCOME FILE LOADED");

If it logs before routing, it's a rogue import.

3. Layout Chain Issues

Symptoms

useOutletContext() returns undefined

Page renders but crashes

Layout logs don't appear

Page appears outside the expected layout

Checklist

Add logs to each layout:

console.log("CLUBLAYOUT FILE LOADED");
console.log("CLUBLAYOUT COMPONENT RENDERED");

If a layout doesn't log, React isn't using it.

Fix Pattern

Ensure the layout returns <Outlet />

Confirm correct route nesting

Remove unnecessary wrapper components

Verify the correct file is being edited

4. Old Routes or Files Still Being Hit

Symptoms

Fixes don't take effect

Logs show the wrong file

Navigation hits outdated routes

AddDriver → EditDriver loops

Checklist

Search for:

/add-driver

/edit-driver

Add logs:

console.log("EDIT DRIVER FILE LOADED");

If the wrong file logs, an old route still exists.

Fix Pattern

Delete old routes

Remove outdated files

Update navigation paths

Restart the development server

5. Data Shape Validation

Symptoms

Unexpected state updates

Effects firing unexpectedly

Incorrect form population

Crashes when spreading objects

Checklist

Log the data:

console.log("DATA SHAPE:", data);

Ask:

Is it an array or object?

Does it contain the expected fields?

Is it null or undefined?

Fix Pattern

Normalize before using:

const profile = driver_profiles || {};

6. Missing Keys in Lists

Symptoms

Flickering

Re-renders

Strange UI behavior

Checklist

Ensure every .map() has a unique key:

key={item.id}

7. Stale or Cached Files

Symptoms

Edits don't reflect in the browser

Logs don't update

Old behavior persists

Checklist

Restart Vite

Clear browser cache

Confirm correct import paths

Add a log at the top of the file to verify it's being used

8. Missing Return Statements

Symptoms

Blank pages

Missing layout

No errors

Checklist

Ensure components return valid JSX:

return <div>...</div>;

9. Suspicious useMemo / useCallback Dependencies

Symptoms

Functions re-run unexpectedly

Effects fire too often

Checklist

Verify dependencies are correct and stable

10. Render Chain Logging (Nuclear Option)

If all else fails, add logs to trace the render chain:

console.log("ROUTE FILE LOADED");
console.log("LAYOUT RENDERED");
console.log("PAGE RENDERED");

This reveals:

Execution order

Which file is running

Whether routing is correct

Whether context is flowing

6. PWA service worker — white page on auth routes

Symptoms

Blank page on `/reset-password`, `/forgot-password`, or `/` after a password reset email link

Console: `FetchEvent for ".../reset-password" resulted in a network error` or `sw.js ... Failed to convert value to 'Response'`

Checklist

Are you on `pnpm dev` but still see `sw.js` errors? A stale worker from an old `pnpm preview` or production visit may still control `localhost:5173`.

Dev now unregisters all service workers on load (`src/main.jsx`). Hard refresh (Ctrl+Shift+R) once after pulling.

If it persists: DevTools → Application → Service Workers → Unregister, then Clear site data for localhost.

Production builds use a Workbox `navigateFallbackDenylist` for auth paths so navigation is not broken by offline fallback.

Fix Pattern

Rebuild and redeploy after `vite.config.js` PWA changes.

Re-paste Supabase email HTML from `scripts/` if logo URLs changed.

Final Rule

If something "impossible" happens, check these first:

Infinite useEffect loop

Rogue import

Broken <Outlet /> chain

These three issues cause the majority of complex bugs.