"""torchmcubes yerine geçen küçük uyumluluk dosyası (scikit-image kullanır).

TripoSR 'from torchmcubes import marching_cubes' satırını çalıştırınca bu dosya
devreye girer; böylece Windows'ta CUDA Toolkit / derleme gerekmez.
Marching cubes CPU'da çalışır, 128-256 çözünürlükte hızlıdır.
"""
import numpy as np
import torch
from skimage.measure import marching_cubes as _sk_marching_cubes


def marching_cubes(vol, thresh):
    v = vol.detach().float().cpu().numpy()
    verts, faces, _normals, _values = _sk_marching_cubes(v, level=float(thresh))
    # TripoSR, gerçek torchmcubes'un (z, y, x) sırasına göre köşeleri sonradan
    # [2, 1, 0] ile tekrar çeviriyor. scikit-image (x, y, z) verdiği için burada
    # ters çeviriyoruz; yoksa model X/Z ekseninde yan yatık ve aynalı çıkar.
    verts = verts[:, ::-1]
    return (
        torch.from_numpy(np.ascontiguousarray(verts)).float(),
        torch.from_numpy(np.ascontiguousarray(faces).astype(np.int64)),
    )
