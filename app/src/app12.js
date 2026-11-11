/* ================= Yapılanlar listesi: parçanın tarifi (parametrik geçmiş) =================
   Her parça nasıl yapıldığını hatırlar: bir temel (hazır şekil ya da serbest ağ) ve üstüne sırayla adımlar
   (delik, çıkıntı, yuvarlatma, kaba çevirme, boyut, çevirme). Bir adımın ölçüsü değişince parça temelden
   başlayıp tüm adımlar yeniden uygulanarak baştan kurulur.

   Tarif "gövde uzayı"nda tutulur: mm, eksenler parçanın dönüşüyle aynı, orijin parçaya yapışık.
   p.rc = {base, locked, steps, off, sc, fp}
     base   : {kind:'prim',type,size,rad} | {kind:'mesh',P,I,label}
     locked : artık değiştirilemeyen eski adımların adları (yalnız gösterilir)
     off    : gövde orijininin parça merkezine göre yeri (gövde eksenlerinde, mm)
     sc     : son adımdan sonraki boyut (sonradan elle boyut değişti mi diye bakılır)
     fp     : son adımdan sonraki geometrinin parmak izi (kayıtsız bir değişiklik oldu mu diye bakılır)
   p.rc değiştirilmez, yenisi atanır: geri-al görüntüleri aynı nesneyi paylaşır.
   Kaydedilmeyen bir işlem (kafes, esnet, kenar çekme, kesme, başka parçayla birleştirme) geometriyi değiştirirse
   o ana kadarki adımlar kilitlenir, parçanın o anki hali yeni temel olur. */
const RC_NAME={box:'Kutu',rbox:'Yuvarlak kutu',cyl:'Silindir',sph:'Küre',cone:'Koni'};

/* ---------- parmak izi, çerçeve, diziler ---------- */
function rcFp(p){const g=p.mesh.geometry,a=g.attributes.position.array,u=new Uint32Array(a.buffer,a.byteOffset,a.length);let h=2166136261;
 for(let i=0;i<u.length;i++){h^=u[i];h=Math.imul(h,16777619)}return a.length+':'+g.index.count+':'+(h>>>0)}
function rcInit(p){p.rc={base:{kind:'prim',type:p.type},locked:[],steps:[],off:[0,0,0],sc:p.size.slice(),fp:rcFp(p)}}
function rcSameSize(a,b){return a&&b&&[0,1,2].every(k=>Math.abs(a[k]-b[k])<=1e-6*Math.max(1,Math.abs(b[k])))}
function rcIsPrim(p){return !!RC_NAME[p.type]&&(p.type==='rbox'||!!p.analytic)}
/* parçanın şu anki geçerli tarifi (parçayı değiştirmez) */
function rcEff(p){const rc=p.rc;
 if(!rc)return rcIsPrim(p)?{base:{kind:'prim',type:p.type,size:p.size.slice(),rad:p.rad},locked:[],steps:[],off:[0,0,0]}:{base:{kind:'mesh'},locked:[],steps:[],off:[0,0,0]};
 if(rc.fp!==rcFp(p))return{base:{kind:'mesh'},locked:rcLabels(rc,p),steps:[],off:[0,0,0],frozen:true};
 if(!rc.steps.length){
  if(rc.base.kind==='prim')return Object.assign({},rc,{base:{kind:'prim',type:rc.base.type,size:p.size.slice(),rad:p.type==='rbox'?p.rad:rc.base.rad}});
  return rc}
 if(!rcSameSize(rc.sc,p.size))return Object.assign({},rc,{steps:rc.steps.concat([{op:'scale',to:p.size.slice()}])});
 return rc}
function rcBBox(P){const mn=[1e30,1e30,1e30],mx=[-1e30,-1e30,-1e30];
 for(let i=0;i<P.length;i+=3)for(let k=0;k<3;k++){const v=P[i+k];if(v<mn[k])mn[k]=v;if(v>mx[k])mx[k]=v}
 return{mn,mx,c:[0,1,2].map(k=>(mn[k]+mx[k])/2),s:[0,1,2].map(k=>mx[k]-mn[k]),d:Math.hypot(mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2])}}
