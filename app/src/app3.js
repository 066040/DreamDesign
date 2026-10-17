/* ================= Esnet (yüzeyden tut) + Kafes (FFD) + kesme/birleştirme/temizlik ================= */
const marker=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),new THREE.MeshBasicMaterial({color:lin(0xff7a1a),wireframe:true,transparent:true,opacity:.5,depthTest:false}));
marker.visible=false;marker.renderOrder=9;scene.add(marker);
const mplane=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:lin(0x1f6feb),transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false}));
mplane.visible=false;scene.add(mplane);
function updMplane(){const ax=+$('#mir').value;
 if(mplane.parent)mplane.parent.remove(mplane);
 if(mode!=='grab'||!sel||ax<0){mplane.visible=false;return}
 const g=sel.mesh.geometry;g.computeBoundingBox();const d=g.boundingBox.getSize(new THREE.Vector3()).length()*.7;
 mplane.scale.set(d,d,1);mplane.rotation.set(0,0,0);if(ax===0)mplane.rotation.y=Math.PI/2;else if(ax===1)mplane.rotation.x=Math.PI/2;
 mplane.position.set(0,0,0);mplane.position.setComponent(ax,sel.mid[ax]);sel.mesh.add(mplane);mplane.visible=true}
$('#mir').onchange=updMplane;
$('#rad').oninput=e=>$('#rv').textContent=e.target.value;
$('#undo').onclick=doUndo;
$('#reset').onclick=()=>{if(sel&&sel.orig){pushUndo(sel);restore(sel.orig)}};

const rc=new THREE.Raycaster(),gplane=new THREE.Plane(),tmpV=new THREE.Vector3();
let grab=null,hoverEv=null;
function ndc(e){const r=cv.getBoundingClientRect();return new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1)}
function pickAt(e){rc.setFromCamera(ndc(e),cam);const hs=rc.intersectObjects(parts.filter(p=>p.vis).map(p=>p.mesh),false);if(!hs.length)return null;
 return{p:parts.find(q=>q.mesh===hs[0].object),h:hs[0]}}
function radLocal(p){const g=p.mesh.geometry;g.computeBoundingBox();return g.boundingBox.getSize(new THREE.Vector3()).length()*(+$('#rad').value)/100}
function startGrab(p,h){
 const m=p.mesh,g=m.geometry,pa=g.attributes.position;
 if(p.edge){m.remove(p.edge);p.edge.geometry.dispose();p.edge=null}
 p.analytic=null;
 if(!p.topo){g.computeBoundingBox();p.topo=buildTopo(pa.array,g.index.array,g.boundingBox.getSize(new THREE.Vector3()).length())}
 const topo=p.topo,rest=new Float32Array(pa.array);
 pushUndo(p);m.updateMatrixWorld(true);
 const lp=m.worldToLocal(h.point.clone());
 let best=-1,bd=Infinity;for(const vi of [h.face.a,h.face.b,h.face.c]){const dx=rest[3*vi]-lp.x,dy=rest[3*vi+1]-lp.y,dz=rest[3*vi+2]-lp.z,d=dx*dx+dy*dy+dz*dz;if(d<bd){bd=d;best=vi}}
 const R=radLocal(p),dA=geodesic(topo,rest,topo.wid[best],R),ax=+$('#mir').value;let dB=null;
 if(ax>=0){const mp=lp.clone();mp.setComponent(ax,2*p.mid[ax]-lp.getComponent(ax));let nb=0,nd=Infinity;
  for(let w=0;w<topo.W;w++){const r=topo.rep[w]*3,dx=rest[r]-mp.x,dy=rest[r+1]-mp.y,dz=rest[r+2]-mp.z,d=dx*dx+dy*dy+dz*dz;if(d<nd){nd=d;nb=w}}
  dB=geodesic(topo,rest,nb,R)}
 const ids=new Set(dA.keys());if(dB)for(const k of dB.keys())ids.add(k);
 const arr=Array.from(ids),wa=new Float32Array(arr.length),wb=new Float32Array(arr.length);
 arr.forEach((w,i)=>{const a=dA.get(w);wa[i]=a===undefined?0:falloff(a,R);if(dB){const b=dB.get(w);wb[i]=b===undefined?0:falloff(b,R)}});
 const inv=new THREE.Matrix3().setFromMatrix4(m.matrixWorld).invert();
 gplane.setFromNormalAndCoplanarPoint(cam.getWorldDirection(new THREE.Vector3()),h.point);
 grab={p,rest,arr,wa,wb,ax,inv,start:h.point.clone(),pending:null,moved:false};if(disp!=='solid'&&disp!=='tri')setDisplay(p)}
