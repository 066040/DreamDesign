const H=require('./harness.js');let fails=0;
const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const near=(a,b,t)=>Math.abs(a-b)<=t*Math.max(1,Math.abs(b));
let h;try{h=H(require('path').join(__dirname,'..','docs','index.html'))}catch(e){console.log('YÜKLEME HATASI',e.stack);process.exit(1)}
const T=h.T;ok(true,'ana betik hatasız yüklendi');
const run=(name,code)=>{try{return T(code)}catch(e){fails++;console.log('FAIL',name,'→ HATA',e.stack.split('\n').slice(0,4).join(' | '));return null}};

let r=run('temel',`
 const o={};o.n=parts.length;o.zbox=parts[0].pos[2];o.lib=shelf.length;o.tabs=document.querySelectorAll('.page').length;return o`);
ok(r&&r.n===2&&near(r.zbox,35,1e-6)&&r.lib===4&&r.tabs===6,'temel sahne, raf 4, 6 sekme '+JSON.stringify(r));

/* içe aktarma: ofsetli, eğik olmayan "araba" + kopuk kırıntı */
r=run('import',`
 const o={};const g=new THREE.BoxGeometry(4.2,1.8,1.4,20,10,8);g.translate(10,20,30);
 const f=new THREE.SphereGeometry(.02,6,4);f.translate(60,60,60);
 const grp=new THREE.Group();grp.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial()));grp.add(new THREE.Mesh(f,new THREE.MeshBasicMaterial()));
 const p=addModel(grp,'araba',false);
 const b=worldBox(p);o.cx=(b.mn[0]+b.mx[0])/2;o.cy=(b.mn[1]+b.mx[1])/2;o.minz=b.mn[2];o.len=b.mx[0]-b.mn[0];o.wid=b.mx[1]-b.mn[1];o.hei=b.mx[2]-b.mn[2];
 o.msg=document.querySelector('#msg').textContent;o.vol=massInfo(p).vol;o.id=p.id;return o`);
ok(r&&Math.abs(r.cx)<1e-3&&Math.abs(r.cy)<1e-3&&Math.abs(r.minz)<1e-3,'araba X–Y orijinde, taban Z=0 '+JSON.stringify([r.cx,r.cy,r.minz].map(v=>+v.toFixed(4))));
ok(r&&near(r.len,1000,1e-6)&&near(r.wid,1800/4.2,1e-3)&&near(r.hei,1400/4.2,1e-3),'oran korundu, kırıntı sınırı bozmadı: '+[r.len,r.wid,r.hei].map(v=>+v.toFixed(1)));
ok(r&&/kopuk/.test(r.msg),'kırıntı silindi uyarısı: '+r.msg);
ok(r&&near(r.vol,r.len*r.wid*r.hei,.01),'hacim kutu hacmi '+r.vol.toExponential(3));

/* glTF Y-yukarı → Z-yukarı */
r=run('yup',`
 const g=new THREE.BoxGeometry(2,5,1);const grp=new THREE.Group();grp.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial()));
 const p=addModel(grp,'yukari',true);const b=worldBox(p);return{x:b.mx[0]-b.mn[0],y:b.mx[1]-b.mn[1],z:b.mx[2]-b.mn[2],mz:b.mn[2]}`);
ok(r&&near(r.z,1000,1e-6)&&near(r.x,400,1e-3)&&near(r.y,200,1e-3)&&Math.abs(r.mz)<1e-3,'Y-yukarı model Z-yukarı oldu '+JSON.stringify(r));

/* ters yüzlü model */
r=run('ters',`
 const g=new THREE.BoxGeometry(2,2,2,2,2,2);const ix=g.index.array;for(let i=0;i<ix.length;i+=3){const t=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=t}
 const grp=new THREE.Group();grp.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial()));const p=addModel(grp,'ters',false);
 const gg=p.mesh.geometry;return{sv:triMetrics(gg.attributes.position.array,gg.index.array).sV,msg:document.querySelector('#msg').textContent}`);
ok(r&&r.sv>0&&/yön/.test(r.msg),'ters yüzler düzeltildi: '+(r&&r.msg));

/* kafes */
r=run('kafes',`
 histMark();const o={};const p=parts.find(q=>q.name==='araba');select(p);setMode('cage');o.has=!!cage;o.n=cage&&cage.n;
 const h0=worldBox(p);
 document.querySelector('[data-cl="2,1"]').click();o.sel=cage.sel.size;
 document.querySelector('#cgcz').value=(cageCentroid().z-50).toFixed(3);document.querySelector('#cgcz').dispatchEvent(new Event('change'));
 const h1=worldBox(p);o.dh=(h0.mx[2]-h0.mn[2])-(h1.mx[2]-h1.mn[2]);o.xsame=(h1.mx[0]-h1.mn[0])-(h0.mx[0]-h0.mn[0]);
 o.hist=cage.hist.length;o.undone=cageUndo();const h2=worldBox(p);o.back=(h2.mx[2]-h2.mn[2])-(h0.mx[2]-h0.mn[2]);
 return o`);