/* parçanın şu anki ağı gövde uzayında (mm) */
function rcBodyArrays(p,off){const g=p.mesh.geometry,a=g.attributes.position.array,P=new Float32Array(a.length);
 for(let i=0;i<a.length;i+=3)for(let k=0;k<3;k++)P[i+k]=a[i+k]*p.size[k]/p.base[k]-off[k];
 return{P,I:Uint32Array.from(g.index.array)}}
/* tarifin somut hali: temel ölçüsü / ağı ve varsa boyut adımı yazılmış */
function rcMat(p){const e=rcEff(p);
 if(!e.steps.length&&e.base.kind==='mesh'){const A=rcBodyArrays(p,[0,0,0]);return{base:{kind:'mesh',label:e.base.label,P:A.P,I:A.I},locked:e.locked,steps:[],off:[0,0,0]}}
 return{base:e.base,locked:e.locked,steps:e.steps,off:e.off}}
function rcFrame(p,off){apply(p);const q=p.mesh.quaternion.clone();return{q,O:new THREE.Vector3(...off).applyQuaternion(q).add(p.mesh.position)}}
function rcOff(fr,pos){const v=fr.O.clone().sub(new THREE.Vector3(...pos)).applyQuaternion(fr.q.clone().invert());return[v.x,v.y,v.z]}

/* ---------- kayıt: işlemden önce rcBegin, sonra rcEnd ---------- */
function rcBegin(p){const rc=rcMat(p);return{p,rc,fr:rcFrame(p,rc.off),pos:p.pos.slice(),A:rc.steps.length||rc.base.kind!=='mesh'?null:{P:rc.base.P,I:rc.base.I}}}
function rcArrays(ctx){return ctx.A||(ctx.A=rcBodyArrays(ctx.p,ctx.rc.off))}
/* pos0: yeni parçanın, tablaya oturtulmadan önceki merkezi (şekil dünyada işlemden önceki yerinde) */
function rcEnd(ctx,np,step,pos0){if(!ctx||!np)return;const rc=ctx.rc;
 np.rc={base:rc.base,locked:rc.locked,steps:rc.steps.concat([step]),off:rcOff(ctx.fr,pos0||np._p0||np.pos),sc:np.size.slice(),fp:rcFp(np)}}
/* kaydedilmeyen işlem yeni parça ürettiyse: eski adımlar kilitli olarak taşınır */
function rcCarry(p,np){np.rc={base:{kind:'mesh'},locked:rcLabels(rcEff(p),p),steps:[],off:[0,0,0],sc:np.size.slice(),fp:rcFp(np)}}
function rcNote(np,label){if(np&&np.rc)np.rc=Object.assign({},np.rc,{base:Object.assign({},np.rc.base,{label})})}
function rcClone(p,np){if(!p.rc)return;const fr=rcFrame(p,p.rc.off);fr.O.add(new THREE.Vector3(...np.pos)).sub(new THREE.Vector3(...p.pos));
 np.rc=Object.assign({},p.rc,{off:rcOff(fr,np.pos),sc:np.size.slice(),fp:rcFp(np)});
 if(rcFp(p)!==p.rc.fp||!rcSameSize(p.rc.sc,p.size)&&p.rc.steps.length)np.rc=undefined}   // kaynak kayıtsız değişmişse kopya serbest şekil sayılır
