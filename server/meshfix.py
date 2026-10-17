"""TripoSR çıktısını temizleyen küçük yardımcılar (yalnızca numpy + trimesh).

- orient:  TripoSR'nin Z-yukarı çıktısını glTF'nin Y-yukarı düzenine çevirir
           (gradio_app.py'deki to_gradio_3d_orientation ile aynı dönüşüm).
- clean:   ana gövdeden çok küçük kopuk parçaları (yüzen kırıntılar) atar.
- smooth:  Taubin yumuşatma; hacmi küçültmeden marching-cubes basamaklarını giderir.
"""
import numpy as np
import trimesh


def orient(mesh):
    mesh.apply_transform(trimesh.transformations.rotation_matrix(-np.pi / 2, [1, 0, 0]))
    mesh.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [0, 1, 0]))
    return mesh


def clean(mesh, min_frac=0.03):
    """En büyük parçanın yüz sayısının min_frac katından küçük parçaları atar."""
    try:
        comps = mesh.split(only_watertight=False)
    except Exception:
        return mesh
    if len(comps) <= 1:
        return mesh
    biggest = max(len(c.faces) for c in comps)
    keep = [c for c in comps if len(c.faces) >= biggest * min_frac]
    return keep[0] if len(keep) == 1 else trimesh.util.concatenate(keep)


def smooth(mesh, iters=10):
    if iters > 0:
        try:
            trimesh.smoothing.filter_taubin(mesh, lamb=0.5, nu=0.53, iterations=int(iters))
        except Exception:
            pass
    return mesh


def outward(mesh):
    """Hacim eksiyse yüzleri ters çevir (içi dışı bozuk model)."""
    try:
        if mesh.is_watertight and mesh.volume < 0:
            mesh.invert()
    except Exception:
        pass
    return mesh


def process(mesh, smooth_iters=10):
    mesh = clean(mesh)
    mesh = smooth(mesh, smooth_iters)
    mesh = outward(mesh)
    return orient(mesh)
