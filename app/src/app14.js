/* ================= Gelişmiş mod düzeni: üst bar menüleri, seçim filtresi, tek açık araç paneli, ok tuşlarıyla oynatma ================= */
/* ---------- açılır menüler ---------- */
const MENUS=[...document.querySelectorAll('#bar .menu')];
function menuClose(keep){MENUS.forEach(m=>{if(m===keep)return;m.querySelector('.mpop').hidden=true;m.querySelector('.mbtn').setAttribute('aria-expanded','false')})}
MENUS.forEach(m=>{const b=m.querySelector('.mbtn'),pop=m.querySelector('.mpop'),items=()=>[...pop.querySelectorAll('button,select')].filter(x=>x.offsetParent!==null||!x.closest('[hidden]'));
 b.addEventListener('click',()=>{const open=pop.hidden;menuClose();pop.hidden=!open;b.setAttribute('aria-expanded',String(open));
  if(open){pop.style.left='';const r=pop.getBoundingClientRect(),lim=vp.getBoundingClientRect().right-8;if(r.right>lim)pop.style.left=(lim-r.right-1)+'px'}});      // çizim alanından taşmasın
 b.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();if(pop.hidden)b.click();const f=items()[0];if(f)f.focus()}});
 pop.addEventListener('click',e=>{if(e.target.closest('button'))menuClose()});
 pop.addEventListener('keydown',e=>{const L=items(),i=L.indexOf(document.activeElement);
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){if(document.activeElement.tagName==='SELECT')return;e.preventDefault();const n=L[(i+(e.key==='ArrowDown'?1:L.length-1))%L.length];if(n)n.focus()}
  else if(e.key==='Escape'){e.stopPropagation();menuClose();b.focus()}})});
addEventListener('pointerdown',e=>{if(!e.target.closest||!e.target.closest('.menu'))menuClose()},true);
addEventListener('keydown',e=>{if(e.key==='Escape')menuClose()});
/* menü düğmesi, içindeki araç açıkken onu gösterir: "Biçim ver: Kafes" */
function menuSync(){MENUS.forEach(m=>{const b=m.querySelector('.mbtn'),act=m.querySelector('.mpop [data-mode].on');b.classList.toggle('on',!!act);b.textContent=b.dataset.label+(act?': '+act.dataset.short:'')});
 const pk=$('#pick');if(pk)pk.value=mode==='edge'?(ePickKind==='any'?'any':ePickKind):'part'}

/* ---------- araç panelleri: Düzenle sekmesinde aynı anda yalnız biri açık ---------- */
const TOOL_PANEL={edge:'d-edge',cage:'d-cage',grab:'d-grab',hole:'d-hole'};
function openTool(id){openTab('edit');document.querySelectorAll('#p-edit details').forEach(d=>{d.open=d.id===id});const el=$('#'+id);if(el&&el.scrollIntoView)el.scrollIntoView({block:'start'})}
document.querySelectorAll('#bar [data-open]').forEach(b=>b.addEventListener('click',()=>{if(mode!=='sec')setMode('sec');openTool(b.dataset.open)}));
{const _m=setMode;setMode=function(m){_m(m);if(TOOL_PANEL[mode]&&uiMode!=='simple')openTool(TOOL_PANEL[mode]);if(mode!=='edge')ePickKind='any';menuSync();
  if(mode==='move')hud('Taşı: oku tut ve sürükle · 1 mm adım (Alt: adımsız)');else if(mode==='rot')hud('Döndür: halkayı tut ve çevir · 5° adım (Alt: adımsız)');else hud('')}}

/* ---------- seçim filtresi: tıklayınca parça mı, kenar mı, köşe mi seçilsin ---------- */
$('#pick').onchange=e=>{const v=e.target.value;if(v==='part'){if(mode!=='sec')setMode('sec');return}
 if(mode!=='edge')setMode('edge');ePickKind=v;menuSync();
 msg(v==='corner'?'Yalnız köşeler tutulur: köşenin üstüne gel, tut ve çek.':v==='edge'?'Yalnız kenarlar tutulur: kenarın üstüne gel, tut ve çek.':'Kenarın ya da köşenin üstüne gel, tut ve çek.','var(--mut)','#edmsg')};

document.querySelector('#bar [data-mode=edge]').addEventListener('click',()=>{ePickKind='any'},true);      // menüden seçilince filtre sıfırlanır

/* ---------- parça eklenince / sahnede tıklanınca ölçüleri göster ---------- */
function tabNow(){const b=document.querySelector('#tabs button.on');return b?b.dataset.tab:''}
document.querySelectorAll('#p-add [data-add],#addrbox').forEach(b=>b.addEventListener('click',()=>{if(sel)openTab('model')}));
cv.addEventListener('click',()=>{if(sel&&tabNow()==='add'&&uiMode!=='simple')openTab('model')});

/* ---------- ok tuşları: seçili parçayı 1 mm (Shift: 10 mm) oynat; PageUp / PageDown: yukarı / aşağı ---------- */
let nudgeT=0;
addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;if(typeof sk!=='undefined'&&sk.on)return;
 const D={ArrowLeft:[-1,0,0],ArrowRight:[1,0,0],ArrowUp:[0,1,0],ArrowDown:[0,-1,0],PageUp:[0,0,1],PageDown:[0,0,-1]}[e.key];if(!D)return;
 const p=sel;if(!p||!p.vis||(typeof cage!=='undefined'&&cage)||e.target.closest&&e.target.closest('.mpop'))return;e.preventDefault();
 if(uiMode==='simple'&&D[2])return;const k=e.shiftKey?10:1;
 if(!nudgeT)tc0={pos:p.pos.slice(),rot:p.rot.slice(),size:p.size.slice()};
 p.pos=p.pos.map((v,i)=>v+D[i]*k);if(D[2])p.ground=false;apply(p);if(typeof jointsFollow==='function')jointsFollow(p);syncInputs();stats();
 const m=mode;mode='move';hudDrag(p);mode=m;
 clearTimeout(nudgeT);nudgeT=setTimeout(()=>{nudgeT=0;p.gv++;if(typeof jointsRebase==='function')jointsRebase(p);hud('');panel();look();histMark()},700)});
menuSync();
