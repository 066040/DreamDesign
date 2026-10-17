/* ================= Çoklu görünümden model (siluet kesişimi / şişirme) ================= */
const mv={raw:{},views:{},flip:{}};
const MV_NAMES={front:['Ön','Önden bakış (sağ = +X)'],side:['Yan','Sağ taraftan bakış (sağ = +Y, genelde burun sola bakar)'],top:['Üst','Yukarıdan bakış (sağ = +X, yukarı = +Y)']};
function mvMask(k){const r=mv.raw[k];if(!r){mv.views[k]=null;return}
 const m=cleanMask(maskFromImage(r.data,r.w,r.h,+$('#mvtol').value),r.w,r.h);let v=cropMask(m,r.w,r.h);
 if(v&&$('#mvsym').checked&&k!=='side')v=mirrorLeft(v);mv.views[k]=v}
function mvPreview(k){const c=$('#mvc-'+k);if(!c)return;const g=c.getContext('2d'),v=mv.views[k];g.clearRect(0,0,c.width,c.height);
 g.fillStyle=css('--bg');g.fillRect(0,0,c.width,c.height);if(!v){g.fillStyle=css('--mut');g.font='11px system-ui,sans-serif';g.textAlign='center';g.fillText('boş',c.width/2,c.height/2+4);return}
 const sc=Math.min((c.width-6)/v.w,(c.height-6)/v.h),w=Math.max(1,Math.round(v.w*sc)),h=Math.max(1,Math.round(v.h*sc)),im=g.createImageData(w,h),flip=!!mv.flip[k];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sx=Math.min(v.w-1,Math.floor((flip?w-1-x:x)/sc)),sy=Math.min(v.h-1,Math.floor(y/sc)),on=v.m[sy*v.w+sx],o=4*(y*w+x);
  im.data[o]=on?31:0;im.data[o+1]=on?111:0;im.data[o+2]=on?235:0;im.data[o+3]=on?255:0}
 const t=document.createElement('canvas');t.width=w;t.height=h;t.getContext('2d').putImageData(im,0,0);g.drawImage(t,(c.width-w)/2,(c.height-h)/2)}
function mvLoad(k,file){const url=URL.createObjectURL(file),im=new Image();
 im.onload=()=>{const sc=Math.min(1,640/Math.max(im.width,im.height)),w=Math.max(8,Math.round(im.width*sc)),h=Math.max(8,Math.round(im.height*sc)),cv2=document.createElement('canvas');cv2.width=w;cv2.height=h;
  const g=cv2.getContext('2d');g.drawImage(im,0,0,w,h);URL.revokeObjectURL(url);mv.raw[k]={w,h,data:g.getImageData(0,0,w,h).data};mvMask(k);mvPreview(k);
  msg(v1(k),'var(--mut)','#mvmsg')};
 im.onerror=()=>msg('Görüntü okunamadı.',null,'#mvmsg');im.src=url}
function v1(k){const v=mv.views[k];return v?MV_NAMES[k][0]+' görünüm: '+v.w+'×'+v.h+' px siluet bulundu.':MV_NAMES[k][0]+' görünümde nesne bulunamadı; eşiği değiştir.'}
(function mvInit(){const box=$('#mvrows');if(!box)return;
 ['front','side','top'].forEach(k=>{const row=document.createElement('div');row.className='row';row.style.cssText='gap:6px;margin:6px 0;align-items:center';
  row.innerHTML=`<canvas id="mvc-${k}" width="72" height="54" style="border:1px solid var(--line);border-radius:6px;flex:none" title="${MV_NAMES[k][1]}"></canvas>
   <div style="flex:1;min-width:0"><button class="sm" id="mvb-${k}" style="width:100%">${MV_NAMES[k][0]} görünüm…</button>
   <label class="chk" style="margin:4px 0 0"><input type="checkbox" id="mvf-${k}">Yatay çevir</label></div>
   <button class="sm" id="mvx-${k}" title="Kaldır">×</button><input type="file" id="mvi-${k}" accept="image/*" hidden>`;box.appendChild(row);
  $('#mvb-'+k).onclick=()=>$('#mvi-'+k).click();
  $('#mvi-'+k).onchange=e=>{const f0=e.target.files[0];e.target.value='';if(f0)mvLoad(k,f0)};
  $('#mvf-'+k).onchange=e=>{mv.flip[k]=e.target.checked;mvPreview(k)};
  $('#mvx-'+k).onclick=()=>{mv.raw[k]=null;mv.views[k]=null;mvPreview(k)};mvPreview(k)});
 $('#mvtol').oninput=e=>{$('#mvtolv').textContent=e.target.value;['front','side','top'].forEach(k=>{mvMask(k);mvPreview(k)})};
 $('#mvsym').onchange=()=>['front','side','top'].forEach(k=>{mvMask(k);mvPreview(k)});
 $('#mvgo').onclick=mvBuild})();
function mvBuild(){const v={};['front','side','top'].forEach(k=>{if(mv.views[k])v[k]=mv.views[k]});
 if(!Object.keys(v).length){msg('Önce en az bir görünüm yükle.',null,'#mvmsg');return}
 msg('Model oluşturuluyor…','var(--mut)','#mvmsg');
 setTimeout(mvDo,20)}
function mvDo(){const v={};['front','side','top'].forEach(k=>{if(mv.views[k])v[k]=mv.views[k]});
 {try{
  const r=mvMesh(v,{len:+$('#mvlen').value||1000,dr:+$('#mvdr').value||.6,res:+$('#mvres').value||96,flip:mv.flip});
  if(!r){msg('Model üretilemedi: siluet çok küçük ya da görünümler birbiriyle çelişiyor (yan çevir seçeneklerini dene).',null,'#mvmsg');return}
  const names=Object.keys(v).map(k=>MV_NAMES[k][0]).join('+'),p=addPlain(r.P,r.I,'Görünümlerden ('+names+')');
  p.ground=true;sit(p);apply(p);refresh();
  const n=Object.keys(v).length;
  msg((n===1?'Tek görünümden şişirilerek üretildi (derinlik tahmindir). ':n+' görünümün kesişiminden üretildi. ')+f(r.dims.W,0)+' × '+f(r.dims.D,0)+' × '+f(r.dims.H,0)+' mm.','var(--ok)','#mvmsg')
 }catch(e){msg('Hata: '+e.message,null,'#mvmsg')}}}
