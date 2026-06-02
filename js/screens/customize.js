'use strict';

/* ═══════════════════════════════════════════════════════════
   CharCustomize — big rotating character preview + customization
   Depends on: config.js, char-preview.js (loaded before this)
   ═══════════════════════════════════════════════════════════ */
const CharCustomize = (() => {

  /* ── Canvas: 2× resolution for crisp rendering ─────────── */
  const BW = 440, BH = 600;   // internal pixel size (CSS shows at 220×300)

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
     DRAW — renders directly at BW×BH for crisp quality
  ══════════════════════════════════════════════════════════ */
  function _redraw() {
    if (!_charData) return;
    ctx.clearRect(0, 0, BW, BH);

    const col = (_color !== 'default') ? _color : _charData.color;
    const bs  = _charData.bodyScale || 1.0;
    // Character body radius scaled to full canvas height
    const sr  = Math.min(26 * bs, 33) / 110 * BH;
    const cx  = BW / 2;
    const cy  = (62 / 110) * BH;

    /* ── Background glow ───────────────────────────────────── */
    const bg = ctx.createRadialGradient(cx, cy + sr * 0.3, sr * 0.1, cx, cy + sr * 0.3, sr * 2.6);
    bg.addColorStop(0, col + '22');
    bg.addColorStop(1, 'transparent');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, BW, BH);

    /* ── Character body via CharPreview.drawBody ───────────── */
    CharPreview.drawBody(ctx, _charData, cx, cy, sr);

    /* ── Floor shadow ellipse ──────────────────────────────── */
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(cx, BH - 36, sr * 1.2, sr * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    /* ── Accessory ─────────────────────────────────────────── */
    _drawAccessory(col, cx, cy, sr, bs);

    /* ── Effect ────────────────────────────────────────────── */
    _drawEffect(col, cx, cy, sr);
  }

  /* ══════════════════════════════════════════════════════════
     CHARACTER HEAD POSITION DATA
     Maps character IDs to their head/face positions for proper accessory placement
  ══════════════════════════════════════════════════════════ */
  const HEAD_DATA = {
    // Humanoid characters with standard head positions
    gangster:       { headY: -0.46, eyeY: 0.04, headR: 0.50, type: 'humanoid' },
    hacker:         { headY: -0.41, eyeY: 0.05, headR: 0.41, type: 'humanoid_slim' },
    mercenary:      { headY: -0.61, eyeY: 0.10, headR: 0.52, type: 'humanoid_heavy' },
    engineer:       { headY: -0.46, eyeY: 0.05, headR: 0.50, type: 'humanoid' },
    sniper_elite:   { headY: -0.44, eyeY: 0.05, headR: 0.45, type: 'humanoid_slim' },
    drone_pilot:    { headY: -0.46, eyeY: 0.04, headR: 0.47, type: 'humanoid' },
    chemist:        { headY: -0.46, eyeY: -0.05, headR: 0.50, type: 'humanoid' },
    medic:          { headY: -0.46, eyeY: 0.05, headR: 0.47, type: 'humanoid' },
    ronin:          { headY: -0.47, eyeY: 0.00, headR: 0.45, type: 'humanoid_slim' },
    pyro:           { headY: -0.55, eyeY: -0.05, headR: 0.50, type: 'humanoid_heavy' },
    overlord:       { headY: -0.58, eyeY: 0.05, headR: 0.44, type: 'humanoid_heavy' },
    blade_dancer:   { headY: -0.43, eyeY: 0.05, headR: 0.38, type: 'humanoid_slim' },
    volt_runner:    { headY: -0.40, eyeY: 0.00, headR: 0.41, type: 'humanoid_slim' },
    frost_walker:   { headY: -0.46, eyeY: 0.04, headR: 0.50, type: 'humanoid' },
    timebreaker:    { headY: -0.46, eyeY: 0.04, headR: 0.50, type: 'humanoid' },
    ai_avatar:      { headY: -0.46, eyeY: 0.04, headR: 0.48, type: 'humanoid' },
    omega_prime:    { headY: -0.55, eyeY: 0.05, headR: 0.52, type: 'humanoid_heavy' },

    // Cloaked/Ghost characters - face is in shadow/hood
    ghost:          { headY: -0.25, eyeY: 0.00, headR: 0.30, type: 'cloaked' },
    shadow_lord:    { headY: -0.25, eyeY: 0.00, headR: 0.30, type: 'cloaked' },
    quantum_ghost:  { headY: -0.25, eyeY: 0.00, headR: 0.30, type: 'cloaked' },
    phantom:        { headY: -0.25, eyeY: 0.00, headR: 0.25, type: 'cloaked' },

    // Ninja character
    cyber_ninja:    { headY: -0.40, eyeY: 0.08, headR: 0.32, type: 'ninja' },

    // Animal characters - different head structures
    cyber_wolf:     { headY: -0.75, eyeY: 0.03, headR: 0.35, type: 'wolf' },
    neon_panther:   { headY: -0.75, eyeY: 0.00, headR: 0.32, type: 'panther' },
    mecha_bulldog:  { headY: -0.73, eyeY: -0.05, headR: 0.40, type: 'bulldog' },

    // Non-humanoid creatures
    spider_drone:   { headY: -0.45, eyeY: 0.00, headR: 0.20, type: 'spider' },
    robo_hawk:      { headY: -0.40, eyeY: 0.00, headR: 0.25, type: 'hawk' },
    nano_rat:       { headY: -0.50, eyeY: 0.00, headR: 0.25, type: 'rat' },
    mini_bee:       { headY: -0.40, eyeY: 0.00, headR: 0.20, type: 'bee' },
    electric_eel:   { headY: -0.75, eyeY: 0.00, headR: 0.25, type: 'eel' },

    // Titan/Tank characters
    tank_commander: { headY: -0.60, eyeY: 0.00, headR: 0.35, type: 'titan' },
    plasma_titan:   { headY: -0.60, eyeY: 0.00, headR: 0.35, type: 'titan' },
  };

  // Default head data for unknown characters
  const DEFAULT_HEAD = { headY: -0.46, eyeY: 0.04, headR: 0.42, type: 'humanoid' };

  /* ══════════════════════════════════════════════════════════
     ACCESSORY  (drawn at full BW×BH resolution)
  ══════════════════════════════════════════════════════════ */
  function _drawAccessory(col, cx, cy, sr, bs) {
    if (_accessory === 'none') return;

    const acc = _charData.accent || col;

    // Get character-specific head data
    const charId = _charData.id;
    const hd = HEAD_DATA[charId] || DEFAULT_HEAD;

    // Calculate head center position based on character data
    const hcy = cy + sr * hd.headY;
    const hr  = sr * hd.headR;

    // Eye offset from head center (positive = lower on face)
    const eyeOffset = sr * hd.eyeY;

    ctx.save();
    ctx.translate(cx, hcy);

    switch (_accessory) {

      case 'glasses': {
        // Position glasses at eye level
        const ey = eyeOffset;
        ctx.strokeStyle = '#e8e8e8'; ctx.lineWidth = 4;
        ctx.shadowColor = '#aaccff'; ctx.shadowBlur = 14;
        const gd = hr * 0.65;
        const gr = hr * 0.38;
        for (const sx of [-1, 1]) {
          ctx.beginPath(); ctx.arc(sx * gd, ey, gr, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(-gd + gr, ey); ctx.lineTo(gd - gr, ey); ctx.stroke();
        // temple arms going back
        for (const sx of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(sx * (gd + gr), ey); ctx.lineTo(sx * (gd + hr * 0.85), ey - hr * 0.25); ctx.stroke();
        }
        break;
      }

      case 'shades': {
        // Position shades at eye level
        const ey = eyeOffset;
        const g = ctx.createLinearGradient(-hr * 1.2, ey, hr * 1.2, ey);
        g.addColorStop(0, '#FF224499'); g.addColorStop(0.5, '#4400FFBB'); g.addColorStop(1, '#FF224499');
        ctx.fillStyle = g;
        ctx.strokeStyle = '#555'; ctx.lineWidth = 3;
        ctx.shadowColor = '#FF2244'; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.roundRect(-hr * 1.15, ey - hr * 0.3, hr * 2.3, hr * 0.6, 7); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#22224466'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, ey - hr * 0.3); ctx.lineTo(0, ey + hr * 0.3); ctx.stroke();
        break;
      }

      case 'hat': {
        // Position hat on top of head
        const topY = -hr * 0.85;
        // brim
        ctx.fillStyle = acc;
        ctx.beginPath();
        ctx.ellipse(hr * 0.35, topY + hr * 0.28, hr * 0.85, hr * 0.22, 0.12, 0, Math.PI);
        ctx.fill();
        // cap body
        ctx.fillStyle = col;
        ctx.strokeStyle = acc; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, topY + hr * 0.06, hr * 1.12, Math.PI, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        // button
        ctx.fillStyle = acc;
        ctx.beginPath(); ctx.arc(0, topY - hr * 0.06, hr * 0.14, 0, Math.PI * 2); ctx.fill();
        break;
      }

      case 'crown': {
        // Position crown on top of head
        const topY = -hr * 0.75;
        const cw = hr * 1.28, ch = hr * 1.0;
        const y0 = topY + hr * 0.02;
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 4;
        ctx.fillStyle = 'rgba(255,215,0,0.18)';
        ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.moveTo(-cw, y0);
        ctx.lineTo(-cw, y0 - ch);
        ctx.lineTo(-cw * 0.4, y0 - ch * 0.45);
        ctx.lineTo(0,          y0 - ch);
        ctx.lineTo( cw * 0.4,  y0 - ch * 0.45);
        ctx.lineTo( cw, y0 - ch);
        ctx.lineTo( cw, y0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        for (const [gx, gy, gc] of [[-cw * 0.55, y0 - ch * 0.6, '#FF4466'], [0, y0 - ch * 0.96, '#44EEFF'], [cw * 0.55, y0 - ch * 0.6, '#44FF88']]) {
          ctx.fillStyle = gc; ctx.shadowColor = gc; ctx.shadowBlur = 16;
          ctx.beginPath(); ctx.arc(gx, gy, hr * 0.13, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }

      case 'bandana': {
        // Position bandana covering lower face/mouth area
        const mouthY = eyeOffset + hr * 0.5;
        const bg2 = ctx.createLinearGradient(-hr, mouthY - hr * 0.1, hr, mouthY + hr * 0.35);
        bg2.addColorStop(0, col + 'EE'); bg2.addColorStop(1, acc + 'BB');
        ctx.fillStyle = bg2;
        ctx.beginPath();
        ctx.moveTo(-hr * 1.05, mouthY - hr * 0.12);
        ctx.lineTo( hr * 1.05, mouthY - hr * 0.12);
        ctx.lineTo( hr * 0.9,  mouthY + hr * 0.32);
        ctx.lineTo(-hr * 0.9,  mouthY + hr * 0.32);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = acc + '66'; ctx.lineWidth = 2;
        for (let xi = -0.6; xi <= 0.6; xi += 0.3) {
          ctx.beginPath(); ctx.moveTo(hr * xi, mouthY - hr * 0.12); ctx.lineTo(hr * xi, mouthY + hr * 0.32); ctx.stroke();
        }
        break;
      }

      case 'mask': {
        // Position mask covering full face
        const faceY = eyeOffset + hr * 0.15;
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(0, faceY, hr * 0.95, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.shadowColor = col; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(0, faceY, hr * 0.95, 0, Math.PI * 2); ctx.stroke();
        // Eye slits at eye level
        ctx.fillStyle = col; ctx.shadowBlur = 18;
        for (const sx of [-1, 1]) {
          ctx.beginPath(); ctx.ellipse(sx * hr * 0.3, eyeOffset - hr * 0.05, hr * 0.26, hr * 0.1, 0, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }

      case 'chain': {
        // Position chain at neck/lower head area
        const neckY = hr * 0.6;
        ctx.save();
        ctx.translate(0, neckY);
        const chainR = hr * 1.05;
        const chainGrad = ctx.createLinearGradient(-chainR, 0, chainR, 0);
        chainGrad.addColorStop(0, '#AA8800');
        chainGrad.addColorStop(0.5, '#FFE566');
        chainGrad.addColorStop(1, '#AA8800');
        ctx.strokeStyle = chainGrad;
        ctx.lineWidth = 5; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(0, 0, chainR, Math.PI * 0.85, Math.PI * 2.15); ctx.stroke();
        // chain links
        for (let a = 0.9; a <= 2.0; a += 0.18) {
          const lx = Math.cos(a * Math.PI) * chainR;
          const ly = Math.sin(a * Math.PI) * chainR;
          ctx.fillStyle = '#FFE566';
          ctx.beginPath(); ctx.ellipse(lx, ly, 5, 3, a * Math.PI, 0, Math.PI * 2); ctx.fill();
        }
        // pendant
        ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(0, chainR * 0.22, hr * 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(0, chainR * 0.22, hr * 0.09, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        break;
      }

      case 'halo': {
        // Position halo floating above head
        const topY = -hr * 0.9;
        const haloR = hr * 1.05;
        const haloY = topY - hr * 0.65;
        const hg = ctx.createRadialGradient(0, haloY, haloR * 0.6, 0, haloY, haloR * 1.4);
        hg.addColorStop(0, '#FFFFFF');
        hg.addColorStop(0.3, '#FFFFAA');
        hg.addColorStop(1, 'transparent');
        // glow behind
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#FFFFAA';
        ctx.beginPath(); ctx.ellipse(0, haloY, haloR * 1.4, haloR * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        // halo ring
        ctx.strokeStyle = '#FFE566'; ctx.lineWidth = 9;
        ctx.shadowColor = '#FFFF88'; ctx.shadowBlur = 28;
        ctx.beginPath(); ctx.ellipse(0, haloY, haloR, haloR * 0.36, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.ellipse(0, haloY, haloR, haloR * 0.36, 0, 0, Math.PI * 2); ctx.stroke();
        break;
      }

      case 'horns': {
        // Position horns on top/sides of head
        const topY = -hr * 0.65;
        ctx.shadowColor = '#FF2200'; ctx.shadowBlur = 16;
        for (const sx of [-1, 1]) {
          const hx = sx * hr * 0.65;
          const hornGrad = ctx.createLinearGradient(hx, topY, hx, topY - hr * 1.1);
          hornGrad.addColorStop(0, '#CC1100');
          hornGrad.addColorStop(1, '#FF4422');
          ctx.fillStyle = hornGrad;
          ctx.beginPath();
          ctx.moveTo(hx - hr * 0.18, topY);
          ctx.lineTo(hx + sx * hr * 0.12, topY - hr * 1.05);
          ctx.lineTo(hx + hr * 0.18, topY);
          ctx.closePath(); ctx.fill();
          // highlight
          ctx.fillStyle = 'rgba(255,120,80,0.5)';
          ctx.beginPath();
          ctx.moveTo(hx - hr * 0.05, topY - hr * 0.1);
          ctx.lineTo(hx + sx * hr * 0.08, topY - hr * 0.85);
          ctx.lineTo(hx + hr * 0.05, topY - hr * 0.1);
          ctx.closePath(); ctx.fill();
        }
        break;
      }

      case 'goggles': {
        // Position goggles at eye level
        const ey = eyeOffset;
        ctx.strokeStyle = '#888'; ctx.lineWidth = 4;
        ctx.shadowColor = col; ctx.shadowBlur = 16;
        // strap
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.roundRect(-hr * 1.25, ey - hr * 0.22, hr * 2.5, hr * 0.44, 4); ctx.fill();
        // lenses
        for (const sx of [-1, 1]) {
          const lg = ctx.createRadialGradient(sx * hr * 0.55, ey, 0, sx * hr * 0.55, ey, hr * 0.44);
          lg.addColorStop(0, col + 'AA');
          lg.addColorStop(0.6, col + '44');
          lg.addColorStop(1, '#11111188');
          ctx.fillStyle = lg;
          ctx.strokeStyle = '#aaa';
          ctx.beginPath(); ctx.arc(sx * hr * 0.55, ey, hr * 0.44, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          // lens glare
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.beginPath(); ctx.ellipse(sx * hr * 0.55 - hr * 0.12, ey - hr * 0.14, hr * 0.13, hr * 0.07, -0.4, 0, Math.PI * 2); ctx.fill();
        }
        // centre bridge
        ctx.fillStyle = '#444';
        ctx.beginPath(); ctx.roundRect(-hr * 0.12, ey - hr * 0.1, hr * 0.24, hr * 0.2, 3); ctx.fill();
        break;
      }

      case 'mohawk': {
        // Position mohawk on top of head
        const topY = -hr * 0.75;
        const mBase = topY + hr * 0.1;
        const mkGrad = ctx.createLinearGradient(-hr * 0.15, mBase, hr * 0.15, mBase - hr * 1.6);
        mkGrad.addColorStop(0, col);
        mkGrad.addColorStop(0.5, acc);
        mkGrad.addColorStop(1, '#ffffff88');
        ctx.fillStyle = mkGrad;
        ctx.shadowColor = col; ctx.shadowBlur = 18;
        // 3 spikes
        for (const [dx, h] of [[-hr * 0.22, -hr * 1.1], [0, -hr * 1.55], [hr * 0.22, -hr * 1.1]]) {
          ctx.beginPath();
          ctx.moveTo(dx - hr * 0.12, mBase);
          ctx.lineTo(dx, mBase + h);
          ctx.lineTo(dx + hr * 0.12, mBase);
          ctx.closePath(); ctx.fill();
        }
        break;
      }

      case 'earphones': {
        // Position earphones at ear level (around head sides)
        const epY = eyeOffset;
        ctx.strokeStyle = '#222'; ctx.lineWidth = 4;
        // headband arc - goes over the top of head
        const bandY = -hr * 0.7;
        ctx.beginPath(); ctx.arc(0, bandY, hr * 1.02, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
        // ear cups at ear level
        for (const sx of [-1, 1]) {
          const ex = sx * hr * 0.98, ey = epY + hr * 0.08;
          const cupGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, hr * 0.36);
          cupGrad.addColorStop(0, '#555');
          cupGrad.addColorStop(1, '#111');
          ctx.fillStyle = cupGrad;
          ctx.strokeStyle = col; ctx.lineWidth = 3;
          ctx.shadowColor = col; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(ex, ey, hr * 0.36, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = col + '88';
          ctx.beginPath(); ctx.arc(ex, ey, hr * 0.2, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }

    }

    ctx.restore();
  }

  /* ══════════════════════════════════════════════════════════
     EFFECT
  ══════════════════════════════════════════════════════════ */
  function _drawEffect(col, cx, cy, sr) {
    if (_effect === 'none') return;

    const ring = sr + 16;
    const t    = _effectT;

    ctx.save();

    switch (_effect) {

      case 'aura': {
        const pulse = Math.sin(t * 3) * 0.3 + 0.7;
        ctx.shadowColor = col; ctx.shadowBlur = 80 * pulse;
        ctx.strokeStyle = col + Math.round(pulse * 160).toString(16).padStart(2, '0');
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(cx, cy, ring + 20 + Math.sin(t * 2.5) * 8, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.18 * pulse;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(cx, cy, ring + 20 + Math.sin(t * 2.5) * 8, 0, Math.PI * 2); ctx.fill();
        break;
      }

      case 'fire': {
        for (let i = 0; i < 14; i++) {
          const ang = (i / 14) * Math.PI * 2 + t * 1.5;
          const d   = ring + 14 + Math.sin(t * 4 + i * 0.8) * 14;
          const fx  = cx + Math.cos(ang) * d;
          const fy  = cy + Math.sin(ang) * d;
          const fr  = 14 + Math.sin(t * 5 + i) * 7;
          const g   = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
          g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.2, '#FFEE44'); g.addColorStop(0.55, '#FF6600BB'); g.addColorStop(1, 'transparent');
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }

      case 'lightning': {
        if (Math.random() < 0.35) {
          ctx.strokeStyle = '#AADDFF'; ctx.lineWidth = 4;
          ctx.shadowColor = '#88CCFF'; ctx.shadowBlur = 28; ctx.globalAlpha = 0.85;
          const ang = Math.random() * Math.PI * 2;
          const x1 = cx + Math.cos(ang) * ring;
          const y1 = cy + Math.sin(ang) * ring;
          const x2 = cx + Math.cos(ang) * (ring + 50 + Math.random() * 30);
          const y2 = cy + Math.sin(ang) * (ring + 50 + Math.random() * 30);
          const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 30;
          const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 30;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(mx, my); ctx.lineTo(x2, y2); ctx.stroke();
        }
        break;
      }

      case 'glitch': {
        if (Math.sin(t * 7) > 0.55) {
          const off = (Math.random() - 0.5) * 38;
          ctx.globalAlpha = 0.3; ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(cx + off, cy, ring + 12, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 0.15; ctx.fillStyle = '#FF0044';
          ctx.beginPath(); ctx.arc(cx - off * 0.5, cy + off * 0.3, ring + 6, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }

      case 'static': {
        if (Math.random() < 0.5) {
          ctx.globalAlpha = 0.6;
          for (let i = 0; i < 22; i++) {
            ctx.fillStyle = col;
            const ang = Math.random() * Math.PI * 2;
            const d   = ring + Math.random() * 34;
            ctx.fillRect(cx + Math.cos(ang) * d - 3, cy + Math.sin(ang) * d - 3, 6, 6);
          }
        }
        break;
      }

      case 'ice': {
        for (let i = 0; i < 10; i++) {
          const ang = (i / 10) * Math.PI * 2 + t * 0.8;
          const d   = ring + 10 + Math.sin(t * 2 + i) * 8;
          const fx  = cx + Math.cos(ang) * d;
          const fy  = cy + Math.sin(ang) * d;
          const ig  = ctx.createRadialGradient(fx, fy, 0, fx, fy, 14);
          ig.addColorStop(0, '#FFFFFF'); ig.addColorStop(0.4, '#88DDFF'); ig.addColorStop(1, 'transparent');
          ctx.globalAlpha = 0.75 + Math.sin(t * 3 + i) * 0.2;
          ctx.fillStyle = ig;
          ctx.beginPath(); ctx.arc(fx, fy, 14, 0, Math.PI * 2); ctx.fill();
          // snowflake spikes
          ctx.strokeStyle = '#CCEEFF'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6;
          for (let s = 0; s < 6; s++) {
            const sa = (s / 6) * Math.PI * 2;
            ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(sa) * 10, fy + Math.sin(sa) * 10); ctx.stroke();
          }
        }
        break;
      }

      case 'rainbow': {
        const pulse = Math.sin(t * 2) * 0.25 + 0.75;
        const hue = (t * 80) % 360;
        ctx.shadowBlur = 50;
        for (let i = 0; i < 5; i++) {
          const h = (hue + i * 72) % 360;
          ctx.shadowColor = `hsl(${h},100%,60%)`;
          ctx.strokeStyle = `hsl(${h},100%,60%)`;
          ctx.lineWidth = 3; ctx.globalAlpha = 0.55 * pulse;
          ctx.beginPath(); ctx.arc(cx, cy, ring + 10 + i * 9, 0, Math.PI * 2); ctx.stroke();
        }
        break;
      }

      case 'dark': {
        const pulse = Math.sin(t * 2.5) * 0.4 + 0.6;
        // dark void ring
        ctx.shadowColor = '#220033'; ctx.shadowBlur = 60 * pulse;
        ctx.strokeStyle = `rgba(60,0,80,${0.7 * pulse})`;
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(cx, cy, ring + 18, 0, Math.PI * 2); ctx.stroke();
        // dark particles
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2 + t * 0.6;
          const d   = ring + 22 + Math.sin(t * 2 + i) * 10;
          ctx.fillStyle = '#330044';
          ctx.shadowColor = '#CC00FF'; ctx.shadowBlur = 18;
          ctx.globalAlpha = 0.7 * pulse;
          ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, 8, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }

      case 'speed': {
        ctx.globalAlpha = 0.55;
        const numLines = 12;
        for (let i = 0; i < numLines; i++) {
          const ang = (i / numLines) * Math.PI * 2;
          const phase = ((t * 3 + i * 0.5) % 1.0);
          const startD = ring + 8 + phase * 40;
          const endD   = ring + 8 + (phase + 0.35) * 50;
          const lg = ctx.createLinearGradient(
            cx + Math.cos(ang) * startD, cy + Math.sin(ang) * startD,
            cx + Math.cos(ang) * endD,   cy + Math.sin(ang) * endD
          );
          lg.addColorStop(0, 'transparent');
          lg.addColorStop(0.5, col + 'CC');
          lg.addColorStop(1, 'transparent');
          ctx.strokeStyle = lg; ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(ang) * startD, cy + Math.sin(ang) * startD);
          ctx.lineTo(cx + Math.cos(ang) * endD,   cy + Math.sin(ang) * endD);
          ctx.stroke();
        }
        break;
      }

      case 'smoke': {
        for (let i = 0; i < 8; i++) {
          const phase = ((t * 0.5 + i * 0.14) % 1.0);
          const ang   = (i / 8) * Math.PI * 2;
          const d     = ring + 10 + phase * 55;
          const alpha = (1 - phase) * 0.55;
          const radius = 10 + phase * 22;
          const sg = ctx.createRadialGradient(
            cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, 0,
            cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, radius
          );
          sg.addColorStop(0, `rgba(160,160,160,${alpha})`);
          sg.addColorStop(1, 'transparent');
          ctx.fillStyle = sg;
          ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, radius, 0, Math.PI * 2); ctx.fill();
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
