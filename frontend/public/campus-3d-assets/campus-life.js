import * as THREE from './vendor/three/build/three.module.js';
import {GLTFLoader} from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
import {createZhouStatue} from './zhou-statue.js';

const standard = (color, extra={}) => new THREE.MeshStandardMaterial({color, roughness:.7, metalness:.08, ...extra});

function campusLabel(text, p, accent=0xf6db57){
  const c=document.createElement('canvas'),ctx=c.getContext('2d'); c.width=512;c.height=96;
  ctx.fillStyle='rgba(12,29,30,.84)';ctx.roundRect(4,4,504,86,13);ctx.fill();ctx.strokeStyle='#'+accent.toString(16).padStart(6,'0');ctx.lineWidth=4;ctx.stroke();
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 30px Noto Sans SC, sans-serif';ctx.fillText(text,256,48);
  const tex=new THREE.CanvasTexture(c),s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:true,transparent:true}));s.position.copy(p);s.scale.set(30,5.6,1);s.renderOrder=21;return s;
}

function tree(x,z,scale=1){
  const g=new THREE.Group(), trunk=new THREE.Mesh(new THREE.CylinderGeometry(.42*scale,.62*scale,5.5*scale,8),standard(0x60452b));
  const foliage=standard(0x2d6a3d,{roughness:.93,metalness:.02});
  trunk.position.y=2.75*scale;g.add(trunk);
  for(const [dx,dy,dz,r] of [[0,7.8,0,3.3],[-1.6,7.0,.6,2.25],[1.7,7.2,-.4,2.45],[0,9.3,.2,2.45]]){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(r*scale,2),foliage);crown.position.set(dx*scale,dy*scale,dz*scale);crown.scale.y=.88;g.add(crown)}
  g.position.set(x,0,z);g.userData.collisionRadius=.52*scale;g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g;
}

function streetLamp(x,z){
  const g=new THREE.Group(),pole=standard(0x273238,{metalness:.62,roughness:.34}),warm=standard(0xffdca1,{emissive:0xffb760,emissiveIntensity:2.2,roughness:.24});
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.12,.18,8.4,10),pole);shaft.position.y=4.2;g.add(shaft);
  const arm=new THREE.Mesh(new THREE.BoxGeometry(1.15,.12,.12),pole);arm.position.set(.5,8.05,0);g.add(arm);
  const lantern=new THREE.Mesh(new THREE.BoxGeometry(.65,.28,.52),warm);lantern.position.set(1.0,7.85,0);g.add(lantern);
  const light=new THREE.PointLight(0xffc87a,0,34,2);light.position.set(1,7.65,0);g.add(light);g.position.set(x,0,z);g.userData.collisionRadius=.3;return {g,light};
}

function flowerBed(x,z,w,d){
  const g=new THREE.Group(), soil=new THREE.Mesh(new THREE.BoxGeometry(w,.22,d),standard(0x4e3a2b,{roughness:1}));soil.position.y=.12;g.add(soil);
  const colors=[0xf3d047,0xf3f1e9,0xdf5d74,0xa875bd];
  for(let ix=-w/2+1;ix<w/2;ix+=1.8)for(let iz=-d/2+1;iz<d/2;iz+=1.7){const stem=new THREE.Mesh(new THREE.CylinderGeometry(.035,.055,.4,5),standard(0x2f743a));stem.position.set(ix,.35,iz);g.add(stem);const petal=new THREE.Mesh(new THREE.SphereGeometry(.22,6,5),standard(colors[Math.abs(Math.round(ix*7+iz*11))%colors.length]));petal.scale.y=.55;petal.position.set(ix,.62,iz);g.add(petal)}
  g.position.set(x,0,z); return g;
}


