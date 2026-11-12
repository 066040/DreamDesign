/* Basit mod: şekil ekle, ölçü, renk, döndür, kaba çevir, köşe yuvarla, delik, birleştir, dosya olarak indir */
const H=require('./harness.js'),path=require('path');let fails=0;
const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const near=(a,b,t)=>Math.abs(a-b)<=t*Math.max(1,Math.abs(b));
const h=H(path.join(__dirname,'..','docs','index.html'));
h.w.__manifoldLoader=async()=>(await import(require.resolve('manifold-3d/manifold.js'))).default;
const run=(name,code)=>{try{return h.T(code)}catch(e){fails++;console.log('FAIL',name,'→ HATA',e.stack.split('\n').slice(0,4).join(' | '));return null}};
const arun=async(name,code)=>{try{return await h.run('(async()=>{'+code+'})()','test')}catch(e){fails++;console.log('FAIL',name,'→ HATA',e.stack.split('\n').slice(0,4).join(' | '));return null}};
const $=s=>`document.querySelector('${s}')`;
(async()=>{
let r=run('örnek sahne',`const n0=parts.length;try{localStorage.clear()}catch(_){}setUI('simple');return{n0,n:parts.length,com:comMarker.visible,price:!!${$('#sPrice')}||!!${$('#sOrder')},undo:Hist.undo.length}`);
ok(r&&r.n0===2&&r.n===0&&!r.com&&r.price===false&&r.undo===0,'basit moda ilk girişte örnek parçalar temizlenir, ağırlık merkezi gizlenir; fiyat ve sipariş yok '+JSON.stringify(r));
r=run('aç',`[...parts].forEach(removePart);select(null);try{localStorage.clear()}catch(_){}setUI('simple');
 return{cls:document.body.classList.contains('simple'),hid:${$('#simple')}.hidden,guide:${$('#sGuide')}.hidden,on:${$('#mtoggle [data-ui=simple]')}.getAttribute('aria-checked'),mode,price:${$('#sExInfo')}.textContent,order:${$('#sExport')}.disabled}`);
ok(r&&r.cls&&!r.hid&&!r.guide&&r.on==='true'&&/Önce bir şekil/.test(r.price)&&r.order,'basit mod açıldı, ilk açılış rehberi görünür, indirme kapalı '+JSON.stringify(r));
r=run('rehber',`${$('#sGuideOk')}.click();setUI('simple');return ${$('#sGuide')}.hidden`);ok(r===true,'"Anladım" sonrası rehber bir daha çıkmaz');

r=run('kutu',`${$('[data-add=box]')}.click();const p=sel,b=worldBox(p);
 return{n:parts.length,size:p.size,minz:b.mn[2],mat:p.mat,w:${$('#sW')}.value,name:${$('#sSelName')}.textContent,price:${$('#sExport')}.disabled,edit:${$('#sEdit')}.hidden,msg:${$('#sMsg')}.textContent}`);
ok(r&&r.n===1&&r.size.join()==='40,40,40'&&Math.abs(r.minz)<1e-6&&r.mat==='PLA'&&r.w==='40'&&/Kutu/.test(r.name)&&!r.edit,'kutu eklendi: 40 mm, tablada, PLA, panel dolu');
ok(r&&r.price===false&&/eklendi/.test(r.msg),'şekil eklenince "STL olarak indir" açılır');

r=run('ölçü',`const p=sel;${$('#sW')}.value='60';${$('#sW')}.dispatchEvent(new Event('change'));const a=p.size.slice();
 ${$('#sLock')}.checked=true;${$('#sH')}.value='80';${$('#sH')}.dispatchEvent(new Event('change'));const b=p.size.slice();${$('#sLock')}.checked=false;
 ${$('#sD')}.value='-3';${$('#sD')}.dispatchEvent(new Event('change'));return{a,b,c:p.size.slice(),d:${$('#sD')}.value,minz:worldBox(p).mn[2]}`);
ok(r&&r.a.join()==='60,40,40','genişlik 60 yazıldı, diğerleri aynı');
ok(r&&r.b.map(v=>+v.toFixed(6)).join()==='120,80,80'&&Math.abs(r.minz)<1e-6,'"hepsi aynı oranda": yükseklik 80 → hepsi ×2, tabla üstünde');
ok(r&&r.c.join()===r.b.join()&&r.d==='80','geçersiz ölçü (−3) yok sayıldı');
r=run('renk',`const p=sel,b=document.querySelectorAll('#sColors button')[4];b.click();return{c:p.color,on:document.querySelectorAll('#sColors button')[4].getAttribute('aria-checked')}`);
ok(r&&r.c==='#2f6fdb'&&r.on==='true','renk seçildi (mavi)');
r=run('döndür',`const p=sel,s0=p.size.slice();${$('#sTurn')}.click();const s1=parts.find(q=>q.vis).size.slice();return{s0,s1}`);
ok(r&&near(r.s1[0],r.s0[1],1e-6)&&near(r.s1[1],r.s0[0],1e-6),'90° döndürünce en ve boy yer değiştirdi');
r=run('mod sınırı',`setMode('cage');const a=mode;${$('#sMove')}.click();const b=mode,pr=${$('#sMove')}.getAttribute('aria-pressed'),z=tc.showZ;${$('#sMove')}.click();return{a,b,pr,z,c:mode}`);
ok(r&&r.a==='sec'&&r.b==='move'&&r.pr==='true'&&r.z===false&&r.c==='sec','basit modda karmaşık araçlar açılmaz; "Yerini değiştir" yalnız tabla üstünde taşır');

/* kaba çevir: 80×80×80 kutu, 2 mm duvar → iç 76×76×78 oyulur */
r=await arun('kap',`[...parts].forEach(removePart);select(null);${$('[data-add=box]')}.click();const p=sel;p.size=[80,80,80];apply(p);sit(p);refresh();
 ${$('#sCupBtn')}.click();const open=!${$('#sCup')}.hidden;${$('#sWall')}.value='2';await ${$('#sCupGo')}.onclick();const q=sel,b=worldBox(q);
 return{open,v:massInfo(q).vol,n:parts.length,h:b.mx[2]-b.mn[2],minz:b.mn[2],msg:${$('#sMsg')}.textContent,closed:${$('#sCup')}.hidden,c:q.color}`);
ok(r&&r.open&&near(r.v,80**3-76*76*78,1e-3)&&r.n===1&&near(r.h,80,1e-6)&&Math.abs(r.minz)<1e-6&&/Kap oldu/.test(r.msg)&&r.closed,'kaba çevir: hacim '+(r&&r.v.toFixed(0))+' = 512000 − 450528');
r=await arun('kalın duvar',`${$('[data-add=cyl]')}.click();${$('#sCupBtn')}.click();${$('#sWall')}.value='25';await ${$('#sCupGo')}.onclick();return ${$('#sMsg')}.textContent`);
ok(r&&/çok kalın/.test(r),'çok kalın duvar anlaşılır uyarı: '+r);
r=await arun('kalemlik',`${$('#sWall')}.value='2';await ${$('#sCupGo')}.onclick();const q=sel;return{v:massInfo(q).vol,msg:${$('#sMsg')}.textContent}`);
ok(r&&/Kap oldu/.test(r.msg)&&near(r.v,Math.PI*400*60-Math.PI*18*18*58,.01),'silindirden kalemlik: hacim '+(r&&r.v.toFixed(0)));

/* köşe yuvarla */
r=run('yuvarla',`[...parts].forEach(removePart);select(null);${$('[data-add=box]')}.click();const p=sel,pos=p.pos.slice(),c=p.color;${$('#sRoundBtn')}.click();
 ${$('#sRad')}.value='5';${$('#sRoundGo')}.click();const q=sel;return{t:q.type,rad:q.rad,size:q.size,same:q.pos[0]===pos[0],c:q.color===c,n:parts.length,msg:${$('#sMsg')}.textContent}`);
ok(r&&r.t==='rbox'&&r.rad===5&&r.size.join()==='40,40,40'&&r.same&&r.c&&r.n===1,'kutu köşeleri 5 mm yuvarlandı, ölçü/yer/renk aynı');
r=run('fazla yuvarla',`${$('#sRad')}.value='50';${$('#sRoundGo')}.click();return{rad:sel.rad,msg:${$('#sMsg')}.textContent}`);
ok(r&&r.rad===20&&/En fazla/.test(r.msg),'yarıçap ölçüye sığacak kadar sınırlandı');
r=run('küre yuvarla',`${$('[data-add=sph]')}.click();${$('#sRoundBtn')}.click();return{d:${$('#sRoundGo')}.disabled,t:${$('#sRoundTip')}.textContent}`);
ok(r&&!r.d&&/dış kenarlarını/.test(r.t),'kutu dışındaki şekillerde de yuvarlama açık, ne yaptığı yazıyor');

/* delik: 40 mm kutunun üstüne Ø6 boydan boya */
r=await arun('delik',`[...parts].forEach(removePart);select(null);${$('[data-add=box]')}.click();const p=sel,v0=massInfo(p).vol;
 ${$('#sHoleBtn')}.click();const m=mode,dis=${$('#sHoleGo')}.disabled;const b=worldBox(p);
 holePlace(p,new THREE.Vector3((b.mn[0]+b.mx[0])/2,(b.mn[1]+b.mx[1])/2,b.mx[2]),new THREE.Vector3(0,0,1));const en=!${$('#sHoleGo')}.disabled;
 ${$('#sHoleD')}.value='6';await ${$('#sHoleGo')}.onclick();const q=sel;return{m,dis,en,v0,v:massInfo(q).vol,msg:${$('#sMsg')}.textContent}`);
ok(r&&r.m==='hole'&&r.dis&&r.en,'delik: önce yere tıklat, sonra düğme açılır');
ok(r&&near(r.v0-r.v,Math.PI*9*40,.02)&&/delik açıldı/.test(r.msg),'Ø6 boydan boya delik: eksilen hacim '+(r&&(r.v0-r.v).toFixed(0))+' ≈ '+(Math.PI*9*40).toFixed(0));

/* birleştir: iki üst üste kutu → tek parça */
r=await arun('birleştir',`[...parts].forEach(removePart);select(null);${$('[data-add=box]')}.click();const a=sel;${$('[data-add=box]')}.click();const b=sel;
 b.pos=[a.pos[0]+20,a.pos[1],a.pos[2]];apply(b);refresh();const vis=!${$('#sJoinSec')}.hidden;await ${$('#sJoin')}.onclick();
 return{vis,n:parts.length,v:massInfo(parts[0]).vol,name:parts[0].name,msg:${$('#sMsg')}.textContent}`);
ok(r&&r.vis&&r.n===1&&near(r.v,40*40*60,1e-3)&&/tek parça/.test(r.msg),'iki kutu birleşti: hacim '+(r&&r.v.toFixed(0))+' = 40×40×60');

/* dosya olarak indir */
r=run('indir',`let got=null;const d0=download;download=(n,data)=>{got={n,len:(data.byteLength||data.length)};return true};${$('#sExport')}.click();download=d0;
 const tris=parts.filter(p=>p.vis&&!p.ghost).reduce((s,p)=>s+p.mesh.geometry.index.count/3,0);return{got,tris,msg:${$('#sMsg')}.textContent,info:${$('#sExInfo')}.textContent}`);
ok(r&&r.got&&r.got.n==='dreamdesign.stl'&&r.got.len===84+50*r.tris&&/indirildi/.test(r.msg),'"STL olarak indir": görünen şekiller tek STL ('+(r&&r.got&&r.got.len)+' bayt)');
r=run('gelişmiş',`setUI('adv');return{cls:document.body.classList.contains('simple'),z:tc.showZ,st:localStorage.getItem('dd-ui')}`);
ok(r&&!r.cls&&r.z&&r.st==='adv','gelişmiş moda dönüş hatırlandı');

ok(h.errs.length===0,'yakalanmamış hata yok '+h.errs.join('|'));
console.log(fails?('HATA '+fails):'TÜMÜ GEÇTİ');process.exit(fails?1:0)})();
