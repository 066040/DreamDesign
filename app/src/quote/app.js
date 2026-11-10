/* ================= Fiyat al sayfası: yükle → boyutla → malzeme seç → sipariş ================= */
(function(){
const C=QUOTE_CFG,$=id=>document.getElementById(id);
const st={name:'',base:null,stats:null,check:null,unit:1,pct:100,material:'PLA',color:0,infill:'normal',qty:1,orient:0,lastTotal:null};
const effScale=()=>st.unit*st.pct/100;
const curSize=()=>st.base.size.map(v=>v*effScale());
$('brand').textContent=C.brand;document.title='Fiyat al – '+C.brand;

/* ---------- 3D sahne ---------- */
const vp=$('vp'),renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));vp.prepend(renderer.domElement);
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(35,1,1,10000);
const ctl=new THREE.OrbitControls(cam,renderer.domElement);ctl.enableDamping=true;ctl.dampingFactor=.12;ctl.maxPolarAngle=Math.PI*.495;
scene.add(new THREE.HemisphereLight(0xffffff,0x9aa0a6,.75));
const sun=new THREE.DirectionalLight(0xffffff,.75);sun.position.set(300,600,400);scene.add(sun);
const fill=new THREE.DirectionalLight(0xffffff,.25);fill.position.set(-400,200,-300);scene.add(fill);
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
/* Yazıcı tablası: dokulu PEI plaka hissi (altın rengi, ince nokta deseni) ve basılabilir alanın sınırı */
const [BW,BH,BD]=C.bed;
function plateTexture(){const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');
 g.fillStyle=css('--plate')||'#b8975a';g.fillRect(0,0,512,512);
 for(let i=0;i<9000;i++){const a=Math.random()*.10;g.fillStyle=Math.random()<.5?`rgba(0,0,0,${a})`:`rgba(255,255,255,${a})`;g.fillRect(Math.random()*512,Math.random()*512,2,2)}
 g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=1;for(let i=1;i<8;i++){const p=i*64;g.beginPath();g.moveTo(p,0);g.lineTo(p,512);g.moveTo(0,p);g.lineTo(512,p);g.stroke()}
 const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t}
const plateMat=new THREE.MeshStandardMaterial({map:plateTexture(),roughness:.85,metalness:.15});
const plate=new THREE.Mesh(new THREE.BoxGeometry(BW+14,4,BD+14),plateMat);plate.position.y=-2.01;scene.add(plate);
const volBox=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BW,BH,BD)),new THREE.LineBasicMaterial({color:0x7d8794,transparent:true,opacity:.35}));
volBox.position.y=BH/2;scene.add(volBox);
const modelMat=new THREE.MeshStandardMaterial({color:C.colors[0].hex,roughness:.55,metalness:.02});
let mesh=null;

function resize(){const w=vp.clientWidth,h=vp.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}
new ResizeObserver(resize).observe(vp);resize();
(function loop(){requestAnimationFrame(loop);ctl.update();renderer.render(scene,cam)})();

function frame(view){const s=effScale(),sz=st.base?st.base.size.map(v=>v*s):[120,80,120];
 const R=Math.max(sz[0],sz[1],sz[2],60)*1.15,tgt=new THREE.Vector3(0,sz[1]/2,0),k=R/Math.tan(cam.fov*Math.PI/360);
 const dir={iso:[1,.75,1.25],front:[0,.02,1],side:[1,.02,0],top:[0,1,.0001]}[view||'iso'];
 const v=new THREE.Vector3(...dir).normalize().multiplyScalar(k*.8);cam.position.copy(tgt).add(v);ctl.target.copy(tgt);cam.near=Math.max(.5,k/200);cam.far=k*40;cam.updateProjectionMatrix()}
frame();
document.querySelectorAll('#views button').forEach(b=>b.onclick=()=>frame(b.dataset.view));

/* ---------- Dosya yükleme ---------- */
function positionsOf(obj){/* her türlü geometriyi tek indekssiz üçgen dizisine çevir (dünya dönüşümü uygulanmış) */
 const parts=[];obj.updateMatrixWorld(true);
 obj.traverse(o=>{if(!o.isMesh||!o.geometry)return;let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);parts.push(g.attributes.position.array)});
 const n=parts.reduce((a,p)=>a+p.length,0),out=new Float32Array(n);let k=0;parts.forEach(p=>{out.set(p,k);k+=p.length});return out}

