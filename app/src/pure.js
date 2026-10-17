//<pure>
/* ================= Saf (DOM'suz) matematik ve geometri işlevleri ================= */
class Heap{constructor(){this.d=[];this.v=[]}
 get size(){return this.d.length}
 push(d,v){const D=this.d,V=this.v;let i=D.length;D.push(d);V.push(v);
  while(i>0){const p=(i-1)>>1;if(D[p]<=d)break;D[i]=D[p];V[i]=V[p];i=p}D[i]=d;V[i]=v}
 pop(){const D=this.d,V=this.v,rd=D[0],rv=V[0],ld=D.pop(),lv=V.pop(),n=D.length;
  if(n>0){let i=0;for(;;){let c=2*i+1;if(c>=n)break;if(c+1<n&&D[c+1]<D[c])c++;if(D[c]>=ld)break;D[i]=D[c];V[i]=V[c];i=c}D[i]=ld;V[i]=lv}
  return [rd,rv]}}
/* Kapalı ağ için hacim ve hacim merkezi (işaretli dört yüzlüler). sV: işaretli hacim */
function triMetrics(P,I){let V=0,sx=0,sy=0,sz=0;
 for(let i=0;i<I.length;i+=3){const a=I[i]*3,b=I[i+1]*3,c=I[i+2]*3;
  const ax=P[a],ay=P[a+1],az=P[a+2],bx=P[b],by=P[b+1],bz=P[b+2],qx=P[c],qy=P[c+1],qz=P[c+2];
  const v=(ax*(by*qz-bz*qy)+ay*(bz*qx-bx*qz)+az*(bx*qy-by*qx))/6;
  V+=v;sx+=v*(ax+bx+qx)/4;sy+=v*(ay+by+qy)/4;sz+=v*(az+bz+qz)/4}
 if(Math.abs(V)<1e-12)return{V:0,sV:0,C:[0,0,0]};
 return{V:Math.abs(V),sV:V,C:[sx/V,sy/V,sz/V]}}
/* Yüzey alanı ve alan ağırlıklı merkez; eksen ölçekleri s=[sx,sy,sz] uygulanmış */
function areaStats(P,I,s){let A=0,cx=0,cy=0,cz=0;
 for(let i=0;i<I.length;i+=3){const a=I[i]*3,b=I[i+1]*3,c=I[i+2]*3;
  const ax=P[a]*s[0],ay=P[a+1]*s[1],az=P[a+2]*s[2],bx=P[b]*s[0],by=P[b+1]*s[1],bz=P[b+2]*s[2],qx=P[c]*s[0],qy=P[c+1]*s[1],qz=P[c+2]*s[2];
  const ex=bx-ax,ey=by-ay,ez=bz-az,fx=qx-ax,fy=qy-ay,fz=qz-az;
  const nx=ey*fz-ez*fy,ny=ez*fx-ex*fz,nz=ex*fy-ey*fx,ar=.5*Math.sqrt(nx*nx+ny*ny+nz*nz);
  A+=ar;cx+=ar*(ax+bx+qx)/3;cy+=ar*(ay+by+qy)/3;cz+=ar*(az+bz+qz)/3}
 return A>0?{A,C:[cx/A,cy/A,cz/A]}:{A:0,C:[0,0,0]}}
/* Aynı konumdaki köşeleri birleştirip (wid) yüzey komşuluk grafı kurar */
function buildTopo(P,I,diag){const n=P.length/3,q=1/(Math.max(diag,1e-9)*1e-5),map=new Map(),wid=new Int32Array(n);let W=0;
 for(let i=0;i<n;i++){const k=Math.round(P[3*i]*q)+','+Math.round(P[3*i+1]*q)+','+Math.round(P[3*i+2]*q);let w=map.get(k);if(w===undefined){w=W++;map.set(k,w)}wid[i]=w}
 const memStart=new Int32Array(W+1);for(let i=0;i<n;i++)memStart[wid[i]+1]++;
 for(let w=0;w<W;w++)memStart[w+1]+=memStart[w];
 const mem=new Int32Array(n),fill=memStart.slice(0,W),rep=new Int32Array(W).fill(-1);
 for(let i=0;i<n;i++){const w=wid[i];mem[fill[w]++]=i;if(rep[w]<0)rep[w]=i}
 const deg=new Int32Array(W+1),T=I.length/3;
 for(let t=0;t<T;t++)for(let e=0;e<3;e++){const a=wid[I[3*t+e]],b=wid[I[3*t+(e+1)%3]];if(a!==b){deg[a+1]++;deg[b+1]++}}
 for(let w=0;w<W;w++)deg[w+1]+=deg[w];
 const adjStart=deg.slice(),pos=deg.slice(0,W),adj=new Int32Array(adjStart[W]);
 for(let t=0;t<T;t++)for(let e=0;e<3;e++){const a=wid[I[3*t+e]],b=wid[I[3*t+(e+1)%3]];if(a!==b){adj[pos[a]++]=b;adj[pos[b]++]=a}}
 return{W,wid,memStart,mem,rep,adjStart,adj}}
/* Yüzey boyunca (geodezik) uzaklık: src düğümünden R yarıçapına kadar */
function geodesic(topo,P,src,R){const dist=new Map(),h=new Heap();dist.set(src,0);h.push(0,src);
 while(h.size){const [d,u]=h.pop();if(d>dist.get(u))continue;const ru=topo.rep[u]*3;
  for(let k=topo.adjStart[u];k<topo.adjStart[u+1];k++){const w=topo.adj[k],rw=topo.rep[w]*3;
   const dx=P[ru]-P[rw],dy=P[ru+1]-P[rw+1],dz=P[ru+2]-P[rw+2],nd=d+Math.sqrt(dx*dx+dy*dy+dz*dz);
   if(nd<R){const o=dist.get(w);if(o===undefined||nd<o){dist.set(w,nd);h.push(nd,w)}}}}
 return dist}
function falloff(d,R){const t=d/R;if(t>=1)return 0;const u=1-t*t;return u*u}

