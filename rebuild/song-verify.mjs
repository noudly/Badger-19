// Contract checks without a recording, network requests or browser autoplay.
import assert from 'node:assert/strict';
import { SongSoundtrack, SONG_SOURCE, SONG_TITLE } from './song.js';

const instances = [];
const named = name => Object.assign(new Error(name), { name });
class FakeAudio {
  constructor() {
    instances.push(this);
    this.listeners = new Map(); this.paused = true; this.ended = false;
    this.currentTime = 0; this.playCalls = 0; this.pauseCalls = 0;
    this.loadCalls = 0; this.nextPlay = null;
  }
  addEventListener(name, listener) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(listener);
  }
  removeEventListener(name, listener) { this.listeners.get(name)?.delete(listener); }
  emit(name) { for (const listener of this.listeners.get(name) || []) listener(); }
  setAttribute() {}
  removeAttribute(name) { delete this[name]; }
  load() { this.loadCalls++; }
  play() {
    this.playCalls++;
    if (this.nextPlay) {
      const next = this.nextPlay; this.nextPlay = null;
      return next();
    }
    this.paused = false; this.ended = false; this.emit('playing');
    return Promise.resolve();
  }
  pause() { this.pauseCalls++; this.paused = true; this.emit('pause'); }
}
const noopEffects = () => ({ muted: false, unlock() {}, resume() {}, suspend() {},
  toggle() { this.muted = !this.muted; }, restart() {}, chime() {}, shutter() {}, dispose() {} });
const attrs = {}, classes = {}, notices = [], states = [];
const statusElement = { textContent: '', hidden: true };
const button = { setAttribute(key, value) { attrs[key] = value; },
  classList: { toggle(key, value) { classes[key] = value; } } };
const song = new SongSoundtrack({ Audio: FakeAudio, effects: noopEffects(), button,
  statusElement, onUnavailable: state => notices.push(state), onStateChange: state => states.push(state) });
const audio = song.audio;
assert.equal(audio.src, SONG_SOURCE);
assert.equal(audio.loop, false,'the long orchestral ending must finish naturally');
assert.equal(audio.playsInline, true);
assert.equal(audio.playCalls, 0, 'construction must never start music');
assert.equal(song.title, SONG_TITLE);
assert.equal(statusElement.hidden, true);

const first = song.unlock();
assert.equal(audio.playCalls, 1, 'play must run synchronously inside the original gesture');
assert.equal(await first, true);
audio.currentTime = 17;
await song.unlock(); await song.unlock();
assert.equal(audio.playCalls, 1, 'two pointer listeners must not duplicate playback');
assert.equal(audio.currentTime, 17, 'exploration must never restart the recording');
song.setScene('street'); song.updateStory({ phase: 'fracture', local: 10 });
song.setScene('bloom'); song.updateStory({ phase: 'final', local: 99 });
assert.equal(audio.currentTime, 17, 'scene changes must not seek');
assert.equal(audio.playCalls, 1);

audio.currentTime=380;audio.duration=380;audio.ended=true;audio.paused=true;audio.emit('ended');
assert.equal(song.state.status,'ended');assert.equal(song.playback.ended,true);assert.equal(song.playback.duration,380);
const completedCalls=audio.playCalls;
await song.unlock();await song.resume();assert.equal(audio.playCalls,completedCalls,'exploration and background recovery must not restart the completed song');
await song.toggle();assert.equal(audio.currentTime,0,'an explicit music replay starts at the beginning');assert.equal(song.active,true);

await song.toggle();
assert.equal(song.muted, true); assert.equal(song.active, false);
const mutedCalls = audio.playCalls;
await song.unlock(); await song.suspend(); await song.resume(); await song.restart();
assert.equal(song.muted, true, 'mute must survive exploration, visibility and replay');
assert.equal(audio.playCalls, mutedCalls);
assert.equal(audio.currentTime, 0, 'replay should reset the recording without unmuting');
await song.toggle(); assert.equal(song.active, true); assert.equal(song.muted, false);
audio.currentTime = 29;
await song.suspend(); assert.equal(song.active, false); assert.equal(song.muted, false);
await song.resume(); assert.equal(song.active, true); assert.equal(audio.currentTime, 29);
audio.pause();
await song.toggle(); assert.equal(song.active, true, 'one click should restore a system-paused player');

