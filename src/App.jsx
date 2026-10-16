import { Component, lazy, Suspense, useEffect, useRef, useState } from "react";
import { profile, projects, studioNotes } from "./content.js";
import { PalmForeground, BEACH_SCENE } from "./PalmForeground.jsx";
import ProjectGallery from "./ProjectGallery.jsx";
import { MotionWords } from "./Motion.jsx";
import FloatingNavigation from "./FloatingNavigation.jsx";
import MeSectionContent from "./MeSectionContent.jsx";
import AboutBeach from "./AboutBeach.jsx";
import ContactMailbox from "./ContactMailbox.jsx";
import { usePortfolioMotion } from "./usePortfolioMotion.js";
import { nextIslandState } from "./header-state.js";
import "./motion.css";

const prepareProjectDetails = () => import("./ProjectDetailLoader.jsx");
const ProjectDetail = lazy(prepareProjectDetails);
class ProjectDetailsBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="project-load-error" role="alert">
      <p>暂时无法打开项目，请刷新后重试。</p>
      <button type="button" onClick={this.props.onClose}>返回项目集</button>
      <button type="button" onClick={() => window.location.reload()}>刷新重试</button>
    </div> : this.props.children;
  }
}

const Doodle = ({ className = "", variant = "star" }) => (
  <img
    className={`doodle doodle-${variant} ${className}`}
    src={profile[variant]}
    alt=""
    aria-hidden="true"
  />
);

function ChapterMarquee({ title }) {
  return <div className="marquee" aria-hidden="true">
    <div className="marquee-band"><div className="marquee-track">
      {[0, 1].map(group => <div className="marquee-group" key={group}>
        {Array.from({length:8}, (_, index) => <span className="marquee-item" key={index}>
          <span>{title}</span><i>✳</i>
        </span>)}
      </div>)}
    </div></div>
  </div>;
}