ok(r&&r.has&&r.n===64&&r.sel===16,'4×4×4 kafes, üst katman 16 nokta');
ok(r&&near(r.dh,50,2e-3)&&Math.abs(r.xsame)<1e-2,'üst katmanı 50 mm indirince yükseklik 50 azaldı ('+r.dh.toFixed(3)+'), uzunluk aynı');
ok(r&&r.undone&&Math.abs(r.back)<1e-2,'kafes geri al çalıştı');
r=run('kafes-simetri',`
 const o={};const p=parts.find(q=>q.name==='araba');const w0=worldBox(p);
 document.querySelector('#cgsym').checked=true;document.querySelector('#cgsymax').value='0';
 document.querySelector('[data-cl="0,0"]').click();
 document.querySelector('#cgcx').value=(cageCentroid().x+30).toFixed(3);document.querySelector('#cgcx').dispatchEvent(new Event('change'));
 const w1=worldBox(p);o.dw=(w0.mx[0]-w0.mn[0])-(w1.mx[0]-w1.mn[0]);o.shiftL=w1.mn[0]-w0.mn[0];o.shiftR=w0.mx[0]-w1.mx[0];
 // ölçekle: üst katman Y %50
 return o`);
ok(r&&near(r.dw,60,3e-3)&&near(r.shiftL,30,5e-3)&&near(r.shiftR,30,5e-3),'simetri: sol katman +30 → sağ katman −30 (genişlik −60): '+JSON.stringify(r));
r=run('kafes-uygula',`
 const o={};const p=parts.find(q=>q.name==='araba');const before=undo.length;const v0=massInfo(p).vol;
 const w0=worldBox(p);setMode('sec');o.cage=cage;o.undoAdded=undo.length-before;
 const w1=worldBox(p);o.same=Math.abs((w1.mx[0]-w1.mn[0])-(w0.mx[0]-w0.mn[0]));o.vol=[v0,massInfo(p).vol];o.minz=w1.mn[2];
 doUndo();const p2=parts.find(q=>q.name==='araba');const w2=worldBox(p2);o.undoWidth=w2.mx[0]-w2.mn[0];o.origWidth=1000;return o`);
ok(r&&r.cage===null&&r.undoAdded===1&&r.same<1e-2,'kafes uygulandı ve geri alma kaydı eklendi');
ok(r&&near(r.undoWidth,1000,1e-3),'geri al orijinal genişliğe döndü '+r.undoWidth.toFixed(2));

/* kesme / birleştirme / ayna */
r=run('kes',`
 const o={};const p=parts.find(q=>q.name==='araba');select(p);const n0=parts.length,v0=massInfo(p).vol;
 document.querySelector('#cutax').value='2';document.querySelector('#cut').value='50';document.querySelector('#cutgap').value='40';
 document.querySelector('#docut').click();o.dn=parts.length-n0;
 const A=parts.find(q=>q.name==='araba A'),B=parts.find(q=>q.name==='araba B');o.has=!!A&&!!B;
 o.vsum=massInfo(A).vol+massInfo(B).vol;o.v0=v0;
 const a=worldBox(A),b=worldBox(B);o.gap=b.mn[2]-a.mx[2];return o`);
ok(r&&r.has&&r.dn===1&&near(r.vsum,r.v0,.01),'kesme: iki parça, hacim korundu '+(r&&(r.vsum/r.v0).toFixed(4)));
ok(r&&near(r.gap,40,.02),'ayrılma boşluğu 40 mm '+(r&&r.gap.toFixed(2)));
r=run('birlestir',`
 const o={};const A=parts.find(q=>q.name==='araba A'),B=parts.find(q=>q.name==='araba B');select(A);fillSelects();
 document.querySelector('#mgsel').value=String(B.id);document.querySelector('#mgtol').value='0.5';
 const n0=parts.length;const v0=massInfo(A).vol+massInfo(B).vol;document.querySelector('#domerge').click();
 o.dn=parts.length-n0;const m=sel;o.name=m.name;o.vol=massInfo(m).vol;o.v0=v0;const b=worldBox(m);o.h=b.mx[2]-b.mn[2];return o`);
ok(r&&r.dn===-1&&near(r.vol,r.v0,.02),'birleştirme: tek parça, hacim korundu');
r=run('ayna',`
 const p=sel;const b0=worldBox(p);document.querySelector('[data-mirror="0"]').click();const m=sel;const b1=worldBox(m);
 const near=(a,b,t)=>Math.abs(a-b)<=t*Math.max(1,Math.abs(b));return{ok:near(b1.mx[0],-b0.mn[0],1e-6)&&near(b1.mn[0],-b0.mx[0],1e-6),sv:(()=>{const g=m.mesh.geometry;return triMetrics(g.attributes.position.array,g.index.array).sV})()}`);
