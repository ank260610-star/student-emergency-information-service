import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

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

function statueModel(){
  const g=new THREE.Group(), bronze=standard(0x8a624d,{metalness:.72,roughness:.32,emissive:0x1c100b,emissiveIntensity:.32}), darkBronze=standard(0x4b2b22,{metalness:.72,roughness:.34,emissive:0x100807,emissiveIntensity:.25}), stone=standard(0x9a9b94,{roughness:.88});
  const patina=document.createElement('canvas');patina.width=patina.height=128;const px=patina.getContext('2d');px.fillStyle='#a17860';px.fillRect(0,0,128,128);for(let i=0;i<2600;i++){const a=Math.random()*18;px.fillStyle=`rgba(${35+Math.random()*80},${44+Math.random()*65},${32+Math.random()*42},${a/100})`;px.fillRect(Math.random()*128,Math.random()*128,1,1)}const patinaMap=new THREE.CanvasTexture(patina);patinaMap.wrapS=patinaMap.wrapT=THREE.RepeatWrapping;patinaMap.repeat.set(4,5);bronze.map=patinaMap;
  // Pedestal and the bronzed full-length standing pose based on the verified campus photo.
  const base=new THREE.Mesh(new THREE.BoxGeometry(16,1.4,10),darkBronze);base.position.y=.7;g.add(base);
  const plinth=new THREE.Mesh(new THREE.BoxGeometry(14,8,8.5),stone);plinth.position.y=5.4;g.add(plinth);
  const plaque=new THREE.Mesh(new THREE.BoxGeometry(10.8,2.0,.18),standard(0x2c3331,{metalness:.3,roughness:.45}));plaque.position.set(0,5.4,4.35);g.add(plaque);
  const plaqueText=campusLabel('我是爱南开的',new THREE.Vector3(0,5.45,4.52),0xe6c34e);plaqueText.scale.set(9.4,1.75,1);g.add(plaqueText);
  const shoeGeo=new THREE.BoxGeometry(3.7,1.1,6.5), shoeA=new THREE.Mesh(shoeGeo,darkBronze),shoeB=shoeA.clone();shoeA.position.set(-2.2,10,0);shoeB.position.set(2.2,10,.15);g.add(shoeA,shoeB);
  const trouser=new THREE.Mesh(new THREE.CylinderGeometry(3.8,4.7,14,12),bronze);trouser.position.y=16.5;trouser.scale.x=.9;g.add(trouser);
  const legSplit=new THREE.Mesh(new THREE.BoxGeometry(.22,12,.36),darkBronze);legSplit.position.set(0,16.1,3.3);g.add(legSplit);
  const torso=new THREE.Mesh(new THREE.CylinderGeometry(7.1,5.25,13.5,12),bronze);torso.position.y=29.5;torso.scale.z=.64;g.add(torso);
  const collar=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.65,1.0,10),darkBronze);collar.position.y=36.25;collar.scale.z=.72;g.add(collar);
  const lapelA=new THREE.Mesh(new THREE.BoxGeometry(2.5,5.5,.24),darkBronze),lapelB=lapelA.clone();lapelA.position.set(-2.65,32.4,4.08);lapelB.position.set(2.65,32.4,4.08);lapelA.rotation.z=-.42;lapelB.rotation.z=.42;g.add(lapelA,lapelB);
  const coatSeam=new THREE.Mesh(new THREE.BoxGeometry(.19,10.5,.18),darkBronze);coatSeam.position.set(0,29.1,4.13);g.add(coatSeam);
  for(let i=0;i<4;i++){const button=new THREE.Mesh(new THREE.SphereGeometry(.35,8,7),standard(0x795642,{metalness:.7,roughness:.28}));button.position.set(0,32.8-i*2.55,4.35);g.add(button)}
  const pocketA=new THREE.Mesh(new THREE.BoxGeometry(2.8,1.6,.3),darkBronze),pocketB=pocketA.clone();pocketA.position.set(-3.6,32.5,4.05);pocketB.position.set(3.6,32.5,4.05);g.add(pocketA,pocketB);
  // Right arm extends forward/down; left arm bends onto the hip, matching the reference pose.
  const armA=new THREE.Mesh(new THREE.CapsuleGeometry(1.35,8.5,6,10),bronze);armA.position.set(-7.4,28.6,1.2);armA.rotation.z=.36;armA.rotation.x=.2;g.add(armA);
  const handA=new THREE.Mesh(new THREE.SphereGeometry(1.45,10,8),bronze);handA.position.set(-9.4,24.3,4.2);handA.scale.set(.8,.8,1.05);g.add(handA);
  for(let i=0;i<3;i++){const finger=new THREE.Mesh(new THREE.CapsuleGeometry(.18,.95,5,7),bronze);finger.position.set(-10.08+i*.32,23.9,5.16);finger.rotation.z=.45;finger.rotation.x=.38;g.add(finger)}
  const armB=new THREE.Mesh(new THREE.CapsuleGeometry(1.35,7.0,6,10),bronze);armB.position.set(7.0,29.2,1.0);armB.rotation.z=-.62;armB.rotation.x=-.1;g.add(armB);
  const forearm=new THREE.Mesh(new THREE.CapsuleGeometry(1.2,5.2,6,10),bronze);forearm.position.set(6.9,25.4,3.0);forearm.rotation.z=.75;g.add(forearm);
  const handB=new THREE.Mesh(new THREE.SphereGeometry(1.35,10,8),bronze);handB.position.set(4.4,24.5,4.0);handB.scale.set(.8,.8,1.05);g.add(handB);
  for(let i=0;i<3;i++){const finger=new THREE.Mesh(new THREE.CapsuleGeometry(.16,.72,5,7),bronze);finger.position.set(3.85+i*.28,24.0,5.0);finger.rotation.z=-.55;g.add(finger)}
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(2.05,2.25,2,10),bronze);neck.position.y=37.5;g.add(neck);
  const head=new THREE.Mesh(new THREE.SphereGeometry(4.0,16,14),bronze);head.position.set(0,41.2,.15);head.scale.set(.88,1.12,.86);g.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(4.08,16,9,0,Math.PI*2,0,1.18),darkBronze);hair.position.set(0,42.5,.1);hair.scale.set(.89,.72,.87);g.add(hair);
  for(const x of [-4.0,4.0]){const ear=new THREE.Mesh(new THREE.SphereGeometry(.65,8,7),bronze);ear.position.set(x,41.1,.1);g.add(ear)}
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.5,1.25,6),bronze);nose.position.set(0,41.1,3.55);nose.rotation.x=Math.PI/2;g.add(nose);
  for(const x of [-1.45,1.45]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.28,7,6),darkBronze);eye.position.set(x,41.9,3.48);g.add(eye);const brow=new THREE.Mesh(new THREE.CapsuleGeometry(.14,1.12,5,8),darkBronze);brow.position.set(x,42.85,3.38);brow.rotation.z=x*.12;g.add(brow)}
  for(const x of [-1,1]){const cheek=new THREE.Mesh(new THREE.SphereGeometry(1.12,10,8),bronze);cheek.position.set(x*2.3,40.15,3.16);cheek.scale.set(1,.52,.32);g.add(cheek);const crease=new THREE.Mesh(new THREE.CapsuleGeometry(.075,1.25,5,7),darkBronze);crease.position.set(x*2.1,40.1,3.62);crease.rotation.z=x*.45;g.add(crease)}
  const mouth=new THREE.Mesh(new THREE.CapsuleGeometry(.16,1.25,5,9),darkBronze);mouth.position.set(0,39.7,3.48);mouth.rotation.z=Math.PI/2;mouth.scale.y=.52;g.add(mouth);
  for(let i=-3;i<=3;i++){const wave=new THREE.Mesh(new THREE.CapsuleGeometry(.16,2.15,5,7),darkBronze);wave.position.set(i*.7,43.25,2.7-Math.abs(i)*.06);wave.rotation.z=i*.14;wave.rotation.x=-.18;g.add(wave)}
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g;
}

