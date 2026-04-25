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

    const isDino   = !!this.map?.config?.dino;
    const isJungle = !!this.map?.config?.jungle;

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

