import test from 'node:test'
import assert from 'node:assert/strict'
import * as T from '../../public/campus-3d-assets/vendor/three/build/three.module.js'
import {mergeGeometries} from '../../public/campus-3d-assets/vendor/three/examples/jsm/utils/BufferGeometryUtils.js'
import {alignWheelMetal} from '../../public/campus-3d-assets/wheel-geometry.js'

test('flat metal spokes become coplanar with the upright tyre without moving tyre vertices',()=>{
 const tyre=new T.TorusGeometry(1,.08,8,24).rotateY(Math.PI/2),spoke=new T.BoxGeometry(.9,.04,.03).translate(.4,0,0),source=mergeGeometries([tyre,spoke]),fixed=alignWheelMetal(source)
 assert.equal(fixed.userData.correctedSpokeComponents,1)
 const a=source.attributes.position,b=fixed.attributes.position
 for(let i=0;i<tyre.attributes.position.count;i++)assert.ok(new T.Vector3().fromBufferAttribute(a,i).distanceTo(new T.Vector3().fromBufferAttribute(b,i))<1e-6)
 const spokeBounds=new T.Box3();for(let i=tyre.attributes.position.count;i<b.count;i++)spokeBounds.expandByPoint(new T.Vector3().fromBufferAttribute(b,i))
 const size=spokeBounds.getSize(new T.Vector3());assert.ok(size.x<.05&&size.y>.89)
 assert.equal(alignWheelMetal(source),fixed)
 assert.equal(alignWheelMetal(fixed),fixed)
 assert.notEqual(source,fixed)
 assert.equal(source.userData.correctedSpokeComponents,undefined)
})
