/* ================= Çizim alanı (2B) ================= */
const sk={hist:[],on:false,tool:'sel',shapes:[],selId:null,selEdge:-1,cur:null,view:{x:0,y:300,s:.5},ref:null,drag:null,mouse:[0,0],sid:1,w:100,h:100};
const skCv=$('#skc canvas'),skCtx=skCv.getContext('2d');
const SK_PLANES={front:{u:[1,0,0],v:[0,0,1],n:[0,-1,0],name:'Ön (X–Z)'},side:{u:[0,1,0],v:[0,0,1],n:[1,0,0],name:'Yan (Y–Z)'},top:{u:[1,0,0],v:[0,1,0],n:[0,0,1],name:'Üst (X–Y)'}};
const skW2S=(x,y)=>[sk.w/2+(x-sk.view.x)*sk.view.s,sk.h/2-(y-sk.view.y)*sk.view.s];
const skS2W=(sx,sy)=>[(sx-sk.w/2)/sk.view.s+sk.view.x,-(sy-sk.h/2)/sk.view.s+sk.view.y];
function skSize(){const r=$('#skc').getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);sk.w=Math.max(r.width,10);sk.h=Math.max(r.height,10);
 skCv.width=Math.round(sk.w*d);skCv.height=Math.round(sk.h*d);skCtx.setTransform(d,0,0,d,0,0);skDraw()}
new ResizeObserver(()=>{if(sk.on)skSize()}).observe($('#skc'));
function skLoop(s){if(s.type==='poly')return s.closed?s.pts:null;
 if(s.type==='rect'){const[a,b]=[s.a,s.b];return[[a[0],a[1]],[b[0],a[1]],[b[0],b[1]],[a[0],b[1]]]}
 const n=64,pts=[];for(let i=0;i<n;i++){const t=2*Math.PI*i/n;pts.push([s.c[0]+s.r*Math.cos(t),s.c[1]+s.r*Math.sin(t)])}return pts}
function skNodes(s){return s.type==='poly'?s.pts:s.type==='rect'?[s.a,s.b,[s.a[0],s.b[1]],[s.b[0],s.a[1]]]:[s.c,[s.c[0]+s.r,s.c[1]]]}
function skStep(){const g=Math.max(1,+$('#skgrid').value||10);let st=g;while(st*sk.view.s<9)st*=5;return st}
function skSnap(w,fromPt,shift){let[x,y]=w;
 /* var olan düğümlere yapış */
 let best=null,bd=9/sk.view.s;sk.shapes.forEach(s=>skNodes(s).forEach(p=>{const d=Math.hypot(p[0]-x,p[1]-y);if(d<bd){bd=d;best=p}}));
 if(sk.cur&&sk.cur.pts.length>=3){const p=sk.cur.pts[0],d=Math.hypot(p[0]-x,p[1]-y);if(d<bd){bd=d;best=p}}
 if(best)return[best[0],best[1]];
 if(shift&&fromPt){const dx=x-fromPt[0],dy=y-fromPt[1],L=Math.hypot(dx,dy),a=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*Math.PI/4;x=fromPt[0]+L*Math.cos(a);y=fromPt[1]+L*Math.sin(a)}
 if($('#sksnap').checked){const g=Math.max(1,+$('#skgrid').value||10);x=Math.round(x/g)*g;y=Math.round(y/g)*g}
 return[x,y]}
