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
| `CRON_SECRET` | any random string (lets you curl the digest route on staging) | a different random string — Vercel sends it on every cron call to `/api/cron/admin-digest` |
| `RESEND_API_KEY` | Resend API key (the digest only runs on Production, but the route must work when curl-tested) | Resend API key for the verified `nooracare.no` sending domain |
| `ADMIN_DIGEST_FROM` | optional; default `NooraCare <varsel@nooracare.no>` | same |

> `CRON_SECRET` protects the one cron route, `GET /api/cron/admin-digest` (daily admin
> digest, declared in `vercel.json`, Production only). Order generation is still webhook-driven.

**Pre-launch gate (no env var):** `src/proxy.ts` checks the request host against
`src/lib/prelaunch.ts`. On `nooracare.no` / `www.nooracare.no`, anonymous visitors only reach
the coming-soon pages, legal/contact pages, the price calculator, `/admin`, the auth callback and
the password-reset pages (`/auth/forgot-password`, `/auth/reset-password`); login, signup,
the order flow and the parked `/bli-renser/lansering` page redirect to `/`. `test.nooracare.no`,
localhost and Vercel previews are never gated, so the full app is tested on staging. Delete
the gate at launch. Note that this also blocks `/auth/login` on production, so admins cannot
sign in on `nooracare.no` until the gate is removed.

### Launch checklist

Before any of the steps below: open `src/lib/config/company.ts` and confirm every value
(legal name and org number against Brønnøysundregistrene; phone, postal address, e-mail,
Instagram URL; set `facebookUrl` if a Facebook page exists). It is the only place these
details live — the footer, `/kontakt` and the legal pages all read from it.

1. Delete `src/lib/prelaunch.ts`, its test, and the gate block in `src/proxy.ts`.
2. Move `src/app/lansering/page.tsx` to `src/app/page.tsx` and `src/app/bli-renser/lansering/page.tsx`
   to `src/app/bli-renser/page.tsx`; drop their `robots: { index: false }`; delete the coming-soon
   pages and `src/components/coming-soon/` (keep `launch.ts` only if something still imports it).
3. Create the promo code behind the waitlist offer (first `WAITLIST_OFFER_SPOTS` customer signups get
   the first wash at half price — `src/components/coming-soon/launch.ts`) and put it in the launch
   e-mail to the rows the database already marked:
   ```sql
   select email, city, created_at from public.waitlist_signups where offer_eligible order by created_at;
   ```
   Everyone else on the list gets the plain "we're open" e-mail. Each signup gets exactly one e-mail —
   that is all the consent covers (`/personvern#venteliste`).
4. Update the share images (`src/app/opengraph-image.tsx`, `src/app/bli-renser/opengraph-image.tsx`)
   from "Snart slipper du …" to launch copy.
5. Delete all `waitlist_signups` rows no later than six months after launch; a withdrawn consent
   (e-mail to post@nooracare.no) is deleted right away (`/personvern#venteliste`).
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

