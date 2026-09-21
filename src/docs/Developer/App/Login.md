## Login Flow

`Login.jsx` authenticates with `supabase.auth.signInWithPassword`.

After authentication, it:

1. Confirms the user's email.
2. Finds membership by `user_id`, then by club-scoped email.
3. Links existing memberships to the Auth user.
4. Creates an active `non_member` membership when valid signup metadata is present.
5. Redirects first-time users to driver setup and returning users to the app.

Users without a confirmed email, valid membership, or matching club are redirected to login or signup.