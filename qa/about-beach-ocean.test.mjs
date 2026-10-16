import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Matrix4,PerspectiveCamera,Vector3,DataUtils } from 'three';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { decodeWaveCache, decodeBytePlanes } from '../src/ocean-cache-codec.js';
import { getOceanFramePair,packSourceWaves } from '../src/about-beach-source-ocean.js';
import { BEACH_ART,BEACH_OBJECTS,getBeachPose,getBeachLabelLayout } from '../src/about-beach-layout.js';

const meta=JSON.parse(fs.readFileSync(new URL('../public/media/about/ocean-web-v1/source-waves.json',import.meta.url)));
test('the integrated ocean retains the native spatial resolution and full 400-frame timeline',()=>{
  assert.equal(meta.source,'海面.blend');
  assert.deepEqual(meta.sourceFrameRange,[1,400]);assert.equal(meta.sourceFps,24);
  assert.equal(meta.grid,meta.sourceGrid);assert.equal(meta.sourceResolution,15);
  assert.equal(meta.storedFrames,201);assert.equal(meta.foldAtFrame,200);
  assert.ok(meta.sourceFrameChecks.length>=10&&meta.sourceFrameChecks.every(c=>c.maxError<1e-5));
  assert.deepEqual(getOceanFramePair(200),{a:200,b:199,mix:0,sourceFrame:200});
  assert.deepEqual(getOceanFramePair(399.5),{a:1,b:0,mix:.5,sourceFrame:399.5});
  assert.deepEqual(getOceanFramePair(400.5),{a:0,b:1,mix:.5,sourceFrame:400.5});
  assert.deepEqual(getOceanFramePair(401),getOceanFramePair(1));
  assert.equal(new Set(Array.from({length:400},(_,i)=>getOceanFramePair(i+1).a)).size,201);
});
test('the main-page wave file contains the actual varying native displacement and foam',()=>{
  const compressed=gunzipSync(fs.readFileSync(new URL('../public/media/about/ocean-web-v1/source-waves.bin.gz',import.meta.url)));
  const data=Buffer.from(decodeWaveCache(compressed.buffer.slice(compressed.byteOffset,compressed.byteOffset+compressed.byteLength),meta));
  assert.equal(createHash('sha256').update(data).digest('hex'),meta.sourceQuantizedSha256,'lossless decode recovers every original quantized value');
  const stride=meta.grid*meta.grid*4*2;
  assert.equal(data.byteLength,stride*meta.storedFrames);
  assert.notDeepEqual(data.subarray(0,stride),data.subarray(stride*100,stride*101));
  for(const channel of [2,3]){
    let min=65535,max=0;
    for(let i=channel*2;i<data.byteLength;i+=8){const value=data.readUInt16LE(i);min=Math.min(min,value);max=Math.max(max,value);}
    assert.ok((max-min)/65535*meta.range[channel]>.7);
  }
});
test('GPU packing preserves atlas tile edges and rejects incomplete caches',()=>{
  const sampleMeta={grid:3,storedFrames:5,minimum:[0,0,0,0],range:[1,1,1,1]};
  const source=new Uint16Array(3*3*5*4);for(let i=0;i<source.length;i++)source[i]=(i*317)%65536;
  const result=packSourceWaves(sampleMeta,source.buffer);
  assert.deepEqual([result.columns,result.width,result.height],[3,9,6]);
  for(let f=0;f<5;f++)for(let y=0;y<3;y++)for(let x=0;x<3;x++)for(let c=0;c<4;c++){
    const from=((f*3+y)*3+x)*4+c,to=((Math.floor(f/3)*3+y)*9+f%3*3+x)*4+c;
    assert.ok(Math.abs(DataUtils.fromHalfFloat(result.packed[to])-source[from]/65535)<.0005);
  }
  assert.throws(()=>packSourceWaves(sampleMeta,new ArrayBuffer(16)),/不完整/);
  const columns=Math.ceil(Math.sqrt(meta.storedFrames));
  assert.ok(columns*meta.grid<=4096&&Math.ceil(meta.storedFrames/columns)*meta.grid<=4096);
});

for(const [width,height] of [[390,507],[801,440],[1280,720],[1920,850]]){
  test(`permanent labels fit on their respective outer sides at ${width}x${height}`,()=>{
    const pose=getBeachPose(null,0,width,height),camera=new PerspectiveCamera(BEACH_ART.fov,width/height,.1,400);
    camera.position.fromArray(pose.position);camera.lookAt(...pose.target);camera.updateMatrixWorld();
    const bounds={};
    for(const [id,item] of Object.entries(BEACH_OBJECTS)){
      const matrix=new Matrix4().makeRotationY(item.yaw);matrix.setPosition(...item.center);
      const a=id==='website'?[2.62,2.62,.55]:[1.6,3.85,.88];
      const points=[];
      for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
        const p=new Vector3(x*a[0],y*a[1],z*a[2]).applyMatrix4(matrix).project(camera);
        points.push({x:(p.x*.5+.5)*width,y:(.5-p.y*.5)*height});
      }
      const left=Math.min(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y));
      bounds[id]={left,top,width:Math.max(...points.map(p=>p.x))-left,height:Math.max(...points.map(p=>p.y))-top};
    }
    const labels=getBeachLabelLayout(bounds,width,height);
    for(const [id,label] of Object.entries(labels)){
      assert.ok(label.left>=10&&label.left+label.width<=width-10);
      assert.ok(label.top>90&&label.top<height-100);
      const center=bounds[id].left+bounds[id].width*.5;
      assert.ok(id==='website'?label.left+label.width<center:label.left>center,'text stays on the correct side');
      assert.ok(!/NaN|Infinity/.test(label.arrow));
    }
  });
}

test('the material response lookup is byte-identical after storage optimization',()=>{
  const shader=JSON.parse(fs.readFileSync(new URL('../public/media/about/ocean-web-v1/source-shader.json',import.meta.url)));
  const raw=gunzipSync(fs.readFileSync(new URL('../public/media/about/ocean-web-v1/source-brdf.bin.gz',import.meta.url)));
  const decoded=decodeBytePlanes(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
  assert.equal(createHash('sha256').update(new Uint8Array(decoded.buffer)).digest('hex'),shader.brdfSha256);
});
