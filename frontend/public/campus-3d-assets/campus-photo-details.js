import * as T from './vendor/three/build/three.module.js';
import {mergeGeometries} from './vendor/three/examples/jsm/utils/BufferGeometryUtils.js';

// Photograph numbers refer to work/campus-photo-survey.json. These are modeled
// objects and reusable material/detail studies, never flat photo billboards.
const groups={commerce:[1,3,21,24,30,44,51,55,59,63,65],computer:[2,9,25,27,33],gym:[6],teaching:[7,37,50,54],bridge:[50,54],academic:[10,13,18,19,22,31,38,42,47,49,52,58,67],roads:[8,11,12,16,17,34,41,56,64,66],activity:[14],gate:[15],library:[20,26,28,48,60],historic:[29],stone:[23,36],culture:[35,39],canteens:[4,5,40],service:[43],law:[45],planet:[46],marx:[53],history:[61],finance:[62],labs:[32,57]};
const color=(hex)=>new T.MeshStandardMaterial({color:hex,roughness:.88});
const stone=color(0xc2b9a7),lightStone=color(0xd1c8b7),dark=new T.MeshStandardMaterial({color:0x303639,roughness:.5,metalness:.35}),glass=new T.MeshStandardMaterial({color:0x405963,roughness:.22,metalness:.5}),hedgeMat=color(0x41643a),redPaving=color(0xb68671),white=color(0xe5ddcf),red=color(0xb63930);
let brickMaterial,pavingMaterial;
export function preparePhotoMaterials(){
 if(brickMaterial)return;
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#807165';x.fillRect(0,0,256,256);
 for(let row=0;row<32;row++)for(let col=-1;col<12;col++){const v=(row*17+col*11+91)%19;x.fillStyle=`rgb(${130+v},${79+v},${62+v})`;x.fillRect(col*24+(row%2)*12,row*8,23,7);x.fillStyle='#b59580';x.fillRect(col*24+(row%2)*12,row*8,23,.45);}
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(8,6);brickMaterial=new T.MeshStandardMaterial({map,roughness:.93});
 const p=document.createElement('canvas');p.width=p.height=256;const ctx=p.getContext('2d');ctx.fillStyle='#a9a398';ctx.fillRect(0,0,256,256);
 for(let r=0;r<8;r++)for(let col=-1;col<5;col++){const v=150+(r*13+col*9+47)%23;ctx.fillStyle=`rgb(${v+8},${v+6},${v})`;ctx.fillRect(col*64+(r%2)*32,r*32,62,30);ctx.strokeStyle='#d4cdc0';ctx.strokeRect(col*64+(r%2)*32+.5,r*32+.5,61,29);}
 const tile=new T.CanvasTexture(p);tile.colorSpace=T.SRGBColorSpace;tile.wrapS=tile.wrapT=T.RepeatWrapping;tile.repeat.set(10,8);pavingMaterial=new T.MeshStandardMaterial({map:tile,roughness:1});
}
// Bake static detail transforms and batch matching materials. Photo provenance
// remains on each batch; animated gameplay objects are never passed here.
export function optimizePhotoDetails(root){
 root.updateMatrixWorld(true);
 if(!root.userData.photoColliders){const colliders=[];root.traverse(o=>{if(o.visible&&o.userData.photoSolid){const b=new T.Box3().setFromObject(o),p=b.getCenter(new T.Vector3()),size=b.getSize(new T.Vector3());colliders.push({x:p.x,z:p.z,box:{halfX:size.x/2,halfZ:size.z/2},type:'photo-fixture'});}if(o.visible&&o.userData.photoRadius){const p=o.getWorldPosition(new T.Vector3());colliders.push({x:p.x,z:p.z,r:o.userData.photoRadius,type:'photo-trunk'});}});root.userData.photoColliders=colliders;}
 const inverse=root.matrixWorld.clone().invert(),batches=new Map();
 root.traverse(o=>{if(!o.isMesh||Array.isArray(o.material)||o.material.transparent||o.userData.photoBatch)return;
  const ids=new Set();for(let p=o;p;p=p.parent){for(const n of p.userData.photoIds||[])ids.add(n);if(p===root)break;}
  let component=null,sourceIds=[];for(let p=o;p;p=p.parent){if(p.userData.photoComponent){component=p.userData.photoComponent;sourceIds=p.userData.evidencePhotoIds||[];break;}if(p===root)break;}
  const provenance=[...ids].sort((a,b)=>a-b),signature=Object.keys(o.geometry.attributes).sort().join(','),key=o.material.uuid+signature+provenance.join('-')+(component||'');
  if(!batches.has(key))batches.set(key,{material:o.material,ids:provenance,component,sourceIds,objects:[],geometries:[]});
  const b=batches.get(key),geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geometry.applyMatrix4(inverse.clone().multiply(o.matrixWorld));b.geometries.push(geometry);b.objects.push(o);
 });
 for(const b of batches.values()){if(b.objects.length<2){b.geometries.forEach(g=>g.dispose());continue;}const geometry=mergeGeometries(b.geometries,false);if(!geometry){b.geometries.forEach(g=>g.dispose());continue;}
  const mesh=new T.Mesh(geometry,b.material);mesh.castShadow=b.objects.some(o=>o.castShadow);mesh.receiveShadow=true;mesh.userData={photoIds:b.ids,photoBatch:true,photoComponent:b.component,evidencePhotoIds:b.sourceIds};root.add(mesh);for(const o of b.objects){o.removeFromParent();o.geometry.dispose();}b.geometries.forEach(g=>g.dispose());
 }
 return root;
}
function evidence(g,component,ids){g.userData.photoComponent=component;g.userData.evidencePhotoIds=ids;return g;}
function part(g,component,ids,build){const detail=evidence(new T.Group(),component,ids);g.add(detail);build(detail);return detail;}
function mark(g,key,label){g.name=label;g.userData.photoGroup=key;g.userData.photoIds=groups[key];if(!['academic','commerce','roads'].includes(key))evidence(g,key,groups[key]);return g;}
function box(g,w,h,d,x,y,z,material=brickMaterial){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=h>.3;m.receiveShadow=true;g.add(m);return m;}
function cylinder(g,r,h,x,y,z,m=brickMaterial,segments=28){const o=new T.Mesh(new T.CylinderGeometry(r,r,h,segments),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;}
function label(g,text,w,h,x,y,z,ink='#f5eee4',background=null){const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');if(background){ctx.fillStyle=background;ctx.fillRect(0,0,1024,256);}ctx.fillStyle=ink;ctx.font='600 82px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,128,960);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent:!background,side:T.DoubleSide,depthWrite:!!background}));o.position.set(x,y,z);g.add(o);return o;}
function stairs(g,w,z,count=5,rise=.16){for(let i=0;i<count;i++)box(g,w,.18,.65,0,.09+i*rise,z-i*.65,stone);}
function rail(g,x,z,length){box(g,.055,.9,length,x,.85,z,dark);for(let dz=-length/2;dz<=length/2;dz+=1.2)box(g,.07,.8,.07,x,.48,z+dz,dark);}
function bollards(g,width,z){for(let x=-width/2;x<=width/2;x+=4)cylinder(g,.3,.55,x,.3,z,stone,10);}
function hedge(g,x,z,w,d=1.6){box(g,w,.85,d,x,.5,z,hedgeMat);box(g,w+.25,.2,d+.25,x,.1,z,stone);}
function tree(g,x,z,scale=1,slender=false){const trunk=new T.Mesh(new T.CylinderGeometry(.16*scale,.23*scale,5.4*scale,6),color(0x78624b));trunk.position.set(x,2.7*scale,z);trunk.userData.photoRadius=.23*scale;g.add(trunk);cylinder(g,.245*scale,1.1*scale,x,.55*scale,z,white,6);for(let k=0;k<3;k++){const crown=new T.Mesh(new T.IcosahedronGeometry((slender?1.25:2.15)*scale,1),color(k===1?0x9a984c:0x617846));crown.scale.set(1,slender?2:1,1);crown.position.set(x+(slender?0:(k-1)*.65), (5.3+k*.9)*scale,z);crown.castShadow=true;g.add(crown);}box(g,2.5*scale,.12,2.5*scale,x,.1,z,redPaving);}
function lamp(g,x,z,disc=true){cylinder(g,.07,5.5,x,2.75,z,dark,6);if(disc){const rim=cylinder(g,.5,.12,x,5.5,z,dark,16);cylinder(g,.38,.1,x,5.4,z,white,16);}else{box(g,1.3,.12,.15,x+.5,5.6,z,white);box(g,.6,.12,.28,x+1,5.5,z,lightStone);}}
function cycleRack(g,w,z){for(let x=-w/2;x<=w/2;x+=1.8){box(g,.06,.75,.06,x,.45,z-.75,white);box(g,.06,.75,.06,x,.45,z+.75,white);box(g,.06,.06,1.55,x,.85,z,white);}}
function frame(points){
 const clean=points.filter((p,i)=>i===0||p.distanceTo(points[i-1])>.05);if(clean.at(-1).distanceTo(clean[0])<.05)clean.pop();
 const center=new T.Box3().setFromPoints(clean).getCenter(new T.Vector3());let edge,score=-Infinity;
 for(let i=0;i<clean.length;i++){const a=clean[i],b=clean[(i+1)%clean.length],len=a.distanceTo(b),mid=a.clone().add(b).multiplyScalar(.5);let n=new T.Vector3(b.z-a.z,0,-(b.x-a.x)).normalize();if(n.dot(mid.clone().sub(center))<0)n.negate();const s=len*(.35+Math.max(0,n.z));if(s>score){score=s;edge={a,b,n,len};}}
 const yaw=Math.atan2(edge.n.x,edge.n.z),local=clean.map(p=>p.clone().sub(center).applyAxisAngle(new T.Vector3(0,1,0),-yaw)),bounds=new T.Box3().setFromPoints(local),w=bounds.max.x-bounds.min.x,d=bounds.max.z-bounds.min.z;
 const g=new T.Group();g.position.copy(center);g.rotation.y=yaw;const front=edge.a.clone().add(edge.b).multiplyScalar(.5).sub(center).applyAxisAngle(new T.Vector3(0,1,0),-yaw);return {g,local,w,d,z:bounds.max.z,front:{x:front.x,z:front.z,width:edge.len}};
}
function footprint(g,local,height,material=brickMaterial,court=null){const shape=new T.Shape(local.map(p=>new T.Vector2(p.x,-p.z)));
 if(court){const hole=new T.Path();hole.moveTo(-court.w/2,-court.d/2);hole.lineTo(-court.w/2,court.d/2);hole.lineTo(court.w/2,court.d/2);hole.lineTo(court.w/2,-court.d/2);hole.closePath();shape.holes.push(hole);}const geo=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false});geo.rotateX(-Math.PI/2);const m=new T.Mesh(geo,material);m.castShadow=m.receiveShadow=true;g.add(m);return m;}
