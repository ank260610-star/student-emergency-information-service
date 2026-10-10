import * as T from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

function brickMaterial(){
 const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');x.fillStyle='#706251';x.fillRect(0,0,512,256);
 for(let r=0;r<32;r++)for(let k=-1;k<32;k++){const v=((r*19+k*11)%23+23)%23;x.fillStyle=`rgb(${111+v},${79+v},${56+v})`;x.fillRect(k*24+(r%2)*12,r*8,23,7)}
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(5,2);return new T.MeshStandardMaterial({map,roughness:.92});
}
function box(group,w,h,d,x,y,z,material){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;group.add(m);return m}

/** Office facade based on the explicitly captioned Integrated Service Building photograph
 * provided by GPC of TADI to gooood, image 030. Hidden rear/roof details are approximations. */
export function officeModel(points,name){
 const g=new T.Group();g.name=name;const center=points.slice(0,-1).reduce((v,p)=>v.add(p),new T.Vector3()).multiplyScalar(1/(points.length-1));
 // Local axes follow the mapped north/south and east/west edges.
 const northEdge=points[3].clone().sub(points[0]);const w=northEdge.length(),d=points[1].distanceTo(points[0]);
 g.position.copy(center);g.rotation.y=-Math.atan2(northEdge.z,northEdge.x);
 const brick=brickMaterial(),stone=new T.MeshStandardMaterial({color:0xbcb9ab,roughness:.86}),glass=new T.MeshStandardMaterial({color:0x294955,metalness:.4,roughness:.3}),metal=new T.MeshStandardMaterial({color:0x343b3d});
 const front=d/2;
 // Lower two-storey street wing, with an inset stone-framed entrance at one end.
 box(g,w,10.8,d,0,5.4,0,brick);
 box(g,w,12,d*.53,0,16.8,-d*.235,brick);
 box(g,w+1,.4,d+1,0,.2,0,stone);
 const porchWidth=17,porchX=-w/2+porchWidth/2+6;
 box(g,porchWidth,8,.3,porchX,4.4,front+.16,glass);
 box(g,porchWidth+1,1.25,4,porchX,8.55,front+.9,stone);
 for(let j=0;j<4;j++){const pier=box(g,.8,7.1,2.8,porchX-6+j*4,4.15,front+1,brick);pier.rotation.z=-.07}
 // Tall recessed windows on the low wing.
 for(let x=-w/2+3;x<w/2-2;x+=3){if(x>porchX-10&&x<porchX+10)continue;box(g,1.25,7.6,.18,x,4.8,front+.15,glass);box(g,1.5,.28,.55,x,8.75,front+.35,stone);for(const y of [2.2,4.7,7.2])box(g,1.3,.12,.22,x,y,front+.27,metal)}
 for(const side of [-1,1]){for(let z=-d/2+3;z<d/2-2;z+=3.2){box(g,.18,7.6,1.1,side*(w/2+.1),4.8,z,glass);box(g,.5,10.7,.85,side*(w/2+.25),5.4,z+1.2,brick)}}
 // Setback upper office floors: small independent vertical openings, not strip windows.
 for(let floor=0;floor<3;floor++){const y=12.8+floor*3.6;for(let x=-w/2+3;x<w/2-2;x+=2.6){for(const z of [-d/2-.12,d*.03+.12]){box(g,.82,2.45,.2,x,y,z,glass);box(g,.82,.3,.28,x,y-1.05,z+.04,stone)}}for(const side of [-1,1])for(let z=-d/2+3;z<d*.03-1;z+=2.6)box(g,.2,2.45,.82,side*(w/2+.12),y,z,glass)}
 box(g,w,.25,d*.53,0,22.95,-d*.235,stone);
 for(let i=0;i<6;i++)box(g,porchWidth+7,.18,1.1,porchX,.1+i*.18,front+8-i*1.1,stone);
 g.userData.reference='https://www.gooood.cn/library-integrated-service-building-of-nankai-university-new-campus-china-by-gpc-of-tadi.htm';g.userData.approximation='23m height and unphotographed surfaces estimated; OSM footprint retained';return g;
}

function flowerTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.fillStyle='#e9e8df';x.fillRect(0,0,512,512);
 for(let row=0;row<4;row++)for(let col=0;col<4;col++){const cx=col*128+64,cy=row*128+64;x.strokeStyle='#a1a69f';x.lineWidth=1;x.strokeRect(col*128,row*128,128,128);
  if((row+col*3)%5===0)continue;
  for(let j=0;j<8;j++){const a=j*Math.PI/4,r=(row+col)%3===0?36:48;x.save();x.translate(cx,cy);x.rotate(a);x.beginPath();x.moveTo(10,0);x.lineTo(r,-r*.34);x.lineTo(r,r*.34);x.closePath();x.globalCompositeOperation='destination-out';x.fill();x.restore()}
 }
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;
}

/** Six-volume mapped outline, official 15 m height; curtain-wall ornament is procedural. */
export function activityModel(points){
 const g=new T.Group();g.name='大通学生活动中心';const center=new T.Vector3();const bounds=new T.Box3().setFromPoints(points);bounds.getCenter(center);
 // Place the courtyard in the central connecting neck, preserving the mapped six wings.
 const court=new T.Vector3(center.x-2,0,center.z+3),radius=8.5;
 function shape(){const s=new T.Shape(points.map(p=>new T.Vector2(p.x,-p.z)));const hole=new T.Path();hole.absarc(court.x,-court.z,radius,0,Math.PI*2,true);s.holes.push(hole);return s}
 const white=new T.MeshStandardMaterial({color:0xe5e3d9,roughness:.65}),glass=new T.MeshStandardMaterial({color:0x50757c,metalness:.4,roughness:.24}),floor=new T.MeshStandardMaterial({color:0x9c8c6e,roughness:.95});
 function slab(height,y,material){const geometry=new T.ExtrudeGeometry(shape(),{depth:height,bevelEnabled:false,curveSegments:20});geometry.rotateX(-Math.PI/2);const m=new T.Mesh(geometry,material);m.position.y=y;m.castShadow=m.receiveShadow=true;g.add(m);return m}
 slab(.4,.3,white);slab(4.8,.7,glass);slab(.4,5.5,white);slab(8.7,5.9,glass);slab(.4,14.6,white);
 const tile=flowerTexture();
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],len=a.distanceTo(b);if(len<.2)continue;const yaw=Math.atan2(b.x-a.x,b.z-a.z),mid=a.clone().add(b).multiplyScalar(.5),normal=new T.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  const map=tile.clone();map.needsUpdate=true;map.repeat.set(len/9,1);const skin=new T.MeshStandardMaterial({map,alphaTest:.5,side:T.DoubleSide,roughness:.65});
  for(const direction of [-1,1]){const screen=new T.Mesh(new T.PlaneGeometry(len,9),skin);screen.rotation.y=yaw+Math.PI/2;screen.position.copy(mid).addScaledVector(normal,direction*.12);screen.position.y=10;screen.castShadow=true;g.add(screen)}
  for(let j=0;j<len;j+=2.4){const p=a.clone().lerp(b,j/len);box(g,.09,4.7,.09,p.x,3.05,p.z,white)}
 }
 // Open central courtyard: lower paved floor and glazed balustrade.
 const courtFloor=new T.Mesh(new T.CircleGeometry(radius,48),floor);courtFloor.rotation.x=-Math.PI/2;courtFloor.position.copy(court);courtFloor.position.y=.25;g.add(courtFloor);
 const inner=new T.Mesh(new T.CylinderGeometry(radius,radius,5,48,1,true),new T.MeshStandardMaterial({color:0x385a64,metalness:.3,roughness:.3,side:T.DoubleSide}));inner.position.copy(court);inner.position.y=3;g.add(inner);
 g.userData.reference='https://news.nankai.edu.cn/gynk/system/2021/01/15/030044035.shtml';g.userData.approximation='courtyard geometry, elevations and perforation pattern approximated from photographs';g.userData.courtyard={x:court.x,z:court.z,radius};return g;
}
