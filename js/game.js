'use strict';

class Game {
  constructor(charData, mapData) {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx    = this.canvas.getContext('2d');
    this._resize();
    window.addEventListener('resize', () => this._resize());

    this.charData = charData;
    this.input    = new InputManager(this.canvas);
    this.map      = new GameMap(mapData);
    this.hud      = new HUD(this.canvas);
    this.shop     = new ShopManager();

    // Spawn player at map center road tile
    const RE     = this.map.ROAD_EVERY;
    const cx     = Math.floor(this.map.W / 2 / RE) * RE;
    const cy     = Math.floor(this.map.H / 2 / RE) * RE;
    const spawnX = (cx + 0.5) * this.map.S;
    const spawnY = (cy + 0.5) * this.map.S;
    this.player  = new Player(charData, spawnX, spawnY);

    this.bots      = [];
    this.bullets   = [];
    this.particles = [];
    this.vehicles  = [];
    this.pickups   = [];
    this.decals    = [];

    this.money      = 0;
    this.kills      = 0;
    this.wave       = 1;
    this.spawnTimer = 2000;
    this.waveTimer  = 30000;

    // Vehicle
    this._playerVehicle = null;

    // Killstreak
    this._killStreak  = 0;
    this._streakTimer = 0;
    this._streakPopup = { text: '', timer: 0, mult: 1 };

    // Wanted / Police
    this._wantedLevel = 0;
    this._wantedKills = 0;
    this._wantedDecay = 0;   // seconds since last kill (decay after 10s)
    this._policeTimer = 0;

    // Weather
    this.weather = new Weather(this.map.config.weather || 'clear');

    // Arena mode
    this._arenaMode      = !!this.map.config.arena;
    this._arenaSpawned   = 0;
    this._arenaKilled    = 0;
    this._arenaWaveSize  = 0;
    this._arenaCountdown = 0;

    // Boss tracking
    this.boss              = null;
    this.bossRespawnTimer  = 0;
    this._bossActivated    = false;

    // Camera
    this.camX = spawnX - this.canvas.width  / 2;
    this.camY = spawnY - this.canvas.height / 2;

    this.state = 'playing';

    this._lastTime = null;
    this._raf      = null;

    // Scroll-wheel weapon cycle
    this._wheelHandler = (e) => {
      if (this.state === 'playing') {
        e.preventDefault();
        this.player.cycleWeapon(e.deltaY > 0 ? 1 : -1);
      }
    };
    this.canvas.addEventListener('wheel', this._wheelHandler, { passive: false });

    // Keyboard
    this._keyHandler = (e) => this._onKey(e);
    window.addEventListener('keydown', this._keyHandler);

    this._spawnVehicles();
    if (this._arenaMode) this._startArenaWave();

    requestAnimationFrame((t) => this._loop(t));
  }

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  _onKey(e) {
    if (e.code === 'KeyF' && this.state === 'playing') {
      this._toggleVehicle();
      return;
    }
    if (e.code === 'KeyB') {
      if (this._arenaMode) return; // no shop in arena
      if      (this.state === 'playing') { this.shop.open();  this.state = 'shop'; }
      else if (this.state === 'shop')    { this.shop.close(); this.state = 'playing'; }
      else if (this.state === 'paused')  { this.shop.open();  this.state = 'shop'; }
      return;
    }
    if (e.code === 'KeyP') {
      if      (this.state === 'playing') this.state = 'paused';
      else if (this.state === 'paused')  this.state = 'playing';
      return;
    }
    if (e.code === 'Escape') {
      if (this.state === 'shop')    { this.shop.close(); this.state = 'playing'; return; }
      if (this.state === 'paused')  { this.state = 'playing'; return; }  // ESC = resume
      if (this.state === 'playing') { this.state = 'paused'; return; }
      if (this.state === 'gameover'){ this._destroy(); window.location.href = 'index.html'; return; }
    }
    if (e.code === 'KeyM') {
      if (this.state === 'paused' || this.state === 'gameover') {
        this._destroy(); window.location.href = 'index.html'; return;
      }
    }
    if (e.code === 'KeyR' && this.state === 'gameover') {
      this._destroy();
      window.startGame(this.charData, this.map.config);
      return;
    }
    if (this.state === 'playing') {
      const slot = parseInt(e.key);
      if (slot >= 1 && slot <= 6) { this.player.equipBySlot(slot); return; }
    }
    if (['Space','ArrowUp','ArrowDown'].includes(e.code)) e.preventDefault();
  }

