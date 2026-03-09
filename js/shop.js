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
    const tabs = [['weapons','WEAPONS / GUNS'],['upgrades','UPGRADES / STATS'],['security','HIRE SECURITY']];
    const tabW = (PW - (tabs.length + 1) * 14) / tabs.length;
    tabs.forEach(([id, label], i) => {
      const tx = px + 14 + i * (tabW + 14);
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
      ctx.font = `bold ${active ? 11 : 10}px Orbitron, monospace`;
      ctx.fillStyle = active ? '#44EEFF' : 'rgba(255,255,255,0.35)';
      ctx.textAlign = 'center';
      ctx.fillText(label, tx + tabW / 2, tabY + 24);
      ctx.restore();
      if (!active) this._pushArea(tx, tabY, tabW, tabH, () => { this.tab = id; this._scrollY = 0; });
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
    } else if (this.tab === 'security') {
      this._drawSecurity(ctx, px, contentY, PW, contentH, player, money, mx, my);
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
    const cols  = 3;
    const gap   = 12;
    const sbW   = 8;   // scrollbar width
    const cardW = Math.floor((PW - gap * (cols + 1) - sbW - 4) / cols);
    const cardH = 138; // fixed height — enough for all weapon info

    // Total scrollable height & clamp
    const rows   = Math.ceil(weapons.length / cols);
    const totalH = gap + rows * (cardH + gap);
    this._maxScrollY = Math.max(0, totalH - PH + 20);
    this._scrollY    = Math.max(0, Math.min(this._scrollY || 0, this._maxScrollY));

    weapons.forEach((w, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx  = px + gap + col * (cardW + gap);
      const cy  = y  + gap + row * (cardH + gap) - this._scrollY;

      // Skip fully off-screen cards
      if (cy + cardH < y || cy > y + PH) return;

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

      // Experimental badge
      if (w.experimental) {
        ctx.save();
        ctx.font = 'bold 7px Orbitron, monospace'; ctx.textAlign = 'right';
        ctx.fillStyle = '#FF88FF'; ctx.shadowColor = '#FF88FF'; ctx.shadowBlur = 8;
        ctx.fillText('⚗ EXP', cx + cardW - 6, cy + 13);
        ctx.restore();
      }

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
        // Only add hit area if card is actually visible on screen
        const cardVisible = cy >= y - 10 && cy + cardH <= y + PH + 10;
        if (cardVisible && hover) this._pushArea(cx, cy, cardW, cardH, (p) => { p.equipWeapon(w.id); this._msg(`${w.name} EQUIPPED`, w.color); });
      } else {
        ctx.font = `bold 12px Orbitron, monospace`;
        ctx.fillStyle  = canBuy ? (hover ? '#fff' : '#FFD700') : '#444';
        ctx.shadowColor = canBuy && hover ? '#FFD700' : 'transparent';
        ctx.shadowBlur  = canBuy && hover ? 14 : 0;
        ctx.fillText(w.price > 0 ? `$ ${w.price.toLocaleString()}` : 'FREE', cx + cardW / 2, cy + cardH - 12);
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

    // ── Scrollbar ──────────────────────────────────────────
    if (this._maxScrollY > 0) {
      const sbX    = px + PW - 10;
      const trackH = PH - 4;
      const thumbH = Math.max(30, trackH * (PH / totalH));
      const thumbY = y + 2 + (this._scrollY / this._maxScrollY) * (trackH - thumbH);
      ctx.fillStyle = 'rgba(68,238,255,0.12)';
      ctx.fillRect(sbX, y + 2, 6, trackH);
      ctx.fillStyle = 'rgba(68,238,255,0.6)';
      ctx.fillRect(sbX, thumbY, 6, thumbH);
    }

    // Hint
    ctx.save();
    ctx.font = '9px Orbitron, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.textAlign = 'center';
    const hintTxt = this._maxScrollY > 0
      ? 'SCROLL WHEEL to see all weapons   ·   1–9 KEYS to cycle'
      : 'SCROLL WHEEL  or  1–9 KEYS  to cycle weapons';
    ctx.fillText(hintTxt, px + PW / 2, y + PH - 2);
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

        ctx.font = `bold 12px Orbitron, monospace`;
        ctx.fillStyle  = canBuy ? (bHov ? '#fff' : u.color) : '#3a3a3a';
        ctx.textAlign  = 'center';
        ctx.shadowBlur = 0;
        ctx.fillText(`UPGRADE  $ ${cost.toLocaleString()}`, bx + btnW / 2, by + btnH / 2 + 4);

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
    const gap  = 18, cols = 3;
    const cardW = Math.floor((PW - gap * (cols + 1)) / cols);
    const cardH = 175;
    const startY = cy + 10;

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
      const ry  = startY + 40 + row * (cardH + 14);
      const hover = mx >= cx2 && mx <= cx2 + cardW && my >= ry && my <= ry + cardH;

      // Card
      ctx.save();
      ctx.shadowColor = hover ? g.color : 'transparent'; ctx.shadowBlur = hover ? 16 : 0;
      ctx.fillStyle   = hover ? `rgba(${this._rgb(g.color)},0.10)` : 'rgba(255,255,255,0.03)';
      ctx.strokeStyle = hover ? g.color : 'rgba(255,255,255,0.1)'; ctx.lineWidth = hover ? 1.5 : 1;
      this._rr(ctx, cx2, ry, cardW, cardH, 8); ctx.fill(); ctx.stroke();

      // Guard silhouette
      const mx2 = cx2 + cardW / 2, my2 = ry + 52;
      ctx.fillStyle = g.color + '99';
      ctx.beginPath(); ctx.arc(mx2, my2, 20, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = g.color; ctx.lineWidth = 2; ctx.shadowColor = g.color; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(mx2, my2, 20, 0, Math.PI * 2); ctx.stroke();
      // Head
      ctx.fillStyle = g.color;
      ctx.beginPath(); ctx.arc(mx2, my2 - 25, 9, 0, Math.PI * 2); ctx.fill();
      // Gun
      ctx.strokeStyle = '#CCC'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(mx2 + 16, my2 - 4); ctx.lineTo(mx2 + 33, my2 - 4); ctx.stroke();

      // Name
      ctx.shadowBlur = 0;
      ctx.font = 'bold 11px Orbitron, monospace'; ctx.textAlign = 'center'; ctx.fillStyle = g.color;
      ctx.fillText(g.name, mx2, ry + 90);

      // HP + DMG
      ctx.font = '9px Orbitron, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText(`HP: ${g.hp}  DMG: ${g.dmg}`, mx2, ry + 106);

      // Desc
      ctx.font = '9px Orbitron, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(g.desc, mx2, ry + 120);

      // Price button
      const btnY = ry + cardH - 32, btnW = cardW - 24, btnX = cx2 + 12;
      const canBuy = money >= g.price;
      ctx.fillStyle = canBuy ? (hover ? `rgba(${this._rgb(g.color)},0.25)` : `rgba(${this._rgb(g.color)},0.12)`) : 'rgba(100,100,100,0.12)';
      ctx.strokeStyle = canBuy ? g.color : '#555'; ctx.lineWidth = 1;
      this._rr(ctx, btnX, btnY, btnW, 26, 5); ctx.fill(); ctx.stroke();
      ctx.font = 'bold 11px Orbitron, monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = canBuy ? g.color : '#555'; ctx.shadowColor = canBuy ? g.color : 'transparent'; ctx.shadowBlur = canBuy ? 8 : 0;
      ctx.fillText(`$ ${g.price.toLocaleString()}  HIRE`, btnX + btnW / 2, btnY + 18);
      ctx.shadowBlur = 0; ctx.restore();

      const tier = g.tier, price = g.price, color = g.color;
      this._pushArea(btnX, btnY, btnW, 26, (p, gameRef) => {
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
    const dismissY = startY + 40 + cardH * 2 + 14 + 16;
    const dismissX = px + PW / 2 - 100;
    const dismissHover = mx >= dismissX && mx <= dismissX + 200 && my >= dismissY && my <= dismissY + 28;
    ctx.save();
    ctx.fillStyle = dismissHover ? 'rgba(255,68,68,0.18)' : 'rgba(255,68,68,0.07)';
    ctx.strokeStyle = dismissHover ? '#FF4444' : 'rgba(255,68,68,0.3)'; ctx.lineWidth = 1;
    this._rr(ctx, dismissX, dismissY, 200, 28, 5); ctx.fill(); ctx.stroke();
    ctx.font = 'bold 10px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = dismissHover ? '#FF6666' : 'rgba(255,68,68,0.6)';
    ctx.fillText('DISMISS ALL GUARDS', dismissX + 100, dismissY + 19);
    ctx.restore();
    this._pushArea(dismissX, dismissY, 200, 28, (p, gameRef) => {
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

  _rgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  }
}

// ── DealershipManager ────────────────────────────────────────────────────────
class DealershipManager {
  constructor() {
    this.isOpen    = false;
    this.tab       = 'vehicles';  // 'vehicles' | 'weapons' | 'grenades'
    this._areas    = [];
    this._feedback = null;
  }

  open()  { this.isOpen = true;  this._areas = []; }
  close() { this.isOpen = false; this._areas = []; }

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

  // ── Main render ─────────────────────────────────────────────────────────────
  render(ctx, W, H, player, money, grenadeCount, mx, my) {
    if (!this.isOpen) return;
    this._areas = [];

    const PW = Math.min(860, W - 40);
    const PH = Math.min(600, H - 50);
    const px = (W - PW) / 2;
    const py = (H - PH) / 2;

    // Dim backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, W, H);

    // Panel
    ctx.save();
    ctx.shadowColor = '#FFDD44'; ctx.shadowBlur = 40;
    ctx.fillStyle   = '#06060a';
    ctx.strokeStyle = 'rgba(255,221,68,0.55)';
    ctx.lineWidth   = 1.5;
    this._rr(ctx, px, py, PW, PH, 12);
    ctx.fill(); ctx.stroke();
    ctx.restore();

    // Top gradient stripe
    ctx.save();
    const grd = ctx.createLinearGradient(px, py, px, py + 60);
    grd.addColorStop(0, 'rgba(255,221,68,0.08)');
    grd.addColorStop(1, 'rgba(255,221,68,0)');
    ctx.fillStyle = grd;
    this._rr(ctx, px, py, PW, 60, 12);
    ctx.fill();
    ctx.restore();

    this._corners(ctx, px, py, PW, PH, '#FFDD44');

    // Title
    ctx.save();
    ctx.font = 'bold 26px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.shadowColor = '#FFDD44'; ctx.shadowBlur = 18; ctx.fillStyle = '#fff';
    ctx.fillText('CAR DEALERSHIP', px + PW / 2, py + 38);
    ctx.restore();

    // Divider
    ctx.strokeStyle = 'rgba(255,221,68,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 24, py + 52); ctx.lineTo(px + PW - 24, py + 52); ctx.stroke();

    // Close button
    const clx = px + PW - 22, cly = py + 22, clr = 15;
    const clHov = Math.hypot(mx - clx, my - cly) < clr + 4;
    ctx.save();
    ctx.shadowColor = clHov ? '#FF4466' : 'rgba(255,68,102,0.4)'; ctx.shadowBlur = clHov ? 20 : 6;
    ctx.strokeStyle = clHov ? '#FF4466' : 'rgba(255,68,102,0.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(clx, cly, clr, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = clHov ? '#FF4466' : 'rgba(255,68,102,0.7)';
    ctx.font = 'bold 18px Orbitron, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('×', clx, cly);
    ctx.textBaseline = 'alphabetic'; ctx.restore();
    this._pushArea(clx - clr - 4, cly - clr - 4, (clr + 4) * 2, (clr + 4) * 2, () => this.close());

    // Tabs
    const tabY = py + 60, tabH = 38;
    const tabW = (PW - 80) / 3;
    [['vehicles','VEHICLES'],['weapons','WEAPONS'],['grenades','GRENADES']].forEach(([id, label], i) => {
      const tx = px + 20 + i * (tabW + 20);
      const active = this.tab === id;
      const hover  = mx >= tx && mx <= tx + tabW && my >= tabY && my <= tabY + tabH;
      const color  = id === 'grenades' ? '#FF8800' : id === 'vehicles' ? '#FFDD44' : '#44EEFF';
      ctx.save();
      ctx.shadowColor = active ? color : 'transparent'; ctx.shadowBlur = active ? 10 : 0;
      ctx.fillStyle   = active ? `rgba(${this._rgb(color)},0.14)` : hover ? 'rgba(255,255,255,0.04)' : 'transparent';
      ctx.strokeStyle = active ? color : 'rgba(255,255,255,0.1)'; ctx.lineWidth = active ? 1.5 : 1;
      this._rr(ctx, tx, tabY, tabW, tabH, 7);
      ctx.fill(); ctx.stroke();
      ctx.font = `bold ${active ? 12 : 11}px Orbitron, monospace`;
      ctx.fillStyle = active ? color : 'rgba(255,255,255,0.35)'; ctx.textAlign = 'center';
      ctx.fillText(label, tx + tabW / 2, tabY + 24);
      ctx.restore();
      if (!active) this._pushArea(tx, tabY, tabW, tabH, () => { this.tab = id; });
    });

    // Content area
    const contentY = tabY + tabH + 10;
    const contentH = PH - (contentY - py) - 46;
    ctx.save();
    ctx.beginPath(); ctx.rect(px + 12, contentY, PW - 24, contentH); ctx.clip();
    if      (this.tab === 'vehicles') this._drawVehicles(ctx, px, contentY, PW, contentH, player, money, mx, my);
    else if (this.tab === 'weapons')  this._drawWeapons(ctx, px, contentY, PW, contentH, player, money, mx, my);
    else                              this._drawGrenades(ctx, px, contentY, PW, contentH, grenadeCount, money, mx, my);
    ctx.restore();

    // Balance
    ctx.save();
    ctx.font = 'bold 18px Orbitron, monospace'; ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 14; ctx.textAlign = 'left';
    ctx.fillText(`BALANCE:  $ ${money.toLocaleString()}`, px + 22, py + PH - 14);
    ctx.restore();

    // Close hint
    ctx.save();
    ctx.font = '10px Orbitron, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.textAlign = 'right';
    ctx.fillText('[T] or [ESC] CLOSE', px + PW - 22, py + PH - 14);
    ctx.restore();

    // Feedback
    if (this._feedback) {
      const a = Math.min(1, this._feedback.t / 0.6);
      ctx.save(); ctx.globalAlpha = a;
      ctx.font = 'bold 17px Orbitron, monospace'; ctx.fillStyle = this._feedback.color;
      ctx.shadowColor = this._feedback.color; ctx.shadowBlur = 20; ctx.textAlign = 'center';
      ctx.fillText(this._feedback.msg, W / 2, py + PH - 14);
      ctx.restore();
    }
  }

  // ── Vehicles tab ────────────────────────────────────────────────────────────
  _drawVehicles(ctx, px, y, PW, PH, player, money, mx, my) {
    const cars = CONFIG.CAR_DEALERSHIP;
    const cols = 2, gap = 16;
    const cardW = Math.floor((PW - gap * (cols + 1)) / cols);
    const cardH = Math.min(160, Math.floor((PH - gap * 3) / 2));

    cars.forEach((car, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const cx  = px + gap + col * (cardW + gap);
      const cy  = y  + gap + row * (cardH + gap);
      const canBuy = money >= car.price;
      const hover  = mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH;

      ctx.save();
      ctx.fillStyle   = hover && canBuy ? `rgba(${this._rgb(car.color)},0.10)` : 'rgba(0,0,0,0.35)';
      ctx.strokeStyle = hover && canBuy ? car.color : 'rgba(255,255,255,0.08)';
      ctx.shadowColor = hover && canBuy ? car.color : 'transparent';
      ctx.shadowBlur  = hover && canBuy ? 14 : 0;
      ctx.lineWidth   = hover && canBuy ? 1.5 : 1;
      this._rr(ctx, cx, cy, cardW, cardH, 9);
      ctx.fill(); ctx.stroke();

      // Top color bar
      ctx.fillStyle = car.color + (canBuy ? '88' : '2a');
      ctx.fillRect(cx + 9, cy, cardW - 18, 3);

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

      // Stats
      ctx.font = '9px Orbitron, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.textAlign = 'center'; ctx.shadowBlur = 0;
      ctx.fillText(`SPD ${car.speed}   HP ${car.hp}${car.bulletproof ? '   ⬡ BULLETPROOF' : ''}`, cx + cardW / 2, cy + cardH - 30);

      // Desc
      ctx.font = '9px Rajdhani, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillText(car.desc, cx + cardW / 2, cy + cardH - 42);

      // Price / buy
      ctx.font = 'bold 13px Orbitron, monospace';
      ctx.fillStyle  = canBuy ? (hover ? '#fff' : '#FFD700') : '#444';
      ctx.shadowColor = canBuy && hover ? '#FFD700' : 'transparent';
      ctx.shadowBlur  = canBuy && hover ? 14 : 0;
      ctx.fillText(`$ ${car.price.toLocaleString()}`, cx + cardW / 2, cy + cardH - 12);

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
    const cardW = Math.floor((PW - gap * (cols + 1)) / cols);
    const cardH = Math.min(155, Math.floor((PH - gap * 3) / 2));

    weapons.forEach((w, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const cx  = px + gap + col * (cardW + gap);
      const cy  = y  + gap + row * (cardH + gap);
      const owned    = player.ownedWeapons.has(w.id);
      const equipped = player.equippedWeaponId === w.id;
      const canBuy   = !owned && money >= w.price;
      const hover    = mx >= cx && mx <= cx + cardW && my >= cy && my <= cy + cardH;

      ctx.save();
      let bg  = 'rgba(0,0,0,0.35)', bdr = 'rgba(255,255,255,0.07)';
      if (equipped)              { bg = `rgba(${this._rgb(w.color)},0.14)`;  bdr = w.color; }
      else if (owned && hover)   { bg = 'rgba(255,255,255,0.07)';             bdr = 'rgba(255,255,255,0.3)'; }
      else if (canBuy && hover)  { bg = `rgba(${this._rgb(w.color)},0.08)`;  bdr = w.color; }
      else if (!owned && !canBuy){ bg = 'rgba(0,0,0,0.5)'; }

      ctx.shadowColor = (equipped || (hover && (owned || canBuy))) ? w.color : 'transparent';
      ctx.shadowBlur  = equipped ? 18 : hover ? 10 : 0;
      ctx.fillStyle   = bg; ctx.strokeStyle = bdr; ctx.lineWidth = equipped ? 1.8 : 1;
      this._rr(ctx, cx, cy, cardW, cardH, 9);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = w.color + (equipped ? 'dd' : owned ? '55' : canBuy ? '44' : '1a');
      ctx.fillRect(cx + 9, cy, cardW - 18, 3);

      ctx.font = `bold ${cardW > 200 ? 12 : 10}px Orbitron, monospace`;
      ctx.fillStyle = equipped ? '#fff' : owned ? '#ccc' : canBuy ? '#aaa' : '#444';
      ctx.shadowColor = equipped ? w.color : 'transparent'; ctx.shadowBlur = equipped ? 8 : 0;
      ctx.textAlign = 'center';
      ctx.fillText(w.name, cx + cardW / 2, cy + 22);

      const eff = w.damage > 0 ? w.damage : '—';
      const rpm = w.fireRate > 0 ? Math.round(60000 / w.fireRate) : '—';
      ctx.font = '9px Orbitron, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.shadowBlur = 0;
      ctx.fillText(`DMG ${eff}   RPM ${rpm}${w.bullets > 1 ? `   ×${w.bullets}` : ''}`, cx + cardW / 2, cy + cardH - 30);
      ctx.font = '9px Rajdhani, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillText(w.desc, cx + cardW / 2, cy + cardH - 42);

      if (equipped) {
        ctx.shadowColor = w.color; ctx.shadowBlur = 10;
        ctx.font = 'bold 10px Orbitron, monospace'; ctx.fillStyle = w.color;
        ctx.fillText('● EQUIPPED', cx + cardW / 2, cy + cardH - 12);
      } else if (owned) {
        ctx.shadowBlur = 0; ctx.font = '10px Orbitron, monospace';
        ctx.fillStyle = hover ? '#fff' : '#aaa';
        ctx.fillText('CLICK TO EQUIP', cx + cardW / 2, cy + cardH - 12);
        if (hover) this._pushArea(cx, cy, cardW, cardH, (p) => { p.equipWeapon(w.id); this._msg(`${w.name} EQUIPPED`, w.color); });
      } else {
        ctx.font = 'bold 12px Orbitron, monospace';
        ctx.fillStyle   = canBuy ? (hover ? '#fff' : '#FFD700') : '#444';
        ctx.shadowColor = canBuy && hover ? '#FFD700' : 'transparent';
        ctx.shadowBlur  = canBuy && hover ? 14 : 0;
        ctx.fillText(w.price > 0 ? `$ ${w.price.toLocaleString()}` : 'FREE', cx + cardW / 2, cy + cardH - 12);
        if (canBuy) {
          this._pushArea(cx, cy, cardW, cardH, (p, g) => {
            const effectivePrice = Math.round(w.price * (1 - (g._shopDiscount || 0)));
            if (g.money >= effectivePrice) {
              g.money -= effectivePrice;
              p.ownedWeapons.add(w.id); p.equipWeapon(w.id);
              window.audio?.buy();
              this._msg(`${w.name} PURCHASED!`, w.color);
            } else { this._msg('NOT ENOUGH MONEY', '#FF4466'); }
          });
        }
      }
      ctx.restore();
    });
  }

  // ── Grenades tab ─────────────────────────────────────────────────────────────
  _drawGrenades(ctx, px, y, PW, PH, grenadeCount, money, mx, my) {
    const gc = CONFIG.GRENADE;
    const cx = px + PW / 2;

    // Grenade art
    ctx.save();
    ctx.translate(cx, y + 90);
    ctx.fillStyle = '#3a5c3a'; ctx.strokeStyle = '#88CC88'; ctx.lineWidth = 2;
    ctx.shadowColor = '#44FF44'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.ellipse(0, 0, 32, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FF4400';
    ctx.beginPath(); ctx.arc(0, -28, 8, 0, Math.PI * 2); ctx.fill();
    ctx.font = 'bold 14px Orbitron, monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText('GRENADE', 0, 6);
    ctx.restore();

    // Stats
    ctx.save();
    ctx.font = '11px Orbitron, monospace'; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.textAlign = 'center';
    ctx.fillText(`DMG ${gc.damage}   BLAST RADIUS ${gc.blastRadius}px   FUSE ${gc.fuseTime}s`, cx, y + 150);
    ctx.font = '10px Rajdhani, monospace'; ctx.fillStyle = 'rgba(255,136,0,0.7)';
    ctx.fillText('Press [G] to throw toward mouse cursor', cx, y + 170);
    ctx.restore();

    // Current count
    ctx.save();
    ctx.font = 'bold 22px Orbitron, monospace'; ctx.fillStyle = '#FF8800';
    ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 14; ctx.textAlign = 'center';
    ctx.fillText(`\u{1F4A3}  ×  ${grenadeCount}`, cx, y + 210);
    ctx.shadowBlur = 0; ctx.restore();

    // Buy buttons
    const btnDefs = [
      { qty: 1, price: gc.price, label: `1 GRENADE   $ ${gc.price.toLocaleString()}` },
      { qty: 5, price: gc.price * 4, label: `5 GRENADES  $ ${(gc.price * 4).toLocaleString()}  (DEAL)` },
    ];
    btnDefs.forEach((btn, bi) => {
      const bw = 280, bh = 42;
      const bx = cx - bw / 2;
      const by2 = y + 235 + bi * (bh + 14);
      const canBuy = money >= btn.price;
      const hover  = mx >= bx && mx <= bx + bw && my >= by2 && my <= by2 + bh;
      ctx.save();
      ctx.fillStyle   = canBuy ? (hover ? 'rgba(255,136,0,0.25)' : 'rgba(255,136,0,0.10)') : 'rgba(40,40,40,0.6)';
      ctx.strokeStyle = canBuy ? (hover ? '#FF8800' : 'rgba(255,136,0,0.5)') : 'rgba(80,80,80,0.3)';
      ctx.shadowColor = canBuy && hover ? '#FF8800' : 'transparent';
      ctx.shadowBlur  = canBuy && hover ? 16 : 0;
      ctx.lineWidth   = canBuy ? 1.2 : 0.8;
      this._rr(ctx, bx, by2, bw, bh, 7);
      ctx.fill(); ctx.stroke();
      ctx.font = 'bold 12px Orbitron, monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = canBuy ? (hover ? '#fff' : '#FF8800') : '#333';
      ctx.shadowBlur = 0;
      ctx.fillText(btn.label, cx, by2 + bh / 2 + 4);
      ctx.restore();
      if (canBuy) {
        this._pushArea(bx, by2, bw, bh, (p, g) => {
          if (g.money >= btn.price) {
            g.money -= btn.price;
            g._grenadeCount += btn.qty;
            window.audio?.buy();
            this._msg(`+${btn.qty} GRENADE${btn.qty > 1 ? 'S' : ''}!`, '#FF8800');
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
    ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 10;
    ctx.fillText(`BALANCE: $${money.toLocaleString()}`, cx, py + 72);
    ctx.restore();

    // ── Slot machine ─────────────────────────────────────────
    const slotY = py + 88;
    const slotW = 260, slotH = 82;
    const slotX = cx - slotW / 2;
    const symbols = ['7','♦','♣','★','♥','$','🍀'];

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
      ctx.fillText(`$${bet.toLocaleString()}`, bx2 + bw / 2, by2 + bh2 / 2 + 4);
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
      ctx.fillStyle = isWin ? '#FFD700' : '#FF4466';
      ctx.shadowColor = isWin ? '#FFD700' : '#FF4466'; ctx.shadowBlur = 16;
      ctx.fillText(
        isWin ? `JACKPOT! +$${(this._lastBet * 2).toLocaleString()}` : `NO LUCK — LOST $${this._lastBet.toLocaleString()}`,
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
