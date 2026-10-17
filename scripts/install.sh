#!/usr/bin/env bash
# DreamDesign - optional photo-to-3D backend installer (Linux/macOS, Python 3.10-3.11)
# The web app itself needs NO install: open docs/index.html or the GitHub Pages link.
set -euo pipefail
cd "$(dirname "$0")/.."

PY=""
for c in python3.11 python3.10 python3; do command -v "$c" >/dev/null 2>&1 && PY="$c" && break; done
[ -n "$PY" ] || { echo "Python 3.10/3.11 not found."; exit 1; }
"$PY" -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate
python -m pip install --upgrade pip "setuptools<81" wheel

if command -v nvidia-smi >/dev/null 2>&1; then
  echo "NVIDIA GPU found - installing CUDA PyTorch."
  pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
elif [ "$(uname)" = "Darwin" ]; then
  pip install torch torchvision
else
  echo "No NVIDIA GPU found - installing CPU PyTorch (slow, but works)."
  pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
fi

[ -d server/TripoSR/tsr ] || git clone --depth 1 https://github.com/VAST-AI-Research/TripoSR server/TripoSR
# TripoSR needs a compiled torchmcubes; we ship a pure-Python replacement (server/torchmcubes.py).
grep -v -i -e torchmcubes -e gradio server/TripoSR/requirements.txt > server/req-triposr.txt
pip install -r server/req-triposr.txt
pip install -r server/requirements.txt
echo
echo "Done. Start DreamDesign with: scripts/run.sh"
echo "The first photo-to-3D run downloads the model weights (about 1.7 GB)."
