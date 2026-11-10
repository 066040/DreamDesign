/* ================= Baskı sekmesi: yazıcıya sığma, sarkma/destek, en iyi yön, tahmini fiyat, sipariş ================= */
const PRINTERS={p1s:{name:'Bambu Lab P1S / X1C / A1',bed:[256,256,256]},a1m:{name:'Bambu Lab A1 mini',bed:[180,180,180]},
 ender:{name:'Creality Ender-3 V3',bed:[220,220,250]},k1c:{name:'Creality K1C',bed:[220,220,250]},mk4:{name:'Prusa MK4',bed:[250,210,220]},
 cc:{name:'Elegoo Centauri Carbon',bed:[256,256,256]},custom:{name:'Kendi ölçüm…',bed:[200,200,200]}};
$('#prPrinter').innerHTML=Object.entries(PRINTERS).map(([k,v])=>`<option value="${k}">${esc(v.name)}</option>`).join('');
$('#prMat').innerHTML=Object.entries(QUOTE_CFG.materials).map(([k,v])=>`<option value="${k}">${esc(v.name)}</option>`).join('');
$('#prInf').innerHTML=QUOTE_CFG.infills.map(i=>`<option value="${i.key}"${i.key==='normal'?' selected':''}>${esc(i.name)}</option>`).join('');
const prOvMat=new THREE.MeshBasicMaterial({color:lin(0xe5484d),transparent:true,opacity:.6,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,depthWrite:false});
const prOv=new THREE.Mesh(new THREE.BufferGeometry(),prOvMat);prOv.renderOrder=6;prOv.visible=false;prOv.frustumCulled=false;scene.add(prOv);
let prLast=null,prT=0;
const prOpen=()=>$('#p-print').classList.contains('on');
function prBed(){const k=$('#prPrinter').value;$('#prCustom').hidden=k!=='custom';
 return k==='custom'?['#prBx','#prBy','#prBz'].map(s=>Math.max(1,+$(s).value||200)):PRINTERS[k].bed}
function prTargets(){return $('#prAll').checked?parts.filter(p=>p.vis):(sel&&sel.vis?[sel]:[])}
/* tüm hedeflerin dünya ağı, gerçek hacim ve yüzey alanı */
function prMesh(list){const m=catMesh(list.map(p=>worldArrays(p)));let vol=0,area=0;
 list.forEach(p=>{const mi=massInfo(p),g=p.mesh.geometry,sc=p.mesh.scale;vol+=mi.vol;area+=areaStats(g.attributes.position.array,g.index.array,[sc.x,sc.y,sc.z]).A});
 return{P:m.P,I:m.I,vol,area}}