/* ---------- temizlik: kopuk parçalar, yüz yönü, yumuşatma ---------- */
/* Kaynaklanmış köşelere göre bağlı bileşenler. Dönüş: yüz başına etiket ve bileşen yüz sayıları */
function components(topo,I){const T=I.length/3,par=new Int32Array(topo.W);for(let i=0;i<topo.W;i++)par[i]=i;
 const find=x=>{while(par[x]!==x){par[x]=par[par[x]];x=par[x]}return x};
 for(let t=0;t<T;t++){const a=find(topo.wid[I[3*t]]),b=find(topo.wid[I[3*t+1]]),c=find(topo.wid[I[3*t+2]]);
  if(a!==b)par[b]=a;const a2=find(a),c2=find(c);if(a2!==c2)par[c2]=a2}
 const id=new Map(),label=new Int32Array(T),sizes=[];
 for(let t=0;t<T;t++){const r=find(topo.wid[I[3*t]]);let k=id.get(r);if(k===undefined){k=sizes.length;id.set(r,k);sizes.push(0)}label[t]=k;sizes[k]++}
 return{label,sizes,count:sizes.length}}
/* Küçük bileşenleri at (en büyüğün frac katından küçükler). Kullanılmayan köşeleri sıkıştırır. */
function dropSmall(P,C,I,frac){const diag=bboxDiag(P),topo=buildTopo(P,I,diag),comp=components(topo,I);
 if(comp.count<=1)return{P,C,I,dropped:0};
 const big=Math.max(...comp.sizes),keep=comp.sizes.map(s=>s>=big*frac),T=I.length/3,J=[];
 for(let t=0;t<T;t++)if(keep[comp.label[t]])J.push(I[3*t],I[3*t+1],I[3*t+2]);
 const r=compact(P,C,J);r.dropped=comp.sizes.filter((s,i)=>!keep[i]).length;return r}
function bboxDiag(P){let a=[1e30,1e30,1e30],b=[-1e30,-1e30,-1e30];
 for(let i=0;i<P.length;i+=3)for(let k=0;k<3;k++){const v=P[i+k];if(v<a[k])a[k]=v;if(v>b[k])b[k]=v}
 return Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2])}
/* Kullanılmayan köşeleri at, indeksleri yeniden numarala */
function compact(P,C,I){const map=new Int32Array(P.length/3).fill(-1);let n=0;
 for(let i=0;i<I.length;i++)if(map[I[i]]<0)map[I[i]]=n++;
 const NP=new Float32Array(n*3),NC=C?new Float32Array(n*3):null,NI=new Uint32Array(I.length);
 for(let v=0;v<map.length;v++){const m=map[v];if(m<0)continue;NP[3*m]=P[3*v];NP[3*m+1]=P[3*v+1];NP[3*m+2]=P[3*v+2];if(C){NC[3*m]=C[3*v];NC[3*m+1]=C[3*v+1];NC[3*m+2]=C[3*v+2]}}
 for(let i=0;i<I.length;i++)NI[i]=map[I[i]];
 return{P:NP,C:NC,I:NI,dropped:0}}
/* Yüzü ters ise (işaretli hacim<0) tüm üçgenlerin sırasını çevir. Dönüş: çevrildi mi */
function fixWinding(P,I){const m=triMetrics(P,I);if(m.sV<0){for(let i=0;i<I.length;i+=3){const t=I[i+1];I[i+1]=I[i+2];I[i+2]=t}return true}return false}
/* Taubin yumuşatma (λ|μ), kaynaklı köşeler üzerinde; P yerinde değişir. Hacmi neredeyse korur. */
function taubin(P,topo,iters,lam=.5,mu=-.53){const W=topo.W;let X=new Float64Array(W*3),Y=new Float64Array(W*3);
 for(let w=0;w<W;w++){const r=topo.rep[w]*3;X[3*w]=P[r];X[3*w+1]=P[r+1];X[3*w+2]=P[r+2]}
 const step=k=>{for(let w=0;w<W;w++){const a=topo.adjStart[w],b=topo.adjStart[w+1],n=b-a;
   if(!n){Y[3*w]=X[3*w];Y[3*w+1]=X[3*w+1];Y[3*w+2]=X[3*w+2];continue}
   let sx=0,sy=0,sz=0;for(let j=a;j<b;j++){const u=topo.adj[j]*3;sx+=X[u];sy+=X[u+1];sz+=X[u+2]}
   Y[3*w]=X[3*w]+k*(sx/n-X[3*w]);Y[3*w+1]=X[3*w+1]+k*(sy/n-X[3*w+1]);Y[3*w+2]=X[3*w+2]+k*(sz/n-X[3*w+2])}
  const t=X;X=Y;Y=t};
 for(let it=0;it<iters;it++){step(lam);step(mu)}
 for(let w=0;w<W;w++)for(let j=topo.memStart[w];j<topo.memStart[w+1];j++){const v=topo.mem[j]*3;P[v]=X[3*w];P[v+1]=X[3*w+1];P[v+2]=X[3*w+2]}
 return P}
/* ================= Çoklu görünümden (siluet) hacim ================= */
/* Maskeyi sınır kutusuna kırp. Dönüş {m,w,h} ya da null */
function cropMask(m,w,h){let x0=w,y0=h,x1=-1,y1=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(m[y*w+x]){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
 if(x1<0)return null;const cw=x1-x0+1,ch=y1-y0+1,o=new Uint8Array(cw*ch);
 for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)o[y*cw+x]=m[(y+y0)*w+x+x0];return{m:o,w:cw,h:ch}}
/* Sol yarıyı sağa yansıt (sağ-sol simetrik nesne için) */
function mirrorLeft(v){const{m,w,h}=v,o=new Uint8Array(m);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)o[y*w+x]=m[y*w+(x<(w>>1)||(w%2&&x===(w>>1))?x:w-1-x)];return{m:o,w,h}}
/* Her dolu pikselin en yakın boş piksele uzaklığı (px, 3-4 pah mesafesi) */
function distField(m,w,h){const INF=1e9,d=new Float32Array(w*h);for(let i=0;i<w*h;i++)d[i]=m[i]?INF:0;
 const g=(x,y)=>x<0||y<0||x>=w||y>=h?0:d[y*w+x];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(!d[i])continue;d[i]=Math.min(d[i],g(x-1,y)+1,g(x,y-1)+1,g(x-1,y-1)+1.4142,g(x+1,y-1)+1.4142)}
 for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){const i=y*w+x;if(!d[i])continue;d[i]=Math.min(d[i],g(x+1,y)+1,g(x,y+1)+1,g(x+1,y+1)+1.4142,g(x-1,y+1)+1.4142)}
 return d}
