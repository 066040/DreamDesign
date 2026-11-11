/* KiCad kartından kutu: dosya okuma (pure.js) ve kutu üretimi (app13) */
const H=require('./harness.js'),path=require('path');let fails=0;
const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const near=(a,b,t)=>Math.abs(a-b)<=t*Math.max(1,Math.abs(b));
/* 60 × 40 mm, köşeleri 3 mm yuvarlak kart; sol üst köşesi (100,50). İçinde 4 × 3 mm pencere, 4 adet Ø3,2 vida deliği,
   sağ kenarda altta USB-C, üst kenarda üstte düğme, ortada üstte 0603 direnç, eski tip (fp_text) adlı bir kondansatör. */
const fpHole=(ref,x,y)=>`(footprint "MountingHole:MountingHole_3.2mm_M3" (layer "F.Cu") (at ${x} ${y}) (property "Reference" "${ref}") (property "Value" "M3")
 (pad "" np_thru_hole circle (at 0 0) (size 3.2 3.2) (drill 3.2) (layers "*.Cu" "*.Mask")))`;
const PCB=`(kicad_pcb (version 20240108) (generator "pcbnew")
 (general (thickness 1.2))
 (gr_line (start 103 50) (end 157 50) (layer "Edge.Cuts"))
 (gr_arc (start 157 50) (mid 159.12132 50.87868) (end 160 53) (layer "Edge.Cuts"))
 (gr_line (start 160 53) (end 160 87) (layer "Edge.Cuts"))
 (gr_arc (start 160 87) (mid 159.12132 89.12132) (end 157 90) (layer "Edge.Cuts"))
 (gr_line (start 103 90) (end 157 90) (layer "Edge.Cuts"))
 (gr_arc (start 103 90) (mid 100.87868 89.12132) (end 100 87) (layer "Edge.Cuts"))
 (gr_line (start 100 87) (end 100 53) (layer "Edge.Cuts"))
 (gr_arc (start 100 53) (mid 100.87868 50.87868) (end 103 50) (layer "Edge.Cuts"))
 (gr_rect (start 128 68) (end 132 71) (layer "Edge.Cuts"))
 (gr_line (start 0 0) (end 500 500) (layer "Dwgs.User"))
 ${fpHole('H1',105,55)} ${fpHole('H2',155,55)} ${fpHole('H3',105,85)} ${fpHole('H4',155,85)}
 (footprint "Connector_USB:USB_C_Receptacle_HRO_TYPE-C-31-M-12" (layer "B.Cu") (at 156 70 -90) (property "Reference" "J1") (property "Value" "USB_C")
  (fp_rect (start -4.5 -3.6) (end 4.5 3.7) (layer "B.Fab")) (fp_rect (start -9 -9) (end 9 9) (layer "F.Fab"))
  (pad "1" smd rect (at 0 -4) (size 0.6 1.2) (layers "B.Cu"))
  (model "\${KICAD8_3DMODEL_DIR}/Connector_USB.3dshapes/USB_C_Receptacle_HRO_TYPE-C-31-M-12.step"))
 (footprint "lib:KEY-SMD_TX" (layer "F.Cu") (at 120 52) (property "Reference" "SW1") (property "Value" "OK")
  (fp_line (start -2.3 -2.4) (end 2.3 -2.4) (layer "F.Fab")) (fp_line (start 2.3 -2.4) (end 2.3 1.1) (layer "F.Fab")) (fp_line (start 2.3 1.1) (end -2.3 1.1) (layer "F.Fab"))
  (pad "1" smd rect (at -2 0) (size 1 1) (layers "F.Cu")) (model "C:\\\\lib\\\\KEY-SMD_L4.6-W2.3-H1.8-P3.4.wrl"))
 (footprint "Resistor_SMD:R_0603_1608Metric" (layer "F.Cu") (at 130 80 90) (property "Reference" "R1") (property "Value" "10k")
  (fp_rect (start -0.8 -0.4) (end 0.8 0.4) (layer "F.Fab")) (pad "1" smd rect (at -0.8 0) (size 0.8 0.9) (layers "F.Cu")))
 (footprint "Capacitor_SMD:C_0805_2012Metric" (layer "F.Cu") (at 140 60)
  (fp_text reference "C1" (at 0 0) (layer "F.SilkS")) (fp_text value "10uF" (at 0 0) (layer "F.Fab"))
  (pad "1" smd rect (at -1 0) (size 1 1.4) (layers "F.Cu")) (pad "2" smd rect (at 1 0) (size 1 1.4) (layers "F.Cu"))))`;
