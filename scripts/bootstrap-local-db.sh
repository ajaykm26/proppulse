#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/apps/backend"
MIGRATIONS_DIR="$BACKEND_DIR/prisma/migrations"

cd "$BACKEND_DIR"

echo "→ Generating Prisma client"
npx prisma generate

if [ -d "$MIGRATIONS_DIR" ] && find "$MIGRATIONS_DIR" -mindepth 1 -maxdepth 1 -type d | grep -q .; then
  echo "→ Applying Prisma migrations"
  npx prisma migrate dev
else
  echo "→ No Prisma migrations found yet; pushing schema directly for local bootstrap"
  npx prisma db push
fi

echo "→ Seeding sample data"
npm run seed

echo "✓ Local database bootstrap complete"
