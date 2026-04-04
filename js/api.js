/* ═══════════════════════════════════════════════════════════
   NEON CITY — API Module
   All backend calls. Uses Auth.getSession() for the token.
   Depends on: auth.js (must load first)
   ═══════════════════════════════════════════════════════════ */

const API = (() => {

  const BASE = 'https://game-backend-wfmf.onrender.com';

  /* ── Low-level helpers ─────────────────────────────────── */
  function _token() {
    const s = Auth.getSession();
    return s?.token || '';
  }

  async function _post(path, body) {
    const res = await fetch(`${BASE}${path}`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${_token()}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
    return data;
  }

  async function _get(path) {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${_token()}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
    return data;
  }

  /* ── Session save (called after every game) ────────────── */
  async function saveSession(payload) {
    return _post('/session/save', payload);
  }

  /* ── NEX ────────────────────────────────────────────────── */
  async function getNex() {
    return _get('/nex/balance');
  }

  async function addNex(amount, reason = 'game_session') {
    return _post('/nex/add', { amount, reason });
  }

  async function spendNex(amount, reason, itemId) {
    return _post('/nex/spend', { amount, reason, itemId });
  }

  /* ── Characters ─────────────────────────────────────────── */
  async function getUnlockedCharacters() {
    return _get('/characters/unlocked');
  }

  async function unlockCharacter(characterId) {
    return _post('/characters/unlock', { characterId });
  }

  /* ── Battle Pass ────────────────────────────────────────── */
  async function getBattlePass() {
    return _get('/battlepass/me');
  }

  async function addBattlePassXP(xp) {
    return _post('/battlepass/xp', { xp });
  }

  /* ── Profile ────────────────────────────────────────────── */
  async function getProfile() {
    return _get('/profile/me');
  }

  /* ── Leaderboard ─────────────────────────────────────────── */
  async function getLeaderboard(type = 'kills') {
    return _get(`/leaderboard/${type}`);
  }

  async function getMapLeaderboard(mapId) {
    return _get(`/leaderboard/map/${encodeURIComponent(mapId)}`);
  }

  /* ── Stats ──────────────────────────────────────────────── */
  async function getStats() {
    return _get('/stats/me');
  }

  async function getGlobalStats() {
    return _get('/stats/global');
  }

  /* ── Inventory ──────────────────────────────────────────── */
  async function getInventory() {
    return _get('/inventory');
  }

  async function addWeapon(weaponId) {
    return _post('/inventory/weapons/add', { weaponId });
  }

  async function addUpgrade(upgradeId) {
    return _post('/inventory/upgrades/add', { upgradeId });
  }

  async function addVehicle(vehicleId) {
    return _post('/inventory/vehicles/add', { vehicleId });
  }

  async function updateGrenades(grenades) {
    return _post('/inventory/grenades/update', { grenades });
  }

  /* ── Account XP ─────────────────────────────────────────── */
  async function addAccountXP(xp) {
    return _post('/account/xp', { xp });
  }

  return {
    saveSession,
    getNex, addNex, spendNex,
    getUnlockedCharacters, unlockCharacter,
    getBattlePass, addBattlePassXP,
    getProfile,
    getLeaderboard, getMapLeaderboard,
    getStats, getGlobalStats,
    getInventory, addWeapon, addUpgrade, addVehicle, updateGrenades,
    addAccountXP,
  };
})();
