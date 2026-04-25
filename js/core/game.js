"use strict";

/**
 * @file game.js
 * Main Game class — owns the update/render loop and all game state.
 *
 * State machine (this.state):
 *   'playing'   — normal gameplay
 *   'paused'    — game paused (P key)
 *   'shop'      — B key shop overlay open
 *   'carshop'   — dealership overlay open (T near salesperson)
 *   'casino'    — casino overlay open
 *   'gameover'  — player dead
 *   'waveclear' — brief pause between waves
 *
 * Key subsystems:
 *   GameMap (this.map)             — tile world, collision, doors, portals
 *   Player (this.player)           — player entity
 *   Bot[] (this.bots)              — active enemy bots
 *   BossBot (this.boss)            — wave boss (every 5 waves)
 *   Bullet[] (this.bullets)        — player bullets
 *   Bullet[] (this._botBullets)    — enemy bullets
 *   Grenade[] (this._grenades)     — live grenades
 *   Vehicle[] (this.vehicles)      — all vehicles on map
 *   Particle[] (this.particles)    — visual effects
 *   Decal[] (this.decals)          — persistent floor marks
 *   HUD (this.hud)                 — screen-space overlay
 *   InputManager (this.input)      — keyboard/mouse/touch
 *   ShopManager (this._shop)       — B key shop
 *   DealershipManager (this._dealership) — T key car shop
 *   CasinoManager (this._casino)   — casino overlay
 *   Weather (this.weather)         — ambient particle weather
 *   AnimalCompanion (this.companion) — character companion
 *
 * Indoor system:
 *   this._indoor — set when player is inside a building
 *   this._indoor.isDealership — true for car dealership rooms (no enemy bots)
 *   this._indoorBots / this._indoorBullets — indoor-specific arrays
 *
 * Special map modes (boolean flags):
 *   this._arenaMode   — arena map (wave survival, no shop)
 *   this._zombieMode  — zombie map
 *   this._campaignMode — 100-level campaign
 *   this._blitzMode   — 3× speed, no shop
 *   this._hardcoreMode — modifier flag (2× enemy dmg, 3× money)
 */
