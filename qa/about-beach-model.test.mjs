import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Matrix4,Vector3,Quaternion } from 'three';
import { BEACH_OBJECTS } from '../src/about-beach-layout.js';

const file=fs.readFileSync(new URL('../public/media/about/about-beach-crafted-v2.glb',import.meta.url));
const length=file.readUInt32LE(12),gltf=JSON.parse(file.subarray(20,20+length).toString()),binary=file.subarray(28+length);
const matrices=new Map();
function walk(i,parent=new Matrix4()){
 const n=gltf.nodes[i],m=n.matrix?new Matrix4().fromArray(n.matrix):new Matrix4().compose(new Vector3().fromArray(n.translation||[0,0,0]),new Quaternion().fromArray(n.rotation||[0,0,0,1]),new Vector3().fromArray(n.scale||[1,1,1]));
 m.premultiply(parent);matrices.set(i,m);for(const child of n.children||[])walk(child,m);
}
for(const i of gltf.scenes[gltf.scene||0].nodes)walk(i);
const find=name=>gltf.nodes.findIndex(n=>n.name===name);
function points(name,localTo=null){
 const i=find(name),node=gltf.nodes[i],primitives=gltf.meshes[node.mesh].primitives,points=[];
 const matrix=matrices.get(i).clone();if(localTo)matrix.premultiply(matrices.get(find(localTo)).clone().invert());
 for(const p of primitives){
  const a=gltf.accessors[p.attributes.POSITION],view=gltf.bufferViews[a.bufferView];
  assert.equal(a.componentType,5126);
  const offset=(view.byteOffset||0)+(a.byteOffset||0),stride=view.byteStride||12;
  for(let j=0;j<a.count;j++){const b=offset+j*stride;points.push(new Vector3(binary.readFloatLE(b),binary.readFloatLE(b+4),binary.readFloatLE(b+8)).applyMatrix4(matrix));}
 }
 return points;
}
test('Blender GLB contains the fixed bodies at the camera contract positions',()=>{
 for(const [id,name] of [['website','Website_Ring'],['studio-name','Studio_Surfboard']]){
  const v=new Vector3().setFromMatrixPosition(matrices.get(find(name)));
  assert.ok(v.distanceTo(new Vector3(...BEACH_OBJECTS[id].center))<1e-5);
 }
});
test('both actual exported models penetrate the sand instead of hovering above it',()=>{
 const sand=points('Beach_Terrain');
 for(const name of ['Ring_InflatedBody','Board_SculptedDeckAndRails']){
  const foot=points(name).reduce((a,b)=>a.y<b.y?a:b);
  const surrounding=sand.filter(p=>Math.hypot(p.x-foot.x,p.z-foot.z)<.55);
  assert.ok(surrounding.length>=2);
  assert.ok(surrounding.reduce((a,p)=>a+p.y,0)/surrounding.length-foot.y>.15,name+' must be visibly buried');
 }
});
test('front and back surfaces retain modeled volume in the exported mesh',()=>{
 const ring=points('Ring_InflatedBody','Website_Ring'),board=points('Board_SculptedDeckAndRails','Studio_Surfboard');
 const depth=pts=>Math.max(...pts.map(p=>p.z))-Math.min(...pts.map(p=>p.z));
 assert.ok(depth(ring)>1.04);assert.ok(depth(board)>.62);
 assert.ok(find('Ring_OuterWeld')>=0&&find('Ring_AirValve')>=0&&find('Board_SingleFin')>=0);
});
test('sculpted sand has relief and all textures remain embedded in the local GLB',()=>{
 const sand=points('Beach_Terrain').filter(p=>p.z>-5&&p.z<12&&Math.abs(p.x)<12);
 assert.ok(Math.max(...sand.map(p=>p.y))-Math.min(...sand.map(p=>p.y))>.35);
 assert.ok(gltf.images.length>0);assert.ok(gltf.images.every(i=>i.bufferView!==undefined&&!i.uri));
 assert.ok(file.byteLength<4_000_000,'keep the lazy-loaded model below 4 MB');
});
