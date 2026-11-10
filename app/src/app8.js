/* ================= Kenar / köşe çek ve bük, delik aç / doldur, katı işlemler, açı ölçümü, yuvarlak kutu ================= */

/* ---------- kenar özellikleri (parça başına önbellekli) ---------- */
function featOf(p){if(p.feat&&p.feat.gv===p.gv)return p.feat;const g=p.mesh.geometry;g.computeBoundingBox();
 const F=features(g.attributes.position.array,g.index.array,g.boundingBox.getSize(new THREE.Vector3()).length(),30);F.gv=p.gv;
 F.nseg=F.chains.reduce((s,c)=>s+c.ws.length-1,0);return p.feat=F}
const v3=a=>new THREE.Vector3(a[0],a[1],a[2]);
function nWorld(p,n){return v3(n).applyMatrix3(new THREE.Matrix3().getNormalMatrix(p.mesh.matrixWorld)).normalize()}
function axisName(v){const a=[v.x,v.y,v.z],i=a.map(Math.abs).indexOf(Math.max(...a.map(Math.abs)));return Math.abs(a[i])>.985?(a[i]>0?'+':'−')+'XYZ'[i]:'eğik'}
/* seçimi konuma göre tut: ağ değişince indeks değişir, yerel nokta değişmez */
function chainMid(F,c){return F.pos(c.ws[Math.floor((c.ws.length-1)/2)])}
function eResolve(p,kind,pt){const F=featOf(p),d=(a)=>Math.hypot(a[0]-pt[0],a[1]-pt[1],a[2]-pt[2]);let best=null,bd=Infinity;
 if(kind==='corner'){F.corners.forEach((c,i)=>{const x=d(F.pos(c.w));if(x<bd){bd=x;best={p,kind,ci:i}}})}
 else F.chains.forEach((c,i)=>{c.ws.forEach(w=>{const x=d(F.pos(w));if(x<bd){bd=x;best={p,kind,ci:i}}})});
 return best}
/* ekranda fareye en yakın köşe (14 px) ya da kenar (10 px) */
function ePickAt(e){const r=cv.getBoundingClientRect(),mx=e.clientX,my=e.clientY,hit=pickAt(e),list=[];
 if(hit)list.push(hit.p);if(sel&&sel.vis&&!list.includes(sel))list.push(sel);let best=null,bd=Infinity;
 for(const p of list){const F=featOf(p);if(F.nseg>40000)continue;p.mesh.updateMatrixWorld(true);const M=p.mesh.matrixWorld,cache=new Map();
  const S=w=>{let s=cache.get(w);if(s)return s;const v=v3(F.pos(w)).applyMatrix4(M),q=v.clone().project(cam);s={x:(q.x+1)/2*r.width+r.left,y:(1-q.y)/2*r.height+r.top,ok:q.z<1,v};cache.set(w,s);return s};
  F.corners.forEach((c,i)=>{const s=S(c.w);if(!s.ok)return;const d=Math.hypot(s.x-mx,s.y-my)-6;if(d<8&&d<bd){bd=d;best={p,kind:'corner',ci:i,point:s.v.clone()}}});
  F.chains.forEach((c,i)=>{for(let k=0;k+1<c.ws.length;k++){const A=S(c.ws[k]),B=S(c.ws[k+1]);if(!A.ok||!B.ok)continue;
   const dx=B.x-A.x,dy=B.y-A.y,L2=dx*dx+dy*dy,t=L2>1e-9?Math.max(0,Math.min(1,((mx-A.x)*dx+(my-A.y)*dy)/L2)):0,d=Math.hypot(A.x+t*dx-mx,A.y+t*dy-my);
   if(d<10&&d<bd){bd=d;best={p,kind:'edge',ci:i,point:A.v.clone().lerp(B.v,t)}}}})}
 return best}

/* ---------- vurgu (fare üstünde: turuncu, seçili: mavi) ---------- */
function hiGroup(color,size){const g=new THREE.Group(),mL=new THREE.LineBasicMaterial({color:lin(color),depthTest:false,transparent:true}),
  mP=new THREE.PointsMaterial({color:lin(color),size,sizeAttenuation:false,depthTest:false,transparent:true});
 g.line=new THREE.Line(new THREE.BufferGeometry(),mL);g.pts=new THREE.Points(new THREE.BufferGeometry(),mP);g.add(g.line,g.pts);
 g.line.renderOrder=15;g.pts.renderOrder=16;g.line.frustumCulled=g.pts.frustumCulled=false;g.visible=false;return g}
