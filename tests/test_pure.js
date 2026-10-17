const fs=require('fs'),vm=require('vm');
const c={btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),console};
vm.createContext(c);
const src=fs.readFileSync(require('path').join(__dirname,'..','app','src','pure.js'),'utf8');
vm.runInContext(src+`;this.A={Heap,triMetrics,areaStats,buildTopo,geodesic,falloff,components,dropSmall,compact,fixWinding,taubin,weld,bsKnots,bsGreville,bsEval,bsDeg,ffdPrepare,ffdRest,ffdEval,sliceSegments,centerLine,cutMesh,polyArea,polyCentroid,earClip,extrudeLoop,revolveProfile,maskFromImage,cleanMask,traceContour,rdp,stlBinary,objText,b64,unb64,hoverCalc,wingCalc,pinchRatio,Gestures,bboxDiag,boxBlur2,cropMask,mirrorLeft,distField,mvDims,blur3,surfaceNets,mvMesh}`,c);
const A=c.A;let fails=0;const ok=(k,m)=>{if(!k){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const near=(a,b,t)=>Math.abs(a-b)<=t*Math.max(1,Math.abs(b));
function uvSphere(r,nu,nv,cx=0,cy=0,cz=0){const P=[],I=[];
 for(let j=0;j<=nv;j++)for(let i=0;i<nu;i++){const th=Math.PI*j/nv,ph=2*Math.PI*i/nu;P.push(cx+r*Math.sin(th)*Math.cos(ph),cy+r*Math.sin(th)*Math.sin(ph),cz+r*Math.cos(th))}
 for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*nu+i,b=j*nu+(i+1)%nu,cc=(j+1)*nu+i,d=(j+1)*nu+(i+1)%nu;
  if(j>0)I.push(a,cc,b);if(j<nv-1)I.push(b,cc,d)}
 return{P:Float32Array.from(P),I:Uint32Array.from(I)}}
function box(x0,y0,z0,x1,y1,z1){const V=[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],P=[];V.forEach(v=>P.push(...v));
 const I=[0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7];return{P:Float32Array.from(P),I:Uint32Array.from(I)}}
const cat=(a,b)=>{const n=a.P.length/3;const P=new Float32Array(a.P.length+b.P.length);P.set(a.P);P.set(b.P,a.P.length);const I=new Uint32Array(a.I.length+b.I.length);I.set(a.I);for(let i=0;i<b.I.length;i++)I[a.I.length+i]=b.I[i]+n;return{P,I}};

/* B-spline */
for(const n of [2,3,4,5,8]){const p=A.bsDeg(n),k=A.bsKnots(n,p),o=new Float64Array(p+1);let okp=true;
 for(let t=0;t<=1.0001;t+=.037){const s=A.bsEval(n,p,k,Math.min(t,1),o);const sum=o.reduce((x,y)=>x+y,0);if(Math.abs(sum-1)>1e-9||s<0||s+p>n-1||o.some(v=>v<-1e-12))okp=false}
 ok(okp,'B-spline birim ayrışımı n='+n)}
/* FFD özdeşlik */
{const s=uvSphere(50,24,16,10,-5,20),box0={min:[-40,-55,-30],size:[100,100,100]};
 for(const N of [[4,4,4],[5,3,6],[3,3,3],[2,2,2]]){const pr=A.ffdPrepare(s.P,box0,N),C=A.ffdRest(pr),out=new Float32Array(s.P.length);A.ffdEval(pr,C,out);
  let e=0;for(let i=0;i<out.length;i++)e=Math.max(e,Math.abs(out[i]-s.P[i]));ok(e<1e-3,'FFD özdeşlik N='+N+' hata '+e.toExponential(1))}
 /* yerel destek */
 const N=[6,6,6],pr=A.ffdPrepare(s.P,box0,N),C=A.ffdRest(pr),out=new Float32Array(s.P.length);
 const ci=(5*6+3)*6+3;C[ci*3]+=30; // x=en uç, y,z orta
 A.ffdEval(pr,C,out);let mx=0,far=0;for(let v=0;v<s.P.length/3;v++){const d=Math.abs(out[3*v]-s.P[3*v]);mx=Math.max(mx,d);if(s.P[3*v]<box0.min[0]+box0.size[0]*.45)far=Math.max(far,d)}
 ok(mx>3&&far<1e-4,'FFD yerel: yakın '+mx.toFixed(2)+' uzak '+far.toExponential(1));
 /* simetri: tüm x katmanı +10 kaydır → tüm köşeler +10 */
 const C2=A.ffdRest(pr);for(let j=0;j<6;j++)for(let k=0;k<6;k++)for(let i=0;i<6;i++)C2[((i*6+j)*6+k)*3+2]+=10;
 A.ffdEval(pr,C2,out);let ez=0;for(let v=0;v<s.P.length/3;v++)ez=Math.max(ez,Math.abs(out[3*v+2]-s.P[3*v+2]-10));ok(ez<1e-3,'FFD tüm kafes +10 → model +10');}
/* hacim/winding/bileşen */
{const s=uvSphere(10,48,32);const m=A.triMetrics(s.P,s.I);ok(near(m.V,4/3*Math.PI*1000,.01)&&m.sV>0,'küre hacmi ve pozitif işaret '+m.sV.toFixed(1));
 const I2=Uint32Array.from(s.I);for(let i=0;i<I2.length;i+=3){const t=I2[i+1];I2[i+1]=I2[i+2];I2[i+2]=t}
 ok(A.fixWinding(s.P,I2)&&A.triMetrics(s.P,I2).sV>0,'ters yüz düzeltildi');ok(!A.fixWinding(s.P,s.I),'doğru yüze dokunmadı');
 const sm=uvSphere(1,8,6,100,100,100),both=cat(s,sm);
 const topo=A.buildTopo(both.P,both.I,A.bboxDiag(both.P)),co=A.components(topo,both.I);ok(co.count===2,'iki bileşen');
 const r=A.dropSmall(both.P,null,both.I,.05);ok(r.dropped===1&&r.P.length/3===s.P.length/3&&r.I.length===s.I.length,'kırıntı atıldı '+r.dropped);
 ok(Math.max(...r.P)<=10.0001,'kırıntı köşeleri gitti')}
/* Taubin */
{const s=uvSphere(10,64,48),P=Float32Array.from(s.P);let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647-.5;
 const noisy=new Float32Array(P.length);for(let i=0;i<P.length;i++)noisy[i]=P[i];
 const topo=A.buildTopo(P,s.I,20);for(let w=0;w<topo.W;w++){const dx=rnd()*.8,dy=rnd()*.8,dz=rnd()*.8;for(let j=topo.memStart[w];j<topo.memStart[w+1];j++){const v=topo.mem[j]*3;noisy[v]+=dx;noisy[v+1]+=dy;noisy[v+2]+=dz}}
 const rough=a=>{let e=0;for(let i=0;i<a.length;i+=3)e+=Math.abs(Math.hypot(a[i],a[i+1],a[i+2])-10);return e/(a.length/3)};
 const r0=rough(noisy),v0=A.triMetrics(noisy,s.I).V;A.taubin(noisy,topo,12);const r1=rough(noisy),v1=A.triMetrics(noisy,s.I).V;
 ok(r1<r0*.4,'Taubin pürüzü azalttı '+r0.toFixed(3)+'→'+r1.toFixed(3));ok(Math.abs(v1-4/3*Math.PI*1000)/(4/3*Math.PI*1000)<.04,'Taubin hacmi korudu '+v1.toFixed(0))}
/* kesit */
{const b=box(0,0,0,2,2,2);let L=0;const sg=A.sliceSegments(b.P,b.I,2,1);for(let i=0;i<sg.length;i+=6)L+=Math.hypot(sg[i+3]-sg[i],sg[i+4]-sg[i+1],sg[i+5]-sg[i+2]);ok(near(L,8,1e-6),'küp kesit çevresi '+L);
 const r=A.cutMesh(b.P,null,b.I,0,.5),va=A.triMetrics(r.A.P,r.A.I),vb=A.triMetrics(r.B.P,r.B.I);
 ok(near(va.V,2,1e-4)&&near(vb.V,6,1e-4)&&va.sV>0&&vb.sV>0&&r.loops===1,'küp kes: hacimler '+va.V.toFixed(3)+' + '+vb.V.toFixed(3));
 const s=uvSphere(10,64,48),rs=A.cutMesh(s.P,null,s.I,2,2.5),a2=A.triMetrics(rs.A.P,rs.A.I),b2=A.triMetrics(rs.B.P,rs.B.I),tot=A.triMetrics(s.P,s.I).V;
 ok(near(a2.V+b2.V,tot,.002)&&a2.sV>0&&b2.sV>0,'küre kes: toplam korundu '+(a2.V+b2.V).toFixed(1)+'/'+tot.toFixed(1));
 const two=cat(box(0,0,0,2,2,2),box(0,5,0,2,7,2)),r2=A.cutMesh(two.P,null,two.I,2,1);
 ok(r2.loops===2&&near(A.triMetrics(r2.A.P,r2.A.I).V,8,1e-4)&&near(A.triMetrics(r2.B.P,r2.B.I).V,8,1e-4),'iki gövde, iki halka, hacimler');
 /* köşeler tam düzlemde olan ızgaralı kutu */
 function gridBox(nx,ny,nz,sx,sy,sz){const P=[],I=[],id=(i,j,k)=>(i*(ny+1)+j)*(nz+1)+k;for(let i=0;i<=nx;i++)for(let j=0;j<=ny;j++)for(let k=0;k<=nz;k++)P.push(i/nx*sx,j/ny*sy,k/nz*sz);
  /* sadece yüzey üçgenleri */
  const quad=(a,b,c,d)=>I.push(a,b,c,a,c,d);
  for(let j=0;j<ny;j++)for(let k=0;k<nz;k++){quad(id(0,j,k),id(0,j,k+1),id(0,j+1,k+1),id(0,j+1,k));quad(id(nx,j,k),id(nx,j+1,k),id(nx,j+1,k+1),id(nx,j,k+1))}
  for(let i=0;i<nx;i++)for(let k=0;k<nz;k++){quad(id(i,0,k),id(i+1,0,k),id(i+1,0,k+1),id(i,0,k+1));quad(id(i,ny,k),id(i,ny,k+1),id(i+1,ny,k+1),id(i+1,ny,k))}
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){quad(id(i,j,0),id(i,j+1,0),id(i+1,j+1,0),id(i+1,j,0));quad(id(i,j,nz),id(i+1,j,nz),id(i+1,j+1,nz),id(i,j+1,nz))}
  return{P:Float32Array.from(P),I:Uint32Array.from(I)}}
 const gb=gridBox(6,4,8,3,2,4);let vg=A.triMetrics(gb.P,gb.I);ok(near(vg.V,24,1e-9)&&vg.sV>0,'ızgara kutu hacmi 24');
 for(const [ax,v] of [[2,2],[0,1.5],[1,1]]){const rg=A.cutMesh(gb.P,null,gb.I,ax,v),a1=A.triMetrics(rg.A.P,rg.A.I),b1=A.triMetrics(rg.B.P,rg.B.I);
  ok(near(a1.V+b1.V,24,1e-6)&&a1.sV>0&&b1.sV>0&&rg.loops===1,'köşeler düzlem üstünde kes ax='+ax+': '+a1.V.toFixed(4)+' + '+b1.V.toFixed(4))}
 const col=new Float32Array(b.P.length).fill(.5),rc=A.cutMesh(b.P,col,b.I,1,1);ok(rc.A.C.length===rc.A.P.length,'renk dizisi köşelerle uyumlu');
 const w=A.weld(r.A.P,null,r.A.I,1e-4);ok(w.P.length/3<r.A.P.length/3&&near(A.triMetrics(w.P,w.I).V,2,1e-4),'kaynak sonrası hacim aynı, köşe '+r.A.P.length/3+'→'+w.P.length/3);
 const cl=A.centerLine(b.P,b.I,0,4);ok(cl.length===4&&cl.every(p=>near(p[1],1,1e-6)&&near(p[2],1,1e-6)),'orta hat küpte eksen üstünde')}
