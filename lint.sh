#!/bin/bash
# Code Style and Linter Runner Script
# This script runs styling and linter checks for Python and JavaScript files.
# Usage:
#   ./lint.sh        - Run checks and report errors
#   ./lint.sh --fix  - Run checks and automatically fix formatting/lint errors

FIX_MODE=false
if [ "$1" == "--fix" ]; then
    FIX_MODE=true
fi

echo "=========================================================="
echo "                   Running Lint & Style Checks             "
echo "=========================================================="

FAILED=0

# --- Python Checks (using Ruff) ---
echo -e "\n--- [Python] Checking Linting & Styling ---"
if [ "$FIX_MODE" = true ]; then
    echo "Running Ruff linter with --fix..."
    uv run ruff check --fix .
    RUFF_LINT_EXIT=$?

    echo "Running Ruff formatter..."
    uv run ruff format .
    RUFF_FMT_EXIT=$?
else
    echo "Checking Ruff linter..."
    uv run ruff check .
    RUFF_LINT_EXIT=$?

    echo "Checking Ruff formatter..."
    uv run ruff format --check .
    RUFF_FMT_EXIT=$?
fi

if [ $RUFF_LINT_EXIT -ne 0 ]; then
    echo "❌ Python Linting failed!"
    FAILED=1
else
    echo "✅ Python Linting passed."
fi

if [ $RUFF_FMT_EXIT -ne 0 ]; then
    echo "❌ Python Formatting check failed!"
    FAILED=1
else
    echo "✅ Python Formatting check passed."
fi

# --- JavaScript Checks (using Prettier and ESLint) ---
echo -e "\n--- [JavaScript] Checking Styling ---"
if [ "$FIX_MODE" = true ]; then
    echo "Running Prettier formatter (writing changes)..."
    npx prettier --write "static/**/*.js"
    JS_FMT_EXIT=$?
else
    echo "Checking Prettier formatter..."
    npx prettier --check "static/**/*.js"
    JS_FMT_EXIT=$?
fi

if [ $JS_FMT_EXIT -ne 0 ]; then
    echo "❌ JavaScript Formatting check failed! Run './lint.sh --fix' to format."
    FAILED=1
else
    echo "✅ JavaScript Formatting check passed."
fi

echo -e "\n--- [JavaScript] Checking Linting ---"
# Check if eslint.config.js exists, if not we will run eslint with default configurations
if [ ! -f "eslint.config.js" ] && [ ! -f ".eslintrc" ] && [ ! -f ".eslintrc.json" ]; then
    echo "No ESLint config found. Creating temporary eslint.config.js..."
    cat << 'EOF' > eslint.config.js
export default [
    {
        files: ["static/**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                window: "readonly",
                document: "readonly",
                localStorage: "readonly",
                console: "readonly",
                alert: "readonly",
                confirm: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                fetch: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "off",
            "no-undef": "error"
        }
    }
];
EOF
fi

if [ "$FIX_MODE" = true ]; then
    echo "Running ESLint with --fix..."
    npx eslint "static/**/*.js" --fix
    JS_LINT_EXIT=$?
else
    echo "Checking ESLint..."
    npx eslint "static/**/*.js"
    JS_LINT_EXIT=$?
fi

if [ $JS_LINT_EXIT -ne 0 ]; then
    echo "❌ JavaScript Linting failed!"
    FAILED=1
else
    echo "✅ JavaScript Linting passed."
fi

# --- CSS Checks (using stylelint) ---
echo -e "\n--- [CSS] Checking Linting & Styling ---"
echo "Checking CSS with stylelint..."
npx stylelint "static/**/*.css"
CSS_LINT_EXIT=$?

if [ $CSS_LINT_EXIT -ne 0 ]; then
    echo "❌ CSS Linting failed!"
    FAILED=1
else
    echo "✅ CSS Linting passed."
fi

echo "=========================================================="
if [ $FAILED -ne 0 ]; then
    echo "❌ Some checks failed. Review the output above."
    exit 1
else
    echo "✅ All checks passed successfully!"
    exit 0
fi
