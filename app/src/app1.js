/* ================= DreamDesign – çekirdek: sahne, malzeme, parçalar, içe aktarma ================= */
const Zax=new THREE.Vector3(0,0,1);
const $=s=>document.querySelector(s),vp=$('#vp');
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const lin=h=>new THREE.Color(h).convertSRGBToLinear();
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const f=(v,d=2)=>v.toLocaleString('tr-TR',{maximumFractionDigits:d});
const D2R=Math.PI/180;
function msg(t,c,sel){const m=$(sel||'#msg');m.style.color=c||'var(--warn)';m.textContent=t||''}

/* ---- sahne ---- */
const scene=new THREE.Scene();
const persp=new THREE.PerspectiveCamera(45,1,1,60000);persp.up.set(0,0,1);
const orthoCam=new THREE.OrthographicCamera(-1,1,1,-1,-60000,60000);orthoCam.up.set(0,0,1);
let cam=persp,isOrtho=false,orthoH=600;
const ren=new THREE.WebGLRenderer({antialias:true});
ren.outputEncoding=THREE.sRGBEncoding;ren.setPixelRatio(Math.min(devicePixelRatio,2));vp.prepend(ren.domElement);
const cv=ren.domElement;cv.classList.add('main');
const ctl=new THREE.TrackballControls(cam,cv);
ctl.rotateSpeed=3;ctl.zoomSpeed=1.2;ctl.panSpeed=.8;ctl.dynamicDampingFactor=.12;ctl.keys=[-1,-1,-1];ctl.minDistance=30;ctl.maxDistance=40000;
const tc=new THREE.TransformControls(cam,cv);tc.setSize(.9);scene.add(tc);
scene.add(new THREE.HemisphereLight(0xffffff,0x556070,.35));
const dl=new THREE.DirectionalLight(0xffffff,.7);dl.position.set(500,-400,800);scene.add(dl);
scene.add(new THREE.AxesHelper(300));

function makeEnv(){
 const es=new THREE.Scene(),g=new THREE.SphereGeometry(50,32,16),pos=g.attributes.position,col=[];
 const lo=new THREE.Color(0x2b323d),hi=new THREE.Color(0xe3e9f2);
 for(let i=0;i<pos.count;i++){const t=(pos.getZ(i)/50+1)/2,c=lo.clone().lerp(hi,t);col.push(c.r,c.g,c.b)}
 g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
 es.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
 const box=(w,h,x,y,z,k)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));m.material.color.setRGB(k,k,k);m.position.set(x,y,z);m.lookAt(0,0,0);es.add(m)};
 box(34,16,0,8,40,6);box(14,30,-42,10,8,4);box(14,30,42,-14,8,3);box(44,10,0,-40,14,2);
 const pm=new THREE.PMREMGenerator(ren);scene.environment=pm.fromScene(es,.02).texture;pm.dispose()}
try{makeEnv()}catch(e){console.warn('Ortam ışığı kurulamadı',e)}

let grid;
function theme(){if(grid){scene.remove(grid);grid.geometry.dispose()}
 grid=new THREE.GridHelper(3000,30,lin(css('--g1')||'#888'),lin(css('--g2')||'#ccc'));grid.rotation.x=Math.PI/2;scene.add(grid);ren.setClearColor(css('--vp')||'#e6e9ee');
 if(typeof parts!=='undefined')parts.forEach(p=>{if(p.ghostMat)ghostColor(p)})}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{theme();skDraw&&skDraw()});

/* ---- malzemeler ---- */
const MATS={
 'Alüminyum':{d:2.70,c:'#c9ced6',m:1,r:.32},
 'Çelik':{d:7.85,c:'#8c929b',m:1,r:.38},
 'Karbon fiber':{d:1.60,c:'#26282d',m:.4,r:.4,carbon:1},
 'Titanyum':{d:4.51,c:'#9a968f',m:1,r:.45},
 'ABS plastik':{d:1.05,c:'#dfe3e8',m:0,r:.55,tint:1}};
