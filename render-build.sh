#!/usr/bin/env bash
set -e

echo "📦 Installing dependencies..."
npm install

echo "🧩 Installing EXACT Chromium version required by puppeteer-core..."
npx puppeteer browsers install chrome@127.0.6533.88

echo "🔍 Verify Chromium install:"
ls -R /opt/render/.cache/puppeteer || true

echo "✅ Build complete!"
