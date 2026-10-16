/* Adapted from React Bits Lanyard-JS-CSS, exact registry source archived in 06-tools. */
'use client';
import {useEffect,useMemo,useRef} from 'react';
import {Canvas,extend,useFrame,useThree} from '@react-three/fiber';
import {useGLTF,useTexture,Environment,Lightformer} from '@react-three/drei';
import {BallCollider,CuboidCollider,Physics,RigidBody,useRopeJoint,useSphericalJoint,useRapier} from '@react-three/rapier';
import {MeshLineGeometry,MeshLineMaterial} from 'meshline';
import * as THREE from 'three';
import cardGLB from './assets/lanyard/hardware.glb';
import lanyard from './assets/lanyard/lanyard.png';
import sharkBand from './assets/lanyard/shark-band.svg';
import {poseToCss,pointerToCardPlane} from './lanyard-layout.js';
import {badgeFaceGeometry} from './badge-geometry.js';
import {clipRibbonEdges} from './ribbon-material.js';
import './Lanyard.css';

extend({MeshLineGeometry,MeshLineMaterial});

// The card stays in the DOM so its live holographic shader, text, accessibility,
// and hover tilt survive. Rapier drives its parent; GLB hardware joins the strap.
export default function Lanyard({position=[0,0,20],gravity=[0,-40,0],fov=20,transparent=true,
  layout,active=true,poseRef,interaction,onReady,onError,lanyardImage=sharkBand,lanyardWidth=1}){
  return <div className="lanyard-wrapper">
    <Canvas orthographic camera={{position,zoom:1/layout.unit,near:.1,far:80}}
      dpr={[1,Math.min(2,Math.max(1,Math.sqrt(3000000/(layout.stageWidth*layout.stageHeight))))]} frameloop="demand"
      gl={{alpha:transparent,antialias:true,stencil:true,powerPreference:'low-power'}}
      onCreated={({gl})=>{gl.setClearColor(0x000000,transparent?0:1);gl.localClippingEnabled=true;}}
      fallback={null}>
      <ambientLight intensity={1.2}/><directionalLight position={[2,4,6]} intensity={2.5}/>
      <Physics gravity={gravity} timeStep={1/60} interpolate updatePriority={-2} paused={!active} numSolverIterations={12}>
        <Band key={`${layout.cardWidth}:${layout.cardHeight}:${layout.drop}`} layout={layout}
          active={active} poseRef={poseRef} interaction={interaction}
          onReady={onReady} onError={onError} lanyardImage={lanyardImage} lanyardWidth={lanyardWidth}/>
      </Physics>
      <Environment resolution={64} frames={1} blur={.5}>
        <Lightformer intensity={3} color="#f6e5ab" position={[-3,2,4]} rotation={[0,0,.5]} scale={[6,1,1]}/>
        <Lightformer intensity={4} color="#d7f0ff" position={[3,0,4]} scale={[2,5,1]}/>
      </Environment>
    </Canvas>
  </div>;
}