function boundaryWindows(g,points,height,{slender=false,plinth=true,frontZ=null,frontExclusions=[]}={}){
 for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],len=a.distanceTo(b);if(len<6)continue;const mid=a.clone().add(b).multiplyScalar(.5),dir=b.clone().sub(a).normalize(),n=new T.Vector3(dir.z,0,-dir.x);let center=new T.Box3().setFromPoints(points).getCenter(new T.Vector3());if(n.dot(mid.clone().sub(center))<0)n.negate();const yaw=Math.atan2(n.x,n.z);
 const edge=new T.Group();edge.position.copy(mid).addScaledVector(n,.14);edge.rotation.y=yaw;g.add(edge);
 const omitted=x=>frontZ!==null&&Math.abs(mid.z-frontZ)<1&&frontExclusions.some(([a,b])=>mid.x+dir.x*x>a&&mid.x+dir.x*x<b);
 if(plinth){box(edge,len,3.3,.16,0,1.7,.06,stone);for(let x=-len/2+2;x<len/2-1;x+=4.8){if(omitted(x))continue;box(edge,3.7,2.7,.17,x,1.7,.18,glass);box(edge,.38,3.5,.55,x+2.08,1.8,.25,lightStone);}}
 for(let x=-len/2+1.7;x<len/2-1;x+=slender?2.5:3.5){
 if(omitted(x))continue;
 if(slender){box(edge,.95,height-6,.35,x,(height+3)/2,.2,dark);box(edge,.66,height-6,.14,x,(height+3)/2,.42,glass);for(let y=5;y<height-1;y+=3.15)box(edge,.78,.1,.15,x,y,.55,stone);}
 else for(let y=5.8;y<height-1.4;y+=3.2){box(edge,1.45,1.9,.2,x,y,.25,glass);box(edge,1.67,.16,.35,x,y-1.04,.22,stone);box(edge,.08,1.9,.1,x,y,.39,dark);}
 }
 }
}
function plaza(g,w,z,depth=12){box(g,w,.1,depth,0,.05,z+depth/2+1,pavingMaterial);bollards(g,w*.84,z+depth+.5);for(const x of [-w*.36,w*.36]){hedge(g,x,z+depth*.5,Math.min(w*.2,10));tree(g,x,z+depth*.75,.8);lamp(g,x,z+3);}}