/* Görünümlerin en-boy oranından X (genişlik), Y (derinlik), Z (yükseklik) ölçüleri. len: en uzun kenar. dr: eksik ölçü için oran */
function mvDims(v,len,dr){const a=v.front&&v.front.w/v.front.h,b=v.side&&v.side.w/v.side.h,c=v.top&&v.top.w/v.top.h;let W,D,H=1;dr=dr||.6;
 if(a&&b){W=a;D=b}else if(a&&c){W=a;D=W/c}else if(b&&c){D=b;W=c*D}
 else if(a){W=a;D=dr*W}else if(b){D=b;W=dr*D}else if(c){D=1;W=c;H=dr*W}else return null;
 const k=len/Math.max(W,D,H);return{W:W*k,D:D*k,H:H*k}}
/* 1-2-1 çekirdeğiyle üç eksende yumuşat */
function blur3(F,nx,ny,nz){const T=new Float32Array(F.length);
 const pass=(A,B,stride,n,outer1,s1,outer2,s2)=>{for(let a=0;a<outer1;a++)for(let b=0;b<outer2;b++){const o=a*s1+b*s2;
   for(let i=0;i<n;i++){const c=A[o+i*stride],p=i>0?A[o+(i-1)*stride]:c,q=i<n-1?A[o+(i+1)*stride]:c;B[o+i*stride]=(p+2*c+q)/4}}};
 pass(F,T,1,nx,ny,nx,nz,nx*ny);pass(T,F,nx,ny,nx,1,nz,nx*ny);pass(F,T,nx*ny,nz,nx,1,ny,nx);F.set(T);return F}
/* 2B kutu bulanıklığı (yarıçap r, iki geçiş), maskeyi 0..1 float'a çevirir */
function boxBlur2(m,w,h,r){let A=Float32Array.from(m),B=new Float32Array(w*h);
 for(let pass=0;pass<2;pass++){
  for(let y=0;y<h;y++){let s=0,c=0;for(let x=-r;x<=r;x++){const xx=Math.min(w-1,Math.max(0,x));s+=A[y*w+xx];c++}
   for(let x=0;x<w;x++){B[y*w+x]=s/c;const a=Math.min(w-1,Math.max(0,x-r)),b=Math.min(w-1,Math.max(0,x+r+1));s+=A[y*w+b]-A[y*w+a]}}
  for(let x=0;x<w;x++){let s=0,c=0;for(let y=-r;y<=r;y++){const yy=Math.min(h-1,Math.max(0,y));s+=B[yy*w+x];c++}
   for(let y=0;y<h;y++){A[y*w+x]=s/c;const a=Math.min(h-1,Math.max(0,y-r)),b=Math.min(h-1,Math.max(0,y+r+1));s+=B[b*w+x]-B[a*w+x]}}}
 return A}
/* Doğal yüzey ağları (naive surface nets): skaler alandan pürüzsüz kapalı ağ. (ox,oy,oz): örnek (0,0,0)'ın konumu, s: adım */
function surfaceNets(F,nx,ny,nz,iso,ox,oy,oz,s){
 const cx=nx-1,cy=ny-1,cz=nz-1,cell=new Int32Array(cx*cy*cz).fill(-1),P=[],I=[],id=(i,j,k)=>(k*ny+j)*nx+i;
 const cor=[[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]],
  ed=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]],f=new Float32Array(8);
 for(let k=0;k<cz;k++)for(let j=0;j<cy;j++)for(let i=0;i<cx;i++){let m=0;
  for(let c=0;c<8;c++){f[c]=F[id(i+cor[c][0],j+cor[c][1],k+cor[c][2])];if(f[c]>=iso)m|=1<<c}
  if(m===0||m===255)continue;let sx=0,sy=0,sz=0,n=0;
  for(const [a,b] of ed)if(((m>>a)&1)!==((m>>b)&1)){const t=(iso-f[a])/(f[b]-f[a]);
   sx+=cor[a][0]+(cor[b][0]-cor[a][0])*t;sy+=cor[a][1]+(cor[b][1]-cor[a][1])*t;sz+=cor[a][2]+(cor[b][2]-cor[a][2])*t;n++}
  cell[(k*cy+j)*cx+i]=P.length/3;P.push(ox+(i+sx/n)*s,oy+(j+sy/n)*s,oz+(k+sz/n)*s)}
 const C=(i,j,k)=>cell[(k*cy+j)*cx+i],quad=(a,b,c,d,flip)=>{if(a<0||b<0||c<0||d<0)return;if(flip)I.push(a,c,b,a,d,c);else I.push(a,b,c,a,c,d)};
 for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const v0=F[id(i,j,k)]>=iso;
  if(i<nx-1&&j>0&&k>0&&j<cy&&k<cz&&(F[id(i+1,j,k)]>=iso)!==v0)quad(C(i,j-1,k-1),C(i,j,k-1),C(i,j,k),C(i,j-1,k),!v0);
  if(j<ny-1&&i>0&&k>0&&i<cx&&k<cz&&(F[id(i,j+1,k)]>=iso)!==v0)quad(C(i-1,j,k-1),C(i-1,j,k),C(i,j,k),C(i,j,k-1),!v0);
  if(k<nz-1&&i>0&&j>0&&i<cx&&j<cy&&(F[id(i,j,k+1)]>=iso)!==v0)quad(C(i-1,j-1,k),C(i,j-1,k),C(i,j,k),C(i-1,j,k),!v0)}
 return{P:Float32Array.from(P),I:Uint32Array.from(I)}}
/* v: {front,side,top} her biri {m,w,h} (kırpılmış maske), opt: {len,dr,res,flip:{front,side,top},smooth}
   Ön görünüm: sağ=+X, yukarı=+Z (kameradan bakınca). Yan görünüm: +X tarafından bakış, sağ=+Y. Üst görünüm: sağ=+X, yukarı=+Y.
   Tek görünüm verilirse derinlik, kenara uzaklığa göre "şişirilir"; ikiden fazlasında siluetlerin kesişimi alınır. */
