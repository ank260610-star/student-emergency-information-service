import test from 'node:test'
import assert from 'node:assert/strict'
import {renderQuality,staticDrawDistance} from '../../public/campus-3d-assets/render-quality.js'
import * as T from '../../public/campus-3d-assets/vendor/three/build/three.module.js'
test('phone and narrow embedded views use reduced resolution and 30fps; desktop stays ultra',()=>{
 for(const input of [{coarse:true,width:1200,pixelRatio:3},{width:390,pixelRatio:3}]){
  const q=renderQuality(input);assert.equal(q.low,true);assert.equal(q.pixelRatio,.65);assert.equal(q.frameInterval,1000/30)
 }
 assert.equal(renderQuality({width:1440,pixelRatio:2}).ultra,true)
 assert.equal(renderQuality({requested:'ultra',width:390,pixelRatio:3}).ultra,true)
})
test('distance hiding preserves deliberately hidden objects and restores nearby meshes',()=>{
 const root=new T.Group(),near=new T.Mesh(new T.BoxGeometry(2,2,2)),far=near.clone(),hidden=near.clone();far.position.x=1000;hidden.visible=false;root.add(near,far,hidden)
 const refresh=staticDrawDistance(root,100);refresh(0,0);assert.equal(near.visible,true);assert.equal(far.visible,false);assert.equal(hidden.visible,false)
 refresh(1000,0);assert.equal(far.visible,true);assert.equal(near.visible,false);assert.equal(hidden.visible,false)
})