// Named college elevations replace the generic OSM extrusion but keep its
// footprint (and the game's original collision polygon).
export function surveyedBuilding(points,name,id){
 preparePhotoMaterials();let key=[1433084264,1433084263].includes(id)?'bridge':name==='法学院'?'law':name==='金融学院'?'finance':name==='马克思主义学院'?'marx':name==='历史学院'?'history':name==='木斋图书馆'?'historic':name==='信息东楼'?'computer':[1433084261,1430904059,1430904058,1436478222].includes(id)?'teaching':name==='体育馆'?'gym':/学[一二]食堂/.test(name)?'canteens':null;
 if(!key)return null;const {g,local,w,d,z}=frame(points),lowCanteen=key==='canteens'&&name==='学二食堂',h=key==='bridge'?12:key==='historic'?12:key==='canteens'?(lowCanteen?7:10):key==='teaching'?17.2:key==='marx'||key==='gym'?17:22;
 mark(g,key,(name||'教学楼连接廊')+' · 2026 实拍细节');if(key==='canteens')evidence(g,lowCanteen?'canteen-open-colonnade':'canteen-sloped-glass',lowCanteen?[4,5]:[40]);g.userData.osmId=id;g.userData.height=h;
 const court=key==='computer'?{w:w*.4,d:d*.38}:null;
 if(key==='bridge'){const upper=footprint(g,local,h-5);upper.position.y=5;g.userData.groundOpening={x:g.position.x,z:g.position.z,width:w,depth:d,yaw:g.rotation.y};}
 else if(key==='teaching'||lowCanteen){
  // A real ground-floor passage: split the footprint rather than paint a door
  // on the generic solid extrusion. Unseen depth is estimated from OSM.
  const half=Math.min(lowCanteen?9:12,w*.14),clip=(polygon,limit,left)=>{const out=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],inA=left?a.x<=limit:a.x>=limit,inB=left?b.x<=limit:b.x>=limit;if(inA)out.push(a.clone());if(inA!==inB){const t=(limit-a.x)/(b.x-a.x);out.push(a.clone().lerp(b,t));}}return out;};
  const underside=lowCanteen?3.9:5;footprint(g,clip(local,-half,true),underside);footprint(g,clip(local,half,false),underside);const upper=footprint(g,local,h-underside);upper.position.y=underside;
  g.userData.groundOpening={x:g.position.x,z:g.position.z,width:half*2,depth:d+3,yaw:g.rotation.y};
 }else footprint(g,local,h,brickMaterial,court);
 const exclusions=key==='teaching'?[[-w*.5,w*.5]]:key==='gym'?[[-w*.5,w*.5]]:key==='law'?[[-w*.47,w*.47]]:key==='finance'?[[-w*.24,w*.13],[w*.15,w*.47]]:key==='marx'?[[-w*.27,w*.27]]:key==='canteens'?[[-w*.32,w*.32]]:[];
 if(key!=='historic')boundaryWindows(g,local,h,{slender:key==='history',plinth:key!=='teaching'&&key!=='bridge'&&!lowCanteen,frontZ:z,frontExclusions:exclusions});
 if(key==='bridge'){box(g,w,.35,.25,0,5.1,z+.15,lightStone);box(g,w,.35,.25,0,11.9,z+.15,lightStone);g.userData.positionConfidence='mapped connector footprint; elevation and glazing shared from 050/054';}
 else if(key==='teaching'){
  const half=g.userData.groundOpening.width/2;
  box(g,w,.45,.6,0,5.1,z+.24,lightStone);
  for(let x=-w/2+2.4;x<w/2-1;x+=4.5)for(const y of [7.8,12.8]){box(g,2.1,2.5,.2,x,y,z+.19,glass);box(g,.09,2.5,.14,x,y,z+.35,lightStone);box(g,2.12,.10,.14,x,y,z+.35,lightStone);box(g,2.3,.17,.28,x,y+1.32,z+.22,lightStone);}
  for(const side of [-1,1]){const x=side*w*.37;for(let row=0;row<4;row++)for(let col=0;col<7;col++)box(g,.30,.27,.15,x+(col-3)*.48,1.4+row*.47,z+.21,dark);
   box(g,4.5,10,.2,side*(half+3),10,z+.22,glass);for(let y=6;y<15;y+=2.5)box(g,4.5,.10,.15,side*(half+3),y,z+.36,dark);
  }
  box(g,half*2,.12,d+3,0,.08,0,pavingMaterial);plaza(g,w*.8,z+1,15);
  label(g,name,3,.75,half+2,2.5,z+.4);for(const x of [-half-5,half+5]){box(g,6,1.6,.18,x,1.5,z+4,lightStone);box(g,5.6,1.2,.20,x,1.5,z+4.12,glass);}
  g.userData.positionConfidence='photo 037 C-zone sign; western teaching cluster inferred, entrance direction estimated';
 }else if(key==='gym'){
  const fw=w*.57;box(g,fw,11.5,.25,0,6,z+.25,glass);
  for(let x=-fw/2;x<=fw/2;x+=fw/3)box(g,.85,12,1.5,x,6,z+.65);
  for(let x=-fw/2+.7;x<fw/2;x+=2.5)box(g,.10,11.2,.18,x,6,z+.45,dark);
  for(let y=1.5;y<11.3;y+=2.3)box(g,fw,.12,.22,0,y,z+.48,dark);
  box(g,fw+3,2.7,1.8,0,13.3,z+.8);label(g,'体 育 馆',9,1.3,0,13.4,z+1.76);label(g,'GYM',5,.5,0,12.3,z+1.77);
  for(const side of [-1,1]){const wing=new T.Group();wing.position.set(side*w*.38,0,z-3.2);g.add(wing);cylinder(wing,Math.min(7,w*.13),17,0,8.5,0);for(const y of [4.2,9,13.5]){const band=cylinder(wing,Math.min(7,w*.13)+.12,.22,0,y,0,lightStone);}
   for(let x=-3.6;x<=3.6;x+=1.8)for(const y of [6.7,11])box(wing,.75,2.5,.22,x,y,Math.min(7,w*.13)+.18,glass);
  }
  for(const y of [4.2,9,13.5])box(g,w,.22,.45,0,y,z+.23,lightStone);
  stairs(g,fw,z+6,4);plaza(g,w*.93,z+7,20);cycleRack(g,w*.32,z+19);
  cylinder(g,.085,12,0,6,z+18,dark,10);box(g,2.5,1.45,.03,1.3,10.7,z+18,red);g.userData.positionConfidence='mapped footprint; front direction estimated from facade study';
 }else if(key==='law'){
  const entryW=Math.min(w*.52,36);box(g,entryW,16,.24,0,8.7,z+.3,glass);
  for(let x=-entryW/2;x<=entryW/2;x+=entryW/3)box(g,1.2,17.2,4.8,x,8.8,z+2.5);
  for(let y=2;y<17;y+=3)box(g,entryW,.12,.22,0,y,z+.5,dark);
  box(g,entryW+2.4,5,5,0,19.5,z+2.5);for(let x=-entryW/2+2;x<entryW/2;x+=3.2){box(g,.9,2,.17,x,20,z+5.12,glass);}label(g,'法 学 院',entryW*.5,.95,0,17.6,z+5.15);label(g,'SCHOOL OF LAW',entryW*.5,.38,0,16.85,z+5.16);
  for(const x of [-w*.4,w*.4])box(g,w*.14,16,.28,x,10,z+.3,glass);
  stairs(g,entryW+3,z+8,6);plaza(g,w*.8,z+8,12);
 }else if(key==='history'){
  label(g,'历史学院',9,1.05,-w*.15,5.5,z+.6);label(g,'SCHOOL OF HISTORY',9,.38,-w*.15,4.55,z+.6);
  box(g,w*.2,18,2,w*.36,10,z+1,glass);for(let y=3;y<20;y+=3)box(g,w*.2,.16,2.1,w*.36,y,z+1,dark);
  for(const x of [-w*.36,w*.36])hedge(g,x,z+3,w*.2);plaza(g,w*.75,z+3,8);
 }else if(key==='finance'){
  const radius=Math.min(9,w*.16);cylinder(g,radius,23,w*.3,11.5,z+radius*.35).userData.photoSolid=true;box(g,.75,22,.26,w*.3+radius*.7,11,z+radius*.35+radius*Math.sqrt(.51)+.15,glass);
  label(g,'金融学院',12,1.1,w*.3,20.5,z+radius*1.35+.15);label(g,'FINANCE',10,.55,w*.3,19.2,z+radius*1.35+.15);
  box(g,w*.35,8,.32,-w*.06,8,z+.25,glass);for(let x=-w*.23;x<w*.12;x+=2.2)box(g,.13,8,.16,x,8,z+.47,dark);
  plaza(g,w*.75,z+2,17);const monument=new T.Mesh(new T.ConeGeometry(1.35,4.8,4),lightStone);monument.position.set(w*.2,3,z+13);g.add(monument);box(g,4.8,1.1,3.4,w*.2,.6,z+13,red);label(g,'南开',2.7,.65,w*.2,2.0,z+14.8,'#764431');
 }else if(key==='marx'){
  box(g,Math.min(w*.52,20),6,.2,0,12,z+.3,glass);box(g,Math.min(w*.52,20),.13,.3,0,12,z+.46,dark);
  box(g,w*.8,3.5,.22,0,1.9,z+.28,glass);for(let x=-w*.38;x<w*.38;x+=2)box(g,.10,3.5,.14,x,1.9,z+.44,dark);box(g,w*.8,.45,5,0,4.15,z+2.2,dark);for(const x of [-w*.3,w*.3]){const strut=box(g,.12,3.1,.12,x,5.8,z+1,white);strut.rotation.x=-.35;}
  label(g,'马克思主义学院',16,.85,0,7.0,z+.46);label(g,'SCHOOL OF MARXISM',15,.38,0,6.05,z+.46);stairs(g,w*.6,z+5,3);plaza(g,w*.8,z+6,8);
 }else if(key==='computer'){
  // OSM's information-east complex: named identity is based on the entrance
  // photograph and local map, with exact entrance orientation still estimated.
  const fw=Math.min(35,w*.62);box(g,fw,3.8,.35,0,2,z+.38,glass);box(g,fw+3,2.6,2.8,0,5.4,z+1.1,lightStone);
  for(const x of [-fw/2,-fw/6,fw/6,fw/2])box(g,.7,5,2.8,x,2.5,z+1.1,lightStone);
  label(g,'计算机学院    软件学院',fw,1.0,0,5.95,z+2.52,'#6d6c65');label(g,'COMPUTER SCIENCE · SOFTWARE',fw,.36,0,4.9,z+2.53,'#6d6c65');stairs(g,fw,z+5,4);
  plaza(g,w*.75,z+5,16);cycleRack(g,22,z+15);
  const inner=mark(new T.Group(),'computer','多学院共享庭院 · 002/009/025/027/033');g.add(inner);box(inner,court.w,.1,court.d,0,.08,0,pavingMaterial);
  for(const side of [-1,1]){box(inner,.18,3.7,court.d,side*(court.w/2+.08),2,0,glass);for(let at=-court.d/2+1;at<court.d/2;at+=4.5)box(inner,.55,4,.75,side*(court.w/2-.35),2,at,lightStone);for(let at=-court.d/2+4;at<court.d/2;at+=9)tree(inner,side*court.w*.25,at,.78);}
  label(inner,'人工智能学院',12,.75,-court.w/2+.2,4.65,0).rotation.y=Math.PI/2;
  cycleRack(inner,court.w*.6,-court.d*.3);g.userData.courtyardLocal={w:court.w,d:court.d,yaw:g.rotation.y};g.userData.courtyard={x:g.position.x,z:g.position.z,width:court.w,depth:court.d,yaw:g.rotation.y};
  g.userData.positionConfidence='information-east-complex; entry orientation estimated';
 }else if(lowCanteen){
  const fw=w*.62;for(const x of [-fw/2,-fw/6,fw/6,fw/2])box(g,.75,3.9,2.8,x,1.95,z+1.1,lightStone).userData.photoSolid=true;
  box(g,fw+4,1.4,3.6,0,4.5,z+1.5,lightStone);for(const x of [-fw*.43,fw*.43])box(g,fw*.10,2.8,.24,x,1.6,z+.3,glass);
  label(g,name,10,.9,0,5.3,z+3.35,'#b74c32');stairs(g,fw,z+6,3);plaza(g,w*.75,z+7,10);cycleRack(g,22,z+13);for(const x of [-fw*.5,fw*.5])rail(g,x,z+5,6);g.userData.positionConfidence='open stone colonnade from 004/005; canteen identity not independently confirmed';
 }else if(key==='canteens'){
  const fw=w*.62;box(g,fw,7,.25,0,4,z+.26,glass);for(let x=-fw/2;x<=fw/2;x+=5)box(g,.6,7.3,2,x,3.7,z+1,lightStone);
  box(g,fw+4,1.4,4,0,8.1,z+1.8,lightStone);const slope=box(g,fw*.65,6,.22,0,3.8,z+1.8,glass);slope.rotation.x=-.14;for(const x of [-fw*.32,fw*.32]){const support=box(g,.45,6.4,.45,x,3.6,z+1.8,lightStone);support.rotation.x=-.14;}label(g,name,10,1.1,0,8.2,z+3.86,'#b74c32');stairs(g,fw,z+6,4);plaza(g,w*.75,z+7,10);cycleRack(g,22,z+13);for(const x of [-fw*.5,fw*.5])rail(g,x,z+5,6);g.userData.positionConfidence='shared-canteen-detail; individual photo identity unconfirmed';
 }else if(key==='historic'){
  // Photo 029 is 木斋馆, corrected from the earlier filename's 秀山堂 guess.
  // Two storeys, stone window surrounds, pitched red roof and stepped centre.
  const fw=Math.min(18,w*.34),roofMat=color(0x80514a);
  for(let i=0;i<local.length;i++){
   const a=local[i],b=local[(i+1)%local.length],len=a.distanceTo(b);if(len<5)continue;
   const mid=a.clone().add(b).multiplyScalar(.5),dir=b.clone().sub(a).normalize(),n=new T.Vector3(dir.z,0,-dir.x);if(n.dot(mid)<0)n.negate();
   const wall=new T.Group();wall.position.copy(mid).addScaledVector(n,.15);wall.rotation.y=Math.atan2(n.x,n.z);g.add(wall);
   box(wall,len,1.2,.28,0,.6,0,stone);box(wall,len,.35,.45,0,6,0,lightStone);box(wall,len+.5,.35,.8,0,11.8,0,lightStone);
   for(let x=-len/2+2;x<len/2-1;x+=4.7){if(Math.abs(mid.z-z)<1&&Math.abs(mid.x+dir.x*x)<fw/2)continue;
    for(const y of [3.3,8.6]){box(wall,2.1,3.25,.22,x,y,.05,white);box(wall,1.67,2.83,.17,x,y,.23,glass);for(const dx of [-.54,0,.54])box(wall,.07,2.85,.08,x+dx,y,.37,white);for(const dy of [-.55,.55])box(wall,1.7,.08,.08,x,y+dy,.37,white);box(wall,2.25,.24,.45,x,y+1.72,.18,lightStone);box(wall,2.25,.22,.5,x,y-1.72,.18,lightStone);}
   }
  }
  // Roof faces meet at a raised ridge; no flat slab covering the footprint.
  const roofShape=new T.BufferGeometry(),v=[];
  const corner=[[-w/2-1,-d/2-1],[w/2+1,-d/2-1],[w/2+1,d/2+1],[-w/2-1,d/2+1]],ridge=[[-w*.35,0],[w*.35,0]];
  const tri=(a,b,c)=>v.push(...a,...b,...c);const pt=(p,y)=>[p[0],y,p[1]],lo=corner.map(p=>pt(p,12.1)),hi=ridge.map(p=>pt(p,14.1));
  tri(lo[0],lo[1],hi[1]);tri(lo[0],hi[1],hi[0]);tri(lo[2],lo[3],hi[0]);tri(lo[2],hi[0],hi[1]);tri(lo[3],lo[0],hi[0]);tri(lo[1],lo[2],hi[1]);
  roofShape.setAttribute('position',new T.Float32BufferAttribute(v,3));roofShape.computeVertexNormals();roofMat.side=T.DoubleSide;g.add(new T.Mesh(roofShape,roofMat));
  box(g,fw,15,3,0,7.5,z-.5);box(g,fw+1,.45,3.8,0,12.4,z-.5,lightStone);
  box(g,fw*.85,2.0,5,0,14.7,z-2);box(g,fw*.85+1,.35,5.5,0,15.9,z-2,lightStone);
  box(g,fw*.65,1.7,5,0,16.6,z-2);box(g,fw*.65+1,.35,5.5,0,17.6,z-2,lightStone);
  const pedGeo=new T.BufferGeometry();pedGeo.setAttribute('position',new T.Float32BufferAttribute([-fw/2,12.9,z+1.2,fw/2,12.9,z+1.2,0,16.1,z+1.2],3));pedGeo.computeVertexNormals();const pedMat=lightStone.clone();pedMat.side=T.DoubleSide;g.add(new T.Mesh(pedGeo,pedMat));
  const inset=pedGeo.clone();const pos=inset.attributes.position;for(let i=0;i<3;i++){pos.setX(i,pos.getX(i)*.78);pos.setY(i,13.4+(pos.getY(i)-12.9)*.72);pos.setZ(i,z+1.24);}g.add(new T.Mesh(inset,brickMaterial));
  const round=new T.Mesh(new T.CircleGeometry(.58,20),white);round.position.set(0,14.1,z+1.28);g.add(round);const center=round.clone();center.geometry=new T.CircleGeometry(.41,20);center.material=glass;center.position.z+=.02;g.add(center);
  const roof=new T.Mesh(new T.SphereGeometry(3.4,24,16,0,Math.PI*2,0,Math.PI/2),roofMat);roof.position.set(0,18.3,z-2);g.add(roof);cylinder(g,3.5,.65,0,18,z-2,lightStone,24);
  box(g,3.2,5,.25,0,3,z+1.15,glass);for(const x of [-2,2])box(g,.65,5.9,1,x,3,z+1.5,lightStone);box(g,5.2,.65,1.2,0,6.3,z+1.5,lightStone);
  for(const x of [-fw*.28,0,fw*.28]){box(g,2.5,2.9,.25,x,9.3,z+1.1,white);box(g,2.1,2.5,.18,x,9.3,z+1.26,glass);for(const dx of [-.65,0,.65])box(g,.065,2.55,.1,x+dx,9.3,z+1.4,white);box(g,2.12,.08,.1,x,9.3,z+1.4,white);}
  stairs(g,7,z+5,6);plaza(g,w*.9,z+6,18);
  // The foreground civic display in 029 has a red base and two text lines.
  box(g,18,.35,2,0,.3,z+19,red);box(g,17,1.6,.5,0,1.15,z+19,red);label(g,'小我融入大我',16,.7,0,2.8,z+19.28,'#b65d34');label(g,'青春献给祖国',16,.7,0,2.05,z+19.29,'#eee6dc');

 }
 g.traverse(o=>{if(o.isMesh)o.userData.photoIds=groups[key];});return optimizePhotoDetails(g);
}

