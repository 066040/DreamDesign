/* ================= Geçme yuvası (takma çıkarma payı) ve kenar yuvarlatma / pah =================
   İkisi de Minkowski işlemleriyle (manifold-3d) yapılır, dünya ölçüsünde (mm) çalışır:
   - Geçme yuvası: gövde − (girecek parça ⊕ küre(c)). Yuva, parçadan her yönde c kadar büyük olur.
   - Dış kenarları yuvarla: (A ⊖ K) ⊕ K  (açma).  İç köşeleri yuvarla: (A ⊕ K) ⊖ K  (kapama).
     Hepsi: açma ∪ (kapama − A). K küre ise yuvarlatma, sekizyüzlü ise 45° pah olur.
   Sınır: açma, 2r'den ince duvarları da siler; kapama, 2r'den dar boşlukları da doldurur.
   Bu yüzden sonuç hacmi beklenenden çok değişirse işlem uygulanmaz ve nedeni söylenir.
   Hesap tarayıcıda ayrı bir iş parçacığında (Worker) çalışır: sayfa donmaz, "Durdur" ile kesilir.
   Worker yoksa (testler) aynı kod sayfada çalışır. mf* fonksiyonları yalnız `w`yi kullanır,
   dışarıdan hiçbir şeye dokunmaz; Worker'a metin olarak kopyalanırlar. */
function mfKernel(w,kind,r){
 if(kind==='chamfer')return w.Manifold.sphere(r,4);             // 4 bölmeli küre = sekizyüzlü, köşeleri eksenlerde r uzakta
 const seg=Math.max(8,Math.min(16,Math.round(r*4)));           // az bölme = hızlı; 1 mm'de yüzey adımı ~0,4 mm, baskıda görünmez
 return w.Manifold.sphere(r/Math.cos(Math.PI/seg),seg)}        // çokgen küre içeride kalmasın: yüzeyleri en az r uzakta
function mfMesh(w,P,I,tol){const m=new w.Mesh({numProp:3,vertProperties:P,triVerts:I});m.merge();
 let a;try{a=new w.Manifold(m)}catch(e){throw new Error('Parça kapalı (su geçirmez) bir yüzey değil. "Yüzey temizliği" ile kırıntıları sil, yüzleri düzelt ya da parçayı yeniden oluştur.')}
 const s=a.simplify(tol);a.delete();return s}
function mfBox(w,mn,mx){const P=new Float32Array(24),I=Uint32Array.from([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7]);
 for(let i=0;i<8;i++){P[3*i]=(i&1)^((i>>1)&1)?mx[0]:mn[0];P[3*i+1]=i&2?mx[1]:mn[1];P[3*i+2]=i&4?mx[2]:mn[2]}
 return new w.Manifold(new w.Mesh({numProp:3,vertProperties:P,triVerts:I}))}
/* aşındırma (A ⊖ K). Girintili parçada manifold'un kendi minkowskiDifference'ı çok yavaş;
   eşdeğeri: kutu − ((genişletilmiş kutu − A) ⊕ K). Dışbükey parçada kendi işlemi hızlı. */
function mfErode(w,A,K,r,keep,convex){if(convex)return A.minkowskiDifference(K);
 const b=A.boundingBox(),g=v=>[v[0]??v.x,v[1]??v.y,v[2]??v.z],mn=g(b.min),mx=g(b.max),m=2*r+1;
 const outer=keep(mfBox(w,mn.map(v=>v-m),mx.map(v=>v+m))),inner=keep(mfBox(w,mn,mx));
 return inner.subtract(keep(keep(outer.subtract(A)).minkowskiSum(K)))}
/* hacimsiz kırıntıları at (Minkowski birleşimlerinde kalan sıfır kalınlıkta yapraklar) */
function mfClean(R,eps,keep){const pcs=R.decompose();if(pcs.length<2){pcs.forEach(q=>q.delete());return R}let o=null;
 for(const q of pcs){keep(q);if(q.volume()>eps)o=o?keep(o.add(q)):q}return o||R}