function skDraw(){if(!sk.on)return;const c=skCtx,W=sk.w,H=sk.h,ink=css('--ink'),acc=css('--acc');c.clearRect(0,0,W,H);
 /* ızgara */
 const st=skStep(),[x0,y0]=skS2W(0,H),[x1,y1]=skS2W(W,0);c.lineWidth=1;
 for(let x=Math.floor(x0/st)*st;x<=x1;x+=st){const s=skW2S(x,0)[0];c.strokeStyle=Math.abs(x)<1e-9?css('--g1'):css('--g2');c.beginPath();c.moveTo(s,0);c.lineTo(s,H);c.stroke()}
 for(let y=Math.floor(y0/st)*st;y<=y1;y+=st){const s=skW2S(0,y)[1];c.strokeStyle=Math.abs(y)<1e-9?css('--g1'):css('--g2');c.beginPath();c.moveTo(0,s);c.lineTo(W,s);c.stroke()}
 if(sk.ref&&$('#skshow').checked&&sk.ref.k){const r=sk.ref,[ax,ay]=skW2S((0-r.cx)*r.k,(r.by-0)*r.k);c.globalAlpha=.4;c.drawImage(r.canvas,ax,ay,r.w*r.k*sk.view.s,r.h*r.k*sk.view.s);c.globalAlpha=1}
 c.font='12px system-ui,sans-serif';c.textBaseline='middle';
 const lab=(p,q,txt)=>{const a=skW2S(...p),b=skW2S(...q),mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;c.fillStyle=css('--panel');const w=c.measureText(txt).width+8;c.fillRect(mx-w/2,my-9,w,18);c.fillStyle=css('--mut');c.textAlign='center';c.fillText(txt,mx,my)};
 const draw=(s,isCur)=>{const selected=s.id===sk.selId;c.strokeStyle=selected?'#ff7a1a':(isCur?acc:ink);c.lineWidth=selected?2.2:1.6;
  const closedLoop=s.type==='poly'?s.closed:true;
  if(s.type==='circ'){const p=skW2S(...s.c);c.beginPath();c.arc(p[0],p[1],s.r*sk.view.s,0,7);c.stroke();lab(s.c,[s.c[0]+s.r,s.c[1]],'Ø '+f(s.r*2,1))}
  else{const pts=s.type==='rect'?skLoop(s):s.pts;c.beginPath();pts.forEach((p,i)=>{const q=skW2S(...p);i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1])});if(closedLoop)c.closePath();
   if(closedLoop){c.fillStyle=selected?'rgba(255,122,26,.10)':'rgba(31,111,235,.07)';c.fill()}c.stroke();
   if(s.type==='rect'){lab(pts[0],pts[1],f(Math.abs(s.b[0]-s.a[0]),1));lab(pts[1],pts[2],f(Math.abs(s.b[1]-s.a[1]),1))}
   else{const n=pts.length,few=n<=14||!s.trace;for(let i=0;i<(closedLoop?n:n-1);i++){if(!few&&!(selected&&i===sk.selEdge))continue;const a=pts[i],b=pts[(i+1)%n];lab(a,b,f(Math.hypot(b[0]-a[0],b[1]-a[1]),1))}
    if(selected&&sk.selEdge>=0&&sk.selEdge<n){const a=skW2S(...pts[sk.selEdge]),b=skW2S(...pts[(sk.selEdge+1)%n]);c.strokeStyle='#ff7a1a';c.lineWidth=4;c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke()}}}
  if(selected||isCur){c.fillStyle=selected?'#ff7a1a':acc;skNodes(s).forEach(p=>{const q=skW2S(...p);c.fillRect(q[0]-3,q[1]-3,6,6)})}};
 sk.shapes.forEach(s=>draw(s,false));
 if(sk.cur){draw(sk.cur,true);const l=sk.cur.pts[sk.cur.pts.length-1],m=sk.mouse,a=skW2S(...l),b=skW2S(...m);c.strokeStyle=acc;c.setLineDash([5,4]);c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();c.setLineDash([]);lab(l,m,f(Math.hypot(m[0]-l[0],m[1]-l[1]),1))}
 if(sk.drag&&sk.drag.kind==='new'){draw(sk.drag.shape,true)}
 c.fillStyle=css('--mut');c.textAlign='left';c.fillText(SK_PLANES[$('#skplane').value].name+' · mm · '+f(sk.mouse[0],1)+', '+f(sk.mouse[1],1),10,H-14)}
function skSelShape(){return sk.shapes.find(s=>s.id===sk.selId)}
function skHit(sx,sy){const tol=8;
 for(let k=sk.shapes.length-1;k>=0;k--){const s=sk.shapes[k];const nodes=skNodes(s);
  for(let i=0;i<nodes.length;i++){const q=skW2S(...nodes[i]);if(Math.hypot(q[0]-sx,q[1]-sy)<=tol)return{s,node:i}}}
 for(let k=sk.shapes.length-1;k>=0;k--){const s=sk.shapes[k];
  if(s.type==='circ'){const q=skW2S(...s.c),d=Math.hypot(q[0]-sx,q[1]-sy);if(Math.abs(d-s.r*sk.view.s)<=tol||d<s.r*sk.view.s)return{s,edge:-1}}
  else{const pts=s.type==='rect'?skLoop(s):s.pts,n=pts.length,m=(s.type==='poly'&&!s.closed)?n-1:n;
   for(let i=0;i<m;i++){const a=skW2S(...pts[i]),b=skW2S(...pts[(i+1)%n]),dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((sx-a[0])*dx+(sy-a[1])*dy)/L2)),d=Math.hypot(a[0]+t*dx-sx,a[1]+t*dy-sy);if(d<=tol)return{s,edge:i}}
   if((s.type==='rect'||s.closed)&&pointInPoly(skS2W(sx,sy),skLoop(s)))return{s,edge:-1}}}
 return null}
