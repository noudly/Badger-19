import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createArchive } from './archive.js';

const originalBlob = globalThis.Blob;
const originalURL = globalThis.URL;
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
let blobs = [];
let urlCalls = 0;
class TestBlob {
  constructor(parts, options) {
    this.parts = parts;
    this.options = options;
    blobs.push(this);
  }
}
try {
  globalThis.Blob = TestBlob;
  globalThis.URL = { createObjectURL(blob) { assert.equal(blob, blobs.at(-1)); return 'blob:test/' + (++urlCalls); } };
  Object.defineProperty(globalThis, 'document', { configurable: true, get() { throw new Error('Live DOM must not be read'); } });
  const shell = '<!doctype html><html><head><title>BADGER · 19</title></head><body><main>原始照片</main><!-- APP_SCRIPT --></body></html>';
  const caption = "有些光，是一起看到的。 $& $' $` </ScRiPt> </SCRIPT > </script>";
  const script = 'globalThis.savedCaption=' + JSON.stringify(caption) + ';globalThis.keepMarker="<!-- APP_SCRIPT -->";';
  const archive = createArchive(shell, script);
  assert.equal(archive.available, true);
  assert.equal(blobs.length, 0, 'Blob must be lazy');
  assert.equal(urlCalls, 0, 'URL must be lazy');
  const anchor = {};
  assert.equal(archive.save(anchor), true);
  assert.equal(anchor.href, 'blob:test/1');
  assert.equal(anchor.download, 'BADGER-19.html');
  assert.equal(blobs[0].options.type, 'text/html;charset=utf-8');
  const output = blobs[0].parts.join('');
  const expectedScript = script.replace(/<\/script/gi, token => '<\\/' + token.slice(2));
  assert.equal(output, shell.replace('<!-- APP_SCRIPT -->', () => '<script data-badger-app>' + expectedScript + '</script>'));
  assert.equal((output.match(/<\/script\s*>/gi) || []).length, 1, 'Only inserted script closing tag may remain');
  assert.ok(output.includes('<\\/ScRiPt>'), 'Mixed case must remain preserved');
  assert.ok(output.includes("$& $' $`"), 'Replacement metacharacters must remain literal');
  const context = {};
  vm.runInNewContext(expectedScript, context);
  assert.equal(context.savedCaption, caption, 'Escaping must preserve captions and JS semantics');
  assert.equal(context.keepMarker, '<!-- APP_SCRIPT -->');
  const secondAnchor = {};
  assert.equal(archive.save(secondAnchor), true);
  assert.equal(secondAnchor.href, anchor.href);
  assert.equal(blobs.length, 1, 'Reuse Blob');
  assert.equal(urlCalls, 1, 'Reuse object URL');
  assert.equal(archive.save(null), false);
  assert.equal(archive.save('anchor'), false);
  assert.equal(archive.save(Object.freeze({})), false, 'Bad target must not throw');

  for (const [badShell, badScript] of [[null,script],['',script],['<html></html>',script],[shell,null],[shell,''],[shell,' \n '],[shell + '<!-- APP_SCRIPT -->',script]]) {
    const invalid = createArchive(badShell, badScript);
    assert.equal(invalid.available, false);
    assert.equal(invalid.save({}), false);
  }
  assert.equal(blobs.length, 1, 'Invalid input must not allocate');
  globalThis.URL = { createObjectURL() { throw new Error('Unavailable'); } };
  assert.equal(createArchive(shell, script).save({}), false, 'URL failures must not throw');
  globalThis.URL = undefined;
  assert.equal(createArchive(shell, script).save({}), false);
  globalThis.Blob = undefined;
  assert.equal(createArchive(shell, script).save({}), false);
  console.log('PASS archive: lazy creation, native anchor fields, URL reuse, pristine shell/source, caption semantics, mixed-case escaping, replacement literals, invalid inputs, and failure handling');
} finally {
  globalThis.Blob = originalBlob;
  globalThis.URL = originalURL;
  if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
  else delete globalThis.document;
}
