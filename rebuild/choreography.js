// Song-scale blocking and held camera phrases, sampled by the director clock.
// The existing photo, palm contact, snow, and final portrait clips remain intact.
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const timeOf = story => Number.isFinite(story?.chapterLocal) ? Math.max(0, story.chapterLocal) : 0;
const mobileFor = aspect => Number.isFinite(aspect) && aspect < .9;
const pose = (bx, rx, bz = 0, rz = -.06, br = .18, rr = -.22) => ({ bx, rx, bz, rz, by: 0, ry: 0, br, rr });
const view = (pos, look = [0, 1.05, 0], fov = 40) => ({ pos, look, fov });

function mix(a, b, amount) {
  if (Array.isArray(a)) return a.map((value, index) => lerp(value, b[index], amount));
  if (a && typeof a === 'object') return Object.fromEntries(Object.keys(a).map(key => [key, mix(a[key], b[key], amount)]));
  return lerp(a, b, amount);
}
function sample(time, keys) {
  if (time <= keys[0][0]) return mix(keys[0][1], keys[0][1], 0);
  for (let index = 1; index < keys.length; index++) {
    const [end, value] = keys[index], [start, previous] = keys[index - 1];
    if (time <= end) return mix(previous, value, ease((time - start) / (end - start)));
  }
  return mix(keys.at(-1)[1], keys.at(-1)[1], 0);
}

export function chapterBlocking(story = {}, aspect = 1.6) {
  const t = timeOf(story), mobile = mobileFor(aspect);
  switch (story.chapter) {
    case 'encounter': return sample(t, [
      [0, pose(-.85, mobile ? 1.10 : 1.8, 1.12, -.06, -.10, 0)],
      [1.8, pose(-.85, mobile ? 1.10 : 1.8, 1.12, -.06, 2.94, -Math.PI / 2)],
      [9, pose(-.90, 1.05, .10, -.06, 2.94, -Math.PI / 2)],
      [12, pose(-.90, 1.05, .10, -.06, .20, -.50)],
      [21, pose(-.90, 1.05, .10, -.06, .25, -.50)],
      [31, pose(-.85, .98, .02, -.06, .23, -.32)],
      [39, pose(-.78, .83, 0, 0, .18, -.24)],
      [49.87, pose(-.66, .66, 0, 0, .18, -.22)],
    ]);
    case 'together': return sample(t, [
      [0, pose(-.66, .66, 0, 0)],
      [8, pose(-.78, .54, .62, .62, -.19, -.19)],
      [13, pose(-.78, .54, .62, .62, .18, -.22)],
      [17, pose(-.78, .54, .62, .62, 2.94, 2.94)],
      [26, pose(-.66, .66, 0, 0, 2.94, 2.94)],
      [31, pose(-.66, .66, 0, 0)],
      [37.15, pose(-.66, .66, 0, 0)],
    ]);
    case 'keepworld': return sample(t, [
      [0, pose(3.10, 1.20, -1.60, -.35, .45, 1.80)],
      [1.5, pose(3.10, 1.20, -1.60, -.35, -Math.PI / 2, .40)],
      [8, pose(-.66, .66, -1.60, -.06, -Math.PI / 2, -.22)],
      [9.5, pose(-.66, .66, -1.60, -.06, 0, -.22)],
      [12.5, pose(-.66, .66, 0, -.06)],
      [33.15, pose(-.66, .66, 0, -.06)],
    ]);
    case 'fracture': {
      const spread = mobile ? .93 : 1.34, amount = ease(t / 5);
      return pose(lerp(-.66, -spread, amount), lerp(.66, spread, amount), 0, -.06,
        lerp(.18, .25, amount), lerp(-.22, -.25, amount));
    }
    case 'reach': {
      const spread = mobile ? .93 : 1.34;
      // Use the same local reach envelope as the tested inner-paw solver.
      const reaching = ease(((Number.isFinite(story.local) ? story.local : 9) - 9) / 7);
      return pose(lerp(-spread, -.64, reaching), lerp(spread, .64, reaching), 0, -.06,
        .25 + reaching * .20, -.25 - reaching * .20);
    }
    case 'reunion': {
      const amount = ease(t / 4);
      return pose(lerp(-.64, -.62, amount), lerp(.64, .62, amount), 0, -.06,
        lerp(.45, .18, amount), lerp(-.45, -.18, amount));
    }
    case 'orchestralWorld': return pose(-.62, .62, 0, -.06, .18, -.18);
    default: return null;
  }
}

