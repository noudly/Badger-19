import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createCast } from './characters.js';
import { createWorld } from './world.js';
import { createPhotographs } from './photographs.js';
import { createArchive } from './archive.js';
import { cinematicState } from './lighting.js';
import { SongSoundtrack } from './song.js';
import { MusicClock } from './music-clock.js';
import { directorAt, DIRECTOR_CUES, RECORDING_DURATION } from './director.js';
import { chapterBlocking, chapterCamera, applyChapterPerformance } from './choreography.js';
import { createUnfolding } from './unfolding.js';
import pristineShell from './template.html';
const archive=createArchive(pristineShell,document.currentScript?.textContent);

const $ = s => document.querySelector(s);
const stage = $('#stage');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
function qualityForViewport(width,height,dpr){width=Math.max(1,width);height=Math.max(1,height);const mobile=width/height<.9||width<700;return{pixelRatio:Math.min(dpr||1,mobile?1.6:2,Math.sqrt((mobile?2200000:3400000)/(width*height))),shadowSize:mobile?1024:1536};}
const initialQuality=qualityForViewport(innerWidth,innerHeight,devicePixelRatio);
let renderer;
try { renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:false}); }
catch(e){ $('#unavailable').hidden=false; $('#loading').hidden=true; throw e; }
renderer.setPixelRatio(initialQuality.pixelRatio);
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.10;
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background=new THREE.Color('#121e29');
scene.fog=new THREE.FogExp2('#182634',.038);
const camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,.1,90);
const pmrem=new THREE.PMREMGenerator(renderer);
const env=pmrem.fromScene(new RoomEnvironment(),.04);scene.environment=env.texture;scene.environmentIntensity=.32;pmrem.dispose();
const ambient=new THREE.HemisphereLight('#c1dbec','#313039',1.35);scene.add(ambient);
const key=new THREE.DirectionalLight('#ffd6a3',3.2);key.position.set(2.5,7,5);key.castShadow=true;
key.shadow.mapSize.set(initialQuality.shadowSize,initialQuality.shadowSize);
key.shadow.camera.left=-8;key.shadow.camera.right=8;key.shadow.camera.top=9;key.shadow.camera.bottom=-5;
key.shadow.normalBias=.035;key.shadow.bias=-.00015;key.shadow.radius=4;scene.add(key);
const rim=new THREE.DirectionalLight('#80b7f1',1.7);rim.position.set(-4,5,-4);scene.add(rim);
const warmKey=new THREE.Color('#ffd6a3'),coolKey=new THREE.Color('#c1d8ed');const snowSpot=new THREE.Vector3();
const cast=createCast(THREE);scene.add(cast.group);
const world=createWorld(THREE,scene);if(!world.group.parent)scene.add(world.group);
const photographs=createPhotographs(THREE,renderer,scene,camera);
cast.badger.group.userData.kind='badger';cast.bear.group.userData.kind='bear';
const interaction={reduced:reduce,x:0,y:0,badgerTap:-100,bearTap:-100,pulse:{kind:'',at:-100}};
const musicClock=new MusicClock({duration:RECORDING_DURATION});
const unfolding=createUnfolding(THREE,scene);
let elapsed=0,last=0,previousPhase='',paused=document.hidden,pointerDown=null,photoURL='',capturePending=false,camLook=new THREE.Vector3(0,1.05,0);
const photoRecords=[];let photoIndex=0,memoryAttempted=false,memoryAttempts=0,memoryNext=10,memoryRevealedAt=-100,shutterUntil=-1;
let photoStart=0,hasLoaded=false,captionTimer=null,cameraReady=false,introExitAt=Infinity,captureAttempts=0,captureNext=0,contextLost=false;let frameDelta=.016;
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let nowStory={phase:'intro',local:0,progress:0};
const ease=x=>x*x*(3-2*x);const lerp=THREE.MathUtils.lerp;
function getStory(time){return directorAt(time);}
function layout(){const mobile=innerWidth/innerHeight<.9,q=qualityForViewport(innerWidth,innerHeight,devicePixelRatio);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(q.pixelRatio);renderer.setSize(innerWidth,innerHeight);if(key.shadow.mapSize.x!==q.shadowSize){key.shadow.mapSize.set(q.shadowSize,q.shadowSize);key.shadow.map?.dispose();key.shadow.map=null;key.shadow.needsUpdate=true;}return mobile;}
addEventListener('resize',layout);
function setCaption(text){clearTimeout(captionTimer);$('#caption').classList.remove('visible');captionTimer=setTimeout(()=>{$('#caption').textContent=text;$('#caption').classList.toggle('visible',!!text);},180);}
function enter(s){document.body.dataset.phase=s.phase;document.body.dataset.chapter=s.chapter||s.phase;$('#chapter').textContent=({intro:'A WORLD WAITING TO HAPPEN',street:'01 / THE LIGHT ON THE CORNER',photo:'02 / THE LITTLE THINGS',fracture:'03 / STAY CLOSE',bloom:'04 / ALL THAT WE KEEP',snow:'05 / AFTER THE STORM',final:'19 / JUST FOR YOU'})[s.phase];
 setCaption(''); score.setScene(s.phase);
 if(s.chapter==='encounter')setCaption('一盏灯，两个有点古怪的家伙。');

 if(s.phase==='final'&&(!s.chapter||s.chapter==='portrait')){if(photoRecords.length){$('#photo-thumb').src=photoRecords[0].url;$('#keepsake').hidden=false;}$('#save-world').hidden=!archive.available;photoStart=elapsed;capturePending=true;captureAttempts=0;captureNext=2;$('#ending').classList.remove('visible');$('#replay').hidden=false;}
}
function stageCast(s){let bx=-.66,rx=.66,bz=0,rz=-.06,by=0,ry=0,br=0,rr=0;
 switch(s.phase){
  case 'intro':bx=-.85;rx=camera.aspect<.9?1.10:1.8;bz=1.12;by=0;br=-.1;break;
  case 'street':{const p=ease(Math.min(1,s.local/6));bx=lerp(camera.aspect<.9?-1.10:-1.7,-.66,p);rx=lerp(camera.aspect<.9?1.10:1.8,.66,p);br=lerp(.55,.18,p);rr=lerp(-.7,-.22,p);bz=0;rz=0;break;}
  case 'photo':{const p=ease(Math.min(1,s.local/3));bx=lerp(-.66,.30,p);rx=lerp(.66,1.20,p);bz=lerp(0,-1.75,p);rz=lerp(0,-.35,p);br=s.local<3?lerp(.18,2.64,p):lerp(2.64,.45,ease(Math.min(1,(s.local-3)/2)));rr=lerp(-.22,2.40,p);if(s.local>6){const p2=ease(Math.min(1,(s.local-6)/2));bx=lerp(.30,3.10,p2);bz=lerp(-1.75,-1.60,p2);by=reduce?0:Math.sin(p2*Math.PI)*.08;br=lerp(.45,-1.1,p2);}if(s.local>12){br=lerp(-1.1,.45,ease(Math.min(1,(s.local-12)/3)));}if(s.local>12)rr=lerp(2.4,1.8,ease(Math.min(1,(s.local-12)/3)));break;}
  case 'fracture':{const spread=camera.aspect<.9?.93:1.34;const split=ease(Math.min(1,s.local/5)),reach=ease(Math.max(0,Math.min(1,(s.local-9)/7)));const a=1-split;
   bx=lerp(a*a*3.10+2*a*split*(-2)+split*split*(-spread),-.64,reach);rx=lerp(lerp(1.20,spread,split),.64,reach);
   bz=a*a*(-1.60)+2*a*split*(-2.4);rz=lerp(-.35,-.06,split);const settle=ease(Math.min(1,Math.max(0,(s.local-4))));const heading=Math.atan2(2*(a*(-5.10)+split*(2-spread)),2*(a*(-.8)+split*2.4));br=lerp(lerp(.45,heading,ease(Math.min(1,s.local/.9))),.25+reach*.2,settle);const bearHeading=Math.atan2(spread-1.20,.29);rr=lerp(lerp(1.8,bearHeading,ease(Math.min(1,s.local/.9))),-.25-reach*.2,settle);break;}
  case 'bloom':{const p=ease(Math.min(1,s.local/4));bx=lerp(-.64,-.62,p);rx=lerp(.64,.62,p);br=.18;rr=-.18;break;}
  case 'snow':case 'final':bx=-.62;rx=.62;br=.13;rr=-.13;break;
 }
 const blocking=s.chapter?chapterBlocking(s,camera.aspect):null;
 if(blocking){({bx,rx,bz,rz,by=0,ry=0,br,rr}=blocking);}
 const alpha=(!cast.group.userData.stagingReady||reduce)?1:1-Math.exp(-frameDelta*3.2);
 cast.badger.group.position.lerp(new THREE.Vector3(bx,by,bz),alpha);cast.bear.group.position.lerp(new THREE.Vector3(rx,ry,rz),alpha);
 for(const [c,yaw]of[[cast.badger,br],[cast.bear,rr]]){const diff=Math.atan2(Math.sin(yaw-c.group.rotation.y),Math.cos(yaw-c.group.rotation.y));c.group.rotation.y+=diff*alpha;}
 for(const c of[cast.badger,cast.bear]){const prev=c.group.userData.lastStepPosition||c.group.position.clone();const moved=Math.hypot(c.group.position.x-prev.x,c.group.position.z-prev.z);const walking=!reduce&&moved>.00015;const walk=c.group.userData.walk||{speed:0,phase:0};walk.speed=lerp(walk.speed,walking?Math.min(1.5,moved/Math.max(.001,frameDelta)):0,.25);walk.phase+=frameDelta*(4+walk.speed*4);c.group.userData.walk=walk;prev.copy(c.group.position);c.group.userData.lastStepPosition=prev;
 if(!reduce){c.group.position.y+=Math.abs(Math.sin(walk.phase))*Math.min(.045,walk.speed*.04);c.group.rotation.z=Math.sin(walk.phase)*Math.min(.025,walk.speed*.025);}else c.group.rotation.z=0;}
 cast.group.userData.stagingReady=true;
 cast.badger.group.visible=true;cast.bear.group.visible=s.phase!=='intro';
}
function shot(s){const mobile=camera.aspect<.9;let pos=[.2,2.1,mobile?9.2:7],look=[0,1.1,0],fov=40;
 switch(s.phase){
 case 'intro':{const manual=interaction.pulse.kind==='break'&&interaction.pulse.at>=0;const r=ease(Math.max(0,Math.min(1,Math.max((s.local-5.8)/2.2,manual?(s.local-interaction.pulse.at-.6)/1.1:-1))));pos=[lerp(.1,mobile?.3:1.6,r),lerp(1.7,2.4,r),lerp(mobile?8.9:6.2,mobile?10.4:6.8,r)];look=[lerp(mobile?-.6:-.3,0,r),lerp(.95,1.05,r),lerp(-.2,0,r)];break;}
 case 'street':{const p=ease(s.progress);pos=[lerp(mobile?.3:1.6,.3,p),lerp(2.4,1.85,p),mobile?lerp(10.4,9.2,p):6.8];look=[0,1.05,0];break;}
 case 'photo':{const p=ease(Math.min(1,s.local/4));pos=[lerp(.3,mobile?9.8:5.6,p),lerp(1.85,mobile?3.0:2.65,p),lerp(mobile?9.2:6.8,mobile?7.2:3.0,p)];look=[lerp(0,2.20,p),lerp(1.05,1.20,p),lerp(0,-1.35,p)];fov=mobile?44:40;break;}
 case 'fracture':{const p=ease(Math.min(1,s.local/4));pos=[lerp(mobile?9.8:5.6,.1,p),lerp(mobile?3.0:2.65,1.7,p),lerp(mobile?7.2:3.0,mobile?11.0:7.5,p)];look=[lerp(2.20,0,p),lerp(1.20,1.05,p),lerp(-1.35,0,p)];fov=mobile?lerp(44,40,p):40;if(!reduce){const tremor=1-ease(Math.max(0,Math.min(1,(s.local-13)/3)));pos[0]+=Math.sin(s.local*19)*.018*tremor;pos[1]+=Math.cos(s.local*16)*.01*tremor;}break;}
 case 'bloom':{const p=ease(s.progress);pos=[lerp(.1,-.4,p),lerp(1.7,2.0,p),lerp(mobile?11.0:7.5,mobile?8.9:6.2,p)];look=[0,1.0,0];fov=41;break;}
 case 'snow':{const p=ease(s.progress);pos=[lerp(-.4,0,p),2,mobile?8.9:6.2];look=[0,1.2,0];break;}
 case 'final':pos=[0,2.05,mobile?8.8:6.1];look=[0,1.35,0];fov=39;break;
 }
 const directed=s.chapter?chapterCamera(s,camera.aspect):null;if(directed){pos=directed.pos;look=directed.look;fov=directed.fov;}
 const heldShot=(s.phase==='fracture'&&s.local>=16)||(s.phase==='snow'&&s.local>=13)||s.phase==='final';
 if(!reduce&&!heldShot){pos[0]+=interaction.x*.08;pos[1]-=interaction.y*.04;}
 const smoothing=(!cameraReady||reduce)?1:1-Math.exp(-frameDelta*3.0);camera.position.lerp(new THREE.Vector3(...pos),smoothing);camera.fov=lerp(camera.fov,fov,smoothing);camera.updateProjectionMatrix();camLook.lerp(new THREE.Vector3(...look),smoothing);camera.lookAt(camLook);cameraReady=true;
}
function showPhoto(index){if(!photoRecords.length)return;photoIndex=(index+photoRecords.length)%photoRecords.length;const record=photoRecords[photoIndex];$('#photo-image').src=record.url;$('#photo-image').alt=record.label;$('#download').href=record.url;$('#download').download=record.kind==='window'?'BADGER-the-little-light-19.png':'BADGER-and-BEAR-19.png';$('#photo-count').textContent=String(photoIndex+1).padStart(2,'0')+' / '+String(photoRecords.length).padStart(2,'0');$('#photo-nav').hidden=photoRecords.length<2;}
function rememberPhoto(record){const old=photoRecords.findIndex(p=>p.kind===record.kind);if(old>=0)photoRecords[old]=record;else if(record.kind==='together')photoRecords.unshift(record);else photoRecords.push(record);showPhoto(0);if(record.kind==='together'){$('#photo-thumb').src=record.url;$('#keepsake').hidden=false;}if(record.kind==='window'){$('#memory-image').src=record.url;$('#keepsake').classList.add('has-memory');$('#keepsake').style.setProperty('--memory-image',`url("${record.url}")`);}}
function triggerShutter(){shutterUntil=elapsed+.22;score.shutter();}
function createPhotograph(){const first=!photoURL;const record=photographs.capture('together',cast);if(!record)return false;rememberPhoto(record);photoURL=record.url;$('#photo-status').hidden=true;if(first)triggerShutter();return true;}
function updatePhotoMoment(s){
 if(s.phase==='photo'&&!memoryAttempted&&(s.chapter?elapsed>=DIRECTOR_CUES.photoShutter:s.local>=memoryNext)){
  if(s.local>11.5)memoryAttempted=true;
  else{memoryAttempts++;const record=photographs.capture('window',cast);if(memoryAttempts===1)triggerShutter();if(record){memoryAttempted=true;rememberPhoto(record);memoryRevealedAt=elapsed;}else if(memoryAttempts>=2)memoryAttempted=true;else memoryNext=Math.min(s.local+.35,11.2);}
 }
 const showing=s.phase==='photo'&&memoryRevealedAt>=0&&elapsed-memoryRevealedAt>.65;$('#memory').classList.toggle('visible',showing);document.body.classList.toggle('portrait-ready',s.phase==='final'&&s.local<2.2);const birthday=s.chapter?s.birthdayVisible:s.phase==='final'&&s.local>4.2;$('#ending').classList.toggle('visible',birthday);$('#ending').classList.toggle('show-wish',birthday&&elapsed>=370);$('#ending').classList.toggle('show-birthday',birthday&&elapsed>=376);
}
function select(e){if(pointerDown&&Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)>20)return;score.unlock(elapsed);if(nowStory.phase==='intro'){strikeCode();return;}
 pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);
 const targets=[cast.badger.group,cast.bear.group,...world.targets.map(t=>t.object)];
 const hits=raycaster.intersectObjects(targets,true);if(!hits.length)return;let obj=hits[0].object,kind='';while(obj){if(obj.userData.kind){kind=obj.userData.kind;break;}const entry=world.targets.find(t=>t.object===obj);if(entry){kind=entry.kind;break;}obj=obj.parent;}
 if(kind==='badger')interaction.badgerTap=elapsed;if(kind==='bear')interaction.bearTap=elapsed;interaction.pulse={kind,at:elapsed};score.chime(kind);
}
function strikeCode(){if(Number.isFinite(introExitAt)||elapsed>=5.075)return;interaction.badgerTap=elapsed;interaction.pulse={kind:'break',at:elapsed};introExitAt=Math.min(introExitAt,elapsed+2.2);}
stage.addEventListener('pointerdown',e=>{pointerDown={x:e.clientX,y:e.clientY};score.unlock(elapsed);});stage.addEventListener('pointerup',select);
stage.addEventListener('pointermove',e=>{interaction.x=e.clientX/innerWidth*2-1;interaction.y=e.clientY/innerHeight*2-1;});
stage.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();score.unlock(elapsed);if(nowStory.phase==='intro')strikeCode();else interaction.badgerTap=elapsed;}});
const audioButton=$('#sound');audioButton.addEventListener('click',()=>{if(score.playback.ended)$('#replay').click();else score.toggle(elapsed);});
$('#replay').addEventListener('click',()=>{elapsed=0;musicClock.reset();last=0;introExitAt=Infinity;captureAttempts=0;captureNext=0;capturePending=false;previousPhase='';cameraReady=false;cast.group.userData.stagingReady=false;for(const c of[cast.badger,cast.bear]){delete c.group.userData.walk;delete c.group.userData.lastStepPosition;}memoryAttempted=false;memoryAttempts=0;memoryNext=10;memoryRevealedAt=-100;shutterUntil=-1;photoRecords.length=0;photoIndex=0;$('#memory').classList.remove('visible');$('#keepsake').classList.remove('has-memory');$('#keepsake').style.removeProperty('--memory-image');interaction.badgerTap=interaction.bearTap=-100;interaction.pulse={kind:'',at:-100};$('#ending').classList.remove('visible');$('#keepsake').hidden=true;$('#replay').hidden=true;$('#photo-status').hidden=true;$('#save-world').hidden=true;setCaption('');photoURL='';score.restart();});
const modal=$('#photo-modal');$('#photo-prev').addEventListener('click',()=>showPhoto(photoIndex-1));$('#photo-next').addEventListener('click',()=>showPhoto(photoIndex+1));$('#keepsake').addEventListener('click',()=>{if(photoRecords.length)modal.showModal();});$('#close-photo').addEventListener('click',()=>modal.close());modal.addEventListener('click',e=>{if(e.target===modal)modal.close();});modal.addEventListener('keydown',e=>{if(photoRecords.length>1&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();showPhoto(photoIndex+(e.key==='ArrowRight'?1:-1));}});
let wasPlaying=false;document.addEventListener('visibilitychange',()=>{last=0;paused=document.hidden||contextLost;if(paused){wasPlaying=score.playback.unlocked&&!score.muted&&!score.playback.ended;score.suspend();}else score.resume();});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;paused=true;$('#unavailable').hidden=false;score.suspend();});
$('#try-again').addEventListener('click',()=>location.reload());
$('#save-world').addEventListener('click',e=>{if(!archive.save(e.currentTarget))e.preventDefault();});
$('#retry-photo').addEventListener('click',()=>{capturePending=true;captureAttempts=0;captureNext=nowStory.local+.1;$('#photo-status').hidden=true;});
const score=new SongSoundtrack({button:audioButton,statusElement:$('#music-status'),source:__BADGER_SONG_SOURCE__});
function applyLighting(s){if(s.phase==='intro'&&interaction.pulse.kind==='break')s.reveal=Math.max((s.local-5.6)/2.4,(s.local-interaction.pulse.at-.6)/1.1);const light=s.phase==='intro'?cinematicState(s):(s.light||cinematicState(s));ambient.intensity=light.ambient;key.intensity=light.key;rim.intensity=light.rim;scene.environmentIntensity=light.environment;renderer.toneMappingExposure=light.exposure;key.color.copy(coolKey).lerp(warmKey,light.warmth);interaction.lightLevel=light.lamps;}
function updateSnowSpot(s){if(s.phase!=='snow'){interaction.snowSpot=null;return;}const paw=cast.bear.snowPalm||cast.bear.rightArm.paw;paw.updateWorldMatrix(true,false);paw.getWorldPosition(snowSpot);const m=paw.matrixWorld.elements;snowSpot.y+=Math.sqrt(m[1]*m[1]+m[5]*m[5]+m[9]*m[9]);snowSpot.z+=.025;interaction.snowSpot=snowSpot;}

