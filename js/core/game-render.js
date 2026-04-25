'use strict';
/* Main outdoor render loop (_render) — split from game.js */

Game.prototype._render = function() {
    const ctx = this.ctx;
    const W = this.canvas.width,
      H = this.canvas.height;
    const shake = this.hud.getShakeOffset();

    this.canvas.style.cursor =
      this.state === "shop" ||
      this.state === "blackmarket" ||
      this.state === "carshop" ||
      this.state === "casino" ||
      this.state === "buildingshop" ||
      this.state === "bigmap" ||
      this.state === "paused" ||
      this.state === "gameover"
        ? "default"
        : "none";

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#08080f";
    ctx.fillRect(0, 0, W, H);

    // World
    if (this._indoor) {
      this._renderIndoorScene(ctx, W, H, shake);
    } else {
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(-this.camX + shake.x, -this.camY + shake.y);
      this.map.render(ctx, this.camX, this.camY, W, H);
      this.map.renderStreetLightPoles(
        ctx,
        this.camX,
        this.camY,
        W,
        H,
        this._nightAlpha,
      );
      this.map.renderMetroEntrance(ctx);
      if (this._districtLayout) {
        const mapPxW = this.map.W * this.map.S;
        const mapPxH = this.map.H * this.map.S;
        const zoneW = mapPxW / 3;
        for (let i = 0; i < 3; i++) {
          const cfg = CONFIG.DISTRICTS.find(
            (d) => d.id === this._districtLayout[i],
          );
          ctx.fillStyle = cfg.tint;
          ctx.fillRect(i * zoneW, 0, zoneW, mapPxH);
        }
      }
      for (const d of this.decals) d.render(ctx);
      for (const p of this.pickups) p.render(ctx);
      for (const v of this.vehicles) v.render(ctx);
      for (const p of this.particles) p.render(ctx);
      for (const b of this.bullets) if (!b.isPlayer) b.render(ctx);
      for (const bot of this.bots) {
        try {
          bot.render(ctx);
        } catch (e) {
          console.error("bot render error", bot.type, e);
          // Fully reset canvas transform so remaining entities render correctly
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
          ctx.translate(-this.camX + shake.x, -this.camY + shake.y);
        }
      }
      for (const npc of this._cityNpcs) npc.render(ctx);
      // Ambient car render removed (non-driveable cars disabled)
      if (this.boss && !this.boss.dead) {
        try {
          this.boss.render(ctx);
        } catch (e) {
          console.error("boss render error", e);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
          ctx.translate(-this.camX + shake.x, -this.camY + shake.y);
        }
      }
      for (const b of this.bullets) if (b.isPlayer) b.render(ctx);
      if (!this.player.dead) this.player.render(ctx);
      if (this.player.companion && !this.player.companion.dead)
        this.player.companion.render(ctx);

      // ── Remote players (multiplayer) ───────────────────────
      if (this._roomId && this._remotePlayers && this._remotePlayers.size > 0) {
        for (const [, rp] of this._remotePlayers) {
          if (rp.dead) continue;
          const rpSx = rp.x;
          const rpSy = rp.y;

          ctx.save();
          ctx.translate(rpSx, rpSy);
          ctx.rotate(rp.angle || 0);

          // Body
          ctx.fillStyle = '#44EEFF';
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, 10, 13, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Head
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(0, -14, 6, 0, Math.PI * 2);
          ctx.fill();

          // Direction indicator
          ctx.fillStyle = '#00FFCC';
          ctx.beginPath();
          ctx.moveTo(0, -20);
          ctx.lineTo(-3, -14);
          ctx.lineTo(3, -14);
          ctx.closePath();
          ctx.fill();

          ctx.restore();

          // HP bar (world-space, above player)
          const barW = 38, barH = 4;
          const hpPct = Math.max(0, Math.min(1, (rp.hp || 0) / (rp.maxHp || 100)));
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillRect(rpSx - barW / 2, rpSy - 34, barW, barH);
          ctx.fillStyle = hpPct > 0.5 ? '#44FF88' : hpPct > 0.25 ? '#FFCC00' : '#FF4444';
          ctx.fillRect(rpSx - barW / 2, rpSy - 34, barW * hpPct, barH);

          // Name tag
          ctx.save();
          ctx.font = 'bold 10px Orbitron, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillText(rp.username || 'PLAYER', rpSx + 1, rpSy - 37);
          ctx.fillStyle = '#44EEFF';
          ctx.fillText(rp.username || 'PLAYER', rpSx, rpSy - 38);
          ctx.restore();
        }
      }
      for (const bg of this._bodyguards) bg.render(ctx);

      // Drones
      for (const d of this._drones) d.render(ctx);
      if (this._playerDrone) this._playerDrone.render(ctx);

      // Grenades
      for (const g of this._grenades) g.render(ctx);

      // Glitch portals (world-space)
      for (const p of this._glitchPortals) {
        const pulse = Math.sin(p.t * 4) * 0.3 + 0.7;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.shadowColor = "#AA44FF";
        ctx.shadowBlur = 30 * pulse;
        ctx.fillStyle = `rgba(100,20,200,${pulse * 0.28})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, 28, 40, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(170,68,255,${pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, 28, 40, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(68,238,255,${pulse * 0.7})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 28, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#CC88FF";
        ctx.font = "bold 8px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("PORTAL", 0, -48);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Map teleport portals (world-space)
      for (const p of this._portals) {
        const pulse = Math.sin(p._animT * 3.5) * 0.35 + 0.65;
        const near = Math.hypot(p.x - this.player.x, p.y - this.player.y) < 55;
        const isNeonCity  = this.map.config.id === "neon_city";
        const isWasteland = !!this.map.config.wasteland;
        const isGalactica = !!this.map.config.galactica || !!this.map.config.blitz;
        const isSnow = !!this.map.config.snow;
        const isRobotCity = !!this.map.config.robot;
        const isDesert = !!this.map.config.desert;
        ctx.save();
        ctx.translate(p.x, p.y);

        if (isSnow) {
          // ── FROZEN TUNDRA: Blizzard warp gate — ice-blue / white crystal rings ──
          const t = p._animT;
          const pulse2 = Math.sin(t * 2.2) * 0.3 + 0.7;
          const pulse3 = Math.sin(t * 4.5) * 0.2 + 0.8;

          // Wide soft blizzard halo
          const haloG = ctx.createRadialGradient(0, 0, 10, 0, 0, 55);
          haloG.addColorStop(0, `rgba(180,230,255,${pulse * 0.16})`);
          haloG.addColorStop(0.5, `rgba(80,160,220,${pulse * 0.09})`);
          haloG.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = haloG;
          ctx.beginPath();
          ctx.arc(0, 0, 55, 0, Math.PI * 2);
          ctx.fill();

          // Outer rotating ring — ice-blue dashes
          ctx.save();
          ctx.rotate(t * 0.4);
          ctx.strokeStyle = `rgba(136,221,255,${pulse * 0.72})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([9, 11]);
          ctx.beginPath();
          ctx.arc(0, 0, 40, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Middle counter-rotating ring — white silver dashes
          ctx.save();
          ctx.rotate(-t * 0.7);
          ctx.strokeStyle = `rgba(200,240,255,${pulse2 * 0.6})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 9]);
          ctx.beginPath();
          ctx.arc(0, 0, 32, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Inner fast ring — pale frost cyan
          ctx.save();
          ctx.rotate(t * 1.3);
          ctx.strokeStyle = `rgba(180,230,255,${pulse3 * 0.3})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 7]);
          ctx.beginPath();
          ctx.arc(0, 0, 23, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Deep-ice core gradient
          const coreG = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
          coreG.addColorStop(0, `rgba(240,252,255,${pulse3 * 0.95})`);
          coreG.addColorStop(0.25, `rgba(100,200,255,${pulse2 * 0.7})`);
          coreG.addColorStop(0.65, `rgba(20,80,160,${pulse * 0.4})`);
          coreG.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = coreG;
          ctx.beginPath();
          ctx.arc(0, 0, 26, 0, Math.PI * 2);
          ctx.fill();

          // 8 orbiting particles — alternating ice-blue + white
          for (let i = 0; i < 8; i++) {
            const angle = t * 1.8 + (i * Math.PI) / 4;
            const dist = 24 + Math.sin(t * 2.5 + i * 1.2) * 6;
            const gp = Math.cos(angle) * dist;
            const hp = Math.sin(angle) * dist;
            const r = i % 3 === 0 ? 2.8 : 1.8;
            ctx.fillStyle = i % 2 === 0
              ? `rgba(100,200,255,${pulse})`
              : `rgba(220,245,255,${pulse2})`;
            ctx.beginPath();
            ctx.arc(gp, hp, r, 0, Math.PI * 2);
            ctx.fill();
          }

          // Bright central frost core
          ctx.shadowColor = "#AADDFF";
          ctx.shadowBlur = 24 * pulse;
          ctx.fillStyle = `rgba(240,252,255,${pulse3})`;
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.fill();

          // 8-point ice crystal / snowflake gate frame
          ctx.shadowBlur = 16 * pulse;
          ctx.strokeStyle = `rgba(136,221,255,${pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const ang = (Math.PI / 4) * i - Math.PI / 2;
            const r = i % 2 === 0 ? 30 : 20;
            const fx = Math.cos(ang) * r;
            const fy = Math.sin(ang) * r;
            i === 0 ? ctx.moveTo(fx, fy) : ctx.lineTo(fx, fy);
          }
          ctx.closePath();
          ctx.stroke();

          // White accent ring
          ctx.shadowBlur = 8 * pulse2;
          ctx.strokeStyle = `rgba(200,240,255,${pulse2 * 0.45})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, 25, 0, Math.PI * 2);
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.fillStyle = near ? "#EEFFFF" : "#AADDFF";
          ctx.font = "bold 9px Orbitron, monospace";
          ctx.textAlign = "center";
          ctx.shadowColor = "#66BBFF";
          ctx.shadowBlur = 12;
          ctx.fillText("❄ ICE GATE ❄", 0, -52);
          if (near) {
            ctx.fillStyle = "#EEFFFF";
            ctx.shadowColor = "#AADDFF";
            ctx.shadowBlur = 14;
            ctx.fillText("[E]  ENTER GATE", 0, -66);
          }
        } else if (!!this.map.config.hardcore) {
          // ── HARDCORE: Fire portal — ember / crimson rings ──────────
          const t = p._animT;
          const pulse2 = Math.sin(t * 2) * 0.3 + 0.7;
          const pulse3 = Math.sin(t * 4) * 0.2 + 0.8;

          // Outer rotating ring (ember dashes)
          ctx.save();
          ctx.rotate(t * 0.5);
          ctx.strokeStyle = `rgba(255,136,0,${pulse * 0.7})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 12]);
          ctx.beginPath();
          ctx.arc(0, 0, 38, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Middle counter-rotating ring (crimson dashes)
          ctx.save();
          ctx.rotate(-t * 0.8);
          ctx.strokeStyle = `rgba(255,34,0,${pulse2 * 0.6})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 8]);
          ctx.beginPath();
          ctx.arc(0, 0, 30, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Inner fast ring — fire shimmer
          ctx.save();
          ctx.rotate(t * 1.1);
          ctx.strokeStyle = `rgba(255,170,0,${pulse3 * 0.45})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.arc(0, 0, 21, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Fire core gradient
          const coreG = ctx.createRadialGradient(0, 0, 0, 0, 0, 24);
          coreG.addColorStop(0, `rgba(255,240,100,${pulse3 * 0.95})`);
          coreG.addColorStop(0.25, `rgba(255,136,0,${pulse2 * 0.75})`);
          coreG.addColorStop(0.6, `rgba(200,40,0,${pulse * 0.45})`);
          coreG.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = coreG;
          ctx.beginPath();
          ctx.arc(0, 0, 24, 0, Math.PI * 2);
          ctx.fill();

          // Orbiting ember particles
          for (let i = 0; i < 8; i++) {
            const angle = t * 1.8 + (i * Math.PI) / 4;
            const dist = 22 + Math.sin(t * 2.5 + i * 1.3) * 5;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            const r = i % 3 === 0 ? 3 : 2;
            ctx.fillStyle = i % 2 === 0
              ? `rgba(255,136,0,${pulse})`
              : `rgba(255,34,0,${pulse2})`;
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fill();
          }

          // Central bright fire core
          ctx.shadowColor = "#FF8800";
          ctx.shadowBlur = 22 * pulse;
          ctx.fillStyle = `rgba(255,220,100,${pulse3})`;
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.fill();

          // Hexagon frame (fire-colored)
          ctx.shadowBlur = 15 * pulse;
          ctx.strokeStyle = `rgba(255,136,0,${pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const hx = Math.cos(angle) * 26;
            const hy = Math.sin(angle) * 26;
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.fillStyle = near ? "#FFEEAA" : "#FF8800";
          ctx.font = "bold 9px Orbitron, monospace";
          ctx.textAlign = "center";
          ctx.shadowColor = "#FF8800";
          ctx.shadowBlur = 12;
          ctx.fillText("🔥 FIRE PORTAL 🔥", 0, -50);
          if (near) {
            ctx.fillStyle = "#FFEEAA";
            ctx.shadowColor = "#FFCC00";
            ctx.shadowBlur = 14;
            ctx.fillText("[E] TELEPORT", 0, -64);
          }
        } else if (isWasteland) {
          // ── WASTELAND: Dust gate — amber / rust / sand rings ──
          const t = p._animT;
          const pulse2 = Math.sin(t * 2.2) * 0.3 + 0.7;
          const pulse3 = Math.sin(t * 4.5) * 0.2 + 0.8;

          // Wide amber dust halo
          const haloG = ctx.createRadialGradient(0, 0, 10, 0, 0, 55);
          haloG.addColorStop(0, `rgba(255,140,20,${pulse * 0.22})`);
          haloG.addColorStop(0.5, `rgba(180,60,0,${pulse * 0.12})`);
          haloG.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = haloG;
          ctx.beginPath(); ctx.arc(0, 0, 55, 0, Math.PI * 2); ctx.fill();

          // Outer rotating ring — rusty orange dashes
          ctx.save(); ctx.rotate(t * 0.4);
          ctx.strokeStyle = `rgba(220,90,10,${pulse * 0.75})`;
          ctx.lineWidth = 2; ctx.setLineDash([9, 11]);
          ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]); ctx.restore();

          // Middle counter-rotating ring — amber dashes
          ctx.save(); ctx.rotate(-t * 0.7);
          ctx.strokeStyle = `rgba(255,185,30,${pulse2 * 0.65})`;
          ctx.lineWidth = 1.5; ctx.setLineDash([5, 9]);
          ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]); ctx.restore();

          // Inner fast ring — sandy yellow
          ctx.save(); ctx.rotate(t * 1.3);
          ctx.strokeStyle = `rgba(255,220,100,${pulse3 * 0.3})`;
          ctx.lineWidth = 1; ctx.setLineDash([3, 7]);
          ctx.beginPath(); ctx.arc(0, 0, 23, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]); ctx.restore();

          // Desert core gradient
          const coreG = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
          coreG.addColorStop(0, `rgba(255,230,160,${pulse3 * 0.95})`);
          coreG.addColorStop(0.25, `rgba(255,140,20,${pulse2 * 0.7})`);
          coreG.addColorStop(0.65, `rgba(140,40,0,${pulse * 0.4})`);
          coreG.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = coreG;
          ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();

          // Orbiting particles — 8 alternating amber + rust
          for (let i = 0; i < 8; i++) {
            const angle = t * 1.8 + (i * Math.PI) / 4;
            const dist = 24 + Math.sin(t * 2.5 + i * 1.2) * 6;
            const gp = Math.cos(angle) * dist;
            const hp = Math.sin(angle) * dist;
            const r = i % 3 === 0 ? 2.8 : 1.8;
            ctx.fillStyle = i % 2 === 0
              ? `rgba(255,160,30,${pulse})`
              : `rgba(200,60,10,${pulse2})`;
            ctx.beginPath(); ctx.arc(gp, hp, r, 0, Math.PI * 2); ctx.fill();
          }

          // Bright amber core
          ctx.shadowColor = "#FF8800"; ctx.shadowBlur = 24 * pulse;
          ctx.fillStyle = `rgba(255,230,150,${pulse3})`;
          ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();

          // 8-point rusted gate frame — orange
          ctx.shadowBlur = 16 * pulse;
          ctx.strokeStyle = `rgba(220,100,20,${pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const ang = (Math.PI / 4) * i - Math.PI / 2;
            const r = i % 2 === 0 ? 30 : 20;
            i === 0 ? ctx.moveTo(Math.cos(ang)*r, Math.sin(ang)*r) : ctx.lineTo(Math.cos(ang)*r, Math.sin(ang)*r);
          }
          ctx.closePath(); ctx.stroke();

          // Sandy accent ring
          ctx.shadowBlur = 8 * pulse2;
          ctx.strokeStyle = `rgba(255,200,80,${pulse2 * 0.45})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.fillStyle = near ? "#FFE0A0" : "#FF9922";
          ctx.font = "bold 9px Orbitron, monospace";
          ctx.textAlign = "center";
          ctx.shadowColor = "#FF8800"; ctx.shadowBlur = 12;
          ctx.fillText("⚡ DUST GATE ⚡", 0, -52);
          if (near) {
            ctx.fillStyle = "#FFE0A0";
            ctx.shadowColor = "#FFAA00"; ctx.shadowBlur = 14;
            ctx.fillText("[E]  ENTER GATE", 0, -66);
          }
        } else if (!!this.map?.config?.dino) {
          // ── DINO WORLD: Bio-luminescent jungle portal — green / amber ──
          const t = p._animT;
          const pulse2 = Math.sin(t * 2) * 0.3 + 0.7;
          const pulse3 = Math.sin(t * 4) * 0.2 + 0.8;

          // Outer soft jungle halo
          const haloG = ctx.createRadialGradient(0, 0, 8, 0, 0, 52);
          haloG.addColorStop(0, `rgba(102,221,68,${pulse * 0.18})`);
          haloG.addColorStop(0.5, `rgba(68,170,34,${pulse * 0.10})`);
          haloG.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = haloG;
          ctx.beginPath(); ctx.arc(0, 0, 52, 0, Math.PI * 2); ctx.fill();

          // Outer rotating ring (leaf green dashes)
          ctx.save();
          ctx.rotate(t * 0.5);
          ctx.strokeStyle = `rgba(102,221,68,${pulse * 0.65})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 12]);
          ctx.beginPath(); ctx.arc(0, 0, 38, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Middle counter-rotating ring (amber dashes)
          ctx.save();
          ctx.rotate(-t * 0.8);
          ctx.strokeStyle = `rgba(255,204,68,${pulse2 * 0.55})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 8]);
          ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Inner glow core (green → amber → dark green)
          const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 24);
          coreGrad.addColorStop(0, `rgba(180,255,100,${pulse3 * 0.85})`);
          coreGrad.addColorStop(0.3, `rgba(102,221,68,${pulse2 * 0.55})`);
          coreGrad.addColorStop(0.7, `rgba(34,100,10,${pulse * 0.3})`);
          coreGrad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = coreGrad;
          ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();

          // Orbiting firefly particles (green / amber alternating)
          for (let i = 0; i < 6; i++) {
            const angle = t * 2 + (i * Math.PI) / 3;
            const dist = 20 + Math.sin(t * 3 + i) * 5;
            const px2 = Math.cos(angle) * dist;
            const py2 = Math.sin(angle) * dist;
            ctx.fillStyle = i % 2 === 0
              ? `rgba(102,221,68,${pulse})`
              : `rgba(255,204,68,${pulse})`;
            ctx.beginPath(); ctx.arc(px2, py2, 2.5, 0, Math.PI * 2); ctx.fill();
          }

          // Central bright core
          ctx.shadowColor = "#66DD44";
          ctx.shadowBlur = 22 * pulse;
          ctx.fillStyle = `rgba(200,255,150,${pulse3})`;
          ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();

          // Hexagon frame (green)
          ctx.shadowBlur = 16 * pulse;
          ctx.strokeStyle = `rgba(102,221,68,${pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const hx2 = Math.cos(angle) * 26;
            const hy2 = Math.sin(angle) * 26;
            if (i === 0) ctx.moveTo(hx2, hy2); else ctx.lineTo(hx2, hy2);
          }
          ctx.closePath(); ctx.stroke();
          ctx.shadowBlur = 0;

          ctx.fillStyle = near ? "#CCFFAA" : "#66DD44";
          ctx.font = "bold 9px Orbitron, monospace";
          ctx.textAlign = "center";
          ctx.shadowColor = "#66DD44";
          ctx.shadowBlur = 10;
          ctx.fillText("◈ PORTAL ◈", 0, -48);
          if (near) {
            ctx.fillStyle = "#CCFFAA";
            ctx.shadowColor = "#AAFF44";
            ctx.shadowBlur = 12;
            ctx.fillText("[E] TELEPORT", 0, -62);
          }
        } else if (!!this.map?.config?.campaign) {
          // ── CAMPAIGN: Gold war-gate portal — gold / amber rings ────
          const t = p._animT;
          const pulse2 = Math.sin(t * 2) * 0.3 + 0.7;
          const pulse3 = Math.sin(t * 4) * 0.2 + 0.8;

          // Outer soft gold halo
          const haloG = ctx.createRadialGradient(0, 0, 8, 0, 0, 52);
          haloG.addColorStop(0, `rgba(255,221,0,${pulse * 0.18})`);
          haloG.addColorStop(0.5, `rgba(200,120,0,${pulse * 0.10})`);
          haloG.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = haloG;
          ctx.beginPath(); ctx.arc(0, 0, 52, 0, Math.PI * 2); ctx.fill();

          // Outer rotating ring (gold dashes)
          ctx.save();
          ctx.rotate(t * 0.5);
          ctx.strokeStyle = `rgba(255,221,0,${pulse * 0.65})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 12]);
          ctx.beginPath(); ctx.arc(0, 0, 38, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Middle counter-rotating ring (amber dashes)
          ctx.save();
          ctx.rotate(-t * 0.8);
          ctx.strokeStyle = `rgba(255,170,0,${pulse2 * 0.55})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 8]);
          ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Inner glow core (gold → amber → orange)
          const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 24);
          coreGrad.addColorStop(0, `rgba(255,240,80,${pulse3 * 0.85})`);
          coreGrad.addColorStop(0.3, `rgba(255,170,0,${pulse2 * 0.55})`);
          coreGrad.addColorStop(0.7, `rgba(200,80,0,${pulse * 0.3})`);
          coreGrad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = coreGrad;
          ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();

          // Orbiting energy particles (gold / amber alternating)
          for (let i = 0; i < 6; i++) {
            const angle = t * 2 + (i * Math.PI) / 3;
            const dist = 20 + Math.sin(t * 3 + i) * 5;
            const px2 = Math.cos(angle) * dist;
            const py2 = Math.sin(angle) * dist;
            ctx.fillStyle = i % 2 === 0
              ? `rgba(255,221,0,${pulse})`
              : `rgba(255,136,0,${pulse})`;
            ctx.beginPath(); ctx.arc(px2, py2, 2.5, 0, Math.PI * 2); ctx.fill();
          }

          // Central bright core
          ctx.shadowColor = "#FFDD00";
          ctx.shadowBlur = 22 * pulse;
          ctx.fillStyle = `rgba(255,250,180,${pulse3})`;
          ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();

          // Hexagon frame (gold)
          ctx.shadowBlur = 16 * pulse;
          ctx.strokeStyle = `rgba(255,221,0,${pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const hx2 = Math.cos(angle) * 26;
            const hy2 = Math.sin(angle) * 26;
            if (i === 0) ctx.moveTo(hx2, hy2);
            else ctx.lineTo(hx2, hy2);
          }
          ctx.closePath(); ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.fillStyle = near ? "#FFF8AA" : "#FFDD00";
          ctx.font = "bold 9px Orbitron, monospace";
          ctx.textAlign = "center";
          ctx.shadowColor = "#FFDD00";
          ctx.shadowBlur = 10;
          ctx.fillText("◈ PORTAL ◈", 0, -48);
          if (near) {
            ctx.fillStyle = "#FFF8AA";
            ctx.shadowColor = "#FFAA00";
            ctx.shadowBlur = 12;
            ctx.fillText("[E] TELEPORT", 0, -62);
          }
        } else if (isDesert) {
          // ── DESERT SANDS: Ancient sand gate — amber / gold star rings ──
          const t = p._animT;
          const pulse2 = Math.sin(t * 2.2) * 0.3 + 0.7;
          const pulse3 = Math.sin(t * 4.5) * 0.2 + 0.8;

          // Wide soft sand-dust halo
          const haloG = ctx.createRadialGradient(0, 0, 10, 0, 0, 55);
          haloG.addColorStop(0, `rgba(255,200,60,${pulse * 0.20})`);
          haloG.addColorStop(0.5, `rgba(200,130,20,${pulse * 0.12})`);
          haloG.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = haloG;
          ctx.beginPath();
          ctx.arc(0, 0, 55, 0, Math.PI * 2);
          ctx.fill();

          // Outer rotating ring — amber dashes
          ctx.save();
          ctx.rotate(t * 0.4);
          ctx.strokeStyle = `rgba(255,200,60,${pulse * 0.72})`;
          ctx.lineWidth = 2.2;
          ctx.setLineDash([9, 11]);
          ctx.beginPath();
          ctx.arc(0, 0, 40, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Middle counter-rotating ring — sand-orange dashes
          ctx.save();
          ctx.rotate(-t * 0.7);
          ctx.strokeStyle = `rgba(255,140,20,${pulse2 * 0.62})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 9]);
          ctx.beginPath();
          ctx.arc(0, 0, 32, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Inner fast ring — pale gold shimmer
          ctx.save();
          ctx.rotate(t * 1.3);
          ctx.strokeStyle = `rgba(255,230,120,${pulse3 * 0.30})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 7]);
          ctx.beginPath();
          ctx.arc(0, 0, 23, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Desert core gradient — sun / sandstone / deep terracotta
          const coreG = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
          coreG.addColorStop(0, `rgba(255,250,180,${pulse3 * 0.95})`);
          coreG.addColorStop(0.25, `rgba(255,180,40,${pulse2 * 0.72})`);
          coreG.addColorStop(0.65, `rgba(160,70,10,${pulse * 0.42})`);
          coreG.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = coreG;
          ctx.beginPath();
          ctx.arc(0, 0, 26, 0, Math.PI * 2);
          ctx.fill();

          // Orbiting particles — 8 alternating gold + amber sand motes
          for (let i = 0; i < 8; i++) {
            const angle = t * 1.8 + (i * Math.PI) / 4;
            const dist = 24 + Math.sin(t * 2.5 + i * 1.2) * 6;
            const gp = Math.cos(angle) * dist;
            const hp = Math.sin(angle) * dist;
            const r = i % 3 === 0 ? 3 : 2;
            ctx.fillStyle = i % 2 === 0
              ? `rgba(255,200,60,${pulse})`
              : `rgba(255,140,20,${pulse2})`;
            ctx.beginPath();
            ctx.arc(gp, hp, r, 0, Math.PI * 2);
            ctx.fill();
          }

          // Bright central sun core
          ctx.shadowColor = "#FFB830";
          ctx.shadowBlur = 24 * pulse;
          ctx.fillStyle = `rgba(255,250,180,${pulse3})`;
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.fill();

          // 8-point ankh/star-gate frame — gold
          ctx.shadowBlur = 16 * pulse;
          ctx.strokeStyle = `rgba(255,200,60,${pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const ang = (Math.PI / 4) * i - Math.PI / 2;
            const fr = i % 2 === 0 ? 30 : 20;
            const fx = Math.cos(ang) * fr;
            const fy = Math.sin(ang) * fr;
            i === 0 ? ctx.moveTo(fx, fy) : ctx.lineTo(fx, fy);
          }
          ctx.closePath();
          ctx.stroke();

          // Sand-orange accent ring
          ctx.shadowBlur = 8 * pulse2;
          ctx.strokeStyle = `rgba(255,140,20,${pulse2 * 0.45})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, 25, 0, Math.PI * 2);
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.fillStyle = near ? "#FFF0A0" : "#FFD060";
          ctx.font = "bold 9px Orbitron, monospace";
          ctx.textAlign = "center";
          ctx.shadowColor = "#FF9900";
          ctx.shadowBlur = 12;
          ctx.fillText("⬡ SAND GATE ⬡", 0, -52);
          if (near) {
            ctx.fillStyle = "#FFF0A0";
            ctx.shadowColor = "#FFD700";
            ctx.shadowBlur = 14;
            ctx.fillText("[E]  ENTER GATE", 0, -66);
          }
        } else if (isNeonCity || isRobotCity) {
          // ── NEON CITY: Cyber warp gate — cyan / magenta ───────────
          const t = p._animT;
          const pulse2 = Math.sin(t * 2.2) * 0.3 + 0.7;
          const pulse3 = Math.sin(t * 4.5) * 0.2 + 0.8;

          // Wide neon halo mist
          const haloG = ctx.createRadialGradient(0, 0, 10, 0, 0, 55);
          haloG.addColorStop(0, `rgba(0,255,255,${pulse * 0.18})`);
          haloG.addColorStop(0.5, `rgba(180,0,255,${pulse * 0.1})`);
          haloG.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = haloG;
          ctx.beginPath();
          ctx.arc(0, 0, 55, 0, Math.PI * 2);
          ctx.fill();

          // Outer rotating ring — cyan dashes
          ctx.save();
          ctx.rotate(t * 0.4);
          ctx.strokeStyle = `rgba(0,255,255,${pulse * 0.7})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([9, 11]);
          ctx.beginPath();
          ctx.arc(0, 0, 40, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Middle counter-rotating ring — magenta dashes
          ctx.save();
          ctx.rotate(-t * 0.7);
          ctx.strokeStyle = `rgba(255,0,255,${pulse2 * 0.6})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 9]);
          ctx.beginPath();
          ctx.arc(0, 0, 32, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Inner fast ring — faint electric blue
          ctx.save();
          ctx.rotate(t * 1.3);
          ctx.strokeStyle = `rgba(100,200,255,${pulse3 * 0.28})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 7]);
          ctx.beginPath();
          ctx.arc(0, 0, 23, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Deep neon core gradient
          const coreG = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
          coreG.addColorStop(0, `rgba(200,255,255,${pulse3 * 0.95})`);
          coreG.addColorStop(0.25, `rgba(0,220,255,${pulse2 * 0.7})`);
          coreG.addColorStop(0.65, `rgba(140,0,200,${pulse * 0.4})`);
          coreG.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = coreG;
          ctx.beginPath();
          ctx.arc(0, 0, 26, 0, Math.PI * 2);
          ctx.fill();

          // Orbiting particles — 8 alternating cyan + magenta
          for (let i = 0; i < 8; i++) {
            const angle = t * 1.8 + (i * Math.PI) / 4;
            const dist = 24 + Math.sin(t * 2.5 + i * 1.2) * 6;
            const gp = Math.cos(angle) * dist;
            const hp = Math.sin(angle) * dist;
            const r = i % 3 === 0 ? 2.8 : 1.8;
            ctx.fillStyle =
              i % 2 === 0
                ? `rgba(0,255,255,${pulse})`
                : `rgba(255,0,255,${pulse2})`;
            ctx.beginPath();
            ctx.arc(gp, hp, r, 0, Math.PI * 2);
            ctx.fill();
          }

          // Bright central core
          ctx.shadowColor = "#00FFFF";
          ctx.shadowBlur = 24 * pulse;
          ctx.fillStyle = `rgba(220,255,255,${pulse3})`;
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.fill();

          // 8-point cyber-gate frame — cyan
          ctx.shadowBlur = 16 * pulse;
          ctx.strokeStyle = `rgba(0,255,255,${pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const ang = (Math.PI / 4) * i - Math.PI / 2;
            const r = i % 2 === 0 ? 30 : 20;
            const fx = Math.cos(ang) * r;
            const fy = Math.sin(ang) * r;
            i === 0 ? ctx.moveTo(fx, fy) : ctx.lineTo(fx, fy);
          }
          ctx.closePath();
          ctx.stroke();

          // Magenta accent ring
          ctx.shadowBlur = 8 * pulse2;
          ctx.strokeStyle = `rgba(255,0,255,${pulse2 * 0.45})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, 25, 0, Math.PI * 2);
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.fillStyle = near ? "#AAFFFF" : "#00FFFF";
          ctx.font = "bold 9px Orbitron, monospace";
          ctx.textAlign = "center";
          ctx.shadowColor = "#00FFFF";
          ctx.shadowBlur = 12;
          ctx.fillText("◈ CYBER GATE ◈", 0, -52);
          if (near) {
            ctx.fillStyle = "#AAFFFF";
            ctx.shadowColor = "#00FFFF";
            ctx.shadowBlur = 14;
            ctx.fillText("[E]  ENTER GATE", 0, -66);
          }
        } else if (isGalactica) {
          // ── GALACTICA: Cosmic warp gate — purple / gold star rings ─
          const t = p._animT;
          const pulse2 = Math.sin(t * 2.2) * 0.3 + 0.7;
          const pulse3 = Math.sin(t * 4.5) * 0.2 + 0.8;

          // Wide soft nebula halo
          const haloG = ctx.createRadialGradient(0, 0, 10, 0, 0, 55);
          haloG.addColorStop(0, `rgba(140,60,255,${pulse * 0.18})`);
          haloG.addColorStop(0.5, `rgba(80,0,180,${pulse * 0.1})`);
          haloG.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = haloG;
          ctx.beginPath();
          ctx.arc(0, 0, 55, 0, Math.PI * 2);
          ctx.fill();

          // Outer rotating ring — purple dashes
          ctx.save();
          ctx.rotate(t * 0.4);
          ctx.strokeStyle = `rgba(180,80,255,${pulse * 0.7})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([9, 11]);
          ctx.beginPath();
          ctx.arc(0, 0, 40, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Middle counter-rotating ring — gold dashes
          ctx.save();
          ctx.rotate(-t * 0.7);
          ctx.strokeStyle = `rgba(255,200,40,${pulse2 * 0.6})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 9]);
          ctx.beginPath();
          ctx.arc(0, 0, 32, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Inner fast ring — faint lavender
          ctx.save();
          ctx.rotate(t * 1.3);
          ctx.strokeStyle = `rgba(210,170,255,${pulse3 * 0.28})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 7]);
          ctx.beginPath();
          ctx.arc(0, 0, 23, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Deep-space core gradient
          const coreG = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
          coreG.addColorStop(0, `rgba(240,200,255,${pulse3 * 0.95})`);
          coreG.addColorStop(0.25, `rgba(160,60,255,${pulse2 * 0.7})`);
          coreG.addColorStop(0.65, `rgba(60,0,120,${pulse * 0.4})`);
          coreG.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = coreG;
          ctx.beginPath();
          ctx.arc(0, 0, 26, 0, Math.PI * 2);
          ctx.fill();

          // Orbiting particles — 8 alternating purple + gold stars
          for (let i = 0; i < 8; i++) {
            const angle = t * 1.8 + (i * Math.PI) / 4;
            const dist = 24 + Math.sin(t * 2.5 + i * 1.2) * 6;
            const gp = Math.cos(angle) * dist;
            const hp = Math.sin(angle) * dist;
            const r = i % 3 === 0 ? 2.8 : 1.8;
            ctx.fillStyle =
              i % 2 === 0
                ? `rgba(180,90,255,${pulse})`
                : `rgba(255,200,40,${pulse2})`;
            ctx.beginPath();
            ctx.arc(gp, hp, r, 0, Math.PI * 2);
            ctx.fill();
          }

          // Bright central star core
          ctx.shadowColor = "#BB66FF";
          ctx.shadowBlur = 24 * pulse;
          ctx.fillStyle = `rgba(255,240,200,${pulse3})`;
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.fill();

          // 8-point star-gate frame
          ctx.shadowBlur = 16 * pulse;
          ctx.strokeStyle = `rgba(180,80,255,${pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const ang = (Math.PI / 4) * i - Math.PI / 2;
            const r = i % 2 === 0 ? 30 : 20;
            const fx = Math.cos(ang) * r;
            const fy = Math.sin(ang) * r;
            i === 0 ? ctx.moveTo(fx, fy) : ctx.lineTo(fx, fy);
          }
          ctx.closePath();
          ctx.stroke();

          // Gold accent ring on 8-point frame
          ctx.shadowBlur = 8 * pulse2;
          ctx.strokeStyle = `rgba(255,200,40,${pulse2 * 0.45})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, 25, 0, Math.PI * 2);
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.fillStyle = near ? "#FFE080" : "#BB88FF";
          ctx.font = "bold 9px Orbitron, monospace";
          ctx.textAlign = "center";
          ctx.shadowColor = "#8844FF";
          ctx.shadowBlur = 12;
          ctx.fillText("⬡ WARP GATE ⬡", 0, -52);
          if (near) {
            ctx.fillStyle = "#FFE080";
            ctx.shadowColor = "#FFD700";
            ctx.shadowBlur = 14;
            ctx.fillText("[E]  ENTER WARP", 0, -66);
          }
        } else if (!!this.map.config.jungle) {
          // ── JUNGLE SAFARI: Bioluminescent vine gate — leaf green / firefly amber ──
          const t = p._animT;
          const pulse2 = Math.sin(t * 2.2) * 0.3 + 0.7;
          const pulse3 = Math.sin(t * 4.5) * 0.2 + 0.8;

          // Wide soft jungle mist halo
          const haloGJ = ctx.createRadialGradient(0, 0, 10, 0, 0, 55);
          haloGJ.addColorStop(0, `rgba(68,221,34,${pulse * 0.18})`);
          haloGJ.addColorStop(0.5, `rgba(30,120,10,${pulse * 0.10})`);
          haloGJ.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = haloGJ;
          ctx.beginPath();
          ctx.arc(0, 0, 55, 0, Math.PI * 2);
          ctx.fill();

          // Outer rotating ring — bright leaf green dashes
          ctx.save();
          ctx.rotate(t * 0.4);
          ctx.strokeStyle = `rgba(68,221,34,${pulse * 0.72})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([9, 11]);
          ctx.beginPath();
          ctx.arc(0, 0, 40, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Middle counter-rotating ring — firefly amber dashes
          ctx.save();
          ctx.rotate(-t * 0.7);
          ctx.strokeStyle = `rgba(255,170,68,${pulse2 * 0.62})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 9]);
          ctx.beginPath();
          ctx.arc(0, 0, 32, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Inner fast ring — pale lime shimmer
          ctx.save();
          ctx.rotate(t * 1.3);
          ctx.strokeStyle = `rgba(160,255,80,${pulse3 * 0.30})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 7]);
          ctx.beginPath();
          ctx.arc(0, 0, 23, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Deep jungle core gradient — lime → jungle green → near black
          const coreGJ = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
          coreGJ.addColorStop(0, `rgba(180,255,80,${pulse3 * 0.95})`);
          coreGJ.addColorStop(0.25, `rgba(68,221,34,${pulse2 * 0.72})`);
          coreGJ.addColorStop(0.65, `rgba(20,80,8,${pulse * 0.42})`);
          coreGJ.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = coreGJ;
          ctx.beginPath();
          ctx.arc(0, 0, 26, 0, Math.PI * 2);
          ctx.fill();

          // Orbiting particles — 8 alternating leaf green + firefly amber
          for (let i = 0; i < 8; i++) {
            const angle = t * 1.8 + (i * Math.PI) / 4;
            const dist = 24 + Math.sin(t * 2.5 + i * 1.2) * 6;
            const gpJ = Math.cos(angle) * dist;
            const hpJ = Math.sin(angle) * dist;
            const rJ = i % 3 === 0 ? 2.8 : 1.8;
            ctx.fillStyle = i % 2 === 0
              ? `rgba(68,221,34,${pulse})`
              : `rgba(255,170,68,${pulse2})`;
            ctx.beginPath();
            ctx.arc(gpJ, hpJ, rJ, 0, Math.PI * 2);
            ctx.fill();
          }

          // Bright central bioluminescent core
          ctx.shadowColor = "#44DD22";
          ctx.shadowBlur = 24 * pulse;
          ctx.fillStyle = `rgba(200,255,140,${pulse3})`;
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.fill();

          // 8-point vine/leaf gate frame — jungle green
          ctx.shadowBlur = 16 * pulse;
          ctx.strokeStyle = `rgba(68,221,34,${pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const ang = (Math.PI / 4) * i - Math.PI / 2;
            const fr = i % 2 === 0 ? 30 : 20;
            const fxJ = Math.cos(ang) * fr;
            const fyJ = Math.sin(ang) * fr;
            i === 0 ? ctx.moveTo(fxJ, fyJ) : ctx.lineTo(fxJ, fyJ);
          }
          ctx.closePath();
          ctx.stroke();

          // Amber firefly accent ring
          ctx.shadowBlur = 8 * pulse2;
          ctx.strokeStyle = `rgba(255,170,68,${pulse2 * 0.45})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, 25, 0, Math.PI * 2);
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.fillStyle = near ? "#CCFFAA" : "#44DD22";
          ctx.font = "bold 9px Orbitron, monospace";
          ctx.textAlign = "center";
          ctx.shadowColor = "#22BB00";
          ctx.shadowBlur = 12;
          ctx.fillText("🌿 VINE GATE 🌿", 0, -52);
          if (near) {
            ctx.fillStyle = "#CCFFAA";
            ctx.shadowColor = "#88FF44";
            ctx.shadowBlur = 14;
            ctx.fillText("[E]  ENTER GATE", 0, -66);
          }
        } else {
          // ── DEFAULT portal style ──────────────────────────────────
          ctx.shadowColor = "#44EEFF";
          ctx.shadowBlur = 28 * pulse;
          ctx.fillStyle = `rgba(0,120,200,${pulse * 0.25})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, 22, 34, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = `rgba(68,238,255,${pulse})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, 22, 34, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,255,${pulse * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(0, 0, 13, 20, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.fillStyle = near ? "#FFFFAA" : "#88FFFF";
          ctx.font = `bold 8px Orbitron, monospace`;
          ctx.textAlign = "center";
          ctx.fillText("PORTAL", 0, -40);
          if (near) {
            ctx.fillStyle = "#FFFFAA";
            ctx.shadowColor = "#FFFF00";
            ctx.shadowBlur = 8;
            ctx.fillText("[E] TELEPORT", 0, -52);
          }
        }
        ctx.restore();
      }

      // Black market vendor NPC
      if (this._bmVendor && this._nightAlpha > 0.1) {
        ctx.save();
        ctx.shadowColor = "#00FFCC";
        ctx.shadowBlur = 30;
        ctx.fillStyle = "#00FFCC";
        ctx.strokeStyle = "#00CCAA";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this._bmVendor.x, this._bmVendor.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#111";
        ctx.font = "bold 9px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("⬢", this._bmVendor.x, this._bmVendor.y + 4);
        if (
          Math.hypot(
            this._bmVendor.x - this.player.x,
            this._bmVendor.y - this.player.y,
          ) < 70
        ) {
          ctx.fillStyle = "#FFAA00";
          ctx.font = "bold 11px Orbitron, monospace";
          ctx.shadowColor = "#FF8800";
          ctx.shadowBlur = 10;
          ctx.fillText(
            "[N] BLACK MARKET",
            this._bmVendor.x,
            this._bmVendor.y - 24,
          );
        }
        ctx.restore();
      }

      // "[F] ENTER" hint near vehicles, "[E] ENTER" hint near doors
      if (!this._playerVehicle && !this.player.dead) {
        for (const v of this.vehicles) {
          if (v.dead || v._exploding || v.occupied) continue;
          if (Math.hypot(v.x - this.player.x, v.y - this.player.y) < 74) {
            ctx.save();
            ctx.font = "bold 11px Orbitron, monospace";
            ctx.textAlign = "center";
            ctx.fillStyle = "#FFFFAA";
            ctx.shadowColor = "#FFFF00";
            ctx.shadowBlur = 10;
            ctx.fillText("[F] ENTER", v.x, v.y - v.radius - 18);
            ctx.restore();
          }
        }
        for (const door of this.map.doors) {
          if (
            Math.hypot(door.wx - this.player.x, door.wy - this.player.y) < 55
          ) {
            ctx.save();
            ctx.font = "bold 11px Orbitron, monospace";
            ctx.textAlign = "center";
            const hintText =
              door.specialType === "dealership"
                ? "[E] CAR SHOP"
                : door.specialType === "casino"
                  ? "[E] CASINO"
                  : "[E] ENTER";
            ctx.fillStyle =
              door.specialType === "dealership"
                ? "#FFDD44"
                : door.specialType === "casino"
                  ? "#FF44AA"
                  : "#FFFFAA";
            ctx.shadowColor =
              door.specialType === "dealership"
                ? "#FFBB00"
                : door.specialType === "casino"
                  ? "#FF0088"
                  : "#FFFF00";
            ctx.shadowBlur = 10;
            ctx.fillText(hintText, door.wx, door.wy - 16);
            ctx.restore();
          }
        }
        // Metro entrance hint
        if (this.map.metroEntrance) {
          const me = this.map.metroEntrance;
          if (Math.hypot(me.wx - this.player.x, me.wy - this.player.y) < 70) {
            const isRobotHint = !!this.map.config.robot;
            ctx.save();
            ctx.font = "bold 11px Orbitron, monospace";
            ctx.textAlign = "center";
            const isWasteland = !!this.map.config.wasteland;
            ctx.fillStyle = isWasteland ? "#FF8844" : "#44FF88";
            ctx.shadowColor = isWasteland ? "#FF6622" : "#22FF66";
            ctx.fillStyle = isRobotHint ? "#44DDFF" : "#44FF88";
            ctx.shadowColor = isRobotHint ? "#00CCFF" : "#22FF66";
            ctx.shadowBlur = 14;
            ctx.fillText(isRobotHint ? "[E] TRANSIT" : "[E] METRO", me.wx, me.wy - 40);
            ctx.restore();
          }
        }
      }

      ctx.restore();
    }

    // Night overlay (screen-space)
    if (this._nightAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = this._nightAlpha;
      ctx.fillStyle = this.map.config.snow ? "#000e28" : "#000820";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Snow map: permanent cold-blue tint (always winter)
    if (this.map.config.snow) {
      ctx.save();
      ctx.fillStyle = "rgba(8,32,72,0.16)";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // Robot City: subtle electric-cyan tint
    if (this._robotMode) {
      ctx.save();
      ctx.fillStyle = "rgba(0,40,60,0.14)";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // Jungle: warm green-amber tint
    if (this._jungleMode) {
      ctx.save();
      ctx.fillStyle = "rgba(10,30,5,0.12)";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // Desert: warm sandy haze tint
    if (this._desertMode) {
      ctx.save();
      ctx.fillStyle = "rgba(30,18,4,0.10)";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // Galactica: deep space darkness tint
    if (this._galacticaMode) {
      ctx.save();
      ctx.fillStyle = "rgba(2,0,18,0.14)";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // Sky Realm: soft aerial haze tint
    if (this._skyMode) {
      ctx.save();
      ctx.fillStyle = "rgba(135,206,235,0.05)";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // Dino: lush prehistoric green tint
    if (this._dinoMode) {
      ctx.save();
      ctx.fillStyle = "rgba(5,18,2,0.11)";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Tower: elevator in world-space
    if (this._towerMode) {
      ctx.save();
      ctx.translate(-this.camX + shake.x, -this.camY + shake.y);
      this.map.renderTowerElevator(
        ctx,
        this._towerElevatorActive,
        this._towerFloor,
      );
      ctx.restore();
    }

    // Street light glows — additive, world-space, after night overlay
    // so the warm halos visibly punch through the darkness
    if (!this._indoor && this._nightAlpha > 0.01) {
      ctx.save();
      ctx.translate(-this.camX + shake.x, -this.camY + shake.y);
      this.map.renderStreetLightGlows(
        ctx,
        this.camX,
        this.camY,
        W,
        H,
        this._nightAlpha,
      );
      ctx.restore();
    }

    // ── Global Event overlays ─────────────────────────────
    if (this._globalEvent) {
      if (this._globalEvent.id === "blackout") {
        const psx = this.player.x - this.camX;
        const psy = this.player.y - this.camY;
        const grad = ctx.createRadialGradient(
          psx,
          psy,
          55,
          psx,
          psy,
          Math.max(W, H),
        );
        grad.addColorStop(0, "rgba(0,4,8,0)");
        grad.addColorStop(0.18, "rgba(0,4,8,0.88)");
        grad.addColorStop(1, "rgba(0,4,8,0.97)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }
      if (this._globalEvent.id === "cyber_virus") {
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = "#00FFFF";
        for (let yl = 0; yl < H; yl += 4) ctx.fillRect(0, yl, W, 1);
        if (Math.random() < 0.25) {
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = Math.random() < 0.5 ? "#00FFFF" : "#FF00AA";
          ctx.fillRect(0, Math.random() * H, W, 2 + Math.random() * 6);
        }
        ctx.restore();
      }
      if (this._globalEvent.id === "glitch_mode") {
        ctx.save();
        // Purple scanlines
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = "#AA44FF";
        for (let yl = 0; yl < H; yl += 3) ctx.fillRect(0, yl, W, 1);
        // Glitch strips
        if (Math.random() < 0.35) {
          const gy = Math.random() * H,
            gh = 2 + Math.random() * 10;
          ctx.globalAlpha = 0.22;
          ctx.fillStyle = Math.random() < 0.5 ? "#AA00FF" : "#00FFAA";
          ctx.fillRect(0, gy, W, gh);
          ctx.globalAlpha = 0.14;
          ctx.fillStyle = "#FF00AA";
          ctx.fillRect(rnd(-30, 30), gy, W, gh);
        }
        // Pixel corruption bursts
        if (Math.random() < 0.18) {
          ctx.globalAlpha = 0.5;
          for (let i = 0; i < 6; i++) {
            ctx.fillStyle = Math.random() < 0.5 ? "#AA44FF" : "#44FFCC";
            ctx.fillRect(
              Math.random() * W,
              Math.random() * H,
              rnd(2, 24),
              rnd(1, 4),
            );
          }
        }
        // Vignette tint
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = "#5500AA";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    // ── Force screen-space before HUD ──────────────────────
    // If any entity render threw (unmatched ctx.save), the transform may be
    // in world-space; setTransform resets it unconditionally so HUD always shows.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Weather (screen-space, drawn over world)
    this.weather.render(ctx, W, H);

    // HUD
    const playing = this.state !== "gameover";
    if (playing) {
      this.hud.renderMinimap(
        this.map,
        this.player,
        this.bots,
        this.camX,
        this.camY,
        this.boss,
        this._districtLayout,
        this.vehicles,
      );
      if (this._waypointDoor)
        this.hud.renderWaypointNav(this.player, this._waypointDoor, this.map);
      this.hud.renderHealthBar(this.player);
      this.hud.renderControls(this._arenaMode, this._isMobile);
      if (this._isMobile) this.hud.renderMobileHints(this._arenaMode);
      this.hud.renderMoney(this.money);
      this.hud.renderKills(this.kills);
      if (this._arenaMode) {
        const remaining = Math.max(0, this._arenaWaveSize - this._arenaKilled);
        this.hud.renderWave(
          this.wave,
          remaining,
          !!(this.boss && !this.boss.dead),
        );
        if (this._arenaCountdown > 0)
          this.hud.renderArenaCountdown(this._arenaCountdown);
      } else if (this._zombieMode) {
        const remaining = this.bots.filter((b) => !b.dead && !b.dying).length;
        this.hud.renderZombieWave(
          this.wave,
          remaining,
          this._zombieCountdown,
          this._zombieWaveSize,
        );
        if (this._zombieCountdown > 0)
          this.hud.renderArenaCountdown(this._zombieCountdown);
      } else if (!this._lifeMode && !this._towerMode) {
        this.hud.renderWave(
          this.wave,
          this.bots.length,
          !!(this.boss && !this.boss.dead),
        );
      }
      if (this._wantedLevel > 0 && !this._zombieMode) {
        this.hud.renderWantedLevel(this._wantedLevel, this._wantedDecay);
      }
      this.hud.renderWeaponInfo(this.player);
      if (this._grenadeCount > 0)
        this.hud.renderGrenadeCount(this._grenadeCount);
      if (
        !this._arenaMode &&
        !this._zombieMode &&
        !this._lifeMode &&
        !this._blitzMode &&
        !this._towerMode
      )
        this.hud.renderShopButton(this.state === "shop", this._isMobile);
      if (this._hardcoreMode)
        this.hud.renderModeBadge("⚡ HARDCORE · 2× DMG · 3× $", "#FF8800");
      if (this._blitzMode)
        this.hud.renderModeBadge("⚡ BLITZ · 3× SPEED · 5× $", "#FF4400");
      if (this._campaignMode)
        this.hud.renderCampaignLevel(
          this._campaignLevel,
          this._campaignKills,
          this._campaignTarget,
          this._levelComplete,
          this._levelCompleteT,
        );
      if (this._towerMode) this._renderTowerHUD(ctx, W, H);
      if (this.player.companion && !this.player.companion.dead)
        this.hud.renderCompanionHP(this.player.companion);
      if (this.player._buffs && this.player._buffs.size > 0)
        this.hud.renderActiveBuffs(this.player._buffs);
      this.hud.renderAchButton(this._achPanelOpen);
      if (!this._zombieMode && !this._lifeMode)
        this.hud.renderDayNight(this._nightAlpha, this._gameTime);
      if (this._globalEvent)
        this.hud.renderEventBanner(
          ctx,
          W,
          H,
          this._globalEvent,
          this._eventAnnounceTimer,
        );
      if (this._playerDrone)
        this.hud.renderDroneStatus(this._playerDrone, this._droneControl);
      this.hud.renderDamageNumbers();
      this.hud.renderSurviveTimer(ctx, W, this._surviveTime);
      if (this._districtLayout && this._currentDistrict) {
        this.hud.renderDistrictHUD(
          this._districtLayout,
          this._reputation,
          this._currentDistrict,
          this._shopDiscount,
        );
      }
      if (this.boss && !this.boss.dead && !this.boss.dying) {
        this.hud.renderBossBar(this.boss);
      }
      if (this._killStreak >= 2 || this._streakPopup.timer > 0) {
        this.hud.renderKillStreak(
          this._killStreak,
          this._streakMultiplier(),
          this._streakPopup,
          this._streakTimer,
        );
      }
      if (this._playerVehicle) {
        this.hud.renderVehicleHud(this._playerVehicle);
      }
      if (
        !this.player.dead &&
        this.state === "playing" &&
        !this._playerVehicle
      ) {
        this.hud.renderCrosshair(
          this.input.mouseScreen.x,
          this.input.mouseScreen.y,
        );
      }
    }

    // ACH button click (bottom-right area: W-136, H-66, 124×26)
    if (this.input.mouseJustDown && this.state === "playing") {
      const mx = this.input.mouseScreen.x,
        my = this.input.mouseScreen.y;
      const ax = W - 136,
        ay = H - 66;
      if (mx >= ax && mx <= ax + 124 && my >= ay && my <= ay + 26) {
        this._achPanelOpen = !this._achPanelOpen;
      }
    }

    if (this.state === "paused") {
      const mx = this.input.mouseScreen.x,
        my = this.input.mouseScreen.y;
      const pauseButtons = this.hud.renderPause(mx, my);

      // Handle button clicks
      if (this.input.mouseJustDown && pauseButtons) {
        // Check Resume button
        if (pauseButtons.resume) {
          const btn = pauseButtons.resume;
          if (
            mx >= btn.x &&
            mx <= btn.x + btn.w &&
            my >= btn.y &&
            my <= btn.y + btn.h
          ) {
            this.state = "playing";
          }
        }
        // Check Back to Maps button
        if (pauseButtons.maps) {
          const btn = pauseButtons.maps;
          if (
            mx >= btn.x &&
            mx <= btn.x + btn.w &&
            my >= btn.y &&
            my <= btn.y + btn.h
          ) {
            this._destroy();
            window.location.href = "index.html";
          }
        }
      }
    }
    if (this.state === "gameover") {
      // Save session to backend once (first gameover frame)
      this._onGameOver();
      if (this._towerVictory) {
        this._renderTowerVictory(ctx, W, H);
        // Only respond to OK button click
        if (this.input.mouseJustDown && this._towerVictoryBtn) {
          const mx = this.input.mouseScreen.x,
            my = this.input.mouseScreen.y;
          const btn = this._towerVictoryBtn;
          if (
            mx >= btn.x &&
            mx <= btn.x + btn.w &&
            my >= btn.y &&
            my <= btn.y + btn.h
          ) {
            this._destroy();
            window.location.href = "index.html";
          }
        }
      } else {
        const mx = this.input.mouseScreen.x,
          my = this.input.mouseScreen.y;
        const gameOverButtons = this.hud.renderGameOver(
          this.money,
          this.kills,
          this._surviveTime,
          mx,
          my,
        );

        // Handle button clicks (same pattern as keyboard R handler)
        if (this.input.mouseJustDown && gameOverButtons) {
          // Check Restart button
          const restartBtn = gameOverButtons.restart;
          if (
            restartBtn &&
            mx >= restartBtn.x &&
            mx <= restartBtn.x + restartBtn.w &&
            my >= restartBtn.y &&
            my <= restartBtn.y + restartBtn.h
          ) {
            this._destroy();
            window.startGame(this.charData, this.map.config);
            return;
          }
          // Check Main Menu button
          const menuBtn = gameOverButtons.menu;
          if (
            menuBtn &&
            mx >= menuBtn.x &&
            mx <= menuBtn.x + menuBtn.w &&
            my >= menuBtn.y &&
            my <= menuBtn.y + menuBtn.h
          ) {
            this._destroy();
            window.location.href = "index.html";
            return;
          }
        }
      }
    }

    // Tower floor transition fade
    if (this._towerMode && this._towerTransitionAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0,0,0,${this._towerTransitionAlpha})`;
      ctx.fillRect(0, 0, W, H);
      // Floor number during fade-in
      if (
        this._towerTransitionState === 2 &&
        this._towerTransitionAlpha > 0.5
      ) {
        ctx.font = "bold 48px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#FFD700";
        ctx.shadowColor = "#FFD700";
        ctx.shadowBlur = 24;
        ctx.fillText(`FLOOR ${this._towerFloor}`, W / 2, H / 2 - 20);
        ctx.shadowBlur = 0;
        ctx.font = "22px monospace";
        ctx.fillStyle = "#CCCCCC";
        ctx.fillText(
          this._towerFloorSubtitle(this._towerFloor),
          W / 2,
          H / 2 + 20,
        );
      }
      ctx.restore();
    }

    // Shop overlay
    if (this.state === "shop") {
      this.shop._guardCount = this._bodyguards.length;
      this.shop.render(
        ctx,
        W,
        H,
        this.player,
        this.money,
        this.input.mouseScreen.x,
        this.input.mouseScreen.y,
      );
      if (this.input.mouseJustDown) {
        this.shop.handleClick(
          this.input.mouseScreen.x,
          this.input.mouseScreen.y,
          this.player,
          this,
        );
        if (!this.shop.isOpen) this.state = "playing";
      }
    }

    // Car dealership overlay
    if (this.state === "carshop") {
      this._dealership.render(
        ctx,
        W,
        H,
        this.player,
        this.money,
        this._grenadeCount,
        this.input.mouseScreen.x,
        this.input.mouseScreen.y,
      );
      if (this.input.mouseJustDown) {
        this._dealership.handleClick(
          this.input.mouseScreen.x,
          this.input.mouseScreen.y,
          this.player,
          this,
        );
        if (!this._dealership.isOpen) this.state = "playing";
      }
    }

    // Casino overlay
    if (this.state === "casino") {
      this._casino.render(
        ctx,
        W,
        H,
        this.player,
        this.money,
        this.input.mouseScreen.x,
        this.input.mouseScreen.y,
      );
      if (this.input.mouseJustDown) {
        this._casino.handleClick(
          this.input.mouseScreen.x,
          this.input.mouseScreen.y,
          this.player,
          this,
        );
        if (!this._casino.isOpen) this.state = "playing";
      }
    }

    // Building NPC shop overlay
    if (this.state === "buildingshop") {
      this._buildingShop.render(
        ctx,
        W,
        H,
        this.player,
        this.money,
        this.input.mouseScreen.x,
        this.input.mouseScreen.y,
      );
      if (this.input.mouseJustDown) {
        this._buildingShop.handleClick(
          this.input.mouseScreen.x,
          this.input.mouseScreen.y,
          this.player,
          this,
        );
        if (!this._buildingShop.isOpen) this.state = "playing";
      }
    }

    // Black market overlay
    if (this.state === "blackmarket" && this._bmOpen) {
      const clickAreas = this.hud.renderBlackMarket(
        ctx,
        W,
        H,
        CONFIG.BLACK_MARKET,
        this.money,
        this.input.mouseScreen.x,
        this.input.mouseScreen.y,
        this._bmBought,
      );
      if (this.input.mouseJustDown) {
        const mx = this.input.mouseScreen.x,
          my = this.input.mouseScreen.y;
        for (const ca of clickAreas) {
          if (
            mx >= ca.ix &&
            mx <= ca.ix + ca.itemW &&
            my >= ca.iy &&
            my <= ca.iy + ca.itemH
          ) {
            const item = ca.item;
            // Non-consumable implants can only be bought once
            const isOnce =
              item.type === "implant" && item.effect === "overclock";
            if (!this._bmBought.has(item.id) && this.money >= item.price) {
              this.money -= item.price;
              this._applyBmItem(item);
              if (isOnce) this._bmBought.add(item.id);
              window.audio?.[item.type === "implant" ? "upgrade" : "buy"]();
            }
            break;
          }
        }
      }
    }

    // ── Big-map overlay ───────────────────────────────────────
    if (this.state === "bigmap") {
      const mx = this.input.mouseScreen.x,
        my = this.input.mouseScreen.y;
      const hoveredDoor = this.hud.renderBigMap(
        ctx,
        W,
        H,
        this.map,
        this.player,
        this.map.doors,
        this._waypointDoor,
        mx,
        my,
      );
      if (this.input.mouseJustDown) {
        if (hoveredDoor) {
          // Toggle: click same door/metro again clears waypoint, otherwise set it
          let same = false;
          if (this._waypointDoor) {
            if (hoveredDoor.isMetro && this._waypointDoor.isMetro) {
              // Both are metro
              same = true;
            } else if (!hoveredDoor.isMetro && !this._waypointDoor.isMetro) {
              // Both are doors
              same = this._waypointDoor.tx === hoveredDoor.tx &&
                     this._waypointDoor.ty === hoveredDoor.ty;
            }
          }
          this._waypointDoor = same ? null : hoveredDoor;
          this.state = "playing";
        } else {
          // Click empty space closes map
          this.state = "playing";
        }
      }
    }

    // Achievement popup
    if (this._achPopup) {
      const ap = this._achPopup;
      const alpha = clamp(Math.min(ap.timer, 3.5 - ap.timer) * 1.5, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(0,0,0,0.80)";
      ctx.beginPath();
      ctx.roundRect(W / 2 - 140, 28, 280, 50, 8);
      ctx.fill();
      ctx.strokeStyle = "#FFCC00";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#FFCC00";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(W / 2 - 140, 28, 280, 50, 8);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#FFCC00";
      ctx.font = "bold 9px Orbitron, monospace";
      ctx.textAlign = "left";
      ctx.fillText("ACHIEVEMENT UNLOCKED", W / 2 - 124, 50);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px Orbitron, monospace";
      ctx.fillText(`${ap.icon}  ${ap.name}`, W / 2 - 124, 68);
      ctx.restore();
    }

    // Achievement panel (Tab)
    if (this._achPanelOpen) {
      const achs = CONFIG.ACHIEVEMENTS;
      const cw = Math.min(400, W / 2 - 40);
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.90)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#FFCC00";
      ctx.font = "bold 18px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillText("ACHIEVEMENTS", W / 2, 48);
      achs.forEach((ach, i) => {
        const col = i % 2,
          row = Math.floor(i / 2);
        const x = col === 0 ? W / 2 - cw - 10 : W / 2 + 10;
        const y = 70 + row * 44;
        const unlocked = this._unlockedAch.has(ach.id);
        ctx.globalAlpha = unlocked ? 1 : 0.35;
        ctx.fillStyle = "rgba(20,20,30,0.9)";
        ctx.beginPath();
        ctx.roundRect(x, y, cw, 36, 6);
        ctx.fill();
        ctx.strokeStyle = unlocked ? "#FFCC00" : "#444";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, cw, 36, 6);
        ctx.stroke();
        ctx.fillStyle = unlocked ? "#FFCC00" : "#888";
        ctx.font = "bold 11px Orbitron, monospace";
        ctx.textAlign = "left";
        ctx.fillText(`${ach.icon}  ${ach.name}`, x + 10, y + 14);
        ctx.fillStyle = "#aaa";
        ctx.font = "9px Orbitron, monospace";
        ctx.fillText(ach.desc, x + 10, y + 27);
        ctx.globalAlpha = 1;
      });
      ctx.fillStyle = "#666";
      ctx.font = "10px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillText("[ TAB ] CLOSE", W / 2, H - 20);
      ctx.restore();
    }
};  // end Game.prototype._render