let carbonTex=null;
function carbon(){if(carbonTex)return carbonTex;
 const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
 for(let i=0;i<8;i++)for(let j=0;j<8;j++){const on=((i+j)>>1)%2===0,v=on?64:24;
  g.fillStyle=`rgb(${v},${v},${v+5})`;g.fillRect(i*16,j*16,16,16);
  g.strokeStyle=`rgba(255,255,255,${on?.12:.05})`;g.lineWidth=1;
  for(let k=0;k<16;k+=3){g.beginPath();if(on){g.moveTo(i*16,j*16+k);g.lineTo(i*16+16,j*16+k)}else{g.moveTo(i*16+k,j*16);g.lineTo(i*16+k,j*16+16)}g.stroke()}}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(10,10);t.anisotropy=4;t.encoding=THREE.sRGBEncoding;carbonTex=t;return t}
function makeMat(p){const L=MATS[p.mat],vc=p.useVC&&p.hasVC;
 const o={color:lin(L.tint?p.color:L.c),metalness:L.m,roughness:L.r,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1};
 if(vc){o.vertexColors=true;o.color=new THREE.Color(1,1,1);o.metalness=0;o.roughness=.6}
 else if(L.carbon){try{const t=carbon();o.color=new THREE.Color(1,1,1);o.map=t;o.bumpMap=t;o.bumpScale=.8;o.clearcoat=.8;o.clearcoatRoughness=.15}catch(e){}}
 return new THREE.MeshPhysicalMaterial(o)}

/* ---- parçalar ---- */
const geos={box:()=>new THREE.BoxGeometry(1,1,1,12,12,12),
 cyl:()=>new THREE.CylinderGeometry(.5,.5,1,48,16).rotateX(Math.PI/2),
 sph:()=>new THREE.SphereGeometry(.5,48,32),
 cone:()=>new THREE.ConeGeometry(.5,1,48,12).rotateX(Math.PI/2)};
const NAMES={box:'Kutu',cyl:'Silindir',sph:'Küre',cone:'Koni'};
const COLS=['#4f8cff','#ff7a59','#3ecf8e','#f5c542','#b07cff','#4ed1d6'];
const parts=[];let sel=null,uid=1,disp='solid',mode='sec',spin=false;
const undo=[];

function apply(p){const m=p.mesh;m.scale.set(p.size[0]/p.base[0],p.size[1]/p.base[1],p.size[2]/p.base[2]);
 m.position.set(p.pos[0],p.pos[1],p.pos[2]);m.rotation.set(p.rot[0]*D2R,p.rot[1]*D2R,p.rot[2]*D2R);m.updateMatrix();m.updateMatrixWorld(true)}
function worldMinZ(p){const m=p.mesh;apply(p);const P=m.geometry.attributes.position.array,e=m.matrixWorld.elements;let mn=Infinity;
 for(let i=0;i<P.length;i+=3){const z=e[2]*P[i]+e[6]*P[i+1]+e[10]*P[i+2]+e[14];if(z<mn)mn=z}return mn}
function sit(p){const mn=worldMinZ(p);if(isFinite(mn)){p.pos[2]-=mn;apply(p)}}
function metrics(p){if(p.analytic){p.V0=p.analytic.V0;p.Cv=p.analytic.Cv.slice();return}
 const g=p.mesh.geometry,r=triMetrics(g.attributes.position.array,g.index.array);p.V0=r.V;p.Cv=r.C}
function ghostColor(p){const c=new THREE.Color(css('--vp')||'#e6e9ee');p.ghostMat.color.copy(c.convertSRGBToLinear())}
function register(p,geo){p.solidMat=makeMat(p);p.wireMat=new THREE.MeshBasicMaterial({wireframe:true,color:0xffffff});
 p.ghostMat=new THREE.MeshBasicMaterial({color:0xffffff,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1,side:THREE.DoubleSide});ghostColor(p);
 p.mesh=new THREE.Mesh(geo,p.solidMat);scene.add(p.mesh);parts.push(p)}
function baseOpts(extra){return Object.assign({id:uid++,mat:'Alüminyum',lock:false,ground:true,fill:'solid',wall:2,useVC:false,hasVC:false,vis:true,rot:[0,0,0],mid:[0,0,0],base:[1,1,1],topo:null,analytic:null,edge:null,ov:null,gv:0,uvk:0},extra)}