function pointInPoly(p,pl){let inside=false;for(let i=0,j=pl.length-1;i<pl.length;j=i++){const a=pl[i],b=pl[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
function skProps(){const el=$('#skprops'),s=skSelShape();
 if(!s){el.innerHTML='<p class="note">Bir şekil seç. Çizgi aracında tıkla, çift tıkla/Enter ile bitir; ilk noktaya tıklarsan kapanır. Shift: 0/45/90°. Tekerlek: yakınlaş, orta/sağ tuş: kaydır.</p>';return}
 let h='';
 if(s.type==='circ')h=`<label>Çap (mm)</label><input id="skd" type="number" value="${+(s.r*2).toFixed(2)}"><label>Merkez X · Y</label><div class="two"><input id="skcx" type="number" value="${+s.c[0].toFixed(2)}"><input id="skcy" type="number" value="${+s.c[1].toFixed(2)}"></div>`;
 else if(s.type==='rect')h=`<label>Genişlik · Yükseklik (mm)</label><div class="two"><input id="skw" type="number" value="${+Math.abs(s.b[0]-s.a[0]).toFixed(2)}"><input id="skh" type="number" value="${+Math.abs(s.b[1]-s.a[1]).toFixed(2)}"></div>`;
 else{const n=s.pts.length,e=sk.selEdge;h=`<p class="note">${n} nokta · ${s.closed?'kapalı · alan '+f(Math.abs(polyArea(s.pts))/100,1)+' cm²':'açık'}</p>`;
  if(e>=0&&e<n){const a=s.pts[e],b=s.pts[(e+1)%n];h+=`<label>Seçili kenar uzunluğu (mm)</label><input id="skedge" type="number" value="${+Math.hypot(b[0]-a[0],b[1]-a[1]).toFixed(2)}"><div class="btnrow"><button class="sm" id="skhor">Yatay yap</button><button class="sm" id="skver">Dikey yap</button></div><p class="note">Kenarın ikinci ucu hareket eder.</p>`}
  else h+='<p class="note">Bir kenara tıklarsan uzunluğunu yazabilirsin.</p>';
  if(!s.closed&&n>=3)h+='<div class="btnrow"><button class="sm" id="skclosepoly">Kapat</button></div>'}
 h+='<div class="btnrow"><button class="sm" id="skdel">Sil</button></div>';el.innerHTML=h;
 const num=id=>el.querySelector(id);
 if(s.type==='circ'){num('#skd').onchange=e=>{const v=+e.target.value;if(v>0){s.r=v/2;skDraw()}};num('#skcx').onchange=e=>{s.c[0]=+e.target.value;skDraw()};num('#skcy').onchange=e=>{s.c[1]=+e.target.value;skDraw()}}
 if(s.type==='rect'){num('#skw').onchange=e=>{const v=+e.target.value;if(v>0){s.b[0]=s.a[0]+Math.sign(s.b[0]-s.a[0]||1)*v;skDraw()}};num('#skh').onchange=e=>{const v=+e.target.value;if(v>0){s.b[1]=s.a[1]+Math.sign(s.b[1]-s.a[1]||1)*v;skDraw()}}}
 if(num('#skedge')){const n=s.pts.length,e=sk.selEdge,mv=(fn)=>{const a=s.pts[e],j=(e+1)%n,b=s.pts[j];fn(a,b,j);skDraw();skProps()};
  num('#skedge').onchange=ev=>{const L=+ev.target.value;if(L>0)mv((a,b,j)=>{const d=Math.hypot(b[0]-a[0],b[1]-a[1])||1;s.pts[j]=[a[0]+(b[0]-a[0])/d*L,a[1]+(b[1]-a[1])/d*L]})};
  num('#skhor').onclick=()=>mv((a,b,j)=>{s.pts[j]=[b[0],a[1]]});num('#skver').onclick=()=>mv((a,b,j)=>{s.pts[j]=[a[0],b[1]]})}
 if(num('#skclosepoly'))num('#skclosepoly').onclick=()=>{s.closed=true;skDraw();skProps()};

 num('#skdel').onclick=()=>{skPush();sk.shapes=sk.shapes.filter(q=>q!==s);sk.selId=null;skDraw();skProps()}}
function skPush(){}/* geri alma artık genel sistemde (Hist) */
function skUndo(){const c=sk.cur;if(c&&c.pts.length){c.pts.pop();if(!c.pts.length)sk.cur=null;skDraw();return}histUndo()}
function skInfo(t){$('#skinfo').textContent=t||''}
function skTool(t){sk.tool=t;skFinish(false);document.querySelectorAll('#sktools button').forEach(b=>b.classList.toggle('on',b.dataset.sk===t));skCv.style.cursor=t==='sel'?'default':'crosshair';
 skInfo({sel:'',line:'Tıkla: nokta · çift tıkla / Enter: bitir · ilk noktaya tıkla: kapat',rect:'Sürükleyerek köşegen çiz',circ:'Merkezden yarıçap sürükle'}[t])}
function skFinish(keep){const c=sk.cur;sk.cur=null;if(c&&keep&&c.pts.length>=2){sk.shapes.push(c);sk.selId=c.id;skProps()}skDraw()}
document.querySelectorAll('#sktools button').forEach(b=>b.onclick=()=>skTool(b.dataset.sk));
$('#skundo').onclick=skUndo;$('#skredo').onclick=()=>histRedo();
$('#skall').onclick=()=>{sk.shapes=[];sk.cur=null;sk.selId=null;skProps();skDraw()};
$('#skrefdel').onclick=()=>{sk.ref=null;sk.shapes=sk.shapes.filter(q=>!q.trace);sk.selId=null;$('#skref').hidden=true;msg('',null,'#skmsg');skProps();skDraw()};
function skPos(e){const r=skCv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]}
let skPan=null,skSpace=false;
skCv.addEventListener('contextmenu',e=>e.preventDefault());
skCv.addEventListener('wheel',e=>{e.preventDefault();const[sx,sy]=skPos(e),w=skS2W(sx,sy),k=Math.pow(1.0015,-e.deltaY);sk.view.s=Math.min(Math.max(sk.view.s*k,.02),40);
 const w2=skS2W(sx,sy);sk.view.x+=w[0]-w2[0];sk.view.y+=w[1]-w2[1];skDraw()},{passive:false});
skCv.addEventListener('pointerdown',e=>{try{skCv.setPointerCapture(e.pointerId)}catch(_){}const[sx,sy]=skPos(e);
 if(e.button===1||e.button===2||skSpace){skPan={sx,sy,vx:sk.view.x,vy:sk.view.y};return}
 if(e.button!==0)return;
 const raw=skS2W(sx,sy);
 if(sk.tool!=='sel'||true)skPush();
 if(sk.tool==='line'){const last=sk.cur?sk.cur.pts[sk.cur.pts.length-1]:null,p=skSnap(raw,last,e.shiftKey);
  if(!sk.cur){sk.cur={id:sk.sid++,type:'poly',pts:[p],closed:false}}
  else{const f0=sk.cur.pts[0];if(sk.cur.pts.length>=3&&Math.hypot(p[0]-f0[0],p[1]-f0[1])<1e-6){sk.cur.closed=true;skFinish(true);return}
   const l=sk.cur.pts[sk.cur.pts.length-1];if(Math.hypot(p[0]-l[0],p[1]-l[1])>1e-6)sk.cur.pts.push(p)}
  skDraw();return}
 if(sk.tool==='rect'){const p=skSnap(raw);sk.drag={kind:'new',shape:{id:sk.sid++,type:'rect',a:p,b:p.slice()}};return}
 if(sk.tool==='circ'){const p=skSnap(raw);sk.drag={kind:'new',shape:{id:sk.sid++,type:'circ',c:p,r:0}};return}
 const h=skHit(sx,sy);
 if(!h){sk.selId=null;sk.selEdge=-1;skProps();skDraw();return}
 sk.selId=h.s.id;sk.selEdge=h.edge!==undefined?h.edge:-1;
 if(h.node!==undefined)sk.drag={kind:'node',s:h.s,i:h.node};
 else sk.drag={kind:'move',s:h.s,start:raw,orig:JSON.parse(JSON.stringify(h.s))};
 skProps();skDraw()});
skCv.addEventListener('pointermove',e=>{const[sx,sy]=skPos(e);
 if(skPan){sk.view.x=skPan.vx-(sx-skPan.sx)/sk.view.s;sk.view.y=skPan.vy+(sy-skPan.sy)/sk.view.s;skDraw();return}
 const raw=skS2W(sx,sy),last=sk.cur?sk.cur.pts[sk.cur.pts.length-1]:null;sk.mouse=(sk.tool==='sel'&&!sk.drag)?raw:skSnap(raw,last,e.shiftKey);
 const d=sk.drag;
 if(d&&d.kind==='new'){const p=sk.mouse;if(d.shape.type==='rect')d.shape.b=p;else d.shape.r=Math.hypot(p[0]-d.shape.c[0],p[1]-d.shape.c[1])}
 else if(d&&d.kind==='node'){const s=d.s,p=skSnap(raw,null,false);
  if(s.type==='poly')s.pts[d.i]=p;
  else if(s.type==='rect'){if(d.i===0)s.a=p;else if(d.i===1)s.b=p;else if(d.i===2){s.a=[p[0],s.a[1]];s.b=[s.b[0],p[1]]}else{s.b=[p[0],s.b[1]];s.a=[s.a[0],p[1]]}}
  else{if(d.i===0)s.c=p;else s.r=Math.hypot(p[0]-s.c[0],p[1]-s.c[1])}}
 else if(d&&d.kind==='move'){const g=$('#sksnap').checked?Math.max(1,+$('#skgrid').value||10):0;let dx=raw[0]-d.start[0],dy=raw[1]-d.start[1];if(g){dx=Math.round(dx/g)*g;dy=Math.round(dy/g)*g}
  const o=d.orig,s=d.s;if(s.type==='poly')s.pts=o.pts.map(p=>[p[0]+dx,p[1]+dy]);else if(s.type==='rect'){s.a=[o.a[0]+dx,o.a[1]+dy];s.b=[o.b[0]+dx,o.b[1]+dy]}else s.c=[o.c[0]+dx,o.c[1]+dy]}
 skDraw()});
skCv.addEventListener('pointerup',e=>{skPan=null;const d=sk.drag;sk.drag=null;
 if(d&&d.kind==='new'){const s=d.shape,ok=s.type==='rect'?(Math.abs(s.b[0]-s.a[0])>0&&Math.abs(s.b[1]-s.a[1])>0):s.r>0;if(ok){sk.shapes.push(s);sk.selId=s.id}}
 else if(d)skProps();
 skProps();skDraw()});
skCv.addEventListener('dblclick',()=>{if(sk.tool==='line'&&sk.cur){if(sk.cur.pts.length>2)sk.cur.pts.pop();skFinish(true)}});
function skOpen(on){sk.on=on;$('#sk').classList.toggle('on',on);if(on){skSize();skTool(sk.tool);skProps()}}
$('#skopen').onclick=()=>skOpen(true);$('#skclose').onclick=()=>skOpen(false);
$('#skplane').onchange=skDraw;$('#skgrid').oninput=skDraw;
addEventListener('keyup',e=>{if(e.code==='Space')skSpace=false});
function skKey(e){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.shiftKey){e.preventDefault();skUndo();return true}
 if((e.ctrlKey||e.metaKey)&&(e.key.toLowerCase()==='y'||(e.key.toLowerCase()==='z'&&e.shiftKey))){e.preventDefault();histRedo();return true}
 if(e.code==='Space'){skSpace=true;e.preventDefault();return true}
 const k=e.key.toLowerCase();
 if(k==='escape'){if(sk.cur){sk.cur=null;skDraw()}else skOpen(false);return true}
 if(k==='enter'){if(sk.cur)skFinish(true);return true}

 if(k==='delete'||k==='backspace'){const s=skSelShape();if(s){skPush();sk.shapes=sk.shapes.filter(q=>q!==s);sk.selId=null;skProps();skDraw()}return true}
 if(k==='l'){skTool('line');return true}if(k==='r'){skTool('rect');return true}if(k==='c'){skTool('circ');return true}if(k==='s'){skTool('sel');return true}
 return true}
/* fotoğraftan ana hat */
$('#skimg').onclick=()=>$('#skfile').click();
$('#skfile').onchange=e=>{const file=e.target.files[0];e.target.value='';if(!file)return;const url=URL.createObjectURL(file),im=new Image();
 im.onload=()=>{const sc=Math.min(1,520/Math.max(im.width,im.height)),w=Math.max(8,Math.round(im.width*sc)),h=Math.max(8,Math.round(im.height*sc)),cv2=document.createElement('canvas');cv2.width=w;cv2.height=h;
  const g=cv2.getContext('2d');g.drawImage(im,0,0,w,h);URL.revokeObjectURL(url);
  sk.ref={canvas:cv2,w,h,data:g.getImageData(0,0,w,h),k:0,cx:0,by:0};$('#skref').hidden=false;skTrace()};
 im.onerror=()=>msg('Görüntü okunamadı.',null,'#skmsg');im.src=url};
$('#sktol').oninput=e=>$('#sktolv').textContent=e.target.value;
function skTrace(){const r=sk.ref;if(!r)return;
 const m=cleanMask(maskFromImage(r.data.data,r.w,r.h,+$('#sktol').value),r.w,r.h),pts=traceContour(m,r.w,r.h);
 if(pts.length<12){msg('Ana hat bulunamadı. Eşiği değiştir.',null,'#skmsg');return}
 const s=rdp(pts,+$('#skeps').value);let minX=1e9,maxX=-1e9,maxY=-1e9;pts.forEach(p=>{minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);maxY=Math.max(maxY,p[1])});
 const k=(+$('#skrefw').value||1000)/Math.max(maxX-minX,1);r.k=k;r.cx=(minX+maxX)/2;r.by=maxY;
 sk.shapes=sk.shapes.filter(q=>!q.trace);const id=sk.sid++;sk.shapes.push({id,type:'poly',closed:true,trace:true,pts:s.map(p=>[(p[0]-r.cx)*k,(r.by-p[1])*k])});
 sk.selId=id;sk.selEdge=-1;sk.view.s=Math.min(sk.w,sk.h)/(1.4*Math.max((maxX-minX)*k,(maxY)*k));sk.view.x=0;sk.view.y=(r.by*k)/2;
 msg(s.length+' noktalı ana hat çıkarıldı (fotoğraf genişliği '+f(+$('#skrefw').value,0)+' mm).','var(--ok)','#skmsg');skProps();skDraw()}