function mvMesh(v,opt){opt=opt||{};const dims=mvDims(v,opt.len||1000,opt.dr);if(!dims)return null;
 const{W,D,H}=dims,res=Math.max(24,opt.res||96),s=Math.max(W,D,H)/res,PAD=2,
  nx=Math.ceil(W/s)+2*PAD,ny=Math.ceil(D/s)+2*PAD,nz=Math.ceil(H/s)+2*PAD,fl=opt.flip||{};
 const ox=-W/2+(0.5-PAD)*s,oy=-D/2+(0.5-PAD)*s,oz=(0.5-PAD)*s,F=new Float32Array(nx*ny*nz);
 const names=['front','side','top'].filter(k=>v[k]),single=names.length===1;
 /* görünüm başına (u,v) -> maske; maske önce yumuşatılır, çift doğrusal örneklenir (basamaklanma olmaz) */
 const look={front:(x,y,z)=>[(x+W/2)/W,1-z/H],side:(x,y,z)=>[(y+D/2)/D,1-z/H],top:(x,y,z)=>[(x+W/2)/W,1-(y+D/2)/D]},ext={front:W,side:D,top:W},soft={};
 names.forEach(k=>{const V=v[k],r=Math.max(1,Math.round(.6*V.w/(ext[k]/s)));soft[k]=boxBlur2(V.m,V.w,V.h,r)});
 const samp=(k,x,y,z)=>{const V=v[k];let[u,w]=look[k](x,y,z);if(fl[k])u=1-u;if(u<-.002||u>1.002||w<-.002||w>1.002)return 0;
  const fx=Math.min(Math.max(u*V.w-.5,0),V.w-1),fy=Math.min(Math.max(w*V.h-.5,0),V.h-1),x0=Math.floor(fx),y0=Math.floor(fy),x1=Math.min(x0+1,V.w-1),y1=Math.min(y0+1,V.h-1),tx=fx-x0,ty=fy-y0,M=soft[k];
  return (M[y0*V.w+x0]*(1-tx)+M[y0*V.w+x1]*tx)*(1-ty)+(M[y1*V.w+x0]*(1-tx)+M[y1*V.w+x1]*tx)*ty};
 let dist=null,dmax=1;
 if(single){const V=v[names[0]];dist=distField(V.m,V.w,V.h);dmax=0;for(let i=0;i<dist.length;i++)if(dist[i]>dmax)dmax=dist[i];dmax=Math.max(dmax,1);
  var dsoft=boxBlur2(Float32Array.from(dist),V.w,V.h,1)}
 for(let k=0;k<nz;k++){const z=oz+k*s;for(let j=0;j<ny;j++){const y=oy+j*s;for(let i=0;i<nx;i++){const x=ox+i*s;let occ=1;
   if(single){const kk=names[0],mk=samp(kk,x,y,z);if(mk<=0)occ=0;else{
     const V=v[kk],dd=dsoft[Math.min(V.h-1,Math.max(0,Math.floor(look[kk](x,y,z)[1]*V.h)))*V.w+Math.min(V.w-1,Math.max(0,Math.floor((fl[kk]?1-look[kk](x,y,z)[0]:look[kk](x,y,z)[0])*V.w)))];
     const t=Math.min(1,dd/dmax),half=(kk==='front'?D:kk==='side'?W:H)/2*Math.max(.06,Math.sqrt(t*(2-t))),dep=kk==='front'?y:kk==='side'?x:z-H/2;
     occ=Math.min(mk,Math.max(0,Math.min(1,(half-Math.abs(dep))/s+.5)))}}
   else for(const kk of names){const q=samp(kk,x,y,z);if(q<occ)occ=q;if(occ<=0)break}
   F[(k*ny+j)*nx+i]=occ}}}
 blur3(F,nx,ny,nz);
 let m=surfaceNets(F,nx,ny,nz,.5,ox,oy,oz,s);if(!m.I.length)return null;
 let P=m.P,I=m.I,C=null;const d=dropSmall(P,C,I,.03);P=d.P;I=d.I;
 fixWinding(P,I);
 if(opt.smooth===undefined||opt.smooth>0){const topo=buildTopo(P,I,bboxDiag(P));taubin(P,topo,opt.smooth===undefined?8:opt.smooth)}
 return{P,I,dims,res,nx,ny,nz}}
/* Aynı konumdaki köşeleri gerçekten birleştir (tol: mutlak uzaklık) */
function weld(P,C,I,tol){const q=1/Math.max(tol,1e-9),map=new Map(),idx=new Int32Array(P.length/3);let n=0;const keep=[];
 for(let i=0;i<idx.length;i++){const k=Math.round(P[3*i]*q)+','+Math.round(P[3*i+1]*q)+','+Math.round(P[3*i+2]*q);let w=map.get(k);if(w===undefined){w=n++;map.set(k,w);keep.push(i)}idx[i]=w}
 const NP=new Float32Array(n*3),NC=C?new Float32Array(n*3):null;
 keep.forEach((o,w)=>{NP[3*w]=P[3*o];NP[3*w+1]=P[3*o+1];NP[3*w+2]=P[3*o+2];if(C){NC[3*w]=C[3*o];NC[3*w+1]=C[3*o+1];NC[3*w+2]=C[3*o+2]}});
 const J=[];for(let t=0;t<I.length;t+=3){const a=idx[I[t]],b=idx[I[t+1]],c=idx[I[t+2]];if(a!==b&&b!==c&&a!==c)J.push(a,b,c)}
 return{P:NP,C:NC,I:Uint32Array.from(J)}}

/* ---------- Kafes (FFD): kelepçeli düzgün B-spline tabanı ---------- */
function bsDeg(n){return Math.max(1,Math.min(3,n-1))}
function bsKnots(n,p){const m=n+p+1,k=new Float64Array(m);for(let i=0;i<m;i++)k[i]=i<=p?0:(i>=n?1:(i-p)/(n-p));return k}
function bsGreville(n,p){const k=bsKnots(n,p),g=new Float64Array(n);for(let i=0;i<n;i++){let s=0;for(let j=1;j<=p;j++)s+=k[i+j];g[i]=s/p}return g}
/* t∈[0,1] için sıfırdan farklı p+1 taban değeri; dönüş: ilk taban indeksi */
function bsEval(n,p,k,t,out){t=t<0?0:t>1?1:t;let s=p;while(s<n-1&&k[s+1]<=t)s++;
 const L=new Float64Array(p+1),R=new Float64Array(p+1);out[0]=1;
 for(let j=1;j<=p;j++){L[j]=t-k[s+1-j];R[j]=k[s+j]-t;let saved=0;
  for(let r=0;r<j;r++){const tmp=out[r]/(R[r+1]+L[j-r]);out[r]=saved+R[r+1]*tmp;saved=L[j-r]*tmp}out[j]=saved}
 return s-p}
