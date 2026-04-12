/* ═══════════════════════════════════════════════════════════
   NEON CITY — Social UI  v3
   Three full-page overlays: Friends · Chat · Clans
   Depends on: auth.js, social.js, ws.js
   ═══════════════════════════════════════════════════════════ */

const SocialUI = (() => {
  'use strict';

  /* ── State ───────────────────────────────────────────────── */
  const S = {
    me: null,
    friends: [], incoming: [], outgoing: [],
    conversations: [], unreadDM: 0,
    activeDM: null, dmMessages: [], dmHasMore: false,
    clanData: null, clanInvites: [], clanBrowse: [], clanChatMessages: [],
    clanView: 'browse',
    searchResults: [],
    unreadNotif: 0,
    heartbeatTimer: null,
    activePage: null,   // 'friends' | 'chat' | 'clans' | null
  };

  /* ══════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */
  async function init() {
    if (!Auth.isLoggedIn()) return;
    S.me = Auth.getSession();

    _buildHTML();
    _bindGlobalEvents();
    _injectNav();

    WS.on('dm_received',             _wsOnDM);
    WS.on('clan_message_received',   _wsOnClanMsg);
    WS.on('friend_request_received', _wsOnFriendReq);
    WS.on('friend_accepted',         _wsOnFriendAccepted);
    WS.on('clan_invite_received',    _wsOnClanInvite);
    WS.on('clan_kicked',             _wsOnKicked);
    WS.on('friend_online',           p => _updateOnline(p.name, true));
    WS.on('friend_offline',          p => _updateOnline(p.name, false));
    WS.on('poll_unread',             p => _setNotifCount(p.count));
    WS.connect();

    _startHeartbeat();
    await _refreshAll();
  }

  async function _refreshAll() {
    const results = await Promise.allSettled([
      Social.Friends.list(),
      Social.Friends.incoming(),
      Social.Friends.outgoing(),
      Social.DM.conversations(),
      Social.Notifications.unreadCount(),
    ]);
    if (results[0].status==='fulfilled') S.friends      = results[0].value.friends  || [];
    if (results[1].status==='fulfilled') S.incoming     = results[1].value.requests || [];
    if (results[2].status==='fulfilled') S.outgoing     = results[2].value.requests || [];
    if (results[3].status==='fulfilled') { S.conversations = results[3].value.conversations || []; S.unreadDM = results[3].value.totalUnread || 0; }
    if (results[4].status==='fulfilled') _setNotifCount(results[4].value.count || 0);

    try { S.clanData    = await Social.Clans.me(); }       catch { S.clanData = null; }
    try { S.clanInvites = (await Social.Clans.myInvites()).invites || []; } catch { /* ignore */ }

    _refreshBadges();
    _rerenderActivePage();
  }

  /* ══════════════════════════════════════════════════════════
     INJECT NAV BUTTONS
  ══════════════════════════════════════════════════════════ */
  function _injectNav() {
    const try_ = () => {
      const nav = document.getElementById('siteNav');
      if (!nav) return;
      if (nav.querySelector('.ncs-nav-friends-btn')) return;

      // CLANS
      const clanBtn = document.createElement('button');
      clanBtn.className = 'nav-btn ncs-nav-btn';
      clanBtn.id = 'ncsNavClanBtn';
      clanBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> CLANS`;
      clanBtn.onclick = () => openPage('clans');

      // FRIENDS
      const friendBtn = document.createElement('button');
      friendBtn.className = 'ncs-nav-icon-btn ncs-nav-friends-btn';
      friendBtn.id = 'ncsNavFriendsBtn';
      friendBtn.title = 'Friends';
      friendBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><span class="ncs-nav-badge" id="ncsNavFriendBadge" style="display:none">0</span>`;
      friendBtn.onclick = () => openPage('friends');

      // NOTIF
      const notifBtn = document.createElement('button');
      notifBtn.className = 'ncs-nav-icon-btn';
      notifBtn.id = 'ncsNavNotifBtn';
      notifBtn.title = 'Notifications';
      notifBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span class="ncs-nav-badge" id="ncsNavNotifBadge" style="display:none">0</span>`;
      notifBtn.onclick = () => openPage('friends'); // opens friends with requests visible

      const links = nav.querySelector('.nav-links');
      const acct  = nav.querySelector('.nav-account') || nav.lastElementChild;
      if (links) links.prepend(clanBtn);
      else nav.insertBefore(clanBtn, acct);
      nav.insertBefore(notifBtn, acct);
      nav.insertBefore(friendBtn, notifBtn);
    };
    try_(); setTimeout(try_, 300); setTimeout(try_, 900);
  }

  /* ══════════════════════════════════════════════════════════
     BUILD ALL PAGE HTML
  ══════════════════════════════════════════════════════════ */
  function _buildHTML() {
    if (document.getElementById('ncs-root')) return;
    const root = document.createElement('div');
    root.id = 'ncs-root';
    root.innerHTML = `
      <!-- FAB -->
      <button class="ncs-fab" id="ncsFab" aria-label="Open Chat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="22" height="22">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span class="ncs-fab-badge" id="ncsFabBadge" style="display:none"></span>
      </button>

      <!-- ══ FRIENDS PAGE ════════════════════════════════════ -->
      <div class="ncs-page" id="ncsPageFriends">
        <div class="ncs-topbar">
          <span class="ncs-topbar-icon">👥</span>
          <div>
            <div class="ncs-topbar-title">FRIENDS</div>
            <div class="ncs-topbar-sub" id="ncsFriendsCount">Loading…</div>
          </div>
          <button class="ncs-close-btn" data-close="friends">✕</button>
        </div>
        <div class="ncs-page-body">
          <!-- Left: friends list -->
          <div class="ncs-sidebar">
            <div class="ncs-search-box">
              <div class="ncs-search-wrap">
                <span class="ncs-search-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </span>
                <input class="ncs-input" id="ncsFriendSearch" placeholder="Search your friends…" autocomplete="off"/>
              </div>
            </div>
            <div class="ncs-list" id="ncsFriendsList"></div>
          </div>
          <!-- Right: add + requests -->
          <div class="ncs-friends-right">
            <div class="ncs-panel-section">
              <div class="ncs-panel-section-title">ADD FRIEND</div>
              <div class="ncs-add-row">
                <input class="ncs-input ncs-input-plain" id="ncsAddInput" placeholder="Enter player name…" autocomplete="off"/>
                <button class="ncs-btn ncs-btn-sm" id="ncsAddBtn">Search</button>
              </div>
              <div class="ncs-search-results" id="ncsAddResults"></div>
            </div>
            <div class="ncs-sec-label ncs-sec-label-purple" id="ncsReqLabel" style="display:none"></div>
            <div class="ncs-requests-list" id="ncsRequestsList"></div>
          </div>
        </div>
      </div>

      <!-- ══ CHAT PAGE ════════════════════════════════════ -->
      <div class="ncs-page" id="ncsPageChat">
        <div class="ncs-topbar">
          <span class="ncs-topbar-icon">💬</span>
          <div>
            <div class="ncs-topbar-title">MESSAGES</div>
            <div class="ncs-topbar-sub" id="ncsChatUnreadSub"></div>
          </div>
          <button class="ncs-close-btn" data-close="chat">✕</button>
        </div>
        <div class="ncs-page-body">
          <!-- Left: conversation list -->
          <div class="ncs-sidebar">
            <div class="ncs-search-box">
              <div class="ncs-search-wrap">
                <span class="ncs-search-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </span>
                <input class="ncs-input" id="ncsConvSearch" placeholder="Search conversations…" autocomplete="off"/>
              </div>
            </div>
            <div class="ncs-list" id="ncsConvList"></div>
          </div>
          <!-- Right: chat window -->
          <div class="ncs-chat-window" id="ncsChatWindow">
            <div class="ncs-no-conv" id="ncsNoChatSel">
              <div class="ncs-no-conv-icon">💬</div>
              <div>Select a conversation<br>or message a friend</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ CLANS PAGE ════════════════════════════════════ -->
      <div class="ncs-page" id="ncsPageClans">
        <div class="ncs-topbar">
          <span class="ncs-topbar-icon">⭐</span>
          <div>
            <div class="ncs-topbar-title">CLANS</div>
            <div class="ncs-topbar-sub" id="ncsClansTopSub"></div>
          </div>
          <button class="ncs-close-btn" data-close="clans">✕</button>
        </div>
        <div class="ncs-page-body">
          <!-- Left sidebar nav -->
          <div class="ncs-clan-sidenav" id="ncsClanSideNav"></div>
          <!-- Content area -->
          <div class="ncs-clan-content" id="ncsClanContent"></div>
        </div>
      </div>

      <!-- Toasts -->
      <div class="ncs-toast-container" id="ncsToasts"></div>
    `;
    document.body.appendChild(root);
  }

  /* ══════════════════════════════════════════════════════════
     OPEN / CLOSE PAGES
  ══════════════════════════════════════════════════════════ */
  function openPage(page) {
    // Close current
    if (S.activePage) document.getElementById(_pageId(S.activePage))?.classList.remove('ncs-open');

    S.activePage = page;
    document.getElementById(_pageId(page))?.classList.add('ncs-open');
    _renderPage(page);
    _refreshAll();
  }

  function closePage(page) {
    document.getElementById(_pageId(page))?.classList.remove('ncs-open');
    if (S.activePage === page) S.activePage = null;
  }

  function _pageId(p) {
    return p === 'friends' ? 'ncsPageFriends' : p === 'chat' ? 'ncsPageChat' : 'ncsPageClans';
  }

  function _rerenderActivePage() {
    if (S.activePage) _renderPage(S.activePage);
  }

  function _renderPage(page) {
    if (page === 'friends') _renderFriendsPage();
    if (page === 'chat')    _renderChatPage();
    if (page === 'clans')   _renderClansPage();
  }

  /* ── Global event binding ────────────────────────────────── */
  function _bindGlobalEvents() {
    document.getElementById('ncsFab').onclick = () => openPage('chat');

    document.addEventListener('click', e => {
      const closeBtn = e.target.closest('[data-close]');
      if (closeBtn) { closePage(closeBtn.dataset.close); return; }

      // Keyboard ESC handled below
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && S.activePage) closePage(S.activePage);
    });
  }

  /* ══════════════════════════════════════════════════════════
     FRIENDS PAGE RENDER
  ══════════════════════════════════════════════════════════ */
  function _renderFriendsPage() {
    const online  = S.friends.filter(f => f.isOnline);
    const offline = S.friends.filter(f => !f.isOnline);
    const countEl = document.getElementById('ncsFriendsCount');
    if (countEl) countEl.textContent = `${online.length} online · ${S.friends.length} total`;

    // Friends list
    const list = document.getElementById('ncsFriendsList');
    if (list) {
      let html = '';
      if (!S.friends.length) {
        html = `<div class="ncs-empty"><div class="ncs-empty-icon">👤</div>No friends yet — search for players!</div>`;
      } else {
        if (online.length) {
          html += `<div class="ncs-sec-label">ONLINE — ${online.length}</div>`;
          html += online.map(f => _htmlFriendRow(f)).join('');
        }
        if (offline.length) {
          html += `<div class="ncs-sec-label" style="opacity:0.45">OFFLINE — ${offline.length}</div>`;
          html += offline.map(f => _htmlFriendRow(f)).join('');
        }
      }
      list.innerHTML = html;
      list.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', _handleFriendAction));
      list.querySelectorAll('.ncs-person-row').forEach(el => el.addEventListener('click', e => {
        if (e.target.closest('[data-action]')) return;
        _startDMFromRow(el.dataset.name);
      }));
    }

    // Requests
    _renderRequestsPanel();

    // Search filter
    const searchInput = document.getElementById('ncsFriendSearch');
    if (searchInput) {
      searchInput.oninput = () => {
        const q = searchInput.value.toLowerCase();
        document.querySelectorAll('#ncsFriendsList .ncs-person-row').forEach(row => {
          row.style.display = q && !row.dataset.name.toLowerCase().includes(q) ? 'none' : '';
        });
      };
    }

    // Add friend
    const addBtn   = document.getElementById('ncsAddBtn');
    const addInput = document.getElementById('ncsAddInput');
    if (addBtn)   addBtn.onclick  = _doSearchPlayers;
    if (addInput) addInput.onkeydown = e => { if (e.key === 'Enter') _doSearchPlayers(); };
  }

  function _htmlFriendRow(f) {
    const tag = f.clanTag ? `<span class="ncs-clan-tag">[${_esc(f.clanTag)}]</span>` : '';
    const statusDot = f.isOnline
      ? `<span class="ncs-online-dot"></span> Online`
      : `<span class="ncs-offline-dot"></span> ${_timeAgo(f.lastSeen)}`;
    return `
      <div class="ncs-person-row" data-name="${_esc(f.name)}" title="Click to chat">
        <div class="ncs-av ${f.isOnline ? 'online' : ''}">${f.name[0].toUpperCase()}</div>
        <div class="ncs-person-info">
          <div class="ncs-person-name">${_esc(f.name)} ${tag}</div>
          <div class="ncs-person-sub">${statusDot} &nbsp;·&nbsp; Lv ${f.account?.level || 1}</div>
        </div>
        <div class="ncs-row-actions">
          <button class="ncs-icon-btn" data-action="dm" data-name="${_esc(f.name)}" title="Message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button class="ncs-icon-btn danger" data-action="remove" data-name="${_esc(f.name)}" title="Remove friend">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3z"/><path d="M8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3z"/><path d="M8 14c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/><line x1="20" y1="14" x2="20" y2="20"/><line x1="17" y1="17" x2="23" y2="17"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  function _renderRequestsPanel() {
    const reqLabel = document.getElementById('ncsReqLabel');
    const reqList  = document.getElementById('ncsRequestsList');
    if (!reqList) return;

    const total = S.incoming.length + S.outgoing.length + S.clanInvites.length;
    if (reqLabel) { reqLabel.style.display = total ? '' : 'none'; reqLabel.textContent = `PENDING — ${total}`; }

    if (!total) { reqList.innerHTML = `<div class="ncs-empty"><div class="ncs-empty-icon">📬</div>No pending requests</div>`; return; }

    let html = '';

    // Clan invites
    html += S.clanInvites.map(inv => `
      <div class="ncs-person-row">
        <div class="ncs-av ncs-av-clan">${_esc(inv.clanTag?.[0] || '⭐')}</div>
        <div class="ncs-person-info">
          <div class="ncs-person-name">${_esc(inv.clanName)} <span class="ncs-clan-tag">[${_esc(inv.clanTag)}]</span></div>
          <div class="ncs-person-sub">Clan invite from ${_esc(inv.fromName)}</div>
        </div>
        <div class="ncs-row-actions always">
          <button class="ncs-icon-btn success" data-action="accept-clan" data-id="${_esc(inv.id||inv._id)}" title="Join clan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <button class="ncs-icon-btn danger" data-action="reject-clan" data-id="${_esc(inv.id||inv._id)}" title="Decline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    // Incoming friend requests
    html += S.incoming.map(r => `
      <div class="ncs-person-row">
        <div class="ncs-av">${r.fromName[0].toUpperCase()}</div>
        <div class="ncs-person-info">
          <div class="ncs-person-name">${_esc(r.fromName)}</div>
          <div class="ncs-person-sub">Wants to be friends</div>
        </div>
        <div class="ncs-row-actions always">
          <button class="ncs-icon-btn success" data-action="accept-req" data-id="${_esc(r.id||r._id)}" title="Accept">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <button class="ncs-icon-btn danger" data-action="reject-req" data-id="${_esc(r.id||r._id)}" title="Decline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    // Outgoing requests
    html += S.outgoing.map(r => `
      <div class="ncs-person-row">
        <div class="ncs-av" style="opacity:0.6">${r.toName[0].toUpperCase()}</div>
        <div class="ncs-person-info">
          <div class="ncs-person-name">${_esc(r.toName)}</div>
          <div class="ncs-person-sub" style="opacity:0.55">Request sent · pending</div>
        </div>
        <div class="ncs-row-actions always">
          <button class="ncs-icon-btn danger" data-action="cancel-req" data-id="${_esc(r.id||r._id)}" title="Cancel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    reqList.innerHTML = html;
    reqList.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', _handleFriendAction));
  }

  /* ── Player search results ───────────────────────────────── */
  async function _doSearchPlayers() {
    const q = (document.getElementById('ncsAddInput')?.value || '').trim();
    if (!q) return;
    try {
      const res = await Social.Players.search(q);
      S.searchResults = res.players || [];
    } catch { S.searchResults = []; }
    _renderSearchResults();
  }

  function _renderSearchResults() {
    const box = document.getElementById('ncsAddResults');
    if (!box) return;
    if (!S.searchResults.length) {
      box.innerHTML = `<div style="padding:12px 4px; font-family:'Rajdhani',sans-serif; font-size:13px; color:rgba(255,255,255,0.3);">No players found.</div>`;
      return;
    }
    box.innerHTML = S.searchResults.map(p => {
      const isMe     = p.name === S.me?.name;
      const isFriend = S.friends.some(f => f.name === p.name);
      const isSent   = S.outgoing.some(r => r.toName === p.name);
      let action = '';
      if (!isMe && !isFriend && !isSent) {
        action = `<button class="ncs-btn ncs-btn-sm" data-action="add" data-name="${_esc(p.name)}">Add</button>`;
      } else if (isFriend) {
        action = `<span style="font-family:'Orbitron',monospace;font-size:9px;color:var(--ncs-green);letter-spacing:.1em;">FRIENDS</span>`;
      } else if (isSent) {
        action = `<span style="font-family:'Orbitron',monospace;font-size:9px;color:var(--ncs-muted);letter-spacing:.1em;">SENT</span>`;
      }
      const tag = p.clanTag ? `<span class="ncs-clan-tag">[${_esc(p.clanTag)}]</span>` : '';
      return `
        <div class="ncs-person-row" style="margin:2px 0;">
          <div class="ncs-av ncs-av-sm ${p.isOnline?'online':''}">${p.name[0].toUpperCase()}</div>
          <div class="ncs-person-info">
            <div class="ncs-person-name" style="font-size:14px;">${_esc(p.name)} ${tag}</div>
            <div class="ncs-person-sub">Lv ${p.account?.level || '?'}</div>
          </div>
          <div class="ncs-row-actions always">${action}</div>
        </div>
      `;
    }).join('');
    box.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', _handleFriendAction));
  }

  /* ── Friend actions (unified handler) ──────────────────── */
  function _handleFriendAction(e) {
    e.stopPropagation();
    const el = e.currentTarget;
    const { action, name, id } = el.dataset;
    if (action === 'dm')          _startDMFromRow(name);
    if (action === 'remove')      _doRemoveFriend(name);
    if (action === 'add')         _doAddFriend(name);
    if (action === 'accept-req')  _doAcceptReq(id);
    if (action === 'reject-req')  _doRejectReq(id);
    if (action === 'cancel-req')  _doCancelReq(id);
    if (action === 'accept-clan') _doAcceptClanInvite(id);
    if (action === 'reject-clan') _doRejectClanInvite(id);
  }

  async function _doAddFriend(name) {
    try { await Social.Friends.send(name); toast(`Request sent to ${name}!`, 'friend'); await _refreshAll(); }
    catch(e) { toast(e.message, 'error'); }
  }
  async function _doRemoveFriend(name) {
    if (!confirm(`Remove ${name} from friends?`)) return;
    try { await Social.Friends.remove(name); toast(`${name} removed.`, 'friend'); await _refreshAll(); }
    catch(e) { toast(e.message, 'error'); }
  }
  async function _doAcceptReq(id) {
    if (!id) { toast('Request ID missing — try refreshing the page.', 'error'); return; }
    try { const r = await Social.Friends.accept(id); toast(`You and ${r.friend?.name} are now friends!`, 'friend'); await _refreshAll(); }
    catch(e) { toast(e.message, 'error'); }
  }
  async function _doRejectReq(id) {
    if (!id) { toast('Request ID missing — try refreshing the page.', 'error'); return; }
    try { await Social.Friends.reject(id); await _refreshAll(); }
    catch(e) { toast(e.message, 'error'); }
  }
  async function _doCancelReq(id) {
    if (!id) { toast('Request ID missing — try refreshing the page.', 'error'); return; }
    try { await Social.Friends.cancel(id); await _refreshAll(); }
    catch(e) { toast(e.message, 'error'); }
  }
  async function _doAcceptClanInvite(id) {
    if (!id) { toast('Invite ID missing — try refreshing the page.', 'error'); return; }
    try { const r = await Social.Clans.acceptInvite(id); toast(`Joined ${r.clan?.name}!`, 'clan'); await _refreshAll(); }
    catch(e) { toast(e.message, 'error'); }
  }
  async function _doRejectClanInvite(id) {
    if (!id) { toast('Invite ID missing — try refreshing the page.', 'error'); return; }
    try { await Social.Clans.rejectInvite(id); await _refreshAll(); }
    catch(e) { toast(e.message, 'error'); }
  }

  function _startDMFromRow(name) {
    openPage('chat');
    _openDM(name);
  }

  /* ══════════════════════════════════════════════════════════
     CHAT PAGE RENDER
  ══════════════════════════════════════════════════════════ */
  function _renderChatPage() {
    const sub = document.getElementById('ncsChatUnreadSub');
    if (sub) sub.textContent = S.unreadDM ? `${S.unreadDM} unread` : '';

    // Conversation list
    const convList = document.getElementById('ncsConvList');
    if (convList) {
      if (!S.conversations.length && !S.friends.length) {
        convList.innerHTML = `<div class="ncs-empty"><div class="ncs-empty-icon">💬</div>No conversations yet</div>`;
      } else {
        // Show conversations + friends who haven't chatted yet
        const chattedNames = new Set();
        let html = '';

        if (S.conversations.length) {
          html += `<div class="ncs-sec-label">RECENT</div>`;
          html += S.conversations.map(c => {
            const last = c.lastMessage;
            const partnerName = last?.fromName !== S.me?.name ? last?.fromName : (c.participantIds?.find(x => x !== S.me?.id) || 'Chat');
            chattedNames.add(partnerName);
            const preview = last ? last.content.slice(0, 45) + (last.content.length > 45 ? '…' : '') : 'No messages';
            const mine = last?.fromName === S.me?.name;
            const unread = c.unreadCount || 0;
            const isActive = S.activeDM?.conversationId === c.id;
            return `
              <div class="ncs-conv-row${isActive?' selected':''}" data-conv-id="${_esc(c.id)}" data-partner="${_esc(partnerName)}">
                <div class="ncs-av ncs-av-sm">${(partnerName[0]||'?').toUpperCase()}</div>
                <div class="ncs-conv-info">
                  <div class="ncs-conv-name">${_esc(partnerName)}</div>
                  <div class="ncs-conv-preview">${mine?'You: ':''}${_esc(preview)}</div>
                </div>
                ${unread ? `<div class="ncs-conv-badge">${unread}</div>` : ''}
              </div>
            `;
          }).join('');
        }

        const unchatted = S.friends.filter(f => !chattedNames.has(f.name));
        if (unchatted.length) {
          html += `<div class="ncs-sec-label" style="opacity:0.45">FRIENDS</div>`;
          html += unchatted.map(f => `
            <div class="ncs-conv-row" data-partner="${_esc(f.name)}">
              <div class="ncs-av ncs-av-sm ${f.isOnline?'online':''}">${f.name[0].toUpperCase()}</div>
              <div class="ncs-conv-info">
                <div class="ncs-conv-name">${_esc(f.name)}</div>
                <div class="ncs-conv-preview" style="opacity:0.4">Start a conversation…</div>
              </div>
            </div>
          `).join('');
        }

        convList.innerHTML = html;
        convList.querySelectorAll('.ncs-conv-row').forEach(row => {
          row.addEventListener('click', () => {
            const convId = row.dataset.convId || null;
            const partner = row.dataset.partner;
            _openDM(partner, convId);
          });
        });
      }
    }

    // Filter
    const convSearch = document.getElementById('ncsConvSearch');
    if (convSearch) {
      convSearch.oninput = () => {
        const q = convSearch.value.toLowerCase();
        document.querySelectorAll('.ncs-conv-row').forEach(row => {
          row.style.display = q && !row.dataset.partner?.toLowerCase().includes(q) ? 'none' : '';
        });
      };
    }

    // If there's an active DM, re-render the window
    if (S.activeDM) _renderChatWindow();
  }

  /* ── Open a DM window ────────────────────────────────────── */
  async function _openDM(partnerName, convId = null) {
    S.activeDM = { friendName: partnerName, conversationId: convId };
    S.dmMessages = [];

    // Highlight in sidebar
    document.querySelectorAll('.ncs-conv-row').forEach(r => {
      r.classList.toggle('selected', r.dataset.partner === partnerName || r.dataset.convId === convId);
    });

    if (convId) {
      try {
        const res = await Social.DM.messages(convId);
        S.dmMessages = res.messages || [];
        S.dmHasMore  = res.hasMore || false;
        Social.DM.markRead(convId).catch(() => {});
        // Update unread
        const conv = S.conversations.find(c => c.id === convId);
        if (conv) { conv.unreadCount = 0; S.unreadDM = Math.max(0, S.unreadDM - (conv.unreadCount || 0)); }
        _refreshBadges();
      } catch { S.dmMessages = []; }
    }

    _renderChatWindow();
  }

  function _renderChatWindow() {
    const win = document.getElementById('ncsChatWindow');
    if (!win || !S.activeDM) return;
    const f = S.friends.find(x => x.name === S.activeDM.friendName);
    const isOnline = f?.isOnline || false;
    const statusText = isOnline ? 'Online' : (f ? _timeAgo(f.lastSeen) : '');

    win.innerHTML = `
      <div class="ncs-chat-header">
        <div class="ncs-av ncs-av-sm ${isOnline?'online':''}">${S.activeDM.friendName[0].toUpperCase()}</div>
        <div>
          <div class="ncs-chat-header-name">${_esc(S.activeDM.friendName)}</div>
          <div class="ncs-chat-header-status">
            ${isOnline ? '<span class="ncs-online-dot"></span>' : '<span class="ncs-offline-dot"></span>'}
            ${statusText}
          </div>
        </div>
      </div>
      <div class="ncs-messages-area" id="ncsMsgArea">${_buildMsgHTML()}</div>
      <div class="ncs-input-bar">
        <input class="ncs-msg-input" id="ncsMsgInput" placeholder="Message ${_esc(S.activeDM.friendName)}…" maxlength="500" autocomplete="off"/>
        <button class="ncs-send-btn" id="ncsSendBtn" title="Send">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
        </button>
      </div>
    `;

    document.getElementById('ncsSendBtn').onclick = _sendDM;
    document.getElementById('ncsMsgInput').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _sendDM(); } };

    _scrollToBottom();
  }

  function _buildMsgHTML() {
    if (!S.dmMessages.length) {
      return `<div class="ncs-no-conv" style="flex:1"><div class="ncs-no-conv-icon" style="font-size:36px;opacity:.2">💬</div><div>Say hello!</div></div>`;
    }
    let html = '';
    if (S.dmHasMore) html += `<button class="ncs-load-more-btn" id="ncsDmLoadMore">Load older messages</button>`;

    let lastDate = '';
    for (const msg of S.dmMessages) {
      const mine = msg.fromName === S.me?.name;
      const d = msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : '';
      if (d !== lastDate) { html += `<div class="ncs-msg-date-div">${d}</div>`; lastDate = d; }
      html += `
        <div class="ncs-msg ${mine?'mine':'theirs'}">
          <div class="ncs-msg-bubble">${_esc(msg.content)}</div>
          <div class="ncs-msg-time">${_formatTime(msg.createdAt)}</div>
        </div>
      `;
    }
    return html;
  }

  function _scrollToBottom() {
    const area = document.getElementById('ncsMsgArea');
    if (area) { area.scrollTop = area.scrollHeight; }
    const loadMore = document.getElementById('ncsDmLoadMore');
    if (loadMore) loadMore.onclick = _loadOlderMsgs;
  }

  async function _loadOlderMsgs() {
    if (!S.activeDM?.conversationId || !S.dmMessages.length) return;
    const oldest = S.dmMessages[0]?.id;
    try {
      const res = await Social.DM.messages(S.activeDM.conversationId, 50, oldest);
      S.dmMessages = [...(res.messages||[]), ...S.dmMessages];
      S.dmHasMore = res.hasMore || false;
      const area = document.getElementById('ncsMsgArea');
      const prevH = area?.scrollHeight || 0;
      if (area) { area.innerHTML = _buildMsgHTML(); const newH = area.scrollHeight; area.scrollTop = newH - prevH; }
      const loadMore = document.getElementById('ncsDmLoadMore');
      if (loadMore) loadMore.onclick = _loadOlderMsgs;
    } catch { /* ignore */ }
  }

  async function _sendDM() {
    const input = document.getElementById('ncsMsgInput');
    if (!input || !S.activeDM) return;
    const content = input.value.trim();
    if (!content) return;
    input.value = '';
    input.disabled = true;
    try {
      const res = await Social.DM.send(S.activeDM.friendName, content);
      if (!S.activeDM.conversationId) S.activeDM.conversationId = res.conversationId;
      S.dmMessages.push(res.message);
      const area = document.getElementById('ncsMsgArea');
      if (area) { area.innerHTML = _buildMsgHTML(); _scrollToBottom(); }
      await _refreshAll();
    } catch(e) { toast(e.message, 'error'); input.value = content; }
    finally { input.disabled = false; input.focus(); }
  }

  /* ══════════════════════════════════════════════════════════
     CLANS PAGE RENDER
  ══════════════════════════════════════════════════════════ */
  function _renderClansPage() {
    const sub = document.getElementById('ncsClansTopSub');
    if (sub) sub.textContent = S.clanData ? `[${S.clanData.clan?.tag}] ${S.clanData.clan?.name}` : 'Find or create your clan';

    // Side nav
    const nav = document.getElementById('ncsClanSideNav');
    if (nav) {
      const hasClan = !!S.clanData;
      const views = hasClan
        ? [['mine','⚔️','My Clan'],['chat','💬','Clan Chat'],['browse','🔍','Browse'],]
        : [['browse','🔍','Browse Clans'],['create','➕','Create Clan']];
      if (!views.find(v => v[0] === S.clanView)) S.clanView = views[0][0];
      nav.innerHTML = views.map(([v, icon, label]) => `
        <button class="ncs-sidenav-btn ${S.clanView===v?'active':''}" data-view="${v}">
          <span class="ncs-sidenav-icon">${icon}</span> ${label}
        </button>
      `).join('');
      nav.querySelectorAll('[data-view]').forEach(btn => {
        btn.addEventListener('click', () => { S.clanView = btn.dataset.view; _renderClansPage(); _loadClanViewData(); });
      });
    }

    // Content
    const content = document.getElementById('ncsClanContent');
    if (!content) return;
    if (S.clanView === 'browse')  content.innerHTML = _htmlClanBrowse();
    if (S.clanView === 'create')  content.innerHTML = _htmlClanCreate();
    if (S.clanView === 'mine')    content.innerHTML = _htmlMyClan();
    if (S.clanView === 'chat')    content.innerHTML = _htmlClanChat();
    _bindClanActions();
  }

  async function _loadClanViewData() {
    if (S.clanView === 'browse') {
      try { S.clanBrowse = (await Social.Clans.browse()).clans || []; } catch { S.clanBrowse = []; }
      _renderClansPage();
    }
    if (S.clanView === 'chat' && S.clanData?.clan?.id) {
      try { S.clanChatMessages = (await Social.Clans.chatHistory(S.clanData.clan.id)).messages || []; } catch {}
      _renderClansPage();
    }
  }

  /* ── Browse ──────────────────────────────────────────────── */
  function _htmlClanBrowse() {
    let h = `
      <div style="display:flex;gap:10px;align-items:center;flex-shrink:0;margin-bottom:20px;">
        <div style="position:relative;flex:1;">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);opacity:0.4;pointer-events:none;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input class="ncs-field-input" id="ncsClanSearchQ" placeholder="Search clans by name or tag…" style="padding-left:36px;" autocomplete="off"/>
        </div>
        <button class="ncs-btn ncs-btn-purple" id="ncsClanSearchBtn">Search</button>
      </div>
    `;
    if (!S.clanBrowse.length) {
      h += `<div class="ncs-empty"><div class="ncs-empty-icon">🏴</div>No clans found. Be the first to create one!</div>`;
    } else {
      h += `<div class="ncs-clan-grid">` + S.clanBrowse.map(c => {
        const full    = c.memberCount >= c.maxMembers;
        const canJoin = c.isOpen && !S.clanData && !full;
        return `
          <div class="ncs-clan-card">
            <div class="ncs-clan-card-head">
              <div class="ncs-clan-emblem">${c.emblem||'⭐'}</div>
              <div class="ncs-clan-card-title">
                <div class="ncs-clan-card-name">${_esc(c.name)}</div>
                <div class="ncs-clan-tag-lg">[${_esc(c.tag)}]</div>
              </div>
              ${canJoin ? `<button class="ncs-btn ncs-btn-purple ncs-btn-sm" data-action="join-clan" data-id="${c.id}">JOIN</button>` : ''}
            </div>
            ${c.description ? `<div class="ncs-clan-card-desc">${_esc(c.description)}</div>` : ''}
            <div class="ncs-clan-card-stats">
              <div class="ncs-clan-card-stat">👥 ${c.memberCount}/${c.maxMembers}</div>
              <div class="ncs-clan-card-stat">⚔️ ${c.totalKills||0} kills</div>
            </div>
            <div class="ncs-clan-card-footer">
              <div class="ncs-clan-card-leader">Leader: ${_esc(c.leaderName)}</div>
              ${c.isOpen && !full ? `<span class="ncs-clan-open-badge">OPEN</span>` : full ? `<span class="ncs-clan-invite-badge">FULL</span>` : `<span class="ncs-clan-invite-badge">INVITE ONLY</span>`}
            </div>
          </div>
        `;
      }).join('') + `</div>`;
    }
    return h;
  }

  /* ── Create ──────────────────────────────────────────────── */
  function _htmlClanCreate() {
    return `
      <div style="max-width:560px;">
        <div class="ncs-sec-label" style="padding:0 0 16px;opacity:1;font-size:10px;">CREATE YOUR CLAN</div>
        <form class="ncs-create-form" id="ncsClanCreateForm">
          <div class="ncs-field">
            <div class="ncs-field-label">CLAN NAME <span class="ncs-field-hint">3–24 characters</span></div>
            <input class="ncs-field-input" id="cfName" placeholder="Enter clan name…" maxlength="24" required autocomplete="off"/>
          </div>
          <div class="ncs-field">
            <div class="ncs-field-label">TAG <span class="ncs-field-hint">2–5 letters · shown as [TAG]</span></div>
            <input class="ncs-field-input ncs-field-tag" id="cfTag" placeholder="e.g. NCG" maxlength="5" required autocomplete="off"/>
          </div>
          <div class="ncs-field">
            <div class="ncs-field-label">DESCRIPTION <span class="ncs-field-hint">optional · max 200 chars</span></div>
            <textarea class="ncs-field-input ncs-field-textarea" id="cfDesc" placeholder="What's your clan about?" maxlength="200"></textarea>
          </div>
          <div class="ncs-field">
            <div class="ncs-field-label">EMBLEM</div>
            <div class="ncs-emblem-row" id="cfEmblemRow">
              ${['⭐','🔥','💀','⚡','🌊','🎯','🛡','👑','🚀','💎','🌙','🦅'].map((e,i) =>
                `<button type="button" class="ncs-emblem-btn${i===0?' selected':''}" data-emblem="${e}">${e}</button>`
              ).join('')}
            </div>
          </div>
          <div class="ncs-field ncs-field-row">
            <div class="ncs-field-label">OPEN CLAN <span class="ncs-field-hint">Anyone can join without invite</span></div>
            <label class="ncs-toggle">
              <input type="checkbox" id="cfOpen"/>
              <div class="ncs-toggle-track"><div class="ncs-toggle-thumb"></div></div>
            </label>
          </div>
          <div class="ncs-form-error" id="cfError"></div>
          <button type="submit" class="ncs-btn-full-purple">⭐ CREATE CLAN</button>
        </form>
      </div>
    `;
  }

  /* ── My Clan ─────────────────────────────────────────────── */
  function _htmlMyClan() {
    const { clan, members = [], myRole } = S.clanData || {};
    if (!clan) return `<div class="ncs-empty"><div class="ncs-empty-icon">🏴</div>You are not in a clan.</div>`;
    const isLeader  = myRole === 'leader';
    const canManage = myRole === 'leader' || myRole === 'officer';

    let h = `
      <div class="ncs-myclan-hero">
        <div class="ncs-myclan-emblem">${clan.emblem||'⭐'}</div>
        <div class="ncs-myclan-info">
          <div class="ncs-myclan-name">${_esc(clan.name)}</div>
          <div class="ncs-myclan-tag">[${_esc(clan.tag)}]</div>
          <div class="ncs-myclan-stats">
            <div class="ncs-myclan-stat">👥 ${clan.memberCount}/${clan.maxMembers} members</div>
            <div class="ncs-myclan-stat">⚔️ ${clan.totalKills||0} kills</div>
            <div class="ncs-myclan-stat">🎖 ${myRole}</div>
          </div>
          ${clan.description ? `<div style="font-family:'Rajdhani',sans-serif;font-size:13px;color:rgba(255,255,255,0.45);margin-top:8px;line-height:1.5;">${_esc(clan.description)}</div>` : ''}
        </div>
        <div class="ncs-myclan-actions">
          ${isLeader ? `<button class="ncs-btn ncs-btn-pink ncs-btn-sm" data-action="disband-clan" data-id="${clan.id}">Disband</button>` : `<button class="ncs-btn ncs-btn-sm" data-action="leave-clan" style="border-color:rgba(255,255,255,.15);background:rgba(255,255,255,.04);color:var(--ncs-muted)">Leave</button>`}
        </div>
      </div>
    `;

    if (canManage) {
      h += `
        <div style="display:flex;gap:10px;align-items:center;flex-shrink:0;">
          <input class="ncs-field-input" id="ncsClanInviteInput" placeholder="Invite player by name…" autocomplete="off" style="flex:1;"/>
          <button class="ncs-btn ncs-btn-purple ncs-btn-sm" data-action="clan-invite-send">Send Invite</button>
        </div>
      `;
    }

    h += `<div class="ncs-sec-label ncs-sec-label-gold" style="padding:16px 0 8px;">MEMBERS — ${members.length}</div>`;
    h += `<div class="ncs-member-grid">`;
    h += members.map(m => {
      const isMe = m.name === S.me?.name;
      let actions = '';
      if (!isMe && isLeader) {
        if (m.role === 'member')   actions += `<button class="ncs-icon-btn success" data-action="promote" data-name="${_esc(m.name)}" data-clanid="${clan.id}" title="Promote to officer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="18 15 12 9 6 15"/></svg></button>`;
        if (m.role === 'officer')  actions += `<button class="ncs-icon-btn" data-action="demote" data-name="${_esc(m.name)}" data-clanid="${clan.id}" title="Demote to member" style="font-size:11px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="6 9 12 15 18 9"/></svg></button>`;
        actions += `<button class="ncs-icon-btn danger" data-action="kick" data-name="${_esc(m.name)}" data-clanid="${clan.id}" title="Kick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`;
      }
      return `
        <div class="ncs-member-row">
          <div class="ncs-av ncs-av-sm ${m.isOnline?'online':''}">${m.name[0].toUpperCase()}</div>
          <div class="ncs-member-info">
            <div class="ncs-member-name">${_esc(m.name)} <span class="ncs-role ncs-role-${m.role}">${m.role}</span></div>
            <div class="ncs-member-sub">Lv ${m.account?.level||1} · ${m.stats?.kills||0} kills${m.isOnline?' · <span style="color:var(--ncs-green)">Online</span>':''}</div>
          </div>
          <div class="ncs-row-actions ${actions?'always':''}">${actions}</div>
        </div>
      `;
    }).join('');
    h += `</div>`;
    return h;
  }

  /* ── Clan Chat ───────────────────────────────────────────── */
  function _htmlClanChat() {
    if (!S.clanData) return `<div class="ncs-empty">Not in a clan.</div>`;
    return `
      <div class="ncs-clanchat-wrap">
        <div class="ncs-clanchat-messages" id="ncsClanMsgArea">${_buildClanChatHTML()}</div>
        <div class="ncs-input-bar">
          <input class="ncs-msg-input" id="ncsClanMsgInput" placeholder="Message your clan…" maxlength="500" autocomplete="off"/>
          <button class="ncs-send-btn" id="ncsClanSendBtn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  function _buildClanChatHTML() {
    if (!S.clanChatMessages.length) return `<div class="ncs-empty" style="padding:32px;"><div class="ncs-empty-icon">💬</div>Chat with your clan!</div>`;
    return S.clanChatMessages.map(msg => {
      const mine = msg.fromName === S.me?.name;
      const roleClass = msg.fromRole === 'leader' ? 'role-leader' : msg.fromRole === 'officer' ? 'role-officer' : '';
      return `
        <div class="ncs-clan-msg">
          <div class="ncs-av ncs-av-sm">${msg.fromName[0].toUpperCase()}</div>
          <div class="ncs-clan-msg-body">
            <div class="ncs-clan-msg-from ${roleClass}">${_esc(msg.fromName)} <span class="ncs-role ncs-role-${msg.fromRole||'member'}" style="font-size:7px;">${msg.fromRole||''}</span></div>
            <div class="ncs-clan-msg-text">${_esc(msg.content)}</div>
            <div class="ncs-clan-msg-time">${_formatTime(msg.createdAt)}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ── Bind clan actions ───────────────────────────────────── */
  function _bindClanActions() {
    const content = document.getElementById('ncsClanContent');
    if (!content) return;

    content.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', async e => {
        e.stopPropagation();
        const { action, id, name, clanid } = el.dataset;
        if (action === 'join-clan')        _doJoinClan(id);
        if (action === 'disband-clan')     _doDisbandClan(id);
        if (action === 'leave-clan')       _doLeaveClan();
        if (action === 'kick')             _doKick(clanid, name);
        if (action === 'promote')          _doPromote(clanid, name);
        if (action === 'demote')           _doDemote(clanid, name);
        if (action === 'clan-invite-send') _doClanInvite();
      });
    });

    // Create form
    const form = document.getElementById('ncsClanCreateForm');
    if (form) {
      form.onsubmit = e => { e.preventDefault(); _doCreateClan(); };
      form.querySelectorAll('.ncs-emblem-btn').forEach(btn => {
        btn.onclick = () => { form.querySelectorAll('.ncs-emblem-btn').forEach(b => b.classList.remove('selected')); btn.classList.add('selected'); };
      });
    }

    // Browse search
    const searchBtn = document.getElementById('ncsClanSearchBtn');
    const searchQ   = document.getElementById('ncsClanSearchQ');
    if (searchBtn) searchBtn.onclick = _doBrowseSearch;
    if (searchQ)   searchQ.onkeydown = e => { if (e.key === 'Enter') _doBrowseSearch(); };

    // Clan chat send
    const sendBtn = document.getElementById('ncsClanSendBtn');
    const input   = document.getElementById('ncsClanMsgInput');
    if (sendBtn) sendBtn.onclick = _sendClanChat;
    if (input)   input.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _sendClanChat(); } };

    // Scroll clan chat to bottom
    const area = document.getElementById('ncsClanMsgArea');
    if (area) area.scrollTop = area.scrollHeight;
  }

  async function _doBrowseSearch() {
    const q = (document.getElementById('ncsClanSearchQ')?.value || '').trim();
    try { S.clanBrowse = (await Social.Clans.browse(q)).clans || []; } catch { S.clanBrowse = []; }
    _renderClansPage();
  }

  async function _doCreateClan() {
    const name   = document.getElementById('cfName')?.value.trim();
    const tag    = document.getElementById('cfTag')?.value.trim().toUpperCase();
    const desc   = document.getElementById('cfDesc')?.value.trim() || '';
    const isOpen = document.getElementById('cfOpen')?.checked || false;
    const emblem = document.querySelector('.ncs-emblem-btn.selected')?.dataset.emblem || '⭐';
    const errEl  = document.getElementById('cfError');
    if (errEl) errEl.textContent = '';
    try {
      const res = await Social.Clans.create({ name, tag, description: desc, emblem, isOpen });
      S.clanData = { clan: res.clan, members: [], myRole: 'leader' };
      S.clanView = 'mine';
      toast(`Clan [${tag}] ${name} created!`, 'clan');
      await _refreshAll();
    } catch(e) { if (errEl) errEl.textContent = e.message; }
  }

  async function _doJoinClan(clanId) {
    try {
      const res = await Social.Clans.join(clanId);
      toast(`Joined ${res.clan?.name}!`, 'clan');
      S.clanView = 'mine';
      await _refreshAll();
    } catch(e) { toast(e.message, 'error'); }
  }

  async function _doLeaveClan() {
    if (!confirm('Leave your clan?')) return;
    try { await Social.Clans.leave(); toast('You left the clan.', 'clan'); S.clanData = null; S.clanView = 'browse'; await _refreshAll(); }
    catch(e) { toast(e.message, 'error'); }
  }

  async function _doDisbandClan(clanId) {
    if (!confirm('Disband this clan? This cannot be undone.')) return;
    try { await Social.Clans.disband(clanId); toast('Clan disbanded.', 'clan'); S.clanData = null; S.clanView = 'browse'; await _refreshAll(); }
    catch(e) { toast(e.message, 'error'); }
  }

  async function _doKick(clanId, name) {
    if (!confirm(`Kick ${name}?`)) return;
    try { await Social.Clans.kick(clanId, name); toast(`${name} kicked.`, 'clan'); S.clanData = await Social.Clans.me(); _renderClansPage(); }
    catch(e) { toast(e.message, 'error'); }
  }

  async function _doPromote(clanId, name) {
    try { await Social.Clans.promote(clanId, name); toast(`${name} promoted to officer!`, 'clan'); S.clanData = await Social.Clans.me(); _renderClansPage(); }
    catch(e) { toast(e.message, 'error'); }
  }

  async function _doDemote(clanId, name) {
    try { await Social.Clans.demote(clanId, name); toast(`${name} demoted.`, 'clan'); S.clanData = await Social.Clans.me(); _renderClansPage(); }
    catch(e) { toast(e.message, 'error'); }
  }

  async function _doClanInvite() {
    const input = document.getElementById('ncsClanInviteInput');
    const name  = input?.value.trim();
    if (!name) return;
    const clanId = S.clanData?.clan?.id;
    if (!clanId) return;
    try { await Social.Clans.invite(clanId, name); toast(`Invite sent to ${name}!`, 'clan'); if (input) input.value = ''; }
    catch(e) { toast(e.message, 'error'); }
  }

  async function _sendClanChat() {
    const input  = document.getElementById('ncsClanMsgInput');
    const clanId = S.clanData?.clan?.id;
    if (!input || !clanId) return;
    const content = input.value.trim();
    if (!content) return;
    input.value = '';
    input.disabled = true;
    try {
      const res = await Social.Clans.chatSend(clanId, content);
      S.clanChatMessages.push(res.message);
      const area = document.getElementById('ncsClanMsgArea');
      if (area) { area.innerHTML = _buildClanChatHTML(); area.scrollTop = area.scrollHeight; }
    } catch(e) { toast(e.message, 'error'); }
    finally { input.disabled = false; input.focus(); }
  }

  /* ══════════════════════════════════════════════════════════
     WEBSOCKET HANDLERS
  ══════════════════════════════════════════════════════════ */
  function _wsOnDM({ message, conversationId }) {
    S.unreadDM++;
    _refreshBadges();
    if (S.activeDM?.conversationId === conversationId || S.activeDM?.friendName === message?.fromName) {
      S.dmMessages.push(message);
      const area = document.getElementById('ncsMsgArea');
      if (area) { area.innerHTML = _buildMsgHTML(); _scrollToBottom(); }
      Social.DM.markRead(conversationId).catch(() => {});
    } else {
      toast(`${message?.fromName}: ${(message?.content||'').slice(0,60)}`, 'dm');
    }
    Social.DM.conversations().then(r => { S.conversations = r.conversations||[]; S.unreadDM = r.totalUnread||0; _refreshBadges(); if (S.activePage==='chat') _renderChatPage(); }).catch(() => {});
  }

  function _wsOnClanMsg({ message }) {
    S.clanChatMessages.push(message);
    const area = document.getElementById('ncsClanMsgArea');
    if (area) { area.innerHTML = _buildClanChatHTML(); area.scrollTop = area.scrollHeight; }
    else toast(`[Clan] ${message.fromName}: ${(message.content||'').slice(0,50)}`, 'clan');
  }

  function _wsOnFriendReq({ request }) {
    S.incoming.push(request);
    toast(`${request.fromName} sent you a friend request!`, 'friend');
    _refreshBadges();
    if (S.activePage === 'friends') _renderFriendsPage();
  }

  function _wsOnFriendAccepted({ friend }) {
    S.friends.push(friend);
    toast(`${friend.name} accepted your friend request!`, 'friend');
    if (S.activePage === 'friends') _renderFriendsPage();
  }

  function _wsOnClanInvite({ invite }) {
    S.clanInvites.push(invite);
    toast(`You were invited to [${invite.clanTag}] ${invite.clanName}!`, 'clan');
    _refreshBadges();
    if (S.activePage === 'friends') _renderFriendsPage();
  }

  function _wsOnKicked({ clanName }) {
    S.clanData = null;
    toast(`You were kicked from ${clanName}.`, 'error');
  }

  function _updateOnline(name, online) {
    const f = S.friends.find(x => x.name === name);
    if (f) {
      f.isOnline = online;
      if (S.activePage === 'friends') _renderFriendsPage();
      if (S.activeDM?.friendName === name && S.activePage === 'chat') _renderChatWindow();
    }
  }

  /* ══════════════════════════════════════════════════════════
     BADGES
  ══════════════════════════════════════════════════════════ */
  function _setNotifCount(n) {
    S.unreadNotif = n;
    _refreshBadges();
  }

  function _refreshBadges() {
    const totalFAB = (S.unreadDM||0) + (S.incoming.length||0) + (S.clanInvites.length||0);
    const fab = document.getElementById('ncsFabBadge');
    if (fab) { fab.textContent = totalFAB > 99 ? '99+' : totalFAB; fab.style.display = totalFAB ? 'flex' : 'none'; }

    _setBadge('ncsNavFriendBadge', S.incoming.length);
    _setBadge('ncsNavNotifBadge',  S.unreadNotif);
  }

  function _setBadge(id, count) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = count > 99 ? '99+' : count;
    el.style.display = count > 0 ? 'flex' : 'none';
  }

  /* ══════════════════════════════════════════════════════════
     HEARTBEAT
  ══════════════════════════════════════════════════════════ */
  function _startHeartbeat() {
    clearInterval(S.heartbeatTimer);
    Social.Friends.heartbeat('menu').catch(() => {});
    S.heartbeatTimer = setInterval(() => {
      if (Auth.isLoggedIn()) Social.Friends.heartbeat('menu').catch(() => {});
    }, 30000);
  }

  /* ══════════════════════════════════════════════════════════
     TOAST
  ══════════════════════════════════════════════════════════ */
  function toast(msg, type = 'friend') {
    const container = document.getElementById('ncsToasts');
    if (!container) return;
    const icons = { friend:'👤', clan:'⭐', dm:'💬', error:'⚠️' };
    const el = document.createElement('div');
    el.className = `ncs-toast ncs-toast-${type}`;
    el.innerHTML = `<span class="ncs-toast-icon">${icons[type]||'•'}</span><span class="ncs-toast-msg">${_esc(msg)}</span>`;
    container.appendChild(el);
    requestAnimationFrame(() => { requestAnimationFrame(() => el.classList.add('ncs-toast-in')); });
    setTimeout(() => {
      el.classList.remove('ncs-toast-in');
      el.classList.add('ncs-toast-out');
      el.addEventListener('transitionend', () => el.remove(), { once: true });
    }, 4200);
  }

  /* ══════════════════════════════════════════════════════════
     UTILS
  ══════════════════════════════════════════════════════════ */
  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  function _timeAgo(iso) {
    if (!iso) return '';
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1)   return 'just now';
    if (m < 60)  return `${m}m ago`;
    const h = Math.floor(m/60);
    if (h < 24)  return `${h}h ago`;
    return `${Math.floor(h/24)}d ago`;
  }
  function _formatTime(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  }

  return { init, openPage, closePage, toast };
})();
