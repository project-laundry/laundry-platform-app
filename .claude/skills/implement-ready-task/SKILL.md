---
name: implement-ready-task
description: End-to-end "take the next task off the board" workflow for the NooraCare repo (laundry-platform-app). Picks an issue from the Ready column of the GitHub Projects board (or the one the user names), moves it to In progress, implements the approved plan attached to the issue, verifies with tests/lint/types, moves the issue to In review with a note for the reviewer, then commits and pushes to develop. If the plan turns out to be out of sync with the code, it reverts everything, comments on the issue and parks it in Blocked instead. Use this whenever the user says things like "pick a task from the board", "take the next ready task", "implement issue #N from the board", "work through the Ready column", "do the next task and push it", or asks you to implement a GitHub issue that has a plan attached — even if they don't mention the board, Projects, or the word "skill". Do NOT use for writing plans (that is extensive-plan), for ad-hoc fixes the user describes directly in chat, or for repos other than project-laundry/laundry-platform-app.
---

# Implement a Ready task

You are the implementer in a two-stage flow. Someone (usually the user, via the
`plan-board-task` skill, which wraps `extensive-plan`) has already investigated and
written an approved plan for each issue in the **Ready** column. Your job is to turn one plan into a pushed
commit, leave the board in a truthful state, and tell the reviewer what they need
to know. The user is often not watching, so work through to the push without
stopping to ask unless you hit one of the stop conditions below.

The board is org project **project-laundry / #3 "nooracare"**. Its Status columns
are `Backlog → Ready → In progress → Blocked → In review → Done`. `Blocked` is the
parking spot for a task whose plan no longer matches the code (section 8). Issues
stay **open** while in review (the user closes them after reviewing), so never write
`Closes #N` or `Fixes #N` in a commit message.

All board and issue operations go through `board.sh` (in `scripts/` next to this file).
It hard-codes the project and field IDs so you never have to discover them:

```bash
B=.claude/skills/implement-ready-task/scripts/board.sh   # run from the repo root; every call needs the full path
$B ready                   # Ready issues sorted by priority (P0 first), then number
$B status <n>              # which column issue n is in
$B move <n> "In progress"  # also: Ready | Blocked | "In review" | Backlog | Done
$B plan <n> <file>         # issue body + all comments written to <file>; prints size + headings
```

Each Bash call is a fresh shell, so spell out the full path every time (`$B` above is
only shorthand for this document).

## 0. Preconditions

Before touching the board:

- `pwd` is the laundry-platform-app checkout, `git branch --show-current` is `develop`,
  `git status --porcelain` is empty, and `git pull --ff-only` succeeds. A dirty tree or a
  diverged branch means someone else's work is in flight — stop and report instead of
  building on top of it.
- `board.sh ready` works (proves `gh` is authenticated against github.com).

## 1. Pick the task and claim it

- If the user named an issue, use that one. Check it is actually in `Ready`; if it is in
  another column, say so and ask before proceeding — moving a Backlog issue straight to
  In progress skips the planning stage, and an In-progress one may be half-done elsewhere.
- Otherwise take the **first line** of `board.sh ready` (highest priority, then lowest
  number). Say which one you picked and why in one line (in your running output, or in
  the final report when nobody is watching). If the Ready column is empty, say so and stop.
- Move it: `board.sh move <n> "In progress"`. Do this before reading the plan in depth,
  so the board reflects reality while you work.

## 2. Read the plan — all of it

`board.sh plan <n> <scratch-file>` writes the issue body followed by every comment to a
file and prints its headings with line numbers. Plans run 30–60 KB, far past what a
tool result shows in one go, so read the file in sections (by heading line numbers)
rather than printing it to the terminal. The plan is in the comments, in one of two shapes:

1. A comment starting with `# Plan: …` holds the complete plan.
2. Comments titled `**Plan (part 1/2)**`, `**Plan (part 2/2)**` … are one plan split
   because of GitHub's comment size limit, and name a `PLAN_<TOPIC>.md` in the repo root.
   That file is gitignored, so it only exists if it was written on this machine. If it
   exists, read it (it is the canonical single copy); if not, concatenate the parts in order.

If there are several plan comments (a re-plan after Blocked), the **newest** one is the
plan; it says so in its first line. Other comments are audit notes or follow-ups; read
them too, they often add scope or constraints the plan body assumes.

