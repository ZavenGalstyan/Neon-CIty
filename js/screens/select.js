'use strict';

/**
 * @file select.js
 * Character and map selection screen logic (index.html).
 *
 * Responsibilities:
 *   - Character card click selection (32 chars across 2 pages, 16 per page)
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
  let selectedNeonTheme = 'cyan';  // Default color theme for Neon City
  let selectedWastelandTheme = 'orange';  // Default color theme for Wasteland
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
  let _csToastTimer = null;
  function _showComingSoonToast() {
    if (_csToastTimer) { clearTimeout(_csToastTimer); document.querySelector('.char-cs-toast')?.remove(); }
    const toast = document.createElement('div');
    toast.className = 'char-cs-toast';
    toast.textContent = 'COMING SOON';
    document.body.appendChild(toast);
    _csToastTimer = setTimeout(() => { toast.remove(); _csToastTimer = null; }, 1900);
  }

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
      // Coming soon characters — show toast, do nothing else
      if (card.dataset.comingSoon === 'true') {
        _showComingSoonToast();
        return;
      }
      // Check if character is locked
      if (card.classList.contains('char-card-locked')) {
        const charData = CONFIG.CHARACTERS.find(c => c.id === card.dataset.char);
        if (charData && charData.locked) {
          // Show locked message
          const price = charData.price || 0;
          alert(`🔒 This character is locked!\n\nPrice: ⬢${price.toLocaleString()} NEX\n\nEarn money in-game to unlock this character.`);
          return;
        }
      }
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

  // ── Neon City color theme selection ────────────────────────
  const neonThemeBtns = document.querySelectorAll('.neon-theme-btn');
  const neonCityCard = document.querySelector('.map-card--neon-city');
  const neonCityPreview = document.getElementById('neonCityPreview');
  const neonCityTitle = document.getElementById('neonCityTitle');
  const neonCityTag1 = document.getElementById('neonCityTag1');
  const neonCityTag2 = document.getElementById('neonCityTag2');
  const neonCityTag3 = document.getElementById('neonCityTag3');

  // Color theme data for UI updates
  const themeColors = {
    cyan:   { color: '#44EEFF', bg: '#080812', road: 'rgba(68,238,255,0.4)' },
    orange: { color: '#FF8800', bg: '#0a0804', road: 'rgba(255,140,0,0.4)' },
    green:  { color: '#44FF88', bg: '#04080a', road: 'rgba(68,255,136,0.38)' },
    red:    { color: '#FF4444', bg: '#0a0404', road: 'rgba(255,60,60,0.38)' },
    blue:   { color: '#00AACC', bg: '#020b10', road: 'rgba(0,170,204,0.38)' },
    yellow: { color: '#FFCC00', bg: '#0c0900', road: 'rgba(255,204,0,0.38)' }
  };

  function updateNeonCityTheme(themeName) {
    const theme = themeColors[themeName];
    if (!theme) return;

    selectedNeonTheme = themeName;

    // Update card border glow color
    if (neonCityCard) {
      neonCityCard.style.setProperty('--neon-theme-color', theme.color);
      neonCityCard.style.setProperty('--neon-theme-glow', theme.color.replace('#', 'rgba(') + ',0.5)');
      neonCityCard.style.borderColor = theme.color;
    }

    // Update preview colors
    if (neonCityPreview) {
      neonCityPreview.style.setProperty('--mbg', theme.bg);
      neonCityPreview.style.setProperty('--mr', theme.road);
    }

    // Update all preview dots
    for (let i = 1; i <= 9; i++) {
      const dot = document.getElementById('neonDot' + i);
      if (dot) {
        dot.style.background = theme.color;
        dot.style.boxShadow = `0 0 8px ${theme.color}`;
      }
    }

    // Update title
    if (neonCityTitle) {
      neonCityTitle.style.color = theme.color;
      neonCityTitle.style.textShadow = `0 0 12px ${theme.color}`;
    }

    // Update tags
    [neonCityTag1, neonCityTag2, neonCityTag3].forEach(tag => {
      if (tag) tag.style.setProperty('--tc', theme.color);
    });

    // Update button active states
    neonThemeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === themeName);
    });
  }

  neonThemeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering map card click
      updateNeonCityTheme(btn.dataset.theme);
    });
  });

  // Initialize with default theme
  updateNeonCityTheme('cyan');

  // ── Wasteland color theme selection ────────────────────────
  const wastelandThemeBtns = document.querySelectorAll('.wasteland-theme-btn');
  const wastelandCard = document.querySelector('.map-card--wasteland');
  const wastelandPreview = document.getElementById('wastelandPreview');
  const wastelandTitle = document.getElementById('wastelandTitle');
  const wastelandTag1 = document.getElementById('wastelandTag1');
  const wastelandTag2 = document.getElementById('wastelandTag2');
  const wastelandTag3 = document.getElementById('wastelandTag3');

  // Wasteland color theme data for UI updates
  const wastelandColors = {
    teal:   { color: '#00CCDD', bg: '#020b10', road: 'rgba(0,204,221,0.38)' },
    pink:   { color: '#FF44CC', bg: '#0a0010', road: 'rgba(255,68,204,0.45)' },
    green:  { color: '#88AA44', bg: '#060804', road: 'rgba(136,170,68,0.38)' },
    orange: { color: '#FF6622', bg: '#0a0602', road: 'rgba(255,102,34,0.38)' }
  };

  function updateWastelandTheme(themeName) {
    const theme = wastelandColors[themeName];
    if (!theme) return;

    selectedWastelandTheme = themeName;

    // Update card border glow color
    if (wastelandCard) {
      wastelandCard.style.setProperty('--wasteland-theme-color', theme.color);
      wastelandCard.style.setProperty('--wasteland-theme-glow', theme.color.replace('#', 'rgba(') + ',0.5)');
      wastelandCard.style.borderColor = theme.color;
    }

    // Update preview colors
    if (wastelandPreview) {
      wastelandPreview.style.setProperty('--mbg', theme.bg);
      wastelandPreview.style.setProperty('--mr', theme.road);
    }

    // Update all preview dots
    for (let i = 1; i <= 5; i++) {
      const dot = document.getElementById('wastelandDot' + i);
      if (dot) {
        dot.style.background = theme.color;
        dot.style.boxShadow = `0 0 8px ${theme.color}`;
      }
    }

    // Update title
    if (wastelandTitle) {
      wastelandTitle.style.color = theme.color;
      wastelandTitle.style.textShadow = `0 0 12px ${theme.color}`;
    }

    // Update tags
    [wastelandTag1, wastelandTag2, wastelandTag3].forEach(tag => {
      if (tag) tag.style.setProperty('--tc', theme.color);
    });

    // Update button active states
    wastelandThemeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === themeName);
    });
  }

  wastelandThemeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering map card click
      updateWastelandTheme(btn.dataset.theme);
    });
  });

  // Initialize wasteland with default theme
  updateWastelandTheme('orange');

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
  const pageTab3  = document.getElementById('pageTab3');
  const mapPage1  = document.getElementById('mapPage1');
  const mapPage2  = document.getElementById('mapPage2');
  const mapPage3  = document.getElementById('mapPage3');

  function switchPage(page) {
    currentPage = page;
    mapPage1.style.display = 'none';
    mapPage2.style.display = 'none';
    if (mapPage3) mapPage3.style.display = 'none';
    pageTab1.classList.remove('active');
    pageTab2.classList.remove('active');
    if (pageTab3) pageTab3.classList.remove('active');
    if (page === 1) {
      mapPage1.style.display = '';
      pageTab1.classList.add('active');
    } else if (page === 2) {
      mapPage2.style.display = '';
      pageTab2.classList.add('active');
    } else if (page === 3) {
      if (mapPage3) mapPage3.style.display = '';
      if (pageTab3) pageTab3.classList.add('active');
    }
  }

  if (pageTab1) pageTab1.addEventListener('click', () => switchPage(1));
  if (pageTab2) pageTab2.addEventListener('click', () => switchPage(2));
  if (pageTab3) pageTab3.addEventListener('click', () => switchPage(3));

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
    let mapData  = CONFIG.MAPS.find(m => m.id === selectedMapId) || CONFIG.MAPS[0];
    if (!charData) return;

    // If Neon City is selected, apply the selected color theme
    if (mapData.id === 'neon_city' && CONFIG.NEON_CITY_THEMES && CONFIG.NEON_CITY_THEMES[selectedNeonTheme]) {
      const theme = CONFIG.NEON_CITY_THEMES[selectedNeonTheme];
      // Create a merged map config with the theme colors applied
      mapData = {
        ...mapData,
        theme: theme.theme,
        previewBg: theme.previewBg,
        previewRoad: theme.previewRoad,
        roadColor: theme.roadColor,
        sidewalkColor: theme.sidewalkColor,
        buildingPalette: theme.buildingPalette,
        neonColors: theme.neonColors,
        windowColors: theme.windowColors,
        lightColor: theme.lightColor,
        lightGlow: theme.lightGlow,
        weather: theme.weather,
        botPalettes: theme.botPalettes,
        selectedTheme: selectedNeonTheme  // Store which theme was selected
      };
    }

    // If Wasteland is selected, apply the selected color theme
    if (mapData.id === 'wasteland' && CONFIG.WASTELAND_THEMES && CONFIG.WASTELAND_THEMES[selectedWastelandTheme]) {
      const theme = CONFIG.WASTELAND_THEMES[selectedWastelandTheme];
      // Create a merged map config with the theme colors applied
      mapData = {
        ...mapData,
        theme: theme.theme,
        previewBg: theme.previewBg,
        previewRoad: theme.previewRoad,
        roadColor: theme.roadColor,
        sidewalkColor: theme.sidewalkColor,
        buildingPalette: theme.buildingPalette,
        neonColors: theme.neonColors,
        windowColors: theme.windowColors,
        lightColor: theme.lightColor,
        lightGlow: theme.lightGlow,
        weather: theme.weather,
        botPalettes: theme.botPalettes,
        selectedTheme: selectedWastelandTheme  // Store which theme was selected
      };
    }

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
    } else if (currentPage === 2) {
      const mapIdx = page2Keys.indexOf(e.code);
      if (mapIdx >= 0) {
        const page2Cards = document.querySelectorAll('#mapPage2 .map-card');
        if (mapIdx < page2Cards.length) page2Cards[mapIdx].click();
      }
    } else if (currentPage === 3) {
      const mapIdx = page2Keys.indexOf(e.code);
      if (mapIdx >= 0) {
        const page3Cards = document.querySelectorAll('#mapPage3 .map-card');
        if (mapIdx < page3Cards.length) page3Cards[mapIdx].click();
      }
    }

    // Tab = switch map page; Shift+Tab = switch char page
    if (e.code === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        switchCharPage(currentCharPage === 1 ? 2 : 1);
      } else {
        switchPage(currentPage === 1 ? 2 : currentPage === 2 ? 3 : 1);
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
