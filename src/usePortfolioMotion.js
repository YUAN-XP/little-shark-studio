import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

// One vocabulary and one rhythm for current and future modules.
export const MOTION = Object.freeze({
  chapterDuration: 1.65,
  cardDuration: 1.55,
  cardStagger: .16,
  chapterLead: .62,
  imageDuration: 1.85,
  parallaxDepth: 2.5,
  parallaxScrub: 1.25,
  openingDuration: 3.6,
});
const fullClip = 'inset(0% 0% 0% 0%)';
const closedClip = 'inset(0% 0% 100% 0%)';
const movingProps = 'transform,clipPath,willChange';
const snapshotSelector = '[data-motion-heading], [data-motion-word], [data-motion-group], [data-motion="card"], [data-motion="copy"], [data-motion-image]';
const equalNodes = (a, b) => a.length === b.length && a.every((node, index) => node === b[index]);

export function usePortfolioMotion(scope, forceReduced = false) {
  const seen = useRef(new WeakSet());
  const openingSeen = useRef(false);

  useLayoutEffect(() => {
    const root = scope.current;
    if (!root) return;
    const match = gsap.matchMedia();
    match.add({
      reduced: '(prefers-reduced-motion: reduce)',
      full: '(prefers-reduced-motion: no-preference)',
      desktop: '(min-width: 900px) and (hover: hover)',
    }, mediaContext => {
      const { desktop } = mediaContext.conditions;
      const reduced = mediaContext.conditions.reduced || forceReduced;
      root.dataset.motionMode = reduced ? 'reduced' : 'full';
      const records = new Map();
      let disposed = false, refreshFrame = null, updateFrame = null, refreshRequested = false;
      let opening = null;

      const refresh = () => {
        if (disposed) return;
        refreshRequested = true;
        if (refreshFrame !== null || ScrollTrigger.isScrolling()) return;
        refreshFrame = requestAnimationFrame(() => {
          refreshFrame = null;
          if (disposed || ScrollTrigger.isScrolling()) return;
          refreshRequested = false;
          ScrollTrigger.refresh();
        });
      };
      const refreshAfterScroll = () => { if (refreshRequested) refresh(); };
      ScrollTrigger.addEventListener('scrollEnd', refreshAfterScroll);
      const settle = targets => { if (targets.length) gsap.set(targets, { clearProps: movingProps }); };

      const buildSection = section => {
        const nodes = [...section.querySelectorAll(snapshotSelector)];
        const existing = records.get(section);
        if (existing && equalNodes(existing.nodes, nodes)) return false;
        if (existing) {
          // A content replacement during an entrance stays readable.
          for (const node of existing.nodes) {
            if (node.dataset.motionState === 'playing') seen.current.add(node);
          }
          for (const [group, handler] of existing.listeners) group.removeEventListener('focusin', handler);
          existing.context.revert();
        }
        const heading = section.querySelector('[data-motion-heading]');
        const groups = [...section.querySelectorAll('[data-motion-group]')];
        const words = heading ? [...heading.querySelectorAll('[data-motion-word]')] : [];
        const listeners = [];
        let chapter = null, chapterTrigger = null;
        const sectionContext = gsap.context(() => {
          if (reduced) {
            settle(nodes.filter(node => node.matches('[data-motion="card"], [data-motion="copy"], [data-motion-word], [data-motion-image]')));
            for (const node of [heading, ...groups].filter(Boolean)) {
              seen.current.add(node);
              node.dataset.motionState = 'complete';
            }
            section.dataset.motionState = 'complete';
            return;
          }
          section.dataset.motionState = 'armed';
          if (heading && words.length && !seen.current.has(heading) && heading.getBoundingClientRect().bottom > 0) {
            heading.dataset.motionState = 'armed';
            gsap.set(words, { yPercent: 125, x: desktop ? 38 : 16, skewY: 5, scaleX: .78, scaleY: 1.14 });
            chapter = gsap.timeline({ paused: true,
              onStart: () => { heading.dataset.motionState = 'playing'; gsap.set(words, { willChange: 'transform' }); },
              onComplete: () => {
                settle(words);
                seen.current.add(heading);
                heading.dataset.motionState = 'complete';
                chapterTrigger?.kill();
              },
            }).to(words, { yPercent: 0, x: 0, skewY: 0, scaleX: 1, scaleY: 1,
              duration: MOTION.chapterDuration, stagger: .12, ease: 'power4.out' });
            chapterTrigger = ScrollTrigger.create({ id: `chapter-${section.id}`, trigger: heading, start: 'top 88%', once: true,
              onEnter: () => chapter.play(),
            });
          } else if (heading) {
            settle(words);
            seen.current.add(heading);
            heading.dataset.motionState = 'complete';
          }

          for (const group of groups) {
            const owned = selector => [...group.querySelectorAll(selector)].filter(node => node.closest('[data-motion-group]') === group);
            const cards = owned('[data-motion="card"]');
            const copy = owned('[data-motion="copy"]');
            const images = owned('[data-motion-image]');
            const targets = [...cards, ...copy];
            const alreadySeen = seen.current.has(group) || group.getBoundingClientRect().bottom <= 0;
            if (!alreadySeen && targets.length) {
              group.dataset.motionState = 'armed';
              if (cards.length) gsap.set(cards, { y: desktop ? 100 : 58, scale: .9, skewY: 2.5, clipPath: closedClip });
              if (copy.length) gsap.set(copy, { y: 48, clipPath: closedClip });
              if (images.length) gsap.set(images, { scale: 1.2 });
              let contentTrigger = null;
              const entrance = gsap.timeline({ paused: true,
                onStart: () => {
                  group.dataset.motionState = 'playing'; section.dataset.motionState = 'playing';
                  gsap.set(targets, { willChange: 'transform, clip-path' });
                  if (images.length) gsap.set(images, { willChange: 'transform' });
                },
                onComplete: () => {
                  settle(targets);
                  if (images.length) gsap.set(images, { clearProps: 'willChange' });
                  seen.current.add(group);
                  group.dataset.motionState = 'complete';
                  contentTrigger?.kill();
                  if (groups.every(item => seen.current.has(item))) section.dataset.motionState = 'complete';
                },
              });
              if (cards.length) entrance.to(cards, { y: 0, scale: 1, skewY: 0, clipPath: fullClip,
                duration: MOTION.cardDuration, stagger: MOTION.cardStagger, ease: 'power4.out' }, 0);
              if (copy.length) entrance.to(copy, { y: 0, clipPath: fullClip,
                duration: 1.25, stagger: .1, ease: 'power3.out' }, cards.length ? .18 : 0);
              if (images.length) entrance.to(images, { scale: desktop ? 1.08 : 1,
                duration: MOTION.imageDuration, stagger: .1, ease: 'power3.out' }, .08);
              contentTrigger = ScrollTrigger.create({ id: `content-${section.id}-${groups.indexOf(group)}`,
                trigger: group, start: 'top 87%', once: true,
                onEnter: () => {
                  if (chapter && chapter.progress() < 1) {
                    chapter.play();
                    entrance.delay(Math.max(0, MOTION.chapterLead - chapter.time()));
                  }
                  entrance.play();
                },
              });
              // Keyboard users never focus a concealed card or action.
              const showOnFocus = () => { chapter?.progress(1); entrance.progress(1); };
              group.addEventListener('focusin', showOnFocus);
              listeners.push([group, showOnFocus]);
            } else {
              settle(targets);
              if (images.length) gsap.set(images, { scale: desktop ? 1.08 : 1, clearProps: 'willChange' });
              seen.current.add(group);
              group.dataset.motionState = 'complete';
            }
            if (desktop && images.length) {
              const depth = MOTION.parallaxDepth;
              gsap.fromTo(images, { yPercent: -depth }, { yPercent: depth, ease: 'none',
                scrollTrigger: { id: `image-${section.id}-${groups.indexOf(group)}`, trigger: group,
                  start: 'top bottom', end: 'bottom top', scrub: MOTION.parallaxScrub,
                  invalidateOnRefresh: true,
                },
              });
            }
          }
          if (groups.every(group => seen.current.has(group)) && (!heading || seen.current.has(heading))) section.dataset.motionState = 'complete';
        }, section);
        records.set(section, { nodes, context: sectionContext, listeners });
        return true;
      };

      const syncSections = () => {
        if (disposed) return;
        let changed = false;
        const sections = [...root.querySelectorAll('[data-motion-section]')];
        for (const [section, record] of records) {
          if (!sections.includes(section)) {
            for (const [group, handler] of record.listeners) group.removeEventListener('focusin', handler);
            record.context.revert();
            records.delete(section);
            changed = true;
          }
        }
        for (const section of sections) changed = buildSection(section) || changed;
        if (changed) refresh();
      };
      const openingWords = [...root.querySelectorAll('.hero-title-group [data-motion-word]')];
      const backword = root.querySelector('.hero-backword');
      const nav = [...root.querySelectorAll('.header .brand, .navigation > *, .mobile-menu')];
      const mouse = root.querySelector('.scroll-mouse');
      const atHome = (!location.hash || location.hash === '#home') && window.scrollY < 80;
      const openingContext = gsap.context(() => {
        if (reduced || openingSeen.current || !atHome) {
          root.dataset.opening = reduced ? 'reduced' : 'complete';
          if (reduced) openingSeen.current = true;
          return;
        }
        root.dataset.opening = 'armed';
        gsap.set(backword, { clipPath: 'inset(0% 100% 0% 0%)', xPercent: -6, scaleX: .76, transformOrigin: '0% 50%', willChange: 'transform, clip-path' });
        // The original stationary word masks stay unchanged; lower the start to hide script tips.
        gsap.set(openingWords, { yPercent: 175, x: 22, skewY: 5, scaleX: .72, scaleY: 1.3, willChange: 'transform' });
        gsap.set(nav, { y: -65, clipPath: closedClip, willChange: 'transform, clip-path' });
        gsap.set(mouse, { y: 35, scaleY: .6, clipPath: closedClip, willChange: 'transform' });
        opening = gsap.timeline({ paused: true,
          onStart: () => { root.dataset.opening = 'playing'; },
          onComplete: () => {
            openingSeen.current = true;
            settle([...openingWords, backword, ...nav, mouse]);
            root.dataset.opening = 'complete';
            refresh();
          },
        });
        // Every hero text layer starts together; only later sections use a card/heading stagger.
        opening.to(backword, { clipPath: fullClip, xPercent: 0, scaleX: 1, duration: 2.05, ease: 'power3.inOut' }, 0)
          .to(openingWords, { yPercent: 0, x: 0, skewY: 0, scaleX: 1, scaleY: 1,
            duration: 1.85, ease: 'power4.out' }, 0)
          .to(nav, { y: 0, clipPath: fullClip, duration: 1.15, ease: 'power3.out' }, 0)
          .to(mouse, { y: 0, scaleY: 1, clipPath: fullClip, duration: .9, ease: 'power3.out' }, 2.7);
        opening.timeScale(opening.duration() / MOTION.openingDuration);
        // Trigger before first paint. Typeface readiness only refreshes the layout below.
        opening.play(0);
      }, root);

      syncSections();
      const updates = new MutationObserver(() => {
        if (updateFrame !== null || disposed) return;
        updateFrame = requestAnimationFrame(() => { updateFrame = null; syncSections(); });
      });
      updates.observe(root, { subtree: true, childList: true,
        attributes: true, attributeFilter: ['data-motion-section', 'data-motion', 'data-motion-group', 'data-motion-heading', 'data-motion-image'] });
      const finishOpeningOnScroll = () => {
        if (window.scrollY > 100 && opening && opening.progress() < 1) opening.progress(1);
      };
      window.addEventListener('scroll', finishOpeningOnScroll, { passive: true });
      // Gallery covers live in a fixed-size frame; loading a ghost cannot alter
      // document geometry. Avoid a full ScrollTrigger refresh during a slide.
      const refreshOnLoad = event => {
        if (!event.target.closest?.('.accordion-gallery')) refresh();
      };
      root.addEventListener('load', refreshOnLoad, true);
      document.fonts.ready.then(refresh);
      return () => {
        disposed = true;
        updates.disconnect();
        ScrollTrigger.removeEventListener('scrollEnd', refreshAfterScroll);
        window.removeEventListener('scroll', finishOpeningOnScroll);
        root.removeEventListener('load', refreshOnLoad, true);
        if (refreshFrame !== null) cancelAnimationFrame(refreshFrame);
        if (updateFrame !== null) cancelAnimationFrame(updateFrame);
        for (const [section, record] of records) {
          for (const [group, handler] of record.listeners) group.removeEventListener('focusin', handler);
          record.context.revert();
        }
        records.clear();
        openingContext.revert();
      };
    }, root);
    return () => match.revert();
  }, [scope, forceReduced]);
}

export function animateProjectDetail(dialog, forceReduced = false) {
  if (forceReduced) return () => {};
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const context = gsap.context(() => {
      const cover = dialog.querySelector('.project-detail__cover');
      const image = cover?.querySelector('img');
      const title = dialog.querySelector('#project-detail-title');
      gsap.timeline({ defaults: { ease: 'power4.out' } })
        .fromTo(dialog, { y: 55, scale: .94 }, { y: 0, scale: 1, duration: 1.1, clearProps: 'transform' }, 0)
        .fromTo(cover, { clipPath: closedClip }, { clipPath: fullClip, duration: 1.4, clearProps: 'clipPath' }, .12)
        .fromTo(image, { scale: 1.17 }, { scale: 1, duration: 1.65, clearProps: 'transform' }, .12)
        .fromTo(title, { y: 38, clipPath: closedClip }, { y: 0, clipPath: fullClip, duration: 1.25, clearProps: 'transform,clipPath' }, .24);
    }, dialog);
    return () => context.revert();
  });
  return () => media.revert();
}
