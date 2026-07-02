#!/usr/bin/env bash
# scripts/auth-smoke.sh
#
# Read-only smoke test for auth-adjacent routes.
# Hits every public and protected route, plus the auth callback error paths,
# and asserts the expected status code / redirect target.
#
# Does NOT:
#   - trigger Supabase auth flows (no magic-link emails, no OAuth redirects)
#   - touch the database
#   - print tokens, cookies, env values, or any secret
#   - use the service role key
#
# Usage:
#   ./scripts/auth-smoke.sh                # against http://localhost:3000
#   BASE_URL=https://productbuilders.app ./scripts/auth-smoke.sh

set -u

BASE_URL="${BASE_URL:-http://localhost:3000}"
FAILS=0
PASSES=0

# --- helpers ---------------------------------------------------------------

# Probe a URL, capture status code + Location header. No body.
probe() {
  local url="$1"
  local label="$2"
  local headers
  headers=$(curl -s -o /dev/null -D - -w "%{http_code}" "$url" 2>/dev/null)
  local status
  status=$(printf '%s' "$headers" | tail -n1)
  local location
  location=$(printf '%s' "$headers" | grep -i '^location:' | head -n1 | sed 's/^[Ll]ocation:[[:space:]]*//' | tr -d '\r\n')
  echo "  $label → status=$status location=${location:-<none>}"
  echo "$status|$location"
}

# Assert "actual" matches "expected". Prints PASS / FAIL.
expect() {
  local label="$1"
  local actual="$2"
  local expected="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "    ✓ PASS ($label == $expected)"
    PASSES=$((PASSES + 1))
  else
    echo "    ✗ FAIL ($label expected $expected, got $actual)"
    FAILS=$((FAILS + 1))
  fi
}

expect_prefix() {
  local label="$1"
  local actual="$2"
  local prefix="$3"
  if [[ "$actual" == "$prefix"* ]]; then
    echo "    ✓ PASS ($label starts with $prefix)"
    PASSES=$((PASSES + 1))
  else
    echo "    ✗ FAIL ($label expected to start with $prefix, got $actual)"
    FAILS=$((FAILS + 1))
  fi
}

# --- server reachable? -----------------------------------------------------

echo "== auth smoke test against $BASE_URL =="

ROOT_RESULT=$(probe "$BASE_URL/" "GET /")
ROOT_STATUS=$(echo "$ROOT_RESULT" | tail -n1 | cut -d'|' -f1)
if [[ "$ROOT_STATUS" != "200" ]]; then
  echo "  Dev server not reachable at $BASE_URL — start it with 'npm run dev'."
  exit 2
fi

# --- public routes ---------------------------------------------------------

echo "[public routes]"
PUB_RESULT=$(probe "$BASE_URL/login" "GET /login")
expect "GET /login status" "$(echo "$PUB_RESULT" | tail -n1 | cut -d'|' -f1)" "200"

ONB_RESULT=$(probe "$BASE_URL/onboarding" "GET /onboarding")
expect "GET /onboarding status" "$(echo "$ONB_RESULT" | tail -n1 | cut -d'|' -f1)" "200"

LB_RESULT=$(probe "$BASE_URL/leaderboard" "GET /leaderboard")
expect "GET /leaderboard status" "$(echo "$LB_RESULT" | tail -n1 | cut -d'|' -f1)" "200"

DD_RESULT=$(probe "$BASE_URL/demo-days" "GET /demo-days")
expect "GET /demo-days status" "$(echo "$DD_RESULT" | tail -n1 | cut -d'|' -f1)" "200"

# --- protected routes (anonymous → redirect to /login) --------------------

echo "[protected routes — anonymous]"
SUB_RESULT=$(probe "$BASE_URL/submit" "GET /submit")
SUB_STATUS=$(echo "$SUB_RESULT" | tail -n1 | cut -d'|' -f1)
SUB_LOC=$(echo "$SUB_RESULT" | tail -n1 | cut -d'|' -f2)
expect "GET /submit status" "$SUB_STATUS" "307"
expect_prefix "GET /submit location" "${SUB_LOC##*localhost:3000}" "/login?redirect="

SET_RESULT=$(probe "$BASE_URL/settings" "GET /settings")
SET_STATUS=$(echo "$SET_RESULT" | tail -n1 | cut -d'|' -f1)
SET_LOC=$(echo "$SET_RESULT" | tail -n1 | cut -d'|' -f2)
expect "GET /settings status" "$SET_STATUS" "307"
expect_prefix "GET /settings location" "${SET_LOC##*localhost:3000}" "/login?redirect="

ADM_RESULT=$(probe "$BASE_URL/admin" "GET /admin")
ADM_STATUS=$(echo "$ADM_RESULT" | tail -n1 | cut -d'|' -f1)
ADM_LOC=$(echo "$ADM_RESULT" | tail -n1 | cut -d'|' -f2)
expect "GET /admin status" "$ADM_STATUS" "307"
expect_prefix "GET /admin location" "${ADM_LOC##*localhost:3000}" "/login?redirect="

# --- auth callback error paths --------------------------------------------

echo "[auth callback — error paths]"
CB_NONE=$(probe "$BASE_URL/auth/callback" "GET /auth/callback (no code)")
CB_NONE_STATUS=$(echo "$CB_NONE" | tail -n1 | cut -d'|' -f1)
CB_NONE_LOC=$(echo "$CB_NONE" | tail -n1 | cut -d'|' -f2)
expect "GET /auth/callback status" "$CB_NONE_STATUS" "307"
expect_prefix "GET /auth/callback location" "${CB_NONE_LOC##*localhost:3000}" "/login?error="

CB_EMPTY=$(probe "$BASE_URL/auth/callback?code=&redirect=/" "GET /auth/callback (empty code)")
CB_EMPTY_STATUS=$(echo "$CB_EMPTY" | tail -n1 | cut -d'|' -f1)
CB_EMPTY_LOC=$(echo "$CB_EMPTY" | tail -n1 | cut -d'|' -f2)
expect "GET /auth/callback (empty) status" "$CB_EMPTY_STATUS" "307"
expect_prefix "GET /auth/callback (empty) location" "${CB_EMPTY_LOC##*localhost:3000}" "/login?error="

CB_DENIED=$(probe "$BASE_URL/auth/callback?error=access_denied&error_description=User+denied" "GET /auth/callback (provider denied)")
CB_DENIED_STATUS=$(echo "$CB_DENIED" | tail -n1 | cut -d'|' -f1)
CB_DENIED_LOC=$(echo "$CB_DENIED" | tail -n1 | cut -d'|' -f2)
expect "GET /auth/callback (denied) status" "$CB_DENIED_STATUS" "307"
expect "GET /auth/callback (denied) location suffix" "${CB_DENIED_LOC##*localhost:3000}" "/login?error=access_denied"

# --- summary ---------------------------------------------------------------

echo ""
echo "== summary: $PASSES passed, $FAILS failed =="
if [[ "$FAILS" -gt 0 ]]; then
  exit 1
fi
echo "All checks passed."