/* ---- görünüm biçimleri ---- */
const OVKEY=p=>disp+'|'+p.gv+'|'+$('#ctax').value+'|'+$('#ctstep').value+'|'+(p===sel?1:0);
function clearOverlay(p){if(p.ov){p.mesh.remove(p.ov);p.ov.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&o.material.dispose)o.material.dispose()});p.ov=null;p.ovKey=''}p.sil=null}
/* kenar bilgisi: iki yüzlü kenarlar için yüz normalleri. Keskin kenarlar sabit çizilir, geri kalanlar siluet adayıdır. */
function edgeInfo(p){if(p.ei&&p.ei.gv===p.gv)return p.ei;
 const g=p.mesh.geometry,P=g.attributes.position.array,I=g.index.array;g.computeBoundingBox();
 const diag=g.boundingBox.getSize(new THREE.Vector3()).length(),topo=buildTopo(P,I,diag),W=topo.W,wid=topo.wid,map=new Map(),A=[],B=[],N1=[],N2=[],H=[];
 for(let t=0;t<I.length;t+=3){const a=I[t]*3,b=I[t+1]*3,c=I[t+2]*3,ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2],vx=P[c]-P[a],vy=P[c+1]-P[a+1],vz=P[c+2]-P[a+2];
  let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz);if(l<1e-20)continue;nx/=l;ny/=l;nz/=l;
  for(let e=0;e<3;e++){const u=I[t+e],v=I[t+(e+1)%3],wu=wid[u],wv=wid[v];if(wu===wv)continue;
   const key=Math.min(wu,wv)*W+Math.max(wu,wv),k=map.get(key);
   if(k===undefined){map.set(key,A.length);A.push(u);B.push(v);N1.push(nx,ny,nz);N2.push(0,0,0);H.push(0)}
   else{N2[3*k]=nx;N2[3*k+1]=ny;N2[3*k+2]=nz;H[k]=1}}}
 const cosT=Math.cos(35*D2R),crease=[],cand=[];
 for(let k=0;k<A.length;k++){const d=N1[3*k]*N2[3*k]+N1[3*k+1]*N2[3*k+1]+N1[3*k+2]*N2[3*k+2];(!H[k]||d<cosT?crease:cand).push(k)}
 const pos=(k,arr)=>{const a=A[k]*3,b=B[k]*3;arr.push(P[a],P[a+1],P[a+2],P[b],P[b+1],P[b+2])},cr=[];crease.forEach(k=>pos(k,cr));
 const cp=new Float32Array(cand.length*6),cn1=new Float32Array(cand.length*3),cn2=new Float32Array(cand.length*3);
 cand.forEach((k,i)=>{const a=A[k]*3,b=B[k]*3;cp.set([P[a],P[a+1],P[a+2],P[b],P[b+1],P[b+2]],6*i);cn1.set([N1[3*k],N1[3*k+1],N1[3*k+2]],3*i);cn2.set([N2[3*k],N2[3*k+1],N2[3*k+2]],3*i)});
 return p.ei={gv:p.gv,crease:Float32Array.from(cr),cp,cn1,cn2,n:cand.length}}
function updSilhouette(p){const s=p.sil;if(!s||!p.vis)return;cam.updateMatrixWorld();p.mesh.updateMatrixWorld();
 const ce=cam.matrixWorld.elements,me=p.mesh.matrixWorld.elements;let same=s.last.length>0;
 for(let i=0;i<16&&same;i++)if(s.last[i]!==ce[i]||s.last[16+i]!==me[i])same=false;
 if(same&&!s.dirty)return;s.dirty=false;for(let i=0;i<16;i++){s.last[i]=ce[i];s.last[16+i]=me[i]}
 const inv=new THREE.Matrix4().copy(p.mesh.matrixWorld).invert(),e=s.ei,out=s.attr.array,cap=out.length/6;let n=0;
 let cx,cy,cz,dx,dy,dz;
 if(isOrtho){const d=cam.getWorldDirection(new THREE.Vector3()).transformDirection(inv);dx=-d.x;dy=-d.y;dz=-d.z}
 else{const c=cam.position.clone().applyMatrix4(inv);cx=c.x;cy=c.y;cz=c.z}
 for(let i=0;i<e.n&&n<cap;i++){const o=6*i;let vx,vy,vz;
  if(isOrtho){vx=dx;vy=dy;vz=dz}else{vx=cx-e.cp[o];vy=cy-e.cp[o+1];vz=cz-e.cp[o+2]}
  const s1=e.cn1[3*i]*vx+e.cn1[3*i+1]*vy+e.cn1[3*i+2]*vz,s2=e.cn2[3*i]*vx+e.cn2[3*i+1]*vy+e.cn2[3*i+2]*vz;
  if(s1*s2<0){for(let k=0;k<6;k++)out[6*n+k]=e.cp[o+k];n++}}
 s.attr.needsUpdate=true;s.geo.setDrawRange(0,2*n)}
