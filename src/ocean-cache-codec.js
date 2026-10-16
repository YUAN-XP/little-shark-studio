import { DataUtils } from 'three/src/extras/DataUtils.js';

export function decodeBytePlanes(buffer) {
  if (buffer.byteLength % 2) throw new Error('海洋数据不完整。');
  const bytes = new Uint8Array(buffer), count = bytes.length / 2;
  const values = new Uint16Array(count);
  for (let i = 0; i < count; i++) values[i] = bytes[i] | bytes[i + count] << 8;
  return values;
}

export function decodeWaveCache(buffer, meta) {
  const perChannel = meta.grid * meta.grid * meta.storedFrames, count = perChannel * 4;
  if (buffer.byteLength !== count * 2) throw new Error('海浪数据不完整。');
  if (meta.encoding?.type !== 'temporal-delta-channel-byteplanes-v1') throw new Error('无法识别海浪数据格式。');
  const order = meta.encoding.order;
  if (!Number.isInteger(order) || order < 1 || order > 6) throw new Error('无法识别海浪差分阶数。');
  const bytes = new Uint8Array(buffer), values = new Uint16Array(count);
  for (let c = 0; c < 4; c++) for (let i = 0; i < perChannel; i++) {
    const from = c * perChannel + i;
    values[i * 4 + c] = bytes[from] | bytes[from + count] << 8;
  }
  const stride = meta.grid * meta.grid * 4;
  for (let pass = 0; pass < order; pass++) for (let i = stride; i < count; i++) values[i] += values[i - stride];
  return values.buffer;
}

export function packSourceWaves(meta, buffer) {
  const { grid, storedFrames, minimum, range } = meta;
  const count = grid * grid * storedFrames * 4;
  if (buffer.byteLength !== count * 2) throw new Error('海浪数据不完整。');
  const columns = Math.ceil(Math.sqrt(storedFrames)), rows = Math.ceil(storedFrames / columns);
  const width = columns * grid, height = rows * grid;
  const packed = new Uint16Array(width * height * 4), view = new DataView(buffer);
  let maximumError = 0;
  const tables = minimum.map((min, c) => {
    const table = new Uint16Array(65536);
    for (let i = 0; i < 65536; i++) {
      const value = min + i / 65535 * range[c];
      table[i] = DataUtils.toHalfFloat(value);
      maximumError = Math.max(maximumError, Math.abs(DataUtils.fromHalfFloat(table[i]) - value));
    }
    return table;
  });
  for (let f = 0; f < storedFrames; f++) for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) {
    const source = ((f * grid + y) * grid + x) * 4;
    const target = ((Math.floor(f / columns) * grid + y) * width + (f % columns) * grid + x) * 4;
    for (let c = 0; c < 4; c++) packed[target + c] = tables[c][view.getUint16((source + c) * 2, true)];
  }
  return { packed, width, height, columns, maximumError };
}

export async function unzipOcean(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const compressed = await response.arrayBuffer(), signature = new Uint8Array(compressed, 0, Math.min(2, compressed.byteLength));
  // Some servers already apply Content-Encoding. Do not decompress twice.
  if (signature[0] !== 0x1f || signature[1] !== 0x8b) return compressed;
  return new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
