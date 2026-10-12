import {createTouchControls} from './mobile-controls.js';
import * as THREE from './vendor/three/build/three.module.js';
import {GLTFLoader} from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
import {sculptCar as buildSupercar} from './vehicles.js?v=play-2';
import {loadCampus,inside} from './campus.js?v=photos-1';
import {addCampusLife,poseBicycleRider} from './campus-life.js?v=life-11';
import {addMasterplanDetails} from './masterplan.js?v=plan-2';
import {pointToSegmentSq,nearPolygonEdge,sampledPathBlocked,withinCourtyard} from './collision.js';
let campusReady=false;
let collisionBuildings=[],libraryDoor=null,waterAreas=[],stairSegments=[],solidColliders=[],waterPaths=[],bridgeZones=[];
const collisionDebug=new THREE.Group();collisionDebug.name='碰撞调试边界';collisionDebug.visible=false;

const canvas = document.querySelector('#game');
const $ = s => document.querySelector(s);
const touchDevice=matchMedia('(any-pointer: coarse)').matches;
const quality=new URLSearchParams(location.search).get('quality')||(touchDevice?'low':'ultra'),ultra=quality==='ultra',low=quality==='low';
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8bc4da);
scene.fog = new THREE.FogExp2(0x9bc9d2, 0.00042);

const renderer = new THREE.WebGLRenderer({canvas, antialias:!low, powerPreference:'high-performance'});
renderer.setPixelRatio(ultra?Math.min(devicePixelRatio*1.35,3):Math.min(devicePixelRatio, low?1:2));
renderer.shadowMap.enabled = !low;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=ultra?1.16:1.03;

const camera = new THREE.PerspectiveCamera(58, 1, 0.5, 7000);
const hemi = new THREE.HemisphereLight(0xd8f2ff, 0x63704e, 2.4);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3cf, 3.1);
sun.position.set(-600, 1000, -450); sun.castShadow = true;
sun.shadow.mapSize.set(ultra?4096:2048,ultra?4096:2048);sun.shadow.bias=-.00014;sun.shadow.normalBias=.025; sun.shadow.camera.left=-1400; sun.shadow.camera.right=1400; sun.shadow.camera.top=1300; sun.shadow.camera.bottom=-1300;
scene.add(sun);

const ORIGIN = {lat:38.9880, lon:117.3394};
const world = (lat,lon) => new THREE.Vector3((lon-ORIGIN.lon)*87000,0,-(lat-ORIGIN.lat)*111000);
const campus = new THREE.Group(); scene.add(campus);

function grassTexture(){const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d'),img=x.createImageData(512,512);for(let i=0;i<img.data.length;i+=4){const v=72+Math.random()*38;img.data[i]=Math.round(v*.62);img.data[i+1]=Math.round(v*1.1);img.data[i+2]=Math.round(v*.56);img.data[i+3]=255}x.putImageData(img,0,0);for(let i=0;i<850;i++){x.fillStyle=`rgba(225,245,170,${Math.random()*.13})`;x.fillRect(Math.random()*512,Math.random()*512,1,3)}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(54,38);t.colorSpace=THREE.SRGBColorSpace;return t}
const groundMat = new THREE.MeshStandardMaterial({map:grassTexture(),color:0x9dba8e,roughness:1});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(2700,1900),groundMat);
ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; campus.add(ground);

// 校区四至：北同德路、南同砚路、西雅深路、东和慧南路。
const border = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
  world(38.9952,117.3328),world(38.9941,117.3512),world(38.9811,117.3518),world(38.9810,117.3265)
]),new THREE.LineBasicMaterial({color:0xf2d34e})); border.position.y=1; campus.add(border);

const boxMat = c => new THREE.MeshStandardMaterial({color:c,roughness:.78,metalness:.03});
function addRoad(points,width=15,color=0x4f5d60){
  const mat=boxMat(color);
  for(let i=1;i<points.length;i++){
    const a=world(...points[i-1]),b=world(...points[i]); const len=a.distanceTo(b),mid=a.clone().add(b).multiplyScalar(.5);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,.7,len),mat); mesh.position.copy(mid); mesh.position.y=.25; mesh.rotation.y=Math.atan2(b.x-a.x,b.z-a.z); mesh.receiveShadow=true; mesh.userData.schematic=true;campus.add(mesh);
    const dash=new THREE.Mesh(new THREE.BoxGeometry(.7,.15,len*.82),boxMat(0xe7dfb4));dash.position.copy(mid);dash.position.y=.7;dash.rotation.y=mesh.rotation.y;dash.userData.schematic=true;campus.add(dash);
  }
}

const roads = [
  [[38.9812,117.3397],[38.9831,117.3403],[38.9853,117.3404],[38.9884,117.3410],[38.9929,117.3414],[38.9948,117.3407]],
  [[38.9843,117.3282],[38.9847,117.3349],[38.9851,117.3404],[38.9853,117.3478],[38.9855,117.3517]],
  [[38.9900,117.3285],[38.9901,117.3340],[38.9903,117.3416],[38.9898,117.3480]],
  [[38.9865,117.3285],[38.9875,117.3344],[38.9865,117.3379],[38.9862,117.3434],[38.9865,117.3500]],
  [[38.9827,117.3332],[38.9851,117.3340],[38.9892,117.3347],[38.9943,117.3350]],
  [[38.9899,117.3289],[38.9891,117.3313],[38.9890,117.3341],[38.9894,117.3369],[38.9891,117.3442],[38.9884,117.3476]],
  [[38.9927,117.3313],[38.9923,117.3351],[38.9926,117.3398],[38.9923,117.3435],[38.9932,117.3449]],
  [[38.9816,117.3494],[38.9841,117.3505],[38.9865,117.3500],[38.9900,117.3480],[38.9930,117.3486]]
]; roads.forEach((r,i)=>addRoad(r,i<4?18:11));

