#!/usr/bin/env bash
set -o pipefail

BASE="http://localhost:3000/api/unified-weather"

# name|query pairs (portable for macOS default Bash)
cases=(
  "ES_INLAND|lat=40.4168&lon=-3.7038&mode=land&owDp=1&mock=inland"
  "ES_COAST|lat=43.3210&lon=-1.9850&mode=marine&activityId=sea_fishing_shore&includeBio=1&owDp=1&mock=marine"
  "US_INLAND|lat=39.7392&lon=-104.9903&mode=land&owDp=1&mock=inland"
  "US_COAST|lat=25.7617&lon=-80.1918&mode=marine&activityId=sea_fishing_boat&includeBio=1&owDp=1&mock=marine"
  "MAURITIUS|lat=-20.3484&lon=57.5522&mode=marine&activityId=sea_fishing_boat&includeBio=1&owDp=1&mock=marine"
)

for entry in "${cases[@]}"; do
  name="${entry%%|*}"
  query="${entry#*|}"
  TMPH="/tmp/h.$$"
  TMPB="/tmp/b.$$"
  echo "=== $name ==="
  if ! curl -sS --show-error --max-time 20 "$BASE?$query" -D "$TMPH" -o "$TMPB"; then
    echo "(curl failed)"
    echo "--- Headers ---"; test -f "$TMPH" && cat "$TMPH" || echo "(no headers)"
    echo "--- Body (first 400 chars) ---"; test -f "$TMPB" && head -c 400 "$TMPB" || echo "(no body)"; echo
    continue
  fi

  status=$(awk 'toupper($1) ~ /^HTTP/ {print $2}' "$TMPH" | tail -1)
  if [ "$status" != "200" ]; then
    echo "(HTTP $status)"
    echo "--- Headers ---"; cat "$TMPH"
    echo "--- Body (first 400 chars) ---"; head -c 400 "$TMPB"; echo
    continue
  fi

  ctype=$(grep -i '^content-type:' "$TMPH" | tr -d '\r' | awk '{print tolower($0)}')
  if ! echo "$ctype" | grep -q 'application/json'; then
    echo "(Non-JSON response)"
    echo "--- Headers ---"; cat "$TMPH"
    echo "--- Body (first 400 chars) ---"; head -c 400 "$TMPB"; echo
    continue
  fi

  # Show key headers
  grep -E 'X-(Region|Provider-Plan|Weather-Source|OW-Precision-DP|OW-Coord-Key|Has-SG-Key):' "$TMPH" || true

  # Summarise important parts of body
  node -e 'const fs=require("fs");const p=process.argv[1];const j=JSON.parse(fs.readFileSync(p,"utf8"));
    console.log(JSON.stringify({
      name:j.name,
      isMarine:j.isMarine,
      hourly_len:(j.hourly||[]).length,
      daily_len:(j.daily||[]).length,
      tides_len:(j.tides||[]).length,
      marineHourly_len:(j.marineHourly||[]).length,
      seaTemp:j.seaTemp,
      hasMarineData:j.hasMarineData,
      hasBio: !!j.bio
    },null,2));' "$TMPB"
  echo
done