const eHi=hiGroup(0xff7a1a,7),eSelG=hiGroup(0x1f6feb,9);
function hiShow(G,pk){if(G.parent)G.parent.remove(G);if(!pk||!parts.includes(pk.p)){G.visible=false;return}
 const F=featOf(pk.p),arr=[];if(pk.kind==='corner')arr.push(...F.pos(F.corners[pk.ci].w));else F.chains[pk.ci].ws.forEach(w=>arr.push(...F.pos(w)));
 const set=(o,a)=>{o.geometry.dispose();o.geometry=new THREE.BufferGeometry();o.geometry.setAttribute('position',new THREE.Float32BufferAttribute(a,3))};
 set(G.line,pk.kind==='corner'?[]:arr);set(G.pts,arr);G.pts.material.size=pk.kind==='corner'?16:(G===eSelG?5:4);pk.p.mesh.add(G);G.visible=true}

/* ---------- kenar bilgisi (dünya ölçüsü) ---------- */
function eInfo(pk){const p=pk.p,F=featOf(p);p.mesh.updateMatrixWorld(true);const M=p.mesh.matrixWorld;
 if(pk.kind==='corner'){const c=F.corners[pk.ci];return{text:'Köşe · '+c.normals.length+' yüz',dirs:c.normals.map(n=>nWorld(p,n))}}
 const c=F.chains[pk.ci],a=v3(F.pos(c.ws[0])).applyMatrix4(M),b=v3(F.pos(c.ws[c.ws.length-1])).applyMatrix4(M);
 let len=0;for(let k=0;k+1<c.ws.length;k++)len+=v3(F.pos(c.ws[k])).applyMatrix4(M).distanceTo(v3(F.pos(c.ws[k+1])).applyMatrix4(M));
 const n1=c.n1&&nWorld(p,c.n1),n2=c.n2&&nWorld(p,c.n2),ang=n1&&n2?dihedral([n1.x,n1.y,n1.z],[n2.x,n2.y,n2.z]):null;
 const chord=a.distanceTo(b),curved=!c.closed&&len>chord*1.002;
 let t=(c.closed?'Kapalı kenar · çevre ':'Kenar · ')+f(len,1)+' mm'+(ang!=null?' · yüzler arası '+f(ang,1)+'°':'');
 if(curved){const h=sagitta(F,c,M);if(h>1e-6){const ai=arcInfo(chord,h);t+=' · eğri: yay '+f(ai.deg,1)+'°, R '+f(ai.R,1)+' mm'}}
 return{text:t,len,chord,ang,n1,n2,closed:c.closed,dirs:[n1,n2].filter(Boolean)}}
/* eğri kenarın kirişe en uzak noktası (sehim) */
function sagitta(F,c,M){const a=v3(F.pos(c.ws[0])).applyMatrix4(M),b=v3(F.pos(c.ws[c.ws.length-1])).applyMatrix4(M),e=b.clone().sub(a),L=e.length();if(L<1e-9)return 0;e.divideScalar(L);let h=0;
 c.ws.forEach(w=>{const v=v3(F.pos(w)).applyMatrix4(M).sub(a);h=Math.max(h,v.addScaledVector(e,-v.dot(e)).length())});return h}

/* ---------- çekme / bükme ---------- */
var edrag=null;let eMode='move',eSel=null,eHoverEv=null,eRaf=0;
function eReach(){return(+$('#edreach').value||100)/100}
function geoReplace(p,P,C,I){const g=p.mesh.geometry;g.deleteAttribute('normal');const hadUV=!!g.attributes.uv;g.deleteAttribute('uv');g.setAttribute('position',new THREE.BufferAttribute(P,3));if(C)g.setAttribute('color',new THREE.BufferAttribute(C,3));else g.deleteAttribute('color');
 g.setIndex(new THREE.BufferAttribute(I,1));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();if(hadUV)regUV(p);p.topo=null;p.gv++}
