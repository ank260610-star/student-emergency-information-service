import * as THREE from './vendor/three/build/three.module.js';
import {GLTFLoader} from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
let asset;
const loadAsset=()=>asset??=new GLTFLoader().loadAsync('./work/zhou-statue-realistic.glb');
// The head is reconstructed separately to preserve brows, eyelids, lips and hair
// at close range. The source is the actual Jinnan bronze statue, not a portrait.
export function createZhouStatue(){
 const g=new THREE.Group();g.name='周恩来总理铜像';g.userData.statueStatus='loading';
 const stoneCanvas=document.createElement('canvas');stoneCanvas.width=stoneCanvas.height=128;const stoneCtx=stoneCanvas.getContext('2d');stoneCtx.fillStyle='#999c95';stoneCtx.fillRect(0,0,128,128);for(let i=0;i<700;i++){const v=125+Math.random()*38;stoneCtx.fillStyle=`rgba(${v},${v+2},${v-1},${.08+Math.random()*.14})`;stoneCtx.fillRect(Math.random()*128,Math.random()*128,1+Math.random()*3,1+Math.random()*2)}const stoneTexture=new THREE.CanvasTexture(stoneCanvas);stoneTexture.wrapS=stoneTexture.wrapT=THREE.RepeatWrapping;stoneTexture.repeat.set(2,2);stoneTexture.colorSpace=THREE.SRGBColorSpace;
 const stone=new THREE.MeshStandardMaterial({map:stoneTexture,color:0xffffff,roughness:.9,metalness:.02});
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
