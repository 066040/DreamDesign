/* ================= KiCad kartından kutu =================
   kicadBoard() (pure.js) kartı okur; burada ondan kutu kurulur (manifold-3d ile):
   - alt gövde: kart çevresinin dışa ötelenmiş hali kadar tekne (taban + duvar), ağzı yukarı
   - vida ayakları: karttaki her vida deliğinin altında, içinde kılavuz delik
   - açıklıklar: kenara dayanan USB / düğme / bağlantı için duvarda pencere
   - kapak: aynı çevre, içeri geçen dudaklı; baskıya hazır (düz yüzü tablada) kutunun yanına konur
   - kart önizlemesi: kart ve parçaları kutular halinde (yalnız bakmak için, "hayalet" parça)
   Z düzeni: 0 taban altı · floor kutu içi · floor+below kartın alt yüzü · +t kartın üst yüzü · +above duvarın üstü. */
const PCB_EDGE={l:'sol kenar',r:'sağ kenar',t:'üst kenar',b:'alt kenar'},PCB_KIND={usb:'USB',button:'düğme',conn:'bağlantı'};
let pcbB=null;                                                     // okunan kart (ön yüz yukarı haliyle)
const pcbR=v=>Math.ceil(v*2-1e-9)/2;
function pcbView(){return pcbB&&$('#pcbUp').value==='B'?kiFlip(pcbB):pcbB}
/* kart için önerilen boşluklar */
function pcbAuto(B,lid){const mB=B.maxB?B.maxB.h:0,mF=B.maxF?B.maxF.h:0,eF=B.comps.filter(c=>c.side==='F'&&c.edge).reduce((m,c)=>Math.max(m,c.h),0);
 const usb=s=>B.comps.filter(c=>c.side===s&&c.edge&&c.kind==='usb').reduce((m,c)=>Math.max(m,c.h/2+3.25),0);      // kablo başlığı tabana / kapağa çarpmasın
 return{below:pcbR(Math.max(2,mB+.5,usb('B'))),above:pcbR(Math.max(2,mF+1,lid?eF+2.5:0,usb('F')))}}