/* hazırlık: ağırlıklar ve yay parametresi. Bükmede kenar az bölmeliyse ağ önce sıklaştırılır (şekil değişmez). */
function ePrepare(pk){let p=pk.p,F=featOf(p);const bend=eMode==='bend'&&pk.kind==='edge'&&!F.chains[pk.ci].closed;
 if(bend){let ch=F.chains[pk.ci],guard=0;
  while(ch.segs<16&&p.mesh.geometry.index.count/3<120000&&guard++<3){const mid=chainMid(F,ch),L=localArrays(p),s=subdivide(L.P,L.C,L.I);geoReplace(p,s.P,s.C,s.I);
   F=featOf(p);pk=eResolve(p,'edge',mid);ch=F.chains[pk.ci]}}
 if(p.edge){p.mesh.remove(p.edge);p.edge.geometry.dispose();p.edge=null}
 p.analytic=null;pushUndo(p);p.mesh.updateMatrixWorld(true);
 const g=p.mesh.geometry,rest=Float32Array.from(g.attributes.position.array),M=p.mesh.matrixWorld,S={p,pk,bend,rest,inv:new THREE.Matrix3().setFromMatrix4(M).invert()};
 let ns,along=null,track;
 if(pk.kind==='corner'){const c=F.corners[pk.ci];ns=c.normals;track=F.topo.rep[c.w]}
 else{const c=F.chains[pk.ci],a=F.pos(c.ws[0]),b=F.pos(c.ws[c.ws.length-1]),e=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],L=Math.hypot(...e);
  ns=[c.n1,c.n2].filter(Boolean);track=F.topo.rep[c.ws[Math.floor((c.ws.length-1)/2)]];
  if(!c.closed&&L>1e-9){e.forEach((v,i)=>e[i]=v/L);along={a,e,L};
   const aw=v3(a).applyMatrix4(M),bw=v3(b).applyMatrix4(M);S.Lw=aw.distanceTo(bw);S.ew=bw.clone().sub(aw).normalize();S.Lloc=L;
   if(bend){S.U=new Float32Array(rest.length/3);for(let i=0;i<S.U.length;i++)S.U[i]=(rest[3*i]-a[0])*e[0]+(rest[3*i+1]-a[1])*e[1]+(rest[3*i+2]-a[2])*e[2]}}}
 if(!ns.length&&!along)ns=[[0,0,1]];
 S.W=edgeWeights(rest,ns,eReach(),along);S.track=track;return S}
/* dw: dünya yer değiştirmesi (mm). Bükmede yalnız kenara dik bileşen kullanılır, sehim en çok kirişin yarısı (yarım çember). */
function eApply(S,dw){const g=S.p.mesh.geometry,pa=g.attributes.position,P=pa.array,rest=S.rest,W=S.W;let info;
 if(!S.bend){const d=dw.clone().applyMatrix3(S.inv);
  for(let i=0;i<W.length;i++){const k=W[i];P[3*i]=rest[3*i]+d.x*k;P[3*i+1]=rest[3*i+1]+d.y*k;P[3*i+2]=rest[3*i+2]+d.z*k}
  info={type:'move',d:dw.length(),dw:dw.clone()}}
 else{const dp=dw.clone().addScaledVector(S.ew,-dw.dot(S.ew));let h=dp.length();if(h>S.Lw/2){dp.multiplyScalar(S.Lw/2/h);h=S.Lw/2}
  const d=dp.clone().applyMatrix3(S.inv),q=S.Lw/S.Lloc;
  for(let i=0;i<W.length;i++){const k=W[i]?W[i]*arcFrac(S.U[i]*q,S.Lw,h):0;P[3*i]=rest[3*i]+d.x*k;P[3*i+1]=rest[3*i+1]+d.y*k;P[3*i+2]=rest[3*i+2]+d.z*k}
  info=Object.assign({type:'bend',h},arcInfo(S.Lw,h))}
 pa.needsUpdate=true;g.computeVertexNormals();S.info=info;return info}
function eInfoText(i){return i.type==='move'?'Kaydırma '+f(i.d,1)+' mm (Δ '+f(i.dw.x,1)+' · '+f(i.dw.y,1)+' · '+f(i.dw.z,1)+')'
 :'Bükme: yay '+f(i.deg,1)+'° · R '+(isFinite(i.R)?f(i.R,1):'∞')+' mm · sehim '+f(i.h,1)+' mm · yay boyu '+f(i.len,1)+' mm'}
function eFinish(S,changed){if(!changed){undo.pop();return}const p=S.p;
 commitShape(p);refresh();look();const P=p.mesh.geometry.attributes.position.array,t=S.track;
 eSetSel(eResolve(p,S.pk.kind,[P[3*t],P[3*t+1],P[3*t+2]]))}
