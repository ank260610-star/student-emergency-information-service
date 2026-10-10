import * as T from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
export function sculptCar(spec,index){
 const g=new T.Group(); const paint=new T.MeshPhysicalMaterial({color:spec.color,metalness:.72,roughness:.16,clearcoat:1,clearcoatRoughness:.08,iridescence:.08}); const black=new T.MeshStandardMaterial({color:0x090b0e,roughness:.28,metalness:.2}); const glass=new T.MeshPhysicalMaterial({color:0x173340,metalness:.82,roughness:.035,transmission:.12,transparent:true,opacity:.88});
 const w=spec.make==='mercedes'?1.13:index===1?1.0:1.07,l=spec.make==='mercedes'?5.35:spec.make==='ferrari'?4.85:index===1?4.52:index===6?4.87:4.94;
 function mesh(geo,mat,x=0,y=0,z=0){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m}
 function panel(v,mat){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(v.flat(),3));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();const m=mesh(geo,mat);m.material.side=T.DoubleSide;return m}
 // Longitudinal loft: bonnet, front haunches, shoulder line and tapered rear.
 const sections=[[-l/2,.86,.64],[-1.8,w,.79],[-1.35,w,.85],[-.65,.91,.72],[.4,.91,.69],[1.25,w,.74],[1.8,.97,.60],[l/2,.79,.43]];
 const vertices=[],indices=[];for(const [z,width,h] of sections){for(const [x,y] of [[-width*.94,.26],[-width,h*.78],[-width*.78,h],[0,h+.025],[width*.78,h],[width,h*.78],[width*.94,.26]])vertices.push(x,y,z)}
 for(let i=0;i<sections.length-1;i++)for(let j=0;j<6;j++){const a=i*7+j,b=a+7;indices.push(a,b,a+1,a+1,b,b+1)}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();mesh(geo,paint);
 panel([[-.80,.26,l/2],[.80,.26,l/2],[.79,.43,l/2],[-.79,.43,l/2]],paint);
 panel([[-.81,.26,-l/2],[.81,.26,-l/2],[.86,.64,-l/2],[-.86,.64,-l/2]],paint);
 panel([[-.76,.73,.78],[.76,.73,.78],[.64,1.13,-.02],[-.64,1.13,-.02]],glass);
 panel([[-.64,1.13,-.02],[.64,1.13,-.02],[.62,1.13,-.74],[-.62,1.13,-.74]],paint);
 panel([[-.62,1.13,-.74],[.62,1.13,-.74],[.79,.78,-1.48],[-.79,.78,-1.48]],glass);
 for(const s of [-1,1]){panel([[s*.78,.75,.70],[s*.64,1.11,-.05],[s*.62,1.11,-.72],[s*.84,.76,-1.15]],glass);panel([[s*.96,.31,-.40],[s*1.025,.72,-1.20],[s*.97,.78,-1.58],[s*.95,.36,-1.25]],black);
 mesh(new T.BoxGeometry(.09,.10,.28),paint,s*.98,.82,.18);mesh(new T.BoxGeometry(.15,.07,3.1),black,s*.96,.23,0);
 for(const z of [-1.48,1.42]){const wheel=new T.Group();wheel.position.set(s*.99,.35,z);g.add(wheel);const rubber=new T.Mesh(new T.TorusGeometry(.285,.095,16,48),black);rubber.rotation.y=Math.PI/2;wheel.add(rubber);const rimMat=new T.MeshStandardMaterial({color:index===2?0xc5a957:0x9ca4ac,metalness:.97,roughness:.15});const hub=new T.Mesh(new T.CylinderGeometry(.078,.078,.23,20),rimMat);hub.rotation.z=Math.PI/2;wheel.add(hub);const caliper=new T.Mesh(new T.BoxGeometry(.14,.15,.22),new T.MeshStandardMaterial({color:0xd52321,metalness:.35,roughness:.24}));caliper.position.z=.08;wheel.add(caliper);for(let j=0;j<5;j++){const spoke=new T.Mesh(new T.BoxGeometry(.25,.035,.24),rimMat);spoke.rotation.x=j*Math.PI*2/5;wheel.add(spoke)}(g.userData.wheels??=[]).push(wheel);if(z>0)(g.userData.frontWheels??=[]).push(wheel)}
 const frontMat=new T.MeshStandardMaterial({color:0xffffff,emissive:0xe2f5ff,emissiveIntensity:3}); const rearMat=new T.MeshStandardMaterial({color:0xc80015,emissive:0xff0022,emissiveIntensity:.7});(g.userData.brakes??=[]).push(rearMat);
 for(const [z,mat] of [[l/2-.06,frontMat],[-l/2-.015,rearMat]]){for(const angle of [0,.65,-.65]){const bar=mesh(new T.BoxGeometry(.23,.018,.025),mat,s*.59,.52,z);bar.rotation.z=s*angle}}
 mesh(new T.BoxGeometry(.5,.19,.12),black,s*.57,.34,l/2-.025);
 const exhaust=mesh(new T.CylinderGeometry(.075,.075,.16,16),black,s*.16,.43,-l/2-.02);exhaust.rotation.x=Math.PI/2;
 }
 mesh(new T.BoxGeometry(1.86,.055,.3),black,0,.22,l/2-.07);
 for(let i=0;i<6;i++)mesh(new T.BoxGeometry(.03,.14,.42),black,(i-2.5)*.24,.23,-l/2+.1);
 for(let i=0;i<7;i++)mesh(new T.BoxGeometry(1.1,.025,.05),black,0,.83,-1.3-i*.11);
 if(spec.spoiler){mesh(new T.BoxGeometry(1.8,.06,.28),black,0,index===5?1.16:.94,-2);for(const x of [-.55,.55])mesh(new T.BoxGeometry(.045,.28,.09),black,x,.83,-2)}
 if(index===5)mesh(new T.BoxGeometry(.045,.3,1.2),paint,0,.96,-1.5);
 if(spec.make==='ferrari'){
  // SF90 XX-inspired silhouette: deep front vents, central spine, fixed rear wing and quad exhausts.
  for(const x of [-.38,.38]){const vent=mesh(new T.BoxGeometry(.3,.04,.72),black,x,.75,1.35);vent.rotation.x=-.16}
  mesh(new T.BoxGeometry(.12,.07,1.42),black,0,.94,-1.22);mesh(new T.BoxGeometry(1.86,.08,.32),black,0,1.12,-1.95);for(const x of [-.6,.6])mesh(new T.BoxGeometry(.06,.36,.11),black,x,.92,-1.94);
  for(const x of [-.34,.34]){const e=mesh(new T.CylinderGeometry(.095,.095,.19,16),black,x,.43,-l/2-.04);e.rotation.x=Math.PI/2}
 }
 if(spec.make==='mercedes'){
  // Long-wheelbase AMG GT four-door proportions, Panamericana-style grille and quad exhaust.
  panel([[-.78,.27,l/2+.02],[.78,.27,l/2+.02],[.74,.73,l/2+.02],[-.74,.73,l/2+.02]],black);
  for(let x=-.58;x<=.58;x+=.19)mesh(new T.BoxGeometry(.045,.44,.035),new T.MeshStandardMaterial({color:0xb2b4b2,metalness:.85,roughness:.2}),x,.48,l/2+.045);
  mesh(new T.TorusGeometry(.17,.025,8,20),new T.MeshStandardMaterial({color:0xb9bbba,metalness:.9,roughness:.16}),0,.55,l/2+.07).rotation.x=Math.PI/2;
  for(const x of [-.42,-.2,.2,.42]){const e=mesh(new T.CylinderGeometry(.07,.07,.18,12),black,x,.38,-l/2-.04);e.rotation.x=Math.PI/2}
  for(const x of [-.58,.58])mesh(new T.BoxGeometry(.35,.05,1.1),black,x,.64,-.55);
 }
 // metres, matching the campus coordinate system
 g.userData.paint=paint;g.scale.setScalar(2);return g;
}
