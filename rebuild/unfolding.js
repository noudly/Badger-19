/**
 * An orchestral pop-up garden. The old cracks become something to stand on;
 * the little white flowers become a temporary, much larger world.
 *
 * All poses are sampled from absolute song time, so replay, seeks and muted
 * visual playback produce the same geometry. No particles or extra lights.
 */
export const UNFOLDING_CUES = Object.freeze({
  firstLight: 234.14,
  path: 265,
  flowers: 305,
  return: 320,
  quiet: 345,
  rest: 356,
});

const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => { value = clamp(value); return value * value * (3 - 2 * value); };
const between = (start, end, time) => ease((time - start) / (end - start));
const mix = (a, b, weight) => a + (b - a) * weight;

export function createUnfolding(THREE, scene) {
  const group = new THREE.Group();
  group.name = 'the-world-that-grew-from-a-crack';
  group.visible = false;
  scene.add(group);
  const resources = new Set();
  const geometry = value => { resources.add(value); return value; };
  const material = (color, options = {}) => {
    const value = new THREE.MeshStandardMaterial({
      color, roughness: .86, metalness: 0, transparent: true, opacity: 1,
      ...options,
    });
    resources.add(value); return value;
  };
  const stone = material('#63726b', { roughness: .93 });
  const stoneEdge = material('#bba77b', { roughness: .76 });
  const stemMaterial = material('#647a59', { roughness: .95 });
  const leafMaterial = material('#7f9270', { roughness: .94 });
  const petalMaterial = material('#f0e7d4', { roughness: .78 });
  const pollenMaterial = material('#c9a764', { roughness: .91 });
  const frameMaterial = material('#a18e6d', { roughness: .87 });
  const glassMaterial = material('#efd7a8', {
    roughness: .57, emissive: '#d5a259', emissiveIntensity: .22,
    depthWrite: false,
  });
  const lightMaterial = material('#d9bd83', {
    roughness: .62, emissive: '#bd8845', emissiveIntensity: .55,
    depthWrite: false,
  });
  const box = geometry(new THREE.BoxGeometry(1, 1, 1));
  const sphere = geometry(new THREE.SphereGeometry(1, 12, 8));
  const cylinder = geometry(new THREE.CylinderGeometry(1, 1, 1, 8));
  const instance = (name, geo, mat, count, castShadow = false) => {
    const object = new THREE.InstancedMesh(geo, mat, count);
    object.name = name;
    object.frustumCulled = false;
    object.castShadow = castShadow;
    object.receiveShadow = true;
    object.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(object); return object;
  };

  // Each plate pivots on its inner edge, never through the two characters.
  const plates = [];
  for (const side of [-1, 1]) {
    for (let row = 0; row < 3; row++) {
      for (let column = 0; column < 2; column++) {
        plates.push({
          side, row, column,
          hinge: [side * (1.84 + column * 1.36), .045, -1.42 - row * 1.38],
          width: 1.28, depth: 1.22,
          angle: .24 + row * .045 + column * .05,
          delay: row * 1.9 + column * 1.2 + (side > 0 ? 1.1 : 0),
        });
      }
    }
  }
  const slabs = instance('hinged-stone-path', box, stone, plates.length, true);
  const edges = instance('warm-cut-edges', box, stoneEdge, plates.length);
  const plateMatrices = plates.map(() => new THREE.Matrix4());

  // Flower bases use the plate transforms rather than floating above a path
  // which moves independently. The heads still grow upright like real plants.
  const flowers = plates.flatMap((plate, plateIndex) => {
    const count = plate.column ? 1 : 2;
    return Array.from({ length: count }, (_, number) => ({
      plateIndex, side: plate.side,
      u: plate.side * (.32 + number * .52),
      z: number ? .24 : -.22,
      height: 1.45 + plate.row * .29 + (plate.column ? .38 : 0) + number * .22,
      radius: .39 + plate.row * .04 + (plate.column ? .12 : 0),
      lean: plate.side * (.08 + plate.row * .025),
      delay: plate.row * 1.5 + plate.column * 1.7 + number * .8,
    }));
  });
  const stems = instance('flower-stems', cylinder, stemMaterial, flowers.length);
  const leaves = instance('flower-leaves', sphere, leafMaterial, flowers.length * 2);
  const petals = instance('white-flower-petals', sphere, petalMaterial, flowers.length * 7, true);
  const pollen = instance('gold-flower-centres', sphere, pollenMaterial, flowers.length);
  const flowerBases = flowers.map(() => new THREE.Vector3());

  // These are small physical window leaves with a hinge at ground level,
  // not disembodied glowing rectangles. They fold back into the street.
  const windows = [];
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    windows.push({
      x: side * (2.48 + i * .72), z: -4.6 - i * .21,
      height: 1.52 + i * .40, width: .76 + i * .07,
      side, delay: i * 2.3 + (side > 0 ? 1.4 : 0),
    });
  }
  const windowFrames = instance('folding-window-frames', box, frameMaterial, windows.length * 5, true);
  const windowGlass = instance('folding-window-light', box, glassMaterial, windows.length);

  const paths = [];
  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, .96, .20),
      new THREE.Vector3(side * .58, .25, -.35),
      new THREE.Vector3(side * 1.48, .075, -1.14),
      new THREE.Vector3(side * 2.10, .085, -2.12),
      new THREE.Vector3(side * 2.76, .12, -3.85),
    ]);
    const tube = geometry(new THREE.TubeGeometry(curve, 56, .012, 5, false));
    const object = new THREE.Mesh(tube, lightMaterial);
    object.name = side < 0 ? 'left-light-in-the-crack' : 'right-light-in-the-crack';
    object.frustumCulled = false;
    group.add(object);
    paths.push({ object, indices: tube.index.count });
  }

  const dummy = new THREE.Object3D();
  const pivot = new THREE.Matrix4();
  const local = new THREE.Matrix4();
  const platePoint = new THREE.Vector3();
  const headMatrix = new THREE.Matrix4();
  const head = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  const direction = new THREE.Vector3();
  let disposed = false;
  const write = (object, index, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, base = null) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(rx, ry, rz);
    dummy.scale.set(Math.max(.0001, sx), Math.max(.0001, sy), Math.max(.0001, sz));
    dummy.updateMatrix();
    if (base) local.multiplyMatrices(base, dummy.matrix);
    object.setMatrixAt(index, base ? local : dummy.matrix);
  };

  function update(value, { reduced = false } = {}) {
    if (disposed) return;
    const time = Number.isFinite(value) ? Math.max(0, value) : 0;
    group.visible = time >= UNFOLDING_CUES.firstLight;
    if (!group.visible) return;

    const closing = between(UNFOLDING_CUES.return, UNFOLDING_CUES.quiet, time);
    const growing = between(UNFOLDING_CUES.firstLight, UNFOLDING_CUES.path, time);
    const opening = between(261, UNFOLDING_CUES.flowers, time);
    const fading = 1 - between(331, 354, time);
    const rest = time >= UNFOLDING_CUES.rest;
    // Reduced motion uses stationary tableaux and opacity changes. The switch
    // to the low rest happens only when the larger tableau is fully invisible.
    const tableauOpacity = reduced && !rest ?
      between(234.14, 241, time) * (1 - between(331, 354, time)) : 1;
    const restOpacity = reduced && rest ? between(356, 360, time) : 1;
    const motionGrow = reduced ? (rest ? 0 : 1) : growing * (1 - closing);
    const flowerRise = reduced ? (rest ? 0 : 1) : opening * (1 - between(325, 350, time));
    const opacity = tableauOpacity * restOpacity;

    for (let index = 0; index < plates.length; index++) {
      const plate = plates[index];
      const lift = reduced ? motionGrow : between(234.14 + plate.delay, 258 + plate.delay, time) * (1 - closing);
      pivot.makeTranslation(...plate.hinge);
      local.makeRotationZ(plate.side * plate.angle * lift);
      pivot.multiply(local);
      plateMatrices[index].copy(pivot);
      write(slabs, index, plate.side * plate.width / 2, .028, 0,
        plate.width, .12, plate.depth, 0, 0, 0, pivot);
      write(edges, index, plate.side * plate.width / 2, .093, 0,
        plate.width * .965, .018, plate.depth * .965, 0, 0, 0, pivot);
    }

    for (let index = 0; index < flowers.length; index++) {
      const flower = flowers[index];
      platePoint.set(flower.u, .102, flower.z).applyMatrix4(plateMatrices[flower.plateIndex]);
      flowerBases[index].copy(platePoint);
      const emergence = reduced ? flowerRise :
        between(261 + flower.delay, 291 + flower.delay, time) * (1 - between(325, 350, time));
      const stemHeight = mix(.16, flower.height, emergence);
      const headScale = mix(.14, 1, emergence);
      const bloom = reduced ? flowerRise :
        between(269 + flower.delay, 299 + flower.delay, time) * (1 - between(328, 351, time));
      const stemX = platePoint.x + flower.lean * emergence;
      const stemY = platePoint.y + stemHeight;
      const stemZ = platePoint.z + .055;
      direction.set(stemX - platePoint.x, stemHeight, .055);
      dummy.position.set((platePoint.x + stemX) / 2, platePoint.y + stemHeight / 2, platePoint.z + .0275);
      dummy.quaternion.setFromUnitVectors(up, direction.clone().normalize());
      dummy.scale.set(.018, direction.length(), .018);
      dummy.updateMatrix(); stems.setMatrixAt(index, dummy.matrix);

      for (let leaf = 0; leaf < 2; leaf++) {
        const sign = leaf ? -1 : 1;
        write(leaves, index * 2 + leaf,
          platePoint.x + sign * .14 * headScale, platePoint.y + stemHeight * (.32 + leaf * .18), platePoint.z + .045,
          .23 * headScale, .055 * headScale, .09 * headScale,
          .14, sign * .25, sign * .35);
      }
      head.position.set(stemX, stemY, stemZ);
      head.rotation.set(-.10, flower.side * -.12, flower.side * -.05);
      head.scale.setScalar(headScale);
      head.updateMatrix(); headMatrix.copy(head.matrix);
      write(pollen, index, 0, 0, .06, .13, .13, .075, 0, 0, 0, headMatrix);
      for (let petal = 0; petal < 7; petal++) {
        const angle = petal / 7 * Math.PI * 2;
        const radius = flower.radius * mix(.11, .72, bloom);
        write(petals, index * 7 + petal,
          Math.cos(angle) * radius, Math.sin(angle) * radius, mix(.19, .012, bloom),
          flower.radius * .47, flower.radius * .78, flower.radius * .105,
          mix(1.13, .09, bloom), 0, angle - Math.PI / 2, headMatrix);
      }
    }

    windows.forEach((window, index) => {
      const fan = reduced ? (rest ? 0 : 1) :
        between(268 + window.delay, 302 + window.delay, time) * (1 - between(321, 348, time));
      pivot.makeTranslation(window.x, .09, window.z);
      local.makeRotationY(window.side * -.20); pivot.multiply(local);
      local.makeRotationX(-Math.PI / 2 * (1 - fan)); pivot.multiply(local);
      const thickness = .055;
      const bars = [
        [-window.width / 2, window.height / 2, thickness, window.height],
        [window.width / 2, window.height / 2, thickness, window.height],
        [0, .03, window.width, thickness],
        [0, window.height, window.width, thickness],
        [0, window.height * .53, window.width, thickness * .65],
      ];
      bars.forEach(([x, y, width, height], bar) => write(windowFrames, index * 5 + bar,
        x, y, .022, width, height, .07, 0, 0, 0, pivot));
      write(windowGlass, index, 0, window.height / 2, .006,
        window.width - .055, window.height - .055, .021, 0, 0, 0, pivot);
    });

    const normalOpacity = reduced ? opacity : between(234.14, 236.4, time);
    for (const mat of [stone, stoneEdge, stemMaterial, leafMaterial, petalMaterial, pollenMaterial]) mat.opacity = normalOpacity;
    const windowArrival = between(266, 274, time);
    frameMaterial.opacity = normalOpacity * fading * windowArrival;
    glassMaterial.opacity = normalOpacity * fading * windowArrival * .78;
    glassMaterial.emissiveIntensity = .12 + .22 * (reduced ? 1 : opening);
    for (const object of [slabs, edges, stems, leaves, petals, pollen]) object.visible = normalOpacity > .001;
    windowFrames.visible = windowGlass.visible = frameMaterial.opacity > .001;
    const pathOpacity = between(234.14, 239, time) * (1 - between(270, 286, time));
    lightMaterial.opacity = pathOpacity * (reduced ? tableauOpacity : 1);
    paths.forEach(({ object, indices }) => {
      object.visible = lightMaterial.opacity > .001;
      const draw = reduced ? 1 : between(234.14, 257, time);
      object.geometry.setDrawRange(0, Math.floor(indices * draw / 3) * 3);
    });
    for (const object of [slabs, edges, stems, leaves, petals, pollen, windowFrames, windowGlass]) {
      object.instanceMatrix.needsUpdate = true;
    }
    group.userData.state = { time, growing, opening, closing, flowerRise, rest, reduced, opacity };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const value of resources) value.dispose();
    group.removeFromParent();
  }
  group.userData.protectedCorridor = { left: -1.6, right: 1.6, solidHingeMinimumX: 1.84 };
  group.userData.drawObjects = 10;
  update(0);
  return { group, update, dispose };
}