ok(r&&r.ok&&r.sv>0,'ayna kopya X=0 düzleminde, yüzler dışa bakıyor');
r=run('kopya',`const n=parts.length;document.querySelector('#doclone').click();return parts.length-n`);ok(r===1,'kopyala bir parça ekledi');

/* temizlik */
r=run('temizlik',`
 const g=new THREE.SphereGeometry(1,40,28);const grp=new THREE.Group();grp.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial()));
 const p=addModel(grp,'kure',false);const P=p.mesh.geometry.attributes.position.array;let seed=3;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647-.5;
 const topo=buildTopo(P,p.mesh.geometry.index.array,2);for(let w=0;w<topo.W;w++){const d=rnd()*.05;for(let j=topo.memStart[w];j<topo.memStart[w+1];j++){const v=topo.mem[j]*3;P[v]+=d;P[v+1]+=d*.7;P[v+2]+=d*.4}}
 p.mesh.geometry.attributes.position.needsUpdate=true;commitShape(p);const rough=()=>{let e=0;const A=p.mesh.geometry.attributes.position.array;for(let i=0;i<A.length;i+=3)e+=Math.abs(Math.hypot(A[i],A[i+1],A[i+2])-1);return e/(A.length/3)};
 const r0=rough();const v0=massInfo(p).vol;select(p);document.querySelector('#smn').value='15';document.querySelector('#dosmooth').click();
 return{r0,r1:rough(),vr:massInfo(p).vol/v0}`);
ok(r&&r.r1<r.r0*.5&&r.vr>.93&&r.vr<1.02,'yumuşatma pürüzü azalttı '+r.r0.toFixed(4)+'→'+r.r1.toFixed(4)+', hacim oranı '+r.vr.toFixed(3));

/* görünüm biçimleri */
r=run('gorunum',`
 const o={};const p=parts.find(q=>q.name==='kure');select(p);
 for(const m of ['tri','outline','contour','center','solid']){document.querySelector('#disp').value=m;document.querySelector('#disp').dispatchEvent(new Event('change'));o[m]=p.ov?p.ov.children.length:0}
 o.matSolid=p.mesh.material===p.solidMat;return o`);
ok(r&&r.tri===0&&r.outline>=1&&r.contour>=1&&r.center>=2&&r.matSolid,'görünüm biçimleri hatasız döndü '+JSON.stringify(r));
r=run('gorunum2',`const o={};const p=sel;for(const m of ['outline','contour','center']){disp=m;look();o[m]=p.ov?p.ov.children.map(c=>c.type+':'+(c.geometry.attributes.position.count)).join(','):''}disp='solid';look();return o`);
ok(r&&/LineSegments/.test(r.outline)&&/LineSegments:\d+/.test(r.contour)&&/Points/.test(r.center),'ana hat / kesit / orta hat çizgileri üretildi '+JSON.stringify(r));

/* kamera */
r=run('kamera',`
 const o={};view('x');o.o1=isOrtho&&cam===orthoCam;const d=cam.position.clone().sub(ctl.target).normalize();o.dx=d.x;
 view('z');o.dz=cam.position.clone().sub(ctl.target).normalize().z;view('iso');o.o2=!isOrtho&&cam===persp;setOrtho(true);o.tcCam=tc.camera===cam;o.h=orthoH;
 document.querySelector('#ortho').click();o.o3=!isOrtho;fit();return o`);
ok(r&&r.o1&&r.dx>.99&&r.dz>.99&&r.o2&&r.tcCam&&r.o3&&r.h>0,'ortografik X/Z görünümleri, İzo\'da perspektif, gizmo kamerası '+JSON.stringify(r));

/* ölçüm */
r=run('olcum',`
 const o={};const p=parts[0];parts.forEach(q=>q.vis=q===p);select(p);view('iso');setMode('meas');setCam();function setCam(){cam.updateMatrixWorld(true)}
 const proj=(x,y,z)=>{const v=new THREE.Vector3(x,y,z).project(cam);return{clientX:(v.x+1)/2*800,clientY:(1-v.y)/2*600}};
 const b=worldBox(p);const a=proj(b.mn[0]+1,b.mn[1]+1,b.mx[2]),c=proj(b.mx[0]-1,b.mn[1]+1,b.mx[2]);
 measClick(a);measClick(c);o.n=measures.length;o.d=measures.length?(w=>w[0].distanceTo(w[1]))(measWorld(measures[0])):0;o.lbl=labels.filter(l=>l.kind==='meas').map(l=>l.el.textContent);
 setMode('sec');parts.forEach(q=>q.vis=true);return o`);
ok(r&&r.n===1&&near(r.d,640,.03)&&r.lbl.length===1,'ölçüm: '+(r&&r.d.toFixed(1))+' mm, etiket '+(r&&r.lbl[0]));
r=run('olcucizgi',`const p=parts[0];select(p);return{lbl:labels.filter(l=>l.kind==='dim').map(l=>l.el.textContent),vis:dimLines.visible}`);
ok(r&&r.vis&&r.lbl.length===3&&/640/.test(r.lbl[0])&&/260/.test(r.lbl[1])&&/70/.test(r.lbl[2]),'ölçü çizgileri 640 × 260 × 70: '+(r&&r.lbl.join(' | ')));

