/* ================= Seçim, panel, kamera, tutamaç, ölçü ================= */
theme();
function select(p){
 if(typeof cage!=='undefined'&&cage&&cage.p!==p)cageEnd(true);
 sel=p;look();attachGizmo();list();panel();stats();updMplane();hideCut();fillSelects();
 if(mode==='cage'&&p&&!cage)cageStart(p)}
function removePart(p){if(!parts.includes(p))return;if(sel===p){if(cage)cageEnd(false);tc.detach()}
 clearOverlay(p);scene.remove(p.mesh);p.mesh.geometry.dispose();p.solidMat.dispose();p.wireMat.dispose();p.ghostMat.dispose();
 parts.splice(parts.indexOf(p),1);for(let i=undo.length-1;i>=0;i--)if(undo[i].p===p)undo.splice(i,1);
 jointsDropPart(p);if(sel===p)sel=null;if(typeof measures!=='undefined')drawMeasures()}
function remove(){if(!sel)return;const p=sel;removePart(p);select(null)}
function refresh(){list();panel();stats();updMplane();fillSelects()}
function list(){const el=$('#list');el.innerHTML=parts.length?'':'<p class="mut">Henüz parça yok.</p>';
 parts.forEach(p=>{const row=document.createElement('div');row.className='row';row.style.gap='2px';
  const b=document.createElement('button');b.className=p===sel?'sel':'';b.style.flex='1';
  b.innerHTML=`<span>${esc(p.name)}</span><span class="mut">${f(massInfo(p).mass)} kg</span>`;b.onclick=()=>select(p);
  const c=document.createElement('input');c.type='checkbox';c.checked=p.vis;c.title='Göster / gizle';c.style.margin='0 4px';c.onchange=()=>{p.vis=c.checked;setDisplay(p);if(sel===p)tc.visible=p.vis;stats()};
  row.append(c,b);el.appendChild(row)})}
function fillSelects(){const opt=(excl)=>parts.filter(p=>p!==excl).map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
 const keep=(id,html)=>{const e=$(id);if(!e)return;const v=e.value;e.innerHTML=html;if([...e.options].some(o=>o.value===v))e.value=v};
 keep('#mgsel',opt(sel));keep('#jp',opt(null));keep('#jc',opt(null));
 const jc=$('#jc');if(jc&&jc.options.length>1&&jc.value===$('#jp').value)jc.selectedIndex=(jc.selectedIndex+1)%jc.options.length}
function syncInputs(){if(!sel)return;document.querySelectorAll('#props input[data-k]').forEach(i=>{
 if(document.activeElement===i)return;i.value=+sel[i.dataset.k][+i.dataset.i].toFixed(2)});
 const g=$('#gnd');if(g)g.checked=sel.ground}
