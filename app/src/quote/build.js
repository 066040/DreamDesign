// Fiyat al sayfasını tek dosya olarak derler: node app/src/quote/build.js [çıktı]
// Varsayılan çıktı docs/bastir.html. Bir siteye iframe ile gömülebilir (sipariş postMessage ile üst sayfaya gider).
const fs=require('fs'),path=require('path');
const d=__dirname,rd=f=>fs.readFileSync(path.join(d,f),'utf8');
const cdn='https://cdn.jsdelivr.net/npm/three@0.128.0/';
const libs=['build/three.min.js','examples/js/controls/OrbitControls.js','examples/js/loaders/STLLoader.js','examples/js/loaders/OBJLoader.js'];
const out='<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<meta name="description" content="3D modelini yükle, boyutunu ve malzemesini seç, baskı fiyatını anında gör.">'+
 rd('head.html')+libs.map(l=>`<script src="${cdn}${l}"></script>\n`).join('')+'<script>\n'+rd('price.js')+'\n'+rd('app.js')+'\n</script>\n</body></html>\n';
const dest=process.argv[2]?path.resolve(process.argv[2]):path.join(d,'..','..','..','docs','bastir.html');
fs.writeFileSync(dest,out);console.log('wrote',dest,out.length,'bytes');