$('#skdo').onclick=skTrace;$('#skrefw').onchange=skTrace;$('#skeps').onchange=skTrace;
/* katıya çevir */
function addPlain(P,I,name,mat,color){const p=derive(P,null,I,name,{color:color||'#6fa8ff',mat:mat||'Alüminyum',fill:'solid',wall:2,lock:true,useVC:false},{pos:[0,0,0],rot:[0,0,0],scale:[1,1,1]});p.ground=false;
 p.orig=snap(p);select(p);view('iso');return p}
function catMesh(list){let nv=0,ni=0;list.forEach(m=>{nv+=m.P.length;ni+=m.I.length});const P=new Float32Array(nv),I=new Uint32Array(ni);let ov=0,oi=0,vo=0;
 list.forEach(m=>{P.set(m.P,ov);for(let i=0;i<m.I.length;i++)I[oi+i]=m.I[i]+vo;vo+=m.P.length/3;ov+=m.P.length;oi+=m.I.length});return{P,I}}
function skClosed(){return sk.shapes.map(skLoop).filter(Boolean).filter(l=>l.length>=3)}
$('#skext').onclick=()=>{const loops=skClosed();if(!loops.length){msg('Önce kapalı bir şekil çiz.',null,'#skmsg');return}
 const pl=SK_PLANES[$('#skplane').value],d=+$('#skdepth').value||100,off=+$('#skoff').value||0,c=$('#skcenter').checked,z0=(c?-d/2:0)+off,z1=(c?d/2:d)+off;
 const o=[0,0,0],plane={u:pl.u,v:pl.v,n:pl.n,o},m=catMesh(loops.map(l=>extrudeLoop(l,plane,z0,z1)));
 const p=addPlain(m.P,m.I,'Ekstrüde '+loops.length+' şekil');msg('Parça eklendi: '+p.name+'. Çizimi kapatıp 3B görünümde çalışabilirsin.','var(--ok)','#skmsg')};