Plans follow a fixed structure: **Product decisions (already made)**, **Background**,
**Implementation** (ordered steps with ready-to-paste snippets), **Tests**,
**Verification checklist**, plus "implementer traps" / "what NOT to do". Treat the
product decisions as settled — they were agreed with the user and re-opening them wastes
the whole planning stage. Technical details are yours to adapt when the code has moved.

**Line numbers are stale by design.** Every plan says "Verified against commit X".
`develop` has moved since. Before editing a spot the plan references, `grep -n` for the
symbol and read the current code; follow the plan's intent, not its line numbers. If a
step is already done (another issue landed it), skip it and mention that in the review
note.

**Plans give exact "replace this with that" snippets.** Apply those with an exact-match
replace that asserts the old text occurs exactly once (the Edit tool does this; so does a
short script). A miss is not a formatting nuisance, it is the drift detector: stop and
look at why the code differs before adapting the snippet.

**Do a sync check before writing any code.** Walk the plan's Background and
Implementation sections and confirm, by reading the current code, that every file,
function, type and DB column the plan builds on still exists in the shape it describes,
and that the plan's product decisions are still possible. Moved line numbers and renamed
locals are normal drift; a missing function, a changed data model, a step that would
contradict code landed since the plan, or a decision that depends on something that no
longer exists is **out of sync**. Finding that now costs ten minutes; finding it halfway
through an implementation costs a half-finished change that has to be unpicked. Out of
sync means section 8, not improvisation.

## 3. Implement

Work through the implementation steps in the plan's order; each step is meant to compile
on its own. Honor the repo's `CLAUDE.md` throughout — in particular:

- **Never apply migrations.** Create the file under `supabase/migrations/` as the plan
  says; CI runs `supabase db push` the moment you push to `develop`. That also means a
  broken migration file breaks staging on push, so read it twice.
- **Clean up dead code** the plan tells you to delete, and anything your change orphans.
- **Add the tests the plan specifies** (Vitest 4, `vi.mock` factories; copy the style of
  the neighbouring `*.test.ts`). When a plan's test snippet doesn't match the current
  mock shape, fix the test to match the code, not the other way round.
- Follow `BRANDBOOK.md` recipes for any UI, and the customer/cleaner wording rules in
  `CLAUDE.md`.

When, despite the sync check, the plan and reality turn out to disagree in a way that
changes the design (a function it builds on was removed, a product decision is now
impossible, a step contradicts code that landed since the plan was written), stop
implementing and go to section 8. Don't improvise a different design — the plan is the
contract, and a plan that no longer fits needs the planning stage again, not a guess.

## 4. Verify before you touch the board again

Run, in this order, and fix what fails:

```bash
npx tsc --noEmit
npm run lint        # eslint --max-warnings 0, so warnings fail
npm test            # vitest run
```

Then walk the plan's **Verification checklist**; it adds to the three commands above
(for example `npm run build`, or greps proving a stale comment is gone) and whatever it
lists is required. Items you can check from the terminal (a grep, a test, a type check)
you check. Items that need a browser or a Vipps test
account you leave for the reviewer and list them explicitly in the review note. Never
claim a manual check you did not do.

## 5. Commit and push to develop

One commit per task, directly on `develop` (that is how this repo works — no feature
branch, no PR; the review happens on the board). Commit and push **before** posting the
review note, so the note carries the final sha: a push rejected because develop moved
means a rebase, and a rebase rewrites the sha.

- Stage only what belongs to the task (`git add -A` is fine if `git status` shows only
  your files; otherwise add paths explicitly). `PLAN_*.md` is gitignored, so it won't
  be staged by accident.
- Subject line: imperative, what the change does for the product, with the issue in
  parentheses at the end. Match the existing history:

  ```
  Add password reset flow (issue #72)
  Sync payment status for cancelled/refunded charges and orphan pending rows (issue #93)
  ```

  Then a short body with the non-obvious decisions, and the `Co-Authored-By` trailer
  from your session instructions. No `Closes`/`Fixes` keyword.
- `git push origin develop`. If the push is rejected because develop moved, `git pull
  --rebase`, re-run the three checks from step 4, and push again.
- **Run commit, push, comment and move as separate Bash calls.** Pushing to `develop`
  deploys migrations to staging, so the permission layer treats a chained
  `commit && comment && move && push` as one deploy action and may refuse the whole
  chain — and then nothing ran, not even the commit. One side effect per call keeps
  each step reviewable and lets the rest proceed if one is denied.

