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

// Larger showroom for Neon City dealership (0=floor, 1=wall)
const ROOM_LAYOUT_DEALER_NEON = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1],  // door gap cols 7-10
]; // 18×12 tiles, 60px each → 1080×720 px

// Larger room for Neon City Arcade (0=floor, 1=wall)
const ROOM_LAYOUT_ARCADE_NEON = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1],  // door gap cols 7-10
]; // 18×14 tiles, 60px each → 1080×840 px

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

// ── Tower floor layout ──────────────────────────────────────────────────────
// 22 wide × 16 tall  (0 = walkable floor, 1 = wall/pillar)
// Elevator zone visually at right-center (cols 18-20, rows 5-10) — all walkable
const TOWER_FLOOR_LAYOUT = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // row  0 — top wall
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // row  1
  [1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1], // row  2 — pillars
  [1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1], // row  3
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // row  4
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // row  5
  [1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1], // row  6 — center pillars
  [1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1], // row  7
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // row  8
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // row  9
  [1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1], // row 10 — center pillars
  [1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1], // row 11
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // row 12
  [1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1], // row 13 — pillars
  [1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1], // row 14
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // row 15 — bottom wall
];

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
          if (this.config.sky) {
            mctx.fillStyle = 'rgba(240,250,255,0.88)'; // white clouds on sky minimap
          } else if (this._rxSet) {
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
    if (this.config.tower)      { this._generateTower();      return; }
    if (this.config.sky)        { this._generateSky();        return; }

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

  // ── Tower: 10-floor building generation ──────────────────
  _generateTower() {
    this._towerFloor = 1;
    for (let y = 0; y < this.H; y++) {
      this.tiles[y]           = [];
      this.buildingColors[y]  = [];
      this.buildingWindows[y] = [];
      for (let x = 0; x < this.W; x++) {
        this.tiles[y][x]          = TOWER_FLOOR_LAYOUT[y][x] === 1 ? TILE.BUILDING : TILE.ROAD;
        this.buildingColors[y][x]  = '#6a4a2a';
        this.buildingWindows[y][x] = false;
      }
    }
    // Elevator world-space center (cols 19-20, rows 7-8 center)
    this.elevatorX = 19.5 * this.S;
    this.elevatorY =  7.5 * this.S;
    // No doors, portals, metro, street lights, cacti
    this.doors = []; this._doorMap = new Map();
    this.portals = []; this.metroEntrance = null;
    this.streetLights = []; this.cacti = [];
    this._blockTypes = {};
  }

  // ── Sky Realm: open sky with cloud-cluster obstacles ──────
  _generateSky() {
    const W = this.W, H = this.H, S = this.S;
    // All tiles start as open sky (walkable)
    for (let y = 0; y < H; y++) {
      this.tiles[y] = []; this.buildingColors[y] = []; this.buildingWindows[y] = [];
      for (let x = 0; x < W; x++) {
        this.tiles[y][x] = TILE.ROAD;
        this.buildingColors[y][x] = '#FFFFFF'; this.buildingWindows[y][x] = false;
      }
    }
    // Scatter cloud formations as solid obstacles (2–4 wide, 1–2 tall)
    for (let c = 0; c < 24; c++) {
      const cx = 2 + Math.floor(Math.random() * (W - 4));
      const cy = 2 + Math.floor(Math.random() * (H - 4));
      const cw = 2 + Math.floor(Math.random() * 3);
      const ch = 1 + Math.floor(Math.random() * 2);
      for (let dy = 0; dy < ch; dy++) {
        for (let dx = 0; dx < cw; dx++) {
          const tx = cx + dx, ty = cy + dy;
          if (tx >= 1 && tx < W - 1 && ty >= 1 && ty < H - 1)
            this.tiles[ty][tx] = TILE.BUILDING;
        }
      }
    }
    // Clear centre 7×7 so the player always spawns in open air
    const mx = Math.floor(W / 2), my = Math.floor(H / 2);
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++)
        if (mx+dx >= 0 && mx+dx < W && my+dy >= 0 && my+dy < H)
          this.tiles[my+dy][mx+dx] = TILE.ROAD;
    // No doors, portals, metro, lights, or cacti
    this.doors = []; this._doorMap = new Map();
    this.portals = []; this.metroEntrance = null;
    this.streetLights = []; this.cacti = [];
    this._blockTypes = {};

    // ── Pre-render cloud tile once → replace 7 ellipses/tile/frame with 1 drawImage ──
    const cc = document.createElement('canvas');
    cc.width = S; cc.height = S;
    const cx2 = cc.getContext('2d');
    cx2.fillStyle = '#5aa0cc'; cx2.fillRect(0, 0, S, S);
    cx2.globalAlpha = 0.18; cx2.fillStyle = '#8aaabb';
    cx2.beginPath(); cx2.ellipse(S*0.52, S*0.88, S*0.42, S*0.10, 0, 0, Math.PI*2); cx2.fill();
    cx2.globalAlpha = 1; cx2.fillStyle = '#ecf4fc';
    cx2.beginPath(); cx2.ellipse(S*0.50, S*0.72, S*0.44, S*0.28, 0, 0, Math.PI*2); cx2.fill();
    cx2.beginPath(); cx2.ellipse(S*0.27, S*0.62, S*0.30, S*0.22, 0, 0, Math.PI*2); cx2.fill();
    cx2.beginPath(); cx2.ellipse(S*0.73, S*0.60, S*0.28, S*0.20, 0, 0, Math.PI*2); cx2.fill();
    cx2.beginPath(); cx2.ellipse(S*0.50, S*0.44, S*0.36, S*0.26, 0, 0, Math.PI*2); cx2.fill();
    cx2.fillStyle = '#FFFFFF';
    cx2.beginPath(); cx2.ellipse(S*0.38, S*0.36, S*0.22, S*0.15, -0.2, 0, Math.PI*2); cx2.fill();
    cx2.beginPath(); cx2.ellipse(S*0.55, S*0.28, S*0.16, S*0.12,  0.1, 0, Math.PI*2); cx2.fill();
    this._skyCloudCanvas = cc;
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
    // Desert: warm oil-lamp amber only. Galactica: purple/cyan alien glows. City: amber, cool-white, pink, cyan
    const PAL = this.config.desert ? [
      [255, 160,  40],
      [255, 145,  30],
      [255, 180,  60],
    ] : this.config.galactica ? [
      [170,  68, 255],
      [255,  68, 170],
      [ 68, 170, 255],
      [ 68, 255, 170],
    ] : [
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
    if (!this.streetLights || !this.streetLights.length) return;
    // Only render light poles during dark/night on neon city
    if (this.config.id === 'neon_city' && nightAlpha < 0.01) return;
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

      // ── Lamp housing (dome) ───────────────────────────────────
      ctx.fillStyle = '#1e1e2e';
      ctx.beginPath(); ctx.arc(lx, ly, 6, 0, Math.PI * 2); ctx.fill();
      // Bottom rim
      ctx.fillStyle = 'rgba(80,80,110,0.60)';
      ctx.fillRect(lx - 6, ly + 3, 12, 2);

      // ── Bulb (dim off-state during day, bright at night) ─────
      const isNeonCity = this.config.id === 'neon_city';
      const bulbAlpha = lit ? 0.65 + nightAlpha * 0.35 : 0.18;
      // Outer glow ring (night only) - smaller for neon city
      if (lit && nightAlpha > 0.05) {
        ctx.globalAlpha = nightAlpha * 0.45;
        ctx.fillStyle   = `rgba(${lt.r},${lt.g},${lt.b},1)`;
        ctx.beginPath(); ctx.arc(lx, ly, isNeonCity ? 8 : 14, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = nightAlpha * 0.70;
        ctx.beginPath(); ctx.arc(lx, ly, isNeonCity ? 5 : 9, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Core bulb - smaller for neon city
      ctx.fillStyle   = `rgba(${lt.r},${lt.g},${lt.b},${bulbAlpha})`;
      ctx.beginPath(); ctx.arc(lx, ly, isNeonCity ? 2.5 : 4.5, 0, Math.PI * 2); ctx.fill();
      // Hot white center
      if (lit) {
        ctx.globalAlpha = nightAlpha * 0.85;
        ctx.fillStyle = `rgba(255,255,255,1)`;
        ctx.beginPath(); ctx.arc(lx, ly, isNeonCity ? 1.2 : 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
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
    const isNeonCity = this.config.id === 'neon_city';

    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; // additive blending

    for (const lt of this.streetLights) {
      if (lt.wx < x0 || lt.wx > x1 || lt.wy < y0 || lt.wy > y1) continue;

      const lx = lt.wx + lt.armDx * (S * 0.44);
      const ly = lt.wy + lt.armDy * (S * 0.44);
      const { r, g, b } = lt;
      // Ground pool direction: arm points toward road, so light pools there
      const poolDist = isNeonCity ? 18 : 28;
      const poolX = lx + lt.armDx * poolDist;
      const poolY = ly + lt.armDy * poolDist;

      // ── Large soft ground pool via radial gradient ───────────
      // Neon City: smaller, more focused lights
      const poolR = isNeonCity ? 55 : 110;
      const grd = ctx.createRadialGradient(poolX, poolY, 2, poolX, poolY, poolR);
      grd.addColorStop(0,    `rgba(${r},${g},${b},${a * (isNeonCity ? 0.50 : 0.38)})`);
      grd.addColorStop(0.22, `rgba(${r},${g},${b},${a * (isNeonCity ? 0.30 : 0.22)})`);
      grd.addColorStop(0.55, `rgba(${r},${g},${b},${a * 0.08})`);
      grd.addColorStop(1,    `rgba(${r},${g},${b},0)`);
      ctx.globalAlpha = 1;
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.ellipse(poolX, poolY, poolR, poolR * 0.72, 0, 0, Math.PI * 2); ctx.fill();

      // ── Mid halo ring around the lamp head ────────────────────
      const haloR = isNeonCity ? 20 : 38;
      const haloGrd = ctx.createRadialGradient(lx, ly, 1, lx, ly, haloR);
      haloGrd.addColorStop(0,    `rgba(${r},${g},${b},${a * 0.70})`);
      haloGrd.addColorStop(0.35, `rgba(${r},${g},${b},${a * 0.28})`);
      haloGrd.addColorStop(1,    `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = haloGrd;
      ctx.beginPath(); ctx.arc(lx, ly, haloR, 0, Math.PI * 2); ctx.fill();

      // ── Bright bulb core ──────────────────────────────────────
      ctx.globalAlpha = a * 0.90;
      ctx.fillStyle = `rgba(${Math.min(255,r+60)},${Math.min(255,g+60)},${Math.min(255,b+60)},1)`;
      const coreR = isNeonCity ? 4 : 7;
      ctx.beginPath(); ctx.arc(lx, ly, coreR, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
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

  // ── Tower elevator rendering ──────────────────────────────
  // Called from game.js render loop in world-space (already translated)
  renderTowerElevator(ctx, active, floor) {
    if (!this.config.tower) return;
    const ex = this.elevatorX, ey = this.elevatorY;
    const w = this.S * 1.6, h = this.S * 2.0;
    const t = Date.now() * 0.001;

    ctx.save();

    // 10 UNIQUE elevator colors — one for each floor
    const DOOR_COLORS = [
      '#C0A060', // floor 0 (unused)
      '#E8D8B8', // floor 1: Lobby — cream gold
      '#505050', // floor 2: Parking — grey (NIGHT)
      '#8B6520', // floor 3: Office — wood brown
      '#00CCFF', // floor 4: Server — cyan (NIGHT)
      '#AA3030', // floor 5: Lounge — deep red
      '#3344AA', // floor 6: Security — blue (NIGHT)
      '#50C080', // floor 7: Lab — green
      '#FF6030', // floor 8: Armory — orange (NIGHT)
      '#8844CC', // floor 9: Executive — purple
      '#FFD700', // floor 10: Penthouse — gold (Boss)
    ];
    const GLOW_COLORS = [
      '#B08040', // floor 0 (unused)
      '#D0C090', // floor 1
      '#404040', // floor 2
      '#705010', // floor 3
      '#00AADD', // floor 4
      '#882020', // floor 5
      '#2233AA', // floor 6
      '#40A060', // floor 7
      '#DD4020', // floor 8
      '#6633AA', // floor 9
      '#FFD700', // floor 10
    ];
    const doorCol = DOOR_COLORS[Math.min(floor, 10)] || DOOR_COLORS[1];
    const glowCol = GLOW_COLORS[Math.min(floor, 10)] || GLOW_COLORS[1];

    // ── Wide glow halo when active ──────────────────────────
    if (active) {
      const pulse = Math.sin(t * 3.5) * 0.3 + 0.7;
      // Outer soft halo
      ctx.globalAlpha = pulse * 0.35;
      ctx.fillStyle = glowCol;
      ctx.beginPath(); ctx.ellipse(ex, ey, w*1.5, h*0.65, 0, 0, Math.PI*2); ctx.fill();
      // Inner tighter glow
      ctx.globalAlpha = pulse * 0.55;
      ctx.beginPath(); ctx.ellipse(ex, ey, w*0.9, h*0.5, 0, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Elevator shaft surround (dark trim)
    ctx.fillStyle = '#181410';
    ctx.fillRect(ex - w/2 - 6, ey - h/2 - 6, w + 12, h + 12);
    // Gold/colored trim border
    ctx.fillStyle = active ? glowCol : '#4a3a28';
    ctx.fillRect(ex - w/2 - 6, ey - h/2 - 6, w + 12, 3);
    ctx.fillRect(ex - w/2 - 6, ey + h/2 + 3, w + 12, 3);
    ctx.fillRect(ex - w/2 - 6, ey - h/2 - 6, 3, h + 12);
    ctx.fillRect(ex + w/2 + 3, ey - h/2 - 6, 3, h + 12);

    // Door panels (split open when active, slide apart)
    const openAmt = active ? Math.min(1, ((Math.sin(t * 2) + 1) / 2) * 0.6 + 0.4) : 0;
    const panelW  = (w / 2) * (1 - openAmt * 0.85);

    // Left door with sheen
    ctx.fillStyle = doorCol;
    ctx.fillRect(ex - w/2, ey - h/2, panelW, h);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(ex - w/2, ey - h/2, 4, h);
    // Right door with sheen
    ctx.fillStyle = doorCol;
    ctx.fillRect(ex + w/2 - panelW, ey - h/2, panelW, h);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(ex + w/2 - panelW, ey - h/2, 4, h);

    // Elevator interior when open
    if (openAmt > 0.4) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(ex - w/2 + panelW, ey - h/2, w - panelW*2, h);
      // Interior back wall lines
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      for (let ln=1; ln<=3; ln++) {
        ctx.fillRect(ex - w/2 + panelW, ey - h/2 + h*(ln/4), w - panelW*2, 1);
      }
    }

    // Centre seam
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(ex - 1, ey - h/2, 2, h);

    // Floor indicator display (above elevator)
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    if (active) { ctx.shadowColor = glowCol; ctx.shadowBlur = 16; }
    ctx.fillStyle = active ? glowCol : '#665544';
    ctx.fillText(active ? '▲  ENTER ELEVATOR' : '▲', ex, ey - h/2 - 10);
    ctx.shadowBlur = 0;

    // Panel buttons (small dots on frame)
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i === 0 && active ? '#00FF88' : '#333';
      ctx.beginPath();
      ctx.arc(ex + w/2 + 10, ey - h/4 + i * 14, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
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
    // Flat green — no shadowBlur for performance
    ctx.fillStyle = '#347022';

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
    // Sky: pick any non-cloud tile
    if (this.config.sky) {
      const S = this.S;
      let tx, ty, tries = 0;
      do {
        tx = 1 + Math.floor(Math.random() * (this.W - 2));
        ty = 1 + Math.floor(Math.random() * (this.H - 2));
        tries++;
      } while (this.tiles[ty] && this.tiles[ty][tx] !== TILE.ROAD && tries < 50);
      return new Vec2((tx + 0.5) * S, (ty + 0.5) * S);
    }
    // Tower: pick random walkable floor tile far from walls
    if (this.config.tower) {
      const S = this.S;
      let tx, ty, tries = 0;
      do {
        tx = 1 + Math.floor(Math.random() * (this.W - 2));
        ty = 1 + Math.floor(Math.random() * (this.H - 2));
        tries++;
      } while (this.tiles[ty] && this.tiles[ty][tx] !== TILE.ROAD && tries < 40);
      return new Vec2((tx + 0.5) * S, (ty + 0.5) * S);
    }
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

    // Pre-compute time-based wave offset once per frame (not per tile)
    const _waveNow  = cfg.ocean  ? Date.now() * 0.001 : 0;
    const _towerNow = cfg.tower  ? Date.now() * 0.001 : 0;

    for (let y = sy; y <= ey; y++) {
      for (let x = sx; x <= ex; x++) {
        const wx   = x * S, wy = y * S;
        const tile = this.tiles[y][x];
        // For metropolis use actual road sets; otherwise use modulo
        const isColR = this._rxSet ? this._rxSet.has(x) : (x % R === 0);
        const isRowR = this._rySet ? this._rySet.has(y) : (y % R === 0);

        if (tile === TILE.ROAD) {
          if (cfg.tower) {
            // ═══════════════════════════════════════════════════════════
            //  TOWER FLOORS — 10 fully unique, beautiful floor designs
            // ═══════════════════════════════════════════════════════════
            const fl  = this._towerFloor || 1;
            const t   = _towerNow;
            const ts  = x * 13 + y * 7; // deterministic tile seed

            if (fl === 1) {
              // ── F1: GRAND LOBBY — White marble checkerboard, gold inlay ──
              const checker = (Math.floor(x/2) + Math.floor(y/2)) % 2 === 0;
              ctx.fillStyle = checker ? '#f4f0e8' : '#e8e2d4';
              ctx.fillRect(wx, wy, S, S);
              // Hairline gold grout
              ctx.fillStyle = 'rgba(190,155,80,0.24)';
              ctx.fillRect(wx, wy, S, 1); ctx.fillRect(wx, wy, 1, S);
              // Large marble vein (deterministic)
              if ((x * 17 + y * 11) % 7 === 0) {
                ctx.fillStyle = 'rgba(170,148,108,0.14)';
                ctx.fillRect(wx + ts%40, wy, 2, S);
              }
              if ((x * 11 + y * 13) % 9 === 0) {
                ctx.fillStyle = 'rgba(160,140,100,0.10)';
                ctx.fillRect(wx, wy + ts%40, S, 2);
              }
              // Ornate gold medallion at every 4×4 center
              if (x % 4 === 2 && y % 4 === 2) {
                ctx.fillStyle = 'rgba(210,175,70,0.22)';
                ctx.beginPath(); ctx.arc(wx+S*.5, wy+S*.5, S*.28, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = 'rgba(230,195,90,0.16)';
                ctx.beginPath(); ctx.arc(wx+S*.5, wy+S*.5, S*.17, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = 'rgba(210,175,70,0.22)';
                ctx.fillRect(wx+S*.47, wy+S*.15, S*.06, S*.70);
                ctx.fillRect(wx+S*.15, wy+S*.47, S*.70, S*.06);
              }
              // Subtle warm light from ceiling
              if ((x + y) % 6 === 0) { ctx.fillStyle='rgba(255,230,160,0.04)'; ctx.fillRect(wx,wy,S,S); }

            } else if (fl === 2) {
              // ── F2: PARKING GARAGE — Raw concrete, glowing lane markings ──
              const greys = ['#252525','#222222','#282828','#242424','#272727'];
              ctx.fillStyle = greys[ts % 5];
              ctx.fillRect(wx, wy, S, S);
              // Concrete panel crack seam
              ctx.fillStyle = 'rgba(0,0,0,0.22)';
              ctx.fillRect(wx, wy, S, 2); ctx.fillRect(wx, wy, 2, S);
              // Glowing yellow lane lines
              if (y % 3 === 1 && x % 2 === 0) {
                ctx.fillStyle = 'rgba(255,200,0,0.55)';
                ctx.fillRect(wx+S*.08, wy+S*.44, S*.84, S*.12);
              }
              // Parking bay diagonal arrows
              if (x % 5 === 2 && y % 4 === 2) {
                ctx.fillStyle = 'rgba(255,210,0,0.32)';
                ctx.fillRect(wx+S*.4, wy+S*.18, S*.2, S*.64);
                ctx.fillRect(wx+S*.22, wy+S*.28, S*.56, S*.18);
              }
              // Oil stain
              if ((x*19+y*13) % 11 === 0) {
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.beginPath(); ctx.ellipse(wx+S*.5, wy+S*.5, S*.28,S*.18, .7, 0, Math.PI*2); ctx.fill();
              }
              // Flickering neon reflection on wet floor
              if ((x+y) % 7 === 0) {
                const flick = Math.sin(t*4 + x*.7 + y*.4) * .3 + .7;
                ctx.fillStyle = `rgba(255,220,0,${flick*.04})`;
                ctx.fillRect(wx, wy, S, S);
              }
              // Wheel track marks
              if (y % 2 === 0 && (ts % 8) < 3) {
                ctx.fillStyle = 'rgba(0,0,0,0.18)';
                ctx.fillRect(wx+S*.15, wy, S*.15, S);
                ctx.fillRect(wx+S*.70, wy, S*.15, S);
              }

            } else if (fl === 3) {
              // ── F3: CORPORATE OFFICES — Rich walnut parquet ──
              const plankIdx = Math.floor(x/2) % 2;
              const woods = ['#7a5220','#6e4818','#825826','#765022','#70481e'];
              ctx.fillStyle = woods[(x*3 + plankIdx) % 5];
              ctx.fillRect(wx, wy, S, S);
              // Horizontal wood grain lines
              for (let g = 1; g <= 5; g++) {
                ctx.fillStyle = `rgba(0,0,0,${g%2===0 ? .05:.03})`;
                ctx.fillRect(wx, wy+S*(g/6), S, 1);
              }
              // Plank boundary every 2 tiles
              if (x % 2 === 0) {
                ctx.fillStyle = 'rgba(0,0,0,0.24)'; ctx.fillRect(wx, wy, 2, S);
              }
              // Wood knot
              if ((x*11+y*17) % 13 === 0) {
                ctx.fillStyle = 'rgba(45,20,5,0.26)';
                ctx.beginPath(); ctx.ellipse(wx+S*.5, wy+S*.5, S*.12, S*.08, .3, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = 'rgba(35,15,5,0.16)';
                ctx.beginPath(); ctx.ellipse(wx+S*.5, wy+S*.5, S*.20, S*.13, .3, 0, Math.PI*2); ctx.fill();
              }
              // Warm overhead light sheen
              if ((x+y) % 5 === 0) { ctx.fillStyle='rgba(255,200,120,0.055)'; ctx.fillRect(wx,wy,S,S); }
              // Cross-direction plank seam (herringbone feel)
              if (y % 4 === 0) { ctx.fillStyle='rgba(0,0,0,0.14)'; ctx.fillRect(wx,wy,S,2); }

            } else if (fl === 4) {
              // ── F4: DATA CENTER — Raised access floor, cyan circuit grid ──
              ctx.fillStyle = '#0a1218'; ctx.fillRect(wx, wy, S, S);
              // Inset panel
              ctx.fillStyle = '#0c1620'; ctx.fillRect(wx+3, wy+3, S-6, S-6);
              // Panel border (cyan glow)
              ctx.fillStyle = 'rgba(0,180,255,0.20)';
              ctx.fillRect(wx, wy, S, 2);   ctx.fillRect(wx, wy, 2, S);
              ctx.fillRect(wx+S-2, wy, 2, S); ctx.fillRect(wx, wy+S-2, S, 2);
              // Animated LED corner
              const ledP = (t*2 + x*.5 + y*.3) % (Math.PI*2);
              const ledV = Math.sin(ledP)*.35 + .65;
              ctx.fillStyle = `rgba(0,255,180,${.55 * ledV})`;
              ctx.beginPath(); ctx.arc(wx+5, wy+5, 2.8, 0, Math.PI*2); ctx.fill();
              // Alternate color LED (red alert status)
              if ((x*7+y*11) % 7 === 0) {
                const rledV = Math.sin(ledP + Math.PI)*.4 + .6;
                ctx.fillStyle = `rgba(255,60,0,${.45 * rledV})`;
                ctx.beginPath(); ctx.arc(wx+S-5, wy+5, 2.8, 0, Math.PI*2); ctx.fill();
              }
              // Circuit traces
              if ((x*7+y*13) % 5 === 0) {
                ctx.fillStyle='rgba(0,160,220,0.14)'; ctx.fillRect(wx+S*.45, wy+10, 3, S-20);
              }
              if ((x*11+y*7) % 5 === 0) {
                ctx.fillStyle='rgba(0,160,220,0.14)'; ctx.fillRect(wx+10, wy+S*.45, S-20, 3);
              }
              // Vent slots
              if ((x*3+y*5) % 7 === 0) {
                for (let sl=0; sl<3; sl++) {
                  ctx.fillStyle='rgba(0,80,140,0.22)'; ctx.fillRect(wx+S*.18, wy+S*.22+sl*13, S*.64, 4);
                }
              }
              // Floor glow from server lights above
              const glow4 = Math.sin(t*.8 + x*.3 + y*.4)*.3 + .7;
              ctx.fillStyle = `rgba(0,40,80,${glow4*.08})`; ctx.fillRect(wx, wy, S, S);

            } else if (fl === 5) {
              // ── F5: VELVET LOUNGE — Deep crimson carpet, gold diamond lattice ──
              const reds = ['#5a1818','#541415','#621c1c'];
              ctx.fillStyle = reds[ts % 3]; ctx.fillRect(wx, wy, S, S);
              // Carpet texture (fibre noise)
              if ((x*7+y*9) % 3 === 0) {
                ctx.fillStyle='rgba(0,0,0,0.07)';
                ctx.fillRect(wx+(ts%20)*3, wy+(ts*3%20)*3, 8, 2);
              }
              // Gold diamond lattice
              ctx.fillStyle = 'rgba(210,170,50,0.20)';
              ctx.fillRect(wx, wy+S*.48, S, 3);
              ctx.fillRect(wx+S*.48, wy, 3, S);
              // Diamond intersection gems
              if ((x+y) % 2 === 0 && x % 2 === 0) {
                ctx.fillStyle='rgba(230,190,70,0.35)';
                ctx.beginPath(); ctx.arc(wx+S*.5, wy+S*.5, 4.5, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle='rgba(255,220,120,0.20)';
                ctx.beginPath(); ctx.arc(wx+S*.5, wy+S*.5, 2, 0, Math.PI*2); ctx.fill();
              }
              // Border gold strip (room edge)
              if (x<=1 || x>=20 || y<=1 || y>=14) {
                ctx.fillStyle='rgba(210,170,50,0.35)'; ctx.fillRect(wx, wy, S, S);
              }
              // Chandelier warm glow pool
              const chPulse = Math.sin(t*.6)*.15 + .85;
              if (x>=9 && x<=12 && y>=6 && y<=9) {
                ctx.fillStyle = `rgba(255,220,100,${chPulse*.10})`; ctx.fillRect(wx, wy, S, S);
              }

            } else if (fl === 6) {
              // ── F6: TACTICAL OPS — Steel grid, hazard stripes, red alerts ──
              const steel = (x+y) % 2 === 0 ? '#1e2228' : '#1a1e24';
              ctx.fillStyle = steel; ctx.fillRect(wx, wy, S, S);
              // Metal grid lines
              ctx.fillStyle='rgba(55,75,95,0.22)';
              ctx.fillRect(wx, wy, S, 1); ctx.fillRect(wx, wy, 1, S);
              // Sub-grid
              ctx.fillStyle='rgba(55,75,95,0.10)';
              ctx.fillRect(wx, wy+S*.5, S, 1); ctx.fillRect(wx+S*.5, wy, 1, S);
              // Hazard border stripes
              if (x<=2 || x>=19 || y<=2 || y>=13) {
                const stripe = Math.floor((x+y)*.5) % 2 === 0;
                ctx.fillStyle = stripe ? 'rgba(235,175,0,0.38)' : 'rgba(0,0,0,0.38)';
                ctx.fillRect(wx, wy, S, S);
              }
              // Drain / ventilation grate holes
              if ((x*5+y*3) % 8 === 0) {
                ctx.fillStyle='rgba(0,0,0,0.50)';
                ctx.beginPath(); ctx.arc(wx+S*.3, wy+S*.3, 4, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(wx+S*.7, wy+S*.7, 4, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(wx+S*.7, wy+S*.3, 4, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(wx+S*.3, wy+S*.7, 4, 0, Math.PI*2); ctx.fill();
              }
              // Animated red emergency flash
              if ((x*17+y*13) % 12 === 0) {
                const flash = Math.sin(t*2.8 + x*.4)*.35 + .35;
                ctx.fillStyle = `rgba(200,0,0,${flash*.10})`; ctx.fillRect(wx, wy, S, S);
              }
              // Footprint scuff
              if ((x*23+y*19) % 15 === 0) {
                ctx.fillStyle='rgba(0,0,0,0.20)';
                ctx.beginPath(); ctx.ellipse(wx+S*.4, wy+S*.5, S*.10, S*.15, .5, 0, Math.PI*2); ctx.fill();
              }

            } else if (fl === 7) {
              // ── F7: BIO-RESEARCH LAB — Sterile white, mint seams, biohazard ──
              ctx.fillStyle = (x+y) % 2 === 0 ? '#edf2ed' : '#e3ece3';
              ctx.fillRect(wx, wy, S, S);
              // Mint green precision grout
              ctx.fillStyle='rgba(30,150,90,0.16)';
              ctx.fillRect(wx, wy, S, 2); ctx.fillRect(wx, wy, 2, S);
              // Biohazard symbol (3-lobe) every 5×5
              if (x % 5 === 2 && y % 5 === 2) {
                ctx.fillStyle='rgba(0,150,75,0.15)';
                ctx.beginPath(); ctx.arc(wx+S*.5, wy+S*.5, S*.28, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle='rgba(237,242,237,.9)';
                ctx.beginPath(); ctx.arc(wx+S*.5, wy+S*.5, S*.14, 0, Math.PI*2); ctx.fill();
                for (let l=0; l<3; l++) {
                  const ang = l*(Math.PI*2/3) - Math.PI/2;
                  const lx = wx+S*.5 + Math.cos(ang)*S*.13;
                  const ly = wy+S*.5 + Math.sin(ang)*S*.13;
                  ctx.fillStyle='rgba(0,150,75,0.18)';
                  ctx.beginPath(); ctx.arc(lx, ly, S*.09, 0, Math.PI*2); ctx.fill();
                }
                ctx.fillStyle='rgba(0,150,75,0.22)';
                ctx.beginPath(); ctx.arc(wx+S*.5, wy+S*.5, S*.05, 0, Math.PI*2); ctx.fill();
              }
              // Chemical/reagent splash stain
              if ((x*13+y*19) % 15 === 0) {
                ctx.fillStyle='rgba(60,200,110,0.10)';
                ctx.beginPath(); ctx.ellipse(wx+S*.5, wy+S*.5, S*.22, S*.14, .5, 0, Math.PI*2); ctx.fill();
              }
              // UV strip lighting every 3rd row
              if (y % 3 === 0) { ctx.fillStyle='rgba(180,230,190,0.07)'; ctx.fillRect(wx, wy, S, S); }
              // Tile crack
              if ((x*29+y*23) % 19 === 0) {
                ctx.fillStyle='rgba(0,0,0,0.12)';
                ctx.fillRect(wx+S*.3, wy+S*.1, 1, S*.4);
              }

            } else if (fl === 8) {
              // ── F8: WEAPONS ARMORY — Steel diamond plate, orange safety ──
              ctx.fillStyle = (x+y) % 2 === 0 ? '#2e2e34' : '#28282e';
              ctx.fillRect(wx, wy, S, S);
              // Diamond plate cross-hatch
              ctx.fillStyle='rgba(255,255,255,0.05)';
              ctx.fillRect(wx, wy, S, 1);       ctx.fillRect(wx, wy, 1, S);
              ctx.fillRect(wx, wy+S*.33, S, 1); ctx.fillRect(wx, wy+S*.66, S, 1);
              ctx.fillRect(wx+S*.33, wy, 1, S); ctx.fillRect(wx+S*.66, wy, 1, S);
              ctx.fillStyle='rgba(255,255,255,0.025)';
              ctx.fillRect(wx, wy+S*.165, S, 1); ctx.fillRect(wx, wy+S*.50, S, 1); ctx.fillRect(wx, wy+S*.83, S, 1);
              // Orange safety edge marking
              if (x<=1 || x>=20 || y<=1 || y>=14) {
                ctx.fillStyle='rgba(255,100,0,0.42)'; ctx.fillRect(wx, wy, S, S);
              }
              // Rivet heads at panel corners
              ctx.fillStyle='rgba(180,180,190,0.30)';
              ctx.beginPath(); ctx.arc(wx+5, wy+5, 3, 0, Math.PI*2); ctx.fill();
              ctx.beginPath(); ctx.arc(wx+S-5, wy+5, 3, 0, Math.PI*2); ctx.fill();
              ctx.beginPath(); ctx.arc(wx+5, wy+S-5, 3, 0, Math.PI*2); ctx.fill();
              ctx.beginPath(); ctx.arc(wx+S-5, wy+S-5, 3, 0, Math.PI*2); ctx.fill();
              // Brass shell casings
              if ((x*7+y*11) % 9 === 0) {
                ctx.fillStyle='rgba(200,145,45,0.40)';
                ctx.beginPath(); ctx.arc(wx+S*.28, wy+S*.38, 3, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(wx+S*.72, wy+S*.62, 3, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(wx+S*.50, wy+S*.25, 2, 0, Math.PI*2); ctx.fill();
              }
              // Machine oil stain
              if ((x*17+y*23) % 13 === 0) {
                ctx.fillStyle='rgba(0,0,0,0.38)';
                ctx.beginPath(); ctx.ellipse(wx+S*.5, wy+S*.5, S*.20, S*.13, 1.1, 0, Math.PI*2); ctx.fill();
              }

            } else if (fl === 9) {
              // ── F9: EXECUTIVE SUITE — Black/purple marble, gold inlay ──
              const purples = ['#1e0a30','#180824','#22102a'];
              ctx.fillStyle = purples[ts % 3]; ctx.fillRect(wx, wy, S, S);
              // Marble veins — deterministic purple/gold lines
              if ((x*7+y*11) % 5 === 0) {
                const vx9 = wx + ts % (S-8);
                ctx.fillStyle='rgba(170,90,255,0.20)'; ctx.fillRect(vx9, wy, 2, S);
              }
              if ((x*11+y*7) % 5 === 0) {
                const vy9 = wy + (ts*3) % (S-8);
                ctx.fillStyle='rgba(195,140,255,0.14)'; ctx.fillRect(wx, vy9, S, 2);
              }
              // Gold precision border
              ctx.fillStyle='rgba(210,170,65,0.18)';
              ctx.fillRect(wx, wy, S, 1); ctx.fillRect(wx, wy, 1, S);
              // Animated crystal chandelier reflection
              if ((x*13+y*17) % 9 === 0) {
                const cr = Math.sin(t*1.5 + x*.8 + y*.6)*.30 + .30;
                ctx.fillStyle = `rgba(215,175,255,${cr*.14})`;
                ctx.beginPath(); ctx.arc(wx+S*.5, wy+S*.5, S*.24, 0, Math.PI*2); ctx.fill();
                // Crystal spark
                ctx.fillStyle = `rgba(255,240,255,${cr*.20})`;
                ctx.beginPath(); ctx.arc(wx+S*.5, wy+S*.5, S*.06, 0, Math.PI*2); ctx.fill();
              }
              // Velvet depth overlay
              if ((x+y) % 3 === 0) { ctx.fillStyle='rgba(0,0,0,0.09)'; ctx.fillRect(wx,wy,S,S); }
              // Subtle purple ambient light
              ctx.fillStyle='rgba(80,0,120,0.06)'; ctx.fillRect(wx,wy,S,S);

            } else {
              // ── F10: PENTHOUSE — Black obsidian, animated gold veins (BOSS) ──
              const blacks = ['#0a0606','#080404','#0e0808'];
              ctx.fillStyle = blacks[ts % 3]; ctx.fillRect(wx, wy, S, S);
              // Animated glowing gold veins
              const vP = Math.sin(t*1.2 + x*.4 + y*.5)*.4 + .6;
              if ((x*7+y*11) % 5 === 0) {
                const vx10 = wx + (x*23+y*17) % (S-10);
                ctx.fillStyle = `rgba(255,200,0,${.28*vP})`;
                ctx.fillRect(vx10, wy, 2, S);
              }
              if ((x*13+y*7) % 5 === 0) {
                const vy10 = wy + (x*19+y*29) % (S-10);
                ctx.fillStyle = `rgba(255,180,0,${.22*vP})`;
                ctx.fillRect(wx, vy10, S, 2);
              }
              // Pulsing gold grout
              const gP = Math.sin(t*.8 + x*.2 + y*.3)*.3 + .7;
              ctx.fillStyle = `rgba(170,130,0,${.20*gP})`;
              ctx.fillRect(wx, wy, S, 1); ctx.fillRect(wx, wy, 1, S);
              // Boss aura glow pools
              if ((x*17+y*23) % 11 === 0) {
                const bossG = Math.sin(t*2 + x + y)*.3 + .5;
                ctx.fillStyle = `rgba(255,150,0,${bossG*.09})`;
                ctx.beginPath(); ctx.arc(wx+S*.5, wy+S*.5, S*.45, 0, Math.PI*2); ctx.fill();
              }
              // Dark depth overlay
              ctx.fillStyle='rgba(0,0,0,0.14)'; ctx.fillRect(wx,wy,S,S);
              // Scattered ember sparks
              if ((x*29+y*31) % 17 === 0) {
                const sp = Math.sin(t*3 + ts)*.5 + .5;
                ctx.fillStyle = `rgba(255,120,0,${sp*.35})`;
                ctx.beginPath(); ctx.arc(wx+(ts*7)%S, wy+(ts*11)%S, 1.5, 0, Math.PI*2); ctx.fill();
              }
            }
          } else if (cfg.robot) {
            // Robot City: dark metal grating floor
            ctx.fillStyle = '#0a1018';
            ctx.fillRect(wx, wy, S, S);
            // Grid lines — thin lighter fill (no stroke)
            ctx.fillStyle = 'rgba(0,180,220,0.07)';
            ctx.fillRect(wx, wy, S, 1);
            ctx.fillRect(wx, wy, 1, S);
            // Circuit dot at intersections
            if (isColR && isRowR) {
              ctx.fillStyle = 'rgba(0,220,255,0.20)';
              ctx.fillRect(wx + S/2 - 3, wy + S/2 - 3, 6, 6);
            }
            // Lane highlight strip
            if (isColR && !isRowR) {
              ctx.fillStyle = 'rgba(0,180,220,0.06)';
              ctx.fillRect(wx + S/2 - 2, wy, 4, S);
            }
            if (isRowR && !isColR) {
              ctx.fillStyle = 'rgba(0,180,220,0.06)';
              ctx.fillRect(wx, wy + S/2 - 2, S, 4);
            }
          } else if (cfg.ocean) {
            // Ocean water — flat base color with tile-seed variation (no per-tile gradient/stroke)
            const wavePhase = (_waveNow + x * 0.3 + y * 0.2) % (Math.PI * 2);
            const tint = Math.round(Math.sin(wavePhase) * 8);
            ctx.fillStyle = `rgb(0,${48 + tint},${82 + tint})`;
            ctx.fillRect(wx, wy, S, S);
            // Subtle horizontal stripe highlight (no stroke — use fillRect)
            if ((x + y) % 3 !== 0) {
              const sw = Math.round(Math.sin(wavePhase) * 3);
              ctx.fillStyle = 'rgba(100,200,255,0.10)';
              ctx.fillRect(wx, wy + S * 0.3 + sw, S, 2);
              ctx.fillRect(wx, wy + S * 0.65 + sw, S, 2);
            }
            // Occasional foam dot
            if ((x * 7 + y * 13) % 11 === 0) {
              ctx.fillStyle = 'rgba(200,240,255,0.22)';
              ctx.fillRect(wx + S * 0.25, wy + S * 0.45, 5, 5);
            }
          } else if (cfg.jungle) {
            // Jungle: dirt/mud path with organic variation
            const dseed = (x * 17 + y * 31) % 5;
            const dirts = ['#5a3d1e','#52381a','#624215','#583a1c','#4e3418'];
            ctx.fillStyle = dirts[dseed];
            ctx.fillRect(wx, wy, S, S);
            // Mud puddles
            if ((x*7 + y*13) % 9 === 0) {
              ctx.fillStyle = 'rgba(40,25,10,0.45)';
              ctx.beginPath(); ctx.ellipse(wx + S*0.38, wy + S*0.52, S*0.22, S*0.14, 0.4, 0, Math.PI*2); ctx.fill();
            }
            // Scattered pebbles
            if ((x*11 + y*7) % 6 === 0) {
              ctx.fillStyle = 'rgba(80,60,30,0.55)';
              ctx.beginPath(); ctx.arc(wx + S*0.65, wy + S*0.35, S*0.07, 0, Math.PI*2); ctx.fill();
              ctx.beginPath(); ctx.arc(wx + S*0.25, wy + S*0.70, S*0.05, 0, Math.PI*2); ctx.fill();
            }
            // Grass fringe on edges
            if (isColR || isRowR) {
              ctx.fillStyle = 'rgba(40,90,20,0.18)';
              if (isColR) ctx.fillRect(wx, wy, 6, S);
              if (isRowR) ctx.fillRect(wx, wy, S, 6);
            }
          } else if (cfg.zombie) {
            // Zombie: cracked infected asphalt with green sludge seepage
            const zseed = (x * 17 + y * 31) % 4;
            ctx.fillStyle = ['#060c06','#070d07','#050b05','#080e08'][zseed];
            ctx.fillRect(wx, wy, S, S);
            // Crumble cracks
            if ((x * 11 + y * 7) % 3 === 0) {
              ctx.fillStyle = 'rgba(0,30,0,0.35)';
              ctx.fillRect(wx + (x * 19) % (S - 2), wy, 1, S);
            }
            if ((x * 7 + y * 11) % 4 === 0) {
              ctx.fillStyle = 'rgba(0,25,0,0.28)';
              ctx.fillRect(wx, wy + (y * 17) % (S - 2), S, 1);
            }
            // Green biohazard seepage pool
            if ((x * 13 + y * 19) % 7 === 0) {
              ctx.fillStyle = 'rgba(30,160,50,0.13)';
              ctx.beginPath(); ctx.ellipse(wx + S * 0.42, wy + S * 0.52, S * 0.22, S * 0.13, 0.4, 0, Math.PI * 2); ctx.fill();
            }
            // Blood splash on random tiles
            if ((x * 17 + y * 23) % 11 === 0) {
              ctx.fillStyle = 'rgba(110,0,0,0.22)';
              ctx.beginPath(); ctx.ellipse(wx + S * 0.6, wy + S * 0.38, S * 0.13, S * 0.08, -0.5, 0, Math.PI * 2); ctx.fill();
            }
            // Green sludge lane strips
            if (isColR && !isRowR) {
              ctx.fillStyle = 'rgba(44,180,60,0.08)';
              ctx.fillRect(wx + S / 2 - 3, wy, 6, S);
            }
            if (isRowR && !isColR) {
              ctx.fillStyle = 'rgba(44,180,60,0.08)';
              ctx.fillRect(wx, wy + S / 2 - 3, S, 6);
            }
          } else if (cfg.galactica) {
            // Galactica: void space lane — deep purple-black with star dust
            ctx.fillStyle = '#04000e';
            ctx.fillRect(wx, wy, S, S);
            // Subtle energy lane strips along road axes
            if (isColR && !isRowR) {
              ctx.fillStyle = 'rgba(140,60,255,0.08)';
              ctx.fillRect(wx + S/2 - 3, wy, 6, S);
              ctx.fillStyle = 'rgba(160,80,255,0.04)';
              ctx.fillRect(wx + S/2 - 10, wy, 20, S);
            }
            if (isRowR && !isColR) {
              ctx.fillStyle = 'rgba(140,60,255,0.08)';
              ctx.fillRect(wx, wy + S/2 - 3, S, 6);
              ctx.fillStyle = 'rgba(160,80,255,0.04)';
              ctx.fillRect(wx, wy + S/2 - 10, S, 20);
            }
            // Scattered star dust specks
            if ((x*7 + y*13) % 5 === 0) {
              ctx.fillStyle = 'rgba(200,180,255,0.40)';
              ctx.beginPath(); ctx.arc(wx + (x*19)%S, wy + (y*17)%S, 1, 0, Math.PI*2); ctx.fill();
            }
            if ((x*11 + y*7) % 7 === 0) {
              ctx.fillStyle = 'rgba(150,220,255,0.35)';
              ctx.beginPath(); ctx.arc(wx + (x*29+12)%S, wy + (y*23+15)%S, 0.8, 0, Math.PI*2); ctx.fill();
            }
          } else if (cfg.sky) {
            // Sky Realm: open azure sky with subtle depth variation
            const sseed = (x * 17 + y * 11) % 6;
            const blues = ['#5aa0cc','#5ea4d0','#58a0ca','#5ca2ce','#60a6d2','#56a0ca'];
            ctx.fillStyle = blues[sseed];
            ctx.fillRect(wx, wy, S, S);
            // Faint horizontal haze bands
            if ((x * 3 + y * 5) % 7 === 0) {
              ctx.fillStyle = 'rgba(255,255,255,0.05)';
              ctx.fillRect(wx, wy + S * 0.38, S, 2);
              ctx.fillRect(wx, wy + S * 0.70, S, 1);
            }
            // Occasional sun sparkle — fillRect is much cheaper than arc()
            if ((x * 11 + y * 7) % 17 === 0) {
              ctx.fillStyle = 'rgba(255,248,210,0.10)';
              ctx.fillRect(wx + (x*19)%S - 5, wy + (y*17)%S - 5, 10, 10);
            }
          } else if (cfg.desert || cfg.wasteland) {
            // Desert/Wasteland: sandy dirt road with ripples
            const dseed = (x * 17 + y * 31) % 5;
            const sands = ['#c8a05a','#c2985a','#caa862','#be9850','#c4a258'];
            ctx.fillStyle = sands[dseed];
            ctx.fillRect(wx, wy, S, S);
            // Ripple lines (wind-blown sand)
            if ((x*5 + y*7) % 4 === 0) {
              ctx.fillStyle = 'rgba(255,220,140,0.20)';
              ctx.fillRect(wx + 8, wy + Math.round(S*0.32), S - 16, 2);
              ctx.fillRect(wx + 16, wy + Math.round(S*0.60), S - 32, 1);
            }
            // Scattered pebbles
            if ((x*11 + y*7) % 5 === 0) {
              ctx.fillStyle = 'rgba(100,65,20,0.42)';
              ctx.beginPath(); ctx.arc(wx + S*0.28, wy + S*0.40, S*0.055, 0, Math.PI*2); ctx.fill();
              ctx.beginPath(); ctx.arc(wx + S*0.72, wy + S*0.66, S*0.040, 0, Math.PI*2); ctx.fill();
            }
            // Camel hoof-print marks at road center
            if (isColR && (x*3+y) % 4 === 0) {
              ctx.fillStyle = 'rgba(90,55,18,0.28)';
              ctx.beginPath(); ctx.ellipse(wx + S/2 - 9, wy + S*0.34, S*0.065, S*0.045, 0.35, 0, Math.PI*2); ctx.fill();
              ctx.beginPath(); ctx.ellipse(wx + S/2 + 11, wy + S*0.66, S*0.055, S*0.040, -0.3, 0, Math.PI*2); ctx.fill();
            }
            if (isRowR && (x+y*3) % 4 === 0) {
              ctx.fillStyle = 'rgba(90,55,18,0.28)';
              ctx.beginPath(); ctx.ellipse(wx + S*0.34, wy + S/2 - 9, S*0.045, S*0.065, 0.35, 0, Math.PI*2); ctx.fill();
              ctx.beginPath(); ctx.ellipse(wx + S*0.66, wy + S/2 + 11, S*0.040, S*0.055, -0.3, 0, Math.PI*2); ctx.fill();
            }
          } else if (cfg.blitz) {
            // ═══════════════════════════════════════════════════════════════
            //  BLITZ ROADS: Burning dark asphalt with speed lane markings
            // ═══════════════════════════════════════════════════════════════
            const bseed = (x * 13 + y * 23) % 4;
            const bRoadCols = ['#060301','#070302','#050301','#060201'];
            ctx.fillStyle = bRoadCols[bseed];
            ctx.fillRect(wx, wy, S, S);
            // Faint speed-scratch vertical texture
            if ((x * 7 + y * 11) % 4 === 0) {
              ctx.fillStyle = 'rgba(255,60,0,0.055)';
              ctx.fillRect(wx + bseed * 8 + 5, wy, 1, S);
            }
            // Orange road edge borders
            ctx.fillStyle = 'rgba(255,80,0,0.38)';
            ctx.fillRect(wx, wy, S, 2);
            ctx.fillRect(wx, wy + S - 2, S, 2);
            ctx.fillRect(wx, wy, 2, S);
            ctx.fillRect(wx + S - 2, wy, 2, S);
            // Speed lane markings
            if (isColR && !isRowR) {
              ctx.fillStyle = 'rgba(255,180,0,0.33)';
              for (let dash = 0; dash < 4; dash++) ctx.fillRect(wx + S/2 - 1, wy + dash*20 + 4, 2, 12);
              ctx.fillStyle = 'rgba(255,60,0,0.13)';
              ctx.fillRect(wx + 6, wy, 1, S);
              ctx.fillRect(wx + S - 7, wy, 1, S);
            }
            if (isRowR && !isColR) {
              ctx.fillStyle = 'rgba(255,180,0,0.33)';
              for (let dash = 0; dash < 4; dash++) ctx.fillRect(wx + dash*20 + 4, wy + S/2 - 1, 12, 2);
              ctx.fillStyle = 'rgba(255,60,0,0.13)';
              ctx.fillRect(wx, wy + 6, S, 1);
              ctx.fillRect(wx, wy + S - 7, S, 1);
            }
            if (isColR && isRowR) {
              ctx.fillStyle = 'rgba(255,100,0,0.14)';
              ctx.fillRect(wx + S/2 - 8, wy + S/2 - 1, 16, 2);
              ctx.fillRect(wx + S/2 - 1, wy + S/2 - 8, 2, 16);
            }
            // Tyre skid marks
            if ((x * 11 + y * 17) % 9 === 0) {
              ctx.fillStyle = 'rgba(0,0,0,0.45)';
              ctx.fillRect(wx + (bseed * 11 % 35) + 10, wy + 8, 2, S - 16);
            }
          } else if (cfg.arena) {
            // ═══════════════════════════════════════════════════════════════
            //  ARENA ROADS: Very dark asphalt with clear lane markings
            // ═══════════════════════════════════════════════════════════════
            const aseed = (x * 17 + y * 31) % 6;

            // Very dark asphalt base (almost black) for high contrast with buildings
            const roadColors = ['#050203','#040202','#060204','#050202','#040203','#030201'];
            ctx.fillStyle = roadColors[aseed];
            ctx.fillRect(wx, wy, S, S);

            // Subtle asphalt texture variation
            ctx.fillStyle = 'rgba(20,10,15,0.15)';
            if ((x * 7 + y * 11) % 3 === 0) {
              ctx.fillRect(wx + (aseed * 7 % 30) + 10, wy + (aseed * 11 % 30) + 10, 18, 12);
            }

            // Road edge borders (clear demarcation from building zones)
            ctx.fillStyle = 'rgba(80,30,40,0.35)';
            ctx.fillRect(wx, wy, S, 2);           // Top border
            ctx.fillRect(wx, wy + S - 2, S, 2);   // Bottom border
            ctx.fillRect(wx, wy, 2, S);           // Left border
            ctx.fillRect(wx + S - 2, wy, 2, S);   // Right border

            // Center lane markings (dashed white/yellow lines)
            if (isColR && !isRowR) {
              // Vertical road - center dashed line
              ctx.fillStyle = 'rgba(255,200,100,0.25)';
              for (let dash = 0; dash < 4; dash++) {
                ctx.fillRect(wx + S/2 - 1, wy + dash * 20 + 4, 2, 12);
              }
              // Edge lane lines
              ctx.fillStyle = 'rgba(255,255,255,0.12)';
              ctx.fillRect(wx + 6, wy, 1, S);
              ctx.fillRect(wx + S - 7, wy, 1, S);
            }
            if (isRowR && !isColR) {
              // Horizontal road - center dashed line
              ctx.fillStyle = 'rgba(255,200,100,0.25)';
              for (let dash = 0; dash < 4; dash++) {
                ctx.fillRect(wx + dash * 20 + 4, wy + S/2 - 1, 12, 2);
              }
              // Edge lane lines
              ctx.fillStyle = 'rgba(255,255,255,0.12)';
              ctx.fillRect(wx, wy + 6, S, 1);
              ctx.fillRect(wx, wy + S - 7, S, 1);
            }

            // Intersection - neon direction arrows (no confusing red squares)
            if (isColR && isRowR) {
              // Small neon arrow indicators pointing to roads
              ctx.fillStyle = 'rgba(255,100,50,0.12)';
              // North arrow
              ctx.beginPath();
              ctx.moveTo(wx + S/2, wy + 6);
              ctx.lineTo(wx + S/2 - 4, wy + 12);
              ctx.lineTo(wx + S/2 + 4, wy + 12);
              ctx.closePath();
              ctx.fill();
              // South arrow
              ctx.beginPath();
              ctx.moveTo(wx + S/2, wy + S - 6);
              ctx.lineTo(wx + S/2 - 4, wy + S - 12);
              ctx.lineTo(wx + S/2 + 4, wy + S - 12);
              ctx.closePath();
              ctx.fill();
              // West arrow
              ctx.beginPath();
              ctx.moveTo(wx + 6, wy + S/2);
              ctx.lineTo(wx + 12, wy + S/2 - 4);
              ctx.lineTo(wx + 12, wy + S/2 + 4);
              ctx.closePath();
              ctx.fill();
              // East arrow
              ctx.beginPath();
              ctx.moveTo(wx + S - 6, wy + S/2);
              ctx.lineTo(wx + S - 12, wy + S/2 - 4);
              ctx.lineTo(wx + S - 12, wy + S/2 + 4);
              ctx.closePath();
              ctx.fill();
            }

            // Occasional road damage/cracks
            if ((x * 7 + y * 11) % 8 === 0) {
              ctx.fillStyle = 'rgba(0,0,0,0.5)';
              const crackX = wx + (x * 13 % 40) + 15;
              ctx.fillRect(crackX, wy + 10, 1, S - 20);
            }

            // Sparse blood stains on road
            if ((x * 13 + y * 17) % 12 === 0) {
              ctx.fillStyle = 'rgba(60,0,8,0.25)';
              ctx.beginPath();
              ctx.ellipse(wx + S * 0.5, wy + S * 0.5, 10, 6, 0.5, 0, Math.PI * 2);
              ctx.fill();
            }

            // Shell casings on road
            if ((x * 7 + y * 5) % 10 === 0) {
              ctx.fillStyle = 'rgba(150,120,40,0.40)';
              ctx.beginPath();
              ctx.ellipse(wx + 25 + (aseed * 5 % 30), wy + 30 + (aseed * 3 % 20), 2, 1, aseed, 0, Math.PI * 2);
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
            // Jungle: lush grass undergrowth
            const gseed = (x * 23 + y * 37) % 5;
            const grasses = ['#2a4a20','#254518','#2e5222','#20401a','#28481e'];
            ctx.fillStyle = grasses[gseed];
            ctx.fillRect(wx, wy, S, S);
            // Dense undergrowth blades
            ctx.fillStyle = 'rgba(50,110,30,0.35)';
            const blades = (x*7+y*11) % 4;
            for (let bi = 0; bi < blades + 2; bi++) {
              const bx2 = wx + ((x*17 + bi*29) % (S-12)) + 6;
              const by2 = wy + ((y*13 + bi*19) % (S-10)) + 5;
              ctx.fillRect(bx2, by2, 2, 8 + bi*2);
            }
            // Fern fronds (ellipses)
            if ((x*11+y*7) % 5 === 0) {
              ctx.fillStyle = 'rgba(40,140,40,0.28)';
              ctx.beginPath(); ctx.ellipse(wx + S*0.35, wy + S*0.55, S*0.18, S*0.09, -0.4, 0, Math.PI*2); ctx.fill();
              ctx.beginPath(); ctx.ellipse(wx + S*0.65, wy + S*0.40, S*0.16, S*0.08, 0.5, 0, Math.PI*2); ctx.fill();
            }
            // Occasional bright tropical flower
            if ((x*13+y*19) % 12 === 0) {
              ctx.fillStyle = 'rgba(255,180,30,0.70)';
              ctx.beginPath(); ctx.arc(wx + S*0.5 + (x%3-1)*12, wy + S*0.45 + (y%3-1)*8, 4, 0, Math.PI*2); ctx.fill();
              ctx.fillStyle = 'rgba(255,80,80,0.55)';
              ctx.beginPath(); ctx.arc(wx + S*0.3, wy + S*0.65, 3, 0, Math.PI*2); ctx.fill();
            }
          } else if (cfg.robot) {
            // Robot City: circuit board platform / raised metal walkway
            ctx.fillStyle = '#0d1420';
            ctx.fillRect(wx, wy, S, S);
            // Circuit trace lines
            const cseed = x * 19 + y * 29;
            ctx.fillStyle = 'rgba(0,200,220,0.10)';
            if (cseed % 3 === 0) {
              ctx.fillRect(wx + 8, wy + S/2 - 1, S - 16, 2);  // horizontal trace
            } else if (cseed % 3 === 1) {
              ctx.fillRect(wx + S/2 - 1, wy + 8, 2, S - 16);  // vertical trace
            }
            // Corner pads
            ctx.fillStyle = 'rgba(0,220,255,0.12)';
            ctx.fillRect(wx + 4, wy + 4, 6, 6);
            ctx.fillRect(wx + S - 10, wy + S - 10, 6, 6);
            // Occasional blinking indicator dot
            if ((x * 7 + y * 11) % 9 === 0) {
              ctx.fillStyle = 'rgba(0,255,180,0.28)';
              ctx.fillRect(wx + S/2 - 2, wy + S/2 - 2, 4, 4);
            }
          } else if (cfg.ocean) {
            // Ocean: floating wooden dock — flat colors, no per-tile gradient/stroke
            ctx.fillStyle = '#3e2e1a';
            ctx.fillRect(wx + 2, wy + 2, S - 4, S - 4);
            // Plank lines as thin fillRects (no stroke)
            ctx.fillStyle = 'rgba(60,40,20,0.55)';
            for (let pl = 0; pl < 3; pl++) {
              ctx.fillRect(wx + 4, wy + 9 + pl * Math.round((S - 18) / 2), S - 8, 1);
            }
            // Edge highlight strip
            ctx.fillStyle = 'rgba(100,80,55,0.35)';
            ctx.fillRect(wx + 3, wy + 3, S - 6, 2);
            ctx.fillRect(wx + 3, wy + 3, 2, S - 6);
            // Mooring post
            if ((x * 5 + y * 3) % 9 === 0) {
              ctx.fillStyle = '#5a4a3a';
              ctx.fillRect(wx + S/2 - 4, wy + S/2 - 4, 8, 8);
            }
          } else if (cfg.zombie) {
            // Zombie: cracked mossy sidewalk with blood stains and overgrowth
            const ss = (x * 17 + y * 23) % 3;
            ctx.fillStyle = ['#0a120a','#0c140c','#091009'][ss];
            ctx.fillRect(wx, wy, S, S);
            // Pavement slab joints
            ctx.fillStyle = 'rgba(0,30,0,0.3)';
            ctx.fillRect(wx, wy + Math.round(S * 0.5), S, 1);
            ctx.fillRect(wx + Math.round(S * 0.5), wy, 1, S);
            // Moss/lichen growth patches
            if ((x * 7 + y * 11) % 4 === 0) {
              ctx.fillStyle = 'rgba(30,130,40,0.22)';
              ctx.beginPath(); ctx.ellipse(wx + S * 0.38, wy + S * 0.52, S * 0.20, S * 0.12, 0.3, 0, Math.PI * 2); ctx.fill();
            }
            // Overgrown grass crack
            if ((x * 11 + y * 7) % 5 === 0) {
              ctx.fillStyle = 'rgba(44,160,44,0.18)';
              ctx.fillRect(wx + Math.round(S * 0.25), wy, 2, S);
            }
            // Blood stain
            if ((x * 13 + y * 17) % 13 === 0) {
              ctx.fillStyle = 'rgba(130,8,8,0.20)';
              ctx.beginPath(); ctx.ellipse(wx + S * 0.62, wy + S * 0.40, S * 0.14, S * 0.09, -0.5, 0, Math.PI * 2); ctx.fill();
            }
          } else if (cfg.blitz) {
            // ═══════════════════════════════════════════════════════════════
            //  BLITZ SIDEWALK: Speed-zone dark buildings with fire neons
            // ═══════════════════════════════════════════════════════════════
            const ts = x * 41 + y * 59;
            const t  = Date.now() * 0.001;
            const neons = ['#FF4400','#FF2200','#FF6600','#FF0022','#FF8800'];
            const signs = ['RUSH','BLITZ','SURGE','FIRE','SPEED','OVERDRIVE'];
            const roadLeft2   = x > 0        && this.tiles[y][x-1] === TILE.ROAD;
            const roadRight2  = x < this.W-1 && this.tiles[y][x+1] === TILE.ROAD;
            const roadTop2    = y > 0        && this.tiles[y-1][x] === TILE.ROAD;
            const roadBottom2 = y < this.H-1 && this.tiles[y+1][x] === TILE.ROAD;
            const seed2 = ts * 7;
            const neonCol2 = neons[seed2 % neons.length];
            ctx.fillStyle = '#080302'; ctx.fillRect(wx, wy, S, S);
            const sw2 = 6;
            const bx2 = roadLeft2   ? wx + sw2 : wx;
            const by2 = roadTop2    ? wy + sw2 : wy;
            const bw2 = S - (roadLeft2 ? sw2 : 0) - (roadRight2 ? sw2 : 0);
            const bh2 = S - (roadTop2  ? sw2 : 0) - (roadBottom2 ? sw2 : 0);
            ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(bx2+3, by2+3, bw2, bh2);
            ctx.fillStyle = '#0e0402'; ctx.fillRect(bx2, by2, bw2, bh2);
            ctx.strokeStyle = neonCol2; ctx.lineWidth = 2.5;
            ctx.strokeRect(bx2+2, by2+2, bw2-4, bh2-4);
            ctx.fillStyle = '#0a0301'; ctx.fillRect(bx2+5, by2+5, bw2-10, bh2-10);
            ctx.strokeStyle = neonCol2+'55'; ctx.lineWidth = 1;
            ctx.strokeRect(bx2+8, by2+8, bw2-16, bh2-16);
            // Speed stripes
            for (let si = 0; si < 3; si++) {
              ctx.fillStyle = si===1 ? neonCol2+'66' : neonCol2+'22';
              ctx.fillRect(bx2+6, by2+Math.floor(bh2*(0.25+si*0.22)), bw2-12, si===1?2:1);
            }
            // Roof beacon
            if (bw2 > 22) {
              ctx.fillStyle = '#444'; ctx.fillRect(bx2+bw2/2-1, by2-8, 2, 14);
              const blink2 = Math.sin(t*6+seed2) > 0;
              ctx.fillStyle = blink2 ? neonCol2 : neonCol2+'30';
              ctx.beginPath(); ctx.arc(bx2+bw2/2, by2-8, 3, 0, Math.PI*2); ctx.fill();
              ctx.strokeStyle = neonCol2+'60'; ctx.lineWidth=1;
              ctx.beginPath(); ctx.arc(bx2+bw2/2, by2-8, 5, 0, Math.PI*2); ctx.stroke();
            }
            // Neon sign
            if (bw2 > 30 && bh2 > 28) {
              const sgnText = signs[seed2 % signs.length];
              const sgnW = Math.min(bw2-14, 48), sgnH = 11;
              const sgnX = bx2+(bw2-sgnW)/2, sgnY = by2+bh2-16;
              ctx.fillStyle='#060100'; ctx.fillRect(sgnX,sgnY,sgnW,sgnH);
              ctx.strokeStyle=neonCol2; ctx.lineWidth=1.5; ctx.strokeRect(sgnX,sgnY,sgnW,sgnH);
              ctx.fillStyle=neonCol2; ctx.font='bold 8px monospace';
              ctx.fillText(sgnText, sgnX+4, sgnY+8);
            }
            ctx.fillStyle = '#060202';
            if (roadLeft2)   ctx.fillRect(wx, wy, sw2, S);
            if (roadRight2)  ctx.fillRect(wx+S-sw2, wy, sw2, S);
            if (roadTop2)    ctx.fillRect(wx, wy, S, sw2);
            if (roadBottom2) ctx.fillRect(wx, wy+S-sw2, S, sw2);
          } else if (cfg.arena) {
            // ═══════════════════════════════════════════════════════════════
            //  ARENA SIDEWALK: Thin strip (6px) + 1-2 MASSIVE buildings
            // ═══════════════════════════════════════════════════════════════
            const ts = x * 41 + y * 59;
            const t = Date.now() * 0.001;
            const neons = ['#FF0066','#FF6600','#CC00FF','#FF3366','#AA00FF'];
            const signs = ['RAMEN','NEURO','DATA-X','ARENA','COMBAT'];

            // Detect adjacent roads
            const roadLeft = x > 0 && this.tiles[y][x-1] === TILE.ROAD;
            const roadRight = x < this.W-1 && this.tiles[y][x+1] === TILE.ROAD;
            const roadTop = y > 0 && this.tiles[y-1][x] === TILE.ROAD;
            const roadBottom = y < this.H-1 && this.tiles[y+1][x] === TILE.ROAD;

            // Dark background
            ctx.fillStyle = '#0a0406';
            ctx.fillRect(wx, wy, S, S);

            // Thin sidewalk width
            const sw = 6;

            // Building area (after sidewalk)
            const bx = roadLeft ? wx + sw : wx;
            const by = roadTop ? wy + sw : wy;
            const bw = S - (roadLeft ? sw : 0) - (roadRight ? sw : 0);
            const bh = S - (roadTop ? sw : 0) - (roadBottom ? sw : 0);

            const seed = ts * 7;
            const neonCol = neons[seed % neons.length];

            // ONE large building fills the space
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(bx + 3, by + 3, bw, bh);

            // Solid building body
            ctx.fillStyle = '#1a0a0c';
            ctx.fillRect(bx, by, bw, bh);

            // Neon border
            ctx.strokeStyle = neonCol;
            ctx.lineWidth = 3;
            ctx.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);

            // Inner panel
            ctx.fillStyle = '#120608';
            ctx.fillRect(bx + 6, by + 6, bw - 12, bh - 12);

            // Secondary border
            ctx.strokeStyle = neonCol + '66';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx + 10, by + 10, bw - 20, bh - 20);

            // Roof equipment
            const roofType = seed % 3;
            if (roofType === 0 && bw > 30) {
              // Satellite dish
              ctx.fillStyle = '#999';
              ctx.beginPath();
              ctx.ellipse(bx + bw - 18, by + 14, 12, 6, -0.25, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#555';
              ctx.fillRect(bx + bw - 19, by + 14, 2, 10);
            } else if (roofType === 1 && bw > 26) {
              // Solar panels
              ctx.fillStyle = '#1a4488';
              ctx.fillRect(bx + 10, by + 8, bw - 20, 14);
              ctx.strokeStyle = '#2a66aa';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(bx + 10, by + 15);
              ctx.lineTo(bx + bw - 10, by + 15);
              ctx.stroke();
            } else {
              // Antenna
              ctx.fillStyle = '#555';
              ctx.fillRect(bx + bw/2 - 2, by - 6, 4, 16);
              const blink = Math.sin(t * 4 + seed) > 0.2;
              ctx.fillStyle = blink ? '#FF0044' : '#550015';
              ctx.beginPath();
              ctx.arc(bx + bw/2, by - 6, 4, 0, Math.PI * 2);
              ctx.fill();
            }

            // Neon sign
            if (bw > 32 && bh > 30) {
              const signText = signs[seed % signs.length];
              const signW = Math.min(bw - 16, 50);
              const signH = 12;
              const signX = bx + (bw - signW) / 2;
              const signY = by + bh - 18;

              ctx.fillStyle = '#080004';
              ctx.fillRect(signX, signY, signW, signH);
              ctx.strokeStyle = neonCol;
              ctx.lineWidth = 2;
              ctx.strokeRect(signX, signY, signW, signH);
              ctx.fillStyle = neonCol;
              ctx.font = 'bold 9px monospace';
              ctx.fillText(signText, signX + 5, signY + 9);
            }

            // Thin dark sidewalk strip
            ctx.fillStyle = '#080405';
            if (roadLeft) ctx.fillRect(wx, wy, sw, S);
            if (roadRight) ctx.fillRect(wx + S - sw, wy, sw, S);
            if (roadTop) ctx.fillRect(wx, wy, S, sw);
            if (roadBottom) ctx.fillRect(wx, wy + S - sw, S, sw);
          } else if (cfg.galactica) {
            // Galactica: cosmic platform — dark nebula plates with energy veins
            const gseed = (x * 23 + y * 37) % 4;
            const plateCols = ['#0a001a','#0e001e','#080016','#0c0020'];
            ctx.fillStyle = plateCols[gseed];
            ctx.fillRect(wx, wy, S, S);
            // Hex grid seams
            ctx.fillStyle = 'rgba(120,60,220,0.12)';
            ctx.fillRect(wx, wy + Math.round(S*0.50), S, 1);
            ctx.fillRect(wx + Math.round(S*0.50), wy, 1, S);
            // Glowing energy vein on some tiles
            if ((x*7+y*11) % 5 === 0) {
              ctx.fillStyle = 'rgba(140,60,255,0.18)';
              ctx.fillRect(wx + Math.round(S*0.18), wy + Math.round(S*0.48), Math.round(S*0.64), 2);
            }
            // Floating crystal shard
            if ((x*13+y*17) % 9 === 0) {
              ctx.globalAlpha = 0.60;
              ctx.fillStyle = '#AA44FF';
              ctx.beginPath();
              ctx.moveTo(wx + Math.round(S*0.50), wy + Math.round(S*0.30));
              ctx.lineTo(wx + Math.round(S*0.58), wy + Math.round(S*0.50));
              ctx.lineTo(wx + Math.round(S*0.50), wy + Math.round(S*0.62));
              ctx.lineTo(wx + Math.round(S*0.42), wy + Math.round(S*0.50));
              ctx.closePath(); ctx.fill();
              ctx.globalAlpha = 1;
            }
            // Distant star speck
            if ((x*19+y*29) % 8 === 0) {
              ctx.fillStyle = 'rgba(220,200,255,0.45)';
              ctx.beginPath(); ctx.arc(wx + (x*23)%S, wy + (y*19)%S, 0.9, 0, Math.PI*2); ctx.fill();
            }
          } else if (cfg.desert || cfg.wasteland) {
            // ═══════════════════════════════════════════════════════════════
            //  WASTELAND SIDEWALK: Thin strip + unique ruined structures
            // ═══════════════════════════════════════════════════════════════
            const ts = x * 41 + y * 59;

            // Detect adjacent roads
            const roadLeft = x > 0 && this.tiles[y][x-1] === TILE.ROAD;
            const roadRight = x < this.W-1 && this.tiles[y][x+1] === TILE.ROAD;
            const roadTop = y > 0 && this.tiles[y-1][x] === TILE.ROAD;
            const roadBottom = y < this.H-1 && this.tiles[y+1][x] === TILE.ROAD;

            // Scorched ground
            const bgColors = ['#1c1612','#1a1410','#18120e','#1e1814'];
            ctx.fillStyle = bgColors[ts % bgColors.length];
            ctx.fillRect(wx, wy, S, S);

            // Thin sidewalk (6px)
            const sw = 6;

            // Building area after sidewalk
            const areaX = roadLeft ? wx + sw : wx;
            const areaY = roadTop ? wy + sw : wy;
            const areaW = S - (roadLeft ? sw : 0) - (roadRight ? sw : 0);
            const areaH = S - (roadTop ? sw : 0) - (roadBottom ? sw : 0);

            // Unique structure type per tile
            const structType = ts % 5;

            if (structType === 0) {
              // Small collapsed shed
              ctx.fillStyle = '#3a3530';
              ctx.fillRect(areaX + 4, areaY + areaH * 0.3, areaW - 8, areaH * 0.65);
              // Collapsed roof
              ctx.fillStyle = '#4a4540';
              ctx.beginPath();
              ctx.moveTo(areaX + 4, areaY + areaH * 0.3);
              ctx.lineTo(areaX + areaW/2, areaY + 4);
              ctx.lineTo(areaX + areaW - 4, areaY + areaH * 0.35);
              ctx.closePath();
              ctx.fill();
              // Door hole
              ctx.fillStyle = '#0c0a08';
              ctx.fillRect(areaX + areaW/2 - 8, areaY + areaH * 0.55, 16, areaH * 0.38);

            } else if (structType === 1) {
              // Rubble mound
              ctx.fillStyle = '#4a4540';
              ctx.beginPath();
              ctx.moveTo(areaX + 4, areaY + areaH - 4);
              ctx.lineTo(areaX + areaW * 0.35, areaY + 8);
              ctx.lineTo(areaX + areaW * 0.65, areaY + 12);
              ctx.lineTo(areaX + areaW - 4, areaY + areaH - 4);
              ctx.closePath();
              ctx.fill();
              // Debris chunks
              ctx.fillStyle = '#5a5a58';
              ctx.fillRect(areaX + 8, areaY + areaH - 15, 10, 8);
              ctx.fillRect(areaX + areaW - 20, areaY + areaH - 12, 8, 6);
              // Rebar
              ctx.strokeStyle = '#6a5a4a';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(areaX + areaW * 0.4, areaY + 12);
              ctx.lineTo(areaX + areaW * 0.5, areaY + 4);
              ctx.stroke();

            } else if (structType === 2) {
              // Small bunker
              ctx.fillStyle = '#484848';
              ctx.fillRect(areaX + 6, areaY + areaH * 0.4, areaW - 12, areaH * 0.55);
              // Sloped top
              ctx.fillStyle = '#525252';
              ctx.beginPath();
              ctx.moveTo(areaX + 6, areaY + areaH * 0.4);
              ctx.lineTo(areaX + 14, areaY + areaH * 0.25);
              ctx.lineTo(areaX + areaW - 14, areaY + areaH * 0.25);
              ctx.lineTo(areaX + areaW - 6, areaY + areaH * 0.4);
              ctx.closePath();
              ctx.fill();
              // Door slit
              ctx.fillStyle = '#0a0a0a';
              ctx.fillRect(areaX + areaW/2 - 10, areaY + areaH * 0.55, 20, 4);

            } else if (structType === 3) {
              // Fallen tank/barrel
              ctx.fillStyle = '#5a5248';
              ctx.save();
              ctx.translate(areaX + areaW/2, areaY + areaH/2);
              ctx.rotate(0.2);
              ctx.beginPath();
              ctx.ellipse(0, 0, areaW * 0.4, areaH * 0.25, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
              // Spill
              ctx.fillStyle = 'rgba(40,30,20,0.5)';
              ctx.beginPath();
              ctx.ellipse(areaX + areaW * 0.7, areaY + areaH * 0.75, 15, 8, 0.3, 0, Math.PI * 2);
              ctx.fill();

            } else {
              // Broken wall segment
              ctx.fillStyle = '#3e3830';
              ctx.fillRect(areaX + 4, areaY + 8, areaW - 8, areaH - 12);
              // Jagged top
              ctx.fillStyle = '#1c1612';
              ctx.beginPath();
              ctx.moveTo(areaX + 4, areaY + 8);
              ctx.lineTo(areaX + 12, areaY + 4);
              ctx.lineTo(areaX + 25, areaY + 14);
              ctx.lineTo(areaX + 40, areaY + 6);
              ctx.lineTo(areaX + 55, areaY + 12);
              ctx.lineTo(areaX + areaW - 4, areaY + 8);
              ctx.lineTo(areaX + areaW - 4, areaY + 8);
              ctx.lineTo(areaX + 4, areaY + 8);
              ctx.fill();
              // Window hole
              ctx.fillStyle = '#0c0a08';
              ctx.fillRect(areaX + areaW/2 - 10, areaY + 25, 20, 15);
            }

            // Thin cracked sidewalk
            ctx.fillStyle = '#3a3428';
            if (roadLeft) ctx.fillRect(wx, wy, sw, S);
            if (roadRight) ctx.fillRect(wx + S - sw, wy, sw, S);
            if (roadTop) ctx.fillRect(wx, wy, S, sw);
            if (roadBottom) ctx.fillRect(wx, wy + S - sw, S, sw);

            // Cracks
            ctx.fillStyle = '#2a2418';
            if (roadLeft) ctx.fillRect(wx + 2, wy + 20, 1, 35);
            if (roadTop) ctx.fillRect(wx + 25, wy + 2, 25, 1);
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
              // Tree shadow — no shadowBlur for performance
              ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
              ctx.beginPath(); ctx.ellipse(wx + S/2 + 4, wy + S/2 + 6, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
              ctx.globalAlpha = 1;
              // Tree canopy
              ctx.fillStyle = '#0a3a12';
              ctx.beginPath(); ctx.arc(wx + S/2, wy + S/2, 14, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = '#145520';
              ctx.beginPath(); ctx.arc(wx + S/2 - 3, wy + S/2 - 4, 10, 0, Math.PI * 2); ctx.fill();
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
          // Building (or Tree in jungle, or Server Block in robot city)
          if (cfg.jungle) {
            // Jungle: render dense tree canopy
            const tseed = (x * 41 + y * 59) % 5;
            // Ground under tree — dark soil
            const soils = ['#1a2e0a','#162808','#1e3210','#18280a','#142408'];
            ctx.fillStyle = soils[tseed];
            ctx.fillRect(wx, wy, S, S);
            // Canopy shadow on ground
            ctx.globalAlpha = 0.30; ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.ellipse(wx + S/2 + 5, wy + S/2 + 7, S*0.38, S*0.22, 0, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1;
            // Layered canopy — dark outer, brighter inner
            const treeGreens = [
              ['#0d3808','#1a5010','#22661a'],
              ['#08340a','#14520e','#1e6818'],
              ['#0a3c0c','#185814','#22701e'],
              ['#0e3a08','#1c5412','#28681c'],
              ['#0a3206','#164a0c','#205816'],
            ][tseed];
            // Outer canopy blob
            ctx.fillStyle = treeGreens[0];
            ctx.beginPath(); ctx.arc(wx + S/2, wy + S/2, S*0.46, 0, Math.PI*2); ctx.fill();
            // Mid canopy
            ctx.fillStyle = treeGreens[1];
            ctx.beginPath(); ctx.arc(wx + S/2 - 3, wy + S/2 - 4, S*0.36, 0, Math.PI*2); ctx.fill();
            // Highlight inner
            ctx.fillStyle = treeGreens[2];
            ctx.beginPath(); ctx.arc(wx + S/2 - 5, wy + S/2 - 7, S*0.22, 0, Math.PI*2); ctx.fill();
            // Sunlit top-left specular
            ctx.fillStyle = 'rgba(180,255,100,0.12)';
            ctx.beginPath(); ctx.arc(wx + S/2 - 8, wy + S/2 - 10, S*0.14, 0, Math.PI*2); ctx.fill();
            // Trunk peek
            ctx.fillStyle = '#3a2408';
            ctx.fillRect(wx + S/2 - 4, wy + S*0.62, 8, S*0.38);
            // Occasional tropical flower on canopy
            if ((x*7+y*11) % 8 === 0) {
              ctx.fillStyle = 'rgba(255,100,30,0.80)';
              ctx.beginPath(); ctx.arc(wx + S*0.60, wy + S*0.35, 5, 0, Math.PI*2); ctx.fill();
            }
          } else if (cfg.tower) {
            // ═══════════════════════════════════════════════════════════
            //  TOWER WALLS — 10 fully unique, beautiful wall designs
            // ═══════════════════════════════════════════════════════════
            const fl  = this._towerFloor || 1;
            const t   = _towerNow;
            const ts  = x * 13 + y * 7;

            if (fl === 1) {
              // ── W1: GRAND LOBBY — Cream marble columns, gold trim ──
              ctx.fillStyle = '#cfc0a0'; ctx.fillRect(wx, wy, S, S);
              // Marble slab seam lines
              ctx.fillStyle='rgba(180,158,118,0.38)';
              ctx.fillRect(wx, wy, S, 2); ctx.fillRect(wx, wy, 2, S);
              ctx.fillStyle='rgba(150,130,90,0.22)';
              ctx.fillRect(wx+S-2, wy, 2, S); ctx.fillRect(wx, wy+S-2, S, 2);
              // Gold capital detail (top of column)
              ctx.fillStyle='rgba(200,165,70,0.35)';
              ctx.fillRect(wx+4, wy+3, S-8, 6);
              ctx.fillRect(wx+4, wy+S-9, S-8, 6);
              // Marble vein
              if ((ts*7) % 5 === 0) {
                ctx.fillStyle='rgba(160,140,100,0.20)';
                ctx.fillRect(wx+ts%30+10, wy, 2, S);
              }
              // Bevel highlight
              ctx.fillStyle='rgba(255,255,255,0.10)';
              ctx.fillRect(wx, wy, S, 2); ctx.fillRect(wx, wy, 2, S);
              // Column fluting (vertical grooves)
              for (let g=0; g<3; g++) {
                ctx.fillStyle='rgba(0,0,0,0.06)';
                ctx.fillRect(wx+S*(g*.28+.12), wy+8, 3, S-16);
              }

            } else if (fl === 2) {
              // ── W2: PARKING GARAGE — Raw concrete, signage, pipes ──
              const greyW = ['#363636','#323232','#3a3a3a'];
              ctx.fillStyle = greyW[ts % 3]; ctx.fillRect(wx, wy, S, S);
              // Concrete form-work lines
              ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.fillRect(wx, wy, S, 2); ctx.fillRect(wx, wy, 2, S);
              ctx.fillStyle='rgba(255,255,255,0.04)';
              ctx.fillRect(wx+S-2, wy, 2, S); ctx.fillRect(wx, wy+S-2, S, 2);
              // Yellow safety stripe (top)
              ctx.fillStyle='rgba(255,200,0,0.30)';
              ctx.fillRect(wx, wy, S, 5); ctx.fillRect(wx, wy+S-5, S, 5);
              // Pipe conduit
              if (ts % 4 === 0) {
                ctx.fillStyle='rgba(100,100,110,0.45)';
                ctx.fillRect(wx+S*.4, wy, S*.2, S);
                ctx.fillStyle='rgba(140,140,150,0.20)';
                ctx.fillRect(wx+S*.42, wy, S*.16, S);
              }
              // Water stain / rust
              if ((x*23+y*17) % 11 === 0) {
                ctx.fillStyle='rgba(80,50,20,0.20)';
                ctx.beginPath(); ctx.ellipse(wx+S*.5, wy+S*.6, S*.15, S*.22, .2, 0, Math.PI*2); ctx.fill();
              }
              // Spray tag
              if ((x*31+y*19) % 13 === 0) {
                ctx.fillStyle='rgba(255,80,0,0.15)'; ctx.fillRect(wx+10, wy+S*.3, S-20, S*.4);
              }

            } else if (fl === 3) {
              // ── W3: CORPORATE OFFICES — Dark walnut panels, glass strip ──
              ctx.fillStyle = '#4a3218'; ctx.fillRect(wx, wy, S, S);
              // Wood grain
              for (let g=1; g<=5; g++) {
                ctx.fillStyle=`rgba(0,0,0,${g%2===0?.07:.04})`;
                ctx.fillRect(wx, wy+S*(g/6), S, 1);
              }
              // Frosted glass strip (center horizontal band)
              ctx.fillStyle='rgba(180,200,220,0.16)';
              ctx.fillRect(wx, wy+S*.38, S, S*.24);
              ctx.fillStyle='rgba(220,235,245,0.08)';
              ctx.fillRect(wx, wy+S*.40, S, S*.20);
              // Panel frame
              ctx.fillStyle='rgba(255,210,140,0.14)';
              ctx.fillRect(wx+4, wy+4, S-8, 3);
              ctx.fillRect(wx+4, wy+S-7, S-8, 3);
              ctx.fillRect(wx+4, wy+4, 3, S-8);
              ctx.fillRect(wx+S-7, wy+4, 3, S-8);
              // Bevel
              ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.fillRect(wx, wy, S, 2); ctx.fillRect(wx, wy, 2, S);
              ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.fillRect(wx+S-2, wy, 2, S); ctx.fillRect(wx, wy+S-2, S, 2);

            } else if (fl === 4) {
              // ── W4: DATA CENTER — Black server racks, LED arrays ──
              ctx.fillStyle = '#08100e'; ctx.fillRect(wx, wy, S, S);
              // Server rack panel lines
              for (let r=0; r<5; r++) {
                ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(wx+3, wy+3+r*15, S-6, 12);
                ctx.fillStyle='rgba(0,30,50,0.60)'; ctx.fillRect(wx+4, wy+4+r*15, S-8, 10);
              }
              // LED status row (animated)
              for (let r=0; r<5; r++) {
                const ledC = (t*2 + r*.7 + x*.3) % (Math.PI*2);
                const v = Math.sin(ledC)*.4 + .6;
                const colors = ['rgba(0,255,0,', 'rgba(0,200,255,', 'rgba(255,60,0,', 'rgba(255,200,0,', 'rgba(0,255,120,'];
                ctx.fillStyle = colors[(r + ts) % 5] + `${v*.65})`;
                ctx.beginPath(); ctx.arc(wx+S-9, wy+9+r*15, 2.5, 0, Math.PI*2); ctx.fill();
              }
              // Cyan border glow
              ctx.fillStyle='rgba(0,160,220,0.20)';
              ctx.fillRect(wx, wy, S, 2); ctx.fillRect(wx, wy, 2, S);
              ctx.fillRect(wx+S-2, wy, 2, S); ctx.fillRect(wx, wy+S-2, S, 2);
              // Cable bundle
              ctx.fillStyle='rgba(20,20,40,0.60)'; ctx.fillRect(wx+S*.4, wy+S*.7, S*.2, S*.3);
              for (let c=0; c<3; c++) {
                ctx.fillStyle=['rgba(255,60,0,0.4)','rgba(0,200,255,0.4)','rgba(255,255,0,0.3)'][c];
                ctx.fillRect(wx+S*.42+c*4, wy+S*.7, 3, S*.3);
              }

            } else if (fl === 5) {
              // ── W5: VELVET LOUNGE — Deep burgundy panels, gold frames ──
              ctx.fillStyle = '#3e1212'; ctx.fillRect(wx, wy, S, S);
              // Velvet texture
              if ((ts*3) % 4 === 0) {
                ctx.fillStyle='rgba(0,0,0,0.06)';
                ctx.fillRect(wx+(ts*7)%S, wy, 2, S);
              }
              // Gold ornate frame
              ctx.fillStyle='rgba(210,170,55,0.30)';
              ctx.fillRect(wx+5, wy+5, S-10, 3);
              ctx.fillRect(wx+5, wy+S-8, S-10, 3);
              ctx.fillRect(wx+5, wy+5, 3, S-10);
              ctx.fillRect(wx+S-8, wy+5, 3, S-10);
              // Inner frame
              ctx.fillStyle='rgba(210,170,55,0.15)';
              ctx.fillRect(wx+10, wy+10, S-20, 2);
              ctx.fillRect(wx+10, wy+S-12, S-20, 2);
              ctx.fillRect(wx+10, wy+10, 2, S-20);
              ctx.fillRect(wx+S-12, wy+10, 2, S-20);
              // Sconce light
              if (x % 4 === 2 || y % 4 === 2) {
                const scP = Math.sin(t*.5)*.15 + .85;
                ctx.fillStyle = `rgba(255,200,80,${scP*.18})`;
                ctx.beginPath(); ctx.arc(wx+S*.5, wy+S*.5, S*.2, 0, Math.PI*2); ctx.fill();
              }
              // Bevel
              ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.fillRect(wx, wy, S, 2);
              ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(wx+S-2, wy, 2, S);

            } else if (fl === 6) {
              // ── W6: TACTICAL OPS — Armored steel, red alert strips ──
              ctx.fillStyle = '#12141a'; ctx.fillRect(wx, wy, S, S);
              // Armored panel bolts
              ctx.fillStyle='rgba(40,50,70,0.60)'; ctx.fillRect(wx+3, wy+3, S-6, S-6);
              ctx.fillStyle='rgba(60,70,90,0.35)'; ctx.fillRect(wx+5, wy+5, S-10, S-10);
              // Red alert strip (top + bottom)
              const alertP = Math.sin(t*2.8)*.5 + .5;
              ctx.fillStyle = `rgba(200,0,0,${alertP*.40})`;
              ctx.fillRect(wx, wy, S, 6); ctx.fillRect(wx, wy+S-6, S, 6);
              // Warning arrows
              ctx.fillStyle='rgba(220,160,0,0.25)';
              ctx.fillRect(wx, wy+S*.45, S*.2, S*.1);
              ctx.fillRect(wx+S*.8, wy+S*.45, S*.2, S*.1);
              // Security camera mount
              if ((x*17+y*23) % 8 === 0) {
                ctx.fillStyle='rgba(30,40,60,0.70)'; ctx.fillRect(wx+S*.35, wy+4, S*.3, S*.2);
                ctx.fillStyle='rgba(80,90,110,0.50)'; ctx.beginPath(); ctx.arc(wx+S*.5, wy+18, 6, 0, Math.PI*2); ctx.fill();
                const camP = Math.sin(t*1.8)*.3 + .7;
                ctx.fillStyle=`rgba(0,255,0,${camP*.5})`; ctx.beginPath(); ctx.arc(wx+S*.5, wy+18, 2, 0, Math.PI*2); ctx.fill();
              }
              // Panel bolts
              ctx.fillStyle='rgba(160,170,185,0.30)';
              ctx.beginPath(); ctx.arc(wx+6, wy+6, 3, 0, Math.PI*2); ctx.fill();
              ctx.beginPath(); ctx.arc(wx+S-6, wy+6, 3, 0, Math.PI*2); ctx.fill();
              ctx.beginPath(); ctx.arc(wx+6, wy+S-6, 3, 0, Math.PI*2); ctx.fill();
              ctx.beginPath(); ctx.arc(wx+S-6, wy+S-6, 3, 0, Math.PI*2); ctx.fill();

            } else if (fl === 7) {
              // ── W7: BIO-RESEARCH LAB — White containment walls, hazard tape ──
              ctx.fillStyle = '#d8eed8'; ctx.fillRect(wx, wy, S, S);
              // Clean tile seam
              ctx.fillStyle='rgba(25,140,80,0.16)'; ctx.fillRect(wx, wy, S, 2); ctx.fillRect(wx, wy, 2, S);
              ctx.fillStyle='rgba(0,0,0,0.10)'; ctx.fillRect(wx+S-2, wy, 2, S); ctx.fillRect(wx, wy+S-2, S, 2);
              // Green safety stripe band
              ctx.fillStyle='rgba(0,160,80,0.22)';
              ctx.fillRect(wx, wy+S*.35, S, S*.30);
              ctx.fillStyle='rgba(0,200,100,0.10)';
              ctx.fillRect(wx, wy+S*.40, S, S*.20);
              // Biohazard warning label
              if ((x*7+y*13) % 6 === 0) {
                ctx.fillStyle='rgba(0,160,80,0.20)';
                ctx.beginPath(); ctx.arc(wx+S*.5, wy+S*.5, S*.18, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle='rgba(215,235,215,.7)';
                ctx.beginPath(); ctx.arc(wx+S*.5, wy+S*.5, S*.09, 0, Math.PI*2); ctx.fill();
              }
              // Containment seals
              ctx.fillStyle='rgba(255,255,255,0.15)';
              ctx.fillRect(wx+6, wy+6, S-12, 2); ctx.fillRect(wx+6, wy+S-8, S-12, 2);
              // UV sterilization lamp glow
              if ((x+y) % 4 === 0) { ctx.fillStyle='rgba(180,230,190,0.08)'; ctx.fillRect(wx,wy,S,S); }

            } else if (fl === 8) {
              // ── W8: WEAPONS ARMORY — Gunmetal, weapon rack outlines ──
              ctx.fillStyle = '#252530'; ctx.fillRect(wx, wy, S, S);
              // Steel plate seam
              ctx.fillStyle='rgba(255,255,255,0.05)'; ctx.fillRect(wx, wy, S, 2); ctx.fillRect(wx, wy, 2, S);
              ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(wx+S-2, wy, 2, S); ctx.fillRect(wx, wy+S-2, S, 2);
              // Weapon rack silhouettes
              if (ts % 3 === 0) {
                ctx.fillStyle='rgba(80,90,105,0.40)';
                ctx.fillRect(wx+S*.15, wy+S*.15, S*.7, S*.08);
                ctx.fillRect(wx+S*.15, wy+S*.45, S*.7, S*.08);
                ctx.fillRect(wx+S*.15, wy+S*.75, S*.7, S*.08);
                // Gun pegs
                for (let p=0; p<4; p++) {
                  ctx.fillStyle='rgba(100,110,125,0.50)';
                  ctx.fillRect(wx+S*(.2+p*.18), wy+S*.15, 4, S*.35);
                }
              }
              // Orange safety diagonal
              if (x<=1 || x>=20) {
                ctx.fillStyle='rgba(255,100,0,0.35)';
                ctx.fillRect(wx, wy, S*.4, S);
                ctx.fillRect(wx+S*.6, wy, S*.4, S);
              }
              // Heavy rivet corners
              ctx.fillStyle='rgba(175,180,195,0.35)';
              ctx.beginPath(); ctx.arc(wx+7, wy+7, 4, 0, Math.PI*2); ctx.fill();
              ctx.beginPath(); ctx.arc(wx+S-7, wy+7, 4, 0, Math.PI*2); ctx.fill();
              ctx.beginPath(); ctx.arc(wx+7, wy+S-7, 4, 0, Math.PI*2); ctx.fill();
              ctx.beginPath(); ctx.arc(wx+S-7, wy+S-7, 4, 0, Math.PI*2); ctx.fill();
              // Ammo stencil
              if ((x*29+y*17) % 9 === 0) {
                ctx.fillStyle='rgba(255,100,0,0.18)'; ctx.fillRect(wx+12, wy+S*.3, S-24, S*.4);
              }

            } else if (fl === 9) {
              // ── W9: EXECUTIVE SUITE — Royal purple velvet, gold filigree ──
              ctx.fillStyle = '#200840'; ctx.fillRect(wx, wy, S, S);
              // Velvet depth
              if (ts % 3 === 0) {
                ctx.fillStyle='rgba(0,0,0,0.08)'; ctx.fillRect(wx+(ts*7)%S, wy, 2, S);
              }
              // Ornate gold filigree frame
              ctx.fillStyle='rgba(210,170,60,0.32)';
              ctx.fillRect(wx+4, wy+4, S-8, 4);
              ctx.fillRect(wx+4, wy+S-8, S-8, 4);
              ctx.fillRect(wx+4, wy+4, 4, S-8);
              ctx.fillRect(wx+S-8, wy+4, 4, S-8);
              // Inner gold line
              ctx.fillStyle='rgba(210,170,60,0.16)';
              ctx.fillRect(wx+10, wy+10, S-20, 2);
              ctx.fillRect(wx+10, wy+S-12, S-20, 2);
              ctx.fillRect(wx+10, wy+10, 2, S-20);
              ctx.fillRect(wx+S-12, wy+10, 2, S-20);
              // Crystal chandelier light on wall
              const cr9 = Math.sin(t*1.2 + x*.7 + y*.5)*.25 + .25;
              ctx.fillStyle = `rgba(200,160,255,${cr9*.18})`;
              ctx.beginPath(); ctx.arc(wx+S*.5, wy+S*.5, S*.22, 0, Math.PI*2); ctx.fill();
              // Purple ambient glow
              ctx.fillStyle='rgba(100,0,180,0.08)'; ctx.fillRect(wx,wy,S,S);

            } else {
              // ── W10: PENTHOUSE — Black marble, animated gold bands (BOSS) ──
              ctx.fillStyle = '#120808'; ctx.fillRect(wx, wy, S, S);
              // Black marble depth variation
              if (ts % 3 === 0) {
                ctx.fillStyle='rgba(30,8,8,1)'; ctx.fillRect(wx+3, wy+3, S-6, S-6);
              }
              // Animated gold border (pulsing)
              const gP10 = Math.sin(t*1.0 + x*.3 + y*.5)*.4 + .6;
              ctx.fillStyle = `rgba(255,200,0,${.40*gP10})`;
              ctx.fillRect(wx, wy, S, 4); ctx.fillRect(wx, wy+S-4, S, 4);
              ctx.fillRect(wx, wy, 4, S); ctx.fillRect(wx+S-4, wy, 4, S);
              // Gold vein
              if ((x*7+y*11) % 4 === 0) {
                const vP10 = Math.sin(t*1.5 + ts)*.35 + .65;
                ctx.fillStyle = `rgba(255,180,0,${.22*vP10})`;
                ctx.fillRect(wx+ts%30+5, wy, 2, S);
              }
              // Ember glow
              const emb = Math.sin(t*2 + x*.5 + y*.7)*.3 + .5;
              ctx.fillStyle = `rgba(200,60,0,${emb*.10})`; ctx.fillRect(wx,wy,S,S);
              // Gold inner trim
              ctx.fillStyle = `rgba(200,150,0,${.20*gP10})`;
              ctx.fillRect(wx+8, wy+8, S-16, 2); ctx.fillRect(wx+8, wy+S-10, S-16, 2);
              ctx.fillRect(wx+8, wy+8, 2, S-16); ctx.fillRect(wx+S-10, wy+8, 2, S-16);
            }
          } else if (cfg.robot) {
            // ═══════════════════════════════════════════════════════════════
            //  ROBOT CITY: Varied industrial tech structures
            // ═══════════════════════════════════════════════════════════════
            const rseed = x * 41 + y * 59;
            const t = Date.now() * 0.001;
            const structType = rseed % 6;
            // Base steel colors — dark metal with slight teal tint
            const steelBases = ['#0a1218','#0c1420','#08101a','#0e161e','#0b1319','#091118'];
            ctx.fillStyle = steelBases[rseed % steelBases.length];
            ctx.fillRect(wx, wy, S, S);

            if (structType === 0) {
              // === SERVER FARM BLOCK ===
              ctx.fillStyle = '#111c28'; ctx.fillRect(wx+4, wy+4, S-8, S-8);
              // Server rack rows
              ctx.fillStyle = '#0a1520';
              for (let rack = 0; rack < 4; rack++) {
                ctx.fillRect(wx+6, wy+10+rack*16, S-12, 11);
                // Drive status LEDs
                for (let led = 0; led < 5; led++) {
                  const ledOn = (rseed + rack * 7 + led * 3) % 4 !== 0;
                  ctx.fillStyle = ledOn ? (led%2===0 ? '#00FF88' : '#00CCFF') : '#0a1520';
                  ctx.fillRect(wx+9+led*9, wy+14+rack*16, 5, 3);
                }
              }
              // Top cable management bar
              ctx.fillStyle = '#1a2a3a'; ctx.fillRect(wx+4, wy+4, S-8, 5);
              ctx.fillStyle = 'rgba(0,200,255,0.22)'; ctx.fillRect(wx+4, wy+4, S-8, 2);

            } else if (structType === 1) {
              // === DRONE HANGAR ===
              // Hangar bay (wide flat structure)
              ctx.fillStyle = '#131e2c'; ctx.fillRect(wx+2, wy+18, S-4, S-20);
              // Hangar doors (segmented)
              ctx.fillStyle = '#0c1622';
              for (let seg = 0; seg < 4; seg++) {
                ctx.fillRect(wx+5+seg*18, wy+20, 14, S-24);
                ctx.fillStyle = 'rgba(0,180,220,0.10)';
                ctx.fillRect(wx+6+seg*18, wy+22, 12, S-28);
                ctx.fillStyle = '#0c1622';
              }
              // Roof rail
              ctx.fillStyle = '#1e2e3e'; ctx.fillRect(wx+2, wy+14, S-4, 6);
              ctx.fillStyle = 'rgba(0,220,255,0.18)'; ctx.fillRect(wx+2, wy+14, S-4, 2);
              // Landing lights
              for (let ll = 0; ll < 3; ll++) {
                const blink = Math.sin(t*4 + rseed + ll*1.3) > 0.4;
                ctx.fillStyle = blink ? '#FFAA00' : '#2a1800';
                ctx.fillRect(wx+12+ll*22, wy+16, 4, 4);
              }

            } else if (structType === 2) {
              // === MECH ASSEMBLY PLANT ===
              // Main factory body
              ctx.fillStyle = '#0f1a26'; ctx.fillRect(wx+3, wy+8, S-6, S-10);
              // Robotic arm mount (top)
              ctx.fillStyle = '#1a2a3a'; ctx.fillRect(wx+S/2-8, wy+2, 16, 10);
              ctx.fillStyle = '#2a3a4a'; ctx.fillRect(wx+S/2-4, wy, 8, 4);
              // Assembly window strips
              for (let ws = 0; ws < 3; ws++) {
                ctx.fillStyle = 'rgba(0,200,255,0.07)';
                ctx.fillRect(wx+5, wy+16+ws*18, S-10, 10);
                // Moving part indicator
                const pos = ((t*30 + rseed + ws*40) % (S-14));
                ctx.fillStyle = 'rgba(0,255,180,0.25)';
                ctx.fillRect(wx+5+pos, wy+18+ws*18, 6, 6);
              }
              // Exhaust vents (right side)
              ctx.fillStyle = '#1a2030';
              for (let ev = 0; ev < 3; ev++) {
                ctx.fillRect(wx+S-8, wy+14+ev*18, 5, 10);
                ctx.fillStyle = 'rgba(100,200,255,0.08)';
                ctx.fillRect(wx+S-7, wy+15+ev*18, 3, 8);
                ctx.fillStyle = '#1a2030';
              }

            } else if (structType === 3) {
              // === POWER STATION ===
              // Central reactor core
              ctx.fillStyle = '#0e1c2a'; ctx.fillRect(wx+12, wy+10, S-24, S-14);
              // Reactor glow
              const pulse = Math.sin(t*2.5+rseed)*0.5+0.5;
              ctx.fillStyle = `rgba(0,200,255,${0.06+pulse*0.08})`;
              ctx.fillRect(wx+16, wy+14, S-32, S-22);
              // Capacitor towers (corners)
              ctx.fillStyle = '#152030';
              ctx.fillRect(wx+2, wy+6, 10, S-8);
              ctx.fillRect(wx+S-12, wy+6, 10, S-8);
              // Power connector rings
              for (let pr = 0; pr < 3; pr++) {
                ctx.fillStyle = pr===1 ? `rgba(0,255,200,${0.15+pulse*0.12})` : 'rgba(0,180,220,0.08)';
                ctx.fillRect(wx+14, wy+20+pr*16, S-28, 3);
              }
              // Warning stripe (base)
              ctx.fillStyle = 'rgba(255,180,0,0.10)';
              ctx.fillRect(wx+2, wy+S-10, S-4, 6);
              ctx.fillStyle = 'rgba(0,0,0,0.4)';
              for (let ws=0;ws<4;ws++) ctx.fillRect(wx+3+ws*18, wy+S-9, 8, 4);

            } else if (structType === 4) {
              // === CONTROL TOWER ===
              // Narrow tall tower (top-down: square base)
              ctx.fillStyle = '#101e2e'; ctx.fillRect(wx+S*0.25, wy+4, S*0.5, S-6);
              // Observation ring
              ctx.fillStyle = '#1a2c40'; ctx.fillRect(wx+S*0.15, wy+8, S*0.7, 14);
              ctx.fillStyle = 'rgba(0,220,255,0.15)'; ctx.fillRect(wx+S*0.15, wy+8, S*0.7, 3);
              // Scanning beam
              const angle = (t * 1.5 + rseed) % (Math.PI * 2);
              const bx2 = wx + S/2 + Math.cos(angle) * S*0.28;
              const by2 = wy + S/2 + Math.sin(angle) * S*0.28;
              ctx.fillStyle = 'rgba(0,255,180,0.12)';
              ctx.beginPath(); ctx.moveTo(wx+S/2, wy+S/2); ctx.lineTo(bx2, by2); ctx.lineTo(bx2+2,by2+2); ctx.closePath(); ctx.fill();
              // Antenna
              ctx.fillStyle = '#2a3a4a'; ctx.fillRect(wx+S/2-1, wy, 2, 8);
              const blinkA = Math.sin(t*5+rseed)>0;
              ctx.fillStyle = blinkA ? '#FF4444' : '#330000';
              ctx.beginPath(); ctx.arc(wx+S/2, wy+2, 3, 0, Math.PI*2); ctx.fill();

            } else {
              // === ROBOTIC DISTRICT BLOCK (varied neon city-inspired shapes with robot aesthetic) ===
              const bshape = rseed % 4;
              ctx.fillStyle = '#111e2c';
              if (bshape === 0) {
                // L-shaped facility
                ctx.fillRect(wx+2, wy+2, S*0.5, S-4);
                ctx.fillRect(wx+2, wy+S*0.5, S-4, S*0.5-2);
              } else if (bshape === 1) {
                // Stepped
                ctx.fillRect(wx+S*0.15, wy+S*0.55, S*0.7, S*0.42);
                ctx.fillRect(wx+S*0.25, wy+S*0.25, S*0.5, S*0.65);
                ctx.fillRect(wx+S*0.35, wy+2, S*0.3, S);
              } else if (bshape === 2) {
                // Twin blocks
                ctx.fillRect(wx+2, wy+2, S*0.4, S-4);
                ctx.fillRect(wx+S*0.58, wy+2, S*0.4, S-4);
                ctx.fillRect(wx+2, wy+S*0.68, S-4, S*0.3);
              } else {
                // Wide flat hub
                ctx.fillRect(wx+2, wy+S*0.2, S-4, S*0.65);
                ctx.fillRect(wx+S*0.2, wy+2, S*0.6, S*0.8);
              }
              // Circuit trace overlay
              ctx.fillStyle = 'rgba(0,200,255,0.07)';
              ctx.fillRect(wx+S*0.5-1, wy+6, 2, S-12);
              ctx.fillRect(wx+6, wy+S*0.5-1, S-12, 2);
              // Status LED array
              for (let li = 0; li < 3; li++) {
                const on2 = (rseed + li * 5) % 3 !== 0;
                ctx.fillStyle = on2 ? (li===1?'#00FF88':'#00CCFF') : '#0a1520';
                ctx.fillRect(wx+12+li*16, wy+8, 8, 4);
              }
              // Neon trim
              ctx.strokeStyle = `rgba(0,${180+rseed%60},${200+rseed%55},0.20)`;
              ctx.lineWidth = 1.5;
              ctx.strokeRect(wx+3, wy+3, S-6, S-6);
            }

            // Shared: top LED status bar on all types
            ctx.fillStyle = rseed % 3 === 0 ? 'rgba(0,255,180,0.14)' : 'rgba(0,200,255,0.10)';
            ctx.fillRect(wx, wy, S, 2);
          } else if (cfg.galactica) {
            // Galactica: planet orb / space structure
            const pseed = (x * 41 + y * 59) % 5;
            const planetBg = ['#0c0025','#14002e','#0a001e','#180038','#100028'][pseed];
            ctx.fillStyle = planetBg;
            ctx.fillRect(wx, wy, S, S);
            // Planet sphere (top-down, slightly offset)
            const planR = Math.round(S * 0.34);
            const planX = wx + Math.round(S * 0.50);
            const planY = wy + Math.round(S * 0.48);
            const pCols = [
              ['#5522AA','#8844CC','#AA66EE'],
              ['#AA2266','#CC4488','#EE66AA'],
              ['#224499','#4466BB','#6688DD'],
              ['#229966','#44BB88','#66DDAA'],
              ['#884422','#AA6644','#CC8866'],
            ][pseed];
            const pg = ctx.createRadialGradient(planX - planR*0.3, planY - planR*0.35, 2, planX, planY, planR);
            pg.addColorStop(0, pCols[2]); pg.addColorStop(0.55, pCols[1]); pg.addColorStop(1, pCols[0]);
            ctx.fillStyle = pg;
            ctx.beginPath(); ctx.arc(planX, planY, planR, 0, Math.PI*2); ctx.fill();
            // Atmospheric band
            ctx.globalAlpha = 0.22;
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.ellipse(planX, planY - planR*0.12, planR*0.80, planR*0.22, 0, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1;
            // Ring system on some planets
            if (pseed === 1 || pseed === 3) {
              ctx.globalAlpha = 0.38;
              ctx.strokeStyle = pCols[2]; ctx.lineWidth = 2.5;
              ctx.beginPath(); ctx.ellipse(planX, planY, planR * 1.45, planR * 0.35, 0, 0, Math.PI*2); ctx.stroke();
              ctx.globalAlpha = 1;
            }
            // Tiny orbiting moon
            if ((x*7+y*11) % 4 === 0) {
              const moonA = ((x*17 + y*23) % 100) / 100 * Math.PI * 2;
              const moonX = planX + Math.cos(moonA) * planR * 1.60;
              const moonY = planY + Math.sin(moonA) * planR * 0.55;
              ctx.fillStyle = '#AABBCC';
              ctx.beginPath(); ctx.arc(moonX, moonY, planR * 0.14, 0, Math.PI*2); ctx.fill();
            }
          } else if (cfg.sky) {
            // Sky Realm: blit pre-rendered cloud canvas — single drawImage instead of 7 ellipses
            ctx.drawImage(this._skyCloudCanvas, wx, wy);
          } else if (cfg.desert || cfg.wasteland) {
            // ═══════════════════════════════════════════════════════════════
            //  WASTELAND: Unique ruined industrial structures
            // ═══════════════════════════════════════════════════════════════
            const ts = x * 41 + y * 59;
            const t = Date.now() * 0.001;

            // Scorched earth background
            const bgColors = ['#1c1612','#1a1410','#18120e','#1e1814','#161210'];
            ctx.fillStyle = bgColors[ts % bgColors.length];
            ctx.fillRect(wx, wy, S, S);

            // Structure type varies by tile
            const structType = ts % 7;

            if (structType === 0) {
              // === COLLAPSED FACTORY ===
              // Main ruined structure
              ctx.fillStyle = '#3a3530';
              ctx.fillRect(wx + 4, wy + 20, 72, 56);
              // Collapsed roof (triangular debris)
              ctx.fillStyle = '#4a4540';
              ctx.beginPath();
              ctx.moveTo(wx + 4, wy + 20);
              ctx.lineTo(wx + 40, wy + 4);
              ctx.lineTo(wx + 76, wy + 20);
              ctx.closePath();
              ctx.fill();
              // Collapsed section
              ctx.fillStyle = '#1c1612';
              ctx.beginPath();
              ctx.moveTo(wx + 50, wy + 20);
              ctx.lineTo(wx + 76, wy + 20);
              ctx.lineTo(wx + 76, wy + 50);
              ctx.lineTo(wx + 58, wy + 35);
              ctx.closePath();
              ctx.fill();
              // Exposed rebar
              ctx.strokeStyle = '#5a4a3a';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(wx + 52, wy + 22); ctx.lineTo(wx + 68, wy + 38);
              ctx.moveTo(wx + 58, wy + 22); ctx.lineTo(wx + 72, wy + 42);
              ctx.stroke();
              // Broken windows
              ctx.fillStyle = '#0a0806';
              ctx.fillRect(wx + 12, wy + 30, 14, 18);
              ctx.fillRect(wx + 32, wy + 30, 14, 18);
              // Smoke stack
              ctx.fillStyle = '#4a4a48';
              ctx.fillRect(wx + 8, wy + 6, 12, 20);
              ctx.fillStyle = '#3a3a38';
              ctx.fillRect(wx + 10, wy + 2, 8, 8);

            } else if (structType === 1) {
              // === BUNKER COMPLEX ===
              // Low fortified structure
              ctx.fillStyle = '#484848';
              ctx.fillRect(wx + 6, wy + 35, 68, 40);
              // Sloped front
              ctx.beginPath();
              ctx.moveTo(wx + 6, wy + 35);
              ctx.lineTo(wx + 20, wy + 25);
              ctx.lineTo(wx + 60, wy + 25);
              ctx.lineTo(wx + 74, wy + 35);
              ctx.lineTo(wx + 6, wy + 35);
              ctx.fillStyle = '#525252';
              ctx.fill();
              // Blast door
              ctx.fillStyle = '#3a3a3a';
              ctx.fillRect(wx + 28, wy + 45, 24, 28);
              ctx.fillStyle = '#2a2a2a';
              ctx.fillRect(wx + 30, wy + 47, 20, 24);
              // Reinforcement bands
              ctx.fillStyle = '#5a5a5a';
              ctx.fillRect(wx + 28, wy + 50, 24, 3);
              ctx.fillRect(wx + 28, wy + 62, 24, 3);
              // Gun slit
              ctx.fillStyle = '#0a0a0a';
              ctx.fillRect(wx + 12, wy + 40, 10, 4);
              ctx.fillRect(wx + 58, wy + 40, 10, 4);
              // Sandbags
              ctx.fillStyle = '#6a6050';
              ctx.fillRect(wx + 4, wy + 68, 18, 8);
              ctx.fillRect(wx + 58, wy + 68, 18, 8);

            } else if (structType === 2) {
              // === FUEL DEPOT RUINS ===
              // Toppled storage tank
              ctx.fillStyle = '#5a5248';
              ctx.save();
              ctx.translate(wx + 40, wy + 50);
              ctx.rotate(0.15);
              ctx.beginPath();
              ctx.ellipse(0, 0, 32, 18, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
              // Tank details
              ctx.fillStyle = '#4a4238';
              ctx.save();
              ctx.translate(wx + 40, wy + 50);
              ctx.rotate(0.15);
              ctx.beginPath();
              ctx.ellipse(-28, 0, 4, 16, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
              // Spilled contents
              ctx.fillStyle = 'rgba(40,30,20,0.6)';
              ctx.beginPath();
              ctx.ellipse(wx + 55, wy + 65, 20, 10, 0.3, 0, Math.PI * 2);
              ctx.fill();
              // Support frame (collapsed)
              ctx.fillStyle = '#4a4a4a';
              ctx.fillRect(wx + 8, wy + 60, 6, 16);
              ctx.fillRect(wx + 66, wy + 55, 6, 20);
              // Warning stripes
              ctx.fillStyle = '#8a7020';
              ctx.fillRect(wx + 20, wy + 32, 40, 4);
              ctx.fillStyle = '#2a2a2a';
              ctx.fillRect(wx + 24, wy + 32, 8, 4);
              ctx.fillRect(wx + 40, wy + 32, 8, 4);

            } else if (structType === 3) {
              // === CRUMBLING TOWER ===
              // Tall narrow ruin
              ctx.fillStyle = '#3e3830';
              ctx.fillRect(wx + 25, wy + 8, 30, 68);
              // Jagged top (partially collapsed)
              ctx.fillStyle = '#1c1612';
              ctx.beginPath();
              ctx.moveTo(wx + 25, wy + 8);
              ctx.lineTo(wx + 32, wy + 4);
              ctx.lineTo(wx + 38, wy + 12);
              ctx.lineTo(wx + 45, wy + 2);
              ctx.lineTo(wx + 55, wy + 8);
              ctx.lineTo(wx + 55, wy + 8);
              ctx.lineTo(wx + 25, wy + 8);
              ctx.fill();
              // Rubble at base
              ctx.fillStyle = '#4a4540';
              ctx.beginPath();
              ctx.moveTo(wx + 10, wy + 76);
              ctx.lineTo(wx + 25, wy + 60);
              ctx.lineTo(wx + 25, wy + 76);
              ctx.closePath();
              ctx.fill();
              ctx.beginPath();
              ctx.moveTo(wx + 70, wy + 76);
              ctx.lineTo(wx + 55, wy + 55);
              ctx.lineTo(wx + 55, wy + 76);
              ctx.closePath();
              ctx.fill();
              // Window holes
              ctx.fillStyle = '#0c0a08';
              for (let wy2 = 20; wy2 < 70; wy2 += 16) {
                ctx.fillRect(wx + 32, wy + wy2, 10, 8);
                ctx.fillRect(wx + 46, wy + wy2 + 8, 6, 6);
              }
              // Exposed floors
              ctx.fillStyle = '#5a5550';
              ctx.fillRect(wx + 25, wy + 35, 30, 3);
              ctx.fillRect(wx + 25, wy + 55, 30, 3);

            } else if (structType === 4) {
              // === DEBRIS FIELD ===
              // Multiple rubble piles
              ctx.fillStyle = '#4a4540';
              ctx.beginPath();
              ctx.moveTo(wx + 5, wy + 50);
              ctx.lineTo(wx + 25, wy + 25);
              ctx.lineTo(wx + 45, wy + 50);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = '#3a3530';
              ctx.beginPath();
              ctx.moveTo(wx + 35, wy + 65);
              ctx.lineTo(wx + 55, wy + 35);
              ctx.lineTo(wx + 75, wy + 65);
              ctx.closePath();
              ctx.fill();
              // Scattered concrete chunks
              ctx.fillStyle = '#5a5a58';
              ctx.fillRect(wx + 10, wy + 55, 12, 8);
              ctx.fillRect(wx + 60, wy + 45, 10, 10);
              ctx.fillRect(wx + 30, wy + 68, 15, 6);
              // Rebar sticking out
              ctx.strokeStyle = '#6a5a4a';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(wx + 22, wy + 30); ctx.lineTo(wx + 28, wy + 18);
              ctx.moveTo(wx + 52, wy + 40); ctx.lineTo(wx + 58, wy + 28);
              ctx.moveTo(wx + 18, wy + 58); ctx.lineTo(wx + 12, wy + 48);
              ctx.stroke();
              // Dust/ash layer
              ctx.fillStyle = 'rgba(80,75,70,0.25)';
              ctx.fillRect(wx + 2, wy + 70, 76, 8);

            } else if (structType === 5) {
              // === WRECKED WAREHOUSE ===
              // Long low structure
              ctx.fillStyle = '#3e3a35';
              ctx.fillRect(wx + 2, wy + 30, 76, 46);
              // Corrugated roof (partial)
              ctx.fillStyle = '#5a5550';
              ctx.fillRect(wx + 2, wy + 26, 50, 8);
              // Roof corrugation
              ctx.strokeStyle = '#4a4540';
              ctx.lineWidth = 1;
              for (let rx = 6; rx < 48; rx += 6) {
                ctx.beginPath();
                ctx.moveTo(wx + rx, wy + 26);
                ctx.lineTo(wx + rx, wy + 34);
                ctx.stroke();
              }
              // Collapsed roof section
              ctx.fillStyle = '#4a4540';
              ctx.beginPath();
              ctx.moveTo(wx + 52, wy + 26);
              ctx.lineTo(wx + 78, wy + 26);
              ctx.lineTo(wx + 78, wy + 50);
              ctx.lineTo(wx + 58, wy + 38);
              ctx.closePath();
              ctx.fill();
              // Loading dock
              ctx.fillStyle = '#4a4a48';
              ctx.fillRect(wx + 8, wy + 55, 30, 18);
              ctx.fillStyle = '#2a2a28';
              ctx.fillRect(wx + 12, wy + 58, 22, 12);
              // Cargo crates
              ctx.fillStyle = '#5a5040';
              ctx.fillRect(wx + 45, wy + 58, 12, 14);
              ctx.fillRect(wx + 60, wy + 62, 10, 10);

            } else {
              // === RADIO TOWER RUIN ===
              // Fallen lattice tower
              ctx.strokeStyle = '#5a5a58';
              ctx.lineWidth = 3;
              // Main tower (tilted)
              ctx.save();
              ctx.translate(wx + 40, wy + 70);
              ctx.rotate(-0.35);
              ctx.beginPath();
              ctx.moveTo(-8, 0); ctx.lineTo(-4, -60);
              ctx.moveTo(8, 0); ctx.lineTo(4, -60);
              ctx.moveTo(-4, -60); ctx.lineTo(4, -60);
              ctx.stroke();
              // Cross braces
              ctx.lineWidth = 1;
              for (let ty = -10; ty > -55; ty -= 15) {
                ctx.beginPath();
                ctx.moveTo(-6, ty); ctx.lineTo(6, ty - 10);
                ctx.moveTo(6, ty); ctx.lineTo(-6, ty - 10);
                ctx.stroke();
              }
              ctx.restore();
              // Base wreckage
              ctx.fillStyle = '#4a4a48';
              ctx.fillRect(wx + 30, wy + 62, 20, 14);
              // Dish (fallen)
              ctx.fillStyle = '#5a5a58';
              ctx.beginPath();
              ctx.ellipse(wx + 18, wy + 55, 14, 8, -0.4, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#3a3a38';
              ctx.beginPath();
              ctx.ellipse(wx + 18, wy + 55, 8, 4, -0.4, 0, Math.PI * 2);
              ctx.fill();
              // Cables
              ctx.strokeStyle = '#3a3530';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(wx + 25, wy + 52);
              ctx.quadraticCurveTo(wx + 40, wy + 45, wx + 55, wy + 58);
              ctx.stroke();
            }

            // === COMMON ELEMENTS ===
            // Faint fire glow (rare)
            if (ts % 11 === 0) {
              const flicker = 0.4 + Math.sin(t * 6) * 0.15;
              ctx.fillStyle = `rgba(200,100,30,${flicker * 0.3})`;
              ctx.beginPath();
              ctx.arc(wx + 20 + (ts % 40), wy + 50 + (ts % 20), 12, 0, Math.PI * 2);
              ctx.fill();
            }

            // Cracks in ground
            ctx.strokeStyle = 'rgba(0,0,0,0.35)';
            ctx.lineWidth = 1;
            if (ts % 3 === 0) {
              ctx.beginPath();
              ctx.moveTo(wx + 5, wy + 70 + (ts % 8));
              ctx.lineTo(wx + 30 + (ts % 20), wy + 65);
              ctx.lineTo(wx + 50, wy + 75);
              ctx.stroke();
            }
          } else if (cfg.zombie) {
            // Zombie: decayed crumbling infected buildings
            const bseed = (x * 41 + y * 59) % 6;
            ctx.fillStyle = ['#091209','#0a140a','#081008','#0b160b','#070e07','#0c1a0c'][bseed];
            ctx.fillRect(wx, wy, S, S);
            // Crumbled corner damage
            ctx.fillStyle = 'rgba(0,0,0,0.32)';
            if (bseed % 3 === 0)      { ctx.fillRect(wx, wy, Math.round(S * 0.28), Math.round(S * 0.28)); }
            else if (bseed % 3 === 1) { ctx.fillRect(wx + Math.round(S * 0.72), wy, Math.round(S * 0.28), Math.round(S * 0.28)); }
            // Mold/decay staining — top portion darker
            ctx.fillStyle = 'rgba(20,80,20,0.16)';
            ctx.fillRect(wx + 3, wy + 3, S - 6, Math.round(S * 0.45));
            // Crack lines
            if ((x * 7 + y * 11) % 3 === 0) {
              ctx.fillStyle = 'rgba(0,20,0,0.38)';
              ctx.fillRect(wx + Math.round(S * 0.38), wy, 2, S);
            }
            if ((x * 11 + y * 13) % 4 === 0) {
              ctx.fillStyle = 'rgba(0,18,0,0.30)';
              ctx.fillRect(wx, wy + Math.round(S * 0.45), S, 2);
            }
            // Biohazard glow bloom on some buildings
            if ((x * 13 + y * 17) % 5 === 0) {
              ctx.fillStyle = 'rgba(44,200,60,0.09)';
              ctx.fillRect(wx + Math.round(S * 0.18), wy + Math.round(S * 0.18), Math.round(S * 0.64), Math.round(S * 0.64));
            }
            // Green neon edge glow
            ctx.strokeStyle = cfg.neonColors[(x + y) % cfg.neonColors.length] + '55';
            ctx.lineWidth = 1;
            ctx.strokeRect(wx + 2, wy + 2, S - 4, S - 4);
            // Broken + dim windows
            for (let wy2 = 0; wy2 < 2; wy2++) {
              for (let wx2 = 0; wx2 < 2; wx2++) {
                if (Math.sin(x * 5.7 + y * 3.3 + wx2 * 7 + wy2 * 11) > 0.15) {
                  const broken = (x + y + wx2 + wy2) % 3 === 0;
                  ctx.fillStyle = broken ? 'rgba(0,0,0,0.85)' : cfg.windowColors[(x * 3 + y * 7) % cfg.windowColors.length] + '44';
                  ctx.fillRect(wx + 12 + wx2 * 22, wy + 12 + wy2 * 22, 8, 6);
                  if (broken) {
                    ctx.fillStyle = 'rgba(44,200,60,0.20)';
                    ctx.fillRect(wx + 12 + wx2 * 22 + 3, wy + 12 + wy2 * 22, 1, 6);
                    ctx.fillRect(wx + 12 + wx2 * 22, wy + 12 + wy2 * 22 + 3, 8, 1);
                  }
                }
              }
            }
            // Biohazard circle emblem on rarer buildings
            if ((x * 13 + y * 19) % 7 === 0) {
              ctx.globalAlpha = 0.22;
              ctx.fillStyle = '#44FF88';
              ctx.beginPath(); ctx.arc(wx + S * 0.5, wy + S * 0.52, S * 0.12, 0, Math.PI * 2); ctx.fill();
              ctx.globalAlpha = 0.10;
              ctx.beginPath(); ctx.arc(wx + S * 0.5, wy + S * 0.52, S * 0.22, 0, Math.PI * 2); ctx.fill();
              ctx.globalAlpha = 1;
            }
          } else if (cfg.id === 'neon_city') {
            // Neon City: Varied 2D building shapes with cyberpunk style
            const bseed = (x * 41 + y * 59) % 8;
            const baseCol = this.buildingColors[y][x];
            ctx.fillStyle = baseCol;

            // Different building shapes based on seed
            if (bseed === 0) {
              // Tall narrow skyscraper
              ctx.fillRect(wx + S*0.2, wy, S*0.6, S);
              ctx.fillStyle = 'rgba(0,0,0,0.3)';
              ctx.fillRect(wx + S*0.2, wy, S*0.6, S*0.1);
            } else if (bseed === 1) {
              // L-shaped building
              ctx.fillRect(wx, wy, S*0.5, S);
              ctx.fillRect(wx, wy + S*0.5, S, S*0.5);
            } else if (bseed === 2) {
              // Stepped pyramid
              ctx.fillRect(wx + S*0.1, wy + S*0.6, S*0.8, S*0.4);
              ctx.fillRect(wx + S*0.2, wy + S*0.3, S*0.6, S*0.7);
              ctx.fillRect(wx + S*0.3, wy, S*0.4, S);
            } else if (bseed === 3) {
              // Twin towers
              ctx.fillRect(wx + S*0.05, wy, S*0.35, S);
              ctx.fillRect(wx + S*0.6, wy, S*0.35, S);
              ctx.fillRect(wx + S*0.2, wy + S*0.7, S*0.6, S*0.3);
            } else if (bseed === 4) {
              // Rounded top building
              ctx.fillRect(wx + S*0.15, wy + S*0.3, S*0.7, S*0.7);
              ctx.beginPath();
              ctx.arc(wx + S*0.5, wy + S*0.35, S*0.35, Math.PI, 0);
              ctx.fill();
            } else if (bseed === 5) {
              // Hexagonal tower
              ctx.beginPath();
              const hcx = wx + S*0.5, hcy = wy + S*0.5;
              for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 2;
                const hx = hcx + Math.cos(angle) * S*0.42;
                const hy = hcy + Math.sin(angle) * S*0.42;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
              }
              ctx.closePath();
              ctx.fill();
            } else if (bseed === 6) {
              // Slanted/parallelogram
              ctx.beginPath();
              ctx.moveTo(wx + S*0.2, wy);
              ctx.lineTo(wx + S*0.9, wy);
              ctx.lineTo(wx + S*0.8, wy + S);
              ctx.lineTo(wx + S*0.1, wy + S);
              ctx.closePath();
              ctx.fill();
            } else {
              // Standard with setback
              ctx.fillRect(wx + S*0.05, wy + S*0.4, S*0.9, S*0.6);
              ctx.fillRect(wx + S*0.15, wy, S*0.7, S);
            }

            // Neon edge glow
            ctx.strokeStyle = cfg.neonColors[(x + y) % cfg.neonColors.length] + '66';
            ctx.lineWidth = 1;
            ctx.strokeRect(wx + 2, wy + 2, S - 4, S - 4);

            // Cyber windows - small glowing dots
            const winCol = cfg.windowColors[(x * 3 + y * 7) % cfg.windowColors.length];
            ctx.fillStyle = winCol;
            for (let wy2 = 0; wy2 < 3; wy2++) {
              for (let wx2 = 0; wx2 < 3; wx2++) {
                if (Math.sin(x * 5.7 + y * 3.3 + wx2 * 7 + wy2 * 11) > 0.1) {
                  ctx.fillRect(wx + 12 + wx2 * 22, wy + 12 + wy2 * 22, 8, 6);
                }
              }
            }
          } else if (cfg.blitz) {
            // ═══════════════════════════════════════════════════════════════
            //  BLITZ: Massive speed-zone buildings with fire neon
            // ═══════════════════════════════════════════════════════════════
            const t  = Date.now() * 0.001;
            const ts = x * 41 + y * 59;
            const blNeons = ['#FF4400','#FF2200','#FF6600','#FF0022','#FF8800'];
            const blSigns = ['RUSH','BLITZ','SURGE','SPEED','FIRE','OVERDRIVE','FLASH'];
            ctx.fillStyle = '#070302'; ctx.fillRect(wx, wy, S, S);
            const blLayout = ts % 3;
            const blDefs = blLayout === 0
              ? [{x:0,y:0,w:42,h:80},{x:44,y:0,w:36,h:80}]
              : blLayout === 1
              ? [{x:0,y:0,w:80,h:44},{x:0,y:46,w:80,h:34}]
              : [{x:0,y:0,w:80,h:46},{x:0,y:48,w:38,h:32},{x:42,y:48,w:38,h:32}];
            for (let i = 0; i < blDefs.length; i++) {
              const bd = blDefs[i];
              const bx = wx+bd.x, by = wy+bd.y, bw = bd.w, bh = bd.h;
              const bseed = ts*7 + i*31;
              const neonCol = blNeons[bseed % blNeons.length];
              // Drop shadow
              ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(bx+4,by+4,bw,bh);
              // Body
              ctx.fillStyle='#0d0402'; ctx.fillRect(bx,by,bw,bh);
              // Outer border
              ctx.strokeStyle=neonCol; ctx.lineWidth=3;
              ctx.strokeRect(bx+2,by+2,bw-4,bh-4);
              // Inner panel
              ctx.fillStyle='#090301'; ctx.fillRect(bx+6,by+6,bw-12,bh-12);
              // Secondary border
              ctx.strokeStyle=neonCol+'55'; ctx.lineWidth=1;
              ctx.strokeRect(bx+10,by+10,bw-20,bh-20);
              // Speed stripe accents
              for (let si=0;si<3;si++) {
                ctx.fillStyle = si===1 ? neonCol+'70' : neonCol+'28';
                ctx.fillRect(bx+12, by+Math.floor(bh*(0.20+si*0.24)), bw-24, si===1?2:1);
              }
              // Roof equipment
              const roofType = (bseed+i)%3;
              if (roofType===0) {
                ctx.fillStyle='#444'; ctx.fillRect(bx+bw/2-2,by-10,4,20);
                const blink3=Math.sin(t*6+bseed)>0;
                ctx.fillStyle=blink3?neonCol:neonCol+'30';
                ctx.beginPath(); ctx.arc(bx+bw/2,by-10,5,0,Math.PI*2); ctx.fill();
                ctx.strokeStyle=neonCol+'60'; ctx.lineWidth=2;
                ctx.beginPath(); ctx.arc(bx+bw/2,by-10,8+3*Math.sin(t*4+bseed),0,Math.PI*2); ctx.stroke();
              } else if (roofType===1) {
                ctx.fillStyle='#777'; ctx.fillRect(bx+bw/2-1,by-12,2,18); ctx.fillRect(bx+bw/2-6,by-2,12,3);
                if (Math.sin(t*8+bseed)>0.5) {
                  ctx.fillStyle='#FFEE44';
                  ctx.beginPath(); ctx.arc(bx+bw/2,by-12,3,0,Math.PI*2); ctx.fill();
                }
              } else {
                ctx.fillStyle='#333'; ctx.fillRect(bx+10,by+6,22,12); ctx.fillRect(bx+bw-32,by+8,20,10);
                ctx.fillStyle=neonCol+'40'; ctx.fillRect(bx+11,by+8,20,2); ctx.fillRect(bx+11,by+13,20,2);
              }
              // Neon sign
              if (bw>35) {
                const sgnT=blSigns[bseed%blSigns.length];
                const sgnW=Math.min(bw-20,52), sgnH=13;
                const sgnX=bx+(bw-sgnW)/2, sgnY=by+bh-20;
                ctx.fillStyle='#040100'; ctx.fillRect(sgnX,sgnY,sgnW,sgnH);
                ctx.strokeStyle=neonCol; ctx.lineWidth=2; ctx.strokeRect(sgnX,sgnY,sgnW,sgnH);
                ctx.fillStyle=neonCol; ctx.font='bold 9px monospace';
                ctx.fillText(sgnT, sgnX+5, sgnY+10);
              }
              if (bh>40) { ctx.fillStyle=neonCol+'33'; ctx.fillRect(bx+12,by+Math.floor(bh*0.45),bw-24,2); }
            }
          } else if (cfg.arena) {
            // ═══════════════════════════════════════════════════════════════
            //  ARENA: 2-3 MASSIVE monolithic buildings per tile
            // ═══════════════════════════════════════════════════════════════
            const t = Date.now() * 0.001;
            const ts = x * 41 + y * 59;
            const neons = ['#FF0066','#FF6600','#CC00FF','#FF3366','#AA00FF'];
            const signs = ['RAMEN','NEURO','ARENA','COMBAT','DATA-X','CYBER','BLADE'];

            // Dark background
            ctx.fillStyle = '#0a0406';
            ctx.fillRect(wx, wy, S, S);

            // 2-3 MASSIVE buildings per tile (not dense clusters)
            const layout = ts % 3;
            let bldDefs = [];
            if (layout === 0) {
              // Two large buildings side by side
              bldDefs = [
                {x:0, y:0, w:42, h:80},
                {x:44, y:0, w:36, h:80}
              ];
            } else if (layout === 1) {
              // Two large buildings stacked
              bldDefs = [
                {x:0, y:0, w:80, h:42},
                {x:0, y:44, w:80, h:36}
              ];
            } else {
              // Three buildings - one large, two medium
              bldDefs = [
                {x:0, y:0, w:80, h:48},
                {x:0, y:50, w:42, h:30},
                {x:44, y:50, w:36, h:30}
              ];
            }

            // Draw each MASSIVE building
            for (let i = 0; i < bldDefs.length; i++) {
              const bd = bldDefs[i];
              const bx = wx + bd.x, by = wy + bd.y, bw = bd.w, bh = bd.h;
              const seed = ts * 7 + i * 31;
              const neonCol = neons[seed % neons.length];

              // Drop shadow
              ctx.fillStyle = 'rgba(0,0,0,0.6)';
              ctx.fillRect(bx + 4, by + 4, bw, bh);

              // Solid building body
              ctx.fillStyle = '#1a0a0c';
              ctx.fillRect(bx, by, bw, bh);

              // Bright neon border
              ctx.strokeStyle = neonCol;
              ctx.lineWidth = 3;
              ctx.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);

              // Inner panel
              ctx.fillStyle = '#120608';
              ctx.fillRect(bx + 6, by + 6, bw - 12, bh - 12);

              // Secondary border
              ctx.strokeStyle = neonCol + '66';
              ctx.lineWidth = 1;
              ctx.strokeRect(bx + 10, by + 10, bw - 20, bh - 20);

              // === LARGE ROOF EQUIPMENT ===
              const roofType = (seed + i) % 4;

              if (roofType === 0) {
                // Large satellite dish
                ctx.fillStyle = '#999999';
                ctx.beginPath();
                ctx.ellipse(bx + bw - 22, by + 16, 14, 7, -0.25, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#666666';
                ctx.beginPath();
                ctx.ellipse(bx + bw - 22, by + 15, 9, 4, -0.25, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#444444';
                ctx.fillRect(bx + bw - 23, by + 16, 3, 14);
                ctx.fillRect(bx + bw - 28, by + 28, 14, 4);
              } else if (roofType === 1) {
                // Large solar panel array
                ctx.fillStyle = '#1a4488';
                ctx.fillRect(bx + 12, by + 8, bw - 24, 16);
                ctx.strokeStyle = '#2a66aa';
                ctx.lineWidth = 1;
                const panelW = bw - 24;
                for (let p = 1; p < 6; p++) {
                  ctx.beginPath();
                  ctx.moveTo(bx + 12 + p * panelW / 6, by + 8);
                  ctx.lineTo(bx + 12 + p * panelW / 6, by + 24);
                  ctx.stroke();
                }
                ctx.beginPath();
                ctx.moveTo(bx + 12, by + 16);
                ctx.lineTo(bx + bw - 12, by + 16);
                ctx.stroke();
              } else if (roofType === 2) {
                // Multiple vent units
                ctx.fillStyle = '#444444';
                ctx.fillRect(bx + 10, by + 8, 20, 14);
                ctx.fillRect(bx + bw - 30, by + 10, 18, 12);
                ctx.fillStyle = '#2a2a2a';
                ctx.fillRect(bx + 12, by + 10, 16, 3);
                ctx.fillRect(bx + 12, by + 16, 16, 3);
                ctx.fillRect(bx + bw - 28, by + 12, 14, 3);
                ctx.fillRect(bx + bw - 28, by + 17, 14, 3);
              } else {
                // Antenna with blinking light + small dish
                ctx.fillStyle = '#555555';
                ctx.fillRect(bx + bw/2 - 2, by - 8, 4, 18);
                ctx.fillRect(bx + bw/2 - 8, by + 6, 16, 4);
                const blink = Math.sin(t * 4 + seed) > 0.2;
                ctx.fillStyle = blink ? '#FF0044' : '#550015';
                ctx.beginPath();
                ctx.arc(bx + bw/2, by - 8, 5, 0, Math.PI * 2);
                ctx.fill();
                // Small dish
                ctx.fillStyle = '#888888';
                ctx.beginPath();
                ctx.ellipse(bx + 20, by + 14, 10, 5, 0, 0, Math.PI * 2);
                ctx.fill();
              }

              // === LARGE NEON SIGN ===
              if (bw > 35) {
                const signText = signs[seed % signs.length];
                const signW = Math.min(bw - 20, 55);
                const signH = 14;
                const signX = bx + (bw - signW) / 2;
                const signY = by + bh - 20;

                // Sign backing
                ctx.fillStyle = '#080004';
                ctx.fillRect(signX, signY, signW, signH);

                // Sign border
                ctx.strokeStyle = neonCol;
                ctx.lineWidth = 2;
                ctx.strokeRect(signX, signY, signW, signH);

                // Sign text
                ctx.fillStyle = neonCol;
                ctx.font = 'bold 10px monospace';
                ctx.fillText(signText, signX + 6, signY + 11);
              }

              // Horizontal neon accent
              if (bh > 40) {
                ctx.fillStyle = neonCol;
                ctx.fillRect(bx + 12, by + Math.floor(bh * 0.45), bw - 24, 2);
              }
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
          if (this._rxSet && !cfg.robot) {
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

          // Windows (not in robot/jungle/desert/neon_city) — no shadowBlur for performance
          // Neon City has custom windows in the building shapes above
          if (!cfg.robot && !cfg.jungle && !cfg.desert && !cfg.galactica && !cfg.zombie && cfg.id !== 'neon_city' && this.buildingWindows[y][x]) {
            const wc = cfg.windowColors[(Math.floor(x/2) + Math.floor(y/2)) % cfg.windowColors.length];
            ctx.fillStyle = wc + 'CC';
            for (let wy2 = 0; wy2 < 2; wy2++) {
              for (let wx2 = 0; wx2 < 2; wx2++) {
                if (Math.sin(x * 7.3 + y * 3.1 + wx2 * 5 + wy2 * 11) > -0.3) {
                  ctx.fillRect(wx + 10 + wx2 * 32, wy + 10 + wy2 * 32, 14, 10);
                }
              }
            }
          }
          // Neon sign strips (not in robot/jungle/desert/neon_city) — no shadowBlur for performance
          // Neon City has custom neon effects in building shapes
          if (!cfg.robot && !cfg.jungle && !cfg.desert && !cfg.galactica && !cfg.zombie && cfg.id !== 'neon_city' && (x + y) % cfg.neonFreq === 0) {
            const nc = cfg.neonColors[(x * 3 + y) % cfg.neonColors.length];
            ctx.globalAlpha = 0.65;
            ctx.strokeStyle = nc; ctx.lineWidth = 2;
            ctx.strokeRect(wx + 8, wy + 8, S - 16, S - 16);
            ctx.globalAlpha = 1;
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
            // Canopy body — flat color, no shadowBlur/gradient for perf
            ctx.fillStyle = signColor + 'BB';
            ctx.beginPath(); ctx.roundRect(awX, awY, awW, awH, 2); ctx.fill();
            // Canopy fringe (scalloped)
            ctx.fillStyle = signColor + '99';
            const fCount = 6, fW = awW / fCount;
            for (let fi = 0; fi < fCount; fi++) {
              ctx.beginPath(); ctx.arc(awX + fi * fW + fW / 2, awY + awH, fW * 0.34, 0, Math.PI); ctx.fill();
            }

            // ── Sign above awning ─────────────────────────────
            ctx.save();
            ctx.font = 'bold 7px Orbitron, monospace';
            const textWidth = ctx.measureText(signText).width;
            const signW  = Math.max(dw + 24, textWidth + 16);
            const signH  = 14;
            const signX  = cx2 - signW / 2;
            const signY  = awY - signH - 2;
            ctx.fillStyle = 'rgba(6,6,14,0.90)';
            ctx.beginPath(); ctx.roundRect(signX, signY, signW, signH, 3); ctx.fill();
            ctx.strokeStyle = signColor; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.roundRect(signX, signY, signW, signH, 3); ctx.stroke();
            ctx.fillStyle = signColor;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(signText, cx2, signY + signH / 2);
            ctx.textBaseline = 'alphabetic';
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
        // Window slots on the wall face — no shadowBlur for performance
        if (this.buildingWindows[y][x]) {
          const wc = cfg.windowColors[(Math.floor(x/2) + Math.floor(y/2)) % cfg.windowColors.length];
          ctx.fillStyle = wc + 'AA';
          const wW = 10, wHh = 7;
          for (let wi = 0; wi < 3; wi++) {
            const wx3 = wx2 + 8 + wi * Math.floor((S - 16) / 3);
            if (wx3 + wW < wx2 + S - 6)
              ctx.fillRect(wx3, wy2 + S + 3, wW, wHh);
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
    const isRobot = !!this.config.robot;
    ctx.save();
    if (isRobot) {
      // Robot City: teal/cyan transit node
      ctx.fillStyle = '#040e14';
      ctx.fillRect(wx - S * 0.5, wy - S * 0.5, S, S);
      // Circuit corner pads
      ctx.fillStyle = 'rgba(0,220,255,0.18)';
      ctx.fillRect(wx - S*0.5 + 3, wy - S*0.5 + 3, 8, 8);
      ctx.fillRect(wx + S*0.5 - 11, wy - S*0.5 + 3, 8, 8);
      ctx.fillRect(wx - S*0.5 + 3, wy + S*0.5 - 11, 8, 8);
      ctx.fillRect(wx + S*0.5 - 11, wy + S*0.5 - 11, 8, 8);
      // Bottom step bars
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = `rgba(0,200,255,${0.35 - i * 0.07})`;
        ctx.fillRect(wx - S * 0.5 + i * 5, wy + S * 0.5 - (i + 1) * 9, S - i * 10, 5);
      }
      // Outer border
      ctx.strokeStyle = 'rgba(0,200,255,0.35)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(wx - S*0.5 + 2, wy - S*0.5 + 2, S-4, S-4);
      // T label
      ctx.font = 'bold 26px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#00CCFF'; ctx.shadowColor = '#00CCFF'; ctx.shadowBlur = 22;
      ctx.fillText('T', wx, wy);
    } else {
      // Standard: green metro M
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
    }
    ctx.shadowBlur = 0; ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  // ── Indoor room factory ───────────────────────────────────
  getRoom(door) {
    const RS          = 60;  // indoor tile size (px)
    const isGalactica = !!this.config.galactica;
    const isBlitz     = !!this.config.blitz;
    const isNeonDealer  = this.config.id === 'neon_city' && door.specialType === 'dealership';
    const isGalDealer   = isGalactica && door.specialType === 'dealership';
    const isWastelandDealer = !!this.config.wasteland && door.specialType === 'dealership';
    const isNeonArcade  = this.config.id === 'neon_city' && door.bTypeIdx === 4;
    const isGalArcade   = isGalactica && door.bTypeIdx === 4;
    const isGalMarket   = isGalactica && door.bTypeIdx === 3;
    const isGalClub     = isGalactica && door.bTypeIdx === 8;
    const isGalRest     = isGalactica && (door.bTypeIdx === 0 || door.specialType === 'restaurant');
    const isGalPharmacy = isGalactica && door.bTypeIdx === 5;
    const isGalRadio    = isGalactica && door.bTypeIdx === 22;
    const isZombieMap   = !!this.config.zombie;
    const useLargeDealer = isNeonDealer || isGalDealer || isWastelandDealer;
    const useLargeArcade = isNeonArcade || isGalArcade;
    const useLargeMarket = isGalMarket;
    const useLargeClub   = isGalClub;
    const useLargeRest   = isGalRest;
    const useLargePharm  = isGalPharmacy;
    const useLargeRadio  = isGalRadio;
    // All zombie buildings use the large arcade layout (1080×840)
    const useLargeZombie = isZombieMap;
    // All blitz buildings use large rooms (same as galactica)
    const useLargeBlitz  = isBlitz;
    const useLarge = useLargeDealer || useLargeArcade || useLargeMarket || useLargeClub || useLargeRest || useLargePharm || useLargeRadio || useLargeZombie || useLargeBlitz;
    const layout = useLargeDealer ? ROOM_LAYOUT_DEALER_NEON
                 : useLargeArcade ? ROOM_LAYOUT_ARCADE_NEON
                 : useLargeMarket ? ROOM_LAYOUT_DEALER_NEON
                 : useLargeClub   ? ROOM_LAYOUT_ARCADE_NEON
                 : useLargeRest   ? ROOM_LAYOUT_ARCADE_NEON
                 : useLargePharm  ? ROOM_LAYOUT_ARCADE_NEON
                 : useLargeRadio  ? ROOM_LAYOUT_ARCADE_NEON
                 : useLargeZombie ? ROOM_LAYOUT_ARCADE_NEON
                 : useLargeBlitz  ? ROOM_LAYOUT_ARCADE_NEON
                 : door.type === 2 ? ROOM_LAYOUT_2 : ROOM_LAYOUT_1;
    const RH     = layout.length;
    const RW     = layout[0].length;
    const RW_px  = RW * RS;
    const RH_px  = RH * RS;

    // Entry X = door gap center of the bottom row
    const entryX = useLarge
      ? ((7 + 10) / 2 + 0.5) * RS   // Large rooms: gap cols 7-10 center
      : door.type === 2
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
