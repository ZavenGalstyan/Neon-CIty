/* ═══════════════════════════════════════════════════════════
   NEON CITY — Battle Pass Module
   100 levels, 9 unique tiered medal SVGs, XP progression.
   Data: localStorage 'nc_bp' → swap load/save for API later.
   ═══════════════════════════════════════════════════════════ */

const BattlePass = (() => {

  const XP_PER_LEVEL = 1000;
  const MAX_LEVEL    = 100;

  /* ── Tier definitions ──────────────────────────────────── */
  const TIERS = [
    { name:'IRON',     from:  1, to: 10, c1:'#3A4A5C', c2:'#A8BDD0', glow:'rgba(168,189,208,0.5)'  },
    { name:'BRONZE',   from: 11, to: 20, c1:'#5C2A00', c2:'#D4883A', glow:'rgba(212,136,58,0.55)'  },
    { name:'SILVER',   from: 21, to: 35, c1:'#4A5060', c2:'#E8EEF5', glow:'rgba(232,238,245,0.55)' },
    { name:'GOLD',     from: 36, to: 50, c1:'#7A4A00', c2:'#FFD700', glow:'rgba(255,215,0,0.6)'    },
    { name:'PLATINUM', from: 51, to: 65, c1:'#005A70', c2:'#44EEFF', glow:'rgba(68,238,255,0.65)'  },
    { name:'DIAMOND',  from: 66, to: 80, c1:'#1A2A6C', c2:'#A0C4FF', glow:'rgba(160,196,255,0.65)' },
    { name:'MASTER',   from: 81, to: 90, c1:'#3D0080', c2:'#CC88FF', glow:'rgba(204,136,255,0.7)'  },
    { name:'LEGEND',   from: 91, to: 99, c1:'#7A1500', c2:'#FF8C44', glow:'rgba(255,140,68,0.7)'   },
    { name:'CHAMPION', from:100, to:100, c1:'#6B4000', c2:'#FFE566', glow:'rgba(255,229,102,0.9)'  },
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
   * Each function receives (c1, c2, id, lvl):
   *   c1  = dark/shadow color
   *   c2  = bright/accent color
   *   id  = unique gradient-ID prefix (e.g. "m14")
   *   lvl = the level number to display
   * Returns the inner SVG markup (no outer <svg> tag).
   */
  const SHAPES = {

    /* IRON — Industrial hexagonal bolt plate */
    iron(c1, c2, id, lvl) {
      // Pointy-top hex, r=26
      const outerPts = _poly([[0,26],[60,26],[120,26],[180,26],[240,26],[300,26]]);
      // Inner hex rotated 30° (flat-top), r=17
      const innerPts = _poly([[30,17],[90,17],[150,17],[210,17],[270,17],[330,17]]);
      // Corner dot positions for outer hex
      const dots = [[0,26],[60,26],[120,26],[180,26],[240,26],[300,26]].map(([a,r]) => {
        const rad = (a - 90) * Math.PI / 180;
        return `<circle cx="${(30 + r * Math.cos(rad)).toFixed(2)}"
                        cy="${(30 + r * Math.sin(rad)).toFixed(2)}"
                        r="2.2" fill="${c2}"/>`;
      }).join('');
      return `
        <defs>
          <linearGradient id="${id}" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stop-color="${c2}" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="${c1}" stop-opacity="0.7"/>
          </linearGradient>
        </defs>
        <polygon points="${outerPts}" fill="url(#${id})" stroke="${c2}" stroke-width="2"/>
        <polygon points="${innerPts}" fill="none" stroke="${c2}" stroke-width="1" stroke-opacity="0.45"/>
        ${dots}
        ${_n(lvl, c2)}`;
    },

    /* BRONZE — Classic round medal with segmented outer ring */
    bronze(c1, c2, id, lvl) {
      // 12 arc segments around r=22–27 ring
      const segs = Array.from({ length: 12 }, (_, i) => {
        const a1 = (i * 30 - 8) * Math.PI / 180;
        const a2 = (i * 30 + 8) * Math.PI / 180;
        const [r1, r2] = [27, 21];
        const x1 = (30 + r1 * Math.cos(a1)).toFixed(2), y1 = (30 + r1 * Math.sin(a1)).toFixed(2);
        const x2 = (30 + r1 * Math.cos(a2)).toFixed(2), y2 = (30 + r1 * Math.sin(a2)).toFixed(2);
        const x3 = (30 + r2 * Math.cos(a2)).toFixed(2), y3 = (30 + r2 * Math.sin(a2)).toFixed(2);
        const x4 = (30 + r2 * Math.cos(a1)).toFixed(2), y4 = (30 + r2 * Math.sin(a1)).toFixed(2);
        return `<path d="M${x1},${y1} A${r1},${r1} 0 0,1 ${x2},${y2} L${x3},${y3} A${r2},${r2} 0 0,0 ${x4},${y4} Z"
                  fill="${c2}" opacity="0.75"/>`;
      }).join('');
      return `
        <defs>
          <radialGradient id="${id}" cx="38%" cy="32%" r="65%">
            <stop offset="0%" stop-color="${c2}"/>
            <stop offset="100%" stop-color="${c1}"/>
          </radialGradient>
        </defs>
        ${segs}
        <circle cx="30" cy="30" r="19" fill="url(#${id})" stroke="${c2}" stroke-width="1.8"/>
        <circle cx="30" cy="30" r="13" fill="none" stroke="${c2}" stroke-width="1" stroke-opacity="0.4"/>
        <!-- Shine -->
        <path d="M22,19 Q25,16 29,18" fill="none" stroke="white" stroke-width="1.2"
              stroke-opacity="0.35" stroke-linecap="round"/>
        ${_n(lvl, c2)}`;
    },

    /* SILVER — Sharp 8-pointed star with inner circle */
    silver(c1, c2, id, lvl) {
      // 8-pointed: alternate r=26 (tip) / r=12 (notch)
      const pts = _poly(
        Array.from({ length: 16 }, (_, i) => [i * 22.5, i % 2 === 0 ? 26 : 12])
      );
      return `
        <defs>
          <linearGradient id="${id}" x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%"   stop-color="${c2}"/>
            <stop offset="50%"  stop-color="${c2}" stop-opacity="0.65"/>
            <stop offset="100%" stop-color="${c1}"/>
          </linearGradient>
        </defs>
        <polygon points="${pts}" fill="url(#${id})"
                 stroke="${c2}" stroke-width="1.3" stroke-linejoin="round"/>
        <!-- Inner circle cutout feel -->
        <circle cx="30" cy="30" r="9" fill="${c1}" stroke="${c2}" stroke-width="1" stroke-opacity="0.5"/>
        <!-- Highlight on top-right tip -->
        <line x1="38" y1="6" x2="34" y2="10" stroke="white" stroke-width="1.5"
              stroke-opacity="0.4" stroke-linecap="round"/>
        ${_n(lvl, c2)}`;
    },

    /* GOLD — Heraldic pointed shield */
    gold(c1, c2, id, lvl) {
      return `
        <defs>
          <linearGradient id="${id}" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%"   stop-color="${c2}"/>
            <stop offset="60%"  stop-color="${c2}" stop-opacity="0.75"/>
            <stop offset="100%" stop-color="${c1}"/>
          </linearGradient>
        </defs>
        <!-- Shield body (pointed bottom) -->
        <path d="M30,4 L54,4 L54,34 Q54,52 30,58 Q6,52 6,34 L6,4 Z"
              fill="url(#${id})" stroke="${c2}" stroke-width="2"/>
        <!-- Inner shield border -->
        <path d="M30,10 L48,10 L48,34 Q48,48 30,53 Q12,48 12,34 L12,10 Z"
              fill="none" stroke="${c2}" stroke-width="1" stroke-opacity="0.38"/>
        <!-- Top decorative arch -->
        <path d="M6,4 Q30,14 54,4" fill="none" stroke="${c2}" stroke-width="1.4" stroke-opacity="0.55"/>
        <!-- Shine line -->
        <path d="M13,8 Q15,6 18,7" fill="none" stroke="white" stroke-width="1.2"
              stroke-opacity="0.35" stroke-linecap="round"/>
        ${_n(lvl, c2, 33)}`;
    },

    /* PLATINUM — 5-pointed crystal star, facet lines + sparkles */
    platinum(c1, c2, id, lvl) {
      // 5-pointed: tip r=27, notch r=11
      const pts = _poly(
        Array.from({ length: 10 }, (_, i) => [i * 36, i % 2 === 0 ? 27 : 11])
      );
      // Lines from notch to opposite notch (internal facets)
      const notchAngles = [36, 108, 180, 252, 324];
      const facets = notchAngles.map(a => {
        const rad = (a - 90) * Math.PI / 180;
        const x = (30 + 11 * Math.cos(rad)).toFixed(2);
        const y = (30 + 11 * Math.sin(rad)).toFixed(2);
        return `<line x1="30" y1="30" x2="${x}" y2="${y}"
                      stroke="${c2}" stroke-width="0.9" stroke-opacity="0.5"/>`;
      }).join('');
      // Cross-sparkle at each tip
      const sparkles = [0, 72, 144, 216, 288].map(a => {
        const rad = (a - 90) * Math.PI / 180;
        const cx = (30 + 27 * Math.cos(rad)).toFixed(2);
        const cy = (30 + 27 * Math.sin(rad)).toFixed(2);
        const perp = rad + Math.PI / 2;
        const d = 2.8;
        return `
          <line x1="${(+cx + d * Math.cos(rad)).toFixed(2)}"   y1="${(+cy + d * Math.sin(rad)).toFixed(2)}"
                x2="${(+cx - d * Math.cos(rad)).toFixed(2)}"   y2="${(+cy - d * Math.sin(rad)).toFixed(2)}"
                stroke="${c2}" stroke-width="1.2" stroke-linecap="round"/>
          <line x1="${(+cx + d * Math.cos(perp)).toFixed(2)}"  y1="${(+cy + d * Math.sin(perp)).toFixed(2)}"
                x2="${(+cx - d * Math.cos(perp)).toFixed(2)}"  y2="${(+cy - d * Math.sin(perp)).toFixed(2)}"
                stroke="${c2}" stroke-width="1.2" stroke-linecap="round"/>`;
      }).join('');
      return `
        <defs>
          <linearGradient id="${id}" x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%"   stop-color="${c2}"/>
            <stop offset="100%" stop-color="${c1}"/>
          </linearGradient>
        </defs>
        <polygon points="${pts}" fill="url(#${id})"
                 stroke="${c2}" stroke-width="1.5" stroke-linejoin="round"/>
        ${facets}
        ${sparkles}
        <circle cx="30" cy="30" r="8" fill="${c1}" stroke="${c2}" stroke-width="1" stroke-opacity="0.5"/>
        ${_n(lvl, c2)}`;
    },

    /* DIAMOND — Brilliant-cut octagon gem with full facet map */
    diamond(c1, c2, id, lvl) {
      // Octagon vertices (r=26, flat-top = starting at 22.5°)
      const oct = _poly([[22.5,26],[67.5,26],[112.5,26],[157.5,26],
                          [202.5,26],[247.5,26],[292.5,26],[337.5,26]]);
      // Table (top flat face) — inner square rotated 45°
      const table = _poly([[0,14],[90,14],[180,14],[270,14]]);
      // Bezel facet lines: each octagon vertex → adjacent table corner
      const octPts = [22.5,67.5,112.5,157.5,202.5,247.5,292.5,337.5].map(a => {
        const r = (a - 90) * Math.PI / 180;
        return [(30 + 26 * Math.cos(r)).toFixed(2), (30 + 26 * Math.sin(r)).toFixed(2)];
      });
      const tblPts = [0,90,180,270].map(a => {
        const r = (a - 90) * Math.PI / 180;
        return [(30 + 14 * Math.cos(r)).toFixed(2), (30 + 14 * Math.sin(r)).toFixed(2)];
      });
      const bezels = octPts.map((op, i) => {
        const ti = Math.floor(i / 2) % 4;
        return `<line x1="${op[0]}" y1="${op[1]}" x2="${tblPts[ti][0]}" y2="${tblPts[ti][1]}"
                      stroke="${c2}" stroke-width="0.75" stroke-opacity="0.45"/>`;
      }).join('');
      return `
        <defs>
          <linearGradient id="${id}a" x1="15%" y1="5%" x2="85%" y2="95%">
            <stop offset="0%"   stop-color="${c2}"/>
            <stop offset="45%"  stop-color="${c1}" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="${c2}" stop-opacity="0.4"/>
          </linearGradient>
          <linearGradient id="${id}b" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stop-color="white" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="white" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <polygon points="${oct}" fill="url(#${id}a)" stroke="${c2}" stroke-width="1.8"/>
        <polygon points="${oct}" fill="url(#${id}b)"/>
        ${bezels}
        <polygon points="${table}" fill="none" stroke="${c2}" stroke-width="0.9" stroke-opacity="0.5"/>
        <!-- Upper-left shine -->
        <line x1="16" y1="9"  x2="13" y2="16" stroke="white" stroke-width="1.8"
              stroke-opacity="0.45" stroke-linecap="round"/>
        <line x1="20" y1="7"  x2="18" y2="10" stroke="white" stroke-width="1"
              stroke-opacity="0.3" stroke-linecap="round"/>
        ${_n(lvl, c2)}`;
    },

    /* MASTER — Three-peak crown with gems */
    master(c1, c2, id, lvl) {
      return `
        <defs>
          <linearGradient id="${id}" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%"   stop-color="${c2}"/>
            <stop offset="100%" stop-color="${c1}"/>
          </linearGradient>
        </defs>
        <!-- Crown body -->
        <path d="M6,46 L6,24 L18,36 L30,8 L42,36 L54,24 L54,46 Z"
              fill="url(#${id})" stroke="${c2}" stroke-width="2" stroke-linejoin="round"/>
        <!-- Crown base band -->
        <rect x="6" y="46" width="48" height="8" rx="2"
              fill="${c1}" stroke="${c2}" stroke-width="1.6"/>
        <!-- Band center line -->
        <line x1="6" y1="50" x2="54" y2="50"
              stroke="${c2}" stroke-width="0.8" stroke-opacity="0.38"/>
        <!-- Top gem (center peak) -->
        <circle cx="30" cy="10" r="4"   fill="${c2}" stroke="${c1}" stroke-width="1.2"/>
        <circle cx="30" cy="10" r="1.8" fill="white" fill-opacity="0.65"/>
        <!-- Left peak gem -->
        <circle cx="10" cy="26" r="3.2" fill="${c2}" stroke="${c1}" stroke-width="1"/>
        <circle cx="10" cy="26" r="1.3" fill="white" fill-opacity="0.55"/>
        <!-- Right peak gem -->
        <circle cx="50" cy="26" r="3.2" fill="${c2}" stroke="${c1}" stroke-width="1"/>
        <circle cx="50" cy="26" r="1.3" fill="white" fill-opacity="0.55"/>
        <!-- Side notch dots -->
        <circle cx="18" cy="36" r="2"   fill="${c2}" stroke="${c1}" stroke-width="0.8"/>
        <circle cx="42" cy="36" r="2"   fill="${c2}" stroke="${c1}" stroke-width="0.8"/>
        ${_n(lvl, c2, 50)}`;
    },

    /* LEGEND — 8-ray sunburst emblem with inner ring */
    legend(c1, c2, id, lvl) {
      // 8 flame rays: alternating long (r=28) / short (r=21)
      const rays = Array.from({ length: 8 }, (_, i) => {
        const a   = (i * 45 - 90) * Math.PI / 180;
        const r   = i % 2 === 0 ? 28 : 21;
        const tip = { x: (30 + r * Math.cos(a)).toFixed(2), y: (30 + r * Math.sin(a)).toFixed(2) };
        const hl  = a - 0.28, hr = a + 0.28, rb = 13;
        const bl  = { x: (30 + rb * Math.cos(hl)).toFixed(2), y: (30 + rb * Math.sin(hl)).toFixed(2) };
        const br  = { x: (30 + rb * Math.cos(hr)).toFixed(2), y: (30 + rb * Math.sin(hr)).toFixed(2) };
        return `<path d="M${bl.x},${bl.y} L${tip.x},${tip.y} L${br.x},${br.y} Z"
                      fill="${c2}" stroke="${c2}" stroke-width="0.5"
                      stroke-linejoin="round" opacity="${i % 2 === 0 ? 1 : 0.65}"/>`;
      }).join('');
      return `
        <defs>
          <radialGradient id="${id}" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stop-color="${c2}"/>
            <stop offset="100%" stop-color="${c1}"/>
          </radialGradient>
        </defs>
        ${rays}
        <circle cx="30" cy="30" r="13" fill="url(#${id})" stroke="${c2}" stroke-width="1.8"/>
        <circle cx="30" cy="30" r="9"  fill="none" stroke="${c2}" stroke-width="1" stroke-opacity="0.45"/>
        <!-- Inner shine -->
        <path d="M24,24 Q26,22 29,23" fill="none" stroke="white"
              stroke-width="1.2" stroke-opacity="0.35" stroke-linecap="round"/>
        ${_n(lvl, c2)}`;
    },

    /* CHAMPION — Ornate circle emblem with inner crown (level 100 only) */
    champion(c1, c2, id, lvl) {
      return `
        <defs>
          <radialGradient id="${id}a" cx="50%" cy="45%" r="55%">
            <stop offset="0%"   stop-color="${c2}"/>
            <stop offset="100%" stop-color="${c1}"/>
          </radialGradient>
          <!-- Shine overlay -->
          <radialGradient id="${id}b" cx="38%" cy="28%" r="50%">
            <stop offset="0%"   stop-color="white" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="white" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <!-- Outer dashed ring -->
        <circle cx="30" cy="30" r="28" fill="none"
                stroke="${c2}" stroke-width="1" stroke-opacity="0.4" stroke-dasharray="4 3"/>
        <!-- Main body -->
        <circle cx="30" cy="30" r="24" fill="url(#${id}a)" stroke="${c2}" stroke-width="2"/>
        <!-- Shine -->
        <circle cx="30" cy="30" r="24" fill="url(#${id}b)"/>
        <!-- Inner crown (scaled down to fit circle) -->
        <path d="M14,38 L14,26 L20,32 L30,15 L40,32 L46,26 L46,38 Z"
              fill="${c1}" stroke="${c2}" stroke-width="1.5" stroke-linejoin="round" opacity="0.9"/>
        <rect x="14" y="38" width="32" height="5.5" rx="1.5"
              fill="${c1}" stroke="${c2}" stroke-width="1.2"/>
        <!-- Crown gems -->
        <circle cx="30" cy="16.5" r="3.2" fill="${c2}" stroke="white" stroke-width="0.8"/>
        <circle cx="30" cy="16.5" r="1.4" fill="white" fill-opacity="0.8"/>
        <circle cx="17" cy="27"   r="2.6" fill="${c2}" stroke="white" stroke-width="0.8"/>
        <circle cx="17" cy="27"   r="1.1" fill="white" fill-opacity="0.7"/>
        <circle cx="43" cy="27"   r="2.6" fill="${c2}" stroke="white" stroke-width="0.8"/>
        <circle cx="43" cy="27"   r="1.1" fill="white" fill-opacity="0.7"/>
        <!-- "100" in base band -->
        ${_n(lvl, c2, 41.5, 9.5)}`;
    },
  };

  /* ── Shape router ──────────────────────────────────────── */
  const SHAPE_BY_TIER = {
    IRON: 'iron', BRONZE: 'bronze', SILVER: 'silver', GOLD: 'gold',
    PLATINUM: 'platinum', DIAMOND: 'diamond', MASTER: 'master',
    LEGEND: 'legend', CHAMPION: 'champion',
  };

  function medalSVG(level, tier, state) {
    const locked = state === 'locked';
    const c1 = locked ? '#12121e' : tier.c1;
    const c2 = locked ? '#2e2e46' : tier.c2;
    const id = `m${level}`;
    const inner = SHAPES[SHAPE_BY_TIER[tier.name]](c1, c2, id, level);
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
