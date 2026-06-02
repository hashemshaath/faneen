#!/usr/bin/env bash
# Contracts — Pre-Launch Smoke Test
#
# Lightweight gating script to run BEFORE deploying any change that
# touches the contract system (RPCs, PDF export, analytics, autosave,
# clone, lead → contract, execution sites).
#
# Usage:
#   bash scripts/contracts-prelaunch-smoke.sh
#   npm run test:contracts-prelaunch
#
# The script is intentionally read-only: it does NOT touch the database,
# does NOT run migrations, and does NOT mutate any product code.
# It only runs type checks, vitest suites, and a static privacy grep.
#
# Exit codes:
#   0  — all checks passed
#   non-zero — at least one check failed; see the printed step name

set -u
set -o pipefail

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

FAILED=()

# Pick a JS runner: prefer bunx (faster locally), fall back to npx on
# CI runners that don't ship Bun. Without this fallback every
# `bunx tsc` / `bunx vitest` step below fails with "command not found"
# on GitHub `ubuntu-latest` (which only has Node installed), and the
# whole "Code Quality & Security Audit" job exits 1.
if command -v bunx >/dev/null 2>&1; then
  RUNNER="bunx"
elif command -v npx >/dev/null 2>&1; then
  RUNNER="npx"
else
  echo "${RED}Neither bunx nor npx is available on PATH.${RESET}"
  exit 127
fi

run_step() {
  local name="$1"
  shift
  echo
  echo "${BOLD}▶ ${name}${RESET}"
  echo "  \$ $*"
  if "$@"; then
    echo "${GREEN}✓ ${name}${RESET}"
  else
    local code=$?
    echo "${RED}✗ ${name} (exit ${code})${RESET}"
    FAILED+=("${name}")
  fi
}

echo "${BOLD}Contracts pre-launch smoke test${RESET}"
echo "Repo: $(pwd)"
echo "Node: $(node --version 2>/dev/null || echo 'n/a')"
echo "Bun:  $(bun --version 2>/dev/null || echo 'n/a')"

# ---------------------------------------------------------------------------
# Part A — Type + test gates
# ---------------------------------------------------------------------------
run_step "TypeScript: ${RUNNER} tsc --noEmit" \
  ${RUNNER} tsc --noEmit

run_step "Vitest: full suite" \
  ${RUNNER} vitest run

run_step "Vitest: contract PDF export (privacy + smoke)" \
  ${RUNNER} vitest run src/lib/__tests__/contract-pdf-export.test.ts

run_step "Vitest: contract PDF Arabic text layer" \
  ${RUNNER} vitest run src/lib/__tests__/contract-pdf-arabic-text.test.ts

run_step "Vitest: contract PDF performance benchmark" \
  ${RUNNER} vitest run src/lib/__tests__/contract-pdf-perf.bench.test.ts

run_step "Vitest: contract PDF export history privacy" \
  ${RUNNER} vitest run src/components/contract/__tests__/ContractPdfExportHistory.privacy.test.tsx

# ---------------------------------------------------------------------------
# Part B — Static privacy grep
# ---------------------------------------------------------------------------
# Forbidden tokens that must NOT appear in client-side code that renders
# contract PDFs, provider analytics, or admin analytics. Documentation
# files (docs/**) are excluded because they intentionally enumerate
# these terms as the deny-list itself.
#
# We scope the grep narrowly to:
#   - src/lib/contract-pdf-export.ts (and helpers)
#   - src/pages/admin/AdminContractAnalytics.tsx
#   - src/pages/dashboard/DashboardContractAnalytics.tsx
#   - src/components/contract/ContractPdfExportHistory.tsx
#
# A match in any of these files is a hard fail.

PRIVACY_TARGETS=(
  "src/lib/contract-pdf-export.ts"
  "src/lib/contract-pdf-history.ts"
  "src/pages/admin/AdminContractAnalytics.tsx"
  "src/pages/dashboard/DashboardContractAnalytics.tsx"
  "src/components/contract/ContractPdfExportHistory.tsx"
)

# Tokens forbidden everywhere in the targets above.
FORBIDDEN_TOKENS=(
  "internal_notes"
  "signed_url"
  "file_url"
  "storage_path"
  "exported_by"
  "ip_hash"
  "user_agent_hash"
  "client_email"
  "client_phone"
  "supervisor_phone"
  "supervisor_email"
)

