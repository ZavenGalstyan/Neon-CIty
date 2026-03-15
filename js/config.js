'use strict';

/**
 * @file config.js
 * Single source of truth for all game constants and data tables.
 *
 * Sections:
 *   BULLET_LIFETIME, BOT_*, CAM_LERP, PARTICLES — numeric tuning knobs
 *   CHARACTERS   — 8 playable characters (stats, companion, starterWeapon)
 *   MAPS         — 18 maps (id, label, size, weather, special flags)
 *   WEAPONS      — all purchasable / starter weapons
 *   UPGRADES     — shop upgrade definitions
 *   BUILDING_TYPES — 24 building labels for procedural map generation
 *   CAR_DEALERSHIP — 4 purchasable vehicle configs
 *   GRENADE      — grenade physics constants
 *   ZOMBIE_CONFIGS, GLOBAL_EVENTS — zombie wave and random event tables
 *
 * Nothing in this file should have side effects or DOM access.
 */
const CONFIG = {
  // Bullets
  BULLET_LIFETIME: 1.8,
  BOT_BULLET_SPEED: 320,

  // Bots
  BOT_SPAWN_INTERVAL: 3200,
  MAX_BOTS: 12,
  MONEY_PER_KILL: 250,
  BOT_VISION_RANGE: 400,
  BOT_ATTACK_RANGE: 330,
  BOT_HEALTH: 60,
  BOT_SPEED: 95,
  BOT_DAMAGE: 12,
  BOT_FIRE_RATE: 900,

  // Camera
  CAM_LERP: 0.09,

  // Particles
  DEATH_PARTICLES: 14,
  HIT_PARTICLES: 5,

  // ── Characters ──────────────────────────────────────────
  CHARACTERS: [
    {
      id: 'gangster', name: 'THE GANGSTER', lore: 'Street boss with no mercy.',
      color: '#FF4466', accent: '#FF0033', gunColor: '#888',
      speed: 185, health: 120, damage: 35, fireRate: 280, radius: 18,
      stats: { speed: 55, health: 72, damage: 88 }, companion: 'dog'
    },
    {
      id: 'hacker', name: 'THE HACKER', lore: 'Digital ghost. Faster than light.',
      color: '#44EEFF', accent: '#00BBFF', gunColor: '#00FFCC',
      speed: 250, health: 80, damage: 18, fireRate: 110, radius: 16,
      stats: { speed: 95, health: 45, damage: 45 }, companion: 'cat'
    },
    {
      id: 'mercenary', name: 'THE MERCENARY', lore: 'War machine. Built to survive.',
      color: '#44FF88', accent: '#00CC44', gunColor: '#AAFFAA',
      speed: 148, health: 200, damage: 28, fireRate: 380, radius: 20,
      stats: { speed: 38, health: 100, damage: 65 }, companion: 'wolf'
    },
    {
      id: 'ghost', name: 'THE GHOST', lore: 'One shot. One kill. No trace.',
      color: '#CC88FF', accent: '#9922FF', gunColor: '#DDAAFF',
      speed: 212, health: 90, damage: 60, fireRate: 700, radius: 17,
      stats: { speed: 72, health: 55, damage: 100 }, companion: 'raven'
    },
    {
      id: 'medic', name: 'THE MEDIC', lore: 'Combat surgeon. Heals in the field.',
      color: '#44FFAA', accent: '#00CC77', gunColor: '#88FFCC',
      speed: 162, health: 160, damage: 22, fireRate: 320, radius: 18,
      stats: { speed: 44, health: 90, damage: 50 }, companion: 'bear'
    },
    {
      id: 'ronin', name: 'THE RONIN', lore: 'Ancient blade. Perfect discipline.',
      color: '#FFCC44', accent: '#FF9900', gunColor: '#FFEEAA',
      speed: 225, health: 100, damage: 55, fireRate: 500, radius: 17,
      stats: { speed: 75, health: 58, damage: 96 }, companion: 'fox', starterWeapon: 'knife'
    },
    {
      id: 'pyro', name: 'THE PYRO', lore: 'Fire is the only language left to speak.',
      color: '#FF5500', accent: '#FF2200', gunColor: '#FF8833',
      speed: 148, health: 155, damage: 55, fireRate: 260, radius: 19,
      stats: { speed: 32, health: 88, damage: 98 }, companion: 'salamander', starterWeapon: 'flamethrower'
    },
    {
      id: 'phantom', name: 'THE PHANTOM', lore: 'Shadow given a gun. Death without a face.',
      color: '#AA44FF', accent: '#7711CC', gunColor: '#CC88FF',
      speed: 248, health: 72, damage: 52, fireRate: 390, radius: 15,
      stats: { speed: 95, health: 38, damage: 88 }, companion: 'spirit', starterWeapon: 'crossbow',
      _dodgeChance: 0.22
    },
  ],

  // ── Color Themes for Neon City ──────────────────────────
  // These define the 6 color variations for the unified Neon City map
  NEON_CITY_THEMES: {
    cyan: {
      name: 'CYAN NEON',
      theme: '#44EEFF',
      previewBg: '#080812',
      previewRoad: 'rgba(68,238,255,0.4)',
      roadColor: '#111118',
      sidewalkColor: '#1a1a28',
      buildingPalette: ['#1a1a2e','#16213e','#0f3460','#1a1a2e','#12212e','#1e1e30','#151530','#1c1c2e'],
      neonColors: ['#44EEFF','#00FFCC','#66FFFF','#00DDEE'],
      windowColors: ['#88EEFF','#AAFFFF','#66DDFF','#CCFFFF'],
      lightColor: '#88EEFF',
      lightGlow: '#44EEFF',
      weather: 'rain',
      botPalettes: {
        mini:   [{ body:'#0066AA', accent:'#44EEFF' }, { body:'#0055AA', accent:'#33DDEE' }, { body:'#0077BB', accent:'#55FFFF' }],
        normal: [{ body:'#0088AA', accent:'#44EEFF' }, { body:'#006699', accent:'#33CCDD' }, { body:'#007799', accent:'#44DDEE' }, { body:'#0099BB', accent:'#66FFFF' }],
        big:    [{ body:'#004466', accent:'#0088AA' }, { body:'#003355', accent:'#006688' }],
      },
    },
    orange: {
      name: 'ORANGE FLAME',
      theme: '#FF8800',
      previewBg: '#0a0804',
      previewRoad: 'rgba(255,140,0,0.4)',
      roadColor: '#0d0d10',
      sidewalkColor: '#141210',
      buildingPalette: ['#1a1510','#201a10','#181210','#222015','#1c1810','#161210','#1a1410','#201810'],
      neonColors: ['#FF8800','#FFAA00','#FF6600','#FFCC00'],
      windowColors: ['#FF8800','#FFAA44','#FF6600','#FFCC44'],
      lightColor: '#FF8844',
      lightGlow: '#FF6600',
      weather: 'smoke',
      botPalettes: {
        mini:   [{ body:'#BB4400', accent:'#FF8800' }, { body:'#993300', accent:'#DD6600' }, { body:'#CC5500', accent:'#FF9900' }],
        normal: [{ body:'#884422', accent:'#FF8800' }, { body:'#AA5500', accent:'#FF9900' }, { body:'#993300', accent:'#DD6600' }, { body:'#BB6600', accent:'#FFAA00' }],
        big:    [{ body:'#553311', accent:'#AA6622' }, { body:'#664422', accent:'#BB7733' }],
      },
    },
    green: {
      name: 'GREEN MATRIX',
      theme: '#44FF88',
      previewBg: '#04080a',
      previewRoad: 'rgba(68,255,136,0.38)',
      roadColor: '#0c1210',
      sidewalkColor: '#121a14',
      buildingPalette: ['#0f1e14','#111e18','#0e1a12','#131f16','#101c14','#0f1c12','#121e15','#0e1c12'],
      neonColors: ['#44FF88','#00FF66','#66FFAA','#22DD66'],
      windowColors: ['#88FFCC','#AAFFDD','#66FFAA','#CCFFEE'],
      lightColor: '#88FFCC',
      lightGlow: '#44FF88',
      weather: 'clear',
      botPalettes: {
        mini:   [{ body:'#009944', accent:'#44FF88' }, { body:'#007733', accent:'#33DD77' }, { body:'#00AA55', accent:'#55FF99' }],
        normal: [{ body:'#00AA44', accent:'#44FF88' }, { body:'#008833', accent:'#33DD66' }, { body:'#006633', accent:'#22AA55' }, { body:'#00BB55', accent:'#55FF99' }],
        big:    [{ body:'#224411', accent:'#448833' }, { body:'#335522', accent:'#559944' }],
      },
    },
    red: {
      name: 'RED DANGER',
      theme: '#FF4444',
      previewBg: '#0a0404',
      previewRoad: 'rgba(255,60,60,0.38)',
      roadColor: '#100808',
      sidewalkColor: '#180f0f',
      buildingPalette: ['#1e0a0a','#1a0808','#200c0c','#1c0a0a','#180808','#1e0c0c','#1c0a08','#200a0a'],
      neonColors: ['#FF4444','#FF2222','#FF6666','#DD2222'],
      windowColors: ['#FF4444','#FF6666','#FF2222','#FF8888'],
      lightColor: '#FF5544',
      lightGlow: '#FF4444',
      weather: 'sandstorm',
      botPalettes: {
        mini:   [{ body:'#880022', accent:'#FF4444' }, { body:'#660011', accent:'#DD3333' }, { body:'#991122', accent:'#FF5555' }],
        normal: [{ body:'#CC1100', accent:'#FF4444' }, { body:'#990000', accent:'#DD2222' }, { body:'#AA0000', accent:'#EE3333' }, { body:'#BB1100', accent:'#FF5555' }],
        big:    [{ body:'#551100', accent:'#992222' }, { body:'#441100', accent:'#883322' }],
      },
    },
    blue: {
      name: 'BLUE OCEAN',
      theme: '#00AACC',
      previewBg: '#020b10',
      previewRoad: 'rgba(0,170,204,0.38)',
      roadColor: '#060c12',
      sidewalkColor: '#0c1520',
      buildingPalette: ['#0a1a28','#081522','#0c2033','#0a1c2a','#082030','#0c1a28','#0a1c30','#091820'],
      neonColors: ['#00AACC','#0088DD','#00CCEE','#0066BB'],
      windowColors: ['#88DDFF','#AAEEFF','#66CCEE','#CCFFFF'],
      lightColor: '#88DDFF',
      lightGlow: '#00AACC',
      weather: 'fog',
      botPalettes: {
        mini:   [{ body:'#0066AA', accent:'#00AACC' }, { body:'#005588', accent:'#0099BB' }, { body:'#0077BB', accent:'#00BBDD' }],
        normal: [{ body:'#005577', accent:'#00AACC' }, { body:'#006688', accent:'#00BBDD' }, { body:'#004466', accent:'#0099BB' }, { body:'#007799', accent:'#00CCEE' }],
        big:    [{ body:'#003355', accent:'#006688' }, { body:'#004466', accent:'#007799' }],
      },
    },
    yellow: {
      name: 'YELLOW GOLD',
      theme: '#FFCC00',
      previewBg: '#0c0900',
      previewRoad: 'rgba(255,204,0,0.38)',
      roadColor: '#0f0d08',
      sidewalkColor: '#1a1508',
      buildingPalette: ['#1a1408','#201a0a','#181208','#22180a','#1c1608','#16120a','#1a140a','#201808'],
      neonColors: ['#FFCC00','#FFDD00','#FFAA00','#FFE033'],
      windowColors: ['#FFEE88','#FFDD44','#FFCC66','#FFF0AA'],
      lightColor: '#FFCC44',
      lightGlow: '#FFCC00',
      weather: 'neon_haze',
      botPalettes: {
        mini:   [{ body:'#BB8800', accent:'#FFCC00' }, { body:'#CC9900', accent:'#FFDD00' }, { body:'#AA7700', accent:'#EEBB00' }],
        normal: [{ body:'#AA6600', accent:'#FFCC00' }, { body:'#CC8800', accent:'#FFDD00' }, { body:'#884400', accent:'#DDAA00' }, { body:'#BB7700', accent:'#FFBB00' }],
        big:    [{ body:'#665500', accent:'#AA8800' }, { body:'#554400', accent:'#997700' }],
      },
    },
  },

  // ── Color Themes for Wasteland ──────────────────────────
  // These define the 4 color variations for the unified Wasteland map (big buildings)
  WASTELAND_THEMES: {
    teal: {
      name: 'TEAL HARBOR',
      theme: '#00CCDD',
      previewBg: '#020b10',
      previewRoad: 'rgba(0,204,221,0.38)',
      roadColor: '#090e10',
      sidewalkColor: '#0d1418',
      buildingPalette: ['#0a1a1e','#0e2028','#091820','#0c1e26','#0a1c22','#0d1e28','#0b1a20','#0f2030'],
      neonColors: ['#00CCDD','#0088AA','#00EEFF','#0066BB'],
      windowColors: ['#00CCDD','#44DDEE','#88EEFF','#00AABB'],
      lightColor: '#00CCDD',
      lightGlow: '#00AACC',
      weather: 'fog',
      botPalettes: {
        mini:   [{ body:'#005566', accent:'#00CCDD' }, { body:'#003344', accent:'#0088AA' }],
        normal: [{ body:'#006688', accent:'#00CCDD' }, { body:'#004466', accent:'#0088AA' }, { body:'#007799', accent:'#00BBDD' }],
        big:    [{ body:'#003350', accent:'#005577' }, { body:'#00445E', accent:'#006688' }],
      },
    },
    pink: {
      name: 'PINK NEON',
      theme: '#FF44CC',
      previewBg: '#0a0010',
      previewRoad: 'rgba(255,68,204,0.45)',
      roadColor: '#0d0012',
      sidewalkColor: '#14001e',
      buildingPalette: ['#1a0028','#200030','#180024','#1e002c','#160020','#1c0030','#180028','#200035'],
      neonColors: ['#FF44CC','#FF00FF','#CC44FF','#FF44AA'],
      windowColors: ['#FF44CC','#FF88DD','#DD44FF','#FF22AA'],
      lightColor: '#FF44CC',
      lightGlow: '#CC00AA',
      weather: 'neon_haze',
      botPalettes: {
        mini:   [{ body:'#880044', accent:'#FF44CC' }, { body:'#660033', accent:'#FF00AA' }],
        normal: [{ body:'#AA0066', accent:'#FF44CC' }, { body:'#880055', accent:'#DD44AA' }, { body:'#CC0088', accent:'#FF66CC' }],
        big:    [{ body:'#550033', accent:'#AA0066' }, { body:'#660044', accent:'#BB0077' }],
      },
    },
    green: {
      name: 'GREEN MILITARY',
      theme: '#88AA44',
      previewBg: '#060804',
      previewRoad: 'rgba(136,170,68,0.38)',
      roadColor: '#0a0c08',
      sidewalkColor: '#101408',
      buildingPalette: ['#141e08','#1a2810','#101a06','#182010','#141c08','#1c2414','#121a06','#182210'],
      neonColors: ['#88AA44','#AACC55','#66AA22','#AABB66'],
      windowColors: ['#88AA44','#AACC66','#BBDD88','#99BB55'],
      lightColor: '#AACC55',
      lightGlow: '#88AA33',
      weather: 'sandstorm',
      botPalettes: {
        mini:   [{ body:'#445522', accent:'#88AA44' }, { body:'#334418', accent:'#668833' }],
        normal: [{ body:'#556633', accent:'#88AA55' }, { body:'#3d5520', accent:'#7a9944' }, { body:'#6a8840', accent:'#99BB66' }],
        big:    [{ body:'#3a5018', accent:'#688840' }, { body:'#446028', accent:'#7aaa55' }],
      },
    },
    orange: {
      name: 'ORANGE BADLANDS',
      theme: '#FF6622',
      previewBg: '#0a0602',
      previewRoad: 'rgba(255,102,34,0.38)',
      roadColor: '#0c0a06',
      sidewalkColor: '#14100a',
      buildingPalette: ['#1e1408','#28180a','#1a1206','#24160c','#1c1408','#221610','#181006','#2a1c0e'],
      neonColors: ['#FF6622','#FF8844','#CC4400','#FFAA66'],
      windowColors: ['#FF8844','#FFAA66','#FF6633','#FFCC88'],
      lightColor: '#FF8844',
      lightGlow: '#CC4400',
      weather: 'sandstorm',
      botPalettes: {
        mini:   [{ body:'#883311', accent:'#FF6622' }, { body:'#662200', accent:'#CC4400' }],
        normal: [{ body:'#AA4422', accent:'#FF6633' }, { body:'#882200', accent:'#CC4422' }, { body:'#CC5533', accent:'#FF7744' }],
        big:    [{ body:'#662211', accent:'#AA3322' }, { body:'#773322', accent:'#BB4433' }],
      },
    },
  },

  // ── Maps ────────────────────────────────────────────────
  MAPS: [
    {
      id: 'neon_city',
      name: 'NEON CITY',
      desc: 'The ultimate neon playground. Choose your color theme.',
      theme: '#44EEFF',  // Default, will be overridden by selected color theme
      tags: ['CUSTOMIZABLE', 'CLASSIC'],
      previewGridSize: 16,
      previewBg: '#080812',
      previewRoad: 'rgba(68,238,255,0.4)',
      hasColorThemes: true,  // Flag to show color picker in UI
      defaultTheme: 'cyan',

      // Gameplay - balanced medium map
      mapW: 42, mapH: 42, tileSize: 80, roadEvery: 9,

      // Rendering - defaults (will be overridden by theme)
      roadColor: '#111118',
      sidewalkColor: '#1a1a28',
      buildingPalette: ['#1a1a2e','#16213e','#0f3460','#1a1a2e','#12212e','#1e1e30','#151530','#1c1c2e'],
      neonColors: ['#44EEFF','#00FFCC','#66FFFF','#00DDEE'],
      windowColors: ['#88EEFF','#AAFFFF','#66DDFF','#CCFFFF'],
      lightColor: '#88EEFF',
      lightGlow: '#44EEFF',
      neonFreq: 10,
      weather: 'rain',
      botPalettes: {
        mini:   [{ body:'#0066AA', accent:'#44EEFF' }, { body:'#0055AA', accent:'#33DDEE' }, { body:'#0077BB', accent:'#55FFFF' }],
        normal: [{ body:'#0088AA', accent:'#44EEFF' }, { body:'#006699', accent:'#33CCDD' }, { body:'#007799', accent:'#44DDEE' }, { body:'#0099BB', accent:'#66FFFF' }],
        big:    [{ body:'#004466', accent:'#0088AA' }, { body:'#003355', accent:'#006688' }],
      },
    },
    {
      id: 'arena',
      name: 'ARENA',
      desc: 'No escape. Endless kill-based waves. Pure survival.',
      theme: '#FF0044',
      arena: true,
      tags: ['SURVIVAL', 'ENDLESS'],
      previewGridSize: 24,
      previewBg:   '#0a0004',
      previewRoad: 'rgba(255,0,68,0.55)',

      mapW: 24, mapH: 24, tileSize: 80, roadEvery: 4,
      weather: 'blood_rain',

      roadColor:      '#0d0004',
      sidewalkColor:  '#160008',
      buildingPalette: ['#220008', '#1a0005', '#2a000a'],
      neonColors:     ['#FF0044', '#FF2200', '#CC0033'],
      windowColors:   ['#FF2244', '#FF4422', '#FF0033'],
      lightColor:     '#FF0044',
      lightGlow:      '#CC0033',
      neonFreq:       3,
      botPalettes: {
        mini:   [{ body:'#CC0000', accent:'#FF2200' }, { body:'#990000', accent:'#CC1100' }],
        normal: [{ body:'#880000', accent:'#CC0000' }, { body:'#660000', accent:'#AA0000' }],
        big:    [{ body:'#440000', accent:'#880000' }, { body:'#330000', accent:'#660000' }],
      },
    },
    {
      id: 'lifemode', name: 'LIFE MODE',
      desc: 'Peaceful city. Buy a home, eat out, explore and drive freely.',
      theme: '#88DDFF', tags: ['PEACEFUL', 'SANDBOX'],
      previewGridSize: 14, previewBg: '#04090d', previewRoad: 'rgba(136,221,255,0.38)',
      mapW: 60, mapH: 60, tileSize: 80, roadEvery: 8,
      roadColor:      '#0c1218',
      sidewalkColor:  '#121820',
      buildingPalette: ['#0f1e28','#111e30','#0e1a24','#131f2e','#101c28','#0f1c24','#121e2c','#0e1c28'],
      neonColors:     ['#88DDFF','#AAEEFF','#66CCFF','#44BBDD'],
      windowColors:   ['#88DDFF','#AAEEFF','#66BBFF','#CCEEFF'],
      lightColor:     '#88DDFF', lightGlow: '#44AACC', neonFreq: 10,
      weather: 'clear',
      lifeMode: true,
      botPalettes: {
        mini:   [{ body:'#4488CC', accent:'#66AAEE' }],
        normal: [{ body:'#3366AA', accent:'#5588CC' }],
        big:    [{ body:'#224477', accent:'#336699' }],
      },
    },
    {
      id: 'zombie', name: 'ZOMBIE OUTBREAK',
      desc: 'Neon City has fallen. The infected never stop coming.',
      theme: '#44FF88', tags: ['EXPERIMENTAL', 'ENDLESS', 'SURVIVAL'],
      previewGridSize: 18, previewBg: '#030a03', previewRoad: 'rgba(30,180,60,0.5)',
      mapW: 36, mapH: 36, tileSize: 80, roadEvery: 7,
      roadColor: '#080d08', sidewalkColor: '#0c140c',
      buildingPalette: ['#0a1a0a','#0d1f0d','#081508','#102010','#0c1a0c','#091509','#0f1e0f','#0b1b0b'],
      neonColors: ['#44FF88','#22CC55','#88FFAA','#00AA44'],
      windowColors: ['#44FF88','#22CC55','#66FF99','#00FF66'],
      lightColor: '#44FF88', lightGlow: '#22CC55', neonFreq: 5,
      weather: 'fog',
      botPalettes: {
        mini:   [{ body:'#66CC44', accent:'#44AA22' }],
        normal: [{ body:'#44AA33', accent:'#225511' }],
        big:    [{ body:'#997722', accent:'#664400' }],
      },
      zombie: true,
    },

    // ── Page 2 Maps ─────────────────────────────────────────
    // WASTELAND - Unified map with big buildings and color themes
    {
      id: 'wasteland',
      name: 'WASTELAND',
      desc: 'Massive open terrain with huge buildings. Choose your color theme.',
      theme: '#FF6622',  // Default orange
      tags: ['CUSTOMIZABLE', 'BIG BUILDINGS'],
      previewGridSize: 25,
      previewBg: '#0a0602',
      previewRoad: 'rgba(255,102,34,0.38)',
      hasColorThemes: true,
      defaultTheme: 'orange',

      // Gameplay - big buildings like badlands
      mapW: 44, mapH: 44, tileSize: 80, roadEvery: 13,

      // Rendering defaults (orange theme)
      roadColor: '#0c0a06',
      sidewalkColor: '#14100a',
      buildingPalette: ['#1e1408','#28180a','#1a1206','#24160c','#1c1408','#221610','#181006','#2a1c0e'],
      neonColors: ['#FF6622','#FF8844','#CC4400','#FFAA66'],
      windowColors: ['#FF8844','#FFAA66','#FF6633','#FFCC88'],
      lightColor: '#FF8844',
      lightGlow: '#CC4400',
      neonFreq: 12,
      weather: 'sandstorm',
      botPalettes: {
        mini:   [{ body:'#883311', accent:'#FF6622' }, { body:'#662200', accent:'#CC4400' }],
        normal: [{ body:'#AA4422', accent:'#FF6633' }, { body:'#882200', accent:'#CC4422' }, { body:'#CC5533', accent:'#FF7744' }],
        big:    [{ body:'#662211', accent:'#AA3322' }, { body:'#773322', accent:'#BB4433' }],
      },
    },

    // ── Jungle World ───────────────────────────────────────
    {
      id: 'jungle',
      name: 'JUNGLE SAFARI',
      desc: 'Deep in the wild. Animal predators hunt you. Ride horses. Survive nature.',
      theme: '#44AA22',
      tags: ['NATURE', 'ANIMALS', 'MELEE'],
      previewGridSize: 18,
      previewBg: '#0a1808',
      previewRoad: 'rgba(139,90,43,0.5)',

      mapW: 48, mapH: 48, tileSize: 80, roadEvery: 8,

      // Jungle terrain colors
      roadColor:      '#5a3d1e',    // Dirt path
      sidewalkColor:  '#3d5a28',    // Grass/undergrowth
      buildingPalette: ['#1a3010','#254520','#1e3818','#2a4a25','#223d1c','#2e5028','#1c3515','#305530'],  // Trees
      neonColors:     ['#44AA22','#66CC44','#88DD66','#22BB44'],  // Jungle greens
      windowColors:   ['#FFEE44','#FFDD22','#FFCC00','#FFE066'],  // Fireflies/eyes
      lightColor:     '#88DD44',
      lightGlow:      '#44AA22',
      neonFreq:       5,
      weather:        'jungle_rain',
      jungle:         true,         // Flag for jungle-specific rendering

      // Animal enemies (melee only)
      botPalettes: {
        // Small animals - monkeys
        mini:   [
          { body:'#8B4513', accent:'#D2691E', animal:'monkey' },
          { body:'#654321', accent:'#8B4513', animal:'monkey' },
        ],
        // Medium animals - tigers, panthers
        normal: [
          { body:'#FF8C00', accent:'#000000', animal:'tiger' },
          { body:'#1a1a1a', accent:'#333333', animal:'panther' },
          { body:'#228B22', accent:'#006400', animal:'snake' },
          { body:'#808080', accent:'#505050', animal:'wolf' },
        ],
        // Large animals - gorillas, rhinos
        big:    [
          { body:'#2F2F2F', accent:'#1a1a1a', animal:'gorilla' },
          { body:'#696969', accent:'#404040', animal:'rhino' },
        ],
        // Police - crocodiles
        police: [
          { body:'#2E8B57', accent:'#006400', animal:'crocodile' },
          { body:'#3CB371', accent:'#228B22', animal:'crocodile' },
        ],
        // SWAT - large crocodiles
        swat:   [{ body:'#1a4a2e', accent:'#0a2a1a', animal:'crocodile' }],
      },

      // Jungle boss config
      bossConfig: {
        name: 'KING KONG',
        type: 'giant_gorilla',
        color: '#1a1a1a',
        accent: '#333333'
      },

      // Background birds
      birds: true,
    },

    // ── Campaign Mode ───────────────────────────────────────
    {
      id: 'campaign',
      name: 'CAMPAIGN',
      desc: '100 levels of escalating challenge. Carry your upgrades through to the end.',
      theme: '#FFDD00',
      tags: ['100 LEVELS', 'PROGRESSIVE', 'CAMPAIGN'],
      previewGridSize: 18,
      previewBg: '#080800',
      previewRoad: 'rgba(255,220,0,0.5)',
      mapW: 38, mapH: 38, tileSize: 80, roadEvery: 10,
      roadColor:      '#0d0d08',
      sidewalkColor:  '#14140a',
      buildingPalette: ['#1e1e08','#282808','#1a1a06','#24240a','#1c1c08','#222208','#181806','#2a2a0a'],
      neonColors:     ['#FFDD00','#FFAA00','#FFEE44','#FFB300'],
      windowColors:   ['#FFDD00','#FFEE88','#FFCC44','#FFD700'],
      lightColor:     '#FFDD00', lightGlow: '#FFAA00', neonFreq: 10,
      weather: 'clear',
      campaign: true,
      botPalettes: {
        mini:   [{ body:'#886600', accent:'#FFDD00' }, { body:'#664400', accent:'#FFAA00' }],
        normal: [{ body:'#AA8800', accent:'#FFDD00' }, { body:'#886600', accent:'#FFCC00' }, { body:'#CC9900', accent:'#FFEE44' }],
        big:    [{ body:'#664400', accent:'#AA8800' }, { body:'#775500', accent:'#BB9900' }],
      },
    },

    // ── Special Modes (Page 2) ───────────────────────────────
    {
      id: 'survival',
      name: 'SURVIVAL MODE',
      desc: 'No shop. No mercy. Live or die by the gun.',
      theme: '#FF2244',
      tags: ['HARDCORE', 'NO SHOP', 'ENDLESS'],
      previewGridSize: 18,
      previewBg: '#0a0004',
      previewRoad: 'rgba(255,34,68,0.45)',
      mapW: 40, mapH: 40, tileSize: 80, roadEvery: 10,
      roadColor: '#0d0008',
      sidewalkColor: '#14000e',
      buildingPalette: ['#1a0010','#200018','#180010','#1e0014','#160010','#1c0018','#180012','#20001a'],
      neonColors: ['#FF2244','#FF0044','#CC0033','#FF4466'],
      windowColors: ['#FF2244','#FF6688','#FF0044','#CC0033'],
      lightColor: '#FF2244', lightGlow: '#CC0033', neonFreq: 8,
      weather: 'blood_rain',
      survival: true,
      botPalettes: {
        mini:   [{ body:'#880022', accent:'#FF2244' }, { body:'#660011', accent:'#CC0033' }],
        normal: [{ body:'#AA0033', accent:'#FF2244' }, { body:'#880022', accent:'#DD2244' }, { body:'#CC1144', accent:'#FF3355' }],
        big:    [{ body:'#660011', accent:'#AA0033' }, { body:'#770022', accent:'#BB1133' }],
      },
    },
    {
      id: 'hardcore',
      name: 'HARDCORE MODE',
      desc: 'Enemies deal 2× damage. You earn 3× money. Only the best survive.',
      theme: '#FF8800',
      tags: ['HARDCORE', '2× DAMAGE', '3× MONEY'],
      previewGridSize: 16,
      previewBg: '#080400',
      previewRoad: 'rgba(255,136,0,0.5)',
      mapW: 40, mapH: 40, tileSize: 80, roadEvery: 9,
      roadColor: '#0d0a02',
      sidewalkColor: '#140e04',
      buildingPalette: ['#1e1408','#281a0a','#1a1206','#24160c','#1c1408','#221610','#181006','#2a1c0e'],
      neonColors: ['#FF8800','#FFAA00','#FF6600','#FFCC44'],
      windowColors: ['#FF8800','#FFAA44','#FFCC66','#FF6622'],
      lightColor: '#FF8800', lightGlow: '#CC5500', neonFreq: 10,
      weather: 'blood_rain',
      hardcore: true,
      botPalettes: {
        mini:   [{ body:'#884400', accent:'#FF8800' }, { body:'#663300', accent:'#CC5500' }],
        normal: [{ body:'#AA5500', accent:'#FF8800' }, { body:'#884400', accent:'#CC6600' }, { body:'#CC6622', accent:'#FF9933' }],
        big:    [{ body:'#663300', accent:'#AA5500' }, { body:'#774400', accent:'#BB6600' }],
      },
    },

    // ── Blitz Mode ───────────────────────────────────────────
    {
      id: 'blitz', name: 'BLITZ MODE',
      desc: 'Ultra-fast carnage. Enemies and you move at triple speed. 5× money. No time to breathe.',
      theme: '#FF2200', tags: ['ULTRA FAST', '3× SPEED', '5× MONEY'],
      previewGridSize: 11, previewBg: '#0a0002', previewRoad: 'rgba(255,34,0,0.65)',
      mapW: 28, mapH: 28, tileSize: 80, roadEvery: 7,
      roadColor: '#0d0004', sidewalkColor: '#160008',
      buildingPalette: ['#1e0008','#280012','#1a0006','#22000e','#180008','#1e0010','#160006','#260014'],
      neonColors: ['#FF2200','#FF4400','#FF0022','#FF6600'],
      windowColors: ['#FF4400','#FF6644','#FF0044','#FF3300'],
      lightColor: '#FF2200', lightGlow: '#CC0000', neonFreq: 6,
      weather: 'blood_rain',
      blitz: true,
      botPalettes: {
        mini:   [{ body:'#880011', accent:'#FF2200' }],
        normal: [{ body:'#AA0022', accent:'#FF2200' }, { body:'#CC0000', accent:'#FF3300' }],
        big:    [{ body:'#660011', accent:'#AA0022' }],
      },
    },

    // ── Siege Mode ───────────────────────────────────────────
    {
      id: 'siege', name: 'SIEGE MODE',
      desc: 'Hold the center. Endless waves assault from all sides. The city falls — or you do.',
      theme: '#44AAFF', tags: ['DEFEND', 'ENDLESS WAVES', 'TACTICAL'],
      previewGridSize: 20, previewBg: '#000810', previewRoad: 'rgba(68,170,255,0.45)',
      mapW: 46, mapH: 46, tileSize: 80, roadEvery: 11,
      roadColor: '#04080e', sidewalkColor: '#080e14',
      buildingPalette: ['#0a1828','#0e2038','#081420','#0c1e30','#0a1c28','#0e2238','#081620','#0c1e34'],
      neonColors: ['#44AAFF','#2288DD','#66CCFF','#0066CC'],
      windowColors: ['#44AAFF','#88CCFF','#66AAFF','#2299FF'],
      lightColor: '#44AAFF', lightGlow: '#2277CC', neonFreq: 9,
      weather: 'fog',
      siege: true,
      botPalettes: {
        mini:   [{ body:'#002244', accent:'#44AAFF' }],
        normal: [{ body:'#003366', accent:'#44AAFF' }, { body:'#002255', accent:'#2299FF' }],
        big:    [{ body:'#001133', accent:'#003366' }],
      },
    },
    {
      id: 'frozen_tundra',
      name: 'FROZEN TUNDRA',
      desc: 'A city locked in eternal winter. Blizzard conditions. Ice soldiers never stop coming.',
      theme: '#88DDFF',
      tags: ['WINTER', 'ICE', 'BLIZZARD'],
      previewGridSize: 16,
      previewBg: '#030c14',
      previewRoad: 'rgba(136,221,255,0.40)',

      mapW: 38, mapH: 38, tileSize: 80, roadEvery: 8,

      roadColor:       '#060e18',
      sidewalkColor:   '#0c1a28',
      buildingPalette: ['#0d1e2e','#101e30','#0c1c2c','#0e2030','#0a1a28','#102230','#0c1e30','#0e1c2a'],
      neonColors:      ['#88DDFF','#AAEEFF','#66CCFF','#CCFFFF','#44BBEE'],
      windowColors:    ['#AADDFF','#CCEEFF','#88CCFF','#DDEEFF'],
      lightColor:      '#AADDFF',
      lightGlow:       '#55AACC',
      neonFreq:        8,
      weather:         'blizzard',
      snow:            true,

      botPalettes: {
        mini:   [
          { body:'#2a6688', accent:'#88CCEE' },
          { body:'#1e5577', accent:'#66BBDD' },
          { body:'#336699', accent:'#99DDEE' },
        ],
        normal: [
          { body:'#1a4466', accent:'#4499CC' },
          { body:'#1e5077', accent:'#55AACC' },
          { body:'#225588', accent:'#66BBDD' },
          { body:'#2a5e88', accent:'#77CCEE' },
        ],
        big:    [
          { body:'#0d2a44', accent:'#2266AA' },
          { body:'#0e2c40', accent:'#1a5588' },
        ],
        police: [
          { body:'#1a3a5a', accent:'#44AAFF' },
          { body:'#0e2a42', accent:'#3388CC' },
        ],
        swat:   [{ body:'#0a1e30', accent:'#2266AA' }],
      },
    },
    {
      id: 'ocean_depths',
      name: 'OCEAN DEPTHS',
      desc: 'A vast ocean arena. Floating ships and platforms. Water warriors rise from the deep.',
      theme: '#0088CC',
      tags: ['OCEAN', 'WATER', 'NAUTICAL'],
      previewGridSize: 18,
      previewBg: '#001828',
      previewRoad: 'rgba(0,136,204,0.50)',

      mapW: 44, mapH: 44, tileSize: 80, roadEvery: 10,

      roadColor:       '#001830',    // Deep ocean floor
      sidewalkColor:   '#002040',    // Shallow water platforms
      buildingPalette: ['#003355','#004466','#002a44','#003860','#002540','#004060','#003050','#004575'],  // Ship hulls
      neonColors:      ['#00CCFF','#0099DD','#44DDFF','#00FFFF','#0066AA','#88EEFF'],
      windowColors:    ['#66DDFF','#88EEFF','#44CCEE','#AAFFFF'],
      lightColor:      '#00CCFF',
      lightGlow:       '#0088AA',
      neonFreq:        7,
      weather:         'fog',        // Ocean mist
      ocean:           true,

      botPalettes: {
        // Water warriors - aquatic themed colors
        normal: [
          { body:'#005577', accent:'#00AACC' },  // Deep sea blue
          { body:'#006688', accent:'#00BBDD' },  // Ocean teal
          { body:'#004455', accent:'#0099BB' },  // Dark aqua
          { body:'#007799', accent:'#00CCEE' },  // Bright sea
        ],
        big:    [
          { body:'#003344', accent:'#006688' },  // Leviathan dark
          { body:'#002838', accent:'#005577' },  // Abyss dweller
        ],
        police: [
          { body:'#004466', accent:'#0099CC' },  // Coast guard
          { body:'#003355', accent:'#0088BB' },
        ],
        swat:   [{ body:'#002233', accent:'#006699' }],  // Navy seal
      },
    },
    {
      id: 'metropolis', name: 'METROPOLIS',
      desc: 'A vast living city — commercial towers, residential flats, grimy industrial, gangster slums, and a central park. The largest map.',
      theme: '#FF9933', tags: ['OPEN WORLD', 'CITY', 'ZONES'],
      previewGridSize: 12, previewBg: '#060408', previewRoad: 'rgba(255,153,51,0.40)',
      mapW: 90, mapH: 60, tileSize: 80, roadEvery: 9,
      roadColor: '#07060a', sidewalkColor: '#0f0e14',
      buildingPalette: ['#0f0e18','#141220','#111018','#181520','#0d0c16','#131220','#0f0d18','#161420'],
      // Zone-specific building palettes
      zonePalettes: {
        commercial:  ['#101828','#0e1a2e','#0c1622','#12202e','#0e1c2c','#101e30','#0c1820','#142230'],
        residential: ['#1a1008','#201408','#18120a','#221608','#1c140c','#201810','#18100a','#241608'],
        industrial:  ['#0a0a0c','#0c0e0c','#080a08','#0e1010','#0a0c0a','#0c0e0e','#080c0a','#101010'],
        slums:       ['#14100c','#1a140e','#12100a','#160e0c','#1c1210','#180e0c','#14120e','#1a1612'],
      },
      neonColors: ['#FF9933','#FFCC44','#FF6600','#FFAA22','#FF4400','#FFDD00'],
      windowColors: ['#FF9933','#FFCC55','#FF8800','#FFAA44'],
      lightColor: '#FF9933', lightGlow: '#CC7722', neonFreq: 8,
      weather: 'clear',
      metropolis: true,
      botPalettes: {
        mini:   [{ body:'#441100', accent:'#FF6622' }, { body:'#332200', accent:'#FFAA22' }],
        normal: [{ body:'#553300', accent:'#FF9933' }, { body:'#442200', accent:'#FF6600' }, { body:'#661100', accent:'#FF4422' }],
        big:    [{ body:'#221100', accent:'#994422' }, { body:'#330a00', accent:'#882211' }],
        police: [{ body:'#112233', accent:'#4488CC' }, { body:'#0a1a2a', accent:'#3366AA' }],
        swat:   [{ body:'#0a0a12', accent:'#336699' }],
      },
    },
  ],

  // ── Weapons ─────────────────────────────────────────────
  WEAPONS: [
    {
      id: 'pistol',       name: 'PISTOL',
      desc: 'Reliable sidearm',
      price: 0,           damage: 0,    fireRate: 0,
      bullets: 1,         spread: 0.05, bulletSpeed: 680,
      color: '#BBBBBB'
    },
    {
      id: 'knife',        name: 'COMBAT KNIFE',
      desc: 'Silent & deadly. Instant close-range kill.',
      price: 800,         damage: 85,  fireRate: 420,
      bullets: 0,         spread: 0,   bulletSpeed: 0,
      melee: true,        range: 58,
      color: '#AADDFF'
    },
    {
      id: 'smg',          name: 'SMG',
      desc: 'Rapid fire, low damage',
      price: 1200,        damage: 14,   fireRate: 75,
      bullets: 1,         spread: 0.14, bulletSpeed: 720,
      color: '#44EEFF'
    },
    {
      id: 'shotgun',      name: 'SHOTGUN',
      desc: '6 pellets per blast',
      price: 1800,        damage: 22,   fireRate: 750,
      bullets: 6,         spread: 0.38, bulletSpeed: 540,
      color: '#FF8800'
    },
    {
      id: 'assault',      name: 'ASSAULT RIFLE',
      desc: 'Balanced powerhouse',
      price: 2200,        damage: 26,   fireRate: 100,
      bullets: 1,         spread: 0.06, bulletSpeed: 760,
      color: '#44FF88'
    },
    {
      id: 'sniper',       name: 'SNIPER RIFLE',
      desc: 'Extreme range & damage',
      price: 3500,        damage: 130,  fireRate: 1500,
      bullets: 1,         spread: 0.008, bulletSpeed: 1400,
      color: '#CC88FF'
    },
    {
      id: 'minigun',      name: 'MINIGUN',
      desc: 'Unleash the storm',
      price: 6000,        damage: 11,   fireRate: 38,
      bullets: 1,         spread: 0.22, bulletSpeed: 620,
      color: '#FFD700'
    },
    // ── Experimental Weapons ─────────────────────────────
    {
      id: 'timecannon',   name: 'TIME CANNON',
      desc: 'Freezes enemies in time for 2.5s',
      price: 8000,  damage: 40,  fireRate: 1800,
      bullets: 1,   spread: 0.02, bulletSpeed: 260,
      color: '#88DDFF', special: 'timefreeze', experimental: true
    },
    {
      id: 'gravitgun',    name: 'GRAVITY RIFLE',
      desc: 'Pulls enemies toward you on impact',
      price: 6500,  damage: 25,  fireRate: 900,
      bullets: 1,   spread: 0,   bulletSpeed: 380,
      color: '#CC88FF', special: 'gravity', experimental: true
    },
    {
      id: 'electricwhip', name: 'ELEC. WHIP',
      desc: 'Melee arc — chains lightning to nearby foes',
      price: 5500,  damage: 55,  fireRate: 600,
      bullets: 0,   spread: 0,   bulletSpeed: 0,
      melee: true,  range: 140,
      color: '#88FFCC', special: 'electric', experimental: true
    },
    {
      id: 'plasmashotgun', name: 'PLASMA SHOTGUN',
      desc: 'Searing plasma — slows targets by 70%',
      price: 7000,  damage: 30,  fireRate: 1100,
      bullets: 6,   spread: 0.45, bulletSpeed: 320,
      color: '#FF88FF', special: 'plasma', experimental: true
    },
    // ── New Weapons ───────────────────────────────────────
    {
      id: 'burst',       name: 'BURST PISTOL',
      desc: '3-round burst. Fast and precise.',
      price: 1500, damage: 32, fireRate: 200,
      bullets: 3,  spread: 0.07, bulletSpeed: 710,
      color: '#EEFF44', burst: true
    },
    {
      id: 'flamethrower', name: 'FLAMETHROWER',
      desc: 'Short range cone. Burns through crowds.',
      price: 3200, damage: 16, fireRate: 60,
      bullets: 7,  spread: 0.62, bulletSpeed: 260,
      color: '#FF5500', special: 'fire'
    },
    {
      id: 'crossbow',    name: 'CROSSBOW',
      desc: 'Silent piercing bolt. Sniper-tier accuracy.',
      price: 2800, damage: 115, fireRate: 1800,
      bullets: 1,  spread: 0.003, bulletSpeed: 940,
      color: '#CCAAFF', silent: true
    },
    {
      id: 'rocket',      name: 'ROCKET LAUNCHER',
      desc: 'Devastating area explosion. Reload slowly.',
      price: 7800, damage: 185, fireRate: 2800,
      bullets: 1,  spread: 0.01, bulletSpeed: 370,
      color: '#FF4400', special: 'rocket'
    },
  ],

  // ── Building Types (deterministic per door tile) ─────────
  BUILDING_TYPES: [
    { name:'RESTAURANT',     color:'#FF8844' },
    { name:'OFFICE',         color:'#4488FF' },
    { name:'HOTEL',          color:'#CC66FF' },
    { name:'MARKET',         color:'#44FF88' },
    { name:'ARCADE',         color:'#FFDD00' },
    { name:'PHARMACY',       color:'#44FFCC' },
    { name:'GYM',            color:'#FF6644' },
    { name:'BANK',           color:'#FFCC44' },
    { name:'NIGHTCLUB',      color:'#FF00CC' },
    { name:'HOSPITAL',       color:'#FF3333' },
    { name:'GARAGE',         color:'#778899' },
    { name:'BAR',            color:'#FFAA22' },
    { name:'PAWNSHOP',       color:'#CC8833' },
    { name:'TECH LAB',       color:'#00FFCC' },
    { name:'WAREHOUSE',      color:'#888888' },
    { name:'POLICE STATION', color:'#4477FF' },
    { name:'TATTOO PARLOR',  color:'#FF44AA' },
    { name:'AMMO DEPOT',     color:'#FF6600' },
    { name:'HACKER DEN',     color:'#00FF88' },
    { name:'DOJO',           color:'#FFDD00' },
    { name:'SAFEHOUSE',      color:'#44AAFF' },
    { name:'CHOP SHOP',      color:'#AA5522' },
    { name:'RADIO STATION',  color:'#FF88CC' },
    { name:'UNDERGROUND LAB',color:'#55FF99' },
  ],

  // ── Upgrades ─────────────────────────────────────────────
  UPGRADES: [
    { id: 'health',   name: 'MAX HEALTH',  desc: '+25 HP per level',       icon: '♥', color: '#FF6688', maxLevel: 5, baseCost: 400,  costMult: 1.6  },
    { id: 'speed',    name: 'SPEED',       desc: '+18 SPD per level',      icon: '↑', color: '#44EEFF', maxLevel: 5, baseCost: 500,  costMult: 1.65 },
    { id: 'damage',   name: 'DAMAGE',      desc: '+15% DMG per level',     icon: '◆', color: '#FF4455', maxLevel: 5, baseCost: 600,  costMult: 1.7  },
    { id: 'firerate', name: 'FIRE RATE',   desc: '-8% cooldown per level', icon: '◉', color: '#FF8800', maxLevel: 5, baseCost: 700,  costMult: 1.75 },
    { id: 'armor',    name: 'ARMOR',       desc: '-10% damage taken',      icon: '⬡', color: '#44FF88', maxLevel: 5, baseCost: 800,  costMult: 1.8  },
    { id: 'regen',    name: 'REGEN',       desc: '+1 HP/sec per level',    icon: '✚', color: '#88FFCC', maxLevel: 3, baseCost: 1000, costMult: 2.0  },
    { id: 'dodge',    name: 'DODGE',       desc: '+6% dodge chance/level',  icon: '✦', color: '#FFEE44', maxLevel: 4, baseCost: 900,  costMult: 1.9  },
    { id: 'wealth',   name: 'WEALTH',      desc: '+20% money per kill',     icon: '$', color: '#FFD700', maxLevel: 4, baseCost: 750,  costMult: 1.7  },
    { id: 'leech',    name: 'LIFE LEECH',  desc: '+2 HP per kill',          icon: '♦', color: '#FF44AA', maxLevel: 5, baseCost: 850,  costMult: 1.8  },
    { id: 'critical', name: 'CRITICAL HIT',desc: '+8% crit chance/level',   icon: '!', color: '#FF6644', maxLevel: 4, baseCost: 800,  costMult: 1.85 },
    { id: 'ammo',     name: 'AMMO CAP',    desc: '+25% ammo capacity/level',icon: '◉', color: '#AAFFEE', maxLevel: 5, baseCost: 600,  costMult: 1.6  },
  ],

  // ── Achievements ─────────────────────────────────────────
  ACHIEVEMENTS: [
    { id:'first_blood', name:'FIRST BLOOD',    desc:'Kill your first enemy',        icon:'☠', stat:'kills',            threshold:1     },
    { id:'kill_10',     name:'STREET CLEANER', desc:'Kill 10 enemies',              icon:'☠', stat:'kills',            threshold:10    },
    { id:'kill_50',     name:'MASS MURDERER',  desc:'Kill 50 enemies',              icon:'☠', stat:'kills',            threshold:50    },
    { id:'kill_100',    name:'UNSTOPPABLE',    desc:'Kill 100 enemies',             icon:'☠', stat:'kills',            threshold:100   },
    { id:'carjack_1',   name:'CARJACKER',      desc:'Steal your first car',         icon:'*', stat:'carsStolen',       threshold:1     },
    { id:'carjack_10',  name:'WHEELMAN',       desc:'Steal 10 cars',                icon:'*', stat:'carsStolen',       threshold:10    },
    { id:'money_10k',   name:'CRIME PAYS',     desc:'Earn $10,000',                 icon:'$', stat:'moneyEarned',      threshold:10000 },
    { id:'money_50k',   name:'CRIME LORD',     desc:'Earn $50,000',                 icon:'$', stat:'moneyEarned',      threshold:50000 },
    { id:'knife_5',     name:'BLADE RUNNER',   desc:'Kill 5 enemies with knife',    icon:'+', stat:'knifeKills',       threshold:5     },
    { id:'knife_20',    name:'SILENT KILLER',  desc:'Kill 20 enemies with knife',   icon:'+', stat:'knifeKills',       threshold:20    },
    { id:'boss_1',      name:'BOSS SLAYER',    desc:'Defeat your first boss',       icon:'B', stat:'bossesKilled',     threshold:1     },
    { id:'wanted_4',    name:'MOST WANTED',    desc:'Reach 4 wanted stars',         icon:'!', stat:'maxWanted',        threshold:4     },
    { id:'streak_5',    name:'KILLING SPREE',  desc:'Get a x5 kill streak',         icon:'x', stat:'maxStreak',        threshold:5     },
    { id:'wave_10',     name:'VETERAN',        desc:'Survive to wave 10',           icon:'W', stat:'maxWave',          threshold:10    },
    { id:'explorer',    name:'URBAN EXPLORER', desc:'Enter a building interior',    icon:'E', stat:'buildingsEntered', threshold:1     },
    { id:'clearer',     name:'ROOM CLEARER',   desc:'Clear 3 buildings of enemies', icon:'E', stat:'buildingsCleared', threshold:3     },
  ],

  DRONE_CONFIGS: {
    police: { speed:155, hp:60,  fireRate:1500, damage:10, color:'#3399FF', radius:14 },
    combat: { speed:210, hp:110, fireRate:900,  damage:18, color:'#FF5500', radius:16 },
    player: { speed:300, hp:80,  color:'#44EEFF', radius:12 }
  },

  BLACK_MARKET: [
    { id:'plasma',     name:'PLASMA CANNON',   desc:'Melts armor. 3x dmg vs vehicles.', price:3500, type:'weapon',
      damage:80, fireRate:950, bullets:1, spread:0.04, bulletSpeed:560, color:'#CC44FF', melee:false },
    { id:'railgun',    name:'RAILGUN',          desc:'Piercing beam. One-shot kill.',    price:5500, type:'weapon',
      damage:240, fireRate:2000, bullets:1, spread:0, bulletSpeed:1400, color:'#00FFFF', melee:false },
    { id:'reflex',     name:'REFLEX IMPLANT',   desc:'Double speed & fire rate for 8s.', price:2000, type:'implant', effect:'reflex'     },
    { id:'nanoshield', name:'NANO SHIELD',       desc:'6s of invincibility.',             price:2800, type:'implant', effect:'nanoshield'  },
    { id:'overclock',  name:'OVERCLOCK CHIP',    desc:'Permanently +60% bullet damage.', price:4500, type:'implant', effect:'overclock'   },
    { id:'proto_car',  name:'PROTOTYPE VEHICLE', desc:'500HP · Nitro · Bulletproof.',    price:6500, type:'vehicle' },
  ],

  // ── Zombie Configs ───────────────────────────────────────
  ZOMBIE_CONFIGS: {
    shambler: { speed:52,  hp:90,  damage:18, radius:18, color:'#66CC44', accent:'#44AA22', moneyMult:0.8,  melee:true  },
    runner:   { speed:148, hp:50,  damage:12, radius:15, color:'#99FF55', accent:'#66CC33', moneyMult:1.0,  melee:true  },
    brute:    { speed:36,  hp:300, damage:38, radius:28, color:'#44AA33', accent:'#225511', moneyMult:2.5,  melee:true  },
    mutant:   { speed:68,  hp:130, damage:20, radius:20, color:'#AAFF44', accent:'#77CC22', moneyMult:1.5,  melee:false, acidRate:2200, acidSpeed:180 },
    bloater:  { speed:30,  hp:200, damage:22, radius:30, color:'#DDBB00', accent:'#886600', moneyMult:2.0,  melee:false, acidRate:1600, acidSpeed:140 },
    crawler:  { speed:195, hp:40,  damage:25, radius:12, color:'#558833', accent:'#334411', moneyMult:1.2,  melee:true  },
    charger:  { speed:210, hp:75,  damage:40, radius:16, color:'#CC1100', accent:'#881100', moneyMult:1.8,  melee:true  },
  },

  // ── Global Events ────────────────────────────────────────
  GLOBAL_EVENTS: [
    { id:'blackout',    name:'TOTAL BLACKOUT',    desc:'The city grid has failed.',                   duration:55, major:true  },
    { id:'riot',        name:'CITY RIOT',          desc:'The streets are in chaos.',                   duration:60, major:false },
    { id:'corporate',   name:'CORPORATE INVASION', desc:'MegaCorp enforcers have seized the district.', duration:65, major:true  },
    { id:'cyber_virus', name:'CYBER VIRUS',        desc:'Systems compromised. Reality unraveling.',     duration:50, major:false },
    { id:'glitch_mode', name:'GLITCH MODE',         desc:'Reality fractures. The simulation breaks.',   duration:60, major:true  },
  ],

  // ── Car Dealership ──────────────────────────────────────
  CAR_DEALERSHIP: [
    { id:'sedan',   name:'SEDAN',       desc:'Reliable street car.',   price:2000, speed:295, hp:200, color:'#CC3333', radius:28 },
    { id:'sports',  name:'SPORTS CAR',  desc:'Born for speed.',        price:5500, speed:420, hp:120, color:'#3366BB', radius:26 },
    { id:'suv',     name:'SUV / TRUCK', desc:'Built to survive.',      price:4000, speed:200, hp:380, color:'#CC9900', radius:30 },
    { id:'armored', name:'ARMORED VAN', desc:'Bulletproof. Heavy.',    price:8500, speed:180, hp:500, color:'#445566', radius:32, bulletproof:true },
  ],

  GRENADE: { damage:120, blastRadius:95, fuseTime:2.0, price:500 },

  // ── Building Interactions ────────────────────────────────
  // 24 entries matching BUILDING_TYPES indices 0-23.
  // Each entry: { npcName, npcColor, dialogue, items:[{id,name,price,icon,desc,effect}] }
  // effect types: heal | healFull | buff | perm | money | moneyHack | loan | grenades
  //               randomWeapon | random | heist | clearWanted | invincible | bodyguard
  //               repairVehicle | multi (sub-effects array) | escape | permRandom
  // buff fields: speedAdd, fireMult(<1=faster), dmgMult, armorAdd, regenAdd, dodgeAdd,
  //              moneyMult, noPolice, botsConfused, piercingBullets, explosiveBullets,
  //              leechAdd, pendingMoney
  BUILDING_INTERACTIONS: [
    // 0 RESTAURANT
    { npcName:'CHEF', npcColor:'#FF8844', dialogue:'"Welcome! Try our specials."',
      items:[
        { id:'burger',   name:'BURGER',        price:120, icon:'🍔', desc:'+40 HP',                  effect:{type:'heal',amount:40} },
        { id:'espresso', name:'ESPRESSO',       price:170, icon:'☕', desc:'Speed +70  for 12s',      effect:{type:'buff',id:'esp',name:'CAFFEINATED',icon:'☕',color:'#FF8844',duration:12,speedAdd:70} },
        { id:'special',  name:"CHEF'S SPECIAL", price:320, icon:'⭐', desc:'+60 HP + Speed 8s',       effect:{type:'multi',effects:[{type:'heal',amount:60},{type:'buff',id:'chef',name:"CHEF'S MEAL",icon:'⭐',color:'#FF8844',duration:8,speedAdd:50}]} },
    ]},
    // 1 OFFICE
    { npcName:'EXECUTIVE', npcColor:'#4488FF', dialogue:'"Let\'s talk business."',
      items:[
        { id:'bribe',    name:'BRIBE POLICE',  price:400, icon:'💼', desc:'Clear wanted level',      effect:{type:'clearWanted'} },
        { id:'deal',     name:'CORP DEAL',      price:550, icon:'📈', desc:'2× kill money for 60s',   effect:{type:'buff',id:'money',name:'CORP DEAL',icon:'📈',color:'#4488FF',duration:60,moneyMult:2} },
        { id:'security', name:'HIRE GUARD',     price:700, icon:'🛡', desc:'Hire a bodyguard',        effect:{type:'bodyguard'} },
    ]},
    // 2 HOTEL
    { npcName:'RECEPTIONIST', npcColor:'#CC66FF', dialogue:'"Our suites are your sanctuary."',
      items:[
        { id:'rest',     name:'REST',           price:200, icon:'🛌', desc:'Full HP + Regen 20s',     effect:{type:'multi',effects:[{type:'healFull'},{type:'buff',id:'regen',name:'RESTED',icon:'🛌',color:'#CC66FF',duration:20,regenAdd:4}]} },
        { id:'minibar',  name:'MINI-BAR',        price:150, icon:'🍾', desc:'+30 HP + Dmg 10s',       effect:{type:'multi',effects:[{type:'heal',amount:30},{type:'buff',id:'mbar',name:'MINI-BAR',icon:'🍾',color:'#CC66FF',duration:10,dmgMult:1.28}]} },
        { id:'pent',     name:'PENTHOUSE',       price:600, icon:'🌟', desc:'Full HP + all buffs 15s', effect:{type:'penthouse'} },
    ]},
    // 3 MARKET
    { npcName:'SHOPKEEPER', npcColor:'#44FF88', dialogue:'"Got supplies? Sure do!"',
      items:[
        { id:'hpack',    name:'HEALTH PACK',    price:130, icon:'💊', desc:'+50 HP',                  effect:{type:'heal',amount:50} },
        { id:'ammo',     name:'AMMO CRATE',      price:110, icon:'📦', desc:'Fire rate ×1.8 for 8s',   effect:{type:'buff',id:'ammo',name:'AMMO UP',icon:'📦',color:'#44FF88',duration:8,fireMult:0.55} },
        { id:'grens',    name:'3× GRENADES',     price:300, icon:'💣', desc:'+3 grenades',             effect:{type:'grenades',amount:3} },
    ]},
    // 4 ARCADE
    { npcName:'ATTENDANT', npcColor:'#FFDD00', dialogue:'"Insert coin. Play to win."',
      items:[
        { id:'play',     name:'PLAY GAME',       price:100, icon:'🕹', desc:'Random buff or cash',     effect:{type:'random'} },
        { id:'hiscore',  name:'HIGH-SCORE BET',  price:200, icon:'🏆', desc:'+450 cash',               effect:{type:'money',amount:450} },
        { id:'power',    name:'POWER-UP',         price:350, icon:'⚡', desc:'Fire rate ×2 for 15s',    effect:{type:'buff',id:'pow',name:'POWER-UP',icon:'⚡',color:'#FFDD00',duration:15,fireMult:0.5} },
    ]},
    // 5 PHARMACY
    { npcName:'PHARMACIST', npcColor:'#44FFCC', dialogue:'"We have what you need."',
      items:[
        { id:'pills',    name:'PAIN PILLS',      price:90,  icon:'💊', desc:'+35 HP',                  effect:{type:'heal',amount:35} },
        { id:'stim',     name:'STIMULANT',        price:250, icon:'💉', desc:'Speed +90 for 10s',       effect:{type:'buff',id:'stim',name:'STIMULANT',icon:'💉',color:'#44FFCC',duration:10,speedAdd:90} },
        { id:'shield',   name:'SHIELD DRUG',      price:380, icon:'🛡', desc:'Armor +30% for 18s',      effect:{type:'buff',id:'shd',name:'SHIELDED',icon:'🛡',color:'#44FFCC',duration:18,armorAdd:0.30} },
    ]},
    // 6 GYM
    { npcName:'TRAINER', npcColor:'#FF6644', dialogue:'"No pain, no gain!"',
      items:[
        { id:'protein',  name:'PROTEIN SHAKE',   price:200, icon:'💪', desc:'+30 Max HP (perm)',       effect:{type:'perm',stat:'health',amount:30} },
        { id:'workout',  name:'WORKOUT',           price:350, icon:'🏋', desc:'Speed +15 (perm)',        effect:{type:'perm',stat:'speed',amount:15} },
        { id:'ster',     name:'STEROIDS',           price:450, icon:'⚡', desc:'Damage ×1.4 for 25s',    effect:{type:'buff',id:'ster',name:'STEROIDS',icon:'⚡',color:'#FF6644',duration:25,dmgMult:1.4} },
    ]},
    // 7 BANK
    { npcName:'BANKER', npcColor:'#FFCC44', dialogue:'"Your money is safe here... probably."',
      items:[
        { id:'loan',     name:'CASH LOAN',        price:0,   icon:'💵', desc:'Borrow $600 (costs $800 later)', effect:{type:'loan',give:600,debt:800} },
        { id:'invest',   name:'INVESTMENT',        price:400, icon:'📈', desc:'+$700 awarded next wave',        effect:{type:'buff',id:'inv',name:'INVESTED',icon:'📈',color:'#FFCC44',duration:999,pendingMoney:700} },
        { id:'heist',    name:'VAULT HEIST',        price:200, icon:'🏦', desc:'50% chance: +$1500 or -$400',    effect:{type:'heist'} },
    ]},
    // 8 NIGHTCLUB
    { npcName:'DJ', npcColor:'#FF00CC', dialogue:'"The night is young. Dance!"',
      items:[
        { id:'vip',      name:'VIP ENTRY',          price:150, icon:'🎵', desc:'3s invincibility + dance',       effect:{type:'invincible',duration:3} },
        { id:'rave',     name:'RAVE PILL',           price:300, icon:'💊', desc:'Speed+Fire for 20s',             effect:{type:'buff',id:'rave',name:'RAVING',icon:'🎵',color:'#FF00CC',duration:20,speedAdd:55,fireMult:0.65} },
        { id:'djvip',    name:'VIP PASS',            price:500, icon:'🌟', desc:'Fire rate perm +8%',             effect:{type:'perm',stat:'fireRate',amount:0.92} },
    ]},
    // 9 HOSPITAL
    { npcName:'DOCTOR', npcColor:'#FF4444', dialogue:'"You look terrible. I can help."',
      items:[
        { id:'surgery',  name:'SURGERY',            price:400, icon:'🏥', desc:'Full HP restore',                effect:{type:'healFull'} },
        { id:'bandage',  name:'BANDAGE',             price:100, icon:'🩹', desc:'+60 HP',                         effect:{type:'heal',amount:60} },
        { id:'adr',      name:'ADRENALINE',          price:300, icon:'💉', desc:'3s invincible + Speed 8s',       effect:{type:'multi',effects:[{type:'invincible',duration:3},{type:'buff',id:'adr',name:'ADRENALINE',icon:'💉',color:'#FF4444',duration:8,speedAdd:70}]} },
    ]},
    // 10 GARAGE
    { npcName:'MECHANIC', npcColor:'#778899', dialogue:'"I can tune anything with wheels."',
      items:[
        { id:'tune',     name:'TUNE-UP',            price:150, icon:'🔧', desc:'Speed +70 for 30s',              effect:{type:'buff',id:'vspd',name:'TUNED',icon:'🔧',color:'#778899',duration:30,speedAdd:70} },
        { id:'plate',    name:'ARMOR PLATING',       price:450, icon:'🛡', desc:'Armor +35% for 20s',             effect:{type:'buff',id:'varm',name:'ARMORED',icon:'🛡',color:'#778899',duration:20,armorAdd:0.35} },
        { id:'nitro',    name:'NITRO KIT',           price:280, icon:'🚀', desc:'Speed +120 for 8s',              effect:{type:'buff',id:'nit',name:'NITRO',icon:'🚀',color:'#FF8800',duration:8,speedAdd:120} },
    ]},
    // 11 BAR
    { npcName:'BARTENDER', npcColor:'#FFAA22', dialogue:'"What\'ll it be, friend?"',
      items:[
        { id:'cocktail', name:'COCKTAIL',            price:180, icon:'🍹', desc:'Speed +80 for 12s',              effect:{type:'buff',id:'cktl',name:'BUZZED',icon:'🍹',color:'#FFAA22',duration:12,speedAdd:80} },
        { id:'whiskey',  name:'WHISKEY SHOT',         price:130, icon:'🥃', desc:'Damage ×1.35 for 8s',           effect:{type:'buff',id:'whsk',name:'WHISKEY',icon:'🥃',color:'#FFAA22',duration:8,dmgMult:1.35} },
        { id:'brew',     name:'MIDNIGHT BREW',        price:350, icon:'🍺', desc:'Speed+Dmg+Fire for 10s',        effect:{type:'buff',id:'brew',name:'HAMMERED',icon:'🍺',color:'#FF6600',duration:10,speedAdd:50,dmgMult:1.25,fireMult:0.72} },
    ]},
    // 12 PAWNSHOP
    { npcName:'PAWNBROKER', npcColor:'#CC8833', dialogue:'"I buy junk, sell treasure."',
      items:[
        { id:'sell',     name:'SELL LOOT',           price:0,   icon:'💰', desc:'+400 cash (always)',             effect:{type:'money',amount:400} },
        { id:'mystery',  name:'MYSTERY BOX',          price:250, icon:'📦', desc:'Random weapon or buff',         effect:{type:'random'} },
        { id:'blkammo',  name:'BULK AMMO',            price:100, icon:'🔫', desc:'Fire rate ×1.7 for 10s',        effect:{type:'buff',id:'bammo',name:'LOADED',icon:'🔫',color:'#CC8833',duration:10,fireMult:0.58} },
    ]},
    // 13 TECH LAB
    { npcName:'SCIENTIST', npcColor:'#00FFCC', dialogue:'"Science! Beautiful science."',
      items:[
        { id:'cyber',    name:'CYBERNETICS',          price:450, icon:'🤖', desc:'Armor +0.08 (perm)',             effect:{type:'perm',stat:'armor',amount:0.08} },
        { id:'nano',     name:'NANO-BOTS',            price:500, icon:'🔬', desc:'Leech +4 HP per kill 20s',       effect:{type:'buff',id:'nano',name:'NANO-BOTS',icon:'🔬',color:'#00FFCC',duration:20,leechAdd:4} },
        { id:'oc',       name:'OVERCLOCK',            price:380, icon:'⚡', desc:'Fire rate ×2.5 for 12s',        effect:{type:'buff',id:'oc',name:'OVERCLOCKED',icon:'⚡',color:'#00FFCC',duration:12,fireMult:0.40} },
    ]},
    // 14 WAREHOUSE
    { npcName:'FOREMAN', npcColor:'#888888', dialogue:'"We got crates of everything."',
      items:[
        { id:'cache',    name:'SUPPLY CACHE',         price:200, icon:'📦', desc:'+50 HP + ammo boost 8s',        effect:{type:'multi',effects:[{type:'heal',amount:50},{type:'buff',id:'sup',name:'SUPPLIED',icon:'📦',color:'#888888',duration:8,fireMult:0.60}]} },
        { id:'wcrate',   name:'WEAPON CRATE',          price:350, icon:'🔫', desc:'Random weapon unlock',          effect:{type:'randomWeapon'} },
        { id:'blkm',     name:'BLACK MARKET',          price:600, icon:'🌑', desc:'+2 grenades + Dmg 15s',         effect:{type:'multi',effects:[{type:'grenades',amount:2},{type:'buff',id:'blk',name:'BLACK MKT',icon:'🌑',color:'#888888',duration:15,dmgMult:1.3}]} },
    ]},
    // 15 POLICE STATION
    { npcName:'CAPTAIN', npcColor:'#4477FF', dialogue:'"Keep it legal... or don\'t."',
      items:[
        { id:'bribe2',   name:'BRIBE CAPTAIN',        price:500, icon:'💸', desc:'Clear wanted + no cops 60s',    effect:{type:'multi',effects:[{type:'clearWanted'},{type:'buff',id:'nolaw',name:'IMMUNITY',icon:'💸',color:'#4477FF',duration:60,noPolice:true}]} },
        { id:'tip',      name:'TIP OFF',               price:300, icon:'📋', desc:'Clear wanted + $500',           effect:{type:'multi',effects:[{type:'clearWanted'},{type:'money',amount:500}]} },
        { id:'dep',      name:'DEPUTIZE',              price:400, icon:'⭐', desc:'No police spawns for 45s',      effect:{type:'buff',id:'dep',name:'DEPUTIZED',icon:'⭐',color:'#4477FF',duration:45,noPolice:true} },
    ]},
    // 16 TATTOO PARLOR
    { npcName:'ARTIST', npcColor:'#FF44AA', dialogue:'"Pain is just weakness leaving the body."',
      items:[
        { id:'war',      name:'WAR TATTOO',            price:300, icon:'💀', desc:'Damage +10% (perm)',            effect:{type:'perm',stat:'damage',amount:0.10} },
        { id:'sleeve',   name:'FULL SLEEVE',           price:500, icon:'🎨', desc:'Speed +12 (perm)',              effect:{type:'perm',stat:'speed',amount:12} },
        { id:'uvtat',    name:'UV TATTOO',              price:200, icon:'✨', desc:'Dodge +8% for 20s',             effect:{type:'buff',id:'uv',name:'UV GLOW',icon:'✨',color:'#FF44AA',duration:20,dodgeAdd:0.08} },
    ]},
    // 17 AMMO DEPOT
    { npcName:'ARMS DEALER', npcColor:'#FF6600', dialogue:'"I sell the loudest solutions."',
      items:[
        { id:'bulk',     name:'BULK AMMO',             price:200, icon:'📦', desc:'Fire rate ×2.2 for 12s',        effect:{type:'buff',id:'blk2',name:'OVERLOADED',icon:'📦',color:'#FF6600',duration:12,fireMult:0.45} },
        { id:'exprd',    name:'EXPLOSIVE ROUNDS',       price:420, icon:'💥', desc:'Bullets AoE splash for 15s',   effect:{type:'buff',id:'exp',name:'EXPLOSIVE',icon:'💥',color:'#FF6600',duration:15,explosiveBullets:true} },
        { id:'hical',    name:'HIGH CALIBER',           price:320, icon:'🔫', desc:'Damage ×1.5 for 20s',          effect:{type:'buff',id:'hcal',name:'HIGH-CAL',icon:'🔫',color:'#FF6600',duration:20,dmgMult:1.5} },
    ]},
    // 18 HACKER DEN
    { npcName:'HACKER', npcColor:'#00FF88', dialogue:'"The city is just a system. I own it."',
      items:[
        { id:'hkpol',    name:'HACK POLICE',           price:300, icon:'💻', desc:'Clear wanted level',            effect:{type:'clearWanted'} },
        { id:'hkmny',    name:'MONEY HACK',            price:400, icon:'💰', desc:'Wave × $120 instant cash',      effect:{type:'moneyHack'} },
        { id:'wpnmod',   name:'WEAPON MOD',            price:600, icon:'⚙',  desc:'Piercing bullets for 15s',      effect:{type:'buff',id:'prc',name:'PIERCING',icon:'⚙',color:'#00FF88',duration:15,piercingBullets:true} },
    ]},
    // 19 DOJO
    { npcName:'SENSEI', npcColor:'#FFDD00', dialogue:'"The sword and the self are one."',
      items:[
        { id:'train',    name:'TRAINING',              price:300, icon:'⚔',  desc:'Damage +8% (perm)',             effect:{type:'perm',stat:'damage',amount:0.08} },
        { id:'med',      name:'MEDITATE',               price:200, icon:'🧘', desc:'+50 HP + no wanted 15s',        effect:{type:'multi',effects:[{type:'heal',amount:50},{type:'buff',id:'zen',name:'ZEN',icon:'🧘',color:'#FFDD00',duration:15,noPolice:true}]} },
        { id:'kiai',     name:'KIAI FOCUS',             price:250, icon:'🥋', desc:'Dodge +12% for 12s',            effect:{type:'buff',id:'kai',name:'KIAI',icon:'🥋',color:'#FFDD00',duration:12,dodgeAdd:0.12} },
    ]},
    // 20 SAFEHOUSE
    { npcName:'CONTACT', npcColor:'#44AAFF', dialogue:'"Lie low. Stay sharp."',
      items:[
        { id:'safe',     name:'SAFE REST',             price:150, icon:'🏠', desc:'+60 HP',                        effect:{type:'heal',amount:60} },
        { id:'armory',   name:'ARMORY ACCESS',          price:420, icon:'🔫', desc:'Random weapon unlock',          effect:{type:'randomWeapon'} },
        { id:'escape',   name:'ESCAPE PLAN',            price:350, icon:'🚁', desc:'5s invincible + teleport',      effect:{type:'escape'} },
    ]},
    // 21 CHOP SHOP
    { npcName:'MECHANIC', npcColor:'#AA5522', dialogue:'"Bring it in rough, take it out mean."',
      items:[
        { id:'repair',   name:'REPAIR JOB',            price:200, icon:'🔧', desc:'Restore vehicle HP',            effect:{type:'repairVehicle'} },
        { id:'hotrod',   name:'HOT ROD MOD',           price:380, icon:'🏎', desc:'Speed +100 for 20s',            effect:{type:'buff',id:'rod',name:'HOT ROD',icon:'🏎',color:'#AA5522',duration:20,speedAdd:100} },
        { id:'spray',    name:'RESPRAY',                price:250, icon:'🎨', desc:'Clear wanted level',            effect:{type:'clearWanted'} },
    ]},
    // 22 RADIO STATION
    { npcName:'DJ', npcColor:'#FF88CC', dialogue:'"You\'re live on NEON FM!"',
      items:[
        { id:'broad',    name:'BROADCAST',             price:200, icon:'📻', desc:'Bots confused for 12s',         effect:{type:'buff',id:'brd',name:'BROADCAST',icon:'📻',color:'#FF88CC',duration:12,botsConfused:true} },
        { id:'hype',     name:'HYPE TRACK',            price:300, icon:'🎸', desc:'Kill money ×2 for 20s',         effect:{type:'buff',id:'hyp',name:'HYPED',icon:'🎸',color:'#FF88CC',duration:20,moneyMult:2} },
        { id:'shout',    name:'SHOUTOUT',               price:150, icon:'🎤', desc:'+$350',                         effect:{type:'money',amount:350} },
    ]},
    // 23 UNDERGROUND LAB
    { npcName:'DR. CHAOS', npcColor:'#55FF99', dialogue:'"Science has no limits here."',
      items:[
        { id:'mutagen',  name:'MUTAGEN',               price:450, icon:'🧬', desc:'Random permanent upgrade',      effect:{type:'permRandom'} },
        { id:'serum',    name:'SUPER SERUM',           price:700, icon:'💉', desc:'Speed+Dmg+Fire+Armor for 30s', effect:{type:'buff',id:'ser',name:'SUPER SERUM',icon:'💉',color:'#55FF99',duration:30,speedAdd:70,dmgMult:1.3,fireMult:0.75,armorAdd:0.20} },
        { id:'mind',     name:'MIND CONTROL',          price:600, icon:'🧠', desc:'Bots confused + Dmg ×1.2 15s', effect:{type:'buff',id:'mnd',name:'MIND CTRL',icon:'🧠',color:'#55FF99',duration:15,botsConfused:true,dmgMult:1.2} },
    ]},
  ],

  // ── Districts ─────────────────────────────────────────────
  DISTRICTS: [
    { id:'dangerous',  name:'DANGEROUS DISTRICT', shortName:'DANGER ZONE', color:'#FF4444', tint:'rgba(255,68,68,0.055)',
      desc:'Gang turf. Killing here calls in reinforcements.',
      lowEffect:'Gang bots surge every 10s', highEffect:'Reduced enemy pressure' },
    { id:'rich',       name:'RICH DISTRICT',       shortName:'UPTOWN',      color:'#FFDD44', tint:'rgba(255,221,68,0.045)',
      desc:'Corporate territory. Money buys silence.',
      lowEffect:'Wanted stars freeze', highEffect:'Shop -15% discount' },
    { id:'industrial', name:'INDUSTRIAL ZONE',      shortName:'INDUSTRY',    color:'#FF8822', tint:'rgba(255,136,34,0.055)',
      desc:'Factory district. Heavy enemies on every block.',
      lowEffect:'Enemies spawn +25% HP', highEffect:'+50% ammo drop rate' },
  ],
};
