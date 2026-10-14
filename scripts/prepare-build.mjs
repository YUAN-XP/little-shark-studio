import { existsSync, realpathSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Clean only this site's derived output; source files and references stay outside it.
const siteRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const output = resolve(siteRoot, 'dist');
if (dirname(output) !== siteRoot) throw new Error('Unexpected build output location.');
if (existsSync(output)) {
  if (realpathSync(output).toLowerCase() !== output.toLowerCase()) {
    throw new Error('Build output must be a direct folder inside the website.');
  }
  rmSync(output, { recursive: true, force: true });
}
