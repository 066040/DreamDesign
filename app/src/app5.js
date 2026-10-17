/* ================= hesaplar, dosya, el hareketi, başlangıç ================= */
const gv=id=>parseFloat($(id).value);
function updateCalc(){
 /* malzeme tablosu */
 const by={};parts.forEach(p=>{by[p.mat]=(by[p.mat]||0)+massInfo(p).mass});
 $('#mtab').innerHTML=Object.keys(MATS).map(k=>kv(k+' · '+f(MATS[k].d,2)+' g/cm³',by[k]?f(by[k],2)+' kg':'—')).join('')+kv('<b>Toplam</b>','<b>'+f(totalMass,2)+' kg</b>');
 const M=totalMass,fo=$('#fout'),wo=$('#wout');
 if(!(M>0)){fo.innerHTML='<p class="note">Kütle için parça ekle.</p>';wo.innerHTML='';return}
 const rho=gv('#frho'),h=hoverCalc({mass:M,rotors:gv('#fr'),diam:gv('#fd'),rho,fm:gv('#ffm'),eta:gv('#feta'),battKWh:gv('#fb'),maxThrust:gv('#ft')*1000,powerW:gv('#fp')*1000});
 if([h.area,h.elecW].some(v=>!isFinite(v))){fo.innerHTML='<p class="note">Girdileri kontrol et.</p>'}
 else{const okP=gv('#fp')*1000>=h.elecW,okT=h.twr>=1;
  fo.innerHTML=kv('Kütle',f(M,1)+' kg')+kv('Toplam rotor alanı',f(h.area,2)+' m²')+kv('Disk yükü',f(h.diskLoading,0)+' N/m²')+
   kv('Gereken itki (asılı kalma)',f(h.thrust/1000,2)+' kN')+kv('İtki/ağırlık oranı',`<span style="color:var(${okT?'--ok':'--warn'})">${f(h.twr,2)}</span>`)+
   kv('İdeal güç',f(h.idealW/1000,1)+' kW')+kv('Elektrik gücü (asılı)',`<span style="color:var(${okP?'--ok':'--warn'})">${f(h.elecW/1000,1)} kW</span>`)+
   kv('Batarya ile asılı kalma',f(h.hoverMin,1)+' dk')+kv('Eldeki güçle azami kütle',f(h.maxMass,0)+' kg')+kv('İndüklenen hız',f(h.vi,1)+' m/s')}
 const w=wingCalc({mass:M,rho,area:gv('#wa'),clMax:gv('#wcl'),vCruise:gv('#wv'),cd0:gv('#wcd')});
 wo.innerHTML=isFinite(w.vStall)?kv('Yük (ağırlık)',f(w.weight/1000,2)+' kN')+kv('Kanat yüklemesi',f(w.wingLoading,0)+' N/m²')+kv('Sönme (stall) hızı',f(w.vStall,1)+' m/s ('+f(w.vStall*3.6,0)+' km/s)')+
  kv('Seyirde gereken CL',`<span style="color:var(${w.clReq<=gv('#wcl')?'--ok':'--warn'})">${f(w.clReq,2)}</span>`)+(w.dragW?kv('Sürtünme gücü (seyir)',f(w.dragW/1000,1)+' kW'):''):''}
document.querySelectorAll('#p-calc input').forEach(i=>i.oninput=updateCalc);

/* ================= dışa aktarma ve proje ================= */
function download(name,data,type){try{const b=new Blob([data],{type}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();
 setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);return true}catch(e){return false}}
function exportParts(){const list=$('#exsel').checked&&sel?[sel]:parts.filter(p=>p.vis);return list}
function exportDone(ok,name){msg(ok?name+' indirildi.':'İndirme bu ortamda engellenmiş olabilir. Yerel sunucuda (localhost:8000) dene.',ok?'var(--ok)':null,'#pmsg')}
$('#exstl').onclick=()=>{const l=exportParts();if(!l.length)return msg('Dışa aktarılacak parça yok.',null,'#pmsg');const m=catMesh(l.map(p=>worldArrays(p)));exportDone(download('dreamdesign.stl',stlBinary(m.P,m.I),'model/stl'),'dreamdesign.stl')};
$('#exobj').onclick=()=>{const l=exportParts();if(!l.length)return msg('Dışa aktarılacak parça yok.',null,'#pmsg');let s='# DreamDesign (mm, Z yukari)\n',off=0;
 l.forEach(p=>{const w=worldArrays(p);s+=objText(w.P,w.I,p.name.replace(/\s+/g,'_'),off);off+=w.P.length/3});exportDone(download('dreamdesign.obj',s,'text/plain'),'dreamdesign.obj')};
