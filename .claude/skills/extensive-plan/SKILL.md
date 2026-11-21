---
name: extensive-plan
description: Write an extensive, hand-off-ready implementation plan WITHOUT implementing anything. Use this whenever the user asks for a plan, a proposal, an approach, or a design for a code change — including phrasings like "make a plan", "how would we build X", "analyse whether X is feasible", "would it be a lot of work to X", or "write this up so an agent can do it". Trigger even when the user doesn't say the word "plan" but wants implementation steps written down for later or for another (possibly less capable) coding agent to execute. Do NOT trigger when the user asks you to actually implement or fix something now.
---

# Extensive Plan

Produce a plan so detailed that a coding agent with **less capability, less knowledge, and less reasoning ability** can implement it exactly as intended, without making a single judgment call. The plan document is the only deliverable.

## Model gate — check this before anything else

A plan is only as good as the reasoning behind it, and it will be executed by a weaker agent that trusts it blindly. So plans are written **only by the most capable model available**. Find the model named in your system prompt ("You are powered by the model named …") and compare:

- **Allowed:** the top tier of the current generation — today Claude Fable 5.2. A future higher tier counts too.
- **Refused:** Opus, Sonnet, Haiku, or any model below the top tier, regardless of effort setting.

If refused: stop immediately. Do not investigate, do not write a draft, do not "do a lighter version". Reply with one short message: "extensive-plan refuses to run on <model name>: plans must be written by the most capable model. Switch with `/model` (Fable 5.2), or delegate to a subagent with `model: "fable"`." Then end your turn.

When you delegate plan-writing to subagents (a wrapping skill may tell you to), always pass the top-tier model explicitly (`model: "fable"`) — a subagent inherits the parent's model only when forked, and the gate applies inside the subagent too.

## The contract

