# RCRaceDay Agent Guide

## Project Commands

- Install dependencies: `pnpm install`
- Start development: `pnpm dev`
- Lint all files: `pnpm lint`
- Build production output: `pnpm build`
- Preview a production build: `pnpm preview`

The project requires Node 20.x and pnpm 10.x. Use `pnpm-lock.yaml` as the dependency lockfile; avoid creating or updating a second lockfile.

Supabase configuration is required for the app to load data. Define `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a local `.env` file.

## Architecture Rules

- This is a club-scoped multi-tenant React/Vite app. Club URLs use `/:clubSlug/...`.
- Keep the provider dependency order in `src/app/providers/AppProviders.jsx`: Auth, Club, Profile, Membership, Driver, Number, Notification.
- Do not make public routes depend on authenticated-only providers or data.
- Keep route layers separate:
  - `/:clubSlug/public/*` uses `PublicLayout`.
  - `/:clubSlug/app/*` uses `ProtectedAppRoute` and `AppLayout`.
  - `/:clubSlug/app/admin/*` uses `ProtectedAppRoute` and `AdminLayout`.
- Add new pages to the matching route group and folder. Do not create unrelated top-level club routes.
- Providers must wait for their prerequisites and must not render authenticated content before required loading gates complete.

## Code Conventions

- Use the existing path aliases: `@` for `src`, `@app` for `src/app`, `@components` for `src/components`, and the other aliases in `vite.config.js`.
- Prefer existing context hooks (`useAuth`, `useClub`, `useProfile`, `useMembership`, and `useTheme`) over direct cross-layer state access.
- Read club branding through `ThemeProvider` and `useTheme`; the stored club field is `primary_color`, exposed as `palette.primary`.
- Preserve established component and layout patterns. Keep changes focused and avoid unrelated formatting or architecture changes.
- When changing provider or routing behavior, verify both logged-out public flows and authenticated app/admin flows.

## Useful References

- [ARCHITECTURE.md](ARCHITECTURE.md) - provider stack and route architecture
- [CONTRIBUTING.md](CONTRIBUTING.md) - contribution rules and testing checklist
- [DEVELOPMENT.md](DEVELOPMENT.md) - local setup, environment variables, and workflows
- [DEBUGGING.md](DEBUGGING.md) - debugging provider, routing, and stale-file issues
- [src/docs/Developer/App/Providers.md](src/docs/Developer/App/Providers.md) - provider responsibilities
- [src/docs/Developer/App/Routes.md](src/docs/Developer/App/Routes.md) - route-layer details
- [src/docs/Developer/App/Theme System.md](src/docs/Developer/App/Theme%20System.md) - theme usage
