import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import { Soundtrack } from './score.js';
import { MusicClock } from './music-clock.js';
const clockAt=time=>{const clock=new MusicClock();clock.reset(time);return clock;};

const source=await fs.readFile(new URL('main.js',import.meta.url),'utf8');
const failures=[];
let passed=0;
const test=async(name,fn)=>{try{await fn();passed++;console.log('PASS',name);}catch(e){failures.push({name,message:e.message});console.error('FAIL',name,e.message);}};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const unhandled=[];
const onUnhandled=e=>unhandled.push(e);
process.on('unhandledRejection',onUnhandled);

function makeAudioHarness(){
 const button={attrs:{},classList:{toggle(){}},setAttribute(k,v){this.attrs[k]=v;}};
 const timers=new Map();let timerId=0;
 const param=()=>({value:0,events:[],setValueAtTime(v,t){this.value=v;this.events.push([v,t]);},setTargetAtTime(v,t){this.value=v;this.events.push([v,t]);},exponentialRampToValueAtTime(v,t){this.value=v;this.events.push([v,t]);},cancelScheduledValues(){}});
 class FakeAudioContext{
  constructor(){this.state='suspended';this.currentTime=10;this.sampleRate=100;this.resumeCalls=0;this.suspendCalls=0;this.destination={};this.rejectNext=false;}
  resume(){this.resumeCalls++;if(this.rejectNext){this.rejectNext=false;return Promise.reject(Error('resume denied'));}this.state='running';this.onstatechange?.();return Promise.resolve();}
  suspend(){this.suspendCalls++;this.state='suspended';this.onstatechange?.();return Promise.resolve();}
  createGain(){return{gain:param(),connect(){},disconnect(){}};}
  createBiquadFilter(){return{frequency:param(),connect(){}};}
  createConvolver(){return{connect(){}};}
  createBuffer(channels,length){return{getChannelData:()=>new Float32Array(length)};}
  createOscillator(){return{frequency:param(),connect(){},start(){},stop(){}};}
 }
 const score=new Soundtrack({button,AudioContext:FakeAudioContext,setInterval(fn){const id=++timerId;timers.set(id,fn);return id;},clearInterval(id){timers.delete(id);}});
 return{score,button,timers};
}

await test('sound unlock and mute reflect actual playback state',async()=>{
 const{score,button}=makeAudioHarness();score.unlock();await flush();assert.equal(score.active,true);assert.equal(button.attrs['aria-pressed'],'true');score.toggle();await flush();assert.equal(score.muted,true);assert.equal(score.active,false);assert.equal(button.attrs['aria-pressed'],'false');score.toggle();await flush();assert.equal(score.muted,false);assert.equal(score.active,true);
});
await test('exploring while music plays keeps the score clock',async()=>{
 const {score,timers}=makeAudioHarness();score.unlock();await flush();score.setScene('street');assert.equal(timers.size,1);const next=score.next;score.ac.currentTime+=.04;score.unlock();await flush();assert.equal(score.next,next,'A playing score should not reschedule every time the scene is touched');assert.equal(score.active,true);assert.equal(timers.size,1,'Exploration must not duplicate the scheduler');
});
await test('one click recovers a system-suspended context',async()=>{
 const{score,button}=makeAudioHarness();score.unlock();await flush();score.ac.state='suspended';score.ac.onstatechange?.();assert.equal(button.attrs['aria-pressed'],'false');assert.equal(score.active,false);const calls=score.ac.resumeCalls;score.toggle();await flush();assert.equal(score.muted,false,'Recovering a suspended context must not mute it');assert(score.ac.resumeCalls>calls);assert.equal(score.active,true);
});
await test('denied audio resume is contained and retryable',async()=>{
 const{score}=makeAudioHarness();score.unlock();await flush();score.suspend();score.ac.rejectNext=true;const errorsBefore=unhandled.length;score.resume();await flush();assert.equal(unhandled.length,errorsBefore,'Audio resume rejection escaped the handler');assert.equal(score.active,false);score.toggle();await flush();assert.equal(score.muted,false);assert.equal(score.active,true);
});
await test('background recovery preserves explicit mute',async()=>{
 const{score}=makeAudioHarness();score.unlock();await flush();score.toggle();await flush();score.suspend();const calls=score.ac.resumeCalls;score.resume();await flush();assert.equal(score.ac.resumeCalls,calls);assert.equal(score.muted,true);assert.equal(score.active,false);
});
await test('the actual score scheduler stops on intro, mute and system pause',async()=>{
 const {score,timers}=makeAudioHarness();await score.unlock();assert.equal(timers.size,0,'The code opening must stay silent');score.setScene('street');assert.equal(timers.size,1);assert(score._voices.size>0,'Entering the street should schedule audible voices');
 await score.toggle();assert.equal(timers.size,0);await score.toggle();assert.equal(timers.size,1);await score.suspend();assert.equal(timers.size,0);assert.equal(score.active,false);await score.resume();assert.equal(timers.size,1);score.restart();assert.equal(timers.size,0);assert.equal(score.phase,'intro');score.dispose();assert.equal(timers.size,0);assert.equal(score.active,false);
});

