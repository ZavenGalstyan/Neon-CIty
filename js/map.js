'use strict';

/**
 * @file map.js
 * Procedural city map generation and rendering.
 *
 * Tile types (TILE constant):
 *   ROAD      (0) — walkable, driveable
 *   BUILDING  (1) — solid blocker; has assigned BUILDING_TYPE label
 *   SIDEWALK  (2) — walkable, not driveable
 *
 * GameMap responsibilities:
 *   - Procedurally generate tile grid, doors, portals, and road network
 *   - isBlocked(x, y) / isBlockedCircle(x, y, r) — tile collision queries
 *   - randomRoadPos() — returns a random road-tile world position
 *   - getRoom(door)   — builds an indoor room layout for a given door
 *   - render(ctx, camX, camY, W, H) — draw visible tiles + minimap
 *   - Portals: 2 per normal map; paired by index; animated glow ring
 *   - Doors: 1–3 per building; marked `specialType:'dealership'` for 1–2 per map
 *
 * Map config flags (from CONFIG.MAPS entry):
 *   arena   — small 24×24 grid, no portals, no shop
 *   zombie  — 36×36, dense zombie spawns
 *   campaign — 38×38, 100 levels, boss every 10
 *   blitz    — 28×28, 3× speed, 5× money
 *   siege    — 46×46, bots from all 4 edges
 */

const TILE = { ROAD: 0, BUILDING: 1, SIDEWALK: 2 };

// ── Indoor room layouts ────────────────────────────────────────────────────────
// 0 = floor, 1 = wall, 2 = furniture/crate
const ROOM_LAYOUT_1 = [
  [1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,1],
  [1,0,2,0,0,0,0,2,0,1],
  [1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1],
  [1,0,2,0,0,0,0,0,2,1],
  [1,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,0,0,1,1,1,1],  // door gap cols 4-5
]; // 10×8 tiles, 60px each → 600×480 px

const ROOM_LAYOUT_2 = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,2,0,0,2,0,0,2,0,0,2,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,2,0,0,0,0,0,0,0,0,2,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,0,0,0,1,1,1,1,1,1],  // door gap cols 6-8
]; // 15×10 tiles, 60px each → 900×600 px

// 0=floor  1=wall  2=bench  3=tracks(blocked)
const ROOM_LAYOUT_METRO = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
  [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,2,0,0,2,0,0,0,0,0,0,2,0,0,2,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,2,0,0,2,0,0,0,0,0,0,2,0,0,2,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1],
]; // 20×11 tiles, 48px each → 960×528 px

class GameMap {
  constructor(mapConfig) {
    // Accept a map config object; fall back to first map in CONFIG.MAPS
    this.config = mapConfig || CONFIG.MAPS[0];

    this.W          = this.config.mapW;
    this.H          = this.config.mapH;
    this.S          = this.config.tileSize;
    this.ROAD_EVERY = this.config.roadEvery;

    this.tiles           = [];
    this.buildingColors  = [];
    this.buildingWindows = [];
    this.doors           = [];       // { tx, ty, type, wx, wy }
    this._doorMap        = new Map(); // "tx,ty" → door

    // Pre-rendered minimap canvas
    this._mmCanvas  = document.createElement('canvas');
    this._mmCanvas.width  = 176;
    this._mmCanvas.height = 128;
    this._mmScaleX  = this._mmCanvas.width  / (this.W * this.S);
    this._mmScaleY  = this._mmCanvas.height / (this.H * this.S);

    this._generate();
    this._preRenderMinimap();
  }

  // ── Minimap getters ──────────────────────────────────────
  get minimapCanvas() { return this._mmCanvas; }
  get mmScaleX()      { return this._mmScaleX; }
  get mmScaleY()      { return this._mmScaleY; }