function pcbOpenings(B){return B.comps.filter(c=>c.edge&&PCB_KIND[c.kind])}
/* o: {wall,gap,floor,below,above,pilot,lid,show,open:[ref…]} → {tray,lid,board,info}; diziler dünya mm */
async function pcbCase(B,o){const w=await loadManifold(),G=[],k=m=>{G.push(m);return m},M=w.Manifold;
 try{const t=B.t,zb=o.floor+o.below,zt=zb+t,H=zt+o.above,SEG=48;
  const pg=l=>l.map(p=>({x:p[0],y:p[1]})),cs=k(new w.CrossSection([pg(B.outline)])),outC=k(cs.offset(o.gap+o.wall,'Round',2,SEG)),inC=k(cs.offset(o.gap,'Round',2,SEG));
  const cyl=(x,y,z0,h,r)=>k(k(M.cylinder(h,r,r,SEG,false)).translate(x,y,z0)),box=(a,b)=>k(k(M.cube({x:b[0]-a[0],y:b[1]-a[1],z:b[2]-a[2]},false)).translate(a[0],a[1],a[2]));
  const outer=k(outC.extrude(H));let tray=k(outer.subtract(k(k(inC.extrude(H)).translate(0,0,o.floor))));
  /* vida ayakları */
  const od=h=>Math.max(h.d+2.8,o.pilot+2.4,4.5),warn=B.warn.slice();
  if(B.holes.length){let st=null;for(const h of B.holes){const c=cyl(h.x,h.y,o.floor-.5,o.below+.5,od(h)/2);st=st?k(st.add(c)):c;
    const hit=B.comps.find(c=>c.side==='B'&&c.bb[0]<h.x+od(h)/2&&c.bb[2]>h.x-od(h)/2&&c.bb[1]<h.y+od(h)/2&&c.bb[3]>h.y-od(h)/2);
    if(hit)warn.push(h.ref+' ayağı '+hit.ref+' parçasına değebilir.')}
   tray=k(tray.add(k(st.intersect(outer))));
   for(const h of B.holes)tray=k(tray.subtract(cyl(h.x,h.y,Math.min(1,o.floor/2),zb,o.pilot/2)))}
  /* duvar açıklıkları */
  const opened=[],far=o.gap+o.wall+1;
  for(const c of pcbOpenings(B)){if(!o.open.includes(c.ref))continue;const usb=c.kind==='usb',up=c.side==='F',bb=c.bb,hx=B.w/2,hy=B.h/2;
   const horiz=c.edge==='l'||c.edge==='r',a0=horiz?bb[1]:bb[0],a1=horiz?bb[3]:bb[2],am=(a0+a1)/2;
   /* USB: kablonun plastik başlığı da girsin diye 12 × 6,5 mm; diğerleri parçanın kendisi + pay */
   const u0=usb?Math.min(a0-.6,am-6):a0-.6,u1=usb?Math.max(a1+.6,am+6):a1+.6,zc=up?zt+c.h/2:zb-c.h/2;
   let z0=usb?Math.min(zc-3.25,up?zt:zb-c.h-.6):(up?zt-.2:zb-c.h-.6),z1=usb?Math.max(zc+3.25,up?zt+c.h+.6:zb):(up?zt+c.h+.6:zb+.2);
   z0=Math.max(z0,o.floor);z1=Math.min(z1,H+1);
   const lo=c.edge==='l'?[-hx-far,u0,z0]:c.edge==='r'?[Math.min(bb[2],hx)-1,u0,z0]:c.edge==='b'?[u0,-hy-far,z0]:[u0,Math.min(bb[3],hy)-1,z0];
   const hi=c.edge==='l'?[Math.max(bb[0],-hx)+1,u1,z1]:c.edge==='r'?[hx+far,u1,z1]:c.edge==='b'?[u1,Math.max(bb[1],-hy)+1,z1]:[u1,hy+far,z1];
   tray=k(tray.subtract(box(lo,hi)));opened.push(c.ref)}
  const bbx=outC.bounds(),g=v=>[v[0]??v.x,v[1]??v.y],bmn=g(bbx.min),bmx=g(bbx.max),ow=bmx[0]-bmn[0],oh=bmx[1]-bmn[1];
  /* kapak: önce yerinde (dudak aşağı), sonra ters çevrilip yanına */
  let lid=null;const lidT=o.wall,lipH=2,fit=.15,lipW=1.2;
  if(o.lid){const lo=k(cs.offset(o.gap-fit,'Round',2,SEG)),li=k(cs.offset(o.gap-fit-lipW,'Round',2,SEG));
   const a=k(k(outC.extrude(lidT)).translate(0,0,H)),lip=k(k(k(lo.subtract(li)).extrude(lipH+.2)).translate(0,0,H-lipH));
   lid=k(k(k(a.add(lip)).rotate(0,180,0)).translate(ow+8,0,H+lidT))}
  /* kart önizlemesi */
  let board=null;
  if(o.show){let bc=k(new w.CrossSection([B.outline].concat(B.cutouts).map(pg)));
   for(const h of B.holes)bc=k(bc.subtract(k(k(w.CrossSection.circle(h.d/2,24)).translate(h.x,h.y))));
   const list=[k(k(bc.extrude(t)).translate(0,0,zb))];
   for(const c of B.comps){const bb=c.bb;if(bb[2]-bb[0]<.05||bb[3]-bb[1]<.05||c.h<.05)continue;list.push(box([bb[0],bb[1],c.side==='F'?zt-.02:zb-c.h],[bb[2],bb[3],c.side==='F'?zt+c.h:zb+.02]))}
   board=k(M.union(list))}
  const out=m=>{if(!m)return null;const g=m.getMesh(),np=g.numProp,V=g.vertProperties,n=V.length/np,P=new Float32Array(n*3);
   for(let i=0;i<n;i++){P[3*i]=V[np*i];P[3*i+1]=V[np*i+1];P[3*i+2]=V[np*i+2]}const S=splitSharp(P,null,Uint32Array.from(g.triVerts),30);return{P:S.P,I:S.I}};
  return{tray:out(tray),lid:out(lid),board:out(board),info:{w:ow,h:oh,H,lidT,opened,warn,zb,zt}}}
 finally{G.forEach(m=>{try{m.delete()}catch(e){}})}}

/* ---------- arayüz ---------- */
function pcbInfo(){const B=pcbView();if(!B)return;const f1=v=>f(v,1),nF=B.comps.filter(c=>c.side==='F').length,nB=B.comps.length-nF,est=B.comps.some(c=>c.est);
 const hd=[...new Set(B.holes.map(h=>'Ø'+f(h.d,1)))].join(', ');
 $('#pcbInfo').innerHTML=`<b>${esc(B.name)}</b>: ${f1(B.w)} × ${f1(B.h)} mm, ${f1(B.t)} mm kalın<br>`+
  (B.holes.length?`${B.holes.length} vida deliği (${hd} mm)`:'Vida deliği yok')+`, ${B.comps.length} parça (üstte ${nF}, altta ${nB})<br>`+
  `En yüksek parça: üstte ${B.maxF?esc(B.maxF.ref)+' '+f1(B.maxF.h)+' mm':'yok'}, altta ${B.maxB?esc(B.maxB.ref)+' '+f1(B.maxB.h)+' mm':'yok'}`+(est?'<br><span class="mut">Bazı yükseklikler kılıf adından tahmin edildi; emin değilsen boşluğu büyüt.</span>':'');
 const L=pcbOpenings(B),prev={};$('#pcbOpen').querySelectorAll('input').forEach(i=>prev[i.dataset.ref]=i.checked);
 $('#pcbOpen').innerHTML=L.length?L.map(c=>`<label class="chk"><input type="checkbox" data-ref="${esc(c.ref)}"${(prev[c.ref]!==undefined?prev[c.ref]:c.kind!=='conn')?' checked':''}>${esc(c.ref)} · ${PCB_KIND[c.kind]}${c.val&&c.kind!=='usb'?' ('+esc(c.val.slice(0,18))+')':''} · ${PCB_EDGE[c.edge]}</label>`).join(''):'<p class="note">Kenara dayanan USB, düğme ya da bağlantı bulunamadı.</p>'}
