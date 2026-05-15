'use strict';

/* ═══════════════════════════════════════════════════════════
   CharCustomize — big rotating character preview + customization
   Depends on: config.js, char-preview.js (loaded before this)
   ═══════════════════════════════════════════════════════════ */
const CharCustomize = (() => {

  /* ── Canvas size ───────────────────────────────────────── */
  const BW = 220, BH = 300;

  /* ── State ─────────────────────────────────────────────── */
  let _charId    = null;
  let _charData  = null;
  let _rotY      = 0;
  let _dragging  = false;
  let _dragX0    = 0;
  let _rotY0     = 0;
  let _autoSpin  = true;
  let _idleTimer = null;
  let _rafId     = null;
  let _lastTime  = 0;
  let _effectT   = 0;

  let _color     = 'default';
  let _accessory = 'none';
  let _effect    = 'none';

  /* ── DOM refs ──────────────────────────────────────────── */
  const panel  = document.getElementById('cppPanel');
  const wrap   = document.getElementById('cppWrap');
  const canvas = document.getElementById('cppCanvas');
  const nameEl = document.getElementById('cppName');

  canvas.width  = BW;
  canvas.height = BH;
  const ctx = canvas.getContext('2d');

  /* ── Off-screen canvas for CharPreview.draw() ─────────── */
  const _tmp = document.createElement('canvas');

  /* ══════════════════════════════════════════════════════════
     DRAG / ROTATE
  ══════════════════════════════════════════════════════════ */
  function _startDrag(cx) {
    _dragging  = true;
    _dragX0    = cx;
    _rotY0     = _rotY;
    _autoSpin  = false;
    clearTimeout(_idleTimer);
    wrap.style.cursor = 'grabbing';
  }
  function _moveDrag(cx) {
    if (!_dragging) return;
    _rotY = _rotY0 + (cx - _dragX0) * 0.65;
    _applyRotation();
  }
  function _endDrag() {
    if (!_dragging) return;
    _dragging = false;
    wrap.style.cursor = 'grab';
    _idleTimer = setTimeout(() => { _autoSpin = true; }, 2500);
  }

  wrap.addEventListener('mousedown',   e => _startDrag(e.clientX));
  window.addEventListener('mousemove', e => _moveDrag(e.clientX));
  window.addEventListener('mouseup',   () => _endDrag());

  wrap.addEventListener('touchstart',  e => { e.preventDefault(); _startDrag(e.touches[0].clientX); }, { passive: false });
  window.addEventListener('touchmove', e => { if (_dragging) { e.preventDefault(); _moveDrag(e.touches[0].clientX); } }, { passive: false });
  window.addEventListener('touchend',  () => _endDrag());

  function _applyRotation() {
    wrap.style.transform = `perspective(900px) rotateY(${_rotY}deg)`;
  }

  /* ══════════════════════════════════════════════════════════
     ANIMATION LOOP
  ══════════════════════════════════════════════════════════ */
  function _tick(ts) {
    if (!_charId) { _rafId = null; return; }
    const dt = Math.min(ts - _lastTime, 50);
    _lastTime = ts;
    _effectT += dt * 0.001;

    if (_autoSpin) {
      _rotY += dt * 0.022;
      _applyRotation();
    }

    _redraw();
    _rafId = requestAnimationFrame(_tick);
  }

  /* ══════════════════════════════════════════════════════════
     DRAW
  ══════════════════════════════════════════════════════════ */
  function _redraw() {
    if (!_charData) return;
    ctx.clearRect(0, 0, BW, BH);

    /* ── Scale up from CharPreview's 78×110 canvas ──────── */
    CharPreview.draw(_tmp, _charData);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(_tmp, 0, 0, BW, BH);

    /* ── Floor shadow ellipse ──────────────────────────── */
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = _charData.color;
    ctx.beginPath();
    ctx.ellipse(BW / 2, BH - 18, 72, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    /* ── Accessory ─────────────────────────────────────── */
    _drawAccessory();

    /* ── Effect ────────────────────────────────────────── */
    _drawEffect();
  }

  /* ══════════════════════════════════════════════════════════
     ACCESSORY  (drawn in big-canvas coordinate space)
     Character head center ≈ (BW/2, BH * 0.345)
     Head radius ≈ BH * 0.105
  ══════════════════════════════════════════════════════════ */
  function _drawAccessory() {
    if (_accessory === 'none') return;

    const col = (_color !== 'default') ? _color : _charData.color;
    const acc = _charData.accent || col;

    /* approximate head geometry scaled from CharPreview constants
       CX=39/78 → 0.5·BW, CY=62/110 → 0.564·BH
       head top ≈ CY – sr  where sr ≈ 26·bodyScale/110·BH */
    const bs  = _charData.bodyScale || 1.0;
    const sr  = Math.min(26 * bs, 33) / 110 * BH;   // body radius in big px
    const hcx = BW / 2;
    const hcy = (62 / 110) * BH - sr * 0.72;         // head centre y
    const hr  = sr * 0.42;                            // head radius

    ctx.save();
    ctx.translate(hcx, hcy);

    switch (_accessory) {

      case 'glasses': {
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 3;
        ctx.shadowColor = '#aaccff'; ctx.shadowBlur = 8;
        const gd = hr * 0.55; // half-distance between lens centres
        for (const sx of [-1, 1]) {
          ctx.beginPath(); ctx.arc(sx * gd, 0, hr * 0.38, 0, Math.PI * 2); ctx.stroke();
        }
        // bridge
        ctx.beginPath(); ctx.moveTo(-gd + hr * 0.38, 0); ctx.lineTo(gd - hr * 0.38, 0); ctx.stroke();
        // arms
        for (const sx of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(sx * (gd + hr * 0.38), 0); ctx.lineTo(sx * (gd + hr * 0.75), -hr * 0.25); ctx.stroke();
        }
        break;
      }

      case 'shades': {
        const g = ctx.createLinearGradient(-hr * 1.1, 0, hr * 1.1, 0);
        g.addColorStop(0, '#FF224488'); g.addColorStop(0.5, '#4400FFAA'); g.addColorStop(1, '#FF224488');
        ctx.fillStyle = g;
        ctx.strokeStyle = '#666'; ctx.lineWidth = 2;
        ctx.shadowColor = '#FF2244'; ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.roundRect(-hr * 1.1, -hr * 0.28, hr * 2.2, hr * 0.56, 5);
        ctx.fill(); ctx.stroke();
        // centre divider
        ctx.strokeStyle = '#44446688'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, -hr * 0.28); ctx.lineTo(0, hr * 0.28); ctx.stroke();
        break;
      }

      case 'hat': {
        // brim
        ctx.fillStyle = acc;
        ctx.beginPath();
        ctx.ellipse(hr * 0.35, hr * 0.15, hr * 0.72, hr * 0.2, 0.12, 0, Math.PI);
        ctx.fill();
        // cap body
        ctx.fillStyle = col;
        ctx.strokeStyle = acc; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, hr * 1.08, Math.PI, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        // button
        ctx.fillStyle = acc;
        ctx.beginPath(); ctx.arc(0, -hr * 1.08, hr * 0.12, 0, Math.PI * 2); ctx.fill();
        break;
      }

      case 'crown': {
        const cw = hr * 1.25, ch = hr * 0.95;
        const y0 = -hr * 0.08;
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3;
        ctx.fillStyle   = 'rgba(255,215,0,0.15)';
        ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(-cw, y0);
        ctx.lineTo(-cw, y0 - ch);
        ctx.lineTo(-cw * 0.4, y0 - ch * 0.45);
        ctx.lineTo(0,         y0 - ch);
        ctx.lineTo( cw * 0.4, y0 - ch * 0.45);
        ctx.lineTo( cw, y0 - ch);
        ctx.lineTo( cw, y0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        // gems
        for (const [gx, gy, gc] of [[-cw * 0.55, y0 - ch * 0.55, '#FF4466'], [0, y0 - ch * 0.95, '#44EEFF'], [cw * 0.55, y0 - ch * 0.55, '#44FF88']]) {
          ctx.fillStyle = gc; ctx.shadowColor = gc; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(gx, gy, hr * 0.11, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }

      case 'bandana': {
        const bg = ctx.createLinearGradient(-hr, hr * 0.1, hr, hr * 0.42);
        bg.addColorStop(0, col + 'EE'); bg.addColorStop(1, acc + 'BB');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(-hr * 1.0, hr * 0.08);
        ctx.lineTo( hr * 1.0, hr * 0.08);
        ctx.lineTo( hr * 0.88, hr * 0.46);
        ctx.lineTo(-hr * 0.88, hr * 0.46);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = acc + '66'; ctx.lineWidth = 1.5;
        for (let xi = -0.55; xi <= 0.55; xi += 0.28) {
          ctx.beginPath(); ctx.moveTo(hr * xi, hr * 0.08); ctx.lineTo(hr * xi, hr * 0.46); ctx.stroke();
        }
        break;
      }

      case 'mask': {
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(0, hr * 0.18, hr * 0.92, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.shadowColor = col; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(0, hr * 0.18, hr * 0.92, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = col; ctx.shadowBlur = 14;
        for (const sx of [-1, 1]) {
          ctx.beginPath(); ctx.ellipse(sx * hr * 0.3, -hr * 0.04, hr * 0.24, hr * 0.09, 0, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
    }

    ctx.restore();
  }

  /* ══════════════════════════════════════════════════════════
     EFFECT
  ══════════════════════════════════════════════════════════ */
  function _drawEffect() {
    if (_effect === 'none') return;

    const col   = (_color !== 'default') ? _color : _charData.color;
    const bs    = _charData.bodyScale || 1.0;
    const ring  = Math.min(26 * bs, 33) / 110 * BH + 8; // ring radius in big px
    const cx    = BW / 2;
    const cy    = (62 / 110) * BH;
    const t     = _effectT;

    ctx.save();

    switch (_effect) {

      case 'aura': {
        const pulse = Math.sin(t * 3) * 0.3 + 0.7;
        ctx.shadowColor = col; ctx.shadowBlur = 50 * pulse;
        ctx.strokeStyle = col + Math.round(pulse * 160).toString(16).padStart(2, '0');
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(cx, cy, ring + 14 + Math.sin(t * 2.5) * 6, 0, Math.PI * 2); ctx.stroke();
        // inner pulse ring
        ctx.globalAlpha = 0.35 * pulse;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(cx, cy, ring + 14 + Math.sin(t * 2.5) * 6, 0, Math.PI * 2); ctx.fill();
        break;
      }

      case 'fire': {
        for (let i = 0; i < 10; i++) {
          const ang = (i / 10) * Math.PI * 2 + t * 1.5;
          const d   = ring + 10 + Math.sin(t * 4 + i * 0.8) * 10;
          const fx  = cx + Math.cos(ang) * d;
          const fy  = cy + Math.sin(ang) * d;
          const fr  = 8 + Math.sin(t * 5 + i) * 4;
          const g   = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
          g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.25, '#FFAA00'); g.addColorStop(1, 'transparent');
          ctx.globalAlpha = 0.75;
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }

      case 'lightning': {
        if (Math.random() < 0.3) {
          ctx.strokeStyle = '#99DDFF'; ctx.lineWidth = 2.5;
          ctx.shadowColor = '#99DDFF'; ctx.shadowBlur = 18; ctx.globalAlpha = 0.8;
          const ang = Math.random() * Math.PI * 2;
          const x1 = cx + Math.cos(ang) * ring;
          const y1 = cy + Math.sin(ang) * ring;
          const x2 = cx + Math.cos(ang) * (ring + 35 + Math.random() * 20);
          const y2 = cy + Math.sin(ang) * (ring + 35 + Math.random() * 20);
          const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 20;
          const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 20;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(mx, my); ctx.lineTo(x2, y2); ctx.stroke();
        }
        break;
      }

      case 'glitch': {
        if (Math.sin(t * 7) > 0.55) {
          const off = (Math.random() - 0.5) * 24;
          ctx.globalAlpha = 0.28; ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(cx + off, cy, ring + 8, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }

      case 'static': {
        if (Math.random() < 0.45) {
          ctx.globalAlpha = 0.55;
          for (let i = 0; i < 14; i++) {
            ctx.fillStyle = col;
            const ang = Math.random() * Math.PI * 2;
            const d   = ring + Math.random() * 22;
            ctx.fillRect(cx + Math.cos(ang) * d - 2, cy + Math.sin(ang) * d - 2, 4, 4);
          }
        }
        break;
      }
    }

    ctx.restore();
  }

  /* ══════════════════════════════════════════════════════════
     PERSIST
  ══════════════════════════════════════════════════════════ */
  function _save() {
    localStorage.setItem('customization', JSON.stringify({
      neonColor:  _color,
      accessory:  _accessory,
      effect:     _effect,
      mask:       'none',
    }));
  }

  /* ══════════════════════════════════════════════════════════
     CONTROL WIRING
  ══════════════════════════════════════════════════════════ */
  document.querySelectorAll('.cpp-color').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.cpp-color').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      _color = sw.dataset.color;
      _save();
    });
  });

  document.querySelectorAll('.cpp-acc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cpp-acc-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _accessory = btn.dataset.acc;
      _save();
    });
  });

  document.querySelectorAll('.cpp-eff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cpp-eff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _effect = btn.dataset.eff;
      _save();
    });
  });

  /* ══════════════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════════════ */
  function show(charId) {
    _charId   = charId;
    _charData = CONFIG.CHARACTERS.find(c => c.id === charId) || null;
    if (!_charData) return;
    panel.style.display = 'flex';
    if (nameEl) nameEl.textContent = _charData.name || '';
    _autoSpin = true;
    if (!_rafId) {
      _lastTime = performance.now();
      _rafId = requestAnimationFrame(_tick);
    }
  }

  function hide() {
    panel.style.display = 'none';
    _charId   = null;
    _charData = null;
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
  }

  return { show, hide };
})();
