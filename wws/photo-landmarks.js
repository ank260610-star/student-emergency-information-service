import * as T from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

function brick(){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#9a5540';x.fillRect(0,0,256,256);for(let y=0;y<32;y++)for(let col=-1;col<18;col++){const shade=118+(col*17+y*11)%28;x.fillStyle=`rgb(${shade+35},${Math.max(55,shade-4)},${Math.max(40,shade-18)})`;x.fillRect(col*18+(y%2)*9,y*8,17,7)}const map=new T.CanvasTexture(c);map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(7,5);map.colorSpace=T.SRGBColorSpace;return new T.MeshStandardMaterial({map,roughness:.91})}
const stone=new T.MeshStandardMaterial({color:0xbab8ae,roughness:.86}),glass=new T.MeshStandardMaterial({color:0x31515b,metalness:.42,roughness:.2}),metal=new T.MeshStandardMaterial({color:0x303739,roughness:.43,metalness:.5});
function sign(text,w,h,color=0xf5eee0){const c=document.createElement('canvas'),x=c.getContext('2d');c.width=1024;c.height=256;x.clearRect(0,0,1024,256);x.font='700 108px Noto Sans SC, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#'+color.toString(16).padStart(6,'0');x.shadowColor='#101315';x.shadowBlur=7;x.fillText(text,512,127);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false}))}
function center(points){const p=points.reduce((a,b)=>a.add(b),new T.Vector3());return p.multiplyScalar(1/points.length)}
function bounds(points){let loX=Infinity,hiX=-Infinity,loZ=Infinity,hiZ=-Infinity;for(const p of points){loX=Math.min(loX,p.x);hiX=Math.max(hiX,p.x);loZ=Math.min(loZ,p.z);hiZ=Math.max(hiZ,p.z)}return {w:Math.max(30,hiX-loX),d:Math.max(25,hiZ-loZ)}}
function add(g,o){o.castShadow=o.receiveShadow=true;g.add(o);return o}
function box(g,w,h,d,x,y,z,m){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);return add(g,o)}

export function hospitalModel(points){
 const g=new T.Group();g.name='南开大学医院 · 用户实拍参考模型';const {w,d}=bounds(points),b=brick();
 box(g,w,10,d,0,5,0,b); // low red-brick outpatient mass
 box(g,w*.62,3,d*.58,-w*.17,11.4,d*.04,b); // central raised outpatient volume
 // Deep beige emergency porch, glass entrance, broad stone steps and rails.
 box(g,w*.42,5.6,7,0,3.2,d/2+2.3,stone);box(g,w*.34,3.8,.26,0,3.1,d/2+5.9,glass);
 for(const x of [-w*.16,-w*.08,0,w*.08,w*.16])box(g,.16,4,.25,x,3.4,d/2+6.08,metal);
 for(let i=0;i<4;i++)box(g,w*.36,.26,1.4,0,.22+i*.2,d/2+8.4-i*1.4,stone);
 const out=sign('门 诊  ✚  Out-patient',w*.47,1.6,0xeb8b83);out.position.set(0,7.3,d/2+6.2);g.add(out);
 const name=sign('南开大学医院',w*.32,1.25);name.position.set(w*.22,7.0,d/2+.2);g.add(name);
 const emergency=sign('急 诊  ✚  Emergency',w*.34,1.35,0xeb8b83);emergency.position.set(-w*.26,11.4,d/2+.22);g.add(emergency);
 for(const x of [-w*.45,w*.45]){const cross=sign('✚',1.8,1.8,0xf5e5d2);cross.position.set(x,7.8,d/2+.24);g.add(cross)}
 g.position.copy(center(points));return g;
}

export function cultureModel(points){
 const g=new T.Group();g.name='汉语言文化学院 · 用户实拍参考模型';const {w,d}=bounds(points),b=brick();
 box(g,w,4,d,0,2,0,b); // red-brick plinth and glazed ground level
 const lowerGlass=new T.Mesh(new T.BoxGeometry(w*.88,4,.36),glass);lowerGlass.position.set(0,2.2,d/2+.18);add(g,lowerGlass);
 // Photo shows a large grooved brick tower to the right, a horizontal glazed teaching block and stepped brick wing.
 box(g,w*.3,23,d*.7,w*.31,13,d*.03,b);box(g,w*.42,14,d*.62,-w*.08,9,d*.03,glass);box(g,w*.25,15,d*.68,-w*.35,9,d*.02,b);
 for(let y=6;y<21;y+=2.2){box(g,w*.29,.32,d*.72,w*.31,y,d*.39,stone)}
 for(let x=-w*.28;x<w*.12;x+=w*.075)for(let y=6;y<20;y+=2.6)box(g,w*.045,.12,.25,x,y,d*.39,metal);
 for(const x of [-w*.41,-w*.32])for(let y=6;y<18;y+=3.2)box(g,w*.05,1.7,.23,x,y,d*.37,glass);
 const title=sign('国际教育学院     汉语言文化学院',w*.78,1.35);title.position.set(0,6.5,d/2+.32);g.add(title);
 const subtitle=sign('SCHOOL OF INTERNATIONAL EDUCATION     COLLEGE OF CHINESE LANGUAGE AND CULTURE',w*.78,.53,0xf4eadb);subtitle.position.set(0,5.48,d/2+.34);g.add(subtitle);
 for(let i=0;i<4;i++)box(g,w*.7,.19,1.2,0,.2+i*.18,d/2+6.3-i*1.2,stone);
 g.position.copy(center(points));return g;
}
