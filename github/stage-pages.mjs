import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Publish only the current story and its optional assets. Older preview images,
// build sources, the Sites manifest and private project notes stay out of Pages.
const source = fileURLToPath(new URL('../dist/', import.meta.url));
const target = process.argv[2]
  ? path.resolve(process.argv[2])
  : await fs.mkdtemp(path.join(os.tmpdir(), 'badger-pages-'));

await fs.access(path.join(source, 'index.html'));
await fs.mkdir(target, {recursive: true});
if ((await fs.readdir(target)).length) {
  throw new Error(`Pages output must be empty: ${target}`);
}
await fs.copyFile(path.join(source, 'index.html'), path.join(target, 'index.html'));
try {
  const assets = path.join(source, 'assets');
  if ((await fs.stat(assets)).isDirectory()) {
    await fs.cp(assets, path.join(target, 'assets'), {recursive: true});
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await fs.writeFile(path.join(target, '.nojekyll'), '');
console.log(`GitHub Pages artifact: ${target}`);