  // ── Minimap pre-render ────────────────────────────────────
  _preRenderMinimap() {
    const mc   = this._mmCanvas;
    const mctx = mc.getContext('2d');
    mctx.fillStyle = this.config.roadColor;
    mctx.fillRect(0, 0, mc.width, mc.height);

    const sw = this.S * this._mmScaleX;
    const sh = this.S * this._mmScaleY;
    const R  = this.ROAD_EVERY;

    for (let ty = 0; ty < this.H; ty++) {
      for (let tx = 0; tx < this.W; tx++) {
        const tile = this.tiles[ty][tx];
        if      (tile === TILE.ROAD)     mctx.fillStyle = this.config.roadColor;
        else if (tile === TILE.SIDEWALK) mctx.fillStyle = this.config.sidewalkColor;
        else                             mctx.fillStyle = '#0a0a14';
        mctx.fillRect(tx * sw, ty * sh, sw + 0.5, sh + 0.5);
      }
    }
    // Road grid lines in theme color
    const rgb = this._hexToRgbStr(this.config.theme);
    mctx.strokeStyle = `rgba(${rgb},0.25)`;
    mctx.lineWidth = 0.5;
    for (let i = 0; i <= this.W; i++) {
      if (i % R === 0) {
        mctx.beginPath(); mctx.moveTo(i * sw, 0); mctx.lineTo(i * sw, mc.height); mctx.stroke();
      }
    }
    for (let j = 0; j <= this.H; j++) {
      if (j % R === 0) {
        mctx.beginPath(); mctx.moveTo(0, j * sh); mctx.lineTo(mc.width, j * sh); mctx.stroke();
      }
    }
  }

  // ── Map generation ────────────────────────────────────────
  _generate() {
    const R = this.ROAD_EVERY;
    for (let y = 0; y < this.H; y++) {
      this.tiles[y]           = [];
      this.buildingColors[y]  = [];
      this.buildingWindows[y] = [];
      for (let x = 0; x < this.W; x++) {
        const isRoadX = (x % R === 0);
        const isRoadY = (y % R === 0);
        const isSidX  = (x % R === 1 || x % R === R - 1);
        const isSidY  = (y % R === 1 || y % R === R - 1);

        if      (isRoadX || isRoadY) this.tiles[y][x] = TILE.ROAD;
        else if (isSidX  || isSidY)  this.tiles[y][x] = TILE.SIDEWALK;
        else                         this.tiles[y][x] = TILE.BUILDING;

        const seed = Math.floor(x / R) * 1000 + Math.floor(y / R);
        this.buildingColors[y][x]  = this._blockColor(seed);
        this.buildingWindows[y][x] = Math.sin(seed * 9.73) > 0.2;
      }
    }

    // ── Door generation (skip arena) ──────────────────────
    if (!this.config.arena) {
      const S = this.S;
      for (let ty = 0; ty < this.H - 1; ty++) {
        for (let tx = 0; tx < this.W; tx++) {
          if (this.tiles[ty][tx] === TILE.BUILDING &&
              this.tiles[ty + 1][tx] === TILE.SIDEWALK) {
            const seed2 = tx * 997 + ty * 31;
            const rand  = Math.abs(Math.sin(seed2 * 4.71));
            if (rand < 0.09) {
              const type = Math.abs(Math.sin(seed2 * 2.37)) > 0.5 ? 2 : 1;
              const door = { tx, ty, type, wx: (tx + 0.5) * S, wy: (ty + 1) * S - 4 };
              this.doors.push(door);
              this._doorMap.set(`${tx},${ty}`, door);
            }
          }
        }
      }
    }

    // Mark 1–2 doors as car dealerships (normal maps only)
    if (!this.config.arena && !this.config.zombie && this.doors.length >= 2) {
      const step = Math.max(1, Math.floor(this.doors.length / 2));
      let count = 0;
      for (let i = 0; i < this.doors.length && count < 2; i += step) {
        this.doors[i].specialType = 'dealership';
        count++;
      }
    }

    // Mark 1 casino door on Casino Strip map
    if (this.config.id === 'casino' && this.doors.length >= 3) {
      const idx = Math.floor(this.doors.length / 3);
      if (!this.doors[idx].specialType) this.doors[idx].specialType = 'casino';
    }

    // Mark restaurant and home doors in life mode
    if (this.config.lifeMode && this.doors.length >= 4) {
      const step2 = Math.max(1, Math.floor(this.doors.length / 5));
      let homeCount = 0, restCount = 0;
      for (let i = 0; i < this.doors.length; i += step2) {
        if (!this.doors[i].specialType) {
          if (homeCount < 2)      { this.doors[i].specialType = 'home';       homeCount++; }
          else if (restCount < 3) { this.doors[i].specialType = 'restaurant'; restCount++; }
        }
      }
    }

    // Metro entrance near bottom-right (normal maps only)
    this.metroEntrance = null;
    if (!this.config.arena && !this.config.zombie) {
      const R = this.ROAD_EVERY;
      // Snap to nearest road tile (multiple of R), clamped within map bounds
      const lastRoadX = Math.floor((this.W - 1) / R) * R;
      const lastRoadY = Math.floor((this.H - 1) / R) * R;
      let meX = Math.min(Math.round(this.W * 0.72 / R) * R, lastRoadX - R);
      let meY = Math.min(Math.round(this.H * 0.76 / R) * R, lastRoadY - R);
      meX = Math.max(meX, R);
      meY = Math.max(meY, R);
      this.metroEntrance = { tx: meX, ty: meY, wx: (meX + 0.5) * this.S, wy: (meY + 0.5) * this.S };
    }

    // Build block-type lookup for indoor furniture
    const BL = CONFIG.BUILDING_TYPES.length;
    this._blockTypes = {};
    for (let by2 = 0; by2 < Math.ceil(this.H / this.ROAD_EVERY); by2++) {
      for (let bx2 = 0; bx2 < Math.ceil(this.W / this.ROAD_EVERY); bx2++) {
        this._blockTypes[`${bx2},${by2}`] = ((bx2 * 1531 + by2 * 743) >>> 0) % BL;
      }
    }
    for (const door of this.doors) {
      if (door.specialType) {
        const R2 = this.ROAD_EVERY;
        this._blockTypes[`${Math.floor(door.tx/R2)},${Math.floor(door.ty/R2)}`] = door.specialType;
      }
    }

    // ── Teleport Portals (normal maps only, not arena/zombie/life) ──
    this.portals = [];
    if (!this.config.arena && !this.config.zombie && !this.config.lifeMode) {
      const R    = this.ROAD_EVERY;
      const S    = this.S;
      const pos1 = { tx: R * 2, ty: R * 2 };
      const pos2 = { tx: Math.floor(this.W / R) * R - R * 2, ty: Math.floor(this.H / R) * R - R * 2 };
      // Clamp to valid road tiles
      const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
      pos1.tx = clamp(Math.round(pos1.tx / R) * R, R, this.W - R);
      pos1.ty = clamp(Math.round(pos1.ty / R) * R, R, this.H - R);
      pos2.tx = clamp(Math.round(pos2.tx / R) * R, R, this.W - R);
      pos2.ty = clamp(Math.round(pos2.ty / R) * R, R, this.H - R);
      this.portals.push({ x: (pos1.tx + 0.5) * S, y: (pos1.ty + 0.5) * S, paired: 1, _animT: 0 });
      this.portals.push({ x: (pos2.tx + 0.5) * S, y: (pos2.ty + 0.5) * S, paired: 0, _animT: 1.5 });
    }
  }