function panel(){const p=sel,el=$('#props');
 if(!p){el.innerHTML='<p class="mut">Bir parça seç, ekle ya da model yükle.</p>';return}
 const tri=(k,st)=>`<div class="tri">${[0,1,2].map(i=>`<input type="number" step="${st}" data-k="${k}" data-i="${i}" value="${+p[k][i].toFixed(2)}" aria-label="${k} ${'XYZ'[i]}">`).join('')}</div>`;
 const rd=p.type==='cyl'||p.type==='cone';
 el.innerHTML=`<div class="row"><input id="nm" value="${esc(p.name)}" style="font-weight:600"><button id="del" class="sm">Sil</button></div>
 <label>Malzeme</label><select id="mat">${Object.keys(MATS).map(k=>`<option${k===p.mat?' selected':''}>${k}</option>`).join('')}</select>
 ${MATS[p.mat].tint?`<label>Renk</label><input type="color" id="col" value="${p.color}">`:''}
 ${p.hasVC?`<label class="chk"><input type="checkbox" id="vc"${p.useVC?' checked':''}>Fotoğraf rengini kullan</label>`:''}
 <label>Boyut (mm)${rd?' · X ve Y çap, Z yükseklik':' · X, Y, Z'}</label>${tri('size',10)}
 <div class="row" style="margin-top:8px"><label class="chk" style="margin:0"><input type="checkbox" id="lock"${p.lock?' checked':''}>Oranı koru</label>
  <span class="grp"><button id="dn">−10%</button><button id="up">+10%</button></span></div>
 <label>Dönüş (°) · X, Y, Z</label>${tri('rot',5)}
 <label>Konum (mm) · X, Y, Z</label>${tri('pos',10)}
 <label class="chk"><input type="checkbox" id="gnd"${p.ground?' checked':''}>Zemine otur</label>
 <label>Ortala (X–Y orijine, taban Z=0'a)</label><div class="btnrow" style="margin-top:0"><button class="sm" data-rc="bbox">Sınır kutusu</button><button class="sm" data-rc="base">Taban</button><button class="sm" data-rc="com">Ağırlık merkezi</button></div>
 <label>Yönü kalıcı çevir (90°) – yan yatık geldiyse</label><div class="btnrow" style="margin-top:0"><button class="sm" data-bake="0">X ekseni</button><button class="sm" data-bake="1">Y ekseni</button><button class="sm" data-bake="2">Z ekseni</button></div>
 <label>Dolgu</label><div class="row"><select id="fill"><option value="solid"${p.fill==='solid'?' selected':''}>Dolu</option><option value="shell"${p.fill==='shell'?' selected':''}>İçi boş (çeper)</option></select>
  <input type="number" id="wall" min="0.1" step="0.5" value="${p.wall}" title="Çeper kalınlığı (mm)" ${p.fill==='shell'?'':'hidden'} style="max-width:90px"></div>
 <div id="info" style="margin-top:12px"></div>`;
 el.querySelectorAll('input[data-k]').forEach(i=>i.oninput=()=>{const v=parseFloat(i.value),k=i.dataset.k,idx=+i.dataset.i;if(isNaN(v)||(k==='size'&&v<=0))return;
  if(k==='size'&&p.lock){const r=v/p.size[idx];p.size=p.size.map(s=>s*r);p.size[idx]=v}else p[k][idx]=v;
  if(k==='pos'&&idx===2)p.ground=false;apply(p);if(p.ground&&k!=='pos')sit(p);syncInputs();jointsRebase(p);stats();list();attachGizmo()});
 $('#nm').onchange=e=>{p.name=e.target.value.slice(0,28)||p.name;list();fillSelects()};
 $('#lock').onchange=e=>p.lock=e.target.checked;
 $('#gnd').onchange=e=>{p.ground=e.target.checked;if(p.ground){sit(p);syncInputs();stats()}};
 const sc=k=>{p.size=p.size.map(s=>s*k);apply(p);if(p.ground)sit(p);syncInputs();stats();list()};
 $('#dn').onclick=()=>sc(.9);$('#up').onclick=()=>sc(1.1);
 $('#mat').onchange=e=>{p.mat=e.target.value;rebuildMat(p);panel();stats();list()};
 if($('#col'))$('#col').oninput=e=>{p.color=e.target.value;rebuildMat(p)};
 if($('#vc'))$('#vc').onchange=e=>{p.useVC=e.target.checked;rebuildMat(p)};
 $('#fill').onchange=e=>{p.fill=e.target.value;$('#wall').hidden=p.fill!=='shell';stats();list()};
 $('#wall').oninput=e=>{const v=parseFloat(e.target.value);if(v>0){p.wall=v;stats();list()}};
 el.querySelectorAll('[data-bake]').forEach(b=>b.onclick=()=>bakeTurn(p,+b.dataset.bake));
 el.querySelectorAll('[data-rc]').forEach(b=>b.onclick=()=>{recentre(p,b.dataset.rc);jointsRebase(p)});
 $('#del').onclick=remove}
function rebuildMat(p){p.solidMat.dispose();p.solidMat=makeMat(p);look()}
const kv=(a,b)=>`<div class="kv"><span class="mut">${a}</span><span>${b}</span></div>`;
function stats(){
 const i=$('#info');
 if(i&&sel){const m=massInfo(sel);
  i.innerHTML=kv('Hacim (dolu)'+(sel.type==='model'?' ≈':''),f(m.vol/1000)+' cm³')+(sel.fill==='shell'?kv('Yüzey alanı',f(m.A/100)+' cm²'):'')+
   kv('Kütle',f(m.mass,3)+' kg')+kv('Sınır kutusu',sel.size.map(v=>f(v,1)).join(' × ')+' mm')+
   (sel.type==='model'?'<p class="note">Hacim kapalı bir yüzey varsayar. Gerçek kütle çeper kalınlığına bağlıdır: "İçi boş" seçip kalınlığı gir.</p>':'')}
 let M=0;const c=new THREE.Vector3();
 parts.forEach(p=>{const m=massInfo(p);M+=m.mass;c.addScaledVector(m.com,m.mass)});
 if(M>0)c.multiplyScalar(1/M);totalMass=M;
 $('#tot').innerHTML=kv('Parça sayısı',parts.length)+kv('Toplam kütle',f(M,3)+' kg')+(M>0?kv('Ağırlık merkezi (mm)',[c.x,c.y,c.z].map(v=>f(v,1)).join(' · ')):'')+
  '<p class="note">Çakışan parçalar iki kez sayılır.</p>';
 comMarker.position.copy(c);comMarker.visible=M>0&&$('#showcom').checked;
 updateDims();updateCalc()}

