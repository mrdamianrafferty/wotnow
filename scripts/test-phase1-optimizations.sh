#!/bin/bash

# Phase 1 Optimization Test Suite
# Tests all Phase 1 changes thoroughly before Phase 2

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Phase 1 Performance Optimization Test Suite                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

passed=0
failed=0
warnings=0

test_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $2"
    ((passed++))
  else
    echo -e "${RED}✗ FAIL${NC}: $2"
    ((failed++))
  fi
}

test_warning() {
  echo -e "${YELLOW}⚠ WARN${NC}: $1"
  ((warnings++))
}

# =============================================================================
# TEST 1: TypeScript Compilation
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: TypeScript Compilation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npm run typecheck > /dev/null 2>&1
test_result $? "TypeScript compilation (no type errors)"
echo ""

# =============================================================================
# TEST 2: Supabase Client Caching Fix
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Supabase Client Caching Fix"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check that cachedSupabase is removed
if grep -q "let cachedSupabase" lib/supabase/serverClient.ts; then
  test_result 1 "Cached Supabase client removed"
else
  test_result 0 "Cached Supabase client removed"
fi

# Check that auth.signOut workaround is removed
if grep -q "auth.signOut()" pages/api/findr/predictions.ts; then
  test_warning "auth.signOut() workaround still present (should be removed)"
else
  test_result 0 "auth.signOut() workaround removed"
fi

# Check for fresh client creation
if grep -q "return createClient" lib/supabase/serverClient.ts; then
  test_result 0 "Fresh client created per request"
else
  test_result 1 "Fresh client created per request"
fi
echo ""

# =============================================================================
# TEST 3: RPC Timeout Reduction
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: RPC Timeout Reduction (25s → 10s)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check that 25000 timeout is replaced with 10000
if grep -q "25000" pages/api/findr/predictions.ts; then
  test_result 1 "Old 25s timeout removed"
else
  test_result 0 "Old 25s timeout removed"
fi

if grep -q "10000" pages/api/findr/predictions.ts; then
  test_result 0 "New 10s timeout implemented"
else
  test_result 1 "New 10s timeout implemented"
fi

if grep -q "timeout after 10 seconds" pages/api/findr/predictions.ts; then
  test_result 0 "Timeout error message updated"
else
  test_result 1 "Timeout error message updated"
fi
echo ""

# =============================================================================
# TEST 4: Conditional Debug Logging
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: Conditional Debug Logging"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check that DEBUG_LOGGING constant exists
if grep -q "const DEBUG_LOGGING" pages/api/findr/predictions.ts; then
  test_result 0 "DEBUG_LOGGING constant defined"
else
  test_result 1 "DEBUG_LOGGING constant defined"
fi

# Check that debug logs are conditional
if grep -q "if (DEBUG_LOGGING)" pages/api/findr/predictions.ts; then
  test_result 0 "Debug logs made conditional"
else
  test_result 1 "Debug logs made conditional"
fi

# Count conditional debug blocks (should be at least 4)
debug_blocks=$(grep -c "if (DEBUG_LOGGING)" pages/api/findr/predictions.ts || echo 0)
if [ "$debug_blocks" -ge 4 ]; then
  test_result 0 "Multiple debug blocks made conditional ($debug_blocks found)"
else
  test_warning "Only $debug_blocks conditional debug blocks found (expected 4+)"
fi
echo ""

# =============================================================================
# TEST 5: Database Migration Exists
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 5: Database Index Migration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

migration_file="supabase/migrations/20251121000009_add_ices_rectangle_indexes.sql"
if [ -f "$migration_file" ]; then
  test_result 0 "Index migration file exists"

  # Check for expected indexes in migration
  expected_indexes=(
    "ices_rectangles_rectangle_code_idx"
    "ices_rectangles_region_idx"
    "ices_rectangles_coastal_idx"
    "ices_rectangles_location_idx"
    "ices_rectangles_cmems_region_idx"
    "ices_rectangles_code_region_idx"
  )

  for index in "${expected_indexes[@]}"; do
    if grep -q "$index" "$migration_file"; then
      test_result 0 "Index $index defined in migration"
    else
      test_result 1 "Index $index defined in migration"
    fi
  done
