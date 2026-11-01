#!/usr/bin/env bash
# Checks the Flyway migration rules from CONTRIBUTING.md against a base branch.
# Usage: .github/scripts/check-migrations.sh origin/dev
set -euo pipefail

base="${1:?Usage: check-migrations.sh <base-ref>}"
dir="server/src/main/resources/db/migration"
pattern='^V[0-9]{8}_[0-9]{4}__[a-z0-9_]+\.sql$'
failed=0

changed=$(git diff --name-only --diff-filter=DMR "$base"...HEAD -- "$dir")
for file in $changed; do
  echo "::error file=$file::This migration is already in the base branch. Never edit, rename or delete it: add a new migration instead."
  failed=1
done

latest=$(git ls-tree --name-only "$base" -- "$dir/" | xargs -r -n1 basename | sort | tail -n1)
added=$(git diff --name-only --diff-filter=A "$base"...HEAD -- "$dir")
for file in $added; do
  name=$(basename "$file")
  if [[ ! "$name" =~ $pattern ]]; then
    echo "::error file=$file::Name it V<yyyyMMdd>_<HHmm>__<description>.sql in lowercase, for example V20261101_1430__create_visits_table.sql."
    failed=1
  elif [[ -n "$latest" && ! "$name" > "$latest" ]]; then
    echo "::error file=$file::It is older than $latest, the newest migration in the base branch. Rename it with the current date and time in UTC."
    failed=1
  fi
done

if [[ $failed -eq 0 ]]; then
  echo "Migration rules OK."
fi
exit $failed