function parseModel(ext,buf){let pos;
 if(ext==='stl')pos=positionsOf(new THREE.Mesh(new THREE.STLLoader().parse(buf)));
 else pos=positionsOf(new THREE.OBJLoader().parse(new TextDecoder().decode(buf)));
 if(!pos.length||pos.length<9)throw new Error('boş');
 rotate(pos,'x',-1);/* STL/OBJ dosyaları genelde Z yukarı: Y yukarıya çevir */
 return pos}
function loadFile(f){if(!f)return;const ext=(f.name.split('.').pop()||'').toLowerCase();
 if(!['stl','obj'].includes(ext)){toast('Bu dosya türü açılmıyor. STL ya da OBJ dosyası seç.');return}
 const r=new FileReader();r.onerror=()=>toast('Dosya okunamadı.');
 r.onload=()=>{try{setModel(f.name,parseModel(ext,r.result))}catch(e){toast('Dosya açılamadı. Bozuk ya da boş olabilir.')}};
 r.readAsArrayBuffer(f)}

function rotate(pos,axis,sgn){/* 90° döndür (sgn: +1/-1) */
 for(let i=0;i<pos.length;i+=3){const x=pos[i],y=pos[i+1],z=pos[i+2];
  if(axis==='x'){pos[i+1]=-sgn*z;pos[i+2]=sgn*y}else{pos[i]=sgn*z;pos[i+2]=-sgn*x}}}
function seat(pos){/* tablanın ortasına otur: alt y=0, x/z merkezde */
 const s=meshStats(pos),cx=(s.min[0]+s.max[0])/2,cz=(s.min[2]+s.max[2])/2,y0=s.min[1];
 for(let i=0;i<pos.length;i+=3){pos[i]-=cx;pos[i+1]-=y0;pos[i+2]-=cz}}

function setModel(name,pos){seat(pos);st.name=name;st.orig=pos;st.pos=Float32Array.from(pos);st.orient=0;st.unit=1;st.pct=100;
 st.check=meshCheck(pos);rebuild();
 /* çok büyük modeli otomatik sığdır */
 const fi=fitInfo(st.base.size);if(!fi.fits)st.pct=Math.max(10,Math.floor(fi.maxScale*100));
 $('empty').hidden=true;$('views').hidden=false;$('dims').hidden=false;
 $('s2').classList.remove('off');$('s3').classList.remove('off');$('order').disabled=false;
 $('fileBox').hidden=false;$('fileBox').className='file';
 $('fileBox').innerHTML='';const b=document.createElement('b');b.textContent=name;const ch=document.createElement('button');ch.className='link';ch.textContent='Değiştir';ch.onclick=()=>$('file').click();
 $('fileBox').append(b,ch);
 fileNotes(!fi.fits);update(true);frame()}

function rebuild(){const pos=st.pos;st.base=meshStats(pos);
 /* destek: Y yukarı, aşağı −Y. En iyi yön de bir kez hesaplanır */
 st.sup=printAnalyze(pos,null,[0,-1,0],C.overhang);st.best=st.sup.needs?bestDown(pos,null,[0,-1,0],C.overhang):null;
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.computeVertexNormals();
 if(mesh){scene.remove(mesh);mesh.geometry.dispose()}mesh=new THREE.Mesh(g,modelMat);scene.add(mesh)}

function fileNotes(autoFit){const box=$('fileNotes');box.innerHTML='';
 const add=(html,good)=>{const d=document.createElement('div');d.className='note'+(good?' good':'');d.innerHTML=html;box.append(d);return d};
 if(!st.check.closed)add('<b>Modelde açık yerler var.</b> Fiyat yaklaşık çıkabilir; baskıdan önce kontrol edip sana haber veririz.');
 const u=guessUnit(st.base.size);
 if(u==='small'){const d=add('<b>Model çok küçük görünüyor</b> ('+fmtNum(Math.max(...st.base.size),1)+' mm). Dosya santimetre ya da inç ile kaydedilmiş olabilir.<div class="row"><button class="ghost" data-u="10">Santimetreymiş, düzelt</button><button class="ghost" data-u="25.4">İnçmiş, düzelt</button></div>');
  d.querySelectorAll('button').forEach(b=>b.onclick=()=>{st.unit=+b.dataset.u;const fi=fitInfo(st.base.size.map(v=>v*st.unit));if(!fi.fits)st.pct=Math.floor(fi.maxScale*100);d.remove();update(true);frame()})}
 if(autoFit)add('Model yazıcıya sığmayacak kadar büyüktü, sığacak boyuta (%'+st.pct+') küçülttük.',true)}