/* ---- etiketler ve ölçü çizgileri ---- */
const lbls=$('#lbls'),labels=[];
function setLabels(kind,items){for(let i=labels.length-1;i>=0;i--)if(labels[i].kind===kind){labels[i].el.remove();labels.splice(i,1)}
 items.forEach(it=>{const el=document.createElement('span');el.textContent=it.text;if(it.cls)el.className=it.cls;lbls.appendChild(el);labels.push({kind,el,pos:it.pos})})}
function placeLabels(){const w=vp.clientWidth,h=vp.clientHeight,v=new THREE.Vector3();
 labels.forEach(l=>{v.copy(l.pos).project(cam);const ok=v.z>-1&&v.z<1&&Math.abs(v.x)<1.1&&Math.abs(v.y)<1.1;l.el.style.display=ok?'':'none';
  if(ok){l.el.style.left=((v.x+1)/2*w)+'px';l.el.style.top=((1-v.y)/2*h)+'px'}})}
const dimLines=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:lin(0x1f6feb),depthTest:false,transparent:true}));
dimLines.renderOrder=11;dimLines.visible=false;dimLines.frustumCulled=false;scene.add(dimLines);
function worldBox(p){apply(p);const P=p.mesh.geometry.attributes.position.array,e=p.mesh.matrixWorld.elements;
 const mn=[1e30,1e30,1e30],mx=[-1e30,-1e30,-1e30];
 for(let i=0;i<P.length;i+=3){const x=P[i],y=P[i+1],z=P[i+2];
  for(let k=0;k<3;k++){const v=e[k]*x+e[4+k]*y+e[8+k]*z+e[12+k];if(v<mn[k])mn[k]=v;if(v>mx[k])mx[k]=v}}
 return{mn,mx}}
function updateDims(){
 if(!sel||!sel.vis||!$('#showdim').checked){dimLines.visible=false;setLabels('dim',[]);return}
 const{mn,mx}=worldBox(sel),d=[mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]],o=Math.max(...d)*.07,t=o*.25,seg=[];
 const L=(a,b)=>seg.push(...a,...b);
 /* X boyu: ön-alt kenarın önünde; Y boyu: sağ-alt kenarın yanında; Z yüksekliği: ön-sol dikey kenarın yanında */
 const yF=mn[1]-o,zB=mn[2];
 L([mn[0],yF,zB],[mx[0],yF,zB]);L([mn[0],yF-t,zB],[mn[0],yF+t,zB]);L([mx[0],yF-t,zB],[mx[0],yF+t,zB]);L([mn[0],mn[1],zB],[mn[0],yF,zB]);L([mx[0],mn[1],zB],[mx[0],yF,zB]);
 const xR=mx[0]+o;
 L([xR,mn[1],zB],[xR,mx[1],zB]);L([xR-t,mn[1],zB],[xR+t,mn[1],zB]);L([xR-t,mx[1],zB],[xR+t,mx[1],zB]);L([mx[0],mn[1],zB],[xR,mn[1],zB]);L([mx[0],mx[1],zB],[xR,mx[1],zB]);
 const xL=mn[0]-o;
 L([xL,mn[1],mn[2]],[xL,mn[1],mx[2]]);L([xL-t,mn[1],mn[2]],[xL+t,mn[1],mn[2]]);L([xL-t,mn[1],mx[2]],[xL+t,mn[1],mx[2]]);L([mn[0],mn[1],mx[2]],[xL,mn[1],mx[2]]);
 dimLines.geometry.dispose();dimLines.geometry=new THREE.BufferGeometry();dimLines.geometry.setAttribute('position',new THREE.Float32BufferAttribute(seg,3));dimLines.visible=true;
 setLabels('dim',[{pos:new THREE.Vector3((mn[0]+mx[0])/2,yF,zB),text:f(d[0],1)+' mm'},{pos:new THREE.Vector3(xR,(mn[1]+mx[1])/2,zB),text:f(d[1],1)+' mm'},{pos:new THREE.Vector3(xL,mn[1],(mn[2]+mx[2])/2),text:f(d[2],1)+' mm'}])}

