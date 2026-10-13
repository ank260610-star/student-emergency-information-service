import * as T from './vendor/three/build/three.module.js';
const material=color=>new T.MeshStandardMaterial({color,roughness:.8});

export function createSiyuanRoof(points,height){
 const bounds=new T.Box3().setFromPoints(points),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),roof=new T.Group();roof.name='思源堂红瓦坡屋顶与中央穹顶';roof.position.set(center.x,height,center.z);
 const tiles=material(0x793e38),trim=material(0xd7cbbc),width=size.x,depth=size.z;
 // Low pitched wings with a raised central pavilion match the supplied front photo.
 for(const side of [-1,1]){const pitch=new T.Mesh(new T.BoxGeometry(width+2,.35,depth/2+1),tiles);pitch.position.set(0,1.5,side*depth/4);pitch.rotation.x=side*.16;pitch.castShadow=true;roof.add(pitch)}
 for(const [w,h,d,y] of [[width*.25,4,depth*.6,2],[width*.2,1,depth*.5,4.5],[width*.16,1,depth*.4,5.5]]){const step=new T.Mesh(new T.BoxGeometry(w,h,d),tiles);step.position.y=y;step.castShadow=true;roof.add(step);const cornice=new T.Mesh(new T.BoxGeometry(w+1,.28,d+1),trim);cornice.position.y=y+h/2;roof.add(cornice)}
 const dome=new T.Mesh(new T.SphereGeometry(Math.min(width*.08,depth*.18),24,12,0,Math.PI*2,0,Math.PI/2),tiles);dome.position.y=6.1;dome.name='中央红色半球穹顶';dome.castShadow=true;roof.add(dome);return roof;
}
function stadiumPath(straight,radius){
 const path=new T.Shape();path.moveTo(-straight,-radius);path.lineTo(straight,-radius);path.absarc(straight,0,radius,-Math.PI/2,Math.PI/2,false);path.lineTo(-straight,radius);path.absarc(-straight,0,radius,Math.PI/2,Math.PI*1.5,false);return path;
}
let athleticsMaterials;
function texturedAthleticsMaterials(){
 if(athleticsMaterials)return athleticsMaterials;
 const size=256,rubber=new Uint8Array(size*size*4),grass=new Uint8Array(size*size*4),grain=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,noise=((x*73856093^y*19349663)>>>0)%31-15,stripe=Math.floor(x/32)%2;
  rubber.set([167+noise,88+noise,65+noise,255],i);grass.set([48+stripe*15+noise,105+stripe*18+noise,49+stripe*8+noise,255],i);const pore=125+noise*4;grain.set([pore,pore,pore,255],i);
 }
 const texture=(pixels,repeatX,repeatY,srgb=false)=>{const t=new T.DataTexture(pixels,size,size);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeatX,repeatY);t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;if(srgb)t.colorSpace=T.SRGBColorSpace;t.needsUpdate=true;return t};
 const track=new T.MeshStandardMaterial({map:texture(rubber,.25,.25,true),bumpMap:texture(grain,.25,.25),bumpScale:.025,roughness:.94});track.name='颗粒塑胶跑道';
 const turf=new T.MeshStandardMaterial({map:texture(grass,1,1,true),bumpMap:texture(grain,20,12),bumpScale:.018,roughness:1});turf.name='分区修剪草坪';
 return athleticsMaterials={track,turf};
}
export function createAthleticsTrack(name,{detailed=false,northSouth=false}={}){
 const group=new T.Group();group.name=name;group.userData.athleticsTrack=true;if(northSouth)group.rotation.y=Math.PI/2;
 const materials=detailed?texturedAthleticsMaterials():{track:material(0xad624e),turf:material(0x4a8050)};
 const surface=new T.Mesh(new T.ShapeGeometry(stadiumPath(39,42),48),materials.track);surface.name='塑胶跑道表面';surface.rotation.x=-Math.PI/2;surface.position.y=.95;group.add(surface);
 for(let lane=0;lane<=8;lane++){const path=stadiumPath(39,32+lane*1.15),points=path.getPoints(128).map(p=>new T.Vector3(p.x,.98,p.y));const line=new T.LineLoop(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0xf0e6d2}));line.name=`跑道线 ${lane}`;group.add(line)}
 const turf=new T.Mesh(new T.PlaneGeometry(100,58),materials.turf);turf.name='足球场草坪';turf.rotation.x=-Math.PI/2;turf.position.y=1;group.add(turf);
 const white=material(0xf3ead6),line=(w,d,x,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,.025,d),white);mesh.position.set(x,1.03,z);group.add(mesh)};
 for(const z of [-27,27])line(96,.15,0,z);for(const x of [-48,0,48])line(.15,54,x,0);
 const center=new T.Mesh(new T.RingGeometry(8.95,9.1,64),white);center.rotation.x=-Math.PI/2;center.position.y=1.04;group.add(center);
 for(const side of [-1,1]){line(.15,32,side*32,0);for(const z of [-16,16])line(16,.15,side*40,z);const goal=new T.Group();goal.name='球门与网';goal.position.set(side*48,1,0);for(const z of [-3.66,3.66]){const post=new T.Mesh(new T.BoxGeometry(.12,2.44,.12),white);post.position.set(0,1.22,z);goal.add(post)}const bar=new T.Mesh(new T.BoxGeometry(.12,.12,7.44),white);bar.position.y=2.44;goal.add(bar);for(let z=-3.66;z<=3.66;z+=.4){const net=new T.Mesh(new T.BoxGeometry(.025,2.4,.025),white);net.position.set(side*1.6,1.2,z);goal.add(net)}group.add(goal)}
 // Finish line crosses every lane near the straight's end.
 line(.18,10,30,-37);return group;
}
