import { createTimeline } from '../rebuild/song-timeline.js';

// A painted stage. This renderer has no scene geometry, WebGL or 3D lighting.
// Artwork owns the characters; the canvas adds only restrained 2D movement.
const timeline = createTimeline();
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = value => { const p = clamp(value); return p * p * (3 - 2 * p); };
const mix = (a, b, p) => a + (b - a) * p;
const fract = value => value - Math.floor(value);
const seed = index => fract(Math.sin(index * 127.1 + 311.7) * 43758.5453123);
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;

const ALIASES = { intro: 'code', street: 'encounter', photo: 'photography', bloom: 'orchestralWorld', final: 'birthday' };
const SCENES = {
  code: ['street', '#273d43'], encounter: ['street', '#233b43'], together: ['together', '#273e42'],
  photography: ['window', '#edd9b3'], keepworld: ['street', '#2c4146'], fracture: ['fracture', '#344550'],
  reach: ['reach', '#384752'], reunion: ['reunion', '#535158'], orchestralWorld: ['bloom', '#e2d2b4'],
  snow: ['snow', '#afc5cb'], portrait: ['portrait', '#adc1c7'], birthday: ['portrait', '#adc1c7'],
  quietExplore: ['portrait', '#adc1c7'],
};
const FALLBACKS = {
  together: ['street'], fracture: ['street'], reach: ['fracture', 'street'],
  reunion: ['reach', 'fracture', 'street'], bloom: ['reunion', 'street'],
  snow: ['portrait', 'street'], portrait: ['snow', 'bloom', 'street'], window: ['street'],
};

/** Image fit in CSS pixels. Optional `safe` is a normalized subject rectangle. */
export function fitArtwork(imageWidth, imageHeight, width, height, {
  focus = { x: .5, y: .56 }, zoom = 1, safe = null,
} = {}) {
  const iw = Math.max(1, finite(imageWidth, 1)), ih = Math.max(1, finite(imageHeight, 1));
  const w = Math.max(1, finite(width, 1)), h = Math.max(1, finite(height, 1));
  let scale = Math.max(w / iw, h / ih) * clamp(finite(zoom, 1), 1, 1.12);
  if (safe?.w > 0 && safe?.h > 0) scale = Math.min(scale, w * .95 / (iw * safe.w), h * .88 / (ih * safe.h));
  const drawnWidth = iw * scale, drawnHeight = ih * scale;
  let x = w * .5 - clamp(finite(focus.x, .5)) * drawnWidth;
  let y = h * .54 - clamp(finite(focus.y, .56)) * drawnHeight;
  x = drawnWidth >= w ? clamp(x, w - drawnWidth, 0) : (w - drawnWidth) / 2;
  y = drawnHeight >= h ? clamp(y, h - drawnHeight, 0) : (h - drawnHeight) / 2;
  return { x, y, width: drawnWidth, height: drawnHeight, scale };
}

export function pixelSize(width, height, dpr = 1) {
  const w = Math.max(1, finite(width, 1)), h = Math.max(1, finite(height, 1));
  const ratio = Math.min(clamp(finite(dpr, 1), .5, 2), Math.sqrt(2000000 / (w * h)));
  return { width: w, height: h, ratio, pixelWidth: Math.max(1, Math.floor(w * ratio)), pixelHeight: Math.max(1, Math.floor(h * ratio)) };
}

function phrase(time, keys) {
  if (time <= keys[0][0]) return keys[0][1];
  for (let index = 1; index < keys.length; index++) {
    if (time <= keys[index][0]) {
      const [a, av] = keys[index - 1], [b, bv] = keys[index];
      return mix(av, bv, smooth((time - a) / (b - a)));
    }
  }
  return keys.at(-1)[1];
}

