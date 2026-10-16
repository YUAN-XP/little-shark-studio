import { useEffect, useRef } from "react";
import { palmMaskBounds } from "./palm-mask-bounds.js";

export const BEACH_SCENE = {
  width: 1600,
  height: 900,
  artWidth: 1672,
  artHeight: 941,
  horizon: 592,
  palmX: 687,
  palmY: 302,
  palmWidth: 381,
  palmHeight: 354,
  period: 16,
  fps: 30,
};

// Reuse the approved animation's alpha and timing. The visible foreground comes
// from the video itself, so its paint, lighting and sand grains stay identical.
export function PalmForeground({ videoRef, heroRef, palmSource, posterSource }) {
  const foreground = useRef(null);
  useEffect(() => {
    const canvas = foreground.current;
    const video = videoRef.current;
    const hero = heroRef.current;
    const context = canvas?.getContext("2d");
    if (!context || !video || !hero) return;
    const { palmWidth: width, palmHeight: height, period, fps } = BEACH_SCENE;
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    const mask = context.createImageData(width, height);
    const pixels = mask.data;
    const rowBend = new Float32Array(height);
    const rowCrown = new Float32Array(height);
    const xSin = new Float32Array(width);
    const xCos = new Float32Array(width);
    const tau = Math.PI * 2;
    for (let y = 0; y < height; y++) {
      rowBend[y] = Math.pow(Math.max(0, Math.min(1, (333 - y) / 316)), 1.8);
      rowCrown[y] = Math.max(0, Math.min(1, (265 - y) / 75));
    }
    for (let x = 0; x < width; x++) {
      xSin[x] = Math.sin(x * .034);
      xCos[x] = Math.cos(x * .034);
    }
    const cropX = BEACH_SCENE.palmX * BEACH_SCENE.width / BEACH_SCENE.artWidth;
    const cropY = BEACH_SCENE.palmY * BEACH_SCENE.height / BEACH_SCENE.artHeight;
    const cropWidth = width * BEACH_SCENE.width / BEACH_SCENE.artWidth;
    const cropHeight = height * BEACH_SCENE.height / BEACH_SCENE.artHeight;
    const palm = new Image();
    const poster = new Image();
    let sourcePixels = null, spans = null;
    let disposed = false;
    let visible = true;
    let callback = null;
    let lastMediaTime = 0;
    let lastFrame = -1;
    const hasVideoFrames = typeof video.requestVideoFrameCallback === "function";

    const paint = (mediaTime, force = false) => {
      if (disposed || !sourcePixels) return;
      const useVideo = video.readyState >= 2 && !video.error;
      const base = useVideo ? video : poster.complete && poster.naturalWidth ? poster : null;
      if (!base) return;
      const frame = useVideo ? Math.round(mediaTime * fps) % (period * fps) : 0;
      if (frame === lastFrame && !force) return;
      lastFrame = frame;
      lastMediaTime = frame / fps;
      const phase = tau * lastMediaTime / period;
      const bend = 6.4 * Math.sin(2 * phase) + .9 * Math.sin(4 * phase);
      const sin = Math.sin(4 * phase), cos = Math.cos(4 * phase);
      pixels.fill(0);
      for (let y = 3; y < height - 3; y++) {
        const sway = bend * rowBend[y];
        const crown = rowCrown[y];
        for (let x = spans.starts[y]; x < spans.ends[y]; x++) {
          const sx = x - sway - 1.1 * crown * (sin * xCos[x] + cos * xSin[x]);
          const sy = y - 1.05 * crown * (sin * xSin[x] - cos * xCos[x]);
          const ix = Math.floor(sx), iy = Math.floor(sy);
          if (ix < 0 || ix >= width - 1 || iy < 0 || iy >= height - 1) continue;
          const p = (iy * width + ix) * 4;
          const a00 = sourcePixels[p + 3], a10 = sourcePixels[p + 7];
          const a01 = sourcePixels[p + width * 4 + 3], a11 = sourcePixels[p + width * 4 + 7];
          if (!(a00 | a10 | a01 | a11)) continue;
          const fx = sx - ix, fy = sy - iy;
          const alpha = a00 * (1 - fx) * (1 - fy) + a10 * fx * (1 - fy)
            + a01 * (1 - fx) * fy + a11 * fx * fy;
          if (alpha < .5) continue;
          const q = (y * width + x) * 4;
          pixels[q] = pixels[q + 1] = pixels[q + 2] = 255;
          pixels[q + 3] = alpha;
        }
      }
      context.putImageData(mask, 0, 0);
      context.globalCompositeOperation = "source-in";
      context.drawImage(base, cropX, cropY, cropWidth, cropHeight, 0, 0, width, height);
      context.globalCompositeOperation = "source-over";
      canvas.dataset.videoTime = String(lastMediaTime);
    };
    const stop = () => {
      if (callback === null) return;
      if (hasVideoFrames) video.cancelVideoFrameCallback(callback);
      else cancelAnimationFrame(callback);
      callback = null;
    };
    const schedule = () => {
      if (disposed || !visible || video.paused || video.error || callback !== null) return;
      if (hasVideoFrames) {
        callback = video.requestVideoFrameCallback((_, metadata) => {
          callback = null;
          paint(metadata.mediaTime);
          schedule();
        });
      } else {
        callback = requestAnimationFrame(() => {
          callback = null;
          paint(video.currentTime);
          schedule();
        });
      }
    };
    const refresh = () => { paint(video.currentTime, true); schedule(); };
    const onPause = () => { stop(); paint(lastMediaTime, true); };
    palm.onload = () => {
      if (disposed) return;
      sourceContext.drawImage(palm, 505, 77, 849, 814, 16, 16, 349, 322);
      sourcePixels = sourceContext.getImageData(0, 0, width, height).data;
      spans = palmMaskBounds(sourcePixels, width, height);
      refresh();
    };
    poster.onload = refresh;
    palm.src = palmSource;
    poster.src = posterSource;
    for (const event of ["loadeddata", "seeked", "play", "error"]) video.addEventListener(event, refresh);
    video.addEventListener("pause", onPause);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) refresh();
      else stop();
    }, { rootMargin: "100px" });
    observer.observe(hero);
    return () => {
      disposed = true;
      stop();
      observer.disconnect();
      palm.onload = poster.onload = null;
      for (const event of ["loadeddata", "seeked", "play", "error"]) video.removeEventListener(event, refresh);
      video.removeEventListener("pause", onPause);
    };
  }, [videoRef, heroRef, palmSource, posterSource]);
  return <canvas ref={foreground} className="hero-palm-foreground"
    width={BEACH_SCENE.palmWidth} height={BEACH_SCENE.palmHeight} aria-hidden="true" />;
}