function seeded(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return ()=>((h=Math.imul(h^h>>>15,2246822519))>>>0)/4294967295}
function label(text,pos,color='#fff'){
  const c=document.createElement('canvas'),x=c.getContext('2d');c.width=512;c.height=96;x.fillStyle='rgba(13,31,34,.78)';x.roundRect(4,4,504,86,14);x.fill();x.strokeStyle='#f3d84f';x.lineWidth=4;x.stroke();x.fillStyle=color;x.font='700 31px Noto Sans SC, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,48);
  const tex=new THREE.CanvasTexture(c),spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:true}));spr.position.copy(pos);spr.scale.set(48,9,1);spr.renderOrder=20;spr.userData.schematic=true;campus.add(spr);return spr;
}
const buildings = [
 ['南开大学津南校区中心图书馆',38.9852884,117.3405293,150,95,45,'landmark'],['综合业务东楼',38.9844730,117.3417163,115,65,34],['综合业务西楼',38.9846374,117.3392039,115,65,34],
 ['历史学院',38.9900639,117.3370038,75,55,28],['哲学院',38.9898091,117.3376238,68,48,25],['法学院',38.9894087,117.3357768,78,50,28],['马克思主义学院',38.9902578,117.3377131,72,48,25],['金融学院',38.9891991,117.3369718,76,52,29],
 ['人工智能学院',38.9868672,117.3353223,76,54,31],['计算机与网络空间安全学院',38.9855981,117.3362590,90,58,34],['电子信息与光学工程学院',38.9860611,117.3349731,88,55,31],['材料科学与工程学院',38.9865640,117.3365227,84,54,28],
 ['环境科学与工程学院',38.9881870,117.3309268,88,58,31],['药学院',38.9867716,117.3312736,80,55,29],['南开大学医学院',38.9859732,117.3304926,92,62,34],['汉语言文化学院',38.9896880,117.3353429,76,54,27],
 ['新闻与传播学院',38.9880937,117.3336498,75,52,27],['前沿交叉学科中心',38.9890830,117.3419938,92,62,36],['体育馆',38.9909662,117.3411024,115,90,25],['大通学生活动中心',38.9872244,117.3440134,86,64,22],
 ['木斋图书馆',38.9887377,117.3331249,62,40,17],['秀山堂',38.9880322,117.3336463,55,38,15],['思源堂',38.9889725,117.3340963,55,38,15],['南开大学医院',38.9930869,117.3354414,72,48,21],
 ['学一食堂',38.9916224,117.3359897,90,62,19,'food'],['学二食堂',38.9850844,117.3346608,90,62,19,'food'],['乐群餐厅',38.9915294,117.3340724,68,48,17,'food'],
 ['学生宿舍2',38.9920072,117.3381474,65,38,32,'dorm'],['学生宿舍3',38.9925996,117.3382845,65,38,32,'dorm'],['学生宿舍4',38.9923360,117.3364556,68,40,32,'dorm'],['学8',38.9835076,117.3363956,72,40,31,'dorm'],['学9',38.9828604,117.3361214,72,40,31,'dorm'],['学10',38.9924061,117.3336420,72,40,31,'dorm'],
 ['学生宿舍5A',38.9833883,117.3353057,62,35,29,'dorm'],['学生宿舍5B',38.9838113,117.3354604,62,35,29,'dorm'],['学生宿舍5C',38.9842641,117.3342463,62,35,29,'dorm'],['学生宿舍5D',38.9838845,117.3341535,62,35,29,'dorm'],['学生宿舍6',38.9832224,117.3340220,67,38,29,'dorm'],['学生宿舍7A',38.9844262,117.3367384,64,38,30,'dorm'],['学生宿舍7B',38.9846195,117.3357803,64,38,30,'dorm'],
 ['留学生公寓A',38.9915215,117.3342552,55,34,30,'dorm'],['留学生公寓B',38.9919101,117.3334064,55,34,30,'dorm'],['留学生公寓C',38.9916186,117.3331596,55,34,30,'dorm'],['留学生公寓D',38.9913065,117.3329562,55,34,30,'dorm'],['留学生公寓E',38.9910913,117.3337414,55,34,30,'dorm']
];
const interactive=[];
for(const b of buildings){const [name,lat,lon,w,d,h,type]=b,p=world(lat,lon),rand=seeded(name),color=type==='landmark'?0xc8b37a:type==='food'?0xd59258:type==='dorm'?0xc77d68:0xb8b39d;
  const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),boxMat(color));body.position.y=h/2;body.castShadow=true;body.receiveShadow=true;g.add(body);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(w+4,2,d+4),boxMat(type==='landmark'?0x74583d:0x596768));roof.position.y=h+1;roof.castShadow=true;g.add(roof);
  const winMat=new THREE.MeshStandardMaterial({color:0x8bcad4,emissive:0x17343a,emissiveIntensity:.5});for(let floor=7;floor<h-3;floor+=7){for(const side of [-1,1]){const win=new THREE.Mesh(new THREE.BoxGeometry(w*.78,2,.45),winMat);win.position.set(0,floor,side*(d/2+.25));g.add(win)}}
  g.position.copy(p);g.rotation.y=(rand()-.5)*.28;g.userData.schematic=true;campus.add(g);if(type==='landmark'||type==='food'||/学院|体育馆|医院/.test(name))label(name,new THREE.Vector3(p.x,h+19,p.z));interactive.push({name,pos:p,type,reward:type==='food'?80:140});
}

function water(name,lat,lon,w,d){const p=world(lat,lon);const m=new THREE.Mesh(new THREE.CircleGeometry(1,48),new THREE.MeshPhysicalMaterial({color:0x4ca2b8,roughness:.18,metalness:.08,transparent:true,opacity:.88}));m.scale.set(w,d,1);m.rotation.x=-Math.PI/2;m.position.set(p.x,.55,p.z);campus.add(m);label(name,new THREE.Vector3(p.x,13,p.z));}
water('马蹄湖',38.9867751,117.3335141,95,50);water('南开湖',38.9870964,117.3453830,145,82);

function field(name,lat,lon,w,d,color=0x477f54){const p=world(lat,lon),m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshStandardMaterial({color,roughness:1}));m.rotation.x=-Math.PI/2;m.position.set(p.x,.8,p.z);campus.add(m);label(name,new THREE.Vector3(p.x,12,p.z));}
field('西区足球场',38.9847346,117.3322347,135,82);field('文科足球场',38.9911081,117.3435917,150,90);field('体育场群',38.99165,117.33945,130,110,0x567a66);

// 城市天际线与校园绿化，补足完整空间感。
for(let i=0;i<260;i++){const r=seeded('tree'+i),x=(r()-.5)*2500,z=(r()-.5)*1700;if(Math.abs(x)<65||Math.abs(z)<55)continue;const trunk=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.6,8,6),boxMat(0x6d4d32));trunk.position.set(x,4,z);const crown=new THREE.Mesh(new THREE.ConeGeometry(7+r()*5,18+r()*8,7),boxMat(0x397b4c));crown.position.set(x,16,z);trunk.castShadow=crown.castShadow=true;campus.add(trunk,crown)}
const campusLife=addCampusLife(scene,world);
const masterplan=addMasterplanDetails(scene,world);
solidColliders=campusLife.solidColliders;waterPaths=masterplan.waterPaths;bridgeZones=masterplan.bridgeZones;scene.add(collisionDebug);
campusLife.player.visible=false;

