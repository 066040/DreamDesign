/* Geçme yuvası, deliğe geçme payı, kenar yuvarlatma / pah (app11) */
const H=require('./harness.js'),path=require('path');let fails=0;
const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const near=(a,b,t)=>Math.abs(a-b)<=t*Math.max(1,Math.abs(b));
const h=H(path.join(__dirname,'..','docs','index.html'));
h.w.__manifoldLoader=async()=>(await import(require.resolve('manifold-3d/manifold.js'))).default;
const arun=async(name,code)=>{try{return await h.run('(async()=>{'+code+'})()','test')}catch(e){fails++;console.log('FAIL',name,'→ HATA',e.stack.split('\n').slice(0,4).join(' | '));return null}};
const PI=Math.PI;
(async()=>{
/* sahne: 40 mm kutu (gövde) ve içine girmiş Ø10 silindir (pim) */
const setup=`[...parts].forEach(removePart);select(null);setUI('adv');
 const box=addRBox([40,40,40],0,[0,0,0]);box.name='Gövde';
 sAdd('cyl');const pin=sel;pin.size=[10,10,30];pin.pos=[0,0,25];apply(pin);pin.name='Pim';refresh();`;
let r=await arun('yuva',setup+`const v0=massInfo(box).vol,wb=worldBox(box),pb=worldBox(pin);const np=await fitPocket(box,pin,0.2);
 return{ok:!!np,v0,v:np&&massInfo(np).vol,pinKept:parts.includes(pin),n:parts.length,msg:document.querySelector('#fitmsg').textContent,
  L:Math.min(wb.mx[2],pb.mx[2])-Math.max(wb.mn[2],pb.mn[2]),pr:(pb.mx[0]-pb.mn[0])/2}`);
/* yuva: pimden her yönde 0,2 mm büyük silindir; kutu içindeki boy L (+ alt uçta 0,2) */
const pocket=r&&(r.v0-r.v),expP=r?PI*(r.pr+.2)**2*(r.L+.2):0;
ok(r&&r.ok&&r.pinKept&&r.n===2,'yuva açıldı, girecek parça yerinde kaldı '+JSON.stringify(r&&{n:r.n,msg:r.msg}));
ok(r&&near(pocket,expP,0.03),'yuva her yönde 0,2 mm büyük (beklenen '+expP.toFixed(0)+' mm³, çıkan '+(pocket||0).toFixed(0)+', pim r='+(r&&r.pr)+', boy '+(r&&r.L)+')');
r=await arun('değmiyor',setup+`pin.pos=[100,0,20];apply(pin);const np=await fitPocket(box,pin,0.2);return{np:!!np,m:document.querySelector('#fitmsg').textContent}`);
ok(r&&!r.np&&/değmiyor/.test(r.m),'parçalar değmiyorsa açıkça söyler');

/* delik: geçme payı çapa eklenir */
r=await arun('delik',`[...parts].forEach(removePart);const b=addRBox([40,40,20],0,[0,0,0]);refresh();const v0=massInfo(b).vol;
 hOp='cut';hole={p:b,n:new THREE.Vector3(0,0,1)};const wb=worldBox(b);
 document.querySelector('#hlx').value=0;document.querySelector('#hly').value=0;document.querySelector('#hlz').value=wb.mx[2];
 document.querySelector('#hld').value=5;document.querySelector('#hldep').value=0;document.querySelector('#hldir').value='n';document.querySelector('#hlfit').value='0.2';
 const np=await holeDo();return{v0,v:np&&massInfo(np).vol,m:document.querySelector('#hlmsg').textContent}`);
ok(r&&near(r.v0-r.v,PI*2.7*2.7*20,0.03)&&/5,4/.test(r.m)&&/geçme payı/.test(r.m),'pim deliği: Ø5 + 0,4 mm geçme payı = Ø5,4 '+JSON.stringify(r&&r.m));

/* yuvarlatma: 40 mm küpte dış kenarlar r=4 → hacim azalır (12 kenar çeyrek silindir farkı + köşeler) */
r=await arun('yuvarla',`[...parts].forEach(removePart);const b=addRBox([40,40,40],0,[0,0,0]);refresh();const v0=massInfo(b).vol;const t0=Date.now();
 const np=await roundPart(b,4,'round','out');return{v0,v:np&&massInfo(np).vol,ms:Date.now()-t0,m:document.querySelector('#rdmsg').textContent}`);
/* tam yuvarlatılmış küp hacmi: (a-2r)^3 + 6(a-2r)^2 r + 3π r^2 (a-2r) + 4/3 π r^3 */
const a=40,R=4,k=a-2*R,exact=k**3+6*k*k*R+3*PI*R*R*k+4/3*PI*R**3;
ok(r&&near(r.v,exact,0.01),'dış kenarlar 4 mm yuvarlatıldı: hacim '+(r&&r.v||0).toFixed(0)+' ≈ '+exact.toFixed(0)+' ('+(r&&r.ms)+' ms)');
r=await arun('pah',`[...parts].forEach(removePart);const b=addRBox([40,40,40],0,[0,0,0]);refresh();
 const np=await roundPart(b,4,'chamfer','out');return{v:np&&massInfo(np).vol,m:document.querySelector('#rdmsg').textContent}`);
ok(r&&r.v<64000&&r.v>exact-3000&&/pah/.test(r.m),'pah kırıldı '+JSON.stringify(r));
/* ince duvarlı kap: 3 mm duvar, 4 mm yuvarlatma duvarı siler → uygulanmaz */
r=await arun('ince duvar',`[...parts].forEach(removePart);const b=addRBox([40,40,40],0,[0,0,0]);refresh();
 const wb=worldBox(b),c=addRBox([34,34,40],0,[0,0,0]);c.pos=[(wb.mn[0]+wb.mx[0])/2,(wb.mn[1]+wb.mx[1])/2,wb.mn[2]+4+20];apply(c);
 select(b);const cup=await boolParts('subtract',b,c,false);refresh();const v0=massInfo(cup).vol;const np=await roundPart(cup,4,'round','out');
 return{np:!!np,same:parts.includes(cup)&&Math.abs(massInfo(cup).vol-v0)<1e-6,m:document.querySelector('#rdmsg').textContent}`);
ok(r&&!r.np&&r.same&&/ince duvar/.test(r.m),'ince duvarı silecek yarıçap uygulanmaz, parça değişmez '+JSON.stringify(r&&r.m));
r=await arun('kap',`[...parts].forEach(removePart);const mk=async()=>{const b=addRBox([40,40,40],0,[0,0,0]);
 const c=addRBox([34,34,40],0,[0,0,0]);c.pos=[0,0,24];apply(c);return await boolParts('subtract',b,c,false)};
 const out={};for(const wh of ['out','in','both']){[...parts].forEach(removePart);const cup=await mk();const v0=massInfo(cup).vol;const t=Date.now();
  const a=await roundPart(cup,1,'round',wh);out[wh]={d:a?(massInfo(a).vol-v0):null,ms:Date.now()-t}}return out`);
ok(r&&r.out.d<0&&r.in.d>0&&Math.abs(r.both.d-(r.out.d+r.in.d))<Math.abs(r.out.d)*.05+1&&r.both.ms<20000,'3 mm duvarlı kap: dış kenarlar hacim azaltır, iç köşeler artırır, "Hepsi" ikisinin toplamı '+JSON.stringify(r));
r=await arun('çok büyük',`[...parts].forEach(removePart);const b=addRBox([40,40,10],0,[0,0,0]);refresh();const np=await roundPart(b,6,'round','out');return{np:!!np,m:document.querySelector('#rdmsg').textContent}`);
ok(r&&!r.np&&/en fazla/i.test(r.m),'en ince ölçünün yarısından büyük yarıçap: sınır söylenir '+JSON.stringify(r&&r.m));
r=await arun('geri al',`[...parts].forEach(removePart);const b=addRBox([30,30,30],0,[0,0,0]);refresh();histMark();const n0=Hist.undo.length;
 await roundPart(b,3,'round','out');return{d:Hist.undo.length-n0}`);
ok(r&&r.d===1,'yuvarlatma tek adımda geri alınabilir');

/* basit mod: kutu dışındaki şekilde de köşe yuvarla çalışır */
r=await arun('basit',`[...parts].forEach(removePart);select(null);setUI('simple');sAdd('cyl');const p=sel;const v0=massInfo(p).vol;
 document.querySelector('#sRad').value=3;const go=document.querySelector('#sRoundGo');const dis=go.disabled;go.click();
 for(let i=0;i<200&&sBusy;i++)await new Promise(r=>setTimeout(r,50));return{dis,v0,v:massInfo(sel).vol,m:document.querySelector('#sMsg').textContent}`);
ok(r&&!r.dis&&r.v<r.v0&&/yuvarlatıldı/.test(r.m),'basit mod: silindirin kenarları da yuvarlatılır '+JSON.stringify(r&&r.m));

console.log(fails?fails+' başarısız':'TÜMÜ GEÇTİ');process.exit(fails?1:0)})();
