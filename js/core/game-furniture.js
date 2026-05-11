'use strict';
/* Indoor room furniture rendering for all 24 building types — split from game.js */

Game.prototype._renderIndoorFurniture = function(ctx, room) {
    const W = room.roomW,
      H = room.roomH;
    const cx = W / 2,
      topY = H * 0.14,
      midY = H * 0.44;
    // type: string (special door) or number (0-7 building type index)
    const type =
      room._doorSpecial &&
      room._doorSpecial !== "dealership" &&
      room._doorSpecial !== "casino"
        ? room._doorSpecial
        : typeof room._buildingType === "number"
          ? room._buildingType
          : 0;

    // Rounded rect helper
    const rr = (x, y, w, h, r = 4) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    };

    // Corpse helper — draws a top-down human silhouette with blood pool
    // rot: rotation in radians. skinColor: dark tint color. poolAlpha: blood pool opacity.
    const drawCorpse = (x, y, rot, skinColor = '#2a1208', poolAlpha = 0.45) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      // Blood pool (radial gradient beneath body)
      const bpG = ctx.createRadialGradient(0, 4, 0, 0, 4, 20);
      bpG.addColorStop(0, `rgba(110,0,0,${poolAlpha})`);
      bpG.addColorStop(0.6, `rgba(80,0,0,${poolAlpha * 0.5})`);
      bpG.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bpG;
      ctx.beginPath(); ctx.ellipse(0, 6, 18, 11, 0, 0, Math.PI * 2); ctx.fill();
      // Torso
      ctx.fillStyle = skinColor;
      ctx.beginPath(); ctx.ellipse(0, 4, 6, 12, 0, 0, Math.PI * 2); ctx.fill();
      // Head
      ctx.beginPath(); ctx.arc(0, -10, 5.5, 0, Math.PI * 2); ctx.fill();
      // Left arm
      ctx.save(); ctx.translate(-7, 2); ctx.rotate(-0.55);
      ctx.beginPath(); ctx.ellipse(0, 0, 2.5, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      // Right arm
      ctx.save(); ctx.translate(7, 2); ctx.rotate(0.55);
      ctx.beginPath(); ctx.ellipse(0, 0, 2.5, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      // Legs
      ctx.save(); ctx.translate(-3, 15); ctx.rotate(-0.15);
      ctx.beginPath(); ctx.ellipse(0, 0, 2.5, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(3, 15); ctx.rotate(0.15);
      ctx.beginPath(); ctx.ellipse(0, 0, 2.5, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.restore();
    };

    const isDino       = !!this.map?.config?.dino;
    const isJungle     = !!this.map?.config?.jungle;
    const isDesert     = !!this.map?.config?.desert;
    const isMetropolis = !!this.map?.config?.metropolis;

    // Floor tint per building type
    const _floorTints = {
      home: "#1a0a2a",
      0: "#1a0a04",
      1: "#04081a",
      2: "#0a041a",
      3: "#04120a",
      4: "#0e0e04",
      5: "#04100e",
      6: "#100404",
      7: "#0a0a04",
      8: "#14002a",
      9: "#04140a",
      10: "#0c0c10",
      11: "#100804",
      12: "#0e0804",
      13: "#040e10",
      14: "#0c0a04",
      15: "#040a16",
      16: "#10041a",
      17: "#100a04",
      18: "#041008",
      19: "#0c0804",
      20: "#04081a",
      21: "#0c0804",
      22: "#0a0416",
      23: "#041008",
    };
    const _tint = _floorTints[type] || "#0a0a0a";
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = _tint;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.88;

    // Metropolis: delegate to dedicated renderer, human workers, themed rooms
    if (isMetropolis && type !== 'home') {
      ctx.restore();
      this._renderMetropolisRoom(ctx, room, type, W, H, cx, topY, midY);
      ctx.globalAlpha = 1;
      return;
    }

    if (type === "home") {
      // ── Sofa (left-center) ───────────────────────
      ctx.fillStyle = "#5a3a7a";
      ctx.strokeStyle = "#8855bb";
      ctx.lineWidth = 1.5;
      rr(cx - W * 0.42, midY - 18, 84, 34, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#4a2a6a"; // back rest
      rr(cx - W * 0.42, midY - 34, 84, 18, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#7a4aaa";
      ctx.strokeStyle = "#9966cc";
      ctx.lineWidth = 1;
      ctx.fillRect(cx - W * 0.42 + 4, midY - 16, 36, 28);
      ctx.fillRect(cx - W * 0.42 + 44, midY - 16, 36, 28);
      ctx.strokeRect(cx - W * 0.42 + 4, midY - 16, 36, 28);
      ctx.strokeRect(cx - W * 0.42 + 44, midY - 16, 36, 28);

      // ── TV on north wall ─────────────────────────
      ctx.fillStyle = "#111118";
      ctx.strokeStyle = "#44EEFF";
      ctx.lineWidth = 1.5;
      rr(cx - 40, topY + 8, 80, 46, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#0a2a4a";
      ctx.fillRect(cx - 36, topY + 12, 72, 34);
      ctx.fillStyle = "#0055AA";
      for (let i = 0; i < 4; i++)
        ctx.fillRect(cx - 32, topY + 14 + i * 7, 64, 3);
      ctx.fillStyle = "#44EEFF";
      ctx.shadowColor = "#44EEFF";
      ctx.shadowBlur = 7;
      ctx.beginPath();
      ctx.arc(cx, topY + 29, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#333344";
      ctx.fillRect(cx - 7, topY + 54, 14, 8);
      ctx.fillRect(cx - 18, topY + 60, 36, 4);

      // ── Coffee table (center) ────────────────────
      ctx.fillStyle = "#4a3220";
      ctx.strokeStyle = "#8a5a30";
      ctx.lineWidth = 1;
      rr(cx - 28, midY - 4, 56, 26, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#5a4230";
      ctx.fillRect(cx - 24, midY, 48, 18);
      ctx.fillStyle = "#EEDDCC";
      ctx.beginPath();
      ctx.ellipse(cx, midY + 9, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#CC8855";
      ctx.fillRect(cx - 3, midY + 5, 6, 4);

      // ── Bookshelf (right wall) ───────────────────
      ctx.fillStyle = "#3a2a18";
      ctx.strokeStyle = "#6a4a28";
      ctx.lineWidth = 1.5;
      rr(cx + W * 0.3, topY + 4, 40, 74, 2);
      ctx.fill();
      ctx.stroke();
      const bkC = [
        "#CC4433",
        "#3366FF",
        "#44CC66",
        "#FFAA22",
        "#AA44FF",
        "#FF6699",
      ];
      for (let si = 0; si < 3; si++) {
        ctx.fillStyle = "#2a1a08";
        ctx.fillRect(cx + W * 0.3 + 2, topY + 4 + si * 22 + 19, 36, 3);
        for (let bi = 0; bi < 4; bi++) {
          ctx.fillStyle = bkC[(si * 4 + bi) % bkC.length];
          ctx.fillRect(
            cx + W * 0.3 + 4 + bi * 8,
            topY + 4 + si * 22 + 2,
            7,
            16,
          );
        }
      }

      // ── Dining table (upper right area) ─────────
      const dtx = cx + W * 0.2,
        dty = topY + 88;
      ctx.fillStyle = "#5a3a22";
      ctx.strokeStyle = "#8a5a38";
      ctx.lineWidth = 1;
      rr(dtx - 30, dty - 18, 60, 36, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#4a2a18";
      ctx.strokeStyle = "#7a4a2a";
      for (const [ox, oy] of [
        [-36, -10],
        [30, -10],
        [-8, -28],
        [-8, 22],
      ]) {
        rr(dtx + ox - 8, dty + oy - 8, 16, 16, 3);
        ctx.fill();
        ctx.stroke();
      }

      // ── Floor lamp (left corner) ─────────────────
      const lx = cx - W * 0.34,
        ly = topY + 92;
      ctx.strokeStyle = "#886644";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, ly + 28);
      ctx.lineTo(lx, ly - 8);
      ctx.stroke();
      ctx.fillStyle = "#FFEEAA";
      ctx.shadowColor = "#FFDD88";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(lx - 14, ly);
      ctx.lineTo(lx + 14, ly);
      ctx.lineTo(lx + 8, ly - 12);
      ctx.lineTo(lx - 8, ly - 12);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#4a3a20";
      ctx.beginPath();
      ctx.ellipse(lx, ly + 28, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // ── Potted plant (right corner) ─────────────
      const ppx = cx + W * 0.36,
        ppy = midY + 14;
      ctx.fillStyle = "#4a2a10";
      ctx.fillRect(ppx - 8, ppy - 4, 16, 12);
      ctx.fillStyle = "#226622";
      ctx.shadowColor = "#22FF44";
      ctx.shadowBlur = 5;
      for (let li = 0; li < 5; li++) {
        const la = (li / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(
          ppx + Math.cos(la) * 11,
          ppy - 10 + Math.sin(la) * 5,
          9,
          5,
          la,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    } else if (type === "restaurant" || type === 0) {
      if (!!this.map?.config?.galactica) {
        // ═══ GALACTICA: NOVA DINER ═══
        const t = performance.now() / 1000;

        // ── Cosmic floor tiles ────────────────────────
        const tileSize = 60;
        for (let gy = 0; gy < Math.ceil(H / tileSize) + 1; gy++) {
          for (let gx = 0; gx < Math.ceil(W / tileSize) + 1; gx++) {
            const tx = gx * tileSize;
            const ty = gy * tileSize;
            const seed = gx * 13 + gy * 7;
            const baseColor = (seed % 3 === 0) ? "rgba(20,4,50,0.82)"
                            : (seed % 3 === 1) ? "rgba(12,2,38,0.82)"
                            : "rgba(16,3,44,0.82)";
            ctx.fillStyle = baseColor;
            ctx.fillRect(tx, ty, tileSize, tileSize);
            ctx.strokeStyle = "rgba(120,60,220,0.18)";
            ctx.lineWidth = 0.5;
            ctx.strokeRect(tx, ty, tileSize, tileSize);
            // Star inlays
            if (seed % 5 === 0) {
              ctx.fillStyle = `rgba(200,160,255,${0.3 + 0.15 * Math.sin(t * 1.3 + seed)})`;
              ctx.beginPath();
              ctx.arc(tx + 30, ty + 30, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // ── Room border glow ──────────────────────────
        ctx.strokeStyle = "rgba(160,80,255,0.55)";
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, W - 4, H - 4);
        ctx.strokeStyle = "rgba(100,200,255,0.18)";
        ctx.lineWidth = 1;
        ctx.strokeRect(6, 6, W - 12, H - 12);

        // ── Title sign ────────────────────────────────
        const signW = 280, signH = 28;
        const signX = W / 2 - signW / 2, signY = room.S - 24;
        const signGrad = ctx.createLinearGradient(signX, signY, signX + signW, signY);
        signGrad.addColorStop(0, "rgba(80,0,160,0.92)");
        signGrad.addColorStop(0.5, "rgba(140,0,255,0.98)");
        signGrad.addColorStop(1, "rgba(80,0,160,0.92)");
        ctx.fillStyle = signGrad;
        rr(signX, signY, signW, signH, 6);
        ctx.fill();
        ctx.strokeStyle = `rgba(200,120,255,${0.7 + 0.3 * Math.sin(t * 2)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#EEDDFF";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.fillText("◈  NOVA  DINER  ◈", W / 2, signY + 18);

        // ── Service counter (top area) ─────────────────
        const ctrY = topY + 30;
        const ctrW = 360, ctrH = 28;
        const ctrX = W / 2 - ctrW / 2;
        const ctrGrad = ctx.createLinearGradient(ctrX, ctrY, ctrX + ctrW, ctrY);
        ctrGrad.addColorStop(0, "#1a0040");
        ctrGrad.addColorStop(0.5, "#2a0060");
        ctrGrad.addColorStop(1, "#1a0040");
        ctx.fillStyle = ctrGrad;
        rr(ctrX, ctrY, ctrW, ctrH, 6);
        ctx.fill();
        ctx.strokeStyle = "rgba(160,80,255,0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Counter surface gleam
        ctx.fillStyle = "rgba(200,150,255,0.08)";
        ctx.fillRect(ctrX + 4, ctrY + 3, ctrW - 8, 6);
        // Counter items: menu terminal, food display domes
        for (let di = 0; di < 3; di++) {
          const dx = ctrX + 50 + di * 110;
          const dy = ctrY + 14;
          // dome
          ctx.fillStyle = `rgba(180,120,255,${0.15 + 0.08 * Math.sin(t * 1.2 + di)})`;
          ctx.beginPath();
          ctx.ellipse(dx, dy, 20, 10, 0, Math.PI, 0);
          ctx.fill();
          ctx.strokeStyle = "rgba(200,150,255,0.4)";
          ctx.lineWidth = 1;
          ctx.stroke();
          // plate
          ctx.fillStyle = "rgba(240,220,255,0.2)";
          ctx.beginPath();
          ctx.ellipse(dx, dy, 18, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // Menu terminal (right of counter)
        const termX = ctrX + ctrW - 38, termY = ctrY + 4;
        ctx.fillStyle = "#0d0030";
        rr(termX, termY, 28, 20, 3);
        ctx.fill();
        ctx.strokeStyle = "rgba(100,200,255,0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "rgba(100,200,255,0.7)";
        ctx.font = "4px monospace";
        ctx.textAlign = "center";
        ctx.fillText("ORDER", termX + 14, termY + 8);
        ctx.fillText("SYSTEM", termX + 14, termY + 14);

        // ── Menu board (left wall) ─────────────────────
        const mbX = 14, mbY = topY + 36, mbW = 100, mbH = 130;
        const mbGrad = ctx.createLinearGradient(mbX, mbY, mbX, mbY + mbH);
        mbGrad.addColorStop(0, "#0a0028");
        mbGrad.addColorStop(1, "#140050");
        ctx.fillStyle = mbGrad;
        rr(mbX, mbY, mbW, mbH, 6);
        ctx.fill();
        ctx.strokeStyle = "rgba(120,60,255,0.7)";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Neon border line
        ctx.strokeStyle = "rgba(180,100,255,0.3)";
        ctx.lineWidth = 1;
        rr(mbX + 4, mbY + 4, mbW - 8, mbH - 8, 4);
        ctx.stroke();
        ctx.fillStyle = "#CC88FF";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText("✦ MENU ✦", mbX + mbW / 2, mbY + 18);
        ctx.strokeStyle = "rgba(180,100,255,0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mbX + 8, mbY + 22);
        ctx.lineTo(mbX + mbW - 8, mbY + 22);
        ctx.stroke();
        const menuItems = [
          ["🍔 NOVA BURGER", "12 CR"],
          ["🍝 STARPASTA",   "16 CR"],
          ["🍕 VOID PIZZA",  "20 CR"],
          ["🥗 MOON SALAD",  " 9 CR"],
          ["☕ NEBULA BREW",  " 5 CR"],
        ];
        menuItems.forEach(([name, price], i) => {
          const my = mbY + 34 + i * 18;
          ctx.fillStyle = `rgba(200,160,255,${0.8 + 0.2 * Math.sin(t + i)})`;
          ctx.font = "5.5px monospace";
          ctx.textAlign = "left";
          ctx.fillText(name, mbX + 7, my);
          ctx.fillStyle = "#AAFFDD";
          ctx.textAlign = "right";
          ctx.fillText(price, mbX + mbW - 7, my);
          // separator
          ctx.strokeStyle = "rgba(100,50,200,0.3)";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(mbX + 7, my + 4);
          ctx.lineTo(mbX + mbW - 7, my + 4);
          ctx.stroke();
        });

        // ── Dining tables with chairs ──────────────────
        const tableConfigs = [
          { x: W * 0.22, y: H * 0.42 },
          { x: W * 0.50, y: H * 0.42 },
          { x: W * 0.78, y: H * 0.42 },
          { x: W * 0.28, y: H * 0.68 },
          { x: W * 0.72, y: H * 0.68 },
        ];
        for (const tc of tableConfigs) {
          const { x: tx, y: ty } = tc;
          const tW = 70, tH = 44;
          // Table shadow
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          rr(tx - tW / 2 + 3, ty - tH / 2 + 4, tW, tH, 6);
          ctx.fill();
          // Table surface
          const tGrad = ctx.createLinearGradient(tx - tW / 2, ty - tH / 2, tx + tW / 2, ty + tH / 2);
          tGrad.addColorStop(0, "#1c004a");
          tGrad.addColorStop(1, "#2e0070");
          ctx.fillStyle = tGrad;
          rr(tx - tW / 2, ty - tH / 2, tW, tH, 6);
          ctx.fill();
          ctx.strokeStyle = "rgba(160,80,255,0.7)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Table gleam
          ctx.fillStyle = "rgba(200,150,255,0.1)";
          ctx.fillRect(tx - tW / 2 + 4, ty - tH / 2 + 3, tW - 8, 6);

          // Chairs: top and bottom of table
          for (const side of [-1, 1]) {
            const cy2 = ty + side * (tH / 2 + 10);
            for (const cx2 of [tx - 16, tx + 16]) {
              ctx.fillStyle = "#0d0035";
              ctx.strokeStyle = "rgba(120,60,200,0.5)";
              ctx.lineWidth = 1;
              rr(cx2 - 9, cy2 - 7, 18, 14, 3);
              ctx.fill();
              ctx.stroke();
            }
          }
          // Side chairs
          for (const side of [-1, 1]) {
            const cxS = tx + side * (tW / 2 + 8);
            ctx.fillStyle = "#0d0035";
            ctx.strokeStyle = "rgba(120,60,200,0.5)";
            ctx.lineWidth = 1;
            rr(cxS - 7, ty - 8, 14, 16, 3);
            ctx.fill();
            ctx.stroke();
          }

          // Food items on table (small icons)
          // Burger
          ctx.fillStyle = "#CC8833";
          ctx.beginPath();
          ctx.arc(tx - 12, ty - 4, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#884400";
          ctx.beginPath();
          ctx.arc(tx - 12, ty - 4, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#AADD44";
          ctx.beginPath();
          ctx.arc(tx - 12, ty - 5, 3, Math.PI, 0);
          ctx.fill();
          // Drink cup
          ctx.fillStyle = "#2244AA";
          ctx.fillRect(tx + 6, ty - 8, 8, 11);
          ctx.fillStyle = "rgba(100,200,255,0.5)";
          ctx.fillRect(tx + 7, ty - 7, 6, 6);
          // Plate
          ctx.fillStyle = "rgba(220,210,255,0.3)";
          ctx.beginPath();
          ctx.arc(tx + 14, ty + 5, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#FFDD88";
          ctx.beginPath();
          ctx.arc(tx + 14, ty + 5, 3, 0, Math.PI * 2);
          ctx.fill();

          // Seated client figures at table
          const clientPositions = [
            { x: tx - 16, y: ty - tH / 2 - 18 },
            { x: tx + 16, y: ty - tH / 2 - 18 },
            { x: tx - 16, y: ty + tH / 2 + 18 },
            { x: tx + 16, y: ty + tH / 2 + 18 },
          ];
          const clientColors = ["#FF8888", "#88CCFF", "#AAFFAA", "#FFCC88", "#DD99FF"];
          const skinTones = ["#FFDDBB", "#F0C080", "#D4956A", "#EECCAA", "#FFE5CC"];
          const hairCols = ["#332211","#AA5522","#1a1a2a","#FFCC44","#884422"];
          const tableIdx = tableConfigs.indexOf(tc);
          clientPositions.forEach((cp, ci) => {
            const cc = clientColors[(tableIdx * 4 + ci) % clientColors.length];
            const skin = skinTones[(tableIdx * 4 + ci) % skinTones.length];
            const hair = hairCols[(tableIdx + ci) % hairCols.length];
            const isFemale = (tableIdx * 4 + ci) % 3 !== 0;
            const isEating = ci % 2 === 0; // alternating eating pose
            ctx.save();
            // Shadow
            ctx.fillStyle = "rgba(0,0,0,0.18)";
            ctx.beginPath(); ctx.ellipse(cp.x, cp.y + 4, 8, 3, 0, 0, Math.PI*2); ctx.fill();
            // Body
            ctx.fillStyle = cc;
            rr(cp.x - 7, cp.y - 7, 14, 16, 3);
            ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 0.5; ctx.stroke();
            // Neck
            ctx.fillStyle = skin;
            ctx.fillRect(cp.x - 2, cp.y - 9, 4, 4);
            // Head
            ctx.beginPath(); ctx.arc(cp.x, cp.y - 14, 7, 0, Math.PI * 2); ctx.fill();
            // Hair
            ctx.fillStyle = hair;
            if (isFemale) {
              ctx.beginPath(); ctx.arc(cp.x, cp.y - 17, 6, Math.PI, 0); ctx.fill();
              ctx.fillRect(cp.x - 7, cp.y - 18, 4, 10);
              ctx.fillRect(cp.x + 3, cp.y - 18, 4, 10);
            } else {
              ctx.beginPath(); ctx.arc(cp.x, cp.y - 18, 5, Math.PI * 1.1, Math.PI * 1.9); ctx.fill();
              ctx.fillRect(cp.x - 5, cp.y - 18, 10, 5);
            }
            // Eyes
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.ellipse(cp.x - 2.5, cp.y - 15, 1.8, 1.3, 0, 0, Math.PI*2);
            ctx.ellipse(cp.x + 2.5, cp.y - 15, 1.8, 1.3, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = ci % 2 === 0 ? "#2244AA" : "#226622";
            ctx.beginPath();
            ctx.arc(cp.x - 2.5, cp.y - 15, 1, 0, Math.PI*2);
            ctx.arc(cp.x + 2.5, cp.y - 15, 1, 0, Math.PI*2); ctx.fill();
            // Nose
            ctx.fillStyle = "rgba(0,0,0,0.2)";
            ctx.beginPath(); ctx.arc(cp.x, cp.y - 12.5, 1, 0, Math.PI*2); ctx.fill();
            // Mouth (smiling if not eating, open if eating)
            ctx.strokeStyle = isFemale ? "#CC4466" : "#AA6644";
            ctx.lineWidth = 1;
            if (isEating) {
              ctx.fillStyle = "#884422"; ctx.beginPath();
              ctx.ellipse(cp.x, cp.y - 10, 2.5, 1.5, 0, 0, Math.PI*2); ctx.fill();
            } else {
              ctx.beginPath(); ctx.arc(cp.x, cp.y - 10.5, 2.5, 0.1, Math.PI - 0.1); ctx.stroke();
            }
            // Arm (eating gesture or resting)
            if (isEating) {
              ctx.strokeStyle = skin; ctx.lineWidth = 2.5; ctx.lineCap = "round";
              ctx.beginPath(); ctx.moveTo(cp.x + 6, cp.y - 2); ctx.lineTo(cp.x + 11, cp.y - 9); ctx.stroke();
              // Fork/spoon in hand
              ctx.strokeStyle = "rgba(220,200,150,0.8)"; ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(cp.x + 11, cp.y - 9); ctx.lineTo(cp.x + 14, cp.y - 13); ctx.stroke();
              ctx.lineCap = "butt";
            }
            ctx.restore();
          });
        }

        // ── Decorative ambient particles ───────────────
        const ptSeed = Math.floor(t * 0.5);
        for (let pi = 0; pi < 8; pi++) {
          const px = (Math.sin(pi * 2.3 + t * 0.4) * 0.4 + 0.5) * W;
          const py = (Math.cos(pi * 1.7 + t * 0.3) * 0.35 + 0.5) * H;
          const palpha = 0.3 + 0.2 * Math.sin(t * 1.5 + pi);
          ctx.fillStyle = `rgba(180,100,255,${palpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── Cosmic candle/lamp accents ─────────────────
        const lampPositions = [
          [W * 0.48, topY + 64],
          [W * 0.52, topY + 64],
          [W - 16, H * 0.45],
          [W - 16, H * 0.65],
        ];
        for (const [lx, ly] of lampPositions) {
          const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 16);
          lg.addColorStop(0, `rgba(200,140,255,${0.5 + 0.2 * Math.sin(t * 2.1 + lx)})`);
          lg.addColorStop(1, "rgba(100,40,200,0)");
          ctx.fillStyle = lg;
          ctx.beginPath();
          ctx.arc(lx, ly, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(255,220,255,${0.7 + 0.3 * Math.sin(t * 2.1 + lx)})`;
          ctx.beginPath();
          ctx.arc(lx, ly, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── [T] TALK hint near NPC ─────────────────────
        ctx.fillStyle = "rgba(160,80,255,0.85)";
        rr(W / 2 - 34, topY + 60, 68, 14, 4);
        ctx.fill();
        ctx.fillStyle = "#EEDDFF";
        ctx.font = "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.fillText("[T] ORDER FOOD", W / 2, topY + 70);

      } else if (!!this.map?.config?.zombie) {
        // ═══ ZOMBIE: INFECTED DINER ═══
        const t=performance.now()/1000;
        // Sign
        ctx.fillStyle="rgba(80,0,0,0.9)"; rr(W/2-120,room.S-22,240,26,5); ctx.fill();
        ctx.strokeStyle=`rgba(255,40,40,${0.6+0.3*Math.sin(t*1.8)})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#FFAAAA"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
        ctx.fillText("☣  INFECTED DINER  ☣", W/2, room.S-9);
        // Overturned counter (top)
        ctx.fillStyle="#1a0a0a"; rr(W/2-160,topY+28,320,24,4); ctx.fill();
        ctx.strokeStyle="rgba(180,30,30,0.5)"; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="rgba(140,0,0,0.15)"; ctx.fillRect(W/2-158,topY+30,316,10);
        // Toppled tables with rotten food
        const tConfigs=[[W*0.2,H*0.40],[W*0.5,H*0.43],[W*0.78,H*0.40],[W*0.3,H*0.67],[W*0.7,H*0.67]];
        for (const [tx2,ty2] of tConfigs) {
          const angle=Math.sin(tx2*0.01)*0.4;
          ctx.save(); ctx.translate(tx2,ty2); ctx.rotate(angle);
          ctx.fillStyle="#1a0a00"; rr(-32,-18,64,36,4); ctx.fill();
          ctx.strokeStyle="rgba(100,40,0,0.6)"; ctx.lineWidth=1; ctx.stroke();
          // Rotten food on table
          ctx.fillStyle="rgba(80,120,20,0.7)"; ctx.beginPath(); ctx.arc(-10,-5,6,0,Math.PI*2); ctx.fill(); // moldy food
          ctx.fillStyle="rgba(140,0,0,0.5)"; ctx.beginPath(); ctx.ellipse(12,3,8,4,0.2,0,Math.PI*2); ctx.fill(); // blood/sauce
          // Knocked-over cup
          ctx.fillStyle="#2a1a00"; ctx.fillRect(16,-14,6,14);
          ctx.fillStyle="rgba(44,180,44,0.4)"; ctx.beginPath(); ctx.ellipse(22,-8,8,3,-0.3,0,Math.PI*2); ctx.fill();
          ctx.restore();
          // Broken chair nearby
          ctx.fillStyle="#120800"; ctx.strokeStyle="rgba(80,40,0,0.5)"; ctx.lineWidth=0.8;
          rr(tx2+28,ty2+14,14,12,2); ctx.fill(); ctx.stroke();
        }
        // Biohazard warning on left wall
        const bwx=18, bwy=H*0.36, bwW=80, bwH=80;
        ctx.fillStyle="rgba(40,0,0,0.85)"; rr(bwx,bwy,bwW,bwH,4); ctx.fill();
        ctx.strokeStyle="rgba(200,0,0,0.5)"; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle=`rgba(255,40,40,${0.7+0.3*Math.sin(t*1.5)})`; ctx.font="28px serif"; ctx.textAlign="center";
        ctx.fillText("☣", bwx+bwW/2, bwy+48);
        ctx.fillStyle="rgba(255,100,100,0.8)"; ctx.font="bold 5px monospace";
        ctx.fillText("CONTAMINATED", bwx+bwW/2, bwy+68);
        // Spreading infection pools on floor
        for (const [px3,py3,r] of [[W*0.4,H*0.55,22],[W*0.7,H*0.62,16],[W*0.2,H*0.72,18]]) {
          ctx.fillStyle="rgba(30,130,20,0.18)"; ctx.beginPath(); ctx.ellipse(px3,py3,r,r*0.6,px3*0.01,0,Math.PI*2); ctx.fill();
        }
        // Broken window (right wall)
        ctx.fillStyle="#0d0500"; rr(W-60,H*0.38,40,50,3); ctx.fill();
        ctx.strokeStyle="rgba(180,30,0,0.4)"; ctx.lineWidth=1; ctx.stroke();
        ctx.strokeStyle="rgba(80,80,80,0.6)"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(W-40,H*0.38); ctx.lineTo(W-30,H*0.38+30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W-20,H*0.38+5); ctx.lineTo(W-42,H*0.38+40); ctx.stroke();
        // Survivor message on wall
        ctx.fillStyle="rgba(200,80,0,0.7)"; ctx.font="bold 6px monospace"; ctx.textAlign="center";
        ctx.fillText("RUN. DO NOT EAT.", W/2, H*0.84);
      } else if (!!this.map?.config?.hardcore) {
        // ═══ HARDCORE: INFERNO KITCHEN ═══
        const t = performance.now() / 1000;
        const EMBER = "#FF8800"; const FLAME = "#FF5500"; const CRIMSON = "#FF2200"; const AMBER = "#FFAA00";
        const EMBERr = "255,136,0"; const FLAMEr = "255,85,0"; const CRIMSONr = "255,34,0"; const AMBERr = "255,170,0";

        // Background scorch pattern
        ctx.fillStyle = "#0a0100"; ctx.fillRect(0,0,W,H);
        for (let si=0;si<14;si++) {
          const sx=50+si*72, sy=60+((si*37)%200);
          const sg=ctx.createRadialGradient(sx,sy,0,sx,sy,32);
          sg.addColorStop(0,`rgba(${FLAMEr},0.08)`); sg.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(sx,sy,32,0,Math.PI*2); ctx.fill();
        }

        // Title
        ctx.save(); ctx.font="bold 19px Orbitron, monospace"; ctx.textAlign="center";
        ctx.fillStyle="#fff"; ctx.shadowColor=FLAME; ctx.shadowBlur=28;
        ctx.fillText("🔥 INFERNO KITCHEN 🔥", cx, topY-10); ctx.shadowBlur=0; ctx.restore();

        // ── Industrial grill bar (top center) ──
        ctx.fillStyle="#1a0800"; ctx.strokeStyle=EMBER; ctx.lineWidth=2;
        rr(cx-160,topY+8,320,28,4); ctx.fill(); ctx.stroke();
        // Grill grates
        for (let gi=0;gi<8;gi++) {
          ctx.strokeStyle=`rgba(${EMBERr},0.5)`; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(cx-148+gi*40,topY+10); ctx.lineTo(cx-148+gi*40,topY+34); ctx.stroke();
        }
        for (let gi=0;gi<3;gi++) {
          ctx.strokeStyle=`rgba(${FLAMEr},0.4)`; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(cx-156,topY+14+gi*8); ctx.lineTo(cx+156,topY+14+gi*8); ctx.stroke();
        }
        // Flames over grill (animated)
        for (let fi=0;fi<7;fi++) {
          const fx=cx-130+fi*44, fh=12+7*Math.sin(t*3+fi*0.9);
          const fg=ctx.createLinearGradient(fx,topY+8,fx,topY+8-fh);
          fg.addColorStop(0,`rgba(${FLAMEr},0.8)`); fg.addColorStop(1,"rgba(255,200,0,0)");
          ctx.fillStyle=fg; ctx.beginPath(); ctx.ellipse(fx,topY+8,7,fh,0,0,Math.PI*2); ctx.fill();
        }

        // ── Prep counter (left side) ──
        ctx.fillStyle="#150800"; ctx.strokeStyle=AMBER; ctx.lineWidth=1.5;
        rr(40,topY+70,180,90,5); ctx.fill(); ctx.stroke();
        ctx.fillStyle=`rgba(${AMBERr},0.06)`; ctx.fillRect(44,topY+74,172,82);
        // Food items on counter
        const foods=[{x:80,y:topY+100,col:"#CC2200",r:9},{x:110,y:topY+95,col:"#884400",r:7},{x:140,y:topY+108,col:"#FF6600",r:8},{x:170,y:topY+100,col:"#AA3300",r:6}];
        foods.forEach(f=>{ctx.fillStyle=f.col; ctx.strokeStyle=EMBER; ctx.lineWidth=0.8; ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,Math.PI*2); ctx.fill(); ctx.stroke();});
        ctx.fillStyle=`rgba(${EMBERr},0.7)`; ctx.font="bold 7px monospace"; ctx.textAlign="center";
        ctx.fillText("PREP STATION", 130, topY+150);

        // ── Oven bank (right side) ──
        ctx.fillStyle="#120600"; ctx.strokeStyle=FLAME; ctx.lineWidth=1.5;
        rr(W-230,topY+70,185,90,5); ctx.fill(); ctx.stroke();
        // 3 ovens
        for (let oi=0;oi<3;oi++) {
          const ox=W-218+oi*60;
          ctx.fillStyle="#0a0300"; ctx.strokeStyle=EMBER; ctx.lineWidth=1;
          rr(ox,topY+80,48,64,4); ctx.fill(); ctx.stroke();
          // Oven window
          const og=ctx.createRadialGradient(ox+24,topY+104,0,ox+24,topY+104,16);
          og.addColorStop(0,`rgba(${FLAMEr},${0.5+0.3*Math.sin(t*2+oi)})`); og.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=og; rr(ox+8,topY+88,32,28,3); ctx.fill();
          ctx.strokeStyle=`rgba(${EMBERr},0.6)`; ctx.lineWidth=0.8; ctx.stroke();
          // Dials
          ctx.fillStyle=EMBER; ctx.beginPath(); ctx.arc(ox+15,topY+122,4,0,Math.PI*2); ctx.fill();
          ctx.fillStyle=FLAME; ctx.beginPath(); ctx.arc(ox+33,topY+122,4,0,Math.PI*2); ctx.fill();
        }
        ctx.fillStyle=`rgba(${FLAMEr},0.7)`; ctx.font="bold 7px monospace"; ctx.textAlign="center";
        ctx.fillText("INFERNO OVENS", W-143, topY+150);

        // ── 4 dining tables (2 rows × 2) ──
        const tblPositions=[[cx-200,midY-40],[cx+50,midY-40],[cx-200,midY+100],[cx+50,midY+100]];
        const tblCols=[EMBER,FLAME,CRIMSON,AMBER];
        tblPositions.forEach(([tx,ty],i)=>{
          ctx.fillStyle="#1a0800"; ctx.strokeStyle=tblCols[i]; ctx.lineWidth=1.5;
          rr(tx,ty,140,80,6); ctx.fill(); ctx.stroke();
          // Plates & cups
          const cr=tblCols[i];
          [[tx+25,ty+25],[tx+75,ty+25],[tx+115,ty+25],[tx+25,ty+55],[tx+75,ty+55],[tx+115,ty+55]].forEach(([px,py],pi)=>{
            if(pi<4){ctx.fillStyle="#0a0200"; ctx.strokeStyle=cr; ctx.lineWidth=0.8; ctx.beginPath(); ctx.arc(px,py,9,0,Math.PI*2); ctx.fill(); ctx.stroke();}
            else{ctx.fillStyle=cr+"44"; ctx.strokeStyle=cr; ctx.lineWidth=0.8; rr(px-5,py-7,10,14,2); ctx.fill(); ctx.stroke();}
          });
        });

        // ── Seated diners (4 tables × 2 people) ──
        const dinerSeats=[[cx-180,midY-60],[cx-150,midY-60],[cx+70,midY-60],[cx+100,midY-60],
                          [cx-180,midY+90],[cx-150,midY+90],[cx+70,midY+90],[cx+100,midY+90]];
        const dinerCols=["#8B1A00","#CC3300","#FF5500","#AA2200","#993300","#FF4400","#BB2200","#FF6600"];
        dinerSeats.forEach(([dx,dy],di)=>{
          ctx.fillStyle=dinerCols[di%dinerCols.length];
          ctx.beginPath(); ctx.arc(dx,dy,8,0,Math.PI*2); ctx.fill(); // head
          ctx.fillRect(dx-7,dy+6,14,16); // body
          ctx.fillStyle="#1a0800"; ctx.beginPath(); ctx.arc(dx,dy,4,0,Math.PI*2); ctx.fill(); // hair
        });

        // ── Kitchen equipment (bottom row) ──
        // Large pot
        ctx.fillStyle="#1e0800"; ctx.strokeStyle=EMBER; ctx.lineWidth=1.5;
        rr(cx-260,H*0.7,90,70,5); ctx.fill(); ctx.stroke();
        const potG=ctx.createRadialGradient(cx-215,H*0.73,0,cx-215,H*0.73,30);
        potG.addColorStop(0,`rgba(${FLAMEr},${0.4+0.2*Math.sin(t*2)})`); potG.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=potG; ctx.beginPath(); ctx.ellipse(cx-215,H*0.73,28,18,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=`rgba(${AMBERr},0.7)`; ctx.font="bold 7px monospace"; ctx.textAlign="center"; ctx.fillText("CAULDRON",cx-215,H*0.78);

        // Spice rack (wall)
        ctx.fillStyle="#130600"; ctx.strokeStyle=AMBER; ctx.lineWidth=1;
        rr(cx-80,H*0.7,160,65,4); ctx.fill(); ctx.stroke();
        for (let si=0;si<6;si++) {
          const scx=cx-65+si*26, sc=si%2===0?EMBER:FLAME;
          ctx.fillStyle=sc+"44"; ctx.strokeStyle=sc; ctx.lineWidth=0.8;
          rr(scx,H*0.73,18,38,2); ctx.fill(); ctx.stroke();
          ctx.fillStyle=sc; ctx.font="bold 4px monospace"; ctx.textAlign="center";
          const spices=["CHAR","BRIM","INFR","SCORCH","BLAZE","CINDER"];
          ctx.fillText(spices[si],scx+9,H*0.73+46);
        }

        // Fryer station
        ctx.fillStyle="#0e0400"; ctx.strokeStyle=CRIMSON; ctx.lineWidth=1.5;
        rr(cx+160,H*0.7,100,70,5); ctx.fill(); ctx.stroke();
        const fyG=ctx.createRadialGradient(cx+210,H*0.73,0,cx+210,H*0.73,24);
        fyG.addColorStop(0,`rgba(${AMBERr},${0.5+0.2*Math.sin(t*3+1)})`); fyG.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=fyG; ctx.beginPath(); ctx.ellipse(cx+210,H*0.73,22,14,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=`rgba(${CRIMSONr},0.7)`; ctx.font="bold 7px monospace"; ctx.textAlign="center"; ctx.fillText("LAVA FRYER",cx+210,H*0.78);

        // Floor drain
        ctx.fillStyle="#0a0100"; ctx.strokeStyle=`rgba(${FLAMEr},0.3)`; ctx.lineWidth=1;
        ctx.beginPath(); ctx.arc(cx,H*0.88,16,0,Math.PI*2); ctx.fill(); ctx.stroke();
        for(let di=0;di<4;di++){ctx.beginPath();ctx.moveTo(cx,H*0.88);ctx.lineTo(cx+Math.cos(di*Math.PI/2)*14,H*0.88+Math.sin(di*Math.PI/2)*14);ctx.stroke();}

        // Ember drift particles (decorative)
        for (let ei=0;ei<10;ei++) {
          const ex=50+ei*102, ey=H*0.6+20*Math.sin(t*1.3+ei*0.8);
          const ea=0.15+0.1*Math.sin(t*2+ei);
          ctx.fillStyle=`rgba(${EMBERr},${ea})`; ctx.beginPath(); ctx.arc(ex,ey,2,0,Math.PI*2); ctx.fill();
        }
      } else {
        // ── Default restaurant (non-galactica) ──────────
        // ── Bar counter (top) ────────────────────────
        ctx.fillStyle = "#3a2010";
        ctx.strokeStyle = "#6a4020";
        ctx.lineWidth = 1.5;
        rr(cx - 72, topY + 6, 144, 22, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(255,200,150,0.12)";
        ctx.fillRect(cx - 70, topY + 8, 140, 7);
        for (let i = 0; i < 4; i++) {
          const sx = cx - 54 + i * 36;
          ctx.fillStyle = "#AA5533";
          ctx.strokeStyle = "#CC7744";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(sx, topY + 38, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = "#886633";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx, topY + 38);
          ctx.lineTo(sx, topY + 30);
          ctx.stroke();
        }

        // ── 3 round dining tables ────────────────────
        for (const [tx2, ty2] of [
          [cx - W * 0.3, midY - 8],
          [cx, midY + 6],
          [cx + W * 0.28, midY - 8],
        ]) {
          ctx.fillStyle = "#FFEECC";
          ctx.strokeStyle = "#CC9966";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(tx2, ty2, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#EE8844";
          ctx.beginPath();
          ctx.arc(tx2, ty2, 17, 0, Math.PI * 2);
          ctx.fill();
          for (let ci = 0; ci < 3; ci++) {
            const ca = (ci / 3) * Math.PI * 2 - Math.PI / 2;
            ctx.fillStyle = "#5a3820";
            ctx.strokeStyle = "#8a5830";
            ctx.lineWidth = 1;
            rr(
              tx2 + Math.cos(ca) * 29 - 7,
              ty2 + Math.sin(ca) * 29 - 7,
              14,
              14,
              3,
            );
            ctx.fill();
            ctx.stroke();
          }
          ctx.fillStyle = "#FFEEAA";
          ctx.shadowColor = "#FFDD66";
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(tx2, ty2, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // ── Menu board (left wall) ───────────────────
        ctx.fillStyle = "#1a3a1a";
        ctx.strokeStyle = "#44AA44";
        ctx.lineWidth = 1.5;
        rr(cx - W * 0.46, topY + 4, 54, 64, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#AAFFAA";
        ctx.font = "bold 6px monospace";
        ctx.textAlign = "center";
        ctx.fillText("MENU", cx - W * 0.46 + 27, topY + 16);
        ctx.fillStyle = "#88FF88";
        ctx.font = "5px monospace";
        ["BURGER $8", "PASTA $12", "PIZZA $15", "SALAD $9", "COFFEE $4"].forEach(
          (t, i) => {
            ctx.fillText(t, cx - W * 0.46 + 27, topY + 26 + i * 9);
          },
        );
      } // end default restaurant
    } else if (type === 1) {
      // OFFICE
      const isSnowOffice = !!this.map?.config?.snow;
      const t = performance.now() / 1000;
      if (!!this.map?.config?.robot) {
        // ═══ ROBOT CITY: CORPORATE COMMAND CENTER ═══
        const t1 = performance.now() / 1000;

        // ── Sign (top-center) ─────────────────────────────────────────────
        ctx.fillStyle = "#040c14"; rr(cx-110, topY+2, 220, 20, 3); ctx.fill();
        ctx.strokeStyle = "#00CCFF"; ctx.lineWidth = 1.5; ctx.strokeRect(cx-110, topY+2, 220, 20);
        ctx.fillStyle = "#00CCFF"; ctx.shadowColor = "#00CCFF"; ctx.shadowBlur = 12;
        ctx.font = "bold 10px Orbitron, monospace"; ctx.textAlign = "center";
        ctx.fillText("⬡  RCORP COMMAND NODE  ⬡", cx, topY + 15);
        ctx.shadowBlur = 0;

        // ── Hexagonal command table (center) ─────────────────────────────
        ctx.fillStyle = "#0c1a26"; ctx.strokeStyle = "#00CCAA"; ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI/3)*i - Math.PI/6;
          const hx = cx + Math.cos(a)*62, hy = midY + Math.sin(a)*38;
          i===0 ? ctx.moveTo(hx,hy) : ctx.lineTo(hx,hy);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Table surface glow
        const tglow = Math.sin(t1*1.5)*0.5+0.5;
        ctx.fillStyle = `rgba(0,200,180,${0.05+tglow*0.04})`;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI/3)*i - Math.PI/6;
          ctx.lineTo(cx + Math.cos(a)*56, midY + Math.sin(a)*34);
        }
        ctx.closePath(); ctx.fill();
        // Holographic display on table
        ctx.strokeStyle = `rgba(0,220,255,${0.3+tglow*0.2})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(cx, midY-8, 40, 22, 0, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = `rgba(0,180,220,${0.08+tglow*0.06})`;
        ctx.beginPath(); ctx.ellipse(cx, midY-8, 40, 22, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = `rgba(0,255,200,${0.4+tglow*0.3})`; ctx.font = "bold 6px monospace"; ctx.textAlign = "center";
        ctx.fillText("SECTOR MAP", cx, midY-5);
        // Seated executives around table — draw chair + person figure
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI/3)*i;
          const sx3 = cx + Math.cos(a)*80, sy3 = midY + Math.sin(a)*50;
          // Chair seat
          ctx.fillStyle = "#0e1c2c"; ctx.strokeStyle = "#00AACC"; ctx.lineWidth = 1;
          rr(sx3-8, sy3, 16, 11, 3); ctx.fill(); ctx.stroke();
          // Chair back
          ctx.fillStyle = "#1a2c3c"; rr(sx3-6, sy3-10, 12, 10, 2); ctx.fill(); ctx.stroke();
          // Person: legs
          ctx.fillStyle = "#2a3a50";
          ctx.fillRect(sx3-5, sy3+5, 4, 8);
          ctx.fillRect(sx3+1, sy3+5, 4, 8);
          // Body (suit jacket)
          ctx.fillStyle = "#1e3050"; rr(sx3-6, sy3-8, 12, 10, 2); ctx.fill();
          // Tie accent
          ctx.fillStyle = "#00AACC"; ctx.fillRect(sx3-1, sy3-7, 2, 7);
          // Head
          ctx.fillStyle = "#DDBB99";
          ctx.beginPath(); ctx.arc(sx3, sy3-13, 5, 0, Math.PI*2); ctx.fill();
          // Hair
          ctx.fillStyle = "#332211";
          ctx.beginPath(); ctx.arc(sx3, sy3-15, 4, Math.PI, 0); ctx.fill();
        }

        // ── Left wall: data monitors array ────────────────────────────────
        const monW = 44, monH = 30, monY = topY+30;
        for (let m = 0; m < 3; m++) {
          const mx = W*0.06 + m*(monW+8);
          ctx.fillStyle = "#080e14"; rr(mx, monY, monW, monH, 2); ctx.fill();
          ctx.strokeStyle = "#00CCAA"; ctx.lineWidth = 1; ctx.strokeRect(mx, monY, monW, monH);
          // Animated scan line
          const sl = ((t1*35 + m*25) % monH);
          ctx.fillStyle = `rgba(0,220,180,0.15)`; ctx.fillRect(mx+1, monY+sl, monW-2, 2);
          // Data bars
          for (let b = 0; b < 5; b++) {
            const bh = 6 + ((m*7+b*3) % 14);
            ctx.fillStyle = b%2===0 ? `rgba(0,200,255,0.5)` : `rgba(0,255,160,0.4)`;
            ctx.fillRect(mx+4+b*8, monY+monH-3-bh, 6, bh);
          }
        }
        // Monitor stand
        ctx.fillStyle = "#0c1820"; ctx.fillRect(W*0.06, monY+monH, (monW+8)*3-8, 6);
        ctx.fillStyle = "#00CCAA"; ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
        ctx.fillText("SECTOR FEED", W*0.06+(monW+8)*1.5-4, monY+monH+14);

        // ── Right wall: executive pod / server unit ────────────────────────
        const execX = W*0.76, execY = topY+10;
        ctx.fillStyle = "#0c1a24"; ctx.strokeStyle = "#00CCFF"; ctx.lineWidth = 1.5;
        rr(execX, execY, 70, 90, 4); ctx.fill(); ctx.stroke();
        // Server rows
        for (let sr = 0; sr < 5; sr++) {
          ctx.fillStyle = "#0a1620"; rr(execX+5, execY+8+sr*16, 60, 11, 2); ctx.fill();
          // LED indicators
          for (let led = 0; led < 4; led++) {
            const on = (sr*11+led*7) % 3 !== 0;
            ctx.fillStyle = on ? (led%2===0 ? '#00FF88':'#00AAFF') : '#0a1a24';
            ctx.fillRect(execX+8+led*12, execY+12+sr*16, 7, 3);
          }
        }
        ctx.fillStyle = "#00CCFF"; ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
        ctx.fillText("EXEC NODE", execX+35, execY+95);

        // ── Bottom: document printers / terminals ─────────────────────────
        for (let t2 = 0; t2 < 3; t2++) {
          const tx2 = W*0.12 + t2*(W*0.24), ty2 = H*0.72;
          ctx.fillStyle = "#0c1820"; rr(tx2, ty2, 54, 36, 3); ctx.fill();
          ctx.strokeStyle = "#1a3040"; ctx.lineWidth = 1; ctx.strokeRect(tx2, ty2, 54, 36);
          ctx.fillStyle = "#081220"; rr(tx2+4, ty2+4, 46, 20, 2); ctx.fill();
          ctx.strokeStyle = "#00AACC"; ctx.lineWidth = 0.8; ctx.strokeRect(tx2+4, ty2+4, 46, 20);
          // Paper output slot
          ctx.fillStyle = "#EEEEFF"; ctx.fillRect(tx2+10, ty2+26, 24, 6);
          ctx.fillStyle = "#AABBCC"; ctx.font = "5px monospace"; ctx.textAlign = "center";
          ctx.fillText("OUTPUT", tx2+27, ty2+35);
        }

        // ── Plants (robot city: metal bonsai sculptures) ──────────────────
        for (const [px2,py2] of [[W*0.06,H*0.66],[W*0.84,H*0.66]]) {
          ctx.fillStyle = "#1a2830"; rr(px2-8, py2, 16, 12, 2); ctx.fill();
          ctx.strokeStyle = "#2a3a4a"; ctx.lineWidth = 1; ctx.strokeRect(px2-8, py2, 16, 12);
          // Chrome bonsai trunk
          ctx.fillStyle = "#4a6a7a"; ctx.fillRect(px2-1, py2-18, 3, 18);
          // Metallic branches
          for (let br = 0; br < 4; br++) {
            const ba = Math.PI*0.6 + br*Math.PI*0.25;
            ctx.strokeStyle = "#5a8090"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(px2, py2-10); ctx.lineTo(px2+Math.cos(ba)*12, py2-10+Math.sin(ba)*8); ctx.stroke();
          }
          ctx.fillStyle = `rgba(0,220,180,${0.5+Math.sin(t1*2)*0.3})`; ctx.shadowColor="#00DDBB"; ctx.shadowBlur=4;
          ctx.beginPath(); ctx.arc(px2, py2-20, 8, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
        }

      } else {
      // OFFICE (default)
      // ── Meeting table (center) ───────────────────
      ctx.fillStyle = "#2a3a4a";
      ctx.strokeStyle = "#4a6a8a";
      ctx.lineWidth = 1.5;
      rr(cx - 58, midY - 26, 116, 52, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#1a2a3a";
      rr(cx - 54, midY - 22, 108, 44, 2);
      ctx.fill();
      ctx.fillStyle = "#334455";
      ctx.strokeStyle = "#4466AA";
      ctx.lineWidth = 1;
      for (const [ox, oy] of [
        [-68, -16],
        [-68, 6],
        [68, -16],
        [68, 6],
        [-24, -34],
        [24, -34],
        [-24, 32],
        [24, 32],
      ]) {
        ctx.beginPath();
        ctx.arc(cx + ox, midY + oy, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      for (let li = 0; li < 3; li++) {
        ctx.fillStyle = "#223344";
        ctx.fillRect(cx - 42 + li * 44, midY - 14, 26, 20);
        ctx.fillStyle = "#1155AA";
        ctx.fillRect(cx - 40 + li * 44, midY - 12, 22, 16);
      }

      if (isSnowOffice) {
        // ═══ FROZEN TUNDRA: WINTER CORPORATE OFFICE ═══

        // ── Office sign ───────────────────
        ctx.fillStyle = "#AADDFF";
        ctx.shadowColor = "#66BBFF";
        ctx.shadowBlur = 12;
        ctx.font = "bold 10px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("❄ FROST CORP OFFICE ❄", cx, topY - 2);
        ctx.shadowBlur = 0;

        // ── Row of desks with workers (top row) ───────────────────
        for (let di = 0; di < 3; di++) {
          const deskX = cx - W * 0.35 + di * W * 0.3;
          const deskY = topY + 8;

          // Desk
          ctx.fillStyle = "#1a2a3a";
          ctx.strokeStyle = "#3a5a7a";
          ctx.lineWidth = 1.5;
          rr(deskX - 30, deskY, 60, 32, 3);
          ctx.fill();
          ctx.stroke();

          // Computer monitor
          ctx.fillStyle = "#0a1520";
          ctx.strokeStyle = "#66BBFF";
          ctx.lineWidth = 1;
          rr(deskX - 18, deskY + 2, 36, 24, 2);
          ctx.fill();
          ctx.stroke();
          // Screen glow
          const screenPulse = Math.sin(t * 2 + di) * 0.2 + 0.8;
          ctx.fillStyle = `rgba(100,180,255,${0.3 * screenPulse})`;
          ctx.fillRect(deskX - 16, deskY + 4, 32, 18);
          // Data on screen
          ctx.fillStyle = "#88DDFF";
          ctx.font = "4px monospace";
          ctx.textAlign = "center";
          for (let li = 0; li < 3; li++) {
            ctx.fillText("▓▓▓▓▓▓", deskX, deskY + 8 + li * 5);
          }

          // Keyboard
          ctx.fillStyle = "#0c1820";
          rr(deskX - 14, deskY + 28, 28, 8, 1);
          ctx.fill();
          for (let ki = 0; ki < 5; ki++) {
            ctx.fillStyle = `rgba(100,180,255,${0.25 + Math.sin(t + ki + di) * 0.1})`;
            ctx.fillRect(deskX - 12 + ki * 5, deskY + 30, 4, 4);
          }

          // Office chair behind desk
          ctx.fillStyle = "#2a4050";
          ctx.strokeStyle = "#4a6070";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(deskX, deskY + 48, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // Chair back
          ctx.fillStyle = "#3a5060";
          rr(deskX - 10, deskY + 38, 20, 12, 2);
          ctx.fill();

          // Worker sitting at desk - more realistic rendering
          const bobY = Math.sin(t * 0.8 + di * 2) * 1;
          const breathe = Math.sin(t * 1.2 + di) * 0.5;
          const workerColors = [
            { suit: "#3355AA", shirt: "#DDEEFF", hair: "#443322", skin: "#E8D4C4" },
            { suit: "#4466BB", shirt: "#EEFFEE", hair: "#2a1a10", skin: "#D4C4B4" },
            { suit: "#5577CC", shirt: "#FFEEDD", hair: "#554433", skin: "#F0E0D0" }
          ][di];

          // Arms resting on desk
          ctx.fillStyle = workerColors.suit;
          ctx.fillRect(deskX - 18, deskY + 26 + bobY, 8, 10);
          ctx.fillRect(deskX + 10, deskY + 26 + bobY, 8, 10);
          // Hands on keyboard
          ctx.fillStyle = workerColors.skin;
          ctx.beginPath();
          ctx.arc(deskX - 10, deskY + 32 + bobY, 3, 0, Math.PI * 2);
          ctx.arc(deskX + 10, deskY + 32 + bobY, 3, 0, Math.PI * 2);
          ctx.fill();

          // Body/torso (business attire)
          ctx.fillStyle = workerColors.suit;
          ctx.beginPath();
          ctx.moveTo(deskX - 10, deskY + 56 + bobY);
          ctx.lineTo(deskX - 12, deskY + 40 + breathe);
          ctx.lineTo(deskX - 8, deskY + 36 + breathe);
          ctx.lineTo(deskX + 8, deskY + 36 + breathe);
          ctx.lineTo(deskX + 12, deskY + 40 + breathe);
          ctx.lineTo(deskX + 10, deskY + 56 + bobY);
          ctx.closePath();
          ctx.fill();

          // Collar/shirt visible
          ctx.fillStyle = workerColors.shirt;
          ctx.beginPath();
          ctx.moveTo(deskX - 4, deskY + 38 + breathe);
          ctx.lineTo(deskX, deskY + 42 + breathe);
          ctx.lineTo(deskX + 4, deskY + 38 + breathe);
          ctx.closePath();
          ctx.fill();

          // Neck
          ctx.fillStyle = workerColors.skin;
          ctx.fillRect(deskX - 3, deskY + 32 + bobY, 6, 6);

          // Head - more detailed
          ctx.fillStyle = workerColors.skin;
          ctx.beginPath();
          ctx.ellipse(deskX, deskY + 28 + bobY, 8, 9, 0, 0, Math.PI * 2);
          ctx.fill();

          // Ears
          ctx.beginPath();
          ctx.ellipse(deskX - 8, deskY + 28 + bobY, 2, 3, 0, 0, Math.PI * 2);
          ctx.ellipse(deskX + 8, deskY + 28 + bobY, 2, 3, 0, 0, Math.PI * 2);
          ctx.fill();

          // Hair - varied styles
          ctx.fillStyle = workerColors.hair;
          if (di === 0) {
            // Short neat hair
            ctx.beginPath();
            ctx.ellipse(deskX, deskY + 22 + bobY, 8, 5, 0, Math.PI, 0);
            ctx.fill();
            ctx.fillRect(deskX - 7, deskY + 20 + bobY, 14, 5);
          } else if (di === 1) {
            // Side-parted hair
            ctx.beginPath();
            ctx.ellipse(deskX + 1, deskY + 21 + bobY, 9, 6, 0.1, Math.PI, 0);
            ctx.fill();
            ctx.fillRect(deskX - 7, deskY + 21 + bobY, 15, 4);
          } else {
            // Longer hair
            ctx.beginPath();
            ctx.ellipse(deskX, deskY + 21 + bobY, 9, 6, 0, Math.PI, 0);
            ctx.fill();
            ctx.fillRect(deskX - 8, deskY + 21 + bobY, 16, 6);
            // Side hair
            ctx.fillRect(deskX - 9, deskY + 25 + bobY, 3, 6);
            ctx.fillRect(deskX + 6, deskY + 25 + bobY, 3, 6);
          }

          // Eyes
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.ellipse(deskX - 3, deskY + 27 + bobY, 2.5, 2, 0, 0, Math.PI * 2);
          ctx.ellipse(deskX + 3, deskY + 27 + bobY, 2.5, 2, 0, 0, Math.PI * 2);
          ctx.fill();
          // Pupils - looking at screen
          ctx.fillStyle = "#3a4a5a";
          ctx.beginPath();
          ctx.arc(deskX - 3, deskY + 27 + bobY, 1, 0, Math.PI * 2);
          ctx.arc(deskX + 3, deskY + 27 + bobY, 1, 0, Math.PI * 2);
          ctx.fill();

          // Eyebrows
          ctx.strokeStyle = workerColors.hair;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(deskX - 5, deskY + 24 + bobY);
          ctx.lineTo(deskX - 1, deskY + 23 + bobY);
          ctx.moveTo(deskX + 1, deskY + 23 + bobY);
          ctx.lineTo(deskX + 5, deskY + 24 + bobY);
          ctx.stroke();

          // Nose (subtle)
          ctx.strokeStyle = "rgba(150,120,100,0.4)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(deskX, deskY + 28 + bobY);
          ctx.lineTo(deskX, deskY + 31 + bobY);
          ctx.stroke();

          // Mouth - focused expression
          ctx.strokeStyle = "#AA8877";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(deskX - 2, deskY + 33 + bobY);
          ctx.lineTo(deskX + 2, deskY + 33 + bobY);
          ctx.stroke();
        }

        // ── Central meeting area with workers ───────────────────
        // Table
        ctx.fillStyle = "#1a2838";
        ctx.strokeStyle = "#3a5868";
        ctx.lineWidth = 1.5;
        rr(cx - 50, midY - 12, 100, 40, 4);
        ctx.fill();
        ctx.stroke();

        // Documents on table
        ctx.fillStyle = "#EEFFFF";
        ctx.fillRect(cx - 30, midY - 6, 18, 24);
        ctx.fillRect(cx + 10, midY - 4, 18, 24);

        // Workers around meeting table - more realistic
        const meetingWorkers = [
          { x: cx - 60, y: midY + 6, suit: "#4477AA", shirt: "#DDEEFF", hair: "#3a2a1a", skin: "#E8D4C4", isWoman: false },
          { x: cx + 60, y: midY + 6, suit: "#5588BB", shirt: "#EEDDFF", hair: "#554433", skin: "#D4C4B4", isWoman: true },
          { x: cx - 20, y: midY + 38, suit: "#3366AA", shirt: "#EEFFEE", hair: "#2a2a2a", skin: "#F0E0D0", isWoman: false },
          { x: cx + 20, y: midY + 38, suit: "#4477BB", shirt: "#FFEEDD", hair: "#443322", skin: "#E0D0C0", isWoman: true },
        ];
        for (let wi = 0; wi < meetingWorkers.length; wi++) {
          const w = meetingWorkers[wi];
          const wb = Math.sin(t * 1.1 + wi * 1.5) * 0.5;

          // Chair
          ctx.fillStyle = "#2a4050";
          ctx.beginPath();
          ctx.arc(w.x, w.y + 4, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#3a5060";
          rr(w.x - 8, w.y - 4, 16, 10, 2);
          ctx.fill();

          // Arms on table
          ctx.fillStyle = w.suit;
          ctx.fillRect(w.x - 14, w.y - 10 + wb, 6, 8);
          ctx.fillRect(w.x + 8, w.y - 10 + wb, 6, 8);
          // Hands
          ctx.fillStyle = w.skin;
          ctx.beginPath();
          ctx.arc(w.x - 8, w.y - 6 + wb, 3, 0, Math.PI * 2);
          ctx.arc(w.x + 8, w.y - 6 + wb, 3, 0, Math.PI * 2);
          ctx.fill();

          // Body
          ctx.fillStyle = w.suit;
          ctx.beginPath();
          ctx.moveTo(w.x - 8, w.y + 4);
          ctx.lineTo(w.x - 10, w.y - 12 + wb);
          ctx.lineTo(w.x - 6, w.y - 16 + wb);
          ctx.lineTo(w.x + 6, w.y - 16 + wb);
          ctx.lineTo(w.x + 10, w.y - 12 + wb);
          ctx.lineTo(w.x + 8, w.y + 4);
          ctx.closePath();
          ctx.fill();

          // Collar
          ctx.fillStyle = w.shirt;
          ctx.beginPath();
          ctx.moveTo(w.x - 3, w.y - 14 + wb);
          ctx.lineTo(w.x, w.y - 10 + wb);
          ctx.lineTo(w.x + 3, w.y - 14 + wb);
          ctx.closePath();
          ctx.fill();

          // Neck
          ctx.fillStyle = w.skin;
          ctx.fillRect(w.x - 2, w.y - 20 + wb, 4, 5);

          // Head
          ctx.beginPath();
          ctx.ellipse(w.x, w.y - 26 + wb, 7, 8, 0, 0, Math.PI * 2);
          ctx.fill();

          // Hair
          ctx.fillStyle = w.hair;
          if (w.isWoman) {
            // Longer hair for women
            ctx.beginPath();
            ctx.ellipse(w.x, w.y - 31 + wb, 8, 5, 0, Math.PI, 0);
            ctx.fill();
            ctx.fillRect(w.x - 8, w.y - 31 + wb, 16, 8);
            // Side hair
            ctx.fillRect(w.x - 9, w.y - 26 + wb, 3, 10);
            ctx.fillRect(w.x + 6, w.y - 26 + wb, 3, 10);
          } else {
            // Short hair for men
            ctx.beginPath();
            ctx.ellipse(w.x, w.y - 31 + wb, 7, 4, 0, Math.PI, 0);
            ctx.fill();
            ctx.fillRect(w.x - 6, w.y - 30 + wb, 12, 4);
          }

          // Eyes
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.ellipse(w.x - 2.5, w.y - 26 + wb, 2, 1.5, 0, 0, Math.PI * 2);
          ctx.ellipse(w.x + 2.5, w.y - 26 + wb, 2, 1.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#3a4a5a";
          ctx.beginPath();
          ctx.arc(w.x - 2.5, w.y - 26 + wb, 0.8, 0, Math.PI * 2);
          ctx.arc(w.x + 2.5, w.y - 26 + wb, 0.8, 0, Math.PI * 2);
          ctx.fill();

          // Mouth
          ctx.strokeStyle = "#AA8877";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          if (wi % 2 === 0) {
            // Slight smile
            ctx.arc(w.x, w.y - 21 + wb, 2, 0.2, Math.PI - 0.2);
          } else {
            // Neutral
            ctx.moveTo(w.x - 2, w.y - 21 + wb);
            ctx.lineTo(w.x + 2, w.y - 21 + wb);
          }
          ctx.stroke();
        }

        // ── Whiteboard (top wall - ice themed) ───────────────────
        ctx.fillStyle = "#DDEEFF";
        ctx.strokeStyle = "#66AACC";
        ctx.lineWidth = 1.5;
        rr(cx + W * 0.25, topY + 4, 60, 50, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#446688";
        ctx.font = "bold 5px monospace";
        ctx.textAlign = "center";
        ctx.fillText("Q4 TARGETS", cx + W * 0.25 + 30, topY + 14);
        // Chart
        ctx.strokeStyle = "#5588AA";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + W * 0.25 + 8, topY + 46);
        ctx.lineTo(cx + W * 0.25 + 18, topY + 32);
        ctx.lineTo(cx + W * 0.25 + 30, topY + 38);
        ctx.lineTo(cx + W * 0.25 + 42, topY + 24);
        ctx.lineTo(cx + W * 0.25 + 52, topY + 20);
        ctx.stroke();

        // ── Water cooler (left corner) ───────────────────
        ctx.fillStyle = "#88CCFF";
        ctx.strokeStyle = "#66AADD";
        ctx.lineWidth = 1;
        rr(cx - W * 0.42, topY + 10, 20, 36, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#AADDFF";
        ctx.beginPath();
        ctx.ellipse(cx - W * 0.42 + 10, topY + 8, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Water inside
        ctx.fillStyle = "rgba(100,200,255,0.4)";
        ctx.fillRect(cx - W * 0.42 + 3, topY + 20, 14, 22);

        // ── Coffee mug on desk (detail) ───────────────────
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(cx - W * 0.35 + 20, topY + 26, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#6B4423";
        ctx.beginPath();
        ctx.arc(cx - W * 0.35 + 20, topY + 26, 3, 0, Math.PI * 2);
        ctx.fill();

        // ── Snowflake particles ───────────────────
        for (let i = 0; i < 6; i++) {
          const px2 = W * 0.15 + (t * 12 + i * 45) % (W * 0.7);
          const py2 = topY + 20 + Math.sin(t * 0.6 + i * 2) * 25 + i * 12;
          const alpha = Math.sin(t * 1.5 + i) * 0.25 + 0.35;
          ctx.fillStyle = `rgba(200,230,255,${alpha})`;
          ctx.beginPath();
          ctx.arc(px2, py2, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

      } else if (!!this.map?.config?.ocean) {
        // ═══ OCEAN: NEPTUNE CORP OFFICE ═══
        const t = performance.now() / 1000;
        const AQUA="#00FFEE", CYAN="#00CCFF", TEAL="#00AA88", DEEP="#001840";

        // Floor tiles
        for(let ty2=0;ty2<room.H;ty2++) for(let tx2=0;tx2<room.W;tx2++){
          if(room.layout[ty2][tx2]!==0) continue;
          ctx.fillStyle=(tx2+ty2)%2===0?"#030c16":"#020a12";
          ctx.fillRect(tx2*room.S,ty2*room.S,room.S,room.S);
          ctx.strokeStyle="rgba(0,180,200,0.06)"; ctx.lineWidth=1;
          ctx.strokeRect(tx2*room.S,ty2*room.S,room.S,room.S);
        }
        // Room border
        ctx.strokeStyle=CYAN; ctx.lineWidth=2; ctx.shadowColor=CYAN; ctx.shadowBlur=14;
        ctx.strokeRect(room.S+2,room.S+2,W-room.S*2-4,H-room.S*2-4); ctx.shadowBlur=0;

        // ── SIGN ──
        ctx.save(); ctx.font="bold 17px Orbitron, monospace"; ctx.textAlign="center";
        ctx.fillStyle="#fff"; ctx.shadowColor=AQUA; ctx.shadowBlur=22;
        ctx.fillText("◈  NEPTUNE CORP  ◈", W/2, room.S-14); ctx.shadowBlur=0; ctx.restore();
        const sG2=ctx.createLinearGradient(0,room.S,W,room.S);
        sG2.addColorStop(0,"rgba(0,255,238,0)"); sG2.addColorStop(0.5,"rgba(0,255,238,0.45)"); sG2.addColorStop(1,"rgba(0,255,238,0)");
        ctx.fillStyle=sG2; ctx.fillRect(room.S,room.S,W-room.S*2,3);

        // ── LARGE CONFERENCE TABLE (center) ──
        ctx.fillStyle="#060e1a"; ctx.strokeStyle=TEAL; ctx.lineWidth=2;
        ctx.shadowColor=TEAL; ctx.shadowBlur=8;
        rr(cx-80,midY-34,160,68,8); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
        // Table surface teal glow
        const tpulse=Math.sin(t*1.2)*0.06+0.09;
        ctx.fillStyle=`rgba(0,200,200,${tpulse})`; rr(cx-76,midY-30,152,60,6); ctx.fill();
        // Table center inlay
        ctx.strokeStyle=AQUA+"44"; ctx.lineWidth=1;
        rr(cx-60,midY-20,120,40,4); ctx.stroke();
        // 6 chairs around table
        for(const [ox,oy] of [[-60,-44],[0,-44],[60,-44],[-60,40],[0,40],[60,40]]){
          ctx.fillStyle="#0a1a2a"; ctx.strokeStyle=TEAL+"66"; ctx.lineWidth=1;
          rr(cx+ox-16,midY+oy,32,14,3); ctx.fill(); ctx.stroke();
        }
        // Holographic display on table (animated)
        const hdG=ctx.createRadialGradient(cx,midY,0,cx,midY,40);
        hdG.addColorStop(0,`rgba(0,255,238,${0.06+Math.sin(t*2)*0.02})`); hdG.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=hdG; ctx.beginPath(); ctx.ellipse(cx,midY,38,22,0,0,Math.PI*2); ctx.fill();
        // Chart lines on table display
        ctx.strokeStyle=AQUA+"55"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(cx-28,midY+6); ctx.lineTo(cx-18,midY-4); ctx.lineTo(cx-4,midY+2); ctx.lineTo(cx+10,midY-10); ctx.lineTo(cx+28,midY-4); ctx.stroke();

        // ── 3 DESKS ALONG BACK WALL ──
        for(let di=0;di<3;di++){
          const dkX=cx-W*0.36+di*(W*0.33), dkY=topY+8;
          // Desk
          ctx.fillStyle="#060e1a"; ctx.strokeStyle=TEAL; ctx.lineWidth=1.5;
          rr(dkX-30,dkY,60,36,3); ctx.fill(); ctx.stroke();
          // Monitor
          ctx.fillStyle="#020810"; ctx.strokeStyle=CYAN; ctx.lineWidth=1;
          rr(dkX-18,dkY+2,36,26,2); ctx.fill(); ctx.stroke();
          // Screen data
          const sp=Math.sin(t*1.8+di)*0.25+0.75;
          ctx.fillStyle=`rgba(0,200,255,${0.25*sp})`; ctx.fillRect(dkX-16,dkY+4,32,20);
          ctx.fillStyle=AQUA+"CC"; ctx.font="3.5px monospace"; ctx.textAlign="center";
          for(let li=0;li<4;li++) ctx.fillRect(dkX-12,dkY+6+li*4,24*(0.4+Math.sin(t+li+di)*0.3),1.5);
          // Keyboard
          ctx.fillStyle="#040c16"; rr(dkX-12,dkY+30,24,6,1); ctx.fill();
          ctx.strokeStyle=TEAL+"44"; ctx.lineWidth=0.5; ctx.stroke();
          // Worker at desk (seated human — dancer-style proportions)
          { const wkS=["#F0C880","#C8A068","#EED8B0"][di],wkH=["#080808","#3a1a08","#1a1800"][di],wkC=[TEAL,CYAN,"#0055BB"][di];
          ctx.save(); ctx.translate(dkX,dkY);
          ctx.fillStyle="rgba(0,20,40,0.45)"; ctx.beginPath(); ctx.ellipse(0,-8,7,3,0,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle=wkS; ctx.lineWidth=3.5; ctx.lineCap="round";
          ctx.beginPath(); ctx.moveTo(-8,-24); ctx.lineTo(-15,-4); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(8,-24); ctx.lineTo(15,-4); ctx.stroke();
          ctx.lineCap="butt"; ctx.fillStyle=wkS;
          ctx.beginPath(); ctx.arc(-15,-4,2.5,0,Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(15,-4,2.5,0,Math.PI*2); ctx.fill();
          ctx.fillStyle=wkC; ctx.shadowColor=TEAL; ctx.shadowBlur=5;
          ctx.beginPath(); ctx.roundRect(-9,-40,18,20,3); ctx.fill(); ctx.shadowBlur=0;
          ctx.fillStyle=wkS; ctx.beginPath(); ctx.moveTo(-3,-40); ctx.lineTo(0,-37); ctx.lineTo(3,-40); ctx.fill();
          ctx.fillRect(-3,-44,6,5);
          ctx.beginPath(); ctx.ellipse(0,-50,7,8,0,0,Math.PI*2); ctx.fill();
          ctx.fillStyle=wkH; ctx.beginPath(); ctx.arc(0,-55,6,Math.PI*1.1,Math.PI*1.9); ctx.fill(); ctx.fillRect(-6,-55,12,5);
          ctx.fillStyle="#fff"; ctx.beginPath(); ctx.ellipse(-3,-51,2,1.6,0,0,Math.PI*2); ctx.ellipse(3,-51,2,1.6,0,0,Math.PI*2); ctx.fill();
          ctx.fillStyle=TEAL; ctx.shadowColor=TEAL; ctx.shadowBlur=2;
          ctx.beginPath(); ctx.arc(-3,-51,1,0,Math.PI*2); ctx.arc(3,-51,1,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
          ctx.fillStyle="#000"; ctx.beginPath(); ctx.arc(-3,-51,0.4,0,Math.PI*2); ctx.arc(3,-51,0.4,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(-3.5,-51.5,0.5,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle=wkH; ctx.lineWidth=1.2;
          ctx.beginPath(); ctx.moveTo(-5,-55); ctx.lineTo(-1.5,-56); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(1.5,-56); ctx.lineTo(5,-55); ctx.stroke();
          ctx.fillStyle="rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.arc(0,-48,1,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle="#AA7755"; ctx.lineWidth=1.3;
          ctx.beginPath(); ctx.moveTo(-2.5,-46); ctx.lineTo(2.5,-46); ctx.stroke();
          ctx.restore(); }
        }

        // ── FILING CABINETS (left wall) ──
        const fcX=room.S+6, fcY=H*0.38;
        ctx.fillStyle="#040c16"; ctx.strokeStyle=TEAL+"77"; ctx.lineWidth=1.2;
        for(let fi=0;fi<3;fi++){
          rr(fcX,fcY+fi*44,64,40,3); ctx.fill(); ctx.stroke();
          ctx.fillStyle=AQUA+"44"; ctx.fillRect(fcX+4,fcY+12+fi*44,56,2);
          ctx.fillStyle=AQUA+"44"; ctx.fillRect(fcX+4,fcY+28+fi*44,56,2);
          ctx.fillStyle="#060e1a"; ctx.fillRect(fcX+4,fcY+fi*44+2,56,10);
          ctx.fillStyle=TEAL+"CC"; ctx.font="5px Orbitron, monospace"; ctx.textAlign="center";
          ctx.fillText(["CONTRACTS","REPORTS","INVOICES"][fi],fcX+32,fcY+10+fi*44);
        }

        // ── AQUARIUM WALL (right wall, ocean themed) ──
        const aqX=W-room.S-76, aqY=H*0.34, aqW=68, aqH=100;
        ctx.fillStyle="#020c18"; ctx.strokeStyle=AQUA; ctx.lineWidth=2;
        ctx.shadowColor=AQUA; ctx.shadowBlur=10;
        rr(aqX,aqY,aqW,aqH,4); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
        const aqG=ctx.createLinearGradient(aqX,aqY,aqX,aqY+aqH);
        aqG.addColorStop(0,"rgba(0,80,160,0.2)"); aqG.addColorStop(1,"rgba(0,40,100,0.08)");
        ctx.fillStyle=aqG; ctx.fillRect(aqX+2,aqY+2,aqW-4,aqH-4);
        // Bubbles in aquarium
        for(let bi=0;bi<8;bi++){
          const bx=aqX+8+bi*8, by=aqY+aqH-10-(t*20+bi*15)%(aqH-14);
          ctx.fillStyle=`rgba(0,200,220,${0.3+Math.sin(t+bi)*0.1})`;
          ctx.beginPath(); ctx.arc(bx,by,bi%3===0?3:1.5,0,Math.PI*2); ctx.fill();
        }
        // Fish
        for(let fi=0;fi<3;fi++){
          const fx=aqX+10+(Math.sin(t*0.8+fi*2)*24+24), fy=aqY+20+fi*28;
          ctx.fillStyle=["#FF8822","#00DDFF","#FF44AA"][fi];
          ctx.beginPath(); ctx.ellipse(fx,fy,8,4,Math.sin(t+fi)*0.1,0,Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(fx-8,fy); ctx.lineTo(fx-14,fy-4); ctx.lineTo(fx-14,fy+4); ctx.closePath(); ctx.fill();
        }
        // Seaweed
        for(let sw=0;sw<3;sw++){
          ctx.strokeStyle=`rgba(0,160,80,0.7)`; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(aqX+14+sw*20,aqY+aqH-4);
          ctx.quadraticCurveTo(aqX+10+sw*20+Math.sin(t*0.6+sw)*6,aqY+aqH-24,aqX+14+sw*20,aqY+aqH-40);
          ctx.stroke();
        }
        ctx.fillStyle=AQUA+"66"; ctx.font="bold 5px Orbitron, monospace"; ctx.textAlign="center";
        ctx.fillText("AQUARIUM",aqX+aqW/2,aqY+aqH-3);

        // ── WHITEBOARD (top right) ──
        const wbX=W-room.S-76, wbY=room.S+6;
        ctx.fillStyle="#EEF2F6"; ctx.strokeStyle=TEAL; ctx.lineWidth=1.5;
        rr(wbX,wbY,68,56,3); ctx.fill(); ctx.stroke();
        ctx.fillStyle="#002244"; ctx.font="bold 6px Orbitron, monospace"; ctx.textAlign="center";
        ctx.fillText("Q4 DEEP REPORT",wbX+34,wbY+10);
        ctx.strokeStyle="#003366"; ctx.lineWidth=1;
        for(let li=0;li<3;li++){
          ctx.beginPath(); ctx.moveTo(wbX+4,wbY+14+li*12); ctx.lineTo(wbX+64,wbY+14+li*12); ctx.stroke();
        }
        ctx.strokeStyle="#0055AA"; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(wbX+8,wbY+48); ctx.lineTo(wbX+18,wbY+36); ctx.lineTo(wbX+28,wbY+42); ctx.lineTo(wbX+40,wbY+30); ctx.lineTo(wbX+56,wbY+26); ctx.stroke();

        // ── STANDING WORKER (salesperson-scale) ──
        {
          const wkX=room.S+80, wkY=H*0.80;
          const breathe=Math.sin(t*0.9)*1.5;
          ctx.save(); ctx.translate(wkX,wkY);
          ctx.globalAlpha=0.35; ctx.fillStyle="#000";
          ctx.beginPath(); ctx.ellipse(2,4,14,5,0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
          // Legs
          ctx.fillStyle="#0a1a2e"; ctx.fillRect(-6,-8,5,12); ctx.fillRect(1,-8,5,12);
          ctx.fillStyle="#050e18"; ctx.fillRect(-7,2,6,5); ctx.fillRect(1,2,6,5);
          ctx.fillStyle=AQUA; ctx.fillRect(-7,2,6,1.5); ctx.fillRect(1,2,6,1.5);
          // Dive-suit jacket
          const jG=ctx.createLinearGradient(-12,-38,12,-10);
          jG.addColorStop(0,"#0e2840"); jG.addColorStop(0.5,"#081e30"); jG.addColorStop(1,"#041220");
          ctx.fillStyle=jG;
          ctx.beginPath(); ctx.moveTo(-11,-10); ctx.lineTo(-13,-38+breathe); ctx.lineTo(-8,-42+breathe);
          ctx.lineTo(8,-42+breathe); ctx.lineTo(13,-38+breathe); ctx.lineTo(11,-10); ctx.closePath(); ctx.fill();
          // Teal tie
          ctx.fillStyle=AQUA; ctx.shadowColor=AQUA; ctx.shadowBlur=7;
          ctx.beginPath(); ctx.moveTo(0,-38+breathe); ctx.lineTo(-3,-34+breathe); ctx.lineTo(0,-12); ctx.lineTo(3,-34+breathe); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
          // Lapels
          ctx.strokeStyle=AQUA+"66"; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(-4,-38+breathe); ctx.lineTo(-6,-20); ctx.moveTo(4,-38+breathe); ctx.lineTo(6,-20); ctx.stroke();
          // Collar
          ctx.fillStyle="#E0F4F8";
          ctx.beginPath(); ctx.moveTo(-5,-40+breathe); ctx.lineTo(0,-37+breathe); ctx.lineTo(5,-40+breathe);
          ctx.lineTo(4,-42+breathe); ctx.lineTo(-4,-42+breathe); ctx.closePath(); ctx.fill();
          // Neck + head
          ctx.fillStyle="#D8C8B8"; ctx.fillRect(-3,-46+breathe,6,6);
          const hG2=ctx.createRadialGradient(-3,-54+breathe,2,0,-52+breathe,12);
          hG2.addColorStop(0,"#EDD8C8"); hG2.addColorStop(1,"#C8B0A0");
          ctx.fillStyle=hG2; ctx.beginPath(); ctx.ellipse(0,-54+breathe,10,12,0,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#080e1a";
          ctx.beginPath(); ctx.ellipse(0,-62+breathe,9,6,0,Math.PI,0); ctx.fill();
          ctx.fillRect(-8,-62+breathe,16,7);
          // Eyes
          ctx.fillStyle="#FFF";
          ctx.beginPath(); ctx.ellipse(-4,-54+breathe,2.5,2,0,0,Math.PI*2); ctx.ellipse(4,-54+breathe,2.5,2,0,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#006688"; ctx.beginPath(); ctx.arc(-4,-54+breathe,1.2,0,Math.PI*2); ctx.arc(4,-54+breathe,1.2,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#000"; ctx.beginPath(); ctx.arc(-4,-54+breathe,0.5,0,Math.PI*2); ctx.arc(4,-54+breathe,0.5,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle="#AA7766"; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.arc(0,-50+breathe,3.5,0.1,Math.PI-0.1); ctx.stroke();
          ctx.strokeStyle="#080e1a"; ctx.lineWidth=1.2;
          ctx.beginPath(); ctx.moveTo(-6,-57+breathe); ctx.lineTo(-2,-58+breathe); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(2,-58+breathe); ctx.lineTo(6,-57+breathe); ctx.stroke();
          // Arms with tablet
          ctx.strokeStyle="#C8B0A0"; ctx.lineWidth=6; ctx.lineCap="round";
          ctx.beginPath(); ctx.moveTo(11,-30+breathe); ctx.lineTo(18,-14); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-11,-30+breathe); ctx.lineTo(-10,-14); ctx.stroke();
          ctx.lineCap="butt";
          ctx.fillStyle="#D8C8B8"; ctx.beginPath(); ctx.arc(18,-14,4,0,Math.PI*2); ctx.fill();
          // Tablet device
          ctx.fillStyle="#020810"; ctx.strokeStyle=CYAN; ctx.lineWidth=1;
          rr(10,-14,20,14,2); ctx.fill(); ctx.stroke();
          ctx.fillStyle=`rgba(0,180,255,${0.4+Math.sin(t*2)*0.1})`; ctx.fillRect(11,-13,18,10);
          ctx.restore();
        }

        // ── COFFEE STATION (bottom-left corner) ──
        const csX=room.S+6, csY=H*0.80;
        ctx.fillStyle="#040c16"; ctx.strokeStyle=TEAL+"88"; ctx.lineWidth=1.2;
        rr(csX,csY,56,36,3); ctx.fill(); ctx.stroke();
        ctx.fillStyle=TEAL+"88"; ctx.font="bold 5.5px Orbitron, monospace"; ctx.textAlign="center";
        ctx.fillText("COFFEE",csX+28,csY+10);
        for(let ci=0;ci<3;ci++){
          ctx.fillStyle="#1a0800"; ctx.beginPath(); ctx.arc(csX+10+ci*16,csY+24,6,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#6B3A1F"; ctx.beginPath(); ctx.arc(csX+10+ci*16,csY+24,4,0,Math.PI*2); ctx.fill();
          const steam=Math.sin(t*2+ci)*0.4+0.6;
          ctx.strokeStyle=`rgba(200,200,200,${steam*0.3})`; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(csX+10+ci*16,csY+18); ctx.quadraticCurveTo(csX+12+ci*16,csY+14,csX+10+ci*16,csY+10); ctx.stroke();
        }

        // Bubble particles
        for(let pi=0;pi<10;pi++){
          const px3=(t*9+pi*59)%W, py3=room.S*2+Math.sin(t*0.8+pi*0.7)*28+(pi*(H*0.75))/10;
          const al2=Math.sin(t*2+pi)*0.2+0.28;
          ctx.fillStyle=[AQUA,CYAN,TEAL][pi%3]+Math.floor(al2*140).toString(16).padStart(2,"0");
          ctx.beginPath(); ctx.arc(px3,py3,pi%4===0?2:1.2,0,Math.PI*2); ctx.fill();
        }
        ctx.fillStyle="rgba(0,200,200,0.18)";
        ctx.fillRect(room.S,room.S*1.5,3,H-room.S*3); ctx.fillRect(W-room.S-3,room.S*1.5,3,H-room.S*3);

      } else {
        // ═══ DEFAULT OFFICE ═══
        // ── Meeting table (center) ───────────────────
        ctx.fillStyle = "#2a3a4a";
        ctx.strokeStyle = "#4a6a8a";
        ctx.lineWidth = 1.5;
        rr(cx - 58, midY - 26, 116, 52, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#1a2a3a";
        rr(cx - 54, midY - 22, 108, 44, 2);
        ctx.fill();
        ctx.fillStyle = "#334455";
        ctx.strokeStyle = "#4466AA";
        ctx.lineWidth = 1;
        for (const [ox, oy] of [
          [-68, -16],
          [-68, 6],
          [68, -16],
          [68, 6],
          [-24, -34],
          [24, -34],
          [-24, 32],
          [24, 32],
        ]) {
          ctx.beginPath();
          ctx.arc(cx + ox, midY + oy, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        for (let li = 0; li < 3; li++) {
          ctx.fillStyle = "#223344";
          ctx.fillRect(cx - 42 + li * 44, midY - 14, 26, 20);
          ctx.fillStyle = "#1155AA";
          ctx.fillRect(cx - 40 + li * 44, midY - 12, 22, 16);
        }

        // ── Whiteboard (top wall) ────────────────────
        ctx.fillStyle = "#EEFFEE";
        ctx.strokeStyle = "#44AA44";
        ctx.lineWidth = 1.5;
        rr(cx - 46, topY + 4, 92, 44, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#225522";
        ctx.font = "bold 6px monospace";
        ctx.textAlign = "center";
        ctx.fillText("QUARTERLY REPORT", cx, topY + 14);
        ctx.strokeStyle = "#338833";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 38, topY + 20);
        ctx.lineTo(cx + 38, topY + 20);
        ctx.stroke();
        ctx.strokeStyle = "#66AA66";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 32, topY + 42);
        ctx.lineTo(cx - 18, topY + 30);
        ctx.lineTo(cx - 4, topY + 36);
        ctx.lineTo(cx + 12, topY + 26);
        ctx.lineTo(cx + 28, topY + 20);
        ctx.stroke();

        // ── Corner desk + monitor ────────────────────
        ctx.fillStyle = "#2a3a4a";
        ctx.strokeStyle = "#4a5a6a";
        ctx.lineWidth = 1;
        rr(cx + W * 0.3, topY + 86, 46, 40, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#111118";
        ctx.strokeStyle = "#44EEFF";
        ctx.lineWidth = 1;
        rr(cx + W * 0.3 + 7, topY + 88, 32, 22, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#002244";
        ctx.fillRect(cx + W * 0.3 + 9, topY + 90, 28, 18);
        ctx.fillStyle = "#0055FF";
        ctx.fillRect(cx + W * 0.3 + 11, topY + 92, 24, 7);

        // Plant corner
        ctx.fillStyle = "#3a2810";
        ctx.fillRect(cx - W * 0.37, topY + 90, 14, 10);
        ctx.fillStyle = "#225522";
        ctx.shadowColor = "#44FF44";
        ctx.shadowBlur = 4;
        for (let li = 0; li < 4; li++) {
          const la = (li / 4) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(
            cx - W * 0.37 + 7 + Math.cos(la) * 9,
            topY + 88 + Math.sin(la) * 4,
            7,
            4,
            la,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }
      ctx.shadowBlur = 0;
      } // end else (default office)
    } else if (type === 2) {
      // HOTEL
      // ── Reception desk ───────────────────────────
      ctx.fillStyle = "#3a2510";
      ctx.strokeStyle = "#8a6030";
      ctx.lineWidth = 1.5;
      rr(cx - 50, topY + 4, 100, 30, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#5a3820";
      rr(cx - 46, topY + 6, 92, 14, 2);
      ctx.fill();
      ctx.fillStyle = "#111118";
      ctx.strokeStyle = "#44EEFF";
      ctx.lineWidth = 1;
      ctx.fillRect(cx - 15, topY + 7, 30, 20);
      ctx.fillStyle = "#002244";
      ctx.fillRect(cx - 13, topY + 9, 26, 16);
      // hotel bell
      ctx.fillStyle = "#FFCC44";
      ctx.shadowColor = "#FFCC44";
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(cx + 28, topY + 21, 8, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(cx + 20, topY + 21, 16, 3);
      ctx.shadowBlur = 0;

      // ── Lobby sofas ──────────────────────────────
      for (const [sx, sw, flip] of [
        [cx - W * 0.3, 70, false],
        [cx + W * 0.14, 70, true],
      ]) {
        const sx2 = flip ? sx - sw : sx;
        ctx.fillStyle = "#4a3060";
        ctx.strokeStyle = "#7a50A0";
        ctx.lineWidth = 1.5;
        rr(sx2, midY - 6, sw, 28, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#3a2050";
        rr(sx2, midY - 20, sw, 16, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#5a4080";
        ctx.fillRect(sx2 + 4, midY - 3, sw / 2 - 8, 22);
        ctx.fillRect(sx2 + sw / 2 + 4, midY - 3, sw / 2 - 8, 22);
      }

      // ── Central fountain ─────────────────────────
      ctx.strokeStyle = "#44CCFF";
      ctx.lineWidth = 2;
      ctx.fillStyle = "#0a1a2a";
      ctx.beginPath();
      ctx.arc(cx, midY + 22, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#1a3a5a";
      ctx.beginPath();
      ctx.arc(cx, midY + 22, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(68,204,255,0.3)";
      for (let i = 0; i < 5; i++) {
        const wa = (i / 5) * Math.PI * 2,
          wr = 9 + Math.sin(i * 1.3) * 4;
        ctx.beginPath();
        ctx.ellipse(
          cx + Math.cos(wa) * wr,
          midY + 22 + Math.sin(wa) * wr * 0.5,
          3,
          2,
          wa,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.fillStyle = "#AAEEFF";
      ctx.shadowColor = "#44CCFF";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, midY + 12, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (type === 3) {
      // MARKET
      if (!!this.map?.config?.galactica) {
        // ═══ GALACTICA: GALACTIC BAZAAR — counter+NPC at top, shelves below ═══
        const t = performance.now() / 1000;
        const PURP = "#AA88FF", GOLD = "#FFDD55", CYAN = "#55DDFF", PINK = "#FF55CC";

        // ─── GALACTIC BAZAAR — mirroring car-dealer layout ───────────────

        // ── Floor grid (same as dealer) ──
        for (let ty2 = 0; ty2 < room.H; ty2++) {
          for (let tx2 = 0; tx2 < room.W; tx2++) {
            const tile = room.layout[ty2][tx2];
            const px2 = tx2 * room.S, py2 = ty2 * room.S;
            if (tile === 1) {
              ctx.fillStyle = "#04020c";
              ctx.fillRect(px2, py2, room.S, room.S);
              if ((tx2 + ty2) % 4 === 0) {
                ctx.fillStyle = "rgba(170,100,255,0.12)";
                ctx.fillRect(px2 + room.S / 2 - 1, py2, 2, room.S);
              }
            } else {
              ctx.fillStyle = (tx2 + ty2) % 2 === 0 ? "#05031a" : "#030114";
              ctx.fillRect(px2, py2, room.S, room.S);
              ctx.strokeStyle = "rgba(150,80,255,0.07)";
              ctx.lineWidth = 1;
              ctx.strokeRect(px2, py2, room.S, room.S);
              const seed = tx2 * 17 + ty2 * 11;
              if (seed % 7 === 0) {
                const tw = Math.sin(t * 3 + seed) * 0.5 + 0.5;
                ctx.fillStyle = `rgba(220,200,255,${0.05 + tw * 0.1})`;
                ctx.beginPath();
                ctx.arc(px2 + (seed % (room.S - 4)) + 2, py2 + ((seed * 3) % (room.S - 4)) + 2, 1, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }

        // Purple room border (like cyan in dealer)
        ctx.strokeStyle = "#AA88FF";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#AA88FF";
        ctx.shadowBlur = 20;
        ctx.strokeRect(room.S + 2, room.S + 2, W - room.S * 2 - 4, H - room.S * 2 - 4);
        ctx.shadowBlur = 0;

        // Top accent bar
        const topGrad2 = ctx.createLinearGradient(0, room.S, W, room.S);
        topGrad2.addColorStop(0, "rgba(200,100,255,0.15)");
        topGrad2.addColorStop(0.5, "rgba(170,136,255,0.5)");
        topGrad2.addColorStop(1, "rgba(200,100,255,0.15)");
        ctx.fillStyle = topGrad2;
        ctx.fillRect(room.S, room.S, W - room.S * 2, 4);

        // Showroom title
        ctx.save();
        ctx.font = "bold 20px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#CC99FF";
        ctx.shadowColor = "#AA88FF";
        ctx.shadowBlur = 28;
        ctx.fillText("⬡  GALACTIC BAZAAR  ⬡", W / 2, room.S - 20);
        ctx.shadowBlur = 0;
        ctx.restore();

        // ── CASHIER COUNTER (same position as dealer) ──
        const ctrX = W / 2 - 75, ctrY = room.S * 1.2, ctrW = 150, ctrH = 40;

        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(ctrX + 4, ctrY + ctrH + 2, ctrW, 6);

        ctx.fillStyle = "#0e0520";
        ctx.fillRect(ctrX, ctrY, ctrW, ctrH);
        ctx.fillStyle = "#1e0d38";
        ctx.fillRect(ctrX - 5, ctrY, ctrW + 10, 6);

        ctx.strokeStyle = "#AA88FF";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#AA88FF";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(ctrX - 5, ctrY + 3);
        ctx.lineTo(ctrX + ctrW + 5, ctrY + 3);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Scanner on counter
        const scanP = Math.sin(t * 4) * 0.5 + 0.5;
        ctx.fillStyle = "#080220";
        rr(ctrX + 10, ctrY + 8, 60, 18, 3);
        ctx.fill();
        ctx.strokeStyle = `rgba(85,221,255,${0.4 + scanP * 0.6})`;
        ctx.lineWidth = 1;
        rr(ctrX + 10, ctrY + 8, 60, 18, 3);
        ctx.stroke();
        ctx.fillStyle = `rgba(85,221,255,${0.1 + scanP * 0.2})`;
        ctx.fillRect(ctrX + 13, ctrY + 10 + scanP * 8, 54, 3);
        ctx.fillStyle = CYAN;
        ctx.font = "bold 5px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.shadowColor = CYAN;
        ctx.shadowBlur = 5;
        ctx.fillText("SCAN", ctrX + 40, ctrY + 32);
        ctx.shadowBlur = 0;

        // Credit display
        ctx.fillStyle = "#050115";
        rr(ctrX + 82, ctrY + 8, 52, 26, 3);
        ctx.fill();
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1;
        rr(ctrX + 82, ctrY + 8, 52, 26, 3);
        ctx.stroke();
        ctx.fillStyle = GOLD;
        ctx.font = "bold 5px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("CREDITS", ctrX + 108, ctrY + 17);
        ctx.font = "bold 7px Orbitron, monospace";
        ctx.fillText("∞", ctrX + 108, ctrY + 30);

        ctx.fillStyle = "#CC99FF";
        ctx.shadowColor = "#AA88FF";
        ctx.shadowBlur = 10;
        ctx.font = "bold 12px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("BAZAAR DESK", ctrX + ctrW / 2, ctrY + 26);
        ctx.shadowBlur = 0;

        // ── DISPLAY ITEMS ON PLATFORMS (same structure as car dealer) ──
        const displays = [
          // Front row
          { x: W * 0.18, y: H * 0.45, color: "#FF55FF", name: "VOID CRYSTAL", label: "8 CR" },
          { x: W * 0.38, y: H * 0.42, color: "#55AAFF", name: "NOVA SHARD",   label: "12 CR" },
          { x: W * 0.62, y: H * 0.42, color: "#FFAA55", name: "STAR SPICE",   label: "5 CR" },
          { x: W * 0.82, y: H * 0.45, color: "#44FF99", name: "NEBULA HERB",  label: "3 CR" },
          // Back row
          { x: W * 0.28, y: H * 0.58, color: "#CC88FF", name: "DARK MATTER",  label: "20 CR" },
          { x: W * 0.72, y: H * 0.58, color: "#FF8888", name: "PLASMA ORB",   label: "15 CR" },
        ];

        for (const disp of displays) {
          const pulse = Math.sin(t * 1.5 + disp.x * 0.01) * 0.3 + 0.7;
          const hover = Math.sin(t * 2 + disp.x * 0.02) * 4;
          ctx.save();
          ctx.translate(disp.x, disp.y + hover);

          // Platform base (like dealer)
          ctx.beginPath();
          ctx.arc(0, 15, 45, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(100,50,200,0.08)";
          ctx.fill();
          ctx.strokeStyle = `rgba(170,136,255,${0.55 * pulse})`;
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(0, 15, 34, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(200,100,255,${0.3 * pulse})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Rotating energy under item
          ctx.save();
          ctx.translate(0, 15);
          ctx.rotate(t * 0.8);
          for (let i = 0; i < 6; i++) {
            ctx.fillStyle = `rgba(170,136,255,${0.18 * pulse})`;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, 38, (i * Math.PI * 2) / 6, (i * Math.PI * 2) / 6 + 0.35);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();

          // ── ITEM (floating geometric shape) ──
          ctx.save();
          ctx.rotate(t * 0.4 + disp.x * 0.01);

          // Shadow
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.beginPath();
          ctx.ellipse(2, 12, 22, 8, 0, 0, Math.PI * 2);
          ctx.fill();

          // Glowing item body
          ctx.shadowColor = disp.color;
          ctx.shadowBlur = 18 * pulse;
          ctx.fillStyle = disp.color + "CC";
          ctx.strokeStyle = disp.color;
          ctx.lineWidth = 1.5;

          // Each item has a unique shape based on index
          const idx = displays.indexOf(disp);
          if (idx === 0) {
            // Crystal: tall hexagon
            ctx.beginPath();
            for (let h = 0; h < 6; h++) {
              const ha = (h * Math.PI) / 3 - Math.PI / 6;
              const hx = Math.cos(ha) * 16, hy = Math.sin(ha) * 22;
              h === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.fill(); ctx.stroke();
          } else if (idx === 1) {
            // Shard: jagged crystal
            ctx.beginPath();
            ctx.moveTo(0, -22); ctx.lineTo(10, -6); ctx.lineTo(16, 4);
            ctx.lineTo(6, 10); ctx.lineTo(-6, 10); ctx.lineTo(-16, 4);
            ctx.lineTo(-10, -6); ctx.closePath();
            ctx.fill(); ctx.stroke();
          } else if (idx === 2) {
            // Spice: 5-pointed star
            for (let s = 0; s < 5; s++) {
              const ao = (s * Math.PI * 2) / 5 - Math.PI / 2;
              const ai = ao + Math.PI / 5;
              s === 0 ? ctx.moveTo(Math.cos(ao) * 18, Math.sin(ao) * 18) : ctx.lineTo(Math.cos(ao) * 18, Math.sin(ao) * 18);
              ctx.lineTo(Math.cos(ai) * 9, Math.sin(ai) * 9);
            }
            ctx.closePath(); ctx.fill(); ctx.stroke();
          } else if (idx === 3) {
            // Herb: diamond with inner glow
            ctx.beginPath();
            ctx.moveTo(0, -20); ctx.lineTo(14, 0); ctx.lineTo(0, 14); ctx.lineTo(-14, 0);
            ctx.closePath(); ctx.fill(); ctx.stroke();
          } else if (idx === 4) {
            // Dark matter: spinning ring
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#000010";
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = disp.color;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 12 * pulse;
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            // Plasma orb: glowing sphere
            const rGrad = ctx.createRadialGradient(-5, -5, 2, 0, 0, 18);
            rGrad.addColorStop(0, "#FFFFFF");
            rGrad.addColorStop(0.4, disp.color);
            rGrad.addColorStop(1, disp.color + "44");
            ctx.fillStyle = rGrad;
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.shadowBlur = 0;
          ctx.restore();

          // Name label
          ctx.fillStyle = "#FFFFFF";
          ctx.shadowColor = disp.color;
          ctx.shadowBlur = 8;
          ctx.font = "bold 8px Orbitron, monospace";
          ctx.textAlign = "center";
          ctx.fillText(disp.name, 0, 46);
          ctx.shadowBlur = 0;

          // Price tag
          ctx.fillStyle = "rgba(10,2,30,0.85)";
          rr(-14, 50, 28, 12, 3);
          ctx.fill();
          ctx.strokeStyle = GOLD;
          ctx.lineWidth = 1;
          ctx.shadowColor = GOLD;
          ctx.shadowBlur = 5;
          rr(-14, 50, 28, 12, 3);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.fillStyle = GOLD;
          ctx.font = "bold 6px Orbitron, monospace";
          ctx.fillText(disp.label, 0, 59);

          ctx.restore();
        }

        // ── AMBIENT PARTICLES ──
        for (let i = 0; i < 12; i++) {
          const px2 = (t * 22 + i * 88) % W;
          const py2 = room.S * 1.5 + Math.sin(t + i * 2) * 22 + (i * (H - room.S * 3)) / 12;
          const alpha = Math.sin(t * 2 + i) * 0.3 + 0.4;
          ctx.fillStyle = i % 3 === 0
            ? `rgba(170,136,255,${alpha})`
            : i % 3 === 1
              ? `rgba(200,100,255,${alpha})`
              : `rgba(100,180,255,${alpha})`;
          ctx.beginPath();
          ctx.arc(px2, py2, i % 4 === 0 ? 2 : 1, 0, Math.PI * 2);
          ctx.fill();
        }

        // Side strips
        ctx.fillStyle = "rgba(150,80,255,0.22)";
        ctx.fillRect(room.S, room.S * 1.5, 3, H - room.S * 3);
        ctx.fillRect(W - room.S - 3, room.S * 1.5, 3, H - room.S * 3);

      } else if (!!this.map?.config?.zombie) {
        // ═══ ZOMBIE: LOOTED BAZAAR ═══
        const t=performance.now()/1000;
        // Sign
        ctx.fillStyle="rgba(0,40,0,0.9)"; rr(W/2-110,room.S-22,220,26,5); ctx.fill();
        ctx.strokeStyle=`rgba(44,200,44,${0.6+0.3*Math.sin(t*1.6)})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#AAFFAA"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
        ctx.fillText("☠  LOOTED BAZAAR  ☠", W/2, room.S-9);
        // Knocked-over shelves (3 rows, chaotic angles)
        for (let row=0;row<3;row++) {
          const shX=22, shY=topY+60+row*70, shW=W*0.52, shH=44;
          ctx.save(); ctx.translate(shX+shW/2, shY+shH/2); ctx.rotate(Math.sin(row*1.3)*0.08);
          ctx.fillStyle="#0d1a0d"; rr(-shW/2,-shH/2,shW,shH,3); ctx.fill();
          ctx.strokeStyle="rgba(44,120,44,0.4)"; ctx.lineWidth=1; ctx.stroke();
          // Scattered items on/around shelf
          const cols=["rgba(200,40,40,0.7)","rgba(44,180,44,0.7)","rgba(200,180,40,0.7)","rgba(40,140,200,0.6)"];
          for (let si=0;si<6;si++) {
            const sx=(-shW/2+12)+si*(shW-24)/5;
            if (si%3!==1) { // some missing (looted)
              ctx.fillStyle=cols[si%cols.length]; rr(sx,-shH/2+6,10,16,2); ctx.fill();
            } else {
              // Tipped-over item on floor
              ctx.fillStyle=cols[si%cols.length]; ctx.save(); ctx.translate(sx+20,shH/2-8); ctx.rotate(1.4); ctx.fillRect(-5,-8,10,16); ctx.restore();
            }
          }
          ctx.restore();
        }
        // Broken cash register (top-right counter)
        const crx=W*0.65, cry=topY+28;
        ctx.fillStyle="#101a10"; rr(crx,cry,90,36,4); ctx.fill();
        ctx.strokeStyle="rgba(44,140,44,0.4)"; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#080d08"; rr(crx+6,cry+5,52,22,2); ctx.fill();
        // Cracked screen
        ctx.strokeStyle="rgba(44,200,44,0.4)"; ctx.lineWidth=0.8;
        ctx.beginPath(); ctx.moveTo(crx+18,cry+6); ctx.lineTo(crx+40,cry+26); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(crx+42,cry+6); ctx.lineTo(crx+25,cry+26); ctx.stroke();
        // Cash scattered on floor
        for (const [mx,my] of [[W*0.7,H*0.5],[W*0.6,H*0.56],[W*0.75,H*0.62]]) {
          ctx.fillStyle="rgba(44,160,44,0.35)"; rr(mx,my,20,9,2); ctx.fill();
          ctx.strokeStyle="rgba(44,200,44,0.3)"; ctx.lineWidth=0.5; ctx.stroke();
        }
        // Barricade (right side - survivor fortification)
        const barY2=H*0.35, barH3=H*0.35;
        ctx.fillStyle="#0d1800"; rr(W-58,barY2,36,barH3,3); ctx.fill();
        ctx.strokeStyle="rgba(44,180,44,0.5)"; ctx.lineWidth=1.5; ctx.stroke();
        // Planks
        for (let pi=0;pi<4;pi++) {
          ctx.fillStyle="#0a1200"; ctx.strokeStyle="rgba(30,100,30,0.4)"; ctx.lineWidth=1;
          rr(W-62+pi%2*4,barY2+10+pi*22,40,10,2); ctx.fill(); ctx.stroke();
        }
        ctx.fillStyle="rgba(44,200,44,0.7)"; ctx.font="bold 6px monospace"; ctx.textAlign="center";
        ctx.fillText("SAFE", W-40, barY2-8);
        // Floor spills/debris
        for (const [dx,dy] of [[W*0.3,H*0.58],[W*0.45,H*0.71],[W*0.55,H*0.48]]) {
          ctx.fillStyle="rgba(140,8,8,0.18)"; ctx.beginPath(); ctx.ellipse(dx,dy,12,7,dx*0.01,0,Math.PI*2); ctx.fill();
        }
      } else {
        // ── Default market (other maps) ──────────────
        const sC = [
          ["#CC3333", "#3366CC", "#44AA44", "#FFAA22"],
          ["#FF6699", "#66CCFF", "#FFEE44", "#AA66FF"],
          ["#EE8833", "#33CCAA", "#FF5544", "#88BBFF"],
        ];
        for (let row = 0; row < 3; row++) {
          const sy2 = topY + 8 + row * 40;
          ctx.fillStyle = "#2a2a2a";
          ctx.strokeStyle = "#444";
          ctx.lineWidth = 1;
          ctx.fillRect(cx - W * 0.42, sy2, W * 0.84, 30);
          ctx.fillStyle = "#3a3022";
          ctx.fillRect(cx - W * 0.42, sy2 + 9, W * 0.84, 4);
          ctx.fillRect(cx - W * 0.42, sy2 + 22, W * 0.84, 4);
          for (let pi = 0; pi < 11; pi++) {
            const px3 = cx - W * 0.4 + pi * ((W * 0.8) / 11);
            ctx.fillStyle = sC[row][pi % 4];
            ctx.fillRect(px3, sy2 + 2, (W * 0.8) / 11 - 2, 7);
            ctx.fillRect(px3, sy2 + 15, (W * 0.8) / 11 - 2, 7);
          }
        }
        // ── Checkout counter ───────────────────────
        ctx.fillStyle = "#1a2a3a";
        ctx.strokeStyle = "#3a4a5a";
        ctx.lineWidth = 1.5;
        rr(cx - 32, midY + 18, 64, 26, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#111118";
        ctx.fillRect(cx - 14, midY + 19, 28, 16);
        ctx.fillStyle = "#44EEFF";
        ctx.fillRect(cx - 12, midY + 21, 24, 12);
        ctx.fillStyle = "#FFCC44";
        ctx.font = "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.fillText("CHECKOUT", cx, midY + 54);
      }
    } else if (type === 4) {
      // ARCADE
      const isNeonCityArcade = this.map?.config?.id === "neon_city";

      if (isNeonCityArcade) {
        // ═══ NEON CITY CYBER ARCADE (ENLARGED) ═══
        const t = performance.now() / 1000;

        // Neon City colors
        const CYAN = "#44EEFF";
        const PINK = "#FF4466";
        const GREEN = "#44FF88";
        const PURPLE = "#CC88FF";
        const GOLD = "#FFDD44";
        const ORANGE = "#FF8844";

        // ── Title Header (LARGER) ──
        ctx.save();
        ctx.font = "bold 18px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.shadowColor = PINK;
        ctx.shadowBlur = 25;
        ctx.fillText("🎮 CYBER ARCADE 🎮", cx, topY - 2);
        ctx.shadowBlur = 0;
        ctx.restore();

        // ── Divider line ──
        ctx.save();
        const divGrad = ctx.createLinearGradient(
          cx - W * 0.45,
          0,
          cx + W * 0.45,
          0,
        );
        divGrad.addColorStop(0, "rgba(255,68,102,0)");
        divGrad.addColorStop(0.5, "rgba(255,68,102,0.9)");
        divGrad.addColorStop(1, "rgba(255,68,102,0)");
        ctx.strokeStyle = divGrad;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - W * 0.45, topY + 12);
        ctx.lineTo(cx + W * 0.45, topY + 12);
        ctx.stroke();
        ctx.restore();

        // ═══ ROW 1: SLOT MACHINES (Top) - ENLARGED ═══
        const slotColors = [PINK, CYAN, GOLD, GREEN];
        for (let i = 0; i < 4; i++) {
          const sx = cx - W * 0.36 + i * (W * 0.24);
          const sy = topY + 28;
          const col = slotColors[i];
          const pulse = Math.sin(t * 3 + i) * 0.3 + 0.7;

          // Slot machine body (LARGER)
          ctx.save();
          ctx.fillStyle = "rgba(15,18,30,0.95)";
          ctx.strokeStyle = col;
          ctx.lineWidth = 3;
          ctx.shadowColor = col;
          ctx.shadowBlur = 18 * pulse;
          rr(sx - 30, sy, 60, 72, 8);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Top light bar (LARGER)
          ctx.fillStyle = col;
          ctx.shadowColor = col;
          ctx.shadowBlur = 14;
          rr(sx - 24, sy + 4, 48, 10, 3);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Screen area (LARGER)
          ctx.fillStyle = "#050a15";
          rr(sx - 22, sy + 18, 44, 30, 4);
          ctx.fill();

          // 3 spinning reels (LARGER)
          for (let r = 0; r < 3; r++) {
            const rx = sx - 16 + r * 15;
            const reelOffset = (t * 5 + i * 2 + r) % 3;
            const symbols = ["7️⃣", "🍒", "💎"];
            ctx.font = "16px serif";
            ctx.textAlign = "center";
            ctx.fillText(symbols[Math.floor(reelOffset)], rx + 5, sy + 38);
          }

          // Jackpot display (LARGER)
          const jackpot = Math.floor(1000 + Math.sin(t + i) * 500);
          ctx.font = "bold 9px Orbitron, monospace";
          ctx.fillStyle = GOLD;
          ctx.shadowColor = GOLD;
          ctx.shadowBlur = 8;
          ctx.fillText(jackpot.toString(), sx, sy + 56);
          ctx.shadowBlur = 0;

          // Lever (LARGER)
          ctx.fillStyle = "#444";
          ctx.fillRect(sx + 24, sy + 20, 6, 35);
          ctx.fillStyle = col;
          ctx.shadowColor = col;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(sx + 27, sy + 18, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.restore();
        }

        // ═══ ROW 2: ARCADE CABINETS (Middle) - ENLARGED ═══
        const cabinetGames = [
          { emoji: "👾", name: "INVADERS", color: GREEN },
          { emoji: "🏎️", name: "RACER", color: ORANGE },
          { emoji: "🥊", name: "FIGHTER", color: PINK },
          { emoji: "🔫", name: "SHOOTER", color: CYAN },
        ];

        for (let i = 0; i < 4; i++) {
          const gx = cx - W * 0.36 + i * (W * 0.24);
          const gy = midY + 5;
          const game = cabinetGames[i];
          const pulse = Math.sin(t * 2.5 + i * 1.2) * 0.3 + 0.7;
          const screenFlicker = Math.sin(t * 8 + i * 3) * 0.1 + 0.9;

          ctx.save();

          // Cabinet body (LARGER)
          ctx.fillStyle = "rgba(20,15,35,0.95)";
          ctx.strokeStyle = game.color;
          ctx.lineWidth = 3;
          ctx.shadowColor = game.color;
          ctx.shadowBlur = 20 * pulse;
          rr(gx - 28, gy, 56, 68, 7);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Screen (LARGER)
          ctx.fillStyle = "#000";
          rr(gx - 22, gy + 6, 44, 34, 4);
          ctx.fill();

          // Screen glow
          const screenGlow = ctx.createRadialGradient(
            gx,
            gy + 23,
            0,
            gx,
            gy + 23,
            26,
          );
          screenGlow.addColorStop(
            0,
            game.color +
              Math.floor(70 * screenFlicker)
                .toString(16)
                .padStart(2, "0"),
          );
          screenGlow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = screenGlow;
          ctx.fillRect(gx - 22, gy + 6, 44, 34);

          // Game icon (LARGER)
          ctx.font = "28px serif";
          ctx.textAlign = "center";
          ctx.shadowColor = game.color;
          ctx.shadowBlur = 15;
          ctx.fillText(game.emoji, gx, gy + 32);
          ctx.shadowBlur = 0;

          // Control panel (LARGER)
          ctx.fillStyle = "#1a1a25";
          rr(gx - 22, gy + 44, 44, 18, 3);
          ctx.fill();

          // Joystick (LARGER)
          ctx.fillStyle = "#333";
          ctx.beginPath();
          ctx.arc(gx - 8, gy + 53, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#666";
          ctx.beginPath();
          ctx.arc(gx - 8, gy + 52, 3, 0, Math.PI * 2);
          ctx.fill();

          // Buttons (LARGER)
          const btnColors = [PINK, CYAN, GREEN];
          for (let b = 0; b < 3; b++) {
            ctx.fillStyle = btnColors[b];
            ctx.shadowColor = btnColors[b];
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(gx + 6 + b * 9, gy + 53, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.shadowBlur = 0;

          // Game name (LARGER)
          ctx.font = "bold 7px Orbitron, monospace";
          ctx.fillStyle = game.color;
          ctx.textAlign = "center";
          ctx.shadowColor = game.color;
          ctx.shadowBlur = 5;
          ctx.fillText(game.name, gx, gy + 66);
          ctx.shadowBlur = 0;

          ctx.restore();
        }

        // ═══ ROW 3: PRIZE MACHINES & CLAW GAMES - ENLARGED ═══
        const prizeItems = [
          { emoji: "🧸", color: PINK },
          { emoji: "🎁", color: PURPLE },
          { emoji: "🏆", color: GOLD },
        ];

        for (let i = 0; i < 3; i++) {
          const px = cx - W * 0.28 + i * (W * 0.28);
          const py = midY + 80;
          const item = prizeItems[i];
          const pulse = Math.sin(t * 2 + i * 1.5) * 0.25 + 0.75;
          const floatY = Math.sin(t * 1.5 + i) * 4;

          ctx.save();

          // Glass case (LARGER)
          ctx.fillStyle = "rgba(10,15,25,0.85)";
          ctx.strokeStyle = item.color;
          ctx.lineWidth = 3;
          ctx.shadowColor = item.color;
          ctx.shadowBlur = 18 * pulse;
          rr(px - 35, py, 70, 60, 8);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Inner glow (LARGER)
          const innerGlow = ctx.createRadialGradient(
            px,
            py + 30,
            0,
            px,
            py + 30,
            35,
          );
          innerGlow.addColorStop(0, item.color + "35");
          innerGlow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = innerGlow;
          ctx.beginPath();
          ctx.arc(px, py + 30, 35, 0, Math.PI * 2);
          ctx.fill();

          // Prize item (LARGER)
          ctx.font = "38px serif";
          ctx.textAlign = "center";
          ctx.shadowColor = item.color;
          ctx.shadowBlur = 20;
          ctx.fillText(item.emoji, px, py + 40 + floatY);
          ctx.shadowBlur = 0;

          // "INSERT COIN" text (LARGER)
          ctx.font = "bold 7px Orbitron, monospace";
          ctx.fillStyle = Math.sin(t * 4) > 0 ? GOLD : "#444";
          ctx.shadowColor = GOLD;
          ctx.shadowBlur = Math.sin(t * 4) > 0 ? 6 : 0;
          ctx.fillText("INSERT COIN", px, py + 55);
          ctx.shadowBlur = 0;

          ctx.restore();
        }

        // ═══ AMBIENT EFFECTS ═══
        ctx.save();
        // Floating particles (MORE)
        for (let pi = 0; pi < 15; pi++) {
          const px = cx - W * 0.45 + ((t * 12 + pi * 65) % (W * 0.9));
          const py =
            topY + 25 + Math.sin(t * 0.6 + pi * 0.7) * 50 + ((pi * 22) % 100);
          const alpha = Math.sin(t * 2 + pi) * 0.35 + 0.45;
          const colors = [CYAN, PINK, GOLD, GREEN];
          ctx.fillStyle =
            colors[pi % 4].slice(0, 7) +
            Math.floor(alpha * 255)
              .toString(16)
              .padStart(2, "0");
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // ═══ PRIZE COUNTER / DISPLAY STAND (between slot machines and cabinets) ═══
        ctx.save();
        const counterPulse = Math.sin(t * 2.5) * 0.3 + 0.7;

        // Counter base - positioned between slot machines and arcade cabinets (lowered)
        const standX = cx - 70;
        const standY = topY + 155;
        const standW = 140;
        const standH = 35;

        // Counter shadow
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(standX + 5, standY + standH + 3, standW, 6);

        // Counter body
        const counterGrad = ctx.createLinearGradient(
          standX,
          standY,
          standX,
          standY + standH,
        );
        counterGrad.addColorStop(0, "#1a1a2e");
        counterGrad.addColorStop(1, "#0a0a14");
        ctx.fillStyle = counterGrad;
        rr(standX, standY, standW, standH, 8);
        ctx.fill();

        // Counter border with glow
        ctx.strokeStyle = PURPLE;
        ctx.lineWidth = 3;
        ctx.shadowColor = PURPLE;
        ctx.shadowBlur = 15 * counterPulse;
        rr(standX, standY, standW, standH, 8);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Top edge glow
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 2;
        ctx.shadowColor = CYAN;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(standX + 8, standY + 3);
        ctx.lineTo(standX + standW - 8, standY + 3);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Display items on counter
        const counterItems = ["🎫", "🎟️", "🏅"];
        for (let ci = 0; ci < 3; ci++) {
          const itemX = standX + 30 + ci * 40;
          const itemFloat = Math.sin(t * 2 + ci) * 2;
          ctx.font = "20px serif";
          ctx.textAlign = "center";
          ctx.shadowColor = GOLD;
          ctx.shadowBlur = 8;
          ctx.fillText(counterItems[ci], itemX, standY + 22 + itemFloat);
        }
        ctx.shadowBlur = 0;

        // "PRIZES" text
        ctx.font = "bold 9px Orbitron, monospace";
        ctx.fillStyle = GOLD;
        ctx.shadowColor = GOLD;
        ctx.shadowBlur = 8;
        ctx.textAlign = "center";
        ctx.fillText("★ PRIZES ★", cx, standY + standH + 18);
        ctx.shadowBlur = 0;

        ctx.restore();
      } else if (!!this.map?.config?.zombie) {
        // ═══ ZOMBIE: DEAD ZONE ARCADE ═══
        const t=performance.now()/1000;
        // Sign
        ctx.fillStyle="rgba(30,0,0,0.9)"; rr(W/2-90,room.S-22,180,26,5); ctx.fill();
        ctx.strokeStyle=`rgba(220,40,40,${0.5+0.4*Math.abs(Math.sin(t*2.5))})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#FFCCCC"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
        ctx.fillText("☠  DEAD ZONE  ☠", W/2, room.S-9);
        // Broken arcade cabinets (left column, 3 rows)
        const cabW=60, cabH=70;
        for (let ci=0;ci<4;ci++) {
          const cx3=28+ci%2*(cabW+8), cy3=topY+10+Math.floor(ci/2)*(cabH+10);
          ctx.fillStyle="#0a0a0a"; rr(cx3,cy3,cabW,cabH,4); ctx.fill();
          ctx.strokeStyle="rgba(180,0,0,0.4)"; ctx.lineWidth=1; ctx.stroke();
          // Cracked/dead screen
          ctx.fillStyle="#050505"; rr(cx3+5,cy3+5,cabW-10,cabH-24,2); ctx.fill();
          if (ci%2===0) { // broken screen — static
            ctx.fillStyle=`rgba(40,40,40,${0.3+0.2*Math.sin(t*15+ci)})`; ctx.fillRect(cx3+5,cy3+5,cabW-10,cabH-24);
            ctx.strokeStyle="rgba(100,100,100,0.5)"; ctx.lineWidth=0.8;
            ctx.beginPath(); ctx.moveTo(cx3+15,cy3+5); ctx.lineTo(cx3+30,cy3+cabH-20); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx3+45,cy3+8); ctx.lineTo(cx3+22,cy3+cabH-22); ctx.stroke();
          } else { // dead screen
            ctx.fillStyle="rgba(0,0,0,0.9)"; ctx.fillRect(cx3+5,cy3+5,cabW-10,cabH-24);
          }
          // Buttons (some lit red, some dark)
          for (let bi=0;bi<4;bi++) {
            ctx.fillStyle=bi%3===0?`rgba(200,0,0,${0.5+0.4*Math.sin(t*3+bi+ci)})`:"rgba(20,20,20,0.8)";
            ctx.beginPath(); ctx.arc(cx3+12+bi*11,cy3+cabH-12,4,0,Math.PI*2); ctx.fill();
          }
        }
        // Smashed machines right side
        for (let si=0;si<3;si++) {
          const sx=W*0.52+si*(cabW+14), sy=topY+14;
          ctx.fillStyle="#0d0d0d"; rr(sx,sy,cabW,cabH*1.2,4); ctx.fill();
          ctx.strokeStyle="rgba(120,0,0,0.4)"; ctx.lineWidth=1; ctx.stroke();
          // Smashed screen
          ctx.fillStyle="#030303"; rr(sx+5,sy+5,cabW-10,cabH*0.7-10,2); ctx.fill();
          ctx.strokeStyle="rgba(140,0,0,0.5)"; ctx.lineWidth=0.8;
          for (let cr=0;cr<3;cr++) { ctx.beginPath(); ctx.moveTo(sx+8+cr*14,sy+5); ctx.lineTo(sx+20+cr*10,sy+cabH*0.7-12); ctx.stroke(); }
          // Hazard tape across machine
          ctx.save(); ctx.translate(sx+cabW/2,sy+cabH*0.6); ctx.rotate(-0.08);
          ctx.fillStyle="rgba(255,200,0,0.25)"; ctx.fillRect(-30,-4,60,8);
          ctx.restore();
        }
        // Emergency red lighting
        for (let li=0;li<4;li++) {
          const lx=W*0.22+li*W*0.22, la=0.06+0.04*Math.sin(t*4+li*1.6);
          ctx.fillStyle=`rgba(200,0,0,${la})`; ctx.fillRect(0,0,W,H);
        }
        // Survivor graffiti
        ctx.fillStyle="rgba(180,0,0,0.65)"; ctx.font="bold 8px monospace"; ctx.textAlign="center";
        ctx.fillText("GAME OVER.", W/2, H*0.82);
        ctx.fillStyle="rgba(140,0,0,0.5)"; ctx.font="6px monospace";
        ctx.fillText("FOR REAL THIS TIME", W/2, H*0.89);
      } else if (!this.map?.config?.galactica) {
        // ── Default Arcade (other maps) ────────────────────────
        const aColors = [
          "#FF0044",
          "#00AAFF",
          "#00FF88",
          "#FFAA00",
          "#AA00FF",
          "#FF6600",
        ];
        const aPos = [
          [cx - W * 0.36, topY + 6],
          [cx - W * 0.14, topY + 6],
          [cx + W * 0.1, topY + 6],
          [cx - W * 0.28, midY - 4],
          [cx - W * 0.02, midY - 4],
          [cx + W * 0.24, midY - 4],
        ];
        for (let i = 0; i < aPos.length; i++) {
          const [ax, ay] = aPos[i],
            ac = aColors[i];
          ctx.fillStyle = "#1a1a2a";
          ctx.strokeStyle = ac;
          ctx.lineWidth = 1.5;
          rr(ax - 17, ay, 34, 46, 3);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#000820";
          ctx.fillRect(ax - 13, ay + 4, 26, 20);
          ctx.fillStyle = ac + "44";
          ctx.fillRect(ax - 13, ay + 4, 26, 20);
          ctx.shadowColor = ac;
          ctx.shadowBlur = 8;
          ctx.fillStyle = ac;
          ctx.fillRect(ax - 5, ay + 8, 10, 7);
          ctx.fillRect(ax - 7, ay + 10, 14, 4);
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#2a2a3a";
          ctx.fillRect(ax - 15, ay + 26, 30, 11);
          ctx.fillStyle = "#888";
          ctx.beginPath();
          ctx.arc(ax - 4, ay + 31, 4, 0, Math.PI * 2);
          ctx.fill();
          const bC = ["#FF3333", "#33FF33", "#3333FF"];
          for (let bi = 0; bi < 3; bi++) {
            ctx.fillStyle = bC[bi];
            ctx.shadowColor = bC[bi];
            ctx.shadowBlur = 3;
            ctx.beginPath();
            ctx.arc(ax + 5 + bi * 4, ay + 31, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.shadowBlur = 0;
        }
        // Prize counter
        ctx.fillStyle = "#2a1a3a";
        ctx.strokeStyle = "#AA44FF";
        ctx.lineWidth = 1.5;
        rr(cx - 46, midY + 32, 92, 22, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#FFEE44";
        ctx.font = "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.fillText("PRIZE COUNTER", cx, midY + 48);
      } else if (!!this.map?.config?.hardcore) {
        // ═══ HARDCORE: HELLFIRE ARCADE ═══
        const t = performance.now() / 1000;
        const EMBER="#FF8800"; const FLAME="#FF5500"; const CRIMSON="#FF2200"; const AMBER="#FFAA00";
        const EMBERr="255,136,0"; const FLAMEr="255,85,0"; const CRIMSONr="255,34,0"; const AMBERr="255,170,0";

        // Scorched floor
        ctx.fillStyle="#080100"; ctx.fillRect(0,0,W,H);
        for(let si=0;si<16;si++){
          const sx=30+si*66,sy=H*0.15+((si*53)%Math.floor(H*0.7));
          const sg=ctx.createRadialGradient(sx,sy,0,sx,sy,28);
          sg.addColorStop(0,`rgba(${FLAMEr},0.07)`); sg.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(sx,sy,28,0,Math.PI*2); ctx.fill();
        }

        // Title
        ctx.save(); ctx.font="bold 19px Orbitron, monospace"; ctx.textAlign="center";
        ctx.fillStyle="#fff"; ctx.shadowColor=FLAME; ctx.shadowBlur=28;
        ctx.fillText("🔥 HELLFIRE ARCADE 🔥", cx, topY-10); ctx.shadowBlur=0; ctx.restore();

        // ── 8 fire arcade cabinets (2 rows × 4) ──
        const cabColors=[CRIMSON,FLAME,EMBER,AMBER];
        const cabNames=["INFERNO FURY","LAVA BLAST","FIRE STORM","EMBER QUEST","MAGMA RACE","FLAME DUEL","SCORCH WARS","BLAZE RUN"];
        let cabIdx=0;
        for(let row=0;row<2;row++){
          for(let col=0;col<4;col++){
            const cx2=100+col*240, cy2=topY+12+row*138;
            const cc=cabColors[col%4];
            ctx.fillStyle="#120500"; ctx.strokeStyle=cc; ctx.lineWidth=1.5;
            rr(cx2-42,cy2,84,110,5); ctx.fill(); ctx.stroke();
            const sg=ctx.createLinearGradient(cx2-30,cy2+12,cx2+30,cy2+12);
            sg.addColorStop(0,`rgba(${CRIMSONr},0.6)`); sg.addColorStop(0.5,`rgba(${AMBERr},0.8)`); sg.addColorStop(1,`rgba(${FLAMEr},0.6)`);
            ctx.fillStyle=sg; rr(cx2-30,cy2+10,60,52,3); ctx.fill();
            ctx.strokeStyle=cc; ctx.lineWidth=1; ctx.stroke();
            const flk=0.3+0.2*Math.sin(t*4+col+row*2);
            ctx.fillStyle=`rgba(${FLAMEr},${flk})`; rr(cx2-28,cy2+12,56,48,3); ctx.fill();
            ctx.fillStyle=cc; ctx.beginPath(); ctx.arc(cx2-14,cy2+72,6,0,Math.PI*2); ctx.fill();
            ctx.fillStyle=CRIMSON; ctx.beginPath(); ctx.arc(cx2+4,cy2+72,5,0,Math.PI*2); ctx.fill();
            ctx.fillStyle=EMBER; ctx.beginPath(); ctx.arc(cx2+18,cy2+72,5,0,Math.PI*2); ctx.fill();
            ctx.fillStyle="#0a0200"; ctx.strokeStyle=`rgba(${AMBERr},0.5)`; ctx.lineWidth=0.8;
            rr(cx2-10,cy2+84,20,6,2); ctx.fill(); ctx.stroke();
            ctx.fillStyle=cc; ctx.font="bold 5px monospace"; ctx.textAlign="center";
            ctx.fillText(cabNames[cabIdx],cx2,cy2+100);
            cabIdx++;
          }
        }

        // ── High score board (back wall center) ──
        ctx.fillStyle="#110400"; ctx.strokeStyle=AMBER; ctx.lineWidth=2;
        rr(cx-130,topY+300,260,120,6); ctx.fill(); ctx.stroke();
        ctx.fillStyle=AMBER; ctx.font="bold 10px monospace"; ctx.textAlign="center";
        ctx.fillText("⚡ HIGH SCORES ⚡", cx, topY+320);
        const scores=[["ZAV",9999],["ACE",8750],["REX",7420],["BLAZE",6100],["FURY",5880]];
        scores.forEach(([nm,sc],si)=>{
          ctx.fillStyle=si===0?CRIMSON:si===1?FLAME:EMBER;
          ctx.font="bold 7px monospace"; ctx.textAlign="left";
          ctx.fillText(`${si+1}. ${nm}`, cx-110, topY+340+si*16);
          ctx.textAlign="right";
          ctx.fillText(`${sc}`, cx+110, topY+340+si*16);
        });

        // ── Ticket redemption counter (bottom) ──
        ctx.fillStyle="#150600"; ctx.strokeStyle=FLAME; ctx.lineWidth=1.5;
        rr(cx-200,H*0.76,400,70,6); ctx.fill(); ctx.stroke();
        ctx.fillStyle=AMBER; ctx.font="bold 9px monospace"; ctx.textAlign="center"; ctx.fillText("🎟 TICKET REDEMPTION 🎟", cx, H*0.76+20);
        const prizes=[{x:cx-150,nm:"BLADE",col:CRIMSON},{x:cx-90,nm:"MASK",col:FLAME},{x:cx-30,nm:"BOMB",col:EMBER},{x:cx+30,nm:"TROPHY",col:AMBER},{x:cx+90,nm:"SKULL",col:CRIMSON},{x:cx+150,nm:"CROWN",col:FLAME}];
        prizes.forEach(p=>{
          ctx.fillStyle=p.col+"66"; ctx.strokeStyle=p.col; ctx.lineWidth=0.8;
          rr(p.x-12,H*0.76+26,24,24,3); ctx.fill(); ctx.stroke();
          ctx.fillStyle=p.col; ctx.font="bold 4px monospace"; ctx.textAlign="center"; ctx.fillText(p.nm,p.x,H*0.76+58);
        });

        // ── 6 players at cabinets ──
        [[100,topY+128],[340,topY+128],[580,topY+128],[820,topY+128],[220,topY+268],[700,topY+268]].forEach(([px,py],pi)=>{
          ctx.fillStyle=["#8B2000","#CC4400","#FF6600","#AA2200","#DD3300","#FF4400"][pi];
          ctx.beginPath(); ctx.arc(px,py,8,0,Math.PI*2); ctx.fill();
          ctx.fillRect(px-6,py+7,12,14);
          ctx.fillStyle="#0a0200"; ctx.beginPath(); ctx.arc(px,py,4,0,Math.PI*2); ctx.fill();
        });

        // Ember drift
        for(let ei=0;ei<12;ei++){
          const ex=40+ei*85, ey=H*0.65+18*Math.sin(t*1.5+ei*0.7);
          ctx.fillStyle=`rgba(${EMBERr},${0.13+0.09*Math.sin(t*2.2+ei)})`; ctx.beginPath(); ctx.arc(ex,ey,2,0,Math.PI*2); ctx.fill();
        }
      } else {
        // ═══ GALACTICA: STAR GATE ARCADE ═══
        const t = performance.now() / 1000;
        const PURP = "#AA88FF",
          GOLD = "#FFDD55",
          CYAN = "#55DDFF",
          PINK = "#FF55CC";

        // Title
        ctx.save();
        ctx.font = "bold 16px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.shadowColor = PURP;
        ctx.shadowBlur = 22;
        ctx.fillText("⬡ STAR GATE ARCADE ⬡", cx, topY - 2);
        ctx.shadowBlur = 0;
        ctx.restore();

        // Divider
        const dg = ctx.createLinearGradient(cx - W * 0.44, 0, cx + W * 0.44, 0);
        dg.addColorStop(0, "rgba(170,136,255,0)");
        dg.addColorStop(0.5, "rgba(170,136,255,0.9)");
        dg.addColorStop(1, "rgba(170,136,255,0)");
        ctx.strokeStyle = dg;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - W * 0.44, topY + 12);
        ctx.lineTo(cx + W * 0.44, topY + 12);
        ctx.stroke();

        // ── ROW 1: HOLOGRAPHIC GAME PODS ──
        const podColors = [PURP, CYAN, GOLD, PINK];
        for (let i = 0; i < 4; i++) {
          const px2 = cx - W * 0.36 + i * (W * 0.24);
          const py2 = topY + 28;
          const col = podColors[i];
          const pulse = Math.sin(t * 2.5 + i) * 0.3 + 0.7;
          // Pod body — hexagonal shape
          ctx.save();
          ctx.translate(px2, py2 + 36);
          ctx.fillStyle = "rgba(10,5,25,0.95)";
          ctx.strokeStyle = col;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = col;
          ctx.shadowBlur = 14 * pulse;
          ctx.beginPath();
          for (let h = 0; h < 6; h++) {
            const ha = (h * Math.PI) / 3 - Math.PI / 6;
            const hx = Math.cos(ha) * 30,
              hy = Math.sin(ha) * 36;
            h === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
          // Holographic screen inside
          ctx.fillStyle = `rgba(20,5,40,0.9)`;
          ctx.beginPath();
          for (let h = 0; h < 6; h++) {
            const ha = (h * Math.PI) / 3 - Math.PI / 6;
            const hx = Math.cos(ha) * 22,
              hy = Math.sin(ha) * 26;
            h === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.fill();
          // Animated alien symbol on screen
          ctx.fillStyle = col;
          ctx.shadowColor = col;
          ctx.shadowBlur = 8;
          ctx.font = `${14 + Math.sin(t * 3 + i) * 2}px serif`;
          ctx.textAlign = "center";
          const aliens = ["⬡", "◈", "✦", "⬢"];
          ctx.fillText(aliens[i], 0, 6);
          ctx.shadowBlur = 0;
          // Top glow bar
          ctx.fillStyle = col;
          ctx.shadowColor = col;
          ctx.shadowBlur = 10;
          ctx.fillRect(-22, -30, 44, 8);
          ctx.shadowBlur = 0;
          ctx.restore();
          // Label below
          ctx.fillStyle = "#FFFFFF";
          ctx.shadowColor = col;
          ctx.shadowBlur = 6;
          ctx.font = "bold 7px Orbitron, monospace";
          ctx.textAlign = "center";
          ctx.fillText(
            ["VOID QUEST", "STAR RACE", "NOVA ARENA", "NEBULA"][i],
            px2,
            py2 + 82,
          );
          ctx.shadowBlur = 0;
        }

        // ── ROW 2: ENERGY DRINK DISPENSERS ──
        const drinkPos = [
          cx - W * 0.28,
          cx - W * 0.08,
          cx + W * 0.08,
          cx + W * 0.28,
        ];
        const drinkCols = [PURP, GOLD, CYAN, PINK];
        for (let i = 0; i < 4; i++) {
          const dx = drinkPos[i],
            dy = midY + 10;
          const dc = drinkCols[i];
          const lp = Math.sin(t * 2 + i * 1.5) * 0.5 + 0.5;
          // Machine body
          ctx.fillStyle = "#080518";
          ctx.strokeStyle = dc;
          ctx.lineWidth = 1.5;
          ctx.shadowColor = dc;
          ctx.shadowBlur = 8 * lp;
          rr(dx - 16, dy - 28, 32, 48, 6);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
          // Liquid level
          ctx.fillStyle = dc + "55";
          ctx.fillRect(dx - 10, dy - 18 + (1 - lp) * 18, 20, 18 * lp);
          // Dispenser nozzle
          ctx.fillStyle = "#333";
          ctx.fillRect(dx - 5, dy + 18, 10, 6);
          // Glow dot
          ctx.fillStyle = dc;
          ctx.shadowColor = dc;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(dx, dy - 24, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // ── PRIZE COUNTER (bottom) ──
        ctx.fillStyle = "#0a0520";
        ctx.strokeStyle = PURP;
        ctx.lineWidth = 2;
        ctx.shadowColor = PURP;
        ctx.shadowBlur = 10;
        rr(cx - 52, midY + 38, 104, 24, 4);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = GOLD;
        ctx.shadowColor = GOLD;
        ctx.shadowBlur = 8;
        ctx.font = "bold 8px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("◈ STAR GATE PRIZES ◈", cx, midY + 55);
        ctx.shadowBlur = 0;

        // Ambient floating stars
        for (let i = 0; i < 10; i++) {
          const sx = (t * 25 + i * 90) % W;
          const sy = topY + 14 + ((i * 37) % (H * 0.75));
          const sa = Math.sin(t * 2 + i) * 0.4 + 0.5;
          ctx.fillStyle = `rgba(220,200,255,${sa * 0.4})`;
          ctx.beginPath();
          ctx.arc(sx, sy, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (type === 5) {
      // PHARMACY
      if (!!this.map?.config?.galactica) {
        // ═══ GALACTICA: STELLAR PHARMACY ═══
        const t = performance.now() / 1000;

        // ── Cosmic floor tiles ────────────────────────
        const tileSize = 54;
        for (let gy = 0; gy < Math.ceil(H / tileSize) + 1; gy++) {
          for (let gx = 0; gx < Math.ceil(W / tileSize) + 1; gx++) {
            const tx = gx * tileSize, ty = gy * tileSize;
            const seed = gx * 11 + gy * 17;
            ctx.fillStyle = (seed % 3 === 0) ? "rgba(0,18,32,0.88)"
                          : (seed % 3 === 1) ? "rgba(0,24,24,0.88)"
                          : "rgba(0,14,28,0.88)";
            ctx.fillRect(tx, ty, tileSize, tileSize);
            ctx.strokeStyle = "rgba(0,200,180,0.14)";
            ctx.lineWidth = 0.5;
            ctx.strokeRect(tx, ty, tileSize, tileSize);
            if (seed % 6 === 0) {
              ctx.fillStyle = `rgba(0,220,200,${0.25 + 0.12 * Math.sin(t * 1.1 + seed)})`;
              ctx.beginPath();
              ctx.arc(tx + 27, ty + 27, 1.2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // ── Room border glow ──────────────────────────
        ctx.strokeStyle = "rgba(0,220,180,0.55)";
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, W - 4, H - 4);
        ctx.strokeStyle = "rgba(0,160,200,0.18)";
        ctx.lineWidth = 1;
        ctx.strokeRect(6, 6, W - 12, H - 12);

        // ── Title sign ────────────────────────────────
        const signW = 300, signH = 28;
        const signX = W / 2 - signW / 2, signY = room.S - 24;
        const signGrad = ctx.createLinearGradient(signX, signY, signX + signW, signY);
        signGrad.addColorStop(0, "rgba(0,80,70,0.92)");
        signGrad.addColorStop(0.5, "rgba(0,160,140,0.98)");
        signGrad.addColorStop(1, "rgba(0,80,70,0.92)");
        ctx.fillStyle = signGrad;
        rr(signX, signY, signW, signH, 6);
        ctx.fill();
        ctx.strokeStyle = `rgba(0,240,200,${0.7 + 0.3 * Math.sin(t * 2.2)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Glowing cross on sign
        ctx.fillStyle = `rgba(0,255,200,${0.9 + 0.1 * Math.sin(t * 3)})`;
        ctx.shadowColor = "#00FFCC";
        ctx.shadowBlur = 10;
        ctx.fillRect(signX + 14, signY + 8, 5, 13);
        ctx.fillRect(signX + 9, signY + 12, 15, 5);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#CCFFEE";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.fillText("✦  STELLAR PHARMACY  ✦", W / 2, signY + 18);

        // ── Service counter (top) ─────────────────────
        const ctrY = topY + 32;
        const ctrW = 380, ctrH = 28;
        const ctrX = W / 2 - ctrW / 2;
        const ctrGrad = ctx.createLinearGradient(ctrX, ctrY, ctrX + ctrW, ctrY);
        ctrGrad.addColorStop(0, "#001818");
        ctrGrad.addColorStop(0.5, "#003030");
        ctrGrad.addColorStop(1, "#001818");
        ctx.fillStyle = ctrGrad;
        rr(ctrX, ctrY, ctrW, ctrH, 6);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,200,170,0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Counter gleam
        ctx.fillStyle = "rgba(0,220,180,0.08)";
        ctx.fillRect(ctrX + 4, ctrY + 3, ctrW - 8, 6);
        // Rx terminal on counter
        const rxX = ctrX + ctrW - 44, rxY = ctrY + 3;
        ctx.fillStyle = "#000d18";
        rr(rxX, rxY, 34, 22, 3);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,200,160,0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "rgba(0,200,160,0.8)";
        ctx.font = "bold 5px monospace";
        ctx.textAlign = "center";
        ctx.fillText("Rx SYSTEM", rxX + 17, rxY + 9);
        ctx.fillStyle = "rgba(0,255,180,0.5)";
        ctx.font = "4px monospace";
        ctx.fillText("ONLINE", rxX + 17, rxY + 17);

        // ── Medicine shelf rows (left half) ───────────
        const shelfColors = ["#FF5566","#5577FF","#44FFCC","#FFCC44","#FF88FF","#44FF99","#FF7733","#88CCFF"];
        const shelfLabels = ["MEDI-X","STIM+","NANO-K","VITA-Z","ANTI-R","NEURO","PLASMA","BOOST"];
        for (let row = 0; row < 3; row++) {
          const shelfY = topY + 68 + row * 62;
          const shelfX = 18, shelfW = W * 0.44;
          // Shelf backing
          ctx.fillStyle = "#001c1c";
          ctx.strokeStyle = "rgba(0,180,150,0.4)";
          ctx.lineWidth = 1.5;
          rr(shelfX, shelfY, shelfW, 48, 4);
          ctx.fill();
          ctx.stroke();
          // Shelf rails
          ctx.strokeStyle = "rgba(0,140,120,0.3)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(shelfX + 4, shelfY + 16);
          ctx.lineTo(shelfX + shelfW - 4, shelfY + 16);
          ctx.moveTo(shelfX + 4, shelfY + 32);
          ctx.lineTo(shelfX + shelfW - 4, shelfY + 32);
          ctx.stroke();
          // Medicine bottles and boxes on each row
          const itemCount = 8;
          for (let mi = 0; mi < itemCount; mi++) {
            const mc = shelfColors[(row * itemCount + mi) % shelfColors.length];
            const mx = shelfX + 8 + mi * (shelfW - 16) / itemCount;
            // Top shelf: tall bottles
            const bH = 10 + (mi % 3) * 4;
            ctx.fillStyle = mc;
            ctx.globalAlpha = 0.85;
            rr(mx, shelfY + 3, 10, bH, 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = "rgba(255,255,255,0.3)";
            ctx.lineWidth = 0.5;
            ctx.stroke();
            // Bottle cap
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            ctx.fillRect(mx + 2, shelfY + 2, 6, 3);
            // Bottom shelf: flat boxes
            ctx.fillStyle = mc;
            ctx.globalAlpha = 0.7;
            ctx.fillRect(mx, shelfY + 20, 12, 8);
            ctx.globalAlpha = 1;
            // Label
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.font = "3px monospace";
            ctx.textAlign = "center";
            ctx.fillText(shelfLabels[(row * itemCount + mi) % shelfLabels.length].slice(0,4), mx + 6, shelfY + 26);
          }
          // Shelf label tag
          ctx.fillStyle = "rgba(0,200,160,0.7)";
          ctx.font = "bold 5px monospace";
          ctx.textAlign = "left";
          ctx.fillText(`AISLE ${row + 1}`, shelfX + 4, shelfY + 45);
        }

        // ── Display cases (right side — premium items) ─
        const caseConfigs = [
          { x: W * 0.55, y: H * 0.30, label: "NANO HEAL", price: "180 CR", color: "#00FFCC" },
          { x: W * 0.72, y: H * 0.30, label: "STIM PACK", price: "95 CR",  color: "#88AAFF" },
          { x: W * 0.88, y: H * 0.30, label: "ANTI-TOX",  price: "120 CR", color: "#FF88CC" },
          { x: W * 0.55, y: H * 0.50, label: "REGEN+",    price: "240 CR", color: "#AAFFAA" },
          { x: W * 0.72, y: H * 0.50, label: "BOOST X",   price: "75 CR",  color: "#FFCC44" },
          { x: W * 0.88, y: H * 0.50, label: "NEURO-K",   price: "310 CR", color: "#FF77AA" },
        ];
        for (const cc of caseConfigs) {
          const { x: px, y: py, label, price, color } = cc;
          const pW = 70, pH = 56;
          // Platform shadow
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          rr(px - pW / 2 + 3, py - pH / 2 + 4, pW, pH, 5);
          ctx.fill();
          // Platform base
          const pGrad = ctx.createLinearGradient(px - pW / 2, py, px + pW / 2, py);
          pGrad.addColorStop(0, "#001818");
          pGrad.addColorStop(0.5, "#002828");
          pGrad.addColorStop(1, "#001818");
          ctx.fillStyle = pGrad;
          rr(px - pW / 2, py - pH / 2, pW, pH, 5);
          ctx.fill();
          ctx.strokeStyle = `${color}88`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Glow under item
          const glowR = ctx.createRadialGradient(px, py, 0, px, py, 22);
          glowR.addColorStop(0, `${color}44`);
          glowR.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = glowR;
          ctx.beginPath();
          ctx.arc(px, py, 22, 0, Math.PI * 2);
          ctx.fill();
          // Item: pill capsule
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.9 + 0.1 * Math.sin(t * 1.8 + px);
          ctx.beginPath();
          ctx.ellipse(px, py - 6, 10, 5, 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "rgba(255,255,255,0.3)";
          ctx.lineWidth = 0.5;
          ctx.stroke();
          // Plus symbol on pill
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.font = "bold 7px monospace";
          ctx.textAlign = "center";
          ctx.fillText("+", px, py - 3);
          // Label
          ctx.fillStyle = color;
          ctx.font = "bold 5px monospace";
          ctx.fillText(label, px, py + 8);
          // Price
          ctx.fillStyle = "#AAFFEE";
          ctx.font = "5px monospace";
          ctx.fillText(price, px, py + 16);
          // Hover pulse ring
          const ring = 0.5 + 0.5 * Math.sin(t * 2 + px * 0.01);
          ctx.strokeStyle = `${color}${Math.floor(ring * 80).toString(16).padStart(2,'0')}`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(px, py - 6, 14 + ring * 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        // ── Medicine queue line (left side) ──────────────
        // Label
        ctx.fillStyle = "rgba(0,200,160,0.7)";
        ctx.font = "bold 5.5px monospace";
        ctx.textAlign = "left";
        ctx.fillText("▶ QUEUE", 16, H * 0.58 - 10);
        // Queue rope
        ctx.strokeStyle = "rgba(0,180,140,0.4)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(16, H * 0.58);
        ctx.lineTo(16, H * 0.85);
        ctx.stroke();
        ctx.setLineDash([]);
        // Queued patients (4 people waiting in line)
        const queueSkinTones = ["#FFDDBB","#F0C080","#EECCAA","#D4956A"];
        const queueColors    = ["#3355CC","#CC3355","#338844","#8833CC"];
        for (let qi = 0; qi < 4; qi++) {
          const qx = 30, qy = H * 0.61 + qi * 34;
          const qSkin = queueSkinTones[qi];
          const qCol  = queueColors[qi];
          const isFem = qi % 2 !== 0;
          ctx.save();
          // Shadow
          ctx.fillStyle = "rgba(0,0,0,0.15)";
          ctx.beginPath(); ctx.ellipse(qx, qy + 10, 7, 3, 0, 0, Math.PI*2); ctx.fill();
          // Body
          ctx.fillStyle = qCol;
          rr(qx - 6, qy - 4, 12, 14, 3); ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 0.5; ctx.stroke();
          // Neck
          ctx.fillStyle = qSkin; ctx.fillRect(qx - 2, qy - 6, 4, 4);
          // Head
          ctx.beginPath(); ctx.arc(qx, qy - 12, 6, 0, Math.PI*2); ctx.fill();
          // Hair
          ctx.fillStyle = qi % 3 === 0 ? "#332211" : qi % 3 === 1 ? "#1a1a2a" : "#AA5522";
          if (isFem) {
            ctx.beginPath(); ctx.arc(qx, qy - 15, 5, Math.PI, 0); ctx.fill();
            ctx.fillRect(qx - 6, qy - 16, 3, 9);
            ctx.fillRect(qx + 3, qy - 16, 3, 9);
          } else {
            ctx.fillRect(qx - 5, qy - 16, 10, 5);
          }
          // Eyes
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.ellipse(qx - 2.5, qy - 13, 1.5, 1.2, 0, 0, Math.PI*2);
          ctx.ellipse(qx + 2.5, qy - 13, 1.5, 1.2, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = "#333";
          ctx.beginPath();
          ctx.arc(qx - 2.5, qy - 13, 0.8, 0, Math.PI*2);
          ctx.arc(qx + 2.5, qy - 13, 0.8, 0, Math.PI*2); ctx.fill();
          // Mouth (bored waiting expression)
          ctx.strokeStyle = "#AA7755"; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(qx - 2, qy - 9); ctx.lineTo(qx + 2, qy - 9); ctx.stroke();
          // Holding a ticket/clipboard
          if (qi === 0) {
            ctx.fillStyle = "#001a18";
            rr(qx + 7, qy - 4, 10, 12, 2); ctx.fill();
            ctx.strokeStyle = "rgba(0,200,160,0.6)"; ctx.lineWidth = 0.8; ctx.stroke();
            ctx.fillStyle = "rgba(0,200,160,0.5)"; ctx.font = "3px monospace"; ctx.textAlign = "center";
            ctx.fillText("Rx", qx + 12, qy + 2);
            ctx.fillStyle = "rgba(0,200,160,0.4)";
            ctx.fillRect(qx + 8, qy + 4, 8, 1);
            ctx.fillRect(qx + 8, qy + 6, 6, 1);
          }
          // Number badge
          ctx.fillStyle = "rgba(0,200,160,0.8)";
          ctx.beginPath(); ctx.arc(qx - 8, qy - 10, 5, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = "#001a18"; ctx.font = "bold 5px monospace"; ctx.textAlign = "center";
          ctx.fillText(qi + 1, qx - 8, qy - 8);
          ctx.restore();
        }

        // ── Waiting area seats (bottom) ────────────────
        const seatY = H * 0.80;
        for (let si = 0; si < 5; si++) {
          const sx = W * 0.12 + si * W * 0.16;
          // Seat
          ctx.fillStyle = "#001a20";
          ctx.strokeStyle = "rgba(0,180,150,0.5)";
          ctx.lineWidth = 1;
          rr(sx - 14, seatY - 9, 28, 20, 4);
          ctx.fill();
          ctx.stroke();
          // Back
          ctx.fillStyle = "#001518";
          rr(sx - 13, seatY - 18, 26, 10, 3);
          ctx.fill();
          ctx.strokeStyle = "rgba(0,160,130,0.4)";
          ctx.stroke();
          // Seated figure (alternating occupied)
          if (si % 2 === 0) {
            const sitSkin = queueSkinTones[si % queueSkinTones.length];
            const sitCol  = queueColors[si % queueColors.length];
            // Body
            ctx.fillStyle = sitCol;
            rr(sx - 7, seatY - 6, 14, 15, 3); ctx.fill();
            // Neck
            ctx.fillStyle = sitSkin; ctx.fillRect(sx - 2, seatY - 8, 4, 4);
            // Head
            ctx.beginPath(); ctx.arc(sx, seatY - 15, 6, 0, Math.PI * 2); ctx.fill();
            // Hair
            ctx.fillStyle = si === 0 ? "#332211" : "#1a1a2a";
            ctx.fillRect(sx - 5, seatY - 19, 10, 5);
            // Eyes
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.ellipse(sx - 2.5, seatY - 16, 1.5, 1.2, 0, 0, Math.PI*2);
            ctx.ellipse(sx + 2.5, seatY - 16, 1.5, 1.2, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#333";
            ctx.beginPath();
            ctx.arc(sx - 2.5, seatY - 16, 0.8, 0, Math.PI*2);
            ctx.arc(sx + 2.5, seatY - 16, 0.8, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }

        // ── Glowing cross emblem (wall center-right) ───
        const crossX = W * 0.72, crossY = H * 0.71;
        const crossGlow = ctx.createRadialGradient(crossX, crossY, 0, crossX, crossY, 30);
        crossGlow.addColorStop(0, `rgba(0,255,200,${0.3 + 0.15 * Math.sin(t * 1.5)})`);
        crossGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = crossGlow;
        ctx.beginPath();
        ctx.arc(crossX, crossY, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(0,255,190,${0.8 + 0.2 * Math.sin(t * 2)})`;
        ctx.shadowColor = "#00FFCC";
        ctx.shadowBlur = 14;
        ctx.fillRect(crossX - 3, crossY - 14, 6, 28);
        ctx.fillRect(crossX - 14, crossY - 3, 28, 6);
        ctx.shadowBlur = 0;

        // ── Ambient particles ─────────────────────────
        for (let pi = 0; pi < 6; pi++) {
          const px = (Math.sin(pi * 2.1 + t * 0.5) * 0.38 + 0.5) * W;
          const py = (Math.cos(pi * 1.9 + t * 0.35) * 0.3 + 0.5) * H;
          ctx.fillStyle = `rgba(0,220,180,${0.2 + 0.15 * Math.sin(t * 1.4 + pi)})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── [T] TALK hint ─────────────────────────────
        ctx.fillStyle = "rgba(0,160,130,0.88)";
        rr(W / 2 - 40, topY + 62, 80, 14, 4);
        ctx.fill();
        ctx.fillStyle = "#CCFFEE";
        ctx.font = "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.fillText("[T] BUY MEDICINE", W / 2, topY + 72);

      } else if (!!this.map?.config?.zombie) {
        // ═══ ZOMBIE: INFECTED PHARMACY ═══
        const t = performance.now() / 1000;

        // ── Room sign (top) ──────────────────────────────
        ctx.fillStyle = "#1a0000";
        rr(W/2-130, room.S-24, 260, 28, 5); ctx.fill();
        ctx.strokeStyle = `rgba(220,40,40,${0.7+0.3*Math.sin(t*1.8)})`; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "#FF8888"; ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
        ctx.shadowColor = "#FF0000"; ctx.shadowBlur = 8;
        ctx.fillText("☠  INFECTED PHARMACY  ☠", W/2, room.S-9);
        ctx.shadowBlur = 0;

        // ── Pharmacy counter (top of room) ───────────────
        // Counter body
        ctx.fillStyle = "#3a2a1a";
        rr(cx-W*0.43, topY+22, W*0.86, 26, 4); ctx.fill();
        ctx.strokeStyle = "#7a5a30"; ctx.lineWidth = 2; ctx.stroke();
        // Counter surface highlight (cracked white laminate)
        ctx.fillStyle = "#c8b890";
        ctx.fillRect(cx-W*0.42, topY+23, W*0.84, 5);
        ctx.fillStyle = "rgba(0,0,0,0.3)"; // crack lines
        ctx.fillRect(cx-W*0.10, topY+23, 1, 5);
        ctx.fillRect(cx+W*0.15, topY+24, 1, 4);

        // ── Medicine bottles on counter ──────────────────
        const bottleColors = ["#cc3333","#3355cc","#229944","#cc8800","#882299","#22aacc"];
        for (let bi = 0; bi < 7; bi++) {
          const bx = cx - W*0.38 + bi*(W*0.76/6), by = topY + 5;
          const bc = bottleColors[bi % bottleColors.length];
          // Bottle body
          ctx.fillStyle = bc; ctx.beginPath(); ctx.ellipse(bx, by+11, 5, 11, 0, 0, Math.PI*2); ctx.fill();
          // Bottle neck
          ctx.fillStyle = bc; ctx.fillRect(bx-2, by-2, 4, 5);
          // White label
          ctx.fillStyle = "rgba(255,255,220,0.75)"; ctx.fillRect(bx-4, by+5, 8, 8);
          // Highlight on bottle
          ctx.fillStyle = "rgba(255,255,255,0.25)";
          ctx.beginPath(); ctx.ellipse(bx-2, by+8, 2, 5, 0, 0, Math.PI*2); ctx.fill();
          // Crossed-out Rx label on some
          if (bi % 2 === 0) {
            ctx.fillStyle = "#cc0000"; ctx.font = "bold 4px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("Rx", bx, by+11);
          }
        }

        // ── Left shelving unit (medicine stock) ──────────
        const shlX = 12, shlY = topY+60, shlW = 68, shlH = H*0.38;
        // Back panel
        ctx.fillStyle = "#2a1a0a"; rr(shlX, shlY, shlW, shlH, 3); ctx.fill();
        ctx.strokeStyle = "#6a4a20"; ctx.lineWidth = 1.5; ctx.stroke();
        // 4 shelves with items
        for (let row = 0; row < 4; row++) {
          const ry = shlY + 6 + row*(shlH/4);
          // Shelf plank
          ctx.fillStyle = "#5a3a18"; ctx.fillRect(shlX+2, ry, shlW-4, 4);
          // Items on shelf
          for (let col = 0; col < 4; col++) {
            const ix = shlX + 5 + col*15, iy = ry + 6;
            const itype = (row*4+col) % 4;
            if (itype === 0) {
              // Tall white pill bottle
              ctx.fillStyle = "#e8e8e8"; ctx.beginPath(); ctx.ellipse(ix+4, iy+7, 3.5, 8, 0, 0, Math.PI*2); ctx.fill();
              ctx.fillStyle = "#cc3333"; ctx.fillRect(ix+1, iy+3, 6, 4);
              ctx.fillStyle = "#ffffff"; ctx.font = "bold 3px sans-serif"; ctx.textAlign = "center"; ctx.fillText("+", ix+4, iy+6);
            } else if (itype === 1) {
              // Red first aid box
              ctx.fillStyle = "#cc2222"; rr(ix, iy+2, 10, 10, 1); ctx.fill();
              ctx.fillStyle = "#ffffff"; ctx.fillRect(ix+3, iy+4, 4, 6); ctx.fillRect(ix+1, iy+6, 8, 2);
            } else if (itype === 2) {
              // Blue medicine pack
              ctx.fillStyle = "#2244aa"; rr(ix, iy+4, 12, 8, 1); ctx.fill();
              ctx.strokeStyle = "#4488ff"; ctx.lineWidth = 0.8; ctx.stroke();
              ctx.fillStyle = "#aaccff"; ctx.font = "3px sans-serif"; ctx.textAlign = "center"; ctx.fillText("MED", ix+6, iy+9);
            } else {
              // Green syrup bottle (tipped over)
              ctx.save(); ctx.translate(ix+6, iy+8); ctx.rotate(0.6);
              ctx.fillStyle = "#228833"; ctx.beginPath(); ctx.ellipse(0, 0, 3, 7, 0, 0, Math.PI*2); ctx.fill();
              ctx.fillStyle = "rgba(100,220,100,0.4)"; ctx.beginPath(); ctx.ellipse(-5, 5, 5, 3, 0, 0, Math.PI*2); ctx.fill();
              ctx.restore();
            }
          }
        }

        // ── Right shelving unit (supplies) ───────────────
        const shlX2 = W - 80, shlY2 = topY+60, shlW2 = 68, shlH2 = H*0.38;
        ctx.fillStyle = "#2a1a0a"; rr(shlX2, shlY2, shlW2, shlH2, 3); ctx.fill();
        ctx.strokeStyle = "#6a4a20"; ctx.lineWidth = 1.5; ctx.stroke();
        for (let row = 0; row < 4; row++) {
          const ry = shlY2 + 6 + row*(shlH2/4);
          ctx.fillStyle = "#5a3a18"; ctx.fillRect(shlX2+2, ry, shlW2-4, 4);
          for (let col = 0; col < 4; col++) {
            const ix = shlX2 + 5 + col*15, iy = ry + 6;
            const itype = (row*3+col+1) % 4;
            if (itype === 0) {
              // Bandage roll
              ctx.fillStyle = "#e8ddc8"; ctx.beginPath(); ctx.arc(ix+5, iy+6, 5, 0, Math.PI*2); ctx.fill();
              ctx.strokeStyle = "#aaa080"; ctx.lineWidth = 0.8; ctx.stroke();
              ctx.fillStyle = "#cc3333"; ctx.fillRect(ix+2, iy+4, 6, 1.5); ctx.fillRect(ix+4, iy+2, 1.5, 6);
            } else if (itype === 1) {
              // White spray canister
              ctx.fillStyle = "#d8d8d8"; ctx.beginPath(); ctx.ellipse(ix+4, iy+7, 4, 9, 0, 0, Math.PI*2); ctx.fill();
              ctx.fillStyle = "#e84444"; ctx.fillRect(ix+1, iy+2, 7, 4);
              ctx.fillStyle = "#333"; ctx.fillRect(ix+2, iy+1, 4, 2);
            } else if (itype === 2) {
              // Orange pill bottle
              ctx.fillStyle = "#cc6600"; ctx.beginPath(); ctx.ellipse(ix+4, iy+7, 4, 9, 0, 0, Math.PI*2); ctx.fill();
              ctx.fillStyle = "#ffffff"; ctx.fillRect(ix+1, iy+5, 6, 5);
              ctx.fillStyle = "#cc6600"; ctx.font = "bold 3px sans-serif"; ctx.textAlign="center"; ctx.fillText("RX", ix+4, iy+10);
            } else {
              // IV bag hanging
              ctx.fillStyle = "rgba(180,240,200,0.85)"; rr(ix+1, iy, 8, 12, 2); ctx.fill();
              ctx.strokeStyle = "rgba(80,180,100,0.8)"; ctx.lineWidth = 0.8; ctx.stroke();
              ctx.strokeStyle = "rgba(100,200,120,0.6)"; ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(ix+5, iy+12); ctx.lineTo(ix+5, iy+17); ctx.stroke();
            }
          }
        }

        // ── Examination table (center) ───────────────────
        const exX = cx-44, exY = H*0.42, exW = 88, exH = 48;
        // Table legs
        ctx.fillStyle = "#555555";
        for (const lx of [exX+4, exX+exW-8]) {
          ctx.fillRect(lx, exY+exH, 4, 10);
        }
        // Table body (cream/white stained)
        ctx.fillStyle = "#c8c0a0"; rr(exX, exY, exW, exH, 4); ctx.fill();
        ctx.strokeStyle = "#8a8060"; ctx.lineWidth = 2; ctx.stroke();
        // Stains (blood + green infection)
        ctx.fillStyle = "rgba(140,20,20,0.5)"; ctx.beginPath(); ctx.ellipse(exX+30, exY+20, 14, 8, 0.4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "rgba(40,160,40,0.4)"; ctx.beginPath(); ctx.ellipse(exX+60, exY+32, 10, 6, -0.3, 0, Math.PI*2); ctx.fill();
        // Paper roll on table (exam paper)
        ctx.fillStyle = "#e8e0c8"; ctx.fillRect(exX+2, exY+2, exW-4, 8);
        ctx.strokeStyle = "rgba(100,90,70,0.3)"; ctx.lineWidth = 0.5;
        for (let li = 0; li < 6; li++) { ctx.beginPath(); ctx.moveTo(exX+2, exY+3+li*1.2); ctx.lineTo(exX+exW-2, exY+3+li*1.2); ctx.stroke(); }
        // Instrument tray on table
        ctx.fillStyle = "#aaaaaa"; rr(exX+exW-28, exY+12, 24, 18, 2); ctx.fill();
        ctx.strokeStyle = "#777777"; ctx.lineWidth = 1; ctx.stroke();
        // Scalpel on tray
        ctx.fillStyle = "#cccccc"; ctx.fillRect(exX+exW-26, exY+15, 20, 2);
        ctx.fillStyle = "#666666"; ctx.fillRect(exX+exW-8, exY+14, 4, 4);
        // Syringe on tray
        ctx.fillStyle = "#dddddd"; ctx.fillRect(exX+exW-26, exY+21, 16, 3);
        ctx.fillStyle = "rgba(100,200,100,0.8)"; ctx.fillRect(exX+exW-26, exY+21, 7, 3);
        ctx.fillStyle = "#aaaaaa"; ctx.fillRect(exX+exW-11, exY+21, 3, 3);
        // Label on table side
        ctx.fillStyle = "rgba(180,20,20,0.8)"; ctx.font = "bold 5px monospace"; ctx.textAlign="center";
        ctx.fillText("QUARANTINE", cx, exY+exH+10);

        // ── IV drip stand (left of table) ────────────────
        const ivPoleX = exX - 14;
        ctx.strokeStyle = "#888888"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ivPoleX, exY-30); ctx.lineTo(ivPoleX, exY+exH+10); ctx.stroke();
        // Horizontal arm
        ctx.beginPath(); ctx.moveTo(ivPoleX, exY-30); ctx.lineTo(ivPoleX+18, exY-30); ctx.stroke();
        // IV bag
        ctx.fillStyle = "rgba(160,230,180,0.88)"; rr(ivPoleX+4, exY-52, 20, 24, 4); ctx.fill();
        ctx.strokeStyle = "#66aa77"; ctx.lineWidth = 1; ctx.stroke();
        // Fluid level in bag
        const ivfl = 0.35 + 0.12*Math.sin(t*0.4);
        ctx.fillStyle = `rgba(60,200,90,${0.55+0.15*Math.sin(t*0.6)})`;
        ctx.fillRect(ivPoleX+6, exY-52+24*(1-ivfl), 16, 24*ivfl-2);
        // Drip tube
        ctx.strokeStyle = "rgba(100,200,120,0.7)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(ivPoleX+14, exY-28); ctx.lineTo(ivPoleX+14, exY-4); ctx.stroke();

        // ── Medical monitor (right of table) ─────────────
        const monX = exX+exW+8, monY = H*0.42;
        ctx.fillStyle = "#222222"; rr(monX, monY, 52, 38, 4); ctx.fill();
        ctx.strokeStyle = "#444444"; ctx.lineWidth = 1.5; ctx.stroke();
        // Screen bezel
        ctx.fillStyle = "#111111"; rr(monX+3, monY+3, 46, 28, 2); ctx.fill();
        // Animated pulse line (erratic / flatline)
        ctx.strokeStyle = `rgba(44,255,44,${0.7+0.2*Math.sin(t*3.5)})`; ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let mx2 = 0; mx2 < 44; mx2++) {
          const spike = mx2 > 10 && mx2 < 20;
          const mpy = (monY+17) + Math.sin(mx2*0.9+t*5)*4*(spike ? 1 : 0.08);
          mx2 === 0 ? ctx.moveTo(monX+4+mx2, mpy) : ctx.lineTo(monX+4+mx2, mpy);
        }
        ctx.stroke();
        // CRITICAL label below screen
        ctx.fillStyle = `rgba(255,50,50,${0.7+0.3*Math.sin(t*2)})`; ctx.font = "bold 5px monospace"; ctx.textAlign = "center";
        ctx.fillText("CRITICAL", monX+26, monY+35);
        // Monitor stand
        ctx.fillStyle = "#333333"; ctx.fillRect(monX+20, monY+38, 12, 8);
        ctx.fillRect(monX+14, monY+44, 24, 4);

        // ── First aid cross on left wall ──────────────────
        ctx.fillStyle = "#cc2222"; ctx.shadowColor="#ff4444"; ctx.shadowBlur=10;
        ctx.fillRect(shlX+shlW+8, topY+62, 22, 8);   // horizontal bar
        ctx.fillRect(shlX+shlW+15, topY+55, 8, 22);  // vertical bar
        ctx.shadowBlur = 0;
        ctx.fillStyle="#ffffff"; ctx.font="bold 5px sans-serif"; ctx.textAlign="center";
        ctx.fillText("+", shlX+shlW+19, topY+83);

        // ── Hazmat warning board (right of right shelf) ──
        ctx.fillStyle = "#1a1000"; rr(shlX2-70, H*0.44, 58, 80, 4); ctx.fill();
        ctx.strokeStyle = "#cc8800"; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = "#ffcc00"; ctx.font = "bold 6px monospace"; ctx.textAlign = "center";
        ctx.fillText("⚠ WARNING", shlX2-41, H*0.44+14);
        ctx.strokeStyle = "#aa6600"; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(shlX2-68, H*0.44+18); ctx.lineTo(shlX2-14, H*0.44+18); ctx.stroke();
        const warnLines = ["CONTAMINATED","DO NOT ENTER","WEAR HAZMAT","SUIT REQUIRED"];
        warnLines.forEach((ln, i) => {
          ctx.fillStyle = i > 1 ? "#ff8888" : "#ffddaa";
          ctx.font = "4px monospace"; ctx.textAlign = "left";
          ctx.fillText(ln, shlX2-68, H*0.44+28+i*13);
        });

        // ── Corpse 1: dead pharmacist on floor ────────────
        drawCorpse(cx+W*0.05, H*0.68, 0.9, '#3a2010', 0.6);
        // ── Corpse 2: customer who didn't make it ─────────
        drawCorpse(cx-W*0.25, H*0.76, -0.5, '#2a1808', 0.5);

        // ── Scattered pills on floor ──────────────────────
        const pillColors = ["#ee4444","#4488ff","#44cc44","#ffcc00","#cc44cc","#ffffff"];
        for (let pi = 0; pi < 18; pi++) {
          const px5 = cx - W*0.30 + Math.sin(pi*137.5)*W*0.30;
          const py5 = H*0.55 + Math.cos(pi*73.1)*H*0.22;
          ctx.fillStyle = pillColors[pi % pillColors.length];
          ctx.save(); ctx.translate(px5, py5); ctx.rotate(pi*0.7);
          ctx.beginPath(); ctx.ellipse(0, 0, 3, 5, 0, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        }

        // ── Broken glass / spilled liquid on floor ────────
        ctx.fillStyle = "rgba(180,240,200,0.22)";
        ctx.beginPath(); ctx.ellipse(cx-W*0.12, H*0.62, 22, 12, 0.3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "rgba(180,240,200,0.12)";
        ctx.beginPath(); ctx.ellipse(cx+W*0.18, H*0.72, 16, 9, -0.2, 0, Math.PI*2); ctx.fill();
        // Glass shard triangles
        for (let gi = 0; gi < 8; gi++) {
          const gx = cx-W*0.15+gi*W*0.048, gy = H*0.61+(gi%3)*6;
          ctx.fillStyle = `rgba(200,240,220,${0.25+gi%3*0.08})`;
          ctx.save(); ctx.translate(gx, gy); ctx.rotate(gi*0.7);
          ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(4,3); ctx.lineTo(-4,3); ctx.closePath(); ctx.fill();
          ctx.restore();
        }

        // ── Biohazard tape across floor bottom ────────────
        for (let hi = 0; hi < 6; hi++) {
          ctx.fillStyle = hi % 2 === 0 ? "rgba(220,180,0,0.55)" : "rgba(0,0,0,0.55)";
          ctx.fillRect(W*0.04 + hi*(W*0.155), H*0.88, W*0.155, 8);
        }
        ctx.fillStyle = "#ffdd00"; ctx.font = "bold 5px monospace"; ctx.textAlign = "center";
        ctx.fillText("⚠ BIOHAZARD — NO ENTRY ⚠", cx, H*0.88-4);

        // ── Overhead flickering fluorescent light ─────────
        const flick = 0.6 + 0.4*Math.abs(Math.sin(t*7.8 + Math.sin(t*3.1)*2));
        ctx.fillStyle = `rgba(180,255,200,${flick*0.12})`;
        ctx.fillRect(cx-80, 0, 160, H*0.20);
        ctx.fillStyle = `rgba(200,255,210,${flick*0.9})`;
        ctx.fillRect(cx-60, 4, 120, 6);
        ctx.strokeStyle = "#aaaaaa"; ctx.lineWidth = 1;
        ctx.strokeRect(cx-60, 4, 120, 6);

      } else if (!!this.map?.config?.snow) {
        // ═══ FROZEN TUNDRA: FROST PHARMACY ═══
        const t = performance.now() / 1000;

        // ── Room sign (top) ──────────────────────────────
        ctx.fillStyle = "#AADDFF";
        ctx.shadowColor = "#66BBFF";
        ctx.shadowBlur = 12;
        ctx.font = "bold 11px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("❄ FROST PHARMACY ❄", cx, topY - 4);
        ctx.shadowBlur = 0;

        // ── Medicine shelves (left side) ────────────────
        for (let row = 0; row < 3; row++) {
          const shelfY = topY + 8 + row * 36;
          const shelfX = W * 0.05;
          const shelfW = W * 0.35;

          // Shelf backing (frosted white)
          ctx.fillStyle = "#E8F4FF";
          ctx.strokeStyle = "#AACCDD";
          ctx.lineWidth = 1.5;
          rr(shelfX, shelfY, shelfW, 30, 3);
          ctx.fill();
          ctx.stroke();

          // Shelf dividers
          ctx.fillStyle = "#CCDDEE";
          ctx.fillRect(shelfX + 2, shelfY + 14, shelfW - 4, 2);

          // Medicine bottles on shelf
          const medicineColors = ["#FF6666", "#6688FF", "#66CC88", "#FFAA55", "#AA66FF", "#66DDDD"];
          for (let mi = 0; mi < 6; mi++) {
            const mx = shelfX + 8 + mi * (shelfW - 16) / 6;
            const mc = medicineColors[(row + mi) % medicineColors.length];

            // Bottle body
            ctx.fillStyle = mc;
            const bH = 8 + (mi % 3) * 3;
            ctx.beginPath();
            ctx.roundRect(mx, shelfY + 2, 12, bH, 2);
            ctx.fill();
            // Bottle cap
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(mx + 2, shelfY + 1, 8, 3);
            // Label
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(mx + 1, shelfY + bH - 4, 10, 4);

            // Lower shelf: pill boxes
            ctx.fillStyle = mc;
            ctx.globalAlpha = 0.8;
            rr(mx, shelfY + 17, 14, 10, 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            // Cross on box
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(mx + 5, shelfY + 19, 4, 1);
            ctx.fillRect(mx + 6, shelfY + 18, 2, 3);
          }
        }

        // ── Pharmacy counter (center) ───────────────────
        ctx.fillStyle = "#E0F0FF";
        ctx.strokeStyle = "#88AACC";
        ctx.lineWidth = 2;
        rr(cx - 60, midY - 10, 120, 36, 4);
        ctx.fill();
        ctx.stroke();

        // Counter top (clean white)
        ctx.fillStyle = "#F8FCFF";
        ctx.fillRect(cx - 58, midY - 8, 116, 8);

        // Cash register
        ctx.fillStyle = "#2a3a4a";
        rr(cx + 20, midY - 6, 28, 20, 2);
        ctx.fill();
        ctx.fillStyle = "#66BBFF";
        ctx.fillRect(cx + 24, midY - 2, 20, 10);
        ctx.fillStyle = "#AADDFF";
        ctx.font = "bold 5px monospace";
        ctx.textAlign = "center";
        ctx.fillText("$$$", cx + 34, midY + 4);

        // Prescription pad on counter
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(cx - 40, midY - 4, 24, 18);
        ctx.fillStyle = "#88AACC";
        for (let li = 0; li < 4; li++) {
          ctx.fillRect(cx - 38, midY + li * 4, 20, 1);
        }
        ctx.fillStyle = "#6688AA";
        ctx.font = "bold 4px monospace";
        ctx.fillText("Rx", cx - 28, midY + 2);

        // ── Pharmacist in white lab coat ────────────────
        const pharmacistX = cx;
        const pharmacistY = midY - 40;
        const breathe = Math.sin(t * 1.2) * 1;
        const sway = Math.sin(t * 0.5) * 0.5;

        ctx.save();
        ctx.translate(pharmacistX + sway, pharmacistY);

        // Shadow
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(2, 50, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Legs (dark pants)
        ctx.fillStyle = "#2a3a4a";
        ctx.fillRect(-6, 32, 5, 16);
        ctx.fillRect(1, 32, 5, 16);

        // Shoes
        ctx.fillStyle = "#1a2530";
        ctx.fillRect(-8, 46, 7, 5);
        ctx.fillRect(1, 46, 7, 5);

        // Body (white lab coat)
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.roundRect(-14, 2 + breathe * 0.3, 28, 32, 3);
        ctx.fill();
        // Coat buttons
        ctx.fillStyle = "#CCDDEE";
        ctx.beginPath();
        ctx.arc(0, 12 + breathe * 0.3, 2, 0, Math.PI * 2);
        ctx.arc(0, 20 + breathe * 0.3, 2, 0, Math.PI * 2);
        ctx.arc(0, 28 + breathe * 0.3, 2, 0, Math.PI * 2);
        ctx.fill();

        // Lab coat collar
        ctx.fillStyle = "#EEFFFF";
        ctx.beginPath();
        ctx.moveTo(-10, 4 + breathe * 0.3);
        ctx.lineTo(0, 10 + breathe * 0.3);
        ctx.lineTo(10, 4 + breathe * 0.3);
        ctx.lineTo(8, 2 + breathe * 0.3);
        ctx.lineTo(0, 6 + breathe * 0.3);
        ctx.lineTo(-8, 2 + breathe * 0.3);
        ctx.closePath();
        ctx.fill();

        // Shirt underneath (light blue)
        ctx.fillStyle = "#DDEEFF";
        ctx.beginPath();
        ctx.moveTo(-4, 6 + breathe * 0.3);
        ctx.lineTo(0, 12 + breathe * 0.3);
        ctx.lineTo(4, 6 + breathe * 0.3);
        ctx.closePath();
        ctx.fill();

        // Arms (lab coat sleeves)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(-18, 6 + breathe * 0.3, 5, 18);
        ctx.fillRect(13, 6 + breathe * 0.3, 5, 18);

        // Hands (holding clipboard)
        ctx.fillStyle = "#E8D4C4";
        ctx.beginPath();
        ctx.arc(-15.5, 26 + breathe * 0.3, 4, 0, Math.PI * 2);
        ctx.arc(15.5, 26 + breathe * 0.3, 4, 0, Math.PI * 2);
        ctx.fill();

        // Clipboard in left hand
        ctx.fillStyle = "#3a4a5a";
        ctx.fillRect(-22, 18 + breathe * 0.3, 10, 14);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(-21, 19 + breathe * 0.3, 8, 11);
        ctx.fillStyle = "#88AACC";
        ctx.fillRect(-20, 21 + breathe * 0.3, 6, 1);
        ctx.fillRect(-20, 24 + breathe * 0.3, 6, 1);
        ctx.fillRect(-20, 27 + breathe * 0.3, 4, 1);

        // Neck
        ctx.fillStyle = "#E8D4C4";
        ctx.fillRect(-3, -4, 6, 7);

        // Head
        ctx.fillStyle = "#EEDDCC";
        ctx.beginPath();
        ctx.ellipse(0, -12 + breathe * 0.2, 10, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.beginPath();
        ctx.ellipse(-10, -12 + breathe * 0.2, 2, 3, 0, 0, Math.PI * 2);
        ctx.ellipse(10, -12 + breathe * 0.2, 2, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hair (professional, neat)
        ctx.fillStyle = "#554433";
        ctx.beginPath();
        ctx.ellipse(0, -20 + breathe * 0.2, 9, 5, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(-9, -18 + breathe * 0.2, 18, 5);

        // Eyes
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.ellipse(-4, -12 + breathe * 0.2, 3, 2.5, 0, 0, Math.PI * 2);
        ctx.ellipse(4, -12 + breathe * 0.2, 3, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pupils
        ctx.fillStyle = "#4477AA";
        ctx.beginPath();
        ctx.arc(-4, -12 + breathe * 0.2, 1.2, 0, Math.PI * 2);
        ctx.arc(4, -12 + breathe * 0.2, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Glasses
        ctx.strokeStyle = "#6688AA";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(-4, -12 + breathe * 0.2, 4.5, 3.5, 0, 0, Math.PI * 2);
        ctx.ellipse(4, -12 + breathe * 0.2, 4.5, 3.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Bridge
        ctx.beginPath();
        ctx.moveTo(-0.5, -12 + breathe * 0.2);
        ctx.lineTo(0.5, -12 + breathe * 0.2);
        ctx.stroke();

        // Nose (subtle)
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -10 + breathe * 0.2);
        ctx.lineTo(0, -6 + breathe * 0.2);
        ctx.stroke();

        // Friendly smile
        ctx.strokeStyle = "#AA8877";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -6 + breathe * 0.2, 3, 0.2, Math.PI - 0.2);
        ctx.stroke();

        // Name badge
        ctx.fillStyle = "#4488AA";
        ctx.fillRect(8, 8 + breathe * 0.3, 14, 10);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 4px monospace";
        ctx.textAlign = "center";
        ctx.fillText("DR.", 15, 13 + breathe * 0.3);
        ctx.fillText("SNOW", 15, 17 + breathe * 0.3);

        // Stethoscope around neck
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 6 + breathe * 0.3, 8, 0.3, Math.PI - 0.3);
        ctx.stroke();
        // Stethoscope ends
        ctx.fillStyle = "#444";
        ctx.beginPath();
        ctx.arc(-6, 10 + breathe * 0.3, 3, 0, Math.PI * 2);
        ctx.fill();

        // Label above
        ctx.fillStyle = "#AADDFF";
        ctx.shadowColor = "#66BBFF";
        ctx.shadowBlur = 8;
        ctx.font = "bold 7px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("DR. SNOW", 0, -30 + breathe * 0.2);
        ctx.shadowBlur = 0;

        ctx.restore();

        // ── Display cases (right side) ──────────────────
        const displayItems = [
          { x: W * 0.68, y: topY + 24, label: "COLD MEDS", color: "#66BBFF" },
          { x: W * 0.84, y: topY + 24, label: "VITAMINS", color: "#FFAA55" },
          { x: W * 0.68, y: topY + 68, label: "BANDAGES", color: "#FFFFFF" },
          { x: W * 0.84, y: topY + 68, label: "FIRST AID", color: "#FF6666" },
        ];
        for (const item of displayItems) {
          ctx.fillStyle = "#E8F4FF";
          ctx.strokeStyle = "#AACCDD";
          ctx.lineWidth = 1.5;
          rr(item.x - 26, item.y - 14, 52, 36, 4);
          ctx.fill();
          ctx.stroke();

          // Item inside
          ctx.fillStyle = item.color;
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.ellipse(item.x, item.y + 2, 14, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;

          // Cross on medical items
          if (item.label === "FIRST AID") {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(item.x - 1, item.y - 3, 2, 10);
            ctx.fillRect(item.x - 4, item.y, 8, 2);
          }

          // Label
          ctx.fillStyle = "#446688";
          ctx.font = "bold 5px monospace";
          ctx.textAlign = "center";
          ctx.fillText(item.label, item.x, item.y + 18);
        }

        // ── Pharmacy cross emblem (wall) ────────────────
        const crossX2 = W * 0.76;
        const crossY2 = midY + 30;
        ctx.fillStyle = "#22AA66";
        ctx.shadowColor = "#44DD88";
        ctx.shadowBlur = 12;
        ctx.fillRect(crossX2 - 3, crossY2 - 12, 6, 24);
        ctx.fillRect(crossX2 - 12, crossY2 - 3, 24, 6);
        ctx.shadowBlur = 0;

        // ── Waiting chairs (bottom) ─────────────────────
        for (let ci = 0; ci < 3; ci++) {
          const chairX = cx - 60 + ci * 60;
          const chairY = midY + 50;
          ctx.fillStyle = "#DDEEFF";
          ctx.strokeStyle = "#AABBCC";
          ctx.lineWidth = 1;
          rr(chairX - 12, chairY, 24, 16, 3);
          ctx.fill();
          ctx.stroke();
          // Back
          ctx.fillStyle = "#CCDDEF";
          rr(chairX - 10, chairY - 12, 20, 14, 3);
          ctx.fill();
          ctx.stroke();
        }

        // ── Ice/frost particles ─────────────────────────
        for (let pi = 0; pi < 6; pi++) {
          const px2 = W * 0.15 + (t * 10 + pi * 55) % (W * 0.7);
          const py2 = topY + 30 + Math.sin(t * 0.8 + pi * 2) * 25 + pi * 10;
          const alpha = Math.sin(t * 1.5 + pi) * 0.2 + 0.35;
          ctx.fillStyle = `rgba(180,220,255,${alpha})`;
          ctx.beginPath();
          ctx.arc(px2, py2, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

      } else {
        // ── Default pharmacy (non-galactica) ────────────
        const mC = ["#FF4444","#4444FF","#44FF44","#FFAA44","#FF44FF","#44FFFF"];
        for (let row = 0; row < 2; row++) {
          const sy2 = topY + 6 + row * 38;
          ctx.fillStyle = "#EEEEFF";
          ctx.strokeStyle = "#AAAACC";
          ctx.lineWidth = 1;
          ctx.fillRect(cx - W * 0.4, sy2, W * 0.8, 30);
          ctx.fillStyle = "#CCCCEE";
          ctx.fillRect(cx - W * 0.4, sy2 + 13, W * 0.8, 3);
          ctx.fillRect(cx - W * 0.4, sy2 + 25, W * 0.8, 3);
          for (let pi = 0; pi < 10; pi++) {
            const px3 = cx - W * 0.38 + pi * ((W * 0.76) / 10);
            ctx.fillStyle = mC[pi % mC.length];
            const bh = 6 + (pi % 3) * 3;
            ctx.fillRect(px3, sy2 + 2, (W * 0.76) / 10 - 2, bh);
            ctx.fillRect(px3, sy2 + 15, (W * 0.76) / 10 - 2, bh - 2);
          }
        }
        // ── Counter + cross ─────────────────────────────
        ctx.fillStyle = "#EEEEFF";
        ctx.strokeStyle = "#4488FF";
        ctx.lineWidth = 1.5;
        rr(cx - 46, midY + 2, 92, 26, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#22CC44";
        ctx.shadowColor = "#22FF66";
        ctx.shadowBlur = 12;
        ctx.fillRect(cx - 4, midY - 18, 8, 20);
        ctx.fillRect(cx - 10, midY - 12, 20, 8);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#111118";
        ctx.fillRect(cx + 18, midY + 4, 22, 16);
        ctx.fillStyle = "#003322";
        ctx.fillRect(cx + 20, midY + 6, 18, 12);
      } // end default pharmacy
    } else if (type === 6) {
      // GYM
      if (!!this.map?.config?.zombie) {
        // ═══ ZOMBIE: SURVIVOR FORTRESS ═══
        const t=performance.now()/1000;
        ctx.fillStyle="rgba(0,50,0,0.9)"; rr(W/2-100,room.S-22,200,26,5); ctx.fill();
        ctx.strokeStyle=`rgba(44,200,44,${0.6+0.3*Math.sin(t*2)})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#AAFFAA"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
        ctx.fillText("☠ SURVIVOR FORTRESS", W/2, room.S-9);
        // Barricaded windows (left/right walls — stacked weights/benches)
        for (const [bx3,by3,bw3,bh3] of [[14,H*0.28,50,H*0.55],[W-64,H*0.28,50,H*0.55]]) {
          ctx.fillStyle="#0a1800"; rr(bx3,by3,bw3,bh3,4); ctx.fill();
          ctx.strokeStyle="rgba(44,120,44,0.5)"; ctx.lineWidth=1; ctx.stroke();
          // planks/barricade stripes
          for (let pi=0;pi<4;pi++) { ctx.fillStyle=pi%2===0?"rgba(20,60,20,0.5)":"rgba(0,30,0,0.4)"; ctx.fillRect(bx3+2,by3+12+pi*28,bw3-4,12); }
          ctx.fillStyle="rgba(44,200,44,0.6)"; ctx.font="bold 5px monospace"; ctx.textAlign="center"; ctx.fillText("SAFE", bx3+bw3/2, by3-6);
        }
        // Treadmill as weapon stand
        ctx.fillStyle="#0d1a0d"; rr(cx-W*0.38,topY+8,55,56,3); ctx.fill();
        ctx.strokeStyle="rgba(44,160,44,0.4)"; ctx.lineWidth=1; ctx.stroke();
        for (let wi=0;wi<3;wi++) { ctx.fillStyle="rgba(140,60,0,0.7)"; ctx.fillRect(cx-W*0.35,topY+14+wi*14,40,8); }// bats/pipes
        ctx.fillStyle="rgba(44,160,44,0.5)"; ctx.font="5px monospace"; ctx.textAlign="center"; ctx.fillText("WEAPONS", cx-W*0.38+27,topY+72);
        // Sleeping mats (survivors rest area)
        for (let mi=0;mi<3;mi++) {
          ctx.fillStyle="#0a1200"; rr(cx-40+mi*55,midY+20,48,22,3); ctx.fill();
          ctx.strokeStyle="rgba(44,100,44,0.4)"; ctx.lineWidth=1; ctx.stroke();
          ctx.fillStyle=["rgba(44,100,44,0.4)","rgba(100,40,0,0.4)","rgba(0,80,80,0.4)"][mi];
          ctx.fillRect(cx-38+mi*55,midY+22,44,18);
        }
        // Supply crate (top-right)
        ctx.fillStyle="#0d1a08"; rr(W*0.68,topY+12,64,64,4); ctx.fill();
        ctx.strokeStyle="rgba(80,140,40,0.5)"; ctx.lineWidth=1.5; ctx.stroke();
        ctx.strokeStyle="rgba(60,100,30,0.4)"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(W*0.68,topY+44); ctx.lineTo(W*0.68+64,topY+44); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W*0.68+32,topY+12); ctx.lineTo(W*0.68+32,topY+76); ctx.stroke();
        ctx.fillStyle="rgba(100,160,40,0.7)"; ctx.font="bold 5px monospace"; ctx.textAlign="center";
        ctx.fillText("SUPPLIES", W*0.68+32, topY+88);
        // Blood marks on floor (fight happened here)
        for (const [px6,py6] of [[W*0.38,H*0.55],[W*0.6,H*0.68],[W*0.45,H*0.75]]) {
          ctx.fillStyle="rgba(140,8,8,0.22)"; ctx.beginPath(); ctx.ellipse(px6,py6,14,8,px6*0.01,0,Math.PI*2); ctx.fill();
        }
      } else {
      // ── Treadmills (left) ────────────────────────
      for (let i = 0; i < 2; i++) {
        const tx2 = cx - W * 0.38,
          ty2 = topY + 8 + i * 62;
        ctx.fillStyle = "#1a1a2a";
        ctx.strokeStyle = "#FF4422";
        ctx.lineWidth = 1.5;
        rr(tx2, ty2, 56, 40, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#333344";
        ctx.fillRect(tx2 + 4, ty2 + 16, 48, 14);
        ctx.fillStyle = "#FF4422";
        ctx.fillRect(tx2 + 4, ty2 + 16, 48, 4);
        ctx.fillStyle = "#222";
        ctx.fillRect(tx2 + 10, ty2 + 4, 30, 12);
        ctx.fillStyle = "#FF4422";
        ctx.fillRect(tx2 + 12, ty2 + 5, 26, 10);
        ctx.strokeStyle = "#888";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx2 + 2, ty2 + 4);
        ctx.lineTo(tx2 + 2, ty2 + 16);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tx2 + 54, ty2 + 4);
        ctx.lineTo(tx2 + 54, ty2 + 16);
        ctx.stroke();
      }
      // ── Weight rack (right) ──────────────────────
      const wrx = cx + W * 0.08,
        wry = topY + 6;
      ctx.fillStyle = "#2a2a2a";
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 1;
      ctx.fillRect(wrx, wry, 16, 84);
      for (let ri = 0; ri < 3; ri++) {
        ctx.fillStyle = "#888";
        ctx.fillRect(wrx - 2, wry + 8 + ri * 26, 20, 4);
        const pC2 = ["#FF3333", "#3333FF", "#33FF33", "#FFAA33"];
        for (let pi = 0; pi < 3; pi++) {
          const pw = 8 + ri * 4;
          ctx.fillStyle = pC2[(ri + pi) % 4];
          ctx.beginPath();
          ctx.ellipse(
            wrx + 8 + (pi - 1) * (pw + 5),
            wry + 12 + ri * 26,
            pw / 2,
            11,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
      // ── Bench press (center-right) ───────────────
      const bpx = cx + W * 0.1,
        bpy = midY - 4;
      ctx.fillStyle = "#2a2a30";
      ctx.strokeStyle = "#444455";
      ctx.lineWidth = 1;
      rr(bpx, bpy, 62, 20, 3);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#AAAAAA";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bpx - 16, bpy - 9);
      ctx.lineTo(bpx + 78, bpy - 9);
      ctx.stroke();
      ctx.fillStyle = "#FF3333";
      ctx.fillRect(bpx - 16, bpy - 17, 12, 16);
      ctx.fillRect(bpx + 66, bpy - 17, 12, 16);
      // Exercise mat
      ctx.fillStyle = "#1a3a1a";
      ctx.strokeStyle = "#2a6a2a";
      ctx.lineWidth = 1;
      rr(cx - W * 0.4, midY + 30, W * 0.32, 22, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2a5a2a";
      for (let mi = 0; mi < 4; mi++)
        ctx.fillRect(cx - W * 0.4 + mi * ((W * 0.32) / 4), midY + 30, 2, 22);
      } // end gym default
    } else if (type === 7) {
      // BANK
      if (!!this.map?.config?.zombie) {
        // ═══ ZOMBIE: LOOTED VAULT ═══
        const t=performance.now()/1000;
        ctx.fillStyle="rgba(30,20,0,0.9)"; rr(W/2-90,room.S-22,180,26,5); ctx.fill();
        ctx.strokeStyle=`rgba(220,180,0,${0.6+0.3*Math.sin(t*2)})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#FFEEAA"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
        ctx.fillText("☠  LOOTED VAULT  ☠", W/2, room.S-9);
        // Blown-open vault door (left, massive)
        ctx.fillStyle="#141400"; rr(14,topY+10,56,120,4); ctx.fill();
        ctx.strokeStyle="rgba(160,140,0,0.5)"; ctx.lineWidth=2; ctx.stroke();
        // Blast damage marks
        ctx.fillStyle="rgba(80,60,0,0.3)"; ctx.beginPath(); ctx.arc(42,topY+70,28,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle="rgba(200,160,0,0.4)"; ctx.lineWidth=0.8;
        for (let vi=0;vi<6;vi++) {
          const va=vi*1.05; ctx.beginPath(); ctx.moveTo(42,topY+70); ctx.lineTo(42+Math.cos(va)*34,topY+70+Math.sin(va)*34); ctx.stroke();
        }
        ctx.fillStyle="rgba(200,160,0,0.6)"; ctx.font="bold 7px monospace"; ctx.textAlign="center"; ctx.fillText("VAULT", 42,topY+130);
        // Scattered money/valuables on floor
        for (const [mx2,my2] of [[W*0.3,H*0.40],[W*0.45,H*0.48],[W*0.6,H*0.52],[W*0.35,H*0.62],[W*0.7,H*0.58],[W*0.5,H*0.70],[W*0.25,H*0.68]]) {
          ctx.fillStyle=`rgba(44,${140+Math.floor(Math.random()*80)},0,0.3)`;
          rr(mx2,my2,18,8,2); ctx.fill();
          ctx.strokeStyle="rgba(44,160,0,0.2)"; ctx.lineWidth=0.5; ctx.stroke();
        }
        // Teller windows (smashed)
        for (let i=0;i<3;i++) {
          const twx=cx-70+i*58, twy=topY+14;
          ctx.fillStyle="#0d0d00"; rr(twx,twy,40,42,3); ctx.fill();
          ctx.strokeStyle="rgba(120,100,0,0.4)"; ctx.lineWidth=1; ctx.stroke();
          ctx.strokeStyle="rgba(80,80,80,0.5)"; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(twx+8,twy+2); ctx.lineTo(twx+26,twy+42); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(twx+32,twy+4); ctx.lineTo(twx+14,twy+40); ctx.stroke();
        }
        // Safe deposit boxes (right wall — all broken open)
        ctx.fillStyle="#0d0d08"; rr(W*0.65,H*0.28,W*0.28,H*0.42,4); ctx.fill();
        ctx.strokeStyle="rgba(140,120,0,0.4)"; ctx.lineWidth=1; ctx.stroke();
        for (let row=0;row<4;row++) for (let col=0;col<3;col++) {
          const bx4=W*0.66+col*W*0.09, by4=H*0.30+row*H*0.09;
          ctx.fillStyle=Math.random()>0.5?"rgba(0,0,0,0.8)":"rgba(20,18,0,0.9)";
          rr(bx4,by4,W*0.085,H*0.07,2); ctx.fill();
          ctx.strokeStyle="rgba(100,80,0,0.3)"; ctx.lineWidth=0.5; ctx.stroke();
          // Pried/open
          if ((row+col)%2===0) { ctx.fillStyle="rgba(0,0,0,0.95)"; ctx.fillRect(bx4+2,by4+2,W*0.085-4,H*0.07-4); }
        }
        // Blood trail leading to vault
        ctx.fillStyle="rgba(140,8,8,0.18)"; ctx.beginPath(); ctx.ellipse(W*0.38,H*0.56,30,8,0.1,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(W*0.28,H*0.62,16,5,0.2,0,Math.PI*2); ctx.fill();
      } else {
      // ── 3 teller windows ─────────────────────────
      for (let i = 0; i < 3; i++) {
        const twx = cx - 76 + i * 52,
          twy = topY + 4;
        ctx.fillStyle = "#2a2a3a";
        ctx.strokeStyle = "#FFCC44";
        ctx.lineWidth = 1.5;
        rr(twx, twy, 44, 54, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(100,200,255,0.15)";
        ctx.fillRect(twx + 2, twy + 2, 40, 36);
        ctx.strokeStyle = "rgba(100,200,255,0.45)";
        ctx.lineWidth = 1;
        ctx.strokeRect(twx + 2, twy + 2, 40, 36);
        ctx.fillStyle = "#FFDD88";
        ctx.beginPath();
        ctx.arc(twx + 22, twy + 14, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3a4a5a";
        ctx.fillRect(twx + 13, twy + 21, 18, 14);
        ctx.fillStyle = "#FFCC44";
        ctx.fillRect(twx + 9, twy + 40, 26, 3);
        ctx.font = "bold 5px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`WIN ${i + 1}`, twx + 22, twy + 50);
      }
      // ── Velvet rope queue ─────────────────────────
      ctx.strokeStyle = "#AA2222";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 64, midY - 6);
      ctx.lineTo(cx - 64, midY + 16);
      ctx.moveTo(cx - 64, midY + 16);
      ctx.lineTo(cx + 22, midY + 16);
      ctx.moveTo(cx + 22, midY + 16);
      ctx.lineTo(cx + 22, midY - 6);
      ctx.stroke();
      for (const rpx of [cx - 64, cx + 22]) {
        ctx.fillStyle = "#FFCC44";
        ctx.shadowColor = "#FFCC44";
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(rpx, midY - 6, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rpx, midY + 16, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      // ── Vault door (right side) ───────────────────
      const vx = cx + W * 0.3,
        vy = midY - 22;
      ctx.fillStyle = "#222222";
      ctx.strokeStyle = "#888888";
      ctx.lineWidth = 2;
      rr(vx - 24, vy, 48, 58, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#444444";
      ctx.strokeStyle = "#AAAAAA";
      ctx.lineWidth = 1.5;
      rr(vx - 20, vy + 4, 40, 50, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#FFCC44";
      ctx.shadowColor = "#FFCC44";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(vx, vy + 29, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(vx, vy + 29);
      ctx.lineTo(vx + 8, vy + 24);
      ctx.stroke();
      ctx.strokeStyle = "#CCCCCC";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(vx + 12, vy + 42, 6, 0, Math.PI);
      ctx.stroke();
      ctx.fillStyle = "#CCCCCC";
      for (const [bx2, by2] of [
        [-16, 9],
        [-16, 49],
        [16, 9],
        [16, 49],
      ]) {
        ctx.beginPath();
        ctx.arc(vx + bx2, vy + by2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      } // end bank default
    } else if (type === 8) {
      // NIGHTCLUB
      if (!!this.map?.config?.galactica || !!this.map?.config?.blitz) {
        // ═══ GALACTICA / BLITZ: GALAXY CLUB ═══
        const t = performance.now() / 1000;
        const PURP = "#CC44FF", PINK = "#FF44CC", CYAN = "#44DDFF",
              GOLD = "#FFDD44", HOT  = "#FF2299", BLUE = "#4455FF";

        // ── SPACE FLOOR (same cosmic tiles as room) ──
        for (let ty2 = 0; ty2 < room.H; ty2++) {
          for (let tx2 = 0; tx2 < room.W; tx2++) {
            if (room.layout[ty2][tx2] !== 0) continue;
            const px2 = tx2 * room.S, py2 = ty2 * room.S;
            ctx.fillStyle = (tx2 + ty2) % 2 === 0 ? "#06031e" : "#040118";
            ctx.fillRect(px2, py2, room.S, room.S);
            ctx.strokeStyle = "rgba(120,60,200,0.06)";
            ctx.lineWidth = 1;
            ctx.strokeRect(px2, py2, room.S, room.S);
          }
        }

        // ── ROOM BORDER ──
        ctx.strokeStyle = HOT;
        ctx.lineWidth = 2;
        ctx.shadowColor = HOT;
        ctx.shadowBlur = 18;
        ctx.strokeRect(room.S + 2, room.S + 2, W - room.S * 2 - 4, H - room.S * 2 - 4);
        ctx.shadowBlur = 0;

        // ── TITLE SIGN ──
        ctx.save();
        ctx.font = "bold 22px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.shadowColor = PINK;
        ctx.shadowBlur = 30;
        ctx.fillText("✦  GALAXY CLUB  ✦", W / 2, room.S - 18);
        ctx.shadowBlur = 0;
        ctx.restore();

        // ── TOP ACCENT BAR ──
        const tg = ctx.createLinearGradient(0, room.S, W, room.S);
        tg.addColorStop(0,   "rgba(255,68,204,0)");
        tg.addColorStop(0.5, "rgba(255,68,204,0.6)");
        tg.addColorStop(1,   "rgba(255,68,204,0)");
        ctx.fillStyle = tg;
        ctx.fillRect(room.S, room.S, W - room.S * 2, 4);

        // ── DJ BOOTH (top-center, large + detailed) ──
        const djX = W / 2 - 110, djY = room.S * 1.1, djW = 220, djH = 54;
        // Booth body
        ctx.fillStyle = "#110020";
        ctx.strokeStyle = PURP;
        ctx.lineWidth = 2;
        ctx.shadowColor = PURP;
        ctx.shadowBlur = 14;
        rr(djX, djY, djW, djH, 8);
        ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        // Booth top strip
        const djG = ctx.createLinearGradient(djX, 0, djX + djW, 0);
        djG.addColorStop(0, PINK + "00");
        djG.addColorStop(0.5, PINK + "BB");
        djG.addColorStop(1, PINK + "00");
        ctx.fillStyle = djG;
        ctx.fillRect(djX + 4, djY, djW - 8, 4);
        // Turntable L
        const tt = (t * 1.2) % (Math.PI * 2);
        for (const [tx2, sign] of [[djX + 42, 1], [djX + djW - 42, -1]]) {
          ctx.fillStyle = "#0a001a";
          ctx.strokeStyle = PURP + "88";
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(tx2, djY + 28, 24, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
          // Vinyl grooves
          for (let gr = 1; gr <= 4; gr++) {
            ctx.strokeStyle = `rgba(160,80,255,${0.1 + gr * 0.06})`;
            ctx.beginPath(); ctx.arc(tx2, djY + 28, gr * 5, 0, Math.PI * 2);
            ctx.stroke();
          }
          // Label sticker
          ctx.fillStyle = PINK;
          ctx.beginPath(); ctx.arc(tx2, djY + 28, 6, 0, Math.PI * 2);
          ctx.fill();
          // Rotation arm
          ctx.strokeStyle = "#888";
          ctx.lineWidth = 2;
          ctx.save(); ctx.translate(tx2, djY + 28); ctx.rotate(tt * sign);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(22, -6); ctx.stroke();
          ctx.fillStyle = "#aaa"; ctx.beginPath(); ctx.arc(22, -6, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        // Mixer — animated EQ bars
        const eqColors = [CYAN, PURP, PINK, HOT, GOLD, BLUE, CYAN, PURP];
        for (let ei = 0; ei < 8; ei++) {
          const bh = 8 + Math.sin(t * 8 + ei * 0.9) * 14;
          ctx.fillStyle = eqColors[ei];
          ctx.shadowColor = eqColors[ei];
          ctx.shadowBlur = 6;
          ctx.fillRect(djX + 80 + ei * 8, djY + djH - 6 - bh, 6, bh);
        }
        ctx.shadowBlur = 0;
        // "DJ" label
        ctx.fillStyle = PINK;
        ctx.shadowColor = PINK;
        ctx.shadowBlur = 10;
        ctx.font = "bold 9px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("⬡ GALAXY MIX ⬡", W / 2, djY + djH + 14);
        ctx.shadowBlur = 0;

        // ── SPEAKERS — left & right of DJ booth ──
        for (const [spX, spY] of [[djX - 50, djY - 4], [djX + djW + 24, djY - 4]]) {
          ctx.fillStyle = "#0a0018";
          ctx.strokeStyle = PURP + "88";
          ctx.lineWidth = 1.5;
          rr(spX, spY, 32, 56, 5);
          ctx.fill(); ctx.stroke();
          // Woofer rings
          for (let ri = 0; ri < 4; ri++) {
            const rp = Math.sin(t * 6 + ri) * 0.5 + 0.5;
            ctx.strokeStyle = `rgba(160,80,255,${0.2 + rp * 0.5})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(spX + 16, spY + 20, 4 + ri * 3, 0, Math.PI * 2);
            ctx.stroke();
          }
          // Tweeter
          ctx.fillStyle = PURP;
          ctx.shadowColor = PURP;
          ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(spX + 16, spY + 44, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // ── DANCE FLOOR (center of room, animated tiles) ──
        const dfCols = 8, dfRows = 5;
        const dfW2 = W * 0.62, dfH2 = H * 0.32;
        const dfX = W / 2 - dfW2 / 2, dfY2 = H * 0.40;
        const tw = dfW2 / dfCols, th2 = dfH2 / dfRows;
        const tileColors = [HOT, PURP, CYAN, PINK, BLUE, GOLD, "#44FFAA", PINK];
        for (let tr = 0; tr < dfRows; tr++) {
          for (let tc = 0; tc < dfCols; tc++) {
            const seed = tc * 3 + tr * 7;
            const phase = Math.sin(t * 4 + seed * 1.1) * 0.5 + 0.5;
            const col = tileColors[(tc + tr + Math.floor(t * 2)) % tileColors.length];
            // Tile base
            ctx.fillStyle = `rgba(8,0,20,0.9)`;
            ctx.fillRect(dfX + tc * tw + 1, dfY2 + tr * th2 + 1, tw - 2, th2 - 2);
            // Lit tile
            ctx.fillStyle = col + Math.floor(phase * 80 + 20).toString(16).padStart(2, "0");
            ctx.fillRect(dfX + tc * tw + 1, dfY2 + tr * th2 + 1, tw - 2, th2 - 2);
            // Border glow
            ctx.strokeStyle = col + Math.floor(phase * 180 + 40).toString(16).padStart(2, "0");
            ctx.lineWidth = 1;
            ctx.strokeRect(dfX + tc * tw + 1, dfY2 + tr * th2 + 1, tw - 2, th2 - 2);
            // Shine
            ctx.fillStyle = `rgba(255,255,255,${0.04 + phase * 0.06})`;
            ctx.fillRect(dfX + tc * tw + 2, dfY2 + tr * th2 + 2, tw / 2, th2 / 2);
          }
        }
        // Dance floor label
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.font = "bold 7px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("DANCE FLOOR", W / 2, dfY2 + dfH2 + 12);

        // ── DANCERS on the dance floor ──
        const dancerDefs = [
          { x: W * 0.25, y: H * 0.50, color: PINK,  gender: "f", skin: "#F0C080", hair: "#AA5522" },
          { x: W * 0.38, y: H * 0.53, color: CYAN,  gender: "m", skin: "#DDAA88", hair: "#1a1a1a" },
          { x: W * 0.50, y: H * 0.50, color: GOLD,  gender: "f", skin: "#FFDDBB", hair: "#441100" },
          { x: W * 0.62, y: H * 0.53, color: PURP,  gender: "m", skin: "#D4956A", hair: "#2a1a00" },
          { x: W * 0.75, y: H * 0.50, color: HOT,   gender: "f", skin: "#EECCAA", hair: "#1a002a" },
        ];
        for (const d of dancerDefs) {
          const bounce   = Math.sin(t * 4 + d.x * 0.05) * 5;
          const armSwing = Math.sin(t * 4 + d.x * 0.05) * 18;
          const stepL    = Math.sin(t * 4 + d.x) * 5;
          ctx.save();
          ctx.translate(d.x, d.y + bounce);

          // Shadow
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.beginPath(); ctx.ellipse(0, 22, 9, 3, 0, 0, Math.PI * 2); ctx.fill();

          // Legs with shoes
          const legColor = d.gender === "f" ? "#1a0030" : "#0a1a2a";
          ctx.fillStyle = legColor;
          ctx.beginPath(); ctx.roundRect(-8, 10, 5, 12 + stepL, 1); ctx.fill();
          ctx.beginPath(); ctx.roundRect(3,  10, 5, 12 - stepL, 1); ctx.fill();
          // Shoes
          ctx.fillStyle = d.gender === "f" ? d.color + "AA" : "#222";
          ctx.beginPath(); ctx.ellipse(-5, 22 + stepL, 5, 2, 0, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(5,  22 - stepL, 5, 2, 0, 0, Math.PI*2); ctx.fill();

          // Body / outfit
          ctx.fillStyle = d.color + "CC";
          ctx.shadowColor = d.color; ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.roundRect(d.gender === "f" ? -8 : -7, -8, d.gender === "f" ? 16 : 14, 20, 3);
          ctx.fill(); ctx.shadowBlur = 0;
          if (d.gender === "f") {
            // Dress flare
            ctx.fillStyle = d.color + "88";
            ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(-13, 22); ctx.lineTo(13, 22); ctx.lineTo(8, 8); ctx.closePath(); ctx.fill();
            // Dress waist detail
            ctx.strokeStyle = d.color + "FF"; ctx.lineWidth = 1.5; ctx.shadowColor = d.color; ctx.shadowBlur = 4;
            ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(8, 4); ctx.stroke(); ctx.shadowBlur = 0;
          } else {
            // Shirt collar
            ctx.fillStyle = d.skin;
            ctx.beginPath(); ctx.moveTo(-3,-8); ctx.lineTo(0,-4); ctx.lineTo(3,-8); ctx.fill();
          }

          // Arms (swinging)
          ctx.strokeStyle = d.skin; ctx.lineWidth = 4; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(-14 - armSwing * 0.3, 6); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(7, -4); ctx.lineTo(14 + armSwing * 0.3, 2); ctx.stroke();
          // Hands
          ctx.fillStyle = d.skin;
          ctx.beginPath(); ctx.arc(-14 - armSwing * 0.3, 6, 3, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(14 + armSwing * 0.3, 2, 3, 0, Math.PI*2); ctx.fill();
          ctx.lineCap = "butt";

          // Neck
          ctx.fillStyle = d.skin;
          ctx.fillRect(-3, -9, 6, 5);

          // Head
          ctx.beginPath(); ctx.arc(0, -16, 9, 0, Math.PI * 2); ctx.fill();

          // Hair
          ctx.fillStyle = d.hair;
          if (d.gender === "f") {
            ctx.beginPath(); ctx.arc(0, -20, 8, Math.PI, 0); ctx.fill();
            ctx.fillRect(-9, -21, 5, 14);
            ctx.fillRect(4,  -21, 5, 14);
          } else {
            ctx.beginPath(); ctx.arc(0, -21, 7, Math.PI * 1.1, Math.PI * 1.9); ctx.fill();
            ctx.fillRect(-6, -21, 12, 6);
          }

          // Eyes — white + iris + glowing neon tint
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.ellipse(-3.5, -17, 2.2, 1.8, 0, 0, Math.PI*2);
          ctx.ellipse( 3.5, -17, 2.2, 1.8, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = d.color; ctx.shadowColor = d.color; ctx.shadowBlur = 3;
          ctx.beginPath();
          ctx.arc(-3.5, -17, 1.2, 0, Math.PI*2);
          ctx.arc( 3.5, -17, 1.2, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
          // Pupil
          ctx.fillStyle = "#000";
          ctx.beginPath(); ctx.arc(-3.5, -17, 0.5, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc( 3.5, -17, 0.5, 0, Math.PI*2); ctx.fill();

          // Eyebrows
          ctx.strokeStyle = d.hair; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(-6, -20); ctx.lineTo(-2, -21); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(2, -21); ctx.lineTo(6, -20); ctx.stroke();

          // Nose
          ctx.fillStyle = "rgba(0,0,0,0.18)";
          ctx.beginPath(); ctx.arc(0, -14, 1.2, 0, Math.PI*2); ctx.fill();

          // Mouth — smiling, animated
          const mOpen = Math.abs(Math.sin(t * 4 + d.x)) * 2;
          ctx.strokeStyle = d.gender === "f" ? "#EE4466" : "#AA6644"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(0, -11, 3, 0.1, Math.PI - 0.1); ctx.stroke();
          if (mOpen > 0.5) {
            ctx.fillStyle = "#441122"; ctx.beginPath();
            ctx.arc(0, -10, mOpen, 0, Math.PI); ctx.fill();
          }

          // Earrings (female)
          if (d.gender === "f") {
            ctx.fillStyle = d.color; ctx.shadowColor = d.color; ctx.shadowBlur = 4;
            ctx.beginPath(); ctx.arc(-9, -16, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc( 9, -16, 2, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
          }

          ctx.restore();
        }

        // ── STAGE / PODIUMS (left and right) ──
        for (const [pdX, pdCol] of [[W * 0.12, PINK], [W * 0.88, CYAN]]) {
          const podBounce = Math.sin(t * 3 + pdX) * 4;
          // Platform
          ctx.fillStyle = "#110025";
          ctx.strokeStyle = pdCol;
          ctx.lineWidth = 2;
          ctx.shadowColor = pdCol;
          ctx.shadowBlur = 12;
          rr(pdX - 22, H * 0.42, 44, 14, 4);
          ctx.fill(); ctx.stroke();
          ctx.shadowBlur = 0;
          // Pole dancer (realistic)
          const pdSkin = pdCol === PINK ? "#F0C080" : "#FFDDBB";
          const pdHair = pdCol === PINK ? "#220044" : "#1a002a";
          ctx.save();
          ctx.translate(pdX, H * 0.42 - 5 + podBounce);
          // Pole
          const poleG = ctx.createLinearGradient(-1, 0, 1, -50);
          poleG.addColorStop(0, "#888"); poleG.addColorStop(1, "#ccc");
          ctx.strokeStyle = poleG; ctx.lineWidth = 3;
          ctx.shadowColor = pdCol; ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -50); ctx.stroke();
          ctx.shadowBlur = 0;
          // Legs
          const pLegStep = Math.sin(t * 3 + pdX) * 6;
          ctx.fillStyle = pdCol === PINK ? "#1a0030" : "#0a0818";
          ctx.beginPath(); ctx.roundRect(-7, -20, 5, 14 + pLegStep, 1); ctx.fill();
          ctx.beginPath(); ctx.roundRect(2, -20, 5, 14 - pLegStep, 1); ctx.fill();
          // Heels
          ctx.fillStyle = pdCol + "AA";
          ctx.beginPath(); ctx.ellipse(-4, -6 + pLegStep, 5, 2, 0, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(4, -6 - pLegStep, 5, 2, 0, 0, Math.PI*2); ctx.fill();
          // Body / outfit
          ctx.fillStyle = pdCol + "CC"; ctx.shadowColor = pdCol; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.roundRect(-7, -38, 14, 20, 3); ctx.fill(); ctx.shadowBlur = 0;
          // Dress flare
          ctx.fillStyle = pdCol + "77";
          ctx.beginPath(); ctx.moveTo(-7,-20); ctx.lineTo(-11,-8); ctx.lineTo(11,-8); ctx.lineTo(7,-20); ctx.closePath(); ctx.fill();
          // Waist sparkle
          ctx.strokeStyle = pdCol; ctx.lineWidth = 1.5; ctx.shadowColor = pdCol; ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.moveTo(-7,-22); ctx.lineTo(7,-22); ctx.stroke(); ctx.shadowBlur = 0;
          // Neck
          ctx.fillStyle = pdSkin; ctx.fillRect(-3, -40, 6, 4);
          // Head
          ctx.beginPath(); ctx.arc(0, -47, 8, 0, Math.PI*2); ctx.fill();
          // Hair
          ctx.fillStyle = pdHair;
          ctx.beginPath(); ctx.arc(0, -50, 7, Math.PI, 0); ctx.fill();
          ctx.fillRect(-8, -52, 4, 12); ctx.fillRect(4, -52, 4, 12);
          // Eyes
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.ellipse(-3, -48, 2, 1.6, 0, 0, Math.PI*2);
          ctx.ellipse( 3, -48, 2, 1.6, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = pdCol; ctx.shadowColor = pdCol; ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.arc(-3, -48, 1.1, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc( 3, -48, 1.1, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
          // Lashes
          ctx.strokeStyle = "#000"; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(-5, -49.5); ctx.lineTo(-6, -51); ctx.stroke();
          ctx.beginPath(); ctx.moveTo( 5, -49.5); ctx.lineTo( 6, -51); ctx.stroke();
          // Nose
          ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.arc(0, -45.5, 1, 0, Math.PI*2); ctx.fill();
          // Mouth (smile)
          ctx.strokeStyle = "#EE4466"; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(0, -43.5, 2.5, 0.1, Math.PI-0.1); ctx.stroke();
          // Earrings
          ctx.fillStyle = pdCol; ctx.shadowColor = pdCol; ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.arc(-9, -47, 2, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc( 9, -47, 2, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
          // Arms
          ctx.strokeStyle = pdSkin; ctx.lineWidth = 3; ctx.lineCap = "round";
          const armA = Math.sin(t * 3 + pdX) * 0.4;
          ctx.beginPath(); ctx.moveTo(7, -34); ctx.lineTo(0 + Math.cos(armA) * 16, -42 + Math.sin(armA) * 8); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-7, -34); ctx.lineTo(-14, -26); ctx.stroke();
          ctx.lineCap = "butt";
          ctx.restore();
        }

        // ── NEON LASER LIGHTS ──
        for (let li = 0; li < 6; li++) {
          const angle = t * 0.7 + (li * Math.PI * 2) / 6;
          const originX = W / 2 + (li % 3 - 1) * 80;
          const originY = room.S * 1.5;
          const len = 180 + Math.sin(t * 2 + li) * 60;
          const lCol = tileColors[li % tileColors.length];
          ctx.strokeStyle = lCol + "55";
          ctx.lineWidth = 1.5;
          ctx.shadowColor = lCol;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(originX, originY);
          ctx.lineTo(originX + Math.cos(angle) * len, originY + Math.sin(angle) * len);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // ── STROBE SPOTLIGHTS on dance floor ──
        for (let si = 0; si < 3; si++) {
          const sp = Math.sin(t * 5 + si * 2) * 0.5 + 0.5;
          const sCol = [PINK, CYAN, GOLD][si];
          const sx = dfX + dfW2 * (0.2 + si * 0.3);
          const sg = ctx.createRadialGradient(sx, dfY2 + dfH2 / 2, 0, sx, dfY2 + dfH2 / 2, 60);
          sg.addColorStop(0, sCol + Math.floor(sp * 60).toString(16).padStart(2, "0"));
          sg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.arc(sx, dfY2 + dfH2 / 2, 60, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── BAR (bottom-left) ──
        const barX = room.S + 4, barY = H * 0.78, barW = W * 0.22, barH = 42;
        ctx.fillStyle = "#0e0020";
        ctx.strokeStyle = PURP;
        ctx.lineWidth = 2;
        ctx.shadowColor = PURP;
        ctx.shadowBlur = 10;
        rr(barX, barY, barW, barH, 6);
        ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        // Bar counter top
        ctx.fillStyle = "#1e0040";
        ctx.fillRect(barX, barY, barW, 6);
        // Glowing bottles
        const bColors = [HOT, PURP, CYAN, GOLD];
        for (let bi = 0; bi < 4; bi++) {
          const bc = bColors[bi];
          const bx = barX + 12 + bi * (barW - 24) / 3;
          const bp = Math.sin(t * 1.5 + bi) * 0.3 + 0.7;
          ctx.fillStyle = bc + "50";
          ctx.strokeStyle = bc;
          ctx.lineWidth = 1;
          ctx.shadowColor = bc;
          ctx.shadowBlur = 6 * bp;
          ctx.beginPath();
          ctx.moveTo(bx - 5, barY + barH - 4);
          ctx.lineTo(bx - 4, barY + 12);
          ctx.lineTo(bx - 2, barY + 8);
          ctx.lineTo(bx + 2, barY + 8);
          ctx.lineTo(bx + 4, barY + 12);
          ctx.lineTo(bx + 5, barY + barH - 4);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.shadowBlur = 0;
        }
        ctx.fillStyle = PINK;
        ctx.font = "bold 6px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("SPACE BAR", barX + barW / 2, barY + barH + 11);

        // ── VIP LOUNGE (bottom-right) ──
        const vipX = W - room.S - 4 - W * 0.22, vipY = H * 0.78;
        ctx.fillStyle = "#0e0020";
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2;
        ctx.shadowColor = GOLD;
        ctx.shadowBlur = 10;
        rr(vipX, vipY, barW, barH, 6);
        ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        // VIP sofas
        for (let vi = 0; vi < 2; vi++) {
          const vsx = vipX + 10 + vi * (barW / 2 - 8);
          ctx.fillStyle = "#2a0040";
          ctx.strokeStyle = GOLD + "88";
          ctx.lineWidth = 1;
          rr(vsx, vipY + 10, barW / 2 - 14, 24, 4);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#1a002a";
          rr(vsx, vipY + 8, barW / 2 - 14, 8, 2);
          ctx.fill();
        }
        ctx.fillStyle = GOLD;
        ctx.shadowColor = GOLD;
        ctx.shadowBlur = 8;
        ctx.font = "bold 6px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("★ VIP LOUNGE ★", vipX + barW / 2, vipY + barH + 11);
        ctx.shadowBlur = 0;

        // ── AMBIENT PARTICLES ──
        for (let pi = 0; pi < 16; pi++) {
          const px2 = (t * 18 + pi * 67) % W;
          const py2 = room.S * 2 + Math.sin(t * 1.2 + pi * 0.7) * 30 + (pi * (H * 0.7)) / 16;
          const al  = Math.sin(t * 2 + pi) * 0.3 + 0.4;
          ctx.fillStyle = tileColors[pi % tileColors.length] + Math.floor(al * 200).toString(16).padStart(2, "0");
          ctx.beginPath();
          ctx.arc(px2, py2, pi % 4 === 0 ? 2 : 1, 0, Math.PI * 2);
          ctx.fill();
        }

        // Side neon strips
        ctx.fillStyle = "rgba(255,68,204,0.25)";
        ctx.fillRect(room.S, room.S * 1.5, 3, H - room.S * 3);
        ctx.fillRect(W - room.S - 3, room.S * 1.5, 3, H - room.S * 3);

      } else if (!!this.map?.config?.zombie) {
        // ═══ ZOMBIE: DEAD RAVE ═══
        const t = performance.now() / 1000;
        // Sign
        const sg = ctx.createLinearGradient(W/2-110, 0, W/2+110, 0);
        sg.addColorStop(0,"rgba(0,60,0,0.9)"); sg.addColorStop(0.5,"rgba(0,140,0,0.95)"); sg.addColorStop(1,"rgba(0,60,0,0.9)");
        ctx.fillStyle = sg; rr(W/2-110, room.S-22, 220, 26, 5); ctx.fill();
        ctx.strokeStyle = `rgba(44,255,44,${0.7+0.3*Math.sin(t*2.2)})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#AAFFAA"; ctx.font="bold 12px monospace"; ctx.textAlign="center";
        ctx.fillText("☠  DEAD RAVE  ☠", W/2, room.S-9);
        // Cracked dance floor
        const tiles=5, tSize=Math.floor((W*0.7)/tiles);
        const dfX=cx-(tSize*tiles)/2, dfY=midY-tSize*1.5;
        const dColors=["#003300","#001a00","#004400","#002200","#003a00"];
        for (let ty=0;ty<3;ty++) for (let tx=0;tx<tiles;tx++) {
          const col=dColors[(tx+ty)%dColors.length];
          ctx.fillStyle=col; ctx.fillRect(dfX+tx*tSize, dfY+ty*tSize, tSize-1, tSize-1);
          // Blood/moss cracks
          ctx.fillStyle="rgba(180,0,0,0.18)"; ctx.fillRect(dfX+tx*tSize+tSize/2, dfY+ty*tSize, 1, tSize);
          ctx.fillStyle=`rgba(44,200,44,${0.12+0.08*Math.sin(t+tx+ty)})`; ctx.fillRect(dfX+tx*tSize, dfY+ty*tSize+tSize/2, tSize, 1);
        }
        // Broken disco ball (cracked sphere)
        const dbx=W/2, dby=topY+52;
        ctx.fillStyle="#111"; ctx.beginPath(); ctx.arc(dbx, dby, 16, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle="rgba(44,200,44,0.6)"; ctx.lineWidth=1;
        for (let i=0;i<6;i++) { ctx.beginPath(); ctx.moveTo(dbx,dby); ctx.lineTo(dbx+Math.cos(i*1.05)*20, dby+Math.sin(i*1.05)*20); ctx.stroke(); }
        // Zombie dancers (5 silhouettes, lurching)
        const dpos=[[W*0.2,dfY+tSize*1.2],[W*0.35,dfY+tSize*1.5],[W*0.5,dfY+tSize*1.1],[W*0.65,dfY+tSize*1.6],[W*0.8,dfY+tSize*1.3]];
        for (let [dx,dy] of dpos) {
          const lurch=Math.sin(t*1.1+dx)*8;
          ctx.fillStyle="rgba(30,80,30,0.85)"; ctx.beginPath(); ctx.ellipse(dx, dy+lurch, 8, 14, lurch*0.05, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle="rgba(44,200,44,0.7)"; ctx.beginPath(); ctx.arc(dx, dy+lurch-20, 7, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle="rgba(0,0,0,0.4)"; ctx.lineWidth=0.5; ctx.stroke();
          // glowing eyes
          ctx.fillStyle="rgba(255,80,0,0.9)"; ctx.beginPath(); ctx.arc(dx-3,dy+lurch-21,1.5,0,Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(dx+3,dy+lurch-21,1.5,0,Math.PI*2); ctx.fill();
        }
        // Green fog machine effects (bottom)
        for (let fi=0;fi<4;fi++) {
          const fx=W*0.15+fi*(W*0.25), fy=H*0.82;
          ctx.fillStyle="#222"; rr(fx-10,fy,20,16,3); ctx.fill();
          ctx.strokeStyle="rgba(44,200,44,0.5)"; ctx.lineWidth=1; ctx.stroke();
          const fogG=ctx.createRadialGradient(fx,fy,0,fx,fy-20,30+10*Math.sin(t*1.2+fi));
          fogG.addColorStop(0,`rgba(20,120,20,${0.18+0.08*Math.sin(t*0.8+fi)})`); fogG.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=fogG; ctx.beginPath(); ctx.arc(fx,fy-10,36,0,Math.PI*2); ctx.fill();
        }
        // Zombie bar (left wall) - broken bottles, green drinks
        const barX=14, barY=H*0.32, barW2=70, barH2=120;
        ctx.fillStyle="#0a1a0a"; rr(barX,barY,barW2,barH2,4); ctx.fill();
        ctx.strokeStyle="rgba(44,180,44,0.5)"; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#AAFFAA"; ctx.font="bold 6px monospace"; ctx.textAlign="center";
        ctx.fillText("☠ BAR", barX+barW2/2, barY+12);
        for (let bi=0;bi<4;bi++) {
          const bx2=barX+8+bi*16, by2=barY+22;
          const bc2=["rgba(44,220,44,0.8)","rgba(140,0,0,0.7)","rgba(44,160,44,0.7)","rgba(0,80,0,0.8)"][bi];
          ctx.fillStyle=bc2; ctx.beginPath(); ctx.ellipse(bx2, by2+8, 4, 12, bi%2*0.3, 0, Math.PI*2); ctx.fill();
        }
        // Speakers with green glow
        for (const [spx,spy] of [[W-56,H*0.35],[W-56,H*0.60]]) {
          ctx.fillStyle="#0a1a0a"; ctx.strokeStyle="rgba(44,180,44,0.5)"; ctx.lineWidth=1; rr(spx,spy,44,56,4); ctx.fill(); ctx.stroke();
          const spG=ctx.createRadialGradient(spx+22,spy+22,2,spx+22,spy+22,20);
          spG.addColorStop(0,`rgba(44,200,44,${0.25+0.15*Math.sin(t*4+spx)})`); spG.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=spG; ctx.beginPath(); ctx.arc(spx+22,spy+22,22,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#0a200a"; ctx.beginPath(); ctx.arc(spx+22,spy+22,16,0,Math.PI*2); ctx.fill();
          for (let ri=1;ri<=3;ri++) { ctx.strokeStyle=`rgba(44,200,44,${0.12*ri})`; ctx.lineWidth=0.8; ctx.beginPath(); ctx.arc(spx+22,spy+22,5*ri,0,Math.PI*2); ctx.stroke(); }
        }
        // DANGER strobes
        for (let li=0;li<3;li++) {
          const lx=W*0.3+li*(W*0.2), la=0.3+0.3*Math.sin(t*6+li*2.1);
          const lg=ctx.createRadialGradient(lx,topY+80,0,lx,topY+80,40);
          lg.addColorStop(0,`rgba(44,255,44,${la})`); lg.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=lg; ctx.beginPath(); ctx.arc(lx,topY+80,40,0,Math.PI*2); ctx.fill();
        }
      } else if (!!this.map?.config?.hardcore) {
        // ═══ HARDCORE: INFERNO CLUB ═══
        const t = performance.now() / 1000;
        const EMBER="#FF8800"; const FLAME="#FF5500"; const CRIMSON="#FF2200"; const AMBER="#FFAA00";
        const EMBERr="255,136,0"; const FLAMEr="255,85,0"; const CRIMSONr="255,34,0"; const AMBERr="255,170,0";

        // Scorch background
        ctx.fillStyle="#060000"; ctx.fillRect(0,0,W,H);

        // Title
        ctx.save(); ctx.font="bold 19px Orbitron, monospace"; ctx.textAlign="center";
        ctx.fillStyle="#fff"; ctx.shadowColor=CRIMSON; ctx.shadowBlur=32;
        ctx.fillText("🔥 INFERNO CLUB 🔥", cx, topY-10); ctx.shadowBlur=0; ctx.restore();

        // ── Fire dance floor (center, animated tiles) ──
        const tiles=6, tSize=110;
        const dfX=cx-tiles*tSize/2, dfY=topY+20;
        const fColors=[CRIMSON,FLAME,EMBER,AMBER,FLAME,CRIMSON];
        for(let ty=0;ty<3;ty++) for(let tx=0;tx<tiles;tx++){
          const fl=0.25+0.2*Math.sin(t*3+tx*0.7+ty*1.1);
          const fc=fColors[(tx+ty)%fColors.length];
          ctx.fillStyle=fc+Math.round(fl*255).toString(16).padStart(2,'0');
          ctx.strokeStyle=fc+"AA"; ctx.lineWidth=1;
          ctx.fillRect(dfX+tx*tSize,dfY+ty*tSize,tSize-2,tSize-2);
          ctx.strokeRect(dfX+tx*tSize,dfY+ty*tSize,tSize-2,tSize-2);
        }

        // ── DJ booth (back center) ──
        ctx.fillStyle="#130500"; ctx.strokeStyle=AMBER; ctx.lineWidth=2;
        rr(cx-120,topY+380,240,80,6); ctx.fill(); ctx.stroke();
        ctx.fillStyle="#0a0300"; rr(cx-100,topY+390,200,60,4); ctx.fill();
        // Mixer
        for(let mi=0;mi<6;mi++){
          ctx.fillStyle=mi%2===0?EMBER:FLAME; ctx.strokeStyle=AMBER; ctx.lineWidth=0.8;
          ctx.beginPath(); ctx.arc(cx-90+mi*36,topY+420,6,0,Math.PI*2); ctx.fill(); ctx.stroke();
        }
        // VU meters
        for(let vi=0;vi<10;vi++){
          const vh=8+20*Math.abs(Math.sin(t*5+vi*0.6));
          ctx.fillStyle=vi<4?AMBER:vi<7?EMBER:CRIMSON;
          ctx.fillRect(cx-80+vi*17,topY+430-vh,12,vh);
        }
        ctx.fillStyle=FLAME; ctx.font="bold 7px monospace"; ctx.textAlign="center"; ctx.fillText("⚡ DJ INFERNO ⚡",cx,topY+448);

        // ── Bar (right side) ──
        ctx.fillStyle="#120400"; ctx.strokeStyle=FLAME; ctx.lineWidth=1.5;
        rr(W-210,topY+20,180,220,6); ctx.fill(); ctx.stroke();
        ctx.fillStyle=FLAME; ctx.font="bold 8px monospace"; ctx.textAlign="center"; ctx.fillText("FIRE BAR",W-120,topY+40);
        // Fire bottles
        for(let bi=0;bi<5;bi++){
          const bx=W-190+bi*36, bY=topY+60;
          ctx.fillStyle=`rgba(${CRIMSONr},0.5)`; ctx.strokeStyle=EMBER; ctx.lineWidth=0.8;
          rr(bx,bY,18,44,3); ctx.fill(); ctx.stroke();
          const bg=ctx.createLinearGradient(bx,bY,bx,bY+44);
          bg.addColorStop(0,`rgba(${AMBERr},0.4)`); bg.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=bg; ctx.fillRect(bx,bY,18,44);
        }
        // Bar stools
        for(let si=0;si<4;si++){
          const sx=W-196+si*44;
          ctx.fillStyle="#1a0600"; ctx.strokeStyle=EMBER; ctx.lineWidth=0.8;
          ctx.beginPath(); ctx.arc(sx,topY+220,12,0,Math.PI*2); ctx.fill(); ctx.stroke();
        }

        // ── VIP lounge (left side) ──
        ctx.fillStyle="#110500"; ctx.strokeStyle=CRIMSON; ctx.lineWidth=1.5;
        rr(30,topY+20,180,220,6); ctx.fill(); ctx.stroke();
        ctx.fillStyle=CRIMSON; ctx.font="bold 8px monospace"; ctx.textAlign="center"; ctx.fillText("VIP ZONE",120,topY+40);
        // VIP couches
        [[50,topY+60],[120,topY+60],[50,topY+150],[120,topY+150]].forEach(([vx,vy])=>{
          ctx.fillStyle="#1e0800"; ctx.strokeStyle=AMBER; ctx.lineWidth=1;
          rr(vx,vy,52,52,5); ctx.fill(); ctx.stroke();
          ctx.fillStyle=`rgba(${AMBERr},0.08)`; ctx.fillRect(vx+4,vy+4,44,44);
        });

        // ── 20 fire-lit club patrons ──
        const patronPositions=[];
        for(let pi=0;pi<20;pi++){
          const px=dfX+20+Math.floor(pi%6)*((tiles*tSize)/6), py=dfY+18+Math.floor(pi/6)*90;
          patronPositions.push([px,py]);
        }
        const patCols=["#8B1A00","#CC3300","#FF5500","#AA2200","#993300","#FF4400","#BB2200","#FF6600","#DD2200","#EE4400"];
        patronPositions.forEach(([px,py],pi)=>{
          ctx.fillStyle=patCols[pi%patCols.length];
          ctx.beginPath(); ctx.arc(px,py,8,0,Math.PI*2); ctx.fill();
          ctx.fillRect(px-6,py+7,12,16);
          ctx.fillStyle="#0a0200"; ctx.beginPath(); ctx.arc(px,py,4,0,Math.PI*2); ctx.fill();
          // Dance motion arm
          const armA=Math.sin(t*4+pi*0.6)*0.6;
          ctx.strokeStyle=patCols[pi%patCols.length]; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(px-6,py+12); ctx.lineTo(px-14+Math.cos(armA)*6,py+8+Math.sin(armA)*6); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(px+6,py+12); ctx.lineTo(px+14+Math.cos(-armA)*6,py+8+Math.sin(-armA)*6); ctx.stroke();
        });

        // ── Fire spotlights from ceiling ──
        for(let li=0;li<5;li++){
          const lx=cx-320+li*160, la=0.22+0.18*Math.sin(t*2.5+li*1.3);
          const lg=ctx.createRadialGradient(lx,topY+50,0,lx,topY+50+120,80);
          lg.addColorStop(0,`rgba(${FLAMEr},${la})`); lg.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=lg; ctx.beginPath(); ctx.arc(lx,topY+50,80,0,Math.PI*2); ctx.fill();
        }

        // ── Fire cage (bottom decor) ──
        for(let ci=0;ci<5;ci++){
          const fcx=120+ci*200, fcy=H*0.82;
          ctx.strokeStyle=`rgba(${EMBERr},0.4)`; ctx.lineWidth=1.2;
          ctx.strokeRect(fcx-14,fcy-14,28,28);
          const fcg=ctx.createRadialGradient(fcx,fcy,0,fcx,fcy,14);
          fcg.addColorStop(0,`rgba(${FLAMEr},${0.35+0.2*Math.sin(t*3+ci)})`); fcg.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=fcg; ctx.beginPath(); ctx.arc(fcx,fcy,14,0,Math.PI*2); ctx.fill();
        }
      } else if (!!this.map?.config?.ocean) {
        // ═══ OCEAN: ABYSS CLUB ═══
        const t = performance.now() / 1000;
        const AQUA = "#00FFEE", CYAN = "#00CCFF", TEAL = "#00AA88",
              DEEP = "#0066CC", BIOL = "#44FFCC", CORAL = "#FF7755";

        // ── DEEP OCEAN FLOOR ──
        for (let ty2 = 0; ty2 < room.H; ty2++) {
          for (let tx2 = 0; tx2 < room.W; tx2++) {
            if (room.layout[ty2][tx2] !== 0) continue;
            const px2 = tx2 * room.S, py2 = ty2 * room.S;
            const wv = Math.sin(t * 0.8 + tx2 * 0.4 + ty2 * 0.3) * 0.04;
            ctx.fillStyle = (tx2 + ty2) % 2 === 0 ? "#000e22" : "#000a1a";
            ctx.fillRect(px2, py2, room.S, room.S);
            ctx.strokeStyle = `rgba(0,180,200,${0.05 + wv})`;
            ctx.lineWidth = 1;
            ctx.strokeRect(px2, py2, room.S, room.S);
          }
        }

        // ── ROOM BORDER ──
        ctx.strokeStyle = AQUA;
        ctx.lineWidth = 2;
        ctx.shadowColor = AQUA;
        ctx.shadowBlur = 20;
        ctx.strokeRect(room.S + 2, room.S + 2, W - room.S * 2 - 4, H - room.S * 2 - 4);
        ctx.shadowBlur = 0;

        // ── TITLE SIGN ──
        ctx.save();
        ctx.font = "bold 22px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.shadowColor = AQUA;
        ctx.shadowBlur = 30;
        ctx.fillText("〜  ABYSS CLUB  〜", W / 2, room.S - 18);
        ctx.shadowBlur = 0;
        ctx.restore();

        // ── TOP ACCENT BAR ──
        const tgA = ctx.createLinearGradient(0, room.S, W, room.S);
        tgA.addColorStop(0,   "rgba(0,255,238,0)");
        tgA.addColorStop(0.5, "rgba(0,255,238,0.6)");
        tgA.addColorStop(1,   "rgba(0,255,238,0)");
        ctx.fillStyle = tgA;
        ctx.fillRect(room.S, room.S, W - room.S * 2, 4);

        // ── DJ BOOTH (top-center, large + detailed) ──
        const djX = W / 2 - 110, djY = room.S * 1.1, djW = 220, djH = 54;
        ctx.fillStyle = "#000e22";
        ctx.strokeStyle = TEAL;
        ctx.lineWidth = 2;
        ctx.shadowColor = TEAL;
        ctx.shadowBlur = 14;
        rr(djX, djY, djW, djH, 8);
        ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        const djGA = ctx.createLinearGradient(djX, 0, djX + djW, 0);
        djGA.addColorStop(0, AQUA + "00");
        djGA.addColorStop(0.5, AQUA + "BB");
        djGA.addColorStop(1, AQUA + "00");
        ctx.fillStyle = djGA;
        ctx.fillRect(djX + 4, djY, djW - 8, 4);
        // Turntables
        const ttA = (t * 1.2) % (Math.PI * 2);
        for (const [ttx, sign] of [[djX + 42, 1], [djX + djW - 42, -1]]) {
          ctx.fillStyle = "#001228";
          ctx.strokeStyle = TEAL + "88";
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(ttx, djY + 28, 24, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
          for (let gr = 1; gr <= 4; gr++) {
            ctx.strokeStyle = `rgba(0,200,200,${0.1 + gr * 0.06})`;
            ctx.beginPath(); ctx.arc(ttx, djY + 28, gr * 5, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.fillStyle = AQUA;
          ctx.beginPath(); ctx.arc(ttx, djY + 28, 6, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#88ccdd"; ctx.lineWidth = 2;
          ctx.save(); ctx.translate(ttx, djY + 28); ctx.rotate(ttA * sign);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(22, -6); ctx.stroke();
          ctx.fillStyle = "#aaccee"; ctx.beginPath(); ctx.arc(22, -6, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        // EQ bars
        const eqColsA = [AQUA, CYAN, TEAL, BIOL, DEEP, AQUA, CYAN, BIOL];
        for (let ei = 0; ei < 8; ei++) {
          const bh = 8 + Math.sin(t * 8 + ei * 0.9) * 14;
          ctx.fillStyle = eqColsA[ei]; ctx.shadowColor = eqColsA[ei]; ctx.shadowBlur = 6;
          ctx.fillRect(djX + 80 + ei * 8, djY + djH - 6 - bh, 6, bh);
        }
        ctx.shadowBlur = 0;
        ctx.fillStyle = AQUA; ctx.shadowColor = AQUA; ctx.shadowBlur = 10;
        ctx.font = "bold 9px Orbitron, monospace"; ctx.textAlign = "center";
        ctx.fillText("〜 AQUA MIX 〜", W / 2, djY + djH + 14);
        ctx.shadowBlur = 0;

        // ── HUMAN DJ (dancer-proportioned human behind the booth) ──
        {
          // Positioned so head+torso show above booth top, legs hidden behind it
          const djHx = W / 2, djHy = djY + 14;
          const djBob    = Math.sin(t * 3.5) * 3;
          const djStepL  = Math.sin(t * 3.5) * 4;
          const djArmLS  = Math.sin(t * 3.5) * 16;
          const djArmRS  = Math.sin(t * 3.5 + 0.5) * 16;
          const djSkin   = "#F4C88A", djHair = "#001a3a", djShirt = TEAL, djPants = "#001228";
          ctx.save();
          ctx.translate(djHx, djHy + djBob);

          // Shadow (hidden behind booth — omitted intentionally)

          // Legs (mostly hidden behind booth, glimpse below)
          ctx.fillStyle = djPants;
          ctx.beginPath(); ctx.roundRect(-8, 10, 5, 12 + djStepL, 1); ctx.fill();
          ctx.beginPath(); ctx.roundRect( 3, 10, 5, 12 - djStepL, 1); ctx.fill();
          ctx.fillStyle = "#001840";
          ctx.beginPath(); ctx.ellipse(-5, 22 + djStepL, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse( 5, 22 - djStepL, 5, 2, 0, 0, Math.PI * 2); ctx.fill();

          // Body — teal DJ shirt
          ctx.fillStyle = djShirt + "DD"; ctx.shadowColor = AQUA; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.roundRect(-8, -8, 16, 20, 3); ctx.fill(); ctx.shadowBlur = 0;
          // Shirt collar detail
          ctx.fillStyle = djSkin;
          ctx.beginPath(); ctx.moveTo(-2, -8); ctx.lineTo(0, -4); ctx.lineTo(2, -8); ctx.fill();
          // Chest stripe
          ctx.strokeStyle = AQUA + "77"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-8, -1); ctx.lineTo(8, -1); ctx.stroke();

          // Arms reaching down to decks (animated swing)
          ctx.strokeStyle = djSkin; ctx.lineWidth = 4; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(-14 - djArmLS * 0.3, 6 + djArmLS * 0.1); ctx.stroke();
          ctx.beginPath(); ctx.moveTo( 7, -4); ctx.lineTo( 14 + djArmRS * 0.3, 4 + djArmRS * 0.1); ctx.stroke();
          ctx.lineCap = "butt";
          // Hands
          ctx.fillStyle = djSkin;
          ctx.beginPath(); ctx.arc(-14 - djArmLS * 0.3, 6 + djArmLS * 0.1, 3, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc( 14 + djArmRS * 0.3, 4 + djArmRS * 0.1, 3, 0, Math.PI * 2); ctx.fill();

          // Neck
          ctx.fillStyle = djSkin; ctx.fillRect(-3, -9, 6, 5);

          // Head
          ctx.fillStyle = djSkin;
          ctx.beginPath(); ctx.arc(0, -16, 9, 0, Math.PI * 2); ctx.fill();

          // Hair — short swept male
          ctx.fillStyle = djHair;
          ctx.beginPath(); ctx.arc(0, -21, 7, Math.PI * 1.1, Math.PI * 1.9); ctx.fill();
          ctx.fillRect(-6, -21, 12, 6);
          ctx.beginPath(); ctx.arc(-9, -16, 2.5, Math.PI * 0.6, Math.PI * 1.4); ctx.fill();
          ctx.beginPath(); ctx.arc( 9, -16, 2.5, Math.PI * 1.6, Math.PI * 0.4); ctx.fill();

          // Headphones band
          ctx.strokeStyle = "#1a3a55"; ctx.lineWidth = 3.5;
          ctx.beginPath(); ctx.arc(0, -19, 11, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
          // Ear cups
          ctx.fillStyle = AQUA; ctx.shadowColor = AQUA; ctx.shadowBlur = 7;
          ctx.beginPath(); ctx.arc(-10, -19, 4.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc( 10, -19, 4.5, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          // Cup detail
          ctx.fillStyle = "#002244";
          ctx.beginPath(); ctx.arc(-10, -19, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc( 10, -19, 2.5, 0, Math.PI * 2); ctx.fill();

          // Eyes — whites + iris + pupil + glint
          ctx.fillStyle = "#fff";
          ctx.beginPath(); ctx.ellipse(-3.5, -17, 2.2, 1.8, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse( 3.5, -17, 2.2, 1.8, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = TEAL; ctx.shadowColor = TEAL; ctx.shadowBlur = 3;
          ctx.beginPath(); ctx.arc(-3.5, -17, 1.2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc( 3.5, -17, 1.2, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#000";
          ctx.beginPath(); ctx.arc(-3.5, -17, 0.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc( 3.5, -17, 0.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.75)";
          ctx.beginPath(); ctx.arc(-4, -17.5, 0.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc( 3, -17.5, 0.5, 0, Math.PI * 2); ctx.fill();

          // Eyebrows
          ctx.strokeStyle = djHair; ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.moveTo(-6, -21); ctx.lineTo(-2, -22); ctx.stroke();
          ctx.beginPath(); ctx.moveTo( 2, -22); ctx.lineTo( 6, -21); ctx.stroke();

          // Nose
          ctx.fillStyle = "rgba(0,0,0,0.18)";
          ctx.beginPath(); ctx.arc(0, -14, 1.2, 0, Math.PI * 2); ctx.fill();

          // Mouth — open smile, animated
          const djMouth = Math.abs(Math.sin(t * 3.5)) * 2;
          ctx.strokeStyle = "#BB8844"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(0, -11, 3, 0.1, Math.PI - 0.1); ctx.stroke();
          if (djMouth > 0.6) {
            ctx.fillStyle = "#331100";
            ctx.beginPath(); ctx.arc(0, -10, djMouth * 0.8, 0, Math.PI); ctx.fill();
          }

          ctx.restore();
        }

        // ── SPEAKERS — left & right of DJ booth ──
        for (const [spX, spY] of [[djX - 50, djY - 4], [djX + djW + 24, djY - 4]]) {
          ctx.fillStyle = "#000e22"; ctx.strokeStyle = TEAL + "88"; ctx.lineWidth = 1.5;
          rr(spX, spY, 32, 56, 5); ctx.fill(); ctx.stroke();
          for (let ri = 0; ri < 4; ri++) {
            const rp = Math.sin(t * 6 + ri) * 0.5 + 0.5;
            ctx.strokeStyle = `rgba(0,200,200,${0.2 + rp * 0.5})`; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(spX + 16, spY + 20, 4 + ri * 3, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.fillStyle = AQUA; ctx.shadowColor = AQUA; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(spX + 16, spY + 44, 5, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }

        // ── BIG DANCE FLOOR (center, wave-ripple tiles 9×6) ──
        const dfColsA = 9, dfRowsA = 6;
        const dfW2A = W * 0.65, dfH2A = H * 0.34;
        const dfXA = W / 2 - dfW2A / 2, dfY2A = H * 0.38;
        const twA = dfW2A / dfColsA, th2A = dfH2A / dfRowsA;
        const tileColsA = [AQUA, CYAN, TEAL, BIOL, DEEP, "#00FFFF", "#44CCFF", BIOL, AQUA];
        for (let tr = 0; tr < dfRowsA; tr++) {
          for (let tc = 0; tc < dfColsA; tc++) {
            const wv2 = Math.sin(t * 3 + tc * 0.6 + tr * 0.8) * 0.5 + 0.5;
            const col = tileColsA[(tc + tr + Math.floor(t * 1.5)) % tileColsA.length];
            ctx.fillStyle = `rgba(0,10,30,0.9)`;
            ctx.fillRect(dfXA + tc * twA + 1, dfY2A + tr * th2A + 1, twA - 2, th2A - 2);
            ctx.fillStyle = col + Math.floor(wv2 * 70 + 15).toString(16).padStart(2, "0");
            ctx.fillRect(dfXA + tc * twA + 1, dfY2A + tr * th2A + 1, twA - 2, th2A - 2);
            ctx.strokeStyle = col + Math.floor(wv2 * 160 + 40).toString(16).padStart(2, "0");
            ctx.lineWidth = 1;
            ctx.strokeRect(dfXA + tc * twA + 1, dfY2A + tr * th2A + 1, twA - 2, th2A - 2);
            ctx.fillStyle = `rgba(255,255,255,${0.03 + wv2 * 0.05})`;
            ctx.fillRect(dfXA + tc * twA + 2, dfY2A + tr * th2A + 2, twA / 2, th2A / 2);
          }
        }
        ctx.fillStyle = "rgba(0,220,220,0.25)";
        ctx.font = "bold 7px Orbitron, monospace"; ctx.textAlign = "center";
        ctx.fillText("DANCE FLOOR", W / 2, dfY2A + dfH2A + 12);

        // ── DANCERS (5, ocean outfits, full detail) ──
        const dancerDefsA = [
          { x: W * 0.25, y: H * 0.50, color: AQUA,      gender: "f", skin: "#DDEEFF", hair: "#002244" },
          { x: W * 0.37, y: H * 0.53, color: BIOL,      gender: "m", skin: "#C8E0F0", hair: "#003355" },
          { x: W * 0.50, y: H * 0.49, color: CYAN,      gender: "f", skin: "#E0F0FF", hair: "#001133" },
          { x: W * 0.63, y: H * 0.53, color: TEAL,      gender: "m", skin: "#CCE8EE", hair: "#002030" },
          { x: W * 0.75, y: H * 0.50, color: "#00FFFF",  gender: "f", skin: "#DDEEFF", hair: "#001a3a" },
        ];
        for (const d of dancerDefsA) {
          const bounce   = Math.sin(t * 4 + d.x * 0.05) * 5;
          const armSwing = Math.sin(t * 4 + d.x * 0.05) * 18;
          const stepL    = Math.sin(t * 4 + d.x) * 5;
          ctx.save();
          ctx.translate(d.x, d.y + bounce);
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.beginPath(); ctx.ellipse(0, 22, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = d.gender === "f" ? "#001840" : "#001028";
          ctx.beginPath(); ctx.roundRect(-8, 10, 5, 12 + stepL, 1); ctx.fill();
          ctx.beginPath(); ctx.roundRect(3, 10, 5, 12 - stepL, 1); ctx.fill();
          ctx.fillStyle = d.gender === "f" ? d.color + "AA" : "#002244";
          ctx.beginPath(); ctx.ellipse(-5, 22 + stepL, 5, 2, 0, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(5, 22 - stepL, 5, 2, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = d.color + "CC"; ctx.shadowColor = d.color; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.roundRect(d.gender === "f" ? -8 : -7, -8, d.gender === "f" ? 16 : 14, 20, 3); ctx.fill();
          ctx.shadowBlur = 0;
          if (d.gender === "f") {
            ctx.fillStyle = d.color + "88";
            ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(-13, 22); ctx.lineTo(13, 22); ctx.lineTo(8, 8); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = d.color + "FF"; ctx.lineWidth = 1.5; ctx.shadowColor = d.color; ctx.shadowBlur = 4;
            ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(8, 4); ctx.stroke(); ctx.shadowBlur = 0;
          } else {
            ctx.fillStyle = d.skin; ctx.beginPath(); ctx.moveTo(-3,-8); ctx.lineTo(0,-4); ctx.lineTo(3,-8); ctx.fill();
          }
          ctx.strokeStyle = d.skin; ctx.lineWidth = 4; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(-14 - armSwing * 0.3, 6); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(7, -4); ctx.lineTo(14 + armSwing * 0.3, 2); ctx.stroke();
          ctx.fillStyle = d.skin;
          ctx.beginPath(); ctx.arc(-14 - armSwing * 0.3, 6, 3, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(14 + armSwing * 0.3, 2, 3, 0, Math.PI*2); ctx.fill();
          ctx.lineCap = "butt";
          ctx.fillStyle = d.skin; ctx.fillRect(-3, -9, 6, 5);
          ctx.beginPath(); ctx.arc(0, -16, 9, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = d.hair;
          if (d.gender === "f") {
            ctx.beginPath(); ctx.arc(0, -20, 8, Math.PI, 0); ctx.fill();
            ctx.fillRect(-9, -21, 5, 14); ctx.fillRect(4, -21, 5, 14);
          } else {
            ctx.beginPath(); ctx.arc(0, -21, 7, Math.PI * 1.1, Math.PI * 1.9); ctx.fill();
            ctx.fillRect(-6, -21, 12, 6);
          }
          ctx.fillStyle = "#fff";
          ctx.beginPath(); ctx.ellipse(-3.5, -17, 2.2, 1.8, 0, 0, Math.PI*2); ctx.ellipse(3.5, -17, 2.2, 1.8, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = d.color; ctx.shadowColor = d.color; ctx.shadowBlur = 3;
          ctx.beginPath(); ctx.arc(-3.5, -17, 1.2, 0, Math.PI*2); ctx.arc(3.5, -17, 1.2, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#000";
          ctx.beginPath(); ctx.arc(-3.5, -17, 0.5, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(3.5, -17, 0.5, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = d.hair; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(-6, -20); ctx.lineTo(-2, -21); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(2, -21); ctx.lineTo(6, -20); ctx.stroke();
          ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.beginPath(); ctx.arc(0, -14, 1.2, 0, Math.PI*2); ctx.fill();
          const mOpenA = Math.abs(Math.sin(t * 4 + d.x)) * 2;
          ctx.strokeStyle = d.gender === "f" ? "#44AAEE" : "#3399CC"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(0, -11, 3, 0.1, Math.PI - 0.1); ctx.stroke();
          if (mOpenA > 0.5) { ctx.fillStyle = "#002244"; ctx.beginPath(); ctx.arc(0, -10, mOpenA, 0, Math.PI); ctx.fill(); }
          if (d.gender === "f") {
            ctx.fillStyle = d.color; ctx.shadowColor = d.color; ctx.shadowBlur = 4;
            ctx.beginPath(); ctx.arc(-9, -16, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(9, -16, 2, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
          }
          ctx.restore();
        }

        // ── STAGE / PODIUMS (left and right) ──
        for (const [pdX, pdCol] of [[W * 0.12, AQUA], [W * 0.88, CYAN]]) {
          const podBounce = Math.sin(t * 3 + pdX) * 4;
          ctx.fillStyle = "#001228"; ctx.strokeStyle = pdCol; ctx.lineWidth = 2;
          ctx.shadowColor = pdCol; ctx.shadowBlur = 12;
          rr(pdX - 22, H * 0.42, 44, 14, 4); ctx.fill(); ctx.stroke();
          ctx.shadowBlur = 0;
          const pdSkin = "#DDEEFF", pdHair = "#002244";
          ctx.save();
          ctx.translate(pdX, H * 0.42 - 5 + podBounce);
          const poleGA = ctx.createLinearGradient(-1, 0, 1, -50);
          poleGA.addColorStop(0, "#558"); poleGA.addColorStop(1, "#aac");
          ctx.strokeStyle = poleGA; ctx.lineWidth = 3;
          ctx.shadowColor = pdCol; ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -50); ctx.stroke();
          ctx.shadowBlur = 0;
          const pLegStep = Math.sin(t * 3 + pdX) * 6;
          ctx.fillStyle = "#001840";
          ctx.beginPath(); ctx.roundRect(-7, -20, 5, 14 + pLegStep, 1); ctx.fill();
          ctx.beginPath(); ctx.roundRect(2, -20, 5, 14 - pLegStep, 1); ctx.fill();
          ctx.fillStyle = pdCol + "AA";
          ctx.beginPath(); ctx.ellipse(-4, -6 + pLegStep, 5, 2, 0, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(4, -6 - pLegStep, 5, 2, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = pdCol + "CC"; ctx.shadowColor = pdCol; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.roundRect(-7, -38, 14, 20, 3); ctx.fill(); ctx.shadowBlur = 0;
          ctx.fillStyle = pdCol + "77";
          ctx.beginPath(); ctx.moveTo(-7,-20); ctx.lineTo(-11,-8); ctx.lineTo(11,-8); ctx.lineTo(7,-20); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = pdCol; ctx.lineWidth = 1.5; ctx.shadowColor = pdCol; ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.moveTo(-7,-22); ctx.lineTo(7,-22); ctx.stroke(); ctx.shadowBlur = 0;
          ctx.fillStyle = pdSkin; ctx.fillRect(-3, -40, 6, 4);
          ctx.fillStyle = pdSkin; ctx.beginPath(); ctx.arc(0, -47, 8, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = pdHair;
          ctx.beginPath(); ctx.arc(0, -50, 7, Math.PI, 0); ctx.fill();
          ctx.fillRect(-8, -52, 4, 12); ctx.fillRect(4, -52, 4, 12);
          ctx.fillStyle = "#fff";
          ctx.beginPath(); ctx.ellipse(-3, -48, 2, 1.6, 0, 0, Math.PI*2); ctx.ellipse(3, -48, 2, 1.6, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = pdCol; ctx.shadowColor = pdCol; ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.arc(-3, -48, 1.1, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(3, -48, 1.1, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "#000"; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(-5, -49.5); ctx.lineTo(-6, -51); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(5, -49.5); ctx.lineTo(6, -51); ctx.stroke();
          ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.arc(0, -45.5, 1, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = "#44AAEE"; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(0, -43.5, 2.5, 0.1, Math.PI-0.1); ctx.stroke();
          ctx.fillStyle = pdCol; ctx.shadowColor = pdCol; ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.arc(-9, -47, 2, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(9, -47, 2, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = pdSkin; ctx.lineWidth = 3; ctx.lineCap = "round";
          const armAA = Math.sin(t * 3 + pdX) * 0.4;
          ctx.beginPath(); ctx.moveTo(7, -34); ctx.lineTo(0 + Math.cos(armAA) * 16, -42 + Math.sin(armAA) * 8); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-7, -34); ctx.lineTo(-14, -26); ctx.stroke();
          ctx.lineCap = "butt";
          ctx.restore();
        }

        // ── BIOLUMINESCENT LASER LIGHTS ──
        for (let li = 0; li < 6; li++) {
          const angle = t * 0.6 + (li * Math.PI * 2) / 6;
          const originX = W / 2 + (li % 3 - 1) * 80;
          const originY = room.S * 1.5;
          const len = 180 + Math.sin(t * 2 + li) * 60;
          const lCol = tileColsA[li % tileColsA.length];
          ctx.strokeStyle = lCol + "55"; ctx.lineWidth = 1.5;
          ctx.shadowColor = lCol; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.moveTo(originX, originY);
          ctx.lineTo(originX + Math.cos(angle) * len, originY + Math.sin(angle) * len);
          ctx.stroke(); ctx.shadowBlur = 0;
        }

        // ── STROBE SPOTLIGHTS ──
        for (let si = 0; si < 3; si++) {
          const sp = Math.sin(t * 5 + si * 2) * 0.5 + 0.5;
          const sCol = [AQUA, CYAN, BIOL][si];
          const sx = dfXA + dfW2A * (0.2 + si * 0.3);
          const sgA = ctx.createRadialGradient(sx, dfY2A + dfH2A / 2, 0, sx, dfY2A + dfH2A / 2, 60);
          sgA.addColorStop(0, sCol + Math.floor(sp * 60).toString(16).padStart(2, "0"));
          sgA.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = sgA; ctx.beginPath(); ctx.arc(sx, dfY2A + dfH2A / 2, 60, 0, Math.PI * 2); ctx.fill();
        }

        // ── BAR (bottom-left) ──
        const barXA = room.S + 4, barYA = H * 0.78, barWA = W * 0.22, barHA = 42;
        ctx.fillStyle = "#000e20"; ctx.strokeStyle = TEAL; ctx.lineWidth = 2;
        ctx.shadowColor = TEAL; ctx.shadowBlur = 10;
        rr(barXA, barYA, barWA, barHA, 6); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.fillStyle = "#001830"; ctx.fillRect(barXA, barYA, barWA, 6);
        const bColsA = [AQUA, CYAN, BIOL, TEAL];
        for (let bi = 0; bi < 4; bi++) {
          const bc = bColsA[bi];
          const bxA = barXA + 12 + bi * (barWA - 24) / 3;
          const bpA = Math.sin(t * 1.5 + bi) * 0.3 + 0.7;
          ctx.fillStyle = bc + "50"; ctx.strokeStyle = bc; ctx.lineWidth = 1;
          ctx.shadowColor = bc; ctx.shadowBlur = 6 * bpA;
          ctx.beginPath();
          ctx.moveTo(bxA - 5, barYA + barHA - 4); ctx.lineTo(bxA - 4, barYA + 12);
          ctx.lineTo(bxA - 2, barYA + 8); ctx.lineTo(bxA + 2, barYA + 8);
          ctx.lineTo(bxA + 4, barYA + 12); ctx.lineTo(bxA + 5, barYA + barHA - 4);
          ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
        }
        ctx.fillStyle = AQUA; ctx.font = "bold 6px Orbitron, monospace"; ctx.textAlign = "center";
        ctx.fillText("DEEP BAR", barXA + barWA / 2, barYA + barHA + 11);

        // ── VIP LOUNGE (bottom-right) ──
        const vipXA = W - room.S - 4 - W * 0.22, vipYA = H * 0.78;
        ctx.fillStyle = "#000e20"; ctx.strokeStyle = CYAN; ctx.lineWidth = 2;
        ctx.shadowColor = CYAN; ctx.shadowBlur = 10;
        rr(vipXA, vipYA, barWA, barHA, 6); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
        for (let vi = 0; vi < 2; vi++) {
          const vsxA = vipXA + 10 + vi * (barWA / 2 - 8);
          ctx.fillStyle = "#001a30"; ctx.strokeStyle = CYAN + "88"; ctx.lineWidth = 1;
          rr(vsxA, vipYA + 10, barWA / 2 - 14, 24, 4); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#002040"; rr(vsxA, vipYA + 8, barWA / 2 - 14, 8, 2); ctx.fill();
        }
        ctx.fillStyle = CYAN; ctx.shadowColor = CYAN; ctx.shadowBlur = 8;
        ctx.font = "bold 6px Orbitron, monospace"; ctx.textAlign = "center";
        ctx.fillText("★ VIP LOUNGE ★", vipXA + barWA / 2, vipYA + barHA + 11);
        ctx.shadowBlur = 0;

        // ── JELLYFISH DECOR (slow ambient drift) ──
        for (let ji = 0; ji < 3; ji++) {
          const jx = W * (0.2 + ji * 0.3);
          const jy = H * 0.20 + Math.sin(t * 0.7 + ji * 2.1) * 20;
          const jc = [AQUA, BIOL, CYAN][ji];
          const jpA = Math.sin(t * 1.5 + ji) * 0.3 + 0.5;
          const jgA = ctx.createRadialGradient(jx, jy, 0, jx, jy, 18);
          jgA.addColorStop(0, jc + Math.floor(jpA * 150).toString(16).padStart(2, "0"));
          jgA.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = jgA;
          ctx.beginPath(); ctx.ellipse(jx, jy, 18, 14, 0, Math.PI, 0); ctx.fill();
          ctx.strokeStyle = jc + "66"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(jx, jy, 18, 14, 0, Math.PI, 0); ctx.stroke();
          for (let ti = 0; ti < 5; ti++) {
            const tx3 = jx - 14 + ti * 7;
            const tWave = Math.sin(t * 2 + ti * 0.8 + ji) * 6;
            ctx.strokeStyle = jc + "44"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(tx3, jy);
            ctx.quadraticCurveTo(tx3 + tWave, jy + 14, tx3 + tWave * 0.5, jy + 26);
            ctx.stroke();
          }
        }

        // ── FLOATING BUBBLE PARTICLES ──
        for (let pi = 0; pi < 20; pi++) {
          const px2 = (t * 14 + pi * 53) % W;
          const py2 = room.S * 2 + Math.sin(t * 1.0 + pi * 0.6) * 40 + (pi * (H * 0.7)) / 20;
          const alA = Math.sin(t * 2.5 + pi) * 0.3 + 0.4;
          const bcA = tileColsA[pi % tileColsA.length];
          const brA = pi % 5 === 0 ? 3 : pi % 3 === 0 ? 2 : 1.2;
          ctx.fillStyle = bcA + Math.floor(alA * 180).toString(16).padStart(2, "0");
          ctx.beginPath(); ctx.arc(px2, py2, brA, 0, Math.PI * 2); ctx.fill();
          if (pi % 5 === 0) {
            ctx.strokeStyle = bcA + Math.floor(alA * 100).toString(16).padStart(2, "0");
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.arc(px2, py2, brA + 2, 0, Math.PI * 2); ctx.stroke();
          }
        }

        // Side teal neon strips
        ctx.fillStyle = "rgba(0,200,200,0.25)";
        ctx.fillRect(room.S, room.S * 1.5, 3, H - room.S * 3);
        ctx.fillRect(W - room.S - 3, room.S * 1.5, 3, H - room.S * 3);

      } else {
        // ── DEFAULT NIGHTCLUB (other maps) ──────────
        // ── Dance floor (center) ─────────────────────
      const tiles = 5;
      const tSize = Math.floor((W * 0.7) / tiles);
      const dfX = cx - (tSize * tiles) / 2,
        dfY = midY - tSize * 1.5;
      const dColors = ["#FF00AA", "#AA00FF", "#0044FF", "#00AAFF", "#FF4400"];
      for (let ty = 0; ty < 3; ty++)
        for (let tx = 0; tx < tiles; tx++) {
          const col = dColors[(tx + ty) % dColors.length];
          ctx.fillStyle = col + "55";
          ctx.strokeStyle = col + "AA";
          ctx.lineWidth = 1;
          ctx.fillRect(
            dfX + tx * tSize,
            dfY + ty * tSize,
            tSize - 1,
            tSize - 1,
          );
          ctx.strokeRect(
            dfX + tx * tSize,
            dfY + ty * tSize,
            tSize - 1,
            tSize - 1,
          );
          // Tile shine
          ctx.fillStyle = "rgba(255,255,255,0.08)";
          ctx.fillRect(
            dfX + tx * tSize + 2,
            dfY + ty * tSize + 2,
            tSize / 2,
            tSize / 2,
          );
        }
      // ── DJ booth (top) ───────────────────────────
      ctx.fillStyle = "#1a0a2a";
      ctx.strokeStyle = "#FF00CC";
      ctx.lineWidth = 2;
      rr(cx - 52, topY + 4, 104, 34, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2a1040";
      rr(cx - 46, topY + 6, 92, 22, 3);
      ctx.fill();
      for (let ki = 0; ki < 8; ki++) {
        ctx.fillStyle = ki % 2 === 0 ? "#FF00AA" : "#AA00FF";
        ctx.fillRect(cx - 42 + ki * 11, topY + 8, 9, 16);
      }
      ctx.fillStyle = "#FF00CC";
      ctx.shadowColor = "#FF00AA";
      ctx.shadowBlur = 10;
      ctx.fillRect(cx - 18, topY + 10, 36, 6);
      ctx.shadowBlur = 0;
      // ── Bar (left side) ──────────────────────────
      ctx.fillStyle = "#1a0a28";
      ctx.strokeStyle = "#8800AA";
      ctx.lineWidth = 1.5;
      rr(cx - W * 0.44, topY + 46, 62, 66, 4);
      ctx.fill();
      ctx.stroke();
      for (let bi = 0; bi < 4; bi++) {
        const bc = ["#FF00AA", "#AA00FF", "#4400FF", "#FF4488"][bi];
        ctx.fillStyle = bc + "AA";
        ctx.shadowColor = bc;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(
          cx - W * 0.44 + 8 + bi * 14,
          topY + 58,
          5,
          14,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      // ── Speakers (corners) ───────────────────────
      for (const [spx, spy] of [
        [cx - W * 0.4, topY + 4],
        [cx + W * 0.28, topY + 4],
      ]) {
        ctx.fillStyle = "#111";
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1;
        rr(spx, spy, 26, 38, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.arc(spx + 13, spy + 14, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#555";
        ctx.beginPath();
        ctx.arc(spx + 13, spy + 14, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#222";
        ctx.beginPath();
        ctx.arc(spx + 13, spy + 14, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      // ── Neon sign ────────────────────────────────
      ctx.fillStyle = "#FF00AA";
      ctx.shadowColor = "#FF00CC";
      ctx.shadowBlur = 18;
      ctx.font = "bold 14px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillText("NEON CLUB", cx, topY + 42);
      ctx.shadowBlur = 0;
      } // end default nightclub
    } else if (type === 9) {
      // HOSPITAL
      if (!!this.map?.config?.ocean) {
        // ═══ OCEAN: OCEAN MEDICAL CENTER ═══
        const t = performance.now() / 1000;
        const AQUA="#00FFEE", CYAN="#00CCFF", TEAL="#00AA88", MED="#00FF88", RED="#FF3355";

        // Dark navy floor tiles
        for (let ty2=0;ty2<room.H;ty2++) for (let tx2=0;tx2<room.W;tx2++) {
          if(room.layout[ty2][tx2]!==0) continue;
          ctx.fillStyle=(tx2+ty2)%2===0?"#040d16":"#03080f";
          ctx.fillRect(tx2*room.S,ty2*room.S,room.S,room.S);
          ctx.strokeStyle="rgba(0,200,200,0.05)"; ctx.lineWidth=1;
          ctx.strokeRect(tx2*room.S,ty2*room.S,room.S,room.S);
        }
        // Room border
        ctx.strokeStyle=AQUA; ctx.lineWidth=2; ctx.shadowColor=AQUA; ctx.shadowBlur=14;
        ctx.strokeRect(room.S+2,room.S+2,W-room.S*2-4,H-room.S*2-4); ctx.shadowBlur=0;

        // ── SIGN (top center) ──
        ctx.save(); ctx.font="bold 16px Orbitron, monospace"; ctx.textAlign="center";
        ctx.fillStyle="#fff"; ctx.shadowColor=AQUA; ctx.shadowBlur=24;
        ctx.fillText("✚  OCEAN MEDICAL CENTER  ✚", W/2, room.S-14); ctx.shadowBlur=0; ctx.restore();
        const sgnG=ctx.createLinearGradient(0,room.S,W,room.S);
        sgnG.addColorStop(0,"rgba(0,255,238,0)"); sgnG.addColorStop(0.5,"rgba(0,255,238,0.45)"); sgnG.addColorStop(1,"rgba(0,255,238,0)");
        ctx.fillStyle=sgnG; ctx.fillRect(room.S,room.S,W-room.S*2,3);

        // ── CYAN CROSS (back wall) ──
        ctx.fillStyle=AQUA; ctx.shadowColor=AQUA; ctx.shadowBlur=14;
        ctx.fillRect(W/2-5,room.S+6,10,28); ctx.fillRect(W/2-14,room.S+15,28,10); ctx.shadowBlur=0;

        // ── TWO HOSPITAL BEDS (side by side, big) ──
        for (const [bedX] of [[W*0.30],[W*0.70]]) {
          const bedY=H*0.44;
          // Bed frame
          ctx.fillStyle="#0a1e2a"; ctx.strokeStyle=TEAL; ctx.lineWidth=1.8;
          ctx.shadowColor=TEAL; ctx.shadowBlur=6;
          rr(bedX-52,bedY,104,42,6); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
          // Mattress
          ctx.fillStyle="#0f2535"; rr(bedX-48,bedY+4,82,30,4); ctx.fill();
          // Pillow
          ctx.fillStyle="#e8f4f8"; rr(bedX+26,bedY+6,18,14,3); ctx.fill();
          // Patient silhouette
          ctx.fillStyle="#1a2e3e"; rr(bedX-42,bedY+8,72,14,3); ctx.fill();
          // Patient head
          ctx.fillStyle="#c8a888"; ctx.beginPath(); ctx.arc(bedX+32,bedY+13,7,0,Math.PI*2); ctx.fill();
          // IV line to patient arm
          ctx.strokeStyle=AQUA+"55"; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(bedX-42,bedY+13); ctx.lineTo(bedX-56,bedY-8); ctx.stroke();
          // Surgical overhead light (glow)
          const lglow=Math.sin(t*1.2+bedX)*0.15+0.85;
          const lG=ctx.createRadialGradient(bedX,bedY+10,0,bedX,bedY+10,40);
          lG.addColorStop(0,`rgba(200,240,255,${0.18*lglow})`); lG.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=lG; ctx.beginPath(); ctx.arc(bedX,bedY+10,44,0,Math.PI*2); ctx.fill();
          // Light fixture
          ctx.fillStyle="#0a1e2a"; ctx.strokeStyle=CYAN+"88"; ctx.lineWidth=1;
          rr(bedX-12,bedY-22,24,10,3); ctx.fill(); ctx.stroke();
          ctx.fillStyle=`rgba(200,240,255,${0.6*lglow})`; ctx.beginPath(); ctx.arc(bedX,bedY-17,5,0,Math.PI*2); ctx.fill();

          // ── HEART MONITOR beside bed ──
          const hmX=bedX+58, hmY=bedY;
          ctx.fillStyle="#061218"; ctx.strokeStyle=MED; ctx.lineWidth=1.5;
          rr(hmX,hmY,48,52,3); ctx.fill(); ctx.stroke();
          ctx.fillStyle="#001a08"; ctx.fillRect(hmX+3,hmY+4,42,24);
          ctx.strokeStyle=MED; ctx.lineWidth=1.8; ctx.shadowColor=MED; ctx.shadowBlur=6;
          ctx.beginPath();
          const ex=hmX+3;
          ctx.moveTo(ex,hmY+16); ctx.lineTo(ex+6,hmY+16); ctx.lineTo(ex+10,hmY+8);
          ctx.lineTo(ex+14,hmY+24); ctx.lineTo(ex+18,hmY+16);
          ctx.lineTo(ex+22,hmY+16); ctx.lineTo(ex+26,hmY+10);
          ctx.lineTo(ex+30,hmY+22); ctx.lineTo(ex+34,hmY+16); ctx.lineTo(ex+42,hmY+16);
          ctx.stroke(); ctx.shadowBlur=0;
          // BPM readout
          ctx.fillStyle=MED; ctx.font="bold 7px Orbitron, monospace"; ctx.textAlign="center";
          ctx.fillText(`${72+Math.floor(Math.sin(t*0.5+bedX)*4)} BPM`,hmX+24,hmY+38);
          ctx.fillStyle=AQUA+"88"; ctx.font="bold 5px Orbitron, monospace";
          ctx.fillText("SpO2: 99%",hmX+24,hmY+47);

          // ── IV STAND ──
          const ivX=bedX-58, ivY=bedY-10;
          ctx.strokeStyle="#334455"; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(ivX,ivY+50); ctx.lineTo(ivX,ivY); ctx.stroke();
          ctx.strokeStyle="#556677"; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(ivX-10,ivY+50); ctx.lineTo(ivX+10,ivY+50); ctx.stroke();
          // IV bag
          ctx.fillStyle=AQUA+"33"; ctx.strokeStyle=AQUA; ctx.lineWidth=1;
          rr(ivX-10,ivY,20,26,4); ctx.fill(); ctx.stroke();
          ctx.fillStyle=AQUA+"77"; ctx.fillRect(ivX-6,ivY+4,12,16);
          // Drip tube
          ctx.strokeStyle=TEAL+"88"; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(ivX,ivY+26); ctx.quadraticCurveTo(ivX+12,ivY+36,bedX-42,bedY+13); ctx.stroke();
        }

        // ── MEDICAL SHELVES (left wall) ──
        const shX=room.S+6, shY=H*0.28, shW=68, shH=130;
        ctx.fillStyle="#040d16"; ctx.strokeStyle=TEAL; ctx.lineWidth=1.5;
        rr(shX,shY,shW,shH,4); ctx.fill(); ctx.stroke();
        ctx.fillStyle=AQUA+"44"; ctx.font="bold 5.5px Orbitron, monospace"; ctx.textAlign="center";
        ctx.fillText("PHARMACY",shX+shW/2,shY+11);
        const meds=["#FF3355","#0088FF","#00FF88","#FFCC00","#FF44AA","#AA00FF","#00CCFF","#FF8800"];
        for(let row=0;row<3;row++){
          ctx.fillStyle="#0a1e2a"; ctx.fillRect(shX+4,shY+14+row*38,shW-8,2);
          for(let col=0;col<4;col++){
            const mc=meds[(row*4+col)%meds.length];
            const mx2=shX+6+col*14, my2=shY+18+row*38;
            const glow=Math.sin(t*1.5+col+row)*0.25+0.75;
            ctx.fillStyle=mc+"44"; ctx.strokeStyle=mc; ctx.lineWidth=0.8;
            ctx.shadowColor=mc; ctx.shadowBlur=3*glow;
            ctx.beginPath(); ctx.roundRect(mx2,my2,10,22,[3,3,0,0]); ctx.fill(); ctx.stroke();
            ctx.shadowBlur=0;
            ctx.fillStyle=mc; ctx.fillRect(mx2+1,my2,8,4);
          }
        }

        // ── DEFIBRILLATOR UNIT (right wall) ──
        const dfbX=W-room.S-74, dfbY=H*0.30;
        ctx.fillStyle="#060f18"; ctx.strokeStyle=RED; ctx.lineWidth=1.5;
        rr(dfbX,dfbY,66,80,4); ctx.fill(); ctx.stroke();
        ctx.fillStyle=RED; ctx.shadowColor=RED; ctx.shadowBlur=8;
        ctx.font="bold 6px Orbitron, monospace"; ctx.textAlign="center";
        ctx.fillText("DEFIBRILLATOR",dfbX+33,dfbY+12); ctx.shadowBlur=0;
        const dfbPulse=Math.sin(t*3)*0.5+0.5;
        ctx.fillStyle=`rgba(255,51,85,${0.4+dfbPulse*0.5})`; ctx.shadowColor=RED; ctx.shadowBlur=8*dfbPulse;
        ctx.beginPath(); ctx.arc(dfbX+33,dfbY+36,14,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        ctx.fillStyle="#fff"; ctx.font="bold 16px serif"; ctx.textAlign="center";
        ctx.fillText("⚡",dfbX+33,dfbY+42);
        ctx.fillStyle=RED+"88"; ctx.font="bold 5px Orbitron, monospace";
        ctx.fillText("CHARGE: READY",dfbX+33,dfbY+60);
        ctx.fillStyle="#0a1e2a"; ctx.strokeStyle=RED+"66"; ctx.lineWidth=1;
        rr(dfbX+6,dfbY+66,24,8,2); ctx.fill(); ctx.stroke();
        rr(dfbX+36,dfbY+66,24,8,2); ctx.fill(); ctx.stroke();
        ctx.fillStyle=RED; ctx.font="bold 4.5px monospace"; ctx.textAlign="center";
        ctx.fillText("PADDLE L",dfbX+18,dfbY+72); ctx.fillText("PADDLE R",dfbX+48,dfbY+72);

        // ── X-RAY VIEWER (back right) ──
        const xrX=W-room.S-74, xrY=H*0.62;
        ctx.fillStyle="#020810"; ctx.strokeStyle=CYAN; ctx.lineWidth=1.5;
        rr(xrX,xrY,66,72,4); ctx.fill(); ctx.stroke();
        const xrG=ctx.createLinearGradient(xrX,xrY,xrX+66,xrY+72);
        xrG.addColorStop(0,"rgba(0,100,180,0.15)"); xrG.addColorStop(1,"rgba(0,50,120,0.08)");
        ctx.fillStyle=xrG; ctx.fillRect(xrX+3,xrY+3,60,66);
        // Skeleton outline (simplified)
        ctx.strokeStyle="rgba(180,220,255,0.6)"; ctx.lineWidth=1;
        const sx=xrX+33, sy=xrY+12;
        ctx.beginPath(); ctx.arc(sx,sy,10,0,Math.PI*2); ctx.stroke(); // skull
        ctx.beginPath(); ctx.moveTo(sx,sy+10); ctx.lineTo(sx,sy+36); ctx.stroke(); // spine
        ctx.beginPath(); ctx.moveTo(sx-18,sy+14); ctx.lineTo(sx+18,sy+14); ctx.stroke(); // shoulders
        ctx.beginPath(); ctx.moveTo(sx-18,sy+14); ctx.lineTo(sx-14,sy+36); ctx.stroke(); // left arm
        ctx.beginPath(); ctx.moveTo(sx+18,sy+14); ctx.lineTo(sx+14,sy+36); ctx.stroke(); // right arm
        ctx.beginPath(); ctx.moveTo(sx,sy+36); ctx.lineTo(sx-10,sy+56); ctx.stroke(); // left leg
        ctx.beginPath(); ctx.moveTo(sx,sy+36); ctx.lineTo(sx+10,sy+56); ctx.stroke(); // right leg
        ctx.fillStyle=CYAN+"55"; ctx.font="bold 5px Orbitron, monospace"; ctx.textAlign="center";
        ctx.fillText("X-RAY VIEWER",xrX+33,xrY+69);

        // ── STANDING DOCTOR (salesperson-scale human) ──
        {
          const dkX=cx, dkY=H*0.82;
          const breathe=Math.sin(t*0.9)*1.5;
          ctx.save(); ctx.translate(dkX,dkY);
          // Shadow
          ctx.globalAlpha=0.35; ctx.fillStyle="#000";
          ctx.beginPath(); ctx.ellipse(2,4,14,5,0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
          // Legs
          ctx.fillStyle="#0a1a2e"; ctx.fillRect(-6,-8,5,12); ctx.fillRect(1,-8,5,12);
          // Shoes
          ctx.fillStyle="#050e18"; ctx.fillRect(-7,2,6,5); ctx.fillRect(1,2,6,5);
          ctx.fillStyle=TEAL; ctx.fillRect(-7,2,6,1.5); ctx.fillRect(1,2,6,1.5);
          // White lab coat body
          const coatG=ctx.createLinearGradient(-12,-38,12,-10);
          coatG.addColorStop(0,"#d8eef0"); coatG.addColorStop(0.5,"#c0dde0"); coatG.addColorStop(1,"#a8cccc");
          ctx.fillStyle=coatG;
          ctx.beginPath(); ctx.moveTo(-11,-10); ctx.lineTo(-13,-38+breathe); ctx.lineTo(-8,-42+breathe);
          ctx.lineTo(8,-42+breathe); ctx.lineTo(13,-38+breathe); ctx.lineTo(11,-10); ctx.closePath(); ctx.fill();
          // Coat lapels + pocket
          ctx.strokeStyle="rgba(0,160,160,0.4)"; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(-4,-38+breathe); ctx.lineTo(-6,-20);
          ctx.moveTo(4,-38+breathe); ctx.lineTo(6,-20); ctx.stroke();
          ctx.fillStyle="rgba(0,0,0,0.1)"; rr(-8,-24,9,10,1); ctx.fill();
          // Stethoscope
          ctx.strokeStyle="#334455"; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(-4,-36+breathe); ctx.quadraticCurveTo(-10,-28,-8,-18); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(4,-36+breathe); ctx.quadraticCurveTo(10,-28,8,-18); ctx.stroke();
          ctx.fillStyle=AQUA; ctx.shadowColor=AQUA; ctx.shadowBlur=5;
          ctx.beginPath(); ctx.arc(0,-18,4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
          // Collar
          ctx.fillStyle="#E0F4F8";
          ctx.beginPath(); ctx.moveTo(-5,-40+breathe); ctx.lineTo(0,-37+breathe); ctx.lineTo(5,-40+breathe);
          ctx.lineTo(4,-42+breathe); ctx.lineTo(-4,-42+breathe); ctx.closePath(); ctx.fill();
          // Neck
          ctx.fillStyle="#D8C8B8"; ctx.fillRect(-3,-46+breathe,6,6);
          // Head
          const hG=ctx.createRadialGradient(-3,-54+breathe,2,0,-52+breathe,12);
          hG.addColorStop(0,"#F0D8C0"); hG.addColorStop(1,"#C8A888");
          ctx.fillStyle=hG; ctx.beginPath(); ctx.ellipse(0,-54+breathe,10,12,0,0,Math.PI*2); ctx.fill();
          // Hair (dark, neat)
          ctx.fillStyle="#1a0a00";
          ctx.beginPath(); ctx.ellipse(0,-63+breathe,9,6,0,Math.PI,0); ctx.fill();
          ctx.fillRect(-8,-63+breathe,16,7);
          // Eyes
          ctx.fillStyle="#FFFFFF";
          ctx.beginPath(); ctx.ellipse(-4,-54+breathe,2.5,2,0,0,Math.PI*2); ctx.ellipse(4,-54+breathe,2.5,2,0,0,Math.PI*2); ctx.fill();
          ctx.fillStyle=TEAL; ctx.beginPath(); ctx.arc(-4,-54+breathe,1.2,0,Math.PI*2); ctx.arc(4,-54+breathe,1.2,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#000"; ctx.beginPath(); ctx.arc(-4,-54+breathe,0.5,0,Math.PI*2); ctx.arc(4,-54+breathe,0.5,0,Math.PI*2); ctx.fill();
          // Smile
          ctx.strokeStyle="#AA7766"; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.arc(0,-50+breathe,3.5,0.1,Math.PI-0.1); ctx.stroke();
          // Eyebrows
          ctx.strokeStyle="#1a0a00"; ctx.lineWidth=1.3;
          ctx.beginPath(); ctx.moveTo(-6,-57+breathe); ctx.lineTo(-2,-58+breathe); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(2,-58+breathe); ctx.lineTo(6,-57+breathe); ctx.stroke();
          // Arms + clipboard
          ctx.strokeStyle="#C8A888"; ctx.lineWidth=6; ctx.lineCap="round";
          ctx.beginPath(); ctx.moveTo(11,-30+breathe); ctx.lineTo(16,-15); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-11,-30+breathe); ctx.lineTo(-14,-16); ctx.stroke();
          ctx.lineCap="butt";
          ctx.fillStyle="#D8C8B8"; ctx.beginPath(); ctx.arc(16,-15,4,0,Math.PI*2); ctx.fill();
          // Clipboard
          ctx.fillStyle="#EEF0F4"; ctx.strokeStyle="#334455"; ctx.lineWidth=1;
          rr(14,-15,18,22,2); ctx.fill(); ctx.stroke();
          ctx.fillStyle="#334455"; ctx.font="bold 4px monospace"; ctx.textAlign="left";
          for(let li=0;li<3;li++) ctx.fillRect(16,-11+li*6,12,1.5);
          ctx.restore();
        }

        // ── AMBIENT BUBBLES ──
        for(let pi=0;pi<12;pi++){
          const px2=(t*8+pi*57)%W, py2=room.S*2+Math.sin(t*0.8+pi*0.6)*30+(pi*(H*0.75))/12;
          const al=Math.sin(t*2+pi)*0.2+0.3;
          ctx.fillStyle=[AQUA,CYAN,TEAL][pi%3]+Math.floor(al*140).toString(16).padStart(2,"0");
          ctx.beginPath(); ctx.arc(px2,py2,pi%4===0?2:1.2,0,Math.PI*2); ctx.fill();
        }
        // Side strips
        ctx.fillStyle="rgba(0,200,200,0.2)";
        ctx.fillRect(room.S,room.S*1.5,3,H-room.S*3); ctx.fillRect(W-room.S-3,room.S*1.5,3,H-room.S*3);

      } else {
      // ── Operating table (center) ─────────────────
      ctx.fillStyle = "#EEFFEE";
      ctx.strokeStyle = "#44AA44";
      ctx.lineWidth = 1.5;
      rr(cx - 34, midY - 16, 68, 32, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#CCEECC";
      ctx.fillRect(cx - 30, midY - 12, 60, 24);
      // Pillow
      ctx.fillStyle = "#FFFFFF";
      rr(cx - 24, midY - 14, 22, 14, 3);
      ctx.fill();
      // Heart monitor line
      ctx.strokeStyle = "#22CC44";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#22FF44";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(cx - 10, midY + 2);
      ctx.lineTo(cx - 4, midY + 2);
      ctx.lineTo(cx, midY - 10);
      ctx.lineTo(cx + 4, midY + 10);
      ctx.lineTo(cx + 8, midY + 2);
      ctx.lineTo(cx + 22, midY + 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // ── Medical shelves (left) ───────────────────
      ctx.fillStyle = "#EEEEFF";
      ctx.strokeStyle = "#AACCAA";
      ctx.lineWidth = 1;
      rr(cx - W * 0.44, topY + 4, 52, 84, 2);
      ctx.fill();
      ctx.stroke();
      const medColors = ["#FF4444", "#4444FF", "#44AA44", "#FFAA00"];
      for (let mi = 0; mi < 3; mi++) {
        ctx.fillStyle = "#DDEEEE";
        ctx.fillRect(cx - W * 0.44 + 2, topY + 4 + mi * 26 + 20, 48, 3);
        for (let pi = 0; pi < 3; pi++) {
          ctx.fillStyle = medColors[(mi + pi) % 4];
          ctx.fillRect(
            cx - W * 0.44 + 4 + pi * 14,
            topY + 4 + mi * 26 + 4,
            10,
            15,
          );
        }
      }
      // ── Heart monitor machine (right) ────────────
      ctx.fillStyle = "#1a2a1a";
      ctx.strokeStyle = "#22CC44";
      ctx.lineWidth = 1.5;
      rr(cx + W * 0.24, topY + 8, 52, 58, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#002200";
      ctx.fillRect(cx + W * 0.24 + 4, topY + 12, 44, 28);
      ctx.strokeStyle = "#22FF44";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#22FF44";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      const mx2 = cx + W * 0.24 + 4;
      ctx.moveTo(mx2, topY + 26);
      ctx.lineTo(mx2 + 8, topY + 26);
      ctx.lineTo(mx2 + 12, topY + 16);
      ctx.lineTo(mx2 + 16, topY + 36);
      ctx.lineTo(mx2 + 20, topY + 26);
      ctx.lineTo(mx2 + 44, topY + 26);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // ── Red cross on wall ─────────────────────────
      ctx.fillStyle = "#FF2222";
      ctx.shadowColor = "#FF4444";
      ctx.shadowBlur = 10;
      ctx.fillRect(cx + 4, topY + 4, 10, 28);
      ctx.fillRect(cx - 5, topY + 13, 28, 10);
      ctx.shadowBlur = 0;
      } // end ocean hospital else
    } else if (type === 10) {
      // GARAGE
      // ── Car lift (center) ─────────────────────────
      ctx.fillStyle = "#1a1a20";
      ctx.strokeStyle = "#555566";
      ctx.lineWidth = 2;
      rr(cx - 54, midY - 14, 108, 36, 3);
      ctx.fill();
      ctx.stroke();
      // Car silhouette on lift
      ctx.fillStyle = "#2a2a3a";
      ctx.strokeStyle = "#4a4a5a";
      ctx.lineWidth = 1;
      rr(cx - 42, midY - 10, 84, 20, 4);
      ctx.fill();
      ctx.stroke();
      rr(cx - 28, midY - 22, 56, 14, 6);
      ctx.fill();
      ctx.stroke();
      // Wheels
      for (const wx of [cx - 28, cx + 18]) {
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(wx, midY + 10, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#444";
        ctx.beginPath();
        ctx.arc(wx, midY + 10, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Lift hydraulics
      ctx.strokeStyle = "#666";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - 52, midY + 22);
      ctx.lineTo(cx - 52, midY + 38);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 52, midY + 22);
      ctx.lineTo(cx + 52, midY + 38);
      ctx.stroke();
      // ── Tool board (top wall) ─────────────────────
      ctx.fillStyle = "#2a2014";
      ctx.strokeStyle = "#6a5030";
      ctx.lineWidth = 1.5;
      rr(cx - 64, topY + 4, 128, 48, 2);
      ctx.fill();
      ctx.stroke();
      const toolColors = ["#888", "#AAAAFF", "#FF8800", "#CC4444", "#8888AA"];
      const tools = [
        ["🔧", cx - 52],
        [" ⚙", cx - 30],
        ["🔨", cx - 8],
        ["⛏", cx + 14],
        ["🔩", cx + 36],
      ];
      ctx.font = "14px serif";
      ctx.textAlign = "center";
      tools.forEach(([ic, tx2]) => ctx.fillText(ic, tx2, topY + 32));
      // ── Oil stain (floor) ─────────────────────────
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(cx, midY + 8, 44, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      // ── Parts shelf (right) ──────────────────────
      ctx.fillStyle = "#1a1810";
      ctx.strokeStyle = "#44403a";
      ctx.lineWidth = 1;
      rr(cx + W * 0.28, topY + 4, 38, 78, 2);
      ctx.fill();
      ctx.stroke();
      const pColors = ["#888888", "#AAAAFF", "#FF6600", "#CC4422"];
      for (let si = 0; si < 3; si++) {
        ctx.fillStyle = "#2a2818";
        ctx.fillRect(cx + W * 0.28 + 2, topY + 4 + si * 24 + 18, 34, 3);
        for (let pi = 0; pi < 2; pi++) {
          ctx.fillStyle = pColors[(si + pi) % 4];
          ctx.beginPath();
          ctx.arc(
            cx + W * 0.28 + 10 + pi * 16,
            topY + 4 + si * 24 + 8,
            7,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
    } else if (type === 11) {
      // BAR
      const isNeonCityBar  = this.map?.config?.id === "neon_city";
      const isHardcoreBar  = !!this.map?.config?.hardcore;

      if (isNeonCityBar || isHardcoreBar) {
        // ═══ NEON CITY CYBER LOUNGE (also used for HARDCORE) ═══
        const t = performance.now() / 1000;

        // Neon City colors
        const CYAN = "#44EEFF";
        const PINK = "#FF4466";
        const GREEN = "#44FF88";
        const PURPLE = "#CC88FF";
        const GOLD = "#FFDD44";
        const ORANGE = "#FF8844";

        // ── Title Header ──
        ctx.save();
        ctx.font = "bold 16px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.shadowColor = PURPLE;
        ctx.shadowBlur = 22;
        ctx.fillText("🍸 NEON LOUNGE 🍸", cx, topY - 50);
        ctx.shadowBlur = 0;
        ctx.restore();

        // ── Divider line ──
        // ctx.save();
        // const divGrad = ctx.createLinearGradient(cx - W * 0.42, 0, cx + W * 0.42, 0);
        // divGrad.addColorStop(0, "rgba(204,136,255,0)");
        // divGrad.addColorStop(0.5, "rgba(204,136,255,0.9)");
        // divGrad.addColorStop(1, "rgba(204,136,255,0)");
        // ctx.strokeStyle = divGrad;
        // ctx.lineWidth = 2;
        // ctx.beginPath();
        // ctx.moveTo(cx - W * 0.42, topY + 8);
        // ctx.lineTo(cx + W * 0.42, topY + 8);
        // ctx.stroke();
        // ctx.restore();

        // ═══ BACK BAR SHELF (with bottles) ═══
        // ctx.save();
        // // Shelf
        // ctx.fillStyle = "#1a1218";
        // ctx.strokeStyle = PURPLE;
        // ctx.lineWidth = 2;
        // rr(cx - W * 0.38, topY + 12, W * 0.76, 8, 2);
        // ctx.fill();
        // ctx.stroke();
        // ctx.restore();

        // ═══ DRINK BOTTLES (Vibrant & Colorful) ═══
        const drinks = [
          { label: "🍷", glow: "#FF2266" },
          { label: "🥃", glow: "#FFAA44" },
          { label: "🍸", glow: CYAN },
          { label: "🍹", glow: "#FF66AA" },
          { label: "🍺", glow: GOLD },
          { label: "🍾", glow: "#88FF88" },
        ];

        for (let di = 0; di < drinks.length; di++) {
          const dx = cx - W * 0.32 + di * (W * 0.13);
          const dy = topY + 12;
          const drink = drinks[di];
          const pulse = Math.sin(t * 3 + di) * 0.3 + 0.7;

          ctx.save();
          // Glow background
          ctx.fillStyle = drink.glow + "40";
          ctx.beginPath();
          ctx.arc(dx, dy - 8, 18, 0, Math.PI * 2);
          ctx.fill();

          // Drink emoji (larger)
          ctx.font = "28px serif";
          ctx.textAlign = "center";
          ctx.shadowColor = drink.glow;
          ctx.shadowBlur = 15 * pulse;
          ctx.fillText(drink.label, dx, dy);
          ctx.shadowBlur = 0;
          ctx.restore();
        }

        // ═══ MAIN BAR COUNTER (lowered further) ═══
        ctx.save();
        const barPulse = Math.sin(t * 2) * 0.3 + 0.7;

        // Bar counter body (wooden look with neon trim)
        const barGrad = ctx.createLinearGradient(0, topY + 60, 0, topY + 95);
        barGrad.addColorStop(0, "#2a1a12");
        barGrad.addColorStop(0.5, "#1a100a");
        barGrad.addColorStop(1, "#0a0805");
        ctx.fillStyle = barGrad;
        rr(cx - W * 0.42, topY + 60, W * 0.84, 35, 6);
        ctx.fill();

        // Bar neon edge
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 3;
        ctx.shadowColor = CYAN;
        ctx.shadowBlur = 15 * barPulse;
        rr(cx - W * 0.42, topY + 60, W * 0.84, 35, 6);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Bar top surface highlight
        ctx.fillStyle = "rgba(68,238,255,0.1)";
        ctx.fillRect(cx - W * 0.4, topY + 62, W * 0.8, 6);
        ctx.restore();

        // ═══ BAR STOOLS (Realistic - lowered further) ═══
        for (let si = 0; si < 5; si++) {
          const sx = cx - W * 0.34 + si * ((W * 0.68) / 4);
          const sy = topY + 120;

          ctx.save();
          // Stool legs (4 legs)
          ctx.strokeStyle = "#333";
          ctx.lineWidth = 2;
          for (let leg = 0; leg < 4; leg++) {
            const legAngle = (leg * Math.PI) / 2 + Math.PI / 4;
            const legX = sx + Math.cos(legAngle) * 8;
            const legY = sy + 8 + Math.sin(legAngle) * 4;
            ctx.beginPath();
            ctx.moveTo(sx, sy + 5);
            ctx.lineTo(legX, legY + 12);
            ctx.stroke();
          }

          // Foot rest ring
          ctx.strokeStyle = GOLD;
          ctx.lineWidth = 2;
          ctx.shadowColor = GOLD;
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.ellipse(sx, sy + 12, 10, 4, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Seat cushion
          const cushionGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 14);
          cushionGrad.addColorStop(0, "#3a2020");
          cushionGrad.addColorStop(0.7, "#2a1515");
          cushionGrad.addColorStop(1, "#1a0a0a");
          ctx.fillStyle = cushionGrad;
          ctx.beginPath();
          ctx.ellipse(sx, sy, 14, 8, 0, 0, Math.PI * 2);
          ctx.fill();

          // Cushion highlight
          ctx.fillStyle = "rgba(255,100,100,0.2)";
          ctx.beginPath();
          ctx.ellipse(sx - 3, sy - 2, 6, 3, -0.3, 0, Math.PI * 2);
          ctx.fill();

          // Cushion border
          ctx.strokeStyle = PINK;
          ctx.lineWidth = 2;
          ctx.shadowColor = PINK;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.ellipse(sx, sy, 14, 8, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.restore();
        }

        // ═══ PATRONS SITTING AT BAR (with facial features) ═══
        // Patron 1 (on stool 1) - Male
        ctx.save();
        const p1x = cx - W * 0.34 + 1 * ((W * 0.68) / 4);
        const p1y = topY + 103;

        // Body
        ctx.fillStyle = "#2255BB";
        rr(p1x - 10, p1y - 20, 20, 24, 5);
        ctx.fill();
        // Shirt collar
        ctx.fillStyle = "#1144AA";
        ctx.beginPath();
        ctx.moveTo(p1x - 5, p1y - 20);
        ctx.lineTo(p1x, p1y - 15);
        ctx.lineTo(p1x + 5, p1y - 20);
        ctx.fill();

        // Neck
        ctx.fillStyle = "#DDBB99";
        ctx.fillRect(p1x - 3, p1y - 24, 6, 6);

        // Head
        ctx.fillStyle = "#EECCA8";
        ctx.beginPath();
        ctx.arc(p1x, p1y - 32, 10, 0, Math.PI * 2);
        ctx.fill();

        // Hair
        ctx.fillStyle = "#332211";
        ctx.beginPath();
        ctx.ellipse(p1x, p1y - 38, 9, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(p1x - 9, p1y - 36, 18, 4);

        // Eyes
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.ellipse(p1x - 4, p1y - 33, 3, 2, 0, 0, Math.PI * 2);
        ctx.ellipse(p1x + 4, p1y - 33, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#2244AA";
        ctx.beginPath();
        ctx.arc(p1x - 4, p1y - 33, 1.5, 0, Math.PI * 2);
        ctx.arc(p1x + 4, p1y - 33, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Eyebrows
        ctx.strokeStyle = "#332211";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p1x - 6, p1y - 36);
        ctx.lineTo(p1x - 2, p1y - 37);
        ctx.moveTo(p1x + 2, p1y - 37);
        ctx.lineTo(p1x + 6, p1y - 36);
        ctx.stroke();

        // Nose
        ctx.fillStyle = "#DDAA88";
        ctx.beginPath();
        ctx.moveTo(p1x, p1y - 32);
        ctx.lineTo(p1x - 2, p1y - 28);
        ctx.lineTo(p1x + 2, p1y - 28);
        ctx.fill();

        // Smile
        ctx.strokeStyle = "#AA6644";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p1x, p1y - 26, 4, 0.2, Math.PI - 0.2);
        ctx.stroke();

        // Arm holding drink
        ctx.fillStyle = "#2255BB";
        ctx.fillRect(p1x + 8, p1y - 16, 14, 6);
        ctx.fillStyle = "#EECCA8";
        ctx.beginPath();
        ctx.arc(p1x + 22, p1y - 13, 5, 0, Math.PI * 2);
        ctx.fill();

        // Drink in hand (with glow)
        ctx.font = "18px serif";
        ctx.shadowColor = GOLD;
        ctx.shadowBlur = 10;
        ctx.fillText("🍺", p1x + 28, p1y - 6);
        ctx.shadowBlur = 0;
        ctx.restore();

        // Patron 2 (on stool 3) - Female
        ctx.save();
        const p2x = cx - W * 0.34 + 3 * ((W * 0.68) / 4);
        const p2y = topY + 103;

        // Body (dress)
        ctx.fillStyle = "#CC2266";
        rr(p2x - 10, p2y - 20, 20, 24, 5);
        ctx.fill();
        // Dress neckline
        ctx.fillStyle = "#EECCA8";
        ctx.beginPath();
        ctx.ellipse(p2x, p2y - 20, 6, 3, 0, 0, Math.PI);
        ctx.fill();

        // Neck
        ctx.fillStyle = "#EECCA8";
        ctx.fillRect(p2x - 3, p2y - 24, 6, 5);

        // Head
        ctx.fillStyle = "#FFDDBB";
        ctx.beginPath();
        ctx.arc(p2x, p2y - 32, 10, 0, Math.PI * 2);
        ctx.fill();

        // Hair (long flowing)
        ctx.fillStyle = "#AA5522";
        ctx.beginPath();
        ctx.ellipse(p2x, p2y - 36, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(p2x - 11, p2y - 34, 6, 20);
        ctx.fillRect(p2x + 5, p2y - 34, 6, 20);

        // Eyes (with eyelashes)
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.ellipse(p2x - 4, p2y - 33, 3, 2.5, 0, 0, Math.PI * 2);
        ctx.ellipse(p2x + 4, p2y - 33, 3, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#228844";
        ctx.beginPath();
        ctx.arc(p2x - 4, p2y - 33, 1.5, 0, Math.PI * 2);
        ctx.arc(p2x + 4, p2y - 33, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Eyelashes
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p2x - 6, p2y - 35);
        ctx.lineTo(p2x - 7, p2y - 37);
        ctx.moveTo(p2x + 6, p2y - 35);
        ctx.lineTo(p2x + 7, p2y - 37);
        ctx.stroke();

        // Eyebrows (thin)
        ctx.strokeStyle = "#AA5522";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p2x - 4, p2y - 38, 4, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p2x + 4, p2y - 38, 4, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();

        // Nose
        ctx.fillStyle = "#EEBB99";
        ctx.beginPath();
        ctx.moveTo(p2x, p2y - 32);
        ctx.lineTo(p2x - 1.5, p2y - 28);
        ctx.lineTo(p2x + 1.5, p2y - 28);
        ctx.fill();

        // Lips (with lipstick)
        ctx.fillStyle = "#EE4466";
        ctx.beginPath();
        ctx.ellipse(p2x, p2y - 25, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Arm holding drink
        ctx.fillStyle = "#CC2266";
        ctx.fillRect(p2x - 22, p2y - 16, 14, 6);
        ctx.fillStyle = "#FFDDBB";
        ctx.beginPath();
        ctx.arc(p2x - 22, p2y - 13, 5, 0, Math.PI * 2);
        ctx.fill();

        // Drink in hand (with glow)
        ctx.font = "18px serif";
        ctx.shadowColor = PINK;
        ctx.shadowBlur = 10;
        ctx.fillText("🍹", p2x - 32, p2y - 6);
        ctx.shadowBlur = 0;
        ctx.restore();

        // ═══ SERVICE COUNTER (for bartender - lowered further) ═══
        ctx.save();
        const counterPulse = Math.sin(t * 2.5) * 0.3 + 0.7;
        const svcX = cx - 60;
        const svcY = topY + 165;
        const svcW = 120;
        const svcH = 32;

        // Counter shadow
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(svcX + 4, svcY + svcH + 2, svcW, 5);

        // Counter body
        const svcGrad = ctx.createLinearGradient(svcX, svcY, svcX, svcY + svcH);
        svcGrad.addColorStop(0, "#1a1a2e");
        svcGrad.addColorStop(1, "#0a0a14");
        ctx.fillStyle = svcGrad;
        rr(svcX, svcY, svcW, svcH, 6);
        ctx.fill();

        // Counter border
        ctx.strokeStyle = PURPLE;
        ctx.lineWidth = 3;
        ctx.shadowColor = PURPLE;
        ctx.shadowBlur = 12 * counterPulse;
        rr(svcX, svcY, svcW, svcH, 6);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Counter top edge
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 2;
        ctx.shadowColor = CYAN;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(svcX + 8, svcY + 3);
        ctx.lineTo(svcX + svcW - 8, svcY + 3);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Drinks on counter
        ctx.font = "18px serif";
        ctx.textAlign = "center";
        ctx.shadowColor = CYAN;
        ctx.shadowBlur = 6;
        ctx.fillText("🍸", svcX + 25, svcY + 22);
        ctx.fillText("🍹", svcX + 60, svcY + 22);
        ctx.fillText("🥃", svcX + 95, svcY + 22);
        ctx.shadowBlur = 0;

        // "SERVICE" text
        ctx.font = "bold 8px Orbitron, monospace";
        ctx.fillStyle = GOLD;
        ctx.shadowColor = GOLD;
        ctx.shadowBlur = 6;
        ctx.fillText("★ SERVICE ★", cx, svcY + svcH + 14);
        ctx.shadowBlur = 0;
        ctx.restore();

        // ═══ POOL TABLE (Improved) ═══
        ctx.save();
        const tableX = cx - W * 0.26;
        const tableY = midY + 55;
        const tableW = W * 0.52;
        const tableH = H * 0.26;

        // Table wooden frame
        ctx.fillStyle = "#2a1a0a";
        ctx.strokeStyle = "#4a3020";
        ctx.lineWidth = 6;
        rr(tableX - 8, tableY - 8, tableW + 16, tableH + 16, 10);
        ctx.fill();
        ctx.stroke();

        // Table inner frame
        ctx.fillStyle = "#1a3318";
        ctx.strokeStyle = GREEN;
        ctx.lineWidth = 3;
        ctx.shadowColor = GREEN;
        ctx.shadowBlur = 12;
        rr(tableX, tableY, tableW, tableH, 6);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Felt surface
        const feltGrad = ctx.createLinearGradient(
          tableX,
          tableY,
          tableX + tableW,
          tableY + tableH,
        );
        feltGrad.addColorStop(0, "#0d4422");
        feltGrad.addColorStop(0.5, "#0f5528");
        feltGrad.addColorStop(1, "#0d4422");
        ctx.fillStyle = feltGrad;
        rr(tableX + 4, tableY + 4, tableW - 8, tableH - 8, 4);
        ctx.fill();

        // Pockets (6 pockets)
        const pocketPositions = [
          [tableX, tableY],
          [tableX + tableW / 2, tableY - 4],
          [tableX + tableW, tableY],
          [tableX, tableY + tableH],
          [tableX + tableW / 2, tableY + tableH + 4],
          [tableX + tableW, tableY + tableH],
        ];
        for (const [px, py] of pocketPositions) {
          ctx.fillStyle = "#000";
          ctx.beginPath();
          ctx.arc(px, py, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#3a2a1a";
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // ═══ POOL BALLS IN TRIANGLE ═══
        const ballRadius = 7;
        const triangleX = tableX + tableW * 0.7;
        const triangleY = tableY + tableH / 2;
        const ballSpacing = ballRadius * 2 + 2;

        // Triangle formation (5 rows: 1-2-3-4-5 = 15 balls)
        const ballColors2 = [
          GOLD, // Row 1: 1 ball
          PINK,
          CYAN, // Row 2: 2 balls
          GREEN,
          "#111",
          ORANGE, // Row 3: 3 balls (black 8 in center)
          PURPLE,
          "#FF6666",
          "#6666FF",
          GOLD, // Row 4: 4 balls
          PINK,
          CYAN,
          GREEN,
          ORANGE,
          PURPLE, // Row 5: 5 balls
        ];

        let ballIndex = 0;
        for (let row = 0; row < 5; row++) {
          const ballsInRow = row + 1;
          const rowX = triangleX + row * ballSpacing * 0.9;
          const rowStartY = triangleY - ((ballsInRow - 1) * ballSpacing) / 2;

          for (let b = 0; b < ballsInRow; b++) {
            const bx = rowX;
            const by = rowStartY + b * ballSpacing;

            // Ball shadow
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.beginPath();
            ctx.arc(bx + 2, by + 2, ballRadius, 0, Math.PI * 2);
            ctx.fill();

            // Ball
            const ballCol = ballColors2[ballIndex] || GOLD;
            const ballGrad = ctx.createRadialGradient(
              bx - 2,
              by - 2,
              0,
              bx,
              by,
              ballRadius,
            );
            ballGrad.addColorStop(0, "#fff");
            ballGrad.addColorStop(0.3, ballCol);
            ballGrad.addColorStop(1, ballCol === "#111" ? "#000" : ballCol);
            ctx.fillStyle = ballGrad;
            ctx.beginPath();
            ctx.arc(bx, by, ballRadius, 0, Math.PI * 2);
            ctx.fill();

            // Ball shine
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.beginPath();
            ctx.arc(bx - 2, by - 2, 2, 0, Math.PI * 2);
            ctx.fill();

            ballIndex++;
          }
        }

        // Cue ball
        const cueBallX = tableX + tableW * 0.25;
        const cueBallY = tableY + tableH / 2;
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.arc(cueBallX + 2, cueBallY + 2, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        const cueGrad = ctx.createRadialGradient(
          cueBallX - 2,
          cueBallY - 2,
          0,
          cueBallX,
          cueBallY,
          ballRadius,
        );
        cueGrad.addColorStop(0, "#fff");
        cueGrad.addColorStop(0.5, "#f8f8ff");
        cueGrad.addColorStop(1, "#e0e0e8");
        ctx.fillStyle = cueGrad;
        ctx.beginPath();
        ctx.arc(cueBallX, cueBallY, ballRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // ═══ CYBER JUKEBOX (top right corner) ═══
        ctx.save();
        const jukeX = cx + W * 0.38;
        const jukeY = topY - 35;

        // Jukebox body
        ctx.fillStyle = "#0a0812";
        ctx.strokeStyle = PINK;
        ctx.lineWidth = 3;
        ctx.shadowColor = PINK;
        ctx.shadowBlur = 15;
        rr(jukeX, jukeY, 50, 75, 8);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Jukebox screen
        ctx.fillStyle = "#050508";
        rr(jukeX + 6, jukeY + 8, 38, 28, 4);
        ctx.fill();

        // Animated music bars
        for (let mb = 0; mb < 5; mb++) {
          const mbHeight = 8 + Math.sin(t * 8 + mb * 1.5) * 8;
          const mbColor = [CYAN, PINK, GREEN, GOLD, PURPLE][mb];
          ctx.fillStyle = mbColor;
          ctx.shadowColor = mbColor;
          ctx.shadowBlur = 6;
          ctx.fillRect(jukeX + 10 + mb * 7, jukeY + 28 - mbHeight, 5, mbHeight);
        }
        ctx.shadowBlur = 0;

        // Speaker grille
        ctx.fillStyle = "#1a1a25";
        rr(jukeX + 8, jukeY + 38, 34, 30, 3);
        ctx.fill();
        for (let sg = 0; sg < 4; sg++) {
          ctx.strokeStyle = `rgba(204,136,255,${0.3 + Math.sin(t * 4) * 0.3})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(jukeX + 25, jukeY + 53, 4 + sg * 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        // "JUKEBOX" label
        ctx.font = "bold 7px Orbitron, monospace";
        ctx.fillStyle = PINK;
        ctx.shadowColor = PINK;
        ctx.shadowBlur = 8;
        ctx.textAlign = "center";
        ctx.fillText("♫ JUKEBOX", jukeX + 25, jukeY + 80);
        ctx.shadowBlur = 0;
        ctx.restore();

        // ═══ AMBIENT PARTICLES ═══
        ctx.save();
        for (let pi = 0; pi < 12; pi++) {
          const px = cx - W * 0.4 + ((t * 10 + pi * 70) % (W * 0.8));
          const py =
            topY + 30 + Math.sin(t * 0.6 + pi * 0.7) * 50 + ((pi * 20) % 80);
          const alpha = Math.sin(t * 2 + pi) * 0.3 + 0.4;
          const colors = [CYAN, PINK, PURPLE, GOLD];
          ctx.fillStyle =
            colors[pi % 4].slice(0, 7) +
            Math.floor(alpha * 255)
              .toString(16)
              .padStart(2, "0");
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (!!this.map?.config?.zombie) {
        // ═══ ZOMBIE: ZOMBIE TAVERN ═══
        const t=performance.now()/1000;
        // Sign
        ctx.fillStyle="rgba(40,0,0,0.9)"; rr(W/2-100,room.S-22,200,26,5); ctx.fill();
        ctx.strokeStyle=`rgba(200,30,30,${0.6+0.3*Math.sin(t*1.8)})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#FFAAAA"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
        ctx.fillText("☠  ZOMBIE TAVERN  ☠", W/2, room.S-9);
        // Bar counter (top) — cracked/broken
        ctx.fillStyle="#1a0800"; rr(cx-W*0.44,topY+6,W*0.88,24,3); ctx.fill();
        ctx.strokeStyle="rgba(120,40,0,0.5)"; ctx.lineWidth=1.5; ctx.stroke();
        ctx.strokeStyle="rgba(0,0,0,0.4)"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(cx-80,topY+6); ctx.lineTo(cx-60,topY+30); ctx.stroke();
        // Broken bottles on bar
        const bColors=["rgba(44,160,44,0.8)","rgba(140,0,0,0.7)","rgba(44,100,44,0.75)","rgba(80,120,0,0.7)","rgba(200,140,0,0.6)"];
        for (let bi=0;bi<7;bi++) {
          const bx=cx-W*0.4+bi*W*0.13, by=topY+6;
          const broken=bi%3===1;
          ctx.fillStyle=bColors[bi%bColors.length];
          if (broken) { // knocked over
            ctx.save(); ctx.translate(bx+10,by+16); ctx.rotate(1.5);
            ctx.beginPath(); ctx.ellipse(0,0,4,12,0,0,Math.PI*2); ctx.fill(); ctx.restore();
            // spill
            ctx.fillStyle="rgba(44,160,44,0.25)"; ctx.beginPath(); ctx.ellipse(bx+16,by+20,12,5,-0.3,0,Math.PI*2); ctx.fill();
          } else {
            ctx.beginPath(); ctx.ellipse(bx+5,by+12,4,12,0,0,Math.PI*2); ctx.fill();
          }
        }
        // Bar stools (overturned)
        for (let si=0;si<4;si++) {
          const stx=cx-W*0.32+si*W*0.22, sty=topY+40;
          ctx.save(); ctx.translate(stx,sty); ctx.rotate(si%2===0?0.5:-0.4);
          ctx.fillStyle="#160800"; rr(-10,-10,20,20,10); ctx.fill();
          ctx.strokeStyle="rgba(80,40,0,0.4)"; ctx.lineWidth=1; ctx.stroke();
          ctx.fillStyle="#0d0500"; ctx.fillRect(-2,-10,-0,18); // leg
          ctx.restore();
        }
        // Pool table (center, cracked felt)
        ctx.fillStyle="#081a08"; rr(cx-70,midY-30,140,60,5); ctx.fill();
        ctx.strokeStyle="rgba(44,100,44,0.5)"; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle="rgba(20,80,20,0.6)"; rr(cx-62,midY-22,124,44,3); ctx.fill();
        ctx.strokeStyle="rgba(0,30,0,0.5)"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(cx-20,midY-22); ctx.lineTo(cx+30,midY+22); ctx.stroke(); // crack
        // Bloodied pool balls
        for (const [bx3,by3] of [[cx-30,midY-5],[cx,midY+5],[cx+25,midY-8],[cx-10,midY+8]]) {
          ctx.fillStyle="rgba(140,8,8,0.8)"; ctx.beginPath(); ctx.arc(bx3,by3,6,0,Math.PI*2); ctx.fill();
        }
        // Wanted posters/survivor notes (right wall)
        ctx.fillStyle="rgba(160,120,20,0.7)"; rr(W-70,H*0.35,52,70,3); ctx.fill();
        ctx.strokeStyle="rgba(200,160,40,0.4)"; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="rgba(20,8,0,0.85)"; ctx.font="bold 5px monospace"; ctx.textAlign="center";
        ctx.fillText("WANTED:", W-44, H*0.35+14); ctx.fillText("ZOMBIES", W-44, H*0.35+24);
        ctx.fillStyle="rgba(140,0,0,0.7)"; ctx.font="5px monospace";
        ctx.fillText("SHOOT ON SIGHT", W-44, H*0.35+42);
        // ── Corpse 1: patron slumped at bar ──
        drawCorpse(cx-W*0.22, topY+52, 0.25, '#1a0d06', 0.55);
        // ── Corpse 2: bartender collapsed behind counter ──
        drawCorpse(cx+W*0.12, topY+16, Math.PI+0.3, '#140a04', 0.38);
        // ── Corpse 3: body face-down center floor ──
        drawCorpse(cx-W*0.05, midY+22, 0.85, '#1a1008', 0.6);
        // ── Corpse 4: near pool table ──
        drawCorpse(cx+W*0.28, midY+30, -0.55, '#180808', 0.45);
        // ── Blood trails from corpses to center ──
        for (let tri=0;tri<3;tri++) {
          const [tx1,ty1,tx2,ty2]=[
            [cx-W*0.22,topY+52,cx-W*0.12,midY+10],
            [cx+W*0.12,topY+16,cx,midY-10],
            [cx+W*0.28,midY+30,cx+W*0.1,midY+15]
          ][tri];
          const trG=ctx.createLinearGradient(tx1,ty1,tx2,ty2);
          trG.addColorStop(0,`rgba(110,0,0,0.45)`); trG.addColorStop(1,'rgba(80,0,0,0)');
          ctx.strokeStyle=trG; ctx.lineWidth=3+tri*0.8;
          ctx.beginPath(); ctx.moveTo(tx1,ty1); ctx.lineTo(tx2,ty2); ctx.stroke();
        }
        // ── Overturned chairs scattered around ──
        for (let ci2=0;ci2<4;ci2++) {
          const chx=cx-W*0.38+ci2*W*0.25, chy=midY-10+ci2*22;
          ctx.save(); ctx.translate(chx,chy); ctx.rotate(ci2*0.55-0.6);
          ctx.fillStyle="#160400"; rr(-8,-8,16,16,3); ctx.fill();
          ctx.strokeStyle="rgba(70,20,0,0.4)"; ctx.lineWidth=1; ctx.stroke();
          ctx.fillStyle="#0d0200";
          ctx.fillRect(-1,-8,2,14); // leg
          ctx.fillRect(-8,-1,14,2); // crossbar
          ctx.restore();
        }
        // ── Broken glass shards near bar ──
        for (let gi=0;gi<10;gi++) {
          const gx=cx-W*0.38+gi*W*0.085, gy=topY+34+(gi%3)*7;
          ctx.fillStyle=`rgba(160,200,160,${0.18+gi%3*0.08})`;
          ctx.save(); ctx.translate(gx,gy); ctx.rotate(gi*0.65);
          ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(3.5,2); ctx.lineTo(-3,2.5); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        // ── Overturned table (bottom area) ──
        ctx.save(); ctx.translate(cx-W*0.15, H*0.78); ctx.rotate(0.2);
        ctx.fillStyle="#140600"; rr(-40,-8,80,16,3); ctx.fill();
        ctx.strokeStyle="rgba(80,30,0,0.35)"; ctx.lineWidth=1; ctx.stroke();
        ctx.restore();
      } else if (!!this.map?.config?.metropolis) {
        // ═══ METROPOLIS: THE IRON & AMBER BAR ═══
        const t = performance.now() / 1000;
        const AMBER="#FF9933", GOLD="#FFCC44", ORANGE="#FF6600", WARM="#FFAA22";
        const WOOD="#2a1208", BROWN="#3a1a08";

        // ── FLOOR (dark wood planks) ──
        for (let ty2=0;ty2<room.H;ty2++) {
          for (let tx2=0;tx2<room.W;tx2++) {
            if (room.layout[ty2][tx2]!==0) continue;
            ctx.fillStyle = (tx2%4<2) ? "#0e0a08" : "#0c0806";
            ctx.fillRect(tx2*room.S, ty2*room.S, room.S, room.S);
            ctx.strokeStyle="rgba(60,25,8,0.22)"; ctx.lineWidth=0.5;
            ctx.strokeRect(tx2*room.S, ty2*room.S, room.S, room.S);
          }
        }
        // Warm ambient floor glow
        const flrG=ctx.createRadialGradient(cx,H*0.5,0,cx,H*0.5,W*0.55);
        flrG.addColorStop(0,"rgba(255,153,51,0.08)"); flrG.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=flrG; ctx.fillRect(0,0,W,H);

        // ── ROOM BORDER ──
        ctx.strokeStyle=AMBER+"88"; ctx.lineWidth=2;
        ctx.shadowColor=AMBER; ctx.shadowBlur=8;
        ctx.strokeRect(room.S+2,room.S+2,W-room.S*2-4,H-room.S*2-4); ctx.shadowBlur=0;

        // ── SIGN ──
        ctx.save();
        ctx.font="bold 20px Orbitron, monospace"; ctx.textAlign="center";
        ctx.fillStyle="#fff"; ctx.shadowColor=AMBER; ctx.shadowBlur=28;
        ctx.fillText("★  IRON & AMBER  ★", cx, room.S-16); ctx.shadowBlur=0; ctx.restore();
        const signBarG=ctx.createLinearGradient(0,room.S,W,room.S);
        signBarG.addColorStop(0,"rgba(255,153,51,0)"); signBarG.addColorStop(0.5,"rgba(255,153,51,0.5)"); signBarG.addColorStop(1,"rgba(255,153,51,0)");
        ctx.fillStyle=signBarG; ctx.fillRect(room.S,room.S,W-room.S*2,3);

        // ── BACK BOTTLE SHELF (behind counter) ──
        const shelfY=topY+4;
        ctx.fillStyle="#1a0a04"; ctx.strokeStyle=BROWN; ctx.lineWidth=1.5;
        rr(room.S+4,shelfY,W-room.S*2-8,46,3); ctx.fill(); ctx.stroke();
        const shelfGlow=ctx.createLinearGradient(0,shelfY,0,shelfY+46);
        shelfGlow.addColorStop(0,"rgba(255,153,51,0.13)"); shelfGlow.addColorStop(1,"rgba(255,100,0,0.04)");
        ctx.fillStyle=shelfGlow; ctx.fillRect(room.S+6,shelfY+2,W-room.S*2-12,42);
        // Shelf planks
        ctx.strokeStyle="rgba(80,30,8,0.35)"; ctx.lineWidth=1;
        for (let sl=0;sl<3;sl++) { const sly=shelfY+13+sl*11; ctx.beginPath(); ctx.moveTo(room.S+6,sly); ctx.lineTo(W-room.S-6,sly); ctx.stroke(); }
        // 16 bottles
        const bottleColors=["#1a6622","#8B1a0a","#AA8800","#0a2a5a","#6a1a00","#1a4a1a","#CC6600","#0a1a4a","#442200","#2a0a1a","#885500","#1a3a22","#AA4400","#0a3a5a","#663300","#AA6600"];
        const bottleSlotW=(W-room.S*2-20)/16;
        for (let bi=0;bi<16;bi++) {
          const bx2=room.S+10+bi*bottleSlotW+bottleSlotW/2, by2=shelfY+4;
          const bH=22+(bi%3)*4;
          const bPulse=Math.sin(t*0.5+bi)*0.15+0.85;
          ctx.fillStyle=bottleColors[bi]+"CC"; ctx.shadowColor=bottleColors[bi]; ctx.shadowBlur=3*bPulse;
          ctx.beginPath(); ctx.roundRect(bx2-3,by2+8,6,bH,[1,1,0,0]); ctx.fill();
          ctx.fillStyle=bottleColors[bi]; ctx.beginPath(); ctx.roundRect(bx2-1.5,by2+2,3,8,[1,1,0,0]); ctx.fill();
          ctx.fillStyle=GOLD; ctx.beginPath(); ctx.roundRect(bx2-2,by2,4,3,1); ctx.fill();
          ctx.shadowBlur=0;
          ctx.fillStyle="rgba(255,220,160,0.35)"; ctx.fillRect(bx2-2.5,by2+10,5,bH-6);
        }

        // ── MAIN BAR COUNTER ──
        const ctrY=shelfY+50;
        ctx.fillStyle=WOOD; ctx.strokeStyle=AMBER; ctx.lineWidth=2.5;
        ctx.shadowColor=AMBER; ctx.shadowBlur=12;
        rr(room.S+4,ctrY,W-room.S*2-8,30,4); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
        const ctrGrd=ctx.createLinearGradient(room.S+4,ctrY,room.S+4,ctrY+30);
        ctrGrd.addColorStop(0,"rgba(255,153,51,0.14)"); ctrGrd.addColorStop(0.5,"rgba(255,100,0,0.06)"); ctrGrd.addColorStop(1,"rgba(0,0,0,0.1)");
        ctx.fillStyle=ctrGrd; ctx.fillRect(room.S+6,ctrY+2,W-room.S*2-12,26);
        ctx.strokeStyle="rgba(60,20,5,0.22)"; ctx.lineWidth=0.7;
        for (let gl=0;gl<4;gl++) { ctx.beginPath(); ctx.moveTo(room.S+8,ctrY+4+gl*6); ctx.lineTo(W-room.S-8,ctrY+4+gl*6); ctx.stroke(); }
        ctx.strokeStyle=GOLD+"66"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(room.S+8,ctrY+28); ctx.lineTo(W-room.S-8,ctrY+28); ctx.stroke();

        // ── BEER TAPS (5 taps on counter) ──
        const tapSlotW=(W-room.S*2-56)/4;
        for (let ti=0;ti<5;ti++) {
          const tx3=room.S+28+ti*tapSlotW, ty3=ctrY+2;
          ctx.fillStyle="#221008"; ctx.strokeStyle=GOLD; ctx.lineWidth=1;
          rr(tx3-5,ty3,10,6,2); ctx.fill(); ctx.stroke();
          ctx.strokeStyle="#C0A060"; ctx.lineWidth=4;
          ctx.beginPath(); ctx.moveTo(tx3,ty3); ctx.lineTo(tx3,ty3-14); ctx.stroke();
          ctx.fillStyle=["#882222","#225588","#228844","#AA8800","#882255"][ti];
          ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=4;
          rr(tx3-6,ty3-22,12,10,3); ctx.fill(); ctx.shadowBlur=0;
          ctx.strokeStyle="rgba(255,220,150,0.28)"; ctx.lineWidth=0.8; ctx.stroke();
          ctx.fillStyle="#FFEE99"; ctx.font="bold 3.5px monospace"; ctx.textAlign="center";
          ctx.fillText(["ALE","LAGER","STOUT","IPA","CRAFT"][ti], tx3, ty3-8);
        }

        // ── BAR STOOLS (6 stools) ──
        const stoolY=ctrY+46;
        const stoolSlotW=(W-room.S*2-40)/5;
        for (let si=0;si<6;si++) {
          const sx=room.S+20+si*stoolSlotW;
          ctx.strokeStyle="#442200"; ctx.lineWidth=2.5;
          for (let leg=0;leg<2;leg++) {
            ctx.beginPath(); ctx.moveTo(sx+(leg-0.5)*8,stoolY-6); ctx.lineTo(sx+(leg-0.5)*12,stoolY+10); ctx.stroke();
          }
          ctx.strokeStyle=AMBER+"77"; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.ellipse(sx,stoolY+4,9,3,0,0,Math.PI*2); ctx.stroke();
          const seatG=ctx.createRadialGradient(sx,stoolY-8,0,sx,stoolY-8,12);
          seatG.addColorStop(0,"#5a2a10"); seatG.addColorStop(1,"#2a1008");
          ctx.fillStyle=seatG; ctx.beginPath(); ctx.ellipse(sx,stoolY-8,12,6,0,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle=ORANGE+"88"; ctx.lineWidth=1.5; ctx.beginPath(); ctx.ellipse(sx,stoolY-8,12,6,0,0,Math.PI*2); ctx.stroke();
        }

        // ── HANGING PENDANT LIGHTS over bar ──
        for (let li=0;li<4;li++) {
          const lx=room.S+30+li*((W-room.S*2-60)/3), ly=topY-room.S+4;
          ctx.strokeStyle="#331100"; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx,ly+28); ctx.stroke();
          ctx.fillStyle="#3a1a06"; ctx.strokeStyle=AMBER; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(lx-12,ly+28); ctx.lineTo(lx+12,ly+28); ctx.lineTo(lx+8,ly+42); ctx.lineTo(lx-8,ly+42); ctx.closePath(); ctx.fill(); ctx.stroke();
          const lgPulse=Math.sin(t*0.8+li)*0.1+0.9;
          const lgG=ctx.createRadialGradient(lx,ly+44,0,lx,ly+44,40);
          lgG.addColorStop(0,`rgba(255,180,80,${0.22*lgPulse})`); lgG.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=lgG; ctx.beginPath(); ctx.arc(lx,ly+44,40,0,Math.PI*2); ctx.fill();
          ctx.fillStyle=`rgba(255,200,100,${0.82*lgPulse})`; ctx.shadowColor=GOLD; ctx.shadowBlur=8;
          ctx.beginPath(); ctx.ellipse(lx,ly+42,5,3,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        }

        // ── TV SCREENS above bar ──
        for (let tvi=0;tvi<2;tvi++) {
          const tvX=W*0.28+tvi*W*0.44, tvY=shelfY+2;
          ctx.fillStyle="#0a0808"; ctx.strokeStyle="#442200"; ctx.lineWidth=2;
          rr(tvX-28,tvY,56,34,3); ctx.fill(); ctx.stroke();
          ctx.fillStyle="rgba(20,40,80,0.7)"; ctx.fillRect(tvX-24,tvY+4,48,24);
          ctx.fillStyle=GOLD+"AA"; ctx.font="bold 4px monospace"; ctx.textAlign="center";
          ctx.fillText("METRO FC  2-1  CITY", tvX, tvY+15);
          ctx.fillStyle=AMBER+"77"; ctx.font="3.5px monospace";
          ctx.fillText("LIVE ●  Q3  74'", tvX, tvY+24);
          ctx.fillStyle="rgba(255,180,80,0.06)"; ctx.fillRect(tvX-24,tvY+4,48,4);
          ctx.strokeStyle="#442200"; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(tvX-4,tvY); ctx.lineTo(tvX-8,tvY-10); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(tvX+4,tvY); ctx.lineTo(tvX+8,tvY-10); ctx.stroke();
        }

        // ── BARTENDER (salesperson-scale human behind counter) ──
        {
          const btrX=cx+W*0.08, btrY=ctrY+14;
          const breathe=Math.sin(t*0.8)*1.2;
          ctx.save(); ctx.translate(btrX,btrY);
          ctx.globalAlpha=0.28; ctx.fillStyle="#000";
          ctx.beginPath(); ctx.ellipse(0,4,12,4,0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
          ctx.fillStyle="#1a0a04"; ctx.fillRect(-5,-6,4,10); ctx.fillRect(1,-6,4,10);
          const bvG=ctx.createLinearGradient(-12,-36,12,-10);
          bvG.addColorStop(0,"#1a1a1a"); bvG.addColorStop(0.5,"#0a0a0a"); bvG.addColorStop(1,"#222");
          ctx.fillStyle=bvG;
          ctx.beginPath(); ctx.moveTo(-11,-10); ctx.lineTo(-13,-36+breathe); ctx.lineTo(-8,-40+breathe); ctx.lineTo(8,-40+breathe); ctx.lineTo(13,-36+breathe); ctx.lineTo(11,-10); ctx.closePath(); ctx.fill();
          ctx.fillStyle="#EEE8E0";
          ctx.beginPath(); ctx.moveTo(-5,-38+breathe); ctx.lineTo(0,-34+breathe); ctx.lineTo(5,-38+breathe); ctx.lineTo(4,-40+breathe); ctx.lineTo(-4,-40+breathe); ctx.closePath(); ctx.fill();
          ctx.fillStyle=AMBER; ctx.shadowColor=AMBER; ctx.shadowBlur=4;
          ctx.beginPath(); ctx.moveTo(-3,-37+breathe); ctx.lineTo(0,-35+breathe); ctx.lineTo(3,-37+breathe); ctx.lineTo(0,-39+breathe); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
          ctx.strokeStyle="#E8C8A0"; ctx.lineWidth=4; ctx.lineCap="round";
          ctx.beginPath(); ctx.moveTo(-10,-22+breathe); ctx.lineTo(-26,-8); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(10,-22+breathe); ctx.lineTo(18,-12); ctx.stroke();
          ctx.lineCap="butt"; ctx.fillStyle="#E8C8A0";
          ctx.beginPath(); ctx.arc(-26,-8,3,0,Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(18,-12,3,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#E8C8A0"; ctx.fillRect(-3,-44+breathe,6,6);
          const bHG=ctx.createRadialGradient(-2,-52+breathe,2,0,-50+breathe,11);
          bHG.addColorStop(0,"#F0D8B8"); bHG.addColorStop(1,"#D0B898");
          ctx.fillStyle=bHG; ctx.beginPath(); ctx.ellipse(0,-52+breathe,10,11,0,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#1a1008";
          ctx.beginPath(); ctx.arc(0,-59+breathe,9,Math.PI*1.1,Math.PI*1.9); ctx.fill();
          ctx.fillRect(-8,-59+breathe,16,6);
          ctx.fillStyle="#1a1008";
          ctx.beginPath(); ctx.ellipse(-3,-47+breathe,2.5,1.2,0.2,0,Math.PI); ctx.fill();
          ctx.beginPath(); ctx.ellipse(3,-47+breathe,2.5,1.2,-0.2,0,Math.PI); ctx.fill();
          ctx.fillStyle="#fff";
          ctx.beginPath(); ctx.ellipse(-4,-53+breathe,2.2,1.8,0,0,Math.PI*2); ctx.ellipse(4,-53+breathe,2.2,1.8,0,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#4a2a10";
          ctx.beginPath(); ctx.arc(-4,-53+breathe,1.1,0,Math.PI*2); ctx.arc(4,-53+breathe,1.1,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#000";
          ctx.beginPath(); ctx.arc(-4,-53+breathe,0.5,0,Math.PI*2); ctx.arc(4,-53+breathe,0.5,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(-4.5,-53.5+breathe,0.5,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle="#1a1008"; ctx.lineWidth=1.2;
          ctx.beginPath(); ctx.moveTo(-6,-57+breathe); ctx.lineTo(-2,-58+breathe); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(2,-58+breathe); ctx.lineTo(6,-57+breathe); ctx.stroke();
          ctx.restore();
        }

        // ── BAR PATRONS seated on stools ──
        const patronDefs=[
          {si:0, skin:"#F0C880", hair:"#1a0a00", shirt:"#2255BB", gender:"m", emoji:"🍺", glowC:"#FFAA22"},
          {si:2, skin:"#D4AA80", hair:"#440a00", shirt:"#882244", gender:"f", emoji:"🍷", glowC:"#FF4466"},
          {si:4, skin:"#C8A468", hair:"#080808", shirt:"#224422", gender:"m", emoji:"🥃", glowC:"#FFCC44"},
        ];
        for (const pd of patronDefs) {
          const ppx=room.S+20+pd.si*stoolSlotW, ppy=stoolY-8;
          ctx.save(); ctx.translate(ppx,ppy);
          ctx.fillStyle=pd.shirt+"CC"; ctx.beginPath(); ctx.roundRect(-8,-22,16,18,3); ctx.fill();
          ctx.fillStyle=pd.skin; ctx.beginPath(); ctx.moveTo(-3,-22); ctx.lineTo(0,-19); ctx.lineTo(3,-22); ctx.fill();
          const aS=pd.gender==="f"?-1:1;
          ctx.strokeStyle=pd.skin; ctx.lineWidth=3.5; ctx.lineCap="round";
          ctx.beginPath(); ctx.moveTo(aS*7,-12); ctx.lineTo(aS*18,-4); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-aS*7,-12); ctx.lineTo(-aS*14,-2); ctx.stroke();
          ctx.lineCap="butt"; ctx.fillStyle=pd.skin;
          ctx.beginPath(); ctx.arc(aS*18,-4,3,0,Math.PI*2); ctx.fill();
          ctx.font="14px serif"; ctx.textAlign="center"; ctx.shadowColor=pd.glowC; ctx.shadowBlur=8;
          ctx.fillText(pd.emoji, aS*28,-1); ctx.shadowBlur=0;
          ctx.fillStyle=pd.skin; ctx.fillRect(-3,-25,6,5);
          ctx.beginPath(); ctx.ellipse(0,-30,7,8,0,0,Math.PI*2); ctx.fill();
          ctx.fillStyle=pd.hair;
          if (pd.gender==="f") { ctx.beginPath(); ctx.ellipse(0,-34,8,6,0,0,Math.PI*2); ctx.fill(); ctx.fillRect(-8,-34,5,12); ctx.fillRect(3,-34,5,12); }
          else { ctx.beginPath(); ctx.arc(0,-35,6,Math.PI*1.1,Math.PI*1.9); ctx.fill(); ctx.fillRect(-5,-35,10,4); }
          ctx.fillStyle="#fff"; ctx.beginPath(); ctx.ellipse(-3,-31,2,1.5,0,0,Math.PI*2); ctx.ellipse(3,-31,2,1.5,0,0,Math.PI*2); ctx.fill();
          ctx.fillStyle=AMBER; ctx.beginPath(); ctx.arc(-3,-31,1,0,Math.PI*2); ctx.arc(3,-31,1,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#000"; ctx.beginPath(); ctx.arc(-3,-31,0.4,0,Math.PI*2); ctx.arc(3,-31,0.4,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(-3.5,-31.5,0.5,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.arc(0,-28,1,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle="#AA7744"; ctx.lineWidth=1.2;
          ctx.beginPath(); ctx.arc(0,-26,3,0.2,Math.PI-0.2); ctx.stroke();
          ctx.restore();
        }

        // ── ROUND TABLES (3 tables, center area) ──
        const tableDefs=[{x:W*0.22,y:H*0.55},{x:W*0.5,y:H*0.62},{x:W*0.78,y:H*0.55}];
        for (let tIdx=0;tIdx<tableDefs.length;tIdx++) {
          const tbl=tableDefs[tIdx];
          ctx.fillStyle=WOOD; ctx.strokeStyle=ORANGE+"BB"; ctx.lineWidth=1.8;
          ctx.shadowColor=AMBER; ctx.shadowBlur=6;
          ctx.beginPath(); ctx.arc(tbl.x,tbl.y,28,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
          ctx.strokeStyle="rgba(80,30,8,0.3)"; ctx.lineWidth=1;
          ctx.beginPath(); ctx.arc(tbl.x,tbl.y,20,0,Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.arc(tbl.x,tbl.y,12,0,Math.PI*2); ctx.stroke();
          const tblDrinks=["🍺","🍷","🥃","🍸"];
          ctx.font="10px serif"; ctx.textAlign="center";
          ctx.shadowColor=GOLD; ctx.shadowBlur=5;
          ctx.fillText(tblDrinks[tIdx%4],tbl.x-8,tbl.y+4);
          ctx.fillText(tblDrinks[(tIdx+1)%4],tbl.x+8,tbl.y+4);
          ctx.shadowBlur=0;
          ctx.fillStyle="#1a0c06"; ctx.strokeStyle=AMBER+"33"; ctx.lineWidth=0.8;
          ctx.beginPath(); ctx.ellipse(tbl.x,tbl.y-8,6,3,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
          // 4 chairs around
          for (let ci=0;ci<4;ci++) {
            const cA=(ci/4)*Math.PI*2-Math.PI/2;
            const chx=tbl.x+Math.cos(cA)*36, chy=tbl.y+Math.sin(cA)*36;
            ctx.fillStyle="#2a1008"; ctx.strokeStyle=ORANGE+"44"; ctx.lineWidth=1;
            ctx.save(); ctx.translate(chx,chy); ctx.rotate(cA+Math.PI/2);
            ctx.beginPath(); ctx.ellipse(0,0,10,7,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.fillStyle="#3a1808"; ctx.fillRect(-8,-1,16,2);
            ctx.restore();
          }
        }

        // ── BOOTH SEATING (left wall, 2 booths) ──
        const boothX2=room.S+6, boothBaseY=H*0.38;
        for (let boi=0;boi<2;boi++) {
          const boY=boothBaseY+boi*92;
          ctx.fillStyle="#3a1a08"; ctx.strokeStyle=ORANGE+"55"; ctx.lineWidth=1.5;
          rr(boothX2,boY,72,26,4); ctx.fill(); ctx.stroke();
          ctx.fillStyle="#5a2a10"; rr(boothX2+3,boY+16,66,8,3); ctx.fill();
          ctx.fillStyle=WOOD; ctx.strokeStyle=AMBER+"55"; ctx.lineWidth=1;
          rr(boothX2+74,boY+6,42,16,3); ctx.fill(); ctx.stroke();
          ctx.fillStyle="#3a1a08"; ctx.strokeStyle=ORANGE+"55"; ctx.lineWidth=1.5;
          rr(boothX2+118,boY,72,26,4); ctx.fill(); ctx.stroke();
          ctx.fillStyle="#5a2a10"; rr(boothX2+121,boY+16,66,8,3); ctx.fill();
          ctx.font="10px serif"; ctx.textAlign="center";
          ctx.shadowColor=GOLD; ctx.shadowBlur=4;
          ctx.fillText(boi===0?"🍺":"🍸",boothX2+95,boY+16); ctx.shadowBlur=0;
          ctx.fillStyle=AMBER+"66"; ctx.font="bold 4.5px Orbitron, monospace"; ctx.textAlign="left";
          ctx.fillText(`BOOTH ${boi+1}`,boothX2+4,boY+10);
        }

        // ── POOL TABLE (bottom right) ──
        const ptX=W*0.54, ptY=H*0.50, ptW=W*0.34, ptH=H*0.30, ballR=7;
        ctx.fillStyle="#1a0800"; ctx.strokeStyle="#4a2a10"; ctx.lineWidth=5;
        rr(ptX-6,ptY-6,ptW+12,ptH+12,8); ctx.fill(); ctx.stroke();
        const ptFelt=ctx.createLinearGradient(ptX,ptY,ptX+ptW,ptY+ptH);
        ptFelt.addColorStop(0,"#0d4422"); ptFelt.addColorStop(1,"#0a3318");
        ctx.fillStyle=ptFelt; ctx.strokeStyle="#44AA66"; ctx.lineWidth=2;
        ctx.shadowColor="#44AA66"; ctx.shadowBlur=6;
        rr(ptX,ptY,ptW,ptH,4); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
        ctx.fillStyle="rgba(20,80,40,0.28)"; ctx.fillRect(ptX+4,ptY+4,ptW-8,ptH-8);
        for (const [ppx,ppy] of [[ptX,ptY],[ptX+ptW/2,ptY-3],[ptX+ptW,ptY],[ptX,ptY+ptH],[ptX+ptW/2,ptY+ptH+3],[ptX+ptW,ptY+ptH]]) {
          ctx.fillStyle="#000"; ctx.beginPath(); ctx.arc(ppx,ppy,8,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle="#2a1a08"; ctx.lineWidth=2; ctx.stroke();
        }
        const poolCols=[GOLD,"#FF3300","#0033FF","#FF6600","#880088","#FFDD00","#00AA44","#111"];
        for (let pb=0;pb<6;pb++) {
          const pbx=ptX+ptW*0.65+(pb%3)*(ballR*2.4), pby=ptY+ptH*0.28+Math.floor(pb/3)*(ballR*2.4);
          ctx.fillStyle="rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.arc(pbx+2,pby+2,ballR,0,Math.PI*2); ctx.fill();
          const pbG=ctx.createRadialGradient(pbx-2,pby-2,0,pbx,pby,ballR);
          pbG.addColorStop(0,"#fff"); pbG.addColorStop(0.35,poolCols[pb]); pbG.addColorStop(1,poolCols[pb]);
          ctx.fillStyle=pbG; ctx.beginPath(); ctx.arc(pbx,pby,ballR,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.arc(pbx-2,pby-2,2,0,Math.PI*2); ctx.fill();
        }
        const cbx=ptX+ptW*0.24, cby=ptY+ptH/2;
        const cbG=ctx.createRadialGradient(cbx-2,cby-2,0,cbx,cby,ballR);
        cbG.addColorStop(0,"#fff"); cbG.addColorStop(1,"#e0e0e8");
        ctx.fillStyle=cbG; ctx.beginPath(); ctx.arc(cbx,cby,ballR,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle="#8B5A2B"; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(ptX-22,ptY+ptH*0.68); ctx.lineTo(cbx+6,cby); ctx.stroke();
        ctx.fillStyle=ORANGE+"AA"; ctx.font="bold 6px Orbitron, monospace"; ctx.textAlign="center";
        ctx.fillText("POOL TABLE",ptX+ptW/2,ptY+ptH+14);

        // ── DART BOARD (right wall) ──
        const dbX=W-room.S-20, dbY=H*0.44;
        ctx.fillStyle="#1a0a04"; ctx.strokeStyle=ORANGE+"88"; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(dbX,dbY,28,0,Math.PI*2); ctx.fill(); ctx.stroke();
        const dartRings=[22,16,10,4], dartCols2=["#2a1a08","#F0E0C0","#AA1100","#22AA00"];
        for (let dr=0;dr<4;dr++) {
          ctx.fillStyle=dartCols2[dr]; ctx.strokeStyle="rgba(0,0,0,0.3)"; ctx.lineWidth=0.5;
          ctx.beginPath(); ctx.arc(dbX,dbY,dartRings[dr],0,Math.PI*2); ctx.fill(); ctx.stroke();
        }
        ctx.fillStyle="#DD1100"; ctx.beginPath(); ctx.arc(dbX,dbY,4,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#22BB00"; ctx.beginPath(); ctx.arc(dbX,dbY,2,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle="rgba(0,0,0,0.4)"; ctx.lineWidth=1;
        for (let dl=0;dl<8;dl++) { const da=(dl/8)*Math.PI*2; ctx.beginPath(); ctx.moveTo(dbX,dbY); ctx.lineTo(dbX+Math.cos(da)*22,dbY+Math.sin(da)*22); ctx.stroke(); }
        for (const [dta,dtr] of [[0.3,14],[1.1,8],[2.6,18]]) {
          const dtx=dbX+Math.cos(dta)*dtr, dty=dbY+Math.sin(dta)*dtr;
          ctx.strokeStyle="#888"; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(dtx,dty); ctx.lineTo(dtx-Math.cos(dta)*10,dty-Math.sin(dta)*10); ctx.stroke();
          ctx.fillStyle=GOLD; ctx.beginPath(); ctx.arc(dtx,dty,2,0,Math.PI*2); ctx.fill();
        }
        ctx.fillStyle=ORANGE+"BB"; ctx.font="bold 5.5px Orbitron, monospace"; ctx.textAlign="center";
        ctx.fillText("DARTS",dbX,dbY+34);

        // ── JUKEBOX (bottom-left corner) ──
        const jkX2=room.S+6, jkY2=H*0.68;
        ctx.fillStyle="#180800"; ctx.strokeStyle=ORANGE; ctx.lineWidth=2;
        ctx.shadowColor=ORANGE; ctx.shadowBlur=12;
        rr(jkX2,jkY2,54,80,8); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
        ctx.fillStyle="#080408"; rr(jkX2+6,jkY2+8,42,30,4); ctx.fill();
        for (let mb=0;mb<6;mb++) {
          const mbH=6+Math.sin(t*7+mb*1.3)*10;
          const mbC=[AMBER,ORANGE,GOLD,WARM,"#FF4400","#FFDD00"][mb];
          ctx.fillStyle=mbC; ctx.shadowColor=mbC; ctx.shadowBlur=4;
          ctx.fillRect(jkX2+10+mb*6,jkY2+28-mbH,4,mbH);
        }
        ctx.shadowBlur=0;
        ctx.fillStyle="#1a0c06"; rr(jkX2+6,jkY2+42,42,28,3); ctx.fill();
        for (let sg2=0;sg2<4;sg2++) {
          ctx.strokeStyle=`rgba(255,153,51,${0.18+Math.sin(t*3+sg2)*0.12})`;
          ctx.lineWidth=1; ctx.beginPath(); ctx.arc(jkX2+27,jkY2+56,3+sg2*3.5,0,Math.PI*2); ctx.stroke();
        }
        for (let btn=0;btn<5;btn++) {
          ctx.fillStyle=[AMBER,ORANGE,GOLD,"#FF4400","#FF8800"][btn];
          ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=3;
          ctx.beginPath(); ctx.arc(jkX2+11+btn*8,jkY2+68,2.5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        }
        ctx.fillStyle=GOLD; ctx.fillRect(jkX2+16,jkY2+73,22,2.5);
        ctx.fillStyle=AMBER; ctx.font="bold 5.5px Orbitron, monospace"; ctx.textAlign="center";
        ctx.fillText("♪ JUKEBOX ♪",jkX2+27,jkY2+86);

        // ── NEON SIGNS ──
        const neonSigns2=[
          {x:W*0.68,y:H*0.18,text:"★ COLD BEER ★",color:GOLD},
          {x:W*0.24,y:H*0.26,text:"LIVE MUSIC",color:ORANGE},
          {x:W*0.78,y:H*0.24,text:"🎱  POOL",color:"#44FF88"},
          {x:cx,    y:H*0.88,text:"NO FIGHTING",color:"#FF4444"},
        ];
        for (let ni=0;ni<neonSigns2.length;ni++) {
          const ns=neonSigns2[ni];
          const nsPulse=Math.sin(t*1.5+ni)*0.2+0.8;
          ctx.save(); ctx.font="bold 9px Orbitron, monospace"; ctx.textAlign="center";
          ctx.fillStyle=ns.color; ctx.shadowColor=ns.color; ctx.shadowBlur=16*nsPulse;
          ctx.fillText(ns.text,ns.x,ns.y); ctx.shadowBlur=0; ctx.restore();
        }

        // ── AMBIENT SMOKE / DUST PARTICLES ──
        for (let pi=0;pi<20;pi++) {
          const pxp=room.S*2+((t*7+pi*58)%(W-room.S*4));
          const pyp=topY+90+Math.sin(t*0.4+pi*0.6)*28+(pi%6)*18;
          const palpha=Math.sin(t*1.1+pi*0.85)*0.05+0.05;
          ctx.fillStyle=`rgba(255,153,51,${palpha})`;
          ctx.beginPath(); ctx.arc(pxp,pyp,pi%3===0?4:2,0,Math.PI*2); ctx.fill();
        }

      } else if (!this.map?.config?.galactica && !this.map?.config?.blitz) {
        // ── Default Bar (other maps) ───────────────────
        ctx.fillStyle = "#2a1508";
        ctx.strokeStyle = "#7a4520";
        ctx.lineWidth = 2;
        rr(cx - W * 0.44, topY + 4, W * 0.88, 28, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(255,160,80,0.15)";
        ctx.fillRect(cx - W * 0.42, topY + 6, W * 0.84, 10);
        // Bar stools
        for (let si = 0; si < 5; si++) {
          const sx = cx - W * 0.36 + si * ((W * 0.72) / 4);
          ctx.fillStyle = "#8B4513";
          ctx.strokeStyle = "#A0522D";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(sx, topY + 44, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = "#6B3410";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx, topY + 44);
          ctx.lineTo(sx, topY + 38);
          ctx.stroke();
        }
        // Bottles behind bar
        const btColors = [
          "#884422",
          "#225588",
          "#226622",
          "#AA8822",
          "#882244",
        ];
        for (let bi = 0; bi < 7; bi++) {
          const bx3 = cx - W * 0.38 + bi * ((W * 0.76) / 6);
          ctx.fillStyle = btColors[bi % btColors.length];
          ctx.strokeStyle = "#CCAA55";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.roundRect(bx3 - 4, topY - 18, 8, 20, [2, 2, 0, 0]);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#CCAA55BB";
          ctx.beginPath();
          ctx.roundRect(bx3 - 2, topY - 6, 4, 4, 1);
          ctx.fill();
        }
        // ── Pool table (center) ───────────────────────
        ctx.fillStyle = "#1a5522";
        ctx.strokeStyle = "#3a7744";
        ctx.lineWidth = 2;
        rr(cx - W * 0.22, midY - 10, W * 0.44, W * 0.28, 4);
        ctx.fill();
        ctx.stroke();
        // Felt detail
        ctx.fillStyle = "#225533";
        ctx.fillRect(cx - W * 0.2, midY - 8, W * 0.4, W * 0.24);
        // Pockets
        for (const [px2, py2] of [
          [cx - W * 0.22, midY - 10],
          [cx, midY - 10],
          [cx + W * 0.22, midY - 10],
          [cx - W * 0.22, midY - 10 + W * 0.28],
          [cx, midY - 10 + W * 0.28],
          [cx + W * 0.22, midY - 10 + W * 0.28],
        ]) {
          ctx.fillStyle = "#111";
          ctx.beginPath();
          ctx.arc(px2, py2, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Balls
        const bColors2 = [
          "#FFDD00",
          "#FF3300",
          "#0033FF",
          "#FF6600",
          "#880088",
        ];
        for (let bi = 0; bi < 5; bi++) {
          ctx.fillStyle = bColors2[bi];
          ctx.shadowColor = bColors2[bi];
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(cx - W * 0.12 + bi * W * 0.06, midY, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        // Jukebox (right wall)
        ctx.fillStyle = "#220a10";
        ctx.strokeStyle = "#FF4466";
        ctx.lineWidth = 1.5;
        rr(cx + W * 0.3, topY + 8, 36, 62, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#440a18";
        rr(cx + W * 0.3 + 4, topY + 12, 28, 20, 2);
        ctx.fill();
        ctx.fillStyle = "#FF4466";
        ctx.shadowColor = "#FF2244";
        ctx.shadowBlur = 8;
        ctx.fillRect(cx + W * 0.3 + 8, topY + 14, 20, 6);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#FFAACC";
        ctx.font = "bold 5px monospace";
        ctx.textAlign = "center";
        ctx.fillText("JUKEBOX", cx + W * 0.3 + 18, topY + 44);
      } else if (isHardcoreBar) {
        // ═══ HARDCORE: HELLFIRE LOUNGE ═══ (exact mirror of galactica bar, fire colors)
        const t = performance.now() / 1000;
        // Fire palette (replaces galactica PURP/GOLD/CYAN/PINK)
        const PURP = "#FF8800";   // EMBER  (was purple)
        const GOLD = "#FFAA00";   // AMBER  (was gold)
        const CYAN = "#FF5500";   // FLAME  (was cyan)
        const PINK = "#FF2200";   // CRIMSON(was pink)
        // background tint
        ctx.fillStyle = "rgba(20,4,0,0.55)"; ctx.fillRect(0, 0, W, H);

        // Title
        ctx.save();
        ctx.font = "bold 16px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.shadowColor = PURP;
        ctx.shadowBlur = 22;
        ctx.fillText("⚡ HELLFIRE LOUNGE ⚡", cx, topY - 50);
        ctx.shadowBlur = 0;
        ctx.restore();

        // ── FIRE BAR COUNTER (curved top) ──
        ctx.fillStyle = "#1a0400";
        ctx.strokeStyle = PURP;
        ctx.lineWidth = 2;
        ctx.shadowColor = PURP;
        ctx.shadowBlur = 14;
        rr(cx - W * 0.38, topY + 6, W * 0.76, 28, 6);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Counter top surface glow
        const ctGradHC = ctx.createLinearGradient(cx - W * 0.38, 0, cx + W * 0.38, 0);
        ctGradHC.addColorStop(0, "rgba(255,136,0,0)");
        ctGradHC.addColorStop(0.5, "rgba(255,136,0,0.4)");
        ctGradHC.addColorStop(1, "rgba(255,136,0,0)");
        ctx.fillStyle = ctGradHC;
        ctx.fillRect(cx - W * 0.38, topY + 6, W * 0.76, 5);

        // ── FIRE DRINK BOTTLES (on counter shelf) ──
        const hcDrinks = [
          { col: PURP, symbol: "⚡", label: "BLAZE"   },
          { col: CYAN, symbol: "◆",  label: "INFERNO" },
          { col: PINK, symbol: "✦",  label: "MAGMA"   },
          { col: GOLD, symbol: "⬢",  label: "AMBER"   },
          { col: "#FFEE44", symbol: "◎", label: "EMBER" },
        ];
        for (let i = 0; i < hcDrinks.length; i++) {
          const dd = hcDrinks[i];
          const bx = cx - W * 0.3 + i * (W * 0.15);
          const by = topY + 2;
          const lp = Math.sin(t * 1.5 + i * 1.2) * 0.3 + 0.7;
          // Bottle body — tall fire vial
          ctx.fillStyle = dd.col + "30";
          ctx.strokeStyle = dd.col;
          ctx.lineWidth = 1.5;
          ctx.shadowColor = dd.col;
          ctx.shadowBlur = 8 * lp;
          ctx.beginPath();
          ctx.moveTo(bx - 6, by + 36);
          ctx.lineTo(bx - 8, by + 28);
          ctx.lineTo(bx - 5, by + 8);
          ctx.lineTo(bx - 3, by);
          ctx.lineTo(bx + 3, by);
          ctx.lineTo(bx + 5, by + 8);
          ctx.lineTo(bx + 8, by + 28);
          ctx.lineTo(bx + 6, by + 36);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
          // Liquid fill
          ctx.fillStyle = dd.col + "70";
          ctx.beginPath();
          ctx.moveTo(bx - 5.5, by + 36);
          ctx.lineTo(bx - 7, by + 28);
          ctx.lineTo(bx - 4, by + (8 + (1 - lp) * 16));
          ctx.lineTo(bx + 4, by + (8 + (1 - lp) * 16));
          ctx.lineTo(bx + 7, by + 28);
          ctx.lineTo(bx + 5.5, by + 36);
          ctx.closePath();
          ctx.fill();
          // Symbol
          ctx.fillStyle = "#FFF";
          ctx.shadowColor = dd.col;
          ctx.shadowBlur = 5;
          ctx.font = "8px serif";
          ctx.textAlign = "center";
          ctx.fillText(dd.symbol, bx, by + 22);
          ctx.shadowBlur = 0;
          // Label
          ctx.fillStyle = dd.col;
          ctx.font = "5px Orbitron, monospace";
          ctx.fillText(dd.label, bx, by + 42);
        }

        // ── BAR STOOLS along counter ──
        for (let si = 0; si < 5; si++) {
          const bsx = cx - W * 0.3 + si * (W * 0.15);
          const bsy = topY + 56;
          // Stool legs
          ctx.strokeStyle = PURP + "77"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(bsx - 6, bsy + 6); ctx.lineTo(bsx - 8, bsy + 20); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bsx + 6, bsy + 6); ctx.lineTo(bsx + 8, bsy + 20); ctx.stroke();
          // Cross bar
          ctx.beginPath(); ctx.moveTo(bsx - 6, bsy + 14); ctx.lineTo(bsx + 6, bsy + 14); ctx.stroke();
          // Seat
          ctx.fillStyle = "#1a0400"; ctx.strokeStyle = PURP; ctx.lineWidth = 1.5;
          ctx.shadowColor = PURP; ctx.shadowBlur = 5;
          ctx.beginPath(); ctx.ellipse(bsx, bsy, 11, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // ── BAR PATRONS on stools ──
        const hcBarPatrons = [
          { x: cx - W * 0.3 + 0 * (W * 0.15), skin: "#FFDDBB", hair: "#1a1a2a", col: PURP,      gender: "m", drink: PURP      },
          { x: cx - W * 0.3 + 1 * (W * 0.15), skin: "#F0C080", hair: "#AA5522", col: PINK,      gender: "f", drink: PINK      },
          { x: cx - W * 0.3 + 2 * (W * 0.15), skin: "#D4956A", hair: "#2a1a00", col: CYAN,      gender: "m", drink: CYAN      },
          { x: cx - W * 0.3 + 3 * (W * 0.15), skin: "#EECCAA", hair: "#1a002a", col: GOLD,      gender: "f", drink: GOLD      },
          { x: cx - W * 0.3 + 4 * (W * 0.15), skin: "#DDBB99", hair: "#332211", col: "#FFEE44", gender: "m", drink: "#FFEE44" },
        ];
        for (const bp of hcBarPatrons) {
          const bpx = bp.x, bpy = topY + 36;
          ctx.save();
          // Body
          ctx.fillStyle = bp.col + "CC"; ctx.shadowColor = bp.col; ctx.shadowBlur = 5;
          rr(bpx - 8, bpy - 4, 16, 18, 3); ctx.fill(); ctx.shadowBlur = 0;
          if (bp.gender === "f") {
            ctx.fillStyle = bp.col + "55";
            ctx.beginPath(); ctx.moveTo(bpx-8,bpy+10); ctx.lineTo(bpx-10,bpy+20); ctx.lineTo(bpx+10,bpy+20); ctx.lineTo(bpx+8,bpy+10); ctx.closePath(); ctx.fill();
          }
          // Neck
          ctx.fillStyle = bp.skin; ctx.fillRect(bpx-2, bpy-6, 4, 4);
          // Head
          ctx.beginPath(); ctx.arc(bpx, bpy-13, 9, 0, Math.PI*2); ctx.fill();
          // Hair
          ctx.fillStyle = bp.hair;
          if (bp.gender === "f") {
            ctx.beginPath(); ctx.arc(bpx, bpy-16, 8, Math.PI, 0); ctx.fill();
            ctx.fillRect(bpx-8, bpy-18, 4, 12); ctx.fillRect(bpx+4, bpy-18, 4, 12);
          } else {
            ctx.fillRect(bpx-7, bpy-19, 14, 7);
          }
          // Eyes
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.ellipse(bpx-3.5, bpy-14, 2.2, 1.8, 0, 0, Math.PI*2);
          ctx.ellipse(bpx+3.5, bpy-14, 2.2, 1.8, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = bp.col; ctx.shadowColor = bp.col; ctx.shadowBlur = 3;
          ctx.beginPath(); ctx.arc(bpx-3.5, bpy-14, 1.2, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(bpx+3.5, bpy-14, 1.2, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#000";
          ctx.beginPath(); ctx.arc(bpx-3.5, bpy-14, 0.5, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(bpx+3.5, bpy-14, 0.5, 0, Math.PI*2); ctx.fill();
          // Nose
          ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.arc(bpx, bpy-11, 1.2, 0, Math.PI*2); ctx.fill();
          // Mouth
          ctx.strokeStyle = bp.gender==="f" ? "#EE4466" : "#AA6644"; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(bpx, bpy-8.5, 3, 0.1, Math.PI-0.1); ctx.stroke();
          // Arm holding drink at counter
          ctx.strokeStyle = bp.skin; ctx.lineWidth = 3; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(bpx+8, bpy+2); ctx.lineTo(bpx+16, bpy-4); ctx.stroke();
          ctx.lineCap = "butt";
          // Drink
          ctx.fillStyle = bp.drink + "50"; ctx.strokeStyle = bp.drink; ctx.lineWidth = 1;
          ctx.shadowColor = bp.drink; ctx.shadowBlur = 7;
          ctx.beginPath();
          ctx.moveTo(bpx+13, bpy-14); ctx.lineTo(bpx+11, bpy-6); ctx.lineTo(bpx+20, bpy-6); ctx.lineTo(bpx+18, bpy-14);
          ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
          ctx.restore();
        }

        // ── 3 CIRCULAR FIRE TABLES with seating ──
        const hcTableData = [
          { x: cx - W * 0.3, y: midY - 8, col: PURP },
          { x: cx,            y: midY + 6, col: CYAN },
          { x: cx + W * 0.28, y: midY - 8, col: GOLD },
        ];
        for (const td of hcTableData) {
          const hover = Math.sin(t * 1.2 + td.x * 0.01) * 2;
          // Table hover shadow
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.beginPath();
          ctx.ellipse(td.x + 2, td.y + 16 + hover, 20, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          // Table surface
          ctx.fillStyle = "#1a0400";
          ctx.strokeStyle = td.col;
          ctx.lineWidth = 2;
          ctx.shadowColor = td.col;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(td.x, td.y + hover, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
          // Inner ring
          ctx.strokeStyle = td.col + "55";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(td.x, td.y + hover, 16, 0, Math.PI * 2);
          ctx.stroke();
          // Center fire-candle glow
          const cp = Math.sin(t * 3 + td.x) * 0.5 + 0.5;
          ctx.fillStyle = `rgba(255,180,50,${0.5 + cp * 0.5})`;
          ctx.shadowColor = td.col;
          ctx.shadowBlur = 8 + cp * 6;
          ctx.beginPath();
          ctx.arc(td.x, td.y + hover, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          // 3 stools around table
          for (let si = 0; si < 3; si++) {
            const sa = (si / 3) * Math.PI * 2 - Math.PI / 2;
            const sx = td.x + Math.cos(sa) * 32;
            const sy = td.y + hover + Math.sin(sa) * 32;
            ctx.fillStyle = "#1a0400";
            ctx.strokeStyle = td.col + "88";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(sx, sy, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }

        // ── PATRONS at tables ──
        const hcTablePatrons = [
          { tx: cx - W * 0.3,      ty: midY - 8,      skin: "#FFDDBB", hair: "#1a1a2a", col: PURP, gender: "m" },
          { tx: cx - W * 0.3 + 28, ty: midY - 8 - 26, skin: "#F0C080", hair: "#AA5522", col: PINK, gender: "f" },
          { tx: cx,                 ty: midY + 6,       skin: "#D4956A", hair: "#2a1a00", col: CYAN, gender: "m" },
          { tx: cx + 28,            ty: midY + 6 - 26,  skin: "#EECCAA", hair: "#332211", col: GOLD, gender: "f" },
          { tx: cx + W * 0.28,      ty: midY - 8,       skin: "#FFDDBB", hair: "#1a002a", col: GOLD, gender: "f" },
          { tx: cx + W * 0.28 - 28, ty: midY - 8 - 26,  skin: "#DDBB99", hair: "#1a1a1a", col: PURP, gender: "m" },
        ];
        for (const p of hcTablePatrons) {
          const px2 = p.tx, py2 = p.ty;
          ctx.save();
          // Shadow
          ctx.fillStyle = "rgba(0,0,0,0.2)";
          ctx.beginPath(); ctx.ellipse(px2, py2 + 4, 8, 3, 0, 0, Math.PI*2); ctx.fill();
          // Body
          ctx.fillStyle = p.col + "CC"; ctx.shadowColor = p.col; ctx.shadowBlur = 6;
          rr(px2 - 8, py2 - 6, 16, 18, 3); ctx.fill(); ctx.shadowBlur = 0;
          if (p.gender === "f") {
            ctx.fillStyle = p.col + "66";
            ctx.beginPath(); ctx.moveTo(px2-8,py2+8); ctx.lineTo(px2-11,py2+18); ctx.lineTo(px2+11,py2+18); ctx.lineTo(px2+8,py2+8); ctx.closePath(); ctx.fill();
          }
          // Neck
          ctx.fillStyle = p.skin; ctx.fillRect(px2 - 3, py2 - 8, 6, 4);
          // Head
          ctx.beginPath(); ctx.arc(px2, py2 - 15, 9, 0, Math.PI*2); ctx.fill();
          // Hair
          ctx.fillStyle = p.hair;
          if (p.gender === "f") {
            ctx.beginPath(); ctx.arc(px2, py2 - 18, 8, Math.PI, 0); ctx.fill();
            ctx.fillRect(px2 - 9, py2 - 20, 4, 12);
            ctx.fillRect(px2 + 5, py2 - 20, 4, 12);
          } else {
            ctx.fillRect(px2 - 7, py2 - 21, 14, 7);
          }
          // Eyes
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.ellipse(px2-3.5, py2-16, 2.2, 1.8, 0, 0, Math.PI*2);
          ctx.ellipse(px2+3.5, py2-16, 2.2, 1.8, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = p.col; ctx.shadowColor = p.col; ctx.shadowBlur = 3;
          ctx.beginPath(); ctx.arc(px2-3.5, py2-16, 1.2, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(px2+3.5, py2-16, 1.2, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#000";
          ctx.beginPath(); ctx.arc(px2-3.5, py2-16, 0.5, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(px2+3.5, py2-16, 0.5, 0, Math.PI*2); ctx.fill();
          // Nose
          ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.arc(px2, py2-13, 1.2, 0, Math.PI*2); ctx.fill();
          // Mouth (smiling)
          ctx.strokeStyle = p.gender==="f" ? "#EE4466" : "#AA6644"; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(px2, py2-10.5, 3, 0.1, Math.PI-0.1); ctx.stroke();
          // Arm holding drink
          ctx.strokeStyle = p.skin; ctx.lineWidth = 3; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(px2+8, py2); ctx.lineTo(px2+16, py2-8); ctx.stroke();
          ctx.lineCap = "butt";
          // Drink in hand
          const drinkC = p.col;
          ctx.fillStyle = drinkC + "55"; ctx.strokeStyle = drinkC; ctx.lineWidth = 1;
          ctx.shadowColor = drinkC; ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.moveTo(px2+12, py2-18); ctx.lineTo(px2+10, py2-10); ctx.lineTo(px2+20, py2-10); ctx.lineTo(px2+18, py2-18); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.restore();
        }

        // ── FIRE JUKEBOX (right) ──
        const jxHC = cx + W * 0.3, jyHC = topY + 10;
        ctx.fillStyle = "#1a0400";
        ctx.strokeStyle = PINK;
        ctx.lineWidth = 2;
        ctx.shadowColor = PINK;
        ctx.shadowBlur = 12;
        rr(jxHC, jyHC, 44, 68, 6);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Rotating fire hologram inside
        ctx.save();
        ctx.translate(jxHC + 22, jyHC + 30);
        ctx.rotate(t * 0.5);
        for (let ri = 0; ri < 6; ri++) {
          const ra = (ri / 6) * Math.PI * 2;
          const rp = Math.sin(t * 2 + ri) * 0.5 + 0.5;
          ctx.fillStyle = `rgba(255,100,0,${0.2 + rp * 0.4})`;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, 14, ra, ra + Math.PI / 3);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = PINK;
        ctx.shadowColor = PINK;
        ctx.shadowBlur = 8;
        ctx.font = "5px monospace";
        ctx.textAlign = "center";
        ctx.fillText("FIRE JUKEBOX", jxHC + 22, jyHC + 60);
        ctx.shadowBlur = 0;

        // Ember particles
        for (let i = 0; i < 12; i++) {
          const nx = (t * 18 + i * 75) % W;
          const ny = topY + 40 + Math.sin(t + i * 0.8) * 20 + (i * (H * 0.55)) / 12;
          const na = Math.sin(t * 1.5 + i) * 0.3 + 0.35;
          ctx.fillStyle = i % 3 === 0 ? `rgba(255,136,0,${na})` : i % 3 === 1 ? `rgba(255,85,0,${na})` : `rgba(255,200,0,${na})`;
          ctx.beginPath(); ctx.arc(nx, ny, i % 4 === 0 ? 2 : 1, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        // ═══ GALACTICA: NEBULA CANTINA ═══
        const t = performance.now() / 1000;
        const PURP = "#AA88FF",
          GOLD = "#FFDD55",
          CYAN = "#55DDFF",
          PINK = "#FF55CC";

        // Title
        ctx.save();
        ctx.font = "bold 16px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.shadowColor = PURP;
        ctx.shadowBlur = 22;
        ctx.fillText("◈ NEBULA CANTINA ◈", cx, topY - 50);
        ctx.shadowBlur = 0;
        ctx.restore();

        // ── COSMIC BAR COUNTER (wide, curved top) ──
        ctx.fillStyle = "#0c0420";
        ctx.strokeStyle = PURP;
        ctx.lineWidth = 2;
        ctx.shadowColor = PURP;
        ctx.shadowBlur = 14;
        rr(cx - W * 0.44, topY + 6, W * 0.88, 32, 8);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Counter top surface glow
        const ctGrad = ctx.createLinearGradient(cx - W * 0.44, 0, cx + W * 0.44, 0);
        ctGrad.addColorStop(0, "rgba(170,136,255,0)");
        ctGrad.addColorStop(0.5, "rgba(170,136,255,0.45)");
        ctGrad.addColorStop(1, "rgba(170,136,255,0)");
        ctx.fillStyle = ctGrad;
        ctx.fillRect(cx - W * 0.44, topY + 6, W * 0.88, 6);

        // ── BACK SHELF behind counter ──
        ctx.fillStyle = "#07011a";
        ctx.strokeStyle = "rgba(170,136,255,0.35)";
        ctx.lineWidth = 1;
        rr(cx - W * 0.42, topY - 52, W * 0.84, 56, 4);
        ctx.fill(); ctx.stroke();
        // Shelf dividers
        ctx.fillStyle = "#1a0040";
        ctx.fillRect(cx - W * 0.42, topY - 34, W * 0.84, 3);
        ctx.fillRect(cx - W * 0.42, topY - 16, W * 0.84, 3);
        // Shelf bottles (3 rows)
        const shelfColors = ["#AA66FF","#55DDFF","#FF55CC","#FFDD44","#88FFCC","#FF8855","#AA88FF","#55FF88"];
        for (let row = 0; row < 3; row++) {
          const sy = topY - 50 + row * 18;
          for (let col = 0; col < 8; col++) {
            const sc = shelfColors[(col + row) % shelfColors.length];
            const bx2 = cx - W * 0.40 + col * (W * 0.80 / 7);
            const lp = Math.sin(t * 1.2 + col * 0.9 + row) * 0.3 + 0.7;
            ctx.fillStyle = sc + "40"; ctx.strokeStyle = sc; ctx.lineWidth = 1;
            ctx.shadowColor = sc; ctx.shadowBlur = 4 * lp;
            ctx.beginPath();
            ctx.moveTo(bx2 - 4, sy + 14); ctx.lineTo(bx2 - 5, sy + 6);
            ctx.lineTo(bx2 - 2, sy + 2); ctx.lineTo(bx2 + 2, sy + 2);
            ctx.lineTo(bx2 + 5, sy + 6); ctx.lineTo(bx2 + 4, sy + 14);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }

        // (Bartender NPC is rendered as interactive BuildingNPC by game.js)

        // ── ALIEN DRINK BOTTLES (on counter, in front of shelf) ──
        const drinkData = [
          { col: PURP, symbol: "◈", label: "VOID" },
          { col: CYAN, symbol: "⬡", label: "CRYO" },
          { col: PINK, symbol: "✦", label: "NOVA" },
          { col: GOLD, symbol: "⬢", label: "SOLAR" },
          { col: "#88FFCC", symbol: "◎", label: "NEBULA" },
          { col: "#FF8855", symbol: "⬟", label: "EMBER" },
        ];
        for (let i = 0; i < drinkData.length; i++) {
          const dd = drinkData[i];
          const bx = cx - W * 0.36 + i * (W * 0.145);
          const by = topY + 2;
          const lp = Math.sin(t * 1.5 + i * 1.2) * 0.3 + 0.7;
          // Bottle body — tall hexagonal vial
          ctx.fillStyle = dd.col + "30";
          ctx.strokeStyle = dd.col;
          ctx.lineWidth = 1.5;
          ctx.shadowColor = dd.col;
          ctx.shadowBlur = 8 * lp;
          ctx.beginPath();
          ctx.moveTo(bx - 6, by + 36);
          ctx.lineTo(bx - 8, by + 28);
          ctx.lineTo(bx - 5, by + 8);
          ctx.lineTo(bx - 3, by);
          ctx.lineTo(bx + 3, by);
          ctx.lineTo(bx + 5, by + 8);
          ctx.lineTo(bx + 8, by + 28);
          ctx.lineTo(bx + 6, by + 36);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
          // Liquid fill
          ctx.fillStyle = dd.col + "70";
          ctx.beginPath();
          ctx.moveTo(bx - 5.5, by + 36);
          ctx.lineTo(bx - 7, by + 28);
          ctx.lineTo(bx - 4, by + (8 + (1 - lp) * 16));
          ctx.lineTo(bx + 4, by + (8 + (1 - lp) * 16));
          ctx.lineTo(bx + 7, by + 28);
          ctx.lineTo(bx + 5.5, by + 36);
          ctx.closePath();
          ctx.fill();
          // Symbol
          ctx.fillStyle = "#FFF";
          ctx.shadowColor = dd.col;
          ctx.shadowBlur = 5;
          ctx.font = "8px serif";
          ctx.textAlign = "center";
          ctx.fillText(dd.symbol, bx, by + 22);
          ctx.shadowBlur = 0;
          // Label
          ctx.fillStyle = dd.col;
          ctx.font = "5px Orbitron, monospace";
          ctx.fillText(dd.label, bx, by + 42);
        }

        // ── BAR STOOLS along counter ──────────────────
        for (let si = 0; si < 6; si++) {
          const bsx = cx - W * 0.36 + si * (W * 0.145);
          const bsy = topY + 60;
          // Stool legs
          ctx.strokeStyle = PURP + "77"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(bsx - 6, bsy + 6); ctx.lineTo(bsx - 8, bsy + 20); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bsx + 6, bsy + 6); ctx.lineTo(bsx + 8, bsy + 20); ctx.stroke();
          // Cross bar
          ctx.beginPath(); ctx.moveTo(bsx - 6, bsy + 14); ctx.lineTo(bsx + 6, bsy + 14); ctx.stroke();
          // Seat
          ctx.fillStyle = "#1a0040"; ctx.strokeStyle = PURP; ctx.lineWidth = 1.5;
          ctx.shadowColor = PURP; ctx.shadowBlur = 5;
          ctx.beginPath(); ctx.ellipse(bsx, bsy, 11, 6, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
          ctx.shadowBlur = 0;
        }
        // ── BAR PATRONS on stools ─────────────────────
        const barPatrons = [
          { x: cx - W * 0.36 + 0 * (W * 0.145), skin: "#FFDDBB", hair: "#1a1a2a", col: PURP, gender: "m", drink: PURP },
          { x: cx - W * 0.36 + 1 * (W * 0.145), skin: "#F0C080", hair: "#AA5522", col: PINK, gender: "f", drink: PINK },
          { x: cx - W * 0.36 + 2 * (W * 0.145), skin: "#D4956A", hair: "#2a1a00", col: CYAN, gender: "m", drink: CYAN },
          { x: cx - W * 0.36 + 3 * (W * 0.145), skin: "#EECCAA", hair: "#1a002a", col: GOLD, gender: "f", drink: GOLD },
          { x: cx - W * 0.36 + 4 * (W * 0.145), skin: "#DDBB99", hair: "#332211", col: "#88FFCC", gender: "m", drink: "#88FFCC" },
          { x: cx - W * 0.36 + 5 * (W * 0.145), skin: "#FFE0CC", hair: "#220044", col: "#FF8855", gender: "f", drink: "#FF8855" },
        ];
        for (const bp of barPatrons) {
          const bpx = bp.x, bpy = topY + 40;
          ctx.save();
          // Body
          ctx.fillStyle = bp.col + "CC"; ctx.shadowColor = bp.col; ctx.shadowBlur = 5;
          rr(bpx - 8, bpy - 4, 16, 18, 3); ctx.fill(); ctx.shadowBlur = 0;
          if (bp.gender === "f") {
            ctx.fillStyle = bp.col + "55";
            ctx.beginPath(); ctx.moveTo(bpx-8,bpy+10); ctx.lineTo(bpx-10,bpy+20); ctx.lineTo(bpx+10,bpy+20); ctx.lineTo(bpx+8,bpy+10); ctx.closePath(); ctx.fill();
          }
          // Neck
          ctx.fillStyle = bp.skin; ctx.fillRect(bpx-2, bpy-6, 4, 4);
          // Head
          ctx.beginPath(); ctx.arc(bpx, bpy-13, 9, 0, Math.PI*2); ctx.fill();
          // Hair
          ctx.fillStyle = bp.hair;
          if (bp.gender === "f") {
            ctx.beginPath(); ctx.arc(bpx, bpy-16, 8, Math.PI, 0); ctx.fill();
            ctx.fillRect(bpx-8, bpy-18, 4, 12); ctx.fillRect(bpx+4, bpy-18, 4, 12);
          } else {
            ctx.fillRect(bpx-7, bpy-19, 14, 7);
          }
          // Eyes
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.ellipse(bpx-3.5, bpy-14, 2.2, 1.8, 0, 0, Math.PI*2);
          ctx.ellipse(bpx+3.5, bpy-14, 2.2, 1.8, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = bp.col; ctx.shadowColor = bp.col; ctx.shadowBlur = 3;
          ctx.beginPath(); ctx.arc(bpx-3.5, bpy-14, 1.2, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(bpx+3.5, bpy-14, 1.2, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#000";
          ctx.beginPath(); ctx.arc(bpx-3.5, bpy-14, 0.5, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(bpx+3.5, bpy-14, 0.5, 0, Math.PI*2); ctx.fill();
          // Nose
          ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.arc(bpx, bpy-11, 1.2, 0, Math.PI*2); ctx.fill();
          // Mouth
          ctx.strokeStyle = bp.gender==="f" ? "#EE4466" : "#AA6644"; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(bpx, bpy-8.5, 3, 0.1, Math.PI-0.1); ctx.stroke();
          // Arm holding drink at counter
          ctx.strokeStyle = bp.skin; ctx.lineWidth = 3; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(bpx+8, bpy+2); ctx.lineTo(bpx+16, bpy-4); ctx.stroke();
          ctx.lineCap = "butt";
          // Drink
          ctx.fillStyle = bp.drink + "50"; ctx.strokeStyle = bp.drink; ctx.lineWidth = 1;
          ctx.shadowColor = bp.drink; ctx.shadowBlur = 7;
          ctx.beginPath();
          ctx.moveTo(bpx+13, bpy-14); ctx.lineTo(bpx+11, bpy-6); ctx.lineTo(bpx+20, bpy-6); ctx.lineTo(bpx+18, bpy-14);
          ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
          ctx.restore();
        }

        // ── 3 CIRCULAR HOVER TABLES with alien seating ──
        const tableData = [
          { x: cx - W * 0.3, y: midY - 8, col: PURP },
          { x: cx, y: midY + 6, col: CYAN },
          { x: cx + W * 0.28, y: midY - 8, col: GOLD },
        ];
        for (const td of tableData) {
          const hover = Math.sin(t * 1.2 + td.x * 0.01) * 2;
          // Table hover shadow
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.beginPath();
          ctx.ellipse(td.x + 2, td.y + 16 + hover, 20, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          // Table surface
          ctx.fillStyle = "#0c0420";
          ctx.strokeStyle = td.col;
          ctx.lineWidth = 2;
          ctx.shadowColor = td.col;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(td.x, td.y + hover, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
          // Inner ring
          ctx.strokeStyle = td.col + "55";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(td.x, td.y + hover, 16, 0, Math.PI * 2);
          ctx.stroke();
          // Center holo-candle
          const cp = Math.sin(t * 3 + td.x) * 0.5 + 0.5;
          ctx.fillStyle = `rgba(220,180,255,${0.5 + cp * 0.5})`;
          ctx.shadowColor = td.col;
          ctx.shadowBlur = 8 + cp * 6;
          ctx.beginPath();
          ctx.arc(td.x, td.y + hover, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          // 3 floating alien stools
          for (let si = 0; si < 3; si++) {
            const sa = (si / 3) * Math.PI * 2 - Math.PI / 2;
            const sx = td.x + Math.cos(sa) * 32;
            const sy = td.y + hover + Math.sin(sa) * 32;
            ctx.fillStyle = "#0a0318";
            ctx.strokeStyle = td.col + "88";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(sx, sy, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }

        // ── PATRONS at hover tables ──
        const patronData = [
          { tx: cx - W * 0.3, ty: midY - 8, skin: "#FFDDBB", hair: "#1a1a2a", col: PURP, gender: "m" },
          { tx: cx - W * 0.3 + 28, ty: midY - 8 - 26, skin: "#F0C080", hair: "#AA5522", col: PINK, gender: "f" },
          { tx: cx, ty: midY + 6, skin: "#D4956A", hair: "#2a1a00", col: CYAN, gender: "m" },
          { tx: cx + 28, ty: midY + 6 - 26, skin: "#EECCAA", hair: "#332211", col: GOLD, gender: "f" },
          { tx: cx + W * 0.28, ty: midY - 8, skin: "#FFDDBB", hair: "#1a002a", col: GOLD, gender: "f" },
          { tx: cx + W * 0.28 - 28, ty: midY - 8 - 26, skin: "#DDBB99", hair: "#1a1a1a", col: PURP, gender: "m" },
        ];
        for (const p of patronData) {
          const px2 = p.tx, py2 = p.ty;
          ctx.save();
          // Shadow
          ctx.fillStyle = "rgba(0,0,0,0.2)";
          ctx.beginPath(); ctx.ellipse(px2, py2 + 4, 8, 3, 0, 0, Math.PI*2); ctx.fill();
          // Body
          ctx.fillStyle = p.col + "CC"; ctx.shadowColor = p.col; ctx.shadowBlur = 6;
          rr(px2 - 8, py2 - 6, 16, 18, 3); ctx.fill(); ctx.shadowBlur = 0;
          if (p.gender === "f") {
            ctx.fillStyle = p.col + "66";
            ctx.beginPath(); ctx.moveTo(px2-8,py2+8); ctx.lineTo(px2-11,py2+18); ctx.lineTo(px2+11,py2+18); ctx.lineTo(px2+8,py2+8); ctx.closePath(); ctx.fill();
          }
          // Neck
          ctx.fillStyle = p.skin; ctx.fillRect(px2 - 3, py2 - 8, 6, 4);
          // Head
          ctx.beginPath(); ctx.arc(px2, py2 - 15, 9, 0, Math.PI*2); ctx.fill();
          // Hair
          ctx.fillStyle = p.hair;
          if (p.gender === "f") {
            ctx.beginPath(); ctx.arc(px2, py2 - 18, 8, Math.PI, 0); ctx.fill();
            ctx.fillRect(px2 - 9, py2 - 20, 4, 12);
            ctx.fillRect(px2 + 5, py2 - 20, 4, 12);
          } else {
            ctx.fillRect(px2 - 7, py2 - 21, 14, 7);
          }
          // Eyes
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.ellipse(px2-3.5, py2-16, 2.2, 1.8, 0, 0, Math.PI*2);
          ctx.ellipse(px2+3.5, py2-16, 2.2, 1.8, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = p.col; ctx.shadowColor = p.col; ctx.shadowBlur = 3;
          ctx.beginPath(); ctx.arc(px2-3.5, py2-16, 1.2, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(px2+3.5, py2-16, 1.2, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#000";
          ctx.beginPath(); ctx.arc(px2-3.5, py2-16, 0.5, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(px2+3.5, py2-16, 0.5, 0, Math.PI*2); ctx.fill();
          // Nose
          ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.arc(px2, py2-13, 1.2, 0, Math.PI*2); ctx.fill();
          // Mouth (smiling)
          ctx.strokeStyle = p.gender==="f" ? "#EE4466" : "#AA6644"; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(px2, py2-10.5, 3, 0.1, Math.PI-0.1); ctx.stroke();
          // Arm holding alien drink
          ctx.strokeStyle = p.skin; ctx.lineWidth = 3; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(px2+8, py2); ctx.lineTo(px2+16, py2-8); ctx.stroke();
          ctx.lineCap = "butt";
          // Alien drink in hand
          const drinkC = p.drink || PURP;
          ctx.fillStyle = drinkC + "55"; ctx.strokeStyle = drinkC; ctx.lineWidth = 1;
          ctx.shadowColor = drinkC; ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.moveTo(px2+12, py2-18); ctx.lineTo(px2+10, py2-10); ctx.lineTo(px2+20, py2-10); ctx.lineTo(px2+18, py2-18); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.restore();
        }

        // ── HOLOGRAPHIC JUKEBOX (right) ──
        const jx = cx + W * 0.3,
          jy = topY + 10;
        ctx.fillStyle = "#0a0220";
        ctx.strokeStyle = PINK;
        ctx.lineWidth = 2;
        ctx.shadowColor = PINK;
        ctx.shadowBlur = 12;
        rr(jx, jy, 44, 68, 6);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Rotating hologram inside
        ctx.save();
        ctx.translate(jx + 22, jy + 30);
        ctx.rotate(t * 0.5);
        for (let ri = 0; ri < 6; ri++) {
          const ra = (ri / 6) * Math.PI * 2;
          const rp = Math.sin(t * 2 + ri) * 0.5 + 0.5;
          ctx.fillStyle = `rgba(255,100,220,${0.2 + rp * 0.4})`;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, 14, ra, ra + Math.PI / 3);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = PINK;
        ctx.shadowColor = PINK;
        ctx.shadowBlur = 8;
        ctx.font = "5px monospace";
        ctx.textAlign = "center";
        ctx.fillText("HOLO JUKEBOX", jx + 22, jy + 60);
        ctx.shadowBlur = 0;

        // Ambient nebula particles
        for (let i = 0; i < 12; i++) {
          const nx = (t * 18 + i * 75) % W;
          const ny =
            topY + 40 + Math.sin(t + i * 0.8) * 20 + (i * (H * 0.55)) / 12;
          const na = Math.sin(t * 1.5 + i) * 0.3 + 0.35;
          ctx.fillStyle =
            i % 3 === 0
              ? `rgba(170,136,255,${na})`
              : i % 3 === 1
                ? `rgba(85,221,255,${na})`
                : `rgba(255,85,204,${na})`;
          ctx.beginPath();
          ctx.arc(nx, ny, i % 4 === 0 ? 2 : 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (type === 12) {
      const t = performance.now() / 1000;
      const isWasteland = !!this.map?.config?.wasteland;
      if (isDino) {
        // ═══ DINO WORLD: JUNGLE TRADING POST ═══
        const LEAF="#66DD44",AMBER="#FFCC44",BONE="#F0E8C0",MOSS="#44AA22";
        const LEAFr="102,221,68",AMBERr="255,204,68";
        const drawTribalPerson12=(px,py,bodyCol,skinCol,hairCol,label)=>{
          ctx.fillStyle='rgba(0,0,0,0.28)';ctx.beginPath();ctx.ellipse(px,py+9,13,6,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#2a1a08';ctx.fillRect(px-6,py+2,5,13);ctx.fillRect(px+1,py+2,5,13);
          ctx.fillStyle=skinCol;ctx.fillRect(px-7,py+12,7,5);ctx.fillRect(px,py+12,7,5);
          ctx.fillStyle=bodyCol;ctx.beginPath();ctx.roundRect(px-10,py-14,20,24,3);ctx.fill();
          ctx.strokeStyle='rgba(255,200,0,0.4)';ctx.lineWidth=1.5;
          ctx.beginPath();ctx.moveTo(px-8,py-8);ctx.lineTo(px+8,py-8);ctx.stroke();
          ctx.beginPath();ctx.moveTo(px-8,py-2);ctx.lineTo(px+8,py-2);ctx.stroke();
          ctx.strokeStyle=bodyCol;ctx.lineWidth=6;ctx.lineCap='round';
          ctx.beginPath();ctx.moveTo(px-10,py-6);ctx.lineTo(px-19,py+4);ctx.stroke();
          ctx.beginPath();ctx.moveTo(px+10,py-6);ctx.lineTo(px+19,py+4);ctx.stroke();
          ctx.lineCap='butt';ctx.fillStyle=skinCol;
          ctx.beginPath();ctx.arc(px-19,py+4,4,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.arc(px+19,py+4,4,0,Math.PI*2);ctx.fill();
          ctx.fillStyle=skinCol;ctx.fillRect(px-3,py-16,6,4);
          ctx.beginPath();ctx.arc(px,py-22,9,0,Math.PI*2);ctx.fill();
          ctx.fillStyle=hairCol;ctx.beginPath();ctx.arc(px,py-25,8,Math.PI,0);ctx.fill();ctx.fillRect(px-8,py-26,16,5);
          ctx.fillStyle='#fff';
          ctx.beginPath();ctx.ellipse(px-3.5,py-23,2,1.5,0,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.ellipse(px+3.5,py-23,2,1.5,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#2a1800';
          ctx.beginPath();ctx.arc(px-3.5,py-23,1,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.arc(px+3.5,py-23,1,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='rgba(0,0,0,0.2)';ctx.beginPath();ctx.arc(px,py-20,1.2,0,Math.PI*2);ctx.fill();
          ctx.strokeStyle='rgba(100,40,20,0.7)';ctx.lineWidth=1;
          ctx.beginPath();ctx.arc(px,py-17.5,2.5,0.15,Math.PI-0.15);ctx.stroke();
          if(label){ctx.fillStyle=AMBER;ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.shadowColor=LEAF;ctx.shadowBlur=6;ctx.fillText(label,px,py-36);ctx.shadowBlur=0;}
        };
        // Title
        ctx.save();ctx.font="bold 13px Orbitron, monospace";ctx.textAlign="center";
        ctx.fillStyle=BONE;ctx.shadowColor=LEAF;ctx.shadowBlur=16;
        ctx.fillText("🦴 JUNGLE TRADE 🦴",cx,topY+22);ctx.shadowBlur=0;ctx.restore();
        // Divider
        const dg=ctx.createLinearGradient(cx-W*0.35,0,cx+W*0.35,0);
        dg.addColorStop(0,"rgba(102,221,68,0)");dg.addColorStop(0.5,"rgba(102,221,68,0.8)");dg.addColorStop(1,"rgba(102,221,68,0)");
        ctx.strokeStyle=dg;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx-W*0.35,topY+30);ctx.lineTo(cx+W*0.35,topY+30);ctx.stroke();
        // Left shelf — fossil specimens
        ctx.fillStyle="#0a1a06";ctx.strokeStyle=MOSS;ctx.lineWidth=1.5;
        rr(W*0.04,topY+34,W*0.22,H*0.38,3);ctx.fill();ctx.stroke();
        ctx.fillStyle="#162e0c";ctx.fillRect(W*0.04,topY+62,W*0.22,3);ctx.fillRect(W*0.04,topY+86,W*0.22,3);ctx.fillRect(W*0.04,topY+110,W*0.22,3);
        const shelfItems=[{x:W*0.06,y:topY+38,w:18,h:16,c:AMBER},{x:W*0.06+22,y:topY+40,w:14,h:12,c:BONE},
          {x:W*0.06,y:topY+66,w:20,h:14,c:LEAF},{x:W*0.06+24,y:topY+68,w:16,h:12,c:AMBER},
          {x:W*0.06,y:topY+90,w:16,h:18,c:BONE},{x:W*0.06+20,y:topY+92,w:18,h:14,c:LEAF}];
        for(const si of shelfItems){ctx.fillStyle="#050e03";rr(si.x,si.y,si.w,si.h,2);ctx.fill();ctx.fillStyle=si.c;ctx.shadowColor=si.c;ctx.shadowBlur=4;ctx.fillRect(si.x+2,si.y+2,si.w-4,si.h-4);ctx.shadowBlur=0;}
        // Center display counter
        const counterX=cx-60,counterY=midY+45,counterW=120,counterH=32;
        ctx.fillStyle="rgba(0,0,0,0.4)";ctx.fillRect(counterX+4,counterY+counterH+2,counterW,5);
        const cGrad=ctx.createLinearGradient(counterX,counterY,counterX,counterY+counterH);
        cGrad.addColorStop(0,"#1e3c14");cGrad.addColorStop(1,"#0e1e08");
        ctx.fillStyle=cGrad;rr(counterX,counterY,counterW,counterH,6);ctx.fill();
        ctx.fillStyle=BONE;ctx.fillRect(counterX-2,counterY,counterW+4,5);
        ctx.strokeStyle=LEAF;ctx.lineWidth=2;ctx.shadowColor=LEAF;ctx.shadowBlur=8;
        ctx.beginPath();ctx.moveTo(counterX,counterY+2);ctx.lineTo(counterX+counterW,counterY+2);ctx.stroke();ctx.shadowBlur=0;
        // Glowing specimen jar on counter
        const jarX=cx+50,jarY=counterY-20;
        ctx.fillStyle="#0a1a06";ctx.strokeStyle=LEAF;ctx.lineWidth=1.5;
        rr(jarX-10,jarY,20,28,10);ctx.fill();ctx.stroke();
        const jarGrad=ctx.createRadialGradient(jarX,jarY+14,2,jarX,jarY+14,10);
        jarGrad.addColorStop(0,`rgba(${LEAFr},0.8)`);jarGrad.addColorStop(1,`rgba(${LEAFr},0.1)`);
        ctx.fillStyle=jarGrad;ctx.shadowColor=LEAF;ctx.shadowBlur=10;
        ctx.beginPath();ctx.ellipse(jarX,jarY+14,7,11,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        ctx.fillStyle=BONE;ctx.font="bold 5px monospace";ctx.textAlign="center";ctx.fillText("SAMPLE",jarX,jarY+32);
        // Small items on counter
        const cItems=[{c:AMBER,l:"EGG"},{c:LEAF,l:"CLAW"},{c:BONE,l:"FANG"}];
        for(let i=0;i<3;i++){
          const ix=counterX+18+i*30,iy=counterY+8;
          ctx.fillStyle="#060e03";rr(ix-9,iy,18,14,2);ctx.fill();
          ctx.fillStyle=cItems[i].c;ctx.shadowColor=cItems[i].c;ctx.shadowBlur=4;ctx.fillRect(ix-7,iy+2,14,10);ctx.shadowBlur=0;
          ctx.fillStyle=BONE;ctx.font="5px monospace";ctx.textAlign="center";ctx.fillText(cItems[i].l,ix,iy+24);
        }
        // Right totem pole
        const totX=W*0.88,totY=topY+34;
        ctx.fillStyle="#1a2a08";ctx.strokeStyle=MOSS;ctx.lineWidth=1.5;
        rr(totX-8,totY,16,H*0.38,3);ctx.fill();ctx.stroke();
        for(let ti=0;ti<4;ti++){
          const ty2=totY+12+ti*28;
          ctx.strokeStyle=ti%2===0?LEAF:AMBER;ctx.lineWidth=1;
          ctx.beginPath();ctx.moveTo(totX-8,ty2);ctx.lineTo(totX+8,ty2);ctx.stroke();
          ctx.fillStyle=ti%2===0?LEAF:AMBER;ctx.shadowColor=ti%2===0?LEAF:AMBER;ctx.shadowBlur=4;
          ctx.beginPath();ctx.arc(totX,ty2+10,5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        }
        // Vine decorations on walls
        ctx.strokeStyle=MOSS;ctx.lineWidth=2;
        for(let vi=0;vi<4;vi++){
          const vx=W*0.04+vi*(W*0.3),startY=topY+H*0.6;
          ctx.beginPath();ctx.moveTo(vx,topY);ctx.bezierCurveTo(vx-8,startY*0.4,vx+6,startY*0.7,vx-4,startY);ctx.stroke();
          ctx.fillStyle=MOSS;ctx.beginPath();ctx.ellipse(vx-4,startY,3,2,0.5,0,Math.PI*2);ctx.fill();
        }
        // Drawn TRADER person behind counter
        drawTribalPerson12(cx,midY+15,'#3a5a20','#c8905a','#1a0a00','TRADER');
        // Fireflies
        ctx.save();
        for(let fi=0;fi<8;fi++){
          const fx=cx-W*0.38+((t*15+fi*68)%(W*0.76)),fy=topY+40+Math.sin(t*0.9+fi*1.1)*30+fi*18;
          const fa=Math.sin(t*2.5+fi)*0.3+0.4;
          ctx.fillStyle=fi%2===0?`rgba(${LEAFr},${fa})`:`rgba(${AMBERr},${fa})`;
          ctx.shadowColor=fi%2===0?LEAF:AMBER;ctx.shadowBlur=6;
          ctx.beginPath();ctx.arc(fx,fy,1.8,0,Math.PI*2);ctx.fill();
        }
        ctx.shadowBlur=0;ctx.restore();
        return;
      }

      if (isWasteland) {
        // ═══ WASTELAND PAWNSHOP - POST-APOCALYPTIC STYLE ═══

        // Wasteland theme colors (dusty, industrial, muted)
        const RUST = "#8a6040";
        const TAN = "#a08060";
        const BROWN = "#6a5040";
        const GRAY = "#6a6a68";

        // ── Vertical offset to ensure visibility ──
        const vOffset = 35;

        // ── Shop title (weathered sign) ──
        ctx.save();
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#c0a080";
        ctx.fillText("▲ SCRAP TRADER ▲", cx, topY + vOffset - 12);
        ctx.restore();

        // ── Divider line under title (rusty) ──
        ctx.save();
        const divGrad = ctx.createLinearGradient(
          cx - W * 0.35,
          0,
          cx + W * 0.35,
          0,
        );
        divGrad.addColorStop(0, "rgba(138,96,64,0)");
        divGrad.addColorStop(0.5, "rgba(138,96,64,0.7)");
        divGrad.addColorStop(1, "rgba(138,96,64,0)");
        ctx.strokeStyle = divGrad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - W * 0.35, topY + vOffset);
        ctx.lineTo(cx + W * 0.35, topY + vOffset);
        ctx.stroke();
        ctx.restore();

        // ═══ TOP ROW: 3 DISPLAY CRATES (SALVAGED GOODS) ═══
        const topDisplays = [
          { emoji: "🔫", label: "WEAPONS", color: RUST },
          { emoji: "💣", label: "EXPLOSIVES", color: BROWN },
          { emoji: "⚙️", label: "PARTS", color: GRAY },
        ];

        for (let i = 0; i < 3; i++) {
          const dx = cx - W * 0.3 + i * (W * 0.3);
          const dy = topY + vOffset + 30;
          const item = topDisplays[i];

          // Wooden crate background
          ctx.save();
          ctx.fillStyle = "#3a3228";
          ctx.strokeStyle = "#5a4a38";
          ctx.lineWidth = 3;
          rr(dx - 38, dy - 20, 76, 58, 4);
          ctx.fill();
          ctx.stroke();

          // Wood grain lines
          ctx.strokeStyle = "rgba(90,74,56,0.5)";
          ctx.lineWidth = 1;
          for (let li = 0; li < 4; li++) {
            ctx.beginPath();
            ctx.moveTo(dx - 36, dy - 16 + li * 15);
            ctx.lineTo(dx + 36, dy - 16 + li * 15);
            ctx.stroke();
          }

          // Corner brackets (metal)
          ctx.fillStyle = "#5a5a58";
          ctx.fillRect(dx - 38, dy - 20, 12, 4);
          ctx.fillRect(dx - 38, dy - 20, 4, 12);
          ctx.fillRect(dx + 26, dy - 20, 12, 4);
          ctx.fillRect(dx + 34, dy - 20, 4, 12);
          ctx.fillRect(dx - 38, dy + 34, 12, 4);
          ctx.fillRect(dx - 38, dy + 26, 4, 12);
          ctx.fillRect(dx + 26, dy + 34, 12, 4);
          ctx.fillRect(dx + 34, dy + 26, 4, 12);

          // Item emoji
          ctx.font = "38px serif";
          ctx.textAlign = "center";
          ctx.fillText(item.emoji, dx, dy + 16);

          // Label on metal plate
          ctx.fillStyle = "#4a4a48";
          rr(dx - 28, dy + 24, 56, 14, 2);
          ctx.fill();
          ctx.font = "bold 8px monospace";
          ctx.fillStyle = TAN;
          ctx.fillText(item.label, dx, dy + 34);
          ctx.restore();
        }

        // ═══ MIDDLE ROW: RUSTY COUNTER ═══
        const counterX = cx - 55;
        const counterY = midY + 55;
        const counterW = 110;
        const counterH = 30;

        // Counter shadow
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(counterX + 4, counterY + counterH + 2, counterW, 5);

        // Counter base (rusty metal)
        const counterGrad = ctx.createLinearGradient(
          counterX,
          counterY,
          counterX,
          counterY + counterH,
        );
        counterGrad.addColorStop(0, "#4a4038");
        counterGrad.addColorStop(1, "#2a2420");
        ctx.fillStyle = counterGrad;
        rr(counterX, counterY, counterW, counterH, 4);
        ctx.fill();

        // Counter top edge (worn wood)
        ctx.fillStyle = "#5a4a38";
        ctx.fillRect(counterX - 3, counterY, counterW + 6, 5);

        // Rust stains on counter
        ctx.fillStyle = "rgba(100,50,20,0.3)";
        ctx.beginPath();
        ctx.ellipse(counterX + 25, counterY + 15, 12, 8, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // "TRADE" sign on counter
        ctx.fillStyle = "#3a3028";
        rr(counterX + counterW / 2 - 25, counterY + 8, 50, 16, 2);
        ctx.fill();
        ctx.fillStyle = TAN;
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("TRADE", counterX + counterW / 2, counterY + 20);

        // ═══ BOTTOM ROW: 4 SMALLER SALVAGE ITEMS ═══
        const bottomItems = [
          { emoji: "🔧", color: GRAY },
          { emoji: "⛽", color: RUST },
          { emoji: "🔋", color: BROWN },
          { emoji: "📻", color: TAN },
        ];

        for (let i = 0; i < 4; i++) {
          const bx = cx - W * 0.32 + i * (W * 0.22);
          const by = midY + 25;
          const item = bottomItems[i];

          // Small metal box
          ctx.save();
          ctx.fillStyle = "#2a2820";
          ctx.strokeStyle = "#4a4540";
          ctx.lineWidth = 1.5;
          rr(bx - 18, by - 14, 36, 32, 3);
          ctx.fill();
          ctx.stroke();

          // Dents/damage
          ctx.fillStyle = "rgba(0,0,0,0.2)";
          ctx.beginPath();
          ctx.arc(bx - 8, by - 6, 5, 0, Math.PI * 2);
          ctx.fill();

          // Item emoji
          ctx.font = "20px serif";
          ctx.textAlign = "center";
          ctx.fillText(item.emoji, bx, by + 8);
          ctx.restore();
        }

        // ═══ AMBIENT DUST PARTICLES ═══
        ctx.save();
        for (let pi = 0; pi < 6; pi++) {
          const px = cx - W * 0.35 + ((t * 8 + pi * 90) % (W * 0.7));
          const py = topY + 25 + Math.sin(t * 0.6 + pi) * 20 + ((pi * 18) % 50);
          const alpha = Math.sin(t * 1.5 + pi) * 0.15 + 0.2;
          ctx.fillStyle = `rgba(120,100,70,${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // ═══ WALL DECORATIONS ═══
        // Hanging tools on left
        ctx.fillStyle = "#5a5a58";
        ctx.fillRect(cx - W * 0.42, topY - 5, 3, 25);
        ctx.fillRect(cx - W * 0.38, topY - 5, 3, 20);
        ctx.fillRect(cx - W * 0.34, topY - 5, 3, 30);

        // Shelf with junk on right
        ctx.fillStyle = "#4a4038";
        ctx.fillRect(cx + W * 0.28, topY + 5, 50, 6);
        ctx.fillStyle = "#6a6058";
        ctx.fillRect(cx + W * 0.30, topY - 8, 12, 13);
        ctx.fillRect(cx + W * 0.38, topY - 5, 8, 10);
        ctx.fillRect(cx + W * 0.44, topY - 10, 10, 15);

      } else if (!!this.map?.config?.hardcore) {
        // ═══ HARDCORE: INFERNO PAWNSHOP ═══
        const t = performance.now() / 1000;
        const EMBER="#FF8800"; const FLAME="#FF5500"; const CRIMSON="#FF2200"; const AMBER="#FFAA00";
        const EMBERr="255,136,0"; const FLAMEr="255,85,0"; const CRIMSONr="255,34,0"; const AMBERr="255,170,0";

        ctx.fillStyle="#070200"; ctx.fillRect(0,0,W,H);

        // Title
        ctx.save(); ctx.font="bold 17px Orbitron, monospace"; ctx.textAlign="center";
        ctx.fillStyle="#fff"; ctx.shadowColor=EMBER; ctx.shadowBlur=24;
        ctx.fillText("⚡ INFERNO PAWN ⚡", cx, topY-10); ctx.shadowBlur=0; ctx.restore();

        // ── Display case (front counter) ──
        ctx.fillStyle="#140600"; ctx.strokeStyle=AMBER; ctx.lineWidth=2;
        rr(cx-280,topY+10,560,75,6); ctx.fill(); ctx.stroke();
        ctx.fillStyle=`rgba(${AMBERr},0.06)`; ctx.fillRect(cx-276,topY+14,552,67);
        // Items in display case
        const displayItems=[
          {x:cx-240,col:CRIMSON,nm:"WEAPON"},{x:cx-170,col:FLAME,nm:"ARMOR"},{x:cx-100,col:EMBER,nm:"JEWELS"},
          {x:cx-30,col:AMBER,nm:"MASK"},{x:cx+40,col:CRIMSON,nm:"BLADE"},{x:cx+110,col:FLAME,nm:"BOMB"},
          {x:cx+180,col:EMBER,nm:"RELIC"},{x:cx+240,col:AMBER,nm:"SKULL"}
        ];
        displayItems.forEach(item=>{
          ctx.fillStyle=item.col+"55"; ctx.strokeStyle=item.col; ctx.lineWidth=0.8;
          rr(item.x-15,topY+22,30,36,3); ctx.fill(); ctx.stroke();
          ctx.fillStyle=item.col; ctx.font="bold 4px monospace"; ctx.textAlign="center";
          ctx.fillText(item.nm,item.x,topY+68);
        });

        // ── Wall shelves left ──
        for(let si=0;si<3;si++){
          const sy=topY+110+si*90;
          ctx.fillStyle="#110500"; ctx.strokeStyle=FLAME; ctx.lineWidth=1;
          rr(40,sy,230,72,4); ctx.fill(); ctx.stroke();
          ctx.fillStyle=FLAME; ctx.font="bold 7px monospace"; ctx.textAlign="center";
          const shelfNames=["WEAPONS RACK","ARMOR DISPLAY","CONTRABAND"];
          ctx.fillText(shelfNames[si],155,sy+14);
          // Items on shelf
          for(let ii=0;ii<6;ii++){
            const ic=ii%2===0?EMBER:CRIMSON;
            ctx.fillStyle=ic+"44"; ctx.strokeStyle=ic; ctx.lineWidth=0.7;
            rr(55+ii*33,sy+20,26,36,3); ctx.fill(); ctx.stroke();
            ctx.fillStyle=ic; ctx.beginPath(); ctx.arc(68+ii*33,sy+34,5,0,Math.PI*2); ctx.fill();
          }
        }

        // ── Wall shelves right ──
        for(let si=0;si<3;si++){
          const sy=topY+110+si*90;
          ctx.fillStyle="#110500"; ctx.strokeStyle=EMBER; ctx.lineWidth=1;
          rr(W-270,sy,230,72,4); ctx.fill(); ctx.stroke();
          ctx.fillStyle=EMBER; ctx.font="bold 7px monospace"; ctx.textAlign="center";
          const shelfNames2=["RARE LOOT","FIRE RELICS","DARK ARTS"];
          ctx.fillText(shelfNames2[si],W-155,sy+14);
          for(let ii=0;ii<6;ii++){
            const ic=ii%2===0?AMBER:FLAME;
            ctx.fillStyle=ic+"44"; ctx.strokeStyle=ic; ctx.lineWidth=0.7;
            rr(W-258+ii*33,sy+20,26,36,3); ctx.fill(); ctx.stroke();
            ctx.fillStyle=ic; ctx.beginPath(); ctx.arc(W-245+ii*33,sy+34,5,0,Math.PI*2); ctx.fill();
          }
        }

        // ── Pawnbroker desk (back center) ──
        ctx.fillStyle="#170700"; ctx.strokeStyle=CRIMSON; ctx.lineWidth=1.5;
        rr(cx-130,topY+380,260,90,6); ctx.fill(); ctx.stroke();
        // Scale
        ctx.strokeStyle=AMBER; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(cx,topY+390); ctx.lineTo(cx,topY+420); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-30,topY+412); ctx.lineTo(cx+30,topY+412); ctx.stroke();
        ctx.fillStyle=EMBER; ctx.beginPath(); ctx.arc(cx-24,topY+418,10,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=FLAME; ctx.beginPath(); ctx.arc(cx+24,topY+418,10,0,Math.PI*2); ctx.fill();
        // Register
        ctx.fillStyle="#0a0300"; ctx.strokeStyle=AMBER; ctx.lineWidth=1;
        rr(cx+60,topY+388,70,46,3); ctx.fill(); ctx.stroke();
        for(let ri=0;ri<3;ri++) for(let rj=0;rj<4;rj++){
          ctx.fillStyle=ri===0&&rj===0?EMBER:FLAME+"44"; ctx.strokeStyle=`rgba(${EMBERr},0.4)`; ctx.lineWidth=0.5;
          rr(cx+65+rj*16,topY+392+ri*14,13,11,2); ctx.fill(); ctx.stroke();
        }
        ctx.fillStyle=AMBER; ctx.font="bold 7px monospace"; ctx.textAlign="center"; ctx.fillText("PAWNBROKER",cx,topY+458);

        // ── 4 browsing customers ──
        [[cx-200,topY+130],[cx+200,topY+130],[cx-200,topY+290],[cx+200,topY+290]].forEach(([px,py],pi)=>{
          ctx.fillStyle=["#882000","#CC4400","#FF5500","#993300"][pi];
          ctx.beginPath(); ctx.arc(px,py,8,0,Math.PI*2); ctx.fill();
          ctx.fillRect(px-6,py+7,12,15);
          ctx.fillStyle="#0a0200"; ctx.beginPath(); ctx.arc(px,py,4,0,Math.PI*2); ctx.fill();
        });

        // ── Vault door (far back) ──
        ctx.fillStyle="#0e0400"; ctx.strokeStyle=CRIMSON; ctx.lineWidth=2;
        rr(cx-55,topY+490,110,90,5); ctx.fill(); ctx.stroke();
        // Vault wheel
        ctx.strokeStyle=EMBER; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(cx,topY+530,28,0,Math.PI*2); ctx.stroke();
        for(let sp=0;sp<8;sp++){
          const sa=sp*Math.PI/4+t*0.3;
          ctx.beginPath(); ctx.moveTo(cx,topY+530); ctx.lineTo(cx+Math.cos(sa)*26,topY+530+Math.sin(sa)*26); ctx.stroke();
        }
        ctx.fillStyle=CRIMSON; ctx.font="bold 7px monospace"; ctx.textAlign="center"; ctx.fillText("VAULT",cx,topY+573);

        // Ember drift
        for(let ei=0;ei<10;ei++){
          const ex=50+ei*105, ey=H*0.55+15*Math.sin(t*1.6+ei*0.8);
          ctx.fillStyle=`rgba(${EMBERr},${0.12+0.08*Math.sin(t*2+ei)})`; ctx.beginPath(); ctx.arc(ex,ey,2,0,Math.PI*2); ctx.fill();
        }
      } else {
        // ═══ CYBER PAWNSHOP - NEON CITY STYLE ═══

        // Neon City theme colors (matching the map)
        const CYAN = "#44EEFF";
        const PINK = "#FF4466";
        const GREEN = "#44FF88";
        const PURPLE = "#CC88FF";

      // ── Vertical offset to ensure visibility ──
      const vOffset = 35;

      // ── Shop title with glow ──
      ctx.save();
      ctx.font = "bold 12px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.shadowColor = CYAN;
      ctx.shadowBlur = 18;
      ctx.fillText("◈ CYBER PAWN ◈", cx, topY + vOffset - 12);
      ctx.shadowBlur = 0;
      ctx.restore();

      // ── Divider line under title ──
      ctx.save();
      const divGrad = ctx.createLinearGradient(
        cx - W * 0.35,
        0,
        cx + W * 0.35,
        0,
      );
      divGrad.addColorStop(0, "rgba(68,238,255,0)");
      divGrad.addColorStop(0.5, "rgba(68,238,255,0.8)");
      divGrad.addColorStop(1, "rgba(68,238,255,0)");
      ctx.strokeStyle = divGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - W * 0.35, topY + vOffset);
      ctx.lineTo(cx + W * 0.35, topY + vOffset);
      ctx.stroke();
      ctx.restore();

      // ═══ TOP ROW: 3 LARGE DISPLAY CASES (HIGH VISIBILITY) ═══
      const topDisplays = [
        { emoji: "🔫", label: "WEAPONS", color: PINK },
        { emoji: "💣", label: "GRENADES", color: "#FF8844" },
        { emoji: "💎", label: "VALUABLES", color: CYAN },
      ];

      for (let i = 0; i < 3; i++) {
        const dx = cx - W * 0.3 + i * (W * 0.3);
        const dy = topY + vOffset + 30;
        const item = topDisplays[i];
        const pulse = Math.sin(t * 2 + i * 1.5) * 0.3 + 0.7;
        const floatY = Math.sin(t * 1.5 + i * 2) * 3;

        // Display case background - BRIGHTER for visibility
        ctx.save();
        ctx.fillStyle = "rgba(20,25,40,0.98)";
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 20 * pulse;
        rr(dx - 38, dy - 20, 76, 58, 10);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Inner bright glow background for contrast
        const innerGlow = ctx.createRadialGradient(
          dx,
          dy + 8,
          0,
          dx,
          dy + 8,
          35,
        );
        innerGlow.addColorStop(
          0,
          `rgba(${item.color === CYAN ? "68,238,255" : item.color === PINK ? "255,68,102" : "255,136,68"},0.25)`,
        );
        innerGlow.addColorStop(
          0.6,
          `rgba(${item.color === CYAN ? "68,238,255" : item.color === PINK ? "255,68,102" : "255,136,68"},0.08)`,
        );
        innerGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(dx, dy + 8, 35, 0, Math.PI * 2);
        ctx.fill();

        // LARGER emoji with stronger glow
        ctx.font = "42px serif";
        ctx.textAlign = "center";
        ctx.shadowColor = "#fff";
        ctx.shadowBlur = 8;
        ctx.fillText(item.emoji, dx, dy + 18 + floatY);
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 25;
        ctx.fillText(item.emoji, dx, dy + 18 + floatY);
        ctx.shadowBlur = 0;

        // Label with better visibility
        ctx.font = "bold 8px Orbitron, monospace";
        ctx.fillStyle = "#fff";
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 10;
        ctx.fillText(item.label, dx, dy + 30);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // ═══ MIDDLE ROW: CYBER COUNTER ═══
      const counterX = cx - 55;
      const counterY = midY + 55;
      const counterW = 110;
      const counterH = 30;

      // Counter shadow
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(counterX + 4, counterY + counterH + 2, counterW, 5);

      // Counter base
      const counterGrad = ctx.createLinearGradient(
        counterX,
        counterY,
        counterX,
        counterY + counterH,
      );
      counterGrad.addColorStop(0, "#1a1a2e");
      counterGrad.addColorStop(1, "#0a0a14");
      ctx.fillStyle = counterGrad;
      rr(counterX, counterY, counterW, counterH, 6);
      ctx.fill();

      // Counter top edge with cyan glow
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 2;
      ctx.shadowColor = CYAN;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(counterX, counterY + 2);
      ctx.lineTo(counterX + counterW, counterY + 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // ═══ BOTTOM ROW: 4 SMALLER ITEM DISPLAYS ═══
      const bottomItems = [
        { emoji: "⌚", color: PURPLE },
        { emoji: "💍", color: PINK },
        { emoji: "📱", color: CYAN },
        { emoji: "🎮", color: GREEN },
      ];

      for (let i = 0; i < 4; i++) {
        const bx = cx - W * 0.32 + i * (W * 0.22);
        const by = midY + 25;
        const item = bottomItems[i];
        const pulse = Math.sin(t * 2.5 + i) * 0.3 + 0.7;
        const floatY = Math.sin(t * 1.8 + i * 1.5) * 3;

        // Small display case
        ctx.save();
        ctx.fillStyle = "rgba(8,12,20,0.9)";
        ctx.strokeStyle = `rgba(${item.color === CYAN ? "68,238,255" : item.color === PINK ? "255,68,102" : item.color === GREEN ? "68,255,136" : "204,136,255"},${0.5 + pulse * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 8 * pulse;
        rr(bx - 18, by - 14, 36, 32, 5);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Item emoji
        ctx.font = "20px serif";
        ctx.textAlign = "center";
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 10;
        ctx.fillText(item.emoji, bx, by + 8 + floatY);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // ═══ AMBIENT PARTICLES (subtle) ═══
      ctx.save();
      for (let pi = 0; pi < 6; pi++) {
        const px = cx - W * 0.35 + ((t * 10 + pi * 90) % (W * 0.7));
        const py = topY + 25 + Math.sin(t * 0.8 + pi) * 25 + ((pi * 18) % 50);
        const alpha = Math.sin(t * 2 + pi) * 0.25 + 0.35;
        ctx.fillStyle =
          pi % 2 === 0
            ? `rgba(68,238,255,${alpha})`
            : `rgba(255,68,102,${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      }
    } else if (type === 13) {
      // TECH LAB / WASTELAND TECH SHOP / FROZEN TUNDRA CRYO LAB / ROBOT CITY
      const isTechShop = room.isTechShop;
      const isSnowTech = !!this.map?.config?.snow;
      const isRobotTech = !!this.map?.config?.robot;

      if (isSnowTech) {
        // ═══ FROZEN TUNDRA: CRYO TECH LAB ═══
        const t = performance.now() / 1000;

        // ── Ice tile floor ────────────────────────────────────
        ctx.fillStyle = "#020810"; ctx.fillRect(0,0,W,H);
        const tSz2=Math.round(W/16);
        for (let gy=0;gy<=Math.ceil(H/tSz2);gy++) for (let gx=0;gx<=Math.ceil(W/tSz2);gx++) {
          const ftx=gx*tSz2,fty=gy*tSz2,fsd=gx*13+gy*7;
          ctx.fillStyle=fsd%3===0?"rgba(4,14,28,0.97)":fsd%3===1?"rgba(6,18,34,0.97)":"rgba(5,16,30,0.97)";
          ctx.fillRect(ftx,fty,tSz2,tSz2);
          ctx.strokeStyle=`rgba(100,180,255,${0.06+0.03*Math.sin(t*0.7+fsd*0.12)})`;
          ctx.lineWidth=0.7; ctx.strokeRect(ftx,fty,tSz2,tSz2);
        }

        // ── Room border (ice glow) ─────────────────────────────
        ctx.strokeStyle=`rgba(136,221,255,${0.6+0.2*Math.sin(t*1.3)})`; ctx.lineWidth=3;
        ctx.strokeRect(2,2,W-4,H-4);
        ctx.strokeStyle="rgba(80,160,220,0.22)"; ctx.lineWidth=1; ctx.strokeRect(7,7,W-14,H-14);

        // ── Ceiling cryo-lights (one flickers) ────────────────
        const hLX2=[W*0.15,W*0.40,W*0.65,W*0.88];
        for (let li=0;li<4;li++) {
          const lx=hLX2[li], fl=li===2?(0.55+0.45*Math.sin(t*11.7)):1;
          const lc=ctx.createRadialGradient(lx,0,2,lx,H*0.28,W*0.13);
          lc.addColorStop(0,`rgba(136,221,255,${0.11*fl})`); lc.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=lc; ctx.beginPath(); ctx.moveTo(lx-5,0); ctx.lineTo(lx-W*0.08,H*0.35); ctx.lineTo(lx+W*0.08,H*0.35); ctx.closePath(); ctx.fill();
          ctx.fillStyle=`rgba(180,230,255,${0.8*fl})`; ctx.shadowColor="#88DDFF"; ctx.shadowBlur=10*fl;
          ctx.beginPath(); ctx.arc(lx,5,4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        }

        // ── CRYO TECH LAB banner ──────────────────────────────
        const bW2=W*0.56, bH2=H*0.042, bX2=cx-bW2/2, bY2=room.S-bH2-4;
        const bGr2=ctx.createLinearGradient(bX2,bY2,bX2+bW2,bY2);
        bGr2.addColorStop(0,"rgba(2,10,28,0.97)"); bGr2.addColorStop(0.5,"rgba(10,40,90,0.99)"); bGr2.addColorStop(1,"rgba(2,10,28,0.97)");
        ctx.fillStyle=bGr2; rr(bX2,bY2,bW2,bH2,7); ctx.fill();
        ctx.strokeStyle=`rgba(136,221,255,${0.7+0.3*Math.sin(t*1.8)})`; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle="#CCEEFF"; ctx.font=`bold ${Math.round(bH2*0.55)}px monospace`; ctx.textAlign="center";
        ctx.shadowColor="#88DDFF"; ctx.shadowBlur=14;
        ctx.fillText("❄  CRYO  TECH  LAB  ❄",cx,bY2+bH2*0.72); ctx.shadowBlur=0;

        // ── CRYO HAZARD sign (blink) ─────────────────────────
        const rWarn2=0.7+0.3*Math.sin(t*3.5);
        const rW2=W*0.14, rH2=H*0.038;
        ctx.fillStyle=`rgba(136,221,255,${rWarn2})`; ctx.shadowColor="#66BBFF"; ctx.shadowBlur=14*rWarn2;
        rr(cx-rW2/2,topY+H*0.04,rW2,rH2,5); ctx.fill(); ctx.shadowBlur=0;
        ctx.strokeStyle=`rgba(60,140,220,${rWarn2})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#020810"; ctx.font=`bold ${Math.round(rH2*0.5)}px monospace`; ctx.textAlign="center";
        ctx.fillText("❄ CRYO HAZARD ZONE ❄",cx,topY+H*0.04+rH2*0.7);

        // ── Top: cryo server rack (full width) ────────────────
        const srvY2=topY+H*0.005, srvH2=H*0.065;
        const srvBg2=ctx.createLinearGradient(W*0.04,srvY2,W*0.96,srvY2+srvH2);
        srvBg2.addColorStop(0,"#020810"); srvBg2.addColorStop(0.5,"#04112a"); srvBg2.addColorStop(1,"#020810");
        ctx.fillStyle=srvBg2; rr(W*0.04,srvY2,W*0.92,srvH2,5); ctx.fill();
        ctx.strokeStyle="rgba(88,180,255,0.65)"; ctx.lineWidth=1.5; ctx.stroke();
        for (let si=0;si<12;si++) {
          const sx=W*0.05+si*(W*0.9/12);
          ctx.fillStyle="#020810"; ctx.strokeStyle="rgba(60,140,220,0.38)"; ctx.lineWidth=0.7;
          ctx.fillRect(sx,srvY2+3,W*0.068,srvH2-6); ctx.strokeRect(sx,srvY2+3,W*0.068,srvH2-6);
          const lCA=["#00AAFF","#44CCFF","#0088DD","#66DDFF","#0099EE","#88EEFF","#44AAFF","#00BBFF","#55CCFF","#0077CC","#66BBFF","#AADDFF"][si];
          const lAA=0.5+0.5*Math.sin(t*(1.2+si*0.25)+si);
          ctx.fillStyle=lCA; ctx.shadowColor=lCA; ctx.shadowBlur=4*lAA;
          ctx.fillRect(sx+2,srvY2+4,W*0.05,3); ctx.shadowBlur=0;
          const da2=Math.sin(t*(3+si*0.7)+si)>0.4;
          ctx.fillStyle=da2?"#66BBFF":"#04112a";
          ctx.beginPath(); ctx.arc(sx+W*0.057,srvY2+srvH2-6,2.5,0,Math.PI*2); ctx.fill();
        }

        // ── Main research desk ─────────────────────────────────
        const dY2=topY+H*0.10, dH3=H*0.055, dW3=W*0.82, dX3=cx-dW3/2;
        const dBg2=ctx.createLinearGradient(dX3,dY2,dX3+dW3,dY2+dH3);
        dBg2.addColorStop(0,"#020810"); dBg2.addColorStop(0.5,"#04122c"); dBg2.addColorStop(1,"#020810");
        ctx.fillStyle=dBg2; rr(dX3,dY2,dW3,dH3,6); ctx.fill();
        ctx.strokeStyle="rgba(88,180,255,0.82)"; ctx.lineWidth=2; ctx.stroke();
        ctx.strokeStyle=`rgba(136,221,255,${0.42+0.25*Math.sin(t*1.5)})`; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(dX3+10,dY2+dH3-2); ctx.lineTo(dX3+dW3-10,dY2+dH3-2); ctx.stroke();
        // Keyboard
        ctx.fillStyle="#020810"; rr(dX3+dW3*0.04,dY2+4,dW3*0.2,dH3-8,3); ctx.fill();
        ctx.strokeStyle="rgba(60,140,220,0.38)"; ctx.lineWidth=0.8; ctx.stroke();
        for (let ki=0;ki<10;ki++) { const kr=Math.floor(ki/5),kc=ki%5; ctx.fillStyle=`rgba(88,180,255,${0.24+0.14*Math.sin(t+ki)})`; ctx.fillRect(dX3+dW3*0.05+kc*dW3*0.036,dY2+6+kr*7,dW3*0.028,5); }

        // Cryo holo-display above desk
        const hW2=W*0.26, hH3=H*0.13, hX2=cx-hW2/2, hY2=dY2-hH3-H*0.006;
        const glitch2=(Math.sin(t*7.3)>0.88)?Math.sin(t*25)*3:0;
        ctx.fillStyle="rgba(2,8,22,0.93)"; rr(hX2+glitch2,hY2,hW2,hH3,5); ctx.fill();
        ctx.strokeStyle=`rgba(136,221,255,${0.6+0.3*Math.sin(t*2.1)})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#88DDFF"; ctx.font=`bold ${Math.round(hH3*0.13)}px monospace`; ctx.textAlign="center";
        ctx.shadowColor="#66BBFF"; ctx.shadowBlur=8;
        ctx.fillText("❄ CRYO ONLINE ❄",cx+glitch2*0.5,hY2+hH3*0.22); ctx.shadowBlur=0;
        const dLines2=["TEMP: -196°C","CRYO: ACTIVE","POWER: 92%","RADS: ZERO","UPLINK: OK"];
        for (let dl=0;dl<5;dl++) {
          ctx.fillStyle=dl===0?`rgba(136,221,255,0.95)`:`rgba(88,180,255,${dl%2===0?0.88:0.55})`;
          ctx.font=`${Math.round(hH3*0.1)}px monospace`; ctx.textAlign="left";
          ctx.fillText(dLines2[dl],hX2+hW2*0.06+glitch2,hY2+hH3*0.35+dl*hH3*0.13);
        }
        ctx.strokeStyle="rgba(136,221,255,0.6)"; ctx.lineWidth=1.2;
        ctx.beginPath();
        for (let wx=0;wx<hW2-10;wx+=2) { const wy=hY2+hH3*0.82+hH3*0.1*Math.sin(t*5.5+wx*0.18); wx===0?ctx.moveTo(hX2+5+wx,wy):ctx.lineTo(hX2+5+wx,wy); }
        ctx.stroke();

        // ── LEFT: Cryo freeze chamber ──────────────────────────
        const tcX2=W*0.06, tcY2=H*0.28, tcW2=W*0.11, tcH2=H*0.52;
        ctx.fillStyle="#020810"; ctx.strokeStyle="rgba(88,180,255,0.7)"; ctx.lineWidth=2;
        rr(tcX2,tcY2+tcH2-tcH2*0.11,tcW2,tcH2*0.11,5); ctx.fill(); ctx.stroke();
        const cCol2=ctx.createLinearGradient(tcX2+tcW2*0.3,tcY2,tcX2+tcW2*0.7,tcY2);
        cCol2.addColorStop(0,"#040e22"); cCol2.addColorStop(0.5,"#081830"); cCol2.addColorStop(1,"#040e22");
        ctx.fillStyle=cCol2; ctx.strokeStyle="rgba(60,140,220,0.48)"; ctx.lineWidth=1.5;
        ctx.fillRect(tcX2+tcW2*0.3,tcY2+tcH2*0.14,tcW2*0.4,tcH2*0.73); ctx.strokeRect(tcX2+tcW2*0.3,tcY2+tcH2*0.14,tcW2*0.4,tcH2*0.73);
        for (let ci=0;ci<8;ci++) {
          const cy2=tcY2+tcH2*0.17+ci*(tcH2*0.64/8);
          ctx.strokeStyle=`rgba(136,${200+ci*4},255,0.45)`; ctx.lineWidth=2;
          ctx.beginPath(); ctx.ellipse(tcX2+tcW2/2,cy2,tcW2*0.43,tcH2*0.024,0,0,Math.PI*2); ctx.stroke();
        }
        const tsR2=tcW2*0.4;
        const tsG2=ctx.createRadialGradient(tcX2+tcW2/2,tcY2+tsR2*0.45,tsR2*0.08,tcX2+tcW2/2,tcY2+tsR2*0.45,tsR2);
        tsG2.addColorStop(0,"#0a2040"); tsG2.addColorStop(0.5,"#061428"); tsG2.addColorStop(1,"#020810");
        ctx.fillStyle=tsG2; ctx.strokeStyle=`rgba(136,221,255,${0.6+0.3*Math.sin(t*2)})`; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(tcX2+tcW2/2,tcY2+tsR2*0.52,tsR2,0,Math.PI*2); ctx.fill(); ctx.stroke();
        // Frost arcs
        for (let ai=0;ai<6;ai++) {
          const aS2=Math.floor(t*3+ai*3.1)%7;
          const aX4=tcX2+tcW2/2, aY4=tcY2+tsR2*0.52;
          const aX5=aX4+Math.sin(ai*1.3+t*1.5+aS2)*tcW2*0.9, aY5=aY4+Math.cos(ai*1.1+t*1.2+aS2)*tcW2*0.7;
          const aA2=0.3+0.5*Math.abs(Math.sin(t*5+ai));
          ctx.strokeStyle=`rgba(136,221,255,${aA2})`; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(aX4,aY4); ctx.quadraticCurveTo(aX4+(aX5-aX4)*0.5+Math.sin(t*9+ai)*6,aY4+(aY5-aY4)*0.5+Math.cos(t*7+ai)*6,aX5,aY5); ctx.stroke();
          ctx.fillStyle=`rgba(180,230,255,${aA2*0.7})`; ctx.shadowColor="#AADDFF"; ctx.shadowBlur=5*aA2;
          ctx.beginPath(); ctx.arc(aX5,aY5,2,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        }
        ctx.fillStyle="#AADDFF"; ctx.font=`bold ${Math.round(tcW2*0.28)}px monospace`; ctx.textAlign="center";
        ctx.shadowColor="#66BBFF"; ctx.shadowBlur=8;
        ctx.fillText("CRYO",tcX2+tcW2/2,tcY2+tcH2+12); ctx.shadowBlur=0;

        // ── CENTER: Tactical cryo-map table ────────────────────
        const htX2=cx-W*0.11, htY2=midY-H*0.065, htW2=W*0.22, htH2=H*0.13;
        ctx.fillStyle="rgba(2,8,20,0.88)"; rr(htX2,htY2,htW2,htH2,5); ctx.fill();
        ctx.strokeStyle=`rgba(88,180,255,${0.5+0.3*Math.sin(t*1.4)})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="rgba(136,221,255,0.05)"; ctx.beginPath(); ctx.ellipse(htX2+htW2/2,htY2+htH2/2,htW2*0.42,htH2*0.42,0,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=`rgba(136,221,255,${0.2+0.1*Math.sin(t*2)})`; ctx.lineWidth=1;
        for (let gr=1;gr<=3;gr++) { ctx.beginPath(); ctx.ellipse(htX2+htW2/2,htY2+htH2/2,htW2*0.42*gr/3,htH2*0.42*gr/3,0,0,Math.PI*2); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(htX2+htW2*0.08,htY2+htH2/2); ctx.lineTo(htX2+htW2*0.92,htY2+htH2/2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(htX2+htW2/2,htY2+htH2*0.1); ctx.lineTo(htX2+htW2/2,htY2+htH2*0.9); ctx.stroke();
        const pd2=0.5+0.5*Math.sin(t*3);
        ctx.fillStyle=`rgba(136,221,255,${pd2})`; ctx.shadowColor="#88DDFF"; ctx.shadowBlur=8*pd2;
        ctx.beginPath(); ctx.arc(htX2+htW2*0.62,htY2+htH2*0.38,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        ctx.fillStyle="#88CCFF"; ctx.font=`bold ${Math.round(htH2*0.14)}px monospace`; ctx.textAlign="center";
        ctx.fillText("CRYO MAP",htX2+htW2/2,htY2+htH2+12);

        // ── CENTER-LEFT: Ice crystal analysis panel ────────────
        const cpX2=cx-W*0.35, cpY2=midY-H*0.14, cpW2=W*0.13, cpH2=H*0.28;
        ctx.fillStyle="#020810"; ctx.strokeStyle="rgba(88,180,255,0.5)"; ctx.lineWidth=1.5;
        rr(cpX2,cpY2,cpW2,cpH2,4); ctx.fill(); ctx.stroke();
        ctx.strokeStyle="rgba(88,180,255,0.35)"; ctx.lineWidth=1;
        const cpTx2=[cpX2+8,cpX2+cpW2*0.35,cpX2+cpW2*0.6,cpX2+cpW2-8];
        for (let px2=0;px2<4;px2++) { ctx.beginPath(); ctx.moveTo(cpTx2[px2],cpY2+8); ctx.lineTo(cpTx2[px2],cpY2+cpH2-8); ctx.stroke(); }
        const cpTy2=[cpY2+cpH2*0.25,cpY2+cpH2*0.5,cpY2+cpH2*0.75];
        for (let py2=0;py2<3;py2++) { ctx.beginPath(); ctx.moveTo(cpX2+8,cpTy2[py2]); ctx.lineTo(cpX2+cpW2-8,cpTy2[py2]); ctx.stroke(); }
        const ics2=[{x:cpX2+cpW2*0.15,y:cpY2+cpH2*0.2},{x:cpX2+cpW2*0.55,y:cpY2+cpH2*0.45},{x:cpX2+cpW2*0.2,y:cpY2+cpH2*0.65}];
        for (const ic2 of ics2) {
          ctx.fillStyle="#04102a"; ctx.strokeStyle="rgba(136,221,255,0.5)"; ctx.lineWidth=1;
          ctx.fillRect(ic2.x-8,ic2.y-5,16,10); ctx.strokeRect(ic2.x-8,ic2.y-5,16,10);
          ctx.fillStyle=`rgba(136,221,255,${0.5+0.3*Math.sin(t*2+ic2.x)})`; ctx.shadowColor="#88DDFF"; ctx.shadowBlur=4;
          ctx.beginPath(); ctx.arc(ic2.x,ic2.y,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        }
        ctx.fillStyle="#88CCFF"; ctx.font=`bold ${Math.round(cpH2*0.09)}px monospace`; ctx.textAlign="center";
        ctx.fillText("ICE ARRAY",cpX2+cpW2/2,cpY2+cpH2+12);

        // ── CENTER-RIGHT: Cryo-meter ─────────────────────────
        const gmX2=cx+W*0.22, gmY2=midY-H*0.11, gmW2=W*0.13, gmH2=H*0.22;
        ctx.fillStyle="#020810"; ctx.strokeStyle="rgba(88,180,255,0.5)"; ctx.lineWidth=1.5;
        rr(gmX2,gmY2,gmW2,gmH2,4); ctx.fill(); ctx.stroke();
        ctx.fillStyle="#88CCFF"; ctx.font=`bold ${Math.round(gmH2*0.1)}px monospace`; ctx.textAlign="center";
        ctx.fillText("CRYO-METER",gmX2+gmW2/2,gmY2+gmH2*0.15);
        const dCX2=gmX2+gmW2/2, dCY2=gmY2+gmH2*0.5, dR2=gmW2*0.35;
        ctx.strokeStyle="rgba(88,180,255,0.3)"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.arc(dCX2,dCY2,dR2,Math.PI,2*Math.PI); ctx.stroke();
        ctx.strokeStyle="rgba(88,180,255,0.15)"; ctx.lineWidth=0.8;
        for (let mk=0;mk<=5;mk++) {
          const ang2=Math.PI+mk*Math.PI/5;
          ctx.beginPath(); ctx.moveTo(dCX2+Math.cos(ang2)*(dR2-4),dCY2+Math.sin(ang2)*(dR2-4));
          ctx.lineTo(dCX2+Math.cos(ang2)*dR2,dCY2+Math.sin(ang2)*dR2); ctx.stroke();
        }
        const nAng2=Math.PI+Math.PI*((Math.sin(t*0.5)*0.5+0.5)*0.9+0.05);
        ctx.strokeStyle="#88DDFF"; ctx.lineWidth=2; ctx.shadowColor="#66BBFF"; ctx.shadowBlur=6;
        ctx.beginPath(); ctx.moveTo(dCX2,dCY2); ctx.lineTo(dCX2+Math.cos(nAng2)*dR2*0.85,dCY2+Math.sin(nAng2)*dR2*0.85); ctx.stroke(); ctx.shadowBlur=0;
        ctx.fillStyle="#66AAFF"; ctx.beginPath(); ctx.arc(dCX2,dCY2,3,0,Math.PI*2); ctx.fill();
        const cpmVal2=Math.floor(196+Math.sin(t*1.1)*20);
        ctx.fillStyle="#AADDFF"; ctx.font=`bold ${Math.round(gmH2*0.09)}px monospace`; ctx.textAlign="center";
        ctx.fillText(`-${cpmVal2}°C`,dCX2,gmY2+gmH2*0.82);
        ctx.fillStyle="#66AAFF"; ctx.font=`${Math.round(gmH2*0.08)}px monospace`;
        ctx.fillText("TEMP",dCX2,gmY2+gmH2*0.92);

        // ── RIGHT: Cryo vial racks ─────────────────────────────
        const vrX2=W*0.78, vrY2=H*0.28, vrW2=W*0.2, vrH2=H*0.52;
        ctx.fillStyle="#020810"; ctx.strokeStyle="rgba(88,180,255,0.5)"; ctx.lineWidth=1.5;
        rr(vrX2,vrY2,vrW2,vrH2,5); ctx.fill(); ctx.stroke();
        const vials2=[{l:"LIQ N₂",c:"rgba(136,221,255,0.9)"},{l:"CRYO-1",c:"rgba(88,180,255,0.9)"},{l:"STASIS",c:"rgba(180,230,255,0.9)"},{l:"ICE-9",c:"rgba(60,140,255,0.9)"},{l:"FREEZE",c:"rgba(200,240,255,0.9)"},{l:"PLASMA",c:"rgba(100,200,255,0.9)"}];
        for (let vi=0;vi<6;vi++) {
          const vc=vi%2, vr=Math.floor(vi/2);
          const vx=vrX2+vrW2*0.14+vc*vrW2*0.48, vy=vrY2+vrH2*0.1+vr*vrH2*0.3;
          const vW2=vrW2*0.28, vH2=vrH2*0.22;
          ctx.fillStyle="rgba(2,8,20,0.9)"; rr(vx,vy,vW2,vH2,4); ctx.fill();
          ctx.strokeStyle=vials2[vi].c; ctx.lineWidth=1.5; ctx.stroke();
          const vFill2=0.3+Math.sin(t*0.7+vi*1.1)*0.25+0.4;
          const vGr2=ctx.createLinearGradient(vx,vy+vH2*(1-vFill2),vx,vy+vH2);
          vGr2.addColorStop(0,vials2[vi].c.replace(",0.9)",",0.75)")); vGr2.addColorStop(1,vials2[vi].c.replace(",0.9)",",0.3)"));
          ctx.fillStyle=vGr2; ctx.fillRect(vx+2,vy+vH2*(1-vFill2)+2,vW2-4,vH2*vFill2-4);
          ctx.fillStyle=vials2[vi].c; ctx.shadowColor=vials2[vi].c; ctx.shadowBlur=6+3*Math.sin(t+vi);
          ctx.beginPath(); ctx.arc(vx+vW2/2,vy+vH2*0.3,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
          ctx.fillStyle="#CCEEFF"; ctx.font=`bold ${Math.round(vH2*0.2)}px monospace`; ctx.textAlign="center";
          ctx.fillText(vials2[vi].l,vx+vW2/2,vy+vH2+11);
        }

        // ── BOTTOM: 4 cryo storage bins ───────────────────────
        const binW2=W*0.17, binH2=H*0.075;
        for (let bi=0;bi<4;bi++) {
          const bx=W*0.07+bi*(W*0.85/4), by=H*0.82;
          ctx.fillStyle="#020810"; ctx.strokeStyle="rgba(88,180,255,0.4)"; ctx.lineWidth=1.5;
          rr(bx,by,binW2,binH2,4); ctx.fill(); ctx.stroke();
          const bFill2=0.2+((bi*0.19+Math.sin(t*0.6+bi)*0.08)%0.7);
          const bGr3=ctx.createLinearGradient(bx,by+binH2*(1-bFill2),bx,by+binH2);
          bGr3.addColorStop(0,"rgba(88,180,255,0.5)"); bGr3.addColorStop(1,"rgba(60,130,220,0.25)");
          ctx.fillStyle=bGr3; ctx.fillRect(bx+2,by+binH2*(1-bFill2)+2,binW2-4,binH2*bFill2-4);
          ctx.strokeStyle=`rgba(136,221,255,${0.4+0.3*Math.sin(t*2+bi)})`; ctx.lineWidth=1;
          ctx.strokeRect(bx+2,by+binH2*(1-bFill2)+2,binW2-4,binH2*bFill2-4);
          const labels2=["SAMPLE A","SAMPLE B","ICE CORE","LIQ N₂"];
          ctx.fillStyle="#88BBDD"; ctx.font=`bold ${Math.round(binH2*0.25)}px monospace`; ctx.textAlign="center";
          ctx.fillText(labels2[bi],bx+binW2/2,by+binH2*0.65);
          ctx.fillStyle="#AADDFF"; ctx.font=`${Math.round(binH2*0.2)}px monospace`;
          ctx.fillText(`${Math.round(bFill2*100)}%`,bx+binW2/2,by+binH2+12);
        }

        // ── Trophy shelf ──────────────────────────────────────
        const trX2=W*0.80, trY2=H*0.28+H*0.56, trW2=W*0.18, trH2=H*0.065;
        ctx.fillStyle="#030a1e"; ctx.strokeStyle="rgba(88,180,255,0.35)"; ctx.lineWidth=1;
        rr(trX2,trY2,trW2,trH2,3); ctx.fill(); ctx.stroke();
        for (const tr3 of [{dx:0.2,c:"#FFDD44",s:"⬡"},{dx:0.5,c:"#AADDFF",s:"❄"},{dx:0.8,c:"#88CCFF",s:"★"}]) {
          ctx.fillStyle=tr3.c; ctx.shadowColor=tr3.c; ctx.shadowBlur=7;
          ctx.font=`bold ${Math.round(trH2*0.65)}px monospace`; ctx.textAlign="center";
          ctx.fillText(tr3.s,trX2+trW2*tr3.dx,trY2+trH2*0.75); ctx.shadowBlur=0;
        }

        // ── Floor cable runs ──────────────────────────────────
        ctx.strokeStyle="rgba(88,180,255,0.18)"; ctx.lineWidth=2; ctx.setLineDash([6,5]);
        ctx.beginPath(); ctx.moveTo(tcX2+tcW2,tcY2+tcH2*0.5); ctx.lineTo(cx-W*0.05,tcY2+tcH2*0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(vrX2,vrY2+vrH2*0.5); ctx.lineTo(cx+W*0.1,vrY2+vrH2*0.5); ctx.stroke();
        ctx.setLineDash([]);

        // ── Scrolling news ticker ─────────────────────────────
        const tkY3=H*0.94;
        ctx.fillStyle="rgba(2,8,20,0.88)"; ctx.fillRect(0,tkY3,W,H*0.035);
        ctx.fillStyle=`rgba(136,221,255,${0.75+0.25*Math.sin(t*4)})`; rr(W*0.005,tkY3+H*0.001,W*0.05,H*0.027,3); ctx.fill();
        ctx.fillStyle="#020810"; ctx.font=`bold ${Math.round(H*0.017)}px monospace`; ctx.textAlign="left";
        ctx.fillText("LIVE",W*0.005+W*0.05*0.14,tkY3+H*0.001+H*0.027*0.75);
        const tkTxt3="❄ CRYO TECH LAB  ✦  TEMP: -196°C  ✦  SAMPLES: 1,024  ✦  CRYO CHAMBER: ONLINE  ✦  NEXT CYCLE: 04:22  ✦  UPLINK: ACTIVE  ✦  ";
        const tkX3=W*0.06+W-(t*50)%(W+1400);
        ctx.save(); ctx.beginPath(); ctx.rect(W*0.06,tkY3,W-W*0.06,H*0.032); ctx.clip();
        ctx.fillStyle="#CCEEFF"; ctx.font=`bold ${Math.round(H*0.017)}px monospace`; ctx.textAlign="left";
        ctx.fillText(tkTxt3,tkX3,tkY3+H*0.021); ctx.restore();

        // ── Ambient ice crystal particles ──────────────────────
        for (let pi=0;pi<16;pi++) {
          const fpx=(Math.sin(pi*2.1+t*0.32)*0.42+0.5)*W, fpy=(Math.cos(pi*1.6+t*0.21)*0.38+0.5)*(H*0.88);
          const pA=0.08+0.05*Math.sin(t*1.2+pi);
          ctx.fillStyle=pi%3===0?`rgba(136,221,255,${pA})`:pi%3===1?`rgba(88,180,255,${pA})`:`rgba(180,230,255,${pA})`;
          ctx.beginPath(); ctx.arc(fpx,fpy,1.8,0,Math.PI*2); ctx.fill();
        }

      } else if (isDino) {
        // ═══ DINO WORLD: ANCIENT RESEARCH HUT ═══
        const t13=performance.now()/1000;
        const LEAF="#66DD44",AMBER="#FFCC44",BONE="#F0E8C0",MOSS="#33881A";
        const LEAFr="102,221,68",AMBERr="255,204,68";
        const drawTribalPerson13=(px,py,bodyCol,skinCol,hairCol,label)=>{
          ctx.fillStyle='rgba(0,0,0,0.28)';ctx.beginPath();ctx.ellipse(px,py+9,13,6,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#2a1a08';ctx.fillRect(px-6,py+2,5,13);ctx.fillRect(px+1,py+2,5,13);
          ctx.fillStyle=skinCol;ctx.fillRect(px-7,py+12,7,5);ctx.fillRect(px,py+12,7,5);
          ctx.fillStyle=bodyCol;ctx.beginPath();ctx.roundRect(px-10,py-14,20,24,3);ctx.fill();
          ctx.strokeStyle='rgba(102,221,68,0.5)';ctx.lineWidth=1.5;
          ctx.beginPath();ctx.moveTo(px-8,py-8);ctx.lineTo(px+8,py-8);ctx.stroke();
          ctx.beginPath();ctx.moveTo(px-8,py-2);ctx.lineTo(px+8,py-2);ctx.stroke();
          ctx.strokeStyle=bodyCol;ctx.lineWidth=6;ctx.lineCap='round';
          ctx.beginPath();ctx.moveTo(px-10,py-6);ctx.lineTo(px-19,py+4);ctx.stroke();
          ctx.beginPath();ctx.moveTo(px+10,py-6);ctx.lineTo(px+19,py+4);ctx.stroke();
          ctx.lineCap='butt';ctx.fillStyle=skinCol;
          ctx.beginPath();ctx.arc(px-19,py+4,4,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.arc(px+19,py+4,4,0,Math.PI*2);ctx.fill();
          ctx.fillStyle=skinCol;ctx.fillRect(px-3,py-16,6,4);
          ctx.beginPath();ctx.arc(px,py-22,9,0,Math.PI*2);ctx.fill();
          ctx.fillStyle=hairCol;ctx.beginPath();ctx.arc(px,py-25,8,Math.PI,0);ctx.fill();ctx.fillRect(px-8,py-26,16,5);
          ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(px-3.5,py-23,2,1.5,0,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.ellipse(px+3.5,py-23,2,1.5,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#2a1800';ctx.beginPath();ctx.arc(px-3.5,py-23,1,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.arc(px+3.5,py-23,1,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='rgba(0,0,0,0.2)';ctx.beginPath();ctx.arc(px,py-20,1.2,0,Math.PI*2);ctx.fill();
          ctx.strokeStyle='rgba(100,40,20,0.7)';ctx.lineWidth=1;
          ctx.beginPath();ctx.arc(px,py-17.5,2.5,0.15,Math.PI-0.15);ctx.stroke();
          if(label){ctx.fillStyle=AMBER;ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.shadowColor=LEAF;ctx.shadowBlur=6;ctx.fillText(label,px,py-36);ctx.shadowBlur=0;}
        };
        // Title
        ctx.save();ctx.font="bold 12px Orbitron, monospace";ctx.textAlign="center";
        ctx.fillStyle=BONE;ctx.shadowColor=LEAF;ctx.shadowBlur=14;
        ctx.fillText("⬡ DINO RESEARCH ⬡",cx,topY-8);ctx.shadowBlur=0;ctx.restore();
        // Counter top
        const cg=ctx.createLinearGradient(cx-60,topY+8,cx-60,topY+46);
        cg.addColorStop(0,"#2a4a18");cg.addColorStop(1,"#162e0c");
        ctx.fillStyle=cg;ctx.strokeStyle=LEAF;ctx.lineWidth=2;
        rr(cx-60,topY+8,120,38,3);ctx.fill();ctx.stroke();
        ctx.fillStyle=BONE;rr(cx-58,topY+10,116,8,2);ctx.fill();
        // Amber orb (glowing)
        ctx.fillStyle="#140800";rr(cx+20,topY+12,32,28,2);ctx.fill();
        const orbG=ctx.createRadialGradient(cx+36,topY+26,2,cx+36,topY+26,10);
        orbG.addColorStop(0,`rgba(${AMBERr},0.95)`);orbG.addColorStop(1,`rgba(${AMBERr},0.1)`);
        ctx.fillStyle=orbG;ctx.shadowColor=AMBER;ctx.shadowBlur=12+Math.sin(t13*2)*4;
        ctx.beginPath();ctx.arc(cx+36,topY+26,10,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        // DNA helix display (left of counter)
        const helixX=cx-45,helixY=topY+12;
        for(let hi=0;hi<8;hi++){
          const hy=helixY+hi*4;
          ctx.strokeStyle=hi%2===0?LEAF:AMBER;ctx.lineWidth=1.5;
          ctx.beginPath();ctx.moveTo(helixX+Math.sin(hi*0.8)*8,hy);ctx.lineTo(helixX+Math.sin(hi*0.8+Math.PI)*8,hy+3);ctx.stroke();
        }
        ctx.fillStyle=LEAF;ctx.font="bold 5px monospace";ctx.textAlign="center";ctx.fillText("DNA",helixX,topY+50);
        // Left fossil shelf
        ctx.fillStyle="#162e0c";ctx.strokeStyle=MOSS;ctx.lineWidth=1.5;
        rr(W*0.04,topY+4,56,H*0.4,2);ctx.fill();ctx.stroke();
        ctx.fillStyle="#223a10";ctx.fillRect(W*0.04,topY+30,56,3);ctx.fillRect(W*0.04,topY+58,56,3);ctx.fillRect(W*0.04,topY+86,56,3);
        const fossils13=[
          {x:W*0.06,y:topY+8,w:16,h:14,c:AMBER},{x:W*0.06+20,y:topY+10,w:14,h:12,c:BONE},
          {x:W*0.06,y:topY+34,w:18,h:16,c:LEAF},{x:W*0.06+22,y:topY+36,w:14,h:14,c:AMBER},
          {x:W*0.06,y:topY+62,w:20,h:18,c:BONE},{x:W*0.06+24,y:topY+64,w:12,h:14,c:LEAF}];
        for(const f of fossils13){ctx.fillStyle="#050e03";rr(f.x,f.y,f.w,f.h,2);ctx.fill();ctx.fillStyle=f.c;ctx.shadowColor=f.c;ctx.shadowBlur=4;ctx.fillRect(f.x+2,f.y+2,f.w-4,f.h-4);ctx.shadowBlur=0;}
        // 4 specimen tanks center-left
        const tankData=[{c:LEAF,l:"RAPTOR EGG"},{c:AMBER,l:"FERN SAMPLE"},{c:BONE,l:"BONE CHIP"},{c:"#88FFCC",l:"SPORE"}];
        for(let ti=0;ti<4;ti++){
          const tx=cx-90+ti*46,ty2=midY-12;
          ctx.fillStyle="#060e03";ctx.strokeStyle=tankData[ti].c;ctx.lineWidth=1.5;
          rr(tx-16,ty2,32,30,4);ctx.fill();ctx.stroke();
          const tG=ctx.createRadialGradient(tx,ty2+15,2,tx,ty2+15,12);
          tG.addColorStop(0,tankData[ti].c+"CC");tG.addColorStop(1,tankData[ti].c+"22");
          ctx.fillStyle=tG;ctx.shadowColor=tankData[ti].c;ctx.shadowBlur=6+Math.sin(t13*2+ti)*2;
          ctx.beginPath();ctx.ellipse(tx,ty2+15,10,12,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
          ctx.fillStyle=BONE;ctx.font="5px monospace";ctx.textAlign="center";ctx.fillText(tankData[ti].l,tx,ty2+38);
        }
        // Microscope on right side
        const msX=W*0.80,msY=midY-15;
        ctx.fillStyle="#1e3c14";ctx.strokeStyle=MOSS;ctx.lineWidth=1.5;
        rr(msX-14,msY,28,32,3);ctx.fill();ctx.stroke();
        ctx.fillStyle=LEAF;ctx.fillRect(msX-2,msY+2,4,20);
        ctx.fillStyle=AMBER;ctx.shadowColor=AMBER;ctx.shadowBlur=8;
        ctx.beginPath();ctx.arc(msX,msY+5,6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        ctx.fillStyle=BONE;ctx.font="bold 5px monospace";ctx.textAlign="center";ctx.fillText("SCOPE",msX,msY+40);
        // Right research station
        ctx.fillStyle="#162e0c";ctx.strokeStyle=MOSS;ctx.lineWidth=1.5;
        rr(W*0.76,topY+8,52,80,3);ctx.fill();ctx.stroke();
        for(let rb=0;rb<4;rb++){ctx.fillStyle="#2a4818";ctx.fillRect(W*0.78,topY+12+rb*18,8,14);ctx.fillRect(W*0.78+12,topY+14+rb*18,6,12);ctx.fillRect(W*0.78+22,topY+10+rb*18,10,16);}
        ctx.fillStyle=AMBER;ctx.shadowColor=AMBER;ctx.shadowBlur=8;
        ctx.beginPath();ctx.arc(W*0.78+36,topY+68,6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        ctx.fillStyle=LEAF;ctx.font="bold 6px monospace";ctx.textAlign="center";ctx.fillText("RESEARCH",W*0.76+26,topY+96);
        // Wall chart (skeleton outline)
        ctx.fillStyle="#0a1a06";ctx.strokeStyle=MOSS;ctx.lineWidth=1;
        rr(W*0.04,topY+H*0.42,56,40,2);ctx.fill();ctx.stroke();
        ctx.strokeStyle=BONE;ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(W*0.04+10,topY+H*0.44);ctx.lineTo(W*0.04+46,topY+H*0.44);ctx.stroke();
        ctx.beginPath();ctx.arc(W*0.04+28,topY+H*0.45,8,0,Math.PI*2);ctx.stroke();
        ctx.fillStyle=BONE;ctx.font="5px monospace";ctx.textAlign="center";ctx.fillText("RAPTOR CHART",W*0.04+28,topY+H*0.42+36);
        // Drawn RESEARCHER
        drawTribalPerson13(cx+40,midY+20,'#1e3c14','#c09060','#0a0a0a','RESEARCHER');
        // Fireflies
        ctx.save();
        for(let fi=0;fi<6;fi++){
          const fx=W*0.1+((t13*12+fi*55)%(W*0.8)),fy=topY+60+Math.sin(t13+fi*1.2)*25;
          const fa=Math.sin(t13*2+fi)*0.3+0.4;
          ctx.fillStyle=fi%2===0?`rgba(${LEAFr},${fa})`:`rgba(${AMBERr},${fa})`;
          ctx.shadowColor=fi%2===0?LEAF:AMBER;ctx.shadowBlur=5;
          ctx.beginPath();ctx.arc(fx,fy,1.6,0,Math.PI*2);ctx.fill();
        }
        ctx.shadowBlur=0;ctx.restore();
      } else if (isRobotTech) {
        // ═══ ROBOT CITY: MECH TECH LAB ═══
        const tR = performance.now() / 1000;

        // ── Dark teal circuit floor ────────────────────────────
        ctx.fillStyle = "#020a0d"; ctx.fillRect(0,0,W,H);
        const tSzR=Math.round(W/16);
        for (let gy=0;gy<=Math.ceil(H/tSzR);gy++) for (let gx=0;gx<=Math.ceil(W/tSzR);gx++) {
          const ftx=gx*tSzR,fty=gy*tSzR,fsd=gx*13+gy*7;
          ctx.fillStyle=fsd%3===0?"rgba(2,14,18,0.97)":fsd%3===1?"rgba(3,16,20,0.97)":"rgba(2,12,16,0.97)";
          ctx.fillRect(ftx,fty,tSzR,tSzR);
          ctx.strokeStyle=`rgba(0,255,176,${0.05+0.03*Math.sin(tR*0.7+fsd*0.12)})`;
          ctx.lineWidth=0.7; ctx.strokeRect(ftx,fty,tSzR,tSzR);
        }

        // ── Room border ────────────────────────────────────────
        ctx.strokeStyle=`rgba(0,255,176,${0.6+0.2*Math.sin(tR*1.3)})`; ctx.lineWidth=3;
        ctx.strokeRect(2,2,W-4,H-4);
        ctx.strokeStyle="rgba(0,200,140,0.22)"; ctx.lineWidth=1; ctx.strokeRect(7,7,W-14,H-14);

        // ── Ceiling scan-lights (one flickers) ────────────────
        const hLXR=[W*0.15,W*0.40,W*0.65,W*0.88];
        for (let li=0;li<4;li++) {
          const lx=hLXR[li], fl=li===3?(0.55+0.45*Math.sin(tR*13.1)):1;
          const lc=ctx.createRadialGradient(lx,0,2,lx,H*0.28,W*0.13);
          lc.addColorStop(0,`rgba(0,255,176,${0.10*fl})`); lc.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=lc; ctx.beginPath(); ctx.moveTo(lx-5,0); ctx.lineTo(lx-W*0.08,H*0.35); ctx.lineTo(lx+W*0.08,H*0.35); ctx.closePath(); ctx.fill();
          ctx.fillStyle=`rgba(0,255,176,${0.8*fl})`; ctx.shadowColor="#00FFB0"; ctx.shadowBlur=10*fl;
          ctx.beginPath(); ctx.arc(lx,5,4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        }

        // ── MECH TECH LAB banner ───────────────────────────────
        const bWR=W*0.56, bHR=H*0.042, bXR=cx-bWR/2, bYR=room.S-bHR-4;
        const bGrR=ctx.createLinearGradient(bXR,bYR,bXR+bWR,bYR);
        bGrR.addColorStop(0,"rgba(0,14,10,0.97)"); bGrR.addColorStop(0.5,"rgba(0,38,28,0.99)"); bGrR.addColorStop(1,"rgba(0,14,10,0.97)");
        ctx.fillStyle=bGrR; rr(bXR,bYR,bWR,bHR,7); ctx.fill();
        ctx.strokeStyle=`rgba(0,255,176,${0.7+0.3*Math.sin(tR*1.8)})`; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle="#AAFFD8"; ctx.font=`bold ${Math.round(bHR*0.55)}px monospace`; ctx.textAlign="center";
        ctx.shadowColor="#00FFB0"; ctx.shadowBlur=14;
        ctx.fillText("⚡  MECH  TECH  LAB  ⚡",cx,bYR+bHR*0.72); ctx.shadowBlur=0;

        // ── SYSTEM ALERT sign (blink) ──────────────────────────
        const rWarnR=0.7+0.3*Math.sin(tR*3.5);
        const rWR=W*0.13, rHR=H*0.038;
        ctx.fillStyle=`rgba(0,255,176,${rWarnR})`; ctx.shadowColor="#00FFB0"; ctx.shadowBlur=14*rWarnR;
        rr(cx-rWR/2,topY+H*0.04,rWR,rHR,5); ctx.fill(); ctx.shadowBlur=0;
        ctx.strokeStyle=`rgba(0,200,140,${rWarnR})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#020a0d"; ctx.font=`bold ${Math.round(rHR*0.5)}px monospace`; ctx.textAlign="center";
        ctx.fillText("⚡ SYSTEM ONLINE ⚡",cx,topY+H*0.04+rHR*0.7);

        // ── Top: neural server rack (full width) ──────────────
        const srvYR=topY+H*0.005, srvHR=H*0.065;
        const srvBgR=ctx.createLinearGradient(W*0.04,srvYR,W*0.96,srvYR+srvHR);
        srvBgR.addColorStop(0,"#020a0d"); srvBgR.addColorStop(0.5,"#031418"); srvBgR.addColorStop(1,"#020a0d");
        ctx.fillStyle=srvBgR; rr(W*0.04,srvYR,W*0.92,srvHR,5); ctx.fill();
        ctx.strokeStyle="rgba(0,220,160,0.65)"; ctx.lineWidth=1.5; ctx.stroke();
        for (let si=0;si<12;si++) {
          const sx=W*0.05+si*(W*0.9/12);
          ctx.fillStyle="#020a0d"; ctx.strokeStyle="rgba(0,180,130,0.38)"; ctx.lineWidth=0.7;
          ctx.fillRect(sx,srvYR+3,W*0.068,srvHR-6); ctx.strokeRect(sx,srvYR+3,W*0.068,srvHR-6);
          const lCR=["#00FFB0","#44FFCC","#00DDA0","#66FFD0","#00CC90","#88FFE0","#00FFB0","#44FFCC","#00DDA0","#00CC90","#66FFD0","#AAFFD8"][si];
          const lAR=0.5+0.5*Math.sin(tR*(1.2+si*0.25)+si);
          ctx.fillStyle=lCR; ctx.shadowColor=lCR; ctx.shadowBlur=4*lAR;
          ctx.fillRect(sx+2,srvYR+4,W*0.05,3); ctx.shadowBlur=0;
          const daR=Math.sin(tR*(3+si*0.7)+si)>0.4;
          ctx.fillStyle=daR?"#00FFB0":"#031418";
          ctx.beginPath(); ctx.arc(sx+W*0.057,srvYR+srvHR-6,2.5,0,Math.PI*2); ctx.fill();
        }

        // ── Main workstation desk ──────────────────────────────
        const dYR=topY+H*0.10, dH3R=H*0.055, dW3R=W*0.82, dX3R=cx-dW3R/2;
        const dBgR=ctx.createLinearGradient(dX3R,dYR,dX3R+dW3R,dYR+dH3R);
        dBgR.addColorStop(0,"#020a0d"); dBgR.addColorStop(0.5,"#041418"); dBgR.addColorStop(1,"#020a0d");
        ctx.fillStyle=dBgR; rr(dX3R,dYR,dW3R,dH3R,6); ctx.fill();
        ctx.strokeStyle="rgba(0,220,160,0.82)"; ctx.lineWidth=2; ctx.stroke();
        ctx.strokeStyle=`rgba(0,255,176,${0.42+0.25*Math.sin(tR*1.5)})`; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(dX3R+10,dYR+dH3R-2); ctx.lineTo(dX3R+dW3R-10,dYR+dH3R-2); ctx.stroke();
        // Keyboard
        ctx.fillStyle="#020a0d"; rr(dX3R+dW3R*0.04,dYR+4,dW3R*0.2,dH3R-8,3); ctx.fill();
        ctx.strokeStyle="rgba(0,180,130,0.38)"; ctx.lineWidth=0.8; ctx.stroke();
        for (let ki=0;ki<10;ki++) { const kr=Math.floor(ki/5),kc=ki%5; ctx.fillStyle=`rgba(0,255,176,${0.24+0.14*Math.sin(tR+ki)})`; ctx.fillRect(dX3R+dW3R*0.05+kc*dW3R*0.036,dYR+6+kr*7,dW3R*0.028,5); }

        // Holo-display above desk
        const hW3R=W*0.26, hH4R=H*0.13, hX3R=cx-hW3R/2, hY3R=dYR-hH4R-H*0.006;
        const glitchR=(Math.sin(tR*8.1)>0.88)?Math.sin(tR*28)*3:0;
        ctx.fillStyle="rgba(2,10,14,0.93)"; rr(hX3R+glitchR,hY3R,hW3R,hH4R,5); ctx.fill();
        ctx.strokeStyle=`rgba(0,255,176,${0.6+0.3*Math.sin(tR*2.1)})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#00FFB0"; ctx.font=`bold ${Math.round(hH4R*0.13)}px monospace`; ctx.textAlign="center";
        ctx.shadowColor="#00DDA0"; ctx.shadowBlur=8;
        ctx.fillText("⚡ MECH ONLINE ⚡",cx+glitchR*0.5,hY3R+hH4R*0.22); ctx.shadowBlur=0;
        const dLinesR=["CPU: 99.9%","BOTS: 1,024","TEMP: 88°C","GRID: LIVE","UPLINK: OK"];
        for (let dl=0;dl<5;dl++) {
          ctx.fillStyle=dl===2?`rgba(255,180,0,0.9)`:`rgba(0,255,176,${dl%2===0?0.88:0.55})`;
          ctx.font=`${Math.round(hH4R*0.1)}px monospace`; ctx.textAlign="left";
          ctx.fillText(dLinesR[dl],hX3R+hW3R*0.06+glitchR,hY3R+hH4R*0.35+dl*hH4R*0.13);
        }
        ctx.strokeStyle="rgba(0,255,176,0.55)"; ctx.lineWidth=1.2;
        ctx.beginPath();
        for (let wx=0;wx<hW3R-10;wx+=2) { const wy=hY3R+hH4R*0.82+hH4R*0.1*Math.sin(tR*6.2+wx*0.22); wx===0?ctx.moveTo(hX3R+5+wx,wy):ctx.lineTo(hX3R+5+wx,wy); }
        ctx.stroke();

        // ── LEFT: Plasma arc generator ────────────────────────
        const tcXR=W*0.06, tcYR=H*0.28, tcWR=W*0.11, tcHR=H*0.52;
        ctx.fillStyle="#020a0d"; ctx.strokeStyle="rgba(0,220,160,0.7)"; ctx.lineWidth=2;
        rr(tcXR,tcYR+tcHR-tcHR*0.11,tcWR,tcHR*0.11,5); ctx.fill(); ctx.stroke();
        const cColR=ctx.createLinearGradient(tcXR+tcWR*0.3,tcYR,tcXR+tcWR*0.7,tcYR);
        cColR.addColorStop(0,"#040e12"); cColR.addColorStop(0.5,"#071822"); cColR.addColorStop(1,"#040e12");
        ctx.fillStyle=cColR; ctx.strokeStyle="rgba(0,180,130,0.48)"; ctx.lineWidth=1.5;
        ctx.fillRect(tcXR+tcWR*0.3,tcYR+tcHR*0.14,tcWR*0.4,tcHR*0.73); ctx.strokeRect(tcXR+tcWR*0.3,tcYR+tcHR*0.14,tcWR*0.4,tcHR*0.73);
        for (let ci=0;ci<8;ci++) {
          const cyR=tcYR+tcHR*0.17+ci*(tcHR*0.64/8);
          ctx.strokeStyle=`rgba(0,${200+ci*6},${140+ci*4},0.45)`; ctx.lineWidth=2;
          ctx.beginPath(); ctx.ellipse(tcXR+tcWR/2,cyR,tcWR*0.43,tcHR*0.024,0,0,Math.PI*2); ctx.stroke();
        }
        const tsRR=tcWR*0.4;
        const tsGR=ctx.createRadialGradient(tcXR+tcWR/2,tcYR+tsRR*0.45,tsRR*0.08,tcXR+tcWR/2,tcYR+tsRR*0.45,tsRR);
        tsGR.addColorStop(0,"#0a2820"); tsGR.addColorStop(0.5,"#061a14"); tsGR.addColorStop(1,"#020a0d");
        ctx.fillStyle=tsGR; ctx.strokeStyle=`rgba(0,255,176,${0.6+0.3*Math.sin(tR*2)})`; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(tcXR+tcWR/2,tcYR+tsRR*0.52,tsRR,0,Math.PI*2); ctx.fill(); ctx.stroke();
        for (let ai=0;ai<6;ai++) {
          const aSR=Math.floor(tR*4+ai*3.1)%7;
          const aX6=tcXR+tcWR/2, aY6=tcYR+tsRR*0.52;
          const aX7=aX6+Math.sin(ai*1.3+tR*2+aSR)*tcWR*0.9, aY7=aY6+Math.cos(ai*1.1+tR*1.7+aSR)*tcWR*0.7;
          const aA3=0.4+0.5*Math.abs(Math.sin(tR*7+ai));
          ctx.strokeStyle=`rgba(0,255,176,${aA3})`; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(aX6,aY6); ctx.quadraticCurveTo(aX6+(aX7-aX6)*0.5+Math.sin(tR*11+ai)*8,aY6+(aY7-aY6)*0.5+Math.cos(tR*9+ai)*7,aX7,aY7); ctx.stroke();
          ctx.fillStyle=`rgba(0,255,200,${aA3*0.7})`; ctx.shadowColor="#00FFB0"; ctx.shadowBlur=6*aA3;
          ctx.beginPath(); ctx.arc(aX7,aY7,2,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        }
        ctx.fillStyle="#00FFB0"; ctx.font=`bold ${Math.round(tcWR*0.28)}px monospace`; ctx.textAlign="center";
        ctx.shadowColor="#00DDA0"; ctx.shadowBlur=8;
        ctx.fillText("PLASMA",tcXR+tcWR/2,tcYR+tcHR+12); ctx.shadowBlur=0;

        // ── CENTER: Bot assembly schematic table ───────────────
        const htXR=cx-W*0.11, htYR=midY-H*0.065, htWR=W*0.22, htHR=H*0.13;
        ctx.fillStyle="rgba(2,10,14,0.88)"; rr(htXR,htYR,htWR,htHR,5); ctx.fill();
        ctx.strokeStyle=`rgba(0,220,160,${0.5+0.3*Math.sin(tR*1.4)})`; ctx.lineWidth=1.5; ctx.stroke();
        // Robot schematic grid
        ctx.strokeStyle=`rgba(0,255,176,${0.18+0.08*Math.sin(tR*2)})`; ctx.lineWidth=1;
        for (let gr=1;gr<=3;gr++) { ctx.beginPath(); ctx.ellipse(htXR+htWR/2,htYR+htHR/2,htWR*0.42*gr/3,htHR*0.42*gr/3,0,0,Math.PI*2); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(htXR+htWR*0.08,htYR+htHR/2); ctx.lineTo(htXR+htWR*0.92,htYR+htHR/2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(htXR+htWR/2,htYR+htHR*0.1); ctx.lineTo(htXR+htWR/2,htYR+htHR*0.9); ctx.stroke();
        // Bot shape schematic
        const bsCX=htXR+htWR/2, bsCY=htYR+htHR/2;
        const bsP=0.5+0.5*Math.sin(tR*2.5);
        ctx.fillStyle=`rgba(0,255,176,${0.55*bsP})`; ctx.shadowColor="#00FFB0"; ctx.shadowBlur=6*bsP;
        ctx.fillRect(bsCX-7,bsCY-12,14,10); // body
        ctx.fillRect(bsCX-5,bsCY-18,10,7);  // head
        ctx.fillRect(bsCX-11,bsCY-10,3,8);  // left arm
        ctx.fillRect(bsCX+8,bsCY-10,3,8);   // right arm
        ctx.fillRect(bsCX-5,bsCY-2,4,9);    // left leg
        ctx.fillRect(bsCX+1,bsCY-2,4,9);    // right leg
        ctx.shadowBlur=0;
        ctx.fillStyle="#00FFB0"; ctx.font=`bold ${Math.round(htHR*0.14)}px monospace`; ctx.textAlign="center";
        ctx.fillText("BOT SCHEMATIC",htXR+htWR/2,htYR+htHR+12);

        // ── CENTER-LEFT: Circuit board panel ──────────────────
        const cpXR=cx-W*0.35, cpYR=midY-H*0.14, cpWR=W*0.13, cpHR=H*0.28;
        ctx.fillStyle="#020a0d"; ctx.strokeStyle="rgba(0,220,160,0.5)"; ctx.lineWidth=1.5;
        rr(cpXR,cpYR,cpWR,cpHR,4); ctx.fill(); ctx.stroke();
        ctx.strokeStyle="rgba(0,200,150,0.35)"; ctx.lineWidth=1;
        const cpTxR=[cpXR+8,cpXR+cpWR*0.35,cpXR+cpWR*0.6,cpXR+cpWR-8];
        for (let px2=0;px2<4;px2++) { ctx.beginPath(); ctx.moveTo(cpTxR[px2],cpYR+8); ctx.lineTo(cpTxR[px2],cpYR+cpHR-8); ctx.stroke(); }
        const cpTyR=[cpYR+cpHR*0.25,cpYR+cpHR*0.5,cpYR+cpHR*0.75];
        for (let py2=0;py2<3;py2++) { ctx.beginPath(); ctx.moveTo(cpXR+8,cpTyR[py2]); ctx.lineTo(cpXR+cpWR-8,cpTyR[py2]); ctx.stroke(); }
        const icsR=[{x:cpXR+cpWR*0.15,y:cpYR+cpHR*0.2},{x:cpXR+cpWR*0.55,y:cpYR+cpHR*0.45},{x:cpXR+cpWR*0.2,y:cpYR+cpHR*0.65}];
        for (const icR of icsR) {
          ctx.fillStyle="#040e12"; ctx.strokeStyle="rgba(0,255,176,0.5)"; ctx.lineWidth=1;
          ctx.fillRect(icR.x-8,icR.y-5,16,10); ctx.strokeRect(icR.x-8,icR.y-5,16,10);
          ctx.fillStyle=`rgba(0,255,176,${0.5+0.3*Math.sin(tR*2+icR.x)})`; ctx.shadowColor="#00FFB0"; ctx.shadowBlur=4;
          ctx.beginPath(); ctx.arc(icR.x,icR.y,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        }
        ctx.fillStyle="#00FFB0"; ctx.font=`bold ${Math.round(cpHR*0.09)}px monospace`; ctx.textAlign="center";
        ctx.fillText("CIRCUIT ARRAY",cpXR+cpWR/2,cpYR+cpHR+12);

        // ── CENTER-RIGHT: System diagnostic panel ─────────────
        const gmXR=cx+W*0.22, gmYR=midY-H*0.11, gmWR=W*0.13, gmHR=H*0.22;
        ctx.fillStyle="#020a0d"; ctx.strokeStyle="rgba(0,220,160,0.5)"; ctx.lineWidth=1.5;
        rr(gmXR,gmYR,gmWR,gmHR,4); ctx.fill(); ctx.stroke();
        ctx.fillStyle="#00FFB0"; ctx.font=`bold ${Math.round(gmHR*0.1)}px monospace`; ctx.textAlign="center";
        ctx.fillText("DIAG PANEL",gmXR+gmWR/2,gmYR+gmHR*0.15);
        const dCXR=gmXR+gmWR/2, dCYR=gmYR+gmHR*0.5, dRR=gmWR*0.35;
        ctx.strokeStyle="rgba(0,200,150,0.3)"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.arc(dCXR,dCYR,dRR,Math.PI,2*Math.PI); ctx.stroke();
        ctx.strokeStyle="rgba(0,200,150,0.15)"; ctx.lineWidth=0.8;
        for (let mk=0;mk<=5;mk++) {
          const angR=Math.PI+mk*Math.PI/5;
          ctx.beginPath(); ctx.moveTo(dCXR+Math.cos(angR)*(dRR-4),dCYR+Math.sin(angR)*(dRR-4));
          ctx.lineTo(dCXR+Math.cos(angR)*dRR,dCYR+Math.sin(angR)*dRR); ctx.stroke();
        }
        const nAngR=Math.PI+Math.PI*((Math.sin(tR*0.8)*0.5+0.5)*0.9+0.05);
        ctx.strokeStyle="#00FFB0"; ctx.lineWidth=2; ctx.shadowColor="#00DDA0"; ctx.shadowBlur=6;
        ctx.beginPath(); ctx.moveTo(dCXR,dCYR); ctx.lineTo(dCXR+Math.cos(nAngR)*dRR*0.85,dCYR+Math.sin(nAngR)*dRR*0.85); ctx.stroke(); ctx.shadowBlur=0;
        ctx.fillStyle="#00CC90"; ctx.beginPath(); ctx.arc(dCXR,dCYR,3,0,Math.PI*2); ctx.fill();
        const cpuVal=Math.floor(88+Math.sin(tR*1.3)*8);
        ctx.fillStyle="#AAFFD8"; ctx.font=`bold ${Math.round(gmHR*0.09)}px monospace`; ctx.textAlign="center";
        ctx.fillText(`CPU ${cpuVal}%`,dCXR,gmYR+gmHR*0.82);
        ctx.fillStyle="#00CC90"; ctx.font=`${Math.round(gmHR*0.08)}px monospace`;
        ctx.fillText("LOAD",dCXR,gmYR+gmHR*0.92);

        // ── RIGHT: Tech fluid racks ────────────────────────────
        const vrXR=W*0.78, vrYR=H*0.28, vrWR=W*0.2, vrHR=H*0.52;
        ctx.fillStyle="#020a0d"; ctx.strokeStyle="rgba(0,220,160,0.5)"; ctx.lineWidth=1.5;
        rr(vrXR,vrYR,vrWR,vrHR,5); ctx.fill(); ctx.stroke();
        const vialsR=[{l:"COOLANT",c:"rgba(0,255,176,0.9)"},{l:"NANO-OIL",c:"rgba(0,220,255,0.9)"},{l:"PLASMA",c:"rgba(100,255,220,0.9)"},{l:"SYNC-GEL",c:"rgba(0,200,150,0.9)"},{l:"SERVO",c:"rgba(0,255,130,0.9)"},{l:"BOOST",c:"rgba(44,255,200,0.9)"}];
        for (let vi=0;vi<6;vi++) {
          const vc=vi%2, vr=Math.floor(vi/2);
          const vxR=vrXR+vrWR*0.14+vc*vrWR*0.48, vyR=vrYR+vrHR*0.1+vr*vrHR*0.3;
          const vWR=vrWR*0.28, vHR=vrHR*0.22;
          ctx.fillStyle="rgba(2,10,14,0.9)"; rr(vxR,vyR,vWR,vHR,4); ctx.fill();
          ctx.strokeStyle=vialsR[vi].c; ctx.lineWidth=1.5; ctx.stroke();
          const vFillR=0.3+Math.sin(tR*0.7+vi*1.1)*0.25+0.4;
          const vGrR=ctx.createLinearGradient(vxR,vyR+vHR*(1-vFillR),vxR,vyR+vHR);
          vGrR.addColorStop(0,vialsR[vi].c.replace(",0.9)",",0.75)")); vGrR.addColorStop(1,vialsR[vi].c.replace(",0.9)",",0.3)"));
          ctx.fillStyle=vGrR; ctx.fillRect(vxR+2,vyR+vHR*(1-vFillR)+2,vWR-4,vHR*vFillR-4);
          ctx.fillStyle=vialsR[vi].c; ctx.shadowColor=vialsR[vi].c; ctx.shadowBlur=6+3*Math.sin(tR+vi);
          ctx.beginPath(); ctx.arc(vxR+vWR/2,vyR+vHR*0.3,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
          ctx.fillStyle="#AAFFD8"; ctx.font=`bold ${Math.round(vHR*0.2)}px monospace`; ctx.textAlign="center";
          ctx.fillText(vialsR[vi].l,vxR+vWR/2,vyR+vHR+11);
        }

        // ── BOTTOM: 4 data core bins ──────────────────────────
        const binWR=W*0.17, binHR=H*0.075;
        for (let bi=0;bi<4;bi++) {
          const bx=W*0.07+bi*(W*0.85/4), by=H*0.82;
          ctx.fillStyle="#020a0d"; ctx.strokeStyle="rgba(0,200,150,0.4)"; ctx.lineWidth=1.5;
          rr(bx,by,binWR,binHR,4); ctx.fill(); ctx.stroke();
          const bFillR=0.2+((bi*0.19+Math.sin(tR*0.6+bi)*0.08)%0.7);
          const bGrRB=ctx.createLinearGradient(bx,by+binHR*(1-bFillR),bx,by+binHR);
          bGrRB.addColorStop(0,"rgba(0,255,176,0.5)"); bGrRB.addColorStop(1,"rgba(0,180,130,0.25)");
          ctx.fillStyle=bGrRB; ctx.fillRect(bx+2,by+binHR*(1-bFillR)+2,binWR-4,binHR*bFillR-4);
          ctx.strokeStyle=`rgba(0,255,176,${0.4+0.3*Math.sin(tR*2+bi)})`; ctx.lineWidth=1;
          ctx.strokeRect(bx+2,by+binHR*(1-bFillR)+2,binWR-4,binHR*bFillR-4);
          const labelsR=["CORE-A","CORE-B","CACHE","NET BUS"];
          ctx.fillStyle="#00DDA0"; ctx.font=`bold ${Math.round(binHR*0.25)}px monospace`; ctx.textAlign="center";
          ctx.fillText(labelsR[bi],bx+binWR/2,by+binHR*0.65);
          ctx.fillStyle="#AAFFD8"; ctx.font=`${Math.round(binHR*0.2)}px monospace`;
          ctx.fillText(`${Math.round(bFillR*100)}%`,bx+binWR/2,by+binHR+12);
        }

        // ── Trophy shelf ───────────────────────────────────────
        const trXR=W*0.80, trYR=H*0.28+H*0.56, trWR=W*0.18, trHR=H*0.065;
        ctx.fillStyle="#030e12"; ctx.strokeStyle="rgba(0,200,150,0.35)"; ctx.lineWidth=1;
        rr(trXR,trYR,trWR,trHR,3); ctx.fill(); ctx.stroke();
        for (const trR of [{dx:0.2,c:"#FFDD44",s:"⬡"},{dx:0.5,c:"#00FFB0",s:"⚡"},{dx:0.8,c:"#44FFCC",s:"★"}]) {
          ctx.fillStyle=trR.c; ctx.shadowColor=trR.c; ctx.shadowBlur=7;
          ctx.font=`bold ${Math.round(trHR*0.65)}px monospace`; ctx.textAlign="center";
          ctx.fillText(trR.s,trXR+trWR*trR.dx,trYR+trHR*0.75); ctx.shadowBlur=0;
        }

        // ── Floor cable runs ───────────────────────────────────
        ctx.strokeStyle="rgba(0,200,150,0.18)"; ctx.lineWidth=2; ctx.setLineDash([6,5]);
        ctx.beginPath(); ctx.moveTo(tcXR+tcWR,tcYR+tcHR*0.5); ctx.lineTo(cx-W*0.05,tcYR+tcHR*0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(vrXR,vrYR+vrHR*0.5); ctx.lineTo(cx+W*0.1,vrYR+vrHR*0.5); ctx.stroke();
        ctx.setLineDash([]);

        // ── News ticker ────────────────────────────────────────
        const tkY4=H*0.94;
        ctx.fillStyle="rgba(2,10,14,0.88)"; ctx.fillRect(0,tkY4,W,H*0.035);
        ctx.fillStyle=`rgba(0,255,176,${0.75+0.25*Math.sin(tR*4)})`; rr(W*0.005,tkY4+H*0.001,W*0.05,H*0.027,3); ctx.fill();
        ctx.fillStyle="#020a0d"; ctx.font=`bold ${Math.round(H*0.017)}px monospace`; ctx.textAlign="left";
        ctx.fillText("LIVE",W*0.005+W*0.05*0.14,tkY4+H*0.001+H*0.027*0.75);
        const tkTxtR="⚡ MECH TECH LAB  ✦  CPU: 99.9%  ✦  BOTS ONLINE: 1,024  ✦  GRID: ACTIVE  ✦  PLASMA ARC: STABLE  ✦  NET BUS: CLEAR  ✦  ";
        const tkXR=W*0.06+W-(tR*52)%(W+1500);
        ctx.save(); ctx.beginPath(); ctx.rect(W*0.06,tkY4,W-W*0.06,H*0.032); ctx.clip();
        ctx.fillStyle="#AAFFD8"; ctx.font=`bold ${Math.round(H*0.017)}px monospace`; ctx.textAlign="left";
        ctx.fillText(tkTxtR,tkXR,tkY4+H*0.021); ctx.restore();

        // ── Ambient circuit sparks ─────────────────────────────
        for (let pi=0;pi<16;pi++) {
          const fpx=(Math.sin(pi*2.1+tR*0.34)*0.42+0.5)*W, fpy=(Math.cos(pi*1.6+tR*0.23)*0.38+0.5)*(H*0.88);
          const pA=0.08+0.05*Math.sin(tR*1.3+pi);
          ctx.fillStyle=pi%3===0?`rgba(0,255,176,${pA})`:pi%3===1?`rgba(0,220,160,${pA})`:`rgba(0,255,200,${pA})`;
          ctx.beginPath(); ctx.arc(fpx,fpy,1.8,0,Math.PI*2); ctx.fill();
        }

      } else if (isTechShop) {
        // ═══ WASTELAND: SCRAP TECH LAB ═══
        const t2 = performance.now() / 1000;

        // ── Rust floor ─────────────────────────────────────────
        ctx.fillStyle = "#100700"; ctx.fillRect(0,0,W,H);
        const tSz2=Math.round(W/16);
        for (let gy=0;gy<=Math.ceil(H/tSz2);gy++) for (let gx=0;gx<=Math.ceil(W/tSz2);gx++) {
          const tx=gx*tSz2,ty=gy*tSz2,sd=gx*13+gy*7;
          ctx.fillStyle=sd%3===0?"rgba(26,10,1,0.96)":sd%3===1?"rgba(18,7,1,0.96)":"rgba(22,9,2,0.96)";
          ctx.fillRect(tx,ty,tSz2,tSz2);
          ctx.strokeStyle=`rgba(180,75,8,${0.07+0.04*Math.sin(t2*0.7+sd*0.12)})`;
          ctx.lineWidth=0.7; ctx.strokeRect(tx,ty,tSz2,tSz2);
        }

        // ── Room border ──────────────────────────────────────────
        ctx.strokeStyle=`rgba(210,100,20,${0.6+0.2*Math.sin(t2*1.3)})`; ctx.lineWidth=3;
        ctx.strokeRect(2,2,W-4,H-4);
        ctx.strokeStyle="rgba(150,55,8,0.22)"; ctx.lineWidth=1; ctx.strokeRect(7,7,W-14,H-14);

        // ── Flickering industrial lights ─────────────────────────
        const hLX=[W*0.15,W*0.40,W*0.65,W*0.88];
        for (let li=0;li<4;li++) {
          const lx=hLX[li], fl=li===1?(0.55+0.45*Math.sin(t2*14.3)):1;
          const lc=ctx.createRadialGradient(lx,0,2,lx,H*0.28,W*0.13);
          lc.addColorStop(0,`rgba(255,175,55,${0.13*fl})`); lc.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=lc; ctx.beginPath(); ctx.moveTo(lx-5,0); ctx.lineTo(lx-W*0.08,H*0.35); ctx.lineTo(lx+W*0.08,H*0.35); ctx.closePath(); ctx.fill();
          ctx.fillStyle=`rgba(255,195,75,${0.8*fl})`; ctx.shadowColor="#FF9922"; ctx.shadowBlur=10*fl;
          ctx.beginPath(); ctx.arc(lx,5,4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        }

        // ── SCRAP TECH LAB banner ────────────────────────────────
        const bW=W*0.56, bH=H*0.042, bX=cx-bW/2, bY=room.S-bH-4;
        const bGr=ctx.createLinearGradient(bX,bY,bX+bW,bY);
        bGr.addColorStop(0,"rgba(45,18,2,0.97)"); bGr.addColorStop(0.5,"rgba(155,58,5,0.99)"); bGr.addColorStop(1,"rgba(45,18,2,0.97)");
        ctx.fillStyle=bGr; rr(bX,bY,bW,bH,7); ctx.fill();
        ctx.strokeStyle=`rgba(255,138,28,${0.7+0.3*Math.sin(t2*1.8)})`; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle="#FFE0A0"; ctx.font=`bold ${Math.round(bH*0.55)}px monospace`; ctx.textAlign="center";
        ctx.shadowColor="#FF8800"; ctx.shadowBlur=12;
        ctx.fillText("⚙  SCRAP  TECH  LAB  ⚙",cx,bY+bH*0.72); ctx.shadowBlur=0;

        // ── RADIATION WARNING sign ───────────────────────────────
        const rWarn=0.7+0.3*Math.sin(t2*3.5);
        const rW=W*0.12, rH=H*0.038;
        ctx.fillStyle=`rgba(255,200,0,${rWarn})`; ctx.shadowColor="#FFCC00"; ctx.shadowBlur=14*rWarn;
        rr(cx-rW/2,topY+H*0.04,rW,rH,5); ctx.fill(); ctx.shadowBlur=0;
        ctx.strokeStyle=`rgba(200,100,0,${rWarn})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#1a0800"; ctx.font=`bold ${Math.round(rH*0.5)}px monospace`; ctx.textAlign="center";
        ctx.fillText("☢ RADIATION ZONE ☢",cx,topY+H*0.04+rH*0.7);

        // ── Top: corroded server rack (full width) ───────────────
        const srvY=topY+H*0.005, srvH=H*0.065;
        const srvBg=ctx.createLinearGradient(W*0.04,srvY,W*0.96,srvY+srvH);
        srvBg.addColorStop(0,"#0d0500"); srvBg.addColorStop(0.5,"#1a0b02"); srvBg.addColorStop(1,"#0d0500");
        ctx.fillStyle=srvBg; rr(W*0.04,srvY,W*0.92,srvH,5); ctx.fill();
        ctx.strokeStyle="rgba(195,85,10,0.65)"; ctx.lineWidth=1.5; ctx.stroke();
        const srvN=12;
        for (let si=0;si<srvN;si++) {
          const sx=W*0.05+si*(W*0.9/srvN);
          ctx.fillStyle="#0a0300"; ctx.strokeStyle="rgba(175,65,8,0.38)"; ctx.lineWidth=0.7;
          ctx.fillRect(sx,srvY+3,W*0.068,srvH-6); ctx.strokeRect(sx,srvY+3,W*0.068,srvH-6);
          const lC=["#FF4400","#FFAA00","#FF6600","#FFCC00","#FF3300","#FF8800","#44FF88","#FF4400","#FFCC44","#FF6622","#FFAA44","#FF5500"][si];
          const lA=0.5+0.5*Math.sin(t2*(1.2+si*0.25)+si);
          ctx.fillStyle=lC; ctx.shadowColor=lC; ctx.shadowBlur=4*lA;
          ctx.fillRect(sx+2,srvY+4,W*0.05,3); ctx.shadowBlur=0;
          const da=Math.sin(t2*(3+si*0.7)+si)>0.4;
          ctx.fillStyle=da?"#FF8800":"#2a1100";
          ctx.beginPath(); ctx.arc(sx+W*0.057,srvY+srvH-6,2.5,0,Math.PI*2); ctx.fill();
        }

        // ── Main workstation desk ─────────────────────────────────
        const dY=topY+H*0.10, dH2=H*0.055, dW2=W*0.82, dX2=cx-dW2/2;
        const dBg=ctx.createLinearGradient(dX2,dY,dX2+dW2,dY+dH2);
        dBg.addColorStop(0,"#0d0500"); dBg.addColorStop(0.5,"#1c0b02"); dBg.addColorStop(1,"#0d0500");
        ctx.fillStyle=dBg; rr(dX2,dY,dW2,dH2,6); ctx.fill();
        ctx.strokeStyle="rgba(198,85,8,0.82)"; ctx.lineWidth=2; ctx.stroke();
        ctx.strokeStyle=`rgba(218,118,28,${0.42+0.25*Math.sin(t2*1.5)})`; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(dX2+10,dY+dH2-2); ctx.lineTo(dX2+dW2-10,dY+dH2-2); ctx.stroke();

        // Holographic display above desk
        const hW=W*0.26, hH=H*0.13, hX=cx-hW/2, hY=dY-hH-H*0.006;
        const glitch=(Math.sin(t2*8.1)>0.87)?Math.sin(t2*28)*3.5:0;
        ctx.fillStyle="rgba(8,4,0,0.93)"; rr(hX+glitch,hY,hW,hH,5); ctx.fill();
        ctx.strokeStyle=`rgba(255,138,20,${0.6+0.3*Math.sin(t2*2.1)})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#FF8800"; ctx.font=`bold ${Math.round(hH*0.13)}px monospace`; ctx.textAlign="center";
        ctx.shadowColor="#FF6600"; ctx.shadowBlur=8;
        ctx.fillText("⚙ SYSTEM ONLINE ⚙",cx+glitch*0.5,hY+hH*0.22); ctx.shadowBlur=0;
        const dLines=["POWER: 84%","SCRAP: 1,247kg","TEMP: 312°C","RADS: HIGH","UPLINK: LOST"];
        for (let dl=0;dl<5;dl++) {
          ctx.fillStyle=dl===3?`rgba(255,70,0,0.88)`:`rgba(255,158,38,${dl%2===0?0.88:0.55})`;
          ctx.font=`${Math.round(hH*0.1)}px monospace`; ctx.textAlign="left";
          ctx.fillText(dLines[dl],hX+hW*0.06+glitch,hY+hH*0.35+dl*hH*0.13);
        }
        ctx.strokeStyle=`rgba(255,178,38,0.7)`; ctx.lineWidth=1.2;
        ctx.beginPath();
        for (let wx=0;wx<hW-10;wx+=2) { const wy=hY+hH*0.82+hH*0.1*Math.sin(t2*6.2+wx*0.22); wx===0?ctx.moveTo(hX+5+wx,wy):ctx.lineTo(hX+5+wx,wy); }
        ctx.stroke();
        // Keyboard on desk
        ctx.fillStyle="#090300"; rr(dX2+dW2*0.04,dY+4,dW2*0.2,dH2-8,3); ctx.fill();
        ctx.strokeStyle="rgba(175,75,8,0.38)"; ctx.lineWidth=0.8; ctx.stroke();
        for (let ki=0;ki<10;ki++) { const kr=Math.floor(ki/5),kc=ki%5; ctx.fillStyle=`rgba(198,95,18,${0.24+0.14*Math.sin(t2+ki)})`; ctx.fillRect(dX2+dW2*0.05+kc*dW2*0.036,dY+6+kr*7,dW2*0.028,5); }

        // ── LEFT: Tesla coil ──────────────────────────────────────
        const tcX=W*0.06, tcY=H*0.28, tcW=W*0.11, tcH=H*0.52;
        ctx.fillStyle="#0d0500"; ctx.strokeStyle="rgba(198,85,8,0.7)"; ctx.lineWidth=2;
        rr(tcX,tcY+tcH-tcH*0.11,tcW,tcH*0.11,5); ctx.fill(); ctx.stroke();
        const cCol=ctx.createLinearGradient(tcX+tcW*0.3,tcY,tcX+tcW*0.7,tcY);
        cCol.addColorStop(0,"#180a03"); cCol.addColorStop(0.5,"#2c1406"); cCol.addColorStop(1,"#180a03");
        ctx.fillStyle=cCol; ctx.strokeStyle="rgba(175,65,8,0.48)"; ctx.lineWidth=1.5;
        ctx.fillRect(tcX+tcW*0.3,tcY+tcH*0.14,tcW*0.4,tcH*0.73); ctx.strokeRect(tcX+tcW*0.3,tcY+tcH*0.14,tcW*0.4,tcH*0.73);
        for (let ci=0;ci<8;ci++) {
          const cy=tcY+tcH*0.17+ci*(tcH*0.64/8);
          ctx.strokeStyle=`rgba(255,${138+ci*8},18,0.52)`; ctx.lineWidth=2;
          ctx.beginPath(); ctx.ellipse(tcX+tcW/2,cy,tcW*0.43,tcH*0.024,0,0,Math.PI*2); ctx.stroke();
        }
        const tsR=tcW*0.4;
        const tsG=ctx.createRadialGradient(tcX+tcW/2,tcY+tsR*0.45,tsR*0.08,tcX+tcW/2,tcY+tsR*0.45,tsR);
        tsG.addColorStop(0,"#381500"); tsG.addColorStop(0.5,"#1e0c00"); tsG.addColorStop(1,"#0d0500");
        ctx.fillStyle=tsG; ctx.strokeStyle=`rgba(255,158,28,${0.6+0.3*Math.sin(t2*2)})`; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(tcX+tcW/2,tcY+tsR*0.52,tsR,0,Math.PI*2); ctx.fill(); ctx.stroke();
        for (let ai=0;ai<6;ai++) {
          const aS=Math.floor(t2*4+ai*3.1)%7;
          const aX2=tcX+tcW/2, aY2=tcY+tsR*0.52;
          const aX3=aX2+Math.sin(ai*1.3+t2*2+aS)*tcW*0.9, aY3=aY2+Math.cos(ai*1.1+t2*1.7+aS)*tcW*0.7;
          const aA=0.4+0.5*Math.abs(Math.sin(t2*7+ai));
          ctx.strokeStyle=`rgba(255,218,58,${aA})`; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(aX2,aY2); ctx.quadraticCurveTo(aX2+(aX3-aX2)*0.5+Math.sin(t2*11+ai)*8,aY2+(aY3-aY2)*0.5+Math.cos(t2*9+ai)*7,aX3,aY3); ctx.stroke();
          ctx.fillStyle=`rgba(255,200,40,${aA*0.7})`; ctx.shadowColor="#FFCC00"; ctx.shadowBlur=6*aA;
          ctx.beginPath(); ctx.arc(aX3,aY3,2,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        }
        const tsGl=ctx.createRadialGradient(tcX+tcW/2,tcY+tsR*0.52,0,tcX+tcW/2,tcY+tsR*0.52,tsR*1.5);
        tsGl.addColorStop(0,`rgba(255,175,28,${0.18+0.14*Math.sin(t2*3)})`); tsGl.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=tsGl; ctx.beginPath(); ctx.arc(tcX+tcW/2,tcY+tsR*0.52,tsR*1.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="rgba(255,158,28,0.62)"; ctx.font=`bold ${Math.round(tcW*0.16)}px monospace`; ctx.textAlign="center";
        ctx.fillText("TESLA",tcX+tcW/2,tcY+tcH-3);

        // ── CENTER: Tactical holo-map table ──────────────────────
        const mTX=cx-W*0.11, mTY=H*0.5, mTW=W*0.22, mTH=H*0.13;
        ctx.fillStyle="#090300"; ctx.strokeStyle="rgba(255,138,18,0.62)"; ctx.lineWidth=2;
        rr(mTX,mTY,mTW,mTH,6); ctx.fill(); ctx.stroke();
        const mSf=ctx.createLinearGradient(mTX,mTY,mTX+mTW,mTY+mTH*0.5);
        mSf.addColorStop(0,"rgba(175,65,8,0.16)"); mSf.addColorStop(1,"rgba(255,138,18,0.05)");
        ctx.fillStyle=mSf; ctx.fillRect(mTX+3,mTY+3,mTW-6,mTH*0.65);
        ctx.strokeStyle="rgba(255,158,38,0.28)"; ctx.lineWidth=0.7;
        for (let mg=0;mg<6;mg++) { ctx.beginPath(); ctx.moveTo(mTX+4+mg*(mTW-8)/5,mTY+3); ctx.lineTo(mTX+4+mg*(mTW-8)/5,mTY+mTH*0.65); ctx.stroke(); }
        for (let mg=0;mg<4;mg++) { ctx.beginPath(); ctx.moveTo(mTX+3,mTY+3+mg*mTH*0.2); ctx.lineTo(mTX+mTW-3,mTY+3+mg*mTH*0.2); ctx.stroke(); }
        const lA2=0.6+0.4*Math.sin(t2*2.5);
        ctx.fillStyle=`rgba(255,55,0,${lA2})`; ctx.shadowColor="#FF4400"; ctx.shadowBlur=8*lA2;
        ctx.beginPath(); ctx.arc(mTX+mTW*0.55,mTY+mTH*0.26,4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        // Location label
        ctx.fillStyle="rgba(255,158,38,0.72)"; ctx.font=`bold ${Math.round(mTH*0.14)}px monospace`; ctx.textAlign="center";
        ctx.fillText("TACTICAL MAP",cx,mTY+mTH*0.82);

        // ── CENTER-LEFT: Circuit board panel ─────────────────────
        const cbX=W*0.14, cbY=H*0.32, cbW=W*0.13, cbH=H*0.28;
        ctx.fillStyle="#080300"; ctx.strokeStyle="rgba(175,85,8,0.52)"; ctx.lineWidth=1.5;
        rr(cbX,cbY,cbW,cbH,5); ctx.fill(); ctx.stroke();
        const traceC=["rgba(255,138,18,0.48)","rgba(198,75,8,0.38)","rgba(255,198,38,0.32)"];
        const traces2=[[0.05,0.08,0.6,0.08],[0.05,0.08,0.05,0.36],[0.05,0.36,0.42,0.36],[0.42,0.08,0.42,0.62],[0.7,0.2,0.95,0.2],[0.95,0.2,0.95,0.72],[0.2,0.62,0.7,0.62],[0.7,0.62,0.7,0.88],[0.15,0.88,0.7,0.88],[0.15,0.42,0.15,0.88],[0.55,0.08,0.55,0.36],[0.55,0.36,0.85,0.36]];
        for (let ti2=0;ti2<traces2.length;ti2++) {
          const [x1,y1,x2,y2]=traces2[ti2];
          ctx.strokeStyle=traceC[ti2%3]; ctx.lineWidth=1.2;
          ctx.beginPath(); ctx.moveTo(cbX+cbW*x1,cbY+cbH*y1); ctx.lineTo(cbX+cbW*x2,cbY+cbH*y2); ctx.stroke();
        }
        const icPos=[[0.12,0.1],[0.48,0.1],[0.12,0.48],[0.48,0.48],[0.18,0.76],[0.58,0.28]];
        for (let ic=0;ic<6;ic++) {
          const ix=cbX+cbW*icPos[ic][0], iy=cbY+cbH*icPos[ic][1];
          ctx.fillStyle="#0d0500"; ctx.strokeStyle="rgba(198,95,18,0.58)"; ctx.lineWidth=0.8;
          rr(ix,iy,cbW*0.24,cbH*0.1,2); ctx.fill(); ctx.stroke();
          const lA3=0.5+0.5*Math.sin(t2*(1+ic*0.3)+ic*1.2);
          ctx.fillStyle=ic%2===0?"#FF8800":"#FFCC00"; ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=3*lA3;
          ctx.beginPath(); ctx.arc(ix+cbW*0.22,iy+cbH*0.05,1.5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        }
        ctx.fillStyle="rgba(255,148,38,0.62)"; ctx.font=`bold ${Math.round(cbH*0.08)}px monospace`; ctx.textAlign="center";
        ctx.fillText("CIRCUIT BOARD",cbX+cbW/2,cbY+cbH-4);

        // ── CENTER-RIGHT: Geiger counter / Rad scanner ───────────
        const gcX=W*0.52, gcY=H*0.5, gcW=W*0.13, gcH=H*0.22;
        ctx.fillStyle="#0d0500"; ctx.strokeStyle="rgba(198,85,8,0.55)"; ctx.lineWidth=1.5;
        rr(gcX,gcY,gcW,gcH,6); ctx.fill(); ctx.stroke();
        ctx.fillStyle="#080200"; rr(gcX+4,gcY+4,gcW-8,gcH*0.52,4); ctx.fill();
        const rLvl=0.52+0.32*Math.sin(t2*0.72);
        ctx.strokeStyle="rgba(75,28,4,0.82)"; ctx.lineWidth=gcH*0.07;
        ctx.beginPath(); ctx.arc(gcX+gcW/2,gcY+gcH*0.35,gcH*0.24,Math.PI,0); ctx.stroke();
        const gAng2=Math.PI+(rLvl*Math.PI), gC2=rLvl>0.8?"#FF2200":rLvl>0.5?"#FF8800":"#FFCC00";
        ctx.strokeStyle=gC2; ctx.lineWidth=gcH*0.07; ctx.shadowColor=gC2; ctx.shadowBlur=8;
        ctx.beginPath(); ctx.arc(gcX+gcW/2,gcY+gcH*0.35,gcH*0.24,Math.PI,gAng2); ctx.stroke(); ctx.shadowBlur=0;
        ctx.strokeStyle="#FF4400"; ctx.lineWidth=1.5; ctx.lineCap="round";
        ctx.beginPath(); ctx.moveTo(gcX+gcW/2,gcY+gcH*0.35); ctx.lineTo(gcX+gcW/2+Math.cos(gAng2)*gcH*0.22,gcY+gcH*0.35+Math.sin(gAng2)*gcH*0.22); ctx.stroke(); ctx.lineCap="butt";
        const cpm2=Math.floor(340+180*Math.sin(t2*0.88));
        ctx.fillStyle="#FF8800"; ctx.font=`bold ${Math.round(gcH*0.11)}px monospace`; ctx.textAlign="center";
        ctx.fillText(`${cpm2} CPM`,gcX+gcW/2,gcY+gcH*0.66);
        ctx.fillStyle="rgba(255,138,28,0.72)"; ctx.font=`${Math.round(gcH*0.09)}px monospace`;
        ctx.fillText("GEIGER COUNTER",gcX+gcW/2,gcY+gcH*0.8);
        // Clicker animation dots
        const clkBeat=Math.sin(t2*6*rLvl+0.5)>0.7;
        if (clkBeat) { ctx.fillStyle=`rgba(255,60,0,0.85)`; ctx.shadowColor="#FF4400"; ctx.shadowBlur=8; ctx.beginPath(); ctx.arc(gcX+gcW*0.82,gcY+gcH*0.66,4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; }

        // ── RIGHT: Chemical analysis racks ────────────────────────
        const rkX2=W*0.73, rkY2=H*0.28, rkW2=W*0.2, rkH2=H*0.52;
        ctx.fillStyle="#0d0500"; ctx.strokeStyle="rgba(175,65,8,0.55)"; ctx.lineWidth=2;
        rr(rkX2,rkY2,rkW2,rkH2,6); ctx.fill(); ctx.stroke();
        for (let sh=0;sh<3;sh++) { ctx.fillStyle="rgba(138,52,7,0.55)"; ctx.fillRect(rkX2+4,rkY2+rkH2*(0.22+sh*0.26),rkW2-8,4); }
        const chem=[{col:"#FF4400",lbl:"ACID"},{col:"#FF8800",lbl:"RUST AGENT"},{col:"#FFCC00",lbl:"FUEL"},{col:"#44FF88",lbl:"STIM"},{col:"#FF2200",lbl:"TOXIC"},{col:"#FFAA44",lbl:"PLASMA"}];
        for (let ci2=0;ci2<6;ci2++) {
          const row2=Math.floor(ci2/3),col3=ci2%3;
          const vx=rkX2+rkW2*0.08+col3*(rkW2*0.3), vy=rkY2+rkH2*0.04+row2*(rkH2*0.48);
          const vH2=rkH2*0.22, vW2=rkW2*0.24;
          ctx.fillStyle="#0f0400"; ctx.strokeStyle=chem[ci2].col+"85"; ctx.lineWidth=1.2;
          rr(vx,vy,vW2,vH2,4); ctx.fill(); ctx.stroke();
          const lv2=0.3+0.28*Math.abs(Math.sin(t2*0.82+ci2*0.9));
          const lG2=ctx.createLinearGradient(vx,vy+vH2*(1-lv2),vx+vW2,vy+vH2);
          lG2.addColorStop(0,chem[ci2].col+"AA"); lG2.addColorStop(1,chem[ci2].col+"44");
          ctx.fillStyle=lG2; ctx.fillRect(vx+2,vy+vH2*(1-lv2),vW2-4,vH2*lv2-2);
          for (let bi2=0;bi2<2;bi2++) {
            const bx2=vx+vW2*0.25+bi2*vW2*0.42, by2=vy+vH2*0.84-bi2*5+Math.sin(t2*2+ci2+bi2)*3.5;
            ctx.fillStyle=chem[ci2].col+"66"; ctx.beginPath(); ctx.arc(bx2,by2,2,0,Math.PI*2); ctx.fill();
          }
          ctx.fillStyle=chem[ci2].col; ctx.shadowColor=chem[ci2].col; ctx.shadowBlur=5+3*Math.sin(t2*1.5+ci2);
          ctx.font=`${Math.round(vH2*0.15)}px monospace`; ctx.textAlign="center";
          ctx.fillText(chem[ci2].lbl,vx+vW2/2,vy+vH2+vH2*0.18); ctx.shadowBlur=0;
        }

        // ── BOTTOM: Scrap bin row ─────────────────────────────────
        const binY2=H-H*0.15, binH2=H*0.11;
        const bins2=[{lbl:"IRON SCRAP",col:"rgba(155,65,8,0.85)"},{lbl:"COPPER",col:"rgba(198,118,28,0.85)"},{lbl:"CIRCUITS",col:"rgba(218,178,18,0.85)"},{lbl:"FUEL CELLS",col:"rgba(255,75,18,0.85)"}];
        for (let bi=0;bi<4;bi++) {
          const bx3=W*0.1+bi*(W*0.2);
          ctx.fillStyle="#0d0500"; ctx.strokeStyle=bins2[bi].col; ctx.lineWidth=1.5;
          rr(bx3,binY2,W*0.17,binH2,5); ctx.fill(); ctx.stroke();
          const fH2=binH2*(0.3+0.38*Math.abs(Math.sin(t2*0.42+bi*1.1)));
          ctx.fillStyle=bins2[bi].col; ctx.fillRect(bx3+4,binY2+binH2-fH2-2,W*0.15-4,fH2);
          ctx.fillStyle="#FFE0A0"; ctx.font=`bold ${Math.round(binH2*0.16)}px monospace`; ctx.textAlign="center";
          ctx.fillText(bins2[bi].lbl,bx3+W*0.085,binY2+binH2*0.2);
        }

        // ── Far-right: trophy/award shelf ────────────────────────
        const tpX=W-W*0.09, tpY=H*0.32, tpW=W*0.078, tpH=H*0.38;
        ctx.fillStyle="#090300"; ctx.strokeStyle="rgba(175,75,8,0.48)"; ctx.lineWidth=1.5;
        rr(tpX,tpY,tpW,tpH,5); ctx.fill(); ctx.stroke();
        for (let sh2=0;sh2<3;sh2++) { ctx.fillStyle="rgba(135,50,7,0.52)"; ctx.fillRect(tpX+2,tpY+tpH*(0.2+sh2*0.27),tpW-4,3); }
        const trI=[{lbl:"SCRAP #1",col:"#FF8800"},{lbl:"PROTOTYPE",col:"#FFCC00"},{lbl:"CORE RIG",col:"#FF4422"}];
        for (let ti3=0;ti3<3;ti3++) {
          const ty3=tpY+tpH*(0.05+ti3*0.27);
          ctx.fillStyle="#110500"; ctx.strokeStyle=trI[ti3].col+"85"; ctx.lineWidth=1;
          rr(tpX+tpW*0.1,ty3,tpW*0.8,tpH*0.19,3); ctx.fill(); ctx.stroke();
          ctx.fillStyle=trI[ti3].col; ctx.shadowColor=trI[ti3].col; ctx.shadowBlur=4+2*Math.sin(t2+ti3);
          ctx.font=`bold ${Math.round(tpH*0.06)}px monospace`; ctx.textAlign="center";
          ctx.fillText(trI[ti3].lbl,tpX+tpW/2,ty3+tpH*0.12); ctx.shadowBlur=0;
        }

        // ── Floor cable runs ──────────────────────────────────────
        ctx.strokeStyle="rgba(155,55,8,0.32)"; ctx.lineWidth=2; ctx.setLineDash([5,5]);
        ctx.beginPath(); ctx.moveTo(tcX+tcW,tcY+tcH*0.5); ctx.lineTo(dX2,dY+dH2*0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rkX2,rkY2+rkH2*0.5); ctx.lineTo(dX2+dW2,dY+dH2*0.5); ctx.stroke();
        ctx.setLineDash([]);

        // ── News ticker (bottom) ──────────────────────────────────
        const tkY2=H-H*0.032;
        ctx.fillStyle="rgba(50,16,2,0.92)"; ctx.fillRect(0,tkY2,W,H*0.03);
        ctx.strokeStyle=`rgba(255,138,18,${0.52+0.2*Math.sin(t2*2)})`; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(0,tkY2); ctx.lineTo(W,tkY2); ctx.stroke();
        const wL2=W*0.05, wH2=H*0.027;
        ctx.fillStyle=`rgba(255,195,0,${0.75+0.25*Math.sin(t2*4)})`; rr(W*0.005,tkY2+H*0.001,wL2,wH2,3); ctx.fill();
        ctx.fillStyle="#1a0800"; ctx.font=`bold ${Math.round(wH2*0.55)}px monospace`; ctx.textAlign="left";
        ctx.fillText("LIVE",W*0.005+wL2*0.14,tkY2+H*0.001+wH2*0.75);
        const tkTxt2="⚙ SCRAP TECH LAB  ✦  WASTELAND RESEARCH  ✦  POWER: 84%  ✦  RADS: HIGH  ✦  UPLINK LOST  ✦  TESLA ONLINE  ✦  SCRAP 1,247 KG  ✦  ";
        const tkX2=W*0.06+W-(t2*52)%(W+1500);
        ctx.save(); ctx.beginPath(); ctx.rect(W*0.06,tkY2,W-W*0.06,H*0.032); ctx.clip();
        ctx.fillStyle="#FFE0A0"; ctx.font=`bold ${Math.round(H*0.017)}px monospace`; ctx.textAlign="left";
        ctx.fillText(tkTxt2,tkX2,tkY2+H*0.021); ctx.restore();

        // ── Ambient rust dust ─────────────────────────────────────
        for (let pi=0;pi<16;pi++) {
          const px=(Math.sin(pi*2.1+t2*0.34)*0.42+0.5)*W, py=(Math.cos(pi*1.6+t2*0.23)*0.38+0.5)*(H*0.88);
          const pA=0.09+0.06*Math.sin(t2*1.3+pi);
          ctx.fillStyle=pi%3===0?`rgba(255,138,28,${pA})`:pi%3===1?`rgba(198,75,8,${pA})`:`rgba(255,198,58,${pA})`;
          ctx.beginPath(); ctx.arc(px,py,1.8,0,Math.PI*2); ctx.fill();
        }

      } else if (isTechShop) {
        // ═══ WASTELAND TECH SHOP (fallback) ═══
        // ── Sales counter (top center) ───────────────────
        ctx.fillStyle = "#3a3530";
        ctx.strokeStyle = "#5a5048";
        ctx.lineWidth = 2;
        rr(cx - 60, topY + 8, 120, 38, 3);
        ctx.fill();
        ctx.stroke();
        // Counter top (worn metal)
        ctx.fillStyle = "#4a4540";
        rr(cx - 58, topY + 10, 116, 8, 2);
        ctx.fill();
        // Cash register
        ctx.fillStyle = "#2a2520";
        rr(cx + 20, topY + 12, 32, 28, 2);
        ctx.fill();
        ctx.fillStyle = "#00FFCC";
        ctx.fillRect(cx + 24, topY + 16, 24, 12);
        ctx.fillStyle = "#00AA88";
        ctx.font = "bold 6px monospace";
        ctx.textAlign = "center";
        ctx.fillText("$$$", cx + 36, topY + 24);
        // Items on counter
        ctx.fillStyle = "#1a1a2a";
        rr(cx - 50, topY + 18, 18, 22, 2);
        ctx.fill();
        ctx.fillStyle = "#00FFCC";
        ctx.fillRect(cx - 48, topY + 20, 14, 16);

        // ── Display shelves (left wall) ───────────────────
        ctx.fillStyle = "#3a3530";
        ctx.strokeStyle = "#5a5048";
        ctx.lineWidth = 1.5;
        rr(W * 0.08, topY + 4, 48, 80, 2);
        ctx.fill();
        ctx.stroke();
        // Shelf dividers
        ctx.fillStyle = "#4a4540";
        ctx.fillRect(W * 0.08, topY + 28, 48, 3);
        ctx.fillRect(W * 0.08, topY + 54, 48, 3);
        // Tech items on shelves
        const shelfItems = [
          { x: W * 0.10, y: topY + 10, w: 14, h: 14, color: "#00FFCC" },
          { x: W * 0.10 + 18, y: topY + 12, w: 18, h: 12, color: "#FF8844" },
          { x: W * 0.10, y: topY + 34, w: 20, h: 16, color: "#4488FF" },
          { x: W * 0.10 + 24, y: topY + 36, w: 12, h: 14, color: "#FFCC00" },
          { x: W * 0.10, y: topY + 60, w: 16, h: 18, color: "#FF44AA" },
          { x: W * 0.10 + 20, y: topY + 62, w: 20, h: 14, color: "#44FF88" },
        ];
        for (const item of shelfItems) {
          ctx.fillStyle = "#1a1a1a";
          rr(item.x, item.y, item.w, item.h, 2);
          ctx.fill();
          ctx.fillStyle = item.color;
          ctx.shadowColor = item.color;
          ctx.shadowBlur = 4;
          ctx.fillRect(item.x + 2, item.y + 2, item.w - 4, item.h - 4);
          ctx.shadowBlur = 0;
        }

        // ── Display table (center) with gadgets ───────────────────
        ctx.fillStyle = "#3a3028";
        ctx.strokeStyle = "#5a4a38";
        ctx.lineWidth = 1.5;
        rr(cx - 45, midY - 8, 90, 40, 3);
        ctx.fill();
        ctx.stroke();
        // Gadgets on table
        const gadgets = [
          { x: cx - 38, y: midY - 2, w: 24, h: 18, color: "#00FFCC", label: "CHIP" },
          { x: cx - 8, y: midY, w: 20, h: 14, color: "#FFAA00", label: "MOD" },
          { x: cx + 18, y: midY - 4, w: 26, h: 22, color: "#4488FF", label: "CORE" },
        ];
        for (const g of gadgets) {
          ctx.fillStyle = "#1a1a2a";
          rr(g.x, g.y, g.w, g.h, 2);
          ctx.fill();
          ctx.fillStyle = g.color;
          ctx.shadowColor = g.color;
          ctx.shadowBlur = 5;
          ctx.fillRect(g.x + 3, g.y + 3, g.w - 6, g.h - 6);
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 5px monospace";
          ctx.textAlign = "center";
          ctx.fillText(g.label, g.x + g.w / 2, g.y + g.h + 8);
        }

        // ── Repair station (right) ───────────────────
        ctx.fillStyle = "#2a2a30";
        ctx.strokeStyle = "#4a4a50";
        ctx.lineWidth = 1.5;
        rr(W * 0.72, topY + 8, 56, 70, 3);
        ctx.fill();
        ctx.stroke();
        // Tools
        ctx.fillStyle = "#6a6a70";
        ctx.fillRect(W * 0.74, topY + 14, 8, 24);
        ctx.fillRect(W * 0.74 + 12, topY + 16, 6, 20);
        ctx.fillRect(W * 0.74 + 22, topY + 12, 10, 26);
        // Soldering station glow
        ctx.fillStyle = "#FF6600";
        ctx.shadowColor = "#FF6600";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(W * 0.74 + 40, topY + 50, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // "REPAIRS" sign
        ctx.fillStyle = "#00FFCC";
        ctx.font = "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.fillText("REPAIRS", W * 0.72 + 28, topY + 82);

        // ── Crate with parts (bottom left) ───────────────────
        ctx.fillStyle = "#4a3a22";
        ctx.strokeStyle = "#6a5a32";
        ctx.lineWidth = 1;
        rr(W * 0.10, midY + 20, 36, 30, 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = "#5a4a28";
        ctx.beginPath();
        ctx.moveTo(W * 0.10 + 4, midY + 24);
        ctx.lineTo(W * 0.10 + 32, midY + 46);
        ctx.moveTo(W * 0.10 + 32, midY + 24);
        ctx.lineTo(W * 0.10 + 4, midY + 46);
        ctx.stroke();
        ctx.fillStyle = "#8a7a68";
        ctx.font = "bold 6px monospace";
        ctx.textAlign = "center";
        ctx.fillText("PARTS", W * 0.10 + 18, midY + 56);

        // ── Shop sign ───────────────────
        ctx.fillStyle = "#00FFCC";
        ctx.shadowColor = "#00FFCC";
        ctx.shadowBlur = 10;
        ctx.font = "bold 10px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("TECH TRADER", cx, topY - 2);
        ctx.shadowBlur = 0;

      } else if (!!this.map?.config?.wasteland) {
        // ═══ WASTELAND: SCRAP TECH LAB — FULL ROOM ═══
        const t = performance.now() / 1000;

        // ── Rust & sand floor ─────────────────────────────────────
        ctx.fillStyle = "#120800";
        ctx.fillRect(0, 0, W, H);
        const tSz = Math.round(W / 16);
        for (let gy = 0; gy <= Math.ceil(H / tSz); gy++) {
          for (let gx = 0; gx <= Math.ceil(W / tSz); gx++) {
            const tx = gx * tSz, ty = gy * tSz;
            const sd = gx * 13 + gy * 7;
            ctx.fillStyle = sd%3===0?"rgba(28,12,2,0.96)":sd%3===1?"rgba(20,8,1,0.96)":"rgba(24,10,2,0.96)";
            ctx.fillRect(tx, ty, tSz, tSz);
            ctx.strokeStyle = `rgba(180,80,10,${0.08+0.04*Math.sin(t*0.7+sd*0.12)})`;
            ctx.lineWidth = 0.7; ctx.strokeRect(tx, ty, tSz, tSz);
            // Sand dust patches
            if (sd % 11 === 0) {
              const dg = ctx.createRadialGradient(tx+tSz/2,ty+tSz/2,0,tx+tSz/2,ty+tSz/2,tSz*0.55);
              dg.addColorStop(0,`rgba(200,100,20,${0.05+0.03*Math.sin(t+sd)})`);
              dg.addColorStop(1,"rgba(0,0,0,0)");
              ctx.fillStyle=dg; ctx.fillRect(tx,ty,tSz,tSz);
            }
          }
        }

        // ── Room border: corroded metal frame ─────────────────────
        ctx.strokeStyle = `rgba(210,100,20,${0.6+0.2*Math.sin(t*1.3)})`; ctx.lineWidth=3;
        ctx.strokeRect(2,2,W-4,H-4);
        ctx.strokeStyle="rgba(160,60,10,0.25)"; ctx.lineWidth=1;
        ctx.strokeRect(7,7,W-14,H-14);

        // ── Hanging industrial lights (flickering) ────────────────
        const hLightXs=[W*0.18,W*0.44,W*0.70,W*0.88];
        for (let li=0;li<4;li++) {
          const lx=hLightXs[li], flicker=li===1?(0.6+0.4*Math.sin(t*13.7)):1;
          const lcone=ctx.createRadialGradient(lx,0,2,lx,H*0.32,W*0.14);
          lcone.addColorStop(0,`rgba(255,180,60,${0.14*flicker})`);
          lcone.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=lcone;
          ctx.beginPath(); ctx.moveTo(lx-5,0); ctx.lineTo(lx-W*0.08,H*0.38); ctx.lineTo(lx+W*0.08,H*0.38); ctx.closePath(); ctx.fill();
          // Bulb
          ctx.fillStyle=`rgba(255,200,80,${0.8*flicker})`; ctx.shadowColor="#FF9922"; ctx.shadowBlur=12*flicker;
          ctx.beginPath(); ctx.arc(lx,5,5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
          // Hanging wire
          ctx.strokeStyle="rgba(100,50,10,0.8)"; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(lx,0); ctx.lineTo(lx,5); ctx.stroke();
        }

        // ── Room border rust strips ───────────────────────────────
        // Horizontal rust streaks on walls
        for (let rs=0;rs<5;rs++) {
          const ry=topY*0.4+rs*(H*0.18);
          ctx.strokeStyle=`rgba(160,50,5,${0.15+0.08*Math.sin(t*0.5+rs)})`; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(0,ry); ctx.lineTo(W*0.03,ry); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(W-W*0.03,ry); ctx.lineTo(W,ry); ctx.stroke();
        }

        // ── WASTELAND TECH LAB banner ─────────────────────────────
        const sigW=W*0.58, sigH=H*0.042, sigX=cx-sigW/2, sigY=room.S-sigH-4;
        const sigGr=ctx.createLinearGradient(sigX,sigY,sigX+sigW,sigY);
        sigGr.addColorStop(0,"rgba(50,20,2,0.97)"); sigGr.addColorStop(0.5,"rgba(160,60,5,0.99)"); sigGr.addColorStop(1,"rgba(50,20,2,0.97)");
        ctx.fillStyle=sigGr; rr(sigX,sigY,sigW,sigH,7); ctx.fill();
        ctx.strokeStyle=`rgba(255,140,30,${0.7+0.3*Math.sin(t*1.8)})`; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle="#FFE0A0"; ctx.font=`bold ${Math.round(sigH*0.55)}px monospace`; ctx.textAlign="center";
        ctx.shadowColor="#FF8800"; ctx.shadowBlur=12;
        ctx.fillText("⚙  SCRAP  TECH  LAB  ⚙", cx, sigY+sigH*0.72); ctx.shadowBlur=0;

        // ── RADIATION WARNING sign ────────────────────────────────
        const radA=0.7+0.3*Math.sin(t*3.5);
        const radW=W*0.12, radH=H*0.038;
        ctx.fillStyle=`rgba(255,200,0,${radA})`; ctx.shadowColor="#FFCC00"; ctx.shadowBlur=15*radA;
        rr(cx-radW/2,topY+H*0.04,radW,radH,5); ctx.fill(); ctx.shadowBlur=0;
        ctx.strokeStyle=`rgba(200,100,0,${radA})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#1a0800"; ctx.font=`bold ${Math.round(radH*0.5)}px monospace`; ctx.textAlign="center";
        ctx.fillText("☢ RADIATION ZONE ☢", cx, topY+H*0.04+radH*0.68);

        // ── Top wall: scavenged server racks ──────────────────────
        const srvH=H*0.065, srvY=topY+H*0.005;
        const srvGr=ctx.createLinearGradient(W*0.04,srvY,W*0.96,srvY+srvH);
        srvGr.addColorStop(0,"#0e0600"); srvGr.addColorStop(0.5,"#1c0c02"); srvGr.addColorStop(1,"#0e0600");
        ctx.fillStyle=srvGr; rr(W*0.04,srvY,W*0.92,srvH,5); ctx.fill();
        ctx.strokeStyle=`rgba(200,90,10,0.6)`; ctx.lineWidth=1.5; ctx.stroke();
        // Server units
        const srvCount=10;
        for (let si=0;si<srvCount;si++) {
          const sx=W*0.05+si*(W*0.9/srvCount);
          ctx.fillStyle="#0a0400"; ctx.strokeStyle="rgba(180,70,10,0.4)"; ctx.lineWidth=0.7;
          ctx.fillRect(sx,srvY+3,W*0.08,srvH-6); ctx.strokeRect(sx,srvY+3,W*0.08,srvH-6);
          // LED strips
          const ledCols=["#FF4400","#FFAA00","#FF6600","#FFCC00","#FF3300","#FF8800","#44FF88","#FF4400","#FFCC44","#FF6622"];
          const ledA=0.5+0.5*Math.sin(t*(1.2+si*0.25)+si);
          ctx.fillStyle=ledCols[si]; ctx.shadowColor=ledCols[si]; ctx.shadowBlur=4*ledA;
          ctx.fillRect(sx+2,srvY+4,W*0.06,3); ctx.shadowBlur=0;
          // Disk activity dot
          const diskA=Math.sin(t*(3+si*0.7)+si)>0.4;
          ctx.fillStyle=diskA?"#FF8800":"#2a1200";
          ctx.beginPath(); ctx.arc(sx+W*0.068,srvY+srvH-6,2.5,0,Math.PI*2); ctx.fill();
        }

        // ── Main workstation desk (full width) ────────────────────
        const dskH=H*0.055, dskY=topY+H*0.10, dskW=W*0.82, dskX=cx-dskW/2;
        const dskBg=ctx.createLinearGradient(dskX,dskY,dskX+dskW,dskY+dskH);
        dskBg.addColorStop(0,"#0e0600"); dskBg.addColorStop(0.5,"#1e0c02"); dskBg.addColorStop(1,"#0e0600");
        ctx.fillStyle=dskBg; rr(dskX,dskY,dskW,dskH,6); ctx.fill();
        ctx.strokeStyle="rgba(200,90,10,0.8)"; ctx.lineWidth=2; ctx.stroke();
        // Desk edge strip (corroded copper)
        ctx.strokeStyle=`rgba(220,120,30,${0.45+0.25*Math.sin(t*1.5)})`; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(dskX+8,dskY+dskH-2); ctx.lineTo(dskX+dskW-8,dskY+dskH-2); ctx.stroke();

        // Holographic display on desk (center, glitchy)
        const holW=W*0.28, holH=H*0.12, holX=cx-holW/2, holY=dskY-holH-H*0.005;
        const glitch=(Math.sin(t*8.3)>0.88)?Math.sin(t*30)*4:0;
        ctx.fillStyle="rgba(10,5,0,0.92)"; rr(holX+glitch,holY,holW,holH,5); ctx.fill();
        ctx.strokeStyle=`rgba(255,140,20,${0.6+0.3*Math.sin(t*2.2)})`; ctx.lineWidth=1.5; ctx.stroke();
        // Hologram content
        ctx.fillStyle="#FF8800"; ctx.font=`bold ${Math.round(holH*0.13)}px monospace`; ctx.textAlign="center";
        ctx.shadowColor="#FF6600"; ctx.shadowBlur=8;
        ctx.fillText("⚙ SYSTEM ONLINE ⚙", cx+glitch*0.5, holY+holH*0.22); ctx.shadowBlur=0;
        // Data readout lines
        const dataLines=["POWER: 84%","SCRAP: 1,247 KG","TEMP: 312°C","RADS: HIGH","UPLINK: LOST"];
        for (let dl=0;dl<5;dl++) {
          const glA=dl%2===0?0.85:0.55;
          ctx.fillStyle=dl===3?`rgba(255,80,0,${glA})`:`rgba(255,160,40,${glA})`;
          ctx.font=`${Math.round(holH*0.1)}px monospace`; ctx.textAlign="left";
          ctx.fillText(dataLines[dl],holX+holW*0.06+glitch,holY+holH*0.35+dl*holH*0.13);
        }
        // Waveform at bottom of hologram
        ctx.strokeStyle=`rgba(255,180,40,0.7)`; ctx.lineWidth=1.2;
        ctx.beginPath();
        for (let wx=0;wx<holW-10;wx+=2) {
          const wy=holY+holH*0.82+holH*0.1*Math.sin(t*6+wx*0.22);
          wx===0?ctx.moveTo(holX+5+wx,wy):ctx.lineTo(holX+5+wx,wy);
        }
        ctx.stroke();

        // Keyboard & tablet on desk
        ctx.fillStyle="#0a0400"; rr(dskX+dskW*0.04,dskY+4,dskW*0.22,dskH-8,3); ctx.fill();
        ctx.strokeStyle="rgba(180,80,10,0.4)"; ctx.lineWidth=0.8; ctx.stroke();
        for (let ki=0;ki<10;ki++) {
          const krow=Math.floor(ki/5), kcol=ki%5;
          ctx.fillStyle=`rgba(200,100,20,${0.25+0.15*Math.sin(t+ki)})`;
          ctx.fillRect(dskX+dskW*0.05+kcol*dskW*0.038,dskY+6+krow*7,dskW*0.03,5);
        }

        // ── LEFT: GIANT TESLA COIL ────────────────────────────────
        const tcX=W*0.075, tcY=H*0.3, tcW=W*0.1, tcH=H*0.5;
        // Base platform
        ctx.fillStyle="#0e0600"; ctx.strokeStyle="rgba(200,90,10,0.7)"; ctx.lineWidth=2;
        rr(tcX,tcY+tcH-tcH*0.12,tcW,tcH*0.12,5); ctx.fill(); ctx.stroke();
        // Column
        const colGr=ctx.createLinearGradient(tcX+tcW*0.3,tcY,tcX+tcW*0.7,tcY);
        colGr.addColorStop(0,"#1a0c04"); colGr.addColorStop(0.5,"#2e1608"); colGr.addColorStop(1,"#1a0c04");
        ctx.fillStyle=colGr; ctx.strokeStyle="rgba(180,70,10,0.5)"; ctx.lineWidth=1.5;
        ctx.fillRect(tcX+tcW*0.3,tcY+tcH*0.15,tcW*0.4,tcH*0.72); ctx.strokeRect(tcX+tcW*0.3,tcY+tcH*0.15,tcW*0.4,tcH*0.72);
        // Coil rings along column
        for (let ci=0;ci<7;ci++) {
          const cy=tcY+tcH*0.18+ci*(tcH*0.65/7);
          ctx.strokeStyle=`rgba(255,${140+ci*8},20,0.55)`; ctx.lineWidth=2;
          ctx.beginPath(); ctx.ellipse(tcX+tcW/2,cy,tcW*0.42,tcH*0.025,0,0,Math.PI*2); ctx.stroke();
        }
        // Tesla sphere top
        const tsR=tcW*0.38;
        const tsG=ctx.createRadialGradient(tcX+tcW/2,tcY+tsR*0.4,tsR*0.1,tcX+tcW/2,tcY+tsR*0.4,tsR);
        tsG.addColorStop(0,"#3a1800"); tsG.addColorStop(0.5,"#200e00"); tsG.addColorStop(1,"#0e0600");
        ctx.fillStyle=tsG; ctx.strokeStyle=`rgba(255,160,30,${0.6+0.3*Math.sin(t*2)})`; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(tcX+tcW/2,tcY+tsR*0.55,tsR,0,Math.PI*2); ctx.fill(); ctx.stroke();
        // Electric arcs from sphere
        const arcCount=5;
        for (let ai=0;ai<arcCount;ai++) {
          const arcSeed=Math.floor(t*4+ai*3.7)%7;
          const aX1=tcX+tcW/2, aY1=tcY+tsR*0.55;
          const aX2=aX1+(Math.sin(ai*1.3+t*2+arcSeed)*tcW*0.8);
          const aY2=aY1+(Math.cos(ai*1.1+t*1.7+arcSeed)*tcW*0.6);
          const aAlpha=0.4+0.5*Math.abs(Math.sin(t*7+ai));
          ctx.strokeStyle=`rgba(255,220,60,${aAlpha})`; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(aX1,aY1);
          const mx=aX1+(aX2-aX1)*0.5+Math.sin(t*11+ai)*10;
          const my=aY1+(aY2-aY1)*0.5+Math.cos(t*9+ai)*8;
          ctx.quadraticCurveTo(mx,my,aX2,aY2); ctx.stroke();
          ctx.fillStyle=`rgba(255,200,40,${aAlpha*0.7})`; ctx.shadowColor="#FFCC00"; ctx.shadowBlur=6*aAlpha;
          ctx.beginPath(); ctx.arc(aX2,aY2,2,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        }
        // Sphere glow
        const tsGl=ctx.createRadialGradient(tcX+tcW/2,tcY+tsR*0.55,0,tcX+tcW/2,tcY+tsR*0.55,tsR*1.5);
        tsGl.addColorStop(0,`rgba(255,180,30,${0.2+0.15*Math.sin(t*3)})`); tsGl.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=tsGl; ctx.beginPath(); ctx.arc(tcX+tcW/2,tcY+tsR*0.55,tsR*1.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="rgba(255,160,30,0.6)"; ctx.font=`bold ${Math.round(tcW*0.16)}px monospace`; ctx.textAlign="center";
        ctx.fillText("TESLA",tcX+tcW/2,tcY+tcH-2);

        // ── CENTER: Holographic map table ─────────────────────────
        const mapTX=cx-W*0.1, mapTY=H*0.5, mapTW=W*0.2, mapTH=H*0.12;
        ctx.fillStyle="#0a0400"; ctx.strokeStyle="rgba(255,140,20,0.6)"; ctx.lineWidth=2;
        rr(mapTX,mapTY,mapTW,mapTH,6); ctx.fill(); ctx.stroke();
        // Map display (top surface)
        const mSurf=ctx.createLinearGradient(mapTX,mapTY,mapTX+mapTW,mapTY+mapTH*0.5);
        mSurf.addColorStop(0,"rgba(180,70,10,0.18)"); mSurf.addColorStop(1,"rgba(255,140,20,0.06)");
        ctx.fillStyle=mSurf; ctx.fillRect(mapTX+3,mapTY+3,mapTW-6,mapTH*0.6);
        // Map grid lines
        ctx.strokeStyle="rgba(255,160,40,0.3)"; ctx.lineWidth=0.7;
        for (let mg=0;mg<6;mg++) { ctx.beginPath(); ctx.moveTo(mapTX+4+mg*(mapTW-8)/5,mapTY+3); ctx.lineTo(mapTX+4+mg*(mapTW-8)/5,mapTY+mapTH*0.6); ctx.stroke(); }
        for (let mg=0;mg<4;mg++) { ctx.beginPath(); ctx.moveTo(mapTX+3,mapTY+3+mg*mapTH*0.18); ctx.lineTo(mapTX+mapTW-3,mapTY+3+mg*mapTH*0.18); ctx.stroke(); }
        // Pulsing location marker
        const locA=0.6+0.4*Math.sin(t*2.5);
        ctx.fillStyle=`rgba(255,60,0,${locA})`; ctx.shadowColor="#FF4400"; ctx.shadowBlur=8*locA;
        ctx.beginPath(); ctx.arc(mapTX+mapTW*0.55,mapTY+mapTH*0.22,4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        ctx.fillStyle="rgba(255,160,40,0.7)"; ctx.font=`bold ${Math.round(mapTH*0.14)}px monospace`; ctx.textAlign="center";
        ctx.fillText("TACTICAL MAP",cx,mapTY+mapTH*0.8);

        // ── RIGHT: Chemical analysis tanks ───────────────────────
        const tankZoneX=W*0.72, tankZoneY=H*0.3, tankZW=W*0.2, tankZH=H*0.5;
        // Rack frame
        ctx.fillStyle="#0e0600"; ctx.strokeStyle="rgba(180,70,10,0.55)"; ctx.lineWidth=2;
        rr(tankZoneX,tankZoneY,tankZW,tankZH,6); ctx.fill(); ctx.stroke();
        // Shelf bars
        ctx.fillStyle="rgba(140,55,8,0.6)";
        for (let sh=0;sh<3;sh++) {
          ctx.fillRect(tankZoneX+4,tankZoneY+tankZH*(0.22+sh*0.26),tankZW-8,4);
        }
        // Chemical vials/beakers
        const chemData=[
          {col:"#FF4400",lbl:"ACID"},{col:"#FF8800",lbl:"RUST AGENT"},{col:"#FFCC00",lbl:"FUEL"},
          {col:"#44FF88",lbl:"STIM"},{col:"#FF2200",lbl:"TOXIC"},{col:"#FFAA44",lbl:"PLASMA"},
        ];
        for (let ci2=0;ci2<6;ci2++) {
          const row=Math.floor(ci2/3), col2=ci2%3;
          const vx=tankZoneX+tankZW*0.1+col2*(tankZW*0.3);
          const vy=tankZoneY+tankZH*0.05+row*(tankZH*0.46);
          const vH=tankZH*0.2, vW=tankZW*0.22;
          // Vial body
          ctx.fillStyle="#100600"; ctx.strokeStyle=chemData[ci2].col+"88"; ctx.lineWidth=1.2;
          rr(vx,vy,vW,vH,4); ctx.fill(); ctx.stroke();
          // Liquid inside
          const lvl=0.3+0.3*Math.abs(Math.sin(t*0.8+ci2*0.9));
          const liqG=ctx.createLinearGradient(vx,vy+vH*(1-lvl),vx+vW,vy+vH);
          liqG.addColorStop(0,chemData[ci2].col+"AA"); liqG.addColorStop(1,chemData[ci2].col+"44");
          ctx.fillStyle=liqG; ctx.fillRect(vx+2,vy+vH*(1-lvl),vW-4,vH*lvl-2);
          // Bubbles
          for (let bi=0;bi<2;bi++) {
            const bx=vx+vW*0.25+bi*vW*0.4;
            const by=vy+vH*0.85-bi*6+Math.sin(t*2+ci2+bi)*4;
            ctx.fillStyle=chemData[ci2].col+"66"; ctx.beginPath(); ctx.arc(bx,by,2,0,Math.PI*2); ctx.fill();
          }
          // Glow
          ctx.fillStyle=chemData[ci2].col; ctx.shadowColor=chemData[ci2].col; ctx.shadowBlur=6+3*Math.sin(t*1.5+ci2);
          ctx.font=`${Math.round(vH*0.15)}px monospace`; ctx.textAlign="center";
          ctx.fillText(chemData[ci2].lbl,vx+vW/2,vy+vH+vH*0.16); ctx.shadowBlur=0;
        }

        // ── Center-left: Circuit board wall panel ─────────────────
        const cbX=W*0.13, cbY=H*0.32, cbW=W*0.12, cbH=H*0.26;
        ctx.fillStyle="#080400"; ctx.strokeStyle="rgba(180,90,10,0.5)"; ctx.lineWidth=1.5;
        rr(cbX,cbY,cbW,cbH,5); ctx.fill(); ctx.stroke();
        // PCB traces
        const traceColors=["rgba(255,140,20,0.5)","rgba(200,80,10,0.4)","rgba(255,200,40,0.35)"];
        const traces=[
          [0.05,0.08,0.6,0.08],[0.05,0.08,0.05,0.35],[0.05,0.35,0.4,0.35],[0.4,0.08,0.4,0.6],
          [0.7,0.2,0.95,0.2],[0.95,0.2,0.95,0.7],[0.2,0.6,0.7,0.6],[0.7,0.6,0.7,0.85],
          [0.15,0.85,0.7,0.85],[0.15,0.4,0.15,0.85],[0.55,0.08,0.55,0.35],[0.55,0.35,0.85,0.35],
        ];
        for (let ti2=0;ti2<traces.length;ti2++) {
          const [x1,y1,x2,y2]=traces[ti2];
          ctx.strokeStyle=traceColors[ti2%3]; ctx.lineWidth=1.2;
          ctx.beginPath(); ctx.moveTo(cbX+cbW*x1,cbY+cbH*y1); ctx.lineTo(cbX+cbW*x2,cbY+cbH*y2); ctx.stroke();
        }
        // ICs / chips
        const icPos=[[0.15,0.1],[0.5,0.1],[0.15,0.5],[0.5,0.5],[0.2,0.78],[0.6,0.3]];
        for (let ic=0;ic<6;ic++) {
          const ix=cbX+cbW*icPos[ic][0], iy=cbY+cbH*icPos[ic][1];
          ctx.fillStyle="#0e0600"; ctx.strokeStyle="rgba(200,100,20,0.6)"; ctx.lineWidth=0.8;
          rr(ix,iy,cbW*0.22,cbH*0.1,2); ctx.fill(); ctx.stroke();
          const ledA2=0.5+0.5*Math.sin(t*(1+ic*0.3)+ic*1.2);
          ctx.fillStyle=ic%2===0?"#FF8800":"#FFCC00"; ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=3*ledA2;
          ctx.beginPath(); ctx.arc(ix+cbW*0.2,iy+cbH*0.05,1.5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        }
        ctx.fillStyle="rgba(255,150,40,0.6)"; ctx.font=`bold ${Math.round(cbH*0.08)}px monospace`; ctx.textAlign="center";
        ctx.fillText("CIRCUIT", cbX+cbW/2, cbY+cbH-4);

        // ── Center-right: Radiation detector / Geiger counter ─────
        const gcX=W*0.52, gcY=H*0.5, gcW=W*0.12, gcH=H*0.2;
        ctx.fillStyle="#0e0600"; ctx.strokeStyle="rgba(200,90,10,0.55)"; ctx.lineWidth=1.5;
        rr(gcX,gcY,gcW,gcH,6); ctx.fill(); ctx.stroke();
        // Gauge face
        ctx.fillStyle="#080300"; rr(gcX+4,gcY+4,gcW-8,gcH*0.55,4); ctx.fill();
        const radLevel=0.55+0.3*Math.sin(t*0.7);
        // Gauge arc
        ctx.strokeStyle="rgba(80,30,5,0.8)"; ctx.lineWidth=gcH*0.07;
        ctx.beginPath(); ctx.arc(gcX+gcW/2,gcY+gcH*0.36,gcH*0.24,Math.PI,0); ctx.stroke();
        const gaugeAng=Math.PI+(radLevel*Math.PI);
        const gaugCol=radLevel>0.8?"#FF2200":radLevel>0.5?"#FF8800":"#FFCC00";
        ctx.strokeStyle=gaugCol; ctx.lineWidth=gcH*0.07; ctx.shadowColor=gaugCol; ctx.shadowBlur=8;
        ctx.beginPath(); ctx.arc(gcX+gcW/2,gcY+gcH*0.36,gcH*0.24,Math.PI,gaugeAng); ctx.stroke(); ctx.shadowBlur=0;
        // Needle
        const ndA=Math.PI+radLevel*Math.PI;
        ctx.strokeStyle="#FF4400"; ctx.lineWidth=1.5; ctx.lineCap="round";
        ctx.beginPath(); ctx.moveTo(gcX+gcW/2,gcY+gcH*0.36); ctx.lineTo(gcX+gcW/2+Math.cos(ndA)*gcH*0.22,gcY+gcH*0.36+Math.sin(ndA)*gcH*0.22); ctx.stroke(); ctx.lineCap="butt";
        // Geiger click display
        const cpm=Math.floor(340+180*Math.sin(t*0.9));
        ctx.fillStyle="#FF8800"; ctx.font=`bold ${Math.round(gcH*0.11)}px monospace`; ctx.textAlign="center";
        ctx.fillText(`${cpm} CPM`,gcX+gcW/2,gcY+gcH*0.68);
        ctx.fillStyle="rgba(255,140,30,0.7)"; ctx.font=`${Math.round(gcH*0.09)}px monospace`;
        ctx.fillText("GEIGER",gcX+gcW/2,gcY+gcH*0.82);
        ctx.fillText("COUNTER",gcX+gcW/2,gcY+gcH*0.92);

        // ── Bottom: Scrap material bins ───────────────────────────
        const binY=H-H*0.14, binH=H*0.1;
        const bins=[{lbl:"IRON SCRAP",col:"rgba(160,70,10,0.8)"},{lbl:"COPPER",col:"rgba(200,120,30,0.8)"},{lbl:"CIRCUITS",col:"rgba(220,180,20,0.8)"},{lbl:"FUEL CELLS",col:"rgba(255,80,20,0.8)"}];
        for (let bi=0;bi<4;bi++) {
          const bx=W*0.1+bi*(W*0.2);
          ctx.fillStyle="#0e0600"; ctx.strokeStyle=bins[bi].col; ctx.lineWidth=1.5;
          rr(bx,binY,W*0.16,binH,5); ctx.fill(); ctx.stroke();
          // Fill indicator
          const fillH=binH*(0.3+0.4*Math.abs(Math.sin(t*0.4+bi*1.1)));
          ctx.fillStyle=bins[bi].col; ctx.fillRect(bx+4,binY+binH-fillH-2,W*0.14-4,fillH);
          ctx.fillStyle="#FFE0A0"; ctx.font=`bold ${Math.round(binH*0.16)}px monospace`; ctx.textAlign="center";
          ctx.fillText(bins[bi].lbl,bx+W*0.08,binY+binH*0.18);
        }

        // ── Award/trophy shelf (far right) ───────────────────────
        const trophX=W-W*0.1, trophY=H*0.33, trophW=W*0.085, trophH=H*0.38;
        ctx.fillStyle="#0a0400"; ctx.strokeStyle="rgba(180,80,10,0.5)"; ctx.lineWidth=1.5;
        rr(trophX,trophY,trophW,trophH,5); ctx.fill(); ctx.stroke();
        // Shelves
        for (let sh=0;sh<3;sh++) ctx.fillStyle="rgba(140,55,8,0.55)", ctx.fillRect(trophX+2,trophY+trophH*(0.2+sh*0.27),trophW-4,3);
        // Trophies / items
        const trItems=[{lbl:"SCRAP#1",col:"#FF8800"},{lbl:"PROTO",col:"#FFCC00"},{lbl:"WIRES",col:"#FF4422"}];
        for (let ti3=0;ti3<3;ti3++) {
          const ty3=trophY+trophH*(0.06+ti3*0.27);
          ctx.fillStyle="#120800"; ctx.strokeStyle=trItems[ti3].col+"88"; ctx.lineWidth=1;
          rr(trophX+trophW*0.12,ty3,trophW*0.76,trophH*0.19,3); ctx.fill(); ctx.stroke();
          ctx.fillStyle=trItems[ti3].col; ctx.shadowColor=trItems[ti3].col; ctx.shadowBlur=4+2*Math.sin(t+ti3);
          ctx.font=`bold ${Math.round(trophH*0.06)}px monospace`; ctx.textAlign="center";
          ctx.fillText(trItems[ti3].lbl,trophX+trophW/2,ty3+trophH*0.12); ctx.shadowBlur=0;
        }

        // ── Floor cable runs ──────────────────────────────────────
        ctx.strokeStyle="rgba(160,60,10,0.35)"; ctx.lineWidth=2;
        ctx.setLineDash([5,5]);
        ctx.beginPath(); ctx.moveTo(tcX+tcW,tcY+tcH*0.5); ctx.lineTo(dskX,dskY+dskH*0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tankZoneX,tankZoneY+tankZH*0.5); ctx.lineTo(dskX+dskW,dskY+dskH*0.5); ctx.stroke();
        ctx.setLineDash([]);

        // ── Ambient dust particles ────────────────────────────────
        for (let pi=0;pi<16;pi++) {
          const px=(Math.sin(pi*2.1+t*0.35)*0.42+0.5)*W;
          const py=(Math.cos(pi*1.6+t*0.24)*0.38+0.5)*(H*0.88);
          const pA=0.1+0.07*Math.sin(t*1.3+pi);
          ctx.fillStyle=pi%3===0?`rgba(255,140,30,${pA})`:pi%3===1?`rgba(200,80,10,${pA})`:`rgba(255,200,60,${pA})`;
          ctx.beginPath(); ctx.arc(px,py,1.8,0,Math.PI*2); ctx.fill();
        }

        // ── [T] TALK hint ─────────────────────────────────────────
        const thW2=W*0.12, thH2=H*0.025;
        ctx.fillStyle=`rgba(140,50,5,${0.85+0.1*Math.sin(t*2.5)})`;
        rr(cx-thW2/2,topY+H*0.13,thW2,thH2,5); ctx.fill();
        ctx.strokeStyle="rgba(255,140,30,0.6)"; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#FFE0A0"; ctx.font=`bold ${Math.round(thH2*0.55)}px monospace`; ctx.textAlign="center";
        ctx.fillText("[T] TALK TO TECH",cx,topY+H*0.13+thH2*0.75);

      } else {
        // ═══ DEFAULT TECH LAB ═══
        // ── Main server bank (top) ───────────────────
        ctx.fillStyle = "#050a0f";
        ctx.strokeStyle = "#00FFCC";
        ctx.lineWidth = 1.5;
        rr(cx - W * 0.44, topY + 4, W * 0.88, 44, 3);
        ctx.fill();
        ctx.stroke();
        // Server units
        for (let si = 0; si < 5; si++) {
          const sx2 = cx - W * 0.4 + si * ((W * 0.8) / 4.5);
          ctx.fillStyle = "#0a1218";
          rr(sx2 - 14, topY + 6, 28, 40, 2);
          ctx.fill();
          ctx.fillStyle = "#00FFCC" + (si % 2 === 0 ? "88" : "44");
          ctx.fillRect(sx2 - 12, topY + 8, 24, 4);
          ctx.fillRect(sx2 - 12, topY + 16, 24, 4);
          ctx.fillRect(sx2 - 12, topY + 24, 24, 4);
          ctx.fillStyle = ["#00FF88", "#FF4400", "#4488FF", "#FFCC00", "#FF00CC"][si];
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(sx2 + 10, topY + 40, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        // ── Holographic workstation (center) ─────────
        ctx.fillStyle = "#050810";
        ctx.strokeStyle = "#0088FF";
        ctx.lineWidth = 1.5;
        rr(cx - 36, midY - 14, 72, 36, 4);
        ctx.fill();
        ctx.stroke();
        // Hologram display
        ctx.fillStyle = "rgba(0,136,255,0.12)";
        ctx.strokeStyle = "#0088FF88";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 20, midY - 10);
        ctx.lineTo(cx + 20, midY - 10);
        ctx.lineTo(cx + 28, midY - 28);
        ctx.lineTo(cx - 28, midY - 28);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#00FFCC";
        ctx.shadowColor = "#00FFCC";
        ctx.shadowBlur = 10;
        ctx.font = "bold 6px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("SYSTEM ONLINE", cx, midY - 18);
        ctx.shadowBlur = 0;
        // Keyboard glow
        ctx.fillStyle = "#0a1820";
        rr(cx - 28, midY - 8, 56, 12, 2);
        ctx.fill();
        for (let ki = 0; ki < 8; ki++) {
          ctx.fillStyle = "#00FFCC44";
          ctx.fillRect(cx - 26 + ki * 7, midY - 6, 5, 8);
        }
        // ── Chemical station (left) ───────────────────
        ctx.fillStyle = "#0a1210";
        ctx.strokeStyle = "#44FF88";
        ctx.lineWidth = 1;
        rr(cx - W * 0.44, midY - 8, 52, 48, 3);
        ctx.fill();
        ctx.stroke();
        const cColors = ["#FF4444", "#44FFCC", "#FFCC00", "#4444FF"];
        for (let fi = 0; fi < 4; fi++) {
          ctx.fillStyle = cColors[fi];
          ctx.shadowColor = cColors[fi];
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.roundRect(cx - W * 0.42 + fi * 12, midY - 4, 9, 22, [3, 3, 0, 0]);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    } else if (type === 14) {
      // WAREHOUSE
      if (!!this.map?.config?.zombie) {
        // ═══ ZOMBIE: INFECTED WAREHOUSE ═══
        const t = performance.now() / 1000;
        // Sign
        ctx.fillStyle="rgba(20,10,0,0.92)"; rr(W/2-130,room.S-22,260,26,5); ctx.fill();
        ctx.strokeStyle=`rgba(180,60,0,${0.6+0.3*Math.sin(t*1.6)})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#FFCC88"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
        ctx.fillText("☠  INFECTED WAREHOUSE  ☠", W/2, room.S-9);
        // ── Dark infected crates (top rows) ──
        const zCratePositions = [
          [cx-W*0.42, topY+4, 3, 2],
          [cx-W*0.08, topY+4, 2, 2],
          [cx+W*0.18, topY+4, 3, 2],
          [cx-W*0.40, midY-6, 2, 2],
          [cx+W*0.20, midY-6, 2, 2],
        ];
        for (const [bx3,by3,cols,rows] of zCratePositions) {
          for (let cr=0;cr<rows;cr++) for (let cc=0;cc<cols;cc++) {
            const px3=bx3+cc*22, py3=by3+cr*22;
            const seed=(px3*7+py3*13)%100;
            // Some crates are cracked/infected
            const infected=seed<35;
            ctx.fillStyle=infected?"#1a0e04":"#2a1c0a";
            ctx.strokeStyle=infected?"rgba(44,140,0,0.5)":"rgba(80,60,20,0.6)";
            ctx.lineWidth=1;
            rr(px3,py3,20,20,2); ctx.fill(); ctx.stroke();
            ctx.strokeStyle=infected?"rgba(44,100,0,0.4)":"rgba(60,40,10,0.4)";
            ctx.lineWidth=0.8;
            ctx.beginPath(); ctx.moveTo(px3+3,py3+3); ctx.lineTo(px3+17,py3+17); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(px3+17,py3+3); ctx.lineTo(px3+3,py3+17); ctx.stroke();
            if (infected) {
              // Green slime seeping from crack
              const sg=ctx.createRadialGradient(px3+10,py3+18,0,px3+10,py3+18,10);
              sg.addColorStop(0,`rgba(44,180,0,${0.25+0.1*Math.sin(t*0.7+seed)})`);
              sg.addColorStop(1,"rgba(0,0,0,0)");
              ctx.fillStyle=sg; ctx.beginPath(); ctx.ellipse(px3+10,py3+22,8,5,0,0,Math.PI*2); ctx.fill();
              // Biohazard label on infected crate
              ctx.fillStyle=`rgba(44,200,0,${0.55+0.2*Math.sin(t*1.1+cc)})`; ctx.font="8px serif";
              ctx.textAlign="center"; ctx.fillText("☢",px3+10,py3+13);
            }
          }
        }
        // ── Aisle markings (cracked/faded) ──
        ctx.strokeStyle="rgba(140,100,0,0.3)"; ctx.lineWidth=1;
        ctx.setLineDash([5,5]);
        ctx.beginPath(); ctx.moveTo(cx-8,topY+4); ctx.lineTo(cx-8,H-14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+8,topY+4); ctx.lineTo(cx+8,H-14); ctx.stroke();
        ctx.setLineDash([]);
        // ── Hazard tape strips (floor — yellow/black) ──
        for (let hi=0;hi<5;hi++) {
          const htx=W*0.06+hi*(W*0.195), hty=H*0.82;
          ctx.fillStyle=hi%2===0?"rgba(200,160,0,0.22)":"rgba(0,0,0,0.20)";
          ctx.save(); ctx.translate(htx,hty); ctx.rotate(-0.04+hi*0.01);
          ctx.fillRect(0,0,W*0.18,7); ctx.restore();
        }
        // ── Broken forklift (center, derelict) ──
        ctx.fillStyle="#1a1000"; rr(cx-22,midY-18,44,34,3); ctx.fill();
        ctx.strokeStyle="rgba(100,70,0,0.5)"; ctx.lineWidth=1.5; ctx.stroke();
        // Forklift forks
        ctx.fillStyle="#0e0a00";
        ctx.fillRect(cx-18,midY-24,6,10); ctx.fillRect(cx+12,midY-24,6,10);
        // Rust stains
        ctx.fillStyle="rgba(140,60,0,0.35)"; ctx.beginPath(); ctx.ellipse(cx,midY-5,14,6,0,0,Math.PI*2); ctx.fill();
        // Infection pool under forklift
        const ifkG=ctx.createRadialGradient(cx,midY+12,0,cx,midY+12,22);
        ifkG.addColorStop(0,`rgba(44,160,0,${0.22+0.1*Math.sin(t*0.9)})`); ifkG.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=ifkG; ctx.beginPath(); ctx.arc(cx,midY+12,22,0,Math.PI*2); ctx.fill();
        // ── Flickering hanging light ──
        const flicker=0.6+0.4*Math.abs(Math.sin(t*8.3));
        ctx.fillStyle=`rgba(220,180,60,${flicker*0.85})`;
        ctx.shadowColor="#FFCC44"; ctx.shadowBlur=14*flicker;
        ctx.beginPath(); ctx.ellipse(cx,topY+2,11,4,0,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=0;
        ctx.strokeStyle="rgba(100,100,100,0.8)"; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(cx,topY+2); ctx.lineTo(cx,0); ctx.stroke();
        // ── Corpse 1: worker collapsed by left crates ──
        drawCorpse(cx-W*0.30, topY+52, 0.4, '#1a1208', 0.5);
        // ── Corpse 2: worker in center aisle ──
        drawCorpse(cx+W*0.04, midY+30, -0.6, '#160e06', 0.55);
        // ── Corpse 3: near right crates ──
        drawCorpse(cx+W*0.32, topY+46, 1.8, '#141008', 0.42);
        // ── Blood smears across aisle ──
        for (let bsi=0;bsi<3;bsi++) {
          const bsx1=cx-W*0.30+bsi*W*0.18, bsy1=topY+52+bsi*20;
          const bsx2=cx-W*0.15+bsi*W*0.1, bsy2=midY+10+bsi*12;
          const bsG=ctx.createLinearGradient(bsx1,bsy1,bsx2,bsy2);
          bsG.addColorStop(0,"rgba(100,0,0,0.4)"); bsG.addColorStop(1,"rgba(60,0,0,0)");
          ctx.strokeStyle=bsG; ctx.lineWidth=4+bsi;
          ctx.beginPath(); ctx.moveTo(bsx1,bsy1); ctx.lineTo(bsx2,bsy2); ctx.stroke();
        }
        // ── Warning board (right wall) ──
        ctx.fillStyle="#1a0e00"; rr(W-74,H*0.36,58,80,4); ctx.fill();
        ctx.strokeStyle="rgba(180,80,0,0.5)"; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="rgba(200,100,0,0.8)"; ctx.font="bold 5px monospace"; ctx.textAlign="center";
        ctx.fillText("QUARANTINE", W-45, H*0.36+14);
        ctx.strokeStyle="rgba(180,80,0,0.3)"; ctx.lineWidth=0.5;
        ctx.beginPath(); ctx.moveTo(W-70,H*0.36+18); ctx.lineTo(W-20,H*0.36+18); ctx.stroke();
        const wNotes=["ZONE INFECTED","ALL STAFF DOWN","DO NOT REOPEN","☢ HAZMAT REQ."];
        wNotes.forEach((n,i)=>{
          ctx.fillStyle=`rgba(${i>1?220:160},${i>1?60:120},0,0.7)`;
          ctx.font=`${i>1?"bold ":""}5px monospace`; ctx.textAlign="left";
          ctx.fillText(n, W-70, H*0.36+30+i*14);
        });
        // ── Green infection pools (floor) ──
        for (const [ipx,ipy,ipr] of [[W*0.28,H*0.64,16],[W*0.55,H*0.75,14],[W*0.40,H*0.86,12]]) {
          const ipG=ctx.createRadialGradient(ipx,ipy,0,ipx,ipy,ipr);
          ipG.addColorStop(0,`rgba(44,180,0,${0.25+0.1*Math.sin(t*0.7+ipx)})`);
          ipG.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=ipG; ctx.beginPath(); ctx.arc(ipx,ipy,ipr,0,Math.PI*2); ctx.fill();
        }
      } else {
        // ── Default Warehouse ──────────────────────────
        const crateColor = "#4a3a22",
          crateStroke = "#8a6a3a";
        const cratePositions = [
          [cx - W * 0.42, topY + 4, 3, 2],
          [cx - W * 0.08, topY + 4, 2, 3],
          [cx + W * 0.2, topY + 4, 3, 2],
          [cx - W * 0.42, midY - 6, 2, 2],
          [cx + W * 0.22, midY - 6, 2, 2],
        ];
        for (const [bx3, by3, cols, rows] of cratePositions) {
          for (let cr = 0; cr < rows; cr++)
            for (let cc = 0; cc < cols; cc++) {
              const px3 = bx3 + cc * 22,
                py3 = by3 + cr * 22;
              ctx.fillStyle = crateColor;
              ctx.strokeStyle = crateStroke;
              ctx.lineWidth = 1;
              rr(px3, py3, 20, 20, 2);
              ctx.fill();
              ctx.stroke();
              // Crate X mark
              ctx.strokeStyle = "#6a4a22";
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.moveTo(px3 + 3, py3 + 3);
              ctx.lineTo(px3 + 17, py3 + 17);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(px3 + 17, py3 + 3);
              ctx.lineTo(px3 + 3, py3 + 17);
              ctx.stroke();
            }
        }
        // ── Forklift path (center aisle) ─────────────
        ctx.strokeStyle = "#FFCC00";
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(cx - 8, topY + 4);
        ctx.lineTo(cx - 8, H - 14);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 8, topY + 4);
        ctx.lineTo(cx + 8, H - 14);
        ctx.stroke();
        ctx.setLineDash([]);
        // ── Hanging light (center) ────────────────────
        ctx.fillStyle = "#FFEE88";
        ctx.shadowColor = "#FFCC44";
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.ellipse(cx, topY + 2, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#888";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, topY + 2);
        ctx.lineTo(cx, 0);
        ctx.stroke();
        // ── Shipping label on ground ──────────────────
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        rr(cx - 36, midY + 24, 72, 28, 2);
        ctx.fill();
        ctx.fillStyle = "#AAAAAA";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText("FRAGILE", cx, midY + 41);
      }
    } else if (type === 15) {
      if (isDino) {
        // ═══ DINO WORLD: PACK ENFORCER DEN ═══
        const t15=performance.now()/1000;
        const LEAF="#66DD44",AMBER="#FFCC44",BONE="#F0E8C0",CRIM="#CC2200";
        const LEAFr="102,221,68",AMBERr="255,204,68";
        const drawEnforcer=(px,py)=>{
          ctx.fillStyle='rgba(0,0,0,0.28)';ctx.beginPath();ctx.ellipse(px,py+9,13,6,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#1a1a08';ctx.fillRect(px-6,py+2,5,13);ctx.fillRect(px+1,py+2,5,13);
          ctx.fillStyle='#2a1a00';ctx.fillRect(px-7,py+12,7,5);ctx.fillRect(px,py+12,7,5);
          ctx.fillStyle='#4a3a10';ctx.beginPath();ctx.roundRect(px-11,py-14,22,26,3);ctx.fill();
          ctx.strokeStyle='rgba(102,221,68,0.5)';ctx.lineWidth=2;
          ctx.beginPath();ctx.moveTo(px-9,py-6);ctx.lineTo(px+9,py-6);ctx.stroke();
          ctx.fillStyle=LEAF;ctx.shadowColor=LEAF;ctx.shadowBlur=4;
          ctx.beginPath();ctx.arc(px,py-2,3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
          ctx.strokeStyle='#4a3a10';ctx.lineWidth=6;ctx.lineCap='round';
          ctx.beginPath();ctx.moveTo(px-11,py-6);ctx.lineTo(px-20,py+5);ctx.stroke();
          ctx.beginPath();ctx.moveTo(px+11,py-6);ctx.lineTo(px+20,py+5);ctx.stroke();
          ctx.lineCap='butt';
          ctx.fillStyle='#c09060';
          ctx.beginPath();ctx.arc(px-20,py+5,4,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.arc(px+20,py+5,4,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#c09060';ctx.fillRect(px-3,py-16,6,4);
          ctx.beginPath();ctx.arc(px,py-22,9,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#1a1000';ctx.beginPath();ctx.arc(px,py-25,8,Math.PI,0);ctx.fill();ctx.fillRect(px-8,py-26,16,5);
          ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(px-3.5,py-23,2,1.5,0,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.ellipse(px+3.5,py-23,2,1.5,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#3a1800';ctx.beginPath();ctx.arc(px-3.5,py-23,1,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.arc(px+3.5,py-23,1,0,Math.PI*2);ctx.fill();
          ctx.strokeStyle='rgba(80,30,10,0.7)';ctx.lineWidth=1;
          ctx.beginPath();ctx.arc(px,py-17.5,2.5,0.15,Math.PI-0.15);ctx.stroke();
          ctx.fillStyle=AMBER;ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.shadowColor=LEAF;ctx.shadowBlur=6;ctx.fillText('ENFORCER',px,py-36);ctx.shadowBlur=0;
        };
        // Badge and sign
        ctx.fillStyle=AMBER;ctx.shadowColor=AMBER;ctx.shadowBlur=12;
        ctx.font="bold 16px serif";ctx.textAlign="center";
        ctx.fillText("🦖",W*0.12,topY+22);ctx.shadowBlur=0;
        ctx.fillStyle=LEAF;ctx.font="bold 9px monospace";ctx.fillText("ENFORCERS",W*0.12,topY+40);
        ctx.fillStyle="rgba(102,221,68,0.18)";rr(W*0.04,topY+4,64,40,3);ctx.fill();
        // Threat board
        ctx.fillStyle="#060e03";rr(cx-60,topY+4,120,46,2);ctx.fill();
        ctx.strokeStyle=LEAF;ctx.lineWidth=1.5;ctx.strokeRect(cx-60,topY+4,120,46);
        for(let sl=0;sl<3;sl++){ctx.fillStyle="rgba(102,221,68,0.06)";ctx.fillRect(cx-58,topY+10+sl*13,116,9);}
        for(let ti=0;ti<5;ti++){
          ctx.strokeStyle=ti%2===0?CRIM:LEAF;ctx.lineWidth=1;
          ctx.beginPath();ctx.arc(cx-40+ti*20,topY+24,5,0,Math.PI*2);ctx.stroke();
          ctx.beginPath();ctx.moveTo(cx-40+ti*20-7,topY+24);ctx.lineTo(cx-40+ti*20+7,topY+24);ctx.stroke();
          ctx.beginPath();ctx.moveTo(cx-40+ti*20,topY+17);ctx.lineTo(cx-40+ti*20,topY+31);ctx.stroke();
        }
        ctx.fillStyle=CRIM;ctx.font="bold 6px monospace";ctx.textAlign="center";ctx.fillText("DINO THREAT SCAN",cx,topY+8);
        // Large containment cage right
        const podX=W*0.74,podY=topY+4,podW=90,podH=72;
        ctx.fillStyle="#040e02";rr(podX,podY,podW,podH,3);ctx.fill();
        ctx.strokeStyle=LEAF;ctx.lineWidth=1.5;ctx.strokeRect(podX,podY,podW,podH);
        for(let bi=1;bi<4;bi++){ctx.strokeStyle="rgba(102,221,68,0.3)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(podX+podW*(bi/4),podY);ctx.lineTo(podX+podW*(bi/4),podY+podH);ctx.stroke();}
        // Raptor in cage (better drawn)
        const r1x=podX+podW*0.22,r1y=podY+podH*0.5;
        ctx.fillStyle="rgba(0,0,0,0.22)";ctx.beginPath();ctx.ellipse(r1x+2,r1y+6,12,5,0,0,Math.PI*2);ctx.fill();
        const rbg=ctx.createRadialGradient(r1x,r1y,1,r1x,r1y,10);
        rbg.addColorStop(0,'#88EE44');rbg.addColorStop(1,'#2a6610');
        ctx.fillStyle=rbg;ctx.beginPath();ctx.ellipse(r1x,r1y,10,6,0.3,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#66CC33';ctx.beginPath();ctx.ellipse(r1x-10,r1y-1,5,3,0.3,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#FFEE00';ctx.shadowColor='#FFEE00';ctx.shadowBlur=3;
        ctx.beginPath();ctx.arc(r1x-13,r1y-2,2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        ctx.fillStyle="#000";ctx.beginPath();ctx.arc(r1x-13,r1y-2,1,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle=AMBER;ctx.lineWidth=1;ctx.strokeRect(podX+podW*0.26,podY+4,podW*0.24,podH-8);
        // Glowing trap cage (empty)
        const r2x=podX+podW*0.72,r2y=podY+podH*0.5;
        const pp=Math.sin(t15*3)*0.5+0.5;
        ctx.fillStyle=`rgba(${LEAFr},${0.04+pp*0.06})`;ctx.beginPath();ctx.ellipse(r2x,r2y,14,18,0,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle=`rgba(${LEAFr},${0.25+pp*0.25})`;ctx.lineWidth=1.2;ctx.stroke();
        ctx.fillStyle=`rgba(${LEAFr},0.2)`;ctx.font="6px monospace";ctx.textAlign="center";ctx.fillText("VACANT",r2x,r2y+3);
        ctx.fillStyle=LEAF;ctx.font="bold 6px monospace";ctx.fillText("CONTAINMENT",podX+podW/2,podY+7);
        // Command desk left
        const cdeskX=W*0.06,cdeskY=H*0.38;
        ctx.fillStyle="#0a1a06";ctx.strokeStyle=LEAF;ctx.lineWidth=1.5;
        rr(cdeskX,cdeskY,96,46,3);ctx.fill();ctx.stroke();
        ctx.fillStyle="rgba(102,221,68,0.07)";rr(cdeskX+50,cdeskY+6,40,24,2);ctx.fill();
        ctx.strokeStyle=LEAF;ctx.lineWidth=1;ctx.strokeRect(cdeskX+50,cdeskY+6,40,24);
        const sweepY=(t15*40)%24;
        ctx.fillStyle="rgba(102,221,68,0.14)";ctx.fillRect(cdeskX+51,cdeskY+7+sweepY,38,2);
        for(let dc=0;dc<3;dc++){ctx.fillStyle="#0e2810";rr(cdeskX+8+dc*13,cdeskY+10,11,8,1);ctx.fill();ctx.fillStyle=dc===1?LEAF:AMBER;ctx.fillRect(cdeskX+10+dc*13,cdeskY+12,7,4);}
        ctx.fillStyle=LEAF;ctx.font="bold 6px monospace";ctx.textAlign="center";ctx.fillText("COMMAND POST",cdeskX+48,cdeskY-5);
        // Weapon rack on wall
        const wrX=W*0.04,wrY=H*0.62;
        ctx.fillStyle="#0e1e08";ctx.strokeStyle=MOSS;ctx.lineWidth=1.5;
        rr(wrX,wrY,52,50,2);ctx.fill();ctx.stroke();
        ctx.fillStyle="#223a10";ctx.fillRect(wrX,wrY+16,52,3);ctx.fillRect(wrX,wrY+32,52,3);
        for(let wi=0;wi<3;wi++){
          ctx.fillStyle="#6b4422";ctx.fillRect(wrX+8+wi*14,wrY+2,4,13);
          ctx.fillStyle="#4a4a4a";ctx.fillRect(wrX+6+wi*14,wrY+4,8,7);
          ctx.strokeStyle="#6a6a6a";ctx.lineWidth=1.5;
          ctx.beginPath();ctx.moveTo(wrX+10+wi*14,wrY+0);ctx.lineTo(wrX+10+wi*14,wrY+6);ctx.stroke();
        }
        ctx.fillStyle=LEAF;ctx.font="bold 5px monospace";ctx.textAlign="center";ctx.fillText("ARMORY",wrX+26,wrY+56);
        // Skull trophy on wall
        const skX=W*0.88,skY=topY+20;
        ctx.fillStyle=BONE;ctx.shadowColor=AMBER;ctx.shadowBlur=8;
        ctx.beginPath();ctx.ellipse(skX,skY,16,11,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        ctx.fillStyle="#1a3410";ctx.beginPath();ctx.ellipse(skX-5,skY+5,5,6,0,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.ellipse(skX+5,skY+5,5,6,0,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle="#c8c090";ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(skX-12,skY+10);ctx.lineTo(skX-8,skY+18);ctx.lineTo(skX-4,skY+12);ctx.lineTo(skX,skY+18);ctx.lineTo(skX+4,skY+12);ctx.lineTo(skX+8,skY+18);ctx.lineTo(skX+12,skY+10);ctx.stroke();
        ctx.fillStyle=BONE;ctx.font="bold 6px monospace";ctx.textAlign="center";ctx.fillText("TROPHY",skX,skY+28);
        // Drawn ENFORCER
        drawEnforcer(W*0.5,H*0.45);
        // Fireflies
        ctx.save();
        for(let fi=0;fi<5;fi++){
          const fx=W*0.08+((t15*10+fi*72)%(W*0.85)),fy=H*0.25+Math.sin(t15+fi*1.4)*35;
          const fa=Math.sin(t15*2+fi)*0.3+0.4;
          ctx.fillStyle=fi%2===0?`rgba(${LEAFr},${fa})`:`rgba(${AMBERr},${fa})`;
          ctx.shadowColor=fi%2===0?LEAF:AMBER;ctx.shadowBlur=5;
          ctx.beginPath();ctx.arc(fx,fy,1.8,0,Math.PI*2);ctx.fill();
        }
        ctx.shadowBlur=0;ctx.restore();
      } else if (!!this.map?.config?.robot) {
        // ════════════════════════════════════════════════════════════════════
        //  ROBOT CITY: RCPD — Mech Enforcement Station
        // ════════════════════════════════════════════════════════════════════
        const t15 = performance.now() / 1000;

        // ── RCPD badge and sign (top-left) ───────────────────────────────
        ctx.fillStyle = "#00FFB0";
        ctx.shadowColor = "#00FFB0"; ctx.shadowBlur = 14;
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText("⬡", W * 0.12, topY + 20);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#00CCAA";
        ctx.font = "bold 9px monospace";
        ctx.fillText("RCPD", W * 0.12, topY + 38);
        ctx.fillStyle = "rgba(0,200,160,0.30)";
        rr(W * 0.05, topY + 6, 50, 36, 3); ctx.fill();

        // ── Threat analysis board (top-center) ───────────────────────────
        ctx.fillStyle = "#080e14"; rr(cx - 58, topY + 4, 116, 42, 2); ctx.fill();
        ctx.strokeStyle = "#00CCAA"; ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 58, topY + 4, 116, 42);
        // Scanlines
        for (let sl = 0; sl < 3; sl++) {
          ctx.fillStyle = "rgba(0,200,180,0.07)";
          ctx.fillRect(cx - 56, topY + 10 + sl * 12, 112, 8);
        }
        // Target icons
        for (let ti = 0; ti < 5; ti++) {
          ctx.strokeStyle = ti % 2 === 0 ? "#FF4444" : "#00FF88";
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(cx - 40 + ti * 20, topY + 22, 5, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx-40+ti*20-7,topY+22); ctx.lineTo(cx-40+ti*20+7,topY+22); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx-40+ti*20,topY+22-7); ctx.lineTo(cx-40+ti*20,topY+22+7); ctx.stroke();
        }
        ctx.fillStyle = "#FF4444"; ctx.font = "bold 6px monospace"; ctx.textAlign = "center";
        ctx.fillText("THREAT SCAN", cx, topY + 8);

        // ── Containment pods — top-right (robots in custody) ─────────────
        const podX = W * 0.76, podY = topY + 6, podW = 78, podH = 60;
        ctx.fillStyle = "#081018"; rr(podX, podY, podW, podH, 3); ctx.fill();
        ctx.strokeStyle = "#00CCAA"; ctx.lineWidth = 1.5; ctx.strokeRect(podX, podY, podW, podH);
        // Pod divider
        ctx.fillStyle = "#0c1820"; ctx.fillRect(podX + podW/2 - 1, podY, 2, podH);
        // Left pod: detained bot (simple robot shape)
        const p1cx = podX + podW*0.25, p1cy = podY + podH*0.55;
        ctx.fillStyle = "#2a3a4a"; rr(p1cx-6, p1cy-8, 12, 14, 2); ctx.fill();  // body
        ctx.fillStyle = "#3a4a5a"; rr(p1cx-5, p1cy-18, 10, 10, 2); ctx.fill(); // head
        ctx.fillStyle = "#FF4444"; ctx.fillRect(p1cx-3, p1cy-15, 2, 4); ctx.fillRect(p1cx+1, p1cy-15, 2, 4); // eyes
        // Energy cuffs
        ctx.strokeStyle = "#00FFAA"; ctx.lineWidth = 1.5;
        ctx.strokeRect(p1cx-9, p1cy-2, 5, 6); ctx.strokeRect(p1cx+4, p1cy-2, 5, 6);
        // Right pod: empty (glowing containment field)
        const p2cx = podX + podW*0.75, p2cy = podY + podH*0.55;
        const podPulse = Math.sin(t15*3)*0.5+0.5;
        ctx.fillStyle = `rgba(0,200,180,${0.04+podPulse*0.05})`;
        ctx.beginPath(); ctx.ellipse(p2cx, p2cy, 14, 18, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = `rgba(0,255,200,${0.2+podPulse*0.2})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(p2cx, p2cy, 14, 18, 0, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = "rgba(0,200,180,0.18)"; ctx.font = "7px monospace"; ctx.textAlign = "center";
        ctx.fillText("VACANT", p2cx, p2cy+3);
        ctx.fillStyle = "#00CCAA"; ctx.font = "bold 6px monospace";
        ctx.fillText("CONTAINMENT", podX+podW/2, podY+7);

        // ── Enforcement console desk (left-center) ────────────────────────
        const cdeskX = W * 0.08, cdeskY = H * 0.40;
        ctx.fillStyle = "#101e2c"; ctx.strokeStyle = "#00CCAA"; ctx.lineWidth = 1.5;
        rr(cdeskX, cdeskY, 90, 40, 3); ctx.fill(); ctx.stroke();
        // Holographic display
        ctx.fillStyle = "rgba(0,200,220,0.08)"; rr(cdeskX+48, cdeskY+5, 36, 22, 2); ctx.fill();
        ctx.strokeStyle = "#00CCAA"; ctx.lineWidth = 1; ctx.strokeRect(cdeskX+48, cdeskY+5, 36, 22);
        // Scan line sweep
        const sweepY = ((t15*40) % 22);
        ctx.fillStyle = "rgba(0,255,200,0.14)"; ctx.fillRect(cdeskX+49, cdeskY+6+sweepY, 34, 2);
        // Data chips on desk
        for (let dc = 0; dc < 3; dc++) {
          ctx.fillStyle = "#1a2c3a"; rr(cdeskX+8+dc*12, cdeskY+8, 10, 7, 1); ctx.fill();
          ctx.fillStyle = dc===1 ? "#00FF88" : "#00CCFF"; ctx.fillRect(cdeskX+10+dc*12, cdeskY+10, 6, 3);
        }

        // ── Weapon rack (bottom-left) ─────────────────────────────────────
        ctx.fillStyle = "#0e1a24"; ctx.strokeStyle = "#2a3a4a"; ctx.lineWidth = 1;
        rr(W*0.06, midY+28, 34, 52, 2); ctx.fill(); ctx.stroke();
        // Rack bars
        ctx.fillStyle = "#1c2c3c";
        for (let rb = 0; rb < 4; rb++) ctx.fillRect(W*0.06+3, midY+34+rb*13, 28, 2);
        // Weapons on rack
        for (let rw = 0; rw < 3; rw++) {
          ctx.fillStyle = "#2a3a4a"; ctx.fillRect(W*0.06+8+rw*8, midY+36+rw*13, 4, 8);
          ctx.fillStyle = "#00CCFF"; ctx.fillRect(W*0.06+9+rw*8, midY+37+rw*13, 2, 2);
        }

        // ── Second console desk (center-bottom) ──────────────────────────
        const desk2X2 = W*0.30, desk2Y2 = H*0.54;
        ctx.fillStyle = "#101e2c"; ctx.strokeStyle = "#00CCAA"; ctx.lineWidth = 1.5;
        rr(desk2X2, desk2Y2, 92, 40, 3); ctx.fill(); ctx.stroke();
        // Monitor
        ctx.fillStyle = "#080e14"; rr(desk2X2+52, desk2Y2+5, 32, 22, 2); ctx.fill();
        ctx.strokeStyle = "#00CCAA"; ctx.lineWidth = 1; ctx.strokeRect(desk2X2+52, desk2Y2+5, 32, 22);
        // Scrolling data lines
        for (let dl = 0; dl < 3; dl++) {
          ctx.fillStyle = `rgba(0,${180+dl*25},${180+dl*20},0.35)`;
          ctx.fillRect(desk2X2+54, desk2Y2+9+dl*6, (16+dl*6+(rseed%8)), 2);
        }
        // Keyboard
        ctx.fillStyle = "#1a2a3a"; rr(desk2X2+8, desk2Y2+10, 32, 18, 2); ctx.fill();
        for (let kr = 0; kr < 2; kr++)
          for (let kc = 0; kc < 5; kc++) {
            ctx.fillStyle = "#0e1a26"; ctx.fillRect(desk2X2+10+kc*6, desk2Y2+13+kr*6, 4, 4);
          }
        // Chair
        ctx.fillStyle = "#0e1a26"; ctx.strokeStyle = "#1a2a38"; ctx.lineWidth = 1;
        rr(desk2X2+16, desk2Y2+44, 24, 18, 3); ctx.fill(); ctx.stroke();
        rr(desk2X2+18, desk2Y2+24, 20, 22, 3); ctx.fill(); ctx.stroke();

      } else {
      // POLICE STATION
      // ── Police badge and sign on wall (top-left corner) ──────────────────
      ctx.fillStyle = "#FFD700";
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 16;
      ctx.font = "28px serif";
      ctx.textAlign = "center";
      ctx.fillText("⭐", W * 0.12, topY + 24);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#4477FF";
      ctx.font = "bold 10px Orbitron, monospace";
      ctx.fillText("NCPD", W * 0.12, topY + 42);

      // ── Evidence board (center-top wall) ───────────
      ctx.fillStyle = "#0a1020";
      rr(cx - 55, topY + 4, 110, 40, 2);
      ctx.fill();
      ctx.strokeStyle = "#4477FF";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 55, topY + 4, 110, 40);
      // Mug shots
      for (let mi = 0; mi < 6; mi++) {
        ctx.fillStyle = "#EEDDCC";
        ctx.beginPath();
        ctx.arc(cx - 44 + mi * 18, topY + 16, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a1a2a";
        ctx.fillRect(cx - 47 + mi * 18, topY + 22, 10, 16);
      }
      ctx.fillStyle = "#FF4444";
      ctx.font = "bold 6px monospace";
      ctx.textAlign = "center";
      ctx.fillText("WANTED", cx, topY + 8);

      // ── Prison cell with criminal (top-right corner) ─────────────────
      const cellX = W * 0.78;
      const cellY = topY + 8;
      const cellW = 72;
      const cellH = 58;

      // Cell floor/interior
      ctx.fillStyle = "#0a0e14";
      ctx.strokeStyle = "#3a4a6a";
      ctx.lineWidth = 2;
      rr(cellX, cellY, cellW, cellH, 2);
      ctx.fill();
      ctx.stroke();

      // Cell bench
      ctx.fillStyle = "#2a2a3a";
      rr(cellX + 4, cellY + cellH - 16, cellW - 8, 12, 2);
      ctx.fill();

      // Cell bars (vertical)
      ctx.strokeStyle = "#6688AA";
      ctx.lineWidth = 3;
      for (let bi = 0; bi < 5; bi++) {
        ctx.beginPath();
        ctx.moveTo(cellX + 10 + bi * 14, cellY);
        ctx.lineTo(cellX + 10 + bi * 14, cellY + cellH);
        ctx.stroke();
      }
      // Horizontal bars
      ctx.beginPath();
      ctx.moveTo(cellX, cellY + cellH * 0.33);
      ctx.lineTo(cellX + cellW, cellY + cellH * 0.33);
      ctx.moveTo(cellX, cellY + cellH * 0.66);
      ctx.lineTo(cellX + cellW, cellY + cellH * 0.66);
      ctx.stroke();

      // Criminal sitting on bench
      const crimX = cellX + cellW / 2;
      const crimY = cellY + cellH - 24;

      // Legs
      ctx.fillStyle = "#4a4a4a";
      ctx.fillRect(crimX - 7, crimY + 6, 6, 10);
      ctx.fillRect(crimX + 1, crimY + 6, 6, 10);

      // Body (orange jumpsuit)
      ctx.fillStyle = "#DD6600";
      ctx.beginPath();
      ctx.roundRect(crimX - 9, crimY - 10, 18, 18, 3);
      ctx.fill();

      // Arms
      ctx.fillRect(crimX - 14, crimY - 6, 6, 12);
      ctx.fillRect(crimX + 8, crimY - 6, 6, 12);

      // Head
      ctx.fillStyle = "#CCAA88";
      ctx.beginPath();
      ctx.arc(crimX, crimY - 18, 8, 0, Math.PI * 2);
      ctx.fill();

      // Shaved head
      ctx.fillStyle = "#3a3a3a";
      ctx.beginPath();
      ctx.arc(crimX, crimY - 20, 7, Math.PI, 0);
      ctx.fill();

      // Angry eyes
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(crimX - 3, crimY - 18, 2, 0, Math.PI * 2);
      ctx.arc(crimX + 3, crimY - 18, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(crimX - 3, crimY - 18, 1, 0, Math.PI * 2);
      ctx.arc(crimX + 3, crimY - 18, 1, 0, Math.PI * 2);
      ctx.fill();

      // Frown
      ctx.strokeStyle = "#886655";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(crimX, crimY - 12, 3, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // ── Second empty prison cell (below first) ─────────────────
      const cell2Y = cellY + cellH + 10;
      ctx.fillStyle = "#0a0e14";
      ctx.strokeStyle = "#3a4a6a";
      ctx.lineWidth = 2;
      rr(cellX, cell2Y, cellW, cellH, 2);
      ctx.fill();
      ctx.stroke();
      // Cell bench
      ctx.fillStyle = "#2a2a3a";
      rr(cellX + 4, cell2Y + cellH - 16, cellW - 8, 12, 2);
      ctx.fill();
      // Cell bars
      ctx.strokeStyle = "#6688AA";
      ctx.lineWidth = 3;
      for (let bi = 0; bi < 5; bi++) {
        ctx.beginPath();
        ctx.moveTo(cellX + 10 + bi * 14, cell2Y);
        ctx.lineTo(cellX + 10 + bi * 14, cell2Y + cellH);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cellX, cell2Y + cellH * 0.33);
      ctx.lineTo(cellX + cellW, cell2Y + cellH * 0.33);
      ctx.moveTo(cellX, cell2Y + cellH * 0.66);
      ctx.lineTo(cellX + cellW, cell2Y + cellH * 0.66);
      ctx.stroke();

      // ── Officer's desk (left-center) ───────────────
      const deskX = W * 0.12;
      const deskY = H * 0.38;
      ctx.fillStyle = "#2a3040";
      ctx.strokeStyle = "#4477FF";
      ctx.lineWidth = 1.5;
      rr(deskX, deskY, 85, 36, 3);
      ctx.fill();
      ctx.stroke();
      // Computer monitor
      ctx.fillStyle = "#0a1020";
      rr(deskX + 50, deskY + 4, 28, 20, 2);
      ctx.fill();
      ctx.fillStyle = "#4488FF";
      ctx.fillRect(deskX + 52, deskY + 6, 24, 14);
      // Desk items
      ctx.fillStyle = "#EEDDCC";
      ctx.fillRect(deskX + 8, deskY + 8, 20, 14);
      ctx.fillStyle = "#FF4444";
      ctx.beginPath();
      ctx.arc(deskX + 38, deskY + 16, 5, 0, Math.PI * 2);
      ctx.fill();

      // ── Filing cabinets (bottom-left) ───────────────
      ctx.fillStyle = "#3a3a4a";
      ctx.strokeStyle = "#5a5a6a";
      ctx.lineWidth = 1;
      rr(W * 0.08, midY + 30, 32, 48, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2a2a3a";
      for (let fi = 0; fi < 3; fi++) {
        rr(W * 0.08 + 3, midY + 34 + fi * 15, 26, 13, 1);
        ctx.fill();
      }
      // Second cabinet
      ctx.fillStyle = "#3a3a4a";
      rr(W * 0.08 + 38, midY + 30, 32, 48, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2a2a3a";
      for (let fi = 0; fi < 3; fi++) {
        rr(W * 0.08 + 41, midY + 34 + fi * 15, 26, 13, 1);
        ctx.fill();
      }

      // ── Second desk with chair (center-bottom area) ───────────────
      const desk2X = W * 0.32;
      const desk2Y = H * 0.54;
      ctx.fillStyle = "#2a3040";
      ctx.strokeStyle = "#4477FF";
      ctx.lineWidth = 1.5;
      rr(desk2X, desk2Y, 90, 38, 3);
      ctx.fill();
      ctx.stroke();
      // Computer monitor on desk
      ctx.fillStyle = "#0a1020";
      rr(desk2X + 55, desk2Y + 5, 28, 20, 2);
      ctx.fill();
      ctx.fillStyle = "#4488FF";
      ctx.fillRect(desk2X + 57, desk2Y + 7, 24, 14);
      // Papers and items
      ctx.fillStyle = "#EEDDCC";
      ctx.fillRect(desk2X + 8, desk2Y + 8, 22, 16);
      ctx.fillStyle = "#886644";
      ctx.fillRect(desk2X + 10, desk2Y + 10, 18, 2);
      ctx.fillRect(desk2X + 10, desk2Y + 14, 18, 2);
      ctx.fillRect(desk2X + 10, desk2Y + 18, 18, 2);
      // Coffee mug
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(desk2X + 42, desk2Y + 18, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a2a1a";
      ctx.beginPath();
      ctx.arc(desk2X + 42, desk2Y + 18, 3, 0, Math.PI * 2);
      ctx.fill();

      // Chair for sitting officer
      const chairX = desk2X + 20;
      const chairY = desk2Y + 42;
      ctx.fillStyle = "#2a2a3a";
      ctx.strokeStyle = "#4a4a5a";
      ctx.lineWidth = 1;
      // Chair seat
      rr(chairX - 12, chairY, 24, 18, 3);
      ctx.fill();
      ctx.stroke();
      // Chair back
      ctx.fillStyle = "#3a3a4a";
      rr(chairX - 10, chairY - 20, 20, 22, 3);
      ctx.fill();
      ctx.stroke();
      } // end else (standard NCPD)
    } else if (type === 16) {
      // TATTOO PARLOR
      if (!!this.map?.config?.ocean) {
        // ═══ OCEAN: DEEP INK TATTOO ═══
        const t = performance.now() / 1000;
        const AQUA = "#00FFEE", CYAN = "#00CCFF", TEAL = "#00AA88",
              PINK = "#FF44AA", PURP = "#AA44FF", GOLD = "#FFDD44";

        // ── FLOOR TILES (dark wet stone) ──
        for (let ty2 = 0; ty2 < room.H; ty2++) {
          for (let tx2 = 0; tx2 < room.W; tx2++) {
            if (room.layout[ty2][tx2] !== 0) continue;
            ctx.fillStyle = (tx2 + ty2) % 2 === 0 ? "#060e18" : "#04090f";
            ctx.fillRect(tx2 * room.S, ty2 * room.S, room.S, room.S);
            ctx.strokeStyle = "rgba(0,150,180,0.07)";
            ctx.lineWidth = 1;
            ctx.strokeRect(tx2 * room.S, ty2 * room.S, room.S, room.S);
          }
        }

        // ── ROOM BORDER ──
        ctx.strokeStyle = CYAN; ctx.lineWidth = 2;
        ctx.shadowColor = CYAN; ctx.shadowBlur = 16;
        ctx.strokeRect(room.S + 2, room.S + 2, W - room.S * 2 - 4, H - room.S * 2 - 4);
        ctx.shadowBlur = 0;

        // ── NEON SIGN (top center) ──
        ctx.save();
        ctx.font = "bold 20px Orbitron, monospace"; ctx.textAlign = "center";
        ctx.fillStyle = "#fff"; ctx.shadowColor = AQUA; ctx.shadowBlur = 28;
        ctx.fillText("〜  DEEP INK  〜", W / 2, room.S - 16);
        ctx.shadowBlur = 0; ctx.restore();
        const signG = ctx.createLinearGradient(0, room.S, W, room.S);
        signG.addColorStop(0, "rgba(0,255,238,0)");
        signG.addColorStop(0.5, "rgba(0,255,238,0.5)");
        signG.addColorStop(1, "rgba(0,255,238,0)");
        ctx.fillStyle = signG;
        ctx.fillRect(room.S, room.S, W - room.S * 2, 3);

        // ── FLASH ART WALL (top — ocean tattoo designs in frames) ──
        const flashY = room.S + 4, flashH = 60;
        ctx.fillStyle = "#04090f"; ctx.strokeStyle = TEAL; ctx.lineWidth = 1.5;
        rr(room.S + 6, flashY, W - room.S * 2 - 12, flashH, 4);
        ctx.fill(); ctx.stroke();
        // 9 framed flash art panels
        const flashIcons = ["🐙","🐬","⚓","🌊","🦈","🐠","🦑","🐚","🔱"];
        const flashLabels = ["OCTOPUS","DOLPHIN","ANCHOR","WAVE","SHARK","FISH","SQUID","SHELL","TRIDENT"];
        const flashW = (W - room.S * 2 - 24) / 9;
        for (let fi = 0; fi < 9; fi++) {
          const fx = room.S + 12 + fi * flashW;
          ctx.fillStyle = "#060e18"; ctx.strokeStyle = AQUA + "55"; ctx.lineWidth = 1;
          rr(fx, flashY + 4, flashW - 4, flashH - 8, 3); ctx.fill(); ctx.stroke();
          ctx.font = "14px serif"; ctx.textAlign = "center";
          ctx.fillText(flashIcons[fi], fx + flashW / 2 - 2, flashY + 30);
          ctx.font = "bold 4.5px Orbitron, monospace"; ctx.textAlign = "center";
          ctx.fillStyle = AQUA + "99";
          ctx.fillText(flashLabels[fi], fx + flashW / 2 - 2, flashY + 50);
        }

        // ── TWO RECLINING TATTOO CHAIRS (side by side, large) ──
        for (const [chX, chSide] of [[W * 0.28, -1], [W * 0.72, 1]]) {
          const chY = H * 0.44;
          // Chair body
          ctx.fillStyle = "#0d1a28"; ctx.strokeStyle = CYAN; ctx.lineWidth = 1.8;
          ctx.shadowColor = CYAN; ctx.shadowBlur = 8;
          rr(chX - 52, chY, 104, 40, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
          // Seat cushion
          ctx.fillStyle = "#122233";
          rr(chX - 48, chY + 4, 80, 28, 5); ctx.fill();
          // Headrest
          ctx.fillStyle = "#0d1a28"; ctx.strokeStyle = CYAN + "88"; ctx.lineWidth = 1.5;
          rr(chX + chSide * 36, chY - 8, 24, 22, 6); ctx.fill(); ctx.stroke();
          // Armrests
          ctx.fillStyle = "#0a141e"; ctx.strokeStyle = TEAL + "66"; ctx.lineWidth = 1;
          rr(chX - 52, chY + 4, 8, 28, 3); ctx.fill(); ctx.stroke();
          rr(chX + 44, chY + 4, 8, 28, 3); ctx.fill(); ctx.stroke();
          // Footrest
          ctx.fillStyle = "#0d1a28"; ctx.strokeStyle = CYAN + "55"; ctx.lineWidth = 1;
          rr(chX - chSide * 52, chY + 8, 16, 20, 3); ctx.fill(); ctx.stroke();
          // Client lying on chair (silhouette)
          ctx.fillStyle = "#1a2a3a";
          rr(chX - 44, chY + 6, 76, 14, 4); ctx.fill();
          // Client head
          ctx.fillStyle = "#CCDDEE";
          ctx.beginPath(); ctx.arc(chX + chSide * 34, chY + 13, 8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#334455";
          ctx.beginPath(); ctx.arc(chX + chSide * 34, chY + 10, 7, Math.PI, 0); ctx.fill();
          // Tattoo being drawn (glowing dot on client arm)
          const tglow = Math.sin(t * 4) * 0.5 + 0.5;
          ctx.fillStyle = AQUA + Math.floor(tglow * 200 + 55).toString(16).padStart(2,"0");
          ctx.shadowColor = AQUA; ctx.shadowBlur = 8 * tglow;
          ctx.beginPath(); ctx.arc(chX - chSide * 10, chY + 13, 3, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          // Tattoo needle/machine lowered to skin
          ctx.strokeStyle = "#8899AA"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(chX - chSide * 10, chY + 8); ctx.lineTo(chX - chSide * 10, chY + 10); ctx.stroke();
        }

        // ── TATTOO ARTISTS (detailed humans matching dancer style) ──
        const artistDefs = [
          { x: W * 0.18, y: H * 0.48, side: 1,  skin: "#F0C890", hair: "#1a0800", gender: "f", shirt: TEAL, pants: "#001228", eyeCol: "#00AA88" },
          { x: W * 0.82, y: H * 0.48, side: -1, skin: "#DDAA88", hair: "#080808", gender: "m", shirt: CYAN, pants: "#001a28", eyeCol: "#0088CC" },
        ];
        for (const ar of artistDefs) {
          const bounce   = Math.sin(t * 2.5 + ar.x * 0.04) * 3;
          const stepL    = Math.sin(t * 2 + ar.x) * 4;
          const armSwing = Math.sin(t * 2.5 + ar.x * 0.04) * 14;
          const nglow    = Math.sin(t * 8) * 0.4 + 0.6;
          ctx.save();
          ctx.translate(ar.x, ar.y + bounce);

          // Shadow
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.beginPath(); ctx.ellipse(0, 22, 9, 3, 0, 0, Math.PI * 2); ctx.fill();

          // Legs
          ctx.fillStyle = ar.pants;
          ctx.beginPath(); ctx.roundRect(-8, 10, 5, 12 + stepL, 1); ctx.fill();
          ctx.beginPath(); ctx.roundRect(3,  10, 5, 12 - stepL, 1); ctx.fill();
          // Shoes
          ctx.fillStyle = "#111820";
          ctx.beginPath(); ctx.ellipse(-5, 22 + stepL, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse( 5, 22 - stepL, 5, 2, 0, 0, Math.PI * 2); ctx.fill();

          // Body — scrub top
          ctx.fillStyle = ar.shirt + "CC";
          ctx.shadowColor = ar.shirt; ctx.shadowBlur = 7;
          ctx.beginPath(); ctx.roundRect(ar.gender === "f" ? -8 : -7, -8, ar.gender === "f" ? 16 : 14, 20, 3); ctx.fill();
          ctx.shadowBlur = 0;
          // V-neck
          ctx.fillStyle = ar.skin;
          ctx.beginPath(); ctx.moveTo(-2, -8); ctx.lineTo(0, -4); ctx.lineTo(2, -8); ctx.fill();
          // Apron bib
          ctx.fillStyle = "rgba(0,15,35,0.52)";
          ctx.beginPath(); ctx.roundRect(-5, -6, 10, 16, 2); ctx.fill();
          // Pocket
          ctx.fillStyle = "rgba(0,0,0,0.22)";
          ctx.beginPath(); ctx.roundRect(ar.side > 0 ? -7 : 1, -3, 6, 6, 2); ctx.fill();

          // Working arm — reaches toward client holding machine
          const wEX = ar.side * 24 + armSwing * 0.2;
          const wEY = 3 + Math.abs(armSwing) * 0.1;
          ctx.strokeStyle = ar.skin; ctx.lineWidth = 4; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(ar.side * 7, -4); ctx.lineTo(wEX, wEY); ctx.stroke();
          ctx.lineCap = "butt";
          // Wave tattoo on forearm
          ctx.strokeStyle = AQUA + "55"; ctx.lineWidth = 0.9;
          const fmx = (ar.side * 7 + wEX) / 2, fmy = (-4 + wEY) / 2;
          ctx.beginPath(); ctx.moveTo(fmx - 5, fmy); ctx.quadraticCurveTo(fmx, fmy - 4, fmx + 5, fmy); ctx.stroke();
          // Hand
          ctx.fillStyle = ar.skin;
          ctx.beginPath(); ctx.arc(wEX, wEY, 3.5, 0, Math.PI * 2); ctx.fill();
          // Tattoo machine
          ctx.fillStyle = "#2a3a44"; ctx.strokeStyle = AQUA; ctx.lineWidth = 1.1;
          ctx.shadowColor = AQUA; ctx.shadowBlur = 5;
          rr(wEX + ar.side * 1, wEY - 4, 12, 8, 3); ctx.fill(); ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "#445566"; ctx.lineWidth = 0.8;
          for (let gr = 0; gr < 3; gr++) { ctx.beginPath(); ctx.moveTo(wEX + ar.side + gr * 3, wEY - 4); ctx.lineTo(wEX + ar.side + gr * 3, wEY + 4); ctx.stroke(); }
          // Needle glow
          ctx.strokeStyle = AQUA + "AA"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(wEX + ar.side * 7, wEY + 3); ctx.lineTo(wEX + ar.side * 7, wEY + 9); ctx.stroke();
          ctx.fillStyle = AQUA; ctx.shadowColor = AQUA; ctx.shadowBlur = 8 * nglow;
          ctx.beginPath(); ctx.arc(wEX + ar.side * 7, wEY + 9, 2, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          // Power cord
          ctx.strokeStyle = "#223344"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(wEX, wEY + 4); ctx.quadraticCurveTo(wEX - ar.side * 14, wEY + 14, wEX - ar.side * 22, wEY + 20); ctx.stroke();

          // Support arm
          ctx.strokeStyle = ar.skin; ctx.lineWidth = 4; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(-ar.side * 7, -4); ctx.lineTo(-ar.side * 16, 7); ctx.stroke();
          ctx.lineCap = "butt";
          ctx.fillStyle = ar.skin;
          ctx.beginPath(); ctx.arc(-ar.side * 16, 7, 3.5, 0, Math.PI * 2); ctx.fill();

          // Neck
          ctx.fillStyle = ar.skin; ctx.fillRect(-3, -9, 6, 5);

          // Head
          ctx.fillStyle = ar.skin;
          ctx.beginPath(); ctx.arc(0, -16, 9, 0, Math.PI * 2); ctx.fill();

          // Hair
          ctx.fillStyle = ar.hair;
          if (ar.gender === "f") {
            // Bun
            ctx.beginPath(); ctx.arc(0, -20, 8, Math.PI, 0); ctx.fill();
            ctx.fillRect(-9, -21, 5, 14);
            ctx.fillRect(4,  -21, 5, 14);
            ctx.beginPath(); ctx.arc(ar.side * 2, -26, 5, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = AQUA + "AA"; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(ar.side * 2, -26, 5.5, 0, Math.PI * 2); ctx.stroke();
          } else {
            // Short crop
            ctx.beginPath(); ctx.arc(0, -21, 7, Math.PI * 1.1, Math.PI * 1.9); ctx.fill();
            ctx.fillRect(-6, -21, 12, 6);
          }

          // Eyes — whites + iris + pupil + glint
          ctx.fillStyle = "#fff";
          ctx.beginPath(); ctx.ellipse(-3.5, -17, 2.2, 1.8, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse( 3.5, -17, 2.2, 1.8, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = ar.eyeCol; ctx.shadowColor = ar.eyeCol; ctx.shadowBlur = 3;
          ctx.beginPath(); ctx.arc(-3.5, -17, 1.2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc( 3.5, -17, 1.2, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#000";
          ctx.beginPath(); ctx.arc(-3.5, -17, 0.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc( 3.5, -17, 0.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.75)";
          ctx.beginPath(); ctx.arc(-4, -17.5, 0.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc( 3,  -17.5, 0.5, 0, Math.PI * 2); ctx.fill();

          // Eyebrows (furrowed)
          ctx.strokeStyle = ar.hair; ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.moveTo(-6, -21); ctx.lineTo(-2, -22); ctx.stroke();
          ctx.beginPath(); ctx.moveTo( 2, -22); ctx.lineTo( 6, -21); ctx.stroke();

          // Nose
          ctx.fillStyle = "rgba(0,0,0,0.18)";
          ctx.beginPath(); ctx.arc(0, -14, 1.2, 0, Math.PI * 2); ctx.fill();

          // Mouth
          ctx.strokeStyle = ar.gender === "f" ? "#CC8855" : "#AA7744"; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(-3, -11); ctx.lineTo(3, -11); ctx.stroke();
          ctx.strokeStyle = "rgba(0,0,0,0.1)"; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(0, -11, 3, 0.15, Math.PI - 0.15); ctx.stroke();

          // Ear + stud
          ctx.fillStyle = ar.skin;
          ctx.beginPath(); ctx.ellipse(ar.side * 9, -16, 2.5, 4, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = AQUA; ctx.shadowColor = AQUA; ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.arc(ar.side * 10, -16, 1.5, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;

          ctx.restore();
        }

        // ── INK STATIONS (left and right walls, large tray tables) ──
        for (const [isX, side] of [[room.S + 8, 1], [W - room.S - 78, -1]]) {
          const isY = H * 0.34;
          ctx.fillStyle = "#060e18"; ctx.strokeStyle = TEAL; ctx.lineWidth = 1.5;
          rr(isX, isY, 70, 110, 4); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "rgba(0,200,200,0.06)"; ctx.fillRect(isX + 2, isY + 2, 66, 106);
          // Label
          ctx.font = "bold 6px Orbitron, monospace"; ctx.textAlign = "center";
          ctx.fillStyle = TEAL + "CC"; ctx.fillText("INK STATION", isX + 35, isY + 13);
          // 8 ink bottles
          const iColors = ["#FF0044","#0088FF","#00FF88","#FFCC00","#FF44AA","#AA00FF","#00CCFF","#FF8800"];
          for (let ii = 0; ii < 8; ii++) {
            const ic = iColors[ii];
            const iBx = isX + 8 + (ii % 4) * 14;
            const iBy = isY + 18 + Math.floor(ii / 4) * 28;
            const ipA = Math.sin(t * 1.2 + ii) * 0.25 + 0.75;
            ctx.fillStyle = ic + "44"; ctx.strokeStyle = ic; ctx.lineWidth = 1;
            ctx.shadowColor = ic; ctx.shadowBlur = 4 * ipA;
            ctx.beginPath();
            ctx.moveTo(iBx - 4, iBy + 18); ctx.lineTo(iBx - 3, iBy + 6);
            ctx.lineTo(iBx - 1, iBy + 2); ctx.lineTo(iBx + 1, iBy + 2);
            ctx.lineTo(iBx + 3, iBy + 6); ctx.lineTo(iBx + 4, iBy + 18);
            ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
            // Cap
            ctx.fillStyle = ic; ctx.beginPath(); ctx.roundRect(iBx - 2, iBy, 4, 4, 1); ctx.fill();
          }
          // Needle tray
          ctx.fillStyle = "#0a141e"; ctx.strokeStyle = AQUA + "55"; ctx.lineWidth = 1;
          rr(isX + 6, isY + 76, 58, 26, 3); ctx.fill(); ctx.stroke();
          ctx.fillStyle = AQUA + "88";
          for (let ni = 0; ni < 5; ni++) {
            ctx.fillRect(isX + 10 + ni * 11, isY + 80, 2, 18);
          }
          ctx.font = "bold 5px Orbitron, monospace"; ctx.textAlign = "center";
          ctx.fillStyle = AQUA + "77"; ctx.fillText("NEEDLES", isX + 35, isY + 108);
        }

        // ── AUTOCLAVE / STERILIZATION UNIT (back left) ──
        const acX = room.S + 8, acY = room.S * 1.4;
        ctx.fillStyle = "#060e18"; ctx.strokeStyle = CYAN; ctx.lineWidth = 1.5;
        rr(acX, acY, 60, 44, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#0a141e"; rr(acX + 4, acY + 4, 52, 28, 3); ctx.fill();
        // Status light
        const acPulse = Math.sin(t * 2) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(0,255,150,${0.5 + acPulse * 0.5})`;
        ctx.shadowColor = "#00FF96"; ctx.shadowBlur = 6 * acPulse;
        ctx.beginPath(); ctx.arc(acX + 10, acY + 18, 4, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = CYAN + "88"; ctx.font = "bold 5px Orbitron, monospace"; ctx.textAlign = "left";
        ctx.fillText("STERILIZING", acX + 18, acY + 21);
        ctx.fillStyle = TEAL + "99"; ctx.font = "bold 5.5px Orbitron, monospace"; ctx.textAlign = "center";
        ctx.fillText("AUTOCLAVE", acX + 30, acY + 40);

        // ── DESIGN PORTFOLIO / SKETCH DESK (back right) ──
        const dkX = W - room.S - 80, dkY = room.S * 1.4;
        ctx.fillStyle = "#060e18"; ctx.strokeStyle = PURP; ctx.lineWidth = 1.5;
        rr(dkX, dkY, 72, 44, 4); ctx.fill(); ctx.stroke();
        // Sketchbook open on desk
        ctx.fillStyle = "#EEF0F4";
        rr(dkX + 6, dkY + 6, 38, 30, 2); ctx.fill();
        ctx.fillStyle = "#CCD0D8"; ctx.fillRect(dkX + 6, dkY + 6, 1, 30);
        // Drawing lines on sketchbook (anchor sketch)
        ctx.strokeStyle = "#334455"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(dkX + 25, dkY + 20, 8, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(dkX + 25, dkY + 12); ctx.lineTo(dkX + 25, dkY + 28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(dkX + 17, dkY + 20); ctx.lineTo(dkX + 33, dkY + 20); ctx.stroke();
        // Pencils
        for (let pi2 = 0; pi2 < 3; pi2++) {
          ctx.fillStyle = ["#FFCC00","#FF4444","#4488FF"][pi2];
          ctx.fillRect(dkX + 48 + pi2 * 7, dkY + 8, 4, 22);
          ctx.fillStyle = "#222"; ctx.fillRect(dkX + 48 + pi2 * 7, dkY + 28, 4, 4);
        }
        ctx.fillStyle = PURP + "99"; ctx.font = "bold 5.5px Orbitron, monospace"; ctx.textAlign = "center";
        ctx.fillText("DESIGNS", dkX + 36, dkY + 40);

        // ── MIRROR (left wall, large) ──
        const mirX = room.S + 8, mirY = H * 0.66;
        ctx.fillStyle = "#030810"; ctx.strokeStyle = AQUA; ctx.lineWidth = 2;
        ctx.shadowColor = AQUA; ctx.shadowBlur = 10;
        rr(mirX, mirY, 60, 80, 4); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
        const mirG = ctx.createLinearGradient(mirX, mirY, mirX + 60, mirY + 80);
        mirG.addColorStop(0, "rgba(0,200,220,0.10)");
        mirG.addColorStop(0.5, "rgba(180,220,255,0.07)");
        mirG.addColorStop(1, "rgba(0,180,200,0.05)");
        ctx.fillStyle = mirG; ctx.fillRect(mirX + 3, mirY + 3, 54, 74);
        // Reflection shimmer
        ctx.fillStyle = `rgba(200,240,255,${0.04 + Math.sin(t * 1.2) * 0.02})`;
        ctx.fillRect(mirX + 8, mirY + 4, 16, 72);
        ctx.fillStyle = AQUA + "33"; ctx.font = "bold 5px Orbitron, monospace"; ctx.textAlign = "center";
        ctx.fillText("MIRROR", mirX + 30, mirY + 76);

        // ── RECEPTION / WAITING AREA (bottom center) ──
        const recX = cx - 80, recY = H * 0.82, recW = 160, recH = 34;
        ctx.fillStyle = "#04090f"; ctx.strokeStyle = TEAL; ctx.lineWidth = 1.5;
        rr(recX, recY, recW, recH, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#060e18"; rr(recX + 4, recY + 4, recW - 8, 12, 3); ctx.fill();
        // Reception label
        ctx.fillStyle = TEAL; ctx.shadowColor = TEAL; ctx.shadowBlur = 6;
        ctx.font = "bold 6px Orbitron, monospace"; ctx.textAlign = "center";
        ctx.fillText("RECEPTION", cx, recY + 14); ctx.shadowBlur = 0;
        // Waiting seats
        for (let si = 0; si < 4; si++) {
          const sx2 = recX - 18 - si * 1 + si * (recW / 3);
          ctx.fillStyle = "#0a141e"; ctx.strokeStyle = CYAN + "55"; ctx.lineWidth = 1;
          rr(recX + 8 + si * 36, recY + 20, 28, 10, 3); ctx.fill(); ctx.stroke();
        }

        // ── WALL ART (large ocean tattoo motifs painted on walls) ──
        // Left wall art — anchor
        const wa1X = room.S + 78, wa1Y = H * 0.68;
        ctx.strokeStyle = TEAL + "66"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(wa1X, wa1Y, 18, 0, Math.PI*2); ctx.stroke();
        ctx.strokeStyle = TEAL + "55"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(wa1X, wa1Y - 18); ctx.lineTo(wa1X, wa1Y + 18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(wa1X - 14, wa1Y); ctx.lineTo(wa1X + 14, wa1Y); ctx.stroke();
        // top bar
        ctx.beginPath(); ctx.moveTo(wa1X - 10, wa1Y - 18); ctx.lineTo(wa1X + 10, wa1Y - 18); ctx.stroke();
        // flukes
        ctx.beginPath(); ctx.moveTo(wa1X, wa1Y + 18); ctx.lineTo(wa1X - 10, wa1Y + 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(wa1X, wa1Y + 18); ctx.lineTo(wa1X + 10, wa1Y + 12); ctx.stroke();
        ctx.font = "bold 5.5px Orbitron, monospace"; ctx.textAlign = "center";
        ctx.fillStyle = TEAL + "88"; ctx.fillText("ANCHOR", wa1X, wa1Y + 30);
        // Right wall art — wave
        const wa2X = W - room.S - 78, wa2Y = H * 0.68;
        ctx.strokeStyle = AQUA + "66"; ctx.lineWidth = 2;
        for (let wi2 = 0; wi2 < 3; wi2++) {
          ctx.beginPath();
          ctx.moveTo(wa2X - 22, wa2Y - 10 + wi2 * 10);
          ctx.quadraticCurveTo(wa2X - 8, wa2Y - 22 + wi2 * 10, wa2X + 8, wa2Y - 10 + wi2 * 10);
          ctx.quadraticCurveTo(wa2X + 18, wa2Y + wi2 * 10, wa2X + 22, wa2Y - 4 + wi2 * 10);
          ctx.stroke();
        }
        ctx.font = "bold 5.5px Orbitron, monospace"; ctx.textAlign = "center";
        ctx.fillStyle = AQUA + "88"; ctx.fillText("WAVE", wa2X, wa2Y + 26);

        // ── RECEPTION WORKER (salesperson-scale human, stands center-top near entrance) ──
        {
          const rwX = cx, rwY = H * 0.25;
          const breathe = Math.sin(t * 0.9) * 1.5;
          ctx.save(); ctx.translate(rwX, rwY);
          // Shadow
          ctx.globalAlpha = 0.3; ctx.fillStyle = "#000";
          ctx.beginPath(); ctx.ellipse(2, 4, 14, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
          // Legs
          ctx.fillStyle = "#001228"; ctx.fillRect(-6, -8, 5, 12); ctx.fillRect(1, -8, 5, 12);
          // Boots with teal trim
          ctx.fillStyle = "#050e18"; ctx.fillRect(-7, 2, 6, 5); ctx.fillRect(1, 2, 6, 5);
          ctx.fillStyle = AQUA; ctx.fillRect(-7, 2, 6, 1.5); ctx.fillRect(1, 2, 6, 1.5);
          // Body — ocean dive-suit jacket
          const rjG = ctx.createLinearGradient(-12, -38, 12, -10);
          rjG.addColorStop(0, "#0e2840"); rjG.addColorStop(0.5, "#081e30"); rjG.addColorStop(1, "#041220");
          ctx.fillStyle = rjG;
          ctx.beginPath(); ctx.moveTo(-11, -10); ctx.lineTo(-13, -38 + breathe); ctx.lineTo(-8, -42 + breathe);
          ctx.lineTo(8, -42 + breathe); ctx.lineTo(13, -38 + breathe); ctx.lineTo(11, -10); ctx.closePath(); ctx.fill();
          // Bioluminescent teal tie
          ctx.fillStyle = AQUA; ctx.shadowColor = AQUA; ctx.shadowBlur = 7;
          ctx.beginPath(); ctx.moveTo(0, -38 + breathe); ctx.lineTo(-3, -34 + breathe); ctx.lineTo(0, -12); ctx.lineTo(3, -34 + breathe); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
          // Lapels
          ctx.strokeStyle = AQUA + "55"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(-4, -38 + breathe); ctx.lineTo(-6, -20);
          ctx.moveTo(4, -38 + breathe); ctx.lineTo(6, -20); ctx.stroke();
          // Collar
          ctx.fillStyle = "#E0F4F8";
          ctx.beginPath(); ctx.moveTo(-5, -40 + breathe); ctx.lineTo(0, -37 + breathe); ctx.lineTo(5, -40 + breathe);
          ctx.lineTo(4, -42 + breathe); ctx.lineTo(-4, -42 + breathe); ctx.closePath(); ctx.fill();
          // Neck
          ctx.fillStyle = "#D8C8B8"; ctx.fillRect(-3, -46 + breathe, 6, 6);
          // Head (gradient)
          const rjH = ctx.createRadialGradient(-3, -54 + breathe, 2, 0, -52 + breathe, 12);
          rjH.addColorStop(0, "#EDD8C8"); rjH.addColorStop(1, "#C8B0A0");
          ctx.fillStyle = rjH; ctx.beginPath(); ctx.ellipse(0, -54 + breathe, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
          // Hair (female — wavy dark)
          ctx.fillStyle = "#1a0800";
          ctx.beginPath(); ctx.ellipse(0, -63 + breathe, 9, 7, 0, Math.PI, 0); ctx.fill();
          ctx.fillRect(-9, -63 + breathe, 18, 10);
          ctx.beginPath(); ctx.arc(-10, -55 + breathe, 3, Math.PI * 0.6, Math.PI * 1.5); ctx.fill();
          ctx.beginPath(); ctx.arc(10, -55 + breathe, 3, Math.PI * 1.5, Math.PI * 0.4); ctx.fill();
          // Eyes
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath(); ctx.ellipse(-4, -54 + breathe, 2.5, 2, 0, 0, Math.PI * 2); ctx.ellipse(4, -54 + breathe, 2.5, 2, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = TEAL; ctx.beginPath(); ctx.arc(-4, -54 + breathe, 1.2, 0, Math.PI * 2); ctx.arc(4, -54 + breathe, 1.2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(-4, -54 + breathe, 0.5, 0, Math.PI * 2); ctx.arc(4, -54 + breathe, 0.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(-4.5, -54.5 + breathe, 0.6, 0, Math.PI * 2); ctx.fill();
          // Eyebrows
          ctx.strokeStyle = "#1a0800"; ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.moveTo(-6, -57 + breathe); ctx.lineTo(-2, -58 + breathe); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(2, -58 + breathe); ctx.lineTo(6, -57 + breathe); ctx.stroke();
          // Nose
          ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.beginPath(); ctx.arc(0, -50 + breathe, 1.3, 0, Math.PI * 2); ctx.fill();
          // Friendly smile
          ctx.strokeStyle = "#CC8855"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(0, -47 + breathe, 3.5, 0.1, Math.PI - 0.1); ctx.stroke();
          // Earrings (ocean pearls)
          ctx.fillStyle = AQUA; ctx.shadowColor = AQUA; ctx.shadowBlur = 5;
          ctx.beginPath(); ctx.arc(-10, -54 + breathe, 2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(10, -54 + breathe, 2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
          // Arms + appointment book
          ctx.strokeStyle = "#C8B0A0"; ctx.lineWidth = 6; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(11, -30 + breathe); ctx.lineTo(16, -14); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-11, -30 + breathe); ctx.lineTo(-14, -14); ctx.stroke();
          ctx.lineCap = "butt";
          ctx.fillStyle = "#D8C8B8"; ctx.beginPath(); ctx.arc(16, -14, 4, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(-14, -14, 4, 0, Math.PI * 2); ctx.fill();
          // Book in hands
          ctx.fillStyle = "#EEF0F4"; ctx.strokeStyle = "#334455"; ctx.lineWidth = 1;
          rr(-14, -14, 30, 18, 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#334455"; ctx.font = "bold 4px monospace"; ctx.textAlign = "center";
          ctx.fillText("APPOINTMENTS", -14 + 15, -14 + 8);
          for (let li = 0; li < 2; li++) ctx.fillRect(-11, -14 + 11 + li * 4, 24, 1.5);
          ctx.restore();
        }

        // ── AMBIENT BUBBLE PARTICLES ──
        for (let pi3 = 0; pi3 < 14; pi3++) {
          const px3 = (t * 10 + pi3 * 61) % W;
          const py3 = room.S * 2 + Math.sin(t * 0.9 + pi3 * 0.7) * 30 + (pi3 * (H * 0.75)) / 14;
          const al3 = Math.sin(t * 2 + pi3) * 0.25 + 0.3;
          const col3 = [AQUA, CYAN, TEAL][pi3 % 3];
          ctx.fillStyle = col3 + Math.floor(al3 * 160).toString(16).padStart(2, "0");
          ctx.beginPath(); ctx.arc(px3, py3, pi3 % 4 === 0 ? 2.5 : 1.5, 0, Math.PI * 2); ctx.fill();
        }

        // Side teal neon strips
        ctx.fillStyle = "rgba(0,200,200,0.22)";
        ctx.fillRect(room.S, room.S * 1.5, 3, H - room.S * 3);
        ctx.fillRect(W - room.S - 3, room.S * 1.5, 3, H - room.S * 3);

      } else {
      // ── Reclining chair (center) ──────────────────
      ctx.fillStyle = "#1a0a18";
      ctx.strokeStyle = "#FF44AA";
      ctx.lineWidth = 1.5;
      rr(cx - 48, midY - 16, 96, 38, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2a1028";
      rr(cx - 44, midY - 12, 88, 28, 4);
      ctx.fill();
      // Headrest
      ctx.fillStyle = "#1a0820";
      rr(cx + 32, midY - 20, 20, 18, 5);
      ctx.fill();
      // ── Tattoo flash art wall (top) ───────────────
      ctx.fillStyle = "#0a0814";
      ctx.strokeStyle = "#FF44AA";
      ctx.lineWidth = 1;
      rr(cx - W * 0.44, topY + 4, W * 0.88, 48, 2);
      ctx.fill();
      ctx.stroke();
      const tattooIcons = ["🐉", "💀", "⚡", "🌹", "🦋", "🗡"];
      ctx.font = "16px serif";
      ctx.textAlign = "center";
      for (let ti = 0; ti < 6; ti++) {
        const tx2 = cx - W * 0.38 + ti * ((W * 0.76) / 5);
        ctx.fillText(tattooIcons[ti], tx2, topY + 32);
        ctx.strokeStyle = "#FF44AA33";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(tx2 - 12, topY + 8, 24, 30);
      }
      // ── Ink station (right) ───────────────────────
      ctx.fillStyle = "#0a0814";
      ctx.strokeStyle = "#AA44FF";
      ctx.lineWidth = 1.5;
      rr(cx + W * 0.2, topY + 58, 52, 52, 3);
      ctx.fill();
      ctx.stroke();
      const inkColors = [
        "#FF0044",
        "#0044FF",
        "#00FF88",
        "#FFCC00",
        "#FF44AA",
        "#AA00FF",
      ];
      for (let ii = 0; ii < 6; ii++) {
        ctx.fillStyle = inkColors[ii];
        ctx.shadowColor = inkColors[ii];
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.roundRect(
          cx + W * 0.22 + (ii % 3) * 15,
          topY + 60 + Math.floor(ii / 3) * 22,
          11,
          18,
          [3, 3, 0, 0],
        );
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      // Neon TATTOO sign
      ctx.fillStyle = "#FF44AA";
      ctx.shadowColor = "#FF00CC";
      ctx.shadowBlur = 15;
      ctx.font = "bold 12px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillText("INK CITY", cx - W * 0.1, midY + 30);
      ctx.shadowBlur = 0;
      } // end ocean tattoo else
    } else if (type === 17) {
      // ════════════════════════════════════════════════════════════════
      //  AMMO DEPOT — Military Grade Storage & Range
      // ════════════════════════════════════════════════════════════════

      // ── Worker helper (top-down person) ──────────────────────────
      const drawWorker = (px, py, uniform, skinColor) => {
        // Ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath(); ctx.ellipse(px, py + 8, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
        // Legs (two rectangles)
        ctx.fillStyle = '#1a2010';
        ctx.fillRect(px - 6, py + 2, 5, 14);
        ctx.fillRect(px + 1, py + 2, 5, 14);
        // Boots
        ctx.fillStyle = '#1a1200';
        ctx.fillRect(px - 7, py + 13, 7, 5);
        ctx.fillRect(px, py + 13, 7, 5);
        // Body (uniform)
        ctx.fillStyle = uniform;
        rr(px - 9, py - 12, 18, 22, 3); ctx.fill();
        // Chest stripe
        ctx.strokeStyle = 'rgba(255,255,100,0.35)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(px - 6, py - 6); ctx.lineTo(px + 6, py - 6); ctx.stroke();
        // Arms
        ctx.strokeStyle = uniform; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(px - 9, py - 6); ctx.lineTo(px - 18, py + 3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px + 9, py - 6); ctx.lineTo(px + 18, py + 3); ctx.stroke();
        ctx.lineCap = 'butt';
        // Hands (skin)
        ctx.fillStyle = skinColor;
        ctx.beginPath(); ctx.arc(px - 18, py + 3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + 18, py + 3, 4, 0, Math.PI * 2); ctx.fill();
        // Neck
        ctx.fillStyle = skinColor; ctx.fillRect(px - 3, py - 14, 6, 4);
        // Head (skin)
        ctx.beginPath(); ctx.arc(px, py - 20, 8, 0, Math.PI * 2); ctx.fill();
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(px - 3, py - 21, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(px + 3, py - 21, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(px - 3, py - 21, 1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + 3, py - 21, 1, 0, Math.PI * 2); ctx.fill();
        // Military helmet (top half arc + brim)
        ctx.fillStyle = '#2a3a10';
        ctx.beginPath(); ctx.arc(px, py - 22, 9, Math.PI, 0); ctx.fill();
        ctx.fillRect(px - 10, py - 23, 20, 5);
        ctx.strokeStyle = '#1a2808'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(px - 11, py - 22); ctx.lineTo(px + 11, py - 22); ctx.stroke();
      };

      // ── 1. Military-green checkered floor ────────────────────────
      const tileW = Math.floor(W / 10), tileH = Math.floor(H / 10);
      for (let ty = 0; ty < 10; ty++) {
        for (let tx2 = 0; tx2 < 10; tx2++) {
          ctx.fillStyle = (tx2 + ty) % 2 === 0 ? '#1a2218' : '#161e14';
          ctx.fillRect(tx2 * tileW, ty * tileH, tileW, tileH);
        }
      }
      // Floor border
      ctx.strokeStyle = '#2a3828';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, W - 2, H - 2);

      // ── 2. Stacked ammo crates (top wall) ────────────────────────
      const crateY = topY + 2;
      const crateW = W * 0.13, crateH = 28;
      const crateColors = ['#6b4d22', '#5a3e1a', '#7a5828', '#634412'];
      for (let row2 = 0; row2 < 2; row2++) {
        for (let col2 = 0; col2 < 6; col2++) {
          const ax = cx - W * 0.42 + col2 * W * 0.14;
          const ay = crateY + row2 * (crateH + 3);
          const cc = crateColors[(row2 + col2) % 4];
          // Crate shadow
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(ax + 3, ay + 3, crateW, crateH);
          // Crate body (wooden)
          ctx.fillStyle = cc;
          rr(ax, ay, crateW, crateH, 2); ctx.fill();
          // Plank lines
          ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(ax + crateW * 0.33, ay); ctx.lineTo(ax + crateW * 0.33, ay + crateH); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ax + crateW * 0.67, ay); ctx.lineTo(ax + crateW * 0.67, ay + crateH); ctx.stroke();
          // Metal band
          ctx.strokeStyle = '#4a3010'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(ax, ay + crateH / 2); ctx.lineTo(ax + crateW, ay + crateH / 2); ctx.stroke();
          // Hazard stripe top bar
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(ax, ay, crateW, 4);
          const stripeCount = Math.floor(crateW / 5);
          ctx.fillStyle = '#1a1a00';
          for (let si = 0; si < stripeCount; si += 2) ctx.fillRect(ax + si * 5, ay, 5, 4);
          // AMMO stencil
          ctx.fillStyle = '#FFCC44';
          ctx.font = 'bold 6px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('AMMO', ax + crateW / 2, ay + crateH - 7);
          // Crate number
          ctx.fillStyle = 'rgba(255,200,80,0.55)';
          ctx.font = '4px monospace';
          ctx.fillText('#' + (row2 * 6 + col2 + 1).toString().padStart(2, '0'), ax + crateW / 2, ay + crateH - 2);
        }
      }

      // ── 3. Weapon racks (left side) ──────────────────────────────
      const rackX = cx - W * 0.44;
      const rackY = midY - 40;
      const rackH = 90;
      // Rack backing plate
      ctx.fillStyle = '#0e1008';
      ctx.strokeStyle = '#556644';
      ctx.lineWidth = 1.5;
      rr(rackX, rackY, W * 0.22, rackH, 3); ctx.fill(); ctx.stroke();
      // Horizontal rail bars
      ctx.strokeStyle = '#445533'; ctx.lineWidth = 2;
      for (let rb = 0; rb < 3; rb++) {
        const ry2 = rackY + 12 + rb * 26;
        ctx.beginPath(); ctx.moveTo(rackX + 4, ry2); ctx.lineTo(rackX + W * 0.22 - 4, ry2); ctx.stroke();
      }
      // Rifle silhouettes (simplified rectangles + barrel lines)
      const rifleX = [rackX + 14, rackX + W * 0.11 - 4];
      for (let ri2 = 0; ri2 < 2; ri2++) {
        const rrx = rifleX[ri2], rry2 = rackY + 20;
        // Stock
        ctx.fillStyle = '#6b4422'; ctx.fillRect(rrx, rry2, 6, 48);
        // Receiver
        ctx.fillStyle = '#4a4a4a'; ctx.fillRect(rrx - 2, rry2 + 8, 10, 20);
        // Barrel (thin line up)
        ctx.strokeStyle = '#6a6a6a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(rrx + 3, rry2 - 2); ctx.lineTo(rrx + 3, rry2 + 14); ctx.stroke();
        // Grip
        ctx.fillStyle = '#3a2810'; ctx.fillRect(rrx, rry2 + 28, 6, 16);
      }
      // RACK label
      ctx.fillStyle = '#88AA66';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('WEAPON RACK', rackX + W * 0.11, rackY + rackH + 12);

      // ── 4. Shooting lane + bullseye targets (right side) ─────────
      const laneX = cx + W * 0.18;
      const laneW = W * 0.26;
      // Lane floor strip
      ctx.fillStyle = 'rgba(40,50,30,0.60)';
      ctx.fillRect(laneX, topY + 4, laneW, H * 0.55);
      // Lane divider lines
      ctx.strokeStyle = 'rgba(255,255,100,0.30)'; ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(laneX + laneW / 2, topY + 4); ctx.lineTo(laneX + laneW / 2, topY + H * 0.55); ctx.stroke();
      ctx.setLineDash([]);
      // 3 bullseye targets on stands
      for (let ti = 0; ti < 3; ti++) {
        const tx3 = laneX + laneW * 0.18 + ti * laneW * 0.32;
        const ty3 = topY + 26;
        // Stand pole
        ctx.strokeStyle = '#5a5a40'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(tx3, ty3 + 28); ctx.lineTo(tx3, ty3 + 45); ctx.stroke();
        // Stand base
        ctx.fillStyle = '#4a4a30'; ctx.fillRect(tx3 - 8, ty3 + 43, 16, 4);
        // Target rings (outer to inner)
        const tColors = ['#EEDDCC', '#AA4422', '#FF2222'];
        const tRadii = [16, 10, 5];
        for (let ri3 = 0; ri3 < 3; ri3++) {
          ctx.fillStyle = tColors[ri3];
          ctx.beginPath(); ctx.arc(tx3, ty3 + 14, tRadii[ri3], 0, Math.PI * 2); ctx.fill();
        }
        // X center dot
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(tx3, ty3 + 14, 2, 0, Math.PI * 2); ctx.fill();
      }

      // ── 5. Workbench ─────────────────────────────────────────────
      const wbX = cx - W * 0.12, wbY = midY + 28;
      ctx.fillStyle = '#2a2010';
      ctx.strokeStyle = '#665540';
      ctx.lineWidth = 1.5;
      rr(wbX, wbY, W * 0.26, 28, 3); ctx.fill(); ctx.stroke();
      // Tools on bench
      ctx.fillStyle = '#888870';
      ctx.fillRect(wbX + 8, wbY + 6, 18, 5);   // wrench body
      ctx.fillRect(wbX + 6, wbY + 4, 4, 10);    // wrench head
      ctx.fillStyle = '#556655';
      ctx.fillRect(wbX + 34, wbY + 8, 12, 4);   // pliers
      ctx.fillRect(wbX + 52, wbY + 5, 5, 16);   // screwdriver
      ctx.fillRect(wbX + 52, wbY + 3, 8, 4);
      // Bench label
      ctx.fillStyle = '#BBAA88';
      ctx.font = '6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('WORKBENCH', wbX + W * 0.13, wbY + 38);

      // ── 6. Warning hazard diamonds ────────────────────────────────
      const hazardPositions = [
        { x: cx - W * 0.46, y: midY - 60 },
        { x: cx + W * 0.40, y: midY - 60 },
      ];
      for (const hpos of hazardPositions) {
        const hx = hpos.x, hy = hpos.y, hr = 14;
        // Diamond background
        ctx.fillStyle = '#cc2200';
        ctx.beginPath();
        ctx.moveTo(hx, hy - hr); ctx.lineTo(hx + hr, hy);
        ctx.lineTo(hx, hy + hr); ctx.lineTo(hx - hr, hy);
        ctx.closePath(); ctx.fill();
        // Yellow border
        ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.5;
        ctx.stroke();
        // Exclamation mark
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!', hx, hy + 5);
      }

      // ── 7. Worker people (top-down military personnel) ────────────
      // Worker 1: near weapon rack — maintaining weapons
      drawWorker(rackX + W * 0.11, midY - 2, '#4a5c2a', '#c8a070');
      // Worker 2: near ammo crates — organizing
      drawWorker(cx - W * 0.10, crateY + 70, '#3a4e20', '#c09060');

      // ── AMMO DEALER — Arms dealer NPC (center counter) ──────────────
      {
        const adx = cx + W * 0.05, ady = midY + 20;
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.30)';
        ctx.beginPath(); ctx.ellipse(adx, ady + 10, 15, 6, 0, 0, Math.PI * 2); ctx.fill();
        // Legs (cargo pants, dark olive)
        ctx.fillStyle = '#3a3820';
        ctx.fillRect(adx - 6, ady + 2, 5, 14);
        ctx.fillRect(adx + 1, ady + 2, 5, 14);
        // Cargo pockets on legs
        ctx.fillStyle = '#2a2a14';
        ctx.fillRect(adx - 7, ady + 6, 4, 5);
        ctx.fillRect(adx + 3, ady + 6, 4, 5);
        // Combat boots
        ctx.fillStyle = '#1c1408';
        ctx.fillRect(adx - 8, ady + 13, 8, 6);
        ctx.fillRect(adx, ady + 13, 8, 6);
        // Tactical vest body
        ctx.fillStyle = '#5a4a20';
        rr(adx - 11, ady - 14, 22, 26, 3); ctx.fill();
        // Vest pouches (front)
        ctx.fillStyle = '#4a3c18';
        ctx.fillRect(adx - 9, ady - 10, 6, 5);
        ctx.fillRect(adx + 3, ady - 10, 6, 5);
        ctx.fillRect(adx - 9, ady - 2, 6, 5);
        ctx.fillRect(adx + 3, ady - 2, 6, 5);
        // Buckle (center)
        ctx.fillStyle = '#c8a020';
        ctx.fillRect(adx - 2, ady - 8, 4, 4);
        // Arms (rolled-up sleeves showing skin)
        ctx.strokeStyle = '#5a4a20'; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(adx - 11, ady - 6); ctx.lineTo(adx - 20, ady + 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(adx + 11, ady - 6); ctx.lineTo(adx + 20, ady + 5); ctx.stroke();
        ctx.lineCap = 'butt';
        // Forearms (skin tone)
        ctx.strokeStyle = '#c8906a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(adx - 18, ady + 3); ctx.lineTo(adx - 22, ady + 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(adx + 18, ady + 3); ctx.lineTo(adx + 22, ady + 10); ctx.stroke();
        ctx.lineCap = 'butt';
        // Hands (skin)
        ctx.fillStyle = '#c8906a';
        ctx.beginPath(); ctx.arc(adx - 22, ady + 11, 4, 0, Math.PI * 2); ctx.fill();
        // Right hand holds ammo clip
        ctx.beginPath(); ctx.arc(adx + 22, ady + 11, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#888';
        ctx.fillRect(adx + 19, ady + 7, 6, 10);
        // Neck
        ctx.fillStyle = '#c8906a';
        ctx.fillRect(adx - 3, ady - 16, 6, 5);
        // Head
        ctx.beginPath(); ctx.arc(adx, ady - 23, 10, 0, Math.PI * 2); ctx.fill();
        // Short dark hair (buzzcut)
        ctx.fillStyle = '#1a1008';
        ctx.beginPath(); ctx.arc(adx, ady - 26, 9, Math.PI, 0); ctx.fill();
        ctx.fillRect(adx - 9, ady - 27, 18, 6);
        // Stubble shadow on jaw
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath(); ctx.arc(adx, ady - 20, 6, 0, Math.PI); ctx.fill();
        // Eyes (squinting, tough look)
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(adx - 3.5, ady - 24, 2.5, 1.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(adx + 3.5, ady - 24, 2.5, 1.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a2800';
        ctx.beginPath(); ctx.arc(adx - 3.5, ady - 24, 1.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(adx + 3.5, ady - 24, 1.1, 0, Math.PI * 2); ctx.fill();
        // Nose (broad)
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.arc(adx, ady - 21, 1.5, 0, Math.PI * 2); ctx.fill();
        // Flat mouth (dealer expression)
        ctx.strokeStyle = 'rgba(80,40,20,0.8)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(adx - 3, ady - 18); ctx.lineTo(adx + 3, ady - 18); ctx.stroke();
        // Cigar stub in mouth
        ctx.strokeStyle = '#c8a060'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(adx + 2, ady - 18); ctx.lineTo(adx + 8, ady - 20); ctx.stroke();
        ctx.fillStyle = '#FF6020';
        ctx.shadowColor = '#FF6020'; ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.arc(adx + 9, ady - 20, 2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        // Name label
        ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 8;
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('AMMO DEALER', adx, ady - 37);
        ctx.shadowBlur = 0;
      }

    } else if (type === 18) {
      // HACKER DEN
      if (isDino) {
        // ═══ DINO WORLD: SHAMAN'S DEN ═══
        const t18=performance.now()/1000;
        const LEAF="#66DD44",AMBER="#FFCC44",BONE="#F0E8C0",MOSS="#33881A";
        const LEAFr="102,221,68",AMBERr="255,204,68";
        const drawShaman=(px,py)=>{
          ctx.fillStyle='rgba(0,0,0,0.28)';ctx.beginPath();ctx.ellipse(px,py+9,13,6,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#1a0a00';ctx.fillRect(px-6,py+2,5,13);ctx.fillRect(px+1,py+2,5,13);
          ctx.fillStyle='#c8905a';ctx.fillRect(px-7,py+12,7,5);ctx.fillRect(px,py+12,7,5);
          ctx.fillStyle='#2a4a14';ctx.beginPath();ctx.roundRect(px-11,py-14,22,26,3);ctx.fill();
          // Tribal pattern
          ctx.strokeStyle='rgba(255,204,68,0.6)';ctx.lineWidth=1.5;
          for(let pi2=0;pi2<3;pi2++){ctx.beginPath();ctx.moveTo(px-9,py-10+pi2*5);ctx.lineTo(px+9,py-10+pi2*5);ctx.stroke();}
          // Cloak fringe bottom
          ctx.strokeStyle='#1e3c10';ctx.lineWidth=2;
          for(let f=0;f<5;f++){ctx.beginPath();ctx.moveTo(px-8+f*4,py+10);ctx.lineTo(px-8+f*4,py+17);ctx.stroke();}
          ctx.strokeStyle='#2a4a14';ctx.lineWidth=7;ctx.lineCap='round';
          ctx.beginPath();ctx.moveTo(px-11,py-6);ctx.lineTo(px-20,py+5);ctx.stroke();
          ctx.beginPath();ctx.moveTo(px+11,py-6);ctx.lineTo(px+20,py+5);ctx.stroke();
          ctx.lineCap='butt';ctx.fillStyle='#c8905a';
          ctx.beginPath();ctx.arc(px-20,py+5,4,0,Math.PI*2);ctx.fill();
          // Staff in right hand
          ctx.strokeStyle='#6b4422';ctx.lineWidth=2;
          ctx.beginPath();ctx.moveTo(px+20,py+5);ctx.lineTo(px+24,py-20);ctx.stroke();
          ctx.fillStyle=AMBER;ctx.shadowColor=AMBER;ctx.shadowBlur=6;
          ctx.beginPath();ctx.arc(px+24,py-22,4,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
          ctx.beginPath();ctx.arc(px+20,py+5,4,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#c8905a';ctx.fillRect(px-3,py-16,6,4);
          ctx.beginPath();ctx.arc(px,py-22,9,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#1a0800';ctx.beginPath();ctx.arc(px,py-25,9,Math.PI,0);ctx.fill();ctx.fillRect(px-9,py-27,18,7);
          // Bone headband
          ctx.strokeStyle=BONE;ctx.lineWidth=2;
          ctx.beginPath();ctx.moveTo(px-9,py-26);ctx.lineTo(px+9,py-26);ctx.stroke();
          ctx.fillStyle=BONE;
          for(let b=0;b<3;b++){ctx.beginPath();ctx.arc(px-4+b*4,py-27,1.5,0,Math.PI*2);ctx.fill();}
          ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(px-3.5,py-23,2,1.5,0,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.ellipse(px+3.5,py-23,2,1.5,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#2a0800';ctx.beginPath();ctx.arc(px-3.5,py-23,1,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.arc(px+3.5,py-23,1,0,Math.PI*2);ctx.fill();
          ctx.strokeStyle='rgba(80,20,0,0.7)';ctx.lineWidth=1;
          ctx.beginPath();ctx.arc(px,py-17.5,2.5,0.15,Math.PI-0.15);ctx.stroke();
          ctx.fillStyle=AMBER;ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.shadowColor=LEAF;ctx.shadowBlur=6;ctx.fillText('SHAMAN',px,py-40);ctx.shadowBlur=0;
        };
        // Rune stone monitors on top wall
        for(let mi=0;mi<4;mi++){
          const mx2=cx-W*0.4+mi*((W*0.8)/3);
          ctx.fillStyle="#0a1a06";ctx.strokeStyle=MOSS;ctx.lineWidth=1;
          rr(mx2-18,topY+4,36,30,4);ctx.fill();ctx.stroke();
          ctx.fillStyle="#060e03";ctx.fillRect(mx2-16,topY+6,32,26);
          ctx.fillStyle=mi%2===0?LEAF:AMBER;ctx.shadowColor=mi%2===0?LEAF:AMBER;ctx.shadowBlur=5;
          ctx.font="5px monospace";ctx.textAlign="center";
          ctx.fillText("⬡"+Math.floor(Math.sin(t18+mi)*999+1000).toString().padStart(4,"0"),mx2,topY+14);
          ctx.fillText("◈"+Math.floor(Math.cos(t18*0.7+mi)*888+900).toString().padStart(4,"0"),mx2,topY+21);
          ctx.fillText("☽"+Math.floor(t18*50+mi*200).toString().padStart(4,"0")%9999,mx2,topY+28);
          ctx.shadowBlur=0;
        }
        // Stone desk
        ctx.fillStyle="#0a1a06";ctx.strokeStyle=LEAF;ctx.lineWidth=1.5;
        rr(cx-55,midY-10,110,36,4);ctx.fill();ctx.stroke();
        // Crystal orb on desk (glowing)
        const orbR=ctx.createRadialGradient(cx,midY-18,2,cx,midY-18,14);
        orbR.addColorStop(0,`rgba(180,255,100,${0.8+Math.sin(t18*2)*0.2})`);
        orbR.addColorStop(0.5,`rgba(${LEAFr},0.4)`);orbR.addColorStop(1,`rgba(${LEAFr},0.05)`);
        ctx.fillStyle=orbR;ctx.shadowColor=LEAF;ctx.shadowBlur=16+Math.sin(t18*2)*6;
        ctx.beginPath();ctx.arc(cx,midY-18,14,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        ctx.strokeStyle=`rgba(${LEAFr},0.6)`;ctx.lineWidth=1;ctx.stroke();
        // Rune stones on desk
        for(let mi2=-1;mi2<=1;mi2++){
          ctx.fillStyle="#060c03";ctx.strokeStyle=mi2===0?LEAF:AMBER;ctx.lineWidth=1;
          rr(cx+mi2*36-13,midY-26,26,18,3);ctx.fill();ctx.stroke();
          ctx.fillStyle=mi2===0?LEAF:AMBER;ctx.shadowColor=mi2===0?LEAF:AMBER;ctx.shadowBlur=4;
          ctx.fillRect(cx+mi2*36-11,midY-24,22,4);ctx.fillRect(cx+mi2*36-11,midY-18,22,2);ctx.shadowBlur=0;
        }
        // Bone keyboard
        ctx.fillStyle="#162e0c";rr(cx-32,midY-2,64,14,2);ctx.fill();
        for(let ki=0;ki<10;ki++){ctx.fillStyle=LEAF+"44";ctx.fillRect(cx-30+ki*7,midY,5,9);}
        // Totem poles on sides
        for(const tx2 of [W*0.06,W*0.88]){
          ctx.fillStyle="#1a2a08";ctx.strokeStyle=MOSS;ctx.lineWidth=1.5;
          rr(tx2-8,topY+48,16,H*0.44,3);ctx.fill();ctx.stroke();
          for(let ti2=0;ti2<4;ti2++){
            const ty2=topY+58+ti2*28;
            ctx.strokeStyle=ti2%2===0?LEAF:AMBER;ctx.lineWidth=1;
            ctx.beginPath();ctx.moveTo(tx2-8,ty2);ctx.lineTo(tx2+8,ty2);ctx.stroke();
            ctx.fillStyle=ti2%2===0?LEAF:AMBER;ctx.shadowColor=ti2%2===0?LEAF:AMBER;ctx.shadowBlur=4+Math.sin(t18+ti2)*2;
            ctx.beginPath();ctx.arc(tx2,ty2+10,5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
          }
        }
        // Offering bowls on floor with glow
        for(let pi2=0;pi2<5;pi2++){
          const bx2=W*0.18+pi2*(W*0.16),by2=midY+40;
          ctx.fillStyle="#3a2a10";ctx.strokeStyle=AMBER;ctx.lineWidth=1;
          rr(bx2-11,by2,22,16,8);ctx.fill();ctx.stroke();
          const bpulse=Math.sin(t18*2+pi2)*0.5+0.5;
          const bG=ctx.createRadialGradient(bx2,by2+8,1,bx2,by2+8,8);
          bG.addColorStop(0,`rgba(${pi2%2===0?AMBERr:LEAFr},${0.7+bpulse*0.3})`);
          bG.addColorStop(1,`rgba(${pi2%2===0?AMBERr:LEAFr},0.0)`);
          ctx.fillStyle=bG;ctx.shadowColor=pi2%2===0?AMBER:LEAF;ctx.shadowBlur=8*bpulse;
          ctx.beginPath();ctx.arc(bx2,by2+8,6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        }
        // Smoke wisps
        ctx.save();
        for(let si=0;si<5;si++){
          const sx2=W*0.18+si*(W*0.16),sy2=midY+35;
          const sa=Math.sin(t18*1.5+si)*0.15+0.15;
          ctx.fillStyle=`rgba(${LEAFr},${sa})`;
          ctx.beginPath();ctx.arc(sx2+Math.sin(t18+si)*4,sy2-15,5,0,Math.PI*2);ctx.fill();
          ctx.beginPath();ctx.arc(sx2+Math.sin(t18*1.2+si+1)*3,sy2-26,4,0,Math.PI*2);ctx.fill();
        }
        ctx.restore();
        // Drawn SHAMAN
        drawShaman(cx-20,midY+20);
        // Fireflies
        ctx.save();
        for(let fi=0;fi<8;fi++){
          const fx=W*0.06+((t18*11+fi*58)%(W*0.88)),fy=topY+50+Math.sin(t18*0.8+fi*1.3)*30+fi*15;
          const fa=Math.sin(t18*2.2+fi)*0.3+0.45;
          ctx.fillStyle=fi%2===0?`rgba(${LEAFr},${fa})`:`rgba(${AMBERr},${fa})`;
          ctx.shadowColor=fi%2===0?LEAF:AMBER;ctx.shadowBlur=5;
          ctx.beginPath();ctx.arc(fx,fy,1.8,0,Math.PI*2);ctx.fill();
        }
        ctx.shadowBlur=0;ctx.restore();
        return;
      }
      if (!!this.map?.config?.hardcore) {
        // ═══ HARDCORE: INFERNO HACKER DEN ═══
        const tH = performance.now() / 1000;

        // ── Dark ember floor tiles ────────────────────────────
        ctx.fillStyle = "#080200"; ctx.fillRect(0,0,W,H);
        const tSzH=Math.round(W/16);
        for (let gy=0;gy<=Math.ceil(H/tSzH);gy++) for (let gx=0;gx<=Math.ceil(W/tSzH);gx++) {
          const ftx=gx*tSzH,fty=gy*tSzH,fsd=gx*17+gy*11;
          ctx.fillStyle=fsd%3===0?"rgba(12,4,0,0.97)":fsd%3===1?"rgba(16,5,0,0.97)":"rgba(10,3,0,0.97)";
          ctx.fillRect(ftx,fty,tSzH,tSzH);
          ctx.strokeStyle=`rgba(255,80,0,${0.04+0.02*Math.sin(tH*0.6+fsd*0.1)})`;
          ctx.lineWidth=0.5; ctx.strokeRect(ftx,fty,tSzH,tSzH);
        }

        // ── Room border ────────────────────────────────────────
        ctx.strokeStyle=`rgba(255,100,0,${0.55+0.2*Math.sin(tH*1.4)})`; ctx.lineWidth=3;
        ctx.strokeRect(2,2,W-4,H-4);
        ctx.strokeStyle="rgba(200,50,0,0.2)"; ctx.lineWidth=1; ctx.strokeRect(7,7,W-14,H-14);

        // ── Ceiling LED strips (ember/orange) ─────────────────
        for (let li=0;li<6;li++) {
          const lx=W*0.07+li*(W*0.86/5);
          ctx.fillStyle=`rgba(255,80,0,${0.07+0.04*Math.sin(tH*0.9+li)})`; ctx.fillRect(lx,0,W*0.14,4);
          ctx.fillStyle=`rgba(255,120,20,0.7)`; ctx.shadowColor="#FF5500"; ctx.shadowBlur=6;
          ctx.fillRect(lx+2,1,W*0.12,2); ctx.shadowBlur=0;
        }

        // ── INFERNO HACKER DEN banner ──────────────────────────
        const bWH=W*0.58, bHH=H*0.042, bXH=cx-bWH/2, bYH=room.S-bHH-4;
        const bGrH=ctx.createLinearGradient(bXH,bYH,bXH+bWH,bYH);
        bGrH.addColorStop(0,"rgba(18,4,0,0.97)"); bGrH.addColorStop(0.5,"rgba(60,14,0,0.99)"); bGrH.addColorStop(1,"rgba(18,4,0,0.97)");
        ctx.fillStyle=bGrH; rr(bXH,bYH,bWH,bHH,7); ctx.fill();
        ctx.strokeStyle=`rgba(255,100,0,${0.7+0.3*Math.sin(tH*1.8)})`; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle="#FFCC88"; ctx.font=`bold ${Math.round(bHH*0.55)}px monospace`; ctx.textAlign="center";
        ctx.shadowColor="#FF6600"; ctx.shadowBlur=14;
        ctx.fillText("🔥  INFERNO  HACKER  DEN  🔥",cx,bYH+bHH*0.72); ctx.shadowBlur=0;

        // ── TOP: 6 hacking monitors (wall-mounted) ────────────
        for (let mi=0;mi<6;mi++) {
          const mxH=W*0.06+mi*(W*0.88/5);
          const mwH=W*0.14, mhH=H*0.11;
          ctx.fillStyle="#0c0300"; ctx.strokeStyle=mi===2?`rgba(255,120,0,${0.7+0.3*Math.sin(tH*2+mi)})`:"rgba(200,60,0,0.6)"; ctx.lineWidth=1.5;
          rr(mxH,topY+4,mwH,mhH,3); ctx.fill(); ctx.stroke();
          ctx.fillStyle="#050100"; ctx.fillRect(mxH+2,topY+6,mwH-4,mhH-4);
          // Screen content (scrolling code lines)
          const lineColors=["#FF6600","#00FF88","#FF3300","#FFAA00","#FF0044","#00DDFF"];
          ctx.fillStyle=lineColors[mi]; ctx.shadowColor=lineColors[mi]; ctx.shadowBlur=4;
          ctx.font=`${Math.round(mhH*0.11)}px monospace`; ctx.textAlign="left";
          for (let li=0;li<5;li++) {
            const seed=(tH*18+li*37+mi*111)%1; // deterministic scroll
            const val=Math.floor(Math.sin(tH*1.3+li*7+mi*13)*50000+50000).toString(16).padStart(5,"0");
            ctx.fillText((li%2===0?"0x":">>")+" "+val,mxH+3,topY+8+li*(mhH*0.19));
          }
          ctx.shadowBlur=0;
          // Monitor label
          const mLabels=["INTRUSION","FIREWALL","PAYLOAD","EXPLOIT","DARKNET","EXFIL"];
          ctx.fillStyle=lineColors[mi]; ctx.font=`bold ${Math.round(mhH*0.13)}px monospace`; ctx.textAlign="center";
          ctx.fillText(mLabels[mi],mxH+mwH/2,topY+mhH+12);
        }

        // ── LEFT: Server tower rack ───────────────────────────
        const stX=W*0.03, stY=H*0.25, stW=W*0.12, stH=H*0.55;
        ctx.fillStyle="#0a0300"; ctx.strokeStyle="rgba(255,80,0,0.6)"; ctx.lineWidth=2;
        rr(stX,stY,stW,stH,4); ctx.fill(); ctx.stroke();
        ctx.fillStyle="#FF6600"; ctx.font=`bold ${Math.round(stW*0.2)}px monospace`; ctx.textAlign="center";
        ctx.shadowColor="#FF4400"; ctx.shadowBlur=8;
        ctx.fillText("SRV",stX+stW/2,stY-6); ctx.shadowBlur=0;
        for (let su=0;su<10;su++) {
          const suy=stY+6+su*(stH-12)/10;
          ctx.fillStyle="#0c0400"; ctx.strokeStyle="rgba(200,60,0,0.35)"; ctx.lineWidth=0.7;
          ctx.fillRect(stX+4,suy,stW-8,(stH-12)/10-2); ctx.strokeRect(stX+4,suy,stW-8,(stH-12)/10-2);
          // LED bar
          const lc2=su%3===0?"#FF4400":su%3===1?"#FF8800":"#00FF88";
          const la2=0.5+0.5*Math.sin(tH*(1.5+su*0.3)+su);
          ctx.fillStyle=lc2; ctx.shadowColor=lc2; ctx.shadowBlur=3*la2;
          ctx.fillRect(stX+5,suy+1,stW-14,2); ctx.shadowBlur=0;
          // Activity dot
          const active2=Math.sin(tH*(4+su*0.8)+su)>0.2;
          ctx.fillStyle=active2?"#FF6600":"#2a0c00";
          ctx.beginPath(); ctx.arc(stX+stW-8,suy+(stH-12)/10*0.5,2.5,0,Math.PI*2); ctx.fill();
        }
        // Fan grille on server
        ctx.strokeStyle="rgba(255,80,0,0.3)"; ctx.lineWidth=1;
        for (let fg=0;fg<4;fg++) { ctx.beginPath(); ctx.ellipse(stX+stW/2,stY+stH-20,stW*0.3-fg*3,stW*0.3-fg*3,tH*0.5,0,Math.PI*2); ctx.stroke(); }

        // ── LEFT-CENTER: Main hacking desk + 5-screen arc ─────
        const dkX=W*0.17, dkY=midY-H*0.04, dkW=W*0.48, dkH=H*0.065;
        const dkBg=ctx.createLinearGradient(dkX,dkY,dkX+dkW,dkY+dkH);
        dkBg.addColorStop(0,"#0c0400"); dkBg.addColorStop(0.5,"#180800"); dkBg.addColorStop(1,"#0c0400");
        ctx.fillStyle=dkBg; rr(dkX,dkY,dkW,dkH,5); ctx.fill();
        ctx.strokeStyle="rgba(255,100,0,0.8)"; ctx.lineWidth=2; ctx.stroke();
        // LED strip under desk edge
        ctx.strokeStyle=`rgba(255,80,0,${0.4+0.3*Math.sin(tH*2)})`; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(dkX+8,dkY+dkH); ctx.lineTo(dkX+dkW-8,dkY+dkH); ctx.stroke();

        // 5 monitors on desk arc
        for (let mi2=0;mi2<5;mi2++) {
          const mAng=(mi2-2)*0.22; // arc spread
          const m2x=dkX+dkW*0.1+mi2*(dkW*0.8/4), m2y=dkY-H*0.13-Math.abs(mi2-2)*H*0.01;
          const m2w=dkW*0.16, m2h=H*0.12;
          // slight rotation for arc effect
          ctx.save(); ctx.translate(m2x+m2w/2,m2y+m2h); ctx.rotate(mAng);
          ctx.fillStyle="#0c0300"; ctx.strokeStyle=mi2===2?"rgba(255,150,0,0.9)":"rgba(220,70,0,0.65)"; ctx.lineWidth=1.5;
          rr(-m2w/2,-m2h,m2w,m2h,3); ctx.fill(); ctx.stroke();
          ctx.fillStyle="#040100"; ctx.fillRect(-m2w/2+2,-m2h+2,m2w-4,m2h-4);
          // Screen glow
          const mScreenColors=["#FF4400","#FF8800","#00FF88","#FF3300","#FFAA00"];
          ctx.fillStyle=mScreenColors[mi2]; ctx.shadowColor=mScreenColors[mi2]; ctx.shadowBlur=6;
          ctx.font=`${Math.round(m2h*0.1)}px monospace`; ctx.textAlign="left";
          for (let dl=0;dl<5;dl++) {
            const dv=Math.floor(Math.sin(tH*1.1+dl*5+mi2*9)*32767+32767).toString(16).toUpperCase().padStart(4,"0");
            ctx.fillText(dl===0?"root@fire:~#":`  ${dv}  ${dl%2?"OK":"ERR"}`,-m2w/2+3,-m2h+m2h*0.18+dl*m2h*0.16);
          }
          ctx.shadowBlur=0;
          ctx.restore();
        }

        // Mechanical keyboard on desk
        ctx.fillStyle="#0e0400"; rr(dkX+dkW*0.15,dkY+4,dkW*0.35,dkH-8,3); ctx.fill();
        ctx.strokeStyle="rgba(200,60,0,0.4)"; ctx.lineWidth=0.8; ctx.stroke();
        for (let ki=0;ki<14;ki++) {
          const kr=Math.floor(ki/7), kc=ki%7;
          const keyC=Math.sin(tH*8+ki)>0.6?"rgba(255,100,0,0.9)":"rgba(180,50,0,0.45)";
          ctx.fillStyle=keyC; ctx.fillRect(dkX+dkW*0.16+kc*dkW*0.048,dkY+5+kr*((dkH-10)/2),dkW*0.038,dkH*0.38);
        }

        // ── CENTER-RIGHT: Network topology board ──────────────
        const ntX=W*0.67, ntY=H*0.24, ntW=W*0.14, ntH=H*0.35;
        ctx.fillStyle="#0a0200"; ctx.strokeStyle="rgba(255,80,0,0.55)"; ctx.lineWidth=1.5;
        rr(ntX,ntY,ntW,ntH,4); ctx.fill(); ctx.stroke();
        ctx.fillStyle="#FF6600"; ctx.font=`bold ${Math.round(ntH*0.07)}px monospace`; ctx.textAlign="center";
        ctx.shadowColor="#FF4400"; ctx.shadowBlur=7;
        ctx.fillText("NET MAP",ntX+ntW/2,ntY+ntH*0.09); ctx.shadowBlur=0;
        // Nodes and connections
        const netNodes=[{x:0.25,y:0.25,c:"#FF4400"},{x:0.75,y:0.2,c:"#FF8800"},{x:0.5,y:0.5,c:"#00FF88"},{x:0.2,y:0.7,c:"#FF6600"},{x:0.8,y:0.65,c:"#FFAA00"},{x:0.5,y:0.85,c:"#FF3300"}];
        // Lines first
        ctx.strokeStyle="rgba(255,80,0,0.22)"; ctx.lineWidth=1;
        const edges=[[0,2],[1,2],[2,3],[2,4],[3,5],[4,5]];
        for (const [a,b] of edges) {
          ctx.beginPath(); ctx.moveTo(ntX+netNodes[a].x*ntW,ntY+netNodes[a].y*ntH); ctx.lineTo(ntX+netNodes[b].x*ntW,ntY+netNodes[b].y*ntH); ctx.stroke();
        }
        // Nodes
        for (let ni=0;ni<netNodes.length;ni++) {
          const nd=netNodes[ni], np=0.5+0.5*Math.sin(tH*2.5+ni*1.1);
          ctx.fillStyle=nd.c; ctx.shadowColor=nd.c; ctx.shadowBlur=6*np;
          ctx.beginPath(); ctx.arc(ntX+nd.x*ntW,ntY+nd.y*ntH,4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        }
        // Packet animation on edge 0-2
        const pkP=(tH*0.4)%1;
        const pkx=ntX+netNodes[0].x*ntW+(netNodes[2].x-netNodes[0].x)*ntW*pkP;
        const pky=ntY+netNodes[0].y*ntH+(netNodes[2].y-netNodes[0].y)*ntH*pkP;
        ctx.fillStyle="#FFFF00"; ctx.shadowColor="#FFFF00"; ctx.shadowBlur=8;
        ctx.beginPath(); ctx.arc(pkx,pky,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;

        // ── RIGHT: Deep rack + patch panel ────────────────────
        const prX=W*0.84, prY=H*0.25, prW=W*0.13, prH=H*0.55;
        ctx.fillStyle="#0a0300"; ctx.strokeStyle="rgba(200,60,0,0.55)"; ctx.lineWidth=1.5;
        rr(prX,prY,prW,prH,4); ctx.fill(); ctx.stroke();
        ctx.fillStyle="#FF8800"; ctx.font=`bold ${Math.round(prW*0.2)}px monospace`; ctx.textAlign="center";
        ctx.shadowColor="#FF6600"; ctx.shadowBlur=8;
        ctx.fillText("RACK",prX+prW/2,prY-6); ctx.shadowBlur=0;
        // Patch panel cables
        for (let pp=0;pp<8;pp++) {
          const ppy=prY+10+pp*(prH-20)/7;
          ctx.fillStyle="#0c0400"; ctx.fillRect(prX+4,ppy,prW-8,10);
          ctx.strokeStyle="rgba(180,50,0,0.4)"; ctx.lineWidth=0.7; ctx.strokeRect(prX+4,ppy,prW-8,10);
          // RJ45 ports
          for (let pt=0;pt<4;pt++) {
            const ptx=prX+5+pt*(prW-10)/3;
            ctx.fillStyle="#0a0100"; ctx.fillRect(ptx,ppy+2,6,6);
            ctx.strokeStyle="rgba(255,80,0,0.5)"; ctx.lineWidth=0.5; ctx.strokeRect(ptx,ppy+2,6,6);
            // Cable lead
            if (Math.sin(pp*7+pt*3)>0) {
              const cColors=["#FF4400","#FFAA00","#00FF88","#FF0044","#00DDFF","#FF8800"];
              ctx.strokeStyle=cColors[(pp+pt)%6]; ctx.lineWidth=1.5;
              ctx.beginPath(); ctx.moveTo(ptx+3,ppy+8); ctx.bezierCurveTo(ptx+3,ppy+18,prX+Math.sin(pp*2+pt)*6+prW/2,ppy+20,prX+prW/2,ppy+22); ctx.stroke();
            }
          }
        }

        // ── FLOOR: scattered items ─────────────────────────────
        // Energy drink cans
        const canPositions=[{x:W*0.19,y:H*0.78},{x:W*0.22,y:H*0.80},{x:W*0.58,y:H*0.79},{x:W*0.62,y:H*0.81}];
        for (const cp2 of canPositions) {
          ctx.fillStyle="#CC2200"; ctx.strokeStyle="#FF4400"; ctx.lineWidth=1;
          rr(cp2.x-4,cp2.y-11,8,14,2); ctx.fill(); ctx.stroke();
          ctx.fillStyle="rgba(255,200,0,0.8)"; ctx.fillRect(cp2.x-3,cp2.y-9,6,2);
          ctx.fillStyle="#FF6600"; ctx.shadowColor="#FF4400"; ctx.shadowBlur=4;
          ctx.font=`bold ${Math.round(7)}px monospace`; ctx.textAlign="center";
          ctx.fillText("⚡",cp2.x,cp2.y-3); ctx.shadowBlur=0;
        }
        // Pizza boxes (stacked)
        ctx.fillStyle="#4a2a10"; ctx.strokeStyle="#8a5a28"; ctx.lineWidth=1;
        for (let pi=0;pi<4;pi++) {
          rr(W*0.30+pi*26,H*0.80,24,24,1); ctx.fill(); ctx.stroke();
          ctx.fillStyle="#FF5500";
          ctx.beginPath(); ctx.arc(W*0.30+pi*26+12,H*0.80+12,8,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#4a2a10";
        }
        // USB drives / HDDs scattered
        const usbPos=[{x:W*0.52,y:H*0.72},{x:W*0.55,y:H*0.74},{x:W*0.48,y:H*0.75}];
        for (const up of usbPos) {
          ctx.fillStyle="#222"; ctx.strokeStyle="#FF8800"; ctx.lineWidth=1;
          rr(up.x-7,up.y-4,14,8,2); ctx.fill(); ctx.stroke();
          ctx.fillStyle="#FF6600"; ctx.fillRect(up.x+5,up.y-2,4,4);
        }
        // Sticky notes on wall/monitor
        const noteColors=["rgba(255,200,0,0.85)","rgba(255,100,0,0.85)","rgba(255,160,0,0.85)"];
        const noteTexts=["0DAY","PWNED","ROOTKIT"];
        for (let ni=0;ni<3;ni++) {
          const nx=W*0.68+ni*W*0.03, ny=topY+H*0.13+ni*H*0.02;
          ctx.fillStyle=noteColors[ni]; rr(nx,ny,22,18,1); ctx.fill();
          ctx.strokeStyle="rgba(180,80,0,0.4)"; ctx.lineWidth=0.5; ctx.stroke();
          ctx.fillStyle="#1a0800"; ctx.font=`bold 5px monospace`; ctx.textAlign="center";
          ctx.fillText(noteTexts[ni],nx+11,ny+11);
        }
        // Hoodie on chair (left of desk)
        const hdX=dkX-W*0.06, hdY=dkY;
        ctx.fillStyle="#1a0000"; ctx.strokeStyle="#330000"; ctx.lineWidth=1;
        rr(hdX,hdY,W*0.04,H*0.06,4); ctx.fill(); ctx.stroke();
        ctx.fillStyle="rgba(255,30,0,0.15)"; rr(hdX+2,hdY+2,W*0.04-4,H*0.06-4,3); ctx.fill();
        // Hood
        ctx.fillStyle="#1a0000";
        ctx.beginPath(); ctx.arc(hdX+W*0.02,hdY,W*0.018,Math.PI,0); ctx.fill();
        ctx.fillStyle="#FF4400"; ctx.font=`bold 6px monospace`; ctx.textAlign="center";
        ctx.fillText("⊘",hdX+W*0.02,hdY+H*0.035);

        // ── Crypto ticker display ──────────────────────────────
        const tkY5=H*0.94;
        ctx.fillStyle="rgba(8,2,0,0.88)"; ctx.fillRect(0,tkY5,W,H*0.035);
        ctx.fillStyle=`rgba(255,100,0,${0.75+0.25*Math.sin(tH*4)})`; rr(W*0.005,tkY5+H*0.001,W*0.05,H*0.027,3); ctx.fill();
        ctx.fillStyle="#0a0200"; ctx.font=`bold ${Math.round(H*0.017)}px monospace`; ctx.textAlign="left";
        ctx.fillText("LIVE",W*0.005+W*0.05*0.14,tkY5+H*0.001+H*0.027*0.75);
        const btcVal=Math.floor(69000+Math.sin(tH*0.3)*2000).toLocaleString();
        const ethVal=Math.floor(3800+Math.sin(tH*0.4)*200).toLocaleString();
        const tkTxtH=`🔥 INFERNO DEN  ✦  ROOT ACCESS: GRANTED  ✦  BTC $${btcVal}  ✦  ETH $${ethVal}  ✦  FIREWALL: BYPASSED  ✦  PAYLOAD DEPLOYED  ✦  TARGET: ${Math.floor(tH*7)%256}.${Math.floor(tH*13)%256}.0.1  ✦  `;
        const tkXH=W*0.06+W-(tH*55)%(W+2000);
        ctx.save(); ctx.beginPath(); ctx.rect(W*0.06,tkY5,W-W*0.06,H*0.032); ctx.clip();
        ctx.fillStyle="#FFCC88"; ctx.font=`bold ${Math.round(H*0.017)}px monospace`; ctx.textAlign="left";
        ctx.fillText(tkTxtH,tkXH,tkY5+H*0.021); ctx.restore();

        // ── Ambient ember sparks ───────────────────────────────
        for (let pi=0;pi<18;pi++) {
          const fpx=(Math.sin(pi*2.3+tH*0.38)*0.44+0.5)*W, fpy=(Math.cos(pi*1.7+tH*0.25)*0.4+0.5)*(H*0.88);
          const pA=0.07+0.05*Math.sin(tH*1.4+pi);
          ctx.fillStyle=pi%3===0?`rgba(255,100,0,${pA})`:pi%3===1?`rgba(255,60,0,${pA})`:`rgba(255,160,0,${pA})`;
          ctx.beginPath(); ctx.arc(fpx,fpy,1.8,0,Math.PI*2); ctx.fill();
        }

      } else {
        // ── DEFAULT: Monitor wall (top) ───────────────────────
        for (let mi = 0; mi < 4; mi++) {
          const mx2 = cx - W * 0.4 + mi * ((W * 0.8) / 3);
          ctx.fillStyle = "#050a08";
          ctx.strokeStyle = "#00FF88";
          ctx.lineWidth = 1;
          rr(mx2 - 18, topY + 4, 36, 28, 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#001a10";
          ctx.fillRect(mx2 - 16, topY + 6, 32, 24);
          ctx.fillStyle = "#00FF88";
          ctx.shadowColor = "#00FF44";
          ctx.shadowBlur = 6;
          ctx.font = "4px monospace";
          ctx.textAlign = "center";
          for (let li = 0; li < 4; li++) {
            const lineText = "01" + Math.floor(Math.sin(li*7+mi*13)*500+500).toString().padStart(4, "0");
            ctx.fillText(lineText, mx2, topY + 10 + li * 5);
          }
          ctx.shadowBlur = 0;
        }
        // ── Hacker desk (center) ─────────────────────
        ctx.fillStyle = "#050a08"; ctx.strokeStyle = "#00FF88"; ctx.lineWidth = 1.5;
        rr(cx - 52, midY - 8, 104, 32, 4); ctx.fill(); ctx.stroke();
        for (let mi2 = -1; mi2 <= 1; mi2++) {
          ctx.fillStyle = "#020806"; ctx.strokeStyle = "#00FF44"; ctx.lineWidth = 1;
          rr(cx + mi2 * 34 - 14, midY - 24, 28, 18, 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#001a10"; ctx.fillRect(cx + mi2 * 34 - 12, midY - 22, 24, 14);
          ctx.fillStyle = "#00FF88"; ctx.shadowColor = "#00FF44"; ctx.shadowBlur = 5;
          ctx.fillRect(cx + mi2 * 34 - 10, midY - 20, 20, 4);
          ctx.fillRect(cx + mi2 * 34 - 10, midY - 14, 20, 2); ctx.shadowBlur = 0;
        }
        ctx.fillStyle = "#0a1208"; rr(cx - 30, midY - 4, 60, 12, 2); ctx.fill();
        for (let ki = 0; ki < 9; ki++) {
          ctx.fillStyle = `rgba(0,255,136,${0.3+0.4*Math.abs(Math.sin(ki*1.3))})`;
          ctx.fillRect(cx - 28 + ki * 7, midY - 2, 5, 8);
        }
        ctx.fillStyle = "#4a2a10"; ctx.strokeStyle = "#8a5a28"; ctx.lineWidth = 1;
        for (let pi = 0; pi < 3; pi++) {
          rr(cx - W * 0.4 + pi * 24, midY + 28, 22, 22, 1); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#FF6622";
          ctx.beginPath(); ctx.arc(cx - W * 0.4 + pi * 24 + 11, midY + 39, 8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#4a2a10";
        }
      }
    } else if (type === 19) {
      // DOJO
      if (!!this.map?.config?.robot) {
        // ═══ ROBOT CITY: TRADITIONAL KARATE DOJO ═══

        // ── Dojo sign (top-center) ─────────────────────────────────────────
        ctx.fillStyle = "#1a0e06"; rr(cx-110, topY+2, 220, 20, 3); ctx.fill();
        ctx.strokeStyle = "#CC4400"; ctx.lineWidth = 1.5; ctx.strokeRect(cx-110, topY+2, 220, 20);
        ctx.fillStyle = "#FF8833"; ctx.shadowColor="#CC4400"; ctx.shadowBlur=8;
        ctx.font = "bold 11px serif"; ctx.textAlign = "center";
        ctx.fillText("⛩  IRON FIST DOJO  ⛩", cx, topY+15);
        ctx.shadowBlur = 0;

        // ── Large tatami mat floor (center) ───────────────────────────────
        ctx.fillStyle = "#5a3d18"; rr(cx-W*0.38, midY-W*0.24, W*0.76, W*0.48, 4); ctx.fill();
        ctx.strokeStyle = "#8a6040"; ctx.lineWidth = 2; ctx.strokeRect(cx-W*0.38, midY-W*0.24, W*0.76, W*0.48);
        // Tatami grid lines
        ctx.strokeStyle = "#7a5030"; ctx.lineWidth = 1;
        for (let gi = -2; gi <= 2; gi++) {
          ctx.beginPath(); ctx.moveTo(cx+gi*W*0.19, midY-W*0.24); ctx.lineTo(cx+gi*W*0.19, midY+W*0.24); ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(cx-W*0.38, midY); ctx.lineTo(cx+W*0.38, midY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-W*0.38, midY-W*0.12); ctx.lineTo(cx+W*0.38, midY-W*0.12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx-W*0.38, midY+W*0.12); ctx.lineTo(cx+W*0.38, midY+W*0.12); ctx.stroke();
        // Center fighting circle
        ctx.strokeStyle = "rgba(180,100,30,0.55)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, midY, 52, 0, Math.PI*2); ctx.stroke();
        // Tatami edge border
        ctx.fillStyle = "#3a2008"; rr(cx-W*0.38, midY-W*0.24, W*0.76, 6, [4,4,0,0]); ctx.fill();
        ctx.fillStyle = "#3a2008"; rr(cx-W*0.38, midY+W*0.24-6, W*0.76, 6, [0,0,4,4]); ctx.fill();

        // ── Two sparring figures on the mat ───────────────────────────────
        // Helper to draw a top-down karateka in kimono
        const drawKarateka = (kx, ky, facingLeft, beltColor) => {
          // Kimono body (white gi)
          ctx.fillStyle = "#EEEEEE"; rr(kx-8, ky-10, 16, 20, 2); ctx.fill();
          // Kimono lapels (V-neck overlap lines)
          ctx.strokeStyle = "#CCCCCC"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(kx-3, ky-10); ctx.lineTo(kx, ky-2); ctx.lineTo(kx+3, ky-10); ctx.stroke();
          // Belt (obi)
          ctx.fillStyle = beltColor; ctx.fillRect(kx-8, ky-2, 16, 4);
          // Kimono sleeves (wide)
          ctx.fillStyle = "#EEEEEE";
          ctx.fillRect(kx + (facingLeft ? 7:  -15), ky-8, 8, 6);
          ctx.fillRect(kx + (facingLeft ? 7: -15), ky+2, 8, 6);
          // Head
          ctx.fillStyle = "#DDBB88"; ctx.beginPath(); ctx.arc(kx, ky-16, 6, 0, Math.PI*2); ctx.fill();
          // Hair (dark)
          ctx.fillStyle = "#221100"; ctx.beginPath(); ctx.arc(kx, ky-18, 5, Math.PI, 0); ctx.fill();
          // Headband
          ctx.strokeStyle = "#CC2200"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(kx-5, ky-20); ctx.lineTo(kx+5, ky-20); ctx.stroke();
          // Legs/pants
          ctx.fillStyle = "#DDDDDD";
          ctx.fillRect(kx-5, ky+10, 4, 10);
          ctx.fillRect(kx+1, ky+10, 4, 10);
        };
        // Fighter 1 — left, facing right, black belt
        drawKarateka(cx-30, midY, false, "#111111");
        // Fighter 2 — right, facing left, red belt
        drawKarateka(cx+30, midY, true, "#CC2200");

        // ── Left wall: weapon rack (traditional) ──────────────────────────
        ctx.fillStyle = "#2a1808"; rr(W*0.05, topY+26, 56, 110, 3); ctx.fill();
        ctx.strokeStyle = "#8a5028"; ctx.lineWidth = 1.5; ctx.strokeRect(W*0.05, topY+26, 56, 110);
        // Horizontal rack bars
        ctx.fillStyle = "#5a3418";
        for (let rb = 0; rb < 4; rb++) ctx.fillRect(W*0.05+5, topY+32+rb*26, 46, 4);
        // Weapons hanging on rack: bo staff, katana, naginata, tonfa
        // Bo staff (long vertical)
        ctx.fillStyle = "#8B4513"; ctx.fillRect(W*0.05+10, topY+30, 5, 50);
        ctx.fillStyle = "#6a3410"; ctx.fillRect(W*0.05+11, topY+30, 2, 50);
        // Katana (diagonal)
        ctx.save();
        ctx.translate(W*0.05+30, topY+55);
        ctx.rotate(0.15);
        ctx.fillStyle = "#AAAAAA"; ctx.fillRect(-2, -24, 4, 48); // blade
        ctx.fillStyle = "#8B4513"; ctx.fillRect(-3, 22, 6, 10);  // handle
        ctx.fillStyle = "#FFD700"; ctx.fillRect(-4, 20, 8, 4);   // tsuba (guard)
        ctx.restore();
        // Naginata
        ctx.fillStyle = "#8B4513"; ctx.fillRect(W*0.05+44, topY+30, 4, 60);
        ctx.fillStyle = "#CCCCCC"; ctx.beginPath();
        ctx.moveTo(W*0.05+44, topY+30); ctx.lineTo(W*0.05+48, topY+30); ctx.lineTo(W*0.05+46, topY+18); ctx.closePath(); ctx.fill();
        // Tonfa pair
        ctx.fillStyle = "#6B3410"; ctx.fillRect(W*0.05+10, topY+90, 4, 30); ctx.fillRect(W*0.05+40, topY+90, 4, 30);
        ctx.fillStyle = "#7B4420"; ctx.fillRect(W*0.05+12, topY+98, 26, 4); // cross bar
        // Sign
        ctx.fillStyle = "#FF8833"; ctx.font = "bold 7px serif"; ctx.textAlign = "center";
        ctx.fillText("武 ARMS", W*0.05+28, topY+143);

        // ── Top-center-right: 3 calligraphy scrolls on wall ───────────────
        const scrollTexts = [["武","道","士"],["力","強","心"],["礼","義","仁"]];
        for (let sc = 0; sc < 3; sc++) {
          const scx = cx+W*0.06 + sc*42, scy = topY+4;
          ctx.fillStyle = "#F5E8D0"; rr(scx, scy, 28, 72, 3); ctx.fill();
          ctx.strokeStyle = "#8a6040"; ctx.lineWidth = 1; ctx.strokeRect(scx, scy, 28, 72);
          // Scroll rod tops/bottom
          ctx.fillStyle = "#8B4513"; ctx.fillRect(scx-2, scy, 32, 5); ctx.fillRect(scx-2, scy+67, 32, 5);
          // Kanji
          ctx.fillStyle = "#1a0800"; ctx.font = "bold 14px serif"; ctx.textAlign = "center";
          for (let k = 0; k < 3; k++) ctx.fillText(scrollTexts[sc][k], scx+14, scy+18+k*20);
        }

        // ── Right wall: punching bags + dummy ─────────────────────────────
        // Heavy bag 1
        const hbx1 = W*0.80, hby1 = topY+10;
        ctx.fillStyle = "#883322"; rr(hbx1, hby1+4, 22, 46, 5); ctx.fill();
        ctx.strokeStyle = "#AA4433"; ctx.lineWidth = 1.5; ctx.strokeRect(hbx1, hby1+4, 22, 46);
        // Bag straps
        ctx.strokeStyle = "#4a2010"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(hbx1+11, hby1); ctx.lineTo(hbx1+11, hby1+4); ctx.stroke();
        // Band seams on bag
        ctx.strokeStyle = "#662211"; ctx.lineWidth = 1;
        for (let bnd=0;bnd<3;bnd++) { ctx.beginPath(); ctx.moveTo(hbx1, hby1+14+bnd*12); ctx.lineTo(hbx1+22, hby1+14+bnd*12); ctx.stroke(); }

        // Speed bag 2
        const hbx2 = W*0.86, hby2 = topY+20;
        ctx.fillStyle = "#AA4422"; ctx.beginPath(); ctx.ellipse(hbx2+9, hby2+16, 9, 16, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#CC5533"; ctx.beginPath(); ctx.ellipse(hbx2+9, hby2+12, 7, 10, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "#4a1a00"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(hbx2+9, hby2); ctx.lineTo(hbx2+9, hby2+4); ctx.stroke();

        // Wooden dummy (mook jong)
        const wdx = W*0.80, wdy = topY+65;
        ctx.fillStyle = "#8B5A2B"; ctx.fillRect(wdx+8, wdy, 10, 50); // trunk
        ctx.fillStyle = "#6B4520"; ctx.fillRect(wdx+4, wdy+12, 28, 5); // arm 1
        ctx.fillRect(wdx+4, wdy+26, 28, 5); // arm 2
        ctx.fillRect(wdx+10, wdy+40, 18, 5); // low arm
        // Base
        ctx.fillStyle = "#5a3a1a"; ctx.fillRect(wdx+2, wdy+48, 22, 8);
        ctx.fillStyle = "#FF8833"; ctx.font = "bold 6px serif"; ctx.textAlign = "center";
        ctx.fillText("MU JONG", wdx+13, wdy+64);

        // ── Bottom: meditation cushions ────────────────────────────────────
        for (let mc = 0; mc < 4; mc++) {
          const mcx = W*0.14+mc*W*0.18, mcy = H*0.78;
          // Zabuton (flat square cushion)
          ctx.fillStyle = mc%2===0 ? "#8B1A1A" : "#1A3A8B";
          ctx.strokeStyle = mc%2===0 ? "#AA2222" : "#2244AA";
          ctx.lineWidth = 1; rr(mcx, mcy, 32, 22, 4); ctx.fill(); ctx.strokeRect(mcx, mcy, 32, 22);
          // Cushion trim lines
          ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 0.8;
          ctx.strokeRect(mcx+3, mcy+3, 26, 16);
          // Center button
          ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.arc(mcx+16, mcy+11, 3, 0, Math.PI*2); ctx.fill();
        }

      } else {
      // DOJO (default)
      // ── Tatami mat (center) ──────────────────────
      ctx.fillStyle = "#4a3820";
      ctx.strokeStyle = "#8a6840";
      ctx.lineWidth = 1.5;
      rr(cx - W * 0.38, midY - W * 0.22, W * 0.76, W * 0.44, 3);
      ctx.fill();
      ctx.stroke();
      // Mat pattern
      ctx.strokeStyle = "#6a5030";
      ctx.lineWidth = 0.5;
      for (let mi = -1; mi <= 1; mi++) {
        ctx.beginPath();
        ctx.moveTo(cx + mi * W * 0.19, midY - W * 0.22);
        ctx.lineTo(cx + mi * W * 0.19, midY + W * 0.22);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx - W * 0.38, midY);
      ctx.lineTo(cx + W * 0.38, midY);
      ctx.stroke();
      // ── Weapons rack (top left) ───────────────────
      ctx.fillStyle = "#2a1a10";
      ctx.strokeStyle = "#8a5a28";
      ctx.lineWidth = 1.5;
      rr(cx - W * 0.44, topY + 4, 52, 60, 2);
      ctx.fill();
      ctx.stroke();
      const dojoWeapons = ["🗡", "🥊", "🪃", "⚔"];
      ctx.font = "16px serif";
      ctx.textAlign = "center";
      dojoWeapons.forEach((w, i) =>
        ctx.fillText(
          w,
          cx - W * 0.44 + 14 + (i % 2) * 24,
          topY + 20 + Math.floor(i / 2) * 28,
        ),
      );
      // ── Punching bag (top right) ──────────────────
      const pbx = cx + W * 0.3,
        pby = topY + 16;
      ctx.fillStyle = "#662222";
      ctx.strokeStyle = "#884444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(pbx, pby, 14, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#442222";
      ctx.beginPath();
      ctx.arc(pbx, pby - 10, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#AA6644";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pbx, pby - 26);
      ctx.lineTo(pbx, topY);
      ctx.stroke();
      // ── Calligraphy scroll (wall) ─────────────────
      ctx.fillStyle = "#F5E8D0";
      ctx.strokeStyle = "#8a6840";
      ctx.lineWidth = 1;
      rr(cx + W * 0.1, topY + 4, 30, 70, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2a1a10";
      ctx.font = "bold 12px serif";
      ctx.textAlign = "center";
      ctx.fillText("武", cx + W * 0.1 + 15, topY + 30);
      ctx.fillText("道", cx + W * 0.1 + 15, topY + 54);
      } // end else (default dojo)
    } else if (type === 20) {
      // SAFEHOUSE
      // ── Bed (top-left) ────────────────────────────
      ctx.fillStyle = "#1a2438";
      ctx.strokeStyle = "#2a3a5a";
      ctx.lineWidth = 1.5;
      rr(cx - W * 0.44, topY + 4, 70, 52, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2a3a5a";
      rr(cx - W * 0.44, topY + 4, 70, 14, [4, 4, 0, 0]);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF44";
      rr(cx - W * 0.4, topY + 20, 62, 34, 2);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF88";
      rr(cx - W * 0.42, topY + 22, 26, 16, 3);
      ctx.fill();
      // ── Computer station (right) ──────────────────
      ctx.fillStyle = "#0a1018";
      ctx.strokeStyle = "#2244AA";
      ctx.lineWidth = 1.5;
      rr(cx + W * 0.16, topY + 4, 64, 60, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#050810";
      rr(cx + W * 0.16 + 4, topY + 8, 56, 34, 2);
      ctx.fill();
      // Maps on screen
      ctx.strokeStyle = "#2244AA";
      ctx.lineWidth = 0.7;
      for (let li = 0; li < 4; li++)
        ctx.strokeRect(cx + W * 0.16 + 8 + li * 13, topY + 12, 10, 10);
      ctx.strokeStyle = "#FFCC00";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx + W * 0.16 + 28, topY + 28, 6, 0, Math.PI * 2);
      ctx.stroke();
      // ── Safe (bottom-right) ───────────────────────
      ctx.fillStyle = "#2a2a2a";
      ctx.strokeStyle = "#666666";
      ctx.lineWidth = 2;
      rr(cx + W * 0.24, midY + 2, 44, 44, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#444444";
      rr(cx + W * 0.24 + 4, midY + 6, 36, 36, 2);
      ctx.fill();
      ctx.fillStyle = "#AAAAAA";
      ctx.shadowColor = "#AAAAAA";
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(cx + W * 0.24 + 22, midY + 24, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(cx + W * 0.24 + 22, midY + 24, 4, 0, Math.PI * 2);
      ctx.fill();
      // ── Corkboard (center top) ────────────────────
      ctx.fillStyle = "#8B5E3C";
      ctx.strokeStyle = "#6B4E2C";
      ctx.lineWidth = 1;
      rr(cx - W * 0.12, topY + 4, W * 0.24, 48, 2);
      ctx.fill();
      ctx.stroke();
      const pinColors = ["#FF3333", "#3333FF", "#33FF33", "#FFCC00"];
      for (let pi = 0; pi < 4; pi++) {
        const px2 = cx - W * 0.1 + (pi % 2) * (W * 0.08),
          py2 = topY + 12 + Math.floor(pi / 2) * 22;
        ctx.fillStyle = "#FFFFEE";
        ctx.fillRect(px2, py2, W * 0.07, 14);
        ctx.fillStyle = pinColors[pi];
        ctx.beginPath();
        ctx.arc(px2 + W * 0.035, py2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 21) {
      // CHOP SHOP
      const isSnowChop = !!this.map?.config?.snow;
      const t = performance.now() / 1000;

      if (isSnowChop) {
        // ═══ FROZEN TUNDRA: ICE CHOP SHOP ═══

        // ── Shop sign ───────────────────
        ctx.fillStyle = "#AADDFF";
        ctx.shadowColor = "#66BBFF";
        ctx.shadowBlur = 12;
        ctx.font = "bold 10px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("❄ FROST CHOP SHOP ❄", cx, topY - 4);
        ctx.shadowBlur = 0;

        // ── Car lift with stripped vehicle (center) ───────────────────
        // Lift platform
        ctx.fillStyle = "#1a2830";
        ctx.strokeStyle = "#3a5868";
      } else if (!!this.map?.config?.robot) {
        // ═══ ROBOT CITY: CHOP SHOP ═══
        const tcs = performance.now() / 1000;

        // ── Sign ──────────────────────────────────────────────────────────
        ctx.fillStyle = "#0e0a04"; rr(cx-130, topY+2, 260, 20, 3); ctx.fill();
        ctx.strokeStyle = "#FF8800"; ctx.lineWidth = 1.5; ctx.strokeRect(cx-130, topY+2, 260, 20);
        ctx.fillStyle = "#FFAA00"; ctx.shadowColor="#FF6600"; ctx.shadowBlur=10;
        ctx.font = "bold 10px Orbitron, monospace"; ctx.textAlign = "center";
        ctx.fillText("⚙  STEEL CIRCUIT CHOP SHOP  ⚙", cx, topY+15);
        ctx.shadowBlur = 0;

        // ── Main car body being stripped (center) ─────────────────────────
        // Car shadow
        ctx.fillStyle = "rgba(0,0,0,0.4)"; rr(cx-66, midY-18, 132, 44, 6); ctx.fill();
        // Car body (partially stripped — dark metal)
        ctx.fillStyle = "#2a3040"; ctx.strokeStyle = "#4a5060"; ctx.lineWidth = 2;
        rr(cx-62, midY-16, 124, 38, 5); ctx.fill(); ctx.stroke();
        // Roof/cabin section
        ctx.fillStyle = "#222838"; rr(cx-38, midY-28, 76, 16, 4); ctx.fill(); ctx.stroke();
        // Windshield — cracked
        ctx.fillStyle = "#0a1420"; rr(cx-30, midY-26, 60, 12, 2); ctx.fill();
        ctx.strokeStyle = "#AABBCC44"; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(cx-10, midY-26); ctx.lineTo(cx+5, midY-14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+8, midY-26); ctx.lineTo(cx-2, midY-18); ctx.stroke();
        // Wheel wells — stripped (bare axle circles)
        ctx.strokeStyle = "#556677"; ctx.lineWidth = 2;
        for (const wx2 of [cx-42, cx+42]) {
          ctx.fillStyle = "#111820"; ctx.beginPath(); ctx.arc(wx2, midY+14, 14, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = "#3a4a5a"; ctx.beginPath(); ctx.arc(wx2, midY+14, 14, 0, Math.PI*2); ctx.stroke();
          // Bare axle bolt
          ctx.fillStyle = "#5a6a7a"; ctx.beginPath(); ctx.arc(wx2, midY+14, 5, 0, Math.PI*2); ctx.fill();
        }
        // Car body damage marks
        ctx.strokeStyle = "rgba(255,140,0,0.25)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx-20, midY-12); ctx.lineTo(cx, midY+10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+18, midY-8); ctx.lineTo(cx+30, midY+8); ctx.stroke();
        // Engine exposed (hood open, engine block visible)
        ctx.fillStyle = "#3a2810"; rr(cx+30, midY-14, 32, 26, 2); ctx.fill();
        ctx.strokeStyle = "#886633"; ctx.lineWidth = 1; ctx.strokeRect(cx+30, midY-14, 32, 26);
        ctx.fillStyle = "#554422";
        for (let eb=0;eb<3;eb++) ctx.fillRect(cx+33+eb*8, midY-10, 6, 18); // cylinders
        ctx.fillStyle = "#FFAA00"; ctx.shadowColor="#FF6600"; ctx.shadowBlur=6;
        ctx.beginPath(); ctx.arc(cx+60, midY-10, 4, 0, Math.PI*2); ctx.fill(); // spark
        ctx.shadowBlur=0;

        // ── Top-left: dismantled parts pile ───────────────────────────────
        const partsX = W*0.05, partsY = topY+28;
        ctx.fillStyle = "#1a2030"; rr(partsX, partsY, 72, 80, 3); ctx.fill();
        ctx.strokeStyle = "#3a4050"; ctx.lineWidth = 1; ctx.strokeRect(partsX, partsY, 72, 80);
        // Part items (door panel, bumper, tire rim, hood)
        ctx.fillStyle = "#3a4555"; rr(partsX+4, partsY+4, 30, 18, 2); ctx.fill();    // door panel
        ctx.fillStyle = "#2a3545"; rr(partsX+38, partsY+4, 28, 14, 2); ctx.fill();   // bumper
        ctx.strokeStyle = "#4a5565"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(partsX+18, partsY+40, 14, 0, Math.PI*2); ctx.stroke(); // rim
        ctx.fillStyle = "#111820"; ctx.beginPath(); ctx.arc(partsX+18, partsY+40, 9, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#4a5565"; ctx.beginPath(); ctx.arc(partsX+18, partsY+40, 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#2a3040"; rr(partsX+36, partsY+24, 30, 10, 2); ctx.fill();  // exhaust pipe
        ctx.fillStyle = "#3a4555"; rr(partsX+4, partsY+60, 64, 14, 2); ctx.fill();   // hood
        ctx.strokeStyle = "#FFAA00"; ctx.lineWidth = 0.8;
        ctx.strokeRect(partsX+4, partsY+60, 64, 14);
        ctx.fillStyle = "#FFAA00"; ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
        ctx.fillText("PARTS BIN", partsX+36, partsY+90);

        // ── Top-right: tool wall ───────────────────────────────────────────
        const toolX = W*0.72, toolY = topY+18;
        ctx.fillStyle = "#12180e"; rr(toolX, toolY, 80, 100, 3); ctx.fill();
        ctx.strokeStyle = "#3a4a2a"; ctx.lineWidth = 1; ctx.strokeRect(toolX, toolY, 80, 100);
        // Pegboard holes
        for (let ph=0;ph<4;ph++) for (let pv=0;pv<5;pv++) {
          ctx.fillStyle = "#0a100a"; ctx.beginPath(); ctx.arc(toolX+12+ph*18, toolY+14+pv*18, 2, 0, Math.PI*2); ctx.fill();
        }
        // Tools hanging: wrenches, socket sets, pliers, screwdrivers
        const toolDefs = [
          {x:toolX+8, y:toolY+22, w:6, h:24, c:"#8888AA"},  // wrench
          {x:toolX+18, y:toolY+20, w:8, h:22, c:"#AAAACC"}, // large wrench
          {x:toolX+30, y:toolY+24, w:5, h:18, c:"#8899AA"}, // screwdriver
          {x:toolX+40, y:toolY+22, w:5, h:18, c:"#AABB88"}, // screwdriver 2
          {x:toolX+50, y:toolY+20, w:10, h:14, c:"#8888AA"},// pliers
          {x:toolX+64, y:toolY+18, w:8, h:28, c:"#CCAA66"}, // torque wrench
          {x:toolX+8, y:toolY+54, w:12, h:8, c:"#FFAA00"},  // ratchet
          {x:toolX+26, y:toolY+52, w:8, h:12, c:"#AAAAAA"}, // socket
          {x:toolX+40, y:toolY+50, w:16, h:10, c:"#CCCCCC"},// breaker bar
          {x:toolX+60, y:toolY+52, w:12, h:18, c:"#887766"},// impact driver
        ];
        for (const td of toolDefs) {
          ctx.fillStyle = "#0a1008"; rr(td.x, td.y, td.w, td.h, 2); ctx.fill();
          ctx.fillStyle = td.c; ctx.fillRect(td.x+1, td.y+1, td.w-2, td.h-2);
        }
        // Spark plug tray
        ctx.fillStyle = "#1a2010"; rr(toolX+4, toolY+74, 72, 20, 2); ctx.fill();
        ctx.strokeStyle = "#4a5030"; ctx.lineWidth = 1; ctx.strokeRect(toolX+4, toolY+74, 72, 20);
        for (let sp=0;sp<6;sp++) {
          ctx.fillStyle = "#778860"; ctx.beginPath(); ctx.arc(toolX+10+sp*11, toolY+84, 3, 0, Math.PI*2); ctx.fill();
        }
        ctx.fillStyle = "#FFAA00"; ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
        ctx.fillText("TOOLS", toolX+40, toolY+106);

        // ── Hydraulic lift / jack (left of car) ───────────────────────────
        ctx.fillStyle = "#2a3040"; rr(cx-W*0.42, midY+4, 18, 24, 2); ctx.fill();
        ctx.strokeStyle = "#4a6080"; ctx.lineWidth = 1; ctx.strokeRect(cx-W*0.42, midY+4, 18, 24);
        ctx.fillStyle = "#5a7090"; ctx.fillRect(cx-W*0.42+6, midY-12, 6, 18); // piston
        // Hydraulic glow
        ctx.fillStyle = "rgba(0,150,255,0.20)"; ctx.fillRect(cx-W*0.42+7, midY-10, 4, 16);

        // ── Oil drum / waste barrel (bottom-left) ─────────────────────────
        ctx.fillStyle = "#2a2010"; ctx.strokeStyle = "#4a4020"; ctx.lineWidth = 1.5;
        rr(W*0.08, H*0.72, 24, 32, 3); ctx.fill(); ctx.stroke();
        for (let bd=0;bd<3;bd++) ctx.fillRect(W*0.08+2, H*0.72+6+bd*10, 20, 3); // bands
        // Oil spill
        ctx.fillStyle = "rgba(20,10,0,0.55)";
        ctx.beginPath(); ctx.ellipse(W*0.09+8, H*0.72+38, 18, 8, 0, 0, Math.PI*2); ctx.fill();

        // ── Spray paint booth (bottom-right corner) ───────────────────────
        ctx.fillStyle = "#0e1008"; rr(W*0.74, H*0.68, 54, 44, 3); ctx.fill();
        ctx.strokeStyle = "#3a4a2a"; ctx.lineWidth = 1; ctx.strokeRect(W*0.74, H*0.68, 54, 44);
        // Paint cans row
        const paintCols = ["#FF2200","#0044FF","#22CC00","#FFCC00","#CC00FF","#FF8800"];
        for (let pc=0;pc<6;pc++) {
          ctx.fillStyle = paintCols[pc]; ctx.shadowColor=paintCols[pc]; ctx.shadowBlur=3;
          rr(W*0.74+4+pc*8, H*0.68+6, 6, 16, [3,3,0,0]); ctx.fill();
          ctx.shadowBlur=0;
          // Cap
          ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(W*0.74+4+pc*8, H*0.68+4, 6, 4);
        }
        // Spray gun
        ctx.fillStyle = "#3a3a3a"; rr(W*0.74+8, H*0.68+26, 34, 12, 3); ctx.fill();
        ctx.fillStyle = "#555555"; ctx.fillRect(W*0.74+36, H*0.68+30, 16, 4);
        ctx.fillStyle = "#FFAA00"; ctx.font = "bold 6px monospace"; ctx.textAlign = "center";
        ctx.fillText("PAINT BOOTH", W*0.74+27, H*0.68+52);

        // ── Animated welding sparks near engine ───────────────────────────
        for (let ws2=0; ws2<5; ws2++) {
          const spark = Math.sin(tcs*8+ws2*1.4)*0.5+0.5;
          if (spark > 0.6) {
            ctx.fillStyle = `rgba(255,${180+ws2*12},0,${spark})`;
            ctx.beginPath(); ctx.arc(cx+30+(ws2%3)*8, midY-8+ws2*4, 2, 0, Math.PI*2); ctx.fill();
          }
        }

      } else {
      // CHOP SHOP (default)
      // ── Disassembled car parts (scattered) ───────
      const partPositions = [
        [cx - W * 0.4, topY + 8],
        [cx - W * 0.18, topY + 12],
        [cx + W * 0.1, topY + 6],
        [cx + W * 0.3, topY + 10],
      ];
      const partIcons = ["🔧", "⚙", "🔩", "🪛"];
      ctx.font = "14px serif";
      ctx.textAlign = "center";
      partPositions.forEach(([px2, py2], i) => {
        ctx.fillText(partIcons[i], px2, py2 + 14);
      });
      // Car body (partially stripped)
      ctx.fillStyle = "#1a2030";
      ctx.strokeStyle = "#3a4050";
      ctx.lineWidth = 1.5;
      rr(cx - 52, midY - 14, 104, 34, 4);
      ctx.fill();
      ctx.stroke();
      rr(cx - 36, midY - 26, 72, 14, 4);
      ctx.fill();
      ctx.stroke();
      // Missing wheel areas (stripped)
      ctx.strokeStyle = "#666";
      ctx.lineWidth = 2;
      rr(cx - 60, midY - 20, 120, 50, 4);
      ctx.fill();
      ctx.stroke();
      // Lift hydraulics
      ctx.fillStyle = "#4a6878";
      ctx.fillRect(cx - 55, midY + 30, 10, 25);
      ctx.fillRect(cx + 45, midY + 30, 10, 25);
      // Stripped car body on lift
      ctx.fillStyle = "#2a4050";
      ctx.strokeStyle = "#4a6878";
      ctx.lineWidth = 1.5;
      rr(cx - 45, midY - 15, 90, 30, 4);
      ctx.fill();
      ctx.stroke();
      // Car roof cutaway
      ctx.fillStyle = "#1a3040";
      rr(cx - 30, midY - 20, 60, 12, 3);
      ctx.fill();
      // Missing parts (holes)
      ctx.fillStyle = "#0a1520";
      ctx.beginPath();
      ctx.arc(cx - 30, midY + 8, 12, 0, Math.PI * 2);
      ctx.arc(cx + 30, midY + 8, 12, 0, Math.PI * 2);
      ctx.fill();
      // Sparks from cutting
      const sparkPulse = Math.sin(t * 6) * 0.5 + 0.5;
      if (sparkPulse > 0.6) {
        ctx.fillStyle = "#FFAA44";
        ctx.shadowColor = "#FF8800";
        ctx.shadowBlur = 8;
        for (let sp = 0; sp < 5; sp++) {
          const sx = cx - 20 + Math.random() * 40;
          const sy = midY - 10 + Math.random() * 20;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }
      // ── Tool pegboard (right) ─────────────────────
      ctx.fillStyle = "#1a1408";
      ctx.strokeStyle = "#556644";
      ctx.lineWidth = 1;
      rr(cx + W * 0.24, topY + 4, 50, 82, 2);
      ctx.fill();
      ctx.stroke();
      const chopTools = ["🔨", "🪚", "⛏", "🔧", "🪛", "🔩"];
      ctx.font = "13px serif";
      chopTools.forEach((t, i) =>
        ctx.fillText(
          t,
          cx + W * 0.24 + 14 + (i % 2) * 22,
          topY + 18 + Math.floor(i / 2) * 24,
        ),
      );
      } // end else (default chop shop)
    } else if (type === 22) {
      // RADIO STATION
      if (isDino) {
        // ═══ JUNGLE SAFARI: JUNGLE DRUMS RADIO STATION ═══
        const t = performance.now() / 1000;
        const LEAF="#66DD44"; const AMBER="#FFCC44"; const BONE="#F0E8C0"; const MOSS="#33881A";
        const BROWN="#5a3010";
        const LEAFr="102,221,68"; const AMBERr="255,204,68"; const MOSSr="51,136,26";

        // ── Floor: large jungle wood-plank tiles ──────────────────────
        const tileW=72, tileH=36;
        for (let gy=0; gy<=Math.ceil(H/tileH)+1; gy++) {
          for (let gx=0; gx<=Math.ceil(W/tileW)+1; gx++) {
            const tx=gx*tileW, ty2=gy*tileH, seed=gx*23+gy*17;
            ctx.fillStyle=seed%4===0?"rgba(12,30,6,0.92)":seed%4===1?"rgba(8,20,4,0.92)":seed%4===2?"rgba(14,34,7,0.92)":"rgba(10,25,5,0.92)";
            ctx.fillRect(tx,ty2,tileW,tileH);
            ctx.strokeStyle="rgba(102,221,68,0.07)"; ctx.lineWidth=0.5; ctx.strokeRect(tx,ty2,tileW,tileH);
            if (seed%7===0) { // wood grain lines
              ctx.strokeStyle="rgba(80,50,10,0.15)"; ctx.lineWidth=0.5;
              ctx.beginPath(); ctx.moveTo(tx+4,ty2); ctx.lineTo(tx+4,ty2+tileH); ctx.stroke();
            }
          }
        }

        // ── Outer border + inner frame ────────────────────────────────
        ctx.strokeStyle=`rgba(${LEAFr},${0.55+0.2*Math.sin(t*1.8)})`; ctx.lineWidth=3; ctx.strokeRect(2,2,W-4,H-4);
        ctx.strokeStyle=`rgba(${AMBERr},0.22)`; ctx.lineWidth=1.5; ctx.strokeRect(7,7,W-14,H-14);

        // ── Acoustic foam panels on all four walls ────────────────────
        const foamCols=["#1a3a0c","#142e09","#183810","#122808"];
        // top wall panels
        for (let pi=0;pi<14;pi++){
          const px2=14+pi*72+4, py2=room.S+4, pw=60, ph=28;
          ctx.fillStyle=foamCols[pi%4]; rr(px2,py2,pw,ph,4); ctx.fill();
          ctx.strokeStyle="rgba(102,221,68,0.12)"; ctx.lineWidth=0.8; ctx.stroke();
          // foam texture diamonds
          ctx.strokeStyle="rgba(102,221,68,0.08)"; ctx.lineWidth=0.5;
          ctx.beginPath(); ctx.moveTo(px2+pw/2,py2+2); ctx.lineTo(px2+pw-4,py2+ph/2); ctx.lineTo(px2+pw/2,py2+ph-2); ctx.lineTo(px2+4,py2+ph/2); ctx.closePath(); ctx.stroke();
        }
        // left wall panels
        for (let pi=0;pi<8;pi++){
          const px2=room.S+4, py2=room.S+44+pi*70, pw=28, ph=58;
          ctx.fillStyle=foamCols[pi%4]; rr(px2,py2,pw,ph,4); ctx.fill();
          ctx.strokeStyle="rgba(102,221,68,0.10)"; ctx.lineWidth=0.8; ctx.stroke();
        }
        // right wall panels
        for (let pi=0;pi<8;pi++){
          const px2=W-room.S-32, py2=room.S+44+pi*70, pw=28, ph=58;
          ctx.fillStyle=foamCols[pi%4]; rr(px2,py2,pw,ph,4); ctx.fill();
          ctx.strokeStyle="rgba(102,221,68,0.10)"; ctx.lineWidth=0.8; ctx.stroke();
        }

        // ── JUNGLE DRUMS RADIO banner sign ───────────────────────────
        const signW=480, signH=34, signX=W/2-signW/2, signY=room.S-30;
        const signGrad=ctx.createLinearGradient(signX,signY,signX+signW,signY);
        signGrad.addColorStop(0,"rgba(8,24,3,0.95)"); signGrad.addColorStop(0.4,"rgba(26,72,8,0.99)"); signGrad.addColorStop(0.6,"rgba(26,72,8,0.99)"); signGrad.addColorStop(1,"rgba(8,24,3,0.95)");
        ctx.fillStyle=signGrad; rr(signX,signY,signW,signH,8); ctx.fill();
        ctx.strokeStyle=`rgba(${LEAFr},${0.7+0.3*Math.sin(t*2.2)})`; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle=BONE; ctx.font="bold 15px monospace"; ctx.textAlign="center";
        ctx.shadowColor=LEAF; ctx.shadowBlur=14; ctx.fillText("🥁 JUNGLE DRUMS RADIO 🥁", W/2, signY+22); ctx.shadowBlur=0;

        // ── ON AIR + LIVE badges ──────────────────────────────────────
        const onAirAlpha=0.7+0.3*Math.sin(t*4);
        ctx.fillStyle=`rgba(200,30,10,${onAirAlpha})`; ctx.shadowColor="#CC1000"; ctx.shadowBlur=16*onAirAlpha;
        rr(W/2-48,topY+10,96,24,6); ctx.fill(); ctx.shadowBlur=0;
        ctx.strokeStyle=`rgba(255,90,60,${onAirAlpha})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#FFF"; ctx.font="bold 11px monospace"; ctx.textAlign="center"; ctx.fillText("● ON AIR", W/2, topY+26);
        // LIVE badge left of ON AIR
        const livePulse=Math.abs(Math.sin(t*2.5));
        ctx.fillStyle=`rgba(255,180,0,${0.6+0.4*livePulse})`; ctx.shadowColor=AMBER; ctx.shadowBlur=10*livePulse;
        rr(W/2-160,topY+12,58,20,5); ctx.fill(); ctx.shadowBlur=0;
        ctx.strokeStyle=AMBER; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#1a0800"; ctx.font="bold 9px monospace"; ctx.textAlign="center"; ctx.fillText("◉ LIVE", W/2-131, topY+25);

        // ── LEFT STUDIO: Tech workstation ────────────────────────────
        const lDeskX=room.S+50, lDeskY=topY+14, lDeskW=220, lDeskH=80;
        const lDeskGrad=ctx.createLinearGradient(lDeskX,lDeskY,lDeskX,lDeskY+lDeskH);
        lDeskGrad.addColorStop(0,"#1a3a0c"); lDeskGrad.addColorStop(1,"#0d1e07");
        ctx.fillStyle=lDeskGrad; rr(lDeskX,lDeskY,lDeskW,lDeskH,6); ctx.fill();
        ctx.strokeStyle=`rgba(${LEAFr},0.5)`; ctx.lineWidth=1.5; ctx.stroke();
        // Computer monitor (left)
        ctx.fillStyle="#0e1e0a"; rr(lDeskX+10,lDeskY-50,70,46,4); ctx.fill();
        ctx.strokeStyle=MOSS; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#001a00"; ctx.fillRect(lDeskX+14,lDeskY-46,62,38);
        // Screen content: waveform
        for (let bx=0;bx<16;bx++){
          const bh=4+Math.abs(Math.sin(t*3+bx*0.7))*18;
          ctx.fillStyle=`rgba(${LEAFr},${0.5+0.5*Math.abs(Math.sin(t*2+bx))})`;
          ctx.fillRect(lDeskX+16+bx*3.5,lDeskY-28-bh/2,2.5,bh);
        }
        ctx.fillStyle=BONE; ctx.font="4px monospace"; ctx.textAlign="left"; ctx.fillText("AUDIO ANALYZER",lDeskX+14,lDeskY-48+4);
        // Monitor stand
        ctx.fillStyle=BROWN; ctx.fillRect(lDeskX+41,lDeskY-4,8,8);
        ctx.fillRect(lDeskX+34,lDeskY+2,22,4);
        // Second monitor (right of first)
        ctx.fillStyle="#0e1e0a"; rr(lDeskX+94,lDeskY-50,70,46,4); ctx.fill();
        ctx.strokeStyle=MOSS; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#001a00"; ctx.fillRect(lDeskX+98,lDeskY-46,62,38);
        // Screen: track list
        for (let li2=0;li2<5;li2++){
          ctx.fillStyle=li2===1?AMBER:`rgba(${LEAFr},0.6)`;
          ctx.fillRect(lDeskX+102,lDeskY-42+li2*7,40,4);
          ctx.fillRect(lDeskX+146,lDeskY-42+li2*7,10,4);
        }
        ctx.fillStyle=BONE; ctx.font="4px monospace"; ctx.fillText("PLAYLIST",lDeskX+98,lDeskY-48+4);
        ctx.fillStyle=BROWN; ctx.fillRect(lDeskX+125,lDeskY-4,8,8); ctx.fillRect(lDeskX+118,lDeskY+2,22,4);
        // Mixer sliders on desk
        for (let si2=0;si2<6;si2++){
          const sx3=lDeskX+16+si2*30, sy=lDeskY+18;
          ctx.fillStyle="#0a1a06"; ctx.fillRect(sx3-2,sy,5,34);
          const sliderPos=14+Math.sin(t*1.5+si2)*10;
          ctx.fillStyle=si2%2===0?LEAF:AMBER; ctx.fillRect(sx3-5,sy+sliderPos,11,6);
        }
        // Coffee mug on left desk
        ctx.fillStyle="#3a1a08"; rr(lDeskX+192,lDeskY+20,18,22,3); ctx.fill();
        ctx.strokeStyle="#5a3010"; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#1a0800"; ctx.fillRect(lDeskX+195,lDeskY+22,12,8);
        ctx.strokeStyle="#3a1a08"; ctx.lineWidth=2; ctx.beginPath();
        ctx.arc(lDeskX+210,lDeskY+29,7,Math.PI*1.4,Math.PI*0.4); ctx.stroke();
        // Steam from mug
        for (let si2=0;si2<3;si2++){
          const sa=0.4+0.3*Math.sin(t*2.2+si2);
          ctx.strokeStyle=`rgba(220,200,180,${sa})`; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(lDeskX+197+si2*5,lDeskY+20);
          ctx.bezierCurveTo(lDeskX+193+si2*5,lDeskY+12,lDeskX+201+si2*5,lDeskY+10,lDeskX+197+si2*5,lDeskY+4);
          ctx.stroke();
        }
        // Notes/paper on left desk
        ctx.fillStyle="#f0e8c0"; rr(lDeskX+8,lDeskY+50,50,24,2); ctx.fill();
        ctx.strokeStyle="#c8b890"; ctx.lineWidth=0.5; ctx.stroke();
        for (let ln=0;ln<4;ln++) { ctx.strokeStyle="rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.moveTo(lDeskX+12,lDeskY+56+ln*5); ctx.lineTo(lDeskX+54,lDeskY+56+ln*5); ctx.stroke(); }
        ctx.fillStyle=BROWN; ctx.font="5px monospace"; ctx.textAlign="left"; ctx.fillText("RUNSHEET",lDeskX+10,lDeskY+54);
        // Desk label
        ctx.fillStyle=LEAF; ctx.font="bold 7px monospace"; ctx.textAlign="center";
        ctx.shadowColor=LEAF; ctx.shadowBlur=8; ctx.fillText("TECH DESK",lDeskX+lDeskW/2,lDeskY+lDeskH+14); ctx.shadowBlur=0;

        // ── CENTER BROADCAST DESK ─────────────────────────────────────
        const cDeskX=W/2-240, cDeskY=topY+14, cDeskW=480, cDeskH=90;
        const cDeskGrad=ctx.createLinearGradient(cDeskX,cDeskY,cDeskX,cDeskY+cDeskH);
        cDeskGrad.addColorStop(0,"#1e4210"); cDeskGrad.addColorStop(0.5,"#152e0b"); cDeskGrad.addColorStop(1,"#0a1e06");
        ctx.fillStyle=cDeskGrad; rr(cDeskX,cDeskY,cDeskW,cDeskH,8); ctx.fill();
        ctx.strokeStyle=`rgba(${LEAFr},${0.65+0.25*Math.sin(t*1.6)})`; ctx.lineWidth=2; ctx.stroke();
        // Main mixing console (top surface of desk)
        const mixX=cDeskX+20, mixY=cDeskY+10, mixW=440, mixH=50;
        ctx.fillStyle="#081408"; rr(mixX,mixY,mixW,mixH,5); ctx.fill();
        ctx.strokeStyle="rgba(102,221,68,0.3)"; ctx.lineWidth=1; ctx.stroke();
        // 12 fader channels on mixer
        const chanW=34;
        for (let ch=0;ch<12;ch++){
          const chx=mixX+8+ch*chanW;
          ctx.fillStyle="rgba(0,40,0,0.5)"; ctx.fillRect(chx,mixY+6,chanW-4,mixH-12);
          ctx.strokeStyle="rgba(102,221,68,0.15)"; ctx.lineWidth=0.5; ctx.strokeRect(chx,mixY+6,chanW-4,mixH-12);
          // fader track
          ctx.fillStyle="#0a0a0a"; ctx.fillRect(chx+13,mixY+10,4,mixH-22);
          const fPos=8+Math.abs(Math.sin(t*1.2+ch*0.8))*14;
          ctx.fillStyle=ch%3===0?LEAF:ch%3===1?AMBER:"#44CCFF";
          ctx.fillRect(chx+10,mixY+10+fPos,10,7);
          // channel VU dot
          const vuA=Math.abs(Math.sin(t*4+ch*0.6));
          ctx.fillStyle=`rgba(${ch%2===0?LEAFr:AMBERr},${0.4+0.6*vuA})`;
          ctx.beginPath(); ctx.arc(chx+15,mixY+mixH-6,2.5,0,Math.PI*2); ctx.fill();
        }
        // EQ knobs row
        for (let kn=0;kn<8;kn++){
          const knx=mixX+30+kn*52, kny=mixY-18;
          ctx.fillStyle="#1a2a12"; ctx.beginPath(); ctx.arc(knx,kny,8,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle=MOSS; ctx.lineWidth=1; ctx.stroke();
          const ang=t*0.5+kn;
          ctx.strokeStyle=LEAF; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(knx,kny); ctx.lineTo(knx+Math.cos(ang)*6, kny+Math.sin(ang)*6); ctx.stroke();
        }
        // Microphone stand center
        const micX=W/2, micY=cDeskY+cDeskH-4;
        ctx.strokeStyle=BONE; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(micX,micY); ctx.lineTo(micX-10,micY-50); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(micX-10,micY-50); ctx.lineTo(micX-30,micY-50); ctx.stroke(); // boom arm
        ctx.fillStyle="#2a2a2a"; rr(micX-34,micY-62,16,24,6); ctx.fill();
        ctx.strokeStyle="#444"; ctx.lineWidth=1; ctx.stroke();
        // mic capsule grill lines
        for (let ml=0;ml<3;ml++) { ctx.strokeStyle="rgba(180,180,180,0.4)"; ctx.lineWidth=0.5; ctx.beginPath(); ctx.moveTo(micX-34,micY-58+ml*6); ctx.lineTo(micX-18,micY-58+ml*6); ctx.stroke(); }
        // mic pop filter
        ctx.strokeStyle=`rgba(200,200,200,0.3)`; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.arc(micX-26,micY-52,14,0,Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(micX-26,micY-52,10,0,Math.PI*2); ctx.stroke();
        // Headphones hanging on mic stand
        ctx.strokeStyle="#2a2a30"; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.arc(micX+6,micY-34,8,Math.PI,0); ctx.stroke();
        ctx.fillStyle="#333"; ctx.beginPath(); ctx.ellipse(micX-2,micY-34,3,5,0,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(micX+14,micY-34,3,5,0,0,Math.PI*2); ctx.fill();
        // Water bottle on desk
        ctx.fillStyle="rgba(50,200,80,0.25)"; rr(cDeskX+430,cDeskY+14,14,36,4); ctx.fill();
        ctx.strokeStyle="rgba(50,200,80,0.5)"; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="rgba(50,200,80,0.15)"; ctx.fillRect(cDeskX+432,cDeskY+26,10,20);
        ctx.fillStyle="#2a4a1a"; rr(cDeskX+432,cDeskY+10,10,8,3); ctx.fill();
        // Center desk label
        ctx.fillStyle=AMBER; ctx.font="bold 8px monospace"; ctx.textAlign="center";
        ctx.shadowColor=AMBER; ctx.shadowBlur=10; ctx.fillText("BROADCAST DESK",W/2,cDeskY+cDeskH+14); ctx.shadowBlur=0;

        // ── RIGHT STUDIO: Producer workstation ───────────────────────
        const rDeskX=W-room.S-270, rDeskY=topY+14, rDeskW=220, rDeskH=80;
        const rDeskGrad=ctx.createLinearGradient(rDeskX,rDeskY,rDeskX,rDeskY+rDeskH);
        rDeskGrad.addColorStop(0,"#1a3a0c"); rDeskGrad.addColorStop(1,"#0d1e07");
        ctx.fillStyle=rDeskGrad; rr(rDeskX,rDeskY,rDeskW,rDeskH,6); ctx.fill();
        ctx.strokeStyle=`rgba(${AMBERr},0.5)`; ctx.lineWidth=1.5; ctx.stroke();
        // Wide curved monitor (producer)
        ctx.fillStyle="#0e1e0a"; rr(rDeskX+10,rDeskY-50,180,46,4); ctx.fill();
        ctx.strokeStyle=MOSS; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#001a00"; ctx.fillRect(rDeskX+14,rDeskY-46,172,38);
        // Screen: DAW piano roll view
        for (let row=0;row<6;row++){
          for (let col=0;col<22;col++){
            const note=(row*7+col*3)%14;
            if (note<6) {
              ctx.fillStyle=`rgba(${AMBERr},${0.4+0.4*(note/6)})`;
              ctx.fillRect(rDeskX+16+col*7,rDeskY-42+row*6,5+note,4);
            }
          }
        }
        ctx.fillStyle=BONE; ctx.font="4px monospace"; ctx.textAlign="left"; ctx.fillText("DAW — TRACK 07: JUNGLE GROOVE",rDeskX+14,rDeskY-48+4);
        // Monitor stand
        ctx.fillStyle=BROWN; ctx.fillRect(rDeskX+95,rDeskY-4,10,8); ctx.fillRect(rDeskX+82,rDeskY+2,36,4);
        // Vinyl records on desk (stacked)
        for (let vr=0;vr<3;vr++){
          ctx.fillStyle="#1a0a0a"; ctx.beginPath(); ctx.arc(rDeskX+190-vr*2,rDeskY+40-vr*3,16,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle="#333"; ctx.lineWidth=0.8; ctx.stroke();
          ctx.fillStyle="#2a1a1a"; ctx.beginPath(); ctx.arc(rDeskX+190-vr*2,rDeskY+40-vr*3,5,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle=AMBER; ctx.lineWidth=0.5; ctx.beginPath(); ctx.arc(rDeskX+190-vr*2,rDeskY+40-vr*3,11,0,Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.arc(rDeskX+190-vr*2,rDeskY+40-vr*3,8,0,Math.PI*2); ctx.stroke();
        }
        // Script/notes on right desk
        ctx.fillStyle="#f0e8c0"; rr(rDeskX+8,rDeskY+50,70,24,2); ctx.fill();
        ctx.strokeStyle="#c8b890"; ctx.lineWidth=0.5; ctx.stroke();
        for (let ln=0;ln<4;ln++) { ctx.strokeStyle="rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.moveTo(rDeskX+12,rDeskY+56+ln*5); ctx.lineTo(rDeskX+74,rDeskY+56+ln*5); ctx.stroke(); }
        ctx.fillStyle=BROWN; ctx.font="5px monospace"; ctx.textAlign="left"; ctx.fillText("SHOW SCRIPT",rDeskX+10,rDeskY+54);
        // Pen on script
        ctx.strokeStyle="#3a1a08"; ctx.lineWidth=2; ctx.lineCap="round";
        ctx.beginPath(); ctx.moveTo(rDeskX+60,rDeskY+52); ctx.lineTo(rDeskX+78,rDeskY+68); ctx.stroke();
        ctx.lineCap="butt";
        // Right desk label
        ctx.fillStyle=AMBER; ctx.font="bold 7px monospace"; ctx.textAlign="center";
        ctx.shadowColor=AMBER; ctx.shadowBlur=8; ctx.fillText("PRODUCER DESK",rDeskX+rDeskW/2,rDeskY+rDeskH+14); ctx.shadowBlur=0;

        // ── Left wall: Equipment rack ─────────────────────────────────
        const rackX=room.S+6, rackY=topY+120, rackW=44, rackH=160;
        ctx.fillStyle="#0a0e08"; rr(rackX,rackY,rackW,rackH,4); ctx.fill();
        ctx.strokeStyle="rgba(102,221,68,0.3)"; ctx.lineWidth=1; ctx.stroke();
        // rack units
        const rackUnits=["EQ","COMP","REVERB","DELAY","LIMITER","POWER"];
        for (let ru=0;ru<6;ru++){
          const ruy=rackY+8+ru*24;
          ctx.fillStyle="#121e0c"; rr(rackX+4,ruy,rackW-8,18,2); ctx.fill();
          ctx.strokeStyle="rgba(102,221,68,0.2)"; ctx.lineWidth=0.5; ctx.stroke();
          const vu2=0.5+0.5*Math.abs(Math.sin(t*2.5+ru));
          ctx.fillStyle=ru<3?`rgba(${LEAFr},${vu2})`:`rgba(${AMBERr},${vu2})`;
          ctx.beginPath(); ctx.arc(rackX+rackW-10,ruy+9,3,0,Math.PI*2); ctx.fill();
          ctx.fillStyle=BONE; ctx.font="4px monospace"; ctx.textAlign="left";
          ctx.fillText(rackUnits[ru],rackX+8,ruy+12);
        }
        // rack VU meter bar
        for (let vb=0;vb<8;vb++){
          const vh=4+Math.abs(Math.sin(t*3+vb))*10;
          ctx.fillStyle=vb<5?`rgba(${LEAFr},0.7)`:`rgba(255,60,0,0.8)`;
          ctx.fillRect(rackX+4+vb*5,rackY+rackH-18,4,vh);
        }

        // ── Right wall: Awards & trophies shelf ───────────────────────
        const shelfX=W-room.S-58, shelfY=topY+118, shelfW=52, shelfH=8;
        ctx.fillStyle=BROWN; rr(shelfX,shelfY,shelfW,shelfH,2); ctx.fill();
        ctx.strokeStyle="#3a2010"; ctx.lineWidth=1; ctx.stroke();
        // Trophy 1: gold cup
        ctx.fillStyle="#c8a000"; rr(shelfX+5,shelfY-32,14,30,2); ctx.fill();
        ctx.fillStyle="#a88000"; ctx.fillRect(shelfX+3,shelfY-10,18,4);
        ctx.fillStyle="#c8a000"; ctx.fillRect(shelfX+7,shelfY-4,10,4);
        ctx.fillStyle="#f0c000"; ctx.beginPath(); ctx.arc(shelfX+12,shelfY-34,8,Math.PI,0); ctx.fill();
        ctx.shadowColor="#f0c000"; ctx.shadowBlur=8+4*Math.abs(Math.sin(t*2));
        ctx.fillStyle="#f0c000"; ctx.beginPath(); ctx.arc(shelfX+12,shelfY-34,5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        // Trophy 2: crystal microphone
        ctx.fillStyle="rgba(100,220,180,0.5)"; rr(shelfX+24,shelfY-28,10,26,3); ctx.fill();
        ctx.strokeStyle="rgba(100,220,180,0.8)"; ctx.lineWidth=0.8; ctx.stroke();
        ctx.fillStyle="#4a9a70"; ctx.beginPath(); ctx.arc(shelfX+29,shelfY-32,6,0,Math.PI*2); ctx.fill();
        // Award plaque
        ctx.fillStyle="#8a5a20"; rr(shelfX+38,shelfY-26,12,24,2); ctx.fill();
        ctx.fillStyle=AMBER; ctx.font="4px monospace"; ctx.textAlign="center"; ctx.fillText("#1",shelfX+44,shelfY-14);
        ctx.fillText("FM",shelfX+44,shelfY-8);
        // Second shelf
        ctx.fillStyle=BROWN; rr(shelfX,shelfY+44,shelfW,shelfH,2); ctx.fill();
        ctx.strokeStyle="#3a2010"; ctx.lineWidth=1; ctx.stroke();
        // Framed photo
        ctx.fillStyle="#2a1a08"; rr(shelfX+4,shelfY+18,20,24,1); ctx.fill();
        ctx.fillStyle="#1a3a10"; ctx.fillRect(shelfX+6,shelfY+20,16,20);
        ctx.strokeStyle=AMBER; ctx.lineWidth=0.8; ctx.strokeRect(shelfX+6,shelfY+20,16,20);
        // Small plant
        ctx.fillStyle="#1a2a0a"; ctx.beginPath(); ctx.arc(shelfX+40,shelfY+44,6,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=MOSS; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(shelfX+40,shelfY+38); ctx.lineTo(shelfX+36,shelfY+28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(shelfX+40,shelfY+36); ctx.lineTo(shelfX+44,shelfY+26); ctx.stroke();
        ctx.fillStyle=LEAF; ctx.beginPath(); ctx.ellipse(shelfX+35,shelfY+26,5,3,0.4,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(shelfX+45,shelfY+24,5,3,-0.4,0,Math.PI*2); ctx.fill();

        // ── Vine antenna tower (back wall, right-center) ─────────────
        const antX=W*0.75, antBaseY=topY+14;
        ctx.strokeStyle='#1e3c10'; ctx.lineWidth=4;
        ctx.beginPath(); ctx.moveTo(antX,antBaseY+110); ctx.lineTo(antX,antBaseY); ctx.stroke();
        // cross beams
        for (let bi=0;bi<6;bi++){
          const by2=antBaseY+10+bi*17;
          const bw=14-bi*1.5;
          ctx.strokeStyle=MOSS; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(antX-bw,by2); ctx.lineTo(antX+bw,by2); ctx.stroke();
          // vines
          ctx.strokeStyle=LEAF; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(antX+bw,by2); ctx.bezierCurveTo(antX+bw+6,by2+4,antX+bw+8,by2+10,antX+bw+4,by2+14); ctx.stroke();
          ctx.fillStyle=LEAF; ctx.beginPath(); ctx.ellipse(antX+bw+4,by2+14,3,2,0.4,0,Math.PI*2); ctx.fill();
        }
        ctx.fillStyle=AMBER; ctx.shadowColor=AMBER; ctx.shadowBlur=10+6*Math.abs(Math.sin(t*3));
        ctx.beginPath(); ctx.arc(antX,antBaseY,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        // signal rings from antenna
        for (let sr=0;sr<4;sr++){
          const sRad=(((t*50+sr*30)%120)+10);
          const sAlpha=Math.max(0,1-sRad/120)*0.5;
          ctx.strokeStyle=`rgba(${AMBERr},${sAlpha})`; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.arc(antX,antBaseY,sRad,0,Math.PI*2); ctx.stroke();
        }

        // ── Left corner: corner jungle potted plant ───────────────────
        const cpx=room.S+36, cpy=H-room.S-50;
        ctx.fillStyle="#3a1808"; rr(cpx-18,cpy,36,32,4); ctx.fill();
        ctx.strokeStyle="#2a1006"; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#2a1408"; ctx.fillRect(cpx-16,cpy+8,32,12);
        ctx.strokeStyle=MOSS; ctx.lineWidth=2;
        for (let pl=0;pl<5;pl++){
          const pang=-0.8+pl*0.4;
          ctx.beginPath(); ctx.moveTo(cpx,cpy); ctx.quadraticCurveTo(cpx+Math.cos(pang)*20,cpy-20,cpx+Math.cos(pang)*36,cpy-36-pl*4); ctx.stroke();
          ctx.fillStyle=LEAF; ctx.beginPath(); ctx.ellipse(cpx+Math.cos(pang)*36,cpy-36-pl*4,8+pl,4,pang+0.3,0,Math.PI*2); ctx.fill();
        }

        // ── Right corner: corner jungle potted plant ──────────────────
        const cpx2=W-room.S-36, cpy2=H-room.S-50;
        ctx.fillStyle="#3a1808"; rr(cpx2-18,cpy2,36,32,4); ctx.fill();
        ctx.strokeStyle="#2a1006"; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#2a1408"; ctx.fillRect(cpx2-16,cpy2+8,32,12);
        ctx.strokeStyle=MOSS; ctx.lineWidth=2;
        for (let pl=0;pl<5;pl++){
          const pang=0.8-pl*0.4+Math.PI;
          ctx.beginPath(); ctx.moveTo(cpx2,cpy2); ctx.quadraticCurveTo(cpx2+Math.cos(pang)*20,cpy2-20,cpx2+Math.cos(pang)*36,cpy2-36-pl*4); ctx.stroke();
          ctx.fillStyle=LEAF; ctx.beginPath(); ctx.ellipse(cpx2+Math.cos(pang)*36,cpy2-36-pl*4,8+pl,4,pang-0.3,0,Math.PI*2); ctx.fill();
        }

        // ── Broadcast chair (center, visible behind desk) ─────────────
        const chairX=W/2, chairY=cDeskY+cDeskH+10;
        ctx.fillStyle="#1a3a0c"; rr(chairX-20,chairY,40,28,4); ctx.fill(); // seat
        ctx.strokeStyle=MOSS; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#122808"; rr(chairX-22,chairY-28,44,32,4); ctx.fill(); // back
        ctx.strokeStyle=MOSS; ctx.lineWidth=1; ctx.stroke();
        // armrests
        ctx.fillStyle="#1a3a0c"; rr(chairX-30,chairY-4,10,22,3); ctx.fill();
        rr(chairX+20,chairY-4,10,22,3); ctx.fill();
        // chair legs
        ctx.strokeStyle=BROWN; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(chairX-14,chairY+28); ctx.lineTo(chairX-18,chairY+46); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(chairX+14,chairY+28); ctx.lineTo(chairX+18,chairY+46); ctx.stroke();

        // ── 3 work chairs (for workers) ───────────────────────────────
        for (const wcx of [W*0.20, W*0.50, W*0.80]) {
          const wcy=cDeskY+cDeskH+8;
          ctx.fillStyle="#122a0a"; rr(wcx-16,wcy,32,22,3); ctx.fill();
          ctx.strokeStyle="rgba(102,221,68,0.25)"; ctx.lineWidth=0.8; ctx.stroke();
          ctx.fillStyle="#0e2208"; rr(wcx-18,wcy-22,36,26,3); ctx.fill();
          ctx.strokeStyle="rgba(102,221,68,0.18)"; ctx.lineWidth=0.8; ctx.stroke();
        }

        // ── Floor cable snakes ────────────────────────────────────────
        const cables=[
          {x1:lDeskX+lDeskW,y1:lDeskY+40,x2:cDeskX,y2:cDeskY+40,col:"#2a4a1a"},
          {x1:cDeskX+cDeskW,y1:cDeskY+40,x2:rDeskX,y2:rDeskY+40,col:"#2a4a1a"},
          {x1:rackX+rackW,y1:rackY+rackH/2,x2:cDeskX,y2:cDeskY+60,col:"#3a2a0a"},
          {x1:W/2,y1:cDeskY+cDeskH,x2:W/2,y2:H-room.S-20,col:"#1a2a1a"},
        ];
        for (const cb of cables){
          ctx.strokeStyle=cb.col; ctx.lineWidth=2; ctx.lineCap="round";
          ctx.beginPath(); ctx.moveTo(cb.x1,cb.y1); ctx.bezierCurveTo((cb.x1+cb.x2)/2,cb.y1+20,(cb.x1+cb.x2)/2,cb.y2-20,cb.x2,cb.y2); ctx.stroke();
          ctx.lineCap="butt";
        }

        // ── Drum kit in bottom-left area ──────────────────────────────
        const dkX=room.S+60, dkY=H-room.S-130;
        // bass drum
        ctx.fillStyle="#2a1a08"; ctx.beginPath(); ctx.ellipse(dkX,dkY,36,26,0,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=AMBER; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#3a2810"; ctx.beginPath(); ctx.ellipse(dkX,dkY,28,20,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=BONE; ctx.font="6px monospace"; ctx.textAlign="center"; ctx.fillText("JUNGLE",dkX,dkY-3); ctx.fillText("DRUMS",dkX,dkY+5);
        // snare
        ctx.fillStyle="#2a1a08"; ctx.beginPath(); ctx.ellipse(dkX+60,dkY-20,16,12,0.2,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=LEAF; ctx.lineWidth=1; ctx.stroke();
        // hi-hat
        ctx.fillStyle="#c8a000"; ctx.beginPath(); ctx.ellipse(dkX+90,dkY-30,12,4,0.1,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#a08000"; ctx.beginPath(); ctx.ellipse(dkX+90,dkY-36,11,3.5,0.1,0,Math.PI*2); ctx.fill();
        // drum stand rod
        ctx.strokeStyle="#3a3020"; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(dkX+90,dkY-32); ctx.lineTo(dkX+90,dkY+10); ctx.stroke();
        // drumsticks
        ctx.strokeStyle=BROWN; ctx.lineWidth=2; ctx.lineCap="round";
        ctx.beginPath(); ctx.moveTo(dkX+36,dkY-60); ctx.lineTo(dkX+14,dkY-20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(dkX+50,dkY-55); ctx.lineTo(dkX+24,dkY-18); ctx.stroke();
        ctx.lineCap="butt";

        // ── Congas in bottom-right area ───────────────────────────────
        const cgX=W-room.S-130, cgY=H-room.S-110;
        for (let ci=0;ci<3;ci++){
          const cx2=cgX+ci*52, cr=20-ci*2;
          ctx.fillStyle="#3a1808"; ctx.beginPath(); ctx.ellipse(cx2,cgY,cr,cr*0.7,0,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle=AMBER; ctx.lineWidth=1.2; ctx.stroke();
          ctx.fillStyle="#2a1006"; ctx.beginPath(); ctx.ellipse(cx2,cgY,cr*0.7,cr*0.5,0,0,Math.PI*2); ctx.fill();
          // conga body
          ctx.strokeStyle="#3a1808"; ctx.lineWidth=3;
          ctx.beginPath(); ctx.moveTo(cx2-cr,cgY); ctx.lineTo(cx2-cr+4,cgY+40); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx2+cr,cgY); ctx.lineTo(cx2+cr-4,cgY+40); ctx.stroke();
          ctx.fillStyle="#2a0a00"; rr(cx2-cr+4,cgY+38,cr*2-8,10,2); ctx.fill();
        }

        // ── Soundwave visualization (animated EQ bars mid-floor) ──────
        const eqY=H-room.S-60, eqCount=32;
        for (let eq=0;eq<eqCount;eq++){
          const eqx=W*0.12+eq*(W*0.76/eqCount);
          const eqh=6+Math.abs(Math.sin(t*4.5+eq*0.5+Math.cos(t*1.3+eq*0.2)))*28;
          const col=eq<eqCount/3?LEAFr:eq<eqCount*2/3?AMBERr:"102,221,200";
          ctx.fillStyle=`rgba(${col},${0.35+0.35*Math.abs(Math.sin(t*3+eq*0.4))})`;
          ctx.fillRect(eqx-2,eqY-eqh,4,eqh);
        }
        ctx.fillStyle=`rgba(${LEAFr},0.25)`; ctx.fillRect(W*0.12,eqY,W*0.76,1);

        // ── Ambient floating leaf particles ───────────────────────────
        for (let i=0;i<14;i++){
          const px2=(t*16+i*75)%W, py2=room.S*1.5+Math.sin(t*0.9+i*1.1)*30+(i*(H*0.6))/14;
          const alpha=Math.sin(t*1.6+i*0.7)*0.25+0.35;
          ctx.fillStyle=i%3===0?`rgba(${LEAFr},${alpha})`:i%3===1?`rgba(${AMBERr},${alpha})`:`rgba(${MOSSr},${alpha})`;
          ctx.beginPath(); ctx.arc(px2,py2,i%5===0?2.5:1.2,0,Math.PI*2); ctx.fill();
        }

        // ── Side wall glow strips ─────────────────────────────────────
        const glowA=`rgba(${LEAFr},${0.15+0.08*Math.sin(t*1.4)})`;
        ctx.fillStyle=glowA; ctx.fillRect(0,H/2-80,3,160); ctx.fillRect(W-3,H/2-80,3,160);
        return;
      }
      if (isJungle) {
        // ═══ JUNGLE SAFARI: JUNGLE BEATS RADIO STATION ═══
        const t = performance.now() / 1000;
        const LEAF="#66DD44"; const AMBER="#FFCC44"; const BONE="#F0E8C0"; const MOSS="#33881A";
        const BROWN="#5a3010";
        const LEAFr="102,221,68"; const AMBERr="255,204,68"; const MOSSr="51,136,26";

        // ── Floor: wide jungle wood planks ───────────────────────────
        const tileW=80, tileH=40;
        for (let gy=0; gy<=Math.ceil(H/tileH)+1; gy++) {
          for (let gx=0; gx<=Math.ceil(W/tileW)+1; gx++) {
            const tx=gx*tileW, ty2=gy*tileH, seed=gx*23+gy*17;
            ctx.fillStyle=seed%4===0?"rgba(10,26,5,0.92)":seed%4===1?"rgba(7,18,3,0.92)":seed%4===2?"rgba(12,28,6,0.92)":"rgba(9,22,4,0.92)";
            ctx.fillRect(tx,ty2,tileW,tileH);
            ctx.strokeStyle="rgba(102,221,68,0.06)"; ctx.lineWidth=0.5; ctx.strokeRect(tx,ty2,tileW,tileH);
            if (seed%7===0) { ctx.strokeStyle="rgba(70,40,8,0.18)"; ctx.lineWidth=0.5; ctx.beginPath(); ctx.moveTo(tx+5,ty2); ctx.lineTo(tx+5,ty2+tileH); ctx.stroke(); }
          }
        }

        // ── Outer border glow ────────────────────────────────────────
        ctx.strokeStyle=`rgba(${LEAFr},${0.55+0.2*Math.sin(t*1.8)})`; ctx.lineWidth=3; ctx.strokeRect(2,2,W-4,H-4);
        ctx.strokeStyle=`rgba(${AMBERr},0.22)`; ctx.lineWidth=1.5; ctx.strokeRect(7,7,W-14,H-14);

        // ── Acoustic foam panels — all four walls ─────────────────────
        const foamCols=["#1a3a0c","#142e09","#183810","#122808"];
        for (let pi=0;pi<13;pi++) { // top wall
          const fpx=14+pi*78+4, fpy=room.S+4, fpw=66, fph=28;
          ctx.fillStyle=foamCols[pi%4]; rr(fpx,fpy,fpw,fph,4); ctx.fill();
          ctx.strokeStyle="rgba(102,221,68,0.10)"; ctx.lineWidth=0.8; ctx.stroke();
          ctx.strokeStyle="rgba(102,221,68,0.07)"; ctx.lineWidth=0.5;
          ctx.beginPath(); ctx.moveTo(fpx+fpw/2,fpy+2); ctx.lineTo(fpx+fpw-4,fpy+fph/2); ctx.lineTo(fpx+fpw/2,fpy+fph-2); ctx.lineTo(fpx+4,fpy+fph/2); ctx.closePath(); ctx.stroke();
        }
        for (let pi=0;pi<7;pi++) { // left wall panels
          ctx.fillStyle=foamCols[pi%4]; rr(room.S+4,room.S+44+pi*72,28,60,4); ctx.fill();
          ctx.strokeStyle="rgba(102,221,68,0.08)"; ctx.lineWidth=0.8; ctx.stroke();
        }
        for (let pi=0;pi<7;pi++) { // right wall panels
          ctx.fillStyle=foamCols[pi%4]; rr(W-room.S-32,room.S+44+pi*72,28,60,4); ctx.fill();
          ctx.strokeStyle="rgba(102,221,68,0.08)"; ctx.lineWidth=0.8; ctx.stroke();
        }

        // ── "JUNGLE BEATS RADIO" banner sign ─────────────────────────
        const signW2=500, signH2=34, signX2=W/2-signW2/2, signY2=room.S-30;
        const sGrad=ctx.createLinearGradient(signX2,signY2,signX2+signW2,signY2);
        sGrad.addColorStop(0,"rgba(6,20,2,0.95)"); sGrad.addColorStop(0.4,"rgba(22,60,6,0.99)"); sGrad.addColorStop(0.6,"rgba(22,60,6,0.99)"); sGrad.addColorStop(1,"rgba(6,20,2,0.95)");
        ctx.fillStyle=sGrad; rr(signX2,signY2,signW2,signH2,8); ctx.fill();
        ctx.strokeStyle=`rgba(${LEAFr},${0.7+0.3*Math.sin(t*2.2)})`; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle=BONE; ctx.font="bold 15px monospace"; ctx.textAlign="center";
        ctx.shadowColor=LEAF; ctx.shadowBlur=14; ctx.fillText("🌿 JUNGLE BEATS RADIO 🌿", W/2, signY2+22); ctx.shadowBlur=0;

        // ── ON AIR + LIVE badges ──────────────────────────────────────
        const onAirA2=0.7+0.3*Math.sin(t*4);
        ctx.fillStyle=`rgba(200,30,10,${onAirA2})`; ctx.shadowColor="#CC1000"; ctx.shadowBlur=16*onAirA2;
        rr(W/2-50,topY+10,100,24,6); ctx.fill(); ctx.shadowBlur=0;
        ctx.strokeStyle=`rgba(255,90,60,${onAirA2})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#FFF"; ctx.font="bold 11px monospace"; ctx.textAlign="center"; ctx.fillText("● ON AIR", W/2, topY+26);
        const liveP2=Math.abs(Math.sin(t*2.5));
        ctx.fillStyle=`rgba(255,180,0,${0.6+0.4*liveP2})`; ctx.shadowColor=AMBER; ctx.shadowBlur=10*liveP2;
        rr(W/2-168,topY+12,58,20,5); ctx.fill(); ctx.shadowBlur=0;
        ctx.strokeStyle=AMBER; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#1a0800"; ctx.font="bold 9px monospace"; ctx.textAlign="center"; ctx.fillText("◉ LIVE", W/2-139,topY+25);

        // ── LEFT workstation — Tech desk ──────────────────────────────
        const lDX=room.S+50, lDY=topY+14, lDW=220, lDH=80;
        const lDG=ctx.createLinearGradient(lDX,lDY,lDX,lDY+lDH);
        lDG.addColorStop(0,"#1a3a0c"); lDG.addColorStop(1,"#0d1e07");
        ctx.fillStyle=lDG; rr(lDX,lDY,lDW,lDH,6); ctx.fill();
        ctx.strokeStyle=`rgba(${LEAFr},0.5)`; ctx.lineWidth=1.5; ctx.stroke();
        // monitor 1
        ctx.fillStyle="#0e1e0a"; rr(lDX+10,lDY-50,68,44,4); ctx.fill();
        ctx.strokeStyle=MOSS; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#001a00"; ctx.fillRect(lDX+14,lDY-46,60,36);
        for (let bx=0;bx<15;bx++) { const bh2=4+Math.abs(Math.sin(t*3+bx*0.7))*16; ctx.fillStyle=`rgba(${LEAFr},${0.5+0.5*Math.abs(Math.sin(t*2+bx))})`; ctx.fillRect(lDX+16+bx*3.7,lDY-28-bh2/2,2.5,bh2); }
        ctx.fillStyle=BONE; ctx.font="4px monospace"; ctx.textAlign="left"; ctx.fillText("AUDIO ANALYZER",lDX+14,lDY-47);
        ctx.fillStyle=BROWN; ctx.fillRect(lDX+40,lDY-4,8,8); ctx.fillRect(lDX+33,lDY+2,22,4);
        // monitor 2
        ctx.fillStyle="#0e1e0a"; rr(lDX+92,lDY-50,68,44,4); ctx.fill();
        ctx.strokeStyle=MOSS; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#001a00"; ctx.fillRect(lDX+96,lDY-46,60,36);
        for (let li3=0;li3<5;li3++) { ctx.fillStyle=li3===1?AMBER:`rgba(${LEAFr},0.6)`; ctx.fillRect(lDX+100,lDY-42+li3*7,36,4); ctx.fillRect(lDX+140,lDY-42+li3*7,10,4); }
        ctx.fillStyle=BONE; ctx.font="4px monospace"; ctx.fillText("PLAYLIST",lDX+96,lDY-47);
        ctx.fillStyle=BROWN; ctx.fillRect(lDX+122,lDY-4,8,8); ctx.fillRect(lDX+115,lDY+2,22,4);
        // mixer sliders
        for (let si3=0;si3<6;si3++) { const sx4=lDX+16+si3*30,sy4=lDY+18; ctx.fillStyle="#0a1a06"; ctx.fillRect(sx4-2,sy4,5,34); const slP=14+Math.sin(t*1.5+si3)*10; ctx.fillStyle=si3%2===0?LEAF:AMBER; ctx.fillRect(sx4-5,sy4+slP,11,6); }
        // coffee mug
        ctx.fillStyle="#3a1a08"; rr(lDX+192,lDY+20,18,22,3); ctx.fill(); ctx.strokeStyle="#5a3010"; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#1a0800"; ctx.fillRect(lDX+195,lDY+22,12,8);
        ctx.strokeStyle="#3a1a08"; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(lDX+210,lDY+29,7,Math.PI*1.4,Math.PI*0.4); ctx.stroke();
        for (let si4=0;si4<3;si4++) { const sa2=0.35+0.25*Math.sin(t*2.2+si4); ctx.strokeStyle=`rgba(220,200,180,${sa2})`; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(lDX+197+si4*5,lDY+20); ctx.bezierCurveTo(lDX+193+si4*5,lDY+12,lDX+201+si4*5,lDY+10,lDX+197+si4*5,lDY+4); ctx.stroke(); }
        // notes
        ctx.fillStyle="#f0e8c0"; rr(lDX+8,lDY+50,50,24,2); ctx.fill();
        ctx.strokeStyle="#c8b890"; ctx.lineWidth=0.5; ctx.stroke();
        for (let ln2=0;ln2<4;ln2++) { ctx.strokeStyle="rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.moveTo(lDX+12,lDY+56+ln2*5); ctx.lineTo(lDX+54,lDY+56+ln2*5); ctx.stroke(); }
        ctx.fillStyle=BROWN; ctx.font="5px monospace"; ctx.textAlign="left"; ctx.fillText("RUNSHEET",lDX+10,lDY+54);
        ctx.fillStyle=LEAF; ctx.font="bold 7px monospace"; ctx.textAlign="center"; ctx.shadowColor=LEAF; ctx.shadowBlur=8; ctx.fillText("TECH DESK",lDX+lDW/2,lDY+lDH+14); ctx.shadowBlur=0;

        // ── CENTER broadcast desk ──────────────────────────────────────
        const cDX=W/2-240, cDY=topY+14, cDW=480, cDH=90;
        const cDG=ctx.createLinearGradient(cDX,cDY,cDX,cDY+cDH);
        cDG.addColorStop(0,"#1e4210"); cDG.addColorStop(0.5,"#152e0b"); cDG.addColorStop(1,"#0a1e06");
        ctx.fillStyle=cDG; rr(cDX,cDY,cDW,cDH,8); ctx.fill();
        ctx.strokeStyle=`rgba(${LEAFr},${0.65+0.25*Math.sin(t*1.6)})`; ctx.lineWidth=2; ctx.stroke();
        // 12-channel mixing console
        const mixX2=cDX+20, mixY2=cDY+10, mixW2=440, mixH2=50;
        ctx.fillStyle="#081408"; rr(mixX2,mixY2,mixW2,mixH2,5); ctx.fill();
        ctx.strokeStyle="rgba(102,221,68,0.3)"; ctx.lineWidth=1; ctx.stroke();
        for (let ch=0;ch<12;ch++) {
          const chx2=mixX2+8+ch*34;
          ctx.fillStyle="rgba(0,40,0,0.5)"; ctx.fillRect(chx2,mixY2+6,30,mixH2-12);
          ctx.strokeStyle="rgba(102,221,68,0.12)"; ctx.lineWidth=0.5; ctx.strokeRect(chx2,mixY2+6,30,mixH2-12);
          ctx.fillStyle="#0a0a0a"; ctx.fillRect(chx2+12,mixY2+10,4,mixH2-22);
          const fP2=8+Math.abs(Math.sin(t*1.2+ch*0.8))*14;
          ctx.fillStyle=ch%3===0?LEAF:ch%3===1?AMBER:"#44CCFF"; ctx.fillRect(chx2+9,mixY2+10+fP2,12,7);
          const vuA2=Math.abs(Math.sin(t*4+ch*0.6));
          ctx.fillStyle=`rgba(${ch%2===0?LEAFr:AMBERr},${0.4+0.6*vuA2})`; ctx.beginPath(); ctx.arc(chx2+15,mixY2+mixH2-6,2.5,0,Math.PI*2); ctx.fill();
        }
        // EQ knobs
        for (let kn2=0;kn2<8;kn2++) { const knx2=mixX2+30+kn2*52, kny2=mixY2-18; ctx.fillStyle="#1a2a12"; ctx.beginPath(); ctx.arc(knx2,kny2,8,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=MOSS; ctx.lineWidth=1; ctx.stroke(); const ang2=t*0.5+kn2; ctx.strokeStyle=LEAF; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(knx2,kny2); ctx.lineTo(knx2+Math.cos(ang2)*6,kny2+Math.sin(ang2)*6); ctx.stroke(); }
        // mic stand center
        const micX2=W/2, micY2=cDY+cDH-4;
        ctx.strokeStyle=BONE; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(micX2,micY2); ctx.lineTo(micX2-10,micY2-50); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(micX2-10,micY2-50); ctx.lineTo(micX2-30,micY2-50); ctx.stroke();
        ctx.fillStyle="#2a2a2a"; rr(micX2-34,micY2-62,16,24,6); ctx.fill(); ctx.strokeStyle="#444"; ctx.lineWidth=1; ctx.stroke();
        for (let ml2=0;ml2<3;ml2++) { ctx.strokeStyle="rgba(180,180,180,0.35)"; ctx.lineWidth=0.5; ctx.beginPath(); ctx.moveTo(micX2-34,micY2-58+ml2*6); ctx.lineTo(micX2-18,micY2-58+ml2*6); ctx.stroke(); }
        ctx.strokeStyle="rgba(200,200,200,0.28)"; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.arc(micX2-26,micY2-52,14,0,Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(micX2-26,micY2-52,10,0,Math.PI*2); ctx.stroke();
        // water bottle
        ctx.fillStyle="rgba(50,200,80,0.25)"; rr(cDX+cDW-28,cDY+14,14,36,4); ctx.fill(); ctx.strokeStyle="rgba(50,200,80,0.5)"; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#2a4a1a"; rr(cDX+cDW-26,cDY+10,10,8,3); ctx.fill();
        ctx.fillStyle=AMBER; ctx.font="bold 8px monospace"; ctx.textAlign="center"; ctx.shadowColor=AMBER; ctx.shadowBlur=10; ctx.fillText("BROADCAST DESK",W/2,cDY+cDH+14); ctx.shadowBlur=0;

        // ── RIGHT workstation — Producer desk ─────────────────────────
        const rDX=W-room.S-270, rDY=topY+14, rDW=220, rDH=80;
        const rDG=ctx.createLinearGradient(rDX,rDY,rDX,rDY+rDH);
        rDG.addColorStop(0,"#1a3a0c"); rDG.addColorStop(1,"#0d1e07");
        ctx.fillStyle=rDG; rr(rDX,rDY,rDW,rDH,6); ctx.fill();
        ctx.strokeStyle=`rgba(${AMBERr},0.5)`; ctx.lineWidth=1.5; ctx.stroke();
        // wide DAW monitor
        ctx.fillStyle="#0e1e0a"; rr(rDX+10,rDY-50,180,46,4); ctx.fill(); ctx.strokeStyle=MOSS; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#001a00"; ctx.fillRect(rDX+14,rDY-46,172,38);
        for (let row2=0;row2<6;row2++) for (let col2=0;col2<22;col2++) { const note2=(row2*7+col2*3)%14; if (note2<6) { ctx.fillStyle=`rgba(${AMBERr},${0.4+0.4*(note2/6)})`; ctx.fillRect(rDX+16+col2*7,rDY-42+row2*6,4+note2,4); } }
        ctx.fillStyle=BONE; ctx.font="4px monospace"; ctx.textAlign="left"; ctx.fillText("DAW — JUNGLE GROOVE",rDX+14,rDY-47);
        ctx.fillStyle=BROWN; ctx.fillRect(rDX+95,rDY-4,10,8); ctx.fillRect(rDX+82,rDY+2,36,4);
        // vinyl records
        for (let vr2=0;vr2<3;vr2++) { ctx.fillStyle="#1a0a0a"; ctx.beginPath(); ctx.arc(rDX+190-vr2*2,rDY+40-vr2*3,16,0,Math.PI*2); ctx.fill(); ctx.strokeStyle="#333"; ctx.lineWidth=0.8; ctx.stroke(); ctx.fillStyle="#2a1a1a"; ctx.beginPath(); ctx.arc(rDX+190-vr2*2,rDY+40-vr2*3,5,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=AMBER; ctx.lineWidth=0.5; ctx.beginPath(); ctx.arc(rDX+190-vr2*2,rDY+40-vr2*3,11,0,Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.arc(rDX+190-vr2*2,rDY+40-vr2*3,8,0,Math.PI*2); ctx.stroke(); }
        // script
        ctx.fillStyle="#f0e8c0"; rr(rDX+8,rDY+50,70,24,2); ctx.fill(); ctx.strokeStyle="#c8b890"; ctx.lineWidth=0.5; ctx.stroke();
        for (let ln3=0;ln3<4;ln3++) { ctx.strokeStyle="rgba(0,0,0,0.22)"; ctx.beginPath(); ctx.moveTo(rDX+12,rDY+56+ln3*5); ctx.lineTo(rDX+74,rDY+56+ln3*5); ctx.stroke(); }
        ctx.fillStyle=BROWN; ctx.font="5px monospace"; ctx.textAlign="left"; ctx.fillText("SHOW SCRIPT",rDX+10,rDY+54);
        ctx.strokeStyle="#3a1a08"; ctx.lineWidth=2; ctx.lineCap="round"; ctx.beginPath(); ctx.moveTo(rDX+60,rDY+52); ctx.lineTo(rDX+78,rDY+68); ctx.stroke(); ctx.lineCap="butt";
        ctx.fillStyle=AMBER; ctx.font="bold 7px monospace"; ctx.textAlign="center"; ctx.shadowColor=AMBER; ctx.shadowBlur=8; ctx.fillText("PRODUCER DESK",rDX+rDW/2,rDY+rDH+14); ctx.shadowBlur=0;

        // ── Left equipment rack ───────────────────────────────────────
        const rackX2=room.S+6, rackY2=topY+120, rackW2=44, rackH2=160;
        ctx.fillStyle="#0a0e08"; rr(rackX2,rackY2,rackW2,rackH2,4); ctx.fill();
        ctx.strokeStyle="rgba(102,221,68,0.3)"; ctx.lineWidth=1; ctx.stroke();
        const rackUnits2=["EQ","COMP","REVERB","DELAY","LIMITER","POWER"];
        for (let ru2=0;ru2<6;ru2++) { const ruy2=rackY2+8+ru2*24; ctx.fillStyle="#121e0c"; rr(rackX2+4,ruy2,rackW2-8,18,2); ctx.fill(); ctx.strokeStyle="rgba(102,221,68,0.15)"; ctx.lineWidth=0.5; ctx.stroke(); const vu3=0.5+0.5*Math.abs(Math.sin(t*2.5+ru2)); ctx.fillStyle=ru2<3?`rgba(${LEAFr},${vu3})`:`rgba(${AMBERr},${vu3})`; ctx.beginPath(); ctx.arc(rackX2+rackW2-10,ruy2+9,3,0,Math.PI*2); ctx.fill(); ctx.fillStyle=BONE; ctx.font="4px monospace"; ctx.textAlign="left"; ctx.fillText(rackUnits2[ru2],rackX2+8,ruy2+12); }
        for (let vb2=0;vb2<8;vb2++) { const vh2=4+Math.abs(Math.sin(t*3+vb2))*10; ctx.fillStyle=vb2<5?`rgba(${LEAFr},0.7)`:`rgba(255,60,0,0.8)`; ctx.fillRect(rackX2+4+vb2*5,rackY2+rackH2-18,4,vh2); }

        // ── Right awards shelf ────────────────────────────────────────
        const shX2=W-room.S-58, shY2=topY+118;
        ctx.fillStyle=BROWN; rr(shX2,shY2,52,8,2); ctx.fill(); ctx.strokeStyle="#3a2010"; ctx.lineWidth=1; ctx.stroke();
        // gold trophy
        ctx.fillStyle="#c8a000"; rr(shX2+5,shY2-32,14,30,2); ctx.fill();
        ctx.fillStyle="#a88000"; ctx.fillRect(shX2+3,shY2-10,18,4);
        ctx.fillStyle="#c8a000"; ctx.fillRect(shX2+7,shY2-4,10,4);
        ctx.fillStyle="#f0c000"; ctx.beginPath(); ctx.arc(shX2+12,shY2-34,8,Math.PI,0); ctx.fill();
        ctx.shadowColor="#f0c000"; ctx.shadowBlur=8+4*Math.abs(Math.sin(t*2));
        ctx.beginPath(); ctx.arc(shX2+12,shY2-34,5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        // crystal mic
        ctx.fillStyle="rgba(100,220,180,0.5)"; rr(shX2+24,shY2-28,10,26,3); ctx.fill(); ctx.strokeStyle="rgba(100,220,180,0.8)"; ctx.lineWidth=0.8; ctx.stroke();
        ctx.fillStyle="#4a9a70"; ctx.beginPath(); ctx.arc(shX2+29,shY2-32,6,0,Math.PI*2); ctx.fill();
        // plaque
        ctx.fillStyle="#8a5a20"; rr(shX2+38,shY2-26,12,24,2); ctx.fill();
        ctx.fillStyle=AMBER; ctx.font="4px monospace"; ctx.textAlign="center"; ctx.fillText("#1",shX2+44,shY2-14); ctx.fillText("FM",shX2+44,shY2-8);
        // second shelf
        ctx.fillStyle=BROWN; rr(shX2,shY2+44,52,8,2); ctx.fill(); ctx.strokeStyle="#3a2010"; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#2a1a08"; rr(shX2+4,shY2+18,20,24,1); ctx.fill(); ctx.fillStyle="#1a3a10"; ctx.fillRect(shX2+6,shY2+20,16,20); ctx.strokeStyle=AMBER; ctx.lineWidth=0.8; ctx.strokeRect(shX2+6,shY2+20,16,20);
        ctx.fillStyle="#1a2a0a"; ctx.beginPath(); ctx.arc(shX2+40,shY2+44,6,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=MOSS; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(shX2+40,shY2+38); ctx.lineTo(shX2+36,shY2+28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(shX2+40,shY2+36); ctx.lineTo(shX2+44,shY2+26); ctx.stroke();
        ctx.fillStyle=LEAF; ctx.beginPath(); ctx.ellipse(shX2+35,shY2+26,5,3,0.4,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(shX2+45,shY2+24,5,3,-0.4,0,Math.PI*2); ctx.fill();

        // ── Vine antenna tower (back wall, center-right) ──────────────
        const antX2=W*0.74, antBY=topY+14;
        ctx.strokeStyle='#1e3c10'; ctx.lineWidth=4;
        ctx.beginPath(); ctx.moveTo(antX2,antBY+110); ctx.lineTo(antX2,antBY); ctx.stroke();
        for (let bi2=0;bi2<6;bi2++) { const byw=antBY+10+bi2*17, bww=14-bi2*1.5; ctx.strokeStyle=MOSS; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(antX2-bww,byw); ctx.lineTo(antX2+bww,byw); ctx.stroke(); ctx.strokeStyle=LEAF; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(antX2+bww,byw); ctx.bezierCurveTo(antX2+bww+6,byw+4,antX2+bww+8,byw+10,antX2+bww+4,byw+14); ctx.stroke(); ctx.fillStyle=LEAF; ctx.beginPath(); ctx.ellipse(antX2+bww+4,byw+14,3,2,0.4,0,Math.PI*2); ctx.fill(); }
        ctx.fillStyle=AMBER; ctx.shadowColor=AMBER; ctx.shadowBlur=10+6*Math.abs(Math.sin(t*3));
        ctx.beginPath(); ctx.arc(antX2,antBY,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        for (let sr2=0;sr2<4;sr2++) { const sR2=(((t*50+sr2*30)%120)+10), sA2=Math.max(0,1-sR2/120)*0.5; ctx.strokeStyle=`rgba(${AMBERr},${sA2})`; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(antX2,antBY,sR2,0,Math.PI*2); ctx.stroke(); }

        // ── Work chairs for 3 workers ──────────────────────────────────
        for (const wcx2 of [W*0.20, W*0.50, W*0.80]) {
          const wcy2=cDY+cDH+8;
          ctx.fillStyle="#122a0a"; rr(wcx2-16,wcy2,32,22,3); ctx.fill();
          ctx.strokeStyle="rgba(102,221,68,0.25)"; ctx.lineWidth=0.8; ctx.stroke();
          ctx.fillStyle="#0e2208"; rr(wcx2-18,wcy2-22,36,26,3); ctx.fill();
          ctx.strokeStyle="rgba(102,221,68,0.18)"; ctx.lineWidth=0.8; ctx.stroke();
        }

        // ── Floor cables ───────────────────────────────────────────────
        ctx.lineCap="round";
        const cables2=[{x1:lDX+lDW,y1:lDY+40,x2:cDX,y2:cDY+40,col:"#2a4a1a"},{x1:cDX+cDW,y1:cDY+40,x2:rDX,y2:rDY+40,col:"#2a4a1a"},{x1:rackX2+rackW2,y1:rackY2+rackH2/2,x2:cDX,y2:cDY+60,col:"#3a2a0a"}];
        for (const cb2 of cables2) { ctx.strokeStyle=cb2.col; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(cb2.x1,cb2.y1); ctx.bezierCurveTo((cb2.x1+cb2.x2)/2,cb2.y1+20,(cb2.x1+cb2.x2)/2,cb2.y2-20,cb2.x2,cb2.y2); ctx.stroke(); }
        ctx.lineCap="butt";

        // ── Drum kit bottom-left ───────────────────────────────────────
        const dkX2=room.S+60, dkY2=H-room.S-130;
        ctx.fillStyle="#2a1a08"; ctx.beginPath(); ctx.ellipse(dkX2,dkY2,36,26,0,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=AMBER; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#3a2810"; ctx.beginPath(); ctx.ellipse(dkX2,dkY2,28,20,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=BONE; ctx.font="6px monospace"; ctx.textAlign="center"; ctx.fillText("JUNGLE",dkX2,dkY2-3); ctx.fillText("BEATS",dkX2,dkY2+5);
        ctx.fillStyle="#2a1a08"; ctx.beginPath(); ctx.ellipse(dkX2+60,dkY2-20,16,12,0.2,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=LEAF; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#c8a000"; ctx.beginPath(); ctx.ellipse(dkX2+90,dkY2-30,12,4,0.1,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#a08000"; ctx.beginPath(); ctx.ellipse(dkX2+90,dkY2-36,11,3.5,0.1,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle="#3a3020"; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(dkX2+90,dkY2-32); ctx.lineTo(dkX2+90,dkY2+10); ctx.stroke();
        ctx.strokeStyle=BROWN; ctx.lineWidth=2; ctx.lineCap="round";
        ctx.beginPath(); ctx.moveTo(dkX2+36,dkY2-60); ctx.lineTo(dkX2+14,dkY2-20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(dkX2+50,dkY2-55); ctx.lineTo(dkX2+24,dkY2-18); ctx.stroke(); ctx.lineCap="butt";

        // ── Congas bottom-right ────────────────────────────────────────
        const cgX2=W-room.S-130, cgY2=H-room.S-110;
        for (let ci2=0;ci2<3;ci2++) { const cx3=cgX2+ci2*52, cr2=20-ci2*2; ctx.fillStyle="#3a1808"; ctx.beginPath(); ctx.ellipse(cx3,cgY2,cr2,cr2*0.7,0,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=AMBER; ctx.lineWidth=1.2; ctx.stroke(); ctx.fillStyle="#2a1006"; ctx.beginPath(); ctx.ellipse(cx3,cgY2,cr2*0.7,cr2*0.5,0,0,Math.PI*2); ctx.fill(); ctx.strokeStyle="#3a1808"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(cx3-cr2,cgY2); ctx.lineTo(cx3-cr2+4,cgY2+40); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx3+cr2,cgY2); ctx.lineTo(cx3+cr2-4,cgY2+40); ctx.stroke(); ctx.fillStyle="#2a0a00"; rr(cx3-cr2+4,cgY2+38,cr2*2-8,10,2); ctx.fill(); }

        // ── Potted jungle plants corners ───────────────────────────────
        for (const [cpx3,cpd] of [[room.S+36, 1],[W-room.S-36, -1]]) {
          const cpy3=H-room.S-50;
          ctx.fillStyle="#3a1808"; rr(cpx3-18,cpy3,36,32,4); ctx.fill(); ctx.strokeStyle="#2a1006"; ctx.lineWidth=1; ctx.stroke();
          ctx.strokeStyle=MOSS; ctx.lineWidth=2;
          for (let pl2=0;pl2<5;pl2++) { const pang2=(-0.8+pl2*0.4)*cpd; ctx.beginPath(); ctx.moveTo(cpx3,cpy3); ctx.quadraticCurveTo(cpx3+Math.cos(pang2)*20,cpy3-20,cpx3+Math.cos(pang2)*36,cpy3-36-pl2*4); ctx.stroke(); ctx.fillStyle=LEAF; ctx.beginPath(); ctx.ellipse(cpx3+Math.cos(pang2)*36,cpy3-36-pl2*4,8+pl2,4,pang2+0.3*cpd,0,Math.PI*2); ctx.fill(); }
        }

        // ── Animated EQ bars across floor ─────────────────────────────
        const eqY2=H-room.S-60;
        for (let eq2=0;eq2<32;eq2++) { const eqx2=W*0.12+eq2*(W*0.76/32); const eqh2=6+Math.abs(Math.sin(t*4.5+eq2*0.5+Math.cos(t*1.3+eq2*0.2)))*28; const col2=eq2<11?LEAFr:eq2<22?AMBERr:"102,221,200"; ctx.fillStyle=`rgba(${col2},${0.3+0.35*Math.abs(Math.sin(t*3+eq2*0.4))})`; ctx.fillRect(eqx2-2,eqY2-eqh2,4,eqh2); }
        ctx.fillStyle=`rgba(${LEAFr},0.2)`; ctx.fillRect(W*0.12,eqY2,W*0.76,1);

        // ── Ambient leaf particles ─────────────────────────────────────
        for (let i2=0;i2<14;i2++) { const px4=(t*16+i2*75)%W, py4=room.S*1.5+Math.sin(t*0.9+i2*1.1)*30+(i2*(H*0.55))/14; const alpha2=Math.sin(t*1.6+i2*0.7)*0.25+0.35; ctx.fillStyle=i2%3===0?`rgba(${LEAFr},${alpha2})`:i2%3===1?`rgba(${AMBERr},${alpha2})`:`rgba(${MOSSr},${alpha2})`; ctx.beginPath(); ctx.arc(px4,py4,i2%5===0?2.5:1.2,0,Math.PI*2); ctx.fill(); }

        // ── Wall glow strips ───────────────────────────────────────────
        const glA2=`rgba(${LEAFr},${0.15+0.08*Math.sin(t*1.4)})`;
        ctx.fillStyle=glA2; ctx.fillRect(0,H/2-80,3,160); ctx.fillRect(W-3,H/2-80,3,160);
        return;
      }
      if (isDesert) {
        // ═══ DESERT SANDS: PYRAMID RADIO — VOICE OF THE SANDS ═══
        const t = performance.now() / 1000;
        const GOLD="#FFD060"; const AMBER="#FF9900"; const SAND="#E8C060"; const TERRA="#C06010";
        const GOLDr="255,208,96"; const AMBERr="255,153,0"; const SANDr="232,192,96";

        // ── Sandstone tile floor ──────────────────────────────────────
        const tileSize = 48;
        for (let gy = 0; gy < Math.ceil(H / tileSize) + 1; gy++) {
          for (let gx = 0; gx < Math.ceil(W / tileSize) + 1; gx++) {
            const tx = gx * tileSize, ty = gy * tileSize;
            const seed = gx * 17 + gy * 11;
            ctx.fillStyle = seed % 3 === 0 ? "rgba(28,18,4,0.92)"
                          : seed % 3 === 1 ? "rgba(22,14,2,0.90)"
                          : "rgba(32,20,6,0.90)";
            ctx.fillRect(tx, ty, tileSize, tileSize);
            ctx.strokeStyle = `rgba(${GOLDr},0.08)`;
            ctx.lineWidth = 0.5;
            ctx.strokeRect(tx, ty, tileSize, tileSize);
            if (seed % 7 === 0) {
              ctx.fillStyle = `rgba(${AMBERr},0.10)`;
              ctx.fillRect(tx + 12, ty + 20, 8, 2);
              ctx.fillRect(tx + 20, ty + 14, 2, 8);
            }
          }
        }

        // ── Room border — golden sandstone ───────────────────────────
        ctx.strokeStyle = `rgba(${GOLDr},0.6)`;
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, W - 4, H - 4);
        ctx.strokeStyle = `rgba(${AMBERr},0.2)`;
        ctx.lineWidth = 1;
        ctx.strokeRect(6, 6, W - 12, H - 12);

        // ── Title sign — VOICE OF THE SANDS ──────────────────────────
        const signW = 380, signH = 32;
        const signX = W / 2 - signW / 2, signY = room.S - 28;
        const signGrad = ctx.createLinearGradient(signX, signY, signX + signW, signY);
        signGrad.addColorStop(0, "rgba(60,30,0,0.92)");
        signGrad.addColorStop(0.5, "rgba(140,80,0,0.98)");
        signGrad.addColorStop(1, "rgba(60,30,0,0.92)");
        ctx.fillStyle = signGrad;
        rr(signX, signY, signW, signH, 7);
        ctx.fill();
        ctx.strokeStyle = `rgba(${GOLDr},${0.7 + 0.3 * Math.sin(t * 2.4)})`;
        ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = GOLD;
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.shadowColor = AMBER; ctx.shadowBlur = 10;
        ctx.fillText("⬡  VOICE OF THE SANDS  ⬡", W / 2, signY + 22);
        ctx.shadowBlur = 0;

        // ── ON AIR blinking sign ──────────────────────────────────────
        const onAirA = 0.7 + 0.3 * Math.sin(t * 4);
        ctx.fillStyle = `rgba(200,80,0,${onAirA})`;
        ctx.shadowColor = "#CC5500"; ctx.shadowBlur = 14 * onAirA;
        rr(W / 2 - 46, topY + 34, 92, 22, 5); ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(${AMBERr},${onAirA})`; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
        ctx.fillText("● ON AIR", W / 2, topY + 49);

        // ── LIVE badge ───────────────────────────────────────────────
        const livePulse = Math.abs(Math.sin(t * 2.5));
        ctx.fillStyle = `rgba(255,200,0,${0.7 + 0.3 * livePulse})`;
        rr(W / 2 + 56, topY + 36, 52, 18, 4); ctx.fill();
        ctx.strokeStyle = `rgba(${GOLDr},0.8)`; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = "#1a0a00"; ctx.font = "bold 9px monospace"; ctx.textAlign = "center";
        ctx.fillText("● LIVE", W / 2 + 82, topY + 48);

        // ── Acoustic foam panels — sand-wedge texture ─────────────────
        const panelCount = 6, panelGap = 6;
        const totalPanelW = W - 32;
        const panelW2 = (totalPanelW - (panelCount - 1) * panelGap) / panelCount;
        for (let pi = 0; pi < panelCount; pi++) {
          const px = 16 + pi * (panelW2 + panelGap);
          ctx.fillStyle = "#1c1004"; ctx.strokeStyle = `rgba(${AMBERr},0.28)`; ctx.lineWidth = 1;
          rr(px, topY + 6, panelW2, 26, 3); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#2a1808";
          const cols = Math.floor(panelW2 / 12);
          for (let ri = 0; ri < 2; ri++) {
            for (let ci = 0; ci < cols; ci++) {
              ctx.beginPath();
              ctx.moveTo(px + 4 + ci * 12, topY + 8 + ri * 12 + 10);
              ctx.lineTo(px + 4 + ci * 12 + 10, topY + 8 + ri * 12 + 10);
              ctx.lineTo(px + 4 + ci * 12 + 5, topY + 8 + ri * 12);
              ctx.closePath(); ctx.fill();
            }
          }
        }

        // ── Main broadcast desk — wide stone slab ─────────────────────
        const deskWd = Math.floor(W * 0.65), deskHd = 42;
        const deskXd = cx - deskWd / 2, deskYd = topY + 62;
        const deskGrad2 = ctx.createLinearGradient(deskXd, deskYd, deskXd + deskWd, deskYd);
        deskGrad2.addColorStop(0, "#2a1800"); deskGrad2.addColorStop(0.5, "#3c2400"); deskGrad2.addColorStop(1, "#2a1800");
        ctx.fillStyle = deskGrad2; rr(deskXd, deskYd, deskWd, deskHd, 6); ctx.fill();
        ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
        ctx.shadowColor = GOLD; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
        // Stone slab highlight
        ctx.fillStyle = `rgba(${GOLDr},0.06)`; ctx.fillRect(deskXd + 4, deskYd + 3, deskWd - 8, 8);

        // Mixing console faders (14 channels)
        for (let ci = 0; ci < 14; ci++) {
          const ch = 8 + 22 * Math.abs(Math.sin(t * 3.5 + ci * 0.6));
          ctx.fillStyle = ci < 5 ? TERRA : ci < 9 ? AMBER : GOLD;
          ctx.fillRect(deskXd + 10 + ci * Math.floor((deskWd - 20) / 14), deskYd + 38 - ch, Math.floor((deskWd - 20) / 14) - 2, ch);
          ctx.fillStyle = ci % 3 === 0 ? GOLD : AMBER;
          ctx.beginPath();
          ctx.arc(deskXd + 10 + ci * Math.floor((deskWd - 20) / 14) + 6, deskYd + 24, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        // VU bar
        for (let vi = 0; vi < 18; vi++) {
          ctx.fillStyle = vi < 7 ? GOLD : vi < 12 ? AMBER : TERRA;
          ctx.fillRect(deskXd + 10 + vi * Math.floor((deskWd - 20) / 18), deskYd + 6, Math.floor((deskWd - 20) / 18) - 1, 8);
        }
        // Mic on desk
        ctx.fillStyle = SAND; ctx.strokeStyle = AMBER; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(deskXd + deskWd - 24, deskYd + 14, 6, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(deskXd + deskWd - 24, deskYd + 24); ctx.lineTo(deskXd + deskWd - 24, deskYd + 36); ctx.stroke();
        // Coffee mug (papyrus cup)
        ctx.fillStyle = "#E8C080"; ctx.strokeStyle = AMBER; ctx.lineWidth = 1;
        rr(deskXd + 14, deskYd + 20, 14, 16, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(40,20,0,0.7)"; ctx.fillRect(deskXd + 16, deskYd + 22, 10, 10);
        for (let si = 0; si < 2; si++) {
          ctx.strokeStyle = `rgba(${GOLDr},${0.3 + 0.15 * Math.sin(t * 2 + si)})`; ctx.lineWidth = 0.8; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(deskXd + 19 + si * 4 + Math.sin(t * 2 + si) * 2, deskYd + 20);
          ctx.lineTo(deskXd + 17 + si * 4 - Math.sin(t * 2 + si) * 2, deskYd + 14); ctx.stroke();
          ctx.lineCap = "butt";
        }

        // ── Left tech desk ────────────────────────────────────────────
        const lDeskX = W * 0.07, lDeskY = H * 0.41;
        ctx.fillStyle = "#2a1800"; ctx.strokeStyle = `rgba(${AMBERr},0.5)`; ctx.lineWidth = 1.5;
        rr(lDeskX, lDeskY, 88, 44, 4); ctx.fill(); ctx.stroke();
        // Dual monitors
        ctx.fillStyle = "#0a0602"; ctx.strokeStyle = `rgba(${GOLDr},0.4)`; ctx.lineWidth = 1;
        rr(lDeskX + 5, lDeskY + 4, 34, 28, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#1a0c00"; ctx.fillRect(lDeskX + 7, lDeskY + 6, 30, 22);
        // Waveform on monitor
        ctx.strokeStyle = `rgba(${GOLDr},0.85)`; ctx.lineWidth = 1; ctx.beginPath();
        for (let wx = 0; wx < 28; wx += 2) {
          const wy = lDeskY + 17 + 6 * Math.sin(t * 5 + wx * 0.3);
          wx === 0 ? ctx.moveTo(lDeskX + 8 + wx, wy) : ctx.lineTo(lDeskX + 8 + wx, wy);
        }
        ctx.stroke();
        rr(lDeskX + 46, lDeskY + 4, 34, 28, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#120a00"; ctx.fillRect(lDeskX + 48, lDeskY + 6, 30, 22);
        // Playlist on second monitor
        ctx.fillStyle = GOLD; ctx.font = "bold 4px monospace"; ctx.textAlign = "left";
        ["▶ DAWN HYMN","  NILE FLOW","  SAND WIND"].forEach((tr, ti) => {
          ctx.fillStyle = ti === 0 ? GOLD : `rgba(${AMBERr},0.6)`;
          ctx.fillText(tr, lDeskX + 49, lDeskY + 14 + ti * 8);
        });
        // Scroll (papyrus) on desk
        ctx.fillStyle = "#D4A860"; ctx.strokeStyle = TERRA; ctx.lineWidth = 0.8;
        rr(lDeskX + 4, lDeskY + 36, 40, 6, 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = `rgba(${AMBERr},0.3)`; ctx.lineWidth = 0.5;
        for (let li = 0; li < 4; li++) {
          ctx.beginPath(); ctx.moveTo(lDeskX + 8 + li * 9, lDeskY + 37); ctx.lineTo(lDeskX + 8 + li * 9, lDeskY + 41); ctx.stroke();
        }

        // ── Right producer desk ───────────────────────────────────────
        const rDeskX = W * 0.73, rDeskY = H * 0.41;
        ctx.fillStyle = "#2a1800"; ctx.strokeStyle = `rgba(${AMBERr},0.5)`; ctx.lineWidth = 1.5;
        rr(rDeskX, rDeskY, 88, 44, 4); ctx.fill(); ctx.stroke();
        // Wide DAW monitor
        ctx.fillStyle = "#0a0602"; ctx.strokeStyle = `rgba(${GOLDr},0.4)`; ctx.lineWidth = 1;
        rr(rDeskX + 4, rDeskY + 4, 80, 28, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#160e00"; ctx.fillRect(rDeskX + 6, rDeskY + 6, 76, 24);
        // Piano roll on DAW
        for (let pr = 0; pr < 8; pr++) {
          const prX = rDeskX + 8 + pr * 9;
          ctx.fillStyle = pr % 3 === 0 ? `rgba(${GOLDr},0.7)` : pr % 3 === 1 ? `rgba(${AMBERr},0.5)` : `rgba(${SANDr},0.3)`;
          ctx.fillRect(prX, rDeskY + 10 + Math.floor(Math.abs(Math.sin(t * 2 + pr)) * 10), 7, 4 + Math.floor(Math.abs(Math.sin(t * 1.5 + pr * 0.7)) * 8));
        }
        ctx.fillStyle = GOLD; ctx.font = "bold 4px monospace"; ctx.textAlign = "center";
        ctx.fillText("DESERT SESSION", rDeskX + 44, rDeskY + 30);
        // Vinyl records stacked on desk
        for (let vi = 0; vi < 4; vi++) {
          ctx.fillStyle = vi % 2 === 0 ? "#1a0800" : "#240e00";
          ctx.strokeStyle = `rgba(${AMBERr},0.4)`; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(rDeskX + 10 + vi * 3, rDeskY + 38, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = TERRA; ctx.beginPath(); ctx.arc(rDeskX + 10 + vi * 3, rDeskY + 38, 1.5, 0, Math.PI * 2); ctx.fill();
        }

        // ── Equipment rack (left wall) ────────────────────────────────
        const rackXd = W * 0.04, rackYd = H * 0.58;
        ctx.fillStyle = "#1a0e02"; ctx.strokeStyle = `rgba(${AMBERr},0.45)`; ctx.lineWidth = 1.5;
        rr(rackXd, rackYd, 64, 120, 4); ctx.fill(); ctx.stroke();
        const rackUnitsD = [
          { col: GOLD, label: "AMP" }, { col: AMBER, label: "EQ" },
          { col: SAND, label: "COMP" }, { col: TERRA, label: "FX" },
          { col: GOLD, label: "OUT" }, { col: AMBER, label: "PRE" },
        ];
        for (let ri = 0; ri < rackUnitsD.length; ri++) {
          const ru = rackUnitsD[ri];
          const ruy = rackYd + 8 + ri * 18;
          ctx.fillStyle = "#110800"; ctx.strokeStyle = ru.col + "55"; ctx.lineWidth = 1;
          ctx.fillRect(rackXd + 4, ruy, 56, 14);
          ctx.strokeRect(rackXd + 4, ruy, 56, 14);
          ctx.fillStyle = ru.col; ctx.shadowColor = ru.col; ctx.shadowBlur = 4;
          ctx.fillRect(rackXd + 7, ruy + 4, 5, 6); ctx.shadowBlur = 0;
          ctx.fillStyle = "#2a1400"; ctx.beginPath(); ctx.arc(rackXd + 52, ruy + 7, 4, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = ru.col + "88"; ctx.lineWidth = 0.8; ctx.stroke();
          ctx.fillStyle = ru.col; ctx.font = "4px monospace"; ctx.textAlign = "center";
          ctx.fillText(ru.label, rackXd + 32, ruy + 9);
        }
        ctx.fillStyle = `rgba(${GOLDr},0.5)`; ctx.font = "bold 5px monospace"; ctx.textAlign = "center";
        ctx.fillText("RACK", rackXd + 32, rackYd + 114);

        // ── Obelisk broadcast tower (right wall) ─────────────────────
        const towerXd = W - 66, towerBaseYd = H * 0.78;
        ctx.strokeStyle = AMBER; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(towerXd, towerBaseYd); ctx.lineTo(towerXd - 20, towerBaseYd - 88); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(towerXd, towerBaseYd); ctx.lineTo(towerXd + 20, towerBaseYd - 88); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(towerXd - 13, towerBaseYd - 34); ctx.lineTo(towerXd + 13, towerBaseYd - 34); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(towerXd - 17, towerBaseYd - 62); ctx.lineTo(towerXd + 17, towerBaseYd - 62); ctx.stroke();
        for (let wi = 0; wi < 4; wi++) {
          const wa = 0.18 + 0.12 * Math.sin(t * 3 + wi);
          ctx.strokeStyle = `rgba(${GOLDr},${wa})`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(towerXd, towerBaseYd - 92, 12 + wi * 14, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        }
        const blinkD = Math.sin(t * 4) > 0;
        ctx.fillStyle = blinkD ? `rgba(${AMBERr},0.9)` : TERRA;
        ctx.shadowColor = AMBER; ctx.shadowBlur = blinkD ? 12 : 4;
        ctx.beginPath(); ctx.arc(towerXd, towerBaseYd - 92, 5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // ── Three studio booths (bottom half) ────────────────────────
        for (let bi = 0; bi < 3; bi++) {
          const bx = 24 + bi * Math.floor((W - 48) / 3), by = H * 0.60;
          const bw = Math.floor((W - 48) / 3) - 6, bh = Math.floor(H * 0.31);
          ctx.fillStyle = "#160c02"; ctx.strokeStyle = bi === 1 ? GOLD : AMBER; ctx.lineWidth = 1.5;
          rr(bx, by, bw, bh, 6); ctx.fill(); ctx.stroke();
          ctx.fillStyle = bi === 1 ? GOLD : AMBER;
          ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
          ctx.fillText(bi === 0 ? "BOOTH A" : bi === 1 ? "MAIN STUDIO" : "BOOTH B", bx + bw / 2, by + 14);
          // Mic stand
          ctx.strokeStyle = SAND; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(bx + bw / 2, by + 22); ctx.lineTo(bx + bw / 2, by + 52); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx + bw / 2 - 14, by + 52); ctx.lineTo(bx + bw / 2 + 14, by + 52); ctx.stroke();
          ctx.fillStyle = SAND;
          ctx.beginPath(); ctx.ellipse(bx + bw / 2, by + 18, 8, 12, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = `rgba(${SANDr},0.4)`; ctx.lineWidth = 0.8;
          for (let li = 0; li < 4; li++) {
            ctx.beginPath(); ctx.moveTo(bx + bw / 2 - 6, by + 12 + li * 5); ctx.lineTo(bx + bw / 2 + 6, by + 12 + li * 5); ctx.stroke();
          }
          // Pop filter
          ctx.strokeStyle = `rgba(${SANDr},0.5)`; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(bx + bw / 2 + 14, by + 18, 9, 0, Math.PI * 2); ctx.stroke();
          // Headphones on desk
          ctx.fillStyle = "#1a0c00"; ctx.strokeStyle = AMBER; ctx.lineWidth = 0.8;
          rr(bx + bw / 2 - 20, by + bh - 24, 40, 16, 3); ctx.fill(); ctx.stroke();

          // Egyptian-robed human worker
          const workerX = bx + bw / 2 + (bi === 1 ? 0 : bi === 0 ? 18 : -18);
          const workerY = by + bh - 48;
          ctx.save(); ctx.translate(workerX, workerY);
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.beginPath(); ctx.ellipse(0, 22, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#E8DCC0";
          ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-12, 28); ctx.lineTo(12, 28); ctx.lineTo(10, 0); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-12, 26); ctx.lineTo(12, 26); ctx.stroke();
          ctx.fillStyle = "#A0682A";
          ctx.beginPath(); ctx.arc(0, -14, 8, 0, Math.PI * 2); ctx.fill();
          ctx.fillRect(-3, -6, 6, 7);
          ctx.beginPath(); ctx.ellipse(-13, 8, 3, 8, -0.3, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(13, 8, 3, 8, 0.3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#1050AA";
          ctx.beginPath(); ctx.moveTo(-9, -20); ctx.lineTo(-14, 2); ctx.lineTo(-7, -6); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(9, -20); ctx.lineTo(14, 2); ctx.lineTo(7, -6); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#1040AA";
          ctx.beginPath(); ctx.moveTo(-8, -22); ctx.quadraticCurveTo(0, -28, 8, -22); ctx.lineTo(6, -20); ctx.quadraticCurveTo(0, -25, -6, -20); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = GOLD; ctx.lineWidth = 1;
          for (let hs = 0; hs < 3; hs++) {
            ctx.beginPath(); ctx.moveTo(-8 + hs * 0.5, -20 + hs * 7); ctx.lineTo(-14 + hs * 0.5, 2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(8 - hs * 0.5, -20 + hs * 7); ctx.lineTo(14 - hs * 0.5, 2); ctx.stroke();
          }
          ctx.fillStyle = "#1a0a00";
          ctx.beginPath(); ctx.ellipse(-3, -14, 2.2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(3, -14, 2.2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
          if (bi === 1) {
            ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, -14, 10, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
            ctx.fillStyle = GOLD;
            ctx.beginPath(); ctx.arc(-9, -8, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(9, -8, 3.5, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = GOLD; ctx.strokeStyle = AMBER; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(0, -4, 6, Math.PI * 0.1, Math.PI * 0.9); ctx.fill(); ctx.stroke();
          ctx.restore();
        }

        // ── Waveform display screen (center-left wall) ────────────────
        const scrXd = W * 0.36, scrYd = H * 0.35, scrWd = 90, scrHd = 58;
        ctx.fillStyle = "#100800"; ctx.strokeStyle = `rgba(${GOLDr},0.5)`; ctx.lineWidth = 1.5;
        rr(scrXd, scrYd, scrWd, scrHd, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#0a0500"; rr(scrXd + 3, scrYd + 3, scrWd - 6, scrHd - 6, 3); ctx.fill();
        ctx.strokeStyle = `rgba(${GOLDr},0.9)`; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let wx = 0; wx < scrWd - 12; wx += 2) {
          const amp = 8 + 7 * Math.sin(t * 3 + wx * 0.18);
          const wy = scrYd + scrHd / 2 + amp * Math.sin(t * 7 + wx * 0.22);
          wx === 0 ? ctx.moveTo(scrXd + 6 + wx, wy) : ctx.lineTo(scrXd + 6 + wx, wy);
        }
        ctx.stroke();
        ctx.fillStyle = `rgba(${GOLDr},0.7)`; ctx.font = "5px monospace"; ctx.textAlign = "center";
        ctx.fillText("LIVE SIGNAL", scrXd + scrWd / 2, scrYd + scrHd - 5);

        // ── Playlist / now-playing display ────────────────────────────
        const plXd = W * 0.52, plYd = H * 0.35, plWd = 90, plHd = 82;
        ctx.fillStyle = "#100800"; ctx.strokeStyle = `rgba(${AMBERr},0.45)`; ctx.lineWidth = 1.5;
        rr(plXd, plYd, plWd, plHd, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = GOLD; ctx.font = "bold 5px monospace"; ctx.textAlign = "center";
        ctx.fillText("▶ NOW PLAYING", plXd + plWd / 2, plYd + 12);
        ctx.strokeStyle = `rgba(${GOLDr},0.3)`; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(plXd + 5, plYd + 15); ctx.lineTo(plXd + plWd - 5, plYd + 15); ctx.stroke();
        const desertTracks = ["DAWN HYMN","NILE FLOW","SAND WIND","PHARAOH BEAT","OASIS DUB"];
        desertTracks.forEach((tr, ti) => {
          const isActiveD = ti === Math.floor(t * 0.4) % desertTracks.length;
          ctx.fillStyle = isActiveD ? GOLD : `rgba(${AMBERr},0.6)`;
          ctx.font = isActiveD ? "bold 5px monospace" : "5px monospace";
          ctx.textAlign = "left";
          ctx.fillText((isActiveD ? "▶ " : "  ") + tr, plXd + 7, plYd + 27 + ti * 12);
        });

        // ── Oud / sistrum instruments on left wall ────────────────────
        ctx.fillStyle = "#2a1800"; ctx.strokeStyle = `rgba(${AMBERr},0.35)`; ctx.lineWidth = 1;
        rr(8, H * 0.49, 56, 8, 2); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.translate(36, H * 0.39);
        ctx.fillStyle = "#6a3a10";
        ctx.beginPath(); ctx.ellipse(0, 0, 12, 16, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#3a1a04";
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = GOLD; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, -30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-6, -28); ctx.lineTo(6, -28); ctx.stroke();
        ctx.restore();

        // ── Reel-to-reel recorders ────────────────────────────────────
        for (let ri = 0; ri < 2; ri++) {
          const rx = W * 0.05 + ri * 80, ry = topY + 120;
          ctx.fillStyle = "#1e1004"; ctx.strokeStyle = AMBER; ctx.lineWidth = 1;
          rr(rx, ry, 72, 84, 5); ctx.fill(); ctx.stroke();
          [[rx + 16, ry + 22], [rx + 56, ry + 22]].forEach(([rx2, ry2]) => {
            ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(rx2, ry2, 14, 0, Math.PI * 2); ctx.stroke();
            for (let sp = 0; sp < 4; sp++) {
              const sa = sp * Math.PI / 2 + t * (ri % 2 === 0 ? 1.2 : -1.2);
              ctx.beginPath(); ctx.moveTo(rx2, ry2); ctx.lineTo(rx2 + Math.cos(sa) * 12, ry2 + Math.sin(sa) * 12); ctx.stroke();
            }
            ctx.fillStyle = `rgba(${GOLDr},0.15)`; ctx.beginPath(); ctx.arc(rx2, ry2, 14, 0, Math.PI * 2); ctx.fill();
          });
          ctx.fillStyle = AMBER; ctx.strokeStyle = TERRA; ctx.lineWidth = 0.8;
          rr(rx + 26, ry + 46, 20, 10, 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = GOLD; ctx.font = "bold 5px monospace"; ctx.textAlign = "center";
          ctx.fillText(`TAPE ${ri + 1}`, rx + 36, ry + 72);
        }

        // ── Animated EQ bars (32 channels) ───────────────────────────
        const eqBaseY = H - 52;
        for (let ei = 0; ei < 32; ei++) {
          const eqX = 20 + ei * Math.floor((W - 40) / 32);
          const eqH2 = 8 + 20 * Math.abs(Math.sin(t * 4.5 + ei * 0.38));
          ctx.fillStyle = ei < 11 ? GOLD : ei < 22 ? AMBER : TERRA;
          ctx.fillRect(eqX, eqBaseY - eqH2, Math.floor((W - 40) / 32) - 1, eqH2);
        }
        ctx.fillStyle = `rgba(${GOLDr},0.15)`;
        ctx.fillRect(20, eqBaseY - 30, W - 40, 30);

        // ── Ambient sand particle drift ───────────────────────────────
        for (let i = 0; i < 14; i++) {
          const px = (t * 20 + i * 72) % W;
          const py = topY + 10 + Math.sin(t * 0.8 + i * 1.7) * 18 + (i * (H - topY - 30)) / 14;
          const alpha = Math.sin(t * 2 + i) * 0.2 + 0.25;
          ctx.fillStyle = i % 2 === 0 ? `rgba(${GOLDr},${alpha})` : `rgba(${AMBERr},${alpha})`;
          ctx.beginPath(); ctx.arc(px, py, i % 4 === 0 ? 1.8 : 1, 0, Math.PI * 2); ctx.fill();
        }

        // ── News ticker at bottom ─────────────────────────────────────
        const tkYd = H - 22;
        ctx.fillStyle = "rgba(50,25,0,0.88)"; ctx.fillRect(0, tkYd, W, 18);
        ctx.strokeStyle = `rgba(${GOLDr},0.6)`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, tkYd); ctx.lineTo(W, tkYd); ctx.stroke();
        const tickerTextD = "⬡ VOICE OF THE SANDS LIVE  ✦  DESERT NEWS  ✦  SANDSTORM WARNING: PYRAMID SECTOR  ✦  PHARAOH SPOTTED NEAR OASIS  ✦  SAND MARKETS UP 3.8%  ✦  ";
        const tickerXd = W - (t * 55) % (W + 1400);
        ctx.save(); ctx.beginPath(); ctx.rect(0, tkYd, W, 18); ctx.clip();
        ctx.fillStyle = GOLD; ctx.font = "bold 7px monospace"; ctx.textAlign = "left";
        ctx.fillText(tickerTextD, tickerXd, tkYd + 13);
        ctx.restore();

        // ── Station sign at bottom ────────────────────────────────────
        ctx.fillStyle = GOLD; ctx.shadowColor = AMBER; ctx.shadowBlur = 10;
        ctx.font = "bold 10px Orbitron, monospace"; ctx.textAlign = "center";
        ctx.fillText("⬡ PYRAMID RADIO ⬡", cx, H - 27);
        ctx.shadowBlur = 0;
        return;
      }
      if (!!this.map?.config?.galactica) {
        // ═══ GALACTICA: NOVA BROADCAST — FULL STUDIO ═══
        const t = performance.now() / 1000;

        // ── Deep space floor ──────────────────────────────────────
        ctx.fillStyle = "#04000e";
        ctx.fillRect(0, 0, W, H);
        const tileS = Math.round(W / 18);
        for (let gy = 0; gy <= Math.ceil(H / tileS); gy++) {
          for (let gx = 0; gx <= Math.ceil(W / tileS); gx++) {
            const tx = gx * tileS, ty = gy * tileS;
            const sd = gx * 17 + gy * 11;
            ctx.fillStyle = sd%3===0?"rgba(20,0,34,0.95)":sd%3===1?"rgba(12,0,22,0.95)":"rgba(16,0,28,0.95)";
            ctx.fillRect(tx, ty, tileS, tileS);
            ctx.strokeStyle = `rgba(160,50,255,${0.06+0.04*Math.sin(t*0.9+sd*0.1)})`;
            ctx.lineWidth = 0.7; ctx.strokeRect(tx, ty, tileS, tileS);
            if (sd % 9 === 0) {
              const ng = ctx.createRadialGradient(tx+tileS/2,ty+tileS/2,0,tx+tileS/2,ty+tileS/2,tileS*0.6);
              ng.addColorStop(0,`rgba(160,50,255,${0.07+0.04*Math.sin(t+sd)})`);
              ng.addColorStop(1,"rgba(0,0,0,0)");
              ctx.fillStyle = ng; ctx.fillRect(tx,ty,tileS,tileS);
            }
          }
        }

        // ── Room neon border ──────────────────────────────────────
        ctx.strokeStyle = `rgba(255,80,200,${0.55+0.2*Math.sin(t*1.5)})`; ctx.lineWidth = 3;
        ctx.strokeRect(2,2,W-4,H-4);
        ctx.strokeStyle = "rgba(120,40,255,0.22)"; ctx.lineWidth = 1;
        ctx.strokeRect(7,7,W-14,H-14);

        // ── Ceiling spotlight cones ───────────────────────────────
        const spotXs = [W*0.15, W*0.38, W*0.62, W*0.85];
        for (let li = 0; li < 4; li++) {
          const lx = spotXs[li];
          const lcol = li%2===0 ? [255,80,200] : [120,60,255];
          const lg = ctx.createRadialGradient(lx,0,2,lx,H*0.35,W*0.18);
          lg.addColorStop(0,`rgba(${lcol[0]},${lcol[1]},${lcol[2]},0.16)`);
          lg.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle = lg;
          ctx.beginPath(); ctx.moveTo(lx-5,0); ctx.lineTo(lx-W*0.1,H*0.42); ctx.lineTo(lx+W*0.1,H*0.42); ctx.closePath(); ctx.fill();
          // Fixture
          const la = 0.7+0.3*Math.sin(t*1.1+li);
          ctx.fillStyle = `rgba(${lcol[0]},${lcol[1]},${lcol[2]},${la})`;
          ctx.shadowColor = `rgb(${lcol[0]},${lcol[1]},${lcol[2]})`; ctx.shadowBlur = 10*la;
          ctx.beginPath(); ctx.ellipse(lx,4,W*0.016,4,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
        }

        // ── NOVA BROADCAST banner ─────────────────────────────────
        const sigW = W*0.52, sigH = H*0.038, sigX = cx-sigW/2, sigY = room.S-sigH-4;
        const sigGr = ctx.createLinearGradient(sigX,sigY,sigX+sigW,sigY);
        sigGr.addColorStop(0,"rgba(55,0,45,0.96)"); sigGr.addColorStop(0.5,"rgba(180,0,130,0.99)"); sigGr.addColorStop(1,"rgba(55,0,45,0.96)");
        ctx.fillStyle = sigGr; rr(sigX,sigY,sigW,sigH,8); ctx.fill();
        ctx.strokeStyle = `rgba(255,100,220,${0.7+0.3*Math.sin(t*2.2)})`; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "#FFDDFF"; ctx.font = `bold ${Math.round(sigH*0.55)}px monospace`; ctx.textAlign = "center";
        ctx.shadowColor = "#FF66DD"; ctx.shadowBlur = 12;
        ctx.fillText("◉  NOVA  BROADCAST  ◉", cx, sigY+sigH*0.72); ctx.shadowBlur = 0;

        // ── ON AIR blinking sign ──────────────────────────────────
        const oaA = 0.75+0.25*Math.sin(t*5);
        const oaW = W*0.14, oaH = H*0.038;
        ctx.fillStyle = `rgba(255,10,50,${oaA})`; ctx.shadowColor="#FF0040"; ctx.shadowBlur=18*oaA;
        rr(cx-oaW/2, topY+H*0.04, oaW, oaH, 6); ctx.fill(); ctx.shadowBlur=0;
        ctx.strokeStyle = `rgba(255,100,120,${oaA})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle = "#FFFFFF"; ctx.font = `bold ${Math.round(oaH*0.52)}px monospace`; ctx.textAlign="center";
        ctx.fillText("● ON AIR ●", cx, topY+H*0.04+oaH*0.72);

        // ── Acoustic foam panels (top wall) ──────────────────────
        const pCount = 8, pW = (W-W*0.06)/pCount-W*0.007;
        for (let pi = 0; pi < pCount; pi++) {
          const px = W*0.03+pi*((W-W*0.06)/pCount);
          const py = topY+H*0.005;
          const pH = H*0.042;
          ctx.fillStyle = "#0d001e"; ctx.strokeStyle="rgba(150,40,130,0.35)"; ctx.lineWidth=1;
          rr(px,py,pW,pH,4); ctx.fill(); ctx.stroke();
          const cols=4, rows=3, wW=(pW-5)/cols, wH=(pH-5)/rows;
          for (let wr=0;wr<rows;wr++) for (let wc=0;wc<cols;wc++) {
            ctx.fillStyle=(wr+wc)%2===0?"#180030":"#100020";
            ctx.beginPath(); ctx.moveTo(px+3+wc*wW,py+3+wr*wH+wH); ctx.lineTo(px+3+wc*wW+wW,py+3+wr*wH+wH); ctx.lineTo(px+3+wc*wW+wW/2,py+3+wr*wH); ctx.closePath(); ctx.fill();
          }
        }

        // ── Broadcast desk (full width) ───────────────────────────
        const dskH = H*0.055, dskY = topY+H*0.10, dskW = W*0.84, dskX = cx-dskW/2;
        const dskGr = ctx.createLinearGradient(dskX,dskY,dskX+dskW,dskY+dskH);
        dskGr.addColorStop(0,"#160024"); dskGr.addColorStop(0.5,"#280042"); dskGr.addColorStop(1,"#160024");
        ctx.fillStyle = dskGr; rr(dskX,dskY,dskW,dskH,8); ctx.fill();
        ctx.strokeStyle="rgba(255,80,200,0.85)"; ctx.lineWidth=2.5; ctx.stroke();
        ctx.fillStyle="rgba(255,120,220,0.06)"; ctx.fillRect(dskX+6,dskY+3,dskW-12,dskH*0.25);
        ctx.strokeStyle=`rgba(255,80,200,${0.4+0.3*Math.sin(t*2)})`; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(dskX+10,dskY+dskH-2); ctx.lineTo(dskX+dskW-10,dskY+dskH-2); ctx.stroke();

        // ── Mixing console on desk ────────────────────────────────
        const mbX=dskX+dskW*0.04, mbY=dskY+3, mbW=dskW*0.92, mbH=dskH-6;
        ctx.fillStyle="#08001a"; rr(mbX,mbY,mbW,mbH,4); ctx.fill();
        ctx.strokeStyle="rgba(200,60,180,0.5)"; ctx.lineWidth=1; ctx.stroke();
        const fCnt=20;
        for (let fi=0;fi<fCnt;fi++) {
          const fx=mbX+mbW*0.02+fi*(mbW*0.96/fCnt);
          ctx.fillStyle="#120024"; ctx.fillRect(fx+1,mbY+3,mbW*0.03,mbH-6);
          const fP=3+(mbH-12)*(0.5+0.5*Math.sin(t*(0.7+fi*0.18)+fi));
          ctx.fillStyle=fi%3===0?"#FF88CC":fi%3===1?"#AA66FF":"#66CCFF";
          ctx.fillRect(fx,mbY+3+fP,mbW*0.034,4);
        }
        // VU bank right
        const vuX2=mbX+mbW-mbW*0.09, vuY3=mbY+2, vuCols=["#44FF88","#88FF44","#CCFF00","#FF8800","#FF2244"];
        for (let vi=0;vi<5;vi++) {
          const bH2=Math.round((mbH-4)/5)-1;
          const act=Math.sin(t*6+vi*0.6)>(vi/5-0.35);
          ctx.fillStyle=act?vuCols[vi]:"#0e001c";
          ctx.shadowColor=act?vuCols[vi]:"transparent"; ctx.shadowBlur=act?4:0;
          ctx.fillRect(vuX2,vuY3+(4-vi)*(bH2+1),mbW*0.08,bH2);
        }
        ctx.shadowBlur=0;

        // ── Presenters at desk ────────────────────────────────────
        const drawAnchor = (ax, ay, hairCol, suitCol, irisCol, hasBoomMic) => {
          ctx.save();
          // Chair
          ctx.fillStyle="#160026"; ctx.strokeStyle="rgba(255,80,200,0.4)"; ctx.lineWidth=1;
          const cW=W*0.042, cH=H*0.04;
          rr(ax-cW/2,ay+cH*0.3,cW,cH,4); ctx.fill(); ctx.stroke();
          rr(ax-cW/2*0.9,ay-cH*0.25,cW*0.9,cH*0.5,3); ctx.fill(); ctx.stroke();
          ctx.strokeStyle="rgba(255,80,200,0.25)"; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(ax-cW*0.36,ay+cH*1.3); ctx.lineTo(ax-cW*0.44,ay+cH*1.8); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ax+cW*0.36,ay+cH*1.3); ctx.lineTo(ax+cW*0.44,ay+cH*1.8); ctx.stroke();
          // Body
          ctx.fillStyle=suitCol; rr(ax-W*0.014,ay-H*0.007,W*0.028,H*0.042,3); ctx.fill();
          // Collar
          ctx.fillStyle="#FFDDBB"; ctx.beginPath(); ctx.moveTo(ax-W*0.005,ay-H*0.007); ctx.lineTo(ax,ay+H*0.005); ctx.lineTo(ax+W*0.005,ay-H*0.007); ctx.fill();
          const neckH=H*0.012; ctx.fillRect(ax-W*0.005,ay-neckH-H*0.007,W*0.01,neckH);
          // Head
          const hR=W*0.014; ctx.beginPath(); ctx.arc(ax,ay-neckH-H*0.007-hR,hR,0,Math.PI*2); ctx.fill();
          // Hair
          ctx.fillStyle=hairCol; ctx.beginPath(); ctx.arc(ax,ay-neckH-H*0.007-hR,hR*1.05,Math.PI*1.1,Math.PI*1.9); ctx.fill();
          ctx.fillRect(ax-hR*0.85,ay-neckH-H*0.007-hR*1.8,hR*1.7,hR);
          // Eyes
          const eyeR=hR*0.26, eyeY=ay-neckH-H*0.007-hR*0.82;
          ctx.fillStyle="#fff"; ctx.beginPath(); ctx.ellipse(ax-hR*0.4,eyeY,eyeR,eyeR*0.8,0,0,Math.PI*2); ctx.ellipse(ax+hR*0.4,eyeY,eyeR,eyeR*0.8,0,0,Math.PI*2); ctx.fill();
          ctx.fillStyle=irisCol; ctx.beginPath(); ctx.arc(ax-hR*0.4,eyeY,eyeR*0.6,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(ax+hR*0.4,eyeY,eyeR*0.6,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#000"; ctx.beginPath(); ctx.arc(ax-hR*0.4,eyeY,eyeR*0.28,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(ax+hR*0.4,eyeY,eyeR*0.28,0,Math.PI*2); ctx.fill();
          // Mouth
          const mY=ay-neckH-H*0.007-hR*0.36;
          ctx.fillStyle="#331122"; ctx.beginPath(); ctx.ellipse(ax,mY,hR*0.38,hR*0.28,0,0,Math.PI); ctx.fill();
          // Arm on desk
          ctx.strokeStyle="#FFDDBB"; ctx.lineWidth=W*0.005; ctx.lineCap="round";
          ctx.beginPath(); ctx.moveTo(ax+W*0.012,ay+H*0.01); ctx.lineTo(ax+W*0.03,ay); ctx.stroke();
          ctx.lineCap="butt";
          // Headset
          ctx.fillStyle="#080016"; ctx.strokeStyle="rgba(255,80,200,0.75)"; ctx.lineWidth=1.5;
          const hsR=hR*1.2, hcY=ay-neckH-H*0.007-hR;
          ctx.beginPath(); ctx.arc(ax,hcY,hsR,Math.PI,0); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(ax-hsR,hcY,hR*0.35,hR*0.5,0.2,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle="rgba(255,80,200,0.5)"; ctx.lineWidth=1; ctx.stroke();
          ctx.beginPath(); ctx.ellipse(ax+hsR,hcY,hR*0.35,hR*0.5,-0.2,0,Math.PI*2); ctx.fill(); ctx.stroke();
          if (hasBoomMic) {
            ctx.strokeStyle="rgba(200,120,255,0.7)"; ctx.lineWidth=1;
            ctx.beginPath(); ctx.moveTo(ax+hsR,hcY); ctx.quadraticCurveTo(ax+hsR*1.8,hcY-hR,ax+hsR*1.6,hcY+hR*0.5); ctx.stroke();
            ctx.fillStyle="#280042"; ctx.beginPath(); ctx.ellipse(ax+hsR*1.6,hcY+hR*0.5,hR*0.35,hR*0.55,-0.3,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle="rgba(255,80,200,0.6)"; ctx.lineWidth=0.8; ctx.stroke();
          }
          ctx.restore();
        };
        drawAnchor(cx-W*0.16, dskY+dskH*0.55, "#1a1a2e", "#2233AA", "#2255CC", true);
        drawAnchor(cx+W*0.16, dskY+dskH*0.55, "#441100", "#440033", "#FF44AA", false);

        // ── Left wall: TWO giant speaker towers ───────────────────
        const spTW = W*0.085, spTH = H*0.32;
        for (let si=0;si<2;si++) {
          const spX=W*0.015, spY=H*0.34+si*(spTH+H*0.025);
          ctx.fillStyle="#0b0018"; ctx.strokeStyle="rgba(255,80,200,0.6)"; ctx.lineWidth=2.5;
          rr(spX,spY,spTW,spTH,10); ctx.fill(); ctx.stroke();
          // Big woofer
          const wCX=spX+spTW/2, wCY=spY+spTH*0.38, wR=spTW*0.42;
          const wg=ctx.createRadialGradient(wCX,wCY,wR*0.08,wCX,wCY,wR);
          wg.addColorStop(0,"#3a0055"); wg.addColorStop(0.45,"#200040"); wg.addColorStop(0.85,"#120028"); wg.addColorStop(1,"#080018");
          ctx.fillStyle=wg; ctx.beginPath(); ctx.arc(wCX,wCY,wR,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle="rgba(255,80,200,0.5)"; ctx.lineWidth=1.5; ctx.stroke();
          for (let ri=1;ri<=5;ri++) { ctx.strokeStyle=`rgba(255,80,200,${0.1*ri})`; ctx.lineWidth=0.9; ctx.beginPath(); ctx.arc(wCX,wCY,wR*ri/5.5,0,Math.PI*2); ctx.stroke(); }
          const dcG=ctx.createRadialGradient(wCX,wCY,0,wCX,wCY,wR*0.18);
          dcG.addColorStop(0,"#7700cc"); dcG.addColorStop(1,"#2a0044");
          ctx.fillStyle=dcG; ctx.beginPath(); ctx.arc(wCX,wCY,wR*0.18,0,Math.PI*2); ctx.fill();
          // Tweeter
          const twY=spY+spTH*0.73;
          ctx.fillStyle="#180030"; ctx.strokeStyle="rgba(255,80,200,0.4)"; ctx.lineWidth=1.2;
          ctx.beginPath(); ctx.arc(wCX,twY,spTW*0.14,0,Math.PI*2); ctx.fill(); ctx.stroke();
          ctx.fillStyle="#280044"; ctx.beginPath(); ctx.arc(wCX,twY,spTW*0.07,0,Math.PI*2); ctx.fill();
          // Mid-range driver
          const mdY=spY+spTH*0.57;
          ctx.fillStyle="#120022"; ctx.strokeStyle="rgba(200,80,180,0.35)"; ctx.lineWidth=1;
          ctx.beginPath(); ctx.arc(wCX,mdY,spTW*0.19,0,Math.PI*2); ctx.fill(); ctx.stroke();
          for (let ri=1;ri<=3;ri++) { ctx.strokeStyle=`rgba(200,80,180,${0.08*ri})`; ctx.lineWidth=0.7; ctx.beginPath(); ctx.arc(wCX,mdY,spTW*0.06*ri,0,Math.PI*2); ctx.stroke(); }
          // Brand badge
          ctx.fillStyle="rgba(255,80,200,0.7)"; ctx.font=`bold ${Math.round(spTW*0.18)}px monospace`; ctx.textAlign="center";
          ctx.fillText("NOVA", wCX, spY+spTH-spTH*0.04);
          // Pulsing glow
          const pulse=0.28+0.2*Math.sin(t*5.5+si*Math.PI);
          const spGl=ctx.createRadialGradient(wCX,wCY,0,wCX,wCY,wR*1.3);
          spGl.addColorStop(0,`rgba(200,60,255,${pulse})`); spGl.addColorStop(0.5,`rgba(255,80,200,${pulse*0.5})`); spGl.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=spGl; ctx.beginPath(); ctx.arc(wCX,wCY,wR*1.3,0,Math.PI*2); ctx.fill();
        }

        // ══════════════════════════════════════════════════════
        //  ▐█▌  HUGE MAIN RADIO — RIGHT-CENTER CENTERPIECE  ▐█▌
        // ══════════════════════════════════════════════════════
        const bRW=W*0.22, bRH=H*0.62;
        const bRX=W*0.725, bRY=H*0.18;

        // Cabinet outer glow
        const cabGlR=ctx.createRadialGradient(bRX+bRW/2,bRY+bRH/2,bRW*0.2,bRX+bRW/2,bRY+bRH/2,bRW*0.85);
        cabGlR.addColorStop(0,`rgba(180,60,255,${0.18+0.1*Math.sin(t*1.4)})`);
        cabGlR.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=cabGlR; ctx.beginPath(); ctx.ellipse(bRX+bRW/2,bRY+bRH/2,bRW*0.9,bRH*0.55,0,0,Math.PI*2); ctx.fill();

        // Cabinet body
        const cabBg=ctx.createLinearGradient(bRX,bRY,bRX+bRW,bRY+bRH);
        cabBg.addColorStop(0,"#100020"); cabBg.addColorStop(0.35,"#1e0038"); cabBg.addColorStop(0.65,"#160030"); cabBg.addColorStop(1,"#0c0018");
        ctx.fillStyle=cabBg; rr(bRX,bRY,bRW,bRH,bRW*0.07); ctx.fill();
        ctx.strokeStyle=`rgba(255,80,200,${0.7+0.3*Math.sin(t*1.8)})`; ctx.lineWidth=3;
        rr(bRX,bRY,bRW,bRH,bRW*0.07); ctx.stroke();
        ctx.strokeStyle=`rgba(140,60,255,${0.4+0.2*Math.sin(t*2.2+1)})`; ctx.lineWidth=1;
        rr(bRX+4,bRY+4,bRW-8,bRH-8,bRW*0.06); ctx.stroke();

        // Chrome top strip
        const topSG=ctx.createLinearGradient(bRX,bRY,bRX+bRW,bRY);
        topSG.addColorStop(0,"rgba(255,80,200,0.04)"); topSG.addColorStop(0.5,"rgba(255,80,200,0.2)"); topSG.addColorStop(1,"rgba(255,80,200,0.04)");
        ctx.fillStyle=topSG; ctx.fillRect(bRX+8,bRY+3,bRW-16,7);

        // Station name badge
        const bdgW=bRW*0.82, bdgH=bRH*0.065, bdgX=bRX+bRW*0.09, bdgY=bRY+bRH*0.038;
        ctx.fillStyle="rgba(80,0,60,0.96)"; rr(bdgX,bdgY,bdgW,bdgH,6); ctx.fill();
        ctx.strokeStyle=`rgba(255,100,220,${0.6+0.3*Math.sin(t*2.5)})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#FFDDFF"; ctx.font=`bold ${Math.round(bdgH*0.55)}px monospace`; ctx.textAlign="center";
        ctx.shadowColor="#FF66CC"; ctx.shadowBlur=10;
        ctx.fillText("NOVA FM", bRX+bRW/2, bdgY+bdgH*0.75); ctx.shadowBlur=0;

        // ── Big analog frequency dial ─────────────────────────────
        const dialCX=bRX+bRW/2, dialCY=bRY+bRH*0.295, dialR=bRW*0.38;
        // Bezel
        const dBez=ctx.createRadialGradient(dialCX,dialCY,dialR*0.8,dialCX,dialCY,dialR*1.08);
        dBez.addColorStop(0,"#2a0046"); dBez.addColorStop(1,"#0e001e");
        ctx.fillStyle=dBez; ctx.beginPath(); ctx.arc(dialCX,dialCY,dialR*1.08,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=`rgba(255,80,200,${0.65+0.25*Math.sin(t*2)})`; ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(dialCX,dialCY,dialR*1.08,0,Math.PI*2); ctx.stroke();
        // Face
        const dFace=ctx.createRadialGradient(dialCX,dialCY,0,dialCX,dialCY,dialR);
        dFace.addColorStop(0,"#1c003a"); dFace.addColorStop(0.6,"#0e0024"); dFace.addColorStop(1,"#080018");
        ctx.fillStyle=dFace; ctx.beginPath(); ctx.arc(dialCX,dialCY,dialR,0,Math.PI*2); ctx.fill();
        // Frequency scale
        const freqLbls=["88","92","96","100","104","108"];
        for (let fi=0;fi<=10;fi++) {
          const ang=Math.PI*0.75+fi*(Math.PI*1.5/10);
          const isMaj=fi%2===0;
          const tickLen=isMaj?dialR*0.2:dialR*0.1;
          const tx2=dialCX+Math.cos(ang)*(dialR-dialR*0.06);
          const ty2=dialCY+Math.sin(ang)*(dialR-dialR*0.06);
          const tx3=dialCX+Math.cos(ang)*(dialR-dialR*0.06-tickLen);
          const ty3=dialCY+Math.sin(ang)*(dialR-dialR*0.06-tickLen);
          ctx.strokeStyle=isMaj?"rgba(255,120,220,0.9)":"rgba(255,80,200,0.5)";
          ctx.lineWidth=isMaj?2:1; ctx.beginPath(); ctx.moveTo(tx2,ty2); ctx.lineTo(tx3,ty3); ctx.stroke();
          if (isMaj&&fi/2<freqLbls.length) {
            ctx.fillStyle="rgba(255,180,240,0.85)"; ctx.font=`bold ${Math.round(dialR*0.14)}px monospace`; ctx.textAlign="center";
            ctx.fillText(freqLbls[fi/2],tx3-Math.cos(ang)*dialR*0.12,ty3-Math.sin(ang)*dialR*0.12+dialR*0.04);
          }
        }
        // Glowing needle
        const nAng=Math.PI*0.75+(0.52+0.04*Math.sin(t*0.3))*(Math.PI*1.5);
        ctx.strokeStyle="#FF4400"; ctx.lineWidth=Math.max(2,dialR*0.04); ctx.lineCap="round";
        ctx.shadowColor="#FF6600"; ctx.shadowBlur=12;
        ctx.beginPath(); ctx.moveTo(dialCX-Math.cos(nAng)*dialR*0.16,dialCY-Math.sin(nAng)*dialR*0.16);
        ctx.lineTo(dialCX+Math.cos(nAng)*dialR*0.82,dialCY+Math.sin(nAng)*dialR*0.82); ctx.stroke();
        ctx.shadowBlur=0; ctx.lineCap="butt";
        // Pivot
        const pvG=ctx.createRadialGradient(dialCX,dialCY,0,dialCX,dialCY,dialR*0.1);
        pvG.addColorStop(0,"#FFB080"); pvG.addColorStop(1,"#883300");
        ctx.fillStyle=pvG; ctx.beginPath(); ctx.arc(dialCX,dialCY,dialR*0.1,0,Math.PI*2); ctx.fill();
        // Frequency readout
        const freqVal=(96.4+0.3*Math.sin(t*0.25)).toFixed(1);
        const rdW=bRW*0.72, rdH=bRH*0.042, rdX=bRX+bRW*0.14, rdY=dialCY+dialR*1.1+bRH*0.01;
        ctx.fillStyle="#060012"; rr(rdX,rdY,rdW,rdH,4); ctx.fill();
        ctx.strokeStyle="rgba(0,255,180,0.6)"; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle=`rgba(0,255,180,${0.85+0.15*Math.sin(t*2.5)})`;
        ctx.font=`bold ${Math.round(rdH*0.62)}px monospace`; ctx.textAlign="center";
        ctx.fillText(`${freqVal} MHz`, bRX+bRW/2, rdY+rdH*0.75);

        // ── Giant speaker grille ──────────────────────────────────
        const grX=bRX+bRW/2, grY=bRY+bRH*0.665, grR=bRW*0.38;
        // Surround ring
        const grSR=ctx.createRadialGradient(grX,grY,grR*0.82,grX,grY,grR*1.12);
        grSR.addColorStop(0,"#2a0044"); grSR.addColorStop(1,"#0e001e");
        ctx.fillStyle=grSR; ctx.beginPath(); ctx.arc(grX,grY,grR*1.12,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=`rgba(255,80,200,${0.65+0.2*Math.sin(t*2.4)})`; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.arc(grX,grY,grR*1.12,0,Math.PI*2); ctx.stroke();
        // Mesh background
        ctx.fillStyle="#090016"; ctx.beginPath(); ctx.arc(grX,grY,grR,0,Math.PI*2); ctx.fill();
        // Mesh grid
        ctx.save(); ctx.beginPath(); ctx.arc(grX,grY,grR,0,Math.PI*2); ctx.clip();
        ctx.strokeStyle="rgba(180,60,255,0.2)"; ctx.lineWidth=0.8;
        const meshStep=Math.round(grR/5);
        for (let gy2=-grR;gy2<=grR;gy2+=meshStep) { ctx.beginPath(); ctx.moveTo(grX-grR,grY+gy2); ctx.lineTo(grX+grR,grY+gy2); ctx.stroke(); }
        for (let gx2=-grR;gx2<=grR;gx2+=meshStep) { ctx.beginPath(); ctx.moveTo(grX+gx2,grY-grR); ctx.lineTo(grX+gx2,grY+grR); ctx.stroke(); }
        ctx.restore();
        // Woofer cone
        const wfG=ctx.createRadialGradient(grX,grY,grR*0.05,grX,grY,grR*0.75);
        wfG.addColorStop(0,"#3c0058"); wfG.addColorStop(0.4,"#240045"); wfG.addColorStop(0.8,"#140030"); wfG.addColorStop(1,"#0a0020");
        ctx.fillStyle=wfG; ctx.beginPath(); ctx.arc(grX,grY,grR*0.75,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle="rgba(255,80,200,0.5)"; ctx.lineWidth=2; ctx.stroke();
        for (let ri=1;ri<=6;ri++) { ctx.strokeStyle=`rgba(255,80,200,${0.1*ri})`; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(grX,grY,grR*0.1*ri,0,Math.PI*2); ctx.stroke(); }
        // Dust cap
        const dcG=ctx.createRadialGradient(grX-grR*0.03,grY-grR*0.03,0,grX,grY,grR*0.18);
        dcG.addColorStop(0,"#8800cc"); dcG.addColorStop(1,"#2a0044");
        ctx.fillStyle=dcG; ctx.beginPath(); ctx.arc(grX,grY,grR*0.18,0,Math.PI*2); ctx.fill();
        // Pulsing speaker glow
        const spkPls=0.28+0.2*Math.sin(t*5.8);
        const spkG=ctx.createRadialGradient(grX,grY,0,grX,grY,grR*1.3);
        spkG.addColorStop(0,`rgba(200,60,255,${spkPls})`); spkG.addColorStop(0.4,`rgba(255,80,200,${spkPls*0.5})`); spkG.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=spkG; ctx.beginPath(); ctx.arc(grX,grY,grR*1.3,0,Math.PI*2); ctx.fill();

        // ── VU meters panel ───────────────────────────────────────
        const vuPX=bRX+bRW*0.06, vuPY=rdY+rdH+bRH*0.02, vuPW=bRW*0.88, vuPH=bRH*0.072;
        ctx.fillStyle="#06000f"; rr(vuPX,vuPY,vuPW,vuPH,5); ctx.fill();
        ctx.strokeStyle="rgba(180,60,255,0.55)"; ctx.lineWidth=1.2; ctx.stroke();
        ctx.fillStyle="rgba(255,80,200,0.6)"; ctx.font=`bold ${Math.round(vuPH*0.3)}px monospace`; ctx.textAlign="left";
        ctx.fillText("L", vuPX+vuPW*0.03, vuPY+vuPH*0.38);
        ctx.fillText("R", vuPX+vuPW*0.03, vuPY+vuPH*0.82);
        const vuBW=(vuPW*0.9)/8;
        const vuBCols=["#44FF88","#44FF88","#88FF44","#CCFF00","#FFCC00","#FF8800","#FF4400","#FF2200"];
        for (let ch=0;ch<2;ch++) {
          const lvl=0.4+0.55*Math.abs(Math.sin(t*(3+ch*0.7)+ch*1.4));
          for (let vi=0;vi<8;vi++) {
            const vbx=vuPX+vuPW*0.09+vi*(vuBW+1);
            const vby=vuPY+vuPH*(0.06+ch*0.46);
            const act=vi/8<lvl;
            ctx.fillStyle=act?vuBCols[vi]:"#0e001c";
            ctx.shadowColor=act?vuBCols[vi]:"transparent"; ctx.shadowBlur=act?4:0;
            ctx.fillRect(vbx,vby,vuBW-1,vuPH*0.38);
          }
        }
        ctx.shadowBlur=0;

        // ── Knobs row ─────────────────────────────────────────────
        const knbY=bRY+bRH-bRH*0.048, knbLabels=["VOL","BASS","TREB","BAL"];
        const knbR=bRW*0.07;
        for (let ki=0;ki<4;ki++) {
          const kx=bRX+bRW*(0.14+ki*0.24);
          ctx.fillStyle="#1a0030"; ctx.strokeStyle="rgba(255,80,200,0.55)"; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.arc(kx,knbY,knbR,0,Math.PI*2); ctx.fill(); ctx.stroke();
          const kAng=-Math.PI*0.7+(ki===0?0.8+0.3*Math.sin(t*0.5):ki===1?1.1:ki===2?0.9:0.7)*Math.PI*1.4;
          ctx.strokeStyle=ki===0?"#FF88CC":ki===1?"#AA66FF":ki===2?"#66CCFF":"#FFCC44";
          ctx.lineWidth=2; ctx.lineCap="round";
          ctx.beginPath(); ctx.moveTo(kx,knbY); ctx.lineTo(kx+Math.cos(kAng)*knbR*0.8,knbY+Math.sin(kAng)*knbR*0.8); ctx.stroke();
          ctx.lineCap="butt";
          ctx.fillStyle="rgba(255,180,240,0.65)"; ctx.font=`${Math.round(knbR*0.55)}px monospace`; ctx.textAlign="center";
          ctx.fillText(knbLabels[ki],kx,knbY+knbR*1.6);
        }

        // ── Antenna from top of radio ──────────────────────────────
        const antX=bRX+bRW*0.82, antBase=bRY, antTip=bRY-H*0.14-H*0.015*Math.sin(t*1.1);
        ctx.fillStyle="#1e0034"; ctx.strokeStyle="rgba(255,80,200,0.5)"; ctx.lineWidth=1;
        rr(antX-bRW*0.04,antBase-bRH*0.02,bRW*0.08,bRH*0.025,3); ctx.fill(); ctx.stroke();
        const antGr=ctx.createLinearGradient(antX,antTip,antX,antBase);
        antGr.addColorStop(0,"rgba(255,80,200,0.95)"); antGr.addColorStop(1,"rgba(140,40,180,0.4)");
        ctx.strokeStyle=antGr; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(antX,antBase); ctx.lineTo(antX,antTip); ctx.stroke();
        for (let ai=0;ai<5;ai++) {
          const ay=antBase-H*0.025-ai*H*0.022;
          ctx.fillStyle="#2a0044"; ctx.strokeStyle="rgba(255,80,200,0.4)"; ctx.lineWidth=0.8;
          rr(antX-bRW*0.035,ay-bRH*0.008,bRW*0.07,bRH*0.012,2); ctx.fill(); ctx.stroke();
        }
        // Signal pulse at tip
        const sigP=0.6+0.4*Math.sin(t*4);
        ctx.fillStyle=`rgba(255,80,200,${sigP})`; ctx.shadowColor="#FF80CC"; ctx.shadowBlur=14*sigP;
        ctx.beginPath(); ctx.arc(antX,antTip,5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        for (let sri=1;sri<=4;sri++) {
          const sra=((t*1.4+sri*0.5)%1);
          ctx.strokeStyle=`rgba(255,80,200,${(1-sra)*0.5})`; ctx.lineWidth=1;
          ctx.beginPath(); ctx.arc(antX,antTip,sra*W*0.055,0,Math.PI*2); ctx.stroke();
        }

        // ── Equipment rack (center-left) ──────────────────────────
        const rkW=W*0.1, rkH=H*0.38, rkX=W*0.13, rkY=H*0.38;
        ctx.fillStyle="#08001a"; ctx.strokeStyle="rgba(255,80,200,0.45)"; ctx.lineWidth=2;
        rr(rkX,rkY,rkW,rkH,6); ctx.fill(); ctx.stroke();
        ctx.strokeStyle="rgba(140,60,255,0.3)"; ctx.lineWidth=0.6;
        ctx.beginPath(); ctx.moveTo(rkX+rkW*0.06,rkY+4); ctx.lineTo(rkX+rkW*0.06,rkY+rkH-4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rkX+rkW-rkW*0.06,rkY+4); ctx.lineTo(rkX+rkW-rkW*0.06,rkY+rkH-4); ctx.stroke();
        const rkUnits=[{col:"#FF88CC",lbl:"AMP"},{col:"#AA66FF",lbl:"EQ "},{col:"#44CCFF",lbl:"COMP"},{col:"#FFCC44",lbl:"FX "},{col:"#88FF88",lbl:"OUT"},{col:"#FF6688",lbl:"SUB"},{col:"#FFAA44",lbl:"MON"}];
        const rkUH=(rkH-rkH*0.1)/rkUnits.length;
        for (let ri=0;ri<rkUnits.length;ri++) {
          const ru=rkUnits[ri], ruy=rkY+rkH*0.05+ri*rkUH;
          ctx.fillStyle="#0d001e"; ctx.strokeStyle=ru.col+"44"; ctx.lineWidth=0.8;
          ctx.fillRect(rkX+rkW*0.08,ruy,rkW*0.84,rkUH-2); ctx.strokeRect(rkX+rkW*0.08,ruy,rkW*0.84,rkUH-2);
          const la=0.6+0.4*Math.sin(t*(1.5+ri*0.4));
          ctx.fillStyle=ru.col; ctx.shadowColor=ru.col; ctx.shadowBlur=5*la;
          ctx.fillRect(rkX+rkW*0.12,ruy+rkUH*0.28,rkW*0.1,rkUH*0.44); ctx.shadowBlur=0;
          ctx.fillStyle="#260038"; ctx.beginPath(); ctx.arc(rkX+rkW*0.82,ruy+rkUH*0.5,rkUH*0.35,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle=ru.col+"88"; ctx.lineWidth=0.8; ctx.stroke();
          const ka=t*(0.5+ri*0.3)+ri;
          ctx.strokeStyle=ru.col; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(rkX+rkW*0.82,ruy+rkUH*0.5); ctx.lineTo(rkX+rkW*0.82+Math.cos(ka)*rkUH*0.3,ruy+rkUH*0.5+Math.sin(ka)*rkUH*0.3); ctx.stroke();
          ctx.fillStyle=ru.col+"cc"; ctx.font=`${Math.round(rkUH*0.38)}px monospace`; ctx.textAlign="center";
          ctx.fillText(ru.lbl,rkX+rkW*0.5,ruy+rkUH*0.65);
        }
        ctx.fillStyle="rgba(255,80,200,0.6)"; ctx.font=`bold ${Math.round(rkW*0.14)}px monospace`; ctx.textAlign="center";
        ctx.fillText("RACK",rkX+rkW/2,rkY+rkH-4);

        // ── Waveform monitor (above rack) ─────────────────────────
        const wmW=rkW+8, wmH=H*0.14, wmX=rkX-4, wmY=rkY-wmH-H*0.02;
        ctx.fillStyle="#05000e"; ctx.strokeStyle="rgba(255,80,200,0.55)"; ctx.lineWidth=1.5;
        rr(wmX,wmY,wmW,wmH,6); ctx.fill(); ctx.stroke();
        ctx.fillStyle="#070016"; rr(wmX+3,wmY+3,wmW-6,wmH-6,4); ctx.fill();
        ctx.strokeStyle="rgba(255,100,220,0.9)"; ctx.lineWidth=1.5;
        ctx.beginPath();
        for (let wx=0;wx<wmW-8;wx+=2) {
          const amp=wmH*0.22+wmH*0.14*Math.sin(t*3.2+wx*0.22);
          const wy=wmY+wmH/2+amp*Math.sin(t*7.5+wx*0.28);
          wx===0?ctx.moveTo(wmX+4+wx,wy):ctx.lineTo(wmX+4+wx,wy);
        }
        ctx.stroke();
        ctx.strokeStyle="rgba(100,180,255,0.5)"; ctx.lineWidth=1;
        ctx.beginPath();
        for (let wx=0;wx<wmW-8;wx+=2) {
          const amp2=wmH*0.14+wmH*0.1*Math.sin(t*2.1+wx*0.18+1.5);
          const wy2=wmY+wmH/2+amp2*Math.sin(t*5+wx*0.3+2);
          wx===0?ctx.moveTo(wmX+4+wx,wy2):ctx.lineTo(wmX+4+wx,wy2);
        }
        ctx.stroke();
        ctx.fillStyle="rgba(255,140,220,0.65)"; ctx.font=`bold ${Math.round(wmH*0.12)}px monospace`; ctx.textAlign="center";
        ctx.fillText("LIVE SIGNAL",wmX+wmW/2,wmY+wmH-4);

        // ── Center: standing studio mic ───────────────────────────
        const micX=cx-W*0.08, micBY=dskY+dskH+H*0.16;
        const micPoleH=H*0.16, micR=W*0.015;
        ctx.fillStyle="#180030"; ctx.strokeStyle="rgba(255,80,200,0.5)"; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.ellipse(micX,micBY+micPoleH*0.07,micR*1.8,H*0.018,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle=`rgba(200,120,255,${0.8+0.2*Math.sin(t*2)})`; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(micX,micBY+micPoleH*0.07); ctx.lineTo(micX,micBY-micPoleH*0.86); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(micX,micBY-micPoleH*0.6); ctx.lineTo(micX+micR*2.8,micBY-micPoleH*0.82); ctx.stroke();
        // Mic capsule
        ctx.fillStyle="#240040"; ctx.strokeStyle="rgba(255,80,200,0.8)"; ctx.lineWidth=2;
        ctx.beginPath(); ctx.ellipse(micX+micR*2.8,micBY-micPoleH*0.98,micR*1.1,micR*1.8,-0.3,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle="rgba(255,120,220,0.3)"; ctx.lineWidth=0.6;
        for (let mg=0;mg<5;mg++) { ctx.beginPath(); ctx.ellipse(micX+micR*2.8,micBY-micPoleH*0.98,micR*1.1,micR*(1.8-mg*0.32),-0.3,0,Math.PI*2); ctx.stroke(); }
        const mGl=ctx.createRadialGradient(micX+micR*2.8,micBY-micPoleH*0.98,0,micX+micR*2.8,micBY-micPoleH*0.98,micR*3.5);
        mGl.addColorStop(0,`rgba(255,80,200,${0.2+0.15*Math.sin(t*3)})`); mGl.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=mGl; ctx.beginPath(); ctx.arc(micX+micR*2.8,micBY-micPoleH*0.98,micR*3.5,0,Math.PI*2); ctx.fill();
        for (let ri=1;ri<=4;ri++) {
          const rR=ri*micR*2.2+micR*1.5*Math.sin(t*2-ri*0.5);
          ctx.strokeStyle=`rgba(255,80,200,${(0.15-ri*0.03)*(0.5+0.5*Math.sin(t*2+ri))})`;
          ctx.lineWidth=1; ctx.beginPath(); ctx.arc(micX+micR*2.8,micBY-micPoleH*0.98,rR,0,Math.PI*2); ctx.stroke();
        }

        // ── Playlist/track display (right side) ───────────────────
        const plW=W*0.14, plH=H*0.24, plX=W-plW-W*0.015, plY=H*0.34;
        ctx.fillStyle="#07000f"; ctx.strokeStyle="rgba(140,60,255,0.55)"; ctx.lineWidth=1.5;
        rr(plX,plY,plW,plH,6); ctx.fill(); ctx.stroke();
        ctx.fillStyle="#AA66FF"; ctx.font=`bold ${Math.round(plH*0.09)}px monospace`; ctx.textAlign="center";
        ctx.fillText("▶ NOW PLAYING",plX+plW/2,plY+plH*0.1);
        ctx.strokeStyle="rgba(140,60,255,0.3)"; ctx.lineWidth=0.5;
        ctx.beginPath(); ctx.moveTo(plX+8,plY+plH*0.15); ctx.lineTo(plX+plW-8,plY+plH*0.15); ctx.stroke();
        const trks=["NOVA WAVE","VOID BEAT","STARFIELD","PLASMA FX","NEBULA DUB","DARK ORBIT"];
        const actTrk=Math.floor(t*0.35)%trks.length;
        trks.forEach((tr,ti)=>{
          const isAct=ti===actTrk;
          ctx.fillStyle=isAct?"#FF88CC":"rgba(180,120,255,0.6)";
          ctx.font=isAct?`bold ${Math.round(plH*0.065)}px monospace`:`${Math.round(plH*0.065)}px monospace`;
          ctx.textAlign="left";
          ctx.fillText((isAct?"▶ ":"  ")+tr,plX+8,plY+plH*0.2+ti*plH*0.12);
        });
        // Progress bar
        const pbY=plY+plH-plH*0.09, pbW=plW-16;
        ctx.fillStyle="#0e0020"; ctx.fillRect(plX+8,pbY,pbW,7);
        ctx.strokeStyle="rgba(180,60,255,0.4)"; ctx.lineWidth=0.6; ctx.strokeRect(plX+8,pbY,pbW,7);
        const pbGr=ctx.createLinearGradient(plX+8,pbY,plX+8+pbW,pbY);
        pbGr.addColorStop(0,"#FF80CC"); pbGr.addColorStop(1,"#AA66FF");
        ctx.fillStyle=pbGr; ctx.fillRect(plX+8,pbY,pbW*((t*0.08)%1),7);

        // ── Star chart (right-bottom wall) ───────────────────────
        const scW=plW, scH=H*0.2, scX=plX, scY=plY+plH+H*0.02;
        ctx.fillStyle="#04000c"; ctx.strokeStyle="rgba(160,60,255,0.55)"; ctx.lineWidth=1.5;
        rr(scX,scY,scW,scH,6); ctx.fill(); ctx.stroke();
        const sSeeds=[17,31,43,7,53,23,37,11,29,41,19,47,13,3,59,67,71,79];
        for (let si3=0;si3<18;si3++) {
          const s3=sSeeds[si3];
          const sx3=scX+5+(s3*13%(scW-10));
          const sy3=scY+6+(s3*7%(scH-12));
          const tw=0.45+0.55*Math.sin(t*1.8+si3*0.7);
          ctx.fillStyle=si3%4===0?`rgba(255,200,60,${tw})`:si3%4===1?`rgba(180,100,255,${tw})`:si3%4===2?`rgba(100,200,255,${tw})`:`rgba(255,255,255,${tw*0.85})`;
          ctx.beginPath(); ctx.arc(sx3,sy3,si3%3===0?2:1,0,Math.PI*2); ctx.fill();
        }
        ctx.strokeStyle="rgba(160,100,255,0.22)"; ctx.lineWidth=0.7;
        ctx.beginPath(); ctx.moveTo(scX+scW*0.14,scY+scH*0.28); ctx.lineTo(scX+scW*0.32,scY+scH*0.18); ctx.lineTo(scX+scW*0.52,scY+scH*0.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(scX+scW*0.6,scY+scH*0.25); ctx.lineTo(scX+scW*0.78,scY+scH*0.5); ctx.lineTo(scX+scW*0.9,scY+scH*0.3); ctx.stroke();
        ctx.strokeStyle="rgba(255,180,60,0.55)"; ctx.lineWidth=1.2;
        ctx.beginPath(); ctx.arc(scX+scW/2,scY+scH/2,scH*0.2,0,Math.PI*2); ctx.stroke();
        ctx.fillStyle="#FFCC44"; ctx.shadowColor="#FFAA00"; ctx.shadowBlur=6;
        ctx.beginPath(); ctx.arc(scX+scW/2,scY+scH/2,scH*0.08,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        ctx.fillStyle="rgba(160,60,255,0.7)"; ctx.font=`bold ${Math.round(scH*0.1)}px monospace`; ctx.textAlign="center";
        ctx.fillText("STAR CHART",scX+scW/2,scY+scH-5);

        // ── Award plaques (bottom center) ─────────────────────────
        const plaqLabels=["★ NOVA AWARD","GALACTIC #1","5M LISTENERS"];
        const plaqW=W*0.14, plaqH=H*0.04;
        for (let pi2=0;pi2<3;pi2++) {
          const px2=cx-plaqW*1.6+pi2*(plaqW+W*0.01), py2=H-plaqH-H*0.04;
          const pcol=pi2===0?"rgba(255,200,60,0.9)":pi2===1?"rgba(255,80,200,0.85)":"rgba(180,60,255,0.85)";
          ctx.fillStyle="#0d001e"; ctx.strokeStyle=pcol; ctx.lineWidth=1.2;
          rr(px2,py2,plaqW,plaqH,5); ctx.fill(); ctx.stroke();
          ctx.fillStyle=pcol; ctx.font=`bold ${Math.round(plaqH*0.4)}px monospace`; ctx.textAlign="center";
          ctx.fillText(plaqLabels[pi2],px2+plaqW/2,py2+plaqH*0.68);
        }

        // ── Floor cable runs ──────────────────────────────────────
        ctx.strokeStyle="rgba(140,40,180,0.32)"; ctx.lineWidth=2;
        ctx.setLineDash([5,5]);
        ctx.beginPath(); ctx.moveTo(rkX+rkW,rkY+rkH*0.5); ctx.lineTo(dskX,dskY+dskH*0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bRX,bRY+bRH*0.6); ctx.lineTo(dskX+dskW,dskY+dskH*0.5); ctx.stroke();
        ctx.setLineDash([]);

        // ── News ticker ───────────────────────────────────────────
        const tkY=H-H*0.032;
        ctx.fillStyle="rgba(55,0,45,0.92)"; ctx.fillRect(0,tkY,W,H*0.03);
        ctx.strokeStyle=`rgba(255,80,200,${0.55+0.2*Math.sin(t*2)})`; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(0,tkY); ctx.lineTo(W,tkY); ctx.stroke();
        // LIVE badge
        const livW=W*0.055, livH=H*0.028;
        ctx.fillStyle=`rgba(255,20,60,${0.75+0.25*Math.sin(t*5)})`; rr(W*0.005,tkY+H*0.001,livW,livH,3); ctx.fill();
        ctx.fillStyle="#fff"; ctx.font=`bold ${Math.round(livH*0.55)}px monospace`; ctx.textAlign="left";
        ctx.fillText("LIVE",W*0.005+livW*0.15,tkY+H*0.001+livH*0.75);
        const tkTxt="◉ NOVA BROADCAST  ✦  GALACTIC NEWS  ✦  WARP STORM: SECTOR 7  ✦  NOVA FM 96.4 MHz  ✦  OVERLORD NEAR PLANET CORE  ✦  SPACE MARKETS +4.2%  ✦  ";
        const tkX=W*0.065+W-(t*55)%(W+1600);
        ctx.save(); ctx.beginPath(); ctx.rect(W*0.065,tkY,W-W*0.065,H*0.032); ctx.clip();
        ctx.fillStyle="#FFDDFF"; ctx.font=`bold ${Math.round(H*0.018)}px monospace`; ctx.textAlign="left";
        ctx.fillText(tkTxt,tkX,tkY+H*0.022); ctx.restore();

        // ── Ambient space dust ────────────────────────────────────
        for (let pi3=0;pi3<18;pi3++) {
          const px3=(Math.sin(pi3*2.3+t*0.38)*0.42+0.5)*W;
          const py3=(Math.cos(pi3*1.7+t*0.26)*0.36+0.5)*(H*0.88);
          const pA=0.12+0.08*Math.sin(t*1.5+pi3);
          ctx.fillStyle=pi3%3===0?`rgba(255,100,220,${pA})`:pi3%3===1?`rgba(140,80,255,${pA})`:`rgba(80,160,255,${pA})`;
          ctx.beginPath(); ctx.arc(px3,py3,1.8,0,Math.PI*2); ctx.fill();
        }

        // ── [T] TALK hint ─────────────────────────────────────────
        const thW=W*0.12, thH=H*0.025;
        ctx.fillStyle=`rgba(160,0,110,${0.85+0.1*Math.sin(t*2.5)})`;
        rr(cx-thW/2,topY+H*0.13,thW,thH,5); ctx.fill();
        ctx.strokeStyle="rgba(255,80,200,0.6)"; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#FFDDFF"; ctx.font=`bold ${Math.round(thH*0.55)}px monospace`; ctx.textAlign="center";
        ctx.fillText("[T] TALK TO DJ",cx,topY+H*0.13+thH*0.75);

      } else {
        // ═══ DEFAULT CHOP SHOP (ENHANCED) ═══

        // ── Shop sign ───────────────────
        ctx.fillStyle = "#FF6633";
        ctx.shadowColor = "#FF4400";
        ctx.shadowBlur = 10;
        ctx.font = "bold 10px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("⚙ CHOP SHOP ⚙", cx, topY - 2);
        ctx.shadowBlur = 0;

        // ── Car lift with stripped vehicle (center) ───────────────────
        // Lift platform
        ctx.fillStyle = "#2a2a2a";
        ctx.strokeStyle = "#555555";
        ctx.lineWidth = 2;
        rr(cx - 60, midY - 20, 120, 50, 4);
        ctx.fill();
        ctx.stroke();
        // Yellow safety stripes
        ctx.fillStyle = "#FFCC00";
        for (let si = 0; si < 8; si++) {
          ctx.fillRect(cx - 58 + si * 15, midY - 18, 8, 4);
        }
        // Lift hydraulics
        ctx.fillStyle = "#666666";
        ctx.fillRect(cx - 55, midY + 30, 10, 25);
        ctx.fillRect(cx + 45, midY + 30, 10, 25);

        // Stripped car body on lift
        ctx.fillStyle = "#3a3a4a";
        ctx.strokeStyle = "#5a5a6a";
        ctx.lineWidth = 1.5;
        rr(cx - 45, midY - 15, 90, 30, 4);
        ctx.fill();
        ctx.stroke();
        // Car roof (partially cut)
        ctx.fillStyle = "#2a2a3a";
        rr(cx - 30, midY - 22, 60, 12, 3);
        ctx.fill();
        // Missing wheel areas
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.arc(cx - 30, midY + 8, 12, 0, Math.PI * 2);
        ctx.arc(cx + 30, midY + 8, 12, 0, Math.PI * 2);
        ctx.fill();
        // Exposed engine
        ctx.fillStyle = "#444455";
        rr(cx - 10, midY - 8, 20, 16, 2);
        ctx.fill();
        ctx.fillStyle = "#FF6600";
        ctx.shadowColor = "#FF6600";
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(cx, midY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // ── Tool wall (left) ───────────────────
        ctx.fillStyle = "#1a1408";
        ctx.strokeStyle = "#556644";
        ctx.lineWidth = 1.5;
        rr(cx - W * 0.44, topY + 4, 55, 85, 2);
        ctx.fill();
        ctx.stroke();
        // Tool pegboard holes
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 3; col++) {
            ctx.fillStyle = "#0a0804";
            ctx.beginPath();
            ctx.arc(cx - W * 0.44 + 12 + col * 16, topY + 20 + row * 18, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // Tools hanging
        const chopTools = ["🔨", "🪚", "⛏", "🔧", "🪛", "🔩"];
        ctx.font = "14px serif";
        ctx.textAlign = "center";
        chopTools.forEach((tool, i) =>
          ctx.fillText(
            tool,
            cx - W * 0.44 + 14 + (i % 2) * 24,
            topY + 22 + Math.floor(i / 2) * 26,
          ),
        );

        // ── Parts shelf (right) ───────────────────
        ctx.fillStyle = "#2a2a20";
        ctx.strokeStyle = "#5a5a48";
        ctx.lineWidth = 1.5;
        rr(cx + W * 0.2, topY + 4, 62, 80, 2);
        ctx.fill();
        ctx.stroke();
        // Shelves
        ctx.fillStyle = "#3a3a30";
        ctx.fillRect(cx + W * 0.2, topY + 30, 62, 4);
        ctx.fillRect(cx + W * 0.2, topY + 56, 62, 4);
        // Parts on shelves
        const partColors = ["#666677", "#555566", "#777788", "#888899"];
        for (let si = 0; si < 3; si++) {
          for (let pi = 0; pi < 2; pi++) {
            ctx.fillStyle = partColors[(si + pi) % partColors.length];
            rr(cx + W * 0.2 + 8 + pi * 28, topY + 10 + si * 26, 22, 16, 2);
            ctx.fill();
          }
        }

        // ── Tire stack (bottom left) ───────────────────
        for (let ti = 0; ti < 4; ti++) {
          ctx.fillStyle = "#1a1a1a";
          ctx.strokeStyle = "#333333";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(cx - W * 0.36 + ti * 5, midY + 42 + ti * 2, 15, 9, 0.15, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#666666";
          ctx.beginPath();
          ctx.arc(cx - W * 0.36 + ti * 5, midY + 42 + ti * 2, 5, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── Oil barrels (bottom right) ───────────────────
        for (let bi = 0; bi < 2; bi++) {
          ctx.fillStyle = "#333344";
          ctx.strokeStyle = "#555566";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(cx + W * 0.28 + bi * 26, midY + 46, 14, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#222233";
          ctx.fillRect(cx + W * 0.28 + bi * 26 - 12, midY + 46, 24, 16);
          ctx.fillStyle = bi === 0 ? "#FF4400" : "#00AAFF";
          ctx.font = "bold 5px monospace";
          ctx.textAlign = "center";
          ctx.fillText(bi === 0 ? "OIL" : "COOL", cx + W * 0.28 + bi * 26, midY + 58);
        }

        // ── Spray paint cans (floor) ───────────────────
        for (let si = 0; si < 4; si++) {
          ctx.fillStyle = ["#FF3344", "#3344FF", "#33FF44", "#FFCC33"][si];
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.roundRect(cx - 20 + si * 14, midY + 36, 10, 18, [4, 4, 0, 0]);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    } else if (type === 22) {
      // RADIO STATION
      if (!!this.map?.config?.galactica) {
        // ═══ GALACTICA: NOVA BROADCAST ═══
        const t = performance.now() / 1000;

        // ── Cosmic floor tiles ────────────────────────
        const tileSize = 54;
        for (let gy = 0; gy < Math.ceil(H / tileSize) + 1; gy++) {
          for (let gx = 0; gx < Math.ceil(W / tileSize) + 1; gx++) {
            const tx = gx * tileSize, ty = gy * tileSize;
            const seed = gx * 19 + gy * 13;
            ctx.fillStyle = (seed % 3 === 0) ? "rgba(20,0,30,0.88)"
                          : (seed % 3 === 1) ? "rgba(14,0,24,0.88)"
                          : "rgba(18,0,28,0.88)";
            ctx.fillRect(tx, ty, tileSize, tileSize);
            ctx.strokeStyle = "rgba(255,80,200,0.12)";
            ctx.lineWidth = 0.5;
            ctx.strokeRect(tx, ty, tileSize, tileSize);
            if (seed % 5 === 0) {
              ctx.fillStyle = `rgba(255,120,220,${0.22 + 0.12 * Math.sin(t * 1.3 + seed)})`;
              ctx.beginPath();
              ctx.arc(tx + 27, ty + 27, 1.2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // ── Room border glow ──────────────────────────
        ctx.strokeStyle = "rgba(255,80,200,0.55)";
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, W - 4, H - 4);
        ctx.strokeStyle = "rgba(180,60,255,0.18)";
        ctx.lineWidth = 1;
        ctx.strokeRect(6, 6, W - 12, H - 12);

        // ── Title sign ────────────────────────────────
        const signW = 340, signH = 28;
        const signX = W / 2 - signW / 2, signY = room.S - 24;
        const signGrad = ctx.createLinearGradient(signX, signY, signX + signW, signY);
        signGrad.addColorStop(0, "rgba(80,0,60,0.92)");
        signGrad.addColorStop(0.5, "rgba(200,0,140,0.98)");
        signGrad.addColorStop(1, "rgba(80,0,60,0.92)");
        ctx.fillStyle = signGrad;
        rr(signX, signY, signW, signH, 6);
        ctx.fill();
        ctx.strokeStyle = `rgba(255,100,220,${0.7 + 0.3 * Math.sin(t * 2.4)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#FFDDFF";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.fillText("◉  NOVA BROADCAST  ◉", W / 2, signY + 18);

        // ── ON AIR sign (animated blink) ──────────────
        const onAirAlpha = 0.7 + 0.3 * Math.sin(t * 4);
        ctx.fillStyle = `rgba(255,20,60,${onAirAlpha})`;
        ctx.shadowColor = "#FF0040";
        ctx.shadowBlur = 16 * onAirAlpha;
        rr(W / 2 - 44, topY + 36, 88, 22, 5);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(255,80,100,${onAirAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText("● ON AIR", W / 2, topY + 51);

        // ── Broadcast desk (main, top-center) ─────────
        const deskY = topY + 66, deskW = 420, deskH = 34;
        const deskX = W / 2 - deskW / 2;
        const deskGrad = ctx.createLinearGradient(deskX, deskY, deskX + deskW, deskY);
        deskGrad.addColorStop(0, "#1a0028");
        deskGrad.addColorStop(0.5, "#2e0048");
        deskGrad.addColorStop(1, "#1a0028");
        ctx.fillStyle = deskGrad;
        rr(deskX, deskY, deskW, deskH, 6);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,80,200,0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,120,220,0.08)";
        ctx.fillRect(deskX + 4, deskY + 3, deskW - 8, 7);

        // ── Mixing board on desk ───────────────────────
        const mbX = deskX + 16, mbY = deskY + 4, mbW = deskW - 32, mbH = 26;
        ctx.fillStyle = "#0d0020";
        rr(mbX, mbY, mbW, mbH, 3);
        ctx.fill();
        ctx.strokeStyle = "rgba(200,60,180,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
        // Fader channels
        const faderCount = 14;
        for (let fi = 0; fi < faderCount; fi++) {
          const fx = mbX + 10 + fi * (mbW - 20) / faderCount;
          // Track groove
          ctx.fillStyle = "#1a0030";
          ctx.fillRect(fx + 2, mbY + 3, 5, 20);
          // Fader knob at animated position
          const fPos = 4 + 10 * (0.5 + 0.5 * Math.sin(t * (0.8 + fi * 0.15) + fi));
          ctx.fillStyle = fi % 3 === 0 ? "#FF88CC" : fi % 3 === 1 ? "#AA66FF" : "#88CCFF";
          ctx.fillRect(fx, mbY + 3 + fPos, 9, 5);
        }
        // VU meter (right side of board)
        const vuX = mbX + mbW - 28, vuY = mbY + 3;
        const vuH = 20;
        const vuBars = 5;
        const vuColors = ["#44FF88","#44FF88","#FFCC00","#FF8800","#FF2244"];
        for (let vi = 0; vi < vuBars; vi++) {
          const barH = vuH / vuBars - 1;
          const active = Math.sin(t * 5 + vi * 0.7) > (vi / vuBars - 0.4);
          ctx.fillStyle = active ? vuColors[vi] : "#1a0030";
          ctx.fillRect(vuX, vuY + (vuBars - 1 - vi) * (barH + 1), 24, barH);
        }

        // ── Soundproof foam panels (top wall row) ─────
        const panelCount = 6;
        const panelW = (W - 32) / panelCount - 4;
        for (let pi = 0; pi < panelCount; pi++) {
          const px = 16 + pi * ((W - 32) / panelCount);
          const py = topY + 4;
          ctx.fillStyle = "#120020";
          ctx.strokeStyle = "rgba(180,40,160,0.35)";
          ctx.lineWidth = 1;
          rr(px, py, panelW, 28, 3);
          ctx.fill();
          ctx.stroke();
          // Wedge foam pattern
          const cols = 4, rows = 3;
          const wW = (panelW - 6) / cols, wH = 22 / rows;
          for (let wr = 0; wr < rows; wr++) {
            for (let wc = 0; wc < cols; wc++) {
              ctx.fillStyle = (wr + wc) % 2 === 0 ? "#1e0032" : "#160028";
              ctx.beginPath();
              ctx.moveTo(px + 3 + wc * wW,          py + 3 + wr * wH + wH);
              ctx.lineTo(px + 3 + wc * wW + wW,     py + 3 + wr * wH + wH);
              ctx.lineTo(px + 3 + wc * wW + wW / 2, py + 3 + wr * wH);
              ctx.closePath();
              ctx.fill();
            }
          }
        }

        // ── Left side: speaker monitors ───────────────
        for (let si = 0; si < 2; si++) {
          const spX = 18, spY = H * 0.35 + si * 110;
          const spW = 64, spH = 80;
          ctx.fillStyle = "#100018";
          ctx.strokeStyle = "rgba(255,80,200,0.5)";
          ctx.lineWidth = 1.5;
          rr(spX, spY, spW, spH, 6);
          ctx.fill();
          ctx.stroke();
          // Woofer cone
          const wg = ctx.createRadialGradient(spX + spW/2, spY + 30, 2, spX + spW/2, spY + 30, 22);
          wg.addColorStop(0, "#2a0040");
          wg.addColorStop(0.6, "#180028");
          wg.addColorStop(1, "#0a0018");
          ctx.fillStyle = wg;
          ctx.beginPath();
          ctx.arc(spX + spW / 2, spY + 30, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,80,200,0.4)";
          ctx.lineWidth = 1;
          ctx.stroke();
          // Speaker rings
          for (let ri = 1; ri <= 3; ri++) {
            ctx.strokeStyle = `rgba(255,80,200,${0.15 * ri})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(spX + spW / 2, spY + 30, 7 * ri, 0, Math.PI * 2);
            ctx.stroke();
          }
          // Tweeter
          ctx.fillStyle = "#1a0030";
          ctx.beginPath();
          ctx.arc(spX + spW / 2, spY + 62, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,80,200,0.3)";
          ctx.lineWidth = 0.8;
          ctx.stroke();
          // Pulsing glow when sound is "playing"
          const pulse = 0.3 + 0.2 * Math.sin(t * 6 + si * 1.5);
          const spGlow = ctx.createRadialGradient(spX + spW/2, spY + 30, 0, spX + spW/2, spY + 30, 28);
          spGlow.addColorStop(0, `rgba(255,80,200,${pulse})`);
          spGlow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = spGlow;
          ctx.beginPath();
          ctx.arc(spX + spW / 2, spY + 30, 28, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── Right side: waveform display screen ───────
        const scrX = W - 110, scrY = H * 0.33, scrW = 88, scrH = 64;
        ctx.fillStyle = "#080014";
        ctx.strokeStyle = "rgba(255,80,200,0.6)";
        ctx.lineWidth = 1.5;
        rr(scrX, scrY, scrW, scrH, 5);
        ctx.fill();
        ctx.stroke();
        // Screen inner
        ctx.fillStyle = "#0a0018";
        rr(scrX + 3, scrY + 3, scrW - 6, scrH - 6, 3);
        ctx.fill();
        // Waveform animation
        ctx.strokeStyle = `rgba(255,100,220,0.9)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let wx = 0; wx < scrW - 12; wx += 2) {
          const amp = 10 + 8 * Math.sin(t * 3 + wx * 0.18);
          const wy = scrY + scrH / 2 + amp * Math.sin(t * 8 + wx * 0.22);
          wx === 0 ? ctx.moveTo(scrX + 6 + wx, wy) : ctx.lineTo(scrX + 6 + wx, wy);
        }
        ctx.stroke();
        // Screen label
        ctx.fillStyle = "rgba(255,160,240,0.7)";
        ctx.font = "5px monospace";
        ctx.textAlign = "center";
        ctx.fillText("LIVE SIGNAL", scrX + scrW / 2, scrY + scrH - 6);

        // ── Right side: playlist / track display ──────
        const plX = W - 110, plY = H * 0.55, plW = 88, plH = 96;
        ctx.fillStyle = "#080014";
        ctx.strokeStyle = "rgba(180,60,255,0.5)";
        ctx.lineWidth = 1.5;
        rr(plX, plY, plW, plH, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#AA66FF";
        ctx.font = "bold 5px monospace";
        ctx.textAlign = "center";
        ctx.fillText("▶ NOW PLAYING", plX + plW / 2, plY + 12);
        ctx.strokeStyle = "rgba(180,60,255,0.3)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(plX + 6, plY + 15);
        ctx.lineTo(plX + plW - 6, plY + 15);
        ctx.stroke();
        const tracks = ["NOVA WAVE","VOID BEAT","STARFIELD","PLASMA FX","NEBULA DUB"];
        tracks.forEach((tr, ti) => {
          const isActive = ti === Math.floor(t * 0.4) % tracks.length;
          ctx.fillStyle = isActive ? "#FF88CC" : "rgba(200,140,255,0.6)";
          ctx.font = isActive ? "bold 5px monospace" : "5px monospace";
          ctx.textAlign = "left";
          ctx.fillText((isActive ? "▶ " : "  ") + tr, plX + 7, plY + 26 + ti * 14);
        });

        // ── Equipment rack (center-left wall) ─────────
        const rackX = W * 0.18, rackY = H * 0.32, rackW = 62, rackH = 110;
        ctx.fillStyle = "#0a0018";
        ctx.strokeStyle = "rgba(255,80,200,0.45)";
        ctx.lineWidth = 1.5;
        rr(rackX, rackY, rackW, rackH, 4); ctx.fill(); ctx.stroke();
        // Rack units
        const rackUnits = [
          { col: "#FF88CC", label: "AMP" },
          { col: "#AA66FF", label: "EQ" },
          { col: "#44CCFF", label: "COMP" },
          { col: "#FFCC44", label: "FX" },
          { col: "#88FF88", label: "OUT" },
        ];
        for (let ri = 0; ri < rackUnits.length; ri++) {
          const ru = rackUnits[ri];
          const ruy = rackY + 8 + ri * 20;
          ctx.fillStyle = "#110020";
          ctx.strokeStyle = ru.col + "55"; ctx.lineWidth = 1;
          ctx.fillRect(rackX + 4, ruy, rackW - 8, 16);
          ctx.strokeRect(rackX + 4, ruy, rackW - 8, 16);
          // LED strip
          ctx.fillStyle = ru.col;
          ctx.shadowColor = ru.col; ctx.shadowBlur = 4;
          ctx.fillRect(rackX + 7, ruy + 5, 5, 6);
          ctx.shadowBlur = 0;
          // Knob
          ctx.fillStyle = "#2a0040";
          ctx.beginPath(); ctx.arc(rackX + rackW - 14, ruy + 8, 5, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = ru.col + "88"; ctx.lineWidth = 1; ctx.stroke();
          ctx.fillStyle = ru.col; ctx.font = "4px monospace"; ctx.textAlign = "center";
          ctx.fillText(ru.label, rackX + rackW / 2 + 4, ruy + 10);
        }
        ctx.fillStyle = "rgba(255,80,200,0.5)"; ctx.font = "bold 5px monospace"; ctx.textAlign = "center";
        ctx.fillText("RACK", rackX + rackW / 2, rackY + rackH - 5);

        // ── Headphones on desk ──────────────────────────
        const hpX = deskX + deskW * 0.72, hpY = deskY - 6;
        ctx.fillStyle = "#1a0030";
        ctx.strokeStyle = "rgba(255,80,200,0.6)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(hpX, hpY, 12, Math.PI, 0); ctx.stroke();
        // Ear cups
        ctx.fillStyle = "#2a0044";
        ctx.beginPath(); ctx.ellipse(hpX - 12, hpY, 5, 7, 0.2, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "rgba(255,80,200,0.5)"; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(hpX + 12, hpY, 5, 7, -0.2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        // Inner cushion
        ctx.fillStyle = "rgba(255,80,200,0.25)";
        ctx.beginPath(); ctx.ellipse(hpX - 12, hpY, 3, 5, 0.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(hpX + 12, hpY, 3, 5, -0.2, 0, Math.PI*2); ctx.fill();

        // ── Coffee mug on desk ──────────────────────────
        const mugX = deskX + deskW * 0.85, mugY = deskY;
        ctx.fillStyle = "#1a0028";
        ctx.strokeStyle = "rgba(255,80,200,0.5)"; ctx.lineWidth = 1;
        rr(mugX - 9, mugY - 2, 18, 22, 3); ctx.fill(); ctx.stroke();
        // Coffee liquid
        ctx.fillStyle = "rgba(80,40,0,0.8)";
        ctx.fillRect(mugX - 7, mugY, 14, 16);
        // Steam
        for (let si = 0; si < 3; si++) {
          const sx2 = mugX - 4 + si * 4;
          const sa = Math.sin(t * 2 + si * 1.2) * 3;
          ctx.strokeStyle = `rgba(255,200,160,${0.3 + 0.15 * Math.sin(t * 1.5 + si)})`;
          ctx.lineWidth = 1; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(sx2 + sa, mugY - 2); ctx.lineTo(sx2 - sa, mugY - 8); ctx.stroke();
          ctx.lineCap = "butt";
        }
        // Handle
        ctx.strokeStyle = "rgba(255,80,200,0.5)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(mugX + 12, mugY + 9, 5, -Math.PI/2, Math.PI/2); ctx.stroke();

        // ── Note papers on desk ─────────────────────────
        const noteX = deskX + 8, noteY = deskY - 4;
        ctx.fillStyle = "rgba(240,230,255,0.85)";
        ctx.save(); ctx.rotate(-0.08);
        ctx.fillRect(noteX, noteY, 28, 20);
        ctx.restore();
        ctx.fillStyle = "rgba(200,150,255,0.85)";
        ctx.save(); ctx.translate(noteX + 18, noteY); ctx.rotate(0.12);
        ctx.fillRect(0, 0, 26, 18); ctx.restore();
        // Lines on notes
        ctx.strokeStyle = "rgba(100,50,200,0.4)"; ctx.lineWidth = 0.7;
        for (let li = 0; li < 3; li++) {
          ctx.beginPath(); ctx.moveTo(noteX + 2, noteY + 4 + li * 5); ctx.lineTo(noteX + 22, noteY + 4 + li * 5); ctx.stroke();
        }

        // ── Presenter NPC at desk ───────────────────────
        const npX = W / 2 - 60, npY = deskY + 18;
        ctx.save();
        // Chair
        ctx.fillStyle = "#180028"; ctx.strokeStyle = "rgba(255,80,200,0.4)"; ctx.lineWidth = 1;
        rr(npX - 14, npY + 6, 28, 22, 4); ctx.fill(); ctx.stroke();
        rr(npX - 13, npY - 8, 26, 14, 3); ctx.fill(); ctx.stroke();
        // Chair legs
        ctx.strokeStyle = "rgba(255,80,200,0.3)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(npX - 10, npY + 28); ctx.lineTo(npX - 12, npY + 38); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(npX + 10, npY + 28); ctx.lineTo(npX + 12, npY + 38); ctx.stroke();
        // Body
        ctx.fillStyle = "#3344AA"; rr(npX - 9, npY - 4, 18, 22, 3); ctx.fill();
        // Collar
        ctx.fillStyle = "#FFDDBB"; ctx.beginPath(); ctx.moveTo(npX - 3, npY - 4); ctx.lineTo(npX, npY); ctx.lineTo(npX + 3, npY - 4); ctx.fill();
        // Neck
        ctx.fillRect(npX - 3, npY - 8, 6, 6);
        // Head
        ctx.beginPath(); ctx.arc(npX, npY - 16, 9, 0, Math.PI*2); ctx.fill();
        // Hair
        ctx.fillStyle = "#1a1a2a";
        ctx.beginPath(); ctx.arc(npX, npY - 20, 8, Math.PI * 1.1, Math.PI * 1.9); ctx.fill();
        ctx.fillRect(npX - 7, npY - 21, 14, 6);
        // Eyes
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.ellipse(npX - 3, npY - 17, 2.2, 1.8, 0, 0, Math.PI*2);
        ctx.ellipse(npX + 3, npY - 17, 2.2, 1.8, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#2244AA";
        ctx.beginPath(); ctx.arc(npX - 3, npY - 17, 1.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(npX + 3, npY - 17, 1.2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath(); ctx.arc(npX - 3, npY - 17, 0.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(npX + 3, npY - 17, 0.5, 0, Math.PI*2); ctx.fill();
        // Eyebrows
        ctx.strokeStyle = "#1a1a2a"; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(npX - 6, npY - 21); ctx.lineTo(npX - 1, npY - 22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(npX + 1, npY - 22); ctx.lineTo(npX + 6, npY - 21); ctx.stroke();
        // Nose
        ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.arc(npX, npY - 14, 1.2, 0, Math.PI*2); ctx.fill();
        // Mouth (talking, open)
        ctx.fillStyle = "#441122";
        ctx.beginPath(); ctx.ellipse(npX, npY - 11, 3, 2.5, 0, 0, Math.PI); ctx.fill();
        ctx.strokeStyle = "#AA6644"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(npX, npY - 11, 3, 0.1, Math.PI - 0.1); ctx.stroke();
        // Arm on desk
        ctx.strokeStyle = "#FFDDBB"; ctx.lineWidth = 3.5; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(npX + 9, npY + 5); ctx.lineTo(npX + 22, npY - 2); ctx.stroke();
        ctx.lineCap = "butt";
        // Headset (on-air)
        ctx.fillStyle = "#0a0018"; ctx.strokeStyle = "rgba(255,80,200,0.7)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(npX, npY - 16, 11, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(npX - 11, npY - 16, 4, 5, 0.2, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "rgba(255,80,200,0.5)"; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(npX + 11, npY - 16, 4, 5, -0.2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        // Boom mic
        ctx.strokeStyle = "rgba(200,120,255,0.7)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(npX + 11, npY - 16); ctx.quadraticCurveTo(npX + 22, npY - 22, npX + 20, npY - 10); ctx.stroke();
        ctx.fillStyle = "#2a0044"; ctx.beginPath(); ctx.ellipse(npX + 20, npY - 10, 4, 6, -0.3, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "rgba(255,80,200,0.6)"; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.restore();

        // ── Center: microphone stand (in front of desk) ─
        const micX = W / 2, micY = deskY + deskH + 36;
        // Stand base
        ctx.fillStyle = "#1a0030";
        ctx.strokeStyle = "rgba(255,80,200,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(micX, micY + 14, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Stand pole
        ctx.strokeStyle = "rgba(200,120,255,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(micX, micY + 14);
        ctx.lineTo(micX, micY - 16);
        ctx.stroke();
        // Arm
        ctx.beginPath();
        ctx.moveTo(micX, micY - 10);
        ctx.lineTo(micX + 18, micY - 20);
        ctx.stroke();
        // Mic capsule
        ctx.fillStyle = "#2a0044";
        ctx.strokeStyle = "rgba(255,80,200,0.7)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(micX + 18, micY - 24, 9, 14, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Mesh grid on mic
        ctx.strokeStyle = "rgba(255,120,220,0.3)";
        ctx.lineWidth = 0.5;
        for (let mg = 0; mg < 4; mg++) {
          ctx.beginPath();
          ctx.ellipse(micX + 18, micY - 24, 9, 14 - mg * 3, -0.3, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Mic glow
        const micGlow = ctx.createRadialGradient(micX + 18, micY - 24, 0, micX + 18, micY - 24, 18);
        micGlow.addColorStop(0, `rgba(255,80,200,${0.25 + 0.15 * Math.sin(t * 3)})`);
        micGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = micGlow;
        ctx.beginPath();
        ctx.arc(micX + 18, micY - 24, 18, 0, Math.PI * 2);
        ctx.fill();

        // ── Sound wave rings (ambient) ─────────────────
        for (let ri = 1; ri <= 3; ri++) {
          const rr2 = ri * 28 + 10 * Math.sin(t * 2 - ri);
          const alpha = (0.18 - ri * 0.04) * (0.5 + 0.5 * Math.sin(t * 2 + ri));
          ctx.strokeStyle = `rgba(255,80,200,${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(micX + 18, micY - 24, rr2, 0, Math.PI * 2);
          ctx.stroke();
        }

        // ── Second co-anchor at right of desk ──────────
        const npX2 = W / 2 + 60, npY2 = deskY + 18;
        ctx.save();
        // Chair
        ctx.fillStyle = "#180028"; ctx.strokeStyle = "rgba(255,80,200,0.4)"; ctx.lineWidth = 1;
        rr(npX2 - 14, npY2 + 6, 28, 22, 4); ctx.fill(); ctx.stroke();
        rr(npX2 - 13, npY2 - 8, 26, 14, 3); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = "rgba(255,80,200,0.3)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(npX2 - 10, npY2 + 28); ctx.lineTo(npX2 - 12, npY2 + 38); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(npX2 + 10, npY2 + 28); ctx.lineTo(npX2 + 12, npY2 + 38); ctx.stroke();
        // Body (different outfit — pink-accent)
        ctx.fillStyle = "#440033"; rr(npX2 - 9, npY2 - 4, 18, 22, 3); ctx.fill();
        // Collar
        ctx.fillStyle = "#FFDDBB"; ctx.beginPath(); ctx.moveTo(npX2 - 3, npY2 - 4); ctx.lineTo(npX2, npY2); ctx.lineTo(npX2 + 3, npY2 - 4); ctx.fill();
        // Neck
        ctx.fillRect(npX2 - 3, npY2 - 8, 6, 6);
        // Head
        ctx.beginPath(); ctx.arc(npX2, npY2 - 16, 9, 0, Math.PI * 2); ctx.fill();
        // Hair (long, female)
        ctx.fillStyle = "#441100";
        ctx.beginPath(); ctx.arc(npX2, npY2 - 20, 8, Math.PI, 0); ctx.fill();
        ctx.fillRect(npX2 - 9, npY2 - 22, 4, 16);
        ctx.fillRect(npX2 + 5, npY2 - 22, 4, 16);
        // Eyes
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.ellipse(npX2 - 3, npY2 - 17, 2.2, 1.8, 0, 0, Math.PI * 2);
        ctx.ellipse(npX2 + 3, npY2 - 17, 2.2, 1.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#FF44AA";
        ctx.beginPath(); ctx.arc(npX2 - 3, npY2 - 17, 1.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(npX2 + 3, npY2 - 17, 1.2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath(); ctx.arc(npX2 - 3, npY2 - 17, 0.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(npX2 + 3, npY2 - 17, 0.5, 0, Math.PI*2); ctx.fill();
        // Nose
        ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.arc(npX2, npY2 - 14, 1.2, 0, Math.PI*2); ctx.fill();
        // Mouth (talking)
        ctx.fillStyle = "#441122";
        ctx.beginPath(); ctx.ellipse(npX2, npY2 - 11, 3, 2.5, 0, 0, Math.PI); ctx.fill();
        ctx.strokeStyle = "#EE4466"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(npX2, npY2 - 11, 3, 0.1, Math.PI - 0.1); ctx.stroke();
        // Arm on desk
        ctx.strokeStyle = "#FFDDBB"; ctx.lineWidth = 3.5; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(npX2 - 9, npY2 + 5); ctx.lineTo(npX2 - 22, npY2 - 2); ctx.stroke();
        ctx.lineCap = "butt";
        // Headset
        ctx.fillStyle = "#0a0018"; ctx.strokeStyle = "rgba(255,80,200,0.7)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(npX2, npY2 - 16, 11, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(npX2 - 11, npY2 - 16, 4, 5, 0.2, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "rgba(255,80,200,0.5)"; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(npX2 + 11, npY2 - 16, 4, 5, -0.2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        // Earrings
        ctx.fillStyle = "#FF44AA"; ctx.shadowColor = "#FF44AA"; ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.arc(npX2 - 11, npY2 - 16, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(npX2 + 11, npY2 - 16, 2, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        // ── Star chart / galactic map on wall (center-right wall) ──
        const scX = W * 0.44, scY = H * 0.32, scW = 100, scH = 74;
        ctx.fillStyle = "#04000c";
        ctx.strokeStyle = "rgba(180,60,255,0.55)"; ctx.lineWidth = 1.5;
        rr(scX, scY, scW, scH, 5); ctx.fill(); ctx.stroke();
        // Star field on chart
        const starSeeds = [17,31,43,7,53,23,37,11,29,41,19,47,13,3,59,67];
        for (let si2 = 0; si2 < 16; si2++) {
          const seed2 = starSeeds[si2];
          const sx2 = scX + 6 + (seed2 * 13 % (scW - 12));
          const sy2 = scY + 8 + (seed2 * 7 % (scH - 16));
          const sr2 = si2 % 3 === 0 ? 2 : 1;
          const twinkle = 0.5 + 0.5 * Math.sin(t * 2 + si2);
          ctx.fillStyle = si2 % 4 === 0 ? `rgba(255,200,60,${twinkle})`
                        : si2 % 4 === 1 ? `rgba(180,100,255,${twinkle})`
                        : si2 % 4 === 2 ? `rgba(100,200,255,${twinkle})`
                        : `rgba(255,255,255,${twinkle * 0.8})`;
          ctx.beginPath(); ctx.arc(sx2, sy2, sr2, 0, Math.PI*2); ctx.fill();
        }
        // Constellation lines
        ctx.strokeStyle = "rgba(180,100,255,0.25)"; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(scX+18,scY+20); ctx.lineTo(scX+35,scY+14); ctx.lineTo(scX+50,scY+28); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(scX+60,scY+18); ctx.lineTo(scX+75,scY+35); ctx.lineTo(scX+85,scY+22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(scX+28,scY+48); ctx.lineTo(scX+45,scY+55); ctx.lineTo(scX+62,scY+44); ctx.stroke();
        // Planet circles
        ctx.strokeStyle = "rgba(255,180,60,0.5)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(scX+scW/2, scY+scH/2, 12, 0, Math.PI*2); ctx.stroke();
        ctx.strokeStyle = "rgba(255,180,60,0.25)"; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(scX+scW/2, scY+scH/2, 20, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = "#FFCC44"; ctx.shadowColor = "#FFAA00"; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(scX+scW/2, scY+scH/2, 5, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        // Chart label
        ctx.fillStyle = "rgba(180,60,255,0.7)"; ctx.font = "bold 5px monospace";
        ctx.textAlign = "center"; ctx.fillText("STAR CHART", scX + scW/2, scY + scH - 5);

        // ── News ticker at bottom of room ──────────────
        const tkY = H - 28;
        ctx.fillStyle = "rgba(80,0,60,0.85)";
        ctx.fillRect(0, tkY, W, 20);
        ctx.strokeStyle = "rgba(255,80,200,0.7)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, tkY); ctx.lineTo(W, tkY); ctx.stroke();
        const tickerText = "◉ NOVA BROADCAST LIVE  ✦  GALACTIC NEWS  ✦  WARP STORM WARNING: SECTOR 7  ✦  OVERLORD SIGHTED NEAR PLANET CORE  ✦  SPACE MARKETS UP 4.2%  ✦  ";
        const tickerX = W - (t * 60) % (W + 1200);
        ctx.save();
        ctx.beginPath(); ctx.rect(0, tkY, W, 20); ctx.clip();
        ctx.fillStyle = "#FFDDFF"; ctx.font = "bold 7px monospace"; ctx.textAlign = "left";
        ctx.fillText(tickerText, tickerX, tkY + 13);
        ctx.restore();

        // ── Ambient particles ─────────────────────────
        for (let pi = 0; pi < 10; pi++) {
          const px = (Math.sin(pi * 2.5 + t * 0.45) * 0.38 + 0.5) * W;
          const py = (Math.cos(pi * 1.8 + t * 0.3) * 0.32 + 0.5) * (H * 0.85);
          ctx.fillStyle = `rgba(255,100,220,${0.2 + 0.12 * Math.sin(t * 1.6 + pi)})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── [T] TALK hint ─────────────────────────────
        ctx.fillStyle = "rgba(180,0,120,0.88)";
        rr(W / 2 - 42, topY + 100, 84, 14, 4);
        ctx.fill();
        ctx.fillStyle = "#FFDDFF";
        ctx.font = "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.fillText("[T] TALK TO DJ", W / 2, topY + 110);

      } else if (!!this.map?.config?.zombie) {
        // ═══ ZOMBIE: EMERGENCY BROADCAST ═══
        const t=performance.now()/1000;
        // Blinking ON AIR / EMERGENCY sign
        const ea=0.6+0.4*Math.abs(Math.sin(t*3));
        ctx.fillStyle=`rgba(180,0,0,${ea})`; rr(W/2-60,room.S-22,120,26,5); ctx.fill();
        ctx.strokeStyle=`rgba(255,60,60,${ea})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#FFCCCC"; ctx.font="bold 10px monospace"; ctx.textAlign="center";
        ctx.fillText("⚠ EMERGENCY BROADCAST", W/2, room.S-9);
        // Broadcast desk (damaged)
        const deskZ=topY+60, deskZW=380, deskZH=30, deskZX=W/2-deskZW/2;
        ctx.fillStyle="#0d1a0d"; rr(deskZX,deskZ,deskZW,deskZH,5); ctx.fill();
        ctx.strokeStyle="rgba(44,180,44,0.6)"; ctx.lineWidth=1.5; ctx.stroke();
        // Crack on desk
        ctx.strokeStyle="rgba(0,0,0,0.5)"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(deskZX+100,deskZ); ctx.lineTo(deskZX+120,deskZ+deskZH); ctx.stroke();
        // Mixing board — damaged, some faders stuck
        for (let fi=0;fi<10;fi++) {
          const fx=deskZX+20+fi*34;
          ctx.fillStyle="#060e06"; ctx.fillRect(fx,deskZ+3,12,24);
          const stuck=fi%3===1;
          ctx.fillStyle=stuck?"rgba(180,0,0,0.8)":`rgba(44,200,44,${0.6+0.4*Math.sin(t*(0.8+fi*0.15)+fi)})`;
          ctx.fillRect(fx+1,deskZ+4+(stuck?0:6+8*Math.sin(t*(0.9+fi*0.1)+fi)),10,5);
        }
        // Soundproof panels (damaged, some torn)
        for (let pi=0;pi<5;pi++) {
          const px5=20+pi*(W-40)/4;
          ctx.fillStyle="#0a1200"; rr(px5,topY+4,(W-40)/4-4,24,3); ctx.fill();
          ctx.strokeStyle="rgba(44,120,44,0.3)"; ctx.lineWidth=0.8; ctx.stroke();
          if (pi%2===0) { // torn panel
            ctx.fillStyle="rgba(0,0,0,0.5)";
            ctx.beginPath(); ctx.moveTo(px5+10,topY+4); ctx.lineTo(px5+18,topY+28); ctx.lineTo(px5+4,topY+28); ctx.closePath(); ctx.fill();
          }
        }
        // Emergency generator (right side)
        ctx.fillStyle="#0a1a0a"; rr(W-80,H*0.36,60,80,4); ctx.fill();
        ctx.strokeStyle="rgba(44,180,44,0.5)"; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle=`rgba(44,255,44,${0.5+0.3*Math.sin(t*8)})`; ctx.beginPath(); ctx.arc(W-50,H*0.36+20,8,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="rgba(44,200,44,0.7)"; ctx.font="bold 5px monospace"; ctx.textAlign="center";
        ctx.fillText("GEN", W-50, H*0.36+52); ctx.fillText("ONLINE", W-50, H*0.36+62);
        // Waveform (emergency signal) on screen
        ctx.fillStyle="#050e05"; rr(20,H*0.38,90,60,4); ctx.fill();
        ctx.strokeStyle="rgba(44,200,44,0.5)"; ctx.lineWidth=1; ctx.stroke();
        ctx.strokeStyle=`rgba(255,60,60,0.9)`; ctx.lineWidth=1.5; ctx.beginPath();
        for (let wx=0;wx<80;wx+=2) {
          const wy=H*0.38+30+18*Math.sin(t*8+wx*0.18)*(wx%14<7?1:-0.3); // interrupted signal
          wx===0?ctx.moveTo(22+wx,wy):ctx.lineTo(22+wx,wy);
        }
        ctx.stroke();
        ctx.fillStyle="rgba(255,80,80,0.6)"; ctx.font="5px monospace"; ctx.textAlign="center"; ctx.fillText("SIGNAL WEAK",65,H*0.38+53);
        // Survivor notes taped to wall
        ctx.fillStyle="rgba(180,160,40,0.75)"; rr(W/2-40,H*0.66,80,50,3); ctx.fill();
        ctx.strokeStyle="rgba(200,180,60,0.4)"; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="rgba(20,8,0,0.85)"; ctx.font="5px monospace"; ctx.textAlign="center";
        ["BROADCAST HELP","SECTOR 7 CLEAR","DONT STOP SIGNAL"].forEach((ln,i)=>ctx.fillText(ln,W/2,H*0.66+14+i*12));
        // Red emergency strobe
        const strA=0.06+0.05*Math.sin(t*5);
        ctx.fillStyle=`rgba(200,0,0,${strA})`; ctx.fillRect(0,0,W,H);
      } else if (!!this.map?.config?.hardcore) {
        // ═══ HARDCORE: HELLFIRE RADIO ═══
        const t = performance.now() / 1000;
        const EMBER="#FF8800"; const FLAME="#FF5500"; const CRIMSON="#FF2200"; const AMBER="#FFAA00";
        const EMBERr="255,136,0"; const FLAMEr="255,85,0"; const CRIMSONr="255,34,0"; const AMBERr="255,170,0";

        ctx.fillStyle="#060100"; ctx.fillRect(0,0,W,H);

        // Title
        ctx.save(); ctx.font="bold 17px Orbitron, monospace"; ctx.textAlign="center";
        ctx.fillStyle="#fff"; ctx.shadowColor=FLAME; ctx.shadowBlur=28;
        ctx.fillText("📻 HELLFIRE RADIO 📻", cx, topY-10); ctx.shadowBlur=0; ctx.restore();

        // ── Main broadcast desk ──
        ctx.fillStyle="#140600"; ctx.strokeStyle=AMBER; ctx.lineWidth=2;
        rr(cx-260,topY+8,520,90,6); ctx.fill(); ctx.stroke();
        ctx.fillStyle=`rgba(${AMBERr},0.05)`; ctx.fillRect(cx-256,topY+12,512,82);
        // Mixing console
        for(let ci=0;ci<14;ci++){
          const ch=10+25*Math.abs(Math.sin(t*4+ci*0.5));
          ctx.fillStyle=ci<5?CRIMSON:ci<9?FLAME:EMBER;
          ctx.fillRect(cx-245+ci*37,topY+80-ch,28,ch);
          ctx.fillStyle=ci%3===0?AMBER:FLAME; ctx.beginPath(); ctx.arc(cx-231+ci*37,topY+68,5,0,Math.PI*2); ctx.fill();
        }
        // VU meter bar
        for(let vi=0;vi<20;vi++){
          ctx.fillStyle=vi<8?AMBER:vi<14?EMBER:CRIMSON;
          ctx.fillRect(cx-248+vi*26,topY+14,22,8);
        }
        ctx.fillStyle=FLAME; ctx.font="bold 8px monospace"; ctx.textAlign="center"; ctx.fillText("⚡ ON AIR ⚡",cx,topY+105);

        // ── 3 broadcast towers (left) ──
        for(let ti=0;ti<3;ti++){
          const tx=80+ti*120, ty=topY+140;
          ctx.strokeStyle=EMBER; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(tx-20,ty+80); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(tx+20,ty+80); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(tx-15,ty+30); ctx.lineTo(tx+15,ty+30); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(tx-18,ty+55); ctx.lineTo(tx+18,ty+55); ctx.stroke();
          // Signal waves
          for(let wi=0;wi<3;wi++){
            const wa=0.2+0.15*Math.sin(t*3+ti+wi);
            ctx.strokeStyle=`rgba(${FLAMEr},${wa})`; ctx.lineWidth=1;
            ctx.beginPath(); ctx.arc(tx,ty-10,10+wi*10,Math.PI*1.2,Math.PI*1.8); ctx.stroke();
          }
          ctx.fillStyle=CRIMSON; ctx.beginPath(); ctx.arc(tx,ty-4,4,0,Math.PI*2); ctx.fill();
          const blink=Math.sin(t*4+ti)>0;
          if(blink){ctx.fillStyle=`rgba(${CRIMSONr},0.8)`; ctx.beginPath(); ctx.arc(tx,ty-4,6,0,Math.PI*2); ctx.fill();}
        }

        // ── Reel-to-reel recorders (right) ──
        for(let ri=0;ri<3;ri++){
          const rx=W-310+ri*90, ry=topY+140;
          ctx.fillStyle="#120600"; ctx.strokeStyle=EMBER; ctx.lineWidth=1;
          rr(rx,ry,75,90,4); ctx.fill(); ctx.stroke();
          // Two reels
          [[rx+18,ry+25],[rx+58,ry+25]].forEach(([rx2,ry2])=>{
            ctx.strokeStyle=FLAME; ctx.lineWidth=1.5;
            ctx.beginPath(); ctx.arc(rx2,ry2,14,0,Math.PI*2); ctx.stroke();
            // Spokes
            for(let sp=0;sp<4;sp++){
              const sa=sp*Math.PI/2+t*(ri%2===0?1.5:-1.5);
              ctx.beginPath(); ctx.moveTo(rx2,ry2); ctx.lineTo(rx2+Math.cos(sa)*12,ry2+Math.sin(sa)*12); ctx.stroke();
            }
            ctx.fillStyle=`rgba(${EMBERr},0.2)`; ctx.beginPath(); ctx.arc(rx2,ry2,14,0,Math.PI*2); ctx.fill();
          });
          // Play head
          ctx.fillStyle=AMBER; ctx.strokeStyle=EMBER; ctx.lineWidth=0.8;
          rr(rx+28,ry+48,20,10,2); ctx.fill(); ctx.stroke();
          ctx.fillStyle=FLAME; ctx.font="bold 5px monospace"; ctx.textAlign="center"; ctx.fillText(`REC ${ri+1}`,rx+38,ry+80);
        }

        // ── Sound-proof booths (bottom) ──
        for(let bi=0;bi<3;bi++){
          const bx=40+bi*340, by=H*0.66;
          ctx.fillStyle="#0f0500"; ctx.strokeStyle=bi===1?CRIMSON:FLAME; ctx.lineWidth=1.5;
          rr(bx,by,300,100,5); ctx.fill(); ctx.stroke();
          ctx.fillStyle=bi===1?CRIMSON:EMBER; ctx.font="bold 7px monospace"; ctx.textAlign="center";
          ctx.fillText(bi===0?"STUDIO A":bi===1?"MAIN BOOTH":"STUDIO B",bx+150,by+15);
          // Microphone
          ctx.strokeStyle=AMBER; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(bx+150,by+30); ctx.lineTo(bx+150,by+65); ctx.stroke();
          ctx.fillStyle="#1a0800"; ctx.strokeStyle=EMBER; ctx.lineWidth=1;
          rr(bx+138,by+22,24,18,4); ctx.fill(); ctx.stroke();
          // Pop filter
          ctx.strokeStyle=`rgba(${AMBERr},0.5)`; ctx.lineWidth=0.8;
          ctx.beginPath(); ctx.arc(bx+160,by+32,10,0,Math.PI*2); ctx.stroke();
          // Headphones on desk
          ctx.fillStyle="#160600"; ctx.strokeStyle=FLAME; ctx.lineWidth=0.8;
          rr(bx+80,by+60,40,24,3); ctx.fill(); ctx.stroke();
        }

        // ── Broadcaster (seated at desk) ──
        const bcastX=cx, bcastY=topY+108;
        ctx.fillStyle="#993300";
        ctx.beginPath(); ctx.arc(bcastX,bcastY,9,0,Math.PI*2); ctx.fill();
        ctx.fillRect(bcastX-7,bcastY+8,14,16);
        ctx.fillStyle="#0a0200"; ctx.beginPath(); ctx.arc(bcastX,bcastY,4,0,Math.PI*2); ctx.fill();
        // Headphone arc
        ctx.strokeStyle=EMBER; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(bcastX,bcastY-1,10,Math.PI,0); ctx.stroke();
        ctx.fillStyle=EMBER; ctx.beginPath(); ctx.arc(bcastX-10,bcastY-1,4,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(bcastX+10,bcastY-1,4,0,Math.PI*2); ctx.fill();

        // Signal beam from antenna
        for(let sb=0;sb<4;sb++){
          const sw=sb*80+40*(Math.sin(t*2+sb));
          ctx.strokeStyle=`rgba(${EMBERr},${0.1-sb*0.022})`; ctx.lineWidth=1;
          ctx.beginPath(); ctx.arc(W-240,topY+150,sw,Math.PI*1.1,Math.PI*1.9); ctx.stroke();
        }
      } else if (!!this.map?.config?.metropolis) {
        // ═══ METROPOLIS: CITY FREQUENCY RADIO — URBAN BROADCAST STUDIO ═══
        const t = performance.now() / 1000;
        const AMBER="#FF9933", GOLD="#FFCC44", ORANGE="#FF6600", WARM="#FFAA22";
        const AMBERr="255,153,51", GOLDr="255,204,68", ORANGEr="255,102,0";

        // ── FLOOR (dark studio concrete tiles) ──
        const tS2=54;
        for (let gy=0;gy<=Math.ceil(H/tS2)+1;gy++) {
          for (let gx=0;gx<=Math.ceil(W/tS2)+1;gx++) {
            const seed=gx*17+gy*11;
            ctx.fillStyle=seed%3===0?"#0c0a0e":seed%3===1?"#0a0810":"#0e0c10";
            ctx.fillRect(gx*tS2,gy*tS2,tS2,tS2);
            ctx.strokeStyle="rgba(255,153,51,0.05)"; ctx.lineWidth=0.5;
            ctx.strokeRect(gx*tS2,gy*tS2,tS2,tS2);
          }
        }
        // Warm amber ambient glow
        const flrAmb=ctx.createRadialGradient(cx,H*0.4,0,cx,H*0.4,W*0.5);
        flrAmb.addColorStop(0,"rgba(255,153,51,0.07)"); flrAmb.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=flrAmb; ctx.fillRect(0,0,W,H);

        // ── ROOM BORDER ──
        ctx.strokeStyle=`rgba(${AMBERr},${0.55+0.2*Math.sin(t*1.5)})`; ctx.lineWidth=2.5;
        ctx.strokeRect(2,2,W-4,H-4);
        ctx.strokeStyle=`rgba(${GOLDr},0.18)`; ctx.lineWidth=1.2; ctx.strokeRect(7,7,W-14,H-14);

        // ── SIGN ──
        ctx.save();
        ctx.font="bold 20px Orbitron, monospace"; ctx.textAlign="center";
        ctx.fillStyle="#fff"; ctx.shadowColor=AMBER; ctx.shadowBlur=28;
        ctx.fillText("📡  CITY FREQUENCY  📡", cx, room.S-16); ctx.shadowBlur=0; ctx.restore();
        const sigG=ctx.createLinearGradient(0,room.S,W,room.S);
        sigG.addColorStop(0,"rgba(255,153,51,0)"); sigG.addColorStop(0.5,"rgba(255,153,51,0.5)"); sigG.addColorStop(1,"rgba(255,153,51,0)");
        ctx.fillStyle=sigG; ctx.fillRect(room.S,room.S,W-room.S*2,3);

        // ── ACOUSTIC FOAM PANELS (top wall) ──
        const foamC=["#1a1208","#1e1408","#161008","#221808"];
        for (let pi=0;pi<14;pi++) {
          const fpx=room.S+4+pi*((W-room.S*2-8)/14), fpy=topY+2, fpw=(W-room.S*2-8)/14-3, fph=26;
          ctx.fillStyle=foamC[pi%4]; rr(fpx,fpy,fpw,fph,3); ctx.fill();
          ctx.strokeStyle=`rgba(${AMBERr},0.12)`; ctx.lineWidth=0.8; ctx.stroke();
          ctx.strokeStyle=`rgba(${AMBERr},0.07)`; ctx.lineWidth=0.5;
          ctx.beginPath(); ctx.moveTo(fpx+fpw/2,fpy+2); ctx.lineTo(fpx+fpw-3,fpy+fph/2); ctx.lineTo(fpx+fpw/2,fpy+fph-2); ctx.lineTo(fpx+3,fpy+fph/2); ctx.closePath(); ctx.stroke();
        }
        // Left wall foam panels
        for (let pi=0;pi<7;pi++) {
          ctx.fillStyle=foamC[pi%4]; rr(room.S+4,topY+36+pi*78,26,66,3); ctx.fill();
          ctx.strokeStyle=`rgba(${AMBERr},0.10)`; ctx.lineWidth=0.8; ctx.stroke();
        }
        // Right wall foam panels
        for (let pi=0;pi<7;pi++) {
          ctx.fillStyle=foamC[pi%4]; rr(W-room.S-30,topY+36+pi*78,26,66,3); ctx.fill();
          ctx.strokeStyle=`rgba(${AMBERr},0.10)`; ctx.lineWidth=0.8; ctx.stroke();
        }

        // ── ON AIR + LIVE badges ──
        const onA=0.7+0.3*Math.sin(t*4);
        ctx.fillStyle=`rgba(220,30,10,${onA})`; ctx.shadowColor="#DD1000"; ctx.shadowBlur=18*onA;
        rr(cx-52,topY+32,104,26,6); ctx.fill(); ctx.shadowBlur=0;
        ctx.strokeStyle=`rgba(255,90,60,${onA})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#FFF"; ctx.font="bold 12px monospace"; ctx.textAlign="center";
        ctx.fillText("● ON AIR", cx, topY+49);
        const livP=Math.abs(Math.sin(t*2.5));
        ctx.fillStyle=`rgba(${GOLDr},${0.7+0.3*livP})`; ctx.shadowColor=GOLD; ctx.shadowBlur=10*livP;
        rr(cx-180,topY+34,68,22,5); ctx.fill(); ctx.shadowBlur=0;
        ctx.strokeStyle=GOLD; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#0a0600"; ctx.font="bold 10px monospace"; ctx.textAlign="center";
        ctx.fillText("◉ LIVE", cx-146, topY+49);
        // Frequency label
        const freqPulse=0.8+0.2*Math.sin(t*0.7);
        ctx.fillStyle=`rgba(${AMBERr},${freqPulse})`; ctx.font="bold 10px Orbitron, monospace"; ctx.textAlign="center";
        ctx.shadowColor=AMBER; ctx.shadowBlur=8;
        ctx.fillText("94.7 FM", cx+180, topY+49); ctx.shadowBlur=0;

        // ── MAIN BROADCAST DESK (large, center) ──
        const bdX=cx-W*0.28, bdY=topY+68, bdW=W*0.56, bdH=52;
        const bdGrd=ctx.createLinearGradient(bdX,bdY,bdX,bdY+bdH);
        bdGrd.addColorStop(0,"#1a1208"); bdGrd.addColorStop(1,"#0e0a06");
        ctx.fillStyle=bdGrd; ctx.strokeStyle=AMBER; ctx.lineWidth=2;
        ctx.shadowColor=AMBER; ctx.shadowBlur=10;
        rr(bdX,bdY,bdW,bdH,6); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
        // Desk surface glow
        const bdSurf=ctx.createLinearGradient(bdX,bdY,bdX,bdY+8);
        bdSurf.addColorStop(0,"rgba(255,153,51,0.18)"); bdSurf.addColorStop(1,"rgba(255,153,51,0)");
        ctx.fillStyle=bdSurf; ctx.fillRect(bdX+3,bdY+2,bdW-6,8);

        // ── MIXING CONSOLE on desk ──
        const mcX=bdX+10, mcY=bdY+6, mcW=bdW-20, mcH=36;
        ctx.fillStyle="#060402"; ctx.strokeStyle=ORANGE+"66"; ctx.lineWidth=1;
        rr(mcX,mcY,mcW,mcH,4); ctx.fill(); ctx.stroke();
        // Fader channels (12 faders)
        const fdrW=(mcW-20)/12;
        for (let fi=0;fi<12;fi++) {
          const fx=mcX+10+fi*fdrW;
          // Fader track
          ctx.fillStyle="#0a0804"; ctx.fillRect(fx+fdrW*0.3,mcY+6,fdrW*0.25,22);
          // Fader cap
          const fPos=14+Math.sin(t*1.5+fi*0.7)*6;
          ctx.fillStyle=fi<4?AMBER:fi<8?ORANGE:GOLD;
          ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=3;
          rr(fx+fdrW*0.1,mcY+fPos,fdrW*0.8,5,2); ctx.fill(); ctx.shadowBlur=0;
          // Channel LED
          const ledA=Math.sin(t*6+fi)*0.4+0.6;
          ctx.fillStyle=fi===5||fi===6?`rgba(${ORANGEr},${ledA})`:`rgba(${GOLDr},${0.4+0.3*Math.sin(t*2+fi)})`;
          ctx.beginPath(); ctx.arc(fx+fdrW/2,mcY+4,2,0,Math.PI*2); ctx.fill();
        }
        // Master fader (right side)
        ctx.fillStyle="#1a1006"; ctx.strokeStyle=GOLD; ctx.lineWidth=1.5;
        rr(bdX+bdW-32,bdY+6,20,36,3); ctx.fill(); ctx.stroke();
        const mfPos=18+Math.sin(t*0.6)*8;
        ctx.fillStyle=GOLD; ctx.shadowColor=GOLD; ctx.shadowBlur=4;
        rr(bdX+bdW-30,bdY+mfPos,16,6,2); ctx.fill(); ctx.shadowBlur=0;
        ctx.fillStyle=GOLD+"88"; ctx.font="bold 4px monospace"; ctx.textAlign="center";
        ctx.fillText("MASTER",bdX+bdW-22,bdY+46);

        // ── BROADCAST MICROPHONE (on desk, center) ──
        const micX=cx, micY=bdY-4;
        // Mic boom arm
        ctx.strokeStyle="#443322"; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(micX-60,bdY+30); ctx.quadraticCurveTo(micX-20,bdY+10,micX,micY); ctx.stroke();
        // Mic capsule
        ctx.fillStyle="#1a1208"; ctx.strokeStyle=GOLD; ctx.lineWidth=1.5;
        ctx.shadowColor=GOLD; ctx.shadowBlur=8;
        ctx.beginPath(); ctx.ellipse(micX,micY,12,18,0,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
        // Mesh grille lines
        ctx.strokeStyle=AMBER+"66"; ctx.lineWidth=0.7;
        for (let ml=0;ml<5;ml++) { ctx.beginPath(); ctx.moveTo(micX-10,micY-12+ml*6); ctx.lineTo(micX+10,micY-12+ml*6); ctx.stroke(); }
        for (let ml=0;ml<4;ml++) { const mv=micY-14+ml; ctx.beginPath(); ctx.moveTo(micX-8,mv); ctx.lineTo(micX+8,mv+28); ctx.stroke(); }
        // Pop filter
        ctx.strokeStyle="#6a4a22"; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(micX+18,micY,14,0,Math.PI*2); ctx.stroke();
        ctx.strokeStyle="#8a6a44"; ctx.lineWidth=0.8;
        for (let pg=0;pg<6;pg++) { ctx.beginPath(); ctx.arc(micX+18,micY,4+pg*2,0,Math.PI*2); ctx.stroke(); }
        // Mic stand base
        ctx.fillStyle="#221408"; ctx.strokeStyle="#443322"; ctx.lineWidth=1;
        rr(micX-50,bdY+28,14,8,3); ctx.fill(); ctx.stroke();

        // ── MONITOR SPEAKERS (left and right of desk) ──
        for (const [spX,side] of [[bdX-52,1],[bdX+bdW+8,-1]]) {
          const spY=bdY-10;
          ctx.fillStyle="#0e0a06"; ctx.strokeStyle=ORANGE+"99"; ctx.lineWidth=1.5;
          ctx.shadowColor=ORANGE; ctx.shadowBlur=6;
          rr(spX,spY,44,72,4); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
          // Woofer
          const wG=ctx.createRadialGradient(spX+22,spY+28,2,spX+22,spY+28,16);
          wG.addColorStop(0,"#2a1808"); wG.addColorStop(1,"#0a0604");
          ctx.fillStyle=wG; ctx.beginPath(); ctx.arc(spX+22,spY+28,16,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle=ORANGE+"88"; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(spX+22,spY+28,16,0,Math.PI*2); ctx.stroke();
          ctx.strokeStyle=ORANGE+"44"; ctx.lineWidth=0.7;
          ctx.beginPath(); ctx.arc(spX+22,spY+28,10,0,Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.arc(spX+22,spY+28,4,0,Math.PI*2); ctx.stroke();
          // Tweeter
          ctx.fillStyle="#0e0a06"; ctx.beginPath(); ctx.arc(spX+22,spY+54,7,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle=GOLD+"77"; ctx.lineWidth=1; ctx.stroke();
          ctx.beginPath(); ctx.arc(spX+22,spY+54,3,0,Math.PI*2); ctx.stroke();
          // Speaker glow cone
          const spAlpha=Math.sin(t*3+spX*0.01)*0.06+0.08;
          const scG=ctx.createRadialGradient(spX+22,spY+28,0,spX+(side>0?-20:64),spY+28,60);
          scG.addColorStop(0,`rgba(${ORANGEr},${spAlpha*2})`); scG.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=scG; ctx.beginPath(); ctx.arc(spX+(side>0?-20:64),spY+28,60,0,Math.PI*2); ctx.fill();
          // Label
          ctx.fillStyle=ORANGE+"88"; ctx.font="bold 4.5px Orbitron, monospace"; ctx.textAlign="center";
          ctx.fillText("MONITOR",spX+22,spY+68);
        }

        // ── WAVEFORM DISPLAY SCREENS (2 large screens, top area) ──
        for (let si=0;si<2;si++) {
          const scX=W*0.14+si*(W*0.52), scY=topY+32, scW=W*0.32, scH=28;
          ctx.fillStyle="#060402"; ctx.strokeStyle=`rgba(${AMBERr},0.6)`; ctx.lineWidth=1.5;
          rr(scX,scY,scW,scH,4); ctx.fill(); ctx.stroke();
          ctx.fillStyle="#020200"; rr(scX+3,scY+3,scW-6,scH-6,3); ctx.fill();
          // Waveform
          ctx.strokeStyle=si===0?`rgba(${GOLDr},0.9)`:`rgba(${ORANGEr},0.9)`; ctx.lineWidth=1.5;
          ctx.beginPath();
          for (let wx=0;wx<scW-10;wx+=2) {
            const amp=8+6*Math.sin(t*4+wx*0.18+si*1.5)*Math.sin(t*2.2+wx*0.08);
            const wy=scY+scH/2+amp;
            wx===0?ctx.moveTo(scX+5+wx,wy):ctx.lineTo(scX+5+wx,wy);
          }
          ctx.stroke();
          ctx.shadowBlur=0;
          // Label
          ctx.fillStyle=si===0?GOLD:AMBER; ctx.font="bold 4px monospace"; ctx.textAlign="left";
          ctx.fillText(si===0?"MAIN IN":"MAIN OUT",scX+5,scY+10);
        }

        // ── EQUIPMENT RACK (left wall) ──
        const rackX=room.S+36, rackY=H*0.34;
        ctx.fillStyle="#0e0a06"; ctx.strokeStyle=`rgba(${AMBERr},0.5)`; ctx.lineWidth=1.5;
        rr(rackX,rackY,68,130,4); ctx.fill(); ctx.stroke();
        const rackUnits=[
          {col:AMBER,label:"TX AMP"},{col:GOLD,label:"EQ"},{col:ORANGE,label:"COMP"},
          {col:AMBER,label:"AUX"},{col:GOLD,label:"DSP"},{col:ORANGE,label:"MON"},
          {col:AMBER,label:"PATCH"},{col:GOLD,label:"PWR"},
        ];
        for (let ri=0;ri<rackUnits.length;ri++) {
          const ru=rackUnits[ri], ruy=rackY+6+ri*14;
          ctx.fillStyle="#080604"; ctx.strokeStyle=ru.col+"44"; ctx.lineWidth=0.8;
          ctx.fillRect(rackX+4,ruy,60,12); ctx.strokeRect(rackX+4,ruy,60,12);
          ctx.fillStyle=ru.col; ctx.shadowColor=ru.col; ctx.shadowBlur=3;
          ctx.fillRect(rackX+7,ruy+3,4,6); ctx.shadowBlur=0;
          const knobA=Math.sin(t*1.2+ri)*0.4+0.6;
          ctx.fillStyle="#1a0e06"; ctx.beginPath(); ctx.arc(rackX+58,ruy+6,4,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle=ru.col+Math.floor(knobA*200).toString(16).padStart(2,"0"); ctx.lineWidth=1;
          ctx.beginPath(); ctx.arc(rackX+58,ruy+6,4,0,Math.PI*2); ctx.stroke();
          ctx.fillStyle=ru.col; ctx.font="4px monospace"; ctx.textAlign="center";
          ctx.fillText(ru.label,rackX+30,ruy+9);
        }
        ctx.fillStyle=`rgba(${AMBERr},0.55)`; ctx.font="bold 5px monospace"; ctx.textAlign="center";
        ctx.fillText("RACK",rackX+34,rackY+124);

        // ── BROADCAST TOWER diagram (right wall) ──
        const twX=W-room.S-30, twBaseY=H*0.72;
        ctx.strokeStyle=AMBER; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.moveTo(twX,twBaseY); ctx.lineTo(twX-24,twBaseY-100); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(twX,twBaseY); ctx.lineTo(twX+24,twBaseY-100); ctx.stroke();
        ctx.strokeStyle=GOLD; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(twX-16,twBaseY-38); ctx.lineTo(twX+16,twBaseY-38); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(twX-20,twBaseY-66); ctx.lineTo(twX+20,twBaseY-66); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(twX-10,twBaseY-90); ctx.lineTo(twX+10,twBaseY-90); ctx.stroke();
        // Signal arcs
        for (let wa=0;wa<5;wa++) {
          const wAlpha=0.12+0.1*Math.sin(t*2.5+wa);
          ctx.strokeStyle=`rgba(${GOLDr},${wAlpha})`; ctx.lineWidth=1.2;
          ctx.beginPath(); ctx.arc(twX,twBaseY-104,14+wa*16,Math.PI*1.1,Math.PI*1.9); ctx.stroke();
        }
        const blinkT=Math.sin(t*4)>0;
        ctx.fillStyle=blinkT?`rgba(${ORANGEr},0.95)`:AMBER;
        ctx.shadowColor=ORANGE; ctx.shadowBlur=blinkT?14:4;
        ctx.beginPath(); ctx.arc(twX,twBaseY-104,5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
        ctx.fillStyle=AMBER+"88"; ctx.font="bold 5.5px Orbitron, monospace"; ctx.textAlign="center";
        ctx.fillText("TOWER",twX,twBaseY+12);

        // ── CALL-IN PHONE BANK (right wall, below tower) ──
        const phX=W-room.S-90, phY=H*0.48;
        ctx.fillStyle="#0e0a06"; ctx.strokeStyle=ORANGE+"77"; ctx.lineWidth=1.5;
        rr(phX,phY,62,52,4); ctx.fill(); ctx.stroke();
        ctx.fillStyle=ORANGE+"88"; ctx.font="bold 5px Orbitron, monospace"; ctx.textAlign="center";
        ctx.fillText("CALL IN",phX+31,phY+10);
        // 6 phone line buttons
        for (let ln=0;ln<6;ln++) {
          const lx=phX+7+ln*9, ly=phY+16;
          const lActive=Math.sin(t*3.5+ln*1.1)>0.6;
          ctx.fillStyle=lActive?`rgba(${GOLDr},0.9)`:"#1a1006";
          ctx.shadowColor=lActive?GOLD:"transparent"; ctx.shadowBlur=lActive?6:0;
          rr(lx,ly,7,7,2); ctx.fill(); ctx.shadowBlur=0;
          ctx.strokeStyle=AMBER+"66"; ctx.lineWidth=0.7; ctx.stroke();
          ctx.fillStyle=AMBER+"99"; ctx.font="bold 3.5px monospace"; ctx.textAlign="center";
          ctx.fillText(ln+1,lx+3.5,ly+5.5);
        }
        // Phone number display
        ctx.fillStyle="#040200"; ctx.strokeStyle=GOLD+"44"; ctx.lineWidth=0.8;
        rr(phX+6,phY+28,50,16,2); ctx.fill(); ctx.stroke();
        ctx.fillStyle=`rgba(${GOLDr},${0.7+0.3*Math.sin(t*0.5)})`; ctx.font="bold 5px monospace"; ctx.textAlign="center";
        ctx.fillText("555-947-CITY",phX+31,phY+40);

        // ── 3 STUDIO BOOTHS (bottom half) ──
        const boothDefs=[
          {label:"BOOTH A",col:AMBER},{label:"MAIN STUDIO",col:GOLD},{label:"BOOTH B",col:ORANGE}
        ];
        for (let bi=0;bi<3;bi++) {
          const bthX=room.S+8+bi*((W-room.S*2-24)/3), bthY=H*0.56;
          const bthW=(W-room.S*2-24)/3-6, bthH=H*0.33;
          const bd=boothDefs[bi];
          ctx.fillStyle="#0e0a04"; ctx.strokeStyle=bi===1?GOLD:AMBER; ctx.lineWidth=bi===1?2:1.5;
          ctx.shadowColor=bi===1?GOLD:AMBER; ctx.shadowBlur=bi===1?8:4;
          rr(bthX,bthY,bthW,bthH,5); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
          ctx.fillStyle=bd.col; ctx.font="bold 6.5px Orbitron, monospace"; ctx.textAlign="center";
          ctx.fillText(bd.label,bthX+bthW/2,bthY+12);
          // Viewing window
          ctx.fillStyle="#040200"; ctx.strokeStyle=bd.col+"55"; ctx.lineWidth=1;
          rr(bthX+bthW*0.12,bthY+16,bthW*0.76,bthH*0.36,3); ctx.fill(); ctx.stroke();
          // Glass sheen
          ctx.fillStyle="rgba(255,200,100,0.05)"; ctx.fillRect(bthX+bthW*0.14,bthY+18,bthW*0.72,4);
          // Mini mixer inside booth
          ctx.fillStyle="#0a0806"; ctx.strokeStyle=bd.col+"44"; ctx.lineWidth=0.8;
          rr(bthX+bthW*0.1,bthY+bthH*0.55,bthW*0.8,22,3); ctx.fill(); ctx.stroke();
          // Mini faders
          const mfCount=bi===1?8:5;
          for (let mf=0;mf<mfCount;mf++) {
            const mfx=bthX+bthW*0.14+mf*(bthW*0.76/mfCount), mfy2=bthY+bthH*0.55+3;
            const mfH=6+Math.sin(t*2+mf+bi*1.5)*5;
            ctx.fillStyle=bd.col+(Math.floor(0.5*255).toString(16).padStart(2,"0"));
            ctx.fillRect(mfx,mfy2+18-mfH,bthW*0.76/mfCount-2,mfH);
          }
          // Mic stand inside booth
          ctx.strokeStyle=bi===1?GOLD+"BB":AMBER+"88"; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(bthX+bthW/2,bthY+bthH*0.5); ctx.lineTo(bthX+bthW/2,bthY+bthH*0.82); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bthX+bthW/2-10,bthY+bthH*0.82); ctx.lineTo(bthX+bthW/2+10,bthY+bthH*0.82); ctx.stroke();
          ctx.fillStyle="#1a1208"; ctx.strokeStyle=bd.col; ctx.lineWidth=1;
          ctx.shadowColor=bd.col; ctx.shadowBlur=bi===1?6:3;
          ctx.beginPath(); ctx.ellipse(bthX+bthW/2,bthY+bthH*0.45,6,9,0,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
        }

        // ── ANALOG STUDIO CLOCK (right-center upper wall) ──
        { const clkX=W*0.84, clkY=topY+56, clkR=26;
          ctx.fillStyle="#080604"; ctx.strokeStyle=AMBER; ctx.lineWidth=2;
          ctx.shadowColor=AMBER; ctx.shadowBlur=10;
          ctx.beginPath(); ctx.arc(clkX,clkY,clkR,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
          // Inner ring
          ctx.strokeStyle=GOLD+"44"; ctx.lineWidth=0.8;
          ctx.beginPath(); ctx.arc(clkX,clkY,clkR-5,0,Math.PI*2); ctx.stroke();
          // Tick marks
          for(let tk=0;tk<12;tk++){
            const ta=tk*Math.PI/6-Math.PI/2;
            const tIn=tk%3===0?clkR-7:clkR-4;
            ctx.strokeStyle=tk%3===0?GOLD:AMBER+"66"; ctx.lineWidth=tk%3===0?2:1;
            ctx.beginPath(); ctx.moveTo(clkX+Math.cos(ta)*tIn,clkY+Math.sin(ta)*tIn);
            ctx.lineTo(clkX+Math.cos(ta)*(clkR-1),clkY+Math.sin(ta)*(clkR-1)); ctx.stroke();
          }
          // Real clock hands
          const clkNow=new Date(), clkS=clkNow.getSeconds()+clkNow.getMilliseconds()/1000;
          const clkM=clkNow.getMinutes()+clkS/60, clkH=clkNow.getHours()%12+clkM/60;
          const hAng=clkH/12*Math.PI*2-Math.PI/2, mAng=clkM/60*Math.PI*2-Math.PI/2, sAng=clkS/60*Math.PI*2-Math.PI/2;
          ctx.lineCap="round";
          ctx.strokeStyle=GOLD; ctx.lineWidth=3;
          ctx.beginPath(); ctx.moveTo(clkX,clkY); ctx.lineTo(clkX+Math.cos(hAng)*(clkR*0.52),clkY+Math.sin(hAng)*(clkR*0.52)); ctx.stroke();
          ctx.strokeStyle=AMBER; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(clkX,clkY); ctx.lineTo(clkX+Math.cos(mAng)*(clkR*0.8),clkY+Math.sin(mAng)*(clkR*0.8)); ctx.stroke();
          ctx.strokeStyle=ORANGE; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(clkX,clkY); ctx.lineTo(clkX+Math.cos(sAng)*(clkR*0.9),clkY+Math.sin(sAng)*(clkR*0.9)); ctx.stroke();
          ctx.lineCap="butt";
          ctx.fillStyle=GOLD; ctx.beginPath(); ctx.arc(clkX,clkY,2.5,0,Math.PI*2); ctx.fill();
          ctx.fillStyle=AMBER+"88"; ctx.font="bold 5px Orbitron,monospace"; ctx.textAlign="center";
          ctx.fillText("STUDIO",clkX,clkY+clkR+10); }

        // ── VINYL / CD RECORD LIBRARY (left wall, below equipment rack) ──
        { const libX=room.S+36, libY=H*0.56, libW=68, libH=72;
          ctx.fillStyle="#080602"; ctx.strokeStyle=AMBER+"44"; ctx.lineWidth=1.2;
          rr(libX,libY,libW,libH,3); ctx.fill(); ctx.stroke();
          // Shelf horizontal lines
          const recCols=["#3a1a08","#0a1a0a","#0a0a2a","#1a0a08","#2a1010","#1a1a00","#180a1a","#0a1410"];
          for(let sh=0;sh<3;sh++){
            ctx.strokeStyle=AMBER+"22"; ctx.lineWidth=0.5;
            ctx.beginPath(); ctx.moveTo(libX+3,libY+21+sh*22); ctx.lineTo(libX+libW-3,libY+21+sh*22); ctx.stroke();
            for(let rec=0;rec<8;rec++){
              const rx=libX+4+rec*8, ry=libY+4+sh*22;
              ctx.fillStyle=recCols[(sh*8+rec)%8]; ctx.fillRect(rx,ry,7,17);
              ctx.strokeStyle="rgba(255,153,51,0.08)"; ctx.lineWidth=0.3; ctx.strokeRect(rx,ry,7,17);
              // vinyl circle hint on some
              if((sh+rec)%3===0){ ctx.strokeStyle="rgba(255,204,68,0.12)"; ctx.lineWidth=0.4;
                ctx.beginPath(); ctx.arc(rx+3.5,ry+8,2.5,0,Math.PI*2); ctx.stroke(); }
            }
          }
          ctx.fillStyle=AMBER+"66"; ctx.font="bold 5px monospace"; ctx.textAlign="center";
          ctx.fillText("VINYL",libX+libW/2,libY+libH-3); }

        // ── COFFEE MACHINE (left wall, bottom corner) ──
        { const cfX=room.S+36, cfY=H*0.81, cfW=52, cfH=44;
          ctx.fillStyle="#0e0a04"; ctx.strokeStyle=AMBER+"55"; ctx.lineWidth=1.2;
          rr(cfX,cfY,cfW,cfH,4); ctx.fill(); ctx.stroke();
          // Machine body
          ctx.fillStyle="#180e06"; ctx.strokeStyle=ORANGE+"44"; ctx.lineWidth=0.8;
          rr(cfX+4,cfY+3,cfW-8,cfH-18,3); ctx.fill(); ctx.stroke();
          // Digital display
          ctx.fillStyle="#030200"; ctx.strokeStyle=GOLD+"44"; ctx.lineWidth=0.7;
          rr(cfX+7,cfY+5,cfW-20,14,2); ctx.fill(); ctx.stroke();
          const bPulse=0.6+0.4*Math.sin(t*3);
          ctx.fillStyle=`rgba(${GOLDr},${bPulse})`; ctx.font="bold 4.5px monospace"; ctx.textAlign="center";
          ctx.fillText("BREWING",cfX+cfW*0.36,cfY+15);
          // Brew button (orange, glowing)
          ctx.fillStyle=`rgba(${ORANGEr},0.9)`; ctx.shadowColor=ORANGE; ctx.shadowBlur=5;
          ctx.beginPath(); ctx.arc(cfX+cfW-10,cfY+11,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
          ctx.strokeStyle=GOLD; ctx.lineWidth=0.8; ctx.stroke();
          // Cup slot
          ctx.fillStyle="#0a0604"; ctx.strokeStyle=AMBER+"33"; ctx.lineWidth=0.7;
          rr(cfX+cfW*0.22,cfY+cfH-16,cfW*0.54,13,2); ctx.fill(); ctx.stroke();
          // Coffee cup
          ctx.fillStyle="#CCAA88"; ctx.strokeStyle=AMBER; ctx.lineWidth=1;
          rr(cfX+cfW*0.30,cfY+cfH-14,cfW*0.38,9,2); ctx.fill(); ctx.stroke();
          ctx.fillStyle="#3a1800"; ctx.fillRect(cfX+cfW*0.32,cfY+cfH-13,cfW*0.34,3);
          // Steam wisps
          for(let sm=0;sm<3;sm++){
            const stX=cfX+cfW*0.38+sm*6, stOff=(t*16+sm*2.0)%8, smA=0.38-stOff/8*0.38;
            ctx.strokeStyle=`rgba(255,200,120,${smA})`; ctx.lineWidth=0.8;
            ctx.beginPath(); ctx.moveTo(stX,cfY+cfH-18-stOff);
            ctx.quadraticCurveTo(stX+(sm%2===0?-3:3),cfY+cfH-23-stOff,stX,cfY+cfH-28-stOff); ctx.stroke();
          }
          ctx.fillStyle=AMBER+"77"; ctx.font="bold 5px monospace"; ctx.textAlign="center";
          ctx.fillText("COFFEE",cfX+cfW/2,cfY+cfH+9); }

        // ── HEADPHONE STATION (right side, near desk) ──
        { const hpX=bdX+bdW+56, hpY=bdY-8, hpW=36, hpH=50;
          ctx.fillStyle="#0c0806"; ctx.strokeStyle=GOLD+"55"; ctx.lineWidth=1;
          rr(hpX,hpY,hpW,hpH,3); ctx.fill(); ctx.stroke();
          // 3 hooks with headphones
          const hpColors=[GOLD,ORANGE,AMBER];
          for(let hp=0;hp<3;hp++){
            const hkX=hpX+8+hp*11, hkY=hpY+8;
            ctx.strokeStyle=AMBER+"66"; ctx.lineWidth=1;
            ctx.beginPath(); ctx.moveTo(hkX,hkY); ctx.lineTo(hkX,hkY+8); ctx.stroke();
            ctx.strokeStyle=hpColors[hp]; ctx.lineWidth=2.5;
            ctx.beginPath(); ctx.arc(hkX,hkY+14,6,Math.PI,Math.PI*2); ctx.stroke();
            ctx.fillStyle=hp===2?"#111":hpColors[hp]+"33"; ctx.strokeStyle=hpColors[hp]; ctx.lineWidth=1;
            for(const side of[-6,6]){
              ctx.beginPath(); ctx.ellipse(hkX+side,hkY+14,2.5,3.5,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
            }
          }
          ctx.fillStyle=GOLD+"77"; ctx.font="bold 4.5px monospace"; ctx.textAlign="center";
          ctx.fillText("PHONES",hpX+hpW/2,hpY+hpH-3); }

        // ── GOLD RECORD AWARD PLAQUE (right wall, upper) ──
        { const gpX=W*0.83, gpY=topY+100;
          // Wood frame
          ctx.fillStyle="#1a0c00"; ctx.strokeStyle=GOLD; ctx.lineWidth=2;
          ctx.shadowColor=GOLD; ctx.shadowBlur=8;
          rr(gpX,gpY,48,64,3); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
          // Gold record disc
          const recG=ctx.createRadialGradient(gpX+24,gpY+24,0,gpX+24,gpY+24,18);
          recG.addColorStop(0,"rgba(255,215,0,0.5)"); recG.addColorStop(0.6,"rgba(255,153,51,0.2)"); recG.addColorStop(1,"rgba(200,160,0,0.3)");
          ctx.fillStyle="#1a1200"; ctx.strokeStyle=GOLD+"88"; ctx.lineWidth=1;
          ctx.beginPath(); ctx.arc(gpX+24,gpY+24,18,0,Math.PI*2); ctx.fill(); ctx.stroke();
          ctx.fillStyle=recG; ctx.beginPath(); ctx.arc(gpX+24,gpY+24,18,0,Math.PI*2); ctx.fill();
          // Groove rings
          for(let gr=1;gr<=4;gr++){ ctx.strokeStyle=`rgba(${GOLDr},0.12)`; ctx.lineWidth=0.5;
            ctx.beginPath(); ctx.arc(gpX+24,gpY+24,gr*3+4,0,Math.PI*2); ctx.stroke(); }
          // Center label
          ctx.fillStyle="#CC8800"; ctx.beginPath(); ctx.arc(gpX+24,gpY+24,6,0,Math.PI*2); ctx.fill();
          ctx.fillStyle=GOLD; ctx.font="bold 3.5px monospace"; ctx.textAlign="center";
          ctx.fillText("GOLD",gpX+24,gpY+25.5);
          // Text beneath
          ctx.fillStyle=GOLD+"BB"; ctx.font="bold 5px monospace";
          ctx.fillText("#1 HIT",gpX+24,gpY+50);
          ctx.fillStyle=AMBER+"99"; ctx.font="3.5px monospace";
          ctx.fillText("94.7 FM",gpX+24,gpY+59); }

        // ── PROGRAM SCHEDULE BOARD (between rack and desk) ──
        { const sbX=room.S+108, sbY=H*0.38, sbW=70, sbH=96;
          ctx.fillStyle="#060400"; ctx.strokeStyle=AMBER+"44"; ctx.lineWidth=1.2;
          rr(sbX,sbY,sbW,sbH,4); ctx.fill(); ctx.stroke();
          ctx.fillStyle=AMBER+"BB"; ctx.font="bold 5px Orbitron,monospace"; ctx.textAlign="center";
          ctx.fillText("TODAY'S SHOWS",sbX+sbW/2,sbY+11);
          ctx.strokeStyle=AMBER+"33"; ctx.lineWidth=0.5;
          ctx.beginPath(); ctx.moveTo(sbX+5,sbY+15); ctx.lineTo(sbX+sbW-5,sbY+15); ctx.stroke();
          const shows=[{t:"06:00",s:"MORNING DRIVE"},{t:"10:00",s:"TOP 40"},
            {t:"14:00",s:"CITY TALK"},{t:"17:00",s:"RUSH HOUR"},
            {t:"21:00",s:"NIGHT WAVE"},{t:"00:00",s:"LATE NIGHT"}];
          const curH=new Date().getHours();
          for(let si=0;si<shows.length;si++){
            const sh=shows[si], sy=sbY+24+si*12;
            const isNow=(curH>=17&&si===3)||(curH>=21&&si===4)||(curH>=10&&curH<14&&si===1)||(curH>=14&&curH<17&&si===2)||(curH>=6&&curH<10&&si===0);
            ctx.fillStyle=isNow?`rgba(${GOLDr},1)`:AMBER+"77";
            ctx.font=isNow?"bold 4px monospace":"3.5px monospace"; ctx.textAlign="left";
            ctx.fillText(sh.t,sbX+5,sy); ctx.fillText(sh.s,sbX+29,sy);
            if(isNow){ const onA2=0.7+0.3*Math.sin(t*4);
              ctx.fillStyle=`rgba(220,30,10,${onA2})`; ctx.font="bold 3px monospace"; ctx.textAlign="center";
              ctx.fillText("▶",sbX+sbW-5,sy); }
          } }

        // ── JINGLE / FX PAD CONTROLLER (on desk, right side) ──
        { const pdX=bdX+bdW*0.60, pdY=bdY+7, pdW=52, pdH=30;
          ctx.fillStyle="#060402"; ctx.strokeStyle=AMBER+"44"; ctx.lineWidth=0.8;
          rr(pdX,pdY,pdW,pdH,3); ctx.fill(); ctx.stroke();
          const padCols=[AMBER,GOLD,ORANGE,"#FF3366",AMBER,GOLD,ORANGE,AMBER,GOLD,ORANGE,AMBER,GOLD];
          for(let pr=0;pr<3;pr++){
            for(let pc=0;pc<4;pc++){
              const pi2=pr*4+pc, pdx=pdX+4+pc*12, pdy=pdY+4+pr*8;
              const lit=Math.sin(t*3+pi2*0.8)>0.65;
              ctx.fillStyle=lit?padCols[pi2]:padCols[pi2]+"22";
              ctx.shadowColor=lit?padCols[pi2]:"transparent"; ctx.shadowBlur=lit?5:0;
              rr(pdx,pdy,10,6,1); ctx.fill(); ctx.shadowBlur=0;
              ctx.strokeStyle=padCols[pi2]+"44"; ctx.lineWidth=0.5; ctx.stroke();
            }
          }
          ctx.fillStyle=AMBER+"66"; ctx.font="bold 4.5px monospace"; ctx.textAlign="center";
          ctx.fillText("FX PADS",pdX+pdW/2,pdY+pdH+6); }

        // ── DAW WORKSTATION SCREEN (center-left below desk) ──
        { const dwX=bdX+14, dwY=bdY+bdH+16, dwW=W*0.22, dwH=58;
          // Monitor stand
          ctx.fillStyle="#1a1006"; ctx.strokeStyle=AMBER+"33"; ctx.lineWidth=1;
          rr(dwX+dwW/2-6,dwY+dwH,12,12,2); ctx.fill(); ctx.stroke();
          ctx.fillRect(dwX+dwW/2-18,dwY+dwH+10,36,4);
          // Screen bezel
          ctx.fillStyle="#0c0806"; ctx.strokeStyle=GOLD; ctx.lineWidth=2;
          ctx.shadowColor=GOLD; ctx.shadowBlur=8;
          rr(dwX,dwY,dwW,dwH,4); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
          // Screen interior (DAW timeline)
          ctx.fillStyle="#020100"; rr(dwX+3,dwY+3,dwW-6,dwH-6,2); ctx.fill();
          // Track lanes (6 colored audio tracks)
          const dawCols=[AMBER,GOLD,ORANGE,"#44AAFF","#FF4488","#44FF88"];
          for(let tr=0;tr<6;tr++){
            const ty=dwY+5+tr*(dwH-12)/6, th=(dwH-14)/6-1;
            ctx.fillStyle=dawCols[tr]+"18"; ctx.fillRect(dwX+28,ty,dwW-34,th);
            // Track label
            ctx.fillStyle=dawCols[tr]+"CC"; ctx.font="bold 4px monospace"; ctx.textAlign="left";
            ctx.fillText(["VOX","GTR","KEYS","BASS","FX","AMBT"][tr],dwX+5,ty+th-1);
            // Audio waveform blocks
            for(let wv=0;wv<14;wv++){
              const wx=dwX+28+wv*((dwW-34)/14);
              const wh=2+Math.abs(Math.sin(t*1.4+tr*0.8+wv*0.6))*((th-2)*0.85);
              const wA=0.45+0.35*Math.abs(Math.sin(t*2.2+wv*0.4+tr));
              ctx.fillStyle=`${dawCols[tr]}${Math.floor(wA*255).toString(16).padStart(2,"0")}`;
              ctx.fillRect(wx+1,ty+th/2-wh/2,Math.max(2,(dwW-34)/14-2),wh);
            }
          }
          // Playhead (animated red line)
          const phPos=dwX+28+((t*18)%((dwW-34)));
          ctx.strokeStyle="rgba(255,60,60,0.9)"; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(phPos,dwY+4); ctx.lineTo(phPos,dwY+dwH-4); ctx.stroke();
          ctx.fillStyle="rgba(255,60,60,0.9)"; ctx.beginPath(); ctx.arc(phPos,dwY+4,3,0,Math.PI*2); ctx.fill();
          // Label
          ctx.fillStyle=GOLD+"99"; ctx.font="bold 5px Orbitron,monospace"; ctx.textAlign="center";
          ctx.fillText("DAW  •  CITY FREQUENCY STUDIO",dwX+dwW/2,dwY+dwH+26); }

        // ── REEL-TO-REEL TAPE RECORDER (right of center, below desk) ──
        { const rtX=cx+W*0.12, rtY=bdY+bdH+16, rtW=82, rtH=74;
          // Machine chassis
          const rtG=ctx.createLinearGradient(rtX,rtY,rtX,rtY+rtH);
          rtG.addColorStop(0,"#1a1208"); rtG.addColorStop(1,"#0e0804");
          ctx.fillStyle=rtG; ctx.strokeStyle=AMBER+"88"; ctx.lineWidth=1.5;
          ctx.shadowColor=AMBER; ctx.shadowBlur=6;
          rr(rtX,rtY,rtW,rtH,4); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
          // Two spinning reels
          for(let ri=0;ri<2;ri++){
            const rlX=rtX+18+ri*46, rlY=rtY+22, rlR=16;
            // Reel hub
            ctx.fillStyle="#0a0604"; ctx.strokeStyle=GOLD; ctx.lineWidth=1.2;
            ctx.beginPath(); ctx.arc(rlX,rlY,rlR,0,Math.PI*2); ctx.fill(); ctx.stroke();
            // Tape wound on reel (more tape on left reel = supply)
            const tapeR=ri===0?rlR-2:rlR-6;
            ctx.strokeStyle=`rgba(${AMBERr},0.3)`; ctx.lineWidth=tapeR;
            ctx.beginPath(); ctx.arc(rlX,rlY,tapeR/2+2,0,Math.PI*2); ctx.stroke();
            // Spinning spokes (3)
            const rAngle=t*(ri===0?1.8:-1.8);
            for(let sp=0;sp<3;sp++){
              const sa=rAngle+sp*Math.PI*2/3;
              ctx.strokeStyle=GOLD+"88"; ctx.lineWidth=1.2;
              ctx.beginPath(); ctx.moveTo(rlX,rlY);
              ctx.lineTo(rlX+Math.cos(sa)*(rlR-3),rlY+Math.sin(sa)*(rlR-3)); ctx.stroke();
            }
            // Center hub dot
            ctx.fillStyle=ORANGE; ctx.beginPath(); ctx.arc(rlX,rlY,3,0,Math.PI*2); ctx.fill();
          }
          // Tape path between reels
          ctx.strokeStyle=AMBER+"55"; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(rtX+34,rtY+22); ctx.lineTo(rtX+48,rtY+22); ctx.stroke();
          // Tape head block
          ctx.fillStyle="#221408"; ctx.strokeStyle=AMBER; ctx.lineWidth=1;
          rr(rtX+33,rtY+18,16,8,2); ctx.fill(); ctx.stroke();
          // VU meter
          ctx.fillStyle="#030200"; ctx.strokeStyle=GOLD+"44"; ctx.lineWidth=0.7;
          rr(rtX+6,rtY+44,rtW-12,20,2); ctx.fill(); ctx.stroke();
          // VU needle + bars
          for(let vu=0;vu<2;vu++){
            const vux=rtX+8+vu*(rtW/2-8), vuy=rtY+46, vuw=(rtW/2-12);
            const lvl=0.4+0.5*Math.abs(Math.sin(t*5.5+vu*1.4));
            const vg=ctx.createLinearGradient(vux,vuy,vux+vuw*lvl,vuy);
            vg.addColorStop(0,"rgba(100,220,80,0.9)"); vg.addColorStop(0.7,"rgba(255,220,0,0.9)"); vg.addColorStop(1,"rgba(255,60,0,0.9)");
            ctx.fillStyle=vg; ctx.fillRect(vux,vuy+4,vuw*lvl,10);
            ctx.strokeStyle=GOLD+"44"; ctx.lineWidth=0.5; ctx.strokeRect(vux,vuy+4,vuw,10);
            ctx.fillStyle=AMBER+"77"; ctx.font="bold 4px monospace"; ctx.textAlign="left";
            ctx.fillText(vu===0?"L":"R",vux,vuy+4);
          }
          ctx.fillStyle=AMBER+"88"; ctx.font="bold 5px Orbitron,monospace"; ctx.textAlign="center";
          ctx.fillText("REEL-TO-REEL",rtX+rtW/2,rtY+rtH+10); }

        // ── VINYL TURNTABLE (center-left, lower area) ──
        { const ttX=bdX+W*0.08, ttY=H*0.40, ttW=64, ttH=52;
          // Plinth
          const ttG=ctx.createLinearGradient(ttX,ttY,ttX,ttY+ttH);
          ttG.addColorStop(0,"#181006"); ttG.addColorStop(1,"#0c0804");
          ctx.fillStyle=ttG; ctx.strokeStyle=AMBER+"66"; ctx.lineWidth=1.2;
          rr(ttX,ttY,ttW,ttH,4); ctx.fill(); ctx.stroke();
          // Platter
          const ttCX=ttX+ttW*0.44, ttCY=ttY+ttH*0.44, ttR=20;
          ctx.fillStyle="#0a0604"; ctx.strokeStyle=GOLD+"55"; ctx.lineWidth=1;
          ctx.beginPath(); ctx.arc(ttCX,ttCY,ttR,0,Math.PI*2); ctx.fill(); ctx.stroke();
          // Spinning vinyl record
          const rAngle2=t*2.4;
          const recGrd=ctx.createRadialGradient(ttCX,ttCY,0,ttCX,ttCY,ttR-1);
          recGrd.addColorStop(0,"rgba(255,180,0,0.3)"); recGrd.addColorStop(0.3,"rgba(20,10,5,1)"); recGrd.addColorStop(1,"rgba(10,5,3,1)");
          ctx.fillStyle=recGrd; ctx.beginPath(); ctx.arc(ttCX,ttCY,ttR-1,0,Math.PI*2); ctx.fill();
          // Spinning grooves
          for(let gr=1;gr<=5;gr++){
            ctx.strokeStyle=`rgba(${AMBERr},${0.06+gr*0.02})`; ctx.lineWidth=0.4;
            ctx.beginPath(); ctx.arc(ttCX,ttCY,gr*3,0,Math.PI*2); ctx.stroke();
          }
          // Center label (spinning)
          ctx.save(); ctx.translate(ttCX,ttCY); ctx.rotate(rAngle2);
          ctx.fillStyle="#CC7700"; ctx.beginPath(); ctx.arc(0,0,6,0,Math.PI*2); ctx.fill();
          ctx.fillStyle=GOLD; ctx.font="bold 3px monospace"; ctx.textAlign="center";
          ctx.fillText("94.7",0,1.5); ctx.restore();
          // Tonearm
          ctx.save(); ctx.translate(ttX+ttW*0.82,ttY+12); ctx.rotate(-0.6);
          ctx.strokeStyle=GOLD; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-18,32); ctx.stroke();
          ctx.fillStyle=AMBER; ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#2a1a08"; ctx.beginPath(); ctx.arc(-18,32,2.5,0,Math.PI*2); ctx.fill();
          ctx.restore();
          // Controls (start/stop button)
          ctx.fillStyle=`rgba(80,200,80,0.85)`; ctx.shadowColor="#60FF60"; ctx.shadowBlur=4;
          ctx.beginPath(); ctx.arc(ttX+ttW-9,ttY+ttH-10,5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
          ctx.fillStyle=AMBER+"77"; ctx.font="bold 4.5px Orbitron,monospace"; ctx.textAlign="center";
          ctx.fillText("TURNTABLE",ttX+ttW/2,ttY+ttH+10); }

        // ── GUEST INTERVIEW CHAIRS (center, below desk) ──
        { const gc1X=cx-W*0.04, gc2X=cx+W*0.08, gcY=H*0.41, gcW=28, gcH=38;
          for(let gc=0;gc<2;gc++){
            const gcX=gc===0?gc1X:gc2X;
            // Chair back
            const cgBack=ctx.createLinearGradient(gcX,gcY,gcX,gcY+gcH*0.55);
            cgBack.addColorStop(0,"#1e1208"); cgBack.addColorStop(1,"#140c06");
            ctx.fillStyle=cgBack; ctx.strokeStyle=AMBER+"44"; ctx.lineWidth=1;
            rr(gcX,gcY,gcW,gcH*0.6,4); ctx.fill(); ctx.stroke();
            // Seat
            const cgSeat=ctx.createLinearGradient(gcX,gcY+gcH*0.6,gcX,gcY+gcH*0.85);
            cgSeat.addColorStop(0,"#241408"); cgSeat.addColorStop(1,"#1a1006");
            ctx.fillStyle=cgSeat; ctx.strokeStyle=AMBER+"44"; ctx.lineWidth=1;
            rr(gcX-2,gcY+gcH*0.6,gcW+4,gcH*0.28,3); ctx.fill(); ctx.stroke();
            // Armrests
            for(const [arX] of [[gcX-5],[gcX+gcW-2]]){
              ctx.fillStyle="#180e06"; ctx.strokeStyle=AMBER+"33"; ctx.lineWidth=0.7;
              rr(arX,gcY+gcH*0.25,7,gcH*0.42,2); ctx.fill(); ctx.stroke();
            }
            // Legs
            ctx.strokeStyle=GOLD+"66"; ctx.lineWidth=1.2;
            for(const [lx,ly] of [[gcX+3,gcY+gcH*0.88],[gcX+gcW-3,gcY+gcH*0.88]]){
              ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx+2,ly+gcH*0.12); ctx.stroke();
            }
            // Cushion lines
            ctx.strokeStyle="rgba(255,153,51,0.08)"; ctx.lineWidth=0.5;
            ctx.beginPath(); ctx.moveTo(gcX+4,gcY+gcH*0.72); ctx.lineTo(gcX+gcW-4,gcY+gcH*0.72); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(gcX+6,gcY+gcH*0.2); ctx.lineTo(gcX+gcW-6,gcY+gcH*0.2); ctx.stroke();
          }
          ctx.fillStyle=AMBER+"55"; ctx.font="bold 5px monospace"; ctx.textAlign="center";
          ctx.fillText("INTERVIEW",cx+W*0.02,gcY+gcH+9); }

        // ── ACOUSTIC GUITAR (right wall, below gold record) ──
        { const agX=W*0.87, agY=topY+172;
          // Wall hook
          ctx.strokeStyle=GOLD+"88"; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(agX+10,agY); ctx.lineTo(agX+10,agY+6); ctx.stroke();
          // Guitar body (figure-8 shape)
          ctx.fillStyle="#3a1c06"; ctx.strokeStyle=AMBER+"88"; ctx.lineWidth=1.5;
          ctx.shadowColor=AMBER; ctx.shadowBlur=5;
          ctx.beginPath(); ctx.ellipse(agX+10,agY+38,14,20,0,0,Math.PI*2); ctx.fill(); ctx.stroke(); // lower bout
          ctx.beginPath(); ctx.ellipse(agX+10,agY+18,10,14,0,0,Math.PI*2); ctx.fill(); ctx.stroke(); // upper bout
          ctx.shadowBlur=0;
          // Sound hole
          ctx.fillStyle="#1a0c04"; ctx.strokeStyle=GOLD+"66"; ctx.lineWidth=0.8;
          ctx.beginPath(); ctx.arc(agX+10,agY+36,6,0,Math.PI*2); ctx.fill(); ctx.stroke();
          // Neck
          ctx.fillStyle="#2a1404"; ctx.strokeStyle=AMBER+"55"; ctx.lineWidth=1;
          rr(agX+7,agY+3,6,12,1); ctx.fill(); ctx.stroke();
          // Frets
          for(let fr=0;fr<4;fr++){
            ctx.strokeStyle=GOLD+"44"; ctx.lineWidth=0.5;
            ctx.beginPath(); ctx.moveTo(agX+7,agY+5+fr*3); ctx.lineTo(agX+13,agY+5+fr*3); ctx.stroke();
          }
          // Strings (6)
          for(let str=0;str<6;str++){
            ctx.strokeStyle=`rgba(${GOLDr},0.18)`; ctx.lineWidth=0.4;
            ctx.beginPath(); ctx.moveTo(agX+8+str*0.4,agY+4); ctx.lineTo(agX+5+str*0.8,agY+52); ctx.stroke();
          }
          // Tuning pegs
          for(let peg=0;peg<3;peg++){
            ctx.fillStyle=GOLD+"88"; ctx.beginPath(); ctx.arc(agX+6,agY+2+peg*3,1.5,0,Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(agX+14,agY+2+peg*3,1.5,0,Math.PI*2); ctx.fill();
          }
          ctx.fillStyle=AMBER+"66"; ctx.font="bold 4.5px monospace"; ctx.textAlign="center";
          ctx.fillText("LIVE",agX+10,agY+62); }

        // ── BROADCAST SCRIPT STAND (near mic, right of center) ──
        { const ssX=cx+W*0.08, ssY=bdY-28;
          // Stand leg
          ctx.strokeStyle=AMBER+"66"; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(ssX,ssY+50); ctx.lineTo(ssX,ssY+20); ctx.stroke();
          // Tray base
          ctx.beginPath(); ctx.moveTo(ssX-16,ssY+50); ctx.lineTo(ssX+16,ssY+50); ctx.stroke();
          // Angled script holder
          ctx.save(); ctx.translate(ssX,ssY+18); ctx.rotate(-0.28);
          ctx.fillStyle="#F4ECD8"; ctx.strokeStyle=AMBER+"44"; ctx.lineWidth=0.8;
          rr(-14,-14,28,20,1); ctx.fill(); ctx.stroke();
          // Script lines
          ctx.fillStyle="rgba(60,40,20,0.6)"; ctx.font="3px monospace"; ctx.textAlign="left";
          for(let ln=0;ln<5;ln++) ctx.fillRect(-12,-11+ln*3.8,20+Math.sin(ln*2.3)*4,1);
          // "ON AIR" highlight
          ctx.fillStyle=`rgba(220,30,10,${0.5+0.4*Math.sin(t*4)})`; ctx.fillRect(-12,-11,8,3);
          ctx.restore(); }

        // ── PATCH BAY WITH CABLES (right wall, above phone bank) ──
        { const pbX=W-room.S-88, pbY=H*0.33, pbW=54, pbH=26;
          ctx.fillStyle="#080604"; ctx.strokeStyle=AMBER+"44"; ctx.lineWidth=1;
          rr(pbX,pbY,pbW,pbH,3); ctx.fill(); ctx.stroke();
          ctx.fillStyle=AMBER+"77"; ctx.font="bold 4.5px monospace"; ctx.textAlign="center";
          ctx.fillText("PATCH BAY",pbX+pbW/2,pbY+8);
          // Patch jacks (4x2 grid)
          const jackCols=[AMBER,GOLD,ORANGE,"#44AAFF",AMBER,GOLD,"#FF4488",ORANGE];
          for(let jk=0;jk<8;jk++){
            const jx=pbX+5+jk%4*12, jy=pbY+11+Math.floor(jk/4)*10;
            ctx.fillStyle="#030200"; ctx.strokeStyle=jackCols[jk]+"88"; ctx.lineWidth=0.8;
            ctx.beginPath(); ctx.arc(jx+4,jy+4,4,0,Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.fillStyle=jackCols[jk]+"55"; ctx.beginPath(); ctx.arc(jx+4,jy+4,2,0,Math.PI*2); ctx.fill();
          }
          // Dangling cables
          const cableMap=[[0,1],[2,5],[3,6],[4,7]];
          for(const [a,b] of cableMap){
            const ax=pbX+5+a%4*12+4, ay=pbY+11+Math.floor(a/4)*10+8;
            const bx=pbX+5+b%4*12+4, by=pbY+11+Math.floor(b/4)*10+8;
            const sag=8+Math.sin(t*0.8+a*1.2)*3;
            ctx.strokeStyle=jackCols[a]+"88"; ctx.lineWidth=1.2;
            ctx.beginPath(); ctx.moveTo(ax,ay); ctx.quadraticCurveTo((ax+bx)/2,ay+sag,bx,by); ctx.stroke();
          } }

        // ── NEWS TICKER / CRAWL (bottom strip above EQ bars) ──
        { const tkW=W-room.S*4, tkX=room.S*2, tkY=H-room.S-72, tkH=14;
          ctx.fillStyle="#0a0604"; ctx.strokeStyle=AMBER+"33"; ctx.lineWidth=0.8;
          ctx.fillRect(tkX,tkY,tkW,tkH); ctx.strokeRect(tkX,tkY,tkW,tkH);
          ctx.save(); ctx.beginPath(); ctx.rect(tkX,tkY,tkW,tkH); ctx.clip();
          const ticker="▶  CITY FREQUENCY 94.7 FM  •  WEATHER: CLEAR SKIES  •  TRAFFIC: HEAVY ON MAIN ST  •  HEADLINES: LOCAL MUSIC AWARDS TONIGHT  •  LISTENER REQUEST LINE OPEN  •  NEXT UP: TOP 40 COUNTDOWN  •  ";
          const tickOff=((t*38)%((ticker.length)*5.2));
          ctx.fillStyle=`rgba(${GOLDr},0.85)`; ctx.font="bold 7px monospace"; ctx.textAlign="left";
          ctx.fillText(ticker+ticker,tkX+tkW-tickOff,tkY+10); ctx.restore(); }

        // ── EQ BARS across floor ──
        const eqFlY=H-room.S-54;
        for (let eq=0;eq<36;eq++) {
          const eqx=room.S*2+eq*((W-room.S*4)/36);
          const eqh=5+Math.abs(Math.sin(t*4+eq*0.5+Math.cos(t*1.4+eq*0.2)))*32;
          const eqCol=eq<12?AMBERr:eq<24?GOLDr:ORANGEr;
          ctx.fillStyle=`rgba(${eqCol},${0.3+0.35*Math.abs(Math.sin(t*3+eq*0.4))})`;
          ctx.fillRect(eqx-2,eqFlY-eqh,4,eqh);
        }
        ctx.fillStyle=`rgba(${AMBERr},0.22)`; ctx.fillRect(room.S*2,eqFlY,W-room.S*4,1);

        // ── AMBIENT PARTICLES (signal dust) ──
        for (let pi=0;pi<16;pi++) {
          const pxp=room.S*2+((t*10+pi*64)%(W-room.S*4));
          const pyp=topY+120+Math.sin(t*0.5+pi*0.7)*24+(pi%5)*26;
          const palpha=Math.sin(t*1.2+pi*0.8)*0.06+0.06;
          ctx.fillStyle=`rgba(${AMBERr},${palpha})`;
          ctx.beginPath(); ctx.arc(pxp,pyp,pi%4===0?3.5:1.5,0,Math.PI*2); ctx.fill();
        }

        return;
      } else if (!!this.map?.config?.wasteland) {
        // ═══ WASTELAND: RADIO STATION ═══
        const t = performance.now() / 1000;
        const onAirAlpha = 0.6 + 0.4 * Math.sin(t * 3);
        ctx.fillStyle = `rgba(255,40,60,${onAirAlpha})`;
        ctx.shadowColor = "#FF0040";
        ctx.shadowBlur = 12 * onAirAlpha;
        rr(cx - 38, topY + 8, 76, 22, 4);
        // ── Broadcast desk (center) ───────────────────
        ctx.fillStyle = "#0a0a18";
        ctx.strokeStyle = "#FF88CC";
        ctx.lineWidth = 1.5;
        rr(cx - 52, midY - 14, 104, 36, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#111122";
        rr(cx - 44, midY - 10, 88, 28, 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(255,80,100,${onAirAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("● ON AIR", cx, topY + 23);

        // ── Soundproof panels (top wall - fixed alignment) ──────
        const panelCount = 4;
        const panelGap = 8;
        const totalPanelWidth = W - 40;
        const panelW = (totalPanelWidth - (panelCount - 1) * panelGap) / panelCount;
        for (let pi = 0; pi < panelCount; pi++) {
          const px = 20 + pi * (panelW + panelGap);
          ctx.fillStyle = "#2a1a28";
          ctx.strokeStyle = "#5a3a58";
          ctx.lineWidth = 1;
          rr(px, topY + 34, panelW, 32, 3);
          ctx.fill();
          ctx.stroke();
          // Foam wedge pattern
          ctx.fillStyle = "#3a2a38";
          const cols = Math.floor(panelW / 14);
          for (let ri = 0; ri < 2; ri++) {
            for (let ci = 0; ci < cols; ci++) {
              ctx.beginPath();
              ctx.moveTo(px + 4 + ci * 14, topY + 38 + ri * 14 + 12);
              ctx.lineTo(px + 4 + ci * 14 + 12, topY + 38 + ri * 14 + 12);
              ctx.lineTo(px + 4 + ci * 14 + 6, topY + 38 + ri * 14);
              ctx.closePath();
              ctx.fill();
            }
          }
        }

        // ── Main broadcast desk (center-top) ──────────────
        const deskX = cx - 80;
        const deskY = topY + 74;
        ctx.fillStyle = "#3a3530";
        ctx.strokeStyle = "#5a5048";
        ctx.lineWidth = 2;
        rr(deskX, deskY, 160, 38, 4);
        ctx.fill();
        ctx.stroke();

        // Mixing board on desk
        ctx.fillStyle = "#1a1a20";
        rr(deskX + 10, deskY + 4, 100, 28, 2);
        ctx.fill();
        // Faders
        for (let fi = 0; fi < 8; fi++) {
          const fx = deskX + 16 + fi * 12;
          ctx.fillStyle = "#2a2a30";
          ctx.fillRect(fx, deskY + 8, 8, 18);
          const fPos = 4 + 8 * (0.5 + 0.5 * Math.sin(t * (0.7 + fi * 0.12) + fi));
          ctx.fillStyle = fi % 2 === 0 ? "#FF88CC" : "#88CCFF";
          ctx.fillRect(fx + 1, deskY + 8 + fPos, 6, 4);
        }

        // VU meters
        ctx.fillStyle = "#44FF88";
        ctx.shadowColor = "#44FF88";
        ctx.shadowBlur = 4;
        ctx.fillRect(deskX + 118, deskY + 8, 12, 5);
        ctx.fillRect(deskX + 118, deskY + 15, 10, 4);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#FFCC00";
        ctx.fillRect(deskX + 118, deskY + 21, 8, 3);
        ctx.fillStyle = "#FF4400";
        ctx.fillRect(deskX + 118, deskY + 26, 5, 3);

        // Microphone on desk
        ctx.fillStyle = "#4a4a50";
        ctx.beginPath();
        ctx.ellipse(deskX + 145, deskY + 10, 6, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#6a6a70";
        ctx.lineWidth = 1;
        ctx.stroke();
        // Mic stand
        ctx.strokeStyle = "#5a5a60";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(deskX + 145, deskY + 20);
        ctx.lineTo(deskX + 145, deskY + 32);
        ctx.stroke();

        // ── Worker desk 1 (left side) ──────────────
        const desk1X = W * 0.10;
        const desk1Y = H * 0.42;
        ctx.fillStyle = "#3a3028";
        ctx.strokeStyle = "#5a4a38";
        ctx.lineWidth = 1.5;
        rr(desk1X, desk1Y, 70, 34, 3);
        ctx.fill();
        ctx.stroke();
        // Computer/equipment on desk
        ctx.fillStyle = "#1a1a20";
        rr(desk1X + 8, desk1Y + 4, 28, 20, 2);
        ctx.fill();
        ctx.fillStyle = "#00AAFF";
        ctx.fillRect(desk1X + 10, desk1Y + 6, 24, 14);
        // Papers
        ctx.fillStyle = "#EEDDCC";
        ctx.fillRect(desk1X + 42, desk1Y + 8, 20, 16);

        // ── Worker desk 2 (right side) ──────────────
        const desk2X = W * 0.62;
        const desk2Y = H * 0.42;
        ctx.fillStyle = "#3a3028";
        ctx.strokeStyle = "#5a4a38";
        ctx.lineWidth = 1.5;
        rr(desk2X, desk2Y, 75, 34, 3);
        ctx.fill();
        ctx.stroke();
        // Equipment
        ctx.fillStyle = "#2a2a30";
        rr(desk2X + 6, desk2Y + 4, 32, 22, 2);
        ctx.fill();
        ctx.fillStyle = "#FF88CC";
        ctx.shadowColor = "#FF88CC";
        ctx.shadowBlur = 4;
        ctx.fillRect(desk2X + 10, desk2Y + 8, 24, 14);
        ctx.shadowBlur = 0;
        // Headphones
        ctx.fillStyle = "#2a2a30";
        ctx.beginPath();
        ctx.arc(desk2X + 55, desk2Y + 12, 8, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(desk2X + 47, desk2Y + 12, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(desk2X + 63, desk2Y + 12, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // ── Speaker monitors (left wall) ──────────────
        for (let si = 0; si < 2; si++) {
          const spX = 16;
          const spY = H * 0.58 + si * 50;
          ctx.fillStyle = "#2a2520";
          ctx.strokeStyle = "#4a4540";
          ctx.lineWidth = 1.5;
          rr(spX, spY, 44, 40, 4);
          ctx.fill();
          ctx.stroke();
          // Speaker cone
          ctx.fillStyle = "#1a1a18";
          ctx.beginPath();
          ctx.arc(spX + 22, spY + 20, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#3a3a38";
          ctx.lineWidth = 1;
          for (let ri = 1; ri <= 2; ri++) {
            ctx.beginPath();
            ctx.arc(spX + 22, spY + 20, 5 * ri, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // ── Equipment rack (right wall) ──────────────
        const rackX = W - 70;
        const rackY = H * 0.34;
        ctx.fillStyle = "#2a2a28";
        ctx.strokeStyle = "#4a4a48";
        ctx.lineWidth = 1.5;
        rr(rackX, rackY, 52, 90, 3);
        ctx.fill();
        ctx.stroke();
        // Rack units with lights and labels
        const rackUnits = [
          { col: "#FF88CC", label: "AMP" },
          { col: "#44FF88", label: "EQ" },
          { col: "#FFAA00", label: "COMP" },
          { col: "#44AAFF", label: "OUT" },
        ];
        for (let ri = 0; ri < rackUnits.length; ri++) {
          const ru = rackUnits[ri];
          const ruy = rackY + 8 + ri * 20;
          ctx.fillStyle = "#1a1a1a";
          ctx.strokeStyle = ru.col + "44";
          ctx.lineWidth = 1;
          rr(rackX + 4, ruy, 44, 16, 2);
          ctx.fill();
          ctx.stroke();
          // LED strip
          ctx.fillStyle = ru.col;
          ctx.shadowColor = ru.col;
          ctx.shadowBlur = 4;
          ctx.fillRect(rackX + 8, ruy + 5, 6, 6);
          ctx.shadowBlur = 0;
          // Knob
          ctx.fillStyle = "#3a3a3a";
          ctx.beginPath();
          ctx.arc(rackX + 38, ruy + 8, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = ru.col + "66";
          ctx.lineWidth = 1;
          ctx.stroke();
          // Label
          ctx.fillStyle = ru.col;
          ctx.font = "3px monospace";
          ctx.textAlign = "center";
          ctx.fillText(ru.label, rackX + 24, ruy + 10);
        }
        // Rack label at bottom
        ctx.fillStyle = "rgba(255,136,204,0.5)";
        ctx.font = "bold 4px monospace";
        ctx.textAlign = "center";
        ctx.fillText("RACK", rackX + 26, rackY + 86);

        // ── Chairs for workers ──────────────
        // Chair 1 (near desk 1)
        ctx.fillStyle = "#3a3530";
        ctx.strokeStyle = "#5a5048";
        ctx.lineWidth = 1;
        rr(desk1X + 20, desk1Y + 38, 26, 18, 3);
        ctx.fill();
        ctx.stroke();
        rr(desk1X + 22, desk1Y + 22, 22, 18, 3);
        ctx.fill();
        ctx.stroke();

        // Chair 2 (near desk 2)
        rr(desk2X + 22, desk2Y + 38, 26, 18, 3);
        ctx.fill();
        ctx.stroke();
        rr(desk2X + 24, desk2Y + 22, 22, 18, 3);
        ctx.fill();
        ctx.stroke();

        // ── Waveform display screen (left wall, below speakers) ──────────────
        const scrX = 16, scrY = H * 0.36, scrW = 52, scrH = 38;
        ctx.fillStyle = "#1a1815";
        ctx.strokeStyle = "#4a4540";
        ctx.lineWidth = 1.5;
        rr(scrX, scrY, scrW, scrH, 4);
        ctx.fill();
        ctx.stroke();
        // Screen inner
        ctx.fillStyle = "#0a0808";
        rr(scrX + 3, scrY + 3, scrW - 6, scrH - 6, 2);
        ctx.fill();
        // Waveform animation
        ctx.strokeStyle = `rgba(255,100,140,0.9)`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let wx = 0; wx < scrW - 12; wx += 2) {
          const amp = 6 + 5 * Math.sin(t * 3 + wx * 0.18);
          const wy = scrY + scrH / 2 + amp * Math.sin(t * 8 + wx * 0.22);
          wx === 0 ? ctx.moveTo(scrX + 6 + wx, wy) : ctx.lineTo(scrX + 6 + wx, wy);
        }
        ctx.stroke();
        // Screen label
        ctx.fillStyle = "rgba(255,140,180,0.7)";
        ctx.font = "4px monospace";
        ctx.textAlign = "center";
        ctx.fillText("LIVE SIGNAL", scrX + scrW / 2, scrY + scrH - 4);

        // ── Playlist / track display (right wall, below rack) ──────────────
        const plX = W - 70, plY = H * 0.58, plW = 52, plH = 62;
        ctx.fillStyle = "#1a1815";
        ctx.strokeStyle = "#5a4a38";
        ctx.lineWidth = 1.5;
        rr(plX, plY, plW, plH, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#FF88CC";
        ctx.font = "bold 4px monospace";
        ctx.textAlign = "center";
        ctx.fillText("▶ NOW PLAYING", plX + plW / 2, plY + 10);
        ctx.strokeStyle = "rgba(255,136,204,0.3)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(plX + 4, plY + 13);
        ctx.lineTo(plX + plW - 4, plY + 13);
        ctx.stroke();
        const tracks = ["DUST STORM","DESERT ECHO","NEON DRIFT","RUST WAVE"];
        tracks.forEach((tr, ti) => {
          const isActive = ti === Math.floor(t * 0.4) % tracks.length;
          ctx.fillStyle = isActive ? "#FF88CC" : "rgba(200,160,180,0.6)";
          ctx.font = isActive ? "bold 4px monospace" : "4px monospace";
          ctx.textAlign = "left";
          ctx.fillText((isActive ? "▶ " : "  ") + tr, plX + 5, plY + 24 + ti * 10);
        });

        // ── Coffee mug on main desk ──────────────
        const mugX = deskX + 132, mugY = deskY + 8;
        ctx.fillStyle = "#3a3028";
        ctx.strokeStyle = "#5a4a38";
        ctx.lineWidth = 1;
        rr(mugX - 6, mugY, 12, 16, 2);
        ctx.fill();
        ctx.stroke();
        // Coffee liquid
        ctx.fillStyle = "rgba(60,30,10,0.8)";
        ctx.fillRect(mugX - 4, mugY + 2, 8, 10);
        // Steam
        for (let si = 0; si < 2; si++) {
          const sx2 = mugX - 2 + si * 4;
          const sa = Math.sin(t * 2 + si * 1.2) * 2;
          ctx.strokeStyle = `rgba(200,180,160,${0.3 + 0.15 * Math.sin(t * 1.5 + si)})`;
          ctx.lineWidth = 1;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(sx2 + sa, mugY);
          ctx.lineTo(sx2 - sa, mugY - 6);
          ctx.stroke();
          ctx.lineCap = "butt";
        }
        // Handle
        ctx.strokeStyle = "#5a4a38";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(mugX + 8, mugY + 8, 4, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        // ── Note papers on main desk ──────────────
        const noteX = deskX + 4, noteY = deskY + 6;
        ctx.fillStyle = "rgba(220,210,190,0.85)";
        ctx.save();
        ctx.rotate(-0.06);
        ctx.fillRect(noteX, noteY, 18, 14);
        ctx.restore();
        ctx.fillStyle = "rgba(180,140,120,0.85)";
        ctx.save();
        ctx.translate(noteX + 10, noteY);
        ctx.rotate(0.1);
        ctx.fillRect(0, 0, 16, 12);
        ctx.restore();
        // Lines on notes
        ctx.strokeStyle = "rgba(80,60,40,0.4)";
        ctx.lineWidth = 0.5;
        for (let li = 0; li < 2; li++) {
          ctx.beginPath();
          ctx.moveTo(noteX + 2, noteY + 4 + li * 4);
          ctx.lineTo(noteX + 14, noteY + 4 + li * 4);
          ctx.stroke();
        }

        // ── Microphone stand (center, in front of main desk) ──────────────
        const micX = cx, micY = deskY + 60;
        // Stand base
        ctx.fillStyle = "#2a2520";
        ctx.strokeStyle = "#4a4540";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(micX, micY + 10, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Stand pole
        ctx.strokeStyle = "#5a5550";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(micX, micY + 10);
        ctx.lineTo(micX, micY - 12);
        ctx.stroke();
        // Arm
        ctx.beginPath();
        ctx.moveTo(micX, micY - 6);
        ctx.lineTo(micX + 14, micY - 14);
        ctx.stroke();
        // Mic capsule
        ctx.fillStyle = "#3a3530";
        ctx.strokeStyle = "#5a5550";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(micX + 14, micY - 18, 7, 11, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Mesh grid on mic
        ctx.strokeStyle = "rgba(255,136,204,0.25)";
        ctx.lineWidth = 0.5;
        for (let mg = 0; mg < 3; mg++) {
          ctx.beginPath();
          ctx.ellipse(micX + 14, micY - 18, 7, 11 - mg * 2.5, -0.3, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Mic glow
        const micGlow = ctx.createRadialGradient(micX + 14, micY - 18, 0, micX + 14, micY - 18, 14);
        micGlow.addColorStop(0, `rgba(255,136,204,${0.2 + 0.12 * Math.sin(t * 3)})`);
        micGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = micGlow;
        ctx.beginPath();
        ctx.arc(micX + 14, micY - 18, 14, 0, Math.PI * 2);
        ctx.fill();

        // ── Sound wave rings (around mic) ──────────────
        for (let ri = 1; ri <= 2; ri++) {
          const rr2 = ri * 20 + 8 * Math.sin(t * 2 - ri);
          const alpha = (0.15 - ri * 0.04) * (0.5 + 0.5 * Math.sin(t * 2 + ri));
          ctx.strokeStyle = `rgba(255,136,204,${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(micX + 14, micY - 18, rr2, 0, Math.PI * 2);
          ctx.stroke();
        }

        // ── Ambient particles ──────────────
        for (let pi = 0; pi < 5; pi++) {
          const px = (Math.sin(pi * 2.5 + t * 0.45) * 0.36 + 0.5) * W;
          const py = (Math.cos(pi * 1.8 + t * 0.3) * 0.30 + 0.5) * H;
          ctx.fillStyle = `rgba(255,136,204,${0.18 + 0.1 * Math.sin(t * 1.6 + pi)})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── Station sign ──────────────
        ctx.fillStyle = "#FF88CC";
        ctx.shadowColor = "#FF88CC";
        ctx.shadowBlur = 8;
        ctx.font = "bold 9px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("WASTELAND RADIO", cx, H - 20);
        ctx.shadowBlur = 0;

      } else if (!!this.map?.config?.desert) {
        // ═══ DESERT SANDS: PYRAMID RADIO — VOICE OF THE SANDS ═══
        const t = performance.now() / 1000;
        const GOLD="#FFD060"; const AMBER="#FF9900"; const SAND="#E8C060"; const TERRA="#C06010";
        const GOLDr="255,208,96"; const AMBERr="255,153,0"; const SANDr="232,192,96";

        // ── Sandstone tile floor ──────────────────────────────────────
        const tileSize = 48;
        for (let gy = 0; gy < Math.ceil(H / tileSize) + 1; gy++) {
          for (let gx = 0; gx < Math.ceil(W / tileSize) + 1; gx++) {
            const tx = gx * tileSize, ty = gy * tileSize;
            const seed = gx * 17 + gy * 11;
            ctx.fillStyle = seed % 3 === 0 ? "rgba(28,18,4,0.92)"
                          : seed % 3 === 1 ? "rgba(22,14,2,0.90)"
                          : "rgba(32,20,6,0.90)";
            ctx.fillRect(tx, ty, tileSize, tileSize);
            ctx.strokeStyle = `rgba(${GOLDr},0.08)`;
            ctx.lineWidth = 0.5;
            ctx.strokeRect(tx, ty, tileSize, tileSize);
            // Subtle hieroglyph marks on floor
            if (seed % 7 === 0) {
              ctx.fillStyle = `rgba(${AMBERr},0.10)`;
              ctx.fillRect(tx + 12, ty + 20, 8, 2);
              ctx.fillRect(tx + 20, ty + 14, 2, 8);
            }
          }
        }

        // ── Room border — golden sandstone ───────────────────────────
        ctx.strokeStyle = `rgba(${GOLDr},0.6)`;
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, W - 4, H - 4);
        ctx.strokeStyle = `rgba(${AMBERr},0.2)`;
        ctx.lineWidth = 1;
        ctx.strokeRect(6, 6, W - 12, H - 12);

        // ── Title sign — VOICE OF THE SANDS ──────────────────────────
        const signW = 360, signH = 30;
        const signX = W / 2 - signW / 2, signY = room.S - 26;
        const signGrad = ctx.createLinearGradient(signX, signY, signX + signW, signY);
        signGrad.addColorStop(0, "rgba(60,30,0,0.92)");
        signGrad.addColorStop(0.5, "rgba(140,80,0,0.98)");
        signGrad.addColorStop(1, "rgba(60,30,0,0.92)");
        ctx.fillStyle = signGrad;
        rr(signX, signY, signW, signH, 7);
        ctx.fill();
        ctx.strokeStyle = `rgba(${GOLDr},${0.7 + 0.3 * Math.sin(t * 2.4)})`;
        ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = GOLD;
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.fillText("⬡  VOICE OF THE SANDS  ⬡", W / 2, signY + 20);

        // ── ON AIR blinking sign ──────────────────────────────────────
        const onAirA = 0.7 + 0.3 * Math.sin(t * 4);
        ctx.fillStyle = `rgba(200,80,0,${onAirA})`;
        ctx.shadowColor = "#CC5500"; ctx.shadowBlur = 14 * onAirA;
        rr(W / 2 - 46, topY + 34, 92, 22, 5); ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(${AMBERr},${onAirA})`; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
        ctx.fillText("● ON AIR", W / 2, topY + 49);

        // ── Main broadcast desk — wide stone slab ─────────────────────
        const deskW = Math.floor(W * 0.65), deskH = 40;
        const deskX = cx - deskW / 2, deskY = topY + 64;
        const deskGrad = ctx.createLinearGradient(deskX, deskY, deskX + deskW, deskY);
        deskGrad.addColorStop(0, "#2a1800"); deskGrad.addColorStop(0.5, "#3c2400"); deskGrad.addColorStop(1, "#2a1800");
        ctx.fillStyle = deskGrad; rr(deskX, deskY, deskW, deskH, 6); ctx.fill();
        ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
        ctx.shadowColor = GOLD; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;

        // Mixing console faders (14 channels)
        for (let ci = 0; ci < 14; ci++) {
          const ch = 8 + 20 * Math.abs(Math.sin(t * 3.5 + ci * 0.6));
          ctx.fillStyle = ci < 5 ? TERRA : ci < 9 ? AMBER : GOLD;
          ctx.fillRect(deskX + 10 + ci * (Math.floor((deskW - 20) / 14)), deskY + 36 - ch, Math.floor((deskW - 20) / 14) - 2, ch);
          // Knob
          ctx.fillStyle = ci % 3 === 0 ? GOLD : AMBER;
          ctx.beginPath();
          ctx.arc(deskX + 10 + ci * (Math.floor((deskW - 20) / 14)) + 6, deskY + 22, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        // VU bar
        for (let vi = 0; vi < 18; vi++) {
          ctx.fillStyle = vi < 7 ? GOLD : vi < 12 ? AMBER : TERRA;
          ctx.fillRect(deskX + 10 + vi * (Math.floor((deskW - 20) / 18)), deskY + 6, Math.floor((deskW - 20) / 18) - 1, 8);
        }

        // ── Obelisk broadcast tower (left) ───────────────────────────
        const towerX = 80, towerBaseY = H * 0.78;
        ctx.strokeStyle = AMBER; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(towerX, towerBaseY); ctx.lineTo(towerX - 22, towerBaseY - 90); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(towerX, towerBaseY); ctx.lineTo(towerX + 22, towerBaseY - 90); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(towerX - 14, towerBaseY - 35); ctx.lineTo(towerX + 14, towerBaseY - 35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(towerX - 18, towerBaseY - 65); ctx.lineTo(towerX + 18, towerBaseY - 65); ctx.stroke();
        // Signal waves
        for (let wi = 0; wi < 4; wi++) {
          const wa = 0.18 + 0.12 * Math.sin(t * 3 + wi);
          ctx.strokeStyle = `rgba(${GOLDr},${wa})`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(towerX, towerBaseY - 94, 12 + wi * 14, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        }
        // Blinking tip
        const blink = Math.sin(t * 4) > 0;
        ctx.fillStyle = blink ? `rgba(${AMBERr},0.9)` : TERRA;
        ctx.shadowColor = AMBER; ctx.shadowBlur = blink ? 12 : 4;
        ctx.beginPath(); ctx.arc(towerX, towerBaseY - 94, 5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // ── Reel-to-reel recorders (right side) ─────────────────────
        for (let ri = 0; ri < 3; ri++) {
          const rx = W - 310 + ri * 90, ry = topY + 118;
          ctx.fillStyle = "#1e1004"; ctx.strokeStyle = AMBER; ctx.lineWidth = 1;
          rr(rx, ry, 76, 86, 5); ctx.fill(); ctx.stroke();
          // Reels
          [[rx + 18, ry + 24], [rx + 58, ry + 24]].forEach(([rx2, ry2]) => {
            ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(rx2, ry2, 14, 0, Math.PI * 2); ctx.stroke();
            for (let sp = 0; sp < 4; sp++) {
              const sa = sp * Math.PI / 2 + t * (ri % 2 === 0 ? 1.2 : -1.2);
              ctx.beginPath(); ctx.moveTo(rx2, ry2); ctx.lineTo(rx2 + Math.cos(sa) * 12, ry2 + Math.sin(sa) * 12); ctx.stroke();
            }
            ctx.fillStyle = `rgba(${GOLDr},0.15)`; ctx.beginPath(); ctx.arc(rx2, ry2, 14, 0, Math.PI * 2); ctx.fill();
          });
          ctx.fillStyle = AMBER; ctx.strokeStyle = TERRA; ctx.lineWidth = 0.8;
          rr(rx + 28, ry + 48, 20, 10, 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = GOLD; ctx.font = "bold 5px monospace"; ctx.textAlign = "center";
          ctx.fillText(`TAPE ${ri + 1}`, rx + 38, ry + 76);
        }

        // ── Soundproof panels (top wall — sand-foam wedges) ──────────
        const panelCount = 5, panelGap = 6;
        const totalPanelW = W - 36;
        const panelW = (totalPanelW - (panelCount - 1) * panelGap) / panelCount;
        for (let pi = 0; pi < panelCount; pi++) {
          const px = 18 + pi * (panelW + panelGap);
          ctx.fillStyle = "#1c1004"; ctx.strokeStyle = `rgba(${AMBERr},0.28)`; ctx.lineWidth = 1;
          rr(px, topY + 6, panelW, 26, 3); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#2a1808";
          const cols = Math.floor(panelW / 12);
          for (let ri = 0; ri < 2; ri++) {
            for (let ci = 0; ci < cols; ci++) {
              ctx.beginPath();
              ctx.moveTo(px + 4 + ci * 12, topY + 8 + ri * 12 + 10);
              ctx.lineTo(px + 4 + ci * 12 + 10, topY + 8 + ri * 12 + 10);
              ctx.lineTo(px + 4 + ci * 12 + 5, topY + 8 + ri * 12);
              ctx.closePath(); ctx.fill();
            }
          }
        }

        // ── Three studio booths (bottom half) ────────────────────────
        for (let bi = 0; bi < 3; bi++) {
          const bx = 28 + bi * Math.floor((W - 56) / 3), by = H * 0.60;
          const bw = Math.floor((W - 56) / 3) - 8, bh = Math.floor(H * 0.32);
          ctx.fillStyle = "#160c02"; ctx.strokeStyle = bi === 1 ? GOLD : AMBER; ctx.lineWidth = 1.5;
          rr(bx, by, bw, bh, 6); ctx.fill(); ctx.stroke();
          ctx.fillStyle = bi === 1 ? GOLD : AMBER;
          ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
          ctx.fillText(bi === 0 ? "BOOTH A" : bi === 1 ? "MAIN STUDIO" : "BOOTH B", bx + bw / 2, by + 14);
          // Microphone stand
          ctx.strokeStyle = SAND; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(bx + bw / 2, by + 22); ctx.lineTo(bx + bw / 2, by + 52); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx + bw / 2 - 14, by + 52); ctx.lineTo(bx + bw / 2 + 14, by + 52); ctx.stroke();
          ctx.fillStyle = SAND;
          ctx.beginPath(); ctx.ellipse(bx + bw / 2, by + 18, 8, 12, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = `rgba(${SANDr},0.4)`; ctx.lineWidth = 0.8;
          for (let li = 0; li < 4; li++) {
            ctx.beginPath(); ctx.moveTo(bx + bw / 2 - 6, by + 12 + li * 5); ctx.lineTo(bx + bw / 2 + 6, by + 12 + li * 5); ctx.stroke();
          }
          // Human worker — Egyptian-style robed figure
          const workerX = bx + bw / 2 + (bi === 1 ? 0 : bi === 0 ? 20 : -20);
          const workerY = by + bh - 44;
          ctx.save(); ctx.translate(workerX, workerY);
          // Shadow beneath
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.beginPath(); ctx.ellipse(0, 20, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
          // Robe (linen white with gold trim)
          ctx.fillStyle = "#E8DCC0";
          ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-12, 28); ctx.lineTo(12, 28); ctx.lineTo(10, 0); ctx.closePath(); ctx.fill();
          // Gold trim on robe hem
          ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-12, 26); ctx.lineTo(12, 26); ctx.stroke();
          // Skin — warm Egyptian tone
          ctx.fillStyle = "#A0682A";
          // Head
          ctx.beginPath(); ctx.arc(0, -14, 8, 0, Math.PI * 2); ctx.fill();
          // Neck
          ctx.fillRect(-3, -6, 6, 7);
          // Arms
          ctx.beginPath(); ctx.ellipse(-13, 8, 3, 8, -0.3, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(13, 8, 3, 8, 0.3, 0, Math.PI * 2); ctx.fill();
          // Headdress (nemes cloth — blue and gold stripes)
          ctx.fillStyle = "#1050AA";
          ctx.beginPath(); ctx.moveTo(-9, -20); ctx.lineTo(-14, 2); ctx.lineTo(-7, -6); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(9, -20); ctx.lineTo(14, 2); ctx.lineTo(7, -6); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#1040AA";
          ctx.beginPath(); ctx.moveTo(-8, -22); ctx.quadraticCurveTo(0, -28, 8, -22); ctx.lineTo(6, -20); ctx.quadraticCurveTo(0, -25, -6, -20); ctx.closePath(); ctx.fill();
          // Gold stripe on headdress
          ctx.strokeStyle = GOLD; ctx.lineWidth = 1;
          for (let hs = 0; hs < 3; hs++) {
            ctx.beginPath(); ctx.moveTo(-8 + hs * 0.5, -20 + hs * 7); ctx.lineTo(-14 + hs * 0.5, 2 + hs * 0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(8 - hs * 0.5, -20 + hs * 7); ctx.lineTo(14 - hs * 0.5, 2 + hs * 0); ctx.stroke();
          }
          // Kohl eyes
          ctx.fillStyle = "#1a0a00";
          ctx.beginPath(); ctx.ellipse(-3, -14, 2.2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(3, -14, 2.2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
          // Headphones or ear piece (for the DJ)
          if (bi === 1) {
            ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, -14, 10, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
            ctx.fillStyle = GOLD;
            ctx.beginPath(); ctx.arc(-9, -8, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(9, -8, 3.5, 0, Math.PI * 2); ctx.fill();
          }
          // Collar necklace — gold pectoral
          ctx.fillStyle = GOLD; ctx.strokeStyle = AMBER; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(0, -4, 6, Math.PI * 0.1, Math.PI * 0.9); ctx.fill(); ctx.stroke();
          ctx.restore();
        }

        // ── Oud / sand instruments on wall shelves ───────────────────
        // Left shelf
        ctx.fillStyle = "#2a1800"; ctx.strokeStyle = `rgba(${AMBERr},0.35)`; ctx.lineWidth = 1;
        rr(10, H * 0.48, 60, 10, 2); ctx.fill(); ctx.stroke();
        // Oud (lute) shape
        ctx.save(); ctx.translate(40, H * 0.38);
        ctx.fillStyle = "#6a3a10";
        ctx.beginPath(); ctx.ellipse(0, 0, 12, 16, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#3a1a04";
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = GOLD; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, -30); ctx.stroke();
        ctx.beginPath(); ctx.lineTo(-6, -28); ctx.lineTo(6, -28); ctx.stroke();
        ctx.restore();
        // Right shelf
        ctx.fillStyle = "#2a1800"; ctx.strokeStyle = `rgba(${AMBERr},0.35)`; ctx.lineWidth = 1;
        rr(W - 70, H * 0.48, 60, 10, 2); ctx.fill(); ctx.stroke();
        // Sistrum (rattle) shape
        ctx.save(); ctx.translate(W - 40, H * 0.38);
        ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-10, -18); ctx.quadraticCurveTo(-16, -8, -10, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(10, -18); ctx.quadraticCurveTo(16, -8, 10, 0); ctx.stroke();
        for (let si = 0; si < 3; si++) {
          ctx.fillStyle = AMBER;
          ctx.beginPath(); ctx.arc(0, -16 + si * 8, 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();

        // ── Vinyl / scroll display rack ──────────────────────────────
        ctx.fillStyle = "#1e1004";
        ctx.strokeStyle = `rgba(${GOLDr},0.25)`; ctx.lineWidth = 1;
        rr(cx - 50, H * 0.78, 100, 20, 3); ctx.fill(); ctx.stroke();
        for (let vi = 0; vi < 5; vi++) {
          ctx.fillStyle = vi % 2 === 0 ? AMBER : SAND;
          ctx.beginPath(); ctx.arc(cx - 36 + vi * 18, H * 0.788, 6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#120800";
          ctx.beginPath(); ctx.arc(cx - 36 + vi * 18, H * 0.788, 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = GOLD; ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
        ctx.fillText("DESERT TRACKS", cx, H * 0.792 + 14);

        // ── Ambient sand particle drift ──────────────────────────────
        for (let i = 0; i < 12; i++) {
          const px = (t * 18 + i * 80) % W;
          const py = topY + 10 + Math.sin(t * 0.8 + i * 1.7) * 20 + (i * (H - topY - 30)) / 12;
          const alpha = Math.sin(t * 2 + i) * 0.2 + 0.25;
          ctx.fillStyle = i % 2 === 0 ? `rgba(${GOLDr},${alpha})` : `rgba(${AMBERr},${alpha})`;
          ctx.beginPath(); ctx.arc(px, py, i % 4 === 0 ? 1.8 : 1, 0, Math.PI * 2); ctx.fill();
        }

        // ── Station sign at bottom ───────────────────────────────────
        ctx.fillStyle = GOLD; ctx.shadowColor = AMBER; ctx.shadowBlur = 8;
        ctx.font = "bold 9px Orbitron, monospace"; ctx.textAlign = "center";
        ctx.fillText("PYRAMID RADIO", cx, H - 16);
        ctx.shadowBlur = 0;

      } else {
        // ── Default radio station (non-galactica, non-wasteland) ───────
        // ── Broadcast desk (center) ───────────────────
        ctx.fillStyle = "#0a0a18";
        ctx.strokeStyle = "#FF88CC";
        ctx.lineWidth = 1.5;
        rr(cx - 52, midY - 14, 104, 36, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#111122";
        rr(cx - 44, midY - 10, 88, 28, 2);
        ctx.fill();
        for (let fi = 0; fi < 8; fi++) {
          ctx.fillStyle = "#334";
          ctx.fillRect(cx - 40 + fi * 11, midY - 8, 9, 20);
          ctx.fillStyle = "#88AAFF";
          ctx.fillRect(cx - 40 + fi * 11, midY - 8 + Math.floor(Math.random() * 14), 9, 6);
        }
        ctx.fillStyle = "#44FF88";
        ctx.shadowColor = "#44FF44";
        ctx.shadowBlur = 6;
        ctx.fillRect(cx + 26, midY - 10, 14, 6);
        ctx.fillRect(cx + 26, midY - 2, 14, 4);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#FFCC00";
        ctx.fillRect(cx + 26, midY + 4, 10, 3);
        ctx.fillStyle = "#FF4400";
        ctx.fillRect(cx + 26, midY + 9, 6, 3);
        // Soundproof panels (fixed alignment)
        ctx.fillStyle = "#1a1228";
        ctx.strokeStyle = "#442266";
        ctx.lineWidth = 1;
        const defPanelCount = 4;
        const defPanelW = (W - 40) / defPanelCount - 4;
        for (let pi = 0; pi < defPanelCount; pi++) {
          const px2 = 20 + pi * ((W - 40) / defPanelCount);
          rr(px2, topY + 4, defPanelW, 44, 4);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#2a1a38";
          for (let ri = 0; ri < 3; ri++)
            for (let ci2 = 0; ci2 < 3; ci2++) {
              ctx.beginPath();
              ctx.moveTo(px2 + 4 + ci2 * 12, topY + 6 + ri * 12);
              ctx.lineTo(px2 + 10 + ci2 * 12, topY + 6 + ri * 12);
              ctx.lineTo(px2 + 7 + ci2 * 12, topY + 14 + ri * 12);
              ctx.closePath();
              ctx.fill();
            }
          ctx.fillStyle = "#1a1228";
        }
        ctx.fillStyle = "#FF2244";
        ctx.shadowColor = "#FF0022";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.roundRect(cx - 28, topY + 52, 56, 18, 4);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 9px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.shadowBlur = 0;
        ctx.fillText("● ON AIR", cx, topY + 64);
        ctx.fillStyle = "#AAAAAA";
        ctx.beginPath();
        ctx.ellipse(cx, midY - 28, 8, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#888";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, midY - 16, 12, 0, Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, midY - 4);
        ctx.lineTo(cx, midY + 8);
        ctx.stroke();
      } // end default radio station
    } else if (type === 23) {
      // ════════════════════════════════════════════════════════════════════
      //  UNDERGROUND LAB — Subterranean Research Complex (Spaced Layout)
      //  Zone A (y≈148): specimen tanks   Zone B (y≈258): pipe network
      //  Zone C (y≈294): workstations | DNA | cryo pods
      //  Zone D (y≈499): synthesis | hazmat | rad-monitor
      //  Zone E (y≈650): floor drain, alarms
      // ════════════════════════════════════════════════════════════════════
      const tul = performance.now() / 1000;
      const labCx = W / 2;

      // ── Atmospheric floor glow ────────────────────────────────────────
      const floorGrad = ctx.createRadialGradient(labCx, H*0.55, 0, labCx, H*0.55, W*0.65);
      floorGrad.addColorStop(0, 'rgba(0,60,20,0.18)');
      floorGrad.addColorStop(0.5, 'rgba(0,30,10,0.10)');
      floorGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = floorGrad; ctx.fillRect(0, 0, W, H);

      // ── Ceiling light strips ──────────────────────────────────────────
      const ceilPulse = Math.sin(tul * 0.8) * 0.08 + 0.92;
      ctx.fillStyle = `rgba(0,255,120,${0.07 * ceilPulse})`; ctx.fillRect(0, 0, W, topY + 10);
      for (let cl = 0; cl < 6; cl++) {
        const clx = W * 0.06 + cl * W * 0.165;
        ctx.fillStyle = `rgba(0,255,150,${0.26 * ceilPulse})`; ctx.fillRect(clx, 0, W * 0.10, 5);
        ctx.fillStyle = `rgba(0,255,150,${0.10 * ceilPulse})`; ctx.fillRect(clx, 5, W * 0.10, 6);
      }

      // ── Lab sign ─────────────────────────────────────────────────────
      ctx.fillStyle = "#020a04"; rr(labCx - 145, topY + 4, 290, 24, 4); ctx.fill();
      ctx.strokeStyle = `rgba(0,255,120,${0.6 + 0.3 * Math.sin(tul * 1.8)})`; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "#44FF99"; ctx.shadowColor = "#00FF88"; ctx.shadowBlur = 14;
      ctx.font = "bold 11px Orbitron, monospace"; ctx.textAlign = "center";
      ctx.fillText("☢  SUBTERRANEAN RESEARCH COMPLEX — LEVEL B4  ☢", labCx, topY + 20);
      ctx.shadowBlur = 0;

      // ════════════════════════════════════════════════════════════════════
      // ZONE A — Four specimen tanks (y ≈ 148–238)
      // Tanks evenly spaced: left edges at x = 80, 340, 600, 860
      // Each tank: 80px wide × 90px tall  — 180px+ between right/left edges
      // ════════════════════════════════════════════════════════════════════
      const tankTY = topY + 30;  // ≈ 148
      const tankW2 = 80, tankH2 = 90;
      const tankXs = [80, 340, 600, 860];
      const tankColors = ["#00FF88", "#FF00CC", "#00CCFF", "#FFCC00"];
      const tankRGB   = ["0,255,136", "255,0,204", "0,204,255", "255,204,0"];
      const tankCreatures = ["humanoid", "blob", "fish", "crystal"];

      for (let ti = 0; ti < 4; ti++) {
        const tx2 = tankXs[ti];
        const ty2 = tankTY;
        const tc  = tankColors[ti];
        const tRGB = tankRGB[ti];
        const tcx  = tx2 + tankW2 / 2;  // horizontal center of this tank

        // Shadow + body
        ctx.fillStyle = "rgba(0,0,0,0.45)"; rr(tx2+5, ty2+5, tankW2, tankH2, 8); ctx.fill();
        ctx.fillStyle = "#030d06"; ctx.strokeStyle = tc; ctx.lineWidth = 2;
        rr(tx2, ty2, tankW2, tankH2, 8); ctx.fill(); ctx.stroke();
        // Liquid fill
        const bubH2 = tankH2 - 14 + Math.sin(tul * 1.2 + ti) * 4;
        ctx.fillStyle = tc + "18"; rr(tx2+3, ty2+6, tankW2-6, bubH2, 5); ctx.fill();
        ctx.fillStyle = tc + "32"; rr(tx2+3, ty2+6, tankW2-6, 10, [5,5,0,0]); ctx.fill();

        // Creature
        const cPulse = Math.sin(tul * 2 + ti * 1.3) * 0.5 + 0.5;
        ctx.fillStyle = tc; ctx.shadowColor = tc; ctx.shadowBlur = 10 * cPulse;
        const creatureY = ty2 + tankH2 * 0.4;
        if (tankCreatures[ti] === "humanoid") {
          const fy = creatureY + Math.sin(tul * 0.8 + ti) * 5;
          ctx.fillStyle = tc + "88"; ctx.beginPath(); ctx.ellipse(tcx, fy-13, 8, 9, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = tc + "66"; rr(tcx-8, fy, 16, 20, 2); ctx.fill();
          ctx.fillRect(tcx-13, fy+4, 4, 16); ctx.fillRect(tcx+9, fy+4, 4, 16);
          ctx.fillRect(tcx-6, fy+20, 5, 14); ctx.fillRect(tcx+1, fy+20, 5, 14);
        } else if (tankCreatures[ti] === "blob") {
          const br = 19 + Math.sin(tul * 3 + ti) * 5;
          ctx.fillStyle = tc + "55";
          ctx.beginPath(); ctx.ellipse(tcx, creatureY, br, br*0.7, tul*0.5, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(tcx, creatureY, br*0.5, br*0.4, tul*0.8, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = tc; ctx.beginPath(); ctx.arc(tcx, creatureY, 6, 0, Math.PI*2); ctx.fill();
        } else if (tankCreatures[ti] === "fish") {
          const ffy = creatureY + Math.sin(tul * 1.5 + ti) * 8;
          ctx.fillStyle = tc + "66";
          ctx.beginPath(); ctx.ellipse(tcx, ffy, 19, 9, Math.sin(tul*0.6)*0.3, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(tcx-19, ffy); ctx.lineTo(tcx-30, ffy-10); ctx.lineTo(tcx-30, ffy+10); ctx.closePath(); ctx.fill();
          ctx.fillStyle = tc; ctx.beginPath(); ctx.arc(tcx+8, ffy-2, 3.5, 0, Math.PI*2); ctx.fill();
        } else {
          for (let cr=0; cr<6; cr++) {
            const ca = cr * Math.PI / 3;
            const crx2 = tcx + Math.cos(ca)*13, cry2 = creatureY + Math.sin(ca)*10;
            const ch = 14 + cr * 2;
            ctx.fillStyle = tc + "55"; ctx.save(); ctx.translate(crx2, cry2); ctx.rotate(ca);
            ctx.beginPath(); ctx.moveTo(-3,0); ctx.lineTo(3,0); ctx.lineTo(1.5,-ch); ctx.lineTo(-1.5,-ch); ctx.closePath(); ctx.fill();
            ctx.restore();
          }
        }
        ctx.shadowBlur = 0;

        // Serial label below tank
        ctx.fillStyle = tc + "88"; ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
        ctx.fillText(`SPEC-${(ti+1).toString().padStart(2,'0')}`, tcx, ty2 + tankH2 + 13);

        // Rising bubbles
        for (let b2=0; b2<4; b2++) {
          const bphase = (tul * 0.6 + b2 * 0.33 + ti * 0.7) % 1;
          const bx3 = tx2 + 16 + b2 * 15;
          const by3 = ty2 + tankH2 - 8 - bphase * (tankH2 - 14);
          const bAlpha = Math.max(0, bphase < 0.85 ? 0.4 : (1 - bphase) * 2.7) * 0.5;
          ctx.fillStyle = `rgba(${tRGB},${bAlpha})`;
          ctx.beginPath(); ctx.arc(bx3, by3, 2.5, 0, Math.PI*2); ctx.fill();
        }

        // Side pipe stubs
        ctx.strokeStyle = tc + "55"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(tx2, ty2+50); ctx.lineTo(tx2-10, ty2+50); ctx.lineTo(tx2-10, ty2+66); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tx2+tankW2, ty2+55); ctx.lineTo(tx2+tankW2+10, ty2+55); ctx.stroke();
      }

      // ════════════════════════════════════════════════════════════════════
      // ZONE B — Pipe network (y ≈ 258)
      // ════════════════════════════════════════════════════════════════════
      const pipeY = tankTY + tankH2 + 28;  // ≈ 266
      ctx.strokeStyle = "rgba(0,200,100,0.22)"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(W*0.05, pipeY); ctx.lineTo(W*0.95, pipeY); ctx.stroke();
      ctx.strokeStyle = "rgba(0,200,100,0.09)"; ctx.lineWidth = 11;
      ctx.beginPath(); ctx.moveTo(W*0.05, pipeY); ctx.lineTo(W*0.95, pipeY); ctx.stroke();
      // Joints
      for (let pj=0; pj<5; pj++) {
        ctx.fillStyle = "#1a3a22"; ctx.beginPath(); ctx.arc(W*0.10+pj*W*0.20, pipeY, 6, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "#44FF88"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(W*0.10+pj*W*0.20, pipeY, 6, 0, Math.PI*2); ctx.stroke();
      }

      // ════════════════════════════════════════════════════════════════════
      // ZONE C — Three-column mid section (y ≈ 294 – 480)
      //   Left  (x 40–150): 2 research workstations
      //   Center (x 480–600): holographic DNA display
      //   Right  (x 920–1010): 2 cryo pods
      // ════════════════════════════════════════════════════════════════════
      const zC = pipeY + 28;  // ≈ 294  — Zone C top

      // ── Left: research workstations ──────────────────────────────────
      for (let ws3=0; ws3<2; ws3++) {
        const wsx = 40, wsy = zC + ws3 * 86;
        ctx.fillStyle = "#050e08"; ctx.strokeStyle = "#226633"; ctx.lineWidth = 1.5;
        rr(wsx, wsy, 100, 66, 4); ctx.fill(); ctx.stroke();
        // Monitor
        ctx.fillStyle = "#020a04"; rr(wsx+5, wsy+5, 66, 42, 2); ctx.fill();
        ctx.strokeStyle = "#44FF88"; ctx.lineWidth = 1; ctx.strokeRect(wsx+5, wsy+5, 66, 42);
        // Scanline
        const slY = ((tul * 30 + ws3 * 22) % 40);
        ctx.fillStyle = "rgba(0,255,120,0.12)"; ctx.fillRect(wsx+6, wsy+6+slY, 64, 3);
        // Data bars
        for (let dl2=0; dl2<5; dl2++) {
          ctx.fillStyle = dl2%2===0 ? "rgba(0,255,100,0.40)" : "rgba(0,180,255,0.30)";
          ctx.fillRect(wsx+7, wsy+9+dl2*7, 18+(dl2*12)%38, 5);
        }
        // Keyboard
        ctx.fillStyle = "#0a1a0e"; rr(wsx+5, wsy+50, 66, 12, 2); ctx.fill();
        for (let k2=0; k2<8; k2++) { ctx.fillStyle="#0e200e"; ctx.fillRect(wsx+7+k2*8, wsy+52, 6, 8); }
        // Status LED
        const stOn = Math.sin(tul*3 + ws3*2) > 0;
        ctx.fillStyle = stOn ? "#00FF88" : "#004422";
        ctx.beginPath(); ctx.arc(wsx+91, wsy+9, 5, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = "#44FF88"; ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
      ctx.fillText("RESEARCH STATIONS", 90, zC + 2*86 + 22);

      // ── Center: DNA holographic display ──────────────────────────────
      const dnaX = labCx, dnaY = zC + 96;  // ≈ y 390 — center of zone C
      // Outer glow
      const dnaGrad = ctx.createRadialGradient(dnaX, dnaY, 0, dnaX, dnaY, 65);
      dnaGrad.addColorStop(0, `rgba(0,255,120,${0.14 + Math.sin(tul*1.5)*0.05})`);
      dnaGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = dnaGrad; ctx.beginPath(); ctx.arc(dnaX, dnaY, 65, 0, Math.PI*2); ctx.fill();
      // Platform base
      ctx.fillStyle="#050e06"; ctx.strokeStyle="#226633"; ctx.lineWidth=1.5;
      rr(dnaX-44, dnaY+60, 88, 14, 3); ctx.fill(); ctx.stroke();
      // DNA helix (26 nodes, spanning 104px tall)
      for (let dna=0; dna<26; dna++) {
        const dp = dna / 26;
        const ang = dp * Math.PI * 4 + tul * 1.2;
        const dx1 = dnaX + Math.cos(ang) * 22;
        const dx2 = dnaX + Math.cos(ang + Math.PI) * 22;
        const dy2 = dnaY - 52 + dna * 4;
        ctx.fillStyle = `rgba(0,255,130,${0.55 + Math.cos(ang)*0.3})`;
        ctx.beginPath(); ctx.arc(dx1, dy2, 3.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = `rgba(0,180,255,${0.55 + Math.cos(ang+Math.PI)*0.3})`;
        ctx.beginPath(); ctx.arc(dx2, dy2, 3.5, 0, Math.PI*2); ctx.fill();
        if (dna % 3 === 0) {
          ctx.strokeStyle = "rgba(0,255,150,0.22)"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(dx1, dy2); ctx.lineTo(dx2, dy2); ctx.stroke();
        }
      }
      ctx.fillStyle = "#44FF88"; ctx.shadowColor = "#00FF88"; ctx.shadowBlur = 8;
      ctx.font = "bold 8px Orbitron, monospace"; ctx.textAlign = "center";
      ctx.fillText("DNA SCAN ACTIVE", dnaX, dnaY + 78);
      ctx.shadowBlur = 0;

      // ── Right: cryogenic freeze pods ─────────────────────────────────
      for (let cp=0; cp<2; cp++) {
        const cpx = W - 155, cpy = zC + cp * 92;
        ctx.fillStyle = "rgba(0,0,0,0.45)"; rr(cpx+4, cpy+4, 80, 74, 9); ctx.fill();
        ctx.fillStyle = "#04101a"; ctx.strokeStyle = "#0088CC"; ctx.lineWidth = 2;
        rr(cpx, cpy, 80, 74, 9); ctx.fill(); ctx.stroke();
        // Frosted glass
        ctx.fillStyle = "rgba(0,100,180,0.12)"; rr(cpx+8, cpy+8, 64, 50, 5); ctx.fill();
        ctx.strokeStyle = "rgba(100,200,255,0.25)"; ctx.lineWidth = 1;
        ctx.strokeRect(cpx+8, cpy+8, 64, 50);
        // Frozen person
        const fpx = cpx + 40, fpy = cpy + 18;
        ctx.fillStyle = "rgba(180,220,255,0.30)";
        ctx.beginPath(); ctx.ellipse(fpx, fpy-10, 9, 10, 0, 0, Math.PI*2); ctx.fill();
        rr(fpx-10, fpy, 20, 26, 2); ctx.fill();
        ctx.fillRect(fpx-15, fpy+6, 5, 19); ctx.fillRect(fpx+10, fpy+6, 5, 19);
        ctx.fillRect(fpx-7, fpy+26, 6, 12); ctx.fillRect(fpx+1, fpy+26, 6, 12);
        // Ice frost lines
        ctx.strokeStyle = "rgba(150,200,255,0.14)"; ctx.lineWidth = 0.8;
        for (let ic=0; ic<8; ic++) {
          ctx.beginPath(); ctx.moveTo(cpx+9+ic*8, cpy+8); ctx.lineTo(cpx+9+ic*8, cpy+58); ctx.stroke();
        }
        // Temp gauge
        const cTemp = -180 + Math.sin(tul*0.4+cp)*5;
        ctx.fillStyle = "#0066AA"; rr(cpx+8, cpy+62, 64, 9, 3); ctx.fill();
        ctx.fillStyle = "#00AAFF"; rr(cpx+8, cpy+62, 64*(0.25+cp*0.25), 9, 3); ctx.fill();
        ctx.fillStyle = "#88DDFF"; ctx.font = "bold 6px monospace"; ctx.textAlign = "center";
        ctx.fillText(`${Math.round(cTemp)}°C`, fpx, cpy+69);
        // Pulse ring
        const cpPulse = Math.sin(tul*2+cp*1.5)*0.5+0.5;
        ctx.strokeStyle = `rgba(0,150,255,${0.28+cpPulse*0.32})`; ctx.lineWidth = 2;
        ctx.strokeRect(cpx+1, cpy+1, 78, 72);
      }
      ctx.fillStyle = "#0088CC"; ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
      ctx.fillText("CRYO UNITS", W-155+40, zC + 2*92 + 20);

      // ════════════════════════════════════════════════════════════════════
      // ZONE D — Lower instrument row (y ≈ 499 – 595)
      //   Left  (x  50–249): chemical synthesis array   (200px wide)
      //   Center (x 430–609): hazmat containment vault  (180px wide)
      //   Right  (x 790–989): radiation monitor panel   (200px wide)
      //   Gaps between panels: ~180px each
      // ════════════════════════════════════════════════════════════════════
      const zD = zC + 205;  // ≈ 499

      // ── Left: chemical synthesis array ───────────────────────────────
      {
        const csX = 50, csY = zD, csW = 200, csH = 96;
        ctx.fillStyle = "#050e06"; ctx.strokeStyle = "#226633"; ctx.lineWidth = 1;
        rr(csX, csY, csW, csH, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#44FF88"; ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
        ctx.fillText("— SYNTHESIS ARRAY —", csX+csW/2, csY+13);
        const flaskCols = ["#FF4444","#44FFCC","#FFCC00","#FF44AA","#44AAFF"];
        for (let f=0; f<5; f++) {
          const fx3 = csX+12+f*36, fy3 = csY+20;
          const fc = flaskCols[f];
          // Flask body + neck
          ctx.fillStyle = "#0a180a"; rr(fx3, fy3+12, 20, 30, [2,2,8,8]); ctx.fill();
          ctx.strokeStyle = fc+"88"; ctx.lineWidth=1; ctx.strokeRect(fx3, fy3+12, 20, 30);
          ctx.fillStyle = "#0a180a"; ctx.fillRect(fx3+6, fy3, 8, 14);
          // Liquid level
          const lvl = 12 + ((f*7 + Math.floor(tul*0.5+f*0.3)) % 16);
          ctx.fillStyle = fc+"55"; ctx.fillRect(fx3+1, fy3+12+(30-lvl), 18, lvl);
          // Glow dot
          ctx.fillStyle = fc; ctx.shadowColor = fc; ctx.shadowBlur = 7;
          ctx.beginPath(); ctx.arc(fx3+10, fy3+28, 5, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
          // Bubbles
          if (Math.sin(tul*4+f) > 0.5) {
            ctx.fillStyle = fc+"66";
            ctx.beginPath(); ctx.arc(fx3+7, fy3+15, 3, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(fx3+13, fy3+10, 2, 0, Math.PI*2); ctx.fill();
          }
        }
        // Bunsen burner
        ctx.fillStyle = "rgba(0,200,255,0.18)";
        ctx.beginPath(); ctx.ellipse(csX+csW-18, csY+csH-20, 14, 7, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#00CCFF"; ctx.shadowColor = "#00CCFF"; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(csX+csW-18, csY+csH-30, 5, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#44FF88"; ctx.font = "bold 6px monospace"; ctx.textAlign = "center";
        ctx.fillText("SYNTHESIS LAB", csX+csW/2, csY+csH+12);
      }

      // ── Center: hazmat containment vault ─────────────────────────────
      {
        const hvX = labCx - 90, hvY = zD, hvW = 180, hvH = 96;
        ctx.fillStyle = "#070e04"; ctx.strokeStyle = "#88FF22"; ctx.lineWidth = 1.5;
        rr(hvX, hvY, hvW, hvH, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#AAFF44"; ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
        ctx.fillText("— CONTAINMENT VAULT —", hvX+hvW/2, hvY+13);
        // Biohazard symbol (drawn)
        const bhcx = hvX+hvW/2, bhcy = hvY+54;
        ctx.strokeStyle = "#88FF22"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(bhcx, bhcy, 22, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(bhcx, bhcy, 8, 0, Math.PI*2); ctx.stroke();
        for (let bh2=0; bh2<3; bh2++) {
          const ba2 = (Math.PI/1.5)*bh2 - Math.PI/2;
          ctx.strokeStyle = "#070e04"; ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(bhcx+Math.cos(ba2)*8, bhcy+Math.sin(ba2)*8);
          ctx.lineTo(bhcx+Math.cos(ba2)*22, bhcy+Math.sin(ba2)*22);
          ctx.stroke();
        }
        // Hazard stripes
        ctx.save(); ctx.translate(bhcx, hvY+hvH-12); ctx.rotate(Math.PI/4);
        for (let hs=0; hs<8; hs++) {
          ctx.fillStyle = hs%2===0 ? "rgba(255,200,0,0.18)" : "rgba(0,0,0,0.10)";
          ctx.fillRect(hs*10-40, -9, 10, 18);
        }
        ctx.restore();
        ctx.fillStyle = "#AAFF44"; ctx.font = "bold 6px monospace"; ctx.textAlign = "center";
        ctx.fillText("BIO-CONTAINMENT ACTIVE", hvX+hvW/2, hvY+hvH+12);
      }

      // ── Right: radiation monitor panel ───────────────────────────────
      {
        const rmX = W - 250, rmY = zD, rmW = 200, rmH = 96;
        ctx.fillStyle = "#050806"; ctx.strokeStyle = "#FF6622"; ctx.lineWidth = 1;
        rr(rmX, rmY, rmW, rmH, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#FF8844"; ctx.font = "bold 7px monospace"; ctx.textAlign = "center";
        ctx.fillText("— RADIATION MONITOR —", rmX+rmW/2, rmY+13);
        // 4 level gauges
        for (let rg=0; rg<4; rg++) {
          const rgx = rmX+12+rg*47, rgy = rmY+20;
          ctx.fillStyle = "#0a0800"; rr(rgx, rgy, 40, 60, 3); ctx.fill();
          ctx.strokeStyle = "#884400"; ctx.lineWidth = 1; ctx.strokeRect(rgx, rgy, 40, 60);
          const lvlRad = 20 + ((rg*17 + Math.floor(tul*0.3+rg*0.6)) % 38);
          const radColor = lvlRad > 47 ? "#FF2200" : lvlRad > 32 ? "#FFAA00" : "#44FF88";
          ctx.fillStyle = radColor + "33"; ctx.fillRect(rgx+5, rgy+5+(55-lvlRad), 30, lvlRad);
          ctx.fillStyle = radColor; ctx.shadowColor = radColor; ctx.shadowBlur = 6;
          ctx.fillRect(rgx+5, rgy+5+(55-lvlRad), 30, 3);
          ctx.shadowBlur = 0;
          ctx.fillStyle = radColor; ctx.font = "bold 6px monospace"; ctx.textAlign = "center";
          ctx.fillText(`${lvlRad}mSv`, rgx+20, rgy+56);
        }
        ctx.fillStyle = "#FF6622"; ctx.font = "bold 6px monospace"; ctx.textAlign = "center";
        ctx.fillText("ZONE READINGS", rmX+rmW/2, rmY+rmH+12);
      }

      // ════════════════════════════════════════════════════════════════════
      // ZONE E — Floor elements (y ≈ 650–730)
      // ════════════════════════════════════════════════════════════════════

      // Warning stripe band
      for (let ws=0; ws < W/24; ws++) {
        ctx.fillStyle = ws%2===0 ? "rgba(255,200,0,0.07)" : "rgba(0,0,0,0)";
        ctx.fillRect(ws*24, H*0.78, 24, 12);
      }

      // Floor drain/grate
      const drainY = H * 0.82;
      ctx.fillStyle = "#0a140a"; ctx.strokeStyle = "#224422"; ctx.lineWidth = 1;
      rr(labCx-28, drainY, 56, 36, 4); ctx.fill(); ctx.strokeRect(labCx-28, drainY, 56, 36);
      for (let gr=0; gr<5; gr++) { ctx.fillStyle="#0d160d"; ctx.fillRect(labCx-26, drainY+4+gr*6, 52, 3); }
      ctx.fillStyle = `rgba(0,255,100,${0.15 + Math.sin(tul*2)*0.06})`;
      ctx.beginPath(); ctx.ellipse(labCx, drainY+24, 20, 8, 0, 0, Math.PI*2); ctx.fill();

      // Emergency alarm buttons (corners)
      for (const [ex2,ey2] of [[W*0.04, H*0.85],[W*0.88, H*0.85]]) {
        ctx.fillStyle = "#2a0000"; rr(ex2, ey2, 32, 24, 3); ctx.fill();
        ctx.strokeStyle = "#FF4400"; ctx.lineWidth = 1.5; ctx.strokeRect(ex2, ey2, 32, 24);
        const eblink = Math.sin(tul*4 + ex2) > 0.4;
        ctx.fillStyle = eblink ? "#FF2200" : "#440000";
        ctx.shadowColor = "#FF2200"; ctx.shadowBlur = eblink ? 12 : 0;
        ctx.beginPath(); ctx.arc(ex2+16, ey2+12, 7, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#FF4400"; ctx.font = "bold 5px monospace"; ctx.textAlign = "center";
        ctx.fillText("ALARM", ex2+16, ey2+28);
      }

      // ── Lab scientists (fully drawn top-down people, not circles) ──
      const drawScientist = (px, py, coatCol, skinCol, hairCol) => {
        // Ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath(); ctx.ellipse(px, py + 8, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
        // Legs (trousers)
        ctx.fillStyle = '#1a2a3a';
        ctx.fillRect(px - 6, py + 2, 5, 13);
        ctx.fillRect(px + 1, py + 2, 5, 13);
        // Shoes
        ctx.fillStyle = '#0a0a10';
        ctx.fillRect(px - 7, py + 12, 7, 5);
        ctx.fillRect(px, py + 12, 7, 5);
        // Lab coat body
        ctx.fillStyle = coatCol;
        rr(px - 10, py - 14, 20, 24, 3); ctx.fill();
        // Coat lapels
        ctx.fillStyle = 'rgba(200,230,255,0.18)';
        ctx.beginPath(); ctx.moveTo(px - 4, py - 14); ctx.lineTo(px, py - 8); ctx.lineTo(px + 4, py - 14); ctx.closePath(); ctx.fill();
        // Breast pocket
        ctx.strokeStyle = 'rgba(0,180,120,0.5)'; ctx.lineWidth = 1;
        rr(px + 2, py - 10, 7, 6, 1); ctx.stroke();
        // Arms
        ctx.strokeStyle = coatCol; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(px - 10, py - 8); ctx.lineTo(px - 19, py + 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px + 10, py - 8); ctx.lineTo(px + 19, py + 2); ctx.stroke();
        ctx.lineCap = 'butt';
        // Hands
        ctx.fillStyle = skinCol;
        ctx.beginPath(); ctx.arc(px - 19, py + 2, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + 19, py + 2, 4, 0, Math.PI * 2); ctx.fill();
        // Neck
        ctx.fillStyle = skinCol; ctx.fillRect(px - 3, py - 16, 6, 4);
        // Head
        ctx.beginPath(); ctx.arc(px, py - 22, 9, 0, Math.PI * 2); ctx.fill();
        // Hair
        ctx.fillStyle = hairCol;
        ctx.beginPath(); ctx.arc(px, py - 25, 8, Math.PI, 0); ctx.fill();
        ctx.fillRect(px - 8, py - 26, 16, 6);
        // Eyes (white + pupil)
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(px - 3.5, py - 23, 2.2, 1.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(px + 3.5, py - 23, 2.2, 1.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a3a60';
        ctx.beginPath(); ctx.arc(px - 3.5, py - 23, 1.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + 3.5, py - 23, 1.1, 0, Math.PI * 2); ctx.fill();
        // Tiny nose
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath(); ctx.arc(px, py - 20, 1, 0, Math.PI * 2); ctx.fill();
        // Mouth
        ctx.strokeStyle = 'rgba(120,60,40,0.7)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(px, py - 17.5, 2.5, 0.15, Math.PI - 0.15); ctx.stroke();
      };

      // Scientist 1 — near specimen tanks, checking readings (left side)
      drawScientist(tankXs[0] + tankW2 + 30, tankTY + tankH2 * 0.5, '#e8eef4', '#f0c890', '#3a2810');
      // Scientist 2 — at workstation zone B (center)
      drawScientist(labCx - 80, H * 0.42, '#dce8f0', '#e8b070', '#1a1a2a');
      // Scientist 3 — near synthesis array (zone D, left side)
      drawScientist(50 + 100, H * 0.60, '#eaf2f8', '#c8905a', '#2a1a00');
      // Scientist 4 — near cryo pods (right side)
      drawScientist(W - 155 + 40, H * 0.52, '#dce8f0', '#ddb080', '#111');

      // ── DR CHAOS — Evil scientist boss (center of lab) ──────────────
      {
        const dx = labCx + 20, dy = H * 0.55;
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(dx, dy + 10, 17, 7, 0, 0, Math.PI * 2); ctx.fill();
        // Legs (dark trousers)
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(dx - 7, dy + 2, 6, 15);
        ctx.fillRect(dx + 1, dy + 2, 6, 15);
        // Boots (pointed, black)
        ctx.fillStyle = '#050505';
        ctx.fillRect(dx - 9, dy + 14, 9, 6);
        ctx.fillRect(dx, dy + 14, 9, 6);
        // Long dark coat body
        ctx.fillStyle = '#1a0a2a';
        rr(dx - 12, dy - 16, 24, 28, 3); ctx.fill();
        // Coat inner lining (red)
        ctx.fillStyle = 'rgba(200,0,0,0.5)';
        ctx.beginPath(); ctx.moveTo(dx - 5, dy - 16); ctx.lineTo(dx, dy - 7); ctx.lineTo(dx + 5, dy - 16); ctx.closePath(); ctx.fill();
        // Coat collar (upturned, dark purple)
        ctx.fillStyle = '#2a1040';
        ctx.fillRect(dx - 9, dy - 20, 18, 7);
        // Chest device (glowing red)
        ctx.fillStyle = '#FF0020';
        ctx.shadowColor = '#FF0020'; ctx.shadowBlur = 8;
        rr(dx - 5, dy - 12, 10, 8, 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,80,80,0.8)';
        ctx.beginPath(); ctx.arc(dx, dy - 8, 2, 0, Math.PI * 2); ctx.fill();
        // Arms (long coat arms)
        ctx.strokeStyle = '#1a0a2a'; ctx.lineWidth = 8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(dx - 12, dy - 8); ctx.lineTo(dx - 22, dy + 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(dx + 12, dy - 8); ctx.lineTo(dx + 22, dy + 6); ctx.stroke();
        ctx.lineCap = 'butt';
        // Gloved hands (black)
        ctx.fillStyle = '#0a0a0a';
        ctx.beginPath(); ctx.arc(dx - 22, dy + 6, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(dx + 22, dy + 6, 5, 0, Math.PI * 2); ctx.fill();
        // Right hand holds beaker (glowing green)
        ctx.fillStyle = 'rgba(0,255,100,0.9)';
        ctx.shadowColor = '#00FF64'; ctx.shadowBlur = 6;
        ctx.fillRect(dx + 20, dy, 6, 10);
        ctx.fillStyle = '#00FF64';
        ctx.beginPath(); ctx.arc(dx + 23, dy, 4, Math.PI, 0); ctx.fill();
        ctx.shadowBlur = 0;
        // Neck (pale skin)
        ctx.fillStyle = '#c8b0d0';
        ctx.fillRect(dx - 4, dy - 18, 8, 5);
        // Head (larger, menacing)
        ctx.fillStyle = '#c8b0d0';
        ctx.beginPath(); ctx.arc(dx, dy - 26, 11, 0, Math.PI * 2); ctx.fill();
        // Wild dark hair (messy, spiked)
        ctx.fillStyle = '#0a0a10';
        ctx.beginPath(); ctx.arc(dx, dy - 30, 10, Math.PI, 0); ctx.fill();
        ctx.fillRect(dx - 10, dy - 31, 20, 7);
        // Hair spikes (jagged top)
        ctx.beginPath();
        ctx.moveTo(dx - 10, dy - 30);
        ctx.lineTo(dx - 14, dy - 38); ctx.lineTo(dx - 7, dy - 32);
        ctx.lineTo(dx - 2, dy - 40); ctx.lineTo(dx + 4, dy - 32);
        ctx.lineTo(dx + 9, dy - 38); ctx.lineTo(dx + 10, dy - 30);
        ctx.closePath(); ctx.fill();
        // Goggles strap
        ctx.strokeStyle = '#222'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(dx - 11, dy - 26); ctx.lineTo(dx + 11, dy - 26); ctx.stroke();
        // Goggles (red lenses)
        ctx.fillStyle = 'rgba(200,0,0,0.85)';
        ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.ellipse(dx - 4, dy - 27, 4, 3, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(dx + 4, dy - 27, 4, 3, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(dx - 4, dy - 27, 4, 3, -0.2, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(dx + 4, dy - 27, 4, 3, 0.2, 0, Math.PI * 2); ctx.stroke();
        // Nose (sharp)
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.arc(dx, dy - 23, 1.5, 0, Math.PI * 2); ctx.fill();
        // Sinister grin
        ctx.strokeStyle = '#8a1a1a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(dx, dy - 20.5, 4, 0.3, Math.PI - 0.3); ctx.stroke();
        // Name label
        ctx.shadowColor = '#FF0020'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#FF4040';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DR. CHAOS', dx, dy - 40);
        ctx.shadowBlur = 0;
      }
    }

    // ── ZOMBIE MAP: atmospheric decay overlay ──────────────
    if (!!this.map?.config?.zombie) {
      const zt = performance.now() / 1000;
      ctx.save();

      // Biohazard fog tint
      ctx.globalAlpha = 0.08 + 0.03 * Math.sin(zt * 0.7);
      ctx.fillStyle = "#22FF44";
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;

      // Biohazard sign on left wall
      const bhx = W * 0.08, bhy = H * 0.38;
      const bhGlow = ctx.createRadialGradient(bhx, bhy, 0, bhx, bhy, 28);
      bhGlow.addColorStop(0, `rgba(44,220,44,${0.3 + 0.15 * Math.sin(zt * 1.2)})`);
      bhGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bhGlow;
      ctx.beginPath(); ctx.arc(bhx, bhy, 28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(44,255,44,${0.7 + 0.3 * Math.sin(zt * 1.2)})`;
      ctx.font = "22px serif";
      ctx.textAlign = "center";
      ctx.fillText("☢", bhx, bhy + 8);

      // WARNING tape strips along bottom
      const stripeCount = Math.floor(W / 28);
      for (let si = 0; si < stripeCount; si++) {
        ctx.fillStyle = si % 2 === 0 ? "rgba(44,200,44,0.18)" : "rgba(0,0,0,0.18)";
        ctx.fillRect(si * 28, H - 12, 28, 12);
      }

      // Blood splatters on floor
      for (const [sx, sy] of [[W*0.22,H*0.55],[W*0.65,H*0.38],[W*0.44,H*0.72],[W*0.78,H*0.60]]) {
        ctx.fillStyle = "rgba(140,8,8,0.22)";
        ctx.beginPath(); ctx.ellipse(sx, sy, 14, 8, sx * 0.02, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(120,6,6,0.18)";
        ctx.beginPath(); ctx.arc(sx + 18, sy - 5, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx - 12, sy + 8, 3, 0, Math.PI * 2); ctx.fill();
      }

      // Overgrown vines from corners
      ctx.strokeStyle = `rgba(30,160,40,${0.35 + 0.10 * Math.sin(zt * 0.5)})`;
      ctx.lineWidth = 1.5;
      for (const [vx0, vy0, vx1, vy1, vx2, vy2] of [
        [0,   0,   W*0.18, H*0.22, W*0.06, H*0.45],
        [W,   0,   W*0.82, H*0.18, W*0.92, H*0.42],
        [0,   H,   W*0.14, H*0.80, W*0.04, H*0.60],
        [W,   H,   W*0.86, H*0.78, W*0.94, H*0.58],
      ]) {
        ctx.beginPath();
        ctx.moveTo(vx0, vy0);
        ctx.quadraticCurveTo(vx1, vy1, vx2, vy2);
        ctx.stroke();
      }

      // Floating spores
      for (let pi = 0; pi < 8; pi++) {
        const sx2 = (Math.sin(pi * 2.3 + zt * 0.4) * 0.4 + 0.5) * W;
        const sy2 = (Math.cos(pi * 1.7 + zt * 0.35) * 0.35 + 0.5) * H;
        ctx.fillStyle = `rgba(44,220,44,${0.18 + 0.10 * Math.sin(zt * 1.3 + pi)})`;
        ctx.beginPath(); ctx.arc(sx2, sy2, 1.5, 0, Math.PI * 2); ctx.fill();
      }

      ctx.restore();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
};  // end Game.prototype._renderIndoorFurniture

// ══════════════════════════════════════════════════════════════════════════════
//  METROPOLIS-ONLY building interiors — big rooms, themed items, human workers
// ══════════════════════════════════════════════════════════════════════════════
Game.prototype._renderMetropolisRoom = function(ctx, room, type, W, H, cx, topY, midY) {
  const t = performance.now() / 1000;
  const AMBER = '#FF9933', GOLD = '#FFCC44';

  const rr = (x, y, w, h, r = 4) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

  // Top-down human figure: clothColor=torso/arms, skin=skin tone, hair=hair color
  const drawMetroHuman = (px, py, clothColor, skin, hair) => {
    ctx.save();
    ctx.translate(px, py);
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.beginPath(); ctx.ellipse(0, 10, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
    // Dark trousers + shoes
    ctx.fillStyle = '#1a1a28';
    ctx.fillRect(-5, 2, 4, 14); ctx.fillRect(1, 2, 4, 14);
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(-6, 14, 6, 5); ctx.fillRect(0, 14, 6, 5);
    // Torso
    ctx.fillStyle = clothColor;
    rr(-9, -14, 18, 20, 3); ctx.fill();
    // Arms
    ctx.strokeStyle = clothColor; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-9, -7); ctx.lineTo(-17, 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(9, -7); ctx.lineTo(17, 2); ctx.stroke();
    ctx.lineCap = 'butt';
    // Hands
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(-17, 2, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(17, 2, 3.5, 0, Math.PI * 2); ctx.fill();
    // Neck + head
    ctx.fillRect(-3, -16, 6, 5);
    ctx.beginPath(); ctx.arc(0, -22, 9, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(-3, -23, 2.2, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3, -23, 2.2, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(-3, -23, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3, -23, 1.1, 0, Math.PI * 2); ctx.fill();
    // Hair
    ctx.fillStyle = hair;
    ctx.beginPath(); ctx.arc(0, -27, 9.5, Math.PI, 0); ctx.fill();
    ctx.restore();
  };

  // Amber-tiled metro floor
  const drawMetroFloor = (c1 = '#0f0e18', c2 = '#131220') => {
    const tW = Math.max(1, Math.floor(W / 14));
    const tH = Math.max(1, Math.floor(H / 12));
    for (let ty2 = 0; ty2 <= Math.ceil(H / tH); ty2++) {
      for (let tx2 = 0; tx2 <= Math.ceil(W / tW); tx2++) {
        ctx.fillStyle = (tx2 + ty2) % 2 === 0 ? c1 : c2;
        ctx.fillRect(tx2 * tW, ty2 * tH, tW, tH);
      }
    }
    ctx.strokeStyle = 'rgba(255,153,51,0.10)'; ctx.lineWidth = 1;
    for (let ty2 = 0; ty2 <= Math.ceil(H / tH); ty2++) {
      ctx.beginPath(); ctx.moveTo(0, ty2 * tH); ctx.lineTo(W, ty2 * tH); ctx.stroke();
    }
  };

  // Glowing amber neon sign
  const drawMetroSign = (label) => {
    ctx.save();
    const sw = Math.min(label.length * 11 + 28, W - 24);
    const sx = W / 2 - sw / 2, sy = room.S - 22;
    const sg = ctx.createLinearGradient(sx, sy, sx + sw, sy);
    sg.addColorStop(0, 'rgba(28,18,6,0.96)'); sg.addColorStop(0.5, 'rgba(48,28,6,0.98)'); sg.addColorStop(1, 'rgba(28,18,6,0.96)');
    ctx.fillStyle = sg; rr(sx, sy, sw, 26, 5); ctx.fill();
    ctx.strokeStyle = `rgba(255,153,51,${0.65 + 0.35 * Math.sin(t * 2)})`; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.font = 'bold 12px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = GOLD; ctx.shadowColor = AMBER; ctx.shadowBlur = 14;
    ctx.fillText(label, W / 2, sy + 17); ctx.shadowBlur = 0;
    ctx.restore();
  };

  ctx.save();

  if (type === 0 || type === 'restaurant') {
    // ═══ RESTAURANT: THE GOLDEN FORK ═══
    drawMetroFloor('#120e06', '#160e04');
    drawMetroSign('THE GOLDEN FORK');
    // Back wall kitchen counter full-width
    const kcX = cx - W * 0.44, kcY = topY + 8;
    ctx.fillStyle = '#1a1408'; ctx.strokeStyle = AMBER; ctx.lineWidth = 1.5;
    rr(kcX, kcY, W * 0.88, 28, 4); ctx.fill(); ctx.stroke();
    ctx.font = '13px serif'; ctx.textAlign = 'center';
    for (const [ei, ex2] of [['🍜',kcX+W*0.10],['🍛',kcX+W*0.22],['🥩',kcX+W*0.34],['🔥',kcX+W*0.46],['🍝',kcX+W*0.58],['🥘',kcX+W*0.70],['🧂',kcX+W*0.80]])
      ctx.fillText(ei, ex2, kcY + 20);
    // Menu board on back wall
    ctx.fillStyle = '#0e0a04'; ctx.strokeStyle = '#CC8833'; ctx.lineWidth = 1.5;
    rr(cx - 50, topY + 42, 100, 36, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFEECC'; ctx.font = 'bold 8px serif'; ctx.textAlign = 'center';
    ctx.fillText('TODAY\'S SPECIAL', cx, topY + 56);
    ctx.fillStyle = GOLD; ctx.font = '6px serif';
    ctx.fillText('Neon Steak  $28 | Cyber Ramen  $18', cx, topY + 70);
    // Wine rack left wall
    ctx.fillStyle = '#150c04'; ctx.strokeStyle = '#882200'; ctx.lineWidth = 1;
    rr(cx - W * 0.44, topY + 82, 36, 100, 3); ctx.fill(); ctx.stroke();
    const wineC = ['#8B0000','#CC2200','#AA1100','#660000','#BB3300','#990000'];
    for (let wi = 0; wi < 6; wi++) {
      const wy = topY + 90 + wi * 14;
      ctx.fillStyle = wineC[wi]; ctx.globalAlpha = 0.9;
      rr(cx - W * 0.44 + 4, wy, 28, 10, 3); ctx.fill(); ctx.globalAlpha = 1;
    }
    // Host podium near entrance
    ctx.fillStyle = '#2a1a08'; ctx.strokeStyle = '#FFAA44'; ctx.lineWidth = 1.5;
    rr(cx + W * 0.36, midY + 80, 48, 36, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = GOLD; ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center';
    ctx.fillText('HOST', cx + W * 0.36 + 24, midY + 102);
    // 6 dining tables in 2 rows × 3
    const dtPos = [[cx-W*0.32,midY-80],[cx-W*0.04,midY-80],[cx+W*0.24,midY-80],[cx-W*0.32,midY+30],[cx-W*0.04,midY+30],[cx+W*0.24,midY+30]];
    for (const [tx2, ty2] of dtPos) {
      ctx.fillStyle = '#2a1c0c'; ctx.strokeStyle = '#6a4a20'; ctx.lineWidth = 1;
      rr(tx2, ty2, 84, 48, 5); ctx.fill(); ctx.stroke();
      // tablecloth
      ctx.fillStyle = '#3a2814'; rr(tx2+4, ty2+4, 76, 40, 4); ctx.fill();
      // plates
      for (let pi = 0; pi < 4; pi++) {
        const pa = (pi/4)*Math.PI*2;
        ctx.fillStyle = '#EEE8D0'; ctx.strokeStyle = AMBER; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(tx2+42+Math.cos(pa)*30, ty2+24+Math.sin(pa)*16, 7, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      }
      // candle
      ctx.fillStyle = '#FFDD88'; ctx.shadowColor = '#FFAA44'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(tx2+42, ty2+24, 3.5, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    }
    // Corner plants
    for (const [px2,py2] of [[cx-W*0.44,midY+110],[cx+W*0.40,midY+110]]) {
      ctx.fillStyle = '#0a1a08'; ctx.strokeStyle = '#226622'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px2, py2, 16, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a3a14'; ctx.font = '18px serif'; ctx.textAlign = 'center';
      ctx.fillText('🌿', px2, py2+6);
    }
    // Cash register at end of bar
    ctx.fillStyle = '#1a1008'; ctx.strokeStyle = '#CC8833'; ctx.lineWidth = 1;
    rr(cx + W * 0.36, topY + 8, 52, 32, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#00FF88'; ctx.font = '5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('$ 0.00', cx + W * 0.36 + 26, topY + 24);
    ctx.fillStyle = '#FFAA44'; ctx.font = 'bold 6px monospace';
    ctx.fillText('REGISTER', cx + W * 0.36 + 26, topY + 36);
    // Pendant lights
    for (const lx of [cx-W*0.32+42, cx-W*0.04+42, cx+W*0.24+42, cx-W*0.32+42+W*0.28, cx-W*0.04+42+W*0.28]) {
      ctx.fillStyle = '#FFEEAA'; ctx.shadowColor = '#FFCC44'; ctx.shadowBlur = 16*(0.7+0.3*Math.sin(t*1.2));
      ctx.beginPath(); ctx.arc(lx, topY+2, 5, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#886622'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, topY+2); ctx.stroke();
      ctx.shadowBlur = 0;
    }
    drawMetroHuman(cx - W * 0.42, midY + 10, '#CC3333', '#C8956A', '#1a0a00'); // chef
    drawMetroHuman(cx + W * 0.28, midY + 10, '#1a1a2a', '#FFDAB0', '#2a2020'); // waiter
    drawMetroHuman(cx + W * 0.36, midY + 44, '#2a1a0a', '#E0A878', '#4a2010'); // host

  } else if (type === 1) {
    // ═══ OFFICE: AXIOM CORPORATE ═══
    drawMetroFloor('#080a14', '#0a0c18');
    drawMetroSign('AXIOM CORP');
    // Company logo on back wall
    ctx.fillStyle = '#0a0d20'; ctx.strokeStyle = '#3355BB'; ctx.lineWidth = 2;
    rr(cx - 60, topY + 6, 120, 32, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4488FF'; ctx.font = 'bold 10px Orbitron,monospace'; ctx.textAlign = 'center';
    ctx.shadowColor = '#4488FF'; ctx.shadowBlur = 10;
    ctx.fillText('AXIOM CORP', cx, topY + 26); ctx.shadowBlur = 0;
    // Reception desk center
    ctx.fillStyle = '#0e1428'; ctx.strokeStyle = '#2244AA'; ctx.lineWidth = 1.5;
    rr(cx - 80, topY + 44, 160, 30, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#000c1c'; ctx.fillRect(cx - 68, topY + 50, 136, 16);
    ctx.fillStyle = '#4466CC'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('RECEPTION', cx, topY + 62);
    // 6 workstation pods in two rows
    for (const [dx2, dy2] of [[cx-W*0.34,midY-60],[cx-W*0.08,midY-60],[cx+W*0.18,midY-60],[cx-W*0.34,midY+30],[cx-W*0.08,midY+30],[cx+W*0.18,midY+30]]) {
      ctx.fillStyle = '#0c1020'; ctx.strokeStyle = '#2233AA'; ctx.lineWidth = 1;
      rr(dx2-34, dy2, 68, 40, 3); ctx.fill(); ctx.stroke();
      // monitor
      ctx.fillStyle = '#0a0f1c'; ctx.strokeStyle = '#3355CC'; ctx.lineWidth = 1;
      rr(dx2-20, dy2+4, 40, 24, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#001a3a'; ctx.fillRect(dx2-16, dy2+7, 32, 16);
      ctx.fillStyle = '#4499FF'; ctx.font = '4px monospace'; ctx.textAlign = 'center';
      ctx.fillText('> RUN ANALYSIS', dx2, dy2+17);
      // keyboard
      ctx.fillStyle = '#151c2c'; ctx.fillRect(dx2-14, dy2+30, 28, 8);
      ctx.strokeStyle = '#223355'; ctx.lineWidth = 0.5; ctx.strokeRect(dx2-14, dy2+30, 28, 8);
    }
    // Filing cabinets left wall
    for (let fi = 0; fi < 5; fi++) {
      const fx2 = cx - W * 0.44 + fi * 36;
      ctx.fillStyle = '#111828'; ctx.strokeStyle = '#334466'; ctx.lineWidth = 1;
      rr(fx2, topY + 80, 32, 64, 2); ctx.fill(); ctx.stroke();
      for (let dr = 0; dr < 4; dr++) {
        ctx.strokeStyle = '#2233AA'; ctx.lineWidth = 0.5;
        ctx.strokeRect(fx2 + 3, topY + 84 + dr * 14, 26, 11);
        ctx.fillStyle = '#FFCC44'; ctx.fillRect(fx2 + 12, topY + 88 + dr * 14, 8, 2);
      }
    }
    // Conference table right side
    ctx.fillStyle = '#0c1224'; ctx.strokeStyle = '#2244AA'; ctx.lineWidth = 1.5;
    rr(cx + W * 0.20, midY - 70, 100, 60, 5); ctx.fill(); ctx.stroke();
    for (let ci = 0; ci < 6; ci++) {
      const ca = (ci/6)*Math.PI*2;
      ctx.fillStyle = '#1a2a44'; ctx.strokeStyle = '#3355AA'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.arc(cx+W*0.20+50+Math.cos(ca)*36, midY-70+30+Math.sin(ca)*22, 8, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    }
    // Water cooler
    ctx.fillStyle = '#0e1428'; ctx.strokeStyle = '#6699DD'; ctx.lineWidth = 1;
    rr(cx + W * 0.36, midY + 60, 24, 40, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#99CCFF'; ctx.globalAlpha = 0.6;
    ctx.fillRect(cx + W * 0.36 + 4, midY + 62, 16, 26); ctx.globalAlpha = 1;
    // Printer
    ctx.fillStyle = '#0c1020'; ctx.strokeStyle = '#2244AA'; ctx.lineWidth = 1;
    rr(cx - W * 0.44, midY + 60, 52, 36, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4466FF'; ctx.font = '5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('PRINTER', cx - W * 0.44 + 26, midY + 82);
    // Wall clock
    ctx.strokeStyle = '#4466CC'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx + W * 0.40, topY + 30, 16, 0, Math.PI*2); ctx.stroke();
    ctx.strokeStyle = '#AACCFF'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx+W*0.40, topY+30); ctx.lineTo(cx+W*0.40, topY+18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+W*0.40, topY+30); ctx.lineTo(cx+W*0.40+8, topY+34); ctx.stroke();
    drawMetroHuman(cx - W * 0.22, midY - 12, '#2a3a5a', '#E0A878', '#1a0a00');
    drawMetroHuman(cx + W * 0.10, midY - 12, '#3a4a6a', '#FFDAB0', '#4a3020');
    drawMetroHuman(cx - W * 0.04, topY + 100, '#1a2a4a', '#C8956A', '#2a1010'); // receptionist

  } else if (type === 2) {
    // ═══ HOTEL: CROWN PLAZA ═══
    drawMetroFloor('#100a14', '#14081a');
    drawMetroSign('CROWN PLAZA HOTEL');
    // Front desk full-width
    ctx.fillStyle = '#140828'; ctx.strokeStyle = '#9966DD'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.30, topY + 8, W * 0.60, 30, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = GOLD; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
    ctx.shadowColor = AMBER; ctx.shadowBlur = 10;
    ctx.fillText('CROWN PLAZA — FRONT DESK', cx, topY + 28); ctx.shadowBlur = 0;
    // Computer + bell on desk
    ctx.fillStyle = '#0c0618'; ctx.strokeStyle = '#7744AA'; ctx.lineWidth = 1;
    rr(cx - 44, topY + 42, 88, 22, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#001a2a'; ctx.fillRect(cx - 36, topY + 44, 72, 14);
    ctx.fillStyle = '#9966FF'; ctx.font = '5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('GUEST SERVICES', cx, topY + 55);
    // Lobby seating area left
    for (const [sx2, sy2] of [[cx-W*0.44,midY-60],[cx-W*0.44,midY],[cx-W*0.26,midY-30]]) {
      ctx.fillStyle = '#1a0828'; ctx.strokeStyle = '#7744AA'; ctx.lineWidth = 1;
      rr(sx2, sy2, 60, 36, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2a1038'; rr(sx2+4, sy2+4, 52, 20, 4); ctx.fill();
    }
    // Coffee table in lobby
    ctx.fillStyle = '#180c2a'; ctx.strokeStyle = '#AA66DD'; ctx.lineWidth = 1;
    rr(cx - W * 0.34, midY - 16, 52, 32, 4); ctx.fill(); ctx.stroke();
    ctx.font = '12px serif'; ctx.textAlign = 'center';
    ctx.fillText('☕', cx - W * 0.34 + 26, midY + 4);
    // 3 hotel room doors right side
    for (let di = 0; di < 3; di++) {
      const dy2 = topY + 44 + di * 80;
      ctx.fillStyle = '#1a0828'; ctx.strokeStyle = '#9966CC'; ctx.lineWidth = 1.5;
      rr(cx + W * 0.32, dy2, 52, 66, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFCC44'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`${di + 101}`, cx + W * 0.32 + 26, dy2 + 34);
      ctx.fillStyle = '#FFCC44'; ctx.beginPath(); ctx.arc(cx + W * 0.32 + 42, dy2 + 33, 3, 0, Math.PI*2); ctx.fill();
    }
    // Beds (2 large double beds)
    for (const bx of [cx - W * 0.06, cx + W * 0.18]) {
      ctx.fillStyle = '#1a0a28'; ctx.strokeStyle = '#7744AA'; ctx.lineWidth = 1.5;
      rr(bx - 46, midY + 10, 92, 58, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#240f38'; rr(bx - 42, midY + 14, 72, 42, 4); ctx.fill();
      // pillows
      ctx.fillStyle = '#EEE8FF'; rr(bx + 22, midY + 16, 18, 14, 3); ctx.fill();
      ctx.fillStyle = '#DDD0FF'; rr(bx + 4, midY + 16, 16, 14, 3); ctx.fill();
      // blanket fold
      ctx.fillStyle = '#B090E0'; ctx.fillRect(bx - 38, midY + 44, 60, 5);
      // bedside lamp
      ctx.fillStyle = '#FFEEAA'; ctx.shadowColor = '#FFDD88'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(bx - 50, midY + 22, 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
    // Key rack right wall
    ctx.fillStyle = '#0e0818'; ctx.strokeStyle = '#6633AA'; ctx.lineWidth = 1;
    rr(cx - W * 0.44, topY + 46, 48, 80, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9966DD'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('KEY RACK', cx - W * 0.44 + 24, topY + 56);
    for (let ki = 0; ki < 8; ki++) {
      const kx2 = cx - W * 0.44 + 8 + (ki % 4) * 10, ky2 = topY + 62 + Math.floor(ki / 4) * 22;
      ctx.fillStyle = ki < 5 ? '#FFCC44' : '#555566';
      ctx.beginPath(); ctx.arc(kx2, ky2, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#AA8822'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(kx2, ky2 + 3.5); ctx.lineTo(kx2, ky2 + 9); ctx.stroke();
    }
    // Vending machine
    ctx.fillStyle = '#12062a'; ctx.strokeStyle = '#8844CC'; ctx.lineWidth = 1.5;
    rr(cx + W * 0.12, topY + 8, 36, 68, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#440066'; ctx.fillRect(cx + W * 0.12 + 3, topY + 11, 30, 40);
    ctx.fillStyle = '#CC88FF'; ctx.font = '5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('SNACKS', cx + W * 0.12 + 18, topY + 70);
    drawMetroHuman(cx - W * 0.04, topY + 60, '#2a1a4a', '#C8956A', '#1a0a00'); // concierge
    drawMetroHuman(cx - W * 0.16, midY + 84, '#3a2050', '#FFDAB0', '#3a2010'); // bellhop

  } else if (type === 3) {
    // ═══ MARKET: METRO MARKET ═══
    drawMetroFloor('#060c08', '#080e0a');
    drawMetroSign('METRO MARKET');
    // 5 product shelving aisles
    const pColors = ['#FF4444','#4488FF','#44CC44','#FFAA00','#FF44AA','#AA44FF','#FF7722','#22CCFF'];
    const aisleLabels = ['PRODUCE','DAIRY','SNACKS','BEVERAGES','FROZEN'];
    for (let ai = 0; ai < 5; ai++) {
      const ax2 = cx - W * 0.40 + ai * W * 0.17;
      ctx.fillStyle = '#0c1a0e'; ctx.strokeStyle = '#226622'; ctx.lineWidth = 1;
      rr(ax2 - 20, topY + 8, 40, H * 0.52, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#004400'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
      ctx.fillText(aisleLabels[ai], ax2, topY + 18);
      for (let si = 0; si < 5; si++) {
        ctx.strokeStyle = '#1a3a1a'; ctx.lineWidth = 0.5;
        ctx.strokeRect(ax2 - 18, topY + 22 + si * (H * 0.09), 36, 2);
        for (let pi = 0; pi < 5; pi++) {
          ctx.fillStyle = pColors[(ai * 5 + si + pi) % pColors.length];
          ctx.globalAlpha = 0.88;
          ctx.fillRect(ax2 - 16 + pi * 6.5, topY + 26 + si * (H * 0.09), 5, 9);
          ctx.globalAlpha = 1;
        }
      }
    }
    // Fruit/veg display at entrance
    ctx.fillStyle = '#081a0a'; ctx.strokeStyle = '#44AA44'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.44, midY + 50, W * 0.26, 40, 4); ctx.fill(); ctx.stroke();
    ctx.font = '12px serif'; ctx.textAlign = 'center';
    for (const [em, ex2] of [['🍎',cx-W*0.44+20],['🍊',cx-W*0.44+42],['🍋',cx-W*0.44+64],['🥦',cx-W*0.44+86],['🍇',cx-W*0.44+108]])
      ctx.fillText(em, ex2, midY + 76);
    // Deli counter
    ctx.fillStyle = '#0a1a0c'; ctx.strokeStyle = '#55AA55'; ctx.lineWidth = 1.5;
    rr(cx + W * 0.20, midY - 40, 84, 44, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#00CC44'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('DELI COUNTER', cx + W * 0.20 + 42, midY - 24);
    ctx.font = '5px monospace';
    ctx.fillText('HOT FOODS · COLD CUTS', cx + W * 0.20 + 42, midY - 12);
    // 3 checkout registers
    for (let ci = 0; ci < 3; ci++) {
      const coX = cx - W * 0.10 + ci * W * 0.16, coY = midY + 50;
      ctx.fillStyle = '#0e1a0e'; ctx.strokeStyle = '#44AA44'; ctx.lineWidth = 1.5;
      rr(coX, coY, 60, 32, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#22CC44'; ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`LANE ${ci + 1}`, coX + 30, coY + 12);
      ctx.fillStyle = '#00FF66'; ctx.font = '5px monospace';
      ctx.fillText('$ 0.00', coX + 30, coY + 24);
    }
    // Shopping cart rack
    ctx.fillStyle = '#0a1408'; ctx.strokeStyle = '#226622'; ctx.lineWidth = 1;
    rr(cx + W * 0.32, midY + 60, 52, 38, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#44AA44'; ctx.font = '7px serif'; ctx.textAlign = 'center';
    ctx.fillText('🛒🛒🛒', cx + W * 0.32 + 26, midY + 84);
    // ATM on wall
    ctx.fillStyle = '#060e08'; ctx.strokeStyle = '#33AA33'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.44, midY - 40, 36, 58, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#00CC44'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('ATM', cx - W * 0.44 + 18, midY - 20);
    ctx.fillStyle = '#001800'; ctx.fillRect(cx - W * 0.44 + 4, midY - 14, 28, 16);
    ctx.fillStyle = '#00FF66'; ctx.font = '4px monospace';
    ctx.fillText('$ CASH', cx - W * 0.44 + 18, midY - 4);
    drawMetroHuman(cx + W * 0.20 + 42, midY + 10, '#2a4a2a', '#FFDAB0', '#4a3020'); // deli worker
    drawMetroHuman(cx - W * 0.10 + 30, midY + 28, '#1a3a1a', '#8B5E3C', '#1a0a00'); // cashier
    drawMetroHuman(cx - W * 0.42, midY - 10, '#2a4030', '#C8956A', '#2a2010'); // stocker

  } else if (type === 4) {
    // ═══ ARCADE: NEON ARCADE ═══
    drawMetroFloor('#0a0008', '#0e0010');
    drawMetroSign('NEON ARCADE');
    const arcColors = ['#FF0088','#00FFCC','#FF4400','#8800FF','#FFCC00','#00CCFF'];
    // 10 arcade cabinets: 5 top row, 5 second row
    const arcPos = [
      [cx-W*0.42,topY+8],[cx-W*0.26,topY+8],[cx-W*0.10,topY+8],[cx+W*0.06,topY+8],[cx+W*0.22,topY+8],
      [cx-W*0.42,topY+80],[cx-W*0.26,topY+80],[cx-W*0.10,topY+80],[cx+W*0.06,topY+80],[cx+W*0.22,topY+80]
    ];
    for (let ai = 0; ai < arcPos.length; ai++) {
      const [ax2, ay2] = arcPos[ai], ac = arcColors[ai % arcColors.length];
      ctx.fillStyle = '#080010'; ctx.strokeStyle = ac; ctx.lineWidth = 1.5;
      ctx.shadowColor = ac; ctx.shadowBlur = 10 * (Math.sin(t * 2 + ai * 0.7) * 0.35 + 0.65);
      rr(ax2, ay2, 44, 64, 4); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      // screen
      ctx.fillStyle = '#000820'; ctx.fillRect(ax2 + 4, ay2 + 6, 36, 26);
      ctx.fillStyle = ac + '60'; ctx.fillRect(ax2 + 4, ay2 + 6, 36, 26);
      // score display
      ctx.fillStyle = '#FFFFFF'; ctx.font = '4px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`${(ai * 1337 + 9999).toString()}`, ax2 + 22, ay2 + 22);
      // joystick
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(ax2 + 12, ay2 + 42, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#CC2222'; ctx.beginPath(); ctx.arc(ax2 + 12, ay2 + 42, 3, 0, Math.PI*2); ctx.fill();
      // buttons
      for (let bi = 0; bi < 3; bi++) {
        ctx.fillStyle = ['#FF2222','#2222FF','#22FF22'][bi];
        ctx.beginPath(); ctx.arc(ax2 + 24 + bi * 8, ay2 + 42, 3.5, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = '#FFFF00'; ctx.font = '5px monospace';
      ctx.fillText('INSERT COIN', ax2 + 22, ay2 + 60);
    }
    // Prize counter
    ctx.fillStyle = '#12001c'; ctx.strokeStyle = '#FF00FF'; ctx.lineWidth = 1.5;
    ctx.shadowColor = '#FF00FF'; ctx.shadowBlur = 8;
    rr(cx + W * 0.30, midY + 10, 78, 36, 4); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#FF44FF'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('PRIZES', cx + W * 0.30 + 39, midY + 24);
    ctx.font = '5px monospace';
    ctx.fillText('TOKENS: $2 EA', cx + W * 0.30 + 39, midY + 36);
    // Prize items
    ctx.font = '10px serif';
    for (const [em, ex2] of [['🎮',cx+W*0.30+14],['🧸',cx+W*0.30+39],['🏆',cx+W*0.30+64]])
      ctx.fillText(em, ex2, midY + 8);
    // Token machine
    ctx.fillStyle = '#100018'; ctx.strokeStyle = '#CC00FF'; ctx.lineWidth = 1.5;
    rr(cx + W * 0.30, midY - 50, 36, 54, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FF44FF'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('TOKENS', cx + W * 0.30 + 18, midY - 38);
    ctx.fillText('$', cx + W * 0.30 + 18, midY - 26);
    // Dance mat in center bottom
    ctx.fillStyle = '#0c0018'; ctx.strokeStyle = '#8800FF'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.20, midY + 10, 130, 80, 5); ctx.fill(); ctx.stroke();
    const dmCols = ['#FF0088','#00FFCC','#FFCC00','#FF4400'];
    for (let dy2 = 0; dy2 < 4; dy2++) for (let dx2 = 0; dx2 < 4; dx2++) {
      ctx.fillStyle = dmCols[(dx2+dy2)%4] + '55';
      ctx.fillRect(cx - W*0.20 + 4 + dx2*31, midY+14 + dy2*18, 29, 16);
      ctx.strokeStyle = dmCols[(dx2+dy2)%4]; ctx.lineWidth = 0.5;
      ctx.strokeRect(cx - W*0.20 + 4 + dx2*31, midY+14 + dy2*18, 29, 16);
    }
    ctx.fillStyle = '#FF00FF'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('DANCE PAD', cx - W * 0.20 + 65, midY + 100);
    // High score board on wall
    ctx.fillStyle = '#080014'; ctx.strokeStyle = '#FF0088'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.44, topY + 8, 52, 110, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FF44CC'; ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center';
    ctx.fillText('TOP SCORES', cx - W * 0.44 + 26, topY + 22);
    const hsNames = ['ZAX','NEO','KAI','RYX','VEX'];
    for (let hi = 0; hi < 5; hi++) {
      ctx.fillStyle = hi === 0 ? '#FFCC00' : '#CC88FF';
      ctx.font = '5px monospace';
      ctx.fillText(`${hi+1}. ${hsNames[hi]} ${99999 - hi*4321}`, cx - W*0.44+26, topY + 36 + hi * 16);
    }
    drawMetroHuman(cx + W * 0.30 + 39, midY + 54, '#4a0a2a', '#C8956A', '#1a0a00'); // cashier
    drawMetroHuman(cx - W * 0.10, midY + 84, '#1a002a', '#FFDAB0', '#2a2020'); // player on dance pad

  } else if (type === 5) {
    // ═══ PHARMACY: METRO PHARMACY ═══
    drawMetroFloor('#040e0c', '#060e0a');
    drawMetroSign('METRO PHARMACY');
    // 4 shelving rows of medicine
    const shelfColors2 = ['#FF5566','#5577FF','#44FFCC','#FFCC44','#FF88FF','#44FF99','#FF7733','#88CCFF','#FFAA55','#55FFEE'];
    const shelfLabels = ['PAIN RELIEF','VITAMINS','COLD & FLU','FIRST AID'];
    for (let row = 0; row < 4; row++) {
      const shY = topY + 12 + row * 60;
      ctx.fillStyle = '#080f0d'; ctx.strokeStyle = '#228866'; ctx.lineWidth = 1;
      rr(cx - W * 0.44, shY, W * 0.54, 48, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#004433'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'left';
      ctx.fillText(shelfLabels[row], cx - W * 0.44 + 4, shY + 10);
      // shelf divider
      ctx.strokeStyle = '#114433'; ctx.lineWidth = 0.5;
      ctx.strokeRect(cx - W * 0.44, shY + 18, W * 0.54, 1.5);
      ctx.strokeRect(cx - W * 0.44, shY + 34, W * 0.54, 1.5);
      for (let bi = 0; bi < 12; bi++) {
        const bc = shelfColors2[(row * 12 + bi) % shelfColors2.length];
        const bx2 = cx - W * 0.44 + 4 + bi * W * 0.044;
        const bH2 = 12 + (bi % 4) * 3;
        ctx.fillStyle = bc; ctx.globalAlpha = 0.88;
        rr(bx2, shY + 4, 8, bH2, 2); ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 0.4; ctx.stroke();
      }
    }
    // Rx prescription counter
    ctx.fillStyle = '#060f0d'; ctx.strokeStyle = '#44CCAA'; ctx.lineWidth = 1.5;
    rr(cx + W * 0.16, topY + 12, W * 0.28, 70, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#44CCAA'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('Rx COUNTER', cx + W * 0.30, topY + 28);
    // prescription computer
    ctx.fillStyle = '#040c0a'; ctx.strokeStyle = '#229977'; ctx.lineWidth = 1;
    rr(cx + W * 0.20, topY + 34, 56, 36, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#001a14'; ctx.fillRect(cx + W * 0.20 + 3, topY + 37, 50, 22);
    ctx.fillStyle = '#00FFAA'; ctx.font = '4px monospace'; ctx.textAlign = 'center';
    ctx.fillText('PRESCRIPTION DB', cx + W * 0.20 + 28, topY + 50);
    // Green cross / first aid display
    ctx.fillStyle = '#00FF44'; ctx.shadowColor = '#00FF44'; ctx.shadowBlur = 14*(0.6+0.4*Math.sin(t*2));
    ctx.fillRect(cx + W * 0.40, topY + 20, 8, 24); ctx.fillRect(cx + W * 0.40 - 8, topY + 28, 24, 8); ctx.shadowBlur = 0;
    // Blood pressure machine
    ctx.fillStyle = '#060f0d'; ctx.strokeStyle = '#44CCAA'; ctx.lineWidth = 1;
    rr(cx - W * 0.44, midY + 40, 52, 52, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#44CCAA'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('BP MONITOR', cx - W * 0.44 + 26, midY + 52);
    ctx.fillStyle = '#00FF88'; ctx.font = '5px monospace';
    ctx.fillText('120 / 80', cx - W * 0.44 + 26, midY + 66);
    // Scale
    ctx.fillStyle = '#080f0d'; ctx.strokeStyle = '#33BBAA'; ctx.lineWidth = 1;
    rr(cx - W * 0.44, midY - 10, 48, 44, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#44CCAA'; ctx.font = '5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('SCALE', cx - W * 0.44 + 24, midY + 8);
    // Waiting chairs
    for (let ci = 0; ci < 4; ci++) {
      ctx.fillStyle = '#0a1a18'; ctx.strokeStyle = '#226644'; ctx.lineWidth = 1;
      rr(cx + W * 0.02 + ci * 36, midY + 40, 28, 28, 4); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#44CCAA'; ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center';
    ctx.fillText('WAITING AREA', cx + W * 0.18, midY + 82);
    drawMetroHuman(cx + W * 0.30, topY + 100, '#a8c8cc', '#E0A878', '#4a3020'); // pharmacist
    drawMetroHuman(cx + W * 0.10, midY + 15, '#88b0b4', '#FFDAB0', '#1a0a00');  // assistant
    drawMetroHuman(cx + W * 0.08, midY + 66, '#2a3a30', '#C8956A', '#4a3020');  // customer

  } else if (type === 6) {
    // ═══ GYM: IRON BODY GYM ═══
    drawMetroFloor('#100404', '#140404');
    drawMetroSign('IRON BODY GYM');
    // 5 treadmills top row
    for (let ti = 0; ti < 5; ti++) {
      const tx2 = cx - W * 0.40 + ti * W * 0.18, ty2 = topY + 8;
      ctx.fillStyle = '#1a0808'; ctx.strokeStyle = '#CC2222'; ctx.lineWidth = 1.5;
      rr(tx2 - 24, ty2, 52, 40, 4); ctx.fill(); ctx.stroke();
      // belt
      ctx.fillStyle = '#2a0a0a'; ctx.fillRect(tx2 - 20, ty2 + 12, 44, 14);
      ctx.strokeStyle = '#FF4444'; ctx.lineWidth = 0.5;
      for (let li = 0; li < 5; li++) ctx.strokeRect(tx2 - 20 + li * 8.8, ty2 + 12, 8.8, 14);
      // speed display
      ctx.fillStyle = '#FF2222'; ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 5;
      ctx.font = '5px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`${(ti + 6)}.0 KM/H`, tx2, ty2 + 38); ctx.shadowBlur = 0;
    }
    // Bench press stations
    for (const [bpx, bpy] of [[cx - W*0.34, midY - 50],[cx - W*0.04, midY - 50],[cx + W*0.26, midY - 50]]) {
      ctx.fillStyle = '#1a0c0c'; ctx.strokeStyle = '#882222'; ctx.lineWidth = 1.5;
      rr(bpx - 44, bpy, 88, 44, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#CC2222'; ctx.fillRect(bpx - 44, bpy + 12, 88, 12);
      // barbell
      ctx.fillStyle = '#3a1a1a'; ctx.strokeStyle = '#551111'; ctx.lineWidth = 1;
      ctx.fillRect(bpx - 46, bpy + 4, 92, 6);
      ctx.fillStyle = '#441111';
      ctx.beginPath(); ctx.ellipse(bpx - 46, bpy + 7, 7, 5, 0, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(bpx + 46, bpy + 7, 7, 5, 0, 0, Math.PI*2); ctx.fill();
    }
    // Dumbbell rack
    ctx.fillStyle = '#1a0c0c'; ctx.strokeStyle = '#AA2222'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.44, topY + 54, 44, 120, 3); ctx.fill(); ctx.stroke();
    for (let di = 0; di < 6; di++) {
      const dy2 = topY + 62 + di * 17;
      const dbx = cx - W * 0.44 + 4;
      ctx.fillStyle = '#2a1010'; ctx.strokeStyle = '#881111'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(dbx + 8, dy2, 6, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(dbx + 28, dy2, 6, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3a1a1a'; ctx.fillRect(dbx + 8, dy2 - 2, 20, 4);
      ctx.fillStyle = '#FF8888'; ctx.font = '4px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`${(di+1)*5}kg`, dbx + 18, dy2 + 12);
    }
    // Pull-up bars
    ctx.strokeStyle = '#CC2222'; ctx.lineWidth = 3;
    for (const px2 of [cx - W * 0.06, cx + W * 0.24]) {
      ctx.beginPath(); ctx.moveTo(px2 - 24, midY + 30); ctx.lineTo(px2 + 24, midY + 30); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px2 - 24, midY + 30); ctx.lineTo(px2 - 24, midY + 55); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px2 + 24, midY + 30); ctx.lineTo(px2 + 24, midY + 55); ctx.stroke();
      ctx.lineWidth = 3;
    }
    // Mirror wall indicator (right side)
    ctx.fillStyle = 'rgba(200,220,255,0.06)';
    ctx.fillRect(cx + W * 0.38, topY + 8, 12, H * 0.75);
    ctx.strokeStyle = '#99BBDD'; ctx.lineWidth = 0.5;
    ctx.strokeRect(cx + W * 0.38, topY + 8, 12, H * 0.75);
    ctx.fillStyle = '#AACCFF'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    // Water fountain
    ctx.fillStyle = '#1a0808'; ctx.strokeStyle = '#CC4444'; ctx.lineWidth = 1;
    rr(cx + W * 0.38, midY + 60, 36, 40, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4499FF'; ctx.globalAlpha = 0.6;
    ctx.fillRect(cx + W * 0.38 + 4, midY + 63, 28, 24); ctx.globalAlpha = 1;
    ctx.fillStyle = '#FF6666'; ctx.font = '5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('WATER', cx + W * 0.38 + 18, midY + 94);
    drawMetroHuman(cx - W * 0.42, midY + 6, '#2a0a0a', '#8B5E3C', '#1a0a00'); // trainer
    drawMetroHuman(cx + W * 0.40 + 6, midY + 6, '#3a0808', '#C8956A', '#2a1010'); // trainer2
    drawMetroHuman(cx - W * 0.04, midY + 52, '#1a0808', '#FFDAB0', '#4a3020'); // gym member

  } else if (type === 7) {
    // ═══ BANK: METRO NATIONAL BANK ═══
    drawMetroFloor('#080810', '#0a0a14');
    drawMetroSign('METRO NATIONAL BANK');
    // Bank logo header
    ctx.fillStyle = '#0a0a1e'; ctx.strokeStyle = '#FFCC44'; ctx.lineWidth = 2;
    rr(cx - 70, topY + 4, 140, 36, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = GOLD; ctx.font = 'bold 10px Orbitron,monospace'; ctx.textAlign = 'center';
    ctx.shadowColor = AMBER; ctx.shadowBlur = 12;
    ctx.fillText('METRO NATIONAL BANK', cx, topY + 26); ctx.shadowBlur = 0;
    // Security velvet rope barrier
    ctx.strokeStyle = '#CC2222'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx - W * 0.30, topY + 46); ctx.lineTo(cx + W * 0.14, topY + 46); ctx.stroke();
    for (const px2 of [cx - W * 0.30, cx - W * 0.08, cx + W * 0.14]) {
      ctx.fillStyle = '#FFCC44'; ctx.beginPath(); ctx.arc(px2, topY + 46, 5, 0, Math.PI*2); ctx.fill();
    }
    // 5 teller windows
    for (let ti = 0; ti < 5; ti++) {
      const tx2 = cx - W * 0.38 + ti * W * 0.19;
      ctx.fillStyle = '#0c0c1a'; ctx.strokeStyle = '#FFCC44'; ctx.lineWidth = 1.5;
      rr(tx2 - 30, topY + 54, 60, 46, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFCC44'; ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`TELLER ${ti + 1}`, tx2, topY + 66);
      // teller screen
      ctx.fillStyle = '#000c1c'; ctx.fillRect(tx2 - 22, topY + 70, 44, 18);
      ctx.fillStyle = '#00FF88'; ctx.font = '4px monospace';
      ctx.fillText(`$ ${(12345 + ti * 5678).toLocaleString()}`, tx2, topY + 82);
      // glass divider
      ctx.strokeStyle = 'rgba(180,220,255,0.20)'; ctx.lineWidth = 1;
      ctx.strokeRect(tx2 - 30, topY + 54, 60, 46);
    }
    // Vault (large, centered right)
    const vx = cx + W * 0.22, vy = midY - 10;
    ctx.fillStyle = '#0a0a14'; ctx.strokeStyle = '#FFDD44'; ctx.lineWidth = 2.5;
    rr(vx, vy, 80, 90, 8); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(vx + 40, vy + 40, 28, 0, Math.PI * 2);
    ctx.strokeStyle = '#CC9922'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(vx + 40, vy + 40, 14, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFDD44'; ctx.lineWidth = 1.5; ctx.stroke();
    for (let sp = 0; sp < 8; sp++) {
      const sa = (sp / 8) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(vx + 40 + Math.cos(sa) * 14, vy + 40 + Math.sin(sa) * 14);
      ctx.lineTo(vx + 40 + Math.cos(sa) * 28, vy + 40 + Math.sin(sa) * 28);
      ctx.strokeStyle = '#FFDD44'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.fillStyle = '#FFDD44'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
    ctx.shadowColor = AMBER; ctx.shadowBlur = 8;
    ctx.fillText('VAULT', vx + 40, vy + 76); ctx.shadowBlur = 0;
    // ATMs row
    for (let ai = 0; ai < 4; ai++) {
      const ax2 = cx - W * 0.44 + ai * 44;
      ctx.fillStyle = '#080812'; ctx.strokeStyle = '#4444AA'; ctx.lineWidth = 1.5;
      rr(ax2, midY - 10, 38, 60, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#001022'; ctx.fillRect(ax2 + 4, midY - 4, 30, 20);
      ctx.fillStyle = '#FFCC44'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
      ctx.fillText('ATM', ax2 + 19, midY + 8);
      ctx.fillStyle = '#00FF88'; ctx.font = '4px monospace';
      ctx.fillText('$ CASH', ax2 + 19, midY + 18);
      ctx.fillStyle = '#336699'; ctx.fillRect(ax2 + 12, midY + 22, 14, 4);
    }
    // Waiting chairs
    for (let ci = 0; ci < 5; ci++) {
      ctx.fillStyle = '#0c0c1c'; ctx.strokeStyle = '#3333AA'; ctx.lineWidth = 0.8;
      rr(cx - W * 0.36 + ci * 52, midY + 60, 40, 30, 4); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#6688CC'; ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center';
    ctx.fillText('WAITING AREA', cx - W * 0.04, midY + 100);
    // Security camera markers
    for (const [scx, scy] of [[cx-W*0.44,topY+4],[cx+W*0.40,topY+4],[cx,topY+4]]) {
      ctx.fillStyle = '#CC2222'; ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(scx, scy, 4, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    }
    drawMetroHuman(cx - W * 0.28, topY + 120, '#0a1a4a', '#C8956A', '#1a0a00'); // teller
    drawMetroHuman(cx + W * 0.04, topY + 120, '#0a1a4a', '#FFDAB0', '#4a3020'); // teller
    drawMetroHuman(cx - W * 0.44 + 19, midY + 88, '#1a1a3a', '#E0A878', '#1a0a00'); // customer

  } else if (type === 8) {
    // ═══ NIGHTCLUB: METRO NIGHTCLUB ═══
    drawMetroFloor('#0e0010', '#100014');
    drawMetroSign('METRO NIGHTCLUB');
    // DJ booth + stage back wall
    ctx.fillStyle = '#16002a'; ctx.strokeStyle = '#CC00FF'; ctx.lineWidth = 2;
    ctx.shadowColor = '#CC00FF'; ctx.shadowBlur = 14;
    rr(cx - W * 0.24, topY + 6, W * 0.48, 50, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#FF00FF'; ctx.font = 'bold 11px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.shadowColor = '#FF00FF'; ctx.shadowBlur = 12;
    ctx.fillText('DJ BOOTH', cx, topY + 24); ctx.shadowBlur = 0;
    // Mixing board on DJ booth
    ctx.fillStyle = '#0c0018'; ctx.strokeStyle = '#8833DD'; ctx.lineWidth = 1;
    rr(cx - W * 0.20, topY + 30, W * 0.40, 20, 3); ctx.fill(); ctx.stroke();
    for (let fi = 0; fi < 12; fi++) {
      const fx2 = cx - W * 0.18 + fi * W * 0.03;
      ctx.fillStyle = '#3a1a5a'; ctx.fillRect(fx2, topY + 32, 6, 14);
      ctx.fillStyle = '#CC88FF'; ctx.fillRect(fx2 - 1, topY + 34 + (fi % 6) * 2, 8, 4);
    }
    // Spot lights
    const spotC = ['#FF0088','#00FFCC','#8800FF','#FF4400'];
    for (let si = 0; si < 4; si++) {
      const sx2 = cx - W * 0.40 + si * W * 0.27;
      ctx.fillStyle = spotC[si]; ctx.globalAlpha = 0.12 + 0.08 * Math.sin(t*2.5+si);
      ctx.beginPath(); ctx.moveTo(sx2, topY + 56); ctx.lineTo(sx2 - 40, H * 0.85); ctx.lineTo(sx2 + 40, H * 0.85); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = spotC[si]; ctx.shadowColor = spotC[si]; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(sx2, topY + 56, 6, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    }
    // Dance floor large with animated tiles
    const dfX = cx - W * 0.28, dfY = midY - 60, dfW = W * 0.56, dfH = 90, dfN = 7;
    const dCols = ['#FF0088','#8800FF','#00FFCC','#FF4400','#0044FF','#FFCC00','#FF44AA'];
    for (let dy2 = 0; dy2 < dfN; dy2++) for (let dx2 = 0; dx2 < dfN; dx2++) {
      ctx.fillStyle = dCols[(dx2 + dy2 + Math.floor(t * 4)) % dfN] + '3a';
      ctx.fillRect(dfX + dx2 * (dfW/dfN), dfY + dy2 * (dfH/dfN), dfW/dfN - 1, dfH/dfN - 1);
    }
    ctx.strokeStyle = 'rgba(255,0,200,0.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(dfX, dfY, dfW, dfH);
    ctx.fillStyle = 'rgba(255,0,255,0.15)'; ctx.fillRect(dfX, dfY, dfW, dfH);
    // Bar counter left
    ctx.fillStyle = '#1a0028'; ctx.strokeStyle = '#8800FF'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.44, topY + 60, 68, H * 0.40, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FF44FF'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('BAR', cx - W * 0.44 + 34, topY + 72);
    // Bottles on bar
    const bC2 = ['#FF0055','#8800FF','#FF4400','#0044FF','#FFCC00','#00CCFF'];
    for (let bi = 0; bi < 6; bi++) {
      ctx.fillStyle = bC2[bi]; ctx.globalAlpha = 0.85;
      rr(cx - W * 0.44 + 4 + bi * 10, topY + 76, 8, 20, 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    // Bar stools
    for (let si = 0; si < 3; si++) {
      const sy2 = topY + 90 + si * 50;
      ctx.fillStyle = '#2a003a'; ctx.strokeStyle = '#CC00FF'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx - W * 0.46, sy2, 10, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    }
    // 3 VIP booths right
    for (let vi = 0; vi < 3; vi++) {
      const vy2 = topY + 64 + vi * 72;
      ctx.fillStyle = '#16001c'; ctx.strokeStyle = '#8800FF'; ctx.lineWidth = 1;
      rr(cx + W * 0.28, vy2, 80, 60, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2a0038'; rr(cx + W * 0.28 + 6, vy2 + 6, 68, 42, 4); ctx.fill();
      ctx.fillStyle = '#FF44FF'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('VIP', cx + W * 0.28 + 40, vy2 + 30);
      // table in booth
      ctx.fillStyle = '#220033'; ctx.strokeStyle = '#AA44FF'; ctx.lineWidth = 0.8;
      rr(cx + W * 0.28 + 22, vy2 + 36, 36, 22, 3); ctx.fill(); ctx.stroke();
    }
    // Laser beams (decorative)
    for (let li = 0; li < 3; li++) {
      const lc = ['rgba(255,0,136,0.25)','rgba(0,255,204,0.2)','rgba(136,0,255,0.22)'][li];
      ctx.strokeStyle = lc; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, topY + 56); ctx.lineTo(cx - W*0.30 + li * W*0.30, midY + 30); ctx.stroke();
    }
    // Mirror ball center ceiling
    ctx.fillStyle = '#FFFFFF'; ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 20*(0.5+0.5*Math.sin(t*3));
    ctx.beginPath(); ctx.arc(cx, topY + 56, 8, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    drawMetroHuman(cx, topY + 80, '#2a0a3a', '#C8956A', '#1a0a00');           // DJ
    drawMetroHuman(cx - W * 0.44 + 34, midY - 10, '#1a0028', '#FFDAB0', '#4a3020'); // bartender
    drawMetroHuman(cx - W * 0.08, midY + 30, '#16002a', '#E0A878', '#1a1a1a'); // dancer

  } else if (type === 9) {
    // ═══ HOSPITAL: METRO MEDICAL CENTER ═══
    drawMetroFloor('#040e06', '#040c04');
    drawMetroSign('METRO MEDICAL CENTER');
    // Red cross back wall
    ctx.fillStyle = '#FF2222'; ctx.shadowColor = '#FF4444'; ctx.shadowBlur = 14*(0.6+0.4*Math.sin(t*1.5));
    ctx.fillRect(cx - 6, topY + 6, 12, 36); ctx.fillRect(cx - 18, topY + 18, 36, 12); ctx.shadowBlur = 0;
    // Nurses station / reception desk
    ctx.fillStyle = '#061408'; ctx.strokeStyle = '#44CC44'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.26, topY + 48, W * 0.52, 28, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#22CC44'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('NURSES STATION', cx, topY + 62);
    ctx.fillStyle = '#001800'; ctx.fillRect(cx - 40, topY + 50, 80, 18);
    ctx.fillStyle = '#00FF88'; ctx.font = '5px monospace';
    ctx.fillText('PATIENT RECORDS', cx, topY + 63);
    // 4 hospital beds
    const bedPos = [[cx-W*0.42,midY-70],[cx-W*0.14,midY-70],[cx-W*0.42,midY+20],[cx-W*0.14,midY+20]];
    for (const [bx, by] of bedPos) {
      ctx.fillStyle = '#0a1e0e'; ctx.strokeStyle = '#44AA66'; ctx.lineWidth = 1.5;
      rr(bx, by, 100, 54, 6); ctx.fill(); ctx.stroke();
      // mattress
      ctx.fillStyle = '#0f2a14'; rr(bx + 4, by + 4, 76, 42, 4); ctx.fill();
      // pillow
      ctx.fillStyle = '#E8F4E8'; rr(bx + 74, by + 6, 20, 16, 3); ctx.fill();
      // sheet
      ctx.fillStyle = '#C8E0D0'; ctx.fillRect(bx + 4, by + 38, 76, 6);
      // patient lump (body under sheet)
      ctx.fillStyle = '#0c2010'; ctx.fillRect(bx + 10, by + 16, 60, 18);
      // IV stand indicator
      ctx.strokeStyle = '#44CC44'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx + 96, by + 4); ctx.lineTo(bx + 96, by + 50); ctx.stroke();
      ctx.fillStyle = '#00FF66'; ctx.shadowColor = '#00FF66'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(bx + 96, by + 4, 4, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
      // heart monitor
      ctx.fillStyle = '#22FF44'; ctx.shadowColor = '#22FF44'; ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.arc(bx + 108, by + 20, 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
    // Medicine cabinet left wall
    ctx.fillStyle = '#040e06'; ctx.strokeStyle = '#44CC44'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.44, topY + 82, 52, 130, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#22CC44'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('MEDICINE', cx - W * 0.44 + 26, topY + 92);
    const medC = ['#FF5566','#5577FF','#44FFCC','#FFCC44','#FF88FF','#44FF99'];
    for (let mi2 = 0; mi2 < 12; mi2++) {
      ctx.fillStyle = medC[mi2 % medC.length]; ctx.globalAlpha = 0.85;
      rr(cx - W * 0.44 + 3 + (mi2 % 4) * 12, topY + 98 + Math.floor(mi2/4) * 22, 10, 16, 2);
      ctx.fill(); ctx.globalAlpha = 1;
    }
    // X-ray lightbox right wall
    ctx.fillStyle = '#060f08'; ctx.strokeStyle = '#44CCAA'; ctx.lineWidth = 1.5;
    rr(cx + W * 0.28, topY + 48, 80, 100, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(180,220,200,0.08)'; ctx.fillRect(cx + W * 0.28 + 4, topY + 52, 72, 72);
    ctx.fillStyle = '#44CCAA'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('X-RAY VIEW', cx + W * 0.28 + 40, topY + 66);
    ctx.strokeStyle = 'rgba(200,240,220,0.2)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.ellipse(cx + W * 0.28 + 40, topY + 96, 20, 30, 0, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx + W * 0.28 + 40, topY + 76, 10, 8, 0, 0, Math.PI*2); ctx.stroke();
    // Defibrillator
    ctx.fillStyle = '#061408'; ctx.strokeStyle = '#FF4444'; ctx.lineWidth = 1.5;
    rr(cx + W * 0.28, midY + 50, 48, 44, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FF4444'; ctx.shadowColor = '#FF2222'; ctx.shadowBlur = 6;
    ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center';
    ctx.fillText('AED', cx + W * 0.28 + 24, midY + 74); ctx.shadowBlur = 0;
    // Wheelchair
    ctx.fillStyle = '#080e0a'; ctx.strokeStyle = '#33AA55'; ctx.lineWidth = 1;
    rr(cx + W * 0.10, midY + 55, 36, 44, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#44CC66'; ctx.font = '5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('♿', cx + W * 0.10 + 18, midY + 78);
    drawMetroHuman(cx + W * 0.24, topY + 82, '#9ab8bc', '#FFDAB0', '#1a0a00'); // doctor
    drawMetroHuman(cx, topY + 82, '#a8c8cc', '#C8956A', '#4a3020');             // nurse
    drawMetroHuman(cx - W * 0.42, midY + 90, '#2a4a2a', '#E0A878', '#4a3020'); // orderly

  } else if (type === 10) {
    // ═══ GARAGE: METRO AUTO GARAGE ═══
    drawMetroFloor('#0a0a08', '#0c0c0a');
    drawMetroSign('METRO AUTO GARAGE');
    // Garage sign + warning stripes
    ctx.fillStyle = '#FFAA22'; ctx.globalAlpha = 0.12;
    for (let si = 0; si < 12; si++) ctx.fillRect(si * 90 - 30, 0, 45, H);
    ctx.globalAlpha = 1;
    // 2 cars on hydraulic lifts
    for (const [cx3, lift] of [[cx - W * 0.22, true],[cx + W * 0.14, false]]) {
      // lift pillars
      if (lift) {
        ctx.strokeStyle = '#884400'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx3 - 50, midY + 30); ctx.lineTo(cx3 - 50, midY + 80); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx3 + 50, midY + 30); ctx.lineTo(cx3 + 50, midY + 80); ctx.stroke();
        ctx.strokeStyle = '#FFAA22'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx3 - 52, midY + 30); ctx.lineTo(cx3 + 52, midY + 30); ctx.stroke();
      }
      // car body
      ctx.fillStyle = lift ? '#1e1a10' : '#181418'; ctx.strokeStyle = lift ? '#FFAA22' : '#885522'; ctx.lineWidth = 2;
      rr(cx3 - 54, midY - 32, 108, 56, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = lift ? '#2a2010' : '#221420'; ctx.strokeStyle = '#6a5020'; ctx.lineWidth = 1;
      rr(cx3 - 46, midY - 26, 86, 38, 8); ctx.fill(); ctx.stroke();
      // windshield
      ctx.fillStyle = 'rgba(100,180,220,0.2)'; rr(cx3 - 20, midY - 24, 40, 18, 3); ctx.fill();
      // wheels
      for (const [wx2, wy2] of [[cx3 - 32, midY + 26],[cx3 + 32, midY + 26]]) {
        ctx.fillStyle = '#1a1a14'; ctx.beginPath(); ctx.arc(wx2, wy2, 13, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(wx2, wy2, 6, 0, Math.PI*2); ctx.stroke();
      }
    }
    // Large tool cabinet
    ctx.fillStyle = '#14120a'; ctx.strokeStyle = '#AA6622'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.44, topY + 8, 66, 100, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFAA22'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('TOOL CHEST', cx - W * 0.44 + 33, topY + 18);
    for (let di = 0; di < 6; di++) {
      ctx.strokeStyle = '#664411'; ctx.lineWidth = 0.5;
      ctx.strokeRect(cx - W * 0.44 + 4, topY + 22 + di * 13, 58, 11);
      ctx.fillStyle = '#FFAA22'; ctx.fillRect(cx - W * 0.44 + 28, topY + 26 + di * 13, 10, 2);
    }
    // Tool pegboard
    ctx.fillStyle = '#121008'; ctx.strokeStyle = '#664411'; ctx.lineWidth = 1;
    rr(cx - W * 0.44, topY + 114, 66, 80, 2); ctx.fill(); ctx.stroke();
    ctx.font = '11px serif'; ctx.textAlign = 'center';
    for (const [ti, tx2, ty3] of [['🔧',cx-W*0.44+11,topY+132],['🔩',cx-W*0.44+33,topY+132],['🪛',cx-W*0.44+55,topY+132],['🔨',cx-W*0.44+11,topY+158],['⚙',cx-W*0.44+33,topY+158],['🔦',cx-W*0.44+55,topY+158]])
      ctx.fillText(ti, tx2, ty3);
    // Oil drums + coolant cans right
    for (let oi = 0; oi < 5; oi++) {
      const ox2 = cx + W * 0.28 + (oi % 3) * 22, oy2 = topY + 10 + Math.floor(oi/3) * 32;
      ctx.fillStyle = '#1a1408'; ctx.strokeStyle = oi < 3 ? '#FF6600' : '#4488FF'; ctx.lineWidth = 1;
      rr(ox2, oy2, 18, 28, 3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#884400'; ctx.lineWidth = 2; ctx.strokeRect(ox2, oy2 + 10, 18, 2);
      ctx.fillStyle = oi < 3 ? '#FF8800' : '#6699FF'; ctx.font = '4px monospace'; ctx.textAlign = 'center';
      ctx.fillText(oi < 3 ? 'OIL' : 'H2O', ox2 + 9, oy2 + 24);
    }
    // Tire stack
    for (let ti = 0; ti < 4; ti++) {
      ctx.strokeStyle = '#333'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(cx + W * 0.38, midY + 40 + ti * 4, 16, 0, Math.PI*2); ctx.stroke();
    }
    // Workbench
    ctx.fillStyle = '#1a1408'; ctx.strokeStyle = '#886622'; ctx.lineWidth = 1.5;
    rr(cx + W * 0.14, midY + 50, 100, 36, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFAA22'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('WORKBENCH', cx + W * 0.14 + 50, midY + 72);
    // Exhaust vent on wall
    ctx.strokeStyle = '#666644'; ctx.lineWidth = 1;
    for (let vi = 0; vi < 6; vi++) ctx.strokeRect(cx + W * 0.42, topY + 20 + vi * 8, 14, 6);
    drawMetroHuman(cx - W * 0.20, midY + 60, '#3a2a10', '#C8956A', '#1a0a00'); // mechanic
    drawMetroHuman(cx + W * 0.14 + 50, midY + 16, '#2a1a08', '#8B5E3C', '#2a1a00'); // mechanic2

  } else if (type === 11) {
    // ═══ BAR: THE AMBER BAR ═══
    drawMetroFloor('#0e0804', '#120a04');
    drawMetroSign('THE AMBER BAR');
    // Full back bar shelf with mirror panel
    ctx.fillStyle = 'rgba(255,180,80,0.04)';
    ctx.fillRect(cx - W * 0.44, topY + 8, W * 0.88, 64);
    ctx.strokeStyle = AMBER; ctx.lineWidth = 0.5;
    ctx.strokeRect(cx - W * 0.44, topY + 8, W * 0.88, 64);
    const bbX = cx - W * 0.44, bbY = topY + 14;
    ctx.fillStyle = '#1a1008'; ctx.strokeStyle = AMBER; ctx.lineWidth = 1.5;
    rr(bbX, bbY, W * 0.88, 24, 4); ctx.fill(); ctx.stroke();
    // 14 bottles on the shelf
    const btlC = ['#CC2200','#FF6600','#DDAA00','#662200','#FF8800','#AA4400','#FF4400','#884400','#CC6600','#FF3300','#BBAA00','#992200','#FF9900','#773300'];
    for (let bi = 0; bi < 14; bi++) {
      const bx2 = bbX + 10 + bi * (W * 0.88 - 20) / 13;
      ctx.fillStyle = btlC[bi]; ctx.globalAlpha = 0.92;
      rr(bx2 - 5, bbY + 2, 10, 18, 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = btlC[bi] + '88'; ctx.lineWidth = 0.5; ctx.stroke();
      ctx.fillStyle = '#FFEECC'; ctx.fillRect(bx2 - 3, bbY + 1, 6, 3);
    }
    // Second bottle shelf above
    ctx.fillStyle = '#1a1008'; ctx.strokeStyle = '#AA6622'; ctx.lineWidth = 1;
    rr(bbX, topY + 40, W * 0.88, 14, 2); ctx.fill(); ctx.stroke();
    for (let bi = 0; bi < 10; bi++) {
      const bx2 = bbX + 14 + bi * (W * 0.88 - 28) / 9;
      ctx.fillStyle = btlC[(bi + 5) % btlC.length]; ctx.globalAlpha = 0.8;
      rr(bx2 - 4, topY + 41, 8, 12, 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    // Long bar counter
    ctx.fillStyle = '#2a1a08'; ctx.strokeStyle = AMBER; ctx.lineWidth = 2;
    rr(cx - W * 0.44, topY + 78, W * 0.88, 22, 4); ctx.fill(); ctx.stroke();
    // Bar top surface
    ctx.fillStyle = '#3a2510'; ctx.fillRect(cx - W * 0.44 + 2, topY + 80, W * 0.88 - 4, 16);
    // Beer taps
    for (let bi = 0; bi < 4; bi++) {
      const bx2 = cx - W * 0.20 + bi * W * 0.14;
      ctx.strokeStyle = '#FFCC44'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(bx2, topY + 78); ctx.lineTo(bx2, topY + 68); ctx.stroke();
      ctx.fillStyle = '#FFAA22'; ctx.beginPath(); ctx.arc(bx2, topY + 66, 4, 0, Math.PI*2); ctx.fill();
    }
    // 7 Bar stools
    for (let si = 0; si < 7; si++) {
      const sx2 = cx - W * 0.36 + si * W * 0.11, sy2 = topY + 110;
      ctx.fillStyle = '#2a1808'; ctx.strokeStyle = '#8a5020'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(sx2, sy2, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#6a3810'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx2, sy2 + 10); ctx.lineTo(sx2, sy2 + 26); ctx.stroke();
    }
    // Booths with benches on left
    for (let bi = 0; bi < 2; bi++) {
      const by2 = midY + 10 + bi * 80;
      ctx.fillStyle = '#1a1008'; ctx.strokeStyle = '#6a3810'; ctx.lineWidth = 1.5;
      rr(cx - W * 0.44, by2, 80, 64, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2a1808'; rr(cx - W * 0.44 + 4, by2 + 4, 72, 24, 4); ctx.fill();
      // booth table
      ctx.fillStyle = '#3a2010'; ctx.strokeStyle = AMBER; ctx.lineWidth = 0.8;
      rr(cx - W * 0.44 + 14, by2 + 30, 52, 22, 3); ctx.fill(); ctx.stroke();
      ctx.font = '8px serif'; ctx.textAlign = 'center';
      ctx.fillText('🍺', cx - W * 0.44 + 26, by2 + 46);
      ctx.fillText('🍺', cx - W * 0.44 + 54, by2 + 46);
    }
    // Pool table
    ctx.fillStyle = '#0a1808'; ctx.strokeStyle = '#226622'; ctx.lineWidth = 2;
    rr(cx + W * 0.08, midY + 10, W * 0.38, H * 0.16, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#0f2a10'; ctx.fillRect(cx + W * 0.12, midY + 16, W * 0.30, H * 0.12);
    // pocket circles
    for (const [px2, py2] of [[cx+W*0.12,midY+16],[cx+W*0.42,midY+16],[cx+W*0.27,midY+16],[cx+W*0.12,midY+16+H*0.12],[cx+W*0.42,midY+16+H*0.12],[cx+W*0.27,midY+16+H*0.12]])
      { ctx.fillStyle = '#050e06'; ctx.beginPath(); ctx.arc(px2, py2, 5, 0, Math.PI*2); ctx.fill(); }
    const bClrs = ['#FFFF00','#FF0000','#0000FF','#FF6600','#880088','#006600','#FF0000','#000000'];
    for (let bi = 0; bi < 8; bi++) {
      const ba = (bi / 8) * Math.PI * 2;
      ctx.fillStyle = bClrs[bi];
      ctx.beginPath(); ctx.arc(cx + W * 0.27 + Math.cos(ba) * 20, midY + 16 + H * 0.06 + Math.sin(ba) * 12, 5, 0, Math.PI * 2); ctx.fill();
    }
    // Jukebox right corner
    ctx.fillStyle = '#1a0c04'; ctx.strokeStyle = '#FFAA22'; ctx.lineWidth = 1.5;
    ctx.shadowColor = AMBER; ctx.shadowBlur = 8;
    rr(cx + W * 0.30, topY + 78, 48, 72, 6); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a0602'; ctx.fillRect(cx + W * 0.30 + 6, topY + 86, 36, 30);
    for (let jc = 0; jc < 3; jc++) {
      ctx.fillStyle = ['#FF4400','#FFCC00','#FF0088'][jc]; ctx.globalAlpha = 0.7;
      ctx.fillRect(cx + W * 0.30 + 6, topY + 86 + jc * 10, 36, 9); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = GOLD; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('JUKEBOX', cx + W * 0.30 + 24, topY + 136);
    drawMetroHuman(cx, topY + 108, '#3a2010', '#E0A878', '#1a0a00');          // bartender
    drawMetroHuman(cx - W * 0.36, midY + 40, '#2a1810', '#C8956A', '#4a2010'); // customer
    drawMetroHuman(cx + W * 0.08 + W*0.19, midY + 90, '#1a1008', '#FFDAB0', '#3a2010'); // pool player

  } else if (type === 12) {
    // ═══ PAWNSHOP: CITY PAWN & TRADE ═══
    drawMetroFloor('#0e0e06', '#121006');
    drawMetroSign('CITY PAWN & TRADE');
    // 5 glass display cases
    const casePos = [[cx-W*0.42,topY+8],[cx-W*0.20,topY+8],[cx+W*0.02,topY+8],[cx-W*0.42,topY+78],[cx-W*0.20,topY+78]];
    const caseItems = [['💍','⌚','📿','🪙'],['💎','🏅','🔮','👑'],['🔫','🗡️','📻','🎸'],['🥊','🪖','🎯','🔑'],['📱','💻','🎮','📡']];
    const caseLabels = ['JEWELRY','VALUABLES','WEAPONS','COLLECTIBLES','ELECTRONICS'];
    for (let ci = 0; ci < 5; ci++) {
      const [cx3, cy3] = casePos[ci];
      ctx.fillStyle = '#141410'; ctx.strokeStyle = '#AA9922'; ctx.lineWidth = 1.5;
      rr(cx3, cy3, W * 0.20, 62, 4); ctx.fill(); ctx.stroke();
      // glass tint
      ctx.fillStyle = 'rgba(200,200,150,0.07)'; ctx.fillRect(cx3 + 2, cy3 + 2, W * 0.20 - 4, 58);
      ctx.fillStyle = '#FFDD44'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
      ctx.fillText(caseLabels[ci], cx3 + W * 0.10, cy3 + 11);
      // price tags per item
      ctx.font = '10px serif';
      for (let ii = 0; ii < 4; ii++) {
        const ix2 = cx3 + W * 0.025 + (ii % 2) * W * 0.10, iy2 = cy3 + 26 + Math.floor(ii/2) * 22;
        ctx.fillText(caseItems[ci][ii], ix2, iy2);
      }
      ctx.fillStyle = '#CC9933'; ctx.font = 'bold 4px monospace';
      ctx.fillText('FOR SALE', cx3 + W * 0.10, cy3 + 58);
    }
    // Wall-mounted item rack right side
    ctx.fillStyle = '#101008'; ctx.strokeStyle = '#886622'; ctx.lineWidth = 1.5;
    rr(cx + W * 0.26, topY + 8, 68, H * 0.56, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFDD44'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('WALL DISPLAY', cx + W * 0.26 + 34, topY + 20);
    ctx.font = '12px serif';
    for (const [em, ex2, ey2] of [['🎸',cx+W*0.26+18,topY+44],['🥁',cx+W*0.26+52,topY+44],['🗡️',cx+W*0.26+18,topY+80],['🏹',cx+W*0.26+52,topY+80],['🔭',cx+W*0.26+18,topY+116],['📷',cx+W*0.26+52,topY+116],['🧨',cx+W*0.26+18,topY+152],['🎺',cx+W*0.26+52,topY+152]])
      ctx.fillText(em, ex2, ey2);
    // Counter / cash register
    ctx.fillStyle = '#1a1808'; ctx.strokeStyle = '#AA8822'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.42, midY + 40, W * 0.46, 36, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#000c00'; ctx.fillRect(cx - W * 0.38, midY + 44, 80, 20);
    ctx.fillStyle = '#00FF88'; ctx.font = '5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('$ 0.00', cx - W * 0.38 + 40, midY + 57);
    ctx.fillStyle = '#FFCC44'; ctx.font = 'bold 7px monospace';
    ctx.fillText('CASH REGISTER', cx - W * 0.38 + 40, midY + 68);
    // Appraisal scale
    ctx.fillStyle = '#141210'; ctx.strokeStyle = '#FFCC44'; ctx.lineWidth = 1;
    rr(cx - W * 0.14, midY + 42, 40, 32, 3); ctx.fill(); ctx.stroke();
    ctx.font = '10px serif'; ctx.textAlign = 'center';
    ctx.fillText('⚖️', cx - W * 0.14 + 20, midY + 62);
    // Barred window right wall
    ctx.strokeStyle = '#8a6020'; ctx.lineWidth = 2;
    for (let bi = 0; bi < 4; bi++) ctx.strokeRect(cx + W * 0.26 + 10 + bi * 15, midY + 40, 11, 44);
    ctx.strokeRect(cx + W * 0.26 + 8, midY + 38, 62, 48);
    ctx.fillStyle = AMBER; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('SECURE ROOM', cx + W * 0.26 + 39, midY + 96);
    drawMetroHuman(cx - W * 0.20, midY + 16, '#2a2818', '#C8956A', '#8a6040'); // pawnbroker
    drawMetroHuman(cx - W * 0.38, topY + 140, '#3a3020', '#FFDAB0', '#4a3020'); // appraiser

  } else if (type === 13) {
    // ═══ TECH LAB: APEX TECH LABS ═══
    drawMetroFloor('#020c10', '#020e12');
    drawMetroSign('APEX TECH LABS');
    // 6 server racks in two rows
    for (let si = 0; si < 6; si++) {
      const sx2 = cx - W * 0.42 + (si % 3) * W * 0.29, sy2 = topY + 8 + Math.floor(si/3) * 76;
      ctx.fillStyle = '#060e14'; ctx.strokeStyle = '#00CCFF'; ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00CCFF'; ctx.shadowBlur = 7 * (Math.sin(t * 1.5 + si * 0.5) * 0.3 + 0.7);
      rr(sx2, sy2, 50, 68, 3); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      // Rack label
      ctx.fillStyle = '#00CCFF'; ctx.font = 'bold 4px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`RACK-${si+1}`, sx2 + 25, sy2 + 10);
      for (let bi = 0; bi < 6; bi++) {
        const ledCol = bi % 3 === 0 ? '#00FF88' : (bi % 3 === 1 ? '#FF4444' : '#FFCC00');
        ctx.fillStyle = ledCol; ctx.shadowColor = ledCol; ctx.shadowBlur = 3;
        ctx.beginPath(); ctx.arc(sx2 + 8, sy2 + 16 + bi * 9, 2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#0a0f18'; ctx.fillRect(sx2 + 14, sy2 + 20 + bi * 9, 32, 5);
        ctx.strokeStyle = '#1a2a3a'; ctx.lineWidth = 0.5; ctx.stroke();
        // activity bars
        ctx.fillStyle = ledCol + '66'; ctx.fillRect(sx2 + 14, sy2 + 20 + bi * 9, (10 + (si*bi*7 % 20)), 5);
      }
    }
    // Triple monitor workstation
    ctx.fillStyle = '#040c14'; ctx.strokeStyle = '#0088CC'; ctx.lineWidth = 1.5;
    rr(cx - 90, midY + 10, 180, 42, 4); ctx.fill(); ctx.stroke();
    for (let mi2 = 0; mi2 < 3; mi2++) {
      const mx3 = cx - 80 + mi2 * 52, my3 = midY + 12;
      ctx.fillStyle = '#020a12'; ctx.strokeStyle = '#0066AA'; ctx.lineWidth = 1;
      rr(mx3, my3, 44, 28, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#001a2a'; ctx.fillRect(mx3 + 2, my3 + 2, 40, 20);
      ctx.fillStyle = '#00FFCC'; ctx.font = '4px monospace'; ctx.textAlign = 'center';
      const lines2 = [['> COMPILING','PROGRESS: 74%'],['> ANALYZING','DATA: 2.4TB'],['> DEPLOY','STATUS: OK']];
      ctx.fillText(lines2[mi2][0], mx3 + 22, my3 + 11);
      ctx.fillStyle = '#00AA88';
      ctx.fillText(lines2[mi2][1], mx3 + 22, my3 + 20);
    }
    // Electronics workbench
    ctx.fillStyle = '#040e14'; ctx.strokeStyle = '#0066AA'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.44, midY + 60, W * 0.36, 38, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#00CCFF'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('ELECTRONICS BENCH', cx - W * 0.26, midY + 72);
    ctx.font = '9px serif';
    for (const [em, ex2] of [['🔬',cx-W*0.40],['🧪',cx-W*0.30],['⚡',cx-W*0.20],['🔭',cx-W*0.10]])
      ctx.fillText(em, ex2, midY + 86);
    // 3D printer
    ctx.fillStyle = '#040e14'; ctx.strokeStyle = '#00FFCC'; ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00FFCC'; ctx.shadowBlur = 6;
    rr(cx + W * 0.20, midY + 10, 64, 72, 4); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#00FFCC'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('3D PRINTER', cx + W * 0.20 + 32, midY + 24);
    // print bed
    ctx.fillStyle = '#001a2a'; ctx.fillRect(cx + W * 0.20 + 6, midY + 30, 52, 36);
    ctx.fillStyle = '#00FFCC'; ctx.globalAlpha = 0.3; ctx.fillRect(cx + W * 0.20 + 14, midY + 36, 36, 24); ctx.globalAlpha = 1;
    // Oscilloscope
    ctx.fillStyle = '#040c14'; ctx.strokeStyle = '#00CCFF'; ctx.lineWidth = 1;
    rr(cx + W * 0.20, topY + 8 + 152, 58, 44, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#001a2a'; ctx.fillRect(cx + W * 0.20 + 4, topY + 162, 50, 28);
    ctx.strokeStyle = '#00FF88'; ctx.lineWidth = 1; ctx.beginPath();
    for (let xo = 0; xo < 50; xo++) { const yo = midY + (xo < 25 ? 0 : -8); if (xo === 0) ctx.moveTo(cx+W*0.20+4+xo, topY+162+14+Math.sin(xo*0.4)*6); else ctx.lineTo(cx+W*0.20+4+xo, topY+162+14+Math.sin(xo*0.4)*6); }
    ctx.stroke();
    drawMetroHuman(cx - W * 0.28, midY + 68, '#0a1a2a', '#FFDAB0', '#4a3020'); // engineer
    drawMetroHuman(cx + W * 0.04, midY + 68, '#082032', '#C8956A', '#1a0a00');  // scientist
    drawMetroHuman(cx + W * 0.20 + 32, topY + 230, '#0a1828', '#E0A878', '#3a2010'); // tech

  } else if (type === 14) {
    // ═══ WAREHOUSE: CITY WAREHOUSE ═══
    drawMetroFloor('#0a0a08', '#0c0c0a');
    drawMetroSign('CITY WAREHOUSE');
    // Caution stripe floor at loading dock
    for (let si = 0; si < 8; si++) {
      ctx.fillStyle = si % 2 === 0 ? 'rgba(255,170,34,0.12)' : 'rgba(0,0,0,0)';
      ctx.fillRect(cx + W * 0.10 + si * 22, midY - 40, 22, 80);
    }
    ctx.strokeStyle = '#FFAA22'; ctx.lineWidth = 1.5;
    ctx.strokeRect(cx + W * 0.10, midY - 40, W * 0.32, 80);
    ctx.fillStyle = '#FFAA22'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('LOADING DOCK', cx + W * 0.26, midY + 6);
    // 5 tall shelving units
    for (let si = 0; si < 5; si++) {
      const sx2 = cx - W * 0.44 + si * W * 0.17;
      ctx.fillStyle = '#141412'; ctx.strokeStyle = '#665522'; ctx.lineWidth = 1;
      rr(sx2, topY + 8, W * 0.14, H * 0.54, 2); ctx.fill(); ctx.stroke();
      // shelf dividers
      for (let bi = 0; bi < 5; bi++) {
        ctx.strokeStyle = '#4a3a14'; ctx.lineWidth = 0.5;
        ctx.strokeRect(sx2 + 2, topY + 10 + bi * (H * 0.10), W * 0.14 - 4, H * 0.09);
        // boxes on shelf
        const boxC = ['#6b4d22','#7a5828','#5a3e1a','#8a6030','#9a7040'][bi % 5];
        ctx.fillStyle = boxC; ctx.globalAlpha = 0.85;
        rr(sx2 + 3, topY + 13 + bi * (H * 0.10), W * 0.11, H * 0.065, 2); ctx.fill();
        ctx.globalAlpha = 1;
        // label on box
        ctx.fillStyle = '#FFDD44'; ctx.font = '4px monospace'; ctx.textAlign = 'center';
        const boxLabels = ['BOX','FRAG','CRATE','PKG','PALLET'];
        ctx.fillText(boxLabels[bi], sx2 + W * 0.07, topY + 24 + bi * (H * 0.10));
      }
    }
    // Forklift
    ctx.fillStyle = '#1a1808'; ctx.strokeStyle = '#FFAA22'; ctx.lineWidth = 1.5;
    rr(cx + W * 0.10 - 24, midY + 50, 46, 32, 3); ctx.fill(); ctx.stroke();
    // forklift forks
    ctx.strokeStyle = '#CC8822'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx + W * 0.10 + 22, midY + 58); ctx.lineTo(cx + W * 0.10 + 48, midY + 58); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + W * 0.10 + 22, midY + 68); ctx.lineTo(cx + W * 0.10 + 48, midY + 68); ctx.stroke();
    ctx.fillStyle = '#FFAA22'; ctx.font = '5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('FORKLIFT', cx + W * 0.10 - 1, midY + 72);
    // Pallet stacks
    for (let pi = 0; pi < 3; pi++) {
      const px2 = cx + W * 0.28 + pi * 28, py2 = midY + 50;
      ctx.fillStyle = '#3a2a10'; ctx.strokeStyle = '#6a4a1a'; ctx.lineWidth = 1;
      rr(px2, py2, 24, 8, 1); ctx.fill(); ctx.stroke();
      for (let li = 0; li < 3; li++) {
        ctx.strokeStyle = '#4a3a14'; ctx.lineWidth = 0.4;
        ctx.strokeRect(px2 + 2 + li * 6, py2, 4, 8);
      }
      // boxes on pallet
      ctx.fillStyle = '#7a5828'; ctx.globalAlpha = 0.85;
      rr(px2 + 2, py2 - 16, 20, 14, 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    // Inventory computer desk
    ctx.fillStyle = '#141410'; ctx.strokeStyle = '#885522'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.44, midY + 60, 70, 40, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#001200'; ctx.fillRect(cx - W * 0.44 + 6, midY + 64, 58, 22);
    ctx.fillStyle = '#00FF88'; ctx.font = '4px monospace'; ctx.textAlign = 'center';
    ctx.fillText('INVENTORY MGMT', cx - W * 0.44 + 35, midY + 72);
    ctx.fillText('STOCK: 4,821 UNITS', cx - W * 0.44 + 35, midY + 80);
    // Safety signs on wall
    for (const [lx, ly, lc, lt] of [[cx+W*0.42,topY+20,'#FFAA22','⚠'],[cx+W*0.42,topY+56,'#FF4444','🚫'],[cx+W*0.42,topY+92,'#22CC44','✓']]) {
      ctx.fillStyle = lc; ctx.shadowColor = lc; ctx.shadowBlur = 5;
      ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.fillText(lt, lx, ly); ctx.shadowBlur = 0;
    }
    // Workers with hi-vis vests
    drawMetroHuman(cx + W * 0.22, midY + 22, '#3a4a10', '#8B5E3C', '#1a0a00');
    ctx.save(); ctx.translate(cx + W * 0.22, midY + 22);
    ctx.strokeStyle = '#FFAA22'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(8, -8); ctx.stroke();
    ctx.restore();
    drawMetroHuman(cx - W * 0.44 + 35, midY + 26, '#2a3a08', '#C8956A', '#2a1800');
    ctx.save(); ctx.translate(cx - W * 0.44 + 35, midY + 26);
    ctx.strokeStyle = '#FFAA22'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(8, -8); ctx.stroke();
    ctx.restore();

  } else if (type === 15) {
    // ═══ POLICE STATION: METRO POLICE DEPT ═══
    drawMetroFloor('#040814', '#040a18');
    drawMetroSign('METRO POLICE DEPT');
    // American flag / police banner
    ctx.fillStyle = '#0a0d22'; ctx.strokeStyle = '#3366CC'; ctx.lineWidth = 1.5;
    rr(cx - 60, topY + 4, 120, 32, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2244AA'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('METRO POLICE DEPT', cx, topY + 22);
    // Large evidence / case board
    ctx.fillStyle = '#060c18'; ctx.strokeStyle = '#3366CC'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.30, topY + 42, W * 0.60, 100, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#EEEEFF'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('EVIDENCE BOARD', cx, topY + 55);
    // Evidence photos + pins + string connections
    const pinC = ['#FF4444','#FFFF00','#FF8800','#FF44AA','#44FFCC'];
    const pinPos = [];
    for (let pi = 0; pi < 8; pi++) {
      const px2 = cx - W * 0.24 + (pi % 4) * W * 0.15, py2 = topY + 68 + Math.floor(pi/4) * 36;
      pinPos.push([px2, py2]);
      // photo rect
      ctx.fillStyle = '#0a1428'; ctx.strokeStyle = '#334466'; ctx.lineWidth = 0.5;
      rr(px2 - 10, py2 - 8, 20, 14, 1); ctx.fill(); ctx.stroke();
      // pin
      ctx.fillStyle = pinC[pi % pinC.length]; ctx.beginPath(); ctx.arc(px2, py2, 3, 0, Math.PI * 2); ctx.fill();
    }
    // String connections between some pins
    ctx.strokeStyle = '#FF444488'; ctx.lineWidth = 0.6;
    for (const [[ax2,ay2],[bx2,by2]] of [[pinPos[0],pinPos[2]],[pinPos[2],pinPos[5]],[pinPos[1],pinPos[4]],[pinPos[3],pinPos[6]]]) {
      ctx.beginPath(); ctx.moveTo(ax2, ay2); ctx.lineTo(bx2, by2); ctx.stroke();
    }
    // 4 officer desks
    for (const [dx2, dy2] of [[cx-W*0.38,midY+10],[cx-W*0.14,midY+10],[cx+W*0.10,midY+10],[cx-W*0.38,midY+80]]) {
      ctx.fillStyle = '#080c1a'; ctx.strokeStyle = '#2255AA'; ctx.lineWidth = 1;
      rr(dx2 - 30, dy2, 60, 40, 3); ctx.fill(); ctx.stroke();
      // desktop computer
      ctx.fillStyle = '#0a1428'; ctx.fillRect(dx2 - 20, dy2 + 4, 40, 24);
      ctx.fillStyle = '#4488FF'; ctx.font = '4px monospace'; ctx.textAlign = 'center';
      ctx.fillText('CRIME DB', dx2, dy2 + 14);
      ctx.fillText('+DATABASE', dx2, dy2 + 22);
      // nameplate
      ctx.fillStyle = '#FFCC44'; ctx.fillRect(dx2 - 14, dy2 + 32, 28, 5);
    }
    // Holding cell right side
    ctx.fillStyle = '#040810'; ctx.strokeStyle = '#4466AA'; ctx.lineWidth = 2;
    rr(cx + W * 0.26, topY + 42, 76, 140, 3); ctx.fill(); ctx.stroke();
    // bars
    ctx.strokeStyle = '#556688'; ctx.lineWidth = 2;
    for (let bi = 0; bi < 5; bi++) {
      ctx.beginPath(); ctx.moveTo(cx + W * 0.26 + 8 + bi * 12, topY + 44); ctx.lineTo(cx + W * 0.26 + 8 + bi * 12, topY + 44 + 136); ctx.stroke();
    }
    // horizontal bar dividers
    for (let hi = 0; hi < 3; hi++) ctx.strokeRect(cx + W * 0.26, topY + 42 + hi * 46, 76, 46);
    ctx.fillStyle = '#AABBCC'; ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center';
    ctx.fillText('HOLDING', cx + W * 0.26 + 38, topY + 52);
    // Gun rack left wall
    ctx.fillStyle = '#060c18'; ctx.strokeStyle = '#3355AA'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.44, topY + 42, 44, 120, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6688CC'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('ARMORY', cx - W * 0.44 + 22, topY + 54);
    ctx.font = '11px serif';
    for (const [em, ey2] of [['🔫',topY+74],['🔫',topY+98],['🔫',topY+122],['🛡️',topY+146]])
      ctx.fillText(em, cx - W * 0.44 + 22, ey2);
    // Wanted board
    ctx.fillStyle = '#0a0818'; ctx.strokeStyle = '#CC2222'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.44, midY + 60, 44, 70, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FF4444'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('WANTED', cx - W * 0.44 + 22, midY + 72);
    for (let wi = 0; wi < 3; wi++) {
      ctx.fillStyle = '#0a0414'; ctx.fillRect(cx - W * 0.44 + 6, midY + 76 + wi * 16, 32, 12);
      ctx.fillStyle = '#FF8888'; ctx.font = '4px monospace';
      ctx.fillText(`SUSPECT ${wi+1}`, cx - W * 0.44 + 22, midY + 85 + wi * 16);
    }
    drawMetroHuman(cx - W * 0.14, midY + 54, '#0a1a3a', '#FFDAB0', '#1a0a00'); // officer
    drawMetroHuman(cx + W * 0.10, midY + 54, '#0a1a3a', '#C8956A', '#1a0a00'); // officer
    drawMetroHuman(cx - W * 0.38, midY + 54, '#0a1430', '#E0A878', '#4a3020'); // detective

  } else if (type === 16) {
    // ═══ TATTOO PARLOR: IRON NEEDLE ═══
    drawMetroFloor('#0e0008', '#100008');
    drawMetroSign('IRON NEEDLE TATTOO');
    // Flash art wall — 10 framed pieces
    const artD = ['☠','⚡','🔥','🌹','⚔','🐉','🦋','🗡','🦅','💀'];
    for (let ai = 0; ai < 10; ai++) {
      const ax2 = cx - W * 0.44 + (ai % 5) * W * 0.18, ay2 = topY + 8 + Math.floor(ai/5) * 52;
      ctx.fillStyle = '#0a0008'; ctx.strokeStyle = ai < 5 ? '#6622AA' : '#AA2266'; ctx.lineWidth = 1.5;
      rr(ax2, ay2, W * 0.16, 46, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(100,50,120,0.12)'; ctx.fillRect(ax2+2, ay2+2, W*0.16-4, 42);
      ctx.font = '18px serif'; ctx.textAlign = 'center';
      ctx.fillText(artD[ai], ax2 + W * 0.08, ay2 + 30);
      // price tag
      ctx.fillStyle = '#FF44CC'; ctx.font = 'bold 4px monospace';
      ctx.fillText(`$${(ai+1)*50}`, ax2 + W*0.08, ay2 + 43);
    }
    // 2 Tattoo chairs (reclinable)
    for (const [cx3, cy3] of [[cx - W * 0.18, midY + 10],[cx + W * 0.08, midY + 10]]) {
      ctx.fillStyle = '#1a0010'; ctx.strokeStyle = '#AA2288'; ctx.lineWidth = 2;
      rr(cx3 - 48, cy3 - 24, 96, 48, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2a0018'; ctx.fillRect(cx3 - 42, cy3 - 18, 84, 30);
      // pillow end
      ctx.fillStyle = '#3a0028'; rr(cx3 + 34, cy3 - 16, 20, 22, 4); ctx.fill();
      ctx.fillStyle = '#FF44CC'; ctx.font = '6px monospace'; ctx.textAlign = 'center';
      ctx.fillText('TATTOO CHAIR', cx3, cy3 + 6);
      // arm rest
      ctx.fillStyle = '#1a0014'; ctx.strokeStyle = '#882266'; ctx.lineWidth = 1;
      rr(cx3 - 52, cy3 - 10, 12, 18, 3); ctx.fill(); ctx.stroke();
    }
    // Ink station / tray table
    ctx.fillStyle = '#120008'; ctx.strokeStyle = '#882288'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.44, midY + 10, 50, 70, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FF44CC'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('INK STATION', cx - W * 0.44 + 25, midY + 22);
    const inkC = ['#FF0000','#0000FF','#000000','#FF00FF','#00FF00','#FFFF00','#FF6600','#00FFFF','#FFFFFF','#FF00AA'];
    for (let ii = 0; ii < 10; ii++) {
      const ix2 = cx - W * 0.44 + 4 + (ii % 5) * 9, iy2 = midY + 26 + Math.floor(ii/5) * 24;
      ctx.fillStyle = inkC[ii]; ctx.globalAlpha = 0.88;
      rr(ix2, iy2, 7, 18, 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = inkC[ii] + '88'; ctx.lineWidth = 0.4; ctx.stroke();
    }
    // Autoclave sterilizer
    ctx.fillStyle = '#100008'; ctx.strokeStyle = '#AA44AA'; ctx.lineWidth = 1.5;
    rr(cx + W * 0.30, midY + 10, 52, 46, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#DD88CC'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('STERILIZER', cx + W * 0.30 + 26, midY + 24);
    // green light
    ctx.fillStyle = '#22FF44'; ctx.shadowColor = '#22FF44'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(cx + W * 0.30 + 36, midY + 32, 4, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    // Mirrors on back wall
    for (const mx2 of [cx - W * 0.44, cx + W * 0.26]) {
      ctx.fillStyle = 'rgba(180,120,200,0.07)';
      rr(mx2, topY + 110, 48, 60, 2); ctx.fill();
      ctx.strokeStyle = '#884488'; ctx.lineWidth = 1; ctx.stroke();
    }
    drawMetroHuman(cx - W * 0.28, midY + 76, '#0a0a0a', '#8B5E3C', '#1a0a00'); // artist1
    drawMetroHuman(cx + W * 0.10, midY + 76, '#180010', '#C8956A', '#2a0010'); // artist2

  } else if (type === 17) {
    // ═══ AMMO DEPOT: METRO ARMORY ═══
    drawMetroFloor('#0e0e08', '#101008');
    drawMetroSign('METRO ARMORY');
    // Warning stripes on floor
    ctx.fillStyle = 'rgba(255,200,0,0.08)';
    for (let si = 0; si < 10; si++) if (si%2===0) ctx.fillRect(si * 108, 0, 54, H);
    // 4 rows of ammo crates
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 7; col++) {
        const ax2 = cx - W * 0.44 + col * W * 0.13, ay2 = topY + 8 + row * 30;
        ctx.fillStyle = '#4a3a16'; ctx.strokeStyle = '#8a6028'; ctx.lineWidth = 1;
        rr(ax2, ay2, W * 0.10, 26, 2); ctx.fill(); ctx.stroke();
        // Military crate marking
        ctx.fillStyle = '#FFD700'; ctx.fillRect(ax2, ay2, W * 0.10, 4);
        for (let ss = 0; ss < 3; ss += 2) { ctx.fillStyle = '#1a1a00'; ctx.fillRect(ax2 + ss * (W * 0.10/5), ay2, W * 0.02, 4); }
        ctx.fillStyle = '#CCAA22'; ctx.font = '4px monospace'; ctx.textAlign = 'center';
        const ammoTypes = ['5.56','9mm','12G','7.62','.50','RKT','GREN'];
        ctx.fillText(ammoTypes[col % ammoTypes.length], ax2 + W * 0.05, ay2 + 20);
        // stencil skull on some
        if (row === 0 || col === 0) { ctx.font = '8px serif'; ctx.fillText('☠', ax2 + W * 0.05, ay2 + 22); }
      }
    }
    // Large weapon display wall left
    ctx.fillStyle = '#0e0e08'; ctx.strokeStyle = '#886600'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.44, topY + 132, 74, 130, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFCC44'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('WEAPON RACK', cx - W * 0.44 + 37, topY + 144);
    // vertical slots
    for (let wi = 0; wi < 5; wi++) { ctx.fillStyle = '#4a4020'; ctx.fillRect(cx - W * 0.44 + 8 + wi * 12, topY + 148, 6, 98); }
    ctx.font = '11px serif';
    for (const [em, ex2, ey2] of [['🔫',cx-W*0.44+14,topY+182],['🔫',cx-W*0.44+26,topY+182],['🔫',cx-W*0.44+38,topY+182],['🔫',cx-W*0.44+50,topY+182],['🔫',cx-W*0.44+62,topY+182],['🏹',cx-W*0.44+14,topY+218],['🪃',cx-W*0.44+38,topY+218],['🗡️',cx-W*0.44+62,topY+218]])
      ctx.fillText(em, ex2, ey2);
    // Blast-proof counter / sales desk
    ctx.fillStyle = '#14140a'; ctx.strokeStyle = '#AA8800'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.10, midY + 20, W * 0.52, 36, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#000c00'; ctx.fillRect(cx - W * 0.06, midY + 24, 80, 22);
    ctx.fillStyle = '#00FF88'; ctx.font = '5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('INVENTORY SYSTEM', cx - W * 0.06 + 40, midY + 36);
    ctx.fillStyle = '#FFCC44'; ctx.font = 'bold 7px monospace';
    ctx.fillText('SALES COUNTER', cx + W * 0.20, midY + 50);
    // Grenade display case
    ctx.fillStyle = '#1a1a0a'; ctx.strokeStyle = '#CC9922'; ctx.lineWidth = 1.5;
    rr(cx + W * 0.26, topY + 132, 68, 80, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFCC44'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('GRENADES', cx + W * 0.26 + 34, topY + 144);
    ctx.font = '12px serif';
    for (let gi = 0; gi < 6; gi++) ctx.fillText('💣', cx + W * 0.26 + 12 + (gi%3)*22, topY + 164 + Math.floor(gi/3)*26);
    // Ballistic vests rack
    ctx.fillStyle = '#141410'; ctx.strokeStyle = '#886622'; ctx.lineWidth = 1;
    rr(cx + W * 0.26, midY + 20, 68, 70, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFAA44'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('BODY ARMOR', cx + W * 0.26 + 34, midY + 32);
    ctx.font = '12px serif';
    for (let vi = 0; vi < 4; vi++) ctx.fillText('🛡️', cx + W * 0.26 + 10 + (vi%2)*32, midY + 52 + Math.floor(vi/2)*22);
    drawMetroHuman(cx - W * 0.02, midY + 60, '#2a3a10', '#8B5E3C', '#2a2a2a'); // armorer
    drawMetroHuman(cx + W * 0.18, midY + 60, '#3a4a18', '#C8956A', '#1a0a00'); // guard
    drawMetroHuman(cx - W * 0.44 + 37, midY - 10, '#1a2a0a', '#E0A878', '#3a2000'); // stockman

  } else if (type === 18) {
    // ═══ HACKER DEN: DARKNET HQ ═══
    drawMetroFloor('#020a04', '#020c04');
    drawMetroSign('DARKNET HQ');
    // Scanline CRT ambient glow
    ctx.fillStyle = 'rgba(0,255,80,0.03)';
    for (let li = 0; li < H; li += 4) ctx.fillRect(0, li, W, 2);
    // 7 monitor setup — top row
    for (let mi2 = 0; mi2 < 7; mi2++) {
      const mx3 = cx - W * 0.44 + mi2 * W * 0.13, my3 = topY + 8;
      ctx.fillStyle = '#020808'; ctx.strokeStyle = '#00AA33'; ctx.lineWidth = 1;
      ctx.shadowColor = '#00FF66'; ctx.shadowBlur = 6 * (Math.sin(t * 2 + mi2 * 0.6) * 0.3 + 0.7);
      rr(mx3, my3, W * 0.11, 70, 2); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#001c08'; ctx.fillRect(mx3 + 3, my3 + 3, W * 0.11 - 6, 56);
      ctx.fillStyle = '#00FF66'; ctx.font = '4px monospace'; ctx.textAlign = 'left';
      const codeLines = [
        ['> INIT','PROBE..','BYPASS.','INJECT.','PAYLOAD','ROUTE..','DONE OK'],
        ['HELLO','01100011','SSH CONN','PKT CAP','EXFIL..','ENCRYPT','SECURE.'],
        ['> RUN','COMPILE','LINK OK','DEPLOY.','SERVER.','RESPOND','200 OK.'],
        ['> HACK','SCAN IP','VULNCHK','EXPLOIT','PRIVESC','SHELL..','ROOT OK'],
        ['DATA>>','STREAM.','DECODE.','ANALYZE','MATCH..','FLAG!..','REPORT.'],
        ['> MAIN','IMPORT.','PARSE..','RENDER.','OUTPUT.','FLUSH..','EXIT 0.'],
        ['> CMD','TUNNEL.','VPN ON.','TOR OK.','ONION..','ANON..','READY..'],
      ][mi2 % 7];
      for (let li = 0; li < 7; li++) {
        ctx.fillStyle = li === 6 ? '#00FFAA' : '#00CC66';
        ctx.fillText(codeLines[li], mx3 + 4, my3 + 10 + li * 8);
      }
    }
    // L-shaped main workstation desk
    ctx.fillStyle = '#040c08'; ctx.strokeStyle = '#00CC44'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.44, midY - 14, W * 0.74, 30, 4); ctx.fill(); ctx.stroke();
    rr(cx - W * 0.44, midY + 16, W * 0.30, 36, 4); ctx.fill(); ctx.stroke();
    // Laptop on desk
    ctx.fillStyle = '#020a06'; ctx.strokeStyle = '#00AA44'; ctx.lineWidth = 1;
    rr(cx - W * 0.20, midY - 10, 44, 24, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#001a08'; ctx.fillRect(cx - W * 0.20 + 2, midY - 8, 40, 16);
    ctx.fillStyle = '#00FF66'; ctx.font = '4px monospace'; ctx.textAlign = 'center';
    ctx.fillText('ROOT@METRO:~$_', cx - W * 0.20 + 22, midY + 2);
    // 2 server towers
    for (const stx of [cx + W * 0.22, cx + W * 0.36]) {
      ctx.fillStyle = '#020a06'; ctx.strokeStyle = '#00CC44'; ctx.lineWidth = 1.5;
      rr(stx, topY + 84, 44, 130, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#00CC44'; ctx.font = 'bold 4px monospace'; ctx.textAlign = 'center';
      ctx.fillText('SERVER', stx + 22, topY + 94);
      for (let bi = 0; bi < 10; bi++) {
        const lc = bi % 3 === 0 ? '#00FF66' : (bi % 3 === 1 ? '#FFCC00' : '#006622');
        ctx.fillStyle = lc; ctx.shadowColor = lc; ctx.shadowBlur = lc !== '#006622' ? 3 : 0;
        ctx.beginPath(); ctx.arc(stx + 8, topY + 102 + bi * 11, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        // drive slot
        ctx.fillStyle = '#041008'; ctx.fillRect(stx + 16, topY + 99 + bi * 11, 24, 8);
        ctx.strokeStyle = '#1a3a18'; ctx.lineWidth = 0.4; ctx.stroke();
      }
    }
    // Hacking tools box
    ctx.fillStyle = '#030c06'; ctx.strokeStyle = '#00CC44'; ctx.lineWidth = 1;
    rr(cx - W * 0.44, midY + 52, 58, 44, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#00CC44'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('TOOL KIT', cx - W * 0.44 + 29, midY + 64);
    ctx.font = '10px serif';
    for (const [em, ex2, ey2] of [['💾',cx-W*0.44+14,midY+84],['🔌',cx-W*0.44+29,midY+84],['📡',cx-W*0.44+44,midY+84]])
      ctx.fillText(em, ex2, ey2);
    // Pizza boxes on floor (gag)
    ctx.fillStyle = '#1a1008'; ctx.strokeStyle = '#884400'; ctx.lineWidth = 0.5;
    for (let pi = 0; pi < 3; pi++) rr(cx - W * 0.10 + pi * 22, midY + 58, 20, 16, 1), ctx.fill(), ctx.stroke();
    drawMetroHuman(cx - W * 0.08, midY + 20, '#0a1a0a', '#C8956A', '#1a1a1a'); // hacker1
    drawMetroHuman(cx + W * 0.06, midY + 20, '#080e08', '#FFDAB0', '#0a0a0a'); // hacker2
    drawMetroHuman(cx - W * 0.30, midY + 72, '#0a1408', '#8B5E3C', '#1a1a1a'); // lookout

  } else if (type === 19) {
    // ═══ DOJO: METRO DOJO ═══
    drawMetroFloor('#0a0804', '#0c0a06');
    drawMetroSign('METRO DOJO');
    // Large tatami mat with markings
    ctx.fillStyle = '#1a1208'; ctx.strokeStyle = '#884400'; ctx.lineWidth = 2;
    rr(cx - W * 0.36, topY + 50, W * 0.72, H * 0.50, 4); ctx.fill(); ctx.stroke();
    // Mat lane dividers
    ctx.strokeStyle = '#CC6600'; ctx.lineWidth = 1;
    for (let li = 1; li < 5; li++) {
      ctx.beginPath(); ctx.moveTo(cx - W * 0.36, topY + 50 + li * (H * 0.10)); ctx.lineTo(cx + W * 0.36, topY + 50 + li * (H * 0.10)); ctx.stroke();
    }
    // Yin yang / circle on mat center
    ctx.beginPath(); ctx.arc(cx, topY + 50 + H * 0.25, 48, 0, Math.PI * 2);
    ctx.strokeStyle = '#DD8800'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, topY + 50 + H * 0.25, 24, 0, Math.PI * 2);
    ctx.strokeStyle = '#CC6600'; ctx.lineWidth = 1; ctx.stroke();
    // Cardinal direction markers
    for (const [nx2, ny2, nl] of [[cx,topY+56,'N'],[cx,topY+50+H*0.50-8,'S'],[cx-W*0.36+8,topY+50+H*0.25,'W'],[cx+W*0.36-8,topY+50+H*0.25,'E']]) {
      ctx.fillStyle = '#FFAA44'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText(nl, nx2, ny2);
    }
    // Weapon rack left
    ctx.fillStyle = '#120c06'; ctx.strokeStyle = '#664400'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.44, topY + 8, 50, 160, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFAA44'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('WEAPONS', cx - W * 0.44 + 25, topY + 20);
    ctx.font = '13px serif';
    for (const [em, ey2] of [['🥋',topY+38],['⚔',topY+62],['🗡',topY+86],['🏹',topY+110],['🪃',topY+134],['🔱',topY+158]])
      ctx.fillText(em, cx - W * 0.44 + 25, ey2);
    // Bokken / wooden swords on separate rack
    ctx.fillStyle = '#1a1008'; ctx.strokeStyle = '#664400'; ctx.lineWidth = 1;
    rr(cx - W * 0.44, topY + 170, 50, 56, 2); ctx.fill(); ctx.stroke();
    for (let bi = 0; bi < 5; bi++) {
      ctx.fillStyle = '#5a3e14'; ctx.fillRect(cx - W * 0.44 + 7 + bi * 8, topY + 178, 5, 42);
    }
    ctx.fillStyle = '#FFCC44'; ctx.font = '5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('BOKKEN', cx - W * 0.44 + 25, topY + 224);
    // Trophy shelf right
    ctx.fillStyle = '#120c06'; ctx.strokeStyle = '#FFCC44'; ctx.lineWidth = 1;
    rr(cx + W * 0.26, topY + 8, 68, 90, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = GOLD; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('HALL OF HONOR', cx + W * 0.26 + 34, topY + 20);
    ctx.font = '14px serif';
    for (const [em, ex2, ey2] of [['🏆',cx+W*0.26+16,topY+44],['🥈',cx+W*0.26+52,topY+44],['🥉',cx+W*0.26+16,topY+72],['🎖',cx+W*0.26+52,topY+72]])
      ctx.fillText(em, ex2, ey2);
    // Belt display
    ctx.fillStyle = '#120c06'; ctx.strokeStyle = '#664400'; ctx.lineWidth = 1;
    rr(cx + W * 0.26, topY + 102, 68, 80, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFCC44'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('BELT RANKS', cx + W * 0.26 + 34, topY + 114);
    const beltC = ['#FFFFFF','#FFFF00','#FF8800','#22AA22','#0000CC','#8B0000','#2a0010'];
    for (let bi = 0; bi < 7; bi++) {
      ctx.fillStyle = beltC[bi]; ctx.fillRect(cx + W * 0.26 + 6, topY + 118 + bi * 9, 56, 6);
    }
    // Incense / altar corner
    ctx.fillStyle = '#1a1008'; ctx.strokeStyle = '#CC6600'; ctx.lineWidth = 1;
    rr(cx + W * 0.26, midY + 40, 68, 60, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FF8800'; ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 8*(0.6+0.4*Math.sin(t*2));
    ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.fillText('🕯️', cx + W * 0.26 + 20, midY + 76); ctx.shadowBlur = 0;
    ctx.font = '14px serif'; ctx.fillText('🕯️', cx + W * 0.26 + 48, midY + 76);
    ctx.fillStyle = '#FFCC88'; ctx.font = '5px monospace'; ctx.textAlign = 'center'; ctx.fillText('ALTAR', cx + W * 0.26 + 34, midY + 92);
    drawMetroHuman(cx - W * 0.16, topY + 50 + H * 0.30, '#e0e0c0', '#C8956A', '#1a0a00'); // sensei
    drawMetroHuman(cx + W * 0.08, topY + 50 + H * 0.30, '#c0c0a8', '#8B5E3C', '#1a0a00'); // student1
    drawMetroHuman(cx - W * 0.06, topY + 50 + H * 0.30, '#d0d0b0', '#FFDAB0', '#3a2010'); // student2

  } else if (type === 20) {
    // ═══ SAFEHOUSE: METRO SAFEHOUSE ═══
    drawMetroFloor('#040408', '#06060c');
    drawMetroSign('SAFEHOUSE');
    // Large planning / heist table
    ctx.fillStyle = '#0a0a14'; ctx.strokeStyle = '#4444AA'; ctx.lineWidth = 1.5;
    rr(cx - 80, topY + 12, 160, 100, 4); ctx.fill(); ctx.stroke();
    // Map spread on table
    ctx.fillStyle = '#0e1428'; ctx.fillRect(cx - 74, topY + 16, 148, 88);
    // map grid lines
    ctx.strokeStyle = '#2255AA'; ctx.lineWidth = 0.6;
    for (let ml = 0; ml < 8; ml++) {
      ctx.beginPath(); ctx.moveTo(cx - 74 + ml * 19, topY + 16); ctx.lineTo(cx - 74 + ml * 19, topY + 104); ctx.stroke();
    }
    for (let ml = 0; ml < 6; ml++) {
      ctx.beginPath(); ctx.moveTo(cx - 74, topY + 16 + ml * 15); ctx.lineTo(cx + 74, topY + 16 + ml * 15); ctx.stroke();
    }
    // target / location markers
    ctx.fillStyle = '#FF4444'; ctx.beginPath(); ctx.arc(cx + 20, topY + 48, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFCC44'; ctx.beginPath(); ctx.arc(cx - 30, topY + 68, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4444FF'; ctx.beginPath(); ctx.arc(cx + 44, topY + 80, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FF444488'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 30, topY + 68); ctx.lineTo(cx + 20, topY + 48); ctx.lineTo(cx + 44, topY + 80); ctx.stroke();
    ctx.fillStyle = '#44FF88'; ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center';
    ctx.fillText('TARGET', cx + 20, topY + 43);
    // 6 surveillance monitors 2x3 grid
    for (let mi2 = 0; mi2 < 6; mi2++) {
      const mx3 = cx + W * 0.14 + (mi2 % 3) * 56, my3 = topY + 8 + Math.floor(mi2 / 3) * 60;
      ctx.fillStyle = '#060612'; ctx.strokeStyle = '#2244AA'; ctx.lineWidth = 1;
      rr(mx3, my3, 50, 52, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#080820'; ctx.fillRect(mx3 + 3, my3 + 3, 44, 36);
      const camG = 0.4 + Math.random() * 0.2;
      ctx.fillStyle = `rgba(0,${Math.floor(camG*255)},80,0.3)`;
      ctx.fillRect(mx3 + 3, my3 + 3, 44, 36);
      ctx.fillStyle = '#44FF44'; ctx.font = '4px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`CAM ${mi2 + 1}`, mx3 + 25, mx3 > cx + W * 0.25 ? my3 + 22 : my3 + 22);
      ctx.fillText('LIVE', mx3 + 25, my3 + 30);
      // red recording dot
      ctx.fillStyle = '#FF2222'; ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 4*(0.5+0.5*Math.sin(t*3+mi2));
      ctx.beginPath(); ctx.arc(mx3 + 42, my3 + 8, 3, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#AAAAAA'; ctx.font = '5px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`CAM${mi2+1}`, mx3 + 25, my3 + 48);
    }
    // Heavy vault / safe
    ctx.fillStyle = '#0a0a14'; ctx.strokeStyle = '#888888'; ctx.lineWidth = 2;
    rr(cx - W * 0.44, midY + 10, 64, 64, 6); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - W * 0.44 + 32, midY + 42, 20, 0, Math.PI * 2);
    ctx.strokeStyle = '#BBBBBB'; ctx.lineWidth = 2; ctx.stroke();
    // dial ticks
    for (let di = 0; di < 12; di++) {
      const da = (di/12)*Math.PI*2;
      ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx-W*0.44+32+Math.cos(da)*14, midY+42+Math.sin(da)*14); ctx.lineTo(cx-W*0.44+32+Math.cos(da)*20, midY+42+Math.sin(da)*20); ctx.stroke();
    }
    ctx.fillStyle = '#CCCCCC'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
    ctx.fillText('SAFE', cx - W * 0.44 + 32, midY + 66);
    // Weapons locker
    ctx.fillStyle = '#080810'; ctx.strokeStyle = '#4444AA'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.44, midY - 50, 64, 54, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6688CC'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('ARMORY', cx - W * 0.44 + 32, midY - 38);
    ctx.font = '11px serif';
    for (const [em, ex2, ey2] of [['🔫',cx-W*0.44+14,midY-20],['🔫',cx-W*0.44+50,midY-20],['💣',cx-W*0.44+14,midY-2],['🗡️',cx-W*0.44+50,midY-2]])
      ctx.fillText(em, ex2, ey2);
    // Cot / bunk
    ctx.fillStyle = '#0a0814'; ctx.strokeStyle = '#3333AA'; ctx.lineWidth = 1;
    rr(cx - W * 0.10, midY + 10, 80, 44, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#14122a'; rr(cx - W * 0.10 + 4, midY + 14, 62, 28, 3); ctx.fill();
    ctx.fillStyle = '#DDD8FF'; rr(cx - W * 0.10 + 58, midY + 16, 16, 12, 2); ctx.fill();
    // Radio comms equipment
    ctx.fillStyle = '#080810'; ctx.strokeStyle = '#4444AA'; ctx.lineWidth = 1;
    rr(cx + W * 0.12, midY + 64, 52, 42, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#22AA44'; ctx.shadowColor = '#22AA44'; ctx.shadowBlur = 4*(0.5+0.5*Math.sin(t*2));
    ctx.beginPath(); ctx.arc(cx + W * 0.12 + 40, midY + 72, 4, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#4488FF'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('COMMS', cx + W * 0.12 + 26, midY + 86);
    ctx.fillText('ENCRYPTED', cx + W * 0.12 + 26, midY + 96);
    drawMetroHuman(cx - W * 0.16, topY + 142, '#0a0a1a', '#C8956A', '#1a0a00'); // planner
    drawMetroHuman(cx + W * 0.04, midY + 54, '#0a0818', '#FFDAB0', '#2a1a2a'); // lookout

  } else if (type === 21) {
    // ═══ CHOP SHOP: CITY CHOP SHOP ═══
    drawMetroFloor('#08080a', '#0a0a0c');
    drawMetroSign('CITY CHOP SHOP');
    // Oil stain floor marks
    ctx.fillStyle = 'rgba(40,30,0,0.4)';
    ctx.beginPath(); ctx.ellipse(cx - 10, midY + 40, 60, 20, 0.3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + W * 0.20, topY + 180, 30, 12, -0.5, 0, Math.PI*2); ctx.fill();
    // 2 dismantled cars
    for (const [cx3, cy3, col] of [[cx - W * 0.18, midY - 30, '#1e1e10'],[cx + W * 0.14, midY - 30, '#1a141a']]) {
      ctx.fillStyle = col; ctx.strokeStyle = '#666644'; ctx.lineWidth = 1.5;
      rr(cx3 - 58, cy3, 116, 56, 6); ctx.fill(); ctx.stroke();
      // stripped interior lines
      ctx.strokeStyle = '#4a4a30'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx3 - 30, cy3 + 8); ctx.lineTo(cx3 + 30, cy3 + 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx3 - 50, cy3 + 20); ctx.lineTo(cx3 + 50, cy3 + 20); ctx.stroke();
      // missing wheels (only outlines)
      for (const [wx2, wy2] of [[cx3 - 38, cy3 + 56], [cx3 + 38, cy3 + 56]]) {
        ctx.strokeStyle = '#554422'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(wx2, wy2, 14, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#1a1408'; ctx.beginPath(); ctx.arc(wx2, wy2, 5, 0, Math.PI * 2); ctx.fill();
      }
      // vin number scratched off
      ctx.fillStyle = '#333320'; ctx.fillRect(cx3 - 20, cy3 + 26, 40, 10);
      ctx.fillStyle = '#888880'; ctx.font = '4px monospace'; ctx.textAlign = 'center';
      ctx.fillText('VIN: ??????????', cx3, cy3 + 34);
    }
    // Tool wall left
    ctx.fillStyle = '#101010'; ctx.strokeStyle = '#554411'; ctx.lineWidth = 1;
    rr(cx - W * 0.44, topY + 8, 52, H * 0.60, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFAA22'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('TOOLS', cx - W * 0.44 + 26, topY + 20);
    ctx.font = '12px serif';
    for (const [ti, tix2, tiy2] of [['🔧',cx-W*0.44+14,topY+40],['🔩',cx-W*0.44+38,topY+40],['🔨',cx-W*0.44+14,topY+66],['⚙',cx-W*0.44+38,topY+66],['🪛',cx-W*0.44+14,topY+92],['🔦',cx-W*0.44+38,topY+92],['🪚',cx-W*0.44+14,topY+118],['🪤',cx-W*0.44+38,topY+118]])
      ctx.fillText(ti, tix2, tiy2);
    // Parts bins (6 — more variety)
    const partLabels = ['ENG','TRN','EXH','BRK','SUS','ELC'];
    for (let pi = 0; pi < 6; pi++) {
      const px2 = cx + W * 0.20 + (pi % 3) * 34, py2 = topY + 8 + Math.floor(pi/3) * 56;
      ctx.fillStyle = '#1a1810'; ctx.strokeStyle = '#665522'; ctx.lineWidth = 1;
      rr(px2, py2, 28, 48, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3a3028'; ctx.fillRect(px2 + 2, py2 + 8, 24, 30);
      // junk in bins
      ctx.font = '8px serif'; ctx.textAlign = 'center';
      ctx.fillText('⚙', px2 + 14, py2 + 26);
      ctx.fillStyle = '#FFAA22'; ctx.font = '4px monospace';
      ctx.fillText(partLabels[pi], px2 + 14, py2 + 44);
    }
    // VIN grinder / power tool
    ctx.fillStyle = '#141410'; ctx.strokeStyle = '#886622'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.44, midY + 55, 52, 44, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFCC44'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('GRINDER', cx - W * 0.44 + 26, midY + 68);
    ctx.font = '11px serif'; ctx.fillText('🔧', cx - W * 0.44 + 26, midY + 86);
    // Police scanner on desk
    ctx.fillStyle = '#0c0c10'; ctx.strokeStyle = '#3344AA'; ctx.lineWidth = 1;
    rr(cx - W * 0.20, midY + 60, 50, 38, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#22FF44'; ctx.shadowColor = '#22FF44'; ctx.shadowBlur = 4*(0.5+0.5*Math.sin(t*3));
    ctx.beginPath(); ctx.arc(cx - W * 0.20 + 40, midY + 68, 4, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#4488FF'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('POLICE', cx - W * 0.20 + 25, midY + 84);
    ctx.fillText('SCANNER', cx - W * 0.20 + 25, midY + 92);
    // Spray paint cans
    const sprayC = ['#FF2200','#2244FF','#22CC22','#FFCC00','#FF00FF'];
    for (let si = 0; si < 5; si++) {
      ctx.fillStyle = sprayC[si]; ctx.globalAlpha = 0.85;
      rr(cx - W * 0.44 + 56 + si * 12, midY + 55, 10, 26, 3); ctx.fill(); ctx.globalAlpha = 1;
    }
    drawMetroHuman(cx - W * 0.06, midY + 68, '#2a2010', '#C8956A', '#1a0a00'); // mechanic1
    drawMetroHuman(cx + W * 0.06, midY - 66, '#1a1a10', '#8B5E3C', '#2a1a00'); // mechanic2

  } else if (type === 22) {
    // ═══ RADIO STATION: METRO RADIO 99.1 FM ═══
    drawMetroFloor('#0a0418', '#0c0520');
    drawMetroSign('METRO RADIO 99.1 FM');
    // ON AIR animated sign above booth
    const pulse = Math.sin(t * 3) * 0.35 + 0.65;
    ctx.fillStyle = `rgba(255,0,0,${pulse})`; ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 16 * pulse;
    ctx.font = 'bold 13px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.fillText('● ON AIR', cx, topY - 2); ctx.shadowBlur = 0;
    // Broadcast booth (main desk area)
    ctx.fillStyle = '#100418'; ctx.strokeStyle = '#AA44FF'; ctx.lineWidth = 2;
    ctx.shadowColor = '#AA44FF'; ctx.shadowBlur = 12;
    rr(cx - 110, midY - 30, 220, 44, 8); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    // Large mixing board
    ctx.fillStyle = '#0c0216'; ctx.strokeStyle = '#8833DD'; ctx.lineWidth = 1;
    rr(cx - 100, midY - 22, 200, 28, 3); ctx.fill(); ctx.stroke();
    for (let fi = 0; fi < 14; fi++) {
      const fx2 = cx - 92 + fi * 14;
      ctx.fillStyle = '#3a1a5a'; ctx.fillRect(fx2 - 2, midY - 20, 4, 20);
      ctx.fillStyle = '#CC88FF'; ctx.fillRect(fx2 - 3, midY - 10 + (fi % 7) * 2, 6, 5);
    }
    // VU meter display
    ctx.fillStyle = '#000820'; ctx.fillRect(cx - 30, midY - 26, 60, 12);
    for (let vi = 0; vi < 14; vi++) {
      const vc = vi < 10 ? '#00FF66' : vi < 12 ? '#FFCC00' : '#FF2222';
      const active = vi < (8 + Math.floor(Math.sin(t*3+vi)*4));
      ctx.fillStyle = active ? vc : vc + '33';
      ctx.fillRect(cx - 28 + vi * 4, midY - 24, 3, 8);
    }
    // 2 large studio microphones
    for (const [mx2, dir] of [[cx - 36, 1],[cx + 36, -1]]) {
      ctx.fillStyle = '#1a1028'; ctx.strokeStyle = '#FF44FF'; ctx.lineWidth = 1.5;
      ctx.shadowColor = '#FF44FF'; ctx.shadowBlur = 8*(0.6+0.4*Math.sin(t*2));
      ctx.beginPath(); ctx.ellipse(mx2, midY - 48, 9, 14, dir*0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      // mic arm
      ctx.strokeStyle = '#AA44FF'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mx2, midY - 34); ctx.lineTo(mx2 + dir * 20, midY - 26); ctx.lineTo(mx2 + dir * 20, midY - 20); ctx.stroke();
    }
    // Pop shields
    for (const mx2 of [cx - 36, cx + 36]) {
      ctx.strokeStyle = 'rgba(200,100,255,0.4)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(mx2, midY - 56, 13, 13, 0, 0, Math.PI*2); ctx.stroke();
    }
    // 2 large studio monitor speakers
    for (const sxOff of [-W * 0.44, W * 0.28]) {
      ctx.fillStyle = '#080114'; ctx.strokeStyle = '#8833DD'; ctx.lineWidth = 1.5;
      ctx.shadowColor = '#8833DD'; ctx.shadowBlur = 6*(0.5+0.5*Math.sin(t));
      rr(cx + sxOff, topY + 8, 68, 106, 4); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      // tweeter
      ctx.beginPath(); ctx.arc(cx + sxOff + 34, topY + 28, 12, 0, Math.PI * 2);
      ctx.strokeStyle = '#6622BB'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + sxOff + 34, topY + 28, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#AA44FF'; ctx.beginPath(); ctx.arc(cx + sxOff + 34, topY + 28, 2.5, 0, Math.PI * 2); ctx.fill();
      // woofer
      ctx.beginPath(); ctx.arc(cx + sxOff + 34, topY + 70, 24, 0, Math.PI * 2);
      ctx.strokeStyle = '#5511AA'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + sxOff + 34, topY + 70, 12, 0, Math.PI * 2);
      ctx.strokeStyle = '#7722CC'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#6600AA'; ctx.beginPath(); ctx.arc(cx + sxOff + 34, topY + 70, 4, 0, Math.PI * 2); ctx.fill();
    }
    // Vinyl record wall display
    ctx.fillStyle = '#08020e'; ctx.strokeStyle = '#6622AA'; ctx.lineWidth = 1;
    rr(cx - W * 0.44, topY + 120, 68, 120, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#AA44FF'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('VINYL ARCHIVE', cx - W * 0.44 + 34, topY + 132);
    for (let vi = 0; vi < 6; vi++) {
      const vx2 = cx - W * 0.44 + 10 + (vi%3) * 20, vy2 = topY + 140 + Math.floor(vi/3) * 32;
      ctx.fillStyle = '#1a0a2a'; ctx.strokeStyle = '#884488'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(vx2, vy2, 10, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#AA44FF'; ctx.beginPath(); ctx.arc(vx2, vy2, 3, 0, Math.PI*2); ctx.fill();
    }
    // Producer booth glass window (right)
    ctx.fillStyle = 'rgba(80,0,100,0.12)';
    rr(cx + W * 0.28, topY + 120, 68, 110, 3); ctx.fill();
    ctx.strokeStyle = '#8833DD'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#CC88FF'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('PRODUCER', cx + W * 0.28 + 34, topY + 132);
    ctx.fillText('BOOTH', cx + W * 0.28 + 34, topY + 142);
    // headphone hook
    ctx.font = '11px serif'; ctx.fillText('🎧', cx + W * 0.28 + 34, topY + 174);
    // Playlist / request board
    ctx.fillStyle = '#100030'; ctx.strokeStyle = '#AA44FF'; ctx.lineWidth = 1;
    rr(cx - W * 0.10, midY + 24, 80, 60, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FF44FF'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('NOW PLAYING', cx - W * 0.10 + 40, midY + 36);
    ctx.fillStyle = '#CC88FF'; ctx.font = '4px monospace';
    ctx.fillText('NEON NIGHTS - METRO FM', cx - W * 0.10 + 40, midY + 46);
    ctx.fillText('REQUEST LINE: 555-9110', cx - W * 0.10 + 40, midY + 56);
    ctx.fillText('NEXT: CITY LIGHTS...', cx - W * 0.10 + 40, midY + 66);
    drawMetroHuman(cx - W * 0.10, midY - 68, '#1a0a2a', '#FFDAB0', '#1a1a1a'); // DJ on air
    drawMetroHuman(cx + W * 0.28 + 34, topY + 196, '#2a0840', '#C8956A', '#4a3020'); // producer
    drawMetroHuman(cx + W * 0.10, midY + 24, '#16062a', '#E0A878', '#2a1a30'); // engineer

  } else if (type === 23) {
    // ═══ UNDERGROUND LAB: CLASSIFIED ═══
    drawMetroFloor('#020c08', '#020e08');
    drawMetroSign('UNDERGROUND LAB — CLASSIFIED');
    // Hazard stripe floor edges
    for (let si = 0; si < 12; si++) {
      ctx.fillStyle = si % 2 === 0 ? 'rgba(255,200,0,0.10)' : 'rgba(0,0,0,0)';
      ctx.fillRect(si * 90 - 30, 0, 45, 16);
      ctx.fillRect(si * 90 - 30, H - 16, 45, 16);
    }
    // 7 glowing chemical tanks
    const tkC = ['#00FFCC','#FF4444','#FFCC00','#4488FF','#FF44AA','#88FF00','#FF8800'];
    for (let ti = 0; ti < 7; ti++) {
      const tx2 = cx - W * 0.44 + ti * W * 0.13, ty2 = topY + 6;
      ctx.fillStyle = '#040e0c'; ctx.strokeStyle = tkC[ti]; ctx.lineWidth = 1.5;
      ctx.shadowColor = tkC[ti]; ctx.shadowBlur = 8 * (Math.sin(t * 1.8 + ti * 0.6) * 0.3 + 0.7);
      rr(tx2, ty2, W * 0.11, 76, 6); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      // liquid level (animated)
      const lv = 0.35 + Math.sin(t * 0.4 + ti) * 0.15;
      ctx.fillStyle = tkC[ti] + '40';
      ctx.fillRect(tx2 + 3, ty2 + 76 * (1 - lv), W * 0.11 - 6, 76 * lv - 4);
      // bubbles
      for (let bi = 0; bi < 3; bi++) {
        ctx.fillStyle = tkC[ti] + '80';
        const bx2 = tx2 + 6 + (bi * 15 + Math.sin(t*2+bi+ti)*8);
        const by2 = ty2 + 76 * (1 - lv) + (Math.sin(t*1.5+bi*2) * 10 + 20);
        if (by2 > ty2 + 4 && by2 < ty2 + 72) {
          ctx.beginPath(); ctx.arc(bx2, by2, 2.5, 0, Math.PI*2); ctx.fill();
        }
      }
      // label
      ctx.fillStyle = tkC[ti]; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText(['α','β','γ','δ','ε','ζ','η'][ti], tx2 + W * 0.055, ty2 + 68);
    }
    // Main lab workbench
    ctx.fillStyle = '#040c08'; ctx.strokeStyle = '#44CCAA'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.40, midY - 20, W * 0.80, 36, 4); ctx.fill(); ctx.stroke();
    // Lab glassware on bench
    ctx.font = '11px serif'; ctx.textAlign = 'center';
    for (const [em, ex2] of [['⚗',cx-W*0.36],['🧪',cx-W*0.24],['🧫',cx-W*0.12],['🔬',cx],['🧬',cx+W*0.12],['💊',cx+W*0.24],['🧲',cx+W*0.36]])
      ctx.fillText(em, ex2, midY + 2);
    // Centrifuge
    ctx.fillStyle = '#0a1810'; ctx.strokeStyle = '#00FFAA'; ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00FFAA'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(cx - W * 0.44 + 34, midY + 50, 26, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    for (let ci = 0; ci < 8; ci++) {
      const ca = (ci / 8) * Math.PI * 2 + t * 6;
      ctx.fillStyle = '#00FFAA'; ctx.beginPath(); ctx.arc(cx - W * 0.44 + 34 + Math.cos(ca) * 14, midY + 50 + Math.sin(ca) * 14, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#00FFAA'; ctx.font = '5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('CENTRIFUGE', cx - W * 0.44 + 34, midY + 86);
    // DNA sequencer / large machine
    ctx.fillStyle = '#030a06'; ctx.strokeStyle = '#44FFAA'; ctx.lineWidth = 2;
    ctx.shadowColor = '#44FFAA'; ctx.shadowBlur = 8*(0.5+0.5*Math.sin(t*1.5));
    rr(cx + W * 0.24, midY + 20, 80, 100, 6); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#001a10'; ctx.fillRect(cx + W * 0.24 + 6, midY + 26, 68, 48);
    ctx.fillStyle = '#00FFCC'; ctx.font = '4px monospace'; ctx.textAlign = 'left';
    const seqLines = ['>SEQUENCE','READS: 4.2M','MATCH: 98.1','COMPILE OK','MUTATION?'];
    for (let li = 0; li < 5; li++) ctx.fillText(seqLines[li], cx + W * 0.24 + 8, midY + 36 + li * 8);
    ctx.fillStyle = '#00FFAA'; ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center';
    ctx.fillText('DNA SEQUENCER', cx + W * 0.24 + 40, midY + 84);
    // Biohazard sign
    ctx.fillStyle = '#FFCC00'; ctx.shadowColor = '#FFCC00'; ctx.shadowBlur = 12*(0.5+0.5*Math.sin(t*2));
    ctx.font = '28px serif'; ctx.textAlign = 'center'; ctx.fillText('☣', cx + W * 0.12, midY + 100); ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFCC00'; ctx.font = 'bold 7px monospace'; ctx.fillText('BIOHAZARD', cx + W * 0.12, midY + 114);
    // Radiation sign
    ctx.fillStyle = '#FFAA00'; ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 6;
    ctx.font = '18px serif'; ctx.fillText('☢', cx - W * 0.20, midY + 100); ctx.shadowBlur = 0;
    // Gas cylinders
    for (let gi = 0; gi < 4; gi++) {
      const gx2 = cx - W * 0.44 + 66 + gi * 18, gy2 = midY + 26;
      ctx.fillStyle = '#1a2818'; ctx.strokeStyle = '#44CCAA'; ctx.lineWidth = 1;
      rr(gx2, gy2, 14, 50, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ['#00FFCC','#FF4444','#FFCC00','#4488FF'][gi]; ctx.font = '4px monospace'; ctx.textAlign = 'center';
      ctx.fillText(['O₂','N₂','H₂','CO₂'][gi], gx2 + 7, gy2 + 34);
      // valve on top
      ctx.fillStyle = '#888888'; ctx.fillRect(gx2 + 4, gy2 - 6, 6, 6);
    }
    // Fume hood / containment box left
    ctx.fillStyle = '#030c08'; ctx.strokeStyle = '#44CCAA'; ctx.lineWidth = 1.5;
    rr(cx - W * 0.44, midY + 100, 62, 66, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(0,200,150,0.12)'; ctx.fillRect(cx - W * 0.44 + 4, midY + 104, 54, 40);
    ctx.fillStyle = '#44CCAA'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
    ctx.fillText('FUME HOOD', cx - W * 0.44 + 31, midY + 116);
    ctx.font = '10px serif'; ctx.fillText('⚗️', cx - W * 0.44 + 31, midY + 136);
    // Scientists with hazmat suits (mask overlay)
    drawMetroHuman(cx - W * 0.18, midY + 52, '#889898', '#FFDAB0', '#4a3020');
    ctx.fillStyle = 'rgba(160,200,200,0.72)'; ctx.strokeStyle = '#888'; ctx.lineWidth = 0.5;
    rr(cx - W * 0.18 - 7, midY + 52 - 26, 14, 9, 2); ctx.fill(); ctx.stroke();
    drawMetroHuman(cx + W * 0.10, midY + 52, '#7a9090', '#C8956A', '#1a0a00');
    ctx.fillStyle = 'rgba(160,200,200,0.72)'; ctx.strokeStyle = '#888'; ctx.lineWidth = 0.5;
    rr(cx + W * 0.10 - 7, midY + 52 - 26, 14, 9, 2); ctx.fill(); ctx.stroke();
    drawMetroHuman(cx - W * 0.44 + 31, midY - 40, '#6a8888', '#E0A878', '#3a2010'); // lab director
    ctx.fillStyle = 'rgba(150,190,190,0.72)'; ctx.strokeStyle = '#888'; ctx.lineWidth = 0.5;
    rr(cx - W * 0.44 + 31 - 7, midY - 40 - 26, 14, 9, 2); ctx.fill(); ctx.stroke();
  }

  ctx.restore();
};  // end Game.prototype._renderMetropolisRoom

