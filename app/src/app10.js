/* ================= Basit mod: bilgisayardan anlamayan biri de kullanabilsin =================
   Var olan araçların (şekil ekle, ölçü, delik, katı işlemler, köşe yuvarlama, baskı fiyatı) üstünde sade bir panel.
   Hesaplar gelişmiş modla aynı koddan gelir. Mod seçimi tarayıcıda hatırlanır; ?mod=basit / ?mod=gelismis ile de seçilir. */
const S_COLORS=[['Beyaz','#f2f2ee'],['Siyah','#2b2d31'],['Gri','#8d939b'],['Kırmızı','#d23a32'],['Mavi','#2f6fdb'],['Yeşil','#2f9a5a'],['Sarı','#e8b923'],['Turuncu','#e46d24'],['Mor','#8a5cd6']];
const S_DEF={box:[40,40,40],rbox:[50,40,30],cyl:[40,40,60],sph:[40,40,40],cone:[40,40,50]};
const S_NAME={box:'Kutu',rbox:'Yuvarlak kutu',cyl:'Silindir',sph:'Küre',cone:'Koni',model:'Model'};
let uiMode='simple',sBusy=false,sT=0,sCom=null;
const sDemo=parts.slice(); /* gelişmiş modun açılış örnekleri: basit modda ilk açılışta temizlenir */
const sStore={get(){try{return localStorage.getItem('dd-ui')}catch(_){return null}},set(v){try{localStorage.setItem('dd-ui',v)}catch(_){}}};
function sMsg(t,c){const m=$('#sMsg');m.textContent=t||'';m.style.color=c||'var(--mut)'}

function setUI(m){uiMode=m==='adv'?'adv':'simple';document.body.classList.toggle('simple',uiMode==='simple');$('#simple').hidden=uiMode!=='simple';
 document.querySelectorAll('#mtoggle button').forEach(b=>{const on=b.dataset.ui===uiMode;b.classList.toggle('on',on);b.setAttribute('aria-checked',String(on))});
 sStore.set(uiMode);look();
 if(uiMode==='simple'){if(!['sec','move','hole'].includes(mode))setMode('sec');tc.showZ=false;
  if(sDemo.length&&parts.length&&parts.every(p=>sDemo.includes(p))&&!Hist.undo.length){sDemo.slice().forEach(removePart);sDemo.length=0;select(null);histReset();view('iso')}
  if(sCom===null)sCom=$('#showcom').checked;$('#showcom').checked=false;stats();sPanel();sPrice();
  $('#hint').textContent='Sol tuşla sürükle: etrafında dön · Tekerlek: yakınlaştır · Bir şekle tıkla: seç · Kare = 100 mm';
  let seen=null;try{seen=localStorage.getItem('dd-guide')}catch(_){}$('#sGuide').hidden=!!seen}
 else{tc.showZ=true;if(sCom!==null){$('#showcom').checked=sCom;sCom=null;stats()}$('#hint').textContent='Sol tuş (boşlukta): her yöne döndür · Sağ tuş: kaydır · Tekerlek: yakınlaştır · Kare = 100 mm · Model veya fotoğrafı bu alana bırak'}}
document.querySelectorAll('#mtoggle button').forEach(b=>b.onclick=()=>setUI(b.dataset.ui));
$('#sGuideOk').onclick=()=>{$('#sGuide').hidden=true;try{localStorage.setItem('dd-guide','1')}catch(_){}};

/* ---------- şekil ekle: tablanın üstünde, öncekilerin yanına ---------- */
function sFreeX(w){let x=-Infinity;parts.filter(p=>p.vis).forEach(p=>{x=Math.max(x,worldBox(p).mx[0])});return isFinite(x)?x+10+w/2:0}
function sAdd(type){const sz=S_DEF[type].slice(),pos=[sFreeX(sz[0]),0,0];
 const p=type==='rbox'?addRBox(sz,6,pos):add(type,sz,pos);
 p.name=S_NAME[type]+' '+p.id;const c=S_COLORS[(parts.length-1)%S_COLORS.length][1];sColor(p,c);
 if(p.ground)sit(p);refresh();look();histMark();view('iso');sMsg(S_NAME[type]+' eklendi. Ölçülerini aşağıya yazabilirsin.','var(--ok)');return p}