$('#skrev').onclick=()=>{const loops=skClosed();if(!loops.length){msg('Önce kapalı bir şekil çiz.',null,'#skmsg');return}
 if($('#skplane').value==='top'){msg('Döndürme için Ön ya da Yan düzlemi seç (eksen dikey Z).',null,'#skmsg');return}
 let clipped=false;const meshes=loops.map(l=>{const q=l.map(p=>{if(p[0]<0)clipped=true;return[Math.max(0,p[0]),p[1]]});return revolveProfile(q,72)});
 const m=catMesh(meshes),p=addPlain(m.P,m.I,'Döndürme');msg('Parça eklendi: '+p.name+(clipped?' (X<0 kısım kırpıldı)':'')+'.','var(--ok)','#skmsg')};

/* ================= Raf (yan sahadaki parçalar) ================= */
const shelf=[];let shid=1;
function shelfDraw(){const el=$('#shelf');el.innerHTML=shelf.length?'':'<p class="mut">Raf boş.</p>';
 shelf.forEach(it=>{const d=document.createElement('div');d.className='card';d.draggable=true;
  d.innerHTML=`<b>${esc(it.name)}</b><span class="mut">${it.dims.map(v=>f(v,0)).join('×')}</span>`;
  const add=document.createElement('button');add.className='sm';add.textContent='+';add.title='Orijine ekle';add.onclick=()=>spawn(it,null);
  const del=document.createElement('button');del.className='sm';del.textContent='×';del.title='Raftan sil';del.onclick=()=>{shelf.splice(shelf.indexOf(it),1);shelfDraw()};
  d.append(add,del);d.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/dreamdesign-shelf',String(it.id));e.dataTransfer.effectAllowed='copy'});el.appendChild(d)})}
function shelfEntry(name,P,C,I,mat,color){const bb=new THREE.Box3(),v=new THREE.Vector3();for(let i=0;i<P.length;i+=3)bb.expandByPoint(v.set(P[i],P[i+1],P[i+2]));
 const c=bb.getCenter(new THREE.Vector3()),s=bb.getSize(new THREE.Vector3());P=Float32Array.from(P);for(let i=0;i<P.length;i+=3){P[i]-=c.x;P[i+1]-=c.y;P[i+2]-=c.z}
 return{id:shid++,name,P,C:C?Float32Array.from(C):null,I:Uint32Array.from(I),mat:mat||'Alüminyum',color:color||'#6fa8ff',dims:[s.x,s.y,s.z]}}
function shelfAddPart(p){const w=localArrays(p),sc=p.size.map((v,i)=>v/p.base[i]);for(let i=0;i<w.P.length;i+=3){w.P[i]*=sc[0];w.P[i+1]*=sc[1];w.P[i+2]*=sc[2]}
 shelf.push(shelfEntry(p.name,w.P,w.C,w.I,p.mat,p.color));shelfDraw()}
$('#shadd').onclick=()=>{if(sel)shelfAddPart(sel);else msg('Önce bir parça seç.',null,'#msg')};
$('#shclear').onclick=()=>{shelf.length=0;shelfDraw()};
function spawn(it,e){let point=new THREE.Vector3(0,0,0),n=new THREE.Vector3(0,0,1);
 if(e){const r=pickAt(e);if(r){point=r.h.point.clone();n=r.h.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(r.h.object.matrixWorld)).normalize()}
  else{rc.setFromCamera(ndc(e),cam);const q=rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),0),new THREE.Vector3());if(q)point=q}}
 const p=derive(Float32Array.from(it.P),it.C?Float32Array.from(it.C):null,Uint32Array.from(it.I),it.name,{color:it.color,mat:it.mat,fill:'solid',wall:2,lock:true,useVC:false},{pos:[0,0,0],rot:[0,0,0],scale:[1,1,1]});
 p.ground=false;
 let nn=new THREE.Vector3(0,0,1);
 if(e&&$('#shalign').checked){nn=n;const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),nn),eu=new THREE.Euler().setFromQuaternion(q,'XYZ');p.rot=[eu.x/D2R,eu.y/D2R,eu.z/D2R]}
 p.pos=[point.x,point.y,point.z];apply(p);
 const w=worldArrays(p).P;let mn=1e30;for(let i=0;i<w.length;i+=3){const d=w[i]*nn.x+w[i+1]*nn.y+w[i+2]*nn.z;if(d<mn)mn=d}
 const sh=point.dot(nn)-mn;p.pos=[p.pos[0]+nn.x*sh,p.pos[1]+nn.y*sh,p.pos[2]+nn.z*sh];apply(p);
 p.orig=snap(p);select(p);return p}