$('#exglb').onclick=()=>{const l=exportParts();if(!l.length)return msg('Dışa aktarılacak parça yok.',null,'#pmsg');
 try{const grp=new THREE.Group();l.forEach(p=>{apply(p);const g=p.mesh.geometry.clone();g.deleteAttribute('uv');const m=new THREE.Mesh(g,p.solidMat.clone());m.material.map=null;m.material.bumpMap=null;m.name=p.name;
   m.position.copy(p.mesh.position);m.rotation.copy(p.mesh.rotation);m.scale.copy(p.mesh.scale);grp.add(m)});
  grp.rotation.x=-Math.PI/2;grp.updateMatrixWorld(true);
  new THREE.GLTFExporter().parse(grp,res=>exportDone(download('dreamdesign.glb',res,'model/gltf-binary'),'dreamdesign.glb'),{binary:true})}catch(e){msg('GLB üretilemedi: '+e.message,null,'#pmsg')}};
const arr64=a=>b64(new Uint8Array(a.buffer,a.byteOffset,a.byteLength));
const f32=s=>{const u=unb64(s);return new Float32Array(u.buffer,0,u.length>>2)};
const u32=s=>{const u=unb64(s);return new Uint32Array(u.buffer,0,u.length>>2)};
const vq=q=>[q.x,q.y,q.z,q.w],va=v=>[v.x,v.y,v.z];
/* ---- durum yakalama / geri yükleme (kaydet-aç ve geri al aynı kodu kullanır) ---- */
const eqArr=(a,b)=>{if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true};
let _cid=0;
function hcache(o,key,src,Ctor){const c=o._hc||(o._hc={}),old=c[key];if(old&&eqArr(old,src))return old;const n=Ctor.from(src);n._cid=++_cid;c[key]=n;return n}
function stateData(raw){const E=raw?(a=>a):arr64;
 const d={v:4,app:'dreamdesign',
 parts:parts.map(p=>{const g=p.mesh.geometry,ca=g.attributes.color,cp=(k,arr,C)=>raw?hcache(p,k,arr,C):C.from(arr);
  return{id:p.id,name:p.name,type:p.type,mat:p.mat,color:p.color,size:p.size.slice(),base:p.base.slice(),pos:p.pos.slice(),rot:p.rot.slice(),lock:p.lock,ground:p.ground,fill:p.fill,wall:p.wall,mid:p.mid.slice(),
   useVC:p.useVC,hasVC:p.hasVC,vis:p.vis,uvk:p.uvk,an:!!p.analytic,P:E(cp('P',g.attributes.position.array,Float32Array)),I:E(cp('I',g.index.array,Uint32Array)),C:ca?E(cp('C',ca.array,Float32Array)):null,
   orig:raw&&p.orig?{pos:p.orig.pos,base:p.orig.base,size:p.orig.size,position:p.orig.position,mid:p.orig.mid}:undefined}}),
 joints:joints.map(J=>({id:J.id,parent:J.parent.id,child:J.child.id,type:J.type,min:J.min,max:J.max,val:J.val,axisP:va(J.axisP),pivotP:va(J.pivotP),posL:va(J.posL),qL:vq(J.qL)})),
 poses:poses.map(p=>({name:p.name,vals:Object.assign({},p.vals)})),
 shelf:raw?shelf.slice():shelf.map(s=>({name:s.name,mat:s.mat,color:s.color,dims:s.dims,P:E(s.P),I:E(s.I),C:s.C?E(s.C):null})),
 measures:measures.map(m=>({pa:m.pa.id,la:[m.la.x,m.la.y,m.la.z],pb:m.pb.id,lb:[m.lb.x,m.lb.y,m.lb.z]})),
 sk:JSON.stringify(sk.shapes)};
 return d}
