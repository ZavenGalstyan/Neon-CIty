'use strict';

/**
 * @file shop.js
 * All overlay shop managers. Each manager follows the same interface:
 *   open()                           — show overlay, reset scroll
 *   close()                          — hide overlay
 *   render(ctx, W, H, player, ...)   — draw overlay each frame when open
 *   handleClick(mx, my, player, game) — process a mouse click
 *   handleScroll(deltaY)             — scroll content area
 *
 * Classes:
 *   ShopManager        — B key shop; tabs: weapons / upgrades / security
 *   DealershipManager  — T key shop inside car dealership; tabs: vehicles / weapons / grenades
 *   CasinoManager      — casino mini-game overlay (casino map only)
 *
 * Purchase pattern:
 *   effectivePrice = Math.round(price * (1 - game._shopDiscount))
 *   Deduct from game.money, apply effect, play audio.buy()
 *
 * Click areas stored in this._areas as { x, y, w, h, fn } — fn(player, game) called on match.
 */
class ShopManager {
  constructor() {
    this.isOpen      = false;
    this.tab         = 'weapons';  // 'weapons' | 'upgrades' | 'security'
    this._areas      = [];         // clickable hit-areas rebuilt each render
    this._feedback   = null;       // { msg, color, t }
    this._scrollY    = 0;
    this._guardCount = 0;          // updated by game.js before render
  }

  open()   { this.isOpen = true;  this._areas = []; this._scrollY = 0; }
  close()  { this.isOpen = false; this._areas = []; }
  toggle() { this.isOpen ? this.close() : this.open(); }

  handleScroll(delta) {
    if (!this.isOpen) return;
    this._scrollY = Math.max(0, Math.min(this._maxScrollY || 0, this._scrollY + delta * 0.55));
  }

  update(dt) {
    if (this._feedback) {
      this._feedback.t -= dt;
      if (this._feedback.t <= 0) this._feedback = null;
    }
  }

  // Returns true if click was consumed by shop
  handleClick(sx, sy, player, gameRef) {
    if (!this.isOpen) return false;
    for (const a of this._areas) {
      if (sx >= a.x && sx <= a.x + a.w && sy >= a.y && sy <= a.y + a.h) {
        a.action(player, gameRef);
        return true;
      }
    }
    return true; // consume all clicks when shop is open
  }

  _pushArea(x, y, w, h, fn) {
    this._areas.push({ x, y, w, h, action: fn });
  }

  _msg(text, color = '#44FF88') {
    this._feedback = { msg: text, color, t: 1.6 };
  }

