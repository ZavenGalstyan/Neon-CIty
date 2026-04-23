'use strict';
/* Metro system: room generation, wave spawning, rendering — split from game.js */

Game.prototype._buildMetroRoom = function() {
    const RS = 48;
    const layout = ROOM_LAYOUT_METRO;
    const RH = layout.length,
      RW = layout[0].length;
    const RW_px = RW * RS,
      RH_px = RH * RS;
    // Entry gap at cols 8-10 → center col 9
    const entryX = (8 + 1.5) * RS; // 9.5 * 48 = 456
    const entryY = RH_px - RS - 12;
    const floorPositions = [];
    for (let fy = 3; fy < RH - 1; fy++) {
      for (let fx = 1; fx < RW - 1; fx++) {
        if (layout[fy][fx] === 0)
          floorPositions.push({ x: (fx + 0.5) * RS, y: (fy + 0.5) * RS });
      }
    }
    return {
      isMetro: true,
      layout,
      W: RW,
      H: RH,
      S: RS,
      roomW: RW_px,
      roomH: RH_px,
      doorDoor: this.map.metroEntrance,
      entryX,
      entryY,
      floorPositions,
      isBlocked(wx, wy) {
        const tx2 = Math.floor(wx / RS),
          ty2 = Math.floor(wy / RS);
        if (tx2 < 0 || ty2 < 0 || tx2 >= RW || ty2 >= RH) return true;
        return layout[ty2][tx2] !== 0;
      },
      isBlockedCircle(wx, wy, r) {
        return (
          this.isBlocked(wx - r + 1, wy - r + 1) ||
          this.isBlocked(wx + r - 1, wy - r + 1) ||
          this.isBlocked(wx - r + 1, wy + r - 1) ||
          this.isBlocked(wx + r - 1, wy + r - 1)
        );
      },
      randomRoadPos() {
        const p =
          floorPositions[Math.floor(Math.random() * floorPositions.length)];
        return new Vec2(p.x, p.y);
      },
    };
};  // end Game.prototype._buildMetroRoom

Game.prototype._spawnMetroWave = function() {
    this._metroWave++;
    const room = this._indoor;
    const waveNum = this._metroWave;
    const base = 2 + Math.floor(this.wave / 2);
    const count = Math.min(base + waveNum, 10);
    const types = ["normal", "normal", "mini", "big", "normal"];
    for (let i = 0; i < count; i++) {
      const pos = room.randomRoadPos();
      const type =
        waveNum >= 3 && i === count - 1
          ? "big"
          : waveNum >= 2 && i % 3 === 0
            ? "mini"
            : types[i % types.length];
      this._indoorBots.push(
        new Bot(pos.x, pos.y, this.wave + waveNum - 1, type, this.map.config),
      );
    }
};  // end Game.prototype._spawnMetroWave