  _destroy() {
    window.removeEventListener('keydown', this._keyHandler);
    this.canvas.removeEventListener('wheel', this._wheelHandler);
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  // ── Game loop ──────────────────────────────────────────────
  _loop(timestamp) {
    if (this._lastTime === null) this._lastTime = timestamp;
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05);
    this._lastTime = timestamp;

    if (this.state === 'playing') this._update(dt);
    if (this.state === 'shop' || this.state === 'paused') this.shop.update(dt);

    this._render();
    this.input.flush();
    this._raf = requestAnimationFrame((t) => this._loop(t));
  }

  // ── Update ─────────────────────────────────────────────────
  _update(dt) {
    this.input.updateMouseWorld(this.camX, this.camY);

    // Sync vehicle state before player update
    this.player.inVehicle = !!this._playerVehicle;
    this.player.update(dt, this.input, this.map, this.bullets, this.particles);
    if (this.player.dead && this.state === 'playing') this.state = 'gameover';

    // ── Vehicles ───────────────────────────────────────────
    for (const v of this.vehicles) {
      if (v.dead) continue;
      v.update(dt, this._playerVehicle === v ? this.player : null, this.input, this.map);
      // Eject player if vehicle explodes
      if (v === this._playerVehicle && v._exploding && !v._ejected) {
        v._ejected = true;
        this._playerVehicle = null;
        this.player.inVehicle = false;
        v.occupied = false;
        this.player.takeDamage(35, this.hud);
        this.player.x = v.x + (Math.random() - 0.5) * 80;
        this.player.y = v.y + (Math.random() - 0.5) * 80;
      }
    }
    this.vehicles = this.vehicles.filter(v => !v.dead);

    // ── Pickups ────────────────────────────────────────────
    for (const p of this.pickups) p.update(dt);
    if (!this.player.dead) {
      for (const p of this.pickups) {
        if (p.dead) continue;
        if (circlesOverlap(p.x, p.y, p.radius, this.player.x, this.player.y, this.player.radius + 10)) {
          const bonus = p.applyTo(this.player);
          if (bonus > 0) this.money += bonus;
          p.dead = true;
        }
      }
    }
    this.pickups = this.pickups.filter(p => !p.dead);

    // ── Killstreak timer ───────────────────────────────────
    if (this._streakTimer > 0) {
      this._streakTimer -= dt;
      if (this._streakTimer <= 0) this._killStreak = 0;
    }
    if (this._streakPopup.timer > 0) this._streakPopup.timer -= dt;

    // ── Decals ─────────────────────────────────────────────
    for (const d of this.decals) d.update(dt);
    this.decals = this.decals.filter(d => !d.dead);

    // ── Weather ────────────────────────────────────────────
    this.weather.update(dt, this.canvas.width, this.canvas.height);

    // ── Wanted decay ───────────────────────────────────────
    if (this._wantedLevel > 0) {
      this._wantedDecay += dt;
      if (this._wantedDecay >= 10.0) {
        this._wantedLevel = Math.max(0, this._wantedLevel - 1);
        this._wantedDecay = 0;
      }
    }

    // ── Police spawn ───────────────────────────────────────
    if (this._wantedLevel > 0) {
      const intervals = [0, 9000, 6000, 4000, 2400];
      this._policeTimer -= dt * 1000;
      if (this._policeTimer <= 0) {
        this._spawnPolice();
        this._policeTimer = intervals[this._wantedLevel];
      }
    }

    // ── Arena wave management ──────────────────────────────
    if (this._arenaMode) {
      if (this._arenaCountdown > 0) {
        this._arenaCountdown -= dt;
        if (this._arenaCountdown <= 0) this._startArenaWave();
      } else {
        // Incremental bot spawning for this wave
        if (this._arenaSpawned < this._arenaWaveSize) {
          this.spawnTimer -= dt * 1000;
          if (this.spawnTimer <= 0) {
            this._spawnBot();
            this._arenaSpawned++;
            this.spawnTimer = Math.max(350, 1400 - this.wave * 70);
          }
        }
        // Wave complete when all arena bots + boss are gone
        const bossGone = !this.boss || this.boss.dead || this.boss.dying;
        if (this._arenaSpawned >= this._arenaWaveSize &&
            this.bots.filter(b => !b.dead && !b.dying).length === 0 && bossGone) {
          if (this.boss && this.boss.dead) this.boss = null;
          this._arenaCountdown = 3.5;
          this.wave++;
        }
      }
    }

    for (const bot of this.bots) bot.update(dt, this.player, this.map, this.bullets, this.particles);

    // Bullet update + bullet-hole decal detection
    for (const b of this.bullets) {
      const wasAlive = !b.dead;
      b.update(dt, this.map);
      if (wasAlive && b.dead && b.isPlayer && this.map.isBlocked(b.x, b.y)) {
        if (this.decals.filter(d => d.type === 'hole').length < 80) {
          const pos = b.trail.length > 0 ? b.trail[b.trail.length - 1] : b;
          this.decals.push(new Decal(pos.x, pos.y, 'hole'));
        }
      }
    }

    for (const p   of this.particles) p.update(dt);

    // Boss update
    if (this.boss) {
      if (!this.boss.dead) {
        this.boss.update(dt, this.player, this.map, this.bullets, this.particles, this.bots);
      } else {
        this.boss = null;
        if (!this._arenaMode) this.bossRespawnTimer = 30000;
      }
    }

    // ── Vehicle ramming ────────────────────────────────────
    for (const v of this.vehicles) {
      if (v.dead || v._exploding || !v.occupied) continue;
      for (const bot of this.bots) {
        if (bot.dead || bot.dying) continue;
        if (circlesOverlap(v.x, v.y, v.radius, bot.x, bot.y, bot.radius)) {
          if (v._ramCooldown <= 0) {
            const ramDmg = 55 + this.wave * 4;
            bot.takeDamage(ramDmg, this.particles);
            this.hud.addDamageNumber(bot.x, bot.y - 30, ramDmg, this.camX, this.camY, '#FF8800');
            v.takeDamage(10, this.particles);
            v._ramCooldown = 0.38;
            if (bot.dying) {
              this.decals.push(new Decal(bot.x, bot.y, 'blood'));
              const mult   = this._streakMultiplier();
              const earned = Math.round(CONFIG.MONEY_PER_KILL * bot._cfg.moneyMult * mult);
              this.money  += earned;
              this.kills++;
              this.hud.addDamageNumber(bot.x, bot.y - 56, earned, this.camX, this.camY, mult > 1 ? '#FF8800' : '#FFD700');
              this._onKill();
              this._dropPickup(bot);
            }
          }
        }
      }
      if (this.boss && !this.boss.dead && !this.boss.dying) {
        if (circlesOverlap(v.x, v.y, v.radius, this.boss.x, this.boss.y, this.boss.radius)) {
          if (v._ramCooldown <= 0) {
            const ramDmg = 80 + this.wave * 5;
            this.boss.takeDamage(ramDmg, this.particles);
            this.hud.addDamageNumber(this.boss.x, this.boss.y - 50, ramDmg, this.camX, this.camY, '#FF8800');
            v.takeDamage(25, this.particles);
            v._ramCooldown = 0.45;
          }
        }
      }
    }

    // ── Bullet → bots ──────────────────────────────────────
    for (const b of this.bullets) {
      if (!b.isPlayer || b.dead) continue;
      for (const bot of this.bots) {
        if (bot.dead || bot.dying) continue;
        if (circlesOverlap(b.x, b.y, b.radius, bot.x, bot.y, bot.radius)) {
          bot.takeDamage(b.damage, this.particles);
          this.hud.addDamageNumber(bot.x, bot.y - 30, b.damage, this.camX, this.camY, '#FF6666');
          b.dead = true;
          if (bot.dying) {
            this.decals.push(new Decal(bot.x, bot.y, 'blood'));
            const mult   = this._streakMultiplier();
            const earned = Math.round(CONFIG.MONEY_PER_KILL * bot._cfg.moneyMult * mult);
            this.money  += earned;
            this.kills++;
            this.hud.addDamageNumber(bot.x, bot.y - 56, earned, this.camX, this.camY, mult > 1 ? '#FF8800' : '#FFD700');
            this._onKill();
            this._dropPickup(bot);
          }
          break;
        }
      }
    }

    // ── Bullet → boss ──────────────────────────────────────
    if (this.boss && !this.boss.dead && !this.boss.dying) {
      for (const b of this.bullets) {
        if (!b.isPlayer || b.dead) continue;
        if (circlesOverlap(b.x, b.y, b.radius, this.boss.x, this.boss.y, this.boss.radius)) {
          this.boss.takeDamage(b.damage, this.particles);
          this.hud.addDamageNumber(this.boss.x, this.boss.y - this.boss.radius - 10, b.damage, this.camX, this.camY, '#FF6666');
          b.dead = true;
          if (this.boss.dying) {
            const reward = CONFIG.MONEY_PER_KILL * 15;
            this.money += reward;
            this.kills++;
            this.hud.addDamageNumber(this.boss.x, this.boss.y - 80, reward, this.camX, this.camY, '#FFD700');
            this.bossRespawnTimer = 30000;
            for (let i = 0; i < 3 + Math.floor(Math.random() * 2); i++) {
              const a = (i / 4) * Math.PI * 2;
              const r = Math.random();
              this.pickups.push(new Pickup(
                this.boss.x + Math.cos(a) * 44,
                this.boss.y + Math.sin(a) * 44,
                r < 0.4 ? 'health' : r < 0.7 ? 'ammo' : 'cash'
              ));
            }
          }
          break;
        }
      }
    }

    // ── Bullet → vehicles (enemy bullets) ─────────────────
    for (const v of this.vehicles) {
      if (v.dead || v._exploding) continue;
      for (const b of this.bullets) {
        if (b.isPlayer || b.dead) continue;
        if (circlesOverlap(b.x, b.y, b.radius, v.x, v.y, v.radius)) {
          v.takeDamage(b.damage, this.particles);
          b.dead = true;
          if (v === this._playerVehicle) this.hud.shake(3);
        }
      }
    }

    // ── Bullet → player (skip if in vehicle) ───────────────
    if (!this.player.dead && !this._playerVehicle) {
      for (const b of this.bullets) {
        if (b.isPlayer || b.dead) continue;
        if (circlesOverlap(b.x, b.y, b.radius, this.player.x, this.player.y, this.player.radius)) {
          const dmg = this.player.takeDamage(b.damage, this.hud);
          if (dmg) {
            this.hud.addDamageNumber(this.player.x, this.player.y - 30, dmg, this.camX, this.camY, '#FF4444');
            this._killStreak = 0;
            this._streakTimer = 0;
          }
          b.dead = true;
        }
      }
    }

    // ── Warlord charge contact damage ──────────────────────
    if (this.boss && this.boss._chargeActive && !this.boss.dead && !this.player.dead && !this._playerVehicle) {
      if (circlesOverlap(this.boss.x, this.boss.y, this.boss.radius, this.player.x, this.player.y, this.player.radius)) {
        if (this.boss._chargeDmgTimer <= 0) {
          const dmg = this.player.takeDamage(this.boss.damage * 2.5, this.hud);
          if (dmg) {
            this.hud.addDamageNumber(this.player.x, this.player.y - 30, dmg, this.camX, this.camY, '#FF6644');
            this._killStreak = 0;
            this._streakTimer = 0;
          }
          this.boss._chargeDmgTimer = 0.35;
        }
      }
    }

    // ── Cleanup ────────────────────────────────────────────
    this.bots      = this.bots.filter(b => !b.dead);
    this.bullets   = this.bullets.filter(b => !b.dead);
    this.particles = this.particles.filter(p => !p.dead);

    // ── Bot spawning (non-arena only; arena handles its own) ──
    if (!this._arenaMode) {
      this.spawnTimer -= dt * 1000;
      if (this.spawnTimer <= 0 && this.bots.length < CONFIG.MAX_BOTS + this.wave * 2) {
        this._spawnBot();
        this.spawnTimer = Math.max(700, CONFIG.BOT_SPAWN_INTERVAL - this.wave * 140);
      }

      // ── Wave ─────────────────────────────────────────────
      this.waveTimer -= dt * 1000;
      if (this.waveTimer <= 0) { this.wave++; this.waveTimer = 30000; }

      // ── Boss lifecycle ───────────────────────────────────
      if (!this._bossActivated && this.wave >= 3) {
        this._bossActivated = true;
        this.bossRespawnTimer = 5000;
      }
      if (this._bossActivated && !this.boss && this.bossRespawnTimer > 0) {
        this.bossRespawnTimer -= dt * 1000;
        if (this.bossRespawnTimer <= 0) this._spawnBoss();
      }
    }

    // ── Camera ─────────────────────────────────────────────
    const tcx = this.player.x - this.canvas.width  / 2;
    const tcy = this.player.y - this.canvas.height / 2;
    this.camX = lerp(this.camX, tcx, CONFIG.CAM_LERP);
    this.camY = lerp(this.camY, tcy, CONFIG.CAM_LERP);
    const mapPxW = this.map.W * this.map.S, mapPxH = this.map.H * this.map.S;
    this.camX = mapPxW <= this.canvas.width  ? (mapPxW - this.canvas.width)  / 2
                                             : clamp(this.camX, 0, mapPxW - this.canvas.width);
    this.camY = mapPxH <= this.canvas.height ? (mapPxH - this.canvas.height) / 2
                                             : clamp(this.camY, 0, mapPxH - this.canvas.height);

    this.hud.update(dt);
  }

