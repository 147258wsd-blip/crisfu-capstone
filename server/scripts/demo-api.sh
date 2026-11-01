#!/usr/bin/env bash
# =========================================================
# demo-api.sh — live backend walkthrough for the viva
#
#   bash scripts/demo-api.sh              # pauses between steps (demo mode)
#   PAUSE=0 bash scripts/demo-api.sh      # runs straight through (smoke test)
#   API=https://other.host/api bash scripts/demo-api.sh
#
# Every step prints the request, the HTTP status and a slice of
# the response body. The last step deletes what the script
# created, so the database is left as it was found.
# =========================================================

set -u

API="${API:-https://crisfu-api-ngpxktjcws.cn-hangzhou.fcapp.run/api}"
ADMIN_EMAIL="${ADMIN_EMAIL:-cris@crisfu.dev}"
ADMIN_PASS="${ADMIN_PASS:-crisfu2026}"
SECOND_EMAIL="demo.runner@crisfu.dev"
SECOND_PASS="demoRunner2026"
PAUSE="${PAUSE:-1}"

C_CYAN=$'\033[36m'; C_DIM=$'\033[2m'; C_OFF=$'\033[0m'
OK=$'\033[32m'; BAD=$'\033[31m'; NOTE=$'\033[33m'

CODE=""; BODY=""

step() {
  printf '\n%s━━ %s %s\n' "$C_CYAN" "$1" "$C_OFF"
  [ -n "${2:-}" ] && printf '%s   %s%s\n' "$C_DIM" "$2" "$C_OFF"
  if [ "$PAUSE" = "1" ]; then printf '%s   [enter]%s ' "$C_DIM" "$C_OFF"; read -r _; fi
}

# req METHOD PATH [BODY] [TOKEN]
req() {
  local m="$1" p="$2" d="${3:-}" t="${4:-}"
  local args=(-s -X "$m" "$API$p" -H "Content-Type: application/json")
  [ -n "$t" ] && args+=(-H "Authorization: Bearer $t")
  [ -n "$d" ] && args+=(-d "$d")
  local raw
  raw=$(curl "${args[@]}" -w $'\n%{http_code}')
  CODE="${raw##*$'\n'}"
  BODY="${raw%$'\n'*}"
}

# jget path.to.field  (reads $BODY)
jget() {
  node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d));
    process.stdin.on("end", () => {
      try {
        let v = JSON.parse(s);
        for (const k of process.argv[1].split(".")) v = Array.isArray(v) ? v[Number(k)] : v?.[k];
        console.log(v ?? "");
      } catch (e) { console.log(""); }
    });
  ' "$1"
}

# expect CODE LABEL
expect() {
  if [ "$CODE" = "$1" ]; then printf '   %sHTTP %s ✓%s\n' "$OK" "$CODE" "$C_OFF"
  else printf '   %sHTTP %s (expected %s) ✗%s\n' "$BAD" "$CODE" "$1" "$C_OFF"; fi
}

show() {
  printf '%s   %s%s\n' "$C_DIM" "$(printf '%s' "$BODY" | head -c "${1:-320}")" "$C_OFF"
}

printf '%s\nCLIENT  https://147258wsd-blip.github.io/crisfu-capstone/\nAPI     %s%s\n' "$C_DIM" "$API" "$C_OFF"
printf '%sThe front-end reads every screen below from these same endpoints.%s\n' "$NOTE" "$C_OFF"

# ---------------------------------------------------------------- 1
step "1/9  Health probe" "GET /health — proves the container is up and shows its uptime"
req GET /health
expect 200; show

# ---------------------------------------------------------------- 2
step "2/9  The route map" "GET /api — the API documents itself; every route is registered here"
req GET ""
expect 200; show 400

# ---------------------------------------------------------------- 3
step "3/9  Read a collection" "GET /projects — mongoose query, sorted, category filter available"
req GET /projects
expect 200
PROJECTS=$(printf '%s' "$BODY" | jget count)
printf '   count=%s\n' "$PROJECTS"
show 200

PID=$(printf '%s' "$BODY" | jget projects.0._id)
step "4/9  Read one document" "GET /projects/$PID — populate + single-document shape"
req GET "/projects/$PID"
expect 200; show 260

step "5/9  Bad id is handled, not crashed" "GET /projects/not-an-id — CastError is caught and mapped to 404"
req GET "/projects/not-an-id"
expect 404; show 160

# ---------------------------------------------------------------- 5
step "6/9  Protected route without a token" "POST /projects — expect 401, the write never reaches the database"
req POST /projects '{"title":"should not exist","description":"\"x\"","category":"web"}'
expect 401; show 160

step "6b  Login failures are indistinguishable" "POST /users/login with a wrong password — same message as an unknown email, so accounts cannot be enumerated"
req POST /users/login "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"definitely-wrong\"}"
expect 401; show 160

step "6c  Real login" "POST /users/login — 200 + a signed JWT"
req POST /users/login "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}"
expect 200
TOKEN=$(printf '%s' "$BODY" | jget token)
printf '   token=%s… (%s chars)\n' "$(printf '%s' "$TOKEN" | cut -c1-24)" "${#TOKEN}"

step "6d  Re-validate the token" "GET /users/me — what the SPA calls on every page load"
req GET /users/me "" "$TOKEN"
expect 200; show 200

# ---------------------------------------------------------------- 7
step "7/9  Authorised write" "POST /projects with the token — 201; the owner is taken from the token, never from the body"
req POST /projects '{"title":"Viva demo project","description":"\"Created live from the command line during the viva — then deleted again.\"","category":"web","tags":["demo","api"],"year":"2026"}' "$TOKEN"
expect 201; show 260
NEWID=$(printf '%s' "$BODY" | jget project._id)

step "7b  Update it" "PUT /projects/$NEWID — partial update, owner check on the server"
req PUT "/projects/$NEWID" '{"title":"Viva demo project (edited)"}' "$TOKEN"
expect 200; show 160

# ---------------------------------------------------------------- 8
step "8/9  Ownership is enforced" "A second user tries to delete the project — expect 403, not 200"
req POST /users/register "{\"username\":\"demorunner\",\"email\":\"$SECOND_EMAIL\",\"password\":\"$SECOND_PASS\"}"
if [ "$CODE" = "409" ]; then
  req POST /users/login "{\"email\":\"$SECOND_EMAIL\",\"password\":\"$SECOND_PASS\"}"
fi
expect 201
OTHER=$(printf '%s' "$BODY" | jget token)
req DELETE "/projects/$NEWID" "" "$OTHER"
expect 403; show 160

step "8b  The owner can delete it" "DELETE /projects/$NEWID as the author — 200, and the demo data is gone again"
req DELETE "/projects/$NEWID" "" "$TOKEN"
expect 200; show 160

# ---------------------------------------------------------------- 9
step "9/9  Validation and the admin inbox" "POST /contact with an invalid email — 400 with a field-level error"
req POST /contact '{"name":"Viva","email":"not-an-email","message":"should be rejected"}'
expect 400; show 200

step "9b  The inbox reads the same collection" "GET /contact with the token — 200, newest first (the form above wrote nothing)"
req GET /contact "" "$TOKEN"
expect 200; show 160

step "9c  Dashboard counters" "GET /admin/stats — four countDocuments calls behind one round trip"
req GET /admin/stats "" "$TOKEN"
expect 200; show 200

printf '\n%sDone. Nothing was left behind: the demo project was created, rejected for the wrong user, then deleted by its owner.%s\n' "$OK" "$C_OFF"