/* çokgen */
{const Lp=[[0,0],[2,0],[2,1],[1,1],[1,2],[0,2]];ok(near(A.polyArea(Lp),3,1e-9),'L alanı 3');
 const t=A.earClip(Lp);let ar=0;for(let i=0;i<t.length;i+=3)ar+=A.polyArea([Lp[t[i]],Lp[t[i+1]],Lp[t[i+2]]]);ok(t.length===12&&near(ar,3,1e-9),'kulak kırpma L: üçgen alanı '+ar);
 const plane={u:[1,0,0],v:[0,0,1],n:[0,-1,0],o:[0,0,0]},e=A.extrudeLoop(Lp,plane,0,2),m=A.triMetrics(e.P,e.I);
 ok(near(m.V,6,1e-6)&&m.sV>0,'extrude L: hacim '+m.V);
 const cw=Lp.slice().reverse(),e2=A.extrudeLoop(cw,plane,0,2);ok(near(A.triMetrics(e2.P,e2.I).sV,6,1e-6),'saat yönü çokgen de düzgün');
 const circ=[];for(let i=0;i<64;i++)circ.push([Math.cos(i/64*6.2832)*5,Math.sin(i/64*6.2832)*5]);const ec=A.extrudeLoop(circ,plane,-1,1);ok(near(A.triMetrics(ec.P,ec.I).V,2*0.5*64*25*Math.sin(2*Math.PI/64),1e-4),'daire extrude hacmi');
 const rv=A.revolveProfile([[0,0],[1,0],[1,2],[0,2]],96),mv=A.triMetrics(rv.P,rv.I);ok(near(mv.V,2*Math.PI,.002)&&mv.sV>0,'revolve silindir hacmi '+mv.V.toFixed(3));
 const ring=A.revolveProfile([[1,0],[2,0],[2,3],[1,3]],96),mr=A.triMetrics(ring.P,ring.I);ok(near(mr.V,Math.PI*3*3,.002),'revolve boru hacmi '+mr.V.toFixed(3));
 const cone=A.revolveProfile([[0,0],[2,0],[0,3]],96);ok(near(A.triMetrics(cone.P,cone.I).V,Math.PI*4*3/3,.003),'revolve koni hacmi')}
