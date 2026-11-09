// State, scheduling, sample and resource checks. This does not replace device listening.
import assert from 'node:assert/strict';
import { Soundtrack } from './score.js';

const contexts = [];
class FakeContext {
  constructor() { this.currentTime = 0; this.sampleRate = 24000; this.state = 'suspended'; this.destination = {}; this.sources = []; this.params = []; this.buffers = []; this.rejectNext = false; contexts.push(this); }
  param(value = 0) {
    const context = this;
    const p = { value, events: [],
      setValueAtTime(v,t) { this.write('set',v,t); },
      exponentialRampToValueAtTime(v,t) { assert(v > 0); this.write('ramp',v,t); },
      setTargetAtTime(v,t,c) { assert(Number.isFinite(c) && c > 0); this.write('target',v,t); },
      cancelScheduledValues(t) { assert(Number.isFinite(t)); this.events = this.events.filter(e => e[2] < t); },
      cancelAndHoldAtTime(t) { assert(Number.isFinite(t)); this.events = this.events.filter(e => e[2] <= t); },
      write(method,v,t) { assert(Number.isFinite(v), `nonfinite ${method} value`); assert(Number.isFinite(t) && t >= 0, `invalid automation time ${t}`); this.value = v; this.events.push([method,v,t]); },
    };
    context.params.push(p); return p;
  }
  node() { return { connections:[], connect(target) { this.connections.push(target); }, disconnect() { this.disconnected = true; } }; }
  createGain() { return Object.assign(this.node(), { gain: this.param(1) }); }
  createBiquadFilter() { return Object.assign(this.node(), { frequency: this.param(350), Q: this.param(1) }); }
  createConvolver() { return this.node(); }
  createWaveShaper() { return this.node(); }
  createDynamicsCompressor() { return Object.assign(this.node(), ...['threshold','knee','ratio','attack','release'].map(k=>({[k]:this.param()}))); }
  createPeriodicWave(real,imag) { assert([...real,...imag].every(Number.isFinite)); return {}; }
  createBuffer(channels,length,sampleRate) {
    assert(Number.isInteger(length) && length > 0 && sampleRate > 0);
    const data = Array.from({length:channels},()=>new Float32Array(length));
    const b = { duration:length/sampleRate, getChannelData: i=>data[i], data }; this.buffers.push(b); return b;
  }
  source() {
    const s = Object.assign(this.node(), { start(t) { assert(Number.isFinite(t) && t >= 0); this.started=t; }, stop(t=0) { assert(Number.isFinite(t) && t >= 0); this.stopped=t; } });
    this.sources.push(s); return s;
  }
  createBufferSource() { return Object.assign(this.source(), { playbackRate: this.param(1) }); }
  createOscillator() { return Object.assign(this.source(), { frequency:this.param(440), setPeriodicWave() {} }); }
  resume() { if(this.rejectNext){this.rejectNext=false;return Promise.reject(Error('no gesture'));} this.state='running'; this.onstatechange?.(); return Promise.resolve(); }
  suspend() { this.state='suspended'; this.onstatechange?.(); return Promise.resolve(); }
  close() { this.state='closed'; this.onstatechange?.(); return Promise.resolve(); }
  tick(t) { this.currentTime=t; for(const s of this.sources) if(!s.ended && s.stopped <= t){s.ended=true;s.onended?.();} }
}
let liveTimers=0, timerStarts=0;
const attrs={};
const score=new Soundtrack({AudioContext:FakeContext,button:{classList:{toggle(){}},setAttribute(k,v){attrs[k]=v;}},setInterval(){liveTimers++;timerStarts++;return timerStarts;},clearInterval(){liveTimers--;}});
assert.equal(contexts.length,0,'AudioContext was constructed before a gesture');
assert.equal(await score.unlock(),true);
assert.equal(liveTimers,0,'intro must not run an empty scheduler');
const next=score.next; await score.unlock(); assert.equal(score.next,next);
const phases=[['intro',8],['street',18],['photo',16],['fracture',18],['bloom',8],['snow',16],['final',90]];
let elapsed=0,maxVoices=0,maxPeakBound=0,heldSources=0,phaseCounts={};
for(const [phase,duration] of phases){
  score.setScene(phase); const before=score.ac.sources.length;
  for(let local=0;local<duration;local+=.05){
    score.ac.tick(elapsed+local);
    score.updateStory({phase,local}); score.schedule();
    maxVoices=Math.max(maxVoices,score._voices.size);
    const peak=[...score._voices].reduce((sum,v)=>sum+Math.max(0,...v.gain.gain.events.map(e=>e[1])),0)*score.master.gain.value*.86;
    if(peak>maxPeakBound){maxPeakBound=peak;globalThis.peakWhen={phase,local,voices:score._voices.size};}
    assert(score._voices.size<=72);
    if(phase==='fracture' && local>14.5 && local<17.5){
      if(!heldSources) heldSources=score.ac.sources.length;
      else assert.equal(score.ac.sources.length,heldSources,'held-breath passage kept adding notes');
    }
  }
  phaseCounts[phase]=score.ac.sources.length-before;
  elapsed+=duration;
}
for(const phase of ['street','photo','fracture','bloom','snow','final'])assert(phaseCounts[phase]>10,`${phase} has no score`);
assert.equal(phaseCounts.intro,0);
assert(score._breathIssued===false,'new scenes should clear the breath trigger');
for(const b of score.ac.buffers)for(const a of b.data)for(const value of a)assert(Number.isFinite(value)&&Math.abs(value)<1,'invalid or clipping buffer sample');
// Summed envelope maxima intentionally overestimate real waveform peaks; native
// offline rendering verifies the calibrated programme loudness separately.
assert(Number.isFinite(maxPeakBound)&&maxPeakBound<3,'pre-guard envelope headroom changed unexpectedly');
assert(score.guard?.curve,'native graph should install its transparent final guard');
assert.deepEqual(score.master.connections,[score.guard]);
assert.deepEqual(score.guard.connections,[score.ac.destination]);
const curve=score.guard.curve;
const transfer=input=>{
  const position=(Math.min(1,Math.max(-1,input))+1)*.5*(curve.length-1);
  const i=Math.min(curve.length-2,Math.floor(position)),mix=position-i;
  return curve[i]+(curve[i+1]-curve[i])*mix;
};
let guardPeak=0;
for(let i=0;i<curve.length;i++){
  const x=i*2/(curve.length-1)-1,value=curve[i];
  assert(Number.isFinite(value)&&Math.abs(value)<=.950001,'guard can emit a clipping value');
  if(Math.abs(x)<=.85)assert(Math.abs(value-x)<.000001,'guard alters the normal music range');
  if(i)assert(value>=curve[i-1],'guard transfer is not monotonic');
  guardPeak=Math.max(guardPeak,Math.abs(value));
}
for(const x of [-20,-2,-1,-.85,-.52,0,.52,.85,1,2,20]){
  assert(Math.abs(transfer(x))<=.950001,'overload escapes final guard');
  if(Math.abs(x)<=.85)assert(Math.abs(transfer(x)-x)<.000001);
}
const ac=score.ac;
score.setScene('street');
score.schedule();
const frozenNext=score.next;
await score.suspend();await score.resume();assert.equal(score.next,frozenNext,'background recovery stacked a new note onto an already scheduled note');
await score.toggle(); assert.equal(score.active,false); assert.equal(liveTimers,0);
const mutedSources=ac.sources.length; for(let i=0;i<30;i++){ac.tick(elapsed+i);score.schedule();} assert.equal(ac.sources.length,mutedSources);
await score.suspend(); await score.resume(); assert.equal(score.active,false); assert.equal(score.muted,true);
await score.toggle(); assert.equal(score.active,true); assert.equal(liveTimers,1);
ac.state='suspended';ac.onstatechange(); assert.equal(score.active,false);assert.equal(liveTimers,0);
ac.rejectNext=true;assert.equal(await score.resume(),false);assert.equal(score.active,false);
assert.equal(await score.toggle(),true);assert.equal(score.active,true);
score.restart();assert.equal(liveTimers,0);assert.equal(score.phase,'intro');
// A scene switch can cancel future sounds before they hit their first envelope point.
score.setScene('bloom');const future=[...score._voices].filter(v=>v.time>ac.currentTime);assert(future.length>0);
score.setScene('snow');for(const v of future)assert(v.gain.gain.events.some(e=>e[0]==='set'&&e[1]===.0001&&e[2]===ac.currentTime));
// Effect bursts are rate limited; all source nodes eventually disconnect.
const fxBefore=ac.sources.length;for(let i=0;i<100;i++)score.chime('flower');assert(ac.sources.length-fxBefore<=2);
score.shutter();score.suspend();ac.tick(ac.currentTime+20);assert.equal(score._voices.size,0);
score.dispose();assert.equal(ac.state,'closed');assert.equal(liveTimers,0);
// Minimal test doubles and old implementations without WaveShaper still work;
// that fallback has no hard output bound and is reported separately.
class NoGuardContext extends FakeContext {}
NoGuardContext.prototype.createWaveShaper=undefined;
const fallback=new Soundtrack({AudioContext:NoGuardContext});
assert.equal(await fallback.unlock(),true);assert.equal(fallback.guard,null);
assert.deepEqual(fallback.master.connections,[fallback.ac.destination]);fallback.dispose();
console.log(JSON.stringify({passed:true,phaseCounts,maxVoices,preGuardConservativeEnvelopeBound:maxPeakBound.toFixed(3),postGuardHardBound:guardPeak.toFixed(3),identityRange:'-0.85 to +0.85',fallbackWithoutWaveShaper:'direct output; no hard guard',timerStarts,buffers:ac.buffers.length},null,2));
