// Preserve cutout coverage when a spray of small leaves becomes a few texels.
// Filter unmodified alpha at each level; never compound the coverage correction.
export function foliageMipmaps(data,width,height,cutoff=.42){
  const base=new Uint8ClampedArray(data),levels=[{data:base,width,height}];
  let target=0;for(let i=3;i<base.length;i+=4)target+=base[i]/255>cutoff?1:0;
  target/=width*height;
  let raw=base;
  while(width>1||height>1){
    const w=Math.max(1,width>>1),h=Math.max(1,height>>1),next=new Uint8ClampedArray(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const o=(y*w+x)*4;let alpha=0,r=0,g=0,b=0,count=0;
      for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
        const i=(Math.min(height-1,y*2+dy)*width+Math.min(width-1,x*2+dx))*4,a=raw[i+3];
        alpha+=a;r+=raw[i]*a;g+=raw[i+1]*a;b+=raw[i+2]*a;count++;
      }
      next[o]=alpha?r/alpha:0;next[o+1]=alpha?g/alpha:0;next[o+2]=alpha?b/alpha:0;next[o+3]=alpha/count;
    }
    const coverage=scale=>{let n=0;for(let i=3;i<next.length;i+=4)n+=next[i]*scale/255>Math.min(.75,cutoff+.18)?1:0;return n/(w*h);};
    let lo=.25,hi=8;
    for(let n=0;n<15;n++){const mid=(lo+hi)/2;if(coverage(mid)<target)lo=mid;else hi=mid;}
    const corrected=new Uint8ClampedArray(next),scale=Math.min(8,Math.max(1,hi*1.06));
    for(let i=3;i<corrected.length;i+=4)corrected[i]=Math.min(255,next[i]*scale);
    levels.push({data:corrected,width:w,height:h});raw=next;width=w;height=h;
  }
  return levels;
}
