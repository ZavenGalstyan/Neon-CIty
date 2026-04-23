'use strict';
/* Tower mode: floor rendering, HUD, updates — split from game.js */

Game.prototype._renderTowerHUD = function(ctx, W, H) {
    ctx.save();
    const t = Date.now() * 0.001;
    const fl = this._towerFloor;

    // ── Floor-specific accent color per floor ──────────────
    const FLOOR_COLORS = [
      "#FFD700", // 0 unused
      "#E8D8B0", // 1 Grand Lobby
      "#FFCC00", // 2 Parking Garage
      "#CC8844", // 3 Corporate Offices
      "#00CCFF", // 4 Data Center
      "#FF6666", // 5 Velvet Lounge
      "#FF4444", // 6 Tactical Ops
      "#44FF88", // 7 Bio-Research Lab
      "#FF8844", // 8 Weapons Armory
      "#BB88FF", // 9 Executive Suite
      "#FFD700", // 10 The Penthouse
    ];
    const flCol = FLOOR_COLORS[Math.min(fl, 10)] || "#FFD700";
    const pulse = Math.sin(t * 2.5) * 0.18 + 0.82;

    // ── Main floor panel — top-center ─────────────────────
    const panW = 320,
      panH = 72,
      panX = W / 2 - panW / 2,
      panY = 12;

    // Panel drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.40)";
    ctx.beginPath();
    ctx.roundRect(panX + 3, panY + 3, panW, panH, 10);
    ctx.fill();

    // Panel body
    ctx.fillStyle = "rgba(8,6,4,0.88)";
    ctx.beginPath();
    ctx.roundRect(panX, panY, panW, panH, 10);
    ctx.fill();

    // Colored top accent bar
    ctx.fillStyle = flCol;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.roundRect(panX, panY, panW, 3, [10, 10, 0, 0]);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Border
    ctx.strokeStyle = `${flCol}55`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(panX, panY, panW, panH, 10);
    ctx.stroke();

    // "THE TOWER" label
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = `${flCol}99`;
    ctx.letterSpacing = "0.3em";
    ctx.fillText("◈  THE TOWER  ◈", W / 2, panY + 17);
    ctx.letterSpacing = "0";

    // Floor number (large, glowing)
    ctx.font = "bold 28px monospace";
    ctx.fillStyle = flCol;
    ctx.shadowColor = flCol;
    ctx.shadowBlur = 14 * pulse;
    ctx.fillText(`FLOOR  ${fl}  /  10`, W / 2, panY + 47);
    ctx.shadowBlur = 0;

    // Subtitle (floor name)
    const sub = this._towerFloorSubtitle(fl);
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.38)";
    ctx.fillText(sub, W / 2, panY + 64);

    // ── Enemy count pill — below main panel ───────────────
    const alive =
      this.bots.filter((b) => !b.dead && !b.dying).length +
      (this.boss && !this.boss.dead && !this.boss.dying ? 1 : 0);

    const pillW = 200,
      pillH = 26,
      pillX = W / 2 - pillW / 2,
      pillY = panY + panH + 6;
    ctx.fillStyle =
      alive > 0 ? "rgba(255,60,40,0.15)" : "rgba(40,255,120,0.12)";
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 13);
    ctx.fill();
    ctx.strokeStyle =
      alive > 0 ? "rgba(255,80,40,0.35)" : "rgba(40,255,120,0.30)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 13);
    ctx.stroke();

    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = alive > 0 ? "#FF8866" : "#44FF88";
    if (alive === 0) {
      ctx.shadowColor = "#44FF88";
      ctx.shadowBlur = 8;
    }
    ctx.fillText(
      alive > 0 ? `☠  ${alive} ENEMIES REMAINING` : "✓  ALL CLEARED!",
      W / 2,
      pillY + 17,
    );
    ctx.shadowBlur = 0;

    // ── Floor progress dots ────────────────────────────────
    const dotR = 5,
      dotGap = 16,
      dotsW = 10 * dotGap;
    const dotStartX = W / 2 - dotsW / 2 + dotR;
    for (let i = 1; i <= 10; i++) {
      const dx = dotStartX + (i - 1) * dotGap;
      const dy = panY + panH + 40;
      if (i < fl) {
        ctx.fillStyle = `${flCol}88`;
        ctx.beginPath();
        ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
        ctx.fill();
      } else if (i === fl) {
        ctx.fillStyle = flCol;
        ctx.shadowColor = flCol;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(dx, dy, dotR + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.beginPath();
        ctx.arc(dx, dy, dotR - 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Elevator active: dramatic pulsing banner ───────────
    if (this._towerElevatorActive) {
      const ep = Math.sin(t * 3.5) * 0.22 + 0.78;
      const bW = 300,
        bH = 36,
        bX = W / 2 - bW / 2,
        bY = H - 60;

      ctx.fillStyle = `rgba(0,0,0,${ep * 0.6})`;
      ctx.beginPath();
      ctx.roundRect(bX, bY, bW, bH, 18);
      ctx.fill();
      ctx.strokeStyle = `rgba(0,255,136,${ep * 0.55})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bX, bY, bW, bH, 18);
      ctx.stroke();

      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.globalAlpha = ep;
      ctx.fillStyle = "#00FF88";
      ctx.shadowColor = "#00FF88";
      ctx.shadowBlur = 18;
      ctx.fillText("▲  ENTER ELEVATOR  ▲", W / 2, bY + 24);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    ctx.restore();
};  // end Game.prototype._renderTowerHUD

Game.prototype._towerFloorSubtitle = function(floor) {
    const subs = [
      "",
      "GRAND LOBBY  ·  SECURITY CHECKPOINT",
      "PARKING GARAGE  ·  SUBLEVEL B2",
      "CORPORATE OFFICES  ·  3RD FLOOR",
      "DATA CENTER  ·  SERVER WING",
      "VELVET LOUNGE  ·  VIP AREA",
      "TACTICAL OPERATIONS  ·  CLASSIFIED",
      "BIO-RESEARCH LAB  ·  CONTAINMENT",
      "WEAPONS ARMORY  ·  RESTRICTED",
      "EXECUTIVE SUITE  ·  PENTHOUSE ANTECHAMBER",
      "★  THE PENTHOUSE  ·  FINAL CONFRONTATION  ★",
    ];
    return subs[Math.min(floor, 10)] || "";
};  // end Game.prototype._towerFloorSubtitle

Game.prototype._renderTowerVictory = function(ctx, W, H) {
    const t = Date.now() * 0.001;

    // Beautiful night sky background with stars
    const skyGrd = ctx.createLinearGradient(0, 0, 0, H);
    skyGrd.addColorStop(0, "#0a0a1a");
    skyGrd.addColorStop(0.4, "#1a1a3a");
    skyGrd.addColorStop(0.7, "#2a1a2a");
    skyGrd.addColorStop(1, "#1a0a1a");
    ctx.fillStyle = skyGrd;
    ctx.fillRect(0, 0, W, H);

    // Animated stars
    ctx.save();
    for (let i = 0; i < 80; i++) {
      const sx = (i * 137) % W;
      const sy = (i * 97) % (H * 0.6);
      const twinkle = Math.sin(t * 2 + i) * 0.4 + 0.6;
      ctx.globalAlpha = twinkle * 0.8;
      ctx.fillStyle =
        i % 5 === 0 ? "#FFD700" : i % 3 === 0 ? "#AADDFF" : "#FFFFFF";
      const starSize = i % 7 === 0 ? 3 : i % 4 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.arc(sx, sy, starSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // City skyline silhouette at bottom
    ctx.fillStyle = "#0a0a0a";
    for (let b = 0; b < 20; b++) {
      const bx = b * (W / 20);
      const bh = 40 + ((b * 7) % 80);
      const bw = W / 20 - 2;
      ctx.fillRect(bx, H - bh, bw, bh);
      // Building windows
      ctx.fillStyle = "rgba(255,200,100,0.3)";
      for (let wy = H - bh + 8; wy < H - 10; wy += 12) {
        for (let wx = bx + 4; wx < bx + bw - 4; wx += 8) {
          if ((wx + wy) % 3 !== 0) ctx.fillRect(wx, wy, 4, 6);
        }
      }
      ctx.fillStyle = "#0a0a0a";
    }

    // Grand golden glow from center
    const grd = ctx.createRadialGradient(
      W / 2,
      H / 2 - 50,
      20,
      W / 2,
      H / 2 - 50,
      400,
    );
    grd.addColorStop(0, "rgba(255,215,0,0.35)");
    grd.addColorStop(0.3, "rgba(255,180,0,0.20)");
    grd.addColorStop(0.6, "rgba(255,140,0,0.10)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // Floating golden particles
    ctx.save();
    for (let p = 0; p < 30; p++) {
      const px = W / 2 + Math.sin(t * 0.8 + p * 0.5) * (150 + p * 5);
      const py =
        H / 2 -
        50 +
        Math.cos(t * 0.6 + p * 0.7) * (80 + p * 3) -
        ((t * 20 + p * 10) % 200);
      const pAlpha = 0.3 + Math.sin(t + p) * 0.2;
      ctx.globalAlpha = pAlpha;
      ctx.fillStyle = p % 2 === 0 ? "#FFD700" : "#FFAA00";
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.save();
    ctx.textAlign = "center";

    // Animated crown/trophy area with rays
    ctx.save();
    ctx.translate(W / 2, H / 2 - 100);
    ctx.rotate(Math.sin(t * 0.5) * 0.05);
    // Sun rays behind trophy
    for (let r = 0; r < 12; r++) {
      const ra = (r / 12) * Math.PI * 2 + t * 0.3;
      ctx.strokeStyle = `rgba(255,215,0,${0.15 + Math.sin(t + r) * 0.08})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ra) * 40, Math.sin(ra) * 40);
      ctx.lineTo(
        Math.cos(ra) * (90 + Math.sin(t * 2 + r) * 15),
        Math.sin(ra) * (90 + Math.sin(t * 2 + r) * 15),
      );
      ctx.stroke();
    }
    ctx.restore();

    // Large golden crown icon
    ctx.font = "80px monospace";
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = 40;
    const crownBob = Math.sin(t * 1.5) * 5;
    ctx.fillText("\u{1F451}", W / 2, H / 2 - 90 + crownBob);
    ctx.shadowBlur = 0;

    // CONGRATULATIONS title with glow effect
    ctx.font = "bold 52px monospace";
    const titleGlow = 25 + Math.sin(t * 2.5) * 12;
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = titleGlow;
    ctx.fillStyle = "#FFD700";
    ctx.fillText("CONGRATULATIONS!", W / 2, H / 2 - 10);
    ctx.shadowBlur = 0;

    // Sub-title
    ctx.font = "bold 32px monospace";
    ctx.fillStyle = "#FFCC44";
    ctx.shadowColor = "#FFAA00";
    ctx.shadowBlur = 15;
    ctx.fillText("TOWER CONQUERED!", W / 2, H / 2 + 35);
    ctx.shadowBlur = 0;

    // Victory message
    ctx.font = "20px monospace";
    ctx.fillStyle = "#CCAA66";
    ctx.fillText(
      "You defeated The Golden Emperor and claimed the Penthouse!",
      W / 2,
      H / 2 + 72,
    );

    // Stats with NEX styling
    ctx.font = "bold 18px monospace";
    ctx.fillStyle = "#00FFCC";
    ctx.shadowColor = "#00FFCC";
    ctx.shadowBlur = 8;
    ctx.fillText(`KILLS: ${this.kills}`, W / 2 - 100, H / 2 + 110);
    ctx.fillText(`NEX: ⬢${this.money}`, W / 2 + 100, H / 2 + 110);
    ctx.shadowBlur = 0;

    // Survival time if tracked
    if (this._surviveTime) {
      ctx.font = "16px monospace";
      ctx.fillStyle = "#AA8844";
      const mins = Math.floor(this._surviveTime / 60);
      const secs = Math.floor(this._surviveTime % 60);
      ctx.fillText(
        `Time: ${mins}:${secs.toString().padStart(2, "0")}`,
        W / 2,
        H / 2 + 135,
      );
    }

    // OK Button - beautiful golden button
    const btnW = 180,
      btnH = 50;
    const btnX = W / 2 - btnW / 2,
      btnY = H / 2 + 155;
    const mx = this.input.mouseScreen.x,
      my = this.input.mouseScreen.y;
    const hovered =
      mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH;

    // Store button bounds for click detection
    this._towerVictoryBtn = { x: btnX, y: btnY, w: btnW, h: btnH };

    // Button glow
    if (hovered) {
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 25;
    }

    // Button background gradient
    const btnGrd = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    if (hovered) {
      btnGrd.addColorStop(0, "#FFE55C");
      btnGrd.addColorStop(0.5, "#FFD700");
      btnGrd.addColorStop(1, "#CC9900");
    } else {
      btnGrd.addColorStop(0, "#FFD700");
      btnGrd.addColorStop(0.5, "#CCAA00");
      btnGrd.addColorStop(1, "#996600");
    }
    ctx.fillStyle = btnGrd;

    // Rounded rectangle button
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 12);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Button border
    ctx.strokeStyle = hovered ? "#FFFFFF" : "#FFE88A";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 12);
    ctx.stroke();

    // Button text
    ctx.font = "bold 24px monospace";
    ctx.fillStyle = hovered ? "#000000" : "#1a0a00";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("OK", W / 2, btnY + btnH / 2);
    ctx.textBaseline = "alphabetic";

    // Decorative corner flourishes
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(30, 60);
    ctx.lineTo(30, 30);
    ctx.lineTo(60, 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(40, 70);
    ctx.lineTo(40, 40);
    ctx.lineTo(70, 40);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(W - 30, 60);
    ctx.lineTo(W - 30, 30);
    ctx.lineTo(W - 60, 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W - 40, 70);
    ctx.lineTo(W - 40, 40);
    ctx.lineTo(W - 70, 40);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(30, H - 60);
    ctx.lineTo(30, H - 30);
    ctx.lineTo(60, H - 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(40, H - 70);
    ctx.lineTo(40, H - 40);
    ctx.lineTo(70, H - 40);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(W - 30, H - 60);
    ctx.lineTo(W - 30, H - 30);
    ctx.lineTo(W - 60, H - 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W - 40, H - 70);
    ctx.lineTo(W - 40, H - 40);
    ctx.lineTo(W - 70, H - 40);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.restore();
};  // end Game.prototype._renderTowerVictory

Game.prototype._startTowerFloor = function() {
    const floor = this._towerFloor;
    this.bots = [];
    this.boss = null;
    this._towerElevatorActive = false;
    this.map._towerFloor = floor;

    // Spawn composition per floor — EXACTLY 12 enemies each floor (no more, no less)
    const FLOOR_SPAWNS = [
      null, // 0 unused
      [["mini", 12]], // floor  1: 12 mini
      [
        ["mini", 6],
        ["normal", 6],
      ], // floor  2: 12 total
      [
        ["normal", 8],
        ["big", 4],
      ], // floor  3: 12 total
      [
        ["normal", 4],
        ["police", 4],
        ["big", 4],
      ], // floor  4: 12 total
      [
        ["police", 4],
        ["big", 4],
        ["swat", 4],
      ], // floor  5: 12 total
      [
        ["swat", 6],
        ["heavyswat", 6],
      ], // floor  6: 12 total
      [
        ["heavyswat", 4],
        ["sniper", 8],
      ], // floor  7: 12 total
      [
        ["sniper", 4],
        ["bomber", 8],
      ], // floor  8: 12 total
      [
        ["bomber", 4],
        ["juggernaut", 8],
      ], // floor  9: 12 total
      [["juggernaut", 12]], // floor 10: 12 juggernaut + boss
    ];
    const spawns = FLOOR_SPAWNS[Math.min(floor, 10)] || FLOOR_SPAWNS[1];

    for (const [type, num] of spawns) {
      for (let i = 0; i < num; i++) {
        const pos = this._towerRandomPos();
        const bot = new Bot(pos.x, pos.y, floor, type, this.map.config);
        this.bots.push(bot);
      }
    }

    // Boss ONLY on floor 10 (last floor)
    if (floor === 10) this._spawnBoss();

    // Grant player the floor weapon (progressive unlock)
    this._grantTowerWeapon(floor);

    // Reset player to left side center
    const S = this.map.S;
    this.player.x = 2.5 * S;
    this.player.y = (this.map.H / 2) * S;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30); // small heal between floors

    // Camera snap
    this.camX = this.player.x - this.canvas.width / 2;
    this.camY = this.player.y - this.canvas.height / 2;
};  // end Game.prototype._startTowerFloor

