import { ROBOT_STYLES } from './robots.js';

// Hand-drawn pixel adaptation of AutumNation's middle-tier yard robots.
// Integer rectangles keep every detail crisp at the game's native resolution.
const LEAF_COLORS=['#df7b35','#eab84e','#bb523e','#c39455','#a8ac58'];
function rect(c,color,x,y,w,h){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);}

export function drawPixelLeaf(c,x,y,color=0,flip=0,small=false){
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(flip?-1:1,1);
  const tint=LEAF_COLORS[color%LEAF_COLORS.length];
  if(small){rect(c,tint,-2,-2,4,2);rect(c,tint,-1,-3,2,4);rect(c,'#795132',0,0,1,2);}
  else{
    rect(c,'#433d26',-3,1,7,2);rect(c,tint,-4,-2,8,2);rect(c,tint,-2,-4,5,6);
    rect(c,tint,0,-5,2,1);rect(c,'#f1ce77',0,-3,1,4);rect(c,'#795132',1,1,1,3);
  }
  c.restore();
}

export function drawLeafBin(c,s,bin,time){
  c.save();c.translate(Math.round(s.x),Math.round(s.y));
  rect(c,'#26372b88',-22,0,45,5);
  rect(c,'#3b382a',-22,-24,44,27);rect(c,'#6c7967',-20,-22,40,23);
  rect(c,'#98a18a',-20,-23,39,3);rect(c,'#313c2e',-18,-20,36,13);
  // The visible mound rises but always leaves room below the lip.
  const height=Math.round(bin.fill*9);
  for(let n=0;n<27;n++){
    const x=-15+(n*11%31),y=-11-(n*7%Math.max(3,height+2));
    drawPixelLeaf(c,x,y,n%5,n%2,true);
  }
  rect(c,'#7e8c73',-20,-9,40,10);rect(c,'#a8b294',-22,-12,44,3);
  rect(c,'#536451',-16,-8,2,8);rect(c,'#536451',14,-8,2,8);
  rect(c,'#c2c8a5',-20,-22,2,21);rect(c,'#46533f',18,-21,2,22);
  rect(c,'#343f31',-17,1,5,3);rect(c,'#343f31',12,1,5,3);
  // A leaf emblem, never a count or a bag label.
  drawPixelLeaf(c,0,-5,1,0,true);
  if(bin.pulse>0)for(let n=0;n<3;n++)drawPixelLeaf(c,-9+n*9,-22-Math.round(Math.sin((1-bin.pulse)*Math.PI)*8),n,0,true);
  c.restore();
}