const carSpecs=[
  // max is always a displayed km/h value. update() converts it once to the
  // world-speed unit, so no vehicle gets accidentally divided by the display
  // scale twice.
  {name:'Aventador',color:0xf28c28,max:320,accel:49,width:27,length:51,cabin:22,spoiler:true,accent:0x111315},
  {name:'Huracán Tecnica',color:0x70b735,max:320,accel:46,width:25,length:47,cabin:21,spoiler:false,accent:0x1a1c1d},
  {name:'Revuelto',color:0xe2d7c7,max:320,accel:55,width:28,length:52,cabin:20,spoiler:true,accent:0xe1c245}
];
function legacySupercar(spec,index){
  const g=new THREE.Group(),paint=new THREE.MeshPhysicalMaterial({color:spec.color,metalness:.55,roughness:.22,clearcoat:1,clearcoatRoughness:.12}),dark=boxMat(0x111417),glass=new THREE.MeshPhysicalMaterial({color:0x183844,metalness:.45,roughness:.1,transparent:true,opacity:.82});
  const lower=new THREE.Mesh(new THREE.BoxGeometry(spec.width,4,spec.length),paint);lower.position.y=5;lower.castShadow=true;g.add(lower);
  const hood=new THREE.Mesh(new THREE.BoxGeometry(spec.width*.9,4,spec.length*.38),paint);hood.position.set(0,8,spec.length*.27);hood.rotation.x=-.07;hood.castShadow=true;g.add(hood);
  const cabin=new THREE.Mesh(new THREE.BoxGeometry(spec.cabin,7,spec.length*.37),glass);cabin.position.set(0,11,-3);cabin.rotation.x=.03;g.add(cabin);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(spec.cabin*.72,1,spec.length*.18),dark);roof.position.set(0,15,-5);g.add(roof);
  const splitter=new THREE.Mesh(new THREE.BoxGeometry(spec.width+2,1,5),dark);splitter.position.set(0,3,spec.length/2+1);g.add(splitter);
  const diffuser=new THREE.Mesh(new THREE.BoxGeometry(spec.width*.88,2,4),dark);diffuser.position.set(0,4,-spec.length/2);g.add(diffuser);
  const intakeMat=boxMat(0x151718);for(const x of [-1,1]){const intake=new THREE.Mesh(new THREE.BoxGeometry(5,4,10),intakeMat);intake.position.set(x*spec.width*.38,8,-10);intake.rotation.y=x*.22;g.add(intake)}
  for(const x of [-spec.width*.39,spec.width*.39])for(const z of [-spec.length*.32,spec.length*.32]){const tire=new THREE.Mesh(new THREE.CylinderGeometry(5.3,5.3,4.2,24),dark);tire.rotation.z=Math.PI/2;tire.position.set(x,4.7,z);tire.castShadow=true;g.add(tire);const rim=new THREE.Mesh(new THREE.CylinderGeometry(3,3,4.4,10),boxMat(index===2?0xe0c14b:0x697174));rim.rotation.z=Math.PI/2;rim.position.set(x,4.7,z);g.add(rim)}
  const lightColor=index===2?0xffffff:0xfff4be;for(const x of [-1,1]){const light=new THREE.Mesh(new THREE.BoxGeometry(6,.8,.8),new THREE.MeshStandardMaterial({color:lightColor,emissive:lightColor,emissiveIntensity:3}));light.position.set(x*7.5,8,spec.length/2+.55);light.rotation.z=x*(index===2?.65:.18);g.add(light);const tail=new THREE.Mesh(new THREE.BoxGeometry(7,.7,.7),new THREE.MeshStandardMaterial({color:0xff1f18,emissive:0xff120c,emissiveIntensity:2}));tail.position.set(x*7.2,8,-spec.length/2-.5);tail.rotation.z=-x*.22;g.add(tail)}
  if(spec.spoiler){const post1=new THREE.Mesh(new THREE.BoxGeometry(1,5,1),dark),post2=post1.clone(),blade=new THREE.Mesh(new THREE.BoxGeometry(spec.width*.82,1.2,5),dark);post1.position.set(-7,11,-20);post2.position.set(7,11,-20);blade.position.set(0,14,-20);blade.rotation.x=.08;g.add(post1,post2,blade)}
  if(index===2){const engine=new THREE.Mesh(new THREE.BoxGeometry(14,2,10),dark);engine.position.set(0,12,-15);g.add(engine)}
  g.scale.setScalar(1.08);return g;
}
const SUPERCAR_TOP_SPEED_KMH=320, SPEED_DISPLAY_SCALE=2.3;
carSpecs.push({name:'Temerario',color:0x287c95,max:SUPERCAR_TOP_SPEED_KMH,accel:51,spoiler:false},{name:'Sián',color:0x78833d,max:SUPERCAR_TOP_SPEED_KMH,accel:52,spoiler:true},{name:'Veneno',color:0x888c92,max:SUPERCAR_TOP_SPEED_KMH,accel:50,spoiler:true},{name:'Countach',color:0xe9e5de,max:SUPERCAR_TOP_SPEED_KMH,accel:48,spoiler:false},
 {name:'Ferrari SF90 XX Stradale',make:'ferrari',color:0xd31a24,max:SUPERCAR_TOP_SPEED_KMH,accel:63,spoiler:true},
 {name:'Mercedes-AMG GT 63 S E PERFORMANCE',make:'mercedes',color:0x6f767a,max:SUPERCAR_TOP_SPEED_KMH,accel:59,spoiler:false});
document.querySelector('.garage').innerHTML='<b>超级跑车车库</b>'+carSpecs.map((s,i)=>`<button data-car="${i}" class="${i===0?'selected':''}">${i+1} · ${s.name}</button>`).join('')+'<em>1–9 换车 · 空格手刹 · V 环视 · M 声音</em>';
let aventadorTemplate=null;
function importedAventador(){
 const root=aventadorTemplate.clone(true),holder=new THREE.Group();holder.add(root);root.updateMatrixWorld(true);
 let box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3());
 if(size.x>size.z){root.rotation.y=Math.PI/2;root.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(root);size=box.getSize(new THREE.Vector3())}
 const scale=10/Math.max(size.x,size.z);root.scale.setScalar(scale);root.updateMatrixWorld(true);box=new THREE.Box3().setFromObject(root);root.position.y-=box.min.y;root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true}});
 // The supplied GLB exposes independent front-wheel assemblies and one rear axle
 // assembly containing both rear wheels. Keep every original mesh intact, and bind
 // those assemblies to the driving rig rather than substituting procedural wheels.
 const nodes={};root.traverse(o=>{if(o.name)nodes[o.name]=o});
 const frontLeft=nodes.WheelFrLeft_6,frontRight=nodes['WheelFrLeft.001_12'],rearAxle=nodes.WheelRearLeft_9;
 // This GLB bakes wheel vertices in the car's coordinate space. Rotating a
 // named wheel node directly therefore rotates it around the model origin,
 // not around the hub. Re-parent the original node under a zero-geometry
 // pivot at its measured hub centre. No tyre/rim mesh is created or replaced.
 function bindOriginalWheelToHub(wheel){
  if(!wheel?.parent)return null;
  wheel.updateWorldMatrix(true,true);
  const parent=wheel.parent,worldCenter=new THREE.Box3().setFromObject(wheel).getCenter(new THREE.Vector3()),hub=parent.worldToLocal(worldCenter.clone()),pivot=new THREE.Group();
  pivot.name=`${wheel.name} · 原始轮组转轴`;
  pivot.position.copy(hub);
  parent.add(pivot);
  parent.remove(wheel);
  wheel.position.sub(hub);
  pivot.add(wheel);
  pivot.userData.baseQuaternion=pivot.quaternion.clone();
  pivot.userData.wheelSpin=0;
  pivot.userData.originalWheelNode=wheel;
  return pivot;
 }
 const frontWheels=[frontLeft,frontRight].map(bindOriginalWheelToHub).filter(Boolean);
 const rearWheel=bindOriginalWheelToHub(rearAxle);
 const rollingWheels=[...frontWheels,...(rearWheel?[rearWheel]:[])];
 holder.userData={
  imported:true,
  credit:'Aventador SVJ SDC model © SDC PERFORMANCE™, CC Attribution',
  wheels:rollingWheels,
  frontWheels,
  brakes:[nodes.BrakeFrLeft_7,nodes.BrakeFrRight_8,nodes.BrakeRearLeft_10].filter(Boolean),
  rearAxleCombined:!!rearAxle
 };
 return holder;
}
function makeCar(spec,index){
 const next=index===0&&aventadorTemplate?importedAventador():buildSupercar(spec,index);
 // The procedural cars expose wheel groups too. Give them a stable rest pose
 // so switching cars cannot make the tyre rotation accumulate twice.
 for(const wheel of next.userData.wheels||[]){
  wheel.userData.baseQuaternion??=wheel.quaternion.clone();
  wheel.userData.wheelSpin??=0;
 }
 next.userData.restScale=next.scale.clone();
 return next;
}
let car=makeCar(carSpecs[0],0);scene.add(car);
let orbit=false,damage=0,audio,engine,gain,engineHarmonic,harmonicGain,jetEngine,jetGain,jetWhine,jetWhineGain,muted=false;
addEventListener('blur',()=>keys.clear());
addEventListener('keydown',e=>{if(e.repeat||!state.started)return;if(/^[4-9]$/.test(e.key))selectCar(+e.key-1);if(e.key.toLowerCase()==='v')orbit=!orbit;if(e.key.toLowerCase()==='m')muted=!muted;if(e.key.toLowerCase()==='n')toggleNight();if(e.key.toLowerCase()==='b'){collisionDebug.visible=!collisionDebug.visible;toast(collisionDebug.visible?'碰撞调试已开启：红=实体，蓝=水域，黄=台阶':'碰撞调试已关闭')}enableAudio();});
function enableAudio(){try{if(!audio){audio=new AudioContext();engine=audio.createOscillator();engineHarmonic=audio.createOscillator();gain=audio.createGain();harmonicGain=audio.createGain();engine.type='sawtooth';engineHarmonic.type='square';gain.gain.value=0;harmonicGain.gain.value=0;engine.connect(gain).connect(audio.destination);engineHarmonic.connect(harmonicGain).connect(audio.destination);engine.start();engineHarmonic.start();
   // Four-engine 747 ambience: a low turbine rumble plus a narrow high bypass
   // whine. It is intentionally synthesized, so no external copyrighted
   // recording is required and the sound follows throttle and airspeed.
   jetEngine=audio.createOscillator();jetWhine=audio.createOscillator();jetGain=audio.createGain();jetWhineGain=audio.createGain();jetEngine.type='sawtooth';jetWhine.type='triangle';jetGain.gain.value=0;jetWhineGain.gain.value=0;jetEngine.connect(jetGain).connect(audio.destination);jetWhine.connect(jetWhineGain).connect(audio.destination);jetEngine.start();jetWhine.start();
  }audio.resume();}catch(error){console.warn('Audio unavailable',error);}}