/* Kafesi köşelere bağla. box={min:[..],size:[..]}, N=[nx,ny,nz] kontrol noktası sayısı */
function ffdPrepare(P,box,N){const V=P.length/3,pr={N:N.slice(),p:N.map(bsDeg),V,start:[0,1,2].map(()=>new Int16Array(V)),w:[0,1,2].map(a=>new Float32Array(V*(bsDeg(N[a])+1))),box};
 for(let a=0;a<3;a++){const n=N[a],p=pr.p[a],k=bsKnots(n,p),out=new Float64Array(p+1);
  for(let v=0;v<V;v++){const t=(P[3*v+a]-box.min[a])/(box.size[a]||1),s=bsEval(n,p,k,t,out);pr.start[a][v]=s;for(let j=0;j<=p;j++)pr.w[a][v*(p+1)+j]=out[j]}}
 return pr}
/* Kafesin ilk (bozulmamış) kontrol noktaları: Greville konumları → özdeşlik dönüşümü */
function ffdRest(pr){const {N,box}=pr,G=[0,1,2].map(a=>bsGreville(N[a],pr.p[a])),C=new Float64Array(N[0]*N[1]*N[2]*3);let q=0;
 for(let i=0;i<N[0];i++)for(let j=0;j<N[1];j++)for(let k=0;k<N[2];k++){C[q++]=box.min[0]+G[0][i]*box.size[0];C[q++]=box.min[1]+G[1][j]*box.size[1];C[q++]=box.min[2]+G[2][k]*box.size[2]}
 return C}
/* Kontrol noktalarından bozulmuş köşe konumları (out: Float32Array(3V)) */
function ffdEval(pr,C,out){const {N,p,V}=pr,[px,py,pz]=p,ny=N[1],nz=N[2],[sx,sy,sz]=pr.start,[wx,wy,wz]=pr.w,qx=px+1,qy=py+1,qz=pz+1;
 for(let v=0;v<V;v++){let X=0,Y=0,Z=0;
  for(let a=0;a<qx;a++){const wa=wx[v*qx+a];if(!wa)continue;const ia=sx[v]+a;
   for(let b=0;b<qy;b++){const wb=wa*wy[v*qy+b];if(!wb)continue;const ib=sy[v]+b,base=(ia*ny+ib)*nz;
    for(let c=0;c<qz;c++){const wgt=wb*wz[v*qz+c];if(!wgt)continue;const o=(base+sz[v]+c)*3;X+=wgt*C[o];Y+=wgt*C[o+1];Z+=wgt*C[o+2]}}}
  out[3*v]=X;out[3*v+1]=Y;out[3*v+2]=Z}
 return out}

/* ---------- kesitler ve kesme ---------- */
/* Eksen=axis, değer=val düzlemiyle kesişen doğru parçaları: düz dizi [x0,y0,z0,x1,y1,z1,...] */
function sliceSegments(P,I,axis,val,out){out=out||[];
 for(let t=0;t<I.length;t+=3){const pts=[];
  for(let e=0;e<3;e++){const a=I[t+e]*3,b=I[t+(e+1)%3]*3,da=P[a+axis]-val,db=P[b+axis]-val;
   if((da<0&&db>0)||(da>0&&db<0)){const s=da/(da-db);pts.push(P[a]+s*(P[b]-P[a]),P[a+1]+s*(P[b+1]-P[a+1]),P[a+2]+s*(P[b+2]-P[a+2]))}}
  if(pts.length===6)for(let i=0;i<6;i++)out.push(pts[i])}
 return out}
/* Dilim ortası çizgisi: eksen boyunca n dilimde kesit çizgilerinin uzunluk ağırlıklı merkezi */
function centerLine(P,I,axis,n){let lo=1e30,hi=-1e30;for(let i=axis;i<P.length;i+=3){if(P[i]<lo)lo=P[i];if(P[i]>hi)hi=P[i]}
 const pts=[];for(let k=0;k<n;k++){const v=lo+(hi-lo)*(k+.5)/n,s=sliceSegments(P,I,axis,v);if(!s.length)continue;
  let L=0,cx=0,cy=0,cz=0;for(let i=0;i<s.length;i+=6){const l=Math.hypot(s[i+3]-s[i],s[i+4]-s[i+1],s[i+5]-s[i+2]);L+=l;cx+=l*(s[i]+s[i+3])/2;cy+=l*(s[i+1]+s[i+4])/2;cz+=l*(s[i+2]+s[i+5])/2}
  if(L>0)pts.push([cx/L,cy/L,cz/L])}
 return pts}
/* Ağı axis=val düzleminde iki parçaya ayırır (A: değer küçük taraf, B: büyük taraf).
   Kesilen üçgenler tam kırpılır. Kesit, her parçanın düzlemdeki açık kenar halkalarından bulunur
   (köşeler düzlemin tam üstündeyse de çalışır) ve her halka kendi ağırlık merkezinden yelpaze ile kapatılır. */
