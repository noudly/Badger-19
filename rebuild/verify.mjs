import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
// Geometry checks use the real Three.js scene graph. No renderer or browser is mocked as a visual test.
const ctx=new Proxy({}, {get:(o,k)=>k in o?o[k]:(...args)=>{},set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:128,height:128,getContext:()=>ctx})};
globalThis.matchMedia=()=>({matches:false});
const {createCast}=await import('./characters.js');const {createWorld}=await import('./world.js');
const scene=new THREE.Scene(),cast=createCast(THREE);scene.add(cast.group);const world=createWorld(THREE,scene);
const source=await fs.readFile(new URL('main.js',import.meta.url),'utf8');
const camera=new THREE.PerspectiveCamera(40,1,.1,90),camLook=new THREE.Vector3();
const interaction={x:0,y:0,badgerTap:-100,bearTap:-100,pulse:{kind:'',at:-100}};
const code=source.slice(source.indexOf('function stageCast('),source.indexOf('function createPhotograph('));
const api=new Function('cast','camera','reduce','interaction','camLook','ease','lerp','THREE','let cameraReady=false,frameDelta=100;'+code+';return {stageCast,shot}')(cast,camera,false,interaction,camLook,x=>x*x*(3-2*x),THREE.MathUtils.lerp,THREE);
const phases=[['intro',4,8],['street',12,18],['photo',6,16],['photo',11,16],['fracture',6,18],['fracture',15,18],['bloom',6,8],['snow',8,16],['final',4,Infinity]];
let count=0;
for(const aspect of[390/844,430/932,1440/900,844/390])for(const [phase,local,duration]of phases){camera.aspect=aspect;const story={phase,local,progress:local/duration};api.stageCast(story);cast.update(local+40,story,interaction);world.update(local+40,story,interaction);api.shot(story);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
 for(const character of[cast.badger,cast.bear]){if(!character.group.visible)continue;const box=new THREE.Box3().setFromObject(character.group);assert(box.min.y>-.05,`${phase}: feet beneath street`);let edge=0;character.group.traverse(o=>{if(!o.isMesh)return;let parent=o;while(parent&&parent!==character.group){if(!parent.visible)return;parent=parent.parent;}const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){const p=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(camera);assert(Number.isFinite(p.x)&&Number.isFinite(p.y),`${phase}: invalid projection`);edge=Math.max(edge,Math.abs(p.x));}});if(phase!=='intro')assert(edge<=1.07,`${aspect.toFixed(2)} ${phase}/${local} ${character.group.name}: character crops at ${edge.toFixed(2)}`);}

 assert(cast.bear.group.visible||phase==='intro','Bear unexpectedly disappears');count++;
}
for(const [phase,local]of[['fracture',16],['bloom',6],['snow',8],['final',4]]){
 const story={phase,local,progress:1};api.stageCast(story);cast.update(100,story,interaction);scene.updateMatrixWorld(true);
 const palmSurface=(paw,side)=>{const center=new THREE.Vector3();paw.getWorldPosition(center);const m=paw.matrixWorld.elements;center.x+=side*Math.sqrt(m[0]*m[0]+m[4]*m[4]+m[8]*m[8]);return center;};
 const a=palmSurface(cast.badger.rightArm.paw,1),b=palmSurface(cast.bear.leftArm.paw,-1);
 assert(a.distanceTo(b)<.025,`${phase}: paws do not meet`);
 assert(a.distanceTo(new THREE.Vector3(0,.96,.20))<.025,`${phase}: hand meeting drifts from saved light`);
}
assert(world.targets.some(t=>t.kind==='light'),'Saved light should remain explorable');
world.update(100,{phase:'final',local:10,progress:1},interaction);assert(world.group.getObjectByName('saved-light').visible,'Saved light should survive the ending');
world.update(0,{phase:'intro',local:0,progress:0},interaction);assert(!world.group.getObjectByName('saved-light').visible,'Replay should clear saved light');
assert(cast.bear.camera,'Photographer needs a camera');assert(world.targets.length>=3,'Street exploration targets missing');
console.log(`Passed ${count} real scene/camera state checks across phone, desktop and landscape. Browser rendering, audio and touch remain separate verification.`);