/* ---- kamera ---- */
function updOrtho(){const a=vp.clientWidth/Math.max(vp.clientHeight,1);orthoCam.left=-orthoH*a;orthoCam.right=orthoH*a;orthoCam.top=orthoH;orthoCam.bottom=-orthoH;orthoCam.updateProjectionMatrix()}
function setOrtho(on){if(on===isOrtho)return;
 if(on){orthoH=Math.max(cam.position.distanceTo(ctl.target)*Math.tan(22.5*D2R),1);orthoCam.position.copy(persp.position);orthoCam.quaternion.copy(persp.quaternion);orthoCam.up.copy(persp.up);cam=orthoCam}
 else{const d=orthoH/Math.tan(22.5*D2R),dir=orthoCam.position.clone().sub(ctl.target).normalize();persp.position.copy(ctl.target).addScaledVector(dir,d);persp.up.copy(orthoCam.up);persp.lookAt(ctl.target);cam=persp}
 isOrtho=on;ctl.object=cam;tc.camera=cam;ctl.noZoom=on;updOrtho();ctl.update();$('#ortho').classList.toggle('on',on)}
vp.addEventListener('wheel',e=>{if(!isOrtho||e.target!==cv)return;e.preventDefault();e.stopImmediatePropagation();
 orthoH=Math.min(Math.max(orthoH*Math.pow(1.0015,e.deltaY),5),40000);updOrtho()},{capture:true,passive:false});
function bounds(){const b=new THREE.Box3();parts.forEach(p=>{if(!p.vis)return;p.mesh.updateMatrixWorld(true);b.union(new THREE.Box3().setFromObject(p.mesh))});
 if(b.isEmpty())return{c:new THREE.Vector3(),r:600};const s=b.getSize(new THREE.Vector3());return{c:b.getCenter(new THREE.Vector3()),r:Math.max(s.length()/2,60)}}
function view(n){const d={x:[1,0,0],y:[0,-1,0],z:[0,.001,1],iso:[.7,-.7,.55]}[n],v=new THREE.Vector3(...d).normalize(),b=bounds();
 setOrtho(n!=='iso');
 cam.up.set(0,0,1);ctl.target.copy(b.c);cam.position.copy(b.c).addScaledVector(v,b.r*2.6);if(isOrtho){orthoH=b.r*1.15;updOrtho()}cam.lookAt(b.c);ctl.update()}
function fit(){const b=bounds(),v=cam.position.clone().sub(ctl.target);if(v.lengthSq()<1e-6)v.set(1,-1,.6);v.normalize();
 ctl.target.copy(b.c);cam.position.copy(b.c).addScaledVector(v,b.r*2.6);if(isOrtho){orthoH=b.r*1.15;updOrtho()}cam.lookAt(b.c);ctl.update()}
document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>view(b.dataset.v));
$('#fit').onclick=fit;$('#ortho').onclick=()=>setOrtho(!isOrtho);

/* ---- tutamaç (gizmo) ve modlar ---- */
let tcActive=false,tcEnd=0;
tc.addEventListener('dragging-changed',e=>{ctl.enabled=!e.value;
 if(mode==='cage'){e.value?cageDragStart():cageDragEnd();if(!e.value)tcEnd=performance.now();tcActive=e.value;return}
 if(e.value){tcActive=true}else{tcActive=false;tcEnd=performance.now();panel();stats();list();if(sel){sel.gv++;jointsRebase(sel);look()}}});
tc.addEventListener('objectChange',()=>{
 if(mode==='cage'){cageDragMove();return}
 const p=sel;if(!p)return;const m=p.mesh;
 if(mode==='move'){p.pos=[m.position.x,m.position.y,m.position.z];p.ground=false}
 else if(mode==='rot'){p.rot=[m.rotation.x,m.rotation.y,m.rotation.z].map(r=>r*180/Math.PI);if(p.ground)sit(p)}
 else if(mode==='scl'){p.size=p.base.map((b,i)=>b*Math.max(Math.abs([m.scale.x,m.scale.y,m.scale.z][i]),1e-3));if(p.ground)sit(p)}
 apply(p);jointsFollow(p);syncInputs();stats()});
