#!/bin/bash
# Schedully — deploy script
# Run from the repo root on the VPS:  bash deploy.sh

set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$REPO_DIR/frontend"
BACKEND_DIR="$REPO_DIR/backend"

echo "==> Pulling latest code..."
git -C "$REPO_DIR" pull origin main

echo "==> Building frontend..."
cd "$FRONTEND_DIR"
npm install --silent
npm run build

echo "==> Installing backend dependencies..."
cd "$BACKEND_DIR"
npm install --silent
npx prisma generate

echo "==> Restarting backend (PM2)..."
pm2 restart schedully-api 2>/dev/null || pm2 start server.js --name schedully-api

echo "==> Done! Deploy completed successfully."
