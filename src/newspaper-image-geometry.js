// The moving image keeps the same bitmap crop while its paper frame changes size.
export function bitmapInFrame(frame, image, natural, position = [.5, .5]) {
  if (![frame.width, frame.height, image.width, image.height, natural.width, natural.height].every(value => Number.isFinite(value) && value > 0)) return null;
  const scale = Math.max(image.width / natural.width, image.height / natural.height);
  const width = natural.width * scale, height = natural.height * scale;
  return { x: image.left - frame.left + (image.width - width) * position[0],
    y: image.top - frame.top + (image.height - height) * position[1], width, height };
}

export function rectValues(rect) {
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}
