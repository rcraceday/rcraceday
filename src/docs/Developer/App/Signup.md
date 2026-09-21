# Signup and Login — Developer Documentation

## Overview

Signup and login are club-scoped. Public authentication pages are available under:

```text
/:clubSlug/public/*
```

The relevant routes are:

```text
/:clubSlug/public/login
/:clubSlug/public/signup
/:clubSlug/public/check-email
```

`Signup.jsx` creates the Supabase Auth user and profile. `Login.jsx` then reconciles that Auth user with the selected club's `household_memberships` row before sending the user into the authenticated app.

## Provider and Route Boundaries

Public authentication pages are rendered by this route chain:

```text
ClubProvider
  ThemeProvider
    PublicLayout
      Login / Signup / CheckEmail
```

They do not require an authenticated user or the authenticated provider stack. `AppProviders` deliberately leaves public routes outside `ProfileProvider`, `MembershipProvider`, `DriverProvider`, `NumberProvider`, and `NotificationProvider`.

Authenticated pages use the `/:clubSlug/app/*` route and are guarded by `ProtectedAppRoute`. A user must have:

1. A Supabase session.
2. A confirmed email address.
3. A membership row for the current club.
4. An active membership status.

Failures redirect to the club's login or email-confirmation page.

## Signup Flow

### 1. Select the account type

The first signup screen asks whether the person is already a financial member of the club.

The answer selects one of two paths:

```text
memberQuestion
  -> memberLookup
  -> memberCreatePassword

memberQuestion
  -> nonMemberSignup
```

### 2. Existing member lookup

Existing members enter the email address they gave the club. `Signup.jsx` sends the normalized email and `club_id` to the `lookup-membership` Edge Function.

The function uses the service role to query `household_memberships` because an anonymous browser request must not read membership rows through the client. It returns the membership details needed by the form, but does not expose the stored `user_id`; it only returns `hasAccount`.

If no membership is found, signup stops with an error. If one is found, the member's name and email are carried into the password step.

### 3. Non-member signup

Non-members provide:

- Full name
- Email address
- Password
- Password confirmation

Before creating an account, the same membership lookup runs. If the email already belongs to a membership at that club, the user is directed to the existing-member path instead. This prevents creating a second account for a known club member.

### 4. Create the Auth user

Both branches call the `create-user` Edge Function with the email, password, and metadata. The metadata includes:

```text
full_name
first_name
last_name
club_id
club_name
club_logo_url
email_redirect_to
signup_type
membership_id  (existing members only)
```

The Edge Function:

1. Calls `supabase.auth.signUp` with the supplied metadata.
2. Requires email confirmation to be enabled.
3. Resends the signup email when the Auth identity already exists but is still unconfirmed.
4. Upserts the user's row in `profiles`.
5. Returns the created user and signup type.

The Edge Function uses the service role only on the server. The browser calls it with the public Supabase anon key and must not receive or use the service-role key.

### 5. Confirm the email

After a successful Edge Function response, the browser navigates to:

```text
/:clubSlug/public/check-email?email=<normalized-email>
```

Supabase sends the confirmation link to the email address. `CheckEmail.jsx` can resend that link with `supabase.auth.resend`. The confirmation link redirects back to the club login page.

Signup does not enter the app immediately. Email confirmation and a subsequent login are required.

## Login Flow

`Login.jsx` uses `supabase.auth.signInWithPassword` with a trimmed, lower-case email.

### Login error handling

- An unconfirmed email redirects to `check-email`.
- Invalid credentials redirect to signup with a message explaining that the account or email was not found.
- Other Supabase errors are shown on the login page.

### Membership reconciliation

After authentication succeeds, login gets the Supabase user and finds the club membership in this order:

1. Query `household_memberships` by `club_id` and `user_id`.
2. If that fails to find a row, query by `club_id` and the user's email.

If an email match is found and is not linked yet, login sets its `user_id` to the authenticated user's ID. A member signup therefore links the existing club membership on first login.

If no membership is found, login permits only a user whose metadata contains both:

```text
user_metadata.club_id === current club.id
user_metadata.signup_type === "non_member_signup"
```

For that case it creates an active `household_memberships` row with `membership_type: "non_member"`, using the metadata name fields. This is the non-member account's first club membership.

If the membership belongs to another Auth user, or the metadata does not identify a valid non-member signup for the current club, login signs out and returns the user to signup or displays an error.

### Destination after login

Login marks an account as a first login when it creates or links the membership. First-time users go to:

```text
/:clubSlug/app/profile/drivers/welcome
```

Returning users go to:

```text
/:clubSlug/app/
```

`AuthProvider` listens to Supabase auth state changes and keeps the session available to the route guards and authenticated providers.

## Data and Security Boundaries

The browser should use the Edge Functions for anonymous membership lookup and account creation. It should not query `household_memberships` directly before authentication, because that would expose membership data to anonymous clients and conflict with its RLS boundary.

The `lookup-membership` function intentionally removes `user_id` from its response. The client only needs to know whether a matching membership exists; the login reconciliation step performs the authoritative ownership checks after authentication.

Club identity must remain part of every lookup and login decision. Do not match an email globally and then attach it to whichever club is currently open.

## Common Failure Cases

### User is sent back to signup after login

Check that:

- The login URL contains the correct `clubSlug`.
- The signup metadata contains the current `club_id`.
- The email is normalized consistently.
- A member's `household_memberships.email` matches the email used at login.
- A non-member signup has `signup_type: "non_member_signup"`.

### User can create an account but cannot enter the app

Check email confirmation first. Then inspect whether login found or created an active membership for the current club. `ProtectedAppRoute` will reject a missing, cross-club, inactive, or unconfirmed account.

### Existing member is told no membership was found

Verify the user entered the email stored on the club membership, not necessarily a different personal or login email. Also verify that `lookup-membership` received the correct `club_id`.

### Confirmation email does not arrive

Use the resend action on `CheckEmail.jsx` and inspect the Supabase Auth email settings. The `create-user` function intentionally returns an error when email confirmation is disabled.

## Files to Update Together

When changing this flow, review the complete boundary rather than changing only the form:

- `src/app/pages/public/Signup.jsx` — signup state machine and Edge Function calls
- `src/app/pages/public/Login.jsx` — Auth sign-in and membership reconciliation
- `src/app/pages/public/CheckEmail.jsx` — confirmation and resend behavior
- `src/app/providers/AuthProvider.jsx` — session state and auth events
- `src/app/routes/ProtectedAppRoute.jsx` — authenticated access checks
- `supabase/functions/lookup-membership/index.ts` — anonymous membership lookup
- `supabase/functions/create-user/index.ts` — Auth user and profile creation