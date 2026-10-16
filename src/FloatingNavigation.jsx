import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import GlassSurface from './GlassSurface.jsx';
import './FloatingNavigation.css';

const items = [['me', '我'], ['work', '项目集'], ['about', '关于'], ['contact', '联系']];

export default function FloatingNavigation({ scrolled, active, logo, menuOpen, onMenuToggle, onMenuClose, reducedMotion, surfaceTone = 'light' }) {
  const header = useRef(null), navigation = useRef(null), links = useRef(new Map());
  const pointerFrame = useRef(0), pointer = useRef(null), updateIndicator = useRef(null);
  const [hovered, setHovered] = useState(null), [focused, setFocused] = useState(null);
  const highlighted = hovered || focused || active;

  updateIndicator.current = () => {
    const root = header.current, nav = navigation.current, target = links.current.get(highlighted);
    if (!root || !nav) return;
    if (!scrolled || !target || !nav.clientWidth) {
      root.style.setProperty('--nav-indicator-opacity', '0');
      return;
    }
    root.style.setProperty('--nav-indicator-x', `${target.offsetLeft}px`);
    root.style.setProperty('--nav-indicator-width', `${target.offsetWidth}px`);
    root.style.setProperty('--nav-indicator-opacity', '1');
  };
  useLayoutEffect(() => { updateIndicator.current?.(); }, [highlighted, scrolled, menuOpen]);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => updateIndicator.current?.());
    if (navigation.current) observer.observe(navigation.current);
    links.current.forEach(link => observer.observe(link));
    return () => observer.disconnect();
  }, []);


  const resetLight = () => {
    cancelAnimationFrame(pointerFrame.current);
    pointerFrame.current = 0;
    pointer.current = null;
    header.current?.style.setProperty('--nav-light-opacity', '0');
  };
  useEffect(() => {
    if (reducedMotion || !scrolled) resetLight();
    return resetLight;
  }, [reducedMotion, scrolled]);

  const moveLight = event => {
    if (!scrolled || reducedMotion || event.pointerType === 'touch') return;
    pointer.current = { x: event.clientX, y: event.clientY };
    if (pointerFrame.current) return;
    pointerFrame.current = requestAnimationFrame(() => {
      pointerFrame.current = 0;
      const surface = header.current?.querySelector('.nav-island-glass');
      const point = pointer.current;
      if (!surface || !point) return;
      const rect = surface.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = Math.max(0, Math.min(100, (point.x - rect.left) / rect.width * 100));
      const y = Math.max(0, Math.min(100, (point.y - rect.top) / rect.height * 100));
      header.current.style.setProperty('--nav-light-x', `${x.toFixed(2)}%`);
      header.current.style.setProperty('--nav-light-y', `${y.toFixed(2)}%`);
      header.current.style.setProperty('--nav-light-opacity', '1');
    });
  };

  return <header ref={header} className={`header liquid-nav${scrolled ? ' header-scrolled' : ''}`} data-page={active} data-surface={surfaceTone}
    data-reduced-motion={reducedMotion || undefined}
    onKeyDown={event => { if (event.key === 'Escape') onMenuClose(); }}>
    <div className="header-frame" onPointerMove={moveLight} onPointerLeave={resetLight}>
      <GlassSurface width="100%" height="auto" borderRadius={999} className="nav-island-glass"
        refraction={scrolled} borderWidth={.12} blur={7} displace={.45}
        distortionScale={-88} redOffset={0} greenOffset={4} blueOffset={8}
        brightness={50} opacity={.96} mixBlendMode="difference"
        backgroundOpacity={.06} saturation={1.3}>
        <div className="header-inner page-width">
          <a href="#home" className="brand" aria-label="Little Shark Studio，回到首页" onClick={onMenuClose}>
            <img className="brand-logo" src={logo} alt="" width="48" height="48" />
          </a>
          <button className="mobile-menu icon-button" type="button" aria-label={menuOpen ? '关闭导航' : '打开导航'}
            aria-expanded={menuOpen} aria-controls="main-navigation" onClick={onMenuToggle}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              {menuOpen ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
          <nav ref={navigation} id="main-navigation" className={`navigation${menuOpen ? ' navigation-open' : ''}`} aria-label="主导航"
            onPointerLeave={() => setHovered(null)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(null); }}>
            <span className="nav-liquid-indicator" aria-hidden="true" />
            {items.map(([id, label]) => <a key={id} ref={node => { if (node) links.current.set(id, node); else links.current.delete(id); }}
              href={`#${id}`} className={active === id ? 'nav-active' : ''} aria-current={active === id ? 'location' : undefined}
              onPointerEnter={event => { if (event.pointerType !== 'touch') setHovered(id); }} onFocus={event => { if (event.currentTarget.matches(':focus-visible')) setFocused(id); }}
              onClick={() => { setHovered(null); onMenuClose(); }}><span>{label}</span></a>)}
          </nav>
        </div>
      </GlassSurface>
    </div>
  </header>;
}