  // ── Main render ─────────────────────────────────────────
  render(ctx, W, H, player, money, mx, my) {
    if (!this.isOpen) return;
    this._areas = [];
    const t = performance.now() / 1000;

    const PW = Math.min(880, W - 40);
    const PH = Math.min(620, H - 50);
    const px = (W - PW) / 2;
    const py = (H - PH) / 2;

    // Dim backdrop with gradient
    const bgGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W, H) * 0.7);
    bgGrad.addColorStop(0, 'rgba(5,10,20,0.92)');
    bgGrad.addColorStop(1, 'rgba(0,0,0,0.96)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle animated scanlines
    ctx.save();
    ctx.globalAlpha = 0.03;
    for (let sy = 0; sy < H; sy += 3) {
      ctx.fillStyle = sy % 6 === 0 ? '#44EEFF' : '#000';
      ctx.fillRect(0, sy, W, 1);
    }
    ctx.restore();

    // Outer glow effect
    ctx.save();
    ctx.shadowColor = '#44EEFF';
    ctx.shadowBlur = 60;
    ctx.strokeStyle = 'rgba(68,238,255,0.3)';
    ctx.lineWidth = 2;
    this._rr(ctx, px - 4, py - 4, PW + 8, PH + 8, 16);
    ctx.stroke();
    ctx.restore();

    // Panel background with gradient
    ctx.save();
    const panelGrad = ctx.createLinearGradient(px, py, px, py + PH);
    panelGrad.addColorStop(0, '#0a0f18');
    panelGrad.addColorStop(0.5, '#060a10');
    panelGrad.addColorStop(1, '#080c14');
    ctx.shadowColor = '#44EEFF';
    ctx.shadowBlur = 40;
    ctx.fillStyle = panelGrad;
    ctx.strokeStyle = 'rgba(68,238,255,0.6)';
    ctx.lineWidth = 1.5;
    this._rr(ctx, px, py, PW, PH, 14);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Inner border
    ctx.save();
    ctx.strokeStyle = 'rgba(68,238,255,0.15)';
    ctx.lineWidth = 1;
    this._rr(ctx, px + 6, py + 6, PW - 12, PH - 12, 10);
    ctx.stroke();
    ctx.restore();

    // Top header gradient stripe
    ctx.save();
    const grd = ctx.createLinearGradient(px, py, px, py + 80);
    grd.addColorStop(0, 'rgba(68,238,255,0.12)');
    grd.addColorStop(0.5, 'rgba(68,238,255,0.04)');
    grd.addColorStop(1, 'rgba(68,238,255,0)');
    ctx.fillStyle = grd;
    this._rr(ctx, px, py, PW, 80, 14);
    ctx.fill();
    ctx.restore();

    // Enhanced corner accents with animation
    this._cornersAnimated(ctx, px, py, PW, PH, '#44EEFF', t);

    // ── Title with enhanced styling ──────────────────────────────────────────────
    ctx.save();
    ctx.textAlign = 'center';
    // Title glow background
    ctx.shadowColor = '#44EEFF';
    ctx.shadowBlur = 30;
    ctx.font = 'bold 32px Orbitron, monospace';
    ctx.fillStyle = '#44EEFF';
    ctx.fillText('⟨ SHOP ⟩', px + PW / 2, py + 42);
    // Title text
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('⟨ SHOP ⟩', px + PW / 2, py + 42);
    ctx.restore();

    // Decorative title lines
    ctx.save();
    ctx.strokeStyle = 'rgba(68,238,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 40, py + 42);
    ctx.lineTo(px + PW / 2 - 80, py + 42);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px + PW / 2 + 80, py + 42);
    ctx.lineTo(px + PW - 40, py + 42);
    ctx.stroke();
    ctx.restore();

    // Divider with gradient
    ctx.save();
    const divGrad = ctx.createLinearGradient(px + 24, 0, px + PW - 24, 0);
    divGrad.addColorStop(0, 'rgba(68,238,255,0)');
    divGrad.addColorStop(0.5, 'rgba(68,238,255,0.3)');
    divGrad.addColorStop(1, 'rgba(68,238,255,0)');
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 24, py + 58);
    ctx.lineTo(px + PW - 24, py + 58);
    ctx.stroke();
    ctx.restore();

    // ── Close button - enhanced ────────────────────────────────────────
    const clx = px + PW - 26, cly = py + 26, clr = 16;
    const clHover = Math.hypot(mx - clx, my - cly) < clr + 4;
    ctx.save();
    // Button background
    ctx.fillStyle = clHover ? 'rgba(255,68,102,0.2)' : 'rgba(255,68,102,0.08)';
    ctx.beginPath(); ctx.arc(clx, cly, clr, 0, Math.PI * 2); ctx.fill();
    // Button border
    ctx.shadowColor = clHover ? '#FF4466' : 'rgba(255,68,102,0.4)';
    ctx.shadowBlur = clHover ? 20 : 8;
    ctx.strokeStyle = clHover ? '#FF4466' : 'rgba(255,68,102,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(clx, cly, clr, 0, Math.PI * 2); ctx.stroke();
    // X icon
    ctx.fillStyle = clHover ? '#FF4466' : 'rgba(255,68,102,0.8)';
    ctx.font = 'bold 20px Orbitron, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('×', clx, cly + 1);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
    this._pushArea(clx - clr - 4, cly - clr - 4, (clr + 4) * 2, (clr + 4) * 2,
      () => this.close());

    // ── Tabs - enhanced with better spacing ────────────────────────────────────────────────
    const tabY = py + 68;
    const tabH = 42;
    const tabs = [
      ['weapons', '🔫', 'WEAPONS'],
      ['upgrades', '⬆️', 'UPGRADES'],
      ['security', '🛡️', 'SECURITY']
    ];
    const tabW = (PW - (tabs.length + 1) * 16) / tabs.length;
    tabs.forEach(([id, icon, label], i) => {
      const tx = px + 16 + i * (tabW + 16);
      const active = this.tab === id;
      const hover  = mx >= tx && mx <= tx + tabW && my >= tabY && my <= tabY + tabH;

      ctx.save();
      // Tab background gradient
      if (active) {
        const tabGrad = ctx.createLinearGradient(tx, tabY, tx, tabY + tabH);
        tabGrad.addColorStop(0, 'rgba(68,238,255,0.2)');
        tabGrad.addColorStop(1, 'rgba(68,238,255,0.08)');
        ctx.fillStyle = tabGrad;
      } else {
        ctx.fillStyle = hover ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)';
      }
      ctx.shadowColor = active ? '#44EEFF' : 'transparent';
      ctx.shadowBlur  = active ? 15 : 0;
      ctx.strokeStyle = active ? '#44EEFF' : hover ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)';
      ctx.lineWidth   = active ? 2 : 1;
      this._rr(ctx, tx, tabY, tabW, tabH, 8);
      ctx.fill(); ctx.stroke();

      // Active indicator bar
      if (active) {
        ctx.fillStyle = '#44EEFF';
        ctx.shadowColor = '#44EEFF';
        ctx.shadowBlur = 10;
        ctx.fillRect(tx + 10, tabY + tabH - 3, tabW - 20, 2);
      }

      // Icon and label - FIXED: increased spacing between icon and text
      ctx.textAlign = 'center';
      ctx.font = '15px sans-serif';
      ctx.fillText(icon, tx + tabW / 2 - 55, tabY + 27);  // Icon moved further left
      ctx.font = `bold ${active ? 13 : 11}px Orbitron, monospace`;
      ctx.fillStyle = active ? '#44EEFF' : hover ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.35)';
      ctx.shadowBlur = active ? 8 : 0;
      ctx.fillText(label, tx + tabW / 2 + 10, tabY + 27);  // Text moved right
      ctx.restore();
      if (!active) this._pushArea(tx, tabY, tabW, tabH, () => { this.tab = id; this._scrollY = 0; });
    });

    // ── Content ─────────────────────────────────────────────
    const contentY = tabY + tabH + 14;
    const contentH = PH - (contentY - py) - 54;

    ctx.save();
    ctx.beginPath();
    ctx.rect(px + 14, contentY, PW - 28, contentH);
    ctx.clip();

    if (this.tab === 'weapons') {
      this._drawWeapons(ctx, px, contentY, PW, contentH, player, money, mx, my);
    } else if (this.tab === 'security') {
      this._drawSecurity(ctx, px, contentY, PW, contentH, player, money, mx, my);
    } else {
      this._drawUpgrades(ctx, px, contentY, PW, contentH, player, money, mx, my);
    }
    ctx.restore();

    // ── Balance - enhanced with background ─────────────────────────────────────────────
    ctx.save();
    // Balance background
    ctx.fillStyle = 'rgba(0,255,204,0.08)';
    ctx.beginPath();
    ctx.roundRect(px + 16, py + PH - 38, 280, 30, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,255,204,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // NEX icon
    this._renderNexIcon(ctx, px + 38, py + PH - 23, 20, { animated: true });
    // Balance text
    ctx.font = 'bold 15px Orbitron, monospace';
    ctx.fillStyle = '#00FFCC';
    ctx.shadowColor = '#00FFCC';
    ctx.shadowBlur = 12;
    ctx.textAlign = 'left';
    ctx.fillText(`BALANCE:  ${money.toLocaleString()} NEX`, px + 55, py + PH - 18);
    ctx.restore();

    // Close hint - enhanced
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.roundRect(px + PW - 175, py + PH - 38, 160, 30, 6);
    ctx.fill();
    ctx.font = '10px Orbitron, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'center';
    ctx.fillText('[B] or [ESC] CLOSE', px + PW - 95, py + PH - 18);
    ctx.restore();

    // ── Feedback message ────────────────────────────────────
    if (this._feedback) {
      const a = Math.min(1, this._feedback.t / 0.6);
      ctx.save();
      ctx.globalAlpha = a;
      // Feedback background
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.beginPath();
      ctx.roundRect(W/2 - 150, py + PH - 60, 300, 36, 8);
      ctx.fill();
      ctx.strokeStyle = this._feedback.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Feedback text
      ctx.font = 'bold 16px Orbitron, monospace';
      ctx.fillStyle = this._feedback.color;
      ctx.shadowColor = this._feedback.color;
      ctx.shadowBlur = 20;
      ctx.textAlign = 'center';
      ctx.fillText(this._feedback.msg, W / 2, py + PH - 36);
      ctx.restore();
    }
  }

  // Enhanced corner accents with subtle animation
  _cornersAnimated(ctx, x, y, w, h, color, t) {
    const L = 18;
    const pulse = Math.sin(t * 2) * 0.2 + 0.8;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8 * pulse;
    ctx.lineCap = 'round';
    // Top-left
    ctx.beginPath(); ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y); ctx.stroke();
    // Top-right
    ctx.beginPath(); ctx.moveTo(x + w - L, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + L); ctx.stroke();
    // Bottom-left
    ctx.beginPath(); ctx.moveTo(x, y + h - L); ctx.lineTo(x, y + h); ctx.lineTo(x + L, y + h); ctx.stroke();
    // Bottom-right
    ctx.beginPath(); ctx.moveTo(x + w - L, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - L); ctx.stroke();
    ctx.restore();
  }

  // ── Weapons tab ─────────────────────────────────────────
  _drawWeapons(ctx, px, y, PW, PH, player, money, mx, my) {
    const weapons = CONFIG.WEAPONS;
    const cols  = 3;
    const gap   = 14;
    const sbW   = 10;
    const cardW = Math.floor((PW - gap * (cols + 1) - sbW - 4) / cols);
    const cardH = 175; // Taller cards for better spacing

    const rows   = Math.ceil(weapons.length / cols);
    const totalH = gap + rows * (cardH + gap);
    this._maxScrollY = Math.max(0, totalH - PH + 20);
    this._scrollY    = Math.max(0, Math.min(this._scrollY || 0, this._maxScrollY));

    weapons.forEach((w, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx  = px + gap + col * (cardW + gap);
      const cy  = y  + gap + row * (cardH + gap) - this._scrollY;

      if (cy + cardH < y || cy > y + PH) return;

      const owned    = player.ownedWeapons.has(w.id);
      const equipped = player.equippedWeaponId === w.id;
      const canBuy   = !owned && money >= w.price;
      const hover    = mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH;

      // Card background
      ctx.save();
      let cardGrad = ctx.createLinearGradient(cx, cy, cx, cy + cardH);
      if (equipped) {
        cardGrad.addColorStop(0, `rgba(${this._rgb(w.color)},0.22)`);
        cardGrad.addColorStop(1, `rgba(${this._rgb(w.color)},0.10)`);
      } else if (hover && (owned || canBuy)) {
        cardGrad.addColorStop(0, `rgba(${this._rgb(w.color)},0.12)`);
        cardGrad.addColorStop(1, `rgba(${this._rgb(w.color)},0.05)`);
      } else if (!owned && !canBuy) {
        cardGrad.addColorStop(0, 'rgba(15,15,20,0.7)');
        cardGrad.addColorStop(1, 'rgba(8,8,12,0.8)');
      } else {
        cardGrad.addColorStop(0, 'rgba(12,16,24,0.6)');
        cardGrad.addColorStop(1, 'rgba(6,10,16,0.7)');
      }

      let bdr = equipped ? w.color : owned ? 'rgba(255,255,255,0.18)' : canBuy ? `rgba(${this._rgb(w.color)},0.4)` : 'rgba(255,255,255,0.05)';
      if (hover && (owned || canBuy)) bdr = w.color;

      ctx.shadowColor = (equipped || (hover && (owned || canBuy))) ? w.color : 'transparent';
      ctx.shadowBlur  = equipped ? 22 : hover ? 12 : 0;
      ctx.fillStyle   = cardGrad;
      ctx.strokeStyle = bdr;
      ctx.lineWidth   = equipped ? 2 : 1;
      this._rr(ctx, cx, cy, cardW, cardH, 10);
      ctx.fill();
      ctx.stroke();

      // Top accent bar
      ctx.fillStyle = w.color + (equipped ? 'dd' : owned ? '66' : canBuy ? '44' : '18');
      ctx.beginPath();
      ctx.roundRect(cx + 15, cy + 5, cardW - 30, 3, 2);
      ctx.fill();

      // Experimental badge
      if (w.experimental) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,136,255,0.15)';
        ctx.beginPath();
        ctx.roundRect(cx + cardW - 48, cy + 10, 42, 14, 3);
        ctx.fill();
        ctx.font = 'bold 8px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FF88FF';
        ctx.fillText('⚗ EXP', cx + cardW - 27, cy + 20);
        ctx.restore();
      }

      // === SECTION 1: Weapon Name (top area) ===
      ctx.font = 'bold 13px Orbitron, monospace';
      ctx.fillStyle = equipped ? '#FFFFFF' : owned ? '#DDDDDD' : canBuy ? '#BBBBBB' : '#555555';
      ctx.shadowColor = equipped ? w.color : 'transparent';
      ctx.shadowBlur = equipped ? 10 : 0;
      ctx.textAlign = 'center';
      ctx.fillText(w.name, cx + cardW / 2, cy + 28);

      // === SECTION 2: Description (below name) ===
      ctx.shadowBlur = 0;
      ctx.font = '9px Rajdhani, monospace';
      ctx.fillStyle = equipped ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.35)';
      ctx.fillText(w.desc, cx + cardW / 2, cy + 44);

      // === SECTION 3: Weapon Icon (centered, main visual) ===
      const iconCenterY = cy + 78;
      this._drawRealisticWeapon(ctx, cx + cardW / 2, iconCenterY, w, owned || equipped, equipped);

      // === SECTION 4: Stats Row (below icon) ===
      const statsY = cy + 118;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.roundRect(cx + 12, statsY, cardW - 24, 22, 4);
      ctx.fill();

      const eff = w.damage > 0 ? w.damage : '—';
      const rpm = w.fireRate > 0 ? Math.round(60000 / w.fireRate) : '—';
      const hasPellets = w.bullets > 1;

      ctx.textAlign = 'center';
      if (hasPellets) {
        // Three columns: DMG | RPM | PELLETS - single line layout
        ctx.font = 'bold 9px Orbitron, monospace';
        ctx.fillStyle = '#FF6666';
        ctx.fillText('DMG', cx + cardW * 0.18, statsY + 8);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(eff, cx + cardW * 0.18, statsY + 18);

        ctx.fillStyle = '#66AAFF';
        ctx.fillText('RPM', cx + cardW * 0.5, statsY + 8);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(rpm, cx + cardW * 0.5, statsY + 18);

        ctx.fillStyle = '#FFAA44';
        ctx.fillText('×' + w.bullets, cx + cardW * 0.82, statsY + 8);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 8px Orbitron, monospace';
        ctx.fillText('PELLETS', cx + cardW * 0.82, statsY + 18);
      } else {
        // Two columns centered: DMG | RPM
        ctx.font = 'bold 9px Orbitron, monospace';
        ctx.fillStyle = '#FF6666';
        ctx.fillText('DMG', cx + cardW * 0.32, statsY + 8);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px Orbitron, monospace';
        ctx.fillText(eff, cx + cardW * 0.32, statsY + 18);

        ctx.font = 'bold 9px Orbitron, monospace';
        ctx.fillStyle = '#66AAFF';
        ctx.fillText('RPM', cx + cardW * 0.68, statsY + 8);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px Orbitron, monospace';
        ctx.fillText(rpm, cx + cardW * 0.68, statsY + 18);
      }
      ctx.restore();

      // === SECTION 5: Action Button (bottom) ===
      const btnY = cy + cardH - 14;
      if (equipped) {
        ctx.save();
        ctx.fillStyle = `rgba(${this._rgb(w.color)},0.25)`;
        ctx.beginPath();
        ctx.roundRect(cx + cardW * 0.2, btnY - 10, cardW * 0.6, 20, 5);
        ctx.fill();
        ctx.font = 'bold 10px Orbitron, monospace';
        ctx.fillStyle = w.color;
        ctx.shadowColor = w.color;
        ctx.shadowBlur = 12;
        ctx.textAlign = 'center';
        ctx.fillText('✓ EQUIPPED', cx + cardW / 2, btnY + 3);
        ctx.restore();
      } else if (owned) {
        ctx.save();
        ctx.fillStyle = hover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)';
        ctx.strokeStyle = hover ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cx + cardW * 0.15, btnY - 10, cardW * 0.7, 20, 5);
        ctx.fill();
        ctx.stroke();
        ctx.font = '9px Orbitron, monospace';
        ctx.fillStyle = hover ? '#FFFFFF' : '#999999';
        ctx.textAlign = 'center';
        ctx.fillText('CLICK TO EQUIP', cx + cardW / 2, btnY + 3);
        ctx.restore();
        const cardVisible = cy >= y - 10 && cy + cardH <= y + PH + 10;
        if (cardVisible && hover) this._pushArea(cx, cy, cardW, cardH, (p) => { p.equipWeapon(w.id); this._msg(`${w.name} EQUIPPED`, w.color); });
      } else {
        ctx.save();
        ctx.fillStyle = canBuy ? (hover ? 'rgba(0,255,204,0.2)' : 'rgba(0,255,204,0.08)') : 'rgba(50,50,50,0.3)';
        ctx.beginPath();
        ctx.roundRect(cx + cardW * 0.12, btnY - 10, cardW * 0.76, 20, 5);
        ctx.fill();
        if (canBuy) {
          ctx.strokeStyle = hover ? '#00FFCC' : 'rgba(0,255,204,0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        // NEX icon for price
        if (w.price > 0) {
          if (canBuy) {
            this._renderNexIcon(ctx, cx + cardW * 0.28, btnY, 14, { animated: hover });
          } else {
            ctx.globalAlpha = 0.3;
            this._renderNexIcon(ctx, cx + cardW * 0.28, btnY, 14, { animated: false });
            ctx.globalAlpha = 1;
          }
          ctx.font = 'bold 11px Orbitron, monospace';
          ctx.fillStyle = canBuy ? (hover ? '#FFFFFF' : '#00FFCC') : '#444444';
          ctx.shadowColor = canBuy && hover ? '#00FFCC' : 'transparent';
          ctx.shadowBlur = canBuy && hover ? 12 : 0;
          ctx.textAlign = 'center';
          ctx.fillText(`${w.price.toLocaleString()} NEX`, cx + cardW / 2 + 12, btnY + 3);
        } else {
          ctx.font = 'bold 11px Orbitron, monospace';
          ctx.fillStyle = '#44FF88';
          ctx.shadowColor = '#44FF88';
          ctx.shadowBlur = 8;
          ctx.textAlign = 'center';
          ctx.fillText('FREE', cx + cardW / 2, btnY + 3);
        }
        ctx.restore();
        const cardVisible2 = cy >= y - 10 && cy + cardH <= y + PH + 10;
        if (canBuy && cardVisible2) {
          this._pushArea(cx, cy, cardW, cardH, (p, g) => {
            const effectivePrice = Math.round(w.price * (1 - (g._shopDiscount || 0)));
            if (g.money >= effectivePrice) {
              g.money -= effectivePrice;
              p.ownedWeapons.add(w.id);
              p.equipWeapon(w.id);
              window.audio?.buy();
              this._msg(`${w.name} PURCHASED!`, w.color);
            } else { this._msg('NOT ENOUGH MONEY', '#FF4466'); }
          });
        }
      }
      ctx.restore();
    });

    // Scrollbar
    if (this._maxScrollY > 0) {
      const sbX = px + PW - 12;
      const trackH = PH - 6;
      const thumbH = Math.max(35, trackH * (PH / totalH));
      const thumbY = y + 3 + (this._scrollY / this._maxScrollY) * (trackH - thumbH);
      ctx.fillStyle = 'rgba(68,238,255,0.06)';
      ctx.beginPath();
      ctx.roundRect(sbX, y + 3, 6, trackH, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(68,238,255,0.45)';
      ctx.beginPath();
      ctx.roundRect(sbX, thumbY, 6, thumbH, 3);
      ctx.fill();
    }

    // Hint
    ctx.save();
    ctx.font = '9px Orbitron, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.textAlign = 'center';
    ctx.fillText(this._maxScrollY > 0 ? 'SCROLL to see all  ·  1–9 to cycle' : '1–9 to cycle weapons', px + PW / 2, y + PH - 6);
    ctx.restore();
  }

  // Realistic weapon drawings
  _drawRealisticWeapon(ctx, x, y, weapon, visible, equipped) {
    if (!visible) { ctx.save(); ctx.globalAlpha = 0.2; }
    ctx.save();
    ctx.translate(x, y);

    const color = weapon.color;
    const bright = equipped ? 1 : 0.7;

    // Set up styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (weapon.id) {
      case 'pistol':
        this._drawPistol(ctx, color, bright, equipped);
        break;
      case 'knife':
        this._drawKnife(ctx, color, bright, equipped);
        break;
      case 'smg':
        this._drawSMG(ctx, color, bright, equipped);
        break;
      case 'shotgun':
        this._drawShotgun(ctx, color, bright, equipped);
        break;
      case 'assault':
        this._drawAssaultRifle(ctx, color, bright, equipped);
        break;
      case 'sniper':
        this._drawSniperRifle(ctx, color, bright, equipped);
        break;
      case 'minigun':
        this._drawMinigun(ctx, color, bright, equipped);
        break;
      case 'timecannon':
        this._drawTimeCannon(ctx, color, bright, equipped);
        break;
      case 'gravitgun':
        this._drawGravityRifle(ctx, color, bright, equipped);
        break;
      case 'electricwhip':
        this._drawElectricWhip(ctx, color, bright, equipped);
        break;
      case 'plasmashotgun':
        this._drawPlasmaShotgun(ctx, color, bright, equipped);
        break;
      case 'burst':
        this._drawBurstPistol(ctx, color, bright, equipped);
        break;
      case 'flamethrower':
        this._drawFlamethrower(ctx, color, bright, equipped);
        break;
      case 'crossbow':
        this._drawCrossbow(ctx, color, bright, equipped);
        break;
      case 'rocket':
        this._drawRocketLauncher(ctx, color, bright, equipped);
        break;
      default:
        this._drawGenericGun(ctx, color, bright, equipped);
    }

    ctx.restore();
    if (!visible) ctx.restore();
  }

  _drawPistol(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
    // Barrel
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.9 * bright})`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-8, -8, 32, 12, 2);
    ctx.fill(); ctx.stroke();
    // Slide detail
    ctx.fillStyle = `rgba(255,255,255,0.15)`;
    ctx.fillRect(-5, -6, 26, 3);
    // Grip
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.7 * bright})`;
    ctx.beginPath();
    ctx.moveTo(-8, 4); ctx.lineTo(-4, 4); ctx.lineTo(-2, 20); ctx.lineTo(-12, 20); ctx.lineTo(-10, 4);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Trigger guard
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(2, 10, 6, 0.3, Math.PI - 0.3);
    ctx.stroke();
    // Muzzle
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(24, -2, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawKnife(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
    // Blade
    ctx.fillStyle = `rgba(200,200,220,${0.9 * bright})`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-25, 0);
    ctx.lineTo(20, -4);
    ctx.lineTo(28, 0);
    ctx.lineTo(20, 4);
    ctx.lineTo(-25, 2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Blade shine
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(-20, -1); ctx.lineTo(15, -3); ctx.lineTo(15, -1); ctx.lineTo(-20, 0);
    ctx.closePath();
    ctx.fill();
    // Guard
    ctx.fillStyle = color;
    ctx.fillRect(-27, -6, 4, 12);
    // Handle
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`;
    ctx.beginPath();
    ctx.roundRect(-42, -5, 16, 10, 2);
    ctx.fill(); ctx.stroke();
    // Handle wrap
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(-40 + i * 5, -4, 2, 8);
    }
    ctx.restore();
  }

  _drawSMG(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.85 * bright})`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    // Main body
    ctx.beginPath();
    ctx.roundRect(-22, -8, 44, 14, 3);
    ctx.fill(); ctx.stroke();
    // Top rail
    ctx.fillStyle = `rgba(255,255,255,0.1)`;
    ctx.fillRect(-18, -7, 32, 3);
    // Magazine
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`;
    ctx.beginPath();
    ctx.roundRect(-8, 6, 12, 18, 2);
    ctx.fill(); ctx.stroke();
    // Grip
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.5 * bright})`;
    ctx.beginPath();
    ctx.moveTo(-20, 6); ctx.lineTo(-16, 6); ctx.lineTo(-14, 18); ctx.lineTo(-22, 18);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Muzzle
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(22, -1, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Stock
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.7 * bright})`;
    ctx.beginPath();
    ctx.roundRect(-35, -5, 14, 8, 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawShotgun(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.85 * bright})`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    // Long barrel
    ctx.beginPath();
    ctx.roundRect(-20, -5, 55, 8, 2);
    ctx.fill(); ctx.stroke();
    // Barrel shine
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(-15, -4, 45, 2);
    // Pump
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`;
    ctx.beginPath();
    ctx.roundRect(5, -8, 18, 14, 2);
    ctx.fill(); ctx.stroke();
    // Stock
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.5 * bright})`;
    ctx.beginPath();
    ctx.moveTo(-20, -4); ctx.lineTo(-38, -2); ctx.lineTo(-38, 4); ctx.lineTo(-20, 3);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Grip
    ctx.beginPath();
    ctx.moveTo(-22, 3); ctx.lineTo(-18, 3); ctx.lineTo(-16, 16); ctx.lineTo(-24, 16);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Muzzle
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(35, -1, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawAssaultRifle(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.85 * bright})`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    // Main body
    ctx.beginPath();
    ctx.roundRect(-25, -7, 50, 12, 3);
    ctx.fill(); ctx.stroke();
    // Barrel extension
    ctx.beginPath();
    ctx.roundRect(25, -4, 15, 6, 1);
    ctx.fill(); ctx.stroke();
    // Scope mount
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.7 * bright})`;
    ctx.beginPath();
    ctx.roundRect(-15, -14, 25, 7, 2);
    ctx.fill(); ctx.stroke();
    // Magazine
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.55 * bright})`;
    ctx.beginPath();
    ctx.moveTo(-5, 5); ctx.lineTo(8, 5); ctx.lineTo(10, 22); ctx.lineTo(-7, 22);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Grip
    ctx.beginPath();
    ctx.moveTo(-20, 5); ctx.lineTo(-15, 5); ctx.lineTo(-13, 18); ctx.lineTo(-22, 18);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Stock
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.65 * bright})`;
    ctx.beginPath();
    ctx.roundRect(-42, -5, 18, 10, 2);
    ctx.fill(); ctx.stroke();
    // Muzzle
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(40, -1, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawSniperRifle(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.85 * bright})`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    // Long barrel
    ctx.beginPath();
    ctx.roundRect(-30, -4, 70, 7, 2);
    ctx.fill(); ctx.stroke();
    // Barrel shine
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(-25, -3, 60, 2);
    // Scope
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.9 * bright})`;
    ctx.beginPath();
    ctx.roundRect(-15, -14, 30, 10, 3);
    ctx.fill(); ctx.stroke();
    // Scope lens
    ctx.fillStyle = '#115588';
    ctx.beginPath();
    ctx.ellipse(15, -9, 4, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(14, -10, 2, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Bipod
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(15, 3); ctx.lineTo(10, 18);
    ctx.moveTo(15, 3); ctx.lineTo(20, 18);
    ctx.stroke();
    // Stock
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`;
    ctx.beginPath();
    ctx.moveTo(-30, -3); ctx.lineTo(-48, 0); ctx.lineTo(-48, 6); ctx.lineTo(-30, 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Grip
    ctx.beginPath();
    ctx.moveTo(-25, 3); ctx.lineTo(-20, 3); ctx.lineTo(-18, 14); ctx.lineTo(-27, 14);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawMinigun(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.8 * bright})`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    // Multiple barrels
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.roundRect(-15, i * 6 - 2, 45, 4, 1);
      ctx.fill(); ctx.stroke();
    }
    // Barrel housing (front)
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.7 * bright})`;
    ctx.beginPath();
    ctx.ellipse(30, 0, 6, 16, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Body/motor housing
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.85 * bright})`;
    ctx.beginPath();
    ctx.ellipse(-15, 0, 10, 18, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Handle grips
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.5 * bright})`;
    ctx.beginPath();
    ctx.roundRect(-35, -6, 12, 12, 3);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-15, 18); ctx.lineTo(-8, 18); ctx.lineTo(-5, 28); ctx.lineTo(-18, 28);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Ammo feed
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`;
    ctx.beginPath();
    ctx.roundRect(-28, 8, 10, 20, 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawTimeCannon(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 20; }
    // Energy core (glowing)
    const t = performance.now() / 1000;
    const pulse = Math.sin(t * 4) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.3 * pulse})`;
    ctx.beginPath();
    ctx.arc(5, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    // Outer ring
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.85 * bright})`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(5, 0, 18, 0, Math.PI * 2);
    ctx.stroke();
    // Inner core
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(5, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    // Clock hands (time theme)
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(5, 0); ctx.lineTo(5, -7);
    ctx.moveTo(5, 0); ctx.lineTo(10, 3);
    ctx.stroke();
    // Barrel
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.8 * bright})`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(23, -5, 20, 10, 2);
    ctx.fill(); ctx.stroke();
    // Handle
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`;
    ctx.beginPath();
    ctx.moveTo(-12, 5); ctx.lineTo(-5, 5); ctx.lineTo(-3, 20); ctx.lineTo(-14, 20);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawGravityRifle(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 20; }
    const t = performance.now() / 1000;
    // Gravity field effect
    ctx.strokeStyle = `rgba(${this._rgb(color)},${0.3 + Math.sin(t * 3) * 0.15})`;
    ctx.lineWidth = 1;
    for (let r = 12; r <= 20; r += 4) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Main body
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.85 * bright})`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-30, -6, 35, 12, 3);
    ctx.fill(); ctx.stroke();
    // Gravity orb
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(-3, -3, 3, 0, Math.PI * 2);
    ctx.fill();
    // Barrel
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.75 * bright})`;
    ctx.beginPath();
    ctx.roundRect(10, -4, 25, 8, 2);
    ctx.fill(); ctx.stroke();
    // Stock
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`;
    ctx.beginPath();
    ctx.roundRect(-45, -4, 16, 8, 2);
    ctx.fill(); ctx.stroke();
    // Grip
    ctx.beginPath();
    ctx.moveTo(-22, 6); ctx.lineTo(-16, 6); ctx.lineTo(-14, 18); ctx.lineTo(-24, 18);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawElectricWhip(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 20; }
    const t = performance.now() / 1000;

    // Handle
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.7 * bright})`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-38, -6, 16, 12, 3);
    ctx.fill(); ctx.stroke();

    // Whip cord - wavy electric line
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    for (let i = 0; i <= 8; i++) {
      const px = -22 + i * 7;
      const py = Math.sin(i * 1.2 + t * 8) * (4 + i * 0.8);
      ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Electric sparks
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const sx = -15 + i * 12;
      const sy = Math.sin(i * 1.5 + t * 10) * 5;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 4);
      ctx.lineTo(sx + 3, sy);
      ctx.lineTo(sx, sy + 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawPlasmaShotgun(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 18; }
    const t = performance.now() / 1000;

    // Main body
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.8 * bright})`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-25, -7, 50, 14, 4);
    ctx.fill(); ctx.stroke();

    // Plasma chamber (glowing)
    const pulse = Math.sin(t * 5) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.4 * pulse})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wide muzzle (shotgun spread)
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`;
    ctx.beginPath();
    ctx.moveTo(25, -10); ctx.lineTo(38, -14); ctx.lineTo(38, 14); ctx.lineTo(25, 10);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Grip
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.5 * bright})`;
    ctx.beginPath();
    ctx.moveTo(-20, 7); ctx.lineTo(-14, 7); ctx.lineTo(-12, 20); ctx.lineTo(-22, 20);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawBurstPistol(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 15; }

    // Slide/barrel
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.85 * bright})`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-12, -10, 38, 14, 3);
    ctx.fill(); ctx.stroke();

    // Triple barrel indicator (burst)
    ctx.fillStyle = '#222';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.ellipse(26, -3 + i * 4, 2, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Slide detail
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(-8, -8, 28, 3);

    // Grip
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`;
    ctx.beginPath();
    ctx.moveTo(-10, 4); ctx.lineTo(-4, 4); ctx.lineTo(-2, 22); ctx.lineTo(-14, 22); ctx.lineTo(-12, 4);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Trigger guard
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(4, 10, 6, 0.3, Math.PI - 0.3);
    ctx.stroke();

    // Burst mode indicator
    ctx.fillStyle = color;
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('III', 8, -4);
    ctx.restore();
  }

  _drawFlamethrower(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 18; }
    const t = performance.now() / 1000;

    // Main body/tank
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.75 * bright})`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-30, -8, 35, 16, 4);
    ctx.fill(); ctx.stroke();

    // Fuel tank
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`;
    ctx.beginPath();
    ctx.ellipse(-18, 0, 10, 12, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Nozzle
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.8 * bright})`;
    ctx.beginPath();
    ctx.roundRect(5, -5, 25, 10, 2);
    ctx.fill(); ctx.stroke();

    // Flame effect
    ctx.fillStyle = '#FF6600';
    ctx.shadowColor = '#FF4400';
    ctx.shadowBlur = 15;
    const flameSize = 8 + Math.sin(t * 15) * 3;
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.quadraticCurveTo(35 + flameSize, -8, 40 + flameSize, 0);
    ctx.quadraticCurveTo(35 + flameSize, 8, 30, 0);
    ctx.fill();

    // Inner flame
    ctx.fillStyle = '#FFAA00';
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.quadraticCurveTo(33 + flameSize * 0.5, -4, 36 + flameSize * 0.5, 0);
    ctx.quadraticCurveTo(33 + flameSize * 0.5, 4, 30, 0);
    ctx.fill();

    // Handle
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.5 * bright})`;
    ctx.beginPath();
    ctx.moveTo(-5, 8); ctx.lineTo(2, 8); ctx.lineTo(4, 20); ctx.lineTo(-7, 20);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawCrossbow(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 15; }

    // Main rail/stock
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.8 * bright})`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-25, -4, 50, 8, 2);
    ctx.fill(); ctx.stroke();

    // Bow limbs (curved)
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.quadraticCurveTo(-25, -20, -35, -15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, 4);
    ctx.quadraticCurveTo(-25, 20, -35, 15);
    ctx.stroke();

    // Bow string
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-35, -15);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-35, 15);
    ctx.stroke();

    // Bolt/arrow
    ctx.fillStyle = '#AAAAAA';
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(30, 0);
    ctx.lineTo(35, -2);
    ctx.lineTo(38, 0);
    ctx.lineTo(35, 2);
    ctx.lineTo(30, 0);
    ctx.stroke();
    ctx.fill();

    // Fletching
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-3, 0); ctx.lineTo(-8, -4); ctx.lineTo(-8, 4);
    ctx.closePath();
    ctx.fill();

    // Scope/sight
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.7 * bright})`;
    ctx.beginPath();
    ctx.roundRect(5, -10, 12, 6, 2);
    ctx.fill(); ctx.stroke();

    // Grip
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.5 * bright})`;
    ctx.beginPath();
    ctx.moveTo(0, 4); ctx.lineTo(8, 4); ctx.lineTo(10, 18); ctx.lineTo(-2, 18);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawRocketLauncher(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 18; }

    // Main tube
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.8 * bright})`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-35, -10, 70, 20, 5);
    ctx.fill(); ctx.stroke();

    // Tube opening (front)
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(35, 0, 5, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tube opening (back)
    ctx.beginPath();
    ctx.ellipse(-35, 0, 4, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rocket visible inside
    ctx.fillStyle = '#DD3300';
    ctx.beginPath();
    ctx.roundRect(-20, -5, 40, 10, 3);
    ctx.fill();
    ctx.fillStyle = '#FF5500';
    ctx.beginPath();
    ctx.moveTo(20, -5); ctx.lineTo(28, 0); ctx.lineTo(20, 5);
    ctx.closePath();
    ctx.fill();

    // Sight
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.7 * bright})`;
    ctx.beginPath();
    ctx.roundRect(-5, -18, 20, 8, 2);
    ctx.fill(); ctx.stroke();

    // Handle grips
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.5 * bright})`;
    ctx.beginPath();
    ctx.roundRect(-30, 10, 14, 12, 3);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(5, 10, 14, 12, 3);
    ctx.fill(); ctx.stroke();

    // Trigger mechanism
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`;
    ctx.beginPath();
    ctx.roundRect(-12, 8, 10, 6, 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawGenericGun(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.8 * bright})`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-20, -5, 40, 10, 3);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // ── Upgrades tab ─────────────────────────────────────────
  _drawUpgrades(ctx, px, y, PW, PH, player, money, mx, my) {
    const ups  = CONFIG.UPGRADES;
    const gap  = 8;
    const rowH = 68;
    const rowW = PW - gap * 2;

    // Scrolling support (same as weapons tab)
    const totalH = gap + ups.length * (rowH + gap);
    this._maxScrollY = Math.max(0, totalH - PH + 20);
    this._scrollY    = Math.max(0, Math.min(this._scrollY || 0, this._maxScrollY));

    ups.forEach((u, i) => {
      const ux    = px + gap;
      const uy    = y  + gap + i * (rowH + gap) - this._scrollY;

      // Skip off-screen rows
      if (uy + rowH < y || uy > y + PH) return;
      const level = player.upgradeLevel[u.id] || 0;
      const maxed = level >= u.maxLevel;
      const cost  = maxed ? 0 : Math.round(u.baseCost * Math.pow(u.costMult, level));
      const canBuy = !maxed && money >= cost;
      const hover  = mx >= ux && mx <= ux + rowW && my >= uy && my <= uy + rowH;

      // Row background
      ctx.save();
      const bg  = maxed ? 'rgba(255,215,0,0.06)' : canBuy && hover ? `rgba(${this._rgb(u.color)},0.09)` : 'rgba(0,0,0,0.28)';
      const bdr = maxed ? 'rgba(255,215,0,0.5)'  : canBuy && hover ? u.color : 'rgba(255,255,255,0.06)';
      ctx.shadowColor = maxed ? '#FFD700' : canBuy && hover ? u.color : 'transparent';
      ctx.shadowBlur  = maxed ? 8 : canBuy && hover ? 10 : 0;
      ctx.fillStyle   = bg;
      ctx.strokeStyle = bdr;
      ctx.lineWidth   = maxed ? 1.5 : 1;
      this._rr(ctx, ux, uy, rowW, rowH, 7);
      ctx.fill();
      ctx.stroke();

      // Left accent bar
      ctx.fillStyle = u.color + (maxed ? 'ee' : '66');
      ctx.fillRect(ux, uy + 10, 3, rowH - 20);

      // Icon
      ctx.font = '20px monospace';
      ctx.fillStyle = maxed ? '#FFD700' : u.color;
      ctx.shadowColor = u.color; ctx.shadowBlur = maxed ? 12 : 6;
      ctx.textAlign = 'left';
      ctx.fillText(u.icon, ux + 16, uy + rowH / 2 + 7);

      // Name + desc
      ctx.font = 'bold 13px Orbitron, monospace';
      ctx.fillStyle = maxed ? '#FFD700' : '#ddd';
      ctx.shadowColor = maxed ? '#FFD700' : 'transparent';
      ctx.shadowBlur  = maxed ? 6 : 0;
      ctx.fillText(u.name, ux + 48, uy + rowH * 0.38);
      ctx.font = '10px Rajdhani, monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.shadowBlur = 0;
      ctx.fillText(u.desc, ux + 48, uy + rowH * 0.38 + 16);

      // Level dots
      const dotsX = ux + 48;
      const dotsY = uy + rowH - 14;
      for (let l = 0; l < u.maxLevel; l++) {
        const filled = l < level;
        ctx.shadowColor = filled ? u.color : 'transparent';
        ctx.shadowBlur  = filled ? 8 : 0;
        ctx.fillStyle   = filled ? u.color : 'rgba(255,255,255,0.08)';
        ctx.strokeStyle = filled ? u.color : 'rgba(255,255,255,0.14)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(dotsX + l * 18, dotsY, 5.5, 0, Math.PI * 2);
        filled ? ctx.fill() : (ctx.fill(), ctx.stroke());
      }

      // Right side: buy button or MAX
      if (maxed) {
        ctx.font = 'bold 13px Orbitron, monospace';
        ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 10;
        ctx.textAlign = 'right';
        ctx.fillText('MAXED', ux + rowW - 16, uy + rowH / 2 + 5);
      } else {
        const btnW = 120, btnH = 34;
        const bx = ux + rowW - btnW - 12;
        const by = uy + (rowH - btnH) / 2;
        const bHov = mx >= bx && mx <= bx + btnW && my >= by && my <= by + btnH;

        ctx.shadowColor = canBuy ? u.color : 'transparent';
        ctx.shadowBlur  = canBuy && bHov ? 16 : 0;
        ctx.fillStyle   = canBuy ? (bHov ? `rgba(${this._rgb(u.color)},0.32)` : `rgba(${this._rgb(u.color)},0.14)`) : 'rgba(40,40,40,0.6)';
        ctx.strokeStyle = canBuy ? (bHov ? u.color : `rgba(${this._rgb(u.color)},0.5)`) : 'rgba(80,80,80,0.3)';
        ctx.lineWidth   = canBuy ? 1.2 : 0.8;
        this._rr(ctx, bx, by, btnW, btnH, 6);
        ctx.fill(); ctx.stroke();

        // NEX icon for upgrade price
        if (canBuy) {
          this._renderNexIcon(ctx, bx + 16, by + btnH / 2, 13, { animated: bHov });
        } else {
          ctx.globalAlpha = 0.3;
          this._renderNexIcon(ctx, bx + 16, by + btnH / 2, 13, { animated: false });
          ctx.globalAlpha = 1;
        }
        ctx.font = `bold 10px Orbitron, monospace`;
        ctx.fillStyle  = canBuy ? (bHov ? '#fff' : u.color) : '#3a3a3a';
        ctx.textAlign  = 'center';
        ctx.shadowBlur = 0;
        ctx.fillText(`UPGRADE  ${cost.toLocaleString()}`, bx + btnW / 2 + 14, by + btnH / 2 + 4);

        if (canBuy) {
          this._pushArea(bx, by, btnW, btnH, (p, g) => {
            const lvl = p.upgradeLevel[u.id] || 0;
            const c   = Math.round(u.baseCost * Math.pow(u.costMult, lvl));
            const effectiveCost = Math.round(c * (1 - (g._shopDiscount || 0)));
            if (g.money >= effectiveCost && lvl < u.maxLevel) {
              g.money -= effectiveCost;
              p.applyUpgrade(u.id);
              window.audio?.upgrade();
              this._msg(`${u.name} LVL ${lvl + 1}!`, u.color);
            } else { this._msg('NOT ENOUGH MONEY', '#FF4466'); }
          });
        }
      }
      ctx.restore();
    });
  }

  // ── Weapon icon silhouettes ──────────────────────────────
  _weaponIcon(ctx, x, y, weapon, visible, equipped) {
    if (!visible) { ctx.save(); ctx.globalAlpha = 0.2; }
    ctx.save();
    ctx.shadowColor = equipped ? weapon.color : 'transparent';
    ctx.shadowBlur  = equipped ? 14 : 0;
    ctx.strokeStyle = weapon.color;
    ctx.fillStyle   = weapon.color + '33';
    ctx.lineWidth   = 1.8;
    ctx.lineCap     = 'round';
    ctx.linejoin    = 'round';
    ctx.translate(x, y);

    ctx.beginPath();
    switch (weapon.id) {
      case 'pistol':
        ctx.rect(-13,-4,22,8); ctx.rect(5,-8,8,5); ctx.rect(-15,-1,5,11);
        break;
      case 'smg':
        ctx.rect(-20,-5,30,8); ctx.rect(-6,-10,14,6); ctx.rect(-20,-2,6,12);
        break;
      case 'shotgun':
        ctx.rect(-24,-3,38,5); ctx.rect(-24,-2,9,10); ctx.rect(10,-5,7,5);
        break;
      case 'assault':
        ctx.rect(-22,-5,38,8); ctx.rect(-14,-11,16,7); ctx.rect(-22,-2,7,12); ctx.rect(13,-6,5,5);
        break;
      case 'sniper':
        ctx.rect(-30,-3,54,5); ctx.rect(16,-7,9,5); ctx.rect(-10,-8,12,6); ctx.rect(-30,-1,8,9);
        break;
      case 'minigun':
        for (let b = -1; b <= 1; b++) ctx.rect(-24, b * 7 - 2, 44, 4);
        ctx.rect(-24,-12,12,24);
        break;
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    if (!visible) ctx.restore();
  }

  // ── Security tab ─────────────────────────────────────────
  _drawSecurity(ctx, px, cy, PW, PH, player, money, mx, my) {
    const guards = [
      { tier:'light',  name:'LIGHT GUARD',  desc:'Pistol. Fast responder.',    price:1500, hp:80,  dmg:25, color:'#44CCFF' },
      { tier:'heavy',  name:'HEAVY GUARD',  desc:'Shotgun. Tanky frontline.',  price:3500, hp:200, dmg:50, color:'#FF8844' },
      { tier:'elite',  name:'ELITE GUARD',  desc:'Best-in-class. Lethal.',     price:5000, hp:150, dmg:42, color:'#AAFFAA' },
      { tier:'sniper', name:'SNIPER GUARD', desc:'Long range. 95 dmg/shot.',   price:6000, hp:100, dmg:95, color:'#FF44FF' },
      { tier:'medic',  name:'MEDIC GUARD',  desc:'Heals you when HP < 70%.',   price:4000, hp:120, dmg:18, color:'#44FFEE' },
      { tier:'ghost',  name:'GHOST GUARD',  desc:'Fast. 22% bullet dodge.',    price:7000, hp:90,  dmg:35, color:'#CC88FF' },
    ];
    const gap  = 14, cols = 3;
    const cardW = Math.floor((PW - gap * (cols + 1)) / cols);
    const cardH = 155;  // Reduced height to fit all content
    const startY = cy + 6;

    // Guard count header
    const guardCount = this._guardCount || 0;
    ctx.save();
    ctx.font = 'bold 11px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = '#AAFFAA'; ctx.shadowColor = '#44FF88'; ctx.shadowBlur = 10;
    ctx.fillText(`ACTIVE GUARDS: ${guardCount} / 6`, px + PW / 2, cy + 28);
    ctx.restore();

    guards.forEach((g, i) => {
      const row  = i < 3 ? 0 : 1;
      const col  = i % cols;
      const cx2 = px + gap + col * (cardW + gap);
      const ry  = startY + 32 + row * (cardH + 10);
      const hover = mx >= cx2 && mx <= cx2 + cardW && my >= ry && my <= ry + cardH;
      const t = Date.now() * 0.001;
      const pulse = (Math.sin(t * 3 + i) + 1) * 0.5;

      // Card
      ctx.save();
      ctx.shadowColor = hover ? g.color : 'transparent'; ctx.shadowBlur = hover ? 18 : 0;
      ctx.fillStyle   = hover ? `rgba(${this._rgb(g.color)},0.12)` : 'rgba(255,255,255,0.03)';
      ctx.strokeStyle = hover ? g.color : 'rgba(255,255,255,0.1)'; ctx.lineWidth = hover ? 2 : 1;
      this._rr(ctx, cx2, ry, cardW, cardH, 8); ctx.fill(); ctx.stroke();

      // Render unique guard preview based on tier
      const mx2 = cx2 + cardW / 2, my2 = ry + 42;
      this._renderGuardPreview(ctx, mx2, my2, g.tier, g.color, hover, pulse);

      // Name
      ctx.shadowBlur = 0;
      ctx.font = 'bold 10px Orbitron, monospace'; ctx.textAlign = 'center'; ctx.fillStyle = g.color;
      ctx.shadowColor = g.color; ctx.shadowBlur = hover ? 10 : 0;
      ctx.fillText(g.name, mx2, ry + 78);
      ctx.shadowBlur = 0;

      // HP + DMG
      ctx.font = '8px Orbitron, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText(`HP: ${g.hp}  DMG: ${g.dmg}`, mx2, ry + 92);

      // Desc
      ctx.font = '8px Orbitron, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(g.desc, mx2, ry + 105);

      // Price button
      const btnY = ry + cardH - 28, btnW = cardW - 20, btnX = cx2 + 10;
      const canBuy = money >= g.price;
      ctx.fillStyle = canBuy ? (hover ? `rgba(${this._rgb(g.color)},0.25)` : `rgba(${this._rgb(g.color)},0.12)`) : 'rgba(100,100,100,0.12)';
      ctx.strokeStyle = canBuy ? g.color : '#555'; ctx.lineWidth = 1;
      this._rr(ctx, btnX, btnY, btnW, 22, 4); ctx.fill(); ctx.stroke();
      // NEX icon for hire price
      if (canBuy) {
        this._renderNexIcon(ctx, btnX + 18, btnY + 11, 12, { animated: hover });
      } else {
        ctx.globalAlpha = 0.3;
        this._renderNexIcon(ctx, btnX + 18, btnY + 11, 12, { animated: false });
        ctx.globalAlpha = 1;
      }
      ctx.font = 'bold 9px Orbitron, monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = canBuy ? g.color : '#555'; ctx.shadowColor = canBuy ? g.color : 'transparent'; ctx.shadowBlur = canBuy ? 8 : 0;
      ctx.fillText(`${g.price.toLocaleString()}  HIRE`, btnX + btnW / 2 + 8, btnY + 14);
      ctx.shadowBlur = 0; ctx.restore();

      const tier = g.tier, price = g.price, color = g.color;
      this._pushArea(btnX, btnY, btnW, 22, (p, gameRef) => {
        if ((gameRef._bodyguards || []).length >= 6) { this._msg('MAX 6 GUARDS', '#FF4466'); return; }
        if (gameRef.money < price) { this._msg('NOT ENOUGH MONEY', '#FF4466'); return; }
        gameRef.money -= price;
        const bg = new Bodyguard(p.x + rnd(-50, 50), p.y + rnd(-50, 50), tier);
        bg._color = color;
        if (tier === 'medic') {
          bg._onHeal = (amt) => {
            gameRef.player.hp = Math.min(gameRef.player.maxHp, gameRef.player.hp + amt);
          };
        }
        gameRef._bodyguards.push(bg);
        window.audio?.buy();
        this._msg(`${tier.toUpperCase()} GUARD HIRED!`, color);
      });
    });

    // Dismiss button
    const dismissY = startY + 32 + cardH * 2 + 10 + 10;
    const dismissX = px + PW / 2 - 100;
    const dismissHover = mx >= dismissX && mx <= dismissX + 200 && my >= dismissY && my <= dismissY + 24;
    ctx.save();
    ctx.fillStyle = dismissHover ? 'rgba(255,68,68,0.18)' : 'rgba(255,68,68,0.07)';
    ctx.strokeStyle = dismissHover ? '#FF4444' : 'rgba(255,68,68,0.3)'; ctx.lineWidth = 1;
    this._rr(ctx, dismissX, dismissY, 200, 24, 5); ctx.fill(); ctx.stroke();
    ctx.font = 'bold 9px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = dismissHover ? '#FF6666' : 'rgba(255,68,68,0.6)';
    ctx.fillText('DISMISS ALL GUARDS', dismissX + 100, dismissY + 16);
    ctx.restore();
    this._pushArea(dismissX, dismissY, 200, 24, (p, gameRef) => {
      gameRef._bodyguards = [];
      this._msg('ALL GUARDS DISMISSED', '#FF6666');
    });
  }

  // ── Drawing helpers ───────────────────────────────────────
  _corners(ctx, x, y, w, h, color) {
    const len = 18;
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.shadowColor = color; ctx.shadowBlur = 10;
    ctx.globalAlpha = 0.75;
    [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]].forEach(([cx,cy,sx,sy]) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy + sy * len); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * len, cy);
      ctx.stroke();
    });
    ctx.restore();
  }

  _rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ═══ NEX CURRENCY ICON HELPERS ═══════════════════════════════════════════════
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

  _drawN(ctx, x, y, w, h) {
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y);
  }

  _renderNexIcon(ctx, x, y, size, opts = {}) {
    const animated = opts.animated !== false;
    const t = animated ? performance.now() / 1000 : 0;
    const r = size / 2;

    ctx.save();
    const pulse = animated ? Math.sin(t * 2.5) * 0.3 + 0.7 : 1;
    const energyPulse = animated ? Math.sin(t * 4) * 0.5 + 0.5 : 0.5;

    // Outer rotating ring
    if (animated) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 0.3);
      ctx.strokeStyle = `rgba(0,229,255,${0.25 + pulse * 0.15})`;
      ctx.lineWidth = Math.max(1, size / 20);
      ctx.setLineDash([size / 8, size / 5]);
      ctx.beginPath();
      ctx.arc(0, 0, r + size / 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Hexagon frame
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 12 * pulse * (size / 32);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = Math.max(1.5, size / 16);
    ctx.fillStyle = 'rgba(0,10,20,0.85)';
    this._drawHexagon(ctx, x, y, r);
    ctx.fill();
    ctx.stroke();

    // Inner hexagon
    ctx.shadowBlur = 4 * (size / 32);
    ctx.strokeStyle = 'rgba(0,229,255,0.4)';
    ctx.lineWidth = Math.max(0.8, size / 32);
    this._drawHexagon(ctx, x, y, r * 0.75);
    ctx.stroke();

    // The N letter
    const nW = r * 0.7, nH = r * 0.9;
    const nX = x - nW / 2, nY = y - nH / 2;
    const strokeW = Math.max(2, size / 12);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // N glow
    ctx.shadowBlur = (10 + energyPulse * 4) * (size / 32);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = strokeW;
    this._drawN(ctx, nX, nY, nW, nH);
    ctx.stroke();

    // N bright core
    ctx.shadowBlur = 4 * (size / 32);
    ctx.strokeStyle = `rgba(180,255,255,${0.6 + energyPulse * 0.4})`;
    ctx.lineWidth = strokeW * 0.4;
    this._drawN(ctx, nX, nY, nW, nH);
    ctx.stroke();

    // Energy nodes
    ctx.shadowBlur = 6 * (size / 32);
    ctx.fillStyle = `rgba(0,229,255,${0.7 + energyPulse * 0.3})`;
    const nodeR = Math.max(1.2, size / 18);
    [[nX, nY], [nX, nY + nH], [nX + nW, nY], [nX + nW, nY + nH]].forEach(([nx, ny]) => {
      ctx.beginPath();
      ctx.arc(nx, ny, nodeR, 0, Math.PI * 2);
      ctx.fill();
    });

    // Pulse ring
    if (animated) {
      const ringPhase = (t * 1.2) % 1;
      ctx.strokeStyle = `rgba(0,229,255,${(1 - ringPhase) * 0.3})`;
      ctx.lineWidth = Math.max(0.8, size / 32);
      ctx.shadowBlur = 3;
      this._drawHexagon(ctx, x, y, r * 0.5 + ringPhase * r * 0.6);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── Render unique guard preview icons for shop ──────────────────────────────
  _renderGuardPreview(ctx, x, y, tier, color, hover, pulse) {
    const r = 20;
    ctx.save();

    switch (tier) {
      case 'light': {
        // Scout — sleek blue with speed lines
        ctx.shadowColor = color; ctx.shadowBlur = hover ? 18 : 10;
        const grd = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, r);
        grd.addColorStop(0, '#88DDFF'); grd.addColorStop(0.5, '#44CCFF'); grd.addColorStop(1, '#1188AA');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        // Visor
        ctx.fillStyle = '#001522';
        ctx.beginPath(); ctx.ellipse(x, y - 3, r * 0.55, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(68,238,255,${0.7 + pulse * 0.3})`;
        ctx.beginPath(); ctx.ellipse(x, y - 3, r * 0.38, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
        // Speed lines
        if (hover) {
          ctx.strokeStyle = `rgba(68,204,255,${0.3 + pulse * 0.2})`;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x - r - 15, y - 5); ctx.lineTo(x - r - 5, y - 5); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x - r - 12, y + 5); ctx.lineTo(x - r - 5, y + 5); ctx.stroke();
        }
        break;
      }
      case 'heavy': {
        // Tank — bulky orange with armor plates
        ctx.shadowColor = color; ctx.shadowBlur = hover ? 18 : 10;
        const grd = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, r + 3);
        grd.addColorStop(0, '#FFCC88'); grd.addColorStop(0.4, '#FF9944'); grd.addColorStop(1, '#773311');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.fill();
        // Shoulder pads
        ctx.fillStyle = '#AA5522';
        ctx.beginPath(); ctx.ellipse(x - r * 0.8, y, r * 0.35, r * 0.45, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + r * 0.8, y, r * 0.35, r * 0.45, 0.3, 0, Math.PI * 2); ctx.fill();
        // Angry visor
        ctx.fillStyle = '#220000';
        ctx.fillRect(x - r * 0.6, y - r * 0.3, r * 1.2, r * 0.28);
        ctx.fillStyle = `rgba(255,100,0,${0.7 + pulse * 0.3})`;
        ctx.fillRect(x - r * 0.5, y - r * 0.22, r * 1.0, r * 0.12);
        break;
      }
      case 'elite': {
        // Elite — green tactical with NVG
        ctx.shadowColor = color; ctx.shadowBlur = hover ? 20 : 12;
        const grd = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, r);
        grd.addColorStop(0, '#CCFFCC'); grd.addColorStop(0.4, '#66CC66'); grd.addColorStop(1, '#226622');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        // NVG goggles
        ctx.fillStyle = '#112211';
        ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.15, r * 0.22, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + r * 0.3, y - r * 0.15, r * 0.22, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(0,255,100,${0.7 + pulse * 0.3})`;
        ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.15, r * 0.14, r * 0.10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + r * 0.3, y - r * 0.15, r * 0.14, r * 0.10, 0, 0, Math.PI * 2); ctx.fill();
        // Star emblem
        if (hover) {
          ctx.fillStyle = '#FFFF44';
          this._drawStarPreview(ctx, x, y + r * 0.4, 5, r * 0.18, r * 0.08);
        }
        break;
      }
      case 'sniper': {
        // Sniper — purple with targeting reticle
        ctx.shadowColor = color; ctx.shadowBlur = hover ? 18 : 10;
        const grd = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, r);
        grd.addColorStop(0, '#FFAAFF'); grd.addColorStop(0.5, '#CC55CC'); grd.addColorStop(1, '#552255');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        // Scope visor
        ctx.fillStyle = '#220022';
        ctx.beginPath(); ctx.ellipse(x, y - r * 0.1, r * 0.5, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255,0,255,${0.6 + pulse * 0.4})`;
        ctx.beginPath(); ctx.ellipse(x, y - r * 0.1, r * 0.28, r * 0.12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF0000';
        ctx.beginPath(); ctx.arc(x, y - r * 0.1, 2, 0, Math.PI * 2); ctx.fill();
        // Crosshair
        if (hover) {
          ctx.strokeStyle = `rgba(255,68,255,${0.4 + pulse * 0.3})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x - r - 8, y); ctx.lineTo(x - r - 2, y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x + r + 2, y); ctx.lineTo(x + r + 8, y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x, y - r - 8); ctx.lineTo(x, y - r - 2); ctx.stroke();
        }
        break;
      }
      case 'medic': {
        // Medic — white/cyan with red cross
        ctx.shadowColor = color; ctx.shadowBlur = hover ? 18 : 10;
        const grd = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, r);
        grd.addColorStop(0, '#FFFFFF'); grd.addColorStop(0.4, '#88FFEE'); grd.addColorStop(1, '#228877');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        // Red cross
        ctx.fillStyle = '#FF4444';
        ctx.fillRect(x - r * 0.12, y - r * 0.45, r * 0.24, r * 0.9);
        ctx.fillRect(x - r * 0.45, y - r * 0.12, r * 0.9, r * 0.24);
        // Friendly eyes
        ctx.fillStyle = `rgba(68,255,238,${0.8 + pulse * 0.2})`;
        ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.3, r * 0.1, 0, Math.PI * 2); ctx.fill();
        // Heal particles
        if (hover) {
          ctx.fillStyle = `rgba(68,255,238,${0.5 + pulse * 0.4})`;
          ctx.font = 'bold 10px monospace';
          ctx.fillText('+', x - r - 8, y - 5);
          ctx.fillText('+', x + r + 5, y + 8);
        }
        break;
      }
      case 'ghost': {
        // Ghost — translucent purple with glowing eyes
        ctx.shadowColor = color; ctx.shadowBlur = hover ? 22 : 12;
        // Ghost trail
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#CC88FF';
        ctx.beginPath(); ctx.arc(x - 6, y + 2, r * 0.85, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        // Main body (semi-transparent)
        const grd = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, r);
        grd.addColorStop(0, 'rgba(238,200,255,0.9)');
        grd.addColorStop(0.5, 'rgba(200,136,255,0.7)');
        grd.addColorStop(1, 'rgba(100,60,150,0.5)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        // Wavy bottom
        ctx.fillStyle = 'rgba(200,136,255,0.5)';
        ctx.beginPath();
        ctx.moveTo(x - r, y + r * 0.3);
        const t = Date.now() * 0.004;
        for (let i = 0; i <= 5; i++) {
          ctx.lineTo(x - r + (i / 5) * r * 2, y + r * 0.5 + Math.sin(t + i) * r * 0.2);
        }
        ctx.lineTo(x + r, y + r * 0.3);
        ctx.closePath();
        ctx.fill();
        // Glowing eyes
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.1, r * 0.14, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + r * 0.3, y - r * 0.1, r * 0.14, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
        break;
      }
      default: {
        // Default simple circle
        ctx.fillStyle = color + '99';
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      }
    }

    ctx.restore();
  }

  _drawStarPreview(ctx, cx, cy, spikes, outerR, innerR) {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
    ctx.fill();
  }

  _rgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  }

  // Render proper NEX currency icon (hexagon with N)
  _renderNexIcon(ctx, x, y, size, opts = {}) {
    const animated = opts.animated !== false;
    const t = animated ? performance.now() / 1000 : 0;
    const r = size / 2;

    ctx.save();
    const pulse = animated ? Math.sin(t * 2.5) * 0.2 + 0.8 : 1;

    // Outer glow
    if (animated) {
      ctx.shadowColor = '#00FFCC';
      ctx.shadowBlur = 8 * pulse;
    }

    // Hexagon shape
    ctx.fillStyle = `rgba(0,255,204,${0.2 * pulse})`;
    ctx.strokeStyle = `rgba(0,255,204,${0.8 * pulse})`;
    ctx.lineWidth = Math.max(1, size / 12);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI / 3) - Math.PI / 2;
      const px = x + r * Math.cos(angle);
      const py = y + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner N letter
    ctx.fillStyle = '#00FFCC';
    ctx.font = `bold ${Math.round(size * 0.5)}px Orbitron, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText('N', x, y + 1);

    ctx.restore();
  }
}

