'use strict';

(function () {
  let selectedCharId = null;
  let selectedMapId  = CONFIG.MAPS[0].id;  // default: first map

  const charCards  = document.querySelectorAll('.char-card');
  const mapCards   = document.querySelectorAll('.map-card');
  const startBtn   = document.getElementById('startBtn');
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

  // ── Start ────────────────────────────────────────────────
  startBtn.addEventListener('click', () => {
    if (!selectedCharId) return;
    const charData = CONFIG.CHARACTERS.find(c => c.id === selectedCharId);
    const mapData  = CONFIG.MAPS.find(m => m.id === selectedMapId) || CONFIG.MAPS[0];
    if (!charData) return;
    localStorage.setItem('selectedChar', JSON.stringify(charData));
    localStorage.setItem('selectedMap',  JSON.stringify(mapData));
    window.location.href = 'game.html';
  });

  // ── Keyboard shortcuts ────────────────────────────────────
  document.addEventListener('keydown', e => {
    const num = parseInt(e.key);

    // 1-4 → pick character
    if (num >= 1 && num <= 4) {
      const card = charCards[num - 1];
      if (card) card.click();
    }
    // Q/W/E/R/T/Y/U → pick map (U = arena, I = zombie)
    const mapKeys = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI'];
    const mapIdx  = mapKeys.indexOf(e.code);
    if (mapIdx >= 0 && mapIdx < mapCards.length) {
      mapCards[mapIdx].click();
    }

    // Enter = start
    if (e.code === 'Enter' && !startBtn.disabled) startBtn.click();
  });
})();
