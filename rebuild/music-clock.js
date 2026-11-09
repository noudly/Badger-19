const finiteTime = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/**
 * The recording owns story time while it can play. Silent viewing owns time
 * before permission, during explicit mute, or when the source is unavailable.
 * This class reads snapshots only; it never calls play(), seeks, or loops audio.
 */
export class MusicClock {
  constructor({ duration = 380.108 } = {}) {
    if (!finiteTime(duration) || duration === 0) {
      throw new TypeError('MusicClock duration must be a finite positive number');
    }
    this._duration = duration;
    this.reset();
  }

  get time() { return this._time; }

  reset(time = 0) {
    this._time = finiteTime(time) ? time : 0;
    this._hasPlayed = false;
    return this._time;
  }

  update(dt, playback = {}, { paused = false } = {}) {
    const state = playback && typeof playback === 'object' ? playback : {};
    const step = typeof dt === 'number' && Number.isFinite(dt) && dt > 0 ? dt : 0;
    if (finiteTime(state.duration) && state.duration > 0) this._duration = state.duration;

    // A hidden tab or unavailable WebGL context cannot consume story moments.
    if (paused || state.suspended) return this._time;

    const mediaTime = finiteTime(state.time) ? state.time : null;
    const silent = !state.unlocked || state.blocked || state.muted || state.unavailable;
    // The source can expose a pending alignment as a seek before metadata is
    // ready. A denied or failed source must not trap silent viewing at that
    // pending target; a subsequent permitted gesture will align it again.
    if (state.seeking && !silent) {
      if (mediaTime !== null) this._time = mediaTime;
      return this._time;
    }

    if (state.ended) {
      this._time = Math.max(this._time, this._duration, mediaTime ?? 0);
      return this._advance(step);
    }

    if (silent) return this._advance(step);

    // Once a gesture starts loading audio, hold its aligned frame as well as
    // later buffering frames. Advancing here would rewind the story when the
    // delayed recording finally starts from that earlier alignment target.
    if (state.waiting) return this._time;

    if (state.playing && !state.waiting && mediaTime !== null) {
      this._hasPlayed = true;
      this._time = mediaTime;
      return this._time;
    }

    // Initial loading has not yet established an audio clock. Later pauses or
    // unreadable active samples preserve the last synchronized frame instead.
    return this._hasPlayed ? this._time : this._advance(step);
  }

  _advance(step) {
    const next = this._time + step;
    this._time = Number.isFinite(next) ? next : Number.MAX_VALUE;
    return this._time;
  }
}