/* raf ve montaj */
r=run('raf',`
 const o={};const target=parts[0];parts.forEach(q=>q.vis=q===target);const w=worldBox(target);
 view('iso');cam.updateMatrixWorld(true);const v=new THREE.Vector3((w.mn[0]+w.mx[0])/2,(w.mn[1]+w.mx[1])/2,w.mx[2]).project(cam);
 const e={clientX:(v.x+1)/2*800,clientY:(1-v.y)/2*600};
 const n0=parts.length;const p=spawn(shelf[0],e);o.dn=parts.length-n0;const b=worldBox(p);
 o.touch=b.mn[2]-w.mx[2];o.name=p.name;o.cx=(b.mn[0]+b.mx[0])/2-(w.mn[0]+w.mx[0])/2;
 // yan yüzeye: aynı kutunun +X yüzünü hedefle
 const v2=new THREE.Vector3(w.mx[0],(w.mn[1]+w.mx[1])/2,(w.mn[2]+w.mx[2])/2).project(cam);
 const e2={clientX:(v2.x+1)/2*800-2,clientY:(1-v2.y)/2*600};const r2=pickAt(e2);o.hit2=!!r2;
 if(r2){const q=spawn(shelf[3],e2);const bb=worldBox(q);o.sideOK=bb.mn[0]>=w.mx[0]-30}
 parts.forEach(q=>q.vis=true);return o`);
ok(r&&r.dn===1&&Math.abs(r.touch)<1.5&&Math.abs(r.cx)<40,'raftan sürükle-bırak: tekerlek kutunun üstüne oturdu (temas '+(r&&r.touch.toFixed(2))+')');
ok(r&&(!r.hit2||r.sideOK),'yan yüzeye bırakınca yüzeyin dışında kaldı');

/* eklemler */
r=run('eklem',`
 const o={};const A=add('box',[400,200,100],[0,0,0],{ground:false}),B=add('box',[200,100,50],[300,0,0],{ground:false}),C=add('box',[100,50,25],[500,0,0],{ground:false});
 A.pos=[0,0,0];B.pos=[300,0,0];C.pos=[450,0,0];apply(A);apply(B);apply(C);
 let err=addJoint(A,B,'rev',new THREE.Vector3(0,0,1),new THREE.Vector3(200,0,0),-180,180);o.err1=err;
 err=addJoint(B,C,'rev',new THREE.Vector3(0,0,1),new THREE.Vector3(400,0,0),-180,180);o.err2=err;
 o.dup=addJoint(A,B,'rev',new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,0),-1,1);o.cyc=addJoint(C,A,'rev',new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,0),-1,1);
 const J1=joints.find(j=>j.child===B),J2=joints.find(j=>j.child===C);
 J1.val=90;evalJoint(J1,0);
 // B: pivot (200,0,0), B0=(300,0,0) → 90° → (200,100,0); C0=(450,0,0) → (200,250,0)
 o.B=B.pos.slice();o.C=C.pos.slice();o.Brot=B.rot[2];o.Crot=C.rot[2];
 J2.val=-90;evalJoint(J2,0); // C pivot (400,0,0) B-çerçevesinde: dünya (200,200,0); C'nin yeni konumu
 o.C2=C.pos.slice();o.C2rot=C.rot[2];
 A.pos[0]=100;apply(A);jointsFollow(A);o.Bf=B.pos.slice();
 // çocuğu elle taşı, rebase, sonra val değiştir tutarlı mı
 B.pos[1]+=50;apply(B);jointsRebase(B);const bp=B.pos.slice();J1.val=90;evalJoint(J1,0);o.sameAfter=Math.hypot(B.pos[0]-bp[0],B.pos[1]-bp[1],B.pos[2]-bp[2]);
 J1.val=0;evalJoint(J1,0);o.B0=B.pos.slice();
 for(const q of [A,B,C]){select(q);remove()}
 return o`);
ok(r&&!r.err1&&!r.err2&&r.dup&&r.cyc,'eklem ekleme, tekrar ve döngü engeli: '+JSON.stringify([r.err1,r.err2,r.dup,r.cyc]));
ok(r&&near(r.B[0],200,1e-4)&&near(r.B[1],100,1e-4)&&near(r.Brot,90,1e-3),'dönel eklem: B pivot etrafında 90° → (200,100) '+JSON.stringify(r.B.map(v=>+v.toFixed(3))));
ok(r&&near(r.C[0],200,1e-4)&&near(r.C[1],250,1e-4)&&near(r.Crot,90,1e-3),'alt-alt parça (torun) da döndü → (200,250) '+JSON.stringify(r.C.map(v=>+v.toFixed(3))));
ok(r&&near(r.C2rot,0,1e-3),'ikinci eklem −90°: toplam dönüş 0');
ok(r&&near(r.Bf[0],300,1e-4)&&near(r.Bf[1],100,1e-4),'üst parça +100 X kayınca alt parça izledi '+JSON.stringify(r.Bf.map(v=>+v.toFixed(3))));
ok(r&&r.sameAfter<1e-6,'çocuk elle taşınıp rebase edilince eklem tutarlı ('+r.sameAfter.toExponential(1)+')');

