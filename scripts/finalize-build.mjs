import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildOutput, removeBuildEntry } from './build-output.mjs';

// Retain review/source originals locally while publishing only active assets.
for (const name of [
  'cover-review.html', 'media/hero-beach-v3.mp4', 'media/hero-beach-poster-v3.webp',
  'media/palm-layer.png', 'media/gallery-companion/character-v7.png',
  'media/about/ocean-samples-v1.bin', 'media/about/ocean-samples-v1.json',
  'media/about/about-beach-approved-v1.webp', 'media/about/local-only',
  'media/about/ocean-native-v2',
]) removeBuildEntry(name);
writeFileSync(join(buildOutput, '.nojekyll'), '');
console.log('Publication output prepared.');