function doGrab(e){const G=grab;rc.setFromCamera(ndc(e),cam);const pt=rc.ray.intersectPlane(gplane,tmpV);if(!pt)return;
 const d=pt.clone().sub(G.start).applyMatrix3(G.inv),md=d.clone(),mir=G.ax>=0;if(mir)md.setComponent(G.ax,-md.getComponent(G.ax));
 const g=G.p.mesh.geometry,pa=g.attributes.position,P=pa.array,rest=G.rest,topo=G.p.topo;
 for(let i=0;i<G.arr.length;i++){const w=G.arr[i],a=G.wa[i],b=G.wb[i];let x,y,z;
  if(!mir){x=d.x*a;y=d.y*a;z=d.z*a}else{const s=a+b;if(s<1e-9)continue;const k=Math.max(a,b)/s;x=(a*d.x+b*md.x)*k;y=(a*d.y+b*md.y)*k;z=(a*d.z+b*md.z)*k}
  for(let j=topo.memStart[w];j<topo.memStart[w+1];j++){const v=topo.mem[j]*3;P[v]=rest[v]+x;P[v+1]=rest[v+1]+y;P[v+2]=rest[v+2]+z}}
 pa.needsUpdate=true;g.computeVertexNormals();G.moved=true;marker.position.copy(pt)}
function endGrab(){const G=grab;grab=null;ctl.enabled=true;
 if(G.moved){commitShape(G.p);refresh();look()}else undo.pop()}
function hover(e){const r=pickAt(e);if(!r){marker.visible=false;return}
 const s=r.p.mesh.scale;marker.position.copy(r.h.point);marker.scale.setScalar(Math.max(radLocal(r.p)*(s.x+s.y+s.z)/3,1));marker.visible=true}

/* ================= Kafes (FFD) ================= */
let cage=null;const cagePivot=new THREE.Object3D();scene.add(cagePivot);let cageTcMode='translate';
function cageInfo(t){$('#cginfo').textContent=t||''}
const cgIdx=(N,i,j,k)=>(i*N[1]+j)*N[2]+k;
function cageStart(p){
 if(cage)cageEnd(true);
 if(!p||!p.mesh.geometry.index||!p.vis){cageInfo('Görünür bir parça seç.');return}
 const g=p.mesh.geometry;g.computeBoundingBox();const bb=g.boundingBox,sz=bb.getSize(new THREE.Vector3());
 const N=[+$('#cgx').value,+$('#cgy').value,+$('#cgz').value].map(v=>Math.min(10,Math.max(2,Math.round(v)||4)));
 const box={min:[bb.min.x,bb.min.y,bb.min.z],size:[sz.x||1,sz.y||1,sz.z||1]},P=g.attributes.position.array,pr=ffdPrepare(P,box,N),C0=ffdRest(pr),n=N[0]*N[1]*N[2];
 if(p.edge){p.mesh.remove(p.edge);p.edge.geometry.dispose();p.edge=null}
 p.analytic=null;
 const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3));pg.setAttribute('color',new THREE.BufferAttribute(new Float32Array(n*3),3));
 const li=[];for(let i=0;i<N[0];i++)for(let j=0;j<N[1];j++)for(let k=0;k<N[2];k++){const a=cgIdx(N,i,j,k);
  if(i+1<N[0])li.push(a,cgIdx(N,i+1,j,k));if(j+1<N[1])li.push(a,cgIdx(N,i,j+1,k));if(k+1<N[2])li.push(a,cgIdx(N,i,j,k+1))}
 const lg=new THREE.BufferGeometry();lg.setAttribute('position',pg.attributes.position);lg.setIndex(li);
 const lines=new THREE.LineSegments(lg,new THREE.LineBasicMaterial({color:lin(0x1f6feb),transparent:true,opacity:.5,depthTest:false}));
 const pts=new THREE.Points(pg,new THREE.PointsMaterial({size:11,sizeAttenuation:false,vertexColors:true,depthTest:false,transparent:true}));
 lines.renderOrder=13;pts.renderOrder=14;lines.frustumCulled=pts.frustumCulled=false;
 const group=new THREE.Group();group.add(lines,pts);p.mesh.add(group);
 cage={p,N,box,pr,C0,C:Float64Array.from(C0),sel:new Set(),hist:[],drag:null,snap0:snap(p),changed:false,tmp:new Float32Array(P.length),group,pg,n};
 cageVis();cageSelChanged();if(disp!=='solid'&&disp!=='tri')setDisplay(p);
 cageInfo(`${N.join('×')} kafes kuruldu. Bir noktaya tıkla, tutamaçla çek.`)}
