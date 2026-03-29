/* ═══════════════════════════════════════════════════════════
   NEON CITY — Battle Pass Module
   100 levels, tiered medal icons, XP progression.
   Data persisted in localStorage under 'nc_bp'.
   Replace load/save with API calls once backend is ready.
   ═══════════════════════════════════════════════════════════ */

const BattlePass = (() => {

  const XP_PER_LEVEL = 1000;
  const MAX_LEVEL    = 100;

  /* ── Tier definitions ──────────────────────────────────── */
  const TIERS = [
    { name: 'IRON',       from:  1, to: 10,  color: '#8899AA', glow: 'rgba(136,153,170,0.5)', shape: 'hex'    },
    { name: 'BRONZE',     from: 11, to: 20,  color: '#CD7F32', glow: 'rgba(205,127,50,0.55)',  shape: 'shield' },
    { name: 'SILVER',     from: 21, to: 35,  color: '#C0C0C0', glow: 'rgba(192,192,192,0.55)', shape: 'shield' },
    { name: 'GOLD',       from: 36, to: 50,  color: '#FFD700', glow: 'rgba(255,215,0,0.6)',    shape: 'shield' },
    { name: 'PLATINUM',   from: 51, to: 65,  color: '#44EEFF', glow: 'rgba(68,238,255,0.6)',   shape: 'star'   },
    { name: 'DIAMOND',    from: 66, to: 80,  color: '#88AAFF', glow: 'rgba(136,170,255,0.6)',  shape: 'diamond'},
    { name: 'MASTER',     from: 81, to: 90,  color: '#CC88FF', glow: 'rgba(204,136,255,0.65)', shape: 'crown'  },
    { name: 'LEGEND',     from: 91, to: 99,  color: '#FF6644', glow: 'rgba(255,102,68,0.65)',  shape: 'crown'  },
    { name: 'CHAMPION',   from:100, to:100,  color: '#FFD700', glow: 'rgba(255,215,0,0.9)',    shape: 'crown'  },
  ];

  function getTier(level) {
    return TIERS.find(t => level >= t.from && level <= t.to) || TIERS[0];
  }

  /* ── Medal SVG shapes ──────────────────────────────────── */
  function medalSVG(level, tier, state) {
    const c  = state === 'locked' ? '#3a3a4a' : tier.color;
    const bg = state === 'locked' ? 'rgba(255,255,255,0.03)' : `${tier.color}18`;

    const shapes = {
      hex: `
        <polygon points="32,6 58,6 70,28 58,50 32,50 20,28" fill="${bg}" stroke="${c}" stroke-width="2.2"/>
        <text x="39" y="34" font-size="15" font-family="monospace" fill="${c}" font-weight="bold">${level > 9 ? '' : level}</text>
        ${level > 9 ? `<text x="28" y="34" font-size="13" font-family="monospace" fill="${c}" font-weight="bold">${level}</text>` : ''}`,

      shield: `
        <path d="M39,4 L61,4 L68,20 L61,40 L39,50 L17,40 L10,20 L17,4 Z" fill="${bg}" stroke="${c}" stroke-width="2.2"/>
        <text x="39" y="33" font-size="14" text-anchor="middle" font-family="monospace" fill="${c}" font-weight="bold">${level}</text>`,

      star: `
        <polygon points="39,4 45,22 63,22 49,34 54,52 39,41 24,52 29,34 15,22 33,22" fill="${bg}" stroke="${c}" stroke-width="2"/>
        <text x="39" y="36" font-size="13" text-anchor="middle" font-family="monospace" fill="${c}" font-weight="bold">${level}</text>`,

      diamond: `
        <polygon points="39,3 66,28 39,54 12,28" fill="${bg}" stroke="${c}" stroke-width="2.2"/>
        <text x="39" y="33" font-size="13" text-anchor="middle" font-family="monospace" fill="${c}" font-weight="bold">${level}</text>`,

      crown: level === 100
        ? `<path d="M8,42 L14,18 L26,32 L39,8 L52,32 L64,18 L70,42 Z" fill="${bg}" stroke="${c}" stroke-width="2.2"/>
           <rect x="8" y="42" width="62" height="10" rx="2" fill="${c}" opacity="0.35"/>
           <circle cx="8"  cy="18" r="4" fill="${c}"/>
           <circle cx="39" cy="8"  r="4" fill="${c}"/>
           <circle cx="70" cy="18" r="4" fill="${c}"/>
           <text x="39" y="40" font-size="11" text-anchor="middle" font-family="monospace" fill="${c}" font-weight="bold">100</text>`
        : `<path d="M10,40 L16,20 L27,31 L39,10 L51,31 L62,20 L68,40 Z" fill="${bg}" stroke="${c}" stroke-width="2"/>
           <rect x="10" y="40" width="58" height="9" rx="2" fill="${c}" opacity="0.3"/>
           <text x="39" y="38" font-size="13" text-anchor="middle" font-family="monospace" fill="${c}" font-weight="bold">${level}</text>`,
    };

    return `<svg viewBox="0 0 78 58" fill="none" xmlns="http://www.w3.org/2000/svg">${shapes[tier.shape]}</svg>`;
  }

  /* ── Session data (swap for API calls later) ───────────── */
  function loadBP() {
    try {
      return JSON.parse(localStorage.getItem('nc_bp')) || { level: 1, xp: 0 };
    } catch { return { level: 1, xp: 0 }; }
  }

  function saveBP(data) {
    localStorage.setItem('nc_bp', JSON.stringify(data));
  }

  /* ── XP helpers ────────────────────────────────────────── */
  function xpForNext(level) {
    return level >= MAX_LEVEL ? null : XP_PER_LEVEL;
  }

  /* ── Render ────────────────────────────────────────────── */
  function render(containerEl, bp) {
    containerEl.innerHTML = '';

    for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
      const tier  = getTier(lvl);
      const state = lvl < bp.level  ? 'completed'
                  : lvl === bp.level ? 'current'
                  : 'locked';

      const card = document.createElement('div');
      card.className = `bp-level bp-level--${state}`;
      card.dataset.level = lvl;
      card.title = `Level ${lvl} · ${tier.name}`;

      if (state !== 'locked') {
        card.style.setProperty('--tier-color', tier.color);
        card.style.setProperty('--tier-glow',  tier.glow);
      }

      card.innerHTML = `
        <div class="bp-medal">${medalSVG(lvl, tier, state)}</div>
        <div class="bp-tier-label">${tier.name}</div>`;

      containerEl.appendChild(card);
    }
  }

  /* ── Mount — call once on profile page ─────────────────── */
  function mount(rootEl) {
    const bp = loadBP();

    rootEl.innerHTML = `
      <section class="bp-section">

        <div class="bp-header">
          <div class="bp-header-left">
            <h2 class="bp-title">BATTLE PASS</h2>
            <span class="bp-season">SEASON 1</span>
          </div>
          <div class="bp-level-badge">
            <span class="bp-lv-label">LEVEL</span>
            <span class="bp-lv-num" id="bpCurrentLevel">${bp.level}</span>
            <span class="bp-lv-tier" id="bpTierName">${getTier(bp.level).name}</span>
          </div>
        </div>

        <div class="bp-xp-wrap">
          <div class="bp-xp-labels">
            <span id="bpXpCurrent">${bp.xp.toLocaleString()} XP</span>
            ${bp.level < MAX_LEVEL
              ? `<span id="bpXpNext">NEXT LEVEL · ${(XP_PER_LEVEL - bp.xp).toLocaleString()} XP to go</span>`
              : `<span id="bpXpNext" style="color:var(--gold)">MAX LEVEL REACHED</span>`}
          </div>
          <div class="bp-xp-track">
            <div class="bp-xp-fill" id="bpXpFill"
              style="width:${bp.level >= MAX_LEVEL ? 100 : Math.min(100,(bp.xp / XP_PER_LEVEL)*100)}%"
              data-tier="${getTier(bp.level).name.toLowerCase()}"></div>
          </div>
        </div>

        <div class="bp-grid" id="bpGrid"></div>

      </section>`;

    render(document.getElementById('bpGrid'), bp);
  }

  return { mount, loadBP, saveBP, getTier, MAX_LEVEL, XP_PER_LEVEL };
})();
