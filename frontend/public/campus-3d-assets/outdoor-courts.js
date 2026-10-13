import * as T from './vendor/three/build/three.module.js';
import {optimizePhotoDetails} from './campus-photo-details.js?v=3d-flight-1';

// Counts: NKU Sports Department. North/south zoning: NKU Archives 2020
// satellite image and the bundled 2023 campus guide. Individual spacing is
// reconstructed; it is not a surveyed pitch footprint.
const paint=new T.MeshStandardMaterial({color:0xf7f4e8,roughness:.9});
const steel=new T.MeshStandardMaterial({color:0x285a45,roughness:.7,metalness:.35});
const brick=new T.MeshStandardMaterial({color:0x794a40,roughness:1});
function box(g,w,h,d,x,y,z,material,solid=false){
 const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=h>.3;m.receiveShadow=true;m.userData.photoSolid=solid;g.add(m);return m;
}
function texture(kind){
 const c=document.createElement('canvas');c.width=c.height=1024;const ctx=c.getContext('2d');
 const w=kind==='basketball'?32:18,d=kind==='basketball'?19:36;
 ctx.fillStyle='#b3685c';ctx.fillRect(0,0,1024,1024);ctx.save();ctx.scale(1024/w,1024/d);ctx.translate(w/2,d/2);
 ctx.fillStyle='#56826d';ctx.fillRect(kind==='basketball'?-14:-5.485,kind==='basketball'?-7.5:-11.885,kind==='basketball'?28:10.97,kind==='basketball'?15:23.77);
 ctx.strokeStyle='#f5f1df';ctx.lineWidth=.05;
 const line=(x,z,x2,z2)=>{ctx.beginPath();ctx.moveTo(x,z);ctx.lineTo(x2,z2);ctx.stroke()};
 const arc=(x,z,r,a,b)=>{ctx.beginPath();ctx.arc(x,z,r,a,b);ctx.stroke()};
 if(kind==='basketball'){
  ctx.strokeRect(-14,-7.5,28,15);line(0,-7.5,0,7.5);arc(0,0,1.8,0,Math.PI*2);
  for(const s of [-1,1]){
   ctx.strokeRect(s<0?-14:8.2,-2.45,5.8,4.9);arc(s*8.2,0,1.8,0,Math.PI*2);
   const a=Math.acos(6.6/6.75);arc(s*12.425,0,6.75,s<0?-Math.PI/2+a:Math.PI/2+a,s<0?Math.PI/2-a:3*Math.PI/2-a);
   for(const side of [-1,1])line(s*14,side*6.6,s*(12.425-6.75*Math.sin(a)),side*6.6);
   arc(s*12.425,0,1.25,s<0?-Math.PI/2:Math.PI/2,s<0?Math.PI/2:3*Math.PI/2);
  }
 }else{
  ctx.strokeRect(-5.485,-11.885,10.97,23.77);ctx.strokeRect(-4.115,-11.885,8.23,23.77);
  for(const z of [-6.4,6.4])line(-4.115,z,4.115,z);line(0,-6.4,0,6.4);
  for(const s of [-1,1])line(0,s*11.885,0,s*11.785);
 }
 ctx.restore();
 // Deterministic aggregate flecks, kept below the contrast of the painted lines.
 for(let i=0;i<14000;i++){ctx.fillStyle=i%2?'rgba(255,255,255,.035)':'rgba(0,0,0,.035)';ctx.fillRect((i*173)%1024,(i*307+Math.floor(i/1024)*29)%1024,1,1)}
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;return new T.MeshStandardMaterial({map,roughness:.96});
}
function meshNet(g,w,h,x,y,z){
 const vertices=[];for(let a=-w/2;a<=w/2;a+=.2)vertices.push(a,0,0,a,h,0);for(let b=0;b<=h;b+=.2)vertices.push(-w/2,b,0,w/2,b,0);
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));const mesh=new T.LineSegments(geo,new T.LineBasicMaterial({color:0x496b59}));mesh.position.set(x,y,z);g.add(mesh);return mesh;
}
function hoop(g,s){
 const x=s*12.425;box(g,.22,3.5,.22,s*15.4,1.75,0,steel,true);box(g,3,.16,.16,s*13.9,3.5,0,steel);
 box(g,.10,1.05,1.8,x+s*.375,3.425,0,paint);
 const rim=new T.Mesh(new T.TorusGeometry(.225,.025,6,24),new T.MeshStandardMaterial({color:0xd96535}));rim.rotation.x=Math.PI/2;rim.position.set(x,3.05,0);g.add(rim);
 const net=new T.Mesh(new T.CylinderGeometry(.225,.14,.45,12,1,true),new T.MeshBasicMaterial({color:0xe5ded3,wireframe:true}));net.position.set(x,2.8,0);g.add(net);
}
function enclosure(g,w,d,height){
 const add=(a,b)=>{
  const span=a.distanceTo(b),mid=a.clone().add(b).multiplyScalar(.5),yaw=Math.atan2(b.x-a.x,b.z-a.z);
  const fence=new T.Group();fence.position.copy(mid);fence.rotation.y=yaw;g.add(fence);
  for(let z=-span/2;z<=span/2+.01;z+=span/Math.ceil(span/3))box(fence,.08,height,.08,0,height/2,z,steel);
  for(const y of [.12,height])box(fence,.08,.08,span,0,y,0,steel);
  const wire=meshNet(fence,span,height,0,0,0);wire.rotation.y=Math.PI/2;
  // Thin oriented barriers leave the central southern entrance open.
  const barrier=box(fence,.12,.2,span,0,.1,0,steel,true);barrier.visible=true;barrier.userData.photoCollisionHeight=height;
 };
 const v=(x,z)=>new T.Vector3(x,0,z);
 add(v(-w/2,-d/2),v(w/2,-d/2));add(v(-w/2,-d/2),v(-w/2,d/2));add(v(w/2,-d/2),v(w/2,d/2));
 add(v(-w/2,d/2),v(-2,d/2));add(v(2,d/2),v(w/2,d/2));
}
export function createOutdoorCourts(world){
 const g=new T.Group();g.name='文科室外篮球场与网球场';g.position.copy(world(38.99115,117.33930));g.rotation.y=-.26;
 g.userData.sources=['https://tyb.nankai.edu.cn/2861/list.htm','https://archives.nankai.edu.cn/info/1060/1902.htm'];g.userData.placementConfidence='campus-guide and satellite reconstruction';
 const basketball=texture('basketball'),tennis=texture('tennis');
 for(const [kind,cols,rows,spacingX,spacingZ,centerZ] of [['basketball',3,4,34,21,44],['tennis',4,2,18,36,-44]]){
  const block=new T.Group();block.name=kind==='basketball'?'文科篮球场 · 12块':'文科网球场 · 8块';block.position.z=centerZ;g.add(block);
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
   const court=new T.Group();court.name=`${kind}-${row+1}-${col+1}`;court.userData.courtKind=kind;court.position.set((col-(cols-1)/2)*spacingX,0,(row-(rows-1)/2)*spacingZ);block.add(court);
   const floor=box(court,kind==='basketball'?32:18,.1,kind==='basketball'?19:36,0,.12,0,kind==='basketball'?basketball:tennis);floor.name='球场地面';
   if(kind==='basketball'){hoop(court,-1);hoop(court,1)}else{
    for(const x of [-6.4,6.4])box(court,.08,1.07,.08,x,.535,0,steel,true);
    const net=meshNet(court,12.8,.92,0,.12,0);net.name='网球球网';box(court,12.8,.045,.045,0,1.05,0,paint);
   }
  }
  enclosure(block,cols*spacingX+2,rows*spacingZ+2,kind==='tennis'?4:3.4);
  for(const x of [-cols*spacingX/2,cols*spacingX/2])for(const z of [-rows*spacingZ/2,0,rows*spacingZ/2]){
   box(block,.16,8,.16,x,4,z,steel,true);box(block,1,.25,.6,x,8,z,paint);
  }
 }
 // Red-brick entry pavilion and a walk-through central opening from the south.
 box(g,9,3.2,4,7,1.6,89,brick,true);box(g,10,.3,6,7,3.35,89,brick);box(g,3,2,.1,7,1.8,91.1,paint);
 optimizePhotoDetails(g);return {group:g,solidColliders:g.userData.photoColliders};
}
