'use strict';

class ShopManager {
  constructor() {
    this.isOpen     = false;
    this.tab        = 'weapons';  // 'weapons' | 'upgrades'
    this._areas     = [];         // clickable hit-areas rebuilt each render
    this._feedback  = null;       // { msg, color, t }
    this._scrollY   = 0;
  }

  open()   { this.isOpen = true;  this._areas = []; }
  close()  { this.isOpen = false; this._areas = []; }
  toggle() { this.isOpen ? this.close() : this.open(); }

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

    const PW = Math.min(820, W - 40);
    const PH = Math.min(580, H - 50);
    const px = (W - PW) / 2;
    const py = (H - PH) / 2;

    // Dim backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.80)';
    ctx.fillRect(0, 0, W, H);

    // Panel shadow
    ctx.save();
    ctx.shadowColor = '#44EEFF';
    ctx.shadowBlur = 40;
    ctx.fillStyle = '#06060f';
    ctx.strokeStyle = 'rgba(68,238,255,0.55)';
    ctx.lineWidth = 1.5;
    this._rr(ctx, px, py, PW, PH, 12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Inner top gradient stripe
    ctx.save();
    const grd = ctx.createLinearGradient(px, py, px, py + 60);
    grd.addColorStop(0, 'rgba(68,238,255,0.08)');
    grd.addColorStop(1, 'rgba(68,238,255,0)');
    ctx.fillStyle = grd;
    this._rr(ctx, px, py, PW, 60, 12);
    ctx.fill();
    ctx.restore();

    // Corner accents
    this._corners(ctx, px, py, PW, PH, '#44EEFF');

    // ── Title ──────────────────────────────────────────────
    ctx.save();
    ctx.font = 'bold 26px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#44EEFF';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#fff';
    ctx.fillText('SHOP', px + PW / 2, py + 38);
    ctx.restore();

    // Divider
    ctx.strokeStyle = 'rgba(68,238,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 24, py + 52);
    ctx.lineTo(px + PW - 24, py + 52);
    ctx.stroke();

    // ── Close button ────────────────────────────────────────
    const clx = px + PW - 22, cly = py + 22, clr = 15;
    const clHover = Math.hypot(mx - clx, my - cly) < clr + 4;
    ctx.save();
    ctx.shadowColor = clHover ? '#FF4466' : 'rgba(255,68,102,0.4)';
    ctx.shadowBlur = clHover ? 20 : 6;
    ctx.strokeStyle = clHover ? '#FF4466' : 'rgba(255,68,102,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(clx, cly, clr, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = clHover ? '#FF4466' : 'rgba(255,68,102,0.7)';
    ctx.font = 'bold 18px Orbitron, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('×', clx, cly);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
    this._pushArea(clx - clr - 4, cly - clr - 4, (clr + 4) * 2, (clr + 4) * 2,
      () => this.close());

    // ── Tabs ────────────────────────────────────────────────
    const tabY = py + 60;
    const tabH = 38;
    const tabW = (PW - 60) / 2;
    [['weapons', 'WEAPONS  /  GUNS'], ['upgrades', 'UPGRADES  /  STATS']].forEach(([id, label], i) => {
      const tx = px + 20 + i * (tabW + 20);
      const active = this.tab === id;
      const hover  = mx >= tx && mx <= tx + tabW && my >= tabY && my <= tabY + tabH;
      ctx.save();
      ctx.shadowColor = active ? '#44EEFF' : 'transparent';
      ctx.shadowBlur  = active ? 10 : 0;
      ctx.fillStyle   = active ? 'rgba(68,238,255,0.14)' : hover ? 'rgba(255,255,255,0.04)' : 'transparent';
      ctx.strokeStyle = active ? '#44EEFF' : 'rgba(255,255,255,0.1)';
      ctx.lineWidth   = active ? 1.5 : 1;
      this._rr(ctx, tx, tabY, tabW, tabH, 7);
      ctx.fill(); ctx.stroke();
      ctx.font = `bold ${active ? 12 : 11}px Orbitron, monospace`;
      ctx.fillStyle = active ? '#44EEFF' : 'rgba(255,255,255,0.35)';
      ctx.textAlign = 'center';
      ctx.fillText(label, tx + tabW / 2, tabY + 24);
      ctx.restore();
      if (!active) this._pushArea(tx, tabY, tabW, tabH, () => { this.tab = id; });
    });

    // ── Content ─────────────────────────────────────────────
    const contentY = tabY + tabH + 10;
    const contentH = PH - (contentY - py) - 46;

    ctx.save();
    ctx.beginPath();
    ctx.rect(px + 12, contentY, PW - 24, contentH);
    ctx.clip();

    if (this.tab === 'weapons') {
      this._drawWeapons(ctx, px, contentY, PW, contentH, player, money, mx, my);
    } else {
      this._drawUpgrades(ctx, px, contentY, PW, contentH, player, money, mx, my);
    }
    ctx.restore();

    // ── Balance ─────────────────────────────────────────────
    ctx.save();
    ctx.font = 'bold 18px Orbitron, monospace';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 14;
    ctx.textAlign = 'left';
    ctx.fillText(`BALANCE:  $ ${money.toLocaleString()}`, px + 22, py + PH - 14);
    ctx.restore();

    // Close hint
    ctx.save();
    ctx.font = '10px Orbitron, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.textAlign = 'right';
    ctx.fillText('[B] or [ESC] CLOSE', px + PW - 22, py + PH - 14);
    ctx.restore();

    // ── Feedback message ────────────────────────────────────
    if (this._feedback) {
      const a = Math.min(1, this._feedback.t / 0.6);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = 'bold 17px Orbitron, monospace';
      ctx.fillStyle = this._feedback.color;
      ctx.shadowColor = this._feedback.color;
      ctx.shadowBlur = 20;
      ctx.textAlign = 'center';
      ctx.fillText(this._feedback.msg, W / 2, py + PH - 14);
      ctx.restore();
    }
  }