# Tokens forbidden ONLY in analytics pages (provider + admin).
ANALYTICS_TARGETS=(
  "src/pages/admin/AdminContractAnalytics.tsx"
  "src/pages/dashboard/DashboardContractAnalytics.tsx"
)
ANALYTICS_FORBIDDEN=(
  "map_url"
  "address_line1"
)

privacy_grep_step() {
  local label="$1"
  shift
  local files=("$@")
  local existing=()
  for f in "${files[@]}"; do
    [ -f "$f" ] && existing+=("$f")
  done
  if [ ${#existing[@]} -eq 0 ]; then
    echo "${YELLOW}  (no target files exist for ${label}, skipping)${RESET}"
    return 0
  fi
  local fail=0
  for tok in "${FORBIDDEN_TOKENS[@]}"; do
    if grep -nE "\\b${tok}\\b" "${existing[@]}" >/tmp/.smoke-grep 2>/dev/null; then
      echo "${RED}  forbidden token \"${tok}\" found:${RESET}"
      cat /tmp/.smoke-grep
      fail=1
    fi
  done
  return $fail
}

analytics_grep_step() {
  local fail=0
  local existing=()
  for f in "${ANALYTICS_TARGETS[@]}"; do
    [ -f "$f" ] && existing+=("$f")
  done
  if [ ${#existing[@]} -eq 0 ]; then
    echo "${YELLOW}  (no analytics pages found, skipping)${RESET}"
    return 0
  fi
  for tok in "${ANALYTICS_FORBIDDEN[@]}"; do
    if grep -nE "\\b${tok}\\b" "${existing[@]}" >/tmp/.smoke-grep 2>/dev/null; then
      echo "${RED}  analytics-forbidden token \"${tok}\" found:${RESET}"
      cat /tmp/.smoke-grep
      fail=1
    fi
  done
  # document_hash is allowed only as a short prefix; full exposure (e.g.
  # `documentHash` rendered without `.slice(`) is not auto-detectable here.
  # Print a soft reminder.
  if grep -n "document_hash" "${existing[@]}" >/dev/null 2>&1; then
    echo "${YELLOW}  reminder: document_hash referenced in analytics pages — verify only the 16-char prefix is exposed.${RESET}"
  fi
  return $fail
}

run_step "Privacy grep: contract PDF + analytics + history" \
  privacy_grep_step "contracts" "${PRIVACY_TARGETS[@]}"

run_step "Privacy grep: analytics-only forbidden tokens" \
  analytics_grep_step

# ---------------------------------------------------------------------------
# Part C — DB grant reminder (manual)
# ---------------------------------------------------------------------------
echo
echo "${BOLD}▶ Manual DB grant verification reminder${RESET}"
cat <<'EOF'
  The following SECURITY DEFINER RPCs must have:
    - prosecdef = true
    - EXECUTE revoked from PUBLIC and anon
    - EXECUTE granted to authenticated and service_role

  Verify in the Supabase SQL editor (Cloud) before deploy:
    - get_contract_analytics_dashboard
    - get_admin_contract_analytics_dashboard
    - update_contract_draft_autosave
    - clone_contract_as_draft
    - set_contract_execution_site
    - prepare_contract_prefill_from_lead
    - link_lead_to_contract
    - record_contract_pdf_export
    - list_contract_pdf_exports
    - admin_list_contract_pdf_exports
    - create_contract_from_template

  Quick check query:
    select p.proname, p.prosecdef,
           array(select privilege_type from information_schema.routine_privileges
                 where routine_name = p.proname) as grants
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'get_contract_analytics_dashboard',
        'get_admin_contract_analytics_dashboard',
        'update_contract_draft_autosave',
        'clone_contract_as_draft',
        'set_contract_execution_site',
        'prepare_contract_prefill_from_lead',
        'link_lead_to_contract',
        'record_contract_pdf_export',
        'list_contract_pdf_exports',
        'admin_list_contract_pdf_exports',
        'create_contract_from_template'
      );
EOF

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo
echo "${BOLD}=== Summary ===${RESET}"
if [ ${#FAILED[@]} -eq 0 ]; then
  echo "${GREEN}All automated checks passed.${RESET}"
  echo "Remember to also complete the manual checklist in"
  echo "docs/contracts-launch-checklist.md before deploy."
  exit 0
else
  echo "${RED}${#FAILED[@]} check(s) failed:${RESET}"
  for n in "${FAILED[@]}"; do
    echo "  - ${n}"
  done
  exit 1
fi