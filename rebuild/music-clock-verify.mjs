import assert from 'node:assert/strict';
import { MusicClock } from './music-clock.js';

const playing = (time, extra = {}) => ({ time, duration: 380.107755, unlocked: true,
  loaded: true, playing: true, waiting: false, muted: false, blocked: false,
  unavailable: false, suspended: false, seeking: false, ended: false, ...extra });
let checks = 0;
const check = (label, run) => { run(); checks++; console.log('PASS ' + label); };

check('silent viewing advances before permission and when there is no source', () => {
  const clock = new MusicClock();
  assert.equal(clock.time, 0);
  assert.equal(clock.update(8), 8);
  assert.equal(clock.update(2, null), 10);
  assert.equal(clock.update(5, playing(0, { unavailable: true })), 15);
});

check('recording time replaces frame time after a late aligned unlock', () => {
  const clock = new MusicClock();
  clock.update(24);
  assert.equal(clock.update(.1, playing(24, { seeking: true, playing: false })), 24);
  assert.equal(clock.update(.2, playing(24.32)), 24.32);
  assert.equal(clock.update(9, playing(24.32)), 24.32, 'render frames cannot make audio run faster');
  assert.equal(clock.update(.01, playing(24.5)), 24.5);
});

check('a denied play and explicit mute continue the same silent story', () => {
  const clock = new MusicClock();
  clock.update(.1, playing(40));
  assert.equal(clock.update(3, playing(40, { playing: false, blocked: true })), 43);
  assert.equal(clock.update(2, playing(40, { playing: false, muted: true, waiting: true })), 45);
  assert.equal(clock.update(.1, playing(45, { seeking: true, playing: false })), 45);
  assert.equal(clock.update(.1, playing(45.08)), 45.08);
});

check('a denied or failed pending seek cannot freeze silent fallback', () => {
  const clock = new MusicClock();
  clock.reset(32);
  const pending = playing(32, { seeking: true, playing: false, loaded: false });
  assert.equal(clock.update(1, { ...pending, blocked: true }), 33);
  assert.equal(clock.update(2, { ...pending, unavailable: true }), 35);
  assert.equal(clock.update(3, { ...pending, muted: true }), 38);
  assert.equal(clock.update(.1, { ...pending, time: 38 }), 38, 'a permitted retry can hold its new alignment target');
});

check('buffering after actual playback freezes even if the element still looks active', () => {
  const clock = new MusicClock();
  clock.update(0, playing(194.6));
  assert.equal(clock.update(6, playing(194.6, { waiting: true })), 194.6);
  assert.equal(clock.update(1, playing(194.6, { playing: false, waiting: true })), 194.6);
  assert.equal(clock.update(.1, playing(194.8)), 194.8);
});

check('hidden pages and suspended contexts freeze silent, playing and ended time', () => {
  const clock = new MusicClock();
  clock.reset(130);
  assert.equal(clock.update(30, {}, { paused: true }), 130);
  assert.equal(clock.update(30, playing(160), { paused: true }), 130);
  assert.equal(clock.update(30, playing(380.107755, { ended: true, suspended: true })), 130);
  assert.equal(clock.update(.1, playing(130.08)), 130.08);
});

check('explicit media seeking can move backwards and remains frozen while hidden', () => {
  const clock = new MusicClock();
  clock.update(0, playing(200));
  assert.equal(clock.update(1, playing(50, { playing: false, seeking: true })), 50);
  assert.equal(clock.update(1, playing(20, { seeking: true }), { paused: true }), 50);
  assert.equal(clock.update(.1, playing(50.2)), 50.2);
});

check('initial loading remains viewable but unexpected later pauses do not outrun music', () => {
  const clock = new MusicClock();
  assert.equal(clock.update(2, playing(0, { unlocked: false, waiting: true, playing: false })), 2);
  assert.equal(clock.update(20, playing(2, { waiting: true, playing: false })), 2, 'a permitted start waits at its aligned frame');
  assert.equal(clock.update(0, playing(2)), 2);
  assert.equal(clock.update(10, playing(2, { playing: false })), 2);
  assert.equal(clock.update(10, playing(NaN)), 2);
});

check('a natural ending reaches actual file duration and continues quiet postroll without looping', () => {
  const clock = new MusicClock();
  clock.update(0, playing(380));
  assert.equal(clock.update(.1, playing(380.107755, { ended: true, playing: false })), 380.207755);
  assert.equal(clock.update(2, playing(380.107755, { ended: true, playing: false })), 382.207755);
  clock.reset(400);
  assert.equal(clock.update(2, playing(380.107755, { ended: true, playing: false })), 402);
});

check('replay resets playback history and malformed frame inputs cannot poison time', () => {
  const clock = new MusicClock({ duration: 10 });
  clock.update(0, playing(5, { duration: 10 }));
  assert.equal(clock.reset(), 0);
  assert.equal(clock.update(1, playing(0, { unlocked: false, playing: false, waiting: true, duration: 10 })), 1);
  for (const dt of [-1, NaN, Infinity, -Infinity, '3', null, undefined]) {
    assert.equal(clock.update(dt, {}), 1);
  }
  assert.equal(clock.reset(-5), 0);
  assert.equal(clock.reset(NaN), 0);
  assert.equal(clock.update(1, { duration: Infinity, ended: true }), 11);
  assert.equal(clock.update(1, { time: NaN, seeking: true, unlocked: true }), 11);
  clock.reset(Number.MAX_VALUE);
  assert(Number.isFinite(clock.update(Number.MAX_VALUE, {})));
  for (const duration of [0, -1, NaN, Infinity, '380']) {
    assert.throws(() => new MusicClock({ duration }), TypeError);
  }
});

console.log(JSON.stringify({ passed: true, contracts: checks, browserAudioVerified: false }));
