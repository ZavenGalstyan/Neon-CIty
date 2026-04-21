// ══════════════════════════════════════════════════════════════════════════════
// LIFE MODE SYSTEM — peaceful city simulator
// All life-mode logic lives here; other modes are untouched.
// ══════════════════════════════════════════════════════════════════════════════

class LifeModeSystem {
  constructor(game) {
    this.game = game;

    // ── Economy ───────────────────────────────────────────────────────────────
    this.wallet      = parseFloat(localStorage.getItem('lm_wallet') || '500');
    this.bank        = parseFloat(localStorage.getItem('lm_bank')   || '0');

    // ── Basic Needs (0–100) ───────────────────────────────────────────────────
    this.hunger  = parseFloat(localStorage.getItem('lm_hunger')  || '80');
    this.energy  = parseFloat(localStorage.getItem('lm_energy')  || '90');
    this.hygiene = parseFloat(localStorage.getItem('lm_hygiene') || '100');
    this.fun     = parseFloat(localStorage.getItem('lm_fun')     || '70');
da
    // ── Owned Assets ──────────────────────────────────────────────────────────
    this.ownedProperties = JSON.parse(localStorage.getItem('lm_properties') || '[]');
    this.ownedCars       = JSON.parse(localStorage.getItem('lm_cars')       || '[]');
    this.inventory       = JSON.parse(localStorage.getItem('lm_inventory')  || '[]');

    // ── Active Job ────────────────────────────────────────────────────────────
    this.activeJob     = null;
    this.jobCooldown   = 0;
    this._jobFlashT    = 0;
    this._jobComplete  = false;
    this._jobCompleteT = 0;

    // ── NPC Interaction ───────────────────────────────────────────────────────
    this.nearNpc      = null;
    this.dialogOpen   = false;
    this.dialogNpc    = null;
    this.dialogLines  = [];
    this.dialogIdx    = 0;

    // ── Panels ────────────────────────────────────────────────────────────────
    this.shopOpen    = false;
    this.shopTab     = 0;       // 0=food 1=clothes 2=tools 3=cars 4=property
    this.shopScroll  = 0;
    this.panelOpen   = false;
    this._careerTab  = 0;       // 0=Jobs 1=Bank 2=Assets

    // ── HUD notifications ─────────────────────────────────────────────────────
    this._notifs     = [];      // { text, t, col }

    // ── Timers ────────────────────────────────────────────────────────────────
    this._needsTimer = 0;
    this._saveTimer  = 0;

    // ── Input edge-detect (keyboard) ──────────────────────────────────────────
    this._prevE   = false;
    this._prevJ   = false;
    this._prevB   = false;
    this._prevEsc = false;

    // ── Click tracking (set in update, read in render, cleared after render) ──
    this._click   = null;   // { x, y } — screen-space click this frame, or null
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DATA TABLES
  // ══════════════════════════════════════════════════════════════════════════

  static JOBS = [
    { id:'taxi',       label:'🚕 TAXI DRIVER',    pay:45,  duration:18, desc:'Drive passengers to their destinations.' },
    { id:'delivery',   label:'📦 DELIVERY',        pay:35,  duration:14, desc:'Deliver packages across the city.' },
    { id:'police',     label:'🚔 POLICE OFFICER',  pay:70,  duration:25, desc:'Patrol streets and maintain order.' },
    { id:'doctor',     label:'🏥 DOCTOR',          pay:120, duration:40, desc:'Treat patients at the city clinic.' },
    { id:'chef',       label:'🍳 CHEF',            pay:55,  duration:20, desc:'Cook meals at the downtown diner.' },
    { id:'mechanic',   label:'🔧 MECHANIC',        pay:65,  duration:22, desc:'Repair vehicles at the garage.' },
    { id:'cashier',    label:'💰 CASHIER',         pay:28,  duration:10, desc:'Ring up customers at the store.' },
    { id:'teacher',    label:'📚 TEACHER',         pay:90,  duration:30, desc:'Teach classes at City College.' },
    { id:'journalist', label:'📰 JOURNALIST',      pay:80,  duration:28, desc:'Cover breaking city news stories.' },
    { id:'business',   label:'💼 BUSINESSMAN',     pay:200, duration:60, desc:'Run the downtown business office.' },
  ];

  static SHOP_ITEMS = {
    food: [
      { id:'burger',     name:'🍔 Burger',        price:8,   effect:'hunger+25' },
      { id:'pizza',      name:'🍕 Pizza',         price:14,  effect:'hunger+45' },
      { id:'coffee',     name:'☕ Coffee',        price:5,   effect:'energy+20' },
      { id:'smoothie',   name:'🥤 Smoothie',      price:9,   effect:'hunger+15,energy+10' },
      { id:'hotdog',     name:'🌭 Hotdog',        price:6,   effect:'hunger+18' },
      { id:'salad',      name:'🥗 Salad',         price:11,  effect:'hunger+22,energy+5' },
      { id:'steak',      name:'🥩 Steak',         price:28,  effect:'hunger+60,energy+15' },
      { id:'energydrink',name:'⚡ Energy Drink',  price:7,   effect:'energy+40' },
    ],
    clothes: [
      { id:'casual',  name:'👕 Casual Shirt',  price:30,  effect:'fun+5' },
      { id:'suit',    name:'🤵 Business Suit', price:120, effect:'fun+20' },
      { id:'jacket',  name:'🧥 Cool Jacket',   price:75,  effect:'fun+12' },
      { id:'cap',     name:'🧢 Cap',           price:25,  effect:'fun+5' },
      { id:'shoes',   name:'👟 Sneakers',      price:60,  effect:'fun+8' },
      { id:'glasses', name:'🕶️ Sunglasses',   price:45,  effect:'fun+7' },
    ],
    tools: [
      { id:'phone',   name:'📱 Smartphone',  price:250, effect:'fun+30' },
      { id:'laptop',  name:'💻 Laptop',      price:400, effect:'fun+25' },
      { id:'bike',    name:'🚲 Bicycle',     price:180, effect:'energy+5' },
      { id:'toolbox', name:'🔧 Toolbox',     price:90,  effect:'fun+10' },
      { id:'watch',   name:'⌚ Watch',        price:150, effect:'fun+15' },
    ],
    cars: [
      { id:'sedan',    name:'🚗 Sedan',         price:8000   },
      { id:'suv',      name:'🚙 SUV',           price:14000  },
      { id:'sports',   name:'🏎️ Sports Car',   price:35000  },
      { id:'van',      name:'🚐 Van',           price:11000  },
      { id:'taxi_car', name:'🚕 Taxi',          price:6500   },
      { id:'pickup',   name:'🛻 Pickup Truck',  price:18000  },
    ],
    property: [
      { id:'studio',    name:'🏠 Studio Apt.',  price:15000,  rent:0 },
      { id:'apartment', name:'🏢 Apartment',    price:35000,  rent:0 },
      { id:'house',     name:'🏡 House',        price:75000,  rent:0 },
      { id:'penthouse', name:'🌆 Penthouse',    price:180000, rent:0 },
      { id:'mansion',   name:'🏰 Mansion',      price:500000, rent:0 },
    ],
  };

  static NPC_DIALOGS = [
    { name:'Maria',  col:'#FFAACC', lines:['Hey there, newcomer!','The job board is up at City Hall.','Great day to be alive in this city!'] },
    { name:'Jack',   col:'#AADDFF', lines:['Looking for work? Try the taxi job.','The diner on 5th always needs help.','Don\'t forget to eat — city living is tiring!'] },
    { name:'Elena',  col:'#AAFFCC', lines:['The bank on Main St. has great rates.','I just bought my own apartment!','Have you tried the city park yet?'] },
    { name:'Carlos', col:'#FFDDAA', lines:['Mechanic shop is always hiring.','Great weather today, eh?','The market has fresh produce daily.'] },
    { name:'Sophie', col:'#DDAAFF', lines:['I\'m training to be a doctor!','The hospital takes volunteers too.','Life in this city is what you make it.'] },
    { name:'Mike',   col:'#AAFFDD', lines:['Business is booming downtown!','Invest in property — best long-term play.','Have you seen the new shopping district?'] },
    { name:'Zoe',    col:'#FFCCAA', lines:['Good morning! Just got off the night shift.','The coffee shop opens at 7 AM.','City life is non-stop, I love it.'] },
    { name:'Ahmed',  col:'#CCDDFF', lines:['Journalism keeps me busy every day!','There\'s always a story to find here.','The mayor\'s office is worth a visit.'] },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // UPDATE — all input handling & logic here, NO click detection in render
  // ══════════════════════════════════════════════════════════════════════════

  update(dt) {
    const inp = this.game.input;

    // ── Capture click position for this frame ──────────────────────────────
    // Store before any logic so render can use it reliably
    if (inp.mouseJustDown) {
      this._click = { x: inp.mouseScreen.x, y: inp.mouseScreen.y };
    } else {
      this._click = null;
    }

    // ── Needs decay ────────────────────────────────────────────────────────
    this._needsTimer += dt;
    if (this._needsTimer >= 8) {
      this._needsTimer = 0;
      this.hunger  = Math.max(0, this.hunger  - 1.2);
      this.energy  = Math.max(0, this.energy  - 0.8);
      this.hygiene = Math.max(0, this.hygiene - 0.5);
      this.fun     = Math.max(0, this.fun     - 0.6);
      if (this.hunger < 10) {
        this.game.player.health = Math.max(1, this.game.player.health - 2);
        this._notify('😫 You are starving! Eat something!', '#FF4444');
      }
      if (this.energy < 5) {
        this._notify('😴 You are exhausted! Rest or drink coffee.', '#FFAA44');
      }
    }

    // ── Active job countdown ───────────────────────────────────────────────
    this._jobFlashT += dt;
    if (this._jobCompleteT > 0) {
      this._jobCompleteT -= dt;
      if (this._jobCompleteT <= 0) this._jobComplete = false;
    }
    if (this.activeJob) {
      this.activeJob.timer -= dt;
      if (this.activeJob.timer <= 0) this._completeJob();
    }
    if (this.jobCooldown > 0) this.jobCooldown -= dt;

    // ── Notification timers ────────────────────────────────────────────────
    for (let i = this._notifs.length - 1; i >= 0; i--) {
      this._notifs[i].t -= dt;
      if (this._notifs[i].t <= 0) this._notifs.splice(i, 1);
    }

    // ── Find nearest NPC ──────────────────────────────────────────────────
    this.nearNpc = null;
    let bestDist = 80;
    for (const npc of this.game._cityNpcs) {
      const d = Math.hypot(npc.x - this.game.player.x, npc.y - this.game.player.y);
      if (d < bestDist) { bestDist = d; this.nearNpc = npc; }
    }

    // ── ESC: close any open panel (before other key checks) ───────────────
    const escDown = inp.isDown('Escape');
    if (escDown && !this._prevEsc) {
      if (this.dialogOpen || this.shopOpen || this.panelOpen) {
        this.dialogOpen = false;
        this.shopOpen   = false;
        this.panelOpen  = false;
        this._prevEsc = escDown;
        // Consume ESC so game doesn't pause
        return;
      }
    }
    this._prevEsc = escDown;

    // ── E: talk to NPC / advance dialog ───────────────────────────────────
    const eDown = inp.isDown('KeyE');
    if (eDown && !this._prevE) {
      if (this.dialogOpen) {
        this._advanceDialog();
      } else if (this.nearNpc && !this.shopOpen && !this.panelOpen) {
        this._openDialog(this.nearNpc);
      }
    }
    this._prevE = eDown;

    // ── J: toggle career panel ─────────────────────────────────────────────
    const jDown = inp.isDown('KeyJ');
    if (jDown && !this._prevJ) {
      if (this.panelOpen) {
        this.panelOpen = false;
      } else if (!this.dialogOpen && !this.shopOpen) {
        this.panelOpen  = true;
        this._careerTab = 0;
      }
    }
    this._prevJ = jDown;

    // ── B: toggle shop ─────────────────────────────────────────────────────
    const bDown = inp.isDown('KeyB');
    if (bDown && !this._prevB) {
      if (this.shopOpen) {
        this.shopOpen = false;
      } else if (!this.dialogOpen && !this.panelOpen) {
        this.shopOpen   = true;
        this.shopTab    = 0;
        this.shopScroll = 0;
      }
    }
    this._prevB = bDown;

    // ── Panel / shop click handling ────────────────────────────────────────
    if (this._click) {
      const cx = this._click.x, cy = this._click.y;
      if (this.panelOpen)   this._handlePanelClick(cx, cy);
      else if (this.shopOpen) this._handleShopClick(cx, cy);
    }

    // ── Auto-save ─────────────────────────────────────────────────────────
    this._saveTimer += dt;
    if (this._saveTimer >= 15) { this._saveTimer = 0; this._save(); }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CLICK HANDLERS (called from update with screen-space coordinates)
  // ══════════════════════════════════════════════════════════════════════════

  _handlePanelClick(cx, cy) {
    const W = this.game.canvas.width, H = this.game.canvas.height;
    const pW = 540, pH = 520, px = W / 2 - pW / 2, py = H / 2 - pH / 2;

    // Close button
    if (cx >= px + pW - 40 && cx <= px + pW - 10 && cy >= py + 8 && cy <= py + 30) {
      this.panelOpen = false;
      return;
    }

    // Sub-tabs
    const stW = (pW - 32) / 3;
    for (let i = 0; i < 3; i++) {
      const tx = px + 16 + i * (stW + 4), ty = py + 44;
      if (cx >= tx && cx <= tx + stW && cy >= ty && cy <= ty + 24) {
        this._careerTab = i;
        return;
      }
    }

    // Tab content clicks
    if (this._careerTab === 0) this._handleJobsClick(cx, cy, px, py, pW, pH);
    else if (this._careerTab === 1) this._handleBankClick(cx, cy, px, py, pW, pH);
  }

  _handleJobsClick(cx, cy, px, py, pW, pH) {
    const listY = py + 78, itemH = 64;
    const canWork = this.energy >= 15 && this.jobCooldown <= 0 && !this.activeJob;

    // Cancel active job
    if (this.activeJob) {
      if (cx >= this.game.canvas.width / 2 - 70 && cx <= this.game.canvas.width / 2 + 70 &&
          cy >= listY + 30 && cy <= listY + 58) {
        this.cancelJob();
      }
      return;
    }

    if (!canWork) return;

    LifeModeSystem.JOBS.forEach((job, idx) => {
      const row = Math.floor(idx / 2), col = idx % 2;
      const ix  = px + 16 + col * ((pW - 32) / 2 + 2);
      const iy  = listY + row * (itemH + 6);
      const iw  = (pW - 40) / 2;
      if (iy + itemH > py + pH - 10) return;

      // START button area
      const bx = ix + iw - 60, by = iy + 8;
      if (cx >= bx && cx <= bx + 52 && cy >= by && cy <= by + 22) {
        this.startJob(job.id);
      }
    });
  }

  _handleBankClick(cx, cy, px, py, pW, pH) {
    const cy0 = py + 100;
    const btns = [
      () => this.bankDeposit(100),
      () => this.bankDeposit(1000),
      () => this.bankWithdraw(100),
      () => this.bankWithdraw(1000),
      () => this.bankDeposit(this.wallet),
      () => this.bankWithdraw(this.bank),
    ];
    btns.forEach((fn, i) => {
      const bx = px + 20 + (i % 3) * ((pW - 60) / 3 + 5);
      const by = cy0 + 80 + Math.floor(i / 3) * 44;
      const bw = (pW - 60) / 3;
      if (cx >= bx && cx <= bx + bw && cy >= by && cy <= by + 34) fn();
    });
  }

  _handleShopClick(cx, cy) {
    const W = this.game.canvas.width, H = this.game.canvas.height;
    const pW = 580, pH = 480, px = W / 2 - pW / 2, py = H / 2 - pH / 2;

    // Close button
    if (cx >= px + pW - 40 && cx <= px + pW - 10 && cy >= py + 8 && cy <= py + 30) {
      this.shopOpen = false;
      return;
    }

    // Tab bar
    const tabs = ['food','clothes','tools','cars','property'];
    for (let i = 0; i < tabs.length; i++) {
      const tx = px + 12 + i * (pW - 24) / tabs.length;
      const tw = (pW - 24) / tabs.length - 4;
      if (cx >= tx && cx <= tx + tw && cy >= py + 42 && cy <= py + 68) {
        this.shopTab = i;
        this.shopScroll = 0;
        return;
      }
    }

    // Item BUY buttons
    const catKey = tabs[this.shopTab];
    const items  = LifeModeSystem.SHOP_ITEMS[catKey] || [];
    const itemH  = 52, itemsPerRow = 2;
    const listY  = py + 76, listH = pH - 90;

    items.forEach((item, idx) => {
      const col = idx % itemsPerRow;
      const row = Math.floor(idx / itemsPerRow);
      const ix  = px + 16 + col * ((pW - 32) / itemsPerRow);
      const iy  = listY + row * (itemH + 6) - this.shopScroll;
      const iw  = (pW - 40) / itemsPerRow;
      if (iy + itemH < listY || iy > listY + listH) return;

      const owned = catKey === 'property' ? this.ownedProperties.includes(item.id)
                  : catKey === 'cars'     ? this.ownedCars.includes(item.id)
                  : false;
      if (owned) return;

      const bx = ix + iw - 60, by = iy + 8;
      if (cx >= bx && cx <= bx + 52 && cy >= by && cy <= by + 22) {
        this.buy(catKey, item.id);
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // JOB LOGIC
  // ══════════════════════════════════════════════════════════════════════════

  startJob(jobId) {
    if (this.activeJob) return;
    if (this.jobCooldown > 0) { this._notify('⏳ Wait before starting another job.', '#FFAA44'); return; }
    const job = LifeModeSystem.JOBS.find(j => j.id === jobId);
    if (!job) return;
    if (this.energy < 15) { this._notify('😴 Too tired to work! Drink coffee first.', '#FFAA44'); return; }
    this.activeJob  = { ...job, timer: job.duration };
    this.energy     = Math.max(0, this.energy - 10);
    this._notify(`🟢 Started: ${job.label}`, '#44FF88');
    this.panelOpen  = false;
  }

  _completeJob() {
    if (!this.activeJob) return;
    const earned       = this.activeJob.pay;
    this.wallet       += earned;
    this._notify(`✅ Job done! +$${earned} earned.`, '#FFDD44');
    this._jobComplete  = true;
    this._jobCompleteT = 4;
    this.jobCooldown   = 8;
    this.fun     = Math.min(100, this.fun    + 8);
    this.energy  = Math.max(0,   this.energy - 15);
    this.hunger  = Math.max(0,   this.hunger - 12);
    this.activeJob = null;
    this._save();
  }

  cancelJob() {
    this.activeJob = null;
    this._notify('❌ Job cancelled.', '#FF6644');
    this.jobCooldown = 5;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SHOP / BUY LOGIC
  // ══════════════════════════════════════════════════════════════════════════

  buy(category, itemId) {
    const list = LifeModeSystem.SHOP_ITEMS[category];
    if (!list) return;
    const item = list.find(i => i.id === itemId);
    if (!item) return;

    if (category === 'property') {
      if (this.ownedProperties.includes(itemId)) { this._notify('🏠 You already own this!', '#FFAA44'); return; }
      const total = this.wallet + this.bank;
      if (total < item.price) { this._notify(`💸 Need $${(item.price - total).toLocaleString()} more!`, '#FF4444'); return; }
      const fromBank = Math.min(this.bank, item.price);
      this.bank   -= fromBank;
      this.wallet -= (item.price - fromBank);
      this.ownedProperties.push(itemId);
      this._notify(`🏠 You bought ${item.name}!`, '#44FF88');
      this.fun = Math.min(100, this.fun + 20);
      this._save(); return;
    }

    if (category === 'cars') {
      if (this.ownedCars.includes(itemId)) { this._notify('🚗 You already own this car!', '#FFAA44'); return; }
      const total = this.wallet + this.bank;
      if (total < item.price) { this._notify(`💸 Need $${(item.price - total).toLocaleString()} more!`, '#FF4444'); return; }
      const fromBank = Math.min(this.bank, item.price);
      this.bank   -= fromBank;
      this.wallet -= (item.price - fromBank);
      this.ownedCars.push(itemId);
      this._notify(`🚗 You bought a ${item.name}!`, '#44FF88');
      this.fun = Math.min(100, this.fun + 15);
      this._save(); return;
    }

    if (this.wallet < item.price) { this._notify(`💸 Need $${item.price}. Not enough!`, '#FF4444'); return; }
    this.wallet -= item.price;
    this.inventory.push(itemId);
    this._applyEffect(item.effect || '');
    this._notify(`✅ Bought ${item.name}!`, '#44FF88');
    this._save();
  }

  _applyEffect(effect) {
    effect.split(',').forEach(e => {
      const [stat, valStr] = e.split('+');
      const val = parseFloat(valStr) || 0;
      if (stat === 'hunger')  this.hunger  = Math.min(100, this.hunger  + val);
      if (stat === 'energy')  this.energy  = Math.min(100, this.energy  + val);
      if (stat === 'hygiene') this.hygiene = Math.min(100, this.hygiene + val);
      if (stat === 'fun')     this.fun     = Math.min(100, this.fun     + val);
    });
  }

  bankDeposit(amount) {
    amount = Math.min(amount, this.wallet);
    if (amount <= 0) { this._notify('💸 No wallet money to deposit!', '#FF4444'); return; }
    this.wallet -= amount;
    this.bank   += amount;
    this._notify(`🏦 Deposited $${amount.toLocaleString()}.`, '#88DDFF');
    this._save();
  }

  bankWithdraw(amount) {
    amount = Math.min(amount, this.bank);
    if (amount <= 0) { this._notify('🏦 Bank is empty!', '#FF4444'); return; }
    this.bank   -= amount;
    this.wallet += amount;
    this._notify(`🏦 Withdrew $${amount.toLocaleString()}.`, '#88DDFF');
    this._save();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DIALOG
  // ══════════════════════════════════════════════════════════════════════════

  _openDialog(npc) {
    const templates = LifeModeSystem.NPC_DIALOGS;
    const idx  = Math.abs(this.game._cityNpcs.indexOf(npc)) % templates.length;
    const tmpl = templates[idx];
    this.dialogNpc   = { ...tmpl, x: npc.x, y: npc.y };
    this.dialogLines = tmpl.lines;
    this.dialogIdx   = 0;
    this.dialogOpen  = true;
    this.fun = Math.min(100, this.fun + 2);
  }

  _advanceDialog() {
    if (!this.dialogOpen) return;
    this.dialogIdx++;
    if (this.dialogIdx >= this.dialogLines.length) {
      this.dialogOpen = false;
      this.dialogNpc  = null;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PERSISTENCE
  // ══════════════════════════════════════════════════════════════════════════

  _save() {
    localStorage.setItem('lm_wallet',     this.wallet);
    localStorage.setItem('lm_bank',       this.bank);
    localStorage.setItem('lm_hunger',     this.hunger);
    localStorage.setItem('lm_energy',     this.energy);
    localStorage.setItem('lm_hygiene',    this.hygiene);
    localStorage.setItem('lm_fun',        this.fun);
    localStorage.setItem('lm_properties', JSON.stringify(this.ownedProperties));
    localStorage.setItem('lm_cars',       JSON.stringify(this.ownedCars));
    localStorage.setItem('lm_inventory',  JSON.stringify(this.inventory));
  }

  resetSave() {
    ['lm_wallet','lm_bank','lm_hunger','lm_energy','lm_hygiene','lm_fun',
     'lm_properties','lm_cars','lm_inventory'].forEach(k => localStorage.removeItem(k));
    this._notify('🔄 Life data reset!', '#88DDFF');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ══════════════════════════════════════════════════════════════════════════

  _notify(text, col = '#FFFFFF') {
    this._notifs.unshift({ text, t: 3.5, col });
    if (this._notifs.length > 6) this._notifs.length = 6;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER — draw only, NO input handling here
  // ══════════════════════════════════════════════════════════════════════════

  renderHUD(ctx, W, H) {
    this._renderNeedsBar(ctx, W, H);
    this._renderMoneyBar(ctx, W);
    if (this.activeJob)    this._renderJobProgress(ctx, W, H);
    if (this._jobComplete) this._renderJobComplete(ctx, W, H);
    this._renderNotifs(ctx, W);
    if (this.nearNpc && !this.dialogOpen && !this.shopOpen && !this.panelOpen)
      this._renderInteractPrompt(ctx, W, H);
    this._renderHotkeys(ctx, W, H);
    if (this.dialogOpen)   this._renderDialog(ctx, W, H);
    if (this.shopOpen)     this._renderShop(ctx, W, H);
    if (this.panelOpen)    this._renderPanel(ctx, W, H);
  }

  // ── Needs bars (bottom center) ────────────────────────────────────────────
  _renderNeedsBar(ctx, W, H) {
    const bars = [
      { label:'🍔', val:this.hunger,  col:'#FF8844' },
      { label:'⚡', val:this.energy,  col:'#FFDD44' },
      { label:'🚿', val:this.hygiene, col:'#44DDFF' },
      { label:'😊', val:this.fun,     col:'#DD88FF' },
    ];
    const barW = 110, barH = 8, gap = 16;
    const total = bars.length * (barW + gap) - gap;
    const startX = W / 2 - total / 2, y = H - 56;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.roundRect(startX - 10, y - 16, total + 20, 34, 8); ctx.fill();

    bars.forEach((bar, i) => {
      const x = startX + i * (barW + gap);
      ctx.font = '12px serif'; ctx.textAlign = 'left';
      ctx.fillText(bar.label, x, y - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.roundRect(x + 18, y - 8, barW - 18, barH, 3); ctx.fill();
      const pct = Math.max(0, Math.min(1, bar.val / 100));
      ctx.fillStyle = pct < 0.25 ? '#FF4444' : pct < 0.5 ? '#FFAA44' : bar.col;
      ctx.beginPath(); ctx.roundRect(x + 18, y - 8, (barW - 18) * pct, barH, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 7px monospace'; ctx.textAlign = 'left';
      ctx.fillText(Math.round(bar.val) + '%', x + barW - 12, y - 1);
    });
  }

  // ── Money bar (top-left) ──────────────────────────────────────────────────
  _renderMoneyBar(ctx, W) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(16, 16, 220, 50, 8); ctx.fill();

    ctx.fillStyle = '#FFDD44';
    ctx.font = 'bold 13px Orbitron, monospace'; ctx.textAlign = 'left';
    ctx.shadowColor = '#FFDD44'; ctx.shadowBlur = 8;
    ctx.fillText(`💵 $${Math.floor(this.wallet).toLocaleString()}`, 26, 36);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#88DDFF';
    ctx.font = 'bold 10px Orbitron, monospace';
    ctx.fillText(`🏦 $${Math.floor(this.bank).toLocaleString()}`, 26, 56);

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '8px monospace';
    ctx.fillText(`🏠${this.ownedProperties.length}  🚗${this.ownedCars.length}  🎒${this.inventory.length}`, 150, 36);
  }

  // ── Active job progress bar (center-top) ──────────────────────────────────
  _renderJobProgress(ctx, W, H) {
    const job = this.activeJob;
    const pct = 1 - (job.timer / job.duration);
    const bW  = 340, bH = 22, x = W / 2 - bW / 2, y = 80;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.roundRect(x - 10, y - 8, bW + 20, bH + 28, 8); ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.fillText(job.label, W / 2, y + 8);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.roundRect(x, y + 14, bW, bH - 8, 4); ctx.fill();

    const glow = 0.7 + 0.3 * Math.sin(this._jobFlashT * 4);
    ctx.fillStyle = `rgba(68,255,136,${glow})`;
    ctx.beginPath(); ctx.roundRect(x, y + 14, bW * pct, bH - 8, 4); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '9px monospace'; ctx.textAlign = 'right';
    ctx.fillText(`${Math.ceil(job.timer)}s · +$${job.pay}`, x + bW, y + 26);

    ctx.fillStyle = 'rgba(255,100,100,0.55)';
    ctx.font = '8px monospace'; ctx.textAlign = 'left';
    ctx.fillText('[J] to cancel', x, y + 40);
  }

  // ── Job complete flash ─────────────────────────────────────────────────────
  _renderJobComplete(ctx, W, H) {
    if (this._jobCompleteT <= 0) return;
    const a = Math.min(1, this._jobCompleteT * 0.5);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(68,255,100,0.18)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#44FF88';
    ctx.font = 'bold 28px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.shadowColor = '#44FF88'; ctx.shadowBlur = 30;
    ctx.fillText('✅ JOB COMPLETE!', W / 2, H / 2 - 20);
    ctx.shadowBlur = 0; ctx.restore();
  }

  // ── Notifications (right side) ────────────────────────────────────────────
  _renderNotifs(ctx, W) {
    this._notifs.forEach((n, i) => {
      const a = Math.min(1, n.t * 0.8);
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath(); ctx.roundRect(W - 330, 70 + i * 36, 320, 28, 6); ctx.fill();
      ctx.fillStyle = n.col;
      ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
      ctx.fillText(n.text, W - 322, 89 + i * 36);
      ctx.restore();
    });
  }

  // ── NPC prompt ────────────────────────────────────────────────────────────
  _renderInteractPrompt(ctx, W, H) {
    const t = performance.now() / 1000;
    const a = 0.7 + 0.3 * Math.sin(t * 3);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.roundRect(W / 2 - 90, H / 2 + 60, 180, 28, 6); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
    ctx.fillText('[E] Talk to NPC', W / 2, H / 2 + 79);
    ctx.restore();
  }

  // ── Hotkey hints (bottom-right) ───────────────────────────────────────────
  _renderHotkeys(ctx, W, H) {
    if (this.shopOpen || this.panelOpen || this.dialogOpen) return;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.roundRect(W - 190, H - 86, 180, 60, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText('[J] Jobs / Career',  W - 182, H - 68);
    ctx.fillText('[B] Shop / Buy',      W - 182, H - 54);
    ctx.fillText('[E] Talk to NPC',     W - 182, H - 40);
    ctx.fillText('[ESC] Close panel',   W - 182, H - 26);
  }

  // ── Dialog box ────────────────────────────────────────────────────────────
  _renderDialog(ctx, W, H) {
    if (!this.dialogOpen || !this.dialogNpc) return;
    const d  = this.dialogNpc;
    const bW = 520, bH = 110, x = W / 2 - bW / 2, y = H - 170;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath(); ctx.roundRect(x, y, bW, bH, 10); ctx.fill();
    ctx.strokeStyle = d.col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x, y, bW, bH, 10); ctx.stroke();

    ctx.fillStyle = d.col;
    ctx.beginPath(); ctx.arc(x + 44, y + 55, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFDDBB';
    ctx.beginPath(); ctx.arc(x + 44, y + 45, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = d.col + 'AA';
    ctx.beginPath(); ctx.roundRect(x + 30, y + 56, 28, 24, 4); ctx.fill();

    ctx.fillStyle = d.col;
    ctx.font = 'bold 12px Orbitron, monospace'; ctx.textAlign = 'left';
    ctx.shadowColor = d.col; ctx.shadowBlur = 8;
    ctx.fillText(d.name, x + 84, y + 28); ctx.shadowBlur = 0;

    ctx.fillStyle = '#FFFFFF'; ctx.font = '13px monospace';
    ctx.fillText(`"${this.dialogLines[this.dialogIdx] || ''}"`, x + 84, y + 52);

    this.dialogLines.forEach((_, li) => {
      ctx.fillStyle = li === this.dialogIdx ? d.col : 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(x + 84 + li * 14, y + 82, 4, 0, Math.PI * 2); ctx.fill();
    });

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '9px monospace'; ctx.textAlign = 'right';
    ctx.fillText('[E] Continue', x + bW - 14, y + bH - 10);
  }

  // ── Shop panel (draw only) ────────────────────────────────────────────────
  _renderShop(ctx, W, H) {
    const pW = 580, pH = 480, px = W / 2 - pW / 2, py = H / 2 - pH / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#080e18';
    ctx.strokeStyle = '#88DDFF'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(px, py, pW, pH, 12); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#88DDFF';
    ctx.font = 'bold 16px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.shadowColor = '#88DDFF'; ctx.shadowBlur = 12;
    ctx.fillText('🛒 CITY MARKET', W / 2, py + 30); ctx.shadowBlur = 0;

    ctx.fillStyle = '#FFDD44'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'right';
    ctx.fillText(`💵 $${Math.floor(this.wallet).toLocaleString()}  🏦 $${Math.floor(this.bank).toLocaleString()}`, px + pW - 16, py + 30);

    // Close button
    ctx.fillStyle = 'rgba(255,80,80,0.7)';
    ctx.beginPath(); ctx.roundRect(px + pW - 40, py + 8, 30, 22, 4); ctx.fill();
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
    ctx.fillText('✕', px + pW - 25, py + 23);

    // Tabs
    const tabs = ['🍔 Food','👕 Clothes','🔧 Tools','🚗 Cars','🏠 Property'];
    tabs.forEach((tab, i) => {
      const tx = px + 12 + i * (pW - 24) / tabs.length;
      const tw = (pW - 24) / tabs.length - 4;
      const active = this.shopTab === i;
      ctx.fillStyle = active ? '#88DDFF' : 'rgba(136,221,255,0.12)';
      ctx.beginPath(); ctx.roundRect(tx, py + 42, tw, 26, 4); ctx.fill();
      ctx.fillStyle = active ? '#000' : 'rgba(255,255,255,0.6)';
      ctx.font = `bold ${active ? 10 : 9}px monospace`; ctx.textAlign = 'center';
      ctx.fillText(tab, tx + tw / 2, py + 60);
    });

    // Items
    const catKeys = ['food','clothes','tools','cars','property'];
    const catKey  = catKeys[this.shopTab];
    const items   = LifeModeSystem.SHOP_ITEMS[catKey] || [];
    const itemH   = 52, itemsPerRow = 2;
    const listY   = py + 76, listH = pH - 90;

    ctx.save();
    ctx.beginPath(); ctx.rect(px + 8, listY, pW - 16, listH); ctx.clip();

    items.forEach((item, idx) => {
      const col = idx % itemsPerRow;
      const row = Math.floor(idx / itemsPerRow);
      const ix  = px + 16 + col * ((pW - 32) / itemsPerRow);
      const iy  = listY + row * (itemH + 6) - this.shopScroll;
      const iw  = (pW - 40) / itemsPerRow;
      if (iy + itemH < listY || iy > listY + listH) return;

      const owned = catKey === 'property' ? this.ownedProperties.includes(item.id)
                  : catKey === 'cars'     ? this.ownedCars.includes(item.id)
                  : false;
      const canAfford = (this.wallet + this.bank) >= item.price;

      ctx.fillStyle = owned ? 'rgba(68,255,136,0.12)' : 'rgba(136,221,255,0.06)';
      ctx.strokeStyle = owned ? '#44FF88' : 'rgba(136,221,255,0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(ix, iy, iw, itemH, 6); ctx.fill(); ctx.stroke();

      ctx.fillStyle = owned ? '#44FF88' : '#FFFFFF';
      ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
      ctx.fillText(item.name, ix + 10, iy + 20);

      ctx.fillStyle = owned ? '#44FF88' : canAfford ? '#FFDD44' : '#FF6644';
      ctx.font = '10px monospace';
      ctx.fillText(owned ? '✓ OWNED' : `$${item.price.toLocaleString()}`, ix + 10, iy + 36);

      if (item.effect) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '8px monospace';
        ctx.fillText(item.effect.replace(/,/g, ' · '), ix + 10, iy + 46);
      }

      if (!owned) {
        const bx = ix + iw - 60, by = iy + 8;
        ctx.fillStyle = canAfford ? '#44AAFF' : 'rgba(100,100,100,0.4)';
        ctx.beginPath(); ctx.roundRect(bx, by, 52, 22, 4); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
        ctx.fillText('BUY', bx + 26, by + 15);
      }
    });
    ctx.restore();
  }

  // ── Career panel (draw only) ──────────────────────────────────────────────
  _renderPanel(ctx, W, H) {
    const pW = 540, pH = 520, px = W / 2 - pW / 2, py = H / 2 - pH / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#060e0a';
    ctx.strokeStyle = '#44FF88'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(px, py, pW, pH, 12); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#44FF88';
    ctx.font = 'bold 15px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.shadowColor = '#44FF88'; ctx.shadowBlur = 10;
    ctx.fillText('💼 CAREER CENTER', W / 2, py + 30); ctx.shadowBlur = 0;

    // Close button
    ctx.fillStyle = 'rgba(255,80,80,0.7)';
    ctx.beginPath(); ctx.roundRect(px + pW - 40, py + 8, 30, 22, 4); ctx.fill();
    ctx.fillStyle = '#FFF'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
    ctx.fillText('✕', px + pW - 25, py + 23);

    // Sub-tabs
    const subTabs = ['Jobs','Bank','Assets'];
    const stW = (pW - 32) / 3;
    subTabs.forEach((st, i) => {
      const active = this._careerTab === i;
      ctx.fillStyle = active ? '#44FF88' : 'rgba(68,255,136,0.1)';
      ctx.beginPath(); ctx.roundRect(px + 16 + i * (stW + 4), py + 44, stW, 24, 4); ctx.fill();
      ctx.fillStyle = active ? '#000' : 'rgba(255,255,255,0.6)';
      ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
      ctx.fillText(st, px + 16 + i * (stW + 4) + stW / 2, py + 61);
    });

    if (this._careerTab === 0) this._renderJobsTab(ctx, px, py, pW, pH, W, H);
    else if (this._careerTab === 1) this._renderBankTab(ctx, px, py, pW, pH, W, H);
    else this._renderAssetsTab(ctx, px, py, pW, pH, W, H);
  }

  _renderJobsTab(ctx, px, py, pW, pH, W, H) {
    const listY = py + 78, itemH = 64;

    if (this.activeJob) {
      ctx.fillStyle = '#44FF88'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`Working: ${this.activeJob.label} · ${Math.ceil(this.activeJob.timer)}s left`, W / 2, listY + 20);
      ctx.fillStyle = 'rgba(255,80,80,0.8)';
      ctx.beginPath(); ctx.roundRect(W / 2 - 70, listY + 30, 140, 28, 5); ctx.fill();
      ctx.fillStyle = '#FFF'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
      ctx.fillText('❌ Cancel Job', W / 2, listY + 49);
      return;
    }

    const canWork = this.energy >= 15 && this.jobCooldown <= 0;

    LifeModeSystem.JOBS.forEach((job, idx) => {
      const row = Math.floor(idx / 2), col = idx % 2;
      const ix  = px + 16 + col * ((pW - 32) / 2 + 2);
      const iy  = listY + row * (itemH + 6);
      const iw  = (pW - 40) / 2;
      if (iy + itemH > py + pH - 10) return;

      ctx.fillStyle = 'rgba(68,255,136,0.06)';
      ctx.strokeStyle = 'rgba(68,255,136,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(ix, iy, iw, itemH, 6); ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
      ctx.fillText(job.label, ix + 10, iy + 18);

      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '9px monospace';
      ctx.fillText(job.desc, ix + 10, iy + 32);

      ctx.fillStyle = '#FFDD44'; ctx.font = 'bold 10px monospace';
      ctx.fillText(`+$${job.pay} · ${job.duration}s`, ix + 10, iy + 48);

      // START button
      const bx = ix + iw - 60, by = iy + 8;
      ctx.fillStyle = canWork ? '#44FF88' : 'rgba(100,100,100,0.4)';
      ctx.beginPath(); ctx.roundRect(bx, by, 52, 22, 4); ctx.fill();
      ctx.fillStyle = canWork ? '#000' : '#666';
      ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
      ctx.fillText('START', bx + 26, by + 15);
    });

    if (!canWork) {
      ctx.fillStyle = 'rgba(255,160,0,0.7)'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
      const msg = this.jobCooldown > 0
        ? `⏳ Cooldown: ${Math.ceil(this.jobCooldown)}s`
        : '😴 Too tired — buy coffee first!';
      ctx.fillText(msg, W / 2, py + pH - 20);
    }
  }

  _renderBankTab(ctx, px, py, pW, pH, W, H) {
    const cy = py + 100;
    ctx.fillStyle = 'rgba(136,221,255,0.1)';
    ctx.beginPath(); ctx.roundRect(px + 20, cy, pW - 40, 60, 8); ctx.fill();
    ctx.fillStyle = '#FFDD44'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
    ctx.fillText(`💵 Wallet: $${Math.floor(this.wallet).toLocaleString()}`, W / 2, cy + 22);
    ctx.fillStyle = '#88DDFF';
    ctx.fillText(`🏦 Bank:   $${Math.floor(this.bank).toLocaleString()}`, W / 2, cy + 44);

    const cols = ['#44AAFF','#44AAFF','#44AAFF','#FFAA44','#FFAA44','#FFAA44'];
    const labels = ['Deposit $100','Deposit $1000','Deposit ALL','Withdraw $100','Withdraw $1000','Withdraw ALL'];
    labels.forEach((label, i) => {
      const bx = px + 20 + (i % 3) * ((pW - 60) / 3 + 5);
      const by = cy + 80 + Math.floor(i / 3) * 44;
      const bw = (pW - 60) / 3;
      const col = cols[i];
      ctx.fillStyle = col + '33';
      ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(bx, by, bw, 34, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFF'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
      ctx.fillText(label, bx + bw / 2, by + 21);
    });
  }

  _renderAssetsTab(ctx, px, py, pW, pH, W, H) {
    const listY = py + 80;
    ctx.fillStyle = '#FFDD44'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
    ctx.fillText('🏠 Properties:', px + 20, listY);
    if (this.ownedProperties.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '10px monospace';
      ctx.fillText('None yet — buy from the shop!', px + 30, listY + 18);
    } else {
      this.ownedProperties.forEach((id, i) => {
        const p = LifeModeSystem.SHOP_ITEMS.property.find(p => p.id === id);
        ctx.fillStyle = '#44FF88'; ctx.font = '10px monospace';
        ctx.fillText(`• ${p ? p.name : id}`, px + 30, listY + 18 + i * 18);
      });
    }

    const carY = listY + 100;
    ctx.fillStyle = '#FFDD44'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
    ctx.fillText('🚗 Vehicles:', px + 20, carY);
    if (this.ownedCars.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '10px monospace';
      ctx.fillText('None yet — buy from the shop!', px + 30, carY + 18);
    } else {
      this.ownedCars.forEach((id, i) => {
        const c = LifeModeSystem.SHOP_ITEMS.cars.find(c => c.id === id);
        ctx.fillStyle = '#88DDFF'; ctx.font = '10px monospace';
        ctx.fillText(`• ${c ? c.name : id}`, px + 30, carY + 18 + i * 18);
      });
    }

    const invY = carY + 100;
    ctx.fillStyle = '#FFDD44'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
    ctx.fillText(`🎒 Inventory (${this.inventory.length} items):`, px + 20, invY);
    const allItems = [...LifeModeSystem.SHOP_ITEMS.food,
                      ...LifeModeSystem.SHOP_ITEMS.clothes,
                      ...LifeModeSystem.SHOP_ITEMS.tools];
    const counts = {};
    this.inventory.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    Object.entries(counts).forEach(([id, cnt], i) => {
      if (i > 8) return;
      const item = allItems.find(it => it.id === id);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '10px monospace';
      ctx.fillText(`• ${item ? item.name : id} ×${cnt}`, px + 30, invY + 18 + i * 16);
    });

    const propWorth = this.ownedProperties.reduce((s, id) => {
      const p = LifeModeSystem.SHOP_ITEMS.property.find(p => p.id === id);
      return s + (p ? p.price : 0);
    }, 0);
    const carWorth = this.ownedCars.reduce((s, id) => {
      const c = LifeModeSystem.SHOP_ITEMS.cars.find(c => c.id === id);
      return s + (c ? c.price * 0.7 : 0);
    }, 0);
    const netWorth = this.wallet + this.bank + propWorth + carWorth;

    ctx.fillStyle = 'rgba(68,255,136,0.15)';
    ctx.beginPath(); ctx.roundRect(px + 20, py + pH - 60, pW - 40, 36, 6); ctx.fill();
    ctx.fillStyle = '#44FF88'; ctx.font = 'bold 12px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.fillText(`💰 NET WORTH: $${Math.floor(netWorth).toLocaleString()}`, W / 2, py + pH - 36);
  }
}