await test('reduced motion keeps a real clock for exploration feedback',()=>{
 const start=source.indexOf('function frame(now)'),end=source.indexOf('const captionCues',start);assert(start>=0&&end>start);
 const code=source.slice(start,end);
 const records={};
 const fakeDocument={body:{classList:{add(){},remove(){},toggle(){}}}};
 const common={phase:'street',local:10,progress:.5};
 const params={musicClock:clockAt(10),unfolding:{update(){}},score:{updateStory(s){records.score=s;}},applyLighting(){},updateSnowSpot(){},cast:{update(...args){records.cast=args;}},world:{update(...args){records.world=args;}},interaction:{reduced:true},key:{},rim:{},renderer:{render(){}},scene:{},camera:{},document:fakeDocument,getStory:()=>common,enter(){},stageCast(){},shot(){},setCaptionOnce(){},updatePhotoMoment(){},createPhotograph(){},requestAnimationFrame(){},ease:x=>x};
 const names=Object.keys(params);
 new Function(...names,'let last=1000,elapsed=10,paused=false,hasLoaded=true,frameDelta=0,nowStory=null,previousPhase="street",capturePending=false,contextLost=false,shutterUntil=-1;const reduce=true;'+code+';frame(1020);')(...names.map(k=>params[k]));
 assert(records.cast[0]>10,'Character interaction chronology was frozen');assert(records.world[0]>10,'World interaction chronology was frozen');assert.equal(records.cast[2].reduced,true);assert.equal(records.score,common,'The soundtrack must follow the same story state as the scene');
});
await test('photo capture retries once, then exposes manual recovery',()=>{
 const start=source.indexOf('function frame(now)'),end=source.indexOf('const captionCues',start);const frameCode=source.slice(start,end);
 const retryStart=source.indexOf("$('#retry-photo').addEventListener"),retryEnd=source.indexOf('});',retryStart)+3;assert(retryStart>=0&&retryEnd>retryStart);const retryCode=source.slice(retryStart,retryEnd);
 const status={hidden:true},retry={};let calls=0,result=false;const story={phase:'final',local:2,progress:1};
 const params={musicClock:clockAt(90),unfolding:{update(){}},score:{updateStory(){}},applyLighting(){},updateSnowSpot(){},cast:{update(){}},world:{update(){}},interaction:{reduced:true},key:{},rim:{},renderer:{render(){}},scene:{},camera:{},document:{body:{classList:{add(){},remove(){},toggle(){}}}},getStory:()=>story,enter(){},stageCast(){},shot(){},setCaptionOnce(){},updatePhotoMoment(){},createPhotograph(){calls++;return result;},requestAnimationFrame(){},ease:x=>x,$:selector=>selector==='#photo-status'?status:{addEventListener(type,fn){retry.fn=fn;}}};
 const names=Object.keys(params);
 const api=new Function(...names,'let last=0,elapsed=90,paused=false,hasLoaded=true,frameDelta=0,nowStory=null,previousPhase="final",capturePending=true,captureAttempts=0,captureNext=2,contextLost=false,shutterUntil=-1;const reduce=true;'+frameCode+retryCode+';return {frame,read:()=>({capturePending,captureAttempts,captureNext})};')(...names.map(k=>params[k]));
 api.frame(1000);assert.equal(calls,1);assert.equal(api.read().capturePending,true);assert.equal(status.hidden,true);
 story.local=2.9;api.frame(1016);assert.equal(calls,1,'Retry should wait rather than run every frame');
 story.local=3;api.frame(1032);assert.equal(calls,2);assert.equal(api.read().capturePending,false);assert.equal(status.hidden,false,'Two failed attempts must show recovery');
 story.local=100;api.frame(1048);assert.equal(calls,2,'Capture failure must not create an endless retry loop');
 assert.equal(typeof retry.fn,'function');retry.fn();assert.equal(status.hidden,true);assert.equal(api.read().captureAttempts,0);assert.equal(api.read().capturePending,true);
 result=true;story.local=100.2;api.frame(1064);assert.equal(calls,3);assert.equal(api.read().capturePending,false,'Successful manual retry should finish capture');
});
await test('snow follows the transformed palm surface and clears outside the scene',()=>{
 const start=source.indexOf('function updateSnowSpot('),end=source.indexOf('\n\n',start);assert(start>=0&&end>start,'updateSnowSpot is missing');
 const root=new THREE.Group(),arm=new THREE.Group();root.position.set(1.2,.6,-2.1);root.rotation.set(.12,-.8,.2);root.scale.set(.9,1.15,.8);arm.position.set(.2,.9,.15);arm.rotation.set(-.4,.2,.65);root.add(arm);
 const palm=new THREE.Mesh(new THREE.SphereGeometry(1,192,128));palm.position.set(.03,-.25,.08);palm.rotation.set(.6,-.3,.25);palm.scale.set(.12,.055,.085);arm.add(palm);
 const fallback=palm.clone();fallback.position.x+=2;arm.add(fallback);const cast={bear:{snowPalm:palm,rightArm:{paw:fallback}}},interaction={},snowSpot=new THREE.Vector3();
 const update=new Function('cast','interaction','snowSpot',source.slice(start,end)+';return updateSnowSpot;')(cast,interaction,snowSpot);
 const verify=object=>{root.updateWorldMatrix(true,true);const center=object.getWorldPosition(new THREE.Vector3()),bounds=new THREE.Box3().setFromObject(object,true);update({phase:'snow',local:4});assert.equal(interaction.snowSpot,snowSpot);assert(Math.abs(snowSpot.x-center.x)<1e-10);assert(Math.abs(snowSpot.y-bounds.max.y)<.00003,'Snow did not reach the top of the rotated/scaled palm');assert(Math.abs(snowSpot.z-center.z-.025)<1e-10);};
 verify(palm);delete cast.bear.snowPalm;verify(fallback);update({phase:'final',local:0});assert.equal(interaction.snowSpot,null,'Palm snow must stop after the snow scene');palm.geometry.dispose();
});
await test('photograph failures restore renderer and photographer visibility',async()=>{
 const {createPhotographs}=await import('./photographs.js');
 for(const failAt of['draw','encode'])for(const initiallyVisible of[true,false]){
  const state={ratio:1.6,width:390,height:844},renders=[];
  const photographer=new THREE.Group();photographer.visible=initiallyVisible;const handheld=new THREE.Object3D();handheld.position.set(.2,1.4,.1);photographer.add(handheld);const cast={bear:{group:photographer,camera:handheld}};
  const renderer={domElement:{},getSize(out){out.set(state.width,state.height);},getPixelRatio(){return state.ratio;},setPixelRatio(v){state.ratio=v;},setSize(w,h){state.width=w;state.height=h;},render(scene,camera){renders.push({camera,photographerVisible:photographer.visible});}};
  const ctx={fillRect(){},drawImage(){if(failAt==='draw')throw Error('drawing unavailable');},fillText(){}};
  globalThis.document={createElement:()=>({getContext:()=>ctx,toDataURL(){if(failAt==='encode')throw Error('encoding unavailable');return 'data:image/png;base64,TEST';}})};
  const view=new THREE.PerspectiveCamera();view.position.set(3,2,7);const position=view.position.clone();const photographs=createPhotographs(THREE,renderer,new THREE.Scene(),view);
  assert.equal(photographs.capture('window',cast),null);assert.deepEqual(state,{ratio:1.6,width:390,height:844});assert.equal(photographer.visible,initiallyVisible);assert.equal(renders[0].photographerVisible,false,'Photographer must not fill its own shot');assert.equal(renders.at(-1).camera,view);assert(view.position.equals(position),'Capturing a photo mutated the audience camera');
 }
});
await test('photographs return distinct portable records',async()=>{
 const{createPhotographs}=await import('./photographs.js');const state={ratio:1,width:1440,height:900};
 const renderer={domElement:{},getSize(out){out.set(state.width,state.height);},getPixelRatio(){return state.ratio;},setPixelRatio(v){state.ratio=v;},setSize(w,h){state.width=w;state.height=h;},render(){}};
 const ctx={fillRect(){},drawImage(){},fillText(){}};globalThis.document={createElement:()=>({getContext:()=>ctx,toDataURL:()=> 'data:image/png;base64,TEST'})};
 const photos=createPhotographs(THREE,renderer,new THREE.Scene(),new THREE.PerspectiveCamera());const windowPhoto=photos.capture('window',{}),togetherPhoto=photos.capture('together',{});
 assert.equal(windowPhoto.kind,'window');assert.equal(togetherPhoto.kind,'together');assert.notEqual(windowPhoto.label,togetherPhoto.label);assert(windowPhoto.url.startsWith('data:image/png;'));assert.equal(photos.capture('unknown',{}),null);
});

