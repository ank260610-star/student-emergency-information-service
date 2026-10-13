import test from 'node:test'
import assert from 'node:assert/strict'
import {aircraftPathBlocked} from '../../public/campus-3d-assets/aircraft-collision.js'
import {createAthleticsTrack} from '../../public/campus-3d-assets/restored-landmarks.js'
import * as T from '../../public/campus-3d-assets/vendor/three/build/three.module.js'
const bounds={min:{x:-4,y:-2,z:-6},max:{x:4,y:3,z:6}}
const pose=(x,z,y=5,heading=0)=>({x,z,y,heading})
const building=(x,z,w,d,height=20)=>({height,points:[{x,z},{x:x+w,z},{x:x+w,z:z+d},{x,z:z+d}]})
const hit=(from,to,buildings,fixtures=[])=>aircraftPathBlocked(from,to,{bounds,buildings,fixtures})
test('north track long axis runs north/south; west track retains its orientation',()=>{
 const north=createAthleticsTrack('文科田径场',{northSouth:true}),west=createAthleticsTrack('西区田径场')
 const a=new T.Box3().setFromObject(north).getSize(new T.Vector3()),b=new T.Box3().setFromObject(west).getSize(new T.Vector3())
 assert.ok(a.z>a.x*1.5);assert.ok(b.x>b.z*1.5)
})
test('aircraft catches wing and nose contact before the centre enters a wall',()=>{
 assert.equal(hit(pose(0,0),pose(0,1),[building(3,-1,2,4)]),true)
 assert.equal(hit(pose(0,0),pose(0,1),[building(-1,6,2,2)]),true)
})
test('sweep catches a thin wall between safe endpoints and descent through a roof',()=>{
 assert.equal(hit(pose(0,-12),pose(0,12),[building(-8,0,16,.1)]),true)
 assert.equal(hit(pose(0,0,30),pose(0,0,5),[building(-2,-2,4,4)]),true)
 assert.equal(hit(pose(0,-12,30),pose(0,12,30),[building(-8,0,16,.1)]),false)
})
test('rotation checks swept wings; courtyard and high flight remain clear',()=>{
 assert.equal(hit(pose(0,0,5,0),pose(0,0,5,Math.PI/2),[building(6,-1,1,2)]),true)
 const b=building(-30,-30,60,60);b.courtyard={x:0,z:0,width:40,depth:40,yaw:0}
 assert.equal(hit(pose(0,0),pose(0,1),[b]),false)
 assert.equal(hit(pose(0,0,30),pose(0,1,30),[],[{x:3,z:0,r:1,maxY:8}]),false)
 assert.equal(hit(pose(0,0),pose(0,1),[],[{x:3,z:0,r:1,maxY:8}]),true)
})
