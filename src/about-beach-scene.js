import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createBeachEnvironment } from './about-beach-environment.js';
import { BEACH_ART, BEACH_OBJECTS, clamp, easeCamera, getBeachPose } from './about-beach-layout.js';

function makeDoodles(id) {
  const group=new THREE.Group();
  const specs=id==='website'?[[-2.65,1.75,-1],[2.65,1.20,1]]:[[-1.7,2.15,-1],[1.7,1.5,1]];
  for(const [index,[x,y,sign]] of specs.entries())for(let line=0;line<2;line++){
    const points=Array.from({length:14},(_,i)=>{
      const t=i/13;return new THREE.Vector3(x+sign*(.18*line+.22*Math.sin(t*Math.PI)),y+.52*t,0);
    });
    const stroke=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.033,5,false),
      new THREE.MeshBasicMaterial({color:'#26546b',transparent:true,depthTest:false}));
    stroke.userData.seed=index*2+line;stroke.renderOrder=8;group.add(stroke);
  }
  return group;
}

// The scene contains one model per object for its entire lifetime. CSS applies
// continuous Gaussian blur to an overscanned background canvas; a second,
// transparent canvas draws the selected model through the very same camera.
export async function createBeachScene({canvas,foreground,container,model:modelURL,background:backgroundURL,onFrame,onContextLost}){
  const options={antialias:true,powerPreference:'high-performance'};
  const renderer=new THREE.WebGLRenderer({...options,canvas,alpha:false});
  const frontRenderer=new THREE.WebGLRenderer({...options,canvas:foreground,alpha:true});
  const pixelRatio=Math.min(window.devicePixelRatio||1,1.75);
  for(const r of [renderer,frontRenderer]){r.outputColorSpace=THREE.SRGBColorSpace;r.setPixelRatio(pixelRatio);r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.13;}
  // Bake the fixed props' soft shadows once. Moving the camera never changes
  // their contact with the sculpted sand; the background keeps the same shadows.
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  frontRenderer.setClearColor(0,0);renderer.setClearColor('#bde4ed',1);
  const loader=new THREE.TextureLoader();let model,background;
  try{[model,background]=await Promise.all([new GLTFLoader().loadAsync(modelURL),loader.loadAsync(backgroundURL)]);}
  catch(error){renderer.dispose();frontRenderer.dispose();throw error;}
  background.colorSpace=THREE.SRGBColorSpace;background.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const scene=new THREE.Scene();
  const world=createBeachEnvironment(model,background);scene.add(world.group);
  const camera=new THREE.PerspectiveCamera(BEACH_ART.fov,1,.1,400);
  const backgroundCamera=camera.clone();
  const bodies=world.bodies,doodles={};
  for(const [id,item] of Object.entries(BEACH_OBJECTS)){
    const strokes=makeDoodles(id);strokes.position.fromArray(item.center);strokes.position.z=.5;
    scene.add(strokes);doodles[id]=strokes;
  }
  const worldSignature=()=>JSON.stringify(Object.entries(bodies).map(([id,body])=>({
    id,model:body.uuid,geometry:body.children.filter(c=>c.isMesh).map(c=>c.geometry.uuid),position:body.position.toArray(),yaw:body.rotation.y,
  })));
  let width=1,height=1,disposed=false,lost=false,visible=true,reduced=false,hovered=null,key=null;
  let raf=null,lastStamp=null,time=0,progress=0,motion=null,previousLayer=null;
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
    raf=null;if(disposed||lost)return;
    const elapsed=lastStamp===null?0:Math.max(0,(stamp-lastStamp)/1000),dt=Math.min(.05,elapsed);
    lastStamp=stamp;if(!reduced&&visible)time+=dt;
    world.clocks.forEach(clock=>{clock.value=time;});
    let done=null;
    if(motion){
      motion.elapsed+=elapsed;const t=reduced?1:clamp(motion.elapsed/motion.duration,0,1);
      progress=motion.from+(motion.to-motion.from)*easeCamera(t);
      if(t===1){done=motion.done;motion=null;if(progress===0)key=null;}
    }
    const pose=getBeachPose(key,progress,width,height);
    camera.position.fromArray(pose.position);camera.lookAt(...pose.target);camera.updateMatrixWorld();
    backgroundCamera.position.copy(camera.position);backgroundCamera.quaternion.copy(camera.quaternion);backgroundCamera.updateMatrixWorld();
    const selected=key&&progress>0?key:null;
    world.setFocus(selected,easeCamera(progress));
    if(selected!==previousLayer){
      for(const [id,body] of Object.entries(bodies))body.traverse(node=>node.layers.set(id===selected?1:0));
      previousLayer=selected;
    }
    for(const [id,body] of Object.entries(bodies)){
      const scale=hovered===id&&!key?1.026:1;
      body.scale.setScalar(key||reduced?scale:THREE.MathUtils.damp(body.scale.x,scale,13,Math.max(dt,.016)));
      const strokes=doodles[id];strokes.visible=progress<.35;
      const energy=hovered===id?1.8:1;
      strokes.children.forEach((stroke,index)=>{
        const wave=reduced?0:Math.sin(time*(hovered===id?3.4:2.3)+stroke.userData.seed*1.7);
        stroke.position.y=wave*.045*energy;stroke.rotation.z=wave*.018*energy;stroke.scale.setScalar(1+wave*.03*energy);
        stroke.material.opacity=(.75+(reduced?0:Math.sin(time*1.7+index)*.12))*(1-clamp(progress/.35,0,1));
      });
    }
    scene.updateMatrixWorld(true);
    canvas.style.filter=`blur(${(easeCamera(progress)*5).toFixed(2)}px)`;
    backgroundCamera.layers.set(0);renderer.render(scene,backgroundCamera);
    camera.layers.set(1);frontRenderer.render(scene,camera);
    onFrame({...measure(),time,angle:pose.angle,progress,worldSignature:worldSignature()});
    done?.();if(visible&&(!reduced||motion))schedule();
  }
  function schedule(){if(!disposed&&!lost&&raf===null&&visible)raf=requestAnimationFrame(draw);}
  function resize(){
    if(disposed||lost)return;
    const rect=container.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);
    const pad=BEACH_ART.overscan;
    renderer.setSize(width+pad*2,height+pad*2,false);frontRenderer.setSize(width,height,false);
    camera.aspect=width/height;camera.updateProjectionMatrix();
    backgroundCamera.fov=camera.fov;backgroundCamera.setViewOffset(width,height,-pad,-pad,width+pad*2,height+pad*2);
    for(const [id,strokes] of Object.entries(doodles))strokes.scale.x=(width<640?.72:1)*(id==='studio-name'?.88:1);
    if(raf!==null){cancelAnimationFrame(raf);raf=null;}draw();
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
      scene.traverse(node=>{if(node.isLight&&node.shadow)node.shadow.dispose();});
      renderer.dispose();frontRenderer.dispose();
    },
  };
}
