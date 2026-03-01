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

    // ── Achievements ───────────────────────────────────────
    const _savedStats   = JSON.parse(localStorage.getItem('achStats')   || '{}');
    const _savedUnlocked = JSON.parse(localStorage.getItem('unlockedAch') || '[]');
    const _statKeys = ['kills','carsStolen','moneyEarned','knifeKills','bossesKilled',
                       'buildingsEntered','buildingsCleared','maxWanted','maxStreak','maxWave'];
    this._achStats   = {};
    _statKeys.forEach(k => { this._achStats[k] = _savedStats[k] || 0; });
    this._unlockedAch  = new Set(_savedUnlocked);
    this._achPopup     = null;   // { name, icon, timer }
    this._achPanelOpen = false;

    // ── Building interiors ─────────────────────────────────
    this._indoor        = null;   // room object or null (outdoors)
    this._indoorBots    = [];
    this._indoorBullets = [];
    this._indoorPickups = [];
    this._visitedRooms  = new Set(); // "tx,ty" keys of cleared rooms

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

    // ── Drones ─────────────────────────────────────────────
    this._drones        = [];
    this._playerDrone   = null;
    this._droneControl  = false;
    this._droneTimer    = 8000;  // initial delay before first police drone

    // ── Day/Night + Black Market ────────────────────────────
    this._gameTime        = 0;
    this._isNight         = false;
    this._nightAlpha      = 0;
    this._bmVendor        = null;
    this._bmOpen          = false;
    this._bmBought        = new Set();
    this._reflexTimer     = 0;
    this._nanoshieldTimer = 0;

    // ── Zombie Mode ──────────────────────────────────────────
    this._zombieMode      = !!this.map.config.zombie;
    this._zombieWaveSize  = 0;
    this._zombieSpawned   = 0;
    this._zombieTimer     = 500;
    this._zombieCountdown = 0;

    // ── Global Events ────────────────────────────────────────
    this._globalEvent        = null;
    this._eventTimer         = rnd(90, 120);
    this._eventAnnounceTimer = 0;
    this._eventWave          = new Set();
    this._cyberDebuffActive  = false;
    this._corpTimer          = 0;

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
    if (this._arenaMode)  this._startArenaWave();
    if (this._zombieMode) this._startZombieWave();

    requestAnimationFrame((t) => this._loop(t));
  }

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  _onKey(e) {
    if (e.code === 'KeyE' && this.state === 'playing') {
      this._tryEnterExit();
      return;
    }
    if (e.code === 'Tab') {
      e.preventDefault();
      if (this.state === 'playing' || this.state === 'paused') {
        this._achPanelOpen = !this._achPanelOpen;
      }
      return;
    }
    if (e.code === 'KeyV' && this.state === 'playing') {
      this._togglePlayerDrone();
      return;
    }
    if (e.code === 'KeyN' && (this.state === 'playing' || this.state === 'blackmarket')) {
      if (this._bmOpen) { this._bmOpen = false; this.state = 'playing'; }
      else if (this._bmVendor && !this._arenaMode) {
        if (Math.hypot(this._bmVendor.x - this.player.x, this._bmVendor.y - this.player.y) < 70)
          { this._bmOpen = true; this.state = 'blackmarket'; }
      }
      return;
    }
    if (e.code === 'KeyF' && this.state === 'playing') {
      this._toggleVehicle();
      return;
    }
    if (e.code === 'KeyB') {
      if (this._arenaMode || this._zombieMode) return; // no shop in arena/zombie
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
      if (this.state === 'blackmarket') { this._bmOpen = false; this.state = 'playing'; return; }
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

    if (this.state === 'playing' || this.state === 'blackmarket') this._update(dt);
    if (this.state === 'shop' || this.state === 'paused') this.shop.update(dt);

    this._render();
    this.input.flush();
    this._raf = requestAnimationFrame((t) => this._loop(t));
  }

  // ── Update ─────────────────────────────────────────────────
  _update(dt) {
    // Achievement popup decay
    if (this._achPopup) { this._achPopup.timer -= dt; if (this._achPopup.timer <= 0) this._achPopup = null; }

    // ── Day/Night cycle ──────────────────────────────────────
    if (!this._arenaMode && !this._zombieMode) {
      this._gameTime += dt;
      const cycle = 120, nightStart = 80;
      const t = this._gameTime % cycle;
      const targetNight = t > nightStart;
      this._nightAlpha = lerp(this._nightAlpha, targetNight ? 0.55 : 0, dt * 1.5);
      if (targetNight && !this._isNight) {
        this._isNight = true;
        const pos = this.map.randomRoadPos();
        this._bmVendor = { x: pos.x, y: pos.y };
      } else if (!targetNight && this._isNight) {
        this._isNight = false;
        this._bmVendor = null;
        if (this._bmOpen) { this._bmOpen = false; this.state = 'playing'; }
      }

      // ── Global Events ───────────────────────────────────────
      this._eventTimer -= dt;
      if (this._eventTimer <= 0) { this._triggerEvent(false); this._eventTimer = rnd(90, 120); }
      if (this._eventAnnounceTimer > 0) this._eventAnnounceTimer -= dt;
      if (this._globalEvent) {
        this._globalEvent.timer -= dt;
        if (this._globalEvent.timer <= 0) { this._endEvent(); }
        else {
          // Riot: rapid police spawns
          if (this._globalEvent.id === 'riot') {
            this._policeTimer -= dt * 1000;
            if (this._policeTimer <= 0) { this._spawnPolice(); this._policeTimer = 1200; }
          }
          // Corporate: extra heavyswat soldiers
          if (this._globalEvent.id === 'corporate') {
            this._corpTimer -= dt * 1000;
            if (this._corpTimer <= 0) {
              const rp = this.map.randomRoadPos();
              this.bots.push(new Bot(rp.x, rp.y, this.wave, 'heavyswat', this.map.config));
              this._corpTimer = 2200;
            }
          }
        }
      }
    }

    // ── Implant timers ───────────────────────────────────────
    if (this._reflexTimer > 0) {
      this._reflexTimer -= dt;
      if (this._reflexTimer <= 0) { this.player.speed /= 2; this.player.fireRateMult *= 2; }
    }
    if (this._nanoshieldTimer > 0) {
      this._nanoshieldTimer -= dt;
      if (this._nanoshieldTimer <= 0) this.player.invincible = 0;
    }

    // ── Drone updates ────────────────────────────────────────
    for (const d of this._drones) d.update(dt, this.player, this.map, this.bullets, this.particles);
    this._drones = this._drones.filter(d => !d.dead);

    if (this._playerDrone) {
      if (this._playerDrone.dead) { this._playerDrone = null; this._droneControl = false; }
      else if (this._droneControl) {
        const ds = this._playerDrone.speed * dt;
        if (this.input.isDown('KeyW')) this._playerDrone.y -= ds;
        if (this.input.isDown('KeyS')) this._playerDrone.y += ds;
        if (this.input.isDown('KeyA')) this._playerDrone.x -= ds;
        if (this.input.isDown('KeyD')) this._playerDrone.x += ds;
        this._playerDrone.angle = Math.atan2(
          this.input.mouseWorld.y - this._playerDrone.y,
          this.input.mouseWorld.x - this._playerDrone.x
        );
        if (Math.hypot(this._playerDrone.x - this.player.x, this._playerDrone.y - this.player.y) > 600)
          this._togglePlayerDrone();
      }
      if (this._playerDrone) {
        this._playerDrone._altTimer += dt * 2.6;
        this._playerDrone._altitude  = Math.sin(this._playerDrone._altTimer) * 5;
      }
    }

    // ── Police drone spawning ────────────────────────────────
    if (this._wantedLevel >= 3 && !this._arenaMode && !this._zombieMode && !this._indoor) {
      this._droneTimer -= dt * 1000;
      if (this._droneTimer <= 0 && this._drones.filter(d => d.type === 'police').length < this._wantedLevel - 1) {
        const pos = this.map.randomRoadPos();
        this._drones.push(new Drone(pos.x, pos.y, 'police'));
        this._droneTimer = 15000;
      }
    }
    // Combat drones in wave 6+
    if (!this._arenaMode && !this._zombieMode && this.wave >= 6 && this._drones.filter(d => d.type === 'combat').length < Math.floor((this.wave - 5) / 2)) {
      const pos = this.map.randomRoadPos();
      this._drones.push(new Drone(pos.x, pos.y, 'combat'));
    }

    // Track max wave
    if (this.wave > this._achStats.maxWave) {
      this._achStats.maxWave = this.wave;
      this._checkAchievements();
    }

    // Indoor mode — use separate update path
    if (this._indoor) { this._updateIndoor(dt); return; }

    this.input.updateMouseWorld(this.camX, this.camY);

    // Sync vehicle state before player update (also freeze player while controlling drone)
    this.player.inVehicle = !!this._playerVehicle || this._droneControl;
    this.player.update(dt, this.input, this.map, this.bullets, this.particles);
    if (this.player.dead && (this.state === 'playing' || this.state === 'blackmarket')) this.state = 'gameover';

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
      if (this._wantedLevel > this._achStats.maxWanted) {
        this._achStats.maxWanted = this._wantedLevel;
        this._checkAchievements();
      }
      this._wantedDecay += dt;
      if (this._wantedDecay >= 10.0) {
        this._wantedLevel = Math.max(0, this._wantedLevel - 1);
        this._wantedDecay = 0;
      }
    }

    // ── Police spawn ───────────────────────────────────────
    if (this._wantedLevel > 0 && !this._zombieMode) {
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

    // ── Zombie wave management ─────────────────────────────
    if (this._zombieMode) {
      if (this._zombieCountdown > 0) {
        this._zombieCountdown -= dt;
        if (this._zombieCountdown <= 0) this._startZombieWave();
      } else {
        // Incremental zombie spawning for this wave
        if (this._zombieSpawned < this._zombieWaveSize) {
          this._zombieTimer -= dt * 1000;
          if (this._zombieTimer <= 0) {
            this._spawnZombie();
            this._zombieSpawned++;
            this._zombieTimer = Math.max(300, 1200 - this.wave * 60);
          }
        }
        // Wave complete when all zombies + boss gone
        const zbossGone = !this.boss || this.boss.dead || this.boss.dying;
        if (this._zombieSpawned >= this._zombieWaveSize &&
            this.bots.filter(b => !b.dead && !b.dying).length === 0 && zbossGone) {
          if (this.boss && this.boss.dead) this.boss = null;
          this._zombieCountdown = 4.0;
          this.wave++;
        }
      }
    }

    for (const bot of this.bots) bot.update(dt, this.player, this.map, this.bullets, this.particles);

    // ── Zombie melee contact damage ────────────────────────
    if (this._zombieMode && !this.player.dead && !this._playerVehicle) {
      for (const b of this.bots) {
        if (b.dead || b.dying || !b._cfg || !b._cfg.melee) continue;
        if (circlesOverlap(b.x, b.y, b.radius, this.player.x, this.player.y, this.player.radius)) {
          if (b._contactTimer <= 0) {
            const dmg = this.player.takeDamage(b.damage, this.hud);
            if (dmg) {
              this.hud.addDamageNumber(this.player.x, this.player.y - 30, dmg, this.camX, this.camY, '#44FF44');
              this._killStreak = 0;
              this._streakTimer = 0;
            }
            b._contactTimer = 0.55;
          }
        }
      }
    }

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
        this._achStats.bossesKilled++;
        this._checkAchievements();
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
              this._achStats.moneyEarned += earned;
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
        // Melee (arc check) or ranged (circle overlap)
        let hit = false;
        if (b.isMelee) {
          const dist = Math.hypot(bot.x - b.x, bot.y - b.y);
          if (dist < b.range) {
            const ang  = Math.atan2(bot.y - b.y, bot.x - b.x);
            const diff = Math.abs(((ang - b.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
            if (diff < b._arc / 2) hit = true;
          }
        } else {
          hit = circlesOverlap(b.x, b.y, b.radius, bot.x, bot.y, bot.radius);
        }
        if (hit) {
          bot.takeDamage(b.damage, this.particles);
          this.hud.addDamageNumber(bot.x, bot.y - 30, b.damage, this.camX, this.camY, '#FF6666');
          b.dead = true;
          if (bot.dying) {
            this.decals.push(new Decal(bot.x, bot.y, 'blood'));
            const mult   = this._streakMultiplier();
            const earned = Math.round(CONFIG.MONEY_PER_KILL * bot._cfg.moneyMult * mult);
            this.money  += earned;
            this._achStats.moneyEarned += earned;
            this.kills++;
            this.hud.addDamageNumber(bot.x, bot.y - 56, earned, this.camX, this.camY, mult > 1 ? '#FF8800' : '#FFD700');
            if (b.isMelee) this._achStats.knifeKills++;
            this._onKill();
            this._dropPickup(bot);
          }
          if (!b.isMelee) break;  // melee can hit multiple bots in one swing
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
            this._achStats.moneyEarned += reward;
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

    // ── Bullet → drones ────────────────────────────────────
    for (const b of this.bullets) {
      if (!b.isPlayer || b.dead) continue;
      for (const d of this._drones) {
        if (d.dead || d.type === 'player') continue;
        if (circlesOverlap(b.x, b.y, b.radius, d.x, d.y, d.radius)) {
          d.takeDamage(b.damage, this.particles);
          b.dead = true;
          if (d.dead) { this.kills++; this.money += CONFIG.MONEY_PER_KILL; this._onKill(); }
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

    // ── Bot spawning (non-arena, non-zombie only) ─────────
    if (!this._arenaMode && !this._zombieMode) {
      this.spawnTimer -= dt * 1000;
      if (this.spawnTimer <= 0 && this.bots.length < CONFIG.MAX_BOTS + this.wave * 2) {
        this._spawnBot();
        this.spawnTimer = Math.max(700, CONFIG.BOT_SPAWN_INTERVAL - this.wave * 140);
      }

      // ── Wave ─────────────────────────────────────────────
      this.waveTimer -= dt * 1000;
      if (this.waveTimer <= 0) {
        this.wave++;
        this.waveTimer = 30000;
        // Wave-locked global event every 5 waves (major only)
        if (this.wave % 5 === 0 && !this._globalEvent && !this._eventWave.has(this.wave)) {
          this._eventWave.add(this.wave);
          this._triggerEvent(true);
        }
      }

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
    const _camTarget = (this._droneControl && this._playerDrone)
      ? this._playerDrone : this.player;
    const tcx = _camTarget.x - this.canvas.width  / 2;
    const tcy = _camTarget.y - this.canvas.height / 2;
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

  _startZombieWave() {
    this._zombieWaveSize = 8 + this.wave * 4;
    this._zombieSpawned  = 0;
    this._zombieTimer    = 400;
    if (this.wave >= 4 && this.wave % 4 === 0 && !this.boss) this._spawnBoss();
  }

  _spawnZombie() {
    const w = this.wave;
    let type;
    const r = Math.random();
    if (w <= 2) {
      type = 'shambler';
    } else if (w <= 4) {
      type = r < 0.6 ? 'shambler' : 'runner';
    } else if (w <= 7) {
      type = r < 0.35 ? 'shambler' : r < 0.65 ? 'runner' : r < 0.88 ? 'brute' : 'mutant';
    } else {
      type = r < 0.25 ? 'runner' : r < 0.50 ? 'brute' : r < 0.78 ? 'mutant' : 'bloater';
    }
    const pos = this.map.randomRoadPos();
    this.bots.push(new ZombieBot(pos.x, pos.y, w, type));
  }

  _triggerEvent(majorOnly = false) {
    if (this._globalEvent) return;
    const pool = majorOnly ? CONFIG.GLOBAL_EVENTS.filter(e => e.major) : CONFIG.GLOBAL_EVENTS;
    const ev   = rndChoice(pool);
    this._globalEvent        = { ...ev, timer: ev.duration };
    this._eventAnnounceTimer = 3.5;
    if (ev.id === 'cyber_virus') { this.player.fireRateMult *= 1.55; this._cyberDebuffActive = true; }
    if (ev.id === 'riot')        { this._wantedLevel = Math.max(this._wantedLevel, 2); }
    if (ev.id === 'corporate')   { this._corpTimer = 500; }
  }

  _endEvent() {
    if (!this._globalEvent) return;
    if (this._globalEvent.id === 'cyber_virus' && this._cyberDebuffActive) {
      this.player.fireRateMult /= 1.55;
      this._cyberDebuffActive = false;
    }
    this._globalEvent = null;
    this._corpTimer   = 0;
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

  _togglePlayerDrone() {
    if (this._playerDrone) {
      this._playerDrone = null;
      this._droneControl = false;
    } else {
      this._playerDrone = new Drone(this.player.x, this.player.y - 40, 'player');
      this._droneControl = true;
    }
  }

  _applyBmItem(item) {
    if (item.type === 'weapon') {
      // Inject into CONFIG.WEAPONS if not already there, then equip
      if (!CONFIG.WEAPONS.find(w => w.id === item.id)) {
        CONFIG.WEAPONS.push({
          id: item.id, name: item.name, color: item.color,
          damage: item.damage, fireRate: item.fireRate,
          bullets: item.bullets, spread: item.spread,
          bulletSpeed: item.bulletSpeed, melee: item.melee,
          ammo: -1
        });
      }
      this.player.ownedWeapons.add(item.id);
      this.player.equipWeapon(item.id);
    } else if (item.type === 'implant') {
      if (item.effect === 'reflex') {
        if (this._reflexTimer <= 0) {
          this.player.speed        *= 2;
          this.player.fireRateMult *= 0.5;  // halve = fire twice as fast
        }
        this._reflexTimer = 8;
      } else if (item.effect === 'nanoshield') {
        this.player.invincible  = 6;
        this._nanoshieldTimer   = 6;
      } else if (item.effect === 'overclock') {
        this.player.damageMult = (this.player.damageMult || 1) * 1.6;
      }
    } else if (item.type === 'vehicle') {
      // Spawn prototype vehicle near player
      const pv = new Vehicle(this.player.x + 80, this.player.y, '#CCDDFF');
      pv.hp    = 500;
      pv.maxHp = 500;
      this.vehicles.push(pv);
    }
  }

  _checkAchievements() {
    for (const ach of CONFIG.ACHIEVEMENTS) {
      if (this._unlockedAch.has(ach.id)) continue;
      const val = this._achStats[ach.stat] || 0;
      if (val >= ach.threshold) {
        this._unlockedAch.add(ach.id);
        this._achPopup = { name: ach.name, icon: ach.icon, timer: 3.5 };
        localStorage.setItem('unlockedAch', JSON.stringify([...this._unlockedAch]));
        localStorage.setItem('achStats', JSON.stringify(this._achStats));
      }
    }
  }

  _tryEnterExit() {
    if (this._indoor) {
      const door = this._indoor.doorDoor;
      this.player.x = door.wx;
      this.player.y = door.wy + 30;
      this._indoor        = null;
      this._indoorBots    = [];
      this._indoorBullets = [];
      this._indoorPickups = [];
      return;
    }
    for (const door of this.map.doors) {
      const dist = Math.hypot(door.wx - this.player.x, door.wy - this.player.y);
      if (dist < 55) {
        const room = this.map.getRoom(door);
        this._indoor = room;
        this._achStats.buildingsEntered++;
        this._checkAchievements();
        this.player.x = room.entryX;
        this.player.y = room.entryY;
        const key = `${door.tx},${door.ty}`;
        if (!this._visitedRooms.has(key)) {
          const count = 1 + Math.floor(Math.random() * 2) + Math.floor(this.wave / 3);
          for (let i = 0; i < Math.min(count, 4); i++) {
            const pos = room.randomRoadPos();
            this._indoorBots.push(new Bot(pos.x, pos.y, this.wave, 'normal', this.map.config));
          }
        }
        return;
      }
    }
  }

  _updateIndoor(dt) {
    const room = this._indoor;
    const offX = (this.canvas.width  - room.roomW) / 2;
    const offY = (this.canvas.height - room.roomH) / 2;
    this.input.updateMouseWorld(-offX, -offY);
    this.player.inVehicle = false;
    this.player.update(dt, this.input, room, this._indoorBullets, this.particles);
    if (this.player.dead && this.state === 'playing') this.state = 'gameover';
    if (this.player.y >= room.roomH - 5) { this._tryEnterExit(); return; }

    for (const bot of this._indoorBots) bot.update(dt, this.player, room, this._indoorBullets, this.particles);
    for (const b of this._indoorBullets) b.update(dt, room);

    for (const b of this._indoorBullets) {
      if (!b.isPlayer || b.dead) continue;
      for (const bot of this._indoorBots) {
        if (bot.dead || bot.dying) continue;
        let hit = false;
        if (b.isMelee) {
          const dist = Math.hypot(bot.x - b.x, bot.y - b.y);
          if (dist < b.range) {
            const ang  = Math.atan2(bot.y - b.y, bot.x - b.x);
            const diff = Math.abs(((ang - b.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
            if (diff < b._arc / 2) hit = true;
          }
        } else {
          hit = circlesOverlap(b.x, b.y, b.radius, bot.x, bot.y, bot.radius);
        }
        if (hit) {
          bot.takeDamage(b.damage, this.particles);
          this.hud.addDamageNumber(bot.x, bot.y - 30, b.damage, -offX, -offY, '#FF6666');
          b.dead = true;
          if (bot.dying) {
            this.decals.push(new Decal(bot.x, bot.y, 'blood'));
            const mult   = this._streakMultiplier();
            const earned = Math.round(CONFIG.MONEY_PER_KILL * bot._cfg.moneyMult * mult);
            this.money  += earned;
            this._achStats.moneyEarned += earned;
            this.kills++;
            this.hud.addDamageNumber(bot.x, bot.y - 56, earned, -offX, -offY, mult > 1 ? '#FF8800' : '#FFD700');
            if (b.isMelee) this._achStats.knifeKills++;
            this._onKill();
          }
          if (!b.isMelee) break;
        }
      }
    }

    if (!this.player.dead) {
      for (const b of this._indoorBullets) {
        if (b.isPlayer || b.dead) continue;
        if (circlesOverlap(b.x, b.y, b.radius, this.player.x, this.player.y, this.player.radius)) {
          const dmg = this.player.takeDamage(b.damage, this.hud);
          if (dmg) {
            this.hud.addDamageNumber(this.player.x, this.player.y - 30, dmg, -offX, -offY, '#FF4444');
            this._killStreak = 0;
            this._streakTimer = 0;
          }
          b.dead = true;
        }
      }
    }

    const doorKey = `${room.doorDoor.tx},${room.doorDoor.ty}`;
    if (!this._visitedRooms.has(doorKey) &&
        this._indoorBots.length > 0 &&
        this._indoorBots.filter(b => !b.dead).length === 0) {
      this._visitedRooms.add(doorKey);
      this._achStats.buildingsCleared++;
      this._checkAchievements();
    }

    this._indoorBots    = this._indoorBots.filter(b => !b.dead);
    this._indoorBullets = this._indoorBullets.filter(b => !b.dead);
    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter(p => !p.dead);
    if (this._streakTimer > 0) { this._streakTimer -= dt; if (this._streakTimer <= 0) this._killStreak = 0; }
    if (this._streakPopup.timer > 0) this._streakPopup.timer -= dt;
    this.weather.update(dt, this.canvas.width, this.canvas.height);
    this.hud.update(dt);
  }

  _renderIndoorScene(ctx, W, H, shake) {
    const room = this._indoor;
    const offX = (W - room.roomW) / 2;
    const offY = (H - room.roomH) / 2;
    const S    = room.S;
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(offX + shake.x, offY + shake.y);
    for (let ty = 0; ty < room.H; ty++) {
      for (let tx = 0; tx < room.W; tx++) {
        const t  = room.layout[ty][tx];
        const px = tx * S, py = ty * S;
        if (t === 0) {
          ctx.fillStyle = '#1c1c22'; ctx.fillRect(px, py, S, S);
          ctx.fillStyle = 'rgba(255,255,255,0.025)';
          ctx.fillRect(px, py, S, 1); ctx.fillRect(px, py, 1, S);
        } else if (t === 2) {
          ctx.fillStyle = '#1c1c22'; ctx.fillRect(px, py, S, S);
          ctx.fillStyle = '#3a2a1a'; ctx.fillRect(px + 5, py + 5, S - 10, S - 10);
          ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 1;
          ctx.strokeRect(px + 5, py + 5, S - 10, S - 10);
        } else {
          ctx.fillStyle = '#14141e'; ctx.fillRect(px, py, S, S);
          ctx.fillStyle = 'rgba(80,80,140,0.10)';
          ctx.fillRect(px, py, S, 3); ctx.fillRect(px, py, 3, S);
        }
      }
    }
    for (const d of this.decals)         d.render(ctx);
    for (const p of this._indoorPickups) p.render(ctx);
    for (const p of this.particles)      p.render(ctx);
    for (const b of this._indoorBullets) if (!b.isPlayer) b.render(ctx);
    for (const bot of this._indoorBots)  bot.render(ctx);
    for (const b of this._indoorBullets) if (b.isPlayer)  b.render(ctx);
    if (!this.player.dead) this.player.render(ctx);
    ctx.save();
    ctx.font = 'bold 11px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFAA'; ctx.shadowColor = '#FFFF00'; ctx.shadowBlur = 10;
    ctx.fillText('[E] EXIT', room.entryX, room.roomH - 8);
    ctx.restore();
    ctx.restore();
  }

  // ── Render ─────────────────────────────────────────────────
  _render() {
    const ctx = this.ctx;
    const W   = this.canvas.width, H = this.canvas.height;
    const shake = this.hud.getShakeOffset();

    this.canvas.style.cursor = (this.state === 'shop' || this.state === 'blackmarket') ? 'default' : 'none';

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#08080f';
    ctx.fillRect(0, 0, W, H);

    // World
    if (this._indoor) {
      this._renderIndoorScene(ctx, W, H, shake);
    } else {
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

      // Drones
      for (const d of this._drones) d.render(ctx);
      if (this._playerDrone) this._playerDrone.render(ctx);

      // Black market vendor NPC
      if (this._bmVendor && this._nightAlpha > 0.1) {
        ctx.save();
        ctx.shadowColor = '#FFAA00'; ctx.shadowBlur = 30;
        ctx.fillStyle = '#FFAA00'; ctx.strokeStyle = '#FF8800'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(this._bmVendor.x, this._bmVendor.y, 16, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#111'; ctx.font = 'bold 9px Orbitron, monospace'; ctx.textAlign = 'center';
        ctx.fillText('$', this._bmVendor.x, this._bmVendor.y + 4);
        if (Math.hypot(this._bmVendor.x - this.player.x, this._bmVendor.y - this.player.y) < 70) {
          ctx.fillStyle = '#FFAA00'; ctx.font = 'bold 11px Orbitron, monospace';
          ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 10;
          ctx.fillText('[N] BLACK MARKET', this._bmVendor.x, this._bmVendor.y - 24);
        }
        ctx.restore();
      }

      // "[F] ENTER" hint near vehicles, "[E] ENTER" hint near doors
      if (!this._playerVehicle && !this.player.dead) {
        for (const v of this.vehicles) {
          if (v.dead || v._exploding || v.occupied) continue;
          if (Math.hypot(v.x - this.player.x, v.y - this.player.y) < 74) {
            ctx.save();
            ctx.font = 'bold 11px Orbitron, monospace'; ctx.textAlign = 'center';
            ctx.fillStyle = '#FFFFAA'; ctx.shadowColor = '#FFFF00'; ctx.shadowBlur = 10;
            ctx.fillText('[F] ENTER', v.x, v.y - v.radius - 18);
            ctx.restore();
          }
        }
        for (const door of this.map.doors) {
          if (Math.hypot(door.wx - this.player.x, door.wy - this.player.y) < 55) {
            ctx.save();
            ctx.font = 'bold 11px Orbitron, monospace'; ctx.textAlign = 'center';
            ctx.fillStyle = '#FFFFAA'; ctx.shadowColor = '#FFFF00'; ctx.shadowBlur = 10;
            ctx.fillText('[E] ENTER', door.wx, door.wy - 16);
            ctx.restore();
          }
        }
      }

      ctx.restore();
    }

    // Night overlay (screen-space)
    if (this._nightAlpha > 0.01) {
      ctx.save();
      ctx.globalAlpha = this._nightAlpha;
      ctx.fillStyle = '#000820';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // ── Global Event overlays ─────────────────────────────
    if (this._globalEvent) {
      if (this._globalEvent.id === 'blackout') {
        const psx  = this.player.x - this.camX;
        const psy  = this.player.y - this.camY;
        const grad = ctx.createRadialGradient(psx, psy, 55, psx, psy, Math.max(W, H));
        grad.addColorStop(0,    'rgba(0,4,8,0)');
        grad.addColorStop(0.18, 'rgba(0,4,8,0.88)');
        grad.addColorStop(1,    'rgba(0,4,8,0.97)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }
      if (this._globalEvent.id === 'cyber_virus') {
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = '#00FFFF';
        for (let yl = 0; yl < H; yl += 4) ctx.fillRect(0, yl, W, 1);
        if (Math.random() < 0.25) {
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = Math.random() < 0.5 ? '#00FFFF' : '#FF00AA';
          ctx.fillRect(0, Math.random() * H, W, 2 + Math.random() * 6);
        }
        ctx.restore();
      }
    }

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
      } else if (this._zombieMode) {
        const remaining = this.bots.filter(b => !b.dead && !b.dying).length;
        this.hud.renderZombieWave(this.wave, remaining, this._zombieCountdown, this._zombieWaveSize);
        if (this._zombieCountdown > 0) this.hud.renderArenaCountdown(this._zombieCountdown);
      } else {
        this.hud.renderWave(this.wave, this.bots.length, !!(this.boss && !this.boss.dead));
      }
      if (this._wantedLevel > 0 && !this._zombieMode) {
        this.hud.renderWantedLevel(this._wantedLevel, this._wantedDecay);
      }
      this.hud.renderWeaponInfo(this.player);
      if (!this._arenaMode && !this._zombieMode) this.hud.renderShopButton(this.state === 'shop');
      this.hud.renderAchButton(this._achPanelOpen);
      if (!this._zombieMode) this.hud.renderDayNight(this._nightAlpha, this._gameTime);
      if (this._globalEvent) this.hud.renderEventBanner(ctx, W, H, this._globalEvent, this._eventAnnounceTimer);
      if (this._playerDrone) this.hud.renderDroneStatus(this._playerDrone, this._droneControl);
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

    // ACH button click (bottom-right area: W-136, H-66, 124×26)
    if (this.input.mouseJustDown && this.state === 'playing') {
      const mx = this.input.mouseScreen.x, my = this.input.mouseScreen.y;
      const ax = W - 136, ay = H - 66;
      if (mx >= ax && mx <= ax + 124 && my >= ay && my <= ay + 26) {
        this._achPanelOpen = !this._achPanelOpen;
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

    // Black market overlay
    if (this.state === 'blackmarket' && this._bmOpen) {
      const clickAreas = this.hud.renderBlackMarket(
        ctx, W, H, CONFIG.BLACK_MARKET, this.money,
        this.input.mouseScreen.x, this.input.mouseScreen.y, this._bmBought
      );
      if (this.input.mouseJustDown) {
        const mx = this.input.mouseScreen.x, my = this.input.mouseScreen.y;
        for (const ca of clickAreas) {
          if (mx >= ca.ix && mx <= ca.ix + ca.itemW && my >= ca.iy && my <= ca.iy + ca.itemH) {
            const item = ca.item;
            // Non-consumable implants can only be bought once
            const isOnce = item.type === 'implant' && item.effect === 'overclock';
            if (!this._bmBought.has(item.id) && this.money >= item.price) {
              this.money -= item.price;
              this._applyBmItem(item);
              if (isOnce) this._bmBought.add(item.id);
            }
            break;
          }
        }
      }
    }

    // Achievement popup
    if (this._achPopup) {
      const ap = this._achPopup;
      const alpha = clamp(Math.min(ap.timer, 3.5 - ap.timer) * 1.5, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0,0,0,0.80)';
      ctx.beginPath(); ctx.roundRect(W / 2 - 140, 28, 280, 50, 8); ctx.fill();
      ctx.strokeStyle = '#FFCC00'; ctx.lineWidth = 1.5; ctx.shadowColor = '#FFCC00'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.roundRect(W / 2 - 140, 28, 280, 50, 8); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFCC00'; ctx.font = 'bold 9px Orbitron, monospace'; ctx.textAlign = 'left';
      ctx.fillText('ACHIEVEMENT UNLOCKED', W / 2 - 124, 50);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px Orbitron, monospace';
      ctx.fillText(`${ap.icon}  ${ap.name}`, W / 2 - 124, 68);
      ctx.restore();
    }

    // Achievement panel (Tab)
    if (this._achPanelOpen) {
      const achs = CONFIG.ACHIEVEMENTS;
      const cw   = Math.min(400, W / 2 - 40);
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.90)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#FFCC00'; ctx.font = 'bold 18px Orbitron, monospace'; ctx.textAlign = 'center';
      ctx.fillText('ACHIEVEMENTS', W / 2, 48);
      achs.forEach((ach, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const x = col === 0 ? W / 2 - cw - 10 : W / 2 + 10;
        const y = 70 + row * 44;
        const unlocked = this._unlockedAch.has(ach.id);
        ctx.globalAlpha = unlocked ? 1 : 0.35;
        ctx.fillStyle = 'rgba(20,20,30,0.9)';
        ctx.beginPath(); ctx.roundRect(x, y, cw, 36, 6); ctx.fill();
        ctx.strokeStyle = unlocked ? '#FFCC00' : '#444'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(x, y, cw, 36, 6); ctx.stroke();
        ctx.fillStyle = unlocked ? '#FFCC00' : '#888';
        ctx.font = 'bold 11px Orbitron, monospace'; ctx.textAlign = 'left';
        ctx.fillText(`${ach.icon}  ${ach.name}`, x + 10, y + 14);
        ctx.fillStyle = '#aaa'; ctx.font = '9px Orbitron, monospace';
        ctx.fillText(ach.desc, x + 10, y + 27);
        ctx.globalAlpha = 1;
      });
      ctx.fillStyle = '#666'; ctx.font = '10px Orbitron, monospace'; ctx.textAlign = 'center';
      ctx.fillText('[ TAB ] CLOSE', W / 2, H - 20);
      ctx.restore();
    }
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────
window.startGame = function(charData, mapData) {
  window._game = new Game(charData, mapData);
};
