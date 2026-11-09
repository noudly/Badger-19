import { Soundtrack as OriginalEffects } from './score.js';

export const SONG_SOURCE = './assets/audio/hao-bu-rong-yi.mp3';
export const SONG_TITLE = '方大同《好不容易》';

// Reuse the little interaction sounds, never the temporary background score.
// Keeping both entry points disabled also protects against future scene changes.
class EffectsOnly extends OriginalEffects {
  _startScheduler() {}
  schedule() {}
  setScene() {}
  updateStory() {}
}

const quietly = callback => {
  try { callback?.()?.catch?.(() => {}); } catch { /* UI must not stop the story. */ }
};

/** A continuous recording; story scenes neither seek nor replace the song. */
export class SongSoundtrack {
  constructor({ button = null, statusElement = null, source = SONG_SOURCE,
    title = SONG_TITLE, Audio = globalThis.Audio, effects = null,
    AudioContext = null, reducedMotion = false, volume = .78,
    onUnavailable = null, onStateChange = null } = {}) {
    this.button = button;
    this.statusElement = statusElement;
    this.title = title;
    this.source = source;
    this.Audio = Audio;
    this.volume = Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : .78));
    this.onUnavailable = onUnavailable;
    this.onStateChange = onStateChange;
    this.effects = effects || new EffectsOnly({ AudioContext, reducedMotion });
    this.audio = null;
    this.phase = 'intro';
    this.story = { phase: 'intro', local: 0 };
    this.active = false;
    this.muted = false;
    this.unavailable = false;
    this.blocked = false;
    this.loaded = false;
    this._unlocked = false;
    this._completed = false;
    this._waiting = false;
    this._pendingAlignment = null;
    this._suspended = false;
    this._disposed = false;
    this._revision = 0;
    this._playRequest = 0;
    this._playPromise = null;
    this._listeners = [];
    this._lastState = '';
    this._createAudio();
    this.sync();
  }

  get ac() { return this.effects?.ac || null; }

  // Read-only timing metadata for the music-led director timeline.
  get playback() {
    const a=this.audio;
    return Object.freeze({time:this._pendingAlignment ?? (Number.isFinite(a?.currentTime)?a.currentTime:0),
      duration:Number.isFinite(a?.duration)&&a.duration>0?a.duration:null,
      loaded:this.loaded,playing:this.active,muted:this.muted,ended:this._completed,
      seeking:!!a?.seeking || this._pendingAlignment !== null,unavailable:this.unavailable,
      unlocked:this._unlocked,blocked:this.blocked,waiting:this._waiting,suspended:this._suspended});
  }

  get state() {
    const status = this.unavailable ? 'unavailable' : this._completed ? 'ended' : this.muted ? 'muted' : this._waiting ? 'waiting' :
      this.active ? 'playing' : this.blocked ? 'blocked' : this.loaded ? 'paused' : 'loading';
    const label = this.unavailable ? '音乐未载入' : this.muted ? '音乐已关闭' :
      this.active ? this.title : this.blocked ? '音乐等待开启' : this.title;
    return Object.freeze({ status, label, title: this.title, active: this.active,
      muted: this.muted, unavailable: this.unavailable, loaded: this.loaded });
  }

  _createAudio() {
    if (!this.Audio || !this.source) { this._markUnavailable(); return; }
    const revision = ++this._revision;
    try {
      const audio = this.audio = new this.Audio();
      audio.preload = 'metadata';
      audio.loop = false;
      audio.playsInline = true;
      audio.setAttribute?.('playsinline', '');
      audio.volume = this.volume;
      audio.muted = this.muted;
      const listen = (event, callback) => {
        const listener = () => {
          if (!this._disposed && revision === this._revision && audio === this.audio) callback();
        };
        audio.addEventListener(event, listener);
        this._listeners.push([audio, event, listener]);
      };
      listen('playing', () => {
        this._applyAlignment();
        if (this._completed) { audio.pause(); this.sync(); return; }
        this.loaded = true; this.unavailable = false; this.blocked = false; this._waiting = false;
        this.sync();
      });
      listen('loadedmetadata', () => { this._applyAlignment(); this.sync(); });
      listen('durationchange', () => { this._applyAlignment(); this.sync(); });
      listen('canplay', () => { this._applyAlignment(); this.loaded = true; this._waiting = false; this.sync(); });
      listen('waiting', () => { this._waiting = true; this.sync(); });
      // A stalled network request need not interrupt already-buffered audio.
      listen('stalled', () => {
        if (!audio.paused && Number.isFinite(audio.readyState) && audio.readyState < 3) this._waiting = true;
        this.sync();
      });
      listen('seeked', () => { this._waiting = false; this.sync(); });
      listen('pause', () => { this._waiting = false; this.sync(); });
      listen('ended', () => {this._completed=true;this._waiting=false;this._pendingAlignment=null;this.sync();});
      listen('error', () => this._markUnavailable());
      listen('emptied', () => { this.loaded = false; this._waiting = false; this.sync(); });
      audio.src = this.source;
      // Metadata preloading lets a missing recording be reported before the
      // first touch. Playback itself is only requested by a user gesture.
      audio.load?.();
    } catch { this._markUnavailable(); }
  }

  _markUnavailable() {
    if (this._disposed) return;
    const first = !this.unavailable;
    this.unavailable = true;
    this.loaded = false;
    this.blocked = false;
    this._waiting = false;
    this.active = false;
    this.sync();
    if (first) quietly(() => this.onUnavailable?.(this.state));
  }

  sync() {
    this.active = !!this.audio && !this.audio.paused && !this.audio.ended &&
      !this.muted && !this._completed && !this._waiting && !this._suspended && !this.unavailable && !this._disposed;
    const state = this.state;
    this.button?.classList?.toggle('playing', this.active);
    this.button?.classList?.toggle('unavailable', this.unavailable);
    const action = this.unavailable ? '音乐未载入' : this._completed ? '重播音乐' : this.active ? '关闭音乐' : '开启音乐';
    this.button?.setAttribute('aria-label', `${action}：${this.title}`);
    this.button?.setAttribute('aria-pressed', String(this.active));
    this.button?.setAttribute('data-music-state', state.status);
    this.button?.setAttribute('title', `${action} · ${this.title}`);
    if (this.statusElement) {
      this.statusElement.textContent = state.label;
      this.statusElement.hidden = !this.unavailable;
    }
    const signature = JSON.stringify(state);
    if (signature !== this._lastState) {
      this._lastState = signature;
      quietly(() => this.onStateChange?.(state));
    }
    return state;
  }

  _play() {
    if (this._disposed || !this.audio || this.muted || this._suspended || this.unavailable || this._completed) {
      this.sync(); return Promise.resolve(false);
    }
    if (this._playPromise) return this._playPromise;
    if (!this.audio.paused && !this.audio.ended) { this.sync(); return Promise.resolve(true); }
    const audio = this.audio, revision = this._revision, request = ++this._playRequest;
    let result;
    try {
      if (Number.isFinite(audio.readyState) && audio.readyState < 3) this._waiting = true;
      // Intentionally before Promise.resolve/await: Safari needs this call
      // inside the original pointer or keyboard gesture.
      result = audio.play();
    } catch (error) { result = Promise.reject(error); }
    const current = () => !this._disposed && revision === this._revision && request === this._playRequest;
    const promise = Promise.resolve(result).then(() => {
      if (!current()) return false;
      if (this._completed) audio.pause();
      this.blocked = false;
      this.sync();
      return this.active;
    }).catch(error => {
      if (!current()) return false;
      if (error?.name === 'NotAllowedError') { this.blocked = true; this._waiting = false; }
      else if (error?.name !== 'AbortError') this._markUnavailable();
      this.sync();
      return false;
    }).finally(() => { if (this._playPromise === promise) this._playPromise = null; });
    this._playPromise = promise;
    this.sync();
    return promise;
  }

  /** Align a deliberate start/resume to the visual story. Metadata may arrive
   * after a touch, so retain the target until the media element accepts it.
   * This method never starts playback and cannot revive a completed song. */
  align(time) {
    if (this._disposed || this._completed || !this.audio || typeof time !== 'number' || !Number.isFinite(time)) return false;
    this._pendingAlignment = Math.max(0, time);
    this._applyAlignment();
    return true;
  }

  _applyAlignment() {
    if (this._pendingAlignment === null || !this.audio || this._disposed) return false;
    const audio = this.audio;
    if (typeof audio.readyState === 'number' && audio.readyState < 1) return false;
    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : Infinity;
    const target = Math.min(this._pendingAlignment, duration);
    try {
      audio.currentTime = target;
      this._pendingAlignment = null;
      if (Number.isFinite(duration) && target >= duration) {
        // A first touch after the entire silent story must not start a new
        // prelude. Keep this recording at its end and let quiet exploration run.
        this._completed = true;
        this._waiting = false;
        audio.pause();
      }
      return true;
    } catch { return false; }
  }

  _alignWhenInactive(time) {
    if (this.active || this.muted || this._waiting || this._playPromise || this._completed ||
      typeof time !== 'number' || !Number.isFinite(time)) return;
    const current = this._pendingAlignment ?? this.audio?.currentTime ?? 0;
    if (!Number.isFinite(current) || Math.abs(Math.max(0, time) - current) > .3) this.align(time);
  }

  unlock(time) {
    if (this._disposed) return Promise.resolve(false);
    this._alignWhenInactive(time);
    this._unlocked = true;
    // Main resumes automatically only if music was already playing. A fresh
    // visible gesture can also recover a page hidden before its first touch.
    if (globalThis.document?.hidden !== true) this._suspended = false;
    // Call the recording first so building the small SFX graph cannot consume
    // the browser's transient playback permission.
    const playing = this._play();
    if (!this.muted && !this._suspended) quietly(() => this.effects?.unlock());
    return playing;
  }

  toggle(time) {
    if (this._disposed) return Promise.resolve(false);
    const replaying = this._completed;
    if(replaying){this._completed=false;this.align(0);}
    if (!replaying && (this.active || this._waiting && !this.muted && !this._suspended || this._playPromise && !this.muted && !this._suspended)) {
      this.muted = true;
      if (this.audio) this.audio.muted = true;
      this._pause();
      if (this.effects && !this.effects.muted) quietly(() => this.effects.toggle());
      this.sync();
      return Promise.resolve(false);
    }
    this.muted = false;
    this._suspended = false;
    if (this.audio) this.audio.muted = false;
    if (this.effects?.muted) quietly(() => this.effects.toggle());
    if (this.unavailable) return this.setSource(this.source, { autoplay: true, time });
    return this.unlock(replaying ? undefined : time);
  }

  _pause() {
    ++this._playRequest;
    this._playPromise = null;
    this._waiting = false;
    try { this.audio?.pause(); } catch { /* a failed source can still be paused */ }
    this.sync();
  }

  suspend() {
    this._suspended = true;
    this._pause();
    quietly(() => this.effects?.suspend());
    return Promise.resolve(false);
  }

  resume() {
    this._suspended = false;
    if (!this._unlocked || this.muted || this._disposed) { this.sync(); return Promise.resolve(false); }
    const playing = this._play();
    quietly(() => this.effects?.resume());
    return playing;
  }

  restart() {
    this._completed=false;
    this._waiting=false;
    this.phase = 'intro';
    this.story = { phase: 'intro', local: 0 };
    this.align(0);
    quietly(() => this.effects?.restart());
    // A replay preserves the listener's mute and background-pause choices.
    if (this._unlocked && !this.muted && !this._suspended) return this._play();
    this.sync();
    return Promise.resolve(false);
  }

  setScene(phase) { if (typeof phase === 'string') this.phase = phase; }
  updateStory(story) {
    if (!story || !Number.isFinite(story.local)) return;
    this.setScene(story.phase);
    this.story = { phase: this.phase, local: Math.max(0, story.local) };
  }
  chime(kind) { if (!this.muted && !this._suspended) quietly(() => this.effects?.chime(kind)); }
  shutter() { if (!this.muted && !this._suspended) quietly(() => this.effects?.shutter()); }

  /** Accepts a provided local blob URL as well as a deployment-relative URL.
   * The caller owns blob lifetime; a selected local file is never uploaded. */
  setSource(source, { autoplay = this._unlocked && !this.muted && !this._suspended, time } = {}) {
    if (this._disposed) return Promise.resolve(false);
    this._pause();
    for (const [audio, event, listener] of this._listeners) audio.removeEventListener(event, listener);
    this._listeners.length = 0;
    try { this.audio?.removeAttribute?.('src'); this.audio?.load?.(); } catch { /* release the former source */ }
    ++this._revision;
    this.audio = null;
    this.source = typeof source === 'string' ? source.trim() : '';
    this._completed=false;
    this._waiting=false;
    this._pendingAlignment=null;
    this.unavailable = false;
    this.loaded = false;
    this.blocked = false;
    this._createAudio();
    this.sync();
    return autoplay ? this.unlock(time) : Promise.resolve(false);
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this._pause();
    for (const [audio, event, listener] of this._listeners) audio.removeEventListener(event, listener);
    this._listeners.length = 0;
    try { this.audio?.removeAttribute?.('src'); this.audio?.load?.(); } catch { /* already disposed */ }
    quietly(() => this.effects?.dispose());
    this.sync();
  }
}

export const createSong = options => new SongSoundtrack(options);
