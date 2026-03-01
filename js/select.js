'use strict';

(function () {
  let selectedCharId   = null;
  let selectedMapId    = CONFIG.MAPS[0].id;  // default: first map
  let customNeonColor  = 'default';
  let customMask       = 'none';
  let customEffect     = 'none';

  const charCards    = document.querySelectorAll('.char-card');
  const mapCards     = document.querySelectorAll('.map-card');
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
  // Pre-select first map card
  if (mapCards.length > 0) mapCards[0].classList.add('selected');

  mapCards.forEach(card => {
    card.addEventListener('click', () => {
      mapCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedMapId = card.dataset.map;
    });
  });

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
    // Q/W/E/R/T/Y/U/I/O → pick map (U=lifemode, I=arena, O=zombie)
    const mapKeys = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO'];
    const mapIdx  = mapKeys.indexOf(e.code);
    if (mapIdx >= 0 && mapIdx < mapCards.length) {
      mapCards[mapIdx].click();
    }

    // Escape = close modal
    if (e.code === 'Escape' && modesModal && modesModal.style.display !== 'none') {
      modesModal.style.display = 'none'; return;
    }
    // Enter = start
    if (e.code === 'Enter' && !startBtn.disabled) startBtn.click();
  });
})();
