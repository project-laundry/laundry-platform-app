# Migration Squash Cutover Runbook

How to reconcile the **staging** and **production** Supabase projects after squashing
the migration history into a single baseline (`20260606233033_initial_schema.sql`).

> **Same procedure on both environments — staging is the rehearsal.**
> You run the *identical* steps on staging first, then production. This deliberately
> trials the risky parts (a destructive `db reset --linked`, the auth-user desync, and
> the backfill script) on disposable staging data before pointing them at prod.
>
> `db reset --linked` drops everything in `public` and rebuilds from the baseline,
> so it works the same regardless of whether a remote had the full or only a partial
> migration history. That's why one procedure fits both.

---

## Prerequisites

- [ ] Squash is done locally and verified (one file in `supabase/migrations/`). **Do not commit/push yet** — reconcile the remotes first.
- [ ] Supabase CLI installed and logged in (`supabase login`).
- [ ] Credentials handy: staging project ref + DB password, prod ref (`aalxmczclyunlyziqdqn`) + DB password.
- [ ] Dashboard access to **both** projects (for auth-user steps and URL config).
- [ ] Decided what happens to existing auth users (keep via backfill, or discard) — see step 4.

---

## The procedure (run once per environment)

> Run the whole block for **STAGING first**. Only once staging is verified green and
> the app smoke-tests fine, repeat the **exact same block** for **PRODUCTION**.

### 1. Link and confirm the target

```bash
supabase link --project-ref <REF>      # staging ref first; later: aalxmczclyunlyziqdqn
supabase projects list                  # ✅ CONFIRM the ● is on the project you intend
```

> ⚠️ This confirmation is the single most important guardrail. The only thing
> separating staging from prod is which ref you just linked.

### 2. Snapshot first (cheap insurance)

- Dashboard → **Database → Backups** → create/note a backup, even though data is disposable.

### 3. Inspect, then reset to the baseline

```bash
supabase migration list                 # see the divergence (orphaned remote versions)
supabase db reset --linked              # ⚠️ DESTRUCTIVE — drops public schema, applies baseline
supabase migration list                 # ✅ only 20260606233033, Local == Remote
```

`db reset --linked` leaves the Supabase-managed `auth` schema intact, so authenticated
users survive in `auth.users` — but `public.users` is now empty (see step 4).

### 4. Reconcile the auth users

The reset empties `public.users` while `auth.users` keeps existing users, so they'd be
able to log in with **no profile/role** (silent desync — there is no FK). Pick one and
do the **same choice on both environments** so the rehearsal stays faithful:

- **Keep them (login + identity only):** run `supabase/scripts/backfill_users_from_auth.sql`
  in the **SQL editor**:
  1. Run **section 1** (dry run) — review who'll be created / skipped.
  2. Run **section 2** (the `BEGIN … COMMIT` block).
  3. Run **section 3** — verify counts; the final query lists any leftovers.
  > Restores identity only — not orders/subscriptions/cleaner profiles.
  > **Running this on staging is the whole point of the rehearsal** — it proves the
  > script works before you trust it on prod.

- **Discard them (clean slate):** Dashboard → **Authentication → Users** → delete the
  existing users. New signups repopulate via the `handle_new_user` trigger.

### 5. Re-confirm auth config (the setting that silently breaks logins)

- Dashboard → **Authentication → URL Configuration** → Site URL + Redirect URLs:
  - Staging → `https://test.nooracare.no`
  - Production → `https://nooracare.no`

### 6. Verify this environment

- [ ] `supabase migration list` shows the single baseline, `Local == Remote`.
- [ ] (If backfill used) the verify query's leftover list is empty / expected.

**→ For staging:** also do a quick app smoke test on `https://test.nooracare.no`
(signup creates a `public.users` row; login works) before moving on. If anything here
surprised you, you just saved yourself from discovering it in production.

**→ Then repeat steps 1–6 for production** (`--project-ref aalxmczclyunlyziqdqn`).

---

## Commit & push the squash

Only after **both** environments show `Local == Remote` (single baseline).

```bash
git add -A supabase/migrations/ supabase/scripts/
git commit -m "Squash migration history into a single baseline"

git push                       # develop → staging.yaml runs `db push`
# then: open PR develop → main; merging runs production.yaml `db push`
```

Because each remote already has the baseline applied, both `db push` runs are **clean
no-ops**. Watch the GitHub Actions runs go green.

---

## Post-cutover verification

- [ ] `staging.yaml` and `production.yaml` GitHub Actions runs are green.
- [ ] `supabase migration list` on **both** projects shows the single baseline, `Local == Remote`.
- [ ] Smoke test both domains: new signup creates `public.users`; login + role dashboard load.
- [ ] (If backfill used) a kept user can log in and is recognized.

---

## Appendix: non-destructive alternative for staging (not recommended here)

If you ever need to reconcile a remote **without** wiping it — e.g. a staging DB whose
data you want to preserve — and that remote has the **full** old chain applied, you can
fix the history table instead of resetting. This keeps `auth.users` and `public.users`
intact and in sync, but it rehearses none of the prod reset procedure, so we don't use
it for this launch:

```bash
supabase migration repair --status reverted \
  20250119000000 20250119000001 20250119000002 20251119000001 20251119130802 \
  20251125000000 20251125221100 20251127000000 20251210215023 20251211213737 \
  20251211221508 20251212102944 20251212111305 20251212134907 20251213210854 \
  20251218000000 20251218170000 20251219133224 20251220120000 20251221000000 \
  20251221133217 20251221135400 20251221140000 20251221190000 20260109120000 \
  20260109205434 20260113100000 20260113120000 20260114100000 20260201120000 \
  20260518120000 20260518120100 20260518121000 20260520120000
```

> This only works on a remote whose schema already matches the baseline (full chain
> applied). It does **not** work on a partial remote like prod — `repair` would leave the
> schema behind. That asymmetry is exactly why we reset both instead.
