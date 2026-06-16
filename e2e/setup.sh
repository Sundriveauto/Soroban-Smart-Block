#!/bin/bash
set -e

echo "🚀 Setting up E2E Test Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ required (you have $NODE_VERSION)"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm ci

# Install Playwright browsers
echo ""
echo "🌐 Installing Playwright browsers..."
npx playwright install --with-deps

# Setup environment
echo ""
echo "⚙️  Setting up environment..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created .env file (please update with your settings)"
else
  echo "✅ Using existing .env file"
fi

# Verify services
echo ""
echo "🔍 Checking services..."

INDEXER_URL=${INDEXER_URL:-http://localhost:3001}
FRONTEND_URL=${FRONTEND_URL:-http://localhost:5173}

if curl -s "$INDEXER_URL/health" > /dev/null 2>&1; then
  echo "✅ Indexer responding at $INDEXER_URL"
else
  echo "⚠️  Indexer not running at $INDEXER_URL"
  echo "   Start with: cd ../indexer && npm start"
fi

if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
  echo "✅ Frontend running at $FRONTEND_URL"
else
  echo "⚠️  Frontend not running at $FRONTEND_URL"
  echo "   Start with: cd ../frontend && npm run dev"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Ensure indexer is running: cd ../indexer && npm start"
echo "  2. Ensure frontend is running: cd ../frontend && npm run dev"
echo "  3. Run E2E tests: npm run test:e2e"
echo ""
echo "For more info, see README.md"