// Boeing 747-inspired silhouette: long wide-body fuselage, upper-deck hump,
// swept wings, four nacelles, stabilisers and a tall tail fin.
const plane=new THREE.Group();plane.name='Boeing 747-8 校园模拟飞行器';
const aircraftMat=boxMat(0xe5e1cd),wingMat=boxMat(0xd7d2bf),engineMat=boxMat(0xb9c0c4),redTail=boxMat(0xb3443e);
const fus=new THREE.Mesh(new THREE.CylinderGeometry(3.35,3.55,58,16),aircraftMat);fus.rotation.x=Math.PI/2;fus.castShadow=true;plane.add(fus);
const upperDeck=new THREE.Mesh(new THREE.CapsuleGeometry(2.35,13,8,16),aircraftMat);upperDeck.rotation.x=Math.PI/2;upperDeck.position.z=11;upperDeck.position.y=2.35;upperDeck.scale.set(1,1,.68);plane.add(upperDeck);
const wing=new THREE.Mesh(new THREE.BoxGeometry(74,1.25,15),wingMat);wing.rotation.y=.04;wing.position.z=1;plane.add(wing);
for(const sx of [-1,1])for(const z of [-4.5,4.5]){const nacelle=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.55,9,16),engineMat);nacelle.rotation.x=Math.PI/2;nacelle.position.set(sx*16, -1.3, z);nacelle.castShadow=true;plane.add(nacelle);const intake=new THREE.Mesh(new THREE.TorusGeometry(1.36,.16,10,24),boxMat(0x252b2f));intake.rotation.x=Math.PI/2;intake.position.copy(nacelle.position);plane.add(intake)}
const tail=new THREE.Mesh(new THREE.BoxGeometry(24,1.15,9),wingMat);tail.position.z=24;plane.add(tail);const fin=new THREE.Mesh(new THREE.BoxGeometry(1.35,15,9),redTail);fin.position.set(0,7.4,24);fin.rotation.x=-.14;plane.add(fin);plane.visible=false;scene.add(plane);
let aircraftAssetStatus='procedural-fallback';
new GLTFLoader().load('./work/boeing-747.glb',gltf=>{const model=gltf.scene;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());model.scale.setScalar(48/Math.max(size.x,size.z));model.position.set(-center.x*model.scale.x,-box.min.y*model.scale.y,-center.z*model.scale.z);model.rotation.y=Math.PI/2;plane.clear();plane.add(model);aircraftAssetStatus='boeing-747-cc-by-4.0';console.info('Boeing 747 GLB 已载入');},undefined,error=>console.warn('Boeing 747 GLB 加载失败，保留程序化飞机',error));

