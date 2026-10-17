// Usage: node build.js [out.html] [--fragment]
// Default output: ../../docs/index.html (full page, served by GitHub Pages).
// --fragment: omit <!doctype>/<head> wrapper (used for embedding).
const fs=require('fs'),path=require('path');
const d=__dirname,rd=f=>fs.readFileSync(path.join(d,f),'utf8');
const args=process.argv.slice(2),frag=args.includes('--fragment'),outArg=args.find(a=>!a.startsWith('--'));
const cdn='https://cdn.jsdelivr.net/npm/three@0.128.0/';
const libs=['build/three.min.js','examples/js/controls/TrackballControls.js','examples/js/controls/TransformControls.js','examples/js/loaders/GLTFLoader.js','examples/js/loaders/OBJLoader.js','examples/js/loaders/STLLoader.js','examples/js/exporters/GLTFExporter.js'];
const files=['app1.js','app2.js','app3.js','app4.js','app5.js','app6.js','app7.js'];
let out=rd('head.html')+libs.map(l=>`<script src="${cdn}${l}"></script>\n`).join('')+'<script>\n'+rd('pure.js')+'\n'+files.map(rd).join('\n')+'\n</script>\n';
if(!frag)out='<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="DreamDesign: photo to 3D, edit, and design anything.">'+out+'</html>\n';
const dest=outArg?path.resolve(outArg):path.join(d,'..','..','docs','index.html');
fs.writeFileSync(dest,out);console.log('wrote',dest,out.length,'bytes');