1. **Never implement.** Do not edit source files, create migrations, or run fixes. The only file you create or modify is the plan document itself. This holds even if the change looks trivial — the user asked for a plan, not the change.
2. **No assumptions.** Every fact in the plan (a field name, an import line, a function signature, a test-file mock shape) must have been verified by reading the actual code in this session. If the plan says "add X to file Y after function Z", you must have opened file Y and seen function Z.
3. **Assume a weak implementer.** The reader will not infer anything. Banned phrasings: "as needed", "appropriately", "handle errors properly", "follow the existing pattern" (instead: show the pattern). If a step has a likely wrong turn, name it and forbid it explicitly. A weak implementer also under-reports: it may fix plan defects silently and skip verification steps it considers optional — so snippets must be correct as written (verify test code against the project's actual test-runner version and mocking style, not just "plausible Vitest"), and the verification checklist must be written so the *user* can re-run it independently after implementation.
4. **Plan only what was asked.** New infrastructure, migrations, or doc edits the request doesn't require are scope creep even when they feel like sensible defaults — leave them out of the plan file entirely. No "Possible follow-ups" / "Future work" / "Out of scope" sections: the implementer doesn't act on future work, and such lists only invite scope creep. Surface follow-up ideas in the Phase 4 delivery message to the user instead, who can turn them into tracked tasks.
5. **The plan reads as if written in one pass.** The implementer never saw earlier drafts or the review conversation, so revision-history meta-commentary is pure noise to them. Banned: "changed per review <date>", "an earlier draft said…", "(hardened after feedback)", reviewer-finding numbers, "— confirm" markers on settled decisions. When a decision or fix changes during review, rewrite the affected sections to simply state the final design and its rationale (keep the WHY, drop the history). "(default — confirm with user)" markers are only for a first draft produced without user input — strip them as soon as the user has reviewed or decided. The revision story belongs in the conversation with the user, never in the plan file.

## Workflow

### Phase 1 — Investigate the real code

First confirm you are looking at the current code: check `git status` / `git log -1` and, if the checkout could be stale (a worktree, an old branch, uncommitted expectations in the repo docs), reconcile against the main branch before trusting anything you read — a plan verified against outdated code hands the implementer wrong line anchors and wrong facts. Record the commit hash you verified against; it goes in the plan header.

Read every file the plan will touch or reference. Establish and verify:
- How the feature area works today (state management, data flow, where data lives).
- Exact current contents of the spots you'll tell the implementer to modify (import lines, type shapes, test mock factories).
- Existing conventions the plan must conform to (error-handling style, client vs. admin DB access, test patterns, project rules in CLAUDE.md).
- Auth/permission context: who can reach this code path and in what states (logged out, first-time, etc.).

### Phase 2 — Feasibility verdict, then consult

Before writing the plan, tell the user in prose:
- Whether it's feasible, roughly how much work, and whether it makes the codebase messier (and why).
- What you found that changes the picture (e.g., "half of this already exists via X").

Then separate two kinds of open questions:
- **Product/UX decisions** (silent behavior vs. explicit UI, scope of fields, precedence rules): ask the user with `AskUserQuestion`, 2–4 questions, each with a recommended default listed first. Wait for answers. If you are running non-interactively and cannot ask, adopt each recommended default and record it in the plan's "Product decisions" section marked "(default — confirm with user)".
- **Technical decisions** (query shape, which client, naming): decide yourself using the codebase's conventions, and record each one in the plan as a documented judgment call the user can veto.

If the user asked "only plan it if feasible" and it is not feasible, say so with evidence and stop — no plan.

### Phase 3 — Write the plan file

Write a markdown file in the repository root named `PLAN_<SHORT_TOPIC>.md` (use an existing `docs/plans/` directory instead if the project has one; use the user's requested location if they gave one). Required structure:

```markdown
# Plan: <one-line description> (GitHub issue #N — only when planning a tracked issue)

**Status:** Approved plan — not yet implemented.
**Verified against:** commit `<short sha>` on `<branch>` (clean tree, <date>).
**Goal:** <one paragraph: exact end-user-visible outcome, and who sees no change>

## 1. Product decisions (already made — do not revisit)
Numbered list of the decisions from Phase 2, stated as instructions
("Implement exactly this; do not add options.").

## 2. Background: how it works today
The files to read before coding, each with WHY it matters.
Verified data-model and code-flow facts the implementer needs,
including any non-obvious mapping chains (state → field → column),
spelled out end to end.

## 3. Implementation
One numbered subsection per file, in dependency order. For each:
- The exact code to add or change, as a ready-to-paste snippet that
  compiles against the real file (correct imports, real symbol names).
- Precise placement ("extend the existing import line from '@/x'",
  "place directly above the <named> effect").
- A "Notes for the implementer" list explaining WHY each non-obvious
  choice was made and naming the traps (e.g. ".single() errors on zero
  rows — use .maybeSingle()", "the test mock factory must gain the new
  key or the whole test file fails to import").

## 4. Documentation
Every project doc the change makes stale (README, schema/logic docs,
CLAUDE.md, architecture notes), each with exact old→new edits — treat
these as mandatory implementation steps, not optional cleanup. If no
doc needs updating, say so explicitly and why. Unrelated doc edits
remain scope creep (contract rule 4).

## 5. Tests
Exact test cases with code, in the project's existing test style,
including required changes to shared test setup. State explicitly
which kinds of tests NOT to add and why (per project rules).

## 6. What NOT to do
Explicit list: files not to touch, features not to add, patterns not
to introduce. This section prevents scope creep by a weaker agent.

## 7. Verification checklist
Every command to run (each in its own bash block), plus a manual test
recipe with numbered steps covering EACH distinct user state/edge case.
```

Quality bar for section 3: a snippet is only done when someone could paste it in blindly. Sanitize inputs the same way the surrounding code does, reuse the file's existing imports instead of duplicating them, and use guard patterns (e.g., functional `setState`) where race conditions exist — and explain each in the notes.

### Phase 4 — Deliver

Do not edit the tracked issue (Jira, GitHub, etc.): no description changes, no comments, no status transitions. The local plan file is the only deliverable. The one exception is a wrapping skill that explicitly owns the hand-off (for example a repo's `plan-board-task` skill, which attaches the finished plan to the issue and moves it on the board): then that skill's attach step runs *after* this skill is done, and it — not this skill — touches the issue.

In the final message: the feasibility verdict recap, a link to the plan file, a short summary of what the plan specifies, the judgment calls you made that the user may want to override, and any out-of-scope follow-up ideas (these live here, never in the plan file — offer to turn them into tracked tasks). Then stop. Do not offer to implement it in the same breath as a default next step; the user will ask when they want it built.