/* fotoğraftan ana hat */
{const w=120,h=100,rgba=new Uint8ClampedArray(w*h*4);for(let i=0;i<w*h;i++){rgba[4*i]=rgba[4*i+1]=rgba[4*i+2]=240;rgba[4*i+3]=255}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(Math.hypot(x-60,y-50)<30){const i=y*w+x;rgba[4*i]=rgba[4*i+1]=rgba[4*i+2]=20}
 /* içinde açık renk "delik" */ for(let y=45;y<55;y++)for(let x=55;x<65;x++){const i=y*w+x;rgba[4*i]=rgba[4*i+1]=rgba[4*i+2]=250}
 const m=A.maskFromImage(rgba,w,h,60),cm=A.cleanMask(m,w,h),pts=A.traceContour(cm,w,h),s=A.rdp(pts,1.2);
 const ar=Math.abs(A.polyArea(pts));ok(near(ar,Math.PI*900,.06),'daire ana hat alanı '+ar.toFixed(0));ok(s.length<60&&s.length>12,'RDP nokta '+pts.length+'→'+s.length);
 ok(cm[50*w+60]===1,'delik dolduruldu');
 const a4=new Uint8ClampedArray(w*h*4).fill(255);for(let y=20;y<60;y++)for(let x=30;x<90;x++)a4[4*(y*w+x)+3]=200;a4[3]=0;
 const m2=A.maskFromImage(a4,w,h,60);ok(m2[30*w+50]===1&&m2[0]===0&&m2[100]===0||m2[100]===1,'alfa maskesi');
 const L=new Uint8Array(w*h);for(let y=10;y<80;y++)for(let x=10;x<30;x++)L[y*w+x]=1;for(let y=60;y<80;y++)for(let x=10;x<90;x++)L[y*w+x]=1;
 const lp=A.rdp(A.traceContour(A.cleanMask(L,w,h),w,h),1);ok(lp.length>=6&&lp.length<=8,'L ana hat köşe sayısı '+lp.length)}
