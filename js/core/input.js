'use strict';

/**
 * @file input.js
 * Centralised input abstraction for keyboard, mouse, and touch controls.
 *
 * Usage:
 *   const input = new InputManager(canvas);
 *   // each frame:
 *   input.updateMouseWorld(camX, camY);   // converts screen → world coords
 *   if (input.isDown('KeyW')) { ... }     // keyboard / virtual joystick
 *   if (input.mouseDown)     { ... }      // held fire
 *   if (input.mouseJustDown) { ... }      // single-frame click
 *   input.flush();                         // call at end of frame
 *
 * Mobile:
 *   - Left half → virtual joystick (#joystickZone / #joystickKnob)
 *   - Right half → aim + fire via touch
 *   - Action buttons (#touchButtons) inject virtual key presses
 */
class InputManager {
  constructor(canvas) {
    this.keys = new Set();
    this._virtualKeys = new Set();   // keys injected by touch controls
    this.mouseWorld = new Vec2();
    this.mouseScreen = new Vec2();
    this.mouseDown = false;
    this.mouseJustDown = false;
    this._canvas = canvas;

    // ── Keyboard ─────────────────────────────────────────────
    window.addEventListener('keydown', e => {
      this.keys.add(e.code);
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));

    // ── Mouse ────────────────────────────────────────────────
    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      this.mouseScreen.set(e.clientX - r.left, e.clientY - r.top);
    });
    canvas.addEventListener('mousedown', e => {
      if (e.button === 0) { this.mouseDown = true; this.mouseJustDown = true; }
    });
    canvas.addEventListener('mouseup', e => {
      if (e.button === 0) this.mouseDown = false;
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // ── Touch auto-aim (right half of screen = fire toward touch) ──
    canvas.addEventListener('touchstart', e => {
      const r = canvas.getBoundingClientRect();
      for (const t of e.changedTouches) {
        const cx = t.clientX - r.left, cy = t.clientY - r.top;
        // Right half of screen = aim + fire
        if (cx > canvas.width * 0.45) {
          this.mouseScreen.set(cx, cy);
          this.mouseDown = true; this.mouseJustDown = true;
        }
      }
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
      const r = canvas.getBoundingClientRect();
      for (const t of e.changedTouches) {
        const cx = t.clientX - r.left, cy = t.clientY - r.top;
        if (cx > canvas.width * 0.45) this.mouseScreen.set(cx, cy);
      }
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
      let anyRight = false;
      const r = canvas.getBoundingClientRect();
      for (const t of e.changedTouches) {
        if ((t.clientX - r.left) > canvas.width * 0.45) anyRight = true;
      }
      if (anyRight) this.mouseDown = false;
      e.preventDefault();
    }, { passive: false });

    // ── Virtual joystick setup ───────────────────────────────
    this._joyActive  = false;
    this._joyId      = -1;
    this._joyBase    = { x: 0, y: 0 };
    this._joyDelta   = { x: 0, y: 0 };
    this._joyDead    = 12;   // deadzone px
    this._setupJoystick();
  }

  _setupJoystick() {
    const zone  = document.getElementById('joystickZone');
    const knob  = document.getElementById('joystickKnob');
    if (!zone || !knob) return;

    const MAX = 40;  // max knob displacement

    const onStart = (e) => {
      const t = e.changedTouches[0];
      const r = zone.getBoundingClientRect();
      this._joyActive = true;
      this._joyId = t.identifier;
      this._joyBase.x = r.left + r.width  / 2;
      this._joyBase.y = r.top  + r.height / 2;
      e.preventDefault();
    };
    const onMove = (e) => {
      if (!this._joyActive) return;
      for (const t of e.changedTouches) {
        if (t.identifier !== this._joyId) continue;
        let dx = t.clientX - this._joyBase.x;
        let dy = t.clientY - this._joyBase.y;
        const dist = Math.hypot(dx, dy);
        if (dist > MAX) { dx = dx / dist * MAX; dy = dy / dist * MAX; }
        this._joyDelta.x = dx; this._joyDelta.y = dy;
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        // Map delta to virtual keys
        const dead = this._joyDead;
        this._virtualKeys[dx < -dead ? 'add' : 'delete']('KeyA');
        this._virtualKeys[dx >  dead ? 'add' : 'delete']('KeyD');
        this._virtualKeys[dy < -dead ? 'add' : 'delete']('KeyW');
        this._virtualKeys[dy >  dead ? 'add' : 'delete']('KeyS');
      }
      e.preventDefault();
    };
    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== this._joyId) continue;
        this._joyActive = false; this._joyDelta.x = 0; this._joyDelta.y = 0;
        knob.style.transform = 'translate(-50%, -50%)';
        ['KeyA','KeyD','KeyW','KeyS'].forEach(k => this._virtualKeys.delete(k));
      }
      e.preventDefault();
    };

    zone.addEventListener('touchstart', onStart, { passive: false });
    zone.addEventListener('touchmove',  onMove,  { passive: false });
    zone.addEventListener('touchend',   onEnd,   { passive: false });
    zone.addEventListener('touchcancel',onEnd,   { passive: false });
  }

  isDown(code) { return this.keys.has(code) || this._virtualKeys.has(code); }

  updateMouseWorld(camX, camY) {
    this.mouseWorld.set(
      this.mouseScreen.x + camX,
      this.mouseScreen.y + camY
    );
  }

  flush() {
    this.mouseJustDown = false;
  }
}