  // ── Weapons tab ─────────────────────────────────────────
  _drawWeapons(ctx, px, y, PW, PH, player, money, mx, my) {
    const weapons = CONFIG.WEAPONS;
    const cols = 3;
    const gap  = 14;
    const cardW = Math.floor((PW - gap * (cols + 1)) / cols);
    const cardH = Math.min(155, Math.floor((PH - gap * 3) / 2));

    weapons.forEach((w, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx  = px + gap + col * (cardW + gap);
      const cy  = y  + gap + row * (cardH + gap);

      const owned    = player.ownedWeapons.has(w.id);
      const equipped = player.equippedWeaponId === w.id;
      const canBuy   = !owned && money >= w.price;
      const hover    = mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH;

      // Card background
      ctx.save();
      let bg  = 'rgba(0,0,0,0.35)';
      let bdr = 'rgba(255,255,255,0.07)';
      if (equipped) { bg = `rgba(${this._rgb(w.color)},0.14)`; bdr = w.color; }
      else if (owned && hover) { bg = 'rgba(255,255,255,0.07)'; bdr = 'rgba(255,255,255,0.3)'; }
      else if (canBuy && hover) { bg = `rgba(${this._rgb(w.color)},0.08)`; bdr = w.color; }
      else if (!owned && !canBuy) { bg = 'rgba(0,0,0,0.5)'; }

      ctx.shadowColor = (equipped || (hover && (owned || canBuy))) ? w.color : 'transparent';
      ctx.shadowBlur  = equipped ? 18 : hover ? 10 : 0;
      ctx.fillStyle   = bg;
      ctx.strokeStyle = bdr;
      ctx.lineWidth   = equipped ? 1.8 : 1;
      this._rr(ctx, cx, cy, cardW, cardH, 9);
      ctx.fill();
      ctx.stroke();

      // Top color bar
      ctx.fillStyle = w.color + (equipped ? 'dd' : owned ? '55' : canBuy ? '44' : '1a');
      ctx.fillRect(cx + 9, cy, cardW - 18, 3);

      // Weapon name
      ctx.font = `bold ${cardW > 200 ? 12 : 10}px Orbitron, monospace`;
      ctx.fillStyle  = equipped ? '#fff' : owned ? '#ccc' : canBuy ? '#aaa' : '#444';
      ctx.shadowColor = equipped ? w.color : 'transparent';
      ctx.shadowBlur  = equipped ? 8 : 0;
      ctx.textAlign = 'center';
      ctx.fillText(w.name, cx + cardW / 2, cy + 22);

      // Weapon icon
      this._weaponIcon(ctx, cx + cardW / 2, cy + cardH * 0.44, w, owned || equipped, equipped);

      // Stats
      const eff = w.damage > 0 ? w.damage : '—';
      const rpm = w.fireRate > 0 ? Math.round(60000 / w.fireRate) : '—';
      ctx.font = '9px Orbitron, monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.shadowBlur = 0;
      ctx.textAlign = 'center';
      ctx.fillText(`DMG ${eff}   RPM ${rpm}${w.bullets > 1 ? `   ×${w.bullets}` : ''}`, cx + cardW / 2, cy + cardH - 30);

      // Description
      ctx.font = '9px Rajdhani, monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillText(w.desc, cx + cardW / 2, cy + cardH - 42);

      // Status / buy button
      if (equipped) {
        ctx.shadowColor = w.color; ctx.shadowBlur = 10;
        ctx.font = 'bold 10px Orbitron, monospace';
        ctx.fillStyle = w.color;
        ctx.fillText('● EQUIPPED', cx + cardW / 2, cy + cardH - 12);
      } else if (owned) {
        ctx.shadowBlur = 0;
        ctx.font = '10px Orbitron, monospace';
        ctx.fillStyle = hover ? '#fff' : '#aaa';
        ctx.fillText('CLICK TO EQUIP', cx + cardW / 2, cy + cardH - 12);
        if (hover) this._pushArea(cx, cy, cardW, cardH, (p) => { p.equipWeapon(w.id); this._msg(`${w.name} EQUIPPED`, w.color); });
      } else {
        ctx.font = `bold 12px Orbitron, monospace`;
        ctx.fillStyle  = canBuy ? (hover ? '#fff' : '#FFD700') : '#444';
        ctx.shadowColor = canBuy && hover ? '#FFD700' : 'transparent';
        ctx.shadowBlur  = canBuy && hover ? 14 : 0;
        ctx.fillText(w.price > 0 ? `$ ${w.price.toLocaleString()}` : 'FREE', cx + cardW / 2, cy + cardH - 12);
        if (canBuy) {
          this._pushArea(cx, cy, cardW, cardH, (p, g) => {
            if (g.money >= w.price) {
              g.money -= w.price;
              p.ownedWeapons.add(w.id);
              p.equipWeapon(w.id);
              this._msg(`${w.name} PURCHASED!`, w.color);
            } else { this._msg('NOT ENOUGH MONEY', '#FF4466'); }
          });
        }
      }
      ctx.restore();
    });

    // Wheel / key hint
    ctx.save();
    ctx.font = '9px Orbitron, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.textAlign = 'center';
    ctx.fillText('SCROLL WHEEL  or  1–6 KEYS  to cycle weapons', px + PW / 2, y + PH - 2);
    ctx.restore();
  }

