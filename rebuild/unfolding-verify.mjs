import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createUnfolding, UNFOLDING_CUES } from './unfolding.js';

const scene = new THREE.Scene();
const unfolding = createUnfolding(THREE, scene);
const { group } = unfolding;
assert.equal(group.parent, scene);
assert.equal(group.visible, false);
const objects = [];
group.traverse(object => { if (object.isMesh) objects.push(object); });
assert(objects.length <= 12, 'the large garden must remain a small number of draw objects');
assert(objects.filter(object => object.castShadow).length <= 4);
assert.equal(objects.filter(object => object.isInstancedMesh).length, 8);
assert.equal(UNFOLDING_CUES.firstLight, 234.14);
const matrix = new THREE.Matrix4();
let samples = 0;
for (const reduced of [false, true]) {
  for (let time = 0; time <= 420; time += .5) {
    unfolding.update(time, { reduced });
    assert.equal(group.visible, time >= 234.14);
    if (!group.visible) continue;
    for (const object of objects) {
      assert(Number.isFinite(object.material.opacity));
      assert(object.material.opacity >= 0 && object.material.opacity <= 1);
      if (!object.isInstancedMesh) continue;
      for (let index = 0; index < object.count; index++) {
        object.getMatrixAt(index, matrix);
        assert(matrix.elements.every(Number.isFinite), `${object.name} finite pose at ${time}`);
        assert(matrix.determinant() > 0, `${object.name} remains nondegenerate at ${time}`);
      }
    }
    samples++;
  }
}

const snapshot = () => objects.filter(object => object.isInstancedMesh).map(object => Array.from(object.instanceMatrix.array));
unfolding.update(304.45);
const peak = snapshot();
const peakCentres = group.getObjectByName('gold-flower-centres');
let tallestFlower = 0;
for (let index = 0; index < peakCentres.count; index++) {
  peakCentres.getMatrixAt(index, matrix);
  tallestFlower = Math.max(tallestFlower, matrix.elements[13]);
}
assert(tallestFlower > 2.2, 'the ordinary flowers become a tangible larger world');
unfolding.update(358);
unfolding.update(50);
unfolding.update(304.45);
assert.deepEqual(snapshot(), peak, 'absolute time must reproduce geometry after seeks/replay');
unfolding.update(250, { reduced: true });
const reducedTableau = snapshot();
unfolding.update(290, { reduced: true });
assert.deepEqual(snapshot(), reducedTableau, 'reduced-motion flowers form a stationary tableau');
unfolding.update(360);
assert.equal(group.userData.state.rest, true);
assert.equal(group.getObjectByName('folding-window-frames').visible, false);
assert.equal(group.getObjectByName('left-light-in-the-crack').visible, false);
const flowerCentres = group.getObjectByName('gold-flower-centres');
for (let index = 0; index < flowerCentres.count; index++) {
  flowerCentres.getMatrixAt(index, matrix);
  assert(matrix.elements[13] < .5, 'large flowers return to a low, quiet rest');
  assert(Math.abs(matrix.elements[12]) > 1.7, 'solid plants stay outside the cast corridor');
}
unfolding.update(304.45);
const panels = group.getObjectByName('hinged-stone-path');
for (let index = 0; index < panels.count; index++) {
  panels.getMatrixAt(index, matrix);
  const halfProjectedWidth = (Math.abs(matrix.elements[0]) + Math.abs(matrix.elements[4])) / 2;
  assert(Math.abs(matrix.elements[12]) - halfProjectedWidth >= 1.78,
    'plate inner edge cannot swing through the characters');
}
unfolding.update(0);
assert.equal(group.visible, false);
for (const malformed of [NaN, Infinity, -Infinity, undefined, null, '300']) {
  unfolding.update(malformed);
  assert.equal(group.visible, false);
}
let disposeEvents = 0;
const resources = new Set();
for (const object of objects) { resources.add(object.geometry); resources.add(object.material); }
for (const resource of resources) resource.addEventListener('dispose', () => disposeEvents++);
unfolding.dispose();
assert.equal(group.parent, null);
assert.equal(disposeEvents, resources.size);
unfolding.dispose();
assert.equal(disposeEvents, resources.size, 'disposal is idempotent');
console.log(JSON.stringify({ passed: true, drawObjects: objects.length, poseSamples: samples,
  noExternalAssets: true, musicRestart: UNFOLDING_CUES.firstLight,
  quietRest: UNFOLDING_CUES.rest, physicalRenderingRequiresBrowser: true }));
