/* ═══════════════════════════════════════════════════════════
   NEON CITY — Battle Pass Module (Combat Redesign)
   100 levels organized into 10 ranks × 10 levels each
   Aggressive combat-style visuals with unique shapes per rank
   ═══════════════════════════════════════════════════════════ */

const BattlePass = (() => {

  const XP_PER_LEVEL = 1000;
  const MAX_LEVEL    = 100;

  /* ── NEW TIER DEFINITIONS (10 ranks × 10 levels each) ── */
  const TIERS = [
    { name:'RECRUIT',   from:  1, to: 10,  shape:'hexagon',
      c1:'#0A0A0A', c2:'#3A3A3A', c3:'#6A6A6A', c4:'#9A9A9A',
      glow:'none', glowColor:'transparent' },
    { name:'SOLDIER',   from: 11, to: 20,  shape:'gear',
      c1:'#1A0800', c2:'#6B3A10', c3:'#B87020', c4:'#E8A050',
      glow:'rgba(184,112,32,0.7)', glowColor:'#B87020' },
    { name:'VETERAN',   from: 21, to: 30,  shape:'star',
      c1:'#101820', c2:'#506878', c3:'#A0C0D8', c4:'#E0F0FF',
      glow:'rgba(160,192,216,0.75)', glowColor:'#A0C0D8' },
    { name:'ELITE',     from: 31, to: 40,  shape:'shield',
      c1:'#1A0A00', c2:'#8A5A00', c3:'#E8A800', c4:'#FFE040',
      glow:'rgba(232,168,0,0.8)', glowColor:'#E8A800' },
    { name:'COMMANDO',  from: 41, to: 50,  shape:'armoredShield',
      c1:'#001030', c2:'#0050A0', c3:'#00B0FF', c4:'#40E0FF',
      glow:'rgba(0,180,255,0.95)', glowColor:'#00B0FF',
      accent:'#FFE000' },
    { name:'ASSASSIN',  from: 51, to: 60,  shape:'crystal',
      c1:'#100020', c2:'#5800A0', c3:'#A020F0', c4:'#E080FF',
      glow:'rgba(160,32,240,0.85)', glowColor:'#A020F0' },
    { name:'WARLORD',   from: 61, to: 70,  shape:'rubyStar',
      c1:'#200000', c2:'#800000', c3:'#E01010', c4:'#FF6060',
      glow:'rgba(224,16,16,0.85)', glowColor:'#E01010' },
    { name:'OVERLORD',  from: 71, to: 80,  shape:'diamond',
      c1:'#000820', c2:'#0040A0', c3:'#2080FF', c4:'#80C0FF',
      glow:'rgba(32,128,255,0.9)', glowColor:'#2080FF' },
    { name:'IMMORTAL',  from: 81, to: 90,  shape:'fireCrown',
      c1:'#200800', c2:'#A04000', c3:'#FF6000', c4:'#FFA040',
      glow:'rgba(255,96,0,0.9)', glowColor:'#FF6000' },
    { name:'CHAMPION',  from: 91, to:100,  shape:'champion',
      c1:'#101010', c2:'#606060', c3:'#FFFFFF', c4:'#FFFFFF',
      glow:'rgba(255,255,255,1.0)', glowColor:'#FFFFFF',
      rainbow: true },
  ];

  function getTier(level) {
    return TIERS.find(t => level >= t.from && level <= t.to) || TIERS[0];
  }

  /* ── Shared helpers ────────────────────────────────────── */

  function _n(lvl, color, cy = 30, sz) {
    const s = sz ?? (lvl < 10 ? 16 : lvl === 100 ? 11 : 13);
    return `<text x="30" y="${cy}" text-anchor="middle" dominant-baseline="middle"
      font-size="${s}" font-family="'Impact','Arial Black',sans-serif"
      font-weight="bold" fill="${color}" stroke="#000" stroke-width="0.5" letter-spacing="0">${lvl}</text>`;
  }

  function _poly(pairs, cx = 30, cy = 30) {
    return pairs.map(([a, r]) => {
      const rad = (a - 90) * Math.PI / 180;
      return `${(cx + r * Math.cos(rad)).toFixed(2)},${(cy + r * Math.sin(rad)).toFixed(2)}`;
    }).join(' ');
  }

  /* ── Simple glow filter ──────────────────────────────────── */
  function _glow(id, color, locked, intensity = 3) {
    if (locked || color === 'transparent') return '';
    return `<filter id="${id}f" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="0" stdDeviation="${intensity}" flood-color="${color}" flood-opacity="0.7"/>
    </filter>`;
  }

  /* ── Shine overlay with depth ────────────────────────────── */
  function _shine(id) {
    return `<radialGradient id="${id}sh" cx="30%" cy="20%" r="50%">
      <stop offset="0%"   stop-color="white" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${id}depth" cx="50%" cy="80%" r="50%">
      <stop offset="0%"   stop-color="black" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="black" stop-opacity="0"/>
    </radialGradient>`;
  }

  /* ── Simple texture patterns ────────────────────────────── */
  function _texture(id, type) {
    if (type === 'scratches') {
      return `<pattern id="${id}tex" width="8" height="8" patternUnits="userSpaceOnUse">
        <line x1="0" y1="2" x2="3" y2="0" stroke="rgba(0,0,0,0.1)" stroke-width="0.4"/>
        <line x1="5" y1="8" x2="8" y2="5" stroke="rgba(255,255,255,0.05)" stroke-width="0.3"/>
      </pattern>`;
    }
    return '';
  }

  /* ═══════════════════════════════════════════════════════════
     AGGRESSIVE COMBAT MEDAL SHAPES
     ═══════════════════════════════════════════════════════════ */

  const SHAPES = {

    /* RECRUIT (1-10) — Industrial metallic hexagon with depth */
    hexagon({ c1, c2, c3, c4 }, id, lvl, locked) {
      const pts = _poly([[0,24],[60,24],[120,24],[180,24],[240,24],[300,24]]);
      const innerPts = _poly([[0,18],[60,18],[120,18],[180,18],[240,18],[300,18]]);
      return `<defs>
        ${_shine(id)}
        <linearGradient id="${id}g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stop-color="${c4}"/>
          <stop offset="25%"  stop-color="${c3}"/>
          <stop offset="60%"  stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c1}"/>
        </linearGradient>
        <!-- Brushed metal effect -->
        <pattern id="${id}metal" width="4" height="4" patternUnits="userSpaceOnUse">
          <line x1="0" y1="2" x2="4" y2="2" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/>
        </pattern>
      </defs>
      <!-- Shadow for depth -->
      <polygon points="${pts}" fill="${c1}" opacity="0.4" transform="translate(1,2)"/>
      <!-- Main shape -->
      <polygon points="${pts}" fill="url(#${id}g)" stroke="${c3}" stroke-width="2.5"/>
      <!-- Metal texture -->
      <polygon points="${pts}" fill="url(#${id}metal)"/>
      <!-- Depth shadow -->
      <polygon points="${pts}" fill="url(#${id}depth)" opacity="0.5"/>
      <!-- Shine -->
      <polygon points="${pts}" fill="url(#${id}sh)" opacity="0.6"/>
      <!-- Inner border with bevel effect -->
      <polygon points="${innerPts}" fill="none" stroke="${c4}" stroke-width="1" stroke-opacity="0.5"/>
      <!-- Industrial bolt heads with 3D effect -->
      <circle cx="30" cy="6" r="2.5" fill="${c3}" stroke="${c2}" stroke-width="0.8"/>
      <circle cx="30" cy="6" r="1" fill="${c4}" opacity="0.8"/>
      <circle cx="30" cy="54" r="2.5" fill="${c3}" stroke="${c2}" stroke-width="0.8"/>
      <circle cx="30" cy="54" r="1" fill="${c4}" opacity="0.8"/>
      <circle cx="9" cy="18" r="2" fill="${c3}" stroke="${c2}" stroke-width="0.6"/>
      <circle cx="51" cy="18" r="2" fill="${c3}" stroke="${c2}" stroke-width="0.6"/>
      <circle cx="9" cy="42" r="2" fill="${c3}" stroke="${c2}" stroke-width="0.6"/>
      <circle cx="51" cy="42" r="2" fill="${c3}" stroke="${c2}" stroke-width="0.6"/>
      ${_n(lvl, c4)}`;
    },

    /* SOLDIER (11-20) — Bronze gear with polished metal finish */
    gear({ c1, c2, c3, c4 }, id, lvl, locked) {
      const teeth = 8;
      const outerR = 26, innerR = 19;
      let path = '';
      for (let i = 0; i < teeth; i++) {
        const a1 = (i * 360 / teeth - 90) * Math.PI / 180;
        const a2 = ((i + 0.3) * 360 / teeth - 90) * Math.PI / 180;
        const a3 = ((i + 0.7) * 360 / teeth - 90) * Math.PI / 180;
        const a4 = ((i + 1) * 360 / teeth - 90) * Math.PI / 180;
        const x1 = 30 + innerR * Math.cos(a1), y1 = 30 + innerR * Math.sin(a1);
        const x2 = 30 + outerR * Math.cos(a2), y2 = 30 + outerR * Math.sin(a2);
        const x3 = 30 + outerR * Math.cos(a3), y3 = 30 + outerR * Math.sin(a3);
        const x4 = 30 + innerR * Math.cos(a4), y4 = 30 + innerR * Math.sin(a4);
        path += `${i === 0 ? 'M' : 'L'}${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} L${x3.toFixed(1)},${y3.toFixed(1)} L${x4.toFixed(1)},${y4.toFixed(1)} `;
      }
      path += 'Z';
      const filt = locked ? '' : `filter="url(#${id}f)"`;
      return `<defs>
        ${_glow(id, c3, locked, 4)}
        ${_shine(id)}
        <linearGradient id="${id}g" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%"   stop-color="${c4}"/>
          <stop offset="30%"  stop-color="${c3}"/>
          <stop offset="70%"  stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c1}"/>
        </linearGradient>
        <!-- Bronze patina effect -->
        <radialGradient id="${id}patina" cx="40%" cy="35%" r="60%">
          <stop offset="0%"   stop-color="${c4}" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <!-- Shadow for 3D effect -->
      <path d="${path}" fill="${c1}" opacity="0.4" transform="translate(1,2)"/>
      <!-- Main gear -->
      <path d="${path}" fill="url(#${id}g)" stroke="${c3}" stroke-width="2" ${filt}/>
      <!-- Bronze patina -->
      <path d="${path}" fill="url(#${id}patina)"/>
      <!-- Depth -->
      <path d="${path}" fill="url(#${id}depth)" opacity="0.4"/>
      <!-- Shine -->
      <path d="${path}" fill="url(#${id}sh)" opacity="0.65"/>
      <!-- Inner hub with layered depth -->
      <circle cx="30" cy="30" r="13" fill="${c1}" stroke="${c4}" stroke-width="2"/>
      <circle cx="30" cy="30" r="10" fill="none" stroke="${c2}" stroke-width="0.5" opacity="0.5"/>
      <!-- Center hole with 3D bevel -->
      <circle cx="30" cy="30" r="6" fill="${c1}" stroke="${c3}" stroke-width="2"/>
      <circle cx="30" cy="30" r="4" fill="none" stroke="${c4}" stroke-width="0.8" opacity="0.6"/>
      <!-- Highlight reflection -->
      <ellipse cx="26" cy="26" rx="3" ry="2" fill="white" opacity="0.15"/>
      ${_n(lvl, c4)}`;
    },

    /* VETERAN (21-30) — Polished silver 8-pointed star with frost effect */
    star({ c1, c2, c3, c4 }, id, lvl, locked) {
      const pts = _poly(Array.from({ length: 16 }, (_, i) => [i * 22.5, i % 2 === 0 ? 27 : 11]));
      const filt = locked ? '' : `filter="url(#${id}f)"`;
      return `<defs>
        ${_glow(id, c4, locked, 4)}
        ${_shine(id)}
        <linearGradient id="${id}g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stop-color="${c4}"/>
          <stop offset="20%"  stop-color="${c3}"/>
          <stop offset="50%"  stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c1}"/>
        </linearGradient>
        <!-- Frost shimmer -->
        <radialGradient id="${id}frost" cx="35%" cy="30%" r="50%">
          <stop offset="0%"   stop-color="#FFFFFF" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="${c3}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <!-- Shadow -->
      <polygon points="${pts}" fill="${c1}" opacity="0.35" transform="translate(1,2)"/>
      <!-- Main star -->
      <polygon points="${pts}" fill="url(#${id}g)" stroke="${c3}" stroke-width="2" stroke-linejoin="bevel" ${filt}/>
      <!-- Frost shimmer overlay -->
      <polygon points="${pts}" fill="url(#${id}frost)"/>
      <!-- Depth shadow -->
      <polygon points="${pts}" fill="url(#${id}depth)" opacity="0.4"/>
      <!-- Shine highlight -->
      <polygon points="${pts}" fill="url(#${id}sh)" opacity="0.7"/>
      <!-- Center emblem -->
      <circle cx="30" cy="30" r="9" fill="${c1}" stroke="${c4}" stroke-width="1.5"/>
      <circle cx="30" cy="30" r="6" fill="none" stroke="${c3}" stroke-width="0.5" opacity="0.5"/>
      <!-- Service stripes in center -->
      <rect x="26" y="27" width="8" height="2" rx="0.5" fill="${c4}" opacity="0.8"/>
      <rect x="26" y="31" width="8" height="2" rx="0.5" fill="${c4}" opacity="0.6"/>
      <!-- Sharp point highlights -->
      <line x1="30" y1="3" x2="30" y2="11" stroke="${c4}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
      <line x1="57" y1="30" x2="49" y2="30" stroke="${c4}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
      <line x1="3" y1="30" x2="11" y2="30" stroke="${c4}" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
      <line x1="30" y1="57" x2="30" y2="49" stroke="${c4}" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
      ${_n(lvl, c4)}`;
    },

    /* ELITE (31-40) — Polished gold shield with eagle wings */
    shield({ c1, c2, c3, c4 }, id, lvl, locked) {
      const filt = locked ? '' : `filter="url(#${id}f)"`;
      return `<defs>
        ${_glow(id, c3, locked, 4)}
        ${_shine(id)}
        <linearGradient id="${id}g" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%"   stop-color="${c4}"/>
          <stop offset="20%"  stop-color="${c3}"/>
          <stop offset="50%"  stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c1}"/>
        </linearGradient>
        <linearGradient id="${id}inner" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%"   stop-color="${c4}"/>
          <stop offset="100%" stop-color="${c2}"/>
        </linearGradient>
      </defs>
      <!-- Main shield body -->
      <path d="M30,1 L57,7 L57,30 Q57,54 30,59 Q3,54 3,30 L3,7 Z"
            fill="url(#${id}g)" stroke="${c3}" stroke-width="2.5" stroke-linejoin="round" ${filt}/>
      <path d="M30,1 L57,7 L57,30 Q57,54 30,59 Q3,54 3,30 L3,7 Z" fill="url(#${id}sh)"/>
      <!-- Layered inner borders -->
      <path d="M30,6 L52,11 L52,30 Q52,50 30,54 Q8,50 8,30 L8,11 Z"
            fill="none" stroke="${c4}" stroke-width="1.5" stroke-opacity="0.6"/>
      <path d="M30,10 L48,14 L48,30 Q48,46 30,50 Q12,46 12,30 L12,14 Z"
            fill="none" stroke="${c3}" stroke-width="0.8" stroke-opacity="0.4"/>
      <!-- Eagle wing emblem -->
      <path d="M30,18 L22,26 L14,22 L18,30 L14,38 L22,34 L30,42 L38,34 L46,38 L42,30 L46,22 L38,26 Z"
            fill="url(#${id}inner)" stroke="${c4}" stroke-width="0.8"/>
      <!-- Central gem -->
      <circle cx="30" cy="30" r="5" fill="${c1}" stroke="${c4}" stroke-width="1.5"/>
      <circle cx="30" cy="30" r="2" fill="${c4}" opacity="0.9"/>
      <!-- Top crown accent -->
      <path d="M24,6 L30,2 L36,6" fill="none" stroke="${c4}" stroke-width="1.5" stroke-linecap="round"/>
      ${_n(lvl, c4, 30, 10)}`;
    },

    /* COMMANDO (41-50) — Heavy tactical armored shield */
    armoredShield({ c1, c2, c3, c4 }, id, lvl, locked, tier) {
      const accent = tier?.accent || '#FFE000';
      const filt = locked ? '' : `filter="url(#${id}f)"`;
      return `<defs>
        ${_glow(id, c3, locked, 5)}
        ${_shine(id)}
        <linearGradient id="${id}g" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%"   stop-color="${c4}"/>
          <stop offset="25%"  stop-color="${c3}"/>
          <stop offset="60%"  stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c1}"/>
        </linearGradient>
        <linearGradient id="${id}acc" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stop-color="${accent}"/>
          <stop offset="50%"  stop-color="#FFB000"/>
          <stop offset="100%" stop-color="#CC8800"/>
        </linearGradient>
        <linearGradient id="${id}steel" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%"   stop-color="${c4}"/>
          <stop offset="50%"  stop-color="${c3}"/>
          <stop offset="100%" stop-color="${c2}"/>
        </linearGradient>
      </defs>
      <!-- Outer armored frame -->
      <path d="M30,0 L58,6 L58,34 Q58,56 30,60 Q2,56 2,34 L2,6 Z"
            fill="url(#${id}g)" stroke="${c3}" stroke-width="3" stroke-linejoin="round" ${filt}/>
      <path d="M30,0 L58,6 L58,34 Q58,56 30,60 Q2,56 2,34 L2,6 Z" fill="url(#${id}sh)"/>
      <!-- Reinforced inner border -->
      <path d="M30,4 L54,9 L54,33 Q54,52 30,56 Q6,52 6,33 L6,9 Z"
            fill="none" stroke="${accent}" stroke-width="2" stroke-opacity="0.9"/>
      <!-- Armored horizontal plates -->
      <rect x="10" y="12" width="40" height="5" rx="1.5" fill="url(#${id}steel)" stroke="${accent}" stroke-width="0.8"/>
      <rect x="10" y="43" width="40" height="5" rx="1.5" fill="url(#${id}steel)" stroke="${accent}" stroke-width="0.8"/>
      <!-- Side rivets -->
      <circle cx="8" cy="20" r="2" fill="${accent}" stroke="${c1}" stroke-width="0.5"/>
      <circle cx="52" cy="20" r="2" fill="${accent}" stroke="${c1}" stroke-width="0.5"/>
      <circle cx="8" cy="36" r="2" fill="${accent}" stroke="${c1}" stroke-width="0.5"/>
      <circle cx="52" cy="36" r="2" fill="${accent}" stroke="${c1}" stroke-width="0.5"/>
      <!-- Central tactical emblem - target reticle -->
      <circle cx="30" cy="28" r="10" fill="${c1}" stroke="${c4}" stroke-width="1.5"/>
      <circle cx="30" cy="28" r="6" fill="none" stroke="${accent}" stroke-width="1.5"/>
      <circle cx="30" cy="28" r="2.5" fill="${accent}"/>
      <line x1="30" y1="18" x2="30" y2="22" stroke="${accent}" stroke-width="1.5"/>
      <line x1="30" y1="34" x2="30" y2="38" stroke="${accent}" stroke-width="1.5"/>
      <line x1="20" y1="28" x2="24" y2="28" stroke="${accent}" stroke-width="1.5"/>
      <line x1="36" y1="28" x2="40" y2="28" stroke="${accent}" stroke-width="1.5"/>
      ${_n(lvl, '#FFFFFF', 28, 9)}`;
    },

    /* ASSASSIN (51-60) — Dark crystal, sharp and deadly */
    crystal({ c1, c2, c3, c4 }, id, lvl, locked) {
      const filt = locked ? '' : `filter="url(#${id}f)"`;
      return `<defs>
        ${_glow(id, c3, locked, 4)}
        ${_shine(id)}
        <linearGradient id="${id}g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stop-color="${c4}"/>
          <stop offset="45%"  stop-color="${c3}"/>
          <stop offset="100%" stop-color="${c1}"/>
        </linearGradient>
      </defs>
      <!-- Main crystal body -->
      <polygon points="30,2 50,18 50,42 30,58 10,42 10,18"
               fill="url(#${id}g1)" stroke="${c3}" stroke-width="2" ${filt}/>
      <!-- Depth -->
      <polygon points="30,2 50,18 50,42 30,58 10,42 10,18" fill="url(#${id}depth)" opacity="0.5"/>
      <!-- Crystal facets -->
      <polygon points="30,2 30,30 10,18" fill="${c4}" opacity="0.3"/>
      <polygon points="30,2 30,30 50,18" fill="${c2}" opacity="0.4"/>
      <polygon points="30,58 30,30 10,42" fill="${c1}" opacity="0.5"/>
      <polygon points="30,58 30,30 50,42" fill="${c2}" opacity="0.3"/>
      <!-- Edge lines -->
      <line x1="30" y1="2" x2="30" y2="58" stroke="${c4}" stroke-width="0.8" opacity="0.5"/>
      <!-- Shine -->
      <polygon points="30,2 50,18 50,42 30,58 10,42 10,18" fill="url(#${id}sh)" opacity="0.6"/>
      <!-- Highlight -->
      <line x1="27" y1="5" x2="22" y2="14" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
      ${_n(lvl, c4)}`;
    },

    /* WARLORD (61-70) — Combat ruby star */
    rubyStar({ c1, c2, c3, c4 }, id, lvl, locked) {
      const pts = _poly(Array.from({ length: 12 }, (_, i) => [i * 30, i % 2 === 0 ? 27 : 14]));
      const filt = locked ? '' : `filter="url(#${id}f)"`;
      return `<defs>
        ${_glow(id, c3, locked, 4)}
        ${_shine(id)}
        <radialGradient id="${id}g" cx="40%" cy="35%" r="65%">
          <stop offset="0%"   stop-color="${c4}"/>
          <stop offset="40%"  stop-color="${c3}"/>
          <stop offset="100%" stop-color="${c1}"/>
        </radialGradient>
      </defs>
      <!-- 6-pointed combat star -->
      <polygon points="${pts}" fill="url(#${id}g)" stroke="${c3}" stroke-width="2"
               stroke-linejoin="round" ${filt}/>
      <!-- Depth -->
      <polygon points="${pts}" fill="url(#${id}depth)" opacity="0.4"/>
      <!-- Shine -->
      <polygon points="${pts}" fill="url(#${id}sh)" opacity="0.5"/>
      <!-- Inner emblem circle -->
      <circle cx="30" cy="30" r="11" fill="${c1}" stroke="${c4}" stroke-width="1.5"/>
      <!-- Skull icon -->
      <ellipse cx="30" cy="28" rx="6" ry="5" fill="${c4}" opacity="0.9"/>
      <ellipse cx="27" cy="27" rx="1.5" ry="2" fill="${c1}"/>
      <ellipse cx="33" cy="27" rx="1.5" ry="2" fill="${c1}"/>
      <rect x="27" y="32" width="6" height="3" rx="1" fill="${c4}" opacity="0.7"/>
      <!-- Crossed swords -->
      <line x1="14" y1="14" x2="46" y2="46" stroke="${c4}" stroke-width="1.5" opacity="0.4"/>
      <line x1="46" y1="14" x2="14" y2="46" stroke="${c4}" stroke-width="1.5" opacity="0.4"/>
      ${_n(lvl, c4, 30, 10)}`;
    },

    /* OVERLORD (71-80) — Tech diamond, clean and powerful */
    diamond({ c1, c2, c3, c4 }, id, lvl, locked) {
      const filt = locked ? '' : `filter="url(#${id}f)"`;
      return `<defs>
        ${_glow(id, c3, locked, 4)}
        ${_shine(id)}
        <linearGradient id="${id}g" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%"   stop-color="${c4}"/>
          <stop offset="35%"  stop-color="${c3}"/>
          <stop offset="70%"  stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c1}"/>
        </linearGradient>
      </defs>
      <!-- Main diamond -->
      <polygon points="30,2 56,30 30,58 4,30" fill="url(#${id}g)"
               stroke="${c3}" stroke-width="2" ${filt}/>
      <!-- Depth -->
      <polygon points="30,2 56,30 30,58 4,30" fill="url(#${id}depth)" opacity="0.4"/>
      <!-- Shine -->
      <polygon points="30,2 56,30 30,58 4,30" fill="url(#${id}sh)" opacity="0.6"/>
      <!-- Facet lines -->
      <line x1="30" y1="2" x2="30" y2="58" stroke="${c4}" stroke-width="0.8" opacity="0.4"/>
      <line x1="4" y1="30" x2="56" y2="30" stroke="${c4}" stroke-width="0.8" opacity="0.4"/>
      <!-- Inner diamond -->
      <polygon points="30,14 44,30 30,46 16,30" fill="none" stroke="${c4}"
               stroke-width="1" opacity="0.5"/>
      <!-- Central emblem -->
      <circle cx="30" cy="30" r="8" fill="${c1}" stroke="${c4}" stroke-width="1.5"/>
      <!-- Crown symbol -->
      <path d="M24,32 L24,28 L27,30 L30,26 L33,30 L36,28 L36,32 Z"
            fill="${c4}" opacity="0.85"/>
      ${_n(lvl, c4, 30, 10)}`;
    },

    /* IMMORTAL (81-90) — Dark flame crown, serious and powerful */
    fireCrown({ c1, c2, c3, c4 }, id, lvl, locked) {
      const filt = locked ? '' : `filter="url(#${id}f)"`;
      return `<defs>
        ${_glow(id, '#CC4400', locked, 4)}
        ${_shine(id)}
        <linearGradient id="${id}g" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%"   stop-color="#DD6600"/>
          <stop offset="35%"  stop-color="#AA3300"/>
          <stop offset="70%"  stop-color="#661100"/>
          <stop offset="100%" stop-color="#330800"/>
        </linearGradient>
        <linearGradient id="${id}flame" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%"   stop-color="#882200"/>
          <stop offset="40%"  stop-color="#CC4400"/>
          <stop offset="80%"  stop-color="#FF6600"/>
          <stop offset="100%" stop-color="#FFAA44"/>
        </linearGradient>
      </defs>
      <!-- Crown body - sharp angles -->
      <path d="M4,52 L4,22 L13,32 L22,10 L30,24 L38,10 L47,32 L56,22 L56,52 Z"
            fill="url(#${id}g)" stroke="#CC4400" stroke-width="2" stroke-linejoin="miter" ${filt}/>
      <!-- Inner depth -->
      <path d="M4,52 L4,22 L13,32 L22,10 L30,24 L38,10 L47,32 L56,22 L56,52 Z" fill="url(#${id}depth)" opacity="0.5"/>
      <!-- Flame accents on peaks - static, no animation -->
      <path d="M22,10 L22,4 L24,8 L22,10 Z" fill="url(#${id}flame)" opacity="0.9"/>
      <path d="M30,24 L30,18 L32,22 L30,24 Z" fill="url(#${id}flame)" opacity="0.85"/>
      <path d="M38,10 L38,4 L36,8 L38,10 Z" fill="url(#${id}flame)" opacity="0.9"/>
      <!-- Crown band -->
      <rect x="4" y="52" width="52" height="6" rx="1" fill="#441100" stroke="#AA4400" stroke-width="1.5"/>
      <!-- Embedded gems - dark ruby style -->
      <circle cx="22" cy="20" r="4" fill="#440000" stroke="#AA3300" stroke-width="1.5"/>
      <circle cx="22" cy="20" r="1.5" fill="#FF4400" opacity="0.8"/>
      <circle cx="38" cy="20" r="4" fill="#440000" stroke="#AA3300" stroke-width="1.5"/>
      <circle cx="38" cy="20" r="1.5" fill="#FF4400" opacity="0.8"/>
      <circle cx="30" cy="32" r="5" fill="#440000" stroke="#CC4400" stroke-width="1.5"/>
      <circle cx="30" cy="32" r="2" fill="#FF6600" opacity="0.9"/>
      ${_n(lvl, '#FFAA66', 55, 10)}`;
    },

    /* CHAMPION (91-100) — Premium elite crown, intimidating and powerful */
    champion({ c1, c2, c3, c4 }, id, lvl, locked, tier) {
      const isLvl100 = lvl === 100;
      const filt = locked ? '' : `filter="url(#${id}f)"`;
      return `<defs>
        ${_glow(id, '#D4A020', locked, 5)}
        ${_shine(id)}
        <!-- Premium gold/platinum gradient -->
        <linearGradient id="${id}g" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%"   stop-color="${isLvl100 ? '#FFFFFF' : '#FFE8B0'}"/>
          <stop offset="20%"  stop-color="${isLvl100 ? '#F0E8D0' : '#E8C060'}"/>
          <stop offset="45%"  stop-color="#D4A020"/>
          <stop offset="70%"  stop-color="#A07010"/>
          <stop offset="100%" stop-color="#604008"/>
        </linearGradient>
        <!-- Diamond gem gradient -->
        <radialGradient id="${id}gem" cx="35%" cy="30%" r="65%">
          <stop offset="0%"   stop-color="#FFFFFF"/>
          <stop offset="40%"  stop-color="${isLvl100 ? '#E8E8FF' : '#C0D8E8'}"/>
          <stop offset="100%" stop-color="${isLvl100 ? '#8888CC' : '#4080A0'}"/>
        </radialGradient>
      </defs>

      <!-- Crown body - sharp, regal -->
      <path d="M2,52 L2,18 L11,28 L20,6 L30,20 L40,6 L49,28 L58,18 L58,52 Z"
            fill="url(#${id}g)" stroke="${isLvl100 ? '#FFFFFF' : '#D4A020'}" stroke-width="${isLvl100 ? 2.5 : 2}"
            stroke-linejoin="miter" ${filt}/>
      <!-- Depth -->
      <path d="M2,52 L2,18 L11,28 L20,6 L30,20 L40,6 L49,28 L58,18 L58,52 Z" fill="url(#${id}depth)" opacity="0.4"/>
      <!-- Shine -->
      <path d="M2,52 L2,18 L11,28 L20,6 L30,20 L40,6 L49,28 L58,18 L58,52 Z" fill="url(#${id}sh)" opacity="0.5"/>

      <!-- Crown band - solid, premium -->
      <rect x="2" y="52" width="56" height="6" rx="1" fill="#806020" stroke="${isLvl100 ? '#E8D080' : '#A08030'}" stroke-width="1.5"/>

      <!-- Band jewels -->
      <circle cx="15" cy="55" r="2.5" fill="url(#${id}gem)" stroke="#FFFFFF" stroke-width="0.8"/>
      <circle cx="30" cy="55" r="3" fill="url(#${id}gem)" stroke="#FFFFFF" stroke-width="0.8"/>
      <circle cx="45" cy="55" r="2.5" fill="url(#${id}gem)" stroke="#FFFFFF" stroke-width="0.8"/>

      <!-- Peak gems - elegant diamonds -->
      <polygon points="20,6 24,14 20,22 16,14" fill="url(#${id}gem)" stroke="#FFFFFF" stroke-width="1"/>
      <polygon points="40,6 44,14 40,22 36,14" fill="url(#${id}gem)" stroke="#FFFFFF" stroke-width="1"/>

      <!-- Center crown jewel - the focal point -->
      <circle cx="30" cy="28" r="7" fill="#403020" stroke="#D4A020" stroke-width="2"/>
      <circle cx="30" cy="28" r="5" fill="url(#${id}gem)" stroke="#FFFFFF" stroke-width="1"/>
      <circle cx="30" cy="28" r="2" fill="#FFFFFF" opacity="0.95"/>

      ${isLvl100 ? `
      <!-- Level 100: subtle outer glow ring -->
      <circle cx="30" cy="30" r="28" fill="none" stroke="#FFE080" stroke-width="1.5" opacity="0.4"/>
      <circle cx="30" cy="30" r="26" fill="none" stroke="#FFFFFF" stroke-width="0.5" opacity="0.3"/>
      ` : ''}

      ${_n(lvl, isLvl100 ? '#FFFFFF' : '#FFE080', 55, 10)}`;
    },
  };

  /* ── Shape router ──────────────────────────────────────── */
  function medalSVG(level, tier, state) {
    const locked = state === 'locked';
    const colors = locked
      ? { c1:'#08080C', c2:'#181820', c3:'#282838', c4:'#404058' }
      : { c1: tier.c1, c2: tier.c2, c3: tier.c3, c4: tier.c4 };
    const id = `m${level}`;
    const shapeFn = SHAPES[tier.shape];
    if (!shapeFn) return `<svg viewBox="0 0 60 60"><text x="30" y="30" text-anchor="middle" fill="#888">${level}</text></svg>`;
    const inner = shapeFn(colors, id, level, locked, tier);
    return `<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  }

  /* ── Session data ──────────────────────────────────────── */
  function loadBP() {
    try { return JSON.parse(localStorage.getItem('nc_bp')) || { level: 1, xp: 0 }; }
    catch { return { level: 1, xp: 0 }; }
  }

  function saveBP(data) {
    localStorage.setItem('nc_bp', JSON.stringify(data));
  }

  /* ── Render 10x10 grid (100 levels) ─────────────────────── */
  function render(containerEl, bp) {
    const fragment = document.createDocumentFragment();

    for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
      const tier  = getTier(lvl);
      const state = lvl < bp.level   ? 'completed'
                  : lvl === bp.level ? 'current'
                  : 'locked';

      const card = document.createElement('div');
      card.className = `bp-level bp-level--${state}`;
      if (lvl === 100) card.classList.add('bp-level--champion');
      card.dataset.level = lvl;
      card.dataset.rank = tier.name.toLowerCase();

      // Set CSS custom properties for tier styling
      card.style.setProperty('--tier-color', tier.c3);
      card.style.setProperty('--tier-glow', tier.glow || 'transparent');

      // Extract RGB for more advanced effects
      const rgb = tier.c3.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
      if (rgb) {
        card.style.setProperty('--tier-rgb', `${parseInt(rgb[1],16)},${parseInt(rgb[2],16)},${parseInt(rgb[3],16)}`);
      }

      card.innerHTML = `
        <div class="bp-medal">${medalSVG(lvl, tier, state)}</div>
        <div class="bp-tier-label">${tier.name}</div>`;

      fragment.appendChild(card);
    }

    containerEl.innerHTML = '';
    containerEl.appendChild(fragment);
  }

  /* ── Mount — call once on profile page ─────────────────── */
  function mount(rootEl, bpData) {
    const hasLive = bpData && typeof bpData.level === 'number' && bpData.level >= 1;
    const bp = hasLive ? bpData : loadBP();

    const level      = bp.level;
    const xpDone     = bp.xpInCurrentLevel  ?? bp.xp ?? 0;
    const xpNeeded   = bp.xpNeededForNextLevel ?? XP_PER_LEVEL;
    const xpLeft     = Math.max(0, xpNeeded - xpDone);
    const pct        = level >= MAX_LEVEL
                         ? 100
                         : (bp.progressPercent ?? Math.min(100, (xpDone / xpNeeded) * 100));
    const tier       = getTier(level);
    const nextTier   = getTier(level + 1);

    rootEl.innerHTML = `
      <section class="bp-section">

        <div class="bp-header">
          <div class="bp-header-left">
            <h2 class="bp-title">COMBAT RANKS</h2>
            <span class="bp-season">SEASON 1 — WARFARE</span>
          </div>
          <div class="bp-level-badge">
            <div class="bp-lv-main">
              <span class="bp-lv-label">RANK</span>
              <span class="bp-lv-num">${level}</span>
              <span class="bp-lv-tier" style="color:${tier.c3};text-shadow:0 0 10px ${tier.glow || 'transparent'}">${tier.name}</span>
            </div>
            ${level < MAX_LEVEL
              ? `<span class="bp-lv-xpcap">${xpNeeded.toLocaleString()} XP for next rank</span>`
              : `<span class="bp-lv-xpcap" style="color:#FFD800;text-shadow:0 0 15px #FFA000">★ MAX RANK ★</span>`}
          </div>
        </div>

        <div class="bp-xp-wrap">
          <div class="bp-xp-row">

            <!-- Current level pill -->
            <div class="bp-xp-lv-pill">
              <span class="bp-xp-lv-num" style="color:${tier.c3}">${level}</span>
              <span class="bp-xp-lv-label">${tier.name}</span>
            </div>

            <!-- Bar + numbers -->
            <div class="bp-xp-center">
              <div class="bp-xp-nums">
                <span>${xpDone.toLocaleString()} / ${xpNeeded.toLocaleString()} XP</span>
                ${level < MAX_LEVEL
                  ? `<span class="bp-xp-togo">${xpLeft.toLocaleString()} XP to go</span>`
                  : `<span style="color:#FFD800">MAX RANK ACHIEVED</span>`}
              </div>
              <div class="bp-xp-track">
                <div class="bp-xp-fill" style="width:${pct}%;background:linear-gradient(90deg,${tier.c2},${tier.c3})"></div>
              </div>
            </div>

            <!-- Next level pill -->
            ${level < MAX_LEVEL ? `
            <div class="bp-xp-lv-pill bp-xp-lv-pill--next">
              <span class="bp-xp-lv-num" style="color:${nextTier.c3}">${level + 1}</span>
              <span class="bp-xp-lv-label">${nextTier.name}</span>
            </div>` : ''}

          </div>
        </div>

        <!-- 10x10 Grid Container -->
        <div class="bp-grid-container">
          <div class="bp-rank-labels">
            <div class="bp-rank-row" style="--rank-dot-color:#6A6A6A"><span style="color:#9A9A9A">RECRUIT</span><span>1-10</span></div>
            <div class="bp-rank-row" style="--rank-dot-color:#B87020"><span style="color:#E8A050;text-shadow:0 0 6px rgba(184,112,32,0.5)">SOLDIER</span><span>11-20</span></div>
            <div class="bp-rank-row" style="--rank-dot-color:#A0C0D8"><span style="color:#E0F0FF;text-shadow:0 0 6px rgba(160,192,216,0.5)">VETERAN</span><span>21-30</span></div>
            <div class="bp-rank-row" style="--rank-dot-color:#E8A800"><span style="color:#FFE040;text-shadow:0 0 8px rgba(232,168,0,0.6)">ELITE</span><span>31-40</span></div>
            <div class="bp-rank-row" style="--rank-dot-color:#00B0FF"><span style="color:#40E0FF;text-shadow:0 0 10px rgba(0,176,255,0.7)">COMMANDO</span><span>41-50</span></div>
            <div class="bp-rank-row" style="--rank-dot-color:#A020F0"><span style="color:#E080FF;text-shadow:0 0 10px rgba(160,32,240,0.6)">ASSASSIN</span><span>51-60</span></div>
            <div class="bp-rank-row" style="--rank-dot-color:#E01010"><span style="color:#FF6060;text-shadow:0 0 10px rgba(224,16,16,0.6)">WARLORD</span><span>61-70</span></div>
            <div class="bp-rank-row" style="--rank-dot-color:#2080FF"><span style="color:#80C0FF;text-shadow:0 0 10px rgba(32,128,255,0.6)">OVERLORD</span><span>71-80</span></div>
            <div class="bp-rank-row" style="--rank-dot-color:#FF6000"><span style="color:#FFA040;text-shadow:0 0 12px rgba(255,96,0,0.7)">IMMORTAL</span><span>81-90</span></div>
            <div class="bp-rank-row" style="--rank-dot-color:#FFD700"><span style="color:#FFFFFF;text-shadow:0 0 15px #FFD700, 0 0 25px #FF6464">CHAMPION</span><span>91-100</span></div>
          </div>
          <div class="bp-grid" id="bpGrid"></div>
        </div>

      </section>`;

    render(document.getElementById('bpGrid'), bp);
  }

  return { mount, loadBP, saveBP, getTier, MAX_LEVEL, XP_PER_LEVEL };
})();
