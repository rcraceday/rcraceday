ProtectedAppRoute — Developer Documentation
Overview
ProtectedAppRoute is the authentication + membership gatekeeper for all routes under:

Code
/:clubSlug/app/*
It ensures that only valid, active club members can access the authenticated section of the app.

It does not render layout, UI, spacing, or containers.
It does not interfere with AppLayout.
It does not swallow Outlet context.

Its only job is to allow or deny access.

Responsibilities
ProtectedAppRoute performs four checks:

1. User must be logged in
It verifies a Supabase session exists.

2. User must have a membership row
It ensures the user belongs to at least one club.

3. Membership must match the current club
It prevents users from accessing another club’s /app section.

4. Membership must be active
Suspended or expired members cannot access /app.

5. Admin routes (`admin` prop)
When `ProtectedAppRoute` is used with `admin`, the user's `profiles.role` must be `admin`. Non-admins with a valid membership are redirected to `/:clubSlug/app` (not login).

If any check fails, the user is redirected to:

Code
/:clubSlug/public/login
What ProtectedAppRoute Does NOT Do
❌ No layout
❌ No header
❌ No background
❌ No spacing
❌ No containers
❌ No UI
❌ No theme
❌ No Outlet context manipulation
This is critical — it ensures AppLayout remains the sole owner of layout and page structure.

Minimal Implementation
jsx
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { useClub } from "@/app/providers/ClubProvider";
import { useMembership } from "@/app/providers/MembershipProvider";

export default function ProtectedAppRoute({ children }) {
  const { session, loadingUser } = useAuth();
  const { membership, loadingMembership } = useMembership();
  const { club, loadingClub } = useClub();
  const { clubSlug } = useParams();

  // Still loading → block until ready
  if (loadingUser || loadingMembership || loadingClub) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        Checking access…
      </div>
    );
  }

  // 1. Must have a Supabase session
  if (!session?.user) {
    return <Navigate to={`/${clubSlug}/public/login`} replace />;
  }

  // 2. Must have a membership row
  if (!membership) {
    return <Navigate to={`/${clubSlug}/public/login`} replace />;
  }

  // 3. Membership must belong to this club
  if (membership.club_id !== club.id) {
    return <Navigate to={`/${clubSlug}/public/login`} replace />;
  }

  // 4. Membership must be active
  if (membership.status !== "active") {
    return <Navigate to={`/${clubSlug}/public/login`} replace />;
  }

  // All checks passed → allow access
  return children;
}
Route Structure
ProtectedAppRoute must wrap the route, not the layout:

❌ Wrong (breaks Outlet context)
Code
<ProtectedAppRoute>
  <AppLayout />
</ProtectedAppRoute>
✔ Correct (clean, modern, stable)
Code
<Route
  path="/:clubSlug/app/*"
  element={
    <ClubLayout>
      <ProtectedAppRoute />
    </ClubLayout>
  }
>
  <Route element={<AppLayout />}>
    <Route index element={<Home />} />
    ...
  </Route>
</Route>
This ensures:

ClubLayout applies theme

ProtectedAppRoute blocks access

AppLayout owns the page layout

Pages provide metadata via Outlet context

Everything renders correctly

Why This Matters
✔ Prevents unauthorized access
✔ Prevents cross‑club access
✔ Prevents expired membership access
✔ Keeps layout clean
✔ Keeps theme clean
✔ Keeps routing predictable
✔ Keeps Outlet context intact
✔ Makes the app maintainable
This is the correct architecture for a multi‑club, multi‑role system.

Extending ProtectedAppRoute
Developers may safely add:

additional membership checks

role checks (admin, race director, etc.)

feature flags

club‑specific access rules

Developers must not:

add layout

add UI

wrap AppLayout

modify theme

swallow children

return containers that break layout