import { useEffect, useId, useRef, useState } from 'react';
import { COMPANION_EYES, gazeToward } from './gallery-gaze.js';
import './GalleryCompanion.css';

const PORTRAIT = `${import.meta.env.BASE_URL}media/gallery-companion/character-v7.png`;

export default function GalleryCompanion({ galleryRef, activeProjectId, layoutKey, moving, reducedMotion = false }) {
  const root = useRef(null), eyes = useRef(null), pupils = useRef([]);
  const wake = useRef(() => {}), forceReduced = useRef(reducedMotion);
  const [imageReady, setImageReady] = useState(false);
  forceReduced.current = reducedMotion;
  const id = `companion-${useId().replaceAll(':', '')}`;

  useEffect(() => {
    const element = root.current, svg = eyes.current, gallery = galleryRef.current;
    if (!element || !svg || !gallery) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, followUntil = 0, previousTime = 0, visible = false, disposed = false;
    const current = COMPANION_EYES.map(() => ({ x: 0, y: 0, scaleX: 1 }));
    let desired = current.map(p => ({ ...p }));

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      element.dataset.gazeState = 'idle';
    };
    const sample = () => {
      const panel = gallery.querySelector('.ag-panel--active[data-project-id]');
      const matrix = svg.getScreenCTM();
      if (!panel || !matrix || !svg.clientWidth) return;
      const bounds = panel.getBoundingClientRect();
      const point = svg.createSVGPoint();
      point.x = bounds.left + bounds.width / 2;
      point.y = bounds.top + bounds.height * .35;
      const target = point.matrixTransform(matrix.inverse());
      desired = COMPANION_EYES.map(eye => gazeToward(eye, target));
      element.dataset.gazeTarget = panel.dataset.projectId;
    };
    const tick = now => {
      frame = 0;
      if (disposed || !visible || document.hidden) { stop(); return; }
      const following = now <= followUntil;
      if (following) sample();
      const delta = previousTime ? Math.min(40, now - previousTime) : 16;
      previousTime = now;
      const amount = forceReduced.current || preference.matches ? 1 : 1 - Math.exp(-delta / 62);
      let difference = 0;
      current.forEach((p, index) => {
        const target = desired[index];
        for (const key of ['x', 'y', 'scaleX']) {
          p[key] += (target[key] - p[key]) * amount;
          difference = Math.max(difference, Math.abs(target[key] - p[key]));
        }
        pupils.current[index]?.setAttribute('transform', `translate(${p.x.toFixed(3)} ${p.y.toFixed(3)}) scale(${p.scaleX.toFixed(4)} 1)`);
      });
      if (following || difference > .008) {
        element.dataset.gazeState = 'following';
        frame = requestAnimationFrame(tick);
      } else stop();
    };
    const follow = (duration = 850) => {
      if (disposed) return;
      followUntil = Math.max(followUntil, performance.now() + duration);
      if (visible && !document.hidden && !frame) frame = requestAnimationFrame(tick);
    };
    wake.current = follow;
    const intersection = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) follow();
      else stop();
    }, { rootMargin: '100px' });
    intersection.observe(element);
    const resize = new ResizeObserver(() => follow(300));
    resize.observe(element);
    resize.observe(gallery);
    const onScroll = () => follow(160);
    const onVisibility = () => { if (document.hidden) stop(); else follow(300); };
    const onPreference = () => follow(50);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    preference.addEventListener('change', onPreference);
    follow();
    return () => {
      disposed = true;
      stop();
      intersection.disconnect();
      resize.disconnect();
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      preference.removeEventListener('change', onPreference);
      wake.current = () => {};
    };
  }, [galleryRef, imageReady]);

  useEffect(() => { wake.current(850); }, [activeProjectId, layoutKey, moving, reducedMotion, imageReady]);

  return <div ref={root} className="gallery-companion" aria-hidden="true" data-gaze-state="idle">
    <svg className="gallery-companion__desk" viewBox="0 0 1000 14" preserveAspectRatio="none" focusable="false">
      <path d="M1 7 C210 3 405 10 588 6 S815 7 999 5" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
    <div className="gallery-companion__art">
      <img src={PORTRAIT} width="1536" height="1024" alt="" draggable="false" loading="lazy" decoding="async" onLoad={() => setImageReady(true)} />
      <svg ref={eyes} className="gallery-companion__eyes" viewBox="0 0 1536 1024" focusable="false">
        <defs>{COMPANION_EYES.map((eye, index) => <clipPath key={index} id={`${id}-eye-${index}`}>
          <path d={eye.outline} />
        </clipPath>)}</defs>
        {imageReady && COMPANION_EYES.map((eye, index) => <g key={index} clipPath={`url(#${id}-eye-${index})`}>
          <path d={eye.outline} fill="#fff9ef" />
          <g transform={`translate(${eye.x} ${eye.y}) rotate(${eye.angle})`}>
            <g className="gallery-companion__pupil" ref={el => { pupils.current[index] = el; }} transform="translate(0 0) scale(1 1)">
              <ellipse rx="20" ry="22" fill="#372a27" />
              <ellipse cx="0" cy="9" rx="14" ry="7" fill="#584139" opacity=".5" />
              <ellipse rx="12" ry="15" fill="#171518" />
              <circle cx="5" cy="-7" r="3.3" fill="#fff8ed" />
            </g>
          </g>
        </g>)}
      </svg>
    </div>
  </div>;
}