  _blockColor(seed) {
    const p = this.config.buildingPalette;
    return p[seed % p.length];
  }

  // ── Collision ─────────────────────────────────────────────
  isBlocked(wx, wy) {
    const tx = Math.floor(wx / this.S);
    const ty = Math.floor(wy / this.S);
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return true;
    return this.tiles[ty][tx] === TILE.BUILDING;
  }

  isBlockedCircle(wx, wy, r) {
    return (
      this.isBlocked(wx - r + 2, wy - r + 2) ||
      this.isBlocked(wx + r - 2, wy - r + 2) ||
      this.isBlocked(wx - r + 2, wy + r - 2) ||
      this.isBlocked(wx + r - 2, wy + r - 2)
    );
  }

  randomRoadPos() {
    const R = this.ROAD_EVERY, S = this.S;
    const roads = [];
    for (let i = 0; i < this.W; i++) if (i % R === 0) roads.push(i);
    return new Vec2((rndChoice(roads) + 0.5) * S, (rndChoice(roads) + 0.5) * S);
  }

  // ── Main render ───────────────────────────────────────────
  render(ctx, camX, camY, canvasW, canvasH) {
    const S   = this.S;
    const R   = this.ROAD_EVERY;
    const cfg = this.config;
    const sx  = Math.max(0, Math.floor(camX / S));
    const sy  = Math.max(0, Math.floor(camY / S));
    const ex  = Math.min(this.W - 1, Math.ceil((camX + canvasW) / S));
    const ey  = Math.min(this.H - 1, Math.ceil((camY + canvasH) / S));

    for (let y = sy; y <= ey; y++) {
      for (let x = sx; x <= ex; x++) {
        const wx   = x * S, wy = y * S;
        const tile = this.tiles[y][x];
        const isColR = (x % R === 0), isRowR = (y % R === 0);

        if (tile === TILE.ROAD) {
          ctx.fillStyle = cfg.roadColor;
          ctx.fillRect(wx, wy, S, S);
          // Centre dashed lines
          if (isColR && !isRowR) {
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fillRect(wx + S/2 - 2, wy, 4, S);
          }
          if (isRowR && !isColR) {
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fillRect(wx, wy + S/2 - 2, S, 4);
          }
          // Street light at intersections
          if (isColR && isRowR) {
            ctx.save();
            ctx.shadowColor = cfg.lightGlow; ctx.shadowBlur = 30;
            ctx.fillStyle   = cfg.lightColor;
            ctx.beginPath(); ctx.arc(wx + S/2, wy + S/2, 4, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
          }
        } else if (tile === TILE.SIDEWALK) {
          ctx.fillStyle = cfg.sidewalkColor;
          ctx.fillRect(wx, wy, S, S);
        } else {
          // Building
          ctx.fillStyle = this.buildingColors[y][x];
          ctx.fillRect(wx, wy, S, S);
          // Edge highlight
          ctx.fillStyle = 'rgba(255,255,255,0.04)';
          ctx.fillRect(wx, wy, S, 3);
          ctx.fillRect(wx, wy, 3, S);
          // Windows
          if (this.buildingWindows[y][x]) {
            const wc = cfg.windowColors[(Math.floor(x/2) + Math.floor(y/2)) % cfg.windowColors.length];
            ctx.save();
            ctx.shadowColor = wc; ctx.shadowBlur = 8; ctx.fillStyle = wc;
            for (let wy2 = 0; wy2 < 2; wy2++) {
              for (let wx2 = 0; wx2 < 2; wx2++) {
                if (Math.sin(x * 7.3 + y * 3.1 + wx2 * 5 + wy2 * 11) > -0.3) {
                  ctx.fillRect(wx + 10 + wx2 * 32, wy + 10 + wy2 * 32, 14, 10);
                }
              }
            }
            ctx.restore();
          }
          // Neon sign strips
          if ((x + y) % cfg.neonFreq === 0) {
            const nc = cfg.neonColors[(x * 3 + y) % cfg.neonColors.length];
            ctx.save();
            ctx.shadowColor = nc; ctx.shadowBlur = 12;
            ctx.strokeStyle = nc; ctx.lineWidth = 2;
            ctx.strokeRect(wx + 8, wy + 8, S - 16, S - 16);
            ctx.restore();
          }
          // Door on south face of building
          const doorEntry = this._doorMap.get(`${x},${y}`);
          if (doorEntry) {
            const dw = doorEntry.type === 2 ? 26 : 20;
            const dh = 28;
            const dx2 = wx + S / 2 - dw / 2;
            const dy2 = wy + S - dh;
            ctx.fillStyle = '#2a1508'; ctx.fillRect(dx2, dy2, dw, dh);
            ctx.fillStyle = '#7a4a28'; ctx.fillRect(dx2 + 2, dy2 + 2, dw - 4, dh - 4);
            // Door panels
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(dx2 + 3, dy2 + 3, dw - 6, (dh - 6) / 2 - 1);
            ctx.fillRect(dx2 + 3, dy2 + (dh - 6) / 2 + 4, dw - 6, (dh - 6) / 2 - 2);
            // Handle
            ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 4;
            ctx.beginPath(); ctx.arc(dx2 + dw - 5, dy2 + dh / 2, 2.2, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Building sign above door
            let signText, signColor;
            if (doorEntry.specialType === 'dealership') {
              signText = 'DEALER'; signColor = '#FFCC00';
            } else if (doorEntry.specialType === 'casino') {
              signText = 'CASINO'; signColor = '#FF44AA';
            } else if (doorEntry.specialType === 'restaurant') {
              signText = 'CAFE'; signColor = '#FF8844';
            } else if (doorEntry.specialType === 'home') {
              signText = 'HOME'; signColor = '#88FFCC';
            } else {
              const bTypeIdx = Math.floor(Math.abs(Math.sin(x * 17.3 + y * 11.7)) * CONFIG.BUILDING_TYPES.length);
              const bType    = CONFIG.BUILDING_TYPES[bTypeIdx];
              signText = bType.name; signColor = bType.color;
            }
            const signW      = dw + 14;
            const signH      = 14;
            const signX      = wx + S / 2 - signW / 2;
            const signY      = wy + 8;
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.fillRect(signX, signY, signW, signH);
            ctx.strokeStyle = signColor; ctx.lineWidth = 1.5;
            ctx.shadowColor = signColor; ctx.shadowBlur = 10;
            ctx.strokeRect(signX, signY, signW, signH);
            ctx.fillStyle = signColor;
            ctx.font = 'bold 8px Orbitron, monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(signText, wx + S / 2, signY + signH / 2);
            ctx.shadowBlur = 0; ctx.textBaseline = 'alphabetic';
            ctx.restore();
          }
        }
      }
    }
  }

  // ── Metro entrance icon ───────────────────────────────────
  renderMetroEntrance(ctx) {
    if (!this.metroEntrance) return;
    const { wx, wy } = this.metroEntrance;
    const S = this.S;
    // ctx is already in world-space (translated by -camX,-camY by the caller)
    // so render directly at world coordinates wx, wy
    ctx.save();
    ctx.fillStyle = '#060e06';
    ctx.fillRect(wx - S * 0.5, wy - S * 0.5, S, S);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = `rgba(34,255,100,${0.38 - i * 0.08})`;
      ctx.fillRect(wx - S * 0.5 + i * 5, wy + S * 0.5 - (i + 1) * 9, S - i * 10, 5);
    }
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#22FF66'; ctx.shadowColor = '#22FF66'; ctx.shadowBlur = 20;
    ctx.fillText('M', wx, wy);
    ctx.shadowBlur = 0; ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  // ── Indoor room factory ───────────────────────────────────
  getRoom(door) {
    const RS     = 60;  // indoor tile size (px)
    const layout = door.type === 2 ? ROOM_LAYOUT_2 : ROOM_LAYOUT_1;
    const RH     = layout.length;
    const RW     = layout[0].length;
    const RW_px  = RW * RS;
    const RH_px  = RH * RS;

    // Entry X = door gap center of the bottom row
    const entryX = door.type === 2
      ? ((6 + 7) / 2 + 0.5) * RS   // gap cols 6-8 center
      : ((4 + 5) / 2 + 0.5) * RS;  // gap cols 4-5 center
    const entryY = RH_px - RS - 12;

    // Collect walkable floor positions for spawning
    const floorPositions = [];
    for (let fy = 1; fy < RH - 1; fy++) {
      for (let fx = 1; fx < RW - 1; fx++) {
        if (layout[fy][fx] === 0) {
          floorPositions.push({ x: (fx + 0.5) * RS, y: (fy + 0.5) * RS });
        }
      }
    }

    return {
      layout, W: RW, H: RH, S: RS,
      roomW: RW_px, roomH: RH_px,
      type: door.type,
      doorDoor: door,
      entryX, entryY,
      floorPositions,
      isBlocked(wx, wy) {
        const tx2 = Math.floor(wx / RS);
        const ty2 = Math.floor(wy / RS);
        if (tx2 < 0 || ty2 < 0 || tx2 >= RW || ty2 >= RH) return true;
        return layout[ty2][tx2] !== 0;
      },
      isBlockedCircle(wx, wy, r) {
        return this.isBlocked(wx - r + 1, wy - r + 1) ||
               this.isBlocked(wx + r - 1, wy - r + 1) ||
               this.isBlocked(wx - r + 1, wy + r - 1) ||
               this.isBlocked(wx + r - 1, wy + r - 1);
      },
      randomRoadPos() {
        const p = floorPositions[Math.floor(Math.random() * floorPositions.length)];
        return new Vec2(p.x, p.y);
      },
    };
  }

  _hexToRgbStr(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  }
}