9. **Production Auth e-mails and URLs** — run the **production column** of
   [Supabase Auth e-mails](#supabase-auth-e-mails) on project `aalxmczclyunlyziqdqn`: custom SMTP
   (Resend), the three Norwegian templates, Site URL `https://nooracare.no` + the redirect
   allowlist, the 100/hour e-mail rate limit, and **leaked password protection**. Verify before
   launch with the password-reset round trip (reachable through the pre-launch gate) and the
   signup round trip on the `*.vercel.app` production deployment URL, as described there. Until
   this is done, confirmation mails come from `supabase.io`, in English, at a few per hour, and
   the order flow's return after e-mail confirmation (`?next=/orders/confirm`) is not allowlisted.

10. **Admin digest e-mail.** The `nooracare.no` sending domain is already verified in Resend (see
   [Supabase Auth e-mails](#supabase-auth-e-mails)). Create an API key and add to Vercel
   Production: `CRON_SECRET` (any long random string), `RESEND_API_KEY`. Redeploy production so
   the cron picks up the env vars. Then trigger it once by hand:
   ```bash
   curl -i -H "Authorization: Bearer <CRON_SECRET>" https://nooracare.no/api/cron/admin-digest
   ```
   must answer `200 {"sent":<number of admins>}` and every admin receives «NooraCare <dag>:
   … å følge opp». Vercel → project → *Settings* → *Cron Jobs* lists `/api/cron/admin-digest`
   at `0 6 * * *`.

---

## Supabase Auth e-mails

Supabase Auth sends the signup confirmation, password reset and magic link mails. Both hosted
projects send through **Resend** (custom SMTP) from `NooraCare <no-reply@nooracare.no>`; the
domain `nooracare.no` is verified in Resend (region eu-west-1 — DKIM at
`resend._domainkey.nooracare.no`, return-path `send.nooracare.no`, DMARC `p=quarantine`).

The **Norwegian templates are versioned in `supabase/templates/`** and wired into
`supabase/config.toml` (`[auth.email.template.*]`, subject + `content_path`) so `supabase start`
renders them locally into Mailpit (`http://127.0.0.1:54324`). The hosted dashboards cannot read
the repo: **whenever a template file or its subject changes, paste it again into both projects**
(step 3 below). Nothing in CI pushes Auth config — `supabase config push` is intentionally not
used because `config.toml`'s `[auth]` block holds local-only values (confirmations, 2 mails/hour,
`127.0.0.1` site URL) that must never reach a hosted project.

All links in the templates are `{{ .ConfirmationURL }}`: Supabase verifies the token itself and
then redirects to the `emailRedirectTo` the app passed (`/auth/callback`, with `?next=` for the
order flow and the password reset) carrying `?code=`, which `src/app/auth/callback/route.ts`
exchanges for a session. That redirect only happens when the target URL is allowlisted (step 4);
otherwise Supabase silently falls back to the Site URL and the flow breaks.

Do each step on **both** projects unless a column says otherwise. Project refs: production
`aalxmczclyunlyziqdqn`, staging = the GitHub secret `STAGING_PROJECT_ID`.

| | Staging | Production |
|---|---|---|
| Dashboard | `https://supabase.com/dashboard/project/<staging ref>` | `https://supabase.com/dashboard/project/aalxmczclyunlyziqdqn` |
| Resend API key name | `supabase-auth-staging` | `supabase-auth-production` |
| Site URL | `https://test.nooracare.no` | `https://nooracare.no` |
| Redirect URLs | `https://test.nooracare.no/auth/callback**`<br>`https://laundry-platform-app-*-randrianas-projects.vercel.app/auth/callback**`<br>`http://localhost:3000/auth/callback**`<br>`http://127.0.0.1:3000/auth/callback**` | `https://nooracare.no/auth/callback**`<br>`https://www.nooracare.no/auth/callback**`<br>`https://laundry-platform-app-*-randrianas-projects.vercel.app/auth/callback**` |
| E-mail rate limit | 100 / hour | 100 / hour |
| Leaked password protection | on if the toggle is available (Pro plan) | **on** |

1. **Resend: confirm the domain and create one API key per project.**
   1. `https://resend.com/domains` → `nooracare.no` must show **Verified** (region eu-west-1). If it
      shows *Pending*/*Failed*, open it → *Records* and compare with the DNS at Webhuset
      (nameservers `ns.datacenter.no`): DKIM TXT `resend._domainkey`, MX `send` →
      `feedback-smtp.eu-west-1.amazonses.com` priority 10, TXT `send` → `v=spf1 include:amazonses.com ~all`.
      Never edit the root `nooracare.no` MX/SPF records — those are Google Workspace.
   2. `https://resend.com/api-keys` → **Create API Key** → Name per the table, Permission
      **Sending access**, Domain **nooracare.no** → **Add** → copy the key now (shown once). It is
      the SMTP password in step 2; it is never stored in the repo or in Vercel.
2. **Custom SMTP** — dashboard → **Authentication → Emails → SMTP Settings**
   (`…/auth/smtp`) → toggle **Enable Custom SMTP** on and fill:
   - Sender email `no-reply@nooracare.no` · Sender name `NooraCare`
   - Host `smtp.resend.com` · Port `465` · Username `resend` · Password = the API key from step 1
   - leave *Minimum interval between emails* at its default → **Save**.
3. **Templates** — **Authentication → Emails → Templates** (`…/auth/templates`). For each tab,
   set *Subject heading* to the `subject` from `supabase/config.toml` and replace the whole
   *Message body* (Source view) with the file's content, then **Save**:
   - *Confirm sign up* ← `supabase/templates/confirmation.html`
   - *Reset Password* ← `supabase/templates/recovery.html`
   - *Magic Link* ← `supabase/templates/magic_link.html`
   Leave *Invite user*, *Change Email Address* and *Reauthentication* at their defaults.
4. **URL configuration** — **Authentication → URL Configuration** (`…/auth/url-configuration`):
   set **Site URL** from the table, then under **Redirect URLs** → *Add URL* once per line from
   the table (keep the `**`; a `?` in a pattern is itself a wildcard, which is why the query string
   is not spelled out). Remove any older bare entry such as `https://test.nooracare.no`.
5. **Rate limit and password settings**
   - **Authentication → Rate Limits** (`…/auth/rate-limits`) → *Rate limit for sending emails* →
     `100` → Save. (Enabling custom SMTP resets this to 30/hour.)
   - **Authentication → Sign In / Providers → Email** (`…/auth/providers?provider=Email`):
     *Prevent use of leaked passwords* → **on** (Pro plan; greyed out on Free — skip there);
     *Email OTP Expiration* must be `3600` (the templates say "gyldig i én time") → Save.
6. **Verify.**
   - **Both projects — password reset:** on the matching site (`https://test.nooracare.no` /
     `https://nooracare.no`, both reachable pre-launch) open `/auth/forgot-password`, enter an
     existing account's address. The mail arrives within a minute from `NooraCare
     <no-reply@nooracare.no>` with subject "Tilbakestill passordet ditt hos NooraCare"; the
     button opens `/auth/reset-password` on that same host. `https://resend.com/emails` lists it
     as *Delivered*. If it instead lands on `/auth/forgot-password?expired=1` or on `/`, the
     redirect URL was not allowlisted (step 4) or the Site URL is wrong.
   - **Staging — signup with return path:** logged out on `https://test.nooracare.no`, run
     `/orders/wash` → `/orders/pickup` → `/orders/confirm`, choose "Opprett konto", sign up with a
     fresh address. Subject "Bekreft e-postadressen din hos NooraCare"; the button must land on
     `/orders/confirm` (not `/dashboard`) in the same browser.
   - **Production — signup pre-launch:** signup is gated on `nooracare.no`, so use the
     production deployment's `*.vercel.app` URL (Vercel → Deployments → *Production* → Visit) and
     run the same signup; the link must return to that `*.vercel.app` host's `/dashboard`. After
     launch repeat once on `https://nooracare.no`.
   - If a mail never arrives: Supabase → **Logs → Auth** shows SMTP errors (wrong key = `535`),
     and Resend → *Emails* shows bounces.

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
6. Configure Auth e-mails and URLs for the staging project — SMTP, the Norwegian templates,
   Site URL + Redirect URLs, rate limit — by running the **staging column** of
   [Supabase Auth e-mails](#supabase-auth-e-mails) below.

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
- [ ] Both Supabase projects: a password-reset mail arrives from `no-reply@nooracare.no` in Norwegian and its link opens `/auth/reset-password` on the right host; a staging signup started from `/orders/confirm` returns there after confirmation (Supabase Auth e-mails → step 6).
