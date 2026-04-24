/* ═══════════════════════════════════════════════════════════
   NEON CITY — WebSocket Manager
   Auto-reconnect with exponential backoff.
   Depends on: auth.js
   ═══════════════════════════════════════════════════════════ */

const WS = (() => {
  'use strict';

  const WS_URL = 'wss://game-backend-wfmf.onrender.com/ws';
  const DELAYS = [2000, 5000, 10000]; // reconnect backoff steps

  let _socket = null;
  let _handlers = {};        // type → [fn, ...]
  let _retryIndex = 0;
  let _retryTimer = null;
  let _pingInterval = null;
  let _active = false;       // set false when explicitly disconnected
  let _pollInterval = null;  // fallback polling timer

  /* ── Event subscription ─────────────────────────────────── */
  function on(type, fn) {
    if (!_handlers[type]) _handlers[type] = [];
    _handlers[type].push(fn);
  }

  function off(type, fn) {
    if (!_handlers[type]) return;
    _handlers[type] = _handlers[type].filter(h => h !== fn);
  }

  function _emit(type, payload) {
    (_handlers[type] || []).forEach(fn => { try { fn(payload); } catch(e) { console.error('[WS] handler error', e); } });
  }

  /* ── Connect ─────────────────────────────────────────────── */
  function connect() {
    const session = Auth.getSession();
    if (!session?.token) return;

    _active = true;
    _stopPoll(); // stop fallback if WS connects

    try {
      _socket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(session.token)}`);
    } catch(e) {
      console.warn('[WS] WebSocket not available, using polling');
      _startPoll();
      return;
    }

    _socket.addEventListener('open', () => {
      console.log('[WS] connected');
      _retryIndex = 0;
      _stopPoll();
      _startPing();
      _emit('connected', {});
    });

    _socket.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.type === 'pong') return;
      _emit(msg.type, msg.payload || {});
      _emit('*', msg); // wildcard for catch-all listeners
    });

    _socket.addEventListener('close', (ev) => {
      _stopPing();
      if (!_active) return; // intentional disconnect
      console.warn(`[WS] closed (${ev.code}), reconnecting...`);
      _emit('disconnected', { code: ev.code });
      _scheduleReconnect();
      _startPoll(); // fallback while disconnected
    });

    _socket.addEventListener('error', () => {
      // error always followed by close; let close handler deal with it
    });
  }

  function disconnect() {
    _active = false;
    _stopPing();
    _stopPoll();
    clearTimeout(_retryTimer);
    if (_socket) { _socket.close(); _socket = null; }
  }

  /* ── Send ───────────────────────────────────────────────── */
  function send(type, payload = {}) {
    if (_socket && _socket.readyState === WebSocket.OPEN) {
      _socket.send(JSON.stringify({ type, payload }));
      return true;
    }
    return false;
  }

  /* ── Ping keepalive ─────────────────────────────────────── */
  function _startPing() {
    _stopPing();
    _pingInterval = setInterval(() => {
      send('ping');
      // also send heartbeat every 30s — detect if we're ingame
      const _inGame = !!(window._game && window._game._roomId);
      send('heartbeat', { status: _inGame ? 'ingame' : 'menu' });
    }, 30000);
  }

  function _stopPing() {
    clearInterval(_pingInterval);
    _pingInterval = null;
  }

  /* ── Reconnect backoff ──────────────────────────────────── */
  function _scheduleReconnect() {
    clearTimeout(_retryTimer);
    const delay = DELAYS[Math.min(_retryIndex, DELAYS.length - 1)];
    _retryIndex++;
    _retryTimer = setTimeout(() => {
      if (_active) connect();
    }, delay);
  }

  /* ── Polling fallback ───────────────────────────────────── */
  function _startPoll() {
    if (_pollInterval) return;
    _pollInterval = setInterval(async () => {
      if (!Auth.getSession()?.token) return;
      try {
        const { count } = await Social.Notifications.unreadCount();
        _emit('poll_unread', { count });
      } catch { /* ignore */ }
    }, 15000);
  }

  function _stopPoll() {
    clearInterval(_pollInterval);
    _pollInterval = null;
  }

  /* ── Public helpers ─────────────────────────────────────── */
  function isConnected() {
    return _socket && _socket.readyState === WebSocket.OPEN;
  }

  return { connect, disconnect, send, on, off, isConnected };
})();
