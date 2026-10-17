import io, os, sys, numpy as np
HERE=os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0,os.path.join(HERE,'..','..','server'))
sys.path.insert(0,HERE)   # stub torch/tsr/rembg first
from fastapi.testclient import TestClient
from PIL import Image
import server, trimesh
c=TestClient(server.app)
print(c.get('/api/health').json())
buf=io.BytesIO(); Image.new('RGB',(64,64),'white').save(buf,'PNG')
server.QCHUNK=5000
r=c.post('/api/generate?mc_resolution=96&smooth=10',files={'image':('x.png',buf.getvalue(),'image/png')})
print(r.status_code, len(r.content))
assert r.status_code==200, r.text
m=trimesh.load(io.BytesIO(r.content),file_type='glb',force='mesh')
ext=m.bounds[1]-m.bounds[0]; print('extents',ext, 'faces',len(m.faces))
assert abs(ext[1]-1.4)<0.06 and abs(ext[0]-1.0)<0.06, 'yön (glTF Y yukarı) yanlış'
assert m.volume>0
calls=server._state['model'].renderer.calls; print('sorgu çağrıları',calls[:3])
r2=c.post('/api/generate?mc_resolution=32',files={'image':('x.png',buf.getvalue(),'image/png')}); print('küçük res',r2.status_code,r2.text[:80])
r3=c.post('/api/generate',files={'image':('x.txt',b'abc','text/plain')}); print('bozuk',r3.status_code,r3.text[:80])
o=c.options('/api/generate',headers={'Origin':'https://066040.github.io','Access-Control-Request-Method':'POST','Access-Control-Request-Private-Network':'true'})
assert o.status_code==204 and o.headers['access-control-allow-origin']=='https://066040.github.io' and o.headers['access-control-allow-private-network']=='true', o.headers
o2=c.get('/api/health',headers={'Origin':'https://evil.example'}); assert 'access-control-allow-origin' not in o2.headers
print('CORS tamam')
print('TAMAM')
