#!/usr/bin/env bash
set -e

echo "📦 Installing dependencies..."
npm install

echo "🧩 Installing Chromium via Puppeteer..."
npx puppeteer browsers install chrome

echo "🔍 Installed Chrome version:"
ls -R /opt/render/.cache/puppeteer || true

echo "✅ Build complete!"