function eSetSel(pk){eSel=pk?{p:pk.p,kind:pk.kind,pt:pk.kind==='corner'?featOf(pk.p).pos(featOf(pk.p).corners[pk.ci].w):chainMid(featOf(pk.p),featOf(pk.p).chains[pk.ci])}:null;
 const box=$('#edsel'),dsel=$('#eddir');dsel.innerHTML='';
 if(!pk){box.textContent='Kenar seçilmedi.';hiShow(eSelG,null);return}
 const I=eInfo(pk);box.textContent=pk.p.name+' · '+I.text;hiShow(eSelG,pk);
 if(pk.kind==='edge')I.dirs.forEach((n,i)=>{[[1,'dışa'],[-1,'içe']].forEach(([s,t])=>{const o=document.createElement('option');o.value=i+','+s;o.textContent='Yüz '+(i+1)+' '+t+' ('+axisName(n.clone().multiplyScalar(s))+')';dsel.appendChild(o)})})}
function eCur(){if(!eSel||!parts.includes(eSel.p))return null;return eResolve(eSel.p,eSel.kind,eSel.pt)}
function eLock(dw){if(!$('#edaxis').checked)return dw;const a=[dw.x,dw.y,dw.z],i=a.map(Math.abs).indexOf(Math.max(...a.map(Math.abs)));const o=new THREE.Vector3();o.setComponent(i,a[i]);return o}
function eMove(e){const D=edrag;rc.setFromCamera(ndc(e),cam);const pt=rc.ray.intersectPlane(gplane,new THREE.Vector3());if(!pt)return;
 const info=eApply(D.S,eLock(pt.sub(D.start)));D.moved=true;setLabels('edge',[{pos:D.start.clone(),text:eInfoText(info),cls:'m'}]);msg(eInfoText(info),'var(--mut)','#edmsg')}
function eHover(e){const pk=ePickAt(e);eHi.pk=pk;hiShow(eHi,pk);
 if(pk)setLabels('edge',[{pos:pk.point,text:eInfo(pk).text,cls:'m'}]);else setLabels('edge',[]);
 cv.style.cursor=pk?'grab':'crosshair'}
function eTick(){eRaf=0;if(edrag&&edrag.pending){const e=edrag.pending;edrag.pending=null;eMove(e)}else if(mode==='edge'&&!edrag&&eHoverEv){const e=eHoverEv;eHoverEv=null;eHover(e)}}
const eSched=()=>{if(!eRaf)eRaf=requestAnimationFrame(eTick)||0};
function eDown(e){const pk=ePickAt(e);if(!pk)return false;if(sel!==pk.p)select(pk.p);
 const F=featOf(pk.p);if(eMode==='bend'&&pk.kind==='edge'&&F.chains[pk.ci].closed)msg('Kapalı kenar bükülemez, kaydırılır.','var(--mut)','#edmsg');
 ctl.enabled=false;const S=ePrepare(pk);eSetSel(S.pk);gplane.setFromNormalAndCoplanarPoint(cam.getWorldDirection(new THREE.Vector3()),pk.point);
 edrag={S,start:pk.point.clone(),moved:false,pending:null};hiShow(eHi,null);return true}
function eUp(){const D=edrag;edrag=null;ctl.enabled=true;setLabels('edge',[]);eFinish(D.S,D.moved);if(D.moved)msg(eInfoText(D.S.info),'var(--ok)','#edmsg')}
vp.addEventListener('pointerdown',e=>{if(e.target!==cv||e.button!==0)return;if(mode==='edge')eDown(e)},true);
addEventListener('pointermove',e=>{if(edrag){edrag.pending=e;eSched()}else if(mode==='edge'&&e.target===cv){eHoverEv=e;eSched()}});
addEventListener('pointerup',()=>{if(edrag)eUp()});
document.querySelectorAll('#edmode button').forEach(b=>b.onclick=()=>{eMode=b.dataset.em;document.querySelectorAll('#edmode button').forEach(x=>x.classList.toggle('on',x===b))});
$('#edreach').oninput=e=>$('#edrv').textContent=e.target.value;
/* sayıyla uygula */
function eNumeric(){const pk=eCur();if(!pk){msg('Önce "Kenar" modunda bir kenar ya da köşeye tıkla.',null,'#edmsg');return false}
 const ang=parseFloat($('#edang').value)||0;let dw;const S=ePrepare(pk);
 if(S.bend&&ang>0){const I=eInfo(S.pk),[i,s]=($('#eddir').value||'0,1').split(',').map(Number),n=I.dirs[i]||I.dirs[0];
  if(!n){undo.pop();msg('Bu kenarda yön bulunamadı.',null,'#edmsg');return false}dw=n.clone().multiplyScalar(s*S.Lw/2*Math.tan(Math.min(ang,180)*D2R/4))}
 else dw=new THREE.Vector3(+$('#edx').value||0,+$('#edy').value||0,+$('#edz').value||0);
 if(dw.lengthSq()<1e-12){undo.pop();msg('Yer değiştirme ya da açı gir.',null,'#edmsg');return false}
 const info=eApply(S,dw);eFinish(S,true);histMark();msg(eInfoText(info),'var(--ok)','#edmsg');return info}
