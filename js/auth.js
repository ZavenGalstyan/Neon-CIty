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
   * Returns the raw profile object as-is:
   * {
   *   id, name, nex,
   *   account:   { level, xp, xpInCurrentLevel, xpNeededForNextLevel, progressPercent },
   *   battlePass:{ level, xp, xpInCurrentLevel, xpNeededForNextLevel, progressPercent }
   * }
   */
  async function fetchProfile(name) {
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
        <div class="nav-account"></div>
        <div class="nav-auth">
          <a href="login.html"    class="nav-btn nav-btn--ghost">LOGIN</a>
          <a href="register.html" class="nav-btn nav-btn--primary">REGISTER</a>
        </div>`;
    }
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