function publicBike(color=0xf1b92b,kind='meituan'){
  const g=new THREE.Group(),paint=standard(color,{metalness:.25,roughness:.45}),black=standard(0x15191a,{roughness:.9});
  const wheels=[];for(const x of [-1.4,1.4]){const wheel=new THREE.Mesh(new THREE.TorusGeometry(1.0,.12,7,18),black);wheel.rotation.y=Math.PI/2;wheel.position.set(x,1.05,0);g.add(wheel);wheels.push(wheel)}
  const tube=(a,b,r=.11)=>{const len=a.distanceTo(b),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,6),paint);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());g.add(m)};
  const seat=new THREE.Vector3(-.2,2.3,0), crank=new THREE.Vector3(0,1.25,0), front=new THREE.Vector3(1.4,2.55,0),rear=new THREE.Vector3(-1.4,1.05,0),fw=new THREE.Vector3(1.4,1.05,0);tube(rear,seat);tube(seat,crank);tube(crank,rear);tube(crank,front);tube(seat,front);tube(front,fw);const saddle=new THREE.Mesh(new THREE.BoxGeometry(.8,.18,.34),black);saddle.position.copy(seat).add(new THREE.Vector3(-.18,.18,0));g.add(saddle);
  const basket=new THREE.Mesh(new THREE.BoxGeometry(.55,.45,.55),standard(0xced7d5,{metalness:.45,roughness:.5}));basket.position.set(1.45,2.15,.05);g.add(basket);
  if(kind==='byte'){const battery=new THREE.Mesh(new THREE.BoxGeometry(1.05,.52,.58),standard(0x15191a,{metalness:.42,roughness:.32}));battery.position.set(-.1,1.6,.08);g.add(battery)}
  const brand=campusLabel(kind==='meituan'?'美团单车':'字节出行 E-BIKE',new THREE.Vector3(0,2.7,.18),kind==='meituan'?0xf1b92b:0x47c4ff);brand.scale.set(3.1,.55,1);g.add(brand);g.userData={wheels,type:kind==='meituan'?'meituan-bike':'byte-ebike'};g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g;
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
  const limb=(x,y,material,isLeg=false)=>{const joint=new THREE.Group();joint.position.set(x,y,0);const length=isLeg?2.15:2.05,r=isLeg?.5:.38,mesh=new THREE.Mesh(new THREE.CapsuleGeometry(r,length,8,12),material);mesh.position.y=-length*.5;joint.add(mesh);if(isLeg){const shoe=new THREE.Mesh(new THREE.BoxGeometry(.8,.36,1.25),shoes);shoe.position.set(0,-length-.18,.2);joint.add(shoe)}else{const hand=new THREE.Mesh(new THREE.SphereGeometry(.34,10,8),skin);hand.position.y=-length- .22;joint.add(hand);for(const dx of [-.13,0,.13]){const finger=new THREE.Mesh(new THREE.CapsuleGeometry(.055,.25,4,6),skin);finger.position.set(dx,-length-.48,.14);joint.add(finger)}}g.add(joint);return joint};
  const legA=limb(-.46,2.42,pants,true),legB=limb(.46,2.42,pants,true);
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(1.18,2.3,10,16),coat);torso.position.y=4.02;g.add(torso);
  for(const y of [3.28,3.63,3.98,4.33]){const fold=new THREE.Mesh(new THREE.TorusGeometry(1.04,.035,6,28),standard(0x0d2037));fold.position.y=y;fold.rotation.x=Math.PI/2;fold.scale.z=.48;g.add(fold)}
  const collar=new THREE.Mesh(new THREE.BoxGeometry(.9,.72,.16),shirt);collar.position.set(0,5.14,1.08);g.add(collar);
  const arms=[limb(-1.32,4.95,coat),limb(1.32,4.95,coat)];arms[0].rotation.z=.12;arms[1].rotation.z=-.12;
  const headPivot=new THREE.Group();headPivot.position.y=5.78;g.add(headPivot);const neck=new THREE.Mesh(new THREE.CylinderGeometry(.46,.52,.52,12),skin);neck.position.y=.15;headPivot.add(neck);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.93,24,20),skin);head.position.y=1.02;head.scale.set(.94,1.09,.9);headPivot.add(head);
  // Generated from the user's supplied three-angle references; the old single selfie texture is retired.
  const faceMap=new THREE.TextureLoader().load('./work/winslow-face-albedo-v2.png');faceMap.colorSpace=THREE.SRGBColorSpace;faceMap.wrapS=faceMap.wrapT=THREE.ClampToEdgeWrapping;faceMap.repeat.set(.72,.68);faceMap.offset.set(.14,.13);const face=new THREE.Mesh(new THREE.PlaneGeometry(1.58,1.82),new THREE.MeshBasicMaterial({map:faceMap}));face.position.set(0,1.02,.846);headPivot.add(face);
  const hairCap=new THREE.Mesh(new THREE.SphereGeometry(.99,24,16,0,Math.PI*2,0,1.28),hair);hairCap.position.set(0,1.4,.02);hairCap.scale.set(.96,.78,.95);headPivot.add(hairCap);for(let i=-4;i<=4;i++){const tuft=new THREE.Mesh(new THREE.CapsuleGeometry(.06,.42,5,7),hair);tuft.position.set(i*.14,1.74,.68-Math.abs(i)*.025);tuft.rotation.z=-i*.13;tuft.rotation.x=-.45;headPivot.add(tuft)}
  const capTop=new THREE.Mesh(new THREE.SphereGeometry(1.03,24,14,0,Math.PI*2,0,1.18),cap);capTop.position.set(0,1.58,.02);capTop.scale.set(.96,.72,.96);headPivot.add(capTop);const brim=new THREE.Mesh(new THREE.BoxGeometry(1.52,.13,.67),cap);brim.position.set(0,1.58,.83);brim.rotation.x=-.12;headPivot.add(brim);
  for(const x of [-.37,.37]){const glasses=new THREE.Mesh(new THREE.SphereGeometry(.35,14,10),lens);glasses.position.set(x,1.1,.89);glasses.scale.z=.16;headPivot.add(glasses)}const bridge=new THREE.Mesh(new THREE.BoxGeometry(.22,.055,.05),standard(0xb0a187,{metalness:.8,roughness:.22}));bridge.position.set(0,1.11,.93);headPivot.add(bridge);
  const earring=new THREE.Mesh(new THREE.TorusGeometry(.12,.025,6,12),standard(0xd4d5d1,{metalness:.85,roughness:.18}));earring.position.set(-.9,.78,.16);earring.rotation.y=Math.PI/2;headPivot.add(earring);
  const tag=campusLabel('Winslow · 南开本科新生',new THREE.Vector3(0,8.35,0),0x69b6f2);tag.scale.set(19,3.5,1);g.add(tag);g.userData={tag,arms,legs:[legA,legB],head:headPivot,torso};g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return g;
}