$('#edapply').onclick=eNumeric;

/* ---------- katı işlemler (manifold-3d, WASM) ---------- */
let MF=null,mfLoading=null;
function loadManifold(){if(MF)return Promise.resolve(MF);
 if(!mfLoading){const L=window.__manifoldLoader||(()=>import('https://cdn.jsdelivr.net/npm/manifold-3d@3.5.4/manifold.js').then(m=>m.default));
  mfLoading=Promise.resolve().then(L).then(Mod=>Mod()).then(w=>{w.setup();MF=w;return w}).catch(e=>{mfLoading=null;throw new Error('Hesap modülü yüklenemedi (internet gerekli): '+e.message)})}
 return mfLoading}
function toMF(w,P,I,tol,name){const wd=weld(P,null,I,tol),mesh=new w.Mesh({numProp:3,vertProperties:wd.P,triVerts:wd.I});mesh.merge();let m;
 try{m=new w.Manifold(mesh)}catch(e){throw new Error(name+' kapalı (su geçirmez) bir yüzey değil. "Yüzey temizliği" ile kırıntıları sil, yüzleri düzelt ya da parçayı yeniden oluştur.')}
 return m}
/* A ve B aynı yerel uzayda; sonuç keskin kenarları ayrılmış ağ */
async function boolArrays(A,B,op,diag,names){const w=await loadManifold(),tol=Math.max(diag,1)*1e-6,ms=[];
 try{const a=toMF(w,A.P,A.I,tol,names[0]);ms.push(a);const b=toMF(w,B.P,B.I,tol,names[1]);ms.push(b);
  const r=op==='union'?a.add(b):op==='subtract'?a.subtract(b):a.intersect(b);ms.push(r);
  const m=r.getMesh(),np=m.numProp,V=m.vertProperties,n=V.length/np,P=new Float32Array(n*3);
  for(let i=0;i<n;i++){P[3*i]=V[np*i];P[3*i+1]=V[np*i+1];P[3*i+2]=V[np*i+2]}
  const I=Uint32Array.from(m.triVerts);if(!I.length)throw new Error('Sonuç boş: parçalar birbirine değmiyor olabilir.');
  return splitSharp(P,null,I,30)}
 finally{ms.forEach(m=>{try{m.delete()}catch(_){}})}}
function toLocal(p,P){apply(p);const inv=new THREE.Matrix4().copy(p.mesh.matrixWorld).invert().elements,o=new Float32Array(P.length);
 for(let i=0;i<P.length;i+=3){const x=P[i],y=P[i+1],z=P[i+2];o[i]=inv[0]*x+inv[4]*y+inv[8]*z+inv[12];o[i+1]=inv[1]*x+inv[5]*y+inv[9]*z+inv[13];o[i+2]=inv[2]*x+inv[6]*y+inv[10]*z+inv[14]}return o}
/* p'yi sonuçla değiştir (aynı konum/dönüş/ölçek, aynı malzeme) */
function replaceWith(p,R,name){const g=p.ground,np=derive(R.P,R.C,R.I,name,p,xformOf(p));np.useVC=false;np.ground=g;if(g)sit(np);
 const i=parts.indexOf(np);parts.splice(i,1);parts.splice(parts.indexOf(p)+1,0,np);
 removePart(p);select(np);return np}
