'use strict';

/**
 * @file ui.js
 * HUD — all screen-space (non-world) rendering.
 * Drawn on top of the game canvas after the world render each frame.
 *
 * HUD class responsibilities:
 *   renderMinimap(ctx, map, player, bots, boss, vehicles, portals) — bottom-left radar
 *   renderStats(ctx, player, money, wave, kills)                   — HP/ammo bars
 *   renderWeaponInfo(ctx, player)                                  — active weapon card
 *   renderKillFeed(ctx, W)                                         — scrolling kill log
 *   renderWaveAnnounce(ctx, W, H)                                  — wave start banner
 *   renderEventBanner(ctx, W, H, event, timer)                     — global event notice
 *   renderStreakPopup(ctx, W, popup)                               — kill-streak badge
 *   renderGrenadeCount(count)                                      — grenade HUD badge
 *   renderCompanionHP(ctx, companion)                              — companion health bar
 *   renderCampaignLevel(ctx, W, level, kills, target)             — campaign progress bar
 *   renderControls(arenaMode, isMobile)                            — keyboard hint overlay
 *   renderMobileHints(arenaMode)                                   — mobile action hints
 *   renderShopButton(shopOpen, isMobile)                           — [B] SHOP button
 *   addDamageNumber(wx, wy, dmg, camX, camY, color)               — floating damage text
 *   shake(intensity)                                               — trigger camera shake
 *   update(dt)                                                     — advance timers
 *
 * Layout constants (pixels, bottom-left anchor):
 *   HUD_MM_W / HUD_MM_H  — minimap dimensions
 *   HUD_PAD              — outer padding
 */

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
  renderMinimap(gameMap, player, bots, camX, camY, boss = null, districtLayout = null, vehicles = []) {
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

    // District zone overlays (drawn before dots so dots appear on top)
    if (districtLayout) {
      const zoneW = Math.round(mmW / 3);
      for (let i = 0; i < 3; i++) {
        const cfg = CONFIG.DISTRICTS.find(d => d.id === districtLayout[i]);
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = cfg.color;
        ctx.fillRect(mmX + i * zoneW, mmY, zoneW, mmH);
        if (i > 0) {
          ctx.globalAlpha = 0.5; ctx.strokeStyle = cfg.color; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(mmX + i * zoneW, mmY); ctx.lineTo(mmX + i * zoneW, mmY + mmH); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

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

    // Vehicle markers (orange car icons)
    for (const v of vehicles) {
      if (v.dead || v._exploding) continue;
      const vx = mmX + v.x * sx;
      const vy = mmY + v.y * sy;
      ctx.save();
      // Pulsing glow effect
      const pulse = Math.sin(performance.now() / 300) * 0.3 + 0.7;
      ctx.fillStyle = v.color || '#FF8800';
      ctx.shadowColor = '#FF8800';
      ctx.shadowBlur = 6 * pulse;
      // Draw car-shaped marker (small rectangle)
      ctx.translate(vx, vy);
      ctx.rotate(v.angle || 0);
      ctx.fillRect(-4, -2.5, 8, 5);
      ctx.restore();
      // Draw a ring around it to make it more visible
      ctx.save();
      ctx.strokeStyle = '#FF8800';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#FF8800';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(vx, vy, 8, 0, Math.PI * 2);
      ctx.stroke();
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

  // ── District HUD (top-right panel) ────────────────────────────────────────
  renderDistrictHUD(districtLayout, reputation, currentDistrict, shopDiscount) {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const panW = 184;
    const rowH = 22;
    const panH = districtLayout.length * rowH + 10 + (shopDiscount > 0 ? 18 : 0);
    const px   = W - panW - HUD_PAD;
    const py   = 100;  // below kills (y=88)

    // Panel background
    ctx.save();
    ctx.fillStyle   = 'rgba(0,0,0,0.70)';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth   = 1;
    this._rr(ctx, px - 6, py - 6, panW + 12, panH + 12, 6);
    ctx.fill(); ctx.stroke();

    districtLayout.forEach((distId, i) => {
      const cfg    = CONFIG.DISTRICTS.find(d => d.id === distId);
      const rep    = reputation[distId];
      const active = currentDistrict.id === distId;
      const ry     = py + i * rowH;

      ctx.globalAlpha = active ? 1.0 : 0.45;

      // Colored dot
      ctx.fillStyle   = cfg.color;
      ctx.shadowColor = active ? cfg.color : 'transparent';
      ctx.shadowBlur  = active ? 8 : 0;
      ctx.beginPath(); ctx.arc(px + 6, ry + 9, 4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      // Short name
      ctx.font      = 'bold 8px Orbitron, monospace';
      ctx.fillStyle = active ? '#ffffff' : '#aaaaaa';
      ctx.textAlign = 'left';
      ctx.fillText(cfg.shortName, px + 16, ry + 13);

      // Rep bar (60px wide)
      const barX = px + panW - 82;
      const barW = 60;
      const barH = 7;
      const barY = ry + 5;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(barX, barY, barW, barH);
      // Bar fill color based on rep value
      const barColor = rep < -50 ? '#FF4444' : rep > 50 ? '#44FF88' : '#FFDD44';
      const fillPct  = (rep + 100) / 200;  // 0..1
      ctx.fillStyle  = barColor;
      ctx.fillRect(barX, barY, Math.round(barW * fillPct), barH);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth   = 0.5;
      ctx.strokeRect(barX, barY, barW, barH);

      // Numeric rep
      ctx.font      = '8px Orbitron, monospace';
      ctx.fillStyle = active ? '#ffffff' : '#888888';
      ctx.textAlign = 'right';
      ctx.fillText((rep >= 0 ? '+' : '') + rep, px + panW, ry + 13);
    });

    // Shop discount badge
    if (shopDiscount > 0) {
      const badgeY = py + districtLayout.length * rowH + 4;
      ctx.globalAlpha = 1;
      ctx.font      = 'bold 9px Orbitron, monospace';
      ctx.fillStyle = '#FFDD44';
      ctx.shadowColor = '#FFDD44'; ctx.shadowBlur = 8;
      ctx.textAlign = 'center';
      ctx.fillText('SHOP  −15%', px + panW / 2, badgeY + 12);
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── District entry notification ────────────────────────────────────────────
  renderDistrictEntry(district, timer) {
    const ctx   = this.ctx;
    const W     = this.canvas.width;
    const H     = this.canvas.height;
    // Fade in over first 0.4s, hold, fade out over last 0.6s
    const alpha = timer < 0.6 ? timer / 0.6 : timer > 2.6 ? (3.0 - timer) / 0.4 : 1;

    const pillW = 290, pillH = 42;
    const px    = W / 2 - pillW / 2;
    const py    = H / 2 - 120;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    // Background pill
    ctx.fillStyle   = 'rgba(4,4,12,0.88)';
    ctx.strokeStyle = district.color;
    ctx.lineWidth   = 1.5;
    ctx.shadowColor = district.color;
    ctx.shadowBlur  = 16;
    this._rr(ctx, px, py, pillW, pillH, 10);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    // "ENTERING" label
    ctx.font      = 'bold 9px Orbitron, monospace';
    ctx.fillStyle = district.color;
    ctx.textAlign = 'center';
    ctx.fillText('ENTERING', W / 2, py + 14);

    // District name
    ctx.font      = 'bold 14px Orbitron, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(district.name, W / 2, py + 31);

    ctx.globalAlpha = 1;
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
  renderControls(arenaMode = false, isMobile = false) {
    // On mobile, touch buttons replace keyboard controls — skip this panel
    if (isMobile) return;

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
      { key:'V',     desc:'Drone'  },
      { key:'N',     desc:'B.Mkt'  },
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

  // ── Mobile controls hint (shown instead of keyboard panel on touch devices) ─
  renderMobileHints(arenaMode = false) {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const H   = this.canvas.height;

    // Map name / district hint at top-left
    ctx.save();
    ctx.fillStyle   = 'rgba(0,0,0,0.55)';
    ctx.strokeStyle = 'rgba(68,238,255,0.18)';
    ctx.lineWidth   = 1;
    this._rr(ctx, HUD_PAD - 4, 4, 130, 20, 4);
    ctx.fill(); ctx.stroke();
    ctx.font      = '8px Orbitron, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.textAlign = 'left';
    ctx.fillText('🕹 JOYSTICK · TAP FIRE', HUD_PAD + 2, 18);
    ctx.restore();

    // B (shop) + TAB (weapon) near bottom city name area
    if (!arenaMode) {
      const hints = [{ label:'[B] SHOP', color:'#44EEFF' }, { label:'[TAB] WEAPON', color:'rgba(255,255,255,0.5)' }];
      let hx = W / 2 - 80;
      hints.forEach(h => {
        ctx.save();
        ctx.fillStyle   = 'rgba(0,0,0,0.55)';
        ctx.strokeStyle = 'rgba(68,238,255,0.18)';
        ctx.lineWidth   = 1;
        this._rr(ctx, hx, H - 28, 72, 18, 4);
        ctx.fill(); ctx.stroke();
        ctx.font      = 'bold 8px Orbitron, monospace';
        ctx.fillStyle = h.color;
        ctx.textAlign = 'center';
        ctx.fillText(h.label, hx + 36, H - 15);
        ctx.restore();
        hx += 80;
      });
    }
  }

  // ── Top-right: money + kills ───────────────────────────────────────────────
  renderMoney(money) {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const t   = performance.now() / 1000;
    ctx.save();

    // Layout
    const iconSize = 32;
    const moneyTxt = money.toLocaleString();
    ctx.font = 'bold 28px Orbitron, monospace';
    const textW = ctx.measureText(moneyTxt).width;
    this._lastMoneyW = textW + iconSize + 16;

    const iconX = W - 16 - textW - iconSize / 2 - 12;
    const iconY = 40;
    const r = iconSize / 2;

    // Animation phases
    const pulse = Math.sin(t * 2.5) * 0.3 + 0.7;
    const energyPulse = Math.sin(t * 4) * 0.5 + 0.5;
    const rotateAngle = t * 0.3;

    // ═══ OUTER RING - Rotating dashed energy ring ═══
    ctx.save();
    ctx.translate(iconX, iconY);
    ctx.rotate(rotateAngle);
    ctx.strokeStyle = `rgba(0,229,255,${0.25 + pulse * 0.15})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, r + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // ═══ HEXAGON FRAME - Main container ═══
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 16 * pulse;

    // Outer hexagon glow
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(0,10,20,0.85)';
    this._drawHexagon(ctx, iconX, iconY, r);
    ctx.fill();
    ctx.stroke();

    // Inner hexagon border
    ctx.shadowBlur = 6;
    ctx.strokeStyle = 'rgba(0,229,255,0.4)';
    ctx.lineWidth = 1;
    this._drawHexagon(ctx, iconX, iconY, r * 0.75);
    ctx.stroke();

    // ═══ CIRCUIT LINES - Tech details at corners ═══
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0,229,255,0.3)';
    ctx.lineWidth = 1;
    // Top-left circuit
    ctx.beginPath();
    ctx.moveTo(iconX - r * 0.5, iconY - r * 0.65);
    ctx.lineTo(iconX - r * 0.85, iconY - r * 0.45);
    ctx.lineTo(iconX - r * 0.85, iconY - r * 0.15);
    ctx.stroke();
    // Top-right circuit
    ctx.beginPath();
    ctx.moveTo(iconX + r * 0.5, iconY - r * 0.65);
    ctx.lineTo(iconX + r * 0.85, iconY - r * 0.45);
    ctx.lineTo(iconX + r * 0.85, iconY - r * 0.15);
    ctx.stroke();
    // Bottom circuits
    ctx.beginPath();
    ctx.moveTo(iconX - r * 0.5, iconY + r * 0.65);
    ctx.lineTo(iconX - r * 0.85, iconY + r * 0.45);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(iconX + r * 0.5, iconY + r * 0.65);
    ctx.lineTo(iconX + r * 0.85, iconY + r * 0.45);
    ctx.stroke();

    // ═══ THE "N" LETTER - Stylized neon N ═══
    const nW = r * 0.7;  // N width
    const nH = r * 0.9;  // N height
    const nX = iconX - nW / 2;
    const nY = iconY - nH / 2;
    const strokeW = 2.5;

    // N glow layers
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Outer glow
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 12 + energyPulse * 6;
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = strokeW + 2;
    ctx.globalAlpha = 0.3;
    this._drawN(ctx, nX, nY, nW, nH);
    ctx.stroke();

    // Main N stroke
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = strokeW;
    this._drawN(ctx, nX, nY, nW, nH);
    ctx.stroke();

    // Inner bright core
    ctx.shadowBlur = 4;
    ctx.strokeStyle = `rgba(180,255,255,${0.6 + energyPulse * 0.4})`;
    ctx.lineWidth = strokeW * 0.4;
    this._drawN(ctx, nX, nY, nW, nH);
    ctx.stroke();

    // ═══ ENERGY NODES - Glowing dots at N vertices ═══
    const nodePositions = [
      { x: nX, y: nY },                    // Top-left
      { x: nX, y: nY + nH },               // Bottom-left
      { x: nX + nW, y: nY },               // Top-right
      { x: nX + nW, y: nY + nH }           // Bottom-right
    ];
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 6 + energyPulse * 4;
    ctx.fillStyle = `rgba(0,229,255,${0.7 + energyPulse * 0.3})`;
    for (const node of nodePositions) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 2 + energyPulse * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // ═══ DATA STREAM - Flowing particles along N ═══
    const particlePhase = (t * 1.5) % 1;
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#FFFFFF';
    // Particle going up left stroke
    const p1y = nY + nH - particlePhase * nH;
    ctx.beginPath();
    ctx.arc(nX, p1y, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Particle going down diagonal
    const p2x = nX + particlePhase * nW;
    const p2y = nY + particlePhase * nH;
    ctx.beginPath();
    ctx.arc(p2x, p2y, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // ═══ CORNER BRACKETS - Tech frame accents ═══
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0,229,255,0.5)';
    ctx.lineWidth = 1.5;
    const br = 4; // bracket size
    // Top-left bracket
    ctx.beginPath();
    ctx.moveTo(iconX - r + 2, iconY - r * 0.4);
    ctx.lineTo(iconX - r + 2, iconY - r * 0.55);
    ctx.lineTo(iconX - r * 0.7, iconY - r * 0.75);
    ctx.stroke();
    // Top-right bracket
    ctx.beginPath();
    ctx.moveTo(iconX + r - 2, iconY - r * 0.4);
    ctx.lineTo(iconX + r - 2, iconY - r * 0.55);
    ctx.lineTo(iconX + r * 0.7, iconY - r * 0.75);
    ctx.stroke();

    // ═══ PULSE RING - Expanding energy wave ═══
    const ringPhase = (t * 1.2) % 1;
    ctx.strokeStyle = `rgba(0,229,255,${(1 - ringPhase) * 0.35})`;
    ctx.lineWidth = 1 + (1 - ringPhase) * 1;
    ctx.shadowBlur = 4;
    this._drawHexagon(ctx, iconX, iconY, r * 0.5 + ringPhase * r * 0.7);
    ctx.stroke();

    // ═══ MONEY TEXT ═══
    ctx.textAlign = 'right';
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#00E5FF';
    ctx.font = 'bold 28px Orbitron, monospace';
    ctx.fillText(moneyTxt, W - 16, 48);

    // NEX label with subtle glow
    ctx.shadowBlur = 6;
    ctx.font = 'bold 9px Orbitron, monospace';
    ctx.fillStyle = 'rgba(0,229,255,0.5)';
    ctx.fillText('NEX', W - 16, 62);

    ctx.restore();
  }

  // Helper: Draw hexagon centered at (cx, cy) with radius r
  _drawHexagon(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  // Helper: Draw stylized "N" letter path
  _drawN(ctx, x, y, w, h) {
    ctx.beginPath();
    // Left vertical stroke (bottom to top)
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y);
    // Diagonal stroke (top-left to bottom-right)
    ctx.lineTo(x + w, y + h);
    // Right vertical stroke (bottom to top)
    ctx.lineTo(x + w, y);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REUSABLE NEX CURRENCY ICON - Can be called from anywhere
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * Renders the animated NEX currency icon at specified position
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x - Center X position
   * @param {number} y - Center Y position
   * @param {number} size - Icon size (diameter)
   * @param {object} opts - Options { animated: true, glowIntensity: 1.0 }
   */
  renderNexIcon(ctx, x, y, size, opts = {}) {
    const animated = opts.animated !== false;
    const glowMult = opts.glowIntensity || 1.0;
    const t = animated ? performance.now() / 1000 : 0;
    const r = size / 2;

    ctx.save();

    // Animation phases
    const pulse = animated ? Math.sin(t * 2.5) * 0.3 + 0.7 : 1;
    const energyPulse = animated ? Math.sin(t * 4) * 0.5 + 0.5 : 0.5;
    const rotateAngle = animated ? t * 0.3 : 0;

    // ═══ OUTER RING - Rotating dashed energy ring ═══
    if (animated) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotateAngle);
      ctx.strokeStyle = `rgba(0,229,255,${0.25 + pulse * 0.15})`;
      ctx.lineWidth = Math.max(1, size / 20);
      ctx.setLineDash([size / 8, size / 5]);
      ctx.beginPath();
      ctx.arc(0, 0, r + size / 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // ═══ HEXAGON FRAME - Main container ═══
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = (16 * pulse * glowMult) * (size / 32);

    // Outer hexagon glow
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = Math.max(1.5, size / 16);
    ctx.fillStyle = 'rgba(0,10,20,0.85)';
    this._drawHexagon(ctx, x, y, r);
    ctx.fill();
    ctx.stroke();

    // Inner hexagon border
    ctx.shadowBlur = 6 * (size / 32);
    ctx.strokeStyle = 'rgba(0,229,255,0.4)';
    ctx.lineWidth = Math.max(0.8, size / 32);
    this._drawHexagon(ctx, x, y, r * 0.75);
    ctx.stroke();

    // ═══ CIRCUIT LINES - Tech details at corners ═══
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0,229,255,0.3)';
    ctx.lineWidth = Math.max(0.8, size / 32);
    // Top-left circuit
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y - r * 0.65);
    ctx.lineTo(x - r * 0.85, y - r * 0.45);
    ctx.lineTo(x - r * 0.85, y - r * 0.15);
    ctx.stroke();
    // Top-right circuit
    ctx.beginPath();
    ctx.moveTo(x + r * 0.5, y - r * 0.65);
    ctx.lineTo(x + r * 0.85, y - r * 0.45);
    ctx.lineTo(x + r * 0.85, y - r * 0.15);
    ctx.stroke();
    // Bottom circuits
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y + r * 0.65);
    ctx.lineTo(x - r * 0.85, y + r * 0.45);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + r * 0.5, y + r * 0.65);
    ctx.lineTo(x + r * 0.85, y + r * 0.45);
    ctx.stroke();

    // ═══ THE "N" LETTER - Stylized neon N ═══
    const nW = r * 0.7;
    const nH = r * 0.9;
    const nX = x - nW / 2;
    const nY = y - nH / 2;
    const strokeW = Math.max(2, size / 12);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Outer glow
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = (12 + energyPulse * 6) * (size / 32);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = strokeW + Math.max(1.5, size / 20);
    ctx.globalAlpha = 0.3;
    this._drawN(ctx, nX, nY, nW, nH);
    ctx.stroke();

    // Main N stroke
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 8 * (size / 32);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = strokeW;
    this._drawN(ctx, nX, nY, nW, nH);
    ctx.stroke();

    // Inner bright core
    ctx.shadowBlur = 4 * (size / 32);
    ctx.strokeStyle = `rgba(180,255,255,${0.6 + energyPulse * 0.4})`;
    ctx.lineWidth = strokeW * 0.4;
    this._drawN(ctx, nX, nY, nW, nH);
    ctx.stroke();

    // ═══ ENERGY NODES - Glowing dots at N vertices ═══
    const nodePositions = [
      { x: nX, y: nY },
      { x: nX, y: nY + nH },
      { x: nX + nW, y: nY },
      { x: nX + nW, y: nY + nH }
    ];
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = (6 + energyPulse * 4) * (size / 32);
    ctx.fillStyle = `rgba(0,229,255,${0.7 + energyPulse * 0.3})`;
    const nodeR = Math.max(1.5, size / 16) + energyPulse * (size / 40);
    for (const node of nodePositions) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeR, 0, Math.PI * 2);
      ctx.fill();
    }

    // ═══ DATA STREAM - Flowing particles along N ═══
    if (animated) {
      const particlePhase = (t * 1.5) % 1;
      ctx.shadowBlur = 8 * (size / 32);
      ctx.fillStyle = '#FFFFFF';
      const particleR = Math.max(1, size / 22);
      // Particle going up left stroke
      const p1y = nY + nH - particlePhase * nH;
      ctx.beginPath();
      ctx.arc(nX, p1y, particleR, 0, Math.PI * 2);
      ctx.fill();
      // Particle going down diagonal
      const p2x = nX + particlePhase * nW;
      const p2y = nY + particlePhase * nH;
      ctx.beginPath();
      ctx.arc(p2x, p2y, particleR, 0, Math.PI * 2);
      ctx.fill();
    }

    // ═══ CORNER BRACKETS - Tech frame accents ═══
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0,229,255,0.5)';
    ctx.lineWidth = Math.max(1, size / 22);
    // Top-left bracket
    ctx.beginPath();
    ctx.moveTo(x - r + 2, y - r * 0.4);
    ctx.lineTo(x - r + 2, y - r * 0.55);
    ctx.lineTo(x - r * 0.7, y - r * 0.75);
    ctx.stroke();
    // Top-right bracket
    ctx.beginPath();
    ctx.moveTo(x + r - 2, y - r * 0.4);
    ctx.lineTo(x + r - 2, y - r * 0.55);
    ctx.lineTo(x + r * 0.7, y - r * 0.75);
    ctx.stroke();

    // ═══ PULSE RING - Expanding energy wave ═══
    if (animated) {
      const ringPhase = (t * 1.2) % 1;
      ctx.strokeStyle = `rgba(0,229,255,${(1 - ringPhase) * 0.35})`;
      ctx.lineWidth = Math.max(0.8, size / 32) + (1 - ringPhase) * (size / 32);
      ctx.shadowBlur = 4 * (size / 32);
      this._drawHexagon(ctx, x, y, r * 0.5 + ringPhase * r * 0.7);
      ctx.stroke();
    }

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

  renderGrenadeCount(count) {
    const ctx = this.ctx;
    const H   = this.canvas.height;
    const x   = HUD_PAD + HUD_MM_W + 10;
    const y   = H - HUD_PAD - 50;
    ctx.save();
    ctx.fillStyle   = 'rgba(0,0,0,0.65)';
    ctx.strokeStyle = '#FF8800'; ctx.lineWidth = 1;
    this._rr(ctx, x, y, 80, 22, 5); ctx.fill(); ctx.stroke();
    ctx.font      = 'bold 10px Orbitron, monospace';
    ctx.fillStyle = '#FF8800'; ctx.textAlign = 'left';
    ctx.fillText(`\u{1F4A3} x${count}`, x + 8, y + 15);
    ctx.restore();
  }

  renderAchButton(panelOpen) {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const H   = this.canvas.height;
    ctx.save();
    ctx.fillStyle   = panelOpen ? 'rgba(255,204,0,0.18)' : 'rgba(0,0,0,0.6)';
    ctx.strokeStyle = panelOpen ? '#FFCC00' : 'rgba(255,204,0,0.25)';
    ctx.lineWidth   = panelOpen ? 1.5 : 1;
    ctx.shadowColor = panelOpen ? '#FFCC00' : 'transparent';
    ctx.shadowBlur  = panelOpen ? 12 : 0;
    this._rr(ctx, W - 136, H - 66, 124, 26, 5);
    ctx.fill(); ctx.stroke();

    ctx.font      = 'bold 10px Orbitron, monospace';
    ctx.fillStyle = panelOpen ? '#FFCC00' : 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.shadowColor = panelOpen ? '#FFCC00' : 'transparent';
    ctx.shadowBlur  = panelOpen ? 8 : 0;
    ctx.fillText('[TAB]  ACHIEVEMENTS', W - 74, H - 49);
    ctx.restore();
  }

  renderDayNight(nightAlpha, gameTime) {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    if (nightAlpha < 0.05) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, nightAlpha * 1.8);
    ctx.textAlign = 'center';
    ctx.font = '14px Orbitron, monospace';
    ctx.fillStyle = '#8899CC';
    ctx.shadowColor = '#8899CC'; ctx.shadowBlur = 8;
    ctx.fillText('☽  NIGHT', W / 2, 22);
    ctx.restore();
  }

  renderDroneStatus(drone, inControl) {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const H   = this.canvas.height;
    const panelW = 180, panelH = inControl ? 48 : 38;
    const px = W / 2 - panelW / 2;
    const py = H - 100;

    ctx.save();
    ctx.fillStyle   = 'rgba(0,0,0,0.72)';
    ctx.strokeStyle = inControl ? '#44EEFF' : '#44EEFF';
    ctx.lineWidth   = 1;
    ctx.shadowColor = '#44EEFF'; ctx.shadowBlur = 8;
    this._rr(ctx, px, py, panelW, panelH, 6);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = 'bold 9px Orbitron, monospace';
    ctx.fillStyle = '#44EEFF'; ctx.textAlign = 'center';
    ctx.fillText(inControl ? 'DRONE CONTROL MODE' : 'DRONE ACTIVE', W / 2, py + 14);

    if (inControl) {
      ctx.font = '8px Orbitron, monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText('[V] RECALL · WASD MOVE', W / 2, py + 30);
    } else {
      // HP bar
      const pct = drone.hp / drone.maxHp;
      const bw = panelW - 24;
      const bx = px + 12, by = py + 22;
      ctx.fillStyle = '#111'; ctx.fillRect(bx, by, bw, 6);
      ctx.fillStyle = '#44EEFF'; ctx.shadowColor = '#44EEFF'; ctx.shadowBlur = 6;
      ctx.fillRect(bx, by, bw * pct, 6);
    }
    ctx.restore();
  }

  renderBlackMarket(ctx, W, H, items, money, mx, my, bought) {
    // Dark overlay
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.textAlign = 'center';
    ctx.font = 'bold 32px Orbitron, monospace';
    ctx.fillStyle = '#FFAA00'; ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 30;
    ctx.fillText('BLACK MARKET', W / 2, 56);
    ctx.shadowBlur = 0;
    ctx.font = '11px Orbitron, monospace'; ctx.fillStyle = 'rgba(255,170,0,0.4)';
    ctx.fillText('ONLY AVAILABLE AT NIGHT  ·  PRESS [N] TO CLOSE', W / 2, 78);

    // Money with NEX icon
    const moneyTxt = `${money.toLocaleString()} NEX`;
    ctx.font = 'bold 16px Orbitron, monospace';
    const moneyW = ctx.measureText(moneyTxt).width;
    const iconSize = 22;
    const iconX = W - 24 - moneyW - iconSize - 6;
    this.renderNexIcon(ctx, iconX, 50, iconSize, { animated: true });
    ctx.fillStyle = '#00E5FF'; ctx.shadowColor = '#00E5FF'; ctx.shadowBlur = 14;
    ctx.textAlign = 'right';
    ctx.fillText(moneyTxt, W - 24, 56);
    ctx.shadowBlur = 0;

    // Items — 2 columns x 3 rows
    const cols = 2;
    const itemW = Math.min(320, (W - 80) / cols);
    const itemH = 84;
    const gridW = cols * itemW + (cols - 1) * 16;
    const startX = W / 2 - gridW / 2;
    const startY = 102;
    const clickAreas = [];

    items.forEach((item, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const ix = startX + col * (itemW + 16);
      const iy = startY + row * (itemH + 12);
      const hover = mx >= ix && mx <= ix + itemW && my >= iy && my <= iy + itemH;
      const owned = bought.has(item.id);

      ctx.save();
      ctx.fillStyle   = owned ? 'rgba(80,60,0,0.5)' : hover ? 'rgba(255,170,0,0.12)' : 'rgba(20,14,0,0.85)';
      ctx.strokeStyle = owned ? 'rgba(150,120,0,0.4)' : hover ? '#FFAA00' : 'rgba(255,170,0,0.3)';
      ctx.lineWidth   = hover ? 1.5 : 1;
      ctx.shadowColor = hover ? '#FFAA00' : 'transparent';
      ctx.shadowBlur  = hover ? 14 : 0;
      this._rr(ctx, ix, iy, itemW, itemH, 7);
      ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;

      // Type badge
      const typeColors = { weapon:'#FF5533', implant:'#AA44FF', vehicle:'#44FF88' };
      ctx.fillStyle = typeColors[item.type] || '#888';
      ctx.font = 'bold 8px Orbitron, monospace'; ctx.textAlign = 'left';
      ctx.fillText(item.type.toUpperCase(), ix + 10, iy + 16);

      // Name
      ctx.font = 'bold 13px Orbitron, monospace';
      ctx.fillStyle = owned ? '#888' : '#FFAA00';
      ctx.fillText(item.name, ix + 10, iy + 34);

      // Desc
      ctx.font = '9px Orbitron, monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText(item.desc, ix + 10, iy + 50);

      // Price
      ctx.textAlign = 'right';
      ctx.font = 'bold 12px Orbitron, monospace';
      ctx.fillStyle = owned ? '#666' : money >= item.price ? '#00FFCC' : '#FF4444';
      ctx.fillText(owned ? 'OWNED' : `⬢ ${item.price.toLocaleString()}`, ix + itemW - 10, iy + 34);

      ctx.restore();
      clickAreas.push({ ix, iy, itemW, itemH, item });
    });

    ctx.restore();
    return clickAreas;
  }

  renderShopButton(shopOpen, isMobile = false) {
    if (isMobile) return;
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

  renderModeBadge(label, color) {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const H   = this.canvas.height;
    ctx.save();
    ctx.fillStyle   = 'rgba(0,0,0,0.65)';
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 10;
    this._rr(ctx, W - 200, H - 34, 188, 26, 5);
    ctx.fill(); ctx.stroke();
    ctx.font      = 'bold 9px Orbitron, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(label, W - 106, H - 17);
    ctx.restore();
  }

  // ── Campaign level ─────────────────────────────────────────────────────────
  renderCampaignLevel(level, kills, target, levelComplete, completeT) {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const barW = 180, barH = 16;
    const bx  = W / 2 - barW / 2;
    const by  = 44;
    ctx.save();
    ctx.fillStyle   = 'rgba(0,0,0,0.72)';
    ctx.strokeStyle = '#FFDD00';
    ctx.lineWidth   = 1.5;
    ctx.shadowColor = '#FFDD00';
    ctx.shadowBlur  = 12;
    this._rr(ctx, bx - 60, by - 22, barW + 120, barH + 30, 6);
    ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

    ctx.fillStyle = '#FFDD00'; ctx.font = 'bold 9px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.fillText(`CAMPAIGN  ·  LEVEL ${level}`, W / 2, by - 5);
    ctx.fillStyle = '#1a1a00'; ctx.fillRect(bx, by, barW, barH);
    const pct = Math.min(1, kills / Math.max(1, target));
    ctx.fillStyle = '#FFDD00'; ctx.shadowColor = '#FFDD00'; ctx.shadowBlur = 8;
    ctx.fillRect(bx, by, barW * pct, barH);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,0,0.22)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(bx, by, barW, barH);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Orbitron, monospace';
    ctx.fillText(`${kills} / ${target}  KILLS`, W / 2, by + barH - 2);

    if (levelComplete) {
      const flash = Math.sin(completeT * 8) * 0.5 + 0.5;
      ctx.globalAlpha = 0.7 + flash * 0.3;
      ctx.fillStyle = '#FFDD00'; ctx.shadowColor = '#FFDD00'; ctx.shadowBlur = 30;
      ctx.font = 'bold 22px Orbitron, monospace';
      ctx.fillText('LEVEL COMPLETE!', W / 2, by + 55);
    }
    ctx.restore();
  }

  // ── Companion HP badge ──────────────────────────────────────────────────────
  renderCompanionHP(companion) {
    const ctx = this.ctx;
    const H   = this.canvas.height;
    const x   = HUD_PAD + HUD_MM_W + 10;
    const y   = H - HUD_PAD - 80;
    const pct = companion.hp / companion.maxHp;
    const col = pct > 0.5 ? '#44FF88' : pct > 0.25 ? '#FFCC00' : '#FF4444';
    ctx.save();
    ctx.fillStyle   = 'rgba(0,0,0,0.65)';
    ctx.strokeStyle = col;
    ctx.lineWidth   = 1;
    ctx.shadowColor = col; ctx.shadowBlur = 8;
    this._rr(ctx, x, y, 82, 24, 5);
    ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = col; ctx.font = 'bold 8px Orbitron, monospace'; ctx.textAlign = 'left';
    const icon = { dog:'🐕', cat:'🐈', wolf:'🐺', raven:'🦅', bear:'🐻', fox:'🦊' }[companion.type] || '🐾';
    ctx.fillText(`${icon} ${Math.ceil(companion.hp)}/${companion.maxHp}`, x + 6, y + 16);
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
  renderGameOver(money, kills, surviveSeconds = 0, mouseX = 0, mouseY = 0) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.84)'; ctx.fillRect(0,0,W,H);

    // Format survival time as "X MINUTES Y SECONDS" (or just seconds if < 60)
    const sm = Math.floor(surviveSeconds / 60);
    const ss = Math.floor(surviveSeconds % 60);
    const timeTxt = sm > 0
      ? `${sm} MINUTE${sm !== 1 ? 'S' : ''} ${ss} SECOND${ss !== 1 ? 'S' : ''}`
      : `${ss} SECOND${ss !== 1 ? 'S' : ''}`;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FF0033'; ctx.shadowBlur = 40;
    ctx.font = 'bold 72px Orbitron, monospace'; ctx.fillStyle = '#FF0033';
    ctx.fillText('GAME OVER', W/2, H/2-110);
    ctx.shadowColor = '#44FFAA'; ctx.shadowBlur = 16;
    ctx.font = 'bold 16px Orbitron, monospace'; ctx.fillStyle = '#AAFFCC';
    ctx.fillText(`SURVIVED  ${timeTxt}`, W/2, H/2-62);

    // NEX earned with animated icon
    const moneyTxt = `${money.toLocaleString()} NEX  EARNED`;
    ctx.font = 'bold 28px Orbitron, monospace';
    const moneyW = ctx.measureText(moneyTxt).width;
    const iconSize = 36;
    const totalW = iconSize + 12 + moneyW;
    const startX = W/2 - totalW/2;

    // Draw the NEX icon
    this.renderNexIcon(ctx, startX + iconSize/2, H/2 - 20, iconSize, { glowIntensity: 1.2 });

    // Draw the money text
    ctx.shadowColor = '#00E5FF'; ctx.shadowBlur = 20;
    ctx.fillStyle = '#00E5FF';
    ctx.textAlign = 'left';
    ctx.fillText(moneyTxt, startX + iconSize + 12, H/2 - 12);

    ctx.textAlign = 'center';
    ctx.shadowColor = '#FF4444';
    ctx.font = '22px Orbitron, monospace'; ctx.fillStyle = '#FF6666';
    ctx.fillText(`${kills} ENEMIES DOWN`, W/2, H/2 + 28);
    ctx.shadowBlur = 0;

    // Button dimensions
    const btnW = 200, btnH = 45;
    const btnGap = 20;

    // Store button bounds for click detection
    this._gameOverButtons = {};

    // ─── RESTART Button ───
    const restartBtnX = W/2 - btnW - btnGap/2;
    const restartBtnY = H/2 + 60;
    const restartHovered = mouseX >= restartBtnX && mouseX <= restartBtnX + btnW &&
                           mouseY >= restartBtnY && mouseY <= restartBtnY + btnH;

    this._gameOverButtons.restart = { x: restartBtnX, y: restartBtnY, w: btnW, h: btnH };

    // Button background
    if (restartHovered) {
      ctx.fillStyle = 'rgba(68,238,255,0.25)';
      ctx.shadowColor = '#44EEFF';
      ctx.shadowBlur = 15;
    } else {
      ctx.fillStyle = 'rgba(68,238,255,0.08)';
    }
    ctx.strokeStyle = restartHovered ? '#44EEFF' : 'rgba(68,238,255,0.4)';
    ctx.lineWidth = restartHovered ? 2 : 1;
    this._rr(ctx, restartBtnX, restartBtnY, btnW, btnH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Button text
    ctx.font = 'bold 16px Orbitron, monospace';
    ctx.fillStyle = restartHovered ? '#FFFFFF' : 'rgba(255,255,255,0.8)';
    ctx.fillText('RESTART', restartBtnX + btnW/2, restartBtnY + btnH/2 + 6);
    ctx.font = '11px Orbitron, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('[R]', restartBtnX + btnW/2, restartBtnY + btnH + 15);

    // ─── MAIN MENU Button ───
    const menuBtnX = W/2 + btnGap/2;
    const menuBtnY = H/2 + 60;
    const menuHovered = mouseX >= menuBtnX && mouseX <= menuBtnX + btnW &&
                        mouseY >= menuBtnY && mouseY <= menuBtnY + btnH;

    this._gameOverButtons.menu = { x: menuBtnX, y: menuBtnY, w: btnW, h: btnH };

    // Button background
    if (menuHovered) {
      ctx.fillStyle = 'rgba(255,100,100,0.25)';
      ctx.shadowColor = '#FF6666';
      ctx.shadowBlur = 15;
    } else {
      ctx.fillStyle = 'rgba(255,100,100,0.08)';
    }
    ctx.strokeStyle = menuHovered ? '#FF6666' : 'rgba(255,100,100,0.4)';
    ctx.lineWidth = menuHovered ? 2 : 1;
    this._rr(ctx, menuBtnX, menuBtnY, btnW, btnH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Button text
    ctx.font = 'bold 16px Orbitron, monospace';
    ctx.fillStyle = menuHovered ? '#FFFFFF' : 'rgba(255,255,255,0.8)';
    ctx.fillText('MAIN MENU', menuBtnX + btnW/2, menuBtnY + btnH/2 + 6);
    ctx.font = '11px Orbitron, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('[ESC]', menuBtnX + btnW/2, menuBtnY + btnH + 15);

    ctx.restore();

    return this._gameOverButtons;
  }

  renderPause(mouseX = 0, mouseY = 0) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;

    // Dark overlay with blur effect
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);

    // Decorative border glow
    ctx.save();
    ctx.strokeStyle = 'rgba(68,238,255,0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(W/2 - 200, H/2 - 140, 400, 320);
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';

    // Title with glow
    ctx.shadowColor = '#44EEFF';
    ctx.shadowBlur = 40;
    ctx.font = 'bold 52px Orbitron, monospace';
    ctx.fillStyle = '#44EEFF';
    ctx.fillText('PAUSED', W/2, H/2 - 80);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.font = '14px Orbitron, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('Game is paused', W/2, H/2 - 50);

    // Button dimensions
    const btnW = 220, btnH = 45;
    const btnSpacing = 60;

    // Store button bounds for click detection
    this._pauseButtons = {};

    // ─── RESUME Button ───
    const resumeBtnX = W/2 - btnW/2;
    const resumeBtnY = H/2 - 10;
    const resumeHovered = mouseX >= resumeBtnX && mouseX <= resumeBtnX + btnW &&
                          mouseY >= resumeBtnY && mouseY <= resumeBtnY + btnH;

    this._pauseButtons.resume = { x: resumeBtnX, y: resumeBtnY, w: btnW, h: btnH };

    // Button background
    if (resumeHovered) {
      ctx.fillStyle = 'rgba(68,238,255,0.25)';
      ctx.shadowColor = '#44EEFF';
      ctx.shadowBlur = 15;
    } else {
      ctx.fillStyle = 'rgba(68,238,255,0.08)';
    }
    ctx.strokeStyle = resumeHovered ? '#44EEFF' : 'rgba(68,238,255,0.4)';
    ctx.lineWidth = resumeHovered ? 2 : 1;
    this._rr(ctx, resumeBtnX, resumeBtnY, btnW, btnH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Button text
    ctx.font = 'bold 16px Orbitron, monospace';
    ctx.fillStyle = resumeHovered ? '#FFFFFF' : 'rgba(255,255,255,0.8)';
    ctx.fillText('RESUME', W/2, resumeBtnY + btnH/2 + 6);
    ctx.font = '11px Orbitron, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('[ESC]', W/2, resumeBtnY + btnH + 15);

    // ─── BACK TO MAPS Button ───
    const mapsBtnX = W/2 - btnW/2;
    const mapsBtnY = resumeBtnY + btnSpacing + 25;
    const mapsHovered = mouseX >= mapsBtnX && mouseX <= mapsBtnX + btnW &&
                        mouseY >= mapsBtnY && mouseY <= mapsBtnY + btnH;

    this._pauseButtons.maps = { x: mapsBtnX, y: mapsBtnY, w: btnW, h: btnH };

    // Button background
    if (mapsHovered) {
      ctx.fillStyle = 'rgba(255,100,100,0.25)';
      ctx.shadowColor = '#FF6666';
      ctx.shadowBlur = 15;
    } else {
      ctx.fillStyle = 'rgba(255,100,100,0.08)';
    }
    ctx.strokeStyle = mapsHovered ? '#FF6666' : 'rgba(255,100,100,0.4)';
    ctx.lineWidth = mapsHovered ? 2 : 1;
    this._rr(ctx, mapsBtnX, mapsBtnY, btnW, btnH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Button text
    ctx.font = 'bold 16px Orbitron, monospace';
    ctx.fillStyle = mapsHovered ? '#FFFFFF' : 'rgba(255,255,255,0.8)';
    ctx.fillText('BACK TO MAPS', W/2, mapsBtnY + btnH/2 + 6);
    ctx.font = '11px Orbitron, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('[M]', W/2, mapsBtnY + btnH + 15);

    // Bottom hint
    ctx.font = '12px Orbitron, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText('[B] Open Shop', W/2, H/2 + 130);

    ctx.restore();

    return this._pauseButtons;
  }

  // ── Global Event Banner ────────────────────────────────────────────────────
  renderEventBanner(ctx, W, H, event, announceTimer) {
    const colors = {
      blackout:    '#3355AA',
      riot:        '#FF4422',
      corporate:   '#BBCCDD',
      cyber_virus: '#00FFCC',
    };
    const col = colors[event.id] || '#FFFFFF';

    if (announceTimer > 0) {
      // Full-screen dramatic announcement
      const fade = Math.min(1, Math.min(announceTimer, 3.5 - announceTimer) * 1.2);
      ctx.save();
      ctx.globalAlpha = fade * 0.88;
      ctx.fillStyle = 'rgba(0,0,0,0.82)';
      ctx.fillRect(0, 0, W, H);

      // Colored border glow
      ctx.globalAlpha = fade;
      ctx.strokeStyle = col;
      ctx.lineWidth   = 3;
      ctx.shadowColor = col;
      ctx.shadowBlur  = 28;
      ctx.strokeRect(12, 12, W - 24, H - 24);
      ctx.shadowBlur = 0;

      // Event name
      ctx.fillStyle  = col;
      ctx.font       = 'bold 38px Orbitron, monospace';
      ctx.textAlign  = 'center';
      ctx.shadowColor = col; ctx.shadowBlur = 22;
      ctx.fillText(event.name, W / 2, H / 2 - 20);

      // Desc
      ctx.shadowBlur = 0;
      ctx.fillStyle  = 'rgba(255,255,255,0.75)';
      ctx.font       = '15px Orbitron, monospace';
      ctx.fillText(event.desc, W / 2, H / 2 + 22);

      ctx.restore();
    } else {
      // Compact pulsing top-center bar
      const bw = 260, bh = 28;
      const bx = W / 2 - bw / 2, by = 14;
      const pulse = 0.75 + Math.sin(Date.now() / 380) * 0.25;

      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = 'rgba(0,0,0,0.78)';
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 5); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 1.2;
      ctx.shadowColor = col; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 5); ctx.stroke();

      // Timer drain bar
      const frac = Math.max(0, event.timer / event.duration);
      ctx.fillStyle = col; ctx.globalAlpha = pulse * 0.35;
      ctx.fillRect(bx + 1, by + bh - 3, (bw - 2) * frac, 2);

      ctx.shadowBlur = 0;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = col;
      ctx.font = 'bold 10px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`⚡ ${event.name}  ${Math.ceil(event.timer)}s`, W / 2, by + bh / 2 + 4);
      ctx.restore();
    }
  }

  // ── Zombie Wave Display ────────────────────────────────────────────────────
  renderZombieWave(wave, remaining, countdown, total) {
    const ctx = this.ctx;
    const x = HUD_PAD + HUD_MM_W + 16;
    const y = this.canvas.height - HUD_PAD - 10;

    ctx.save();
    ctx.shadowColor = '#44FF88';
    ctx.shadowBlur  = 10;
    ctx.fillStyle   = '#44FF88';
    ctx.font        = 'bold 13px Orbitron, monospace';
    ctx.textAlign   = 'left';
    ctx.fillText(`☣ WAVE ${wave}`, x, y - 14);
    ctx.fillStyle   = 'rgba(68,255,136,0.8)';
    ctx.font        = '11px Orbitron, monospace';
    ctx.fillText(countdown > 0 ? 'WAVE CLEARED' : `INFECTED: ${remaining}`, x, y);
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = 'rgba(68,255,136,0.4)';
    ctx.font        = 'bold 8px Orbitron, monospace';
    ctx.fillText('SURVIVAL', x + 200, y - 14);
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

  // ── Survival timer — sits to the LEFT of the money block ──────────────────
  renderSurviveTimer(ctx, W, seconds) {
    const m   = Math.floor(seconds / 60);
    const s   = Math.floor(seconds % 60);
    const d   = Math.floor((seconds % 1) * 10);
    const txt = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${d}`;
    // Align right edge just left of the money block (gap = 20px)
    const x = W - 16 - (this._lastMoneyW || 140) - 20;
    ctx.save();
    ctx.font = 'bold 14px Orbitron, monospace'; ctx.textAlign = 'right';
    ctx.fillStyle = '#AAFFAA'; ctx.shadowColor = '#44FF88'; ctx.shadowBlur = 10;
    ctx.fillText(txt, x, 48);
    ctx.font = '8px Orbitron, monospace'; ctx.fillStyle = 'rgba(68,255,136,0.45)'; ctx.shadowBlur = 0;
    ctx.fillText('SURVIVED', x, 62);
    ctx.restore();
  }

  // ── Active buff icons (top-right) ──────────────────────────────────────────
  renderActiveBuffs(buffs) {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const SLOT_W = 52, SLOT_H = 48, PAD = 4;
    let bx = W - 16;
    let by = 72;  // below wave/kills row
    for (const [id, b] of buffs) {
      if (!b.remaining || b.remaining <= 0) continue;
      const col  = b.color || '#44EEFF';
      const pct  = b.maxDur > 0 ? Math.max(0, b.remaining / b.maxDur) : 1;
      bx -= SLOT_W + PAD;
      // Card bg
      ctx.save();
      ctx.fillStyle   = 'rgba(0,0,0,0.72)';
      ctx.strokeStyle = col + '88';
      ctx.lineWidth   = 1;
      ctx.shadowColor = col; ctx.shadowBlur = pct > 0.3 ? 8 : 0;
      ctx.beginPath(); ctx.roundRect(bx, by, SLOT_W, SLOT_H, 5); ctx.fill(); ctx.stroke();
      // Icon
      ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.shadowBlur = 0;
      ctx.fillText(b.icon || '✦', bx + SLOT_W / 2, by + 22);
      // Label
      ctx.font = 'bold 6px Orbitron, monospace'; ctx.fillStyle = col; ctx.shadowBlur = 0;
      ctx.fillText((b.name || id).slice(0, 8).toUpperCase(), bx + SLOT_W / 2, by + 33);
      // Countdown bar
      ctx.fillStyle = '#222';
      ctx.fillRect(bx + 4, by + 38, SLOT_W - 8, 5);
      ctx.fillStyle = col;
      ctx.fillRect(bx + 4, by + 38, Math.round((SLOT_W - 8) * pct), 5);
      // Timer text
      ctx.font = '6px Orbitron, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText(`${Math.ceil(b.remaining)}s`, bx + SLOT_W / 2, by + 47);
      ctx.restore();
    }
  }

  _rgb(hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  }

  // ── Compute building info for a door ─────────────────────────────────────
  _doorInfo(door, gameMap) {
    if (door.specialType === 'dealership') return { name: 'CAR DEALER', color: '#FFCC00' };
    if (door.specialType === 'casino')     return { name: 'CASINO',     color: '#FF44AA' };
    if (door.specialType === 'home')       return { name: 'HOME',       color: '#88FFCC' };
    const bIdx = typeof door.bTypeIdx === 'number' ? door.bTypeIdx : 0;
    const bt = CONFIG.BUILDING_TYPES[bIdx] || CONFIG.BUILDING_TYPES[0];
    return { name: bt.name, color: bt.color };
  }

  // ── Full-screen big-map overlay ────────────────────────────────────────────
  // Returns the door the cursor is currently hovering over (or null).
  renderBigMap(ctx, W, H, gameMap, player, doors, waypointDoor, mx, my) {
    const t = performance.now() / 1000;

    // Background
    ctx.fillStyle = 'rgba(1,2,6,0.97)';
    ctx.fillRect(0, 0, W, H);

    // Map area
    const padX = 68, padY = 62;
    const mapW = W - padX * 2;
    const mapH = H - padY * 2 - 36; // 36px for legend row
    const ox = padX, oy = padY;
    const scX = mapW / (gameMap.W * gameMap.S);
    const scY = mapH / (gameMap.H * gameMap.S);

    // Outer glow frame
    ctx.save();
    ctx.shadowColor = '#44EEFF'; ctx.shadowBlur = 28;
    ctx.strokeStyle = 'rgba(68,238,255,0.28)'; ctx.lineWidth = 1.5;
    this._rr(ctx, ox - 8, oy - 8, mapW + 16, mapH + 16, 10); ctx.stroke();
    ctx.restore();

    // Clipped map image
    ctx.save();
    ctx.beginPath(); this._rr(ctx, ox, oy, mapW, mapH, 6); ctx.clip();
    ctx.drawImage(gameMap.minimapCanvas, ox, oy, mapW, mapH);
    ctx.restore();

    // Map border
    ctx.save();
    ctx.strokeStyle = 'rgba(68,238,255,0.22)'; ctx.lineWidth = 1;
    this._rr(ctx, ox, oy, mapW, mapH, 6); ctx.stroke();
    ctx.restore();

    // Title
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px Orbitron, monospace';
    ctx.fillStyle = '#44EEFF'; ctx.shadowColor = '#44EEFF'; ctx.shadowBlur = 18;
    ctx.fillText('▸ CITY MAP', W / 2, oy - 20);
    ctx.font = '8.5px Orbitron, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.shadowBlur = 0;
    ctx.fillText('[N] CLOSE  ·  CLICK BUILDING → SET DESTINATION  ·  CLICK AGAIN → CLEAR', W / 2, oy - 7);
    ctx.restore();

    // ── Building markers ──────────────────────────────────────
    let hoveredDoor = null;
    const isWP = d => waypointDoor && d.tx === waypointDoor.tx && d.ty === waypointDoor.ty;

    for (const door of doors) {
      const sx = ox + door.wx * scX;
      const sy = oy + door.wy * scY;
      if (sx < ox || sx > ox + mapW || sy < oy || sy > oy + mapH) continue;
      const info  = this._doorInfo(door, gameMap);
      const wp    = isWP(door);
      const hover = Math.hypot(mx - sx, my - sy) < 13;
      if (hover) hoveredDoor = door;

      const r = wp || hover ? 6 : 4;
      ctx.save();
      ctx.shadowColor = info.color;
      ctx.shadowBlur  = wp ? 20 : hover ? 14 : 5;
      ctx.fillStyle   = info.color + (wp || hover ? 'FF' : 'BB');
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
      // Specular highlight
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(sx - r * 0.3, sy - r * 0.35, r * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // Waypoint pin
      if (wp) {
        const pulse = Math.sin(t * 4) * 0.4 + 0.6;
        ctx.save();
        ctx.strokeStyle = info.color; ctx.lineWidth = 2;
        ctx.shadowColor = info.color; ctx.shadowBlur = 12 * pulse;
        // Pole
        ctx.beginPath(); ctx.moveTo(sx, sy - r); ctx.lineTo(sx, sy - r - 18); ctx.stroke();
        // Flag
        ctx.fillStyle = info.color;
        ctx.beginPath(); ctx.moveTo(sx, sy - r - 18); ctx.lineTo(sx + 11, sy - r - 13); ctx.lineTo(sx, sy - r - 8); ctx.closePath(); ctx.fill();
        // Pulsing ring
        ctx.globalAlpha = pulse * 0.55;
        ctx.beginPath(); ctx.arc(sx, sy, r + 5 + pulse * 5, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    // Player marker
    {
      const px = ox + player.x * scX;
      const py = oy + player.y * scY;
      const pulse = Math.sin(t * 3) * 0.3 + 0.7;
      ctx.save();
      ctx.shadowColor = player.color; ctx.shadowBlur = 18 * pulse;
      // Outer ring
      ctx.strokeStyle = player.color + '70'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, py, 9 + pulse * 3, 0, Math.PI * 2); ctx.stroke();
      // Body
      ctx.fillStyle = player.color;
      ctx.beginPath(); ctx.arc(px, py, 5.5, 0, Math.PI * 2); ctx.fill();
      // White core
      ctx.fillStyle = '#FFFFFF'; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2); ctx.fill();
      // YOU label
      ctx.font = 'bold 7.5px Orbitron, monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = '#FFF'; ctx.shadowColor = player.color; ctx.shadowBlur = 8;
      ctx.fillText('YOU', px, py - 15);
      ctx.restore();
    }

    // Hover tooltip
    if (hoveredDoor) {
      const info = this._doorInfo(hoveredDoor, gameMap);
      const sx   = ox + hoveredDoor.wx * scX;
      const sy   = oy + hoveredDoor.wy * scY;
      const ttW  = 140, ttH = 28;
      const ttX  = Math.min(sx + 12, W - ttW - 10);
      const ttY  = Math.max(sy - 34, oy + 4);
      ctx.save();
      ctx.fillStyle = 'rgba(2,4,14,0.95)';
      ctx.strokeStyle = info.color + 'CC'; ctx.lineWidth = 1.2;
      ctx.shadowColor = info.color; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.roundRect(ttX, ttY, ttW, ttH, 5); ctx.fill(); ctx.stroke();
      ctx.font = 'bold 9px Orbitron, monospace';
      ctx.textAlign = 'left'; ctx.fillStyle = info.color; ctx.shadowBlur = 0;
      ctx.fillText(info.name, ttX + 10, ttY + 11);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '7.5px Orbitron, monospace';
      ctx.fillText(isWP(hoveredDoor) ? '📍 DESTINATION SET  ·  click to clear' : 'click to set as destination', ttX + 10, ttY + 22);
      ctx.restore();
    }

    // ── Legend row ────────────────────────────────────────────
    const legY   = oy + mapH + 18;
    const seen   = new Map();
    for (const door of doors) {
      const info = this._doorInfo(door, gameMap);
      if (!seen.has(info.name)) seen.set(info.name, info.color);
    }
    const entries = [...seen.entries()];
    const colW    = Math.min(128, (W - 40) / Math.max(1, entries.length));
    const maxCols = Math.min(entries.length, Math.floor((W - 40) / colW));
    ctx.save();
    ctx.font = '7px Orbitron, monospace'; ctx.textAlign = 'left';
    for (let i = 0; i < maxCols; i++) {
      const [name, color] = entries[i];
      const lx = 20 + i * colW;
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.arc(lx + 5, legY, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.shadowBlur = 0;
      ctx.fillText(name, lx + 13, legY + 3.5);
    }
    ctx.restore();

    return hoveredDoor;
  }

  // ── Waypoint navigation overlay on minimap ────────────────────────────────
  renderWaypointNav(player, waypointDoor, gameMap) {
    if (!waypointDoor) return;
    const ctx  = this.ctx;
    const H    = this.canvas.height;
    const mmX  = HUD_PAD;
    const mmY  = H - HUD_PAD - 82 - 10 - HUD_MM_H - 22;
    const mmW  = HUD_MM_W;
    const mmH  = HUD_MM_H;
    const sx   = gameMap.mmScaleX;
    const sy   = gameMap.mmScaleY;
    const info = this._doorInfo(waypointDoor, gameMap);
    const t    = performance.now() / 1000;
    const pulse = Math.sin(t * 4) * 0.4 + 0.6;

    // Waypoint dot + ring on minimap
    const wpX = mmX + waypointDoor.wx * sx;
    const wpY = mmY + waypointDoor.wy * sy;
    ctx.save();
    ctx.shadowColor = info.color; ctx.shadowBlur = 8 * pulse;
    ctx.fillStyle   = info.color;
    ctx.beginPath(); ctx.arc(wpX, wpY, 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = pulse * 0.65;
    ctx.strokeStyle = info.color; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(wpX, wpY, 4 + pulse * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();

    // Dashed line from player to waypoint (clipped to minimap)
    const plX = mmX + player.x * sx;
    const plY = mmY + player.y * sy;
    ctx.save();
    ctx.beginPath(); ctx.rect(mmX, mmY, mmW, mmH); ctx.clip();
    ctx.strokeStyle = info.color + '66'; ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(plX, plY); ctx.lineTo(wpX, wpY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Directional badge just above the minimap panel
    const dx   = waypointDoor.wx - player.x;
    const dy   = waypointDoor.wy - player.y;
    const dist = Math.round(Math.hypot(dx, dy));
    const ang  = Math.atan2(dy, dx);
    const bgY  = mmY - 30;

    ctx.save();
    ctx.fillStyle   = 'rgba(0,0,0,0.80)';
    ctx.strokeStyle = info.color + '88'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(mmX - 4, bgY, mmW + 8, 26, 4); ctx.fill(); ctx.stroke();

    // Arrow
    ctx.save();
    ctx.translate(mmX + 12, bgY + 13);
    ctx.rotate(ang);
    ctx.fillStyle = info.color; ctx.shadowColor = info.color; ctx.shadowBlur = 7;
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -4.5); ctx.lineTo(-5, 4.5); ctx.closePath(); ctx.fill();
    ctx.restore();

    ctx.font = 'bold 7.5px Orbitron, monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = info.color; ctx.shadowColor = info.color; ctx.shadowBlur = 5;
    ctx.fillText(info.name.length > 12 ? info.name.slice(0, 12) + '…' : info.name, mmX + 26, bgY + 10);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.shadowBlur = 0;
    ctx.font = '6.5px Orbitron, monospace';
    ctx.fillText(`${dist}px  ·  [N] MAP`, mmX + 26, bgY + 21);
    ctx.restore();
  }
}
