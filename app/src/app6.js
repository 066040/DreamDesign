/* ================= Genel geri al / ileri al (Ctrl+Z, Ctrl+Y) =================
   Her kullanıcı işleminden sonra tüm durumun (parçalar, eklemler, ölçüler, raf, çizim) küçük bir görüntüsü alınır.
   Değişmeyen geometri dizileri paylaşılır, bu yüzden bellek az gider. */
const Hist={undo:[],redo:[],cur:null,max:40,busy:false,lastInput:0};
function histCapture(){const d=stateData(true),S={d,sp:sigOf(d.parts),sj:sigOf([d.joints,d.poses]),sm:sigOf(d.measures),ss:sigOf(d.shelf),sk:d.sk};
 S.sig=S.sp+'#'+S.sj+'#'+S.sm+'#'+S.ss+'#'+S.sk;return S}
function histBytes(){const seen=new Set();let n=0;[...Hist.undo,...Hist.redo,Hist.cur].forEach(S=>{if(!S)return;S.d.parts.forEach(p=>[p.P,p.I,p.C].forEach(a=>{if(a&&!seen.has(a)){seen.add(a);n+=a.byteLength}}))});return n}
function histBtn(){const u=$('#hundo'),r=$('#hredo');if(u)u.disabled=!Hist.undo.length;if(r)r.disabled=!Hist.redo.length;
 const a=$('#skundo'),b=$('#skredo');if(a)a.disabled=!Hist.undo.length&&!(sk.cur&&sk.cur.pts.length);if(b)b.disabled=!Hist.redo.length}
function histMark(){if(Hist.busy||(typeof cage!=='undefined'&&cage)||grab||tcActive||sk.drag)return;
 let S;try{S=histCapture()}catch(e){console.warn('geri-al görüntüsü alınamadı',e);return}
 if(!Hist.cur){Hist.cur=S;histBtn();return}
 if(S.sig===Hist.cur.sig)return;
 Hist.undo.push(Hist.cur);Hist.cur=S;Hist.redo.length=0;
 while(Hist.undo.length>Hist.max||(Hist.undo.length>3&&histBytes()>3e8))Hist.undo.shift();histBtn()}
function histGo(from,to){Hist.busy=true;
 try{const d=to.d,rp=from.sp!==to.sp,selId=sel?sel.id:null;
  if(rp)restoreParts(d,true);
  if(rp||from.sj!==to.sj)restoreJoints(d);
  if(rp||from.sm!==to.sm)restoreMeasures(d);
  if(from.ss!==to.ss)restoreShelf(d,true);
  if(from.sk!==to.sk)restoreSketch(d);
  if(rp)select(parts.find(p=>p.id===selId)||null);else refresh();
  look();stats()}
 finally{Hist.busy=false}
 Hist.cur=histCapture();histBtn()}
function histUndo(){histMark();if(!Hist.undo.length)return false;const from=Hist.cur,to=Hist.undo.pop();Hist.redo.push(from);histGo(from,to);return true}
function histRedo(){histMark();if(!Hist.redo.length)return false;const from=Hist.cur,to=Hist.redo.pop();Hist.undo.push(from);histGo(from,to);return true}
function histReset(){Hist.undo.length=0;Hist.redo.length=0;Hist.cur=null;histMark()}
let histT=0;const histSoon=ms=>{clearTimeout(histT);histT=setTimeout(histMark,ms)};
['pointerup','click','change','keyup'].forEach(t=>addEventListener(t,()=>histSoon(30),true));
addEventListener('input',()=>{Hist.lastInput=performance.now();histSoon(600)},true);
setInterval(()=>{if(performance.now()-Hist.lastInput>1000)histMark()},1500);
$('#hundo').onclick=()=>doUndo();$('#hredo').onclick=()=>histRedo();
histMark();
