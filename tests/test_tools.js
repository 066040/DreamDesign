/* Kenar/köşe çek-bük, delik, katı işlemler, açı ölçümü, yuvarlak kutu */
const H=require('./harness.js'),path=require('path');let fails=0;
const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const near=(a,b,t)=>Math.abs(a-b)<=t*Math.max(1,Math.abs(b));
const h=H(path.join(__dirname,'..','docs','index.html'));
h.w.__manifoldLoader=async()=>(await import(require.resolve('manifold-3d/manifold.js'))).default;
const run=(name,code)=>{try{return h.T(code)}catch(e){fails++;console.log('FAIL',name,'→ HATA',e.stack.split('\n').slice(0,4).join(' | '));return null}};
const arun=async(name,code)=>{try{return await h.run('(async()=>{'+code+'})()','test')}catch(e){fails++;console.log('FAIL',name,'→ HATA',e.stack.split('\n').slice(0,4).join(' | '));return null}};

/* ortak yardımcılar sayfaya */
run('yardımcı',`
 window.T_edge=(p,a,b)=>{const F=featOf(p);return F.chains.findIndex(c=>{const n=[c.n1,c.n2].filter(Boolean).map(v=>v.map(x=>Math.round(x)).join(','));return n.length===2&&n.includes(a)&&n.includes(b)})};
 window.T_corner=(p,s)=>{const F=featOf(p);return F.corners.findIndex(c=>{const q=F.pos(c.w);return q.every((v,i)=>Math.sign(v)===s[i])})};
 window.T_vol=p=>massInfo(p).vol;
 window.T_clear=()=>{[...parts].forEach(removePart);select(null)}`);

let r=run('özellik',`T_clear();const p=add('box',[100,100,100],[0,0,0]);const F=featOf(p);return{ch:F.chains.length,co:F.corners.length,cn:F.corners.map(c=>c.normals.length)}`);
ok(r&&r.ch===12&&r.co===8&&r.cn.every(n=>n===3),'kutu: 12 kenar, 8 köşe, her köşede 3 yüz '+JSON.stringify(r&&[r.ch,r.co]));

r=run('fareyle-seç',`T_clear();const p=add('box',[300,200,100],[0,0,0]);view('iso');const i=T_edge(p,'0,-1,0','0,0,1'),F=featOf(p);
 const w=new THREE.Vector3(...chainMid(F,F.chains[i])).applyMatrix4(p.mesh.matrixWorld),s=w.clone().project(cam);
 const e={clientX:(s.x+1)/2*800,clientY:(1-s.y)/2*600};const pk=ePickAt(e);
 const ci=T_corner(p,[1,-1,1]),cw=new THREE.Vector3(...F.pos(F.corners[ci].w)).applyMatrix4(p.mesh.matrixWorld).project(cam);
 const pc=ePickAt({clientX:(cw.x+1)/2*800+3,clientY:(1-cw.y)/2*600});
 eSetSel(pk);return{kind:pk&&pk.kind,same:pk&&pk.ci===i,ck:pc&&pc.kind,cs:pc&&pc.ci===ci,txt:document.querySelector('#edsel').textContent,opts:document.querySelectorAll('#eddir option').length}`);
ok(r&&r.kind==='edge'&&r.same&&r.ck==='corner'&&r.cs,'fareyle kenar ve köşe seçimi '+JSON.stringify(r&&[r.kind,r.same,r.ck,r.cs]));
ok(r&&/300 mm/.test(r.txt)&&/90°/.test(r.txt)&&r.opts===4,'kenar bilgisi: uzunluk ve yüzler arası açı: '+(r&&r.txt));

r=run('kaydır',`T_clear();const p=add('box',[100,100,100],[0,0,0]);eMode='move';histMark();const v0=T_vol(p);
 const S=ePrepare({p,kind:'edge',ci:T_edge(p,'0,-1,0','0,0,1')});eApply(S,new THREE.Vector3(0,-20,0));eFinish(S,true);histMark();
 const b=worldBox(p),q=parts[0];const o={mn:b.mn,mx:b.mx,v0,v1:T_vol(q),sel:eSel&&eSel.kind};
 /* alt arka kenar yerinde mi: alt yüzde y en büyük 50 */
 const w=worldArrays(q),P=w.P;let backTop=-1e9,frontBottom=1e9;for(let i=0;i<P.length;i+=3){if(P[i+2]<1e-6)frontBottom=Math.min(frontBottom,P[i+1]);if(P[i+2]>100-1e-6)backTop=Math.max(backTop,P[i+1])}
 o.fb=frontBottom;o.bt=backTop;doUndo();o.vu=T_vol(parts[0]);return o`);
