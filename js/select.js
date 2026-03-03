'use strict';

(function () {
  let selectedCharId   = null;
  let selectedMapId    = CONFIG.MAPS[0].id;  // default: first map
  let customNeonColor  = 'default';
  let customMask       = 'none';
  let customEffect     = 'none';
  let currentPage      = 1;

  const charCards    = document.querySelectorAll('.char-card');
  const allMapCards  = document.querySelectorAll('.map-card');  // all pages
  const startBtn     = document.getElementById('startBtn');
  const startBtnText = document.getElementById('startBtnText');

  // ── Character selection ──────────────────────────────────
  charCards.forEach(card => {
    card.addEventListener('click', () => {
      charCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedCharId = card.dataset.char;
      startBtn.disabled = false;
      startBtnText.textContent = 'START GAME';
    });
  });

  // ── Map selection ────────────────────────────────────────
  // Pre-select first map card on page 1
  if (allMapCards.length > 0) allMapCards[0].classList.add('selected');

  allMapCards.forEach(card => {
    card.addEventListener('click', () => {
      allMapCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedMapId = card.dataset.map;
    });
  });

  // ── Page switching ────────────────────────────────────────
  const pageTab1  = document.getElementById('pageTab1');
  const pageTab2  = document.getElementById('pageTab2');
  const mapPage1  = document.getElementById('mapPage1');
  const mapPage2  = document.getElementById('mapPage2');

  function switchPage(page) {
    currentPage = page;
    if (page === 1) {
      mapPage1.style.display = '';
      mapPage2.style.display = 'none';
      pageTab1.classList.add('active');
      pageTab2.classList.remove('active');
    } else {
      mapPage1.style.display = 'none';
      mapPage2.style.display = '';
      pageTab1.classList.remove('active');
      pageTab2.classList.add('active');
    }
  }

  if (pageTab1) pageTab1.addEventListener('click', () => switchPage(1));
  if (pageTab2) pageTab2.addEventListener('click', () => switchPage(2));

  // ── Customization ─────────────────────────────────────────
  document.querySelectorAll('#colorSwatches .color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('#colorSwatches .color-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      customNeonColor = sw.dataset.color;
    });
  });

  document.querySelectorAll('#maskOptions .cust-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#maskOptions .cust-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      customMask = btn.dataset.mask;
    });
  });

  document.querySelectorAll('#effectOptions .cust-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#effectOptions .cust-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      customEffect = btn.dataset.effect;
    });
  });

  // ── Start ────────────────────────────────────────────────
  startBtn.addEventListener('click', () => {
    if (!selectedCharId) return;
    const charData = CONFIG.CHARACTERS.find(c => c.id === selectedCharId);
    const mapData  = CONFIG.MAPS.find(m => m.id === selectedMapId) || CONFIG.MAPS[0];
    if (!charData) return;
    localStorage.setItem('selectedChar',   JSON.stringify(charData));
    localStorage.setItem('selectedMap',    JSON.stringify(mapData));
    localStorage.setItem('customization',  JSON.stringify({ neonColor: customNeonColor, mask: customMask, effect: customEffect }));
    window.location.href = 'game.html';
  });

  // ── Maps & Modes modal ───────────────────────────────────
  const modesBtn   = document.getElementById('modesBtn');
  const modesModal = document.getElementById('modesModal');
  const modesClose = document.getElementById('modesModalClose');
  if (modesBtn && modesModal) {
    modesBtn.addEventListener('click', () => { modesModal.style.display = 'flex'; });
    modesClose.addEventListener('click', () => { modesModal.style.display = 'none'; });
    modesModal.addEventListener('click', e => { if (e.target === modesModal) modesModal.style.display = 'none'; });
  }

  // ── Keyboard shortcuts ────────────────────────────────────
  document.addEventListener('keydown', e => {
    const num = parseInt(e.key);

    // 1-4 → pick character
    if (num >= 1 && num <= 4) {
      const card = charCards[num - 1];
      if (card) card.click();
    }

    // Page 1: Q/W/E/R/T/Y/U/I/O → maps 0-8 (classic + special)
    // Page 2: Q/W/E/R/T/Y → maps on page 2
    const page1Keys = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO'];
    const page2Keys = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY'];

    if (currentPage === 1) {
      const mapIdx = page1Keys.indexOf(e.code);
      if (mapIdx >= 0) {
        // Page 1 cards in DOM order
        const page1Cards = document.querySelectorAll('#mapPage1 .map-card');
        if (mapIdx < page1Cards.length) page1Cards[mapIdx].click();
      }
    } else {
      const mapIdx = page2Keys.indexOf(e.code);
      if (mapIdx >= 0) {
        const page2Cards = document.querySelectorAll('#mapPage2 .map-card');
        if (mapIdx < page2Cards.length) page2Cards[mapIdx].click();
      }
    }

    // Tab = switch page
    if (e.code === 'Tab') {
      e.preventDefault();
      switchPage(currentPage === 1 ? 2 : 1);
      return;
    }

    // Escape = close modal
    if (e.code === 'Escape' && modesModal && modesModal.style.display !== 'none') {
      modesModal.style.display = 'none'; return;
    }
    // Enter = start
    if (e.code === 'Enter' && !startBtn.disabled) startBtn.click();
  });
})();