/* dışa aktarma */
{const b=box(0,0,0,1,2,3),st=A.stlBinary(b.P,b.I);const dv=new DataView(st.buffer);ok(st.length===84+50*12&&dv.getUint32(80,true)===12,'STL boyutu');
 const o=A.objText(b.P,b.I,'x');ok(o.split('\n').filter(l=>l[0]==='v').length===8&&o.split('\n').filter(l=>l[0]==='f').length===12,'OBJ satırları');
 const u=Uint8Array.from([0,1,2,250,255]);ok(JSON.stringify(Array.from(A.unb64(A.b64(u))))==='[0,1,2,250,255]','base64 gidiş-dönüş')}
/* uçuş */
{const h=A.hoverCalc({mass:1000,rotors:4,diam:2,rho:1.225,fm:.7,eta:.85,battKWh:100,maxThrust:20000,powerW:600000});
 const Aa=4*Math.PI,T=1000*9.80665,P=Math.pow(T,1.5)/Math.sqrt(2*1.225*Aa);
 ok(near(h.idealW,P,1e-9)&&near(h.elecW,P/(.7*.85),1e-9),'asılı kalma gücü '+(h.elecW/1000).toFixed(1)+' kW');
 const back=A.hoverCalc({mass:h.maxMass,rotors:4,diam:2,rho:1.225,fm:.7,eta:.85});ok(near(back.elecW,600000,1e-6),'azami kütle tutarlı '+h.maxMass.toFixed(0)+' kg');
 ok(near(h.hoverMin,100000/h.elecW*60,1e-9)&&near(h.twr,2.0394,1e-3),'süre ve itki/ağırlık');
 const wg=A.wingCalc({mass:1000,rho:1.225,area:10,clMax:1.6,vCruise:60,cd0:.03});ok(near(wg.vStall,Math.sqrt(2*9806.65/(1.225*10*1.6)),1e-9)&&wg.clReq<1.6,'kanat: stall '+wg.vStall.toFixed(1)+' m/s')}