/* proje kaydet/aç */
r=run('proje',`
 const o={};const before=parts.map(p=>[p.name,+massInfo(p).mass.toFixed(6),p.id]);
 const A=add('box',[400,200,100],[800,0,0],{ground:false}),B=add('cyl',[100,100,100],[1200,0,0],{ground:false});
 addJoint(A,B,'pri',new THREE.Vector3(1,0,0),new THREE.Vector3(1000,0,0),-100,100);joints[joints.length-1].val=50;evalJoint(joints[joints.length-1],0);
 poses.push({name:'p',vals:{[joints[joints.length-1].id]:50}});
 const js=JSON.stringify(projectData());o.size=js.length;const n=parts.length,M=totalMass;
 const d=JSON.parse(js);loadProject(d);stats();
 o.n=[n,parts.length];o.M=[M,totalMass];o.joints=joints.length;o.poses=poses.length;o.shelf=shelf.length;
 const bb=joints[joints.length-1].child;o.bx=bb.pos[0];o.analytic=!!bb.analytic;
 const j=joints[joints.length-1];j.val=-50;evalJoint(j,0);o.moved=bb.pos[0];
 o.ids=new Set(parts.map(p=>p.id)).size===parts.length;const mx=Math.max(...parts.map(p=>p.id));o.uidOK=uid>mx;
 return o`);
ok(r&&r.n[0]===r.n[1]&&near(r.M[0],r.M[1],1e-6),'proje gidiş-dönüş: parça sayısı ve toplam kütle aynı ('+r.n+' / '+r.M.map(v=>v.toFixed(3))+')');
ok(r&&r.joints>=1&&r.poses===1&&r.shelf===4&&r.ids&&r.uidOK,'eklem, poz, raf, kimlikler geri geldi');
ok(r&&near(r.bx,1250,1e-4)&&near(r.moved,1150,1e-4)&&r.analytic,'eklem proje sonrası çalışıyor: x=1250 → −50 ile 1150');

/* hesap */
r=run('hesap',`updateCalc();return{f:document.querySelector('#fout').textContent,w:document.querySelector('#wout').textContent,m:document.querySelector('#mtab').textContent}`);
ok(r&&/kW/.test(r.f)&&/stall|Sönme/.test(r.w)&&/Alüminyum/.test(r.m),'uçuş/kanat/malzeme hesabı yazıldı');

/* çizim alanı */
r=run('cizim',`
 const o={};skOpen(true);skTool('rect');
 const ev=(t,x,y,b)=>{const e=new MouseEvent(t,{clientX:x,clientY:y,button:b||0,bubbles:true});skCv.dispatchEvent(e)};
 sk.view={x:0,y:0,s:1};sk.w=1000;sk.h=800;
 // 200×100 dikdörtgen, ızgara 10: ekranda (500,400) merkez
 ev('pointerdown',500,400);ev('pointermove',700,300);ev('pointerup',700,300);
 o.shapes=sk.shapes.length;const s=sk.shapes[0];o.rect=s&&[Math.abs(s.b[0]-s.a[0]),Math.abs(s.b[1]-s.a[1])];
 document.querySelector('#skdepth').value='50';document.querySelector('#skcenter').checked=true;
 const n0=parts.length;document.querySelector('#skext').click();o.dn=parts.length-n0;o.vol=massInfo(sel).vol;
 const b=worldBox(sel);o.ext=[b.mx[0]-b.mn[0],b.mx[1]-b.mn[1],b.mx[2]-b.mn[2]];
 return o`);
ok(r&&r.shapes===1&&near(r.rect[0],200,1e-6)&&near(r.rect[1],100,1e-6),'dikdörtgen çizildi 200×100: '+JSON.stringify(r&&r.rect));
ok(r&&r.dn===1&&near(r.vol,200*100*50,1e-4)&&near(r.ext[0],200,1e-4)&&near(r.ext[1],50,1e-4)&&near(r.ext[2],100,1e-4),'ekstrüde: hacim 1.000.000 mm³, ön düzlem → Y ince: '+JSON.stringify(r&&r.ext));
r=run('cizim-revolve',`
 const o={};sk.shapes=[];skTool('line');
 const ev=(t,x,y,b)=>skCv.dispatchEvent(new MouseEvent(t,{clientX:x,clientY:y,button:b||0,bubbles:true}));
 // profil: (0,0),(100,0),(100,200),(0,200) → silindir r=100 h=200; ekranda y yukarı: sy=400-y
 for(const[x,y] of [[0,0],[100,0],[100,200],[0,200]]){ev('pointerdown',500+x,400-y);ev('pointerup',500+x,400-y)}
 ev('pointerdown',500,400);ev('pointerup',500,400); // ilk noktaya tıkla: kapat
 o.shapes=sk.shapes.length;o.closed=sk.shapes[0]&&sk.shapes[0].closed;o.pts=sk.shapes[0]&&sk.shapes[0].pts.length;
 document.querySelector('#skplane').value='front';document.querySelector('#skrev').click();o.vol=massInfo(sel).vol;return o`);