/** Stateless editorial state; seeking, replay and low frame rates cannot skip a pose. */
export function visualState(seconds = 0, suppliedChapter) {
  const time = Math.max(0, finite(seconds, 0)), cue = timeline.at(time);
  const requested = typeof suppliedChapter === 'string' ? suppliedChapter : suppliedChapter?.chapter || suppliedChapter?.id;
  const chapter = ALIASES[requested] || requested || cue.section;
  const realChapter = SCENES[chapter] ? chapter : cue.section;
  const section = timeline.sections.find(item => item.id === realChapter);
  const local = Math.max(0, time - (section?.start ?? 380));
  const duration = section?.duration || Infinity;
  const progress = Number.isFinite(duration) ? clamp(local / duration) : 1;
  let scene = SCENES[realChapter]?.[0] || 'portrait';
  if (realChapter === 'orchestralWorld' && time < 234.14) scene = 'reunion';
  const drift = realChapter === 'orchestralWorld'
    ? phrase(time, [[227.43, 0], [234.14, 0], [257, -.022], [270, -.022], [299, .022], [310, .022], [336, 0], [345, 0]])
    : phrase(progress, [[0, -.008], [.32, .007], [.55, .007], [1, 0]]);
  const zoom = realChapter === 'orchestralWorld'
    ? phrase(time, [[227.43, 1.055], [234.14, 1.055], [267, 1], [285, 1], [310, 1.045], [330, 1.045], [345, 1]])
    : realChapter === 'reunion' ? 1.055 : realChapter === 'photography' ? mix(1, 1.045, smooth(progress)) : 1.015;
  const chapterStart = section?.start ?? 380;
  const previous = section?.index > 0 ? timeline.sections[section.index - 1] : null;
  let previousScene = previous ? SCENES[previous.id][0] : null;
  if (realChapter === 'orchestralWorld') previousScene = time < 234.14 ? null : 'reunion';
  if (realChapter === 'quietExplore' || realChapter === 'birthday') previousScene = null;
  const fadeStart = realChapter === 'orchestralWorld' ? 234.14 : chapterStart;
  return {
    time, chapter: realChapter, local, progress, scene,
    previousScene, transition: smooth((time - fadeStart) / (realChapter === 'orchestralWorld' ? 5.4 : 1.5)),
    wash: SCENES[realChapter]?.[1] || '#adc1c7', drift, zoom,
    introOpen: smooth((time - 4.8) / 9.2),
    fracture: ['fracture', 'reach'].includes(realChapter) ? smooth(local / 4) * (realChapter === 'reach' ? 1 - smooth((time - 188) / 6.78) : 1) : 0,
    snow: ['snow', 'portrait', 'birthday', 'quietExplore'].includes(realChapter) ? smooth((time - 345) / 5) : 0,
    bloom: clamp((time - 234.14) / 40) * (1 - smooth((time - 325) / 20)),
    warmSeed: ['reach', 'reunion', 'orchestralWorld'].includes(realChapter) ? smooth((time - 187) / 10) : 0,
  };
}

function ellipse(ctx, x, y, rx, ry, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function softGlow(ctx, x, y, radius, color, opacity = 1) {
  ctx.save(); ctx.globalAlpha *= opacity;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color); gradient.addColorStop(1, color.replace(/[^,]+\)$/, '0)'));
  ctx.fillStyle = gradient; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2); ctx.restore();
}

function leaf(ctx, x, y, size, rotation, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(rotation);
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, -size); ctx.bezierCurveTo(size * .8, -size * .5, size * .9, size * .55, 0, size); ctx.bezierCurveTo(-size * .85, size * .5, -size * .75, -size * .55, 0, -size); ctx.fill();
  ctx.strokeStyle = '#fff1ce'; ctx.lineWidth = Math.max(.65, size * .065); ctx.globalAlpha *= .55; ctx.beginPath(); ctx.moveTo(0, -size * .65); ctx.lineTo(0, size * .8); ctx.stroke(); ctx.restore();
}

function star(ctx, x, y, radius, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(0, -radius); ctx.quadraticCurveTo(radius * .15, -radius * .15, radius, 0); ctx.quadraticCurveTo(radius * .15, radius * .15, 0, radius); ctx.quadraticCurveTo(-radius * .15, radius * .15, -radius, 0); ctx.quadraticCurveTo(-radius * .15, -radius * .15, 0, -radius); ctx.fill(); ctx.restore();
}

