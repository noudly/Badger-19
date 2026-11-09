import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {directorAt, DIRECTOR_PLAN} from './director.js';
import {chapterBlocking, chapterCamera, applyChapterPerformance} from './choreography.js';

// Real scene geometry, advanced one animation frame at a time. This checks
// transitions that a series of snapped keyframes cannot exercise. It does not
// claim to verify rendered materials, audio, browser input, or visual taste.
const context = new Proxy({}, {
  get: (object, key) => key in object ? object[key] : () => {},
  set: (object, key, value) => (object[key] = value, true)
});
globalThis.document = {createElement: () => ({width: 128, height: 128, getContext: () => context})};
globalThis.matchMedia = () => ({matches: false});
const {createCast} = await import('./characters.js');
const {createWorld} = await import('./world.js');
const source = await fs.readFile(new URL('main.js', import.meta.url), 'utf8');
const stagingCode = source.slice(source.indexOf('function stageCast('), source.indexOf('function showPhoto('));
assert(stagingCode.includes('function shot('), 'Cannot locate production staging/camera functions');
const storyAt = directorAt;
const endingStart=360;
const failures = new Map();
const manualOnly = process.argv.includes('--manual-only');
let samples = 0;
function record(key, value, detail) {
  const previous = failures.get(key);
  if (!previous || value > previous.value) failures.set(key, {value, detail});
}
const vector = new THREE.Vector3();
function visibleMeshes(root) {
  const meshes = [];
  root.traverse(object => {
    if (!object.isMesh) return;
    for (let ancestor = object; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return;
    meshes.push(object);
  });
  return meshes;
}
function projectionBounds(meshes, camera) {
  let left = Infinity, right = -Infinity, bottom = Infinity, top = -Infinity;
  for (const mesh of meshes) {
    const positions = mesh.geometry.attributes.position;
    for (let index = 0; index < positions.count; index++) {
      vector.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld).project(camera);
      left = Math.min(left, vector.x); right = Math.max(right, vector.x);
      bottom = Math.min(bottom, vector.y); top = Math.max(top, vector.y);
    }
  }
  return {left, right, bottom, top, edge: Math.max(-left, right, -bottom, top)};
}
// The principal head meshes are transformed unit spheres. A vertex inside the
// other ellipsoid is an actual surface penetration, not just overlapping AABBs.
function skullPenetration(a, b) {
  let deepest = 0;
  for (const [first, second] of [[a, b], [b, a]]) {
    const inverse = second.matrixWorld.clone().invert();
    const positions = first.geometry.attributes.position;
    for (let index = 0; index < positions.count; index++) {
      vector.fromBufferAttribute(positions, index).applyMatrix4(first.matrixWorld).applyMatrix4(inverse);
      deepest = Math.max(deepest, 1 - vector.length());
    }
  }
  return deepest;
}
function pawSurface(paw, side) {
  const center = paw.getWorldPosition(new THREE.Vector3()), matrix = paw.matrixWorld.elements;
  center.x += side * Math.hypot(matrix[0], matrix[4], matrix[8]);
  return center;
}
function setup(aspect, reduced = false, step = 1 / 60) {
  const scene = new THREE.Scene(), cast = createCast(THREE);
  scene.add(cast.group);
  const world = createWorld(THREE, scene), camera = new THREE.PerspectiveCamera(40, aspect, .1, 90);
  const interaction = {reduced, x: 0, y: 0, badgerTap: -100, bearTap: -100, pulse: {kind: '', at: -100}};
  const api = new Function('cast', 'camera', 'reduce', 'interaction', 'camLook', 'ease', 'lerp', 'THREE', 'chapterBlocking', 'chapterCamera',
    `let cameraReady=false,frameDelta=${step};${stagingCode};return {stageCast,shot};`
  )(cast, camera, reduced, interaction, new THREE.Vector3(0, 1.05, 0), x => x * x * (3 - 2 * x), THREE.MathUtils.lerp, THREE, chapterBlocking, chapterCamera);
  return {scene, cast, world, camera, interaction, api};
}