let boolBusy=false;
async function boolParts(op,a,b,keep){if(boolBusy)return null;if(!a||!b||a===b){msg('Seçili parça ve "Diğer parça" gerekli.',null,'#bmsg');return null}
 boolBusy=true;msg('Hesaplanıyor…','var(--mut)','#bmsg');
 try{if(cage)cageEnd(true);const A=localArrays(a),wb=worldArrays(b),B={P:toLocal(a,wb.P),I:wb.I};
  const R=await boolArrays(A,B,op,Math.hypot(...a.base),[a.name,b.name]);
  const sym={union:'∪',subtract:'−',intersect:'∩'}[op],np=replaceWith(a,R,(a.name+sym+b.name).slice(0,28));
  if(!keep)removePart(b);refresh();look();histMark();
  msg({union:'Birleştirildi',subtract:'Oyuldu',intersect:'Ortak hacim kaldı'}[op]+'. Hacim '+f(massInfo(np).vol/1000,2)+' cm³.','var(--ok)','#bmsg');return np}
 catch(e){msg(e.message,null,'#bmsg');return null}
 finally{boolBusy=false}}
document.querySelectorAll('[data-bool]').forEach(btn=>btn.onclick=()=>boolParts(btn.dataset.bool,sel,parts.find(q=>q.id===+$('#mgsel').value),$('#bkeep').checked));

/* ---------- delik aç / doldur ---------- */
let hole=null,hOp='cut';
const hPrev=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,48,1),new THREE.MeshBasicMaterial({color:lin(0xff7a1a),transparent:true,opacity:.45,depthTest:false}));
hPrev.renderOrder=14;hPrev.visible=false;scene.add(hPrev);
function wDiag(p){const b=worldBox(p);return Math.hypot(b.mx[0]-b.mn[0],b.mx[1]-b.mn[1],b.mx[2]-b.mn[2])}
/* delik geometrisi (dünya): içe doğru yön, başlangıç, boy */
function holeSpec(){if(!hole||!parts.includes(hole.p))return null;const fit=hOp==='cut'?(parseFloat($('#hlfit').value)||0):0,D=parseFloat($('#hld').value)+2*fit,dep=parseFloat($('#hldep').value)||0;
 const c=new THREE.Vector3(+$('#hlx').value,+$('#hly').value,+$('#hlz').value);if(!(D>0)||[c.x,c.y,c.z].some(isNaN))return null;
 let dir=hole.n.clone().negate();const ax=$('#hldir').value;
 if(ax!=='n'){const i='xyz'.indexOf(ax),s=Math.sign(dir.getComponent(i))||-1;dir=new THREE.Vector3().setComponent(i,s)}
 const eps=Math.max(.5,D*.05),diag=wDiag(hole.p);
 if(hOp==='cut'){const L=dep>0?dep+eps:diag*2+eps;return{op:'cut',D,dir,start:c.clone().addScaledVector(dir,-eps),L,c,dep}}
 const out=dir.clone().negate(),h=dep>0?dep:D;return{op:'add',D,dir:out,start:c.clone().addScaledVector(out,-eps),L:h+eps,c,dep:h}}
function holePreview(){const s=holeSpec();if(!s||mode!=='hole'){hPrev.visible=false;return}
 hPrev.scale.set(s.D/2,s.L,s.D/2);hPrev.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),s.dir);hPrev.position.copy(s.start).addScaledVector(s.dir,s.L/2);hPrev.visible=true}
function holePlace(p,point,n){const k=$('#hlsnap').checked?2:1000,r=v=>Math.round(v*k)/k;hole={p,n:n.clone().normalize()};
 $('#hlx').value=r(point.x);$('#hly').value=r(point.y);$('#hlz').value=r(point.z);
 msg(p.name+' üstünde, '+axisName(n)+' yüzü. "Uygula"ya bas.','var(--mut)','#hlmsg');holePreview()}
function holeClick(e){const r=pickAt(e);if(!r)return;const n=r.h.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(r.h.object.matrixWorld)).normalize();
 openTab('edit');$('#d-hole').open=true;holePlace(r.p,r.h.point,n)}
