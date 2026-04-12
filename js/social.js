/* ═══════════════════════════════════════════════════════════
   NEON CITY — Social API Module
   REST wrappers for Friends, DMs, Clans, Notifications.
   Depends on: auth.js (must load first)
   ═══════════════════════════════════════════════════════════ */

const Social = (() => {
  'use strict';

  const BASE = 'https://game-backend-wfmf.onrender.com';

  function _token() {
    return Auth.getSession()?.token ?? '';
  }

  async function _get(path) {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_token()}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  }

  async function _getPublic(path) {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  }

  async function _post(path, body = {}) {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_token()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  }

  async function _delete(path) {
    const res = await fetch(`${BASE}${path}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_token()}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  }

  async function _patch(path, body = {}) {
    const res = await fetch(`${BASE}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_token()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  }

  /* ══════════════════════════════════════════════════════════
     FRIENDS
  ══════════════════════════════════════════════════════════ */

  const Friends = {
    send: (targetName) => _post('/friends/request', { targetName }),
    incoming: () => _get('/friends/requests/incoming'),
    outgoing: () => _get('/friends/requests/outgoing'),
    accept: (requestId) => _post(`/friends/request/${requestId}/accept`),
    reject: (requestId) => _post(`/friends/request/${requestId}/reject`),
    cancel: (requestId) => _delete(`/friends/request/${requestId}`),
    list: () => _get('/friends'),
    remove: (friendName) => _delete(`/friends/${encodeURIComponent(friendName)}`),
    online: () => _get('/friends/online'),
    heartbeat: (status = 'menu') => _post('/friends/heartbeat', { status }),
  };

  /* ══════════════════════════════════════════════════════════
     DIRECT MESSAGES
  ══════════════════════════════════════════════════════════ */

  const DM = {
    conversations: () => _get('/dm/conversations'),
    messages: (conversationId, limit = 50, before = null) => {
      let q = `/dm/conversations/${conversationId}/messages?limit=${limit}`;
      if (before) q += `&before=${before}`;
      return _get(q);
    },
    send: (toName, content) => _post('/dm/send', { toName, content }),
    markRead: (conversationId) => _post(`/dm/conversations/${conversationId}/read`),
    unread: () => _get('/dm/unread'),
    deleteMessage: (messageId) => _delete(`/dm/messages/${messageId}`),
  };

  /* ══════════════════════════════════════════════════════════
     CLANS
  ══════════════════════════════════════════════════════════ */

  const Clans = {
    create: (body) => _post('/clans', body),
    browse: (q = '', page = 1, sortBy = 'members') =>
      _getPublic(`/clans?q=${encodeURIComponent(q)}&page=${page}&limit=20&sortBy=${sortBy}`),
    get: (clanId) => _getPublic(`/clans/${clanId}`),
    me: () => _get('/clans/me'),
    join: (clanId) => _post(`/clans/${clanId}/join`),
    leave: () => _post('/clans/leave'),
    disband: (clanId) => _delete(`/clans/${clanId}`),
    update: (clanId, body) => _patch(`/clans/${clanId}`, body),
    invite: (clanId, targetName) => _post(`/clans/${clanId}/invite`, { targetName }),
    myInvites: () => _get('/clans/invites'),
    acceptInvite: (inviteId) => _post(`/clans/invites/${inviteId}/accept`),
    rejectInvite: (inviteId) => _post(`/clans/invites/${inviteId}/reject`),
    kick: (clanId, targetName) => _delete(`/clans/${clanId}/members/${encodeURIComponent(targetName)}`),
    promote: (clanId, targetName) => _post(`/clans/${clanId}/members/${encodeURIComponent(targetName)}/promote`),
    demote: (clanId, targetName) => _post(`/clans/${clanId}/members/${encodeURIComponent(targetName)}/demote`),
    transfer: (clanId, targetName) => _post(`/clans/${clanId}/transfer`, { targetName }),
    chatHistory: (clanId, limit = 50, before = null) => {
      let q = `/clans/${clanId}/chat?limit=${limit}`;
      if (before) q += `&before=${before}`;
      return _get(q);
    },
    chatSend: (clanId, content) => _post(`/clans/${clanId}/chat`, { content }),
  };

  /* ══════════════════════════════════════════════════════════
     NOTIFICATIONS
  ══════════════════════════════════════════════════════════ */

  const Notifications = {
    list: (limit = 30, unreadOnly = false) =>
      _get(`/notifications?limit=${limit}&unreadOnly=${unreadOnly}`),
    markRead: (notificationId) => _post(`/notifications/${notificationId}/read`),
    markAllRead: () => _post('/notifications/read-all'),
    unreadCount: () => _get('/notifications/unread-count'),
  };

  /* ══════════════════════════════════════════════════════════
     PLAYER SEARCH
  ══════════════════════════════════════════════════════════ */

  const Players = {
    search: (q, limit = 10) =>
      _getPublic(`/players/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  };

  return { Friends, DM, Clans, Notifications, Players };
})();