$('pick').onclick=()=>$('file').click();
$('file').onchange=e=>{loadFile(e.target.files[0]);e.target.value=''};
let dragN=0;
addEventListener('dragenter',e=>{e.preventDefault();dragN++;document.body.classList.add('dragging')});
addEventListener('dragleave',()=>{if(--dragN<=0){dragN=0;document.body.classList.remove('dragging')}});
addEventListener('dragover',e=>e.preventDefault());
addEventListener('drop',e=>{e.preventDefault();dragN=0;document.body.classList.remove('dragging');loadFile(e.dataTransfer.files[0])});
$('sample').onclick=()=>{/* örnek: düğümlü halka (kapalı yüzey) */
 const g=new THREE.TorusKnotGeometry(28,9,220,32);g.rotateX(Math.PI/2);
 const pos=Float32Array.from(g.toNonIndexed().attributes.position.array);setModel('ornek-dugum.stl',pos)};

/* ---------- Boyut ---------- */
$('scale').oninput=e=>{st.pct=+e.target.value;update()};
$('minus').onclick=()=>{st.pct=Math.max(10,st.pct-5);update()};
$('plus').onclick=()=>{st.pct=Math.min(300,st.pct+5);update()};
[['w',0],['h',1],['d',2]].forEach(([id,k])=>$(id).onchange=e=>{const v=parseFloat(String(e.target.value).replace(',','.'));
 if(!(v>0)){update();return}st.pct=Math.min(1000,Math.max(1,v/(st.base.size[k]*st.unit)*100));update()});
$('turn').onclick=()=>{/* sırayla farklı bir yüzü tabana yatır: asıl → öne yatık → yana yatık */
 st.orient=(st.orient+1)%3;const p=Float32Array.from(st.orig);if(st.orient===1)rotate(p,'x',1);if(st.orient===2)rotate(p,'z',1);
 seat(p);st.pos=p;rebuild();update(true);frame()};
$('reset').onclick=()=>{st.pct=100;update(true);frame()};

function fitNote(){const box=$('fitNote');box.innerHTML='';const fi=fitInfo(curSize());if(fi.fits)return;
 const p=Math.floor(st.pct*fi.maxScale),d=document.createElement('div');d.className='note';
 d.innerHTML='<b>Bu boyutta yazıcıya sığmıyor.</b> En fazla %'+p+' olabilir.<br><button class="ghost">Sığacak boyuta küçült</button>';
 d.querySelector('button').onclick=()=>{st.pct=Math.max(1,p);update(true);frame()};box.append(d)}

/* ---------- Malzeme, renk, sağlamlık, adet ---------- */
function radios(box,items,cur,onPick){box.innerHTML='';
 items.forEach(it=>{const b=document.createElement('button');b.className='choice';b.setAttribute('role','radio');b.dataset.k=it.key;
  b.innerHTML='<span class="dot"></span><span><b></b><small></small></span><span class="tag"></span>';
  b.querySelector('b').textContent=it.name;b.querySelector('small').textContent=it.note;
  b.onclick=()=>{onPick(it.key);mark()};box.append(b)});
 function mark(){box.querySelectorAll('.choice').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.k===cur())))}mark();return box}
radios($('mats'),Object.keys(C.materials).map(k=>({key:k,...C.materials[k]})),()=>st.material,k=>{st.material=k;update()});
radios($('infills'),C.infills,()=>st.infill,k=>{st.infill=k;update()});
C.colors.forEach((c,i)=>{const b=document.createElement('button');b.className='sw';b.style.background=c.hex;b.setAttribute('role','radio');b.setAttribute('aria-label',c.name);b.title=c.name;
 b.onclick=()=>{st.color=i;markColor();modelMat.color.set(c.hex)};$('colors').append(b)});
function markColor(){$('colors').querySelectorAll('.sw').forEach((b,i)=>b.setAttribute('aria-checked',String(i===st.color)));$('colorName').textContent=C.colors[st.color].name}markColor();
$('qMinus').onclick=()=>{st.qty=Math.max(1,st.qty-1);update()};
$('qPlus').onclick=()=>{st.qty=Math.min(99,st.qty+1);update()};

