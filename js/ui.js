'use strict';

// Layout constants (bottom-left panel)
const HUD_MM_W  = 176;   // minimap width
const HUD_MM_H  = 128;   // minimap height
const HUD_PAD   = 14;    // left/bottom margin

class HUD {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this._dmgNums  = [];
    this._shakeT   = 0;
    this._shakeAmt = 0;
  }

  // ── Damage numbers ─────────────────────────────────────────────────────────
  addDamageNumber(worldX, worldY, value, camX, camY, color = '#FF4444') {
    this._dmgNums.push({
      sx: worldX - camX, sy: worldY - camY,
      val: value, t: 1.2, vy: -60, color
    });
  }

  // ── Screen shake ───────────────────────────────────────────────────────────
  shake(amount = 8) { this._shakeAmt = amount; this._shakeT = 0.25; }

  getShakeOffset() {
    if (this._shakeT <= 0) return { x: 0, y: 0 };
    return { x: (Math.random()-0.5)*this._shakeAmt*2, y: (Math.random()-0.5)*this._shakeAmt*2 };
  }

  update(dt) {
    this._dmgNums.forEach(d => { d.t -= dt; d.sy += d.vy * dt; });
    this._dmgNums = this._dmgNums.filter(d => d.t > 0);
    this._shakeT -= dt;
  }

  // ── Floating damage numbers ────────────────────────────────────────────────
  renderDamageNumbers() {
    const ctx = this.ctx;
    for (const d of this._dmgNums) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, d.t / 0.5);
      ctx.font = 'bold 20px Orbitron, monospace';
      ctx.fillStyle = d.color; ctx.shadowColor = d.color; ctx.shadowBlur = 10;
      ctx.textAlign = 'center';
      ctx.fillText(`-${d.val}`, d.sx, d.sy);
      ctx.restore();
    }
  }

  // ── Boss health bar (top-center) ───────────────────────────────────────────
  renderBossBar(boss) {
    const ctx  = this.ctx;
    const W    = this.canvas.width;
    const barW = Math.min(480, W * 0.42);
    const barH = 22;
    const bx   = W / 2 - barW / 2;
    const by   = 18;

    // Panel
    ctx.save();
    ctx.fillStyle   = 'rgba(0,0,0,0.78)';
    ctx.strokeStyle = boss.color;
    ctx.lineWidth   = 1.5;
    ctx.shadowColor = boss.color;
    ctx.shadowBlur  = boss._enraged ? 18 : 8;
    this._rr(ctx, bx - 14, by - 26, barW + 28, barH + 38, 7);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    // Boss name
    ctx.font      = 'bold 11px Orbitron, monospace';
    ctx.fillStyle = boss.color;
    ctx.shadowColor = boss.color; ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    ctx.fillText(`☠  ${boss.name}  ☠`, W / 2, by - 6);

    // Enrage flash
    if (boss._enraged) {
      ctx.font = 'bold 9px Orbitron, monospace';
      ctx.fillStyle = '#FF4444'; ctx.shadowColor = '#FF0000';
      ctx.fillText('⚡ ENRAGED ⚡', W / 2 + barW * 0.28, by - 6);
    }

    ctx.shadowBlur = 0;

    // Bar bg
    ctx.fillStyle = '#111122';
    ctx.fillRect(bx, by, barW, barH);

    // Bar fill
    const pct    = boss.health / boss.maxHealth;
    const bColor = pct > 0.5 ? boss.color : '#FF2200';
    ctx.fillStyle = bColor; ctx.shadowColor = bColor; ctx.shadowBlur = 10;
    ctx.fillRect(bx, by, barW * pct, barH);
    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, barH);

    // HP text
    ctx.font      = 'bold 11px Orbitron, monospace';
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 0;
    ctx.fillText(`${Math.ceil(boss.health).toLocaleString()} / ${boss.maxHealth.toLocaleString()}`, W / 2, by + barH - 4);

    ctx.restore();
  }

  // ── Minimap ────────────────────────────────────────────────────────────────
  renderMinimap(gameMap, player, bots, camX, camY, boss = null) {
    const ctx  = this.ctx;
    const H    = this.canvas.height;
    const W    = this.canvas.width;
    const mmX  = HUD_PAD;
    const mmY  = H - HUD_PAD - 82 - 10 - HUD_MM_H - 22; // leave room for health + controls below
    const mmW  = HUD_MM_W;
    const mmH  = HUD_MM_H;
    const sx   = gameMap.mmScaleX;
    const sy   = gameMap.mmScaleY;

    // Panel background
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.strokeStyle = 'rgba(68,238,255,0.22)';
    ctx.lineWidth = 1;
    this._rr(ctx, mmX - 4, mmY - 20, mmW + 8, mmH + 28, 6);
    ctx.fill(); ctx.stroke();

    // Label
    ctx.font = 'bold 9px Orbitron, monospace';
    ctx.fillStyle = 'rgba(68,238,255,0.65)';
    ctx.textAlign = 'left';
    ctx.fillText('▸ MINIMAP', mmX, mmY - 6);
    ctx.restore();

    // Pre-rendered map tiles
    ctx.drawImage(gameMap.minimapCanvas, mmX, mmY, mmW, mmH);

    // Camera viewport rectangle
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mmX + camX * sx, mmY + camY * sy, this.canvas.width * sx, this.canvas.height * sy);
    ctx.restore();

    // Bot dots — color by type
    for (const bot of bots) {
      if (bot.dead || bot.dying) continue;
      ctx.fillStyle = bot.type === 'mini' ? '#AA66FF' : bot.type === 'big' ? '#FF8800' : '#FF3333';
      const dotR   = bot.type === 'big' ? 2.8 : 1.8;
      ctx.beginPath();
      ctx.arc(mmX + bot.x * sx, mmY + bot.y * sy, dotR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Boss dot (large, glowing)
    if (boss && !boss.dead && !boss.dying) {
      ctx.save();
      ctx.fillStyle   = boss.color;
      ctx.shadowColor = boss.color;
      ctx.shadowBlur  = 8;
      ctx.beginPath();
      ctx.arc(mmX + boss.x * sx, mmY + boss.y * sy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Player dot
    ctx.save();
    ctx.fillStyle   = player.color;
    ctx.shadowColor = player.color;
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.arc(mmX + player.x * sx, mmY + player.y * sy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Border
    ctx.save();
    ctx.strokeStyle = 'rgba(68,238,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mmX, mmY, mmW, mmH);
    ctx.restore();
  }

  // ── Health bar ─────────────────────────────────────────────────────────────
  renderHealthBar(player) {
    const ctx  = this.ctx;
    const H    = this.canvas.height;
    const barW = HUD_MM_W;
    const barH = 18;
    const x    = HUD_PAD;
    const y    = H - HUD_PAD - 82;   // sits above controls panel
    const pct  = player.health / player.maxHealth;

    // Panel bg
    ctx.save();
    ctx.fillStyle   = 'rgba(0,0,0,0.68)';
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth   = 1;
    this._rr(ctx, x - 4, y - 26, barW + 8, barH + 34, 6);
    ctx.fill(); ctx.stroke();

    // Char name
    ctx.font = '10px Orbitron, monospace';
    ctx.fillStyle   = player.color;
    ctx.shadowColor = player.color;
    ctx.shadowBlur  = 6;
    ctx.textAlign   = 'left';
    ctx.fillText(player.charData.name, x, y - 10);

    // Label
    ctx.font = '9px Orbitron, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.shadowBlur = 0;
    ctx.fillText('HEALTH', x + barW - 42, y - 10);

    // Bar bg
    ctx.fillStyle = '#111122';
    ctx.fillRect(x, y, barW, barH);

    // Bar fill
    const hColor = pct > 0.6 ? '#44FF88' : pct > 0.3 ? '#FFCC00' : '#FF4444';
    ctx.shadowColor = hColor; ctx.shadowBlur = 10;
    ctx.fillStyle   = hColor;
    ctx.fillRect(x, y, barW * pct, barH);

    // Armor overlay
    if (player.armor > 0) {
      ctx.fillStyle = `rgba(68,255,136,${player.armor * 0.3})`;
      ctx.fillRect(x, y, barW, barH);
    }

    // Border
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barW, barH);

    // Value
    ctx.font = 'bold 11px Orbitron, monospace';
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(player.health)} / ${player.maxHealth}${player.armor > 0 ? `  ⬡ ${Math.round(player.armor*100)}%` : ''}`, x + barW/2, y + barH - 3);

    // Regen indicator
    if (player.regenRate > 0) {
      ctx.font = '8px Orbitron, monospace';
      ctx.fillStyle = '#88FFCC'; ctx.textAlign = 'right';
      ctx.fillText(`↑ +${player.regenRate}/s`, x + barW, y + barH + 12);
    }
    ctx.restore();
  }

  // ── Wanted level ───────────────────────────────────────────────────────────
  renderWantedLevel(level, decayTimer) {
    if (level === 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'left';

    // Label
    ctx.font = 'bold 8px Orbitron, monospace';
    ctx.fillStyle = 'rgba(255,200,0,0.55)'; ctx.shadowBlur = 0;
    ctx.fillText('WANTED', 16, 38);

    // Stars
    for (let i = 0; i < 4; i++) {
      const filled = i < level;
      ctx.font = 'bold 17px monospace';
      ctx.fillStyle   = filled ? '#FFD700' : 'rgba(255,255,255,0.14)';
      ctx.shadowColor = filled ? '#FFD700' : 'transparent';
      ctx.shadowBlur  = filled ? 12 : 0;
      ctx.fillText('★', 16 + i * 21, 57);
    }

    // Decay bar (full = 0s, empty = 10s → stars drop)
    const pct = Math.max(0, 1 - decayTimer / 10.0);
    const bw = 84, bh = 3;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(16, 62, bw, bh);
    ctx.fillStyle = '#FFD700'; ctx.fillRect(16, 62, bw * pct, bh);
    ctx.restore();
  }

  // ── Arena countdown ────────────────────────────────────────────────────────
  renderArenaCountdown(seconds) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const s = Math.ceil(seconds);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 42px Orbitron, monospace';
    ctx.fillStyle = '#FF0044'; ctx.shadowColor = '#FF0044'; ctx.shadowBlur = 30;
    ctx.fillText(`NEXT WAVE IN  ${s}`, W / 2, H / 2 - 12);
    ctx.font = '12px Orbitron, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.shadowBlur = 0;
    ctx.fillText(`WAVE ${Math.ceil(seconds) <= 1 ? '→' : ''} INCOMING`, W / 2, H / 2 + 22);
    ctx.restore();
  }

  // ── Controls panel ─────────────────────────────────────────────────────────
  renderControls(arenaMode = false) {
    const ctx  = this.ctx;
    const H    = this.canvas.height;
    const x    = HUD_PAD;
    const panelH = 70;
    const y    = H - HUD_PAD - panelH;

    const controls = arenaMode ? [
      { key:'WASD',  desc:'Move'   },
      { key:'CLICK', desc:'Shoot'  },
      { key:'F',     desc:'Car'    },
      { key:'SCROLL',desc:'Weapon' },
      { key:'P/ESC', desc:'Pause'  },
      { key:'ARENA', desc:'No Shop'},
    ] : [
      { key:'WASD',  desc:'Move'   },
      { key:'CLICK', desc:'Shoot'  },
      { key:'F',     desc:'Car'    },
      { key:'B',     desc:'Shop'   },
      { key:'SCROLL',desc:'Weapon' },
      { key:'P/ESC', desc:'Pause'  },
    ];
    const cols = 2;
    const rowH = panelH / Math.ceil(controls.length / cols);
    const colW = HUD_MM_W / cols;

    // Panel bg
    ctx.save();
    ctx.fillStyle   = 'rgba(0,0,0,0.62)';
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth   = 1;
    this._rr(ctx, x - 4, y - 4, HUD_MM_W + 8, panelH + 8, 6);
    ctx.fill(); ctx.stroke();
    ctx.restore();

    controls.forEach((c, i) => {
      const col  = i % cols;
      const row  = Math.floor(i / cols);
      const cx   = x + col * colW;
      const cy   = y + row * rowH + rowH * 0.65;

      ctx.save();
      // Key badge
      const kw = 42;
      ctx.fillStyle   = 'rgba(68,238,255,0.07)';
      ctx.strokeStyle = 'rgba(68,238,255,0.2)';
      ctx.lineWidth   = 0.8;
      this._rr(ctx, cx, cy - 11, kw, 14, 3);
      ctx.fill(); ctx.stroke();

      ctx.font      = '8px Orbitron, monospace';
      ctx.fillStyle = '#44EEFF';
      ctx.textAlign = 'center';
      ctx.fillText(c.key, cx + kw / 2, cy);

      // Description
      ctx.font      = '9px Rajdhani, monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.textAlign = 'left';
      ctx.fillText(c.desc, cx + kw + 5, cy);
      ctx.restore();
    });
  }

  // ── Top-right: money + kills + wave ───────────────────────────────────────
  renderMoney(money) {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    ctx.save();
    ctx.font = 'bold 28px Orbitron, monospace'; ctx.textAlign = 'right';
    ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 20; ctx.fillStyle = '#FFD700';
    ctx.fillText(`$ ${money.toLocaleString()}`, W - 16, 48);
    ctx.font = '9px Orbitron, monospace'; ctx.fillStyle = 'rgba(255,215,0,0.45)';
    ctx.fillText('MONEY', W - 16, 62);
    ctx.restore();
  }

  renderKills(kills) {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    ctx.save();
    ctx.font = 'bold 18px Orbitron, monospace'; ctx.textAlign = 'right';
    ctx.shadowColor = '#FF4444'; ctx.shadowBlur = 10; ctx.fillStyle = '#FF6666';
    ctx.fillText(`☠ ${kills}`, W - 16, 88);
    ctx.restore();
  }

  renderWave(wave, botCount, bossAlive = false) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = '11px Orbitron, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'left';
    const bossTag = bossAlive ? '  ☠ BOSS' : (wave >= 3 ? '  ☠ INCOMING...' : '  ☠ WAVE 3');
    ctx.fillText(`WAVE ${wave}   ENEMIES: ${botCount}${wave < 3 ? '' : bossTag}`, 16, 22);
    ctx.restore();
  }

  // ── Bottom-right: current weapon + shop button ─────────────────────────────
  renderWeaponInfo(player) {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const H   = this.canvas.height;
    const w   = player._weapon;
    const wColor = w.color;

    // Panel bg
    ctx.save();
    ctx.fillStyle   = 'rgba(0,0,0,0.65)';
    ctx.strokeStyle = `rgba(${this._rgb(wColor)},0.3)`;
    ctx.lineWidth   = 1;
    this._rr(ctx, W - 200, H - 88, 188, 52, 6);
    ctx.fill(); ctx.stroke();

    // Weapon color left bar
    ctx.fillStyle = wColor;
    ctx.fillRect(W - 200, H - 88 + 8, 3, 52 - 16);

    ctx.font = 'bold 13px Orbitron, monospace';
    ctx.fillStyle = wColor; ctx.shadowColor = wColor; ctx.shadowBlur = 10;
    ctx.textAlign = 'right';
    ctx.fillText(w.name, W - 16, H - 63);

    ctx.shadowBlur = 0;
    ctx.font = '10px Orbitron, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.35)';
    const dmg = w.damage > 0 ? w.damage : player.charData.damage;
    const fr  = w.fireRate > 0 ? w.fireRate : player.charData.fireRate;
    const eff = Math.round(dmg * player.damageMult);
    ctx.fillText(`DMG ${eff}   RPM ${Math.round(60000/fr)}${w.bullets>1?`   ×${w.bullets}`:''}`, W - 16, H - 47);

    // Damage mult indicator
    if (player.damageMult > 1) {
      ctx.fillStyle = '#FF4455';
      ctx.fillText(`×${player.damageMult.toFixed(2)} DMG`, W - 16, H - 35);
    }
    ctx.restore();
  }

  renderShopButton(shopOpen) {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const H   = this.canvas.height;
    ctx.save();
    ctx.fillStyle   = shopOpen ? 'rgba(68,238,255,0.18)' : 'rgba(0,0,0,0.6)';
    ctx.strokeStyle = shopOpen ? '#44EEFF' : 'rgba(68,238,255,0.25)';
    ctx.lineWidth   = shopOpen ? 1.5 : 1;
    ctx.shadowColor = shopOpen ? '#44EEFF' : 'transparent';
    ctx.shadowBlur  = shopOpen ? 12 : 0;
    this._rr(ctx, W - 136, H - 34, 124, 26, 5);
    ctx.fill(); ctx.stroke();

    ctx.font      = 'bold 10px Orbitron, monospace';
    ctx.fillStyle = shopOpen ? '#44EEFF' : 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.shadowColor = shopOpen ? '#44EEFF' : 'transparent';
    ctx.shadowBlur  = shopOpen ? 8 : 0;
    ctx.fillText('[B]  SHOP & UPGRADES', W - 74, H - 17);
    ctx.restore();
  }

  // ── Killstreak ─────────────────────────────────────────────────────────────
  renderKillStreak(streak, mult, popup, streakTimer) {
    const ctx = this.ctx;
    const W   = this.canvas.width;

    // Popup message (DOUBLE KILL, TRIPLE, etc.)
    if (popup.timer > 0) {
      const alpha = Math.min(1, popup.timer / 0.4);
      const scale = 1 + Math.max(0, popup.timer - 1.4) * 0.35;
      const colors = { 2: '#FFD700', 3: '#FF8800', 5: '#FF2200' };
      const col    = colors[popup.mult] || '#FFD700';
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(W / 2, 115);
      ctx.scale(scale, scale);
      ctx.textAlign = 'center';
      ctx.shadowColor = col; ctx.shadowBlur = 24;
      ctx.font = 'bold 28px Orbitron, monospace';
      ctx.fillStyle = col;
      ctx.fillText(popup.text, 0, 0);
      ctx.restore();
    }

    // Streak indicator bar (right side, below kills)
    if (streak >= 2) {
      const colors = ['', '', '#FFD700', '#FF8800', '#FF8800', '#FF2200'];
      const col    = colors[Math.min(streak, 5)] || '#FFD700';
      ctx.save();
      ctx.textAlign = 'right';
      ctx.font = 'bold 14px Orbitron, monospace';
      ctx.shadowColor = col; ctx.shadowBlur = 14;
      ctx.fillStyle = col;
      ctx.fillText(`×${mult}  STREAK`, W - 16, 112);

      // Streak decay bar
      const bw  = 80, bh = 3;
      const pct = Math.max(0, streakTimer / 3.0);
      ctx.fillStyle = '#111'; ctx.shadowBlur = 0;
      ctx.fillRect(W - 16 - bw, 118, bw, bh);
      ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 6;
      ctx.fillRect(W - 16 - bw, 118, bw * pct, bh);
      ctx.restore();
    }
  }

  // ── Vehicle HUD ────────────────────────────────────────────────────────────
  renderVehicleHud(vehicle) {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const H   = this.canvas.height;
    const pct = vehicle.hp / vehicle.maxHp;
    const barW = 160, barH = 14;
    const x   = W / 2 - barW / 2;
    const y   = H - 52;
    const col = pct > 0.5 ? '#44FF88' : pct > 0.25 ? '#FFCC00' : '#FF4444';

    ctx.save();
    ctx.fillStyle   = 'rgba(0,0,0,0.7)';
    ctx.strokeStyle = col;
    ctx.lineWidth   = 1; ctx.shadowColor = col; ctx.shadowBlur = 8;
    this._rr(ctx, x - 10, y - 22, barW + 20, barH + 30, 6);
    ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

    ctx.font = '9px Orbitron, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('VEHICLE  ·  [F] EXIT', W / 2, y - 7);

    ctx.fillStyle = '#111'; ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 8;
    ctx.fillRect(x, y, barW * pct, barH);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, barW, barH);

    ctx.font = 'bold 10px Orbitron, monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${Math.ceil(vehicle.hp)} / ${vehicle.maxHp}`, W / 2, y + barH - 2);
    ctx.restore();
  }

  // ── Crosshair ──────────────────────────────────────────────────────────────
  renderCrosshair(mx, my) {
    const ctx = this.ctx;
    const r = 12, gap = 5;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5;
    ctx.shadowColor = '#fff'; ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(mx-r,my); ctx.lineTo(mx-gap,my);
    ctx.moveTo(mx+gap,my); ctx.lineTo(mx+r,my);
    ctx.moveTo(mx,my-r); ctx.lineTo(mx,my-gap);
    ctx.moveTo(mx,my+gap); ctx.lineTo(mx,my+r);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(mx, my, 1.5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // ── Overlay screens ────────────────────────────────────────────────────────
  renderGameOver(money, kills) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.84)'; ctx.fillRect(0,0,W,H);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FF0033'; ctx.shadowBlur = 40;
    ctx.font = 'bold 72px Orbitron, monospace'; ctx.fillStyle = '#FF0033';
    ctx.fillText('GAME OVER', W/2, H/2-80);
    ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 20;
    ctx.font = 'bold 28px Orbitron, monospace'; ctx.fillStyle = '#FFD700';
    ctx.fillText(`$ ${money.toLocaleString()}  EARNED`, W/2, H/2-10);
    ctx.shadowColor = '#FF4444';
    ctx.font = '22px Orbitron, monospace'; ctx.fillStyle = '#FF6666';
    ctx.fillText(`${kills} ENEMIES DOWN`, W/2, H/2+35);
    ctx.font = '14px Orbitron, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('[R] RESTART   ·   [ESC] / CLICK = MENU', W/2, H/2+90);
    ctx.restore();
  }

  renderPause() {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fillRect(0,0,W,H);
    ctx.save();
    ctx.textAlign = 'center';

    // Title
    ctx.shadowColor = '#44EEFF'; ctx.shadowBlur = 30;
    ctx.font = 'bold 56px Orbitron, monospace'; ctx.fillStyle = '#44EEFF';
    ctx.fillText('PAUSED', W/2, H/2 - 20);

    // Key hints
    ctx.shadowBlur = 0;
    ctx.font = '13px Orbitron, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('[P]  /  [ESC]  /  CLICK  =  RESUME     [B]  =  SHOP', W/2, H/2 + 38);

    // Clickable MENU button
    const btnW = 200, btnH = 36, btnX = W/2 - btnW/2, btnY = H/2 + 72;
    ctx.fillStyle   = 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth   = 1;
    this._rr(ctx, btnX, btnY, btnW, btnH, 6);
    ctx.fill(); ctx.stroke();
    ctx.font = 'bold 11px Orbitron, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('[M]  BACK TO MENU', W/2, btnY + btnH/2 + 4);

    ctx.restore();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  _rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }

  _rgb(hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  }
}
