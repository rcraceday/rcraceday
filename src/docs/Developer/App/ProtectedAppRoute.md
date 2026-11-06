# ProtectedAppRoute — Developer Documentation

## Overview

`ProtectedAppRoute` is the authentication and membership gate for routes under:

```text
/:clubSlug/app/*
```

It does not render layout, theme, or containers. `AppLayout` / `AdminLayout` own UI.

## Checks (in order)

1. **Session** — Supabase user must exist. If not → `platformLoginPathForClub(clubSlug, returnTo)` (platform home with `returnTo` chain to club access), **not** `/:clubSlug/public/login`.
2. **Email confirmed** — If not → `/:clubSlug/public/check-email`.
3. **Loading** — Waits for club, membership, and (when `admin`) profile + admin access.
4. **Membership** — Active row for **this** club. If missing/wrong club/inactive → `/:clubSlug/public/claim-membership` (club access), not login.
5. **Admin** (`admin` prop) — Requires admin access; otherwise → `/:clubSlug/app` with optional `adminDenied` state.

## Reference implementation

See `src/app/routes/ProtectedAppRoute.jsx` — the snippet below is illustrative only:

```jsx
const safeReturnTo = appReturnPathFromLocation(location, clubSlug);
const loginTo = platformLoginPathForClub(clubSlug, safeReturnTo);

if (!session?.user) {
  return <Navigate to={loginTo} replace />;
}

if (!session.user.email_confirmed_at) {
  return (
    <Navigate
      to={publicCheckEmailPath(clubSlug, session.user.email || "", safeReturnTo)}
      replace
    />
  );
}

if (!membership || membership.club_id !== club.id || membership.status !== "active") {
  return (
    <Navigate to={publicClaimMembershipPath(clubSlug, safeReturnTo)} replace />
  );
}
```

## Route structure

Wrap the route element, not `AppLayout`:

```jsx
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
  </Route>
</Route>
```

## Do not

- Redirect unauthenticated users to `/:clubSlug/public/login` (legacy; no login form there).
- Add layout or theme inside this component.
- Wrap `AppLayout` inside the guard.