function buildOverlay(p){const key=OVKEY(p);if(p.ov&&p.ovKey===key)return;clearOverlay(p);
 const g=p.mesh.geometry,P=g.attributes.position.array,I=g.index.array,grp=new THREE.Group(),
  ink=lin(p===sel?css('--acc')||'#1f6feb':css('--ink')||'#1a2230');
 const lm=new THREE.LineBasicMaterial({color:ink});
 if(disp==='outline'){const ei=edgeInfo(p),cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.BufferAttribute(ei.crease,3));grp.add(new THREE.LineSegments(cg,lm));
  const sg=new THREE.BufferGeometry(),cap=Math.min(Math.max(ei.n,1),60000),attr=new THREE.BufferAttribute(new Float32Array(cap*6),3);attr.setUsage(THREE.DynamicDrawUsage);sg.setAttribute('position',attr);sg.setDrawRange(0,0);
  const sl=new THREE.LineSegments(sg,lm);sl.frustumCulled=false;grp.add(sl);p.sil={ei,attr,geo:sg,last:new Float64Array(32),dirty:true}}
 else{const ax=+$('#ctax').value,step=Math.max(2,+$('#ctstep').value||25),sc=p.size[ax]/p.base[ax];
  g.computeBoundingBox();const lo=g.boundingBox.min.getComponent(ax),hi=g.boundingBox.max.getComponent(ax),sl=Math.max(step/sc,(hi-lo)/150);
  if(disp==='contour'){const seg=[];for(let v=lo+sl/2;v<hi;v+=sl)sliceSegments(P,I,ax,v,seg);
   const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute(seg,3));grp.add(new THREE.LineSegments(gg,lm))}
  else{const n=Math.max(4,Math.min(80,Math.round((hi-lo)*sc/step))),pts=centerLine(P,I,ax,n),gg=new THREE.BufferGeometry(),arr=[];
   for(let i=0;i+1<pts.length;i++)arr.push(...pts[i],...pts[i+1]);
   gg.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));
   const l=new THREE.LineSegments(gg,new THREE.LineBasicMaterial({color:lin(0xff7a1a),depthTest:false}));l.renderOrder=8;grp.add(l);
   const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(pts.flat(),3));
   const pp=new THREE.Points(pg,new THREE.PointsMaterial({color:lin(0xff7a1a),size:7,sizeAttenuation:false,depthTest:false}));pp.renderOrder=9;grp.add(pp)}}
 p.ov=grp;p.ovKey=key;p.mesh.add(grp);if(p.sil)updSilhouette(p)}
function setDisplay(p){const m=p.mesh;
 const dsp=((typeof cage!=='undefined'&&cage&&cage.p===p)||(typeof grab!=='undefined'&&grab&&grab.p===p))&&disp!=='tri'?'solid':disp;
 if(dsp==='solid'){clearOverlay(p);m.material=p.solidMat;if(p.edge)p.edge.visible=true}
 else if(dsp==='tri'){clearOverlay(p);m.material=p.wireMat;if(p.edge)p.edge.visible=false}
 else{m.material=p.ghostMat;p.ghostMat.transparent=disp==='center';p.ghostMat.opacity=disp==='center'?.22:1;p.ghostMat.depthWrite=disp!=='center';p.ghostMat.needsUpdate=true;
  if(p.edge)p.edge.visible=false;try{buildOverlay(p)}catch(e){console.warn(e)}}
 m.visible=p.vis;
 if(p.ov)p.ov.visible=p.vis}
function look(){parts.forEach(p=>{const s=p===sel;p.solidMat.emissive.setHex(s?0x10204a:0);
 const w=new THREE.Color(p.color);if(s)w.lerp(new THREE.Color(0xffffff),.55);p.wireMat.color.copy(w.convertSRGBToLinear());setDisplay(p)})}

function add(type,size,pos,opts){
 const geo=geos[type](),s=size||[200,200,200],n=parts.length;
 const p=baseOpts({type,size:s.slice(),pos:pos?pos.slice():[(n%5)*260-520,300,0]});
 p.name=NAMES[type]+' '+p.id;p.color=COLS[p.id%COLS.length];
 p.analytic={V0:{box:1,cyl:Math.PI/4,sph:Math.PI/6,cone:Math.PI/12}[type],Cv:type==='cone'?[0,0,-.25]:[0,0,0]};
 Object.assign(p,opts||{});
 register(p,geo);
 p.edge=new THREE.LineSegments(new THREE.EdgesGeometry(geo,25),new THREE.LineBasicMaterial({color:lin(0x0b0f17),transparent:true,opacity:.6}));p.mesh.add(p.edge);
 metrics(p);apply(p);if(p.ground)sit(p);
 p.orig=snap(p);select(p);return p}

