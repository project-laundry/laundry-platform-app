# Environments

NooraCare runs two cloud environments — **staging** and **production** — for both
Supabase (database) and Vercel (hosting). This document is the single source of
truth for how branches map to environments and how to provision them.

Database migrations are deployed by **GitHub Actions** against **two separate Supabase
projects** (one staging, one production).

## Branch → Environment mapping

| Branch    | Supabase project                | Vercel environment   | Vipps            | Domain                  |
|-----------|---------------------------------|----------------------|------------------|-------------------------|
| `main`    | production (`aalxmczclyunlyziqdqn`) | Production        | `api.vipps.no`   | `nooracare.no`          |
| `develop` | **separate staging project**    | Preview (branch-scoped) | `apitest.vipps.no` | `test.nooracare.no` |

**Promotion flow:** feature branch → PR into `develop` (CI runs) → merge deploys
migrations to the staging project → PR `develop` → `main` deploys to production.

> Vercel staging uses the **Hobby-friendly** approach: `develop` deploys as a **Preview**
> with environment variables scoped to that branch, and a stable domain pinned to it.
> (Vercel "Custom Environments" are a Pro feature and are intentionally not used.)

## CI/CD workflows

| File | Trigger | Action |
|------|---------|--------|
| `.github/workflows/ci.yaml` | PRs | Spins up local Supabase, verifies generated types are committed |
| `.github/workflows/staging.yaml` | push to `develop` | `supabase db push` to the **staging** project |
| `.github/workflows/production.yaml` | push to `main` | `supabase db push` to the **production** project |

Migrations are applied by CI via `supabase db push` against each project. Vercel deploys
are triggered automatically by its Git integration (Production from `main`, a branch-scoped
Preview from `develop`). `supabase/config.toml` is committed so `supabase link`
+ `db push` behave consistently in CI.

## Environment variable matrix

Local dev reads `.env.local` (template: [`.env.example`](./.env.example)).
Staging/production values are set **per environment** in the Vercel dashboard.

| Variable | Local / Staging | Production |
|----------|-----------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | staging project URL | prod project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | staging anon key | prod anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | staging service role | prod service role |
| `NEXT_PUBLIC_APP_URL` | `https://test.nooracare.no` | `https://nooracare.no` |
| `VIPPS_API_URL` | `https://apitest.vipps.no` | `https://api.vipps.no` — **required, no default**; any other value makes every Vipps call throw |
| `VIPPS_CLIENT_ID` / `_SECRET` / `_SUBSCRIPTION_KEY` / `_MERCHANT_SERIAL_NUMBER` | Vipps **test** creds (portal → For developers → *Test*) | Vipps **live** creds (portal → For developers → *Production*) |
| `VIPPS_WEBHOOK_SECRET_RECURRING` | staging webhook secret | prod webhook secret (from registering the prod webhook, see launch checklist) |
| `NEXT_PUBLIC_VIPPS_ALLOW_FORCE_ACCEPT` | `true` (enables the "Auto-godkjenn avtale" test checkbox) | **unset** — never add it to Production |
| `GOOGLE_MAPS_API_KEY` | Maps Platform key (Geocoding API enabled) | same, or a prod-restricted key |
| `ANTHROPIC_API_KEY` | Anthropic API key (cleaner onboarding photo recognition; optional) | separate prod key from the Anthropic Console |

> `CRON_SECRET` is not used anywhere in `src/` (order generation is webhook-driven).
> It is intentionally omitted.

**Pre-launch gate (no env var):** `src/proxy.ts` checks the request host against
`src/lib/prelaunch.ts`. On `nooracare.no` / `www.nooracare.no`, anonymous visitors only reach
the coming-soon pages, legal/contact pages, the price calculator, `/admin`, the auth callback and
the password-reset pages (`/auth/forgot-password`, `/auth/reset-password`); login, signup,
the order flow and the parked `/bli-renser/lansering` page redirect to `/`. `test.nooracare.no`,
localhost and Vercel previews are never gated, so the full app is tested on staging. Delete
the gate at launch. Note that this also blocks `/auth/login` on production, so admins cannot
sign in on `nooracare.no` until the gate is removed.

### Launch checklist

