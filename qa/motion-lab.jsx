import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import App from '../src/App.jsx';
import { MotionChapter } from '../src/Motion.jsx';
import '../src/styles.css';

function AddedModule({ host }) {
  return host && createPortal(<section id="motion-future" data-motion-section style={{paddingBottom:100}}>
    <MotionChapter title="FUTURE IDEAS" />
    <div data-motion-group className="page-width strength-grid">
      {[1,2,3].map(index => <article key={index} data-motion="card" className="strength-card" style={{minHeight:200}}>
        <h3>后续新增模块 {index}</h3><p>仅开发检查：确认无需新增页面动效代码即可自动接入。</p>
      </article>)}
    </div>
  </section>, host);
}
function Lab() {
  const [revision,setRevision] = useState(0), [reduced,setReduced] = useState(false);
  const [extra,setExtra] = useState(false), [host,setHost] = useState(null), [result,setResult] = useState(null);
  const frame = useRef(null), observer = useRef(null);
  useEffect(() => { setHost(document.querySelector('.site-shell main')); }, [revision]);
  useEffect(() => () => { cancelAnimationFrame(frame.current); observer.current?.disconnect(); }, []);
  const restart = mode => {
    location.hash = 'home';
    window.scrollTo({top:0,behavior:'instant'});
    setReduced(mode); setExtra(false); setHost(null); setRevision(value=>value+1); setResult(null);
  };
  const measure = () => {
    restart(false);
    cancelAnimationFrame(frame.current); observer.current?.disconnect();
    const start = performance.now(), samples = [], longTasks = [];
    let previous = start;
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      observer.current = new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(entry=>entry.duration)));
      observer.current.observe({type:'longtask',buffered:false});
    }
    const tick = now => {
      samples.push(now-previous); previous=now;
      if (now-start<7000) frame.current=requestAnimationFrame(tick);
      else {
        observer.current?.disconnect();
        const sorted=[...samples].sort((a,b)=>a-b);
        setResult({sampleMs:Math.round(now-start),frames:samples.length,
          averageFps:Math.round(samples.length*1000/(now-start)),
          p95FrameMs:Math.round(sorted[Math.floor(sorted.length*.95)]*10)/10,
          longTasks:longTasks.length,maxLongTaskMs:Math.round(Math.max(0,...longTasks)),
          scrollTriggers:ScrollTrigger.getAll().length,opening:document.querySelector('.site-shell')?.dataset.opening});
      }
    };
    frame.current=requestAnimationFrame(tick);
  };
  return <>
    <App key={revision} motionPreference={reduced?'reduced':'system'} />
    {extra && <AddedModule host={host} />}
    <aside style={{position:'fixed',bottom:8,left:8,zIndex:200,background:'#ffe9b9',borderRadius:16,padding:12,display:'flex',gap:8,alignItems:'center',maxWidth:'calc(100vw - 16px)',flexWrap:'wrap',fontSize:11}}>
      <button onClick={()=>restart(false)}>重播完整开场</button>
      <button onClick={()=>restart(true)}>检查减少动态模式</button>
      <button onClick={measure}>测量开场七秒</button>
      <button onClick={()=>setExtra(!extra)}>{extra?'移除测试模块':'插入后续测试模块'}</button>
      <button onClick={()=>document.getElementById('motion-future')?.scrollIntoView({behavior:'smooth'})}>查看新增模块</button>
      <button onClick={()=>setResult({scrollTriggers:ScrollTrigger.getAll().length})}>读取触发器数量</button>
      <output aria-label="动效检查结果">{result && JSON.stringify(result)}</output>
    </aside>
  </>;
}
createRoot(document.getElementById('root')).render(<Lab />);
