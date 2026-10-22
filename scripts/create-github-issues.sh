#!/usr/bin/env bash
# Creates GitHub labels, milestones and issues from docs/roadmap/issues/*.md
#
# Requires: gh (authenticated: `gh auth login`), perl
# Usage:    scripts/create-github-issues.sh [--dry-run] [--repo owner/name]
#
# Issue files reference each other as #<local number> (the filename prefix).
# Issues are created first, then every body is rewritten so those references
# point at the real GitHub issue numbers.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ISSUES_DIR="$ROOT/docs/roadmap/issues"
DRY_RUN=0
REPO_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --repo) REPO_ARGS=(--repo "$2"); shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

command -v gh >/dev/null || { echo "gh CLI not found: https://cli.github.com" >&2; exit 1; }
REPO="$(gh repo view "${REPO_ARGS[@]}" --json nameWithOwner -q .nameWithOwner)"
echo "Target repo: $REPO"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# --- frontmatter helpers -----------------------------------------------------
fm() { # fm <file> <key> -> raw value
  awk -v k="$2" '
    /^---$/ { n++; next }
    n == 1 && $0 ~ "^" k ":" { sub("^" k ":[ ]*", ""); print; exit }
  ' "$1"
}
unquote() { sed -e 's/^"//' -e 's/"$//'; }
list() { tr -d '[]' | tr ',' '\n' | sed -e 's/^ *//' -e 's/ *$//' | grep -v '^$' || true; }
body() { awk '/^---$/ { n++; next } n >= 2' "$1"; }

label_color() {
  case "$1" in
    P0) echo B60205 ;; P1) echo D93F0B ;; P2) echo FBCA04 ;;
    security) echo E63757 ;; bug) echo D73A4A ;; feature) echo 0061FF ;;
    ai) echo 8833FF ;; tech-debt) echo 6E84A3 ;; testing|dx|infra) echo 0E8A16 ;;
    *) echo C5DEF5 ;;
  esac
}

run() { if [[ $DRY_RUN == 1 ]]; then echo "  [dry-run] $*"; else "$@"; fi; }

FILES=("$ISSUES_DIR"/[0-9][0-9]-*.md)

# --- labels ------------------------------------------------------------------
echo "Labels..."
for f in "${FILES[@]}"; do fm "$f" labels | list; done | sort -u > "$TMP/labels"
for f in "${FILES[@]}"; do echo "size:$(fm "$f" size)"; done | sort -u >> "$TMP/labels"
while read -r l; do
  run gh label create "$l" --color "$(label_color "$l")" --force "${REPO_ARGS[@]}" >/dev/null
done < "$TMP/labels"

# --- milestones --------------------------------------------------------------
echo "Milestones..."
existing="$(gh api "repos/$REPO/milestones?state=all&per_page=100" -q '.[].title' || true)"
for f in "${FILES[@]}"; do fm "$f" milestone | unquote; done | sort -u | while read -r m; do
  if ! grep -Fxq "$m" <<<"$existing"; then
    run gh api "repos/$REPO/milestones" -f title="$m" >/dev/null
  fi
done

# --- issues (pass 1: create) -------------------------------------------------
echo "Issues..."
: > "$TMP/map"
for f in "${FILES[@]}"; do
  num="$(basename "$f" | cut -d- -f1 | sed 's/^0*//')"
  title="$(fm "$f" title | unquote)"
  milestone="$(fm "$f" milestone | unquote)"
  size="$(fm "$f" size)"
  deps="$(fm "$f" depends_on | list | sed 's/^/#/' | paste -sd, - | sed 's/,/, /g')"

  {
    body "$f"
    echo
    echo "---"
    echo "**Size:** $size · **Depends on:** ${deps:-none} · _Roadmap item \`$num\` ([plan](https://github.com/$REPO/blob/main/docs/roadmap/README.md))_"
  } > "$TMP/body-$num.md"

  label_args=()
  while read -r l; do label_args+=(--label "$l"); done < <(fm "$f" labels | list; echo "size:$size")

  if [[ $DRY_RUN == 1 ]]; then
    echo "  [dry-run] #$num $title  (${milestone})"
    echo "$num $num" >> "$TMP/map"
  else
    url="$(gh issue create "${REPO_ARGS[@]}" --title "$title" --body-file "$TMP/body-$num.md" \
      --milestone "$milestone" "${label_args[@]}")"
    gh_num="${url##*/}"
    echo "  #$num -> $url"
    echo "$num $gh_num" >> "$TMP/map"
  fi
done

# --- issues (pass 2: rewrite #refs to real numbers) --------------------------
[[ $DRY_RUN == 1 ]] && { echo "Dry run complete."; exit 0; }
echo "Linking cross-references..."
while read -r num gh_num; do
  perl -i -pe '
    BEGIN { open M, "<", "'"$TMP/map"'"; while (<M>) { ($a, $b) = split; $m{$a} = $b } }
    s/(?<![\w\/])#(\d+)\b/exists $m{$1} ? "#$m{$1}" : "#$1"/ge;
  ' "$TMP/body-$num.md"
  gh issue edit "$gh_num" "${REPO_ARGS[@]}" --body-file "$TMP/body-$num.md" >/dev/null
done < "$TMP/map"

echo "Done. Created $(wc -l < "$TMP/map") issues."