document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>sAdd(b.dataset.add));
$('#sOpen').onclick=()=>$('#file').click();
if(!MATS.PLA)MATS.PLA={d:1.24,c:'#e8e8e8',m:0,r:.5,tint:1};
/* basit modda her şekil PLA plastik ve seçilen renkte */
function sColor(p,hex){p.color=hex;if(p.mat!=='PLA'){p.mat='PLA';if(p.solidMat)p.solidMat.dispose();p.solidMat=makeMat(p)}else if(p.solidMat)p.solidMat.color.copy(lin(hex));look()}

/* ---------- seçili şeklin paneli ---------- */
function sPanel(){if(uiMode!=='simple')return;const p=sel&&parts.includes(sel)?sel:null;
 $('#sEdit').hidden=!p;$('#sNoSel').hidden=!!p;$('#sSelName').textContent=p?p.name:'Şekil seçili değil';
 $('#sJoinSec').hidden=parts.filter(q=>q.vis).length<2;$('#sOrder').disabled=!parts.some(q=>q.vis);
 if(!p){['#sCup','#sHole','#sRound'].forEach(id=>$(id).hidden=true);sAria();return}
 [['#sW',0],['#sD',1],['#sH',2]].forEach(([id,k])=>{if(document.activeElement!==$(id))$(id).value=Math.round(p.size[k]*10)/10});
 const box=$('#sColors');if(box.dataset.for!==String(p.id)||box.dataset.col!==p.color){box.dataset.for=p.id;box.dataset.col=p.color;box.innerHTML='';
  S_COLORS.forEach(([n,h])=>{const b=document.createElement('button');b.style.background=h;b.title=n;b.setAttribute('aria-label',n);b.setAttribute('role','radio');
   b.setAttribute('aria-checked',String(p.color.toLowerCase()===h));b.onclick=()=>{sColor(p,h);histMark();sPanel()};box.append(b)})}
 const isBox=p.type==='box'||p.type==='rbox';$('#sRoundGo').disabled=!isBox;
 $('#sRoundTip').textContent=isBox?'Kutunun keskin köşelerini yuvarlatır.':'Köşe yuvarlama şimdilik yalnız kutuda çalışıyor.';
 $('#sMove').setAttribute('aria-pressed',String(mode==='move'));sAria()}
function sAria(){[['#sCupBtn','#sCup'],['#sHoleBtn','#sHole'],['#sRoundBtn','#sRound']].forEach(([b,pn])=>$(b).setAttribute('aria-expanded',String(!$(pn).hidden)))}
function sOpenPanel(id){['#sCup','#sHole','#sRound'].forEach(x=>{if(x!==id)$(x).hidden=true});$(id).hidden=!$(id).hidden;
 if(id==='#sHole'&&!$(id).hidden){setMode('hole');hole=null;$('#sHoleGo').disabled=true;$('#sHoleTip').textContent='Şimdi şeklin üstünde delik açmak istediğin yere tıkla.'}
 else if(mode==='hole')setMode('sec');sAria()}
$('#sCupBtn').onclick=()=>sOpenPanel('#sCup');$('#sHoleBtn').onclick=()=>sOpenPanel('#sHole');$('#sRoundBtn').onclick=()=>sOpenPanel('#sRound');

/* ölçüler: mm; "oranı koru" işaretliyse hepsi aynı oranda */
[['#sW',0],['#sD',1],['#sH',2]].forEach(([id,k])=>$(id).addEventListener('change',()=>{const p=sel;if(!p)return;
 const v=parseFloat(String($(id).value).replace(',','.'));if(!(v>0)){sPanel();return}
 if($('#sLock').checked){const r=v/p.size[k];p.size=p.size.map(x=>x*r)}else p.size[k]=v;
 if(p.type==='rbox')p.rad=Math.min(p.rad||0,Math.min(...p.size)/2);
 apply(p);if(p.ground)sit(p);refresh();look();histMark();sPanel()}));

$('#sMove').onclick=()=>{setMode(mode==='move'?'sec':'move');sMsg(mode==='move'?'Oklardan tutup şekli tabla üstünde kaydır. Bitince tekrar "Yerini değiştir"e bas.':'');sPanel()};
$('#sTurn').onclick=()=>{if(sel){bakeTurn(sel,2);histMark();sPanel()}};
$('#sLay').onclick=()=>{if(sel){bakeTurn(sel,0);histMark();sPanel()}};
$('#sCopy').onclick=()=>{if(!sel)return;const a=sel;$('#doclone').click();if(sel&&sel!==a){sel.ground=true;sit(sel);refresh();look();histMark();sMsg('Kopyası yanına kondu.','var(--ok)')}};
$('#sDel').onclick=()=>{if(!sel)return;const n=sel.name;remove();histMark();sMsg(n+' silindi. Yanlışlıkla sildiysen "Geri al".');sPanel()};