function cutMesh(P,C,I,axis,val){
 const A={P:[],C:C?[]:null,I:[]},B={P:[],C:C?[]:null,I:[]};
 const put=(S,x,y,z,c)=>{S.P.push(x,y,z);if(S.C)S.C.push(c[0],c[1],c[2]);return S.P.length/3-1};
 const vert=(i)=>({p:[P[3*i],P[3*i+1],P[3*i+2]],c:C?[C[3*i],C[3*i+1],C[3*i+2]]:null,d:P[3*i+axis]-val});
 const lerp=(u,v)=>{const s=u.d/(u.d-v.d);return{p:u.p.map((x,k)=>x+s*(v.p[k]-x)),c:u.c?u.c.map((x,k)=>x+s*(v.c[k]-x)):null,d:0}};
 const emit=(S,poly)=>{if(poly.length<3)return;const ids=poly.map(v=>put(S,v.p[0],v.p[1],v.p[2],v.c));for(let k=1;k<poly.length-1;k++)S.I.push(ids[0],ids[k],ids[k+1])};
 for(let t=0;t<I.length;t+=3){const v=[vert(I[t]),vert(I[t+1]),vert(I[t+2])];
  if(v.every(x=>x.d<=0)){emit(A,v);continue}
  if(v.every(x=>x.d>=0)){emit(B,v);continue}
  const pa=[],pb=[];
  for(let e=0;e<3;e++){const u=v[e],w=v[(e+1)%3];
   if(u.d<=0)pa.push(u);if(u.d>=0)pb.push(u);
   if((u.d<0&&w.d>0)||(u.d>0&&w.d<0)){const m=lerp(u,w);pa.push(m);pb.push(m)}}
  emit(A,pa);emit(B,pb)}
 const diag=bboxDiag(P),eps=diag*1e-7,q=1/Math.max(diag*1e-6,1e-12),key=(S,i)=>Math.round(S.P[3*i]*q)+','+Math.round(S.P[3*i+1]*q)+','+Math.round(S.P[3*i+2]*q);
 let loops=0;
 const cap=(S)=>{const n=S.P.length/3,kid=new Array(n),has=new Set(),onPlane=i=>Math.abs(S.P[3*i+axis]-val)<=eps;
  for(let i=0;i<n;i++)kid[i]=key(S,i);
  const edges=[];for(let t=0;t<S.I.length;t+=3)for(let e=0;e<3;e++){const a=S.I[t+e],b=S.I[t+(e+1)%3];if(kid[a]===kid[b])continue;has.add(kid[a]+'>'+kid[b]);edges.push([a,b])}
  /* partnersiz (açık) ve düzlem üstündeki kenarlar; kapak bunların tersini kullanır */
  const open=edges.filter(([a,b])=>onPlane(a)&&onPlane(b)&&!has.has(kid[b]+'>'+kid[a])).map(([a,b])=>({s:b,e:a,ks:kid[b],ke:kid[a]}));
  const from=new Map();open.forEach((o,i)=>{if(!from.has(o.ks))from.set(o.ks,[]);from.get(o.ks).push(i)});
  const used=new Uint8Array(open.length);
  for(let s0=0;s0<open.length;s0++){if(used[s0])continue;const loop=[];let cur=s0;
   while(cur!==undefined&&!used[cur]){used[cur]=1;loop.push(open[cur]);cur=(from.get(open[cur].ke)||[]).find(j=>!used[j])}
   if(loop.length<3)continue;loops++;
   const cc=[0,0,0];loop.forEach(o=>{for(let k=0;k<3;k++)cc[k]+=S.P[3*o.s+k]});for(let k=0;k<3;k++)cc[k]/=loop.length;
   const c0=S.C?[.7,.7,.7]:null,ci=put(S,cc[0],cc[1],cc[2],c0);
   for(const o of loop){const ia=put(S,S.P[3*o.s],S.P[3*o.s+1],S.P[3*o.s+2],c0),ib=put(S,S.P[3*o.e],S.P[3*o.e+1],S.P[3*o.e+2],c0);S.I.push(ci,ia,ib)}}};
 cap(A);const la=loops;loops=0;cap(B);
 const fin=S=>({P:Float32Array.from(S.P),C:S.C?Float32Array.from(S.C):null,I:Uint32Array.from(S.I)});
 return{A:fin(A),B:fin(B),loops:Math.max(la,loops)}}

/* ---------- 2B çizim: çokgen, kulak kırpma, extrude, revolve ---------- */
function polyArea(pl){let a=0;for(let i=0;i<pl.length;i++){const p=pl[i],q=pl[(i+1)%pl.length];a+=p[0]*q[1]-q[0]*p[1]}return a/2}
function polyCentroid(pl){let a=0,cx=0,cy=0;for(let i=0;i<pl.length;i++){const p=pl[i],q=pl[(i+1)%pl.length],c=p[0]*q[1]-q[0]*p[1];a+=c;cx+=(p[0]+q[0])*c;cy+=(p[1]+q[1])*c}a/=2;return a?[cx/(6*a),cy/(6*a)]:pl[0]}
/* Kulak kırpma. pl saat yönü tersi (CCW) olmalı. Dönüş: üçgen indeks üçlüleri düz dizi */
function earClip(pl){const n=pl.length,idx=[];for(let i=0;i<n;i++)idx.push(i);const out=[];
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const inTri=(p,a,b,c)=>cross(a,b,p)>=-1e-12&&cross(b,c,p)>=-1e-12&&cross(c,a,p)>=-1e-12;
 let guard=0;
 while(idx.length>3&&guard++<10000){let cut=false;
  for(let i=0;i<idx.length;i++){const i0=idx[(i+idx.length-1)%idx.length],i1=idx[i],i2=idx[(i+1)%idx.length],a=pl[i0],b=pl[i1],c=pl[i2];
   if(cross(a,b,c)<=1e-12)continue;let ok=true;
   for(const j of idx){if(j===i0||j===i1||j===i2)continue;const q=pl[j];if((q[0]===a[0]&&q[1]===a[1])||(q[0]===b[0]&&q[1]===b[1])||(q[0]===c[0]&&q[1]===c[1]))continue;if(inTri(q,a,b,c)){ok=false;break}}
   if(ok){out.push(i0,i1,i2);idx.splice(i,1);cut=true;break}}
  if(!cut)break}
 if(idx.length===3)out.push(idx[0],idx[1],idx[2]);
 return out}
/* Kapalı çokgeni (u,v) düzleminde w=z0..z1 arasında kalınlaştır. plane: {u:[..],v:[..],n:[..],o:[..]} birim vektörler + orijin.
   Dönüş: {P,I} dışa bakan yüzlü kapalı ağ. */
