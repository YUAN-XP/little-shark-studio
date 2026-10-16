import { useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { gsap } from 'gsap';
import { newspaperBlocks, paginateNewspaper } from './newspaper-layout.js';
import { afterPaint, captureGalleryCover, enterNewspaper, leaveNewspaper, preparePaperTarget, turnNewspaper } from './newspaper-motion.js';
import './NewspaperDetail.css';

function Masthead({ project }) {
  return <header className="press-masthead"><strong>LITTLE SHARK GAZETTE</strong>
    <div><span>{project.label}专刊</span><span>{project.role}</span></div></header>;
}

function Photo({ figure, onZoom, probe = false, front = false }) {
  return <figure className={`press-photo${front ? ' press-photo--front' : ''}${figure.sketch ? ' press-photo--sketch' : ''}${figure.tall ? ' press-photo--tall' : ''}`} style={figure.sketch ? { '--press-photo-ratio': figure.height / figure.width } : undefined}>
    <button type="button" tabIndex={probe ? -1 : undefined} onClick={probe ? undefined : event => onZoom(figure, event.currentTarget)}
      aria-label={`放大图片：${figure.alt}`} className="press-photo__frame">
      <img src={figure.src} width={figure.width} height={figure.height} alt={figure.alt} decoding="async" />
      <span className="press-photo__zoom" aria-hidden="true">放大原图 ↗</span>
    </button><figcaption>{figure.caption}</figcaption></figure>;
}

function ResultsTable({ table, compact = false }) {
  return <div className="press-table-wrap"><table className="press-table">
    <caption>{table.caption}</caption><thead><tr>{table.columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
    <tbody>{table.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => cellIndex === 0
      ? <th scope="row" key={cellIndex}>{cell}</th> : <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
  </table>{!compact && table.note && <p className="press-fineprint">{table.note}</p>}</div>;
}

function PressBlock({ block, project, onZoom, onPlay, onJump, probe = false }) {
  if (block.kind === 'masthead') return <Masthead project={project} />;
  if (block.kind === 'guide') return <div className="press-guide">
    <Masthead project={project} />
    <p className="press-eyebrow">创作导读 / DESIGN JOURNAL</p>
    <p className="press-guide__intro">我从故事出发，逐步把人物关系变成空间、道具与操作。这份记录包含剧情和机制的详细说明，也交代我的设计工作与 AI 参与实现的范围。</p>
    <nav className="press-guide__links" aria-label="游戏设计创作导读">
      {block.guide.map((item, index) => <button key={item.sectionId} type="button" tabIndex={probe ? -1 : undefined} onClick={() => onJump(item.sectionId)}>
        <small aria-hidden="true">0{index + 1}</small><strong>{item.title}</strong><span>{item.detail}</span><i aria-hidden="true">→</i>
      </button>)}
    </nav>
  </div>;
  if (block.kind === 'video-intro') return <div className="press-video-intro">
    <Masthead project={project} />
    <header><h2 className="press-project-title" id={probe ? undefined : 'project-detail-title'}>{project.title}</h2></header>
    <nav className="press-front-index" aria-label="影像作品导读"><p className="press-eyebrow">本期导读 / IN THIS ISSUE</p>
      {project.videos.map(film => <button key={film.id} type="button" onClick={() => onJump(`film-${film.id}`)} tabIndex={probe ? -1 : undefined}>
        <strong>{film.title}</strong><span>{film.context}</span><i aria-hidden="true">→</i></button>)}
    </nav>
    <p className="press-copy press-video-intro__copy">{project.intro}</p>
    <div className="press-byline"><span>{project.role}</span><span>{project.period}</span></div>
  </div>;
  if (block.kind === 'cover') return <div className={`press-cover${!block.coverFigure ? ' press-cover--typographic' : ''}${!project.metrics?.length ? ' press-cover--no-metrics' : ''}`}>
    <header><p className="press-eyebrow">{project.english} / 项目记录</p>
      <h2 className={`press-project-title${project.inlineCoverSubtitle ? ' press-project-title--inline' : ''}`} id={probe ? undefined : 'project-detail-title'}>
        {project.inlineCoverSubtitle ? <><span>{project.title}</span><small>{project.fullTitle}</small></> : project.title}
      </h2>{!project.inlineCoverSubtitle && <p className="press-subtitle">{project.fullTitle}</p>}</header>
    {block.coverFigure ? <div className="press-cover__visual">
      <figure><button type="button" className="press-cover__picture" tabIndex={probe ? -1 : undefined}
        aria-label={`放大图片：${block.coverFigure.alt}`} onClick={probe ? undefined : event => onZoom(block.coverFigure,event.currentTarget)}>
        <img src={block.coverFigure.src} width={block.coverFigure.width} height={block.coverFigure.height} alt={block.coverFigure.alt} decoding="async" />
        <span className="press-photo__zoom" aria-hidden="true">放大原图 ↗</span>
      </button>{block.coverFigure.caption && <figcaption>{block.coverFigure.caption}</figcaption>}</figure>
    </div> : <div className="press-cover__record" aria-hidden="true"><span>PROJECT RECORD</span><strong>{project.number}</strong><i>{project.status}</i></div>}
    {project.metrics?.length > 0 && <aside className="press-metrics" aria-label="项目档案">{project.metrics.map(metric =>
      <div key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span></div>)}</aside>}
    <p className="press-cover__intro">{project.intro}</p>
    <div className="press-byline"><span>{project.role}</span><span>{project.period}</span></div>
  </div>;
  if (block.kind === 'overview') return <div className="press-overview">
    <Masthead project={project} />
    {block.featureFigure || block.featureTable ? <section className="press-front-feature">
      <p className="press-eyebrow">过程与记录 / FROM THE PROJECT</p>
      <div className={`press-front-feature__body${block.featureTable && block.featureFigure ? ' press-front-feature__body--comparison' : ''}`}>
        {block.featureFigure && <Photo figure={block.featureFigure} onZoom={onZoom} probe={probe} front />}
        {block.featureTable && <ResultsTable table={block.featureTable} compact />}
      </div>
      {block.featureTable?.note && <p className="press-fineprint">{block.featureTable.note}</p>}
      {block.featureCopy.map(copy => <p key={copy.id} className="press-copy" data-paragraph={copy.paragraphId}>{copy.text}</p>)}
      <button type="button" className="press-read-on" onClick={() => onJump(block.sections[0]?.id)} tabIndex={probe ? -1 : undefined}>继续阅读项目记录 →</button>
    </section> : <section className="press-front-index"><p className="press-eyebrow">本期导读 / IN THIS ISSUE</p>
      <h3>{project.videos?.length ? '影像作品' : '创作记录'}</h3>
      {(project.videos || []).map(film => <button key={film.id} type="button" onClick={() => onJump(`film-${film.id}`)} tabIndex={probe ? -1 : undefined}>
        <strong>{film.title}</strong><span>{film.context}</span><i aria-hidden="true">→</i></button>)}
    </section>}
  </div>;
  if (block.kind === 'heading') return <h3 className="press-project-title press-section-title">{block.title}</h3>;
  if (block.kind === 'subheading') return <h3 className="press-subheading">{block.title}</h3>;
  if (block.kind === 'copy') return <p className="press-copy" data-paragraph={block.paragraphId}>{block.text}</p>;
  if (block.kind === 'figure') return <Photo figure={block.figure} onZoom={onZoom} probe={probe} />;
  if (block.kind === 'table') return <ResultsTable table={block.table} />;
  if (block.kind === 'links') return <ul className="press-links">{block.links.map(link => <li key={link.href}><a href={link.href} target="_blank" rel="noreferrer" tabIndex={probe ? -1 : undefined}>{link.label} ↗</a></li>)}</ul>;
  if (block.kind === 'film') {
    const film = block.film;
    return <section className={`press-film${block.combined ? ' press-film--combined' : ''}`}><header>
      <h3 className="press-project-title press-film__heading" id={probe ? undefined : `film-${film.id}-title`}>
        <span>{film.title}</span><small>{film.context}</small></h3>
      </header>
      <div className="press-film__screen" data-newspaper-flight-target={block.flightTarget || undefined} style={{ '--film-aspect': `${film.width} / ${film.height}` }}>
      {probe ? <img className="press-turn-poster" src={film.poster} alt="" style={{ aspectRatio: `${film.width} / ${film.height}` }} />
        : <video controls playsInline preload="none" src={film.src} poster={film.poster}
          data-poster-width={film.width} data-poster-height={film.height}
          style={{ aspectRatio: `${film.width} / ${film.height}` }} aria-labelledby={`film-${film.id}-title`} onPlay={onPlay}>
          <a href={film.src}>打开{film.title}视频</a></video>}
      </div>
      {block.combined && <div className="press-film__notes" data-film-notes={film.id}>
        {film.productionNotes.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </div>}
    </section>;
  }
  if (block.kind === 'film-notes') return <section className="press-film-notes">
    <p className="press-eyebrow">{block.film.title} / BEHIND THE FRAMES</p><h3 className="press-note-label">制作说明</h3>
    {block.film.productionNotes.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
  </section>;
  return null;
}

function NewspaperReader({ project, dialog, onClose, reducedMotion, controllerRef, shade, flightHost }) {
  const blocks = useMemo(() => newspaperBlocks(project), [project]);
  const book = useRef(null), surface = useRef(null), live = useRef(null), preview = useRef(null), leaf = useRef(null);
  const measure = useRef(null), imageDialog = useRef(null), zoomOrigin = useRef(null), readGeometry = useRef(null);
  const opening = useRef(null), moving = useRef(null), turning = useRef(null), entry = useRef(null), closing = useRef(false);
  const phaseRef = useRef('opening'), spreadRef = useRef(0), pagesRef = useRef(null), geometryRef = useRef(null);
  const [geometry, setGeometry] = useState({ width: 390, height: 480, stacked: false });
  const [pages, setPages] = useState(() => blocks.slice(0,2).map(block => ({ key: block.id, name: block.name, blocks: [block] })));
  const [spread, setSpread] = useState(0), [turn, setTurn] = useState(null), [phase, setPhase] = useState('opening');
  const [hidden, setHidden] = useState(document.hidden), [systemReduced, setSystemReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [zoom, setZoom] = useState(null);
  const spreadCount = Math.ceil(pages.length / 2);
  pagesRef.current = pages; geometryRef.current = geometry;
  const reduced = reducedMotion || systemReduced;
  const motionStopped = reduced || hidden || phase !== 'idle';
  const updatePhase = value => { phaseRef.current = value; setPhase(value); };
  const placeSpread = index => { spreadRef.current = index; setSpread(index); };
  const stopPlayers = () => dialog.current?.querySelectorAll('video').forEach(player => player.pause());
  const revealVideoTarget = () => {
    if (!geometryRef.current.stacked || project.id !== 'video-design') return;
    book.current?.querySelector('[data-newspaper-flight-target]')?.scrollIntoView({ behavior: 'instant', block: 'center' });
  };
  const changeSpread = (index, force = false) => {
    const target = Math.max(0, Math.min(Math.ceil(pagesRef.current.length / 2) - 1, index));
    if (target === spreadRef.current) return Promise.resolve();
    if (turning.current) return turning.current.promise;
    if (!force && (closing.current || phaseRef.current !== 'idle')) return Promise.resolve();
    stopPlayers();
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    turning.current = { promise, resolve, focus: document.activeElement };
    updatePhase(closing.current ? 'returning' : 'turning');
    setTurn({ from: spreadRef.current, to: target, direction: target > spreadRef.current ? 1 : -1 });
    return promise;
  };
  const jumpTo = sectionId => {
    const index = pagesRef.current.findIndex(page => page.blocks.some(block => block.id === sectionId || block.sectionId === sectionId));
    const targetBlock = pagesRef.current[index]?.blocks.find(block => block.id === sectionId || block.sectionId === sectionId);
    if (index >= 0) void changeSpread(Math.floor(index / 2)).then(() => {
      const unit = [...(live.current?.querySelectorAll('[data-unit]') || [])].find(node => node.dataset.unit === targetBlock?.id);
      if (geometryRef.current.stacked) unit?.scrollIntoView({ behavior: 'instant', block: 'start' });
      const player = unit?.querySelector('video');
      if (player) {
        if (geometryRef.current.stacked) player.scrollIntoView({ behavior: 'instant', block: 'center' });
        player.focus({ preventScroll: true });
      }
    });
  };
  const zoomPhoto = (figure, origin) => { zoomOrigin.current = origin; setZoom(figure); };
  const closePhoto = () => { imageDialog.current?.close(); setZoom(null); zoomOrigin.current?.focus({ preventScroll: true }); };
  const playVideo = event => dialog.current?.querySelectorAll('video').forEach(player => {
    if (player !== event.currentTarget) player.pause();
  });
  useEffect(() => {
    const listener = () => { setHidden(document.hidden); if (document.hidden) { stopPlayers(); moving.current?.finish(); turning.current?.task?.finish(); } };
    document.addEventListener('visibilitychange', listener);
    return () => document.removeEventListener('visibilitychange', listener);
  }, []);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = () => setSystemReduced(preference.matches);
    preference.addEventListener('change', listener);
    return () => preference.removeEventListener('change', listener);
  }, []);
  useEffect(() => {
    if (zoom) imageDialog.current?.showModal();
  }, [zoom]);
  useLayoutEffect(() => {
    const node = book.current;
    const readSize = () => {
      const body = node.querySelector('.press-sheet__body');
      const stacked = window.matchMedia('(max-width: 899px)').matches;
      // clientWidth rounds fractional pixels; a slightly wider probe can miss a wrapped line.
      const width = Math.floor(parseFloat(getComputedStyle(body).width) * 64) / 64;
      const height = stacked ? 760 : Math.floor(body.clientHeight);
      if (width > 0 && height > 0 && (geometryRef.current.width !== width || geometryRef.current.height !== height || geometryRef.current.stacked !== stacked)) {
        moving.current?.finish(); turning.current?.task?.finish();
        queueMicrotask(() => { if (!disposed) setGeometry({ width, height, stacked }); });
      }
    };
    readGeometry.current = readSize;
    readSize();
    const observer = new ResizeObserver(readSize); observer.observe(node);
    window.addEventListener('resize', readSize);
    let disposed = false;
    document.fonts.ready.then(() => { if (!disposed) readSize(); });
    return () => { disposed = true; readGeometry.current = null; observer.disconnect(); window.removeEventListener('resize', readSize); };
  }, []);
  useLayoutEffect(() => {
    let disposed = false;
    const paginate = () => {
      if (disposed) return;
      const heights = {};
      measure.current.querySelectorAll('[data-measure-id]').forEach(node => { heights[node.dataset.measureId] = Math.ceil(node.getBoundingClientRect().height); });
      const next = paginateNewspaper(blocks, heights, geometry.height - 3);
      const anchor = pagesRef.current[spreadRef.current * 2]?.blocks[0]?.id;
      const located = next.findIndex(page => page.blocks.some(block => block.id === anchor));
      setPages(next);
      placeSpread(closing.current ? 0 : located < 0 ? Math.min(spreadRef.current, Math.ceil(next.length / 2) - 1) : Math.floor(located / 2));
    };
    paginate(); document.fonts.ready.then(paginate);
    return () => { disposed = true; };
  }, [blocks, geometry]);
  useLayoutEffect(() => {
    if (geometry.stacked) dialog.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [spread, geometry.stacked]);
  useLayoutEffect(() => {
    if (!turn) return;
    const operation = turning.current;
    const task = turnNewspaper({ live: live.current, preview: preview.current, leaf: leaf.current,
      direction: turn.direction, stacked: geometryRef.current.stacked, reduced, signal: entry.current?.signal });
    operation.task = task;
    task.promise.then(completed => {
      if (!completed || entry.current?.signal.aborted) { operation.resolve(); return; }
      flushSync(() => { placeSpread(Math.min(turn.to, Math.ceil(pagesRef.current.length / 2) - 1)); setTurn(null); updatePhase(closing.current ? 'returning' : 'idle'); });
      gsap.set(live.current, { clearProps: 'opacity,transform' });
      turning.current = null;
      if (!operation.focus?.isConnected) book.current.querySelector('[data-return-main]')?.focus({ preventScroll: true });
      operation.resolve();
    });
    return () => { task.cancel(); operation.resolve(); };
  }, [turn]);
  const navigateKey = event => {
    if (event.target.closest?.('video, input, select, textarea') || zoom || event.altKey || event.metaKey || event.ctrlKey) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      void changeSpread(spreadRef.current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  };
  useImperativeHandle(controllerRef, () => ({
    navigateKey,
    enter: options => {
      entry.current = options; closing.current = false; updatePhase('opening');
      opening.current = (async () => {
        await document.fonts.ready;
        await preparePaperTarget(book.current);
        if (options.signal.aborted) return;
        readGeometry.current?.();
        if (!await afterPaint(options.signal, 1)) return;
        revealVideoTarget();
        if (options.source) options.hideSource();
        const task = enterNewspaper({ surface: surface.current, shade: shade.current, host: flightHost.current,
          source: options.source, book: book.current, reduced, signal: options.signal });
        moving.current = task;
        await task.promise;
        if (!options.signal.aborted && !closing.current) {
          flushSync(() => updatePhase('idle'));
          book.current.querySelector('[data-return-main]')?.focus({ preventScroll: true });
        }
      })();
      return opening.current;
    },
    exit: async () => {
      if (closing.current) return;
      closing.current = true; stopPlayers();
      await opening.current;
      await turning.current?.promise;
      if (entry.current?.signal.aborted) return;
      if (spreadRef.current !== 0) await changeSpread(0, true);
      updatePhase('closing');
      dialog.current.scrollTo({ top: 0, behavior: 'instant' });
      revealVideoTarget();
      if (!await afterPaint(entry.current.signal, 1)) return;
      const task = leaveNewspaper({ surface: surface.current, shade: shade.current, host: flightHost.current,
        source: entry.current.source, book: book.current, reduced, signal: entry.current.signal, restoreSource: entry.current.restoreSource });
      moving.current = task;
      await task.promise;
    },
  }));
  const shared = { project, onZoom: zoomPhoto, onPlay: playVideo, onJump: jumpTo };
  const chapterLabels = Array.from({ length: spreadCount }, (_, index) => pages[index * 2].name);
  const renderSpread = (index, ghost = false) => <div ref={ghost ? preview : live}
    className={`press-spread press-spread--${ghost ? 'preview' : 'live'}`} aria-hidden={ghost || undefined} inert={ghost || !!turn || phase !== 'idle'}>
    {[0, 1].map(side => {
      const page = pages[index * 2 + side];
      return <section className={`press-sheet press-sheet--${side === 0 ? 'left' : 'right'}`} key={side}
        aria-label={page?.name || '完'} data-page={index * 2 + side + 1}>
        <header className="press-running-head"><span>{project.english}</span>
          {side === 0 && <span className="press-running-category">{project.label} · 项目记录</span>}
          <button type="button" className={`press-return${side === 0 ? ' press-return--narrow' : ''}`} data-return-main={side === 1 || undefined}
            autoFocus={!ghost && side === 1} tabIndex={ghost ? -1 : undefined} onClick={ghost ? undefined : onClose}>返回主界面</button>
        </header>
        <div className="press-sheet__body">
          {page ? page.blocks.map(block => <div className={`press-unit press-unit--${block.kind}`} data-unit={block.id} key={block.id}>
            <PressBlock block={block} {...shared} probe={ghost} /></div>) : <div className="press-ending"><span>完</span></div>}
        </div>
      </section>;
    })}
  </div>;
  const proximity = event => {
    if (event.pointerType === 'touch') return;
    const rect = surface.current.getBoundingClientRect();
    const near = event.clientX - rect.left < 68 ? 'left' : rect.right - event.clientX < 68 ? 'right' : '';
    if (surface.current.dataset.edge !== near) surface.current.dataset.edge = near;
  };
  return <article className="press-reader" data-project={project.id} data-motion={motionStopped ? 'paused' : 'playing'} data-phase={phase}
    data-spread={spread} data-spread-count={spreadCount} onPointerMove={proximity} onPointerLeave={() => { if (surface.current) surface.current.dataset.edge = ''; }}
    onKeyDown={navigateKey}
    style={{ '--press-content-width': `${geometry.width}px`, '--press-content-height': `${geometry.height}px` }}>
    <div className="press-desk"><div ref={surface} className="press-paper-surface" style={{ opacity: 0 }}>
      <div className="press-book" ref={book} data-turn={turn ? turn.direction > 0 ? 'forward' : 'backward' : undefined}>
        {turn && renderSpread(turn.to, true)}{renderSpread(spread)}
        {turn && <div ref={leaf} className={`press-turn-leaf press-turn-leaf--${turn.direction > 0 ? 'forward' : 'backward'}`} aria-hidden="true" inert />}
      </div>
      {[-1, 1].map(direction => <button type="button" key={direction}
        className={`press-edge press-edge--${direction < 0 ? 'left' : 'right'}`} aria-label={direction > 0 ? '下一版' : '上一版'}
        disabled={phase !== 'idle' || (direction < 0 ? spread === 0 : spread === spreadCount - 1)} onClick={() => changeSpread(spread + direction)}>
        <span className="press-edge__tag" aria-hidden="true">{direction < 0 ? '← 翻页' : '翻页 →'}</span>
        <span className="press-edge__arrow" aria-hidden="true">{direction < 0 ? '‹' : '›'}</span>
      </button>)}
    </div></div>
    <span className="sr-only" role="status" aria-live="polite">{phase === 'turning' ? '正在翻页' : `${project.label} · ${chapterLabels[spread]}`}</span>
    <div className="press-measure" ref={measure} aria-hidden="true" inert>
      {blocks.filter(block => !block.isolated).map(block => <div key={block.id} data-measure-id={block.id}><PressBlock block={block} {...shared} probe /></div>)}
    </div>
    <dialog className="press-lightbox" ref={imageDialog} aria-label="项目图片原图" onCancel={event => { event.preventDefault(); event.stopPropagation(); closePhoto(); }} onClick={event => { if (event.target === event.currentTarget) closePhoto(); }}>
      {zoom && <><header><span>项目图片 · 原图</span><button autoFocus type="button" onClick={closePhoto} aria-label="关闭图片">关闭 ×</button></header>
        <img src={zoom.src} width={zoom.width} height={zoom.height} alt={zoom.alt} />{zoom.caption && <p>{zoom.caption}</p>}<a href={zoom.src} target="_blank" rel="noreferrer">在新窗口查看原图 ↗</a></>}
    </dialog>
  </article>;
}

export default function ProjectDetail({ project, origin: galleryOrigin, onClose, reducedMotion = false }) {
  const dialog = useRef(null), reader = useRef(null), shade = useRef(null), flightHost = useRef(null);
  const closeRef = useRef(onClose), closing = useRef(false);
  const requestClose = async () => {
    if (closing.current) return;
    closing.current = true;
    dialog.current?.querySelectorAll('video').forEach(player => player.pause());
    await reader.current?.exit();
    onClose();
  };
  closeRef.current = requestClose;
  useEffect(() => {
    if (!project) return;
    closing.current = false;
    const node = dialog.current, origin = galleryOrigin || document.activeElement;
    const source = captureGalleryCover(galleryOrigin), signal = new AbortController();
    const visibility = galleryOrigin?.style.visibility;
    const restoreSource = () => { if (galleryOrigin?.isConnected) galleryOrigin.style.visibility = visibility || ''; };
    const overflow = document.body.style.overflow;
    const padding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    const position = { top: window.scrollY, left: window.scrollX, behavior: 'instant' };
    if (scrollbar > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
    node.showModal(); document.body.style.overflow = 'hidden'; window.scrollTo(position);
    void reader.current.enter({ source, signal: signal.signal, restoreSource,
      hideSource: () => { if (galleryOrigin?.isConnected) galleryOrigin.style.visibility = 'hidden'; } });
    return () => {
      signal.abort(); restoreSource();
      node.querySelectorAll('video').forEach(player => player.pause());
      node.close(); document.body.style.overflow = overflow; document.body.style.paddingRight = padding;
      origin?.focus({ preventScroll: true }); window.scrollTo(position);
    };
  }, [project]);
  return <dialog ref={dialog} className="project-detail newspaper-detail" aria-label={project ? `${project.label} · 项目报纸` : '项目报纸'}
    onKeyDown={event => { if (!event.defaultPrevented) reader.current?.navigateKey(event); }}
    onCancel={event => { if (event.target !== event.currentTarget) return; event.preventDefault(); closeRef.current(); }} onClick={event => { if (event.target === event.currentTarget) closeRef.current(); }}>
    <div ref={shade} className="press-darkness" aria-hidden="true" style={{ opacity: 0 }} />
    {project && <NewspaperReader key={project.id} project={project} dialog={dialog} controllerRef={reader} shade={shade} flightHost={flightHost}
      onClose={requestClose} reducedMotion={reducedMotion} />}
    <div ref={flightHost} className="press-flight-host" aria-hidden="true" />
  </dialog>;
}