const state={mode:'car',carIndex:0,x:world(38.9812,117.3397).x,z:world(38.9812,117.3397).z,y:0,heading:Math.PI,speed:0,started:false,credits:0,mission:0};
let cameraPointer=null;
let activeBike=null,cameraYaw=0,cameraPitch=.2,cameraDistance=5.8,draggingCamera=false,lastPointer={x:0,y:0},walkCycle=0;
const wheelSpinAxis=new THREE.Vector3(1,0,0),wheelSteerAxis=new THREE.Vector3(0,1,0);
canvas.addEventListener('pointerdown',e=>{if(!state.started||state.mode!=='person'||cameraPointer!==null)return;cameraPointer=e.pointerId;draggingCamera=true;lastPointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!draggingCamera||e.pointerId!==cameraPointer)return;cameraYaw-=((e.clientX-lastPointer.x)/innerWidth)*Math.PI*2;cameraPitch=THREE.MathUtils.clamp(cameraPitch+((e.clientY-lastPointer.y)/innerHeight)*Math.PI*1.1,-.18,.65);lastPointer={x:e.clientX,y:e.clientY}});
function endCameraDrag(e){if(e.pointerId!==cameraPointer)return;draggingCamera=false;cameraPointer=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)}
canvas.addEventListener('pointerup',endCameraDrag);canvas.addEventListener('pointercancel',endCameraDrag);canvas.addEventListener('lostpointercapture',endCameraDrag);
addEventListener('blur',()=>{draggingCamera=false;cameraPointer=null});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();draggingCamera=false;cameraPointer=null;}});
canvas.addEventListener('wheel',e=>{if(state.mode==='person'){e.preventDefault();cameraDistance=THREE.MathUtils.clamp(cameraDistance+e.deltaY*.01,3.2,10)}},{passive:false});
const missions=['学一食堂','中心图书馆','人工智能学院','体育馆'];
if(new URLSearchParams(location.search).get('landmark')==='library'){const p=world(38.9836,117.3405293);state.x=p.x;state.z=p.z;state.heading=Math.PI;}
const buildingViews={east:[38.9834,117.34172],west:[38.9836,117.33920],activity:[38.9859,117.34401],statue:[38.98412,117.34054]};
const requestedView=buildingViews[new URLSearchParams(location.search).get('landmark')];
const photoViews={law:[38.9889,117.33574],finance:[38.98875,117.3370],marx:[38.9899,117.33766],history:[38.98965,117.33702],computer:[38.98505,117.33605],wood:[38.98835,117.33314],commerce:[38.9914,117.33530],gym:[38.9905,117.34102],culture:[38.98925,117.33534]};
const photoView=photoViews[new URLSearchParams(location.search).get('landmark')];if(photoView){const p=world(...photoView);state.x=p.x;state.z=p.z;state.heading=Math.PI;}
if(requestedView){const p=world(...requestedView);state.x=p.x;state.z=p.z;state.heading=Math.PI;}
function currentTarget(){return interactive.find(x=>x.name.includes(missions[state.mission]))}
const keyboardKeys=new Set();
const touch=createTouchControls({started:()=>state.started,action:action=>{if(!state.started)return;if(action==='person')togglePerson();if(action==='interact')interact();if(action==='plane')switchVehicle();if(action==='night')toggleNight();if(action==='reset')reset();if(action==='orbit')orbit=!orbit;if(action==='zoom-in')cameraDistance=THREE.MathUtils.clamp(cameraDistance-.8,3.2,10);if(action==='zoom-out')cameraDistance=THREE.MathUtils.clamp(cameraDistance+.8,3.2,10);if(action==='mute'){muted=!muted;return muted;}}});
const keys={has:k=>keyboardKeys.has(k)||touch.has(k),add:k=>keyboardKeys.add(k),delete:k=>keyboardKeys.delete(k),clear:()=>{keyboardKeys.clear();touch.clear();}};addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(!state.started)return;keys.add(k);if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();if(k==='f'&&!e.repeat)switchVehicle();if(k==='c'&&!e.repeat)togglePerson();if(k==='e'&&!e.repeat)interact();if(k==='r')reset();if(['1','2','3'].includes(k)&&!e.repeat)selectCar(Number(k)-1)});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
let toastTimer;function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2800)}
function toggleNight(){gameMinutes=gameMinutes<1000?1170:620;toast(gameMinutes>1000?'夜景已开启：路灯、窗光与低照度阴影生效':'日景已开启')}
function missionText(){const t=currentTarget();if(!t){$('#mission-title').textContent='校园通关';$('#mission-text').textContent='任务完成，已解锁完整自由飞行';return}$('#mission-title').textContent=`任务 ${state.mission+1}/4 · ${t.name}`;$('#mission-text').textContent=`前往黄色光柱，靠近后${touchDevice?'点互动':'按 E'}`}
function selectCar(index){if(!state.started)return;if(index<0||index>=carSpecs.length)return;const old=car,visible=state.mode==='car';state.carIndex=index;state.speed=0;car=makeCar(carSpecs[index],index);car.position.copy(old.position);car.rotation.copy(old.rotation);car.visible=visible;scene.remove(old);scene.add(car);document.querySelectorAll('.garage button').forEach((b,i)=>b.classList.toggle('selected',i===index));if(visible)$('#vehicle').textContent=carSpecs[index].name;toast(`已换车：${carSpecs[index].name}`)}
document.querySelectorAll('.garage button').forEach(b=>b.onclick=()=>selectCar(Number(b.dataset.car)));
new GLTFLoader().load('./work/aventador-svj-sdc.glb',gltf=>{
 aventadorTemplate=gltf.scene;
 if(state.carIndex===0){const p=car.position.clone(),r=car.rotation.clone(),visible=car.visible;scene.remove(car);car=makeCar(carSpecs[0],0);car.position.copy(p);car.rotation.copy(r);car.visible=visible;scene.add(car);toast('Aventador SVJ 高精度实车模型已载入')}
},undefined,error=>{console.warn('Aventador asset unavailable',error);toast('高精度 Aventador 模型未载入，暂使用基础车型')});
function resetMotion(){
 state.speed=0;state.motionHeading=state.heading;state.bikeSteer=0;state.avatarBob=0;
 keys.clear();touch.setMode(state.mode);draggingCamera=false;cameraPointer=null;cameraYaw=0;orbit=false;
}
function leaveBicycle(){
 if(!activeBike)return;
 activeBike.rotation.x=0;
 // Step to a free point beside the bicycle rather than standing in its frame.
 for(const side of [1,-1]){
  const p={x:state.x+Math.cos(state.heading)*1.5*side,z:state.z-Math.sin(state.heading)*1.5*side};
  if(!vehicleBlocked(state,p,.42)){state.x=p.x;state.z=p.z;break;}
 }
 activeBike=null;
}
function applyMode(mode){
 if(state.mode==='bike')leaveBicycle();
 state.mode=mode;resetMotion();
 state.y=mode==='plane'?Math.max(state.y,5):stairHeight(state.x,state.z);
 car.visible=mode==='car';plane.visible=mode==='plane';campusLife.player.visible=mode==='person';
 campusLife.player.userData.tag.visible=false;
 cameraDistance=4.8;cameraPitch=.2;
 $('#vehicle').textContent=mode==='car'?carSpecs[state.carIndex].name:mode==='plane'?'校园模拟飞行器':'Winslow · 本科新生';
}
function switchVehicle(){
 applyMode(state.mode==='plane'?'car':'plane');
 toast(state.mode==='plane'?(touchDevice?'模拟飞行：限高 120 米，油门加速，按钮升降':'模拟飞行模式：限高 120 米，W 加速，Shift 上升'):`${carSpecs[state.carIndex].name}：极速 320 km/h`);
}
function togglePerson(){
 applyMode(state.mode==='person'?'car':'person');
 toast(state.mode==='person'?'Winslow 已下车：拖动画面环视':'Winslow 已上车');
}
function interact(){
 if(state.mode==='bike'){applyMode('person');toast('已停好公共自行车');return}
 if(state.mode==='person'){const nearest=campusLife.bikes.reduce((best,b)=>!best||b.position.distanceToSquared(new THREE.Vector3(state.x,0,state.z))<best.position.distanceToSquared(new THREE.Vector3(state.x,0,state.z))?b:best,null);if(nearest&&Math.hypot(state.x-nearest.position.x,state.z-nearest.position.z)<5){activeBike=nearest;state.x=nearest.position.x;state.z=nearest.position.z;state.heading=nearest.rotation.y-Math.PI/2;state.mode='bike';resetMotion();campusLife.player.visible=true;campusLife.player.userData.tag.visible=false;$('#vehicle').textContent=nearest.userData.type==='byte-ebike'?'蓝色共享 E-BIKE':nearest.userData.type==='red-bike'?'红色共享单车':'黄色共享单车';toast(touchDevice?'已上车：摇杆骑行，点停好单车下车':'已上车：WASD 骑行，E 停车');return}}
 const t=currentTarget();if(!t){toast('自由探索模式');return}const hour=gameMinutes/60;if(t.type==='food'&&(hour<6.5||hour>21.5)){toast(`${t.name} 当前未营业（06:30–21:30）`);return}if(/学院|图书馆/.test(t.name)&&(hour<7.5||hour>22.5)){toast(`${t.name} 当前闭馆/闭楼（07:30–22:30）`);return}const dist=Math.hypot(state.x-t.pos.x,state.z-t.pos.z);if(dist>90||state.y>18){toast(`距离 ${t.name} 还有 ${Math.round(dist)} 米`);return}state.credits+=t.reward;state.mission++;$('#credits').textContent=`校园币 ${state.credits}`;toast(t.type==='food'?`在 ${t.name} 用餐完成！+${t.reward} 校园币`:`完成 ${t.name} 任务！+${t.reward} 校园币`);missionText()}
