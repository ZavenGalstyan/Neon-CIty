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

    // ── Districts & Reputation ─────────────────────────────────
    this._districtLayout   = this._buildDistrictLayout(); // null for arena/zombie
    this._currentDistrict  = null;
    this._districtTimer    = 0;        // entry notification countdown (3s)
    this._reputation       = { dangerous: 0, rich: 0, industrial: 0 };
    this._repRestoreTimers = { dangerous: 0, rich: 0, industrial: 0 };
    this._dangerSpawnTimer = 0;
    this._shopDiscount     = 0;

    // ── Car Dealership ────────────────────────────────────────
    this._salespersons    = [];
    this._nearSalesperson = false;
    this._dealership      = new DealershipManager();
    // ── Casino ────────────────────────────────────────────────
    this._casino          = new CasinoManager();
    this._casinoHosts     = [];
    this._nearCasinoHost  = false;
    // ── Grenades ──────────────────────────────────────────────
    this._grenades        = [];
    this._grenadeCount    = 0;
    // ── Metro ─────────────────────────────────────────────────
    this._metroWave       = 0;
    this._metroWaveTimer  = undefined;
    // ── Glitch Mode ───────────────────────────────────────────
    this._glitchPortals      = [];
    this._glitchPortalTimer  = 0;
    // ── Bodyguards ────────────────────────────────────────────
    this._bodyguards         = [];
    // ── Life Mode ─────────────────────────────────────────────
    this._lifeMode        = !!this.map.config.lifeMode;
    this._cityNpcs        = [];

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
      } else if (this.state === 'shop') {
        e.preventDefault();
        this.shop.handleScroll(e.deltaY);
      }
    };
    this.canvas.addEventListener('wheel', this._wheelHandler, { passive: false });

    // Keyboard
    this._keyHandler = (e) => this._onKey(e);
    window.addEventListener('keydown', this._keyHandler);

    this._spawnVehicles();
    if (this._arenaMode)  this._startArenaWave();
    if (this._zombieMode) this._startZombieWave();
    if (this._lifeMode)   this._spawnCityNpcs();

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
    if (e.code === 'KeyT') {
      if (this._indoor?.isDealership && this._nearSalesperson) {
        if      (this.state === 'playing')  { this._dealership.open();  this.state = 'carshop'; }
        else if (this.state === 'carshop')  { this._dealership.close(); this.state = 'playing'; }
      } else if (this._indoor?.isCasino && this._nearCasinoHost) {
        if      (this.state === 'playing')  { this._casino.open();  this.state = 'casino'; }
        else if (this.state === 'casino')   { this._casino.close(); this.state = 'playing'; }
      }
      return;
    }
    if (e.code === 'KeyG' && this.state === 'playing' && !this._indoor && this._grenadeCount > 0) {
      this._grenades.push(new Grenade(
        this.player.x, this.player.y,
        this.input.mouseWorld.x, this.input.mouseWorld.y
      ));
      this._grenadeCount--;
      return;
    }
    if (e.code === 'KeyP') {
      if      (this.state === 'playing') this.state = 'paused';
      else if (this.state === 'paused')  this.state = 'playing';
      else if (this.state === 'carshop') { this._dealership.close(); this.state = 'playing'; }
      else if (this.state === 'casino')  { this._casino.close();     this.state = 'playing'; }
      return;
    }
    if (e.code === 'Escape') {
      if (this.state === 'blackmarket') { this._bmOpen = false; this.state = 'playing'; return; }
      if (this.state === 'shop')    { this.shop.close(); this.state = 'playing'; return; }
      if (this.state === 'carshop') { this._dealership.close(); this.state = 'playing'; return; }
      if (this.state === 'casino')  { this._casino.close();     this.state = 'playing'; return; }
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
    if (this.state === 'carshop') this._dealership.update(dt);
    if (this.state === 'casino') {
      this._casino.update(dt);
      if (this._casino._pendingPayout !== null) {
        this.money += this._casino._pendingPayout;
        this._casino._msg(
          this._casino._pendingPayout > 0
            ? `JACKPOT! +$${this._casino._pendingPayout.toLocaleString()}`
            : 'BETTER LUCK NEXT TIME!',
          this._casino._pendingPayout > 0 ? '#FFD700' : '#FF4466'
        );
        this._casino._pendingPayout = null;
      }
    }

    this._render();
    this.input.flush();
    this._raf = requestAnimationFrame((t) => this._loop(t));
  }

  // ── Update ─────────────────────────────────────────────────
  _update(dt) {
    // Achievement popup decay
    if (this._achPopup) { this._achPopup.timer -= dt; if (this._achPopup.timer <= 0) this._achPopup = null; }

    // ── Day/Night cycle ──────────────────────────────────────
    if (!this._arenaMode && !this._zombieMode && !this._lifeMode) {
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
          // Glitch Mode: update portals, spawn buffed bots from them
          if (this._globalEvent.id === 'glitch_mode' && !this._indoor) {
            for (const p of this._glitchPortals) {
              p.t += dt;
              p.spawnTimer -= dt;
              if (p.spawnTimer <= 0) {
                p.spawnTimer = 7 + Math.random() * 5;
                const bot = new Bot(p.x + rnd(-20, 20), p.y + rnd(-20, 20), this.wave + 1, 'normal', this.map.config);
                bot.speed *= 1.4; bot.hp *= 1.3; bot.maxHp = bot.hp;
                this.bots.push(bot);
              }
            }
          }
        }
      }

      // ── District detection & effects ──────────────────────────
      if (this._districtLayout && !this._indoor) {
        const mapPxW  = this.map.W * this.map.S;
        const zoneIdx = Math.min(2, Math.floor(this.player.x / (mapPxW / 3)));
        const distId  = this._districtLayout[zoneIdx];
        const distCfg = CONFIG.DISTRICTS.find(d => d.id === distId);

        if (!this._currentDistrict || this._currentDistrict.id !== distId) {
          this._currentDistrict = distCfg;
          this._districtTimer   = 3.0;
        }
        if (this._districtTimer > 0) this._districtTimer -= dt;

        const rep = this._reputation[distId];

        // Passive recovery: +1 per 12s without a kill here
        this._repRestoreTimers[distId] += dt;
        if (this._repRestoreTimers[distId] >= 12) {
          this._repRestoreTimers[distId] = 0;
          this._reputation[distId] = Math.min(100, this._reputation[distId] + 1);
        }

        // DANGEROUS low rep → extra gang bots every 10s
        if (distId === 'dangerous' && rep <= -50) {
          this._dangerSpawnTimer -= dt;
          if (this._dangerSpawnTimer <= 0) {
            this._dangerSpawnTimer = 10;
            const rp = this.map.randomRoadPos();
            this.bots.push(new Bot(rp.x, rp.y, this.wave, Math.random() < 0.6 ? 'normal' : 'mini', this.map.config));
          }
        }

        // RICH high rep → shop discount
        this._shopDiscount = (distId === 'rich' && rep >= 50) ? 0.15 : 0;
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
    if (this._wantedLevel >= 3 && !this._arenaMode && !this._zombieMode && !this._lifeMode && !this._indoor) {
      this._droneTimer -= dt * 1000;
      if (this._droneTimer <= 0 && this._drones.filter(d => d.type === 'police').length < this._wantedLevel - 1) {
        const pos = this.map.randomRoadPos();
        this._drones.push(new Drone(pos.x, pos.y, 'police'));
        this._droneTimer = 15000;
      }
    }
    // Combat drones in wave 6+
    if (!this._arenaMode && !this._zombieMode && !this._lifeMode && this.wave >= 6 && this._drones.filter(d => d.type === 'combat').length < Math.floor((this.wave - 5) / 2)) {
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

    // ── Bodyguards ─────────────────────────────────────────
    for (const bg of this._bodyguards) {
      bg.update(dt, this.player.x, this.player.y, this.bots, this.bullets, this.particles);
    }
    this._bodyguards = this._bodyguards.filter(bg => !bg.dead);

    // ── Weather ────────────────────────────────────────────
    this.weather.update(dt, this.canvas.width, this.canvas.height);

    // ── Wanted decay ───────────────────────────────────────
    if (this._wantedLevel > 0) {
      if (this._wantedLevel > this._achStats.maxWanted) {
        this._achStats.maxWanted = this._wantedLevel;
        this._checkAchievements();
      }
      const richHalt = this._currentDistrict?.id === 'rich' && this._reputation.rich <= -50;
      if (!richHalt) {
        this._wantedDecay += dt;
        if (this._wantedDecay >= 10.0) {
          this._wantedLevel = Math.max(0, this._wantedLevel - 1);
          this._wantedDecay = 0;
        }
      }
    }

    // ── Police spawn ───────────────────────────────────────
    if (this._wantedLevel > 0 && !this._zombieMode && !this._lifeMode) {
      const intervals = [0, 9000, 6000, 4000, 2400];
      this._policeTimer -= dt * 1000;
      if (this._policeTimer <= 0) {
        this._spawnPolice();
        this._policeTimer = intervals[this._wantedLevel];
      }
    }

    // ── City NPC updates (life mode) ───────────────────────
    if (this._lifeMode) {
      for (const npc of this._cityNpcs) npc.update(dt);
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

    for (const bot of this.bots) {
      if (bot._frozen > 0) { bot._frozen -= dt; continue; }
      let edt = dt;
      if (bot._slowTimer > 0) { bot._slowTimer -= dt; edt = dt * (bot._slowMult || 0.3); }
      bot.update(edt, this.player, this.map, this.bullets, this.particles);
    }

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

    // ── Grenades ─────────────────────────────────────────────
    for (const g of this._grenades) {
      g.update(dt, this.map);
      if (g.explode) this._explodeGrenade(g);
    }
    this._grenades = this._grenades.filter(g => !g.dead);

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
          if (b.special && !bot.dying) this._applyBulletSpecial(b.special, bot, b);
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
          if (!v.bulletproof) v.takeDamage(b.damage, this.particles);
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

    // ── Bullet → bodyguards (enemy bullets) ────────────────
    for (const bg of this._bodyguards) {
      if (bg.dead || bg.dying) continue;
      for (const b of this.bullets) {
        if (b.isPlayer || b.dead) continue;
        if (circlesOverlap(b.x, b.y, b.radius, bg.x, bg.y, bg.radius)) {
          bg.takeDamage(b.damage);
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

    // ── Bot spawning (non-arena, non-zombie, non-life only) ──
    if (!this._arenaMode && !this._zombieMode && !this._lifeMode) {
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

    // Rep loss in current district
    if (this._currentDistrict && !this._zombieMode) {
      const did = this._currentDistrict.id;
      this._reputation[did] = Math.max(-100, this._reputation[did] - 10);
      this._repRestoreTimers[did] = 0;
    }
  }

  _dropPickup(bot) {
    const chances = { mini: 0.12, normal: 0.28, big: 0.55 };
    if (Math.random() < (chances[bot.type] || 0.2)) {
      const r = Math.random();
      const indBonus   = this._currentDistrict?.id === 'industrial' && this._reputation.industrial >= 50;
      const ammoThresh = indBonus ? 0.84 : 0.72;
      const type = r < 0.42 ? 'health' : r < ammoThresh ? 'ammo' : 'cash';
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
    if (ev.id === 'glitch_mode') {
      // Spawn 2 portals at random road positions
      this._glitchPortals = [];
      for (let i = 0; i < 2; i++) {
        const rp = this.map.randomRoadPos();
        this._glitchPortals.push({ x: rp.x, y: rp.y, t: 0, spawnTimer: 8 + i * 3 });
      }
      this._glitchPortalTimer = 0;
    }
  }

  _endEvent() {
    if (!this._globalEvent) return;
    if (this._globalEvent.id === 'cyber_virus' && this._cyberDebuffActive) {
      this.player.fireRateMult /= 1.55;
      this._cyberDebuffActive = false;
    }
    if (this._globalEvent.id === 'glitch_mode') { this._glitchPortals = []; }
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
      if (!this.map.isBlocked(sx, sy)) {
        this.bots.push(new Bot(sx, sy, this.wave, type, this.map.config));
        if (this._currentDistrict?.id === 'industrial' && this._reputation.industrial <= -50) {
          const b = this.bots[this.bots.length - 1];
          b.hp = Math.round(b.hp * 1.25); b.maxHp = b.hp;
        }
        return;
      }
    }
    const rp = this.map.randomRoadPos();
    this.bots.push(new Bot(rp.x, rp.y, this.wave, type, this.map.config));
    if (this._currentDistrict?.id === 'industrial' && this._reputation.industrial <= -50) {
      const b = this.bots[this.bots.length - 1];
      b.hp = Math.round(b.hp * 1.25); b.maxHp = b.hp;
    }
  }

  _spawnBoss() {
    const rp = this.map.randomRoadPos();
    this.boss = new BossBot(rp.x, rp.y, this.wave, this.map.config.id);
  }

  _explodeGrenade(g) {
    const r = CONFIG.GRENADE.blastRadius, dmg = CONFIG.GRENADE.damage;
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2, s = rnd(120, 280);
      this.particles.push(new Particle(g.x, g.y, Math.cos(a)*s, Math.sin(a)*s, i%3===0 ? '#FF8800' : '#FF4400', rnd(4,9), 0.9));
    }
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2, s = rnd(40, 100);
      this.particles.push(new Particle(g.x, g.y, Math.cos(a)*s, Math.sin(a)*s, '#FFEE88', rnd(2,5), 0.5));
    }
    this.decals.push(new Decal(g.x, g.y, 'blood'));
    this.hud.shake(10);
    for (const bot of this.bots) {
      if (bot.dead || bot.dying) continue;
      if (circlesOverlap(g.x, g.y, r, bot.x, bot.y, bot.radius)) {
        bot.takeDamage(dmg, this.particles);
        this.hud.addDamageNumber(bot.x, bot.y - 30, dmg, this.camX, this.camY, '#FF8800');
        if (bot.dying) {
          this.decals.push(new Decal(bot.x, bot.y, 'blood'));
          const mult   = this._streakMultiplier();
          const earned = Math.round(CONFIG.MONEY_PER_KILL * bot._cfg.moneyMult * mult);
          this.money += earned; this._achStats.moneyEarned += earned; this.kills++;
          this.hud.addDamageNumber(bot.x, bot.y - 56, earned, this.camX, this.camY, '#FF8800');
          this._onKill(); this._dropPickup(bot);
        }
      }
    }
    if (this.boss && !this.boss.dead && !this.boss.dying &&
        circlesOverlap(g.x, g.y, r, this.boss.x, this.boss.y, this.boss.radius)) {
      this.boss.takeDamage(dmg, this.particles);
      this.hud.addDamageNumber(this.boss.x, this.boss.y - 60, dmg, this.camX, this.camY, '#FF8800');
    }
  }

  // ── Special weapon effects ─────────────────────────────────
  _applyBulletSpecial(special, bot, b) {
    if (special === 'timefreeze') {
      bot._frozen = 2.5;
      this.particles.push(...Particle.burst(bot.x, bot.y, '#88DDFF', 10, 40, 100, 2, 5, 0.5, 1.8));
    } else if (special === 'gravity') {
      const ang = Math.atan2(this.player.y - bot.y, this.player.x - bot.x);
      const nx  = bot.x + Math.cos(ang) * 80, ny = bot.y + Math.sin(ang) * 80;
      if (!this.map.isBlockedCircle(nx, ny, bot.radius)) { bot.x = nx; bot.y = ny; }
      this.particles.push(...Particle.burst(bot.x, bot.y, '#CC88FF', 8, 60, 140, 2, 5, 0.3, 0.9));
    } else if (special === 'electric') {
      for (const nb of this.bots) {
        if (nb === bot || nb.dead || nb.dying) continue;
        if (Math.hypot(nb.x - bot.x, nb.y - bot.y) < 105) {
          const chainDmg = Math.round(b.damage * 0.6);
          nb.takeDamage(chainDmg, this.particles);
          this.hud.addDamageNumber(nb.x, nb.y - 30, chainDmg, this.camX, this.camY, '#88FFCC');
          this.particles.push(...Particle.burst(nb.x, nb.y, '#88FFCC', 5, 40, 110, 1, 3, 0.2, 0.7));
        }
      }
    } else if (special === 'plasma') {
      bot._slowTimer = 3.0; bot._slowMult = 0.3;
      this.particles.push(...Particle.burst(bot.x, bot.y, '#FF88FF', 6, 30, 80, 2, 4, 0.3, 0.9));
    }
  }

  // ── Life Mode: city NPC spawning ───────────────────────────
  _spawnCityNpcs() {
    const count = 14 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
      const pos = this.map.randomRoadPos();
      this._cityNpcs.push(new CityNPC(pos.x, pos.y, this.map));
    }
  }

  _buildDistrictLayout() {
    if (this._arenaMode || this._zombieMode || this._lifeMode) return null;
    const types = ['dangerous', 'rich', 'industrial'];
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    return types;   // [leftZone, centerZone, rightZone]
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
      if (this._indoor.isDealership) {
        this._salespersons = [];
        if (this.state === 'carshop') { this._dealership.close(); this.state = 'playing'; }
      }
      if (this._indoor.isCasino) {
        this._casinoHosts = [];
        if (this.state === 'casino') { this._casino.close(); this.state = 'playing'; }
      }
      if (this._indoor.isMetro) {
        this._metroWaveTimer = undefined;
      }
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
        room.isDealership   = (door.specialType === 'dealership');
        room.isCasino       = (door.specialType === 'casino');
        room.isRestaurant   = (door.specialType === 'restaurant');
        room.isHome         = (door.specialType === 'home');
        room._doorSpecial   = door.specialType;
        if (this.map._blockTypes) {
          const R2 = this.map.ROAD_EVERY;
          const bx2 = Math.floor(door.tx / R2), by2 = Math.floor(door.ty / R2);
          room._buildingType = this.map._blockTypes[`${bx2},${by2}`] ?? 0;
        } else { room._buildingType = 0; }
        this._indoor = room;
        this._achStats.buildingsEntered++;
        this._checkAchievements();
        this.player.x = room.entryX;
        this.player.y = room.entryY;

        if (room.isDealership) {
          this._salespersons = [
            new Salesperson(room.entryX + 55,  room.entryY - 90,  '#FFAA55', 'DEALER'),
            new Salesperson(room.entryX - 55,  room.entryY - 130, '#55AAFF', 'DEALER'),
          ];
        } else if (room.isCasino) {
          this._casinoHosts = [
            new Salesperson(room.entryX + 60,  room.entryY - 85,  '#FF44AA', 'HOST'),
            new Salesperson(room.entryX - 60,  room.entryY - 115, '#FFCC00', 'HOST'),
          ];
        } else if (!this._lifeMode) {
          const key = `${door.tx},${door.ty}`;
          if (!this._visitedRooms.has(key)) {
            const count = 1 + Math.floor(Math.random() * 2) + Math.floor(this.wave / 3);
            for (let i = 0; i < Math.min(count, 4); i++) {
              const pos = room.randomRoadPos();
              this._indoorBots.push(new Bot(pos.x, pos.y, this.wave, 'normal', this.map.config));
            }
          }
        }
        return;
      }
    }
    // ── Metro entrance ─────────────────────────────────────────
    if (this.map.metroEntrance && !this._arenaMode && !this._zombieMode) {
      const me = this.map.metroEntrance;
      if (Math.hypot(me.wx - this.player.x, me.wy - this.player.y) < 65) {
        const room = this._buildMetroRoom();
        this._indoor        = room;
        this._indoorBots    = [];
        this._indoorBullets = [];
        this._indoorPickups = [];
        this._metroWave     = 0;
        this._metroWaveTimer = undefined;
        this._spawnMetroWave();
        this.player.x = room.entryX;
        this.player.y = room.entryY;
        this._achStats.buildingsEntered++;
        this._checkAchievements();
        return;
      }
    }
  }

  _updateIndoor(dt) {
    if (this._indoor?.isDealership) { this._updateDealershipIndoor(dt); return; }
    if (this._indoor?.isCasino)     { this._updateCasinoIndoor(dt);     return; }
    const room = this._indoor;
    const offX = (this.canvas.width  - room.roomW) / 2;
    const offY = (this.canvas.height - room.roomH) / 2;
    this.input.updateMouseWorld(-offX, -offY);
    this.player.inVehicle = false;
    this.player.update(dt, this.input, room, this._indoorBullets, this.particles);
    if (this.player.dead && this.state === 'playing') this.state = 'gameover';
    const _exitThreshold = room.isMetro ? room.roomH - room.S : room.roomH - 5;
    if (this.player.y >= _exitThreshold) { this._tryEnterExit(); return; }

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

    if (!room.isMetro) {
      const doorKey = `${room.doorDoor.tx},${room.doorDoor.ty}`;
      if (!this._visitedRooms.has(doorKey) &&
          this._indoorBots.length > 0 &&
          this._indoorBots.filter(b => !b.dead).length === 0) {
        this._visitedRooms.add(doorKey);
        this._achStats.buildingsCleared++;
        this._checkAchievements();
      }
    }

    this._indoorBots    = this._indoorBots.filter(b => !b.dead);
    this._indoorBullets = this._indoorBullets.filter(b => !b.dead);

    // ── Metro wave management ──────────────────────────────────
    if (room.isMetro) {
      if (this._metroWaveTimer !== undefined) {
        this._metroWaveTimer -= dt;
        if (this._metroWaveTimer <= 0) {
          this._metroWaveTimer = undefined;
          this._spawnMetroWave();
        }
      } else if (this._indoorBots.length === 0) {
        this._metroWaveTimer = 4.0;
      }
    }
    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter(p => !p.dead);
    if (this._streakTimer > 0) { this._streakTimer -= dt; if (this._streakTimer <= 0) this._killStreak = 0; }
    if (this._streakPopup.timer > 0) this._streakPopup.timer -= dt;
    this.weather.update(dt, this.canvas.width, this.canvas.height);
    this.hud.update(dt);
  }

  _updateDealershipIndoor(dt) {
    const room = this._indoor;
    const offX = (this.canvas.width  - room.roomW) / 2;
    const offY = (this.canvas.height - room.roomH) / 2;
    this.input.updateMouseWorld(-offX, -offY);
    this.player.inVehicle = false;
    this.player.update(dt, this.input, room, this._indoorBullets, this.particles);
    if (this.player.dead && this.state === 'playing') this.state = 'gameover';
    if (this.player.y >= room.roomH - 5) { this._tryEnterExit(); return; }
    for (const b of this._indoorBullets) b.update(dt, room);
    this._indoorBullets = this._indoorBullets.filter(b => !b.dead);
    for (const sp of this._salespersons) sp.update(dt);
    this._nearSalesperson = this._salespersons.some(
      sp => Math.hypot(sp.x - this.player.x, sp.y - this.player.y) < 60
    );
    this.weather.update(dt, this.canvas.width, this.canvas.height);
    if (this._streakTimer > 0) { this._streakTimer -= dt; if (this._streakTimer <= 0) this._killStreak = 0; }
    if (this._streakPopup.timer > 0) this._streakPopup.timer -= dt;
    this.hud.update(dt);
  }

  _updateCasinoIndoor(dt) {
    const room = this._indoor;
    const offX = (this.canvas.width  - room.roomW) / 2;
    const offY = (this.canvas.height - room.roomH) / 2;
    this.input.updateMouseWorld(-offX, -offY);
    this.player.inVehicle = false;
    if (this.state === 'playing') {
      this.player.update(dt, this.input, room, this._indoorBullets, this.particles);
      if (this.player.dead) this.state = 'gameover';
      if (this.player.y >= room.roomH - 5) { this._tryEnterExit(); return; }
    }
    for (const h of this._casinoHosts) h.update(dt);
    this._nearCasinoHost = this._casinoHosts.some(
      h => Math.hypot(h.x - this.player.x, h.y - this.player.y) < 65
    );
    this.weather.update(dt, this.canvas.width, this.canvas.height);
    if (this._streakTimer > 0) { this._streakTimer -= dt; if (this._streakTimer <= 0) this._killStreak = 0; }
    if (this._streakPopup.timer > 0) this._streakPopup.timer -= dt;
    this.hud.update(dt);
  }

  _renderIndoorScene(ctx, W, H, shake) {
    if (this._indoor?.isDealership) { this._renderDealershipIndoor(ctx, W, H, shake); return; }
    if (this._indoor?.isCasino)     { this._renderCasinoIndoor(ctx, W, H, shake);     return; }
    if (this._indoor?.isMetro)      { this._renderMetroIndoor(ctx, W, H, shake);       return; }
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
    this._renderIndoorFurniture(ctx, room);
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

  _renderIndoorFurniture(ctx, room) {
    const W = room.roomW, H = room.roomH;
    const cx = W / 2, topY = H * 0.14, midY = H * 0.44;
    // type: string (special door) or number (0-7 building type index)
    const type = (room._doorSpecial && room._doorSpecial !== 'dealership' && room._doorSpecial !== 'casino')
      ? room._doorSpecial
      : (typeof room._buildingType === 'number' ? room._buildingType : 0);

    // Rounded rect helper
    const rr = (x, y, w, h, r = 4) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

    ctx.save();
    ctx.globalAlpha = 0.88;

    if (type === 'home') {
      // ── Sofa (left-center) ───────────────────────
      ctx.fillStyle = '#5a3a7a'; ctx.strokeStyle = '#8855bb'; ctx.lineWidth = 1.5;
      rr(cx - W*0.42, midY - 18, 84, 34, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4a2a6a';  // back rest
      rr(cx - W*0.42, midY - 34, 84, 18, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7a4aaa'; ctx.strokeStyle = '#9966cc'; ctx.lineWidth = 1;
      ctx.fillRect(cx - W*0.42 + 4, midY - 16, 36, 28);
      ctx.fillRect(cx - W*0.42 + 44, midY - 16, 36, 28);
      ctx.strokeRect(cx - W*0.42 + 4, midY - 16, 36, 28);
      ctx.strokeRect(cx - W*0.42 + 44, midY - 16, 36, 28);

      // ── TV on north wall ─────────────────────────
      ctx.fillStyle = '#111118'; ctx.strokeStyle = '#44EEFF'; ctx.lineWidth = 1.5;
      rr(cx - 40, topY + 8, 80, 46, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0a2a4a'; ctx.fillRect(cx - 36, topY + 12, 72, 34);
      ctx.fillStyle = '#0055AA';
      for (let i = 0; i < 4; i++) ctx.fillRect(cx - 32, topY + 14 + i * 7, 64, 3);
      ctx.fillStyle = '#44EEFF'; ctx.shadowColor = '#44EEFF'; ctx.shadowBlur = 7;
      ctx.beginPath(); ctx.arc(cx, topY + 29, 9, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#333344'; ctx.fillRect(cx - 7, topY + 54, 14, 8);
      ctx.fillRect(cx - 18, topY + 60, 36, 4);

      // ── Coffee table (center) ────────────────────
      ctx.fillStyle = '#4a3220'; ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = 1;
      rr(cx - 28, midY - 4, 56, 26, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5a4230'; ctx.fillRect(cx - 24, midY, 48, 18);
      ctx.fillStyle = '#EEDDCC';
      ctx.beginPath(); ctx.ellipse(cx, midY + 9, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#CC8855'; ctx.fillRect(cx - 3, midY + 5, 6, 4);

      // ── Bookshelf (right wall) ───────────────────
      ctx.fillStyle = '#3a2a18'; ctx.strokeStyle = '#6a4a28'; ctx.lineWidth = 1.5;
      rr(cx + W*0.3, topY + 4, 40, 74, 2); ctx.fill(); ctx.stroke();
      const bkC = ['#CC4433','#3366FF','#44CC66','#FFAA22','#AA44FF','#FF6699'];
      for (let si = 0; si < 3; si++) {
        ctx.fillStyle = '#2a1a08';
        ctx.fillRect(cx + W*0.3 + 2, topY + 4 + si * 22 + 19, 36, 3);
        for (let bi = 0; bi < 4; bi++) {
          ctx.fillStyle = bkC[(si * 4 + bi) % bkC.length];
          ctx.fillRect(cx + W*0.3 + 4 + bi * 8, topY + 4 + si * 22 + 2, 7, 16);
        }
      }

      // ── Dining table (upper right area) ─────────
      const dtx = cx + W*0.2, dty = topY + 88;
      ctx.fillStyle = '#5a3a22'; ctx.strokeStyle = '#8a5a38'; ctx.lineWidth = 1;
      rr(dtx - 30, dty - 18, 60, 36, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4a2a18'; ctx.strokeStyle = '#7a4a2a';
      for (const [ox, oy] of [[-36, -10],[30, -10],[-8, -28],[-8, 22]]) {
        rr(dtx + ox - 8, dty + oy - 8, 16, 16, 3); ctx.fill(); ctx.stroke();
      }

      // ── Floor lamp (left corner) ─────────────────
      const lx = cx - W*0.34, ly = topY + 92;
      ctx.strokeStyle = '#886644'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(lx, ly + 28); ctx.lineTo(lx, ly - 8); ctx.stroke();
      ctx.fillStyle = '#FFEEAA'; ctx.shadowColor = '#FFDD88'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(lx - 14, ly); ctx.lineTo(lx + 14, ly);
      ctx.lineTo(lx + 8, ly - 12); ctx.lineTo(lx - 8, ly - 12); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#4a3a20';
      ctx.beginPath(); ctx.ellipse(lx, ly + 28, 9, 4, 0, 0, Math.PI * 2); ctx.fill();

      // ── Potted plant (right corner) ─────────────
      const ppx = cx + W*0.36, ppy = midY + 14;
      ctx.fillStyle = '#4a2a10'; ctx.fillRect(ppx - 8, ppy - 4, 16, 12);
      ctx.fillStyle = '#226622'; ctx.shadowColor = '#22FF44'; ctx.shadowBlur = 5;
      for (let li = 0; li < 5; li++) {
        const la = (li / 5) * Math.PI * 2;
        ctx.beginPath(); ctx.ellipse(ppx + Math.cos(la) * 11, ppy - 10 + Math.sin(la) * 5, 9, 5, la, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;

    } else if (type === 'restaurant' || type === 0) {
      // ── Bar counter (top) ────────────────────────
      ctx.fillStyle = '#3a2010'; ctx.strokeStyle = '#6a4020'; ctx.lineWidth = 1.5;
      rr(cx - 72, topY + 6, 144, 22, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,200,150,0.12)'; ctx.fillRect(cx - 70, topY + 8, 140, 7);
      for (let i = 0; i < 4; i++) {
        const sx = cx - 54 + i * 36;
        ctx.fillStyle = '#AA5533'; ctx.strokeStyle = '#CC7744'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(sx, topY + 38, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#886633'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sx, topY + 38); ctx.lineTo(sx, topY + 30); ctx.stroke();
      }

      // ── 3 round dining tables ────────────────────
      for (const [tx2, ty2] of [[cx - W*0.3, midY - 8], [cx, midY + 6], [cx + W*0.28, midY - 8]]) {
        ctx.fillStyle = '#FFEECC'; ctx.strokeStyle = '#CC9966'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(tx2, ty2, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#EE8844';
        ctx.beginPath(); ctx.arc(tx2, ty2, 17, 0, Math.PI * 2); ctx.fill();
        for (let ci = 0; ci < 3; ci++) {
          const ca = (ci / 3) * Math.PI * 2 - Math.PI / 2;
          ctx.fillStyle = '#5a3820'; ctx.strokeStyle = '#8a5830'; ctx.lineWidth = 1;
          rr(tx2 + Math.cos(ca) * 29 - 7, ty2 + Math.sin(ca) * 29 - 7, 14, 14, 3); ctx.fill(); ctx.stroke();
        }
        ctx.fillStyle = '#FFEEAA'; ctx.shadowColor = '#FFDD66'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(tx2, ty2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

      // ── Menu board (left wall) ───────────────────
      ctx.fillStyle = '#1a3a1a'; ctx.strokeStyle = '#44AA44'; ctx.lineWidth = 1.5;
      rr(cx - W*0.46, topY + 4, 54, 64, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#AAFFAA'; ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center';
      ctx.fillText('MENU', cx - W*0.46 + 27, topY + 16);
      ctx.fillStyle = '#88FF88'; ctx.font = '5px monospace';
      ['BURGER $8', 'PASTA $12', 'PIZZA $15', 'SALAD $9', 'COFFEE $4'].forEach((t, i) => {
        ctx.fillText(t, cx - W*0.46 + 27, topY + 26 + i * 9);
      });

    } else if (type === 1) { // OFFICE
      // ── Meeting table (center) ───────────────────
      ctx.fillStyle = '#2a3a4a'; ctx.strokeStyle = '#4a6a8a'; ctx.lineWidth = 1.5;
      rr(cx - 58, midY - 26, 116, 52, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a2a3a'; rr(cx - 54, midY - 22, 108, 44, 2); ctx.fill();
      ctx.fillStyle = '#334455'; ctx.strokeStyle = '#4466AA'; ctx.lineWidth = 1;
      for (const [ox, oy] of [[-68,-16],[-68,6],[68,-16],[68,6],[-24,-34],[24,-34],[-24,32],[24,32]]) {
        ctx.beginPath(); ctx.arc(cx + ox, midY + oy, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      for (let li = 0; li < 3; li++) {
        ctx.fillStyle = '#223344'; ctx.fillRect(cx - 42 + li * 44, midY - 14, 26, 20);
        ctx.fillStyle = '#1155AA'; ctx.fillRect(cx - 40 + li * 44, midY - 12, 22, 16);
      }

      // ── Whiteboard (top wall) ────────────────────
      ctx.fillStyle = '#EEFFEE'; ctx.strokeStyle = '#44AA44'; ctx.lineWidth = 1.5;
      rr(cx - 46, topY + 4, 92, 44, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#225522'; ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center';
      ctx.fillText('QUARTERLY REPORT', cx, topY + 14);
      ctx.strokeStyle = '#338833'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - 38, topY + 20); ctx.lineTo(cx + 38, topY + 20); ctx.stroke();
      ctx.strokeStyle = '#66AA66'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 32, topY + 42); ctx.lineTo(cx - 18, topY + 30);
      ctx.lineTo(cx - 4, topY + 36); ctx.lineTo(cx + 12, topY + 26); ctx.lineTo(cx + 28, topY + 20);
      ctx.stroke();

      // ── Corner desk + monitor ────────────────────
      ctx.fillStyle = '#2a3a4a'; ctx.strokeStyle = '#4a5a6a'; ctx.lineWidth = 1;
      rr(cx + W*0.3, topY + 86, 46, 40, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#111118'; ctx.strokeStyle = '#44EEFF'; ctx.lineWidth = 1;
      rr(cx + W*0.3 + 7, topY + 88, 32, 22, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#002244'; ctx.fillRect(cx + W*0.3 + 9, topY + 90, 28, 18);
      ctx.fillStyle = '#0055FF'; ctx.fillRect(cx + W*0.3 + 11, topY + 92, 24, 7);

      // Plant corner
      ctx.fillStyle = '#3a2810'; ctx.fillRect(cx - W*0.37, topY + 90, 14, 10);
      ctx.fillStyle = '#225522'; ctx.shadowColor = '#44FF44'; ctx.shadowBlur = 4;
      for (let li = 0; li < 4; li++) {
        const la = (li / 4) * Math.PI * 2;
        ctx.beginPath(); ctx.ellipse(cx - W*0.37 + 7 + Math.cos(la) * 9, topY + 88 + Math.sin(la) * 4, 7, 4, la, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;

    } else if (type === 2) { // HOTEL
      // ── Reception desk ───────────────────────────
      ctx.fillStyle = '#3a2510'; ctx.strokeStyle = '#8a6030'; ctx.lineWidth = 1.5;
      rr(cx - 50, topY + 4, 100, 30, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5a3820'; rr(cx - 46, topY + 6, 92, 14, 2); ctx.fill();
      ctx.fillStyle = '#111118'; ctx.strokeStyle = '#44EEFF'; ctx.lineWidth = 1;
      ctx.fillRect(cx - 15, topY + 7, 30, 20);
      ctx.fillStyle = '#002244'; ctx.fillRect(cx - 13, topY + 9, 26, 16);
      // hotel bell
      ctx.fillStyle = '#FFCC44'; ctx.shadowColor = '#FFCC44'; ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.arc(cx + 28, topY + 21, 8, Math.PI, 0); ctx.fill();
      ctx.fillRect(cx + 20, topY + 21, 16, 3);
      ctx.shadowBlur = 0;

      // ── Lobby sofas ──────────────────────────────
      for (const [sx, sw, flip] of [[cx - W*0.3, 70, false], [cx + W*0.14, 70, true]]) {
        const sx2 = flip ? sx - sw : sx;
        ctx.fillStyle = '#4a3060'; ctx.strokeStyle = '#7a50A0'; ctx.lineWidth = 1.5;
        rr(sx2, midY - 6, sw, 28, 5); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#3a2050'; rr(sx2, midY - 20, sw, 16, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#5a4080';
        ctx.fillRect(sx2 + 4, midY - 3, sw / 2 - 8, 22);
        ctx.fillRect(sx2 + sw / 2 + 4, midY - 3, sw / 2 - 8, 22);
      }

      // ── Central fountain ─────────────────────────
      ctx.strokeStyle = '#44CCFF'; ctx.lineWidth = 2; ctx.fillStyle = '#0a1a2a';
      ctx.beginPath(); ctx.arc(cx, midY + 22, 26, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a3a5a';
      ctx.beginPath(); ctx.arc(cx, midY + 22, 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(68,204,255,0.3)';
      for (let i = 0; i < 5; i++) {
        const wa = (i / 5) * Math.PI * 2, wr = 9 + Math.sin(i * 1.3) * 4;
        ctx.beginPath(); ctx.ellipse(cx + Math.cos(wa) * wr, midY + 22 + Math.sin(wa) * wr * 0.5, 3, 2, wa, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#AAEEFF'; ctx.shadowColor = '#44CCFF'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(cx, midY + 12, 3, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (type === 3) { // MARKET
      // ── 3 shelf rows ─────────────────────────────
      const sC = [['#CC3333','#3366CC','#44AA44','#FFAA22'],['#FF6699','#66CCFF','#FFEE44','#AA66FF'],['#EE8833','#33CCAA','#FF5544','#88BBFF']];
      for (let row = 0; row < 3; row++) {
        const sy2 = topY + 8 + row * 40;
        ctx.fillStyle = '#2a2a2a'; ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
        ctx.fillRect(cx - W*0.42, sy2, W*0.84, 30);
        ctx.fillStyle = '#3a3022';
        ctx.fillRect(cx - W*0.42, sy2 + 9, W*0.84, 4);
        ctx.fillRect(cx - W*0.42, sy2 + 22, W*0.84, 4);
        for (let pi = 0; pi < 11; pi++) {
          const px3 = cx - W*0.4 + pi * (W*0.8 / 11);
          ctx.fillStyle = sC[row][pi % 4];
          ctx.fillRect(px3, sy2 + 2, W*0.8 / 11 - 2, 7);
          ctx.fillRect(px3, sy2 + 15, W*0.8 / 11 - 2, 7);
        }
      }
      // ── Checkout counter ─────────────────────────
      ctx.fillStyle = '#1a2a3a'; ctx.strokeStyle = '#3a4a5a'; ctx.lineWidth = 1.5;
      rr(cx - 32, midY + 18, 64, 26, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#111118'; ctx.fillRect(cx - 14, midY + 19, 28, 16);
      ctx.fillStyle = '#44EEFF'; ctx.fillRect(cx - 12, midY + 21, 24, 12);
      ctx.fillStyle = '#FFCC44'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('CHECKOUT', cx, midY + 54);

    } else if (type === 4) { // ARCADE
      // ── 6 arcade cabinets ────────────────────────
      const aColors = ['#FF0044','#00AAFF','#00FF88','#FFAA00','#AA00FF','#FF6600'];
      const aPos = [[cx - W*0.36, topY + 6],[cx - W*0.14, topY + 6],[cx + W*0.1, topY + 6],
                    [cx - W*0.28, midY - 4],[cx - W*0.02, midY - 4],[cx + W*0.24, midY - 4]];
      for (let i = 0; i < aPos.length; i++) {
        const [ax, ay] = aPos[i], ac = aColors[i];
        ctx.fillStyle = '#1a1a2a'; ctx.strokeStyle = ac; ctx.lineWidth = 1.5;
        rr(ax - 17, ay, 34, 46, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#000820'; ctx.fillRect(ax - 13, ay + 4, 26, 20);
        ctx.fillStyle = ac + '44'; ctx.fillRect(ax - 13, ay + 4, 26, 20);
        ctx.shadowColor = ac; ctx.shadowBlur = 8; ctx.fillStyle = ac;
        ctx.fillRect(ax - 5, ay + 8, 10, 7);
        ctx.fillRect(ax - 7, ay + 10, 14, 4);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#2a2a3a'; ctx.fillRect(ax - 15, ay + 26, 30, 11);
        ctx.fillStyle = '#888';
        ctx.beginPath(); ctx.arc(ax - 4, ay + 31, 4, 0, Math.PI * 2); ctx.fill();
        const bC = ['#FF3333','#33FF33','#3333FF'];
        for (let bi = 0; bi < 3; bi++) {
          ctx.fillStyle = bC[bi]; ctx.shadowColor = bC[bi]; ctx.shadowBlur = 3;
          ctx.beginPath(); ctx.arc(ax + 5 + bi * 4, ay + 31, 2.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 0;
      }
      // Prize counter
      ctx.fillStyle = '#2a1a3a'; ctx.strokeStyle = '#AA44FF'; ctx.lineWidth = 1.5;
      rr(cx - 46, midY + 32, 92, 22, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFEE44'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('PRIZE COUNTER', cx, midY + 48);

    } else if (type === 5) { // PHARMACY
      // ── Medicine shelves ─────────────────────────
      const mC = ['#FF4444','#4444FF','#44FF44','#FFAA44','#FF44FF','#44FFFF'];
      for (let row = 0; row < 2; row++) {
        const sy2 = topY + 6 + row * 38;
        ctx.fillStyle = '#EEEEFF'; ctx.strokeStyle = '#AAAACC'; ctx.lineWidth = 1;
        ctx.fillRect(cx - W*0.4, sy2, W*0.8, 30);
        ctx.fillStyle = '#CCCCEE';
        ctx.fillRect(cx - W*0.4, sy2 + 13, W*0.8, 3);
        ctx.fillRect(cx - W*0.4, sy2 + 25, W*0.8, 3);
        for (let pi = 0; pi < 10; pi++) {
          const px3 = cx - W*0.38 + pi * (W*0.76 / 10);
          ctx.fillStyle = mC[pi % mC.length];
          const bh = 6 + (pi % 3) * 3;
          ctx.fillRect(px3, sy2 + 2, W*0.76 / 10 - 2, bh);
          ctx.fillRect(px3, sy2 + 15, W*0.76 / 10 - 2, bh - 2);
        }
      }
      // ── Counter + cross ───────────────────────────
      ctx.fillStyle = '#EEEEFF'; ctx.strokeStyle = '#4488FF'; ctx.lineWidth = 1.5;
      rr(cx - 46, midY + 2, 92, 26, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#22CC44'; ctx.shadowColor = '#22FF66'; ctx.shadowBlur = 12;
      ctx.fillRect(cx - 4, midY - 18, 8, 20);
      ctx.fillRect(cx - 10, midY - 12, 20, 8);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#111118'; ctx.fillRect(cx + 18, midY + 4, 22, 16);
      ctx.fillStyle = '#003322'; ctx.fillRect(cx + 20, midY + 6, 18, 12);

    } else if (type === 6) { // GYM
      // ── Treadmills (left) ────────────────────────
      for (let i = 0; i < 2; i++) {
        const tx2 = cx - W*0.38, ty2 = topY + 8 + i * 62;
        ctx.fillStyle = '#1a1a2a'; ctx.strokeStyle = '#FF4422'; ctx.lineWidth = 1.5;
        rr(tx2, ty2, 56, 40, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#333344'; ctx.fillRect(tx2 + 4, ty2 + 16, 48, 14);
        ctx.fillStyle = '#FF4422'; ctx.fillRect(tx2 + 4, ty2 + 16, 48, 4);
        ctx.fillStyle = '#222'; ctx.fillRect(tx2 + 10, ty2 + 4, 30, 12);
        ctx.fillStyle = '#FF4422'; ctx.fillRect(tx2 + 12, ty2 + 5, 26, 10);
        ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(tx2 + 2, ty2 + 4); ctx.lineTo(tx2 + 2, ty2 + 16); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tx2 + 54, ty2 + 4); ctx.lineTo(tx2 + 54, ty2 + 16); ctx.stroke();
      }
      // ── Weight rack (right) ──────────────────────
      const wrx = cx + W*0.08, wry = topY + 6;
      ctx.fillStyle = '#2a2a2a'; ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
      ctx.fillRect(wrx, wry, 16, 84);
      for (let ri = 0; ri < 3; ri++) {
        ctx.fillStyle = '#888'; ctx.fillRect(wrx - 2, wry + 8 + ri * 26, 20, 4);
        const pC2 = ['#FF3333','#3333FF','#33FF33','#FFAA33'];
        for (let pi = 0; pi < 3; pi++) {
          const pw = 8 + ri * 4;
          ctx.fillStyle = pC2[(ri + pi) % 4];
          ctx.beginPath(); ctx.ellipse(wrx + 8 + (pi - 1) * (pw + 5), wry + 12 + ri * 26, pw / 2, 11, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
      // ── Bench press (center-right) ───────────────
      const bpx = cx + W*0.1, bpy = midY - 4;
      ctx.fillStyle = '#2a2a30'; ctx.strokeStyle = '#444455'; ctx.lineWidth = 1;
      rr(bpx, bpy, 62, 20, 3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#AAAAAA'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(bpx - 16, bpy - 9); ctx.lineTo(bpx + 78, bpy - 9); ctx.stroke();
      ctx.fillStyle = '#FF3333';
      ctx.fillRect(bpx - 16, bpy - 17, 12, 16);
      ctx.fillRect(bpx + 66, bpy - 17, 12, 16);
      // Exercise mat
      ctx.fillStyle = '#1a3a1a'; ctx.strokeStyle = '#2a6a2a'; ctx.lineWidth = 1;
      rr(cx - W*0.4, midY + 30, W*0.32, 22, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2a5a2a';
      for (let mi = 0; mi < 4; mi++) ctx.fillRect(cx - W*0.4 + mi * (W*0.32 / 4), midY + 30, 2, 22);

    } else if (type === 7) { // BANK
      // ── 3 teller windows ─────────────────────────
      for (let i = 0; i < 3; i++) {
        const twx = cx - 76 + i * 52, twy = topY + 4;
        ctx.fillStyle = '#2a2a3a'; ctx.strokeStyle = '#FFCC44'; ctx.lineWidth = 1.5;
        rr(twx, twy, 44, 54, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(100,200,255,0.15)'; ctx.fillRect(twx + 2, twy + 2, 40, 36);
        ctx.strokeStyle = 'rgba(100,200,255,0.45)'; ctx.lineWidth = 1;
        ctx.strokeRect(twx + 2, twy + 2, 40, 36);
        ctx.fillStyle = '#FFDD88';
        ctx.beginPath(); ctx.arc(twx + 22, twy + 14, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a4a5a'; ctx.fillRect(twx + 13, twy + 21, 18, 14);
        ctx.fillStyle = '#FFCC44'; ctx.fillRect(twx + 9, twy + 40, 26, 3);
        ctx.font = 'bold 5px monospace'; ctx.textAlign = 'center';
        ctx.fillText(`WIN ${i + 1}`, twx + 22, twy + 50);
      }
      // ── Velvet rope queue ─────────────────────────
      ctx.strokeStyle = '#AA2222'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 64, midY - 6); ctx.lineTo(cx - 64, midY + 16);
      ctx.moveTo(cx - 64, midY + 16); ctx.lineTo(cx + 22, midY + 16);
      ctx.moveTo(cx + 22, midY + 16); ctx.lineTo(cx + 22, midY - 6);
      ctx.stroke();
      for (const rpx of [cx - 64, cx + 22]) {
        ctx.fillStyle = '#FFCC44'; ctx.shadowColor = '#FFCC44'; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(rpx, midY - 6, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(rpx, midY + 16, 5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      // ── Vault door (right side) ───────────────────
      const vx = cx + W*0.3, vy = midY - 22;
      ctx.fillStyle = '#222222'; ctx.strokeStyle = '#888888'; ctx.lineWidth = 2;
      rr(vx - 24, vy, 48, 58, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#444444'; ctx.strokeStyle = '#AAAAAA'; ctx.lineWidth = 1.5;
      rr(vx - 20, vy + 4, 40, 50, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#FFCC44'; ctx.shadowColor = '#FFCC44'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(vx, vy + 29, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(vx, vy + 29); ctx.lineTo(vx + 8, vy + 24); ctx.stroke();
      ctx.strokeStyle = '#CCCCCC'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(vx + 12, vy + 42, 6, 0, Math.PI); ctx.stroke();
      ctx.fillStyle = '#CCCCCC';
      for (const [bx2, by2] of [[-16, 9],[-16, 49],[16, 9],[16, 49]]) {
        ctx.beginPath(); ctx.arc(vx + bx2, vy + by2, 3, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Metro helpers ────────────────────────────────────────────
  _buildMetroRoom() {
    const RS     = 48;
    const layout = ROOM_LAYOUT_METRO;
    const RH = layout.length, RW = layout[0].length;
    const RW_px = RW * RS, RH_px = RH * RS;
    // Entry gap at cols 8-10 → center col 9
    const entryX = (8 + 1.5) * RS;   // 9.5 * 48 = 456
    const entryY = RH_px - RS - 12;
    const floorPositions = [];
    for (let fy = 3; fy < RH - 1; fy++) {
      for (let fx = 1; fx < RW - 1; fx++) {
        if (layout[fy][fx] === 0) floorPositions.push({ x: (fx + 0.5) * RS, y: (fy + 0.5) * RS });
      }
    }
    return {
      isMetro: true, layout, W: RW, H: RH, S: RS,
      roomW: RW_px, roomH: RH_px,
      doorDoor: this.map.metroEntrance,
      entryX, entryY, floorPositions,
      isBlocked(wx, wy) {
        const tx2 = Math.floor(wx / RS), ty2 = Math.floor(wy / RS);
        if (tx2 < 0 || ty2 < 0 || tx2 >= RW || ty2 >= RH) return true;
        return layout[ty2][tx2] !== 0;
      },
      isBlockedCircle(wx, wy, r) {
        return this.isBlocked(wx - r + 1, wy - r + 1) || this.isBlocked(wx + r - 1, wy - r + 1) ||
               this.isBlocked(wx - r + 1, wy + r - 1) || this.isBlocked(wx + r - 1, wy + r - 1);
      },
      randomRoadPos() {
        const p = floorPositions[Math.floor(Math.random() * floorPositions.length)];
        return new Vec2(p.x, p.y);
      },
    };
  }

  _spawnMetroWave() {
    this._metroWave++;
    const room    = this._indoor;
    const waveNum = this._metroWave;
    const base    = 2 + Math.floor(this.wave / 2);
    const count   = Math.min(base + waveNum, 10);
    const types   = ['normal','normal','mini','big','normal'];
    for (let i = 0; i < count; i++) {
      const pos  = room.randomRoadPos();
      const type = (waveNum >= 3 && i === count - 1) ? 'big'
                 : (waveNum >= 2 && i % 3 === 0)     ? 'mini'
                 : types[i % types.length];
      this._indoorBots.push(new Bot(pos.x, pos.y, this.wave + waveNum - 1, type, this.map.config));
    }
  }

  _renderMetroIndoor(ctx, W, H, shake) {
    const room = this._indoor;
    const offX = (W - room.roomW) / 2, offY = (H - room.roomH) / 2;
    const S = room.S;
    const T = Date.now() / 1000;

    // ── Sky/background ─────────────────────────────────────────
    ctx.fillStyle = '#020308'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(offX + shake.x, offY + shake.y);

    // ── Tile pass ─────────────────────────────────────────────
    for (let ty = 0; ty < room.H; ty++) {
      for (let tx = 0; tx < room.W; tx++) {
        const t = room.layout[ty][tx];
        const px = tx * S, py = ty * S;
        if (t === 1) {
          // Concrete wall / ceiling
          ctx.fillStyle = '#0d0d18'; ctx.fillRect(px, py, S, S);
          ctx.fillStyle = 'rgba(255,255,255,0.018)';
          ctx.fillRect(px, py, S, 2); ctx.fillRect(px, py, 2, S);
        } else if (t === 2) {
          // Bench
          ctx.fillStyle = '#161622'; ctx.fillRect(px, py, S, S);
          ctx.fillStyle = '#263648'; ctx.fillRect(px + 5, py + S * 0.28, S - 10, 18);
          ctx.fillStyle = '#1e2e3e'; ctx.fillRect(px + 5, py + S * 0.12, S - 10, S * 0.18);
          ctx.strokeStyle = '#3a4e62'; ctx.lineWidth = 1;
          ctx.strokeRect(px + 5, py + S * 0.12, S - 10, S * 0.5);
        } else if (t === 3) {
          // Train tracks / pit
          ctx.fillStyle = '#05050e'; ctx.fillRect(px, py, S, S);
          // Cross ties (wooden sleepers)
          ctx.fillStyle = '#1a1208';
          for (let ci = 0; ci < 3; ci++) ctx.fillRect(px, py + ci * (S / 3) + 2, S, 7);
          // Rails (two per tile)
          ctx.fillStyle = '#3a3a50';
          ctx.fillRect(px + 7, py, 5, S); ctx.fillRect(px + S - 12, py, 5, S);
          ctx.fillStyle = '#5a5a70';
          ctx.fillRect(px + 8, py, 3, S); ctx.fillRect(px + S - 11, py, 3, S);
        } else {
          // Platform floor — checkerboard tiles
          ctx.fillStyle = (tx + ty) % 2 === 0 ? '#14141f' : '#111019';
          ctx.fillRect(px, py, S, S);
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(px, py, S, 1); ctx.fillRect(px, py, 1, S);
        }
      }
    }

    // ── Subway train parked at top (rows 1-2) ──────────────────
    const trainTop = S, trainH = S * 2;
    // Car shell
    ctx.fillStyle = '#1c2d3e'; ctx.fillRect(0, trainTop, room.roomW, trainH);
    // Body panel
    ctx.fillStyle = '#253848'; ctx.fillRect(3, trainTop + 5, room.roomW - 6, trainH - 10);
    // Windows (warm glow)
    const numWin = Math.floor(room.roomW / 78);
    for (let wi = 0; wi < numWin; wi++) {
      const wx2 = 18 + wi * 78;
      ctx.fillStyle = '#3a2a10'; ctx.fillRect(wx2, trainTop + 9, 46, 26);
      ctx.fillStyle = 'rgba(255,215,100,0.72)';
      ctx.fillRect(wx2 + 2, trainTop + 11, 42, 22);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(wx2 + 2, trainTop + 11, 12, 9);
    }
    // Blue stripe
    ctx.fillStyle = '#0044AA'; ctx.fillRect(0, trainTop + trainH - 14, room.roomW, 8);
    // Door openings
    for (const dx of [room.roomW * 0.22, room.roomW * 0.5, room.roomW * 0.78]) {
      ctx.fillStyle = '#080c14'; ctx.fillRect(dx - 18, trainTop + 5, 36, trainH - 10);
      // door frame
      ctx.strokeStyle = '#224466'; ctx.lineWidth = 1.5;
      ctx.strokeRect(dx - 18, trainTop + 5, 36, trainH - 10);
    }
    // Headlight flicker
    const flickOn = Math.sin(T * 2.4) > 0.3;
    if (flickOn) {
      ctx.fillStyle = 'rgba(180,220,255,0.18)';
      ctx.fillRect(0, trainTop, room.roomW * 0.12, trainH);
      ctx.fillRect(room.roomW * 0.88, trainTop, room.roomW * 0.12, trainH);
    }
    // Car number
    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
    ctx.fillText('LINE 1 · NEON CITY METRO', room.roomW / 2, trainTop + trainH - 2);

    // ── Platform edge yellow safety stripe ─────────────────────
    const platEdge = 3 * S;
    ctx.fillStyle = '#FFCC00'; ctx.shadowColor = '#FFCC00'; ctx.shadowBlur = 10;
    ctx.fillRect(0, platEdge - 7, room.roomW, 7);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a0a00'; ctx.font = 'bold 5px monospace'; ctx.textAlign = 'left';
    for (let xi = 0; xi < 10; xi++) ctx.fillText('▲ CAUTION — PLATFORM EDGE ▲', xi * 140, platEdge - 1);

    // ── Ceiling fluorescent lights ─────────────────────────────
    for (const lx of [room.roomW * 0.2, room.roomW * 0.5, room.roomW * 0.8]) {
      const flick = Math.sin(T * 60 + lx) > 0.98 ? 0.3 : 1;
      ctx.fillStyle = '#0d0d18'; ctx.fillRect(lx - 34, 3, 68, 9);
      ctx.fillStyle = `rgba(200,230,255,${0.92 * flick})`;
      ctx.shadowColor = '#88BBFF'; ctx.shadowBlur = 16 * flick;
      ctx.fillRect(lx - 30, 5, 60, 5);
      ctx.shadowBlur = 0;
      const cone = ctx.createLinearGradient(0, 12, 0, platEdge);
      cone.addColorStop(0, `rgba(160,200,255,${0.07 * flick})`);
      cone.addColorStop(1, 'rgba(160,200,255,0)');
      ctx.fillStyle = cone;
      ctx.beginPath(); ctx.moveTo(lx - 30, 12); ctx.lineTo(lx + 30, 12);
      ctx.lineTo(lx + 65, platEdge); ctx.lineTo(lx - 65, platEdge); ctx.closePath(); ctx.fill();
    }

    // ── Concrete pillars ───────────────────────────────────────
    for (let pi = 2; pi <= room.W - 3; pi += 5) {
      const pilX = (pi + 0.5) * S;
      ctx.fillStyle = '#161622'; ctx.strokeStyle = '#222230'; ctx.lineWidth = 1;
      ctx.fillRect(pilX - 7, platEdge - 6, 14, room.roomH - platEdge - S);
      ctx.strokeRect(pilX - 7, platEdge - 6, 14, room.roomH - platEdge - S);
      ctx.fillStyle = '#202030'; ctx.fillRect(pilX - 10, platEdge - 8, 20, 5);
      // Blue neon stripe on pillar
      ctx.fillStyle = '#0033AA'; ctx.shadowColor = '#0055FF'; ctx.shadowBlur = 7;
      ctx.fillRect(pilX - 2, platEdge, 4, room.roomH - platEdge - S * 1.2);
      ctx.shadowBlur = 0;
    }

    // ── Overhead METRO sign ────────────────────────────────────
    ctx.fillStyle = '#001800'; ctx.strokeStyle = '#22FF66'; ctx.lineWidth = 1.5;
    ctx.fillRect(room.roomW / 2 - 72, 0, 144, 19);
    ctx.strokeRect(room.roomW / 2 - 72, 0, 144, 19);
    ctx.fillStyle = '#22FF66'; ctx.shadowColor = '#22FF66'; ctx.shadowBlur = 14;
    ctx.font = 'bold 12px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.fillText('◉  METRO  LINE 1  ◉', room.roomW / 2, 14);
    ctx.shadowBlur = 0;

    // EXIT signs on side walls
    for (const sx2 of [24, room.roomW - 24]) {
      ctx.fillStyle = '#001800'; ctx.fillRect(sx2 - 18, platEdge + 6, 36, 14);
      ctx.fillStyle = '#22FF44'; ctx.shadowColor = '#22FF44'; ctx.shadowBlur = 8;
      ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('EXIT ↓', sx2, platEdge + 16);
      ctx.shadowBlur = 0;
    }

    // ── Wave counter top-right ────────────────────────────────
    const aliveCnt = this._indoorBots.filter(b => !b.dead && !b.dying).length;
    ctx.fillStyle = '#44FF88'; ctx.font = 'bold 10px Orbitron, monospace'; ctx.textAlign = 'right';
    ctx.shadowColor = '#22FF44'; ctx.shadowBlur = 8;
    ctx.fillText(`METRO WAVE ${this._metroWave}`, room.roomW - 8, 14);
    if (aliveCnt > 0) {
      ctx.fillStyle = '#FF4444';
      ctx.fillText(`▼ ${aliveCnt} ENEMY`, room.roomW - 8, 27);
    } else if (this._metroWaveTimer !== undefined) {
      ctx.fillStyle = '#FFEE44';
      ctx.fillText(`NEXT WAVE ${Math.ceil(this._metroWaveTimer)}s`, room.roomW - 8, 27);
    } else {
      ctx.fillStyle = '#44FF88'; ctx.fillText('SECTOR CLEAR', room.roomW - 8, 27);
    }
    ctx.shadowBlur = 0;

    // ── Entities ─────────────────────────────────────────────
    for (const d of this.decals)         d.render(ctx);
    for (const p of this._indoorPickups) p.render(ctx);
    for (const p of this.particles)      p.render(ctx);
    for (const b of this._indoorBullets) if (!b.isPlayer) b.render(ctx);
    for (const bot of this._indoorBots)  bot.render(ctx);
    for (const b of this._indoorBullets) if (b.isPlayer)  b.render(ctx);
    if (!this.player.dead) this.player.render(ctx);

    // ── Exit hint ─────────────────────────────────────────────
    ctx.save();
    ctx.font = 'bold 11px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFAA'; ctx.shadowColor = '#FFFF00'; ctx.shadowBlur = 10;
    ctx.fillText('[E] EXIT METRO', room.entryX, room.roomH - 8);
    ctx.restore();

    ctx.restore();
  }

  _renderDealershipIndoor(ctx, W, H, shake) {
    const room = this._indoor;
    const offX = (W - room.roomW) / 2, offY = (H - room.roomH) / 2;
    const S = room.S;
    ctx.fillStyle = '#06060a'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(offX + shake.x, offY + shake.y);
    // Glossy showroom floor (checkerboard)
    for (let ty = 0; ty < room.H; ty++) {
      for (let tx = 0; tx < room.W; tx++) {
        const px = tx * S, py = ty * S, t = room.layout[ty][tx];
        if (t === 1) {
          ctx.fillStyle = '#111120'; ctx.fillRect(px, py, S, S);
        } else {
          ctx.fillStyle = (tx + ty) % 2 === 0 ? '#12121e' : '#0e0e18';
          ctx.fillRect(px, py, S, S);
          ctx.fillStyle = 'rgba(68,238,255,0.018)';
          ctx.fillRect(px, py, S, S);
        }
      }
    }
    // Neon accent stripe
    ctx.fillStyle = 'rgba(68,238,255,0.20)'; ctx.fillRect(0, S, room.roomW, 3);
    ctx.fillStyle = 'rgba(68,238,255,0.08)'; ctx.fillRect(0, S, room.roomW, S * 0.3);
    // Salespersons + bullets + player
    for (const sp of this._salespersons) sp.render(ctx);
    for (const b of this._indoorBullets) b.render(ctx);
    if (!this.player.dead) this.player.render(ctx);
    // [T] hint near salesperson
    if (this._nearSalesperson) {
      const nearSp = this._salespersons.find(sp => Math.hypot(sp.x - this.player.x, sp.y - this.player.y) < 60);
      if (nearSp) {
        ctx.save();
        ctx.font = 'bold 11px Orbitron, monospace'; ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFAA'; ctx.shadowColor = '#FFFF00'; ctx.shadowBlur = 10;
        ctx.fillText('[T] OPEN SHOP', nearSp.x, nearSp.y - 62);
        ctx.restore();
      }
    }
    // [E] EXIT hint
    ctx.save(); ctx.font = 'bold 11px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFAA'; ctx.shadowColor = '#FFFF00'; ctx.shadowBlur = 10;
    ctx.fillText('[E] EXIT', room.entryX, room.roomH - 8);
    ctx.restore(); ctx.restore();
  }

  _renderCasinoIndoor(ctx, W, H, shake) {
    const room = this._indoor;
    const offX = (W - room.roomW) / 2, offY = (H - room.roomH) / 2;
    const S = room.S;
    ctx.fillStyle = '#06030a'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(offX + shake.x, offY + shake.y);
    // Rich casino floor: dark red velvet + gold trim
    for (let ty = 0; ty < room.H; ty++) {
      for (let tx = 0; tx < room.W; tx++) {
        const px = tx * S, py = ty * S, t = room.layout[ty][tx];
        if (t === 1) {
          ctx.fillStyle = '#110008'; ctx.fillRect(px, py, S, S);
        } else if (t === 2) {
          // Casino table
          ctx.fillStyle = '#0a1a08'; ctx.fillRect(px, py, S, S);
          ctx.fillStyle = '#1a3a18'; ctx.fillRect(px + 6, py + 6, S - 12, S - 12);
          ctx.strokeStyle = '#CC9900'; ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 6, py + 6, S - 12, S - 12);
          ctx.fillStyle = '#FFDD00'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
          ctx.fillText('♠', px + S/2, py + S/2 + 3);
        } else {
          ctx.fillStyle = (tx + ty) % 2 === 0 ? '#150010' : '#120008';
          ctx.fillRect(px, py, S, S);
          // Gold border lines
          ctx.fillStyle = 'rgba(204,153,0,0.12)';
          ctx.fillRect(px, py, S, 1); ctx.fillRect(px, py, 1, S);
        }
      }
    }
    // Neon accent
    ctx.fillStyle = 'rgba(255,68,170,0.22)'; ctx.fillRect(0, S, room.roomW, 3);
    ctx.fillStyle = 'rgba(255,68,170,0.07)'; ctx.fillRect(0, S, room.roomW, S * 0.3);
    // Casino hosts + player
    for (const h of this._casinoHosts) h.render(ctx);
    if (!this.player.dead) this.player.render(ctx);
    // [T] hint near host
    if (this._nearCasinoHost) {
      const nearH = this._casinoHosts.find(h => Math.hypot(h.x - this.player.x, h.y - this.player.y) < 65);
      if (nearH) {
        ctx.save();
        ctx.font = 'bold 11px Orbitron, monospace'; ctx.textAlign = 'center';
        ctx.fillStyle = '#FFEEAA'; ctx.shadowColor = '#FF44AA'; ctx.shadowBlur = 12;
        ctx.fillText('[T] OPEN CASINO', nearH.x, nearH.y - 62);
        ctx.restore();
      }
    }
    // [E] EXIT hint
    ctx.save(); ctx.font = 'bold 11px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = '#FFEEAA'; ctx.shadowColor = '#FF44AA'; ctx.shadowBlur = 10;
    ctx.fillText('[E] EXIT', room.entryX, room.roomH - 8);
    ctx.restore(); ctx.restore();
  }

  // ── Render ─────────────────────────────────────────────────
  _render() {
    const ctx = this.ctx;
    const W   = this.canvas.width, H = this.canvas.height;
    const shake = this.hud.getShakeOffset();

    this.canvas.style.cursor = (this.state === 'shop' || this.state === 'blackmarket' || this.state === 'carshop' || this.state === 'casino') ? 'default' : 'none';

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
      this.map.renderMetroEntrance(ctx);
      if (this._districtLayout) {
        const mapPxW = this.map.W * this.map.S;
        const mapPxH = this.map.H * this.map.S;
        const zoneW  = mapPxW / 3;
        for (let i = 0; i < 3; i++) {
          const cfg = CONFIG.DISTRICTS.find(d => d.id === this._districtLayout[i]);
          ctx.fillStyle = cfg.tint;
          ctx.fillRect(i * zoneW, 0, zoneW, mapPxH);
        }
      }
      for (const d   of this.decals)    d.render(ctx);
      for (const p   of this.pickups)   p.render(ctx);
      for (const v   of this.vehicles)  v.render(ctx);
      for (const p   of this.particles) p.render(ctx);
      for (const b   of this.bullets)   if (!b.isPlayer) b.render(ctx);
      for (const bot of this.bots)      bot.render(ctx);
      for (const npc of this._cityNpcs) npc.render(ctx);
      if (this.boss && !this.boss.dead)  this.boss.render(ctx);
      for (const b   of this.bullets)   if (b.isPlayer)  b.render(ctx);
      if (!this.player.dead) this.player.render(ctx);
      for (const bg of this._bodyguards) bg.render(ctx);

      // Drones
      for (const d of this._drones) d.render(ctx);
      if (this._playerDrone) this._playerDrone.render(ctx);

      // Grenades
      for (const g of this._grenades) g.render(ctx);

      // Glitch portals (world-space)
      for (const p of this._glitchPortals) {
        const pulse = Math.sin(p.t * 4) * 0.3 + 0.7;
        ctx.save(); ctx.translate(p.x, p.y);
        ctx.shadowColor = '#AA44FF'; ctx.shadowBlur = 30 * pulse;
        ctx.fillStyle   = `rgba(100,20,200,${pulse * 0.28})`;
        ctx.beginPath(); ctx.ellipse(0, 0, 28, 40, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(170,68,255,${pulse})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 0, 28, 40, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(68,238,255,${pulse * 0.7})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(0, 0, 18, 28, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#CC88FF'; ctx.font = 'bold 8px Orbitron, monospace'; ctx.textAlign = 'center';
        ctx.fillText('PORTAL', 0, -48);
        ctx.shadowBlur = 0; ctx.restore();
      }

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
            const hintText  = door.specialType === 'dealership' ? '[E] CAR SHOP'
                            : door.specialType === 'casino'      ? '[E] CASINO'
                            : '[E] ENTER';
            ctx.fillStyle   = door.specialType === 'dealership' ? '#FFDD44'
                            : door.specialType === 'casino'      ? '#FF44AA'
                            : '#FFFFAA';
            ctx.shadowColor = door.specialType === 'dealership' ? '#FFBB00'
                            : door.specialType === 'casino'      ? '#FF0088'
                            : '#FFFF00';
            ctx.shadowBlur  = 10;
            ctx.fillText(hintText, door.wx, door.wy - 16);
            ctx.restore();
          }
        }
        // Metro entrance hint
        if (this.map.metroEntrance) {
          const me = this.map.metroEntrance;
          if (Math.hypot(me.wx - this.player.x, me.wy - this.player.y) < 70) {
            ctx.save();
            ctx.font = 'bold 11px Orbitron, monospace'; ctx.textAlign = 'center';
            ctx.fillStyle = '#44FF88'; ctx.shadowColor = '#22FF66'; ctx.shadowBlur = 14;
            ctx.fillText('[E] METRO', me.wx, me.wy - 40);
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
      if (this._globalEvent.id === 'glitch_mode') {
        ctx.save();
        // Purple scanlines
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = '#AA44FF';
        for (let yl = 0; yl < H; yl += 3) ctx.fillRect(0, yl, W, 1);
        // Glitch strips
        if (Math.random() < 0.35) {
          const gy = Math.random() * H, gh = 2 + Math.random() * 10;
          ctx.globalAlpha = 0.22; ctx.fillStyle = Math.random() < 0.5 ? '#AA00FF' : '#00FFAA';
          ctx.fillRect(0, gy, W, gh);
          ctx.globalAlpha = 0.14; ctx.fillStyle = '#FF00AA';
          ctx.fillRect(rnd(-30, 30), gy, W, gh);
        }
        // Pixel corruption bursts
        if (Math.random() < 0.18) {
          ctx.globalAlpha = 0.5;
          for (let i = 0; i < 6; i++) {
            ctx.fillStyle = Math.random() < 0.5 ? '#AA44FF' : '#44FFCC';
            ctx.fillRect(Math.random() * W, Math.random() * H, rnd(2, 24), rnd(1, 4));
          }
        }
        // Vignette tint
        ctx.globalAlpha = 0.12; ctx.fillStyle = '#5500AA';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    // Weather (screen-space, drawn over world)
    this.weather.render(ctx, W, H);

    // HUD
    const playing = this.state !== 'gameover';
    if (playing) {
      this.hud.renderMinimap(this.map, this.player, this.bots, this.camX, this.camY, this.boss, this._districtLayout);
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
      } else if (!this._lifeMode) {
        this.hud.renderWave(this.wave, this.bots.length, !!(this.boss && !this.boss.dead));
      }
      if (this._wantedLevel > 0 && !this._zombieMode) {
        this.hud.renderWantedLevel(this._wantedLevel, this._wantedDecay);
      }
      this.hud.renderWeaponInfo(this.player);
      if (this._grenadeCount > 0) this.hud.renderGrenadeCount(this._grenadeCount);
      if (!this._arenaMode && !this._zombieMode && !this._lifeMode) this.hud.renderShopButton(this.state === 'shop');
      this.hud.renderAchButton(this._achPanelOpen);
      if (!this._zombieMode && !this._lifeMode) this.hud.renderDayNight(this._nightAlpha, this._gameTime);
      if (this._globalEvent) this.hud.renderEventBanner(ctx, W, H, this._globalEvent, this._eventAnnounceTimer);
      if (this._playerDrone) this.hud.renderDroneStatus(this._playerDrone, this._droneControl);
      this.hud.renderDamageNumbers();
      if (this._districtLayout && this._currentDistrict) {
        this.hud.renderDistrictHUD(this._districtLayout, this._reputation, this._currentDistrict, this._shopDiscount);
        if (this._districtTimer > 0) this.hud.renderDistrictEntry(this._currentDistrict, this._districtTimer);
      }
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
      this.shop._guardCount = this._bodyguards.length;
      this.shop.render(ctx, W, H, this.player, this.money, this.input.mouseScreen.x, this.input.mouseScreen.y);
      if (this.input.mouseJustDown) {
        this.shop.handleClick(this.input.mouseScreen.x, this.input.mouseScreen.y, this.player, this);
        if (!this.shop.isOpen) this.state = 'playing';
      }
    }

    // Car dealership overlay
    if (this.state === 'carshop') {
      this._dealership.render(ctx, W, H, this.player, this.money, this._grenadeCount,
                              this.input.mouseScreen.x, this.input.mouseScreen.y);
      if (this.input.mouseJustDown) {
        this._dealership.handleClick(this.input.mouseScreen.x, this.input.mouseScreen.y, this.player, this);
        if (!this._dealership.isOpen) this.state = 'playing';
      }
    }

    // Casino overlay
    if (this.state === 'casino') {
      this._casino.render(ctx, W, H, this.player, this.money,
                          this.input.mouseScreen.x, this.input.mouseScreen.y);
      if (this.input.mouseJustDown) {
        this._casino.handleClick(this.input.mouseScreen.x, this.input.mouseScreen.y, this.player, this);
        if (!this._casino.isOpen) this.state = 'playing';
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
