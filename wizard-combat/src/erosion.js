// Original, bounded CPU adaptation of the directional, cell-blended erosion idea:
// https://blog.runevision.com/2026/03/fast-and-gorgeous-erosion-filter.html
// Evaluated only while building the shared terrain cache, never during a frame.
const saturate=x=>Math.max(0,Math.min(1,x));
const hash=(x,z)=>{const v=Math.sin(x*127.1+z*311.7)*43758.5453;return v-Math.floor(v);};
function stripes(x,z,gx,gz){
  const len=Math.hypot(gx,gz)||1,nx=-gz/len,nz=gx/len,ix=Math.floor(x),iz=Math.floor(z);
  let c=0,s=0,total=0;
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
    const cx=ix+dx,cz=iz+dz,px=x-cx-.2-.6*hash(cx,cz),pz=z-cz-.2-.6*hash(cx+93,cz-41);
    const w=Math.max(0,1-(px*px+pz*pz)/2.25)**3,phase=(px*nx+pz*nz)*Math.PI*2;
    c+=Math.cos(phase)*w;s+=Math.sin(phase)*w;total+=w;
  }
  c/=total||1;s/=total||1;
  const norm=Math.max(.5,Math.hypot(c,s));
  return {ridge:c/norm,cross:s/norm,nx,nz};
}
export function erodedOffset(x,z,height,gx,gz,strength=1){
  const slope=Math.hypot(gx,gz);
  if(slope<1e-6||strength<=0)return 0;
  let mask=1-(1-saturate(slope*.85))**2,target=saturate(height/125)*2-1;
  let offset=0,frequency=1/48,amplitude=7.5,gullyX=gx,gullyZ=gz;
  for(let octave=0;octave<3;octave++){
    const n=stripes(x*frequency+octave*17.7,z*frequency-octave*9.2,gullyX,gullyZ);
    const faded=target*(1-mask)+n.ridge*mask;
    offset+=amplitude*faded;
    // Subsequent branches follow the modified slope. Preserve the parent creases.
    const slopeDelta=-Math.sign(n.cross)*amplitude*frequency*4;
    gullyX+=n.nx*slopeDelta;gullyZ+=n.nz*slopeDelta;
    mask*=saturate(1-n.ridge*n.ridge);target=faded;
    amplitude*=.45;frequency*=2;
  }
  return offset*strength*(1-(1-saturate(slope*1.3))**2);
}
