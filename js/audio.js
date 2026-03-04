'use strict';

/**
 * AudioManager — procedural sound effects via Web Audio API.
 * No audio files needed. All sounds generated mathematically.
 * Best practice: lazy AudioContext init, per-sound throttling,
 * master gain node, graceful failure on unsupported browsers.
 */
class AudioManager {
  constructor() {
    this._ctx        = null;
    this._out        = null;   // master gain → destination
    this.enabled     = true;
    // Per-sound last-played timestamps (ms) — prevent spam
    this._ts = {};
  }

  // ── Internal helpers ──────────────────────────────────────

  /** Lazily create AudioContext on first sound request */
  _getCtx() {
    if (this._ctx) return this._ctx;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._out = this._ctx.createGain();
      this._out.gain.value = 0.72;
      this._out.connect(this._ctx.destination);
    } catch (_) { return null; }
    return this._ctx;
  }

  /** Resume if browser suspended the context (requires user gesture) */
  _resume(ctx) {
    if (ctx.state === 'suspended') ctx.resume();
  }

  /**
   * Schedule fn(ctx, out, now) safely.
   * @param {string} id   — throttle key
   * @param {number} minMs — minimum ms between plays (0 = no throttle)
   */
  _play(id, minMs, fn) {
    if (!this.enabled) return;
    const now = Date.now();
    if (minMs > 0 && now - (this._ts[id] || 0) < minMs) return;
    this._ts[id] = now;
    const ctx = this._getCtx();
    if (!ctx) return;
    this._resume(ctx);
    try { fn(ctx, this._out, ctx.currentTime); } catch (_) {}
  }

  /** Build a white-noise AudioBuffer of the given duration */
  _noiseBuffer(ctx, secs) {
    const n   = Math.ceil(ctx.sampleRate * secs);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const ch  = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ── Public sounds ─────────────────────────────────────────

  /**
   * Gunshot. type: 'gun' | 'shotgun' | 'melee' | 'flame' | 'burst' | 'rocket'
   */
  shoot(type = 'gun') {
    this._play('shoot', 55, (ctx, out, t) => {
      if (type === 'melee') {
        // Swish — band-pass noise sweep
        const src  = ctx.createBufferSource();
        const filt = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        src.buffer = this._noiseBuffer(ctx, 0.18);
        filt.type  = 'bandpass'; filt.frequency.setValueAtTime(2000, t); filt.Q.value = 0.7;
        filt.frequency.exponentialRampToValueAtTime(500, t + 0.18);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        src.connect(filt); filt.connect(gain); gain.connect(out);
        src.start(t); src.stop(t + 0.18);
        return;
      }

      if (type === 'flame') {
        // Low rumbling whoosh
        const src  = ctx.createBufferSource();
        const filt = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        src.buffer = this._noiseBuffer(ctx, 0.2);
        filt.type  = 'lowpass'; filt.frequency.value = 500;
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        src.connect(filt); filt.connect(gain); gain.connect(out);
        src.start(t); src.stop(t + 0.2);
        return;
      }

      if (type === 'rocket') {
        // Deep whoosh + boom
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type   = 'sawtooth';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.35);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
        osc.connect(gain); gain.connect(out);
        osc.start(t); osc.stop(t + 0.38);
        return;
      }

      // gun / shotgun / burst — noise crack + low oscillator thud
      const vol   = type === 'shotgun' ? 0.3 : 0.18;
      const dur   = type === 'shotgun' ? 0.11 : 0.08;

      const nSrc  = ctx.createBufferSource();
      const nFilt = ctx.createBiquadFilter();
      const nGain = ctx.createGain();
      nSrc.buffer = this._noiseBuffer(ctx, dur + 0.02);
      nFilt.type  = 'highpass'; nFilt.frequency.value = 1400;
      nGain.gain.setValueAtTime(vol, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      nSrc.connect(nFilt); nFilt.connect(nGain); nGain.connect(out);
      nSrc.start(t); nSrc.stop(t + dur + 0.02);

      const osc  = ctx.createOscillator();
      const oGain = ctx.createGain();
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.09);
      oGain.gain.setValueAtTime(0.24, t);
      oGain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      osc.connect(oGain); oGain.connect(out);
      osc.start(t); osc.stop(t + 0.11);
    });
  }

  /** Enemy killed — satisfying downward pitch drop */
  kill() {
    this._play('kill', 70, (ctx, out, t) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type   = 'triangle';
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(85, t + 0.13);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain); gain.connect(out);
      osc.start(t); osc.stop(t + 0.15);
    });
  }

  /** Buy weapon / vehicle — cash register cha-ching */
  buy() {
    this._play('buy', 200, (ctx, out, t) => {
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type   = 'sine';
        osc.frequency.value = freq;
        const st = t + i * 0.07;
        gain.gain.setValueAtTime(0, st);
        gain.gain.linearRampToValueAtTime(0.14, st + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.2);
        osc.connect(gain); gain.connect(out);
        osc.start(st); osc.stop(st + 0.2);
      });
    });
  }

  /** Buy upgrade — shimmering ascending arpeggio */
  upgrade() {
    this._play('upgrade', 300, (ctx, out, t) => {
      [330, 415, 523, 659, 880].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type   = 'sine';
        osc.frequency.value = freq;
        const st = t + i * 0.058;
        gain.gain.setValueAtTime(0.11, st);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.24);
        osc.connect(gain); gain.connect(out);
        osc.start(st); osc.stop(st + 0.24);
      });
    });
  }

  /** Grenade / vehicle explosion — sub-bass thud + noise burst */
  explosion() {
    this._play('explosion', 180, (ctx, out, t) => {
      // Sub-bass
      const sub   = ctx.createOscillator();
      const sGain = ctx.createGain();
      sub.frequency.setValueAtTime(90, t);
      sub.frequency.exponentialRampToValueAtTime(18, t + 0.45);
      sGain.gain.setValueAtTime(0.7, t);
      sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
      sub.connect(sGain); sGain.connect(out);
      sub.start(t); sub.stop(t + 0.48);
      // Noise burst
      const src  = ctx.createBufferSource();
      const filt = ctx.createBiquadFilter();
      const nGain = ctx.createGain();
      src.buffer  = this._noiseBuffer(ctx, 0.5);
      filt.type   = 'lowpass'; filt.frequency.value = 1400;
      nGain.gain.setValueAtTime(0.5, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      src.connect(filt); filt.connect(nGain); nGain.connect(out);
      src.start(t); src.stop(t + 0.5);
    });
  }

  /** Pickup collected (health, money, ammo) — quick two-note chime */
  pickup() {
    this._play('pickup', 120, (ctx, out, t) => {
      [880, 1320].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type   = 'sine';
        osc.frequency.value = freq;
        const st = t + i * 0.09;
        gain.gain.setValueAtTime(0.11, st);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.2);
        osc.connect(gain); gain.connect(out);
        osc.start(st); osc.stop(st + 0.2);
      });
    });
  }

  /** Enter or buy vehicle — engine rev */
  vehicle() {
    this._play('vehicle', 300, (ctx, out, t) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type   = 'sawtooth';
      osc.frequency.setValueAtTime(55, t);
      osc.frequency.exponentialRampToValueAtTime(230, t + 0.28);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.5);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.connect(gain); gain.connect(out);
      osc.start(t); osc.stop(t + 0.55);
    });
  }

  /** Grenade throw — short high whoosh */
  grenadeThrow() {
    this._play('grenadeThrow', 100, (ctx, out, t) => {
      const src  = ctx.createBufferSource();
      const filt = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      src.buffer = this._noiseBuffer(ctx, 0.14);
      filt.type  = 'bandpass';
      filt.frequency.setValueAtTime(2400, t);
      filt.frequency.exponentialRampToValueAtTime(400, t + 0.14);
      filt.Q.value = 0.8;
      gain.gain.setValueAtTime(0.13, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      src.connect(filt); filt.connect(gain); gain.connect(out);
      src.start(t); src.stop(t + 0.14);
    });
  }

  /** Phantom bullet dodge — phase sweep */
  dodge() {
    this._play('dodge', 80, (ctx, out, t) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type   = 'sine';
      osc.frequency.setValueAtTime(500, t);
      osc.frequency.exponentialRampToValueAtTime(1600, t + 0.11);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      osc.connect(gain); gain.connect(out);
      osc.start(t); osc.stop(t + 0.13);
    });
  }

  /** Wave / level up fanfare */
  waveUp() {
    this._play('waveUp', 1000, (ctx, out, t) => {
      [330, 440, 660].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type   = 'square';
        osc.frequency.value = freq;
        const st = t + i * 0.1;
        gain.gain.setValueAtTime(0.07, st);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.28);
        osc.connect(gain); gain.connect(out);
        osc.start(st); osc.stop(st + 0.28);
      });
    });
  }
}

window.audio = new AudioManager();