/* kaba çevir: aynı şeklin küçültülmüş kopyasını yukarıdan oy (dışbükey şekillerde tam, diğerlerinde yaklaşık) */
async function sCup(p,wall){const b=worldBox(p),sz=[0,1,2].map(k=>b.mx[k]-b.mn[k]);
 if(wall*2>=Math.min(sz[0],sz[1])-0.5||wall>=sz[2]-0.5)throw new Error('Duvar bu şekil için çok kalın. Daha ince bir duvar yaz ya da şekli büyüt.');
 const w=worldArrays(p),P=w.P,cx=(b.mn[0]+b.mx[0])/2,cy=(b.mn[1]+b.mx[1])/2,fx=(sz[0]-2*wall)/sz[0],fy=(sz[1]-2*wall)/sz[1],
  eps=Math.max(1,sz[2]*.05),fz=(sz[2]-wall+eps)/sz[2],Q=new Float32Array(P.length);
 for(let i=0;i<P.length;i+=3){Q[i]=cx+(P[i]-cx)*fx;Q[i+1]=cy+(P[i+1]-cy)*fy;Q[i+2]=b.mn[2]+wall+(P[i+2]-b.mn[2])*fz}
 const R=await boolArrays(localArrays(p),{P:toLocal(p,Q),I:w.I},'subtract',Math.hypot(...p.base),[p.name,'İç']);
 return replaceWith(p,R,p.name)}
$('#sCupGo').onclick=async()=>{const p=sel;if(!p||sBusy)return;const wall=parseFloat($('#sWall').value);if(!(wall>0))return sMsg('Duvar kalınlığını yaz.','var(--warn)');
 sBusy=true;sMsg('Hazırlanıyor…');try{const np=await sCup(p,wall);if(np.ground)sit(np);refresh();look();histMark();$('#sCup').hidden=true;sPanel();sMsg('Kap oldu. Duvar '+f(wall,1)+' mm.','var(--ok)')}
 catch(e){sMsg(e.message,'var(--warn)')}finally{sBusy=false}};

/* delik: tıklanan yerden, yüzeye dik */
$('#sHoleThru').onchange=()=>{$('#sHoleDepL').hidden=$('#sHoleThru').checked};
const _holePlace=holePlace;holePlace=function(p,point,n){_holePlace(p,point,n);if(uiMode==='simple'){$('#sHoleGo').disabled=false;$('#sHoleTip').textContent='Yer seçildi (turuncu). İstersen başka bir yere tıkla, sonra "Deliği aç".';if(sel!==p)select(p)}};
function sHoleSync(){$('#hld').value=$('#sHoleD').value;$('#hldep').value=$('#sHoleThru').checked?0:$('#sHoleDep').value;$('#hldir').value='n';
 hOp='cut';document.querySelectorAll('#hlop button').forEach(x=>x.classList.toggle('on',x.dataset.ho==='cut'));holePreview()}
['#sHoleD','#sHoleDep','#sHoleThru'].forEach(s=>$(s).addEventListener('input',sHoleSync));$('#sHoleThru').addEventListener('change',sHoleSync);
$('#sHoleGo').onclick=async()=>{if(sBusy)return;sHoleSync();sBusy=true;sMsg('Delik açılıyor…');
 try{const np=await holeDo();if(np){sMsg('Ø'+f(+$('#sHoleD').value,1)+' mm delik açıldı. Başka yere tıklayıp bir delik daha açabilirsin.','var(--ok)');$('#sHoleGo').disabled=true;hole=null;holePreview()}
  else sMsg($('#hlmsg').textContent||'Delik açılamadı.','var(--warn)')}finally{sBusy=false;sPanel()}};

/* köşe yuvarla: kutu → yuvarlak kutu (aynı ölçü ve yer) */
$('#sRoundGo').onclick=()=>{const p=sel;if(!p)return;const r=Math.max(0,parseFloat($('#sRad').value)||0),mx=Math.min(...p.size)/2;
 if(r>mx)sMsg('En fazla '+f(mx,1)+' mm olabilir; o kadar yuvarladım.','var(--mut)');
 if(p.type==='rbox')rboxRebuild(p,Math.min(r,mx));
 else if(p.type==='box'){const sz=p.size.slice(),pos=p.pos.slice(),c=p.color,name=p.name;removePart(p);const q=addRBox(sz,Math.min(r,mx),pos);q.name=name;sColor(q,c);if(q.ground)sit(q);select(q)}
 else return;refresh();look();histMark();sPanel();if(r<=mx)sMsg('Köşeler '+f(r,1)+' mm yuvarlatıldı.','var(--ok)')};