1. Delete `src/lib/prelaunch.ts`, its test, and the gate block in `src/proxy.ts`.
2. Move `src/app/lansering/page.tsx` to `src/app/page.tsx` and `src/app/bli-renser/lansering/page.tsx`
   to `src/app/bli-renser/page.tsx`; drop their `robots: { index: false }`; delete the coming-soon
   pages and `src/components/coming-soon/` (keep `launch.ts` only if something still imports it).
3. Create the promo code behind the waitlist offer (first `WAITLIST_OFFER_SPOTS` customer signups get
   the first wash at half price — `src/components/coming-soon/launch.ts`) and email it to those rows
   of `waitlist_signups` ordered by `created_at`; everyone else gets the plain "we're open" email.
4. Update the share images (`src/app/opengraph-image.tsx`, `src/app/bli-renser/opengraph-image.tsx`)
   from "Snart slipper du …" to launch copy.
5. Delete `waitlist_signups` rows no later than six months after launch, except people who still
   want the newsletter; unsubscribes are deleted right away (`/personvern#venteliste`).
6. **Vipps production credentials in Vercel** — in `portal.vippsmobilepay.com` → *For developers* →
   toggle **Production** → the sales unit → *Show keys*. Add to Vercel **Production only**
   (dashboard: Settings → Environment Variables → Add → tick only *Production*; or CLI):
   ```bash
   npx vercel env add VIPPS_API_URL production                 # exactly https://api.vipps.no
   npx vercel env add VIPPS_CLIENT_ID production
   npx vercel env add VIPPS_CLIENT_SECRET production
   npx vercel env add VIPPS_SUBSCRIPTION_KEY production
   npx vercel env add VIPPS_MERCHANT_SERIAL_NUMBER production
   ```
   Then verify: `npx vercel env ls production` lists all five, **does not** list
   `NEXT_PUBLIC_VIPPS_ALLOW_FORCE_ACCEPT`, and the dashboard value of `VIPPS_API_URL` is
   `https://api.vipps.no` (no trailing slash, no `apitest`).
7. **Register the production webhook** with the live credentials — the portal cannot register
   webhooks, only show them. Put the five values from step 6 in a git-ignored file
   `.env.vipps-production.local` (template in `scripts/README.md`), then:
   ```bash
   VIPPS_ENV_FILE=.env.vipps-production.local npm run webhooks -- list
   ```
   must print `🌍 Target: Vipps PRODUCTION (https://api.vipps.no), MSN <live MSN>` — this call
   also proves the live keys authenticate. Then:
   ```bash
   VIPPS_ENV_FILE=.env.vipps-production.local npm run webhooks -- register \
     --url=https://nooracare.no/api/webhooks/vipps/recurring --events=recurring
   ```
   Copy the printed secret immediately (Vipps shows it once) into Vercel Production:
   ```bash
   npx vercel env add VIPPS_WEBHOOK_SECRET_RECURRING production
   ```
   **Redeploy production** (Deployments → latest Production → ⋯ → Redeploy, or push to `main`) —
   server env vars only reach a new deployment. Run `list` once more: it must show one webhook with
   URL `https://nooracare.no/api/webhooks/vipps/recurring` and all ten `recurring.*` events (the
   portal → *For developers* → *Webhooks* shows the same). Then `rm .env.vipps-production.local`.
8. **Verify the production webhook end-to-end** (no money moves: a FLEXIBLE agreement has no
   initial charge and nothing is charged until a cleaner prices an order). Before launch the gate
   blocks login on `nooracare.no`, so use the production deployment URL (Vercel → Deployments →
   the one marked *Production* → *Visit*, a `*.vercel.app` host; log in with your Vercel account if
   Deployment Protection asks). After launch do the same on `https://nooracare.no`.
   1. Sign in as a customer, run `/orders/wash` → `/orders/pickup` → `/orders/confirm` with
      **Fast** (recurring) frequency. The confirm step must **not** show "Auto-godkjenn avtale".
   2. Approve the agreement in the real Vipps app. (Pre-launch the Vipps return lands on
      `nooracare.no/orders/success`, where the gate may bounce you to `/` because your session
      cookie lives on the `*.vercel.app` host — expected; the checks below are what count.)
   3. Vercel → project → *Logs*, filter path `/api/webhooks/vipps/recurring`: a `POST` with status
      **200** and the log line `[Vipps Recurring Webhook] Agreement activated: <agreementId>`.
      A **401** / `Invalid authentication` means the secret in Vercel does not match the
      registration — redo step 7.
   4. Supabase **production** project (`aalxmczclyunlyziqdqn`) → Table editor:
      `payment_agreements` newest row `status = active`; `subscriptions` newest row
      `status = active`; one new `orders` row for that subscription.
   5. Back in the app: `/dashboard/subscription` → `/dashboard/subscription/cancel` → confirm.
      Logs: a second webhook `POST` 200 with `Agreement stopped`; DB: `payment_agreements.status =
      stopped`, `subscriptions.status = cancelled`, the order `cancelled`.
   6. `portal.vippsmobilepay.com` → *For developers* → *Webhooks* → errors tab is empty.