function cageVis(){if(!cage)return;const{C,pg,n}=cage,pa=pg.attributes.position.array,ca=pg.attributes.color.array,a=lin(css('--acc')||'#1f6feb'),o=lin('#ff7a1a');
 for(let q=0;q<n;q++){pa[3*q]=C[3*q];pa[3*q+1]=C[3*q+1];pa[3*q+2]=C[3*q+2];const c=cage.sel.has(q)?o:a;ca[3*q]=c.r;ca[3*q+1]=c.g;ca[3*q+2]=c.b}
 pg.attributes.position.needsUpdate=pg.attributes.color.needsUpdate=true}
function cageDeform(){const{p,pr,C,tmp}=cage,g=p.mesh.geometry,pa=g.attributes.position;ffdEval(pr,C,tmp);pa.array.set(tmp);pa.needsUpdate=true;g.computeVertexNormals();cageVis()}
function cageCentroid(){const c=new THREE.Vector3();if(!cage||!cage.sel.size)return null;
 for(const q of cage.sel)c.add(new THREE.Vector3(cage.C[3*q],cage.C[3*q+1],cage.C[3*q+2]));c.multiplyScalar(1/cage.sel.size);return cage.p.mesh.localToWorld(c)}
function cagePivotUpdate(){tc.detach();if(!cage||!cage.sel.size)return;const c=cageCentroid();cagePivot.position.copy(c);cagePivot.rotation.set(0,0,0);cagePivot.scale.set(1,1,1);cagePivot.updateMatrix();cagePivot.updateMatrixWorld(true);
 tc.setMode(cageTcMode);tc.setSpace('world');tc.attach(cagePivot)}
function cageSelChanged(){cageVis();cagePivotUpdate();const c=cageCentroid();
 ['x','y','z'].forEach((a,i)=>{const e=$('#cgc'+a);if(document.activeElement!==e)e.value=c?+c.getComponent(i).toFixed(2):''});
 if(cage)cageInfo(cage.sel.size?cage.sel.size+' nokta seçili':'Nokta seçilmedi.')}
