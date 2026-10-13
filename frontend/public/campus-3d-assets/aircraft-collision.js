import {withinCourtyard} from './collision.js';

function inside(point,polygon){
 let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j];if((a.z>point.z)!==(b.z>point.z)&&point.x<(b.x-a.x)*(point.z-a.z)/(b.z-a.z)+a.x)hit=!hit;
 }return hit;
}
function edgeHitsBox(a,b,box){
 let lo=0,hi=1;for(const axis of ['x','z']){
  const delta=b[axis]-a[axis];if(Math.abs(delta)<1e-10){if(a[axis]<box.min[axis]||a[axis]>box.max[axis])return false;continue;}
  const t1=(box.min[axis]-a[axis])/delta,t2=(box.max[axis]-a[axis])/delta;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return false;
 }return true;
}
function overlaps(points,pose,bounds){
 const yaw=pose.heading+Math.PI,c=Math.cos(yaw),s=Math.sin(yaw);
 const local=points.map(p=>{const x=p.x-pose.x,z=p.z-pose.z;return {x:c*x-s*z,z:s*x+c*z}});
 if(local.some((p,i)=>edgeHitsBox(p,local[(i+1)%local.length],bounds)))return true;
 return inside({x:(bounds.min.x+bounds.max.x)/2,z:(bounds.min.z+bounds.max.z)/2},local);
}
function fixturePoints(f){
 if(!f.box){const r=f.r||.5;return Array.from({length:16},(_,i)=>({x:f.x+Math.cos(i*Math.PI/8)*r,z:f.z+Math.sin(i*Math.PI/8)*r}));}
 const c=Math.cos(f.box.yaw||0),s=Math.sin(f.box.yaw||0);
 return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>({x:f.x+c*x*f.box.halfX+s*z*f.box.halfZ,z:f.z-s*x*f.box.halfX+c*z*f.box.halfZ}));
}
// Sweep the visible model's conservative oriented bounds through X/Z and altitude.
// Rotation samples also cover a wing tip moving while the centre stays still.
export function aircraftPathBlocked(from,to,{bounds,buildings,fixtures=[],inWater=()=>false}){
 const turn=Math.atan2(Math.sin(to.heading-from.heading),Math.cos(to.heading-from.heading));
 const radius=Math.max(Math.hypot(bounds.min.x,bounds.min.z),Math.hypot(bounds.max.x,bounds.max.z));
 const travel=Math.hypot(to.x-from.x,to.z-from.z,to.y-from.y)+Math.abs(turn)*radius;
 const steps=Math.max(1,Math.ceil(travel/.5));
 for(let n=0;n<=steps;n++){
  const t=n/steps,p={x:from.x+(to.x-from.x)*t,z:from.z+(to.z-from.z)*t,y:from.y+(to.y-from.y)*t,heading:from.heading+turn*t};
  const bottom=p.y+bounds.min.y,top=p.y+bounds.max.y;
  if(bottom<.3&&inWater(p.x,p.z))return true;
  for(const b of buildings){if(bottom>Math.max(b.height||0,b.box?.max?.y||0)||top<0||withinCourtyard(b.courtyard,p.x,p.z,radius))continue;if(overlaps(b.points,p,bounds))return true;}
  for(const f of fixtures){if(bottom>(f.maxY??12)||top<(f.minY??0))continue;if(overlaps(fixturePoints(f),p,bounds))return true;}
 }
 return false;
}