ok(r&&near(r.mn[1],-70,1e-4)&&near(r.mx[1],50,1e-4)&&near(r.mn[2],0,1e-4)&&near(r.mx[2],100,1e-4),'üst ön kenar 20 mm öne: y −70…50, yükseklik aynı '+JSON.stringify(r&&[r.mn,r.mx]));
ok(r&&near(r.v1,r.v0+0.5*20*100*100,1e-4),'hacim kama kadar arttı: '+(r&&r.v1));
ok(r&&near(r.fb,-50,1e-4)&&near(r.bt,50,1e-4),'alt ön kenar ve üst arka kenar yerinde (bitişik yüzler düz eğildi)');
ok(r&&near(r.vu,r.v0,1e-6),'geri al çalıştı');

r=run('bük',`T_clear();const p=add('box',[100,100,100],[0,0,0]);eMode='bend';const S=ePrepare({p,kind:'edge',ci:T_edge(p,'0,-1,0','0,0,1')});
 const info=eApply(S,new THREE.Vector3(0,-10,0));eFinish(S,true);const q=parts[0],w=worldArrays(q),P=w.P;const at=x=>{let y=1e9;for(let i=0;i<P.length;i+=3)if(Math.abs(P[i]-x)<1e-3&&P[i+2]>100-1e-3)y=Math.min(y,P[i+1]);return y};
 const o={deg:info.deg,R:info.R,mid:at(0),q:at(-25),end:at(-50),segs:featOf(q).chains.length,lbl:eInfo(eCur()).text};
 return o`);
ok(r&&near(r.deg,4*Math.atan(.2)*180/Math.PI,1e-6)&&near(r.R,130,1e-6),'bükme açısı 45,24°, R 130 mm: '+(r&&r.deg.toFixed(3)));
ok(r&&near(r.mid,-60,1e-4)&&near(r.end,-50,1e-4)&&near(r.q,-50-(Math.sqrt(130*130-25*25)-120),1e-3),'kenar çember yayı oldu (orta −60, uç −50, çeyrek doğru) '+JSON.stringify(r&&[r.mid,r.q,r.end]));
ok(r&&/eğri: yay 45/.test(r.lbl),'eğrilik bilgisi okunuyor: '+(r&&r.lbl));

r=run('bük-sayıyla',`T_clear();const p=add('box',[60,40,20],[0,0,0]);eMode='bend';const pk={p,kind:'edge',ci:T_edge(p,'0,-1,0','0,0,1')};eSetSel(pk);
 const opts=[...document.querySelectorAll('#eddir option')];const o=opts.find(x=>/−Y/.test(x.textContent));document.querySelector('#eddir').value=o.value;
 document.querySelector('#edang').value='90';const info=eNumeric();document.querySelector('#edang').value='0';return{deg:info&&info.deg,h:info&&info.h,mn:worldBox(parts[0]).mn[1]}`);
ok(r&&near(r.deg,90,1e-6)&&near(r.h,60/2*Math.tan(Math.PI/8),1e-6)&&near(r.mn,-20-r.h,1e-4),'açı yazarak bük: 90°, sehim '+(r&&r.h.toFixed(3))+' mm, −Y yönüne');

r=run('köşe',`T_clear();const p=add('box',[100,100,100],[0,0,0]);eMode='move';const v0=T_vol(p);const S=ePrepare({p,kind:'corner',ci:T_corner(p,[1,-1,1])});
 eApply(S,new THREE.Vector3(10,0,0));eFinish(S,true);const P=worldArrays(parts[0]).P;let mxTopFront=-1e9,mxOther=-1e9;
 for(let i=0;i<P.length;i+=3){const x=P[i],y=P[i+1],z=P[i+2];if(z>100-1e-3&&y<-50+1e-3)mxTopFront=Math.max(mxTopFront,x);if(z<1e-3)mxOther=Math.max(mxOther,x)}
 return{a:mxTopFront,b:mxOther,dv:T_vol(parts[0])-v0}`);
