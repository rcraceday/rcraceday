## Login Flow

`Login.jsx` authenticates with `supabase.auth.signInWithPassword`.

After authentication, it:

1. Confirms the user's email.
2. Finds membership by `user_id`, then by club-scoped email.
3. Links existing memberships to the Auth user.
4. Creates an active `non_member` membership when the user has no row at this club but a confirmed Auth account (including visitors from another club, not only fresh non-member signup metadata).
5. Redirects first-time users to driver setup (preserving `returnTo` when present) and returning users to the app or `returnTo`.

If the login page loads while the browser already has a confirmed session (for example after opening another club's nomination link), it runs the same reconciliation instead of signing the user out first.

Users without a confirmed email, valid membership, or matching club are redirected to login or signup. Cross-club visitors with a valid password no longer need a second signup at the host club.