#!/bin/bash
set -e

echo "📦 Generating Prisma Client..."
prisma generate

echo "🔄 Attempting to deploy migrations..."
# Try to deploy migrations, but don't fail the build if it times out
# (migrations may already be applied from previous deployment)
if ! timeout 30 prisma migrate deploy 2>&1; then
  echo "⚠️  Migration deployment timed out or failed, but continuing build..."
  echo "   This is often OK if migrations were already applied in a previous deployment."
fi

echo "🏗️  Building Next.js application..."
next build

echo "✅ Build complete!"