function cagePartner(q,ax){const N=cage.N,k=q%N[2],j=((q-k)/N[2])%N[1],i=(q-k-j*N[2])/(N[1]*N[2]),ij=[i,j,k];ij[ax]=N[ax]-1-ij[ax];return cgIdx(N,ij[0],ij[1],ij[2])}
/* Yerel uzayda Ml dönüşümünü seçili noktalara (başlangıç init'ine göre) uygula; simetri açıksa karşılığına yansıt */
function cageApplyLocal(Ml,init){const sym=$('#cgsym').checked,ax=+$('#cgsymax').value;let Mm=null;
 if(sym){const c=cage.box.min[ax]+cage.box.size[ax]/2,R=new THREE.Matrix4().identity(),e=R.elements;e[ax*5]=-1;e[12+ax]=2*c;Mm=new THREE.Matrix4().multiplyMatrices(R,Ml).multiply(R)}
 const v=new THREE.Vector3(),put=(q,vec)=>{cage.C[3*q]=vec.x;cage.C[3*q+1]=vec.y;cage.C[3*q+2]=vec.z},get=q=>new THREE.Vector3(init[3*q],init[3*q+1],init[3*q+2]);
 for(const q of cage.sel){const m=sym?cagePartner(q,ax):q;
  if(sym&&m!==q&&cage.sel.has(m)&&m<q)continue;
  const v0=get(q);put(q,v.copy(v0).applyMatrix4(Ml));
  if(sym){if(m===q){const a=v0.clone().applyMatrix4(Ml),b=v0.clone().applyMatrix4(Mm);put(q,a.add(b).multiplyScalar(.5))}
   else put(m,get(m).applyMatrix4(Mm))}}
 cage.changed=true;cageDeform()}
function cageHist(){cage.hist.push(Float64Array.from(cage.C));if(cage.hist.length>40)cage.hist.shift()}
function cageDragStart(){if(!cage)return;cageHist();cagePivot.updateMatrixWorld(true);cage.drag={Minit:cagePivot.matrixWorld.clone(),init:Float64Array.from(cage.C)}}
function cageDragMove(){if(!cage||!cage.drag)return;cagePivot.updateMatrixWorld(true);
 const Md=new THREE.Matrix4().multiplyMatrices(cagePivot.matrixWorld,new THREE.Matrix4().copy(cage.drag.Minit).invert()),W=cage.p.mesh.matrixWorld,Wi=new THREE.Matrix4().copy(W).invert();
 cageApplyLocal(new THREE.Matrix4().multiplyMatrices(Wi,Md).multiply(W),cage.drag.init)}
function cageSettle(){const p=cage.p,g=p.mesh.geometry;g.computeBoundingBox();g.computeBoundingSphere();metrics(p);p.gv++;p.topo=null;stats();list();look()}
function cageDragEnd(){if(!cage)return;cage.drag=null;cageSettle();cagePivotUpdate();cageSelChanged()}
function cageUndo(){if(!cage||!cage.hist.length)return false;cage.C=cage.hist.pop();cageDeform();cageSettle();cageSelChanged();return true}
function cageEnd(applyIt){if(!cage)return;const c=cage;cage=null;tc.detach();
 c.p.mesh.remove(c.group);c.group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose()});
 if(applyIt&&c.changed&&parts.includes(c.p)){undo.push(c.snap0);if(undo.length>12)undo.shift();commitShape(c.p);refresh();look()}
 cageInfo('')}
/* nokta seçimi: ekranda 16 px içindeki en yakın kontrol noktası */
function cagePick(e){if(!cage||tc.axis)return false;const r=cv.getBoundingClientRect(),W=cage.p.mesh.matrixWorld,v=new THREE.Vector3();let best=-1,bd=16,bz=2;
 for(let q=0;q<cage.n;q++){v.set(cage.C[3*q],cage.C[3*q+1],cage.C[3*q+2]).applyMatrix4(W).project(cam);if(v.z>1)continue;
  const d=Math.hypot((v.x+1)/2*r.width+r.left-e.clientX,(1-v.y)/2*r.height+r.top-e.clientY);
  if(d<bd-.5||(Math.abs(d-bd)<=.5&&v.z<bz)){bd=d;bz=v.z;best=q}}
 if(best<0)return false;
 if(e.shiftKey){cage.sel.has(best)?cage.sel.delete(best):cage.sel.add(best)}else if(!cage.sel.has(best)){cage.sel.clear();cage.sel.add(best)}
 cageSelChanged();return true}