ok(r&&r.shapes===1&&r.closed&&r.pts===4,'çizgi aracıyla kapalı çokgen (ilk noktaya tıklayınca kapandı)');
ok(r&&near(r.vol,Math.PI*100*100*200,.01),'revolve silindir hacmi π·100²·200 = '+(r&&(r.vol/1e6).toFixed(3))+' cm³·1000');
r=run('cizim-foto',`
 const o={};sk.shapes=[];const w=160,h=100,c=document.createElement('canvas');
 const data=new Uint8ClampedArray(w*h*4);for(let i=0;i<w*h;i++){data[4*i]=data[4*i+1]=data[4*i+2]=235;data[4*i+3]=255}
 // "araba": dikdörtgen gövde + yarım daire kabin
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const body=x>=20&&x<140&&y>=55&&y<85,cab=Math.hypot(x-80,y-55)<30&&y<55;if(body||cab){const i=y*w+x;data[4*i]=data[4*i+1]=data[4*i+2]=30}}
 sk.ref={canvas:c,w,h,data:{data},k:0,cx:0,by:0};document.querySelector('#skrefw').value='4000';document.querySelector('#sktol').value='60';
 skTrace();const s=sk.shapes[0];o.n=s&&s.pts.length;
 let minx=1e9,maxx=-1e9,miny=1e9,maxy=-1e9;s.pts.forEach(p=>{minx=Math.min(minx,p[0]);maxx=Math.max(maxx,p[0]);miny=Math.min(miny,p[1]);maxy=Math.max(maxy,p[1])});
 o.w=maxx-minx;o.h=maxy-miny;o.miny=miny;o.area=Math.abs(polyArea(s.pts));return o`);
ok(r&&near(r.w,4000,.03)&&Math.abs(r.miny)<60&&r.h>1700&&r.h<2200,'fotoğraftan ana hat: genişlik ≈ 4000 mm, taban v≈0, yükseklik '+(r&&r.h.toFixed(0)));
r=run('cizim-geri',`
 sk.shapes=[];sk.hist=[];skTool('rect');const ev=(t,x,y)=>skCv.dispatchEvent(new MouseEvent(t,{clientX:x,clientY:y,button:0,bubbles:true}));
 sk.view={x:0,y:0,s:1};ev('pointerdown',500,400);ev('pointermove',600,350);ev('pointerup',600,350);const n1=sk.shapes.length;
 skKey({key:'z',ctrlKey:true,preventDefault(){}});return[n1,sk.shapes.length]`);
ok(r&&r[0]===1&&r[1]===0,'çizimde Ctrl+Z şekli geri aldı');
r=run('cizim-kapat',`skOpen(false);return !document.querySelector('#sk').classList.contains('on')`);ok(r===true,'çizim alanı kapandı');

/* dışa aktarma */
r=run('disa',`
 const l=exportParts();const m=catMesh(l.map(p=>worldArrays(p)));const st=stlBinary(m.P,m.I);
 const g=new THREE.STLLoader().parse(st.buffer);const back=g.attributes.position.count/3;
 return{tri:m.I.length/3,back,len:st.length,vol:triMetrics(m.P,m.I).V>0}`);
ok(r&&r.tri===r.back&&r.len===84+50*r.tri,'STL yazıp STLLoader ile okudum: '+(r&&r.tri)+' üçgen');

/* el hareketi */
r=run('el',`
 const o={};view('iso');const hand=(d,ox,oy)=>{const l=Array.from({length:21},()=>({x:.5+ox,y:.5+oy,z:0}));l[0]={x:.5+ox,y:.8+oy,z:0};l[9]={x:.5+ox,y:.6+oy,z:0};l[4]={x:.5+ox-d/2,y:.5+oy,z:0};l[8]={x:.5+ox+d/2,y:.5+oy,z:0};return l};
 const g=new Gestures();const az=()=>Math.atan2(cam.position.y-ctl.target.y,cam.position.x-ctl.target.x);
 const a0=az();let ev=g.update([hand(.2,0,0)]);ev.forEach(gestureEvent);ev=g.update([hand(.04,0,0)]);ev.forEach(gestureEvent);
 ev=g.update([hand(.04,-.1,0)]);ev.forEach(gestureEvent); // elini kameradaki x'te −0.1 (kullanıcının sağına) götürdü
 o.da=az()-a0;
 const d0=cam.position.distanceTo(ctl.target);ev=g.update([hand(.2,0,0)]);ev.forEach(gestureEvent);
 const g2=new Gestures();g2.update([hand(.04,-.2,0),hand(.04,.2,0)]).forEach(gestureEvent);g2.update([hand(.04,-.3,0),hand(.04,.3,0)]).forEach(gestureEvent);
 o.d=[d0,cam.position.distanceTo(ctl.target)];
 const t0=ctl.target.clone();g2.update([hand(.04,-.3,.1),hand(.04,.3,.1)]).forEach(gestureEvent);o.pan=ctl.target.distanceTo(t0);
 return o`);
