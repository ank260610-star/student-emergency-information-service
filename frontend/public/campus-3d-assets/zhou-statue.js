import * as THREE from './vendor/three/build/three.module.js';
import {GLTFLoader} from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
let asset;
const loadAsset=()=>asset??=new GLTFLoader().loadAsync('./work/zhou-statue-realistic.glb');
// The head is reconstructed separately to preserve brows, eyelids, lips and hair
// at close range. The source is the actual Jinnan bronze statue, not a portrait.
export function createZhouStatue(){
 const g=new THREE.Group();g.name='周恩来总理铜像';g.userData.statueStatus='loading';
 // Original procedural marble veining preserves the photographed inscription.
 const grainCanvas=document.createElement('canvas');grainCanvas.width=256;grainCanvas.height=256;
 const grainCtx=grainCanvas.getContext('2d');grainCtx.fillStyle='#e3e0d8';grainCtx.fillRect(0,0,256,256);
 const grain=grainCtx.createImageData(256,256);for(let i=0;i<grain.data.length;i+=4){const n=214+Math.floor((Math.random()-.5)*24);grain.data[i]=n+5;grain.data[i+1]=n+4;grain.data[i+2]=n;grain.data[i+3]=255;}grainCtx.putImageData(grain,0,0);
 grainCtx.strokeStyle='#8c9398';grainCtx.lineWidth=1.4;grainCtx.globalAlpha=.35;
 for(let k=0;k<11;k++){const start=k*27-55,phase=k*1.73;grainCtx.beginPath();for(let y=0;y<=256;y+=3){const x=start+y*.32+Math.sin(y*.018+phase)*12+Math.sin(y*.057+phase)*3;if(y===0)grainCtx.moveTo(x,y);else grainCtx.lineTo(x,y)}grainCtx.stroke();if(k%3===0){grainCtx.globalAlpha=.18;grainCtx.beginPath();for(let y=90;y<220;y+=3){const x=start+y*.32+Math.sin(y*.018+phase)*12+(y-90)*.3; if(y===90)grainCtx.moveTo(x,y);else grainCtx.lineTo(x,y)}grainCtx.stroke();grainCtx.globalAlpha=.35;}}grainCtx.globalAlpha=1;
 const grainTexture=new THREE.CanvasTexture(grainCanvas);grainTexture.wrapS=grainTexture.wrapT=THREE.RepeatWrapping;grainTexture.repeat.set(1.5,1.5);grainTexture.colorSpace=THREE.SRGBColorSpace;
 const stone=new THREE.MeshStandardMaterial({color:0xffffff,map:grainTexture,roughness:.5});
 const slab=new THREE.Mesh(new THREE.BoxGeometry(18.7,.8,11.2),stone);slab.position.y=.4;g.add(slab);
 const pedestal=new THREE.Mesh(new THREE.BoxGeometry(17.5,12,10.5),stone);pedestal.position.y=6.8;g.add(pedestal);
 const plaqueGeometry=new THREE.PlaneGeometry(12.5,2.05);
 // Preserve the photographed handwritten inscription with a cropped UV region.
 const texture=new THREE.TextureLoader().load('./work/zhou-reference.jpg');texture.colorSpace=THREE.SRGBColorSpace;
 const uv=plaqueGeometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,432/1280+uv.getX(i)*(404/1280),1-1340/1707+uv.getY(i)*(65/1707));
 const plaque=new THREE.Mesh(plaqueGeometry,new THREE.MeshStandardMaterial({map:texture,roughness:.82,metalness:.08}));plaque.position.set(0,7.9,5.27);g.add(plaque);
 g.userData.ready=loadAsset().then(gltf=>{
  const sculpture=gltf.scene.clone(true);sculpture.name='照片重建铜像 · 独立精细面部';
  sculpture.traverse(o=>{if(o.isMesh){if(!o.geometry.attributes.normal)o.geometry.computeVertexNormals();o.material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:!!o.geometry.attributes.color,metalness:.42,roughness:.76});o.castShadow=true;o.receiveShadow=true;}});
  const b=new THREE.Box3().setFromObject(sculpture),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3()),scale=32/size.y;
  sculpture.scale.setScalar(scale);sculpture.position.set(-center.x*scale,12.8-b.min.y*scale,-center.z*scale);g.add(sculpture);g.userData.statueStatus='ready';g.userData.statueMethod='photo-reconstruction-independent-face';return g;
 }).catch(e=>{g.userData.statueStatus='failed';console.error('周恩来铜像加载失败',e);throw e;});
 g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return g;
}
