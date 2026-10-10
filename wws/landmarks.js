import * as T from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
// Front elevation reference: Nankai Library official photograph by Wu Junhui.
// Height: official 2015 opening report, 43.20 m. Depth/back details remain approximate.
export function libraryModel(){
 const g=new T.Group();g.name='中心图书馆 · 实景参考模型';
 const interiorSolids=[];
 const brickCanvas=document.createElement('canvas');brickCanvas.width=256;brickCanvas.height=256;const c=brickCanvas.getContext('2d');c.fillStyle='#684638';c.fillRect(0,0,256,256);for(let row=0;row<32;row++)for(let col=-1;col<16;col++){const n=(row*13+col*7)%17;c.fillStyle=`rgb(${104+n},${61+n},${48+n})`;c.fillRect(col*24+(row%2)*12,row*8,23,7)}
 const texture=new T.CanvasTexture(brickCanvas);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(6,4);texture.colorSpace=T.SRGBColorSpace;
 const brick=new T.MeshStandardMaterial({map:texture,color:0xcac0b9,roughness:.94}),stone=new T.MeshStandardMaterial({color:0xbcbab3,roughness:.82}),glass=new T.MeshStandardMaterial({color:0x355763,metalness:.45,roughness:.23}),frame=new T.MeshStandardMaterial({color:0x343a3b,roughness:.5});
 function box(w,h,d,x,y,z,m,solid=false){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);if(solid)interiorSolids.push(o);return o}
 // 可进入的一层阅览区：书架、长桌、座椅、导视灯与门厅均为实体模型。
 const wood=new T.MeshStandardMaterial({color:0x5a3526,roughness:.72}),lamp=new T.MeshStandardMaterial({color:0xffdf9e,emissive:0xffb85d,emissiveIntensity:1.8});
 box(66,.16,29,0,.16,5,stone);
 for(const x of [-25,-12,12,25]){box(5.6,4.2,14,x,2.25,2,wood,true);for(let y=1.1;y<4.1;y+=1.35)box(5.8,.12,14,x,y,2,wood,true)}
 for(const z of [-7,8,18]){box(15,.75,2.1,0,1.35,z,wood,true);for(const x of [-6.3,6.3])box(1.4,.72,1.4,x,.6,z,wood,true)}
 for(const x of [-28,-14,0,14,28]){const light=new T.PointLight(0xffca76,1.4,22,2);light.position.set(x,7,7);g.add(light);box(.35,.35,.9,x,7.2,7,lamp)}
 // A recessed ground entrance, taller brick wings and a floating upper frame.
 box(172,7.4,44,0,5.8,0,brick);box(168,4.3,1,0,10.4,23,glass);
 box(172,18,44,0,23.6,0,brick);box(169,17,.7,0,23.6,22.3,glass);
 // Piers and narrow windows, with an uninterrupted central emblem wall.
 for(let x=-84;x<=84;x+=2.9){if(Math.abs(x)<17)continue;box(1.95,18.4,2.1,x,23.6,23,brick);for(let y=16;y<32;y+=2.4)box(.88,.13,.3,x+1.43,y,23,frame)}
 box(34,18.5,2.4,0,23.6,23.4,brick);for(const x of [-14,-11,11,14])box(.32,18.6,.4,x,23.6,24.8,frame);
 // Ground floor brick columns and glazed doors.
 for(let x=-78;x<=78;x+=4.5){if(Math.abs(x)<31)continue;box(1.5,6.5,1.5,x,5.8,23,brick)}
 for(let x=-30;x<=30;x+=3.1){box(.13,7,.3,x,8.5,24,frame)}
 for(const y of [6,8.5,11])box(60,.14,.3,0,y,24,frame);
 // Dark recessed band beneath the cantilever.
 box(94,2.8,32,0,34,0,frame);
 box(110,1.65,42,0,42.375,0,stone);box(110,1.6,42,0,35.75,0,stone);
 box(3.2,5.1,42,-53.4,39,0,stone);box(3.2,5.1,42,53.4,39,0,stone);
 box(91,5.2,32,0,39,0,glass);
 for(let x=-44;x<=44;x+=1.7){box(.44,5.15,.35,x,39,16.4,brick);for(const y of [37.5,39,40.5])box(1.7,.12,.25,x,y,16.5,frame)}
 // Broad stepped entrance, dimensions estimated from frontal photograph.
 for(let i=0;i<16;i++)box(68, .23,1.3,0,1.5+i*.23,45-i*1.3,stone);
 for(let i=0;i<8;i++)box(190,.18,2.1,0,i*.18,65-i*2.1,stone);
 box(190,.15,32,0,-.02,76,stone);
 // Independent sign; icon is an approximate relief, not a photographed texture.
 const badge=new T.Mesh(new T.TorusGeometry(4,.12,10,64),brick);badge.position.set(0,24.2,24.8);g.add(badge);
 const label=document.createElement('canvas');label.width=512;label.height=512;const ctx=label.getContext('2d');ctx.fillStyle='#9a7460';ctx.textAlign='center';ctx.font='bold 70px serif';ctx.fillText('南開',256,250);ctx.font='34px serif';ctx.fillText('1919',256,308);const tex=new T.CanvasTexture(label);const sign=new T.Mesh(new T.PlaneGeometry(7.5,7.5),new T.MeshBasicMaterial({map:tex,transparent:true}));sign.position.set(0,24.2,25);g.add(sign);
 // Side elevation inferred: do not treat window positions here as measured.
 for(const x of [-86.1,86.1])for(let z=-19;z<20;z+=3.8)for(let y=16;y<32;y+=3.1)box(.18,2,1.3,x,y,z,glass);
 g.rotation.y=-.078;g.userData.reference='https://lib.nankai.edu.cn/12074/list.htm';g.userData.interiorSolids=interiorSolids;return g;
}