/* ---- içe aktarma ---- */
/* Tüm mesh'leri dünya matrisiyle tek diziye düz (fixUp: glTF Y-yukarı → Z-yukarı) */
function flatten(obj,fixUp){
 obj.updateMatrixWorld(true);
 const P=[],C=[],I=[];let off=0,anyC=false,any=false;
 obj.traverse(o=>{if(!o.isMesh||!o.geometry||!o.geometry.attributes.position)return;any=true;
  const g=o.geometry,pa=g.attributes.position,ca=g.attributes.color,n=pa.count,m=o.matrixWorld,v=new THREE.Vector3();
  const sc=ca&&ca.normalized?(ca.array instanceof Uint8Array?255:(ca.array instanceof Uint16Array?65535:1)):1;
  if(ca)anyC=true;
  for(let i=0;i<n;i++){v.fromBufferAttribute(pa,i).applyMatrix4(m);
   if(fixUp)P.push(v.x,-v.z,v.y);else P.push(v.x,v.y,v.z);
   if(ca)C.push(ca.getX(i)/sc,ca.getY(i)/sc,ca.getZ(i)/sc);else C.push(.8,.8,.8)}
  const ix=g.index,cnt=ix?ix.count:n;for(let i=0;i<cnt;i++)I.push(off+(ix?ix.getX(i):i));off+=n});
 if(!any)throw new Error('Dosyada yüzey (mesh) bulunamadı');
 return{P:Float32Array.from(P),C:anyC?Float32Array.from(C):null,I:Uint32Array.from(I),hasVC:anyC}}
function makeUV(geo,k){const pa=geo.attributes.position,na=geo.attributes.normal,n=pa.count,uv=new Float32Array(n*2);
 for(let i=0;i<n;i++){const x=pa.getX(i),y=pa.getY(i),z=pa.getZ(i),ax=Math.abs(na.getX(i)),ay=Math.abs(na.getY(i)),az=Math.abs(na.getZ(i));
  let u,v;if(az>=ax&&az>=ay){u=x;v=y}else if(ax>=ay){u=y;v=z}else{u=x;v=z}uv[2*i]=u*k;uv[2*i+1]=v*k}
 geo.setAttribute('uv',new THREE.BufferAttribute(uv,2))}
function geoFrom(P,C,I){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(P,3));
 if(C)geo.setAttribute('color',new THREE.BufferAttribute(C,3));geo.setIndex(new THREE.BufferAttribute(I,1));geo.computeVertexNormals();return geo}
function regUV(p){const g=p.mesh.geometry;g.computeBoundingBox();const s=g.boundingBox.getSize(new THREE.Vector3()),mx=Math.max(s.x,s.y,s.z)||1;
 if(!p.uvk)p.uvk=1/mx;makeUV(g,p.uvk)}
/* Ham diziden (merkezlenmemiş) model parçası: X–Y ortalı, taban Z=0, en uzun kenar 1000 mm */
function addModel(obj,name,fixUp,opt){opt=opt||{};
 const fl=flatten(obj,fixUp);let{P,C,I}=fl;const notes=[];
 const d=dropSmall(P,C,I,.03);if(d.dropped){P=d.P;C=d.C;I=d.I;notes.push(d.dropped+' kopuk kırıntı silindi')}
 if(fixWinding(P,I))notes.push('yüz yönü düzeltildi');
 const geo=geoFrom(P,C,I);geo.computeBoundingBox();const bb=geo.boundingBox,c=bb.getCenter(new THREE.Vector3()),s=bb.getSize(new THREE.Vector3());
 geo.translate(-c.x,-c.y,-c.z);geo.computeBoundingBox();geo.computeBoundingSphere();
 const mx=Math.max(s.x,s.y,s.z)||1;
 const base=[s.x||1,s.y||1,s.z||1],k=1000/mx;
 const p=baseOpts({type:'model',name:String(name).slice(0,28),color:'#6fa8ff',hasVC:fl.hasVC,base,size:base.map(v=>v*k),pos:[0,0,0],lock:true,uvk:1/mx});
 register(p,geo);makeUV(geo,p.uvk);metrics(p);apply(p);sit(p);p.orig=snap(p);select(p);view('iso');
 if(notes.length)msg(notes.join(', ')+'.','var(--mut)');
 return p}
