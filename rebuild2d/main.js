import {createStage} from './stage.js';
import {SongSoundtrack} from '../rebuild/song.js';
import {MusicClock} from '../rebuild/music-clock.js';
import {directorAt, DIRECTOR_CUES, RECORDING_DURATION} from '../rebuild/director.js';
import {createArchive} from '../rebuild/archive.js';
import shell from './template.html';

const $=selector=>document.querySelector(selector);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas=$('#scene');
const stage=createStage(canvas,{images:__BADGER_IMAGES__,reduced});
const archive=createArchive(shell,document.currentScript?.textContent);
const music=new SongSoundtrack({button:$('#sound'),statusElement:$('#music-status'),source:__BADGER_SONG_SOURCE__});
const clock=new MusicClock({duration:RECORDING_DURATION});
const pointer={x:.5,y:.5};
let pulse={kind:'',at:-100},time=0,last=0,ready=false,down=null,story=directorAt(0);
let shutterUntil=-1,selected=0,portraitAttempts=0,portraitNext=DIRECTOR_CUES.portraitShutter;
let windowAttempts=0,windowNext=DIRECTOR_CUES.photoShutter,captionUntil=-1,captionKey='';
const photos=[];
const cues=new Set();
function resize(){stage.resize(innerWidth,innerHeight,devicePixelRatio||1);}
addEventListener('resize',resize);
function caption(text,duration=5,key=''){
  if(key&&cues.has(key))return;
  if(key)cues.add(key);
  captionKey=key;captionUntil=time+duration;
  $('#caption').textContent=text;
  $('#caption').classList.toggle('visible',!!text);
}
function showPhoto(index){
  if(!photos.length)return;
  selected=(index+photos.length)%photos.length;
  const photo=photos[selected];
  $('#photo-image').src=photo.url;$('#photo-image').alt=photo.label;
  $('#download').href=photo.url;$('#download').download=photo.filename;
  $('#photo-count').textContent=`${selected+1} / ${photos.length}`;
  $('#photo-nav').hidden=photos.length<2;
}
function remember(photo){
  const existing=photos.findIndex(item=>item.kind===photo.kind);
  if(existing>=0)photos[existing]=photo;
  else if(photo.kind==='together')photos.unshift(photo);
  else photos.push(photo);
  if(photo.kind==='window')$('#memory-image').src=photo.url;
  if(photo.kind==='together')$('#photo-thumb').src=photo.url;
  showPhoto(0);
}
function capture(kind,at){
  try{
    const photo=stage.capture(kind,at);
    if(!photo?.url)return false;
    remember(photo);shutterUntil=time+.2;
    music.shutter();return true;
  }catch{return false;}
}
function updateMoments(){
  if(time>=windowNext&&!photos.some(p=>p.kind==='window')&&windowAttempts<2){
    windowAttempts++;if(!capture('window',DIRECTOR_CUES.photoShutter))windowNext=time+.4;
  }
  if(time>=portraitNext&&!photos.some(p=>p.kind==='together')&&portraitAttempts<2){
    portraitAttempts++;if(!capture('together',DIRECTOR_CUES.portraitShutter))portraitNext=time+1;
    $('#photo-status').hidden=portraitAttempts<2||photos.some(p=>p.kind==='together');
  }
  const memory=photos.some(p=>p.kind==='window');
  $('#memory').classList.toggle('visible',memory&&time>123.6&&time<126.1);
  const final=time>=368;
  $('#ending').classList.toggle('visible',final);
  $('#ending').classList.toggle('show-wish',final&&time>=370);
  $('#ending').classList.toggle('show-birthday',final&&time>=376);
  const portrait=photos.find(p=>p.kind==='together');
  $('#keepsake').hidden=time<364.5||!photos.length;
  if(!portrait&&photos.length&&time>=364.5)$('#photo-thumb').src=photos[0].url;
  $('#save-world').hidden=time<376||!archive.available;
  $('#replay').hidden=time<376;
  document.body.classList.toggle('shutter',!reduced&&time<shutterUntil);
}
function reset(){
  clock.reset();time=0;last=0;story=directorAt(0);pulse={kind:'',at:-100};
  pointer.x=pointer.y=.5;photos.length=0;selected=0;cues.clear();
  windowAttempts=portraitAttempts=0;windowNext=DIRECTOR_CUES.photoShutter;portraitNext=DIRECTOR_CUES.portraitShutter;
  shutterUntil=-1;captionUntil=-1;captionKey='';
  $('#caption').classList.remove('visible');$('#caption').textContent='';
  $('#memory').classList.remove('visible');$('#ending').classList.remove('visible','show-wish','show-birthday');
  $('#keepsake').hidden=$('#save-world').hidden=$('#photo-status').hidden=$('#replay').hidden=true;
  if($('#photo-modal').open)$('#photo-modal').close();
  music.restart();stage.render(0,'code',{pointer,pulse});
}
$('#replay').addEventListener('click',reset);
$('#sound').addEventListener('click',()=>music.playback.ended?reset():music.toggle(time));
document.addEventListener('pointerdown',event=>{
  if(!event.target.closest('#sound,#replay'))music.unlock(time);
},{passive:true});
$('#stage').addEventListener('pointerdown',event=>{down={x:event.clientX,y:event.clientY};});
$('#stage').addEventListener('pointermove',event=>{pointer.x=event.clientX/innerWidth;pointer.y=event.clientY/innerHeight;});
function explore(x,y){
  const kind=stage.hitTest(x,y);
  if(!kind)return;
  if(kind==='break'&&pulse.kind==='break')return;
  pulse={kind,at:time};
  if(time<185||time>345)music.chime(kind);
  if(kind==='badger'&&time>15&&time<130)caption('……被发现了。',2.3);
  if(kind==='bear'&&time>15&&time<130)caption('慢半拍，也没关系。',2.8);
}
$('#stage').addEventListener('pointerup',event=>{
  if(down&&Math.hypot(event.clientX-down.x,event.clientY-down.y)>20)return;
  explore(event.clientX/innerWidth,event.clientY/innerHeight);
});
$('#stage').addEventListener('keydown',event=>{
  if(event.key==='Enter'||event.key===' '){event.preventDefault();music.unlock(time);explore(.45,.65);}
});
const modal=$('#photo-modal');
$('#keepsake').addEventListener('click',()=>{if(photos.length){showPhoto(selected);modal.showModal();}});
$('#close-photo').addEventListener('click',()=>modal.close());
$('#photo-prev').addEventListener('click',()=>showPhoto(selected-1));
$('#photo-next').addEventListener('click',()=>showPhoto(selected+1));
modal.addEventListener('click',event=>{if(event.target===modal)modal.close();});
modal.addEventListener('keydown',event=>{
  if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();showPhoto(selected+(event.key==='ArrowLeft'?-1:1));}
});
$('#save-world').addEventListener('click',event=>{if(!archive.save(event.currentTarget))event.preventDefault();});
$('#retry-photo').addEventListener('click',()=>{portraitAttempts=0;portraitNext=time;$('#photo-status').hidden=true;});
$('#try-again').addEventListener('click',()=>location.reload());
document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden)music.suspend();else music.resume();});
function frame(now){
  const dt=last?Math.min((now-last)/1000,.25):0;last=now;
  time=clock.update(dt,music.playback,{paused:document.hidden||!ready});
  story=directorAt(time);document.body.dataset.chapter=story.chapter;
  document.body.dataset.tone=story.chapter==='photography'||story.chapter==='orchestralWorld'&&time>=234.14||['snow','portrait','birthday','quietExplore'].includes(story.chapter)?'light':'night';
  $('#intro').classList.toggle('visible',story.chapter==='code');
  music.updateStory(story);stage.render(time,story.chapter,{pointer,pulse});
  if(ready)updateMoments();
  if(time>=65&&time<74)caption('慢半拍的家伙，也在认真听。',6,'listening');
  if(time>=198&&time<210)caption('还好，你在。',6,'together');
  if(time>=captionUntil)$('#caption').classList.remove('visible');
  requestAnimationFrame(frame);
}
resize();
stage.ready.then(()=>{
  ready=true;$('#loading').classList.add('done');
  setTimeout(()=>{$('#loading').hidden=true;},700);
}).catch(()=>{$('#loading').hidden=true;$('#unavailable').hidden=false;});
requestAnimationFrame(frame);
window.__badger={
  get phase(){return story.phase;},get chapter(){return story.chapter;},get elapsed(){return time;},
  get music(){return music.playback;},get sound(){return music.active&&!music.muted;},
  get renderer(){return 'canvas2d';},get photographs(){return photos.map(p=>({kind:p.kind,width:p.width,height:p.height}));},
  get ready(){return ready;},get reducedMotion(){return reduced;}
};
