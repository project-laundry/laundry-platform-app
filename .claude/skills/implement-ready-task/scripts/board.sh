#!/usr/bin/env bash
# Helper for the NooraCare GitHub Projects board (org project-laundry, project #3 "nooracare").
# Run from the repo root: .claude/skills/implement-ready-task/scripts/board.sh <command>
#
#   board.sh ready                 list issues in the Ready column (number, priority, title)
#   board.sh status <issue>        print the column an issue is in
#   board.sh move <issue> <column> move an issue; column = Backlog | Ready | "In progress" | Blocked | "In review" | Done
#   board.sh plan <issue> [file]   issue body + every comment, oldest first. With [file]: write there and
#                                  print only the headings (plans are 30-60 KB; read the file in sections)
#
# IDs are hard-coded on purpose: they never change for this board, and looking them
# up costs several gh calls per run. If a command fails with "field not found",
# re-run `gh project field-list 3 --owner project-laundry --format json` and update them.
set -euo pipefail

export GH_HOST=github.com   # gh's default account is a work GHE host; this board lives on github.com
OWNER="project-laundry"
PROJECT_NUMBER=3
PROJECT_ID="PVT_kwDODfMoQM4Bhxuq"
STATUS_FIELD_ID="PVTSSF_lADODfMoQM4BhxuqzhgsOvA"
REPO="project-laundry/laundry-platform-app"

option_id() {
  case "$1" in
    Backlog)       echo 5a0f648f ;;
    Ready)         echo 00fbf0d9 ;;
    "In progress") echo 63fd2d91 ;;
    Blocked)       echo 47dd32b7 ;;
    "In review")   echo f5ddbb1e ;;
    Done)          echo ee977a06 ;;
    *) echo "unknown column: $1 (use Backlog | Ready | 'In progress' | Blocked | 'In review' | Done)" >&2; exit 1 ;;
  esac
}

items_json() {
  gh project item-list "$PROJECT_NUMBER" --owner "$OWNER" --limit 500 --format json
}

cmd="${1:-}"; shift || true
case "$cmd" in
  ready)
    items_json | python3 -c '
import json, sys
items = json.load(sys.stdin)["items"]
def prio(labels):
    for p in ("P0", "P1", "P2"):
        if any(l.startswith(p) for l in labels): return p
    return "P?"
ready = [i for i in items if i.get("status") == "Ready" and i["content"].get("type") == "Issue"]
ready.sort(key=lambda i: (prio(i.get("labels", [])), i["content"]["number"]))
if not ready:
    print("Ready column is empty."); sys.exit(0)
for i in ready:
    print("#%d\t%s\t%s" % (i["content"]["number"], prio(i.get("labels", [])), i["title"]))
'
    ;;
  status)
    n="${1:?issue number}"
    items_json | python3 -c '
import json, sys
n = int(sys.argv[1])
for i in json.load(sys.stdin)["items"]:
    if i["content"].get("number") == n:
        print(i.get("status", "(no status)")); sys.exit(0)
print("issue not on the board", file=sys.stderr); sys.exit(1)
' "$n"
    ;;
  move)
    n="${1:?issue number}"; col="${2:?column}"
    opt="$(option_id "$col")"
    item_id="$(items_json | python3 -c '
import json, sys
n = int(sys.argv[1])
for i in json.load(sys.stdin)["items"]:
    if i["content"].get("number") == n:
        print(i["id"]); sys.exit(0)
print("issue not on the board", file=sys.stderr); sys.exit(1)
' "$n")"
    gh project item-edit --id "$item_id" --project-id "$PROJECT_ID" \
      --field-id "$STATUS_FIELD_ID" --single-select-option-id "$opt" >/dev/null
    echo "#$n -> $col"
    ;;
  plan)
    n="${1:?issue number}"; out="${2:-}"
    render() {
      gh issue view "$n" --repo "$REPO" --json number,title,body,labels,comments \
        --jq '"# #\(.number) \(.title)\nLabels: \([.labels[].name] | join(", "))\n\n## Issue body\n\(.body)\n" + ([.comments[] | "\n---\n## Comment by \(.author.login) at \(.createdAt)\n\(.body)"] | join("\n"))'
    }
    if [ -z "$out" ]; then
      render
    else
      render > "$out"
      echo "wrote $(wc -c < "$out" | tr -d ' ') bytes, $(wc -l < "$out" | tr -d ' ') lines to $out"
      echo "--- headings (line: text) ---"
      grep -n '^#\{1,3\} ' "$out"
    fi
    ;;
  *)
    sed -n '2,8p' "$0"; exit 1 ;;
esac