/* tek iş: {op:'fit',A,B,c} ya da {op:'round',A,r,kind,where}; A/B: {P,I,tol} (dünya, kaynaklanmış) */
function mfJob(w,J){const ms=[],keep=m=>{ms.push(m);return m};
 try{const A=keep(mfMesh(w,J.A.P,J.A.I,J.A.tol)),vol0=A.volume();let R;
  if(J.op==='fit'){const B=keep(mfMesh(w,J.B.P,J.B.I,J.B.tol));R=keep(A.subtract(J.c>0?keep(B.minkowskiSum(keep(mfKernel(w,'round',J.c)))):B))}
  else{const K=keep(mfKernel(w,J.kind,J.r)),convex=Math.abs(keep(A.hull()).volume()-vol0)<vol0*1e-4;
   const sm=x=>keep(keep(x).simplify(J.r*1e-3));
   const open=()=>sm(keep(keep(mfErode(w,A,K,J.r,keep,convex)).minkowskiSum(K)));
   const close=()=>{const d=keep(A.minkowskiSum(K));return sm(mfErode(w,d,K,J.r,keep,convex))};
   /* hepsi: iç köşe dolgularını ayrı al; düz yüzlerde kalan sıfır kalınlıklı yaprakları at, sonra ekle */
   R=J.where==='out'?open():J.where==='in'?close():keep(open().add(mfClean(keep(close().subtract(A)),Math.max(1e-3,.02*J.r**3),keep)))}
  R=mfClean(R,Math.max(1e-3,R.volume()*1e-6),keep);
  const g=R.getMesh(),np=g.numProp,V=g.vertProperties,n=V.length/np,P=new Float32Array(n*3);
  for(let i=0;i<n;i++){P[3*i]=V[np*i];P[3*i+1]=V[np*i+1];P[3*i+2]=V[np*i+2]}
  return{P,I:Uint32Array.from(g.triVerts),vol:R.volume(),vol0}}
 finally{ms.forEach(m=>{try{m.delete()}catch(_){}})}}

/* ---------- Worker: sayfa donmasın, uzun işlem durdurulabilsin ---------- */
const MF_URL='https://cdn.jsdelivr.net/npm/manifold-3d@3.5.4/manifold.js';
let mfW=null,mfWJob=null;
function mfWorker(){if(mfW)return mfW;
 const src=`import Mod from '${MF_URL}';const ready=Mod().then(w=>{w.setup();return w});
${mfKernel}\n${mfMesh}\n${mfBox}\n${mfErode}\n${mfClean}\n${mfJob}
onmessage=async e=>{try{const w=await ready,r=mfJob(w,e.data);postMessage({ok:1,r},[r.P.buffer,r.I.buffer])}catch(err){postMessage({ok:0,e:String(err&&err.message||err)})}}`;
 mfW=new Worker(URL.createObjectURL(new Blob([src],{type:'text/javascript'})),{type:'module'});return mfW}
function mfStop(){if(mfW){mfW.terminate();mfW=null}if(mfWJob){const j=mfWJob;mfWJob=null;j.reject(new Error('Durduruldu. Parça değişmedi.'))}}
function mfRun(J){
 if(typeof Worker==='undefined'||window.__manifoldLoader)                     // testler: aynı iş sayfada
  return loadManifold().then(w=>mfJob(w,J));
 return new Promise((res,rej)=>{const wk=mfWorker();mfWJob={reject:rej};
  wk.onmessage=e=>{mfWJob=null;e.data.ok?res(e.data.r):rej(new Error(e.data.e))};
  wk.onerror=()=>{mfWJob=null;mfW=null;rej(new Error('Hesap modülü yüklenemedi (internet gerekli).'))};
  wk.postMessage(J)})}
function mfIn(p){const a=worldArrays(p),d=Math.max(wDiag(p),1),wd=weld(a.P,null,a.I,d*1e-6);return{P:wd.P,I:Uint32Array.from(wd.I),tol:d*1e-5}}
/* sonucu p'nin yerine koy (konum/dönüş/ölçek korunur) */
/* 15°: yuvarlatma yüzleri 22-45° aralıklı; daha büyük açıda düz yüzle karışıp çizgili görünür */
function mfReplace(p,R,name){const S=splitSharp(toLocal(p,R.P),null,R.I,15);return replaceWith(p,S,name)}
/* bekleme yazısı: geçen süre ve Durdur düğmesi */
function mfWait(out){const el=$(out),t0=Date.now();el.style.color='var(--mut)';                 // düğme bir kez kurulur; yalnız süre yazısı yenilenir
 el.innerHTML='Hesaplanıyor…<span></span> <button class="sm" type="button">Durdur</button>';el.querySelector('button').onclick=mfStop;
 const sp=el.querySelector('span'),iv=setInterval(()=>{sp.textContent=' '+Math.round((Date.now()-t0)/1000)+' sn'},1000);return()=>clearInterval(iv)}
