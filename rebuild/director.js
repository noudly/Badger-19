import { getPlan } from './song-timeline.js';
import { cinematicState } from './lighting.js';

// The recording has been decoded; its internal vocal labels still use the
// reference cue sheet. Acoustic measurements guide the orchestral restart and
// the later landing. A decoded duration does not establish lyric alignment.
export const RECORDING_DURATION = 380.107755;
export const DIRECTOR_PLAN = getPlan();

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = value => { const p = clamp(value); return p * p * (3 - 2 * p); };
const mix = (a, b, amount) => a + (b - a) * amount;
const byAnchor = Object.fromEntries(DIRECTOR_PLAN.anchors.map(anchor => [anchor.id, anchor.time]));

export const DIRECTOR_CUES = Object.freeze({
  ...byAnchor,
  photoShutter: 123,
  worldOpen: 234.14,
  portraitShutter: 362,
  recordingEnd: RECORDING_DURATION,
});

// These are editorial shot budgets, not claims that every boundary is a
// verified musical accent. The parent renderer supplies spatial camera paths.
export const DIRECTOR_SHOTS = Object.freeze([
  ['code-inspect', 'code', 0, 3.2],
  ['code-windup', 'code', 3.2, 5.075],
  ['code-strike', 'code', 5.075, 8],
  ['code-warm-opening', 'code', 8, byAnchor.firstVoice],
  ['encounter-approach', 'encounter', byAnchor.firstVoice, 28],
  ['encounter-guitar', 'encounter', 28, 38.5],
  ['encounter-imperfect-rhythm', 'encounter', 38.5, 49],
  ['encounter-make-room', 'encounter', 49, byAnchor.chorus1],
  ['together-first-steps', 'together', byAnchor.chorus1, 76],
  ['together-windows', 'together', 76, 87],
  ['together-leaf', 'together', 87, 95],
  ['together-return', 'together', 95, byAnchor.verse2],
  ['photo-compose', 'photography', byAnchor.verse2, 109],
  ['photo-flower', 'photography', 109, 116],
  ['photo-badger', 'photography', 116, DIRECTOR_CUES.photoShutter],
  ['photo-keep', 'photography', DIRECTOR_CUES.photoShutter, byAnchor.chorus2],
  ['keep-return', 'keepworld', byAnchor.chorus2, 139],
  ['keep-photo', 'keepworld', 139, 148],
  ['keep-hesitation', 'keepworld', 148, byAnchor.bridge],
  ['fracture-first-crack', 'fracture', byAnchor.bridge, 166],
  ['fracture-separate', 'fracture', 166, byAnchor.recognition],
  ['reach-footing', 'reach', byAnchor.recognition, 181.5],
  ['reach-hesitate', 'reach', 181.5, byAnchor.finalChorus - 7],
  ['reach-offer', 'reach', byAnchor.finalChorus - 7, 191.78],
  ['reach-wait', 'reach', 191.78, byAnchor.finalChorus],
  ['reunion-contact', 'reunion', byAnchor.finalChorus, byAnchor.finalChorus + 3],
  ['reunion-seed', 'reunion', byAnchor.finalChorus + 3, 212],
  ['reunion-light', 'reunion', 212, byAnchor.vocalEnd],
  ['orchestra-breath', 'orchestralWorld', byAnchor.vocalEnd, DIRECTOR_CUES.worldOpen],
  ['orchestra-cracks', 'orchestralWorld', DIRECTOR_CUES.worldOpen, 267],
  ['orchestra-flowers', 'orchestralWorld', 267, 310],
  ['orchestra-lamp', 'orchestralWorld', 310, byAnchor.orchestralSettle],
  ['snow-palm', 'snow', byAnchor.orchestralSettle, 352],
  ['snow-scarf', 'snow', 352, 357],
  ['snow-settle', 'snow', 357, byAnchor.portrait],
  ['portrait-ready', 'portrait', byAnchor.portrait, DIRECTOR_CUES.portraitShutter],
  ['portrait-shutter', 'portrait', DIRECTOR_CUES.portraitShutter, 363],
  ['portrait-develop', 'portrait', 363, byAnchor.blessing],
  ['birthday-nineteen', 'birthday', byAnchor.blessing, 370],
  ['birthday-wish', 'birthday', 370, 376],
  ['birthday-happy', 'birthday', 376, byAnchor.end],
  ['quiet-explore', 'quietExplore', byAnchor.end, Infinity],
].map(([id, chapter, start, end]) => Object.freeze({ id, chapter, start, end })));

function sampleKnots(time, knots) {
  if (time <= knots[0][0]) return knots[0][1];
  for (let index = 1; index < knots.length; index++) {
    const [end, value] = knots[index];
    const [start, previous] = knots[index - 1];
    if (time < end) return mix(previous, value, (time - start) / (end - start));
  }
  return knots.at(-1)[1];
}

const legacy = (phase, local, progress = 1) => ({ phase, local, progress: clamp(progress) });
const blendLight = (a, b, progress) => Object.fromEntries(
  Object.keys(a).map(key => [key, mix(a[key], b[key], clamp(progress))]),
);