for (const [width, height, reduced, fps, tapAt] of [
  [360, 800, false, 30], [390, 844, false, 60], [430, 932, false, 30],
  [1440, 900, false, 30], [844, 390, false, 30],
  [390, 844, true, 30], [1440, 900, true, 30],
  [360, 800, false, 30, 1]
].filter(config => !manualOnly || config[4] !== undefined)) {
  const label = `${width}x${height}${reduced ? '/reduced' : ''}/${fps}fps${tapAt === undefined ? '' : `/tap${tapAt}`}`;
  const {scene, cast, world, camera, interaction, api} = setup(width / height, reduced, 1 / fps);
  const skulls = [cast.badger.head, cast.bear.head].map(head => head.children.find(child => child.name === 'head'));
  assert(skulls.every(Boolean), 'Principal head ellipsoids are missing');
  const skippedIntro = 0; // A touch changes the strike, never the song clock.
  for (let frame = 0; frame <= (endingStart + 8 - skippedIntro) * fps; frame++) {
    const wallTime = frame / fps;
    const time = wallTime + (tapAt !== undefined && wallTime >= tapAt + 2.2 ? skippedIntro : 0);
    if (tapAt !== undefined && wallTime >= tapAt && interaction.badgerTap < 0) {
      interaction.badgerTap = time; interaction.pulse = {kind: 'break', at: time};
    }
    const story = storyAt(time);
    api.stageCast(story); cast.update(time, story, interaction); applyChapterPerformance(cast,story,interaction); world.update(time, story.worldStory||story, interaction); api.shot(story);
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    // Frame-rate integration runs at the specified rate; geometry is sampled
    // at 10 Hz, including the exact frame at every production phase boundary.
    if (frame % Math.max(1, fps / 10) !== 0) continue;
    samples++;
    const when = `${label} ${story.chapter||story.phase}+${story.local.toFixed(2)}s`;
    for (const character of [cast.badger, cast.bear]) {
      if (!character.group.visible) continue;
      const meshes = visibleMeshes(character.group);
      const bounds = projectionBounds(meshes, camera);
      if (!Number.isFinite(bounds.edge)) record('non-finite projection', Infinity, when);
      if (story.phase !== 'intro' && bounds.edge > 1.07) {
        record(`${label} character crop`, bounds.edge, `${when} ${character.group.name}, NDC edge ${bounds.edge.toFixed(3)}`);
      }
      const floor = new THREE.Box3().setFromObject(character.group).min.y;
      if (floor < -.05) record(`${label} floor penetration`, -floor, `${when} ${character.group.name}, y ${floor.toFixed(3)}`);
    }
    if (cast.bear.group.visible) {
      const penetration = skullPenetration(...skulls);
      // Ignore tiny plush contact (~1 cm) but reject merged silhouettes.
      if (penetration > .04) record(`${label} head intersection`, penetration, `${when}, normalized penetration ${penetration.toFixed(3)}`);
    }
    if ((story.phase === 'fracture' && story.local >= 16.5) || ['bloom', 'snow', 'final'].includes(story.phase)) {
      const a = pawSurface(cast.badger.rightArm.paw, 1), b = pawSurface(cast.bear.leftArm.paw, -1);
      const gap = a.distanceTo(b);
      if (gap > .035) record(`${label} held hands separate`, gap, `${when}, surface gap ${gap.toFixed(3)}`);
    }
  }
  world.dispose();
}

// Both entry paths must break the glass at the actual moving fist, and only
// once the fist arrives. This uses visible cracks as the observable impact cue.
for (const tapAt of (manualOnly ? [] : [null, 1, 3.5])) {
  const label = tapAt === null ? 'automatic strike' : `tap at ${tapAt}s`;
  const {scene, cast, world, interaction, api} = setup(390 / 844, false, 1 / 240);
  const cracks = world.group.getObjectByName('opening-impact-cracks');
  assert(cracks, 'Opening impact needs a visible crack object');
  let firstCrack = null, nearest = Infinity, nearestAt = null;
  const end = tapAt === null ? 6 : tapAt + 1.5;
  for (let frame = 0; frame <= end * 240; frame++) {
    const time = frame / 240, story = {phase: 'intro', local: time, progress: time / 8};
    if (tapAt !== null && time >= tapAt && interaction.badgerTap < 0) {
      interaction.badgerTap = time; interaction.pulse = {kind: 'break', at: time};
    }
    api.stageCast(story); cast.update(time, story, interaction); world.update(time, story, interaction);
    scene.updateMatrixWorld(true);
    const impact = world.landmarks.codeImpact;
    let distance = Infinity;
    for (const mesh of visibleMeshes(cast.badger.rightArm)) {
      const positions = mesh.geometry.attributes.position;
      for (let index = 0; index < positions.count; index++) {
        vector.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld);
        distance = Math.min(distance, vector.distanceTo(impact));
      }
    }
    if (distance < nearest) {nearest = distance; nearestAt = time;}
    if (firstCrack === null && cracks.visible && cracks.material.opacity > .05 && cracks.geometry.drawRange.count > 0) {
      firstCrack = {time, distance};
    }
  }
  if (nearest > .075) record(`${label} misses glass`, nearest, `${label}, minimum surface distance ${nearest.toFixed(3)} at ${nearestAt.toFixed(3)}s`);
  if (!firstCrack) record(`${label} has no crack cue`, Infinity, label);
  else if (firstCrack.distance > .10) record(`${label} cracks before contact`, firstCrack.distance, `${label}, first visible crack at ${firstCrack.time.toFixed(3)}s, fist distance ${firstCrack.distance.toFixed(3)}`);
  world.dispose();
}

if (failures.size) {
  const report = [...failures.values()].map(({detail}) => `- ${detail}`).join('\n');
  assert.fail(`Continuous-motion geometry checks found ${failures.size} issues:\n${report}`);
}
console.log(manualOnly
  ? `Passed ${samples} continuous-motion scene samples after a manual intro strike and early street entry.`
  : `Passed ${samples} continuous-motion scene samples across phone, desktop, landscape, reduced motion, 30 fps and manual street entry, plus automatic/tapped impact contact.`);