/* doğru üzerindeki ön yüz kesişimlerinden c'ye en yakın olanın d boyunca işaretli uzaklığı (yoksa null) */
function rcRay(A,c,d){const P=A.P,I=A.I;let best=null;
 for(let t=0;t<I.length;t+=3){const a=I[t]*3,b=I[t+1]*3,e=I[t+2]*3,
   e1x=P[b]-P[a],e1y=P[b+1]-P[a+1],e1z=P[b+2]-P[a+2],e2x=P[e]-P[a],e2y=P[e+1]-P[a+1],e2z=P[e+2]-P[a+2],
   px=d[1]*e2z-d[2]*e2y,py=d[2]*e2x-d[0]*e2z,pz=d[0]*e2y-d[1]*e2x,det=e1x*px+e1y*py+e1z*pz;
  if(det<1e-12)continue;                                                  // arka yüz ya da paralel
  const sx=c[0]-P[a],sy=c[1]-P[a+1],sz=c[2]-P[a+2],u=(sx*px+sy*py+sz*pz)/det;if(u<-1e-6||u>1+1e-6)continue;
  const qx=sy*e1z-sz*e1y,qy=sz*e1x-sx*e1z,qz=sx*e1y-sy*e1x,v=(d[0]*qx+d[1]*qy+d[2]*qz)/det;if(v<-1e-6||u+v>1+1e-6)continue;
  const s=(e2x*qx+e2y*qy+e2z*qz)/det;if(best===null||Math.abs(s)<Math.abs(best))best=s}
 return best}
/* s: holeSpec() sonucu (dünya); dNom: yazılan çap (geçme payı hariç) */
function rcHoleStep(ctx,s,dNom){const qi=ctx.fr.q.clone().invert(),c=s.c.clone().sub(ctx.fr.O).applyQuaternion(qi),d=s.dir.clone().applyQuaternion(qi).normalize();
 const st={op:'hole',kind:s.op,d:dNom>0?dNom:s.D,fit:dNom>0?(s.D-dNom)/2:0,dep:s.dep,c:[c.x,c.y,c.z],dir:[d.x,d.y,d.z]};
 const A=rcArrays(ctx),din=s.op==='cut'?st.dir:st.dir.map(v=>-v),t=rcRay(A,st.c,din);
 if(t!==null&&Math.abs(t)<=Math.max(1,.02*rcBBox(A.P).d))st.o=-t;         // yüzeye bağlı: gövde ölçüsü değişince delik yüzeyle birlikte taşınır
 return st}
/* bakeTurn: yerel eksen çevresinde +90° */
function rcRotStep(ctx,ax){const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3().setComponent(ax,1),Math.PI/2),bc=rcBBox(rcArrays(ctx).P).c;
 return{op:'rot',q:q.toArray(),pv:[0,1,2].map(k=>-ctx.rc.off[k]-bc[k]),lbl:ax===2?'turn':'lay'}}

/* ---------- adların yazımı ---------- */
function rcDims(s){return s.map(v=>f(v,1)).join(' × ')+' mm'}
function rcBaseLabel(b,p){if(b.kind!=='prim')return b.label||'Serbest şekil';const s=b.size||(p?p.size:null);
 return RC_NAME[b.type]+(s?' '+rcDims(s):'')+(b.type==='rbox'&&b.rad>0?', köşe '+f(b.rad,1)+' mm':'')}
function rcStepLabel(st){
 if(st.op==='hole')return st.kind==='cut'?'Delik Ø'+f(st.d,2)+' mm, '+(st.dep>0?f(st.dep,2)+' mm derin':'boydan boya')+(st.fit>0?' (+'+f(st.fit,2)+' mm geçme payı)':''):'Çıkıntı Ø'+f(st.d,2)+' × '+f(st.dep,2)+' mm';
 if(st.op==='round')return{out:'Dış kenarlar',in:'İç köşeler',both:'Tüm kenarlar'}[st.where]+' '+f(st.r,2)+' mm '+(st.kind==='chamfer'?'pah kırıldı':'yuvarlatıldı');
 if(st.op==='cup')return'Kaba çevrildi, duvar '+f(st.wall,1)+' mm';
 if(st.op==='scale')return'Boyut değişti: '+rcDims(st.to);
 if(st.op==='rot')return st.lbl==='lay'?'Yan yatırıldı (90°)':'Döndürüldü (90°)';
 return'İşlem'}
