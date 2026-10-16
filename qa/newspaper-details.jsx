import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { projects } from '../src/content.js';
import ProjectDetail from '../src/ProjectDetailLoader.jsx';
import '../src/styles.css';
import '../src/ProjectGallery.css';
function DetailCheck() {
  const [project, setProject] = useState(null), [reducedMotion, setReducedMotion] = useState(false);
  const origin = useRef(null), transitionLog = useRef(null);
  const [mediaStatus, setMediaStatus] = useState('尚未播放');
  useEffect(() => {
    const tracked = new Map();
    const observePlayers = () => document.querySelectorAll('.press-film video').forEach(player => {
      if (tracked.has(player)) return;
      const record = event => setMediaStatus(`${player.getAttribute('aria-labelledby')} · ${event.type} · paused=${player.paused} · time=${player.currentTime.toFixed(2)}`);
      player.addEventListener('play', record); player.addEventListener('pause', record); tracked.set(player, record);
    });
    const observer = new MutationObserver(observePlayers); observer.observe(document.body, { childList: true, subtree: true }); observePlayers();
    return () => { observer.disconnect(); tracked.forEach((record, player) => { player.removeEventListener('play', record); player.removeEventListener('pause', record); }); };
  }, []);
  useEffect(() => {
    let frame = 0, samples = [], lastKey = '', started = performance.now();
    const sample = () => {
      const reader = document.querySelector('.press-reader');
      const flight = document.querySelector('.press-image-flight');
      const leaf = document.querySelector('.press-turn-leaf');
      const shade = document.querySelector('.press-darkness');
      const key = `${reader?.dataset.project}/${reader?.dataset.phase}/${reader?.dataset.spread}`;
      const rect = flight?.getBoundingClientRect();
      if (key !== lastKey || (reader && reader.dataset.phase !== 'idle')) {
        samples.push({ ms: Math.round(performance.now() - started), phase: reader?.dataset.phase || 'closed',
          project: reader?.dataset.project, spread: reader?.dataset.spread, shade: shade ? Number(getComputedStyle(shade).opacity) : 0,
          paper: reader ? Number(getComputedStyle(reader.querySelector('.press-paper-surface')).opacity) : 0,
          flight: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height, filter: getComputedStyle(flight).filter } : null,
          leaf: leaf ? getComputedStyle(leaf).transform : null });
        if (samples.length > 1000) samples.shift();
        transitionLog.current.textContent = JSON.stringify(samples);
        lastKey = key;
      }
      frame = requestAnimationFrame(sample);
    };
    frame = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <main style={{ padding: 24 }}><h1>项目报纸详情检查</h1>
    <label><input type="checkbox" checked={reducedMotion} onChange={event => setReducedMotion(event.target.checked)} /> 减少动态</label>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>{projects.map(item => <button key={item.id}
      style={{ width: 170, padding: 0, borderRadius: 12, overflow: 'hidden', color: '#fff', background: '#12394e' }}
      onClick={event => { origin.current = event.currentTarget; setProject(item); }}>
      <span data-cover-frame style={{ display: 'block', height: 150, overflow: 'hidden' }}><img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></span>
      <span style={{ display: 'block', padding: 12 }}>{item.label}</span></button>)}</div>
    <p data-testid="media-status" role="status">{mediaStatus}</p>
    <output ref={transitionLog} data-testid="transition-log" hidden />
    <ProjectDetail project={project} origin={origin.current} onClose={() => setProject(null)} reducedMotion={reducedMotion} />
  </main>;
}
createRoot(document.getElementById('root')).render(<DetailCheck />);