function lightFor(chapter, time, story, lightStory) {
  const contact = cinematicState(legacy('fracture', 16));
  const warm = cinematicState(legacy('street', 18));
  const snow = cinematicState(legacy('snow', 0));
  if (chapter === 'reunion') {
    // Let the choice land before the large spatial reveal. This gentle light
    // does not run the old eight-second bloom during the final vocal chorus.
    return blendLight(contact, warm, smooth((time - byAnchor.finalChorus - 3) / 24) * .38);
  }
  if (chapter === 'orchestralWorld') {
    const waiting = blendLight(contact, warm, .38);
    const age = time - DIRECTOR_CUES.worldOpen;
    if (age < 0) return waiting;
    if (age < 2) {
      return blendLight(waiting, cinematicState(legacy('bloom', 1.8)), smooth(age / 2));
    }
    if (age < 8) {
      return blendLight(cinematicState(legacy('bloom', 1.8)), warm, smooth((age - 2) / 6));
    }
    return blendLight(warm, snow, smooth((time - (byAnchor.orchestralSettle - 15)) / 15));
  }
  return cinematicState(lightStory || story);
}

/**
 * Sample a director chapter and the short, existing performance clips inside
 * it. This function is stateless: playback recovery, replay and seek produce
 * the same sampled pose. It does not advance or seek the audio itself.
 *
 * `light` is the ready-to-apply profile; `lightStory` remains available for
 * consumers which need the underlying legacy lighting sample. `worldStory`
 * intentionally differs from the cast while the contact is held.
 */
export function directorAt(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
    throw new TypeError('Director time must be a finite number of seconds');
  }
  const time = Math.max(0, seconds);
  const section = DIRECTOR_PLAN.sections.find(candidate => time < candidate.end);
  const chapter = section?.id || 'quietExplore';
  const chapterLocal = section ? time - section.start : time - byAnchor.end;
  const chapterProgress = section ? clamp(chapterLocal / section.duration) : 1;
  let story;
  switch (chapter) {
    case 'code':
      story = legacy('intro', chapterLocal, chapterProgress);
      break;
    case 'encounter': {
      const local = sampleKnots(chapterLocal, [[0, 0], [12, 6], [20, 11], [28, 12], [36, 17], [section.duration, 18]]);
      story = legacy('street', local, local / 18);
      break;
    }
    case 'together':
      story = legacy('street', 18 + chapterLocal, 1);
      break;
    case 'photography': {
      const shutterLocal = DIRECTOR_CUES.photoShutter - section.start;
      const local = sampleKnots(chapterLocal, [[0, 0], [3, 3], [6, 5], [13, 8], [shutterLocal, 10], [shutterLocal + .5, 10.5], [section.duration, 16]]);
      story = legacy('photo', local, local / 16);
      break;
    }
    case 'keepworld':
      story = legacy('street', 18 + chapterLocal, 1);
      break;
    case 'fracture': {
      const local = sampleKnots(chapterLocal, [[0, 0], [7, 5], [section.duration, 9]]);
      story = legacy('fracture', local, local / 18);
      break;
    }
    case 'reach': {
      // Find footing and hesitate first. The offered/accepted hand then uses a
      // real seven-second performance, rather than a nineteen-second stretch.
      const local = 9 + clamp(time - (byAnchor.finalChorus - 7), 0, 7);
      story = legacy('fracture', local, local / 18);
      break;
    }
    case 'reunion':
      story = legacy('bloom', Math.min(3, chapterLocal), Math.min(3, chapterLocal) / 8);
      break;
    case 'orchestralWorld': {
      const local = 3 + clamp(time - DIRECTOR_CUES.worldOpen, 0, 5);
      story = legacy('bloom', local, local / 8);
      break;
    }
    case 'snow':
      story = legacy('snow', chapterLocal, chapterProgress);
      break;
    default:
      // A continuous final clip crosses portrait -> birthday -> quietExplore.
      // Birthday text itself is a separate cue and must not use final.local>4.
      story = legacy('final', time - byAnchor.portrait, 1);
  }

  let worldStory = { ...story };
  let lightStory = { ...story };
  if (chapter === 'reunion') {
    worldStory = legacy('fracture', 16, 16 / 18);
    lightStory = { ...worldStory };
  } else if (chapter === 'orchestralWorld') {
    const age = time - DIRECTOR_CUES.worldOpen;
    worldStory = age < 0 ? legacy('fracture', 16, 16 / 18) : legacy('bloom', Math.min(8, age), Math.min(1, age / 8));
    lightStory = age < 0 ? legacy('fracture', 16, 16 / 18) : age < 8 ? legacy('bloom', age, age / 8) : legacy('street', 18);
  }

  const shot = DIRECTOR_SHOTS.find(candidate => time < candidate.end);
  const shotLocal = time - shot.start;
  const shotProgress = Number.isFinite(shot.end) ? clamp(shotLocal / (shot.end - shot.start)) : 1;
  return {
    ...story,
    time,
    musicTime: Math.min(time, RECORDING_DURATION),
    chapter,
    chapterLabel: section?.label || '安静地继续陪伴',
    chapterLocal,
    chapterProgress,
    complete: time >= byAnchor.end,
    worldStory,
    lightStory,
    light: lightFor(chapter, time, story, lightStory),
    shot: shot.id,
    shotLocal,
    shotProgress,
    birthdayVisible: time >= byAnchor.blessing,
    portraitReady: time >= byAnchor.portrait,
  };
}