// Detail studies from unnamed photos are applied as shared campus components,
// rather than pretending those photographs establish a building's coordinates.
function academicStudy(points,name){const f=frame(points),g=f.g,w=Math.min(f.w,f.front.width),z=f.front.z;g.position.add(new T.Vector3(f.front.x,0,0).applyAxisAngle(new T.Vector3(0,1,0),g.rotation.y));g.userData.detailFront={z,width:w};mark(g,'academic','学院共有细部 · '+name);
 const fw=Math.min(22,w*.55);
 part(g,'college-stone-porch',[18,22,31,49,58],p=>{box(p,fw,.4,3,0,3.7,z+1.5,lightStone);for(let x=-fw/2;x<=fw/2;x+=4.4)box(p,.5,3.5,1.3,x,1.9,z+.65,lightStone);box(p,fw,2.8,.18,0,1.7,z+.24,glass);plaza(p,Math.min(w*.7,45),z+3,11);});
 part(g,'college-deep-vertical-windows',[10,19],p=>{for(let x=-w*.12;x<w*.08;x+=1.6){box(p,.72,7,.36,x,8.3,z+.22,dark);box(p,.58,7,.14,x,8.3,z+.43,glass);for(let y=5.3;y<12;y+=2.1)box(p,.65,.10,.19,x,y,z+.54,lightStone);}});
 part(g,'college-white-overhanging-roof',[13,47],p=>{const span=Math.min(30,w*.65);box(p,span,3.5,5,0,18.2,z+.6,lightStone);box(p,span-.6,3,.20,0,18.2,z+3.2,glass);for(let x=-span/2+.4;x<span/2;x+=.8)box(p,.18,3.7,.45,x,18.2,z+3.35,white);box(p,span+1,.28,5.4,0,16.3,z+.6,lightStone);});
 part(g,'college-corner-curtain-wall',[38,42],p=>{box(p,5.5,6,3,-w*.3,7,z+1.55,glass);for(let y=5;y<10;y+=2)box(p,5.6,.12,3.1,-w*.3,y,z+1.55,dark);for(let i=0;i<4;i++)box(p,.12,6,3.1,-w*.3-2.5+i*1.65,7,z+1.55,dark);box(p,8,.25,3.6,-w*.3,3.8,z+1.8,lightStone);});
 part(g,'college-brick-side-fins',[52],p=>{for(let row=0;row<3;row++)for(let i=0;i<7;i++){box(p,.17,2.7,1.2,w*.5-4.5+i*.65,5.4+row*3.15,z+.4);box(p,.36,2.5,.17,w*.5-4.2+i*.65,5.4+row*3.15,z+.45,glass);}const entry=new T.Group();entry.position.x=w*.5-2.4;p.add(entry);box(entry,2.2,2.8,.18,0,1.5,z+.28,glass);stairs(entry,4,z+4,4);for(const x of [-2,2])rail(entry,x,z+3,4);});
 part(g,'college-corner-hedge',[67],p=>{hedge(p,w*.34,z+13,8,1.4);hedge(p,w*.34+4,z+9,1.4,8);box(p,9,.15,1.9,w*.34,.12,z+14.8,redPaving);});
 label(g,name,Math.min(18,w*.45),.8,0,4.7,z+3.05);g.userData.positionConfidence='shared-detail-only';return g;}
