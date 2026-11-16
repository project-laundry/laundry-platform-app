#!/usr/bin/env bash
# Attach a finished PLAN_<TOPIC>.md to a GitHub issue and move the issue to Ready.
# Run from the repo root: .claude/skills/plan-board-task/scripts/attach-plan.sh <issue> <plan-file> [--no-move]
#
# - The plan file must start with "# Plan:" (the extensive-plan skill's H1).
# - <= 60000 chars: posted as ONE comment, verbatim, so implement-ready-task finds "# Plan: …".
# - larger: split at "## " heading boundaries into parts <= 60000 chars (GitHub's limit is 65536),
#   each titled "**Plan (part i/N)**" and naming the canonical PLAN_*.md file in the repo root.
# - If the issue already has a plan comment, the new one is prefixed with a "supersedes" note
#   (re-planning a Blocked issue is normal; the newest plan comment wins).
# - Then: board.sh move <issue> Ready (skipped with --no-move).
set -euo pipefail

export GH_HOST=github.com
REPO="project-laundry/laundry-platform-app"
BOARD=".claude/skills/implement-ready-task/scripts/board.sh"
LIMIT=60000

n="${1:?issue number}"; plan="${2:?plan file}"; move="${3:-}"
[ -f "$plan" ] || { echo "plan file not found: $plan" >&2; exit 1; }
[ -x "$BOARD" ] || { echo "board.sh not found at $BOARD (run from the repo root)" >&2; exit 1; }
head -c 7 "$plan" | grep -q '^# Plan:' || { echo "$plan must start with '# Plan:' (extensive-plan H1)" >&2; exit 1; }
grep -q "issue #$n\b" "$plan" || { echo "$plan does not mention 'issue #$n' — wrong file or wrong issue?" >&2; exit 1; }

"$BOARD" status "$n" >/dev/null   # fails if the issue is not on the board

existing="$(gh issue view "$n" --repo "$REPO" --json comments \
  --jq '[.comments[] | select(.body | test("^# Plan:|^\\*\\*Plan \\(part 1/"))] | length')"
preface=""
if [ "$existing" != "0" ]; then
  preface="> Supersedes the $existing earlier plan comment(s) on this issue — implement this one."$'\n\n'
fi

tmpdir="$(mktemp -d)"
python3 - "$plan" "$tmpdir" "$LIMIT" "$preface" <<'PY'
import sys, re, pathlib
plan, outdir, limit, preface = sys.argv[1], pathlib.Path(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
text = pathlib.Path(plan).read_text()
name = pathlib.Path(plan).name
if len(preface) + len(text) <= limit:
    (outdir / "part-01.md").write_text(preface + text)
    sys.exit(0)
# split at "## " headings; a single oversized section is split again at "### " / blank lines
chunks = re.split(r'(?m)^(?=## )', text)
pieces = []
for c in chunks:
    while len(c) > limit - 400:
        cut = c.rfind('\n\n', 0, limit - 400)
        if cut <= 0: cut = limit - 400
        pieces.append(c[:cut]); c = c[cut:].lstrip('\n')
    pieces.append(c)
parts, cur = [], ""
for p in pieces:
    if cur and len(cur) + len(p) > limit - 400:
        parts.append(cur); cur = p
    else:
        cur += p
if cur: parts.append(cur)
N = len(parts)
for i, body in enumerate(parts, 1):
    head = (f"**Plan (part {i}/{N})** — one plan split for GitHub's comment size limit. "
            f"Canonical single copy: `{name}` in the repo root (gitignored, exists only on the planner's machine); "
            f"otherwise concatenate the parts in order.\n\n")
    (outdir / f"part-{i:02d}.md").write_text((preface if i == 1 else "") + head + body)
PY

count=0
for f in "$tmpdir"/part-*.md; do
  gh issue comment "$n" --repo "$REPO" --body-file "$f" >/dev/null
  count=$((count + 1))
done
echo "#$n: posted $count comment(s) from $plan ($(wc -c < "$plan" | tr -d ' ') bytes)"
rm -rf "$tmpdir"

if [ "$move" != "--no-move" ]; then
  "$BOARD" move "$n" Ready
fi