function extrudeLoop(loop,plane,z0,z1){let pl=loop.map(p=>[p[0],p[1]]);if(polyArea(pl)<0)pl=pl.reverse();
 const n=pl.length,P=[],I=[],pt=(p,w)=>{const o=plane.o;return[o[0]+plane.u[0]*p[0]+plane.v[0]*p[1]+plane.n[0]*w,o[1]+plane.u[1]*p[0]+plane.v[1]*p[1]+plane.n[1]*w,o[2]+plane.u[2]*p[0]+plane.v[2]*p[1]+plane.n[2]*w]};
 pl.forEach(p=>P.push(...pt(p,z0)));pl.forEach(p=>P.push(...pt(p,z1)));
 const tri=earClip(pl);
 for(let i=0;i<tri.length;i+=3){I.push(tri[i],tri[i+2],tri[i+1]);I.push(n+tri[i],n+tri[i+1],n+tri[i+2])}   // alt kapak ters, üst düz
 for(let i=0;i<n;i++){const j=(i+1)%n;I.push(i,j,n+j,i,n+j,n+i)}
 const r={P:Float32Array.from(P),I:Uint32Array.from(I)};
 /* düzlem sağ-el kuralına uymuyorsa (u×v·n<0) yüzler ters olabilir; hacim işaretine göre düzelt */
 fixWinding(r.P,r.I);return r}
/* (r,z) kesit çokgenini z ekseni etrafında döndürerek katı üret. r≥0 olmalı. seg: dilim sayısı */
function revolveProfile(profile,seg){let pl=profile.map(p=>[Math.max(0,p[0]),p[1]]);if(polyArea(pl)<0)pl=pl.reverse();
 const P=[],I=[],n=pl.length,eps=1e-9,ring=i=>i*seg;
 for(let i=0;i<n;i++)for(let s=0;s<seg;s++){const a=2*Math.PI*s/seg;P.push(pl[i][0]*Math.cos(a),pl[i][0]*Math.sin(a),pl[i][1])}
 for(let i=0;i<n;i++){const j=(i+1)%n,onA=pl[i][0]<eps,onB=pl[j][0]<eps;if(onA&&onB)continue;
  for(let s=0;s<seg;s++){const s2=(s+1)%seg,a=ring(i)+s,b=ring(i)+s2,c=ring(j)+s2,d=ring(j)+s;
   if(onA)I.push(a,c,d);else if(onB)I.push(a,b,c);else I.push(a,b,c,a,c,d)}}
 const r={P:Float32Array.from(P),I:Uint32Array.from(I)};fixWinding(r.P,r.I);return r}

/* ---------- fotoğraftan ana hat ---------- */
/* rgba: Uint8ClampedArray. Saydamlık varsa alfa, yoksa kenar rengine uzaklık maskeyi verir. */
function maskFromImage(rgba,w,h,tol){const m=new Uint8Array(w*h);let anyA=false;
 for(let i=3;i<rgba.length;i+=4)if(rgba[i]<250){anyA=true;break}
 if(anyA){for(let i=0;i<w*h;i++)m[i]=rgba[4*i+3]>128?1:0;return m}
 const ring=[];for(let x=0;x<w;x++){ring.push(x,(h-1)*w+x)}for(let y=0;y<h;y++){ring.push(y*w,y*w+w-1)}
 const med=c=>{const a=ring.map(i=>rgba[4*i+c]).sort((p,q)=>p-q);return a[a.length>>1]},bg=[med(0),med(1),med(2)];
 for(let i=0;i<w*h;i++){const d=Math.hypot(rgba[4*i]-bg[0],rgba[4*i+1]-bg[1],rgba[4*i+2]-bg[2]);m[i]=d>tol?1:0}
 return m}
/* En büyük bağlı bölgeyi tut, içindeki delikleri doldur (dıştan dolgu ile) */
function cleanMask(m,w,h){const lab=new Int32Array(w*h),sizes=[0];let L=0;const st=[];
 for(let s=0;s<w*h;s++){if(!m[s]||lab[s])continue;L++;let c=0;st.push(s);lab[s]=L;
  while(st.length){const p=st.pop();c++;const x=p%w,y=(p-x)/w;
   if(x>0&&m[p-1]&&!lab[p-1]){lab[p-1]=L;st.push(p-1)}if(x<w-1&&m[p+1]&&!lab[p+1]){lab[p+1]=L;st.push(p+1)}
   if(y>0&&m[p-w]&&!lab[p-w]){lab[p-w]=L;st.push(p-w)}if(y<h-1&&m[p+w]&&!lab[p+w]){lab[p+w]=L;st.push(p+w)}}
  sizes.push(c)}
 let best=0,bs=0;for(let i=1;i<sizes.length;i++)if(sizes[i]>bs){bs=sizes[i];best=i}
 const out=new Uint8Array(w*h);for(let i=0;i<w*h;i++)out[i]=lab[i]===best?1:0;
 /* delik doldurma: dışarıdan ulaşılabilen boşluk dışındaki her şey dolu */
 const outside=new Uint8Array(w*h);const q=[];const push=p=>{if(!out[p]&&!outside[p]){outside[p]=1;q.push(p)}};
 for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
 while(q.length){const p=q.pop(),x=p%w,y=(p-x)/w;if(x>0)push(p-1);if(x<w-1)push(p+1);if(y>0)push(p-w);if(y<h-1)push(p+w)}
 for(let i=0;i<w*h;i++)out[i]=outside[i]?0:1;
 return out}
/* Moore komşuluğu ile dış sınırı izle. Dönüş: [[x,y],...] piksel kenar noktaları */
function traceContour(m,w,h){const at=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&m[y*w+x]===1;let sx=-1,sy=-1;
 outer:for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(at(x,y)){sx=x;sy=y;break outer}
 if(sx<0)return[];
 const D=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]],pts=[];let x=sx,y=sy,d=6,guard=0;
 do{pts.push([x,y]);let found=false;
  for(let k=0;k<8;k++){const dd=(d+6+k)%8,nx=x+D[dd][0],ny=y+D[dd][1];if(at(nx,ny)){x=nx;y=ny;d=dd;found=true;break}}
  if(!found)break}while((x!==sx||y!==sy)&&guard++<4*w*h);
 return pts}