export function teachingCourt(cPoints,bPoints){
 const g=mark(new T.Group(),'teaching','B/C区楼间庭院 · 实拍共用细节');
 const c=new T.Box3().setFromPoints(cPoints),b=new T.Box3().setFromPoints(bPoints),left=Math.max(c.min.x,b.min.x),right=Math.min(c.max.x,b.max.x),front=b.min.z,back=c.max.z,w=right-left,d=front-back;
 g.position.set((left+right)/2,0,(front+back)/2);const span=Math.max(12,Math.min(w*.64,76)),depth=Math.max(8,d);
 box(g,span,.12,depth,0,.12,0,pavingMaterial);box(g,span,.015,4,0,.19,0,stone);
 for(const side of [-1,1])for(let x=-span/2+6;x<span/2-3;x+=9){const z=side*depth*.29;box(g,3.2,.5,3.2,x,.3,z,dark);tree(g,x,z,.8);box(g,3.3,.2,1,x,.55,z+side*3,stone);lamp(g,x,side*(depth/2-2));}
 for(const x of [-span/2+1,span/2-1]){const row=new T.Group();row.position.x=x;row.rotation.y=Math.PI/2;g.add(row);bollards(row,depth*.9,0);}
 const display=new T.Group();display.position.x=-span/2+5;display.rotation.y=-Math.PI/2;g.add(display);box(display,10,.6,1.3,0,.42,0,lightStone);label(display,'百年南开  百年荣光',10,.85,0,1.3,.70,'#a72a45');label(display,'100',3,1.7,0,2.3,.68,'#eee9dd');
 const parking=new T.Group();parking.position.set(-span*.42,0,depth*.30);g.add(parking);for(let x=-5;x<=5;x+=2.5){const line=box(parking,.12,.02,8,x,.22,0,color(0xdfae4b));line.rotation.y=.6;}for(const z of [-4,4])box(parking,14,.02,.12,0,.22,z,color(0xdfae4b));
 g.userData.positionConfidence='existing mapped gap between western B/C blocks; photo 054 C sign; 050 shared courtyard detail';return g;
}
function libraryStudy(model){const g=mark(new T.Group(),'library','图书馆 · 67照片侧墙与广场细部');
 for(const x of [-86.25,86.25]){for(let y=3.4;y<=10.4;y+=3.5)box(g,.22,.32,43,x,y,0,lightStone);const screen=new T.Group();screen.position.set(x,7,12);screen.rotation.y=x<0?-Math.PI/2:Math.PI/2;g.add(screen);for(let i=0;i<11;i++){box(screen,.24,5,.55,-4.7+i*.9,0,0);for(let y=-2;y<2.5;y+=.85)box(screen,.68,.22,.55,-4.38+i*.9,y,0);}}
 for(const x of [-70,70]){hedge(g,x,44,40,10);box(g,41,.4,11,x,1.65,44,stone);for(let k=0;k<8;k++){box(g,40,.2,1.8,x,.15+k*.2,66-k*1.8,stone);}tree(g,x,81,.85);}
 for(const x of [-95,95])lamp(g,x,62);box(g,192,.12,24,0,.14,83,pavingMaterial);cycleRack(g,36,98);model.add(g);}
