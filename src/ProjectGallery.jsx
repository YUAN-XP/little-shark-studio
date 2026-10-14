import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { gsap } from 'gsap';
import AccordionGallery from './AccordionGallery.jsx';
import GalleryCompanion from './GalleryCompanion.jsx';
import { afterShift, visibleWindow, wrapIndex } from './gallery-window.js';
import { prepareGalleryImage } from './gallery-images.js';
import './ProjectGallery.css';

function Arrow({ direction }) {
  return <span aria-hidden="true">{direction > 0 ? '>' : '<'}</span>;
}

export default function ProjectGallery({ items, onSelect, reducedMotion = false }) {
  const [start, setStart] = useState(0);
  const [active, setActive] = useState(2);
  const [vertical, setVertical] = useState(false);
  const [ghost, setGhost] = useState(null);
  const [busy, setBusy] = useState(false);
  const root = useRef(null), rail = useRef(null), tween = useRef(null);
  const activeRef = useRef(active), busyRef = useRef(false), arrowPreview = useRef(null);
  const mounted = useRef(false), request = useRef(0);
  const layoutAnimation = useRef(null);
  const count = items.length;
  const visible = useMemo(() => visibleWindow(items, start), [items, start]);
  const changeActive = useCallback(index => {
    if (busyRef.current) return;
    activeRef.current = index;
    setActive(index);
  }, []);
  const selectProject = useCallback((item, index, panel) => {
    if (!busyRef.current) onSelect(item, panel);
  }, [onSelect]);
  useEffect(() => {
    // Warm every cover early, including items outside the five visible slots.
    items.forEach(item => prepareGalleryImage(item.image));
  }, [items]);
  useEffect(() => {
    mounted.current = true;
    const measure = () => setVertical(root.current?.clientWidth < 600);
    measure();
    const observer = new ResizeObserver(measure);
    if (root.current) observer.observe(root.current);
    return () => {
      mounted.current = false;
      request.current++;
      observer.disconnect();
      tween.current?.kill();
    };
  }, []);

  const previewArrow = direction => {
    if (count > 5 || busyRef.current || arrowPreview.current === direction) return;
    arrowPreview.current = direction;
    changeActive(wrapIndex(activeRef.current + direction, visible.length));
  };
  const shift = direction => {
    if (count <= 5) { previewArrow(direction); return; }
    if (busyRef.current) return;
    const next = afterShift(start, activeRef.current, direction, count);
    const incoming = items[next.incoming];
    const ready = prepareGalleryImage(incoming.image);
    const currentRequest = ++request.current;
    busyRef.current = true;
    setBusy(true);

    const begin = () => {
      if (!mounted.current || currentRequest !== request.current) return;
      const gallery = rail.current?.querySelector('.accordion-gallery');
      const panels = gallery?.querySelectorAll('.ag-panel');
      const outgoing = panels?.[direction > 0 ? 0 : panels.length - 1];
      if (!outgoing) { busyRef.current = false; setBusy(false); return; }
      // Complete the whole hover pose, including grayscale and image offset.
      layoutAnimation.current?.finish();
      const bounds = gallery.getBoundingClientRect();
      // Tilt changes projected width; use the unchanged layout width for travel.
      const size = parseFloat(getComputedStyle(outgoing)[vertical ? 'height' : 'width']);
      const step = size + 12;
      const incomingIndex = direction > 0 ? visible.length - 1 : 0;
      const enteringActive = next.active === incomingIndex;
      const mediaSize = gallery.style.getPropertyValue('--ag-media-size');
      const drift = Math.max(-1.5, Math.min(1.5, next.active - incomingIndex));
      flushSync(() => {
        setGhost({ item: incoming, direction, size, step,
          width: bounds.width, height: bounds.height, active: enteringActive,
          mediaSize, mediaShift: enteringActive ? 0 : drift * .5 * parseFloat(mediaSize) * .06,
          imageTransform: outgoing.querySelector('img')?.style.transform });
      });

      const finish = () => {
        if (!mounted.current || currentRequest !== request.current) return;
        // Window layout is placed once, then the rail resets before the next paint.
        flushSync(() => {
          setStart(next.start);
          activeRef.current = next.active;
          setActive(next.active);
          setGhost(null);
          setBusy(false);
        });
        gsap.set(rail.current, { x: 0, y: 0, force3D: true });
        busyRef.current = false;
        tween.current = null;
      };
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) { finish(); return; }
      tween.current = gsap.to(rail.current, { [vertical ? 'y' : 'x']: -direction * step,
        duration: .68, ease: 'power3.inOut', force3D: true, onComplete: finish });
    };
    if (ready.ready) begin();
    else void ready.promise.then(begin);
  };
  if (!count) return null;
  const ghostStyle = ghost ? {
    width: vertical ? ghost.width : ghost.size,
    height: vertical ? ghost.size : ghost.height,
    left: vertical ? 0 : ghost.direction > 0 ? ghost.width + 12 : -ghost.step,
    top: vertical ? ghost.direction > 0 ? ghost.height + 12 : -ghost.step : 0,
    '--ag-media-size': ghost.mediaSize,
    transform: vertical || ghost.active ? 'none' : `rotateY(${ghost.direction > 0 ? -20 : 20}deg)`,
  } : undefined;
  return <div className="project-gallery-composition">
    <GalleryCompanion galleryRef={root} activeProjectId={visible[active]?.id} layoutKey={start}
      moving={busy} reducedMotion={reducedMotion} />
    <div ref={root} className={`project-gallery ${vertical ? 'project-gallery--vertical' : ''}`}
    style={{ '--ag-accent': '#ffd75c', '--ag-overlay': '#000000', '--ag-radius': '22px' }}>
    {[-1, 1].map(direction => <button key={direction}
      className={`gallery-arrow gallery-arrow--${direction < 0 ? 'left' : 'right'}`}
      aria-label={direction > 0 ? '向右切换项目' : '向左切换项目'}
      onPointerEnter={() => previewArrow(direction)}
      onPointerLeave={() => { arrowPreview.current = null; }}
      onFocus={() => previewArrow(direction)}
      onBlur={() => { arrowPreview.current = null; }}
      onClick={() => shift(direction)} disabled={busy}>
      <Arrow direction={direction} />
    </button>)}
    <div className="gallery-viewport">
      <div ref={rail} className="gallery-rail" aria-busy={busy}>
        <AccordionGallery items={visible} defaultIndex={2} expandRatio={.52} trigger="hover"
          accentColor="#ffd75c" overlayColor="#000000" grayscale height={460} gap={12} radius={22}
          tilt={20} orientation={vertical ? 'vertical' : 'horizontal'} activeIndex={active}
          onActiveChange={changeActive} onSelect={selectProject} interactionDisabled={busy}
          animationRef={layoutAnimation} layoutKey={start} />
        {ghost && createPortal(<div style={ghostStyle} aria-hidden="true"
          className={`gallery-ghost ag-panel ${ghost.active ? 'ag-panel--active' : ''}`}>
          <span className="ag-panel__frame">
            <span className="ag-panel__media" style={{
              transform: `translate(-50%, -50%) translate3d(${vertical ? 0 : ghost.mediaShift}px, ${vertical ? ghost.mediaShift : 0}px, 0)`,
              '--ag-gray': ghost.active ? 0 : 1 }}>
              <img src={ghost.item.image} alt="" loading="eager" decoding="async" style={{ transform: ghost.imageTransform }} />
            </span>
            <span className="ag-panel__overlay" />
          </span>
          <span className="ag-panel__spine">{ghost.item.label}</span>
          <span className="ag-panel__label"><span className="ag-panel__bar" /><span className="ag-panel__text">{ghost.item.label}</span></span>
        </div>, rail.current.querySelector('.accordion-gallery'))}
      </div>
    </div>
    <span className="sr-only" role="status" aria-live="polite">当前展开：{visible[active]?.label}。共 {count} 个项目。</span>
    </div>
  </div>;
}
