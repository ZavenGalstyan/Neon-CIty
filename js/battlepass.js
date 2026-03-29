/* ═══════════════════════════════════════════════════════════
   NEON CITY — Battle Pass Module
   100 levels, 9 unique tiered medal SVGs, XP progression.
   Data: localStorage 'nc_bp' → swap load/save for API later.
   ═══════════════════════════════════════════════════════════ */

const BattlePass = (() => {

  const XP_PER_LEVEL = 1000;
  const MAX_LEVEL    = 100;

  /* ── Tier definitions  (c1=shadow · c2=mid · c3=bright · c4=highlight) ── */
  const TIERS = [
    { name:'IRON',     from:  1, to: 10,
      c1:'#10202E', c2:'#506070', c3:'#90AABF', c4:'#C8DCF0',
      glow:'rgba(144,170,191,0.75)' },
    { name:'BRONZE',   from: 11, to: 20,
      c1:'#1E0800', c2:'#7B3A10', c3:'#C87828', c4:'#F0B060',
      glow:'rgba(200,120,40,0.8)'  },
    { name:'SILVER',   from: 21, to: 35,
      c1:'#1C2430', c2:'#6A7C90', c3:'#C0D4E8', c4:'#F0F8FF',
      glow:'rgba(192,212,232,0.8)' },
    { name:'GOLD',     from: 36, to: 50,
      c1:'#1C0A00', c2:'#784800', c3:'#E89600', c4:'#FFE050',
      glow:'rgba(255,180,0,0.9)'   },
    { name:'PLATINUM', from: 51, to: 65,
      c1:'#001018', c2:'#005868', c3:'#00C0DC', c4:'#80F8FF',
      glow:'rgba(0,200,220,0.9)'   },
    { name:'DIAMOND',  from: 66, to: 80,
      c1:'#040418', c2:'#0C2890', c3:'#2A78FF', c4:'#B8D8FF',
      glow:'rgba(42,120,255,0.85)' },
    { name:'MASTER',   from: 81, to: 90,
      c1:'#0A0020', c2:'#4800B0', c3:'#9A38F8', c4:'#ECA8FF',
      glow:'rgba(154,56,248,0.9)'  },
    { name:'LEGEND',   from: 91, to: 99,
      c1:'#140000', c2:'#780000', c3:'#F03800', c4:'#FFB800',
      glow:'rgba(255,80,0,0.9)'    },
    { name:'CHAMPION', from:100, to:100,
      c1:'#100400', c2:'#804000', c3:'#F8C800', c4:'#FFFAC0',
      glow:'rgba(255,210,0,1.0)'   },
  ];

  function getTier(level) {
    return TIERS.find(t => level >= t.from && level <= t.to) || TIERS[0];
  }

  /* ── Shared helpers ────────────────────────────────────── */

  /* Centered level number. sz = font size, cy = vertical center */
  function _n(lvl, color, cy = 30, sz) {
    const s = sz ?? (lvl < 10 ? 15 : lvl === 100 ? 10 : 12);
    return `<text x="30" y="${cy}" text-anchor="middle" dominant-baseline="middle"
      font-size="${s}" font-family="'Courier New',Courier,monospace"
      font-weight="bold" fill="${color}" letter-spacing="-0.5">${lvl}</text>`;
  }

  /* Polygon from array of [angle_deg, radius] pairs, center 30,30 */
  function _poly(pairs, cx = 30, cy = 30) {
    return pairs.map(([a, r]) => {
      const rad = (a - 90) * Math.PI / 180;
      return `${(cx + r * Math.cos(rad)).toFixed(2)},${(cy + r * Math.sin(rad)).toFixed(2)}`;
    }).join(' ');
  }

  /* ── Medal SVG shapes ──────────────────────────────────── */
  /*
   * Each function receives ({ c1,c2,c3,c4 }, id, lvl, locked):
   *   c1 = deep shadow · c2 = mid tone · c3 = bright · c4 = highlight
   *   id = unique gradient/filter prefix · locked = grey out flag
   */

  /* Shared: glow drop-shadow filter (skip when locked) */
  function _glow(id, color, locked) {
    if (locked) return '';
    return `<filter id="${id}f" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="0" stdDeviation="2.8" flood-color="${color}" flood-opacity="0.9"/>
    </filter>`;
  }

  /* Shared: top-left shine overlay (radial gradient fading to transparent) */
  function _shine(id) {
    return `<radialGradient id="${id}sh" cx="28%" cy="22%" r="55%">
      <stop offset="0%"   stop-color="white" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>`;
  }

  const SHAPES = {

    /* IRON — Industrial hexagonal steel plate */
    iron({ c1, c2, c3, c4 }, id, lvl, locked) {
      const outerPts = _poly([[0,26],[60,26],[120,26],[180,26],[240,26],[300,26]]);
      const innerPts = _poly([[30,17],[90,17],[150,17],[210,17],[270,17],[330,17]]);
      const dots = [[0,26],[60,26],[120,26],[180,26],[240,26],[300,26]].map(([a, r]) => {
        const rad = (a - 90) * Math.PI / 180;
        return `<circle cx="${(30+r*Math.cos(rad)).toFixed(2)}" cy="${(30+r*Math.sin(rad)).toFixed(2)}"
                  r="2.5" fill="${c4}" stroke="${c2}" stroke-width="0.8"/>`;
      }).join('');
      const filt = locked ? '' : `filter="url(#${id}f)"`;
      return `<defs>
        ${_glow(id, c3, locked)}
        ${_shine(id)}
        <linearGradient id="${id}g" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%"   stop-color="${c4}" stop-opacity="0.5"/>
          <stop offset="40%"  stop-color="${c3}" stop-opacity="0.6"/>
          <stop offset="75%"  stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c1}"/>
        </linearGradient>
      </defs>
      <polygon points="${outerPts}" fill="url(#${id}g)" stroke="${c3}" stroke-width="2" ${filt}/>
      <polygon points="${outerPts}" fill="url(#${id}sh)"/>
      <polygon points="${innerPts}" fill="none" stroke="${c4}" stroke-width="0.9" stroke-opacity="0.5"/>
      ${dots}
      ${_n(lvl, c4)}`;
    },

    /* BRONZE — Classic medal with segmented ring */
    bronze({ c1, c2, c3, c4 }, id, lvl, locked) {
      const segs = Array.from({ length: 12 }, (_, i) => {
        const a1 = (i * 30 - 8) * Math.PI / 180;
        const a2 = (i * 30 + 8) * Math.PI / 180;
        const [r1, r2] = [27, 21];
        const x1=(30+r1*Math.cos(a1)).toFixed(2), y1=(30+r1*Math.sin(a1)).toFixed(2);
        const x2=(30+r1*Math.cos(a2)).toFixed(2), y2=(30+r1*Math.sin(a2)).toFixed(2);
        const x3=(30+r2*Math.cos(a2)).toFixed(2), y3=(30+r2*Math.sin(a2)).toFixed(2);
        const x4=(30+r2*Math.cos(a1)).toFixed(2), y4=(30+r2*Math.sin(a1)).toFixed(2);
        const even = i % 2 === 0;
        return `<path d="M${x1},${y1} A${r1},${r1} 0 0,1 ${x2},${y2} L${x3},${y3} A${r2},${r2} 0 0,0 ${x4},${y4} Z"
                  fill="${even ? c4 : c3}" opacity="${even ? 0.9 : 0.6}"/>`;
      }).join('');
      const filt = locked ? '' : `filter="url(#${id}f)"`;
      return `<defs>
        ${_glow(id, c3, locked)}
        ${_shine(id)}
        <radialGradient id="${id}g" cx="40%" cy="34%" r="65%">
          <stop offset="0%"   stop-color="${c4}"/>
          <stop offset="40%"  stop-color="${c3}"/>
          <stop offset="100%" stop-color="${c1}"/>
        </radialGradient>
      </defs>
      ${segs}
      <circle cx="30" cy="30" r="19" fill="url(#${id}g)" stroke="${c3}" stroke-width="1.8" ${filt}/>
      <circle cx="30" cy="30" r="19" fill="url(#${id}sh)"/>
      <circle cx="30" cy="30" r="13" fill="none" stroke="${c4}" stroke-width="1" stroke-opacity="0.45"/>
      ${_n(lvl, c4)}`;
    },

    /* SILVER — Sharp 8-pointed metallic star */
    silver({ c1, c2, c3, c4 }, id, lvl, locked) {
      const pts = _poly(Array.from({ length: 16 }, (_, i) => [i * 22.5, i % 2 === 0 ? 26 : 12]));
      const filt = locked ? '' : `filter="url(#${id}f)"`;
      return `<defs>
        ${_glow(id, c4, locked)}
        ${_shine(id)}
        <linearGradient id="${id}g" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%"   stop-color="${c4}"/>
          <stop offset="35%"  stop-color="${c3}"/>
          <stop offset="70%"  stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c1}"/>
        </linearGradient>
        <radialGradient id="${id}ri" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="${c1}"/>
          <stop offset="100%" stop-color="${c2}"/>
        </radialGradient>
      </defs>
      <polygon points="${pts}" fill="url(#${id}g)" stroke="${c3}" stroke-width="1.4"
               stroke-linejoin="round" ${filt}/>
      <polygon points="${pts}" fill="url(#${id}sh)"/>
      <circle cx="30" cy="30" r="9" fill="url(#${id}ri)" stroke="${c4}" stroke-width="1" stroke-opacity="0.6"/>
      <line x1="37" y1="6" x2="33" y2="11" stroke="white" stroke-width="2"
            stroke-opacity="0.5" stroke-linecap="round"/>
      ${_n(lvl, c4)}`;
    },

    /* GOLD — Heraldic pointed shield */
    gold({ c1, c2, c3, c4 }, id, lvl, locked) {
      const filt = locked ? '' : `filter="url(#${id}f)"`;
      return `<defs>
        ${_glow(id, c3, locked)}
        ${_shine(id)}
        <linearGradient id="${id}g" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%"   stop-color="${c4}"/>
          <stop offset="30%"  stop-color="${c3}"/>
          <stop offset="70%"  stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c1}"/>
        </linearGradient>
        <linearGradient id="${id}b" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%"   stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c1}"/>
        </linearGradient>
      </defs>
      <path d="M30,4 L54,4 L54,34 Q54,52 30,58 Q6,52 6,34 L6,4 Z"
            fill="url(#${id}g)" stroke="${c3}" stroke-width="2" ${filt}/>
      <path d="M30,4 L54,4 L54,34 Q54,52 30,58 Q6,52 6,34 L6,4 Z"
            fill="url(#${id}sh)"/>
      <path d="M30,10 L48,10 L48,34 Q48,48 30,53 Q12,48 12,34 L12,10 Z"
            fill="none" stroke="${c4}" stroke-width="1" stroke-opacity="0.45"/>
      <path d="M6,4 Q30,14 54,4" fill="none" stroke="${c4}" stroke-width="1.5" stroke-opacity="0.6"/>
      <!-- Fleur-de-lis hint: 3 dots on inner border top -->
      <circle cx="30" cy="12" r="1.8" fill="${c4}" opacity="0.7"/>
      <circle cx="22" cy="15" r="1.3" fill="${c4}" opacity="0.5"/>
      <circle cx="38" cy="15" r="1.3" fill="${c4}" opacity="0.5"/>
      ${_n(lvl, c4, 34)}`;
    },

    /* PLATINUM — 5-pointed crystal star with facets + sparkles */
    platinum({ c1, c2, c3, c4 }, id, lvl, locked) {
      const pts = _poly(Array.from({ length: 10 }, (_, i) => [i * 36, i % 2 === 0 ? 27 : 11]));
      const facets = [36, 108, 180, 252, 324].map(a => {
        const rad = (a - 90) * Math.PI / 180;
        return `<line x1="30" y1="30" x2="${(30+11*Math.cos(rad)).toFixed(2)}"
                      y2="${(30+11*Math.sin(rad)).toFixed(2)}"
                      stroke="${c4}" stroke-width="0.8" stroke-opacity="0.55"/>`;
      }).join('');
      const sparkles = [0, 72, 144, 216, 288].map(a => {
        const rad = (a - 90) * Math.PI / 180, perp = rad + Math.PI / 2, d = 3;
        const cx = (30 + 27 * Math.cos(rad)).toFixed(2);
        const cy = (30 + 27 * Math.sin(rad)).toFixed(2);
        return `<line x1="${(+cx+d*Math.cos(rad)).toFixed(2)}" y1="${(+cy+d*Math.sin(rad)).toFixed(2)}"
                      x2="${(+cx-d*Math.cos(rad)).toFixed(2)}" y2="${(+cy-d*Math.sin(rad)).toFixed(2)}"
                      stroke="${c4}" stroke-width="1.4" stroke-linecap="round"/>
                <line x1="${(+cx+d*Math.cos(perp)).toFixed(2)}" y1="${(+cy+d*Math.sin(perp)).toFixed(2)}"
                      x2="${(+cx-d*Math.cos(perp)).toFixed(2)}" y2="${(+cy-d*Math.sin(perp)).toFixed(2)}"
                      stroke="${c4}" stroke-width="1.4" stroke-linecap="round"/>`;
      }).join('');
      const filt = locked ? '' : `filter="url(#${id}f)"`;
      return `<defs>
        ${_glow(id, c3, locked)}
        ${_shine(id)}
        <linearGradient id="${id}g" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%"   stop-color="${c4}"/>
          <stop offset="35%"  stop-color="${c3}"/>
          <stop offset="70%"  stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c1}"/>
        </linearGradient>
      </defs>
      <polygon points="${pts}" fill="url(#${id}g)" stroke="${c3}" stroke-width="1.5"
               stroke-linejoin="round" ${filt}/>
      <polygon points="${pts}" fill="url(#${id}sh)"/>
      ${facets}${sparkles}
      <circle cx="30" cy="30" r="8" fill="${c1}" stroke="${c4}" stroke-width="1" stroke-opacity="0.6"/>
      ${_n(lvl, c4)}`;
    },

    /* DIAMOND — Brilliant-cut octagon gem */
    diamond({ c1, c2, c3, c4 }, id, lvl, locked) {
      const oct   = _poly([[22.5,26],[67.5,26],[112.5,26],[157.5,26],[202.5,26],[247.5,26],[292.5,26],[337.5,26]]);
      const table = _poly([[0,14],[90,14],[180,14],[270,14]]);
      const octPts = [22.5,67.5,112.5,157.5,202.5,247.5,292.5,337.5].map(a => {
        const r = (a-90)*Math.PI/180;
        return [(30+26*Math.cos(r)).toFixed(2),(30+26*Math.sin(r)).toFixed(2)];
      });
      const tblPts = [0,90,180,270].map(a => {
        const r = (a-90)*Math.PI/180;
        return [(30+14*Math.cos(r)).toFixed(2),(30+14*Math.sin(r)).toFixed(2)];
      });
      const bezels = octPts.map((op,i) => {
        const t = tblPts[Math.floor(i/2)%4];
        return `<line x1="${op[0]}" y1="${op[1]}" x2="${t[0]}" y2="${t[1]}"
                      stroke="${c4}" stroke-width="0.7" stroke-opacity="0.5"/>`;
      }).join('');
      const filt = locked ? '' : `filter="url(#${id}f)"`;
      return `<defs>
        ${_glow(id, c3, locked)}
        ${_shine(id)}
        <linearGradient id="${id}ga" x1="10%" y1="5%" x2="90%" y2="95%">
          <stop offset="0%"   stop-color="${c4}"/>
          <stop offset="30%"  stop-color="${c3}"/>
          <stop offset="60%"  stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c1}"/>
        </linearGradient>
        <linearGradient id="${id}gb" x1="80%" y1="0%" x2="20%" y2="100%">
          <stop offset="0%"   stop-color="${c4}" stop-opacity="0.4"/>
          <stop offset="50%"  stop-color="${c3}" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="${c4}" stop-opacity="0.3"/>
        </linearGradient>
      </defs>
      <polygon points="${oct}" fill="url(#${id}ga)" stroke="${c3}" stroke-width="1.8" ${filt}/>
      <polygon points="${oct}" fill="url(#${id}gb)"/>
      <polygon points="${oct}" fill="url(#${id}sh)"/>
      ${bezels}
      <polygon points="${table}" fill="none" stroke="${c4}" stroke-width="1" stroke-opacity="0.55"/>
      <line x1="15" y1="8"  x2="12" y2="16" stroke="white" stroke-width="2.2"
            stroke-opacity="0.55" stroke-linecap="round"/>
      <line x1="19" y1="6"  x2="17" y2="10" stroke="white" stroke-width="1.2"
            stroke-opacity="0.35" stroke-linecap="round"/>
      ${_n(lvl, c4)}`;
    },

    /* MASTER — Three-peak crown with gems */
    master({ c1, c2, c3, c4 }, id, lvl, locked) {
      const filt = locked ? '' : `filter="url(#${id}f)"`;
      return `<defs>
        ${_glow(id, c3, locked)}
        ${_shine(id)}
        <linearGradient id="${id}g" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%"   stop-color="${c4}"/>
          <stop offset="35%"  stop-color="${c3}"/>
          <stop offset="75%"  stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c1}"/>
        </linearGradient>
        <linearGradient id="${id}b" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stop-color="${c1}"/>
          <stop offset="50%"  stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c1}"/>
        </linearGradient>
      </defs>
      <path d="M6,46 L6,24 L18,36 L30,8 L42,36 L54,24 L54,46 Z"
            fill="url(#${id}g)" stroke="${c3}" stroke-width="2" stroke-linejoin="round" ${filt}/>
      <path d="M6,46 L6,24 L18,36 L30,8 L42,36 L54,24 L54,46 Z"
            fill="url(#${id}sh)"/>
      <rect x="6" y="46" width="48" height="8" rx="2" fill="url(#${id}b)" stroke="${c3}" stroke-width="1.6"/>
      <line x1="6" y1="50" x2="54" y2="50" stroke="${c4}" stroke-width="0.8" stroke-opacity="0.4"/>
      <!-- Gems: center peak -->
      <circle cx="30" cy="10" r="4.2" fill="${c3}" stroke="${c4}" stroke-width="1"/>
      <circle cx="30" cy="10" r="2"   fill="white" fill-opacity="0.7"/>
      <!-- Gems: side peaks -->
      <circle cx="10" cy="26" r="3.4" fill="${c3}" stroke="${c4}" stroke-width="0.9"/>
      <circle cx="10" cy="26" r="1.5" fill="white" fill-opacity="0.6"/>
      <circle cx="50" cy="26" r="3.4" fill="${c3}" stroke="${c4}" stroke-width="0.9"/>
      <circle cx="50" cy="26" r="1.5" fill="white" fill-opacity="0.6"/>
      <!-- Notch dots -->
      <circle cx="18" cy="36" r="2.2" fill="${c4}" stroke="${c2}" stroke-width="0.7"/>
      <circle cx="42" cy="36" r="2.2" fill="${c4}" stroke="${c2}" stroke-width="0.7"/>
      ${_n(lvl, c4, 50)}`;
    },

    /* LEGEND — 8-ray flame sunburst */
    legend({ c1, c2, c3, c4 }, id, lvl, locked) {
      const rays = Array.from({ length: 8 }, (_, i) => {
        const a   = (i * 45 - 90) * Math.PI / 180;
        const r   = i % 2 === 0 ? 28 : 21;
        const tip = { x:(30+r*Math.cos(a)).toFixed(2), y:(30+r*Math.sin(a)).toFixed(2) };
        const hl  = a - 0.28, hr = a + 0.28, rb = 13;
        const bl  = { x:(30+rb*Math.cos(hl)).toFixed(2), y:(30+rb*Math.sin(hl)).toFixed(2) };
        const br  = { x:(30+rb*Math.cos(hr)).toFixed(2), y:(30+rb*Math.sin(hr)).toFixed(2) };
        const col = i % 2 === 0 ? c3 : c4;
        return `<path d="M${bl.x},${bl.y} L${tip.x},${tip.y} L${br.x},${br.y} Z"
                      fill="${col}" stroke="${col}" stroke-width="0.4"
                      stroke-linejoin="round" opacity="${i % 2 === 0 ? 1 : 0.7}"/>`;
      }).join('');
      const filt = locked ? '' : `filter="url(#${id}f)"`;
      return `<defs>
        ${_glow(id, c3, locked)}
        ${_shine(id)}
        <radialGradient id="${id}g" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="${c4}"/>
          <stop offset="40%"  stop-color="${c3}"/>
          <stop offset="100%" stop-color="${c1}"/>
        </radialGradient>
      </defs>
      <g ${filt}>${rays}</g>
      <circle cx="30" cy="30" r="13" fill="url(#${id}g)" stroke="${c3}" stroke-width="1.8"/>
      <circle cx="30" cy="30" r="13" fill="url(#${id}sh)"/>
      <circle cx="30" cy="30" r="9"  fill="none" stroke="${c4}" stroke-width="1" stroke-opacity="0.5"/>
      ${_n(lvl, c4)}`;
    },

    /* CHAMPION — Ornate circle emblem (level 100) */
    champion({ c1, c2, c3, c4 }, id, lvl, locked) {
      const filt = locked ? '' : `filter="url(#${id}f)"`;
      return `<defs>
        ${_glow(id, c4, locked)}
        ${_shine(id)}
        <radialGradient id="${id}ga" cx="50%" cy="42%" r="55%">
          <stop offset="0%"   stop-color="${c4}"/>
          <stop offset="35%"  stop-color="${c3}"/>
          <stop offset="75%"  stop-color="${c2}"/>
          <stop offset="100%" stop-color="${c1}"/>
        </radialGradient>
        <radialGradient id="${id}gb" cx="50%" cy="42%" r="55%">
          <stop offset="0%"   stop-color="${c4}" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <!-- Outer dashed orbit -->
      <circle cx="30" cy="30" r="28" fill="none" stroke="${c4}"
              stroke-width="0.9" stroke-opacity="0.5" stroke-dasharray="3.5 2.5"/>
      <!-- Main body -->
      <circle cx="30" cy="30" r="24" fill="url(#${id}ga)" stroke="${c3}" stroke-width="2" ${filt}/>
      <circle cx="30" cy="30" r="24" fill="url(#${id}gb)"/>
      <circle cx="30" cy="30" r="24" fill="url(#${id}sh)"/>
      <!-- Inner ring -->
      <circle cx="30" cy="30" r="20" fill="none" stroke="${c4}" stroke-width="0.8" stroke-opacity="0.4"/>
      <!-- Crown -->
      <path d="M14,38 L14,26 L20,32 L30,15 L40,32 L46,26 L46,38 Z"
            fill="${c1}" stroke="${c3}" stroke-width="1.5" stroke-linejoin="round" opacity="0.92"/>
      <rect x="14" y="38" width="32" height="5.5" rx="1.5" fill="${c2}" stroke="${c3}" stroke-width="1.2"/>
      <!-- Crown gems -->
      <circle cx="30" cy="16.5" r="3.5" fill="${c3}" stroke="${c4}" stroke-width="0.9"/>
      <circle cx="30" cy="16.5" r="1.6" fill="white" fill-opacity="0.85"/>
      <circle cx="17" cy="27"   r="2.8" fill="${c3}" stroke="${c4}" stroke-width="0.9"/>
      <circle cx="17" cy="27"   r="1.2" fill="white" fill-opacity="0.75"/>
      <circle cx="43" cy="27"   r="2.8" fill="${c3}" stroke="${c4}" stroke-width="0.9"/>
      <circle cx="43" cy="27"   r="1.2" fill="white" fill-opacity="0.75"/>
      ${_n(lvl, c4, 42, 9.5)}`;
    },
  };

  /* ── Shape router ──────────────────────────────────────── */
  const SHAPE_BY_TIER = {
    IRON:'iron', BRONZE:'bronze', SILVER:'silver', GOLD:'gold',
    PLATINUM:'platinum', DIAMOND:'diamond', MASTER:'master',
    LEGEND:'legend', CHAMPION:'champion',
  };

  function medalSVG(level, tier, state) {
    const locked = state === 'locked';
    const colors = locked
      ? { c1:'#0A0A18', c2:'#1C1C30', c3:'#2A2A44', c4:'#383858' }
      : { c1: tier.c1, c2: tier.c2, c3: tier.c3, c4: tier.c4 };
    const id     = `m${level}`;
    const inner  = SHAPES[SHAPE_BY_TIER[tier.name]](colors, id, level, locked);
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

  /* ── Render 100-level grid ─────────────────────────────── */
  function render(containerEl, bp) {
    const fragment = document.createDocumentFragment();

    for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
      const tier  = getTier(lvl);
      const state = lvl < bp.level   ? 'completed'
                  : lvl === bp.level  ? 'current'
                  : 'locked';

      const card = document.createElement('div');
      card.className   = `bp-level bp-level--${state}`;
      card.dataset.level = lvl;
      card.title       = `Level ${lvl} · ${tier.name}`;

      if (state !== 'locked') {
        card.style.setProperty('--tier-color', tier.c2);
        card.style.setProperty('--tier-glow',  tier.glow);
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
  /*
   * bpData: the battlePass object from the API:
   *   { level, xp, xpInCurrentLevel, xpNeededForNextLevel, progressPercent }
   * Falls back to localStorage when omitted.
   */
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
            <h2 class="bp-title">BATTLE PASS</h2>
            <span class="bp-season">SEASON 1</span>
          </div>
          <div class="bp-level-badge">
            <div class="bp-lv-main">
              <span class="bp-lv-label">LEVEL</span>
              <span class="bp-lv-num">${level}</span>
              <span class="bp-lv-tier" style="color:${tier.c2}">${tier.name}</span>
            </div>
            ${level < MAX_LEVEL
              ? `<span class="bp-lv-xpcap">${xpNeeded.toLocaleString()} XP for next level</span>`
              : `<span class="bp-lv-xpcap" style="color:var(--gold)">MAX LEVEL</span>`}
          </div>
        </div>

        <div class="bp-xp-wrap">
          <div class="bp-xp-row">

            <!-- Current level pill -->
            <div class="bp-xp-lv-pill">
              <span class="bp-xp-lv-num" style="color:${tier.c2}">${level}</span>
              <span class="bp-xp-lv-label">${tier.name}</span>
            </div>

            <!-- Bar + numbers -->
            <div class="bp-xp-center">
              <div class="bp-xp-nums">
                <span>${xpDone.toLocaleString()} / ${xpNeeded.toLocaleString()} XP</span>
                ${level < MAX_LEVEL
                  ? `<span class="bp-xp-togo">${xpLeft.toLocaleString()} XP to go</span>`
                  : `<span style="color:var(--gold)">MAX LEVEL</span>`}
              </div>
              <div class="bp-xp-track">
                <div class="bp-xp-fill" style="width:${pct}%"></div>
              </div>
            </div>

            <!-- Next level pill -->
            ${level < MAX_LEVEL ? `
            <div class="bp-xp-lv-pill bp-xp-lv-pill--next">
              <span class="bp-xp-lv-num" style="color:${nextTier.c2}">${level + 1}</span>
              <span class="bp-xp-lv-label">${nextTier.name}</span>
            </div>` : ''}

          </div>
        </div>

        <div class="bp-grid" id="bpGrid"></div>

      </section>`;

    render(document.getElementById('bpGrid'), bp);
  }

  return { mount, loadBP, saveBP, getTier, MAX_LEVEL, XP_PER_LEVEL };
})();