function rcLabels(rc,p){return rc.locked.concat([rcBaseLabel(rc.base,p)],rc.steps.map(rcStepLabel))}

/* ---------- yeniden kurma: temel + adımlar (gövde uzayı, mm) ---------- */
function rcBaseArrays(b){
 if(b.kind==='mesh'){if(!b.P)throw new Error('Temel şekil kayıtlı değil.');return{P:Float32Array.from(b.P),I:Uint32Array.from(b.I)}}
 const s=b.size;if(b.type==='rbox'){const r=roundedBox(s[0],s[1],s[2],b.rad||0,6);return{P:r.P,I:r.I}}
 const g=geos[b.type](),a=g.attributes.position.array,P=new Float32Array(a.length);for(let i=0;i<a.length;i+=3)for(let k=0;k<3;k++)P[i+k]=a[i+k]*s[k];
 const I=Uint32Array.from(g.index.array);g.dispose();return{P,I}}
function rcRotArr(P,q,pv){const Q=new THREE.Quaternion(q[0],q[1],q[2],q[3]),v=new THREE.Vector3(),o=new Float32Array(P.length);pv=pv||[0,0,0];
 for(let i=0;i<P.length;i+=3){v.set(P[i]-pv[0],P[i+1]-pv[1],P[i+2]-pv[2]).applyQuaternion(Q);o[i]=v.x+pv[0];o[i+1]=v.y+pv[1];o[i+2]=v.z+pv[2]}return o}
async function rcStepApply(A,st){const bb=rcBBox(A.P);
 if(st.op==='hole'){const cut=st.kind==='cut',din=cut?st.dir:st.dir.map(v=>-v);let c=st.c.slice();
  if(st.o!==undefined){const t=rcRay(A,c,din);if(t===null)throw new Error((cut?'Deliğin':'Çıkıntının')+' yeri artık parçanın dışında kalıyor.');c=c.map((v,k)=>v+din[k]*(t+st.o))}
  const D=st.d+2*(st.fit||0),eps=Math.max(.5,D*.05),L=cut?(st.dep>0?st.dep+eps:bb.d*2+eps):st.dep+eps;
  const cyl=cylMesh(c.map((v,k)=>v-st.dir[k]*eps),st.dir,L,D/2,64),v0=triMetrics(A.P,A.I).V;
  const R=await boolArrays(A,cyl,cut?'subtract':'union',bb.d,['Parça',cut?'Delik':'Çıkıntı']);
  if(Math.abs(triMetrics(R.P,R.I).V-v0)<=1e-9*Math.abs(v0))throw new Error((cut?'Delik':'Çıkıntı')+' artık parçaya değmiyor.');
  return{P:R.P,I:R.I}}
 if(st.op==='round'){const mn=Math.min(...bb.s);
  if(st.where!=='in'&&st.r>=mn/2)throw new Error('Bu ölçüde en fazla '+f(mn/2*.95,1)+' mm yuvarlatılabilir (en ince ölçü '+f(mn,1)+' mm).');
  const d=Math.max(bb.d,1),wd=weld(A.P,null,A.I,d*1e-6),R=await mfRun({op:'round',A:{P:wd.P,I:Uint32Array.from(wd.I),tol:d*1e-5},r:st.r,kind:st.kind,where:st.where}),dv=(R.vol-R.vol0)/R.vol0;
  if(!R.I.length||dv<-.2)throw new Error('Bu yarıçap parçanın ince duvarlarını siliyor. Daha küçük bir değer dene.');
  if(dv>.2)throw new Error('Bu yarıçap parçadaki delikleri dolduruyor. Daha küçük bir değer dene.');
  const S=splitSharp(R.P,null,R.I,15);return{P:S.P,I:S.I}}
 if(st.op==='cup'){const W=rcRotArr(A.P,st.q),b=rcBBox(W),sz=b.s,wall=st.wall;                     // işlemin yapıldığı andaki dünya yönünde: ağız yukarı (+Z)
  if(wall*2>=Math.min(sz[0],sz[1])-.5||wall>=sz[2]-.5)throw new Error('Duvar bu ölçü için çok kalın.');
  const fx=(sz[0]-2*wall)/sz[0],fy=(sz[1]-2*wall)/sz[1],eps=Math.max(1,sz[2]*.05),fz=(sz[2]-wall+eps)/sz[2],Q=new Float32Array(W.length);
  for(let i=0;i<W.length;i+=3){Q[i]=b.c[0]+(W[i]-b.c[0])*fx;Q[i+1]=b.c[1]+(W[i+1]-b.c[1])*fy;Q[i+2]=b.mn[2]+wall+(W[i+2]-b.mn[2])*fz}
  const R=await boolArrays({P:W,I:A.I},{P:Q,I:A.I},'subtract',b.d,['Parça','İç']);
  return{P:rcRotArr(R.P,[-st.q[0],-st.q[1],-st.q[2],st.q[3]]),I:R.I}}
 if(st.op==='scale'){const k=[0,1,2].map(i=>bb.s[i]>1e-9?st.to[i]/bb.s[i]:1),P=new Float32Array(A.P.length);
  for(let i=0;i<P.length;i+=3)for(let j=0;j<3;j++)P[i+j]=bb.c[j]+(A.P[i+j]-bb.c[j])*k[j];return{P,I:A.I}}
 if(st.op==='rot')return{P:rcRotArr(A.P,st.q,[0,1,2].map(k=>bb.c[k]+(st.pv?st.pv[k]:0))),I:A.I};
 throw new Error('Bilinmeyen adım.')}