export function chapterCamera(story = {}, aspect = 1.6) {
  const t = timeOf(story), mobile = mobileFor(aspect);
  const square = !mobile && aspect < 1.25;
  const snowDistance = mobile ? 10.2 : 6.2;
  const home = view([.3, 1.85, mobile ? 9.2 : 6.8]);
  switch (story.chapter) {
    case 'code': case 'intro':
      // After the strike, quietly make room for the bear before it becomes visible.
      if (t < 8) return null;
      return view([mobile ? .3 : 1.6, 2.4, mobile ? lerp(10.4, 11.8, ease((t - 8) / 6.82)) : square ? lerp(6.8, 7.6, ease((t - 8) / 6.82)) : 6.8]);
    case 'encounter': return sample(t, [
      [0, view([mobile ? .3 : 1.6, 2.4, mobile ? 11.8 : square ? 7.6 : 6.8])],
      [10, view([mobile ? .4 : 1.1, 2.3, mobile ? 11.8 : square ? 7.8 : 7.2], [.05, 1.1, .2])],
      [12, view([mobile ? .4 : 1.1, 2.3, mobile ? 11.8 : square ? 7.8 : 7.2], [.05, 1.1, .2])],
      [18, view([mobile ? .5 : .8, 2.05, mobile ? 11.4 : 6.9], [.05, 1.1, .1])],
      [25, view([mobile ? .5 : .8, 2.05, mobile ? 11.4 : 6.9], [.05, 1.1, .1])],
      [32, view([mobile ? .2 : -.8, 1.9, mobile ? 11.1 : 6.8], [.1, 1.0, .1])],
      [37, view([mobile ? .2 : -.8, 1.9, mobile ? 11.1 : 6.8], [.1, 1.0, .1])],
      [49.87, home],
    ]);
    case 'together': return sample(t, [
      [0, home],
      [7, view([mobile ? .3 : 1.5, 2.2, mobile ? 10.4 : 7.1], [-.1, 1.05, .3])],
      [12, view([mobile ? .3 : 1.5, 2.2, mobile ? 10.4 : 7.1], [-.1, 1.05, .3])],
      [15, view([mobile ? -.3 : -1.3, 2.05, mobile ? 10.1 : 6.9], [-.1, 1.0, .5])],
      [19, view([mobile ? -.3 : -1.3, 2.05, mobile ? 10.1 : 6.9], [-.1, 1.0, .5])],
      [26, view([mobile ? .2 : 1.0, 2.3, mobile ? 10.3 : 7.6], [0, 1.0, .2])],
      [31, home],
      [37.15, home],
    ]);
    case 'photography':
      if (square) {
        const amount = ease((Number.isFinite(story.local) ? story.local : 0) / 4);
        return view([lerp(.3, 6.4, amount), lerp(1.85, 2.8, amount), lerp(6.8, 4.4, amount)],
          [lerp(0, 2.2, amount), lerp(1.05, 1.2, amount), lerp(0, -1.35, amount)]);
      }
      if (!mobile || t < 21) return null;
      return view([9.8, 3, lerp(7.2, 8.5, ease((t - 21) / 3.26))], [2.2, 1.2, -1.35], 44);
    case 'keepworld': return sample(t, [
      [0, view([mobile ? 9.8 : square ? 6.4 : 5.6, mobile ? 3 : square ? 2.8 : 2.65, mobile ? 8.5 : square ? 4.4 : 3], [2.2, 1.2, -1.35], mobile ? 44 : 40)],
      [8, view([mobile ? 2.4 : 2, 2.8, mobile ? 11.4 : 8.2], [.4, 1.1, -.6], 42)],
      [14, view([mobile ? .5 : .8, 2.0, mobile ? 10.5 : 7.0])],
      [20, view([mobile ? .5 : .8, 2.0, mobile ? 10.5 : 7.0])],
      [25, view([mobile ? -.3 : -1.2, 2.25, mobile ? 10.5 : 7.2], [0, 1.1, 0])],
      [29, view([mobile ? -.3 : -1.2, 2.25, mobile ? 10.5 : 7.2], [0, 1.1, 0])],
      [33.15, view([.1, 1.8, mobile ? 11.5 : 7.8])],
    ]);
    case 'fracture': return sample(t, [
      [0, view([.1, 1.8, mobile ? 11.5 : 7.8])],
      [6, view([mobile ? .1 : .4, 2.7, mobile ? 12 : 9], [0, 1.0, 0])],
      [10, view([mobile ? .1 : .4, 2.7, mobile ? 12 : 9], [0, 1.0, 0])],
      [17, view([.1, 1.7, mobile ? 11 : 7.5])],
    ]);
    case 'reach': return sample(t, [
      [0, view([.1, 1.7, mobile ? 11 : 7.5])],
      [4, view([.1, 1.7, mobile ? 11 : 7.5])],
      [10, view([0, mobile ? 1.75 : 1.6, mobile ? 10.6 : 7.2], [0, 1.03, .1])],
      [15.5, view([0, mobile ? 1.72 : 1.6, mobile ? 10.3 : 6.8], [0, 1.03, .1])],
      [18.53, view([0, mobile ? 1.72 : 1.6, mobile ? 10.3 : 6.8], [0, 1.03, .1])],
    ]);
    case 'reunion': return sample(t, [
      [0, view([0, mobile ? 1.72 : 1.6, mobile ? 10.3 : 6.8], [0, 1.03, .1])],
      [3, view([0, mobile ? 1.72 : 1.6, mobile ? 10.3 : 6.8], [0, 1.03, .1])],
      [8, view([0, mobile ? 1.72 : 1.55, mobile ? 9.7 : 6.2], [0, 1.02, .1])],
      [13, view([0, mobile ? 1.72 : 1.55, mobile ? 9.7 : 6.2], [0, 1.02, .1])],
      [20, view([mobile ? -.4 : -.6, mobile ? 2.05 : 1.9, mobile ? 10.2 : 6.6])],
      [32.65, view([mobile ? -.3 : -.4, 2.05, mobile ? 10.1 : 6.6])],
    ]);
    case 'orchestralWorld': return sample(t, [
      [0, view([mobile ? -.3 : -.4, 2.05, mobile ? 10.1 : 6.6])],
      [6.71, view([mobile ? -.3 : -.4, 2.05, mobile ? 10.1 : 6.6])],
      [12, view([mobile ? 1 : 2.8, mobile ? 3.4 : 3, mobile ? 13.5 : 9.8], [.8, 1.1, -1.2])],
      [20, view([mobile ? 1 : 2.8, mobile ? 3.4 : 3, mobile ? 13.5 : 9.8], [.8, 1.1, -1.2])],
      [38, view([mobile ? .3 : -4, mobile ? 5.3 : 5.2, mobile ? 18 : 12], [0, 1.4, -1.3], 41)],
      [47, view([mobile ? .3 : -4, mobile ? 5.3 : 5.2, mobile ? 18 : 12], [0, 1.4, -1.3], 41)],
      [70, view([mobile ? .6 : 3.3, mobile ? 5.8 : 5.7, mobile ? 19 : 12.4], [0, 1.8, -1.2], 42)],
      [79, view([mobile ? .6 : 3.3, mobile ? 5.8 : 5.7, mobile ? 19 : 12.4], [0, 1.8, -1.2], 42)],
      [98, view([mobile ? -.4 : -1.3, mobile ? 2.1 : 2.2, mobile ? 10.4 : 7.3])],
      [105, view([mobile ? -.4 : -1.3, mobile ? 2.1 : 2.2, mobile ? 10.4 : 7.3])],
      [117.57, view([-.4, 2, snowDistance], [0, 1.2, 0])],
    ]);
    case 'snow':
      if (!mobile) return null;
      return view([lerp(-.4, 0, ease(Number.isFinite(story.progress) ? story.progress : t / 15)), 2, snowDistance], [0, 1.2, 0]);
    default: return null;
  }
}