vp.addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('text/dreamdesign-shelf')){e.preventDefault();e.dataTransfer.dropEffect='copy'}});
/* hazır parçalar */
function libWheel(){const m=revolveProfile([[0,-30],[200,-30],[200,-110],[330,-110],[330,110],[200,110],[200,30],[0,30]],72),P=m.P;
 for(let i=0;i<P.length;i+=3){const y=P[i+1],z=P[i+2];P[i+1]=-z;P[i+2]=y}   // eksen Z → Y
 fixWinding(P,m.I);return shelfEntry('Tekerlek',P,null,m.I,'ABS plastik','#2b2f36')}
function libRotor(){const blade=s=>extrudeLoop([[s*40,-30],[s*700,-12],[s*700,12],[s*40,30]],{u:[1,0,0],v:[0,1,0],n:[0,0,1],o:[0,0,0]},-4,4),
  hub=revolveProfile([[0,-18],[45,-18],[45,18],[0,18]],40),m=catMesh([hub,blade(1),blade(-1)]);return shelfEntry('Pervane',m.P,null,m.I,'Karbon fiber')}
function libWing(){const t=.12,mm=.02,pp=.4,xs=[];for(let i=0;i<=24;i++)xs.push((1-Math.cos(Math.PI*i/24))/2);
 const yc=x=>x<pp?mm/(pp*pp)*(2*pp*x-x*x):mm/((1-pp)**2)*((1-2*pp)+2*pp*x-x*x),yt=x=>5*t*(.2969*Math.sqrt(x)-.126*x-.3516*x*x+.2843*x**3-.1036*x**4),C=1200;
 const up=xs.map(x=>[x*C,(yc(x)+yt(x))*C]),lo=xs.slice(1,-1).reverse().map(x=>[x*C,(yc(x)-yt(x))*C]),loop=up.concat(lo).reverse();
 const m=extrudeLoop(loop,{u:[1,0,0],v:[0,0,1],n:[0,1,0],o:[0,0,0]},-1500,1500);return shelfEntry('Kanat (NACA 2412)',m.P,null,m.I,'Karbon fiber')}
