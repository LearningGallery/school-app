#!/usr/bin/env bash
# Smoke test: does the deployed system answer on its key paths?
# Usage: BASE_URL=http://localhost:8080 SMOKE_EMAIL=... SMOKE_PASSWORD=... tests/smoke/smoke.sh
# Kubernetes probes answer "can this workload run"; this answers "does the system respond correctly".
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
: "${SMOKE_EMAIL:?set SMOKE_EMAIL}" "${SMOKE_PASSWORD:?set SMOKE_PASSWORD}"
fail=0

check() { # name expected_status url [curl args...]
  local name=$1 want=$2 url=$3; shift 3
  local got
  got=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$@" "$url" || true)
  if [ "$got" = "$want" ]; then echo "ok    $name ($got)"; else echo "FAIL  $name: want $want got $got"; fail=1; fi
}

check "healthz"  200 "$BASE_URL/healthz"
check "startupz" 200 "$BASE_URL/startupz"
check "readyz"   200 "$BASE_URL/readyz"
check "api requires auth" 401 "$BASE_URL/api/students"

token=$(curl -s --max-time 10 -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SMOKE_EMAIL\",\"password\":\"$SMOKE_PASSWORD\"}" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
if [ -n "$token" ]; then
  echo "ok    login"
  check "students list" 200 "$BASE_URL/api/students" -H "Authorization: Bearer $token"
else
  echo "FAIL  login"; fail=1
fi

if curl -s --max-time 10 "$BASE_URL/metrics" | grep -q '^http_requests_total'; then echo "ok    metrics"; else echo "FAIL  metrics"; fail=1; fi

exit $fail
