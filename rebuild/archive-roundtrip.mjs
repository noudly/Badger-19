import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createArchive} from './archive.js';
const shell=await fs.readFile(new URL('template.html',import.meta.url),'utf8');
const built=await fs.readFile(new URL('../dist/index.html',import.meta.url),'utf8');
const script=built.match(/<script data-badger-app>([\s\S]*?)<\/script>/)?.[1];
assert(script,'Built source script missing');
let blob;
const original=URL.createObjectURL;
try{
 URL.createObjectURL=value=>(blob=value,'blob:offline-roundtrip');
 const archive=createArchive(shell,script),anchor={};
 assert(archive.available&&archive.save(anchor));
 assert.equal(anchor.download,'BADGER-19.html');
 const exported=await blob.text();
 assert.equal(exported,built,'Offline export must preserve the complete pristine website');
 new Function(exported.match(/<script data-badger-app>([\s\S]*?)<\/script>/)[1]);
 const offline=await fs.readFile(new URL('../exports/PROJECT-BADGER-19-offline.html',import.meta.url),'utf8');
 assert.equal(offline,exported,'Published, downloadable and supplied offline versions must match');
 console.log('Offline export roundtrip preserves the complete built website byte for byte.');
}finally{URL.createObjectURL=original;}