function reset(){
 if(state.mode==='bike')leaveBicycle();
 activeBike=null;
 const p=world(38.9812,117.3397);
 Object.assign(state,{x:p.x,z:p.z,y:0,heading:Math.PI});
 applyMode('car');damage=0;car.scale.copy(car.userData.restScale);
 // Return the starter bicycle too, so it remains available after a riding reset.
 campusLife.bikes.filter(b=>b.userData.starter).forEach((bike,i)=>{
  bike.position.set(p.x+(i? -3.2:3.2),0,p.z+1);bike.rotation.set(0,Math.PI/2,0);
  bike.updateMatrixWorld(true);const contact=new THREE.Box3();
  for(const wheel of bike.userData.wheels||[])contact.expandByObject(wheel,true);
  if(!contact.isEmpty())bike.position.y+=.18-contact.min.y;
 });
 camera.position.set(state.x,6.4,state.z+17);
 toast('已回到南门');
}
function enterCampus(){
 if(state.started||!campusReady)return;
 $('#start').style.display='none';
 state.started=true;
 enableAudio();touch.start();
 camera.position.set(state.x-Math.sin(state.heading)*17,state.y+6.4,state.z-Math.cos(state.heading)*17);
 camera.lookAt(state.x,state.y+1.35,state.z);
 missionText();
 toast('从南门出发，沿主轴去完成校园任务！');
}
$('#start-btn').onclick=enterCampus;
addEventListener('keydown',e=>{
 if(!state.started&&(e.key==='Enter'||e.key===' ')){
  e.preventDefault();
  enterCampus();
 }
});

const beacon=new THREE.Group();const beam=new THREE.Mesh(new THREE.CylinderGeometry(4,13,150,20,1,true),new THREE.MeshBasicMaterial({color:0xffdb43,transparent:true,opacity:.28,side:THREE.DoubleSide}));beam.position.y=75;beacon.add(beam);const ring=new THREE.Mesh(new THREE.TorusGeometry(25,2,10,40),new THREE.MeshBasicMaterial({color:0xffe45e}));ring.rotation.x=Math.PI/2;ring.position.y=3;beacon.add(ring);scene.add(beacon);

