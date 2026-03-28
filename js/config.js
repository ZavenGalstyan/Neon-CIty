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
  // Page 1: Characters 1-16 (last 4 locked)
  // Page 2: Characters 17-32 (last 4 locked)
  CHARACTERS: [
    // ═══════════════════════════════════════════════════════════
    // PAGE 1 · STREET CREW (Characters 1-16)
    // ═══════════════════════════════════════════════════════════
    {
      id: 'gangster', name: 'THE GANGSTER', lore: 'Street boss with no mercy.',
      color: '#FF4466', accent: '#FF0033', gunColor: '#888',
      speed: 185, health: 120, damage: 35, fireRate: 280, radius: 18,
      stats: { speed: 55, health: 72, damage: 88 }, companion: 'dog',
      renderType: 'humanoid', bodyScale: 1.0
    },
    {
      id: 'hacker', name: 'THE HACKER', lore: 'Digital ghost. Faster than light.',
      color: '#44EEFF', accent: '#00BBFF', gunColor: '#00FFCC',
      speed: 250, health: 80, damage: 18, fireRate: 110, radius: 14,
      stats: { speed: 95, health: 45, damage: 45 }, companion: 'cat',
      renderType: 'humanoid_slim', bodyScale: 0.85
    },
    {
      id: 'mercenary', name: 'THE MERCENARY', lore: 'War machine. Built to survive.',
      color: '#44FF88', accent: '#00CC44', gunColor: '#AAFFAA',
      speed: 148, health: 200, damage: 28, fireRate: 380, radius: 22,
      stats: { speed: 38, health: 100, damage: 65 }, companion: 'wolf',
      renderType: 'humanoid_heavy', bodyScale: 1.3
    },
    {
      id: 'ghost', name: 'THE GHOST', lore: 'One shot. One kill. No trace.',
      color: '#CC88FF', accent: '#9922FF', gunColor: '#DDAAFF',
      speed: 212, health: 90, damage: 60, fireRate: 700, radius: 16,
      stats: { speed: 72, health: 55, damage: 100 }, companion: 'raven',
      renderType: 'cloaked', bodyScale: 0.95
    },
    {
      id: 'engineer', name: 'THE ENGINEER', lore: 'Builds shield turrets. Tech is power.',
      color: '#FFAA00', accent: '#CC7700', gunColor: '#FFCC66',
      speed: 165, health: 130, damage: 25, fireRate: 340, radius: 19,
      stats: { speed: 48, health: 78, damage: 58 }, companion: 'drone_mini',
      renderType: 'humanoid', bodyScale: 1.05, _shieldDevice: true
    },
    {
      id: 'sniper_elite', name: 'SNIPER ELITE', lore: 'One bullet. Maximum precision.',
      color: '#2288FF', accent: '#0055CC', gunColor: '#88BBFF',
      speed: 155, health: 85, damage: 95, fireRate: 1200, radius: 15,
      stats: { speed: 42, health: 48, damage: 100 }, companion: 'eagle',
      renderType: 'humanoid_slim', bodyScale: 0.9, starterWeapon: 'sniper', _critChance: 0.35
    },
    {
      id: 'drone_pilot', name: 'DRONE PILOT', lore: 'Eyes in the sky. Death from above.',
      color: '#77DDFF', accent: '#44AACC', gunColor: '#AAEEFF',
      speed: 175, health: 95, damage: 30, fireRate: 300, radius: 17,
      stats: { speed: 52, health: 55, damage: 68 }, companion: 'combat_drone',
      renderType: 'humanoid', bodyScale: 1.0, _droneAttack: true
    },
    {
      id: 'chemist', name: 'THE CHEMIST', lore: 'Toxic clouds. Corrosive death.',
      color: '#88FF44', accent: '#55CC11', gunColor: '#AAFF77',
      speed: 168, health: 110, damage: 28, fireRate: 420, radius: 18,
      stats: { speed: 50, health: 65, damage: 72 }, companion: 'toxic_slug',
      renderType: 'humanoid', bodyScale: 1.0, _poisonDamage: true
    },
    {
      id: 'cyber_ninja', name: 'CYBER NINJA', lore: 'Dash through shadows. Strike unseen.',
      color: '#FF00AA', accent: '#CC0088', gunColor: '#FF66CC',
      speed: 265, health: 75, damage: 48, fireRate: 350, radius: 14,
      stats: { speed: 98, health: 40, damage: 85 }, companion: 'shadow_cat',
      renderType: 'ninja', bodyScale: 0.8, starterWeapon: 'knife', _dashAbility: true, _invisibility: true
    },
    {
      id: 'cyber_wolf', name: 'CYBER WOLF', lore: 'Metallic fangs. Hunt in packs.',
      color: '#8899AA', accent: '#556677', gunColor: '#AABBCC',
      speed: 240, health: 95, damage: 42, fireRate: 280, radius: 20,
      stats: { speed: 88, health: 55, damage: 82 }, companion: 'wolf_pack',
      renderType: 'wolf', bodyScale: 1.1, _meleeBoost: true
    },
    {
      id: 'neon_panther', name: 'NEON PANTHER', lore: 'Silent predator. Neon claws.',
      color: '#FF44FF', accent: '#CC00CC', gunColor: '#FF88FF',
      speed: 255, health: 82, damage: 55, fireRate: 380, radius: 18,
      stats: { speed: 92, health: 45, damage: 92 }, companion: 'panther_spirit',
      renderType: 'panther', bodyScale: 1.0, _stealthAttack: true
    },
    {
      id: 'mecha_bulldog', name: 'MECHA BULLDOG', lore: 'Heavy armor. Unstoppable charge.',
      color: '#AA8866', accent: '#775533', gunColor: '#CCAA88',
      speed: 125, health: 250, damage: 35, fireRate: 450, radius: 22,
      stats: { speed: 25, health: 100, damage: 75 }, companion: 'bulldog_drone',
      renderType: 'bulldog', bodyScale: 1.25, _armorPlating: true
    },
    // Page 1 Locked Characters (13-16)
    {
      id: 'timebreaker', name: 'TIMEBREAKER', lore: 'Bend time. Break reality.',
      color: '#FFDD00', accent: '#CCAA00', gunColor: '#FFEE66',
      speed: 200, health: 100, damage: 45, fireRate: 340, radius: 17,
      stats: { speed: 70, health: 58, damage: 85 }, companion: 'chrono_orb',
      renderType: 'humanoid', bodyScale: 1.0, _slowTime: true, locked: true, price: 15000
    },
    {
      id: 'ai_avatar', name: 'AI AVATAR', lore: 'Adaptive intelligence. Learns your pain.',
      color: '#00FFAA', accent: '#00CC88', gunColor: '#66FFCC',
      speed: 190, health: 115, damage: 35, fireRate: 300, radius: 18,
      stats: { speed: 65, health: 68, damage: 75 }, companion: 'ai_core',
      renderType: 'humanoid', bodyScale: 0.95, _adaptiveDamage: true, locked: true, price: 18000
    },
    {
      id: 'overlord', name: 'THE OVERLORD', lore: 'Command the swarm. Rule the field.',
      color: '#7744FF', accent: '#5522CC', gunColor: '#AA88FF',
      speed: 145, health: 140, damage: 22, fireRate: 380, radius: 19,
      stats: { speed: 38, health: 82, damage: 55 }, companion: 'drone_swarm',
      renderType: 'humanoid_heavy', bodyScale: 1.2, _summonDrones: true, locked: true, price: 20000
    },
    {
      id: 'electric_eel', name: 'ELECTRIC EEL', lore: 'High voltage. Chain lightning.',
      color: '#44DDFF', accent: '#00AACC', gunColor: '#88EEFF',
      speed: 195, health: 88, damage: 40, fireRate: 320, radius: 16,
      stats: { speed: 68, health: 50, damage: 80 }, companion: 'eel_bot',
      renderType: 'eel', bodyScale: 0.9, _stunAbility: true, locked: true, price: 16000
    },
    // ═══════════════════════════════════════════════════════════
    // PAGE 2 · SPECIALISTS (Characters 17-32)
    // ═══════════════════════════════════════════════════════════
    {
      id: 'medic', name: 'THE MEDIC', lore: 'Combat surgeon. Heals in the field.',
      color: '#44FFAA', accent: '#00CC77', gunColor: '#88FFCC',
      speed: 162, health: 160, damage: 22, fireRate: 320, radius: 18,
      stats: { speed: 44, health: 90, damage: 50 }, companion: 'bear',
      renderType: 'humanoid', bodyScale: 1.0
    },
    {
      id: 'ronin', name: 'THE RONIN', lore: 'Ancient blade. Perfect discipline.',
      color: '#FFCC44', accent: '#FF9900', gunColor: '#FFEEAA',
      speed: 225, health: 100, damage: 55, fireRate: 500, radius: 17,
      stats: { speed: 75, health: 58, damage: 96 }, companion: 'fox',
      renderType: 'humanoid_slim', bodyScale: 0.9, starterWeapon: 'knife'
    },
    {
      id: 'pyro', name: 'THE PYRO', lore: 'Fire is the only language left to speak.',
      color: '#FF5500', accent: '#FF2200', gunColor: '#FF8833',
      speed: 148, health: 155, damage: 55, fireRate: 260, radius: 19,
      stats: { speed: 32, health: 88, damage: 98 }, companion: 'salamander',
      renderType: 'humanoid_heavy', bodyScale: 1.15, starterWeapon: 'flamethrower'
    },
    {
      id: 'phantom', name: 'THE PHANTOM', lore: 'Shadow given a gun. Death without a face.',
      color: '#AA44FF', accent: '#7711CC', gunColor: '#CC88FF',
      speed: 248, health: 72, damage: 52, fireRate: 390, radius: 15,
      stats: { speed: 95, health: 38, damage: 88 }, companion: 'spirit',
      renderType: 'cloaked', bodyScale: 0.85, starterWeapon: 'crossbow', _dodgeChance: 0.22
    },
    {
      id: 'spider_drone', name: 'SPIDER DRONE', lore: 'Eight legs. Infinite traps.',
      color: '#AA4444', accent: '#772222', gunColor: '#CC6666',
      speed: 178, health: 90, damage: 32, fireRate: 350, radius: 14,
      stats: { speed: 55, health: 52, damage: 70 }, companion: 'spider_bots',
      renderType: 'spider', bodyScale: 0.8, _trapAbility: true
    },
    {
      id: 'robo_hawk', name: 'ROBO HAWK', lore: 'Air superiority. Dive bomb attacks.',
      color: '#DDAA44', accent: '#AA7722', gunColor: '#FFCC77',
      speed: 235, health: 78, damage: 48, fireRate: 400, radius: 16,
      stats: { speed: 85, health: 42, damage: 85 }, companion: 'hawk_drone',
      renderType: 'hawk', bodyScale: 0.9, _airStrike: true
    },
    {
      id: 'nano_rat', name: 'NANO RAT', lore: 'Tiny but deadly. Sabotage expert.',
      color: '#888888', accent: '#555555', gunColor: '#AAAAAA',
      speed: 280, health: 55, damage: 25, fireRate: 180, radius: 12,
      stats: { speed: 100, health: 28, damage: 58 }, companion: 'rat_swarm',
      renderType: 'rat', bodyScale: 0.6, _sabotage: true
    },
    {
      id: 'mini_bee', name: 'MINI DRONE BEE', lore: 'Swarm protocol. Death by a thousand stings.',
      color: '#FFCC00', accent: '#CC9900', gunColor: '#FFDD44',
      speed: 220, health: 60, damage: 18, fireRate: 120, radius: 13,
      stats: { speed: 82, health: 32, damage: 45 }, companion: 'bee_swarm',
      renderType: 'bee', bodyScale: 0.5, _swarmDamage: true
    },
    {
      id: 'tank_commander', name: 'TANK COMMANDER', lore: 'Heavy metal. Explosive ordinance.',
      color: '#556644', accent: '#334422', gunColor: '#88AA66',
      speed: 115, health: 280, damage: 45, fireRate: 600, radius: 23,
      stats: { speed: 18, health: 100, damage: 88 }, companion: 'mini_tank',
      renderType: 'titan', bodyScale: 1.4, _explosiveRounds: true
    },
    {
      id: 'blade_dancer', name: 'BLADE DANCER', lore: 'Spinning death. Graceful carnage.',
      color: '#FF6688', accent: '#CC4466', gunColor: '#FF99AA',
      speed: 242, health: 85, damage: 58, fireRate: 420, radius: 16,
      stats: { speed: 90, health: 48, damage: 95 }, companion: 'blade_spirit',
      renderType: 'humanoid_slim', bodyScale: 0.85, starterWeapon: 'knife', _spinAttack: true
    },
    {
      id: 'frost_walker', name: 'FROST WALKER', lore: 'Sub-zero. Freeze your enemies.',
      color: '#88DDFF', accent: '#55AACC', gunColor: '#AAEEFF',
      speed: 172, health: 105, damage: 35, fireRate: 360, radius: 18,
      stats: { speed: 52, health: 62, damage: 72 }, companion: 'ice_sprite',
      renderType: 'humanoid', bodyScale: 1.0, _freezeAbility: true
    },
    {
      id: 'volt_runner', name: 'VOLT RUNNER', lore: 'Electric speed. Lightning reflexes.',
      color: '#FFFF44', accent: '#CCCC00', gunColor: '#FFFF88',
      speed: 270, health: 70, damage: 38, fireRate: 240, radius: 15,
      stats: { speed: 98, health: 35, damage: 75 }, companion: 'spark_bot',
      renderType: 'humanoid_slim', bodyScale: 0.85, _electricTrail: true
    },
    // Page 2 Locked Characters (29-32)
    {
      id: 'shadow_lord', name: 'SHADOW LORD', lore: 'Darkness incarnate. Fear given form.',
      color: '#442266', accent: '#221144', gunColor: '#664488',
      speed: 205, health: 110, damage: 52, fireRate: 380, radius: 18,
      stats: { speed: 72, health: 65, damage: 90 }, companion: 'shadow_wraith',
      renderType: 'cloaked', bodyScale: 1.1, _darkAbility: true, locked: true, price: 22000
    },
    {
      id: 'plasma_titan', name: 'PLASMA TITAN', lore: 'Pure energy. Devastating power.',
      color: '#FF88FF', accent: '#CC55CC', gunColor: '#FFAAFF',
      speed: 138, health: 200, damage: 65, fireRate: 550, radius: 21,
      stats: { speed: 32, health: 95, damage: 100 }, companion: 'plasma_orb',
      renderType: 'titan', bodyScale: 1.35, _plasmaBlast: true, locked: true, price: 25000
    },
    {
      id: 'quantum_ghost', name: 'QUANTUM GHOST', lore: 'Phase through walls. Strike from nowhere.',
      color: '#AAFFFF', accent: '#77CCCC', gunColor: '#CCFFFF',
      speed: 230, health: 68, damage: 48, fireRate: 340, radius: 15,
      stats: { speed: 85, health: 35, damage: 85 }, companion: 'quantum_echo',
      renderType: 'cloaked', bodyScale: 0.9, _phaseAbility: true, _dodgeChance: 0.30, locked: true, price: 28000
    },
    {
      id: 'omega_prime', name: 'OMEGA PRIME', lore: 'Ultimate warrior. Final evolution.',
      color: '#FFD700', accent: '#DAA520', gunColor: '#FFE55C',
      speed: 210, health: 150, damage: 55, fireRate: 320, radius: 19,
      stats: { speed: 75, health: 85, damage: 95 }, companion: 'omega_drone',
      renderType: 'humanoid_heavy', bodyScale: 1.25, _ultimateForm: true, locked: true, price: 50000
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

    // ── Galactica ───────────────────────────────────────────
    {
      id: 'galactica', name: 'GALACTICA',
      desc: 'A living galaxy. Alien swarms, plasma storms, planet structures. The Galactic Overlord rules all.',
      theme: '#AA44FF',
      tags: ['SPACE', 'ALIENS', 'COSMIC'],
      previewGridSize: 16, previewBg: '#020010', previewRoad: 'rgba(120,60,255,0.45)',
      mapW: 40, mapH: 40, tileSize: 80, roadEvery: 7,
      roadColor: '#04000e', sidewalkColor: '#08001a',
      buildingPalette: ['#120028','#1a0038','#0e0024','#160030','#10001e','#18002a','#0c001e','#140030'],
      neonColors: ['#AA44FF','#FF44AA','#44AAFF','#FFAA44','#44FFAA'],
      windowColors: ['#CC88FF','#FF88CC','#88CCFF','#FFCC88'],
      lightColor: '#AA44FF', lightGlow: '#7722CC', neonFreq: 6,
      weather: 'starfield',
      galactica: true,
      botPalettes: {
        mini:       [{ body:'#1a0040', accent:'#AA44FF' }, { body:'#0a0028', accent:'#FF44AA' }],
        normal:     [{ body:'#220044', accent:'#CC66FF' }, { body:'#1a003a', accent:'#AA44FF' }, { body:'#28004a', accent:'#FF66AA' }],
        big:        [{ body:'#0e0028', accent:'#7722CC' }, { body:'#0c0020', accent:'#8833DD' }],
        police:     [{ body:'#001428', accent:'#44AAFF' }, { body:'#000c20', accent:'#2288EE' }],
        swat:       [{ body:'#0a001e', accent:'#FF4444' }],
        heavyswat:  [{ body:'#14000a', accent:'#FF8844' }],
        sniper:     [{ body:'#04001c', accent:'#44FFCC' }],
        bomber:     [{ body:'#1a0800', accent:'#FF6600' }],
        juggernaut: [{ body:'#0a0020', accent:'#AA44FF' }],
      },
    },

    // ── The Tower ─────────────────────────────────────────────
    {
      id: 'tower', name: 'THE TOWER',
      desc: '10 floors. One building. Kill every enemy to ride the elevator up. Floor 10: face the penthouse boss.',
      theme: '#FFD700', tags: ['BUILDING', 'FLOORS', 'INDOOR'],
      previewGridSize: 16, previewBg: '#1a1210', previewRoad: '#3a2a18',
      mapW: 22, mapH: 16, tileSize: 80, roadEvery: 1,
      roadColor: '#d0b888', sidewalkColor: '#b09060',
      buildingPalette: ['#6a4a2a','#5a3a1a','#7a5a3a','#4a3a2a'],
      neonColors: ['#FFD700','#FFA500','#FFEE44'],
      windowColors: ['#FFE88A','#FFCC55'],
      lightColor: '#FFD700', lightGlow: '#FFA500', neonFreq: 999,
      weather: 'clear',
      tower: true,
      botPalettes: {
        mini:       [{ body:'#CC4400', accent:'#FF6622' }, { body:'#AA3300', accent:'#FF4400' }],
        normal:     [{ body:'#882200', accent:'#CC4400' }, { body:'#993300', accent:'#DD5500' }],
        big:        [{ body:'#663300', accent:'#AA5500' }, { body:'#552200', accent:'#994400' }],
        police:     [{ body:'#003388', accent:'#4466FF' }, { body:'#002266', accent:'#3355EE' }],
        swat:       [{ body:'#222244', accent:'#4444BB' }, { body:'#111133', accent:'#3333AA' }],
        heavyswat:  [{ body:'#1a1a33', accent:'#3333AA' }],
        sniper:     [{ body:'#334455', accent:'#6699CC' }, { body:'#223344', accent:'#5588BB' }],
        bomber:     [{ body:'#552200', accent:'#FF4400' }, { body:'#661100', accent:'#FF3300' }],
        juggernaut: [{ body:'#330000', accent:'#880000' }, { body:'#440000', accent:'#990000' }],
      },
    },

    // ── Sky Realm ─────────────────────────────────────────────
    {
      id: 'sky_realm', name: 'SKY REALM',
      desc: 'Battle above the clouds. Airplanes streak past. Eagles dive. Rule the sky or fall.',
      theme: '#87CEEB', tags: ['SKY', 'AERIAL', 'CLOUDS'],
      previewGridSize: 18, previewBg: '#1a4a7a', previewRoad: 'rgba(135,206,235,0.45)',
      mapW: 36, mapH: 36, tileSize: 80, roadEvery: 1,
      roadColor: '#5a9ec8', sidewalkColor: '#7ab8d8',
      buildingPalette: ['#FFFFFF','#F0F8FF','#E8F4FD','#D6EEF8','#F5FBFF','#E5F2FA','#DDEEF8','#EAF5FD'],
      neonColors: ['#87CEEB','#FFD700','#FFA07A','#98E8FF'],
      windowColors: ['#B8E0FF','#D0EEFF','#A8D8FF','#C8ECFF'],
      lightColor: '#87CEEB', lightGlow: '#5BA3C9', neonFreq: 999,
      weather: 'sky_breeze', sky: true,
      botPalettes: {
        mini:      [{ body:'#5588BB', accent:'#87CEEB' }, { body:'#4477AA', accent:'#AAD8FF' }],
        normal:    [{ body:'#6699CC', accent:'#87CEEB' }, { body:'#5588BB', accent:'#AADDFF' }, { body:'#7799BB', accent:'#99CCFF' }],
        big:       [{ body:'#4466AA', accent:'#66AADD' }, { body:'#334488', accent:'#5599CC' }],
        police:    [{ body:'#334477', accent:'#88BBFF' }, { body:'#223366', accent:'#6699EE' }],
        swat:      [{ body:'#223355', accent:'#4477BB' }, { body:'#1A2244', accent:'#3366AA' }],
        heavyswat: [{ body:'#112233', accent:'#336699' }],
        sniper:    [{ body:'#667788', accent:'#AACCDD' }],
        bomber:    [{ body:'#BB6633', accent:'#FFAA55' }],
        juggernaut:[{ body:'#334455', accent:'#88AACC' }],
      },
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

    // ── Robot City ───────────────────────────────────────────
    {
      id: 'robot_city',
      name: 'ROBOT CITY',
      desc: 'A machine metropolis gone rogue. All enemies are robots. A Titan Mech rules.',
      theme: '#00DDFF',
      tags: ['ROBOTS', 'ELECTRIC', 'FUTURISTIC'],
      previewGridSize: 18,
      previewBg: '#050c14',
      previewRoad: 'rgba(0,180,220,0.4)',

      mapW: 44, mapH: 44, tileSize: 80, roadEvery: 8,

      roadColor:       '#0a1018',   // Dark metal grid floor
      sidewalkColor:   '#0d1420',   // Circuit board platform
      buildingPalette: ['#0c1822','#101e2a','#0e1c28','#121e2e','#0a1620','#101c2a','#0c1a24','#0e1e2c'],
      neonColors:      ['#00DDFF','#00FFCC','#44EEFF','#0099FF'],
      windowColors:    ['#00DDFF','#44EEFF','#00BBDD','#22CCFF'],
      lightColor:      '#00DDFF',
      lightGlow:       '#0099FF',
      neonFreq:        4,
      weather:         'electric',
      robot:           true,

      botPalettes: {
        mini:      [{ body:'#1a2a3a', accent:'#00DDFF' }, { body:'#0e1e2e', accent:'#44EEFF' }],
        normal:    [{ body:'#1c2e40', accent:'#00CCFF' }, { body:'#162438', accent:'#22EEFF' }, { body:'#1a2c3c', accent:'#00AACC' }],
        big:       [{ body:'#0e1e30', accent:'#FF4400' }, { body:'#101c2c', accent:'#FF6600' }],
        police:    [{ body:'#0a1a3a', accent:'#4466FF' }, { body:'#0c1c38', accent:'#2244EE' }],
        swat:      [{ body:'#1a0a0a', accent:'#FF2200' }],
        heavyswat: [{ body:'#1a1400', accent:'#FFCC00' }],
        sniper:    [{ body:'#080e16', accent:'#00FF88' }],
        bomber:    [{ body:'#1a0e00', accent:'#FF8800' }],
        juggernaut:[{ body:'#101010', accent:'#FF0000' }],
      },
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

    // ── Desert Sands ───────────────────────────────────────
    {
      id: 'desert_sands', name: 'DESERT SANDS',
      desc: 'Ancient pyramids, mummies, scorpions. Ride camels. Survive the Pharaoh God.',
      theme: '#D4A017', tags: ['DESERT', 'ANCIENT', 'MUMMIES'],
      previewGridSize: 14, previewBg: '#180e00', previewRoad: 'rgba(200,158,70,0.50)',
      mapW: 40, mapH: 40, tileSize: 80, roadEvery: 6,
      roadColor: '#c8a05a', sidewalkColor: '#a87a3a',
      buildingPalette: ['#8B6914','#9e7c20','#7a5c10','#A0801e','#8a6818','#b08422','#6c5010','#9c7a1e'],
      neonColors: ['#D4A017','#FF8800','#E8B020','#FF6600'],
      windowColors: ['#FFD700','#FFAA44','#FF8800','#FFCC44'],
      lightColor: '#FFB830', lightGlow: '#FF8800', neonFreq: 14,
      weather: 'sandstorm',
      desert: true,
      botPalettes: {
        mini:       [{ body:'#5a3d10', accent:'#D4A017' }, { body:'#6B4E1A', accent:'#C89020' }],
        normal:     [{ body:'#D4C4A0', accent:'#8B6914' }, { body:'#C8B490', accent:'#9e7c20' }, { body:'#E0D0A8', accent:'#7a5c10' }],
        big:        [{ body:'#8B7A50', accent:'#D4A017' }, { body:'#7a6a40', accent:'#C89020' }],
        police:     [{ body:'#1a1408', accent:'#D4A017' }, { body:'#141008', accent:'#FFD700' }],
        swat:       [{ body:'#0e0c06', accent:'#8B6914' }],
        heavyswat:  [{ body:'#0a0806', accent:'#FF8800' }],
        sniper:     [{ body:'#c8b87a', accent:'#FFD700' }],
        bomber:     [{ body:'#1a1000', accent:'#FF6622' }],
        juggernaut: [{ body:'#8B6914', accent:'#D4A017' }],
      },
    },

    // ── Jungle Safari ──────────────────────────────────────
    {
      id: 'jungle', name: 'JUNGLE SAFARI',
      desc: 'Deep in the wild. Animal predators hunt you. Ride horses. Survive nature.',
      theme: '#44AA22', tags: ['NATURE', 'ANIMALS', 'MELEE'],
      previewGridSize: 14, previewBg: '#0a1808', previewRoad: 'rgba(139,105,20,0.55)',
      mapW: 40, mapH: 40, tileSize: 80, roadEvery: 6,
      roadColor: '#5a3d1e', sidewalkColor: '#2a4a20',
      buildingPalette: ['#1a3010','#1e3814','#162808','#22380e','#183010','#1c3412','#14280a','#20341a'],
      neonColors: ['#44CC22','#88FF44','#FFCC44','#FF8822'],
      windowColors: ['#FFEE44','#FFD700','#FFAA22','#AEFF44'],
      lightColor: '#FFEE44', lightGlow: '#FFCC00', neonFreq: 10,
      weather: 'jungle_rain',
      jungle: true,
      botPalettes: {
        mini:    [{ body:'#3a2a08', accent:'#FFCC22' }, { body:'#2e2010', accent:'#FF8822' }],
        normal:  [{ body:'#c87820', accent:'#1a1a08' }, { body:'#8B4513', accent:'#FFD700' }, { body:'#5c3310', accent:'#FF8800' }],
        big:     [{ body:'#2a2010', accent:'#FFAA22' }, { body:'#1e1808', accent:'#CC8800' }],
        police:  [{ body:'#5a3210', accent:'#FF4400' }, { body:'#4a2808', accent:'#FF6622' }],
        swat:    [{ body:'#3a5a18', accent:'#88FF44' }],
        heavyswat: [{ body:'#1a0a00', accent:'#FF6600' }],
        sniper:  [{ body:'#2a3a10', accent:'#AAFFAA' }],
        bomber:  [{ body:'#6a4a10', accent:'#FF8800' }],
        juggernaut: [{ body:'#4a3010', accent:'#FFAA00' }],
      },
    },

    // ── Dino World ─────────────────────────────────────────
    {
      id: 'dino_world', name: 'DINO WORLD',
      desc: 'Primordial earth. Raptors hunt in the ferns, water dinos lurk in rivers. The Rex King rules all.',
      theme: '#66DD44',
      tags: ['DINOSAURS', 'PREHISTORIC', 'WATER'],
      previewGridSize: 14, previewBg: '#060e04', previewRoad: 'rgba(80,180,40,0.55)',
      mapW: 44, mapH: 44, tileSize: 80, roadEvery: 6,
      roadColor: '#4a7a28', sidewalkColor: '#2e5c1a',
      buildingPalette: ['#1a3410','#1e3c14','#162e0c','#223a10','#183214','#1c3812','#14280a','#203616'],
      neonColors: ['#66DD44','#88FF66','#AAFF44','#44CC22'],
      windowColors: ['#BBFF88','#CCFF88','#AAEE66','#99FF66'],
      lightColor: '#88FF66', lightGlow: '#66CC44', neonFreq: 10,
      weather: 'jungle_rain',
      dino: true,
      botPalettes: {
        mini:       [{ body:'#2a6618', accent:'#88FF44' }, { body:'#1e5510', accent:'#66DD22' }],
        normal:     [{ body:'#4a7a28', accent:'#AAFF44' }, { body:'#5a4a10', accent:'#FFCC44' }, { body:'#3a2a08', accent:'#DD9922' }],
        big:        [{ body:'#1a4a10', accent:'#66BB33' }, { body:'#2a5a18', accent:'#88CC44' }],
        police:     [{ body:'#6b3410', accent:'#FF8822' }, { body:'#5a2808', accent:'#FF6600' }],
        swat:       [{ body:'#222e08', accent:'#88AA44' }],
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
