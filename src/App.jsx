import { useEffect, useRef, useState } from "react";
import { profile, projects, studioNotes } from "./content.js";
import { PalmForeground, BEACH_SCENE } from "./PalmForeground.jsx";
import ProjectGallery from "./ProjectGallery.jsx";
import ProjectDetail from "./ProjectDetail.jsx";
import { MotionWords } from "./Motion.jsx";
import GlassSurface from "./GlassSurface.jsx";
import MeSectionContent from "./MeSectionContent.jsx";
import AboutBeach from "./AboutBeach.jsx";
import { usePortfolioMotion } from "./usePortfolioMotion.js";
import { nextIslandState } from "./header-state.js";
import "./motion.css";

function Icon({ name, size = 24 }) {
  const paths = {
    spark: <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4 18.4 5.6" />,
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    copy: (
      <>
        <rect x="8" y="8" width="12" height="12" rx="2" />
        <path d="M16 8V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h4" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    data: <path d="M4 20V4M4 20h17M9 16v-5M14 16V6M19 16v-8" />,
    code: <path d="m7 7-5 5 5 5m10-10 5 5-5 5m-3-14-4 18" />,
    team: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-2a6 6 0 0 1 12 0v2m2-15a3 3 0 0 1 0 6m2 4a5 5 0 0 1 2 4v1" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.spark}
    </svg>
  );
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
    [message, setMessage] = useState("");
  const [paused, setPaused] = useState(
    () => motionPreference === "reduced" || window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [sceneVisible, setSceneVisible] = useState(true);
  const motionScope = useRef(null), previewOrigin = useRef(null);
  usePortfolioMotion(motionScope, motionPreference === "reduced");
  const video = useRef(null),
    hero = useRef(null),
    messageTimer = useRef(null);
  useEffect(() => {
    let headerFrame = 0;
    const update = () => {
      if (headerFrame) return;
      headerFrame = requestAnimationFrame(() => {
        headerFrame = 0;
        const bottom = hero.current?.getBoundingClientRect().bottom ?? Infinity;
        setScrolled(current => nextIslandState(current, bottom));
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
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-18% 0px -55% 0px", threshold: 0 },
    );
    document
      .querySelectorAll("main > section[id]")
      .forEach((el) => observer.observe(el));
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onPreference = (e) => setPaused(motionPreference === "reduced" || e.matches);
    preference.addEventListener("change", onPreference);
    return () => {
      window.removeEventListener("scroll", update);
      cancelAnimationFrame(headerFrame);
      observer.disconnect();
      sceneObserver.disconnect();
      sceneVisibility.disconnect();
      preference.removeEventListener("change", onPreference);
      clearTimeout(messageTimer.current);
    };
  }, [motionPreference]);
  useEffect(() => {
    if (!video.current) return;
    const syncPlayback = () => {
      if (paused || !sceneVisible || document.hidden) video.current.pause();
      else video.current.play().catch(error => { if (error.name !== "AbortError") setPaused(true); });
    };
    syncPlayback();
    document.addEventListener("visibilitychange", syncPlayback);
    return () => document.removeEventListener("visibilitychange", syncPlayback);
  }, [paused, sceneVisible]);
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setMessage("邮箱已复制，期待与你交流。");
    } catch {
      setMessage(`请复制邮箱：${profile.email}`);
    }
    clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setMessage(""), 5000);
  };
  return (
    <div className="site-shell" ref={motionScope}>
      <a className="skip-link" href="#me">
        跳至个人介绍
      </a>
      <header
        className={`header ${scrolled ? "header-scrolled" : ""}`}
        data-page={active}
        onKeyDown={(e) => { if (e.key === "Escape") setMenuOpen(false); }}
      >
        <div className="header-frame">
          <GlassSurface
            width="100%" height="auto" borderRadius={999}
            className="nav-island-glass"
            displace={15} distortionScale={-150}
            redOffset={5} greenOffset={15} blueOffset={25}
            brightness={60} opacity={0.8} mixBlendMode="screen"
            backgroundOpacity={0.16} saturation={1.4}
          >
          <div className="header-inner page-width">
          <a href="#home" className="brand" aria-label="Little Shark Studio，回到首页">
            <img className="brand-logo" src={profile.logo} alt="" width="48" height="48" />
          </a>
          <button
            className="mobile-menu icon-button"
            aria-label={menuOpen ? "关闭导航" : "打开导航"}
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
          <nav
            id="main-navigation"
            className={`navigation ${menuOpen ? "navigation-open" : ""}`}
            aria-label="主导航"
          >
            {[
              ["me", "我"],
              ["work", "项目集"],
              ["about", "关于"],
              ["contact", "联系"],
            ].map(([id, text]) => (
              <a
                key={id}
                href={`#${id}`}
                className={active === id ? "nav-active" : ""}
                aria-current={active === id ? "location" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {text}
              </a>
            ))}
          </nav>
          </div>
          </GlassSurface>
        </div>
      </header>
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
            />
            <video
              key={profile.heroVideo}
              ref={video}
              className="hero-video"
              autoPlay={!paused}
              muted
              loop
              playsInline
              preload="metadata"
              poster={profile.heroPoster}
              onError={() => setPaused(true)}
            >
              <source src={profile.heroVideo} type="video/mp4" />
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
          <MeSectionContent reducedMotion={motionPreference === "reduced"} />
        </section>
        <section className="work" id="work" aria-labelledby="work-title" data-motion-section>
          <ChapterMarquee title="PROJECTS" />
          <h2 className="sr-only" id="work-title">项目集</h2>
          <div className="page-width gallery-stage" data-motion-group>
            <ProjectGallery items={projects} onSelect={(item, panel) => { previewOrigin.current = panel; setPreview(item); }} reducedMotion={motionPreference === "reduced"} />
          </div>
        </section>
        <section
          className="studio-about"
          id="about"
          data-motion-section
          aria-labelledby="studio-about-title"
        >
          <ChapterMarquee title="ABOUT" />
          <AboutBeach notes={studioNotes} reducedMotion={motionPreference === "reduced"} />
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
              <div className="contact-aside" data-motion="card">
                <span className="handwritten">say hello!</span>
                <Doodle />
                <p>
                  实习机会、研究交流，
                  <br />
                  或是值得一起试试的新想法。
                  <br />
                  欢迎来信。
                </p>
              </div>
            </div>
            <div className="contact-actions" data-motion-group>
              <a
                className="button button-lime"
                href={`mailto:${profile.email}`}
                data-motion="copy"
              >
                给我发邮件
                <Icon name="mail" size={20} />
              </a>
              <button className="copy-button" onClick={copyEmail} data-motion="copy">
                <Icon name="copy" size={18} />
                复制邮箱
              </button>
              <a href={`mailto:${profile.email}`} className="email-link" data-motion="copy">
                {profile.email}
              </a>
            </div>
            <footer className="footer">
              <a href="#home" className="footer-brand" aria-label="Little Shark Studio，回到首页">
                <img src={profile.horizontalLogo} alt="Little Shark Studio" width="672" height="134" loading="lazy" />
              </a>
              <span className="footer-copyright">
                © 2026 · PERSONAL PORTFOLIO
                <br />
                KEEP CURIOUS. KEEP CREATING.
              </span>
            </footer>
          </div>
        </section>
      </main>
      <ProjectDetail project={preview} origin={previewOrigin.current} onClose={() => setPreview(null)} reducedMotion={motionPreference === "reduced"} />
      <div
        className={`toast ${message ? "toast-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {message}
      </div>
    </div>
  );
}