function pcbDefaults(){const B=pcbView();if(!B)return;const a=pcbAuto(B,$('#pcbLid').checked);$('#pcbBelow').value=a.below;$('#pcbAbove').value=a.above;
 const d=B.holes.length?Math.min(...B.holes.map(h=>h.d)):2.2;$('#pcbPilot').value=+Math.max(.8,d-.4).toFixed(1)}
function pcbLoad(text,name){pcbB=kicadBoard(text,name);if(uiMode==='simple')setUI('adv');openTab('model');
 $('#pcbBox').hidden=false;$('#pcbHint').hidden=true;$('#pcbUp').value='F';pcbInfo();pcbDefaults();
 msg(pcbB.warn.join(' ')||'Kart okundu. Ölçüleri kontrol edip "Kutuyu oluştur"a bas.',pcbB.warn.length?null:'var(--ok)','#pcbMsg');msg('');
 $('#pcbBox').scrollIntoView&&$('#pcbBox').scrollIntoView({block:'nearest'});return pcbB}
function pcbOpts(){const n=(s,mn)=>{const v=parseFloat(String($(s).value).replace(',','.'));if(!(v>=mn))throw new Error($(s).previousElementSibling.textContent+' en az '+f(mn,1)+' olmalı.');return v};
 return{wall:n('#pcbWall',.8),gap:n('#pcbGap',.1),floor:n('#pcbFloor',.8),below:n('#pcbBelow',1),above:n('#pcbAbove',1),pilot:n('#pcbPilot',.5),lid:$('#pcbLid').checked,show:$('#pcbShow').checked,
  open:[...$('#pcbOpen').querySelectorAll('input:checked')].map(i=>i.dataset.ref)}}
let pcbBusy=false;
async function pcbMake(){if(pcbBusy||!pcbB)return null;pcbBusy=true;
 try{const B=pcbView(),o=pcbOpts();msg('Kutu hesaplanıyor…','var(--mut)','#pcbMsg');
  const R=await pcbCase(B,o);if(typeof cage!=='undefined'&&cage)cageEnd(true);
  parts.filter(p=>p.gen==='pcb').forEach(removePart);                                    // önceki denemeyi değiştir
  const mk=(A,name,color,ghost)=>{if(!A)return null;const p=derive(A.P,null,A.I,name,{color,mat:'ABS plastik',fill:'solid',wall:2,useVC:false,lock:true},{pos:[0,0,0],rot:[0,0,0],scale:[1,1,1]});
   p.gen='pcb';if(ghost)p.ghost=true;else p.rc={base:{kind:'mesh',label:name+' ('+B.name+' kartından)'},locked:[],steps:[],off:[0,0,0],sc:p.size.slice(),fp:rcFp(p)};return p};
  const brd=mk(R.board,'Kart (önizleme)','#2e8b57',true),lid=mk(R.lid,'Kutu kapağı','#8fb8ff'),tray=mk(R.tray,'Kutu gövdesi','#6fa8ff');
  select(tray);refresh();if(typeof fit==='function')fit();look();histMark();
  const i=R.info,dis=B.comps.some(c=>c.kind==='button'&&i.opened.includes(c.ref));
  msg(`Kutu hazır: dıştan ${f(i.w,1)} × ${f(i.h,1)} × ${f(i.H+(lid?i.lidT:0),1)} mm`+(B.holes.length?`, ${B.holes.length} vida ayağı`:'')+(i.opened.length?`, ${i.opened.length} açıklık (${i.opened.join(', ')})`:'')+'.'+
   (dis?' Düğmeler duvarın içinde kalır: basmak için ince bir uç ya da düğme başlığı gerekir.':'')+(i.warn.length?' Dikkat: '+i.warn.join(' '):''),i.warn.length?null:'var(--ok)','#pcbMsg');
  return{tray,lid,board:brd,info:i}}
 catch(e){msg('Kutu oluşturulamadı: '+e.message,null,'#pcbMsg');return null}
 finally{pcbBusy=false}}
$('#pcbPick').onclick=()=>$('#file').click();
$('#pcbGo').onclick=pcbMake;
$('#pcbUp').onchange=()=>{pcbInfo();pcbDefaults()};
$('#pcbLid').onchange=()=>{const B=pcbView();if(B)$('#pcbAbove').value=Math.max(+$('#pcbAbove').value||0,pcbAuto(B,$('#pcbLid').checked).above)};