/* Douglas-Peucker (kapalı çokgen için iki parçaya bölünerek) */
function rdp(pts,eps){const f=(a,lo,hi)=>{if(hi<=lo+1)return[a[lo]];let mx=0,mi=-1;const A=a[lo],B=a[hi],dx=B[0]-A[0],dy=B[1]-A[1],L=Math.hypot(dx,dy)||1e-9;
  for(let i=lo+1;i<hi;i++){const d=Math.abs((a[i][0]-A[0])*dy-(a[i][1]-A[1])*dx)/L;if(d>mx){mx=d;mi=i}}
  if(mx>eps)return f(a,lo,mi).concat(f(a,mi,hi));return[a[lo]]};
 if(pts.length<4)return pts.slice();
 let far=0,fd=-1;for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[0][0],pts[i][1]-pts[0][1]);if(d>fd){fd=d;far=i}}
 const a=pts.concat([pts[0]]);return f(a,0,far).concat(f(a,far,a.length-1)).filter((p,i,arr)=>i===0||p!==arr[i-1])}

/* ---------- dışa aktarma ---------- */
function stlBinary(P,I){const T=I.length/3,buf=new ArrayBuffer(84+50*T),dv=new DataView(buf);dv.setUint32(80,T,true);let o=84;
 for(let t=0;t<T;t++){const a=I[3*t]*3,b=I[3*t+1]*3,c=I[3*t+2]*3,ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2],vx=P[c]-P[a],vy=P[c+1]-P[a+1],vz=P[c+2]-P[a+2];
  let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
  [nx,ny,nz,P[a],P[a+1],P[a+2],P[b],P[b+1],P[b+2],P[c],P[c+1],P[c+2]].forEach(v=>{dv.setFloat32(o,v,true);o+=4});o+=2}
 return new Uint8Array(buf)}
function objText(P,I,name,voff){voff=voff||0;let s='o '+name+'\n';for(let i=0;i<P.length;i+=3)s+='v '+P[i].toFixed(4)+' '+P[i+1].toFixed(4)+' '+P[i+2].toFixed(4)+'\n';
 for(let t=0;t<I.length;t+=3)s+='f '+(I[t]+1+voff)+' '+(I[t+1]+1+voff)+' '+(I[t+2]+1+voff)+'\n';return s}
function b64(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)}
function unb64(s){const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}

/* ---------- uçuş hesabı ---------- */
const G0=9.80665;
/* Havada asılı kalma: ideal güç = T^1.5/√(2ρA); gerçek = ideal/FM/η. */
function hoverCalc(o){const m=o.mass,A=o.rotors*Math.PI*(o.diam/2)**2,T=m*G0,Pid=Math.pow(T,1.5)/Math.sqrt(2*o.rho*A),Pel=Pid/(o.fm*o.eta);
 const out={area:A,thrust:T,diskLoading:T/A,idealW:Pid,elecW:Pel,twr:o.maxThrust?o.maxThrust/T:null,hoverMin:o.battKWh?o.battKWh*1000/Pel*60:null,
  vi:Math.sqrt(T/(2*o.rho*A))};
 if(o.powerW){/* eldeki güçle taşınabilecek en büyük kütle: P=(mg)^1.5/√(2ρA)/(FM·η) */
  out.maxMass=Math.pow(o.powerW*o.fm*o.eta*Math.sqrt(2*o.rho*A),2/3)/G0}
 return out}
/* Kanatla uçuş: L=½ρv²SCL */
function wingCalc(o){const m=o.mass,W=m*G0,vStall=Math.sqrt(2*W/(o.rho*o.area*o.clMax)),qc=.5*o.rho*o.vCruise**2,clReq=W/(qc*o.area);
 return{weight:W,vStall,clReq,liftAtCruise:qc*o.area*o.clMax,wingLoading:W/o.area,dragW:o.cd0?qc*o.area*o.cd0*o.vCruise:null}}

/* ---------- el hareketi mantığı (kameradan bağımsız, test edilebilir) ---------- */
/* landmarks: 21 nokta {x,y,z} (0..1 görüntü koordinatı). Başparmak ucu 4, işaret ucu 8, bilek 0, orta parmak kökü 9. */
function pinchRatio(l){const d=(a,b)=>Math.hypot(l[a].x-l[b].x,l[a].y-l[b].y,(l[a].z||0)-(l[b].z||0)),s=d(0,9)||1e-6;return d(4,8)/s}
class Gestures{
 constructor(o){o=o||{};this.on=o.on||.32;this.off=o.off||.5;this.sm=o.smooth||.5;this.h=[null,null];this.mode=null;this.last=null;this.pinchD=0;this.ev=[]}
 /* hands: dizi (en çok 2) landmark listesi. Dönüş: üretilen eylemler */
 update(hands){const ev=[];const cur=hands.slice(0,2).map(l=>{const r=pinchRatio(l),px=(l[4].x+l[8].x)/2,py=(l[4].y+l[8].y)/2;return{r,px,py,tip:l[8]}});
  /* her el için ayrı mandal (histerezis) */
  cur.forEach((c,i)=>{const was=this.h[i]&&this.h[i].down;c.down=was?c.r<this.off:c.r<this.on});
  for(let i=cur.length;i<2;i++)this.h[i]=null;
  const down=cur.filter(c=>c.down);
  if(down.length>=2){const a=down[0],b=down[1],d=Math.hypot(a.px-b.px,a.py-b.py),cx=(a.px+b.px)/2,cy=(a.py+b.py)/2;
   if(this.mode==='two'){ev.push({type:'zoom',factor:this.pinchD>1e-6?d/this.pinchD:1});ev.push({type:'pan',dx:cx-this.last[0],dy:cy-this.last[1]})}
   else if(this.mode==='one')ev.push({type:'grabEnd'});
   this.mode='two';this.pinchD=d;this.last=[cx,cy]}
  else if(down.length===1){const c=down[0];
   if(this.mode==='one'){ev.push({type:'move',dx:c.px-this.last[0],dy:c.py-this.last[1],x:c.tip.x,y:c.tip.y})}
   else{ev.push({type:'grabStart',x:c.tip.x,y:c.tip.y})}
   this.mode='one';this.last=[c.px,c.py]}
  else{if(this.mode==='one')ev.push({type:'grabEnd'});this.mode=null;this.last=null}
  /* tek el açıkken imleç */
  if(!down.length&&cur.length)ev.push({type:'cursor',x:cur[0].tip.x,y:cur[0].tip.y});
  cur.forEach((c,i)=>this.h[i]={down:c.down});
  return ev}}
//</pure>
