import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

const root=new URL('../',import.meta.url);
const main=await fs.readFile(new URL('main.js',import.meta.url),'utf8');
const template=await fs.readFile(new URL('template.html',import.meta.url),'utf8');
const stage=await fs.readFile(new URL('stage.js',import.meta.url),'utf8');
assert(!/import .*three|WebGLRenderer/.test(main+stage),'The release must use painted Canvas2D art');
assert(stage.includes("getContext('2d'"),'Canvas2D renderer is required');
const ids=[...template.matchAll(/\bid=["']([^"']+)["']/g)].map(match=>match[1]);
assert.equal(new Set(ids).size,ids.length,'Duplicate UI IDs');
for(const match of main.matchAll(/\$\('#([^']+)'\)/g))assert(ids.includes(match[1]),`Missing UI element: ${match[1]}`);
assert.equal(template.split('<!-- APP_SCRIPT -->').length,2);
const meta=JSON.parse(await fs.readFile(new URL('assets/illustrations/manifest.json',root),'utf8'));
const expected=['street','window','fracture','bloom','snow','actors','photoPose','reachPose','holdPose','snowPose','portraitPose'];
assert.deepEqual(Object.keys(meta.assets).sort(),expected.sort());
let total=0;
for(const [key,asset]of Object.entries(meta.assets)){
  const bytes=await fs.readFile(new URL('assets/illustrations/'+asset.file,root));total+=bytes.length;
  assert.equal(bytes.toString('ascii',0,4),'RIFF',key+' must be a valid web image');
  assert.equal(bytes.toString('ascii',8,12),'WEBP',key+' must have a WebP payload');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,key+' asset checksum');
  assert(asset.width>0&&asset.height>0);
  for(const frame of asset.frames||[]){
    assert(frame.x>=0&&frame.y>=0&&frame.w>0&&frame.h>0);
    assert(frame.x+frame.w<=asset.width&&frame.y+frame.h<=asset.height,key+' crop exceeds the source artwork');
  }
}
assert.equal(meta.assets.actors.frames.length,2);
assert(total<6*1024*1024,'Illustrations exceed the mobile delivery budget');
assert(!template.includes('id="chapter"'),'The gift no longer shows a technical chapter footer');
console.log(`PASS illustrated release: ${expected.length} verified assets, ${(total/1024/1024).toFixed(2)}MiB art, complete UI contract, no3D renderer.`);
