export function renderQuality({requested,coarse=false,width=1200,pixelRatio=1}){
 const quality=requested||(coarse||width<=900?'low':'ultra');
 return {quality,low:quality==='low',ultra:quality==='ultra',pixelRatio:quality==='low'?Math.min(pixelRatio,.65):quality==='ultra'?Math.min(pixelRatio*1.35,3):Math.min(pixelRatio,2),frameInterval:quality==='low'?1000/30:0};
}
export function simplifyMaterials(root){
 const seen=new Set();root.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
  if(!m||seen.has(m))continue;seen.add(m);
  for(const field of ['clearcoat','transmission','sheen'])if(field in m)m[field]=0;
  for(const field of ['normalMap','bumpMap','clearcoatNormalMap'])if(field in m)m[field]=null;
  if(m.map)m.map.anisotropy=1;m.needsUpdate=true;
 }});
}
export function staticDrawDistance(root,distance){
 root.updateMatrixWorld(true);const objects=[];
 root.traverse(o=>{if(!o.isMesh)return;for(let p=o;p;p=p.parent)if(!p.visible)return;
  o.geometry.computeBoundingSphere();const sphere=o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld);
  objects.push({mesh:o,x:sphere.center.x,z:sphere.center.z,r:sphere.radius});
 });
 return (x,z)=>{for(const o of objects)o.mesh.visible=Math.hypot(o.x-x,o.z-z)<=distance+o.r;};
}