document.addEventListener('pointerdown',e=>{if(!e.target.closest('#sound'))score.unlock(elapsed);},{passive:true});
function frame(now){if(contextLost){last=0;requestAnimationFrame(frame);return;}const dt=last?Math.min((now-last)/1000,.25):0;frameDelta=Math.min(dt||.016,.05);last=now;elapsed=musicClock.update(dt,score.playback,{paused:paused||!hasLoaded});const s=getStory(elapsed);nowStory=s;if((s.chapter||s.phase)!==previousPhase){previousPhase=s.chapter||s.phase;enter(s);}score.updateStory(s);applyLighting(s);stageCast(s);cast.update(elapsed,s,interaction);if(s.chapter)applyChapterPerformance(cast,s,interaction);updateSnowSpot(s);interaction.codeInvasion=s.chapter==='keepworld'?Math.max(0,(s.chapterLocal-22)/11.15)*.24:0;world.update(elapsed,s.worldStory||s,interaction);unfolding.update(elapsed,{reduced:reduce});shot(s);renderer.render(scene,camera);
 updatePhotoMoment(s);document.body.classList.toggle('shutter',elapsed<shutterUntil&&!reduce);
 if(s.chapter==='encounter'&&s.chapterLocal>8)setCaptionOnce('street-clear','');if(s.chapter==='reunion'&&s.chapterLocal>3)setCaptionOnce('bloom-line','还好，你在。');if(s.chapter==='orchestralWorld')setCaptionOnce('orchestra-clear','');if(s.phase==='snow'&&s.local>7)setCaptionOnce('snow-clear','');
 if(capturePending&&s.phase==='final'&&s.local>=captureNext){captureAttempts++;const captured=createPhotograph();if(captured)capturePending=false;else if(captureAttempts<2)captureNext=s.local+1;else{capturePending=false;$('#photo-status').hidden=false;}}
 requestAnimationFrame(frame);
}
const captionCues=new Set();function setCaptionOnce(key,text){if(captionCues.has(key))return;captionCues.add(key);setCaption(text);}
$('#replay').addEventListener('click',()=>captionCues.clear());
layout();stageCast(nowStory);shot(nowStory);renderer.render(scene,camera);
requestAnimationFrame(()=>{hasLoaded=true;$('#loading').classList.add('done');setTimeout(()=>$('#loading').hidden=true,900);requestAnimationFrame(frame);});
// A read-only snapshot supports build-time and future browser checks without changing the story.
window.__badger={get phase(){return nowStory.phase;},get elapsed(){return elapsed;},get sound(){return score.active&&!score.muted;},get chapter(){return nowStory.chapter;},get music(){return score.playback;},get shot(){return nowStory.shot;}};