/* ---------- Hesap ve ekran ---------- */
const opts=over=>Object.assign({scale:effScale(),material:st.material,infill:st.infill,qty:st.qty,supportVol:st.sup?st.sup.supV:0},over||{});
function update(){if(!st.base)return;
 st.pct=Math.round(Math.min(1000,Math.max(1,st.pct))*10)/10;
 const s=effScale();mesh.scale.setScalar(s);
 $('scale').value=Math.min(300,Math.max(10,st.pct));$('pct').textContent='%'+fmtNum(st.pct,st.pct%1?1:0);
 const sz=curSize();[['w',0],['h',1],['d',2]].forEach(([id,k])=>{if(document.activeElement!==$(id))$(id).value=Math.round(sz[k]*10)/10});
 $('dims').textContent=fmtNum(sz[0],1)+' × '+fmtNum(sz[2],1)+' × '+fmtNum(sz[1],1)+' mm';
 fitNote();
 const e=estimate(st.base,opts());st.est=e;supNote(e);
 const fits=fitInfo(sz).fits;
 const pe=$('price');pe.textContent=fits?fmtNum(e.total)+' '+C.currency:'—';
 if(fits&&e.total!==st.lastTotal){pe.classList.remove('flash');void pe.offsetWidth;pe.classList.add('flash')}st.lastTotal=e.total;
 $('priceInfo').textContent=fits?'Yaklaşık '+fmtNum(e.grams*e.qty,e.grams<10?1:0)+' g malzeme'+(e.supGrams>.5?' (destek dahil)':'')+', '+fmtHours(e.hours*e.qty)+' baskı'+(e.qty>1?' ('+e.qty+' adet)':'')+(e.minApplied?'. En düşük sipariş tutarı uygulandı.':''):'Yazıcıya sığmayan boyutun fiyatı hesaplanmaz.';
 $('order').disabled=!fits;
 cheaperHint(fits,e)}

function supNote(e){/* havada kalan yerler: destek gramı ve daha az destekli yön önerisi */
 const box=$('supNote');box.innerHTML='';if(!st.sup||!st.sup.needs||e.supGrams<.5)return;
 const d=document.createElement('div');d.className='note';
 d.innerHTML='<b>Bazı yerler havada kalıyor.</b> Altlarına sonradan sökülen destek basılacak (yaklaşık '+fmtNum(e.supGrams*e.qty,e.supGrams<10?1:0)+' g, fiyata dahil).';
 const b=st.best;if(b&&b.changed){const s=effScale()**3*C.supportFill/1000*C.materials[st.material].density,save=(b.cur.supV-b.res.supV)*s*st.qty;
  if(save>=.5){const btn=document.createElement('button');btn.className='ghost';btn.textContent='Daha az destekle yatır ('+fmtNum(save,save<10?1:0)+' g daha az)';
   btn.onclick=()=>{const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...b.down),new THREE.Vector3(0,-1,0)),v=new THREE.Vector3(),p=st.pos;
    for(let i=0;i<p.length;i+=3){v.set(p[i],p[i+1],p[i+2]).applyQuaternion(q);p[i]=v.x;p[i+1]=v.y;p[i+2]=v.z}
    seat(p);rebuild();update(true);frame();toast('Model en az destek isteyen yöne çevrildi.')};
   d.append(document.createElement('br'),btn)}}
 box.append(d)}
function cheaperHint(fits,e){/* "Pahalı mı geldi?" — tek tıkla daha ucuz seçenek */
 const b=$('cheaper');b.hidden=true;if(!fits||e.minApplied)return;
 let alt=null;
 if(st.infill!=='light'){const x=estimate(st.base,opts({infill:'light'}));if(x.total<e.total)alt={t:x.total,txt:'"Hafif" sağlamlıkla',run:()=>{st.infill='light';radios($('infills'),C.infills,()=>st.infill,k=>{st.infill=k;update()})}}}
 if(!alt&&st.pct>20){const p=Math.round(st.pct*.8),x=estimate(st.base,opts({scale:st.unit*p/100}));if(x.total<e.total)alt={t:x.total,txt:'%'+p+' boyutta',run:()=>{st.pct=p}}}
 if(!alt)return;b.hidden=false;b.textContent='Pahalı mı geldi? '+alt.txt+' '+fmtNum(alt.t)+' '+C.currency+' olur, öyle yap';
 b.onclick=()=>{alt.run();update(true)}}