/* ---------- geçme yuvası ---------- */
const FIT_PRESETS={'0.1':'Sıkı','0.2':'Normal','0.3':'Bol','0.5':'Serbest'};
let fitBusy=false;
async function fitPocket(body,peg,c,out){out=out||'#fitmsg';
 if(!body||!peg||body===peg){msg('Yuva açılacak parçayı seç, "Girecek parça"dan diğerini seç.',null,out);return null}
 if(!(c>=0&&c<=2)){msg('Geçme payı 0 ile 2 mm arasında olmalı.',null,out);return null}
 if(fitBusy)return null;fitBusy=true;const done=mfWait(out);
 try{if(cage)cageEnd(true);
  const R=await mfRun({op:'fit',A:mfIn(body),B:mfIn(peg),c});done();
  if(!R.I.length)throw new Error('Sonuç boş: girecek parça gövdenin tamamını kaplıyor.');
  if(R.vol>R.vol0-1e-3)throw new Error('Parçalar birbirine değmiyor. Girecek parçayı gövdenin içine, yuvanın olacağı yere yerleştir.');
  if(!parts.includes(body))throw new Error('Gövde bu arada silinmiş.');
  const np=mfReplace(body,R,body.name);refresh();look();histMark();
  msg('Yuva açıldı: her yönde '+f(c,2)+' mm boşluk ('+(FIT_PRESETS[String(c)]||'özel')+'). '+peg.name+' yerinde duruyor; ayrı basılınca yuvaya girer.','var(--ok)',out);return np}
 catch(e){done();msg(e.message,null,out);return null}
 finally{fitBusy=false}}
$('#fitgo').onclick=()=>fitPocket(sel,parts.find(q=>q.id===+$('#fitsel').value),parseFloat(String($('#fitc').value).replace(',','.')));

/* ---------- kenarları yuvarla / pah kır ---------- */
let rdKind='round',rdBusy=false;
async function roundPart(p,r,kind,where,out){out=out||'#rdmsg';
 if(!p){msg('Önce bir parça seç.',null,out);return null}
 if(!(r>0)){msg('Yarıçapı yaz (mm).',null,out);return null}
 const b=worldBox(p),mn=Math.min(b.mx[0]-b.mn[0],b.mx[1]-b.mn[1],b.mx[2]-b.mn[2]);
 if(where!=='in'&&r>=mn/2){msg('Bu parça için en fazla '+f(mn/2*.95,1)+' mm olabilir (en ince ölçüsü '+f(mn,1)+' mm).',null,out);return null}
 if(rdBusy)return null;rdBusy=true;const done=mfWait(out);
 try{if(cage)cageEnd(true);
  const R=await mfRun({op:'round',A:mfIn(p),r,kind,where});done();
  const dv=(R.vol-R.vol0)/R.vol0;
  if(!R.I.length||dv<-.2)throw new Error('Bu yarıçap parçanın ince duvarlarını ya da küçük çıkıntılarını siliyor. Daha küçük bir yarıçap dene (duvar kalınlığının yarısından az).');
  if(dv>.2)throw new Error('Bu yarıçap parçadaki dar boşlukları ya da delikleri dolduruyor. Daha küçük bir yarıçap dene ya da yalnız "Dış kenarlar"ı seç.');
  if(!parts.includes(p))throw new Error('Parça bu arada silinmiş.');
  const np=mfReplace(p,R,p.name);refresh();look();histMark();
  const what={out:'Dış kenarlar',in:'İç köşeler',both:'Tüm kenarlar'}[where];
  msg(what+' '+f(r,2)+' mm '+(kind==='chamfer'?'pah kırıldı':'yuvarlatıldı')+'. Hacim '+f(massInfo(np).vol/1000,2)+' cm³ ('+(dv>=0?'+':'')+f(dv*100,1)+'%).','var(--ok)',out);return np}
 catch(e){done();msg(e.message,null,out);return null}
 finally{rdBusy=false}}
document.querySelectorAll('#rdk button').forEach(b=>b.onclick=()=>{rdKind=b.dataset.rk;document.querySelectorAll('#rdk button').forEach(x=>x.classList.toggle('on',x===b));
 $('#rdrl').textContent=rdKind==='chamfer'?'Pah boyu (mm)':'Yarıçap (mm)'});
$('#rdgo').onclick=()=>roundPart(sel,parseFloat(String($('#rdr').value).replace(',','.')),rdKind,$('#rdw').value);

/* "Girecek parça" listesi: diğer listelerle birlikte yenilensin */
{const _fill=fillSelects;fillSelects=function(){_fill();const e=$('#fitsel');if(!e)return;const v=e.value;
 e.innerHTML=parts.filter(p=>p!==sel).map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
 if([...e.options].some(o=>o.value===v))e.value=v}}
fillSelects();
