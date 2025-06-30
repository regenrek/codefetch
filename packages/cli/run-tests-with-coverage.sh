#!/bin/bash
set -e

echo "Running linter..."
npm run lint

echo "Running type checks..."
npm run test:types

echo "Running unit tests..."
npx vitest run test/unit --coverage --reporter=verbose

echo "Running regression tests..."
npx vitest run test/regression --coverage --reporter=verbose

echo "Running integration tests..."
npx vitest run test/integration --coverage --reporter=verbose

echo "Generating combined coverage report..."
npx vitest run --coverage