export default function App({ motionPreference = "system" } = {}) {
  const [scrolled, setScrolled] = useState(false),
    [active, setActive] = useState("home"),
    [menuOpen, setMenuOpen] = useState(false),
    [preview, setPreview] = useState(null),
    [surfaceTone, setSurfaceTone] = useState("light"),
    [heroVideoEnabled, setHeroVideoEnabled] = useState(false),
    [posterReady, setPosterReady] = useState(false);
  const [paused, setPaused] = useState(
    () => motionPreference === "reduced" || window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [sceneVisible, setSceneVisible] = useState(true);
  const backgroundSuspended = Boolean(preview);
  const motionScope = useRef(null), previewOrigin = useRef(null);
  usePortfolioMotion(motionScope, motionPreference === "reduced");
  const video = useRef(null),
    hero = useRef(null);
  useEffect(() => {
    let headerFrame = 0;
    const readingSections = [...document.querySelectorAll('main > section[id]')];
    const update = () => {
      if (headerFrame) return;
      headerFrame = requestAnimationFrame(() => {
        headerFrame = 0;
        const bottom = hero.current?.getBoundingClientRect().bottom ?? Infinity;
        setScrolled(current => nextIslandState(current, bottom));
        const readingLine = window.innerHeight * .32;
        let sectionId = 'home';
        let contactRect;
        for (const section of readingSections) {
          const rect = section.getBoundingClientRect();
          if (rect.top <= readingLine) sectionId = section.id;
          if (section.id === 'contact') contactRect = rect;
        }
        setActive(sectionId);
        const glass = document.querySelector('.nav-island-glass')?.getBoundingClientRect();
        const center = glass ? glass.top + glass.height / 2 : 0;
        setSurfaceTone(contactRect && contactRect.top <= center && contactRect.bottom >= center ? 'dark' : 'light');
      });
    };
    const fitScene = () => {
      const el = hero.current;
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      const scene = BEACH_SCENE;
      const scale = Math.max(width / scene.width, height / scene.height);
      const left = (width - scene.width * scale) / 2;
      const top = (height - scene.height * scale) / 2;
      const skyTop = Math.max(8, Math.min(14, width * .008));
      const horizon = top + scene.horizon * scale;
      const titleSize = Math.max(30, Math.min(132, width * (width <= 640 ? .106 : .077), (width - 48) / 7.3));
      el.style.setProperty("--sky-top", `${skyTop}px`);
      el.style.setProperty("--sky-height", `${horizon - skyTop}px`);
      el.style.setProperty("--studio-center", `${(skyTop + horizon) / 2}px`);
      el.style.setProperty("--studio-font-size", `${titleSize}px`);
      el.style.setProperty("--palm-frame-left", `${left + scene.palmX * scene.width / scene.artWidth * scale}px`);
      el.style.setProperty("--palm-frame-top", `${top + scene.palmY * scene.height / scene.artHeight * scale}px`);
      el.style.setProperty("--palm-frame-width", `${scene.palmWidth * scene.width / scene.artWidth * scale}px`);
      el.style.setProperty("--palm-frame-height", `${scene.palmHeight * scene.height / scene.artHeight * scale}px`);
      update();
    };
    fitScene();
    const initialSection = location.hash.slice(1);
    if (window.scrollY < 80 && ["me", "work", "about", "contact"].includes(initialSection)) {
      document.getElementById(initialSection)?.scrollIntoView({ behavior: "instant", block: "start" });
    }
    const sceneObserver = new ResizeObserver(fitScene);
    if (hero.current) sceneObserver.observe(hero.current);
    const sceneVisibility = new IntersectionObserver(([entry]) => setSceneVisible(entry.isIntersecting), { rootMargin: "160px" });
    if (hero.current) sceneVisibility.observe(hero.current);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onPreference = (e) => setPaused(motionPreference === "reduced" || e.matches);
    preference.addEventListener("change", onPreference);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(headerFrame);
      sceneObserver.disconnect();
      sceneVisibility.disconnect();
      preference.removeEventListener("change", onPreference);
    };
  }, [motionPreference]);
  useEffect(() => {
    if (!posterReady || heroVideoEnabled || paused || !sceneVisible || backgroundSuspended) return;
    let task = null;
    const cancel = () => {
      if (task === null) return;
      if (window.requestIdleCallback) window.cancelIdleCallback(task);
      else cancelAnimationFrame(task);
      task = null;
    };
    const schedule = () => {
      cancel();
      const rect = hero.current?.getBoundingClientRect();
      if (document.hidden || !rect || rect.bottom <= 0 || rect.top >= window.innerHeight) return;
      const enable = () => { task = null; if (!document.hidden) setHeroVideoEnabled(true); };
      task = window.requestIdleCallback ? window.requestIdleCallback(enable, { timeout: 800 }) : requestAnimationFrame(enable);
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => { cancel(); document.removeEventListener("visibilitychange", schedule); };
  }, [posterReady, heroVideoEnabled, paused, sceneVisible, backgroundSuspended]);
  useEffect(() => {
    if (!video.current) return;
    const syncPlayback = () => {
      if (!heroVideoEnabled || paused || backgroundSuspended || !sceneVisible || document.hidden) video.current.pause();
      else video.current.play().catch(error => { if (error.name !== "AbortError") setPaused(true); });
    };
    syncPlayback();
    document.addEventListener("visibilitychange", syncPlayback);
    return () => document.removeEventListener("visibilitychange", syncPlayback);
  }, [paused, sceneVisible, heroVideoEnabled, backgroundSuspended]);
  return (
    <div className="site-shell" ref={motionScope} data-background-paused={backgroundSuspended || undefined}>
      <a className="skip-link" href="#me">
        跳至个人介绍
      </a>
      <FloatingNavigation
        scrolled={scrolled} active={active} logo={profile.logo} surfaceTone={surfaceTone}
        menuOpen={menuOpen} onMenuToggle={() => setMenuOpen(open => !open)}
        onMenuClose={() => setMenuOpen(false)} reducedMotion={paused}
      />
      <main style={{ "--scene-background": `url("${profile.heroPoster}")` }}>
        <section
          ref={hero}
          className={`hero ${paused ? "motion-paused" : ""}`}
          id="home"
          aria-labelledby="hero-title"
        >
          <div className="hero-media" aria-hidden="true">
            <img
              className="hero-poster"
              src={profile.heroPoster}
              alt=""
              fetchPriority="high"
              onLoad={() => setPosterReady(true)}
            />
            <video
              key={profile.heroVideo}
              ref={video}
              className="hero-video"
              src={heroVideoEnabled ? profile.heroVideo : undefined}
              autoPlay={heroVideoEnabled && !paused}
              muted
              loop
              playsInline
              preload="metadata"
              poster={profile.heroPoster}
              onError={() => setPaused(true)}
            >
            </video>
          </div>
          <svg className="hero-backword" viewBox="15.625 -718.75 4487 734.375"
            preserveAspectRatio="none" aria-hidden="true">
            <text x="0" y="0" fontSize="1000" letterSpacing="-15" fill="currentColor">INSPIRATION</text>
          </svg>
          <div className="hero-content page-width">
            <div className="hero-title-group">
              <h1 id="hero-title"><MotionWords text="Little Shark Studio" /></h1>
            </div>
          </div>
          <PalmForeground videoRef={video} heroRef={hero} palmSource={profile.palmLayer} posterSource={profile.heroPoster} />
          <div className="hero-shade" aria-hidden="true" />
          <a
            href="#me"
            className="scroll-hint"
            aria-label="向下查看个人介绍"
          >
            <span className="scroll-mouse" aria-hidden="true">
              <i />
            </span>
          </a>
        </section>
        <section
          className="about"
          id="me"
          data-motion-section
          aria-labelledby="me-title"
        >
          <ChapterMarquee title="ME" />
          <MeSectionContent reducedMotion={motionPreference === "reduced"} suspended={backgroundSuspended} />
        </section>
        <section className="work" id="work" aria-labelledby="work-title" data-motion-section>
          <ChapterMarquee title="PROJECTS" />
          <h2 className="sr-only" id="work-title">项目集</h2>
          <div className="page-width gallery-stage" data-motion-group>
            <ProjectGallery suspended={backgroundSuspended} onPrepare={prepareProjectDetails} items={projects} onSelect={(item, panel) => { previewOrigin.current = panel; setPreview(item); }} reducedMotion={motionPreference === "reduced"} />
          </div>
        </section>
        <section
          className="studio-about"
          id="about"
          data-motion-section
          aria-labelledby="studio-about-title"
        >
          <ChapterMarquee title="ABOUT" />
          <AboutBeach notes={studioNotes} reducedMotion={motionPreference === "reduced"} suspended={backgroundSuspended} />
        </section>
        <section
          className="contact"
          id="contact"
          data-motion-section
          aria-labelledby="contact-title"
        >
          <ChapterMarquee title="CONTACT" />
          <div className="contact-content page-width">
            <div className="contact-main" data-motion-group>
              <h2 id="contact-title" data-motion-heading>
                <MotionWords text="LET'S MAKE" />
                <br />
                <MotionWords text="SOMETHING" className="motion-words--accent" />
                <br />
                <MotionWords text="HAPPEN." />
              </h2>
              <ContactMailbox email={profile.email} reducedMotion={motionPreference === "reduced"} />
            </div>
            <footer className="footer">
              <a href="#home" className="footer-brand" aria-label="Little Shark Studio，回到首页">
                <img src={profile.horizontalLogo} alt="Little Shark Studio" width="672" height="134" loading="lazy" />
              </a>
              <span className="footer-copyright">
                © 2026 · PERSONAL PORTFOLIO
                <br />
                KEEP CURIOUS. KEEP CREATING.
                <a href={`${import.meta.env.BASE_URL}credits.html`} target="_blank" rel="noreferrer">制作与素材致谢</a>
              </span>
            </footer>
          </div>
        </section>
      </main>
      {preview && <ProjectDetailsBoundary onClose={() => setPreview(null)}><Suspense fallback={<span className="sr-only" role="status">正在打开项目…</span>}>
        <ProjectDetail project={preview} origin={previewOrigin.current} onClose={() => setPreview(null)} reducedMotion={motionPreference === "reduced"} />
      </Suspense></ProjectDetailsBoundary>}
    </div>
  );
}
