import * as THREE from 'three';

export function getOceanFramePair(frame) {
  const value=((frame-1)%400+400)%400+1;
  const a=Math.floor(value),b=a===400?1:a+1;
  const fold=f=>f<=200?f:400-f;
  return {a:fold(a),b:fold(b),mix:value-a,sourceFrame:value};
}

export { packSourceWaves } from './ocean-cache-codec.js';

async function json(url){try{const r=await fetch(url);if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json();}catch(error){throw new Error(`${url}: ${error.message}`,{cause:error});}}
function lookup3D(data,width,height,depth,type){
  const texture=new THREE.Data3DTexture(data,width,height,depth);
  texture.format=THREE.RGBAFormat;texture.type=type;
  texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.unpackAlignment=1;
  texture.needsUpdate=true;return texture;
}
async function displayTexture(url,side){
  const response=await fetch(url),bitmap=await createImageBitmap(await response.blob());
  const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),context=canvas.getContext('2d');
  context.drawImage(bitmap,0,0);bitmap.close();
  const bytes=context.getImageData(0,0,canvas.width,canvas.height).data;
  const values=new Uint8Array(side**3*4);
  // Blender writes PNG rows from the top, while its original pixel array is
  // bottom first. The original array is ordered [blue][green][red].
  for(let b=0;b<side;b++)for(let g=0;g<side;g++)for(let r=0;r<side;r++){
    const source=((side-1-b)*side*side+g*side+r)*4,target=((b*side+g)*side+r)*4;
    values.set(bytes.subarray(source,source+4),target);
  }
  return lookup3D(values,side,side,side,THREE.UnsignedByteType);
}

function prepareOceanCache(base, wave, shader, onProgress, signal) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./ocean-cache-worker.js', import.meta.url), { type: 'module' });
    const cleanup = () => { signal?.removeEventListener('abort', abort); worker.terminate(); };
    const abort = () => { cleanup(); reject(new DOMException('Ocean loading cancelled.', 'AbortError')); };
    worker.onmessage = ({ data }) => {
      if (data.progress) { onProgress(data.progress); return; }
      cleanup();
      if (data.error) reject(new Error(data.error)); else resolve(data);
    };
    worker.onerror = event => { cleanup(); reject(new Error(event.message || '海浪数据无法准备。')); };
    if (signal?.aborted) abort();
    else { signal?.addEventListener('abort', abort, { once: true }); worker.postMessage({ base, wave, shader }); }
  });
}

export async function loadSourceOcean(base, onProgress = () => {}, { signal } = {}) {
  const [wave, shader] = await Promise.all([json(`${base}source-waves.json`), json(`${base}source-shader.json`)]);
  onProgress('读取完整动画与原材质响应数据…');
  const [{ atlas, brdf: brdfValues, noise: noiseValues }, display] = await Promise.all([
    prepareOceanCache(base, wave, shader, onProgress, signal),
    displayTexture(`${base}${shader.displayFile}`, shader.displaySize),
  ]);
  const waveTexture = new THREE.DataTexture(atlas.packed, atlas.width, atlas.height, THREE.RGBAFormat, THREE.HalfFloatType);
  waveTexture.minFilter = waveTexture.magFilter = THREE.LinearFilter; waveTexture.generateMipmaps = false; waveTexture.needsUpdate = true;
  const brdf = lookup3D(brdfValues, ...shader.brdfDimensions, THREE.HalfFloatType); brdf.wrapS = THREE.RepeatWrapping;
  const noise = new THREE.DataTexture(noiseValues, ...shader.noiseDimensions, THREE.RedFormat, THREE.HalfFloatType);
  noise.minFilter = noise.magFilter = THREE.LinearFilter; noise.needsUpdate = true;
  return { wave, shader, atlas, waveTexture, brdf, noise, display };
}

