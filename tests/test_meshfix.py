import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'server'))
import numpy as np, trimesh, meshfix
from skimage.measure import marching_cubes
# gerçekçi: marching cubes ile silindir (Z yukarı) + kopuk küçük top
n=64; ax=np.linspace(-1,1,n); X,Y,Z=np.meshgrid(ax,ax,ax,indexing='ij')
r=np.sqrt(X**2+Y**2)
vol=np.minimum(0.5-r, 0.7-np.abs(Z))           # silindir: yarıçap .5, yükseklik 1.4
ball=0.08-np.sqrt((X-.8)**2+(Y-.8)**2+(Z-.8)**2)
vol=np.maximum(vol,ball)
v,f,_,_=marching_cubes(vol,0.0,spacing=(2/(n-1),)*3)
m=trimesh.Trimesh(v,f)
m.visual.vertex_colors=np.tile([200,100,50,255],(len(v),1))
nf=len(m.faces)
out=meshfix.process(m.copy(),10)
print('faces',nf,'->',len(out.faces)); assert len(out.faces)<nf, 'kırıntı atılmadı'
ext=out.bounds[1]-out.bounds[0]; print('extents',ext)
assert abs(ext[1]-1.4)<0.05, 'yön yanlış (yükseklik Y olmalı)'
assert abs(ext[0]-1.0)<0.05
cyl_vol=np.pi*0.25*1.4
assert abs(abs(out.volume)-cyl_vol)/cyl_vol<0.03, ('hacim',out.volume,cyl_vol)
print('renk', out.visual.kind, out.visual.vertex_colors[0])
inv=trimesh.Trimesh(v[:,:],f[:,::-1]); 
nv=len(trimesh.Trimesh(v,f).split(only_watertight=False))
print('bileşen sayısı',nv)
big=max(trimesh.Trimesh(v,f).split(only_watertight=False),key=lambda c:len(c.faces)); big.invert()
assert meshfix.outward(big).volume>0
print('TAMAM')