let holeBusy=false;
async function holeDo(){const s=holeSpec();if(!s){msg('Önce "Delik" modunda yüzeye tıkla ve çapı gir.',null,'#hlmsg');return null}
 if(holeBusy)return null;holeBusy=true;const p=hole.p;msg('Hesaplanıyor…','var(--mut)','#hlmsg');
 try{if(cage)cageEnd(true);const cyl=cylMesh([s.start.x,s.start.y,s.start.z],[s.dir.x,s.dir.y,s.dir.z],s.L,s.D/2,64);
  const R=await boolArrays(localArrays(p),{P:toLocal(p,cyl.P),I:cyl.I},s.op==='cut'?'subtract':'union',Math.hypot(...p.base),[p.name,'Delik']);
  const np=replaceWith(p,R,p.name);hole.p=np;refresh();look();histMark();holePreview();
  msg((s.op==='cut'?'Ø'+f(s.D,2)+' mm delik açıldı'+(s.D!==parseFloat($('#hld').value)?' (geçme payı dahil)':'')+(s.dep>0?', derinlik '+f(s.dep,2)+' mm':' (boydan boya)'):'Ø'+f(s.D,2)+' mm, '+f(s.dep,2)+' mm çıkıntı eklendi')+'. Hacim '+f(massInfo(np).vol/1000,2)+' cm³.','var(--ok)','#hlmsg');return np}
 catch(e){msg(e.message,null,'#hlmsg');return null}
 finally{holeBusy=false}}
document.querySelectorAll('#hlop button').forEach(b=>b.onclick=()=>{hOp=b.dataset.ho;document.querySelectorAll('#hlop button').forEach(x=>x.classList.toggle('on',x===b));holePreview()});
['#hld','#hldep','#hlx','#hly','#hlz','#hldir','#hlfit'].forEach(s=>{$(s).addEventListener('input',holePreview);$(s).addEventListener('change',holePreview)});
$('#hlgo').onclick=holeDo;
let down0=null;
addEventListener('pointerup',e=>{if(mode!=='hole'||e.target!==cv||e.button!==0||!down0)return;const m=Math.hypot(e.clientX-down0[0],e.clientY-down0[1])>4;down0=null;if(!m)holeClick(e)});
vp.addEventListener('pointerdown',e=>{if(e.target===cv&&e.button===0)down0=[e.clientX,e.clientY]},true);

/* ---------- açı ölçümü (3 nokta, ikinci nokta tepe) ---------- */
let mType='d',mPts=[];
const mpendMark2=mpendMark.clone();mpendMark2.visible=false;scene.add(mpendMark2);
function measReset(){mPts=[];mpend=null;mpendP=null;mpendMark.visible=false;mpendMark2.visible=false}
const _measClick=measClick;
measClick=function(e){if(mType!=='a')return _measClick(e);const r=pickAt(e);if(!r)return;const pt=snapPoint(e,r.h);
 r.p.mesh.updateMatrixWorld(true);mPts.push({p:r.p,l:r.p.mesh.worldToLocal(pt.clone()),w:pt});
 if(mPts.length<3){const mk=mPts.length===1?mpendMark:mpendMark2;mk.position.copy(pt);mk.scale.setScalar(markSize());mk.visible=true;return}
 if(mPts.some(q=>!parts.includes(q.p))){measReset();return}
 const[A,B,C]=mPts;measures.push({pa:A.p,la:A.l,pb:B.p,lb:B.l,pc:C.p,lc:C.l});measReset();drawMeasures(true)};
measWorld=function(m){const W=q=>{q.mesh.updateMatrixWorld(true);return q.mesh.matrixWorld};const o=[m.la.clone().applyMatrix4(W(m.pa)),m.lb.clone().applyMatrix4(W(m.pb))];
 if(m.pc)o.push(m.lc.clone().applyMatrix4(W(m.pc)));return o};
drawMeasures=function(force){
 for(let i=measures.length-1;i>=0;i--){const m=measures[i];if(!parts.includes(m.pa)||!parts.includes(m.pb)||(m.pc&&!parts.includes(m.pc)))measures.splice(i,1)}
 const W=measures.map(measWorld),sig=W.map(a=>a.map(v=>[v.x,v.y,v.z].map(x=>x.toFixed(2)).join(',')).join(';')).join('|');
 const g=$('#mgrp');if(g)g.hidden=!measures.length;
 if(!force&&sig===mSig)return;mSig=sig;const seg=[],items=[];
 W.forEach(([a,b,c])=>{seg.push(a.x,a.y,a.z,b.x,b.y,b.z);
  if(c){seg.push(b.x,b.y,b.z,c.x,c.y,c.z);items.push({pos:b.clone(),cls:'m',text:f(angle3([a.x,a.y,a.z],[b.x,b.y,b.z],[c.x,c.y,c.z]),2)+'°'})}
  else{const d=b.clone().sub(a);items.push({pos:a.clone().add(b).multiplyScalar(.5),cls:'m',text:f(d.length(),1)+' mm  (Δ '+f(Math.abs(d.x),1)+' · '+f(Math.abs(d.y),1)+' · '+f(Math.abs(d.z),1)+')'})}});
 mLines.geometry.dispose();mLines.geometry=new THREE.BufferGeometry();mLines.geometry.setAttribute('position',new THREE.Float32BufferAttribute(seg,3));setLabels('meas',items)};
