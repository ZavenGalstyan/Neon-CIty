'use strict';

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
      stats: { speed: 55, health: 72, damage: 88 }
    },
    {
      id: 'hacker', name: 'THE HACKER', lore: 'Digital ghost. Faster than light.',
      color: '#44EEFF', accent: '#00BBFF', gunColor: '#00FFCC',
      speed: 250, health: 80, damage: 18, fireRate: 110, radius: 16,
      stats: { speed: 95, health: 45, damage: 45 }
    },
    {
      id: 'mercenary', name: 'THE MERCENARY', lore: 'War machine. Built to survive.',
      color: '#44FF88', accent: '#00CC44', gunColor: '#AAFFAA',
      speed: 148, health: 200, damage: 28, fireRate: 380, radius: 20,
      stats: { speed: 38, health: 100, damage: 65 }
    },
    {
      id: 'ghost', name: 'THE GHOST', lore: 'One shot. One kill. No trace.',
      color: '#CC88FF', accent: '#9922FF', gunColor: '#DDAAFF',
      speed: 212, health: 90, damage: 60, fireRate: 700, radius: 17,
      stats: { speed: 72, health: 55, damage: 100 }
    }
  ],

  // ── Maps ────────────────────────────────────────────────
  MAPS: [
    {
      id: 'downtown',
      name: 'DOWNTOWN',
      desc: 'Dense neon city. Tight corners everywhere.',
      theme: '#44EEFF',
      tags: ['URBAN', 'DENSE'],
      previewGridSize: 16,   // px — visual only
      previewBg:   '#080812',
      previewRoad: 'rgba(68,238,255,0.4)',

      // Gameplay
      mapW: 40, mapH: 40, tileSize: 80, roadEvery: 9,

      // Rendering
      roadColor:      '#111118',
      sidewalkColor:  '#1a1a28',
      buildingPalette: ['#1a1a2e','#16213e','#0f3460','#1a1a2e','#12212e','#1e1e30','#151530','#1c1c2e'],
      neonColors:     ['#FF0066','#00FFCC','#FFCC00','#FF6600'],
      windowColors:   ['#FFEE88','#88EEFF','#FF88CC','#88FFAA'],
      lightColor:     '#FFCC66',
      lightGlow:      '#FFAA44',
      neonFreq:       11,
      weather: 'rain',
      botPalettes: {
        mini:   [{ body:'#7722EE', accent:'#AA66FF' }, { body:'#5511CC', accent:'#8844DD' }, { body:'#9933FF', accent:'#CC77FF' }],
        normal: [{ body:'#FF3344', accent:'#FF0022' }, { body:'#FF6600', accent:'#FF4400' }, { body:'#AA0000', accent:'#CC2222' }, { body:'#DD0066', accent:'#FF0088' }],
        big:    [{ body:'#884400', accent:'#CC6600' }, { body:'#553300', accent:'#886644' }],
      },
    },
    {
      id: 'industrial',
      name: 'INDUSTRIAL',
      desc: 'Heavy warehouses. Wide open killing grounds.',
      theme: '#FF8800',
      tags: ['OPEN', 'WIDE'],
      previewGridSize: 22,
      previewBg:   '#0a0804',
      previewRoad: 'rgba(255,140,0,0.4)',

      mapW: 36, mapH: 36, tileSize: 80, roadEvery: 12,

      roadColor:      '#0d0d10',
      sidewalkColor:  '#141210',
      buildingPalette: ['#1a1510','#201a10','#181210','#222015','#1c1810','#161210','#1a1410','#201810'],
      neonColors:     ['#FF6600','#FFAA00','#FF3300','#FFCC00'],
      windowColors:   ['#FF8800','#FFAA44','#FF6600','#FFCC44'],
      lightColor:     '#FF8844',
      lightGlow:      '#FF6600',
      neonFreq:       8,
      weather: 'smoke',
      botPalettes: {
        mini:   [{ body:'#BB4400', accent:'#FF6600' }, { body:'#993300', accent:'#DD5500' }, { body:'#CC5500', accent:'#FF7700' }],
        normal: [{ body:'#884422', accent:'#CC6633' }, { body:'#AA5500', accent:'#DD7700' }, { body:'#993300', accent:'#CC5511' }, { body:'#7A3310', accent:'#AA5522' }],
        big:    [{ body:'#553311', accent:'#886644' }, { body:'#664422', accent:'#997755' }],
      },
    },
    {
      id: 'suburbs',
      name: 'SUBURBS',
      desc: 'Tight residential grid. No place to hide.',
      theme: '#44FF88',
      tags: ['MAZE', 'TIGHT'],
      previewGridSize: 12,
      previewBg:   '#04080a',
      previewRoad: 'rgba(68,255,136,0.38)',

      mapW: 50, mapH: 50, tileSize: 80, roadEvery: 7,

      roadColor:      '#0c1210',
      sidewalkColor:  '#121a14',
      buildingPalette: ['#0f1e14','#111e18','#0e1a12','#131f16','#101c14','#0f1c12','#121e15','#0e1c12'],
      neonColors:     ['#00FF88','#44FFAA','#00CC66','#88FFCC'],
      windowColors:   ['#88FFCC','#AAFFDD','#66FFAA','#CCFFEE'],
      lightColor:     '#88FFCC',
      lightGlow:      '#44FF88',
      neonFreq:       14,
      weather: 'clear',
      botPalettes: {
        mini:   [{ body:'#009944', accent:'#00DD66' }, { body:'#007733', accent:'#00BB55' }, { body:'#00AA44', accent:'#00EE77' }],
        normal: [{ body:'#00AA44', accent:'#00FF66' }, { body:'#008833', accent:'#00CC55' }, { body:'#006633', accent:'#009944' }, { body:'#00BB55', accent:'#00FF77' }],
        big:    [{ body:'#224411', accent:'#447733' }, { body:'#335522', accent:'#558844' }],
      },
    },
    {
      id: 'ruins',
      name: 'RUINS',
      desc: 'Collapsed city. Blood soaked streets.',
      theme: '#FF4444',
      tags: ['DANGER', 'DARK'],
      previewGridSize: 19,
      previewBg:   '#0a0404',
      previewRoad: 'rgba(255,60,60,0.38)',

      mapW: 38, mapH: 38, tileSize: 80, roadEvery: 10,

      roadColor:      '#100808',
      sidewalkColor:  '#180f0f',
      buildingPalette: ['#1e0a0a','#1a0808','#200c0c','#1c0a0a','#180808','#1e0c0c','#1c0a08','#200a0a'],
      neonColors:     ['#FF2200','#FF4400','#CC0000','#FF6644'],
      windowColors:   ['#FF4444','#FF6666','#FF2222','#FF8888'],
      lightColor:     '#FF5544',
      lightGlow:      '#CC2222',
      neonFreq:       9,
      weather: 'sandstorm',
      botPalettes: {
        mini:   [{ body:'#880022', accent:'#CC2244' }, { body:'#660011', accent:'#AA1133' }, { body:'#991122', accent:'#DD3344' }],
        normal: [{ body:'#CC1100', accent:'#FF2200' }, { body:'#990000', accent:'#CC1100' }, { body:'#AA0000', accent:'#DD1100' }, { body:'#BB1100', accent:'#EE2200' }],
        big:    [{ body:'#551100', accent:'#882211' }, { body:'#441100', accent:'#773311' }],
      },
    },
    {
      id: 'docks',
      name: 'DOCKS',
      desc: 'Port district. Narrow alleys. Hidden dangers.',
      theme: '#00AACC',
      tags: ['PORT', 'NARROW'],
      previewGridSize: 11,
      previewBg:   '#020b10',
      previewRoad: 'rgba(0,170,204,0.38)',

      mapW: 34, mapH: 34, tileSize: 80, roadEvery: 6,

      roadColor:      '#060c12',
      sidewalkColor:  '#0c1520',
      buildingPalette: ['#0a1a28','#081522','#0c2033','#0a1c2a','#082030','#0c1a28','#0a1c30','#091820'],
      neonColors:     ['#00AACC','#0088AA','#00CCDD','#0066BB'],
      windowColors:   ['#88DDFF','#AAEEFF','#66CCEE','#CCFFFF'],
      lightColor:     '#88DDFF',
      lightGlow:      '#00AACC',
      neonFreq:       10,
      weather: 'fog',
      botPalettes: {
        mini:   [{ body:'#0066AA', accent:'#0099CC' }, { body:'#005588', accent:'#0077BB' }, { body:'#0077BB', accent:'#00AADD' }],
        normal: [{ body:'#005577', accent:'#0088AA' }, { body:'#006688', accent:'#0099BB' }, { body:'#004466', accent:'#007799' }, { body:'#007799', accent:'#00AABB' }],
        big:    [{ body:'#003355', accent:'#006688' }, { body:'#004466', accent:'#007799' }],
      },
    },
    {
      id: 'casino',
      name: 'CASINO STRIP',
      desc: 'Neon-lit boulevard. Wide open. High risk.',
      theme: '#FFCC00',
      tags: ['NEON', 'OPEN'],
      previewGridSize: 27,
      previewBg:   '#0c0900',
      previewRoad: 'rgba(255,204,0,0.38)',

      mapW: 44, mapH: 44, tileSize: 80, roadEvery: 14,

      roadColor:      '#0f0d08',
      sidewalkColor:  '#1a1508',
      buildingPalette: ['#1a1408','#201a0a','#181208','#22180a','#1c1608','#16120a','#1a140a','#201808'],
      neonColors:     ['#FFCC00','#FF8800','#FF44AA','#FF0066'],
      windowColors:   ['#FFEE88','#FFDD44','#FF88CC','#FFCC66'],
      lightColor:     '#FFCC44',
      lightGlow:      '#FFAA00',
      neonFreq:       7,
      weather: 'neon_haze',
      botPalettes: {
        mini:   [{ body:'#BB8800', accent:'#FFCC00' }, { body:'#CC9900', accent:'#FFDD00' }, { body:'#AA7700', accent:'#EEBB00' }],
        normal: [{ body:'#AA6600', accent:'#FF9900' }, { body:'#CC8800', accent:'#FFBB00' }, { body:'#884400', accent:'#CC6600' }, { body:'#BB7700', accent:'#FFAA00' }],
        big:    [{ body:'#665500', accent:'#AA8800' }, { body:'#554400', accent:'#997700' }],
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
    }
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
    }
  ],

  // ── Upgrades ─────────────────────────────────────────────
  UPGRADES: [
    { id: 'health',   name: 'MAX HEALTH',  desc: '+25 HP per level',       icon: '♥', color: '#FF6688', maxLevel: 5, baseCost: 400,  costMult: 1.6  },
    { id: 'speed',    name: 'SPEED',       desc: '+18 SPD per level',      icon: '↑', color: '#44EEFF', maxLevel: 5, baseCost: 500,  costMult: 1.65 },
    { id: 'damage',   name: 'DAMAGE',      desc: '+15% DMG per level',     icon: '◆', color: '#FF4455', maxLevel: 5, baseCost: 600,  costMult: 1.7  },
    { id: 'firerate', name: 'FIRE RATE',   desc: '-8% cooldown per level', icon: '◉', color: '#FF8800', maxLevel: 5, baseCost: 700,  costMult: 1.75 },
    { id: 'armor',    name: 'ARMOR',       desc: '-10% damage taken',      icon: '⬡', color: '#44FF88', maxLevel: 5, baseCost: 800,  costMult: 1.8  },
    { id: 'regen',    name: 'REGEN',       desc: '+1 HP/sec per level',    icon: '✚', color: '#88FFCC', maxLevel: 3, baseCost: 1000, costMult: 2.0  }
  ]
};
