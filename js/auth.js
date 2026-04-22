/* ═══════════════════════════════════════════════════════════
   NEON CITY — Auth Module
   Handles register / login / logout and session persistence.
   Session is stored in localStorage under 'nc_session'.
   ═══════════════════════════════════════════════════════════ */

const API_BASE = 'https://game-backend-wfmf.onrender.com';

const Auth = (() => {

  /* ── Session helpers ───────────────────────────────────── */
  function saveSession(data) {
    localStorage.setItem('nc_session', JSON.stringify(data));
  }

  function clearSession() {
    localStorage.removeItem('nc_session');
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem('nc_session')) || null;
    } catch {
      return null;
    }
  }

  function isLoggedIn() {
    const s = getSession();
    return !!(s && s.token && s.name);
  }

  /* ── API helpers ───────────────────────────────────────── */
  async function post(endpoint, body) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Surface the server's message when available, else a generic one
      throw new Error(data.message || data.error || `HTTP ${res.status}`);
    }

    return data;
  }

  /* ── API GET helper ───────────────────────────────────── */
  async function get(endpoint) {
    const session = getSession();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || data.error || `HTTP ${res.status}`);
    }

    return data;
  }

  /* ── Profile ───────────────────────────────────────────── */
  /*
   * Returns the raw profile object:
   * { id, name, nex, account, battlePass, stats, unlockedCharacters }
   *
   * When viewing own profile (token present), uses GET /profile/me
   * so the response always reflects the authenticated user's live data.
   * For any other name, uses public GET /profile/:name.
   */
  async function fetchProfile(name) {
    const session = getSession();
    const isOwn   = session?.name?.toLowerCase() === name?.toLowerCase();
    if (isOwn && session?.token) {
      return get('/profile/me');   // protected — always fresh, no name mismatch
    }
    return get(`/profile/${encodeURIComponent(name)}`);
  }

  /* ── Auth actions ──────────────────────────────────────── */
  async function register({ name, email, password }) {
    await post('/auth/register', { name, email, password });
    // Caller handles success messaging and navigation
  }

  async function login({ name, password }) {
    const data = await post('/auth/login', { name, password });
    // Expect { token, name } (or common variants)
    const token = data.token ?? data.access_token ?? data.data?.token ?? '';
    const userName = data.name ?? data.username ?? name;
    saveSession({ token, name: userName });
    // Caller handles success messaging and navigation
  }

  function logout() {
    // Tell backend to invalidate the token, then clear local session.
    // Fire-and-forget — we navigate away regardless of the response.
    const session = getSession();
    if (session?.token) {
      fetch(`${API_BASE}/auth/logout`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.token}`,
        },
      }).catch(() => {}); // silently ignore network errors
    }
    clearSession();
    window.location.href = 'index.html';
  }

  /* ── Navbar injection (call on every page) ─────────────── */
  function mountNavbar() {
    const session = getSession();
    const nav = document.getElementById('siteNav');
    if (!nav) return;

    if (session && session.name) {
      // Logged-in state
      nav.innerHTML = `
        <div class="nav-links">
          <a href="leaderboard.html" class="nav-shop-btn nav-lb-btn" title="Leaderboards">
            <span class="nav-shop-icon">▲</span>
            <span class="nav-shop-label">RANKS</span>
          </a>
          <a href="inventory.html" class="nav-shop-btn nav-inv-btn" title="Inventory">
            <span class="nav-shop-icon">▦</span>
            <span class="nav-shop-label">INVENTORY</span>
          </a>
          <a href="shop.html" class="nav-shop-btn" title="Item Shop">
            <span class="nav-shop-icon">⬡</span>
            <span class="nav-shop-label">SHOP</span>
          </a>
        </div>
        <div class="nav-account">
          <a href="profile.html" class="nav-account-btn" title="View profile">
            <span class="nav-account-icon">◈</span>
            <span class="nav-account-name">${_esc(session.name)}</span>
          </a>
        </div>
        <div class="nav-auth">
          <button class="nav-btn nav-btn--ghost" id="navLogout">LOGOUT</button>
        </div>`;

      document.getElementById('navLogout').addEventListener('click', logout);
    } else {
      // Guest state
      nav.innerHTML = `
        <div class="nav-links">
          <a href="leaderboard.html" class="nav-shop-btn nav-lb-btn" title="Leaderboards">
            <span class="nav-shop-icon">▲</span>
            <span class="nav-shop-label">RANKS</span>
          </a>
          <a href="inventory.html" class="nav-shop-btn nav-inv-btn" title="Inventory">
            <span class="nav-shop-icon">▦</span>
            <span class="nav-shop-label">INVENTORY</span>
          </a>
          <a href="shop.html" class="nav-shop-btn" title="Item Shop">
            <span class="nav-shop-icon">⬡</span>
            <span class="nav-shop-label">SHOP</span>
          </a>
        </div>
        <div class="nav-account"></div>
        <div class="nav-auth">
          <a href="login.html"    class="nav-btn nav-btn--ghost">LOGIN</a>
          <a href="register.html" class="nav-btn nav-btn--primary">REGISTER</a>
        </div>`;
    }

    // ── Burger menu (injected outside #siteNav into the nav element) ──
    _mountBurger(session);
  }

  function _mountBurger(session) {
    // Remove any existing burger/menu to avoid duplicates
    document.getElementById('navBurger')?.remove();
    document.getElementById('navMobileMenu')?.remove();
    document.getElementById('navMobileBackdrop')?.remove();

    const navEl = document.querySelector('.site-nav');
    if (!navEl) return;

    // Burger button
    const burger = document.createElement('button');
    burger.id = 'navBurger';
    burger.className = 'nav-burger';
    burger.setAttribute('aria-label', 'Open menu');
    burger.innerHTML = '<span></span><span></span><span></span>';
    navEl.appendChild(burger);

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'navMobileBackdrop';
    backdrop.className = 'nav-mobile-backdrop';
    document.body.appendChild(backdrop);

    // Mobile menu panel
    const menu = document.createElement('nav');
    menu.id = 'navMobileMenu';
    menu.className = 'nav-mobile-menu';

    if (session && session.name) {
      const initial = _esc(session.name.charAt(0).toUpperCase());
      menu.innerHTML = `
        <a href="profile.html" class="nav-mobile-account">
          <div class="nav-mobile-account-avatar">${initial}</div>
          <div>
            <div class="nav-mobile-account-name">${_esc(session.name)}</div>
            <div class="nav-mobile-account-sub">View Profile →</div>
          </div>
        </a>
        <div class="nav-mobile-section">NAVIGATE</div>
        <a href="index.html"       class="nav-mobile-item"><span class="nav-mobile-item-icon">⬡</span>HOME</a>
        <a href="shop.html"        class="nav-mobile-item gold"><span class="nav-mobile-item-icon">⬡</span>ITEM SHOP</a>
        <a href="inventory.html"   class="nav-mobile-item"><span class="nav-mobile-item-icon">▦</span>INVENTORY</a>
        <a href="leaderboard.html" class="nav-mobile-item pink"><span class="nav-mobile-item-icon">▲</span>LEADERBOARDS</a>
        <div class="nav-mobile-section">ACCOUNT</div>
        <button class="nav-mobile-item pink" id="navMobileLogout"><span class="nav-mobile-item-icon">⏻</span>LOGOUT</button>`;
    } else {
      menu.innerHTML = `
        <div class="nav-mobile-section">NAVIGATE</div>
        <a href="index.html"       class="nav-mobile-item"><span class="nav-mobile-item-icon">⬡</span>HOME</a>
        <a href="shop.html"        class="nav-mobile-item gold"><span class="nav-mobile-item-icon">⬡</span>ITEM SHOP</a>
        <a href="inventory.html"   class="nav-mobile-item"><span class="nav-mobile-item-icon">▦</span>INVENTORY</a>
        <a href="leaderboard.html" class="nav-mobile-item pink"><span class="nav-mobile-item-icon">▲</span>LEADERBOARDS</a>
        <div class="nav-mobile-section">ACCOUNT</div>
        <a href="login.html"    class="nav-mobile-item"><span class="nav-mobile-item-icon">◈</span>LOGIN</a>
        <a href="register.html" class="nav-mobile-item green"><span class="nav-mobile-item-icon">✦</span>REGISTER</a>`;
    }

    document.body.appendChild(menu);

    // Toggle logic
    function openMenu() {
      burger.classList.add('open');
      menu.classList.add('open');
      backdrop.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
      burger.classList.remove('open');
      menu.classList.remove('open');
      backdrop.classList.remove('open');
      document.body.style.overflow = '';
    }

    burger.addEventListener('click', () => {
      burger.classList.contains('open') ? closeMenu() : openMenu();
    });
    backdrop.addEventListener('click', closeMenu);

    // Close on nav link click
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

    // Logout inside mobile menu
    const mobileLogout = document.getElementById('navMobileLogout');
    if (mobileLogout) mobileLogout.addEventListener('click', logout);
  }

  /* Minimal HTML-escape to prevent XSS when injecting a username */
  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return { register, login, logout, isLoggedIn, getSession, mountNavbar, fetchProfile };
})();
