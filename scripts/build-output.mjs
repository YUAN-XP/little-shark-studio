import { existsSync, lstatSync, readdirSync, realpathSync, rmdirSync, unlinkSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const siteRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
export const buildOutput = resolve(siteRoot, 'dist');

// Validate resolved targets and avoid recursive fs.rm, which can leave files
// behind on some Windows runtimes.
export function removeBuildEntry(name = '') {
  const target = resolve(buildOutput, name);
  const inside = relative(buildOutput, target);
  if (inside.startsWith('..') || isAbsolute(inside) || dirname(buildOutput) !== siteRoot) throw new Error('Unsafe build cleanup target.');
  if (!existsSync(target)) return;
  const remove = path => {
    const entry = lstatSync(path);
    if (entry.isSymbolicLink() || realpathSync(path).toLowerCase() !== path.toLowerCase()) throw new Error('Build cleanup cannot follow external links.');
    if (entry.isDirectory()) {
      for (const child of readdirSync(path)) remove(resolve(path, child));
      rmdirSync(path);
    } else unlinkSync(path);
  };
  remove(target);
  if (existsSync(target)) throw new Error('Build cleanup did not complete.');
}