/* Dünya ya da yerel dizilerden türetilmiş parça. xf: devralınan dönüşüm (yoksa dünya koordinatı kabul edilir) */
function derive(P,C,I,name,src,xf){
 const geo=geoFrom(P,C,I),sc=xf?xf.scale:[1,1,1];
 const p=baseOpts({type:'model',name:String(name).slice(0,28),color:src?src.color:'#6fa8ff',mat:src?src.mat:'Alüminyum',fill:src?src.fill:'solid',wall:src?src.wall:2,
  hasVC:!!C,useVC:!!C&&!!(src&&src.useVC),lock:src?src.lock:true,ground:false,base:[1,1,1],size:sc.slice(),pos:xf?xf.pos.slice():[0,0,0],rot:xf?xf.rot.slice():[0,0,0]});
 register(p,geo);apply(p);commitShape(p);regUV(p);p.orig=snap(p);return p}
function xformOf(p){return{pos:p.pos.slice(),rot:p.rot.slice(),scale:p.size.map((v,i)=>v/p.base[i])}}
function localArrays(p){const g=p.mesh.geometry,ca=g.attributes.color;return{P:Float32Array.from(g.attributes.position.array),C:ca?Float32Array.from(ca.array):null,I:Uint32Array.from(g.index.array)}}
function worldArrays(p,withC){apply(p);const g=p.mesh.geometry,P=g.attributes.position.array,e=p.mesh.matrixWorld.elements,out=new Float32Array(P.length);
 for(let i=0;i<P.length;i+=3){const x=P[i],y=P[i+1],z=P[i+2];out[i]=e[0]*x+e[4]*y+e[8]*z+e[12];out[i+1]=e[1]*x+e[5]*y+e[9]*z+e[13];out[i+2]=e[2]*x+e[6]*y+e[10]*z+e[14]}
 const ca=g.attributes.color;return{P:out,C:ca?Float32Array.from(ca.array):null,I:Uint32Array.from(g.index.array)}}

/* ---- anlık görüntü (geri al / sıfırla) ---- */
function snap(p){const g=p.mesh.geometry,ca=g.attributes.color;
 return{p,pos:Float32Array.from(g.attributes.position.array),col:ca?Float32Array.from(ca.array):null,idx:Uint32Array.from(g.index.array),base:p.base.slice(),size:p.size.slice(),position:p.pos.slice(),mid:p.mid.slice()}}
function restore(s){const p=s.p;if(!parts.includes(p))return;const g=p.mesh.geometry;
 const same=g.attributes.position.array.length===s.pos.length&&g.index.array.length===s.idx.length;
 if(same){g.attributes.position.array.set(s.pos);g.attributes.position.needsUpdate=true;g.index.array.set(s.idx);g.index.needsUpdate=true;
  if(s.col&&g.attributes.color){g.attributes.color.array.set(s.col);g.attributes.color.needsUpdate=true}}
 else{g.setAttribute('position',new THREE.BufferAttribute(Float32Array.from(s.pos),3));g.setIndex(new THREE.BufferAttribute(Uint32Array.from(s.idx),1));
  if(s.col)g.setAttribute('color',new THREE.BufferAttribute(Float32Array.from(s.col),3));else g.deleteAttribute('color')}
 g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();if(g.attributes.uv)regUV(p);
 p.base=s.base.slice();p.size=s.size.slice();p.pos=s.position.slice();p.mid=s.mid.slice();p.topo=null;p.analytic=null;p.gv++;
 if(p.edge){p.mesh.remove(p.edge);p.edge=null}
 metrics(p);apply(p);refresh();look()}