async function rcBuild(rc){let A=rcBaseArrays(rc.base);
 for(let i=0;i<rc.steps.length;i++){try{A=await rcStepApply(A,rc.steps[i])}catch(e){const er=new Error((rc.locked.length+i+2)+'. adım ('+rcStepLabel(rc.steps[i])+') uygulanamadı: '+e.message);er.step=i;throw er}}
 return A}
/* parçayı verilen tarifle baştan kur; gövde orijini dünyada yerinde kalır. Olmazsa parça değişmez, hata fırlatılır. */
let rcBusy=false;
async function rcApply(p,rc2){
 if(rcBusy)throw new Error('Önceki hesap sürüyor.');rcBusy=true;
 try{if(typeof cage!=='undefined'&&cage)cageEnd(true);
  const fr=rcFrame(p,rcEff(p).off),A=await rcBuild(rc2);
  if(!parts.includes(p))throw new Error('Parça bu arada silinmiş.');
  const np=derive(A.P,null,A.I,p.name,p,{pos:[fr.O.x,fr.O.y,fr.O.z],rot:p.rot.slice(),scale:[1,1,1]}),pos0=np.pos.slice();
  np.useVC=false;np.ground=p.ground;if(np.ground)sit(np);
  parts.splice(parts.indexOf(np),1);parts.splice(parts.indexOf(p)+1,0,np);
  const keepBase=rc2.steps.length||rc2.base.kind!=='mesh';
  np.rc={base:keepBase?rc2.base:{kind:'mesh',label:rc2.base.label},locked:rc2.locked,steps:rc2.steps,off:rcOff(fr,pos0),sc:np.size.slice(),fp:rcFp(np)};
  if(typeof hole!=='undefined'&&hole&&hole.p===p){hole=null;holePreview()}
  const was=sel===p;removePart(p);if(was)select(np);refresh();look();histMark();return np}
 finally{rcBusy=false}}

/* ---------- kaydet / yükle ---------- */
function rcOut(p,raw,E){const rc=p.rc;if(!rc)return undefined;if(raw||!rc.base.P)return rc;
 return Object.assign({},rc,{base:Object.assign({},rc.base,{P:E(rc.base.P),I:E(rc.base.I)})})}