function projectData(){return stateData(false)}
const sigOf=o=>JSON.stringify(o,(k,v)=>ArrayBuffer.isView(v)?(v._cid||(v._cid=++_cid)):v);
function restoreParts(d,raw){
 if(cage)cageEnd(false);joints.length=0;[...parts].forEach(removePart);sel=null;
 let mx=0;const byId={};
 d.parts.forEach(s=>{const P=raw?Float32Array.from(s.P):f32(s.P),C=s.C?(raw?Float32Array.from(s.C):f32(s.C)):null,I=raw?Uint32Array.from(s.I):u32(s.I),geo=geoFrom(P,C,I),
  p=baseOpts({type:s.type,name:s.name,mat:s.mat,color:s.color,size:s.size.slice(),base:s.base.slice(),pos:s.pos.slice(),rot:s.rot.slice(),lock:s.lock,ground:s.ground,fill:s.fill,wall:s.wall,mid:s.mid.slice(),useVC:s.useVC,hasVC:s.hasVC,vis:s.vis!==false,uvk:s.uvk||0});
  p.id=s.id;mx=Math.max(mx,s.id);register(p,geo);regUV(p);byId[s.id]=p;
  if(s.an&&geos[s.type]){p.analytic={V0:{box:1,cyl:Math.PI/4,sph:Math.PI/6,cone:Math.PI/12}[s.type],Cv:s.type==='cone'?[0,0,-.25]:[0,0,0]};
   p.edge=new THREE.LineSegments(new THREE.EdgesGeometry(geo,25),new THREE.LineBasicMaterial({color:lin(0x0b0f17),transparent:true,opacity:.6}));p.mesh.add(p.edge)}
  metrics(p);apply(p);
  if(raw){p._hc={P:s.P,I:s.I,C:s.C};if(!p._hc.C)delete p._hc.C}
  p.orig=raw&&s.orig?{p,pos:s.orig.pos,base:s.orig.base,size:s.orig.size,position:s.orig.position,mid:s.orig.mid}:snap(p)});
 uid=Math.max(uid,mx+1);return byId}
function restoreJoints(d){joints.length=0;poses.length=0;let jm=0;
 (d.joints||[]).forEach(s=>{const pa=parts.find(p=>p.id===s.parent),ch=parts.find(p=>p.id===s.child);if(!pa||!ch)return;
  joints.push({id:s.id,parent:pa,child:ch,type:s.type,min:s.min,max:s.max,val:s.val,axisP:jv(s.axisP),pivotP:jv(s.pivotP),posL:jv(s.posL),qL:new THREE.Quaternion(...s.qL)});jm=Math.max(jm,s.id)});
 jid=Math.max(jid,jm+1);(d.poses||[]).forEach(p=>poses.push({name:p.name,vals:Object.assign({},p.vals)}));jointList();drawJointMarks()}
function restoreMeasures(d){measures.length=0;
 (d.measures||[]).forEach(m=>{const pa=parts.find(p=>p.id===m.pa),pb=parts.find(p=>p.id===m.pb);if(pa&&pb)measures.push({pa,la:jv(m.la),pb,lb:jv(m.lb)})});mpend=null;mpendP=null;mpendMark.visible=false;drawMeasures(true)}
function restoreShelf(d,raw){shelf.length=0;if(raw){d.shelf.forEach(s=>shelf.push(s));shelfDraw();return}(d.shelf||[]).forEach(s=>shelf.push(shelfEntry(s.name,raw?s.P:f32(s.P),s.C?(raw?s.C:f32(s.C)):null,raw?s.I:u32(s.I),s.mat,s.color)));shelfDraw()}
function restoreSketch(d){let sh=[];try{sh=JSON.parse(d.sk||'[]')}catch(_){}sk.shapes=sh;sk.cur=null;sk.drag=null;sh.forEach(s=>{if(s.id>=sk.sid)sk.sid=s.id+1});
 if(!sk.shapes.some(s=>s.id===sk.selId))sk.selId=null;sk.selEdge=-1;skProps();skDraw()}
function loadProject(d){
 if(!d||(d.app!=='dreamdesign'&&d.app!=='atolye')||!Array.isArray(d.parts))throw new Error('DreamDesign proje dosyası değil');
 restoreParts(d,false);restoreJoints(d);restoreMeasures(d);restoreShelf(d,false);restoreSketch(d);
 select(null);refresh();look();view('iso');histMark()}
