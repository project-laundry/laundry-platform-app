---
name: ship-idea
description: Take an idea all the way to production in the NooraCare repo - proposal, extensive plan, implementation by a Sonnet subagent, commit and push to develop, verification on test.nooracare.no, promotion to production. Runs only when the user types /ship-idea.
disable-model-invocation: true
---

# Ship an idea: proposal → plan → Sonnet builds → develop → staging test → production

The user describes an idea or a problem (the arguments to `/ship-idea`, or the message
around it). You own it until it is live on `nooracare.no` or you have a concrete reason
it must not go there. The user is usually not watching: decide what you can decide, and
stop only at the stop conditions in section 8.

Several ideas in one request are shipped **one at a time**, each through the whole
routine, in the order given. Never batch two ideas into one commit or one promotion.

Roles: **you** (the most capable model) investigate, decide, plan, review and verify.
A **Sonnet subagent** writes the code. You never write the feature code yourself, and
the subagent never commits, pushes or decides.

## 0. Preconditions

- `git branch --show-current` is `develop`, `git status --porcelain` is empty,
  `git pull --ff-only` succeeds. Otherwise stop and report.
- `git fetch origin` and note whether `origin/develop` is ahead of `origin/main` already.
  Commits that are on develop but not on main will ride along in your promotion —
  list them (`git log origin/main..origin/develop --oneline`) and, unless they are
  merge-only noise, name them in the final report. If any of them looks unfinished or
  untested, stop before promoting (section 6) and ask.

## 1. Proposal

Investigate the real code first, then make the product decision yourself and state it in
two or three sentences: what you will build, and what you considered and rejected. When
the user asked an either/or question ("redirect or indicator?"), answer it with a
recommendation and go on — do not hand the question back. Ask (`AskUserQuestion`) only
when the choice depends on something you cannot find out: a business rule, a text only
the user can write, material they said they would supply.

## 2. Plan

Invoke the `extensive-plan` skill and follow it, with these differences because the user
has already asked for the whole routine:

- Product decisions you made in section 1 go in the plan as decided. No waiting for
  approval of the plan.
- After the plan file is written, continue to section 3 instead of stopping.

The plan file is `PLAN_<TOPIC>.md` in the repo root. `PLAN_*.md` is gitignored; it is
never committed.

Database changes: plan a migration file in `supabase/migrations/` and nothing else.
Pushing to `develop` applies it to staging and merging to `main` applies it to
production (CI, see `ENVIRONMENTS.md`). Never run `supabase db push` or apply SQL
through an MCP tool. A migration must therefore be safe to run on production as written.

## 3. Execution by Sonnet

Start one subagent with the Agent tool, `model: "sonnet"`. The brief names the plan file
and tells it to: read the whole plan, implement the code, documentation and test
sections exactly, obey the "What NOT to do" section, run every command in the
verification checklist, not commit or push, and report files changed, each command's
result, and every deviation from the plan.

A large plan may be split between subagents only where the parts touch different files.

## 4. Review before anything is committed

The subagent's report is a claim, not evidence. Yourself:

- Read the complete `git diff` (and new files). Check it against the plan, against
  CLAUDE.md, and for anything outside the plan's scope.
- Run `npm run lint`, `npx tsc --noEmit`, `npm test` and `npm run build` and read the
  results.
- Small defects: send them back to the same subagent (SendMessage) or fix a one-liner
  yourself. A wrong design: fix the plan, then have the subagent redo that part.

## 5. Commit, push, verify on staging

- Commit on `develop` in the style of `git log` (one imperative sentence, issue number
  in parentheses when there is one, never `Closes #N`). Then `git push origin develop`.
- Wait for the Vercel deployment of that commit to be Ready (Vercel MCP
  `list_deployments` / `get_deployment`) and, when the commit has a migration, for the
  `staging.yaml` workflow to succeed (`gh run list --branch develop --limit 3`).
- Verify on `https://test.nooracare.no` in Chrome, following the plan's manual recipe:
  every user state it lists (signed out, customer, cleaner, admin as relevant), at desktop
  and phone width when the change is visual. The staging logins are in memory
  (`staging-test-logins`). Check staging data through the Supabase MCP when the change
  writes to the database, and Resend when it sends e-mail.
- What cannot be tested on staging (a Production-only cron, a real Vipps charge) is
  tested as far as it goes — call the route by hand, run the unit under test — and named
  as untested in the report.
- A failure on staging: fix it through sections 3–5 again. Never promote around it.

## 6. Promote to production

Only when section 5 passed completely.

```bash
gh pr create --base main --head develop --title "<commit subject>" --body "<what changed, how it was verified on staging>"
```

```bash
gh pr merge <number> --merge
```

A merge commit, never squash or rebase (develop and main must keep the same commits).
Then wait for the Production deployment to be Ready and, with a migration, for
`production.yaml` to succeed. If the migration workflow fails, stop and report at once —
the code is live without its schema.

## 7. Check production

On `https://nooracare.no`: what a signed-out visitor can see of the change, plus the
Vercel runtime errors for the new deployment. Do not sign in on production and do not
create orders, users or data there; the user tests signed-in production behaviour
themselves. The production database is not reachable through the Supabase MCP.

When the change needs a step in a hosted dashboard (Supabase Auth template, Vercel env
var, Vipps, Resend, PostHog), the change is not finished until that step is done. Say
exactly what must be set where, and do it through Chrome only with the user's go-ahead.

## 8. Stop conditions

Stop and report instead of continuing when:

- a precondition in section 0 fails;
- the idea needs input only the user has;
- the change would delete or rewrite production data, or needs a production secret,
  payment setting or hosted-config change you have not been told to make;
- staging verification fails and the cause is not something this change introduced;
- develop carries someone else's unfinished commits at promotion time.

Stopped before production means: say how far it got (planned / on develop / verified on
staging), and what is needed to go on.

## 9. Report

One short message per idea, outcome first: is it live on production or not. Then what
the user will see, what was verified where, what was not verified, any hosted step still
open, and the other commits that went to production with it. No plan recap.
