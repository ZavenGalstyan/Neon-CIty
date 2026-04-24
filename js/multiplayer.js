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

  /* ── Sync remotePlayers from authoritative room state ─────── */
  function _syncFromRoom(room) {
    if (!room || !room.players) return;
    const myName = (Auth.getSession()?.name || '').toLowerCase();
    const myId   = Auth.getSession()?.id   || '';
    room.players.forEach(p => {
      // Skip self
      const pid = String(p.userId || p._id || '');
      if (pid === String(myId)) return;
      if ((p.username || '').toLowerCase() === myName) return;
      // Add or update entry
      if (!remotePlayers.has(pid)) {
        remotePlayers.set(pid, {
          x: 0, y: 0, targetX: 0, targetY: 0,
          angle: 0,
          hp:    p.hp    || 100,
          maxHp: p.maxHp || 100,
          username: p.username || 'PLAYER',
          charId:   p.charId   || 'gangster',
          dead: false
        });
      }
    });
  }

  let _gameEventsBound = false;
  function bindGameEvents() {
    if (_gameEventsBound) return;
    _gameEventsBound = true;

    // room:state — sent by backend after room:rejoin
    // This is the authoritative player list; use it to populate remotePlayers
    WS.on('room:state', ({ room }) => {
      _syncFromRoom(room);
    });

    // room:player_rejoined — a teammate reconnected after page navigate
    WS.on('room:player_rejoined', ({ userId, username }) => {
      if (!remotePlayers.has(userId)) {
        remotePlayers.set(userId, {
          x: 0, y: 0, targetX: 0, targetY: 0,
          angle: 0, hp: 100, maxHp: 100,
          username: username || 'PLAYER',
          charId: 'gangster', dead: false
        });
      } else {
        // They were already there (from localStorage) — just mark alive
        remotePlayers.get(userId).dead = false;
      }
    });

    // _applyRemotePos: shared logic for both 'remote:pos' and 'player:pos' relay
    function _applyRemotePos(userId, x, y, angle, hp, weaponId) {
      // If userId missing (backend relay bug), fall back to first remote player
      let targetId = userId;
      if (!targetId || !remotePlayers.has(targetId)) {
        targetId = remotePlayers.keys().next().value;
      }
      if (!targetId) return;

      let rp = remotePlayers.get(targetId);
      if (!rp) {
        rp = { x, y, targetX: x, targetY: y, angle: angle || 0, hp: hp || 100, maxHp: 100, weaponId: weaponId || 'pistol', username: 'PLAYER', charId: 'gangster', dead: false };
        remotePlayers.set(targetId, rp);
      }
      rp.targetX  = x;
      rp.targetY  = y;
      rp.angle    = angle || rp.angle;
      rp.hp       = hp    !== undefined ? hp : rp.hp;
      rp.weaponId = weaponId || rp.weaponId;
      rp.dead     = false;
    }

    // _applyRemoteShoot: shared logic for both 'remote:shoot' and 'player:shoot' relay
    function _applyRemoteShoot(x, y, angle, weaponId) {
      if (!window._game) return;
      const cfg   = (CONFIG.WEAPONS || []).find(w => w.id === weaponId) || {};
      const color = cfg.color || '#FF4444';
      const spd   = cfg.bulletSpeed || 420;
      const b     = new Bullet(x, y, angle || 0, spd, 0, false, color);
      b._isRemote = true;
      window._game.bullets.push(b);
    }

    // Backend correctly sends remote:pos (future-proof)
    WS.on('remote:pos', ({ userId, x, y, angle, hp, weaponId }) => {
      _applyRemotePos(userId, x, y, angle, hp, weaponId);
    });

    // Backend currently relays as player:pos (relay type bug) — handle both
    WS.on('player:pos', ({ userId, x, y, angle, hp, weaponId }) => {
      // Only process if it came FROM the server (relay), not our own echo
      // WS never echoes our own sends, so any player:pos WE RECEIVE is a relay
      _applyRemotePos(userId, x, y, angle, hp, weaponId);
    });

    WS.on('remote:shoot', ({ userId, x, y, angle, weaponId }) => {
      _applyRemoteShoot(x, y, angle, weaponId);
    });

    // Backend currently relays as player:shoot — handle both
    WS.on('player:shoot', ({ userId, x, y, angle, weaponId }) => {
      _applyRemoteShoot(x, y, angle, weaponId);
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
      const pid = String(player.userId || player._id || '');
      if (pid && !remotePlayers.has(pid)) {
        remotePlayers.set(pid, {
          x: 0, y: 0, targetX: 0, targetY: 0,
          angle: 0, hp: player.hp || 100, maxHp: player.maxHp || 100,
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