ok(r&&Math.abs(r.da)>.1,'el hareketiyle kamera döndü (Δaçı '+(r&&r.da.toFixed(3))+')');
ok(r&&r.d[1]<r.d[0]*.8,'iki el açılınca yakınlaştı '+(r&&r.d.map(v=>v.toFixed(0))));
ok(r&&r.pan>10,'iki el birlikte inince kaydırdı (Δ '+(r&&r.pan.toFixed(1))+' mm)');
r=run('el-esnet',`
 const o={};const p=parts.find(q=>q.name==='kure');parts.forEach(q=>q.vis=q===p);select(p);setMode('grab');view('iso');cam.updateMatrixWorld(true);
 const b=worldBox(p),cx=(b.mn[0]+b.mx[0])/2,cy=(b.mn[1]+b.mx[1])/2,cz=(b.mn[2]+b.mx[2])/2;
 // kürenin ekrandaki merkezine denk gelen tutma noktası
 const v=new THREE.Vector3(cx,cy,cz).project(cam);const x=1-((v.x+1)/2),y=(1-v.y)/2; // ham görüntü koordinatı (aynalı çevrilince doğru ekran)
 const g=new Gestures();const hand=(d,tx,ty)=>{const l=Array.from({length:21},()=>({x:tx,y:ty,z:0}));l[0]={x:tx,y:ty+.3,z:0};l[9]={x:tx,y:ty+.1,z:0};l[4]={x:tx-d/2,y:ty,z:0};l[8]={x:tx+d/2,y:ty,z:0};return l};
 const before=Float32Array.from(p.mesh.geometry.attributes.position.array);
 g.update([hand(.2,x,y)]).forEach(gestureEvent);g.update([hand(.02,x,y)]).forEach(gestureEvent);o.grabbing=!!grab;
 g.update([hand(.02,x,y-.1)]).forEach(gestureEvent);if(grab&&grab.pending){const e=grab.pending;grab.pending=null;doGrab(e)}
 g.update([hand(.2,x,y-.1)]).forEach(gestureEvent);o.ended=!grab;
 const A=p.mesh.geometry.attributes.position.array;let mv=0;for(let i=0;i<A.length;i++)mv=Math.max(mv,Math.abs(A[i]-before[i]));o.moved=mv>0;o.undo=undo.length;parts.forEach(q=>q.vis=true);return o`);
ok(r&&r.grabbing&&r.ended&&r.moved,'el hareketiyle Esnet: tut, çek, bırak → model şekillendi');

/* genel geri al / ileri al */
r=run('hist1',`
 parts.forEach(q=>q.vis=true);setMode('sec');histMark();const o={};o.n0=parts.length;
 add('box');histMark();o.n1=parts.length;
 const p=parts[parts.length-1];p.pos[0]+=111;apply(p);histMark();const x1=p.pos[0];
 doUndo();o.afterUndo1=parts.find(q=>q.id===p.id).pos[0];
 doUndo();o.afterUndo2=parts.length;
 histRedo();o.afterRedo1=parts.length;histRedo();o.afterRedo2=parts.find(q=>q.id===p.id).pos[0];o.x1=x1;
 o.canUndo=Hist.undo.length;return o`);
ok(r&&r.n1===r.n0+1&&near(r.afterUndo1,r.x1-111,1e-6)&&r.afterUndo2===r.n0&&r.afterRedo1===r.n0+1&&near(r.afterRedo2,r.x1,1e-6),'Ctrl+Z / Ctrl+Y: parça ekle, taşı, geri al, ileri al '+JSON.stringify(r));
r=run('hist2',`
 clearMeasures();histMark();const o={};const p=parts[0];select(p);setMode('meas');
 parts.forEach(q=>q.vis=q===p);view('iso');cam.updateMatrixWorld(true);
 const proj=(x,y,z)=>{const v=new THREE.Vector3(x,y,z).project(cam);return{clientX:(v.x+1)/2*800,clientY:(1-v.y)/2*600}};
 const b=worldBox(p);measClick(proj(b.mn[0]+1,b.mn[1]+1,b.mx[2]));measClick(proj(b.mx[0]-1,b.mn[1]+1,b.mx[2]));o.m1=measures.length;histMark();
 const d0=measWorld(measures[0]);const L0=d0[0].distanceTo(d0[1]);
 p.pos[0]+=500;apply(p);drawMeasures();const d1=measWorld(measures[0]);o.moved=d1[0].x-d0[0].x;
 histMark();doUndo();o.afterUndoMeas=measures.length;const dd=measWorld(measures[0]);o.backX=dd[0].x-d0[0].x;doUndo();o.afterUndo2=measures.length;histRedo();o.redo=measures.length;
 setMode('sec');const q=parts.find(x=>x.id===p.id);select(q);remove();o.afterDel=measures.length;o.lbls=labels.filter(l=>l.kind==='meas').length;
 doUndo();o.restored=measures.length;parts.forEach(q=>q.vis=true);return o`);
