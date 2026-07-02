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
#   ./scripts/auth-smoke.sh                                  # http://localhost:3000
#   BASE_URL=http://localhost:3000 ./scripts/auth-smoke.sh
#   BASE_URL=https://productbuilders.app ./scripts/auth-smoke.sh
#   BASE_URL=https://fix-auth.<project>.pages.dev ./scripts/auth-smoke.sh

set -u

BASE_URL="${BASE_URL:-http://localhost:3000}"
FAILS=0
PASSES=0

# --- helpers ---------------------------------------------------------------

# Probe a URL, capture status code + Location header. No body.
# Output format: "status|location"  (location is empty if no redirect header)
probe() {
  local url="$1"
  local label="$2"
  local headers
  headers=$(curl -s -o /dev/null -D - -w "%{http_code}" "$url" 2>/dev/null)
  local status
  status=$(printf '%s' "$headers" | tail -n1)
  local location
  location=$(printf '%s' "$headers" \
    | grep -i '^location:' \
    | head -n1 \
    | sed 's/^[Ll]ocation:[[:space:]]*//' \
    | tr -d '\r\n')
  echo "  $label → status=$status location=${location:-<none>}"
  echo "$status|$location"
}

# Normalize a Location header to a path+query string.
# Handles:
#   /foo?bar=1                       → /foo?bar=1
#   http://host:3000/foo?bar=1       → /foo?bar=1
#   https://host/foo                 → /foo
#   https://host                     → /
#   https://host/                    → /
# Empty input → empty output.
normalize_location() {
  local loc="$1"
  if [[ -z "$loc" ]]; then
    echo ""
    return
  fi
  if [[ "$loc" =~ ^[a-zA-Z][a-zA-Z0-9+.-]*:// ]]; then
    # Absolute URL — strip scheme + authority, prepend "/" if not already.
    local rest
    rest=$(printf '%s' "$loc" | sed -E 's|^[a-zA-Z][a-zA-Z0-9+.-]*://[^/]*||')
    if [[ -z "$rest" ]]; then
      echo "/"
    elif [[ "$rest" == /* ]]; then
      echo "$rest"
    else
      echo "/$rest"
    fi
  else
    echo "$loc"
  fi
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

# Assert "actual" starts with "prefix".
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

# Probe a URL, normalize the Location header, and split into status + path.
# Output: status|path|rawlocation   (path is "" if no redirect; rawlocation is
# the verbatim Location header for debugging).
probe_path() {
  local url="$1"
  local label="$2"
  local result
  result=$(probe "$url" "$label")
  local status
  status=$(echo "$result" | tail -n1 | cut -d'|' -f1)
  local raw_loc
  raw_loc=$(echo "$result" | tail -n1 | cut -d'|' -f2)
  local path
  path=$(normalize_location "$raw_loc")
  echo "$status|$path|$raw_loc"
}

# --- server reachable? -----------------------------------------------------

echo "== auth smoke test against $BASE_URL =="

ROOT_RESULT=$(probe "$BASE_URL/" "GET /")
ROOT_STATUS=$(echo "$ROOT_RESULT" | tail -n1 | cut -d'|' -f1)
if [[ "$ROOT_STATUS" != "200" ]]; then
  echo "  Server not reachable at $BASE_URL — start it (npm run dev) or check the URL."
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
SUB=$(probe_path "$BASE_URL/submit" "GET /submit")
SUB_STATUS=$(echo "$SUB" | cut -d'|' -f1)
SUB_PATH=$(echo "$SUB" | cut -d'|' -f2)
expect "GET /submit status" "$SUB_STATUS" "307"
expect_prefix "GET /submit location" "$SUB_PATH" "/login?redirect="

SET=$(probe_path "$BASE_URL/settings" "GET /settings")
SET_STATUS=$(echo "$SET" | cut -d'|' -f1)
SET_PATH=$(echo "$SET" | cut -d'|' -f2)
expect "GET /settings status" "$SET_STATUS" "307"
expect_prefix "GET /settings location" "$SET_PATH" "/login?redirect="

ADM=$(probe_path "$BASE_URL/admin" "GET /admin")
ADM_STATUS=$(echo "$ADM" | cut -d'|' -f1)
ADM_PATH=$(echo "$ADM" | cut -d'|' -f2)
expect "GET /admin status" "$ADM_STATUS" "307"
expect_prefix "GET /admin location" "$ADM_PATH" "/login?redirect="

# --- auth callback error paths --------------------------------------------

echo "[auth callback — error paths]"
CB_NONE=$(probe_path "$BASE_URL/auth/callback" "GET /auth/callback (no code)")
CB_NONE_STATUS=$(echo "$CB_NONE" | cut -d'|' -f1)
CB_NONE_PATH=$(echo "$CB_NONE" | cut -d'|' -f2)
expect "GET /auth/callback status" "$CB_NONE_STATUS" "307"
expect_prefix "GET /auth/callback location" "$CB_NONE_PATH" "/login?error="

CB_EMPTY=$(probe_path "$BASE_URL/auth/callback?code=&redirect=/" "GET /auth/callback (empty code)")
CB_EMPTY_STATUS=$(echo "$CB_EMPTY" | cut -d'|' -f1)
CB_EMPTY_PATH=$(echo "$CB_EMPTY" | cut -d'|' -f2)
expect "GET /auth/callback (empty) status" "$CB_EMPTY_STATUS" "307"
expect_prefix "GET /auth/callback (empty) location" "$CB_EMPTY_PATH" "/login?error="

CB_DENIED=$(probe_path "$BASE_URL/auth/callback?error=access_denied&error_description=User+denied" "GET /auth/callback (provider denied)")
CB_DENIED_STATUS=$(echo "$CB_DENIED" | cut -d'|' -f1)
CB_DENIED_PATH=$(echo "$CB_DENIED" | cut -d'|' -f2)
expect "GET /auth/callback (denied) status" "$CB_DENIED_STATUS" "307"
expect "GET /auth/callback (denied) location" "$CB_DENIED_PATH" "/login?error=access_denied"

# --- summary ---------------------------------------------------------------

echo ""
echo "== summary: $PASSES passed, $FAILS failed =="
if [[ "$FAILS" -gt 0 ]]; then
  exit 1
fi
echo "All checks passed."