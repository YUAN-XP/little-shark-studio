import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ContactMailbox from '../src/ContactMailbox.jsx';
import { profile } from '../src/content.js';
import '../src/styles.css';

function HingeCheck() {
  const root = useRef(null), running = useRef(false), output = useRef(null), progressOutput = useRef(null);
  const [state, setState] = useState('等待悬停或聚焦信箱');
  const record = () => {
    if (running.current) return;
    running.current = true;
    setState('正在记录');
    const started = performance.now(), samples=[];
    let progressSampled=false;
    const sample = () => {
      const door=root.current.querySelector('.contact-mailbox__door');
      const css=getComputedStyle(door);
      samples.push({ms:performance.now()-started,angle:css.getPropertyValue('--mailbox-hinge'),matrix:css.transform});
      const animation=door.getAnimations().find(item=>item.transitionProperty==='--mailbox-hinge');
      if(animation && !progressSampled){
        progressSampled=true;
        const time=animation.currentTime, duration=animation.effect.getTiming().duration, progress=[];
        animation.pause();
        for(let i=0;i<=40;i++){
          animation.currentTime=duration*i/40;
          const pose=getComputedStyle(door);
          progress.push({progress:i/40,angle:pose.getPropertyValue('--mailbox-hinge'),matrix:pose.transform});
        }
        progressOutput.current.textContent=JSON.stringify(progress);
        animation.currentTime=time;
        animation.play();
      }
      if(performance.now()-started<1100) requestAnimationFrame(sample);
      else { output.current.textContent=JSON.stringify(samples);setState('记录完成'); }
    };
    sample();
  };
  return <main style={{padding:24,background:'#245674',color:'#f0f2df',minHeight:'100vh'}}>
    <h1 style={{fontSize:20}}>信箱真实开门轨迹</h1><p role="status">{state}</p>
    <section style={{width:440,margin:'40px auto'}}>
      <div ref={root} className="contact-content" style={{display:'block',minHeight:0,padding:0}} onPointerOverCapture={record} onFocusCapture={record}>
        <ContactMailbox email={profile.email} />
        <footer className="footer" style={{marginTop:80}}>页脚横线</footer>
      </div>
    </section>
    <output ref={output} data-testid="hinge-samples" hidden />
    <output ref={progressOutput} data-testid="hinge-progress" hidden />
  </main>;
}
createRoot(document.getElementById('root')).render(<HingeCheck />);
