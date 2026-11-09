import assert from 'node:assert/strict';
import * as THREE from 'three';
import { chapterBlocking, chapterCamera, applyChapterPerformance } from './choreography.js';

const chapters = {
  encounter: 49.87, together: 37.15, keepworld: 33.15, fracture: 17,
  reach: 18.53, reunion: 32.65, orchestralWorld: 117.57,
};
const at = (chapter, chapterLocal) => ({ chapter, chapterLocal,
  chapterProgress: chapterLocal / chapters[chapter],
  local: chapter === 'reach' ? 9 + Math.max(0, chapterLocal - 11.53) : chapterLocal });
const allFinite = value => {
  if (Array.isArray(value)) return value.every(allFinite);
  if (value && typeof value === 'object') return Object.values(value).every(allFinite);
  return typeof value === 'number' && Number.isFinite(value);
};
const near = (a, b, tolerance = 1e-7) => assert(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);
let sampled = 0;
for (const aspect of [.42, 390 / 844, .56, .88, 1, 1.6, 844 / 390]) {
  const camera = new THREE.PerspectiveCamera(40, aspect, .1, 90);
  for (const [chapter, duration] of Object.entries(chapters)) {
    let previous = null;
    for (let t = 0; t <= duration + 1e-8; t += .25) {
      const story = at(chapter, t), blocking = chapterBlocking(story, aspect), shot = chapterCamera(story, aspect);
      assert(allFinite(blocking), `${chapter}: invalid blocking`);
      assert(allFinite(shot), `${chapter}: invalid camera`);
      assert(shot.fov >= 39 && shot.fov <= 44);
      assert.equal(blocking.by, 0); assert.equal(blocking.ry, 0);
      const separation = Math.hypot(blocking.bx - blocking.rx, blocking.bz - blocking.rz);
      assert(separation >= 1.23, `${chapter}/${t}: roots overlap (${separation})`);
      if (previous) {
        const speed = Math.hypot(blocking.bx - previous.bx, blocking.bz - previous.bz) / .25;
        assert(speed < 1.15, `${chapter}/${t}: root moves too quickly (${speed})`);
      }
      previous = blocking;
      camera.position.fromArray(shot.pos); camera.fov = shot.fov; camera.updateProjectionMatrix();
      camera.lookAt(new THREE.Vector3(...shot.look)); camera.updateMatrixWorld(true);
      for (const [x, z, yaw] of [[blocking.bx, blocking.bz, blocking.br], [blocking.rx, blocking.rz, blocking.rr]]) {
        const root = new THREE.Matrix4().makeRotationY(yaw); root.setPosition(x, 0, z);
        // Conservative full plush silhouette, including hat, feet and guitar.
        for (const px of [-.62, .62]) for (const py of [0, 2.05]) for (const pz of [-.45, .53]) {
          const p = new THREE.Vector3(px, py, pz).applyMatrix4(root).project(camera);
          assert(Math.abs(p.x) <= 1.06, `${aspect} ${chapter}/${t}: horizontal crop ${p.x.toFixed(3)}`);
          assert(Math.abs(p.y) <= 1.06, `${aspect} ${chapter}/${t}: vertical crop ${p.y.toFixed(3)}`);
        }
      }
      sampled++;
    }
  }
  for (const [left, right] of [['encounter', 'together'], ['keepworld', 'fracture'], ['fracture', 'reach'], ['reach', 'reunion'], ['reunion', 'orchestralWorld']]) {
    const a = chapterBlocking(at(left, chapters[left]), aspect), b = chapterBlocking(at(right, 0), aspect);
    for (const key of ['bx', 'rx', 'bz', 'rz', 'br', 'rr']) near(a[key], b[key]);
    const first = chapterCamera(at(left, chapters[left]), aspect), second = chapterCamera(at(right, 0), aspect);
    first.pos.forEach((value, i) => near(value, second.pos[i]));
    first.look.forEach((value, i) => near(value, second.look[i]));
    near(first.fov, second.fov);
  }
}

for (const chapter of ['portrait', 'birthday', 'quietExplore', undefined]) {
  assert.equal(chapterBlocking({chapter}, .46), null);
  assert.equal(chapterCamera({chapter}, .46), null);
}
assert.equal(chapterBlocking({chapter:'photography'}, .46), null);
assert.equal(chapterCamera({chapter:'photography',chapterLocal:20}, .46), null);
near(chapterCamera({chapter:'photography',chapterLocal:24.26}, .46).pos[2], 8.5);
for(const aspect of [.42,.46,.56]) assert(chapterCamera({chapter:'snow',chapterLocal:8,local:8,progress:8/15}, aspect).pos[2]>=9.8,'Snow framing must leave room for the raised free paw');
assert.equal(chapterCamera({chapter:'code',chapterLocal:7}, .46), null);
near(chapterCamera({chapter:'code',chapterLocal:14.82}, .46).pos[2], 11.8);
const fresh = chapterBlocking(at('encounter', 8), .46); fresh.bx = 99;
assert(chapterBlocking(at('encounter', 8), .46).bx < 0, 'returned targets must not share state');

const rotation = () => ({x:0,y:0,z:0});
const character = () => ({head:{rotation:rotation()},leftArm:{rotation:rotation()},rightArm:{rotation:rotation()},
  guitar:{rotation:rotation()},feet:[{rotation:rotation()},{rotation:rotation()}]});
for (const chapter of Object.keys(chapters)) for (const reduced of [false, true]) {
  for (let t = 0; t < chapters[chapter]; t += .5) {
    const cast = {badger:character(),bear:character()};
    const innerBadger = {...cast.badger.rightArm.rotation}, innerBear = {...cast.bear.leftArm.rotation};
    const feet = JSON.stringify([cast.badger.feet, cast.bear.feet]);
    applyChapterPerformance(cast, at(chapter, t), {reduced});
    assert.deepEqual(cast.badger.rightArm.rotation, innerBadger, 'BADGER contact arm changed');
    assert.deepEqual(cast.bear.leftArm.rotation, innerBear, 'Bear contact arm changed');
    assert.equal(JSON.stringify([cast.badger.feet, cast.bear.feet]), feet, 'planted feet changed');
    for (const c of [cast.badger, cast.bear]) {
      assert(allFinite(c.head.rotation));
      assert(Object.values(c.head.rotation).every(value => Math.abs(value) <= .4));
    }
  }
}
assert.doesNotThrow(() => applyChapterPerformance(null));
console.log(`Passed ${sampled} song-scale blocking/camera samples, seam checks and free-arm isolation checks. Browser composition remains a separate review.`);