document.querySelectorAll('#cgmode button').forEach(b=>b.onclick=()=>{cageTcMode=b.dataset.cm;document.querySelectorAll('#cgmode button').forEach(x=>x.classList.toggle('on',x===b));if(cage&&cage.sel.size){tc.setMode(cageTcMode)}});
document.querySelectorAll('[data-cl]').forEach(b=>b.onclick=ev=>{if(!cage)return;const[a,w]=b.dataset.cl.split(',').map(Number),N=cage.N;if(!ev.shiftKey)cage.sel.clear();
 for(let i=0;i<N[0];i++)for(let j=0;j<N[1];j++)for(let k=0;k<N[2];k++){const ij=[i,j,k];if(ij[a]===(w?N[a]-1:0))cage.sel.add(cgIdx(N,i,j,k))}cageSelChanged()});
function cageExpand(a){if(!cage||!cage.sel.size)return;const N=cage.N,keep=new Set();
 for(const q of cage.sel){const k=q%N[2],j=((q-k)/N[2])%N[1],i=(q-k-j*N[2])/(N[1]*N[2]);keep.add([i,j,k][a])}
 for(let i=0;i<N[0];i++)for(let j=0;j<N[1];j++)for(let k=0;k<N[2];k++)if(keep.has([i,j,k][a]))cage.sel.add(cgIdx(N,i,j,k));cageSelChanged()}
$('#cgslx').onclick=()=>cageExpand(0);$('#cgsly').onclick=()=>cageExpand(1);$('#cgslz').onclick=()=>cageExpand(2);
$('#cgall').onclick=()=>{if(!cage)return;for(let q=0;q<cage.n;q++)cage.sel.add(q);cageSelChanged()};
$('#cgnone').onclick=()=>{if(!cage)return;cage.sel.clear();cageSelChanged()};
$('#cgbuild').onclick=()=>{if(sel){if(mode!=='cage')setMode('cage');else cageStart(sel)}};
$('#cgundo').onclick=()=>{if(!cageUndo())doUndo()};
$('#cgreset').onclick=()=>{if(!cage)return;cageHist();cage.C=Float64Array.from(cage.C0);cageDeform();cageSettle();cageSelChanged()};
$('#cgapply').onclick=()=>{setMode('sec')};
['x','y','z'].forEach((a,i)=>$('#cgc'+a).onchange=()=>{if(!cage||!cage.sel.size)return;const c=cageCentroid(),t=['x','y','z'].map(k=>parseFloat($('#cgc'+k).value));if(t.some(isNaN))return;
 const d=new THREE.Vector3(t[0]-c.x,t[1]-c.y,t[2]-c.z),W=cage.p.mesh.matrixWorld,Wi=new THREE.Matrix4().copy(W).invert();
 cageHist();cageApplyLocal(new THREE.Matrix4().multiplyMatrices(Wi,new THREE.Matrix4().makeTranslation(d.x,d.y,d.z)).multiply(W),Float64Array.from(cage.C));cageSettle();cageSelChanged()});
$('#cgsc').onclick=()=>{if(!cage||!cage.sel.size)return;const s=['x','y','z'].map(a=>(parseFloat($('#cgs'+a).value)||100)/100),c=new THREE.Vector3();
 for(const q of cage.sel)c.add(new THREE.Vector3(cage.C[3*q],cage.C[3*q+1],cage.C[3*q+2]));c.multiplyScalar(1/cage.sel.size);
 const M=new THREE.Matrix4().makeTranslation(c.x,c.y,c.z).multiply(new THREE.Matrix4().makeScale(s[0],s[1],s[2])).multiply(new THREE.Matrix4().makeTranslation(-c.x,-c.y,-c.z));
 cageHist();cageApplyLocal(M,Float64Array.from(cage.C));cageSettle();cageSelChanged();['x','y','z'].forEach(a=>$('#cgs'+a).value=100)};

/* ================= yüzey temizliği, kesme, birleştirme ================= */
function replaceGeometry(p,P,C,I){pushUndo(p);const g=p.mesh.geometry;
 g.setAttribute('position',new THREE.BufferAttribute(P,3));if(C)g.setAttribute('color',new THREE.BufferAttribute(C,3));else g.deleteAttribute('color');
 g.setIndex(new THREE.BufferAttribute(I,1));g.computeVertexNormals();regUV(p);commitShape(p);refresh();look()}
