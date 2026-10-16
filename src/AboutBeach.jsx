import { useEffect, useRef, useState } from 'react';
import './AboutBeach.css';
import { getBeachLabelLayout } from './about-beach-layout.js';

const asset = name => `${import.meta.env.BASE_URL}media/about/${name}`;
// This supplied board has no publication permission. Vite removes this entire
// development-only branch from release bundles; postbuild also strips its files.
const localBoardURL = import.meta.env.DEV ? `${import.meta.env.BASE_URL}media/about/local-only/surfboard-local-v1.glb` : null;

export default function AboutBeach({ notes, reducedMotion = false, suspended = false }) {
  const root = useRef(null), canvas = useRef(null), foreground = useRef(null), engine = useRef(null);
  const entries = useRef({}), panel = useRef(null), closeTimer = useRef(null);
  const labels = useRef({}), arrows = useRef({});
  const suspendedRef = useRef(suspended), syncVisibilityRef = useRef(() => {}), debugStamp = useRef(-Infinity);
  suspendedRef.current = suspended;
  useEffect(() => { syncVisibilityRef.current(); }, [suspended]);
  const [ready, setReady] = useState(false), [fallback, setFallback] = useState(false);
  const [loadingMessage,setLoadingMessage] = useState('正在布置海边…');
  const [phase, setPhase] = useState('overview'), [selected, setSelected] = useState(null);
  const [hovered,setHovered] = useState(null);
  const phaseRef = useRef(phase), selectedRef = useRef(selected);
  const reduceRef = useRef(reducedMotion);
  const preferenceRef = useRef(reducedMotion);
  preferenceRef.current = reducedMotion;
  phaseRef.current = phase; selectedRef.current = selected;
  const current = notes.find(note => note.id === selected);

  useEffect(() => {
    reduceRef.current = reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (root.current) root.current.dataset.reducedMotion = String(reduceRef.current);
    engine.current?.setReducedMotion(reduceRef.current);
  }, [reducedMotion]);

  useEffect(() => {
    if (phase !== 'reading') return;
    const frame = requestAnimationFrame(() => panel.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  useEffect(() => {
    if (phase === 'overview') return;
    const escape = event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [phase, fallback]);

  useEffect(() => {
    let disposed = false, loading = false, visible = false;
    const loadingController = new AbortController();
    const element = root.current;
    // A development refresh can preserve React state while replacing WebGL.
    // Hide the old canvas until the replacement scene has drawn its first frame.
    setReady(false);setFallback(false);
    setPhase('overview');phaseRef.current='overview';
    setSelected(null);selectedRef.current=null;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => {
      reduceRef.current = preferenceRef.current || preference.matches;
      element.dataset.reducedMotion = String(reduceRef.current);
      engine.current?.setReducedMotion(reduceRef.current);
    };
    syncPreference();
    const syncVisibility = () => engine.current?.setVisible(visible && !document.hidden && !suspendedRef.current);
    syncVisibilityRef.current = syncVisibility;
    const load = async () => {
      if (loading || disposed) return;
      loading = true;
      try {
        const { createBeachScene } = await import('./about-beach-scene.js');
        if (disposed) return;
        const instance = await createBeachScene({
          canvas: canvas.current,
          foreground: foreground.current,
          container: element,
          model: asset('about-beach-crafted-v2.glb'),
          background: asset('about-beach-background-v1.webp'),
          ocean: asset('ocean-web-v1/'),
          signal: loadingController.signal,
          island: asset('s1-island-beach-v1.glb'),
          localBoard: localBoardURL,
          onProgress: message => { if(!disposed)setLoadingMessage(message.includes('准备')?'正在唤醒海浪…':'正在载入海岛与海洋…'); },
          onFrame: ({ bounds, reading, time, waveFrame, angle, progress, worldSignature, layoutChanged, frameCount }) => {
            if (layoutChanged) {
            for (const [key, box] of Object.entries(bounds)) {
              const button = entries.current[key];
              if (!button) continue;
              Object.assign(button.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
            }
            const layout = getBeachLabelLayout(bounds,element.clientWidth,element.clientHeight);
            for (const [key,cue] of Object.entries(layout)) {
              const label = labels.current[key];
              if (label) Object.assign(label.style,{left:`${cue.left}px`,top:`${cue.top}px`,width:`${cue.width}px`,fontSize:`${cue.fontSize}px`});
              arrows.current[key]?.setAttribute('d',cue.arrow);
            }
            if (reading) {
              for (const [name, value] of Object.entries(reading)) element.style.setProperty(`--reading-${name}`, `${value}px`);
            }
            }
            const stamp = performance.now();
            if (!layoutChanged && stamp - debugStamp.current < 100) return;
            debugStamp.current = stamp;
            element.dataset.renderFrames = String(frameCount);
            element.dataset.waveTime = time.toFixed(2);
            element.dataset.waveFrame = waveFrame.toFixed(2);
            element.dataset.cameraAngle = angle.toFixed(5);
            element.dataset.cameraProgress = progress.toFixed(4);
            if (element.dataset.worldSignature !== worldSignature) element.dataset.worldSignature = worldSignature;
          },
          onContextLost: () => {
            if (disposed) return;
            setFallback(true);
            if (phaseRef.current === 'entering') {
              setPhase('reading'); phaseRef.current = 'reading';
            } else if (['dismissing', 'leaving'].includes(phaseRef.current)) {
              clearTimeout(closeTimer.current);
              const previous = selectedRef.current;
              setPhase('overview'); phaseRef.current = 'overview';
              setSelected(null); selectedRef.current = null;
              requestAnimationFrame(() => entries.current[previous]?.focus({ preventScroll: true }));
            }
          },
        });
        if (disposed) { instance.dispose(); return; }
        engine.current = instance;
        instance.setReducedMotion(reduceRef.current);
        syncVisibility();
        setReady(true);
      } catch (error) {
        if (!disposed) { console.warn('Beach scene could not start; text remains accessible.', error); setFallback(true); }
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) load();
      syncVisibility();
    }, { rootMargin: '160px' });
    observer.observe(element);
    preference.addEventListener('change', syncPreference);
    document.addEventListener('visibilitychange', syncVisibility);
    return () => {
      disposed = true;
      loadingController.abort(); syncVisibilityRef.current = () => {};
      clearTimeout(closeTimer.current);
      observer.disconnect();
      preference.removeEventListener('change', syncPreference);
      document.removeEventListener('visibilitychange', syncVisibility);
      engine.current?.dispose(); engine.current = null;
    };
  }, []);

  const open = key => {
    if (phaseRef.current !== 'overview' || (!ready && !fallback)) return;
    setSelected(key); selectedRef.current = key;
    setHovered(null); engine.current?.setHover(null);
    setPhase('entering'); phaseRef.current = 'entering';
    root.current?.scrollIntoView({ block: 'center', behavior: reduceRef.current ? 'instant' : 'smooth' });
    const body = panel.current?.querySelector('.about-beach__story-body');
    if (body) body.scrollTop = 0;
    const arrived = () => {
      if (phaseRef.current !== 'entering') return;
      setPhase('reading'); phaseRef.current = 'reading';
      requestAnimationFrame(() => panel.current?.focus({ preventScroll: true }));
    };
    if (fallback) arrived();
    else engine.current.focus(key, arrived);
  };
  const hover = key => { setHovered(key); engine.current?.setHover(key); };
  const close = () => {
    if (!['reading', 'entering'].includes(phaseRef.current)) return;
    clearTimeout(closeTimer.current);
    setPhase('dismissing'); phaseRef.current = 'dismissing';
    const key = selectedRef.current;
    closeTimer.current = setTimeout(() => {
      setPhase('leaving'); phaseRef.current = 'leaving';
      const returned = () => {
        setPhase('overview'); phaseRef.current = 'overview';
        setSelected(null); selectedRef.current = null;
        requestAnimationFrame(() => entries.current[key]?.focus({ preventScroll: true }));
      };
      if (fallback) returned();
      else engine.current?.home(returned);
    }, reduceRef.current ? 0 : 300);
  };

  return <div ref={root}
    className={`about-beach ${ready && !fallback ? 'about-beach--ready' : ''} ${fallback ? 'about-beach--fallback' : ''}`}
    data-phase={phase} data-selected={selected || ''} data-scene-revision="island-ocean-400-v3"
    aria-busy={!ready && !fallback}>
    <div className="about-beach__loading" role="status" aria-live="polite">
      <svg viewBox="0 0 120 36" aria-hidden="true"><path d="M3 12 Q13 2 23 12 T43 12 T63 12 T83 12 T103 12 M15 28 Q25 18 35 28 T55 28 T75 28 T95 28 T115 28" /></svg>
      <span>{fallback?'海边暂时没有载入，仍可点选下方的故事。':loadingMessage}</span>
    </div>
    <canvas ref={canvas} className="about-beach__canvas" aria-hidden="true" />
    <canvas ref={foreground} className="about-beach__foreground" aria-hidden="true" />
    <h2 className="about-beach__heading" id="studio-about-title">这一切如何发生？</h2>
    <div className="about-beach__objects" aria-label="选择一件海边物品，阅读它背后的故事" inert={phase !== 'overview' ? true : undefined}>
      {notes.map(note => <button key={note.id} ref={node => { entries.current[note.id] = node; }}
        className={`about-beach__object about-beach__object--${note.id}`}
        aria-label={`${note.id === 'website' ? '游泳圈' : '冲浪板'}：${note.title}`}
        aria-controls="about-beach-story" aria-expanded={selected === note.id}
        disabled={!ready && !fallback}
        onPointerEnter={() => hover(note.id)}
        onPointerLeave={() => hover(null)}
        onFocus={() => hover(note.id)}
        onBlur={() => hover(null)}
        onClick={() => open(note.id)}>
      </button>)}
    </div>
    <div className="about-beach__labels" aria-hidden="true">
      <svg className="about-beach__arrows" width="100%" height="100%">
        {notes.map(note=><path key={note.id} ref={node=>{arrows.current[note.id]=node;}} />)}
      </svg>
      {notes.map(note=><div key={note.id} ref={node=>{labels.current[note.id]=node;}}
        className={`about-beach__label about-beach__label--${note.id}`} data-active={hovered===note.id}>
        <svg className="about-beach__marks" viewBox="0 0 46 58">
          <path d="M20 5 Q2 16 15 31 M30 3 Q11 17 24 34" />
          <path d="M30 42 Q38 44 39 53 M24 47 L27 54" />
        </svg>
        <span>{note.id==='website' ? note.title : <>little shark<br/>studio</>}</span>
      </div>)}
    </div>
    {current && <article id="about-beach-story" ref={panel} tabIndex={-1}
      className={`about-beach__story about-beach__story--${current.id}`}
      onTransitionEnd={event => {
        if (event.target === panel.current && event.propertyName === 'opacity' && phaseRef.current === 'reading') {
          panel.current?.focus({ preventScroll: true });
        }
      }}
      aria-labelledby="about-beach-story-title" aria-hidden={phase !== 'reading'}
      inert={phase !== 'reading' ? true : undefined}>
      <h3 id="about-beach-story-title">{current.title}</h3>
      <div className="about-beach__story-body" tabIndex={0} aria-label={`${current.title}，正文`}>
        {current.text.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </div>
      <button className="about-beach__return" onClick={close}><span aria-hidden="true">↶</span> 返回</button>
    </article>}
  </div>;
}
