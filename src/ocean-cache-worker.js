import { DataUtils } from 'three/src/extras/DataUtils.js';
import { decodeBytePlanes, decodeWaveCache, packSourceWaves, unzipOcean } from './ocean-cache-codec.js';

self.onmessage = async ({ data: { base, wave, shader } }) => {
  try {
    const [encoded, brdfBuffer, noiseBuffer] = await Promise.all([
      unzipOcean(`${base}${wave.sampleFile}`), unzipOcean(`${base}${shader.brdfFile}`), unzipOcean(`${base}${shader.noiseFile}`),
    ]);
    self.postMessage({ progress: '准备三维海面…' });
    const atlas = packSourceWaves(wave, decodeWaveCache(encoded, wave));
    const brdf = decodeBytePlanes(brdfBuffer);
    const noise = new Uint16Array(noiseBuffer.byteLength / 2), view = new DataView(noiseBuffer);
    for (let i = 0; i < noise.length; i++) noise[i] = DataUtils.toHalfFloat(view.getUint16(i * 2, true) / 65535);
    self.postMessage({ atlas, brdf, noise }, [atlas.packed.buffer, brdf.buffer, noise.buffer]);
  } catch (error) { self.postMessage({ error: error.message }); }
};
