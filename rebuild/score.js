// A temporary, original score for PROJECT BADGER. No recordings or borrowed songs.
// Eighth-note notation below belongs to this little world: the same four-note
// gesture gradually becomes a duet, disappears into a held chord, then returns.
const STEP = 60 / 84 / 2;
// Native rendering measured the previous .72 mix at -33.1 LUFS. This +8.2 dB
// calibration brings the original score near -25 LUFS without changing its arc.
const MASTER = 1.85;
const SILENCE = .0001;
const MAX_VOICES = 72;
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const CHORDS = {
  street: [[50, 57, 61, 66, 69], [47, 54, 57, 62, 66], [43, 50, 54, 59, 62], [45, 52, 59, 61, 64]],
  photo: [[50, 57, 61, 66, 69], [43, 50, 54, 59, 62], [47, 54, 57, 62, 66], [45, 52, 57, 59, 64]],
  fracture: [[47, 54, 57, 61, 66], [43, 50, 54, 57, 62], [45, 52, 57, 62, 66], [45, 52, 57, 59, 64]],
  bloom: [[38, 57, 61, 66, 73], [43, 59, 62, 66, 69], [45, 57, 59, 64, 69]],
  snow: [[50, 57, 59, 66, 69], [43, 54, 59, 62, 66], [50, 57, 61, 66, 69], [45, 52, 57, 59, 64]],
  final: [[50, 57, 59, 66, 69], [47, 54, 57, 62, 66], [43, 54, 59, 62, 66], [50, 57, 59, 66, 69]],
};
// Pairs are [eighth-note position within a bar, MIDI note]. Rests matter.
const THEME = [
  [[0, 69], [3, 66], [5, 64], [6, 62]],
  [[0, 66], [3, 69], [4, 71], [6, 69]],
  [[0, 67], [3, 66], [4, 64], [6, 66]],
  [[0, 64], [3, 61], [5, 64], [6, 69]],
  [[0, 69], [2, 71], [4, 78], [6, 76]],
  [[0, 74], [3, 73], [4, 71], [6, 69]],
  [[0, 71], [3, 69], [4, 66], [6, 64]],
  [[0, 66], [3, 64], [6, 62]],
];

function random(seed) {
  let n = seed >>> 0;
  return () => { n = (1664525 * n + 1013904223) >>> 0; return n / 4294967296 * 2 - 1; };
}

export class Soundtrack {
  constructor({ button = null, reducedMotion = false, AudioContext = null,
    setInterval: every = globalThis.setInterval, clearInterval: cancel = globalThis.clearInterval } = {}) {
    this.button = button;
    this.reducedMotion = reducedMotion;
    this.AudioContext = AudioContext;
    this._every = every;
    this._cancel = cancel;
    this.ac = null;
    this.muted = false;
    this.phase = 'intro';
    this.story = { phase: 'intro', local: 0 };
    this.next = 0;
    this.beat = 0;
    this.active = false;
    this.timer = null;
    this._voices = new Set();
    this._graph = [];
    this._resumePromise = null;
    this._breathIssued = false;
    this._lastChime = -Infinity;
    this._storyAudioTime = 0;
  }

  unlock() {
    try {
      if (!this.ac || this.ac.state === 'closed') {
        this._stopScheduler();
        this._voices.clear();
        const AC = this.AudioContext || globalThis.AudioContext || globalThis.window?.AudioContext || globalThis.window?.webkitAudioContext;
        if (!AC) return Promise.resolve(false);
        this.ac = new AC();
        this._buildGraph();
        this.beat = Math.floor(Math.max(0, this.story.local) / STEP);
        this.next = this.ac.currentTime + .06;
        this._storyAudioTime = this.ac.currentTime;
        this.ac.onstatechange = () => this.sync();
      }
      if (!this.muted) return this.resume();
      this.sync();
      return Promise.resolve(false);
    } catch {
      this._stopScheduler();
      this.active = false;
      this.sync();
      return Promise.resolve(false);
    }
  }

