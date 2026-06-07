#!/bin/bash

# ============================================
# AGORICH PHARMA - Run All Tests Script
# ============================================
# This script runs all test suites:
# 1. Unit tests (Jest)
# 2. Integration tests (Jest)
# 3. E2E tests (Playwright)
# 4. Load tests (Artillery)
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEST_RESULTS_DIR="test-results"
COVERAGE_DIR="coverage"
FINAL_REPORT="$TEST_RESULTS_DIR/test-report-$TIMESTAMP.txt"

mkdir -p "$TEST_RESULTS_DIR"
mkdir -p "$COVERAGE_DIR"

echo "============================================"
echo "AGORICH PHARMA - TEST SUITE"
echo "============================================"
echo "Started at: $(date)"
echo "Project: $PROJECT_DIR"
echo "============================================"

FAILED=0
UNIT_FAILED=0
INTEGRATION_FAILED=0
E2E_FAILED=0
LOAD_FAILED=0

# ============================================
# SECTION 1: Unit Tests
# ============================================
echo ""
echo "============================================"
echo "SECTION 1: UNIT TESTS (Jest)"
echo "============================================"
echo "Started at: $(date)"

npx jest tests/unit --coverage --coverageReporters=text --coverageReporters=lcov --coverageDirectory="$COVERAGE_DIR/unit" --testPathPattern="\.test\.ts$" --reporters=default --reporters=jest-silent-reporter 2>&1 | tee "$TEST_RESULTS_DIR/unit-tests.log" || UNIT_FAILED=$?

if [ $UNIT_FAILED -ne 0 ]; then
    echo "❌ Unit tests failed!"
    FAILED=1
else
    echo "✅ Unit tests passed!"
fi

# ============================================
# SECTION 2: Integration Tests
# ============================================
echo ""
echo "============================================"
echo "SECTION 2: INTEGRATION TESTS (Jest)"
echo "============================================"
echo "Started at: $(date)"

npx jest tests/integration --coverage --coverageReporters=text --coverageReporters=lcov --coverageDirectory="$COVERAGE_DIR/integration" --testPathPattern="\.test\.ts$" --reporters=default 2>&1 | tee "$TEST_RESULTS_DIR/integration-tests.log" || INTEGRATION_FAILED=$?

if [ $INTEGRATION_FAILED -ne 0 ]; then
    echo "❌ Integration tests failed!"
    FAILED=1
else
    echo "✅ Integration tests passed!"
fi

# ============================================
# SECTION 3: E2E Tests (Playwright)
# ============================================
echo ""
echo "============================================"
echo "SECTION 3: E2E TESTS (Playwright)"
echo "============================================"
echo "Started at: $(date)"

npx playwright test --reporter=html --reporter=json --output="$TEST_RESULTS_DIR/playwright" 2>&1 | tee "$TEST_RESULTS_DIR/e2e-tests.log" || E2E_FAILED=$?

if [ $E2E_FAILED -ne 0 ]; then
    echo "❌ E2E tests failed!"
    FAILED=1
else
    echo "✅ E2E tests passed!"
fi

# ============================================
# SECTION 4: Load Tests (Artillery)
# ============================================
echo ""
echo "============================================"
echo "SECTION 4: LOAD TESTS (Artillery)"
echo "============================================"
echo "Started at: $(date)"

if [ -f "tests/load/agent-api-load.yml" ]; then
    npx artillery run tests/load/agent-api-load.yml --output="$TEST_RESULTS_DIR/load-test.json" 2>&1 | tee "$TEST_RESULTS_DIR/load-tests.log" || LOAD_FAILED=$?

    if [ $LOAD_FAILED -ne 0 ]; then
        echo "❌ Load tests failed!"
        FAILED=1
    else
        echo "✅ Load tests passed!"
    fi
else
    echo "⚠️  Load test config not found, skipping..."
fi

# ============================================
# Generate Combined Report
# ============================================
echo ""
echo "============================================"
echo "GENERATING COMBINED REPORT"
echo "============================================"

{
    echo "============================================"
    echo "AGORICH PHARMA - TEST REPORT"
    echo "============================================"
    echo "Generated at: $(date)"
    echo "============================================"
    echo ""
    echo "UNIT TESTS: $([ $UNIT_FAILED -eq 0 ] && echo '✅ PASSED' || echo '❌ FAILED')"
    echo "INTEGRATION TESTS: $([ $INTEGRATION_FAILED -eq 0 ] && echo '✅ PASSED' || echo '❌ FAILED')"
    echo "E2E TESTS: $([ $E2E_FAILED -eq 0 ] && echo '✅ PASSED' || echo '❌ FAILED')"
    echo "LOAD TESTS: $([ $LOAD_FAILED -eq 0 ] && echo '✅ PASSED' || echo '❌ FAILED')"
    echo ""
    echo "Overall Status: $([ $FAILED -eq 0 ] && echo '✅ ALL TESTS PASSED' || echo '❌ SOME TESTS FAILED')"
    echo ""
    echo "--------------------------------------------"
    echo "COVERAGE SUMMARY"
    echo "--------------------------------------------"

    if [ -f "$COVERAGE_DIR/unit/coverage-summary.json" ]; then
        echo "Unit Tests Coverage:"
        cat "$COVERAGE_DIR/unit/coverage-summary.json" | grep -E '"total"|"pct"' || true
    fi

    if [ -f "$COVERAGE_DIR/integration/coverage-summary.json" ]; then
        echo "Integration Tests Coverage:"
        cat "$COVERAGE_DIR/integration/coverage-summary.json" | grep -E '"total"|"pct"' || true
    fi

    echo ""
    echo "--------------------------------------------"
    echo "LOG FILES"
    echo "--------------------------------------------"
    echo "Unit tests: $TEST_RESULTS_DIR/unit-tests.log"
    echo "Integration tests: $TEST_RESULTS_DIR/integration-tests.log"
    echo "E2E tests: $TEST_RESULTS_DIR/e2e-tests.log"
    echo "Load tests: $TEST_RESULTS_DIR/load-tests.log"
    echo ""
    echo "============================================"

} > "$FINAL_REPORT"

cat "$FINAL_REPORT"

echo ""
echo "Full report saved to: $FINAL_REPORT"
echo "============================================"

exit $FAILED
