// The moving image keeps the same bitmap crop while its paper frame changes size.
export function bitmapInFrame(frame, image, natural, position = [.5, .5], fit = 'cover') {
  if (![frame.width, frame.height, image.width, image.height, natural.width, natural.height].every(value => Number.isFinite(value) && value > 0)) return null;
  const scale = (fit === 'contain' ? Math.min : Math.max)(image.width / natural.width, image.height / natural.height);
  const width = natural.width * scale, height = natural.height * scale;
  return { x: image.left - frame.left + (image.width - width) * position[0],
    y: image.top - frame.top + (image.height - height) * position[1], width, height };
}

export function rectValues(rect) {
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

// A video transition uses its poster, never the MP4 URL. Explicit poster
// dimensions keep the target stable while preload="none" defers the movie.
export function paperMediaAsset(media) {
  if (!media) return null;
  const video = media.tagName === 'VIDEO';
  const src = video ? media.poster : media.currentSrc || media.src;
  const width = video ? Number(media.dataset?.posterWidth) || media.videoWidth : media.naturalWidth;
  const height = video ? Number(media.dataset?.posterHeight) || media.videoHeight : media.naturalHeight;
  return src && width > 0 && height > 0 ? { src, width, height } : null;
}
