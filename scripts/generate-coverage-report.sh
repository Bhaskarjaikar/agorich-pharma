#!/bin/bash

# ============================================
# AGORICH PHARMA - Coverage Report Generator
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

COVERAGE_DIR="$PROJECT_DIR/coverage"
REPORT_FILE="$COVERAGE_DIR/coverage-report.html"

echo "============================================"
echo "GENERATING COVERAGE REPORTS"
echo "============================================"

mkdir -p "$COVERAGE_DIR"

# Generate unit test coverage
echo "Running unit tests with coverage..."
npx jest tests/unit --coverage --coverageReporters=lcov --coverageReporters=html --coverageReporters=text --coverageDirectory="$COVERAGE_DIR/unit" 2>&1 || true

# Generate integration test coverage
echo "Running integration tests with coverage..."
npx jest tests/integration --coverage --coverageReporters=lcov --coverageReporters=html --coverageReporters=text --coverageDirectory="$COVERAGE_DIR/integration" 2>&1 || true

# Combine coverage reports
echo "Combining coverage reports..."

# Create HTML report
cat > "$REPORT_FILE" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Agorich Pharma - Test Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        h2 { color: #666; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .coverage-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
        .coverage-card { background: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center; }
        .coverage-value { font-size: 36px; font-weight: bold; }
        .coverage-label { color: #666; font-size: 14px; margin-top: 5px; }
        .high { color: #22c55e; }
        .medium { color: #eab308; }
        .low { color: #ef4444; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f9f9f9; font-weight: 600; }
        .pass { color: #22c55e; }
        .fail { color: #ef4444; }
        iframe { width: 100%; height: 500px; border: 1px solid #ddd; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Agorich Pharma - Test Coverage Report</h1>
        <p>Generated at: $(date)</p>

        <h2>Coverage Overview</h2>
        <div class="coverage-grid">
            <div class="coverage-card">
                <div class="coverage-value high" id="statements">-</div>
                <div class="coverage-label">Statements</div>
            </div>
            <div class="coverage-card">
                <div class="coverage-value high" id="branches">-</div>
                <div class="coverage-label">Branches</div>
            </div>
            <div class="coverage-card">
                <div class="coverage-value high" id="functions">-</div>
                <div class="coverage-label">Functions</div>
            </div>
            <div class="coverage-card">
                <div class="coverage-value high" id="lines">-</div>
                <div class="coverage-label">Lines</div>
            </div>
        </div>

        <h2>Coverage Details</h2>
        <table>
            <thead>
                <tr>
                    <th>Module</th>
                    <th>Statements</th>
                    <th>Branches</th>
                    <th>Functions</th>
                    <th>Lines</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Unit Tests</td>
                    <td id="unit-statements">-</td>
                    <td id="unit-branches">-</td>
                    <td id="unit-functions">-</td>
                    <td id="unit-lines">-</td>
                </tr>
                <tr>
                    <td>Integration Tests</td>
                    <td id="int-statements">-</td>
                    <td id="int-branches">-</td>
                    <td id="int-functions">-</td>
                    <td id="int-lines">-</td>
                </tr>
            </tbody>
        </table>

        <h2>Detailed Reports</h2>
        <p><a href="unit/lcov-report/index.html">Unit Tests Coverage Report</a></p>
        <p><a href="integration/lcov-report/index.html">Integration Tests Coverage Report</a></p>
    </div>
</body>
</html>
EOF

echo "Coverage report generated at: $REPORT_FILE"
echo "============================================"
