#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUNDLE_DIR="$BE_DIR/lambda-bundle"
CODE_DIR="$BUNDLE_DIR/code"
LAYER_DIR="$BUNDLE_DIR/layer/nodejs"

echo "==> Building NestJS..."
cd "$BE_DIR"
npm run build

echo "==> Preparing lambda-bundle..."
rm -rf "$BUNDLE_DIR"
mkdir -p "$CODE_DIR"
mkdir -p "$LAYER_DIR"

echo "==> Copying compiled code..."
cp -r "$BE_DIR/dist/." "$CODE_DIR/"

echo "==> Installing production dependencies into layer..."
cp "$BE_DIR/package.json" "$LAYER_DIR/package.json"
cp "$BE_DIR/package-lock.json" "$LAYER_DIR/package-lock.json"
# Installa per linux-x64 (target Lambda) usando npm_config env vars
npm_config_os=linux npm_config_cpu=x64 npm_config_libc=glibc npm ci --omit=dev --prefix "$LAYER_DIR"
rm -f "$LAYER_DIR/package.json" "$LAYER_DIR/package-lock.json"

echo "==> Copying generated .prisma/client into layer..."
mkdir -p "$LAYER_DIR/node_modules/.prisma"
cp -r "$BE_DIR/node_modules/.prisma/client" "$LAYER_DIR/node_modules/.prisma/client"

echo "==> Cleaning unnecessary packages from layer..."

# Rimuovi Prisma CLI e TypeScript
rm -rf "$LAYER_DIR/node_modules/prisma"
rm -rf "$LAYER_DIR/node_modules/typescript"

# Rimuovi Prisma Studio e dev tools
rm -rf "$LAYER_DIR/node_modules/@prisma/studio-core"
rm -rf "$LAYER_DIR/node_modules/@prisma/dev"

# Rimuovi schema-engine (per migrate, non serve a runtime)
find "$LAYER_DIR/node_modules/@prisma/engines" -name "schema-engine-*" -delete 2>/dev/null || true

# Prisma 7: rimuovi WASM engine per DB non usati
PRISMA_RUNTIME="$LAYER_DIR/node_modules/@prisma/client/runtime"
for f in "$PRISMA_RUNTIME"/*.{js,mjs}; do
  [ -f "$f" ] || continue
  base="$(basename "$f")"
  if [[ "$base" == *"cockroachdb"* || "$base" == *"mysql"* || "$base" == *"sqlite"* || "$base" == *"sqlserver"* ]]; then
    rm -f "$f"
  fi
done

# Rimuovi @types
rm -rf "$LAYER_DIR/node_modules/@types"

# Rimuovi source maps
find "$LAYER_DIR/node_modules" -name "*.map" -delete 2>/dev/null || true

echo "==> Sizes:"
echo "  Code:  $(du -sh "$CODE_DIR" | cut -f1)"
echo "  Layer: $(du -sh "$LAYER_DIR" | cut -f1)"
echo "==> lambda-bundle ready at $BUNDLE_DIR"
