import * as T from './vendor/three/build/three.module.js';

// The CC0 mesh combines an upright tyre with a hub/spokes assembly authored
// flat on XZ. The normalized tyre spans two units in both Y and Z. Correct the disconnected inner components, keeping the tyre intact.
const corrected=new WeakMap();
export function alignWheelMetal(source){
 if(source.userData.correctedSpokeComponents!==undefined)return source;
 if(corrected.has(source))return corrected.get(source);
 const geometry=source.clone(),positions=source.attributes.position,n=positions.count,parent=Array.from({length:n},(_,i)=>i),samePosition=new Map();
 geometry.userData={...source.userData};
 const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i]}return i};
 const join=(a,b)=>{a=root(a);b=root(b);if(a!==b)parent[b]=a};
 for(let i=0;i<n;i++){const key=`${positions.getX(i)},${positions.getY(i)},${positions.getZ(i)}`;if(samePosition.has(key))join(i,samePosition.get(key));else samePosition.set(key,i)}
 const index=source.index,at=i=>index?index.getX(i):i,count=index?index.count:n;
 for(let i=0;i<count;i+=3){join(at(i),at(i+1));join(at(i),at(i+2))}
 const components=new Map();for(let i=0;i<n;i++){const key=root(i);if(!components.has(key))components.set(key,{vertices:[],box:new T.Box3()});const c=components.get(key);c.vertices.push(i);c.box.expandByPoint(new T.Vector3().fromBufferAttribute(positions,i))}
 const data=new Float32Array(n*3);let fixed=0;
 for(const c of components.values()){const size=c.box.getSize(new T.Vector3()),inner=!(size.y>1.5&&size.z>1.5);if(inner)fixed++;
  for(const i of c.vertices){const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);data.set(inner?[-y,x,z]:[x,y,z],i*3)}
 }
 geometry.setAttribute('position',new T.BufferAttribute(data,3));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();if(geometry.attributes.tangent&&geometry.index&&geometry.attributes.uv)geometry.computeTangents();geometry.userData.correctedSpokeComponents=fixed;
 corrected.set(source,geometry);return geometry;
}
