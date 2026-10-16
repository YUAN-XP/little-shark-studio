import { gsap } from 'gsap';
import { bitmapInFrame, paperMediaAsset, rectValues } from './newspaper-image-geometry.js';

const COLOR_FILTER = 'grayscale(0) sepia(0) contrast(1)';

export function captureGalleryCover(panel) {
  if (!panel?.isConnected) return null;
  const frame = panel.querySelector('.ag-panel__frame, [data-cover-frame]');
  const image = frame?.querySelector('img');
  if (!image?.complete || !image.naturalWidth) return null;
  const rect = rectValues(frame.getBoundingClientRect());
  const crop = bitmapInFrame(rect, rectValues(image.getBoundingClientRect()), { width: image.naturalWidth, height: image.naturalHeight });
  if (!crop) return null;
  const media = image.closest('.ag-panel__media') || image;
  return { panel, rect, crop, src: image.currentSrc || image.src,
    radius: parseFloat(getComputedStyle(panel).borderRadius) || 0,
    filter: getComputedStyle(media).filter === 'none' ? COLOR_FILTER : `${getComputedStyle(media).filter} sepia(0) contrast(1)` };
}

export function paperCoverGeometry(book) {
  const frame = book.querySelector('[data-newspaper-flight-target], .press-cover__picture');
  const image = frame?.querySelector('img, video');
  const asset = paperMediaAsset(image);
  if (!frame || !asset) return null;
  const rect = rectValues(frame.getBoundingClientRect());
  const fit = getComputedStyle(image).objectFit;
  const crop = bitmapInFrame(rect, rectValues(image.getBoundingClientRect()), asset, [.5,.5], fit);
  return crop ? { frame, rect, crop, src: asset.src, fit, radius: 0, filter: getComputedStyle(image).filter } : null;
}

export async function preparePaperTarget(book) {
  const media = book?.querySelector('[data-newspaper-flight-target] video, .press-cover__picture img');
  if (!media) return;
  if (media.tagName === 'VIDEO') {
    const poster = new Image();
    poster.src = media.poster;
    await poster.decode().catch(() => {});
  } else await media.decode().catch(() => {});
}

export function afterPaint(signal, frames = 2) {
  return new Promise(resolve => {
    let frame;
    const abort = () => { cancelAnimationFrame(frame); resolve(false); };
    const next = () => {
      if (signal?.aborted) { abort(); return; }
      if (--frames <= 0) { signal?.removeEventListener('abort', abort); resolve(true); }
      else frame = requestAnimationFrame(next);
    };
    signal?.addEventListener('abort', abort, { once: true });
    frame = requestAnimationFrame(next);
  });
}

export function paperTimeline(build, signal) {
  let settled = false, resolve, frame;
  const promise = new Promise(done => { resolve = done; });
  const complete = result => { if (settled) return; settled = true; cancelAnimationFrame(frame); signal?.removeEventListener('abort', abort); resolve(result); };
  const timeline = gsap.timeline({ paused: true, onComplete: () => complete(true) });
  const abort = () => { timeline.kill(); complete(false); };
  build(timeline);
  // A throttled frame must not stretch a one-second transition into a minute.
  // Keep GSAP's easing, but advance this local timeline by real elapsed time.
  const started = performance.now(), duration = timeline.duration();
  const tick = () => {
    if (settled) return;
    const elapsed = Math.min(duration, (performance.now() - started) / 1000);
    timeline.totalTime(elapsed, false);
    if (elapsed >= duration) complete(true);
    else frame = requestAnimationFrame(tick);
  };
  if (signal?.aborted) abort();
  else if (!duration) { timeline.totalTime(0, false); complete(true); }
  else { signal?.addEventListener('abort', abort, { once: true }); frame = requestAnimationFrame(tick); }
  return { promise, finish: () => { if (!settled) { timeline.totalTime(duration, false); complete(true); } }, cancel: abort };
}

function imageFlight(host, source) {
  const frame = document.createElement('div'); frame.className = 'press-image-flight';
  const image = document.createElement('img'); image.src = source.src; image.alt = ''; image.draggable = false;
  frame.append(image); host.replaceChildren(frame);
  gsap.set(frame, { left: source.rect.left, top: source.rect.top, width: source.rect.width,
    height: source.rect.height, borderRadius: source.radius, filter: source.filter, opacity: 1 });
  gsap.set(image, { left: source.crop.x, top: source.crop.y, width: source.crop.width, height: source.crop.height });
  return { frame, image };
}

function moveImage(timeline, flight, target, at, duration) {
  timeline.to(flight.frame, { left: target.rect.left, top: target.rect.top, width: target.rect.width,
    height: target.rect.height, borderRadius: target.radius, filter: target.filter, duration, ease: 'power2.inOut' }, at);
  timeline.to(flight.image, { left: target.crop.x, top: target.crop.y, width: target.crop.width,
    height: target.crop.height, duration, ease: 'power2.inOut' }, at);
}

function changeFlightBitmap(timeline, flight, target, at) {
  const image = document.createElement('img'); image.src = target.src; image.alt = '';
  flight.frame.append(image);
  gsap.set(image, { left: 0, top: 0, width: '100%', height: '100%', objectFit: target.fit || 'cover', opacity: 0 });
  timeline.to(flight.image, { opacity: 0, duration: .4 }, at);
  timeline.to(image, { opacity: 1, duration: .4 }, at);
}

