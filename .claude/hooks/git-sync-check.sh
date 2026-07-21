#!/usr/bin/env bash
# SessionStart: report whether this checkout is behind origin/main.
#
# Strictly read-only. It fetches and counts, and never checks out, merges or
# pulls — a session that yanks you onto another branch or starts an unattended
# merge is worse than a stale checkout. Deciding what to do is the human's job;
# this only makes sure nobody works on stale code without knowing it.
#
# Deliberately silent when there is nothing to report: a hook that speaks every
# session gets ignored by the third day.
#
# No jq — it is not installed on every machine here, and a hook that depends on
# a missing binary fails invisibly.

set -u

# Not a git repo, or no remote: nothing to say.
git rev-parse --git-dir >/dev/null 2>&1 || exit 0
git remote get-url origin >/dev/null 2>&1 || exit 0

# Never block on a credential prompt; the hook timeout is the outer guard.
export GIT_TERMINAL_PROMPT=0
git fetch --quiet origin 2>/dev/null || exit 0

git rev-parse --verify --quiet refs/remotes/origin/main >/dev/null 2>&1 || exit 0

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
behind=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo 0)
ahead=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)
dirty=$(git status --porcelain 2>/dev/null | head -1)

# Branch names cannot contain double quotes, but strip anything that would
# break the hand-built JSON rather than trusting that.
branch=${branch//[\"\\]/}

[ "$behind" -eq 0 ] && [ "$ahead" -eq 0 ] && exit 0

msg="[kinetta] branch: ${branch}"
[ "$behind" -gt 0 ] && msg="${msg} — ${behind} commit(s) behind origin/main"
[ "$ahead" -gt 0 ] && msg="${msg} — ${ahead} commit(s) not pushed"

if [ "$behind" -gt 0 ]; then
  if [ "$branch" = "main" ] && [ -z "$dirty" ]; then
    msg="${msg}"$'\n'"[kinetta] → git pull"
  else
    msg="${msg}"$'\n'"[kinetta] → review before pulling (not on a clean main)"
  fi
fi

# Escape newlines for JSON; the message contains no other special characters.
json_msg=${msg//$'\n'/\\n}

printf '{"systemMessage":"%s","hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' \
  "$json_msg" "$json_msg"