  _buildGraph() {
    const ac = this.ac;
    this.master = ac.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER;
    this.guard = null;
    if (ac.createWaveShaper) {
      const guard = ac.createWaveShaper();
      const curve = new Float32Array(5121);
      for (let i = 0; i < curve.length; i++) {
        const x = i * 2 / (curve.length - 1) - 1;
        const a = Math.abs(x), u = clamp((a - .85) / .15, 0, 1);
        // Unity through ±.85. The outer Hermite section has slope 1 at
        // .85 and slope 0 at 1; larger inputs stay bounded at ±.95.
        curve[i] = Math.sign(x) * (a <= .85 ? a : .85 + .15 * u - .05 * u ** 3);
      }
      guard.curve = curve;
      guard.oversample = 'none';
      this.master.connect(guard);
      guard.connect(ac.destination);
      this.guard = guard;
    } else this.master.connect(ac.destination);
    this.output = ac.createBiquadFilter();
    this.output.type = 'lowpass';
    this.output.frequency.value = 4700;
    if (this.output.Q) this.output.Q.value = .45;
    const sum = ac.createGain();
    sum.gain.value = .86;
    this.output.connect(sum);
    this._graph = [this.output, sum, this.master];
    if (this.guard) this._graph.push(this.guard);
    if (ac.createDynamicsCompressor) {
      const compressor = ac.createDynamicsCompressor();
      for (const [key, value] of Object.entries({ threshold: -16, knee: 16, ratio: 2.2, attack: .008, release: .30 })) {
        compressor[key].value = value;
      }
      sum.connect(compressor);
      compressor.connect(this.master);
      this._graph.push(compressor);
    } else sum.connect(this.master);

    // A short, quiet room rather than a long, indistinct wash.
    const room = ac.createConvolver();
    const length = Math.ceil(ac.sampleRate * 1.65);
    const impulse = ac.createBuffer(2, length, ac.sampleRate);
    const noise = random(190219);
    for (let c = 0; c < 2; c++) {
      const a = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) a[i] = noise() * (1 - i / length) ** 3 * .27;
    }
    room.buffer = impulse;
    const wet = ac.createGain();
    wet.gain.value = .19;
    this.output.connect(room);
    room.connect(wet);
    wet.connect(sum);
    this._graph.push(room, wet);