audio.emit('error'); audio.emit('error');
assert.equal(song.active, false); assert.equal(song.unavailable, true);
assert.equal(notices.length, 1, 'one missing source should produce one nonblocking notice');
assert.equal(statusElement.textContent, '音乐未载入');
assert.equal(statusElement.hidden, false);
assert.match(attrs['aria-label'], /音乐未载入/);
assert(!statusElement.textContent.includes('.mp3'), 'technical paths do not belong in the story');
const failedCalls = audio.playCalls;
await song.unlock(); await song.unlock();
assert.equal(audio.playCalls, failedCalls, 'exploration must not hammer a missing file');

await song.setSource('blob:local-recording');
const local = song.audio;
assert.notEqual(local, audio);
assert.equal(local.src, 'blob:local-recording');
assert.equal(song.active, true); assert.equal(song.unavailable, false);
assert.equal(statusElement.hidden, true);
assert.equal(audio.src, undefined, 'replacing a source should release the previous download');
audio.emit('error'); assert.equal(song.unavailable, false, 'stale element events must be ignored');

await song.suspend();
local.nextPlay = () => Promise.reject(named('NotAllowedError'));
assert.equal(await song.resume(), false);
assert.equal(song.unavailable, false, 'autoplay denial does not mean the recording is missing');
assert.equal(song.state.status, 'blocked');
assert.equal(await song.toggle(), true, 'a later gesture can retry denied playback');

await song.suspend();
let rejectOld;
local.nextPlay = () => new Promise((resolve, reject) => { rejectOld = reject; });
const stalePlay = song.resume();
await song.setSource('blob:new-recording');
rejectOld(named('NotSupportedError'));
assert.equal(await stalePlay, false);
assert.equal(song.unavailable, false, 'an old play rejection must not poison the current source');
assert.equal(song.active, true);

const neverTouched = new SongSoundtrack({ Audio: FakeAudio, effects: noopEffects() });
await neverTouched.restart(); await neverTouched.suspend(); await neverTouched.resume();
assert.equal(neverTouched.audio.playCalls, 0, 'replay/background restore cannot bypass the first gesture');
await neverTouched.unlock();
assert.equal(neverTouched.active, true, 'a fresh gesture recovers a page hidden before its first touch');

const unsupported = new SongSoundtrack({ Audio: null, effects: noopEffects() });
assert.equal(unsupported.unavailable, true);
assert.equal(await unsupported.unlock(), false);
const malformed = new SongSoundtrack({ Audio: FakeAudio, effects: noopEffects() });
malformed.audio.nextPlay = () => Promise.reject(named('NotSupportedError'));
assert.equal(await malformed.unlock(), false);
assert.equal(malformed.unavailable, true);

// A late pending play result cannot undo an explicit mute.
const pending = new SongSoundtrack({ Audio: FakeAudio, effects: noopEffects() });
let resolvePending;
pending.audio.nextPlay = () => new Promise(resolve => { resolvePending = resolve; });
const pendingPlay = pending.unlock();
await pending.toggle();
assert.equal(pending.muted, true);

// A late first touch joins the already-running story once. Ordinary exploration
// never seeks a live recording, even if the caller provides a different time.
const clockCases = [];
const fixture = (Audio = FakeAudio) => {
  const item = new SongSoundtrack({ Audio, effects: noopEffects() });
  clockCases.push(item);
  return item;
};
const late = fixture();
const lateStart = late.unlock(120);
assert.equal(late.audio.currentTime, 120);
assert.equal(late.audio.playCalls, 1, 'alignment must not defer the gesture-bound play call');
await lateStart;
await late.unlock(180);
assert.equal(late.audio.currentTime, 120, 'exploration while playing must not seek');
assert(Object.isFrozen(late.playback));
assert.equal(late.playback.unlocked, true);
assert.equal(late.playback.blocked, false);
assert.equal(late.playback.waiting, false);
assert.equal(late.playback.suspended, false);

late.audio.currentTime = 126;
await late.toggle(126);
await late.unlock(150);
assert.equal(late.audio.currentTime, 126, 'exploration while muted must not seek');
await late.toggle(150);
assert.equal(late.audio.currentTime, 150, 'unmuting joins the current visual time');
late.audio.pause();
await late.unlock(150.2);
assert.equal(late.audio.currentTime, 150, 'a sub-300ms inactive drift need not seek');
late.audio.pause();
await late.unlock(151);
assert.equal(late.audio.currentTime, 151);

