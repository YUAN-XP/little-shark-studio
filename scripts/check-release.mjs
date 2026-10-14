import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const output = join(root, 'dist');
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.isSymbolicLink()) throw new Error('Publication files must not contain symbolic links.');
    const file = join(directory, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}
if (!existsSync(output)) throw new Error('Build the website before checking publication files.');
const built = files(output);
const bytes = built.reduce((total, file) => total + statSync(file).size, 0);
if (bytes >= 1_000_000_000) throw new Error('The website exceeds the GitHub Pages size limit.');
for (const file of built) {
  if (statSync(file).size > 100 * 1024 * 1024) throw new Error(`A publication file is too large for this repository: ${relative(output, file)}`);
  if (/\.(?:blend\d*|docx?|pptx?|psd|bak)$/i.test(file) || /(?:^|[\\/])\.env(?:\.|$)/i.test(file)) throw new Error('A private working file entered the publication output.');
}
for (const unwanted of ['cover-review.html', 'media/hero-beach-v3.mp4']) {
  if (existsSync(join(output, unwanted))) throw new Error(`A local-only asset entered publication: ${unwanted}`);
}
for (const required of ['index.html', '.nojekyll', 'media/videos/digital-hubei-v1.mp4', 'media/videos/three-body-v1.mp4', 'media/about/about-beach-crafted-v2.glb', 'media/gallery-companion/character-v7.png']) {
  if (!existsSync(join(output, required))) throw new Error(`A required website asset is missing: ${required}`);
}
// The manifest is assembled from the real website data, so missing project
// pictures/videos and filename case differences fail before publication.
const sourceFiles = ['src/content.js', 'src/projectStories.js', 'src/projectEvidence.js', 'src/GalleryCompanion.jsx'];
const references = new Set();
for (const sourceFile of sourceFiles) {
  const text = readFileSync(join(root, sourceFile), 'utf8');
  for (const match of text.matchAll(/asset\(\s*["']([^"']+)["']\s*\)/g)) references.add(`media/${match[1]}`);
  for (const match of text.matchAll(/\$\{import\.meta\.env\.BASE_URL\}([^`$]+)[`]/g)) references.add(match[1]);
}
const evidence = readFileSync(join(root, 'src/projectEvidence.js'), 'utf8');
for (const match of evidence.matchAll(/"file"\s*:\s*"([^"]+)"/g)) references.add(`media/projects/details-v1/${match[1]}`);
const beach = readFileSync(join(root, 'src/AboutBeach.jsx'), 'utf8');
for (const match of beach.matchAll(/asset\(\s*["']([^"']+)["']\s*\)/g)) references.add(`media/about/${match[1]}`);
const actualPaths = new Set(built.map(file => relative(output, file).replaceAll('\\', '/')));
for (const reference of references) {
  if (!actualPaths.has(reference)) throw new Error(`A website asset is absent or has different filename casing: ${reference}`);
}
console.log(JSON.stringify({ files: built.length, sizeMiB: +(bytes / 1024 / 1024).toFixed(2), checkedDataReferences: references.size, status: 'ready' }));
