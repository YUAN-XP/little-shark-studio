import { useEffect, useRef, useState } from 'react';
import './AboutBeach.css';

const asset = name => `${import.meta.env.BASE_URL}media/about/${name}`;

export default function AboutBeach({ notes, reducedMotion = false }) {
  const root = useRef(null), canvas = useRef(null), foreground = useRef(null), engine = useRef(null);
  const entries = useRef({}), panel = useRef(null), closeTimer = useRef(null);
  const [ready, setReady] = useState(false), [fallback, setFallback] = useState(false);
  const [phase, setPhase] = useState('overview'), [selected, setSelected] = useState(null);
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
    const element = root.current;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => {
      reduceRef.current = preferenceRef.current || preference.matches;
      element.dataset.reducedMotion = String(reduceRef.current);
      engine.current?.setReducedMotion(reduceRef.current);
    };
    syncPreference();
    const syncVisibility = () => engine.current?.setVisible(visible && !document.hidden);
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
          onFrame: ({ bounds, reading, time, angle, progress, worldSignature }) => {
            for (const [key, box] of Object.entries(bounds)) {
              const button = entries.current[key];
              if (!button) continue;
              Object.assign(button.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
            }
            if (reading) {
              for (const [name, value] of Object.entries(reading)) element.style.setProperty(`--reading-${name}`, `${value}px`);
            }
            element.dataset.waveTime = time.toFixed(2);
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
        instance.setVisible(visible && !document.hidden);
        setReady(true);
      } catch (error) {
        if (!disposed) { console.warn('Beach scene uses its accessible still-image fallback.', error); setFallback(true); }
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
    data-phase={phase} data-selected={selected || ''}>
    <img className="about-beach__poster" src={asset('about-beach-approved-v1.webp')}
      alt="手绘海滩上，游泳圈与冲浪板分别朝向两侧。" loading="lazy" width="1672" height="941" />
    <canvas ref={canvas} className="about-beach__canvas" aria-hidden="true" />
    <canvas ref={foreground} className="about-beach__foreground" aria-hidden="true" />
    <h2 className="about-beach__heading" id="studio-about-title">这一切如何发生？</h2>
    <div className="about-beach__objects" aria-label="选择一件海边物品，阅读它背后的故事" inert={phase !== 'overview' ? true : undefined}>
      {notes.map(note => <button key={note.id} ref={node => { entries.current[note.id] = node; }}
        className={`about-beach__object about-beach__object--${note.id}`}
        aria-label={`${note.id === 'website' ? '游泳圈' : '冲浪板'}：${note.title}`}
        aria-controls="about-beach-story" aria-expanded={selected === note.id}
        disabled={!ready && !fallback}
        onPointerEnter={() => engine.current?.setHover(note.id)}
        onPointerLeave={() => engine.current?.setHover(null)}
        onFocus={() => engine.current?.setHover(note.id)}
        onBlur={() => engine.current?.setHover(null)}
        onClick={() => open(note.id)}>
        <span className="about-beach__object-label">{note.title}</span>
      </button>)}
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