$('#psave').onclick=()=>{try{exportDone(download('dreamdesign-project.json',JSON.stringify(projectData()),'application/json'),'dreamdesign-project.json')}catch(e){msg('Kaydedilemedi: '+e.message,null,'#pmsg')}};
$('#pload').onclick=()=>$('#pfile').click();
$('#pfile').onchange=e=>{const file=e.target.files[0];e.target.value='';if(!file)return;const rd=new FileReader();
 rd.onload=()=>{try{loadProject(JSON.parse(rd.result));msg('Proje açıldı.','var(--ok)','#pmsg')}catch(err){msg('Proje açılamadı: '+err.message,null,'#pmsg')}};rd.readAsText(file)};

/* ================= dosya açma ve fotoğraftan 3B ================= */
const LOCAL=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
function loadFile(file){msg('');
 const ext=file.name.split('.').pop().toLowerCase(),base=file.name.replace(/\.[^.]+$/,'');
 const rd=new FileReader();rd.onerror=()=>msg('Dosya okunamadı.');
 const fail=e=>msg('Model açılamadı: '+(e&&e.message?e.message:'desteklenmeyen veya sıkıştırılmış (Draco) dosya olabilir.'));
 const ok=(o,fx)=>{try{addModel(o,base,fx)}catch(e){fail(e)}};
 try{
  if(ext==='json'||ext==='dreamdesign'){rd.onload=()=>{try{loadProject(JSON.parse(rd.result));msg('Proje açıldı.','var(--ok)')}catch(e){fail(e)}};rd.readAsText(file)}
  else if(ext==='glb'||ext==='gltf'){rd.onload=()=>new THREE.GLTFLoader().parse(rd.result,'',g=>ok(g.scene,true),fail);ext==='glb'?rd.readAsArrayBuffer(file):rd.readAsText(file)}
  else if(ext==='obj'){rd.onload=()=>{try{ok(new THREE.OBJLoader().parse(rd.result),true)}catch(e){fail(e)}};rd.readAsText(file)}
  else if(ext==='stl'){rd.onload=()=>{try{ok(new THREE.Mesh(new THREE.STLLoader().parse(rd.result)),false)}catch(e){fail(e)}};rd.readAsArrayBuffer(file)}
  else if(/^(jpe?g|png|webp)$/.test(ext))generate(file,base);
  else msg('Desteklenen biçimler: GLB, GLTF, OBJ, STL, JPG, PNG, WEBP, proje (.json).');
 }catch(e){fail(e)}}
async function generate(file,base){
 if(!LOCAL){msg('Fotoğraftan 3D üretimi yalnızca yerel sunucuda (localhost:8000) çalışır.');return}
 msg('3D model üretiliyor… İlk seferde model indirilir, sonrası ekran kartına göre 10-90 sn sürer.','var(--mut)');
 try{const fd=new FormData();fd.append('image',file);
  const r=await fetch('/api/generate?mc_resolution='+$('#genres').value+'&smooth='+$('#gensm').value,{method:'POST',body:fd});
  if(!r.ok){let t=await r.text();try{t=JSON.parse(t).detail||t}catch(_){}throw new Error(t||r.statusText)}
  const buf=await r.arrayBuffer();
  new THREE.GLTFLoader().parse(buf,'',g=>{try{addModel(g.scene,base,true);if(!$('#msg').textContent)msg('Model hazır.','var(--ok)')}catch(e){msg('Üretilen model açılamadı: '+e.message)}},()=>msg('Üretilen model açılamadı.'));
 }catch(e){msg('Üretim başarısız: '+e.message)}}
$('#load').onclick=()=>$('#file').click();
$('#file').onchange=e=>{if(e.target.files[0])loadFile(e.target.files[0]);e.target.value=''};
let dd=0;const drop=$('#drop');
vp.addEventListener('dragenter',e=>{if([...e.dataTransfer.types].includes('text/dreamdesign-shelf'))return;e.preventDefault();dd++;drop.style.display='flex'});
vp.addEventListener('dragover',e=>e.preventDefault());
vp.addEventListener('dragleave',()=>{if(--dd<=0){dd=0;drop.style.display='none'}});
vp.addEventListener('drop',e=>{e.preventDefault();dd=0;drop.style.display='none';
 const sid=e.dataTransfer.getData('text/dreamdesign-shelf');
 if(sid){const it=shelf.find(s=>s.id===+sid);if(it)spawn(it,e);return}
 if(e.dataTransfer.files[0])loadFile(e.dataTransfer.files[0])});

