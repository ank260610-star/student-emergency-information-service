import * as THREE from './vendor/three/build/three.module.js';

const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.78,metalness:.04,...extra});

function campusSign(text,position){
  const c=document.createElement('canvas'),x=c.getContext('2d');c.width=512;c.height=96;x.fillStyle='rgba(18,31,32,.82)';x.roundRect(6,6,500,84,13);x.fill();x.strokeStyle='#e7ca71';x.lineWidth=3;x.stroke();x.font='700 30px Noto Sans SC, sans-serif';x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,48);
  const t=new THREE.CanvasTexture(c),s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:true}));s.position.copy(position);s.scale.set(32,6,1);return s;
}

function waterRibbon(points,width){
  const vertices=[],uv=[];for(let i=0;i<points.length;i++){const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1,nx=-dz/l*width*.5,nz=dx/l*width*.5,p=points[i];vertices.push(p.x+nx,.22,p.z+nz,p.x-nx,.22,p.z-nz);uv.push(0,i/(points.length-1),1,i/(points.length-1))}const idx=[];for(let i=0;i<points.length-1;i++){const n=i*2;idx.push(n,n+1,n+2,n+1,n+3,n+2)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#3b94ad';x.fillRect(0,0,256,256);for(let y=0;y<256;y+=12){x.strokeStyle=`rgba(206,244,244,${.16+(y%36)/180})`;x.lineWidth=2;x.beginPath();for(let xx=0;xx<=256;xx+=8){const yy=y+Math.sin(xx*.08+y)*3;if(xx===0)x.moveTo(xx,yy);else x.lineTo(xx,yy)}x.stroke();}const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(3,12);return new THREE.Mesh(g,new THREE.MeshPhysicalMaterial({color:0xffffff,map:tex,roughness:.14,metalness:.12,clearcoat:1,clearcoatRoughness:.18,transparent:true,opacity:.9}));
}

function tree(x,z,scale=1){const g=new THREE.Group(),trunk=new THREE.Mesh(new THREE.CylinderGeometry(.26*scale,.44*scale,3.4*scale,7),mat(0x5a412a)),leaf=mat(0x24593a,{roughness:.94});trunk.position.y=1.7*scale;g.add(trunk);for(const [dx,dy,dz,r] of [[0,4.2,0,2.2],[-.8,3.7,.2,1.5],[.8,3.9,-.1,1.55]]){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(r*scale,1),leaf);crown.position.set(dx*scale,dy*scale,dz*scale);crown.scale.y=.95;g.add(crown)}g.position.set(x,0,z);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}

function bridge(p,angle=0){const g=new THREE.Group(),stone=mat(0xd0c7b1,{roughness:.9}),rail=mat(0xeee8d5,{metalness:.25});const deck=new THREE.Mesh(new THREE.BoxGeometry(18,.55,7),stone);deck.position.y=.65;g.add(deck);for(const z of [-2.6,2.6]){const r=new THREE.Mesh(new THREE.BoxGeometry(18,.8,.16),rail);r.position.set(0,1.35,z);g.add(r)}g.position.copy(p);g.rotation.y=angle;g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}

// Vehicle gates are deliberately individual landmarks: road markings, booths and barriers are
// visible from the driver view instead of a generic campus arch.
function vehicleGate(position,label,{closed=false}={}){
  const g=new THREE.Group(),asphalt=mat(0x303439,{roughness:.96}),paint=mat(0xe9e7d8,{roughness:.84}),brick=mat(0x58362d),glass=mat(0x92b9c5,{metalness:.18,roughness:.22,transparent:true,opacity:.72}),metal=mat(0x30383b,{metalness:.76,roughness:.25}),boom=mat(0xf1f0e9,{metalness:.38,roughness:.42}),red=mat(0xd4403a,{emissive:0x410000});
  const road=new THREE.Mesh(new THREE.BoxGeometry(42,.12,28),asphalt);road.position.y=.08;g.add(road);
  // Zebra crossing at the campus side and separate two-lane markings.
  for(let x=-15;x<=15;x+=5){const stripe=new THREE.Mesh(new THREE.BoxGeometry(2.8,.025,4.4),paint);stripe.position.set(x,.155,8.5);g.add(stripe)}
  for(const z of [-4,4]){const lane=new THREE.Mesh(new THREE.BoxGeometry(36,.026,.22),paint);lane.position.set(0,.16,z);g.add(lane)}
  for(const x of [-7,7]){const arrow=new THREE.Mesh(new THREE.ConeGeometry(1.05,3.3,3),paint);arrow.rotation.x=Math.PI/2;arrow.rotation.z=Math.PI;arrow.position.set(x,.18,-2);g.add(arrow)}
  // Twin translucent security booths with red-white boom barriers.
  for(const x of [-10,10]){const booth=new THREE.Mesh(new THREE.BoxGeometry(4.1,3.4,3.3),glass);booth.position.set(x,1.75,1.4);g.add(booth);const roof=new THREE.Mesh(new THREE.BoxGeometry(4.5,.24,3.7),metal);roof.position.set(x,3.55,1.4);g.add(roof);const post=new THREE.Mesh(new THREE.BoxGeometry(.4,1.15,.4),metal);post.position.set(x+(x<0?2.8:-2.8),.68,-1.4);g.add(post);const barrier=new THREE.Mesh(new THREE.BoxGeometry(7.2,.14,.14),boom);barrier.position.set(x+(x<0?4.5:-4.5),1.22,-1.45);barrier.rotation.z=closed?0:(x<0?-.7:.7);g.add(barrier);const cap=new THREE.Mesh(new THREE.BoxGeometry(.7,.2,.2),red);cap.position.copy(barrier.position).add(new THREE.Vector3(0,.05,0));g.add(cap)}
  // Traffic-light gantry, curved street lights and short brick boundary walls.
  const gantry=new THREE.Mesh(new THREE.BoxGeometry(.34,6.5,.34),metal);gantry.position.set(-15,3.25,-8.5);g.add(gantry);const arm=new THREE.Mesh(new THREE.BoxGeometry(14,.26,.26),metal);arm.position.set(-8,6.15,-8.5);g.add(arm);const signal=new THREE.Mesh(new THREE.BoxGeometry(.8,1.8,.42),metal);signal.position.set(-1.5,5.55,-8.5);g.add(signal);for(const y of [5.15,5.55,5.95]){const lamp=new THREE.Mesh(new THREE.SphereGeometry(.16,8,8),y===5.55?red:mat(0x222222));lamp.position.set(-1.5,y,-8.76);g.add(lamp)}
  for(const x of [-19,19]){const wall=new THREE.Mesh(new THREE.BoxGeometry(5.8,2.1,1),brick);wall.position.set(x,1.05,4);g.add(wall);const pole=new THREE.Mesh(new THREE.CylinderGeometry(.13,.18,9,10),metal);pole.position.set(x,4.5,-5);g.add(pole);const light=new THREE.Mesh(new THREE.SphereGeometry(.38,10,8),mat(0xf4e8c0,{emissive:0x332200}));light.position.set(x+(x<0?1:-1),8.35,-5);g.add(light)}
  g.add(campusSign(label,new THREE.Vector3(0,10,0)));g.position.copy(position);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g;
}