ok(r&&near(r.a,60,1e-4)&&near(r.b,50,1e-4)&&r.dv>0&&r.dv<10*100*100/2,'köşe 10 mm dışarı: yalnız o köşe gitti, taban yerinde '+JSON.stringify(r));

r=run('etki',`T_clear();const p=add('box',[100,100,100],[0,0,0]);eMode='move';document.querySelector('#edreach').value='30';
 const S=ePrepare({p,kind:'edge',ci:T_edge(p,'0,-1,0','0,0,1')});eApply(S,new THREE.Vector3(0,-10,0));eFinish(S,true);document.querySelector('#edreach').value='100';
 const P=worldArrays(parts[0]).P;let low=1e9;for(let i=0;i<P.length;i+=3)if(P[i+2]<69.9)low=Math.min(low,P[i+1]);return{low}`);
ok(r&&near(r.low,-50,1e-4),'etki %30: alt %70 hiç oynamadı');

r=run('yuvarlak-kutu',`T_clear();const p=addRBox([40,40,12],4,[0,0,0]);const v=T_vol(p);const o={v,type:p.type,rad:p.rad,z0:worldBox(p).mn[2],F:featOf(p).chains.length,
 ui:!!document.querySelector('#rbr')};rboxRebuild(parts[0],0);o.v0=T_vol(parts[0]);o.F0=featOf(parts[0]).chains.length;
 const d=projectData();loadProject(JSON.parse(JSON.stringify(d)));o.rad2=parts[0].rad;o.type2=parts[0].type;return o`);
const rbEx=40*40*12-4*4*(4-Math.PI)*(32+32+4)-(4**3)*(8-4*Math.PI/3);
ok(r&&near(r.v,rbEx,4e-3)&&r.type==='rbox'&&r.F===0&&r.ui&&near(r.z0,0,1e-6),'yuvarlak kutu hacmi '+(r&&r.v.toFixed(1))+' ≈ '+rbEx.toFixed(1)+', keskin kenar yok, panelde yarıçap');
ok(r&&near(r.v0,19200,1e-6)&&r.F0===12&&r.rad2===0&&r.type2==='rbox','yarıçap 0 → düz kutu, 12 kenar; kaydet-aç yarıçapı korudu');

r=run('açı-ölçü',`T_clear();const p=add('box',[100,100,100],[0,0,0]);setMode('meas');const o={vis:!document.querySelector('#mtype').hidden};
 const L=v=>p.mesh.worldToLocal(new THREE.Vector3(...v));measures.length=0;
 measures.push({pa:p,la:L([50,-50,0]),pb:p,lb:L([-50,-50,0]),pc:p,lc:L([-50,-50,100])});
 measures.push({pa:p,la:L([50,-50,0]),pb:p,lb:L([-50,-50,0]),pc:p,lc:L([50,50,100])});drawMeasures(true);
 o.l=[...document.querySelectorAll('#lbls span.m')].map(s=>s.textContent);
 const d=JSON.parse(JSON.stringify(projectData()));loadProject(d);drawMeasures(true);o.l2=[...document.querySelectorAll('#lbls span.m')].map(s=>s.textContent);
 setMode('sec');o.hid=document.querySelector('#mtype').hidden;return o`);
const a2=(Math.acos(1/Math.sqrt(3))*180/Math.PI).toFixed(2).replace('.',',');
ok(r&&r.vis&&r.hid&&r.l.includes('90°')&&r.l.includes(a2+'°'),'üç noktalı açı: 90° ve '+a2+'° '+JSON.stringify(r&&r.l));
ok(r&&r.l2.length===2&&r.l2.includes('90°'),'açı ölçüleri kaydet-aç sonrası duruyor');