/* ================= el hareketi (kamera) ================= */
const hands=new Gestures();let gRun=null,gGrabbing=false,gDot=null;
function gScreen(x,y){const r=cv.getBoundingClientRect();return{clientX:r.left+(1-x)*r.width,clientY:r.top+y*r.height}}   // kamera görüntüsü aynalı gösterilir
function orbitBy(yaw,pitch){const v=cam.position.clone().sub(ctl.target);v.applyAxisAngle(Zax,yaw);
 const ax=new THREE.Vector3().crossVectors(v,cam.up).normalize(),w=v.clone().applyAxisAngle(ax,pitch),el=Math.abs(w.clone().normalize().dot(cam.up));if(el<.995)v.copy(w);
 cam.position.copy(ctl.target).add(v);cam.lookAt(ctl.target);ctl.update()}
function zoomBy(factor){if(!(factor>0.2&&factor<5))return;if(isOrtho){orthoH=Math.min(Math.max(orthoH/factor,5),40000);updOrtho()}else{const v=cam.position.clone().sub(ctl.target);cam.position.copy(ctl.target).addScaledVector(v,1/factor);ctl.update()}}
function panBy(dx,dy){const aspect=vp.clientWidth/Math.max(vp.clientHeight,1),hh=isOrtho?orthoH:cam.position.distanceTo(ctl.target)*Math.tan(22.5*D2R),
 right=new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld,1),
 d=right.multiplyScalar(-dx*2*hh*aspect).addScaledVector(up,dy*2*hh);cam.position.add(d);ctl.target.add(d);ctl.update()}
function gestureEvent(ev){switch(ev.type){
 case'cursor':hoverEv=mode==='grab'?gScreen(ev.x,ev.y):null;gDotMove(ev.x,ev.y);break;
 case'grabStart':{gDotMove(ev.x,ev.y,true);if(mode==='grab'){const e=gScreen(ev.x,ev.y),r=pickAt(e);if(r){if(sel!==r.p)select(r.p);ctl.enabled=false;startGrab(r.p,r.h);gGrabbing=true}}break}
 case'move':gDotMove(ev.x,ev.y,true);if(gGrabbing&&grab)grab.pending=gScreen(ev.x,ev.y);else orbitBy(ev.dx*Math.PI*1.8,ev.dy*Math.PI*1.2);break;   // dx ham görüntü yönünde: sağa hareket = negatif
 case'grabEnd':if(gGrabbing&&grab){endGrab()}gGrabbing=false;ctl.enabled=true;break;
 case'zoom':zoomBy(ev.factor);break;
 case'pan':panBy(-ev.dx,ev.dy);break}}
function gDotMove(x,y,down){if(!gDot){gDot=document.createElement('div');gDot.style.cssText='position:absolute;width:18px;height:18px;border-radius:50%;border:2px solid #ff7a1a;pointer-events:none;transform:translate(-50%,-50%);z-index:6';vp.appendChild(gDot)}
 gDot.style.display='block';gDot.style.left=((1-x)*100)+'%';gDot.style.top=(y*100)+'%';gDot.style.background=down?'#ff7a1a':'transparent'}