function gymStudy(points,model){const {g,w,z}=frame(points);mark(g,'gym','体育馆腰线、弧端与广场');for(const y of [4.2,8.5,12])box(g,w*.85,.2,.5,0,y,z+.28,lightStone);for(const x of [-w*.38,w*.38])cylinder(g,4.6,17,x,8.5,z-3);plaza(g,w*.9,z+2,20);return g;}
function cultureStudy(points){
 const bounds=new T.Box3().setFromPoints(points),w=Math.max(30,bounds.max.x-bounds.min.x),d=Math.max(25,bounds.max.z-bounds.min.z),g=new T.Group();g.position.copy(points.reduce((a,p)=>a.add(p),new T.Vector3()).multiplyScalar(1/points.length));mark(g,'culture','国际教育学院玻璃分格与入口铺装');
 // Match the existing model's axes rather than a separately inferred facade.
 for(let y=6;y<16;y+=2.6)box(g,w*.42,.12,.18,-w*.08,y,d*.34+.04,dark);
 for(let x=-w*.27;x<w*.12;x+=w*.075)box(g,.09,13.8,.18,x,9,d*.34+.06,dark);
 for(let x=-w*.4;x<w*.41;x+=2.6)box(g,.1,3.8,.15,x,2,d/2+.4,dark);
 box(g,w*.85,.12,7,0,.12,d/2+4,redPaving);for(const x of [-w*.45,w*.45])tree(g,x,d/2+6,.8);return g;}