    this._strings = [this._makeString(220, 19), this._makeString(440, 119)];
    this._keysWave = null;
    this._bassWave = null;
    if (ac.createPeriodicWave) {
      this._keysWave = ac.createPeriodicWave(new Float32Array(7), new Float32Array([0, 1, .22, .075, .025, .012, .004]));
      this._bassWave = ac.createPeriodicWave(new Float32Array(4), new Float32Array([0, 1, .12, .035]));
    }
    this._shutterBuffer = null;
  }

  _makeString(frequency, seed) {
    const ac = this.ac, sr = ac.sampleRate;
    const size = Math.max(4, Math.floor(sr / frequency - .5));
    const delay = new Float32Array(size);
    const buffer = ac.createBuffer(1, Math.ceil(sr * 2.8), sr);
    const a = buffer.getChannelData(0), noise = random(seed);
    for (let i = 0; i < size; i++) delay[i] = noise();
    let max = .001;
    for (let i = 0; i < a.length; i++) {
      const index = i % size;
      const sample = (delay[index] + delay[(index + 1) % size]) * .5 * .996;
      delay[index] = sample;
      a[i] = sample;
      max = Math.max(max, Math.abs(sample));
    }
    for (let i = 0; i < a.length; i++) {
      a[i] = a[i] / max * .76 * Math.min(1, i / Math.max(1, sr * .0015)) * Math.min(1, (a.length - i) / Math.max(1, sr * .025));
    }
    return { buffer, frequency: sr / (size + .5) };
  }

  sync() {
    this.active = !!this.ac && this.ac.state === 'running' && !this.muted;
    this.button?.classList?.toggle('playing', this.active);
    this.button?.setAttribute('aria-label', this.active ? '关闭声音' : '开启声音');
    this.button?.setAttribute('aria-pressed', String(this.active));
    if (this.active && this.phase !== 'intro') this._startScheduler();
    else this._stopScheduler();
  }

  _startScheduler() {
    if (this.timer !== null) return;
    this.next = Math.max(this.next, this.ac.currentTime + .035);
    this.schedule();
    this.timer = this._every(() => this.schedule(), 60);
    this.timer?.unref?.();
  }

  _stopScheduler() {
    if (this.timer !== null) this._cancel(this.timer);
    this.timer = null;
  }

  _canPlay() { return !!this.ac && this.ac.state === 'running' && !this.muted; }

  _track(source, gain, time, duration, extras = []) {
    const voice = { source, gain, time, end: time + duration, extras };
    const clean = () => {
      if (!this._voices.delete(voice)) return;
      for (const node of [source, gain, ...extras]) { try { node.disconnect(); } catch { /* already disconnected */ } }
      source.onended = null;
    };
    voice.clean = clean;
    source.onended = clean;
    this._voices.add(voice);
    if (this._voices.size > MAX_VOICES) {
      const oldest = this._voices.values().next().value;
      try { oldest.source.stop(this.ac.currentTime + .01); } catch { /* ended */ }
      oldest.clean();
    }
    return voice;
  }

  _envelope(gain, time, duration, volume, attack, decay = .65) {
    const level = clamp(volume, SILENCE, .18);
    gain.gain.setValueAtTime(SILENCE, time);
    gain.gain.exponentialRampToValueAtTime(level, time + attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(SILENCE, level * decay), time + Math.max(attack + .01, duration * .32));
    gain.gain.exponentialRampToValueAtTime(SILENCE, time + duration);
  }

  _oscillator(freq, time, duration, volume, kind = 'keys') {
    if (!this._canPlay() || !Number.isFinite(freq) || freq <= 0 || !Number.isFinite(time) || !Number.isFinite(duration) || !Number.isFinite(volume) || volume <= 0) return;
    time = Math.max(this.ac.currentTime + .002, time);
    duration = clamp(duration, .06, 8);
    const source = this.ac.createOscillator(), gain = this.ac.createGain();
    const wave = kind === 'bass' ? this._bassWave : kind === 'keys' ? this._keysWave : null;
    if (wave && source.setPeriodicWave) source.setPeriodicWave(wave);
    else source.type = ['sine', 'triangle', 'sawtooth', 'square'].includes(kind) ? kind : kind === 'bass' ? 'sine' : 'triangle';
    source.frequency.setValueAtTime(clamp(freq, 28, 5000), time);
    this._envelope(gain, time, duration, volume, kind === 'pad' ? .38 : kind === 'bass' ? .035 : .018, kind === 'pad' ? .85 : .48);
    source.connect(gain);
    gain.connect(this.output);
    this._track(source, gain, time, duration + .04);
    source.start(time);
    source.stop(time + duration + .04);
  }

  _pluck(midi, time, duration = 1.7, volume = .065) {
    if (!this._canPlay() || !Number.isFinite(midi) || !Number.isFinite(time) || !Number.isFinite(duration) || !Number.isFinite(volume) || volume <= 0) return;
    if (!this.ac.createBufferSource) return this._oscillator(hz(midi), time, duration, volume * .6, 'keys');
    const string = this._strings[midi < 64 ? 0 : 1];
    const source = this.ac.createBufferSource(), gain = this.ac.createGain();
    const rate = hz(clamp(midi, 38, 90)) / string.frequency;
    source.buffer = string.buffer;
    time = Math.max(this.ac.currentTime + .002, time);
    source.playbackRate.setValueAtTime(rate, time);
    duration = clamp(duration, .1, Math.min(4, 2.78 / rate));
    this._envelope(gain, time, duration, volume, .004, .47);
    source.connect(gain);
    gain.connect(this.output);
    this._track(source, gain, time, duration + .025);
    source.start(time);
    source.stop(time + duration + .025);
  }

  // Public legacy helper is also used by the little exploratory sound effects.
  tone(freq, time, duration, volume, type = 'sine') { this._oscillator(freq, time, duration, volume, type); }

  _chord(notes, time, duration, volume, strum = false) {
    notes.slice(1).forEach((note, i) => {
      this._oscillator(hz(note), time + i * .018, duration, volume, 'keys');
      if (strum) this._pluck(note, time + .018 + i * .034, 1.9, volume * 1.5);
    });
  }

  _localAt(time) { return Math.max(0, this.story.local + time - this._storyAudioTime); }

  schedule() {
    if (!this._canPlay() || this.phase === 'intro') return;
    const now = this.ac.currentTime;
    for (const voice of this._voices) if (voice.end < now - .1) voice.clean();
    if (this.next < now - .05) this.next = now + .035;
    // Bound recovery work after a sleeping tab; never catch up missed music.
    for (let i = 0; i < 3 && this.next < now + .19; i++) {
      this.play(this.beat++, this.next);
      this.next += STEP;
    }
  }

  play(beat, time) {
    if (!this._canPlay() || this.phase === 'intro' || !Number.isFinite(beat) || !Number.isFinite(time)) return;
    const chords = CHORDS[this.phase];
    if (!chords) return;
    const n = ((beat % 8) + 8) % 8, bar = Math.floor(beat / 8);
    const chord = chords[bar % chords.length], local = this._localAt(time);
    const isFinal = this.phase === 'final';
    if (this.phase === 'fracture' && local >= 13.65) {
      if (!this._breathIssued) {
        this._breathIssued = true;
        [62, 69, 73, 76].forEach(note => this._oscillator(hz(note), time, 5.2, .009, 'pad'));
        this._oscillator(hz(50), time, 4.8, .023, 'bass');
      }
      return;
    }
    const quiet = this.phase === 'snow' || isFinal;
    const fracture = this.phase === 'fracture';
    const bloom = this.phase === 'bloom';
    const photo = this.phase === 'photo';
    const lateFinal = isFinal && local > 23;
    const breath = fracture ? clamp(1 - Math.max(0, local - 8) / 9, .28, 1) : 1;
    const level = breath * (lateFinal ? .74 : 1);
    if (n === 0) {
      this._chord(chord, time, bloom ? 3.4 : quiet ? 3.7 : fracture ? 3.5 : 2.65,
        (bloom ? .035 : quiet ? .014 : fracture ? .013 : photo ? .017 : .021) * level, bloom);
      this._oscillator(hz(chord[0] < 43 ? chord[0] : chord[0] - 12), time,
        quiet ? 2.7 : 1.9, (bloom ? .077 : quiet ? .036 : fracture ? .039 : .051) * level, 'bass');
    }
    if (n === 4 && !quiet && !fracture) this._oscillator(hz(chord[0] - 5), time, 1.2, (bloom ? .042 : .027), 'bass');

    const arp = quiet ? [0, 3, 6] : fracture ? [0, 4] : photo ? [0, 3, 5, 7] : [0, 2, 3, 4, 6, 7];
    if (arp.includes(n) && !(lateFinal && bar % 2 === 1 && n !== 0)) {
      const index = [0, 2, 1, 3, 2, 4, 1, 3][n];
      const note = chord[index] + (index === 0 ? 12 : 0);
      this._pluck(note, time + (n % 2 ? .018 : 0), quiet ? 2.25 : 1.7,
        (bloom ? .069 : quiet ? .038 : fracture ? .035 : photo ? .055 : .058) * level);
    }

    let phrase = THEME[bar % THEME.length];
    if (photo) phrase = [[[0, 69], [4, 73], [7, 71]], [[1, 74], [4, 71], [6, 69]], [[0, 66], [3, 69], [6, 71]], [[0, 69], [5, 64], [7, 66]]][bar % 4];
    if (fracture) phrase = [[[0, 66], [6, 64]], [[2, 62]], [[0, 64], [5, 66]], [[0, 64]]][bar % 4];
    if (quiet) phrase = [[[1, 69], [6, 66]], [[3, 64]], [[0, 66], [5, 64]], [[2, 62]]][bar % 4];
    if (bloom) phrase = [[[0, 78], [2, 76], [3, 74], [5, 73], [6, 69]], [[0, 74], [2, 76], [4, 78], [6, 81]], [[0, 78], [3, 76], [4, 73], [6, 74]]][bar % 3];
    if (lateFinal && bar % 4 > 1) phrase = [];
    const note = phrase.find(([position]) => position === n)?.[1];
    if (note !== undefined) {
      this._pluck(note, time + .018, bloom ? 2.0 : quiet ? 2.5 : 1.9,
        (bloom ? .117 : quiet ? .052 : fracture ? .045 : photo ? .071 : .084) * level);
      if (bloom) this._oscillator(hz(note - 12), time + .025, 2.35, .025, 'keys');
      else if (!fracture && !quiet && !photo && bar > 1) this._oscillator(hz(note), time + .035, 1.25, .014, 'keys');
    }
    // The photobomb gets two light, slightly off-beat answers rather than a jingle.
    if (photo && local > 6 && local < 9 && n === 7) this._pluck(81, time + .11, .7, .032);
    if (bloom && n === 0) this._oscillator(hz(chord[3] + 24), time + .10, 2.8, .008, 'sine');
  }

  setScene(phase) {
    if (!(phase === 'intro' || CHORDS[phase]) || phase === this.phase) return;
    this.phase = phase;
    this.story = { phase, local: 0 };
    this._storyAudioTime = this.ac?.currentTime || 0;
    this.beat = 0;
    this._breathIssued = false;
    if (this.ac) {
      this._releaseVoices(phase === 'bloom' ? .32 : .65);
      this.next = this.ac.currentTime + .07;
    }
    this.sync();
  }

  updateStory(story) {
    if (!story || !Number.isFinite(story.local)) return;
    if (story.phase !== this.phase) this.setScene(story.phase);
    this.story = { phase: this.phase, local: Math.max(0, story.local) };
    this._storyAudioTime = this.ac?.currentTime || 0;
  }

  _releaseVoices(duration = .18) {
    if (!this.ac) return;
    const time = this.ac.currentTime;
    for (const voice of this._voices) {
      try {
        const p = voice.gain.gain;
        // A future source has not reached its first .0001 automation point;
        // holding its default gain of 1 would turn a transition into a loud pop.
        if (voice.time > time) {
          p.cancelScheduledValues(time);
          p.setValueAtTime(SILENCE, time);
          voice.source.stop(time + .01);
          voice.end = time + .01;
          continue;
        }
        if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(time);
        else {
          const value = Math.max(SILENCE, p.value);
          p.cancelScheduledValues(time);
          p.setValueAtTime(value, time);
        }
        p.exponentialRampToValueAtTime(SILENCE, time + duration);
        voice.source.stop(time + duration + .025);
        voice.end = time + duration + .025;
      } catch { voice.clean(); }
    }
  }

  chime(kind) {
    if (!this._canPlay() || this.ac.currentTime - this._lastChime < .095) return;
    this._lastChime = this.ac.currentTime;
    const note = { badger: 74, bear: 69, lamp: 78, flower: 81, record: 73, light: 86 }[kind] || 74;
    this._pluck(note, this.ac.currentTime + .01, 1.3, .056);
    this._oscillator(hz(note - 12), this.ac.currentTime + .045, 1.35, .015, 'keys');
  }

  shutter() {
    if (!this._canPlay() || !this.ac.createBufferSource) return;
    const ac = this.ac, duration = .052;
    if (!this._shutterBuffer) {
      const b = ac.createBuffer(1, Math.ceil(ac.sampleRate * duration), ac.sampleRate);
      const a = b.getChannelData(0), noise = random(1901);
      for (let i = 0; i < a.length; i++) {
        const t = i / ac.sampleRate;
        a[i] = noise() * (Math.exp(-t * 180) + (t > .025 ? .6 * Math.exp(-(t - .025) * 220) : 0));
      }
      this._shutterBuffer = b;
    }
    const source = ac.createBufferSource(), gain = ac.createGain(), time = ac.currentTime + .002;
    source.buffer = this._shutterBuffer;
    gain.gain.value = .075;
    source.connect(gain);
    gain.connect(this.output);
    this._track(source, gain, time, duration + .01);
    source.start(time);
    source.stop(time + duration + .01);
  }

  toggle() {
    if (!this.ac || this.ac.state === 'closed') {
      this.muted = false;
      return this.unlock();
    }
    if (this.muted || this.ac.state !== 'running') {
      this.muted = false;
      this.master.gain.setTargetAtTime(MASTER, this.ac.currentTime, .12);
      return this.resume();
    }
    this.muted = true;
    this.master.gain.setTargetAtTime(0, this.ac.currentTime, .08);
    this._releaseVoices(.18);
    this.sync();
    return Promise.resolve(false);
  }

  suspend() {
    this._stopScheduler();
    this.active = false;
    if (!this.ac || this.ac.state === 'closed') { this.sync(); return Promise.resolve(false); }
    try {
      return Promise.resolve(this.ac.suspend()).then(() => { this.sync(); return false; }).catch(() => { this.sync(); return false; });
    } catch { this.sync(); return Promise.resolve(false); }
  }

  resume() {
    if (!this.ac || this.muted || this.ac.state === 'closed') { this.sync(); return Promise.resolve(false); }
    if (this.ac.state === 'running') { this.sync(); return Promise.resolve(true); }
    if (this._resumePromise) return this._resumePromise;
    // A suspended AudioContext freezes its clock and its already scheduled
    // notes. Keep that position so recovery cannot stack two eighth notes.
    this.next = Math.max(this.next, this.ac.currentTime + .06);
    try {
      this._resumePromise = Promise.resolve(this.ac.resume()).then(() => {
        this.sync();
        return this.active;
      }).catch(() => { this.sync(); return false; }).finally(() => { this._resumePromise = null; });
      return this._resumePromise;
    } catch { this.sync(); return Promise.resolve(false); }
  }

  restart() {
    this._releaseVoices(.24);
    this.beat = 0;
    this.phase = 'intro';
    this.story = { phase: 'intro', local: 0 };
    this._storyAudioTime = this.ac?.currentTime || 0;
    this._breathIssued = false;
    this._lastChime = -Infinity;
    if (this.ac) this.next = this.ac.currentTime + .06;
    this.sync();
  }

  dispose() {
    this._stopScheduler();
    for (const voice of this._voices) { try { voice.source.stop(); } catch { /* ended */ } voice.clean(); }
    for (const node of this._graph) { try { node.disconnect(); } catch { /* already disconnected */ } }
    this._graph.length = 0;
    if (this.ac) {
      this.ac.onstatechange = null;
      try { Promise.resolve(this.ac.close?.()).catch(() => {}); } catch { /* already closed */ }
    }
    this.ac = null;
    this.active = false;
    this.sync();
  }
}

export const createScore = options => new Soundtrack(options);
