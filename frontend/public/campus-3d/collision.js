// Pure X/Z geometry shared by gameplay and regression tests.
export function pointToSegmentSq(px,pz,a,b){
  const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz;
  const t=l?Math.max(0,Math.min(1,((px-a.x)*dx+(pz-a.z)*dz)/l)):0;
  return (px-a.x-t*dx)**2+(pz-a.z-t*dz)**2;
}

export function nearPolygonEdge(x,z,points,radius){
  for(let i=0;i<points.length;i++){
    if(pointToSegmentSq(x,z,points[i],points[(i+1)%points.length])<radius*radius)return true;
  }
  return false;
}

export function sampledPathBlocked(from,to,radius,hit,crossing=()=>false){
  const distance=Math.hypot(to.x-from.x,to.z-from.z);
  const steps=Math.max(1,Math.ceil(distance/Math.min(.22,Math.max(.08,radius*.08))));
  let previous=from;
  for(let n=1;n<=steps;n++){
    const t=n/steps,p={x:from.x+(to.x-from.x)*t,z:from.z+(to.z-from.z)*t};
    if(crossing(previous,p,radius)||hit(p.x,p.z,radius))return true;
    previous=p;
  }
  return false;
}

// Courtyards use the same local rectangle as their visible opening.
export function withinCourtyard(court,x,z,bodyRadius=0){
 if(!court)return false;
 const dx=x-court.x,dz=z-court.z;
 if(court.width!==undefined){const c=Math.cos(court.yaw||0),s=Math.sin(court.yaw||0),lx=c*dx-s*dz,lz=s*dx+c*dz;return Math.abs(lx)<court.width/2-bodyRadius&&Math.abs(lz)<court.depth/2-bodyRadius;}
 return Math.hypot(dx,dz)<court.radius-bodyRadius;
}
