/* ================= 3D baskı fiyat hesabı (saf, DOM'suz) =================
   Tüm ölçüler mm, hacim mm³, kütle g, para TL.
   FİYATLARI BURADAN DEĞİŞTİR: QUOTE_CFG kendi maliyetine göre ayarlanmalı. */
const QUOTE_CFG={
 brand:'3D Dream',
 currency:'TL',
 whatsapp:'905537400385',    // siparişlerin geleceği numara, ülke koduyla: '905xxxxxxxxx'. Boşsa sipariş gönderilemez.
 ordersOpen:false,           // SİPARİŞ ANAHTARI: yazıcı gelip fiyatlar netleşince true yap. false iken fiyat görünür ama sipariş alınmaz.
 bed:[256,256,256],          // yazıcının basabildiği en büyük kutu (Bambu Lab P1S)
 bedMargin:6,                // kenarlardan bırakılan pay
 wallMm:1.6,                 // duvar + alt/üst kabuğun ortalama kalınlığı
 gramsPerHour:18,            // ortalama baskı hızı (gram/saat), kabaca
 warmupH:.25,                // ısınma, kalibrasyon
 setupFee:40,                // sipariş başına hazırlık (dilimleme, tabla, paketleme)
 hourRate:12,                // makine saati (elektrik + yıpranma)
 minPrice:120,               // en düşük sipariş tutarı
 roundTo:5,                  // fiyatı yukarı yuvarla (5 TL)
 overhang:45,                // dik duvardan bu açıdan fazla sarkan yüzey destek ister (derece)
 supportFill:.15,            // destek yapısının doluluk oranı (destek hacmi tahmininin ne kadarı malzeme)
 materials:{
  PLA :{name:'PLA', density:1.24,perGram:2.5,note:'Ev içi kullanım. En ekonomik, renk seçeneği en çok olan malzeme.'},
  PETG:{name:'PETG',density:1.27,perGram:3.0,note:'Daha dayanıklı ve esnek. Suya ve darbeye karşı iyidir.'},
  ASA :{name:'ASA', density:1.07,perGram:4.0,note:'Güneşe ve sıcağa dayanıklı. Araç içi ve dış mekân parçaları için.'}
 },
 infills:[
  {key:'light', name:'Hafif',      value:.10,note:'Süs eşyası, figür, kutu. En ucuzu.'},
  {key:'normal',name:'Normal',     value:.20,note:'Günlük kullanım için çoğu zaman yeterli.'},
  {key:'strong',name:'Çok sağlam', value:.45,note:'Yük taşıyan, vidalanan, sık kullanılan parçalar.'}
 ],
 colors:[
  {name:'Beyaz',hex:'#f2f2ee'},{name:'Siyah',hex:'#26282c'},{name:'Gri',hex:'#8d939b'},
  {name:'Kırmızı',hex:'#c8352e'},{name:'Mavi',hex:'#2a63c9'},{name:'Yeşil',hex:'#2f9a5a'},
  {name:'Sarı',hex:'#e8b923'},{name:'Turuncu',hex:'#e46d24'}
 ]
};

/* İndekssiz üçgen dizisi (her 9 sayı bir üçgen) için hacim, yüzey alanı ve sınır kutusu.
   Hacim işaretli dört yüzlü toplamı: kapalı yüzeyde kesin sonuç verir. */
function meshStats(pos){
 let V=0,A=0;const mn=[Infinity,Infinity,Infinity],mx=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i+8<pos.length;i+=9){
  const ax=pos[i],ay=pos[i+1],az=pos[i+2],bx=pos[i+3],by=pos[i+4],bz=pos[i+5],cx=pos[i+6],cy=pos[i+7],cz=pos[i+8];
  V+=(ax*(by*cz-bz*cy)+ay*(bz*cx-bx*cz)+az*(bx*cy-by*cx))/6;
  const ex=bx-ax,ey=by-ay,ez=bz-az,fx=cx-ax,fy=cy-ay,fz=cz-az;
  const nx=ey*fz-ez*fy,ny=ez*fx-ex*fz,nz=ex*fy-ey*fx;A+=.5*Math.sqrt(nx*nx+ny*ny+nz*nz);
 }
 for(let i=0;i+2<pos.length;i+=3)for(let k=0;k<3;k++){const v=pos[i+k];if(v<mn[k])mn[k]=v;if(v>mx[k])mx[k]=v}
 const size=mn[0]===Infinity?[0,0,0]:[mx[0]-mn[0],mx[1]-mn[1],mx[2]-mn[2]];
 return{vol:Math.abs(V),signedVol:V,area:A,min:mn,max:mx,size,tris:Math.floor(pos.length/9)};
}