function prUpdate(){clearTimeout(prT);prT=0;
 if(!prOpen()){prOv.visible=false;return}
 const list=prTargets(),out=$('#prOut'),fit=$('#prFit'),pr=$('#prPrice');$('#prBest').disabled=list.length!==1;$('#prOrder').disabled=!list.length;
 $('#prAngV').textContent=$('#prAng').value+'°';
 if(!list.length){fit.innerHTML='<p class="note">Bir parça seç ya da "Görünen tüm parçalar"ı işaretle.</p>';out.innerHTML='';pr.innerHTML='';prOv.visible=false;prLast=null;return}
 const M=prMesh(list),bed=prBed(),ang=+$('#prAng').value,T=M.I.length/3,flags=new Uint8Array(T);
 /* sığma: X–Y'de 90° çevirmeye izin ver */
 let mn=[1e30,1e30,1e30],mx=[-1e30,-1e30,-1e30];for(let i=0;i<M.P.length;i+=3)for(let k=0;k<3;k++){const v=M.P[i+k];if(v<mn[k])mn[k]=v;if(v>mx[k])mx[k]=v}
 const sz=[0,1,2].map(k=>mx[k]-mn[k]),fl=[Math.max(sz[0],sz[1]),Math.min(sz[0],sz[1])],bf=[Math.max(bed[0],bed[1]),Math.min(bed[0],bed[1])];
 const fits=fl[0]<=bf[0]&&fl[1]<=bf[1]&&sz[2]<=bed[2],k=Math.min(bf[0]/fl[0],bf[1]/fl[1],bed[2]/sz[2]);
 fit.innerHTML=kv('Baskı ölçüsü',sz.map(v=>f(v,1)).join(' × ')+' mm')+kv('Tabla',bed.join(' × ')+' mm')+
  (fits?'<p class="note" style="color:var(--ok)">Yazıcıya sığıyor.</p>':`<p class="note" style="color:var(--warn)">Sığmıyor: en fazla %${f(Math.floor(k*1000)/10,1)} boyutta sığar.</p>`+(list.length===1?'<div class="btnrow"><button class="sm" id="prShrink">Sığacak kadar küçült</button></div>':''));
 if(!fits&&list.length===1)$('#prShrink').onclick=()=>{const p=list[0],s=Math.floor(k*1000)/1000;p.size=p.size.map(v=>v*s);apply(p);if(p.ground)sit(p);refresh();look();histMark();prUpdate()};
 /* sarkma ve destek: tabla dünyada Z=0, aşağı −Z */
 const r=printAnalyze(M.P,M.I,[0,0,-1],ang,flags);
 const off=mn[2]>.5?`<p class="note" style="color:var(--warn)">Parça tabladan ${f(mn[2],1)} mm yukarıda. "Tablaya oturt" ile indir.</p>`:'';
 out.innerHTML=off+(r.needs?kv('Destek isteyen yüzey',f(r.ovA/100,1)+' cm² (%'+f(r.ovA/r.A*100,1)+')')+kv('Destek malzemesi ≈',f(r.supV*QUOTE_CFG.supportFill/1000*QUOTE_CFG.materials[$('#prMat').value].density,1)+' g')
  :'<p class="note" style="color:var(--ok)">Destek gerekmiyor.</p>')+kv('Tablaya değen alan',f(r.baseA/100,1)+' cm²')+
  (r.baseA<Math.min(100,r.A*.01)?'<p class="note" style="color:var(--warn)">Tabana çok az değiyor; baskı sırasında devrilebilir. Kenar (brim) ya da başka bir yön düşün.</p>':'');
 /* kırmızı vurgu: işaretli üçgenler */
 const n=flags.reduce((a,v)=>a+v,0),pos=new Float32Array(n*9);let o=0;
 for(let t=0;t<T;t++)if(flags[t])for(let c=0;c<3;c++){const v=3*M.I[3*t+c];pos[o++]=M.P[v];pos[o++]=M.P[v+1];pos[o++]=M.P[v+2]}
 prOv.geometry.dispose();prOv.geometry=new THREE.BufferGeometry();prOv.geometry.setAttribute('position',new THREE.BufferAttribute(pos,3));
 prOv.visible=n>0&&$('#prShow').checked;
 /* fiyat */
 const e=estimate({vol:M.vol,area:M.area},{scale:1,material:$('#prMat').value,infill:$('#prInf').value,qty:1,supportVol:r.supV});
 pr.innerHTML=fits?kv('Tahmini fiyat',f(e.total,0)+' '+QUOTE_CFG.currency)+kv('Malzeme',f(e.grams,e.grams<10?1:0)+' g'+(e.supGrams>.5?' (destek '+f(e.supGrams,0)+' g)':''))+kv('Baskı süresi ≈',fmtHours(e.hours))+
  '<p class="note">'+esc(QUOTE_CFG.brand)+' fiyat tablosuyla. Hacim kapalı yüzey varsayar.</p>':'<p class="note">Sığmayan parçanın fiyatı hesaplanmaz.</p>';
 prLast={list,r,e,fits}}
function prSoon(){if(!prOpen())return;clearTimeout(prT);prT=setTimeout(prUpdate,120)}

