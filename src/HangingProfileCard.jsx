import {Component,lazy,Suspense,useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import ProfileCard from './ProfileCard.jsx';
import {profile} from './content.js';
import {lanyardLayout,BADGE_SLOT,assemblyClip} from './lanyard-layout.js';
import './Lanyard.css';

const Lanyard=lazy(()=>import('./Lanyard.jsx'));
class StrapBoundary extends Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){this.props.onError();}
  render(){return this.state.failed?null:this.props.children;}
}

export default function HangingProfileCard({reducedMotion=false,suspended=false}){
  const hostRef=useRef(null),overlayRef=useRef(null),assemblyRef=useRef(null),frameRef=useRef(null),poseRef=useRef(null),measurement=useRef(null),enteredRef=useRef(false);
  const interaction=useRef({dragging:false,clientX:0,clientY:0,startClientX:0,startClientY:0,wake:null,render:null,kick:null,reset:0,base:null,sync:null});
  const [dimensions,setDimensions]=useState(null),[near,setNear]=useState(false),[visible,setVisible]=useState(false);
  const [pageVisible,setPageVisible]=useState(true),[systemReduced,setSystemReduced]=useState(false);
  const [ready,setReady]=useState(false),[entered,setEntered]=useState(false),[failed,setFailed]=useState(false),[dragging,setDragging]=useState(false);
  const reduced=reducedMotion||systemReduced;
  const layout=useMemo(()=>dimensions?lanyardLayout(dimensions):null,[dimensions]);

  const sync=useCallback(()=>{
    const host=hostRef.current,overlay=overlayRef.current,assembly=assemblyRef.current,frame=frameRef.current,column=host?.closest('.me-card-column'),section=host?.closest('#me');
    if(!host||!overlay||!assembly||!frame||!column||!section)return;
    const rect=host.getBoundingClientRect(),style=getComputedStyle(column);
    const m=new DOMMatrixReadOnly(style.transform==='none'?undefined:style.transform);
    const [ox,oy]=style.transformOrigin.split(' ').map(parseFloat);
    const width=host.offsetWidth,height=host.offsetHeight;
    const centerX=ox+m.a*(width/2-ox)+m.c*(height/2-oy)+m.e;
    const centerY=oy+m.b*(width/2-ox)+m.d*(height/2-oy)+m.f;
    const left=rect.left+rect.width/2-centerX,top=rect.top+rect.height/2-centerY;
    const sectionTop=section.getBoundingClientRect().top+window.scrollY;
    const stageTop=sectionTop-320,stageHeight=section.offsetHeight+640;
    const localLeft=left+window.scrollX,localTop=top+window.scrollY-stageTop;
    interaction.current.base={left,top,width,height,localLeft,localTop};
    const stageValues={top:`${stageTop}px`,height:`${stageHeight}px`};
    for(const [name,value] of Object.entries(stageValues))if(overlay.style[name]!==value)overlay.style[name]=value;
    const drop=measurement.current?.drop||220;
    const assemblyValues={transform:style.transform,transformOrigin:`${localLeft+ox}px ${localTop+oy}px`,clipPath:assemblyClip(style.clipPath,{localTop,drop,height,stageHeight})};
    for(const [name,value] of Object.entries(assemblyValues))if(assembly.style[name]!==value)assembly.style[name]=value;
    const values={left:`${localLeft}px`,top:`${localTop}px`,width:`${width}px`,height:`${height}px`,transform:'none',clipPath:'none'};
    for(const [name,value] of Object.entries(values))if(frame.style[name]!==value)frame.style[name]=value;
    const complete=style.clipPath==='none';
    if(enteredRef.current!==complete){enteredRef.current=complete;setEntered(complete);}
  },[]);

  useLayoutEffect(()=>{
    const host=hostRef.current;
    if(!host)return;
    const content=host.closest('.me-content'),column=host.closest('.me-card-column'),section=host.closest('#me');
    const measure=()=>{
      const width=host.offsetWidth,height=host.offsetHeight;
      const drop=(parseFloat(getComputedStyle(content).paddingTop)||126)+(parseFloat(getComputedStyle(column).marginTop)||0)+BADGE_SLOT.anchorInset;
      const stageWidth=document.documentElement.clientWidth,stageHeight=section.offsetHeight+640;
      if(!width||!height)return;
      const previous=measurement.current;
      if(previous&&previous.width===width&&previous.height===height&&previous.drop===drop&&previous.stageWidth===stageWidth&&previous.stageHeight===stageHeight)return;
      const ropeChanged=!previous||previous.width!==width||previous.height!==height||previous.drop!==drop;
      measurement.current={width,height,drop,stageWidth,stageHeight};
      if(ropeChanged){setReady(false);interaction.current.dragging=false;setDragging(false);if(poseRef.current)poseRef.current.style.transform='';}
      setDimensions(measurement.current);
    };
    measure();
    const observer=new ResizeObserver(measure);
    [host,content,column,section].forEach(node=>observer.observe(node));
    return()=>observer.disconnect();
  },[]);
  useLayoutEffect(()=>{interaction.current.sync=sync;sync();},[layout,sync]);

  useEffect(()=>{
    const host=hostRef.current,column=host.closest('.me-card-column');
    const preload=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){setNear(true);preload.disconnect();}},{rootMargin:'220px'});
    const observe=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{rootMargin:'40px'});
    preload.observe(host);observe.observe(host);
    const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference=()=>setSystemReduced(preference.matches);
    const updateVisibility=()=>setPageVisible(!document.hidden);
    let scheduled=0;
    const schedule=()=>{
      if(scheduled)return;
      scheduled=requestAnimationFrame(()=>{scheduled=0;sync();interaction.current.render?.();});
    };
    const motionObserver=new MutationObserver(schedule);
    motionObserver.observe(column,{attributes:true,attributeFilter:['style']});
    // The card and WebGL now scroll natively in the same document-space portal.
    // Scroll never changes either transform or redraws a sleeping rope.
    window.addEventListener('resize',schedule,{passive:true});
    updatePreference();updateVisibility();schedule();
    preference.addEventListener('change',updatePreference);document.addEventListener('visibilitychange',updateVisibility);
    return()=>{
      preload.disconnect();observe.disconnect();motionObserver.disconnect();cancelAnimationFrame(scheduled);
      window.removeEventListener('resize',schedule);
      preference.removeEventListener('change',updatePreference);document.removeEventListener('visibilitychange',updateVisibility);
      interaction.current.sync=null;
    };
  },[sync]);

  const endDrag=useCallback(event=>{
    interaction.current.dragging=false;interaction.current.wake?.();setDragging(false);
    if(event?.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  },[]);
  useEffect(()=>{
    if(!pageVisible||reduced){interaction.current.dragging=false;setDragging(false);}
    if(reduced&&poseRef.current)poseRef.current.style.transform='';
  },[pageVisible,reduced]);
  const handleFailure=useCallback(()=>{setFailed(true);setReady(false);interaction.current.dragging=false;setDragging(false);if(poseRef.current)poseRef.current.style.transform='';},[]);
  const startDrag=(event,handle=false)=>{
    if(!ready||!entered||reduced||event.button!==0||(event.pointerType!=='mouse'&&!handle))return;
    event.stopPropagation();event.preventDefault();sync();
    const input=interaction.current;
    input.clientX=input.startClientX=event.clientX;input.clientY=input.startClientY=event.clientY;
    input.dragging=true;input.wake?.();event.currentTarget.setPointerCapture(event.pointerId);setDragging(true);
  };
  const move=event=>{
    if(!interaction.current.dragging)return;
    interaction.current.clientX=event.clientX;interaction.current.clientY=event.clientY;interaction.current.render?.();
  };
  const keyDown=event=>{
    if(!ready||!entered||reduced)return;
    const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]};
    if(directions[event.key]){event.preventDefault();interaction.current.kick=directions[event.key];interaction.current.wake?.();}
    else if(['Enter','Home',' '].includes(event.key)){event.preventDefault();interaction.current.reset+=1;interaction.current.wake?.();}
  };
  const mode=ready?'physics':failed||reduced?'static':'loading';
  const card=<div className="hanging-card-pose" ref={poseRef} role="group" aria-label="YUAN XIAOPENG，个人名片"
    onPointerDown={startDrag} onPointerMove={move} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}>
    <button className="profile-drag-handle" type="button" disabled={!ready||!entered||reduced}
      aria-label="拖动名片；方向键轻推，回车复位" title="拖动名片" onPointerDown={event=>startDrag(event,true)} onKeyDown={keyDown}/>
    <ProfileCard className="shark-profile-card" name="YUAN XIAOPENG" title="Software Engineer"
      avatarUrl={profile.portrait} iconUrl={profile.holographicPattern} showUserInfo={false}
      enableTilt={!reduced&&!dragging} initialTilt={false} enableMobileTilt={false}
      behindGlowEnabled behindGlowColor="rgba(218, 242, 243, .36)" behindGlowSize="64%"
      innerGradient="linear-gradient(145deg, #183f5880 0%, #75b6d05c 48%, #f3dda847 100%)"/>
  </div>;
  const style=layout?{'--strap-drop':`${layout.drop}px`,'--anchor-inset':`${BADGE_SLOT.anchorInset}px`,'--hanger-rise':`${(layout.attachOffset-layout.cardHeight/2*layout.unit)/layout.unit}px`,'--clip-height':`${layout.clipHeight}px`,'--clamp-height':`${layout.clampHeight}px`}:undefined;
  const canLoad=near&&layout&&!failed&&!reduced;
  return <>
    <div className="hanging-profile" ref={hostRef}>{typeof document==='undefined'?card:null}</div>
    {typeof document!=='undefined'&&createPortal(<div className="hanging-overlay" ref={overlayRef} data-lanyard-mode={mode} data-dragging={dragging}
      data-suspended={suspended || undefined} data-visible={visible||dragging} style={style} aria-hidden={!visible&&!dragging}>
      <div className="hanging-assembly" ref={assemblyRef}>
      {canLoad&&<div className="profile-lanyard-canvas" aria-hidden="true"><StrapBoundary onError={handleFailure}><Suspense fallback={null}>
        <Lanyard position={[0,0,20]} gravity={[0,-40,0]} layout={layout} active={(visible||dragging)&&pageVisible&&entered&&!suspended}
          poseRef={poseRef} interaction={interaction} onReady={setReady} onError={handleFailure}/>
      </Suspense></StrapBoundary></div>}
      <div className="hanging-portal-frame" ref={frameRef}>
        <div className="profile-static-hanger" aria-hidden="true"><i className="profile-static-band"/><i className="profile-static-clip"/><i className="profile-static-clamp"/></div>
        {card}
      </div>
      </div>
    </div>,document.body)}
  </>;
}
