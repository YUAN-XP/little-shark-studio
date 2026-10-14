import test from 'node:test';
import assert from 'node:assert/strict';
import { BEACH_ART, BEACH_OBJECTS, easeCamera, getBeachPose } from '../src/about-beach-layout.js';

test('the two fixed objects face opposite sides in the confirmed ground plan', () => {
  assert.ok(-Math.sin(BEACH_OBJECTS.website.yaw)>0, 'ring right edge is closer');
  assert.ok(-Math.sin(BEACH_OBJECTS['studio-name'].yaw)<0, 'board left edge is closer');
});
for (const [width,height] of [[1280,720],[1920,850],[390,530],[760,440]]) {
  for (const key of Object.keys(BEACH_OBJECTS)) {
    test(`${key} camera is perpendicular at ${width}x${height} and returns exactly home`, () => {
      const home=getBeachPose(null,0,width,height);
      assert.deepEqual(getBeachPose(key,0,width,height),home);
      const end=getBeachPose(key,1,width,height);
      const offset=end.position.map((value,index)=>value-end.target[index]);
      const length=Math.hypot(...offset);
      const normal=[Math.sin(BEACH_OBJECTS[key].yaw),0,Math.cos(BEACH_OBJECTS[key].yaw)];
      assert.ok(Math.abs(offset.reduce((sum,value,index)=>sum+value*normal[index],0)/length-1)<1e-10);
      const middle=getBeachPose(key,.5,width,height);
      assert.equal(Math.sign(middle.angle),key==='website'?-1:1);
      assert.ok(Math.hypot(...middle.position.map((v,i)=>v-middle.target[i]))>length);
      const source=JSON.stringify(BEACH_OBJECTS);
      for(let step=0;step<=100;step++)getBeachPose(key,easeCamera(step/100),width,height);
      assert.equal(JSON.stringify(BEACH_OBJECTS),source,'camera paths do not mutate objects');
    });
  }
}
test('camera easing starts and finishes at rest',()=>{
  assert.equal(easeCamera(0),0);assert.equal(easeCamera(1),1);
  assert.ok(easeCamera(.001)<1e-7);assert.ok(1-easeCamera(.999)<1e-7);
});

for(const [width,height] of [[801,440],[1280,720],[1920,850],[390,480]]){
  test(`the whole ring remains inside the frame at ${width}x${height}`,()=>{
    const pose=getBeachPose('website',1,width,height);
    const distance=Math.hypot(...pose.position.map((value,index)=>value-pose.target[index]));
    const ring=BEACH_OBJECTS.website;
    const tube=ring.halfDepth;
    // Use the nearest possible surface as a conservative perspective bound.
    const diameter=2*ring.outerRadius*height/(2*Math.tan(BEACH_ART.fov*Math.PI/360)*(distance-tube));
    assert.ok(diameter<height*.94,'top and bottom must have breathing room');
    assert.ok(diameter<width*.90,'both sides must remain visible');
  });
}
