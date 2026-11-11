/* Yapılanlar listesi (app12): adımların kaydı, ölçü değişince yeniden kurma, kilitlenme, kaydet/yükle, arayüz */
const H=require('./harness.js'),path=require('path');let fails=0;
const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const near=(a,b,t)=>Math.abs(a-b)<=t*Math.max(1,Math.abs(b));
const h=H(path.join(__dirname,'..','docs','index.html'));
h.w.__manifoldLoader=async()=>(await import(require.resolve('manifold-3d/manifold.js'))).default;
const arun=async(name,code)=>{try{return await h.run('(async()=>{'+code+'})()','test')}catch(e){fails++;console.log('FAIL',name,'→ HATA',e.stack.split('\n').slice(0,4).join(' | '));return null}};
const cyl=(d,L)=>.5*64*(d/2)**2*Math.sin(2*Math.PI/64)*L;      // 64 kenarlı delik hacmi
/* ortak yardımcılar (sayfa içinde) */
const lib=`const V=p=>massInfo(p).vol,lab=p=>rcLabels(rcEff(p),p),wb=p=>{const b=worldBox(p);return[...b.mn,...b.mx].map(v=>+v.toFixed(3))};
 const fresh=(sz,pos)=>{[...parts].forEach(removePart);select(null);setUI('adv');const p=add('box',sz,pos||[0,0,sz[2]/2]);histReset();return p};
 const drill=async(p,pt,n,d,dep,op)=>{hOp=op||'cut';holePlace(p,new THREE.Vector3(...pt),new THREE.Vector3(...n));
  document.querySelector('#hld').value=d;document.querySelector('#hldep').value=dep||0;document.querySelector('#hldir').value='n';document.querySelector('#hlfit').value=0;const np=await holeDo();hOp='cut';return np};`;
