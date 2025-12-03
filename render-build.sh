#!/usr/bin/env bash
set -e

echo "⚡ Installing Chromium..."
apt-get update
apt-get install -y chromium-browser chromium-common chromium-codecs-ffmpeg

echo "⚡ Installing Node dependencies..."
npm install
