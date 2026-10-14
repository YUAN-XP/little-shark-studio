'use client';

// Adapted from the exact React Bits JS-CSS registry. Original and license are
// retained in 06-tools/react-bits. Extensions: controlled selection and details.
import { useRef, useEffect, useLayoutEffect, useState, useCallback, useImperativeHandle } from 'react';
import { gsap } from 'gsap';

import './AccordionGallery.css';

const DEFAULT_ITEMS = [
  { image: 'https://picsum.photos/id/1015/900/1200', label: 'Canyon', link: '#' },
  { image: 'https://picsum.photos/id/1018/900/1200', label: 'Ridgeline', link: '#' },
  { image: 'https://picsum.photos/id/1039/900/1200', label: 'Falls', link: '#' },
  { image: 'https://picsum.photos/id/1043/900/1200', label: 'Harbour', link: '#' },
  { image: 'https://picsum.photos/id/1044/900/1200', label: 'Skyline', link: '#' }
];

const AccordionGallery = ({
  items = DEFAULT_ITEMS,
  defaultIndex = 2,
  accentColor = '#ffffff',
  overlayColor = '#060010',
  textColor = '#ffffff',
  height = 460,
  gap = 10,
  radius = 16,
  expandRatio = 0.52,
  orientation = 'horizontal',
  duration = 0.6,
  ease = 'power3.out',
  parallax = 0.5,
  tilt = 8,
  stagger = 0.06,
  trigger = 'hover',
  showLabels = true,
  grayscale = true,
  className = '',
  activeIndex,
  onActiveChange,
  onSelect,
  interactionDisabled = false,
  animationRef,
  layoutKey = 0
}) => {
  const rootRef = useRef(null);
  const panelRefs = useRef([]);
  const mediaRefs = useRef([]);
  const barRefs = useRef([]);
  const textRefs = useRef([]);
  const tlRef = useRef(null);
  const firstRunRef = useRef(true);
  const mediaSizeRef = useRef(320);
  const layoutKeyRef = useRef(layoutKey);
  const applyLayoutRef = useRef(null);

  const vertical = orientation === 'vertical';
  const count = items.length;
  const [internalActive, setInternalActive] = useState(Math.min(Math.max(defaultIndex, 0), count - 1));
  const active = Math.min(Math.max(activeIndex ?? internalActive, 0), count - 1);
  const setActive = useCallback(index => {
    if (interactionDisabled || index === active) return;
    if (activeIndex === undefined) setInternalActive(index);
    onActiveChange?.(index);
  }, [active, activeIndex, interactionDisabled, onActiveChange]);

  const prefersReduced =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const applyLayout = useCallback(
    animate => {
      const panels = panelRefs.current.slice(0, count);
      if (!panels.length) return;

      const r = Math.min(Math.max(expandRatio, 0.2), 0.9);
      const grow = count > 1 ? (r * (count - 1)) / (1 - r) : 1;
      const mediaSize = mediaSizeRef.current;

      tlRef.current?.kill();
      const dur = animate && !prefersReduced ? duration : 0;
      const tl = dur ? gsap.timeline() : null;
      const place = (targets, values, timing = {}) => {
        if (tl) tl.to(targets, { ...values, duration: dur, ease, ...timing }, 0);
        else gsap.set(targets, values);
      };

      panels.forEach((panel, i) => {
        if (!panel) return;
        const isActive = i === active;
        const media = mediaRefs.current[i];
        const bar = barRefs.current[i];
        const text = textRefs.current[i];

        const rot = isActive ? 0 : i < active ? tilt : -tilt;
        const rotProp = { rotateX: vertical ? -rot : 0, rotateY: vertical ? 0 : rot };

        place(panel, { flexGrow: isActive ? grow : 1, ...rotProp, force3D: true });

        if (media) {
          const drift = Math.max(-1.5, Math.min(1.5, active - i));
          const shift = drift * parallax * mediaSize * 0.06;
          const gray = grayscale ? (isActive ? 0 : 1) : 0;
          place(
            media,
            {
              xPercent: -50,
              yPercent: -50,
              x: vertical ? 0 : isActive ? 0 : shift,
              y: vertical ? (isActive ? 0 : shift) : 0,
              '--ag-gray': gray,
              '--ag-dim': isActive ? 0 : 0.35,
              force3D: true
            }
          );
        }

        if (showLabels && bar && text) {
          if (isActive) {
            place([bar, text], { opacity: 1, x: 0 }, { stagger });
          } else {
            place([bar, text], { opacity: 0, x: -14 }, { duration: dur * 0.6 });
          }
        }
      });

      tlRef.current = tl;
    },
    [
      active,
      count,
      expandRatio,
      duration,
      ease,
      vertical,
      tilt,
      parallax,
      grayscale,
      showLabels,
      stagger,
      prefersReduced
    ]
  );

  useLayoutEffect(() => {
    applyLayoutRef.current = applyLayout;
  }, [applyLayout]);

  // Keep one observer; a selection or carousel commit does not change this box.
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    let previousWidth = el.clientWidth, previousHeight = el.clientHeight;
    const measure = () => {
      const total = vertical ? el.clientHeight : el.clientWidth;
      const usable = Math.max(total - gap * (count - 1), 120);
      const size = Math.max(140, usable * Math.min(Math.max(expandRatio, 0.2), 0.9) * 1.22);
      mediaSizeRef.current = size;
      el.style.setProperty('--ag-media-size', `${size}px`);
    };

    measure();
    const ro = new ResizeObserver(() => {
      if (Math.abs(el.clientWidth - previousWidth) < .5 && Math.abs(el.clientHeight - previousHeight) < .5) return;
      previousWidth = el.clientWidth;
      previousHeight = el.clientHeight;
      measure();
      applyLayoutRef.current?.(false);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [gap, count, expandRatio, vertical]);

  useLayoutEffect(() => {
    const windowChanged = layoutKeyRef.current !== layoutKey;
    applyLayout(!firstRunRef.current && !windowChanged);
    firstRunRef.current = false;
    layoutKeyRef.current = layoutKey;
  }, [applyLayout, layoutKey]);

  useEffect(
    () => () => {
      tlRef.current?.kill();
    },
    []
  );

  useImperativeHandle(animationRef, () => ({
    finish: () => tlRef.current?.progress(1).pause()
  }), []);

  const handleEnter = i => {
    if (trigger === 'hover') setActive(i);
  };

  const handleClick = (i, e) => {
    if (interactionDisabled) { e.preventDefault(); return; }
    if (onSelect) {
      e.preventDefault();
      setActive(i);
      onSelect(items[i], i, e.currentTarget);
      return;
    }
    if (i !== active) {
      e.preventDefault();
      setActive(i);
    }
  };

  const handleKeyDown = (i, e) => {
    if (interactionDisabled) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i + 1) % count);
      panelRefs.current[(i + 1) % count]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i - 1 + count) % count);
      panelRefs.current[(i - 1 + count) % count]?.focus();
    }
  };

  return (
    <div
      ref={rootRef}
      className={`accordion-gallery${vertical ? ' accordion-gallery--vertical' : ''}${className ? ` ${className}` : ''}`}
      style={{
        '--ag-accent': accentColor,
        '--ag-overlay': overlayColor,
        '--ag-text': textColor,
        '--ag-gap': `${gap}px`,
        '--ag-radius': `${radius}px`,
        height: vertical ? `${Math.round(height * 1.6)}px` : `${height}px`
      }}
      role={onSelect ? 'group' : 'list'}
      aria-label="项目手风琴画廊"
    >
      {items.map((item, i) => {
        const isActive = i === active;
        const Tag = onSelect ? 'button' : item.link ? 'a' : 'div';
        return (
          <Tag
            key={item.id || i}
            ref={el => (panelRefs.current[i] = el)}
            className={`ag-panel${isActive ? ' ag-panel--active' : ''}`}
            style={{ borderRadius: `${radius}px` }}
            href={item.link || undefined}
            type={onSelect ? 'button' : undefined}
            onClick={e => handleClick(i, e)}
            onMouseEnter={() => handleEnter(i)}
            onFocus={() => setActive(i)}
            onKeyDown={e => handleKeyDown(i, e)}
            role={onSelect ? undefined : 'listitem'}
            tabIndex={0}
            aria-current={isActive ? 'true' : undefined}
            aria-label={onSelect ? `${item.label}，查看项目详情` : item.label}
            aria-expanded={onSelect ? isActive : undefined}
            aria-haspopup={onSelect ? 'dialog' : undefined}
            data-project-id={item.id}
          >
            <span className="ag-panel__entry" data-motion="card">
            <span className="ag-panel__frame">
              <span className="ag-panel__media" ref={el => (mediaRefs.current[i] = el)}>
                <img data-motion-image src={item.image} alt={item.alt || item.label || ''} draggable="false" loading="eager" decoding="async" />
              </span>
              <span className="ag-panel__overlay" aria-hidden="true" />
            </span>
            <span className="ag-panel__spine" aria-hidden="true">{item.label}</span>
            {showLabels && (
              <span className="ag-panel__label" aria-hidden="true">
                <span className="ag-panel__bar" ref={el => (barRefs.current[i] = el)} />
                <span className="ag-panel__text" ref={el => (textRefs.current[i] = el)}>
                  {item.label}
                </span>
              </span>
            )}
            </span>
          </Tag>
        );
      })}
    </div>
  );
};

export default AccordionGallery;