function publicBike(color=0xf1b92b,kind='meituan'){
  const g=new THREE.Group(),paint=standard(color,{metalness:.25,roughness:.45}),black=standard(0x15191a,{roughness:.9});
  const wheels=[];for(const x of [-1.4,1.4]){const wheel=new THREE.Mesh(new THREE.TorusGeometry(1.0,.12,7,18),black);wheel.rotation.y=Math.PI/2;wheel.position.set(x,1.05,0);g.add(wheel);wheels.push(wheel)}
  const tube=(a,b,r=.11)=>{const len=a.distanceTo(b),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,6),paint);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());g.add(m)};
  const seat=new THREE.Vector3(-.2,2.3,0), crank=new THREE.Vector3(0,1.25,0), front=new THREE.Vector3(1.4,2.55,0),rear=new THREE.Vector3(-1.4,1.05,0),fw=new THREE.Vector3(1.4,1.05,0);tube(rear,seat);tube(seat,crank);tube(crank,rear);tube(crank,front);tube(seat,front);tube(front,fw);const saddle=new THREE.Mesh(new THREE.BoxGeometry(.8,.18,.34),black);saddle.position.copy(seat).add(new THREE.Vector3(-.18,.18,0));g.add(saddle);
  const basket=new THREE.Mesh(new THREE.BoxGeometry(.55,.45,.55),standard(0xced7d5,{metalness:.45,roughness:.5}));basket.position.set(1.45,2.15,.05);g.add(basket);
  if(kind==='byte'){const battery=new THREE.Mesh(new THREE.BoxGeometry(1.05,.52,.58),standard(0x15191a,{metalness:.42,roughness:.32}));battery.position.set(-.1,1.6,.08);g.add(battery)}
  const brand=campusLabel(kind==='meituan'?'黄色共享单车':kind==='red-bike'?'红色共享单车':'蓝色共享 E-BIKE',new THREE.Vector3(0,2.7,.18),color);brand.scale.set(3.1,.55,1);g.add(brand);g.userData={wheels,type:kind==='meituan'?'meituan-bike':kind==='red-bike'?'red-bike':'byte-ebike'};g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g;
}

// This CC0 bicycle is an authored GLB, not a procedural wheel replacement.
// Its wheel pivots are declared by the asset author as wheel-bike-front/rear.
function mountSharedBikeModel(bike, template){
  const original=template.clone(true);
  original.name='授权共享单车原始GLB';
  original.scale.setScalar(1.05);
  // Authored bicycle faces +Z; the legacy fleet holder faces +X.
  original.rotation.y=-Math.PI/2;
  const originalChildren=[...bike.children];
  originalChildren.forEach(child=>child.visible=false);
  bike.add(original);
  const wheels=[],frontWheels=[];
  original.traverse(node=>{
    if(node.name==='wheel-bike-front'||node.name==='wheel-bike-rear'){
      node.userData.baseQuaternion=node.quaternion.clone();
      node.userData.wheelSpin=0;
      wheels.push(node);
      if(node.name==='wheel-bike-front')frontWheels.push(node);
    }
    if(node.isMesh){node.castShadow=true;node.receiveShadow=true;if(node.name==='wheel-bike-front'||node.name==='wheel-bike-rear'){node.material=node.material?.clone?.()||node.material;if(node.material){node.material.metalness=.82;node.material.roughness=.24;}}}
  });
  // Yellow, blue and red are original campus-fleet colourways. Brand marks are
  // intentionally not copied from Meituan, ByteDance or Ele.me assets.
  const paint= bike.userData.type==='meituan-bike' ? 0xf3b61f : bike.userData.type==='red-bike' ? 0xde4343 : 0x2d92dd;
  original.traverse(node=>{if(node.isMesh&&/delivery-bicycle_[0-4]/.test(node.name)){
    node.material=node.material.clone();
    node.material.color.setHex(paint);
    node.material.metalness=.32; node.material.roughness=.38;
  }});
  bike.userData.wheels=wheels;
  bike.userData.frontWheels=frontWheels;
  bike.userData.assetStatus=wheels.length===2?'cc0-glb-wheel-pivots-bound':'cc0-glb-wheel-pivots-missing';
  bike.updateMatrixWorld(true);
  const contact=new THREE.Box3();
  wheels.forEach(wheel=>contact.expandByObject(wheel,true));
  if(!contact.isEmpty())bike.position.y+=.18-contact.min.y;
}