/* En az destekle yatır: seçili parçayı en iyi yöne döndür (ölçek ve açı ayarları korunur, geometri döner) */
function prOrient(p,down){apply(p);const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...down).normalize(),new THREE.Vector3(0,0,-1));
 const b0=worldBox(p),cx=(b0.mn[0]+b0.mx[0])/2,cy=(b0.mn[1]+b0.mx[1])/2;
 const Rn=new THREE.Matrix4().makeRotationFromQuaternion(q),Rp=new THREE.Matrix4().makeRotationFromEuler(p.mesh.rotation),S=new THREE.Matrix4().makeScale(p.mesh.scale.x,p.mesh.scale.y,p.mesh.scale.z);
 const L=new THREE.Matrix4().copy(S).invert().multiply(new THREE.Matrix4().copy(Rp).invert()).multiply(Rn).multiply(Rp).multiply(S);
 if(p.edge){p.mesh.remove(p.edge);p.edge.geometry.dispose();p.edge=null}
 pushUndo(p);p.mesh.geometry.applyMatrix4(L);const m=new THREE.Vector3(...p.mid).applyMatrix4(L);p.mid=[m.x,m.y,m.z];
 p.ground=true;commitShape(p);const b1=worldBox(p);p.pos[0]+=cx-(b1.mn[0]+b1.mx[0])/2;p.pos[1]+=cy-(b1.mn[1]+b1.mx[1])/2;p.pos[2]-=b1.mn[2];apply(p);
 refresh();look()}
$('#prBest').onclick=()=>{const list=prTargets();if(list.length!==1)return;const p=list[0],w=worldArrays(p),ang=+$('#prAng').value;
 const b=bestDown(w.P,w.I,[0,0,-1],ang);
 if(!b.changed){msg(b.cur.needs?'Daha iyi bir yön bulunamadı; bu yön zaten en az destekli.':'Bu yön zaten iyi: destek gerekmiyor.','var(--mut)','#prMsg');prUpdate();return}
 prOrient(p,b.down);histMark();
 const s=QUOTE_CFG.supportFill/1000*QUOTE_CFG.materials[$('#prMat').value].density;
 msg('Döndürüldü. Destek '+f(b.cur.supV*s,0)+' g → '+f(b.res.supV*s,0)+' g. Beğenmezsen Ctrl+Z.','var(--ok)','#prMsg');prUpdate()};
$('#prDown').onclick=()=>{const list=prTargets();if(!list.length)return;let z=Infinity;list.forEach(p=>z=Math.min(z,worldBox(p).mn[2]));
 list.forEach(p=>{p.pos[2]-=z;apply(p)});refresh();look();histMark();prUpdate()};

/* Fiyat sayfasında aç: STL'yi bastir.html'e aktar (ikisi aynı klasörde) */
let prPending=null;
addEventListener('message',e=>{const d=e.data;if(!d||d.type!=='dd-quote-ready'||!prPending||e.source!==prPending.win)return;
 const x=prPending;prPending=null;x.win.postMessage({type:'dd-quote-model',name:x.name,stl:x.stl,material:x.material,infill:x.infill},'*');msg('Fiyat sayfası açıldı.','var(--ok)','#prMsg')});
$('#prOrder').onclick=()=>{const list=prTargets();if(!list.length)return;const m=catMesh(list.map(p=>worldArrays(p)));
 const name=(list.length===1?list[0].name:'dreamdesign').replace(/[^\wçğıöşüÇĞİÖŞÜ -]/g,'').trim().replace(/\s+/g,'-')+'.stl';
 const win=open('bastir.html#dd','_blank');
 if(!win){msg('Tarayıcı yeni pencereyi engelledi. Açılır pencerelere izin verip tekrar dene.',null,'#prMsg');return}
 prPending={win,name,stl:(b=>b instanceof ArrayBuffer?b:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))(stlBinary(m.P,m.I)),material:$('#prMat').value,infill:$('#prInf').value};msg('Fiyat sayfası açılıyor…','var(--mut)','#prMsg')};

['#prPrinter','#prAll','#prShow','#prMat','#prInf','#prBx','#prBy','#prBz'].forEach(s=>$(s).addEventListener('change',prUpdate));
$('#prAng').addEventListener('input',prSoon);
const _openTab=openTab;openTab=function(t){_openTab(t);if(t==='print')prUpdate();else prOv.visible=false};
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>openTab(b.dataset.tab));
const _refreshPr=refresh;refresh=function(){_refreshPr();prSoon()};
const _selectPr=select;select=function(p){_selectPr(p);prSoon()};
addEventListener('pointerup',()=>prSoon());
