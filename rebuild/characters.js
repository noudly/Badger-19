/* Original articulated art-toy cast. All surfaces are generated locally. */
export function createCast(THREE) {
  const group = new THREE.Group();
  group.name = 'BADGER & BEAR';
  const texture = makeTextile(THREE);
  const material = (color, options = {}) => new THREE.MeshStandardMaterial({
    color, roughness: .91, metalness: 0, bumpMap: texture,
    bumpScale: .008, ...options
  });
  const palette = {
    taupe: material('#a98b72'), cream: material('#f0dfbd'),
    cocoa: material('#684b3d'), belly: material('#ccb095'),
    bear: material('#eee5d2'), muzzle: material('#f7efdd'),
    ink: material('#171c21', { roughness: .44, bumpScale: .002 }),
    black: material('#171a1e'), blackRib: material('#24272a'),
    blue: material('#6f96b5'), ivory: material('#e9e3d2'),
    claw: material('#e4d1a7', { roughness: .64 }),
    glint: new THREE.MeshBasicMaterial({ color: '#fff5dc' }),
    wood: material('#a46735', { roughness: .58, bumpScale: .002 }),
    woodDark: material('#553220', { roughness: .65, bumpScale: .002 }),
    gold: new THREE.MeshStandardMaterial({ color: '#c8ac71', metalness: .55, roughness: .4 })
  };
  const geometries = new Map();
  const sphereGeometry = (detail = 24) => {
    if (!geometries.has(detail)) geometries.set(detail, new THREE.SphereGeometry(1, detail, Math.max(12, detail / 2)));
    return geometries.get(detail);
  };
  function orb(parent, mat, x, y, z, sx, sy, sz, name, detail = 24) {
    const o = new THREE.Mesh(sphereGeometry(detail), mat);
    o.position.set(x, y, z); o.scale.set(sx, sy, sz);
    o.castShadow = true; o.receiveShadow = true;
    if (name) o.name = name;
    parent.add(o); return o;
  }
  function tube(parent, points, radius, mat, segments = 24, radial = 5) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const o = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, radial, false), mat);
    o.castShadow = true; parent.add(o); return o;
  }
  function box(parent, mat, w, h, d, x, y, z) {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
  }
  function eyes(head, x, y, z, size = .036) {
    const result = [];
    for (const sign of [-1, 1]) {
      const pupil = orb(head, palette.ink, x * sign, y, z, size, size * 1.12, size * .63, 'eye', 20);
      const shine = orb(pupil, palette.glint, -.22, .28, .78, .18, .17, .15, null, 12);
      // The shine is a child of the scaled eye, so its dimensions stay in eye-local units.
      result.push(pupil);
    }
    return result;
  }
  function smile(head, y, z, width, depth) {
    tube(head, [[-width, y + depth, z], [-width * .63, y, z + .005], [0, y + depth * .28, z + .012], [width * .63, y, z + .005], [width, y + depth, z]], .009, palette.cocoa, 20);
  }
  function arm(root, mat, x, y, length, width, type) {
    const pivot = new THREE.Group(); pivot.position.set(x, y, .005); root.add(pivot);
    orb(pivot, mat, 0, -length * .48, 0, width, length * .64, width * .93, 'soft arm');
    const paw = orb(pivot, mat, 0, -length * .94, .022, width * 1.04, width * 1.07, width * .94, 'paw');
    if (type === 'sloth') {
      for (let i = 0; i < 3; i++) {
        const claw = orb(pivot, palette.claw, (i - 1) * .055, -length * 1.12, .093,
          .024, .082, .025, 'claw', 16);
        claw.rotation.x = -.18; claw.rotation.z = (i - 1) * -.10;
      }
    }
    pivot.userData.length = length; pivot.userData.width = width;
    pivot.userData.restPosition = pivot.position.clone();
    return Object.assign(pivot, { paw });
  }
  function makeSloth() {
    const root = new THREE.Group(); root.name = 'BADGER';
    const body = orb(root, palette.taupe, 0, .66, 0, .43, .55, .32, 'body');
    orb(body, palette.belly, 0, -.02, .91, .67, .72, .17, 'belly');
    const feet = [];
    for (const sign of [-1, 1]) {
      const foot = orb(root, palette.taupe, sign * .245, .14, .07, .19, .14, .255, 'foot');
      for (let i = 0; i < 3; i++) {
        const toe = orb(root, palette.claw, sign * .245 + (i - 1) * .058, .105, .29, .025, .033, .067, 'toe', 16);
        foot.attach(toe);
      }
      feet.push(foot);
    }
    const head = new THREE.Group(); head.position.set(0, 1.39, .01); root.add(head);
    orb(head, palette.taupe, 0, 0, 0, .60, .535, .445, 'head');
    // Two blended upper lobes and a lower muzzle make the sloth's heart-shaped mask.
    orb(head, palette.cream, -.215, .045, .315, .29, .36, .15, 'face');
    orb(head, palette.cream, .215, .045, .315, .29, .36, .15, 'face');
    orb(head, palette.cream, 0, -.17, .323, .345, .255, .15, 'chin');
    for (const sign of [-1, 1]) {
      const patch = orb(head, palette.cocoa, sign * .225, -.018, .439, .155, .218, .038, 'eye patch');
      patch.rotation.z = sign * -.42;
    }
    const eyeMeshes = eyes(head, .208, .035, .487, .037);
    orb(head, palette.cocoa, 0, -.127, .481, .078, .051, .042, 'nose');
    tube(head, [[0, -.157, .484], [0, -.193, .486]], .008, palette.cocoa, 8);
    smile(head, -.226, .472, .118, .035);
    for (let i = 0; i < 3; i++) {
      const tuft = orb(head, palette.taupe, -.12 + i * .10, .489 + (i === 1 ? .026 : 0), -.015,
        .075, .125, .073, 'ruffle', 16);
      tuft.rotation.z = -.42 + i * .13;
    }
    const leftArm = arm(root, palette.taupe, -.43, .99, .44, .14, 'sloth');
    const rightArm = arm(root, palette.taupe, .43, .99, .44, .14, 'sloth');
    leftArm.rotation.z = -.18; rightArm.rotation.z = .18;
    return { group: root, head, body, leftArm, rightArm, feet, eyes: eyeMeshes, type: 'sloth' };
  }
  function makeBear() {
    const root = new THREE.Group(); root.name = 'BEAR';
    const body = orb(root, palette.bear, 0, .63, 0, .43, .51, .33, 'body');
    const feet = [];
    for (const sign of [-1, 1]) feet.push(orb(root, palette.bear, sign * .23, .14, .08, .20, .14, .25, 'foot'));
    const head = new THREE.Group(); head.position.set(0, 1.34, .005); root.add(head);
    for (const sign of [-1, 1]) {
      orb(head, palette.bear, sign * .46, .29, -.02, .15, .17, .11, 'ear');
      orb(head, palette.cream, sign * .468, .29, .068, .085, .104, .027, 'inner ear');
    }
    orb(head, palette.bear, 0, 0, 0, .575, .49, .438, 'head');
    orb(head, palette.muzzle, 0, -.17, .374, .235, .17, .11, 'muzzle');
    const eyeMeshes = eyes(head, .228, .055, .443, .036);
    orb(head, palette.ink, 0, -.104, .492, .060, .042, .026, 'nose');
    tube(head, [[0, -.137, .487], [0, -.183, .487]], .007, palette.ink, 8);
    tube(head, [[-.077, -.196, .477], [-.048, -.216, .484], [0, -.185, .49], [.048, -.216, .484], [.077, -.196, .477]], .008, palette.ink, 18);
    // Circular frames, temples, and bridge sit in front of the face, rather than being painted on.
    const glasses = new THREE.Group(); glasses.name = 'round glasses'; head.add(glasses);
    for (const sign of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(.226, .020, 9, 48), palette.ink);
      rim.position.set(sign * .246, .034, .481); rim.castShadow = true; glasses.add(rim);
      tube(glasses, [[sign * .455, .106, .463], [sign * .547, .10, .32], [sign * .56, .062, .12]], .014, palette.ink, 12);
      orb(glasses, palette.gold, sign * .44, .111, .49, .012, .007, .004, null, 12);
    }
    tube(glasses, [[-.027, .075, .482], [0, .099, .493], [.027, .075, .482]], .015, palette.ink, 12);
    // A real knitted cap silhouette; tiny raised meridians read as ribs under grazing light.
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.584, 40, 18, 0, Math.PI * 2, 0, Math.PI / 2), palette.black);
    cap.position.set(0, .215, -.018); cap.scale.set(1, .90, .81); cap.castShadow = true; head.add(cap);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(.528, .070, 12, 56), palette.blackRib);
    cuff.rotation.x = Math.PI / 2; cuff.scale.set(1, .83, .9); cuff.position.set(0, .218, -.02); cuff.castShadow = true; head.add(cuff);
    const knitMaterial = palette.blackRib;
    for (let i = 0; i < 28; i++) {
      const a = i / 28 * Math.PI * 2;
      const points = [];
      for (let j = 0; j <= 12; j++) {
        const theta = .10 + (Math.PI / 2 - .11) * j / 12;
        points.push([Math.sin(theta) * Math.cos(a) * .586, .215 + Math.cos(theta) * .532, -.018 + Math.sin(theta) * Math.sin(a) * .478]);
      }
      tube(head, points, .007, knitMaterial, 16, 4);
    }
    // The familiar blue/white scarf has padded rings, two soft tails, and little fringe ends.
    const scarf = new THREE.Group(); scarf.position.y = 1.015; root.add(scarf);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.335, .075, 10, 36), i === 1 ? palette.blue : palette.ivory);
      ring.rotation.x = Math.PI / 2; ring.position.y = .055 - i * .055;
      ring.scale.z = .82; ring.castShadow = true; scarf.add(ring);
    }
    function scarfTail(x, length, tilt, z) {
      const tail = new THREE.Group(); tail.position.set(x, -.02, z); tail.rotation.z = tilt; scarf.add(tail);
      for (let i = 0; i < 7; i++) {
        orb(tail, i % 2 === 0 ? palette.blue : palette.ivory, 0, -i * length / 7, 0,
          .087, length / 13, .047, 'scarf stripe', 16);
      }
      for (let i = 0; i < 5; i++) {
        const strand = orb(tail, palette.ivory, (i - 2) * .027, -length + .025, 0, .010, .051, .012, 'fringe', 12);
        strand.rotation.z = (i - 2) * .08;
      }
      return tail;
    }
    const leftTail = scarfTail(-.28, .45, -.20, .27);
    const rightTail = scarfTail(.31, .28, .35, .20);
    const guitar = makeGuitar(root);
    const camera = makeCamera(root);
    const leftArm = arm(root, palette.bear, -.43, .98, .36, .145, 'bear');
    const rightArm = arm(root, palette.bear, .43, .98, .36, .145, 'bear');
    leftArm.rotation.set(-.35, 0, -.22); rightArm.rotation.set(-.65, 0, .30);
    return { group: root, head, body, leftArm, rightArm, feet, eyes: eyeMeshes, scarf, leftTail, rightTail, guitar, camera, snowPalm: rightArm.paw, type: 'bear' };
  }
  function makeCamera(root) {
    const camera = new THREE.Group(); camera.name = 'bear handheld camera';
    camera.position.set(-.015, .84, .49); camera.visible = false; root.add(camera);
    const leather = material('#333936', { roughness: .73, bumpScale: .005 });
    const trim = material('#b6b0a1', { roughness: .47, metalness: .40, bumpScale: .001 });
    box(camera, leather, .315, .182, .13, 0, 0, 0);
    box(camera, trim, .319, .035, .132, 0, .073, .001);
    box(camera, palette.ink, .095, .055, .08, -.071, .107, -.004);
    box(camera, palette.gold, .034, .016, .034, .108, .105, .002);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(.065, .073, .056, 28), palette.ink);
    lens.rotation.x = Math.PI / 2; lens.position.set(.012, -.009, .091); lens.castShadow = true; camera.add(lens);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.059, .006, 6, 28), palette.gold);
    rim.position.set(.012, -.009, .121); camera.add(rim);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(.052, 28), new THREE.MeshStandardMaterial({ color: '#173d4c', metalness: .6, roughness: .14 }));
    glass.position.set(.012, -.009, .123); camera.add(glass);
    orb(camera, palette.glint, -.005, .007, .125, .013, .007, .002, 'lens reflection', 12);
    box(camera, palette.glint, .045, .025, .004, -.109, .029, .068);
    tube(camera, [[-.157, .025, 0], [-.193, -.04, -.015], [-.16, -.15, -.035], [-.065, -.22, -.045]], .006, palette.woodDark, 16);
    return camera;
  }
  function makeGuitar(root) {
    const guitar = new THREE.Group(); guitar.name = 'little vintage guitar';
    guitar.position.set(.025, .69, .438); guitar.rotation.z = -.54; root.add(guitar);
    const shape = new THREE.Shape();
    shape.moveTo(0, -.32);
    shape.bezierCurveTo(.22, -.33, .31, -.17, .26, -.02);
    shape.bezierCurveTo(.20, .08, .125, .04, .16, .16);
    shape.bezierCurveTo(.20, .31, .10, .34, 0, .30);
    shape.bezierCurveTo(-.10, .34, -.20, .31, -.16, .16);
    shape.bezierCurveTo(-.125, .04, -.20, .08, -.26, -.02);
    shape.bezierCurveTo(-.31, -.17, -.22, -.33, 0, -.32);
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .084, bevelEnabled: true, bevelSize: .019, bevelThickness: .012, bevelSegments: 2, steps: 1, curveSegments: 16 }), palette.wood);
    body.castShadow = true; body.receiveShadow = true; guitar.add(body);
    const linePoints = shape.getSpacedPoints(90).map(p => [p.x, p.y, .10]);
    tube(guitar, linePoints, .008, palette.gold, 90, 4);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(.078, 32), palette.ink); hole.position.set(0, .075, .107); guitar.add(hole);
    const rosette = new THREE.Mesh(new THREE.TorusGeometry(.086, .005, 5, 40), palette.ivory); rosette.position.set(0, .075, .110); guitar.add(rosette);
    box(guitar, palette.woodDark, .076, .54, .05, 0, .54, .047);
    box(guitar, palette.woodDark, .105, .16, .052, 0, .875, .047);
    for (let i = 0; i < 9; i++) box(guitar, palette.gold, .078, .003, .006, 0, .305 + i * .054, .077);
    box(guitar, palette.woodDark, .15, .038, .018, 0, -.17, .112);
    box(guitar, palette.ivory, .12, .007, .008, 0, -.16, .125);
    for (let i = 0; i < 6; i++) {
      const stringX = (i - 2.5) * .010;
      tube(guitar, [[stringX, -.16, .133], [stringX, .90, .093]], .0015, palette.gold, 2, 3);
      const side = i % 2 === 0 ? -1 : 1;
      orb(guitar, palette.gold, side * .075, .83 + Math.floor(i / 2) * .046, .049, .022, .013, .015, 'tuner', 12);
    }
    return guitar;
  }
  const badger = makeSloth(), bear = makeBear();
  group.add(badger.group, bear.group);
  badger.group.position.x = -.68; bear.group.position.x = .68;
  const taps = { badger: { value: undefined, start: -10 }, bear: { value: undefined, start: -10 } };
  const ease = (x) => x * x * (3 - 2 * x);
  const clamp01 = x => Math.min(1, Math.max(0, x));
  const meet = new THREE.Vector3(0, .96, .20);
  const _target = new THREE.Vector3(), _direction = new THREE.Vector3();
  const _restPaw = new THREE.Vector3(), _aim = new THREE.Quaternion(), _baseAim = new THREE.Quaternion();
  // A single-axis plush arm aims its actual paw center at a world-space wrist target.
  // The centers sit either side of the meeting point so their soft surfaces touch.
  function aimInnerPaw(c, weight) {
    if (weight <= 0) return;
    const arm = c.type === 'sloth' ? c.rightArm : c.leftArm;
    const side = c.type === 'sloth' ? -1 : 1;
    arm.position.z += ((c.type === 'sloth' ? -.10 : .065) - arm.position.z) * weight;
    c.group.updateWorldMatrix(true, false);
    const len = arm.userData.length * .94, baseScale = arm.scale.y;
    _baseAim.copy(arm.quaternion);
    let surfaceOffset = .148;
    // Refine the hand-center offset from its transformed ellipsoid radius. The
    // palm surfaces meet at x=0 without intersecting, even when their roots turn.
    for (let pass = 0; pass < 3; pass++) {
      _target.copy(meet); _target.x += side * surfaceOffset;
      c.group.worldToLocal(_target);
      _direction.copy(_target).sub(arm.position);
      const lengthScale = Math.max(.75, Math.min(1.25, Math.sqrt(Math.max(0, _direction.lengthSq() - .022 * .022)) / len));
      arm.scale.y = baseScale + (lengthScale - baseScale) * weight;
      _restPaw.set(0, -len * arm.scale.y, .022).normalize();
      _direction.normalize();
      _aim.setFromUnitVectors(_restPaw, _direction);
      arm.quaternion.copy(_baseAim).slerp(_aim, weight);
      arm.updateWorldMatrix(true, true);
      const m = arm.paw.matrixWorld.elements;
      surfaceOffset = Math.sqrt(m[0] * m[0] + m[4] * m[4] + m[8] * m[8]) + .0005;
    }
  }
  const punchPoint = new THREE.Vector3(-.37, 1.04, 1.823);
  const _punchCenter = new THREE.Vector3(), _punchSupport = new THREE.Vector3();
  const _punchBase = new THREE.Quaternion(), _punchAim = new THREE.Quaternion();
  function aimPunch(c, strike) {
    if (strike <= 0) return;
    const arm = c.rightArm, len = arm.userData.length * .94;
    _punchBase.copy(arm.quaternion);
    arm.position.z += strike * .11;
    c.group.updateWorldMatrix(true, false);
    _punchCenter.copy(punchPoint); _punchCenter.z -= .15;
    // Solve the +Z support point of the real ellipsoid, not its center or a
    // disconnected hand proxy. The final palm surface lands on the coded pane.
    let lengthScale = 1;
    for (let pass = 0; pass < 5; pass++) {
      _target.copy(_punchCenter); c.group.worldToLocal(_target);
      _direction.copy(_target).sub(arm.position);
      lengthScale = Math.max(.9, Math.min(1.25, Math.sqrt(Math.max(0, _direction.lengthSq() - .022 * .022)) / len));
      arm.scale.y = lengthScale;
      _restPaw.set(0, -len * lengthScale, .022).normalize();
      _direction.normalize();
      arm.quaternion.setFromUnitVectors(_restPaw, _direction);
      arm.updateWorldMatrix(true, true);
      const m = arm.paw.matrixWorld.elements;
      const radius = Math.hypot(m[2], m[6], m[10]);
      _punchSupport.set((m[0] * m[2] + m[4] * m[6] + m[8] * m[10]) / radius,
        (m[1] * m[2] + m[5] * m[6] + m[9] * m[10]) / radius, radius);
      _punchCenter.copy(punchPoint).sub(_punchSupport);
    }
    _punchAim.copy(arm.quaternion);
    arm.quaternion.copy(_punchBase).slerp(_punchAim, strike);
    arm.scale.y = 1 + (lengthScale - 1) * strike;
  }
  function update(t, story = {}, interaction = {}) {
    const phase = story.phase || 'street', local = story.local || 0;
    const reduced = interaction.reduced === true;
    const stillForPhoto = (phase === 'snow' && local >= 13) || (phase === 'final' && local < 3);
    const idleFrozen = reduced || stillForPhoto;
    const idleTime = idleFrozen ? 0 : t;
    const aimX = Math.max(-1, Math.min(1, interaction.x || 0));
    const aimY = Math.max(-1, Math.min(1, interaction.y || 0));
    for (const [name, c] of [['badger', badger], ['bear', bear]]) {
      const tap = interaction[name + 'Tap'];
      if (tap !== undefined && tap !== taps[name].value) { taps[name].value = tap; taps[name].start = Number.isFinite(tap) && tap >= 0 ? t : -10; }
      const reactionAge = t - taps[name].start;
      const reaction = reactionAge >= 0 && reactionAge < 1.6 ? (reduced ? .55 : Math.sin(reactionAge / 1.6 * Math.PI)) : 0;
      const offset = c.type === 'bear' ? 1.3 : 0;
      const breath = idleFrozen ? 0 : Math.sin(idleTime * 1.8 + offset) * .009;
      c.body.position.y = (c.type === 'bear' ? .63 : .66) + breath;
      c.head.position.y = (c.type === 'bear' ? 1.34 : 1.39) + breath + reaction * .035;
      const inward = c.type === 'bear' ? -.10 : .10;
      c.head.rotation.set(-aimY * .055 + (idleFrozen ? 0 : Math.sin(idleTime * .65 + offset) * .018) - reaction * .10,
        aimX * .13 + inward, (idleFrozen ? 0 : Math.sin(idleTime * .7 + offset) * .022) + reaction * (c.type === 'bear' ? -.11 : .12));
      c.leftArm.position.copy(c.leftArm.userData.restPosition);
      c.rightArm.position.copy(c.rightArm.userData.restPosition);
      c.leftArm.scale.y = c.rightArm.scale.y = 1;
      c.leftArm.rotation.set(c.type === 'bear' ? -.35 : -.02, 0, -.18 + (idleFrozen ? 0 : Math.sin(idleTime * 1.3 + offset) * .025));
      c.rightArm.rotation.set(c.type === 'bear' ? -.65 : -.02, 0, .18 + (idleFrozen ? 0 : Math.sin(idleTime * 1.2 + offset) * .025));
      const blink = !stillForPhoto && ((!reduced && Math.sin(idleTime * .61 + offset) > .997) || (reactionAge > .15 && reactionAge < .28));
      for (const eye of c.eyes) eye.scale.y = .036 * 1.12 * (blink ? .14 : 1);
      if (c.type === 'bear') {
        c.rightArm.rotation.z += idleFrozen ? 0 : Math.sin(idleTime * 5.2) * .033;
        c.guitar.position.set(.025, .69, .438);
        c.guitar.rotation.set(0, 0, -.54 + (idleFrozen ? 0 : Math.sin(idleTime * 1.8) * .009));
        c.camera.visible = false;
        c.leftTail.rotation.z = -.20 + (idleFrozen ? 0 : Math.sin(idleTime * 1.2) * .018);
        c.rightTail.rotation.z = .35 + (idleFrozen ? 0 : Math.sin(idleTime * 1.3 + 1) * .022);
      }
      // Translation-driven walking: planted feet alternate while the shoulders counter-swing.
      const walk = c.group.userData.walk;
      if (walk && !reduced) {
        const walking = Math.min(1, Math.abs(walk.speed || 0) / .6);
        const stride = Math.sin(walk.phase || 0) * walking;
        c.feet.forEach((foot, i) => {
          const step = stride * (i ? -1 : 1);
          foot.rotation.x = step * .24;
          foot.position.y = .14 + Math.max(0, step) * .055;
          foot.position.z = (c.type === 'bear' ? .08 : .07) + step * .035;
        });
        c.leftArm.rotation.x += stride * .18;
        c.rightArm.rotation.x -= stride * .18;
      } else {
        c.feet.forEach(foot => {foot.rotation.x = 0; foot.position.y = .14; foot.position.z = c.type === 'bear' ? .08 : .07;});
      }
      if (phase === 'intro' && c.type === 'sloth') {
        // First brace against the coded wall, wind up, then strike through it at ~4.7s.
        const brace = ease(clamp01((local - 3.2) / .6));
        const strikeAge = local - 4.65;
        const manualStrike=interaction.pulse?.kind==='break'&&interaction.pulse.at>=0;
        const autoStrike = !manualStrike && strikeAge >= 0 && strikeAge < .85 ? Math.sin(clamp01(strikeAge / .85) * Math.PI) : 0;
        const tapStrike = reactionAge >= 0 && reactionAge < .75 ? Math.sin(reactionAge / .75 * Math.PI) : 0;
        const strike = Math.max(autoStrike, tapStrike);
        c.leftArm.rotation.set(-.75 * brace, 0, -.18 - brace * .45);
        c.rightArm.rotation.set(-.65 - strike * .95, -.2 * strike, .65 + brace * .35 - strike * .38);
        if (!reduced) aimPunch(c, strike);
        c.head.rotation.x = -.03 - strike * .12;
        c.head.rotation.z = -.08 + strike * .14;
        c.body.rotation.x = strike * -.065;
        c.body.position.z = strike * .025;
        if (reduced) {c.leftArm.rotation.set(-.55, 0, -.38);c.rightArm.rotation.set(-.85, 0, .55);}
      } else {
        c.body.rotation.x = 0; c.body.position.z = 0;
      }
      if (phase === 'street') {
        // A four-bar exchange: bear plucks; BADGER reacts a little late; they look at each other.
        if (local >= 6 && local < 11) {
          const play = Math.sin((local - 6) * Math.PI * 3);
          if (c.type === 'bear') {
            c.rightArm.rotation.x = -.82;
            c.rightArm.rotation.z = .38 + (reduced ? 0 : play * .09);
            c.head.rotation.x = -.08;
          } else if (local > 6.65) {
            c.head.rotation.x = reduced ? -.09 : Math.sin((local - 6.65) * Math.PI * 1.5) * .085;
            c.feet[1].rotation.x = reduced ? 0 : Math.sin((local - 6.65) * Math.PI * 1.5) * .15;
          }
        }
        if (local >= 12 && local < 17) {
          const glance = Math.sin(clamp01((local - 12) / 5) * Math.PI);
          c.head.rotation.y = inward + glance * (c.type === 'bear' ? -.27 : .27);
          c.head.rotation.z = glance * (c.type === 'bear' ? .055 : -.055);
        }
      }
      if (phase === 'photo') {
        c.head.rotation.y += c.type === 'bear' ? -.18 : .12;
        if (c.type === 'sloth') {
          c.rightArm.rotation.z = .85 + (reduced ? 0 : Math.sin(local * 3.3) * .16);
          c.head.rotation.z += reduced ? 0 : Math.sin(local * 2) * .10;
        } else {
          // The bear actually raises a camera to its eye, takes the picture, then lowers it.
          const rise = ease(Math.min(1, Math.max(0, (local - 3) / 1.8)));
          const lower = 1 - ease(Math.min(1, Math.max(0, (local - 11.5) / 2)));
          const held = rise * lower;
          c.camera.visible = local > 3 && local < 13.5;
          c.camera.position.set(-.015, .84 + held * .40, .49 + held * .10);
          c.camera.rotation.x = -.12 * (1 - held);
          c.camera.rotation.z = -.04 * (1 - held);
          c.guitar.position.set(.025 + held * .23, .69 - held * .05, .438 - held * .16);
          c.guitar.rotation.y = held * -.48;
          c.guitar.rotation.z = -.54 - held * .20;
          c.leftArm.position.z = c.rightArm.position.z = .005 + held * .14;
          c.leftArm.scale.y = c.rightArm.scale.y = 1 + held * .20;
          c.leftArm.rotation.set(-.35 + held * 1.35, 0, -.18 + held * 2.68);
          c.rightArm.rotation.set(-.65 + held * 1.65, 0, .18 - held * 2.68);
          c.head.rotation.x = -.06 + held * .04;
          c.head.rotation.y = aimX * .04;
          if (local > 9.85 && local < 10.18) {
            // A tiny shutter finger/whole-camera squeeze, synchronized to the story's shutter.
            c.rightArm.rotation.z += Math.sin((local - 9.85) / .33 * Math.PI) * .045;
          }
        }
      }
      const reaching = phase === 'fracture' ? ease(clamp01((local - (c.type === 'bear' ? 9.65 : 9)) / (c.type === 'bear' ? 6.35 : 7))) : 1;
      if (phase === 'fracture' || phase === 'bloom') {
        if (c.type === 'sloth') {
          c.rightArm.rotation.set(-.10, 0, .18 + reaching * 1.17);
          // BADGER first checks that the bear is there, then offers its hand.
          const recognize = phase === 'bloom' ? .4 : ease(clamp01((local - 7) / 2));
          c.head.rotation.y = .07 + recognize * .26;
          c.head.rotation.z = .025 + reaching * .065;
        } else {
          c.leftArm.rotation.set(-.10, 0, -.18 - reaching * 1.17);
          // A small hesitant beat before accepting the offered hand.
          const reply = phase === 'bloom' ? .5 : ease(clamp01((local - 9.65) / 1.5));
          c.head.rotation.y = -.07 - reply * .20;
          c.head.rotation.x = phase === 'fracture' && local >= 8.6 && local < 9.65 ? .075 : -.015 * reply;
          c.head.rotation.z = -.025 - reaching * .065;
        }
      }
      if (phase === 'snow' || phase === 'final') {
        c.head.rotation.y = phase === 'final' ? aimX * .04 : inward * 1.15;
        c.head.rotation.z = c.type === 'bear' ? .055 : -.055;
        if (c.type === 'sloth') c.rightArm.rotation.set(-.10, 0, .76);
        else c.leftArm.rotation.set(-.22, 0, -.32);
        if (phase === 'snow') {
          // The free palm catches one snowflake. The world reads this real paw's transform.
          const lift = reduced ? (local >= 3 && local < 8 ? 1 : 0) :
            ease(clamp01((local - 3) / 2)) * (1 - ease(clamp01((local - 8) / 3)));
          if (c.type === 'bear') c.rightArm.rotation.set(-.65 - lift * .30, -lift * .30, .18 + lift * .97);
          const lookPalm = reduced ? (local >= 4 && local < 8 ? 1 : 0) :
            ease(clamp01(local - 4)) * (1 - ease(clamp01(local - 7)));
          const lookFriend = reduced ? (local >= 8 && local < 11 ? 1 : 0) :
            Math.sin(clamp01((local - 8) / 3) * Math.PI);
          c.head.rotation.x = lookPalm * (c.type === 'bear' ? .22 : .17);
          c.head.rotation.y = inward * 1.15 + lookPalm * (c.type === 'bear' ? .65 : .38) +
            lookFriend * (c.type === 'bear' ? -.28 : .28);
          // Settle from the shared glance into a calm camera-facing portrait.
          const settle = ease(clamp01((local - 11) / 2));
          c.head.rotation.x *= 1 - settle;
          c.head.rotation.y += (-c.group.rotation.y - c.head.rotation.y) * settle;
          c.head.rotation.z *= 1 - settle * .45;
        }
        if (stillForPhoto) {
          c.head.position.y = c.type === 'bear' ? 1.34 : 1.39;
          c.head.rotation.set(0, -c.group.rotation.y, c.type === 'bear' ? .03 : -.03);
          c.body.position.y = c.type === 'bear' ? .63 : .66;
        }
      }
      if (reaction > 0 && !stillForPhoto) {
        const arm = c.type === 'sloth' ? c.leftArm : c.rightArm;
        arm.rotation.z += (c.type === 'sloth' ? -1 : 1) * (reduced ? .25 : reaction * .55);
      }
      const contactWeight = phase === 'fracture' ? reaching :
        ['bloom', 'snow', 'final'].includes(phase) ? 1 : 0;
      // Applied after tap/walk gestures: the held hand stays held while the free hand reacts.
      aimInnerPaw(c, contactWeight);
    }
  }
  return { group, badger, bear, update };
}

function makeTextile(THREE) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#858585'; ctx.fillRect(0, 0, 128, 128);
  let seed = 92431;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 2500; i++) {
    const v = 70 + Math.floor(random() * 120), x = random() * 128, y = random() * 128;
    ctx.strokeStyle = `rgba(${v},${v},${v},.42)`;
    ctx.lineWidth = .45 + random() * .6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + random() * 3 - 1.5, y + random() * 4); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}
