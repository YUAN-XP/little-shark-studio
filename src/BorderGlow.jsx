'use client';

// Adapted from the user-provided React Bits BorderGlow (JS + CSS).
// License: licenses/ReactBits-BorderGlow-LICENSE.md.
import { useRef, useCallback, useEffect, forwardRef } from 'react';
import { pointerGlowPose } from './border-glow-pointer.js';
import './BorderGlow.css';

function parseHSL(hslStr) {
  const match = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!match) return { h: 40, s: 80, l: 80 };
  return { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) };
}

function buildGlowVars(glowColor, intensity) {
  const { h, s, l } = parseHSL(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const opacities = [100, 60, 50, 40, 30, 20, 10];
  const keys = ['', '-60', '-50', '-40', '-30', '-20', '-10'];
  const vars = {};
  for (let i = 0; i < opacities.length; i++) {
    vars[`--glow-color${keys[i]}`] = `hsl(${base} / ${Math.min(opacities[i] * intensity, 100)}%)`;
  }
  return vars;
}

const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
const GRADIENT_KEYS = ['--gradient-one', '--gradient-two', '--gradient-three', '--gradient-four', '--gradient-five', '--gradient-six', '--gradient-seven'];
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

function buildGradientVars(colors) {
  const vars = {};
  for (let i = 0; i < 7; i++) {
    const c = colors[Math.min(COLOR_MAP[i], colors.length - 1)];
    vars[GRADIENT_KEYS[i]] = `radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${c} 0px, transparent 50%)`;
  }
  vars['--gradient-base'] = `linear-gradient(${colors[0]} 0 100%)`;
  return vars;
}

function isLightColor(color) {
  const value = color.trim().replace('#', '');
  if (!/^[\da-f]{3}([\da-f]{3})?$/i.test(value)) return false;
  const hex = value.length === 3 ? value.split('').map(char => char + char).join('') : value;
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  return red * 0.2126 + green * 0.7152 + blue * 0.0722 > 180;
}

function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
function easeInCubic(x) { return x * x * x; }

function animateValue({ start = 0, end = 100, duration = 1000, delay = 0, ease = easeOutCubic, onUpdate, onEnd }) {
  const t0 = performance.now() + delay;
  let frame = 0, cancelled = false;
  function tick() {
    if (cancelled) return;
    const elapsed = performance.now() - t0;
    const t = Math.min(elapsed / duration, 1);
    onUpdate(start + (end - start) * ease(t));
    if (t < 1) frame = requestAnimationFrame(tick);
    else if (onEnd) onEnd();
  }
  const timer = setTimeout(() => { frame = requestAnimationFrame(tick); }, delay);
  return () => { cancelled = true; clearTimeout(timer); cancelAnimationFrame(frame); };
}

const BorderGlow = forwardRef(function BorderGlow({
  as: Tag = 'div',
  innerAs: Inner = 'div',
  children,
  className = '',
  edgeSensitivity = 30,
  glowColor = '40 80 80',
  backgroundColor = '#120F17',
  borderRadius = 28,
  glowRadius = 40,
  glowIntensity = 1.0,
  coneSpread = 25,
  animated = false,
  colors = ['#c084fc', '#f472b6', '#38bdf8'],
  fillOpacity = 0.5,
  style,
  onPointerMove,
  onPointerLeave,
  onFocus,
  onBlur,
  ...domProps
}, forwardedRef) {
  const cardRef = useRef(null);
  const pointerFrame = useRef(0), pointer = useRef(null);
  const animations = useRef([]), hasSwept = useRef(false);
  const setCardRef = useCallback(node => {
    cardRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);
  const stopSweep = useCallback(() => {
    animations.current.forEach(cancel => cancel());
    animations.current = [];
    cardRef.current?.classList.remove('sweep-active');
  }, []);

  const handlePointerMove = useCallback((e) => {
    const card = cardRef.current;
    onPointerMove?.(e);
    if (!card || e.pointerType === 'touch') return;
    stopSweep();
    pointer.current = { x: e.clientX, y: e.clientY };
    if (pointerFrame.current) return;
    pointerFrame.current = requestAnimationFrame(() => {
      pointerFrame.current = 0;
      if (!cardRef.current || !pointer.current) return;
      const { edge, angle } = pointerGlowPose(cardRef.current.getBoundingClientRect(), pointer.current.x, pointer.current.y);
      cardRef.current.style.setProperty('--edge-proximity', edge.toFixed(3));
      cardRef.current.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
    });
  }, [onPointerMove, stopSweep]);
  const handlePointerLeave = e => {
    cancelAnimationFrame(pointerFrame.current);
    pointerFrame.current = 0;
    stopSweep();
    cardRef.current?.style.setProperty('--edge-proximity', '0');
    onPointerLeave?.(e);
  };

  useEffect(() => {
    if (!animated || !cardRef.current || hasSwept.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    hasSwept.current = true;
    const card = cardRef.current;
    const angleStart = 110;
    const angleEnd = 465;
    card.classList.add('sweep-active');
    card.style.setProperty('--cursor-angle', `${angleStart}deg`);

    animations.current = [
    animateValue({ duration: 500, onUpdate: v => card.style.setProperty('--edge-proximity', v) }),
    animateValue({ ease: easeInCubic, duration: 1500, end: 50, onUpdate: v => {
      card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (v / 100) + angleStart}deg`);
    }}),
    animateValue({ ease: easeOutCubic, delay: 1500, duration: 2250, start: 50, end: 100, onUpdate: v => {
      card.style.setProperty('--cursor-angle', `${(angleEnd - angleStart) * (v / 100) + angleStart}deg`);
    }}),
    animateValue({ ease: easeInCubic, delay: 2500, duration: 1500, start: 100, end: 0,
      onUpdate: v => card.style.setProperty('--edge-proximity', v),
      onEnd: () => card.classList.remove('sweep-active'),
    })];
    return stopSweep;
  }, [animated, stopSweep]);
  useEffect(() => () => { cancelAnimationFrame(pointerFrame.current); stopSweep(); }, [stopSweep]);

  const glowVars = buildGlowVars(glowColor, glowIntensity);
  const lightSurface = isLightColor(backgroundColor);

  return (
    <Tag
      {...domProps}
      ref={setCardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onFocus={event => {
        stopSweep();
        onFocus?.(event);
      }}
      onBlur={event => {
        onBlur?.(event);
      }}
      className={`border-glow-card${lightSurface ? ' border-glow-card--light' : ''} ${className}`}
      style={{
        '--card-bg': backgroundColor,
        '--edge-sensitivity': edgeSensitivity,
        '--border-radius': `${borderRadius}px`,
        '--glow-padding': `${glowRadius}px`,
        '--cone-spread': coneSpread,
        '--fill-opacity': fillOpacity,
        ...glowVars,
        ...buildGradientVars(colors),
        ...style,
      }}
    >
      <span className="edge-light" aria-hidden="true" />
      <Inner className="border-glow-inner">
        {children}
      </Inner>
    </Tag>
  );
});

export default BorderGlow;

