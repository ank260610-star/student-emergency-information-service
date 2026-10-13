// A hidden parent hides every descendant; static batches must retain that rule.
export function isWorldVisible(object){
 for(let node=object;node;node=node.parent)if(node.visible===false)return false;
 return true;
}

// Forward rolling means the top of the wheel moves forward, the contact patch backward.
export function wheelRollDirection(axle,forward){
 return axle.x*forward.z-axle.z*forward.x>=0?1:-1;
}

export function orientedBoxHit(x,z,collider,radius){
 const dx=x-collider.x,dz=z-collider.z,yaw=collider.box.yaw||0,c=Math.cos(yaw),s=Math.sin(yaw),localX=c*dx-s*dz,localZ=s*dx+c*dz;
 const outsideX=Math.max(0,Math.abs(localX)-collider.box.halfX),outsideZ=Math.max(0,Math.abs(localZ)-collider.box.halfZ);
 return outsideX*outsideX+outsideZ*outsideZ<radius*radius||(outsideX===0&&outsideZ===0);
}
