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
        if (tile === TILE.ROAD) {
          mctx.fillStyle = this.config.roadColor;
        } else if (tile === TILE.SIDEWALK) {
          // Park tiles show green on minimap
          mctx.fillStyle = (this._parkTiles && this._parkTiles.has(`${tx},${ty}`))
            ? '#0d2a10' : this.config.sidewalkColor;
        } else {
          // Zone-tinted building colors on metropolis minimap
          if (this._rxSet) {
            const zx2 = tx / this.W, zy2 = ty / this.H;
            if      (zy2 < 0.35 && zx2 < 0.45) mctx.fillStyle = '#0c1828'; // commercial: blue-dark
            else if (zy2 < 0.35 && zx2 >= 0.45) mctx.fillStyle = '#1a1008'; // residential: warm-dark
            else if (zy2 > 0.68 && zx2 < 0.52) mctx.fillStyle = '#080a08'; // industrial: grey
            else                                 mctx.fillStyle = '#14100c'; // slums: brownish
          } else {
            mctx.fillStyle = '#0a0a14';
          }
        }
        mctx.fillRect(tx * sw, ty * sh, sw + 0.5, sh + 0.5);
      }
    }
    // Road grid lines
    const rgb = this._hexToRgbStr(this.config.theme);
    mctx.strokeStyle = `rgba(${rgb},0.25)`;
    mctx.lineWidth = 0.5;
    const roadXSrc = this._rxArr || null;
    const roadYSrc = this._ryArr || null;
    if (roadXSrc) {
      for (const xi of roadXSrc) {
        mctx.beginPath(); mctx.moveTo(xi * sw, 0); mctx.lineTo(xi * sw, mc.height); mctx.stroke();
      }
      for (const yi of roadYSrc) {
        mctx.beginPath(); mctx.moveTo(0, yi * sh); mctx.lineTo(mc.width, yi * sh); mctx.stroke();
      }
    } else {
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
  }

  // ── Map generation ────────────────────────────────────────
  _generate() {
    if (this.config.metropolis) { this._generateMetropolis(); return; }

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
              const door = { tx, ty, type, wx: (tx + 0.5) * S, wy: (ty + 1) * S - 4, _openAmt: 0 };
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
      const R2 = this.ROAD_EVERY;
      const key = `${Math.floor(door.tx/R2)},${Math.floor(door.ty/R2)}`;
      if (door.specialType) this._blockTypes[key] = door.specialType;
      door.bTypeIdx = (this._blockTypes[key] >= 0) ? this._blockTypes[key] : 0;
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

  // ── Metropolis city generation ────────────────────────────
  // 90×60 non-square map with 4 distinct zones, park, boulevards
  _generateMetropolis() {
    const W = this.W, H = this.H, S = this.S;

    // ── Explicit road grid with varied block sizes ────────────
    // Column roads (x): alternating gaps of 9 and 8, creating varied block widths
    const xGaps = [9, 8, 10, 9, 8, 11, 9, 8, 10, 9, 8, 9];
    const rxArr = [];
    let px = 0;
    while (px < W) { rxArr.push(px); px += xGaps[rxArr.length % xGaps.length]; }

    // Row roads (y): varied gaps 7 and 6
    const yGaps = [7, 6, 8, 7, 6, 7, 8, 6, 7];
    const ryArr = [];
    let py = 0;
    while (py < H) { ryArr.push(py); py += yGaps[ryArr.length % yGaps.length]; }

    const rxSet = new Set(rxArr);
    const rySet = new Set(ryArr);

    // Store for render + randomRoadPos
    this._rxSet = rxSet;
    this._rySet = rySet;
    this._rxArr = rxArr;
    this._ryArr = ryArr;

    // ── Zone function ─────────────────────────────────────────
    const zp = this.config.zonePalettes;
    const zoneOf = (x, y) => {
      const zx = x / W, zy = y / H;
      if (zy < 0.35) return zx < 0.45 ? 'commercial' : 'residential';
      if (zy > 0.68) return zx < 0.52 ? 'industrial' : 'slums';
      // Middle band: mix
      if (zx < 0.22) return 'commercial';
      if (zx > 0.78) return 'slums';
      return 'residential';
    };
    const zonePals = {
      commercial:  zp.commercial,
      residential: zp.residential,
      industrial:  zp.industrial,
      slums:       zp.slums,
    };

    // ── Tile generation ───────────────────────────────────────
    for (let y = 0; y < H; y++) {
      this.tiles[y]           = [];
      this.buildingColors[y]  = [];
      this.buildingWindows[y] = [];
      for (let x = 0; x < W; x++) {
        const isRoadX = rxSet.has(x);
        const isRoadY = rySet.has(y);
        const isSidX  = rxSet.has(x - 1) || rxSet.has(x + 1);
        const isSidY  = rySet.has(y - 1) || rySet.has(y + 1);

        if      (isRoadX || isRoadY) this.tiles[y][x] = TILE.ROAD;
        else if (isSidX  || isSidY)  this.tiles[y][x] = TILE.SIDEWALK;
        else                         this.tiles[y][x] = TILE.BUILDING;

        const zone = zoneOf(x, y);
        const pal  = zonePals[zone];
        const seed = (x * 1997 + y * 997) >>> 0;
        this.buildingColors[y][x]  = pal[seed % pal.length];
        this.buildingWindows[y][x] = Math.sin(seed * 9.73) > 0.18;
      }
    }

    // ── Central park zone ─────────────────────────────────────
    // Find middle road intersections and convert that block to park (open sidewalk)
    this._parkTiles = new Set();
    const midXi = Math.floor(rxArr.length / 2);
    const midYi = Math.floor(ryArr.length / 2);
    if (midXi < rxArr.length - 1 && midYi < ryArr.length - 1) {
      const px1 = rxArr[midXi], px2 = rxArr[midXi + 1];
      const py1 = ryArr[midYi], py2 = ryArr[midYi + 1];
      for (let cy = py1 + 1; cy < py2; cy++) {
        for (let cx = px1 + 1; cx < px2; cx++) {
          this.tiles[cy][cx] = TILE.SIDEWALK; // open green space
          this._parkTiles.add(`${cx},${cy}`);
        }
      }
    }

    // ── Door generation ───────────────────────────────────────
    for (let ty = 0; ty < H - 1; ty++) {
      for (let tx = 0; tx < W; tx++) {
        if (this.tiles[ty][tx] === TILE.BUILDING &&
            this.tiles[ty + 1][tx] === TILE.SIDEWALK) {
          const seed2 = tx * 997 + ty * 31;
          const zone  = zoneOf(tx, ty);
          const chance = zone === 'commercial' ? 0.15 :
                         zone === 'residential' ? 0.13 : 0.09;
          if (Math.abs(Math.sin(seed2 * 4.71)) < chance) {
            const type = Math.abs(Math.sin(seed2 * 2.37)) > 0.5 ? 2 : 1;
            const door = { tx, ty, type, wx: (tx + 0.5) * S, wy: (ty + 1) * S - 4, _openAmt: 0 };
            this.doors.push(door);
            this._doorMap.set(`${tx},${ty}`, door);
          }
        }
      }
    }

    // Mark 2 dealerships + 1 casino
    if (this.doors.length >= 4) {
      const step = Math.max(1, Math.floor(this.doors.length / 2));
      let n = 0;
      for (let i = 0; i < this.doors.length && n < 2; i += step) {
        this.doors[i].specialType = 'dealership'; n++;
      }
      const ci = Math.floor(this.doors.length * 0.65);
      if (!this.doors[ci].specialType) this.doors[ci].specialType = 'casino';
    }

    // ── Metro entrance ────────────────────────────────────────
    const meXi = Math.min(Math.floor(rxArr.length * 0.72), rxArr.length - 1);
    const meYi = Math.min(Math.floor(ryArr.length * 0.78), ryArr.length - 1);
    const meX  = rxArr[meXi], meY = ryArr[meYi];
    this.metroEntrance = { tx: meX, ty: meY, wx: (meX + 0.5) * S, wy: (meY + 0.5) * S };

    // ── Block-type lookup ─────────────────────────────────────
    const BL = CONFIG.BUILDING_TYPES.length;
    this._blockTypes = {};
    for (let by2 = 0; by2 < 80; by2++) {
      for (let bx2 = 0; bx2 < 80; bx2++) {
        this._blockTypes[`${bx2},${by2}`] = ((bx2 * 1531 + by2 * 743) >>> 0) % BL;
      }
    }
    for (const door of this.doors) {
      const R2 = this.ROAD_EVERY;
      const key = `${Math.floor(door.tx/R2)},${Math.floor(door.ty/R2)}`;
      if (door.specialType) this._blockTypes[key] = door.specialType;
      door.bTypeIdx = (this._blockTypes[key] >= 0) ? this._blockTypes[key] : 0;
    }

    // ── Portals at well-separated road intersections ──────────
    this.portals = [];
    const p1x = rxArr[2]                  ?? rxArr[0];
    const p1y = ryArr[2]                  ?? ryArr[0];
    const p2x = rxArr[rxArr.length - 3]   ?? rxArr[rxArr.length - 1];
    const p2y = ryArr[ryArr.length - 3]   ?? ryArr[ryArr.length - 1];
    this.portals.push({ x: (p1x + 0.5) * S, y: (p1y + 0.5) * S, paired: 1, _animT: 0 });
    this.portals.push({ x: (p2x + 0.5) * S, y: (p2y + 0.5) * S, paired: 0, _animT: 1.5 });
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
    const S = this.S;
    // Metropolis: use stored road arrays for guaranteed road-intersection spawns
    if (this._rxArr && this._rxArr.length && this._ryArr && this._ryArr.length) {
      const tx = this._rxArr[Math.floor(Math.random() * this._rxArr.length)];
      const ty = this._ryArr[Math.floor(Math.random() * this._ryArr.length)];
      return new Vec2((tx + 0.5) * S, (ty + 0.5) * S);
    }
    const R = this.ROAD_EVERY;
    const roads = [];
    for (let i = 0; i < this.W; i++) if (i % R === 0) roads.push(i);
    return new Vec2((rndChoice(roads) + 0.5) * S, (rndChoice(roads) + 0.5) * S);
  }

  // ── Door animation update ─────────────────────────────────
  updateDoors(px, py, dt) {
    const speed = 3.5; // panels per second (0→1 range)
    for (const door of this.doors) {
      const dist = Math.hypot(door.wx - px, door.wy - py);
      const target = dist < 62 ? 1 : 0;
      const delta  = target - door._openAmt;
      door._openAmt = Math.max(0, Math.min(1, door._openAmt + Math.sign(delta) * speed * dt));
    }
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
        // For metropolis use actual road sets; otherwise use modulo
        const isColR = this._rxSet ? this._rxSet.has(x) : (x % R === 0);
        const isRowR = this._rySet ? this._rySet.has(y) : (y % R === 0);

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
          const isPark = this._parkTiles && this._parkTiles.has(`${x},${y}`);
          if (isPark) {
            // Park: lush green ground
            ctx.fillStyle = '#0d2010';
            ctx.fillRect(wx, wy, S, S);
            // Grass texture patches
            ctx.fillStyle = '#122a14';
            ctx.fillRect(wx + 4, wy + 4, S - 8, S - 8);
            // Random grass highlights
            const gs = Math.sin(x * 13.7 + y * 7.3);
            if (gs > 0.3) {
              ctx.fillStyle = 'rgba(30,120,40,0.28)';
              ctx.fillRect(wx + 8 + (x * 17) % 28, wy + 8 + (y * 13) % 28, 16, 10);
            }
            // Trees at some tiles
            if ((x * 3 + y * 5) % 7 === 0) {
              ctx.save();
              // Tree shadow
              ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
              ctx.beginPath(); ctx.ellipse(wx + S/2 + 4, wy + S/2 + 6, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
              ctx.globalAlpha = 1;
              // Tree canopy
              ctx.shadowColor = '#00AA44'; ctx.shadowBlur = 12;
              ctx.fillStyle = '#0a3a12';
              ctx.beginPath(); ctx.arc(wx + S/2, wy + S/2, 14, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = '#145520';
              ctx.beginPath(); ctx.arc(wx + S/2 - 3, wy + S/2 - 4, 10, 0, Math.PI * 2); ctx.fill();
              ctx.shadowBlur = 0;
              ctx.restore();
            } else if ((x * 5 + y * 3) % 11 === 0) {
              // Bench / lamp
              ctx.fillStyle = '#2a1a08';
              ctx.fillRect(wx + S/2 - 8, wy + S/2 - 2, 16, 4);
            }
          } else {
            ctx.fillStyle = cfg.sidewalkColor;
            ctx.fillRect(wx, wy, S, S);
          }
        } else {
          // Building
          ctx.fillStyle = this.buildingColors[y][x];
          ctx.fillRect(wx, wy, S, S);
          // Edge highlight
          ctx.fillStyle = 'rgba(255,255,255,0.04)';
          ctx.fillRect(wx, wy, S, 3);
          ctx.fillRect(wx, wy, 3, S);

          // ── Metropolis zone-specific building decoration ────
          if (this._rxSet) {
            const zx2 = x / this.W, zy2 = y / this.H;
            const isComm = zy2 < 0.35 && zx2 < 0.45;
            const isRes  = zy2 < 0.35 && zx2 >= 0.45;
            const isInd  = zy2 > 0.68 && zx2 < 0.52;
            // Commercial: glass curtain wall (blue shimmer)
            if (isComm && (x + y) % 3 < 2) {
              ctx.fillStyle = 'rgba(40,100,160,0.18)';
              ctx.fillRect(wx + 2, wy + 2, S - 4, S - 4);
            }
            // Residential: balconies (small protrusions on even tiles)
            if (isRes && (x * y) % 4 === 0) {
              ctx.fillStyle = 'rgba(180,130,70,0.30)';
              ctx.fillRect(wx + S/2 - 8, wy + S - 10, 16, 6);
              ctx.fillRect(wx + S/2 - 8, wy + S/2 - 10, 16, 4);
            }
            // Industrial: rust and corrugation lines
            if (isInd) {
              ctx.fillStyle = 'rgba(80,40,20,0.25)';
              for (let li = 0; li < 4; li++) {
                ctx.fillRect(wx + 2, wy + 12 + li * 16, S - 4, 3);
              }
            }
          }

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
            const dw  = doorEntry.type === 2 ? 52 : 38;
            const dh  = 52;
            const dx2 = wx + S / 2 - dw / 2;
            const dy2 = wy + S - dh;
            const cx2 = wx + S / 2; // center x

            // Determine sign text and color
            let signText, signColor;
            const bTypeIdx2 = doorEntry.bTypeIdx ?? Math.floor(Math.abs(Math.sin(x * 17.3 + y * 11.7)) * CONFIG.BUILDING_TYPES.length);
            if (doorEntry.specialType === 'dealership') {
              signText = 'CAR DEALER'; signColor = '#FFCC00';
            } else if (doorEntry.specialType === 'casino') {
              signText = 'CASINO'; signColor = '#FF44AA';
            } else if (doorEntry.specialType === 'restaurant') {
              signText = 'CAFÉ'; signColor = '#FF8844';
            } else if (doorEntry.specialType === 'home') {
              signText = 'HOME'; signColor = '#88FFCC';
            } else {
              const bType = CONFIG.BUILDING_TYPES[bTypeIdx2];
              signText = bType.name; signColor = bType.color;
            }
            const isGlass = doorEntry.specialType === 'dealership' || doorEntry.specialType === 'casino';

            // ── Steps at base ────────────────────────────────
            ctx.fillStyle = '#1c1c28';
            ctx.beginPath(); ctx.roundRect(dx2 - 4, dy2 + dh - 2, dw + 8, 3, 1); ctx.fill();
            ctx.fillStyle = '#252535';
            ctx.beginPath(); ctx.roundRect(dx2 - 7, dy2 + dh + 1, dw + 14, 3, 1); ctx.fill();

            // ── Outer frame (stone) ───────────────────────────
            ctx.fillStyle = '#1a1a26';
            ctx.beginPath(); ctx.roundRect(dx2 - 4, dy2 - 2, dw + 8, dh + 2, 2); ctx.fill();
            // Frame highlight
            ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(dx2 - 3, dy2 + dh); ctx.lineTo(dx2 - 3, dy2 - 1); ctx.lineTo(dx2 + dw + 3, dy2 - 1);
            ctx.stroke();
            // Frame shadow
            ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(dx2 + dw + 3, dy2 - 1); ctx.lineTo(dx2 + dw + 3, dy2 + dh); ctx.lineTo(dx2 - 3, dy2 + dh);
            ctx.stroke();

            // ── Door panels (animated open/close) ─────────────
            const oa = doorEntry._openAmt || 0;
            // Dark interior revealed as door opens
            if (oa > 0.02) {
              const warmA = oa * 0.55;
              ctx.fillStyle = `rgba(8,5,2,${oa * 0.92})`;
              ctx.beginPath(); ctx.roundRect(dx2 + 1, dy2 + 1, dw - 2, dh - 2, 1); ctx.fill();
              // Warm light spill from inside when fully open
              if (oa > 0.7) {
                const glow = ctx.createRadialGradient(cx2, dy2 + dh, 0, cx2, dy2 + dh, 28 * oa);
                glow.addColorStop(0, `rgba(255,210,120,${warmA * 0.6})`);
                glow.addColorStop(1, 'rgba(255,180,60,0)');
                ctx.fillStyle = glow; ctx.fillRect(cx2 - 30, dy2, 60, dh + 12);
              }
            }
            ctx.save();
            // Clip panels within door frame so they slide behind the frame
            ctx.beginPath(); ctx.rect(dx2, dy2, dw, dh); ctx.clip();
            if (doorEntry.type === 2) {
              const panW = (dw - 3) / 2;
              for (let d = 0; d < 2; d++) {
                const slideDir = d === 0 ? -1 : 1;
                const pdx = dx2 + 1 + d * (panW + 1) + slideDir * oa * (panW + 2);
                const panAlpha = Math.max(0, 1 - oa * 0.7);
                ctx.fillStyle = isGlass
                  ? `rgba(90,155,200,${0.38 * panAlpha})`
                  : `rgba(58,36,14,${panAlpha})`;
                ctx.beginPath(); ctx.roundRect(pdx, dy2 + 1, panW, dh - 2, 1); ctx.fill();
                if (panAlpha > 0.1) {
                  ctx.fillStyle = isGlass
                    ? `rgba(180,225,255,${0.22 * panAlpha})`
                    : `rgba(0,0,0,${0.22 * panAlpha})`;
                  ctx.beginPath(); ctx.roundRect(pdx + 2, dy2 + 3, panW - 4, (dh - 8) / 2, 1); ctx.fill();
                  ctx.beginPath(); ctx.roundRect(pdx + 2, dy2 + (dh - 8) / 2 + 6, panW - 4, (dh - 8) / 2 - 2, 1); ctx.fill();
                  if (panAlpha > 0.4) {
                    ctx.fillStyle = `rgba(212,175,55,${panAlpha})`;
                    ctx.shadowColor = '#D4AF37'; ctx.shadowBlur = 5 * panAlpha;
                    ctx.beginPath(); ctx.arc(pdx + panW - 4, dy2 + dh * 0.50, 2.1, 0, Math.PI * 2); ctx.fill();
                    ctx.shadowBlur = 0;
                  }
                }
              }
            } else {
              const slideX = oa * (dw + 2);
              const panAlpha = Math.max(0, 1 - oa * 0.7);
              ctx.fillStyle = isGlass
                ? `rgba(90,160,210,${0.40 * panAlpha})`
                : `rgba(62,42,16,${panAlpha})`;
              ctx.beginPath(); ctx.roundRect(dx2 + 1 - slideX, dy2 + 1, dw - 2, dh - 2, 1); ctx.fill();
              if (panAlpha > 0.1) {
                ctx.fillStyle = isGlass
                  ? `rgba(185,228,255,${0.24 * panAlpha})`
                  : `rgba(0,0,0,${0.20 * panAlpha})`;
                ctx.beginPath(); ctx.roundRect(dx2 + 3 - slideX, dy2 + 3, dw - 6, (dh - 8) / 2, 1); ctx.fill();
                ctx.fillStyle = `rgba(0,0,0,${0.16 * panAlpha})`;
                ctx.beginPath(); ctx.roundRect(dx2 + 3 - slideX, dy2 + (dh - 8) / 2 + 6, dw - 6, (dh - 8) / 2 - 2, 1); ctx.fill();
                if (panAlpha > 0.4) {
                  ctx.fillStyle = `rgba(212,175,55,${panAlpha})`;
                  ctx.shadowColor = '#D4AF37'; ctx.shadowBlur = 5 * panAlpha;
                  ctx.beginPath(); ctx.arc(dx2 + dw - 5 - slideX, dy2 + dh * 0.50, 2.3, 0, Math.PI * 2); ctx.fill();
                  ctx.shadowBlur = 0;
                }
              }
            }
            ctx.restore();
            ctx.shadowBlur = 0;

            // ── Awning / canopy ───────────────────────────────
            const awW = dw + 20, awH = 10;
            const awX = cx2 - awW / 2;
            const awY = dy2 - awH - 3;
            // Canopy shadow
            ctx.fillStyle = 'rgba(0,0,0,0.28)';
            ctx.beginPath(); ctx.roundRect(awX + 2, awY + 3, awW, awH, 2); ctx.fill();
            // Canopy body
            const awG = ctx.createLinearGradient(awX, awY, awX, awY + awH);
            awG.addColorStop(0, signColor + 'CC'); awG.addColorStop(1, signColor + '55');
            ctx.fillStyle = awG; ctx.shadowColor = signColor; ctx.shadowBlur = 9;
            ctx.beginPath(); ctx.roundRect(awX, awY, awW, awH, 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Canopy fringe (scalloped)
            ctx.fillStyle = signColor + '99';
            const fCount = 6, fW = awW / fCount;
            for (let fi = 0; fi < fCount; fi++) {
              ctx.beginPath(); ctx.arc(awX + fi * fW + fW / 2, awY + awH, fW * 0.34, 0, Math.PI); ctx.fill();
            }

            // ── Sign above awning ─────────────────────────────
            const signW  = dw + 24;
            const signH  = 14;
            const signX  = cx2 - signW / 2;
            const signY  = awY - signH - 2;
            ctx.save();
            ctx.fillStyle = 'rgba(6,6,14,0.90)';
            ctx.beginPath(); ctx.roundRect(signX, signY, signW, signH, 3); ctx.fill();
            ctx.strokeStyle = signColor; ctx.lineWidth = 1.4;
            ctx.shadowColor = signColor; ctx.shadowBlur = 14;
            ctx.beginPath(); ctx.roundRect(signX, signY, signW, signH, 3); ctx.stroke();
            ctx.fillStyle = signColor;
            ctx.font = 'bold 7px Orbitron, monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(signText, cx2, signY + signH / 2);
            ctx.shadowBlur = 0; ctx.textBaseline = 'alphabetic';
            ctx.restore();
          }
        }
      }
    }

    // ── Pseudo-3D south-wall depth pass ───────────────────────
    // Drawn AFTER all tiles so the wall face sits on top of sidewalks below.
    const wallH = Math.round(S * 0.14);
    for (let y = sy; y <= ey; y++) {
      for (let x = sx; x <= ex; x++) {
        if (this.tiles[y][x] !== TILE.BUILDING) continue;
        const below = (y + 1 < this.H) ? this.tiles[y + 1][x] : TILE.ROAD;
        if (below === TILE.BUILDING) continue;
        const wx2 = x * S, wy2 = y * S;
        const bc = this.buildingColors[y][x];
        // Darken building colour ~55% for south-facing wall
        const rr = Math.round(parseInt(bc.slice(1,3),16) * 0.55);
        const gg = Math.round(parseInt(bc.slice(3,5),16) * 0.55);
        const bb = Math.round(parseInt(bc.slice(5,7),16) * 0.55);
        ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
        ctx.fillRect(wx2, wy2 + S, S, wallH);
        // Top-edge shadow where roof meets wall
        ctx.fillStyle = 'rgba(0,0,0,0.52)';
        ctx.fillRect(wx2, wy2 + S, S, 3);
        // Bottom-edge ambient occlusion
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(wx2, wy2 + S + wallH - 3, S, 3);
        // Window slots on the wall face
        if (this.buildingWindows[y][x]) {
          const wc = cfg.windowColors[(Math.floor(x/2) + Math.floor(y/2)) % cfg.windowColors.length];
          ctx.save();
          ctx.shadowColor = wc; ctx.shadowBlur = 6; ctx.fillStyle = wc + 'AA';
          const wW = 10, wHh = 7;
          for (let wi = 0; wi < 3; wi++) {
            const wx3 = wx2 + 8 + wi * Math.floor((S - 16) / 3);
            if (wx3 + wW < wx2 + S - 6)
              ctx.fillRect(wx3, wy2 + S + 3, wW, wHh);
          }
          ctx.restore();
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
