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
  },

  // ── Global Events ────────────────────────────────────────
  GLOBAL_EVENTS: [
    { id:'blackout',    name:'TOTAL BLACKOUT',    desc:'The city grid has failed.',                   duration:55, major:true  },
    { id:'riot',        name:'CITY RIOT',          desc:'The streets are in chaos.',                   duration:60, major:false },
    { id:'corporate',   name:'CORPORATE INVASION', desc:'MegaCorp enforcers have seized the district.', duration:65, major:true  },
    { id:'cyber_virus', name:'CYBER VIRUS',        desc:'Systems compromised. Reality unraveling.',     duration:50, major:false },
  ],

  // ── Car Dealership ──────────────────────────────────────
  CAR_DEALERSHIP: [
    { id:'sedan',   name:'SEDAN',       desc:'Reliable street car.',   price:2000, speed:295, hp:200, color:'#CC3333', radius:28 },
    { id:'sports',  name:'SPORTS CAR',  desc:'Born for speed.',        price:5500, speed:420, hp:120, color:'#3366BB', radius:26 },
    { id:'suv',     name:'SUV / TRUCK', desc:'Built to survive.',      price:4000, speed:200, hp:380, color:'#CC9900', radius:30 },
    { id:'armored', name:'ARMORED VAN', desc:'Bulletproof. Heavy.',    price:8500, speed:180, hp:500, color:'#445566', radius:32, bulletproof:true },
  ],

  GRENADE: { damage:120, blastRadius:95, fuseTime:2.0, price:500 },

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
