/* ═══════════════════════════════════════════════════════════
   NEON CITY — API Module  (v2)
   Single source of truth for all backend calls.
   Depends on: auth.js (must load first)

   Two request helpers:
     _get(path)        — protected: always sends Bearer token
     _getPublic(path)  — public:    no auth header (leaderboard, catalog…)
     _post(path, body) — protected: always sends Bearer token
   ═══════════════════════════════════════════════════════════ */

const API = (() => {
  'use strict';

  const BASE = 'https://game-backend-wfmf.onrender.com';

  /* ── Token helper ──────────────────────────────────────── */
  function _token() {
    return Auth.getSession()?.token ?? '';
  }

  /* ── Protected GET ─────────────────────────────────────── */
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

  /* ── Public GET (no auth header) ───────────────────────── */
  async function _getPublic(path) {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
    return data;
  }

  /* ── Protected POST ────────────────────────────────────── */
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

  /* ── Protected DELETE ──────────────────────────────────── */
  async function _delete(path) {
    const res = await fetch(`${BASE}${path}`, {
      method:  'DELETE',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${_token()}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
    return data;
  }

  /* ══════════════════════════════════════════════════════════
     PROFILE
  ══════════════════════════════════════════════════════════ */

  /** Own full profile — uses token, most reliable for self. */
  async function getProfile() {
    return _get('/profile/me');
  }

  /** Any player's public profile by name — no auth needed. */
  async function getProfileByName(name) {
    return _getPublic(`/profile/${encodeURIComponent(name)}`);
  }

  /* ══════════════════════════════════════════════════════════
     NEX  (GET /nex/balance is the shop balance source)
  ══════════════════════════════════════════════════════════ */

  /** GET /nex/balance → { nex } */
  async function getNex() {
    return _get('/nex/balance');
  }

  async function addNex(amount, reason = 'game_session') {
    return _post('/nex/add', { amount, reason });
  }

  /** POST /nex/spend — legacy fallback if /shop/buy not available */
  async function spendNex(amount, reason, itemId) {
    return _post('/nex/spend', { amount, reason, itemId });
  }

  /* ══════════════════════════════════════════════════════════
     SHOP
  ══════════════════════════════════════════════════════════ */

  /** GET /shop/catalog — public, server-authoritative prices */
  async function getShopCatalog() {
    return _getPublic('/shop/catalog');
  }

  /** GET /shop/inventory — owned items + nex balance in one call */
  async function getShopInventory() {
    return _get('/shop/inventory');
  }

  /**
   * POST /shop/buy — atomic: validate price, deduct NEX, add item.
   * Response: { message, itemId, category, pricePaid, nexBalance }
   */
  async function shopBuy(itemId, category) {
    return _post('/shop/buy', { itemId, category });
  }

  /* ══════════════════════════════════════════════════════════
     CHARACTERS
  ══════════════════════════════════════════════════════════ */

  async function getUnlockedCharacters() {
    return _get('/characters/unlocked');
  }

  /** POST /characters/unlock — alternative to /shop/buy for chars */
  async function unlockCharacter(characterId) {
    return _post('/characters/unlock', { characterId });
  }

  /* ══════════════════════════════════════════════════════════
     BATTLE PASS
  ══════════════════════════════════════════════════════════ */

  async function getBattlePass() {
    return _get('/battlepass/me');
  }

  async function addBattlePassXP(xp) {
    return _post('/battlepass/xp', { xp });
  }

  /* ══════════════════════════════════════════════════════════
     ACCOUNT XP
  ══════════════════════════════════════════════════════════ */

  async function addAccountXP(xp) {
    return _post('/account/xp', { xp });
  }

  /* ══════════════════════════════════════════════════════════
     SESSION SAVE  (called at end of every game)
  ══════════════════════════════════════════════════════════ */

  async function saveSession(payload) {
    return _post('/session/save', payload);
  }

  /* ══════════════════════════════════════════════════════════
     LEADERBOARD  (all public)
  ══════════════════════════════════════════════════════════ */

  /** type: kills | waves | level | nex | campaign */
  async function getLeaderboard(type = 'kills') {
    return _getPublic(`/leaderboard/${encodeURIComponent(type)}`);
  }

  async function getMapLeaderboard(mapId) {
    return _getPublic(`/leaderboard/map/${encodeURIComponent(mapId)}`);
  }

  /* ══════════════════════════════════════════════════════════
     STATS
  ══════════════════════════════════════════════════════════ */

  async function getStats() {
    return _get('/stats/me');
  }

  /** GET /stats/global — public */
  async function getGlobalStats() {
    return _getPublic('/stats/global');
  }

  /* ══════════════════════════════════════════════════════════
     INVENTORY  (legacy — prefer /shop/buy + /shop/inventory)
  ══════════════════════════════════════════════════════════ */

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

  /* ══════════════════════════════════════════════════════════
     AUTH ADMIN
  ══════════════════════════════════════════════════════════ */

  async function getAllUsers() {
    return _get('/auth/users');
  }

  async function deleteAccount(name) {
    return _delete(`/auth/account/${encodeURIComponent(name)}`);
  }

  /* ── Public exports ────────────────────────────────────── */
  return {
    // Profile
    getProfile, getProfileByName,
    // NEX
    getNex, addNex, spendNex,
    // Shop
    getShopCatalog, getShopInventory, shopBuy,
    // Characters
    getUnlockedCharacters, unlockCharacter,
    // Battle Pass
    getBattlePass, addBattlePassXP,
    // Account
    addAccountXP,
    // Session
    saveSession,
    // Leaderboard
    getLeaderboard, getMapLeaderboard,
    // Stats
    getStats, getGlobalStats,
    // Inventory (legacy)
    getInventory, addWeapon, addUpgrade, addVehicle, updateGrenades,
    // Auth admin
    getAllUsers, deleteAccount,
  };
})();