export function enterNewspaper({ surface, shade, host, source, book, reduced, signal }) {
  const target = paperCoverGeometry(book);
  gsap.set(surface, { opacity: 0 }); gsap.set(shade, { opacity: 0 });
  if (reduced) {
    gsap.set(surface, { opacity: 1 }); gsap.set(shade, { opacity: 1 });
    return paperTimeline(timeline => timeline.set(surface, { opacity: 1 }), signal);
  }
  const flight = source && target ? imageFlight(host, source) : null;
  if (flight) target.frame.style.visibility = 'hidden';
  const task = paperTimeline(timeline => {
    timeline.to(shade, { opacity: 1, duration: .4, ease: 'sine.out' }, 0);
    if (flight) {
      const changed = source.src !== target.src;
      const crop = changed ? bitmapInFrame(target.rect,target.rect,{width:source.crop.width,height:source.crop.height}) : target.crop;
      moveImage(timeline, flight, { ...target,crop }, .16, .88);
      if(changed)changeFlightBitmap(timeline,flight,target,.52);
      timeline.to(surface, { opacity: 1, duration: .38, ease: 'sine.inOut' }, .94);
      timeline.call(() => { target.frame.style.visibility = ''; }, [], 1.27);
      timeline.to(flight.frame, { opacity: 0, duration: .12 }, 1.27);
    } else timeline.to(surface, { opacity: 1, duration: .45, ease: 'sine.inOut' }, .15);
  }, signal);
  task.promise.finally(() => { if (target) target.frame.style.visibility = ''; host.replaceChildren(); });
  return task;
}

export function leaveNewspaper({ surface, shade, host, source, book, reduced, signal, restoreSource }) {
  const paper = paperCoverGeometry(book), target = captureGalleryCover(source?.panel);
  if (reduced) {
    restoreSource(); gsap.set(surface, { opacity: 0 }); gsap.set(shade, { opacity: 0 });
    return paperTimeline(timeline => timeline.set(surface, { opacity: 0 }), signal);
  }
  const flight = paper && target ? imageFlight(host, paper) : null;
  if (flight) paper.frame.style.visibility = 'hidden';
  const task = paperTimeline(timeline => {
    timeline.to(surface, { opacity: 0, duration: .3, ease: 'sine.inOut' }, 0);
    if (flight) {
      const changed = paper.src !== target.src;
      const crop = changed ? bitmapInFrame(target.rect,target.rect,{width:paper.crop.width,height:paper.crop.height},[.5,.5],paper.fit) : target.crop;
      moveImage(timeline, flight, { ...target,crop }, .26, .85);
      if(changed)changeFlightBitmap(timeline,flight,target,.54);
      timeline.call(restoreSource, [], 1.11);
      timeline.to(flight.frame, { opacity: 0, duration: .12 }, 1.11);
      timeline.to(shade, { opacity: 0, duration: .4, ease: 'sine.inOut' }, 1.12);
    } else {
      timeline.call(restoreSource, [], .3);
      timeline.to(shade, { opacity: 0, duration: .35 }, .3);
    }
  }, signal);
  task.promise.finally(() => { if (paper) paper.frame.style.visibility = ''; host.replaceChildren(); });
  return task;
}

function staticSheet(sheet) {
  const clone = sheet.cloneNode(true);
  clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
  clone.querySelectorAll('video').forEach(video => {
    const poster = document.createElement('img'); poster.src = video.poster; poster.alt = '';
    poster.className = 'press-turn-poster'; poster.style.aspectRatio = video.style.aspectRatio;
    video.replaceWith(poster);
  });
  clone.inert = true; clone.setAttribute('aria-hidden', 'true');
  return clone;
}

export function turnNewspaper({ live, preview, leaf, direction, stacked, reduced, signal }) {
  if (reduced) return paperTimeline(timeline => timeline.set(preview, { opacity: 1 }), signal);
  if (stacked) return paperTimeline(timeline => {
    timeline.to(live, { opacity: 0, x: direction * -18, duration: .18, ease: 'sine.in' });
    timeline.fromTo(preview, { opacity: 0, x: direction * 18 }, { opacity: 1, x: 0, duration: .24, ease: 'sine.out' }, .1);
  }, signal);
  const outgoing = live.children[direction > 0 ? 1 : 0];
  const incoming = preview.children[direction > 0 ? 0 : 1];
  const front = document.createElement('div'), back = document.createElement('div');
  front.className = 'press-turn-face press-turn-face--front'; back.className = 'press-turn-face press-turn-face--back';
  front.append(staticSheet(outgoing)); back.append(staticSheet(incoming)); leaf.replaceChildren(front, back);
  return paperTimeline(timeline => {
    timeline.fromTo(leaf, { rotationY: 0, z: 0, '--press-turn-shadow': 0 },
      { rotationY: direction * -180, duration: .76, ease: 'power2.inOut', force3D: true }, 0);
    timeline.to(leaf, { z: 45, '--press-turn-shadow': .22, duration: .38, ease: 'sine.out' }, 0);
    timeline.to(leaf, { z: 0, '--press-turn-shadow': 0, duration: .38, ease: 'sine.in' }, .38);
  }, signal);
}
