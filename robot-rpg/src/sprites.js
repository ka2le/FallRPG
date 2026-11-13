// Trim transparent margins only. Disconnected heads, hats, antennae and feet
// belong to the sprite just as much as its torso does.
export function cellBounds(pixels,width,height,index,columns=8,rows=8){
  const col=index%columns,row=Math.floor(index/columns),left=Math.round(col*width/columns),right=Math.round((col+1)*width/columns),top=Math.round(row*height/rows),bottom=Math.round((row+1)*height/rows);
  let minX=right,minY=bottom,maxX=left,maxY=top,count=0;
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(pixels[(y*width+x)*4+3]>24){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);count++;}
  if(!count)return {x:left,y:top,w:right-left,h:bottom-top};
  // A one-pixel alpha fringe stays with the whole silhouette.
  minX=Math.max(left,minX-1);minY=Math.max(top,minY-1);maxX=Math.min(right-1,maxX+1);maxY=Math.min(bottom-1,maxY+1);
  return {x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1};
}
export const CHARACTER_IDLE=[0,1,2,3,4,5,6,7,16,17,18,19,20,32,34,39];
export function characterFrame(index,{moving=false,walk=0,direction='down'}={}){
  let frame=CHARACTER_IDLE[index]??index;
  if(index===12)frame={down:20,up:21,left:22,right:23}[direction]??20;
  return frame+(moving&&(Math.floor(walk)%2===1)?8:0);
}
export function creatureAppearance(def,creature={}){
  const atlas=creature.visual?.atlas||def.atlas||'creatures',base=creature.visual?.sprite??def.sprite;
  if(atlas==='groves'||atlas==='wilds')return {atlas,frame:base};
  return {atlas,frame:atlas==='wildlife'?base+(creature.moving&&Math.floor(creature.walk)%2===1?32:0):characterFrame(base,creature)};
}
export function environmentFrame(prop){
  if(prop.art!==undefined)return prop.art;
  if(prop.atlas==='details')return prop.sprite+16;
  if(prop.label||prop.building||!prop.tree)return prop.sprite;
  const variant=Math.floor(prop.phase*100)%4;
  const variants={0:[0,32,33,34],1:[1,35,36,1],2:[2,37,38,39],3:[3,40,41,42],9:[9,46,46,9],11:[11,44,45,47]};
  return variants[prop.sprite]?.[variant]??prop.sprite;
}
