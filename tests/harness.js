const fs=require('fs'),vm=require('vm'),path=require('path');const {JSDOM}=require('jsdom');
module.exports=function(htmlPath){
 const src=fs.readFileSync(htmlPath,'utf8');
 const scripts=[...src.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);const main=scripts[scripts.length-1];
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only',pretendToBeVisual:false,url:'http://localhost:8000/'});
 const w=dom.window,ctx=dom.getInternalVMContext();w.console.warn=()=>{};
 const bodyHtml=src.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<title>[\s\S]*?<\/title>/,'').replace(/<style>[\s\S]*?<\/style>/,'');
 w.document.body.innerHTML=bodyHtml;
 w.requestAnimationFrame=()=>0;w.ResizeObserver=class{observe(){}};
 w.matchMedia=()=>({matches:false,addEventListener(){}});
 w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({measureText:()=>({width:30}),getImageData:(x,y,a,b)=>({data:new Uint8ClampedArray(a*b*4)})},{get:(t,k)=>k in t?t[k]:()=>{},set:()=>true})};
 w.HTMLElement.prototype.setPointerCapture=()=>{};
 const run=(code,name)=>new vm.Script(code,{filename:name}).runInContext(ctx);
 const nm=path.dirname(path.dirname(require.resolve('three/package.json')));
 const three=path.join(nm,'three');
 run(fs.readFileSync(three+'/build/three.js','utf8'),'three.js');
 ['controls/TrackballControls','controls/TransformControls','loaders/GLTFLoader','loaders/OBJLoader','loaders/STLLoader','exporters/GLTFExporter'].forEach(f=>run(fs.readFileSync(three+'/examples/js/'+f+'.js','utf8'),f));
 run(`THREE.WebGLRenderer=class{constructor(){this.domElement=document.createElement('canvas');this.domElement.getBoundingClientRect=()=>({left:0,top:0,width:800,height:600})}
  setPixelRatio(){}setSize(){}setClearColor(){}render(){}};
  THREE.PMREMGenerator=class{fromScene(){return{texture:{}}}dispose(){}}`,'stub');
 w.__errs=[];w.addEventListener('error',e=>w.__errs.push(e.message));
 Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return 800}});Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return 600}});
 run(main,'main.js');
 return{w,run,T:code=>run('(()=>{'+code+'})()','test'),errs:w.__errs};
}