function loadSharedBikeModel(bikes){
  new GLTFLoader().load('./work/shared-bike-cc0.glb',gltf=>{
    bikes.forEach(bike=>mountSharedBikeModel(bike,gltf.scene));
    console.info('共享单车 CC0 GLB 已加载，前后轮节点绑定完成');
  },undefined,error=>console.warn('共享单车 GLB 加载失败，保留占位车体',error));
}

function storefront(name, x,z, color, sub='校园商业街'){
  const g=new THREE.Group(),wall=standard(0xe6ded0,{roughness:.86}),trim=standard(color,{metalness:.1,roughness:.5}),glass=standard(0x31535b,{metalness:.4,roughness:.18,transparent:true,opacity:.88});
  const body=new THREE.Mesh(new THREE.BoxGeometry(20,8,11),wall);body.position.y=4;g.add(body);
  const awning=new THREE.Mesh(new THREE.BoxGeometry(21,.65,2.5),trim);awning.position.set(0,6.7,6);g.add(awning);
  for(const px of [-5,0,5]){const window=new THREE.Mesh(new THREE.BoxGeometry(4.1,4.0,.15),glass);window.position.set(px,3.3,5.58);g.add(window)}
  if(name==="McDonald's"){
    const brick=standard(0x754638,{roughness:.92});const upper=new THREE.Mesh(new THREE.BoxGeometry(20,6,11),brick);upper.position.y=11;g.add(upper);
    const signboard=new THREE.Mesh(new THREE.BoxGeometry(15,2.4,.35),standard(0x392a26));signboard.position.set(0,10.6,5.68);g.add(signboard);
    const mSign=campusLabel("McDonald's",new THREE.Vector3(0,10.65,5.92),0xf5f4e9);mSign.scale.set(13,2.4,1);g.add(mSign);
    const gold=standard(0xf5bd20,{metalness:.26,roughness:.4});for(const sx of [-1.55,1.55]){const arch=new THREE.Mesh(new THREE.TorusGeometry(1.5,.25,7,14,Math.PI),gold);arch.position.set(sx,14.5,5.85);arch.rotation.z=Math.PI;g.add(arch);const post=new THREE.Mesh(new THREE.BoxGeometry(.5,2.5,.42),gold);post.position.set(sx+(sx<0?-1.48:1.48),13.25,5.85);g.add(post)}
  }
  g.position.set(x,0,z);g.userData.collisionBox={halfX:10.5,halfZ:5.8};g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});g.add(campusLabel(name,new THREE.Vector3(0,name==="McDonald's"?17:10,0),color));g.add(campusLabel(sub,new THREE.Vector3(0,8.1,0),0xffffff));return g;
}

function parkingEntrance(x,z){
  const g=new THREE.Group(),concrete=standard(0x6f7273,{roughness:.88}),dark=standard(0x171d20,{roughness:.95}),yellow=standard(0xe3c849,{emissive:0x382b00,emissiveIntensity:.25});
  const ramp=new THREE.Mesh(new THREE.PlaneGeometry(19,44),dark);ramp.rotation.x=-Math.PI/2+.18;ramp.position.set(0,-2,0);g.add(ramp);
  for(const sx of [-10.3,10.3]){const wall=new THREE.Mesh(new THREE.BoxGeometry(1.1,5,44),concrete);wall.position.set(sx,.1,0);g.add(wall)}
  const lintel=new THREE.Mesh(new THREE.BoxGeometry(23,2.2,3),concrete);lintel.position.set(0,4,19);g.add(lintel);
  const barrier=new THREE.Mesh(new THREE.BoxGeometry(8,.22,.22),yellow);barrier.position.set(3.5,1.7,16.5);barrier.rotation.z=.35;g.add(barrier);
  g.position.set(x,0,z);g.userData.collisionBox={halfX:11,halfZ:22};g.add(campusLabel('P  地下停车场',new THREE.Vector3(0,6.2,19),0x5ca8d4));g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g;
}