---

## Setup checklist

### 1. Supabase staging project (one-time, manual)

The Supabase MCP is read-only and pinned to prod, so the project must be created
in the dashboard.

1. Create a new Supabase project named e.g. `nooracare-staging`, **same region** as prod.
2. Record its **project ref** and **database password**.
3. Create an account-level **access token**: Account → Access Tokens.
4. Add **GitHub Actions secrets** (repo → Settings → Secrets and variables → Actions):
   - `SUPABASE_ACCESS_TOKEN` — the access token (shared by both workflows)
   - `STAGING_PROJECT_ID` — staging project ref
   - `STAGING_DB_PASSWORD` — staging DB password
   - `PROD_PROJECT_ID` — `aalxmczclyunlyziqdqn`
   - `PROD_DB_PASSWORD` — production DB password
5. Push to `develop` → `staging.yaml` applies all migrations to staging.
6. In staging project **Authentication → URL Configuration**, set Site URL and
   Redirect URLs to `https://test.nooracare.no` (the auth callback depends on this).

### 2. Vercel staging environment (one-time, manual)

Hobby-plan approach — no Custom Environment needed. `develop` already auto-deploys as a
Vercel **Preview**; we give it staging env vars and a stable domain.

1. **Env vars** — add the staging values from the matrix above scoped to **Preview**.
   Either via the dashboard (Settings → Environment Variables → select **Preview**, then
   "specific branch" → `develop`) or the CLI:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL preview develop
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview develop
   vercel env add SUPABASE_SERVICE_ROLE_KEY preview develop
   vercel env add NEXT_PUBLIC_APP_URL preview develop      # https://test.nooracare.no
   vercel env add VIPPS_API_URL preview develop            # https://apitest.vipps.no
   # ...repeat for the remaining VIPPS_* vars
   ```
   - `NEXT_PUBLIC_*` are inlined at build time, so each `develop` build picks up its
     branch-scoped value automatically.
   - PR/feature-branch previews use the **generic Preview** vars (not branch-scoped). For an
     MVP it's fine to point those at staging too, or leave them unset if you don't need
     feature previews to boot.
2. **Domain** — Settings → Domains → add `test.nooracare.no` and assign it to the
   **`develop` git branch** (so it always serves the latest `develop` Preview deployment).
3. Register the staging webhook with the **test** credentials in `.env.local` (the portal only
   lists webhooks; registration goes through the Webhooks API):
   ```bash
   npm run webhooks -- register --url=https://test.nooracare.no/api/webhooks/vipps/recurring --events=recurring
   ```
   Store the printed secret as `VIPPS_WEBHOOK_SECRET_RECURRING` scoped to Preview → `develop`.
   Also add `NEXT_PUBLIC_VIPPS_ALLOW_FORCE_ACCEPT=true` to Preview → `develop` (it is inlined
   at build time, so redeploy `develop` afterwards). Keep Production env vars/domain unchanged.

### 3. Verify

- [ ] Push to `develop` → `staging.yaml` is green; migrations present in the staging DB.
- [ ] Vercel staging build succeeds; `test.nooracare.no` serves the app against the staging DB.
- [ ] A Vipps **test** checkout completes end-to-end on staging; webhook reaches the staging endpoint.
- [ ] Merge `develop` → `main` → `production.yaml` runs; production is unaffected by staging data.
- [ ] Production: `npx vercel env ls production` shows `VIPPS_API_URL` and the four live credentials, no `NEXT_PUBLIC_VIPPS_ALLOW_FORCE_ACCEPT`; a live checkout on the production deployment activates and the webhook returns 200 (launch checklist 6-8).