function activityStudy(points){const {g,w,z}=frame(points);mark(g,'activity','学生活动中心入口石材与绿台');plaza(g,Math.min(w*.65,55),z+1,12);cycleRack(g,26,z+12);return g;}
function commerceModel(position){const g=mark(new T.Group(),'commerce','商业街 · 实拍两侧店面与取件区');g.position.copy(position);g.rotation.y=-.18;
 // The photographs show a low restaurant row opposite taller college shops.
 const shops=[{ids:[1,63],name:'兰州牛肉拉面',bg:'#191c19',ink:'#eccb72',x:-13,z:-12,yaw:Math.PI/2,h:7},{ids:[1,63],name:'净衣洗衣店',bg:'#69a947',ink:'#ffefd9',x:13,z:-20,yaw:-Math.PI/2,h:19},{ids:[3],name:'中国联通 5G 营业厅',bg:'#f4e8dd',ink:'#b8312b',x:-13,z:8,yaw:Math.PI/2,h:7},{ids:[51],name:'蜜雪冰城',bg:'#c33332',ink:'#ffffff',x:13,z:12,yaw:-Math.PI/2,h:19}];
 for(const spec of shops){const shop=evidence(new T.Group(),'shop-'+spec.name,spec.ids);shop.position.set(spec.x,0,spec.z);shop.rotation.y=spec.yaw;g.add(shop);box(shop,14,spec.h,10,0,spec.h/2,-5).userData.photoSolid=true;box(shop,13.5,2.8,.25,0,1.8,.18,glass);for(const x of [-6.4,0,6.4])box(shop,.5,3.6,1.2,x,1.8,.65,lightStone);label(shop,spec.name,12.9,.9,0,3.4,.84,spec.ink,spec.bg);for(let y=5.6;y<spec.h-1;y+=3.25)for(const x of [-4.7,0,4.7]){box(shop,1.8,1.8,.17,x,y,.1,glass);box(shop,.08,1.8,.1,x,y,.22,dark);box(shop,1.9,.12,.2,x,y-1,.16,stone);}box(shop,14,.18,1.3,0,4.05,.6,stone);stairs(shop,13,2.6,3);
  if(spec.h===7){box(shop,14,.08,.08,0,7.9,.2,dark);for(let x=-7;x<=7;x+=1.2)box(shop,.06,.8,.06,x,7.5,.2,dark);}
 }
 const m=evidence(new T.Group(),'mcdonalds-corner-and-arches',[21,65]);m.position.set(-25,0,-40);m.rotation.y=Math.PI/2;g.add(m);box(m,17,8,14,0,4,-5).userData.photoSolid=true;box(m,6,5,2,-7,2.5,3,lightStone);box(m,8,5,.2,2,2.6,2.2,glass);box(m,13,2,.2,0,6.4,2.18,glass);label(m,"McDonald's",13,.95,0,7.8,2.45);
 const gold=new T.MeshStandardMaterial({color:0xffbd25,roughness:.35,metalness:.25});
 function arches(x,y,z,scale=1){const logo=new T.Group();logo.position.set(x,y,z);logo.scale.setScalar(scale);m.add(logo);for(const side of [-1,1]){const curve=new T.CubicBezierCurve3(new T.Vector3(side*1.6,0,0),new T.Vector3(side*1.6,3.8,0),new T.Vector3(0,3.8,0),new T.Vector3(0,0,0));const arch=new T.Mesh(new T.TubeGeometry(curve,20,.16,6,false),gold);logo.add(arch);}return logo;}
 arches(-4,8.3,2.4,.85);cylinder(m,.11,6,-7,3,8,dark,8);box(m,3.0,.55,.35,-7,6,8,red);arches(-7,6.3,8,.75);
 const canopy=evidence(new T.Group(),'curved-bike-canopy-and-parcel-lockers',[44,59]);canopy.position.set(27,0,48);g.add(canopy);const roofGeo=new T.BufferGeometry(),verts=[];for(let k=0;k<12;k++){const za=-2.5+k*5/12,zb=-2.5+(k+1)*5/12,ya=3.2+.4*Math.sin((za+2.5)*Math.PI/5),yb=3.2+.4*Math.sin((zb+2.5)*Math.PI/5);verts.push(-10,ya,za,10,ya,za,10,yb,zb,-10,ya,za,10,yb,zb,-10,yb,zb);}roofGeo.setAttribute('position',new T.Float32BufferAttribute(verts,3));roofGeo.computeVertexNormals();const roofMat=lightStone.clone();roofMat.side=T.DoubleSide;canopy.add(new T.Mesh(roofGeo,roofMat));for(let x=-9;x<=9;x+=6)box(canopy,.12,3.2,.12,x,1.6,1.8,dark);
 for(let unit=0;unit<5;unit++){const x=-8+unit*3.3;box(canopy,3.2,2.35,.75,x,1.2,-1.5,color(unit%2?0xcea548:0xa0a29e));for(let row=0;row<5;row++)for(let col=0;col<4;col++){box(canopy,.71,.38,.06,x-1.17+col*.78,.35+row*.43,-1.08,color(row%2?0xd6bf79:0xbcc1b8));box(canopy,.06,.08,.07,x-1.12+col*.78,.35+row*.43,-1.04,dark);}}
 for(const x of [-4.7,1.9]){box(canopy,.5,1.6,.12,x,1.3,-.99,color(0xe1be42));box(canopy,.32,.35,.06,x,1.6,-.90,glass);}
 canopy.visible=false;const station=evidence(new T.Group(),'parcel-station-stone-door',[55]);station.visible=false;station.position.set(49,0,47);g.add(station);box(station,12,4.8,7,0,2.4,-3).userData.photoSolid=true;box(station,5,3.8,.5,0,2,.7,lightStone);box(station,3.2,3.3,.24,0,1.8,1.02,glass);label(station,'南开大学快递服务站',11,.65,0,4.1,.58);
 const depot=evidence(new T.Group(),'red-parcel-depot-glazing',[30]);depot.visible=false;depot.position.set(1,0,48);g.add(depot);box(depot,19,3.6,7,0,1.8,-3,red).userData.photoSolid=true;box(depot,17,2.7,.2,0,1.7,.6,glass);for(let x=-8;x<=8;x+=2.8)box(depot,.12,2.8,.16,x,1.7,.76,lightStone);box(depot,17,.12,.18,0,1.7,.78,lightStone);label(depot,'校园快递服务',17,.55,0,3.3,.72,'#fff','#b2364c');
 for(const side of [-1,1]){const racks=new T.Group();racks.position.x=side*8;racks.rotation.y=Math.PI/2;g.add(racks);cycleRack(racks,46,0);box(g,3,.10,76,side*10,.07,-7,redPaving);for(let z=-32;z<30;z+=18)lamp(g,side*6,z,true);}
 box(g,12,.06,84,0,.03,-7,color(0x858887));const speed=evidence(new T.Group(),'commercial-speed-sign',[24]);speed.position.set(-6,0,34);g.add(speed);cylinder(speed,.06,3,0,1.5,0,dark,6);label(speed,'30',1.4,1.4,0,3,0,'#161b1b','#ffefcc');part(g,'commercial-speed-bump-and-cones',[24,65],p=>{box(p,12,.06,.4,0,.13,30,color(0xebcb44));for(let x=-5;x<=5;x+=1.2)box(p,.65,.08,.8,x,.13,30,dark);for(const x of [-5.8,5.8])for(const z of [25,35]){box(p,.45,.07,.45,x,.12,z,dark);const cone=new T.Mesh(new T.ConeGeometry(.18,.65,8),color(0xead14b));cone.position.set(x,.46,z);p.add(cone);}});g.userData.positionConfidence='shop elevations and opposing rows from photos; campus anchor remains approximate';return g;}

function roadStudy(lanes){const g=mark(new T.Group(),'roads','道路树阵、斑马线与停放边线');let count=0;
 for(const lane of lanes){const len=lane.a.distanceTo(lane.b);if(lane.width<6||len<35||count>=12)continue;const mid=lane.a.clone().add(lane.b).multiplyScalar(.5),yaw=Math.atan2(lane.b.x-lane.a.x,lane.b.z-lane.a.z);const section=new T.Group();section.position.copy(mid);section.rotation.y=yaw;g.add(section);const span=Math.min(len*.7,70),roadW=lane.width;
 part(section,'road-zebra-crossing',[8,17,34],p=>{for(let x=-roadW/2+1;x<roadW/2;x+=1.2)box(p,.65,.025,3.6,x,.18,span*.3,white);});
 part(section,'road-red-sidewalk-and-curb',[8,16],p=>{for(const side of [-1,1]){box(p,2.4,.08,span,side*(roadW/2+2.3),.12,0,redPaving);box(p,.24,.18,span,side*(roadW/2+.98),.15,0,lightStone);}});
 part(section,'road-white-trunk-tree-rows',[12,16,34,56,64],p=>{for(const side of [-1,1])for(let z=-span/2;z<=span/2;z+=11)tree(p,side*(roadW/2+3.4),z,.82,true);});
 part(section,'road-bent-arm-and-disc-lights',[11,41,64],p=>{for(const side of [-1,1])lamp(p,side*(roadW/2+1),-span/2,count%2===1);});
 part(section,'road-yellow-lines-and-arrows',[11,41,64],p=>{for(const side of [-1,1])box(p,.15,.025,span,side*(roadW/2-1),.19,0,white);for(const x of [-.13,.13])box(p,.08,.025,span,x,.19,0,color(0xeac56b));for(const side of [-1,1]){const arrow=new T.Group();arrow.position.set(side*roadW*.25,.20,-span*.2);if(side<0)arrow.rotation.y=Math.PI; p.add(arrow);box(arrow,.18,.025,1.8,0,0,0,white);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([-.6,.02,.7,.6,.02,.7,0,.02,1.65],3));geo.computeVertexNormals();const m=white.clone();m.side=T.DoubleSide;arrow.add(new T.Mesh(geo,m));}});
 part(section,'road-side-hedges',[12,16,56,64],p=>{for(const side of [-1,1])hedge(p,side*(roadW/2+5),span*.25,3,9);});
 part(section,'road-no-parking-sign',[56,66],p=>{p.position.set(roadW/2+1,0,span/2-4);cylinder(p,.06,3.2,0,1.6,0,white,6);label(p,'禁止停车',1.25,.65,0,3.3,.08,'#b6332b','#efede3');for(const y of [2.65,3.3]){const ring=new T.Mesh(new T.TorusGeometry(.19,.028,6,20),red);ring.position.set(0,y,.13);p.add(ring);const line=box(p,.025,.4,.04,0,y,.14,red);line.rotation.z=.6;}});count++;
 }g.userData.positionConfidence='shared-road-detail; road locations from OSM';return g;}
