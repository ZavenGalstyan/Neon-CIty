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
    const myId   = Auth.getSession()?.id   || _myUserId || '';
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
      // Determine which remote player entry to update:
      // 1. Use userId if provided and exists in map
      // 2. Use first existing remote player if userId missing
      // 3. Create a new entry if map is completely empty (most common case when backend omits userId)
      let targetId = (userId && remotePlayers.has(userId)) ? userId
                   : remotePlayers.size > 0 ? remotePlayers.keys().next().value
                   : userId || '__remote_0';

      let rp = remotePlayers.get(targetId);
      if (!rp) {
        // Create the remote player on first position received
        rp = {
          x: x, y: y, targetX: x, targetY: y,
          angle: angle || 0,
          hp: hp || 100, maxHp: 100,
          weaponId: weaponId || 'pistol',
          username: 'PLAYER', charId: 'gangster',
          dead: false
        };
        remotePlayers.set(targetId, rp);
      }
      rp.targetX  = x;
      rp.targetY  = y;
      rp.angle    = angle !== undefined ? angle : rp.angle;
      rp.hp       = hp    !== undefined ? hp    : rp.hp;
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

    // bot:spawn — host relayed a new enemy spawn; non-host clients create the bot
    WS.on('bot:spawn', ({ id, x, y, type, wave, waveSize }) => {
      if (window._game && !window._game._isHost) {
        window._game._addRemoteBot({ id, x, y, type, wave, waveSize });
      }
    });

    // bot:dead — another player killed this bot; remove it from our simulation
    WS.on('bot:dead', ({ id }) => {
      if (!window._game || !id) return;
      const bot = window._game.bots.find(b => b._id === id && !b.dead);
      if (bot) bot.dead = true;
      if (window._game.boss && window._game.boss._id === id && !window._game.boss.dead) {
        window._game.boss.dead = true;
      }
    });

    // bot:positions — host broadcast; non-host lerps bots to authoritative positions
    WS.on('bot:positions', ({ bots }) => {
      if (!window._game || !bots || window._game._isHost) return;
      for (const upd of bots) {
        const bot = window._game.bots.find(b => b._id === upd.id && !b.dead && !b.dying);
        if (!bot) continue;
        // Snap if far, lerp if close — avoids rubber-banding on small drift
        const dx = upd.x - bot.x, dy = upd.y - bot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 120) {
          bot.x = upd.x; bot.y = upd.y;
        } else if (dist > 4) {
          bot.x += dx * 0.3;
          bot.y += dy * 0.3;
        }
        if (upd.hp !== undefined) bot.health = upd.hp;
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
    // Recover angle from velocity components — works even if .angle is missing
    const angle = (bullet.angle !== undefined)
      ? bullet.angle
      : Math.atan2(bullet.vy, bullet.vx);
    WS.send('player:shoot', {
      x:        bullet.x,
      y:        bullet.y,
      angle:    angle,
      weaponId: weaponId || 'pistol',
      bulletId: Math.random().toString(36).slice(2)
    });
  }

  function sendDead() {
    WS.send('player:dead', { killedBy: 'bot' });
  }

  function sendBotSpawn(bot, wave, waveSize) {
    if (!bot._id) return;
    WS.send('bot:spawn', {
      id:       bot._id,
      x:        Math.round(bot.x),
      y:        Math.round(bot.y),
      type:     bot.type || 'normal',
      wave:     wave || 1,
      waveSize: waveSize || 0
    });
  }

  function sendBotDead(botId) {
    if (!botId) return;
    WS.send('bot:dead', { id: botId });
  }

  function sendBotPositions(bots) {
    const positions = [];
    for (const b of bots) {
      if (!b._id || b.dead || b.dying) continue;
      positions.push({ id: b._id, x: Math.round(b.x), y: Math.round(b.y), hp: b.health });
    }
    if (positions.length === 0) return;
    WS.send('bot:positions', { bots: positions });
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
    sendBotSpawn, sendBotDead, sendBotPositions,
    updateRemotePlayers,
    getRoom, isHost, getRemotePlayers, setMyUserId, setRoom, setIsHost
  };
})();