export function createSourceOcean(data,{island=false}={}){
  const {wave,shader,atlas,waveTexture,brdf,noise,display}=data;
  const uniforms={
    waveTexture:{value:waveTexture},brdf:{value:brdf},sourceNoise:{value:noise},display:{value:display},
    grid:{value:wave.grid},columns:{value:atlas.columns},atlasSize:{value:new THREE.Vector2(atlas.width,atlas.height)},
    pair:{value:new THREE.Vector2(1,2)},frameMix:{value:0},spatialSize:{value:wave.sourceSpatialSize},
    brdfDepth:{value:shader.brdfDimensions[2]},displaySize:{value:shader.displaySize},
    sunDirection:{value:new THREE.Vector3().fromArray(shader.sunDirection)},pointPosition:{value:new THREE.Vector3().fromArray(shader.pointPosition)},
    pointEnergy:{value:shader.pointEnergy},sunEnergy:{value:shader.sunEnergy},pointEnabled:{value:1},
    eyeDirection:{value:new THREE.Vector3(0,-43,30).normalize()},
    perspectiveView:{value:Number(island)},islandFit:{value:Number(island)},
    worldToSource:{value:new THREE.Matrix4()},
    sourceShadow:{value:null},sourceShadowMatrix:{value:new THREE.Matrix4()},shadowEnabled:{value:0},
  };
  const material=new THREE.ShaderMaterial({
    glslVersion:THREE.GLSL3,toneMapped:false,uniforms,
    vertexShader:`
      uniform sampler2D waveTexture;
      uniform vec2 atlasSize,pair;
      uniform float grid,columns,frameMix,spatialSize,islandFit;
      out vec3 vWorld,vNormal,vSource;
      out float vFoam;
      vec4 atFrame(vec2 uv,float f){
        vec2 tile=vec2(mod(f,columns),floor(f/columns));
        vec2 sampleUV=islandFit>.5?fract(uv):clamp(uv,0.,1.);
        return texture(waveTexture,(tile*grid+sampleUV*(grid-1.)+.5)/atlasSize);
      }
      vec4 atWave(vec2 uv){return mix(atFrame(uv,pair.x),atFrame(uv,pair.y),frameMix);}
      vec3 sourceSurface(vec2 uv){vec4 w=atWave(uv);return vec3((uv-.5)*spatialSize+w.xy,w.z);}
      vec3 surface(vec2 uv){
        vec3 p=sourceSurface(uv);
        // Only the island's shallow contact zone attenuates the waves. The
        // offshore sea keeps the source displacement and every animation frame.
        float radius=length(p.xy/vec2(21.,18.));
        p.z*=mix(1.,mix(.055,1.,smoothstep(.70,1.30,radius)),islandFit);
        return p;
      }
      vec3 cornerNormal(vec3 p,vec3 next,vec3 diagonal,vec3 previous){
        vec3 a=next-p,b=previous-p;
        float angle=acos(clamp(dot(normalize(a),normalize(b)),-1.,1.));
        return normalize(cross(diagonal-p,previous-next))*angle;
      }
      void main(){
        vec2 uv=(position.xy/spatialSize)+.5;
        vec3 p=surface(uv);float e=1./(grid-1.);
        vec2 lo=islandFit>.5?vec2(-100.):vec2(0.),hi=islandFit>.5?vec2(100.):vec2(1.);
        vec3 east=surface(clamp(uv+vec2(e,0.),lo,hi)),west=surface(clamp(uv-vec2(e,0.),lo,hi));
        vec3 north=surface(clamp(uv+vec2(0.,e),lo,hi)),south=surface(clamp(uv-vec2(0.,e),lo,hi));
        vec3 n=vec3(0.);
        // Blender weights each adjacent quad normal by its corner angle.
        // A simple height gradient is visibly different on steep wave crests.
        if(islandFit>.5||(uv.x<1.-e*.5&&uv.y<1.-e*.5))n+=cornerNormal(p,east,surface(uv+vec2(e,e)),north);
        if(islandFit>.5||(uv.x>e*.5&&uv.y<1.-e*.5))n+=cornerNormal(p,north,surface(uv+vec2(-e,e)),west);
        if(islandFit>.5||(uv.x>e*.5&&uv.y>e*.5))n+=cornerNormal(p,west,surface(uv+vec2(-e,-e)),south);
        if(islandFit>.5||(uv.x<1.-e*.5&&uv.y>e*.5))n+=cornerNormal(p,south,surface(uv+vec2(e,-e)),east);
        vNormal=normalize(n);
        vFoam=atWave(uv).w;vSource=sourceSurface(uv);
        vec4 world=modelMatrix*vec4(p,1.);vWorld=world.xyz;
        gl_Position=projectionMatrix*viewMatrix*world;
      }
    `,
    fragmentShader:`
      precision highp sampler3D;
      uniform sampler3D brdf,display;
      uniform sampler2D sourceNoise;
      uniform sampler2D sourceShadow;
      uniform mat4 sourceShadowMatrix,worldToSource;
      uniform vec3 sunDirection,pointPosition,eyeDirection;
      uniform float brdfDepth,displaySize,pointEnergy,sunEnergy,pointEnabled,shadowEnabled,perspectiveView;
      in vec3 vWorld,vNormal,vSource;
      in float vFoam;
      out vec4 result;
      const float PI=3.141592653589793;
      #include <packing>
      float sunVisibility(){
        if(shadowEnabled<.5)return 1.;
        vec4 projected=sourceShadowMatrix*vec4(vWorld,1.);
        vec3 p=projected.xyz/projected.w;
        if(p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z<0.||p.z>1.)return 1.;
        float visible=0.;
        for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
          float depth=unpackRGBAToDepth(textureLod(sourceShadow,p.xy+vec2(float(x),float(y))/2048.,0.));
          visible+=step(p.z-.000035,depth);
        }
        return visible/9.;
      }
      vec3 response(vec3 n,vec3 v,vec3 l){
        float lv=clamp(dot(l,v),-1.,1.);
        vec3 tangent=l-v*lv;
        if(length(tangent)<.00001)tangent=abs(v.z)<.9?cross(vec3(0.,0.,1.),v):cross(vec3(0.,1.,0.),v);
        tangent=normalize(tangent);vec3 bitangent=normalize(cross(v,tangent));
        float phi=fract(atan(dot(n,bitangent),dot(n,tangent))/(2.*PI)+1.);
        float theta=acos(clamp(dot(n,v),0.,1.))/(PI*.5);
        float gamma=acos(lv)/PI;
        return texture(brdf,vec3(phi,theta,(gamma*(brdfDepth-1.)+.5)/brdfDepth)).rgb;
      }
      void main(){
        vec3 eye=(worldToSource*vec4(cameraPosition,1.)).xyz;
        vec3 n=normalize(vNormal),v=normalize(mix(eyeDirection,eye-vSource,perspectiveView));
        vec3 lit=response(n,v,normalize(sunDirection))*sunVisibility();
        vec3 toPoint=pointPosition-vSource;
        float distance2=max(dot(toPoint,toPoint),.01);
        lit+=pointEnabled*response(n,v,normalize(toPoint))*pointEnergy/(4.*PI*distance2*sunEnergy);
        // These are the source's actual Color Ramp thresholds and colors.
        float base=step(1.5999998,vSource.z);
        float primary=mix(lit.r,lit.g,base);
        vec3 ocean=mix(vec3(.0395713188,.362882913,1.),vec3(1.,.861223102,.20739235),step(.777202666,primary));
        float secondary=mix(lit.r,lit.g,.8);
        vec3 foam=mix(vec3(.764102399,.564305305,1.),vec3(.388783127,.954993367,1.),step(.272020698,secondary));
        vec3 c=mix(ocean,foam,step(.142487079,vFoam));
        // The original plane keeps its original 2 x 2 texspace even after
        // Ocean generates a 50 m patch: Generated is .5 + Object / 2.
        vec3 generated=vSource*.5+.5;
        float gradient=clamp(1.-abs((generated.x*.22+.36)*2.-1.),0.,1.);
        vec2 noiseUV=vec2(fract((generated.y+15.)/30.),clamp((generated.z+3.)/6.5,0.,1.));
        float breakup=1.-step(.424870044,texture(sourceNoise,noiseUV).r);
        float sunset=step(.87823844,lit.b)*gradient*breakup;
        c=mix(c,vec3(1.,.240723878,0.),sunset);
        // The LUT contains the source scene's display transform, so there is
        // no additional website tone mapping or color grading over this water.
        vec3 shown=texture(display,(clamp(c,0.,1.)*(displaySize-1.)+.5)/displaySize).rgb;
        result=vec4(shown,1.);
      }
    `,
  });
  uniforms.pointPosition.value.sub(new THREE.Vector3().fromArray(wave.sourceLocation));
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(island?100:wave.sourceSpatialSize,island?100:wave.sourceSpatialSize,island?450:wave.grid-1,island?450:wave.grid-1),material);
  if(island){mesh.rotation.x=-Math.PI/2;mesh.position.y=-1.65;}
  else mesh.position.fromArray(wave.sourceLocation);
  mesh.name='Ocean_Original_400_Frames';mesh.frustumCulled=false;
  mesh.updateMatrixWorld(true);uniforms.worldToSource.value.copy(mesh.matrixWorld).invert();
  mesh.castShadow=true;
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  const displacement=material.vertexShader.slice(0,material.vertexShader.indexOf('void main()'));
  depth.onBeforeCompile=shader=>{
    for(const name of ['waveTexture','atlasSize','pair','grid','columns','frameMix','spatialSize','islandFit'])shader.uniforms[name]=uniforms[name];
    shader.vertexShader=displacement+'\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed=surface(position.xy/spatialSize+.5);');
  };
  mesh.customDepthMaterial=depth;
  const sun=new THREE.DirectionalLight(0xffffff,1);
  const center=mesh.position.clone();
  const worldSun=uniforms.sunDirection.value.clone().applyQuaternion(mesh.quaternion);
  sun.position.copy(center).addScaledVector(worldSun,100);
  sun.target.position.copy(center);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-38,right:38,bottom:-38,top:38,near:.1,far:210});
  const distant=[];
  if(island)for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++){
    if(!x&&!y)continue;
    const geometry=new THREE.PlaneGeometry(100,100,64,64);geometry.translate(x*100,y*100,0);
    const tile=new THREE.Mesh(geometry,material);tile.position.copy(mesh.position);tile.quaternion.copy(mesh.quaternion);
    tile.name=`Ocean_Offshore_${x}_${y}`;tile.frustumCulled=false;distant.push(tile);
  }
  return {mesh,distant,setFrame(frame){const f=getOceanFramePair(frame);uniforms.pair.value.set(f.a,f.b);uniforms.frameMix.value=f.mix;return f;},
    sun,sunTarget:sun.target,
    syncShadow(){
      if(!sun.shadow.map)return false;
      uniforms.sourceShadow.value=sun.shadow.map.texture;uniforms.sourceShadowMatrix.value.copy(sun.shadow.matrix);uniforms.shadowEnabled.value=1;
      return true;
    },
    setPointEnabled(enabled){uniforms.pointEnabled.value=Number(enabled);},
    setViewDirection(value){uniforms.eyeDirection.value.copy(value).normalize();},
    dispose(){mesh.geometry.dispose();distant.forEach(tile=>tile.geometry.dispose());material.dispose();depth.dispose();sun.shadow.dispose();for(const texture of [waveTexture,brdf,noise,display])texture.dispose();}};
}
