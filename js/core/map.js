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
    this._buildStreetLights(); this._buildCacti();
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
    this._buildStreetLights(); this._buildCacti();
  }

  // ── Street light generation ───────────────────────────────
  // Builds this.streetLights array: one entry per sidewalk tile
  // adjacent to a road, spaced out by a position hash.
  _buildStreetLights() {
    this.streetLights = [];
    const S = this.S;
    // Colour palette: amber (×2 weight), cool-white, pink, cyan
    const PAL = [
      [255, 210, 110],
      [255, 210, 110],
      [220, 240, 255],
      [255, 140, 220],
      [110, 240, 255],
    ];
    for (let y = 1; y < this.H - 1; y++) {
      for (let x = 1; x < this.W - 1; x++) {
        if (this.tiles[y][x] !== TILE.SIDEWALK) continue;
        // Determine if any cardinal neighbour is a road
        const nN = this.tiles[y - 1][x] === TILE.ROAD;
        const nS = this.tiles[y + 1][x] === TILE.ROAD;
        const nW = this.tiles[y][x - 1] === TILE.ROAD;
        const nE = this.tiles[y][x + 1] === TILE.ROAD;
        const roadSides = (nN?1:0) + (nS?1:0) + (nW?1:0) + (nE?1:0);
        // Skip corner tiles (adjacent to 2+ roads) and non-road-adjacent tiles
        if (roadSides !== 1) continue;
        // Space lights every ~5 tiles using a deterministic hash
        if (((x * 7 + y * 11) >>> 0) % 5 !== 0) continue;
        // Skip park tiles (metropolis only)
        if (this._parkTiles && this._parkTiles.has(`${x},${y}`)) continue;
        // Direction from sidewalk toward road (arm points this way)
        const armDx = nW ? -1 : nE ? 1 : 0;
        const armDy = nN ? -1 : nS ? 1 : 0;
        // Colour from palette
        const h = ((x * 1531 + y * 743) >>> 0) % PAL.length;
        const [r, g, b] = PAL[h];
        this.streetLights.push({
          wx: (x + 0.5) * S,
          wy: (y + 0.5) * S,
          r, g, b, armDx, armDy,
        });
      }
    }
  }

  // ── Street light poles (world-space, drawn before entities) ─
  // Shows the physical pole + arm + lamp housing in world coords.
  // ctx is already translated to world-space by the caller.
  renderStreetLightPoles(ctx, camX, camY, canvasW, canvasH, nightAlpha) {
    if (!this.streetLights || !this.streetLights.length || nightAlpha < 0.01) return;
    const margin = 80;
    const x0 = camX - margin, y0 = camY - margin;
    const x1 = camX + canvasW + margin, y1 = camY + canvasH + margin;
    const S  = this.S;
    const lit = nightAlpha > 0.01;

    ctx.save();
    for (const lt of this.streetLights) {
      if (lt.wx < x0 || lt.wx > x1 || lt.wy < y0 || lt.wy > y1) continue;

      const bx = lt.wx, by = lt.wy;            // pole base (tile centre)
      const reach = S * 0.44;                   // arm length in world px
      const lx = bx + lt.armDx * reach;         // lamp centre x
      const ly = by + lt.armDy * reach;         // lamp centre y

      // ── Pole shadow (subtle dark oval) ──────────────────────
      ctx.globalAlpha = 0.18;
      ctx.fillStyle   = '#000';
      ctx.beginPath();
      ctx.ellipse(bx + 2, by + 2, 4, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // ── Pole (slim metallic bar) ─────────────────────────────
      const pG = ctx.createLinearGradient(bx - 2, by, bx + 2, by);
      pG.addColorStop(0,   '#3a3a50');
      pG.addColorStop(0.4, '#7a7a99');
      pG.addColorStop(1,   '#282838');
      ctx.fillStyle = pG;
      ctx.fillRect(bx - 2, by - 3, 4, 6);

      // ── Arm (thin line from pole toward road) ────────────────
      ctx.strokeStyle = '#505068';
      ctx.lineWidth   = 1.8;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(lx, ly);
      ctx.stroke();

      // ── Lamp housing (dark trapezoid / rect) ─────────────────
      ctx.fillStyle = '#1e1e2e';
      ctx.beginPath();
      ctx.arc(lx, ly, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // ── Bulb (dim off-state during day, bright at night) ─────
      const bulbAlpha = lit ? 0.55 + nightAlpha * 0.45 : 0.12;
      ctx.fillStyle   = `rgba(${lt.r},${lt.g},${lt.b},${bulbAlpha})`;
      ctx.shadowColor = `rgb(${lt.r},${lt.g},${lt.b})`;
      ctx.shadowBlur  = lit ? 10 * nightAlpha : 0;
      ctx.beginPath();
      ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  // ── Street light glows (additive, after night overlay) ──────
  // Must be called AFTER the dark night overlay rect so the
  // additive ('lighter') compositing punches through the darkness.
  // ctx must be translated to world-space by the caller.
  renderStreetLightGlows(ctx, camX, camY, canvasW, canvasH, nightAlpha) {
    if (!this.streetLights || !this.streetLights.length || nightAlpha < 0.01) return;
    const margin = 120;
    const x0 = camX - margin, y0 = camY - margin;
    const x1 = camX + canvasW + margin, y1 = camY + canvasH + margin;
    const S  = this.S;
    const a  = nightAlpha; // 0 → 1

    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; // additive blending

    for (const lt of this.streetLights) {
      if (lt.wx < x0 || lt.wx > x1 || lt.wy < y0 || lt.wy > y1) continue;

      const lx = lt.wx + lt.armDx * (S * 0.44);
      const ly = lt.wy + lt.armDy * (S * 0.44);
      const { r, g, b } = lt;

      // Tight halo around the bulb
      const halo = ctx.createRadialGradient(lx, ly, 0, lx, ly, 24);
      halo.addColorStop(0,   `rgba(${r},${g},${b},${(a * 0.70).toFixed(3)})`);
      halo.addColorStop(0.4, `rgba(${r},${g},${b},${(a * 0.30).toFixed(3)})`);
      halo.addColorStop(1,   `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(lx, ly, 24, 0, Math.PI * 2);
      ctx.fill();

      // Wide soft ground pool (slightly oval, follows arm direction)
      const poolRx = lt.armDy !== 0 ? 52 : 72; // wider perpendicular to arm
      const poolRy = lt.armDy !== 0 ? 72 : 52;
      const pool = ctx.createRadialGradient(lx, ly, 0, lx, ly, Math.max(poolRx, poolRy));
      pool.addColorStop(0,   `rgba(${r},${g},${b},${(a * 0.22).toFixed(3)})`);
      pool.addColorStop(0.5, `rgba(${r},${g},${b},${(a * 0.09).toFixed(3)})`);
      pool.addColorStop(1,   `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = pool;
      ctx.beginPath();
      ctx.ellipse(lx, ly, poolRx, poolRy, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ── Cactus decoration generation (desert maps) ───────────
  _buildCacti() {
    this.cacti = [];
    if (!this.config.desert) return;
    const T = this.S, W = this.W, H = this.H;
    for (let ty = 1; ty < H - 1; ty++) {
      for (let tx = 1; tx < W - 1; tx++) {
        if (this.tiles[ty][tx] !== TILE.SIDEWALK) continue;
        // Sparse placement: deterministic hash for spacing
        if (((tx * 13 + ty * 7) >>> 0) % 6 !== 0) continue;
        const wx = tx * T + T * 0.5 + (Math.random() - 0.5) * T * 0.38;
        const wy = ty * T + T * 0.5 + (Math.random() - 0.5) * T * 0.38;
        const h = 18 + Math.random() * 26;
        const style = Math.floor(Math.random() * 3); // 0=tall, 1=double-arm, 2=squat
        this.cacti.push({ wx, wy, h, style });
      }
    }
  }

  renderCacti(ctx, camX, camY, canvasW, canvasH) {
    if (!this.cacti || !this.cacti.length) return;
    for (const c of this.cacti) {
      const sx = c.wx - camX + canvasW * 0.5;
      const sy = c.wy - camY + canvasH * 0.5;
      if (sx < -80 || sx > canvasW + 80 || sy < -80 || sy > canvasH + 80) continue;
      this._drawCactus(ctx, sx, sy, c.h, c.style);
    }
  }

  _drawCactus(ctx, x, y, h, style) {
    const w = h * 0.20;
    ctx.save();
    ctx.shadowColor = '#000'; ctx.shadowBlur = 4;

    const cg = ctx.createLinearGradient(x - w, y, x + w, y);
    cg.addColorStop(0, '#2a6018'); cg.addColorStop(0.45, '#3a8028'); cg.addColorStop(1, '#2a6018');
    ctx.fillStyle = cg;

    // Main trunk
    ctx.beginPath();
    ctx.roundRect(x - w, y - h, w * 2, h, w * 0.85);
    ctx.fill();

    if (style === 1 || style === 0) {
      // Left arm: horizontal elbow then upward
      const ay = y - h * 0.52;
      const aw = w * 0.78, ah = h * 0.36;
      ctx.beginPath(); ctx.roundRect(x - w * 3.2, ay, w * 2.5, w * 1.5, w * 0.6); ctx.fill();
      ctx.beginPath(); ctx.roundRect(x - w * 3.2 - aw * 0.1, ay - ah, aw * 1.0, ah, w * 0.7); ctx.fill();
    }
    if (style === 1) {
      // Right arm
      const ay = y - h * 0.38;
      const aw = w * 0.78, ah = h * 0.28;
      ctx.beginPath(); ctx.roundRect(x + w * 0.8, ay, w * 2.4, w * 1.5, w * 0.6); ctx.fill();
      ctx.beginPath(); ctx.roundRect(x + w * 0.8 + aw * 0.05, ay - ah, aw * 1.0, ah, w * 0.7); ctx.fill();
    }

    ctx.shadowBlur = 0;

    // Spine dots down the trunk
    ctx.fillStyle = 'rgba(255,255,220,0.30)';
    const spines = style === 2 ? 4 : 6;
    for (let i = 0; i < spines; i++) {
      const sy2 = y - h * 0.08 - i * h * (0.82 / spines);
      ctx.beginPath(); ctx.arc(x - w * 1.12, sy2, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w * 1.12, sy2, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    // Top rounded nub
    ctx.fillStyle = '#226610';
    ctx.beginPath(); ctx.arc(x, y - h, w * 0.88, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
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
          if (cfg.jungle) {
            // Jungle: dirt path with rocks and sand
            const pathSeed = x * 17 + y * 31;
            const pathVariant = pathSeed % 5;

            // Base dirt color
            const dirtGrad = ctx.createLinearGradient(wx, wy, wx + S, wy + S);
            if (pathVariant < 2) {
              // Brown dirt
              dirtGrad.addColorStop(0, '#5a3d1e');
              dirtGrad.addColorStop(0.5, '#6a4a28');
              dirtGrad.addColorStop(1, '#4a3018');
            } else if (pathVariant < 4) {
              // Sandy path
              dirtGrad.addColorStop(0, '#8a7a5a');
              dirtGrad.addColorStop(0.5, '#9a8a68');
              dirtGrad.addColorStop(1, '#7a6a4a');
            } else {
              // Rocky path
              dirtGrad.addColorStop(0, '#4a4a48');
              dirtGrad.addColorStop(0.5, '#5a5a55');
              dirtGrad.addColorStop(1, '#3a3a38');
            }
            ctx.fillStyle = dirtGrad;
            ctx.fillRect(wx, wy, S, S);

            // Random rocks on path
            if ((x * 7 + y * 11) % 8 === 0) {
              ctx.fillStyle = '#6a6a68';
              ctx.beginPath();
              ctx.ellipse(wx + 20 + (pathSeed % 30), wy + 25 + (pathSeed % 25), 8, 6, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#5a5a58';
              ctx.beginPath();
              ctx.ellipse(wx + 50 + (pathSeed % 20), wy + 55 + (pathSeed % 15), 6, 4, 0, 0, Math.PI * 2);
              ctx.fill();
            }

            // Path edge grass tufts
            ctx.fillStyle = 'rgba(60,120,40,0.4)';
            if ((x + y) % 3 === 0) {
              ctx.fillRect(wx, wy, 8, 4);
              ctx.fillRect(wx + S - 8, wy + S - 4, 8, 4);
            }

            // Footprint marks occasionally
            if ((x * 5 + y * 3) % 12 === 0) {
              ctx.fillStyle = 'rgba(40,30,15,0.3)';
              ctx.beginPath();
              ctx.ellipse(wx + S/3, wy + S/2, 5, 8, 0.3, 0, Math.PI * 2);
              ctx.fill();
              ctx.beginPath();
              ctx.ellipse(wx + S/2 + 10, wy + S/2 + 15, 5, 8, -0.2, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (cfg.ocean) {
            // Ocean water rendering
            const wavePhase = (Date.now() * 0.001 + x * 0.3 + y * 0.2) % (Math.PI * 2);
            const waveIntensity = Math.sin(wavePhase) * 0.15 + 0.85;

            // Deep water base
            const waterGrad = ctx.createLinearGradient(wx, wy, wx + S, wy + S);
            waterGrad.addColorStop(0, `rgba(0,40,80,${waveIntensity})`);
            waterGrad.addColorStop(0.5, `rgba(0,60,100,${waveIntensity})`);
            waterGrad.addColorStop(1, `rgba(0,50,90,${waveIntensity})`);
            ctx.fillStyle = waterGrad;
            ctx.fillRect(wx, wy, S, S);

            // Wave highlights
            const waveY = wy + S * 0.3 + Math.sin(wavePhase) * 5;
            ctx.strokeStyle = 'rgba(100,200,255,0.15)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(wx, waveY);
            ctx.quadraticCurveTo(wx + S/2, waveY - 4, wx + S, waveY);
            ctx.stroke();

            const waveY2 = wy + S * 0.65 + Math.sin(wavePhase + 1) * 4;
            ctx.strokeStyle = 'rgba(80,180,255,0.12)';
            ctx.beginPath();
            ctx.moveTo(wx, waveY2);
            ctx.quadraticCurveTo(wx + S/2, waveY2 + 3, wx + S, waveY2);
            ctx.stroke();

            // Occasional foam/sparkle
            if ((x * 7 + y * 13) % 11 === 0) {
              ctx.fillStyle = 'rgba(200,240,255,0.25)';
              ctx.beginPath();
              ctx.arc(wx + S * 0.3 + Math.sin(wavePhase * 2) * 5, wy + S * 0.5, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
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
          }
        } else if (tile === TILE.SIDEWALK) {
          const isPark = this._parkTiles && this._parkTiles.has(`${x},${y}`);
          if (cfg.jungle) {
            // Jungle: grass and undergrowth
            const grassSeed = x * 23 + y * 37;

            // Base grass
            const grassGrad = ctx.createLinearGradient(wx, wy, wx + S, wy + S);
            grassGrad.addColorStop(0, '#2a4a20');
            grassGrad.addColorStop(0.5, '#3a5a28');
            grassGrad.addColorStop(1, '#1a3a18');
            ctx.fillStyle = grassGrad;
            ctx.fillRect(wx, wy, S, S);

            // Grass texture variation
            ctx.fillStyle = 'rgba(50,100,40,0.3)';
            ctx.fillRect(wx + 5 + (grassSeed % 20), wy + 5 + (grassSeed % 20), 25, 18);

            // Tall grass tufts
            ctx.strokeStyle = '#4a8a38';
            ctx.lineWidth = 1.5;
            const tufts = 3 + (grassSeed % 3);
            for (let t = 0; t < tufts; t++) {
              const tx = wx + 10 + ((grassSeed + t * 17) % 55);
              const ty = wy + S - 5;
              const th = 12 + (grassSeed + t) % 10;
              ctx.beginPath();
              ctx.moveTo(tx, ty);
              ctx.quadraticCurveTo(tx - 3 + (t % 2) * 6, ty - th/2, tx + (t % 2 ? 4 : -4), ty - th);
              ctx.stroke();
            }

            // Flowers occasionally
            if ((x * 3 + y * 7) % 13 === 0) {
              const flowerColors = ['#FF6688', '#FFEE44', '#FF88FF', '#88DDFF'];
              ctx.fillStyle = flowerColors[grassSeed % 4];
              ctx.beginPath();
              ctx.arc(wx + 25 + (grassSeed % 30), wy + 35 + (grassSeed % 25), 4, 0, Math.PI * 2);
              ctx.fill();
            }

            // Small ferns
            if ((x * 5 + y * 3) % 7 === 0) {
              ctx.fillStyle = '#2a6a28';
              ctx.beginPath();
              ctx.ellipse(wx + S/2, wy + S/2 + 10, 12, 6, 0.2, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (cfg.ocean) {
            // Ocean: floating wooden dock/platform
            const dockGrad = ctx.createLinearGradient(wx, wy, wx, wy + S);
            dockGrad.addColorStop(0, '#3a2a1a');
            dockGrad.addColorStop(0.5, '#4a3a28');
            dockGrad.addColorStop(1, '#2a1a10');
            ctx.fillStyle = dockGrad;
            ctx.fillRect(wx + 2, wy + 2, S - 4, S - 4);

            // Wooden plank lines
            ctx.strokeStyle = 'rgba(80,60,40,0.6)';
            ctx.lineWidth = 1;
            for (let pl = 0; pl < 4; pl++) {
              const plY = wy + 8 + pl * (S - 16) / 3;
              ctx.beginPath();
              ctx.moveTo(wx + 4, plY);
              ctx.lineTo(wx + S - 4, plY);
              ctx.stroke();
            }

            // Dock edge highlight
            ctx.strokeStyle = 'rgba(100,80,60,0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(wx + 3, wy + 3, S - 6, S - 6);

            // Rope/mooring post occasionally
            if ((x * 5 + y * 3) % 9 === 0) {
              ctx.fillStyle = '#5a4a3a';
              ctx.beginPath();
              ctx.arc(wx + S/2, wy + S/2, 5, 0, Math.PI * 2);
              ctx.fill();
              // Rope coil
              ctx.strokeStyle = '#8a7a5a';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(wx + S/2, wy + S/2, 8, 0, Math.PI * 1.5);
              ctx.stroke();
            }
          } else if (isPark) {
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
          // Building (or Tree in jungle)
          if (cfg.jungle) {
            // Jungle: render trees instead of buildings
            const treeSeed = x * 41 + y * 59;
            const treeType = treeSeed % 5;

            // Ground under tree
            ctx.fillStyle = '#1a3010';
            ctx.fillRect(wx, wy, S, S);

            // Tree shadow
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(wx + S/2 + 8, wy + S - 12, 28, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Tree trunk
            const trunkWidth = 8 + (treeSeed % 6);
            const trunkHeight = 25 + (treeSeed % 15);
            ctx.fillStyle = '#4a3018';
            ctx.fillRect(wx + S/2 - trunkWidth/2, wy + S - trunkHeight - 8, trunkWidth, trunkHeight);
            // Trunk texture
            ctx.strokeStyle = '#3a2010';
            ctx.lineWidth = 1;
            for (let tl = 0; tl < 3; tl++) {
              ctx.beginPath();
              ctx.moveTo(wx + S/2 - trunkWidth/2 + 2, wy + S - trunkHeight - 5 + tl * 8);
              ctx.lineTo(wx + S/2 + trunkWidth/2 - 2, wy + S - trunkHeight + tl * 8);
              ctx.stroke();
            }

            // Tree canopy based on type
            ctx.save();
            if (treeType < 2) {
              // Round tree (like oak)
              ctx.shadowColor = '#228B22';
              ctx.shadowBlur = 15;
              ctx.fillStyle = '#1a5a18';
              ctx.beginPath();
              ctx.arc(wx + S/2, wy + S/2 - 10, 30, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#2a7a28';
              ctx.beginPath();
              ctx.arc(wx + S/2 - 8, wy + S/2 - 18, 20, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#3a8a38';
              ctx.beginPath();
              ctx.arc(wx + S/2 + 10, wy + S/2 - 5, 18, 0, Math.PI * 2);
              ctx.fill();
            } else if (treeType < 4) {
              // Palm tree style
              ctx.shadowColor = '#44AA22';
              ctx.shadowBlur = 12;
              // Palm fronds
              const frondCount = 6;
              for (let f = 0; f < frondCount; f++) {
                const angle = (f / frondCount) * Math.PI * 2;
                const fx = wx + S/2 + Math.cos(angle) * 25;
                const fy = wy + S/2 - 15 + Math.sin(angle) * 12;
                ctx.fillStyle = '#2a6a20';
                ctx.beginPath();
                ctx.ellipse(fx, fy, 18, 6, angle, 0, Math.PI * 2);
                ctx.fill();
              }
              // Palm center
              ctx.fillStyle = '#3a8a30';
              ctx.beginPath();
              ctx.arc(wx + S/2, wy + S/2 - 15, 8, 0, Math.PI * 2);
              ctx.fill();
            } else {
              // Bushy tree
              ctx.shadowColor = '#228B22';
              ctx.shadowBlur = 10;
              ctx.fillStyle = '#1a4a15';
              ctx.beginPath();
              ctx.arc(wx + S/2, wy + S/2, 28, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#2a5a25';
              ctx.beginPath();
              ctx.arc(wx + S/2 - 12, wy + S/2 - 8, 15, 0, Math.PI * 2);
              ctx.fill();
              ctx.beginPath();
              ctx.arc(wx + S/2 + 12, wy + S/2 - 5, 16, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#3a6a35';
              ctx.beginPath();
              ctx.arc(wx + S/2, wy + S/2 - 15, 12, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();

            // Occasional vines
            if ((x * 3 + y * 7) % 11 === 0) {
              ctx.strokeStyle = '#3a7a30';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(wx + S/2 - 15, wy + S/2 - 20);
              ctx.quadraticCurveTo(wx + S/2 - 25, wy + S/2 + 10, wx + S/2 - 20, wy + S - 10);
              ctx.stroke();
            }
          } else {
            ctx.fillStyle = this.buildingColors[y][x];
            ctx.fillRect(wx, wy, S, S);
            // Edge highlight
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            ctx.fillRect(wx, wy, S, 3);
            ctx.fillRect(wx, wy, 3, S);
          }

          // ── Metropolis zone-specific building decoration ────
          if (this._rxSet && !cfg.jungle) {
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

          // Windows (not in jungle)
          if (!cfg.jungle && this.buildingWindows[y][x]) {
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
          // Fireflies in jungle trees
          if (cfg.jungle && (x * 7 + y * 11) % 9 === 0) {
            const fireflyPhase = (Date.now() * 0.003 + x + y) % (Math.PI * 2);
            const fireflyAlpha = Math.sin(fireflyPhase) * 0.5 + 0.5;
            ctx.save();
            ctx.globalAlpha = fireflyAlpha * 0.8;
            ctx.fillStyle = '#FFFF44';
            ctx.shadowColor = '#FFFF44';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(wx + 20 + (x * 13) % 40, wy + 25 + (y * 17) % 30, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          // Neon sign strips (not in jungle)
          if (!cfg.jungle && (x + y) % cfg.neonFreq === 0) {
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
