"""DreamDesign local server: JPG/PNG -> GLB (TripoSR), plus the web app.

Start with scripts/run.bat (Windows) or scripts/run.sh (Linux/macOS), or manually:
    cd server && uvicorn server:app --port 8000

TripoSR is expected in server/TripoSR (the installer clones it there). If it is
not found there, a `tsr` package already on the Python path is used.
The web app is served from ../docs.

Defaults are tuned for low VRAM (4 GB). Environment variables:
  TSR_DEVICE=cpu     ekran kartını kullanma (çok yavaş ama bellek sorunu olmaz)
  TSR_CHUNK=2048     render chunk boyutu (küçük = daha az VRAM)
  TSR_RES=192        varsayılan mesh çözünürlüğü (bellek yetmezse otomatik 128'e düşer)
  TSR_QCHUNK=65536   yoğunluk sorgusu parça boyutu (küçük = daha az VRAM)
  TSR_SMOOTH=10      Taubin yumuşatma adımı (0 = kapalı)
"""
import os
import sys
import threading

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "TripoSR"))   # tsr package (cloned by the installer)
sys.path.insert(0, HERE)                             # torchmcubes.py shim, meshfix.py

import numpy as np
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from PIL import Image

import meshfix

app = FastAPI()
device = os.getenv("TSR_DEVICE") or ("cuda:0" if torch.cuda.is_available() else "cpu")
CHUNK = int(os.getenv("TSR_CHUNK", "2048"))
DEFAULT_RES = int(os.getenv("TSR_RES", "192"))
QCHUNK = int(os.getenv("TSR_QCHUNK", "65536"))
SMOOTH = int(os.getenv("TSR_SMOOTH", "10"))
_lock = threading.Lock()   # GPU'yu aynı anda tek istek kullansın
_state = {}


def _chunk_density_queries(model):
    """extract_mesh tüm ızgarayı tek seferde sorguluyor (128³ ≈ 2 milyon nokta).
    Sorguyu parçalara bölmek 4 GB ekran kartında daha yüksek çözünürlüğü mümkün kılar."""
    orig = model.renderer.query_triplane

    def chunked(decoder, positions, triplane):
        if positions.ndim != 2 or positions.shape[0] <= QCHUNK:
            return orig(decoder, positions, triplane)
        outs = [orig(decoder, positions[i:i + QCHUNK], triplane)
                for i in range(0, positions.shape[0], QCHUNK)]
        return {k: torch.cat([o[k] for o in outs], 0) for k in outs[0]}

    model.renderer.query_triplane = chunked


def _load():
    """Modeli ilk istekte yükler (ilk seferde ~1.7 GB indirir)."""
    if "model" not in _state:
        import rembg
        from tsr.system import TSR
        model = TSR.from_pretrained(
            "stabilityai/TripoSR", config_name="config.yaml", weight_name="model.ckpt"
        )
        model.renderer.set_chunk_size(CHUNK)
        _chunk_density_queries(model)
        model.to(device)
        _state["model"] = model
        _state["rembg"] = rembg.new_session()
    return _state


def _run(model, img, res, chunk):
    model.renderer.set_chunk_size(chunk)
    with torch.no_grad():
        codes = model([img], device=device)
        return model.extract_mesh(codes, True, resolution=res)[0]


def _is_oom(e):
    return isinstance(e, torch.cuda.OutOfMemoryError) or "out of memory" in str(e).lower()


@app.get("/api/health")
def health():
    return {"device": device, "model_loaded": "model" in _state,
            "chunk": CHUNK, "default_res": DEFAULT_RES, "smooth": SMOOTH}


@app.post("/api/generate")
def generate(image: UploadFile = File(...), mc_resolution: int = 0, remove_bg: bool = True,
             smooth: int = -1):
    from tsr.utils import remove_background, resize_foreground

    res = mc_resolution or DEFAULT_RES
    if not 64 <= res <= 512:
        raise HTTPException(400, "mc_resolution 64 ile 512 arasında olmalı")
    try:
        raw = Image.open(image.file)
        raw.load()
    except Exception:
        raise HTTPException(400, "Görüntü okunamadı (JPG, PNG veya WEBP olmalı)")

    with _lock:
        try:
            st = _load()
            model = st["model"]
            if remove_bg:
                img = remove_background(raw, st["rembg"])
                img = resize_foreground(img, 0.85)
                arr = np.array(img).astype(np.float32) / 255.0
                arr = arr[:, :, :3] * arr[:, :, 3:4] + (1 - arr[:, :, 3:4]) * 0.5
                img = Image.fromarray((arr * 255.0).astype(np.uint8))
            else:
                img = raw.convert("RGB")

            # Bellek yetmezse otomatik olarak daha hafif ayarla yeniden dene
            attempts = [(res, CHUNK)]
            if res > 128:
                attempts.append((128, CHUNK))
            attempts.append((96, 1024))
            mesh = None
            for r, c in attempts:
                try:
                    mesh = _run(model, img, r, c)
                    break
                except RuntimeError as e:
                    if not _is_oom(e):
                        raise
                    if device.startswith("cuda"):
                        torch.cuda.empty_cache()
            if mesh is None:
                raise HTTPException(
                    507,
                    "Ekran kartı belleği yetmedi. TSR_DEVICE=cpu ile (yavaş) "
                    "ya da bir API servisiyle deneyin.",
                )
            mesh = meshfix.process(mesh, SMOOTH if smooth < 0 else smooth)
            glb = mesh.export(file_type="glb")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(500, f"Üretim hatası: {e}")
    return Response(glb, media_type="model/gltf-binary")


# API rotalarından SONRA bağla
_static = next((d for d in (os.path.join(HERE, "..", "docs"), os.path.join(HERE, "static"))
                if os.path.isfile(os.path.join(d, "index.html"))), None)
if _static:
    app.mount("/", StaticFiles(directory=_static, html=True), name="static")