function libTube(){const m=revolveProfile([[40,0],[50,0],[50,1000],[40,1000]],48);return shelfEntry('Boru',m.P,null,m.I,'Alüminyum')}
function libInit(){shelf.push(libWheel(),libRotor(),libWing(),libTube());shelfDraw()}

/* ================= Eklemler ================= */
const joints=[];let jid=1,pendJoint=false;const poses=[];
const jv=a=>new THREE.Vector3(a[0],a[1],a[2]);
function rigidOf(p){return{pos:jv(p.pos),q:new THREE.Quaternion().setFromEuler(new THREE.Euler(p.rot[0]*D2R,p.rot[1]*D2R,p.rot[2]*D2R,'XYZ'))}}
function setRigid(p,pos,q){const e=new THREE.Euler().setFromQuaternion(q,'XYZ');p.pos=[pos.x,pos.y,pos.z];p.rot=[e.x/D2R,e.y/D2R,e.z/D2R];apply(p)}
function jMotion(J,v){/* ebeveyn kalıbında hareket: q çarpanı ve konum dönüşümü */
 if(J.type==='rev'){const Rq=new THREE.Quaternion().setFromAxisAngle(J.axisP,v*D2R);return{Rq,fn:x=>J.pivotP.clone().add(x.clone().sub(J.pivotP).applyQuaternion(Rq))}}
 const Rq=new THREE.Quaternion();return{Rq,fn:x=>x.clone().addScaledVector(J.axisP,v)}}
function evalJoint(J,depth){if((depth||0)>30)return;const A=rigidOf(J.parent),mo=jMotion(J,J.val);
 const pos=mo.fn(J.posL),q=mo.Rq.clone().multiply(J.qL);
 setRigid(J.child,A.pos.clone().add(pos.applyQuaternion(A.q)),A.q.clone().multiply(q));
 if(J.child.ground)J.child.ground=false;
 joints.forEach(K=>{if(K.parent===J.child)evalJoint(K,(depth||0)+1)})}
function jointsFollow(p){let any=false;joints.forEach(K=>{if(K.parent===p){evalJoint(K,0);any=true}});if(any)drawJointMarks()}
function jointsRebase(p){joints.forEach(J=>{if(J.child!==p)return;const A=rigidOf(J.parent),C=rigidOf(p),Ai=A.q.clone().invert(),
  rel=C.pos.clone().sub(A.pos).applyQuaternion(Ai),qrel=Ai.clone().multiply(C.q),mo=jMotion(J,-J.val);
  J.posL=J.type==='rev'?mo.fn(rel):rel.clone().addScaledVector(J.axisP,-J.val);J.qL=J.type==='rev'?mo.Rq.clone().multiply(qrel):qrel});
 jointsFollow(p);drawJointMarks()}
function jointsDropPart(p){for(let i=joints.length-1;i>=0;i--)if(joints[i].parent===p||joints[i].child===p)joints.splice(i,1);jointList()}
function addJoint(parent,child,type,axisW,pivotW,min,max){
 for(let q=parent;q;){if(q===child)return'Döngü oluşur: üst parça zaten alt parçanın altında.';const pj=joints.find(j=>j.child===q);q=pj?pj.parent:null}
 if(joints.some(j=>j.child===child))return'Bu alt parçanın zaten bir üst parçası var.';
 const A=rigidOf(parent),C=rigidOf(child),Ai=A.q.clone().invert();
 const J={id:jid++,parent,child,type,min,max,val:0,axisP:axisW.clone().normalize().applyQuaternion(Ai),pivotP:pivotW.clone().sub(A.pos).applyQuaternion(Ai),
  posL:C.pos.clone().sub(A.pos).applyQuaternion(Ai),qL:Ai.clone().multiply(C.q)};
 joints.push(J);jointList();drawJointMarks();return null}