function pushUndo(p){undo.push(snap(p));if(undo.length>12)undo.shift()}
function doUndo(){if(typeof cage!=='undefined'&&cage&&cageUndo())return;histUndo()}
function commitShape(p){const g=p.mesh.geometry;g.computeBoundingBox();const bb=g.boundingBox,c=bb.getCenter(new THREE.Vector3()),s=bb.getSize(new THREE.Vector3());
 const sc=p.size.map((v,i)=>v/p.base[i]);apply(p);const wc=c.clone().applyMatrix4(p.mesh.matrix);
 g.translate(-c.x,-c.y,-c.z);g.computeBoundingBox();g.computeBoundingSphere();g.computeVertexNormals();
 p.base=[s.x||1,s.y||1,s.z||1];p.size=p.base.map((v,i)=>v*sc[i]);p.pos=[wc.x,wc.y,wc.z];p.mid=[p.mid[0]-c.x,p.mid[1]-c.y,p.mid[2]-c.z];
 p.analytic=null;p.topo=null;p.gv++;metrics(p);apply(p);if(p.ground)sit(p)}
/* geometriyi kalıcı 90° çevir: ölçü, ölçek ve simetri merkezi eksenlerle birlikte yer değiştirir */
function bakeTurn(p,ax){const g=p.mesh.geometry;
 if(p.edge){p.mesh.remove(p.edge);p.edge.geometry.dispose();p.edge=null}
 pushUndo(p);
 if(ax===0)g.rotateX(Math.PI/2);else if(ax===1)g.rotateY(Math.PI/2);else g.rotateZ(Math.PI/2);
 const sc=p.size.map((v,i)=>v/p.base[i]),perm=[[0,2,1],[2,1,0],[1,0,2]][ax];
 g.computeBoundingBox();g.computeBoundingSphere();g.computeVertexNormals();
 const s=g.boundingBox.getSize(new THREE.Vector3());p.base=[s.x||1,s.y||1,s.z||1];
 const nsc=perm.map(i=>sc[i]);p.size=p.base.map((v,i)=>v*nsc[i]);p.mid=perm.map(i=>p.mid[i]);
 p.analytic=null;p.topo=null;p.gv++;metrics(p);apply(p);if(p.ground)sit(p);refresh();look()}
/* Konumlandırma: dünyada X–Y'de seçilen referansı orijine, tabanı Z=0'a getir. how: bbox | com | base */
function recentre(p,how){apply(p);const w=worldArrays(p),P=w.P;let mn=[1e30,1e30,1e30],mx=[-1e30,-1e30,-1e30];
 for(let i=0;i<P.length;i+=3)for(let k=0;k<3;k++){if(P[i+k]<mn[k])mn[k]=P[i+k];if(P[i+k]>mx[k])mx[k]=P[i+k]}
 let rx=(mn[0]+mx[0])/2,ry=(mn[1]+mx[1])/2;
 if(how==='com'){const m=massInfo(p);rx=m.com.x;ry=m.com.y}
 else if(how==='base'){const lim=mn[2]+(mx[2]-mn[2])*.04;let sx=0,sy=0,n=0;for(let i=0;i<P.length;i+=3)if(P[i+2]<=lim){sx+=P[i];sy+=P[i+1];n++}if(n){rx=sx/n;ry=sy/n}}
 p.pos[0]-=rx;p.pos[1]-=ry;p.pos[2]-=mn[2];p.ground=true;apply(p);refresh()}

/* ---- ağırlık ---- */
function massInfo(p){const rho=MATS[p.mat].d,sc=p.mesh.scale,vol=p.V0*sc.x*sc.y*sc.z,solid=vol/1e6*rho;
 let mass=solid,loc=[p.Cv[0]*sc.x,p.Cv[1]*sc.y,p.Cv[2]*sc.z],A=0;
 if(p.fill==='shell'){const g=p.mesh.geometry,r=areaStats(g.attributes.position.array,g.index.array,[sc.x,sc.y,sc.z]);A=r.A;
  mass=Math.min(solid,A*p.wall/1e6*rho);loc=r.C}
 const w=new THREE.Vector3(loc[0],loc[1],loc[2]).applyQuaternion(p.mesh.quaternion).add(p.mesh.position);
 return{vol,solid,mass,A,com:w}}
const comMarker=new THREE.Group();
{const m=new THREE.MeshBasicMaterial({color:lin(0xff7a1a),depthTest:false,transparent:true,opacity:.95});
 comMarker.add(new THREE.Mesh(new THREE.SphereGeometry(9,16,12),m));
 [[40,2,2],[2,40,2],[2,2,40]].forEach(d=>comMarker.add(new THREE.Mesh(new THREE.BoxGeometry(...d),m)));
 comMarker.renderOrder=10;comMarker.children.forEach(c=>c.renderOrder=10);comMarker.visible=false;scene.add(comMarker)}
let totalMass=0;