Game.prototype._renderMetroIndoor = function(ctx, W, H, shake) {
    const room = this._indoor;
    const offX = (W - room.roomW) / 2,
      offY = (H - room.roomH) / 2;
    const S = room.S;
    const T = Date.now() / 1000;
    const isRobotCity = !!this.map?.config?.robot || !!this.map?.config?.campaign;

    // Map type detection
    const isWasteland = !!this.map?.config?.wasteland;
    const isGalactica = !!this.map?.config?.galactica;

    // Color schemes based on map type
    const colors = isWasteland ? {
      bg: "#0a0806",
      ambient1: 'rgba(60,40,20,0.06)',
      wall: "#1a1410",
      wallHighlight: 'rgba(255,200,150,0.012)',
      wallEdge: 'rgba(255,180,120,0.022)',
      bench: "#1a1612",
      benchLeg: "#4a3a28",
      benchLegHighlight: "#5a4a38",
      benchSeat: "#3a2a1a",
      benchSeatHighlight: "#4a3a2a",
      trackBase: "#080604",
      trackGravel: "#100c08",
      tie: "#2a1a08",
      tieHighlight: "#3a2a10",
      tieShadow: "#0a0804",
      rail: "#3a3020",
      railMid: "#4a4030",
      railTop: "#5a5040",
      thirdRail: "#1a1810",
      thirdRailGlow: "rgba(255,140,80,0.25)",
      thirdRailColor: "#FF8844",
      floor: "#161410",
      floorAlt: "#121010",
      tactile: "#4a4028",
      neon: "rgba(255,136,100,0.45)",
      neonColor: "#FF8866",
      trainBody1: "#3a2a1a",
      trainBody2: "#2a1a0a",
      trainBody3: "#1a1008",
      trainPanel: "#3a2818",
      trainRoof: "#1a1408",
      trainWindow: "#2a1810",
      trainWindowInner: "#1a1008",
      trainWindowLight: "rgba(255,180,100,0.75)",
      trainStripe: "#AA5500",
      trainStripeGlow: "#FF8800",
      trainDoor: "#0a0804",
      trainDoorInner: "rgba(255,160,80,0.08)",
      trainDoorStroke: "#4a3a28",
      trainHandle: "#6a5a4a",
      destSign: "#0a0600",
      destText: "#FF8800",
      destGlow: "#FF6600",
      carNum: "#FFDDAA",
      safety: "#FFAA00",
      safetyGlow: "#FF8800",
      safetyStripe: "#1a0800",
      caution: "#1a0800",
      lightBox: "#100c08",
      lightGlow: "rgba(255,220,180,0.95)",
      lightGlowColor: "#FFDDAA",
      pillar: "#1a1410",
      pillarHighlight: "#2a2418",
      pillarCap: "#2a2418",
      pillarBase: "#1a1410",
      pillarStripe: "rgba(255,120,60,0.85)",
      pillarStripeGlow: "#FF6633",
      signBg: "#100800",
      signStroke: "#FF8844",
      signText: "#FF8844",
      signGlow: "#FF8844",
      exitBg: "#100800",
      exitStroke: "#FF8844",
      exitText: "#FF8844",
      exitGlow: "#FF8844",
      waveText: "#FF8844",
      waveGlow: "#FF6622",
      exitHint: "#FFDDAA",
      exitHintGlow: "#FFAA00"
    } : {
      bg: "#020308",
      ambient1: 'rgba(30,50,80,0.06)',
      wall: "#0d0d18",
      wallHighlight: 'rgba(255,255,255,0.012)',
      wallEdge: 'rgba(255,255,255,0.022)',
      bench: "#12121c",
      benchLeg: "#3a3a4a",
      benchLegHighlight: "#4a4a5a",
      benchSeat: "#1a4a6a",
      benchSeatHighlight: "#2a6a9a",
      trackBase: "#030308",
      trackGravel: "#080810",
      tie: "#1a1408",
      tieHighlight: "#231a0c",
      tieShadow: "#0a0804",
      rail: "#2a2a40",
      railMid: "#4a4a60",
      railTop: "#6a6a80",
      thirdRail: "#1a1a28",
      thirdRailGlow: "rgba(80,160,255,0.25)",
      thirdRailColor: "#4488FF",
      floor: "#16161f",
      floorAlt: "#121218",
      tactile: "#4a4a30",
      neon: "rgba(68,238,255,0.45)",
      neonColor: "#44EEFF",
      trainBody1: "#2a3d4e",
      trainBody2: "#1c2d3e",
      trainBody3: "#14222e",
      trainPanel: "#253848",
      trainRoof: "#1a2838",
      trainWindow: "#1a2028",
      trainWindowInner: "#3a2a10",
      trainWindowLight: "rgba(255,215,100,0.75)",
      trainStripe: "#0055CC",
      trainStripeGlow: "#0088FF",
      trainDoor: "#060a10",
      trainDoorInner: "rgba(255,200,100,0.08)",
      trainDoorStroke: "#3a5570",
      trainHandle: "#5a6a7a",
      destSign: "#000a10",
      destText: "#FF8800",
      destGlow: "#FF6600",
      carNum: "#FFFFFF",
      safety: "#FFCC00",
      safetyGlow: "#FFAA00",
      safetyStripe: "#1a0a00",
      caution: "#1a0800",
      lightBox: "#080810",
      lightGlow: "rgba(220,240,255,0.95)",
      lightGlowColor: "#AADDFF",
      pillar: "#181828",
      pillarHighlight: "#222236",
      pillarCap: "#242438",
      pillarBase: "#1a1a2a",
      pillarStripe: "rgba(0,100,255,0.85)",
      pillarStripeGlow: "#0066FF",
      signBg: "#001408",
      signStroke: "#22FF66",
      signText: "#22FF66",
      signGlow: "#22FF66",
      exitBg: "#001808",
      exitStroke: "#22FF44",
      exitText: "#22FF44",
      exitGlow: "#22FF44",
      waveText: "#44FF88",
      waveGlow: "#22FF44",
      exitHint: "#FFFFAA",
      exitHintGlow: "#FFFF00"
    };

    const metroName = isWasteland ? "WASTELAND METRO" : "NEON CITY METRO";
    const lineName = isWasteland ? "◉  METRO  LINE W  ◉" : "◉  METRO  LINE 1  ◉";

    // ── Sky/background ─────────────────────────────────────────
    ctx.fillStyle = colors.bg;
    ctx.fillStyle = isRobotCity ? "#010810" : "#020308";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(offX + shake.x, offY + shake.y);

    // ── Ambient underground glow ───────────────────────────────
    const ambientGrad = ctx.createRadialGradient(room.roomW / 2, room.roomH / 2, 0, room.roomW / 2, room.roomH / 2, room.roomW * 0.7);
    ambientGrad.addColorStop(0, colors.ambient1);
    ambientGrad.addColorStop(1, 'rgba(0,0,0,0)');
    if (isRobotCity) {
      ambientGrad.addColorStop(0, 'rgba(0,60,80,0.10)');
      ambientGrad.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      ambientGrad.addColorStop(0, 'rgba(30,50,80,0.06)');
      ambientGrad.addColorStop(1, 'rgba(0,0,0,0)');
    }
    ctx.fillStyle = ambientGrad;
    ctx.fillRect(0, 0, room.roomW, room.roomH);

    const platEdge = 3 * S;

    // ── Tile pass ─────────────────────────────────────────────
    for (let ty = 0; ty < room.H; ty++) {
      for (let tx = 0; tx < room.W; tx++) {
        const tile = room.layout[ty][tx];
        const px = tx * S,
          py = ty * S;
        if (tile === 1) {
          // Concrete wall / ceiling with panel texture
          ctx.fillStyle = colors.wall;
          ctx.fillRect(px, py, S, S);
          ctx.fillStyle = colors.wallHighlight;
          ctx.fillRect(px + 2, py + 2, S - 4, S - 4);
          ctx.fillStyle = colors.wallEdge;
          ctx.fillRect(px, py, S, 2);
          ctx.fillRect(px, py, 2, S);
          // Vertical groove on walls
          if (ty >= 3) {
            ctx.fillStyle = "rgba(0,0,0,0.25)";
            ctx.fillRect(px + S / 2 - 1, py, 2, S);
          }
        } else if (tile === 2) {
          // Enhanced bench with metal frame
          ctx.fillStyle = colors.bench;
          ctx.fillRect(px, py, S, S);
          // Bench legs (chrome)
          ctx.fillStyle = colors.benchLeg;
          ctx.fillRect(px + 8, py + S * 0.48, 5, S * 0.42);
          ctx.fillRect(px + S - 13, py + S * 0.48, 5, S * 0.42);
          ctx.fillStyle = colors.benchLegHighlight;
          ctx.fillRect(px + 9, py + S * 0.48, 2, S * 0.42);
          ctx.fillRect(px + S - 12, py + S * 0.48, 2, S * 0.42);
          // Seat
          ctx.fillStyle = colors.benchSeat;
          ctx.fillRect(px + 4, py + S * 0.38, S - 8, 14);
          ctx.fillStyle = colors.benchSeatHighlight;
          ctx.fillRect(px + 4, py + S * 0.38, S - 8, 4);
          // Backrest
          ctx.fillStyle = colors.benchSeat;
          ctx.fillRect(px + 4, py + S * 0.15, S - 8, 12);
          ctx.fillStyle = colors.benchSeatHighlight;
          ctx.fillRect(px + 4, py + S * 0.15, S - 8, 3);
          // Armrests
          ctx.fillStyle = colors.benchLeg;
          ctx.fillRect(px + 2, py + S * 0.32, 7, 18);
          ctx.fillRect(px + S - 9, py + S * 0.32, 7, 18);
          // Floor under bench
          ctx.fillStyle = (tx + ty) % 2 === 0 ? colors.floor : colors.floorAlt;
          ctx.fillRect(px, py + S * 0.9, S, S * 0.1);
        } else if (tile === 3) {
          // Enhanced train tracks / pit with depth
          ctx.fillStyle = colors.trackBase;
          ctx.fillRect(px, py, S, S);
          // Gravel bed texture
          ctx.fillStyle = colors.trackGravel;
          ctx.fillRect(px, py, S, S);
          for (let gi = 0; gi < 8; gi++) {
            ctx.fillStyle = isWasteland ? `rgba(30,20,10,${0.3 + Math.random() * 0.2})` : `rgba(20,20,30,${0.3 + Math.random() * 0.2})`;
            ctx.fillRect(px + Math.random() * S, py + Math.random() * S, 3, 3);
          }
          // Cross ties (wooden sleepers) with detail
          for (let ci = 0; ci < 3; ci++) {
            const tieY = py + ci * (S / 3) + 4;
            ctx.fillStyle = colors.tie;
            ctx.fillRect(px, tieY, S, 9);
            ctx.fillStyle = colors.tieHighlight;
            ctx.fillRect(px, tieY, S, 2);
            ctx.fillStyle = colors.tieShadow;
            ctx.fillRect(px, tieY + 7, S, 2);
            // Bolt marks
            ctx.fillStyle = colors.tieHighlight;
            ctx.fillRect(px + 10, tieY + 3, 3, 3);
            ctx.fillRect(px + S - 13, tieY + 3, 3, 3);
          }
          // Rails with 3D effect
          ctx.fillStyle = colors.rail;
          ctx.fillRect(px + 5, py, 8, S);
          ctx.fillRect(px + S - 13, py, 8, S);
          ctx.fillStyle = colors.railMid;
          ctx.fillRect(px + 6, py, 5, S);
          ctx.fillRect(px + S - 12, py, 5, S);
          ctx.fillStyle = colors.railTop;
          ctx.fillRect(px + 7, py, 3, S);
          ctx.fillRect(px + S - 11, py, 3, S);
          // Third rail (electric) with glow
          if (ty === 2) {
            ctx.fillStyle = colors.thirdRail;
            ctx.fillRect(px + S / 2 - 4, py + S - 10, 8, 8);
            const pulse = Math.sin(T * 3 + tx * 0.5) * 0.3 + 0.7;
            ctx.fillStyle = colors.thirdRailGlow.replace('0.25', (0.25 * pulse).toFixed(2));
            ctx.shadowColor = colors.thirdRailColor;
            ctx.shadowBlur = 8 * pulse;
            ctx.fillRect(px + S / 2 - 3, py + S - 9, 6, 6);
            ctx.shadowBlur = 0;
          }
        } else {
          // Platform floor — polished tile pattern
          const isDark = (tx + ty) % 2 === 0;
          ctx.fillStyle = isDark ? colors.floor : colors.floorAlt;
          ctx.fillRect(px, py, S, S);
          // Tile edge highlights
          ctx.fillStyle = "rgba(255,255,255,0.025)";
          ctx.fillRect(px, py, S, 1);
          ctx.fillRect(px, py, 1, S);
          ctx.fillStyle = "rgba(0,0,0,0.2)";
          ctx.fillRect(px + S - 1, py, 1, S);
          ctx.fillRect(px, py + S - 1, S, 1);
          // Tactile safety strips near edge
          if (ty === 3 && tx > 0 && tx < room.W - 1) {
            ctx.fillStyle = colors.tactile;
            for (let dot = 0; dot < 4; dot++) {
              ctx.fillRect(px + 6 + dot * 11, py + S - 9, 7, 7);
            }
          }
        }
      }
    }

    // ── Floor guide lines (walking paths) ──────────────────────
    ctx.save();
    ctx.strokeStyle = isWasteland ? "rgba(255,136,100,0.06)" : "rgba(68,238,255,0.06)";
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 12]);
    for (const lineX of [S * 4.5, S * 10, S * 15.5]) {
      ctx.beginPath();
      ctx.moveTo(lineX, platEdge + 25);
      ctx.lineTo(lineX, room.roomH - S - 15);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // ── Subtle floor glow strips ───────────────────────────────
    for (let stripX = S * 2; stripX < room.roomW - S * 2; stripX += S * 3.5) {
      const glowPulse = Math.sin(T * 1.2 + stripX * 0.008) * 0.3 + 0.7;
      ctx.fillStyle = isWasteland ? `rgba(255,136,100,${0.025 * glowPulse})` : `rgba(68,238,255,${0.025 * glowPulse})`;
      ctx.fillRect(stripX - 25, room.roomH - S - 5, 50, 4);
    }

    // ── Subway train parked at top ─────────────────────────────
    const trainTop = S,
      trainH = S * 2;
    // Car shell gradient
    const trainGrad = ctx.createLinearGradient(0, trainTop, 0, trainTop + trainH);
    trainGrad.addColorStop(0, colors.trainBody1);
    trainGrad.addColorStop(0.3, colors.trainBody2);
    trainGrad.addColorStop(1, colors.trainBody3);
    ctx.fillStyle = trainGrad;
    ctx.fillRect(0, trainTop, room.roomW, trainH);
    // Body panel
    ctx.fillStyle = colors.trainPanel;
    ctx.fillRect(3, trainTop + 5, room.roomW - 6, trainH - 12);
    // Roof detail
    ctx.fillStyle = colors.trainRoof;
    ctx.fillRect(0, trainTop, room.roomW, 6);
    // Windows with interior
    const numWin = Math.floor(room.roomW / 78);
    for (let wi = 0; wi < numWin; wi++) {
      const wx2 = 18 + wi * 78;
      ctx.fillStyle = colors.trainWindow;
      ctx.fillRect(wx2 - 2, trainTop + 7, 50, 30);
      ctx.fillStyle = colors.trainWindowInner;
      ctx.fillRect(wx2, trainTop + 9, 46, 26);
      const winFlick = Math.sin(T * 0.4 + wi * 0.7) > -0.2 ? 1 : 0.8;
      ctx.fillStyle = colors.trainWindowLight.replace('0.75', (0.75 * winFlick).toFixed(2));
      ctx.fillRect(wx2 + 2, trainTop + 11, 42, 22);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(wx2 + 2, trainTop + 11, 14, 10);
      // Passenger silhouettes
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(wx2 + 20, trainTop + 18, 8, 12);
      if (wi % 2 === 0) ctx.fillRect(wx2 + 32, trainTop + 16, 6, 14);
    }
    // Color stripe with glow
    ctx.fillStyle = colors.trainStripe;
    ctx.shadowColor = colors.trainStripeGlow;
    ctx.shadowBlur = 10;
    ctx.fillRect(0, trainTop + trainH - 14, room.roomW, 8);
    ctx.shadowBlur = 0;
    // Door openings
    for (const dx of [room.roomW * 0.22, room.roomW * 0.5, room.roomW * 0.78]) {
      ctx.fillStyle = colors.trainDoor;
      ctx.fillRect(dx - 20, trainTop + 4, 40, trainH - 8);
      ctx.fillStyle = colors.trainDoorInner;
      ctx.fillRect(dx - 18, trainTop + 6, 36, trainH - 12);
      ctx.strokeStyle = colors.trainDoorStroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(dx - 20, trainTop + 4, 40, trainH - 8);
      // Door handles
      ctx.fillStyle = colors.trainHandle;
      ctx.fillRect(dx - 3, trainTop + trainH / 2, 6, 14);
    }
    // Headlight flicker
    const flickOn = Math.sin(T * 2.4) > 0.3;
    if (flickOn) {
      ctx.fillStyle = isWasteland ? "rgba(255,200,150,0.12)" : "rgba(180,220,255,0.12)";
      ctx.fillRect(0, trainTop, room.roomW * 0.08, trainH);
      ctx.fillRect(room.roomW * 0.92, trainTop, room.roomW * 0.08, trainH);
    }
    // Destination sign
    ctx.fillStyle = colors.destSign;
    ctx.fillRect(room.roomW / 2 - 58, trainTop + 2, 116, 17);
    ctx.fillStyle = colors.destText;
    ctx.shadowColor = colors.destGlow;
    ctx.shadowBlur = 8;
    ctx.font = "bold 10px Orbitron, monospace";
    ctx.textAlign = "center";
    ctx.fillText(isWasteland ? "DESERT EXPRESS" : "DOWNTOWN EXPRESS", room.roomW / 2, trainTop + 14);
    ctx.shadowBlur = 0;
    // Car number
    ctx.fillStyle = colors.carNum;
    ctx.font = "bold 11px monospace";
    ctx.fillText(isWasteland ? "LINE W · " + metroName : "LINE 1 · " + metroName, room.roomW / 2, trainTop + trainH - 3);
    ctx.fillText("LINE 1 · DASH DREAD METRO", room.roomW / 2, trainTop + trainH - 3);

    // ── Platform edge safety stripe ────────────────────────────
    ctx.fillStyle = colors.safety;
    ctx.shadowColor = colors.safetyGlow;
    ctx.shadowBlur = 14;
    ctx.fillRect(0, platEdge - 8, room.roomW, 8);
    ctx.shadowBlur = 0;
    // Hazard diagonal stripes
    ctx.fillStyle = colors.safetyStripe;
    for (let hx = -8; hx < room.roomW; hx += 16) {
      ctx.beginPath();
      ctx.moveTo(hx, platEdge - 8);
      ctx.lineTo(hx + 8, platEdge - 8);
      ctx.lineTo(hx + 16, platEdge);
      ctx.lineTo(hx + 8, platEdge);
      ctx.closePath();
      ctx.fill();
    }
    // Caution text
    ctx.fillStyle = colors.caution;
    ctx.font = "bold 5px monospace";
    ctx.textAlign = "left";
    for (let xi = 0; xi < 8; xi++)
      ctx.fillText("▲ CAUTION — PLATFORM EDGE ▲", xi * 135 + 8, platEdge - 1);

    // ── Ceiling fluorescent lights ─────────────────────────────
    for (const lx of [room.roomW * 0.12, room.roomW * 0.32, room.roomW * 0.5, room.roomW * 0.68, room.roomW * 0.88]) {
      const flick = Math.sin(T * 50 + lx * 0.08) > 0.96 ? 0.35 : 1;
      ctx.fillStyle = colors.lightBox;
      ctx.fillRect(lx - 30, 2, 60, 11);
      ctx.fillStyle = colors.lightGlow.replace('0.95', (0.95 * flick).toFixed(2));
      ctx.shadowColor = colors.lightGlowColor;
      ctx.shadowBlur = 22 * flick;
      ctx.fillRect(lx - 26, 4, 52, 7);
      ctx.shadowBlur = 0;
      // Light cone
      const cone = ctx.createLinearGradient(0, 14, 0, platEdge + 60);
      if (isWasteland) {
        cone.addColorStop(0, `rgba(255,200,150,${0.055 * flick})`);
        cone.addColorStop(0.6, `rgba(255,180,120,${0.02 * flick})`);
        cone.addColorStop(1, "rgba(255,180,120,0)");
      } else {
        cone.addColorStop(0, `rgba(180,210,255,${0.055 * flick})`);
        cone.addColorStop(0.6, `rgba(160,200,255,${0.02 * flick})`);
        cone.addColorStop(1, "rgba(160,200,255,0)");
      }
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(lx - 26, 14);
      ctx.lineTo(lx + 26, 14);
      ctx.lineTo(lx + 75, platEdge + 60);
      ctx.lineTo(lx - 75, platEdge + 60);
      ctx.closePath();
      ctx.fill();
    }

    // ── Wall neon accent strips ────────────────────────────────
    const neonPulse = Math.sin(T * 1.8) * 0.25 + 0.75;
    ctx.fillStyle = isWasteland ? `rgba(255,136,100,${0.45 * neonPulse})` : `rgba(68,238,255,${0.45 * neonPulse})`;
    ctx.shadowColor = colors.neonColor;
    ctx.shadowBlur = 12;
    ctx.fillRect(3, platEdge + 25, 3, room.roomH - platEdge - S - 35);
    ctx.fillRect(room.roomW - 6, platEdge + 25, 3, room.roomH - platEdge - S - 35);
    ctx.shadowBlur = 0;

    // ── Concrete pillars with neon ─────────────────────────────
    for (let pi = 2; pi <= room.W - 3; pi += 4) {
      const pilX = (pi + 0.5) * S;
      const pilH = room.roomH - platEdge - S;
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(pilX - 5, platEdge - 4, 18, pilH);
      ctx.fillStyle = colors.pillar;
      ctx.fillRect(pilX - 8, platEdge - 6, 16, pilH);
      ctx.fillStyle = colors.pillarHighlight;
      ctx.fillRect(pilX - 8, platEdge - 6, 5, pilH);
      ctx.fillStyle = colors.pillarCap;
      ctx.fillRect(pilX - 12, platEdge - 10, 24, 8);
      ctx.fillStyle = colors.pillarBase;
      ctx.fillRect(pilX - 10, room.roomH - S - 6, 20, 6);
      // Neon stripe
      const stripPulse = Math.sin(T * 2.2 + pi * 0.8) * 0.25 + 0.75;
      ctx.fillStyle = colors.pillarStripe.replace('0.85', (0.85 * stripPulse).toFixed(2));
      ctx.shadowColor = colors.pillarStripeGlow;
      ctx.shadowBlur = 14 * stripPulse;
      ctx.fillRect(pilX - 2, platEdge + 12, 4, pilH - 35);
      ctx.shadowBlur = 0;
    }

    // ── Metro passengers (waiting NPCs) ─────────────────────────
    const passengers = isWasteland ? [
      // Wasteland passengers with warm/dusty colors
      { x: S * 2.5, y: S * 4.5, pose: 'sit_phone', color: '#AA6633', accent: '#FF8844', id: 1 },
      { x: S * 5.5, y: S * 4.5, pose: 'sit_relaxed', color: '#886644', accent: '#FFAA66', id: 2 },
      { x: S * 12.5, y: S * 7.5, pose: 'sit_leaning', color: '#996644', accent: '#FFCC88', id: 3 },
      { x: S * 15.5, y: S * 7.5, pose: 'sit_looking', color: '#774422', accent: '#FF8866', id: 4 },
      { x: S * 8, y: platEdge + 38, pose: 'stand_phone', color: '#885533', accent: '#FFAA44', id: 5 },
      { x: S * 11, y: platEdge + 55, pose: 'stand_crossed', color: '#AA7744', accent: '#FF9966', id: 6 },
      { x: S * 16, y: platEdge + 42, pose: 'stand_looking', color: '#775533', accent: '#FFBB77', id: 7 },
      { x: S * 3.5, y: platEdge + 60, pose: 'stand_waiting', color: '#996655', accent: '#FFCC99', id: 8 },
    ] : [
      // Neon City passengers with neon colors
      { x: S * 2.5, y: S * 4.5, pose: 'sit_phone', color: '#FF4488', accent: '#44EEFF', id: 1 },
      { x: S * 5.5, y: S * 4.5, pose: 'sit_relaxed', color: '#44EEFF', accent: '#FF8844', id: 2 },
      { x: S * 12.5, y: S * 7.5, pose: 'sit_leaning', color: '#AA88FF', accent: '#44FF88', id: 3 },
      { x: S * 15.5, y: S * 7.5, pose: 'sit_looking', color: '#FFAA44', accent: '#FF4488', id: 4 },
      { x: S * 8, y: platEdge + 38, pose: 'stand_phone', color: '#44FF88', accent: '#FF4488', id: 5 },
      { x: S * 11, y: platEdge + 55, pose: 'stand_crossed', color: '#FF4488', accent: '#44EEFF', id: 6 },
      { x: S * 16, y: platEdge + 42, pose: 'stand_looking', color: '#44EEFF', accent: '#AA88FF', id: 7 },
      { x: S * 3.5, y: platEdge + 60, pose: 'stand_waiting', color: '#AA88FF', accent: '#FFAA44', id: 8 },
    ];

    for (const p of passengers) {
      ctx.save();
      // Unique animation phase per passenger
      const phase = p.id * 1.3;
      const breathe = Math.sin(T * 2.2 + phase) * 0.8;
      const sway = Math.sin(T * 0.8 + phase) * 2;
      const headTurn = Math.sin(T * 0.4 + phase * 0.7) * 3;
      const lookUp = Math.sin(T * 0.3 + phase) > 0.7;

      if (p.pose.startsWith('sit')) {
        const sitY = p.y - 8;
        const leanAngle = p.pose === 'sit_leaning' ? 0.15 : 0;

        ctx.translate(p.x, sitY);
        ctx.rotate(leanAngle);
        ctx.translate(-p.x, -sitY);

        // Legs (varied positions)
        ctx.fillStyle = '#1a1a2a';
        if (p.pose === 'sit_relaxed') {
          // Crossed legs
          ctx.fillRect(p.x - 8, sitY + 12, 6, 10);
          ctx.fillRect(p.x - 2, sitY + 14, 6, 8);
        } else {
          ctx.fillRect(p.x - 6, sitY + 12, 5, 10);
          ctx.fillRect(p.x + 1, sitY + 12, 5, 10);
        }

        // Body with breathing
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.ellipse(p.x, sitY + 6 + breathe * 0.3, 7 + breathe * 0.2, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p.accent;
        ctx.fillRect(p.x - 2, sitY + 2, 4, 8);
        ctx.shadowBlur = 0;

        // Head with subtle movement
        const headX = p.x + headTurn * 0.3;
        const headY = sitY - 6 + (lookUp ? -1 : 0);
        ctx.fillStyle = '#e8c8a8';
        ctx.beginPath();
        ctx.arc(headX, headY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Eyes (blinking)
        const blink = Math.sin(T * 8 + phase * 2) > 0.95;
        if (!blink) {
          ctx.fillStyle = '#222';
          ctx.fillRect(headX - 3, headY - 1, 2, blink ? 0.5 : 2);
          ctx.fillRect(headX + 1, headY - 1, 2, blink ? 0.5 : 2);
        }

        // Hair
        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.ellipse(headX, headY - 3, 6, 4, 0, Math.PI, Math.PI * 2);
        ctx.fill();

        // Cyber implant with pulse
        const implantGlow = Math.sin(T * 4 + phase) * 0.3 + 0.7;
        ctx.fillStyle = p.accent;
        ctx.shadowColor = p.accent;
        ctx.shadowBlur = 4 * implantGlow;
        ctx.fillRect(headX + 4, headY - 2, 3, 2);
        ctx.shadowBlur = 0;

        if (p.pose === 'sit_phone') {
          // Arms holding phone
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 5, sitY + 6, 4, 8);
          ctx.fillRect(p.x + 1, sitY + 6, 4, 8);
          // Phone
          ctx.fillStyle = '#111';
          ctx.fillRect(p.x - 3, sitY + 12, 6, 9);
          const phoneGlow = Math.sin(T * 3 + phase) * 0.2 + 0.8;
          ctx.fillStyle = `rgba(68,238,255,${0.85 * phoneGlow})`;
          ctx.shadowColor = '#44EEFF';
          ctx.shadowBlur = 8 * phoneGlow;
          ctx.fillRect(p.x - 2, sitY + 13, 4, 7);
          ctx.shadowBlur = 0;
          // Screen reflection on face
          ctx.fillStyle = `rgba(68,238,255,${0.18 * phoneGlow})`;
          ctx.beginPath();
          ctx.arc(headX, headY, 7, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.pose === 'sit_looking') {
          // Looking at train - head turned up
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 9, sitY + 4, 4, 10);
          ctx.fillRect(p.x + 5, sitY + 4, 4, 10);
        }
      } else {
        // Standing passengers
        const standY = p.y;
        const weightShift = p.pose === 'stand_waiting' ? sway : 0;

        // Legs with weight shift
        ctx.fillStyle = '#1a1a2a';
        const legSpread = p.pose === 'stand_crossed' ? 2 : 6;
        ctx.fillRect(p.x - legSpread + weightShift * 0.3, standY + 8, 4, 16);
        ctx.fillRect(p.x + legSpread - 4 - weightShift * 0.3, standY + 8, 4, 16);

        // Shoes
        ctx.fillStyle = p.accent;
        ctx.shadowColor = p.accent;
        ctx.shadowBlur = 3;
        ctx.fillRect(p.x - legSpread - 1 + weightShift * 0.3, standY + 22, 5, 3);
        ctx.fillRect(p.x + legSpread - 4 - weightShift * 0.3, standY + 22, 5, 3);
        ctx.shadowBlur = 0;

        // Body with breathing and sway
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.ellipse(p.x + weightShift * 0.2, standY + breathe * 0.2, 8 + breathe * 0.15, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(p.x - 1, standY - 8, 2, 16);
        ctx.shadowBlur = 0;

        // Neon trim
        ctx.fillStyle = p.accent;
        ctx.shadowColor = p.accent;
        ctx.shadowBlur = 4;
        ctx.fillRect(p.x - 8, standY - 2, 2, 8);
        ctx.fillRect(p.x + 6, standY - 2, 2, 8);
        ctx.shadowBlur = 0;

        // Head with movement
        const headX = p.x + headTurn * 0.4 + weightShift * 0.15;
        const headY = standY - 14;
        ctx.fillStyle = '#e8c8a8';
        ctx.beginPath();
        ctx.arc(headX, headY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Eyes with blinking
        const blink = Math.sin(T * 6 + phase * 3) > 0.92;
        if (!blink) {
          ctx.fillStyle = '#222';
          ctx.fillRect(headX - 3, headY - 1, 2, 2);
          ctx.fillRect(headX + 1, headY - 1, 2, 2);
        }

        // Hair/helmet
        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.ellipse(headX, headY - 3, 7, 4, 0, Math.PI, Math.PI * 2);
        ctx.fill();

        // Visor
        ctx.fillStyle = '#111';
        ctx.fillRect(headX - 6, headY - 1, 12, 3);
        const visorGlow = Math.sin(T * 2 + phase) * 0.2 + 0.8;
        ctx.fillStyle = p.accent;
        ctx.shadowColor = p.accent;
        ctx.shadowBlur = 5 * visorGlow;
        ctx.fillRect(headX - 5, headY - 1, 4, 2);
        ctx.fillRect(headX + 1, headY - 1, 4, 2);
        ctx.shadowBlur = 0;

        if (p.pose === 'stand_phone') {
          // Arm bent holding phone
          const armBob = Math.sin(T * 1.5 + phase) * 1;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x + 6, standY - 6 + armBob, 12, 4);
          ctx.fillStyle = '#e8c8a8';
          ctx.beginPath();
          ctx.arc(p.x + 16, standY - 4 + armBob, 3, 0, Math.PI * 2);
          ctx.fill();
          // Phone
          ctx.fillStyle = '#111';
          ctx.fillRect(p.x + 13, standY - 12 + armBob, 6, 10);
          const phoneGlow = Math.sin(T * 2.8 + phase) * 0.2 + 0.8;
          ctx.fillStyle = `rgba(68,238,255,${0.9 * phoneGlow})`;
          ctx.shadowColor = '#44EEFF';
          ctx.shadowBlur = 10 * phoneGlow;
          ctx.fillRect(p.x + 14, standY - 11 + armBob, 4, 8);
          ctx.shadowBlur = 0;
          // Other arm relaxed
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 10, standY - 2, 4, 10);
          // Face glow from phone
          ctx.fillStyle = `rgba(68,238,255,${0.15 * phoneGlow})`;
          ctx.beginPath();
          ctx.arc(headX, headY, 8, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.pose === 'stand_crossed') {
          // Arms crossed
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 9, standY - 3, 18, 5);
          ctx.fillStyle = '#e8c8a8';
          ctx.beginPath();
          ctx.arc(p.x - 7, standY, 3, 0, Math.PI * 2);
          ctx.arc(p.x + 7, standY, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.pose === 'stand_looking') {
          // Looking at train, hand shading eyes
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 10, standY - 4, 4, 12);
          ctx.fillRect(p.x + 4, standY - 10, 10, 4);
          ctx.fillStyle = '#e8c8a8';
          ctx.beginPath();
          ctx.arc(p.x + 12, standY - 8, 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Waiting - arms at sides with subtle movement
          const armSwing = Math.sin(T * 0.6 + phase) * 2;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 10, standY - 4 + armSwing, 4, 12);
          ctx.fillRect(p.x + 6, standY - 4 - armSwing, 4, 12);
          ctx.fillStyle = '#e8c8a8';
          ctx.beginPath();
          ctx.arc(p.x - 8, standY + 9 + armSwing, 3, 0, Math.PI * 2);
          ctx.arc(p.x + 8, standY + 9 - armSwing, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // ── Advertisement panels (small posters) ────────────────────
    const ads = isWasteland ? [
      { x: S * 1.5, text: "SALVAGE", color: "#FF8844" },
      { x: S * 6.5, text: "HYDRATE", color: "#FFAA66" },
      { x: S * 13.5, text: "SCRAP", color: "#CC8833" },
      { x: S * 18.5, text: "TRADER", color: "#FFCC88" }
    ] : [
      { x: S * 1.5, text: "CYBER", color: "#FF4488" },
      { x: S * 6.5, text: "NEURO", color: "#44FFAA" },
      { x: S * 13.5, text: "HOLO", color: "#FF8844" },
      { x: S * 18.5, text: "SYNTH", color: "#AA88FF" }
    ];
    for (const ad of ads) {
      const adY = platEdge + 42;
      const adW = 28;
      const adH = 22;
      ctx.fillStyle = isWasteland ? "#0c0806" : "#06080c";
      ctx.fillRect(ad.x - adW / 2, adY, adW, adH);
      ctx.strokeStyle = ad.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(ad.x - adW / 2, adY, adW, adH);
      const adPulse = Math.sin(T * 1.3 + ad.x * 0.015) * 0.2 + 0.8;
      ctx.fillStyle = ad.color;
      ctx.shadowColor = ad.color;
      ctx.shadowBlur = 6 * adPulse;
      ctx.font = "bold 6px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillText(ad.text, ad.x, adY + 14);
      ctx.shadowBlur = 0;
    }

    // ── Destination board (compact) ─────────────────────────────
    const boardX = room.roomW / 2;
    const boardY = platEdge + 32;
    ctx.fillStyle = isWasteland ? "#100800" : "#000810";
    ctx.fillRect(boardX - 65, boardY, 130, 28);
    ctx.strokeStyle = isWasteland ? "#443322" : "#224466";
    ctx.lineWidth = 1;
    ctx.strokeRect(boardX - 65, boardY, 130, 28);
    ctx.fillStyle = "#FFAA00";
    ctx.shadowColor = "#FF8800";
    ctx.shadowBlur = 6;
    ctx.font = "bold 8px Orbitron, monospace";
    ctx.textAlign = "center";
    ctx.fillText(isWasteland ? "NEXT: OUTPOST" : "NEXT: CENTRAL", boardX, boardY + 11);
    ctx.fillStyle = isWasteland ? "#FF8844" : "#44FF88";
    ctx.shadowColor = isWasteland ? "#FF6622" : "#22FF44";
    ctx.font = "7px Orbitron, monospace";
    ctx.fillText("2 MIN", boardX, boardY + 22);
    ctx.shadowBlur = 0;

    // ── Map panel (compact) ────────────────────────────────────
    const mapX = S * 4.5;
    const mapY = platEdge + 75;
    ctx.fillStyle = isWasteland ? "#100c08" : "#080c18";
    ctx.fillRect(mapX - 28, mapY, 56, 38);
    ctx.strokeStyle = isWasteland ? "#FF8844" : "#44EEFF";
    ctx.lineWidth = 1;
    ctx.strokeRect(mapX - 28, mapY, 56, 38);
    ctx.fillStyle = isWasteland ? "#FF8844" : "#44EEFF";
    ctx.font = "bold 5px monospace";
    ctx.textAlign = "center";
    ctx.fillText("MAP", mapX, mapY + 9);
    // Line representation
    ctx.strokeStyle = isWasteland ? "#FFAA44" : "#FF4466";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mapX - 20, mapY + 20);
    ctx.lineTo(mapX + 20, mapY + 20);
    ctx.stroke();
    ctx.fillStyle = isWasteland ? "#FFAA44" : "#FF4466";
    ctx.beginPath();
    ctx.arc(mapX - 12, mapY + 20, 3, 0, Math.PI * 2);
    ctx.arc(mapX, mapY + 20, 3, 0, Math.PI * 2);
    ctx.arc(mapX + 12, mapY + 20, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isWasteland ? "#FF8844" : "#44FF88";
    ctx.font = "4px monospace";
    ctx.fillText("HERE", mapX, mapY + 32);
    ctx.strokeStyle = isWasteland ? "#FF8844" : "#44FF88";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(mapX, mapY + 20, 5, 0, Math.PI * 2);
    ctx.stroke();

    // ── Overhead METRO sign ────────────────────────────────────
    ctx.fillStyle = colors.signBg;
    ctx.strokeStyle = colors.signStroke;
    ctx.lineWidth = 2;
    ctx.fillRect(room.roomW / 2 - 82, 0, 164, 23);
    ctx.strokeRect(room.roomW / 2 - 82, 0, 164, 23);
    ctx.fillStyle = colors.signText;
    ctx.shadowColor = colors.signGlow;
    ctx.shadowBlur = 18;
    ctx.font = "bold 13px Orbitron, monospace";
    ctx.textAlign = "center";
    ctx.fillText(lineName, room.roomW / 2, 17);
    const metroAccent  = isRobotCity ? "#00CCFF" : "#22FF66";
    const metroAccent2 = isRobotCity ? "#00AAEE" : "#22FF44";
    const metroBg      = isRobotCity ? "#00080e" : "#001408";
    const metroBg2     = isRobotCity ? "#00060c" : "#001808";
    const metroLabel   = isRobotCity ? "⬡  TRANSIT GRID  LINE 1  ⬡" : "◉  METRO  LINE 1  ◉";
    ctx.fillStyle = metroBg;
    ctx.strokeStyle = metroAccent;
    ctx.lineWidth = 2;
    ctx.fillRect(room.roomW / 2 - 92, 0, 184, 23);
    ctx.strokeRect(room.roomW / 2 - 92, 0, 184, 23);
    ctx.fillStyle = metroAccent;
    ctx.shadowColor = metroAccent;
    ctx.shadowBlur = 18;
    ctx.font = "bold 13px Orbitron, monospace";
    ctx.textAlign = "center";
    ctx.fillText(metroLabel, room.roomW / 2, 17);
    ctx.shadowBlur = 0;

    // EXIT signs
    for (const sx2 of [30, room.roomW - 30]) {
      ctx.fillStyle = colors.exitBg;
      ctx.fillRect(sx2 - 24, platEdge + 5, 48, 19);
      ctx.strokeStyle = colors.exitStroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(sx2 - 24, platEdge + 5, 48, 19);
      ctx.fillStyle = colors.exitText;
      ctx.shadowColor = colors.exitGlow;
      ctx.fillStyle = metroBg2;
      ctx.fillRect(sx2 - 24, platEdge + 5, 48, 19);
      ctx.strokeStyle = metroAccent2;
      ctx.lineWidth = 1;
      ctx.strokeRect(sx2 - 24, platEdge + 5, 48, 19);
      ctx.fillStyle = metroAccent2;
      ctx.shadowColor = metroAccent2;
      ctx.shadowBlur = 12;
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText("← EXIT →", sx2, platEdge + 17);
      ctx.shadowBlur = 0;
    }

    // ── Wave counter ───────────────────────────────────────────
    const aliveCnt = this._indoorBots.filter((b) => !b.dead && !b.dying).length;
    ctx.fillStyle = colors.waveText;
    ctx.font = "bold 11px Orbitron, monospace";
    ctx.textAlign = "right";
    ctx.shadowColor = colors.waveGlow;
    ctx.fillStyle = isRobotCity ? "#44DDFF" : "#44FF88";
    ctx.font = "bold 11px Orbitron, monospace";
    ctx.textAlign = "right";
    ctx.shadowColor = metroAccent2;
    ctx.shadowBlur = 10;
    ctx.fillText(`${isRobotCity ? "TRANSIT WAVE" : "METRO WAVE"} ${this._metroWave}`, room.roomW - 10, 17);
    if (aliveCnt > 0) {
      ctx.fillStyle = "#FF4444";
      ctx.shadowColor = "#FF0000";
      ctx.fillText(`▼ ${aliveCnt} HOSTILE`, room.roomW - 10, 32);
    } else if (this._metroWaveTimer !== undefined) {
      ctx.fillStyle = "#FFEE44";
      ctx.shadowColor = "#FFAA00";
      ctx.fillText(`NEXT WAVE ${Math.ceil(this._metroWaveTimer)}s`, room.roomW - 10, 32);
    } else {
      ctx.fillStyle = colors.waveText;
      ctx.fillStyle = isRobotCity ? "#44DDFF" : "#44FF88";
      ctx.fillText("SECTOR CLEAR", room.roomW - 10, 32);
    }
    ctx.shadowBlur = 0;

    // ── Entities ─────────────────────────────────────────────
    for (const d of this.decals) d.render(ctx);
    for (const p of this._indoorPickups) p.render(ctx);
    for (const p of this.particles) p.render(ctx);
    for (const b of this._indoorBullets) if (!b.isPlayer) b.render(ctx);
    for (const bot of this._indoorBots) bot.render(ctx);
    for (const b of this._indoorBullets) if (b.isPlayer) b.render(ctx);
    if (!this.player.dead) this.player.render(ctx);

    // ── Exit hint ─────────────────────────────────────────────
    ctx.save();
    ctx.font = "bold 12px Orbitron, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = colors.exitHint;
    ctx.shadowColor = colors.exitHintGlow;
    ctx.shadowBlur = 12;
    ctx.fillText("[E] EXIT METRO", room.roomW / 2, room.roomH - 10);
    ctx.restore();

    ctx.restore();
};  // end Game.prototype._renderMetroIndoor

