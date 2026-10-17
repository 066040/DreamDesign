import numpy as np, trimesh
from skimage.measure import marching_cubes
class _R:
    def __init__(s): s.calls=[]
    def set_chunk_size(s,c): pass
    def query_triplane(s,decoder,pos,tri):
        s.calls.append(len(pos)); return {'density_act':pos[:,0]}
class TSR:
    @classmethod
    def from_pretrained(cls,*a,**k):
        m=cls(); m.renderer=_R(); return m
    def to(self,d): return self
    def __call__(self,imgs,device=None): return ['codes']
    def extract_mesh(self,codes,vc,resolution=128):
        # Z-yukarı silindir, yükseklik 1.4 (gerçek TripoSR ham çıktısı gibi), + kırıntı; chunk sarmalayıcı çağrılsın
        n=resolution; ax=np.linspace(-1,1,n); X,Y,Z=np.meshgrid(ax,ax,ax,indexing='ij')
        pos=np.stack([X.ravel(),Y.ravel(),Z.ravel()],1)
        self.renderer.query_triplane(None,pos,None)
        vol=np.minimum(0.5-np.sqrt(X**2+Y**2),0.7-np.abs(Z)); vol=np.maximum(vol,0.06-np.sqrt((X-.8)**2+(Y-.8)**2+(Z-.8)**2))
        v,f,_,_=marching_cubes(vol,0.0,spacing=(2/(n-1),)*3)
        m=trimesh.Trimesh(v-1.0,f,process=False); m.visual.vertex_colors=np.tile([180,120,90,255],(len(v),1)); return [m]