  // ── Upgrades tab ─────────────────────────────────────────
  _drawUpgrades(ctx, px, y, PW, PH, player, money, mx, my) {
    const ups  = CONFIG.UPGRADES;
    const gap  = 8;
    const rowH = Math.min(72, Math.floor((PH - gap * (ups.length + 1)) / ups.length));
    const rowW = PW - gap * 2;

    ups.forEach((u, i) => {
      const ux    = px + gap;
      const uy    = y  + gap + i * (rowH + gap);
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
      ctx.font = `${rowH < 60 ? 16 : 20}px monospace`;
      ctx.fillStyle = maxed ? '#FFD700' : u.color;
      ctx.shadowColor = u.color; ctx.shadowBlur = maxed ? 12 : 6;
      ctx.textAlign = 'left';
      ctx.fillText(u.icon, ux + 16, uy + rowH / 2 + 7);

      // Name + desc
      ctx.font = `bold ${rowH < 60 ? 11 : 13}px Orbitron, monospace`;
      ctx.fillStyle = maxed ? '#FFD700' : '#ddd';
      ctx.shadowColor = maxed ? '#FFD700' : 'transparent';
      ctx.shadowBlur  = maxed ? 6 : 0;
      ctx.fillText(u.name, ux + 48, uy + rowH * 0.38);
      ctx.font = `${rowH < 60 ? 9 : 10}px Rajdhani, monospace`;
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

        ctx.font = `bold 12px Orbitron, monospace`;
        ctx.fillStyle  = canBuy ? (bHov ? '#fff' : u.color) : '#3a3a3a';
        ctx.textAlign  = 'center';
        ctx.shadowBlur = 0;
        ctx.fillText(`UPGRADE  $ ${cost.toLocaleString()}`, bx + btnW / 2, by + btnH / 2 + 4);

        if (canBuy) {
          this._pushArea(bx, by, btnW, btnH, (p, g) => {
            const lvl = p.upgradeLevel[u.id] || 0;
            const c   = Math.round(u.baseCost * Math.pow(u.costMult, lvl));
            if (g.money >= c && lvl < u.maxLevel) {
              g.money -= c;
              p.applyUpgrade(u.id);
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

  _rgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  }
}