function rcIn(rc){if(!rc||!rc.base||!Array.isArray(rc.steps))return undefined;if(typeof rc.base.P!=='string')return rc;
 return Object.assign({},rc,{base:Object.assign({},rc.base,{P:f32(rc.base.P),I:u32(rc.base.I)})})}

/* ---------- liste ve düzenleme ---------- */
let rcUI={pid:0,row:null};
function rcNum(v){return parseFloat(String(v).replace(',','.'))}
function rcSay(t,c){if(uiMode==='simple')sMsg(t,c);else msg(t,c,'#rcMsg')}
/* düzenlenebilir alanlar: [anahtar, yazı, değer, en küçük] */
function rcFields(row,rc){
 if(row==='b'){const b=rc.base;if(b.kind!=='prim')return null;
  const F=[['x','Genişlik (X)',b.size[0],.1],['y','Derinlik (Y)',b.size[1],.1],['z','Yükseklik (Z)',b.size[2],.1]];if(b.type==='rbox')F.push(['rad','Köşe yuvarlaklığı',b.rad||0,0]);return F}
 const st=rc.steps[row];if(!st)return null;
 if(st.op==='hole')return st.kind==='cut'?[['d','Delik çapı',st.d,.1],['dep','Derinlik (0 yazarsan boydan boya)',st.dep,0]]:[['d','Çıkıntı çapı',st.d,.1],['dep','Çıkıntı yüksekliği',st.dep,.1]];
 if(st.op==='round')return[['r',st.kind==='chamfer'?'Pah boyu':'Yuvarlaklık',st.r,.05]];
 if(st.op==='cup')return[['wall','Duvar kalınlığı',st.wall,.2]];
 if(st.op==='scale')return[['x','Genişlik (X)',st.to[0],.1],['y','Derinlik (Y)',st.to[1],.1],['z','Yükseklik (Z)',st.to[2],.1]];
 return null}
function rcWith(rc,row,V){
 if(row==='b'){const b=Object.assign({},rc.base,{size:[V.x,V.y,V.z]});if(b.type==='rbox')b.rad=Math.min(V.rad,Math.min(V.x,V.y,V.z)/2);return Object.assign({},rc,{base:b})}
 const st=Object.assign({},rc.steps[row]);
 if(st.op==='scale')st.to=[V.x,V.y,V.z];else Object.assign(st,V);
 const steps=rc.steps.slice();steps[row]=st;return Object.assign({},rc,{steps})}
function rcRender(){const simple=uiMode==='simple',el=$(simple?'#sRc':'#rcList');if(!el)return;
 const p=sel&&parts.includes(sel)?sel:null;let h='';
 if(!p)h=simple?'':'<p class="mut">Bir parça seç: nasıl yapıldığı burada adım adım görünür.</p>';
 else{const rc=rcEff(p),nL=rc.locked.length;if(rcUI.pid!==p.id)rcUI={pid:p.id,row:null};
  const row=(n,t,key,lock)=>{const F=!lock&&rcFields(key,rc),open=F&&String(rcUI.row)===String(key),ed=simple?'s-btn':'sm';
   let r=`<li class="rc-row${lock?' rc-lock':''}"><span class="rc-n">${n}</span><span class="rc-t">${esc(t)}${lock?' <i>(kilitli)</i>':''}</span>`+
    (F?`<button class="sm" data-rce="${key}" aria-expanded="${!!open}">Değiştir</button>`:'')+(!lock&&key!=='b'?`<button class="sm rc-del" data-rcd="${key}" title="Bu adımı kaldır" aria-label="${n}. adımı kaldır">Sil</button>`:'')+'</li>';
   if(open)r+=`<li class="rc-ed">`+F.map(([k,l,v,mn])=>`<label>${l}<input type="number" data-rcf="${k}" min="${mn}" step="0.5" value="${+(+v).toFixed(3)}" inputmode="decimal"><span>mm</span></label>`).join('')+
    `<div class="rc-go"><button class="${ed} s-pri" data-rcgo="${key}">Uygula</button><button class="${ed}" data-rcx="1">Vazgeç</button></div></li>`;
   return r};
  h='<ol class="rc-list">'+rc.locked.map((t,i)=>row(i+1,t,'l'+i,true)).join('')+row(nL+1,rcBaseLabel(rc.base,p),'b',false)+rc.steps.map((st,i)=>row(nL+2+i,rcStepLabel(st),i,false)).join('')+'</ol>';
  if(nL)h+='<p class="note">Kilitli adımlar, sonradan elle yapılan bir biçim değişikliğinden önce kaldı; ölçüleri artık değiştirilemez.</p>';
  else if(!rc.steps.length&&rc.base.kind==='prim')h+='<p class="note">Delik açtıkça, köşe yuvarladıkça adımlar buraya eklenir. Sonra herhangi birinin ölçüsünü değiştirebilirsin; gerisi kendiliğinden yeniden yapılır.</p>'}
 if(el._rc===h)return;el._rc=h;el.innerHTML=h;
 if(simple){const t=$('#sRcT');if(t)t.hidden=!p}}
