import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import { cinematicState } from './lighting.js';

// These checks exercise the lighting arc and the real scene's light uniforms.
// They do not substitute for checking rendered exposure on a phone.
const channels=['ambient','key','rim','environment','exposure','lamps','warmth'];
let passed=0;
const test=(name,fn)=>{fn();passed++;console.log('PASS',name);};
const state=(phase,local,extra={})=>cinematicState({phase,local,...extra});
const close=(a,b,message,tolerance=1e-7)=>assert(Math.abs(a-b)<=tolerance,`${message}: ${a} vs ${b}`);
const same=(a,b,message)=>{for(const channel of channels)close(a[channel],b[channel],`${message}/${channel}`);};

test('lighting is finite, bounded and continuous throughout the automatic story',()=>{
 const phases=[['intro',8],['street',18],['photo',16],['fracture',18],['bloom',8],['snow',16],['final',16]];
 for(let i=0;i<phases.length;i++){
  const [phase,duration]=phases[i];let previous;
  for(let frame=0;frame<=duration*60;frame++){
   const current=state(phase,frame/60);
   for(const channel of channels){
    assert(Number.isFinite(current[channel]),`${phase}/${channel} is not finite`);
    assert(current[channel]>0&&current[channel]<4,`${phase}/${channel} leaves the intended exposure range`);
    if(previous)assert(Math.abs(current[channel]-previous[channel])<.07,`${phase}/${channel} changes as a flash`);
   }
   assert(current.exposure>=1&&current.exposure<=1.16,'Exposure should preserve face detail through the arc');
   assert(current.key>=1.3,'The warm face key should remain readable in the dark');
   previous=current;
  }
  if(i+1<phases.length)same(state(phase,duration),state(phases[i+1][0],0),`${phase} boundary`);
 }
});

test('fracture dims the environment, preserves faces, and settles before the bloom',()=>{
 const initial=state('fracture',0),dark=state('fracture',8),contact=state('fracture',16);
 for(const channel of['ambient','key','rim','environment','lamps'])assert(dark[channel]<initial[channel]*.65,`${channel} never forms a dark interval`);
 assert(dark.exposure>initial.exposure*.9,'Darkness should come from light placement, without crushing exposure');
 assert(contact.key>dark.key&&contact.lamps>dark.lamps,'Contact should receive a modest warm recovery');
 for(let local=16;local<=18;local+=.125)same(state('fracture',local),contact,'The final two seconds must hold');
});

test('bloom rises from contact, then hands a stable blue hour to the ending',()=>{
 const contact=state('fracture',18),start=state('bloom',0),peak=state('bloom',2),quiet=state('snow',0);
 same(contact,start,'Bloom must start at contact');
 assert(peak.key>contact.key*2&&peak.ambient>contact.ambient*1.8,'The bloom should have a visible rise');
 assert(quiet.key<peak.key&&quiet.warmth<peak.warmth,'Snow should soften and cool after the release');
 for(const local of[0,3,8,13,16,100,1e6])same(state('final',local),quiet,'The photograph lighting must remain locked');
});

test('early manual reveal reaches the street light without waiting for automatic intro time',()=>{
 same(state('intro',2,{reveal:1}),state('street',0),'Completed manual reveal');
 same(state('intro',0,{reveal:0}),state('intro',0),'Unstarted manual reveal');
 const partial=state('intro',2,{reveal:.5}),dark=state('intro',2),street=state('street',0);
 assert(partial.key>dark.key&&partial.key<street.key,'Manual reveal should lift the key progressively');
});

test('lighting state is independent, replayable and safe for malformed local time',()=>{
 const original=state('snow',3),saved={...original};original.key=999;
 same(state('snow',3),saved,'Returned profiles must not share mutable storage');
 state('fracture',10);state('bloom',3);same(state('intro',0),state('intro',-1),'Replay start');
 for(const local of[NaN,Infinity,-Infinity,undefined])for(const channel of channels)assert(Number.isFinite(state('fracture',local)[channel]),'Malformed time poisoned lighting');
 same(state('snow',6,{reduced:true}),state('snow',6),'Reduced motion preserves illumination');
});