function fillJointDefaults(){const c=parts.find(p=>p.id===+$('#jc').value);if(!c)return;const b=worldBox(c);['x','y','z'].forEach((a,i)=>$('#j'+a).value=+((b.mn[i]+b.mx[i])/2).toFixed(2))}
$('#jctr').onclick=fillJointDefaults;
$('#jpick').onclick=()=>{pendJoint=true;cv.style.cursor='crosshair';msg('Modelde pivot noktasına tıkla.','var(--mut)','#jmsg')};
$('#jt').onchange=()=>{const r=$('#jt').value==='rev';$('#jmin').value=r?-90:-100;$('#jmax').value=r?90:100};
$('#jadd').onclick=()=>{const pa=parts.find(p=>p.id===+$('#jp').value),ch=parts.find(p=>p.id===+$('#jc').value);if(!pa||!ch||pa===ch){msg('İki ayrı parça seç.',null,'#jmsg');return}
 const ax=new THREE.Vector3();ax.setComponent(+$('#ja').value,1);
 const err=addJoint(pa,ch,$('#jt').value,ax,new THREE.Vector3(+$('#jx').value||0,+$('#jy').value||0,+$('#jz').value||0),+$('#jmin').value,+$('#jmax').value);
 msg(err||'Eklem eklendi.',err?null:'var(--ok)','#jmsg')};
function jointList(){const el=$('#jlist');el.innerHTML=joints.length?'':'<p class="mut">Eklem yok.</p>';
 joints.forEach(J=>{const d=document.createElement('div');d.className='card';d.style.cursor='default';d.style.flexWrap='wrap';
  const u=J.type==='rev'?'°':' mm';
  d.innerHTML=`<b style="flex:1 1 100%">${esc(J.parent.name)} → ${esc(J.child.name)} <span class="mut">(${J.type==='rev'?'dönel':'kayar'})</span></b>`;
  const r=document.createElement('input');r.type='range';r.min=J.min;r.max=J.max;r.step=J.type==='rev'?1:5;r.value=J.val;r.style.flex='1';
  const lb=document.createElement('span');lb.textContent=f(J.val,0)+u;lb.style.minWidth='52px';lb.style.textAlign='right';
  r.oninput=()=>{J.val=+r.value;lb.textContent=f(J.val,0)+u;evalJoint(J,0);drawJointMarks();stats()};
  const x=document.createElement('button');x.className='sm';x.textContent='×';x.onclick=()=>{joints.splice(joints.indexOf(J),1);jointList();drawJointMarks()};
  d.append(r,lb,x);el.appendChild(d)});
 poseList()}
function poseList(){const el=$('#poses');el.innerHTML='';poses.forEach(ps=>{const d=document.createElement('div');d.className='card';d.style.cursor='default';
  d.innerHTML=`<b>${esc(ps.name)}</b>`;const a=document.createElement('button');a.className='sm';a.textContent='Uygula';a.onclick=()=>{joints.forEach(J=>{if(ps.vals[J.id]!==undefined)J.val=ps.vals[J.id]});
   joints.filter(J=>!joints.some(K=>K.child===J.parent)).forEach(J=>evalJoint(J,0));/* köklerden başlayıp aşağı yay */
   jointList();drawJointMarks();stats()};
  const x=document.createElement('button');x.className='sm';x.textContent='×';x.onclick=()=>{poses.splice(poses.indexOf(ps),1);poseList()};d.append(a,x);el.appendChild(d)})}
$('#posesave').onclick=()=>{const vals={};joints.forEach(J=>vals[J.id]=J.val);poses.push({name:'Poz '+(poses.length+1),vals});poseList()};
const jGroup=new THREE.Group();scene.add(jGroup);
function drawJointMarks(){while(jGroup.children.length){const o=jGroup.children.pop();o.geometry.dispose();o.material.dispose()}
 joints.forEach(J=>{const A=rigidOf(J.parent),pv=A.pos.clone().add(J.pivotP.clone().applyQuaternion(A.q)),ax=J.axisP.clone().applyQuaternion(A.q).normalize();
  const m=new THREE.MeshBasicMaterial({color:lin(J.type==='rev'?0xff3d7f:0x2fbf71),depthTest:false});
  const s=new THREE.Mesh(new THREE.SphereGeometry(10,12,8),m);s.position.copy(pv);s.renderOrder=12;jGroup.add(s);
  const lg=new THREE.BufferGeometry().setFromPoints([pv.clone().addScaledVector(ax,-90),pv.clone().addScaledVector(ax,90)]);
  const l=new THREE.Line(lg,new THREE.LineBasicMaterial({color:lin(J.type==='rev'?0xff3d7f:0x2fbf71),depthTest:false}));l.renderOrder=12;jGroup.add(l)})}