async function rcEdit(p,row,V){const rc=rcMat(p);
 if(row==='b'&&!rc.steps.length&&p.type===rc.base.type&&rcIsPrim(p)){                     // adımsız hazır şekil: doğrudan ölç
  p.size=[V.x,V.y,V.z];if(p.type==='rbox')rboxRebuild(p,V.rad);else{apply(p);if(p.ground)sit(p)}refresh();look();histMark();return p}
 return rcApply(p,rcWith(rc,row,V))}
function rcDelete(p,row){const rc=rcMat(p),steps=rc.steps.slice();steps.splice(row,1);return rcApply(p,Object.assign({},rc,{steps}))}
async function rcDo(job,okText){if(rcBusy)return null;rcSay('Yeniden yapılıyor…','var(--mut)');
 try{const np=await job();rcUI.row=null;rcRender();rcSay(okText,'var(--ok)');if(uiMode==='simple')sPanel();return np}
 catch(e){rcSay(e.message+' Parça değişmedi.','var(--warn)');return null}}
function rcClick(e){const b=e.target.closest('button');if(!b)return;const p=sel,box=e.currentTarget;if(!p)return;
 const key=v=>v==='b'?'b':+v;
 if(b.dataset.rce!==undefined){rcUI.row=String(rcUI.row)===b.dataset.rce?null:key(b.dataset.rce);box._rc=null;rcRender();const i=box.querySelector('.rc-ed input');if(i)i.focus();return}
 if(b.dataset.rcx){rcUI.row=null;rcRender();return}
 if(b.dataset.rcd!==undefined){rcDo(()=>rcDelete(p,key(b.dataset.rcd)),'Adım kaldırıldı, parça yeniden yapıldı.');return}
 if(b.dataset.rcgo!==undefined){const row=key(b.dataset.rcgo),V={};let bad=null;
  box.querySelectorAll('.rc-ed input').forEach(i=>{const v=rcNum(i.value),mn=+i.min;if(!(v>=mn))bad=i;V[i.dataset.rcf]=v});
  if(bad){bad.focus();rcSay('Bu ölçü en az '+f(+bad.min,2)+' mm olmalı.','var(--warn)');return}
  rcDo(()=>rcEdit(p,row,V),'Ölçü değişti, sonraki adımlar yeniden yapıldı.')}}
['#rcList','#sRc'].forEach(s=>{const el=$(s);if(el){el.addEventListener('click',rcClick);
 el.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('.rc-ed input')){e.preventDefault();const g=el.querySelector('[data-rcgo]');if(g)g.click()}})}});
{const _p=panel;panel=function(){_p();rcRender()};const _s=sPanel;sPanel=function(){_s();rcRender()};const _u=setUI;setUI=function(m){_u(m);rcRender()}}
rcRender();