const source=await fs.readFile(new URL('main.js',import.meta.url),'utf8');
test('the production lighting function applies profiles to render and world uniforms',()=>{
 const start=source.indexOf('function applyLighting('),end=source.indexOf('function updateSnowSpot(',start);
 assert(start>=0&&end>start,'Production lighting function not found');
 const ambient={},key={color:new THREE.Color()},rim={},scene={},renderer={},interaction={pulse:{kind:'',at:-100}};
 const params={cinematicState,ambient,key,rim,scene,renderer,interaction,coolKey:new THREE.Color('#c1d8ed'),warmKey:new THREE.Color('#ffd6a3')};
 const apply=new Function(...Object.keys(params),source.slice(start,end)+';return applyLighting;')(...Object.values(params));
 for(const [phase,local]of[['intro',0],['photo',10],['fracture',7],['bloom',2],['snow',7],['final',100]]){
  apply({phase,local});const expected=state(phase,local);
  for(const [actual,wanted,label]of[[ambient.intensity,expected.ambient,'hemisphere'],[key.intensity,expected.key,'face key'],[rim.intensity,expected.rim,'rim'],[scene.environmentIntensity,expected.environment,'environment'],[renderer.toneMappingExposure,expected.exposure,'exposure'],[interaction.lightLevel,expected.lamps,'practical multiplier']])close(actual,wanted,`${phase} applies ${label}`);
  assert(Number.isFinite(key.color.r+key.color.g+key.color.b),'Color interpolation must stay finite');
 }
 interaction.pulse={kind:'break',at:0};apply({phase:'intro',local:2});close(key.intensity,state('street',0).key,'A manual reveal reaches the street key');
});

const ctx=new Proxy({}, {get:(o,k)=>k in o?o[k]:(...args)=>{},set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:128,height:128,getContext:()=>ctx})};
globalThis.matchMedia=()=>({matches:false});
const {createWorld}=await import('./world.js');
const scene=new THREE.Scene(),world=createWorld(THREE,scene);
scene.updateMatrixWorld(true);
const lights=[];world.group.traverse(object=>{if(object.isLight)lights.push(object);});
const at=(x,y,z,type)=>lights.find(light=>light.type===type&&light.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(x,y,z))<.001);
const lamp=at(-1.89,3.05,-.82,'PointLight'),pool=at(-1.89,3.05,-.9,'SpotLight');
const window=at(3.05,1.8,-2.05,'PointLight'),shop=at(-4.1,1.65,-3.1,'PointLight');
const reunion=at(0,.32,.2,'PointLight');
assert(lamp&&pool&&window&&shop&&reunion,'Expected practical lights not found in the real scene');
const update=(phase,local,lightLevel=1)=>world.update(100+local,{phase,local,progress:1},{lightLevel,pulse:{kind:'',at:-100}});

test('all practical lights follow the same clamped envelope without adding lights',()=>{
 const practical=[lamp,pool,window,shop];update('street',10);const baseline=practical.map(light=>light.intensity);
 for(const level of[.35,.58,1,1.25,-1,9,NaN]){
  update('fracture',10,level);const expected=Number.isFinite(level)?Math.max(.35,Math.min(1.25,level)):1;
  practical.forEach((light,i)=>close(light.intensity,baseline[i]*expected,`Practical light ${i}`));
 }
 let after=0;world.group.traverse(object=>{if(object.isLight)after++;});assert.equal(after,lights.length,'A lighting phase must not create shader variants by adding/removing lights');
});

test('the light between the paws rises continuously after the held contact',()=>{
 update('fracture',18);const contact=reunion.intensity;update('bloom',0);close(reunion.intensity,contact,'Reunion light at the bloom boundary');
 let last=reunion.intensity;
 for(let frame=1;frame<=72;frame++){update('bloom',frame/60);assert(reunion.intensity>=last-1e-7,'Reunion warmth should rise first');assert(reunion.intensity-last<.6,'Reunion warmth must not flash');last=reunion.intensity;}
 assert(last>contact*5,'Contact should release into a clear warm bloom');update('bloom',8);assert(reunion.intensity<last*.1,'Warm burst should resolve before snow');
});

test('snow lamps ease down and replay restores their baseline',()=>{
 update('bloom',8);const before=[lamp.intensity,pool.intensity];update('snow',0);
 close(lamp.intensity,before[0],'Snow lamp boundary');close(pool.intensity,before[1],'Snow pool boundary');
 update('snow',5);assert(lamp.intensity<before[0]&&pool.intensity<before[1],'Snow should settle the practical pool');
 update('final',100);assert(lamp.intensity>0&&shop.intensity>0,'The ending keeps a warm home');
 update('intro',0);close(lamp.intensity,32,'Replay lamp');close(pool.intensity,16,'Replay pool');
});

console.log(`Passed ${passed} lighting arc and real-scene uniform checks. Rendered color, shadows and phone exposure require browser verification.`);