Game.prototype._towerRandomPos = function() {
    const S = this.map.S;
    const elevX = this.map.elevatorX,
      elevY = this.map.elevatorY;
    let x,
      y,
      tries = 0;
    do {
      x = rnd(1.5 * S, (this.map.W - 3) * S);
      y = rnd(1.5 * S, (this.map.H - 3) * S);
      tries++;
    } while (
      tries < 30 &&
      (this.map.isBlocked(x, y) ||
        Math.hypot(x - elevX, y - elevY) < 140 ||
        Math.hypot(x - 2.5 * S, y - (this.map.H / 2) * S) < 100)
    );
    return { x, y };
};  // end Game.prototype._towerRandomPos

Game.prototype._grantTowerWeapon = function(floor) {
    const WEAPONS = [
      null,
      "pistol",
      "shotgun",
      "smg",
      "burst",
      "sniper",
      "crossbow",
      "rocket",
      "flamethrower",
      "rocket",
      "flamethrower",
    ];
    const wid = WEAPONS[Math.min(floor, WEAPONS.length - 1)];
    if (!wid || wid === "pistol") return;
    if (!this.player.ownedWeapons.has(wid)) {
      this.player.ownedWeapons.add(wid);
    }
    this.player.equipWeapon(wid);
};  // end Game.prototype._grantTowerWeapon

