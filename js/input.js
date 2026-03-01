'use strict';

class InputManager {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseWorld = new Vec2();
    this.mouseScreen = new Vec2();
    this.mouseDown = false;
    this.mouseJustDown = false;
    this._canvas = canvas;

    window.addEventListener('keydown', e => {
      this.keys.add(e.code);
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));

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
  }

  isDown(code) { return this.keys.has(code); }

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