function winslowAvatar(){
  const g=new THREE.Group(),skin=new THREE.MeshPhysicalMaterial({color:0xc48c70,roughness:.56,metalness:0,clearcoat:.08,clearcoatRoughness:.6}),hair=standard(0x151313,{roughness:.44}),coat=new THREE.MeshPhysicalMaterial({color:0x142c4b,roughness:.52,clearcoat:.08}),shirt=standard(0xe5eee7,{roughness:.78}),pants=standard(0x202b35,{roughness:.7}),shoes=standard(0xe9eceb,{roughness:.42}),cap=standard(0x086dc0,{roughness:.48}),lens=new THREE.MeshPhysicalMaterial({color:0x091925,metalness:.66,roughness:.08,transparent:true,opacity:.82});
  const limb=(x,y,material,isLeg=false)=>{const joint=new THREE.Group();joint.position.set(x,y,0);const length=isLeg?1.32:1.28,r=isLeg?.30:.23;
    const upper=new THREE.Mesh(new THREE.CapsuleGeometry(r,length-r*2,8,12),material);upper.position.y=-length/2;joint.add(upper);
    const bend=new THREE.Group();bend.position.y=-length;joint.add(bend);const lower=new THREE.Mesh(new THREE.CapsuleGeometry(r*.88,length-r*2,8,12),material);lower.position.y=-length/2;bend.add(lower);
    const end=new THREE.Group();end.position.y=-length;bend.add(end);if(isLeg){const shoe=new THREE.Mesh(new THREE.BoxGeometry(.68,.32,1.05),shoes);shoe.position.z=.22;end.add(shoe)}else{const hand=new THREE.Mesh(new THREE.SphereGeometry(.28,10,8),skin);end.add(hand)}
    joint.userData={bend,end,length};g.add(joint);return joint};
  const legA=limb(-.46,2.42,pants,true),legB=limb(.46,2.42,pants,true);
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(1.18,2.3,10,16),coat);torso.position.y=4.02;g.add(torso);
  for(const y of [3.28,3.63,3.98,4.33]){const fold=new THREE.Mesh(new THREE.TorusGeometry(1.04,.035,6,28),standard(0x0d2037));fold.position.y=y;fold.rotation.x=Math.PI/2;fold.scale.z=.48;g.add(fold)}
  const collar=new THREE.Mesh(new THREE.BoxGeometry(.9,.72,.16),shirt);collar.position.set(0,5.14,1.08);g.add(collar);
  const arms=[limb(-1.32,4.95,coat),limb(1.32,4.95,coat)];arms[0].rotation.z=.12;arms[1].rotation.z=-.12;
  const headPivot=new THREE.Group();headPivot.position.y=5.78;g.add(headPivot);const neck=new THREE.Mesh(new THREE.CylinderGeometry(.46,.52,.52,12),skin);neck.position.y=.15;headPivot.add(neck);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.93,24,20),skin);head.position.y=1.02;head.scale.set(.94,1.09,.9);headPivot.add(head);
  // Generated from the user's supplied three-angle references; the old single selfie texture is retired.
  const faceMap=new THREE.TextureLoader().load('./work/winslow-face-albedo-v2.png');faceMap.colorSpace=THREE.SRGBColorSpace;faceMap.anisotropy=8;faceMap.wrapS=faceMap.wrapT=THREE.ClampToEdgeWrapping;faceMap.repeat.set(.72,.68);faceMap.offset.set(.14,.13);const face=new THREE.Mesh(new THREE.PlaneGeometry(1.58,1.82),new THREE.MeshBasicMaterial({map:faceMap,transparent:true}));face.position.set(0,1.02,.846);headPivot.add(face);
  const hairCap=new THREE.Mesh(new THREE.SphereGeometry(.99,24,16,0,Math.PI*2,0,1.28),hair);hairCap.position.set(0,1.4,.02);hairCap.scale.set(.96,.78,.95);headPivot.add(hairCap);for(let i=-4;i<=4;i++){const tuft=new THREE.Mesh(new THREE.CapsuleGeometry(.06,.42,5,7),hair);tuft.position.set(i*.14,1.74,.68-Math.abs(i)*.025);tuft.rotation.z=-i*.13;tuft.rotation.x=-.45;headPivot.add(tuft)}
  const capTop=new THREE.Mesh(new THREE.SphereGeometry(1.03,24,14,0,Math.PI*2,0,1.18),cap);capTop.position.set(0,1.58,.02);capTop.scale.set(.96,.72,.96);headPivot.add(capTop);const brim=new THREE.Mesh(new THREE.BoxGeometry(1.52,.13,.67),cap);brim.position.set(0,1.58,.83);brim.rotation.x=-.12;headPivot.add(brim);
  for(const x of [-.37,.37]){const glasses=new THREE.Mesh(new THREE.SphereGeometry(.35,14,10),lens);glasses.position.set(x,1.1,.89);glasses.scale.z=.16;headPivot.add(glasses)}const bridge=new THREE.Mesh(new THREE.BoxGeometry(.22,.055,.05),standard(0xb0a187,{metalness:.8,roughness:.22}));bridge.position.set(0,1.11,.93);headPivot.add(bridge);
  const earring=new THREE.Mesh(new THREE.TorusGeometry(.12,.025,6,12),standard(0xd4d5d1,{metalness:.85,roughness:.18}));earring.position.set(-.9,.78,.16);earring.rotation.y=Math.PI/2;headPivot.add(earring);
  const tag=campusLabel('Winslow · 南开本科新生',new THREE.Vector3(0,8.35,0),0x69b6f2);tag.scale.set(19,3.5,1);g.add(tag);g.userData={tag,arms,legs:[legA,legB],head:headPivot,torso};g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g;
}

