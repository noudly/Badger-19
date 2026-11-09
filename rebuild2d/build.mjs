import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(new URL('../rebuild/package.json',import.meta.url));
const {build}=require('esbuild');
const root=new URL('../',import.meta.url);
const meta=JSON.parse(await fs.readFile(new URL('assets/illustrations/manifest.json',root),'utf8'));
const images={};
for(const [key,asset]of Object.entries(meta.assets)){
  const data=await fs.readFile(new URL('assets/illustrations/'+asset.file,root));
  images[key]={...asset,src:`data:image/webp;base64,${data.toString('base64')}`};
  delete images[key].file;
}
const songFile=process.env.BADGER_AUDIO_FILE?pathToFileURL(process.env.BADGER_AUDIO_FILE):new URL('assets/audio/hao-bu-rong-yi.mp3',root);
const song=await fs.readFile(songFile);if(song.length>25*1024*1024)throw new Error('Use a compressed recording under25MB.');
const mime=songFile.pathname.toLowerCase().endsWith('.m4a')?'audio/mp4':'audio/mpeg';
const songSource=`data:${mime};base64,${song.toString('base64')}`;
const bundle=await build({entryPoints:[new URL('main.js',import.meta.url).pathname],bundle:true,write:false,define:{__BADGER_IMAGES__:JSON.stringify(images),__BADGER_SONG_SOURCE__:JSON.stringify(songSource)},loader:{'.html':'text'},format:'iife',target:['es2020'],minify:true,legalComments:'eof'});
const shell=await fs.readFile(new URL('template.html',import.meta.url),'utf8');
const script=bundle.outputFiles[0].text.trimEnd();
if(script.includes('WebGLRenderer')||script.includes('createCast'))throw new Error('The 2D release must not contain the former 3D renderer.');
const output=shell.replace('<!-- APP_SCRIPT -->',()=>'<script data-badger-app>'+script.replace(/<\/script/gi,token=>'<\\/'+token.slice(2))+'</script>');
new Function(script);
await fs.mkdir(new URL('dist/',root),{recursive:true});
await fs.mkdir(new URL('exports/',root),{recursive:true});
await fs.writeFile(new URL('dist/index.html',root),output);
await fs.writeFile(new URL('exports/PROJECT-BADGER-19-offline.html',root),output);
console.log(`Built illustrated2D story: ${Object.keys(images).length} embedded art assets; ${Buffer.byteLength(output)}bytes; original song included.`);
