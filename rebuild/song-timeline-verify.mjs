// Reference-profile contracts. Actual audio measurements do not verify vocal semantics.
import assert from 'node:assert/strict';
import { ALBUM_TIMELINE, createTimeline, getPlan } from './song-timeline.js';

const timeline = createTimeline();
const ids = ['code', 'encounter', 'together', 'photography', 'keepworld', 'fracture',
  'reach', 'reunion', 'orchestralWorld', 'snow', 'portrait', 'birthday'];
assert.equal(ALBUM_TIMELINE.duration, 380);
assert.equal(ALBUM_TIMELINE.calibrated, false);
assert.equal(ALBUM_TIMELINE.status, 'recording-backed-reference');
assert.equal(ALBUM_TIMELINE.recording.decodeVerified, true);
assert.equal(ALBUM_TIMELINE.recording.duration, 380.107755);
assert.equal(ALBUM_TIMELINE.recording.vocalAnchorsCalibrated, false);
assert.equal(timeline.sections.length, 12);
assert.deepEqual(timeline.sections.map(section => section.id), ids);
assert.equal(timeline.sections.reduce((sum, section) => sum + section.duration, 0), 380);
assert.equal(timeline.cues, timeline.sections);
assert.equal(timeline.anchors.find(anchor => anchor.id === 'vocalEnd').time, 227.43);
assert.equal(timeline.anchors.find(anchor => anchor.id === 'chorus1').toleranceSeconds, 1.5);
for (const id of ['orchestralSettle', 'portrait', 'blessing']) {
  const anchor = timeline.anchors.find(candidate => candidate.id === id);
  assert.equal(anchor.basis, 'editorial-provisional');
  assert.equal(anchor.toleranceSeconds, null);
  assert.deepEqual(anchor.sourceURLs, []);
}

assert.equal(timeline.at(-100).section, 'code');
assert.equal(timeline.at(-100).time, 0);
for (const [index, section] of timeline.sections.entries()) {
  const first = timeline.at(section.start);
  assert.equal(first.section, ids[index]);
  assert.equal(first.phase, ids[index]);
  assert.equal(first.local, 0);
  assert.equal(first.progress, 0);
  const middle = timeline.at((section.start + section.end) / 2);
  assert(Math.abs(middle.progress - .5) < 1e-10);
  assert.equal(timeline.at(section.end - .00001).section, ids[index]);
  assert.equal(timeline.at(section.end).section, ids[index + 1] || 'quietExplore');
}
assert.equal(timeline.at(380).progress, 1);
assert.equal(timeline.at(380).complete, true);
assert.equal(timeline.at(450).section, 'quietExplore');
assert.equal(timeline.at(450).local, 70);
assert.equal(timeline.at(450).overallProgress, 1);
for (const invalid of [NaN, Infinity, -Infinity, '15', null, undefined]) {
  assert.throws(() => timeline.at(invalid), TypeError);
}

const overrideInput = { chorus1: 65.5, portrait: 358 };
const adjusted = createTimeline({ overrides: overrideInput });
overrideInput.chorus1 = 75;
assert.equal(adjusted.sections[0].end, 14.82);
assert.equal(adjusted.sections[1].end, 65.5);
assert.equal(adjusted.sections[2].start, 65.5);
assert.equal(adjusted.sections.at(-3).end, 358);
assert.equal(timeline.sections[1].end, 64.69, 'overrides must not mutate defaults');
const edited = adjusted.anchors.find(anchor => anchor.id === 'chorus1');
assert.equal(edited.basis, 'editorial-override');
assert.equal(edited.originalBasis, 'reference-lrc');
assert.equal(edited.originalTime, 64.69);
assert.equal(edited.calibrated, false);
assert.equal(adjusted.calibrated, false, 'manual overrides are not proof of calibration');
assert.equal(adjusted.at(65.5).section, 'together');
assert.equal(getPlan().duration, 380);
assert.equal(getPlan({ overrides: { firstVoice: 15 } }).sections[0].end, 15);

for (const overrides of [null, [], 'bad']) {
  assert.throws(() => createTimeline({ overrides }), TypeError);
}
for (const overrides of [{ typo: 20 }, { start: 1 }, { end: 379 }, { end: 400 },
  { chorus1: 14.82 }, { chorus1: 101.84 }, { blessing: 381 }, { portrait: 370 }]) {
  assert.throws(() => createTimeline({ overrides }), RangeError);
}
for (const time of [NaN, Infinity, -1, '65', null, true]) {
  assert.throws(() => createTimeline({ overrides: { chorus1: time } }), TypeError);
}
assert.doesNotThrow(() => createTimeline({ overrides: { start: 0, end: 380 } }));

for (const object of [ALBUM_TIMELINE, ALBUM_TIMELINE.anchors, ALBUM_TIMELINE.anchors[1],
  ALBUM_TIMELINE.anchors[1].sourceURLs, timeline, timeline.sections,
  timeline.sections[0], timeline.getPlan(), timeline.at(1), timeline.at(400), adjusted.anchors]) {
  assert(Object.isFrozen(object));
}
assert.throws(() => { timeline.sections[0].end = 99; }, TypeError);
assert.throws(() => { ALBUM_TIMELINE.anchors[1].sourceURLs.push('unverified'); }, TypeError);
assert.throws(() => { adjusted.anchors[1].time = 99; }, TypeError);
assert.equal(getPlan().sections[3].id, 'photography');

console.log(JSON.stringify({ passed: true, sections: 12, duration: 380,
  calibrated: false, audioAuditioned: false, selectedRecordingDecoded: true }));