late.audio.emit('waiting');
assert.equal(late.playback.waiting, true);
assert.equal(late.playback.playing, false);
const waitingCalls = late.audio.playCalls;
await late.unlock(190);
assert.equal(late.audio.currentTime, 151, 'a buffering player is not a fresh late start');
assert.equal(late.audio.playCalls, waitingCalls);
await late.toggle(151);
assert.equal(late.muted, true, 'the sound control can mute a buffering recording');
assert.equal(late.playback.waiting, false);
await late.toggle(160);
assert.equal(late.audio.currentTime, 160);
late.audio.readyState = 4;
late.audio.emit('stalled');
assert.equal(late.playback.waiting, false, 'a stalled download can still have enough buffered audio');
late.audio.readyState = 2;
late.audio.emit('stalled');
assert.equal(late.playback.waiting, true);
late.audio.readyState = 4;
late.audio.emit('canplay');
assert.equal(late.playback.waiting, false);

// Safari can reject currentTime until metadata exists. Preserve the requested
// visual time rather than briefly exposing audio time zero to the director.
class MetadataAudio extends FakeAudio {
  constructor() { super(); this.readyState = 0; this.duration = NaN; }
  get currentTime() { return this._time || 0; }
  set currentTime(value) {
    if (this.readyState === 0) throw named('InvalidStateError');
    this._time = value;
  }
  play() {
    this.playCalls++; this.paused = false; this.ended = false; this.emit('waiting');
    return new Promise(resolve => { this.finishPlay = resolve; });
  }
  ready() {
    this.readyState = 4; this.duration = 380.107755;
    this.emit('loadedmetadata'); this.emit('canplay');
    if (!this.paused) this.emit('playing');
    this.finishPlay?.();
  }
}
const deferred = fixture(MetadataAudio);
const deferredStart = deferred.unlock(194.78);
assert.equal(deferred.audio.playCalls, 1);
assert.equal(deferred.audio.currentTime, 0);
assert.equal(deferred.playback.time, 194.78);
assert.equal(deferred.playback.seeking, true);
assert.equal(deferred.playback.waiting, true);
deferred.audio.ready();
assert.equal(await deferredStart, true);
assert.equal(deferred.audio.currentTime, 194.78);
assert.equal(deferred.playback.seeking, false);
assert.equal(deferred.playback.waiting, false);
for (const invalid of [NaN, Infinity, -Infinity, '30', null, undefined]) {
  assert.equal(deferred.align(invalid), false);
  assert.equal(deferred.audio.currentTime, 194.78);
}

// A first touch after the silent film has ended must not revive the prelude,
// including when its duration becomes known only after that touch.
const afterEnd = fixture();
afterEnd.audio.duration = 380.107755;
assert.equal(await afterEnd.unlock(420), false);
assert.equal(afterEnd.audio.playCalls, 0);
assert.equal(afterEnd.audio.currentTime, 380.107755);
assert.equal(afterEnd.playback.ended, true);
await afterEnd.unlock(430);
assert.equal(afterEnd.audio.playCalls, 0);
assert.equal(await afterEnd.restart(), true);
assert.equal(afterEnd.audio.currentTime, 0);
const unknownEnd = fixture(MetadataAudio);
const unknownStart = unknownEnd.unlock(420);
unknownEnd.audio.ready();
assert.equal(await unknownStart, false);
assert.equal(unknownEnd.playback.ended, true);
assert.equal(unknownEnd.audio.currentTime, 380.107755);
assert.equal(unknownEnd.audio.paused, true);
assert.equal(unknownEnd.active, false);

const replacement = fixture();
await replacement.unlock(50);
replacement.audio.emit('error');
await replacement.toggle(75);
assert.equal(replacement.audio.currentTime, 75, 'retrying a failed source retains the current visual position');
assert.equal(replacement.active, true);
resolvePending(); await pendingPlay;
assert.equal(pending.active, false);
assert.equal(pending.muted, true);

// The existing interaction sounds are hard isolated from score scheduling.
const fx = new SongSoundtrack({ Audio: FakeAudio });
fx.effects.phase = 'bloom';
fx.effects._startScheduler(); fx.effects.schedule();
assert.equal(fx.effects.timer, null);
fx.setScene('bloom'); fx.updateStory({ phase: 'final', local: 30 });
assert.equal(fx.effects.story.phase, 'intro');

for (const item of [song, neverTouched, unsupported, malformed, pending, fx, ...clockCases]) item.dispose();
assert.equal(song.active, false);
assert.equal(await song.unlock(), false);
assert([...song.audio.listeners.values()].every(listeners => listeners.size === 0));
assert(states.some(state => state.status === 'playing'));
assert(states.some(state => state.status === 'unavailable'));
console.log(JSON.stringify({ passed: true, musicAlignmentVerified: true, recordingIncludedInUnitFixture: false,
  soundtrack: SONG_TITLE, independentBackgroundScore: false }));