else
  test_result 1 "Index migration file exists"
fi
echo ""

# =============================================================================
# TEST 6: API Performance Tests
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 6: API Performance (Live Tests)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: Cache bypass (fresh data)
echo "Test 6.1: Fresh request (bypass cache)..."
start=$(date +%s%N)
response=$(curl -s -w "\n%{http_code}" "http://localhost:3002/api/findr/predictions" \
  -H "Content-Type: application/json" \
  -d '{"rectangleCode":"31F2","predictionDate":"2025-11-21","language":"en","bypassCache":true}')
end=$(date +%s%N)
elapsed=$((($end - $start) / 1000000))
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
  test_result 0 "API returns 200 OK"
else
  test_result 1 "API returns 200 OK (got $http_code)"
fi

if [ $elapsed -lt 2000 ]; then
  test_result 0 "Fresh request under 2s ($elapsed ms)"
else
  test_warning "Fresh request slow: ${elapsed}ms (target: <2000ms)"
fi

# Test 2: Cached request
echo "Test 6.2: Cached request..."
start=$(date +%s%N)
response=$(curl -s -w "\n%{http_code}" "http://localhost:3002/api/findr/predictions" \
  -H "Content-Type: application/json" \
  -d '{"rectangleCode":"31F2","predictionDate":"2025-11-21","language":"en"}')
end=$(date +%s%N)
elapsed=$((($end - $start) / 1000000))
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
  test_result 0 "Cached request returns 200 OK"
else
  test_result 1 "Cached request returns 200 OK (got $http_code)"
fi

if [ $elapsed -lt 1000 ]; then
  test_result 0 "Cached request under 1s ($elapsed ms)"
else
  test_warning "Cached request slow: ${elapsed}ms (target: <1000ms)"
fi

# Test 3: Multiple rapid requests (no auth pollution)
echo "Test 6.3: Multiple rapid requests (auth pollution test)..."
success_count=0
for i in {1..5}; do
  http_code=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:3002/api/findr/predictions" \
    -H "Content-Type: application/json" \
    -d "{\"rectangleCode\":\"31F2\",\"predictionDate\":\"2025-11-21\",\"language\":\"en\",\"bypassCache\":false}")
  if [ "$http_code" = "200" ]; then
    ((success_count++))
  fi
done

if [ $success_count -eq 5 ]; then
  test_result 0 "All 5 rapid requests successful (no auth pollution)"
else
  test_result 1 "All 5 rapid requests successful ($success_count/5 succeeded)"
fi
echo ""

# =============================================================================
# TEST 7: Code Quality Checks
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 7: Code Quality"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for console.log without DEBUG_LOGGING guard in predictions.ts
# (exclude error logs and specific allowed logs)
problematic_logs=$(grep -n "console\.log" pages/api/findr/predictions.ts | \
  grep -v "if (DEBUG_LOGGING)" | \
  grep -v "console\.error" | \
  grep -v "console\.warn" | \
  wc -l)

if [ "$problematic_logs" -eq 0 ]; then
  test_result 0 "No unguarded debug logs"
else
  test_warning "$problematic_logs unguarded console.log statements found"
fi

# Check for proper comments on fixes
if grep -q "PERFORMANCE FIX" lib/supabase/serverClient.ts; then
  test_result 0 "Performance fix comments present"
else
  test_warning "Missing performance fix comments"
fi
echo ""

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                        TEST SUMMARY                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✓ Passed:  $passed${NC}"
echo -e "${RED}✗ Failed:  $failed${NC}"
echo -e "${YELLOW}⚠ Warnings: $warnings${NC}"
echo ""

total_tests=$((passed + failed))
pass_rate=$((passed * 100 / total_tests))

if [ $failed -eq 0 ]; then
  echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  ALL PHASE 1 TESTS PASSED! ($pass_rate%)            ║${NC}"
  echo -e "${GREEN}║  Ready to proceed to Phase 2                 ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  SOME TESTS FAILED ($failed failures)              ║${NC}"
  echo -e "${RED}║  Please fix issues before Phase 2           ║${NC}"
  echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
  echo ""
  exit 1
fi
