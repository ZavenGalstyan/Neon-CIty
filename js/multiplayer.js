/* ═══════════════════════════════════════════════════════════
   DASH DREAD — Multiplayer Manager
   Handles: room CRUD, WS event routing, remote player state.
   Depends on: api.js, ws.js, auth.js (must load first)
   ═══════════════════════════════════════════════════════════ */

const Multiplayer = (() => {
  'use strict';

  /* ── State ───────────────────────────────────────────────── */
  let _currentRoom  = null;   // full room object from backend
  let _isHost       = false;
  let _myUserId     = null;

  /* Remote players: userId → { x,y,targetX,targetY,angle,hp,maxHp,weaponId,username,charId,dead } */
  const remotePlayers = new Map();

  /* ── Room API helpers ────────────────────────────────────── */
  async function createRoom(mapId, charId, maxPlayers = 4) {
    const res = await _postProtected('/rooms/create', { mapId, charId, maxPlayers });
    _currentRoom = res.room;
    _isHost      = true;
    return res;
  }

  async function listRooms(mapId = null) {
    const url  = mapId ? `/rooms?mapId=${encodeURIComponent(mapId)}` : '/rooms';
    const res  = await _getProtected(url);
    return res.rooms || [];
  }

  async function joinRoom(roomId, charId) {
    const res = await _postProtected(`/rooms/${encodeURIComponent(roomId)}/join`, { charId });
    _currentRoom = res.room;
    _isHost      = false;
    return res.room;
  }

  async function leaveRoom() {
    if (!_currentRoom) return;
    try { await _postProtected(`/rooms/${_currentRoom.roomId}/leave`, {}); } catch {}
    _currentRoom = null;
    _isHost      = false;
    remotePlayers.clear();
  }

  async function startRoom() {
    if (!_currentRoom || !_isHost) return;
    await _postProtected(`/rooms/${_currentRoom.roomId}/start`, {});
  }

  async function markReady() {
    WS.send('room:ready', {});
  }

  /* ── Internal HTTP helpers ───────────────────────────────── */
  const BASE = 'https://game-backend-wfmf.onrender.com';

  function _token() {
    return Auth.getSession()?.token ?? '';
  }

  async function _getProtected(path) {
    const res  = await fetch(`${BASE}${path}`, {
      headers: { 'Authorization': `Bearer ${_token()}`, 'Content-Type': 'application/json' }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  }

  async function _postProtected(path, body) {
    const res  = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${_token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  }

  /* ── WS event binding ────────────────────────────────────── */
  function bindLobbyEvents(callbacks) {
    // callbacks: { onPlayerJoined, onPlayerLeft, onPlayerReady, onStart }
    WS.on('room:player_joined', ({ player }) => {
      remotePlayers.set(player.userId, {
        x: 0, y: 0, targetX: 0, targetY: 0,
        angle: 0, hp: player.hp, maxHp: player.maxHp || 100,
        username: player.username, charId: player.charId, dead: false
      });
      callbacks.onPlayerJoined && callbacks.onPlayerJoined(player);
    });

    WS.on('room:player_left', ({ userId, newHostId }) => {
      remotePlayers.delete(userId);
      callbacks.onPlayerLeft && callbacks.onPlayerLeft(userId, newHostId);
      const myId = Auth.getSession()?.id || _myUserId;
      if (newHostId && (newHostId === myId || String(newHostId) === String(myId))) {
        _isHost = true;
      }
    });

    WS.on('room:player_ready', ({ userId }) => {
      callbacks.onPlayerReady && callbacks.onPlayerReady(userId);
    });

    WS.on('room:start', ({ roomId, mapId }) => {
      callbacks.onStart && callbacks.onStart(roomId, mapId);
    });
  }

  let _gameEventsBound = false;
  function bindGameEvents() {
    if (_gameEventsBound) return;
    _gameEventsBound = true;
    WS.on('remote:pos', ({ userId, x, y, angle, hp, weaponId }) => {
      const rp = remotePlayers.get(userId);
      if (rp) {
        rp.targetX  = x;
        rp.targetY  = y;
        rp.angle    = angle;
        rp.hp       = hp;
        rp.weaponId = weaponId;
        rp.dead     = false;
      }
    });

    WS.on('remote:shoot', ({ userId, x, y, angle, weaponId }) => {
      // Spawn a visual remote bullet in the game if it's running
      if (window._game) {
        const cfg   = (CONFIG.WEAPONS || []).find(w => w.id === weaponId) || {};
        const color = cfg.color || '#FF4444';
        const spd   = cfg.bulletSpeed || 420;
        const dmg   = 0; // remote bullets are visual-only, no local damage
        const b     = new Bullet(x, y, angle, spd, dmg, false, color);
        b._isRemote = true;
        window._game.bullets.push(b);
      }
    });

    WS.on('remote:dead', ({ userId }) => {
      const rp = remotePlayers.get(userId);
      if (rp) rp.dead = true;
    });

    WS.on('remote:revive', ({ userId }) => {
      const rp = remotePlayers.get(userId);
      if (rp) { rp.dead = false; rp.hp = rp.maxHp || 100; }
    });

    WS.on('room:player_joined', ({ player }) => {
      // In-game join (late join)
      if (!remotePlayers.has(player.userId)) {
        remotePlayers.set(player.userId, {
          x: 0, y: 0, targetX: 0, targetY: 0,
          angle: 0, hp: player.hp, maxHp: player.maxHp || 100,
          username: player.username, charId: player.charId, dead: false
        });
      }
    });

    WS.on('room:player_left', ({ userId }) => {
      remotePlayers.delete(userId);
    });

    WS.on('room:wave_start', ({ wave }) => {
      if (window._game) window._game.wave = wave;
    });

    WS.on('room:finished', ({ stats }) => {
      if (window._game) {
        window._game._mpFinished = true;
        window._game._mpStats    = stats;
      }
    });
  }

  /* ── Position broadcast (called from game loop) ─────────── */
  function sendPos(player, roomId) {
    WS.send('player:pos', {
      x:        player.x,
      y:        player.y,
      angle:    player.angle || 0,
      hp:       player.hp,
      weaponId: player.equippedWeaponId || 'pistol'
    });
  }

  function sendShoot(bullet, weaponId) {
    WS.send('player:shoot', {
      x:        bullet.x,
      y:        bullet.y,
      angle:    bullet.angle || 0,
      weaponId: weaponId || 'pistol',
      bulletId: Math.random().toString(36).slice(2)
    });
  }

  function sendDead() {
    WS.send('player:dead', { killedBy: 'bot' });
  }

  function sendWaveAck(wave) {
    WS.send('room:wave_ack', { wave });
  }

  function sendFinished(players, wave) {
    WS.send('room:finished', {
      stats: players.map(p => ({
        userId: p.userId, username: p.username,
        kills: p.kills || 0, wave
      }))
    });
  }

  /* ── Interpolation (call every frame in game update) ──────── */
  function updateRemotePlayers(dt) {
    const alpha = Math.min(1, dt * 20); // ~20 lerps/sec
    for (const [, rp] of remotePlayers) {
      if (rp.targetX !== undefined) {
        rp.x = rp.x + (rp.targetX - rp.x) * alpha;
        rp.y = rp.y + (rp.targetY - rp.y) * alpha;
      }
    }
  }

  /* ── Getters ─────────────────────────────────────────────── */
  function getRoom()           { return _currentRoom; }
  function isHost()            { return _isHost; }
  function getRemotePlayers()  { return remotePlayers; }
  function setMyUserId(id)     { _myUserId = id; }
  function setRoom(room)       { _currentRoom = room; }
  function setIsHost(v)        { _isHost = v; }

  return {
    createRoom, listRooms, joinRoom, leaveRoom, startRoom, markReady,
    bindLobbyEvents, bindGameEvents,
    sendPos, sendShoot, sendDead, sendWaveAck, sendFinished,
    updateRemotePlayers,
    getRoom, isHost, getRemotePlayers, setMyUserId, setRoom, setIsHost
  };
})();