Game.prototype._updateTower = function(dt) {
    // Tower transition (fade out → advance floor → fade in)
    if (this._towerTransitionState > 0) {
      if (this._towerTransitionState === 1) {
        // Fade to black
        this._towerTransitionAlpha = Math.min(
          1,
          this._towerTransitionAlpha + dt * 2.5,
        );
        if (this._towerTransitionAlpha >= 1) {
          this._towerFloor++;
          if (this._towerFloor > 10) {
            this._towerVictory = true;
            this._towerTransitionAlpha = 0; // Reset so victory screen is visible
            this._towerTransitionState = 0;
            this.state = "gameover";
            return;
          }
          this._startTowerFloor();
          this._towerTransitionState = 2;
        }
      } else if (this._towerTransitionState === 2) {
        // Fade from black
        this._towerTransitionAlpha = Math.max(
          0,
          this._towerTransitionAlpha - dt * 2.0,
        );
        if (this._towerTransitionAlpha <= 0) this._towerTransitionState = 0;
      }
      return; // freeze game logic during transition
    }

    // Check if all enemies dead → activate elevator
    if (!this._towerElevatorActive) {
      const alive = this.bots.filter((b) => !b.dead && !b.dying).length;
      const bossAlive = this.boss && !this.boss.dead && !this.boss.dying;
      if (alive === 0 && !bossAlive) {
        this._towerElevatorActive = true;
        window.audio?.waveUp();
      }
    }

    // Elevator proximity check
    if (this._towerElevatorActive) {
      const ex = this.map.elevatorX,
        ey = this.map.elevatorY;
      if (Math.hypot(this.player.x - ex, this.player.y - ey) < 90) {
        this._towerTransitionState = 1;
        window.audio?.pickup();
      }
    }
};  // end Game.prototype._updateTower

