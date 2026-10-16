import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./ContactMailbox.css";

const MASKED_EMAIL = "181****9842@163.com";

function FlyingEnvelope({ className }) {
  return <svg className={className} viewBox="0 0 110 75" fill="none" aria-hidden="true">
    <path d="m4 7 101-3 1 65L5 72Z" fill="#f4edd4" stroke="#163e53" strokeWidth="2" />
    <path d="m7 10 47 38L102 7M7 67l33-30m62 28L69 36" stroke="#597c87" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="m11 8 8 6m8-6 8 6m8-6 8 6m8-6 8 6m8-6 8 6m8-6 8 6M12 69l8-6m9 6 8-6m9 6 8-6m9 6 8-6m9 6 8-6m9 6 6-6" stroke="#d17a60" strokeWidth="3" />
    <path d="m86 17 10-1 1 12-10 1Z" fill="#a8c8be" stroke="#426b70" />
  </svg>;
}

export default function ContactMailbox({ email, reducedMotion = false }) {
  const [status, setStatus] = useState("idle");
  const [groundY, setGroundY] = useState(580);
  const mailboxRef = useRef(null);
  const resetTimer = useRef(null);
  const copying = useRef(false);
  useEffect(() => () => clearTimeout(resetTimer.current), []);
  useLayoutEffect(() => {
    const button = mailboxRef.current;
    const footer = button?.closest("section")?.querySelector("footer");
    if (!button || !footer) return;
    const layoutTop = element => {
      let top = 0;
      for (let node = element; node; node = node.offsetParent) top += node.offsetTop;
      return top;
    };
    const fitPost = () => {
      const model = button.querySelector(".contact-mailbox__model");
      if (!model?.offsetHeight) return;
      const bottom = (layoutTop(footer) - layoutTop(model)) * 480 / model.offsetHeight;
      setGroundY(Math.max(360, Math.round(bottom * 10) / 10));
    };
    fitPost();
    const observer = new ResizeObserver(fitPost);
    observer.observe(button);
    observer.observe(footer);
    observer.observe(button.closest(".contact-content"));
    return () => observer.disconnect();
  }, []);

  const copyEmail = async () => {
    if (copying.current) return;
    copying.current = true;
    try {
      await navigator.clipboard.writeText(email);
      setStatus("copied");
    } catch {
      setStatus("error");
    } finally {
      copying.current = false;
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setStatus("idle"), 4000);
    }
  };

  return <div className="contact-mailbox-wrap" data-motion="card">
    <button
      className={`contact-mailbox${status === "copied" ? " contact-mailbox--copied" : ""}${reducedMotion ? " contact-mailbox--reduced" : ""}`}
      type="button"
      ref={mailboxRef}
      onClick={copyEmail}
      aria-label={`打开信箱，复制邮箱 ${MASKED_EMAIL}`}
      aria-describedby="contact-mailbox-status"
    >
      <span className="contact-mailbox__scene" aria-hidden="true">
        <span className="contact-mailbox__title">Email</span>
        <span className="contact-mailbox__model">
        <svg className="contact-mailbox__drawing" viewBox="0 0 440 480" fill="none">
          <defs>
            <linearGradient id="mailbox-side" x1="205" y1="190" x2="345" y2="340" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffe9ac" /><stop offset=".5" stopColor="#e9c57d" /><stop offset="1" stopColor="#c79758" />
            </linearGradient>
            <linearGradient id="mailbox-post" x1="250" y1="340" x2="284" y2={groundY} gradientUnits="userSpaceOnUse">
              <stop stopColor="#cfa477" /><stop offset="1" stopColor="#a77751" />
            </linearGradient>
            <pattern id="mailbox-grain" width="22" height="19" patternUnits="userSpaceOnUse">
              <path d="m3 4 4-1m7 9 3-2M2 16h2" stroke="#664e34" strokeOpacity=".15" strokeWidth=".65" />
              <path d="m12 3 4 1M7 11l2 1m10 4h2" stroke="#fff9dc" strokeOpacity=".4" />
            </pattern>
          </defs>
          <path d={`M251 324 281 321 282 ${groundY} 251 ${groundY}Z`} fill="url(#mailbox-post)" stroke="#254957" strokeWidth="2" />
          <path d={`M273 330 281 321 282 ${groundY}H272Z`} fill="#876343" opacity=".65" />
          <path d={`M260 344 263 ${groundY - 17}M256 366l2 18m10 16 1 ${Math.max(12, groundY - 414)}`} stroke="#e3bd88" strokeWidth="2" strokeLinecap="round" />
          <path d="m154 194 135-25c31-3 56 22 56 56v96l-135 27-56-36Z" fill="url(#mailbox-side)" stroke="#183e50" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="m154 194 135-25c31-3 56 22 56 56v96l-135 27-56-36Z" fill="url(#mailbox-grain)" />
          <path d="m159 200 131-25c25-2 48 20 48 51" stroke="#fff0bf" strokeWidth="3" opacity=".6" />
          <path d="m210 338 128-25m-10-84v74" stroke="#8d7148" strokeWidth="1.7" opacity=".6" />
          <path d="M100 249c0-34 22-58 55-58 32 0 55 24 55 58v99H100Z" fill="#133b4b" stroke="#14394b" strokeWidth="3" />
          <path d="M107 249c0-30 18-50 48-50 29 0 47 21 47 50v90h-95Z" fill="#0c2d3e" />
          <path d="m107 335 95-17v21h-95Z" fill="#356471" />
          <path d="m101 348 110 1 135-28v8l-133 29-112-2Z" fill="#cda367" stroke="#234655" strokeWidth="2" />
          <g className="contact-mailbox__flag">
            <path d="m304 236 1-83" stroke="#153d50" strokeWidth="5" strokeLinecap="round" />
            <path d="m305 154 34-5 1 23-35 6Z" fill="#dc8169" stroke="#244650" strokeWidth="2" />
          </g>
          <circle cx="305" cy="235" r="6" fill="#d3a061" stroke="#38545a" strokeWidth="2" />
          <path d="m232 275 61-12" stroke="#fff3d0" strokeWidth="1.4" opacity=".6" />
          <text x="234" y="291" fill="#284f59" fontFamily="Caveat, cursive" fontSize="23" fontWeight="700" transform="rotate(-10 234 291)">Little Shark</text>
          <path d="m232 301 70-14" stroke="#fff3d0" strokeWidth="1.4" opacity=".6" />
          <path className="contact-mailbox__guide" d="M395 149c39 28 27 75-35 104m12-14-13 15 19 3" stroke="#f3efd5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <g className="contact-mailbox__rays" stroke="#ffe5a0" strokeWidth="4" strokeLinecap="round">
            <path d="m78 211-14-8m20-13-9-14m23 8-2-16m259 95 14-7m-11 27 18-1" />
          </g>
        </svg>
        <span className="contact-mailbox__door">
          <svg viewBox="0 0 110 157" fill="none">
            <path d="M2 57C2 25 23 2 55 2c31 0 53 23 53 55v97H2Z" fill="#e9ce8d" stroke="#193f50" strokeWidth="2.5" />
            <path d="M9 58C9 29 27 9 55 9c27 0 46 20 46 49v88H9Z" fill="#f8df9e" stroke="#ba985c" strokeWidth="1.5" />
            <path d="M9 58C9 29 27 9 55 9c27 0 46 20 46 49v88H9Z" fill="url(#mailbox-grain)" />
            <path d="m20 61 71-1v10l-71 1Z" fill="#163b4c" stroke="#b29157" strokeWidth="1.5" />
            <path d="m28 63 54-1" stroke="#6d9394" strokeWidth="2" />
            <path d="m46 32 17-1 1 6-18 1Z" fill="#d2a96a" stroke="#244650" strokeWidth="1.5" />
            <path d="m40 110 16 10 15-12M40 110l1 22 30-1v-23Z" stroke="#3c6770" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M15 141h77" stroke="#fff0be" strokeWidth="2" />
          </svg>
        </span>
        </span>
        <FlyingEnvelope className="contact-mailbox__envelope contact-mailbox__envelope--one" />
        <FlyingEnvelope className="contact-mailbox__envelope contact-mailbox__envelope--two" />
        <span className="contact-mailbox__letter">
          <span className="contact-mailbox__address">{MASKED_EMAIL}</span>
          <span className="contact-mailbox__letter-hint">{status === "copied" ? "已复制 ✓" : "点击复制"}</span>
          <svg className="contact-mailbox__stamp" viewBox="0 0 36 36" fill="none">
            <path d="m4 5 28-1-1 27-27 1Z" stroke="#67928e" strokeWidth="1.4" strokeDasharray="2 2" />
            <path d="m9 21 6-4 6 2 7-5-2 8-7 2-5-2-4 3Z" fill="#7baaa0" />
          </svg>
        </span>
        <span className="contact-mailbox__hint" aria-hidden="true">
          <span className="scroll-mouse contact-mailbox__click-mouse"><i /></span>
          <svg className="contact-mailbox__click-rays" viewBox="0 0 50 54" fill="none"><path d="m11 10-5-4M8 20H2M21 5l-2-4" /></svg>
          <svg className="contact-mailbox__copy-check" viewBox="0 0 32 32" fill="none"><path d="m8 16 5 5 11-12" /></svg>
        </span>
      </span>
    </button>
    <p id="contact-mailbox-status" className={`contact-mailbox-status${status === "error" ? " contact-mailbox-status--error" : ""}`} role="status" aria-live="polite">
      {status === "copied" ? "完整邮箱已复制。" : status === "error" ? "未能复制，请允许浏览器使用剪贴板后重试。" : ""}
    </p>
  </div>;
}
