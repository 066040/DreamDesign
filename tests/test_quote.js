/* Fiyat al sayfasının hesapları: hacim, alan, kapalılık, sığma, fiyat */
const path=require('path'),THREE=require('three');
const Q=require(path.join(__dirname,'..','app','src','quote','price.js'));
let fails=0;const ok=(k,m)=>{if(!k){fails++;console.log('FAIL',m)}else console.log('ok  ',m)};
const near=(a,b,t)=>Math.abs(a-b)<=t*Math.max(1,Math.abs(b));
const tri=g=>Float32Array.from(g.toNonIndexed().attributes.position.array);

/* Kutu 20×30×10: hacim 6000, alan 2200 */
{const s=Q.meshStats(tri(new THREE.BoxGeometry(20,30,10)));
 ok(near(s.vol,6000,1e-6),'kutu hacmi '+s.vol);ok(near(s.area,2200,1e-6),'kutu alanı '+s.area);
 ok(near(s.size[0],20,1e-9)&&near(s.size[1],30,1e-9)&&near(s.size[2],10,1e-9),'kutu ölçüleri');
 ok(s.tris===12,'kutu üçgen sayısı');}
/* Torus: V=2π²Rr², A=4π²Rr (ince ağda %1 içinde) */
{const R=30,r=8,s=Q.meshStats(tri(new THREE.TorusGeometry(R,r,64,256)));
 ok(near(s.vol,2*Math.PI**2*R*r*r,.01),'torus hacmi '+s.vol.toFixed(0));ok(near(s.area,4*Math.PI**2*R*r,.01),'torus alanı '+s.area.toFixed(0));}
/* Konum bağımsız: modeli kaydırmak hacmi değiştirmez */
{const g=new THREE.BoxGeometry(10,10,10);g.translate(500,-300,40);ok(near(Q.meshStats(tri(g)).vol,1000,1e-6),'kaydırılmış kutu hacmi');}
/* Kapalılık */
{ok(Q.meshCheck(tri(new THREE.BoxGeometry(10,10,10))).closed,'kutu kapalı (köşe kopyaları birleştirilir)');
 ok(Q.meshCheck(tri(new THREE.TorusKnotGeometry(28,9,120,24))).closed,'düğümlü halka kapalı');
 const p=tri(new THREE.BoxGeometry(10,10,10)),open=p.slice(0,p.length-9),c=Q.meshCheck(open);
 ok(!c.closed&&c.open===3,'bir üçgeni eksik kutu açık: '+c.open+' açık kenar');
 ok(!Q.meshCheck(tri(new THREE.PlaneGeometry(10,10))).closed,'düz yüzey kapalı değil');}
/* Birim tahmini */
ok(Q.guessUnit([3,2,1])==='small'&&Q.guessUnit([40,20,10])==='ok'&&Q.guessUnit([5000,1,1])==='large','birim tahmini');
/* Sığma: [genişlik, yükseklik, derinlik] */
{const f1=Q.fitInfo([100,100,100]);ok(f1.fits&&near(f1.maxScale,2.5,1e-9),'100 mm küp sığar, en fazla ×2.5');
 const f2=Q.fitInfo([500,50,100]);ok(!f2.fits&&near(f2.maxScale,250/500,1e-9),'500 mm uzun parça sığmaz, ×0.5 sığar');
 ok(Q.fitInfo([250,10,250]).fits,'tam tabla boyu sığar');ok(!Q.fitInfo([100,300,100]).fits,'çok uzun boy sığmaz');}
/* Fiyat */
{const C=Q.QUOTE_CFG,box=Q.meshStats(tri(new THREE.BoxGeometry(40,40,40)));
 const a=Q.estimate(box,{scale:1,material:'PLA',infill:'normal',qty:1});
 /* elle: V=64000, A=9600, kabuk=min(64000,9600*1.6=15360)=15360, dolu=15360+.2*(48640)=25088 mm³ → 31.109 g */
 ok(near(a.grams,25088/1000*1.24,1e-9),'PLA gram hesabı '+a.grams.toFixed(2));
 const raw=C.setupFee+a.grams*2.5+(C.warmupH+a.grams/C.gramsPerHour)*C.hourRate;
 ok(a.total===Math.max(C.minPrice,Math.ceil(raw/5)*5)&&a.total%5===0,'fiyat formülü ve 5 TL yuvarlama: '+a.total);
 const asa=Q.estimate(box,{scale:1,material:'ASA',infill:'normal',qty:1});ok(asa.grams<a.grams&&asa.total>=a.total,'ASA daha hafif ama gram fiyatı yüksek');
 const half=Q.estimate(box,{scale:.5,material:'PLA',infill:'normal',qty:1});ok(half.vol===a.vol/8,'yarı boyut → hacim 1/8');
 ok(Q.estimate(box,{scale:1,material:'PLA',infill:'light',qty:1}).grams<a.grams&&Q.estimate(box,{scale:1,material:'PLA',infill:'strong',qty:1}).grams>a.grams,'sağlamlık gramı değiştirir');
 const big=Q.estimate(box,{scale:3,material:'PLA',infill:'normal',qty:1}),two=Q.estimate(box,{scale:3,material:'PLA',infill:'normal',qty:2});
 ok(two.total>big.total&&two.total<2*big.total,'2 adet: hazırlık bir kez alınır');
 const tiny=Q.estimate(box,{scale:.1,material:'PLA',infill:'normal',qty:1});ok(tiny.total===C.minPrice&&tiny.minApplied,'çok küçük parça en düşük fiyattan');
 /* İnce kabuk: dolu hacmi aşmaz */
 const thin=Q.meshStats(tri(new THREE.BoxGeometry(100,1,100))),e=Q.estimate(thin,{scale:1,material:'PLA',infill:'light',qty:1});
 ok(near(e.grams,10000/1000*1.24,1e-9),'1 mm plaka tamamen dolu sayılır');}
/* Biçim */
ok(Q.fmtNum(1234.5,1)==='1.234,5','Türkçe sayı: '+Q.fmtNum(1234.5,1));
ok(Q.fmtHours(.3)==='20 dakika'&&Q.fmtHours(2.5)==='2 saat 30 dakika'&&Q.fmtHours(1.99)==='2 saat'&&Q.fmtHours(.98)==='1 saat','süre yazımı: '+[Q.fmtHours(.3),Q.fmtHours(2.5),Q.fmtHours(1.99)].join(' / '));
console.log(fails?fails+' test başarısız':'tüm fiyat testleri geçti');process.exit(fails?1:0);