function attachGizmo(){tc.detach();if(sel&&sel.vis&&(mode==='move'||mode==='rot'||mode==='scl')){tc.setMode({move:'translate',rot:'rotate',scl:'scale'}[mode]);tc.attach(sel.mesh)}}
function setMode(m){const prev=mode;
 if(prev==='cage'&&m!=='cage')cageEnd(true);
 mode=m;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('on',b.dataset.mode===m));
 marker.visible=false;pendJoint=false;mpend=null;mpendMark.visible=false;
 attachGizmo();updMplane();cv.style.cursor=(m==='grab'||m==='meas'||m==='cage')?'crosshair':'';
 if(m==='cage'){openTab('edit');$('#d-cage').open=true;if(sel)cageStart(sel);else cageInfo('Önce bir parça seç.')}
 if(m==='grab'){openTab('edit');$('#d-grab').open=true}
 if(m==='meas')msg('Ölçmek için modelde iki noktaya tıkla.','var(--mut)')}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
function openTab(t){document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));document.querySelectorAll('.page').forEach(pg=>pg.classList.toggle('on',pg.id==='p-'+t))}
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>openTab(b.dataset.tab));

/* ---- ölçüm aracı ---- */
const measures=[];let mpend=null,mpendP=null,mSig='';
const mpendMark=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color:lin(0xff7a1a),depthTest:false}));mpendMark.visible=false;mpendMark.renderOrder=12;scene.add(mpendMark);
const mLines=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:lin(0xff7a1a),depthTest:false}));mLines.renderOrder=12;mLines.frustumCulled=false;scene.add(mLines);
function markSize(){return (isOrtho?orthoH*.012:cam.position.distanceTo(ctl.target)*.008)}
/* yüzey tıklaması: üçgenin en yakın köşesine ekranda 16 px içindeyse yapış */
function snapPoint(e,h){const m=h.object,g=m.geometry,pa=g.attributes.position,r=cv.getBoundingClientRect();let best=null,bd=16;
 for(const vi of[h.face.a,h.face.b,h.face.c]){const v=new THREE.Vector3().fromBufferAttribute(pa,vi).applyMatrix4(m.matrixWorld),s=v.clone().project(cam),
   sx=(s.x+1)/2*r.width+r.left,sy=(1-s.y)/2*r.height+r.top,d=Math.hypot(sx-e.clientX,sy-e.clientY);if(d<bd){bd=d;best=v}}
 return best||h.point.clone()}
function measClick(e){const r=pickAt(e);if(!r)return;const pt=snapPoint(e,r.h);
 if(!mpend){mpend=pt;mpendP=r.p;mpendMark.position.copy(pt);mpendMark.scale.setScalar(markSize());mpendMark.visible=true;return}
 if(!parts.includes(mpendP)){mpend=null;mpendMark.visible=false;return}
 const loc=(P,w)=>{P.mesh.updateMatrixWorld(true);return P.mesh.worldToLocal(w.clone())};
 measures.push({pa:mpendP,la:loc(mpendP,mpend),pb:r.p,lb:loc(r.p,pt)});mpend=null;mpendP=null;mpendMark.visible=false;drawMeasures(true)}
/* ölçüler parçaya bağlı: parça taşınınca/şekil değişince uzunluk güncellenir, parça silinince ölçü de silinir */
function measWorld(m){m.pa.mesh.updateMatrixWorld(true);m.pb.mesh.updateMatrixWorld(true);return[m.la.clone().applyMatrix4(m.pa.mesh.matrixWorld),m.lb.clone().applyMatrix4(m.pb.mesh.matrixWorld)]}
function drawMeasures(force){
 for(let i=measures.length-1;i>=0;i--)if(!parts.includes(measures[i].pa)||!parts.includes(measures[i].pb))measures.splice(i,1);
 const W=measures.map(measWorld),sig=W.map(([a,b])=>[a.x,a.y,a.z,b.x,b.y,b.z].map(v=>v.toFixed(2)).join(',')).join('|');
 const g=$('#mgrp');if(g)g.hidden=!measures.length;
 if(!force&&sig===mSig)return;mSig=sig;
 const seg=[],items=[];W.forEach(([a,b])=>{seg.push(a.x,a.y,a.z,b.x,b.y,b.z);
  const d=b.clone().sub(a);items.push({pos:a.clone().add(b).multiplyScalar(.5),cls:'m',text:f(d.length(),1)+' mm  (Δ '+f(Math.abs(d.x),1)+' · '+f(Math.abs(d.y),1)+' · '+f(Math.abs(d.z),1)+')'})});
 mLines.geometry.dispose();mLines.geometry=new THREE.BufferGeometry();mLines.geometry.setAttribute('position',new THREE.Float32BufferAttribute(seg,3));setLabels('meas',items)}
function clearMeasures(){measures.length=0;mpend=null;mpendP=null;mpendMark.visible=false;drawMeasures(true)}
$('#mclear').onclick=clearMeasures;$('#mclear2').onclick=clearMeasures;
