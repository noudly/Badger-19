import assert from 'node:assert/strict';
import {encodeQR} from './qr-core.mjs';
const fixture='https://example.invalid/badger-19/';
const qr=await encodeQR(fixture);
assert.equal(qr.url,fixture);assert(qr.decodedCorrectly);assert(qr.png.length>1000);assert(qr.svg.includes('<svg'));
await assert.rejects(()=>encodeQR('http://example.invalid/'));
await assert.rejects(()=>encodeQR('https://user:password@example.invalid/'));
console.log('QR encoder roundtrip passed on a test-only URL; no final destination or QR file claimed.');