const bell = (time, start, end) => time > start && time < end ? Math.sin((time - start) / (end - start) * Math.PI) : 0;
export function applyChapterPerformance(cast, story = {}, { reduced = false } = {}) {
  if (!cast?.badger || !cast?.bear) return;
  const t = timeOf(story), badger = cast.badger, bear = cast.bear;
  const strength = reduced ? .28 : 1;
  const beat = (start, end) => bell(t, start, end) * strength;
  const freePaw = (character, amount, pitch, outward) => {
    const arm = character === badger ? character.leftArm : character.rightArm;
    if (!arm) return;
    arm.rotation.x += amount * pitch;
    arm.rotation.z += amount * outward;
  };
  switch (story.chapter) {
    case 'encounter': {
      const tuning = beat(12, 21), response = beat(17.5, 24), leaf = beat(24, 31), room = beat(33, 42);
      bear.head.rotation.x += tuning * .19 + leaf * .13;
      bear.head.rotation.y -= response * .16 + room * .13;
      badger.head.rotation.z += response * .15;
      badger.head.rotation.x += leaf * .16;
      badger.head.rotation.y += room * .15;
      freePaw(bear, tuning, -.20, .11);
      freePaw(badger, leaf, -.32, -.18);
      freePaw(bear, room, -.10, .24);
      if (bear.guitar) bear.guitar.rotation.z += tuning * .025 * (reduced ? 1 : Math.sin((t - 12) * 3.2));
      break;
    }
    case 'together': {
      const glance = beat(7, 13), leaf = beat(13, 18), reply = beat(28, 34);
      badger.head.rotation.y += glance * .22 + reply * .12;
      bear.head.rotation.y -= glance * .20 + reply * .19;
      badger.head.rotation.x += leaf * .14;
      bear.head.rotation.x += leaf * .12;
      freePaw(badger, glance, -.10, -.15);
      freePaw(bear, reply, -.12, .17);
      break;
    }
    case 'keepworld': {
      const checkPhoto = beat(14, 20), notice = beat(24, 32);
      bear.head.rotation.x += checkPhoto * .17 - notice * .10;
      badger.head.rotation.x -= notice * .15;
      badger.head.rotation.y -= notice * .18;
      freePaw(bear, checkPhoto, -.23, .12);
      break;
    }
    case 'orchestralWorld': {
      const followLight = beat(9, 35), openWorld = beat(38, 82), returnGlance = beat(91, 108);
      badger.head.rotation.x -= followLight * .09 + openWorld * .16;
      bear.head.rotation.x -= followLight * .07 + openWorld * .13;
      badger.head.rotation.y += returnGlance * .19;
      bear.head.rotation.y -= returnGlance * .17;
      freePaw(bear, followLight, -.14, .18);
      freePaw(badger, openWorld, -.10, -.19);
      break;
    }
  }
}

export const CHOREOGRAPHY_NOTES = Object.freeze({
  encounter: 'Approach, guitar response, shared leaf, making room.',
  together: 'A short walk with two pauses and a natural return to the photo position.',
  keepworld: 'Return behind the bear, protect the photograph, notice the failing world.',
  orchestralWorld: 'Held light, solid world opening, and the return to the original streetlamp.',
});
