---
name: plan-board-task
description: Plan one or more GitHub issues from the NooraCare board (project-laundry/laundry-platform-app) and hand them to the Ready column. For each issue it writes a hand-off-ready plan with the extensive-plan skill, attaches the plan to the issue as a comment, and moves the issue from Backlog/Blocked to Ready. One issue is planned inline; several issues are planned in parallel, one subagent per issue, always on the most capable model (Fable 5.1). Use whenever the user says things like "plan issue #N", "create a plan for the pre-launch tasks", "plan all P0 issues", "make plans for #33 and #71 and move them to Ready", "re-plan the Blocked issues", or asks for plans that should end up on the board — even without the words "board", "Ready" or "skill". Do NOT use for implementing (that is implement-ready-task), for ad-hoc plans that are not tied to a GitHub issue (plain extensive-plan), or for other repos.
---

# Plan board tasks → Ready

You are the planner in a two-stage flow: this skill produces the approved plan that
`implement-ready-task` later executes. The output of a run is, per issue: a
`PLAN_<TOPIC>.md` in the repo root (gitignored), the same plan posted as a comment on
the issue, and the issue sitting in **Ready**.

The board is org project **project-laundry / #3 "nooracare"**, Status columns
`Backlog → Ready → In progress → Blocked → In review → Done`. Scripts (run from the
repo root, full path in every Bash call — each call is a fresh shell):

```bash
B=.claude/skills/implement-ready-task/scripts/board.sh
$B status <n>                  # which column issue n is in
$B plan <n> <file>             # issue body + all comments → file (also how you read the issue)
A=.claude/skills/plan-board-task/scripts/attach-plan.sh
$A <n> PLAN_<TOPIC>.md         # post the plan as comment(s), then move n to Ready
$A <n> PLAN_<TOPIC>.md --no-move   # post only (used when the user wants to review before Ready)
```

## 0. Model gate

Plans are written only by the most capable model (today Claude Fable 5.1). The
`extensive-plan` skill enforces this itself and refuses on anything lower; this skill
adds the delegation half: **every subagent you spawn to plan gets `model: "fable"`
explicitly** — a fresh subagent does not inherit your model. If you are not on the top
tier yourself, stop and tell the user to switch with `/model` before anything else.

## 1. Resolve the issue set

- Explicit numbers ("#33 and #71") → those.
- A description ("all pre-launch tasks", "the P0 issues", "the Blocked ones") → list
  the board (`gh project item-list 3 --owner project-laundry --format json --limit 200`,
  with `GH_HOST=github.com`), filter by label/column, and **print the resulting list
  with numbers and titles before planning** so the user can see what you resolved.
- Only issues in **Backlog** or **Blocked** are planned. Ready already has a plan,
  In progress / In review / Done are past planning. Say which ones you skipped and why.
- Blocked issues are re-plans: the implementer left a "Blocked — plan is out of sync"
  comment on the issue. Read it; it names exactly what drifted and what is still valid.
  The new plan supersedes the old comment (the attach script marks that).

## 2. One issue → inline; several → parallel subagents

**One issue:** do steps 3–4 yourself. You can ask the user product questions with
`AskUserQuestion` as extensive-plan describes.

**Two or more issues:** launch one subagent per issue, **all in a single message** so
they run concurrently, each with `subagent_type: "general-purpose"`, `model: "fable"`,
and a brief built from the template below. Do not plan any of them yourself while the
agents run, and do not fabricate their results — wait for each completion notification.
Subagents cannot ask the user questions, so they adopt extensive-plan's recommended
defaults and mark them "(default — confirm with user)"; collecting those for the user
is your job in step 5.

Brief template (fill in `<n>`, keep the rest verbatim):

```
You are planning GitHub issue #<n> of project-laundry/laundry-platform-app for the
NooraCare board. Work in /Users/rinaandriana/Repos/project-laundry/laundry-platform-app
(already on develop, clean tree; do not pull, commit, or edit source files).

1. Read .claude/skills/plan-board-task/SKILL.md sections 3–4 and follow them exactly.
2. Read the issue: `GH_HOST=github.com .claude/skills/implement-ready-task/scripts/board.sh plan <n> /tmp/issue-<n>.md`, then read that file in full.
3. Invoke the `extensive-plan` skill (Skill tool) and write PLAN_<TOPIC>.md in the repo root. You cannot ask the user questions: take every recommended default and mark it "(default — confirm with user)" in section 1 of the plan.
4. Attach and move: `.claude/skills/plan-board-task/scripts/attach-plan.sh <n> PLAN_<TOPIC>.md`.
5. Reply with: the plan file path, the feasibility verdict in two sentences, the product decisions you defaulted (one line each), the technical judgment calls the user may veto, and follow-up ideas outside the issue's scope. Nothing else.
```

## 3. Write the plan (per issue)

1. `board.sh plan <n> <file>` and read the whole file: the issue body is the scope, the
   comments carry audit notes, earlier plans, or a Blocked report.
2. Invoke the **`extensive-plan`** skill and follow it end to end (investigate the real
   code, feasibility verdict, product decisions, plan file). Plan the issue as written;
   the issue's "Scope" / "Acceptance" sections are the request. Where the issue says
   "pick one per line" or leaves a choice open, that is a product decision for
   extensive-plan Phase 2.
3. Plan file requirements on top of extensive-plan's template:
   - Path: repo root, `PLAN_<SHORT_TOPIC>.md` (gitignored). Pick a topic that is not
     already taken by another `PLAN_*.md` in the root.
   - H1: `# Plan: <description> (GitHub issue #<n>)` — the attach script checks for
     `issue #<n>` and for the `# Plan:` prefix, and `implement-ready-task` searches for it.
   - `**Verified against:** commit \`<short sha>\` on \`develop\`` in the header.
4. The plan does **not** implement anything and does not edit the issue — attaching is
   step 4, done by the script.

If the issue turns out to be infeasible, already done, or needs a decision only the
user can make before any plan makes sense: write no plan, post a short comment on the
issue saying why (`gh issue comment`), leave it in its column, and report it.

## 4. Attach and move

```bash
.claude/skills/plan-board-task/scripts/attach-plan.sh <n> PLAN_<TOPIC>.md
```

The script posts the plan verbatim as one comment (or as `**Plan (part i/N)**`
comments when it is over 60 000 characters), notes if it supersedes an earlier plan,
and moves the issue to Ready. Run it as its own Bash call. If it fails, the issue stays
where it was — fix the cause (usually a missing `issue #<n>` in the H1) and re-run; do
not move the issue by hand without the comment.

## 5. Report

One message, for the user who will skim the plans later:

- A table: issue, plan file, column now (Ready, or where it stayed and why).
- Per issue: the defaulted product decisions and judgment calls to confirm or veto
  (these are the "(default — confirm with user)" markers). The user edits the plan
  comment or tells you to re-plan if they disagree.
- Follow-up ideas the planners surfaced, as candidates for new issues (offer to create
  them with `gh issue create`; don't create them unasked).

Don't offer to implement. The user picks tasks off Ready with `implement-ready-task`
when they are ready.
