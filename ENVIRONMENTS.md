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
| `VIPPS_API_URL` | `https://apitest.vipps.no` | `https://api.vipps.no` |
| `VIPPS_CLIENT_ID` / `_SECRET` / `_SUBSCRIPTION_KEY` / `_MERCHANT_SERIAL_NUMBER` | Vipps **test** creds | Vipps **live** creds |
| `VIPPS_WEBHOOK_SECRET_RECURRING` | staging webhook secret | prod webhook secret |
| `GOOGLE_MAPS_API_KEY` | Maps Platform key (Geocoding API enabled) | same, or a prod-restricted key |

> `CRON_SECRET` is not used anywhere in `src/` (order generation is webhook-driven).
> It is intentionally omitted.

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
3. In the **Vipps test** portal, register the webhook pointing at staging:
   - `https://test.nooracare.no/api/webhooks/vipps/recurring` — all `recurring.*` events

   using the staging webhook secret. Keep Production env vars/domain unchanged.

### 3. Verify

- [ ] Push to `develop` → `staging.yaml` is green; migrations present in the staging DB.
- [ ] Vercel staging build succeeds; `test.nooracare.no` serves the app against the staging DB.
- [ ] A Vipps **test** checkout completes end-to-end on staging; webhook reaches the staging endpoint.
- [ ] Merge `develop` → `main` → `production.yaml` runs; production is unaffected by staging data.