$('#smn').oninput=e=>$('#smv').textContent=e.target.value;
$('#dosmooth').onclick=()=>{const p=sel;if(!p)return;pushUndo(p);const g=p.mesh.geometry,pa=g.attributes.position;g.computeBoundingBox();
 const topo=buildTopo(pa.array,g.index.array,g.boundingBox.getSize(new THREE.Vector3()).length());taubin(pa.array,topo,+$('#smn').value);
 pa.needsUpdate=true;g.computeVertexNormals();commitShape(p);refresh();look();msg('Yüzey yumuşatıldı.','var(--ok)')};
$('#dodrop').onclick=()=>{const p=sel;if(!p)return;const L=localArrays(p),r=dropSmall(L.P,L.C,L.I,.03);
 if(!r.dropped){msg('Kopuk kırıntı yok.','var(--mut)');return}replaceGeometry(p,r.P,r.C,r.I);msg(r.dropped+' kopuk parça silindi.','var(--ok)')};
$('#dowind').onclick=()=>{const p=sel;if(!p)return;const L=localArrays(p);if(!fixWinding(L.P,L.I)){msg('Yüz yönü zaten doğru.','var(--mut)');return}replaceGeometry(p,L.P,L.C,L.I);msg('Yüzler ters çevrildi.','var(--ok)')};
const cplane=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:lin(0xff7a1a),transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}));cplane.visible=false;cplane.renderOrder=7;
function hideCut(){cplane.visible=false;if(cplane.parent)cplane.parent.remove(cplane)}
function cutInfo(){const p=sel;if(!p)return null;const ax=+$('#cutax').value,g=p.mesh.geometry;g.computeBoundingBox();
 const lo=g.boundingBox.min.getComponent(ax),hi=g.boundingBox.max.getComponent(ax);return{p,ax,lo,hi,val:lo+(hi-lo)*(+$('#cut').value)/100}}
function showCut(){const c=cutInfo();$('#cutv').textContent=$('#cut').value;if(!c)return;hideCut();
 const d=c.p.mesh.geometry.boundingBox.getSize(new THREE.Vector3()).length();cplane.scale.set(d,d,1);cplane.rotation.set(0,0,0);
 if(c.ax===0)cplane.rotation.y=Math.PI/2;else if(c.ax===1)cplane.rotation.x=Math.PI/2;
 const bc=c.p.mesh.geometry.boundingBox.getCenter(new THREE.Vector3());cplane.position.copy(bc);cplane.position.setComponent(c.ax,c.val);c.p.mesh.add(cplane);cplane.visible=true}
$('#cut').oninput=showCut;$('#cutax').onchange=showCut;
$('#docut').onclick=()=>{const c=cutInfo();if(!c)return;const p=c.p,L=localArrays(p),r=cutMesh(L.P,L.C,L.I,c.ax,c.val);
 if(!r.A.I.length||!r.B.I.length){msg('Kesme düzlemi modeli kesmiyor.');return}
 hideCut();if(cage)cageEnd(true);
 const gap=+$('#cutgap').value||0,xf=xformOf(p),diag=Math.hypot(...p.base),w=S=>weld(S.P,S.C,S.I,diag*1e-5);
 const A=w(r.A),B=w(r.B),pa=derive(A.P,A.C,A.I,p.name+' A',p,xf),pb=derive(B.P,B.C,B.I,p.name+' B',p,xf);
 const dir=new THREE.Vector3().setComponent(c.ax,1).applyQuaternion(p.mesh.quaternion).normalize();
 pa.pos=[pa.pos[0]-dir.x*gap/2,pa.pos[1]-dir.y*gap/2,pa.pos[2]-dir.z*gap/2];pb.pos=[pb.pos[0]+dir.x*gap/2,pb.pos[1]+dir.y*gap/2,pb.pos[2]+dir.z*gap/2];apply(pa);apply(pb);
 removePart(p);select(pa);msg('Kesildi: '+r.loops+' kesit halkası. Geri alma yalnız geometri düzenlemelerinde çalışır.','var(--ok)')};
