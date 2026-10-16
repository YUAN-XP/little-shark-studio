import * as THREE from 'three';
import { createSourceOcean } from './about-beach-source-ocean.js';

const noise=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float grain(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float brush(vec2 p){return grain(p*vec2(3.,9.))*.5+grain(p*vec2(13.,27.))*.3+grain(p*55.)*.2;}
`;

// One persistent island and one body per prop. The camera moves around them;
// no close-up substitutes, billboards, old coast rocks, or old water are added.
export function createBeachEnvironment(model,background,oceanData,suppliedBoard,islandModel){
  const group=new THREE.Group();group.name='Beach_Island_Review_V3';
  model.scene.updateMatrixWorld(true);
  const ring=model.scene.getObjectByName('Website_Ring');
  let board=model.scene.getObjectByName('Studio_Surfboard'),retiredBoard=null;
  if(!ring||!board)throw new Error('Beach GLB is missing its persistent interactive bodies.');
  group.attach(ring);group.attach(board);
  if(suppliedBoard){
    const replacement=suppliedBoard.scene.getObjectByName('Studio_Surfboard');
    if(!replacement)throw new Error('The local surfboard export has no persistent body.');
    replacement.position.copy(board.position);replacement.quaternion.copy(board.quaternion);
    board.removeFromParent();retiredBoard=board;group.add(replacement);board=replacement;
  }
  // The supplied S1 water, duplicate board/ring and rocks were removed during
  // export. Its sand is sculpted into a raised island with a submerged perimeter.
  const island=islandModel.scene;group.add(island);
  const terrain=island.getObjectByName('Beach_Terrain');
  if(!terrain?.isMesh)throw new Error('The S1 island export has no sand surface.');
  const time={value:0},materials=new Set();
  group.traverse(object=>{
    if(!object.isMesh)return;
    object.castShadow=object!==terrain;object.receiveShadow=true;
    for(const mat of [object.material].flat())materials.add(mat);
  });
  for(const material of materials){
    material.roughness=Math.max(.91,material.roughness||0);material.metalness=0;
    if(material.map)material.map.anisotropy=8;
    if(material.normalMap)material.normalMap.anisotropy=4;
  }
  const sandMaterials=[terrain.material].flat();
  for(const mat of sandMaterials){
    mat.onBeforeCompile=shader=>{
      shader.uniforms.beachTime=time;
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vBeachWorld;');
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBeachWorld=(modelMatrix*vec4(position,1.)).xyz;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float beachTime;varying vec3 vBeachWorld;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float coast=length(vBeachWorld.xz/vec2(21.,18.));
        float wash=sin(beachTime*.62+vBeachWorld.x*.045)*.016;
        float wet=smoothstep(.76,.98+wash,coast);
        diffuseColor.rgb*=mix(vec3(1.),vec3(.73,.79,.83),wet*.55);
      `);
    };
    mat.customProgramCacheKey=()=> 's1-island-wet-sand-v3';
  }
  // Sand also occludes the sharp foreground pass, keeping both props embedded.
  const contactDepth=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true});
  const occluder=terrain.clone();occluder.material=contactDepth;occluder.layers.set(1);
  occluder.renderOrder=-20;occluder.castShadow=false;occluder.receiveShadow=false;
  occluder.name='Depth_Island_Contact';terrain.parent.add(occluder);
  const focusPoint={value:new THREE.Vector2()},focusAmount={value:0};
  const focused=terrain.clone(),focusMat=terrain.material.clone();
  const compileSand=terrain.material.onBeforeCompile;
  focusMat.transparent=true;focusMat.depthWrite=false;
  focusMat.onBeforeCompile=shader=>{
    compileSand(shader);shader.uniforms.focusPoint=focusPoint;shader.uniforms.focusAmount=focusAmount;
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec2 focusPoint;uniform float focusAmount;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`#include <opaque_fragment>
      gl_FragColor.a*=focusAmount*(1.-smoothstep(.75,2.1,distance(vBeachWorld.xz,focusPoint)));
    `);
  };
  focusMat.customProgramCacheKey=()=> 's1-island-contact-focus-v3';
  focused.name='Focus_Island_Contact';focused.material=focusMat;focused.layers.set(1);
  focused.renderOrder=-19;focused.castShadow=false;focused.visible=false;terrain.parent.add(focused);

  const ocean=createSourceOcean(oceanData,{island:true});
  group.add(ocean.mesh,...ocean.distant,ocean.sun,ocean.sunTarget);
  // These lights illuminate the matte props. The ocean uses the original
  // Blender material response and display transform, independently of them.
  ocean.sun.intensity=2.05;ocean.sun.color.set('#fff2db');ocean.sun.layers.enableAll();
  const fill=new THREE.HemisphereLight('#c0dfed','#ceb390',1.55);fill.layers.enableAll();
  const bounce=new THREE.DirectionalLight('#f4f5df',.35);bounce.position.set(8,7,14);bounce.layers.enableAll();
  group.add(fill,bounce);
  const sky=new THREE.Mesh(new THREE.SphereGeometry(230,48,24),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,toneMapped:false,
    uniforms:{paint:{value:background},zenith:{value:new THREE.Color('#258df1')},horizon:{value:new THREE.Color('#a4dcec')}},
    vertexShader:'varying vec3 vWorld;void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
    fragmentShader:`uniform sampler2D paint;uniform vec3 zenith,horizon;varying vec3 vWorld;${noise}
      void main(){
        vec3 dir=normalize(vWorld);float t=smoothstep(-.012,.40,dir.y);
        vec3 c=mix(horizon,zenith,t);
        vec2 uv=vec2(.06+fract(atan(dir.x,dir.z)*.80)*.88,.65+clamp(dir.y*.70,0.,.33));
        c=mix(c,texture2D(paint,uv).rgb,.68*t);
        c*=.97+brush(vec2(atan(dir.x,dir.z)*5.,dir.y*6.))*.075;
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
      }`,
  }));sky.name='Cloudless_Painted_Sky';group.add(sky);
  // Dispose the old surroundings that were loaded only to recover the retained
  // ring and release-safe board. Retain resources shared with the kept bodies.
  const keptGeometry=new Set(),keptMaterial=new Set(),keptTexture=new Set();
  group.traverse(node=>{
    if(node.geometry)keptGeometry.add(node.geometry);
    for(const mat of [node.material].flat())if(mat){keptMaterial.add(mat);for(const value of Object.values(mat))if(value?.isTexture)keptTexture.add(value);}
  });
  const disposeUnused=node=>{
    if(node.geometry&&!keptGeometry.has(node.geometry))node.geometry.dispose();
    for(const mat of [node.material].flat())if(mat&&!keptMaterial.has(mat)){
      for(const value of Object.values(mat))if(value?.isTexture&&!keptTexture.has(value))value.dispose();
      mat.dispose();
    }
  };
  model.scene.traverse(disposeUnused);retiredBoard?.traverse(disposeUnused);
  return {group,bodies:{website:ring,'studio-name':board},clocks:[time],ocean,
    update(seconds){return ocean.setFrame(1+seconds*oceanData.wave.sourceFps);},
    syncShadow:()=>ocean.syncShadow(),
    dispose:()=>ocean.dispose(),
    setFocus(key,amount){focusPoint.value.set(key==='website'?-3.55:3.55,0);focusAmount.value=amount;focused.visible=Boolean(key);},
  };
}