/* Yüzey kapalı mı? Aynı konumdaki köşeler birleştirilir; her kenar tam 2 üçgende olmalı.
   open: tek üçgende kalan kenar (delik), bad: 2'den fazla üçgende kalan kenar. */
function meshCheck(pos){
 let mn=Infinity,mx=-Infinity;for(let i=0;i<pos.length;i++){const v=pos[i];if(v<mn)mn=v;if(v>mx)mx=v}
 const q=1/Math.max((mx-mn)*1e-6,1e-9),ids=new Map(),edges=new Map();let n=0;
 const id=i=>{const k=Math.round(pos[i]*q)+','+Math.round(pos[i+1]*q)+','+Math.round(pos[i+2]*q);let v=ids.get(k);if(v===undefined){v=n++;ids.set(k,v)}return v};
 let degenerate=0;
 for(let i=0;i+8<pos.length;i+=9){const a=id(i),b=id(i+3),c=id(i+6);
  if(a===b||b===c||a===c){degenerate++;continue}
  for(const [u,v] of [[a,b],[b,c],[c,a]]){const k=u<v?u*4294967296+v:v*4294967296+u;edges.set(k,(edges.get(k)||0)+1)}}
 let open=0,bad=0;for(const c of edges.values()){if(c===1)open++;else if(c>2)bad++}
 return{open,bad,degenerate,closed:open===0&&bad===0,edges:edges.size};
}

/* Dosyada birim yok (STL). Ölçüler çok küçük ya da çok büyükse uyarı için tahmin. */
function guessUnit(size){const m=Math.max(size[0],size[1],size[2]);
 if(m>0&&m<12)return'small';   // büyük ihtimal cm ya da inç
 if(m>2000)return'large';
 return'ok';}

/* Model yazıcıya sığıyor mu, sığmıyorsa hangi oranda küçültülmeli (yatay iki eksen döndürülebilir) */
function fitInfo(size,cfg){cfg=cfg||QUOTE_CFG;const m=cfg.bedMargin,b=cfg.bed.map(v=>v-m);
 const [w,h,d]=size; // w: genişlik, h: yükseklik, d: derinlik
 const flat=[Math.max(w,d),Math.min(w,d)],bedFlat=[Math.max(b[0],b[2]),Math.min(b[0],b[2])];
 const fits=flat[0]<=bedFlat[0]+1e-9&&flat[1]<=bedFlat[1]+1e-9&&h<=b[1]+1e-9;
 const scale=Math.min(bedFlat[0]/Math.max(flat[0],1e-9),bedFlat[1]/Math.max(flat[1],1e-9),b[1]/Math.max(h,1e-9));
 return{fits,maxScale:scale};}

/* ================= Baskıya hazırlık: sarkma, destek, taban =================
   P: köşeler, I: üçgen indeksleri (yoksa P sıralı üçgendir). down: aşağı bakan birim yön
   (DreamDesign Z yukarı → [0,0,-1]; fiyat sayfası Y yukarı → [0,-1,0]).
   ang: dik duvardan sarkma eşiği (derece). flags verilirse destek isteyen üçgenler 1 olur.
   supV: altındaki boşluk sütunlarının hacmi (destek için kaba ama tutarlı ölçü, mm³). */
function printAnalyze(P,I,down,ang,flags){down=down||[0,0,-1];const s=Math.sin((ang==null?45:ang)*Math.PI/180),[dx,dy,dz]=down;
 const T=I?I.length/3:Math.floor(P.length/9),vi=I?(t,k)=>3*I[3*t+k]:(t,k)=>9*t+3*k,h=v=>-(dx*P[v]+dy*P[v+1]+dz*P[v+2]);
 let mn=Infinity,mx=-Infinity;for(let i=0;i+2<P.length;i+=3){const z=h(i);if(z<mn)mn=z;if(z>mx)mx=z}
 const tol=Math.max(.2,(mx-mn)*1e-4);let ovA=0,supV=0,baseA=0,A=0;
 for(let t=0;t<T;t++){const a=vi(t,0),b=vi(t,1),c=vi(t,2);
  const ex=P[b]-P[a],ey=P[b+1]-P[a+1],ez=P[b+2]-P[a+2],fx=P[c]-P[a],fy=P[c+1]-P[a+1],fz=P[c+2]-P[a+2];
  const nx=ey*fz-ez*fy,ny=ez*fx-ex*fz,nz=ex*fy-ey*fx,L=Math.sqrt(nx*nx+ny*ny+nz*nz);if(L<1e-12)continue;
  const area=L/2,dn=(dx*nx+dy*ny+dz*nz)/L,za=h(a),zb=h(b),zc=h(c);A+=area;
  if(Math.max(za,zb,zc)<=mn+tol){if(dn>.99)baseA+=area;continue}  // tablaya değen yüz
  if(dn>s){ovA+=area;supV+=area*dn*((za+zb+zc)/3-mn);if(flags)flags[t]=1}}
 return{ovA,supV,baseA,A,height:mx-mn,needs:ovA>A*1e-3}}

