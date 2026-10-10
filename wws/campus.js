import * as T from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import {libraryModel} from './landmarks.js?v=landmarks-3';
import {officeModel,activityModel} from './additional-landmarks.js?v=buildings-2';
import {hospitalModel,cultureModel} from './photo-landmarks.js?v=photo-1';
export async function loadCampus(scene,project){
 const response=await fetch('./work/campus-osm.json');if(!response.ok)throw Error('地图数据未下载完成');const data=await response.json(),group=new T.Group(),obstacles=[],driveLanes=[],waterAreas=[],stairSegments=[];let buildings=0,roads=0,libraryDoor=null;
 const mat=c=>new T.MeshStandardMaterial({color:c,roughness:.88});
 // A high-frequency brick/concrete facade tile gives the non-landmark OSM footprints
 // believable material scale instead of a flat, single-colour extrusion.
 const facadeCanvas=document.createElement('canvas');facadeCanvas.width=facadeCanvas.height=256;const fx=facadeCanvas.getContext('2d');fx.fillStyle='#a7816e';fx.fillRect(0,0,256,256);
 for(let row=0;row<32;row++)for(let col=-1;col<18;col++){const v=102+((row*19+col*11)%34);fx.fillStyle=`rgb(${v+31},${Math.max(48,v-10)},${Math.max(36,v-22)})`;fx.fillRect(col*18+(row%2)*9,row*8,17,7)}
 const facadeBase=new T.CanvasTexture(facadeCanvas);facadeBase.wrapS=facadeBase.wrapT=T.RepeatWrapping;facadeBase.colorSpace=T.SRGBColorSpace;
 const facade=c=>{const map=facadeBase.clone();map.repeat.set(5,4);map.needsUpdate=true;return new T.MeshStandardMaterial({map,color:c,roughness:.82,metalness:.04})};
 const asphaltBase=new T.TextureLoader().load('./work/asphalt-ultra-v2.png');asphaltBase.colorSpace=T.SRGBColorSpace;asphaltBase.wrapS=asphaltBase.wrapT=T.RepeatWrapping;
 const asphalt=(width,len)=>{const map=asphaltBase.clone();map.repeat.set(Math.max(1,width/3.5),Math.max(1,len/3.5));map.needsUpdate=true;return new T.MeshPhysicalMaterial({map,color:0x8c9395,roughness:.56,metalness:.04,clearcoat:.16,clearcoatRoughness:.42})};
 function polygon(points,height,color,building=true){const clean=points.filter((p,i,a)=>!i||p.distanceTo(a[i-1])>.05);if(clean.length>2&&clean[0].distanceTo(clean[clean.length-1])<.05)clean.pop();const shape=new T.Shape(clean.map(p=>new T.Vector2(p.x,-p.z)));const geo=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false});geo.rotateX(-Math.PI/2);const m=new T.Mesh(geo,building?facade(color):mat(color));m.castShadow=height>2;m.receiveShadow=true;group.add(m);return m}
 for(const e of data.elements){const tags=e.tags||{},pts=(e.geometry||[]).map(p=>project(p.lat,p.lon));if(pts.length<2)continue;
 if(tags.building&&pts.length>3&&(/综合业务[东西]楼/.test(tags.name)||tags.name==='大通学生活动中心')){
  const activity=tags.name==='大通学生活动中心',model=activity?activityModel(pts):officeModel(pts,tags.name);group.add(model);obstacles.push({points:pts,height:activity?15:23,box:new T.Box3().setFromObject(model),courtyard:model.userData.courtyard});buildings++;continue;
 }
 if(tags.building&&pts.length>3&&(tags.name==='南开大学医院'||tags.name==='汉语言文化学院')){
  const hospital=tags.name==='南开大学医院',model=hospital?hospitalModel(pts):cultureModel(pts);group.add(model);obstacles.push({points:pts,height:hospital?14:25,box:new T.Box3().setFromObject(model)});buildings++;continue;
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
 scene.add(group);return {obstacles,buildings,roads,driveLanes,libraryDoor,waterAreas,stairSegments};
}
export function inside(x,z,points){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)hit=!hit}return hit}