ok(r&&r.m1===1&&near(r.moved,500,1e-3)&&r.afterUndoMeas===1&&Math.abs(r.backX)<1e-3&&r.afterUndo2===0&&r.redo===1&&r.afterDel===0&&r.lbls===0&&r.restored===1,'ölçü parçaya bağlı: taşınınca güncellenir, parça silinince silinir, geri alınca döner '+JSON.stringify(r));
r=run('hist3',`
 skOpen(true);sk.shapes=[];sk.cur=null;histMark();skTool('line');
 const ev=(t,x,y)=>skCv.dispatchEvent(new MouseEvent(t,{clientX:x,clientY:y,button:0,bubbles:true}));
 sk.view={x:0,y:0,s:1};const o={};
 ev('pointerdown',400,300);ev('pointerup',400,300);ev('pointerdown',500,300);ev('pointerup',500,300);ev('pointerdown',500,400);ev('pointerup',500,400);
 o.pts=sk.cur&&sk.cur.pts.length;skKey({key:'z',ctrlKey:true,preventDefault(){}});o.pts2=sk.cur&&sk.cur.pts.length;
 skKey({key:'Enter',preventDefault(){}});o.shapes=sk.shapes.length;histMark();
 skKey({key:'z',ctrlKey:true,preventDefault(){}});o.undone=sk.shapes.length;
 skKey({key:'y',ctrlKey:true,preventDefault(){}});o.redone=sk.shapes.length;
 sk.selId=sk.shapes[0].id;skKey({key:'Delete',preventDefault(){}});histMark();o.del=sk.shapes.length;
 skKey({key:'z',ctrlKey:true,preventDefault(){}});o.delUndo=sk.shapes.length;
 sk.ref={canvas:document.createElement('canvas'),w:10,h:10,data:null,k:1,cx:0,by:0};document.querySelector('#skref').hidden=false;
 sk.shapes.push({id:99,type:'poly',closed:true,trace:true,pts:[[0,0],[10,0],[10,10]]});
 document.querySelector('#skrefdel').click();o.ref=sk.ref;o.traced=sk.shapes.filter(s=>s.trace).length;
 document.querySelector('#skall').click();o.all=sk.shapes.length;skOpen(false);return o`);
ok(r&&r.pts===3&&r.pts2===2&&r.shapes===1&&r.undone===0&&r.redone===1&&r.del===0&&r.delUndo===1&&r.ref===null&&r.traced===0&&r.all===0,'çizimde nokta/şekil geri alma, ileri alma, görsel kaldırma '+JSON.stringify(r));

/* çoklu görünümden model (arayüz) */
r=run('mv',`
 const mk=(w,h,f)=>{const m=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++)m[y*w+x]=f(x+.5,y+.5)?1:0;return{m,w,h}};
 const o={};const n0=parts.length;
 mv.views={front:mk(100,50,()=>1),side:mk(200,50,()=>1),top:null};mv.flip={};
 document.querySelector('#mvlen').value='400';document.querySelector('#mvres').value='64';
 mvDo();const p=parts[parts.length-1];o.n=parts.length-n0;const b=worldBox(p);
 o.dims=[b.mx[0]-b.mn[0],b.mx[1]-b.mn[1],b.mx[2]-b.mn[2]];o.minz=b.mn[2];o.cx=(b.mx[0]+b.mn[0])/2;o.cy=(b.mx[1]+b.mn[1])/2;o.name=p.name;o.msg=document.querySelector('#mvmsg').textContent;
 mv.views={};mvDo();o.empty=document.querySelector('#mvmsg').textContent;
 doUndo();return o`);
ok(r&&r.n===1&&near(r.dims[0],200,.08)&&near(r.dims[1],400,.08)&&near(r.dims[2],100,.1)&&Math.abs(r.minz)<8&&Math.abs(r.cx)<5&&Math.abs(r.cy)<5,'çoklu görünümden model: ölçü, ortalama, taban '+JSON.stringify(r));

ok(h.errs.length===0,'çalışma sırasında yakalanmamış hata yok '+h.errs.join('|'));
console.log(fails?('HATA '+fails):'TÜMÜ GEÇTİ');process.exit(fails?1:0);
