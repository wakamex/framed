#!/usr/bin/env bash
# Compare test coverage between two git refs
#
# Usage:
#   ./scripts/compare-coverage.sh                            # coverage for current state
#   ./scripts/compare-coverage.sh --base main --target dev   # compare two refs
#   ./scripts/compare-coverage.sh --prs 34 35 36             # compare HEAD vs PRs merged on top

set -euo pipefail

# --- Defaults ---
BASE_REF=""
TARGET_REF=""
PRS=()
ORIG_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || git rev-parse HEAD)
ORIG_HEAD=$(git rev-parse HEAD)
STASHED=false
TEMP_BRANCH="_coverage-tmp-$$"
COV_DIR="/tmp/coverage-compare-$$"

# --- Parse args ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)   BASE_REF="$2"; shift 2 ;;
    --target) TARGET_REF="$2"; shift 2 ;;
    --prs)
      shift
      while [[ $# -gt 0 && ! "$1" =~ ^-- ]]; do
        PRS+=("$1"); shift
      done
      ;;
    -h|--help)
      echo "Usage: $0 [--base <ref>] [--target <ref>] [--prs <num>...]"
      echo ""
      echo "  --base <ref>      Base git ref (default: HEAD)"
      echo "  --target <ref>    Target git ref to compare against"
      echo "  --prs <num>...    PR numbers to merge on top of base as target"
      echo ""
      echo "Examples:"
      echo "  $0                                # coverage for current state"
      echo "  $0 --base HEAD~1 --target HEAD    # compare two refs"
      echo "  $0 --prs 34 35 36                 # compare HEAD vs PRs merged"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# --- Cleanup trap ---
cleanup() {
  echo ""
  echo "=== Cleaning up ==="
  git checkout "$ORIG_BRANCH" 2>/dev/null || git checkout "$ORIG_HEAD" 2>/dev/null || true
  git branch -D "$TEMP_BRANCH" 2>/dev/null || true
  if $STASHED; then
    git stash pop 2>/dev/null || true
  fi
  rm -rf "$COV_DIR"
}
trap cleanup EXIT

# --- Stash if dirty ---
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Stashing uncommitted changes..."
  git stash push -m "coverage-compare-$$"
  STASHED=true
fi

# --- Run all three test suites with coverage, output to a directory ---
run_coverage() {
  local ref="$1"
  local outdir="$2"
  local logdir="$outdir/logs"
  mkdir -p "$outdir/main" "$outdir/resources" "$outdir/components" "$logdir"

  echo ""
  echo "=== Running coverage on: $ref ==="

  # Checkout the ref (detached HEAD is fine)
  git checkout --quiet "$ref" 2>/dev/null || git checkout "$ref"

  # Ensure deps are available
  if [ ! -d node_modules ]; then
    echo "  Installing dependencies..."
    npm install --ignore-scripts 2>/dev/null || true
  fi

  echo "  [1/3] main tests (--env=node ./test/main)..."
  npx jest --detectOpenHandles --runInBand --env=node ./test/main \
    --coverage --coverageDirectory="$outdir/main" \
    --coverageReporters=json-summary 2>&1 | tee "$logdir/main.log" | tail -5 || true

  echo "  [2/3] resources tests (--env=node --roots=test/resources)..."
  npx jest --detectOpenHandles --runInBand --env=node \
    --roots=test/resources \
    '--testPathIgnorePatterns=(/Components/ /Hooks/)' \
    --coverage --coverageDirectory="$outdir/resources" \
    --coverageReporters=json-summary 2>&1 | tee "$logdir/resources.log" | tail -5 || true

  echo "  [3/3] component tests (--env=jsdom)..."
  npx jest --detectOpenHandles --runInBand --env=jsdom \
    --roots test/app test/resources/Hooks test/resources/Components \
    --testTimeout=500 \
    --coverage --coverageDirectory="$outdir/components" \
    --coverageReporters=json-summary 2>&1 | tee "$logdir/components.log" | tail -5 || true
}

# --- Determine mode and run ---
if [[ ${#PRS[@]} -gt 0 ]]; then
  # PR merge mode
  BASE_REF="${BASE_REF:-HEAD}"

  # Run coverage on base first
  run_coverage "$BASE_REF" "$COV_DIR/base"

  echo ""
  echo "=== Creating temp merge branch from ${BASE_REF} with PRs: ${PRS[*]} ==="
  git checkout -b "$TEMP_BRANCH" "$BASE_REF"

  for pr in "${PRS[@]}"; do
    branch=$(gh pr view "$pr" --json headRefName -q .headRefName 2>/dev/null || echo "")
    if [[ -z "$branch" ]]; then
      echo "  WARNING: Could not find branch for PR #$pr, skipping"
      continue
    fi
    echo "  Merging PR #$pr ($branch)..."
    git fetch origin "$branch" 2>/dev/null || true
    if ! git merge "origin/$branch" --no-edit 2>/dev/null; then
      echo "  WARNING: Merge conflict on PR #$pr ($branch), skipping"
      git merge --abort || true
    fi
  done

  TARGET_REF="$TEMP_BRANCH"
  run_coverage "$TEMP_BRANCH" "$COV_DIR/target"

elif [[ -n "$BASE_REF" && -n "$TARGET_REF" ]]; then
  # Two-ref comparison mode
  run_coverage "$BASE_REF" "$COV_DIR/base"
  run_coverage "$TARGET_REF" "$COV_DIR/target"

else
  # Single-run mode: just print current coverage
  BASE_REF="${BASE_REF:-HEAD}"
  run_coverage "$BASE_REF" "$COV_DIR/base"
fi

# --- Parse and display results ---
echo ""
echo "=== Coverage Results ==="
echo ""

python3 - "$COV_DIR/base" "$COV_DIR/target" "$BASE_REF" "$TARGET_REF" << 'PYEOF'
import json, sys, os, re
from glob import glob
from pathlib import Path

def load_coverage(base_dir):
    """Load and merge coverage-summary.json from suite subdirs."""
    per_file = {}  # filepath -> {metric: {total, covered}}

    for path in sorted(glob(os.path.join(base_dir, "*/coverage-summary.json"))):
        try:
            data = json.load(open(path))
        except (json.JSONDecodeError, FileNotFoundError):
            continue

        for key, metrics in data.items():
            if key == "total":
                continue
            if key not in per_file:
                per_file[key] = {}
            for m in ("lines", "statements", "functions", "branches"):
                if m not in metrics:
                    continue
                prev = per_file[key].get(m, {"total": 0, "covered": 0})
                # Same file in multiple suites: keep total, take max covered
                per_file[key][m] = {
                    "total": metrics[m]["total"],
                    "covered": max(prev["covered"], metrics[m]["covered"]),
                }

    # Aggregate totals
    totals = {}
    for m in ("lines", "statements", "functions", "branches"):
        t = sum(f.get(m, {}).get("total", 0) for f in per_file.values())
        c = sum(f.get(m, {}).get("covered", 0) for f in per_file.values())
        totals[m] = {"total": t, "covered": c, "pct": round(c / t * 100, 2) if t else 0}

    return totals, len(per_file)

def count_tests(base_dir):
    """Count total tests from jest log output."""
    total = 0
    for log in sorted(glob(os.path.join(base_dir, "logs/*.log"))):
        try:
            text = open(log).read()
        except FileNotFoundError:
            continue
        # Jest prints "Tests:  X passed, Y total" or "Tests:  X failed, Y passed, Z total"
        match = re.search(r"Tests:\s+.*?(\d+) total", text)
        if match:
            total += int(match.group(1))
    return total

def fmt_cov(c, t, pct):
    return f"{c}/{t} ({pct:.1f}%)"

base_dir = sys.argv[1]
target_dir = sys.argv[2] if len(sys.argv) > 2 else ""
base_ref = sys.argv[3] if len(sys.argv) > 3 else ""
target_ref = sys.argv[4] if len(sys.argv) > 4 else ""

has_base = os.path.isdir(base_dir) and glob(os.path.join(base_dir, "*/coverage-summary.json"))
has_target = (
    target_dir
    and os.path.isdir(target_dir)
    and glob(os.path.join(target_dir, "*/coverage-summary.json"))
)

if has_base and has_target:
    base_totals, base_files = load_coverage(base_dir)
    target_totals, target_files = load_coverage(target_dir)
    base_tests = count_tests(base_dir)
    target_tests = count_tests(target_dir)

    col_w = 28
    print(f"  {'METRIC':<14} {'BASE':>{col_w}}  {'TARGET':>{col_w}}  {'DELTA':>10}")
    print(f"  {'-'*14} {'-'*col_w}  {'-'*col_w}  {'-'*10}")

    for m in ("lines", "statements", "functions", "branches"):
        b = base_totals[m]
        t = target_totals[m]
        delta = t["pct"] - b["pct"]
        sign = "+" if delta >= 0 else ""
        print(
            f"  {m:<14} {fmt_cov(b['covered'], b['total'], b['pct']):>{col_w}}"
            f"  {fmt_cov(t['covered'], t['total'], t['pct']):>{col_w}}"
            f"  {sign}{delta:.2f}%"
        )

    print(f"  {'-'*14} {'-'*col_w}  {'-'*col_w}  {'-'*10}")
    print(
        f"  {'files':<14} {base_files:>{col_w}}  {target_files:>{col_w}}"
        f"  {target_files - base_files:+d}"
    )
    print(
        f"  {'tests':<14} {base_tests:>{col_w}}  {target_tests:>{col_w}}"
        f"  {target_tests - base_tests:+d}"
    )
    print()
    print(f"  base:   {base_ref}")
    print(f"  target: {target_ref}")

elif has_base:
    base_totals, base_files = load_coverage(base_dir)
    base_tests = count_tests(base_dir)

    print(f"  Coverage for: {base_ref}")
    print(f"  {'-'*50}")
    for m in ("lines", "statements", "functions", "branches"):
        b = base_totals[m]
        print(f"  {m:<14} {b['covered']:>6}/{b['total']:<6} ({b['pct']:.1f}%)")
    print(f"  {'files':<14} {base_files:>6}")
    print(f"  {'tests':<14} {base_tests:>6}")

else:
    print("ERROR: No coverage data found. Check that tests ran successfully.")
    sys.exit(1)
PYEOF