export function drawLeafRobot(c,s,r,time){
  const st=ROBOT_STYLES[r.style],wide=st.wide?2:st.slim?-2:0,bob=r.moving?Math.floor(Math.sin(r.walk*.4)*.7):0;
  const picking=r.state==='picking',dumping=r.state==='depositing';
  c.save();c.translate(Math.round(s.x),Math.round(s.y));
  rect(c,'#26372b88',-15,0,31,4);c.scale(r.face,1);
  // Tier two: rubber lugs and orange hubs, before polished bearing wheels.
  rect(c,'#302e28',-13-wide,-7,26+wide*2,8);rect(c,'#4e4c40',-12-wide,-6,24+wide*2,5);
  for(let x=-11-wide;x<12+wide;x+=5)rect(c,'#77725c',x+(r.moving?Math.floor(r.walk/3)%3:0),-7,2,2);
  for(const x of [-8-wide,8+wide]){rect(c,'#242b29',x-3,-6,6,6);rect(c,'#c7763c',x-2,-5,4,4);rect(c,'#ecc28b',x-1,-5,1,1);}
  c.translate(0,bob);
  // Cream enamel chassis, colored belt, rivets and some well-earned wear.
  rect(c,'#3d3b30',-10-wide,-23,20+wide*2,17);rect(c,st.shade,-9-wide,-22,18+wide*2,15);
  rect(c,st.body,-9-wide,-22,16+wide*2,12);rect(c,'#f1e5c8',-7-wide,-22,12+wide*2,1);
  rect(c,st.band,-9-wide,-17,18+wide*2,4);rect(c,'#6b624c',-7-wide,-9,2,1);
  rect(c,'#ded9ba',5+wide,-11,3,3);rect(c,'#8d663f',-7-wide,-20,1,1);
  if(st.patch){rect(c,'#87968d',-7,-12,6,4);rect(c,'#d1c9ac',-6,-11,1,1);}
  // Neck and amber cyclops eye; the lens looks in the direction of travel.
  rect(c,'#55574a',-3,-26,6,3);rect(c,'#393b31',-8,-37,17,12);
  rect(c,st.shade,-7,-36,15,10);rect(c,st.head,-7,-36,13,8);
  rect(c,'#f5e9cd',-5,-36,10,1);rect(c,'#35382e',1,-34,7,7);
  rect(c,'#c17c2f',2,-33,5,5);rect(c,'#f5c452',3,-33,4,4);rect(c,'#fff1bd',4,-33,2,2);
  rect(c,'#757966',-10,-32,3,4);rect(c,'#b9bca1',-9,-32,1,2);
  rect(c,'#767c65',-4,-41,1,4);rect(c,'#dd9255',-5,-42,3,2);
  if(st.hat){rect(c,'#515e5c',-9,-38,19,2);rect(c,'#899794',-6,-44,12,6);rect(c,'#bec8bc',-5,-44,8,1);rect(c,'#626f6b',-6,-41,12,1);}
  if(st.sprout){rect(c,'#788c48',-2,-42,1,5);rect(c,'#b7c873',-5,-43,4,2);rect(c,'#8ea75c',-1,-44,4,2);}
  // Wicker basket: visibly upgraded beyond a tin pail, below a steel hopper.
  const by=dumping?-27:-16;
  rect(c,'#4e3d2b',-18,by-1,11,9);rect(c,'#b8894c',-17,by,9,7);
  rect(c,'#d5ad69',-19,by-2,13,2);
  for(let x=-16;x<-8;x+=3)rect(c,'#78532e',x,by,1,7);
  rect(c,'#d0a265',-17,by+3,9,1);
  for(let n=0;n<r.cargo;n++)drawPixelLeaf(c,-16+n*3,by-3-n%2,n+r.style,0,true);
  // A telescoping arm and three-tooth rake visibly reach down while picking.
  const reach=picking?5+Math.floor(Math.sin(time*12)*2):0,armY=picking?-10:-18;
  rect(c,'#454e47',10+wide,-22,4,5);rect(c,'#9ba89b',12+wide,-20,3,armY+22);
  rect(c,'#6b7d72',13+wide,armY,8+reach,3);rect(c,'#c6cdb3',14+wide,armY,6+reach,1);
  rect(c,'#536353',20+wide+reach,armY,2,8);
  for(let n=0;n<3;n++)rect(c,'#bec6a7',18+wide+reach+n*2,armY+6,1,4);
  if(picking)drawPixelLeaf(c,20+wide+reach,armY+9,1,0,true);
  if(dumping){const t=(1.1-r.timer)/1.1;for(let n=0;n<3;n++)drawPixelLeaf(c,-12+n*4,-30-Math.round(Math.sin(t*Math.PI)*12),n+r.style,0,true);}
  c.restore();
}

export function drawRobotLeaves(renderer){
  const {game:g,ctx:c}=renderer;
  for(const colony of g.world.robotColonies||[]){
    if(!renderer.visible(colony.x,colony.y,240))continue;
    for(const leaf of colony.leaves){
      if(leaf.readyAt>g.time||!renderer.visible(leaf.x,leaf.y,10))continue;
      const s=renderer.screen(leaf.x,leaf.y);drawPixelLeaf(c,s.x,s.y,leaf.color,leaf.flip);
    }
  }
}
