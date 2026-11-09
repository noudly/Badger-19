import assert from 'node:assert/strict';
import { createStage, fitArtwork, pixelSize, visualState, actorPlacement } from './stage.js';

// Renderer contracts only. Browser QA checks the actual painted output/assets.
const dimensions = [[360,800],[390,844],[768,1024],[1440,900],[844,390],[3840,2160]];
for (const [width,height] of dimensions) {
  const size = pixelSize(width,height,3);
  assert(size.pixelWidth*size.pixelHeight<=2000000);
  assert(size.ratio>0 && Number.isFinite(size.ratio));
  const fit = fitArtwork(1536,1024,width,height);
  assert(fit.x<=0 && fit.y<=0);
  assert(fit.width>=width && fit.height>=height);
  const layout = actorPlacement(width,height,453/777,492/839);
  assert(layout.badgerX-layout.badgerWidth/2>=0);
  assert(layout.bearX+layout.bearWidth/2<=width);
  assert(layout.baseline-layout.height>height*.2);
  assert(layout.baseline<=height*.94);
}
const protectedFit = fitArtwork(1536,1024,390,844,{focus:{x:.5,y:.5},safe:{x:.3,y:.2,w:.4,h:.6}});
assert(protectedFit.scale*1536*.4<=390*.95+.001);
assert(protectedFit.scale*1024*.6<=844*.88+.001);
for(const time of [-1,0,14.82,64.69,101.84,126.10,159.25,176.25,194.78,227.43,234.14,345,360,368,380,420]) {
  const state=visualState(time);
  for(const key of ['time','local','progress','transition','zoom','drift','fracture','snow','bloom','warmSeed'])assert(Number.isFinite(state[key]),`${time}/${key}`);
  assert(state.progress>=0&&state.progress<=1);
  assert.deepEqual(visualState(time),state,'sampling must be independent of previous frames');
}
assert.equal(visualState(230).scene,'reunion','the world waits through the orchestral breath');
assert.equal(visualState(235).scene,'bloom');
assert.equal(visualState(345).chapter,'snow');
assert.equal(visualState(362).chapter,'portrait');
assert.equal(visualState(381).chapter,'quietExplore');

const draws=[];
const gradient={addColorStop(){}};
const context=new Proxy({drawImage(...args){draws.push(args);},createRadialGradient(){return gradient;},createLinearGradient(){return gradient;}},{get:(object,key)=>key in object?object[key]:()=>{},set:(object,key,value)=>(object[key]=value,true)});
const makeCanvas=()=>({width:0,height:0,style:{},getContext:()=>context,toDataURL:()=> 'data:image/png;base64,TEST',ownerDocument:{createElement:()=>makeCanvas()}});
const image={naturalWidth:1536,naturalHeight:1024};
const backgrounds=Object.fromEntries(['street','window','fracture','bloom','snow'].map(name=>[name,{src:image,actors:false}]));
const assets={...backgrounds,actors:{src:image,frames:[{x:140,y:168,w:453,h:777},{x:942,y:104,w:492,h:839}]},
  ...Object.fromEntries(['photoPose','reachPose','holdPose','snowPose','portraitPose'].map(name=>[name,{src:image,frames:[{x:266,y:27,w:1010,h:969}]}]))};
const canvas=makeCanvas(),stage=createStage(canvas,{images:assets});await stage.ready;
stage.resize(390,844,3);
let samples=0;
for(let time=0;time<=381;time+=.5){
  draws.length=0;stage.render(time,undefined,{pointer:{x:.5,y:.5}});samples++;
  assert(draws.length>0,'loaded illustration must actually draw');
  for(const call of draws){
    for(const value of call.slice(1))assert(Number.isFinite(value),'Canvas draw arguments must be finite');
    if(call.length===9){const[,sx,sy,sw,sh,, ,dw,dh]=call;assert(sx>=0&&sy>=0&&sw>0&&sh>0&&dw>0&&dh>0);assert(sx+sw<=1537&&sy+sh<=1025,'source frames must remain inside the supplied atlas');}
  }
}
stage.render(0);assert.equal(stage.hitTest(.4,.6),'break');
stage.render(80);assert.equal(stage.hitTest(.4,.70),'badger');
const before={...stage.snapshot};
for(const kind of ['window','together']){
  const record=stage.capture(kind,kind==='window'?123:362);
  assert.equal(record.kind,kind);assert.equal(record.width,1400);assert.equal(record.height,1600);assert(record.url.startsWith('data:image/png;'));assert(record.filename.endsWith('.png'));
}
assert.deepEqual(stage.snapshot,before,'capturing a keepsake must not mutate the live clock or chapter');
stage.dispose();const count=draws.length;stage.render(150);assert.equal(draws.length,count);assert.equal(stage.capture('together'),null);assert.equal(stage.hitTest(.4,.7),null);

const reduced=createStage(makeCanvas(),{images:assets,reduced:true});await reduced.ready;reduced.resize(390,844,1);draws.length=0;reduced.render(70);const first=draws.slice();draws.length=0;reduced.render(70);assert.deepEqual(draws,first,'reduced-motion sampling is stable');reduced.dispose();
class BrokenImage {set src(value){queueMicrotask(()=>this.onerror());}}
const broken=createStage(makeCanvas(),{images:{street:'missing.png'},Image:BrokenImage});await assert.rejects(broken.ready);assert.deepEqual(broken.snapshot.failures,['street']);
console.log(JSON.stringify({passed:true,samples,renderer:'Canvas 2D',pixelBudget:2000000,atlasSourceFramesVerified:true,captureDoesNotMutateStory:true,browserVisualReviewRequired:true}));