// ── DealershipManager ────────────────────────────────────────────────────────
class DealershipManager {
  constructor() {
    this.isOpen    = false;
    this.tab       = 'vehicles';  // 'vehicles' | 'weapons' | 'grenades'
    this._areas    = [];
    this._feedback = null;
    this._scrollY  = 0;
    this._maxScrollY = 0;
  }

  open()  { this.isOpen = true;  this._areas = []; this._scrollY = 0; }
  close() { this.isOpen = false; this._areas = []; }

  handleScroll(delta) {
    if (!this.isOpen) return;
    this._scrollY = Math.max(0, Math.min(this._maxScrollY || 0, this._scrollY + delta * 0.55));
  }

  update(dt) {
    if (this._feedback) {
      this._feedback.t -= dt;
      if (this._feedback.t <= 0) this._feedback = null;
    }
  }

  handleClick(sx, sy, player, gameRef) {
    if (!this.isOpen) return false;
    for (const a of this._areas) {
      if (sx >= a.x && sx <= a.x + a.w && sy >= a.y && sy <= a.y + a.h) {
        a.action(player, gameRef);
        return true;
      }
    }
    return true;
  }

  _pushArea(x, y, w, h, fn) { this._areas.push({ x, y, w, h, action: fn }); }

  _msg(text, color = '#44FF88') { this._feedback = { msg: text, color, t: 1.8 }; }

