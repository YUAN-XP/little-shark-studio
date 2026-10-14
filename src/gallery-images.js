// Retain decoded covers across circular window changes, including the sixth item.
export function createGalleryImageCache(ImageType = globalThis.Image) {
  const cache = new Map();
  return src => {
    if (!src || !ImageType) return { ready: false, promise: Promise.resolve(false) };
    if (cache.has(src)) return cache.get(src);

    const image = new ImageType();
    const record = { image, ready: false, promise: null };
    cache.set(src, record);
    record.promise = new Promise(resolve => {
      let decoding = false, settled = false;
      const finish = success => {
        if (settled) return;
        settled = true;
        record.ready = success;
        image.onload = image.onerror = null;
        if (!success) cache.delete(src);
        resolve(success);
      };
      const loaded = () => {
        if (decoding || settled) return;
        decoding = true;
        if (typeof image.decode === 'function') {
          // A supported format remains usable if decode() itself is unavailable.
          image.decode().then(() => finish(true), () => finish(image.naturalWidth > 0));
        } else finish(image.naturalWidth > 0);
      };
      image.decoding = 'async';
      image.onload = loaded;
      image.onerror = () => finish(false);
      image.src = src;
      if (image.complete && image.naturalWidth > 0) loaded();
    });
    return record;
  };
}

export const prepareGalleryImage = createGalleryImageCache();
