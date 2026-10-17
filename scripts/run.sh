#!/usr/bin/env bash
# Starts DreamDesign with the photo-to-3D backend at http://localhost:8000
set -euo pipefail
cd "$(dirname "$0")/../server"
[ -f ../.venv/bin/activate ] || { echo "Run scripts/install.sh first."; exit 1; }
# shellcheck disable=SC1091
source ../.venv/bin/activate
(sleep 4; (xdg-open http://localhost:8000 || open http://localhost:8000) >/dev/null 2>&1 || true) &
exec python -m uvicorn server:app --port 8000