async function gestStart(){
 if(gRun){gestStop();return}
 if(!LOCAL){msg('El hareketi yalnızca yerel sunucuda (localhost:8000) çalışır.',null,'#gmsg');return}
 const video=$('#cam');
 try{msg('Kamera ve el modeli hazırlanıyor…','var(--mut)','#gmsg');
  const stream=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480}});video.srcObject=stream;await video.play();video.style.display='block';video.style.transform='scaleX(-1)';
  const V='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14',mod=await (new Function('u','return import(u)'))(V+'/vision_bundle.mjs'),
   fs=await mod.FilesetResolver.forVisionTasks(V+'/wasm'),mk=d=>mod.HandLandmarker.createFromOptions(fs,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:d},runningMode:'VIDEO',numHands:2});
  let lm;try{lm=await mk('GPU')}catch(_){lm=await mk('CPU')}
  gRun={stream,lm,on:true};$('#gstart').textContent='Kamerayı kapat';msg('Hazır. Başparmak + işaret parmağını birleştirerek tut.','var(--ok)','#gmsg');
  const tick=()=>{if(!gRun||!gRun.on)return;if(video.readyState>=2){try{const r=lm.detectForVideo(video,performance.now());hands.update(r.landmarks||[]).forEach(gestureEvent)}catch(e){console.warn(e)}}requestAnimationFrame(tick)};tick();
 }catch(e){gestStop();msg('El hareketi başlatılamadı: '+(e&&e.message||e),null,'#gmsg')}}
function gestStop(){if(gRun){gRun.on=false;try{gRun.stream.getTracks().forEach(t=>t.stop())}catch(_){}}gRun=null;gGrabbing=false;ctl.enabled=true;$('#cam').style.display='none';if(gDot)gDot.style.display='none';$('#gstart').textContent='Kamerayı aç'}
$('#gstart').onclick=gestStart;

/* ================= düğmeler ve tuşlar ================= */
document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>add(b.dataset.add));
$('#disp').onchange=e=>{disp=e.target.value;look()};
$('#ctax').onchange=$('#ctstep').onchange=()=>look();
$('#spin').onclick=()=>{spin=!spin;$('#spin').classList.toggle('on',spin)};
$('#showcom').onchange=stats;$('#showdim').onchange=stats;
addEventListener('keydown',e=>{
 if(sk.on&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)){skKey(e);return}
 if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;const k=e.key.toLowerCase();
 if((e.ctrlKey||e.metaKey)&&k==='z'&&!e.shiftKey){e.preventDefault();doUndo();return}
 if((e.ctrlKey||e.metaKey)&&(k==='y'||(k==='z'&&e.shiftKey))){e.preventDefault();histRedo();return}
 if(e.ctrlKey||e.metaKey||e.altKey)return;
 if(k==='1')view('x');else if(k==='2')view('y');else if(k==='3')view('z');else if(k==='0')view('iso');
 else if(k==='w'){disp=disp==='tri'?'solid':'tri';$('#disp').value=disp;look()}
 else if(k==='f')fit();else if(k==='p')setOrtho(!isOrtho);else if(k==='d')skOpen(true);
 else if(k==='q')setMode('sec');else if(k==='g')setMode('move');else if(k==='r')setMode('rot');else if(k==='s')setMode('scl');else if(k==='e')setMode('grab');else if(k==='k')setMode('cage');else if(k==='m')setMode('meas');
 else if(k==='delete'||k==='backspace')remove()});
new ResizeObserver(()=>{const w=vp.clientWidth,h=vp.clientHeight;if(!w||!h)return;ren.setSize(w,h,false);persp.aspect=w/h;persp.updateProjectionMatrix();updOrtho();ctl.handleResize()}).observe(vp);

/* ---- başlangıç sahnesi ---- */
add('box',[640,260,70],[0,0,0]);
add('cyl',[180,180,30],[-320,-190,85],{ground:false});
libInit();jointList();fillSelects();select(null);view('iso');stats();
let last=performance.now();
(function loop(t){requestAnimationFrame(loop);const dt=Math.min((t-last)/1000,.1);last=t;
 if(spin){const v=cam.position.clone().sub(ctl.target).applyAxisAngle(Zax,dt*.6);cam.position.copy(ctl.target).add(v)}
 if(grab&&grab.pending){const e=grab.pending;grab.pending=null;doGrab(e)}
 else if(mode==='grab'&&!grab&&hoverEv){const e=hoverEv;hoverEv=null;hover(e)}
 if(isOrtho)ctl.panSpeed=.9*vp.clientWidth/Math.max(cam.position.distanceTo(ctl.target),1);else ctl.panSpeed=.8;
 if(mpendMark.visible)mpendMark.scale.setScalar(markSize());
 if(measures.length)drawMeasures();
 parts.forEach(p=>{if(p.sil)updSilhouette(p)});ctl.update();placeLabels();ren.render(scene,cam)})(performance.now());