/* ---------- Sipariş ---------- */
function stlOut(){/* ölçek uygulanmış, Z yukarı ikili STL */
 const p=st.pos,s=effScale(),T=p.length/9,buf=new ArrayBuffer(84+50*T),dv=new DataView(buf);dv.setUint32(80,T,true);let o=84;
 const v=i=>[p[i]*s,-p[i+2]*s,p[i+1]*s];
 for(let t=0;t<T;t++){const a=v(9*t),b=v(9*t+3),c=v(9*t+6),u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],w=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
  const n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]],l=Math.hypot(...n)||1;
  for(const x of [n[0]/l,n[1]/l,n[2]/l,...a,...b,...c]){dv.setFloat32(o,x,true);o+=4}o+=2}
 return buf}
function summary(){const e=st.est,sz=curSize();return[
 ['Model',st.name],['Ölçüler',fmtNum(sz[0],1)+' × '+fmtNum(sz[2],1)+' × '+fmtNum(sz[1],1)+' mm'],
 ['Malzeme',e.material+', '+C.colors[st.color].name],['Sağlamlık',C.infills.find(f=>f.key===st.infill).name],['Adet',String(e.qty)],
 ['Tahmini fiyat',fmtNum(e.total)+' '+C.currency]]}
$('order').onclick=()=>{const t=$('sum');t.innerHTML='';summary().forEach(([k,v])=>{const r=t.insertRow();r.insertCell().textContent=k;r.insertCell().textContent=v});$('dlg').showModal()};
$('orderForm').onsubmit=e=>{if(e.submitter&&e.submitter.value!=='send')return;
 const name=$('oName').value.trim(),phone=$('oPhone').value.trim();if(!name||!phone){e.preventDefault();return}
 const order={name,phone,note:$('oNote').value.trim(),items:Object.fromEntries(summary()),grams:Math.round(st.est.grams),scale:effScale(),material:st.material,infill:st.infill,qty:st.qty,total:st.est.total};
 const fileName=st.name.replace(/\.[^.]+$/,'')+'-'+Math.round(st.pct)+'.stl',stl=stlOut();
 if(window.parent!==window){window.parent.postMessage({type:'3ddream-order',order,fileName,stl},'*',[stl]);toast('Siparişin alındı. Seni arayacağız.');return}
 if(!C.whatsapp){e.preventDefault();toast('Sipariş gönderme henüz açılmadı. Lütfen daha sonra tekrar dene.');return}
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([stl],{type:'model/stl'}));a.download=fileName;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
 const txt='Merhaba, '+C.brand+' sipariş:\n'+summary().map(([k,v])=>k+': '+v).join('\n')+'\nAd: '+name+'\nTelefon: '+phone+(order.note?'\nNot: '+order.note:'')+'\n(Dosyayı bu mesaja ekliyorum: '+fileName+')';
 open('https://wa.me/'+C.whatsapp+'?text='+encodeURIComponent(txt),'_blank');
 toast('WhatsApp açılıyor. İnen '+fileName+' dosyasını mesaja ekle.')};

/* DreamDesign'dan gelen model: bastir.html#dd penceresi açılınca hazır olduğunu bildirir, modeli bekler */
function setRadios(){radios($('mats'),Object.keys(C.materials).map(k=>({key:k,...C.materials[k]})),()=>st.material,k=>{st.material=k;update()});
 radios($('infills'),C.infills,()=>st.infill,k=>{st.infill=k;update()})}
addEventListener('message',e=>{const d=e.data;if(!d||d.type!=='dd-quote-model'||(window.opener&&e.source!==window.opener))return;
 try{if(C.materials[d.material])st.material=d.material;if(C.infills.some(i=>i.key===d.infill))st.infill=d.infill;setRadios();
  setModel(d.name||'dreamdesign.stl',parseModel('stl',d.stl));toast('Model DreamDesign\'dan geldi.')}catch(err){toast('DreamDesign modeli açılamadı.')}});
if(location.hash==='#dd'&&window.opener)try{window.opener.postMessage({type:'dd-quote-ready'},'*')}catch(e){}

let tt;function toast(m){const t=$('toast');t.textContent=m;t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,4200)}
window.__quote={st,setModel,update,estimate:()=>st.est};
})();