// Two-bone IK in avatar coordinates: the feet follow a circular crank path,
// while hands stay on the grips instead of independently swinging.
export function poseBicycleRider(avatar,{phase,steer,moving,pedaling}){
  const pose=avatar.userData;
  function reach(joint,target,forwardBend){
    const delta=target.clone().sub(joint.position),L=joint.userData.length,d=Math.min(L*1.999,Math.max(.01,delta.length()));
    const direction=delta.normalize(),bendDirection=new THREE.Vector3(0,0,forwardBend).addScaledVector(direction,-direction.z*forwardBend).normalize();
    const knee=direction.clone().multiplyScalar(d/2).addScaledVector(bendDirection,Math.sqrt(Math.max(0,L*L-d*d/4)));
    joint.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),knee.clone().normalize());
    const lower=delta.copy(direction).multiplyScalar(d).sub(knee).applyQuaternion(joint.quaternion.clone().invert());
    joint.userData.bend.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),lower.normalize());
    if(forwardBend===1)joint.userData.end.quaternion.copy(joint.quaternion.clone().multiply(joint.userData.bend.quaternion).invert());
  }
  for(let i=0;i<2;i++){
    const angle=phase+i*Math.PI,foot=new THREE.Vector3(i===0?-.55:.55,(.42+.16*Math.cos(angle)-.5)/.27,(.18+.16*Math.sin(angle))/.27);
    // At a standstill the left foot reaches the ground for balance.
    if(!moving&&i===0)foot.set(-1.0,-1.72,.3);
    reach(pose.legs[i],foot,1);
    const grip=new THREE.Vector3(i===0?-.23:.23,1.08,.86).applyAxisAngle(new THREE.Vector3(0,1,0),steer);
    reach(pose.arms[i],new THREE.Vector3(grip.x/.27,(grip.y-.5)/.27,grip.z/.27),-1);
  }
  pose.torso.rotation.x=.25;pose.head.rotation.x=-.12;
}