const h=H(path.join(__dirname,'..','docs','index.html'));
h.w.__manifoldLoader=async()=>(await import(require.resolve('manifold-3d/manifold.js'))).default;h.w.__pcb=PCB;
const arun=async(name,code)=>{try{return await h.run('(async()=>{'+code+'})()','test')}catch(e){fails++;console.log('FAIL',name,'→ HATA',e.stack.split('\n').slice(0,4).join(' | '));return null}};
const A=3*54*2+3*34*2+54*34+Math.PI*9,P=2*54+2*34+2*Math.PI*3;      // kart alanı ve çevresi (yuvarlak köşeli)
const off=d=>A+P*d+Math.PI*d*d;                                     // d kadar dışa ötelenmiş alan
(async()=>{
let r=await arun('okuma',`const B=kicadBoard(__pcb,'deneme'),c=n=>B.comps.find(x=>x.ref===n),rd=a=>a.map(v=>+v.toFixed(3));
 let bad='';try{kicadBoard('(module x)')}catch(e){bad=e.message}let bad2='';try{kicadBoard('(kicad_pcb (gr_line (start 0 0) (end 5 0) (layer "Edge.Cuts")))')}catch(e){bad2=e.message}
 const F=kiFlip(B),fc=n=>F.comps.find(x=>x.ref===n);
 return{w:B.w,h:B.h,t:B.t,area:polyArea(B.outline),cut:B.cutouts.map(l=>({a:polyArea(l),p:rd(l.flat())})),holes:B.holes.map(h=>[h.ref,h.x,h.y,h.d]),n:B.comps.length,
  j:{...c('J1'),bb:rd(c('J1').bb)},s:{...c('SW1'),bb:rd(c('SW1').bb)},r1:{...c('R1'),bb:rd(c('R1').bb)},c1:{...c('C1'),bb:rd(c('C1').bb)},mF:B.maxF.ref,mB:B.maxB.ref,bad,bad2,
  fj:{side:fc('J1').side,edge:fc('J1').edge,bb:rd(fc('J1').bb)},fa:polyArea(F.outline),fh:F.holes[0].x}`);
ok(r&&r.w===60&&r.h===40&&r.t===1.2&&near(r.area,A,2e-3),'kart ölçüsü, kalınlığı ve yaylı çevresi okundu (alan '+(r&&r.area.toFixed(1))+' ≈ '+A.toFixed(1)+')');
ok(r&&r.cut.length===1&&near(r.cut[0].a,-12,1e-9)&&Math.min(...r.cut[0].p.filter((v,i)=>i%2===0))===-2&&Math.max(...r.cut[0].p.filter((v,i)=>i%2===1))===2,'kart içindeki pencere ayrı halka (Y yukarı çevrilmiş)');
ok(r&&r.holes.length===4&&JSON.stringify(r.holes[0])==='["H1",-25,15,3.2]','vida delikleri: yeri ve çapı '+(r&&JSON.stringify(r.holes[0])));
ok(r&&r.n===4&&r.j.side==='B'&&r.j.kind==='usb'&&r.j.edge==='r'&&r.j.h===3.3&&r.j.est&&JSON.stringify(r.j.bb)==='[22.3,-4.5,29.6,4.5]','USB: arka yüz, sağ kenar, −90° dönmüş gövde kutusu doğru '+(r&&r.j.bb));
ok(r&&r.s.kind==='button'&&r.s.edge==='t'&&r.s.h===1.8&&!r.s.est&&r.s.bb[3]===20.4,'düğme: üst kenar, yükseklik model adından (H1.8), kenardan taşıyor');
ok(r&&r.r1.edge===null&&JSON.stringify(r.r1.bb)==='[-0.4,-10.8,0.4,-9.2]'&&r.r1.h===.55,'90° dönmüş direnç: kutu doğru, kenarda değil');
ok(r&&r.c1.ref==='C1'&&r.c1.val==='10uF'&&JSON.stringify(r.c1.bb)==='[8.3,9.3,11.7,10.7]','eski biçim (fp_text) ad ve lehim yüzeylerinden kutu');
ok(r&&r.mF==='SW1'&&r.mB==='J1'&&/KiCad kart dosyası/.test(r.bad)&&/çevresi bulunamadı/.test(r.bad2),'en yüksek parçalar; bozuk / çevresiz dosyada anlaşılır hata');
ok(r&&r.fj.side==='F'&&r.fj.edge==='l'&&JSON.stringify(r.fj.bb)==='[-29.6,-4.5,-22.3,4.5]'&&near(r.fa,A,2e-3)&&r.fh===25,'ters çevirme: yüzler ve sol/sağ yer değiştirir, çevre yönü korunur');

r=await arun('kutu',`[...parts].forEach(removePart);select(null);setUI('simple');const B=pcbLoad(__pcb,'deneme');const q=s=>document.querySelector(s);
 const ui={mode:uiMode,shown:!q('#pcbBox').hidden,info:q('#pcbInfo').textContent,below:q('#pcbBelow').value,above:q('#pcbAbove').value,pilot:q('#pcbPilot').value,
  op:[...q('#pcbOpen').querySelectorAll('input')].map(i=>i.dataset.ref+(i.checked?'+':'-'))};
 const V=p=>massInfo(p).vol,bx=p=>{const b=worldBox(p);return[...b.mn,...b.mx].map(v=>+v.toFixed(2))};
 q('#pcbOpen').querySelectorAll('input').forEach(i=>i.checked=false);
 const R0=await pcbMake(),v0=V(R0.tray),n0=parts.length;
 q('#pcbOpen').querySelectorAll('input').forEach(i=>i.checked=true);const u0=Hist.undo.length;
 const R=await pcbMake();
 return{ui,v0,n0,v:V(R.tray),n:parts.length,du:Hist.undo.length-u0,bt:bx(R.tray),bl:bx(R.lid),bb:bx(R.board),vl:V(R.lid),ghost:R.board.ghost,exp:exportParts().map(p=>p.name),lab:rcLabels(rcEff(R.tray),R.tray),
  msg:q('#pcbMsg').textContent,sel:sel===R.tray,info:R.info,errs:__errs.length}`);
ok(r&&r.ui.mode==='adv'&&r.ui.shown&&/60 × 40 mm, 1,2 mm kalın/.test(r.ui.info)&&/4 vida deliği/.test(r.ui.info),'kart yüklenince gelişmiş modda özet görünür: '+(r&&r.ui.info.slice(0,60)));
ok(r&&r.ui.below==='5'&&r.ui.above==='4.5'&&r.ui.pilot==='2.8'&&r.ui.op.join()==='J1+,SW1+','boşluk önerileri parça yüksekliklerinden (alt 5: USB kablosu için, üst 4,5), vida deliği Ø2,8, açıklık adayları: '+(r&&r.ui.op));
/* açıklıksız gövde: taban + duvar + 4 ayak − 4 kılavuz delik */
const Hh=2+5+1.2+4.5,st=.5*48*3*3*Math.sin(2*Math.PI/48)*5,pl=.5*48*1.4*1.4*Math.sin(2*Math.PI/48)*6;
const vT=off(2.5)*2+(off(2.5)-off(.5))*(Hh-2)+4*st-4*pl;
ok(r&&near(r.v0,vT,4e-3)&&r.n0===3,'gövde hacmi hesapla uyuşuyor ('+(r&&r.v0.toFixed(0))+' ≈ '+vT.toFixed(0)+' mm³), 3 parça');
ok(r&&JSON.stringify(r.bt)===JSON.stringify([-32.5,-22.5,0,32.5,22.5,12.7]),'gövde: kart + 0,5 boşluk + 2 duvar, yükseklik 12,7 → '+(r&&r.bt));
/* USB penceresi 12 × 6,5 ve düğme penceresi 5,8 × 2,6, ikisi de 2 mm duvardan */
ok(r&&near(r.v0-r.v,12*6.5*2+5.8*2.6*2,2e-2)&&r.n===3&&r.du===1&&r.info.opened.join()==='J1,SW1','açıklıklar duvardan doğru hacmi çıkarır; yeniden üretim eskisinin yerine geçer ('+(r&&(r.v0-r.v).toFixed(1))+' mm³)');
ok(r&&r.bl[5]===4&&near(r.bl[3]-r.bl[0],65,1e-6)&&r.bl[0]>r.bt[3]&&near(r.vl,off(2.5)*2+(off(.35)-off(-.85))*2,4e-3),'kapak yanında, düz yüzü tablada, dudaklı ('+(r&&r.vl.toFixed(0))+' mm³)');
ok(r&&r.bb[2]===3.7&&r.bb[5]===10&&r.ghost&&r.exp.join()==='Kutu kapağı,Kutu gövdesi','kart önizlemesi yerinde (z 3,7–10) ve dışa aktarmaya girmiyor: '+(r&&r.exp));
ok(r&&r.sel&&/deneme kartından/.test(r.lab[0])&&/Kutu hazır: dıştan 65 × 45 × 14,7 mm, 4 vida ayağı, 2 açıklık/.test(r.msg)&&r.errs===0,'sonuç iletisi ve yapılanlar listesi: '+(r&&r.lab[0]));

r=await arun('sonrası',`const q=s=>document.querySelector(s),V=p=>massInfo(p).vol;let t=parts.find(p=>p.name==='Kutu gövdesi');const v0=V(t);
 hOp='cut';holePlace(t,new THREE.Vector3(0,-22.5,6),new THREE.Vector3(0,-1,0));q('#hld').value=4;q('#hldep').value=0;q('#hldir').value='n';q('#hlfit').value=0;t=await holeDo();
 const l1=rcLabels(rcEff(t),t),v1=V(t);t=await rcEdit(t,0,{d:6,dep:0});const v2=V(t);
 q('#pcbUp').value='B';q('#pcbUp').dispatchEvent(new Event('change'));const op=[...q('#pcbOpen').querySelectorAll('label')].map(l=>l.textContent),below=q('#pcbBelow').value;
 q('#pcbWall').value='0.2';const n=parts.length;const R=await pcbMake();const m=q('#pcbMsg').textContent;q('#pcbWall').value='2';
 const js=JSON.stringify(projectData());loadProject(JSON.parse(js));
 return{l1,dv1:v0-v1,dv2:v0-v2,op,below,bad:R===null&&parts.length===n,m,ghost:parts.filter(p=>p.ghost).map(p=>p.name)}`);
ok(r&&r.l1.length===2&&/Delik Ø4/.test(r.l1[1])&&r.dv1>0&&r.dv2>r.dv1*1.5,'üretilen gövdeye delik açılır ve yapılanlar listesinden çapı değiştirilir');
ok(r&&r.below==='2.5'&&/J1 · USB · sol kenar/.test(r.op.join('|')),'arka yüz yukarı seçilince öneriler ve kenar adları döner: '+(r&&r.op.join(' | ')));
ok(r&&r.bad&&/Duvar kalınlığı.*en az 0,8/.test(r.m),'geçersiz ölçüde kutu üretilmez, eski parçalar kalır: '+(r&&r.m));
ok(r&&r.ghost.join()==='Kart (önizleme)','önizleme işareti proje dosyasıyla korunur');
console.log(fails?fails+' HATA':'TÜMÜ GEÇTİ');process.exit(fails?1:0)})();