(async()=>{
let r=await arun('kayıt',lib+`const p=fresh([25,25,10]);const l0=lab(p),n0=parts.length;
 const q=await drill(p,[5,-4,10],[0,0,1],3,0);
 return{l0,l1:lab(q),v:V(q),n:parts.length-n0,steps:q.rc.steps.length,o:q.rc.steps[0].o,und:Hist.undo.length}`);
ok(r&&r.l0.length===1&&/^Kutu 25 × 25 × 10 mm/.test(r.l0[0]),'yeni kutunun tarifi tek satır: '+(r&&r.l0));
ok(r&&r.steps===1&&/Delik Ø3 mm, boydan boya/.test(r.l1[1])&&r.n===0,'delik adım olarak yazıldı: '+(r&&r.l1.join(' → ')));
ok(r&&near(r.v,6250-cyl(3,10),1e-4)&&Math.abs(r.o)<1e-6,'delikli hacim doğru, delik yüzeye bağlı '+(r&&r.v.toFixed(2)));

r=await arun('çap',lib+`const p=fresh([25,25,10]);let q=await drill(p,[5,-4,10],[0,0,1],3,0);const b0=wb(q),id0=q.id,u0=Hist.undo.length;
 const q2=await rcEdit(q,0,{d:6,dep:0});const v2=V(q2),l2=lab(q2),b2=wb(q2),u1=Hist.undo.length,selOk=sel===q2&&parts[0]===q2;
 histUndo();const pu=parts[0];const vu=V(pu),lu=lab(pu);histRedo();
 return{v2,l2,same:JSON.stringify(b0)===JSON.stringify(b2),n:parts.length,du:u1-u0,vu,lu,vr:V(parts[0]),selOk}`);
ok(r&&near(r.v2,6250-cyl(6,10),1e-4)&&/Ø6 mm/.test(r.l2[1]),'çap 3 → 6: parça yeniden kuruldu '+(r&&r.l2.join(' → ')));
ok(r&&r.same&&r.n===1&&r.selOk,'parça yerinde kaldı, sayı değişmedi, seçim korundu');
ok(r&&r.du===1&&near(r.vu,6250-cyl(3,10),1e-4)&&/Ø3 mm/.test(r.lu[1])&&near(r.vr,6250-cyl(6,10),1e-4),'tek geri-al adımı; geri alınca tarif de eski haline döner, ileri alınca yenisine');

r=await arun('temel ölçü',lib+`const p=fresh([25,25,10]);let q=await drill(p,[5,-4,10],[0,0,1],3,4);const v1=V(q);
 q=await rcEdit(q,'b',{x:20,y:25,z:16});const b=wb(q);
 /* deliğin dibi: üstten 4 mm aşağıda olmalı (yükseklik 10 → 16 olsa da) */
 const ray=new THREE.Raycaster(new THREE.Vector3(5,-4,50),new THREE.Vector3(0,0,-1));apply(q);q.mesh.geometry.computeBoundingSphere();const hit=ray.intersectObject(q.mesh)[0];
 return{v1,v:V(q),b,floor:hit&&hit.point.z,l:lab(q)}`);
ok(r&&near(r.v1,6250-cyl(3,4),1e-4),'kör delik 4 mm '+(r&&r.v1.toFixed(2)));
ok(r&&near(r.v,20*25*16-cyl(3,4),1e-4)&&/^Kutu 20 × 25 × 16 mm/.test(r.l[0]),'temel 20×25×16 olunca delik korunur, hacim doğru '+(r&&r.v.toFixed(2)));
ok(r&&near(r.b[2],0,1e-6)&&near(r.b[5],16,1e-4)&&near(r.b[0],-10,1e-4)&&near(r.b[3],10,1e-4),'parça tablada, merkezi yerinde '+(r&&r.b));
ok(r&&near(r.floor,12,1e-3),'delik yeni üst yüzeyden başlar, derinlik 4 mm kalır (dip z='+(r&&r.floor)+')');

r=await arun('zincir',lib+`const p=fresh([40,30,20]);let q=await sCup(p,2);if(q.ground)sit(q);const vc=V(q);
 q=await drill(q,[20,0,10],[1,0,0],4,0);const vh=V(q);
 bakeTurn(q,2);const vt=V(q),bt=wb(q),lt=lab(q);
 q=await rcEdit(q,0,{wall:3});const b=wb(q);
 return{vc,vh,vt,v:V(q),bt,b,lt,l:lab(q)}`);
const cupV=(w)=>40*30*20-(40-2*w)*(30-2*w)*(20-w);
ok(r&&near(r.vc,cupV(2),1e-4)&&r.lt.length===4,'kap + delik + döndürme sırayla yazıldı: '+(r&&r.lt.join(' → ')));
ok(r&&near(r.vh,r.vt,1e-6)&&near(r.bt[3]-r.bt[0],30,1e-4)&&near(r.bt[4]-r.bt[1],40,1e-4),'döndürme hacmi değiştirmez, X/Y yer değiştirir');
/* yan duvardaki boydan boya Ø4 delik iki duvarı da deler: duvar 2 → 3 olunca delik hacmi de büyür */
ok(r&&near(r.v,cupV(3)-2*cyl(4,3),2e-3)&&/duvar 3 mm/.test(r.l[1]),'duvar 2 → 3 mm: kap, delik ve döndürme yeniden uygulandı '+(r&&r.v.toFixed(1))+' ≈ '+(cupV(3)-2*cyl(4,3)).toFixed(1));
ok(r&&JSON.stringify(r.b)===JSON.stringify(r.bt),'yeniden kurulan parça döndürülmüş haliyle aynı yerde '+(r&&r.b));

r=await arun('boyut',lib+`const p=fresh([20,20,10]);let q=await drill(p,[0,0,10],[0,0,1],4,0);
 q.size=[40,20,10];apply(q);sit(q);refresh();const l1=lab(q),v1=V(q);
 q=await rcEdit(q,1,{x:30,y:20,z:10});const l2=lab(q);
 q=await rcDelete(q,1);return{l1,v1,l2,l3:lab(q),v3:V(q),type:q.type}`);
ok(r&&r.l1.length===3&&/Boyut değişti: 40 × 20 × 10 mm/.test(r.l1[2])&&near(r.v1,2*(4000-cyl(4,10)),1e-4),'adımlardan sonra elle boyut değişince liste yeni adım gösterir '+(r&&r.l1[2]));
ok(r&&/30 × 20 × 10/.test(r.l2[2])&&r.l3.length===2&&near(r.v3,4000-cyl(4,10),1e-4),'boyut adımı değiştirilir ve kaldırılır');

r=await arun('kilit',lib+`const p=fresh([30,30,10]);let q=await drill(p,[0,0,10],[0,0,1],4,0);
 const a=q.mesh.geometry.attributes.position.array;for(let i=2;i<a.length;i+=3)if(a[i]>0)a[i]*=1.2;commitShape(q);refresh();   // kayıtsız biçim değişikliği (kafes/esnet gibi)
 const e=rcEff(q),l1=lab(q),f1=rcFields('b',e);
 q=await drill(q,[8,8,worldBox(q).mx[2]],[0,0,1],3,0);const v1=V(q),e2=rcEff(q);
 q=await rcEdit(q,0,{d:5,dep:0});return{frozen:!!e.frozen,l1,f1,nl:e2.locked.length,ns:e2.steps.length,v1,v:V(q),l:lab(q)}`);
ok(r&&r.frozen&&r.l1.length===3&&r.l1[2]==='Serbest şekil'&&r.f1===null,'kayıtsız değişiklikten sonra eski adımlar kilitlenir: '+(r&&r.l1.join(' → ')));
ok(r&&r.nl===2&&r.ns===1&&near(r.v1-r.v,cyl(5,11)-cyl(3,11),1e-3),'kilitli halin üstüne yeni adım eklenir ve değiştirilir '+(r&&r.l.join(' → ')));

r=await arun('hata',lib+`const p=fresh([20,20,10]);let q=await drill(p,[8,0,10],[0,0,1],2,0);const v0=V(q),id=q.id;let err='';
 try{await rcEdit(q,'b',{x:10,y:20,z:10})}catch(e){err=e.message}
 return{err,same:parts[0]===q&&parts.length===1,v:V(parts[0]),v0}`);
ok(r&&/2\. adım .*uygulanamadı.*dışında/.test(r.err)&&r.same&&r.v===r.v0,'delik parçanın dışında kalırsa hata verir, parça değişmez: '+(r&&r.err));

r=await arun('kaydet',lib+`const p=fresh([25,25,10]);let q=await drill(p,[5,-4,10],[0,0,1],3,0);
 const a=q.mesh.geometry.attributes.position.array;for(let i=0;i<a.length;i+=3)if(a[i]>0)a[i]*=1.1;commitShape(q);
 q=await drill(q,[-6,6,10],[0,0,1],2,0);q.pos[0]+=40;q.rot=[0,0,30];apply(q);refresh();
 const l0=lab(q),v0=V(q),js=JSON.stringify(projectData());
 loadProject(JSON.parse(js));const z=parts[0];select(z);const l1=lab(z);
 const z2=await rcEdit(z,0,{d:4,dep:0});
 return{l0,l1,str:typeof JSON.parse(js).parts[0].rc.base.P,dv:v0-V(z2),pos:z2.pos.map(v=>+v.toFixed(3)),rot:z2.rot,p0:z.pos.map(v=>+v.toFixed(3))}`);
ok(r&&JSON.stringify(r.l0)===JSON.stringify(r.l1)&&r.l1.length===4&&r.str==='string','tarif proje dosyasına yazılır ve geri okunur: '+(r&&r.l1.join(' → ')));
ok(r&&near(r.dv,cyl(4,10)-cyl(2,10),1e-3)&&JSON.stringify(r.pos)===JSON.stringify(r.p0)&&r.rot[2]===30,'yüklenen (taşınmış, döndürülmüş) parçada adım değiştirilir, parça yerinden oynamaz');

r=await arun('yuvarlat',lib+`const p=fresh([30,20,10]);let q=await roundPart(p,2,'chamfer','out');const v1=V(q);
 q=await rcEdit(q,0,{r:1});const c=document.querySelector('#doclone');c.click();const k=sel;
 return{v1,v:V(q),l:lab(q),lk:lab(k),kd:k!==q,kx:k.pos[0]-q.pos[0]}`);
ok(r&&r.v1<6000&&r.v>r.v1&&r.v<6000&&/1 mm pah kırıldı/.test(r.l[1]),'pah 2 → 1 mm yeniden hesaplandı ('+(r&&r.v1.toFixed(1)+' → '+r.v.toFixed(1))+')');
ok(r&&r.kd&&JSON.stringify(r.l)===JSON.stringify(r.lk)&&r.kx>0,'kopya tarifi de taşır');

r=await arun('arayüz',lib+`const p=fresh([25,25,10]);let q=await drill(p,[5,-4,10],[0,0,1],3,0);select(q);
 const L=document.querySelector('#rcList'),rows=()=>[...L.querySelectorAll('.rc-row')].map(x=>x.querySelector('.rc-t').textContent);
 const r0=rows();L.querySelector('[data-rce="0"]').click();const inp=L.querySelectorAll('.rc-ed input');const nIn=inp.length;inp[0].value='8';
 L.querySelector('[data-rcgo]').click();for(let i=0;i<200&&rcBusy;i++)await new Promise(r=>setTimeout(r,10));await new Promise(r=>setTimeout(r,10));
 const r1=rows(),v=V(sel),m=document.querySelector('#rcMsg').textContent;
 L.querySelector('[data-rce="b"]').click();const bi=L.querySelectorAll('.rc-ed input');bi[0].value='-3';L.querySelector('[data-rcgo]').click();const m2=document.querySelector('#rcMsg').textContent,v2=V(sel);
 L.querySelector('[data-rcd="0"]').click();for(let i=0;i<200&&rcBusy;i++)await new Promise(r=>setTimeout(r,10));await new Promise(r=>setTimeout(r,10));
 const r3=rows(),v3=V(sel);
 setUI('simple');const S=document.querySelector('#sRc'),sr=[...S.querySelectorAll('.rc-row')].length,adv=L.querySelectorAll('.rc-row').length;setUI('adv');
 return{r0,nIn,r1,v,m,m2,v2,r3,v3,sr,adv,errs:__errs.length}`);
ok(r&&r.r0.length===2&&r.nIn===2,'liste satırları ve "Değiştir" alanları görünür: '+(r&&r.r0.join(' | ')));
ok(r&&near(r.v,6250-cyl(8,10),1e-4)&&/Ø8 mm/.test(r.r1[1])&&/değişti/.test(r.m),'arayüzden çap 8 yazıp "Uygula": '+(r&&r.r1[1])+' · '+(r&&r.m));
ok(r&&/en az/.test(r.m2)&&r.v2===r.v,'geçersiz ölçü uygulanmaz: '+(r&&r.m2));
ok(r&&r.r3.length===1&&near(r.v3,6250,1e-4),'"Sil" adımı kaldırır, kutu deliksiz geri gelir');
ok(r&&r.sr===1&&r.errs===0,'basit modda da aynı liste görünür, sayfa hatası yok');

r=await arun('basit',`[...parts].forEach(removePart);select(null);setUI('simple');sAdd('box');const p=sel;
 document.querySelector('#sW').value='30';document.querySelector('#sW').dispatchEvent(new Event('change',{bubbles:true}));
 const l0=rcLabels(rcEff(sel),sel);document.querySelector('#sTurn').click();const l1=rcLabels(rcEff(sel),sel);
 const S=document.querySelector('#sRc');S.querySelector('[data-rce="b"]').click();const i=S.querySelectorAll('.rc-ed input');i[2].value='12';S.querySelector('[data-rcgo]').click();
 for(let k=0;k<200&&rcBusy;k++)await new Promise(r=>setTimeout(r,10));await new Promise(r=>setTimeout(r,10));
 const b=worldBox(sel);setUI('adv');return{l0,l1,sz:[0,1,2].map(k=>+(b.mx[k]-b.mn[k]).toFixed(3)),z:b.mn[2],m:document.querySelector('#sMsg').textContent}`);
ok(r&&/^Kutu 30 × 40 × 40 mm/.test(r.l0[0])&&r.l1.length===2&&/Döndürüldü/.test(r.l1[1]),'basit mod: ölçü temel satırında, döndürme adım olarak görünür: '+(r&&r.l1.join(' → ')));
ok(r&&JSON.stringify(r.sz)===JSON.stringify([40,30,12])&&near(r.z,0,1e-6),'döndürülmüş kutunun yüksekliği listeden 12 yapıldı: '+(r&&r.sz)+' · '+(r&&r.m));

console.log(fails?fails+' HATA':'TÜMÜ GEÇTİ');process.exit(fails?1:0)})();