$('#domerge').onclick=()=>{const a=sel,b=parts.find(q=>q.id===+$('#mgsel').value);if(!a||!b){msg('İki parça gerekli.');return}
 if(cage)cageEnd(true);
 const wa=worldArrays(a),wb=worldArrays(b),P=new Float32Array(wa.P.length+wb.P.length),I=new Uint32Array(wa.I.length+wb.I.length),n=wa.P.length/3;
 P.set(wa.P);P.set(wb.P,wa.P.length);I.set(wa.I);for(let i=0;i<wb.I.length;i++)I[wa.I.length+i]=wb.I[i]+n;
 let C=null;if(wa.C||wb.C){C=new Float32Array(P.length).fill(.8);if(wa.C)C.set(wa.C);if(wb.C)C.set(wb.C,wa.P.length)}
 const tol=Math.max(+$('#mgtol').value||0,1e-6),w=weld(P,C,I,tol);
 const m=derive(w.P,w.C,w.I,(a.name+'+'+b.name).slice(0,28),a,{pos:[0,0,0],rot:[0,0,0],scale:[1,1,1]});
 removePart(a);removePart(b);select(m);msg('Birleştirildi. Kaynak toleransı: '+tol+' mm.','var(--ok)')};
$('#doclone').onclick=()=>{const p=sel;if(!p)return;const L=localArrays(p),xf=xformOf(p);xf.pos[0]+=p.size[0]*1.1;
 select(derive(L.P,L.C,L.I,(p.name+' kopya').slice(0,28),p,xf))};
document.querySelectorAll('[data-mirror]').forEach(b=>b.onclick=()=>{const p=sel;if(!p)return;const a=+b.dataset.mirror,w=worldArrays(p);
 for(let i=a;i<w.P.length;i+=3)w.P[i]=-w.P[i];for(let i=0;i<w.I.length;i+=3){const t=w.I[i+1];w.I[i+1]=w.I[i+2];w.I[i+2]=t}
 select(derive(w.P,w.C,w.I,(p.name+' ayna').slice(0,28),p,{pos:[0,0,0],rot:[0,0,0],scale:[1,1,1]}))});

/* ================= işaretçi ================= */
let down=null,cagePicked=false;
vp.addEventListener('pointerdown',e=>{if(e.target!==cv||e.button!==0)return;down=[e.clientX,e.clientY];cagePicked=false;
 if(mode==='grab'){const r=pickAt(e);if(r){if(sel!==r.p)select(r.p);ctl.enabled=false;startGrab(r.p,r.h)}}
 else if(mode==='cage'&&cagePick(e)){ctl.enabled=false;cagePicked=true}},true);
window.addEventListener('pointermove',e=>{if(grab)grab.pending=e;else if(mode==='grab'&&e.target===cv)hoverEv=e});
window.addEventListener('pointerup',e=>{
 if(grab){endGrab();down=null;return}
 if(cagePicked){cagePicked=false;ctl.enabled=true;down=null;return}
 if(!down)return;const moved=Math.hypot(e.clientX-down[0],e.clientY-down[1])>4;down=null;
 if(moved||e.target!==cv||tcActive||performance.now()-tcEnd<250||mode==='grab')return;
 if(pendJoint){const r=pickAt(e);if(r){$('#jx').value=+r.h.point.x.toFixed(2);$('#jy').value=+r.h.point.y.toFixed(2);$('#jz').value=+r.h.point.z.toFixed(2);pendJoint=false;cv.style.cursor='';msg('Pivot ayarlandı.','var(--ok)','#jmsg');drawJointMarks()}return}
 if(mode==='meas'){measClick(e);return}
 if(mode==='cage'){if(cage&&!e.shiftKey&&!tc.axis){cage.sel.clear();cageSelChanged()}return}
 const r=pickAt(e);if(r)select(r.p);else if(mode==='sec')select(null)});
