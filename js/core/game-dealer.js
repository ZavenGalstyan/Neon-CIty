'use strict';
/* Dealership and Casino indoor scene rendering — split from game.js */

Game.prototype._renderDealershipIndoor = function(ctx, W, H, shake) {
    const room = this._indoor;
    const offX = (W - room.roomW) / 2,
      offY = (H - room.roomH) / 2;
    const S = room.S;
    const isNeonCity = this.map.config.id === "neon_city" || !!this.map.config.blitz || !!this.map.config.robot || !!this.map.config.hardcore || !!this.map.config.campaign;
    const isHardcore  = !!this.map.config.hardcore;
    const isGalactica = !!this.map.config.galactica;
    const isWasteland = !!this.map.config.wasteland;
    const isSnow = !!this.map.config.snow;
    const isDino      = !!this.map.config.dino;
    const t = performance.now() / 1000;

    // Background
    ctx.fillStyle = isNeonCity
      ? (isHardcore ? "#090200" : "#020208")
      : isGalactica
        ? "#00000e"
        : isWasteland
          ? "#0c0a08"
          : isSnow
            ? "#050810"
          : isDino
            ? "#020801"
            : "#06060a";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(offX + shake.x, offY + shake.y);

    if (isNeonCity) {
      // ═══ CYBERPUNK SHOWROOM (neon city / blitz / robot / hardcore) ═══
      // Palette: swap to fire/ember for hardcore, keep cyan/magenta for others
      const dA    = isHardcore ? "#FF8800" : "#00FFFF";  // primary accent
      const dB    = isHardcore ? "#FF3300" : "#FF00FF";  // secondary accent
      const dAr   = isHardcore ? "255,136,0" : "0,255,255";
      const dBr   = isHardcore ? "255,51,0"  : "255,0,255";
      const dWall = isHardcore ? "#14080a" : "#0a0a14";
      const dFlr  = isHardcore ? "#0e0600" : "#08080e";
      const dC1   = isHardcore ? "#2e1a0a" : "#1a1a2e";
      const dC2   = isHardcore ? "#1e0e04" : "#12121e";
      const dC3   = isHardcore ? "#140800" : "#0a0a14";
      const dCTop = isHardcore ? "#3e2000" : "#2a2a3e";
      const dTitleText = isHardcore ? "⚡ INFERNO MOTORS ⚡" : "◈ CYBER MOTORS ◈";

      // Floor + walls
      for (let ty = 0; ty < room.H; ty++) {
        for (let tx = 0; tx < room.W; tx++) {
          const px = tx * S, py = ty * S, tile = room.layout[ty][tx];
          if (tile === 1) {
            ctx.fillStyle = dWall; ctx.fillRect(px, py, S, S);
            if ((tx + ty) % 3 === 0) {
              ctx.fillStyle = `rgba(${dAr},0.15)`;
              ctx.fillRect(px + S / 2 - 1, py, 2, S);
            }
          } else {
            ctx.fillStyle = dFlr; ctx.fillRect(px, py, S, S);
            ctx.strokeStyle = `rgba(${dAr},0.08)`; ctx.lineWidth = 1;
            ctx.strokeRect(px, py, S, S);
            if ((tx + ty) % 4 === 0) {
              const pulse = Math.sin(t * 2 + tx + ty) * 0.5 + 0.5;
              ctx.fillStyle = `rgba(${dAr},${0.03 + pulse * 0.02})`;
              ctx.fillRect(px + 4, py + 4, S - 8, S - 8);
            }
          }
        }
      }

      // Room border
      ctx.strokeStyle = dA; ctx.lineWidth = 2; ctx.shadowColor = dA; ctx.shadowBlur = 15;
      ctx.strokeRect(S + 2, S + 2, room.roomW - S * 2 - 4, room.roomH - S * 2 - 4);
      ctx.shadowBlur = 0;

      // Top accent bar
      const topGrad = ctx.createLinearGradient(0, S, room.roomW, S);
      topGrad.addColorStop(0, `rgba(${dBr},0.3)`);
      topGrad.addColorStop(0.5, `rgba(${dAr},0.5)`);
      topGrad.addColorStop(1, `rgba(${dBr},0.3)`);
      ctx.fillStyle = topGrad; ctx.fillRect(S, S, room.roomW - S * 2, 4);

      // Showroom title
      ctx.save();
      ctx.font = "bold 20px Orbitron, monospace"; ctx.textAlign = "center";
      ctx.fillStyle = dA; ctx.shadowColor = dA; ctx.shadowBlur = 25;
      ctx.fillText(dTitleText, room.roomW / 2, S - 20);
      ctx.shadowBlur = 0; ctx.restore();

      // ═══ CASHIER COUNTER ═══
      const counterX = room.roomW / 2 - 75, counterY = S * 1.2;
      const counterW = 150, counterH = 40;
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(counterX + 4, counterY + counterH + 2, counterW, 6);
      const counterGrad = ctx.createLinearGradient(counterX, counterY, counterX, counterY + counterH);
      counterGrad.addColorStop(0, dC1); counterGrad.addColorStop(0.5, dC2); counterGrad.addColorStop(1, dC3);
      ctx.fillStyle = counterGrad; ctx.fillRect(counterX, counterY, counterW, counterH);
      ctx.fillStyle = dCTop; ctx.fillRect(counterX - 5, counterY, counterW + 10, 6);
      ctx.strokeStyle = dA; ctx.lineWidth = 2; ctx.shadowColor = dA; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(counterX - 5, counterY + 3); ctx.lineTo(counterX + counterW + 5, counterY + 3); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = dA; ctx.shadowColor = dA; ctx.shadowBlur = 10;
      ctx.font = "bold 12px Orbitron, monospace"; ctx.textAlign = "center";
      ctx.fillText("SALES DESK", counterX + counterW / 2, counterY + 26);
      ctx.shadowBlur = 0;

      // ═══ DISPLAY CARS ON PLATFORMS ═══
      const carDisplays = [
        { x: room.roomW * 0.18, y: room.roomH * 0.45, color: "#FF3333", name: "SPORT"  },
        { x: room.roomW * 0.38, y: room.roomH * 0.42, color: "#3366FF", name: "SEDAN"  },
        { x: room.roomW * 0.62, y: room.roomH * 0.42, color: "#FFAA00", name: "MUSCLE" },
        { x: room.roomW * 0.82, y: room.roomH * 0.45, color: "#33FF99", name: "SUV"    },
        { x: room.roomW * 0.28, y: room.roomH * 0.58, color: "#AA44FF", name: "COUPE"  },
        { x: room.roomW * 0.72, y: room.roomH * 0.58, color: "#FF66AA", name: "TURBO"  },
      ];
      for (const car of carDisplays) {
        const pulse = Math.sin(t * 1.5 + car.x * 0.01) * 0.3 + 0.7;
        ctx.save(); ctx.translate(car.x, car.y);
        // Platform outer ring
        ctx.beginPath(); ctx.arc(0, 15, 45, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${dAr},0.06)`; ctx.fill();
        ctx.strokeStyle = `rgba(${dAr},${0.5 * pulse})`; ctx.lineWidth = 2; ctx.stroke();
        // Inner ring
        ctx.beginPath(); ctx.arc(0, 15, 35, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${dBr},${0.3 * pulse})`; ctx.lineWidth = 1; ctx.stroke();
        // Rotating light sweep
        ctx.save(); ctx.translate(0, 15); ctx.rotate(t * 0.5);
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = `rgba(${dAr},${0.15 * pulse})`;
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.arc(0, 0, 40, (i * Math.PI) / 2, (i * Math.PI) / 2 + 0.4);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        // Car body
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(3, 18, 28, 12, 0, 0, Math.PI * 2); ctx.fill();
        const carGrad = ctx.createLinearGradient(-25, -15, 25, 15);
        carGrad.addColorStop(0, car.color); carGrad.addColorStop(0.5, car.color + "CC"); carGrad.addColorStop(1, car.color + "88");
        ctx.fillStyle = carGrad;
        ctx.beginPath(); ctx.moveTo(-22,-8); ctx.lineTo(-25,0); ctx.lineTo(-22,10); ctx.lineTo(22,10); ctx.lineTo(25,0); ctx.lineTo(22,-8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#111122"; ctx.beginPath(); ctx.roundRect(-12,-5,24,12,3); ctx.fill();
        ctx.fillStyle = "rgba(100,200,255,0.4)";
        ctx.beginPath(); ctx.moveTo(-12,-4); ctx.lineTo(-8,-8); ctx.lineTo(8,-8); ctx.lineTo(12,-4); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-10,6); ctx.lineTo(-6,10); ctx.lineTo(6,10); ctx.lineTo(10,6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#FFF"; ctx.shadowColor = "#FFF"; ctx.shadowBlur = 6;
        ctx.fillRect(-20,-6,4,3); ctx.fillRect(16,-6,4,3); ctx.shadowBlur = 0;
        ctx.fillStyle = "#FF0000"; ctx.shadowColor = "#FF0000"; ctx.shadowBlur = 4;
        ctx.fillRect(-20,6,4,2); ctx.fillRect(16,6,4,2); ctx.shadowBlur = 0;
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath(); ctx.arc(-16,-10,5,0,Math.PI*2); ctx.arc(16,-10,5,0,Math.PI*2); ctx.arc(-16,12,5,0,Math.PI*2); ctx.arc(16,12,5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = "#444455";
        ctx.beginPath(); ctx.arc(-16,-10,3,0,Math.PI*2); ctx.arc(16,-10,3,0,Math.PI*2); ctx.arc(-16,12,3,0,Math.PI*2); ctx.arc(16,12,3,0,Math.PI*2); ctx.fill();
        ctx.restore();
        // Car label
        ctx.fillStyle = "#FFF"; ctx.shadowColor = car.color; ctx.shadowBlur = 8;
        ctx.font = "bold 8px Orbitron, monospace"; ctx.textAlign = "center";
        ctx.fillText(car.name, 0, 45); ctx.shadowBlur = 0;
        ctx.fillStyle = dA; ctx.font = "7px Orbitron, monospace";
        ctx.fillText("ON DISPLAY", 0, 54);
        ctx.restore();
      }

      // Ambient particles
      for (let i = 0; i < 8; i++) {
        const px = (t * 30 + i * 100) % room.roomW;
        const py = S * 1.5 + Math.sin(t + i * 2) * 20 + (i * (room.roomH - S * 3)) / 8;
        const alpha = Math.sin(t * 2 + i) * 0.3 + 0.4;
        ctx.fillStyle = i % 2 === 0 ? `rgba(${dAr},${alpha})` : `rgba(${dBr},${alpha})`;
        ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
      }

      // Side neon strips
      ctx.fillStyle = `rgba(${dBr},0.2)`;
      ctx.fillRect(S, S * 1.5, 3, room.roomH - S * 3);
      ctx.fillRect(room.roomW - S - 3, S * 1.5, 3, room.roomH - S * 3);
    } else if (isGalactica) {
      // ═══ GALACTICA: COSMIC SPACE SHOWROOM ═══

      // Deep space floor — near-black with subtle nebula hue
      for (let ty = 0; ty < room.H; ty++) {
        for (let tx = 0; tx < room.W; tx++) {
          const px = tx * S,
            py = ty * S,
            tile = room.layout[ty][tx];
          if (tile === 1) {
            // Void walls
            ctx.fillStyle = "#04020c";
            ctx.fillRect(px, py, S, S);
            if ((tx + ty) % 4 === 0) {
              ctx.fillStyle = "rgba(170,100,255,0.12)";
              ctx.fillRect(px + S / 2 - 1, py, 2, S);
            }
          } else {
            // Space floor — alternating deep tones
            ctx.fillStyle = (tx + ty) % 2 === 0 ? "#05031a" : "#030114";
            ctx.fillRect(px, py, S, S);
            // Purple grid
            ctx.strokeStyle = "rgba(150,80,255,0.07)";
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, S, S);
            // Twinkling star inlays
            const seed = tx * 17 + ty * 11;
            if (seed % 7 === 0) {
              const twinkle = Math.sin(t * 3 + seed) * 0.5 + 0.5;
              ctx.fillStyle = `rgba(220,200,255,${0.06 + twinkle * 0.12})`;
              ctx.beginPath();
              ctx.arc(
                px + (seed % S),
                py + ((seed * 3) % S),
                1,
                0,
                Math.PI * 2,
              );
              ctx.fill();
            }
            // Animated nebula glow patches
            if (seed % 11 === 0) {
              const pulse = Math.sin(t * 1.2 + seed * 0.5) * 0.5 + 0.5;
              ctx.fillStyle = `rgba(120,60,220,${0.02 + pulse * 0.03})`;
              ctx.fillRect(px + 2, py + 2, S - 4, S - 4);
            }
          }
        }
      }

      // Purple cosmos border
      ctx.strokeStyle = "#AA88FF";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#AA88FF";
      ctx.shadowBlur = 20;
      ctx.strokeRect(
        S + 2,
        S + 2,
        room.roomW - S * 2 - 4,
        room.roomH - S * 2 - 4,
      );
      ctx.shadowBlur = 0;

      // Top accent bar — purple gradient
      const topGrad = ctx.createLinearGradient(0, S, room.roomW, S);
      topGrad.addColorStop(0, "rgba(200,100,255,0.15)");
      topGrad.addColorStop(0.5, "rgba(170,136,255,0.5)");
      topGrad.addColorStop(1, "rgba(200,100,255,0.15)");
      ctx.fillStyle = topGrad;
      ctx.fillRect(S, S, room.roomW - S * 2, 4);

      // Showroom title
      ctx.save();
      ctx.font = "bold 20px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#CC99FF";
      ctx.shadowColor = "#AA88FF";
      ctx.shadowBlur = 28;
      ctx.fillText("◈ GALACTIC MOTORS ◈", room.roomW / 2, S - 20);
      ctx.shadowBlur = 0;
      ctx.restore();

      // ═══ COMMAND COUNTER ═══
      const counterX = room.roomW / 2 - 75;
      const counterY = S * 1.2;
      const counterW = 150,
        counterH = 40;

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(counterX + 4, counterY + counterH + 2, counterW, 6);

      // Counter body
      ctx.fillStyle = "#0e0520";
      ctx.fillRect(counterX, counterY, counterW, counterH);
      // Top surface
      ctx.fillStyle = "#1e0d38";
      ctx.fillRect(counterX - 5, counterY, counterW + 10, 6);
      // Glowing edge
      ctx.strokeStyle = "#AA88FF";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#AA88FF";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(counterX - 5, counterY + 3);
      ctx.lineTo(counterX + counterW + 5, counterY + 3);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Label
      ctx.fillStyle = "#CC99FF";
      ctx.shadowColor = "#AA88FF";
      ctx.shadowBlur = 10;
      ctx.font = "bold 12px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillText("COMMAND DECK", counterX + counterW / 2, counterY + 26);
      ctx.shadowBlur = 0;

      // ═══ UFO / SPACECRAFT DISPLAYS ON PLATFORMS ═══
      const shipDisplays = [
        {
          x: room.roomW * 0.18,
          y: room.roomH * 0.45,
          color: "#FF55FF",
          name: "SPECTER",
        },
        {
          x: room.roomW * 0.38,
          y: room.roomH * 0.42,
          color: "#55AAFF",
          name: "NOVA",
        },
        {
          x: room.roomW * 0.62,
          y: room.roomH * 0.42,
          color: "#AAFFAA",
          name: "PHANTOM",
        },
        {
          x: room.roomW * 0.82,
          y: room.roomH * 0.45,
          color: "#FFAA55",
          name: "TITAN",
        },
        {
          x: room.roomW * 0.28,
          y: room.roomH * 0.58,
          color: "#AA88FF",
          name: "WRAITH",
        },
        {
          x: room.roomW * 0.72,
          y: room.roomH * 0.58,
          color: "#FF8888",
          name: "VOIDSHIP",
        },
      ];

      for (const ship of shipDisplays) {
        const pulse = Math.sin(t * 1.5 + ship.x * 0.01) * 0.3 + 0.7;
        const hover = Math.sin(t * 2 + ship.x * 0.02) * 4; // hovering effect
        ctx.save();
        ctx.translate(ship.x, ship.y + hover);

        // Platform base — glowing purple ring
        ctx.beginPath();
        ctx.arc(0, 18, 45, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(100,50,200,0.08)";
        ctx.fill();
        ctx.strokeStyle = `rgba(170,136,255,${0.55 * pulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner ring
        ctx.beginPath();
        ctx.arc(0, 18, 34, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(200,100,255,${0.3 * pulse})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Rotating energy ring beneath ship
        ctx.save();
        ctx.translate(0, 18);
        ctx.rotate(t * 0.8);
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = `rgba(170,136,255,${0.18 * pulse})`;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(
            0,
            0,
            38,
            (i * Math.PI * 2) / 6,
            (i * Math.PI * 2) / 6 + 0.35,
          );
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // ═══ UFO (top-down view) ═══
        ctx.save();
        // Shadow ellipse
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath();
        ctx.ellipse(2, 14, 26, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // UFO saucer body
        ctx.beginPath();
        ctx.ellipse(0, 0, 28, 11, 0, 0, Math.PI * 2);
        ctx.fillStyle = ship.color + "BB";
        ctx.fill();
        ctx.strokeStyle = ship.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // UFO dome (cockpit)
        ctx.beginPath();
        ctx.ellipse(0, -2, 13, 8, 0, 0, Math.PI);
        ctx.fillStyle = "rgba(180,220,255,0.35)";
        ctx.fill();
        ctx.strokeStyle = "rgba(200,240,255,0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Engine lights (rotating)
        const numLights = 5;
        for (let i = 0; i < numLights; i++) {
          const ang = (i / numLights) * Math.PI * 2 + t * 2;
          const lx = Math.cos(ang) * 20;
          const ly = Math.sin(ang) * 7 + 2;
          ctx.fillStyle =
            i % 2 === 0
              ? `rgba(255,200,100,${0.7 + Math.sin(t * 4 + i) * 0.3})`
              : `rgba(100,200,255,${0.7 + Math.sin(t * 4 + i) * 0.3})`;
          ctx.beginPath();
          ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Center beam glow downward
        ctx.fillStyle = `rgba(170,136,255,${0.15 + pulse * 0.1})`;
        ctx.beginPath();
        ctx.moveTo(-4, 5);
        ctx.lineTo(4, 5);
        ctx.lineTo(8, 20);
        ctx.lineTo(-8, 20);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Ship name label
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = ship.color;
        ctx.shadowBlur = 8;
        ctx.font = "bold 8px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText(ship.name, 0, 48);
        ctx.shadowBlur = 0;

        // "ON DISPLAY" tag
        ctx.fillStyle = "#AA88FF";
        ctx.font = "7px Orbitron, monospace";
        ctx.fillText("ON DISPLAY", 0, 57);

        ctx.restore();
      }

      // Ambient space particles — drifting stars
      for (let i = 0; i < 12; i++) {
        const px = (t * 20 + i * 80) % room.roomW;
        const py =
          S * 1.5 +
          Math.sin(t * 0.8 + i * 1.3) * 25 +
          (i * (room.roomH - S * 3)) / 12;
        const alpha = Math.sin(t * 1.5 + i) * 0.3 + 0.4;
        ctx.fillStyle =
          i % 3 === 0
            ? `rgba(170,136,255,${alpha})`
            : i % 3 === 1
              ? `rgba(200,100,255,${alpha})`
              : `rgba(100,180,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, i % 4 === 0 ? 2 : 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Side purple strips
      ctx.fillStyle = "rgba(150,80,255,0.22)";
      ctx.fillRect(S, S * 1.5, 3, room.roomH - S * 3);
      ctx.fillRect(room.roomW - S - 3, S * 1.5, 3, room.roomH - S * 3);
    } else if (isWasteland) {
      // ═══ WASTELAND: POST-APOCALYPTIC GARAGE ═══

      // Dusty concrete floor base
      for (let ty = 0; ty < room.H; ty++) {
        for (let tx = 0; tx < room.W; tx++) {
          const px = tx * S,
            py = ty * S,
            tile = room.layout[ty][tx];
          if (tile === 1) {
            // Rusted metal walls
            ctx.fillStyle = "#1a1612";
            ctx.fillRect(px, py, S, S);
            // Rust streaks
            if ((tx + ty) % 4 === 0) {
              ctx.fillStyle = "rgba(120,60,30,0.25)";
              ctx.fillRect(px + S / 2 - 2, py, 4, S);
            }
            // Rivets
            if ((tx * 3 + ty * 5) % 5 === 0) {
              ctx.fillStyle = "#3a3230";
              ctx.beginPath();
              ctx.arc(px + 10, py + 10, 3, 0, Math.PI * 2);
              ctx.arc(px + S - 10, py + 10, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            // Cracked concrete floor
            const floorSeed = tx * 17 + ty * 31;
            ctx.fillStyle = floorSeed % 2 === 0 ? "#28241e" : "#242018";
            ctx.fillRect(px, py, S, S);

            // Floor cracks
            ctx.strokeStyle = "rgba(0,0,0,0.3)";
            ctx.lineWidth = 1;
            if (floorSeed % 7 === 0) {
              ctx.beginPath();
              ctx.moveTo(px + 5, py + S / 2);
              ctx.lineTo(px + S - 10, py + S / 3);
              ctx.stroke();
            }

            // Oil stains
            if (floorSeed % 11 === 0) {
              ctx.fillStyle = "rgba(20,15,10,0.4)";
              ctx.beginPath();
              ctx.ellipse(px + S / 2, py + S / 2, 15, 10, floorSeed * 0.5, 0, Math.PI * 2);
              ctx.fill();
            }

            // Grid lines (faded)
            ctx.strokeStyle = "rgba(80,60,40,0.12)";
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, S, S);
          }
        }
      }

      // Rusty border around room
      ctx.strokeStyle = "#8a6040";
      ctx.lineWidth = 3;
      ctx.strokeRect(
        S + 2,
        S + 2,
        room.roomW - S * 2 - 4,
        room.roomH - S * 2 - 4,
      );

      // Top warning stripe bar
      const stripeW = 20;
      for (let sx = S; sx < room.roomW - S; sx += stripeW * 2) {
        ctx.fillStyle = "#8a7030";
        ctx.fillRect(sx, S, stripeW, 6);
        ctx.fillStyle = "#2a2420";
        ctx.fillRect(sx + stripeW, S, stripeW, 6);
      }

      // Showroom title
      ctx.save();
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#a08060";
      ctx.fillText("▲ WASTELAND MOTORS ▲", room.roomW / 2, S - 20);
      ctx.restore();

      // ═══ WORK COUNTER / DESK ═══
      const counterX = room.roomW / 2 - 75;
      const counterY = S * 1.2;
      const counterW = 150;
      const counterH = 40;

      // Counter shadow
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(counterX + 4, counterY + counterH + 2, counterW, 6);

      // Counter base (rusty metal)
      const counterGrad = ctx.createLinearGradient(
        counterX,
        counterY,
        counterX,
        counterY + counterH,
      );
      counterGrad.addColorStop(0, "#4a4038");
      counterGrad.addColorStop(0.5, "#3a3228");
      counterGrad.addColorStop(1, "#2a2420");
      ctx.fillStyle = counterGrad;
      ctx.fillRect(counterX, counterY, counterW, counterH);

      // Counter top surface (worn wood)
      ctx.fillStyle = "#5a4a38";
      ctx.fillRect(counterX - 5, counterY, counterW + 10, 6);

      // Rust edge on counter
      ctx.strokeStyle = "#6a5040";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(counterX - 5, counterY + 3);
      ctx.lineTo(counterX + counterW + 5, counterY + 3);
      ctx.stroke();

      // "PARTS" sign on counter
      ctx.fillStyle = "#9a8060";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("PARTS & SERVICE", counterX + counterW / 2, counterY + 26);

      // ═══ SALVAGED VEHICLES ON PLATFORMS ═══
      const carDisplays = [
        // Front row
        { x: room.roomW * 0.18, y: room.roomH * 0.45, color: "#6a5040", name: "RUST BUCKET" },
        { x: room.roomW * 0.38, y: room.roomH * 0.42, color: "#5a6050", name: "SURVIVOR" },
        { x: room.roomW * 0.62, y: room.roomH * 0.42, color: "#7a6a50", name: "WAR WAGON" },
        { x: room.roomW * 0.82, y: room.roomH * 0.45, color: "#6a6055", name: "TANK" },
        // Back row
        { x: room.roomW * 0.28, y: room.roomH * 0.58, color: "#5a5048", name: "SALVAGE" },
        { x: room.roomW * 0.72, y: room.roomH * 0.58, color: "#8a7060", name: "BEAST" },
      ];

      for (const car of carDisplays) {
        ctx.save();
        ctx.translate(car.x, car.y);

        // Platform base (concrete slab with cracks)
        ctx.fillStyle = "#3a3530";
        ctx.beginPath();
        ctx.arc(0, 15, 45, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#4a4540";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner platform ring (oil ring)
        ctx.beginPath();
        ctx.arc(0, 15, 35, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(40,30,20,0.5)";
        ctx.lineWidth = 3;
        ctx.stroke();

        // ═══ SALVAGED CAR (top-down view) ═══
        ctx.save();
        // Car shadow
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath();
        ctx.ellipse(3, 18, 28, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Car body (rusty, dented)
        const carGrad = ctx.createLinearGradient(-25, -15, 25, 15);
        carGrad.addColorStop(0, car.color);
        carGrad.addColorStop(0.5, car.color);
        carGrad.addColorStop(1, "#3a3530");
        ctx.fillStyle = carGrad;

        // Main body shape
        ctx.beginPath();
        ctx.moveTo(-22, -8);
        ctx.lineTo(-25, 0);
        ctx.lineTo(-22, 10);
        ctx.lineTo(22, 10);
        ctx.lineTo(25, 0);
        ctx.lineTo(22, -8);
        ctx.closePath();
        ctx.fill();

        // Rust patches
        ctx.fillStyle = "rgba(100,50,20,0.4)";
        ctx.fillRect(-18, -6, 8, 5);
        ctx.fillRect(12, 4, 10, 4);

        // Roof/cabin (dented)
        ctx.fillStyle = "#2a2520";
        ctx.beginPath();
        ctx.roundRect(-12, -5, 24, 12, 2);
        ctx.fill();

        // Cracked windshield
        ctx.fillStyle = "rgba(80,80,70,0.5)";
        ctx.beginPath();
        ctx.moveTo(-12, -4);
        ctx.lineTo(-8, -8);
        ctx.lineTo(8, -8);
        ctx.lineTo(12, -4);
        ctx.closePath();
        ctx.fill();
        // Crack line
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, -7);
        ctx.lineTo(4, -4);
        ctx.stroke();

        // Headlights (one broken, one dim)
        ctx.fillStyle = "#6a6050";
        ctx.fillRect(-20, -6, 4, 3);
        ctx.fillStyle = "#888870";
        ctx.fillRect(16, -6, 4, 3);

        // Taillights (dim red)
        ctx.fillStyle = "#5a3030";
        ctx.fillRect(-20, 6, 4, 2);
        ctx.fillRect(16, 6, 4, 2);

        // Wheels (worn)
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.arc(-16, -10, 5, 0, Math.PI * 2);
        ctx.arc(16, -10, 5, 0, Math.PI * 2);
        ctx.arc(-16, 12, 5, 0, Math.PI * 2);
        ctx.arc(16, 12, 5, 0, Math.PI * 2);
        ctx.fill();

        // Wheel rims (rusty)
        ctx.fillStyle = "#4a4038";
        ctx.beginPath();
        ctx.arc(-16, -10, 3, 0, Math.PI * 2);
        ctx.arc(16, -10, 3, 0, Math.PI * 2);
        ctx.arc(-16, 12, 3, 0, Math.PI * 2);
        ctx.arc(16, 12, 3, 0, Math.PI * 2);
        ctx.fill();

        // Armor plating / modifications
        ctx.fillStyle = "#4a4540";
        ctx.fillRect(-24, -2, 4, 6);
        ctx.fillRect(20, -2, 4, 6);

        ctx.restore();

        // Car name label
        ctx.fillStyle = "#a09080";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(car.name, 0, 45);

        // Price tag
        ctx.fillStyle = "#8a7a60";
        ctx.font = "7px monospace";
        ctx.fillText("SALVAGED", 0, 54);

        ctx.restore();
      }

      // Dust particles
      for (let i = 0; i < 6; i++) {
        const px = (t * 15 + i * 120) % room.roomW;
        const py = S * 1.5 + Math.sin(t * 0.5 + i * 2) * 30 + (i * (room.roomH - S * 3)) / 6;
        const alpha = Math.sin(t + i) * 0.15 + 0.2;
        ctx.fillStyle = `rgba(120,100,70,${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Side rust strips
      ctx.fillStyle = "rgba(100,60,30,0.25)";
      ctx.fillRect(S, S * 1.5, 4, room.roomH - S * 3);
      ctx.fillRect(room.roomW - S - 4, S * 1.5, 4, room.roomH - S * 3);

      // Tool rack on left wall
      ctx.fillStyle = "#3a3530";
      ctx.fillRect(S + 8, S * 2, 20, 80);
      ctx.fillStyle = "#5a5550";
      ctx.fillRect(S + 10, S * 2 + 10, 3, 15);
      ctx.fillRect(S + 16, S * 2 + 8, 3, 20);
      ctx.fillRect(S + 22, S * 2 + 12, 3, 12);

      // Barrel on right wall
      ctx.fillStyle = "#4a4540";
      ctx.beginPath();
      ctx.ellipse(room.roomW - S - 30, S * 2.5, 18, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5a5550";
      ctx.fillRect(room.roomW - S - 48, S * 2.5, 36, 3);
    } else if (isSnow) {
      // ═══ FROZEN TUNDRA: ICE CRYSTAL SHOWROOM ═══

      // Frozen floor base with ice patterns
      for (let ty = 0; ty < room.H; ty++) {
        for (let tx = 0; tx < room.W; tx++) {
          const px = tx * S,
            py = ty * S,
            tile = room.layout[ty][tx];
          if (tile === 1) {
            // Ice walls - frozen blue panels
            ctx.fillStyle = "#0a1520";
            ctx.fillRect(px, py, S, S);
            // Frost crystal strips on walls
            if ((tx + ty) % 3 === 0) {
              ctx.fillStyle = "rgba(100,180,255,0.15)";
              ctx.fillRect(px + S / 2 - 1, py, 2, S);
            }
            // Ice crystals on walls
            if ((tx * 3 + ty * 5) % 7 === 0) {
              ctx.fillStyle = "rgba(180,220,255,0.2)";
              ctx.beginPath();
              ctx.moveTo(px + S/2, py + 5);
              ctx.lineTo(px + S/2 - 5, py + 15);
              ctx.lineTo(px + S/2 + 5, py + 15);
              ctx.closePath();
              ctx.fill();
            }
          } else {
            // Frozen floor - ice blue with subtle pattern
            const floorSeed = tx * 17 + ty * 31;
            ctx.fillStyle = floorSeed % 2 === 0 ? "#0c1825" : "#081420";
            ctx.fillRect(px, py, S, S);

            // Ice grid lines
            ctx.strokeStyle = "rgba(100,180,255,0.08)";
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, S, S);

            // Frost patches
            if (floorSeed % 9 === 0) {
              const pulse = Math.sin(t * 1.5 + tx + ty) * 0.3 + 0.7;
              ctx.fillStyle = `rgba(150,200,255,${0.04 * pulse})`;
              ctx.fillRect(px + 2, py + 2, S - 4, S - 4);
            }

            // Ice cracks
            if (floorSeed % 11 === 0) {
              ctx.strokeStyle = "rgba(180,220,255,0.12)";
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(px + 3, py + S/2);
              ctx.lineTo(px + S - 5, py + S/3);
              ctx.stroke();
            }
          }
        }
      }

      // Ice crystal border around room
      ctx.strokeStyle = "#66BBFF";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#66BBFF";
      ctx.shadowBlur = 15;
      ctx.strokeRect(
        S + 2,
        S + 2,
        room.roomW - S * 2 - 4,
        room.roomH - S * 2 - 4,
      );
      ctx.shadowBlur = 0;

      // Top frost accent bar with animated shimmer
      const topGrad = ctx.createLinearGradient(0, S, room.roomW, S);
      topGrad.addColorStop(0, "rgba(100,180,255,0.2)");
      topGrad.addColorStop(0.5, "rgba(180,220,255,0.5)");
      topGrad.addColorStop(1, "rgba(100,180,255,0.2)");
      ctx.fillStyle = topGrad;
      ctx.fillRect(S, S, room.roomW - S * 2, 4);

      // Showroom title with ice theme
      ctx.save();
      ctx.font = "bold 20px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#AADDFF";
      ctx.shadowColor = "#66BBFF";
      ctx.shadowBlur = 25;
      ctx.fillText("❄ FROST MOTORS ❄", room.roomW / 2, S - 20);
      ctx.shadowBlur = 0;
      ctx.restore();

      // ═══ ICE COUNTER AREA ═══
      const counterX = room.roomW / 2 - 75;
      const counterY = S * 1.2;
      const counterW = 150;
      const counterH = 40;

      // Counter shadow
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(counterX + 4, counterY + counterH + 2, counterW, 6);

      // Counter base (frozen ice desk)
      const counterGrad = ctx.createLinearGradient(
        counterX,
        counterY,
        counterX,
        counterY + counterH,
      );
      counterGrad.addColorStop(0, "#1a2a3e");
      counterGrad.addColorStop(0.5, "#12202e");
      counterGrad.addColorStop(1, "#0a1820");
      ctx.fillStyle = counterGrad;
      ctx.fillRect(counterX, counterY, counterW, counterH);

      // Counter top surface - frosted
      ctx.fillStyle = "#2a3a4e";
      ctx.fillRect(counterX - 5, counterY, counterW + 10, 6);

      // Ice edge glow on counter
      ctx.strokeStyle = "#66BBFF";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#66BBFF";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(counterX - 5, counterY + 3);
      ctx.lineTo(counterX + counterW + 5, counterY + 3);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // "SALES" sign on counter front
      ctx.fillStyle = "#88CCFF";
      ctx.shadowColor = "#66BBFF";
      ctx.shadowBlur = 10;
      ctx.font = "bold 12px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillText("FROST SALES", counterX + counterW / 2, counterY + 26);
      ctx.shadowBlur = 0;

      // ═══ DISPLAY VEHICLES ON ICE PLATFORMS ═══
      const carDisplays = [
        // Front row
        {
          x: room.roomW * 0.18,
          y: room.roomH * 0.45,
          color: "#4488BB",
          name: "ICE RUNNER",
        },
        {
          x: room.roomW * 0.38,
          y: room.roomH * 0.42,
          color: "#5599CC",
          name: "BLIZZARD",
        },
        {
          x: room.roomW * 0.62,
          y: room.roomH * 0.42,
          color: "#6699AA",
          name: "FROSTBITE",
        },
        {
          x: room.roomW * 0.82,
          y: room.roomH * 0.45,
          color: "#77AACC",
          name: "AVALANCHE",
        },
        // Back row
        {
          x: room.roomW * 0.28,
          y: room.roomH * 0.58,
          color: "#3388AA",
          name: "GLACIER",
        },
        {
          x: room.roomW * 0.72,
          y: room.roomH * 0.58,
          color: "#66BBDD",
          name: "SNOWSTORM",
        },
      ];

      for (const car of carDisplays) {
        const pulse = Math.sin(t * 1.5 + car.x * 0.01) * 0.3 + 0.7;
        ctx.save();
        ctx.translate(car.x, car.y);

        // Platform base (ice circle with frost glow)
        ctx.beginPath();
        ctx.arc(0, 15, 45, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(100,180,255,0.06)";
        ctx.fill();
        ctx.strokeStyle = `rgba(100,180,255,${0.5 * pulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner ice ring
        ctx.beginPath();
        ctx.arc(0, 15, 35, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(150,200,255,${0.3 * pulse})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Rotating snowflake pattern under vehicle
        ctx.save();
        ctx.translate(0, 15);
        ctx.rotate(t * 0.3);
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = `rgba(150,200,255,${0.12 * pulse})`;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, 40, (i * Math.PI) / 3, (i * Math.PI) / 3 + 0.3);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // ═══ WINTER VEHICLE (top-down view) ═══
        ctx.save();
        // Vehicle shadow
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.ellipse(3, 18, 28, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Vehicle body with frost coating
        const carGrad = ctx.createLinearGradient(-25, -15, 25, 15);
        carGrad.addColorStop(0, car.color);
        carGrad.addColorStop(0.5, car.color + "DD");
        carGrad.addColorStop(1, car.color + "AA");
        ctx.fillStyle = carGrad;

        // Main body shape
        ctx.beginPath();
        ctx.moveTo(-22, -8);
        ctx.lineTo(-25, 0);
        ctx.lineTo(-22, 10);
        ctx.lineTo(22, 10);
        ctx.lineTo(25, 0);
        ctx.lineTo(22, -8);
        ctx.closePath();
        ctx.fill();

        // Snow on roof
        ctx.fillStyle = "rgba(220,240,255,0.6)";
        ctx.beginPath();
        ctx.roundRect(-14, -7, 28, 4, 2);
        ctx.fill();

        // Roof/cabin
        ctx.fillStyle = "#152030";
        ctx.beginPath();
        ctx.roundRect(-12, -5, 24, 12, 3);
        ctx.fill();

        // Windshield with frost
        ctx.fillStyle = "rgba(150,200,255,0.4)";
        ctx.beginPath();
        ctx.moveTo(-12, -4);
        ctx.lineTo(-8, -8);
        ctx.lineTo(8, -8);
        ctx.lineTo(12, -4);
        ctx.closePath();
        ctx.fill();

        // Frost crystals on windshield
        ctx.fillStyle = "rgba(220,240,255,0.3)";
        ctx.fillRect(-10, -7, 4, 2);
        ctx.fillRect(6, -7, 4, 2);

        // Rear window
        ctx.fillStyle = "rgba(150,200,255,0.35)";
        ctx.beginPath();
        ctx.moveTo(-10, 6);
        ctx.lineTo(-6, 10);
        ctx.lineTo(6, 10);
        ctx.lineTo(10, 6);
        ctx.closePath();
        ctx.fill();

        // Headlights - bright ice blue
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = "#88DDFF";
        ctx.shadowBlur = 6;
        ctx.fillRect(-20, -6, 4, 3);
        ctx.fillRect(16, -6, 4, 3);
        ctx.shadowBlur = 0;

        // Taillights - cold red
        ctx.fillStyle = "#CC4444";
        ctx.shadowColor = "#CC4444";
        ctx.shadowBlur = 4;
        ctx.fillRect(-20, 6, 4, 2);
        ctx.fillRect(16, 6, 4, 2);
        ctx.shadowBlur = 0;

        // Winter tires
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.arc(-16, -10, 5, 0, Math.PI * 2);
        ctx.arc(16, -10, 5, 0, Math.PI * 2);
        ctx.arc(-16, 12, 5, 0, Math.PI * 2);
        ctx.arc(16, 12, 5, 0, Math.PI * 2);
        ctx.fill();

        // Wheel rims - chrome/silver
        ctx.fillStyle = "#667788";
        ctx.beginPath();
        ctx.arc(-16, -10, 3, 0, Math.PI * 2);
        ctx.arc(16, -10, 3, 0, Math.PI * 2);
        ctx.arc(-16, 12, 3, 0, Math.PI * 2);
        ctx.arc(16, 12, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Car name label
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = car.color;
        ctx.shadowBlur = 8;
        ctx.font = "bold 8px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText(car.name, 0, 45);
        ctx.shadowBlur = 0;

        // Price tag
        ctx.fillStyle = "#88CCFF";
        ctx.font = "7px Orbitron, monospace";
        ctx.fillText("ON DISPLAY", 0, 54);

        ctx.restore();
      }

      // Snowflake particles
      for (let i = 0; i < 10; i++) {
        const px = (t * 20 + i * 90) % room.roomW;
        const py =
          S * 1.5 + Math.sin(t * 0.8 + i * 1.5) * 25 + (i * (room.roomH - S * 3)) / 10;
        const alpha = Math.sin(t * 2 + i) * 0.3 + 0.4;
        const size = (i % 3) + 1;
        ctx.fillStyle = `rgba(200,230,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Side ice crystal strips
      ctx.fillStyle = "rgba(100,180,255,0.15)";
      ctx.fillRect(S, S * 1.5, 3, room.roomH - S * 3);
      ctx.fillRect(room.roomW - S - 3, S * 1.5, 3, room.roomH - S * 3);

      // Ice stalactites on ceiling (left)
      for (let i = 0; i < 4; i++) {
        const ix = S + 30 + i * 35;
        const ih = 15 + (i % 2) * 10;
        ctx.fillStyle = "rgba(150,200,255,0.25)";
        ctx.beginPath();
        ctx.moveTo(ix - 6, S);
        ctx.lineTo(ix, S + ih);
        ctx.lineTo(ix + 6, S);
        ctx.closePath();
        ctx.fill();
      }

      // Ice stalactites on ceiling (right)
      for (let i = 0; i < 4; i++) {
        const ix = room.roomW - S - 30 - i * 35;
        const ih = 12 + (i % 2) * 8;
        ctx.fillStyle = "rgba(150,200,255,0.25)";
        ctx.beginPath();
        ctx.moveTo(ix - 5, S);
        ctx.lineTo(ix, S + ih);
        ctx.lineTo(ix + 5, S);
        ctx.closePath();
        ctx.fill();
      }

      // Frozen barrel/container on right
      ctx.fillStyle = "#2a3a4a";
      ctx.beginPath();
      ctx.ellipse(room.roomW - S - 30, S * 2.5, 18, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(150,200,255,0.3)";
      ctx.fillRect(room.roomW - S - 48, S * 2.5, 36, 3);
    } else if (isDino) {
      // ═══ DINO WORLD: PREHISTORIC SHOWROOM ═══
      const dA = "#66DD44"; const dB = "#FFCC44"; const dAr = "102,221,68"; const dBr = "255,204,68";

      // Jungle floor + mossy walls
      for (let ty = 0; ty < room.H; ty++) {
        for (let tx = 0; tx < room.W; tx++) {
          const px = tx * S, py = ty * S, tile = room.layout[ty][tx];
          if (tile === 1) {
            ctx.fillStyle = "#0a1a06"; ctx.fillRect(px, py, S, S);
            if ((tx + ty) % 3 === 0) {
              ctx.fillStyle = `rgba(${dAr},0.12)`;
              ctx.fillRect(px + S / 2 - 1, py, 2, S);
            }
          } else {
            ctx.fillStyle = (tx + ty) % 2 === 0 ? "#050e03" : "#040c02";
            ctx.fillRect(px, py, S, S);
            ctx.strokeStyle = `rgba(${dAr},0.07)`; ctx.lineWidth = 1;
            ctx.strokeRect(px, py, S, S);
            if ((tx + ty) % 5 === 0) {
              const pulse = Math.sin(t * 1.5 + tx + ty) * 0.5 + 0.5;
              ctx.fillStyle = `rgba(${dAr},${0.02 + pulse * 0.02})`;
              ctx.fillRect(px + 4, py + 4, S - 8, S - 8);
            }
          }
        }
      }

      // Room border — bioluminescent green
      ctx.strokeStyle = dA; ctx.lineWidth = 2; ctx.shadowColor = dA; ctx.shadowBlur = 14;
      ctx.strokeRect(S + 2, S + 2, room.roomW - S * 2 - 4, room.roomH - S * 2 - 4);
      ctx.shadowBlur = 0;

      // Vines on ceiling strip
      ctx.fillStyle = `rgba(${dAr},0.18)`;
      ctx.fillRect(S, S, room.roomW - S * 2, 4);
      for (let vi = 0; vi < 12; vi++) {
        const vx = S + 20 + vi * ((room.roomW - S*2 - 40) / 11);
        const vl = 8 + Math.sin(vi * 1.7) * 5;
        ctx.strokeStyle = '#44AA22'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(vx, S); ctx.bezierCurveTo(vx-3, S+vl*0.4, vx+3, S+vl*0.7, vx-2, S+vl); ctx.stroke();
        ctx.fillStyle = '#55CC22';
        ctx.beginPath(); ctx.ellipse(vx-2, S+vl, 3, 2, 0.4, 0, Math.PI*2); ctx.fill();
      }

      // Title sign — DINO DEALS
      ctx.save();
      ctx.font = "bold 20px Orbitron, monospace"; ctx.textAlign = "center";
      ctx.fillStyle = dB; ctx.shadowColor = dB; ctx.shadowBlur = 22;
      ctx.fillText("☠ DINO DEALS ☠", room.roomW / 2, S - 18);
      ctx.shadowBlur = 0; ctx.restore();

      // Cashier counter — stone slab
      const counterX = room.roomW / 2 - 75, counterY = S * 1.2;
      const counterW = 150, counterH = 40;
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(counterX + 4, counterY + counterH + 2, counterW, 6);
      const counterGrad = ctx.createLinearGradient(counterX, counterY, counterX, counterY + counterH);
      counterGrad.addColorStop(0, "#1e3c14"); counterGrad.addColorStop(0.5, "#162e0c"); counterGrad.addColorStop(1, "#0e1e08");
      ctx.fillStyle = counterGrad; ctx.fillRect(counterX, counterY, counterW, counterH);
      ctx.fillStyle = "#F0E8C0"; ctx.fillRect(counterX - 5, counterY, counterW + 10, 6);
      ctx.strokeStyle = dA; ctx.lineWidth = 2; ctx.shadowColor = dA; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(counterX - 5, counterY + 3); ctx.lineTo(counterX + counterW + 5, counterY + 3); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = dA; ctx.shadowColor = dA; ctx.shadowBlur = 8;
      ctx.font = "bold 12px Orbitron, monospace"; ctx.textAlign = "center";
      ctx.fillText("DINO DEALER", counterX + counterW / 2, counterY + 26);
      ctx.shadowBlur = 0;

      // Dinosaur skull trophy on counter
      ctx.save();
      ctx.translate(counterX + counterW + 28, counterY + 10);
      ctx.fillStyle = "#F0E8C0"; ctx.shadowColor = "#FFCC44"; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#1a3410";
      ctx.beginPath(); ctx.ellipse(-5, 3, 4, 5, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(5, 3, 4, 5, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#c8c090"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-10, 8); ctx.lineTo(-7, 16); ctx.lineTo(-4, 10); ctx.lineTo(0, 16); ctx.lineTo(4, 10); ctx.lineTo(7, 16); ctx.lineTo(10, 8); ctx.stroke();
      ctx.shadowBlur = 0; ctx.restore();

      // Stone pedestals with display creatures/vehicles
      const carDisplays = [
        { x: room.roomW * 0.18, y: room.roomH * 0.45, color: "#8B4513", name: "STEGO"   },
        { x: room.roomW * 0.38, y: room.roomH * 0.42, color: "#556B2F", name: "TRICERA" },
        { x: room.roomW * 0.62, y: room.roomH * 0.42, color: "#8B6914", name: "RAPTOR"  },
        { x: room.roomW * 0.82, y: room.roomH * 0.45, color: "#4a7828", name: "T-REX"   },
        { x: room.roomW * 0.28, y: room.roomH * 0.58, color: "#5a6830", name: "ANKYLUS" },
        { x: room.roomW * 0.72, y: room.roomH * 0.58, color: "#3d6b10", name: "SPINO"   },
      ];
      for (const car of carDisplays) {
        const pulse = Math.sin(t * 1.2 + car.x * 0.01) * 0.3 + 0.7;
        ctx.save(); ctx.translate(car.x, car.y);
        // Stone pedestal outer ring
        ctx.beginPath(); ctx.arc(0, 15, 45, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${dAr},0.05)`; ctx.fill();
        ctx.strokeStyle = `rgba(${dAr},${0.45 * pulse})`; ctx.lineWidth = 2; ctx.stroke();
        // Inner amber ring
        ctx.beginPath(); ctx.arc(0, 15, 35, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${dBr},${0.28 * pulse})`; ctx.lineWidth = 1; ctx.stroke();
        // Amber glow sweep
        ctx.save(); ctx.translate(0, 15); ctx.rotate(t * 0.4);
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = `rgba(${dAr},${0.12 * pulse})`;
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.arc(0, 0, 40, (i * Math.PI) / 2, (i * Math.PI) / 2 + 0.4);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        // Dinosaur body (top-down elongated shape)
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(3, 18, 26, 11, 0, 0, Math.PI * 2); ctx.fill();
        const dGrad = ctx.createLinearGradient(-22, -12, 22, 12);
        dGrad.addColorStop(0, car.color); dGrad.addColorStop(0.5, car.color + "CC"); dGrad.addColorStop(1, car.color + "88");
        ctx.fillStyle = dGrad;
        // Body elongated oval
        ctx.beginPath(); ctx.ellipse(0, 0, 20, 10, 0, 0, Math.PI*2); ctx.fill();
        // Head (front)
        ctx.fillStyle = car.color;
        ctx.beginPath(); ctx.ellipse(-18, 0, 8, 6, 0, 0, Math.PI*2); ctx.fill();
        // Tail (back)
        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(24, -3); ctx.lineTo(24, 3); ctx.closePath(); ctx.fill();
        // Eye
        ctx.fillStyle = "#FFEE00"; ctx.beginPath(); ctx.arc(-20, -2, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(-20, -2, 1.2, 0, Math.PI*2); ctx.fill();
        // Scale dots
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        for (let si = -2; si <= 2; si++) {
          ctx.beginPath(); ctx.arc(si * 7, Math.sin(si*0.8)*3, 2.5, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
        // Creature name
        ctx.fillStyle = "#F0E8C0"; ctx.shadowColor = dB; ctx.shadowBlur = 6;
        ctx.font = "bold 8px Orbitron, monospace"; ctx.textAlign = "center";
        ctx.fillText(car.name, 0, 45); ctx.shadowBlur = 0;
        ctx.fillStyle = dA; ctx.font = "7px Orbitron, monospace";
        ctx.fillText("ON DISPLAY", 0, 54);
        ctx.restore();
      }

      // Skull trophies on side walls
      for (let si = 0; si < 3; si++) {
        const sy2 = S * 2 + si * (room.roomH - S * 4) / 2;
        ctx.save(); ctx.translate(S + 14, sy2);
        ctx.fillStyle = "#F0E8C0"; ctx.shadowColor = "#FFCC44"; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#0a1a06";
        ctx.beginPath(); ctx.ellipse(-3, 2, 2.5, 3.5, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(3, 2, 2.5, 3.5, 0, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0; ctx.restore();

        ctx.save(); ctx.translate(room.roomW - S - 14, sy2);
        ctx.fillStyle = "#F0E8C0"; ctx.shadowColor = "#FFCC44"; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#0a1a06";
        ctx.beginPath(); ctx.ellipse(-3, 2, 2.5, 3.5, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(3, 2, 2.5, 3.5, 0, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0; ctx.restore();
      }

      // Ambient firefly particles
      for (let i = 0; i < 10; i++) {
        const px = (t * 22 + i * 90) % room.roomW;
        const py = S * 1.5 + Math.sin(t + i * 2.1) * 22 + (i * (room.roomH - S * 3)) / 10;
        const alpha = Math.sin(t * 2.5 + i) * 0.4 + 0.5;
        ctx.fillStyle = i % 3 === 0 ? `rgba(${dAr},${alpha})` : i % 3 === 1 ? `rgba(${dBr},${alpha})` : `rgba(255,255,180,${alpha})`;
        ctx.beginPath(); ctx.arc(px, py, i % 4 === 0 ? 2 : 1, 0, Math.PI * 2); ctx.fill();
      }

      // Side bioluminescent strips
      ctx.fillStyle = `rgba(${dAr},0.18)`;
      ctx.fillRect(S, S * 1.5, 3, room.roomH - S * 3);
      ctx.fillRect(room.roomW - S - 3, S * 1.5, 3, room.roomH - S * 3);

    } else {
      // ═══ DEFAULT SHOWROOM (other maps) ═══
      for (let ty = 0; ty < room.H; ty++) {
        for (let tx = 0; tx < room.W; tx++) {
          const px = tx * S,
            py = ty * S,
            tile = room.layout[ty][tx];
          if (tile === 1) {
            ctx.fillStyle = "#111120";
            ctx.fillRect(px, py, S, S);
          } else {
            ctx.fillStyle = (tx + ty) % 2 === 0 ? "#12121e" : "#0e0e18";
            ctx.fillRect(px, py, S, S);
            ctx.fillStyle = "rgba(68,238,255,0.018)";
            ctx.fillRect(px, py, S, S);
          }
        }
      }
      // Neon accent stripe
      ctx.fillStyle = "rgba(68,238,255,0.20)";
      ctx.fillRect(0, S, room.roomW, 3);
      ctx.fillStyle = "rgba(68,238,255,0.08)";
      ctx.fillRect(0, S, room.roomW, S * 0.3);
    }

    // Salespersons + bullets + player
    for (const sp of this._salespersons) sp.render(ctx);
    for (const b of this._indoorBullets) b.render(ctx);
    if (!this.player.dead) this.player.render(ctx);

    // [T] hint near salesperson
    if (this._nearSalesperson) {
      const nearSp = this._salespersons.find(
        (sp) => Math.hypot(sp.x - this.player.x, sp.y - this.player.y) < 60,
      );
      if (nearSp) {
        ctx.save();
        ctx.font = "bold 14px Orbitron, monospace";
        ctx.textAlign = "center";
        if (isNeonCity) {
          ctx.fillStyle = "#00FFFF";
          ctx.shadowColor = "#00FFFF";
          ctx.shadowBlur = 12;
          ctx.fillText("[T] OPEN SHOP", nearSp.x, nearSp.y - 102);
        } else if (isGalactica) {
          ctx.fillStyle = "#CC99FF";
          ctx.shadowColor = "#AA88FF";
          ctx.shadowBlur = 14;
          ctx.fillText("[T] OPEN SHOP", nearSp.x, nearSp.y - 102);
        } else if (isWasteland) {
          ctx.fillStyle = "#c0a080";
          ctx.shadowColor = "#8a6040";
          ctx.shadowBlur = 8;
          ctx.fillText("[T] OPEN SHOP", nearSp.x, nearSp.y - 102);
        } else if (isSnow) {
          ctx.fillStyle = "#AADDFF";
          ctx.shadowColor = "#66BBFF";
          ctx.shadowBlur = 12;
          ctx.fillText("[T] OPEN SHOP", nearSp.x, nearSp.y - 102);
        } else {
          ctx.fillStyle = "#FFFFAA";
          ctx.shadowColor = "#FFFF00";
          ctx.shadowBlur = 10;
          ctx.fillText("[T] OPEN SHOP", nearSp.x, nearSp.y - 62);
        }
        ctx.restore();
      }
    }

    // [E] EXIT hint
    ctx.save();
    ctx.font = "bold 16px Orbitron, monospace";
    ctx.textAlign = "center";
    if (isNeonCity) {
      ctx.fillStyle = "#00FFFF";
      ctx.shadowColor = "#00FFFF";
      ctx.shadowBlur = 10;
      ctx.fillText("[E] EXIT", room.roomW / 2, room.roomH - 25);
      ctx.fillText("[E] EXIT", room.entryX, room.roomH - 25);
    } else if (isGalactica) {
      ctx.fillStyle = "#CC99FF";
      ctx.shadowColor = "#AA88FF";
      ctx.shadowBlur = 12;
      ctx.fillText("[E] EXIT", room.entryX, room.roomH - 25);
    } else if (isWasteland) {
      ctx.fillStyle = "#c0a080";
      ctx.shadowColor = "#8a6040";
      ctx.shadowBlur = 8;
      ctx.fillText("[E] EXIT", room.entryX, room.roomH - 25);
    } else if (isSnow) {
      ctx.fillStyle = "#AADDFF";
      ctx.shadowColor = "#66BBFF";
      ctx.shadowBlur = 10;
      ctx.fillText("[E] EXIT", room.entryX, room.roomH - 25);
    } else {
      ctx.fillStyle = "#FFFFAA";
      ctx.shadowColor = "#FFFF00";
      ctx.shadowBlur = 10;
      ctx.fillText("[E] EXIT", room.entryX, room.roomH - 8);
    }
    ctx.restore();

    ctx.restore();
};  // end Game.prototype._renderDealershipIndoor

Game.prototype._renderCasinoIndoor = function(ctx, W, H, shake) {
    const room = this._indoor;
    const offX = (W - room.roomW) / 2,
      offY = (H - room.roomH) / 2;
    const S = room.S;
    ctx.fillStyle = "#06030a";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(offX + shake.x, offY + shake.y);
    // Rich casino floor: dark red velvet + gold trim
    for (let ty = 0; ty < room.H; ty++) {
      for (let tx = 0; tx < room.W; tx++) {
        const px = tx * S,
          py = ty * S,
          t = room.layout[ty][tx];
        if (t === 1) {
          ctx.fillStyle = "#110008";
          ctx.fillRect(px, py, S, S);
        } else if (t === 2) {
          // Casino table
          ctx.fillStyle = "#0a1a08";
          ctx.fillRect(px, py, S, S);
          ctx.fillStyle = "#1a3a18";
          ctx.fillRect(px + 6, py + 6, S - 12, S - 12);
          ctx.strokeStyle = "#CC9900";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 6, py + 6, S - 12, S - 12);
          ctx.fillStyle = "#FFDD00";
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "center";
          ctx.fillText("♠", px + S / 2, py + S / 2 + 3);
        } else {
          ctx.fillStyle = (tx + ty) % 2 === 0 ? "#150010" : "#120008";
          ctx.fillRect(px, py, S, S);
          // Gold border lines
          ctx.fillStyle = "rgba(204,153,0,0.12)";
          ctx.fillRect(px, py, S, 1);
          ctx.fillRect(px, py, 1, S);
        }
      }
    }
    // Neon accent
    ctx.fillStyle = "rgba(255,68,170,0.22)";
    ctx.fillRect(0, S, room.roomW, 3);
    ctx.fillStyle = "rgba(255,68,170,0.07)";
    ctx.fillRect(0, S, room.roomW, S * 0.3);
    // Casino hosts + player
    for (const h of this._casinoHosts) h.render(ctx);
    if (!this.player.dead) this.player.render(ctx);
    // [T] hint near host
    if (this._nearCasinoHost) {
      const nearH = this._casinoHosts.find(
        (h) => Math.hypot(h.x - this.player.x, h.y - this.player.y) < 65,
      );
      if (nearH) {
        ctx.save();
        ctx.font = "bold 11px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#FFEEAA";
        ctx.shadowColor = "#FF44AA";
        ctx.shadowBlur = 12;
        ctx.fillText("[T] OPEN CASINO", nearH.x, nearH.y - 62);
        ctx.restore();
      }
    }
    // [E] EXIT hint
    ctx.save();
    ctx.font = "bold 11px Orbitron, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFEEAA";
    ctx.shadowColor = "#FF44AA";
    ctx.shadowBlur = 10;
    ctx.fillText("[E] EXIT", room.entryX, room.roomH - 8);
    ctx.restore();
    ctx.restore();
};  // end Game.prototype._renderCasinoIndoor