  // ═══ NEX CURRENCY ICON HELPERS ═══════════════════════════════════════════════
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

  _drawN(ctx, x, y, w, h) {
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y);
  }

  _renderNexIcon(ctx, x, y, size, opts = {}) {
    const animated = opts.animated !== false;
    const t = animated ? performance.now() / 1000 : 0;
    const r = size / 2;

    ctx.save();
    const pulse = animated ? Math.sin(t * 2.5) * 0.3 + 0.7 : 1;
    const energyPulse = animated ? Math.sin(t * 4) * 0.5 + 0.5 : 0.5;

    // Outer rotating ring
    if (animated) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 0.3);
      ctx.strokeStyle = `rgba(0,229,255,${0.25 + pulse * 0.15})`;
      ctx.lineWidth = Math.max(1, size / 20);
      ctx.setLineDash([size / 8, size / 5]);
      ctx.beginPath();
      ctx.arc(0, 0, r + size / 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Hexagon frame
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 12 * pulse * (size / 32);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = Math.max(1.5, size / 16);
    ctx.fillStyle = 'rgba(0,10,20,0.85)';
    this._drawHexagon(ctx, x, y, r);
    ctx.fill();
    ctx.stroke();

    // Inner hexagon
    ctx.shadowBlur = 4 * (size / 32);
    ctx.strokeStyle = 'rgba(0,229,255,0.4)';
    ctx.lineWidth = Math.max(0.8, size / 32);
    this._drawHexagon(ctx, x, y, r * 0.75);
    ctx.stroke();

    // The N letter
    const nW = r * 0.7, nH = r * 0.9;
    const nX = x - nW / 2, nY = y - nH / 2;
    const strokeW = Math.max(2, size / 12);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // N glow
    ctx.shadowBlur = (10 + energyPulse * 4) * (size / 32);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = strokeW;
    this._drawN(ctx, nX, nY, nW, nH);
    ctx.stroke();

    // N bright core
    ctx.shadowBlur = 4 * (size / 32);
    ctx.strokeStyle = `rgba(180,255,255,${0.6 + energyPulse * 0.4})`;
    ctx.lineWidth = strokeW * 0.4;
    this._drawN(ctx, nX, nY, nW, nH);
    ctx.stroke();

    // Energy nodes
    ctx.shadowBlur = 6 * (size / 32);
    ctx.fillStyle = `rgba(0,229,255,${0.7 + energyPulse * 0.3})`;
    const nodeR = Math.max(1.2, size / 18);
    [[nX, nY], [nX, nY + nH], [nX + nW, nY], [nX + nW, nY + nH]].forEach(([nx, ny]) => {
      ctx.beginPath();
      ctx.arc(nx, ny, nodeR, 0, Math.PI * 2);
      ctx.fill();
    });

    // Pulse ring
    if (animated) {
      const ringPhase = (t * 1.2) % 1;
      ctx.strokeStyle = `rgba(0,229,255,${(1 - ringPhase) * 0.3})`;
      ctx.lineWidth = Math.max(0.8, size / 32);
      ctx.shadowBlur = 3;
      this._drawHexagon(ctx, x, y, r * 0.5 + ringPhase * r * 0.6);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── Helpers (shared with ShopManager) ──────────────────────────────────────
  _rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  _corners(ctx, x, y, w, h, color) {
    const len = 18;
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.shadowColor = color; ctx.shadowBlur = 10;
    ctx.globalAlpha = 0.75;
    [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]].forEach(([cx,cy,sx2,sy2]) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy + sy2 * len); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx2 * len, cy);
      ctx.stroke();
    });
    ctx.restore();
  }

  _rgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  }

  // ═══ WEAPON DRAWING METHODS ═══════════════════════════════════════════════════
  _drawRealisticWeapon(ctx, x, y, weapon, visible, equipped) {
    if (!visible) { ctx.save(); ctx.globalAlpha = 0.2; }
    ctx.save();
    ctx.translate(x, y);
    const color = weapon.color;
    const bright = equipped ? 1 : 0.7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (weapon.id) {
      case 'pistol': this._drawPistol(ctx, color, bright, equipped); break;
      case 'knife': this._drawKnife(ctx, color, bright, equipped); break;
      case 'smg': this._drawSMG(ctx, color, bright, equipped); break;
      case 'shotgun': this._drawShotgun(ctx, color, bright, equipped); break;
      case 'assault': this._drawAssaultRifle(ctx, color, bright, equipped); break;
      case 'sniper': this._drawSniperRifle(ctx, color, bright, equipped); break;
      case 'minigun': this._drawMinigun(ctx, color, bright, equipped); break;
      case 'timecannon': this._drawTimeCannon(ctx, color, bright, equipped); break;
      case 'gravitgun': this._drawGravityRifle(ctx, color, bright, equipped); break;
      case 'electricwhip': this._drawElectricWhip(ctx, color, bright, equipped); break;
      case 'plasmashotgun': this._drawPlasmaShotgun(ctx, color, bright, equipped); break;
      case 'burst': this._drawBurstPistol(ctx, color, bright, equipped); break;
      case 'flamethrower': this._drawFlamethrower(ctx, color, bright, equipped); break;
      case 'crossbow': this._drawCrossbow(ctx, color, bright, equipped); break;
      case 'rocket': this._drawRocketLauncher(ctx, color, bright, equipped); break;
      default: this._drawGenericGun(ctx, color, bright, equipped);
    }
    ctx.restore();
    if (!visible) ctx.restore();
  }

  _drawPistol(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.9 * bright})`;
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-8, -8, 32, 12, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,0.15)`; ctx.fillRect(-5, -6, 26, 3);
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.7 * bright})`;
    ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(-4, 4); ctx.lineTo(-2, 20); ctx.lineTo(-12, 20); ctx.lineTo(-10, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(2, 10, 6, 0.3, Math.PI - 0.3); ctx.stroke();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(24, -2, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _drawKnife(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
    ctx.fillStyle = `rgba(200,200,220,${0.9 * bright})`; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-25, 0); ctx.lineTo(20, -4); ctx.lineTo(28, 0); ctx.lineTo(20, 4); ctx.lineTo(-25, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(-20, -1); ctx.lineTo(15, -3); ctx.lineTo(15, -1); ctx.lineTo(-20, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = color; ctx.fillRect(-27, -6, 4, 12);
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`; ctx.beginPath(); ctx.roundRect(-42, -5, 16, 10, 2); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-40 + i * 5, -4, 2, 8); }
    ctx.restore();
  }

  _drawSMG(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.85 * bright})`; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-22, -8, 44, 14, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,0.1)`; ctx.fillRect(-18, -7, 32, 3);
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`; ctx.beginPath(); ctx.roundRect(-8, 6, 12, 18, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.5 * bright})`; ctx.beginPath(); ctx.moveTo(-20, 6); ctx.lineTo(-16, 6); ctx.lineTo(-14, 18); ctx.lineTo(-22, 18); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(22, -1, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.7 * bright})`; ctx.beginPath(); ctx.roundRect(-35, -5, 14, 8, 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawShotgun(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.85 * bright})`; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-20, -5, 55, 8, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-15, -4, 45, 2);
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`; ctx.beginPath(); ctx.roundRect(5, -8, 18, 14, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.5 * bright})`; ctx.beginPath(); ctx.moveTo(-20, -4); ctx.lineTo(-38, -2); ctx.lineTo(-38, 4); ctx.lineTo(-20, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-22, 3); ctx.lineTo(-18, 3); ctx.lineTo(-16, 16); ctx.lineTo(-24, 16); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(35, -1, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _drawAssaultRifle(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.85 * bright})`; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-25, -7, 50, 12, 3); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(25, -4, 15, 6, 1); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.7 * bright})`; ctx.beginPath(); ctx.roundRect(-15, -14, 25, 7, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.55 * bright})`; ctx.beginPath(); ctx.moveTo(-5, 5); ctx.lineTo(8, 5); ctx.lineTo(10, 22); ctx.lineTo(-7, 22); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-20, 5); ctx.lineTo(-15, 5); ctx.lineTo(-13, 18); ctx.lineTo(-22, 18); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.65 * bright})`; ctx.beginPath(); ctx.roundRect(-42, -5, 18, 10, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(40, -1, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _drawSniperRifle(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.85 * bright})`; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-30, -4, 70, 7, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(-25, -3, 60, 2);
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.9 * bright})`; ctx.beginPath(); ctx.roundRect(-15, -14, 30, 10, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#115588'; ctx.beginPath(); ctx.ellipse(15, -9, 4, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(14, -10, 2, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(15, 3); ctx.lineTo(10, 18); ctx.moveTo(15, 3); ctx.lineTo(20, 18); ctx.stroke();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`; ctx.beginPath(); ctx.moveTo(-30, -3); ctx.lineTo(-48, 0); ctx.lineTo(-48, 6); ctx.lineTo(-30, 3); ctx.closePath(); ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-25, 3); ctx.lineTo(-20, 3); ctx.lineTo(-18, 14); ctx.lineTo(-27, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawMinigun(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.8 * bright})`; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.roundRect(-15, i * 6 - 2, 45, 4, 1); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.7 * bright})`; ctx.beginPath(); ctx.ellipse(30, 0, 6, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.85 * bright})`; ctx.beginPath(); ctx.ellipse(-15, 0, 10, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.5 * bright})`; ctx.beginPath(); ctx.roundRect(-35, -6, 12, 12, 3); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-15, 18); ctx.lineTo(-8, 18); ctx.lineTo(-5, 28); ctx.lineTo(-18, 28); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`; ctx.beginPath(); ctx.roundRect(-28, 8, 10, 20, 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawTimeCannon(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 20; }
    const t = performance.now() / 1000; const pulse = Math.sin(t * 4) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.3 * pulse})`; ctx.beginPath(); ctx.arc(5, 0, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.85 * bright})`; ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(5, 0, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(5, 0, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(5, -7); ctx.moveTo(5, 0); ctx.lineTo(10, 3); ctx.stroke();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.8 * bright})`; ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(23, -5, 20, 10, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`; ctx.beginPath(); ctx.moveTo(-12, 5); ctx.lineTo(-5, 5); ctx.lineTo(-3, 20); ctx.lineTo(-14, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawGravityRifle(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 20; }
    const t = performance.now() / 1000;
    ctx.strokeStyle = `rgba(${this._rgb(color)},${0.3 + Math.sin(t * 3) * 0.15})`; ctx.lineWidth = 1;
    for (let r = 12; r <= 20; r += 4) { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.85 * bright})`; ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(-30, -6, 35, 12, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(-3, -3, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.75 * bright})`; ctx.beginPath(); ctx.roundRect(10, -4, 25, 8, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`; ctx.beginPath(); ctx.roundRect(-45, -4, 16, 8, 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-22, 6); ctx.lineTo(-16, 6); ctx.lineTo(-14, 18); ctx.lineTo(-24, 18); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawElectricWhip(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 20; }
    const t = performance.now() / 1000;
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.7 * bright})`; ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(-38, -6, 16, 12, 3); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(-22, 0);
    for (let i = 0; i <= 8; i++) { const px = -22 + i * 7; const py = Math.sin(i * 1.2 + t * 8) * (4 + i * 0.8); ctx.lineTo(px, py); }
    ctx.stroke();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) { const sx = -15 + i * 12; const sy = Math.sin(i * 1.5 + t * 10) * 5; ctx.beginPath(); ctx.moveTo(sx, sy - 4); ctx.lineTo(sx + 3, sy); ctx.lineTo(sx, sy + 4); ctx.stroke(); }
    ctx.restore();
  }

  _drawPlasmaShotgun(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 18; }
    const t = performance.now() / 1000;
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.8 * bright})`; ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(-25, -7, 50, 14, 4); ctx.fill(); ctx.stroke();
    const pulse = Math.sin(t * 5) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.4 * pulse})`; ctx.beginPath(); ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`; ctx.beginPath(); ctx.moveTo(25, -10); ctx.lineTo(38, -14); ctx.lineTo(38, 14); ctx.lineTo(25, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.5 * bright})`; ctx.beginPath(); ctx.moveTo(-20, 7); ctx.lineTo(-14, 7); ctx.lineTo(-12, 20); ctx.lineTo(-22, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawBurstPistol(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.85 * bright})`; ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(-12, -10, 38, 14, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#222'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(26, -3 + i * 4, 2, 2, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(-8, -8, 28, 3);
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`; ctx.beginPath(); ctx.moveTo(-10, 4); ctx.lineTo(-4, 4); ctx.lineTo(-2, 22); ctx.lineTo(-14, 22); ctx.lineTo(-12, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(4, 10, 6, 0.3, Math.PI - 0.3); ctx.stroke();
    ctx.fillStyle = color; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'; ctx.fillText('III', 8, -4);
    ctx.restore();
  }

  _drawFlamethrower(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 18; }
    const t = performance.now() / 1000;
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.75 * bright})`; ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(-30, -8, 35, 16, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`; ctx.beginPath(); ctx.ellipse(-18, 0, 10, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.8 * bright})`; ctx.beginPath(); ctx.roundRect(5, -5, 25, 10, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FF6600'; ctx.shadowColor = '#FF4400'; ctx.shadowBlur = 15;
    const flameSize = 8 + Math.sin(t * 15) * 3;
    ctx.beginPath(); ctx.moveTo(30, 0); ctx.quadraticCurveTo(35 + flameSize, -8, 40 + flameSize, 0); ctx.quadraticCurveTo(35 + flameSize, 8, 30, 0); ctx.fill();
    ctx.fillStyle = '#FFAA00'; ctx.beginPath(); ctx.moveTo(30, 0); ctx.quadraticCurveTo(33 + flameSize * 0.5, -4, 36 + flameSize * 0.5, 0); ctx.quadraticCurveTo(33 + flameSize * 0.5, 4, 30, 0); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = `rgba(${this._rgb(color)},${0.5 * bright})`; ctx.beginPath(); ctx.moveTo(-5, 8); ctx.lineTo(2, 8); ctx.lineTo(4, 20); ctx.lineTo(-7, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawCrossbow(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.8 * bright})`; ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(-25, -4, 50, 8, 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-10, -4); ctx.quadraticCurveTo(-25, -20, -35, -15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10, 4); ctx.quadraticCurveTo(-25, 20, -35, 15); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-35, -15); ctx.lineTo(-5, 0); ctx.lineTo(-35, 15); ctx.stroke();
    ctx.fillStyle = '#AAAAAA'; ctx.strokeStyle = '#888888'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(30, 0); ctx.lineTo(35, -2); ctx.lineTo(38, 0); ctx.lineTo(35, 2); ctx.lineTo(30, 0); ctx.stroke(); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(-8, -4); ctx.lineTo(-8, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.7 * bright})`; ctx.beginPath(); ctx.roundRect(5, -10, 12, 6, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.5 * bright})`; ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(8, 4); ctx.lineTo(10, 18); ctx.lineTo(-2, 18); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawRocketLauncher(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 18; }
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.8 * bright})`; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-35, -10, 70, 20, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(35, 0, 5, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-35, 0, 4, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#DD3300'; ctx.beginPath(); ctx.roundRect(-20, -5, 40, 10, 3); ctx.fill();
    ctx.fillStyle = '#FF5500'; ctx.beginPath(); ctx.moveTo(20, -5); ctx.lineTo(28, 0); ctx.lineTo(20, 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.7 * bright})`; ctx.beginPath(); ctx.roundRect(-5, -18, 20, 8, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.5 * bright})`; ctx.beginPath(); ctx.roundRect(-30, 10, 14, 12, 3); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(5, 10, 14, 12, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.6 * bright})`; ctx.beginPath(); ctx.roundRect(-12, 8, 10, 6, 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawGenericGun(ctx, color, bright, equipped) {
    ctx.save();
    if (equipped) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
    ctx.fillStyle = `rgba(${this._rgb(color)},${0.8 * bright})`; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-20, -5, 40, 10, 3); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  render(ctx, W, H, player, money, grenadeCount, mx, my) {
    if (!this.isOpen) return;
    this._areas = [];

    const PW = Math.min(860, W - 40);
    const PH = Math.min(600, H - 50);
    const px = (W - PW) / 2;
    const py = (H - PH) / 2;

    // Neon City primary colors
    const PRIMARY = '#44EEFF';      // Cyan
    const SECONDARY = '#FF4466';    // Pink
    const ACCENT = '#44FF88';       // Green
    const PURPLE = '#CC88FF';       // Purple accent

    // Dim backdrop with subtle gradient
    ctx.save();
    const bgGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W, H) * 0.7);
    bgGrad.addColorStop(0, 'rgba(10,20,40,0.92)');
    bgGrad.addColorStop(1, 'rgba(0,0,0,0.95)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Animated scanlines
    ctx.save();
    const t = performance.now() / 1000;
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < H; i += 4) {
      const offset = Math.sin(t * 0.5 + i * 0.01) * 2;
      ctx.fillStyle = i % 8 === 0 ? PRIMARY : '#000';
      ctx.fillRect(0, i + offset, W, 1);
    }
    ctx.restore();

    // Panel with cyan glow
    ctx.save();
    ctx.shadowColor = PRIMARY; ctx.shadowBlur = 50;
    ctx.fillStyle = '#06060e';
    ctx.strokeStyle = `rgba(68,238,255,0.6)`;
    ctx.lineWidth = 2;
    this._rr(ctx, px, py, PW, PH, 14);
    ctx.fill(); ctx.stroke();
    ctx.restore();

    // Inner panel border glow
    ctx.save();
    ctx.strokeStyle = `rgba(68,238,255,0.15)`;
    ctx.lineWidth = 1;
    this._rr(ctx, px + 4, py + 4, PW - 8, PH - 8, 10);
    ctx.stroke();
    ctx.restore();

    // Top gradient stripe with cyan
    ctx.save();
    const grd = ctx.createLinearGradient(px, py, px, py + 70);
    grd.addColorStop(0, 'rgba(68,238,255,0.12)');
    grd.addColorStop(0.5, 'rgba(68,238,255,0.04)');
    grd.addColorStop(1, 'rgba(68,238,255,0)');
    ctx.fillStyle = grd;
    this._rr(ctx, px, py, PW, 70, 14);
    ctx.fill();
    ctx.restore();

    // Corner accents with cyan
    this._corners(ctx, px, py, PW, PH, PRIMARY);

    // NEX icon on the left of title
    this._renderNexIcon(ctx, px + 50, py + 30, 40, { animated: true });

    // Title with glow
    ctx.save();
    ctx.font = 'bold 28px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.shadowColor = PRIMARY; ctx.shadowBlur = 25; ctx.fillStyle = '#fff';
    ctx.fillText('DEALERSHIP', px + PW / 2, py + 40);
    // Subtitle
    ctx.font = '10px Orbitron, monospace';
    ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(68,238,255,0.6)';
    ctx.fillText('VEHICLES • WEAPONS • EQUIPMENT', px + PW / 2, py + 54);
    ctx.restore();

    // Decorative line accents
    ctx.save();
    ctx.strokeStyle = `rgba(68,238,255,0.25)`; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 90, py + 35); ctx.lineTo(px + 170, py + 35);
    ctx.moveTo(px + PW - 90, py + 35); ctx.lineTo(px + PW - 170, py + 35);
    ctx.stroke();
    ctx.restore();

    // Divider with gradient
    ctx.save();
    const divGrad = ctx.createLinearGradient(px + 24, 0, px + PW - 24, 0);
    divGrad.addColorStop(0, 'rgba(68,238,255,0)');
    divGrad.addColorStop(0.2, 'rgba(68,238,255,0.3)');
    divGrad.addColorStop(0.5, 'rgba(68,238,255,0.5)');
    divGrad.addColorStop(0.8, 'rgba(68,238,255,0.3)');
    divGrad.addColorStop(1, 'rgba(68,238,255,0)');
    ctx.strokeStyle = divGrad; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 24, py + 64); ctx.lineTo(px + PW - 24, py + 64); ctx.stroke();
    ctx.restore();

    // Close button with pink
    const clx = px + PW - 24, cly = py + 24, clr = 16;
    const clHov = Math.hypot(mx - clx, my - cly) < clr + 4;
    ctx.save();
    ctx.shadowColor = clHov ? SECONDARY : 'rgba(255,68,102,0.3)'; ctx.shadowBlur = clHov ? 25 : 8;
    ctx.strokeStyle = clHov ? SECONDARY : 'rgba(255,68,102,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(clx, cly, clr, 0, Math.PI * 2); ctx.stroke();
    if (clHov) {
      ctx.fillStyle = 'rgba(255,68,102,0.15)';
      ctx.fill();
    }
    ctx.fillStyle = clHov ? SECONDARY : 'rgba(255,68,102,0.7)';
    ctx.font = 'bold 20px Orbitron, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('×', clx, cly);
    ctx.textBaseline = 'alphabetic'; ctx.restore();
    this._pushArea(clx - clr - 4, cly - clr - 4, (clr + 4) * 2, (clr + 4) * 2, () => this.close());

    // Tabs with Neon City colors
    const tabY = py + 72, tabH = 40;
    const tabW = (PW - 80) / 3;
    [['vehicles','VEHICLES'],['weapons','WEAPONS'],['grenades','GRENADES']].forEach(([id, label], i) => {
      const tx = px + 20 + i * (tabW + 20);
      const active = this.tab === id;
      const hover  = mx >= tx && mx <= tx + tabW && my >= tabY && my <= tabY + tabH;
      const color  = id === 'grenades' ? '#FF8800' : id === 'vehicles' ? PRIMARY : PURPLE;
      ctx.save();
      ctx.shadowColor = active ? color : 'transparent'; ctx.shadowBlur = active ? 14 : 0;
      ctx.fillStyle   = active ? `rgba(${this._rgb(color)},0.18)` : hover ? 'rgba(255,255,255,0.05)' : 'transparent';
      ctx.strokeStyle = active ? color : hover ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)';
      ctx.lineWidth = active ? 2 : 1;
      this._rr(ctx, tx, tabY, tabW, tabH, 8);
      ctx.fill(); ctx.stroke();
      // Tab icon indicators
      if (active) {
        ctx.fillStyle = color;
        ctx.fillRect(tx + 8, tabY + tabH - 3, tabW - 16, 2);
      }
      ctx.font = `bold ${active ? 13 : 11}px Orbitron, monospace`;
      ctx.fillStyle = active ? '#fff' : hover ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.35)';
      ctx.textAlign = 'center';
      ctx.shadowColor = active ? color : 'transparent'; ctx.shadowBlur = active ? 8 : 0;
      ctx.fillText(label, tx + tabW / 2, tabY + 25);
      ctx.restore();
      if (!active) this._pushArea(tx, tabY, tabW, tabH, () => { this.tab = id; this._scrollY = 0; });
    });

    // Content area
    const contentY = tabY + tabH + 12;
    const contentH = PH - (contentY - py) - 50;
    ctx.save();
    ctx.beginPath(); ctx.rect(px + 12, contentY, PW - 24, contentH); ctx.clip();
    if      (this.tab === 'vehicles') this._drawVehicles(ctx, px, contentY, PW, contentH, player, money, mx, my);
    else if (this.tab === 'weapons')  this._drawWeapons(ctx, px, contentY, PW, contentH, player, money, mx, my);
    else                              this._drawGrenades(ctx, px, contentY, PW, contentH, grenadeCount, money, mx, my);
    ctx.restore();

    // Balance area with NEX icon
    ctx.save();
    // Balance background
    const balGrad = ctx.createLinearGradient(px, py + PH - 38, px, py + PH);
    balGrad.addColorStop(0, 'rgba(0,229,255,0)');
    balGrad.addColorStop(1, 'rgba(0,229,255,0.05)');
    ctx.fillStyle = balGrad;
    ctx.fillRect(px, py + PH - 38, PW, 38);

    // NEX mini icon
    this._renderNexIcon(ctx, px + 32, py + PH - 19, 24, { animated: true });

    ctx.font = 'bold 16px Orbitron, monospace'; ctx.fillStyle = '#00FFCC';
    ctx.shadowColor = '#00FFCC'; ctx.shadowBlur = 14; ctx.textAlign = 'left';
    ctx.fillText(`${money.toLocaleString()} NEX`, px + 52, py + PH - 14);
    ctx.restore();

    // Close hint with better styling
    ctx.save();
    ctx.font = '10px Orbitron, monospace'; ctx.fillStyle = 'rgba(68,238,255,0.4)';
    ctx.textAlign = 'right';
    ctx.fillText('[ T ] or [ ESC ] TO CLOSE', px + PW - 22, py + PH - 14);
    ctx.restore();

    // Feedback
    if (this._feedback) {
      const a = Math.min(1, this._feedback.t / 0.6);
      ctx.save(); ctx.globalAlpha = a;
      ctx.font = 'bold 17px Orbitron, monospace'; ctx.fillStyle = this._feedback.color;
      ctx.shadowColor = this._feedback.color; ctx.shadowBlur = 25; ctx.textAlign = 'center';
      ctx.fillText(this._feedback.msg, W / 2, py + PH + 30);
      ctx.restore();
    }
  }

  // ── Vehicles tab ────────────────────────────────────────────────────────────
  _drawVehicles(ctx, px, y, PW, PH, player, money, mx, my) {
    const cars = CONFIG.CAR_DEALERSHIP;
    const cols = 2, gap = 18;
    const cardW = Math.floor((PW - gap * (cols + 1)) / cols);
    const cardH = Math.min(165, Math.floor((PH - gap * 3) / 2));

    cars.forEach((car, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const cx  = px + gap + col * (cardW + gap);
      const cy  = y  + gap + row * (cardH + gap);
      const canBuy = money >= car.price;
      const hover  = mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH;

      // Card background with gradient
      ctx.save();
      const cardGrad = ctx.createLinearGradient(cx, cy, cx, cy + cardH);
      if (hover && canBuy) {
        cardGrad.addColorStop(0, `rgba(${this._rgb(car.color)},0.15)`);
        cardGrad.addColorStop(1, `rgba(${this._rgb(car.color)},0.05)`);
      } else {
        cardGrad.addColorStop(0, 'rgba(10,15,25,0.7)');
        cardGrad.addColorStop(1, 'rgba(5,8,15,0.8)');
      }
      ctx.fillStyle = cardGrad;
      ctx.strokeStyle = hover && canBuy ? car.color : canBuy ? 'rgba(68,238,255,0.15)' : 'rgba(255,255,255,0.06)';
      ctx.shadowColor = hover && canBuy ? car.color : 'transparent';
      ctx.shadowBlur  = hover && canBuy ? 20 : 0;
      ctx.lineWidth   = hover && canBuy ? 2 : 1;
      this._rr(ctx, cx, cy, cardW, cardH, 10);
      ctx.fill(); ctx.stroke();

      // Top color bar with glow effect
      ctx.save();
      ctx.shadowColor = car.color; ctx.shadowBlur = canBuy ? 8 : 0;
      ctx.fillStyle = car.color + (canBuy ? 'cc' : '2a');
      ctx.fillRect(cx + 12, cy + 2, cardW - 24, 3);
      ctx.restore();

      // Car name
      ctx.font = 'bold 13px Orbitron, monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = canBuy ? '#fff' : '#555'; ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.fillText(car.name, cx + cardW / 2, cy + 26);

      // Car silhouette — unique shape per type
      ctx.save();
      ctx.translate(cx + cardW / 2, cy + cardH * 0.46);
      const alpha = canBuy ? 'cc' : '33';
      const alpha2 = canBuy ? 'ff' : '44';
      ctx.fillStyle   = car.color + alpha;
      ctx.strokeStyle = car.color + alpha2;

      if (car.id === 'sedan') {
        // Sedan — medium, classic roofline
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(-30, -10, 60, 17, 4); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.roundRect(-18, -24, 36, 16, 4); ctx.fill(); ctx.stroke();
        // Window tint
        ctx.fillStyle = 'rgba(120,200,255,0.18)';
        ctx.beginPath(); ctx.roundRect(-15, -22, 30, 12, 3); ctx.fill();
        ctx.fillStyle = car.color + alpha; ctx.strokeStyle = car.color + alpha2;
        // Wheels
        const wr = 6;
        ctx.fillStyle = '#1a1a1a';
        [-21, 21].forEach(wx2 => {
          ctx.lineWidth = 2; ctx.strokeStyle = '#444';
          ctx.beginPath(); ctx.arc(wx2, 7, wr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#333'; ctx.strokeStyle = '#666'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(wx2, 7, wr * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#1a1a1a';
        });

      } else if (car.id === 'sports') {
        // Sports car — ultra low, long hood, narrow cabin offset to rear
        ctx.lineWidth = 1.5;
        // Long sleek body
        ctx.beginPath(); ctx.roundRect(-36, -7, 72, 13, 3); ctx.fill(); ctx.stroke();
        // Low cabin shifted slightly back
        ctx.beginPath(); ctx.roundRect(-6, -19, 26, 14, 4); ctx.fill(); ctx.stroke();
        // Aggressive front splitter
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-36, 0); ctx.lineTo(-40, 2); ctx.lineTo(-36, 4); ctx.stroke();
        // Rear spoiler
        ctx.beginPath(); ctx.moveTo(28, -10); ctx.lineTo(36, -12); ctx.lineTo(36, -9); ctx.stroke();
        // Window tint — low & slim
        ctx.fillStyle = 'rgba(120,200,255,0.18)';
        ctx.beginPath(); ctx.roundRect(-3, -17, 22, 10, 3); ctx.fill();
        ctx.fillStyle = car.color + alpha; ctx.strokeStyle = car.color + alpha2;
        // Wheels — bigger, wider set
        const wr2 = 6;
        ctx.fillStyle = '#1a1a1a';
        [-26, 25].forEach(wx2 => {
          ctx.lineWidth = 2.5; ctx.strokeStyle = '#444';
          ctx.beginPath(); ctx.arc(wx2, 6, wr2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#333'; ctx.strokeStyle = '#666'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(wx2, 6, wr2 * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#1a1a1a';
        });

      } else if (car.id === 'suv') {
        // SUV/Truck — tall, wide, boxy
        ctx.lineWidth = 1.5;
        // Tall boxy body
        ctx.beginPath(); ctx.roundRect(-30, -13, 60, 22, 3); ctx.fill(); ctx.stroke();
        // Tall wide cabin, nearly full width
        ctx.beginPath(); ctx.roundRect(-26, -31, 52, 20, 3); ctx.fill(); ctx.stroke();
        // Roof rack accent
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-22, -31); ctx.lineTo(-22, -34); ctx.moveTo(22, -31); ctx.lineTo(22, -34);
        ctx.moveTo(-22, -34); ctx.lineTo(22, -34); ctx.stroke();
        // Window tint — wide
        ctx.fillStyle = 'rgba(120,200,255,0.18)';
        ctx.beginPath(); ctx.roundRect(-22, -29, 44, 15, 2); ctx.fill();
        ctx.fillStyle = car.color + alpha; ctx.strokeStyle = car.color + alpha2;
        // Big wheels
        const wr3 = 8;
        ctx.fillStyle = '#1a1a1a';
        [-20, 20].forEach(wx2 => {
          ctx.lineWidth = 2.5; ctx.strokeStyle = '#555';
          ctx.beginPath(); ctx.arc(wx2, 9, wr3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#333'; ctx.strokeStyle = '#777'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(wx2, 9, wr3 * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#1a1a1a';
        });

      } else if (car.id === 'armored') {
        // Armored Van — massive, boxy, plated
        ctx.lineWidth = 2;
        // Huge boxy body
        ctx.beginPath(); ctx.roundRect(-34, -14, 68, 26, 2); ctx.fill(); ctx.stroke();
        // Full-width tall cabin, almost no curvature
        ctx.beginPath(); ctx.roundRect(-32, -36, 64, 24, 2); ctx.fill(); ctx.stroke();
        // Armor plate lines on body
        ctx.lineWidth = 1;
        ctx.strokeStyle = car.color + (canBuy ? '55' : '1a');
        ctx.beginPath();
        ctx.moveTo(-34, -2); ctx.lineTo(34, -2);   // horizontal belt line
        ctx.moveTo(-34, 5);  ctx.lineTo(34, 5);    // second belt
        ctx.moveTo(-10, -14); ctx.lineTo(-10, 12); // vertical panel
        ctx.moveTo(10, -14);  ctx.lineTo(10, 12);  // vertical panel
        ctx.stroke();
        // Mesh grill on front
        ctx.strokeStyle = car.color + alpha2; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(-34, -4, 8, 10, 1); ctx.stroke();
        // Tiny slit window
        ctx.fillStyle = 'rgba(120,200,255,0.12)';
        ctx.beginPath(); ctx.roundRect(-28, -34, 56, 8, 1); ctx.fill();
        ctx.fillStyle = car.color + alpha; ctx.strokeStyle = car.color + alpha2;
        // Huge armored wheels
        const wr4 = 9;
        ctx.fillStyle = '#111';
        [-22, 22].forEach(wx2 => {
          ctx.lineWidth = 3; ctx.strokeStyle = '#555';
          ctx.beginPath(); ctx.arc(wx2, 12, wr4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          // Lug bolts
          for (let b2 = 0; b2 < 5; b2++) {
            const ba = (b2 / 5) * Math.PI * 2;
            ctx.fillStyle = '#666';
            ctx.beginPath(); ctx.arc(wx2 + Math.cos(ba) * wr4 * 0.55, 12 + Math.sin(ba) * wr4 * 0.55, 1.5, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = '#111';
        });
      }
      ctx.restore();

      // Desc - moved higher for better spacing
      ctx.font = '10px Rajdhani, monospace'; ctx.fillStyle = canBuy ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)';
      ctx.textAlign = 'center';
      ctx.fillText(car.desc, cx + cardW / 2, cy + cardH - 58);

      // Stats with color coding - better spacing
      ctx.font = '10px Orbitron, monospace'; ctx.textAlign = 'center'; ctx.shadowBlur = 0;
      const statY = cy + cardH - 40;
      // Speed stat
      ctx.fillStyle = canBuy ? '#44EEFF' : 'rgba(68,238,255,0.3)';
      ctx.fillText(`SPD`, cx + cardW / 2 - 60, statY);
      ctx.fillStyle = canBuy ? '#fff' : 'rgba(255,255,255,0.3)';
      ctx.fillText(`${car.speed}`, cx + cardW / 2 - 30, statY);
      // HP stat
      ctx.fillStyle = canBuy ? '#44FF88' : 'rgba(68,255,136,0.3)';
      ctx.fillText(`HP`, cx + cardW / 2 + 15, statY);
      ctx.fillStyle = canBuy ? '#fff' : 'rgba(255,255,255,0.3)';
      ctx.fillText(`${car.hp}`, cx + cardW / 2 + 45, statY);
      // Bulletproof badge
      if (car.bulletproof) {
        ctx.save();
        ctx.fillStyle = canBuy ? '#CC88FF' : 'rgba(204,136,255,0.3)';
        ctx.shadowColor = canBuy ? '#CC88FF' : 'transparent'; ctx.shadowBlur = canBuy ? 6 : 0;
        ctx.fillText('⬡ ARMORED', cx + cardW / 2 + 95, statY);
        ctx.restore();
      }

      // Price area with full NEX icon - more space from stats
      ctx.save();
      const priceX = cx + cardW / 2;
      const priceY = cy + cardH - 14;
      // Draw full NEX icon (with N inside)
      if (canBuy) {
        this._renderNexIcon(ctx, priceX - 55, priceY - 4, 18, { animated: hover });
      } else {
        // Dimmed version for unaffordable
        ctx.globalAlpha = 0.3;
        this._renderNexIcon(ctx, priceX - 55, priceY - 4, 18, { animated: false });
        ctx.globalAlpha = 1;
      }
      // Price text
      ctx.font = 'bold 14px Orbitron, monospace';
      ctx.fillStyle = canBuy ? (hover ? '#fff' : '#00FFCC') : '#444';
      ctx.shadowColor = canBuy && hover ? '#00FFCC' : 'transparent';
      ctx.shadowBlur = canBuy && hover ? 16 : 0;
      ctx.textAlign = 'center';
      ctx.fillText(`${car.price.toLocaleString()} NEX`, priceX + 10, priceY);
      ctx.restore();

      if (canBuy) {
        this._pushArea(cx, cy, cardW, cardH, (p, g) => {
          const effectivePrice = Math.round(car.price * (1 - (g._shopDiscount || 0)));
          if (g.money >= effectivePrice) {
            g.money -= effectivePrice;
            const door   = g._indoor?.doorDoor;
            const spawnX = door ? door.wx + 50 : p.x + 80;
            const spawnY = door ? door.wy + 70 : p.y + 80;
            const v = new Vehicle(spawnX, spawnY, car.color);
            v.speed = car.speed; v.hp = car.hp; v.maxHp = car.hp;
            v.radius = car.radius;
            if (car.bulletproof) v.bulletproof = true;
            g.vehicles.push(v);
            window.audio?.vehicle();
            g._dealership.close();
            g.state = 'playing';
          } else { this._msg('NOT ENOUGH MONEY', '#FF4466'); }
        });
      }
      ctx.restore();
    });
  }

  // ── Weapons tab ─────────────────────────────────────────────────────────────
  _drawWeapons(ctx, px, y, PW, PH, player, money, mx, my) {
    const weapons = CONFIG.WEAPONS;
    const cols = 3, gap = 14;
    const sbW = 10; // scrollbar width
    const cardW = Math.floor((PW - gap * (cols + 1) - sbW - 4) / cols);
    const cardH = 175; // Taller cards for weapon icons

    // Calculate scrolling
    const rows = Math.ceil(weapons.length / cols);
    const totalH = gap + rows * (cardH + gap);
    this._maxScrollY = Math.max(0, totalH - PH + 20);
    this._scrollY = Math.max(0, Math.min(this._scrollY || 0, this._maxScrollY));

    weapons.forEach((w, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const cx  = px + gap + col * (cardW + gap);
      const cy  = y  + gap + row * (cardH + gap) - this._scrollY;

      // Skip cards outside visible area
      if (cy + cardH < y || cy > y + PH) return;

      const owned    = player.ownedWeapons.has(w.id);
      const equipped = player.equippedWeaponId === w.id;
      const canBuy   = !owned && money >= w.price;
      const hover    = mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH;

      ctx.save();
      // Card background with gradient
      const cardGrad = ctx.createLinearGradient(cx, cy, cx, cy + cardH);
      if (equipped) {
        cardGrad.addColorStop(0, `rgba(${this._rgb(w.color)},0.22)`);
        cardGrad.addColorStop(1, `rgba(${this._rgb(w.color)},0.10)`);
      } else if (hover && (owned || canBuy)) {
        cardGrad.addColorStop(0, `rgba(${this._rgb(w.color)},0.12)`);
        cardGrad.addColorStop(1, `rgba(${this._rgb(w.color)},0.05)`);
      } else if (!owned && !canBuy) {
        cardGrad.addColorStop(0, 'rgba(15,15,20,0.7)');
        cardGrad.addColorStop(1, 'rgba(8,8,12,0.8)');
      } else {
        cardGrad.addColorStop(0, 'rgba(12,16,24,0.6)');
        cardGrad.addColorStop(1, 'rgba(6,10,16,0.7)');
      }

      let bdr = equipped ? w.color : owned ? 'rgba(255,255,255,0.18)' : canBuy ? `rgba(${this._rgb(w.color)},0.4)` : 'rgba(255,255,255,0.05)';
      if (hover && (owned || canBuy)) bdr = w.color;

      ctx.shadowColor = (equipped || (hover && (owned || canBuy))) ? w.color : 'transparent';
      ctx.shadowBlur  = equipped ? 22 : hover ? 12 : 0;
      ctx.fillStyle   = cardGrad; ctx.strokeStyle = bdr; ctx.lineWidth = equipped ? 2 : 1;
      this._rr(ctx, cx, cy, cardW, cardH, 10);
      ctx.fill(); ctx.stroke();

      // Top accent bar
      ctx.fillStyle = w.color + (equipped ? 'dd' : owned ? '66' : canBuy ? '44' : '18');
      ctx.beginPath();
      ctx.roundRect(cx + 15, cy + 5, cardW - 30, 3, 2);
      ctx.fill();

      // === SECTION 1: Weapon Name (top area) ===
      ctx.font = 'bold 13px Orbitron, monospace';
      ctx.fillStyle = equipped ? '#FFFFFF' : owned ? '#DDDDDD' : canBuy ? '#BBBBBB' : '#555555';
      ctx.shadowColor = equipped ? w.color : 'transparent';
      ctx.shadowBlur = equipped ? 10 : 0;
      ctx.textAlign = 'center';
      ctx.fillText(w.name, cx + cardW / 2, cy + 28);

      // === SECTION 2: Description (below name) ===
      ctx.shadowBlur = 0;
      ctx.font = '9px Rajdhani, monospace';
      ctx.fillStyle = equipped ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.35)';
      ctx.fillText(w.desc, cx + cardW / 2, cy + 44);

      // === SECTION 3: Weapon Icon (centered, main visual) ===
      const iconCenterY = cy + 78;
      this._drawRealisticWeapon(ctx, cx + cardW / 2, iconCenterY, w, owned || canBuy, equipped);

      // === SECTION 4: Stats Row (below icon) ===
      const statsY = cy + 118;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.roundRect(cx + 12, statsY, cardW - 24, 22, 4);
      ctx.fill();

      const eff = w.damage > 0 ? w.damage : '—';
      const rpm = w.fireRate > 0 ? Math.round(60000 / w.fireRate) : '—';
      const hasPellets = w.bullets > 1;
      const statActive = equipped || owned || canBuy;

      ctx.textAlign = 'center';
      if (hasPellets) {
        ctx.font = 'bold 9px Orbitron, monospace';
        ctx.fillStyle = statActive ? '#FF6666' : 'rgba(255,102,102,0.3)';
        ctx.fillText('DMG', cx + cardW * 0.18, statsY + 8);
        ctx.fillStyle = statActive ? '#FFFFFF' : 'rgba(255,255,255,0.3)';
        ctx.fillText(eff, cx + cardW * 0.18, statsY + 18);

        ctx.fillStyle = statActive ? '#66AAFF' : 'rgba(102,170,255,0.3)';
        ctx.fillText('RPM', cx + cardW * 0.5, statsY + 8);
        ctx.fillStyle = statActive ? '#FFFFFF' : 'rgba(255,255,255,0.3)';
        ctx.fillText(rpm, cx + cardW * 0.5, statsY + 18);

        ctx.fillStyle = statActive ? '#FFAA44' : 'rgba(255,170,68,0.3)';
        ctx.fillText('×' + w.bullets, cx + cardW * 0.82, statsY + 8);
        ctx.fillStyle = statActive ? '#FFFFFF' : 'rgba(255,255,255,0.3)';
        ctx.font = 'bold 8px Orbitron, monospace';
        ctx.fillText('PELLETS', cx + cardW * 0.82, statsY + 18);
      } else {
        ctx.font = 'bold 9px Orbitron, monospace';
        ctx.fillStyle = statActive ? '#FF6666' : 'rgba(255,102,102,0.3)';
        ctx.fillText('DMG', cx + cardW * 0.32, statsY + 8);
        ctx.fillStyle = statActive ? '#FFFFFF' : 'rgba(255,255,255,0.3)';
        ctx.font = 'bold 10px Orbitron, monospace';
        ctx.fillText(eff, cx + cardW * 0.32, statsY + 18);

        ctx.font = 'bold 9px Orbitron, monospace';
        ctx.fillStyle = statActive ? '#66AAFF' : 'rgba(102,170,255,0.3)';
        ctx.fillText('RPM', cx + cardW * 0.68, statsY + 8);
        ctx.fillStyle = statActive ? '#FFFFFF' : 'rgba(255,255,255,0.3)';
        ctx.font = 'bold 10px Orbitron, monospace';
        ctx.fillText(rpm, cx + cardW * 0.68, statsY + 18);
      }
      ctx.restore();

      // === SECTION 5: Action Button (bottom) ===
      const btnY = cy + cardH - 14;
      if (equipped) {
        ctx.save();
        ctx.fillStyle = `rgba(${this._rgb(w.color)},0.25)`;
        ctx.beginPath();
        ctx.roundRect(cx + cardW * 0.2, btnY - 10, cardW * 0.6, 20, 5);
        ctx.fill();
        ctx.font = 'bold 10px Orbitron, monospace';
        ctx.fillStyle = w.color;
        ctx.shadowColor = w.color;
        ctx.shadowBlur = 12;
        ctx.textAlign = 'center';
        ctx.fillText('✓ EQUIPPED', cx + cardW / 2, btnY + 3);
        ctx.restore();
      } else if (owned) {
        ctx.save();
        ctx.fillStyle = hover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)';
        ctx.strokeStyle = hover ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cx + cardW * 0.15, btnY - 10, cardW * 0.7, 20, 5);
        ctx.fill();
        ctx.stroke();
        ctx.font = '9px Orbitron, monospace';
        ctx.fillStyle = hover ? '#FFFFFF' : '#999999';
        ctx.textAlign = 'center';
        ctx.fillText('CLICK TO EQUIP', cx + cardW / 2, btnY + 3);
        ctx.restore();
        const cardVisible = cy >= y - 10 && cy + cardH <= y + PH + 10;
        if (cardVisible && hover) this._pushArea(cx, cy, cardW, cardH, (p) => { p.equipWeapon(w.id); this._msg(`${w.name} EQUIPPED`, w.color); });
      } else {
        ctx.save();
        ctx.fillStyle = canBuy ? (hover ? 'rgba(0,255,204,0.2)' : 'rgba(0,255,204,0.08)') : 'rgba(50,50,50,0.3)';
        ctx.beginPath();
        ctx.roundRect(cx + cardW * 0.12, btnY - 10, cardW * 0.76, 20, 5);
        ctx.fill();
        if (canBuy) {
          ctx.strokeStyle = hover ? '#00FFCC' : 'rgba(0,255,204,0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        // NEX icon for price
        if (w.price > 0) {
          if (canBuy) {
            this._renderNexIcon(ctx, cx + cardW * 0.28, btnY, 14, { animated: hover });
          } else {
            ctx.globalAlpha = 0.3;
            this._renderNexIcon(ctx, cx + cardW * 0.28, btnY, 14, { animated: false });
            ctx.globalAlpha = 1;
          }
          ctx.font = 'bold 11px Orbitron, monospace';
          ctx.fillStyle = canBuy ? (hover ? '#FFFFFF' : '#00FFCC') : '#444444';
          ctx.shadowColor = canBuy && hover ? '#00FFCC' : 'transparent';
          ctx.shadowBlur = canBuy && hover ? 12 : 0;
          ctx.textAlign = 'center';
          ctx.fillText(`${w.price.toLocaleString()} NEX`, cx + cardW / 2 + 12, btnY + 3);
        } else {
          ctx.font = 'bold 11px Orbitron, monospace';
          ctx.fillStyle = '#44FF88';
          ctx.shadowColor = '#44FF88';
          ctx.shadowBlur = 8;
          ctx.textAlign = 'center';
          ctx.fillText('FREE', cx + cardW / 2, btnY + 3);
        }
        ctx.restore();
        const cardVisible2 = cy >= y - 10 && cy + cardH <= y + PH + 10;
        if (canBuy && cardVisible2) {
          this._pushArea(cx, cy, cardW, cardH, (p, g) => {
            const effectivePrice = Math.round(w.price * (1 - (g._shopDiscount || 0)));
            if (g.money >= effectivePrice) {
              g.money -= effectivePrice;
              p.ownedWeapons.add(w.id);
              p.equipWeapon(w.id);
              window.audio?.buy();
              this._msg(`${w.name} PURCHASED!`, w.color);
            } else { this._msg('NOT ENOUGH MONEY', '#FF4466'); }
          });
        }
      }
      ctx.restore();
    });

    // Scrollbar
    if (this._maxScrollY > 0) {
      const sbX = px + PW - 12;
      const trackH = PH - 6;
      const thumbH = Math.max(35, trackH * (PH / totalH));
      const thumbY = y + 3 + (this._scrollY / this._maxScrollY) * (trackH - thumbH);
      ctx.fillStyle = 'rgba(68,238,255,0.06)';
      ctx.beginPath();
      ctx.roundRect(sbX, y + 3, 6, trackH, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(68,238,255,0.45)';
      ctx.beginPath();
      ctx.roundRect(sbX, thumbY, 6, thumbH, 3);
      ctx.fill();
    }

    // Hint
    ctx.save();
    ctx.font = '9px Orbitron, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.textAlign = 'center';
    ctx.fillText(this._maxScrollY > 0 ? 'SCROLL to see all weapons' : '', px + PW / 2, y + PH - 6);
    ctx.restore();
  }

  // ── Grenades tab ─────────────────────────────────────────────────────────────
  _drawGrenades(ctx, px, y, PW, PH, grenadeCount, money, mx, my) {
    const gc = CONFIG.GRENADE;
    const cx = px + PW / 2;
    const t = performance.now() / 1000;

    // Background panel for grenade display
    ctx.save();
    const panelGrad = ctx.createLinearGradient(cx - 150, y + 20, cx + 150, y + 140);
    panelGrad.addColorStop(0, 'rgba(255,136,0,0.05)');
    panelGrad.addColorStop(0.5, 'rgba(255,136,0,0.08)');
    panelGrad.addColorStop(1, 'rgba(255,136,0,0.05)');
    ctx.fillStyle = panelGrad;
    this._rr(ctx, cx - 150, y + 20, 300, 130, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,136,0,0.2)'; ctx.lineWidth = 1;
    this._rr(ctx, cx - 150, y + 20, 300, 130, 12);
    ctx.stroke();
    ctx.restore();

    // Animated grenade art
    ctx.save();
    const bounce = Math.sin(t * 2) * 3;
    ctx.translate(cx, y + 75 + bounce);

    // Outer glow ring
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(t * 3) * 0.15;
    ctx.strokeStyle = '#FF8800'; ctx.lineWidth = 2;
    ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 25;
    ctx.beginPath(); ctx.ellipse(0, 0, 45, 35, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // Grenade body with gradient
    const grenadeGrad = ctx.createRadialGradient(-8, -8, 0, 0, 0, 35);
    grenadeGrad.addColorStop(0, '#5a8c5a');
    grenadeGrad.addColorStop(0.5, '#3a5c3a');
    grenadeGrad.addColorStop(1, '#2a3c2a');
    ctx.fillStyle = grenadeGrad;
    ctx.strokeStyle = '#88CC88'; ctx.lineWidth = 2.5;
    ctx.shadowColor = '#44FF88'; ctx.shadowBlur = 25;
    ctx.beginPath(); ctx.ellipse(0, 0, 36, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // Grid pattern on grenade
    ctx.strokeStyle = 'rgba(136,204,136,0.3)'; ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(i * 10, -25); ctx.lineTo(i * 10, 25); ctx.stroke();
    }
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(-30, i * 8); ctx.lineTo(30, i * 8); ctx.stroke();
    }

    // Pin/trigger with glow
    ctx.shadowBlur = 0;
    const pinGrad = ctx.createRadialGradient(0, -32, 0, 0, -32, 10);
    pinGrad.addColorStop(0, '#FF6600');
    pinGrad.addColorStop(1, '#CC3300');
    ctx.fillStyle = pinGrad;
    ctx.shadowColor = '#FF4400'; ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.arc(0, -32, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FF8800'; ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label
    ctx.font = 'bold 13px Orbitron, monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.shadowColor = '#44FF88'; ctx.shadowBlur = 8;
    ctx.fillText('FRAG', 0, 5);
    ctx.restore();

    // Stats with color coding - better spacing, moved down from FRAG image
    ctx.save();
    ctx.font = '11px Orbitron, monospace'; ctx.textAlign = 'center';
    const statY = y + 175;
    ctx.fillStyle = '#FF4466';
    ctx.fillText('DMG', cx - 100, statY);
    ctx.fillStyle = '#fff';
    ctx.fillText(`${gc.damage}`, cx - 65, statY);
    ctx.fillStyle = '#44EEFF';
    ctx.fillText('RADIUS', cx - 5, statY);
    ctx.fillStyle = '#fff';
    ctx.fillText(`${gc.blastRadius}px`, cx + 55, statY);
    ctx.fillStyle = '#FF8800';
    ctx.fillText('FUSE', cx + 110, statY);
    ctx.fillStyle = '#fff';
    ctx.fillText(`${gc.fuseTime}s`, cx + 145, statY);
    ctx.restore();

    // Instructions - adjusted for new stats position
    ctx.save();
    ctx.font = '11px Rajdhani, monospace'; ctx.fillStyle = 'rgba(255,136,0,0.8)';
    ctx.textAlign = 'center';
    ctx.fillText('Press [ G ] to throw toward mouse cursor', cx, y + 200);
    ctx.restore();

    // Current count display - adjusted position
    ctx.save();
    ctx.font = 'bold 22px Orbitron, monospace'; ctx.fillStyle = '#FF8800';
    ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 20; ctx.textAlign = 'center';
    ctx.fillText(`INVENTORY:  ${grenadeCount}`, cx, y + 235);
    ctx.shadowBlur = 0; ctx.restore();

    // Buy buttons with improved styling - adjusted position
    const btnDefs = [
      { qty: 1, price: gc.price },
      { qty: 5, price: gc.price * 4, deal: true },
    ];
    btnDefs.forEach((btn, bi) => {
      const bw = 300, bh = 50;
      const bx = cx - bw / 2;
      const by2 = y + 265 + bi * (bh + 18);
      const canBuy = money >= btn.price;
      const hover  = mx >= bx && mx <= bx + bw && my >= by2 && my <= by2 + bh;

      ctx.save();
      // Button gradient background
      const btnGrad = ctx.createLinearGradient(bx, by2, bx, by2 + bh);
      if (canBuy && hover) {
        btnGrad.addColorStop(0, 'rgba(255,136,0,0.35)');
        btnGrad.addColorStop(1, 'rgba(255,136,0,0.15)');
      } else if (canBuy) {
        btnGrad.addColorStop(0, 'rgba(255,136,0,0.15)');
        btnGrad.addColorStop(1, 'rgba(255,136,0,0.05)');
      } else {
        btnGrad.addColorStop(0, 'rgba(40,40,40,0.5)');
        btnGrad.addColorStop(1, 'rgba(20,20,20,0.6)');
      }
      ctx.fillStyle = btnGrad;
      ctx.strokeStyle = canBuy ? (hover ? '#FF8800' : 'rgba(255,136,0,0.5)') : 'rgba(80,80,80,0.25)';
      ctx.shadowColor = canBuy && hover ? '#FF8800' : 'transparent';
      ctx.shadowBlur  = canBuy && hover ? 20 : 0;
      ctx.lineWidth   = canBuy ? 1.5 : 1;
      this._rr(ctx, bx, by2, bw, bh, 10);
      ctx.fill(); ctx.stroke();

      // Quantity text
      ctx.font = 'bold 13px Orbitron, monospace'; ctx.textAlign = 'left';
      ctx.fillStyle = canBuy ? (hover ? '#fff' : '#FF8800') : '#444';
      ctx.shadowBlur = 0;
      ctx.fillText(`${btn.qty} GRENADE${btn.qty > 1 ? 'S' : ''}`, bx + 20, by2 + bh / 2 + 5);

      // Deal badge
      if (btn.deal) {
        ctx.save();
        ctx.fillStyle = canBuy ? '#44FF88' : '#333';
        ctx.shadowColor = canBuy ? '#44FF88' : 'transparent'; ctx.shadowBlur = canBuy ? 8 : 0;
        ctx.font = 'bold 9px Orbitron, monospace';
        ctx.fillText('SAVE 20%', bx + 135, by2 + bh / 2 + 4);
        ctx.restore();
      }

      // Price with full NEX icon
      if (canBuy) {
        this._renderNexIcon(ctx, bx + bw - 100, by2 + bh / 2, 18, { animated: hover });
      } else {
        ctx.globalAlpha = 0.3;
        this._renderNexIcon(ctx, bx + bw - 100, by2 + bh / 2, 18, { animated: false });
        ctx.globalAlpha = 1;
      }
      ctx.font = 'bold 13px Orbitron, monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = canBuy ? (hover ? '#fff' : '#00FFCC') : '#444';
      ctx.shadowColor = canBuy && hover ? '#00FFCC' : 'transparent';
      ctx.shadowBlur = canBuy && hover ? 12 : 0;
      ctx.fillText(`${btn.price.toLocaleString()} NEX`, bx + bw - 20, by2 + bh / 2 + 5);
      ctx.restore();

      if (canBuy) {
        this._pushArea(bx, by2, bw, bh, (p, g) => {
          if (g.money >= btn.price) {
            g.money -= btn.price;
            g._grenadeCount += btn.qty;
            window.audio?.buy();
            this._msg(`+${btn.qty} GRENADE${btn.qty > 1 ? 'S' : ''}!`, '#44FF88');
          } else { this._msg('NOT ENOUGH MONEY', '#FF4466'); }
        });
      }
    });
  }
}

// ── CasinoManager ─────────────────────────────────────────────────────────────
class CasinoManager {
  constructor() {
    this.isOpen         = false;
    this._areas         = [];
    this._feedback      = null;
    this._spinning      = false;
    this._spinTimer     = 0;
    this._spinResult    = null;   // 'WIN' | 'LOSE' | null
    this._pendingPayout = null;   // set when spin resolves; game.js picks this up
    this._bet           = 500;
    this._lastBet       = 500;
    this._spinT         = 0;
    this._sym1 = 0; this._sym2 = 1; this._sym3 = 2;
  }

  open()  { this.isOpen = true;  this._areas = []; }
  close() { this.isOpen = false; this._areas = []; }

  update(dt) {
    if (this._feedback) { this._feedback.t -= dt; if (this._feedback.t <= 0) this._feedback = null; }
    if (this._spinning) {
      this._spinTimer -= dt;
      this._spinT     += dt * 14;
      if (this._spinTimer <= 0) {
        this._spinning = false;
        const win = Math.random() < 0.46;
        this._spinResult    = win ? 'WIN' : 'LOSE';
        this._pendingPayout = win ? this._lastBet * 2 : 0;
        this._sym1 = win ? 6 : Math.floor(Math.random() * 6);
        this._sym2 = win ? 6 : Math.floor(Math.random() * 5);
        this._sym3 = win ? 6 : Math.floor(Math.random() * 4);
      }
    }
  }

  handleClick(sx, sy, player, gameRef) {
    if (!this.isOpen) return false;
    for (const a of this._areas) {
      if (sx >= a.x && sx <= a.x + a.w && sy >= a.y && sy <= a.y + a.h) {
        a.action(player, gameRef); return true;
      }
    }
    return true;
  }

  _pushArea(x, y, w, h, fn) { this._areas.push({ x, y, w, h, action: fn }); }
  _msg(text, color = '#FFD700') { this._feedback = { msg: text, color, t: 2.2 }; }

  render(ctx, W, H, player, money, mx, my) {
    if (!this.isOpen) return;
    this._areas = [];

    const PW = Math.min(660, W - 40);
    const PH = Math.min(500, H - 50);
    const px = (W - PW) / 2, py = (H - PH) / 2;
    const cx = px + PW / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(0, 0, W, H);

    // Panel
    ctx.save();
    ctx.shadowColor = '#FF44AA'; ctx.shadowBlur = 45;
    ctx.fillStyle = '#08050f'; ctx.strokeStyle = 'rgba(255,68,170,0.65)'; ctx.lineWidth = 1.8;
    this._rr(ctx, px, py, PW, PH, 14); ctx.fill(); ctx.stroke();
    ctx.restore();

    // Top gradient stripe
    ctx.save();
    const grd = ctx.createLinearGradient(px, py, px, py + 70);
    grd.addColorStop(0, 'rgba(255,68,170,0.12)'); grd.addColorStop(1, 'rgba(255,68,170,0)');
    ctx.fillStyle = grd; this._rr(ctx, px, py, PW, 70, 14); ctx.fill();
    ctx.restore();

    // Title
    ctx.save();
    ctx.font = 'bold 24px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.shadowColor = '#FF44AA'; ctx.shadowBlur = 20; ctx.fillStyle = '#fff';
    ctx.fillText('🎰  CASINO', cx, py + 38);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,68,170,0.18)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 24, py + 54); ctx.lineTo(px + PW - 24, py + 54); ctx.stroke();

    // Balance
    ctx.save();
    ctx.font = 'bold 15px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = '#00FFCC'; ctx.shadowColor = '#00FFCC'; ctx.shadowBlur = 10;
    ctx.fillText(`BALANCE: ⬢${money.toLocaleString()} NEX`, cx, py + 72);
    ctx.restore();

    // ── Slot machine ─────────────────────────────────────────
    const slotY = py + 88;
    const slotW = 260, slotH = 82;
    const slotX = cx - slotW / 2;
    const symbols = ['7','♦','♣','★','♥','⬢','🍀'];

    ctx.save();
    ctx.fillStyle = '#0a0014'; ctx.strokeStyle = '#FF44AA'; ctx.lineWidth = 2;
    this._rr(ctx, slotX, slotY, slotW, slotH, 10); ctx.fill(); ctx.stroke();

    // Dividers
    ctx.strokeStyle = 'rgba(255,68,170,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(slotX + slotW/3,     slotY + 4); ctx.lineTo(slotX + slotW/3,     slotY + slotH - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(slotX + slotW*2/3, slotY + 4); ctx.lineTo(slotX + slotW*2/3, slotY + slotH - 4); ctx.stroke();

    const smy = slotY + slotH / 2 + 16;
    ctx.font = 'bold 36px monospace'; ctx.textAlign = 'center';
    if (this._spinning) {
      const t = this._spinT;
      ctx.fillStyle = '#FF44AA'; ctx.shadowColor = '#FF44AA'; ctx.shadowBlur = 14;
      ctx.fillText(symbols[Math.floor(t*3)    % symbols.length], slotX + slotW/6,   smy);
      ctx.fillText(symbols[Math.floor(t*4+2)  % symbols.length], slotX + slotW/2,   smy);
      ctx.fillText(symbols[Math.floor(t*5+4)  % symbols.length], slotX + slotW*5/6, smy);
    } else if (this._spinResult === 'WIN') {
      ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 22;
      ctx.fillText('7', slotX + slotW/6,   smy);
      ctx.fillText('7', slotX + slotW/2,   smy);
      ctx.fillText('7', slotX + slotW*5/6, smy);
    } else if (this._spinResult === 'LOSE') {
      ctx.fillStyle = '#666'; ctx.shadowBlur = 0;
      ctx.fillText(symbols[this._sym1], slotX + slotW/6,   smy);
      ctx.fillText(symbols[this._sym2], slotX + slotW/2,   smy);
      ctx.fillText(symbols[this._sym3], slotX + slotW*5/6, smy);
    } else {
      ctx.fillStyle = 'rgba(255,68,170,0.35)'; ctx.shadowBlur = 0;
      ctx.fillText('?', slotX + slotW/6,   smy);
      ctx.fillText('?', slotX + slotW/2,   smy);
      ctx.fillText('?', slotX + slotW*5/6, smy);
    }
    ctx.restore();

    // ── Bet selector ─────────────────────────────────────────
    const bets = [100, 500, 2000, 5000];
    const betLabelY = slotY + slotH + 22;
    ctx.save();
    ctx.font = '10px Orbitron, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.textAlign = 'center';
    ctx.fillText('SELECT BET', cx, betLabelY);
    ctx.restore();

    bets.forEach((bet, i) => {
      const bw = (PW - 64) / bets.length - 8;
      const bx2 = px + 32 + i * (bw + 8), by2 = betLabelY + 8, bh2 = 34;
      const sel = this._bet === bet, hov = mx >= bx2 && mx <= bx2 + bw && my >= by2 && my <= by2 + bh2;
      ctx.save();
      ctx.fillStyle   = sel ? 'rgba(255,68,170,0.28)' : hov ? 'rgba(255,68,170,0.1)' : 'rgba(18,8,28,0.8)';
      ctx.strokeStyle = sel ? '#FF44AA' : hov ? 'rgba(255,68,170,0.5)' : 'rgba(255,255,255,0.08)';
      ctx.lineWidth = sel ? 1.5 : 1;
      this._rr(ctx, bx2, by2, bw, bh2, 6); ctx.fill(); ctx.stroke();
      ctx.font = `bold ${sel ? 11 : 10}px Orbitron, monospace`;
      ctx.fillStyle = sel ? '#FF44AA' : hov ? '#fff' : '#777';
      ctx.textAlign = 'center';
      ctx.fillText(`⬢${bet.toLocaleString()}`, bx2 + bw / 2, by2 + bh2 / 2 + 4);
      ctx.restore();
      this._pushArea(bx2, by2, bw, bh2, () => { this._bet = bet; });
    });

    // ── Spin button ───────────────────────────────────────────
    const spinY = betLabelY + 8 + 34 + 14;
    const spinW = 200, spinH = 50;
    const spinX = cx - spinW / 2;
    const canSpin = !this._spinning && money >= this._bet;
    const spinHov = mx >= spinX && mx <= spinX + spinW && my >= spinY && my <= spinY + spinH;
    ctx.save();
    ctx.fillStyle   = canSpin ? (spinHov ? 'rgba(255,68,170,0.32)' : 'rgba(255,68,170,0.16)') : 'rgba(28,18,38,0.7)';
    ctx.strokeStyle = canSpin ? (spinHov ? '#FF44AA' : 'rgba(255,68,170,0.5)')             : 'rgba(60,40,70,0.4)';
    ctx.shadowColor = canSpin && spinHov ? '#FF44AA' : 'transparent';
    ctx.shadowBlur  = canSpin && spinHov ? 22 : 0;
    ctx.lineWidth = 2;
    this._rr(ctx, spinX, spinY, spinW, spinH, 9); ctx.fill(); ctx.stroke();
    ctx.font = 'bold 15px Orbitron, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = canSpin ? '#fff' : '#444'; ctx.shadowBlur = 0;
    ctx.fillText(this._spinning ? 'SPINNING...' : '🎰  SPIN', cx, spinY + spinH / 2);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
    if (canSpin) {
      this._pushArea(spinX, spinY, spinW, spinH, (p, g) => {
        if (g.money >= this._bet) {
          g.money -= this._bet;
          this._lastBet = this._bet;
          this._spinning = true; this._spinTimer = 1.6 + Math.random() * 0.8;
          this._spinT = 0; this._spinResult = null; this._pendingPayout = null;
        } else { this._msg('NOT ENOUGH MONEY!', '#FF4466'); }
      });
    }

    // Result display
    if (!this._spinning && this._spinResult) {
      const isWin = this._spinResult === 'WIN';
      ctx.save();
      ctx.font = 'bold 20px Orbitron, monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = isWin ? '#00FFCC' : '#FF4466';
      ctx.shadowColor = isWin ? '#00FFCC' : '#FF4466'; ctx.shadowBlur = 16;
      ctx.fillText(
        isWin ? `JACKPOT! +⬢${(this._lastBet * 2).toLocaleString()}` : `NO LUCK — LOST ⬢${this._lastBet.toLocaleString()}`,
        cx, spinY + spinH + 32
      );
      ctx.restore();
    }

    // Feedback
    if (this._feedback) {
      const alpha = Math.min(1, this._feedback.t / 0.6);
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.font = 'bold 14px Orbitron, monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = this._feedback.color; ctx.shadowColor = this._feedback.color; ctx.shadowBlur = 14;
      ctx.fillText(this._feedback.msg, cx, py + PH - 16);
      ctx.restore();
    }

    // Close button
    const clx = px + PW - 22, cly = py + 22, clr = 15;
    const clHov = Math.hypot(mx - clx, my - cly) < clr + 4;
    ctx.save();
    ctx.strokeStyle = clHov ? '#FF44AA' : 'rgba(255,68,170,0.5)';
    ctx.shadowColor = clHov ? '#FF44AA' : 'transparent'; ctx.shadowBlur = clHov ? 14 : 0;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(clx, cly, clr, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = clHov ? '#FF44AA' : 'rgba(255,68,170,0.7)';
    ctx.font = 'bold 18px Orbitron, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('×', clx, cly); ctx.textBaseline = 'alphabetic';
    ctx.restore();
    this._pushArea(clx - clr - 4, cly - clr - 4, (clr + 4) * 2, (clr + 4) * 2, () => this.close());

    ctx.save();
    ctx.font = '10px Orbitron, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.textAlign = 'right';
    ctx.fillText('[T] or [ESC] CLOSE', px + PW - 22, py + PH - 16);
    ctx.restore();
  }

  _rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
}

// ─────────────────────────────────────────────────────────────────────────────
// BuildingShopManager  — interactive purchase menu for all 24 building types
// ─────────────────────────────────────────────────────────────────────────────
class BuildingShopManager {
  constructor() {
    this.isOpen    = false;
    this._bType    = 0;
    this._areas    = [];
    this._feedback = null;
  }

  open(buildingType) {
    this.isOpen = true;
    this._bType = buildingType ?? 0;
    this._areas = [];
  }
  close()  { this.isOpen = false; this._areas = []; }
  toggle(t){ this.isOpen ? this.close() : this.open(t); }

  update(dt) {
    if (this._feedback) { this._feedback.t -= dt; if (this._feedback.t <= 0) this._feedback = null; }
  }

  handleClick(sx, sy, player, gameRef) {
    if (!this.isOpen) return false;
    for (const a of this._areas) {
      if (sx >= a.x && sx <= a.x + a.w && sy >= a.y && sy <= a.y + a.h) {
        a.action(player, gameRef);
        return true;
      }
    }
    return true;
  }

  _msg(text, color = '#44FF88') { this._feedback = { msg: text, color, t: 2.0 }; }

  // ═══ NEX CURRENCY ICON HELPERS ═══════════════════════════════════════════════
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

  _drawN(ctx, x, y, w, h) {
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y);
  }

  _renderNexIcon(ctx, x, y, size, opts = {}) {
    const animated = opts.animated !== false;
    const t = animated ? performance.now() / 1000 : 0;
    const r = size / 2;

    ctx.save();
    const pulse = animated ? Math.sin(t * 2.5) * 0.3 + 0.7 : 1;
    const energyPulse = animated ? Math.sin(t * 4) * 0.5 + 0.5 : 0.5;

    // Outer rotating ring
    if (animated) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 0.3);
      ctx.strokeStyle = `rgba(0,229,255,${0.25 + pulse * 0.15})`;
      ctx.lineWidth = Math.max(1, size / 20);
      ctx.setLineDash([size / 8, size / 5]);
      ctx.beginPath();
      ctx.arc(0, 0, r + size / 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Hexagon frame
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 12 * pulse * (size / 32);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = Math.max(1.5, size / 16);
    ctx.fillStyle = 'rgba(0,10,20,0.85)';
    this._drawHexagon(ctx, x, y, r);
    ctx.fill();
    ctx.stroke();

    // Inner hexagon
    ctx.shadowBlur = 4 * (size / 32);
    ctx.strokeStyle = 'rgba(0,229,255,0.4)';
    ctx.lineWidth = Math.max(0.8, size / 32);
    this._drawHexagon(ctx, x, y, r * 0.75);
    ctx.stroke();

    // The N letter
    const nW = r * 0.7, nH = r * 0.9;
    const nX = x - nW / 2, nY = y - nH / 2;
    const strokeW = Math.max(2, size / 12);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // N glow
    ctx.shadowBlur = (10 + energyPulse * 4) * (size / 32);
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = strokeW;
    this._drawN(ctx, nX, nY, nW, nH);
    ctx.stroke();

    // N bright core
    ctx.shadowBlur = 4 * (size / 32);
    ctx.strokeStyle = `rgba(180,255,255,${0.6 + energyPulse * 0.4})`;
    ctx.lineWidth = strokeW * 0.4;
    this._drawN(ctx, nX, nY, nW, nH);
    ctx.stroke();

    // Energy nodes
    ctx.shadowBlur = 6 * (size / 32);
    ctx.fillStyle = `rgba(0,229,255,${0.7 + energyPulse * 0.3})`;
    const nodeR = Math.max(1.2, size / 18);
    [[nX, nY], [nX, nY + nH], [nX + nW, nY], [nX + nW, nY + nH]].forEach(([nx, ny]) => {
      ctx.beginPath();
      ctx.arc(nx, ny, nodeR, 0, Math.PI * 2);
      ctx.fill();
    });

    // Pulse ring
    if (animated) {
      const ringPhase = (t * 1.2) % 1;
      ctx.strokeStyle = `rgba(0,229,255,${(1 - ringPhase) * 0.3})`;
      ctx.lineWidth = Math.max(0.8, size / 32);
      ctx.shadowBlur = 3;
      this._drawHexagon(ctx, x, y, r * 0.5 + ringPhase * r * 0.6);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── Apply a single effect object to the player/game ──────────────────────
  _applyEffect(eff, player, gameRef) {
    if (!eff) return;
    switch (eff.type) {
      case 'heal':
        player.health = Math.min(player.maxHealth, player.health + (eff.amount || 40));
        this._msg(`+${eff.amount} HP!`, '#44FF88');
        break;
      case 'healFull':
        player.health = player.maxHealth;
        this._msg('FULLY HEALED!', '#44FF88');
        break;
      case 'buff': {
        const b = Object.assign({}, eff);  // copy
        b.remaining = b.duration || 10;
        b.maxDur    = b.remaining;
        player._buffs.set(eff.id, b);
        this._msg(`${eff.name} ACTIVE (${eff.duration}s)!`, eff.color || '#44EEFF');
        break;
      }
      case 'money':
        gameRef.money += eff.amount || 0;
        this._msg(`+${eff.amount} NEX!`, '#00FFCC');
        break;
      case 'moneyHack': {
        const gain = (gameRef.wave || 1) * 120;
        gameRef.money += gain;
        this._msg(`HACK: +${gain} NEX!`, '#00FF88');
        break;
      }
      case 'loan':
        gameRef.money += eff.give || 0;
        gameRef._loanDebt = (gameRef._loanDebt || 0) + (eff.debt || 0);
        this._msg(`BORROWED ${eff.give} NEX! Owes ${eff.debt}`, '#FFCC00');
        break;
      case 'grenades':
        gameRef._grenadeCount = Math.min(9, (gameRef._grenadeCount || 0) + (eff.amount || 1));
        this._msg(`+${eff.amount} GRENADES!`, '#FF8800');
        break;
      case 'perm':
        switch (eff.stat) {
          case 'health':   player.maxHealth += eff.amount; player.health = Math.min(player.health + eff.amount, player.maxHealth); break;
          case 'speed':    player.speed     += eff.amount; break;
          case 'damage':   player.damageMult = Math.round((player.damageMult + eff.amount) * 100) / 100; break;
          case 'armor':    player.armor      = Math.min(0.75, player.armor + eff.amount); break;
          case 'fireRate': player.fireRateMult = Math.max(0.15, player.fireRateMult * (eff.amount || 0.95)); break;
        }
        this._msg('PERMANENT UPGRADE!', '#FFD700');
        break;
      case 'permRandom': {
        const perms = ['health','speed','damage','armor'];
        const chosen = perms[Math.floor(Math.random() * perms.length)];
        const vals   = { health:20, speed:10, damage:0.08, armor:0.06 };
        this._applyEffect({ type:'perm', stat:chosen, amount:vals[chosen] }, player, gameRef);
        this._msg(`MUTATION: ${chosen.toUpperCase()} UP!`, '#55FF99');
        break;
      }
      case 'clearWanted':
        gameRef._wantedLevel = 0;
        gameRef._wantedKills = 0;
        this._msg('WANTED LEVEL CLEARED!', '#4477FF');
        break;
      case 'invincible':
        player.invincible = eff.duration || 3;
        this._msg(`INVINCIBLE ${eff.duration}s!`, '#FFDD00');
        break;
      case 'bodyguard':
        if (gameRef._bodyguards && gameRef._bodyguards.length < 2) {
          const { Bodyguard } = window; // access from global scope via game
          gameRef._spawnBodyguard && gameRef._spawnBodyguard();
          this._msg('BODYGUARD HIRED!', '#44FF88');
        } else { this._msg('ALREADY HAVE MAX GUARDS', '#FF4444'); return false; }
        break;
      case 'randomWeapon': {
        const all = CONFIG.WEAPONS.filter(w => !player.ownedWeapons.has(w.id));
        if (all.length === 0) { this._msg('YOU HAVE ALL WEAPONS!', '#FFDD00'); return false; }
        const w = all[Math.floor(Math.random() * all.length)];
        player.ownedWeapons.add(w.id);
        player.equipWeapon(w.id);
        this._msg(`GOT: ${w.id.toUpperCase()}!`, '#44EEFF');
        break;
      }
      case 'random': {
        const opts = [
          { type:'heal', amount:60 },
          { type:'buff', id:'rnd_spd', name:'LUCKY SPEED', icon:'🎲', color:'#FFDD44', duration:15, speedAdd:80 },
          { type:'buff', id:'rnd_dmg', name:'LUCKY DMG',   icon:'🎲', color:'#FF4444', duration:15, dmgMult:1.4 },
          { type:'money', amount:500 },
          { type:'money', amount:-200 },
        ];
        this._applyEffect(opts[Math.floor(Math.random() * opts.length)], player, gameRef);
        break;
      }
      case 'heist': {
        if (Math.random() < 0.5) {
          gameRef.money += 1500;
          this._msg('HEIST SUCCESS! +$1500', '#FFD700');
        } else {
          gameRef.money = Math.max(0, gameRef.money - 400);
          this._msg('CAUGHT! -$400', '#FF4444');
        }
        break;
      }
      case 'repairVehicle':
        if (gameRef._playerVehicle) {
          gameRef._playerVehicle.hp = gameRef._playerVehicle.maxHp;
          this._msg('VEHICLE REPAIRED!', '#44FFCC');
        } else { this._msg('NO VEHICLE TO REPAIR', '#FF4444'); return false; }
        break;
      case 'escape': {
        player.invincible = 5;
        const rp = gameRef.map.randomRoadPos();
        player.x = rp.x; player.y = rp.y;
        gameRef._indoor = null;
        gameRef._indoorBots = []; gameRef._indoorBullets = []; gameRef._indoorPickups = [];
        this._msg('ESCAPED!', '#44AAFF');
        break;
      }
      case 'penthouse': {
        player.health = player.maxHealth;
        const bigBuff = { type:'buff', id:'pent', name:'PENTHOUSE', icon:'🌟', color:'#CC66FF', duration:15, speedAdd:40, dmgMult:1.2, fireMult:0.75, armorAdd:0.20 };
        this._applyEffect(bigBuff, player, gameRef);
        this._msg('PENTHOUSE PACKAGE!', '#CC66FF');
        break;
      }
      case 'multi':
        for (const sub of (eff.effects || [])) this._applyEffect(sub, player, gameRef);
        break;
    }
    return true;
  }

  // ── Main render ─────────────────────────────────────────────────────────
  render(ctx, W, H, player, money, mx, my) {
    if (!this.isOpen) return;
    this._areas = [];
    const cfg = CONFIG.BUILDING_INTERACTIONS[this._bType] || CONFIG.BUILDING_INTERACTIONS[0];
    const PW  = Math.min(640, W - 40);
    const PH  = Math.min(480, H - 50);
    const px  = (W - PW) / 2;
    const py  = (H - PH) / 2;
    const nc  = cfg.npcColor;
    const t   = performance.now() / 1000;

    // Neon City primary colors
    const PRIMARY = '#44EEFF';      // Cyan
    const SECONDARY = '#FF4466';    // Pink
    const ACCENT = '#44FF88';       // Green

    // Dim backdrop with subtle gradient
    ctx.save();
    const bgGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W, H) * 0.7);
    bgGrad.addColorStop(0, 'rgba(10,15,30,0.92)');
    bgGrad.addColorStop(1, 'rgba(0,0,0,0.95)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Animated scanlines
    ctx.save();
    ctx.globalAlpha = 0.025;
    for (let i = 0; i < H; i += 4) {
      const offset = Math.sin(t * 0.5 + i * 0.01) * 2;
      ctx.fillStyle = i % 8 === 0 ? PRIMARY : '#000';
      ctx.fillRect(0, i + offset, W, 1);
    }
    ctx.restore();

    // Panel with neon glow
    ctx.save();
    ctx.shadowColor = nc; ctx.shadowBlur = 45;
    ctx.fillStyle = '#06060e';
    ctx.strokeStyle = `rgba(${this._hexToRgb(nc)},0.7)`;
    ctx.lineWidth = 2;
    this._rr(ctx, px, py, PW, PH, 14); ctx.fill(); ctx.stroke();
    ctx.restore();

    // Inner panel border
    ctx.save();
    ctx.strokeStyle = `rgba(${this._hexToRgb(nc)},0.15)`;
    ctx.lineWidth = 1;
    this._rr(ctx, px + 4, py + 4, PW - 8, PH - 8, 10);
    ctx.stroke();
    ctx.restore();

    // Top gradient stripe
    ctx.save();
    const tg = ctx.createLinearGradient(px, py, px, py + 70);
    tg.addColorStop(0, `rgba(${this._hexToRgb(nc)},0.15)`);
    tg.addColorStop(0.5, `rgba(${this._hexToRgb(nc)},0.05)`);
    tg.addColorStop(1, `rgba(${this._hexToRgb(nc)},0)`);
    ctx.fillStyle = tg; this._rr(ctx, px, py, PW, 70, 14); ctx.fill();
    ctx.restore();

    // Corner accents
    this._corners(ctx, px, py, PW, PH, nc);

    // NEX icon on left
    this._renderNexIcon(ctx, px + 38, py + 38, 36, { animated: true });

    // NPC avatar with glow
    ctx.save();
    ctx.shadowColor = nc; ctx.shadowBlur = 25;
    ctx.strokeStyle = nc; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px + 90, py + 38, 22, 0, Math.PI * 2); ctx.stroke();
    // Face
    const faceGrad = ctx.createRadialGradient(px + 88, py + 32, 0, px + 90, py + 38, 22);
    faceGrad.addColorStop(0, '#FFE4C4');
    faceGrad.addColorStop(1, '#D4A574');
    ctx.fillStyle = faceGrad;
    ctx.beginPath(); ctx.arc(px + 90, py + 32, 13, 0, Math.PI * 2); ctx.fill();
    // Body
    ctx.fillStyle = nc;
    ctx.beginPath(); ctx.arc(px + 90, py + 48, 12, Math.PI, 0); ctx.fill();
    ctx.restore();

    // Title with glow
    ctx.save();
    ctx.font = 'bold 18px Orbitron, monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = '#fff'; ctx.shadowColor = nc; ctx.shadowBlur = 18;
    ctx.fillText(cfg.npcName, px + 125, py + 32);
    ctx.font = '11px Rajdhani, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.shadowBlur = 0;
    ctx.fillText(cfg.dialogue, px + 125, py + 52);
    ctx.restore();

    // Divider with gradient
    ctx.save();
    const divGrad = ctx.createLinearGradient(px + 16, 0, px + PW - 16, 0);
    divGrad.addColorStop(0, `rgba(${this._hexToRgb(nc)},0)`);
    divGrad.addColorStop(0.2, `rgba(${this._hexToRgb(nc)},0.4)`);
    divGrad.addColorStop(0.5, `rgba(${this._hexToRgb(nc)},0.6)`);
    divGrad.addColorStop(0.8, `rgba(${this._hexToRgb(nc)},0.4)`);
    divGrad.addColorStop(1, `rgba(${this._hexToRgb(nc)},0)`);
    ctx.strokeStyle = divGrad; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 16, py + 72); ctx.lineTo(px + PW - 16, py + 72); ctx.stroke();
    ctx.restore();

    // Balance display with NEX icon
    ctx.save();
    this._renderNexIcon(ctx, px + PW - 100, py + 45, 20, { animated: true });
    ctx.font = 'bold 14px Orbitron, monospace'; ctx.textAlign = 'right';
    ctx.fillStyle = '#00FFCC'; ctx.shadowColor = '#00FFCC'; ctx.shadowBlur = 12;
    ctx.fillText(`${money.toLocaleString()} NEX`, px + PW - 20, py + 50);
    ctx.restore();

    // Items
    const ITEM_H = 95, ITEM_W = PW - 40, ITEM_X = px + 20;
    let iy = py + 88;
    for (const item of cfg.items) {
      const hov   = mx >= ITEM_X && mx <= ITEM_X + ITEM_W && my >= iy && my <= iy + ITEM_H - 10;
      const canAf = money >= item.price || item.price === 0;

      // Item box with gradient
      ctx.save();
      const itemGrad = ctx.createLinearGradient(ITEM_X, iy, ITEM_X, iy + ITEM_H - 10);
      if (hov && canAf) {
        itemGrad.addColorStop(0, `rgba(${this._hexToRgb(nc)},0.2)`);
        itemGrad.addColorStop(1, `rgba(${this._hexToRgb(nc)},0.08)`);
      } else {
        itemGrad.addColorStop(0, 'rgba(15,20,35,0.6)');
        itemGrad.addColorStop(1, 'rgba(10,15,25,0.7)');
      }
      ctx.fillStyle = itemGrad;
      ctx.strokeStyle = hov && canAf ? nc : canAf ? `rgba(${this._hexToRgb(PRIMARY)},0.2)` : 'rgba(255,255,255,0.06)';
      ctx.shadowColor = hov && canAf ? nc : 'transparent'; ctx.shadowBlur = hov && canAf ? 15 : 0;
      ctx.lineWidth = hov && canAf ? 1.5 : 1;
      this._rr(ctx, ITEM_X, iy, ITEM_W, ITEM_H - 10, 10); ctx.fill(); ctx.stroke();

      // Left accent bar
      ctx.fillStyle = nc + (canAf ? 'cc' : '33');
      ctx.shadowColor = nc; ctx.shadowBlur = canAf ? 8 : 0;
      ctx.fillRect(ITEM_X + 3, iy + 8, 3, ITEM_H - 26);
      ctx.restore();

      // Icon with glow
      ctx.save();
      ctx.font = '32px serif'; ctx.textAlign = 'center';
      ctx.shadowColor = nc; ctx.shadowBlur = canAf ? 10 : 0;
      ctx.fillText(item.icon, ITEM_X + 40, iy + 55);
      ctx.restore();

      // Item name + desc with better spacing
      ctx.save();
      ctx.textAlign = 'left';
      ctx.font = 'bold 13px Orbitron, monospace';
      ctx.fillStyle = canAf ? '#ffffff' : '#555555';
      ctx.shadowColor = canAf ? nc : 'transparent'; ctx.shadowBlur = canAf ? 4 : 0;
      ctx.fillText(item.name, ITEM_X + 75, iy + 32);

      ctx.font = '11px Rajdhani, monospace';
      ctx.fillStyle = canAf ? 'rgba(255,255,255,0.6)' : 'rgba(120,120,120,0.5)';
      ctx.shadowBlur = 0;
      ctx.fillText(item.desc, ITEM_X + 75, iy + 52);
      ctx.restore();

      // Price badge with NEX icon
      const pw2 = 95, ph2 = 32, px2 = ITEM_X + ITEM_W - pw2 - 12, py2 = iy + 22;
      ctx.save();
      const priceGrad = ctx.createLinearGradient(px2, py2, px2, py2 + ph2);
      if (canAf) {
        priceGrad.addColorStop(0, `rgba(${this._hexToRgb(nc)},0.3)`);
        priceGrad.addColorStop(1, `rgba(${this._hexToRgb(nc)},0.15)`);
      } else {
        priceGrad.addColorStop(0, 'rgba(40,40,40,0.5)');
        priceGrad.addColorStop(1, 'rgba(30,30,30,0.6)');
      }
      ctx.fillStyle = priceGrad;
      ctx.strokeStyle = canAf ? `rgba(${this._hexToRgb(nc)},0.6)` : 'rgba(80,80,80,0.3)';
      ctx.shadowColor = canAf && hov ? nc : 'transparent'; ctx.shadowBlur = canAf && hov ? 12 : 0;
      ctx.lineWidth = 1.5;
      this._rr(ctx, px2, py2, pw2, ph2, 8); ctx.fill(); ctx.stroke();

      // NEX icon and price text
      if (item.price === 0) {
        ctx.font = 'bold 13px Orbitron, monospace'; ctx.textAlign = 'center';
        ctx.fillStyle = ACCENT;
        ctx.shadowColor = ACCENT; ctx.shadowBlur = 10;
        ctx.fillText('FREE', px2 + pw2 / 2, py2 + 21);
      } else {
        if (canAf) {
          this._renderNexIcon(ctx, px2 + 18, py2 + 16, 16, { animated: hov });
        } else {
          ctx.globalAlpha = 0.3;
          this._renderNexIcon(ctx, px2 + 18, py2 + 16, 16, { animated: false });
          ctx.globalAlpha = 1;
        }
        ctx.font = 'bold 12px Orbitron, monospace'; ctx.textAlign = 'center';
        ctx.fillStyle = canAf ? '#00FFCC' : '#444';
        ctx.shadowColor = canAf && hov ? '#00FFCC' : 'transparent';
        ctx.shadowBlur = canAf && hov ? 10 : 0;
        ctx.fillText(`${item.price.toLocaleString()}`, px2 + pw2 / 2 + 12, py2 + 21);
      }
      ctx.restore();

      // Click area
      const capturedItem = item;
      this._areas.push({ x: ITEM_X, y: iy, w: ITEM_W, h: ITEM_H - 10,
        action: (pl, gr) => {
          if (gr.money < capturedItem.price) { this._msg('NOT ENOUGH NEX!', '#FF4466'); return; }
          gr.money -= capturedItem.price;
          const ok = this._applyEffect(capturedItem.effect, pl, gr);
          window.audio?.buy();
        }
      });

      iy += ITEM_H;
    }

    // Feedback
    if (this._feedback) {
      const alpha = Math.min(1, this._feedback.t / 0.6);
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.font = 'bold 16px Orbitron, monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = this._feedback.color; ctx.shadowColor = this._feedback.color; ctx.shadowBlur = 20;
      ctx.fillText(this._feedback.msg, W / 2, py + PH + 25);
      ctx.restore();
    }

    // Close hint with styling
    ctx.save();
    ctx.font = '10px Orbitron, monospace'; ctx.fillStyle = `rgba(${this._hexToRgb(PRIMARY)},0.5)`; ctx.textAlign = 'center';
    ctx.fillText('[ T ] or [ ESC ] TO CLOSE', W / 2, py + PH - 8);
    ctx.restore();
  }

  _hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  }

  _rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  _corners(ctx, px, py, PW, PH, col) {
    const L = 14;
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2;
    for (const [x2, y2, dx, dy] of [[px,py,L,0],[px,py,0,L],[px+PW,py,-L,0],[px+PW,py,0,L],[px,py+PH,L,0],[px,py+PH,0,-L],[px+PW,py+PH,-L,0],[px+PW,py+PH,0,-L]]) {
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2+dx, y2+dy); ctx.stroke();
    }
    ctx.restore();
  }
}