  _spawnVehicles() {
    const colors = ['#CC3333', '#3366BB', '#CC9900', '#339944', '#AA33AA', '#336688'];
    const count  = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      let rp;
      for (let t = 0; t < 12; t++) {
        rp = this.map.randomRoadPos();
        if (Math.hypot(rp.x - this.player.x, rp.y - this.player.y) > 220) break;
      }
      this.vehicles.push(new Vehicle(rp.x, rp.y, colors[i % colors.length]));
    }
  }

  _toggleVehicle() {
    if (this._playerVehicle) {
      const v = this._playerVehicle;
      v.occupied = false;
      this._playerVehicle = null;
      this.player.inVehicle = false;
      const exitAngle = v.angle + Math.PI / 2;
      this.player.x = v.x + Math.cos(exitAngle) * (v.radius + 26);
      this.player.y = v.y + Math.sin(exitAngle) * (v.radius + 26);
    } else {
      for (const v of this.vehicles) {
        if (v.dead || v._exploding || v.occupied) continue;
        if (Math.hypot(v.x - this.player.x, v.y - this.player.y) < 74) {
          v.occupied = true;
          this._playerVehicle = v;
          this.player.inVehicle = true;
          break;
        }
      }
    }
  }

  _streakMultiplier() {
    if (this._killStreak >= 5) return 5;
    if (this._killStreak >= 3) return 3;
    if (this._killStreak >= 2) return 2;
    return 1;
  }

  _onKill() {
    // Killstreak
    this._killStreak++;
    this._streakTimer = 3.0;
    const mult = this._streakMultiplier();
    if (mult >= 2) {
      const msg = mult >= 5 ? '✦ KILLING SPREE ✦' : mult >= 3 ? 'TRIPLE KILL!' : 'DOUBLE KILL!';
      this._streakPopup = { text: msg, timer: 1.8, mult };
    }

    // Wanted system
    this._wantedDecay = 0;
    this._wantedKills++;
    const thresholds = [0, 5, 15, 30, 55];
    if (this._wantedLevel < 4 && this._wantedKills >= thresholds[this._wantedLevel + 1]) {
      this._wantedLevel++;
      this._policeTimer = 1800; // fast first spawn on star-up
    }

    // Arena kill count
    if (this._arenaMode) this._arenaKilled++;
  }

  _dropPickup(bot) {
    const chances = { mini: 0.12, normal: 0.28, big: 0.55 };
    if (Math.random() < (chances[bot.type] || 0.2)) {
      const r = Math.random();
      const type = r < 0.42 ? 'health' : r < 0.72 ? 'ammo' : 'cash';
      this.pickups.push(new Pickup(bot.x, bot.y, type));
    }
  }

  _spawnPolice() {
    const lv = this._wantedLevel;
    const r  = Math.random();
    let type;
    if      (lv >= 4) type = r < 0.25 ? 'heavyswat' : r < 0.58 ? 'swat' : 'police';
    else if (lv >= 3) type = r < 0.36 ? 'swat' : 'police';
    else if (lv >= 2) type = r < 0.22 ? 'swat' : 'police';
    else              type = 'police';
    const rp = this.map.randomRoadPos();
    this.bots.push(new Bot(rp.x, rp.y, this.wave, type, this.map.config));
  }

  _startArenaWave() {
    this._arenaWaveSize = 6 + this.wave * 3;
    this._arenaSpawned  = 0;
    this._arenaKilled   = 0;
    this.spawnTimer     = 400;
    // Spawn boss every 4 waves (starting wave 4)
    if (this.wave >= 4 && this.wave % 4 === 0 && !this.boss) {
      this._spawnBoss();
    }
  }

  _spawnBot() {
    const margin = 130;
    const W = this.canvas.width, H = this.canvas.height;
    const maxWX = this.map.W * this.map.S;
    const maxWY = this.map.H * this.map.S;
    let sx, sy;
    switch (Math.floor(Math.random() * 4)) {
      case 0: sx = this.camX + rnd(0,W); sy = this.camY - margin; break;
      case 1: sx = this.camX + W + margin; sy = this.camY + rnd(0,H); break;
      case 2: sx = this.camX + rnd(0,W); sy = this.camY + H + margin; break;
      default: sx = this.camX - margin; sy = this.camY + rnd(0,H); break;
    }

    // Weighted type selection
    const r    = Math.random();
    const type = r < 0.38 ? 'mini' : r < 0.84 ? 'normal' : 'big';

    if (Math.random() > 0.4) {
      sx = clamp(sx, 0, maxWX); sy = clamp(sy, 0, maxWY);
      if (!this.map.isBlocked(sx, sy)) { this.bots.push(new Bot(sx, sy, this.wave, type, this.map.config)); return; }
    }
    const rp = this.map.randomRoadPos();
    this.bots.push(new Bot(rp.x, rp.y, this.wave, type, this.map.config));
  }

  _spawnBoss() {
    const rp = this.map.randomRoadPos();
    this.boss = new BossBot(rp.x, rp.y, this.wave, this.map.config.id);
  }

  // ── Render ─────────────────────────────────────────────────
  _render() {
    const ctx = this.ctx;
    const W   = this.canvas.width, H = this.canvas.height;
    const shake = this.hud.getShakeOffset();

    this.canvas.style.cursor = this.state === 'shop' ? 'default' : 'none';

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#08080f';
    ctx.fillRect(0, 0, W, H);

    // World
    ctx.save();
    ctx.translate(-this.camX + shake.x, -this.camY + shake.y);
    this.map.render(ctx, this.camX, this.camY, W, H);
    for (const d   of this.decals)    d.render(ctx);
    for (const p   of this.pickups)   p.render(ctx);
    for (const v   of this.vehicles)  v.render(ctx);
    for (const p   of this.particles) p.render(ctx);
    for (const b   of this.bullets)   if (!b.isPlayer) b.render(ctx);
    for (const bot of this.bots)      bot.render(ctx);
    if (this.boss && !this.boss.dead)  this.boss.render(ctx);
    for (const b   of this.bullets)   if (b.isPlayer)  b.render(ctx);
    if (!this.player.dead) this.player.render(ctx);

    // "Press F" hint near empty vehicles
    if (!this._playerVehicle && !this.player.dead) {
      for (const v of this.vehicles) {
        if (v.dead || v._exploding || v.occupied) continue;
        const dist = Math.hypot(v.x - this.player.x, v.y - this.player.y);
        if (dist < 74) {
          ctx.save();
          ctx.font = 'bold 11px Orbitron, monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#FFFFAA'; ctx.shadowColor = '#FFFF00'; ctx.shadowBlur = 10;
          ctx.fillText('[F] ENTER', v.x, v.y - v.radius - 18);
          ctx.restore();
        }
      }
    }

    ctx.restore();

    // Weather (screen-space, drawn over world)
    this.weather.render(ctx, W, H);

    // HUD
    const playing = this.state !== 'gameover';
    if (playing) {
      this.hud.renderMinimap(this.map, this.player, this.bots, this.camX, this.camY, this.boss);
      this.hud.renderHealthBar(this.player);
      this.hud.renderControls(this._arenaMode);
      this.hud.renderMoney(this.money);
      this.hud.renderKills(this.kills);
      if (this._arenaMode) {
        const remaining = Math.max(0, this._arenaWaveSize - this._arenaKilled);
        this.hud.renderWave(this.wave, remaining, !!(this.boss && !this.boss.dead));
        if (this._arenaCountdown > 0) this.hud.renderArenaCountdown(this._arenaCountdown);
      } else {
        this.hud.renderWave(this.wave, this.bots.length, !!(this.boss && !this.boss.dead));
      }
      if (this._wantedLevel > 0) {
        this.hud.renderWantedLevel(this._wantedLevel, this._wantedDecay);
      }
      this.hud.renderWeaponInfo(this.player);
      this.hud.renderShopButton(this.state === 'shop');
      this.hud.renderDamageNumbers();
      if (this.boss && !this.boss.dead && !this.boss.dying) {
        this.hud.renderBossBar(this.boss);
      }
      if (this._killStreak >= 2 || this._streakPopup.timer > 0) {
        this.hud.renderKillStreak(this._killStreak, this._streakMultiplier(), this._streakPopup, this._streakTimer);
      }
      if (this._playerVehicle) {
        this.hud.renderVehicleHud(this._playerVehicle);
      }
      if (!this.player.dead && this.state === 'playing' && !this._playerVehicle) {
        this.hud.renderCrosshair(this.input.mouseScreen.x, this.input.mouseScreen.y);
      }
    }

    if (this.state === 'paused') {
      this.hud.renderPause();
      // Click the MENU button area → go to menu; click anywhere else → resume
      if (this.input.mouseJustDown) {
        const btnY = this.canvas.height / 2 + 90;
        if (this.input.mouseScreen.y >= btnY - 18 && this.input.mouseScreen.y <= btnY + 18) {
          this._destroy(); window.location.href = 'index.html';
        } else {
          this.state = 'playing';
        }
      }
    }
    if (this.state === 'gameover') {
      this.hud.renderGameOver(this.money, this.kills);
      if (this.input.mouseJustDown) { this._destroy(); window.location.href = 'index.html'; }
    }

    // Shop overlay
    if (this.state === 'shop') {
      this.shop.render(ctx, W, H, this.player, this.money, this.input.mouseScreen.x, this.input.mouseScreen.y);
      if (this.input.mouseJustDown) {
        this.shop.handleClick(this.input.mouseScreen.x, this.input.mouseScreen.y, this.player, this);
        if (!this.shop.isOpen) this.state = 'playing';
      }
    }
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────
window.startGame = function(charData, mapData) {
  window._game = new Game(charData, mapData);
};