class Game {
  constructor(charData, mapData) {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this._resize();
    window.addEventListener("resize", () => this._resize());

    this.charData = charData;
    this.input = new InputManager(this.canvas);
    this.map = new GameMap(mapData);
    this.hud = new HUD(this.canvas);
    this.shop = new ShopManager();

    // Spawn player at map center road tile
    const RE = this.map.ROAD_EVERY;
    const cx = Math.floor(this.map.W / 2 / RE) * RE;
    const cy = Math.floor(this.map.H / 2 / RE) * RE;
    const spawnX = (cx + 0.5) * this.map.S;
    const spawnY = (cy + 0.5) * this.map.S;
    this.player = new Player(charData, spawnX, spawnY);

    /* ── Apply shop-purchased weapons & upgrades from inventory ── */
    try {
      const _ncInv = JSON.parse(localStorage.getItem("nc_inventory") || "{}");

      /* Add all owned weapons so player can cycle through them */
      (_ncInv.weapons || []).forEach((w) => {
        const wid = typeof w === "string" ? w : w.id;
        if (wid && CONFIG.WEAPONS.find((cfg) => cfg.id === wid)) {
          this.player.ownedWeapons.add(wid);
        }
      });

      /* Equip the player's chosen starting weapon (set in inventory.html) */
      const _equippedWep = localStorage.getItem("equippedWeapon");
      if (_equippedWep && this.player.ownedWeapons.has(_equippedWep)) {
        this.player.equipWeapon(_equippedWep);
      }

      /* Apply permanent upgrades purchased from the shop */
      const _upgradeMap = {};
      (_ncInv.upgrades || []).forEach((u) => {
        const uid = typeof u === "string" ? u : u.id;
        if (uid) _upgradeMap[uid] = (_upgradeMap[uid] || 0) + 1;
      });
      Object.entries(_upgradeMap).forEach(([uid, levels]) => {
        for (let i = 0; i < levels; i++) this.player.applyUpgrade(uid);
      });
    } catch (_e) {
      /* malformed localStorage — skip silently */
    }

    this.bots = [];
    this.bullets = [];
    this.particles = [];
    this.vehicles = [];
    this.pickups = [];
    this.decals = [];

    this.money = 0;
    this.kills = 0;
    this.wave = 1;
    this.spawnTimer = 2000;
    this.waveTimer = 30000;

    // Vehicle
    this._playerVehicle = null;

    // Killstreak
    this._killStreak = 0;
    this._streakTimer = 0;
    this._streakPopup = { text: "", timer: 0, mult: 1 };

    // ── Achievements ───────────────────────────────────────
    const _savedStats = JSON.parse(localStorage.getItem("achStats") || "{}");
    const _savedUnlocked = JSON.parse(
      localStorage.getItem("unlockedAch") || "[]",
    );
    const _statKeys = [
      "kills",
      "carsStolen",
      "moneyEarned",
      "knifeKills",
      "bossesKilled",
      "buildingsEntered",
      "buildingsCleared",
      "maxWanted",
      "maxStreak",
      "maxWave",
    ];
    this._achStats = {};
    _statKeys.forEach((k) => {
      this._achStats[k] = _savedStats[k] || 0;
    });
    this._unlockedAch = new Set(_savedUnlocked);
    this._achPopup = null; // { name, icon, timer }
    this._achPanelOpen = false;

    // ── Building interiors ─────────────────────────────────
    this._indoor = null; // room object or null (outdoors)
    this._indoorBots = [];
    this._indoorBullets = [];
    this._indoorPickups = [];
    this._visitedRooms = new Set(); // "tx,ty" keys of cleared rooms

    // Wanted / Police
    this._wantedLevel = 0;
    this._wantedKills = 0;
    this._wantedDecay = 0; // seconds since last kill (decay after 10s)
    this._policeTimer = 0;
    this._policeSirenTimer = 0; // throttle siren sound
    this._sirenPlaying = false;
    this._desertMode = !!this.map.config.desert;
    this._robotMode = !!this.map.config.robot;
    this._jungleMode = !!this.map.config.jungle;
    this._galacticaMode = !!this.map.config.galactica;
    this._skyMode = !!this.map.config.sky;
    this._towerMode = !!this.map.config.tower;
    this._dinoMode = !!this.map.config.dino;

    // Weather
    this.weather = new Weather(this.map.config.weather || "clear");

    // Mobile detection
    this._isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    // Arena mode
    this._arenaMode = !!this.map.config.arena;
    this._arenaSpawned = 0;
    this._arenaKilled = 0;
    this._arenaWaveSize = 0;
    this._arenaCountdown = 0;

    // Boss tracking
    this.boss = null;
    this.bossRespawnTimer = 0;
    this._bossActivated = false;

    // ── Drones ─────────────────────────────────────────────
    this._drones = [];
    this._playerDrone = null;
    this._droneControl = false;
    this._droneTimer = 8000; // initial delay before first police drone

    // ── Day/Night + Black Market ────────────────────────────
    this._gameTime = 0;
    this._isNight = false;
    this._nightAlpha = 0;
    this._bmVendor = null;
    this._bmOpen = false;
    this._bmBought = new Set();
    this._reflexTimer = 0;
    this._nanoshieldTimer = 0;

    // ── Zombie Mode ──────────────────────────────────────────
    this._zombieMode = !!this.map.config.zombie;
    this._zombieWaveSize = 0;
    this._zombieSpawned = 0;
    this._zombieTimer = 500;
    this._zombieCountdown = 0;

    // ── Global Events ────────────────────────────────────────
    this._globalEvent = null;
    this._eventTimer = rnd(90, 120);
    this._eventAnnounceTimer = 0;
    this._eventWave = new Set();
    this._cyberDebuffActive = false;
    this._corpTimer = 0;

    // ── Districts & Reputation ─────────────────────────────────
    this._districtLayout = this._buildDistrictLayout(); // null for arena/zombie
    this._currentDistrict = null;
    this._districtTimer = 0; // entry notification countdown (3s)
    this._reputation = { dangerous: 0, rich: 0, industrial: 0 };
    this._repRestoreTimers = { dangerous: 0, rich: 0, industrial: 0 };
    this._dangerSpawnTimer = 10;
    this._shopDiscount = 0;

    // ── Car Dealership ────────────────────────────────────────
    this._salespersons = [];
    this._nearSalesperson = false;
    this._dealership = new DealershipManager();
    // ── Casino ────────────────────────────────────────────────
    this._casino = new CasinoManager();
    this._casinoHosts = [];
    this._nearCasinoHost = false;
    // ── Police Station ─────────────────────────────────────────
    this._policeOfficers = [];
    // ── Tech Shop (Wasteland) ─────────────────────────────────
    this._techShopCustomers = [];
    // ── Cryo Lab (Frozen Tundra) ─────────────────────────────
    this._cryoLabVendor = null;
    this._cryoLabCustomers = [];
    // ── Radio Station (Wasteland) ─────────────────────────────
    this._radioWorkers = [];
    // ── Building NPC Shop ─────────────────────────────────────
    this._buildingNpcs = [];
    this._nearBuildingNpc = false;
    this._buildingShop = new BuildingShopManager();
    // ── Grenades ──────────────────────────────────────────────
    this._grenades = [];
    this._grenadeCount = 0;
    // ── Metro ─────────────────────────────────────────────────
    this._metroWave = 0;
    this._metroWaveTimer = undefined;
    // ── Big Map & Waypoint ────────────────────────────────────
    this._waypointDoor = null;
    this._buildingEntryCooldown = 0; // prevents auto-exit/re-entry right after entering
    // ── Glitch Mode ───────────────────────────────────────────
    this._glitchPortals = [];
    this._glitchPortalTimer = 0;
    // ── Bodyguards ────────────────────────────────────────────
    this._bodyguards = [];
    // ── Life Mode ─────────────────────────────────────────────
    this._lifeMode = !!this.map.config.lifeMode;
    this._metropolisMode = !!this.map.config.metropolis;
    this._cityNpcs = [];
    // ── Special Modes ─────────────────────────────────────────
    this._hardcoreMode = !!this.map.config.hardcore;
    this._blitzMode = !!this.map.config.blitz;
    // ── Tower Mode ────────────────────────────────────────────
    this._towerFloor = 1;
    this._towerElevatorActive = false;
    this._towerTransitionAlpha = 0; // 0=clear, 1=black
    this._towerTransitionState = 0; // 0=idle, 1=fading-out, 2=fading-in
    this._towerVictory = false;
    this._towerVictoryBtn = null; // OK button bounds for victory screen
    // ── Campaign Mode ─────────────────────────────────────────
    this._campaignMode = !!this.map.config.campaign;
    this._campaignLevel = 1;
    this._campaignTarget = 0; // kills needed this level
    this._campaignKills = 0; // kills this level
    this._levelComplete = false;
    this._levelCompleteT = 0;
    // ── Player identity + survival timer ──────────────────────
    this._playerName = (
      localStorage.getItem("playerName") || "ANONYMOUS"
    ).toUpperCase();
    this._surviveTime = 0;
    this.player._displayName = this._playerName;
    // ── Session tracking (for backend save) ───────────────────
    this._grenadesThrown = 0;
    this._weaponsUsed = new Set([
      this.charData.starterWeapon || this.player.equippedWeaponId || "pistol",
    ]);
    this._vehiclesUsed = new Set();
    this._sessionSaved = false;
    // ── Ambient Traffic (disabled) ────────────────────────────
    this._ambientCars = [];
    this._ambientSpawnT = 0;
    // ── Teleport Portals ───────────────────────────────────────
    this._portals = this.map.portals || [];
    this._portalCooldown = 0; // prevents instant re-teleport

    // Camera
    this.camX = spawnX - this.canvas.width / 2;
    this.camY = spawnY - this.canvas.height / 2;

    // ── Multiplayer ───────────────────────────────────────────
    this._roomId  = window._mpRoomId || null;
    this._isHost  = window._mpIsHost || false;
    this._mpTimer = 0;
    this._remotePlayers = (typeof Multiplayer !== 'undefined') ? Multiplayer.getRemotePlayers() : new Map();
    if (this._roomId && typeof Multiplayer !== 'undefined') {
      Multiplayer.bindGameEvents();
    }

    this.state = "playing";

    this._lastTime = null;
    this._raf = null;

    // Scroll-wheel weapon cycle
    this._wheelHandler = (e) => {
      if (this.state === "playing") {
        e.preventDefault();
        this.player.cycleWeapon(e.deltaY > 0 ? 1 : -1);
      } else if (this.state === "shop") {
        e.preventDefault();
        this.shop.handleScroll(e.deltaY);
      } else if (this.state === "carshop") {
        e.preventDefault();
        this._dealership.handleScroll(e.deltaY);
      }
    };
    this.canvas.addEventListener("wheel", this._wheelHandler, {
      passive: false,
    });

    // Keyboard
    this._keyHandler = (e) => this._onKey(e);
    window.addEventListener("keydown", this._keyHandler);

    // ── Blitz mode: 3× speed for player ──────────────────────
    if (this._blitzMode) {
      this.player.speed = Math.round(this.player.speed * 3);
      this.spawnTimer = 800; // faster initial spawn
    }

    if (!this._towerMode) this._spawnVehicles();
    if (this._arenaMode) this._startArenaWave();
    if (this._zombieMode) this._startZombieWave();
    if (this._towerMode) {
      this._startTowerFloor();
    }
    if (this._lifeMode || this._metropolisMode) this._spawnCityNpcs();
    if (this._campaignMode) this._startCampaignLevel();
    this._spawnAmbientTraffic();

    requestAnimationFrame((t) => this._loop(t));
  }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  _onKey(e) {
    if (e.code === "KeyE" && this.state === "playing") {
      this._tryEnterExit();
      return;
    }
    if (e.code === "Tab") {
      e.preventDefault();
      if (this.state === "playing" || this.state === "paused") {
        this._achPanelOpen = !this._achPanelOpen;
      }
      return;
    }
    if (e.code === "KeyV" && this.state === "playing") {
      this._togglePlayerDrone();
      return;
    }
    if (e.code === "KeyN") {
      // Close big map
      if (this.state === "bigmap") {
        this.state = "playing";
        return;
      }
      // Black market (near vendor at night)
      if (this.state === "playing" || this.state === "blackmarket") {
        if (this._bmOpen) {
          this._bmOpen = false;
          this.state = "playing";
          return;
        }
        if (this._bmVendor && !this._arenaMode) {
          if (
            Math.hypot(
              this._bmVendor.x - this.player.x,
              this._bmVendor.y - this.player.y,
            ) < 70
          ) {
            this._bmOpen = true;
            this.state = "blackmarket";
            return;
          }
        }
      }
      // Open big map (outdoor, not in combat menus)
      if (this.state === "playing" && !this._indoor) {
        this.state = "bigmap";
      }
      return;
    }
    if (e.code === "KeyF" && this.state === "playing") {
      this._toggleVehicle();
      return;
    }
    if (e.code === "KeyB") {
      if (this._arenaMode || this._zombieMode || this._blitzMode) return;
      if (this.state === "playing") {
        this.shop.open();
        this.state = "shop";
      } else if (this.state === "shop") {
        this.shop.close();
        this.state = "playing";
      } else if (this.state === "paused") {
        this.shop.open();
        this.state = "shop";
      }
      return;
    }
    if (e.code === "KeyT") {
      if (this._indoor?.isDealership && this._nearSalesperson) {
        if (this.state === "playing") {
          this._dealership.open();
          this.state = "carshop";
        } else if (this.state === "carshop") {
          this._dealership.close();
          this.state = "playing";
        }
      } else if (this._indoor?.isCasino && this._nearCasinoHost) {
        if (this.state === "playing") {
          this._casino.open();
          this.state = "casino";
        } else if (this.state === "casino") {
          this._casino.close();
          this.state = "playing";
        }
      } else if (
        this._indoor &&
        !this._indoor.isDealership &&
        !this._indoor.isCasino &&
        !this._indoor.isMetro &&
        this._nearBuildingNpc
      ) {
        if (this.state === "playing") {
          this._buildingShop.open(this._indoor._buildingType ?? 0);
          this.state = "buildingshop";
        } else if (this.state === "buildingshop") {
          this._buildingShop.close();
          this.state = "playing";
        }
      }
      return;
    }
    if (
      e.code === "KeyG" &&
      this.state === "playing" &&
      !this._indoor &&
      this._grenadeCount > 0
    ) {
      this._grenades.push(
        new Grenade(
          this.player.x,
          this.player.y,
          this.input.mouseWorld.x,
          this.input.mouseWorld.y,
        ),
      );
      this._grenadeCount--;
      this._grenadesThrown++;
      window.audio?.grenadeThrow();
      return;
    }
    if (e.code === "KeyP") {
      if (this.state === "playing") this.state = "paused";
      else if (this.state === "paused") this.state = "playing";
      else if (this.state === "carshop") {
        this._dealership.close();
        this.state = "playing";
      } else if (this.state === "casino") {
        this._casino.close();
        this.state = "playing";
      }
      return;
    }
    if (e.code === "Escape") {
      if (this.state === "bigmap") {
        this.state = "playing";
        return;
      }
      if (this.state === "blackmarket") {
        this._bmOpen = false;
        this.state = "playing";
        return;
      }
      if (this.state === "shop") {
        this.shop.close();
        this.state = "playing";
        return;
      }
      if (this.state === "carshop") {
        this._dealership.close();
        this.state = "playing";
        return;
      }
      if (this.state === "casino") {
        this._casino.close();
        this.state = "playing";
        return;
      }
      if (this.state === "buildingshop") {
        this._buildingShop.close();
        this.state = "playing";
        return;
      }
      // ESC while inside a building — exit it
      if (this._indoor) {
        this._tryEnterExit();
        return;
      }
      if (this.state === "paused") {
        this.state = "playing";
        return;
      } // ESC = resume
      if (this.state === "playing") {
        this.state = "paused";
        return;
      }
      if (this.state === "gameover") {
        this._destroy();
        window.location.href = "index.html";
        return;
      }
    }
    if (e.code === "KeyM") {
      if (this.state === "paused" || this.state === "gameover") {
        this._destroy();
        window.location.href = "index.html";
        return;
      }
    }
    if (e.code === "KeyR" && this.state === "gameover") {
      this._destroy();
      window.startGame(this.charData, this.map.config);
      return;
    }
    if (this.state === "playing") {
      const slot = parseInt(e.key);
      if (slot >= 1 && slot <= 6) {
        this.player.equipBySlot(slot);
        return;
      }
    }
    if (["Space", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
  }

  _destroy() {
    this._destroyed = true;
    window.removeEventListener("keydown", this._keyHandler);
    this.canvas.removeEventListener("wheel", this._wheelHandler);
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  // ── Game loop ──────────────────────────────────────────────
  _loop(timestamp) {
    if (this._destroyed) return; // Stop if game was destroyed
    if (this._lastTime === null) this._lastTime = timestamp;
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05);
    this._lastTime = timestamp;

    try {
      if (this.state === "playing" || this.state === "blackmarket")
        this._update(dt);
      if (this.state === "shop" || this.state === "paused")
        this.shop.update(dt);
      if (this.state === "carshop") this._dealership.update(dt);
      if (this.state === "casino") {
        this._casino.update(dt);
        if (this._casino._pendingPayout !== null) {
          this.money += this._casino._pendingPayout;
          this._casino._msg(
            this._casino._pendingPayout > 0
              ? `JACKPOT! +⬢${this._casino._pendingPayout.toLocaleString()}`
              : "BETTER LUCK NEXT TIME!",
            this._casino._pendingPayout > 0 ? "#00FFCC" : "#FF4466",
          );
          this._casino._pendingPayout = null;
        }
      }
    } catch (e) {
      console.error("update error:", e);
    }

    try {
      this._render();
    } catch (e) {
      console.error("render error:", e);
    }
    if (this._destroyed) return; // Don't continue if destroyed during render
    this.input.flush();
    this._raf = requestAnimationFrame((t) => this._loop(t));
  }

  // ── Update ─────────────────────────────────────────────────
  _update(dt) {
    // ── Multiplayer: send position + interpolate remote players ─
    if (this._roomId && typeof Multiplayer !== 'undefined') {
      this._mpTimer += dt;
      if (this._mpTimer >= 0.05) {  // 20 updates/sec
        this._mpTimer = 0;
        Multiplayer.sendPos(this.player);
      }
      Multiplayer.updateRemotePlayers(dt);
    }

    // Survival timer
    this._surviveTime += dt;
    // Track current weapon for session save
    if (this.player.equippedWeaponId)
      this._weaponsUsed.add(this.player.equippedWeaponId);
    // Achievement popup decay
    if (this._achPopup) {
      this._achPopup.timer -= dt;
      if (this._achPopup.timer <= 0) this._achPopup = null;
    }

    // ── Day/Night cycle ──────────────────────────────────────
    if (!this._arenaMode && !this._zombieMode && !this._lifeMode) {
      this._gameTime += dt;
      const cycle = 120,
        nightStart = 80;
      const t = this._gameTime % cycle;
      const targetNight = t > nightStart;
      this._nightAlpha = lerp(
        this._nightAlpha,
        targetNight ? 0.55 : 0,
        dt * 1.5,
      );
      if (targetNight && !this._isNight) {
        this._isNight = true;
        const pos = this.map.randomRoadPos();
        this._bmVendor = { x: pos.x, y: pos.y };
      } else if (!targetNight && this._isNight) {
        this._isNight = false;
        this._bmVendor = null;
        if (this._bmOpen) {
          this._bmOpen = false;
          this.state = "playing";
        }
      }

      // ── Global Events (disabled in tower mode) ─────────────────
      if (!this._towerMode) {
        this._eventTimer -= dt;
        if (this._eventTimer <= 0) {
          this._triggerEvent(false);
          this._eventTimer = rnd(90, 120);
        }
      }
      if (this._eventAnnounceTimer > 0) this._eventAnnounceTimer -= dt;
      if (this._globalEvent) {
        this._globalEvent.timer -= dt;
        if (this._globalEvent.timer <= 0) {
          this._endEvent();
        } else {
          // Riot: rapid police spawns
          if (this._globalEvent.id === "riot") {
            this._policeTimer -= dt * 1000;
            if (this._policeTimer <= 0) {
              this._spawnPolice();
              this._policeTimer = 1200;
            }
          }
          // Corporate: extra heavyswat soldiers
          if (this._globalEvent.id === "corporate") {
            this._corpTimer -= dt * 1000;
            if (this._corpTimer <= 0) {
              const rp = this.map.randomRoadPos();
              this.bots.push(
                new Bot(rp.x, rp.y, this.wave, "heavyswat", this.map.config),
              );
              this._corpTimer = 2200;
            }
          }
          // Glitch Mode: update portals, spawn buffed bots from them
          if (this._globalEvent.id === "glitch_mode" && !this._indoor) {
            for (const p of this._glitchPortals) {
              p.t += dt;
              p.spawnTimer -= dt;
              if (p.spawnTimer <= 0) {
                p.spawnTimer = 7 + Math.random() * 5;
                const bot = new Bot(
                  p.x + rnd(-20, 20),
                  p.y + rnd(-20, 20),
                  this.wave + 1,
                  "normal",
                  this.map.config,
                );
                bot.speed *= 1.4;
                bot.hp *= 1.3;
                bot.maxHp = bot.hp;
                this.bots.push(bot);
              }
            }
          }
        }
      }

      // ── District detection & effects ──────────────────────────
      if (this._districtLayout && !this._indoor) {
        const mapPxW = this.map.W * this.map.S;
        const zoneIdx = Math.min(2, Math.floor(this.player.x / (mapPxW / 3)));
        const distId = this._districtLayout[zoneIdx];
        const distCfg = CONFIG.DISTRICTS.find((d) => d.id === distId);

        if (!this._currentDistrict || this._currentDistrict.id !== distId) {
          this._currentDistrict = distCfg;
          this._districtTimer = 3.0;
        }
        if (this._districtTimer > 0) this._districtTimer -= dt;

        const rep = this._reputation[distId];

        // Passive recovery: +1 per 12s without a kill here
        this._repRestoreTimers[distId] += dt;
        if (this._repRestoreTimers[distId] >= 12) {
          this._repRestoreTimers[distId] = 0;
          this._reputation[distId] = Math.min(
            100,
            this._reputation[distId] + 1,
          );
        }

        // DANGEROUS low rep → extra gang bots every 10s
        if (distId === "dangerous" && rep <= -50) {
          this._dangerSpawnTimer -= dt;
          if (this._dangerSpawnTimer <= 0) {
            this._dangerSpawnTimer = 10;
            const rp = this.map.randomRoadPos();
            this.bots.push(
              new Bot(
                rp.x,
                rp.y,
                this.wave,
                Math.random() < 0.6 ? "normal" : "mini",
                this.map.config,
              ),
            );
          }
        }

        // RICH high rep → shop discount
        this._shopDiscount = distId === "rich" && rep >= 50 ? 0.15 : 0;
      }
    }

    // ── Implant timers ───────────────────────────────────────
    if (this._reflexTimer > 0) {
      this._reflexTimer -= dt;
      if (this._reflexTimer <= 0) {
        this.player.speed /= 2;
        this.player.fireRateMult *= 2;
      }
    }
    if (this._nanoshieldTimer > 0) {
      this._nanoshieldTimer -= dt;
      if (this._nanoshieldTimer <= 0) this.player.invincible = 0;
    }

    // ── Drone updates ────────────────────────────────────────
    for (const d of this._drones)
      d.update(dt, this.player, this.map, this.bullets, this.particles);
    this._drones = this._drones.filter((d) => !d.dead);

    if (this._playerDrone) {
      if (this._playerDrone.dead) {
        this._playerDrone = null;
        this._droneControl = false;
      } else if (this._droneControl) {
        const ds = this._playerDrone.speed * dt;
        if (this.input.isDown("KeyW")) this._playerDrone.y -= ds;
        if (this.input.isDown("KeyS")) this._playerDrone.y += ds;
        if (this.input.isDown("KeyA")) this._playerDrone.x -= ds;
        if (this.input.isDown("KeyD")) this._playerDrone.x += ds;
        this._playerDrone.angle = Math.atan2(
          this.input.mouseWorld.y - this._playerDrone.y,
          this.input.mouseWorld.x - this._playerDrone.x,
        );
        if (
          Math.hypot(
            this._playerDrone.x - this.player.x,
            this._playerDrone.y - this.player.y,
          ) > 600
        )
          this._togglePlayerDrone();
      }
      if (this._playerDrone) {
        this._playerDrone._altTimer += dt * 2.6;
        this._playerDrone._altitude = Math.sin(this._playerDrone._altTimer) * 5;
      }
    }

    // ── Police drone spawning ────────────────────────────────
    if (
      this._wantedLevel >= 3 &&
      !this._arenaMode &&
      !this._zombieMode &&
      !this._lifeMode &&
      !this._indoor
    ) {
      this._droneTimer -= dt * 1000;
      if (
        this._droneTimer <= 0 &&
        this._drones.filter((d) => d.type === "police").length <
          this._wantedLevel - 1
      ) {
        const pos = this.map.randomRoadPos();
        this._drones.push(new Drone(pos.x, pos.y, "police"));
        this._droneTimer = 15000;
      }
    }
    // Combat drones in wave 6+
    if (
      !this._arenaMode &&
      !this._zombieMode &&
      !this._lifeMode &&
      this.wave >= 6 &&
      this._drones.filter((d) => d.type === "combat").length <
        Math.floor((this.wave - 5) / 2)
    ) {
      const pos = this.map.randomRoadPos();
      this._drones.push(new Drone(pos.x, pos.y, "combat"));
    }

    // Track max wave
    if (this.wave > this._achStats.maxWave) {
      this._achStats.maxWave = this.wave;
      this._checkAchievements();
    }

    // Indoor mode — use separate update path
    if (this._indoor) {
      this._updateIndoor(dt);
      return;
    }

    this.input.updateMouseWorld(this.camX, this.camY);

    // Sync vehicle state before player update (also freeze player while controlling drone)
    this.player.inVehicle = !!this._playerVehicle || this._droneControl;
    const _bulletsBefore = this.bullets.length;
    this.player.update(dt, this.input, this.map, this.bullets, this.particles);
    // Broadcast newly spawned player bullets to remote players
    if (this._roomId && typeof Multiplayer !== 'undefined' && this.bullets.length > _bulletsBefore) {
      const newBullet = this.bullets[this.bullets.length - 1];
      if (newBullet && newBullet.isPlayer) {
        Multiplayer.sendShoot(newBullet, this.player.equippedWeaponId);
      }
    }
    if (
      this.player.dead &&
      (this.state === "playing" || this.state === "blackmarket")
    ) {
      this.state = "gameover";
      if (this._roomId && typeof Multiplayer !== 'undefined') {
        Multiplayer.sendDead();
      }
    }

    // ── Vehicles ───────────────────────────────────────────
    for (const v of this.vehicles) {
      if (v.dead) continue;
      v.update(
        dt,
        this._playerVehicle === v ? this.player : null,
        this.input,
        this.map,
      );
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
    this.vehicles = this.vehicles.filter((v) => !v.dead);

    // ── Pickups ────────────────────────────────────────────
    for (const p of this.pickups) p.update(dt);
    if (!this.player.dead) {
      for (const p of this.pickups) {
        if (p.dead) continue;
        if (
          circlesOverlap(
            p.x,
            p.y,
            p.radius,
            this.player.x,
            this.player.y,
            this.player.radius + 10,
          )
        ) {
          const bonus = p.applyTo(this.player);
          if (bonus > 0) this.money += bonus;
          p.dead = true;
          window.audio?.pickup();
        }
      }
    }
    this.pickups = this.pickups.filter((p) => !p.dead);

    // ── Killstreak timer ───────────────────────────────────
    if (this._streakTimer > 0) {
      this._streakTimer -= dt;
      if (this._streakTimer <= 0) this._killStreak = 0;
    }
    if (this._streakPopup.timer > 0) this._streakPopup.timer -= dt;

    // ── Decals ─────────────────────────────────────────────
    for (const d of this.decals) d.update(dt);
    this.decals = this.decals.filter((d) => !d.dead);

    // ── Bodyguards ─────────────────────────────────────────
    for (const bg of this._bodyguards) {
      bg.update(
        dt,
        this.player.x,
        this.player.y,
        this.bots,
        this.bullets,
        this.particles,
        this.player.hp,
        this.player.maxHp,
      );
    }
    this._bodyguards = this._bodyguards.filter((bg) => !bg.dead);

    // ── Weather ────────────────────────────────────────────
    this.weather.update(dt, this.canvas.width, this.canvas.height);

    // ── Animal companion ───────────────────────────────────
    if (this.player.companion && !this.player.companion.dead && !this._indoor) {
      this.player.companion.update(
        dt,
        this.player,
        this.bots,
        this.bullets,
        this.particles,
      );
    }

    // ── Ambient traffic ────────────────────────────────────
    // Ambient traffic removed — AmbientCar class kept but not spawned/updated

    // ── Map portals cooldown & teleport check ──────────────
    if (this._portalCooldown > 0) this._portalCooldown -= dt;
    if (
      !this._indoor &&
      this._portalCooldown <= 0 &&
      this._portals.length >= 2
    ) {
      for (let i = 0; i < this._portals.length; i++) {
        const portal = this._portals[i];
        portal._animT += dt;
        if (
          Math.hypot(portal.x - this.player.x, portal.y - this.player.y) < 32
        ) {
          const dest = this._portals[portal.paired];
          this.player.x = dest.x;
          this.player.y = dest.y;
          this._portalCooldown = 1.8;
          for (let j = 0; j < 20; j++) {
            const a = Math.random() * Math.PI * 2,
              s = rnd(80, 220);
            this.particles.push(
              new Particle(
                dest.x,
                dest.y,
                Math.cos(a) * s,
                Math.sin(a) * s,
                "#AA44FF",
                rnd(3, 7),
                0.8,
              ),
            );
          }
          this.hud.shake(6);
          break;
        }
      }
    } else if (!this._indoor) {
      for (const portal of this._portals) portal._animT += dt;
    }

    // ── Door animation + auto walk-through entry ───────────
    if (this._buildingEntryCooldown > 0) this._buildingEntryCooldown -= dt;
    if (!this._indoor && !this._playerVehicle) {
      this.map.updateDoors(this.player.x, this.player.y, dt);
      if (this._buildingEntryCooldown <= 0) {
        for (const door of this.map.doors) {
          if (door._openAmt >= 0.85) {
            const dist = Math.hypot(
              door.wx - this.player.x,
              door.wy - this.player.y,
            );
            if (dist < 30) {
              this._tryEnterExit();
              if (this._indoor) return; // stop outdoor update immediately after entering
              break;
            }
          }
        }
      }
    }

    // ── Campaign level complete countdown ──────────────────
    if (this._campaignMode && this._levelComplete) {
      this._levelCompleteT -= dt;
      if (this._levelCompleteT <= 0) {
        this._campaignLevel++;
        this._campaignKills = 0;
        this._levelComplete = false;
        this.bots = [];
        this._startCampaignLevel();
      }
    }

    // ── Wanted decay ───────────────────────────────────────
    if (this._wantedLevel > 0) {
      if (this._wantedLevel > this._achStats.maxWanted) {
        this._achStats.maxWanted = this._wantedLevel;
        this._checkAchievements();
      }
      const richHalt =
        this._currentDistrict?.id === "rich" && this._reputation.rich <= -50;
      if (!richHalt) {
        this._wantedDecay += dt;
        if (this._wantedDecay >= 10.0) {
          this._wantedLevel = Math.max(0, this._wantedLevel - 1);
          this._wantedDecay = 0;
        }
      }
    }

    // ── Police siren sound (start/stop continuous loop) ────
    this._policeSirenTimer -= dt;
    if (this._policeSirenTimer <= 0) {
      this._policeSirenTimer = 0.3; // check every 0.3s
      const hasPoliceNear =
        !this.player.dead &&
        this.bots.some(
          (b) =>
            !b.dead &&
            (b.type === "police" ||
              b.type === "swat" ||
              b.type === "heavyswat") &&
            Math.hypot(b.x - this.player.x, b.y - this.player.y) < 520,
        );
      if (hasPoliceNear && !this._sirenPlaying) {
        window.audio?.startSiren();
        this._sirenPlaying = true;
      } else if (!hasPoliceNear && this._sirenPlaying) {
        window.audio?.stopSiren();
        this._sirenPlaying = false;
      }
    }

    // ── Police spawn ───────────────────────────────────────
    if (
      this._wantedLevel > 0 &&
      !this._zombieMode &&
      !this._lifeMode &&
      !this._towerMode
    ) {
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
        if (
          this._arenaSpawned >= this._arenaWaveSize &&
          this.bots.filter((b) => !b.dead && !b.dying).length === 0 &&
          bossGone
        ) {
          if (this.boss && this.boss.dead) this.boss = null;
          this._arenaCountdown = 3.5;
          this.wave++;
          window.audio?.waveUp();
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
        if (
          this._zombieSpawned >= this._zombieWaveSize &&
          this.bots.filter((b) => !b.dead && !b.dying).length === 0 &&
          zbossGone
        ) {
          if (this.boss && this.boss.dead) this.boss = null;
          this._zombieCountdown = 4.0;
          this.wave++;
          window.audio?.waveUp();
        }
      }
    }

    for (const bot of this.bots) {
      if (bot._frozen > 0) {
        bot._frozen -= dt;
        continue;
      }
      let edt = dt;
      if (bot._slowTimer > 0) {
        bot._slowTimer -= dt;
        edt = dt * (bot._slowMult || 0.3);
      }
      bot.update(edt, this.player, this.map, this.bullets, this.particles);
    }

    // ── Zombie melee contact damage ────────────────────────
    if (this._zombieMode && !this.player.dead && !this._playerVehicle) {
      for (const b of this.bots) {
        if (b.dead || b.dying || !b._cfg || !b._cfg.melee) continue;
        if (
          circlesOverlap(
            b.x,
            b.y,
            b.radius,
            this.player.x,
            this.player.y,
            this.player.radius,
          )
        ) {
          if (b._contactTimer <= 0) {
            const dmg = this.player.takeDamage(b.damage, this.hud);
            if (dmg) {
              this.hud.addDamageNumber(
                this.player.x,
                this.player.y - 30,
                dmg,
                this.camX,
                this.camY,
                "#44FF44",
              );
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
        if (this.decals.filter((d) => d.type === "hole").length < 80) {
          const pos = b.trail.length > 0 ? b.trail[b.trail.length - 1] : b;
          this.decals.push(new Decal(pos.x, pos.y, "hole"));
        }
      }
    }

    // ── Grenades ─────────────────────────────────────────────
    for (const g of this._grenades) {
      g.update(dt, this.map);
      if (g.explode) this._explodeGrenade(g);
    }
    this._grenades = this._grenades.filter((g) => !g.dead);

    for (const p of this.particles) p.update(dt);

    // Boss update
    if (this.boss) {
      if (!this.boss.dead) {
        this.boss.update(
          dt,
          this.player,
          this.map,
          this.bullets,
          this.particles,
          this.bots,
        );
      } else {
        this._achStats.bossesKilled++;
        this._checkAchievements();
        window.audio?.bossKill();
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
            this.hud.addDamageNumber(
              bot.x,
              bot.y - 30,
              ramDmg,
              this.camX,
              this.camY,
              "#FF8800",
            );
            v.takeDamage(10, this.particles);
            v._ramCooldown = 0.38;
            if (bot.dying) {
              const _dType = bot._isZombie
                ? "zombie_blood"
                : this.map.config.snow
                  ? "ice_blood"
                  : this.map.config.ocean
                    ? "water_blood"
                    : "blood";
              const _dCount = bot._isZombie ? 3 : 1;
              for (let _di = 0; _di < _dCount; _di++) {
                const _dOx = (Math.random() - 0.5) * 40,
                  _dOy = (Math.random() - 0.5) * 40;
                this.decals.push(
                  new Decal(
                    bot.x + (_di === 0 ? 0 : _dOx),
                    bot.y + (_di === 0 ? 0 : _dOy),
                    _dType,
                  ),
                );
              }
              const mult = this._streakMultiplier();
              const wMult =
                (this.player._wealthMult || 1) *
                (this._hardcoreMode ? 3 : 1) *
                (this._blitzMode ? 5 : 1);
              const earned = Math.round(
                CONFIG.MONEY_PER_KILL * bot._cfg.moneyMult * mult * wMult,
              );
              this.money += earned;
              this._achStats.moneyEarned += earned;
              this.kills++;
              this.hud.addDamageNumber(
                bot.x,
                bot.y - 56,
                earned,
                this.camX,
                this.camY,
                mult > 1 ? "#FF8800" : "#FFD700",
              );
              this._onKill();
              this._dropPickup(bot);
              if (this.player._leechHp)
                this.player.health = Math.min(
                  this.player.maxHealth,
                  this.player.health + this.player._leechHp,
                );
            }
          }
        }
      }
      if (this.boss && !this.boss.dead && !this.boss.dying) {
        if (
          circlesOverlap(
            v.x,
            v.y,
            v.radius,
            this.boss.x,
            this.boss.y,
            this.boss.radius,
          )
        ) {
          if (v._ramCooldown <= 0) {
            const ramDmg = 80 + this.wave * 5;
            this.boss.takeDamage(ramDmg, this.particles);
            this.hud.addDamageNumber(
              this.boss.x,
              this.boss.y - 50,
              ramDmg,
              this.camX,
              this.camY,
              "#FF8800",
            );
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
            const ang = Math.atan2(bot.y - b.y, bot.x - b.x);
            const diff = Math.abs(
              ((ang - b.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI,
            );
            if (diff < b._arc / 2) hit = true;
          }
        } else {
          hit = circlesOverlap(b.x, b.y, b.radius, bot.x, bot.y, bot.radius);
        }
        if (hit) {
          bot.takeDamage(b.damage, this.particles);
          this.hud.addDamageNumber(
            bot.x,
            bot.y - 30,
            b.damage,
            this.camX,
            this.camY,
            "#FF6666",
          );
          if (b.special && !bot.dying)
            this._applyBulletSpecial(b.special, bot, b);
          b.dead = true;
          if (bot.dying) {
            const _dType = bot._isZombie
              ? "zombie_blood"
              : this.map.config.snow
                ? "ice_blood"
                : this.map.config.ocean
                  ? "water_blood"
                  : "blood";
            const _dCount = bot._isZombie ? 3 : 1;
            for (let _di = 0; _di < _dCount; _di++) {
              const _dOx = (Math.random() - 0.5) * 40,
                _dOy = (Math.random() - 0.5) * 40;
              this.decals.push(
                new Decal(
                  bot.x + (_di === 0 ? 0 : _dOx),
                  bot.y + (_di === 0 ? 0 : _dOy),
                  _dType,
                ),
              );
            }
            const mult = this._streakMultiplier();
            const wMult =
              (this.player._wealthMult || 1) *
              (this._hardcoreMode ? 3 : 1) *
              (this._blitzMode ? 5 : 1);
            const earned = Math.round(
              CONFIG.MONEY_PER_KILL * bot._cfg.moneyMult * mult * wMult,
            );
            this.money += earned;
            this._achStats.moneyEarned += earned;
            this.kills++;
            this.hud.addDamageNumber(
              bot.x,
              bot.y - 56,
              earned,
              this.camX,
              this.camY,
              mult > 1 ? "#FF8800" : "#FFD700",
            );
            if (b.isMelee) this._achStats.knifeKills++;
            this._onKill();
            if (this.player._leechHp)
              this.player.health = Math.min(
                this.player.maxHealth,
                this.player.health + this.player._leechHp,
              );
            this._dropPickup(bot);
          }
          if (!b.isMelee) break; // melee can hit multiple bots in one swing
        }
      }
    }

    // ── Bullet → boss ──────────────────────────────────────
    if (this.boss && !this.boss.dead && !this.boss.dying) {
      for (const b of this.bullets) {
        if (!b.isPlayer || b.dead) continue;
        if (
          circlesOverlap(
            b.x,
            b.y,
            b.radius,
            this.boss.x,
            this.boss.y,
            this.boss.radius,
          )
        ) {
          this.boss.takeDamage(b.damage, this.particles);
          this.hud.addDamageNumber(
            this.boss.x,
            this.boss.y - this.boss.radius - 10,
            b.damage,
            this.camX,
            this.camY,
            "#FF6666",
          );
          b.dead = true;
          if (this.boss.dying) {
            const reward = CONFIG.MONEY_PER_KILL * 15;
            this.money += reward;
            this._achStats.moneyEarned += reward;
            this.kills++;
            this.hud.addDamageNumber(
              this.boss.x,
              this.boss.y - 80,
              reward,
              this.camX,
              this.camY,
              "#FFD700",
            );
            this.bossRespawnTimer = 30000;
            for (let i = 0; i < 3 + Math.floor(Math.random() * 2); i++) {
              const a = (i / 4) * Math.PI * 2;
              const r = Math.random();
              this.pickups.push(
                new Pickup(
                  this.boss.x + Math.cos(a) * 44,
                  this.boss.y + Math.sin(a) * 44,
                  r < 0.4 ? "health" : r < 0.7 ? "ammo" : "cash",
                ),
              );
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
        if (d.dead || d.type === "player") continue;
        if (circlesOverlap(b.x, b.y, b.radius, d.x, d.y, d.radius)) {
          d.takeDamage(b.damage, this.particles);
          b.dead = true;
          if (d.dead) {
            this.kills++;
            this.money += CONFIG.MONEY_PER_KILL;
            this._onKill();
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
        if (
          circlesOverlap(
            b.x,
            b.y,
            b.radius,
            this.player.x,
            this.player.y,
            this.player.radius,
          )
        ) {
          // Phantom dodge
          const dodgeChance = this.charData._dodgeChance || 0;
          if (dodgeChance > 0 && Math.random() < dodgeChance) {
            b.dead = true;
            window.audio?.dodge();
            for (let _i = 0; _i < 6; _i++) {
              const _a = Math.random() * Math.PI * 2,
                _s = rnd(60, 150);
              this.particles.push(
                new Particle(
                  this.player.x,
                  this.player.y,
                  Math.cos(_a) * _s,
                  Math.sin(_a) * _s,
                  "#AA44FF",
                  rnd(2, 5),
                  0.5,
                ),
              );
            }
            continue;
          }
          const dmg = this.player.takeDamage(
            b.damage * (this._hardcoreMode ? 2 : 1),
            this.hud,
          );
          if (dmg) {
            window.audio?.playerHit();
            this.hud.addDamageNumber(
              this.player.x,
              this.player.y - 30,
              dmg,
              this.camX,
              this.camY,
              "#FF4444",
            );
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
    if (
      this.boss &&
      this.boss._chargeActive &&
      !this.boss.dead &&
      !this.player.dead &&
      !this._playerVehicle
    ) {
      if (
        circlesOverlap(
          this.boss.x,
          this.boss.y,
          this.boss.radius,
          this.player.x,
          this.player.y,
          this.player.radius,
        )
      ) {
        if (this.boss._chargeDmgTimer <= 0) {
          const dmg = this.player.takeDamage(this.boss.damage * 2.5, this.hud);
          if (dmg) {
            window.audio?.playerHit();
            this.hud.addDamageNumber(
              this.player.x,
              this.player.y - 30,
              dmg,
              this.camX,
              this.camY,
              "#FF6644",
            );
            this._killStreak = 0;
            this._streakTimer = 0;
          }
          this.boss._chargeDmgTimer = 0.35;
        }
      }
    }

    // ── Bomb AoE (bomber enemy bullets) ──────────────────
    for (const b of this.bullets) {
      if (!b._isBomb || !b.dead) continue;
      const r = b._aoeRadius || 80,
        dmg = b.damage * 2.5;
      for (let i = 0; i < 18; i++) {
        const a = Math.random() * Math.PI * 2,
          s = rnd(80, 200);
        this.particles.push(
          new Particle(
            b.x,
            b.y,
            Math.cos(a) * s,
            Math.sin(a) * s,
            i % 2 === 0 ? "#FF6600" : "#FF3300",
            rnd(3, 8),
            0.8,
          ),
        );
      }
      this.hud.shake(7);
      if (
        !this.player.dead &&
        !this._playerVehicle &&
        circlesOverlap(
          b.x,
          b.y,
          r,
          this.player.x,
          this.player.y,
          this.player.radius,
        )
      ) {
        const d = this.player.takeDamage(
          dmg * (this._hardcoreMode ? 2 : 1),
          this.hud,
        );
        if (d) {
          window.audio?.playerHit();
          this.hud.addDamageNumber(
            this.player.x,
            this.player.y - 30,
            d,
            this.camX,
            this.camY,
            "#FF6600",
          );
        }
      }
    }

    // ── Cleanup ────────────────────────────────────────────
    this.bots = this.bots.filter((b) => !b.dead);
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.particles = this.particles.filter((p) => !p.dead);
    // Sky: open sky means bullets/particles accumulate — hard caps prevent frame drops
    if (this._skyMode) {
      if (this.bullets.length > 40)
        this.bullets.splice(0, this.bullets.length - 40);
      if (this.particles.length > 80)
        this.particles.splice(0, this.particles.length - 80);
      if (this.decals.length > 30)
        this.decals.splice(0, this.decals.length - 30);
    }

    // ── Tower: elevator check ─────────────────────────────────
    if (this._towerMode) this._updateTower(dt);

    // ── Bot spawning (non-arena, non-zombie, non-life only) ──
    if (
      !this._arenaMode &&
      !this._zombieMode &&
      !this._lifeMode &&
      !this._towerMode
    ) {
      this.spawnTimer -= dt * 1000;
      let maxBots = CONFIG.MAX_BOTS + this.wave * 2;
      if (this._skyMode) maxBots = Math.min(maxBots, 8); // sky: keep bot count low for perf
      const spawnInterval = this._blitzMode
        ? Math.max(300, CONFIG.BOT_SPAWN_INTERVAL / 3 - this.wave * 50)
        : Math.max(700, CONFIG.BOT_SPAWN_INTERVAL - this.wave * 140);
      if (this.spawnTimer <= 0 && this.bots.length < maxBots) {
        this._spawnBot();
        this.spawnTimer = spawnInterval;
      }

      // ── Wave ─────────────────────────────────────────────
      this.waveTimer -= dt * 1000;
      if (this.waveTimer <= 0) {
        this.wave++;
        this.waveTimer = 30000;
        window.audio?.waveUp();
        // Wave-locked global event every 5 waves (major only) — disabled in tower mode
        if (
          !this._towerMode &&
          this.wave % 5 === 0 &&
          !this._globalEvent &&
          !this._eventWave.has(this.wave)
        ) {
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
    const _camTarget =
      this._droneControl && this._playerDrone ? this._playerDrone : this.player;
    const tcx = _camTarget.x - this.canvas.width / 2;
    const tcy = _camTarget.y - this.canvas.height / 2;
    this.camX = lerp(this.camX, tcx, CONFIG.CAM_LERP);
    this.camY = lerp(this.camY, tcy, CONFIG.CAM_LERP);
    const mapPxW = this.map.W * this.map.S,
      mapPxH = this.map.H * this.map.S;
    this.camX =
      mapPxW <= this.canvas.width
        ? (mapPxW - this.canvas.width) / 2
        : clamp(this.camX, 0, mapPxW - this.canvas.width);
    this.camY =
      mapPxH <= this.canvas.height
        ? (mapPxH - this.canvas.height) / 2
        : clamp(this.camY, 0, mapPxH - this.canvas.height);

    this.hud.update(dt);
  }

  _spawnVehicles() {
    const colors = [
      "#CC3333",
      "#3366BB",
      "#CC9900",
      "#339944",
      "#AA33AA",
      "#336688",
    ];
    const oceanColors = ["#0077AA", "#005588", "#006699", "#008899", "#004466"];
    const snowColors = ["#4488AA", "#336688", "#5599BB", "#447799", "#3388AA"];
    const isOcean = !!this.map.config.ocean;
    const isNeonCity = this.map.config.id === "neon_city";
    const isSnow = !!this.map.config.snow;

    // Frozen Tundra: spawn 3 ice-themed vehicles for the player (no NPC traffic)
    if (isSnow) {
      const avoidPositions = [];
      const avoidRadius = 100;

      if (this.map.portals) {
        for (const portal of this.map.portals) {
          if (portal && portal.wx !== undefined) {
            avoidPositions.push({ x: portal.wx, y: portal.wy });
          }
        }
      }
      if (this.map.metroEntrance) {
        const me = this.map.metroEntrance;
        avoidPositions.push({ x: me.wx, y: me.wy });
      }

      const isTooCloseToAvoid = (x, y) => {
        for (const pos of avoidPositions) {
          if (Math.hypot(x - pos.x, y - pos.y) < avoidRadius) return true;
        }
        return false;
      };

      // Spawn 3 ice-themed drivable vehicles
      for (let i = 0; i < 3; i++) {
        let rp;
        for (let t = 0; t < 25; t++) {
          rp = this.map.randomRoadPos();
          const distFromPlayer = Math.hypot(rp.x - this.player.x, rp.y - this.player.y);
          if (distFromPlayer > 150 && distFromPlayer < 550 && !isTooCloseToAvoid(rp.x, rp.y)) break;
        }
        const v = new Vehicle(rp.x, rp.y, snowColors[i % snowColors.length], this.map.config);
        this.vehicles.push(v);
      }
      return;
    }
    // Robot City / Hardcore: no drivable cars
    if (!!this.map.config.robot || !!this.map.config.hardcore) return;

    // Neon City: spawn 3 orange vehicles for the player (no other traffic)
    if (isNeonCity) {
      // Collect positions to avoid (portals, metro entrance, building doors)
      const avoidPositions = [];
      const avoidRadius = 120; // Keep cars this far from portals/entrances

      // Add portals to avoid list
      if (this.map.portals) {
        for (const portal of this.map.portals) {
          if (portal && portal.wx !== undefined) {
            avoidPositions.push({ x: portal.wx, y: portal.wy });
          }
        }
      }

      // Add metro entrance to avoid list
      if (this.map.metroEntrance) {
        const me = this.map.metroEntrance;
        avoidPositions.push({ x: me.wx, y: me.wy });
      }

      // Add building doors to avoid list
      if (this.map.doors) {
        for (const door of this.map.doors) {
          if (door && door.wx !== undefined) {
            avoidPositions.push({ x: door.wx, y: door.wy });
          }
        }
      }

      // Helper to check if position is too close to any avoid position
      const isTooCloseToAvoid = (x, y) => {
        for (const pos of avoidPositions) {
          if (Math.hypot(x - pos.x, y - pos.y) < avoidRadius) return true;
        }
        return false;
      };

      for (let i = 0; i < 3; i++) {
        let rp;
        let validPosition = false;
        // Try to find a road position not near portals/entrances
        for (let t = 0; t < 30; t++) {
          rp = this.map.randomRoadPos();
          const distFromPlayer = Math.hypot(rp.x - this.player.x, rp.y - this.player.y);
          // Between 150-600 pixels from player and not near avoid positions
          if (distFromPlayer > 150 && distFromPlayer < 600 && !isTooCloseToAvoid(rp.x, rp.y)) {
            validPosition = true;
            break;
          }
        }
        // Fallback: if no valid position found, still spawn but try to avoid portals
        if (!validPosition) {
          for (let t = 0; t < 20; t++) {
            rp = this.map.randomRoadPos();
            if (!isTooCloseToAvoid(rp.x, rp.y)) break;
          }
        }
        const v = new Vehicle(rp.x, rp.y, "#FF8800", this.map.config); // Orange vehicle
        this.vehicles.push(v);
      }
      return;
    }

    // Collect positions to avoid (metro entrance, portals, doors)
    const avoidPositions = [];
    const avoidRadius = 100;

    // Add metro entrance to avoid list
    if (this.map.metroEntrance) {
      const me = this.map.metroEntrance;
      avoidPositions.push({ x: me.wx, y: me.wy });
    }

    // Add portals to avoid list
    if (this.map.portals) {
      for (const portal of this.map.portals) {
        if (portal && portal.wx !== undefined) {
          avoidPositions.push({ x: portal.wx, y: portal.wy });
        }
      }
    }

    // Helper to check if position is too close to any avoid position
    const isTooCloseToAvoid = (x, y) => {
      for (const pos of avoidPositions) {
        if (Math.hypot(x - pos.x, y - pos.y) < avoidRadius) return true;
      }
      return false;
    };

    const count = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      let rp;
      let validPosition = false;
      // Try to find a road position (not near buildings or metro)
      for (let t = 0; t < 15; t++) {
        rp = this.map.randomRoadPos();
        if (Math.hypot(rp.x - this.player.x, rp.y - this.player.y) > 220 && !isTooCloseToAvoid(rp.x, rp.y)) {
          validPosition = true;
          break;
        }
      }
      // Fallback: try to at least avoid metro
      if (!validPosition) {
        for (let t = 0; t < 10; t++) {
          rp = this.map.randomRoadPos();
          if (!isTooCloseToAvoid(rp.x, rp.y)) break;
        }
      }
      const isPoliceVehicle = i === 0; // First vehicle is always police/coast guard
      const isMiniBoat = isOcean && i >= 2; // On ocean, vehicles after first 2 are mini boats
      const vehicleColor = isPoliceVehicle
        ? isOcean
          ? "#0055AA"
          : "#1144BB"
        : isOcean
          ? oceanColors[i % oceanColors.length]
          : colors[i % colors.length];
      const v = new Vehicle(rp.x, rp.y, vehicleColor, this.map.config);
      v._isPolice = isPoliceVehicle;
      v._isMiniBoat = isMiniBoat;
      // Mini boats are smaller and faster
      if (isMiniBoat) {
        v.width = 36;
        v.height = 18;
        v.radius = 18;
        v.speed = 340;
        v.hp = 120;
        v.maxHp = 120;
      }
      this.vehicles.push(v);
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
          this._vehiclesUsed.add(v.id || v._type || "car");
          window.audio?.vehicle();
          break;
        }
      }
    }
  }

  /* ── Save game result to backend ────────────────────────── */
  _onGameOver() {
    if (this._sessionSaved) return;
    this._sessionSaved = true;

    // Only save if player is logged in
    if (typeof Auth === "undefined" || !Auth.isLoggedIn()) return;
    if (typeof API === "undefined") return;

    const payload = {
      mapId: this.map.config.id || "unknown",
      characterId: this.charData.id || "gangster",
      waveReached: this.wave || 1,
      kills: this.kills || 0,
      deaths: this.player.dead ? 1 : 0,
      moneyEarned: this.money || 0,
      playtimeSec: Math.round(this._surviveTime),
      campaignLevel: this._campaignMode ? this._campaignLevel || 1 : null,
      bossKills: this._achStats?.bossesKilled || 0,
      mode: {
        survival: !!this.map.config.survival,
        hardcore: !!this._hardcoreMode,
        blitz: !!this._blitzMode,
        siege: !!this.map.config.siege,
        zombie: !!this._zombieMode,
        arena: !!this._arenaMode,
        campaign: !!this._campaignMode,
      },
      weaponsUsed: Array.from(this._weaponsUsed),
      vehiclesUsed: Array.from(this._vehiclesUsed),
      grenadesThrown: this._grenadesThrown,
    };

    API.saveSession(payload)
      .then((result) => {
        // Store result so game-over screen can show XP/level info
        this._sessionResult = result;
      })
      .catch(() => {
        // Silently fail — game still works offline
      });
  }

  _streakMultiplier() {
    if (this._killStreak >= 5) return 5;
    if (this._killStreak >= 3) return 3;
    if (this._killStreak >= 2) return 2;
    return 1;
  }

  _onKill() {
    window.audio?.kill();
    // Killstreak
    this._killStreak++;
    this._streakTimer = 3.0;
    const mult = this._streakMultiplier();
    if (mult >= 2) {
      const msg =
        mult >= 5
          ? "✦ KILLING SPREE ✦"
          : mult >= 3
            ? "TRIPLE KILL!"
            : "DOUBLE KILL!";
      this._streakPopup = { text: msg, timer: 1.8, mult };
    }

    // Wanted system
    this._wantedDecay = 0;
    this._wantedKills++;
    const thresholds = [0, 5, 15, 30, 55];
    if (
      this._wantedLevel < 4 &&
      this._wantedKills >= thresholds[this._wantedLevel + 1]
    ) {
      this._wantedLevel++;
      this._policeTimer = 1800; // fast first spawn on star-up
    }

    // Arena kill count
    if (this._arenaMode) this._arenaKilled++;
    // Campaign kill count
    if (this._campaignMode) {
      this._campaignKills++;
      if (this._campaignKills >= this._campaignTarget && !this._levelComplete) {
        this._levelComplete = true;
        this._levelCompleteT = 3.5;
      }
    }

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
      const indBonus =
        this._currentDistrict?.id === "industrial" &&
        this._reputation.industrial >= 50;
      const ammoThresh = indBonus ? 0.84 : 0.72;
      const type = r < 0.42 ? "health" : r < ammoThresh ? "ammo" : "cash";
      this.pickups.push(new Pickup(bot.x, bot.y, type));
    }
  }

  _spawnPolice() {
    const lv = this._wantedLevel;
    const r = Math.random();
    let type;
    if (lv >= 4) type = r < 0.25 ? "heavyswat" : r < 0.58 ? "swat" : "police";
    else if (lv >= 3) type = r < 0.36 ? "swat" : "police";
    else if (lv >= 2) type = r < 0.22 ? "swat" : "police";
    else type = "police";
    const rp = this.map.randomRoadPos();
    this.bots.push(new Bot(rp.x, rp.y, this.wave, type, this.map.config));
  }

  _startArenaWave() {
    this._arenaWaveSize = 6 + this.wave * 3;
    this._arenaSpawned = 0;
    this._arenaKilled = 0;
    this.spawnTimer = 400;
    // Spawn boss every 4 waves (starting wave 4)
    if (this.wave >= 4 && this.wave % 4 === 0 && !this.boss) {
      this._spawnBoss();
    }
  }

  _startZombieWave() {
    this._zombieWaveSize = 8 + this.wave * 4;
    this._zombieSpawned = 0;
    this._zombieTimer = 400;
    if (this.wave >= 4 && this.wave % 4 === 0 && !this.boss) this._spawnBoss();
  }

  _spawnZombie() {
    const w = this.wave;
    let type;
    const r = Math.random();
    if (w <= 2) {
      type = "shambler";
    } else if (w <= 4) {
      type = r < 0.6 ? "shambler" : "runner";
    } else if (w <= 6) {
      type =
        r < 0.3
          ? "shambler"
          : r < 0.55
            ? "runner"
            : r < 0.75
              ? "brute"
              : r < 0.9
                ? "mutant"
                : "crawler";
    } else if (w <= 10) {
      type =
        r < 0.18
          ? "runner"
          : r < 0.38
            ? "brute"
            : r < 0.58
              ? "mutant"
              : r < 0.72
                ? "bloater"
                : r < 0.88
                  ? "crawler"
                  : "charger";
    } else {
      type =
        r < 0.12
          ? "shambler"
          : r < 0.28
            ? "brute"
            : r < 0.44
              ? "mutant"
              : r < 0.58
                ? "bloater"
                : r < 0.74
                  ? "crawler"
                  : "charger";
    }
    const pos = this.map.randomRoadPos();
    this.bots.push(new ZombieBot(pos.x, pos.y, w, type));
  }

  _triggerEvent(majorOnly = false) {
    if (this._globalEvent) return;
    const pool = majorOnly
      ? CONFIG.GLOBAL_EVENTS.filter((e) => e.major)
      : CONFIG.GLOBAL_EVENTS;
    const ev = rndChoice(pool);
    this._globalEvent = { ...ev, timer: ev.duration };
    this._eventAnnounceTimer = 3.5;
    if (ev.id === "cyber_virus") {
      this.player.fireRateMult *= 1.55;
      this._cyberDebuffActive = true;
    }
    if (ev.id === "riot") {
      this._wantedLevel = Math.max(this._wantedLevel, 2);
    }
    if (ev.id === "corporate") {
      this._corpTimer = 500;
    }
    if (ev.id === "glitch_mode") {
      // Spawn 2 portals at random road positions
      this._glitchPortals = [];
      for (let i = 0; i < 2; i++) {
        const rp = this.map.randomRoadPos();
        this._glitchPortals.push({
          x: rp.x,
          y: rp.y,
          t: 0,
          spawnTimer: 8 + i * 3,
        });
      }
      this._glitchPortalTimer = 0;
    }
  }

  _endEvent() {
    if (!this._globalEvent) return;
    if (this._globalEvent.id === "cyber_virus" && this._cyberDebuffActive) {
      this.player.fireRateMult /= 1.55;
      this._cyberDebuffActive = false;
    }
    if (this._globalEvent.id === "glitch_mode") {
      this._glitchPortals = [];
    }
    this._globalEvent = null;
    this._corpTimer = 0;
  }

  _spawnBot() {
    const margin = 130;
    const W = this.canvas.width,
      H = this.canvas.height;
    const maxWX = this.map.W * this.map.S;
    const maxWY = this.map.H * this.map.S;
    let sx, sy;
    switch (Math.floor(Math.random() * 4)) {
      case 0:
        sx = this.camX + rnd(0, W);
        sy = this.camY - margin;
        break;
      case 1:
        sx = this.camX + W + margin;
        sy = this.camY + rnd(0, H);
        break;
      case 2:
        sx = this.camX + rnd(0, W);
        sy = this.camY + H + margin;
        break;
      default:
        sx = this.camX - margin;
        sy = this.camY + rnd(0, H);
        break;
    }

    // Weighted type selection — higher waves introduce advanced types
    const r = Math.random();
    const isSnowMap = !!this.map.config.snow;
    const isOceanMap = !!this.map.config.ocean;
    let type;
    if (this.wave >= 10 && r < 0.06) type = "juggernaut";
    else if (this.wave >= 6 && r < 0.14) type = "sniper";
    else if (this.wave >= 4 && r < 0.22) type = "bomber";
    else if (r < 0.38)
      type = isSnowMap || isOceanMap ? "normal" : "mini"; // No mini enemies on snow/ocean maps
    else if (r < 0.84) type = "normal";
    else type = "big";

    const _pushBot = (bx, by) => {
      const bot = new Bot(bx, by, this.wave, type, this.map.config);
      if (this._blitzMode) {
        bot.speed = Math.round(bot.speed * 3);
      }
      if (
        this._currentDistrict?.id === "industrial" &&
        this._reputation.industrial <= -50
      ) {
        bot.hp = Math.round(bot.hp * 1.25);
        bot.maxHp = bot.hp;
      }
      this.bots.push(bot);
    };

    if (Math.random() > 0.4) {
      sx = clamp(sx, 0, maxWX);
      sy = clamp(sy, 0, maxWY);
      if (!this.map.isBlocked(sx, sy)) {
        _pushBot(sx, sy);
        return;
      }
    }
    const rp = this.map.randomRoadPos();
    _pushBot(rp.x, rp.y);
  }

  // ── Tower HUD & victory rendering ────────────────────────



  // ── Tower floor system ────────────────────────────────────




  _spawnBoss() {
    let rp;
    if (this._towerMode) {
      rp = this._towerRandomPos();
    } else {
      const minEdge = 160;
      const mapW = this.map.W * this.map.S,
        mapH = this.map.H * this.map.S;
      let tries = 0;
      do {
        rp = this.map.randomRoadPos();
        tries++;
      } while (
        tries < 20 &&
        (rp.x < minEdge ||
          rp.y < minEdge ||
          rp.x > mapW - minEdge ||
          rp.y > mapH - minEdge)
      );
    }
    this.boss = new BossBot(rp.x, rp.y, this.wave, this.map.config.id);
  }

  _startCampaignLevel() {
    const lvl = this._campaignLevel;
    this._campaignTarget = 10 + lvl * 5;
    this.wave = lvl;
    this._bossActivated = false;
    this.boss = null;
    this.bossRespawnTimer = lvl % 10 === 0 ? 3000 : 0;
    if (lvl % 10 === 0) {
      this._bossActivated = true;
      this.bossRespawnTimer = 3000;
    }
    this.spawnTimer = 1000;
  }

  _spawnAmbientTraffic() {
    // Ambient traffic disabled — non-driveable cars removed
  }

  _respawnAmbientCar() {
    // Ambient traffic disabled — non-driveable cars removed
  }

  _explodeGrenade(g) {
    window.audio?.explosion();
    const r = CONFIG.GRENADE.blastRadius,
      dmg = CONFIG.GRENADE.damage;
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2,
        s = rnd(120, 280);
      this.particles.push(
        new Particle(
          g.x,
          g.y,
          Math.cos(a) * s,
          Math.sin(a) * s,
          i % 3 === 0 ? "#FF8800" : "#FF4400",
          rnd(4, 9),
          0.9,
        ),
      );
    }
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2,
        s = rnd(40, 100);
      this.particles.push(
        new Particle(
          g.x,
          g.y,
          Math.cos(a) * s,
          Math.sin(a) * s,
          "#FFEE88",
          rnd(2, 5),
          0.5,
        ),
      );
    }
    this.decals.push(
      new Decal(
        g.x,
        g.y,
        this.map.config.snow
          ? "ice_blood"
          : this.map.config.ocean
            ? "water_blood"
            : "blood",
      ),
    );
    this.hud.shake(10);
    for (const bot of this.bots) {
      if (bot.dead || bot.dying) continue;
      if (circlesOverlap(g.x, g.y, r, bot.x, bot.y, bot.radius)) {
        bot.takeDamage(dmg, this.particles);
        this.hud.addDamageNumber(
          bot.x,
          bot.y - 30,
          dmg,
          this.camX,
          this.camY,
          "#FF8800",
        );
        if (bot.dying) {
          const _dType = bot._isZombie
            ? "zombie_blood"
            : this.map.config.snow
              ? "ice_blood"
              : this.map.config.ocean
                ? "water_blood"
                : "blood";
          const _dCount = bot._isZombie ? 3 : 1;
          for (let _di = 0; _di < _dCount; _di++) {
            const _dOx = (Math.random() - 0.5) * 40,
              _dOy = (Math.random() - 0.5) * 40;
            this.decals.push(
              new Decal(
                bot.x + (_di === 0 ? 0 : _dOx),
                bot.y + (_di === 0 ? 0 : _dOy),
                _dType,
              ),
            );
          }
          const mult = this._streakMultiplier();
          const wMult =
            (this.player._wealthMult || 1) *
            (this._hardcoreMode ? 3 : 1) *
            (this._blitzMode ? 5 : 1);
          const earned = Math.round(
            CONFIG.MONEY_PER_KILL * bot._cfg.moneyMult * mult * wMult,
          );
          this.money += earned;
          this._achStats.moneyEarned += earned;
          this.kills++;
          this.hud.addDamageNumber(
            bot.x,
            bot.y - 56,
            earned,
            this.camX,
            this.camY,
            "#FF8800",
          );
          this._onKill();
          this._dropPickup(bot);
          if (this.player._leechHp)
            this.player.health = Math.min(
              this.player.maxHealth,
              this.player.health + this.player._leechHp,
            );
        }
      }
    }
    if (
      this.boss &&
      !this.boss.dead &&
      !this.boss.dying &&
      circlesOverlap(g.x, g.y, r, this.boss.x, this.boss.y, this.boss.radius)
    ) {
      this.boss.takeDamage(dmg, this.particles);
      this.hud.addDamageNumber(
        this.boss.x,
        this.boss.y - 60,
        dmg,
        this.camX,
        this.camY,
        "#FF8800",
      );
    }
  }

  // ── Special weapon effects ─────────────────────────────────
  _applyBulletSpecial(special, bot, b) {
    if (special === "timefreeze") {
      bot._frozen = 2.5;
      this.particles.push(
        ...Particle.burst(bot.x, bot.y, "#88DDFF", 10, 40, 100, 2, 5, 0.5, 1.8),
      );
    } else if (special === "gravity") {
      const ang = Math.atan2(this.player.y - bot.y, this.player.x - bot.x);
      const nx = bot.x + Math.cos(ang) * 80,
        ny = bot.y + Math.sin(ang) * 80;
      if (!this.map.isBlockedCircle(nx, ny, bot.radius)) {
        bot.x = nx;
        bot.y = ny;
      }
      this.particles.push(
        ...Particle.burst(bot.x, bot.y, "#CC88FF", 8, 60, 140, 2, 5, 0.3, 0.9),
      );
    } else if (special === "electric") {
      for (const nb of this.bots) {
        if (nb === bot || nb.dead || nb.dying) continue;
        if (Math.hypot(nb.x - bot.x, nb.y - bot.y) < 105) {
          const chainDmg = Math.round(b.damage * 0.6);
          nb.takeDamage(chainDmg, this.particles);
          this.hud.addDamageNumber(
            nb.x,
            nb.y - 30,
            chainDmg,
            this.camX,
            this.camY,
            "#88FFCC",
          );
          this.particles.push(
            ...Particle.burst(
              nb.x,
              nb.y,
              "#88FFCC",
              5,
              40,
              110,
              1,
              3,
              0.2,
              0.7,
            ),
          );
        }
      }
    } else if (special === "plasma") {
      bot._slowTimer = 3.0;
      bot._slowMult = 0.3;
      this.particles.push(
        ...Particle.burst(bot.x, bot.y, "#FF88FF", 6, 30, 80, 2, 4, 0.3, 0.9),
      );
    }
  }

  // ── Life Mode: city NPC spawning ───────────────────────────
  _spawnCityNpcs() {
    const base = this._metropolisMode ? 28 : 14;
    const count = base + Math.floor(Math.random() * 10);
    for (let i = 0; i < count; i++) {
      const pos = this.map.randomRoadPos();
      this._cityNpcs.push(new CityNPC(pos.x, pos.y, this.map));
    }
  }

  _buildDistrictLayout() {
    // No districts for arena, zombie, life modes, or frozen tundra
    if (this._arenaMode || this._zombieMode || this._lifeMode) return null;
    // No districts for Frozen Tundra
    if (this.map?.config?.snow) return null;
    const types = ["dangerous", "rich", "industrial"];
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    return types; // [leftZone, centerZone, rightZone]
  }

  _togglePlayerDrone() {
    if (this._playerDrone) {
      this._playerDrone = null;
      this._droneControl = false;
    } else {
      this._playerDrone = new Drone(
        this.player.x,
        this.player.y - 40,
        "player",
      );
      this._droneControl = true;
    }
  }

  _applyBmItem(item) {
    if (item.type === "weapon") {
      // Inject into CONFIG.WEAPONS if not already there, then equip
      if (!CONFIG.WEAPONS.find((w) => w.id === item.id)) {
        CONFIG.WEAPONS.push({
          id: item.id,
          name: item.name,
          color: item.color,
          damage: item.damage,
          fireRate: item.fireRate,
          bullets: item.bullets,
          spread: item.spread,
          bulletSpeed: item.bulletSpeed,
          melee: item.melee,
          ammo: -1,
        });
      }
      this.player.ownedWeapons.add(item.id);
      this.player.equipWeapon(item.id);
    } else if (item.type === "implant") {
      if (item.effect === "reflex") {
        if (this._reflexTimer <= 0) {
          this.player.speed *= 2;
          this.player.fireRateMult *= 0.5; // halve = fire twice as fast
        }
        this._reflexTimer = 8;
      } else if (item.effect === "nanoshield") {
        this.player.invincible = 6;
        this._nanoshieldTimer = 6;
      } else if (item.effect === "overclock") {
        this.player.damageMult = (this.player.damageMult || 1) * 1.6;
      }
    } else if (item.type === "vehicle") {
      // Spawn prototype vehicle near player
      const pv = new Vehicle(
        this.player.x + 80,
        this.player.y,
        "#CCDDFF",
        this.map.config,
      );
      pv.hp = 500;
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
        localStorage.setItem(
          "unlockedAch",
          JSON.stringify([...this._unlockedAch]),
        );
        localStorage.setItem("achStats", JSON.stringify(this._achStats));
      }
    }
  }

  _tryEnterExit() {
    if (this._indoor) {
      if (this._indoor.isDealership) {
        this._salespersons = [];
        if (this.state === "carshop") {
          this._dealership.close();
          this.state = "playing";
        }
      }
      if (this._indoor.isCasino) {
        this._casinoHosts = [];
        if (this.state === "casino") {
          this._casino.close();
          this.state = "playing";
        }
      }
      if (this._indoor.isPoliceStation) {
        this._policeOfficers = [];
      }
      if (this._indoor.isTechShop) {
        this._techShopCustomers = [];
      }
      if (this._indoor.isCryoLab) {
        this._cryoLabVendor = null;
        this._cryoLabCustomers = [];
      }
      if (this._indoor.isRadioStation) {
        this._radioWorkers = [];
      }
      if (this._indoor.isMetro) {
        this._metroWaveTimer = undefined;
      }
      if (this.state === "buildingshop") {
        this._buildingShop.close();
        this.state = "playing";
      }
      this._buildingNpcs = [];
      this._nearBuildingNpc = false;
      const door = this._indoor.doorDoor;
      this.player.x = door.wx;
      this.player.y = door.wy + 80; // far enough to avoid instantly re-entering
      // Snap camera so player is visible immediately on exit
      this.camX = this.player.x - this.canvas.width / 2;
      this.camY = this.player.y - this.canvas.height / 2;
      this._buildingEntryCooldown = 1.2; // also block re-entry for a moment
      window.audio?.doorClose();
      this._indoor = null;
      this._indoorBots = [];
      this._indoorBullets = [];
      this._indoorPickups = [];
      return;
    }
    for (const door of this.map.doors) {
      const dist = Math.hypot(door.wx - this.player.x, door.wy - this.player.y);
      if (dist < 55) {
        const room = this.map.getRoom(door);
        room.isDealership = door.specialType === "dealership";
        room.isCasino = door.specialType === "casino";
        room.isRestaurant = door.specialType === "restaurant";
        room.isHome = door.specialType === "home";
        room._doorSpecial = door.specialType;
        room._buildingType =
          typeof door.bTypeIdx === "number" ? door.bTypeIdx : 0;
        this._indoor = room;
        this._buildingEntryCooldown = 1.2; // block auto-exit for 1.2s after entering
        window.audio?.doorOpen();
        this._achStats.buildingsEntered++;
        this._checkAchievements();
        this.player.x = room.entryX;
        this.player.y = room.entryY;

        if (room.isDealership) {
          const isNeonCity  = this.map.config.id === "neon_city";
          const isRobot     = !!this.map.config.robot;
          const isGalactica = !!this.map.config.galactica;
          const isBlitz    = !!this.map.config.blitz;
          const isWasteland = !!this.map.config.wasteland;
          const isHardcoreD = !!this.map.config.hardcore;
          const isDesertD   = !!this.map.config.desert;
          const isSnowD     = !!this.map.config.snow;
          if (isNeonCity) {
            // Neon City: One professional cyber salesperson behind the counter
            // Counter is at S * 1.8 + 35 height, salesperson stands in front of counter (facing customers)
            const spX = room.roomW / 2;
            const spY = room.roomH * 0.38; // Closer to the display cars
            this._salespersons = [
              new Salesperson(spX, spY, "#00FFFF", "SALES REP", true),
            ];
          } else if (isHardcoreD) {
            // Hardcore: Fire-themed human dealer
            const spX = room.roomW / 2;
            const spY = room.roomH * 0.38;
            this._salespersons = [
              new Salesperson(spX, spY, "#FF8800", "DEALER", true),
            ];
          } else if (isRobot) {
            // Robot City: human-style dealer with teal-green robot-district color
            const spX = room.roomW / 2;
            const spY = room.roomH * 0.38;
            this._salespersons = [
              new Salesperson(spX, spY, "#00FFB0", "UNIT-7", true),
            ];
          } else if (isBlitz) {
            // Blitz: Human-style dealer matching the bar worker look
            const spX = room.roomW / 2;
            const spY = room.roomH * 0.38;
            this._salespersons = [
              new Salesperson(spX, spY, "#00FFFF", "DEALER", true),
            ];
          } else if (isGalactica) {
            // Galactica: Cosmic COMMANDER salesperson
            const spX = room.roomW / 2;
            const spY = room.roomH * 0.38;
            this._salespersons = [
              new Salesperson(spX, spY, "#AA88FF", "COMMANDER", "galactica"),
            ];
          } else if (isWasteland) {
            // Wasteland: Grizzled mechanic/trader behind the counter
            const spX = room.roomW / 2;
            const spY = room.roomH * 0.38;
            this._salespersons = [
              new Salesperson(spX, spY, "#a08060", "MECHANIC", "wasteland"),
            ];
          } else if (!!this.map.config.campaign) {
            // Campaign: Golden-accented military dealer
            const spX = room.roomW / 2;
            const spY = room.roomH * 0.38;
            this._salespersons = [
              new Salesperson(spX, spY, "#FFDD00", "DEALER", true),
            ];
          } else if (isDesertD) {
            // Desert Sands: Egyptian gold-robed trade master
            const spX = room.roomW / 2;
            const spY = room.roomH * 0.38;
            this._salespersons = [
              new Salesperson(spX, spY, "#FFD060", "TRADE MASTER", "desert"),
            ];
          } else if (isSnowD) {
            // Frozen Tundra: Ice-blue professional sales rep
            const spX = room.roomW / 2;
            const spY = room.roomH * 0.38;
            this._salespersons = [
              new Salesperson(spX, spY, "#AADDFF", "ICE REP", "snow"),
            ];
          } else if (!!this.map.config.dino) {
            // Dino World: Jungle-green professional sales rep
            const spX = room.roomW / 2;
            const spY = room.roomH * 0.38;
            this._salespersons = [
              new Salesperson(spX, spY, "#66DD44", "DINO REP", "dino"),
            ];
          } else if (!!this.map.config.jungle) {
            // Jungle Safari: Bioluminescent green professional sales rep
            const spX = room.roomW / 2;
            const spY = room.roomH * 0.38;
            this._salespersons = [
              new Salesperson(spX, spY, "#44DD22", "SAFARI REP", "dino"),
            ];
          } else {
            this._salespersons = [
              new Salesperson(
                room.entryX + 55,
                room.entryY - 90,
                "#FFAA55",
                "DEALER",
              ),
              new Salesperson(
                room.entryX - 55,
                room.entryY - 130,
                "#55AAFF",
                "DEALER",
              ),
            ];
          }
        } else if (room.isCasino) {
          this._casinoHosts = [
            new Salesperson(
              room.entryX + 60,
              room.entryY - 85,
              "#FF44AA",
              "HOST",
            ),
            new Salesperson(
              room.entryX - 60,
              room.entryY - 115,
              "#FFCC00",
              "HOST",
            ),
          ];
        } else if (door.bTypeIdx === 15) {
          // POLICE STATION: No enemies, spawn police officers instead
          room.isPoliceStation = true;
          const isRobotPolice = !!this.map.config.robot;
          this._policeOfficers = isRobotPolice ? [
            { x: room.roomW * 0.18, y: room.roomH * 0.50, sitting: false, label: "UNIT-R1" },
            { x: room.roomW * 0.38, y: room.roomH * 0.68, sitting: true,  label: "UNIT-R2" },
            { x: room.roomW * 0.66, y: room.roomH * 0.28, sitting: false, label: "UNIT-R3" },
          ] : [
            // Officer standing near the first desk (left side)
            { x: room.roomW * 0.22, y: room.roomH * 0.46, sitting: false, label: "OFC. MARTINEZ" },
            // Officer sitting at the second desk
            { x: room.roomW * 0.40, y: room.roomH * 0.72, sitting: true, label: "DET. WONG" },
            // Officer standing guard next to the criminal's cell (top-right)
            { x: room.roomW * 0.68, y: room.roomH * 0.26, sitting: false, label: "SGT. KELLY" },
          ];
        } else if (door.bTypeIdx === 13 && (!!this.map?.config?.wasteland || !!this.map?.config?.robot)) {
          // WASTELAND / ROBOT CITY TECH LAB: Tech shop with vendor and customers, no enemies
          room.isTechShop = true;
          this._techShopCustomers = [
            // Customer browsing gadgets
            { x: room.roomW * 0.30, y: room.roomH * 0.45, browsing: true },
            // Customer at counter
            { x: room.roomW * 0.55, y: room.roomH * 0.28, atCounter: true },
          ];
        } else if (door.bTypeIdx === 13 && !!this.map?.config?.snow) {
          // FROZEN TUNDRA CRYO LAB: Tech vendor with customers, no enemies
          room.isCryoLab = true;
          this._cryoLabVendor = {
            x: room.roomW * 0.5,
            y: room.roomH * 0.26,
            label: "DR. FROST"
          };
          this._cryoLabCustomers = [
            // Scientist examining samples
            { x: room.roomW * 0.25, y: room.roomH * 0.50, examining: true },
            // Customer at workstation
            { x: room.roomW * 0.70, y: room.roomH * 0.45, atWorkstation: true },
          ];
        } else if (door.bTypeIdx === 22 && !!this.map?.config?.wasteland) {
          // WASTELAND RADIO STATION: Radio workers, no enemies
          room.isRadioStation = true;
          this._radioWorkers = [
            // Technician at left desk
            { x: room.roomW * 0.18, y: room.roomH * 0.52, role: "TECH", sitting: true },
            // Producer at right desk
            { x: room.roomW * 0.72, y: room.roomH * 0.52, role: "PRODUCER", sitting: true },
          ];
        } else if (door.bTypeIdx === 22 && !!this.map?.config?.dino) {
          // DINO WORLD RADIO STATION: Jungle Drums Broadcast — 3 human workers, no enemies
          room.isRadioStation = true;
          this._radioWorkers = [
            { x: room.roomW * 0.20, y: room.roomH * 0.27, role: "TECH",     sitting: true },
            { x: room.roomW * 0.50, y: room.roomH * 0.27, role: "DJ",       sitting: true },
            { x: room.roomW * 0.80, y: room.roomH * 0.27, role: "PRODUCER", sitting: true },
          ];
        } else if (door.bTypeIdx === 22 && !!this.map?.config?.jungle) {
          // JUNGLE SAFARI RADIO STATION: Jungle Beats Radio — 3 human workers, no enemies
          room.isRadioStation = true;
          this._radioWorkers = [
            { x: room.roomW * 0.20, y: room.roomH * 0.27, role: "TECH",     sitting: true },
            { x: room.roomW * 0.50, y: room.roomH * 0.27, role: "DJ",       sitting: true },
            { x: room.roomW * 0.80, y: room.roomH * 0.27, role: "PRODUCER", sitting: true },
          ];
        } else if (door.bTypeIdx === 22 && !!this.map?.config?.desert) {
          // DESERT SANDS RADIO: Pyramid Radio — Egyptian workers drawn inline in furniture
          room.isRadioStation = true;
        } else if (door.bTypeIdx === 1 && !!this.map?.config?.snow) {
          // FROZEN TUNDRA OFFICE: Workers already rendered as furniture, no NPC needed
          room.isSnowOffice = true;
        } else if (door.bTypeIdx === 5 && !!this.map?.config?.snow) {
          // FROZEN TUNDRA PHARMACY: Pharmacist already rendered as furniture, no NPC needed
          room.isSnowPharmacy = true;
        } else if (!this._lifeMode) {
          const key = `${door.tx},${door.ty}`;
          if (!this._visitedRooms.has(key)) {
            const count =
              1 + Math.floor(Math.random() * 2) + Math.floor(this.wave / 3);
            for (let i = 0; i < Math.min(count, 4); i++) {
              const pos = room.randomRoadPos();
              this._indoorBots.push(
                new Bot(pos.x, pos.y, this.wave, "normal", this.map.config),
              );
            }
          }
        }
        // Spawn interactive NPC for all regular buildings
        if (
          !room.isDealership &&
          !room.isCasino &&
          !room.isHome &&
          !room.isMetro &&
          !room.isPoliceStation &&
          !room.isCryoLab &&
          !room.isTechShop &&
          !room.isRadioStation &&
          !room.isSnowOffice &&
          !room.isSnowPharmacy
        ) {
          const bType =
            typeof room._buildingType === "number" ? room._buildingType : 0;
          const isNeonCity   = this.map?.config?.id === "neon_city";
          const isGalactica  = !!this.map?.config?.galactica;
          const isBlitz      = !!this.map?.config?.blitz;
          const isRobotCity  = !!this.map?.config?.robot;
          const isZombie     = !!this.map?.config?.zombie;
          const isWasteland  = !!this.map?.config?.wasteland;
          const isHardcoreN  = !!this.map?.config?.hardcore;
          const isGalOrBlitz = isGalactica || isBlitz;
          const isSpecialMap = isNeonCity || isGalactica || isWasteland || isBlitz || isRobotCity || isHardcoreN;
          // Special positioning for Neon City / Galactica / Blitz / Wasteland / Zombie buildings
          let npcX = room.entryX + 60;
          let npcY = room.entryY - 110;
          if ((isNeonCity || isWasteland) && bType === 12) {
            npcX = room.roomW / 2;
            npcY = room.roomH * 0.48;
          } else if (isNeonCity && bType === 4) {
            npcX = room.roomW / 2;
            npcY = room.roomH * 0.3;
          } else if (isGalactica && bType === 11) {
            // Galactica bar: NPC stands in front of the wide counter (player approaches from below)
            npcX = room.roomW * 0.68;
            npcY = room.roomH * 0.32;
          } else if (isSpecialMap && bType === 11) {
            npcX = room.roomW / 2;
            npcY = room.roomH * 0.34;
          } else if (isGalOrBlitz && bType === 3) {
            npcX = room.roomW / 2;
            npcY = room.roomH * 0.38;
          } else if (isGalOrBlitz && bType === 8) {
            npcX = room.roomW / 2;
            npcY = room.roomH * 0.22;
          } else if (isGalOrBlitz && bType === 0) {
            npcX = room.roomW / 2;
            npcY = room.roomH * 0.17;
          } else if (isGalOrBlitz && bType === 5) {
            npcX = room.roomW / 2;
            npcY = room.roomH * 0.19;
          } else if (isGalOrBlitz && bType === 22) {
            npcX = room.roomW / 2;
            npcY = room.roomH * 0.20;
          } else if (isBlitz) {
            // Blitz: all other workers centered in large room
            npcX = room.roomW / 2;
            npcY = room.roomH * 0.20;
          } else if (isRobotCity) {
            // Robot City: all workers centered in large room
            npcX = room.roomW / 2;
            npcY = room.roomH * 0.20;
          } else if (isZombie) {
            npcX = room.roomW / 2;
            npcY = room.roomH * 0.20;
          } else if (isHardcoreN) {
            // Hardcore: all workers centered in large room
            npcX = room.roomW / 2;
            npcY = room.roomH * 0.20;
          }
          const useGirlRender = isGalOrBlitz && bType === 8;
          // Determine render type for BuildingNPC
          let npcRenderType = false;
          if (isWasteland) {
            npcRenderType = 'wasteland';
          } else if (isGalactica && bType === 11) {
            npcRenderType = 'galactica'; // cosmic human bartender
          } else if (isNeonCity || isZombie || isBlitz || isRobotCity || isHardcoreN || (isGalactica && (bType === 3 || bType === 8 || bType === 0 || bType === 5 || bType === 22))) {
            npcRenderType = true; // neonCity/robot city/hardcore/galactica style
          }
          this._buildingNpcs = [new BuildingNPC(npcX, npcY, bType, npcRenderType, useGirlRender)];
          // For campaign map: hide the NPC circle on rooms that have drawn people,
          // and reposition so the [T] TALK trigger sits on the drawn person
          if (!!this.map?.config?.campaign) {
            const npc = this._buildingNpcs[0];
            if (bType === 17) {
              npc.x = room.roomW * 0.55;
              npc.y = room.roomH * 0.50;
              npc._hidden = true;
            } else if (bType === 23) {
              npc.x = room.roomW / 2 + 20;
              npc.y = room.roomH * 0.55;
              npc._hidden = true;
            }
          }
          // Dino map: hide circle for all rooms — drawn people replace them
          if (!!this.map?.config?.dino) {
            const npc = this._buildingNpcs[0];
            npc._hidden = true;
            // Reposition to where the drawn person stands in each room
            if (bType === 12) { npc.x = room.roomW / 2;       npc.y = room.roomH * 0.44; }
            else if (bType === 13) { npc.x = room.roomW / 2 + 40; npc.y = room.roomH * 0.50; }
            else if (bType === 15) { npc.x = room.roomW * 0.50;   npc.y = room.roomH * 0.45; }
            else if (bType === 18) { npc.x = room.roomW / 2 - 20; npc.y = room.roomH * 0.60; }
            else if (bType === 22) { npc.x = room.roomW * 0.50;   npc.y = room.roomH * 0.60; }
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
        this._indoor = room;
        this._indoorBots = [];
        this._indoorBullets = [];
        this._indoorPickups = [];
        this._metroWave = 0;
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
    if (this._indoor?.isDealership) {
      this._updateDealershipIndoor(dt);
      return;
    }
    if (this._indoor?.isCasino) {
      this._updateCasinoIndoor(dt);
      return;
    }
    const room = this._indoor;
    const offX = (this.canvas.width - room.roomW) / 2;
    const offY = (this.canvas.height - room.roomH) / 2;
    this.input.updateMouseWorld(-offX, -offY);
    this.player.inVehicle = false;
    this.player.update(
      dt,
      this.input,
      room,
      this._indoorBullets,
      this.particles,
    );
    if (this.player.dead && this.state === "playing") this.state = "gameover";
    const _exitThreshold = room.isMetro ? room.roomH - room.S : room.roomH - 5;
    if (this._buildingEntryCooldown <= 0 && this.player.y >= _exitThreshold) {
      this._tryEnterExit();
      return;
    }

    for (const bot of this._indoorBots)
      bot.update(dt, this.player, room, this._indoorBullets, this.particles);
    if (!room.isMetro) {
      for (const npc of this._buildingNpcs) npc.update(dt);
      this._nearBuildingNpc = this._buildingNpcs.some(
        (npc) =>
          Math.hypot(npc.x - this.player.x, npc.y - this.player.y) <
          (npc._interactR || 65),
      );
      if (this.state === "buildingshop") this._buildingShop.update(dt);
    }
    for (const b of this._indoorBullets) b.update(dt, room);

    for (const b of this._indoorBullets) {
      if (!b.isPlayer || b.dead) continue;
      for (const bot of this._indoorBots) {
        if (bot.dead || bot.dying) continue;
        let hit = false;
        if (b.isMelee) {
          const dist = Math.hypot(bot.x - b.x, bot.y - b.y);
          if (dist < b.range) {
            const ang = Math.atan2(bot.y - b.y, bot.x - b.x);
            const diff = Math.abs(
              ((ang - b.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI,
            );
            if (diff < b._arc / 2) hit = true;
          }
        } else {
          hit = circlesOverlap(b.x, b.y, b.radius, bot.x, bot.y, bot.radius);
        }
        if (hit) {
          bot.takeDamage(b.damage, this.particles);
          this.hud.addDamageNumber(
            bot.x,
            bot.y - 30,
            b.damage,
            -offX,
            -offY,
            "#FF6666",
          );
          b.dead = true;
          if (bot.dying) {
            const _dType = bot._isZombie
              ? "zombie_blood"
              : this.map.config.snow
                ? "ice_blood"
                : this.map.config.ocean
                  ? "water_blood"
                  : "blood";
            const _dCount = bot._isZombie ? 3 : 1;
            for (let _di = 0; _di < _dCount; _di++) {
              const _dOx = (Math.random() - 0.5) * 40,
                _dOy = (Math.random() - 0.5) * 40;
              this.decals.push(
                new Decal(
                  bot.x + (_di === 0 ? 0 : _dOx),
                  bot.y + (_di === 0 ? 0 : _dOy),
                  _dType,
                ),
              );
            }
            const mult = this._streakMultiplier();
            const wMult =
              (this.player._wealthMult || 1) *
              (this._hardcoreMode ? 3 : 1) *
              (this._blitzMode ? 5 : 1);
            const earned = Math.round(
              CONFIG.MONEY_PER_KILL * bot._cfg.moneyMult * mult * wMult,
            );
            this.money += earned;
            this._achStats.moneyEarned += earned;
            this.kills++;
            this.hud.addDamageNumber(
              bot.x,
              bot.y - 56,
              earned,
              -offX,
              -offY,
              mult > 1 ? "#FF8800" : "#FFD700",
            );
            if (b.isMelee) this._achStats.knifeKills++;
            this._onKill();
            if (this.player._leechHp)
              this.player.health = Math.min(
                this.player.maxHealth,
                this.player.health + this.player._leechHp,
              );
          }
          if (!b.isMelee) break;
        }
      }
    }

    if (!this.player.dead) {
      for (const b of this._indoorBullets) {
        if (b.isPlayer || b.dead) continue;
        if (
          circlesOverlap(
            b.x,
            b.y,
            b.radius,
            this.player.x,
            this.player.y,
            this.player.radius,
          )
        ) {
          const dmg = this.player.takeDamage(b.damage, this.hud);
          if (dmg) {
            window.audio?.playerHit();
            this.hud.addDamageNumber(
              this.player.x,
              this.player.y - 30,
              dmg,
              -offX,
              -offY,
              "#FF4444",
            );
            this._killStreak = 0;
            this._streakTimer = 0;
          }
          b.dead = true;
        }
      }
    }

    if (!room.isMetro) {
      const doorKey = `${room.doorDoor.tx},${room.doorDoor.ty}`;
      if (
        !this._visitedRooms.has(doorKey) &&
        this._indoorBots.length > 0 &&
        this._indoorBots.filter((b) => !b.dead).length === 0
      ) {
        this._visitedRooms.add(doorKey);
        this._achStats.buildingsCleared++;
        this._checkAchievements();
      }
    }

    this._indoorBots = this._indoorBots.filter((b) => !b.dead);
    this._indoorBullets = this._indoorBullets.filter((b) => !b.dead);

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
    this.particles = this.particles.filter((p) => !p.dead);
    if (this._streakTimer > 0) {
      this._streakTimer -= dt;
      if (this._streakTimer <= 0) this._killStreak = 0;
    }
    if (this._streakPopup.timer > 0) this._streakPopup.timer -= dt;
    this.weather.update(dt, this.canvas.width, this.canvas.height);
    this.hud.update(dt);
  }

  _updateDealershipIndoor(dt) {
    const room = this._indoor;
    const offX = (this.canvas.width - room.roomW) / 2;
    const offY = (this.canvas.height - room.roomH) / 2;
    this.input.updateMouseWorld(-offX, -offY);
    this.player.inVehicle = false;
    this.player.update(
      dt,
      this.input,
      room,
      this._indoorBullets,
      this.particles,
    );
    if (this.player.dead && this.state === "playing") this.state = "gameover";
    if (this._buildingEntryCooldown <= 0 && this.player.y >= room.roomH - 5) {
      this._tryEnterExit();
      return;
    }
    for (const b of this._indoorBullets) b.update(dt, room);
    this._indoorBullets = this._indoorBullets.filter((b) => !b.dead);
    for (const sp of this._salespersons) sp.update(dt);
    this._nearSalesperson = this._salespersons.some(
      (sp) => Math.hypot(sp.x - this.player.x, sp.y - this.player.y) < 60,
    );
    this.weather.update(dt, this.canvas.width, this.canvas.height);
    if (this._streakTimer > 0) {
      this._streakTimer -= dt;
      if (this._streakTimer <= 0) this._killStreak = 0;
    }
    if (this._streakPopup.timer > 0) this._streakPopup.timer -= dt;
    this.hud.update(dt);
  }

  _updateCasinoIndoor(dt) {
    const room = this._indoor;
    const offX = (this.canvas.width - room.roomW) / 2;
    const offY = (this.canvas.height - room.roomH) / 2;
    this.input.updateMouseWorld(-offX, -offY);
    this.player.inVehicle = false;
    if (this.state === "playing") {
      this.player.update(
        dt,
        this.input,
        room,
        this._indoorBullets,
        this.particles,
      );
      if (this.player.dead) this.state = "gameover";
      if (this._buildingEntryCooldown <= 0 && this.player.y >= room.roomH - 5) {
        this._tryEnterExit();
        return;
      }
    }
    for (const h of this._casinoHosts) h.update(dt);
    this._nearCasinoHost = this._casinoHosts.some(
      (h) => Math.hypot(h.x - this.player.x, h.y - this.player.y) < 65,
    );
    this.weather.update(dt, this.canvas.width, this.canvas.height);
    if (this._streakTimer > 0) {
      this._streakTimer -= dt;
      if (this._streakTimer <= 0) this._killStreak = 0;
    }
    if (this._streakPopup.timer > 0) this._streakPopup.timer -= dt;
    this.hud.update(dt);
  }

  _renderIndoorScene(ctx, W, H, shake) {
    if (this._indoor?.isDealership) {
      this._renderDealershipIndoor(ctx, W, H, shake);
      return;
    }
    if (this._indoor?.isCasino) {
      this._renderCasinoIndoor(ctx, W, H, shake);
      return;
    }
    if (this._indoor?.isMetro) {
      this._renderMetroIndoor(ctx, W, H, shake);
      return;
    }
    const room = this._indoor;
    const offX = (W - room.roomW) / 2;
    const offY = (H - room.roomH) / 2;
    const S = room.S;
    const _isGalactica = !!this.map.config.galactica;
    const _isZombie    = !!this.map.config.zombie;
    const _isWasteland = !!this.map.config.wasteland;
    const _t = performance.now() / 1000;
    ctx.fillStyle = _isGalactica ? "#00000e" : _isZombie ? "#030803" : "#050508";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(offX + shake.x, offY + shake.y);

    if (_isGalactica) {
      // ── GALACTICA: cosmic deep-space interior tiles ──
      for (let ty = 0; ty < room.H; ty++) {
        for (let tx = 0; tx < room.W; tx++) {
          const tile = room.layout[ty][tx];
          const px = tx * S,
            py = ty * S;
          const seed = tx * 17 + ty * 11;
          if (tile === 0) {
            // Floor — deep space panels
            ctx.fillStyle = (tx + ty) % 2 === 0 ? "#05031a" : "#030114";
            ctx.fillRect(px, py, S, S);
            // Purple grid lines
            ctx.strokeStyle = "rgba(140,70,240,0.08)";
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, S, S);
            // Star inlays
            if (seed % 7 === 0) {
              const twinkle = Math.sin(_t * 3 + seed) * 0.5 + 0.5;
              ctx.fillStyle = `rgba(220,200,255,${0.06 + twinkle * 0.14})`;
              ctx.beginPath();
              ctx.arc(
                px + (seed % (S - 4)) + 2,
                py + ((seed * 3) % (S - 4)) + 2,
                1,
                0,
                Math.PI * 2,
              );
              ctx.fill();
            }
            // Nebula glow
            if (seed % 13 === 0) {
              const pulse = Math.sin(_t * 1.0 + seed * 0.4) * 0.5 + 0.5;
              ctx.fillStyle = `rgba(100,50,200,${0.015 + pulse * 0.025})`;
              ctx.fillRect(px + 3, py + 3, S - 6, S - 6);
            }
          } else if (tile === 2) {
            // Furniture tile — glowing alien console
            ctx.fillStyle = "#05031a";
            ctx.fillRect(px, py, S, S);
            ctx.fillStyle = "#110630";
            ctx.fillRect(px + 4, py + 4, S - 8, S - 8);
            ctx.strokeStyle = "#8844FF";
            ctx.lineWidth = 1;
            ctx.shadowColor = "#8844FF";
            ctx.shadowBlur = 6;
            ctx.strokeRect(px + 4, py + 4, S - 8, S - 8);
            ctx.shadowBlur = 0;
            // Center LED
            const lp = Math.sin(_t * 2 + seed) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(170,100,255,${0.5 + lp * 0.5})`;
            ctx.beginPath();
            ctx.arc(px + S / 2, py + S / 2, 3, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Wall — void panels with purple trim
            ctx.fillStyle = "#04020c";
            ctx.fillRect(px, py, S, S);
            if ((tx + ty) % 4 === 0) {
              ctx.fillStyle = "rgba(140,70,220,0.14)";
              ctx.fillRect(px + S / 2 - 1, py, 2, S);
            }
          }
        }
      }
      // Room border glow
      ctx.strokeStyle = "rgba(170,100,255,0.5)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#AA88FF";
      ctx.shadowBlur = 14;
      ctx.strokeRect(
        S + 1,
        S + 1,
        room.roomW - S * 2 - 2,
        room.roomH - S * 2 - 2,
      );
      ctx.shadowBlur = 0;
    } else if (_isZombie) {
      // ── ZOMBIE: decayed infected interior ──
      for (let ty = 0; ty < room.H; ty++) {
        for (let tx = 0; tx < room.W; tx++) {
          const zt = room.layout[ty][tx];
          const px = tx * S, py = ty * S;
          const seed = tx * 17 + ty * 11;
          if (zt === 0) {
            // Cracked mossy floor
            ctx.fillStyle = (tx + ty) % 2 === 0 ? "#0b140b" : "#0a120a";
            ctx.fillRect(px, py, S, S);
            // Slab joints
            ctx.fillStyle = "rgba(0,30,0,0.35)";
            ctx.fillRect(px, py, S, 1);
            ctx.fillRect(px, py, 1, S);
            // Moss growth
            if (seed % 7 === 0) {
              const mPulse = 0.08 + 0.05 * Math.sin(_t * 0.9 + seed);
              ctx.fillStyle = `rgba(30,160,40,${mPulse})`;
              ctx.beginPath();
              ctx.arc(px + (seed % (S - 4)) + 2, py + ((seed * 3) % (S - 4)) + 2, 3, 0, Math.PI * 2);
              ctx.fill();
            }
            // Blood pool
            if (seed % 21 === 0) {
              ctx.fillStyle = "rgba(110,8,8,0.20)";
              ctx.beginPath();
              ctx.ellipse(px + S * 0.4, py + S * 0.5, S * 0.24, S * 0.14, 0.3, 0, Math.PI * 2);
              ctx.fill();
            }
            // Green seepage puddle
            if (seed % 17 === 0) {
              ctx.fillStyle = "rgba(30,150,40,0.12)";
              ctx.beginPath();
              ctx.ellipse(px + S * 0.6, py + S * 0.55, S * 0.18, S * 0.10, -0.4, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (zt === 2) {
            // Furniture tile — broken/overgrown debris
            ctx.fillStyle = "#0b140b";
            ctx.fillRect(px, py, S, S);
            ctx.fillStyle = "#14201a";
            ctx.fillRect(px + 4, py + 4, S - 8, S - 8);
            ctx.strokeStyle = "#2a6030";
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 4, py + 4, S - 8, S - 8);
            // Biohazard pulse glow
            const gp = Math.sin(_t * 1.6 + seed) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(44,200,44,${0.10 + gp * 0.12})`;
            ctx.beginPath();
            ctx.arc(px + S / 2, py + S / 2, 3, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Wall — crumbling infected concrete
            ctx.fillStyle = "#070f07";
            ctx.fillRect(px, py, S, S);
            // Green seepage vein on wall
            if ((tx + ty) % 4 === 0) {
              ctx.fillStyle = "rgba(40,160,40,0.14)";
              ctx.fillRect(px + S / 2 - 1, py, 2, S);
            }
            // Crack
            if ((tx * 3 + ty * 5) % 7 === 0) {
              ctx.fillStyle = "rgba(0,20,0,0.30)";
              ctx.fillRect(px, py + S / 2 - 1, S, 1);
            }
          }
        }
      }
      // Room border — biohazard green glow
      ctx.strokeStyle = "rgba(44,200,44,0.50)";
      ctx.lineWidth = 2;
      ctx.strokeRect(S + 1, S + 1, room.roomW - S * 2 - 2, room.roomH - S * 2 - 2);
      ctx.strokeStyle = "rgba(44,255,44,0.12)";
      ctx.lineWidth = 1;
      ctx.strokeRect(S + 4, S + 4, room.roomW - S * 2 - 8, room.roomH - S * 2 - 8);
    } else {
      // ── DEFAULT interior tiles ──
      for (let ty = 0; ty < room.H; ty++) {
        for (let tx = 0; tx < room.W; tx++) {
          const t = room.layout[ty][tx];
          const px = tx * S,
            py = ty * S;
          if (t === 0) {
            ctx.fillStyle = "#1c1c22";
            ctx.fillRect(px, py, S, S);
            ctx.fillStyle = "rgba(255,255,255,0.025)";
            ctx.fillRect(px, py, S, 1);
            ctx.fillRect(px, py, 1, S);
          } else if (t === 2) {
            ctx.fillStyle = "#1c1c22";
            ctx.fillRect(px, py, S, S);
            ctx.fillStyle = "#3a2a1a";
            ctx.fillRect(px + 5, py + 5, S - 10, S - 10);
            ctx.strokeStyle = "#5a3a22";
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 5, py + 5, S - 10, S - 10);
          } else {
            ctx.fillStyle = "#14141e";
            ctx.fillRect(px, py, S, S);
            ctx.fillStyle = "rgba(80,80,140,0.10)";
            ctx.fillRect(px, py, S, 3);
            ctx.fillRect(px, py, 3, S);
          }
        }
      }
    }

    ctx.save();
    try {
      this._renderIndoorFurniture(ctx, room);
    } catch (e) {
      console.error("furniture render error:", e);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    for (const d of this.decals) d.render(ctx);
    for (const p of this._indoorPickups) p.render(ctx);
    for (const p of this.particles) p.render(ctx);
    for (const b of this._indoorBullets) if (!b.isPlayer) b.render(ctx);
    for (const bot of this._indoorBots) bot.render(ctx);
    for (const b of this._indoorBullets) if (b.isPlayer) b.render(ctx);
    if (!this.player.dead) this.player.render(ctx);
    for (const npc of this._buildingNpcs) npc.render(ctx);
    // Render police officers
    for (const officer of this._policeOfficers) {
      this._renderPoliceOfficer(ctx, officer);
    }
    // Render tech shop customers
    for (const customer of this._techShopCustomers) {
      this._renderTechShopCustomer(ctx, customer);
    }
    // Render radio station workers
    for (const worker of this._radioWorkers) {
      this._renderRadioWorker(ctx, worker);
    }
    // Render cryo lab vendor and customers
    if (this._cryoLabVendor) {
      this._renderCryoLabVendor(ctx, this._cryoLabVendor);
    }
    for (const customer of this._cryoLabCustomers) {
      this._renderCryoLabCustomer(ctx, customer);
    }
    ctx.save();
    ctx.font = "bold 11px Orbitron, monospace";
    ctx.textAlign = "center";
    if (_isGalactica) {
      ctx.fillStyle = "#CC99FF";
      ctx.shadowColor = "#AA88FF";
      ctx.shadowBlur = 12;
    } else if (_isZombie) {
      ctx.fillStyle = "#88FF88";
      ctx.shadowColor = "#44FF44";
      ctx.shadowBlur = 10;
    } else if (_isWasteland) {
      ctx.fillStyle = "#c0a080";
      ctx.shadowColor = "#8a6040";
      ctx.shadowBlur = 8;
    } else {
      ctx.fillStyle = "#FFFFAA";
      ctx.shadowColor = "#FFFF00";
      ctx.shadowBlur = 10;
    }
    ctx.fillText("[E] EXIT", room.entryX, room.roomH - 8);
    ctx.restore();
    ctx.restore();
  }

  _renderPoliceOfficer(ctx, officer) {
    const { x, y, sitting, label } = officer;
    const t = performance.now() / 1000;
    const breathe = Math.sin(t * 1.5) * 1;
    const sway = Math.sin(t * 0.8 + x * 0.1) * 1.2;

    ctx.save();
    ctx.translate(x + sway, y);

    // Shadow
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(2, sitting ? 14 : 28, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (sitting) {
      // ═══ SITTING POSE ═══
      // Legs (bent, dark blue pants)
      ctx.fillStyle = "#1a2a4a";
      ctx.fillRect(-8, 4, 6, 10);
      ctx.fillRect(2, 4, 6, 10);

      // Shoes
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(-9, 12, 8, 4);
      ctx.fillRect(1, 12, 8, 4);

      // Body/Torso (police uniform shirt)
      const bodyGrad = ctx.createLinearGradient(-10, -22, 10, 6);
      bodyGrad.addColorStop(0, "#2a3a6a");
      bodyGrad.addColorStop(0.5, "#1a2a5a");
      bodyGrad.addColorStop(1, "#0a1a4a");
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.roundRect(-11, -20 + breathe * 0.3, 22, 26, 3);
      ctx.fill();

      // Shirt collar
      ctx.fillStyle = "#3a4a7a";
      ctx.beginPath();
      ctx.moveTo(-5, -18 + breathe * 0.3);
      ctx.lineTo(0, -14 + breathe * 0.3);
      ctx.lineTo(5, -18 + breathe * 0.3);
      ctx.lineTo(4, -20 + breathe * 0.3);
      ctx.lineTo(-4, -20 + breathe * 0.3);
      ctx.closePath();
      ctx.fill();

      // Badge on chest
      ctx.fillStyle = "#FFD700";
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(-6, -12 + breathe * 0.3);
      ctx.lineTo(-3, -8 + breathe * 0.3);
      ctx.lineTo(-6, -4 + breathe * 0.3);
      ctx.lineTo(-9, -8 + breathe * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Arms resting on desk
      ctx.fillStyle = "#1a2a5a";
      ctx.fillRect(-15, -8 + breathe * 0.3, 5, 12);
      ctx.fillRect(10, -8 + breathe * 0.3, 5, 12);

      // Hands
      ctx.fillStyle = "#DDCCAA";
      ctx.beginPath();
      ctx.arc(-12.5, 6 + breathe * 0.3, 3, 0, Math.PI * 2);
      ctx.arc(12.5, 6 + breathe * 0.3, 3, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // ═══ STANDING POSE ═══
      // Legs (dark blue uniform pants)
      ctx.fillStyle = "#1a2a4a";
      ctx.fillRect(-7, 8, 6, 18);
      ctx.fillRect(1, 8, 6, 18);

      // Shoes (black police shoes)
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(-8, 24, 8, 5);
      ctx.fillRect(0, 24, 8, 5);
      // Shoe shine
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(-7, 25, 6, 2);
      ctx.fillRect(1, 25, 6, 2);

      // Body/Torso (police uniform shirt)
      const bodyGrad = ctx.createLinearGradient(-12, -26, 12, 10);
      bodyGrad.addColorStop(0, "#2a3a6a");
      bodyGrad.addColorStop(0.5, "#1a2a5a");
      bodyGrad.addColorStop(1, "#0a1a4a");
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.roundRect(-12, -24 + breathe * 0.3, 24, 34, 3);
      ctx.fill();

      // Shirt details - buttons
      ctx.fillStyle = "#4a5a8a";
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(0, -18 + i * 8 + breathe * 0.3, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Collar
      ctx.fillStyle = "#3a4a7a";
      ctx.beginPath();
      ctx.moveTo(-6, -22 + breathe * 0.3);
      ctx.lineTo(0, -17 + breathe * 0.3);
      ctx.lineTo(6, -22 + breathe * 0.3);
      ctx.lineTo(5, -24 + breathe * 0.3);
      ctx.lineTo(-5, -24 + breathe * 0.3);
      ctx.closePath();
      ctx.fill();

      // Badge on chest
      ctx.fillStyle = "#FFD700";
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.moveTo(-7, -14 + breathe * 0.3);
      ctx.lineTo(-4, -9 + breathe * 0.3);
      ctx.lineTo(-7, -4 + breathe * 0.3);
      ctx.lineTo(-10, -9 + breathe * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Duty belt
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(-12, 6 + breathe * 0.3, 24, 4);
      ctx.fillStyle = "#FFD700";
      ctx.fillRect(-2, 7 + breathe * 0.3, 4, 2); // belt buckle

      // Arms
      ctx.fillStyle = "#1a2a5a";
      ctx.fillRect(-16, -20 + breathe * 0.3, 5, 18);
      ctx.fillRect(11, -20 + breathe * 0.3, 5, 18);

      // Hands
      ctx.fillStyle = "#DDCCAA";
      ctx.beginPath();
      ctx.arc(-13.5, 0 + breathe * 0.3, 3.5, 0, Math.PI * 2);
      ctx.arc(13.5, 0 + breathe * 0.3, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Neck
    ctx.fillStyle = "#DDCCAA";
    ctx.fillRect(-3, sitting ? -24 : -28, 6, 5);

    // Head
    const headY = sitting ? -32 : -36;
    const headGrad = ctx.createRadialGradient(-2, headY + breathe * 0.2, 2, 0, headY + 2 + breathe * 0.2, 11);
    headGrad.addColorStop(0, "#EEDDCC");
    headGrad.addColorStop(1, "#CCBBAA");
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.ellipse(0, headY + breathe * 0.2, 10, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair (short, professional)
    ctx.fillStyle = "#2a2a2a";
    ctx.beginPath();
    ctx.ellipse(0, headY - 6 + breathe * 0.2, 9, 5, 0, Math.PI, 0);
    ctx.fill();
    // Side hair
    ctx.fillRect(-10, headY - 4 + breathe * 0.2, 3, 6);
    ctx.fillRect(7, headY - 4 + breathe * 0.2, 3, 6);

    // Police cap
    ctx.fillStyle = "#0a1a3a";
    ctx.beginPath();
    ctx.ellipse(0, headY - 8 + breathe * 0.2, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-11, headY - 10 + breathe * 0.2, 22, 4);
    // Cap visor
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.ellipse(0, headY - 6 + breathe * 0.2, 10, 3, 0, 0, Math.PI);
    ctx.fill();
    // Cap badge
    ctx.fillStyle = "#FFD700";
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.arc(0, headY - 8 + breathe * 0.2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Eyes
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.ellipse(-4, headY + breathe * 0.2, 2.5, 2, 0, 0, Math.PI * 2);
    ctx.ellipse(4, headY + breathe * 0.2, 2.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a3020";
    ctx.beginPath();
    ctx.arc(-4, headY + breathe * 0.2, 1.3, 0, Math.PI * 2);
    ctx.arc(4, headY + breathe * 0.2, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Serious expression
    ctx.strokeStyle = "#AA8877";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-3, headY + 6 + breathe * 0.2);
    ctx.lineTo(3, headY + 6 + breathe * 0.2);
    ctx.stroke();

    // Name tag
    ctx.fillStyle = "#4477FF";
    ctx.shadowColor = "#4477FF";
    ctx.shadowBlur = 6;
    ctx.font = "bold 7px Orbitron, monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, 0, sitting ? 24 : 40);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  _renderTechShopCustomer(ctx, customer) {
    const { x, y, browsing, atCounter } = customer;
    const t = performance.now() / 1000;
    const breathe = Math.sin(t * 1.3 + x * 0.1) * 1;
    const sway = Math.sin(t * 0.6 + y * 0.1) * 1.5;

    ctx.save();
    ctx.translate(x + sway, y);

    // Shadow
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(2, 28, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Legs (cargo pants)
    ctx.fillStyle = "#4a4540";
    ctx.fillRect(-6, 10, 5, 16);
    ctx.fillRect(1, 10, 5, 16);

    // Boots
    ctx.fillStyle = "#2a2420";
    ctx.fillRect(-7, 24, 7, 5);
    ctx.fillRect(0, 24, 7, 5);

    // Body (worn jacket)
    const bodyGrad = ctx.createLinearGradient(-10, -18, 10, 12);
    bodyGrad.addColorStop(0, "#5a5550");
    bodyGrad.addColorStop(0.5, "#4a4540");
    bodyGrad.addColorStop(1, "#3a3530");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(-10, -16 + breathe * 0.3, 20, 28, 3);
    ctx.fill();

    // Undershirt
    ctx.fillStyle = "#6a6560";
    ctx.beginPath();
    ctx.moveTo(-4, -14 + breathe * 0.3);
    ctx.lineTo(0, -8 + breathe * 0.3);
    ctx.lineTo(4, -14 + breathe * 0.3);
    ctx.closePath();
    ctx.fill();

    // Arms
    ctx.fillStyle = "#4a4540";
    ctx.fillRect(-14, -12 + breathe * 0.3, 5, 14);
    ctx.fillRect(9, -12 + breathe * 0.3, 5, 14);

    // Hands
    ctx.fillStyle = "#C4A090";
    ctx.beginPath();
    ctx.arc(-11.5, 4 + breathe * 0.3, 3, 0, Math.PI * 2);
    ctx.arc(11.5, 4 + breathe * 0.3, 3, 0, Math.PI * 2);
    ctx.fill();

    // If browsing, show gadget in hand
    if (browsing) {
      ctx.fillStyle = "#2a2a3a";
      ctx.fillRect(-14, 0 + breathe * 0.3, 8, 12);
      ctx.fillStyle = "#00FFCC";
      ctx.fillRect(-13, 2 + breathe * 0.3, 6, 8);
    }

    // Neck
    ctx.fillStyle = "#C4A090";
    ctx.fillRect(-3, -20, 6, 5);

    // Head
    const headY = -28;
    const headGrad = ctx.createRadialGradient(-2, headY + breathe * 0.2, 2, 0, headY + 2 + breathe * 0.2, 10);
    headGrad.addColorStop(0, "#D4B8A0");
    headGrad.addColorStop(1, "#B49880");
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.ellipse(0, headY + breathe * 0.2, 9, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair (messy)
    ctx.fillStyle = "#3a3530";
    ctx.beginPath();
    ctx.ellipse(0, headY - 5 + breathe * 0.2, 8, 5, 0, Math.PI, 0);
    ctx.fill();
    // Messy strands
    ctx.fillStyle = "#4a4540";
    ctx.beginPath();
    ctx.moveTo(-7, headY - 3 + breathe * 0.2);
    ctx.quadraticCurveTo(-9, headY + 2 + breathe * 0.2, -6, headY + 4 + breathe * 0.2);
    ctx.lineTo(-5, headY - 1 + breathe * 0.2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.ellipse(-3, headY + breathe * 0.2, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.ellipse(3, headY + breathe * 0.2, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a3020";
    ctx.beginPath();
    ctx.arc(-3, headY + breathe * 0.2, 1, 0, Math.PI * 2);
    ctx.arc(3, headY + breathe * 0.2, 1, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = "#8a6655";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2, headY + 5 + breathe * 0.2);
    ctx.lineTo(2, headY + 5 + breathe * 0.2);
    ctx.stroke();

    ctx.restore();
  }

  _renderRadioWorker(ctx, worker) {
    const { x, y, role, sitting } = worker;
    const t = performance.now() / 1000;
    const breathe = Math.sin(t * 1.4 + x * 0.1) * 1;
    const sway = Math.sin(t * 0.7 + y * 0.1) * 1;
    const isDino   = !!this.map?.config?.dino;
    const isJungle = !!this.map?.config?.jungle;
    const isJungleTheme = isDino || isJungle;

    // Jungle safari outfit colors vs default
    const pants    = isJungleTheme ? "#3a5020" : "#3a3530";
    const shoes    = isJungleTheme ? "#2a1a08" : "#2a2520";
    const bodyColor = isJungleTheme
      ? (role === "DJ" ? "#4a7a1a" : role === "TECH" ? "#3a6014" : "#2a5a18")
      : (role === "DJ" ? "#2a4a6a" : role === "TECH" ? "#4a3a2a" : "#3a2a4a");
    const hairColor = isJungleTheme
      ? (role === "DJ" ? "#1a0a00" : role === "TECH" ? "#3a2808" : "#2a1808")
      : (role === "DJ" ? "#1a1a2a" : role === "TECH" ? "#4a3a2a" : "#2a2a3a");
    const labelCol  = isJungleTheme ? "#66DD44" : "#FF88CC";
    const skinTone  = isJungleTheme ? "#C8A060" : "#DDBB99";
    const handTone  = isJungleTheme ? "#C8A060" : "#CCAA88";

    ctx.save();
    ctx.translate(x + sway, y);

    // Shadow
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(2, sitting ? 16 : 28, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (sitting) {
      // Sitting pose
      ctx.fillStyle = pants;
      ctx.fillRect(-7, 4, 5, 10);
      ctx.fillRect(2, 4, 5, 10);

      // Body
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.roundRect(-9, -16 + breathe * 0.3, 18, 22, 3);
      ctx.fill();
      // Jungle: open collar detail
      if (isJungleTheme) {
        ctx.strokeStyle = "rgba(255,204,68,0.4)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-3, -16 + breathe * 0.3); ctx.lineTo(0, -10 + breathe * 0.3); ctx.lineTo(3, -16 + breathe * 0.3); ctx.stroke();
      }

      // Arms on desk
      ctx.fillStyle = bodyColor;
      ctx.fillRect(-13, -6 + breathe * 0.3, 5, 12);
      ctx.fillRect(8, -6 + breathe * 0.3, 5, 12);

      // Hands
      ctx.fillStyle = handTone;
      ctx.beginPath();
      ctx.arc(-10.5, 8 + breathe * 0.3, 3, 0, Math.PI * 2);
      ctx.arc(10.5, 8 + breathe * 0.3, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Standing pose
      ctx.fillStyle = pants;
      ctx.fillRect(-6, 8, 5, 18);
      ctx.fillRect(1, 8, 5, 18);

      ctx.fillStyle = shoes;
      ctx.fillRect(-7, 24, 7, 5);
      ctx.fillRect(0, 24, 7, 5);

      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.roundRect(-10, -20 + breathe * 0.3, 20, 30, 3);
      ctx.fill();

      ctx.fillRect(-14, -14 + breathe * 0.3, 5, 16);
      ctx.fillRect(9, -14 + breathe * 0.3, 5, 16);

      ctx.fillStyle = handTone;
      ctx.beginPath();
      ctx.arc(-11.5, 4 + breathe * 0.3, 3, 0, Math.PI * 2);
      ctx.arc(11.5, 4 + breathe * 0.3, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Neck
    ctx.fillStyle = handTone;
    ctx.fillRect(-3, sitting ? -20 : -24, 6, 5);

    // Head
    const headY = sitting ? -28 : -32;
    ctx.fillStyle = skinTone;
    ctx.beginPath();
    ctx.ellipse(0, headY + breathe * 0.2, 9, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.ellipse(0, headY - 5 + breathe * 0.2, 8, 5, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-8, headY - 3 + breathe * 0.2, 16, 5);

    // Jungle safari hat for TECH role
    if (isJungleTheme && role === "TECH") {
      ctx.fillStyle = "#8a6020";
      ctx.beginPath(); ctx.ellipse(0, headY - 8 + breathe * 0.2, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#7a5018";
      ctx.beginPath(); ctx.roundRect(-7, headY - 16 + breathe * 0.2, 14, 10, 2); ctx.fill();
      ctx.strokeStyle = "#a07030"; ctx.lineWidth = 1; ctx.stroke();
    }

    // Headphones for DJ (jungle: wooden-ring style)
    if (role === "DJ") {
      const hpCol  = isJungleTheme ? "#5a3a10" : "#2a2a30";
      const hpStroke = isJungleTheme ? "#8a6030" : "#4a4a50";
      ctx.fillStyle = hpCol;
      ctx.strokeStyle = hpStroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, headY - 4 + breathe * 0.2, 11, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(-11, headY + breathe * 0.2, 4, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(11, headY + breathe * 0.2, 4, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyes
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.ellipse(-3, headY + breathe * 0.2, 2, 1.8, 0, 0, Math.PI * 2);
    ctx.ellipse(3, headY + breathe * 0.2, 2, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isJungleTheme ? "#1a0800" : "#3a3020";
    ctx.beginPath();
    ctx.arc(-3, headY + breathe * 0.2, 1, 0, Math.PI * 2);
    ctx.arc(3, headY + breathe * 0.2, 1, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = "#AA8877";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2, headY + 5 + breathe * 0.2);
    ctx.lineTo(2, headY + 5 + breathe * 0.2);
    ctx.stroke();

    // Role label
    ctx.fillStyle = labelCol;
    ctx.shadowColor = labelCol;
    ctx.shadowBlur = 5;
    ctx.font = "bold 6px Orbitron, monospace";
    ctx.textAlign = "center";
    ctx.fillText(role, 0, sitting ? 26 : 42);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  _renderCryoLabVendor(ctx, vendor) {
    const { x, y, label } = vendor;
    const t = performance.now() / 1000;
    const breathe = Math.sin(t * 1.2) * 1;
    const sway = Math.sin(t * 0.6) * 1;

    ctx.save();
    ctx.translate(x + sway, y);

    // Shadow
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(2, 30, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Legs (winter pants)
    ctx.fillStyle = "#2a3a4a";
    ctx.fillRect(-6, 10, 5, 18);
    ctx.fillRect(1, 10, 5, 18);

    // Winter boots
    ctx.fillStyle = "#1a2530";
    ctx.fillRect(-8, 26, 7, 5);
    ctx.fillRect(1, 26, 7, 5);
    ctx.fillStyle = "#CCDDEE";
    ctx.fillRect(-8, 25, 7, 2);
    ctx.fillRect(1, 25, 7, 2);

    // Body (lab coat over winter sweater)
    ctx.fillStyle = "#EEFFFF";
    ctx.beginPath();
    ctx.roundRect(-12, -18 + breathe * 0.3, 24, 30, 3);
    ctx.fill();
    // Lab coat collar
    ctx.fillStyle = "#DDEEFF";
    ctx.beginPath();
    ctx.moveTo(-8, -16 + breathe * 0.3);
    ctx.lineTo(0, -10 + breathe * 0.3);
    ctx.lineTo(8, -16 + breathe * 0.3);
    ctx.closePath();
    ctx.fill();

    // Arms (lab coat sleeves)
    ctx.fillStyle = "#EEFFFF";
    ctx.fillRect(-16, -12 + breathe * 0.3, 5, 16);
    ctx.fillRect(11, -12 + breathe * 0.3, 5, 16);

    // Gloved hands
    ctx.fillStyle = "#88BBDD";
    ctx.beginPath();
    ctx.arc(-13.5, 6 + breathe * 0.3, 4, 0, Math.PI * 2);
    ctx.arc(13.5, 6 + breathe * 0.3, 4, 0, Math.PI * 2);
    ctx.fill();

    // Neck
    ctx.fillStyle = "#DDCCBB";
    ctx.fillRect(-3, -22, 6, 5);

    // Head
    ctx.fillStyle = "#EEDDCC";
    ctx.beginPath();
    ctx.ellipse(0, -30 + breathe * 0.2, 10, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Safety goggles
    ctx.fillStyle = "#88DDFF";
    ctx.strokeStyle = "#4488AA";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(-4, -30 + breathe * 0.2, 4, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(4, -30 + breathe * 0.2, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Goggle band
    ctx.strokeStyle = "#4488AA";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -32 + breathe * 0.2, 11, Math.PI + 0.3, -0.3);
    ctx.stroke();

    // Hair (neat, professional)
    ctx.fillStyle = "#554433";
    ctx.beginPath();
    ctx.ellipse(0, -38 + breathe * 0.2, 9, 5, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-9, -36 + breathe * 0.2, 18, 4);

    // Slight smile
    ctx.strokeStyle = "#AA8877";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -26 + breathe * 0.2, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Clipboard
    ctx.fillStyle = "#2a3a4a";
    ctx.fillRect(-18, -4 + breathe * 0.3, 8, 12);
    ctx.fillStyle = "#EEFFFF";
    ctx.fillRect(-17, -3 + breathe * 0.3, 6, 9);
    ctx.fillStyle = "#88AACC";
    ctx.fillRect(-16, -1 + breathe * 0.3, 4, 1);
    ctx.fillRect(-16, 2 + breathe * 0.3, 4, 1);

    // Name badge
    ctx.fillStyle = "#4477AA";
    ctx.fillRect(6, -14 + breathe * 0.3, 12, 8);
    ctx.fillStyle = "#EEFFFF";
    ctx.font = "bold 4px monospace";
    ctx.textAlign = "center";
    ctx.fillText("DR", 12, -9 + breathe * 0.3);

    // Label
    ctx.fillStyle = "#AADDFF";
    ctx.shadowColor = "#66BBFF";
    ctx.shadowBlur = 8;
    ctx.font = "bold 7px Orbitron, monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, 0, -48 + breathe * 0.2);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  _renderCryoLabCustomer(ctx, customer) {
    const { x, y, examining, atWorkstation } = customer;
    const t = performance.now() / 1000;
    const breathe = Math.sin(t * 1.3 + x * 0.1) * 1;
    const sway = Math.sin(t * 0.7 + y * 0.1) * 1;

    ctx.save();
    ctx.translate(x + sway, y);

    // Shadow
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(2, 28, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Legs (winter pants)
    ctx.fillStyle = "#2a3a4a";
    ctx.fillRect(-5, 8, 4, 16);
    ctx.fillRect(1, 8, 4, 16);

    // Winter boots
    ctx.fillStyle = "#1a2530";
    ctx.fillRect(-6, 22, 6, 5);
    ctx.fillRect(0, 22, 6, 5);

    // Body (winter jacket)
    const jacketColor = examining ? "#3a6688" : "#4a5868";
    ctx.fillStyle = jacketColor;
    ctx.beginPath();
    ctx.roundRect(-10, -16 + breathe * 0.3, 20, 26, 3);
    ctx.fill();

    // Arms
    ctx.fillRect(-14, -10 + breathe * 0.3, 5, 14);
    ctx.fillRect(9, -10 + breathe * 0.3, 5, 14);

    // Gloves
    ctx.fillStyle = "#4488BB";
    ctx.beginPath();
    ctx.arc(-11.5, 6 + breathe * 0.3, 3, 0, Math.PI * 2);
    ctx.arc(11.5, 6 + breathe * 0.3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Neck with scarf
    ctx.fillStyle = "#88BBDD";
    ctx.fillRect(-4, -20, 8, 5);

    // Head
    ctx.fillStyle = "#EEDDCC";
    ctx.beginPath();
    ctx.ellipse(0, -26 + breathe * 0.2, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Beanie
    ctx.fillStyle = examining ? "#4477AA" : "#5588BB";
    ctx.beginPath();
    ctx.ellipse(0, -32 + breathe * 0.2, 9, 5, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-9, -32 + breathe * 0.2, 18, 4);

    // Eyes
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.ellipse(-3, -26 + breathe * 0.2, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.ellipse(3, -26 + breathe * 0.2, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3355AA";
    ctx.beginPath();
    ctx.arc(-3, -26 + breathe * 0.2, 0.8, 0, Math.PI * 2);
    ctx.arc(3, -26 + breathe * 0.2, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Activity indicator
    if (examining) {
      // Holding sample tube
      ctx.fillStyle = "#88DDFF";
      ctx.fillRect(-14, -2 + breathe * 0.3, 4, 10);
      ctx.fillStyle = "#AAEEFF";
      ctx.fillRect(-13, 0 + breathe * 0.3, 2, 6);
    } else if (atWorkstation) {
      // Looking at screen
      ctx.fillStyle = "#66BBFF";
      ctx.font = "bold 5px monospace";
      ctx.textAlign = "center";
      ctx.fillText("▪▪▪", 0, -44 + breathe * 0.2);
    }

    ctx.restore();
  }


  // ── Metro helpers ────────────────────────────────────────────





  // ── Render ─────────────────────────────────────────────────
}

// ── Entry point ───────────────────────────────────────────────────────────────
window.startGame = function (charData, mapData) {
  window._game = new Game(charData, mapData);
  window._gameInstance = window._game;
  window.dispatchEvent(new Event("gameStarted"));
};