/* En az destekle basılacak yönü bul. Adaylar: 6 eksen ve en büyük düz yüzler (tabana yatırılır).
   Puan: destek hacmi + yükseklik payı − taban alanı payı. Şimdiki yön %3'ten fazla kötü değilse korunur. */
function bestDown(P,I,cur,ang){cur=cur||[0,0,-1];
 const T=I?I.length/3:Math.floor(P.length/9),vi=I?(t,k)=>3*I[3*t+k]:(t,k)=>9*t+3*k,bins=new Map();
 for(let t=0;t<T;t++){const a=vi(t,0),b=vi(t,1),c=vi(t,2);
  const ex=P[b]-P[a],ey=P[b+1]-P[a+1],ez=P[b+2]-P[a+2],fx=P[c]-P[a],fy=P[c+1]-P[a+1],fz=P[c+2]-P[a+2];
  const nx=ey*fz-ez*fy,ny=ez*fx-ex*fz,nz=ex*fy-ey*fx,L=Math.sqrt(nx*nx+ny*ny+nz*nz);if(L<1e-12)continue;
  const k=Math.round(nx/L*40)+','+Math.round(ny/L*40)+','+Math.round(nz/L*40);let e=bins.get(k);if(!e){e={a:0,n:[0,0,0]};bins.set(k,e)}
  e.a+=L/2;e.n[0]+=nx/2;e.n[1]+=ny/2;e.n[2]+=nz/2}
 const cands=[cur.slice(),[0,0,-1],[0,0,1],[1,0,0],[-1,0,0],[0,1,0],[0,-1,0]];
 [...bins.values()].sort((x,y)=>y.a-x.a).slice(0,8).forEach(e=>{const l=Math.hypot(...e.n);if(l>0)cands.push(e.n.map(v=>v/l))});
 const uniq=[];cands.forEach(d=>{const l=Math.hypot(...d)||1,u=d.map(v=>v/l);if(!uniq.some(q=>q[0]*u[0]+q[1]*u[1]+q[2]*u[2]>.9995))uniq.push(u)});
 const score=r=>r.supV+.02*r.A*r.height-.5*r.baseA*Math.sqrt(r.A)*.1;
 const res=uniq.map(d=>{const r=printAnalyze(P,I,d,ang);return{d,r,s:score(r)}});
 const now=res[0];let best=now;res.forEach(x=>{if(x.s<best.s)best=x});
 if(best!==now&&best.s>now.s-Math.abs(now.s)*.03)best=now;
 return{down:best.d,res:best.r,cur:now.r,changed:best!==now}}

/* Fiyat tahmini. stats: ölçek 1'deki meshStats; o: {scale, material, infill, qty, supportVol (ölçek 1, mm³)} */
function estimate(stats,o,cfg){cfg=cfg||QUOTE_CFG;
 const s=o.scale||1,qty=Math.max(1,Math.round(o.qty||1)),mat=cfg.materials[o.material]||cfg.materials.PLA;
 const infill=typeof o.infill==='number'?o.infill:(cfg.infills.find(f=>f.key===o.infill)||cfg.infills[1]).value;
 const vol=stats.vol*s*s*s,area=stats.area*s*s;
 const shell=Math.min(vol,area*cfg.wallMm),solid=shell+infill*(vol-shell);
 const supGrams=(o.supportVol||0)*s*s*s*cfg.supportFill/1000*mat.density;
 const grams=solid/1000*mat.density+supGrams,hours=cfg.warmupH+grams/cfg.gramsPerHour;
 const perPiece=grams*mat.perGram+hours*cfg.hourRate;
 let total=cfg.setupFee+perPiece*qty;const raw=total;
 total=Math.max(cfg.minPrice,Math.ceil(total/cfg.roundTo)*cfg.roundTo);
 return{vol,area,grams,supGrams,hours,qty,total,unit:total/qty,material:mat.name,infill,minApplied:total===cfg.minPrice,raw};
}

/* Biçimleme: Türkçe sayı yazımı */
function fmtNum(v,d){d=d||0;return Number(v).toLocaleString('tr-TR',{minimumFractionDigits:d,maximumFractionDigits:d})}
function fmtHours(h){const m5=Math.round(h*60/5)*5;if(m5<60)return Math.max(5,m5)+' dakika';const H=Math.floor(h),M=Math.round((h-H)*60/5)*5;
 return M===60?(H+1)+' saat':M?H+' saat '+M+' dakika':H+' saat'}

if(typeof module!=='undefined')module.exports={QUOTE_CFG,meshStats,meshCheck,guessUnit,fitInfo,estimate,printAnalyze,bestDown,fmtNum,fmtHours};