function drawAmbient(ctx, width, height, state, reduced) {
  const { time, chapter } = state;
  const snowing = state.snow > 0;
  const count = reduced ? 0 : snowing ? 35 : state.bloom > .01 ? 16 : 10;
  for (let index = 0; index < count; index++) {
    const a = seed(index + 1), b = seed(index + 157), c = seed(index + 418);
    if (snowing) {
      const x = (a + Math.sin(time * .12 + b * 9) * .035) * width;
      const y = fract(b + time * (.009 + c * .007)) * height;
      ellipse(ctx, x, y, 1.15 + c * 1.6, 1.15 + c * 1.6, '#fff9e8', state.snow * (.25 + a * .45));
    } else if (state.bloom > .01) {
      const age = Math.max(0, time - 234.14), x = fract(a + age * (.003 + c * .002)) * width;
      const y = (b * .9 + Math.sin(age * .09 + a * 9) * .045) * height;
      leaf(ctx, x, y, 3 + c * 4.5, age * .12 + a * 5, index % 3 === 0 ? '#edb8ab' : '#fff0d5', state.bloom * .65);
    } else {
      const x = (a + Math.sin(time * .05 + b * 10) * .018) * width;
      const y = fract(b - time * (.001 + c * .0012)) * height;
      ellipse(ctx, x, y, .8 + c * 1.0, .8 + c * 1.0, chapter === 'photography' ? '#fff9e8' : '#f5dca6', .10 + a * .20);
    }
  }
  if (!reduced && ['encounter', 'together', 'keepworld'].includes(chapter)) {
    for (let index = 0; index < 3; index++) {
      const age = time + index * 11;
      const x = fract(seed(index + 400) + age * .009) * width;
      const y = (.66 + Math.sin(age * .14 + index * 2) * .065) * height;
      leaf(ctx, x, y, Math.max(4, width * .008), age * .25, index % 2 ? '#bb7763' : '#d3a161', .72);
    }
  }
  if (chapter === 'snow' && state.local > 3 && state.local < 10) {
    const settle = reduced ? 1 : smooth((state.local - 3) / 2);
    star(ctx, width * .62, height * mix(.43, .63, settle), 4, '#fffdf1', 1 - smooth((state.local - 8) / 2));
  }
}

function drawCode(ctx, width, height, state, reduced, pulse) {
  const opening = Math.max(state.introOpen, pulse?.kind === 'break' ? smooth((state.time - pulse.at - .2) / 3.8) : 0);
  const veil = 1 - opening;
  if (veil <= .002) return;
  ctx.save(); ctx.globalAlpha = veil;
  ctx.fillStyle = '#1f343b'; ctx.fillRect(0, 0, width, height);
  const fontSize = width < 700 ? 11 : 13, line = fontSize * 2;
  ctx.font = `${fontSize}px ui-monospace, monospace`; ctx.textBaseline = 'middle';
  const snippets = ['world.keep(a_little_light)', 'await tomorrow', 'memory.save(small_things)', 'if (you) { stay(); }', '0100  0011  0001  1001'];
  for (let row = 0; row < Math.ceil(height / line); row++) {
    ctx.fillStyle = row % 6 === 0 ? '#d2d1ad' : '#748d89'; ctx.globalAlpha = veil * (row % 6 === 0 ? .34 : .17);
    const offset = reduced ? 0 : Math.sin(state.time * .10 + row) * 5;
    ctx.fillText(snippets[row % snippets.length], width * .06 + offset, row * line + 12);
    if (width > 500) ctx.fillText(snippets[(row + 2) % snippets.length], width * .57 - offset, row * line + 12);
  }
  ctx.globalAlpha = veil;
  const centerX = width * .48, centerY = height * .58;
  const crack = smooth((state.time - 4.8) / 3.2);
  ctx.strokeStyle = '#f0d7ac'; ctx.lineWidth = 1.5;
  for (let index = 0; index < 7; index++) {
    const angle = index / 7 * Math.PI * 2 + .2;
    const reach = Math.max(width, height) * (.24 + seed(index + 804) * .18) * crack;
    ctx.beginPath(); ctx.moveTo(centerX, centerY);
    for (let j = 1; j <= 4; j++) {
      const distance = reach * j / 4, bend = (seed(index * 5 + j + 901) - .5) * .13;
      ctx.lineTo(centerX + Math.cos(angle + bend) * distance, centerY + Math.sin(angle + bend) * distance);
    }
    ctx.globalAlpha = veil * crack * .55; ctx.stroke();
  }
  ctx.restore();
  if (opening > 0 && opening < 1) {
    ctx.save(); ctx.globalCompositeOperation = 'screen'; softGlow(ctx, centerX, centerY, Math.max(width, height) * .45 * opening, 'rgba(248,214,145,.22)', Math.sin(opening * Math.PI)); ctx.restore();
  }
}