function setMType(t){mType=t;measReset();document.querySelectorAll('#mtype button').forEach(b=>b.classList.toggle('on',b.dataset.mt===t));
 if(mode==='meas')msg(t==='a'?'Açı: üç noktaya tıkla, ikinci nokta tepedir.':'Ölçmek için modelde iki noktaya tıkla.','var(--mut)')}
document.querySelectorAll('#mtype button').forEach(b=>b.onclick=()=>setMType(b.dataset.mt));

/* ---------- yuvarlak köşeli kutu ---------- */
function rboxGeo(size,r){const rb=roundedBox(size[0],size[1],size[2],r,6);return geoFrom(rb.P,null,rb.I)}
function addRBox(size,r,pos){size=(size||[200,120,40]).slice();r=r==null?Math.min(...size)*.2:r;const n=parts.length;
 const p=baseOpts({type:'rbox',size,base:size.slice(),pos:pos?pos.slice():[(n%5)*260-520,300,0],rad:Math.max(0,Math.min(r,Math.min(...size)/2))});
 p.name='Yuvarlak kutu '+p.id;p.color=COLS[p.id%COLS.length];register(p,rboxGeo(size,p.rad));regUV(p);metrics(p);apply(p);if(p.ground)sit(p);p.orig=snap(p);select(p);return p}
/* güncel boyutta, verilen yarıçapla yeniden kur (ölçek 1'e döner, yarıçap gerçek mm kalır) */
function rboxRebuild(p,r){pushUndo(p);const size=p.size.slice();p.rad=Math.max(0,Math.min(r,Math.min(...size)/2));const g=rboxGeo(size,p.rad);
 geoReplace(p,g.attributes.position.array,null,g.index.array);p.base=size.slice();p.size=size.slice();p.analytic=null;metrics(p);apply(p);if(p.ground)sit(p);refresh();look()}
$('#addrbox').onclick=()=>addRBox();
const _panel=panel;
panel=function(){_panel();const p=sel;if(!p||p.type!=='rbox')return;const info=$('#info');if(!info)return;
 const d=document.createElement('div');d.innerHTML=`<label>Köşe yarıçapı (mm)</label><div class="row" style="gap:6px"><input type="number" id="rbr" min="0" step="0.5" value="${+(+p.rad||0).toFixed(2)}" style="flex:1"><button class="sm" id="rbgo">Yeniden kur</button></div>
  <p class="note">Boyutu değiştirdikten sonra da "Yeniden kur"a bas: köşeler gerçek yarıçapta kalır.</p>`;
 info.parentNode.insertBefore(d,info);$('#rbgo').onclick=()=>{const v=parseFloat($('#rbr').value);if(v>=0)rboxRebuild(p,v)}};

/* ---------- mod geçişleri ---------- */
const _setMode=setMode;
setMode=function(m){const prev=mode;_setMode(m);
 if(prev==='edge'&&m!=='edge'){hiShow(eHi,null);setLabels('edge',[])}
 if(m!=='meas')measReset();$('#mtype').hidden=m!=='meas';
 if(m==='edge'||m==='hole')cv.style.cursor='crosshair';
 if(m==='edge'){openTab('edit');$('#d-edge').open=true;const F=sel&&featOf(sel);if(sel&&!F.chains.length&&!F.corners.length)msg('Bu parçada keskin kenar yok. Esnet ya da Kafes kullan; yuvarlak kutuda yarıçapı 0 yap.','var(--mut)','#edmsg');else msg('Kenarın ya da köşenin üstüne gel, tut ve çek.','var(--mut)','#edmsg')}
 if(m==='hole'){openTab('edit');$('#d-hole').open=true;msg('Yüzeye tıkla: delik yeri.','var(--mut)','#hlmsg')}
 if(m==='meas')setMType(mType);
 holePreview()};