function Band({layout,active,poseRef,interaction,onReady,onError,lanyardImage,lanyardWidth,maxSpeed=50,minSpeed=0}){
  const band=useRef(),fixed=useRef(),j1=useRef(),j2=useRef(),j3=useRef(),card=useRef();
  const {nodes,materials}=useGLTF(cardGLB);
  const texture=useTexture(lanyardImage||lanyard);
  const {invalidate,gl,camera,size}=useThree(),{rapier,rigidBodyStates}=useRapier();
  const state=useRef({wasDragging:false,offset:null,lastReset:0,lastPose:'',readyFrames:0});
  const curve=useMemo(()=>new THREE.CatmullRomCurve3(Array.from({length:4},()=>new THREE.Vector3())),[]);
  const scratch=useMemo(()=>({angular:new THREE.Vector3(),rotation:new THREE.Vector3(),attachment:new THREE.Vector3()}),[]);
  const faceGeometry=useMemo(()=>badgeFaceGeometry(THREE,layout),[layout.cardWidth,layout.cardHeight,layout.unit]);
  const tapeClip=useMemo(()=>[new THREE.Plane(new THREE.Vector3(0,-1,0),layout.visibleAnchorY)],[layout.visibleAnchorY]);
  useEffect(()=>()=>faceGeometry.dispose(),[faceGeometry]);
  const segmentProps={type:'dynamic',canSleep:true,colliders:false,angularDamping:5,linearDamping:5,
    enabledTranslations:[true,true,false],enabledRotations:[false,false,true]};
  const l=layout.jointLength;
  // Original example topology. Only the joint length is scaled to the layout;
  // it never constrains or filters the kinematic mouse target.
  useRopeJoint(fixed,j1,[[0,0,0],[0,0,0],l]);
  useRopeJoint(j1,j2,[[0,0,0],[0,0,0],l]);
  useRopeJoint(j2,j3,[[0,0,0],[0,0,0],l]);
  useSphericalJoint(j3,card,[[0,0,0],[0,layout.bandOffset,0]]);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=Math.min(8,gl.capabilities.getMaxAnisotropy());
  curve.curveType='chordal';

  useEffect(()=>{
    interaction.current.wake=()=>{[card,j1,j2,j3].forEach(ref=>ref.current?.wakeUp());invalidate();};
    interaction.current.render=invalidate;
    const loseContext=event=>{event.preventDefault();onError();};
    gl.domElement.addEventListener('webglcontextlost',loseContext);
    invalidate();
    return()=>{
      interaction.current.wake=null;interaction.current.render=null;interaction.current.dragging=false;
      gl.domElement.removeEventListener('webglcontextlost',loseContext);
      onReady(false);
    };
  },[gl,invalidate,interaction,onReady,onError]);
  useEffect(()=>{if(active)invalidate();},[active,invalidate]);

  const resetBodies=()=>{
    const bodies=[j1.current,j2.current,j3.current,card.current];
    const ys=[layout.anchorY-l,layout.anchorY-2*l,layout.anchorY-3*l,layout.restY];
    bodies.forEach((body,index)=>{
      if(!body)return;
      body.setTranslation({x:0,y:ys[index],z:0},true);
      body.setRotation({x:0,y:0,z:0,w:1},true);
      body.setLinvel({x:0,y:0,z:0},true);body.setAngvel({x:0,y:0,z:0},true);
    });
    [j1,j2].forEach(ref=>{if(ref.current)ref.current.lerped=null;});
  };
  // Pointer targets must be submitted before the fixed physics step. Rendering
  // below then reads its interpolated objects, exactly like the GLB hardware.
  useFrame(()=>{
    const body=card.current;
    if(!body||!fixed.current||!j1.current||!j2.current||!j3.current)return;
    const s=state.current,input=interaction.current;
    if(input.dragging||!input.base)input.sync?.();
    const base=input.base;
    if(!base)return;
    camera.position.x=(size.width/2-base.localLeft-layout.cardWidth/2)*layout.unit;
    camera.position.y=layout.restY+(base.localTop+layout.cardHeight/2-size.height/2)*layout.unit;
    camera.updateMatrixWorld();
    let dragged=input.dragging&&active;
    if(s.lastReset!==input.reset){
      input.dragging=false;body.setBodyType(rapier.RigidBodyType.Dynamic,true);resetBodies();
      s.lastReset=input.reset;s.wasDragging=false;s.offset=null;dragged=false;
    }
    if(dragged){
      const point=pointerToCardPlane({clientX:input.clientX,clientY:input.clientY,...base},layout);
      if(!s.wasDragging){
        const start=pointerToCardPlane({clientX:input.startClientX,clientY:input.startClientY,...base},layout);
        const p=body.translation();s.offset={x:start.x-p.x,y:start.y-p.y};
        body.setBodyType(rapier.RigidBodyType.KinematicPositionBased,true);
      }
      // Exactly the example's pointer minus grab offset. No speed cap, easing,
      // radial projection or forced card/buckle rotation on a mouse move.
      body.setNextKinematicTranslation({x:point.x-s.offset.x,y:point.y-s.offset.y,z:0});
      [card,j1,j2,j3,fixed].forEach(ref=>ref.current.wakeUp());
    }else if(s.wasDragging){
      body.setBodyType(rapier.RigidBodyType.Dynamic,true);
      s.offset=null;
    }
    s.wasDragging=dragged;
    if(input.kick&&active){
      const [x,y]=input.kick;input.kick=null;
      body.applyImpulse({x:x*.35,y:y*.25,z:0},true);
    }
  },-3);

  useFrame((frame,dt)=>{
    const body=card.current;
    if(!body||!fixed.current||!j1.current||!j2.current||!j3.current||!band.current)return;
    const s=state.current,input=interaction.current;
    const rendered=rigidBodyStates.get(body.handle)?.object;
    if(!rendered)return;
    // All three layers consume one interpolated pose. Scrolling the document
    // moves their shared stage without a second RAF or a camera correction.
    const pose=poseToCss(rendered.position,rendered.quaternion,layout);
    const css=`translate3d(${pose.x.toFixed(3)}px,${pose.y.toFixed(3)}px,0) rotate(${pose.angle.toFixed(3)}deg)`;
    if(css!==s.lastPose&&poseRef.current){poseRef.current.style.transform=css;s.lastPose=css;}
    // The example smooths the two intermediate links, not the dragged card.
    [j1,j2].forEach(ref=>{
      const position=rigidBodyStates.get(ref.current.handle)?.object.position||ref.current.translation();
      if(!ref.current.lerped)ref.current.lerped=new THREE.Vector3().copy(position);
      const clampedDistance=Math.max(.1,Math.min(1,ref.current.lerped.distanceTo(position)));
      // Demand rendering may resume after an idle interval; do not extrapolate
      // beyond the link on that first frame.
      ref.current.lerped.lerp(position,Math.min(1,dt*(minSpeed+clampedDistance*(maxSpeed-minSpeed))));
    });
    // Attach the ribbon to the same interpolated pose as the card and clip.
    scratch.attachment.set(0,layout.bandOffset,0).applyQuaternion(rendered.quaternion).add(rendered.position);
    curve.points[0].copy(scratch.attachment);
    curve.points[1].copy(j2.current.lerped);
    curve.points[2].copy(j1.current.lerped);
    curve.points[3].copy(fixed.current.translation());
    band.current.geometry.setPoints(curve.getPoints(32));
    scratch.angular.copy(body.angvel());scratch.rotation.copy(body.rotation());
    body.setAngvel({x:scratch.angular.x,y:scratch.angular.y-scratch.rotation.y*.25,z:scratch.angular.z},false);
    const awake=[card,j1,j2,j3].some(ref=>!ref.current.isSleeping());
    // Complete two shared frames before swapping the static whole-object
    // placeholder. No separate opacity entrance is applied to the rope.
    if(s.readyFrames<2){s.readyFrames++;if(s.readyFrames===2)onReady(true);invalidate();}
    if(active&&(input.dragging||awake))invalidate();
  },-1);

  return <>
    <RigidBody ref={fixed} type="fixed" position={[0,layout.anchorY,0]} colliders={false}/>
    {[{ref:j1,y:layout.anchorY-l},{ref:j2,y:layout.anchorY-2*l},{ref:j3,y:layout.anchorY-3*l}].map(({ref,y},index)=>
      <RigidBody key={index} ref={ref} {...segmentProps} position={[0,y,0]}>
        <BallCollider args={[.1]} collisionGroups={0}/>
      </RigidBody>)}
    <RigidBody ref={card} {...segmentProps} position={[0,layout.restY,0]}>
      <CuboidCollider args={[layout.cardWidth*layout.unit/2,layout.cardHeight*layout.unit/2,.025]} collisionGroups={0}/>
      <mesh geometry={faceGeometry} renderOrder={-1}>
        {/* Mask only the band at the card face; the slot and metal keep their existing depth. */}
        <meshBasicMaterial colorWrite={false} depthWrite depthTest side={THREE.DoubleSide}
          stencilWrite stencilRef={1} stencilFunc={THREE.AlwaysStencilFunc} stencilZPass={THREE.ReplaceStencilOp}/>
      </mesh>
      <group position={[0,layout.metalOffset,0]} scale={layout.metalScale} dispose={null}>
        <mesh geometry={nodes.clip.geometry} material={materials.metal} material-roughness={.3}/>
        <mesh geometry={nodes.clamp.geometry} material={materials.metal}/>
      </group>
    </RigidBody>
    <mesh ref={band} frustumCulled={false} renderOrder={1}>
      <meshLineGeometry/>
      <meshLineMaterial color="white" depthTest={false} depthWrite={false} resolution={[size.width,size.height]}
        stencilWrite stencilRef={1} stencilFunc={THREE.NotEqualStencilFunc} stencilWriteMask={0}
        clipping clippingPlanes={tapeClip} onBeforeCompile={clipRibbonEdges} useMap map={texture} repeat={[-4,1]}
        lineWidth={Math.max(11,Math.min(15,layout.cardWidth*.038))*2/size.height*lanyardWidth}/>
    </mesh>
  </>;
}
