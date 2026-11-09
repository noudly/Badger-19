import {build} from 'esbuild';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const root=new URL('.',import.meta.url);
const sourceFile=process.env.BADGER_AUDIO_FILE?pathToFileURL(process.env.BADGER_AUDIO_FILE):new URL('../assets/audio/hao-bu-rong-yi.mp3',root);
let songSource='./assets/audio/hao-bu-rong-yi.mp3',musicIncluded=false;
try{const data=await fs.readFile(sourceFile);if(data.length>25*1024*1024)throw new Error('Audio file exceeds 25 MB; use a compressed MP3 or M4A.');const mime=sourceFile.pathname.toLowerCase().endsWith('.m4a')?'audio/mp4':'audio/mpeg';songSource=`data:${mime};base64,${data.toString('base64')}`;musicIncluded=true;}catch(e){if(e.code!=='ENOENT')throw e;}

await build({entryPoints:[new URL('main.js',root).pathname],bundle:true,define:{__BADGER_SONG_SOURCE__:JSON.stringify(songSource)},loader:{'.html':'text'},minify:true,format:'iife',target:['es2020'],outfile:new URL('app.bundle.js',root).pathname,legalComments:'eof'});
const html=await fs.readFile(new URL('template.html',root),'utf8');
const js=(await fs.readFile(new URL('app.bundle.js',root),'utf8')).replace(/[ \t]+$/gm,'');
await fs.mkdir(new URL('../dist',root),{recursive:true});
const output=html.replace('<!-- APP_SCRIPT -->',()=>'<script data-badger-app>'+js.replaceAll('</script','<\\/script')+'</script>');
new Function(output.match(/<script data-badger-app>([\s\S]*?)<\/script>/)[1]);
await fs.writeFile(new URL('../dist/index.html',root),output);
await fs.mkdir(new URL('../exports/',root),{recursive:true});
await fs.copyFile(new URL('../dist/index.html',root),new URL('../exports/PROJECT-BADGER-19-offline.html',root));
console.log('Song recording included:',musicIncluded);
console.log('Built self-contained website and offline HTML:',Buffer.byteLength(html)+Buffer.byteLength(js),'bytes');