function drawFracture(ctx, width, height, state, reduced) {
  if (!state.fracture) return;
  const amount = state.fracture;
  ctx.save(); ctx.strokeStyle = '#f7e2bf'; ctx.lineWidth = 1.5; ctx.globalAlpha = .25 * amount;
  for (let index = 0; index < 5; index++) {
    const startX = (.15 + index * .18) * width;
    ctx.beginPath(); ctx.moveTo(startX, height); ctx.lineTo(startX - width * .03, height * .80); ctx.lineTo(startX + width * .035, height * .64); ctx.stroke();
  }
  if (!reduced) {
    ctx.font = `${width < 700 ? 10 : 12}px ui-monospace, monospace`; ctx.fillStyle = '#f3dfb7';
    ctx.globalAlpha = .14 * amount;
    ctx.fillText('keep()', width * .07, height * .23); ctx.fillText('still.here', width * .75, height * .34);
  }
  ctx.restore();
}

function drawPulse(ctx, width, height, state, pulse) {
  if (!pulse || !Number.isFinite(pulse.at)) return;
  const age = state.time - pulse.at;
  if (age < 0 || age > 1.8 || pulse.kind === 'break') return;
  const amount = Math.sin(age / 1.8 * Math.PI);
  let x = pulse.x === undefined ? .5 : clamp(pulse.x), y = pulse.y === undefined ? .61 : clamp(pulse.y);
  if (pulse.kind === 'badger') x = .41;
  if (pulse.kind === 'bear') x = .61;
  if (pulse.kind === 'lamp') { softGlow(ctx, width * .24, height * .35, Math.min(width, height) * .32, 'rgba(255,220,154,.22)', amount); return; }
  if (pulse.kind === 'flower') { x = .73; y = .58; }
  for (let index = 0; index < 5; index++) {
    const angle = index / 5 * Math.PI * 2, travel = 15 + age * 16;
    star(ctx, x * width + Math.cos(angle) * travel, y * height + Math.sin(angle) * travel - age * 12, 2.5, index % 2 ? '#f6d7aa' : '#edb8ab', amount * .85);
  }
}

function descriptor(value) {
  if (typeof value === 'string') return { src: value };
  return value && typeof value === 'object' ? value : {};
}

function loadImage(source, ImageType) {
  if (!source) return Promise.resolve(null);
  if (typeof source === 'object' && (source.naturalWidth || source.width)) return Promise.resolve(source);
  return new Promise((resolve, reject) => {
    const image = new ImageType(); image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('An illustration could not be loaded.'));
    image.src = source;
  });
}

export function actorPlacement(width, height, firstAspect = .62, secondAspect = .62) {
  const mobile = width / height < .8;
  const actorHeight = Math.min(height * (mobile ? .47 : .62), width * (mobile ? .91 : .67) / (firstAspect + secondAspect + .025));
  const firstWidth = actorHeight * firstAspect, secondWidth = actorHeight * secondAspect, gap = actorHeight * .025;
  const left = (width - firstWidth - secondWidth - gap) / 2;
  return { height: actorHeight, baseline: height * (mobile ? .875 : .90),
    badgerX: left + firstWidth / 2, bearX: left + firstWidth + gap + secondWidth / 2,
    badgerWidth: firstWidth, bearWidth: secondWidth };
}

function sourceFrame(art, image, index = 0) {
  const width = image.naturalWidth || image.width, height = image.naturalHeight || image.height;
  const supplied = art.frames?.[index] || art.frame || art.crop;
  if (supplied) return { x: supplied.x || 0, y: supplied.y || 0, w: supplied.w || supplied.width, h: supplied.h || supplied.height };
  if (index > -1 && art.atlas) return { x: index * width / 2, y: 0, w: width / 2, h: height };
  return { x: 0, y: 0, w: width, h: height };
}

const posedAsset = chapter => ({ photography: 'photoPose', fracture: 'reachPose', reach: 'reachPose', reunion: 'holdPose',
  orchestralWorld: 'holdPose', snow: 'snowPose', portrait: 'portraitPose', birthday: 'portraitPose', quietExplore: 'portraitPose' })[chapter];