/* birleştir: görünen tüm şekilleri sırayla tek parçada topla */
$('#sJoin').onclick=async()=>{if(sBusy)return;const list=parts.filter(p=>p.vis);if(list.length<2)return;sBusy=true;sMsg('Birleştiriliyor…');
 try{let a=list[0];for(let i=1;i<list.length;i++){const r=await boolParts('union',a,list[i],false);if(!r)throw new Error($('#bmsg').textContent||'Birleştirilemedi.');a=r}
  a.name='Birleşik parça';refresh();look();histMark();sMsg('Hepsi tek parça oldu.','var(--ok)')}
 catch(e){sMsg(e.message,'var(--warn)')}finally{sBusy=false;sPanel()}};

/* ---------- canlı fiyat ve sipariş: Baskı sekmesiyle aynı hesap (PLA, normal, görünen tüm şekiller) ---------- */
function sPrice(){sT=0;if(uiMode!=='simple')return;const list=parts.filter(p=>p.vis),el=$('#sPrice'),inf=$('#sPriceInfo');
 if(!list.length){el.textContent='—';inf.textContent='Önce bir şekil ekle.';return}
 try{const M=prMesh(list),r=printAnalyze(M.P,M.I,[0,0,-1],QUOTE_CFG.overhang),bed=PRINTERS.p1s.bed;
  let mn=[1e30,1e30,1e30],mx=[-1e30,-1e30,-1e30];for(let i=0;i<M.P.length;i+=3)for(let k=0;k<3;k++){const v=M.P[i+k];if(v<mn[k])mn[k]=v;if(v>mx[k])mx[k]=v}
  const sz=[0,1,2].map(k=>mx[k]-mn[k]),fl=[Math.max(sz[0],sz[1]),Math.min(sz[0],sz[1])];
  if(fl[0]>bed[0]||fl[1]>bed[1]||sz[2]>bed[2]){el.textContent='Sığmıyor';inf.textContent='Yazıcı en fazla '+bed[0]+' mm basabilir. Şekilleri küçült.';return}
  const e=estimate({vol:M.vol,area:M.area},{scale:1,material:'PLA',infill:'normal',qty:1,supportVol:r.supV});
  el.textContent=f(e.total,0)+' '+QUOTE_CFG.currency;inf.textContent='PLA, yaklaşık '+f(e.grams,e.grams<10?1:0)+' g, '+fmtHours(e.hours)+' baskı. Malzeme ve rengi sonraki adımda değiştirebilirsin.'}
 catch(err){el.textContent='—';inf.textContent=''}}
function sPriceSoon(){if(uiMode!=='simple')return;clearTimeout(sT);sT=setTimeout(sPrice,150)}
$('#sOrder').onclick=()=>{const all=$('#prAll').checked;$('#prAll').checked=true;$('#prMat').value='PLA';$('#prInf').value='normal';
 $('#prOrder').click();$('#prAll').checked=all;const m=$('#prMsg').textContent;sMsg(m,/engelledi/.test(m)?'var(--warn)':'var(--mut)')};

/* ---------- bağlantılar ---------- */
const _selectS=select;select=function(p){_selectS(p);if(uiMode==='simple'){sPanel();sPriceSoon();if(mode==='hole'&&$('#sHole').hidden)setMode('sec')}};
const _refreshS=refresh;refresh=function(){_refreshS();sPanel();sPriceSoon()};
const _setModeS=setMode;setMode=function(m){_setModeS(m);if(uiMode==='simple'&&!['sec','move','hole'].includes(m)){_setModeS('sec')}if(typeof sPanel==='function')sPanel()};
addEventListener('pointerup',()=>sPriceSoon());
/* basit modda seçili şekil parlamasın: seçtiği renk aynen görünsün (seçimi ölçü çizgileri gösterir) */
const _lookS=look;look=function(){_lookS();if(uiMode==='simple')parts.forEach(p=>p.solidMat.emissive.setHex(0))};
{const q=new URLSearchParams(location.search).get('mod');setUI(q==='gelismis'?'adv':q==='basit'?'simple':(sStore.get()||'simple'))}
