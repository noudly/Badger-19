import assert from 'node:assert/strict';
import { directorAt, DIRECTOR_CUES, DIRECTOR_PLAN, DIRECTOR_SHOTS, RECORDING_DURATION } from './director.js';

const phases = new Set(['intro', 'street', 'photo', 'fracture', 'bloom', 'snow', 'final']);
const expectedChapters = ['code', 'encounter', 'together', 'photography', 'keepworld', 'fracture', 'reach', 'reunion', 'orchestralWorld', 'snow', 'portrait', 'birthday'];
assert.deepEqual(DIRECTOR_PLAN.sections.map(section => section.id), expectedChapters);
assert.equal(DIRECTOR_CUES.orchestralSettle, 345);
assert.equal(RECORDING_DURATION, 380.107755);
assert.equal(directorAt(-2).time, 0);
for (const value of [NaN, Infinity, -Infinity, null, undefined, '194.78']) {
  assert.throws(() => directorAt(value), TypeError);
}

for (const section of DIRECTOR_PLAN.sections) {
  assert.equal(directorAt(section.start).chapter, section.id);
  assert.equal(directorAt(section.end - 1e-7).chapter, section.id);
  assert.equal(directorAt(section.start).chapterLocal, 0);
}
assert.equal(directorAt(380).chapter, 'quietExplore');
assert.equal(directorAt(450).chapter, 'quietExplore');
assert.equal(directorAt(450).musicTime, RECORDING_DURATION);

assert.equal(directorAt(5.075).phase, 'intro');
assert.equal(directorAt(5.075).local, 5.075, 'the existing automatic punch retains its real contact time');
assert.equal(directorAt(DIRECTOR_CUES.photoShutter).phase, 'photo');
assert.equal(directorAt(DIRECTOR_CUES.photoShutter).local, 10, 'the camera remains held at the actual shutter cue');
assert(directorAt(DIRECTOR_CUES.photoShutter - .2).local < 10);
assert(directorAt(DIRECTOR_CUES.photoShutter + .2).local > 10);

assert.equal(directorAt(DIRECTOR_CUES.finalChorus - 7).local, 9);
assert(Math.abs(directorAt(DIRECTOR_CUES.finalChorus - .001).local - 15.999) < 1e-9);
assert.equal(directorAt(DIRECTOR_CUES.finalChorus).phase, 'bloom');
assert.equal(directorAt(DIRECTOR_CUES.finalChorus).local, 0);
assert.equal(directorAt(DIRECTOR_CUES.finalChorus + 2).worldStory.phase, 'fracture');
assert.equal(directorAt(DIRECTOR_CUES.finalChorus + 2).worldStory.local, 16);
assert.equal(directorAt(DIRECTOR_CUES.worldOpen - .001).worldStory.phase, 'fracture');
assert.equal(directorAt(DIRECTOR_CUES.worldOpen).worldStory.phase, 'bloom');
assert.equal(directorAt(DIRECTOR_CUES.worldOpen).worldStory.local, 0);
assert.equal(directorAt(300).worldStory.local, 8, 'the completed effect does not restart to fill the long ending');
assert.equal(directorAt(344.999).worldStory.phase, 'bloom', 'snow waits for the later landing');
assert.equal(directorAt(345).phase, 'snow');
assert.equal(directorAt(360).phase, 'final');
assert.equal(directorAt(368).local, 8);
assert.equal(directorAt(380).local, 20);
assert.equal(directorAt(450).local, 90);
assert.equal(directorAt(367.999).birthdayVisible, false);
assert.equal(directorAt(368).birthdayVisible, true);

for (let index = 0; index < DIRECTOR_SHOTS.length - 1; index++) {
  const shot = DIRECTOR_SHOTS[index];
  assert.equal(shot.end, DIRECTOR_SHOTS[index + 1].start, 'shot budgets must contain no gaps or overlap');
  assert(shot.end > shot.start);
  assert.equal(directorAt(shot.start).shot, shot.id);
  assert.equal(directorAt(shot.start).chapter, shot.chapter);
}
assert.equal(DIRECTOR_SHOTS.at(-1).end, Infinity);

let samples = 0;
for (let time = 0; time <= 420; time += 1 / 30) {
  const state = directorAt(time);
  assert(phases.has(state.phase));
  assert(phases.has(state.worldStory.phase));
  assert(phases.has(state.lightStory.phase));
  for (const key of ['local', 'chapterLocal', 'chapterProgress', 'shotLocal', 'shotProgress', 'progress', 'musicTime']) {
    assert(Number.isFinite(state[key]), `${key} is finite at ${time}`);
    assert(state[key] >= 0, `${key} is nonnegative at ${time}`);
  }
  assert(state.progress <= 1 && state.chapterProgress <= 1 && state.shotProgress <= 1);
  for (const value of Object.values(state.light)) assert(Number.isFinite(value) && value >= 0);
  samples++;
}
// The bespoke orchestral envelope is continuous through the delayed restart,
// full reveal, warm hold, and late return to the snow exposure.
for (const cue of [194.78, 227.43, 234.14, 236.14, 242.14, 330, 345, 360, 368, 380]) {
  const before = directorAt(cue - .00001).light;
  const after = directorAt(cue + .00001).light;
  for (const key of Object.keys(before)) {
    assert(Math.abs(before[key] - after[key]) < .0001, `light ${key} stays continuous at ${cue}`);
  }
}

console.log(JSON.stringify({ passed: true, chapters: expectedChapters.length,
  shots: DIRECTOR_SHOTS.length, samples, recordingDuration: RECORDING_DURATION,
  referenceVocalCuesFullyCalibrated: false }));
