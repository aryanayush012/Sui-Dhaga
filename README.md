# Sui-Dhaga

Mobile-first PWA for tailor shops: order board, per-garment details, payments, WhatsApp updates and a public customer tracking page. Next.js 15 (App Router) + Supabase.

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill it in (see below)
```

`.env.local` keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000`), and `SUPABASE_DB_URL` (Postgres connection string; used by `db:reset` / `db:types`).

The Supabase CLI is pinned to **v2** in `devDependencies`; use it via `npx supabase`.

### (a) Hosted Supabase dev project (no Docker)

1. Create a separate **dev** project at supabase.com.
2. Fill `.env.local` from Project Settings > API and Database (URL, anon key, service-role key, DB connection string as `SUPABASE_DB_URL`).
3. `npm run db:reset` applies every migration in `supabase/migrations`.
4. Auth > Rate Limits: raise the sign-in limit, or the DB tests and e2e test will be throttled.

> **`npm run db:reset` wipes the target database.** Only ever point `.env.local` at a throwaway dev project, never production.

### (b) Local Supabase (optional, needs Docker)

```bash
npx supabase start     # prints the local URL and keys; put them in .env.local
npx supabase db reset
```

### Run it

```bash
npm run dev            # http://localhost:3000
npx tsx scripts/create-shop.ts "Shop name" "Owner name" 9876543210 secret1
```

## Admin scripts

Run with the service-role key in `.env.local`.

- `npx tsx scripts/create-shop.ts "<shop name>" "<owner name>" <mobile> <password>` creates a shop and its owner login (prints the shop id). Password is at least 6 characters.
- `npx tsx scripts/reset-password.ts <mobile> <newPassword>` resets a user's password (owner or karigar PIN).

## Testing

```bash
npm test               # unit tests (src/)
npm run test:db        # database/RLS tests, files run one at a time (hits the Supabase dev project)
npm run e2e            # Playwright smoke test: builds, starts the app, creates a fresh shop in the dev DB
npm run lint && npx tsc --noEmit
```

Vitest and Playwright use the same `.env.local`, so they run against your dev project. First e2e run needs `npx playwright install chromium`.

## Deploy

1. Create a production Supabase project.
2. Apply migrations: `npx supabase db push --db-url "<production connection string>"`.
3. Create a Vercel project from this repo and set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (the production origin, used in tracking links and WhatsApp messages).
   Never expose `SUPABASE_SERVICE_ROLE_KEY` as a `NEXT_PUBLIC_` variable.
4. Create the first shop against production with `create-shop.ts` (point `.env.local` at production temporarily, or run it in a trusted shell).

## PWA

`/manifest.webmanifest` makes the app installable; `public/sw.js` (registered in production builds only) caches the static shell and serves `/` when offline. Supabase calls and `/t/*` tracking pages are never cached. Service workers need a secure context: on a phone use the HTTPS (Vercel) URL, not a plain-http LAN IP.

## Manual phone checks

- Install to the home screen (Android Chrome: "Install app"; iPhone Safari: Share > Add to Home Screen); icon and name look right.
- Log in, book an order with a camera photo, and send the WhatsApp message.
- Switch the phone to airplane mode and reopen the app: the board shows last-saved data with the "Offline" banner.
- Open a tracking link in a private tab; move the order to Ready and reload: it shows "Ready for collection".
- Check Hindi and English on the board and the order form.
