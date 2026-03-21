#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="${PROJECT_DIR}/frontend-new"
DIST_DIR="${PROJECT_DIR}/frontend-dist"
TMP_DIR="${DIST_DIR}.tmp"

docker run --rm \
  -v "${FRONTEND_DIR}:/app" \
  -w /app \
  node:20 \
  bash -lc 'set -euo pipefail; corepack enable; yarn install --frozen-lockfile && yarn build'

rm -rf "${TMP_DIR}"
mkdir -p "${TMP_DIR}" "${DIST_DIR}"
rsync -a --delete "${FRONTEND_DIR}/public/" "${TMP_DIR}/"
rsync -a --delete "${TMP_DIR}/" "${DIST_DIR}/"
rm -rf "${TMP_DIR}"

echo "Frontend build is updated in ${DIST_DIR}"
