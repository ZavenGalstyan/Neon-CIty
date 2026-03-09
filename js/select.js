'use strict';

/**
 * @file select.js
 * Character and map selection screen logic (index.html).
 *
 * Responsibilities:
 *   - Character card click selection (8 chars across 2 pages)
 *   - Map card click selection (18 maps across 2 pages)
 *   - Page tab switching for both grids (charTab1/2, pageTab1/2)
 *   - Customization panel: neon color swatches, mask, effect options
 *   - START button: saves selections to localStorage, navigates to game.html
 *   - Keyboard shortcuts:
 *       1–6     → select character on current char page
 *       Q–I     → select map on current map page
 *       Tab     → toggle map page
 *       Shift+Tab → toggle char page
 *       Enter   → start game
 *       Escape  → close modes modal
 *   - Modes modal: opened by modesBtn, closed by modesModalClose or backdrop click
 *
 * localStorage keys written on start:
 *   'selectedChar'   — JSON of CONFIG.CHARACTERS entry
 *   'selectedMap'    — JSON of CONFIG.MAPS entry
 *   'customization'  — { neonColor, mask, effect }
 */

(function () {
  let selectedCharId   = null;
  let selectedMapId    = CONFIG.MAPS[0].id;  // default: first map
  let customNeonColor  = 'default';
  let customMask       = 'none';
  let customEffect     = 'none';
  let currentPage      = 1;
  let currentCharPage  = 1;
  let currentStep      = 1;

  const charCards    = document.querySelectorAll('.char-card');
  const allMapCards  = document.querySelectorAll('.map-card');  // all pages
  const startBtn     = document.getElementById('startBtn');
  const startBtnText = document.getElementById('startBtnText');
  const prevBtn      = document.getElementById('prevBtn');
  const nextBtn      = document.getElementById('nextBtn');

  // ── Step navigation ──────────────────────────────────────
  function goToStep(n) {
    const oldEl = document.getElementById(`step${currentStep}`);
    const newEl = document.getElementById(`step${n}`);
    oldEl.classList.add('slide-out');
    setTimeout(() => {
      oldEl.classList.remove('active', 'slide-out');
      newEl.classList.add('active');
      currentStep = n;
      _updateStepNav();
      if (n === 3) document.getElementById('playerNameInput')?.focus();
    }, 280);
  }

  function _updateStepNav() {
    prevBtn.disabled = (currentStep === 1);
    nextBtn.style.visibility = (currentStep === 3) ? 'hidden' : 'visible';
    nextBtn.disabled = (currentStep === 2 && !selectedCharId);
    document.querySelectorAll('.step-dot').forEach(d =>
      d.classList.toggle('active', +d.dataset.step === currentStep));
    if (currentStep === 3) {
      const charData = CONFIG.CHARACTERS.find(c => c.id === selectedCharId);
      document.getElementById('namePreview').textContent = charData?.name ?? '';
      startBtn.disabled = !selectedCharId;
      startBtnText.textContent = selectedCharId ? 'START GAME' : 'GO BACK & SELECT A CHARACTER';
    }
  }

  prevBtn.addEventListener('click', () => { if (currentStep > 1) goToStep(currentStep - 1); });
  nextBtn.addEventListener('click', () => { if (currentStep < 3) goToStep(currentStep + 1); });

  // ── Character selection ──────────────────────────────────
  charCards.forEach(card => {
    card.addEventListener('click', () => {
      charCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedCharId = card.dataset.char;
      startBtn.disabled = false;
      startBtnText.textContent = 'START GAME';
      _updateStepNav();
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

  // ── Character page switching ──────────────────────────────
  const charTab1  = document.getElementById('charTab1');
  const charTab2  = document.getElementById('charTab2');
  const charPage1El = document.getElementById('charPage1');
  const charPage2El = document.getElementById('charPage2');

  function switchCharPage(page) {
    currentCharPage = page;
    if (page === 1) {
      charPage1El.style.display = '';
      charPage2El.style.display = 'none';
      charTab1.classList.add('active');
      charTab2.classList.remove('active');
    } else {
      charPage1El.style.display = 'none';
      charPage2El.style.display = '';
      charTab1.classList.remove('active');
      charTab2.classList.add('active');
    }
  }

  if (charTab1) charTab1.addEventListener('click', () => switchCharPage(1));
  if (charTab2) charTab2.addEventListener('click', () => switchCharPage(2));

  // ── Map page switching ────────────────────────────────────
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
    const nameVal = (document.getElementById('playerNameInput')?.value || '').trim();
    localStorage.setItem('playerName',     nameVal || 'ANONYMOUS');
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

    // 1-4 → pick character on current char page
    // Page 1: 1-4 maps to chars 0-3; Page 2: 1-4 maps to chars 4-7
    if (num >= 1 && num <= 4) {
      if (currentCharPage === 1) {
        const card = charCards[num - 1];
        if (card) card.click();
      } else {
        const card = charCards[5 + num];  // page2 starts at index 6 (5+1)
        if (card) card.click();
      }
    }

    // Page 1: Q/W/E/R/T/Y/U/I/O → maps 0-8 (classic + special)
    // Page 2: Q/W/E/R/T/Y → maps on page 2
    const page1Keys = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO'];
    const page2Keys = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI'];

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

    // Tab = switch map page; Shift+Tab = switch char page
    if (e.code === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        switchCharPage(currentCharPage === 1 ? 2 : 1);
      } else {
        switchPage(currentPage === 1 ? 2 : 1);
      }
      return;
    }

    // Escape = close modal
    if (e.code === 'Escape' && modesModal && modesModal.style.display !== 'none') {
      modesModal.style.display = 'none'; return;
    }
    // Enter = advance step or start
    if (e.code === 'Enter') {
      if (currentStep === 3) { if (!startBtn.disabled) startBtn.click(); }
      else if (!nextBtn.disabled) nextBtn.click();
    }
  });
})();
