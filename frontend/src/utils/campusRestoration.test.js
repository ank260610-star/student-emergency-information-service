import test from 'node:test'
import assert from 'node:assert/strict'
import * as T from '../../public/campus-3d-assets/vendor/three/build/three.module.js'
import { isWorldVisible, wheelRollDirection, orientedBoxHit } from '../../public/campus-3d-assets/scene-rules.js'
import { createAthleticsTrack, createSiyuanRoof } from '../../public/campus-3d-assets/restored-landmarks.js'
import { optimizePhotoDetails } from '../../public/campus-3d-assets/campus-photo-details.js'

test('hidden ancestor facilities stay hidden after batching and create no air walls', () => {
  const root = new T.Group(), hidden = new T.Group(), material = new T.MeshStandardMaterial()
  root.add(hidden)
  hidden.visible = false
  for (let i = 0; i < 3; i++) {
    const mesh = new T.Mesh(new T.BoxGeometry(2, 3, 2), material)
    mesh.position.x = i * 4
    mesh.userData.photoSolid = true
    hidden.add(mesh)
  }
  const visible = new T.Mesh(new T.BoxGeometry(2, 3, 2), material)
  visible.userData.photoSolid = true
  visible.position.x = 30
  root.add(visible)
  assert.equal(isWorldVisible(hidden.children[0]), false)
  optimizePhotoDetails(root)
  assert.equal(root.userData.photoColliders.length, 1)
  assert.equal(root.userData.photoColliders[0].x, 30)
  assert.equal(hidden.children.length, 3)
  assert.equal(root.children.filter(o => o.userData.photoBatch).length, 0)
})

test('both athletics tracks include eight lanes, field markings and upright goals', () => {
  for (const name of ['西区田径场', '文科田径场']) {
    const track = createAthleticsTrack(name)
    assert.equal(track.children.filter(o => o.name.startsWith('跑道线')).length, 9)
    assert.equal(track.children.filter(o => o.name === '球门与网').length, 2)
    const size = new T.Box3().setFromObject(track).getSize(new T.Vector3())
    assert.ok(size.x > 150 && size.z > 80 && size.y > 2)
  }
})

test('Siyuan roof has low pitched wings and raised central dome', () => {
  const roof = createSiyuanRoof([new T.Vector3(-30, 0, -20), new T.Vector3(30, 0, 20)], 17)
  assert.equal(roof.position.y, 17)
  assert.ok(roof.getObjectByName('中央红色半球穹顶'))
  assert.ok(roof.children.some(o => Math.abs(o.rotation.x) > 0))
  assert.ok(new T.Box3().setFromObject(roof).max.y > 23)
})

test('wheel direction follows authored axle orientation, including reversed hubs', () => {
  assert.equal(wheelRollDirection({x:1,z:0},{x:0,z:1}), 1)
  assert.equal(wheelRollDirection({x:-1,z:0},{x:0,z:1}), -1)
  assert.equal(wheelRollDirection({x:0,z:-1},{x:1,z:0}), 1)
})

test('rotated fixtures collide with visible walls rather than empty AABB corners', () => {
  const collider={x:0,z:0,box:{halfX:5,halfZ:.5,yaw:Math.PI/4}}
  assert.equal(orientedBoxHit(3,-3,collider,.2),true)
  assert.equal(orientedBoxHit(3,3,collider,.2),false)
  assert.equal(orientedBoxHit(8,0,collider,.2),false)
})