/* el hareketi */
{const hand=(d,ox=0,oy=0)=>{const l=Array.from({length:21},()=>({x:.5+ox,y:.5+oy,z:0}));l[0]={x:.5+ox,y:.8+oy,z:0};l[9]={x:.5+ox,y:.6+oy,z:0};l[4]={x:.5+ox-d/2,y:.5+oy,z:0};l[8]={x:.5+ox+d/2,y:.5+oy,z:0};return l};
 ok(near(A.pinchRatio(hand(.1)),.5,1e-6),'kıstırma oranı');
 const g=new A.Gestures();let e=g.update([hand(.2)]);ok(e.length===1&&e[0].type==='cursor','açık el imleç');
 e=g.update([hand(.04)]);ok(e[0].type==='grabStart','kıstırınca tut');
 e=g.update([hand(.04,.05,0)]);ok(e[0].type==='move'&&near(e[0].dx,.05,1e-6),'sürükle dx');
 e=g.update([hand(.08,.05,0)]);ok(e[0].type==='move','histerezis: .08/.2=0.4 hâlâ tutuyor');
 e=g.update([hand(.2,.05,0)]);ok(e[0].type==='grabEnd','bırak');
 const g2=new A.Gestures();g2.update([hand(.04,-.2,0),hand(.04,.2,0)]);e=g2.update([hand(.04,-.3,0),hand(.04,.3,0)]);
 ok(e.some(x=>x.type==='zoom'&&near(x.factor,1.5,1e-6)),'iki el açılınca yakınlaş ×1.5')}