function inCourtyard(b,x,z,r=0){return withinCourtyard(b.courtyard,x,z,r)||withinCourtyard(b.groundOpening,x,z,r)}
function pathDistanceSq(x,z,points){let best=Infinity;for(let i=1;i<points.length;i++)best=Math.min(best,pointToSegmentSq(x,z,points[i-1],points[i]));return best}
function onBridge(x,z){return bridgeZones.some(b=>Math.hypot(x-b.x,z-b.z)<b.r)}
function inWater(x,z){if(onBridge(x,z))return false;if(waterAreas.some(w=>inside(x,z,w.points)))return true;return waterPaths.some(w=>pathDistanceSq(x,z,w.points)<(w.width*.5)**2)}
function onStairs(x,z){for(const s of stairSegments){const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,l2=dx*dx+dz*dz||1,t=THREE.MathUtils.clamp(((x-s.a.x)*dx+(z-s.a.z)*dz)/l2,0,1),px=s.a.x+dx*t,pz=s.a.z+dz*t;if(Math.hypot(x-px,z-pz)<s.width*.5+.45)return {height:s.height*t}}return null}
function solidHit(x,z,r){return solidColliders.some(s=>s.box?Math.abs(x-s.x)<s.box.halfX+r&&Math.abs(z-s.z)<s.box.halfZ+r:Math.hypot(x-s.x,z-s.z)<s.r+r)}
function collisionAt(x,z,r,mode){if(inWater(x,z)||solidHit(x,z,r))return true;const stairs=onStairs(x,z);if(stairs&&mode!=='person')return true;for(const b of collisionBuildings){if(inCourtyard(b,x,z,r))continue;const isIn=inside(x,z,b.points);if(b.interior&&mode==='person'){if(isIn&&b.interiorBoxes?.some(q=>x>q.min.x-r&&x<q.max.x+r&&z>q.min.z-r&&z<q.max.z+r))return true;continue}if(isIn)return true;if(nearPolygonEdge(x,z,b.points,r))return true}return false}
function libraryCrossingBlocked(from,to,r){const lib=collisionBuildings.find(b=>b.interior);if(!lib)return false;const was=inside(from.x,from.z,lib.points),now=inside(to.x,to.z,lib.points);if(was===now)return false;return !lib.door||Math.hypot(to.x-lib.door.x,to.z-lib.door.z)>8.5+r}
function vehicleBlocked(from,to,radius){
 return sampledPathBlocked(from,to,radius,(x,z,r)=>collisionAt(x,z,r,state.mode),libraryCrossingBlocked);
}
function stairHeight(x,z){if(state.mode!=='person')return 0;const s=onStairs(x,z);if(s)return s.height;if(!libraryDoor)return 0;const d=Math.hypot(x-libraryDoor.x,z-libraryDoor.z);return d<13?Math.max(0,(13-d)*.16):0}
function aircraftBlocked(from,to,alt){if(alt<5&&inWater(to.x,to.z))return true;for(const b of collisionBuildings)if(!withinCourtyard(b.courtyard,to.x,to.z,5)&&inside(to.x,to.z,b.points)&&alt<b.height+2)return true;return alt<12&&solidHit(to.x,to.z,5)}
function debugLine(points,color){const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(p.x,.8,p.z)));const l=new THREE.LineLoop(g,new THREE.LineBasicMaterial({color,depthTest:false}));l.renderOrder=100;collisionDebug.add(l)}
function buildCollisionDebug(){collisionDebug.clear();collisionBuildings.forEach(b=>debugLine(b.points,0xff3344));waterAreas.forEach(w=>debugLine(w.points,0x32b6ff));stairSegments.forEach(s=>debugLine([s.a,new THREE.Vector3(s.b.x,0,s.b.z),new THREE.Vector3(s.b.x+s.width*.5,0,s.b.z),new THREE.Vector3(s.a.x+s.width*.5,0,s.a.z)],0xffd53d));for(const w of waterPaths){const g=new THREE.BufferGeometry().setFromPoints(w.points.map(p=>new THREE.Vector3(p.x,.9,p.z)));collisionDebug.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:0x32b6ff,depthTest:false})))}solidColliders.forEach(s=>{const geo=new THREE.RingGeometry(Math.max(.12,(s.r||.5)-.08),s.r||.5,16);const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xff3344,side:THREE.DoubleSide,depthTest:false}));m.rotation.x=-Math.PI/2;m.position.set(s.x,1,s.z);collisionDebug.add(m)})}
let campusDriveLanes=[];
function onDriveLane(x,z){return campusDriveLanes.some(l=>pointToSegmentSq(x,z,l.a,l.b)<Math.max(8,l.width*.7)**2)}
let prev=performance.now(),gameMinutes=620;
function update(dt){if(!state.started)return;
 const previous={x:state.x,z:state.z,y:state.y},spec=carSpecs[state.carIndex],isCar=state.mode==='car',isPerson=state.mode==='person',isBike=state.mode==='bike',throttle=keys.has('w')||keys.has('arrowup'),brake=keys.has('s')||keys.has('arrowdown'),drift=isCar&&keys.has(' ');
 const max=isCar?spec.max/SPEED_DISPLAY_SCALE:isBike?5.8:isPerson?3.4:58,accel=isCar?13:isBike?9:isPerson?8:24;
 if(throttle)state.speed+=accel*dt;if(brake)state.speed-=accel*1.4*dt;
 state.speed*=Math.pow(drift?.42:throttle?.91:.5,dt);state.speed=THREE.MathUtils.clamp(state.speed,-12,max);
 const steering=(keys.has('a')||keys.has('arrowleft')?1:0)-(keys.has('d')||keys.has('arrowright')?1:0);
 if(isBike){state.speed=Math.max(0,state.speed);state.bikeSteer=THREE.MathUtils.lerp(state.bikeSteer||0,-steering*.42,1-Math.exp(-dt*8));state.pedalPhase??=0;if(throttle&&!brake&&state.speed>.05)state.pedalPhase+=dt*Math.min(9,2.5+state.speed*.9);}
 state.heading+=steering*(drift?2.5:1.25)*Math.min(1,Math.abs(state.speed)/8)*dt*Math.sign(state.speed||1);
 state.motionHeading??=state.heading;state.motionHeading+=Math.atan2(Math.sin(state.heading-state.motionHeading),Math.cos(state.heading-state.motionHeading))*Math.min(1,dt*(drift?1.8:12));
 state.x+=Math.sin(state.motionHeading)*state.speed*dt;state.z+=Math.cos(state.motionHeading)*state.speed*dt;
 if(state.mode==='plane'){if(keys.has('shift'))state.y+=25*dt;if(keys.has(' '))state.y-=25*dt;if(state.speed>14&&!keys.has(' '))state.y+=4*dt;state.y=THREE.MathUtils.clamp(state.y,4,120)}
 if(state.mode==='plane'?aircraftBlocked(previous,state,state.y):vehicleBlocked(previous,state,isCar?7:isBike?.75:.42)){if(isCar){damage=Math.min(100,damage+Math.abs(state.speed)*.35);toast('碰撞 · 车损 '+Math.round(damage)+'%')}else toast(state.mode==='plane'?'低空障碍，已中止起降':isBike?'前方有障碍，已刹车':'前方有建筑，无法穿墙');state.x=previous.x;state.z=previous.z;state.speed=0;state.y=previous.y;if(isCar)car.scale.z=car.userData.restScale.z*(1-damage*.0015);}
 for(const m of car.userData.brakes||[]){m.traverse?.(part=>{if(part.isMesh&&part.material?.emissive){part.material.emissive.setHex(0xff180d);part.material.emissiveIntensity=brake||drift?2.4:.16}});if(m.emissiveIntensity!==undefined)m.emissiveIntensity=brake||drift?5:.7}
 // GLB wheels use the local X axle. Compose steering and rolling from the
 // original pose, rather than writing two Euler angles to the same wheel.
 for(const wheel of (isCar?car.userData.wheels:[])||[]){
  wheel.userData.wheelSpin=(wheel.userData.wheelSpin||0)+state.speed*dt/.7;
  const spin=new THREE.Quaternion().setFromAxisAngle(wheelSpinAxis,wheel.userData.wheelSpin);
  const steer=car.userData.frontWheels?.includes(wheel)?new THREE.Quaternion().setFromAxisAngle(wheelSteerAxis,-steering*.42):null;
  wheel.quaternion.copy(wheel.userData.baseQuaternion||wheel.quaternion);
  if(steer)wheel.quaternion.multiply(steer);
  wheel.quaternion.multiply(spin);
 }
 // The imported bicycle uses its own authored front/rear wheel pivots. No
 // generated tyres are drawn over it: both original wheel groups roll, and
 // the front assembly is the only one that steers.
 for(const wheel of (isBike?activeBike?.userData.wheels:[])||[]){
  wheel.userData.wheelSpin=(wheel.userData.wheelSpin||0)+state.speed*dt/.34;
  const spin=new THREE.Quaternion().setFromAxisAngle(wheelSpinAxis,wheel.userData.wheelSpin);
  const steer=activeBike.userData.frontWheels?.includes(wheel)?new THREE.Quaternion().setFromAxisAngle(wheelSteerAxis,state.bikeSteer||0):null;
  wheel.quaternion.copy(wheel.userData.baseQuaternion||wheel.quaternion);
  if(steer)wheel.quaternion.multiply(steer);
  wheel.quaternion.multiply(spin);
 }
 if(engine){const rpm=(state.carIndex===1?48:38)+Math.abs(state.speed)*2.25+(throttle?42:0);engine.frequency.setTargetAtTime(rpm,audio.currentTime,.06);engineHarmonic.frequency.setTargetAtTime(rpm*2.03,audio.currentTime,.06);gain.gain.setTargetAtTime(muted||!isCar?0:throttle?.022:.008,audio.currentTime,.06);harmonicGain.gain.setTargetAtTime(muted||!isCar?0:throttle?.006:.0015,audio.currentTime,.06)}
 if(jetEngine){const airspeed=Math.abs(state.speed),base=72+airspeed*3.1+(throttle?34:0);jetEngine.frequency.setTargetAtTime(base,audio.currentTime,.08);jetWhine.frequency.setTargetAtTime(base*5.7,audio.currentTime,.08);jetGain.gain.setTargetAtTime(muted||state.mode!=='plane'?0:.018+airspeed*.0008,audio.currentTime,.08);jetWhineGain.gain.setTargetAtTime(muted||state.mode!=='plane'?0:.004+airspeed*.0002,audio.currentTime,.08)}

  if(state.mode!=='plane')state.y=stairHeight(state.x,state.z);
  const avatar=campusLife.player,walking=isPerson&&Math.abs(state.speed)>.12,riding=isBike,pose=avatar.userData;if(walking||riding)walkCycle+=dt*(riding?5+Math.abs(state.speed)*1.5:7+Math.abs(state.speed)*1.8);const swing=walking?Math.sin(walkCycle)*.72:0,pedal=riding?Math.sin(walkCycle)*.64:0,headNod=walking?Math.sin(walkCycle*2)*.075:0,blend=1-Math.exp(-dt*15),idle=Math.sin(performance.now()*.0016)*.012;
  if(pose.arms){const armL=riding?-.92:swing,armR=riding?-.92:-swing,legL=riding?.6+pedal:-swing*.52,legR=riding?.6-pedal:swing*.52;pose.arms[0].rotation.x=THREE.MathUtils.lerp(pose.arms[0].rotation.x,armL,blend);pose.arms[1].rotation.x=THREE.MathUtils.lerp(pose.arms[1].rotation.x,armR,blend);pose.legs[0].rotation.x=THREE.MathUtils.lerp(pose.legs[0].rotation.x,legL,blend);pose.legs[1].rotation.x=THREE.MathUtils.lerp(pose.legs[1].rotation.x,legR,blend);pose.torso.rotation.x=THREE.MathUtils.lerp(pose.torso.rotation.x,riding?.24:0,blend);pose.head.rotation.x=THREE.MathUtils.lerp(pose.head.rotation.x,headNod,blend);avatar.scale.y=.27*(1+idle);state.avatarBob=walking?Math.abs(Math.sin(walkCycle*2))*.045:0}
  if(riding){avatar.scale.y=.27;poseBicycleRider(avatar,{phase:state.pedalPhase||0,steer:state.bikeSteer||0,moving:state.speed>.15,pedaling:throttle&&!brake});}
  else for(const limb of [...(pose.arms||[]),...(pose.legs||[])]){limb.rotation.z=0;limb.rotation.y=0;limb.userData.bend?.quaternion.identity();limb.userData.end?.quaternion.identity();}
 state.x=THREE.MathUtils.clamp(state.x,-1250,1250);state.z=THREE.MathUtils.clamp(state.z,-900,900);gameMinutes=(gameMinutes+dt*2.4)%1440;const h=String(Math.floor(gameMinutes/60)).padStart(2,'0'),m=String(Math.floor(gameMinutes%60)).padStart(2,'0');$('#clock').textContent=`${h}:${m}`;const displaySpeed=state.mode==='plane'?Math.round(Math.abs(state.speed)*18):Math.min(SUPERCAR_TOP_SPEED_KMH,Math.round(Math.abs(state.speed)*SPEED_DISPLAY_SCALE));$('#speed').textContent=`${displaySpeed} km/h`;
 const daylight=Math.max(0,Math.sin((gameMinutes/1440)*Math.PI*2-Math.PI/2));sun.intensity=.26+daylight*3.1;hemi.intensity=.52+daylight*2.2;scene.background.setHSL(.57,.42,.13+daylight*.45);scene.fog.color.setHSL(.57,.28,.16+daylight*.47);for(const lamp of campusLife.nightLights)lamp.intensity=(1-daylight)*ultra*8.5;
}
function animate(now){requestAnimationFrame(animate);const dt=Math.min(.05,(now-prev)/1000);prev=now;update(dt);const active=state.mode==='car'?car:state.mode==='plane'?plane:state.mode==='bike'?activeBike:campusLife.player;if(active){active.position.set(state.x,state.y+(state.mode==='person'?(state.avatarBob||0):0),state.z);active.rotation.y=state.mode==='bike'?state.heading+Math.PI/2:state.heading}if(state.mode==='car'){car.rotation.z=THREE.MathUtils.lerp(car.rotation.z,-((keys.has('a')?1:0)-(keys.has('d')?1:0))*.035*Math.min(1,Math.abs(state.speed)/20),dt*8);car.rotation.x=THREE.MathUtils.lerp(car.rotation.x,(keys.has('s')?-.035:keys.has('w')?.018:0),dt*7)}if(state.mode==='bike'){const lean=THREE.MathUtils.clamp((state.bikeSteer||0)*state.speed*.08,-.19,.19);activeBike.rotation.x=lean;campusLife.player.position.set(state.x,state.y+.5,state.z);campusLife.player.rotation.set(0,state.heading,lean);campusLife.player.userData.tag.visible=false}else {campusLife.player.rotation.x=0;campusLife.player.rotation.z=0;}plane.rotation.z=THREE.MathUtils.lerp(plane.rotation.z,(keys.has('a')?-.18:keys.has('d')?.18:0),.08);
  // Keep feet above the actual road surface after returning from the riding pose.
  if(state.mode==='person'){
    const avatar=campusLife.player,feet=new THREE.Box3();
    avatar.updateMatrixWorld(true);
    for(const leg of avatar.userData.legs||[])feet.expandByObject(leg.userData.end,true);
    if(!feet.isEmpty())avatar.position.y+=state.y+(onDriveLane(state.x,state.z) ? .18 : .02)-feet.min.y;
  }
  // The road is a raised mesh, not y=0. Recompute tyre contact after rolling
  // and lean so the lowest original wheel point stays above its surface.
  if(state.mode==='bike'&&activeBike){
    activeBike.updateMatrixWorld(true);
    const contact=new THREE.Box3();for(const wheel of activeBike.userData.wheels||[])contact.expandByObject(wheel,true);
    if(!contact.isEmpty()){
      const lift=state.y+.18-contact.min.y;
      activeBike.position.y+=lift;
      campusLife.player.position.y+=lift;
      activeBike.updateMatrixWorld(true);
    }
  }
  const personView=state.mode==='person',viewing=personView?state.heading+cameraYaw:state.heading+(orbit?now*.00035:0),forward=new THREE.Vector3(Math.sin(viewing),0,Math.cos(viewing)),carSpeed=Math.min(1,Math.abs(state.speed)/80),distance=personView?cameraDistance:state.mode==='bike'?8:state.mode==='car'?17+carSpeed*8:150,camOffset=forward.clone().multiplyScalar(-distance);camOffset.y=personView?2.25+Math.sin(cameraPitch)*distance*.32:state.mode==='bike'?4:state.mode==='car'?6.4+carSpeed*1.8:80;const desired=new THREE.Vector3(state.x,state.y,state.z).add(camOffset);camera.position.lerp(desired,1-Math.pow(personView ? .00003 : state.mode==='car'?.0012:.0003,dt));camera.lookAt(state.x,state.y+(personView?1.25:state.mode==='bike'?1.6:state.mode==='car'?1.35:10),state.z);
  const target=currentTarget();beacon.visible=!!target;if(target){beacon.position.set(target.pos.x,0,target.pos.z);ring.rotation.z+=dt;beam.material.opacity=.2+Math.sin(now*.004)*.08}
  renderer.render(scene,camera);
}
loadCampus(scene,world).then(result=>{
 collisionBuildings=result.obstacles;result.group.traverse(o=>{if(o.userData.photoColliders)solidColliders.push(...o.userData.photoColliders);});solidColliders.push(...result.photoDetails.userData.photoColliders);campusDriveLanes=result.driveLanes;libraryDoor=result.libraryDoor;waterAreas=result.waterAreas;stairSegments=result.stairSegments;
 buildCollisionDebug();campus.children.filter(o=>o.userData.schematic).forEach(o=>o.visible=false);
 if(new URLSearchParams(location.search).get('qa')==='1')window.__campusQA={scene,state,camera,renderer,photoIds:result.photoDetails.userData.usedPhotoIds,collisionAt,solidColliders,buildings:collisionBuildings};
 campusReady=true;
 $('#runtime-status').textContent=`校园地图已就绪：${result.buildings} 栋建筑 / ${result.roads} 段道路`;
 $('#runtime-status').dataset.state='ready';
 $('#start-btn').disabled=false;$('#start-btn').textContent='进入校园';$('#start-btn').onclick=enterCampus;
}).catch(error=>{
 console.warn('Campus map unavailable',error);
 $('#runtime-status').textContent='校园地图加载失败，暂不能开始试玩。请重新加载后再试。';
 $('#runtime-status').dataset.state='error';
 $('#start-btn').disabled=false;$('#start-btn').textContent='重新加载';$('#start-btn').onclick=()=>location.reload();
});
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();animate(performance.now());
