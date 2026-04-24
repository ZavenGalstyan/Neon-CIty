/* ═══════════════════════════════════════════════════════════
   DASH DREAD — Character Preview Renderer
   Draws the exact in-game character sprite onto a <canvas>.
   Used by index.html character-select cards.
   Depends on: config.js (must load first)
   ═══════════════════════════════════════════════════════════ */

const CharPreview = (() => {
  'use strict';

  const W = 78, H = 110;   // canvas pixel size
  const CX = 39, CY = 62;  // draw center (slightly low — head has space at top)

  /* ── Public: render one canvas ───────────────────────────── */
  function draw(canvas, charData) {
    if (!canvas || !charData) return;
    canvas.width  = W;
    canvas.height = H;

    const ctx   = canvas.getContext('2d');
    const { id: charId, color, accent, bodyScale } = charData;

    // Clamp sr so the widest chars still fit in 78 px
    const rawSr = 26 * (bodyScale || 1.0);
    const sr    = Math.min(rawSr, 33);

    // Background glow
    const bg = ctx.createRadialGradient(CX, CY + 8, 2, CX, CY + 8, 48);
    bg.addColorStop(0, color + '28');
    bg.addColorStop(1, 'transparent');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Character body (same drawing code as entities.js Player.render)
    ctx.save();
    ctx.translate(CX, CY);
    _body(ctx, charId, color, accent, sr);
    ctx.restore();

    // Outer energy ring
    ctx.globalAlpha = 0.38;
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(CX, CY, sr + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* ── Public: render every .char-preview-canvas on the page ── */
  function renderAll() {
    if (typeof CONFIG === 'undefined') return;
    document.querySelectorAll('canvas.char-preview-canvas[data-char]').forEach(canvas => {
      const charData = CONFIG.CHARACTERS.find(c => c.id === canvas.dataset.char);
      if (charData) draw(canvas, charData);
    });
  }

  /* ════════════════════════════════════════════════════════════
     _body — exact copy of entities.js Player.render body block,
             with `this.color` → color, `this.accent` → accent,
             time-based animations frozen at a fixed phase.
     ctx is already translated to (CX, CY).
  ════════════════════════════════════════════════════════════ */
  function _body(ctx, charId, color, accent, sr) {

    if (charId === 'cyber_wolf') {
      for (const s of [-1, 1]) {
        ctx.fillStyle = color + 'BB';
        ctx.beginPath(); ctx.ellipse(s*sr*0.32, sr*0.35, sr*0.1, sr*0.45, s*0.15, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(0, 0, sr*0.4, sr*0.7, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, sr*0.4); ctx.lineTo(0, -sr*0.5); ctx.stroke();
      for (const s of [-1, 1]) {
        ctx.fillStyle = color + 'DD';
        ctx.beginPath(); ctx.ellipse(s*sr*0.25, -sr*0.45, sr*0.08, sr*0.35, s*-0.1, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(0, -sr*0.75, sr*0.35, sr*0.3, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.moveTo(-sr*0.12, -sr*0.85); ctx.lineTo(0, -sr*1.15); ctx.lineTo(sr*0.12, -sr*0.85); ctx.closePath(); ctx.fill();
      for (const s of [-1, 1]) {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(s*sr*0.25, -sr*0.75); ctx.lineTo(s*sr*0.35, -sr*1.1); ctx.lineTo(s*sr*0.15, -sr*0.85); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(-sr*0.15, -sr*0.78, sr*0.08, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( sr*0.15, -sr*0.78, sr*0.08, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(0, sr*0.5); ctx.quadraticCurveTo(sr*0.5, sr*0.7, sr*0.3, sr*1.0); ctx.quadraticCurveTo(sr*0.1, sr*0.8, 0, sr*0.5); ctx.fill();

    } else if (charId === 'neon_panther') {
      for (const s of [-1, 1]) {
        ctx.fillStyle = color + 'CC';
        ctx.beginPath(); ctx.ellipse(s*sr*0.35, sr*0.25, sr*0.15, sr*0.4, s*0.2, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(0, -sr*0.05, sr*0.45, sr*0.55, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = accent + '66';
      for (let i = 0; i < 5; i++) {
        const sx = Math.sin(i * 1.5) * sr * 0.25;
        const sy = -sr*0.1 + (i-2)*sr*0.15;
        ctx.beginPath(); ctx.arc(sx, sy, sr*0.08, 0, Math.PI*2); ctx.fill();
      }
      for (const s of [-1, 1]) {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.ellipse(s*sr*0.28, -sr*0.5, sr*0.1, sr*0.32, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -sr*0.75, sr*0.32, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(0, -sr*0.85, sr*0.06, 0, Math.PI*2); ctx.fill();
      for (const s of [-1, 1]) {
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(s*sr*0.25, -sr*0.95, sr*0.12, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = accent + '88'; ctx.beginPath(); ctx.arc(s*sr*0.25, -sr*0.95, sr*0.06, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.ellipse(-sr*0.12, -sr*0.75, sr*0.1, sr*0.06, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse( sr*0.12, -sr*0.75, sr*0.1, sr*0.06, 0, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = color; ctx.lineWidth = sr*0.1; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, sr*0.4); ctx.bezierCurveTo(sr*0.6, sr*0.5, sr*0.8, sr*0.9, sr*0.4, sr*1.1); ctx.stroke();

    } else if (charId === 'mecha_bulldog') {
      for (const s of [-1, 1]) {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.roundRect(s*sr*0.35-sr*0.15, sr*0.1, sr*0.3, sr*0.5, sr*0.08); ctx.fill();
      }
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.roundRect(-sr*0.55, -sr*0.4, sr*1.1, sr*0.7, sr*0.2); ctx.fill();
      ctx.fillStyle = accent + '77';
      ctx.beginPath(); ctx.roundRect(-sr*0.4, -sr*0.3, sr*0.8, sr*0.35, sr*0.1); ctx.fill();
      for (const s of [-1, 1]) {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.roundRect(s*sr*0.3-sr*0.12, -sr*0.65, sr*0.24, sr*0.45, sr*0.06); ctx.fill();
      }
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-sr*0.4, -sr*0.95, sr*0.8, sr*0.45, sr*0.15); ctx.fill();
      ctx.fillStyle = accent; ctx.beginPath(); ctx.roundRect(-sr*0.25, -sr*1.05, sr*0.5, sr*0.2, sr*0.08); ctx.fill();
      ctx.strokeStyle = color + '88'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-sr*0.15, -sr*1.0); ctx.lineTo(sr*0.15, -sr*1.0); ctx.stroke();
      for (const s of [-1, 1]) {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.ellipse(s*sr*0.45, -sr*0.75, sr*0.15, sr*0.2, s*0.5, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(-sr*0.18, -sr*0.8, sr*0.08, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( sr*0.18, -sr*0.8, sr*0.08, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, sr*0.45, sr*0.1, sr*0.15, 0, 0, Math.PI*2); ctx.fill();

    } else if (charId === 'spider_drone') {
      const bodyR = sr * 0.4;
      ctx.strokeStyle = color; ctx.lineWidth = sr*0.08; ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const side = i < 4 ? -1 : 1, idx = i % 4;
        const legX = side * bodyR * 0.7, midX = side * sr * 0.9, endX = side * sr * 1.1;
        const midY = (idx - 1.5) * sr * 0.35, endY = midY + sr * 0.3;
        ctx.beginPath(); ctx.moveTo(legX*0.5, midY*0.3); ctx.quadraticCurveTo(midX, midY-sr*0.2, endX, endY); ctx.stroke();
      }
      ctx.fillStyle = accent; ctx.beginPath(); ctx.ellipse(0, sr*0.25, bodyR*0.9, bodyR*1.1, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = color;  ctx.beginPath(); ctx.ellipse(0, -sr*0.15, bodyR*0.7, bodyR*0.6, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = color;  ctx.beginPath(); ctx.ellipse(0, -sr*0.45, bodyR*0.5, bodyR*0.4, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 6;
      for (let i = 0; i < 4; i++) {
        const ex = (i-1.5)*bodyR*0.25, ey = -sr*0.5+(i%2)*bodyR*0.12;
        ctx.beginPath(); ctx.arc(ex, ey, bodyR*0.1, 0, Math.PI*2); ctx.fill();
      }
      ctx.shadowBlur = 0;

    } else if (charId === 'robo_hawk') {
      const wingSpan = sr * 1.4, bodyLen = sr * 0.9;
      const wingFlap = 0.1; // static
      for (const s of [-1, 1]) {
        ctx.fillStyle = color + 'DD';
        ctx.save(); ctx.rotate(s * (0.3 + wingFlap));
        ctx.beginPath(); ctx.moveTo(0, -sr*0.1); ctx.quadraticCurveTo(s*wingSpan*0.5, -sr*0.4, s*wingSpan*0.8, -sr*0.1); ctx.quadraticCurveTo(s*wingSpan*0.5, sr*0.1, 0, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = color;  ctx.beginPath(); ctx.ellipse(0, 0, sr*0.35, bodyLen*0.5, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = accent; ctx.beginPath(); ctx.ellipse(0, -bodyLen*0.45, sr*0.28, sr*0.25, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FFCC44';
      ctx.beginPath(); ctx.moveTo(-sr*0.08, -bodyLen*0.55); ctx.lineTo(0, -bodyLen*0.8); ctx.lineTo(sr*0.08, -bodyLen*0.55); ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(-sr*0.12, -bodyLen*0.45, sr*0.08, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( sr*0.12, -bodyLen*0.45, sr*0.08, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = color + 'AA';
      ctx.beginPath(); ctx.moveTo(-sr*0.15, bodyLen*0.35); ctx.lineTo(0, bodyLen*0.7); ctx.lineTo(sr*0.15, bodyLen*0.35); ctx.closePath(); ctx.fill();

    } else if (charId === 'nano_rat') {
      const bodyLen = sr * 0.7;
      ctx.strokeStyle = accent; ctx.lineWidth = sr*0.06; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, sr*0.25); ctx.quadraticCurveTo(sr*0.3, sr*0.7, -sr*0.1, sr*1.0); ctx.stroke();
      for (const s of [-1, 1]) {
        ctx.fillStyle = color + 'BB';
        ctx.beginPath(); ctx.ellipse(s*sr*0.25, sr*0.15, sr*0.12, sr*0.2, s*0.3, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, sr*0.35, bodyLen*0.5, 0, 0, Math.PI*2); ctx.fill();
      for (const s of [-1, 1]) {
        ctx.fillStyle = color + 'CC';
        ctx.beginPath(); ctx.ellipse(s*sr*0.2, -sr*0.3, sr*0.08, sr*0.15, s*-0.2, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, -sr*0.5, sr*0.28, sr*0.22, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = accent; ctx.beginPath(); ctx.ellipse(0, -sr*0.7, sr*0.12, sr*0.1, 0, 0, Math.PI*2); ctx.fill();
      for (const s of [-1, 1]) {
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.ellipse(s*sr*0.22, -sr*0.45, sr*0.12, sr*0.15, s*0.3, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 4;
      ctx.beginPath(); ctx.arc(-sr*0.1, -sr*0.5, sr*0.06, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( sr*0.1, -sr*0.5, sr*0.06, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'mini_bee') {
      const bodyLen = sr * 0.6;
      ctx.fillStyle = 'rgba(200,220,255,0.5)';
      for (const s of [-1, 1]) {
        ctx.save(); ctx.rotate(s * 0.4);
        ctx.beginPath(); ctx.ellipse(s*sr*0.45, -sr*0.1, sr*0.5, sr*0.2, s*0.2, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(0, sr*0.15, sr*0.32, bodyLen*0.6, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#111';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.ellipse(0, sr*0.05+i*sr*0.15, sr*0.34, sr*0.04, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = accent; ctx.beginPath(); ctx.ellipse(0, -sr*0.15, sr*0.25, sr*0.22, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = color;  ctx.beginPath(); ctx.ellipse(0, -sr*0.4, sr*0.2, sr*0.18, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.arc(-sr*0.12, -sr*0.42, sr*0.1, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( sr*0.12, -sr*0.42, sr*0.1, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = color; ctx.lineWidth = sr*0.03;
      ctx.beginPath(); ctx.moveTo(-sr*0.08, -sr*0.52); ctx.lineTo(-sr*0.15, -sr*0.7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo( sr*0.08, -sr*0.52); ctx.lineTo( sr*0.15, -sr*0.7); ctx.stroke();
      ctx.fillStyle = '#AAA';
      ctx.beginPath(); ctx.moveTo(-sr*0.05, sr*0.45); ctx.lineTo(0, sr*0.65); ctx.lineTo(sr*0.05, sr*0.45); ctx.closePath(); ctx.fill();

    } else if (charId === 'electric_eel') {
      const segments = 6, segLen = sr*0.3, waveAmp = sr*0.15;
      ctx.lineCap = 'round';
      for (let i = segments-1; i >= 0; i--) {
        const segY = -sr*0.6 + i*segLen*0.7;
        const segX = Math.sin(i * 0.5) * waveAmp; // static phase
        const segR = sr*0.2 * (1 - i*0.08);
        ctx.fillStyle = i === 0 ? accent : color;
        ctx.beginPath(); ctx.ellipse(segX, segY, segR, segR*1.2, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, -sr*0.75, sr*0.25, sr*0.3, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(-sr*0.1, -sr*0.8, sr*0.07, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( sr*0.1, -sr*0.8, sr*0.07, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = accent + 'AA';
      ctx.beginPath(); ctx.moveTo(-sr*0.1, sr*0.5); ctx.quadraticCurveTo(0, sr*0.85, sr*0.1, sr*0.5); ctx.closePath(); ctx.fill();

    } else if (charId === 'tank_commander' || charId === 'plasma_titan') {
      const bw = sr*0.8, bh = sr*1.1, hhr = sr*0.5;
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath(); ctx.ellipse(s*sr*0.35, sr*0.4, sr*0.28, sr*0.55, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = color + '88';
        ctx.beginPath(); ctx.ellipse(s*sr*0.35, sr*0.3, sr*0.22, sr*0.4, 0, 0, Math.PI*2); ctx.fill();
      }
      const tGrad = ctx.createLinearGradient(-bw, -bh*0.5, bw, bh*0.4);
      tGrad.addColorStop(0, color); tGrad.addColorStop(1, accent);
      ctx.fillStyle = tGrad;
      ctx.beginPath(); ctx.roundRect(-bw, -bh*0.5, bw*2, bh*1.0, [bw*0.3, bw*0.3, bw*0.15, bw*0.15]); ctx.fill();
      ctx.fillStyle = accent + '60';
      ctx.beginPath(); ctx.roundRect(-bw*0.7, -bh*0.4, bw*1.4, bh*0.5, bw*0.1); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -bh*0.45); ctx.lineTo(0, bh*0.1); ctx.stroke();
      for (const s of [-1, 1]) {
        ctx.fillStyle = color + 'CC';
        ctx.beginPath(); ctx.roundRect(s*bw*1.0, -bh*0.4, sr*0.35*s, sr*0.9, sr*0.12); ctx.fill();
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.ellipse(s*bw*0.95, -bh*0.35, sr*0.25, sr*0.2, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -bh*0.6, hhr*0.7, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.rect(-hhr*0.5, -bh*0.62, hhr*1.0, hhr*0.25); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'phantom') {
      const t = 0.5; // static
      ctx.globalAlpha = 0.15;
      for (let i = 1; i <= 3; i++) {
        const ox = Math.sin(t*3+i)*sr*0.15, oy = Math.cos(t*2.5+i)*sr*0.1;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.ellipse(ox, oy, sr*0.7, sr*0.9, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = color + '33';
      for (let i = 0; i < 5; i++) {
        const tx = (i-2)*sr*0.25, ty = sr*0.5;
        ctx.beginPath(); ctx.moveTo(tx-sr*0.08, ty); ctx.quadraticCurveTo(tx, ty-sr*0.3, tx, ty-sr*0.4); ctx.quadraticCurveTo(tx, ty-sr*0.3, tx+sr*0.08, ty); ctx.fill();
      }
      const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, sr);
      bodyGrad.addColorStop(0, color+'CC'); bodyGrad.addColorStop(0.5, color+'77'); bodyGrad.addColorStop(0.8, color+'33'); bodyGrad.addColorStop(1, color+'00');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath(); ctx.ellipse(0, sr*0.1, sr*0.55, sr*0.75, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(5,5,15,0.9)';
      ctx.beginPath(); ctx.ellipse(0, -sr*0.25, sr*0.22, sr*0.28, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.ellipse(0, -sr*0.28, sr*0.12, sr*0.06, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.ellipse(0, -sr*0.28, sr*0.04, sr*0.02, 0, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = color + '55';
      for (let i = 0; i < 8; i++) {
        const ang = (i/8)*Math.PI*2, dist = sr*0.6, px = Math.cos(ang)*dist, py = Math.sin(ang)*dist*0.8;
        ctx.beginPath(); ctx.arc(px, py, sr*0.06, 0, Math.PI*2); ctx.fill();
      }

    } else if (charId === 'ghost' || charId === 'shadow_lord' || charId === 'quantum_ghost') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.moveTo(-sr*0.7, -sr*0.3); ctx.quadraticCurveTo(-sr*0.8, sr*0.5, -sr*0.5, sr*0.7); ctx.lineTo(sr*0.5, sr*0.7); ctx.quadraticCurveTo(sr*0.8, sr*0.5, sr*0.7, -sr*0.3); ctx.closePath(); ctx.fill();
      const cGrad = ctx.createLinearGradient(0, -sr*0.5, 0, sr*0.6);
      cGrad.addColorStop(0, color+'EE'); cGrad.addColorStop(0.5, color+'AA'); cGrad.addColorStop(1, color+'44');
      ctx.fillStyle = cGrad;
      ctx.beginPath(); ctx.moveTo(-sr*0.55, -sr*0.4); ctx.quadraticCurveTo(-sr*0.7, sr*0.3, -sr*0.4, sr*0.55); ctx.lineTo(sr*0.4, sr*0.55); ctx.quadraticCurveTo(sr*0.7, sr*0.3, sr*0.55, -sr*0.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, -sr*0.35, sr*0.45, Math.PI*0.8, Math.PI*2.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0a0a15';
      ctx.beginPath(); ctx.ellipse(0, -sr*0.25, sr*0.28, sr*0.32, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(-sr*0.12, -sr*0.28, sr*0.08, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( sr*0.12, -sr*0.28, sr*0.08, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'cyber_ninja') {
      const bw = sr*0.5, bh = sr*0.8, hhr = sr*0.4;
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath(); ctx.ellipse(s*sr*0.22, sr*0.25, sr*0.15, sr*0.38, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-bw, -bh*0.45, bw*2, bh*0.75, bw*0.3); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = sr*0.06;
      ctx.beginPath(); ctx.moveTo(-bw*0.8, -bh*0.4); ctx.lineTo(bw*0.8, bh*0.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bw*0.8, -bh*0.4);  ctx.lineTo(-bw*0.8, bh*0.2); ctx.stroke();
      ctx.fillStyle = color+'DD';
      ctx.beginPath(); ctx.roundRect(-bw*1.15, -bh*0.35, sr*0.2, sr*0.55, sr*0.08); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw*0.95,  -bh*0.35, sr*0.2, sr*0.55, sr*0.08); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -bh*0.5, hhr, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, -bh*0.5+hhr*0.2, hhr*0.85, 0.2, Math.PI-0.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 8;
      const ey = -bh*0.5-hhr*0.1;
      ctx.beginPath(); ctx.ellipse(-hhr*0.3, ey, hhr*0.2, hhr*0.1, -0.1, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse( hhr*0.3, ey, hhr*0.2, hhr*0.1,  0.1, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'hacker') {
      const bw = sr*0.5, bh = sr*0.85, hhr = sr*0.48;
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#1a2a3a';
        ctx.beginPath(); ctx.ellipse(s*sr*0.22, sr*0.28, sr*0.16, sr*0.38, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = '#0a1520'; ctx.beginPath(); ctx.roundRect(-bw, -bh*0.45, bw*2, bh*0.8, bw*0.3); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-bw*0.8, -bh*0.4); ctx.lineTo(-bw*0.4, -bh*0.2); ctx.lineTo(-bw*0.4, bh*0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bw*0.8,  -bh*0.4); ctx.lineTo(bw*0.4,  -bh*0.2); ctx.lineTo(bw*0.4,  bh*0.1); ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(-bw*0.4, -bh*0.2, sr*0.04, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(bw*0.4,  -bh*0.2, sr*0.04, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#0a1520';
      ctx.beginPath(); ctx.roundRect(-bw*1.1, -bh*0.32, sr*0.2, sr*0.55, sr*0.06); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw*0.9,  -bh*0.32, sr*0.2, sr*0.55, sr*0.06); ctx.fill();
      ctx.fillStyle = accent+'88'; ctx.beginPath(); ctx.roundRect(-bw*1.15, bh*0.05, sr*0.25, sr*0.15, 3); ctx.fill();
      ctx.fillStyle = '#D8C8B8'; ctx.beginPath(); ctx.arc(0, -bh*0.48, hhr*0.85, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(-sr*0.05, -bh*0.55); ctx.lineTo(0, -bh*0.9); ctx.lineTo(sr*0.05, -bh*0.55); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(-hhr*0.75, -bh*0.52, hhr*1.5, hhr*0.3, 5); ctx.fill();
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.roundRect(-hhr*0.65, -bh*0.5, hhr*1.3, hhr*0.2, 3); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'sniper_elite') {
      const bw = sr*0.55, bh = sr*0.88, hhr = sr*0.5;
      ctx.fillStyle = '#3a4a3a';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s*sr*0.24, sr*0.3, sr*0.17, sr*0.4, 0, 0, Math.PI*2); ctx.fill(); }
      ctx.fillStyle = '#2a3a2a'; ctx.beginPath(); ctx.roundRect(-bw, -bh*0.45, bw*2, bh*0.82, bw*0.25); ctx.fill();
      ctx.strokeStyle = '#4a5a4a'; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(-bw*0.8+i*bw*0.25, -bh*0.3); ctx.lineTo(-bw*0.8+i*bw*0.25+sr*0.1, bh*0.1); ctx.stroke(); }
      ctx.fillStyle = '#2a3a2a';
      ctx.beginPath(); ctx.roundRect(-bw*1.1, -bh*0.35, sr*0.22, sr*0.6, sr*0.08); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw*0.88, -bh*0.35, sr*0.22, sr*0.6, sr*0.08); ctx.fill();
      ctx.fillStyle = '#3a4a3a'; ctx.beginPath(); ctx.arc(0, -bh*0.5, hhr, Math.PI*0.7, Math.PI*2.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2a3a2a'; ctx.beginPath(); ctx.arc(0, -bh*0.48, hhr*0.7, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(hhr*0.25, -bh*0.5, hhr*0.2, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(-hhr*0.3, -bh*0.48, hhr*0.1, hhr*0.06, 0, 0, Math.PI*2); ctx.fill();

    } else if (charId === 'ronin') {
      const bw = sr*0.6, bh = sr*0.9, hhr = sr*0.5;
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath(); ctx.moveTo(-bw*0.8, bh*0.1); ctx.lineTo(-bw*1.0, bh*0.65); ctx.lineTo(bw*1.0, bh*0.65); ctx.lineTo(bw*0.8, bh*0.1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-bw, -bh*0.45, bw*2, bh*0.6, [bw*0.2, bw*0.2, bw*0.1, bw*0.1]); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-bw*0.9, -bh*0.35+i*bh*0.15); ctx.lineTo(bw*0.9, -bh*0.35+i*bh*0.15); ctx.stroke(); }
      ctx.fillStyle = accent;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.roundRect(s*bw*0.85, -bh*0.5, sr*0.35*s, sr*0.4, 5); ctx.fill(); }
      ctx.fillStyle = '#2a2a3e';
      ctx.beginPath(); ctx.roundRect(-bw*1.2, -bh*0.35, sr*0.22, sr*0.55, sr*0.08); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw*0.98,  -bh*0.35, sr*0.22, sr*0.55, sr*0.08); ctx.fill();
      ctx.fillStyle = '#654321'; ctx.save(); ctx.rotate(-0.4);
      ctx.beginPath(); ctx.roundRect(bw*0.3, -bh*0.8, sr*0.08, sr*0.9, 2); ctx.fill();
      ctx.fillStyle = '#888'; ctx.beginPath(); ctx.roundRect(bw*0.28, -bh*0.85, sr*0.12, sr*0.08, 1); ctx.fill();
      ctx.restore();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -bh*0.52, hhr, Math.PI*0.65, Math.PI*2.35); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(0, -bh*0.42, hhr*0.6, 0.3, Math.PI-0.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.ellipse(-hhr*0.3, -bh*0.52, hhr*0.15, hhr*0.08, -0.1, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse( hhr*0.3, -bh*0.52, hhr*0.15, hhr*0.08,  0.1, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'blade_dancer') {
      const bw = sr*0.5, bh = sr*0.85, hhr = sr*0.45;
      for (const s of [-1, 1]) {
        ctx.fillStyle = color+'CC';
        ctx.beginPath(); ctx.ellipse(s*sr*0.2, sr*0.3, sr*0.12, sr*0.4, s*0.1, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-bw, -bh*0.45, bw*2, bh*0.75, bw*0.35); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-bw*0.6, -bh*0.35); ctx.quadraticCurveTo(-bw*0.3, -bh*0.1, -bw*0.6, bh*0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bw*0.6,  -bh*0.35); ctx.quadraticCurveTo(bw*0.3,  -bh*0.1,  bw*0.6, bh*0.1); ctx.stroke();
      ctx.fillStyle = color+'DD';
      ctx.beginPath(); ctx.roundRect(-bw*1.1, -bh*0.32, sr*0.18, sr*0.5, sr*0.06); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw*0.92, -bh*0.32, sr*0.18, sr*0.5, sr*0.06); ctx.fill();
      ctx.fillStyle = '#AADDFF';
      ctx.beginPath(); ctx.moveTo(-bw*1.25, -bh*0.3); ctx.lineTo(-bw*1.5, -bh*0.15); ctx.lineTo(-bw*1.25, bh*0.1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bw*1.25, -bh*0.3);  ctx.lineTo(bw*1.5,  -bh*0.15); ctx.lineTo(bw*1.25,  bh*0.1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#E8D0C0'; ctx.beginPath(); ctx.arc(0, -bh*0.5, hhr*0.85, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.moveTo(-hhr*0.8, -bh*0.55); ctx.quadraticCurveTo(-hhr*1.2, -bh*0.3, -hhr*0.9, 0); ctx.lineTo(-hhr*0.5, -bh*0.45); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hhr*0.8,  -bh*0.55); ctx.quadraticCurveTo(hhr*1.2,  -bh*0.3,  hhr*0.9, 0); ctx.lineTo(hhr*0.5,  -bh*0.45); ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.ellipse(-hhr*0.3, -bh*0.48, hhr*0.12, hhr*0.08, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse( hhr*0.3, -bh*0.48, hhr*0.12, hhr*0.08, 0, 0, Math.PI*2); ctx.fill();

    } else if (charId === 'volt_runner') {
      const bw = sr*0.5, bh = sr*0.8, hhr = sr*0.45;
      for (const s of [-1, 1]) {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.ellipse(s*sr*0.22, sr*0.25, sr*0.14, sr*0.38, s*0.15, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(-bw, -bh*0.45, bw*2, bh*0.75, bw*0.4); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(-bw*0.3, -bh*0.4); ctx.lineTo(bw*0.1, -bh*0.15); ctx.lineTo(-bw*0.1, -bh*0.15); ctx.lineTo(bw*0.3, bh*0.2); ctx.lineTo(bw*0.1, -bh*0.05); ctx.lineTo(bw*0.3, -bh*0.05); ctx.lineTo(-bw*0.1, -bh*0.35); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = accent+'66'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-bw*1.5-i*sr*0.15, -bh*0.3+i*bh*0.2); ctx.lineTo(-bw*0.9, -bh*0.3+i*bh*0.2); ctx.stroke(); }
      ctx.fillStyle = color+'CC';
      ctx.beginPath(); ctx.roundRect(-bw*1.05, -bh*0.32, sr*0.18, sr*0.5, sr*0.06); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw*0.87,  -bh*0.32, sr*0.18, sr*0.5, sr*0.06); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(0, -bh*0.5, hhr, hhr*0.9, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.roundRect(-hhr*0.8, -bh*0.52, hhr*1.6, hhr*0.25, 8); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -bh*0.65); ctx.lineTo(0, -bh*0.85); ctx.stroke();
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(0, -bh*0.85, sr*0.04, 0, Math.PI*2); ctx.fill();

    } else if (charId === 'mercenary') {
      const bw = sr*0.8, bh = sr*1.05, hhr = sr*0.52;
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.ellipse(s*sr*0.35, sr*0.4, sr*0.28, sr*0.5, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.roundRect(s*sr*0.18, sr*0.7, sr*0.35, sr*0.2, 5); ctx.fill();
      }
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-bw, -bh*0.5, bw*2, bh*0.95, [bw*0.25, bw*0.25, bw*0.1, bw*0.1]); ctx.fill();
      ctx.fillStyle = '#3a4a3a'; ctx.beginPath(); ctx.roundRect(-bw*0.85, -bh*0.45, bw*1.7, bh*0.7, 8); ctx.fill();
      ctx.fillStyle = '#4a5a4a';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.roundRect(-bw*0.7+i*bw*0.45, -bh*0.15, bw*0.35, bh*0.2, 3); ctx.fill(); }
      ctx.fillStyle = '#654321'; ctx.save(); ctx.rotate(-0.3);
      ctx.beginPath(); ctx.roundRect(-bw*1.1, -bh*0.35, bw*2.2, sr*0.12, 3); ctx.fill();
      ctx.fillStyle = '#C9A227';
      for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.roundRect(-bw*0.95+i*bw*0.26, -bh*0.34, sr*0.06, sr*0.1, 1); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = accent;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.roundRect(s*bw*0.8, -bh*0.55, sr*0.35*s, sr*0.35, 8); ctx.fill(); }
      ctx.fillStyle = color+'CC';
      ctx.beginPath(); ctx.roundRect(-bw*1.25, -bh*0.4, sr*0.35, sr*0.85, sr*0.1); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw*0.9,   -bh*0.4, sr*0.35, sr*0.85, sr*0.1); ctx.fill();
      ctx.fillStyle = '#3a4a3a'; ctx.beginPath(); ctx.arc(0, -bh*0.58, hhr, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#2a3a2a'; ctx.beginPath(); ctx.arc(0, -bh*0.58, hhr*1.05, Math.PI*0.6, Math.PI*2.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.roundRect(-hhr*0.15, -bh*0.75, hhr*0.3, hhr*0.25, 3); ctx.fill();
      ctx.fillStyle = accent+'CC'; ctx.beginPath(); ctx.roundRect(-hhr*0.7, -bh*0.58, hhr*1.4, hhr*0.22, 5); ctx.fill();

    } else if (charId === 'pyro') {
      const bw = sr*0.75, bh = sr*1.0, hhr = sr*0.5;
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.ellipse(s*sr*0.32, sr*0.38, sr*0.26, sr*0.48, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-bw, -bh*0.48, bw*2, bh*0.9, [bw*0.25, bw*0.25, bw*0.12, bw*0.12]); ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.moveTo(-bw*0.5, bh*0.3); ctx.quadraticCurveTo(-bw*0.3, 0, -bw*0.5, -bh*0.2); ctx.quadraticCurveTo(-bw*0.2, -bh*0.1, -bw*0.4, bh*0.3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bw*0.5, bh*0.3);  ctx.quadraticCurveTo(bw*0.3, 0, bw*0.5, -bh*0.2);  ctx.quadraticCurveTo(bw*0.2, -bh*0.1, bw*0.4, bh*0.3);  ctx.fill();
      ctx.fillStyle = '#444';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s*bw*0.95, -bh*0.1, sr*0.15, sr*0.4, 0, 0, Math.PI*2); ctx.fill(); }
      ctx.fillStyle = color;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.rect(s*bw*0.88, -bh*0.2, sr*0.14, sr*0.08); ctx.fill();
        ctx.beginPath(); ctx.rect(s*bw*0.88, bh*0.0,  sr*0.14, sr*0.08); ctx.fill();
      }
      ctx.fillStyle = color+'DD';
      ctx.beginPath(); ctx.roundRect(-bw*1.15, -bh*0.38, sr*0.3, sr*0.75, sr*0.1); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw*0.85,  -bh*0.38, sr*0.3, sr*0.75, sr*0.1); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(0, -bh*0.55, hhr, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#333'; ctx.beginPath(); ctx.roundRect(-hhr*0.6, -bh*0.45, hhr*1.2, hhr*0.5, hhr*0.15); ctx.fill();
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 15;
      ctx.beginPath(); ctx.roundRect(-hhr*0.65, -bh*0.62, hhr*1.3, hhr*0.28, 8); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'overlord') {
      const bw = sr*0.75, bh = sr*1.0, hhr = sr*0.52;
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.ellipse(s*sr*0.32, sr*0.35, sr*0.25, sr*0.48, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = color+'88';
      ctx.beginPath(); ctx.moveTo(-bw*1.2, -bh*0.45); ctx.quadraticCurveTo(-bw*1.4, bh*0.2, -bw*1.0, bh*0.6); ctx.lineTo(bw*1.0, bh*0.6); ctx.quadraticCurveTo(bw*1.4, bh*0.2, bw*1.2, -bh*0.45); ctx.closePath(); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-bw, -bh*0.48, bw*2, bh*0.88, [bw*0.2, bw*0.2, bw*0.1, bw*0.1]); ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.moveTo(0, -bh*0.35); ctx.lineTo(-bw*0.25, -bh*0.15); ctx.lineTo(0, bh*0.05); ctx.lineTo(bw*0.25, -bh*0.15); ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s*bw*0.8, -bh*0.5); ctx.lineTo(s*bw*1.15, -bh*0.4); ctx.lineTo(s*bw*1.1, -bh*0.2); ctx.lineTo(s*bw*0.85, -bh*0.25); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = color+'DD';
      ctx.beginPath(); ctx.roundRect(-bw*1.18, -bh*0.38, sr*0.3, sr*0.75, sr*0.1); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw*0.88,  -bh*0.38, sr*0.3, sr*0.75, sr*0.1); ctx.fill();
      ctx.fillStyle = '#D8C8B8'; ctx.beginPath(); ctx.arc(0, -bh*0.58, hhr*0.85, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.moveTo(-hhr*0.7, -bh*0.65); ctx.lineTo(-hhr*0.5, -bh*0.85); ctx.lineTo(-hhr*0.25, -bh*0.7); ctx.lineTo(0, -bh*0.95); ctx.lineTo(hhr*0.25, -bh*0.7); ctx.lineTo(hhr*0.5, -bh*0.85); ctx.lineTo(hhr*0.7, -bh*0.65); ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(-hhr*0.3, -bh*0.56, hhr*0.12, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( hhr*0.3, -bh*0.56, hhr*0.12, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'gangster') {
      const bw = sr*0.65, bh = sr*0.92, hhr = sr*0.55;
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(s*sr*0.29, sr*0.32, sr*0.22, sr*0.44, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(s*(sr*0.3+s*sr*0.07), sr*0.66, sr*0.26, sr*0.16, -s*0.28, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.roundRect(-bw, -bh*0.48, bw*2, bh*0.86, [bw*0.3, bw*0.3, bw*0.15, bw*0.15]); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(0, -bh*0.4); ctx.lineTo(-sr*0.08, -bh*0.3); ctx.lineTo(0, bh*0.2); ctx.lineTo(sr*0.08, -bh*0.3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-bw*0.6, -bh*0.45); ctx.lineTo(-bw*0.2, bh*0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bw*0.6, -bh*0.45); ctx.lineTo(bw*0.2, bh*0.1); ctx.stroke();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.roundRect(-bw*1.18, -bh*0.36, sr*0.28, sr*0.72, sr*0.1); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw*0.9,   -bh*0.36, sr*0.28, sr*0.72, sr*0.1); ctx.fill();
      ctx.fillStyle = '#E8C89A'; ctx.beginPath(); ctx.arc(0, -bh*0.5, hhr*0.9, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(0, -bh*0.65, hhr*1.3, hhr*0.25, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.roundRect(-hhr*0.7, -bh*0.85, hhr*1.4, hhr*0.5, hhr*0.15); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.rect(-hhr*0.7, -bh*0.72, hhr*1.4, hhr*0.12); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.ellipse(-hhr*0.28, -bh*0.48, hhr*0.12, hhr*0.08, -0.15, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse( hhr*0.28, -bh*0.48, hhr*0.12, hhr*0.08,  0.15, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#8B4513'; ctx.beginPath(); ctx.roundRect(hhr*0.4, -bh*0.38, sr*0.35, sr*0.1, 2); ctx.fill();
      ctx.fillStyle = '#FF4400'; ctx.beginPath(); ctx.arc(hhr*0.75, -bh*0.33, sr*0.06, 0, Math.PI*2); ctx.fill();

    } else if (charId === 'engineer') {
      const bw = sr*0.65, bh = sr*0.92, hhr = sr*0.55;
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#3a3a2e'; ctx.beginPath(); ctx.ellipse(s*sr*0.29, sr*0.32, sr*0.22, sr*0.44, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#2a2a1e'; ctx.beginPath(); ctx.ellipse(s*(sr*0.3+s*sr*0.07), sr*0.66, sr*0.26, sr*0.16, -s*0.28, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-bw, -bh*0.48, bw*2, bh*0.86, [bw*0.3, bw*0.3, bw*0.15, bw*0.15]); ctx.fill();
      ctx.fillStyle = accent+'88'; ctx.beginPath(); ctx.roundRect(-bw*0.7, -bh*0.1, bw*0.5, bh*0.25, 3); ctx.fill();
      ctx.fillStyle = accent+'88'; ctx.beginPath(); ctx.roundRect(bw*0.2,  -bh*0.1, bw*0.5, bh*0.25, 3); ctx.fill();
      ctx.fillStyle = '#654321'; ctx.beginPath(); ctx.roundRect(-bw*0.9, bh*0.18, bw*1.8, sr*0.2, 3); ctx.fill();
      ctx.fillStyle = '#888';
      ctx.beginPath(); ctx.roundRect(-bw*0.6, bh*0.15, sr*0.08, sr*0.25, 2); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw*0.5,  bh*0.15, sr*0.08, sr*0.25, 2); ctx.fill();
      ctx.fillStyle = color+'DD';
      ctx.beginPath(); ctx.roundRect(-bw*1.18, -bh*0.36, sr*0.28, sr*0.72, sr*0.1); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw*0.9,   -bh*0.36, sr*0.28, sr*0.72, sr*0.1); ctx.fill();
      ctx.fillStyle = '#E8C89A'; ctx.beginPath(); ctx.arc(0, -bh*0.5, hhr*0.9, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -bh*0.55, hhr*0.95, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent; ctx.beginPath(); ctx.ellipse(0, -bh*0.5, hhr*1.1, hhr*0.2, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#333'; ctx.beginPath(); ctx.roundRect(-hhr*0.6, -bh*0.58, hhr*1.2, hhr*0.25, 5); ctx.fill();
      ctx.fillStyle = '#88CCFF';
      ctx.beginPath(); ctx.ellipse(-hhr*0.25, -bh*0.53, hhr*0.2, hhr*0.15, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse( hhr*0.25, -bh*0.53, hhr*0.2, hhr*0.15, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-hhr*0.25, -bh*0.42, hhr*0.1, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( hhr*0.25, -bh*0.42, hhr*0.1, 0, Math.PI*2); ctx.fill();

    } else if (charId === 'chemist') {
      const bw = sr*0.65, bh = sr*0.92, hhr = sr*0.55;
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#2a2a2e'; ctx.beginPath(); ctx.ellipse(s*sr*0.29, sr*0.32, sr*0.22, sr*0.44, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = '#e8ffe8'; ctx.beginPath(); ctx.roundRect(-bw*1.1, -bh*0.48, bw*2.2, bh*1.0, [bw*0.2, bw*0.2, bw*0.3, bw*0.3]); ctx.fill();
      ctx.fillStyle = color;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, -bh*0.25+i*sr*0.2, sr*0.05, 0, Math.PI*2); ctx.fill(); }
      ctx.strokeStyle = color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-bw*0.5, -bh*0.3); ctx.quadraticCurveTo(-bw*0.7, 0, -bw*0.4, bh*0.15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bw*0.5,  -bh*0.3); ctx.quadraticCurveTo(bw*0.7,  0, bw*0.4,  bh*0.15); ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.roundRect(-bw*0.55, bh*0.1, sr*0.12, sr*0.2, 3); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw*0.35,  bh*0.1, sr*0.12, sr*0.2, 3); ctx.fill();
      ctx.fillStyle = '#3a3a3a'; ctx.beginPath(); ctx.arc(0, -bh*0.5, hhr, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.roundRect(-hhr*0.5, -bh*0.35, hhr*1.0, hhr*0.6, hhr*0.2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(-hhr*0.7, -bh*0.35, hhr*0.25, hhr*0.35, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse( hhr*0.7, -bh*0.35, hhr*0.25, hhr*0.35, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.ellipse(-hhr*0.35, -bh*0.55, hhr*0.25, hhr*0.2, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse( hhr*0.35, -bh*0.55, hhr*0.25, hhr*0.2, 0, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'medic') {
      const bw = sr*0.65, bh = sr*0.92, hhr = sr*0.55;
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#2a4a3a'; ctx.beginPath(); ctx.ellipse(s*sr*0.29, sr*0.32, sr*0.22, sr*0.44, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(-bw*1.1, -bh*0.48, bw*2.2, bh*1.0, [bw*0.2, bw*0.2, bw*0.3, bw*0.3]); ctx.fill();
      ctx.fillStyle = color + '88'; ctx.beginPath(); ctx.roundRect(-bw*0.5, -bh*0.45, bw*1.0, bh*0.35, 5); ctx.fill();
      ctx.fillStyle = '#FF3333';
      ctx.beginPath(); ctx.roundRect(-sr*0.08, -bh*0.35, sr*0.16, sr*0.35, 2); ctx.fill();
      ctx.beginPath(); ctx.roundRect(-sr*0.17, -bh*0.25, sr*0.34, sr*0.15, 2); ctx.fill();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-bw*0.3, -bh*0.2); ctx.quadraticCurveTo(-bw*0.5, bh*0.1, -bw*0.2, bh*0.15); ctx.stroke();
      ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(-bw*0.2, bh*0.15, sr*0.08, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#E8C89A'; ctx.beginPath(); ctx.arc(0, -bh*0.5, hhr*0.85, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -bh*0.55, hhr*0.9, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#88DDAA'; ctx.beginPath(); ctx.roundRect(-hhr*0.5, -bh*0.32, hhr*1.0, hhr*0.2, 3); ctx.fill();
      ctx.fillStyle = '#334433';
      ctx.beginPath(); ctx.arc(-hhr*0.28, -bh*0.48, hhr*0.12, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( hhr*0.28, -bh*0.48, hhr*0.12, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(-hhr*0.26, -bh*0.47, hhr*0.05, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( hhr*0.30, -bh*0.47, hhr*0.05, 0, Math.PI*2); ctx.fill();

    } else if (charId === 'drone_pilot') {
      const bw = sr*0.65, bh = sr*0.92, hhr = sr*0.55;
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#2a3a4a'; ctx.beginPath(); ctx.ellipse(s*sr*0.29, sr*0.32, sr*0.22, sr*0.44, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-bw, -bh*0.48, bw*2, bh*0.86, [bw*0.3, bw*0.3, bw*0.15, bw*0.15]); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(-bw*0.7, -bh*0.35, bw*1.4, bh*0.3, 5); ctx.fill();
      ctx.fillStyle = accent;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-bw*0.4+i*bw*0.28, -bh*0.2, sr*0.04, 0, Math.PI*2); ctx.fill(); }
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.roundRect(-bw*0.4, bh*0.15, bw*0.8, sr*0.18, 5); ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(-bw*0.2, bh*0.22, sr*0.05, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( bw*0.2, bh*0.22, sr*0.05, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#E8C89A'; ctx.beginPath(); ctx.arc(0, -bh*0.5, hhr*0.85, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, -bh*0.55, hhr*0.9, Math.PI*0.8, Math.PI*0.2, true); ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(-hhr*0.85, -bh*0.5, hhr*0.2, hhr*0.25, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse( hhr*0.85, -bh*0.5, hhr*0.2, hhr*0.25, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-hhr*0.7, -bh*0.42); ctx.quadraticCurveTo(-hhr*0.5, -bh*0.25, -hhr*0.2, -bh*0.3); ctx.stroke();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-hhr*0.2, -bh*0.3, sr*0.06, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-hhr*0.28, -bh*0.48, hhr*0.12, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( hhr*0.28, -bh*0.48, hhr*0.12, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(-hhr*0.25, -bh*0.5, hhr*0.04, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( hhr*0.31, -bh*0.5, hhr*0.04, 0, Math.PI*2); ctx.fill();

    } else if (charId === 'frost_walker') {
      const bw = sr*0.65, bh = sr*0.92, hhr = sr*0.55;
      for (const s of [-1, 1]) {
        ctx.fillStyle = color+'AA'; ctx.beginPath(); ctx.ellipse(s*sr*0.29, sr*0.32, sr*0.22, sr*0.44, 0, 0, Math.PI*2); ctx.fill();
      }
      const iceGrad = ctx.createLinearGradient(-bw, -bh*0.48, bw, bh*0.38);
      iceGrad.addColorStop(0, color); iceGrad.addColorStop(0.5, '#ffffff'); iceGrad.addColorStop(1, accent);
      ctx.fillStyle = iceGrad; ctx.beginPath(); ctx.roundRect(-bw, -bh*0.48, bw*2, bh*0.86, [bw*0.3, bw*0.3, bw*0.15, bw*0.15]); ctx.fill();
      ctx.fillStyle = '#AAEEFF';
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s*bw*0.9, -bh*0.45); ctx.lineTo(s*bw*1.2, -bh*0.7); ctx.lineTo(s*bw*1.0, -bh*0.35); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(s*bw*1.0, -bh*0.5); ctx.lineTo(s*bw*1.35, -bh*0.55); ctx.lineTo(s*bw*1.05, -bh*0.4); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = color+'CC';
      ctx.beginPath(); ctx.roundRect(-bw*1.18, -bh*0.36, sr*0.28, sr*0.72, sr*0.1); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw*0.9,   -bh*0.36, sr*0.28, sr*0.72, sr*0.1); ctx.fill();
      ctx.fillStyle = '#CCE8FF'; ctx.beginPath(); ctx.arc(0, -bh*0.5, hhr*0.9, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = accent;
      for (let i = 0; i < 5; i++) {
        const ang = Math.PI + (i-2)*0.35;
        const cx2 = Math.cos(ang)*hhr*0.7, cy2 = -bh*0.5+Math.sin(ang)*hhr*0.7;
        ctx.beginPath(); ctx.moveTo(cx2-sr*0.05, cy2); ctx.lineTo(cx2, cy2-sr*0.25); ctx.lineTo(cx2+sr*0.05, cy2); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(-hhr*0.28, -bh*0.48, hhr*0.12, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( hhr*0.28, -bh*0.48, hhr*0.12, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'timebreaker') {
      const bw = sr*0.65, bh = sr*0.92, hhr = sr*0.55;
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#2a2a3e'; ctx.beginPath(); ctx.ellipse(s*sr*0.29, sr*0.32, sr*0.22, sr*0.44, 0, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(-bw, -bh*0.48, bw*2, bh*0.86, [bw*0.3, bw*0.3, bw*0.15, bw*0.15]); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, -bh*0.15, sr*0.3, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -bh*0.15, sr*0.28, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle = accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -bh*0.15); ctx.lineTo(sr*0.2, -bh*0.15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -bh*0.15); ctx.lineTo(0, -bh*0.15-sr*0.15); ctx.stroke();
      ctx.fillStyle = color+'DD';
      ctx.beginPath(); ctx.roundRect(-bw*1.18, -bh*0.36, sr*0.28, sr*0.72, sr*0.1); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw*0.9,   -bh*0.36, sr*0.28, sr*0.72, sr*0.1); ctx.fill();
      ctx.fillStyle = accent;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s*bw*0.9, -bh*0.55); ctx.lineTo(s*bw*1.1, -bh*0.45); ctx.lineTo(s*bw*0.9, -bh*0.35); ctx.lineTo(s*bw*1.1, -bh*0.25); ctx.lineTo(s*bw*0.9, -bh*0.35); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#E8D8B8'; ctx.beginPath(); ctx.arc(0, -bh*0.5, hhr*0.85, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.roundRect(-hhr*0.7, -bh*0.52, hhr*1.4, hhr*0.25, 5); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'ai_avatar') {
      const bw = sr*0.65, bh = sr*0.92, hhr = sr*0.55;
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s*sr*0.29, sr*0.32, sr*0.2, sr*0.4, 0, 0, Math.PI*2); ctx.stroke(); }
      ctx.fillStyle = color+'44'; ctx.beginPath(); ctx.roundRect(-bw, -bh*0.48, bw*2, bh*0.86, [bw*0.3, bw*0.3, bw*0.15, bw*0.15]); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-bw, -bh*0.48, bw*2, bh*0.86, [bw*0.3, bw*0.3, bw*0.15, bw*0.15]); ctx.stroke();
      ctx.strokeStyle = color+'66'; ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-bw, -bh*0.4+i*bh*0.25); ctx.lineTo(bw, -bh*0.4+i*bh*0.25); ctx.stroke(); }
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-bw*1.15, -bh*0.36, sr*0.25, sr*0.7, sr*0.08); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(bw*0.9,   -bh*0.36, sr*0.25, sr*0.7, sr*0.08); ctx.stroke();
      ctx.fillStyle = color+'66'; ctx.beginPath(); ctx.arc(0, -bh*0.5, hhr*0.9, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -bh*0.5, hhr*0.9, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 10;
      ctx.fillRect(-hhr*0.4, -bh*0.52, hhr*0.25, hhr*0.12);
      ctx.fillRect( hhr*0.15,-bh*0.52, hhr*0.25, hhr*0.12);
      ctx.fillRect(-hhr*0.3, -bh*0.38, hhr*0.6, hhr*0.06);
      ctx.shadowBlur = 0;

    } else {
      // ── Default Humanoid (covers medic variants, frost_walker generics, etc.) ──
      const bw = sr*0.65, bh = sr*0.92, hhr = sr*0.55;
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.ellipse(s*sr*0.29, sr*0.32, sr*0.22, sr*0.44, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#120c06'; ctx.beginPath(); ctx.ellipse(s*(sr*0.3+s*sr*0.07), sr*0.66, sr*0.26, sr*0.16, -s*0.28, 0, Math.PI*2); ctx.fill();
      }
      const tGrad = ctx.createLinearGradient(-bw, -bh*0.48, bw, bh*0.38);
      tGrad.addColorStop(0, color+'EE'); tGrad.addColorStop(1, color+'88');
      ctx.fillStyle = tGrad; ctx.beginPath(); ctx.roundRect(-bw, -bh*0.48, bw*2, bh*0.86, [bw*0.36, bw*0.36, bw*0.2, bw*0.2]); ctx.fill();
      ctx.fillStyle = accent+'50'; ctx.beginPath(); ctx.roundRect(-bw*0.5, -bh*0.4, bw*1.0, bh*0.44, bw*0.14); ctx.fill();
      ctx.strokeStyle = color+'88'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -bh*0.42); ctx.lineTo(0, bh*0.04); ctx.stroke();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(-bw*0.82, bh*0.22, bw*1.64, sr*0.15, 2); ctx.fill();
      ctx.fillStyle = '#CCC'; ctx.beginPath(); ctx.roundRect(-sr*0.11, bh*0.21, sr*0.22, sr*0.17, 2); ctx.fill();
      ctx.fillStyle = color+'BB'; ctx.beginPath(); ctx.roundRect(-bw*1.18, -bh*0.36, sr*0.28, sr*0.72, sr*0.1); ctx.fill();
      ctx.fillStyle = '#FFDDBB'; ctx.beginPath(); ctx.ellipse(-bw*1.06, bh*0.18, sr*0.17, sr*0.19, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = color+'BB'; ctx.save(); ctx.translate(bw*1.08, -bh*0.18); ctx.rotate(-0.44);
      ctx.beginPath(); ctx.roundRect(-sr*0.13, -sr*0.62, sr*0.26, sr*0.66, sr*0.1); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#FFDDBB'; ctx.beginPath(); ctx.ellipse(bw*0.88+sr*0.23, -bh*0.22-sr*0.44, sr*0.17, sr*0.2, -0.44, 0, Math.PI*2); ctx.fill();
      const hGrad = ctx.createRadialGradient(-hhr*0.22, -bh*0.5-hhr*0.2, 1, 0, -bh*0.5, hhr);
      hGrad.addColorStop(0, '#FFE8CC'); hGrad.addColorStop(0.7, '#E8C89A'); hGrad.addColorStop(1, '#C8A070');
      ctx.fillStyle = hGrad; ctx.beginPath(); ctx.arc(0, -bh*0.5, hhr, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(0, -bh*0.5, hhr*1.02, Math.PI*0.7, Math.PI*2.3); ctx.lineTo(0, -bh*0.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = accent+'90'; ctx.beginPath(); ctx.rect(-hhr*0.85, -bh*0.5-hhr*0.1, hhr*1.7, hhr*0.28); ctx.fill();
      const ey = -bh*0.5+hhr*0.06;
      ctx.fillStyle = '#111122';
      ctx.beginPath(); ctx.ellipse(-hhr*0.28, ey, hhr*0.18, hhr*0.14, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse( hhr*0.28, ey, hhr*0.18, hhr*0.14, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(-hhr*0.24, ey, hhr*0.07, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( hhr*0.32, ey, hhr*0.07, 0, Math.PI*2); ctx.fill();
    }
  }

  return { draw, renderAll };
})();
