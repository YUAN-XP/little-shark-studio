import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createBeachEnvironment } from './about-beach-environment.js';
import { loadSourceOcean } from './about-beach-source-ocean.js';
import { BEACH_ART, BEACH_OBJECTS, clamp, easeCamera, getBeachPose } from './about-beach-layout.js';

// Return whether the geometry moved so its shadow is refreshed in that same
// frame, including a hover change while the reduced-motion ocean is paused.
export function updateBeachHover(bodies,hovered,focused,reduced,dt){
  let changed=false;
  for(const [id,body] of Object.entries(bodies)){
    const target=hovered===id&&!focused?1.026:1;
    const eased=focused||reduced?target:THREE.MathUtils.damp(body.scale.x,target,13,Math.max(dt,.016));
    const scale=Math.abs(eased-target)<.00001?target:eased;
    if(scale!==body.scale.x){body.scale.setScalar(scale);changed=true;}
  }
  return changed;
}

// The scene contains one model per object for its entire lifetime. CSS applies
// continuous Gaussian blur to an overscanned background canvas; a second,
// transparent canvas draws the selected model through the very same camera.
export async function createBeachScene({canvas,foreground,container,model:modelURL,background:backgroundURL,ocean:oceanURL,island:islandURL,localBoard:boardURL,onFrame,onProgress,onContextLost,signal}){
  const options={antialias:true,powerPreference:'high-performance'};
  const renderer=new THREE.WebGLRenderer({...options,canvas,alpha:false});
  const frontRenderer=new THREE.WebGLRenderer({...options,canvas:foreground,alpha:true});
  const pixelRatio=Math.min(window.devicePixelRatio||1,1.5);
  for(const r of [renderer,frontRenderer]){r.outputColorSpace=THREE.SRGBColorSpace;r.setPixelRatio(pixelRatio);r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.13;}
  // The waves cast moving shadows; the fixed island props keep their position.
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  frontRenderer.shadowMap.enabled=true;frontRenderer.shadowMap.type=THREE.PCFShadowMap;
  frontRenderer.shadowMap.autoUpdate=false;frontRenderer.shadowMap.needsUpdate=true;
  frontRenderer.setClearColor(0,0);renderer.setClearColor('#bde4ed',1);
  const loader=new THREE.TextureLoader();let model,background,oceanData,suppliedBoard,island;
  try{[model,background,oceanData,suppliedBoard,island]=await Promise.all([
    new GLTFLoader().loadAsync(modelURL),loader.loadAsync(backgroundURL),loadSourceOcean(oceanURL,onProgress,{signal}),
    boardURL ? new GLTFLoader().loadAsync(boardURL) : Promise.resolve(null),
    new GLTFLoader().loadAsync(islandURL),
  ]);}
  catch(error){renderer.dispose();frontRenderer.dispose();throw error;}
  background.colorSpace=THREE.SRGBColorSpace;background.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const scene=new THREE.Scene();
  if(oceanData.atlas.width>renderer.capabilities.maxTextureSize||oceanData.atlas.height>renderer.capabilities.maxTextureSize){renderer.dispose();frontRenderer.dispose();throw new Error('当前设备的纹理尺寸不足以运行完整海浪。');}
  const world=createBeachEnvironment(model,background,oceanData,suppliedBoard,island);scene.add(world.group);
  // Stabilize self-shadowing on the rounded matte props. The original ocean
  // shader has its own shadow lookup and retains its Blender color response.
  world.ocean.sun.shadow.bias=-.00015;
  world.ocean.sun.shadow.normalBias=.035;
  const camera=new THREE.PerspectiveCamera(BEACH_ART.fov,1,.1,400);
  const backgroundCamera=camera.clone();
  const bodies=world.bodies;
  const worldSignature=()=>JSON.stringify(Object.entries(bodies).map(([id,body])=>({
    id,model:body.uuid,geometry:body.children.filter(c=>c.isMesh).map(c=>c.geometry.uuid),position:body.position.toArray(),yaw:body.rotation.y,
  })));
  let width=1,height=1,disposed=false,lost=false,visible=true,reduced=false,hovered=null,key=null;
  let raf=null,lastStamp=null,time=0,progress=0,motion=null,previousLayer=null,lastShadow=-1;
  let previousView=null,measurements=null,frameCount=0;
  const signature=worldSignature();
  const vec=new THREE.Vector3();
  const boxes={website:{min:[-2.62,-2.57,-.55],max:[2.62,2.62,.55]},'studio-name':{min:[-1.60,-3.85,-.88],max:[1.60,3.85,.36]}};
  const project=(point,body)=>{
    vec.fromArray(point);if(body)vec.applyMatrix4(body.matrixWorld);vec.project(camera);
    return {x:(vec.x*.5+.5)*width,y:(.5-vec.y*.5)*height};
  };
  function measure(){
    const bounds={};
    for(const [id,body] of Object.entries(bodies)){
      const box=boxes[id],points=[];
      for(let x=0;x<2;x++)for(let y=0;y<2;y++)for(let z=0;z<2;z++)points.push(project([box[x?'max':'min'][0],box[y?'max':'min'][1],box[z?'max':'min'][2]],body));
      const left=Math.min(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y));
      bounds[id]={left,top,width:Math.max(...points.map(p=>p.x))-left,height:Math.max(...points.map(p=>p.y))-top};
    }
    let reading=null;
    if(key){
      const isRing=key==='website',body=bodies[key],radius=BEACH_OBJECTS.website.innerRadius;
      const center=project(isRing?[0,0,0]:[0,-.42,.30],body);
      const a=project(isRing?[-radius,0,0]:[-1.175,-.42,.30],body);
      const b=project(isRing?[radius,0,0]:[1.175,-.42,.30],body);
      const w=Math.hypot(a.x-b.x,a.y-b.y)*(isRing?.96:1);
      reading={left:center.x,top:center.y,width:w,height:isRing?w:w*3.85/2.35};
    }
    return {bounds,reading};
  }
  function draw(stamp=performance.now()){
    raf=null;if(disposed||lost||!visible)return;
    const interval=motion||hovered?1000/60:1000/30;
    if(lastStamp!==null&&stamp-lastStamp<interval-.5){schedule();return;}
    const elapsed=lastStamp===null?0:Math.max(0,(stamp-lastStamp)/1000),dt=Math.min(.05,elapsed);
    lastStamp=stamp;if(!reduced)time+=Math.min(elapsed,.25);
    world.clocks.forEach(clock=>{clock.value=time;});
    const waveFrame=world.update(time);
    let done=null;
    if(motion){
      motion.elapsed+=elapsed;const t=reduced?1:clamp(motion.elapsed/motion.duration,0,1);
      progress=motion.from+(motion.to-motion.from)*easeCamera(t);
      if(t===1){done=motion.done;motion=null;if(progress===0)key=null;}
    }
    const viewChanged=!previousView||previousView.key!==key||previousView.progress!==progress||previousView.width!==width||previousView.height!==height;
    if(viewChanged){
      const pose=getBeachPose(key,progress,width,height);
      camera.position.fromArray(pose.position);camera.lookAt(...pose.target);camera.updateMatrixWorld();
      backgroundCamera.position.copy(camera.position);backgroundCamera.quaternion.copy(camera.quaternion);backgroundCamera.updateMatrixWorld();
      world.setFocus(key&&progress>0?key:null,easeCamera(progress));
      canvas.style.filter=`blur(${(easeCamera(progress)*5).toFixed(2)}px)`;
      previousView={key,progress,width,height,pose};
    }
    const selected=key&&progress>0?key:null,layersChanged=selected!==previousLayer;
    if(layersChanged){
      for(const [id,body] of Object.entries(bodies))body.traverse(node=>{node.layers.set(0);if(id===selected)node.layers.enable(1);});
      previousLayer=selected;
    }
    const propsChanged=updateBeachHover(bodies,hovered,key,reduced,dt);
    if(propsChanged||layersChanged||time-lastShadow>.1||lastShadow<0){renderer.shadowMap.needsUpdate=true;frontRenderer.shadowMap.needsUpdate=true;lastShadow=time;}
    backgroundCamera.layers.set(0);renderer.render(scene,backgroundCamera);
    if(!world.syncShadow()){renderer.shadowMap.needsUpdate=true;renderer.render(scene,backgroundCamera);world.syncShadow();}
    if(selected){camera.layers.set(1);frontRenderer.render(scene,camera);}
    else if(layersChanged)frontRenderer.clear();
    const layoutChanged=viewChanged||propsChanged||!measurements;
    if(layoutChanged)measurements=measure();
    frameCount++;
    onFrame({...measurements,layoutChanged,frameCount,time,waveFrame:waveFrame.sourceFrame,angle:previousView.pose.angle,progress,worldSignature:signature});
    done?.();if(!reduced||motion)schedule();
  }
  function schedule(){if(!disposed&&!lost&&raf===null&&visible)raf=requestAnimationFrame(draw);}
  function resize(){
    if(disposed||lost)return;
    const rect=container.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);
    const pad=BEACH_ART.overscan;
    const budgetRatio=Math.max(1,Math.min(pixelRatio,Math.sqrt(2200000/((width+pad*2)*(height+pad*2)))));
    renderer.setPixelRatio(budgetRatio);frontRenderer.setPixelRatio(budgetRatio);
    renderer.setSize(width+pad*2,height+pad*2,false);frontRenderer.setSize(width,height,false);
    camera.aspect=width/height;camera.updateProjectionMatrix();
    backgroundCamera.fov=camera.fov;backgroundCamera.setViewOffset(width,height,-pad,-pad,width+pad*2,height+pad*2);
    if(raf!==null){cancelAnimationFrame(raf);raf=null;}lastStamp=null;previousView=null;draw();
  }
  const observer=new ResizeObserver(resize);observer.observe(container);
  const contextLost=event=>{event.preventDefault();if(lost)return;lost=true;visible=false;if(raf!==null)cancelAnimationFrame(raf);raf=null;onContextLost();};
  for(const c of [canvas,foreground])c.addEventListener('webglcontextlost',contextLost);
  resize();
  return {
    setVisible(value){visible=value;lastStamp=null;if(!value&&raf!==null){cancelAnimationFrame(raf);raf=null;}if(value)schedule();},
    setReducedMotion(value){reduced=value;schedule();},setHover(value){hovered=value;schedule();},
    focus(id,done){if(!BEACH_OBJECTS[id])return;key=id;hovered=null;motion={from:progress,to:1,duration:2.15*Math.max(.1,1-progress),elapsed:0,done};schedule();},
    home(done){motion={from:progress,to:0,duration:1.85*Math.max(.1,progress),elapsed:0,done};schedule();},
    dispose(){
      disposed=true;if(raf!==null)cancelAnimationFrame(raf);observer.disconnect();
      for(const c of [canvas,foreground])c.removeEventListener('webglcontextlost',contextLost);
      const geometries=new Set(),materials=new Set(),textures=new Set([background]);
      scene.traverse(node=>{if(node.geometry)geometries.add(node.geometry);if(node.material)for(const m of [node.material].flat())materials.add(m);});
      geometries.forEach(g=>g.dispose());
      materials.forEach(m=>{for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();});
      textures.forEach(t=>t.dispose());
      world.dispose();
      scene.traverse(node=>{if(node.isLight&&node.shadow)node.shadow.dispose();});
      renderer.dispose();frontRenderer.dispose();
    },
  };
}
