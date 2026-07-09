# Ashlar Studio — Admin Dashboard

A separate React + Vite admin panel for the [Ashlar Studio](https://ashlar-studio.vercel.app)
website. Talks to the same Supabase project (`utllswqajudzehlfwryv`) as the
main site — no new database.

## Stack

React 18 · Vite · Tailwind CSS v4 · React Router · Supabase JS (auth + realtime)
· Vercel Serverless Functions (`/api`) for anything that needs the `service_role` key.

## Security model

- **Client** only ever holds the Supabase **anon key**. It relies on RLS
  policies to see admin-only rows (see `supabase/migrations/0001_admin_access.sql`).
- **`/api/*` serverless functions** hold the **service_role key** as a server-only
  env var (`SUPABASE_SERVICE_ROLE_KEY`, no `VITE_` prefix, so Vite never bundles
  it into client JS). They're used for the two things the browser fundamentally
  cannot do with an anon key: listing `auth.users` and computing signup stats.
- Every `/api` call re-verifies the caller's Supabase access token server-side,
  checks `app_metadata.role === 'admin'`, and checks the JWT's `aal` claim is
  `aal2` (i.e. TOTP was actually completed, not just a password).
- Reads/writes on `messages` and `newsletter_subscribers` (including realtime
  subscriptions) go straight from the browser to Supabase, gated by the RLS
  policies in the migration — this is what lets live updates work, and is the
  standard, secure way to do it (service-role proxying those too would add
  latency for no security benefit, since RLS already enforces admin-only access).
- Single admin account, no public signup screen exists in this app at all.
- TOTP 2FA via Supabase Auth's built-in MFA (works with Google Authenticator,
  Authy, 1Password, etc.) — no custom crypto written here.

## One-time setup

1. **Copy env file**
   ```bash
   cp .env.example .env
   ```
   Fill in `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (same values as the
   main site). Get the `service_role` key from
   Supabase Dashboard → Project Settings → API, and set
   `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_URL` — **local only, never commit this**.

2. **Run the DB migration** — open the Supabase SQL editor for project
   `utllswqajudzehlfwryv` and run `supabase/migrations/0001_admin_access.sql`.
   This adds admin RLS policies and turns on realtime for `messages` and
   `newsletter_subscribers`. It does not touch any existing policies.

3. **Create/promote the admin account**
   ```bash
   SUPABASE_URL=https://utllswqajudzehlfwryv.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
   ADMIN_EMAIL=you@example.com \
   ADMIN_PASSWORD=a-strong-password \
   node scripts/promote-admin.mjs
   ```
   (Omit `ADMIN_PASSWORD` if the account already exists — the script will just
   promote it.)

4. **Install & run locally**
   ```bash
   npm install
   npm run dev
   ```
   Sign in at `/login` with the admin email/password, then visit `/mfa-setup`
   once to scan the QR code with your authenticator app. From then on every
   login requires the 6-digit code too.

## Deploying

Deploy this repo as its **own, separate Vercel project** (do not add it to
the main Ashlar Studio project):

```bash
npm i -g vercel
vercel link      # create/select a new Vercel project for this repo
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel --prod
```

`SUPABASE_SERVICE_ROLE_KEY` should be added **only** as a server-side env var
in Vercel (not exposed with a `VITE_` prefix) — that's what keeps it out of
the browser bundle. Consider also protecting the deployment with
Vercel's password/SSO deployment protection as a second layer in front of
the app itself.

## Pages

- `/` — live stat cards (users, signups today/week, messages, newsletter, confirmed/unconfirmed)
- `/users` — searchable, sortable table of all users; click a row to see their submitted messages
- `/messages` — realtime table of contact form submissions; inline status dropdown, detail modal with a "reply by email" action, filter by status
- `/newsletter` — realtime subscriber list with one-click CSV export
