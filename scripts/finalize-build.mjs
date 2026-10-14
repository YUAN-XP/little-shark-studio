import { existsSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const dist = realpathSync(join(root, 'dist'));
if (dirname(dist) !== root) throw new Error('Build output must remain directly inside this website.');

// These local review/history assets are retained in public for local reference,
// but excluded from Git and from the actual published output.
for (const relative of ['cover-review.html', 'media/hero-beach-v3.mp4']) {
  const file = resolve(dist, relative);
  if (!file.startsWith(dist + '/')) {
    // Windows resolves separators differently; verify with relative paths below.
    const normalized = file.replaceAll('\\', '/');
    if (!normalized.startsWith(dist.replaceAll('\\', '/') + '/')) throw new Error('Unexpected publication cleanup target.');
  }
  if (existsSync(file)) {
    const actual = realpathSync(file).replaceAll('\\', '/');
    if (!actual.startsWith(dist.replaceAll('\\', '/') + '/')) throw new Error('Publication cleanup cannot follow an external link.');
    unlinkSync(file);
  }
}
writeFileSync(join(dist, '.nojekyll'), '');
console.log('Publication output prepared.');