export function addMasterplanDetails(scene,world){
  const g=new THREE.Group();g.name='津南校区沙盘总平面增强';
  // Sand-table references show a continuous southern water system, tree-lined banks and small bridges.
  const south=[world(38.98165,117.3278),world(38.98148,117.332),world(38.98158,117.336),world(38.98138,117.340),world(38.98154,117.344),world(38.98142,117.348),world(38.98155,117.3514)];
  const east=[world(38.98145,117.3472),world(38.9834,117.3471),world(38.9851,117.3467),world(38.987,117.3462)];
  g.add(waterRibbon(south,24),waterRibbon(east,12));
  const bridgeZones=[];for(const i of [1,3,5]){const p=south[i].clone();g.add(bridge(p,Math.PI/2));bridgeZones.push({x:p.x,z:p.z,r:11})}
  for(let i=0;i<south.length-1;i++){const a=south[i],b=south[i+1],len=a.distanceTo(b),count=Math.max(3,Math.floor(len/12));for(let n=0;n<=count;n++){const t=n/count,x=THREE.MathUtils.lerp(a.x,b.x,t),z=THREE.MathUtils.lerp(a.z,b.z,t);g.add(tree(x,z-16,.85),tree(x,z+16,.78))}}
  // Ecological wetland: islands, curved paths and dense layered planting, drawn from the physical campus model.
  const wetland=world(38.98305,117.3448),grass=mat(0x4e8444,{roughness:1});for(const [dx,dz,rx,rz] of [[0,0,15,9],[-17,7,10,6],[18,-8,12,7]]){const island=new THREE.Mesh(new THREE.CircleGeometry(1,28),grass);island.scale.set(rx,rz,1);island.rotation.x=-Math.PI/2;island.position.set(wetland.x+dx,.35,wetland.z+dz);g.add(island);for(let k=0;k<10;k++){const a=k*2.4+dx,d=3+(k%4)*1.5;g.add(tree(wetland.x+dx+Math.cos(a)*d,wetland.z+dz+Math.sin(a)*d,.46+(k%3)*.08))}}
  g.add(campusSign('生态湿地与水系',wetland.clone().add(new THREE.Vector3(0,9,0))));
  // Track and courts replicate the clear athletic cluster visible beside student living areas.
  for(const [lat,lon,name,rx,rz] of [[38.98465,117.3323,'西区田径场',22,14],[38.99165,117.33945,'北区田径场',30,18]]){const sport=world(lat,lon),track=new THREE.Mesh(new THREE.RingGeometry(22,29,64),mat(0xb8745a,{roughness:.87}));track.rotation.x=-Math.PI/2;track.scale.set(rx/25,rz/16,1);track.position.set(sport.x,.24,sport.z);g.add(track);const field=new THREE.Mesh(new THREE.CircleGeometry(1,64),mat(0x427d48));field.scale.set(rx*.84,rz*.78,1);field.rotation.x=-Math.PI/2;field.position.set(sport.x,.27,sport.z);g.add(field);for(const side of [-1,1]){const goal=new THREE.Mesh(new THREE.BoxGeometry(5,.08,2.2),mat(0xe7e1cf,{metalness:.25}));goal.position.set(sport.x+side*rx*.62,.9,sport.z);g.add(goal);}g.add(campusSign(name,sport.clone().add(new THREE.Vector3(0,9,0))));}
  const westGate=world(38.98215,117.3282);g.add(vehicleGate(westGate,'西门 · 车辆主入口'));
  // Separate north-west service entrance: lower brick guardhouse, road markings and closed barrier.
  const northWestGate=world(38.98805,117.32855);g.add(vehicleGate(northWestGate,'西北门 · 校园车辆入口',{closed:true}));
  scene.add(g);return {group:g,waterPaths:[{points:south,width:24},{points:east,width:12}],bridgeZones};
}