/* çoklu görünüm */
{const mk=(w,h,f)=>{const m=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++)m[y*w+x]=f(x+.5,y+.5)?1:0;return m};
 // yüzey ağı: küre
 const n=40,F=new Float32Array(n*n*n);for(let k=0;k<n;k++)for(let j=0;j<n;j++)for(let i=0;i<n;i++){const d=Math.hypot(i-19.5,j-19.5,k-19.5);F[(k*n+j)*n+i]=Math.max(0,Math.min(1,(14-d)+.5))}
 let sn=A.surfaceNets(F,n,n,n,.5,0,0,0,1);const mm=A.triMetrics(sn.P,sn.I);
 const ed=new Map();for(let i=0;i<sn.I.length;i+=3)for(let e=0;e<3;e++){const a=sn.I[i+e],b=sn.I[i+(e+1)%3],key=a<b?a+','+b:b+','+a;ed.set(key,(ed.get(key)||0)+1)}
 let manifold=true;for(const c of ed.values())if(c!==2)manifold=false;
 ok(manifold&&mm.V>0,'yüzey ağı kapalı (manifold) küre');ok(near(mm.V,4/3*Math.PI*14**3,.04),'yüzey ağı küre hacmi '+mm.V.toFixed(0)+' / '+(4/3*Math.PI*14**3).toFixed(0));
 ok(mm.sV>0,'yüzey ağı dışa bakan yüzler');
 // kırpma, ayna, boyut
 const cr=A.cropMask(mk(50,40,(x,y)=>x>10&&x<30&&y>5&&y<25),50,40);ok(cr&&cr.w===19&&cr.h===19||cr.w===20,'maske kırpma '+cr.w+'x'+cr.h);
 const dm=A.mvDims({front:{w:200,h:100},side:{w:400,h:100}},1000);ok(near(dm.D,1000,1e-6)&&near(dm.W,500,1e-6)&&near(dm.H,250,1e-6),'ölçüler: ön+yan');
 const dm2=A.mvDims({front:{w:100,h:100}},1000,.5);ok(near(dm2.D,500,1e-6)&&near(dm2.W,1000,1e-6),'ölçüler: yalnız ön, derinlik oranı');
 // üç görünüm: elips benzeri gövde → kutu kesişimi (ön: dikdörtgen, yan: dikdörtgen, üst: dikdörtgen) = kutu
 const R=(w,h)=>({m:mk(w,h,()=>1),w,h});
 let r=A.mvMesh({front:R(100,50),side:R(200,50),top:R(100,200)},{len:400,res:64,smooth:0});
 const bb=[1e9,1e9,1e9,-1e9,-1e9,-1e9];for(let i=0;i<r.P.length;i+=3)for(let a=0;a<3;a++){bb[a]=Math.min(bb[a],r.P[i+a]);bb[a+3]=Math.max(bb[a+3],r.P[i+a])}
 const sz=[bb[3]-bb[0],bb[4]-bb[1],bb[5]-bb[2]];
 ok(near(sz[0],200,.06)&&near(sz[1],400,.06)&&near(sz[2],100,.08),'üç görünüm kutu ölçüleri '+sz.map(v=>v.toFixed(0)).join('×')+' (200×400×100)');
 ok(bb[2]>-6&&bb[2]<6,'taban Z≈0 ('+bb[2].toFixed(1)+')');
 ok(near((bb[0]+bb[3])/2,0,1)&&near((bb[1]+bb[4])/2,0,1),'X–Y orijinde ortalı');
 // silindir: ön ve yan dikdörtgen, üst daire → silindir hacmi π r² h
 const circ=(w)=>({m:mk(w,w,(x,y)=>Math.hypot(x-w/2,y-w/2)<w/2),w,h:w});
 r=A.mvMesh({front:R(100,100),side:R(100,100),top:circ(100)},{len:100,res:64,smooth:0});const vol=A.triMetrics(r.P,r.I).V;
 ok(near(vol,Math.PI*50*50*100,.05),'üç görünümden silindir hacmi '+vol.toFixed(0)+' / '+(Math.PI*2500*100).toFixed(0));
 // tek görünüm: daire siluet → şişirilmiş küre benzeri, derinlik W*dr
 r=A.mvMesh({front:circ(100)},{len:100,res:64,dr:1,smooth:0});const vs=A.triMetrics(r.P,r.I).V;
 ok(near(vs,Math.PI/6*100**3*(1),.2),'tek görünüm şişirme ≈ küre hacmi '+vs.toFixed(0)+' / '+(Math.PI/6*1e6).toFixed(0));
 const ys=[];for(let i=1;i<r.P.length;i+=3)ys.push(r.P[i]);ok(Math.max(...ys)-Math.min(...ys)>85,'tek görünüm derinliği oluştu');
 // sıfır giriş
 ok(A.mvMesh({},{})===null,'görünüm yoksa null');
 // taubin ile hacim korunur
 r=A.mvMesh({front:circ(100),side:circ(100),top:circ(100)},{len:100,res:64,smooth:10});const v3=A.triMetrics(r.P,r.I).V;ok(near(v3,Math.PI/6*1e6,.12),'üç daire kesişimi (Steinmetz benzeri) hacim makul '+v3.toFixed(0));
 // yan görünüm yön çevirme: yamuk yan görünüm, flip ters yöne yığılır
 const tri=(w,h)=>({m:mk(w,h,(x,y)=>y>h*(1-x/w)),w,h}); // sağ-altta dolu
 const a1=A.mvMesh({front:R(100,100),side:tri(100,100),top:R(100,100)},{len:100,res:48,smooth:0}),a2=A.mvMesh({front:R(100,100),side:tri(100,100),top:R(100,100)},{len:100,res:48,smooth:0,flip:{side:true}});
 const cy=r=>{let s=0,n=0;for(let i=1;i<r.P.length;i+=3){s+=r.P[i];n++}return s/n};
 ok(cy(a1)>5&&cy(a2)<-5,'yan görünüm çevir seçeneği '+cy(a1).toFixed(1)+' / '+cy(a2).toFixed(1));
}

console.log(fails?('HATA '+fails):'TÜMÜ GEÇTİ');process.exit(fails?1:0)
