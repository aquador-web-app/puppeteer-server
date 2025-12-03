#!/usr/bin/env bash
set -e

echo "📦 Installing dependencies..."
npm install

echo "🧩 Installing Chromium via Puppeteer..."
npx puppeteer browsers install chrome

echo "🔍 Verify Chromium install:"
ls -R /opt/render/.cache/puppeteer || true

echo "✅ Build complete!"