function publicStudy(points,key){const {g,w,z}=frame(points);mark(g,key,key==='gate'?'门房金属栅栏参考':key==='service'?'后勤用房与雨棚参考':key==='labs'?'实验楼广场标线参考':key==='stone'?'学院题字石参考':'广场铺装与树阵参考');
 if(key==='gate'){box(g,8,3.6,5,8,1.8,z+2);box(g,8.8,.35,5.8,8,3.75,z+2,stone);box(g,5,2,.2,8,1.8,z+4.6,glass);box(g,5.5,.3,.35,8,3,z+4.6,lightStone);box(g,6,.3,5,1,3.3,z+2);box(g,.65,3.3,.65,-2,1.65,z+4);box(g,2.5,.55,.2,10,2.8,z+4.8,red);for(let x=-8;x<=8;x+=.6)box(g,.065,2,.12,x,1.2,z+5,dark);box(g,16,.1,.14,0,2.2,z+5,dark);for(const x of [-9,9])box(g,1,2.6,1,x,1.3,z+5);}
 if(key==='service'){box(g,8,3.6,5,-8,1.8,z+5);box(g,8.5,.23,5.4,-8,3.7,z+5,lightStone);box(g,2.8,2.7,.18,-8,1.5,z+7.6,glass);for(const x of [-9.5,-6.5])box(g,.22,3.2,.3,x,1.6,z+7.7,lightStone);box(g,3.4,.25,.4,-8,3.15,z+7.7,lightStone);box(g,6,3.0,4,0,1.5,z+6,color(0xd8dbd6));box(g,1,2.4,.16,1.8,1.2,z+8.1,glass);for(const x of [-1.8,-.2]){box(g,1.2,1.5,.18,x,1.7,z+8.1,glass);for(let k=-.45;k<=.45;k+=.3)box(g,.055,1.5,.15,x+k,1.7,z+8.23,white);}for(let x=-2.9;x<=2.9;x+=.3)box(g,.035,2.9,.04,x,1.5,z+8.04,lightStone);box(g,6.6,.2,4.4,0,3.1,z+6,dark);}
 if(key==='labs'){const canopy=box(g,12,.3,3,-18,4,z+1,dark);for(const x of [-23,-13])box(g,.12,3.8,.12,x,2,z+2,dark);for(let k=0;k<5;k++){const line=box(g,.12,.04,9,-5+k*2.5,.16,z+7,color(0xe8c13c));line.rotation.y=.6;}for(let i=0;i<6;i++){box(g,.13,.04,5,-15+i*5,.15,z+7,color(0xe8c13c));box(g,5,.04,.13,-12.5+i*5,.15,z+9.5,color(0xe8c13c));}bollards(g,35,z+13);}
 if(key==='stone'){const rock=new T.Mesh(new T.DodecahedronGeometry(1.8,1),lightStone);rock.scale.set(1.6,.65,.65);rock.position.set(0,1.1,z+9);g.add(rock);label(g,'学府北辰',4,.85,0,1.2,z+10.15,'#a33e2d');hedge(g,-6,z+9,5);g.userData.positionConfidence='inscription/detail reference; exact stone placement unconfirmed';}
 if(key==='planet'){box(g,24,.12,16,0,.18,z+10,pavingMaterial);for(const side of [-1,1]){hedge(g,side*13,z+10,2,14);for(let at=0;at<3;at++)tree(g,side*15,z+4+at*6,.75);}g.userData.positionConfidence='planting/plaza pattern only; distorted panorama not used as measured geometry';}
 return g;}

export function addSurveyDetails(scene,data,project,campusResult){preparePhotoMaterials();const all=new T.Group();all.name='2026-10-11 · 67照片建筑细节';const byName=new Map(data.elements.filter(e=>e.tags?.building).map(e=>[e.tags.name,e]));const pts=e=>e.geometry.map(p=>project(p.lat,p.lon));
 for(const name of ['人工智能学院','材料科学与工程学院','电子信息与光学工程学院']){const e=byName.get(name);if(e)all.add(academicStudy(pts(e),name));}
 const cZone=data.elements.find(e=>e.id===1433084261),bZone=data.elements.find(e=>e.id===1430904059);if(cZone&&bZone)all.add(teachingCourt(pts(cZone),pts(bZone)));
 const library=campusResult.group.children.find(o=>o.name?.startsWith('中心图书馆'));if(library)libraryStudy(library);
 for(const [name,factory] of [['汉语言文化学院',cultureStudy],['大通学生活动中心',activityStudy]]){const e=byName.get(name);if(e)all.add(factory(pts(e)));}
 // Commercial OSM footprint is a position anchor only. Photos establish
 // shop styling/relationship, not a survey of individual shop coordinates.
 all.add(commerceModel(project(38.99182,117.33530)));all.add(roadStudy(campusResult.driveLanes));
 for(const [key,name] of [['service','学一食堂'],['labs','C区'],['stone','哲学院'],['planet','前沿交叉学科中心']]){const e=byName.get(name);if(e)all.add(publicStudy(pts(e),key));}
 const west=project(38.98215,117.3282);all.add(publicStudy([west.clone().add(new T.Vector3(-12,0,-4)),west.clone().add(new T.Vector3(12,0,-4)),west.clone().add(new T.Vector3(12,0,4)),west.clone().add(new T.Vector3(-12,0,4))],'gate'));
 const used=new Set();all.traverse(o=>{for(const n of o.userData.photoIds||[])used.add(n);});for(const o of campusResult.group.children)o.traverse(p=>{for(const n of p.userData.photoIds||[])used.add(n);});
 all.userData.usedPhotoIds=[...used].sort((a,b)=>a-b);all.userData.referenceManifest='work/campus-photo-survey.json';optimizePhotoDetails(all);if(library)optimizePhotoDetails(library);scene.add(all);return all;
}

export {libraryStudy,gymStudy,cultureStudy,activityStudy,commerceModel,academicStudy,publicStudy,roadStudy};