function albumHarness(capture=()=>null){
 const elements=new Map();const $=selector=>{if(!elements.has(selector)){const classes=new Set(),props=new Map();elements.set(selector,{hidden:true,textContent:'',src:'',href:'',download:'',classList:{add(v){classes.add(v);},remove(v){classes.delete(v);},toggle(v,on){if(on)classes.add(v);else classes.delete(v);},contains(v){return classes.has(v);}},style:{setProperty(k,v){props.set(k,v);},removeProperty(k){props.delete(k);}},open:false,showModal(){this.open=true;},close(){this.open=false;},handlers:{},addEventListener(event,fn){this.handlers[event]=fn;}});}return elements.get(selector);};
 const helperStart=source.indexOf('function showPhoto('),helperEnd=source.indexOf('function select(',helperStart);assert(helperStart>=0&&helperEnd>helperStart);
 const replayStart=source.indexOf("$('#replay').addEventListener('click',()=>{elapsed=0"),replayEnd=source.indexOf('const modal=',replayStart);assert(replayStart>=0&&replayEnd>replayStart);
 const doc={body:{dataset:{},classList:{add(){},remove(){},toggle(){}}}};
 const enterStart=source.indexOf('function enter('),enterEnd=source.indexOf('function stageCast(',enterStart);const modalStart=source.indexOf('const modal='),modalEnd=source.indexOf('let wasPlaying',modalStart);assert(enterStart>=0&&enterEnd>enterStart&&modalStart>=0&&modalEnd>modalStart);
 const cast={group:{userData:{}},badger:{group:{userData:{walk:{speed:1},lastStepPosition:new THREE.Vector3()}}},bear:{group:{userData:{walk:{speed:1},lastStepPosition:new THREE.Vector3()}}}};
 const api=new Function('$','photographs','cast','document','archive','musicClock',`let last=0,elapsed=40,photoRecords=[],photoIndex=0,memoryAttempted=false,memoryAttempts=0,memoryNext=10,memoryRevealedAt=-100,shutterUntil=-1,photoURL='',introExitAt=Infinity,captureAttempts=0,captureNext=0,capturePending=false,previousPhase='',cameraReady=false,photoStart=0;const reduce=true;const interaction={};const score={restart(){},shutter(){},setScene(){}};function setCaption(){};`+source.slice(enterStart,enterEnd)+source.slice(helperStart,helperEnd)+source.slice(replayStart,replayEnd)+source.slice(modalStart,modalEnd)+`;return {showPhoto,rememberPhoto,createPhotograph,updatePhotoMoment,enter,setTime(t){elapsed=t;},records:()=>photoRecords.slice(),read:()=>({photoIndex,memoryAttempted,memoryAttempts,memoryNext,memoryRevealedAt,photoURL,capturePending,captureAttempts}),replay:()=>$('#replay').handlers.click(),openAlbum:()=>$('#keepsake').handlers.click()};`)($,{capture},cast,doc,{available:true},clockAt(40));
 return{...api,$,cast};
}
await test('album selects matching photos and download filenames',()=>{
 const album=albumHarness();const windowPhoto={kind:'window',url:'data:image/png;base64,WINDOW',label:'Window'},togetherPhoto={kind:'together',url:'data:image/png;base64,TOGETHER',label:'Together'};
 album.rememberPhoto(windowPhoto);assert.equal(album.$('#photo-nav').hidden,true);album.rememberPhoto(togetherPhoto);assert.deepEqual(album.records().map(p=>p.kind),['together','window']);assert.equal(album.$('#photo-image').src,togetherPhoto.url);assert.equal(album.$('#download').download,'BADGER-and-BEAR-19.png');assert.equal(album.$('#photo-nav').hidden,false);
 album.showPhoto(1);assert.equal(album.$('#photo-image').src,windowPhoto.url);assert.equal(album.$('#download').href,windowPhoto.url);assert.equal(album.$('#download').download,'BADGER-the-little-light-19.png');assert.equal(album.$('#photo-count').textContent,'02 / 02');
 album.rememberPhoto({...windowPhoto,url:'data:image/png;base64,RETAKE'});assert.equal(album.records().length,2,'A retake should replace its kind, not duplicate it');album.showPhoto(-1);assert.equal(album.$('#photo-image').src,'data:image/png;base64,RETAKE');
 album.replay();assert.equal(album.records().length,0);assert.equal(album.read().photoIndex,0);assert.equal(album.$('#keepsake').hidden,true);assert.equal(album.$('#memory').classList.contains('visible'),false);assert.equal(album.$('#keepsake').classList.contains('has-memory'),false);assert.equal(album.read().memoryAttempts,0);assert.equal(album.read().memoryNext,10);for(const c of[album.cast.badger,album.cast.bear]){assert.equal(Object.hasOwn(c.group.userData,'walk'),false);assert.equal(Object.hasOwn(c.group.userData,'lastStepPosition'),false);}
});
await test('window photo retries once and records one successful memory',()=>{
 let calls=0;const record={kind:'window',url:'data:image/png;base64,WINDOW',label:'Window'};const album=albumHarness(()=>++calls===1?null:record);
 album.setTime(40);album.updatePhotoMoment({phase:'photo',local:10,progress:.7});assert.equal(calls,1);assert.equal(album.read().memoryAttempted,false);assert.equal(album.$('#memory').classList.contains('visible'),false);
 album.setTime(40.2);album.updatePhotoMoment({phase:'photo',local:10.2,progress:.7});assert.equal(calls,1,'Window retry must not run every frame');
 album.setTime(40.4);album.updatePhotoMoment({phase:'photo',local:10.4,progress:.7});assert.equal(calls,2);assert.equal(album.read().memoryAttempted,true);assert.equal(album.records().length,1);
 album.setTime(41.2);album.updatePhotoMoment({phase:'photo',local:11.2,progress:.7});assert.equal(album.$('#memory').classList.contains('visible'),true);assert.equal(calls,2);assert.equal(album.records().length,1,'Repeated frames must not duplicate a captured record');
});
await test('failed window captures are bounded and never reveal an empty card',()=>{
 let calls=0;const album=albumHarness(()=>{calls++;return null;});
 for(const local of[10,10.4,11,11.6,15]){album.setTime(30+local);album.updatePhotoMoment({phase:'photo',local,progress:local/16});}
 assert.equal(calls,2);assert.equal(album.read().memoryAttempted,true);assert.equal(album.records().length,0);assert.equal(album.$('#memory').classList.contains('visible'),false);
 let lateCalls=0;const late=albumHarness(()=>{lateCalls++;return null;});late.setTime(44);late.updatePhotoMoment({phase:'photo',local:12,progress:.75});assert.equal(lateCalls,0,'A late frame must not capture a photograph after the pose has ended');
});
await test('an existing window photo stays accessible when the final portrait fails',()=>{
 const record={kind:'window',url:'data:image/png;base64,WINDOW',label:'Window'};const album=albumHarness(()=>null);album.rememberPhoto(record);album.enter({phase:'final',local:0,progress:1});
 assert.equal(album.$('#keepsake').hidden,false);assert.equal(album.$('#photo-thumb').src,record.url);assert.equal(album.createPhotograph(),false);assert.equal(album.read().photoURL,'');assert.equal(album.records().length,1);
 album.openAlbum();assert.equal(album.$('#photo-modal').open,true,'The existing memory must open without a final portrait URL');assert.equal(album.$('#download').href,record.url);assert.equal(album.$('#download').download,'BADGER-the-little-light-19.png');
});
await test('resizing updates the renderer without replacing a kept photograph',()=>{
 const start=source.indexOf('function layout('),end=source.indexOf('function setCaption(',start);assert(start>=0&&end>start);
 const qStart=source.indexOf('function qualityForViewport('),qEnd=source.indexOf('const initialQuality=',qStart);const quality=new Function(source.slice(qStart,qEnd)+';return qualityForViewport;')();
 const state={width:1440,height:900,ratio:1},listeners={};const renderer={setPixelRatio(v){state.ratio=v;},setSize(w,h){state.width=w;state.height=h;}};const camera={aspect:1440/900,updateProjectionMatrix(){}};const key={shadow:{mapSize:new THREE.Vector2(1536,1536),map:{dispose(){}},needsUpdate:false}};
 const code=source.slice(start,end);
 const api=new Function('renderer','camera','key','qualityForViewport','addEventListener',`let innerWidth=1440,innerHeight=900,devicePixelRatio=2;let capturePending=false,captureAttempts=1,captureNext=2,photoURL='data:image/png;base64,ORIGINAL';const photoRecords=[{kind:'together',url:photoURL}];const nowStory={phase:'final',local:20};`+code+`;return {resize(w,h){innerWidth=w;innerHeight=h;layout();},state:()=>({capturePending,captureAttempts,captureNext,photoURL,recordURL:photoRecords[0].url})};`)(renderer,camera,key,quality,(event,fn)=>{listeners[event]=fn;});
 const before=api.state();assert.equal(typeof listeners.resize,'function');api.resize(390,844);listeners.resize();assert.deepEqual(api.state(),before,'A viewport change must not queue a new photograph or replace the original record');assert.equal(state.width,390);assert.equal(state.height,844);assert.equal(key.shadow.mapSize.x,1024);assert.equal(camera.aspect,390/844);
});

