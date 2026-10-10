import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.78,metalness:.04,...extra});

function campusSign(text,position){
  const c=document.createElement('canvas'),x=c.getContext('2d');c.width=512;c.height=96;x.fillStyle='rgba(18,31,32,.82)';x.roundRect(6,6,500,84,13);x.fill();x.strokeStyle='#e7ca71';x.lineWidth=3;x.stroke();x.font='700 30px Noto Sans SC, sans-serif';x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,48);
  const t=new THREE.CanvasTexture(c),s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:true}));s.position.copy(position);s.scale.set(32,6,1);return s;
}

function waterRibbon(points,width){
  const vertices=[],uv=[];for(let i=0;i<points.length;i++){const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1,nx=-dz/l*width*.5,nz=dx/l*width*.5,p=points[i];vertices.push(p.x+nx,.22,p.z+nz,p.x-nx,.22,p.z-nz);uv.push(0,i/(points.length-1),1,i/(points.length-1))}const idx=[];for(let i=0;i<points.length-1;i++){const n=i*2;idx.push(n,n+1,n+2,n+1,n+3,n+2)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return new THREE.Mesh(g,new THREE.MeshPhysicalMaterial({color:0x3e9bb6,roughness:.18,metalness:.1,clearcoat:.7,transparent:true,opacity:.9}));
}

function tree(x,z,scale=1){const g=new THREE.Group(),trunk=new THREE.Mesh(new THREE.CylinderGeometry(.26*scale,.44*scale,3.4*scale,7),mat(0x5a412a)),leaf=mat(0x24593a,{roughness:.94});trunk.position.y=1.7*scale;g.add(trunk);for(const [dx,dy,dz,r] of [[0,4.2,0,2.2],[-.8,3.7,.2,1.5],[.8,3.9,-.1,1.55]]){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(r*scale,1),leaf);crown.position.set(dx*scale,dy*scale,dz*scale);crown.scale.y=.95;g.add(crown)}g.position.set(x,0,z);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}

function bridge(p,angle=0){const g=new THREE.Group(),stone=mat(0xd0c7b1,{roughness:.9}),rail=mat(0xeee8d5,{metalness:.25});const deck=new THREE.Mesh(new THREE.BoxGeometry(18,.55,7),stone);deck.position.y=.65;g.add(deck);for(const z of [-2.6,2.6]){const r=new THREE.Mesh(new THREE.BoxGeometry(18,.8,.16),rail);r.position.set(0,1.35,z);g.add(r)}g.position.copy(p);g.rotation.y=angle;g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g}

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
  const sport=world(38.98465,117.3323),track=new THREE.Mesh(new THREE.RingGeometry(22,29,48),mat(0xb8745a,{roughness:.87}));track.rotation.x=-Math.PI/2;track.scale.z=.62;track.position.set(sport.x,.24,sport.z);g.add(track);const field=new THREE.Mesh(new THREE.CircleGeometry(1,48),mat(0x427d48));field.scale.set(21,14,1);field.rotation.x=-Math.PI/2;field.position.set(sport.x,.27,sport.z);g.add(field);g.add(campusSign('田径场与球场组团',sport.clone().add(new THREE.Vector3(0,9,0))));
  const westGate=world(38.98215,117.3282),gateMat=mat(0x934d3a,{roughness:.72}),pale=mat(0xd8c7ad);for(const x of [-10,10]){const pillar=new THREE.Mesh(new THREE.BoxGeometry(3.2,9,3.2),gateMat);pillar.position.set(westGate.x+x,4.5,westGate.z);g.add(pillar)}const lintel=new THREE.Mesh(new THREE.BoxGeometry(25,2.4,2.4),pale);lintel.position.set(westGate.x,8,westGate.z);g.add(lintel);g.add(campusSign('西校门',westGate.clone().add(new THREE.Vector3(0,13,0))));
  scene.add(g);return {group:g,waterPaths:[{points:south,width:24},{points:east,width:12}],bridgeZones};
}
