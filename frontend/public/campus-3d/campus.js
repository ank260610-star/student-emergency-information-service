import {surveyedBuilding,addSurveyDetails,optimizePhotoDetails} from './campus-photo-details.js?v=photos-1';
import * as T from 'three';
import {libraryModel} from './landmarks.js?v=landmarks-3';
import {officeModel,activityModel,gymModel} from './additional-landmarks.js?v=buildings-3';
import {hospitalModel,cultureModel} from './photo-landmarks.js?v=photo-1';
export async function loadCampus(scene,project){
 const response=await fetch('./work/campus-osm.json');if(!response.ok)throw Error('地图数据未下载完成');const data=await response.json(),group=new T.Group(),obstacles=[],driveLanes=[],waterAreas=[],stairSegments=[];let buildings=0,roads=0,libraryDoor=null;
 const materialCache=new Map();
 const mat=c=>{if(!materialCache.has(c))materialCache.set(c,new T.MeshStandardMaterial({color:c,roughness:.88}));return materialCache.get(c)};
 // A high-frequency brick/concrete facade tile gives the non-landmark OSM footprints
 // believable material scale instead of a flat, single-colour extrusion.
 const facadeCanvas=document.createElement('canvas');facadeCanvas.width=facadeCanvas.height=256;const fx=facadeCanvas.getContext('2d');fx.fillStyle='#a7816e';fx.fillRect(0,0,256,256);
 for(let row=0;row<32;row++)for(let col=-1;col<18;col++){const v=102+((row*19+col*11)%34);fx.fillStyle=`rgb(${v+31},${Math.max(48,v-10)},${Math.max(36,v-22)})`;fx.fillRect(col*18+(row%2)*9,row*8,17,7)}
 const facadeBase=new T.CanvasTexture(facadeCanvas);facadeBase.wrapS=facadeBase.wrapT=T.RepeatWrapping;facadeBase.colorSpace=T.SRGBColorSpace;
 const facade=c=>{const map=facadeBase.clone();map.repeat.set(5,4);map.needsUpdate=true;return new T.MeshStandardMaterial({map,color:c,roughness:.82,metalness:.04})};
 const asphaltBase=await new T.TextureLoader().loadAsync('./work/asphalt-ultra-v2.png');asphaltBase.colorSpace=T.SRGBColorSpace;asphaltBase.wrapS=asphaltBase.wrapT=T.RepeatWrapping;
 const asphalt=(width,len)=>{const map=asphaltBase.clone();map.repeat.set(Math.max(1,width/3.5),Math.max(1,len/3.5));map.needsUpdate=true;return new T.MeshPhysicalMaterial({map,color:0x8c9395,roughness:.56,metalness:.04,clearcoat:.16,clearcoatRoughness:.42})};
 function polygon(points,height,color,building=true){const clean=points.filter((p,i,a)=>!i||p.distanceTo(a[i-1])>.05);if(clean.length>2&&clean[0].distanceTo(clean[clean.length-1])<.05)clean.pop();const shape=new T.Shape(clean.map(p=>new T.Vector2(p.x,-p.z)));const geo=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false});geo.rotateX(-Math.PI/2);const m=new T.Mesh(geo,building?facade(color):mat(color));m.castShadow=height>2;m.receiveShadow=true;group.add(m);return m}
 // Built from Winslow's three on-site reference photos: tall red-brick volumes,
 // a glazed entrance bay, deep white canopy and the stepped central stair.
 function labCModel(points){
  const clean=points.filter((p,i,a)=>!i||p.distanceTo(a[i-1])>.05);if(clean[0].distanceTo(clean[clean.length-1])<.05)clean.pop();
  const model=new T.Group(),shape=new T.Shape(clean.map(p=>new T.Vector2(p.x,-p.z))),brick=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:22,bevelEnabled:false}),facade(0xaa5547));brick.geometry.rotateX(-Math.PI/2);brick.castShadow=brick.receiveShadow=true;model.add(brick);
  let edge={a:clean[0],b:clean[1],length:0};for(let i=1;i<clean.length;i++){const a=clean[i-1],b=clean[i],length=a.distanceTo(b);if(length>edge.length)edge={a,b,length}};
  const mid=edge.a.clone().add(edge.b).multiplyScalar(.5),angle=Math.atan2(edge.b.x-edge.a.x,edge.b.z-edge.a.z),side=new T.Vector3(Math.cos(angle),0,-Math.sin(angle));
  const glassMat=new T.MeshPhysicalMaterial({color:0x6f9daa,metalness:.45,roughness:.12,transmission:.15,transparent:true,opacity:.84,clearcoat:.8,clearcoatRoughness:.12}),dark=mat(0x24292b),concrete=mat(0xd9d4c9);
  const curtainWidth=Math.min(edge.length*.64,30),curtain=new T.Mesh(new T.BoxGeometry(.16,15.4,curtainWidth),glassMat);curtain.position.copy(mid).addScaledVector(side,.16);curtain.position.y=8.1;curtain.rotation.y=angle;model.add(curtain);
  for(let n=-Math.floor(curtainWidth/2);n<=Math.floor(curtainWidth/2);n+=2){const mullion=new T.Mesh(new T.BoxGeometry(.25,15.9,.12),dark);mullion.position.copy(curtain.position);mullion.position.x+=Math.sin(angle)*n;mullion.position.z+=Math.cos(angle)*n;model.add(mullion)}
  for(let y=2.4;y<15.5;y+=2.25){const rail=new T.Mesh(new T.BoxGeometry(.21,.12,curtainWidth+.24),dark);rail.position.copy(curtain.position);rail.position.y=y;rail.rotation.y=angle;model.add(rail)}
  const canopy=new T.Mesh(new T.BoxGeometry(8.5,.75,curtainWidth+5),concrete);canopy.position.copy(curtain.position).addScaledVector(side,4.1);canopy.position.y=16.2;canopy.rotation.y=angle;model.add(canopy);
  const signPanel=new T.Mesh(new T.BoxGeometry(.35,8.5,7.8),facade(0x913f37));signPanel.position.copy(curtain.position);signPanel.position.x+=Math.sin(angle)*(curtainWidth*.5+4.4);signPanel.position.z+=Math.cos(angle)*(curtainWidth*.5+4.4);signPanel.position.y=11.2;signPanel.rotation.y=angle;model.add(signPanel);
  const signCanvas=document.createElement('canvas');signCanvas.width=1024;signCanvas.height=512;const ctx=signCanvas.getContext('2d');ctx.clearRect(0,0,1024,512);ctx.fillStyle='#f4f0e4';ctx.textAlign='center';ctx.font='700 88px Noto Sans SC, sans-serif';ctx.fillText('综合实验楼',512,138);ctx.font='700 78px Arial';ctx.fillText('C',512,230);ctx.font='600 35px Arial';ctx.fillText('LAB HALL C',512,295);ctx.font='500 28px Noto Sans SC, sans-serif';ctx.fillText('药物化学生物学国家重点实验室',512,362);const signTex=new T.CanvasTexture(signCanvas),sign=new T.Mesh(new T.PlaneGeometry(7.0,3.5),new T.MeshBasicMaterial({map:signTex,transparent:true}));sign.position.copy(signPanel.position).addScaledVector(side,.2);sign.position.y=12;sign.rotation.y=angle;model.add(sign);
  const door=new T.Mesh(new T.BoxGeometry(.22,3.8,5.3),dark);door.position.copy(curtain.position).addScaledVector(side,.18);door.position.y=2.05;door.rotation.y=angle;model.add(door);
  for(let s=0;s<6;s++){const step=new T.Mesh(new T.BoxGeometry(1.1,.22,Math.min(curtainWidth*.72,17)-s*.3),concrete);step.position.copy(curtain.position).addScaledVector(side,1.25+s*.82);step.position.y=.11+s*.17;step.rotation.y=angle;step.receiveShadow=true;model.add(step)}
  model.userData={kind:'lab-c',name:'综合实验楼 C'};model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return model;
 }
 function labBModel(points){
  const clean=points.filter((p,i,a)=>!i||p.distanceTo(a[i-1])>.05);if(clean[0].distanceTo(clean[clean.length-1])<.05)clean.pop();
  const model=new T.Group(),shape=new T.Shape(clean.map(p=>new T.Vector2(p.x,-p.z))),brickMat=facade(0xa95346),base=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:24,bevelEnabled:false}),brickMat);base.geometry.rotateX(-Math.PI/2);base.castShadow=base.receiveShadow=true;model.add(base);
  let edge={a:clean[0],b:clean[1],length:0};for(let i=1;i<clean.length;i++){const a=clean[i-1],b=clean[i],length=a.distanceTo(b);if(length>edge.length)edge={a,b,length}};
  const mid=edge.a.clone().add(edge.b).multiplyScalar(.5),yaw=Math.atan2(edge.b.x-edge.a.x,edge.b.z-edge.a.z),normal=new T.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),concrete=mat(0xd5ccba),dark=mat(0x252b2c),glass=new T.MeshPhysicalMaterial({color:0x789ba5,metalness:.52,roughness:.12,transparent:true,opacity:.86,clearcoat:.75});
  const width=Math.min(edge.length*.7,31),curtain=new T.Mesh(new T.BoxGeometry(.16,18.8,width),glass);curtain.position.copy(mid).addScaledVector(normal,.18);curtain.position.y=9.6;curtain.rotation.y=yaw;model.add(curtain);
  for(let x=-Math.floor(width/2);x<=Math.floor(width/2);x+=2.2){const mullion=new T.Mesh(new T.BoxGeometry(.27,19.2,.13),dark);mullion.position.copy(curtain.position);mullion.position.x+=Math.sin(yaw)*x;mullion.position.z+=Math.cos(yaw)*x;model.add(mullion)}
  for(let y=1.5;y<19;y+=2.2){const rail=new T.Mesh(new T.BoxGeometry(.22,.13,width+.18),dark);rail.position.copy(curtain.position);rail.position.y=y;rail.rotation.y=yaw;model.add(rail)}
  const canopy=new T.Mesh(new T.BoxGeometry(10.8,.9,width+8),concrete);canopy.position.copy(curtain.position).addScaledVector(normal,5.1);canopy.position.y=20.4;canopy.rotation.y=yaw;canopy.castShadow=canopy.receiveShadow=true;model.add(canopy);
  const brickSign=new T.Mesh(new T.BoxGeometry(.42,10,8.7),brickMat);brickSign.position.copy(curtain.position);brickSign.position.x+=Math.sin(yaw)*(width*.5+4.7);brickSign.position.z+=Math.cos(yaw)*(width*.5+4.7);brickSign.position.y=10.2;brickSign.rotation.y=yaw;model.add(brickSign);
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=420;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1024,420);ctx.fillStyle='#f3eee4';ctx.textAlign='center';ctx.font='700 88px Noto Sans SC, sans-serif';ctx.fillText('综合实验楼 B区',512,145);ctx.font='700 46px Arial';ctx.fillText('LAB HALL',512,225);const sign=new T.Mesh(new T.PlaneGeometry(7.8,3.2),new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true}));sign.position.copy(brickSign.position).addScaledVector(normal,.24);sign.position.y=11.8;sign.rotation.y=yaw;model.add(sign);
  for(let s=0;s<5;s++){const step=new T.Mesh(new T.BoxGeometry(1.0,.22,Math.min(19,width*.68)-s*.35),concrete);step.position.copy(curtain.position).addScaledVector(normal,1.05+s*.72);step.position.y=.11+s*.17;step.rotation.y=yaw;step.receiveShadow=true;model.add(step)}
  model.userData={kind:'lab-b',name:'综合实验楼 B区'};model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return model;
 }
 // D区实拍的识别点是低矮横向红砖体量、成片穿孔砖和连接体玻璃幕墙，和 B/C 入口不同。
 function labDModel(points){
  const clean=points.filter((p,i,a)=>!i||p.distanceTo(a[i-1])>.05);if(clean[0].distanceTo(clean[clean.length-1])<.05)clean.pop();
  const model=new T.Group(),shape=new T.Shape(clean.map(p=>new T.Vector2(p.x,-p.z))),brickMat=facade(0x9c4d42),base=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:18,bevelEnabled:false}),brickMat);base.geometry.rotateX(-Math.PI/2);base.castShadow=base.receiveShadow=true;model.add(base);
  let edge={a:clean[0],b:clean[1],length:0};for(let i=1;i<clean.length;i++){const a=clean[i-1],b=clean[i],length=a.distanceTo(b);if(length>edge.length)edge={a,b,length}};
  const mid=edge.a.clone().add(edge.b).multiplyScalar(.5),yaw=Math.atan2(edge.b.x-edge.a.x,edge.b.z-edge.a.z),normal=new T.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),dark=mat(0x262b2c),concrete=mat(0xd1cac0),glass=new T.MeshPhysicalMaterial({color:0x638896,metalness:.46,roughness:.12,transparent:true,opacity:.86,clearcoat:.72});
  const glassWidth=Math.min(edge.length*.28,15),curtain=new T.Mesh(new T.BoxGeometry(.18,17.2,glassWidth),glass);curtain.position.copy(mid).addScaledVector(normal,.2);curtain.position.y=8.65;curtain.rotation.y=yaw;model.add(curtain);
  for(let n=-Math.floor(glassWidth/2);n<=Math.floor(glassWidth/2);n+=1.8){const mullion=new T.Mesh(new T.BoxGeometry(.23,17.4,.1),dark);mullion.position.copy(curtain.position);mullion.position.x+=Math.sin(yaw)*n;mullion.position.z+=Math.cos(yaw)*n;model.add(mullion)}
  for(let y=2.5;y<17;y+=2.6){const rail=new T.Mesh(new T.BoxGeometry(.22,.13,glassWidth+.2),dark);rail.position.copy(curtain.position);rail.position.y=y;rail.rotation.y=yaw;model.add(rail)}
  // Four perforated brick fields read as genuine ventilation masonry from the supplied façade reference.
  const sideSpan=Math.min(edge.length*.72,34);for(const [offset,level] of [[-sideSpan*.34,12.5],[sideSpan*.34,12.5],[-sideSpan*.34,5.5],[sideSpan*.34,5.5]])for(let row=0;row<5;row++)for(let col=0;col<7;col++){const hole=new T.Mesh(new T.BoxGeometry(.26,.42,.35),dark);hole.position.copy(mid).addScaledVector(normal,.25);const spread=offset+(col-3)*.72;hole.position.x+=Math.sin(yaw)*spread;hole.position.z+=Math.cos(yaw)*spread;hole.position.y=level+row*.62;hole.rotation.y=yaw;model.add(hole)}
  const band=new T.Mesh(new T.BoxGeometry(.3,.62,sideSpan+3),concrete);band.position.copy(mid).addScaledVector(normal,.22);band.position.y=9.1;band.rotation.y=yaw;model.add(band);
  const panel=new T.Mesh(new T.BoxGeometry(.34,7.4,9.7),brickMat);panel.position.copy(curtain.position);panel.position.x+=Math.sin(yaw)*(glassWidth*.5+6.1);panel.position.z+=Math.cos(yaw)*(glassWidth*.5+6.1);panel.position.y=10.5;panel.rotation.y=yaw;model.add(panel);
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=480;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1024,480);ctx.fillStyle='#f3eee4';ctx.textAlign='center';ctx.font='700 86px Noto Sans SC, sans-serif';ctx.fillText('综合实验楼 D区',512,150);ctx.font='700 46px Arial';ctx.fillText('LAB HALL',512,225);ctx.font='500 26px Noto Sans SC, sans-serif';ctx.fillText('药物化学生物学国家重点实验室',512,286);const sign=new T.Mesh(new T.PlaneGeometry(8.8,3.9),new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true}));sign.position.copy(panel.position).addScaledVector(normal,.23);sign.position.y=11.2;sign.rotation.y=yaw;model.add(sign);
  // The large red lawn lettering is a landmark in the supplied wide shot.
  const lawnText=document.createElement('canvas');lawnText.width=1024;lawnText.height=220;const lc=lawnText.getContext('2d');lc.clearRect(0,0,1024,220);lc.fillStyle='#b2261d';lc.font='700 130px Noto Sans SC, sans-serif';lc.textAlign='center';lc.textBaseline='middle';lc.fillText('只争朝夕',512,112);const words=new T.Mesh(new T.PlaneGeometry(16,3.45),new T.MeshBasicMaterial({map:new T.CanvasTexture(lawnText),transparent:true}));words.position.copy(mid).addScaledVector(normal,5.1);words.position.y=2.05;words.rotation.y=yaw;model.add(words);
  model.userData={kind:'lab-d',name:'综合实验楼 D区'};model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return model;
 }
 // The public-teaching cluster and lab cluster share A/B/C/D labels in OSM. Their façades do not:
 // this version is the low, perforated red-brick teaching hall shown in the supplied A-zone photo.
 function teachingHallModel(points,zone){
  const clean=points.filter((p,i,a)=>!i||p.distanceTo(a[i-1])>.05);if(clean[0].distanceTo(clean[clean.length-1])<.05)clean.pop();
  const model=new T.Group(),shape=new T.Shape(clean.map(p=>new T.Vector2(p.x,-p.z))),brickMat=facade(0x9e5545),base=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:17.2,bevelEnabled:false}),brickMat);base.geometry.rotateX(-Math.PI/2);base.castShadow=base.receiveShadow=true;model.add(base);
  let edge={a:clean[0],b:clean[1],length:0};for(let i=1;i<clean.length;i++){const a=clean[i-1],b=clean[i],length=a.distanceTo(b);if(length>edge.length)edge={a,b,length}};
  const mid=edge.a.clone().add(edge.b).multiplyScalar(.5),yaw=Math.atan2(edge.b.x-edge.a.x,edge.b.z-edge.a.z),normal=new T.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),dark=mat(0x283033),bandMat=mat(0xd8d1c3),glass=new T.MeshPhysicalMaterial({color:0x789ca8,metalness:.48,roughness:.13,transparent:true,opacity:.86,clearcoat:.72});
  const span=Math.min(edge.length*.74,40),bayWidth=Math.min(edge.length*.22,11),bay=new T.Mesh(new T.BoxGeometry(.2,14.5,bayWidth),glass);bay.position.copy(mid).addScaledVector(normal,.22);bay.position.y=9.7;bay.rotation.y=yaw;model.add(bay);
  for(let n=-Math.floor(bayWidth/2);n<=Math.floor(bayWidth/2);n+=1.5){const mullion=new T.Mesh(new T.BoxGeometry(.24,14.7,.12),dark);mullion.position.copy(bay.position);mullion.position.x+=Math.sin(yaw)*n;mullion.position.z+=Math.cos(yaw)*n;model.add(mullion)}
  for(const y of [5.55,11.1]){const rail=new T.Mesh(new T.BoxGeometry(.26,.6,span+2),bandMat);rail.position.copy(mid).addScaledVector(normal,.24);rail.position.y=y;rail.rotation.y=yaw;model.add(rail)}
  // Nine repeated brick-vent panels distinguish the teaching façades at normal driving distance.
  for(const y of [3.0,8.2,13.35])for(const off of [-span*.32,0,span*.32])for(let row=0;row<4;row++)for(let col=0;col<6;col++){const vent=new T.Mesh(new T.BoxGeometry(.24,.37,.34),dark);vent.position.copy(mid).addScaledVector(normal,.27);const side=off+(col-2.5)*.67;vent.position.x+=Math.sin(yaw)*side;vent.position.z+=Math.cos(yaw)*side;vent.position.y=y+row*.62;vent.rotation.y=yaw;model.add(vent)}
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=400;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1024,400);ctx.fillStyle='#f5eee2';ctx.textAlign='center';ctx.font='700 86px Noto Sans SC, sans-serif';ctx.fillText('公共教学楼',512,142);ctx.font='700 44px Arial';ctx.fillText('PUBLIC TEACHING HALL',512,215);ctx.font='700 62px Noto Sans SC, sans-serif';ctx.fillText(zone,512,300);const plaque=new T.Mesh(new T.PlaneGeometry(8.2,3.15),new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true}));plaque.position.copy(mid).addScaledVector(normal,.31);plaque.position.x+=Math.sin(yaw)*(span*.43);plaque.position.z+=Math.cos(yaw)*(span*.43);plaque.position.y=8.2;plaque.rotation.y=yaw;model.add(plaque);
  model.userData={kind:'public-teaching',name:`公共教学楼 ${zone}`};model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return model;
 }
 for(const e of data.elements){const tags=e.tags||{},raw=e.geometry||[],pts=raw.map(p=>project(p.lat,p.lon)),meanLon=raw.reduce((sum,p)=>sum+p.lon,0)/Math.max(1,raw.length);if(pts.length<2)continue;
 if(tags.building&&pts.length>3){const surveyed=surveyedBuilding(pts,tags.name,e.id);if(surveyed){group.add(surveyed);obstacles.push({osmId:e.id,points:pts,height:surveyed.userData.height,box:new T.Box3().setFromObject(surveyed),courtyard:surveyed.userData.courtyard,groundOpening:surveyed.userData.groundOpening});buildings++;continue;}}
 if(tags.building&&pts.length>3&&(/综合业务[东西]楼/.test(tags.name)||tags.name==='大通学生活动中心')){
  const activity=tags.name==='大通学生活动中心',model=activity?activityModel(pts):officeModel(pts,tags.name);if(activity){model.userData.photoComponent='activity-white-perforated-facade';model.userData.evidencePhotoIds=[14];model.userData.photoIds=[14];}group.add(model);obstacles.push({points:pts,height:activity?15:23,box:new T.Box3().setFromObject(model),courtyard:model.userData.courtyard});buildings++;continue;
 }
 if(tags.building&&pts.length>3&&tags.name==='体育馆'){
  const model=gymModel(pts);group.add(model);obstacles.push({points:pts,height:16.5,box:new T.Box3().setFromObject(model)});buildings++;continue;
 }
 if(tags.building&&pts.length>3&&(tags.name==='南开大学医院'||tags.name==='汉语言文化学院')){
  const hospital=tags.name==='南开大学医院',model=hospital?hospitalModel(pts):cultureModel(pts);group.add(model);obstacles.push({points:pts,height:hospital?14:25,box:new T.Box3().setFromObject(model)});buildings++;continue;
 }
 if(tags.building&&pts.length>3&&/^[ABCD]区$/.test(tags.name||'')&&meanLon<117.3406){
  const model=teachingHallModel(pts,tags.name);group.add(model);obstacles.push({points:pts,height:17.2,box:new T.Box3().setFromObject(model)});buildings++;continue;
 }
 if(tags.building&&pts.length>3&&tags.name==='C区'){
  const model=labCModel(pts);group.add(model);obstacles.push({points:pts,height:22,box:new T.Box3().setFromObject(model)});buildings++;continue;
 }
 if(tags.building&&pts.length>3&&tags.name==='B区'){
  const model=labBModel(pts);group.add(model);obstacles.push({points:pts,height:24,box:new T.Box3().setFromObject(model)});buildings++;continue;
 }
 if(tags.building&&pts.length>3&&tags.name==='D区'){
  const model=labDModel(pts);group.add(model);obstacles.push({points:pts,height:18,box:new T.Box3().setFromObject(model)});buildings++;continue;
 }
 if(tags.building&&pts.length>3){if(tags.name?.includes('津南校区中心图书馆')){const model=libraryModel();model.position.copy(project(38.9852884,117.3405293));group.add(model);model.updateMatrixWorld(true);libraryDoor=model.localToWorld(new T.Vector3(0,0,24));const interiorBoxes=(model.userData.interiorSolids||[]).map(o=>new T.Box3().setFromObject(o));obstacles.push({points:pts,height:43.2,box:new T.Box3().setFromObject(model),interior:true,door:libraryDoor.clone(),interiorBoxes});buildings++;continue;}const h=parseFloat(tags.height)||(+tags['building:levels']||5)*3.4;const m=polygon(pts,h,/dormitory|apartments/.test(tags.building)?0xc3a895:0xd3c8b5);m.userData.label=tags.name||'未命名建筑';const box=new T.Box3().setFromObject(m);obstacles.push({points:pts,height:h,box});buildings++;
 // Individual panes, mullions and a recessed entry follow the real OSM footprint edges.
 const wm=new T.MeshStandardMaterial({color:0x416a78,metalness:.58,roughness:.18,emissive:0x07151b,emissiveIntensity:.28}),frame=mat(0x303637);
 for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],len=a.distanceTo(b);if(len<5)continue;const angle=Math.atan2(b.x-a.x,b.z-a.z),mid=a.clone().add(b).multiplyScalar(.5),panes=Math.min(5,Math.max(2,Math.floor(len/12))),step=len/(panes+1),dx=(b.x-a.x)/len,dz=(b.z-a.z)/len;
   for(let y=3;y<h-1;y+=4.8)for(let n=1;n<=panes;n++){const win=new T.Mesh(new T.BoxGeometry(.16,1.75,Math.min(4.8,step*.72)),wm);win.position.set(a.x+dx*step*n,y,a.z+dz*step*n);win.rotation.y=angle;group.add(win);const sill=new T.Mesh(new T.BoxGeometry(.23,.10,Math.min(5.1,step*.8)),frame);sill.position.copy(win.position);sill.position.y=y-.98;sill.rotation.y=angle;group.add(sill)}
   if(i===1&&tags.name){const entry=new T.Mesh(new T.BoxGeometry(.28,3.4,Math.min(7,len*.42)),wm);entry.position.copy(mid);entry.position.y=1.9;entry.rotation.y=angle;group.add(entry);for(let s=-1;s<=1;s+=2){const jamb=new T.Mesh(new T.BoxGeometry(.4,3.9,.25),frame);jamb.position.copy(mid);jamb.position.x+=dx*s*Math.min(3,len*.18);jamb.position.z+=dz*s*Math.min(3,len*.18);jamb.position.y=2;jamb.rotation.y=angle;group.add(jamb)}}
   if(i===1&&h>12){const roofUnit=new T.Mesh(new T.BoxGeometry(Math.min(8,len*.28),1.25,3.4),frame);roofUnit.position.copy(mid);roofUnit.position.y=h+.7;group.add(roofUnit)}
 }
 }else if(tags.natural==='water'&&pts.length>3){const xs=pts.map(p=>p.x),zs=pts.map(p=>p.z),spanX=Math.max(...xs)-Math.min(...xs),spanZ=Math.max(...zs)-Math.min(...zs);if(spanX<420&&spanZ<420){polygon(pts,.15,0x498a9a,false);waterAreas.push({points:pts})}}else if(tags.highway){if(tags.highway==='construction')continue;const width=parseFloat(tags.width)||(/footway|path|steps/.test(tags.highway)?2.3:/primary|secondary/.test(tags.highway)?16:8);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],len=a.distanceTo(b);if(len<.1)continue;if(tags.highway==='steps')stairSegments.push({a:a.clone(),b:b.clone(),width:Math.max(width,2.2),height:Math.min(3.2,Math.max(.45,len*.12))});const angle=Math.atan2(b.x-a.x,b.z-a.z),mid=a.clone().add(b).multiplyScalar(.5),isFoot=width<3;
   const m=new T.Mesh(new T.BoxGeometry(width,.16,len),isFoot?mat(0xb6b1a4):asphalt(width,len));m.position.copy(mid);m.position.y=.08;m.rotation.y=angle;m.receiveShadow=true;group.add(m);
   if(!isFoot)driveLanes.push({a:a.clone(),b:b.clone(),width});
   if(!isFoot&&width>=6){for(const side of [-1,1]){const curb=new T.Mesh(new T.BoxGeometry(.34,.22,len),mat(0xc0c3bb));curb.position.copy(mid);curb.position.y=.16;curb.position.x+=Math.cos(angle)*side*(width/2+.15);curb.position.z-=Math.sin(angle)*side*(width/2+.15);curb.rotation.y=angle;group.add(curb)}}
   if(!isFoot&&width>=13){for(let at=-len/2+2.5;at<len/2;at+=7){const dash=new T.Mesh(new T.BoxGeometry(.28,.08,3.2),mat(0xf0e5bd));dash.position.copy(mid);dash.position.y=.19;dash.position.x+=Math.sin(angle)*at;dash.position.z+=Math.cos(angle)*at;dash.rotation.y=angle;group.add(dash)}}
  }roads++}
 }
 scene.add(group);const result={group,obstacles,buildings,roads,driveLanes,libraryDoor,waterAreas,stairSegments};
 result.photoDetails=addSurveyDetails(scene,data,project,result);optimizePhotoDetails(group);return result;
}
export function inside(x,z,points){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)hit=!hit}return hit}
