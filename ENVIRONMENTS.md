# Environments

NooraCare runs two cloud environments — **staging** and **production** — for both
Supabase (database) and Vercel (hosting). This document is the single source of
truth for how branches map to environments and how to provision them.

Database migrations are deployed by **GitHub Actions** against **two separate Supabase
projects** (one staging, one production).

## Branch → Environment mapping

| Branch    | Supabase project                | Vercel environment   | Vipps            | Domain                  |
|-----------|---------------------------------|----------------------|------------------|-------------------------|
| `main`    | production (`mdglaondbvwsmsdtygmj`) | Production        | `api.vipps.no`   | `nooracare.no`          |
| `develop` | **separate staging project**    | `staging` (custom)   | `apitest.vipps.no` | `staging.nooracare.no` |

**Promotion flow:** feature branch → PR into `develop` (CI runs) → merge deploys
migrations to the staging project → PR `develop` → `main` deploys to production.

## CI/CD workflows

| File | Trigger | Action |
|------|---------|--------|
| `.github/workflows/ci.yaml` | PRs | Spins up local Supabase, verifies generated types are committed |
| `.github/workflows/staging.yaml` | push to `develop` | `supabase db push` to the **staging** project |
| `.github/workflows/production.yaml` | push to `main` | `supabase db push` to the **production** project |

Migrations are applied by CI via `supabase db push` against each project. Vercel deploys
are triggered automatically by its Git integration (Production from `main`, the `staging`
custom environment from `develop`). `supabase/config.toml` is committed so `supabase link`
+ `db push` behave consistently in CI.

## Environment variable matrix

Local dev reads `.env.local` (template: [`.env.example`](./.env.example)).
Staging/production values are set **per environment** in the Vercel dashboard.

| Variable | Local / Staging | Production |
|----------|-----------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | staging project URL | prod project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | staging anon key | prod anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | staging service role | prod service role |
| `NEXT_PUBLIC_APP_URL` | `https://staging.nooracare.no` | `https://nooracare.no` |
| `VIPPS_API_URL` | `https://apitest.vipps.no` | `https://api.vipps.no` |
| `VIPPS_CLIENT_ID` / `_SECRET` / `_SUBSCRIPTION_KEY` / `_MERCHANT_SERIAL_NUMBER` | Vipps **test** creds | Vipps **live** creds |
| `VIPPS_WEBHOOK_SECRET_RECURRING` / `_EPAYMENT` | staging webhook secrets | prod webhook secrets |

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
   - `PROD_PROJECT_ID` — `mdglaondbvwsmsdtygmj`
   - `PROD_DB_PASSWORD` — production DB password
5. Push to `develop` → `staging.yaml` applies all migrations to staging.
6. In staging project **Authentication → URL Configuration**, set Site URL and
   Redirect URLs to `https://staging.nooracare.no` (the auth callback depends on this).

### 2. Vercel staging environment (one-time, manual)

Done in the Vercel dashboard (the MCP can't manage environments or env vars).

1. Project → Settings → **Environments** → create a custom environment named
   **`staging`** and attach branch `develop`.
2. Add env vars **scoped to `staging`** per the matrix above (keep Production vars unchanged).
3. Project → **Domains** → assign `staging.nooracare.no` to the `staging` environment.
4. In the **Vipps test** portal, register webhooks pointing at staging:
   - `https://staging.nooracare.no/api/webhooks/vipps/recurring` — all `recurring.*` events
   - `https://staging.nooracare.no/api/webhooks/vipps/epayment` — all `epayments.payment.*` events

   using the staging webhook secrets.

### 3. Verify

- [ ] Push to `develop` → `staging.yaml` is green; migrations present in the staging DB.
- [ ] Vercel staging build succeeds; `staging.nooracare.no` serves the app against the staging DB.
- [ ] A Vipps **test** checkout completes end-to-end on staging; webhook reaches the staging endpoint.
- [ ] Merge `develop` → `main` → `production.yaml` runs; production is unaffected by staging data.