(async()=>{
 r=await arun('delik',`T_clear();const p=add('box',[40,40,10],[0,0,0]);setMode('hole');document.querySelector('#hld').value='6';document.querySelector('#hldep').value='0';
  holePlace(p,new THREE.Vector3(0.2,-0.1,10),new THREE.Vector3(0,0,1));const o={x:+document.querySelector('#hlx').value,prev:hPrev.visible};
  const np=await holeDo();o.msg=document.querySelector('#hlmsg').textContent;if(!np)return o;o.n=parts.length;o.v=T_vol(np);o.mat=np.mat;
  const b=worldBox(np);o.box=[b.mn,b.mx];
  document.querySelector('#hlx').value='12';document.querySelector('#hly').value='12';document.querySelector('#hldep').value='4';const n2=await holeDo();o.v2=T_vol(n2);
  document.querySelector('[data-ho="add"]').click();document.querySelector('#hlx').value='-12';document.querySelector('#hld').value='4';document.querySelector('#hldep').value='3';
  const n3=await holeDo();o.v3=T_vol(n3);o.zmax=worldBox(n3).mx[2];document.querySelector('[data-ho="cut"]').click();
  doUndo();o.vu=T_vol(parts[0]);setMode('sec');o.prev2=hPrev.visible;return o`);
 const A=n=>r=>.5*n*r*r*Math.sin(2*Math.PI/n);
 ok(r&&r.x===0&&r.prev,'delik yeri 0,5 mm\'ye yuvarlandı, önizleme görünüyor');
 ok(r&&r.n===1&&near(r.v,16000-A(64)(3)*10,1e-4)&&r.mat==='Alüminyum','Ø6 boydan boya delik: hacim '+(r&&r.v&&r.v.toFixed(2))+' · '+(r&&r.msg));
 ok(r&&near(r.box[0][2],0,1e-6)&&near(r.box[1][0],20,1e-6),'parça yerinde kaldı');
 ok(r&&near(r.v2,r.v-A(64)(3)*4,1e-4),'kör delik derinlik 4 mm');
 ok(r&&near(r.v3,r.v2+A(64)(2)*3,1e-4)&&near(r.zmax,13,1e-6),'doldur: Ø4 × 3 mm çıkıntı, üst 13 mm');
 ok(r&&near(r.vu,r.v2,1e-6)&&!r.prev2,'delik geri alındı, önizleme gizlendi');

 r=await arun('katı',`T_clear();const a=add('box',[100,100,100],[0,0,0]);const b=add('box',[50,50,50],[50,50,75],{ground:false});const c=add('cyl',[40,40,300],[-20,-20,50],{ground:false});
  const o={};let m=await boolParts('subtract',a,b,false);o.s=T_vol(m);o.n=parts.length;
  m=await boolParts('subtract',m,c,true);o.s2=T_vol(m);o.n2=parts.length;
  const d=add('box',[100,100,100],[300,0,0]);const e=add('box',[100,100,100],[350,0,0]);const u=await boolParts('union',d,e,false);o.u=T_vol(u);
  const g=add('box',[100,100,100],[700,0,0]);const k=add('box',[100,100,100],[750,0,0]);const it=await boolParts('intersect',g,k,false);o.i=T_vol(it);
  const z=add('box',[10,10,10],[2000,0,0]);const y=add('box',[10,10,10],[3000,0,0]);o.empty=await boolParts('intersect',z,y,false);o.emsg=document.querySelector('#bmsg').textContent;
  /* kapalı olmayan yüzey */
  const P=new Float32Array([0,0,0,100,0,0,0,100,0]),I=new Uint32Array([0,1,2]);const open=derive(P,null,I,'açık',null,null);o.bad=await boolParts('union',open,z,true);o.bmsg=document.querySelector('#bmsg').textContent;
  return o`);
 ok(r&&near(r.s,1e6-25*25*50,1e-4)&&r.n===2,'çıkar: köşedeki kutu oyuldu, hacim '+(r&&r.s));
 ok(r&&r.s2<r.s&&r.n2===2,'silindiri oy, "koru" ile alet kaldı');
 ok(r&&near(r.u,1.5e6,1e-6)&&near(r.i,.5e6,1e-6),'birleştir 1,5 dm³ (çakışan bir kez), kesişim 0,5 dm³');
 ok(r&&r.empty===null&&/boş/.test(r.emsg),'değmeyen parçalar: anlaşılır uyarı');
 ok(r&&r.bad===null&&/su geçirmez/.test(r.bmsg),'açık yüzey: anlaşılır uyarı');

 r=run('bük-sonra-delik-kenar',`const p=parts.find(q=>/−/.test(q.name));const F=featOf(p);return{ch:F.chains.length,co:F.corners.length}`);
 ok(r&&r.ch>12&&r.co>8,'oyulmuş parçada yeni kenarlar seçilebilir '+JSON.stringify(r));

 ok(h.errs.length===0,'yakalanmamış hata yok '+h.errs.join('|'));
 console.log(fails?('HATA '+fails):'TÜMÜ GEÇTİ');process.exit(fails?1:0)})();