## 6. Hand over: review note, then move to In review

Post **one** comment on the issue with `gh issue comment <n> --repo project-laundry/laundry-platform-app --body-file <file>`.
Write it for someone who will read the diff cold. Keep it short and only include sections
that have content:

```markdown
## Implemented — ready for review

**Commit:** `<short sha>` on `develop`

**Deviations from the plan**
- <what you did differently and why — moved line, renamed helper, skipped a step that was already done>

**Needs a manual check**
- <checklist items you could not run: browser flows, Vipps test env, email links>

**Migration**
- `supabase/migrations/<file>.sql` — lands on staging automatically with this push.

**Follow-ups spotted (not done)**
- <things outside the plan's scope worth an issue; don't fix them here>
```

If there is genuinely nothing to say beyond "implemented as planned, all checks green",
say exactly that in one line — a reviewer trusts a short honest note more than padding.

Then `board.sh move <n> "In review"`.

Order matters: comment first, then move. If the comment fails, the issue stays in
In progress and the user sees something is off; a silent move with no note would look
finished when it isn't.

## 7. Report

Tell the user, in a few lines: which issue, the commit sha, what the reviewer must check
by hand, and anything you deviated on. The board and the issue comment already carry the
detail; the chat message is the summary.

## 8. Plan out of sync: revert, comment, Blocked

This is the one path where you undo work. It applies whenever the plan cannot be
followed as written because the code has moved on — whether you notice during the sync
check or halfway through step 3. The point is to hand the user a clean repo and a precise
description of the mismatch so they can re-plan; a half-implemented change on `develop`
or in the working tree would be worse than nothing.

1. **Stop editing.** Don't try to "finish the parts that still fit".
2. **Revert everything.** The tree was clean at step 0, so everything that differs is
   yours (this happens before step 5, so nothing is committed or pushed yet):

   ```bash
   git status --porcelain          # look at what you're about to discard
   git reset --hard HEAD
   git clean -fd                   # untracked files you created (new migration, new component)
   git status --porcelain          # must be empty
   ```

   (If you somehow already committed, `git reset --hard origin/develop` — but never push a
   revert on top of something you pushed; stop and tell the user instead.)
3. **Comment on the issue** so the next planning pass starts from facts, not from your
   memory. Use `gh issue comment <n> --repo project-laundry/laundry-platform-app --body-file <file>`:

   ```markdown
   ## Blocked — plan is out of sync with the code

   **Checked against:** `<current short sha>` on `develop` (plan was verified against `<sha from the plan>`).

   **What the plan assumes vs. what the code does now**
   - Plan §3.2 extends `fooHelper` in `src/lib/x.ts`; that function was removed in `<sha>` ("<commit subject>") and its callers now use `barHelper`, which has a different signature.
   - <one bullet per mismatch, each naming the plan section, the file, and the commit or change that caused the drift>

   **Why this can't be resolved by the implementer**
   - <the design or product decision that is now open — e.g. "the plan's decision 3 relies on a column that no longer exists; keeping it means a new migration the plan didn't scope">

   **Still valid**
   - <plan sections that can be reused as-is, so the re-plan is cheaper>

   Nothing was committed; the working tree was reverted.
   ```

   Be concrete: file paths, symbol names, the commit that introduced the drift
   (`git log -S'<symbol>' --oneline` finds it). Vague "the code has changed" comments
   force the planner to redo your investigation.
4. **Move the issue:** `board.sh move <n> Blocked`.
5. **Report to the user** in a few lines: the issue, the core mismatch, and that the tree
   is clean. Don't pick another task unless the user asked you to keep going.

## Other stop conditions (ask or report instead of guessing)

- Precondition failure (dirty tree, not on develop, pull fails, `gh` not authenticated).
- The named issue isn't in Ready.
- No plan comment on the issue, or the plan references a `PLAN_*.md` that's missing
  **and** the comments aren't a complete plan. Move it back to `Ready` with a comment —
  this is a missing plan, not a stale one, so `Blocked` would mislead.
- A check in step 4 fails in code you didn't touch and the fix isn't obvious.
- Secrets or env values would be needed that aren't present (Vipps, Supabase, Anthropic).

In each case leave the board truthful: an issue you claimed but did not finish goes back
to `Ready` (or stays in `In progress` with a comment saying exactly what you're waiting
on), never to `In review`.
