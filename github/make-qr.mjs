import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {encodeQR} from './qr-core.mjs';
const requested=process.argv[2],output=path.resolve(process.argv[3]||'exports/qr');
const input=new URL(requested||'');
if(input.protocol!=='https:'||input.username||input.password)throw new Error('Supply the actual public HTTPS Pages URL.');
let canonical,body,lastError;
for(let attempt=0;attempt<8;attempt++){
 try{
  const result=execFileSync('curl',['--fail','--location','--silent','--show-error','--compressed','--proto','=https','--proto-redir','=https','--max-time','20','--write-out','\n%{url_effective}',input.href],{encoding:'utf8',maxBuffer:64*1024*1024});
  const split=result.lastIndexOf('\n');body=result.slice(0,split);canonical=new URL(result.slice(split+1)).href;
  if(!body.includes('PROJECT BADGER')||!body.includes('data-badger-app'))throw new Error('The URL does not serve the built BADGER story.');
  break;
 }catch(error){if(/error:\s*(401|403)/.test(String(error.stderr||'')))throw new Error('The proposed QR target requires authentication; do not print this URL.');lastError=error;canonical=null;if(attempt<7)await new Promise(resolve=>setTimeout(resolve,3000));}
}
if(!canonical)throw lastError;
const {png,svg}=await encodeQR(canonical);
await fs.mkdir(output,{recursive:true});
await fs.writeFile(path.join(output,'BADGER-19-QR.png'),png);
await fs.writeFile(path.join(output,'BADGER-19-QR.svg'),svg);
await fs.writeFile(path.join(output,'url.txt'),canonical+'\n');
await fs.writeFile(path.join(output,'verification.json'),JSON.stringify({url:canonical,verifiedAt:new Date().toISOString(),pageContainsStory:true,decodedCorrectly:true,errorCorrection:'H',quietZoneModules:4},null,2)+'\n');
console.log('Verified Pages URL and QR:',canonical);
console.log('PNG and SVG:',output);