export function createStage(canvas, { images = {}, reduced = false, Image: ImageType = globalThis.Image } = {}) {
  const ctx = canvas?.getContext?.('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D is unavailable.');
  let size = pixelSize(1, 1), disposed = false, lastState = visualState(0), lastOptions = {};
  let actorHitAreas = [];
  const artwork = {}, failures = [];
  const ready = Promise.all(Object.entries(images).filter(([, value]) => value).map(async ([key, value]) => {
    const spec = descriptor(value);
    try {
      const [image, mobile] = await Promise.all([loadImage(spec.src || spec.desktop, ImageType), loadImage(spec.mobile || spec.portraitSrc, ImageType)]);
      artwork[key] = { ...spec, image, mobile, atlas: key === 'actors' };
    } catch (error) { failures.push(key); throw error; }
  }));

  function findArt(key) {
    for (const candidate of [key, ...(FALLBACKS[key] || [])]) if (artwork[candidate]?.image || artwork[candidate]?.mobile) return artwork[candidate];
    return null;
  }

  function drawArt(context, width, height, key, state, opacity, pointer = { x: 0, y: 0 }, still = false) {
    const art = findArt(key); if (!art || opacity <= 0) return null;
    const image = width / height < .8 && art.mobile ? art.mobile : art.image || art.mobile;
    const imageWidth = image.naturalWidth || image.width, imageHeight = image.naturalHeight || image.height;
    const focus = { x: art.focus?.x ?? .5, y: art.focus?.y ?? .56 };
    if (!reduced && !still) { focus.x += state.drift + (clamp(finite(pointer.x, .5)) - .5) * .006; focus.y += (clamp(finite(pointer.y, .5)) - .5) * .004; }
    const fit = fitArtwork(imageWidth, imageHeight, width, height, { focus, safe: art.safe, zoom: reduced || still ? 1 : state.zoom });
    context.save(); context.globalAlpha *= opacity;
    // A very faint bleed makes any subject-preserving matte feel like paper,
    // rather than exposing black bars when a landscape illustration is narrow.
    if (fit.width < width || fit.height < height) {
      const bleed = fitArtwork(imageWidth, imageHeight, width, height);
      context.save(); context.globalAlpha *= .18; context.filter = 'blur(24px)';
      context.drawImage(image, bleed.x - 15, bleed.y - 15, bleed.width + 30, bleed.height + 30); context.restore();
    }
    if (state.fracture > 0 && !reduced && !art.fractureBaked) {
      const strips = 9;
      for (let index = 0; index < strips; index++) {
        const strip = imageWidth / strips, movement = Math.sin(index * 2.7 + state.time * .35) * state.fracture * Math.min(10, width * .014);
        context.drawImage(image, index * strip, 0, strip + 1, imageHeight, fit.x + index * strip * fit.scale, fit.y + movement, strip * fit.scale + 1, fit.height);
      }
    } else context.drawImage(image, fit.x, fit.y, fit.width, fit.height);
    context.restore();
    return { art, fit, imageWidth, imageHeight };
  }

  function drawIndividual(context, image, frame, x, baseline, height, {
    type, time = 0, moving = false, lean = 0, reaction = 0, still = false,
  } = {}) {
    const width = height * frame.w / frame.h;
    const walk = !reduced && !still && moving;
    const breath = reduced || still ? 0 : Math.sin(time * 1.65 + (type === 'bear' ? 1.5 : 0));
    const headTurn = reduced || still ? 0 : Math.sin(time * .55 + (type === 'bear' ? 1 : 0)) * .011;
    const tilt = lean + reaction * (type === 'bear' ? -.045 : .045);
    ellipse(context, x, baseline + height * .006, width * .38, height * .012, '#6e645a', .11);
    context.save(); context.translate(x, baseline); context.rotate(tilt);
    const dx = -width / 2, dy = -height;
    // Three overlapping paper cutouts keep the feet planted while the head
    // tilts. This is deliberately flat puppet motion, never a shaded model.
    const bodyEnd = walk ? .89 : 1;
    context.drawImage(image, frame.x, frame.y + frame.h * .44, frame.w, frame.h * (bodyEnd - .44),
      dx, dy + height * .44, width * (1 + breath * .0025), height * (bodyEnd - .44));
    if (walk) {
      for (let side = 0; side < 2; side++) {
        const step = Math.max(0, Math.sin(time * 7.4 + (side ? Math.PI : 0))) * height * .009;
        context.drawImage(image, frame.x + side * frame.w / 2, frame.y + frame.h * .86, frame.w / 2, frame.h * .14,
          dx + side * width / 2, dy + height * .86 - step, width / 2, height * .14);
      }
    }
    context.save(); context.translate(0, dy + height * .48); context.rotate(headTurn + reaction * (type === 'bear' ? -.025 : .035));
    context.drawImage(image, frame.x, frame.y, frame.w, frame.h * .53, dx, -height * .48, width, height * .53); context.restore();
    context.restore();
    return { kind: type, x: x - width / 2, y: baseline - height, width, height };
  }

  function drawDuo(context, art, width, height, state, options, opacity = 1, still = false) {
    const image = art.image || art.mobile; if (!image || opacity <= 0) return [];
    const frame = sourceFrame(art, image, 0), mobile = width / height < .8;
    const aspect = frame.w / frame.h;
    const finalPage = ['portrait', 'birthday', 'quietExplore'].includes(state.chapter);
    const ceiling = finalPage && width / height < 1.3 ? .48 : mobile ? .48 : .63;
    const scaleHeight = Math.min(height * (still ? .79 : ceiling), width * (still ? .92 : .94) / aspect);
    const scaleWidth = scaleHeight * aspect, x = (width - scaleWidth) / 2;
    const baseline = height * (still ? .94 : mobile ? .875 : .90), y = baseline - scaleHeight;
    context.save(); context.globalAlpha *= opacity;
    ellipse(context, width / 2, baseline + scaleHeight * .006, scaleWidth * .37, scaleHeight * .012, '#6e645a', .09);
    const pulseAge = state.time - (options.pulse?.at ?? -100), reacting = !still && pulseAge >= 0 && pulseAge < 1.5;
    const tilt = !reduced && reacting ? Math.sin(pulseAge / 1.5 * Math.PI) * .012 : 0;
    context.translate(width / 2, baseline); context.rotate(tilt);
    if (['fracture', 'reach'].includes(state.chapter) && state.fracture && !still) {
      const apart = width * .038 * state.fracture;
      context.drawImage(image, frame.x, frame.y, frame.w / 2, frame.h, -scaleWidth / 2 - apart, -scaleHeight, scaleWidth / 2, scaleHeight);
      context.drawImage(image, frame.x + frame.w / 2, frame.y, frame.w / 2, frame.h, apart, -scaleHeight, scaleWidth / 2, scaleHeight);
    } else context.drawImage(image, frame.x, frame.y, frame.w, frame.h, -scaleWidth / 2, -scaleHeight, scaleWidth, scaleHeight);
    context.restore();
    return [{ kind: 'badger', x, y, width: scaleWidth / 2, height: scaleHeight },
      { kind: 'bear', x: x + scaleWidth / 2, y, width: scaleWidth / 2, height: scaleHeight }];
  }

  function drawActors(context, width, height, state, options, { still = false, captureKind } = {}) {
    const atlas = artwork.actors, image = atlas?.image || atlas?.mobile;
    const background = findArt(state.scene);
    if (background?.actors === true || background?.includesActors === true) return [];
    if (captureKind === 'window' && image) {
      const frame = sourceFrame(atlas, image, 0), actorHeight = height * .94;
      return [drawIndividual(context, image, frame, width * .83, height * 1.05, actorHeight, { type: 'badger', time: state.time, still: true, lean: -.10 })];
    }
    const pose = posedAsset(state.chapter), duo = pose && artwork[pose];
    if (duo?.image || duo?.mobile) {
      if (state.chapter === 'reunion' && state.local < .8 && artwork.reachPose) {
        const amount = smooth(state.local / .8);
        drawDuo(context, artwork.reachPose, width, height, state, options, 1 - amount, still);
        return drawDuo(context, duo, width, height, state, options, amount, still);
      }
      return drawDuo(context, duo, width, height, state, options, 1, still);
    }
    if (!image) return [];
    const badgerFrame = sourceFrame(atlas, image, 0), bearFrame = sourceFrame(atlas, image, 1);
    const layout = actorPlacement(width, height, badgerFrame.w / badgerFrame.h, bearFrame.w / bearFrame.h);
    let bx = layout.badgerX, rx = layout.bearX, badgerLean = 0, bearLean = 0, moving = false;
    if (state.chapter === 'code') {
      bx = width * .40;
      const strike = Math.sin(clamp((state.time - 4.65) / .85) * Math.PI);
      badgerLean = -.045 * strike;
    } else if (state.chapter === 'encounter') {
      const approach = smooth(state.local / 12); bx -= width * .18 * (1 - approach); moving = state.local < 12;
      const listen = Math.sin(clamp((state.local - 12) / 10) * Math.PI);
      badgerLean = .035 * listen; bearLean = -.018 * listen;
    } else if (state.chapter === 'together') {
      const stroll = phrase(state.local, [[0, 0], [8, .025], [16, .025], [26, -.02], [37.15, 0]]);
      bx += stroll * width; rx += stroll * width; moving = state.local < 8 || state.local > 18 && state.local < 27;
      badgerLean = moving ? .014 : 0; bearLean = moving ? .012 : 0;
    } else if (state.chapter === 'keepworld') {
      const returning = 1 - smooth(state.local / 12); bx += width * .16 * returning; rx += width * .16 * returning; moving = state.local < 12;
    }
    const age = state.time - (options.pulse?.at ?? -100), reaction = age >= 0 && age < 1.5 ? Math.sin(age / 1.5 * Math.PI) : 0;
    const output = [drawIndividual(context, image, badgerFrame, bx, layout.baseline, layout.height,
      { type: 'badger', time: state.time, moving, lean: badgerLean, still, reaction: ['badger','break'].includes(options.pulse?.kind) ? reaction : 0 })];
    if (state.chapter !== 'code') output.push(drawIndividual(context, image, bearFrame, rx, layout.baseline, layout.height,
      { type: 'bear', time: state.time + .16, moving, lean: bearLean, still, reaction: options.pulse?.kind === 'bear' ? reaction : 0 }));
    return output;
  }

  function paint(context, width, height, state, options = {}, { still = false, scene, captureKind } = {}) {
    context.save(); context.globalAlpha = 1; context.fillStyle = state.wash; context.fillRect(0, 0, width, height);
    const key = scene || state.scene;
    let composed;
    if (!still && state.previousScene && state.previousScene !== key && state.transition < 1) {
      drawArt(context, width, height, state.previousScene, state, 1, options.pointer, still);
      composed = drawArt(context, width, height, key, state, state.transition, options.pointer, still);
    } else composed = drawArt(context, width, height, key, state, 1, options.pointer, still);
    if (!composed) {
      const glow = context.createLinearGradient(0, 0, width, height); glow.addColorStop(0, '#233f48'); glow.addColorStop(1, '#56716c');
      context.fillStyle = glow; context.fillRect(0, 0, width, height);
      softGlow(context, width * .55, height * .62, Math.min(width, height) * .8, 'rgba(244,210,158,.24)');
    }
    if (!still) {
      if (state.chapter === 'code') drawCode(context, width, height, state, reduced, options.pulse);
      if (state.fracture) drawFracture(context, width, height, state, reduced);
    }
    const actorAreas = drawActors(context, width, height, state, options, { still, captureKind });
    if (!still) {
      actorHitAreas = actorAreas;
      if (state.warmSeed && state.time < 240) softGlow(context, width * .5, height * .66, Math.min(width, height) * .13, 'rgba(253,218,151,.18)', state.warmSeed);
      drawAmbient(context, width, height, state, reduced);
      if (state.chapter === 'keepworld' && state.local > 22) {
        context.save(); context.globalAlpha = smooth((state.local - 22) / 11) * .12; context.strokeStyle = '#f0ddb6'; context.lineWidth = 1;
        context.strokeRect(width * .05, height * .16, width * .9, height * .68); context.restore();
      }
      drawPulse(context, width, height, state, options.pulse);
    }
    context.restore();
    return composed;
  }

  const api = {
    ready,
    resize(width, height, dpr = 1) {
      if (disposed) return size;
      size = pixelSize(width, height, dpr); canvas.width = size.pixelWidth; canvas.height = size.pixelHeight;
      if (canvas.style) { canvas.style.width = size.width + 'px'; canvas.style.height = size.height + 'px'; }
      ctx.setTransform(size.ratio, 0, 0, size.ratio, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      return { ...size };
    },
    render(time, chapter, options = {}) {
      if (disposed) return;
      lastState = visualState(time, chapter); lastOptions = options;
      paint(ctx, size.width, size.height, lastState, options);
      return { time: lastState.time, chapter: lastState.chapter, scene: lastState.scene };
    },
    hitTest(normalizedX, normalizedY) {
      if (disposed) return null;
      const x = clamp(finite(normalizedX, 0)), y = clamp(finite(normalizedY, 0));
      if (lastState.chapter === 'code') return 'break';
      for (const actor of actorHitAreas) {
        if (x * size.width >= actor.x && x * size.width <= actor.x + actor.width && y * size.height >= actor.y && y * size.height <= actor.y + actor.height) return actor.kind;
      }
      const art = findArt(lastState.scene);
      if (art?.hotspots?.length) {
        const image = size.width / size.height < .8 && art.mobile ? art.mobile : art.image || art.mobile;
        const iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height;
        const fit = fitArtwork(iw, ih, size.width, size.height, { focus: art.focus, safe: art.safe, zoom: reduced ? 1 : lastState.zoom });
        for (const hit of art.hotspots) {
          const px = (fit.x + iw * fit.scale * hit.x) / size.width, py = (fit.y + ih * fit.scale * hit.y) / size.height;
          const rx = iw * fit.scale * (hit.rx || .07) / size.width, ry = ih * fit.scale * (hit.ry || .12) / size.height;
          if (((x - px) / rx) ** 2 + ((y - py) / ry) ** 2 <= 1) return hit.kind;
        }
      }
      if (y > .42 && y < .84 && x > .22 && x < .52) return 'badger';
      if (y > .42 && y < .84 && x >= .52 && x < .80) return 'bear';
      if (x < .28 && y > .18 && y < .6) return 'lamp';
      if (lastState.snow && y < .78) return 'snow';
      if (x > .70 && y > .35 && y < .82) return 'flower';
      if (x < .32 && y > .65) return 'record';
      return null;
    },
    capture(kind = 'together', time = lastState.time) {
      if (disposed) return null;
      const output = canvas.ownerDocument?.createElement?.('canvas') || globalThis.document?.createElement?.('canvas');
      if (!output) return null;
      output.width = 1400; output.height = 1600;
      const paper = output.getContext('2d', { alpha: false }); if (!paper) return null;
      const selected = kind === 'window' ? 'window' : 'portrait';
      if (!findArt(selected)) return null;
      paper.fillStyle = '#f5ecdb'; paper.fillRect(0, 0, 1400, 1600);
      paper.save(); paper.translate(64, 64); paper.beginPath(); paper.rect(0, 0, 1272, 1272); paper.clip();
      const state = visualState(time, kind === 'window' ? 'photography' : 'portrait');
      paint(paper, 1272, 1272, state, {}, { still: true, scene: selected, captureKind: kind }); paper.restore();
      paper.fillStyle = '#847764'; paper.textAlign = 'center'; paper.font = '22px Georgia, serif';
      paper.fillText(kind === 'window' ? 'a little light, kept.' : 'a little world, together.', 700, 1453);
      paper.fillStyle = '#b3a48e'; paper.font = '15px Georgia, serif'; paper.fillText('BADGER / 19', 700, 1510);
      return { kind: kind === 'window' ? 'window' : 'together', url: output.toDataURL('image/png'), width: 1400, height: 1600,
        filename: kind === 'window' ? 'BADGER-the-little-light-19.png' : 'BADGER-and-BEAR-19.png',
        label: kind === 'window' ? '熊留下的花与阳光，还有意外入镜的 BADGER' : 'BADGER 和熊的十九岁纪念合照' };
    },
    get snapshot() { return Object.freeze({ time: lastState.time, chapter: lastState.chapter, scene: lastState.scene, loaded: Object.keys(artwork), failures: [...failures], disposed }); },
    dispose() { disposed = true; for (const key of Object.keys(artwork)) delete artwork[key]; },
  };
  return api;
}