export function addCampusLife(scene, world){
  const all=new THREE.Group(),nightLights=[];all.name='campus-life';
  // Official campus sources place the bronze statue in the Library forecourt, inside the south gate.
  const statuePoint=world(38.98447,117.34054),statue=statueModel(),statueLabel=campusLabel('周恩来总理铜像 · 图书馆前广场',statuePoint.clone().add(new THREE.Vector3(0,13,0)),0xe2bb64);statue.position.copy(statuePoint);statue.scale.setScalar(.25);statueLabel.scale.set(34,6.4,1);all.add(statue,statueLabel);
  all.add(flowerBed(statuePoint.x-16,statuePoint.z-3,15,8),flowerBed(statuePoint.x+16,statuePoint.z-3,15,8));
  // Deliberately planted corridors, rather than random forest scattered over roads.
  [[38.9835,117.3394],[38.9841,117.33965],[38.9850,117.3401],[38.9860,117.3406],[38.9871,117.3408],[38.9882,117.3410],[38.9895,117.3412],[38.9908,117.3413],[38.9920,117.3414]].forEach(([lat,lon],i)=>{const p=world(lat,lon),left=streetLamp(p.x-8,p.z),right=streetLamp(p.x+8,p.z);all.add(tree(p.x-13,p.z,1.05),tree(p.x+13,p.z,.94),left.g,right.g);nightLights.push(left.light,right.light)});
  const commerce=world(38.9912,117.3346);all.add(storefront('KFC',commerce.x-28,commerce.z,0xbc1d30),storefront("McDonald's",commerce.x,commerce.z,0xf0bd25),storefront('健身房 GYM',commerce.x+28,commerce.z,0x247d89));
  const bikes=[];for(let i=0;i<11;i++){const bike=publicBike(i%3===0?0x49b9f1:0xf1b92b,i%3===0?'byte':'meituan');bike.position.set(commerce.x-36+i*6,0,commerce.z+12);bike.rotation.y=Math.PI/2;all.add(bike);bikes.push(bike)}
  const parking=world(38.98372,117.3426);all.add(parkingEntrance(parking.x,parking.z));
  // Two rideable starter bikes cover both the initial and reset south-gate positions, so E works immediately.
  const spawn=world(38.9812,117.3397),resetSpawn=world(38.9812,117.3397);
  [[spawn,0xf1b92b,'meituan'],[resetSpawn,0x49b9f1,'byte']].forEach(([p,color,kind])=>{const bike=publicBike(color,kind);bike.position.set(p.x+3.2,0,p.z+1);bike.rotation.y=Math.PI/2;all.add(bike);bikes.push(bike)});
  const player=winslowAvatar();player.scale.setScalar(.27);player.position.set(spawn.x+6,0,spawn.z+7);all.add(player);
  all.updateMatrixWorld(true);const solidColliders=[];all.traverse(o=>{const p=o.getWorldPosition(new THREE.Vector3());if(o.userData.collisionRadius)solidColliders.push({x:p.x,z:p.z,r:o.userData.collisionRadius,type:'tree-or-lamp'});if(o.userData.collisionBox)solidColliders.push({x:p.x,z:p.z,box:o.userData.collisionBox,type:'fixture'})});
  scene.add(all);return {statuePoint,player,bikes,nightLights,solidColliders};
}