export function addCampusLife(scene, world){
  const all=new THREE.Group(),nightLights=[];all.name='campus-life';
  // Official campus sources place the bronze statue in the Library forecourt, inside the south gate.
  const statuePoint=world(38.98447,117.34054),statue=createZhouStatue(),statueLabel=campusLabel('周恩来总理铜像 · 图书馆前广场',statuePoint.clone().add(new THREE.Vector3(0,13,0)),0xe2bb64);statue.position.copy(statuePoint);statue.scale.setScalar(.25);statueLabel.scale.set(34,6.4,1);all.add(statue,statueLabel);
  all.add(flowerBed(statuePoint.x-16,statuePoint.z-3,15,8),flowerBed(statuePoint.x+16,statuePoint.z-3,15,8));
  // Deliberately planted corridors, rather than random forest scattered over roads.
  [[38.9835,117.3394],[38.9841,117.33965],[38.9850,117.3401],[38.9860,117.3406],[38.9871,117.3408],[38.9882,117.3410],[38.9895,117.3412],[38.9908,117.3413],[38.9920,117.3414]].forEach(([lat,lon],i)=>{const p=world(lat,lon),left=streetLamp(p.x-8,p.z),right=streetLamp(p.x+8,p.z);all.add(tree(p.x-13,p.z,1.05),tree(p.x+13,p.z,.94),left.g,right.g);nightLights.push(left.light,right.light)});
  const commerce=world(38.99182,117.33530);all.add(storefront('KFC',commerce.x-80,commerce.z-30,0xbc1d30),storefront('健身房 GYM',commerce.x+78,commerce.z-30,0x247d89)); // McDonald's is modeled once in the photo survey street.
  const bikes=[];for(let i=0;i<11;i++){const kind=i%3===0?'byte':i%5===0?'red-bike':'meituan',color=kind==='byte'?0x49b9f1:kind==='red-bike'?0xde4343:0xf1b92b;const bike=publicBike(color,kind);bike.position.set(commerce.x-36+i*6,0,commerce.z+12);bike.rotation.y=Math.PI/2;all.add(bike);bikes.push(bike)}
  const parking=world(38.98372,117.3426);all.add(parkingEntrance(parking.x,parking.z));
  // Two rideable starter bikes cover both the initial and reset south-gate positions, so E works immediately.
  const spawn=world(38.9812,117.3397),resetSpawn=world(38.9812,117.3397);
  [[spawn,0xf1b92b,'meituan'],[resetSpawn,0x49b9f1,'byte']].forEach(([p,color,kind],i)=>{const bike=publicBike(color,kind);bike.position.set(p.x+(i? -3.2:3.2),0,p.z+1);bike.rotation.y=Math.PI/2;bike.userData.starter=true;all.add(bike);bikes.push(bike)});
  const player=winslowAvatar();player.scale.setScalar(.27);player.position.set(spawn.x+6,0,spawn.z+7);all.add(player);
  all.updateMatrixWorld(true);const solidColliders=[];all.traverse(o=>{const p=o.getWorldPosition(new THREE.Vector3());if(o.userData.collisionRadius)solidColliders.push({x:p.x,z:p.z,r:o.userData.collisionRadius,type:'tree-or-lamp'});if(o.userData.collisionBox)solidColliders.push({x:p.x,z:p.z,box:o.userData.collisionBox,type:'fixture'})});
  scene.add(all);loadSharedBikeModel(bikes);return {statuePoint,player,bikes,nightLights,solidColliders};
}
