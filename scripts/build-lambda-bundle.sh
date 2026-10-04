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
# Installa per linux-x64 (target Lambda)
npm_config_os=linux npm_config_cpu=x64 npm_config_libc=glibc npm ci --omit=dev --prefix "$LAYER_DIR"
rm -f "$LAYER_DIR/package.json" "$LAYER_DIR/package-lock.json"

echo "==> Copying generated .prisma/client into layer..."
mkdir -p "$LAYER_DIR/node_modules/.prisma"
cp -r "$BE_DIR/node_modules/.prisma/client" "$LAYER_DIR/node_modules/.prisma/client"

echo "==> Cleaning unnecessary packages from layer..."

# Prisma CLI e dev tools
rm -rf "$LAYER_DIR/node_modules/prisma"
rm -rf "$LAYER_DIR/node_modules/typescript"
rm -rf "$LAYER_DIR/node_modules/@prisma/studio-core"
rm -rf "$LAYER_DIR/node_modules/@prisma/dev"

# Prisma schema-engine (non serve a runtime)
find "$LAYER_DIR/node_modules/@prisma/engines" -name "schema-engine-*" -delete 2>/dev/null || true

# Prisma WASM engine per DB non usati
PRISMA_RUNTIME="$LAYER_DIR/node_modules/@prisma/client/runtime"
for f in "$PRISMA_RUNTIME"/*.{js,mjs}; do
  [ -f "$f" ] || continue
  base="$(basename "$f")"
  if [[ "$base" == *"cockroachdb"* || "$base" == *"mysql"* || "$base" == *"sqlite"* || "$base" == *"sqlserver"* ]]; then
    rm -f "$f"
  fi
done

# @electric-sql e effect (dipendenze Prisma non usate a runtime)
rm -rf "$LAYER_DIR/node_modules/@electric-sql"
rm -rf "$LAYER_DIR/node_modules/effect"

# @zxing — sostituito da jsqr
rm -rf "$LAYER_DIR/node_modules/@zxing"

# jimp e dipendenze — non usato (usiamo solo sharp + jsqr)
rm -rf "$LAYER_DIR/node_modules/jimp"
rm -rf "$LAYER_DIR/node_modules/@jimp"
rm -rf "$LAYER_DIR/node_modules/gifwrap"
rm -rf "$LAYER_DIR/node_modules/omggif"
rm -rf "$LAYER_DIR/node_modules/utif2"

# react-dom e react — non servono nel backend
rm -rf "$LAYER_DIR/node_modules/react-dom"
rm -rf "$LAYER_DIR/node_modules/react"

# sharp — tieni solo i binari linux-x64 (quello per Lambda)
# Rimuovi binari per altre piattaforme
rm -rf "$LAYER_DIR/node_modules/@img/sharp-darwin-arm64"
rm -rf "$LAYER_DIR/node_modules/@img/sharp-darwin-x64"
rm -rf "$LAYER_DIR/node_modules/@img/sharp-win32-x64"
rm -rf "$LAYER_DIR/node_modules/@img/sharp-linuxmusl-x64"
rm -rf "$LAYER_DIR/node_modules/@img/sharp-linuxmusl-arm64"
rm -rf "$LAYER_DIR/node_modules/@img/sharp-linux-arm"
rm -rf "$LAYER_DIR/node_modules/@img/sharp-linux-arm64"

# @nestjs/schedule — non usato in produzione
rm -rf "$LAYER_DIR/node_modules/@nestjs/schedule"

# @types
rm -rf "$LAYER_DIR/node_modules/@types"

# Source maps
find "$LAYER_DIR/node_modules" -name "*.map" -delete 2>/dev/null || true

# Test e benchmark files
find "$LAYER_DIR/node_modules" -type d -name "__tests__" -exec rm -rf {} + 2>/dev/null || true
find "$LAYER_DIR/node_modules" -type d -name "test" -exec rm -rf {} + 2>/dev/null || true
find "$LAYER_DIR/node_modules" -name "*.test.js" -delete 2>/dev/null || true

echo "==> Sizes:"
echo "  Code:  $(du -sh "$CODE_DIR" | cut -f1)"
echo "  Layer: $(du -sh "$LAYER_DIR" | cut -f1)"
echo "==> lambda-bundle ready at $BUNDLE_DIR"