await test('lamp feedback survives reduced-motion mode',async()=>{
 const ctx=new Proxy({}, {get:(o,k)=>k in o?o[k]:(...args)=>{},set:(o,k,v)=>(o[k]=v,true)});
 globalThis.document={createElement:()=>({width:128,height:128,getContext:()=>ctx})};globalThis.matchMedia=()=>({matches:true});
 const{createWorld}=await import('./world.js');const scene=new THREE.Scene();const world=createWorld(THREE,scene);const story={phase:'street',local:10,progress:.5};
 world.update(10,story,{reduced:true,pulse:{kind:'',at:-100}});let baseline=0;scene.traverse(o=>{if(o.isPointLight)baseline=Math.max(baseline,o.intensity);});
 world.update(10.5,story,{reduced:true,pulse:{kind:'lamp',at:10}});let response=0;scene.traverse(o=>{if(o.isPointLight)response=Math.max(response,o.intensity);});assert(response>baseline,'Lamp never responded to the tap');world.dispose();
});

await test('viewport quality respects pixel and shadow budgets',()=>{
 const start=source.indexOf('function qualityForViewport(');assert(start>=0,'qualityForViewport is missing');let i=source.indexOf('{',start),depth=1;i++;while(depth&&i<source.length){if(source[i]==='{')depth++;if(source[i]==='}')depth--;i++;}
 const quality=new Function(source.slice(start,i)+';return qualityForViewport;')();
 for(const [w,h,dpr,maxPixels,shadow]of[[3840,2160,2,3400000,1536],[5120,2880,3,3400000,1536],[390,844,3,2200000,1024],[1440,900,2,3400000,1536],[844,390,3,3400000,1536]]){const q=quality(w,h,dpr);assert(Number.isFinite(q.pixelRatio)&&q.pixelRatio>0);assert(w*h*q.pixelRatio*q.pixelRatio<=maxPixels+1,'Drawing buffer exceeded its pixel budget');assert.equal(q.shadowSize,shadow);}
 const desktop=quality(1440,900,2),phone=quality(390,844,2);assert.notEqual(desktop.shadowSize,phone.shadowSize,'Resizing to mobile must refresh shadow quality');
});

await flush();process.removeListener('unhandledRejection',onUnhandled);
console.log(`${passed} runtime logic checks passed; ${failures.length} failed. These are Node state/scene checks, not browser rendering, device audio or touch tests.`);
if(failures.length)process.exitCode=1;
