import * as THREE from 'three';

const noise = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float grain(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float brush(vec2 p){return grain(p*vec2(3.,9.))*.50+grain(p*vec2(13.,27.))*.30+grain(p*55.)*.20;}
`;
const vertex = `varying vec3 vWorld;void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`;
const output = `
#include <tonemapping_fragment>
#include <colorspace_fragment>`;
const color = value => new THREE.Color(value);

// The detailed static surfaces are edited in Blender. The ocean and atmosphere
// stay shader-driven so their motion remains continuous throughout an orbit.
export function createBeachEnvironment(model, background) {
  const group = model.scene;
  const time = { value: 0 };
  const ring = group.getObjectByName('Website_Ring');
  const board = group.getObjectByName('Studio_Surfboard');
  if (!ring || !board) throw new Error('Beach GLB is missing its two persistent interactive models.');
  const terrain = group.getObjectByName('Beach_Terrain');
  const pigmentMap = terrain.material.map;
  pigmentMap.wrapS = pigmentMap.wrapT = THREE.RepeatWrapping;
  pigmentMap.anisotropy = 8;
  const materials = new Set();
  group.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = !object.name.startsWith('Beach_');
    object.receiveShadow = true;
    for (const material of [object.material].flat()) materials.add(material);
  });
  for (const material of materials) {
    material.roughness = .97;
    material.metalness = 0;
    if (material.map) {
      material.bumpMap = material.map;
      material.bumpScale = .038;
      material.emissiveMap=material.map;material.emissive.set('#fff0da');material.emissiveIntensity=.15;
    }
    const terrainMaterial = material === terrain.material;
    material.onBeforeCompile = shader => {
      shader.uniforms.pigmentMap = { value: pigmentMap };
      shader.uniforms.beachTime = time;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vPaintUV;varying vec3 vBeachWorld;');
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaintUV=uv;vBeachWorld=(modelMatrix*vec4(position,1.)).xyz;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D pigmentMap;uniform float beachTime;varying vec2 vPaintUV;varying vec3 vBeachWorld;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        ${terrainMaterial ? `
          float shore=-12.+sin(vBeachWorld.x*.065)*1.2+sin(vBeachWorld.x*.31)*.24;
          float wash=sin(beachTime*.58+vBeachWorld.x*.018)*.60;
          float damp=1.-smoothstep(shore+.5+wash,shore+4.,vBeachWorld.z);
          diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.70,.79,.87),damp*.55);
        ` : `
          vec3 strokes=texture2D(pigmentMap,vPaintUV*.82).rgb;
          float ink=dot(strokes,vec3(.24,.60,.16));
          diffuseColor.rgb*=.82+ink*.36;
        `}
      `);
    };
    material.customProgramCacheKey = () => terrainMaterial ? 'beach-wet-sand-v2' : 'beach-matte-paint-v2';
  }
  // The sharp foreground pass still respects sand depth. Without these depth-only
  // surfaces, a selected prop would incorrectly draw its buried bottom over sand.
  const contactDepth=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true});
  const contactSurfaces=[];
  const focusPoint={value:new THREE.Vector2()},focusAmount={value:0};
  const focusedSand=[];
  group.traverse(object=>{if(object.isMesh&&object.name.startsWith('Beach_'))contactSurfaces.push(object);});
  for(const object of contactSurfaces){
    const occluder=object.clone();occluder.name=`Depth_${object.name}`;
    occluder.material=contactDepth;occluder.layers.set(1);occluder.renderOrder=-20;
    occluder.castShadow=false;occluder.receiveShadow=false;object.parent.add(occluder);
    // Keep the nearby sand in the same focal plane as the prop. Otherwise a
    // sharp, buried lower edge against entirely blurred sand still looks detached.
    const surface=object.clone(),mat=object.material.clone();
    const baseCompile=object.material.onBeforeCompile;
    mat.transparent=true;mat.depthWrite=false;
    mat.onBeforeCompile=shader=>{
      baseCompile(shader);
      shader.uniforms.focusPoint=focusPoint;shader.uniforms.focusAmount=focusAmount;
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec2 focusPoint;uniform float focusAmount;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`#include <opaque_fragment>
        gl_FragColor.a*=focusAmount*(1.-smoothstep(.75,2.1,distance(vBeachWorld.xz,focusPoint)));
      `);
    };
    mat.customProgramCacheKey=()=>`beach-contact-focus-${object.name}`;
    surface.name=`Focus_${object.name}`;surface.material=mat;surface.layers.set(1);
    surface.renderOrder=-19;surface.castShadow=false;surface.receiveShadow=false;
    surface.visible=false;focusedSand.push(surface);object.parent.add(surface);
  }

  const sun = new THREE.DirectionalLight('#fff2d5', 2.35);
  sun.position.set(-8,12,7); sun.target.position.set(0,1,0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.5,far:40});
  sun.shadow.bias=-.00025;sun.shadow.normalBias=.035;sun.shadow.radius=3;
  sun.layers.enableAll();sun.target.layers.enableAll();
  const fill = new THREE.HemisphereLight('#b7d7ec','#dbb196',1.85);
  fill.layers.enableAll();group.add(sun,sun.target,fill);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(230,64,32),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,toneMapped:false,
    uniforms:{paint:{value:background},zenith:{value:color('#258df1')},horizon:{value:color('#a4dcec')}},
    vertexShader:vertex,fragmentShader:`
      uniform sampler2D paint;uniform vec3 zenith,horizon;varying vec3 vWorld;${noise}
      void main(){
        vec3 dir=normalize(vWorld);float t=smoothstep(-.012,.40,dir.y);
        vec3 c=mix(horizon,zenith,t);
        vec2 uv=vec2(.06+fract(atan(dir.x,dir.z)*.80)*.88,.65+clamp(dir.y*.70,0.,.33));
        vec3 hand=texture2D(paint,uv).rgb;
        c=mix(c,hand,.68*t);c*=.97+brush(vec2(atan(dir.x,dir.z)*5.,dir.y*6.))*.075;
        gl_FragColor=vec4(c,1.);${output}
      }`,
  }));group.add(sky);

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(440,430,160,200),new THREE.ShaderMaterial({
    toneMapped:false,
    uniforms:{time,deep:{value:color('#1379b2')},turquoise:{value:color('#42c4cd')},foam:{value:color('#fff7dd')},paint:{value:pigmentMap}},
    vertexShader:`
      uniform float time;varying vec3 vWorld;varying float vCrest;
      void main(){
        vec4 p=modelMatrix*vec4(position,1.);
        float edge=-12.+sin(p.x*.065)*1.2+sin(p.x*.31)*.24;
        float d=max(0.,edge-p.z);
        float w=sin(p.z*1.08+sin(p.x*.52)*1.1+sin(p.x*1.4)*.35+time*.72);
        float crest=pow(max(0.,w),4.);
        p.y+=crest*.24*(1.-exp(-d*.6))+sin(p.z*.73+p.x*.18+time*.61)*.060;
        vCrest=crest;vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;
      }`,
    fragmentShader:`
      uniform float time;uniform vec3 deep,turquoise,foam;uniform sampler2D paint;
      varying vec3 vWorld;varying float vCrest;${noise}
      void main(){
        vec2 p=vWorld.xz;
        float edge=-12.+sin(p.x*.065)*1.2+sin(p.x*.31)*.24+sin(time*.58+p.x*.018)*.60;
        float d=edge-p.y;
        if(d<0.)discard;
        float wave=sin(p.y*1.08+sin(p.x*.52)*1.1+grain(p*vec2(.9,.55))*2.+time*.72);
        float pigment=brush(p*vec2(.75,1.4));
        vec3 c=mix(turquoise,deep,smoothstep(2.,48.,d));
        c=mix(c,c*vec3(.73,.88,.96),smoothstep(-.35,.85,-wave)*.28);
        c*=.85+pigment*.27;
        float crest=smoothstep(.46,.87,wave+grain(p*vec2(1.8,3.6))*.30);
        float broken=smoothstep(.42,.72,grain(p*vec2(1.5,4.4)));
        float lace=1.-smoothstep(.06,.9+grain(p*2.)*.8,d+grain(p*vec2(4.,1.))*1.4);
        float foamAmount=max(lace*(.62+pigment*.38),crest*broken*exp(-d*.035));
        float sparks=smoothstep(.79,.95,grain(p*vec2(9.,20.)))*smoothstep(.10,.75,wave)*.38;
        c=mix(c,foam,clamp(foamAmount+sparks*exp(-d*.018),0.,.97));
        float mist=1.-exp(-max(0.,distance(cameraPosition,vWorld)-70.)*.006);
        c=mix(c,vec3(.39,.67,.77),mist*.40);
        gl_FragColor=vec4(c,1.);${output}
      }`,
  }));sea.rotation.x=-Math.PI/2;sea.position.set(0,-.009,-213);group.add(sea);

  // Distant relief remains volumetric during the full camera path.
  const islandMaterial=new THREE.MeshLambertMaterial({color:'#7da4ac',flatShading:true});
  for(const [x,z,sign] of [[-64,-97,1],[76,-116,-1]]){
    const island=new THREE.Group();
    for(let i=0;i<10;i++){
      const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(1,2),islandMaterial);
      rock.scale.set(5.5,1.6+(i%4)*1.15,5.5);rock.position.set((i-4)*3.4,-.65,Math.sin(i*1.7)*3);
      island.add(rock);
    }
    island.position.set(x,0,z);island.rotation.y=sign*.2;group.add(island);
  }
  return {group,clocks:[time],bodies:{website:ring,'studio-name':board},pigmentMap,
    setFocus(key,amount){
      focusPoint.value.set(key==='website'?-3.55:3.55,0);focusAmount.value=amount;
      for(const surface of focusedSand)surface.visible=Boolean(key);
    },
  };
}
