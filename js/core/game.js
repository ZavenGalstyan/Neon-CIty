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
    // ── Ambient Traffic ────────────────────────────────────────
    this._ambientCars = [];
    this._ambientSpawnT = 0;
    // ── Teleport Portals ───────────────────────────────────────
    this._portals = this.map.portals || [];
    this._portalCooldown = 0; // prevents instant re-teleport

    // Camera
    this.camX = spawnX - this.canvas.width / 2;
    this.camY = spawnY - this.canvas.height / 2;

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
    this.player.update(dt, this.input, this.map, this.bullets, this.particles);
    if (
      this.player.dead &&
      (this.state === "playing" || this.state === "blackmarket")
    )
      this.state = "gameover";

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
    if (
      !this._indoor &&
      !this._arenaMode &&
      !this._zombieMode &&
      !this._towerMode
    ) {
      this._ambientSpawnT -= dt;
      if (this._ambientSpawnT <= 0) {
        this._respawnAmbientCar();
        this._ambientSpawnT = 4.0;
      }
      for (const c of this._ambientCars) c.update(dt, this.map);
      this._ambientCars = this._ambientCars.filter((c) => !c.dead);
    }

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
  _renderTowerHUD(ctx, W, H) {
    ctx.save();
    const t = Date.now() * 0.001;
    const fl = this._towerFloor;

    // ── Floor-specific accent color per floor ──────────────
    const FLOOR_COLORS = [
      "#FFD700", // 0 unused
      "#E8D8B0", // 1 Grand Lobby
      "#FFCC00", // 2 Parking Garage
      "#CC8844", // 3 Corporate Offices
      "#00CCFF", // 4 Data Center
      "#FF6666", // 5 Velvet Lounge
      "#FF4444", // 6 Tactical Ops
      "#44FF88", // 7 Bio-Research Lab
      "#FF8844", // 8 Weapons Armory
      "#BB88FF", // 9 Executive Suite
      "#FFD700", // 10 The Penthouse
    ];
    const flCol = FLOOR_COLORS[Math.min(fl, 10)] || "#FFD700";
    const pulse = Math.sin(t * 2.5) * 0.18 + 0.82;

    // ── Main floor panel — top-center ─────────────────────
    const panW = 320,
      panH = 72,
      panX = W / 2 - panW / 2,
      panY = 12;

    // Panel drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.40)";
    ctx.beginPath();
    ctx.roundRect(panX + 3, panY + 3, panW, panH, 10);
    ctx.fill();

    // Panel body
    ctx.fillStyle = "rgba(8,6,4,0.88)";
    ctx.beginPath();
    ctx.roundRect(panX, panY, panW, panH, 10);
    ctx.fill();

    // Colored top accent bar
    ctx.fillStyle = flCol;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.roundRect(panX, panY, panW, 3, [10, 10, 0, 0]);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Border
    ctx.strokeStyle = `${flCol}55`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(panX, panY, panW, panH, 10);
    ctx.stroke();

    // "THE TOWER" label
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = `${flCol}99`;
    ctx.letterSpacing = "0.3em";
    ctx.fillText("◈  THE TOWER  ◈", W / 2, panY + 17);
    ctx.letterSpacing = "0";

    // Floor number (large, glowing)
    ctx.font = "bold 28px monospace";
    ctx.fillStyle = flCol;
    ctx.shadowColor = flCol;
    ctx.shadowBlur = 14 * pulse;
    ctx.fillText(`FLOOR  ${fl}  /  10`, W / 2, panY + 47);
    ctx.shadowBlur = 0;

    // Subtitle (floor name)
    const sub = this._towerFloorSubtitle(fl);
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.38)";
    ctx.fillText(sub, W / 2, panY + 64);

    // ── Enemy count pill — below main panel ───────────────
    const alive =
      this.bots.filter((b) => !b.dead && !b.dying).length +
      (this.boss && !this.boss.dead && !this.boss.dying ? 1 : 0);

    const pillW = 200,
      pillH = 26,
      pillX = W / 2 - pillW / 2,
      pillY = panY + panH + 6;
    ctx.fillStyle =
      alive > 0 ? "rgba(255,60,40,0.15)" : "rgba(40,255,120,0.12)";
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 13);
    ctx.fill();
    ctx.strokeStyle =
      alive > 0 ? "rgba(255,80,40,0.35)" : "rgba(40,255,120,0.30)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 13);
    ctx.stroke();

    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = alive > 0 ? "#FF8866" : "#44FF88";
    if (alive === 0) {
      ctx.shadowColor = "#44FF88";
      ctx.shadowBlur = 8;
    }
    ctx.fillText(
      alive > 0 ? `☠  ${alive} ENEMIES REMAINING` : "✓  ALL CLEARED!",
      W / 2,
      pillY + 17,
    );
    ctx.shadowBlur = 0;

    // ── Floor progress dots ────────────────────────────────
    const dotR = 5,
      dotGap = 16,
      dotsW = 10 * dotGap;
    const dotStartX = W / 2 - dotsW / 2 + dotR;
    for (let i = 1; i <= 10; i++) {
      const dx = dotStartX + (i - 1) * dotGap;
      const dy = panY + panH + 40;
      if (i < fl) {
        ctx.fillStyle = `${flCol}88`;
        ctx.beginPath();
        ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
        ctx.fill();
      } else if (i === fl) {
        ctx.fillStyle = flCol;
        ctx.shadowColor = flCol;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(dx, dy, dotR + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.beginPath();
        ctx.arc(dx, dy, dotR - 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Elevator active: dramatic pulsing banner ───────────
    if (this._towerElevatorActive) {
      const ep = Math.sin(t * 3.5) * 0.22 + 0.78;
      const bW = 300,
        bH = 36,
        bX = W / 2 - bW / 2,
        bY = H - 60;

      ctx.fillStyle = `rgba(0,0,0,${ep * 0.6})`;
      ctx.beginPath();
      ctx.roundRect(bX, bY, bW, bH, 18);
      ctx.fill();
      ctx.strokeStyle = `rgba(0,255,136,${ep * 0.55})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bX, bY, bW, bH, 18);
      ctx.stroke();

      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.globalAlpha = ep;
      ctx.fillStyle = "#00FF88";
      ctx.shadowColor = "#00FF88";
      ctx.shadowBlur = 18;
      ctx.fillText("▲  ENTER ELEVATOR  ▲", W / 2, bY + 24);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  _towerFloorSubtitle(floor) {
    const subs = [
      "",
      "GRAND LOBBY  ·  SECURITY CHECKPOINT",
      "PARKING GARAGE  ·  SUBLEVEL B2",
      "CORPORATE OFFICES  ·  3RD FLOOR",
      "DATA CENTER  ·  SERVER WING",
      "VELVET LOUNGE  ·  VIP AREA",
      "TACTICAL OPERATIONS  ·  CLASSIFIED",
      "BIO-RESEARCH LAB  ·  CONTAINMENT",
      "WEAPONS ARMORY  ·  RESTRICTED",
      "EXECUTIVE SUITE  ·  PENTHOUSE ANTECHAMBER",
      "★  THE PENTHOUSE  ·  FINAL CONFRONTATION  ★",
    ];
    return subs[Math.min(floor, 10)] || "";
  }

  _renderTowerVictory(ctx, W, H) {
    const t = Date.now() * 0.001;

    // Beautiful night sky background with stars
    const skyGrd = ctx.createLinearGradient(0, 0, 0, H);
    skyGrd.addColorStop(0, "#0a0a1a");
    skyGrd.addColorStop(0.4, "#1a1a3a");
    skyGrd.addColorStop(0.7, "#2a1a2a");
    skyGrd.addColorStop(1, "#1a0a1a");
    ctx.fillStyle = skyGrd;
    ctx.fillRect(0, 0, W, H);

    // Animated stars
    ctx.save();
    for (let i = 0; i < 80; i++) {
      const sx = (i * 137) % W;
      const sy = (i * 97) % (H * 0.6);
      const twinkle = Math.sin(t * 2 + i) * 0.4 + 0.6;
      ctx.globalAlpha = twinkle * 0.8;
      ctx.fillStyle =
        i % 5 === 0 ? "#FFD700" : i % 3 === 0 ? "#AADDFF" : "#FFFFFF";
      const starSize = i % 7 === 0 ? 3 : i % 4 === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.arc(sx, sy, starSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // City skyline silhouette at bottom
    ctx.fillStyle = "#0a0a0a";
    for (let b = 0; b < 20; b++) {
      const bx = b * (W / 20);
      const bh = 40 + ((b * 7) % 80);
      const bw = W / 20 - 2;
      ctx.fillRect(bx, H - bh, bw, bh);
      // Building windows
      ctx.fillStyle = "rgba(255,200,100,0.3)";
      for (let wy = H - bh + 8; wy < H - 10; wy += 12) {
        for (let wx = bx + 4; wx < bx + bw - 4; wx += 8) {
          if ((wx + wy) % 3 !== 0) ctx.fillRect(wx, wy, 4, 6);
        }
      }
      ctx.fillStyle = "#0a0a0a";
    }

    // Grand golden glow from center
    const grd = ctx.createRadialGradient(
      W / 2,
      H / 2 - 50,
      20,
      W / 2,
      H / 2 - 50,
      400,
    );
    grd.addColorStop(0, "rgba(255,215,0,0.35)");
    grd.addColorStop(0.3, "rgba(255,180,0,0.20)");
    grd.addColorStop(0.6, "rgba(255,140,0,0.10)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // Floating golden particles
    ctx.save();
    for (let p = 0; p < 30; p++) {
      const px = W / 2 + Math.sin(t * 0.8 + p * 0.5) * (150 + p * 5);
      const py =
        H / 2 -
        50 +
        Math.cos(t * 0.6 + p * 0.7) * (80 + p * 3) -
        ((t * 20 + p * 10) % 200);
      const pAlpha = 0.3 + Math.sin(t + p) * 0.2;
      ctx.globalAlpha = pAlpha;
      ctx.fillStyle = p % 2 === 0 ? "#FFD700" : "#FFAA00";
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.save();
    ctx.textAlign = "center";

    // Animated crown/trophy area with rays
    ctx.save();
    ctx.translate(W / 2, H / 2 - 100);
    ctx.rotate(Math.sin(t * 0.5) * 0.05);
    // Sun rays behind trophy
    for (let r = 0; r < 12; r++) {
      const ra = (r / 12) * Math.PI * 2 + t * 0.3;
      ctx.strokeStyle = `rgba(255,215,0,${0.15 + Math.sin(t + r) * 0.08})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ra) * 40, Math.sin(ra) * 40);
      ctx.lineTo(
        Math.cos(ra) * (90 + Math.sin(t * 2 + r) * 15),
        Math.sin(ra) * (90 + Math.sin(t * 2 + r) * 15),
      );
      ctx.stroke();
    }
    ctx.restore();

    // Large golden crown icon
    ctx.font = "80px monospace";
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = 40;
    const crownBob = Math.sin(t * 1.5) * 5;
    ctx.fillText("\u{1F451}", W / 2, H / 2 - 90 + crownBob);
    ctx.shadowBlur = 0;

    // CONGRATULATIONS title with glow effect
    ctx.font = "bold 52px monospace";
    const titleGlow = 25 + Math.sin(t * 2.5) * 12;
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = titleGlow;
    ctx.fillStyle = "#FFD700";
    ctx.fillText("CONGRATULATIONS!", W / 2, H / 2 - 10);
    ctx.shadowBlur = 0;

    // Sub-title
    ctx.font = "bold 32px monospace";
    ctx.fillStyle = "#FFCC44";
    ctx.shadowColor = "#FFAA00";
    ctx.shadowBlur = 15;
    ctx.fillText("TOWER CONQUERED!", W / 2, H / 2 + 35);
    ctx.shadowBlur = 0;

    // Victory message
    ctx.font = "20px monospace";
    ctx.fillStyle = "#CCAA66";
    ctx.fillText(
      "You defeated The Golden Emperor and claimed the Penthouse!",
      W / 2,
      H / 2 + 72,
    );

    // Stats with NEX styling
    ctx.font = "bold 18px monospace";
    ctx.fillStyle = "#00FFCC";
    ctx.shadowColor = "#00FFCC";
    ctx.shadowBlur = 8;
    ctx.fillText(`KILLS: ${this.kills}`, W / 2 - 100, H / 2 + 110);
    ctx.fillText(`NEX: ⬢${this.money}`, W / 2 + 100, H / 2 + 110);
    ctx.shadowBlur = 0;

    // Survival time if tracked
    if (this._surviveTime) {
      ctx.font = "16px monospace";
      ctx.fillStyle = "#AA8844";
      const mins = Math.floor(this._surviveTime / 60);
      const secs = Math.floor(this._surviveTime % 60);
      ctx.fillText(
        `Time: ${mins}:${secs.toString().padStart(2, "0")}`,
        W / 2,
        H / 2 + 135,
      );
    }

    // OK Button - beautiful golden button
    const btnW = 180,
      btnH = 50;
    const btnX = W / 2 - btnW / 2,
      btnY = H / 2 + 155;
    const mx = this.input.mouseScreen.x,
      my = this.input.mouseScreen.y;
    const hovered =
      mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH;

    // Store button bounds for click detection
    this._towerVictoryBtn = { x: btnX, y: btnY, w: btnW, h: btnH };

    // Button glow
    if (hovered) {
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 25;
    }

    // Button background gradient
    const btnGrd = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    if (hovered) {
      btnGrd.addColorStop(0, "#FFE55C");
      btnGrd.addColorStop(0.5, "#FFD700");
      btnGrd.addColorStop(1, "#CC9900");
    } else {
      btnGrd.addColorStop(0, "#FFD700");
      btnGrd.addColorStop(0.5, "#CCAA00");
      btnGrd.addColorStop(1, "#996600");
    }
    ctx.fillStyle = btnGrd;

    // Rounded rectangle button
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 12);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Button border
    ctx.strokeStyle = hovered ? "#FFFFFF" : "#FFE88A";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 12);
    ctx.stroke();

    // Button text
    ctx.font = "bold 24px monospace";
    ctx.fillStyle = hovered ? "#000000" : "#1a0a00";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("OK", W / 2, btnY + btnH / 2);
    ctx.textBaseline = "alphabetic";

    // Decorative corner flourishes
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(30, 60);
    ctx.lineTo(30, 30);
    ctx.lineTo(60, 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(40, 70);
    ctx.lineTo(40, 40);
    ctx.lineTo(70, 40);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(W - 30, 60);
    ctx.lineTo(W - 30, 30);
    ctx.lineTo(W - 60, 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W - 40, 70);
    ctx.lineTo(W - 40, 40);
    ctx.lineTo(W - 70, 40);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(30, H - 60);
    ctx.lineTo(30, H - 30);
    ctx.lineTo(60, H - 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(40, H - 70);
    ctx.lineTo(40, H - 40);
    ctx.lineTo(70, H - 40);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(W - 30, H - 60);
    ctx.lineTo(W - 30, H - 30);
    ctx.lineTo(W - 60, H - 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W - 40, H - 70);
    ctx.lineTo(W - 40, H - 40);
    ctx.lineTo(W - 70, H - 40);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // ── Tower floor system ────────────────────────────────────
  _startTowerFloor() {
    const floor = this._towerFloor;
    this.bots = [];
    this.boss = null;
    this._towerElevatorActive = false;
    this.map._towerFloor = floor;

    // Spawn composition per floor — EXACTLY 12 enemies each floor (no more, no less)
    const FLOOR_SPAWNS = [
      null, // 0 unused
      [["mini", 12]], // floor  1: 12 mini
      [
        ["mini", 6],
        ["normal", 6],
      ], // floor  2: 12 total
      [
        ["normal", 8],
        ["big", 4],
      ], // floor  3: 12 total
      [
        ["normal", 4],
        ["police", 4],
        ["big", 4],
      ], // floor  4: 12 total
      [
        ["police", 4],
        ["big", 4],
        ["swat", 4],
      ], // floor  5: 12 total
      [
        ["swat", 6],
        ["heavyswat", 6],
      ], // floor  6: 12 total
      [
        ["heavyswat", 4],
        ["sniper", 8],
      ], // floor  7: 12 total
      [
        ["sniper", 4],
        ["bomber", 8],
      ], // floor  8: 12 total
      [
        ["bomber", 4],
        ["juggernaut", 8],
      ], // floor  9: 12 total
      [["juggernaut", 12]], // floor 10: 12 juggernaut + boss
    ];
    const spawns = FLOOR_SPAWNS[Math.min(floor, 10)] || FLOOR_SPAWNS[1];

    for (const [type, num] of spawns) {
      for (let i = 0; i < num; i++) {
        const pos = this._towerRandomPos();
        const bot = new Bot(pos.x, pos.y, floor, type, this.map.config);
        this.bots.push(bot);
      }
    }

    // Boss ONLY on floor 10 (last floor)
    if (floor === 10) this._spawnBoss();

    // Grant player the floor weapon (progressive unlock)
    this._grantTowerWeapon(floor);

    // Reset player to left side center
    const S = this.map.S;
    this.player.x = 2.5 * S;
    this.player.y = (this.map.H / 2) * S;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30); // small heal between floors

    // Camera snap
    this.camX = this.player.x - this.canvas.width / 2;
    this.camY = this.player.y - this.canvas.height / 2;
  }

  _towerRandomPos() {
    const S = this.map.S;
    const elevX = this.map.elevatorX,
      elevY = this.map.elevatorY;
    let x,
      y,
      tries = 0;
    do {
      x = rnd(1.5 * S, (this.map.W - 3) * S);
      y = rnd(1.5 * S, (this.map.H - 3) * S);
      tries++;
    } while (
      tries < 30 &&
      (this.map.isBlocked(x, y) ||
        Math.hypot(x - elevX, y - elevY) < 140 ||
        Math.hypot(x - 2.5 * S, y - (this.map.H / 2) * S) < 100)
    );
    return { x, y };
  }

  _grantTowerWeapon(floor) {
    const WEAPONS = [
      null,
      "pistol",
      "shotgun",
      "smg",
      "burst",
      "sniper",
      "crossbow",
      "rocket",
      "flamethrower",
      "rocket",
      "flamethrower",
    ];
    const wid = WEAPONS[Math.min(floor, WEAPONS.length - 1)];
    if (!wid || wid === "pistol") return;
    if (!this.player.ownedWeapons.has(wid)) {
      this.player.ownedWeapons.add(wid);
    }
    this.player.equipWeapon(wid);
  }

  _updateTower(dt) {
    // Tower transition (fade out → advance floor → fade in)
    if (this._towerTransitionState > 0) {
      if (this._towerTransitionState === 1) {
        // Fade to black
        this._towerTransitionAlpha = Math.min(
          1,
          this._towerTransitionAlpha + dt * 2.5,
        );
        if (this._towerTransitionAlpha >= 1) {
          this._towerFloor++;
          if (this._towerFloor > 10) {
            this._towerVictory = true;
            this._towerTransitionAlpha = 0; // Reset so victory screen is visible
            this._towerTransitionState = 0;
            this.state = "gameover";
            return;
          }
          this._startTowerFloor();
          this._towerTransitionState = 2;
        }
      } else if (this._towerTransitionState === 2) {
        // Fade from black
        this._towerTransitionAlpha = Math.max(
          0,
          this._towerTransitionAlpha - dt * 2.0,
        );
        if (this._towerTransitionAlpha <= 0) this._towerTransitionState = 0;
      }
      return; // freeze game logic during transition
    }

    // Check if all enemies dead → activate elevator
    if (!this._towerElevatorActive) {
      const alive = this.bots.filter((b) => !b.dead && !b.dying).length;
      const bossAlive = this.boss && !this.boss.dead && !this.boss.dying;
      if (alive === 0 && !bossAlive) {
        this._towerElevatorActive = true;
        window.audio?.waveUp();
      }
    }

    // Elevator proximity check
    if (this._towerElevatorActive) {
      const ex = this.map.elevatorX,
        ey = this.map.elevatorY;
      if (Math.hypot(this.player.x - ex, this.player.y - ey) < 90) {
        this._towerTransitionState = 1;
        window.audio?.pickup();
      }
    }
  }

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
    if (this._arenaMode || this._zombieMode || this._towerMode) return;
    // No ambient traffic on neon city or wasteland maps
    if (this.map.config.id === "neon_city" || this.map.config.wasteland) return;
    const base = this._metropolisMode ? 12 : 6;
    const count = base + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) this._respawnAmbientCar();
  }

  _respawnAmbientCar() {
    // No ambient traffic on neon city or wasteland maps
    if (this.map.config.id === "neon_city" || this.map.config.wasteland) return;
    const maxCars = this._metropolisMode ? 22 : 14;
    if (this._ambientCars.length >= maxCars) return;
    // Spawn off-camera on a road tile
    const margin = 200;
    const W = this.canvas.width,
      H = this.canvas.height;
    let pos;
    for (let t = 0; t < 15; t++) {
      let sx, sy;
      const side = Math.floor(Math.random() * 4);
      if (side === 0) {
        sx = this.camX + rnd(0, W);
        sy = this.camY - margin;
      } else if (side === 1) {
        sx = this.camX + W + margin;
        sy = this.camY + rnd(0, H);
      } else if (side === 2) {
        sx = this.camX + rnd(0, W);
        sy = this.camY + H + margin;
      } else {
        sx = this.camX - margin;
        sy = this.camY + rnd(0, H);
      }
      sx = clamp(sx, 0, this.map.W * this.map.S);
      sy = clamp(sy, 0, this.map.H * this.map.S);
      if (!this.map.isBlocked(sx, sy)) {
        pos = { x: sx, y: sy };
        break;
      }
    }
    if (!pos) {
      try {
        pos = this.map.randomRoadPos();
      } catch (e) {
        return;
      }
    }
    const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    const carColors = [
      "#CC3333",
      "#3366BB",
      "#CC9900",
      "#339944",
      "#AA33AA",
      "#336688",
      "#CC6633",
      "#55AACC",
    ];
    const angle = angles[Math.floor(Math.random() * angles.length)];
    const isJungle = !!this.map.config.jungle;
    const isDesert = !!this.map.config.desert;
    const isGalactica = !!this.map.config.galactica;
    const isDino = !!this.map.config.dino;
    const isSky = !!this._skyMode;

    // Sky realm: spawn airplanes and bird flocks from map edges
    if (isSky) {
      const maxSky = 6; // keep low for perf
      if (this._ambientCars.length >= maxSky) return;
      const mapW = this.map.W * this.map.S;
      const mapH = this.map.H * this.map.S;
      const side = Math.floor(Math.random() * 4);
      const isBirdFlock = Math.random() < 0.65;
      const count = isBirdFlock ? 2 + Math.floor(Math.random() * 2) : 1; // flock 2-3
      // Edge spawn position and direction angle
      let ex, ey, flyAngle;
      if (side === 0) {
        ex = rnd(0, mapW);
        ey = -80;
        flyAngle = Math.PI * 0.5;
      } // top → down
      else if (side === 1) {
        ex = mapW + 80;
        ey = rnd(0, mapH);
        flyAngle = Math.PI;
      } // right → left
      else if (side === 2) {
        ex = rnd(0, mapW);
        ey = mapH + 80;
        flyAngle = -Math.PI * 0.5;
      } // bottom → up
      else {
        ex = -80;
        ey = rnd(0, mapH);
        flyAngle = 0;
      } // left → right
      // Give planes/birds a realistic traversal speed (map takes ~15-20s to cross)
      const flySpeed = isBirdFlock ? rnd(180, 240) : rnd(300, 420);
      for (let i = 0; i < count; i++) {
        if (this._ambientCars.length >= maxSky) break;
        const spread = isBirdFlock ? rnd(-60, 60) : 0;
        const px = ex + Math.cos(flyAngle + Math.PI * 0.5) * spread;
        const py = ey + Math.sin(flyAngle + Math.PI * 0.5) * spread;
        const col = isBirdFlock
          ? ["#FFFFFF", "#F5F5F5", "#E8E8E8", "#DDDDFF", "#EEEEFF"][
              Math.floor(Math.random() * 5)
            ]
          : ["#C0C8D8", "#D0D8E8", "#B8C4D4", "#A8B8CC"][
              Math.floor(Math.random() * 4)
            ];
        const car = new AmbientCar(px, py, flyAngle, col, 0);
        car.speed = flySpeed;
        if (isBirdFlock) {
          car.isBird = true;
        } else {
          car.isAirplane = true;
        }
        this._ambientCars.push(car);
      }
      return;
    }

    const color = isJungle
      ? ["#8B4513", "#6B3410", "#A0522D", "#704214", "#5C3317"][
          Math.floor(Math.random() * 5)
        ]
      : isDesert
        ? ["#C8A050", "#B08828", "#D4AA60", "#A07830", "#C09040"][
            Math.floor(Math.random() * 5)
          ]
        : isGalactica
          ? ["#AA44FF", "#FF44AA", "#44AAFF", "#44FFAA", "#FFAA44"][
              Math.floor(Math.random() * 5)
            ]
          : isDino
            ? ["#66AA33", "#44AA22", "#88CC44", "#4a8820", "#77BB55"][
                Math.floor(Math.random() * 5)
              ]
            : carColors[Math.floor(Math.random() * carColors.length)];
    const style = Math.floor(Math.random() * 5);
    const car = new AmbientCar(pos.x, pos.y, angle, color, style);
    if (isJungle) car.isHorse = true;
    if (isDesert) car.isCamel = true;
    if (isGalactica) car.isUFO = true;
    if (isDino) car.isDino = true;
    this._ambientCars.push(car);
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
          const isNeonCity = this.map.config.id === "neon_city";
          const isGalactica = !!this.map.config.galactica;
          const isWasteland = !!this.map.config.wasteland;
          if (isNeonCity) {
            // Neon City: One professional cyber salesperson behind the counter
            // Counter is at S * 1.8 + 35 height, salesperson stands in front of counter (facing customers)
            const spX = room.roomW / 2;
            const spY = room.roomH * 0.38; // Closer to the display cars
            this._salespersons = [
              new Salesperson(spX, spY, "#00FFFF", "SALES REP", true),
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
          } else if (!!this.map.config.snow) {
            // Frozen Tundra: Winter-dressed sales rep
            const spX = room.roomW / 2;
            const spY = room.roomH * 0.38;
            this._salespersons = [
              new Salesperson(spX, spY, "#88DDFF", "FROST DEALER", "snow"),
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
          this._policeOfficers = [
            // Officer standing near the first desk (left side)
            { x: room.roomW * 0.22, y: room.roomH * 0.46, sitting: false, label: "OFC. MARTINEZ" },
            // Officer sitting at the second desk
            { x: room.roomW * 0.40, y: room.roomH * 0.72, sitting: true, label: "DET. WONG" },
            // Officer standing guard next to the criminal's cell (top-right)
            { x: room.roomW * 0.68, y: room.roomH * 0.26, sitting: false, label: "SGT. KELLY" },
          ];
        } else if (door.bTypeIdx === 13 && !!this.map?.config?.wasteland) {
          // WASTELAND TECH LAB: Tech shop with vendor and customers, no enemies
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
          const isNeonCity = this.map?.config?.id === "neon_city";
          const isGalactica = !!this.map?.config?.galactica;
          const isZombie    = !!this.map?.config?.zombie;
          const isWasteland = !!this.map?.config?.wasteland;
          const isSpecialMap = isNeonCity || isGalactica || isWasteland;
          // Special positioning for Neon City / Galactica / Wasteland / Zombie buildings
          let npcX = room.entryX + 60;
          let npcY = room.entryY - 110;
          if ((isNeonCity || isWasteland) && bType === 12) {
            // Pawnshop - position vendor near the counter
            npcX = room.roomW / 2;
            npcY = room.roomH * 0.48;
          } else if (isNeonCity && bType === 4) {
            // Arcade - position attendant above prize counter
            npcX = room.roomW / 2;
            npcY = room.roomH * 0.3;
          } else if (isSpecialMap && bType === 11) {
            npcX = room.roomW / 2;
            npcY = room.roomH * 0.34;
          } else if (isGalactica && bType === 3) {
            npcX = room.roomW / 2;
            npcY = room.roomH * 0.38;
          } else if (isGalactica && bType === 8) {
            // Galaxy Club: hostess near top, player-facing
            npcX = room.roomW / 2;
            npcY = room.roomH * 0.22;
          } else if (isGalactica && bType === 0) {
            // Nova Diner: chef/waiter behind service counter
            npcX = room.roomW / 2;
            npcY = room.roomH * 0.17;
          } else if (isGalactica && bType === 5) {
            // Galactica Pharmacy: pharmacist behind counter near top
            npcX = room.roomW / 2;
            npcY = room.roomH * 0.19;
          } else if (isGalactica && bType === 22) {
            // Galactica Radio Station: DJ/host behind broadcast desk
            npcX = room.roomW / 2;
            npcY = room.roomH * 0.20;
          } else if (isZombie) {
            // Zombie map: all workers at top-center of the large room
            npcX = room.roomW / 2;
            npcY = room.roomH * 0.20;
          }
          const useGirlRender  = isGalactica && bType === 8;
          // Determine render type for BuildingNPC
          let npcRenderType = false;
          if (isWasteland) {
            npcRenderType = 'wasteland';
          } else if (isNeonCity || isZombie || (isGalactica && (bType === 3 || bType === 8 || bType === 0 || bType === 5 || bType === 22))) {
            npcRenderType = true; // neonCity style
          }
          this._buildingNpcs = [new BuildingNPC(npcX, npcY, bType, npcRenderType, useGirlRender)];
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
      ctx.fillStyle = "#3a3530";
      ctx.fillRect(-7, 4, 5, 10);
      ctx.fillRect(2, 4, 5, 10);

      // Body (casual clothes)
      const bodyColor = role === "DJ" ? "#2a4a6a" : role === "TECH" ? "#4a3a2a" : "#3a2a4a";
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.roundRect(-9, -16 + breathe * 0.3, 18, 22, 3);
      ctx.fill();

      // Arms on desk
      ctx.fillRect(-13, -6 + breathe * 0.3, 5, 12);
      ctx.fillRect(8, -6 + breathe * 0.3, 5, 12);

      // Hands
      ctx.fillStyle = "#CCAA88";
      ctx.beginPath();
      ctx.arc(-10.5, 8 + breathe * 0.3, 3, 0, Math.PI * 2);
      ctx.arc(10.5, 8 + breathe * 0.3, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Standing pose
      ctx.fillStyle = "#3a3530";
      ctx.fillRect(-6, 8, 5, 18);
      ctx.fillRect(1, 8, 5, 18);

      ctx.fillStyle = "#2a2520";
      ctx.fillRect(-7, 24, 7, 5);
      ctx.fillRect(0, 24, 7, 5);

      const bodyColor = role === "DJ" ? "#2a4a6a" : role === "TECH" ? "#4a3a2a" : "#3a2a4a";
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.roundRect(-10, -20 + breathe * 0.3, 20, 30, 3);
      ctx.fill();

      ctx.fillRect(-14, -14 + breathe * 0.3, 5, 16);
      ctx.fillRect(9, -14 + breathe * 0.3, 5, 16);

      ctx.fillStyle = "#CCAA88";
      ctx.beginPath();
      ctx.arc(-11.5, 4 + breathe * 0.3, 3, 0, Math.PI * 2);
      ctx.arc(11.5, 4 + breathe * 0.3, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Neck
    ctx.fillStyle = "#CCAA88";
    ctx.fillRect(-3, sitting ? -20 : -24, 6, 5);

    // Head
    const headY = sitting ? -28 : -32;
    ctx.fillStyle = "#DDBB99";
    ctx.beginPath();
    ctx.ellipse(0, headY + breathe * 0.2, 9, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    const hairColor = role === "DJ" ? "#1a1a2a" : role === "TECH" ? "#4a3a2a" : "#2a2a3a";
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.ellipse(0, headY - 5 + breathe * 0.2, 8, 5, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-8, headY - 3 + breathe * 0.2, 16, 5);

    // Headphones for DJ
    if (role === "DJ") {
      ctx.fillStyle = "#2a2a30";
      ctx.strokeStyle = "#4a4a50";
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
    ctx.fillStyle = "#3a3020";
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
    ctx.fillStyle = "#FF88CC";
    ctx.shadowColor = "#FF88CC";
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

  _renderIndoorFurniture(ctx, room) {
    const W = room.roomW,
      H = room.roomH;
    const cx = W / 2,
      topY = H * 0.14,
      midY = H * 0.44;
    // type: string (special door) or number (0-7 building type index)
    const type =
      room._doorSpecial &&
      room._doorSpecial !== "dealership" &&
      room._doorSpecial !== "casino"
        ? room._doorSpecial
        : typeof room._buildingType === "number"
          ? room._buildingType
          : 0;

    // Rounded rect helper
    const rr = (x, y, w, h, r = 4) => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    };

    // Corpse helper — draws a top-down human silhouette with blood pool
    // rot: rotation in radians. skinColor: dark tint color. poolAlpha: blood pool opacity.
    const drawCorpse = (x, y, rot, skinColor = '#2a1208', poolAlpha = 0.45) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      // Blood pool (radial gradient beneath body)
      const bpG = ctx.createRadialGradient(0, 4, 0, 0, 4, 20);
      bpG.addColorStop(0, `rgba(110,0,0,${poolAlpha})`);
      bpG.addColorStop(0.6, `rgba(80,0,0,${poolAlpha * 0.5})`);
      bpG.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bpG;
      ctx.beginPath(); ctx.ellipse(0, 6, 18, 11, 0, 0, Math.PI * 2); ctx.fill();
      // Torso
      ctx.fillStyle = skinColor;
      ctx.beginPath(); ctx.ellipse(0, 4, 6, 12, 0, 0, Math.PI * 2); ctx.fill();
      // Head
      ctx.beginPath(); ctx.arc(0, -10, 5.5, 0, Math.PI * 2); ctx.fill();
      // Left arm
      ctx.save(); ctx.translate(-7, 2); ctx.rotate(-0.55);
      ctx.beginPath(); ctx.ellipse(0, 0, 2.5, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      // Right arm
      ctx.save(); ctx.translate(7, 2); ctx.rotate(0.55);
      ctx.beginPath(); ctx.ellipse(0, 0, 2.5, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      // Legs
      ctx.save(); ctx.translate(-3, 15); ctx.rotate(-0.15);
      ctx.beginPath(); ctx.ellipse(0, 0, 2.5, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(3, 15); ctx.rotate(0.15);
      ctx.beginPath(); ctx.ellipse(0, 0, 2.5, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.restore();
    };

    // Floor tint per building type
    const _floorTints = {
      home: "#1a0a2a",
      0: "#1a0a04",
      1: "#04081a",
      2: "#0a041a",
      3: "#04120a",
      4: "#0e0e04",
      5: "#04100e",
      6: "#100404",
      7: "#0a0a04",
      8: "#14002a",
      9: "#04140a",
      10: "#0c0c10",
      11: "#100804",
      12: "#0e0804",
      13: "#040e10",
      14: "#0c0a04",
      15: "#040a16",
      16: "#10041a",
      17: "#100a04",
      18: "#041008",
      19: "#0c0804",
      20: "#04081a",
      21: "#0c0804",
      22: "#0a0416",
      23: "#041008",
    };
    const _tint = _floorTints[type] || "#0a0a0a";
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = _tint;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.88;

    if (type === "home") {
      // ── Sofa (left-center) ───────────────────────
      ctx.fillStyle = "#5a3a7a";
      ctx.strokeStyle = "#8855bb";
      ctx.lineWidth = 1.5;
      rr(cx - W * 0.42, midY - 18, 84, 34, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#4a2a6a"; // back rest
      rr(cx - W * 0.42, midY - 34, 84, 18, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#7a4aaa";
      ctx.strokeStyle = "#9966cc";
      ctx.lineWidth = 1;
      ctx.fillRect(cx - W * 0.42 + 4, midY - 16, 36, 28);
      ctx.fillRect(cx - W * 0.42 + 44, midY - 16, 36, 28);
      ctx.strokeRect(cx - W * 0.42 + 4, midY - 16, 36, 28);
      ctx.strokeRect(cx - W * 0.42 + 44, midY - 16, 36, 28);

      // ── TV on north wall ─────────────────────────
      ctx.fillStyle = "#111118";
      ctx.strokeStyle = "#44EEFF";
      ctx.lineWidth = 1.5;
      rr(cx - 40, topY + 8, 80, 46, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#0a2a4a";
      ctx.fillRect(cx - 36, topY + 12, 72, 34);
      ctx.fillStyle = "#0055AA";
      for (let i = 0; i < 4; i++)
        ctx.fillRect(cx - 32, topY + 14 + i * 7, 64, 3);
      ctx.fillStyle = "#44EEFF";
      ctx.shadowColor = "#44EEFF";
      ctx.shadowBlur = 7;
      ctx.beginPath();
      ctx.arc(cx, topY + 29, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#333344";
      ctx.fillRect(cx - 7, topY + 54, 14, 8);
      ctx.fillRect(cx - 18, topY + 60, 36, 4);

      // ── Coffee table (center) ────────────────────
      ctx.fillStyle = "#4a3220";
      ctx.strokeStyle = "#8a5a30";
      ctx.lineWidth = 1;
      rr(cx - 28, midY - 4, 56, 26, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#5a4230";
      ctx.fillRect(cx - 24, midY, 48, 18);
      ctx.fillStyle = "#EEDDCC";
      ctx.beginPath();
      ctx.ellipse(cx, midY + 9, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#CC8855";
      ctx.fillRect(cx - 3, midY + 5, 6, 4);

      // ── Bookshelf (right wall) ───────────────────
      ctx.fillStyle = "#3a2a18";
      ctx.strokeStyle = "#6a4a28";
      ctx.lineWidth = 1.5;
      rr(cx + W * 0.3, topY + 4, 40, 74, 2);
      ctx.fill();
      ctx.stroke();
      const bkC = [
        "#CC4433",
        "#3366FF",
        "#44CC66",
        "#FFAA22",
        "#AA44FF",
        "#FF6699",
      ];
      for (let si = 0; si < 3; si++) {
        ctx.fillStyle = "#2a1a08";
        ctx.fillRect(cx + W * 0.3 + 2, topY + 4 + si * 22 + 19, 36, 3);
        for (let bi = 0; bi < 4; bi++) {
          ctx.fillStyle = bkC[(si * 4 + bi) % bkC.length];
          ctx.fillRect(
            cx + W * 0.3 + 4 + bi * 8,
            topY + 4 + si * 22 + 2,
            7,
            16,
          );
        }
      }

      // ── Dining table (upper right area) ─────────
      const dtx = cx + W * 0.2,
        dty = topY + 88;
      ctx.fillStyle = "#5a3a22";
      ctx.strokeStyle = "#8a5a38";
      ctx.lineWidth = 1;
      rr(dtx - 30, dty - 18, 60, 36, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#4a2a18";
      ctx.strokeStyle = "#7a4a2a";
      for (const [ox, oy] of [
        [-36, -10],
        [30, -10],
        [-8, -28],
        [-8, 22],
      ]) {
        rr(dtx + ox - 8, dty + oy - 8, 16, 16, 3);
        ctx.fill();
        ctx.stroke();
      }

      // ── Floor lamp (left corner) ─────────────────
      const lx = cx - W * 0.34,
        ly = topY + 92;
      ctx.strokeStyle = "#886644";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, ly + 28);
      ctx.lineTo(lx, ly - 8);
      ctx.stroke();
      ctx.fillStyle = "#FFEEAA";
      ctx.shadowColor = "#FFDD88";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(lx - 14, ly);
      ctx.lineTo(lx + 14, ly);
      ctx.lineTo(lx + 8, ly - 12);
      ctx.lineTo(lx - 8, ly - 12);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#4a3a20";
      ctx.beginPath();
      ctx.ellipse(lx, ly + 28, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // ── Potted plant (right corner) ─────────────
      const ppx = cx + W * 0.36,
        ppy = midY + 14;
      ctx.fillStyle = "#4a2a10";
      ctx.fillRect(ppx - 8, ppy - 4, 16, 12);
      ctx.fillStyle = "#226622";
      ctx.shadowColor = "#22FF44";
      ctx.shadowBlur = 5;
      for (let li = 0; li < 5; li++) {
        const la = (li / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(
          ppx + Math.cos(la) * 11,
          ppy - 10 + Math.sin(la) * 5,
          9,
          5,
          la,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    } else if (type === "restaurant" || type === 0) {
      if (!!this.map?.config?.galactica) {
        // ═══ GALACTICA: NOVA DINER ═══
        const t = performance.now() / 1000;

        // ── Cosmic floor tiles ────────────────────────
        const tileSize = 60;
        for (let gy = 0; gy < Math.ceil(H / tileSize) + 1; gy++) {
          for (let gx = 0; gx < Math.ceil(W / tileSize) + 1; gx++) {
            const tx = gx * tileSize;
            const ty = gy * tileSize;
            const seed = gx * 13 + gy * 7;
            const baseColor = (seed % 3 === 0) ? "rgba(20,4,50,0.82)"
                            : (seed % 3 === 1) ? "rgba(12,2,38,0.82)"
                            : "rgba(16,3,44,0.82)";
            ctx.fillStyle = baseColor;
            ctx.fillRect(tx, ty, tileSize, tileSize);
            ctx.strokeStyle = "rgba(120,60,220,0.18)";
            ctx.lineWidth = 0.5;
            ctx.strokeRect(tx, ty, tileSize, tileSize);
            // Star inlays
            if (seed % 5 === 0) {
              ctx.fillStyle = `rgba(200,160,255,${0.3 + 0.15 * Math.sin(t * 1.3 + seed)})`;
              ctx.beginPath();
              ctx.arc(tx + 30, ty + 30, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // ── Room border glow ──────────────────────────
        ctx.strokeStyle = "rgba(160,80,255,0.55)";
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, W - 4, H - 4);
        ctx.strokeStyle = "rgba(100,200,255,0.18)";
        ctx.lineWidth = 1;
        ctx.strokeRect(6, 6, W - 12, H - 12);

        // ── Title sign ────────────────────────────────
        const signW = 280, signH = 28;
        const signX = W / 2 - signW / 2, signY = room.S - 24;
        const signGrad = ctx.createLinearGradient(signX, signY, signX + signW, signY);
        signGrad.addColorStop(0, "rgba(80,0,160,0.92)");
        signGrad.addColorStop(0.5, "rgba(140,0,255,0.98)");
        signGrad.addColorStop(1, "rgba(80,0,160,0.92)");
        ctx.fillStyle = signGrad;
        rr(signX, signY, signW, signH, 6);
        ctx.fill();
        ctx.strokeStyle = `rgba(200,120,255,${0.7 + 0.3 * Math.sin(t * 2)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#EEDDFF";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.fillText("◈  NOVA  DINER  ◈", W / 2, signY + 18);

        // ── Service counter (top area) ─────────────────
        const ctrY = topY + 30;
        const ctrW = 360, ctrH = 28;
        const ctrX = W / 2 - ctrW / 2;
        const ctrGrad = ctx.createLinearGradient(ctrX, ctrY, ctrX + ctrW, ctrY);
        ctrGrad.addColorStop(0, "#1a0040");
        ctrGrad.addColorStop(0.5, "#2a0060");
        ctrGrad.addColorStop(1, "#1a0040");
        ctx.fillStyle = ctrGrad;
        rr(ctrX, ctrY, ctrW, ctrH, 6);
        ctx.fill();
        ctx.strokeStyle = "rgba(160,80,255,0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Counter surface gleam
        ctx.fillStyle = "rgba(200,150,255,0.08)";
        ctx.fillRect(ctrX + 4, ctrY + 3, ctrW - 8, 6);
        // Counter items: menu terminal, food display domes
        for (let di = 0; di < 3; di++) {
          const dx = ctrX + 50 + di * 110;
          const dy = ctrY + 14;
          // dome
          ctx.fillStyle = `rgba(180,120,255,${0.15 + 0.08 * Math.sin(t * 1.2 + di)})`;
          ctx.beginPath();
          ctx.ellipse(dx, dy, 20, 10, 0, Math.PI, 0);
          ctx.fill();
          ctx.strokeStyle = "rgba(200,150,255,0.4)";
          ctx.lineWidth = 1;
          ctx.stroke();
          // plate
          ctx.fillStyle = "rgba(240,220,255,0.2)";
          ctx.beginPath();
          ctx.ellipse(dx, dy, 18, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // Menu terminal (right of counter)
        const termX = ctrX + ctrW - 38, termY = ctrY + 4;
        ctx.fillStyle = "#0d0030";
        rr(termX, termY, 28, 20, 3);
        ctx.fill();
        ctx.strokeStyle = "rgba(100,200,255,0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "rgba(100,200,255,0.7)";
        ctx.font = "4px monospace";
        ctx.textAlign = "center";
        ctx.fillText("ORDER", termX + 14, termY + 8);
        ctx.fillText("SYSTEM", termX + 14, termY + 14);

        // ── Menu board (left wall) ─────────────────────
        const mbX = 14, mbY = topY + 36, mbW = 100, mbH = 130;
        const mbGrad = ctx.createLinearGradient(mbX, mbY, mbX, mbY + mbH);
        mbGrad.addColorStop(0, "#0a0028");
        mbGrad.addColorStop(1, "#140050");
        ctx.fillStyle = mbGrad;
        rr(mbX, mbY, mbW, mbH, 6);
        ctx.fill();
        ctx.strokeStyle = "rgba(120,60,255,0.7)";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Neon border line
        ctx.strokeStyle = "rgba(180,100,255,0.3)";
        ctx.lineWidth = 1;
        rr(mbX + 4, mbY + 4, mbW - 8, mbH - 8, 4);
        ctx.stroke();
        ctx.fillStyle = "#CC88FF";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText("✦ MENU ✦", mbX + mbW / 2, mbY + 18);
        ctx.strokeStyle = "rgba(180,100,255,0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mbX + 8, mbY + 22);
        ctx.lineTo(mbX + mbW - 8, mbY + 22);
        ctx.stroke();
        const menuItems = [
          ["🍔 NOVA BURGER", "12 CR"],
          ["🍝 STARPASTA",   "16 CR"],
          ["🍕 VOID PIZZA",  "20 CR"],
          ["🥗 MOON SALAD",  " 9 CR"],
          ["☕ NEBULA BREW",  " 5 CR"],
        ];
        menuItems.forEach(([name, price], i) => {
          const my = mbY + 34 + i * 18;
          ctx.fillStyle = `rgba(200,160,255,${0.8 + 0.2 * Math.sin(t + i)})`;
          ctx.font = "5.5px monospace";
          ctx.textAlign = "left";
          ctx.fillText(name, mbX + 7, my);
          ctx.fillStyle = "#AAFFDD";
          ctx.textAlign = "right";
          ctx.fillText(price, mbX + mbW - 7, my);
          // separator
          ctx.strokeStyle = "rgba(100,50,200,0.3)";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(mbX + 7, my + 4);
          ctx.lineTo(mbX + mbW - 7, my + 4);
          ctx.stroke();
        });

        // ── Dining tables with chairs ──────────────────
        const tableConfigs = [
          { x: W * 0.22, y: H * 0.42 },
          { x: W * 0.50, y: H * 0.42 },
          { x: W * 0.78, y: H * 0.42 },
          { x: W * 0.28, y: H * 0.68 },
          { x: W * 0.72, y: H * 0.68 },
        ];
        for (const tc of tableConfigs) {
          const { x: tx, y: ty } = tc;
          const tW = 70, tH = 44;
          // Table shadow
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          rr(tx - tW / 2 + 3, ty - tH / 2 + 4, tW, tH, 6);
          ctx.fill();
          // Table surface
          const tGrad = ctx.createLinearGradient(tx - tW / 2, ty - tH / 2, tx + tW / 2, ty + tH / 2);
          tGrad.addColorStop(0, "#1c004a");
          tGrad.addColorStop(1, "#2e0070");
          ctx.fillStyle = tGrad;
          rr(tx - tW / 2, ty - tH / 2, tW, tH, 6);
          ctx.fill();
          ctx.strokeStyle = "rgba(160,80,255,0.7)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Table gleam
          ctx.fillStyle = "rgba(200,150,255,0.1)";
          ctx.fillRect(tx - tW / 2 + 4, ty - tH / 2 + 3, tW - 8, 6);

          // Chairs: top and bottom of table
          for (const side of [-1, 1]) {
            const cy2 = ty + side * (tH / 2 + 10);
            for (const cx2 of [tx - 16, tx + 16]) {
              ctx.fillStyle = "#0d0035";
              ctx.strokeStyle = "rgba(120,60,200,0.5)";
              ctx.lineWidth = 1;
              rr(cx2 - 9, cy2 - 7, 18, 14, 3);
              ctx.fill();
              ctx.stroke();
            }
          }
          // Side chairs
          for (const side of [-1, 1]) {
            const cxS = tx + side * (tW / 2 + 8);
            ctx.fillStyle = "#0d0035";
            ctx.strokeStyle = "rgba(120,60,200,0.5)";
            ctx.lineWidth = 1;
            rr(cxS - 7, ty - 8, 14, 16, 3);
            ctx.fill();
            ctx.stroke();
          }

          // Food items on table (small icons)
          // Burger
          ctx.fillStyle = "#CC8833";
          ctx.beginPath();
          ctx.arc(tx - 12, ty - 4, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#884400";
          ctx.beginPath();
          ctx.arc(tx - 12, ty - 4, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#AADD44";
          ctx.beginPath();
          ctx.arc(tx - 12, ty - 5, 3, Math.PI, 0);
          ctx.fill();
          // Drink cup
          ctx.fillStyle = "#2244AA";
          ctx.fillRect(tx + 6, ty - 8, 8, 11);
          ctx.fillStyle = "rgba(100,200,255,0.5)";
          ctx.fillRect(tx + 7, ty - 7, 6, 6);
          // Plate
          ctx.fillStyle = "rgba(220,210,255,0.3)";
          ctx.beginPath();
          ctx.arc(tx + 14, ty + 5, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#FFDD88";
          ctx.beginPath();
          ctx.arc(tx + 14, ty + 5, 3, 0, Math.PI * 2);
          ctx.fill();

          // Seated client figures at table
          const clientPositions = [
            { x: tx - 16, y: ty - tH / 2 - 18 },
            { x: tx + 16, y: ty - tH / 2 - 18 },
            { x: tx - 16, y: ty + tH / 2 + 18 },
            { x: tx + 16, y: ty + tH / 2 + 18 },
          ];
          const clientColors = ["#FF8888", "#88CCFF", "#AAFFAA", "#FFCC88", "#DD99FF"];
          const skinTones = ["#FFDDBB", "#F0C080", "#D4956A", "#EECCAA", "#FFE5CC"];
          const hairCols = ["#332211","#AA5522","#1a1a2a","#FFCC44","#884422"];
          const tableIdx = tableConfigs.indexOf(tc);
          clientPositions.forEach((cp, ci) => {
            const cc = clientColors[(tableIdx * 4 + ci) % clientColors.length];
            const skin = skinTones[(tableIdx * 4 + ci) % skinTones.length];
            const hair = hairCols[(tableIdx + ci) % hairCols.length];
            const isFemale = (tableIdx * 4 + ci) % 3 !== 0;
            const isEating = ci % 2 === 0; // alternating eating pose
            ctx.save();
            // Shadow
            ctx.fillStyle = "rgba(0,0,0,0.18)";
            ctx.beginPath(); ctx.ellipse(cp.x, cp.y + 4, 8, 3, 0, 0, Math.PI*2); ctx.fill();
            // Body
            ctx.fillStyle = cc;
            rr(cp.x - 7, cp.y - 7, 14, 16, 3);
            ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 0.5; ctx.stroke();
            // Neck
            ctx.fillStyle = skin;
            ctx.fillRect(cp.x - 2, cp.y - 9, 4, 4);
            // Head
            ctx.beginPath(); ctx.arc(cp.x, cp.y - 14, 7, 0, Math.PI * 2); ctx.fill();
            // Hair
            ctx.fillStyle = hair;
            if (isFemale) {
              ctx.beginPath(); ctx.arc(cp.x, cp.y - 17, 6, Math.PI, 0); ctx.fill();
              ctx.fillRect(cp.x - 7, cp.y - 18, 4, 10);
              ctx.fillRect(cp.x + 3, cp.y - 18, 4, 10);
            } else {
              ctx.beginPath(); ctx.arc(cp.x, cp.y - 18, 5, Math.PI * 1.1, Math.PI * 1.9); ctx.fill();
              ctx.fillRect(cp.x - 5, cp.y - 18, 10, 5);
            }
            // Eyes
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.ellipse(cp.x - 2.5, cp.y - 15, 1.8, 1.3, 0, 0, Math.PI*2);
            ctx.ellipse(cp.x + 2.5, cp.y - 15, 1.8, 1.3, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = ci % 2 === 0 ? "#2244AA" : "#226622";
            ctx.beginPath();
            ctx.arc(cp.x - 2.5, cp.y - 15, 1, 0, Math.PI*2);
            ctx.arc(cp.x + 2.5, cp.y - 15, 1, 0, Math.PI*2); ctx.fill();
            // Nose
            ctx.fillStyle = "rgba(0,0,0,0.2)";
            ctx.beginPath(); ctx.arc(cp.x, cp.y - 12.5, 1, 0, Math.PI*2); ctx.fill();
            // Mouth (smiling if not eating, open if eating)
            ctx.strokeStyle = isFemale ? "#CC4466" : "#AA6644";
            ctx.lineWidth = 1;
            if (isEating) {
              ctx.fillStyle = "#884422"; ctx.beginPath();
              ctx.ellipse(cp.x, cp.y - 10, 2.5, 1.5, 0, 0, Math.PI*2); ctx.fill();
            } else {
              ctx.beginPath(); ctx.arc(cp.x, cp.y - 10.5, 2.5, 0.1, Math.PI - 0.1); ctx.stroke();
            }
            // Arm (eating gesture or resting)
            if (isEating) {
              ctx.strokeStyle = skin; ctx.lineWidth = 2.5; ctx.lineCap = "round";
              ctx.beginPath(); ctx.moveTo(cp.x + 6, cp.y - 2); ctx.lineTo(cp.x + 11, cp.y - 9); ctx.stroke();
              // Fork/spoon in hand
              ctx.strokeStyle = "rgba(220,200,150,0.8)"; ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(cp.x + 11, cp.y - 9); ctx.lineTo(cp.x + 14, cp.y - 13); ctx.stroke();
              ctx.lineCap = "butt";
            }
            ctx.restore();
          });
        }

        // ── Decorative ambient particles ───────────────
        const ptSeed = Math.floor(t * 0.5);
        for (let pi = 0; pi < 8; pi++) {
          const px = (Math.sin(pi * 2.3 + t * 0.4) * 0.4 + 0.5) * W;
          const py = (Math.cos(pi * 1.7 + t * 0.3) * 0.35 + 0.5) * H;
          const palpha = 0.3 + 0.2 * Math.sin(t * 1.5 + pi);
          ctx.fillStyle = `rgba(180,100,255,${palpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── Cosmic candle/lamp accents ─────────────────
        const lampPositions = [
          [W * 0.48, topY + 64],
          [W * 0.52, topY + 64],
          [W - 16, H * 0.45],
          [W - 16, H * 0.65],
        ];
        for (const [lx, ly] of lampPositions) {
          const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 16);
          lg.addColorStop(0, `rgba(200,140,255,${0.5 + 0.2 * Math.sin(t * 2.1 + lx)})`);
          lg.addColorStop(1, "rgba(100,40,200,0)");
          ctx.fillStyle = lg;
          ctx.beginPath();
          ctx.arc(lx, ly, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(255,220,255,${0.7 + 0.3 * Math.sin(t * 2.1 + lx)})`;
          ctx.beginPath();
          ctx.arc(lx, ly, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── [T] TALK hint near NPC ─────────────────────
        ctx.fillStyle = "rgba(160,80,255,0.85)";
        rr(W / 2 - 34, topY + 60, 68, 14, 4);
        ctx.fill();
        ctx.fillStyle = "#EEDDFF";
        ctx.font = "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.fillText("[T] ORDER FOOD", W / 2, topY + 70);

      } else if (!!this.map?.config?.zombie) {
        // ═══ ZOMBIE: INFECTED DINER ═══
        const t=performance.now()/1000;
        // Sign
        ctx.fillStyle="rgba(80,0,0,0.9)"; rr(W/2-120,room.S-22,240,26,5); ctx.fill();
        ctx.strokeStyle=`rgba(255,40,40,${0.6+0.3*Math.sin(t*1.8)})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#FFAAAA"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
        ctx.fillText("☣  INFECTED DINER  ☣", W/2, room.S-9);
        // Overturned counter (top)
        ctx.fillStyle="#1a0a0a"; rr(W/2-160,topY+28,320,24,4); ctx.fill();
        ctx.strokeStyle="rgba(180,30,30,0.5)"; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="rgba(140,0,0,0.15)"; ctx.fillRect(W/2-158,topY+30,316,10);
        // Toppled tables with rotten food
        const tConfigs=[[W*0.2,H*0.40],[W*0.5,H*0.43],[W*0.78,H*0.40],[W*0.3,H*0.67],[W*0.7,H*0.67]];
        for (const [tx2,ty2] of tConfigs) {
          const angle=Math.sin(tx2*0.01)*0.4;
          ctx.save(); ctx.translate(tx2,ty2); ctx.rotate(angle);
          ctx.fillStyle="#1a0a00"; rr(-32,-18,64,36,4); ctx.fill();
          ctx.strokeStyle="rgba(100,40,0,0.6)"; ctx.lineWidth=1; ctx.stroke();
          // Rotten food on table
          ctx.fillStyle="rgba(80,120,20,0.7)"; ctx.beginPath(); ctx.arc(-10,-5,6,0,Math.PI*2); ctx.fill(); // moldy food
          ctx.fillStyle="rgba(140,0,0,0.5)"; ctx.beginPath(); ctx.ellipse(12,3,8,4,0.2,0,Math.PI*2); ctx.fill(); // blood/sauce
          // Knocked-over cup
          ctx.fillStyle="#2a1a00"; ctx.fillRect(16,-14,6,14);
          ctx.fillStyle="rgba(44,180,44,0.4)"; ctx.beginPath(); ctx.ellipse(22,-8,8,3,-0.3,0,Math.PI*2); ctx.fill();
          ctx.restore();
          // Broken chair nearby
          ctx.fillStyle="#120800"; ctx.strokeStyle="rgba(80,40,0,0.5)"; ctx.lineWidth=0.8;
          rr(tx2+28,ty2+14,14,12,2); ctx.fill(); ctx.stroke();
        }
        // Biohazard warning on left wall
        const bwx=18, bwy=H*0.36, bwW=80, bwH=80;
        ctx.fillStyle="rgba(40,0,0,0.85)"; rr(bwx,bwy,bwW,bwH,4); ctx.fill();
        ctx.strokeStyle="rgba(200,0,0,0.5)"; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle=`rgba(255,40,40,${0.7+0.3*Math.sin(t*1.5)})`; ctx.font="28px serif"; ctx.textAlign="center";
        ctx.fillText("☣", bwx+bwW/2, bwy+48);
        ctx.fillStyle="rgba(255,100,100,0.8)"; ctx.font="bold 5px monospace";
        ctx.fillText("CONTAMINATED", bwx+bwW/2, bwy+68);
        // Spreading infection pools on floor
        for (const [px3,py3,r] of [[W*0.4,H*0.55,22],[W*0.7,H*0.62,16],[W*0.2,H*0.72,18]]) {
          ctx.fillStyle="rgba(30,130,20,0.18)"; ctx.beginPath(); ctx.ellipse(px3,py3,r,r*0.6,px3*0.01,0,Math.PI*2); ctx.fill();
        }
        // Broken window (right wall)
        ctx.fillStyle="#0d0500"; rr(W-60,H*0.38,40,50,3); ctx.fill();
        ctx.strokeStyle="rgba(180,30,0,0.4)"; ctx.lineWidth=1; ctx.stroke();
        ctx.strokeStyle="rgba(80,80,80,0.6)"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(W-40,H*0.38); ctx.lineTo(W-30,H*0.38+30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W-20,H*0.38+5); ctx.lineTo(W-42,H*0.38+40); ctx.stroke();
        // Survivor message on wall
        ctx.fillStyle="rgba(200,80,0,0.7)"; ctx.font="bold 6px monospace"; ctx.textAlign="center";
        ctx.fillText("RUN. DO NOT EAT.", W/2, H*0.84);
      } else {
        // ── Default restaurant (non-galactica) ──────────
        // ── Bar counter (top) ────────────────────────
        ctx.fillStyle = "#3a2010";
        ctx.strokeStyle = "#6a4020";
        ctx.lineWidth = 1.5;
        rr(cx - 72, topY + 6, 144, 22, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(255,200,150,0.12)";
        ctx.fillRect(cx - 70, topY + 8, 140, 7);
        for (let i = 0; i < 4; i++) {
          const sx = cx - 54 + i * 36;
          ctx.fillStyle = "#AA5533";
          ctx.strokeStyle = "#CC7744";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(sx, topY + 38, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = "#886633";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx, topY + 38);
          ctx.lineTo(sx, topY + 30);
          ctx.stroke();
        }

        // ── 3 round dining tables ────────────────────
        for (const [tx2, ty2] of [
          [cx - W * 0.3, midY - 8],
          [cx, midY + 6],
          [cx + W * 0.28, midY - 8],
        ]) {
          ctx.fillStyle = "#FFEECC";
          ctx.strokeStyle = "#CC9966";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(tx2, ty2, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#EE8844";
          ctx.beginPath();
          ctx.arc(tx2, ty2, 17, 0, Math.PI * 2);
          ctx.fill();
          for (let ci = 0; ci < 3; ci++) {
            const ca = (ci / 3) * Math.PI * 2 - Math.PI / 2;
            ctx.fillStyle = "#5a3820";
            ctx.strokeStyle = "#8a5830";
            ctx.lineWidth = 1;
            rr(
              tx2 + Math.cos(ca) * 29 - 7,
              ty2 + Math.sin(ca) * 29 - 7,
              14,
              14,
              3,
            );
            ctx.fill();
            ctx.stroke();
          }
          ctx.fillStyle = "#FFEEAA";
          ctx.shadowColor = "#FFDD66";
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(tx2, ty2, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // ── Menu board (left wall) ───────────────────
        ctx.fillStyle = "#1a3a1a";
        ctx.strokeStyle = "#44AA44";
        ctx.lineWidth = 1.5;
        rr(cx - W * 0.46, topY + 4, 54, 64, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#AAFFAA";
        ctx.font = "bold 6px monospace";
        ctx.textAlign = "center";
        ctx.fillText("MENU", cx - W * 0.46 + 27, topY + 16);
        ctx.fillStyle = "#88FF88";
        ctx.font = "5px monospace";
        ["BURGER $8", "PASTA $12", "PIZZA $15", "SALAD $9", "COFFEE $4"].forEach(
          (t, i) => {
            ctx.fillText(t, cx - W * 0.46 + 27, topY + 26 + i * 9);
          },
        );
      } // end default restaurant
    } else if (type === 1) {
      // OFFICE
      const isSnowOffice = !!this.map?.config?.snow;
      const t = performance.now() / 1000;

      if (isSnowOffice) {
        // ═══ FROZEN TUNDRA: WINTER CORPORATE OFFICE ═══

        // ── Office sign ───────────────────
        ctx.fillStyle = "#AADDFF";
        ctx.shadowColor = "#66BBFF";
        ctx.shadowBlur = 12;
        ctx.font = "bold 10px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("❄ FROST CORP OFFICE ❄", cx, topY - 2);
        ctx.shadowBlur = 0;

        // ── Row of desks with workers (top row) ───────────────────
        for (let di = 0; di < 3; di++) {
          const deskX = cx - W * 0.35 + di * W * 0.3;
          const deskY = topY + 8;

          // Desk
          ctx.fillStyle = "#1a2a3a";
          ctx.strokeStyle = "#3a5a7a";
          ctx.lineWidth = 1.5;
          rr(deskX - 30, deskY, 60, 32, 3);
          ctx.fill();
          ctx.stroke();

          // Computer monitor
          ctx.fillStyle = "#0a1520";
          ctx.strokeStyle = "#66BBFF";
          ctx.lineWidth = 1;
          rr(deskX - 18, deskY + 2, 36, 24, 2);
          ctx.fill();
          ctx.stroke();
          // Screen glow
          const screenPulse = Math.sin(t * 2 + di) * 0.2 + 0.8;
          ctx.fillStyle = `rgba(100,180,255,${0.3 * screenPulse})`;
          ctx.fillRect(deskX - 16, deskY + 4, 32, 18);
          // Data on screen
          ctx.fillStyle = "#88DDFF";
          ctx.font = "4px monospace";
          ctx.textAlign = "center";
          for (let li = 0; li < 3; li++) {
            ctx.fillText("▓▓▓▓▓▓", deskX, deskY + 8 + li * 5);
          }

          // Keyboard
          ctx.fillStyle = "#0c1820";
          rr(deskX - 14, deskY + 28, 28, 8, 1);
          ctx.fill();
          for (let ki = 0; ki < 5; ki++) {
            ctx.fillStyle = `rgba(100,180,255,${0.25 + Math.sin(t + ki + di) * 0.1})`;
            ctx.fillRect(deskX - 12 + ki * 5, deskY + 30, 4, 4);
          }

          // Office chair behind desk
          ctx.fillStyle = "#2a4050";
          ctx.strokeStyle = "#4a6070";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(deskX, deskY + 48, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // Chair back
          ctx.fillStyle = "#3a5060";
          rr(deskX - 10, deskY + 38, 20, 12, 2);
          ctx.fill();

          // Worker sitting at desk - more realistic rendering
          const bobY = Math.sin(t * 0.8 + di * 2) * 1;
          const breathe = Math.sin(t * 1.2 + di) * 0.5;
          const workerColors = [
            { suit: "#3355AA", shirt: "#DDEEFF", hair: "#443322", skin: "#E8D4C4" },
            { suit: "#4466BB", shirt: "#EEFFEE", hair: "#2a1a10", skin: "#D4C4B4" },
            { suit: "#5577CC", shirt: "#FFEEDD", hair: "#554433", skin: "#F0E0D0" }
          ][di];

          // Arms resting on desk
          ctx.fillStyle = workerColors.suit;
          ctx.fillRect(deskX - 18, deskY + 26 + bobY, 8, 10);
          ctx.fillRect(deskX + 10, deskY + 26 + bobY, 8, 10);
          // Hands on keyboard
          ctx.fillStyle = workerColors.skin;
          ctx.beginPath();
          ctx.arc(deskX - 10, deskY + 32 + bobY, 3, 0, Math.PI * 2);
          ctx.arc(deskX + 10, deskY + 32 + bobY, 3, 0, Math.PI * 2);
          ctx.fill();

          // Body/torso (business attire)
          ctx.fillStyle = workerColors.suit;
          ctx.beginPath();
          ctx.moveTo(deskX - 10, deskY + 56 + bobY);
          ctx.lineTo(deskX - 12, deskY + 40 + breathe);
          ctx.lineTo(deskX - 8, deskY + 36 + breathe);
          ctx.lineTo(deskX + 8, deskY + 36 + breathe);
          ctx.lineTo(deskX + 12, deskY + 40 + breathe);
          ctx.lineTo(deskX + 10, deskY + 56 + bobY);
          ctx.closePath();
          ctx.fill();

          // Collar/shirt visible
          ctx.fillStyle = workerColors.shirt;
          ctx.beginPath();
          ctx.moveTo(deskX - 4, deskY + 38 + breathe);
          ctx.lineTo(deskX, deskY + 42 + breathe);
          ctx.lineTo(deskX + 4, deskY + 38 + breathe);
          ctx.closePath();
          ctx.fill();

          // Neck
          ctx.fillStyle = workerColors.skin;
          ctx.fillRect(deskX - 3, deskY + 32 + bobY, 6, 6);

          // Head - more detailed
          ctx.fillStyle = workerColors.skin;
          ctx.beginPath();
          ctx.ellipse(deskX, deskY + 28 + bobY, 8, 9, 0, 0, Math.PI * 2);
          ctx.fill();

          // Ears
          ctx.beginPath();
          ctx.ellipse(deskX - 8, deskY + 28 + bobY, 2, 3, 0, 0, Math.PI * 2);
          ctx.ellipse(deskX + 8, deskY + 28 + bobY, 2, 3, 0, 0, Math.PI * 2);
          ctx.fill();

          // Hair - varied styles
          ctx.fillStyle = workerColors.hair;
          if (di === 0) {
            // Short neat hair
            ctx.beginPath();
            ctx.ellipse(deskX, deskY + 22 + bobY, 8, 5, 0, Math.PI, 0);
            ctx.fill();
            ctx.fillRect(deskX - 7, deskY + 20 + bobY, 14, 5);
          } else if (di === 1) {
            // Side-parted hair
            ctx.beginPath();
            ctx.ellipse(deskX + 1, deskY + 21 + bobY, 9, 6, 0.1, Math.PI, 0);
            ctx.fill();
            ctx.fillRect(deskX - 7, deskY + 21 + bobY, 15, 4);
          } else {
            // Longer hair
            ctx.beginPath();
            ctx.ellipse(deskX, deskY + 21 + bobY, 9, 6, 0, Math.PI, 0);
            ctx.fill();
            ctx.fillRect(deskX - 8, deskY + 21 + bobY, 16, 6);
            // Side hair
            ctx.fillRect(deskX - 9, deskY + 25 + bobY, 3, 6);
            ctx.fillRect(deskX + 6, deskY + 25 + bobY, 3, 6);
          }

          // Eyes
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.ellipse(deskX - 3, deskY + 27 + bobY, 2.5, 2, 0, 0, Math.PI * 2);
          ctx.ellipse(deskX + 3, deskY + 27 + bobY, 2.5, 2, 0, 0, Math.PI * 2);
          ctx.fill();
          // Pupils - looking at screen
          ctx.fillStyle = "#3a4a5a";
          ctx.beginPath();
          ctx.arc(deskX - 3, deskY + 27 + bobY, 1, 0, Math.PI * 2);
          ctx.arc(deskX + 3, deskY + 27 + bobY, 1, 0, Math.PI * 2);
          ctx.fill();

          // Eyebrows
          ctx.strokeStyle = workerColors.hair;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(deskX - 5, deskY + 24 + bobY);
          ctx.lineTo(deskX - 1, deskY + 23 + bobY);
          ctx.moveTo(deskX + 1, deskY + 23 + bobY);
          ctx.lineTo(deskX + 5, deskY + 24 + bobY);
          ctx.stroke();

          // Nose (subtle)
          ctx.strokeStyle = "rgba(150,120,100,0.4)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(deskX, deskY + 28 + bobY);
          ctx.lineTo(deskX, deskY + 31 + bobY);
          ctx.stroke();

          // Mouth - focused expression
          ctx.strokeStyle = "#AA8877";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(deskX - 2, deskY + 33 + bobY);
          ctx.lineTo(deskX + 2, deskY + 33 + bobY);
          ctx.stroke();
        }

        // ── Central meeting area with workers ───────────────────
        // Table
        ctx.fillStyle = "#1a2838";
        ctx.strokeStyle = "#3a5868";
        ctx.lineWidth = 1.5;
        rr(cx - 50, midY - 12, 100, 40, 4);
        ctx.fill();
        ctx.stroke();

        // Documents on table
        ctx.fillStyle = "#EEFFFF";
        ctx.fillRect(cx - 30, midY - 6, 18, 24);
        ctx.fillRect(cx + 10, midY - 4, 18, 24);

        // Workers around meeting table - more realistic
        const meetingWorkers = [
          { x: cx - 60, y: midY + 6, suit: "#4477AA", shirt: "#DDEEFF", hair: "#3a2a1a", skin: "#E8D4C4", isWoman: false },
          { x: cx + 60, y: midY + 6, suit: "#5588BB", shirt: "#EEDDFF", hair: "#554433", skin: "#D4C4B4", isWoman: true },
          { x: cx - 20, y: midY + 38, suit: "#3366AA", shirt: "#EEFFEE", hair: "#2a2a2a", skin: "#F0E0D0", isWoman: false },
          { x: cx + 20, y: midY + 38, suit: "#4477BB", shirt: "#FFEEDD", hair: "#443322", skin: "#E0D0C0", isWoman: true },
        ];
        for (let wi = 0; wi < meetingWorkers.length; wi++) {
          const w = meetingWorkers[wi];
          const wb = Math.sin(t * 1.1 + wi * 1.5) * 0.5;

          // Chair
          ctx.fillStyle = "#2a4050";
          ctx.beginPath();
          ctx.arc(w.x, w.y + 4, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#3a5060";
          rr(w.x - 8, w.y - 4, 16, 10, 2);
          ctx.fill();

          // Arms on table
          ctx.fillStyle = w.suit;
          ctx.fillRect(w.x - 14, w.y - 10 + wb, 6, 8);
          ctx.fillRect(w.x + 8, w.y - 10 + wb, 6, 8);
          // Hands
          ctx.fillStyle = w.skin;
          ctx.beginPath();
          ctx.arc(w.x - 8, w.y - 6 + wb, 3, 0, Math.PI * 2);
          ctx.arc(w.x + 8, w.y - 6 + wb, 3, 0, Math.PI * 2);
          ctx.fill();

          // Body
          ctx.fillStyle = w.suit;
          ctx.beginPath();
          ctx.moveTo(w.x - 8, w.y + 4);
          ctx.lineTo(w.x - 10, w.y - 12 + wb);
          ctx.lineTo(w.x - 6, w.y - 16 + wb);
          ctx.lineTo(w.x + 6, w.y - 16 + wb);
          ctx.lineTo(w.x + 10, w.y - 12 + wb);
          ctx.lineTo(w.x + 8, w.y + 4);
          ctx.closePath();
          ctx.fill();

          // Collar
          ctx.fillStyle = w.shirt;
          ctx.beginPath();
          ctx.moveTo(w.x - 3, w.y - 14 + wb);
          ctx.lineTo(w.x, w.y - 10 + wb);
          ctx.lineTo(w.x + 3, w.y - 14 + wb);
          ctx.closePath();
          ctx.fill();

          // Neck
          ctx.fillStyle = w.skin;
          ctx.fillRect(w.x - 2, w.y - 20 + wb, 4, 5);

          // Head
          ctx.beginPath();
          ctx.ellipse(w.x, w.y - 26 + wb, 7, 8, 0, 0, Math.PI * 2);
          ctx.fill();

          // Hair
          ctx.fillStyle = w.hair;
          if (w.isWoman) {
            // Longer hair for women
            ctx.beginPath();
            ctx.ellipse(w.x, w.y - 31 + wb, 8, 5, 0, Math.PI, 0);
            ctx.fill();
            ctx.fillRect(w.x - 8, w.y - 31 + wb, 16, 8);
            // Side hair
            ctx.fillRect(w.x - 9, w.y - 26 + wb, 3, 10);
            ctx.fillRect(w.x + 6, w.y - 26 + wb, 3, 10);
          } else {
            // Short hair for men
            ctx.beginPath();
            ctx.ellipse(w.x, w.y - 31 + wb, 7, 4, 0, Math.PI, 0);
            ctx.fill();
            ctx.fillRect(w.x - 6, w.y - 30 + wb, 12, 4);
          }

          // Eyes
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.ellipse(w.x - 2.5, w.y - 26 + wb, 2, 1.5, 0, 0, Math.PI * 2);
          ctx.ellipse(w.x + 2.5, w.y - 26 + wb, 2, 1.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#3a4a5a";
          ctx.beginPath();
          ctx.arc(w.x - 2.5, w.y - 26 + wb, 0.8, 0, Math.PI * 2);
          ctx.arc(w.x + 2.5, w.y - 26 + wb, 0.8, 0, Math.PI * 2);
          ctx.fill();

          // Mouth
          ctx.strokeStyle = "#AA8877";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          if (wi % 2 === 0) {
            // Slight smile
            ctx.arc(w.x, w.y - 21 + wb, 2, 0.2, Math.PI - 0.2);
          } else {
            // Neutral
            ctx.moveTo(w.x - 2, w.y - 21 + wb);
            ctx.lineTo(w.x + 2, w.y - 21 + wb);
          }
          ctx.stroke();
        }

        // ── Whiteboard (top wall - ice themed) ───────────────────
        ctx.fillStyle = "#DDEEFF";
        ctx.strokeStyle = "#66AACC";
        ctx.lineWidth = 1.5;
        rr(cx + W * 0.25, topY + 4, 60, 50, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#446688";
        ctx.font = "bold 5px monospace";
        ctx.textAlign = "center";
        ctx.fillText("Q4 TARGETS", cx + W * 0.25 + 30, topY + 14);
        // Chart
        ctx.strokeStyle = "#5588AA";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + W * 0.25 + 8, topY + 46);
        ctx.lineTo(cx + W * 0.25 + 18, topY + 32);
        ctx.lineTo(cx + W * 0.25 + 30, topY + 38);
        ctx.lineTo(cx + W * 0.25 + 42, topY + 24);
        ctx.lineTo(cx + W * 0.25 + 52, topY + 20);
        ctx.stroke();

        // ── Water cooler (left corner) ───────────────────
        ctx.fillStyle = "#88CCFF";
        ctx.strokeStyle = "#66AADD";
        ctx.lineWidth = 1;
        rr(cx - W * 0.42, topY + 10, 20, 36, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#AADDFF";
        ctx.beginPath();
        ctx.ellipse(cx - W * 0.42 + 10, topY + 8, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Water inside
        ctx.fillStyle = "rgba(100,200,255,0.4)";
        ctx.fillRect(cx - W * 0.42 + 3, topY + 20, 14, 22);

        // ── Coffee mug on desk (detail) ───────────────────
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(cx - W * 0.35 + 20, topY + 26, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#6B4423";
        ctx.beginPath();
        ctx.arc(cx - W * 0.35 + 20, topY + 26, 3, 0, Math.PI * 2);
        ctx.fill();

        // ── Snowflake particles ───────────────────
        for (let i = 0; i < 6; i++) {
          const px2 = W * 0.15 + (t * 12 + i * 45) % (W * 0.7);
          const py2 = topY + 20 + Math.sin(t * 0.6 + i * 2) * 25 + i * 12;
          const alpha = Math.sin(t * 1.5 + i) * 0.25 + 0.35;
          ctx.fillStyle = `rgba(200,230,255,${alpha})`;
          ctx.beginPath();
          ctx.arc(px2, py2, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

      } else {
        // ═══ DEFAULT OFFICE ═══
        // ── Meeting table (center) ───────────────────
        ctx.fillStyle = "#2a3a4a";
        ctx.strokeStyle = "#4a6a8a";
        ctx.lineWidth = 1.5;
        rr(cx - 58, midY - 26, 116, 52, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#1a2a3a";
        rr(cx - 54, midY - 22, 108, 44, 2);
        ctx.fill();
        ctx.fillStyle = "#334455";
        ctx.strokeStyle = "#4466AA";
        ctx.lineWidth = 1;
        for (const [ox, oy] of [
          [-68, -16],
          [-68, 6],
          [68, -16],
          [68, 6],
          [-24, -34],
          [24, -34],
          [-24, 32],
          [24, 32],
        ]) {
          ctx.beginPath();
          ctx.arc(cx + ox, midY + oy, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        for (let li = 0; li < 3; li++) {
          ctx.fillStyle = "#223344";
          ctx.fillRect(cx - 42 + li * 44, midY - 14, 26, 20);
          ctx.fillStyle = "#1155AA";
          ctx.fillRect(cx - 40 + li * 44, midY - 12, 22, 16);
        }

        // ── Whiteboard (top wall) ────────────────────
        ctx.fillStyle = "#EEFFEE";
        ctx.strokeStyle = "#44AA44";
        ctx.lineWidth = 1.5;
        rr(cx - 46, topY + 4, 92, 44, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#225522";
        ctx.font = "bold 6px monospace";
        ctx.textAlign = "center";
        ctx.fillText("QUARTERLY REPORT", cx, topY + 14);
        ctx.strokeStyle = "#338833";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 38, topY + 20);
        ctx.lineTo(cx + 38, topY + 20);
        ctx.stroke();
        ctx.strokeStyle = "#66AA66";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 32, topY + 42);
        ctx.lineTo(cx - 18, topY + 30);
        ctx.lineTo(cx - 4, topY + 36);
        ctx.lineTo(cx + 12, topY + 26);
        ctx.lineTo(cx + 28, topY + 20);
        ctx.stroke();

        // ── Corner desk + monitor ────────────────────
        ctx.fillStyle = "#2a3a4a";
        ctx.strokeStyle = "#4a5a6a";
        ctx.lineWidth = 1;
        rr(cx + W * 0.3, topY + 86, 46, 40, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#111118";
        ctx.strokeStyle = "#44EEFF";
        ctx.lineWidth = 1;
        rr(cx + W * 0.3 + 7, topY + 88, 32, 22, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#002244";
        ctx.fillRect(cx + W * 0.3 + 9, topY + 90, 28, 18);
        ctx.fillStyle = "#0055FF";
        ctx.fillRect(cx + W * 0.3 + 11, topY + 92, 24, 7);

        // Plant corner
        ctx.fillStyle = "#3a2810";
        ctx.fillRect(cx - W * 0.37, topY + 90, 14, 10);
        ctx.fillStyle = "#225522";
        ctx.shadowColor = "#44FF44";
        ctx.shadowBlur = 4;
        for (let li = 0; li < 4; li++) {
          const la = (li / 4) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(
            cx - W * 0.37 + 7 + Math.cos(la) * 9,
            topY + 88 + Math.sin(la) * 4,
            7,
            4,
            la,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }
    } else if (type === 2) {
      // HOTEL
      // ── Reception desk ───────────────────────────
      ctx.fillStyle = "#3a2510";
      ctx.strokeStyle = "#8a6030";
      ctx.lineWidth = 1.5;
      rr(cx - 50, topY + 4, 100, 30, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#5a3820";
      rr(cx - 46, topY + 6, 92, 14, 2);
      ctx.fill();
      ctx.fillStyle = "#111118";
      ctx.strokeStyle = "#44EEFF";
      ctx.lineWidth = 1;
      ctx.fillRect(cx - 15, topY + 7, 30, 20);
      ctx.fillStyle = "#002244";
      ctx.fillRect(cx - 13, topY + 9, 26, 16);
      // hotel bell
      ctx.fillStyle = "#FFCC44";
      ctx.shadowColor = "#FFCC44";
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(cx + 28, topY + 21, 8, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(cx + 20, topY + 21, 16, 3);
      ctx.shadowBlur = 0;

      // ── Lobby sofas ──────────────────────────────
      for (const [sx, sw, flip] of [
        [cx - W * 0.3, 70, false],
        [cx + W * 0.14, 70, true],
      ]) {
        const sx2 = flip ? sx - sw : sx;
        ctx.fillStyle = "#4a3060";
        ctx.strokeStyle = "#7a50A0";
        ctx.lineWidth = 1.5;
        rr(sx2, midY - 6, sw, 28, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#3a2050";
        rr(sx2, midY - 20, sw, 16, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#5a4080";
        ctx.fillRect(sx2 + 4, midY - 3, sw / 2 - 8, 22);
        ctx.fillRect(sx2 + sw / 2 + 4, midY - 3, sw / 2 - 8, 22);
      }

      // ── Central fountain ─────────────────────────
      ctx.strokeStyle = "#44CCFF";
      ctx.lineWidth = 2;
      ctx.fillStyle = "#0a1a2a";
      ctx.beginPath();
      ctx.arc(cx, midY + 22, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#1a3a5a";
      ctx.beginPath();
      ctx.arc(cx, midY + 22, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(68,204,255,0.3)";
      for (let i = 0; i < 5; i++) {
        const wa = (i / 5) * Math.PI * 2,
          wr = 9 + Math.sin(i * 1.3) * 4;
        ctx.beginPath();
        ctx.ellipse(
          cx + Math.cos(wa) * wr,
          midY + 22 + Math.sin(wa) * wr * 0.5,
          3,
          2,
          wa,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.fillStyle = "#AAEEFF";
      ctx.shadowColor = "#44CCFF";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, midY + 12, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (type === 3) {
      // MARKET
      if (!!this.map?.config?.galactica) {
        // ═══ GALACTICA: GALACTIC BAZAAR — counter+NPC at top, shelves below ═══
        const t = performance.now() / 1000;
        const PURP = "#AA88FF", GOLD = "#FFDD55", CYAN = "#55DDFF", PINK = "#FF55CC";

        // ─── GALACTIC BAZAAR — mirroring car-dealer layout ───────────────

        // ── Floor grid (same as dealer) ──
        for (let ty2 = 0; ty2 < room.H; ty2++) {
          for (let tx2 = 0; tx2 < room.W; tx2++) {
            const tile = room.layout[ty2][tx2];
            const px2 = tx2 * room.S, py2 = ty2 * room.S;
            if (tile === 1) {
              ctx.fillStyle = "#04020c";
              ctx.fillRect(px2, py2, room.S, room.S);
              if ((tx2 + ty2) % 4 === 0) {
                ctx.fillStyle = "rgba(170,100,255,0.12)";
                ctx.fillRect(px2 + room.S / 2 - 1, py2, 2, room.S);
              }
            } else {
              ctx.fillStyle = (tx2 + ty2) % 2 === 0 ? "#05031a" : "#030114";
              ctx.fillRect(px2, py2, room.S, room.S);
              ctx.strokeStyle = "rgba(150,80,255,0.07)";
              ctx.lineWidth = 1;
              ctx.strokeRect(px2, py2, room.S, room.S);
              const seed = tx2 * 17 + ty2 * 11;
              if (seed % 7 === 0) {
                const tw = Math.sin(t * 3 + seed) * 0.5 + 0.5;
                ctx.fillStyle = `rgba(220,200,255,${0.05 + tw * 0.1})`;
                ctx.beginPath();
                ctx.arc(px2 + (seed % (room.S - 4)) + 2, py2 + ((seed * 3) % (room.S - 4)) + 2, 1, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          }
        }

        // Purple room border (like cyan in dealer)
        ctx.strokeStyle = "#AA88FF";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#AA88FF";
        ctx.shadowBlur = 20;
        ctx.strokeRect(room.S + 2, room.S + 2, W - room.S * 2 - 4, H - room.S * 2 - 4);
        ctx.shadowBlur = 0;

        // Top accent bar
        const topGrad2 = ctx.createLinearGradient(0, room.S, W, room.S);
        topGrad2.addColorStop(0, "rgba(200,100,255,0.15)");
        topGrad2.addColorStop(0.5, "rgba(170,136,255,0.5)");
        topGrad2.addColorStop(1, "rgba(200,100,255,0.15)");
        ctx.fillStyle = topGrad2;
        ctx.fillRect(room.S, room.S, W - room.S * 2, 4);

        // Showroom title
        ctx.save();
        ctx.font = "bold 20px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#CC99FF";
        ctx.shadowColor = "#AA88FF";
        ctx.shadowBlur = 28;
        ctx.fillText("⬡  GALACTIC BAZAAR  ⬡", W / 2, room.S - 20);
        ctx.shadowBlur = 0;
        ctx.restore();

        // ── CASHIER COUNTER (same position as dealer) ──
        const ctrX = W / 2 - 75, ctrY = room.S * 1.2, ctrW = 150, ctrH = 40;

        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(ctrX + 4, ctrY + ctrH + 2, ctrW, 6);

        ctx.fillStyle = "#0e0520";
        ctx.fillRect(ctrX, ctrY, ctrW, ctrH);
        ctx.fillStyle = "#1e0d38";
        ctx.fillRect(ctrX - 5, ctrY, ctrW + 10, 6);

        ctx.strokeStyle = "#AA88FF";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#AA88FF";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(ctrX - 5, ctrY + 3);
        ctx.lineTo(ctrX + ctrW + 5, ctrY + 3);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Scanner on counter
        const scanP = Math.sin(t * 4) * 0.5 + 0.5;
        ctx.fillStyle = "#080220";
        rr(ctrX + 10, ctrY + 8, 60, 18, 3);
        ctx.fill();
        ctx.strokeStyle = `rgba(85,221,255,${0.4 + scanP * 0.6})`;
        ctx.lineWidth = 1;
        rr(ctrX + 10, ctrY + 8, 60, 18, 3);
        ctx.stroke();
        ctx.fillStyle = `rgba(85,221,255,${0.1 + scanP * 0.2})`;
        ctx.fillRect(ctrX + 13, ctrY + 10 + scanP * 8, 54, 3);
        ctx.fillStyle = CYAN;
        ctx.font = "bold 5px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.shadowColor = CYAN;
        ctx.shadowBlur = 5;
        ctx.fillText("SCAN", ctrX + 40, ctrY + 32);
        ctx.shadowBlur = 0;

        // Credit display
        ctx.fillStyle = "#050115";
        rr(ctrX + 82, ctrY + 8, 52, 26, 3);
        ctx.fill();
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1;
        rr(ctrX + 82, ctrY + 8, 52, 26, 3);
        ctx.stroke();
        ctx.fillStyle = GOLD;
        ctx.font = "bold 5px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("CREDITS", ctrX + 108, ctrY + 17);
        ctx.font = "bold 7px Orbitron, monospace";
        ctx.fillText("∞", ctrX + 108, ctrY + 30);

        ctx.fillStyle = "#CC99FF";
        ctx.shadowColor = "#AA88FF";
        ctx.shadowBlur = 10;
        ctx.font = "bold 12px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("BAZAAR DESK", ctrX + ctrW / 2, ctrY + 26);
        ctx.shadowBlur = 0;

        // ── DISPLAY ITEMS ON PLATFORMS (same structure as car dealer) ──
        const displays = [
          // Front row
          { x: W * 0.18, y: H * 0.45, color: "#FF55FF", name: "VOID CRYSTAL", label: "8 CR" },
          { x: W * 0.38, y: H * 0.42, color: "#55AAFF", name: "NOVA SHARD",   label: "12 CR" },
          { x: W * 0.62, y: H * 0.42, color: "#FFAA55", name: "STAR SPICE",   label: "5 CR" },
          { x: W * 0.82, y: H * 0.45, color: "#44FF99", name: "NEBULA HERB",  label: "3 CR" },
          // Back row
          { x: W * 0.28, y: H * 0.58, color: "#CC88FF", name: "DARK MATTER",  label: "20 CR" },
          { x: W * 0.72, y: H * 0.58, color: "#FF8888", name: "PLASMA ORB",   label: "15 CR" },
        ];

        for (const disp of displays) {
          const pulse = Math.sin(t * 1.5 + disp.x * 0.01) * 0.3 + 0.7;
          const hover = Math.sin(t * 2 + disp.x * 0.02) * 4;
          ctx.save();
          ctx.translate(disp.x, disp.y + hover);

          // Platform base (like dealer)
          ctx.beginPath();
          ctx.arc(0, 15, 45, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(100,50,200,0.08)";
          ctx.fill();
          ctx.strokeStyle = `rgba(170,136,255,${0.55 * pulse})`;
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(0, 15, 34, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(200,100,255,${0.3 * pulse})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Rotating energy under item
          ctx.save();
          ctx.translate(0, 15);
          ctx.rotate(t * 0.8);
          for (let i = 0; i < 6; i++) {
            ctx.fillStyle = `rgba(170,136,255,${0.18 * pulse})`;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, 38, (i * Math.PI * 2) / 6, (i * Math.PI * 2) / 6 + 0.35);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();

          // ── ITEM (floating geometric shape) ──
          ctx.save();
          ctx.rotate(t * 0.4 + disp.x * 0.01);

          // Shadow
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.beginPath();
          ctx.ellipse(2, 12, 22, 8, 0, 0, Math.PI * 2);
          ctx.fill();

          // Glowing item body
          ctx.shadowColor = disp.color;
          ctx.shadowBlur = 18 * pulse;
          ctx.fillStyle = disp.color + "CC";
          ctx.strokeStyle = disp.color;
          ctx.lineWidth = 1.5;

          // Each item has a unique shape based on index
          const idx = displays.indexOf(disp);
          if (idx === 0) {
            // Crystal: tall hexagon
            ctx.beginPath();
            for (let h = 0; h < 6; h++) {
              const ha = (h * Math.PI) / 3 - Math.PI / 6;
              const hx = Math.cos(ha) * 16, hy = Math.sin(ha) * 22;
              h === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.fill(); ctx.stroke();
          } else if (idx === 1) {
            // Shard: jagged crystal
            ctx.beginPath();
            ctx.moveTo(0, -22); ctx.lineTo(10, -6); ctx.lineTo(16, 4);
            ctx.lineTo(6, 10); ctx.lineTo(-6, 10); ctx.lineTo(-16, 4);
            ctx.lineTo(-10, -6); ctx.closePath();
            ctx.fill(); ctx.stroke();
          } else if (idx === 2) {
            // Spice: 5-pointed star
            for (let s = 0; s < 5; s++) {
              const ao = (s * Math.PI * 2) / 5 - Math.PI / 2;
              const ai = ao + Math.PI / 5;
              s === 0 ? ctx.moveTo(Math.cos(ao) * 18, Math.sin(ao) * 18) : ctx.lineTo(Math.cos(ao) * 18, Math.sin(ao) * 18);
              ctx.lineTo(Math.cos(ai) * 9, Math.sin(ai) * 9);
            }
            ctx.closePath(); ctx.fill(); ctx.stroke();
          } else if (idx === 3) {
            // Herb: diamond with inner glow
            ctx.beginPath();
            ctx.moveTo(0, -20); ctx.lineTo(14, 0); ctx.lineTo(0, 14); ctx.lineTo(-14, 0);
            ctx.closePath(); ctx.fill(); ctx.stroke();
          } else if (idx === 4) {
            // Dark matter: spinning ring
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#000010";
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = disp.color;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 12 * pulse;
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            // Plasma orb: glowing sphere
            const rGrad = ctx.createRadialGradient(-5, -5, 2, 0, 0, 18);
            rGrad.addColorStop(0, "#FFFFFF");
            rGrad.addColorStop(0.4, disp.color);
            rGrad.addColorStop(1, disp.color + "44");
            ctx.fillStyle = rGrad;
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.shadowBlur = 0;
          ctx.restore();

          // Name label
          ctx.fillStyle = "#FFFFFF";
          ctx.shadowColor = disp.color;
          ctx.shadowBlur = 8;
          ctx.font = "bold 8px Orbitron, monospace";
          ctx.textAlign = "center";
          ctx.fillText(disp.name, 0, 46);
          ctx.shadowBlur = 0;

          // Price tag
          ctx.fillStyle = "rgba(10,2,30,0.85)";
          rr(-14, 50, 28, 12, 3);
          ctx.fill();
          ctx.strokeStyle = GOLD;
          ctx.lineWidth = 1;
          ctx.shadowColor = GOLD;
          ctx.shadowBlur = 5;
          rr(-14, 50, 28, 12, 3);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.fillStyle = GOLD;
          ctx.font = "bold 6px Orbitron, monospace";
          ctx.fillText(disp.label, 0, 59);

          ctx.restore();
        }

        // ── AMBIENT PARTICLES ──
        for (let i = 0; i < 12; i++) {
          const px2 = (t * 22 + i * 88) % W;
          const py2 = room.S * 1.5 + Math.sin(t + i * 2) * 22 + (i * (H - room.S * 3)) / 12;
          const alpha = Math.sin(t * 2 + i) * 0.3 + 0.4;
          ctx.fillStyle = i % 3 === 0
            ? `rgba(170,136,255,${alpha})`
            : i % 3 === 1
              ? `rgba(200,100,255,${alpha})`
              : `rgba(100,180,255,${alpha})`;
          ctx.beginPath();
          ctx.arc(px2, py2, i % 4 === 0 ? 2 : 1, 0, Math.PI * 2);
          ctx.fill();
        }

        // Side strips
        ctx.fillStyle = "rgba(150,80,255,0.22)";
        ctx.fillRect(room.S, room.S * 1.5, 3, H - room.S * 3);
        ctx.fillRect(W - room.S - 3, room.S * 1.5, 3, H - room.S * 3);

      } else if (!!this.map?.config?.zombie) {
        // ═══ ZOMBIE: LOOTED BAZAAR ═══
        const t=performance.now()/1000;
        // Sign
        ctx.fillStyle="rgba(0,40,0,0.9)"; rr(W/2-110,room.S-22,220,26,5); ctx.fill();
        ctx.strokeStyle=`rgba(44,200,44,${0.6+0.3*Math.sin(t*1.6)})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#AAFFAA"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
        ctx.fillText("☠  LOOTED BAZAAR  ☠", W/2, room.S-9);
        // Knocked-over shelves (3 rows, chaotic angles)
        for (let row=0;row<3;row++) {
          const shX=22, shY=topY+60+row*70, shW=W*0.52, shH=44;
          ctx.save(); ctx.translate(shX+shW/2, shY+shH/2); ctx.rotate(Math.sin(row*1.3)*0.08);
          ctx.fillStyle="#0d1a0d"; rr(-shW/2,-shH/2,shW,shH,3); ctx.fill();
          ctx.strokeStyle="rgba(44,120,44,0.4)"; ctx.lineWidth=1; ctx.stroke();
          // Scattered items on/around shelf
          const cols=["rgba(200,40,40,0.7)","rgba(44,180,44,0.7)","rgba(200,180,40,0.7)","rgba(40,140,200,0.6)"];
          for (let si=0;si<6;si++) {
            const sx=(-shW/2+12)+si*(shW-24)/5;
            if (si%3!==1) { // some missing (looted)
              ctx.fillStyle=cols[si%cols.length]; rr(sx,-shH/2+6,10,16,2); ctx.fill();
            } else {
              // Tipped-over item on floor
              ctx.fillStyle=cols[si%cols.length]; ctx.save(); ctx.translate(sx+20,shH/2-8); ctx.rotate(1.4); ctx.fillRect(-5,-8,10,16); ctx.restore();
            }
          }
          ctx.restore();
        }
        // Broken cash register (top-right counter)
        const crx=W*0.65, cry=topY+28;
        ctx.fillStyle="#101a10"; rr(crx,cry,90,36,4); ctx.fill();
        ctx.strokeStyle="rgba(44,140,44,0.4)"; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#080d08"; rr(crx+6,cry+5,52,22,2); ctx.fill();
        // Cracked screen
        ctx.strokeStyle="rgba(44,200,44,0.4)"; ctx.lineWidth=0.8;
        ctx.beginPath(); ctx.moveTo(crx+18,cry+6); ctx.lineTo(crx+40,cry+26); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(crx+42,cry+6); ctx.lineTo(crx+25,cry+26); ctx.stroke();
        // Cash scattered on floor
        for (const [mx,my] of [[W*0.7,H*0.5],[W*0.6,H*0.56],[W*0.75,H*0.62]]) {
          ctx.fillStyle="rgba(44,160,44,0.35)"; rr(mx,my,20,9,2); ctx.fill();
          ctx.strokeStyle="rgba(44,200,44,0.3)"; ctx.lineWidth=0.5; ctx.stroke();
        }
        // Barricade (right side - survivor fortification)
        const barY2=H*0.35, barH3=H*0.35;
        ctx.fillStyle="#0d1800"; rr(W-58,barY2,36,barH3,3); ctx.fill();
        ctx.strokeStyle="rgba(44,180,44,0.5)"; ctx.lineWidth=1.5; ctx.stroke();
        // Planks
        for (let pi=0;pi<4;pi++) {
          ctx.fillStyle="#0a1200"; ctx.strokeStyle="rgba(30,100,30,0.4)"; ctx.lineWidth=1;
          rr(W-62+pi%2*4,barY2+10+pi*22,40,10,2); ctx.fill(); ctx.stroke();
        }
        ctx.fillStyle="rgba(44,200,44,0.7)"; ctx.font="bold 6px monospace"; ctx.textAlign="center";
        ctx.fillText("SAFE", W-40, barY2-8);
        // Floor spills/debris
        for (const [dx,dy] of [[W*0.3,H*0.58],[W*0.45,H*0.71],[W*0.55,H*0.48]]) {
          ctx.fillStyle="rgba(140,8,8,0.18)"; ctx.beginPath(); ctx.ellipse(dx,dy,12,7,dx*0.01,0,Math.PI*2); ctx.fill();
        }
      } else {
        // ── Default market (other maps) ──────────────
        const sC = [
          ["#CC3333", "#3366CC", "#44AA44", "#FFAA22"],
          ["#FF6699", "#66CCFF", "#FFEE44", "#AA66FF"],
          ["#EE8833", "#33CCAA", "#FF5544", "#88BBFF"],
        ];
        for (let row = 0; row < 3; row++) {
          const sy2 = topY + 8 + row * 40;
          ctx.fillStyle = "#2a2a2a";
          ctx.strokeStyle = "#444";
          ctx.lineWidth = 1;
          ctx.fillRect(cx - W * 0.42, sy2, W * 0.84, 30);
          ctx.fillStyle = "#3a3022";
          ctx.fillRect(cx - W * 0.42, sy2 + 9, W * 0.84, 4);
          ctx.fillRect(cx - W * 0.42, sy2 + 22, W * 0.84, 4);
          for (let pi = 0; pi < 11; pi++) {
            const px3 = cx - W * 0.4 + pi * ((W * 0.8) / 11);
            ctx.fillStyle = sC[row][pi % 4];
            ctx.fillRect(px3, sy2 + 2, (W * 0.8) / 11 - 2, 7);
            ctx.fillRect(px3, sy2 + 15, (W * 0.8) / 11 - 2, 7);
          }
        }
        // ── Checkout counter ───────────────────────
        ctx.fillStyle = "#1a2a3a";
        ctx.strokeStyle = "#3a4a5a";
        ctx.lineWidth = 1.5;
        rr(cx - 32, midY + 18, 64, 26, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#111118";
        ctx.fillRect(cx - 14, midY + 19, 28, 16);
        ctx.fillStyle = "#44EEFF";
        ctx.fillRect(cx - 12, midY + 21, 24, 12);
        ctx.fillStyle = "#FFCC44";
        ctx.font = "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.fillText("CHECKOUT", cx, midY + 54);
      }
    } else if (type === 4) {
      // ARCADE
      const isNeonCityArcade = this.map?.config?.id === "neon_city";

      if (isNeonCityArcade) {
        // ═══ NEON CITY CYBER ARCADE (ENLARGED) ═══
        const t = performance.now() / 1000;

        // Neon City colors
        const CYAN = "#44EEFF";
        const PINK = "#FF4466";
        const GREEN = "#44FF88";
        const PURPLE = "#CC88FF";
        const GOLD = "#FFDD44";
        const ORANGE = "#FF8844";

        // ── Title Header (LARGER) ──
        ctx.save();
        ctx.font = "bold 18px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.shadowColor = PINK;
        ctx.shadowBlur = 25;
        ctx.fillText("🎮 CYBER ARCADE 🎮", cx, topY - 2);
        ctx.shadowBlur = 0;
        ctx.restore();

        // ── Divider line ──
        ctx.save();
        const divGrad = ctx.createLinearGradient(
          cx - W * 0.45,
          0,
          cx + W * 0.45,
          0,
        );
        divGrad.addColorStop(0, "rgba(255,68,102,0)");
        divGrad.addColorStop(0.5, "rgba(255,68,102,0.9)");
        divGrad.addColorStop(1, "rgba(255,68,102,0)");
        ctx.strokeStyle = divGrad;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - W * 0.45, topY + 12);
        ctx.lineTo(cx + W * 0.45, topY + 12);
        ctx.stroke();
        ctx.restore();

        // ═══ ROW 1: SLOT MACHINES (Top) - ENLARGED ═══
        const slotColors = [PINK, CYAN, GOLD, GREEN];
        for (let i = 0; i < 4; i++) {
          const sx = cx - W * 0.36 + i * (W * 0.24);
          const sy = topY + 28;
          const col = slotColors[i];
          const pulse = Math.sin(t * 3 + i) * 0.3 + 0.7;

          // Slot machine body (LARGER)
          ctx.save();
          ctx.fillStyle = "rgba(15,18,30,0.95)";
          ctx.strokeStyle = col;
          ctx.lineWidth = 3;
          ctx.shadowColor = col;
          ctx.shadowBlur = 18 * pulse;
          rr(sx - 30, sy, 60, 72, 8);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Top light bar (LARGER)
          ctx.fillStyle = col;
          ctx.shadowColor = col;
          ctx.shadowBlur = 14;
          rr(sx - 24, sy + 4, 48, 10, 3);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Screen area (LARGER)
          ctx.fillStyle = "#050a15";
          rr(sx - 22, sy + 18, 44, 30, 4);
          ctx.fill();

          // 3 spinning reels (LARGER)
          for (let r = 0; r < 3; r++) {
            const rx = sx - 16 + r * 15;
            const reelOffset = (t * 5 + i * 2 + r) % 3;
            const symbols = ["7️⃣", "🍒", "💎"];
            ctx.font = "16px serif";
            ctx.textAlign = "center";
            ctx.fillText(symbols[Math.floor(reelOffset)], rx + 5, sy + 38);
          }

          // Jackpot display (LARGER)
          const jackpot = Math.floor(1000 + Math.sin(t + i) * 500);
          ctx.font = "bold 9px Orbitron, monospace";
          ctx.fillStyle = GOLD;
          ctx.shadowColor = GOLD;
          ctx.shadowBlur = 8;
          ctx.fillText(jackpot.toString(), sx, sy + 56);
          ctx.shadowBlur = 0;

          // Lever (LARGER)
          ctx.fillStyle = "#444";
          ctx.fillRect(sx + 24, sy + 20, 6, 35);
          ctx.fillStyle = col;
          ctx.shadowColor = col;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(sx + 27, sy + 18, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.restore();
        }

        // ═══ ROW 2: ARCADE CABINETS (Middle) - ENLARGED ═══
        const cabinetGames = [
          { emoji: "👾", name: "INVADERS", color: GREEN },
          { emoji: "🏎️", name: "RACER", color: ORANGE },
          { emoji: "🥊", name: "FIGHTER", color: PINK },
          { emoji: "🔫", name: "SHOOTER", color: CYAN },
        ];

        for (let i = 0; i < 4; i++) {
          const gx = cx - W * 0.36 + i * (W * 0.24);
          const gy = midY + 5;
          const game = cabinetGames[i];
          const pulse = Math.sin(t * 2.5 + i * 1.2) * 0.3 + 0.7;
          const screenFlicker = Math.sin(t * 8 + i * 3) * 0.1 + 0.9;

          ctx.save();

          // Cabinet body (LARGER)
          ctx.fillStyle = "rgba(20,15,35,0.95)";
          ctx.strokeStyle = game.color;
          ctx.lineWidth = 3;
          ctx.shadowColor = game.color;
          ctx.shadowBlur = 20 * pulse;
          rr(gx - 28, gy, 56, 68, 7);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Screen (LARGER)
          ctx.fillStyle = "#000";
          rr(gx - 22, gy + 6, 44, 34, 4);
          ctx.fill();

          // Screen glow
          const screenGlow = ctx.createRadialGradient(
            gx,
            gy + 23,
            0,
            gx,
            gy + 23,
            26,
          );
          screenGlow.addColorStop(
            0,
            game.color +
              Math.floor(70 * screenFlicker)
                .toString(16)
                .padStart(2, "0"),
          );
          screenGlow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = screenGlow;
          ctx.fillRect(gx - 22, gy + 6, 44, 34);

          // Game icon (LARGER)
          ctx.font = "28px serif";
          ctx.textAlign = "center";
          ctx.shadowColor = game.color;
          ctx.shadowBlur = 15;
          ctx.fillText(game.emoji, gx, gy + 32);
          ctx.shadowBlur = 0;

          // Control panel (LARGER)
          ctx.fillStyle = "#1a1a25";
          rr(gx - 22, gy + 44, 44, 18, 3);
          ctx.fill();

          // Joystick (LARGER)
          ctx.fillStyle = "#333";
          ctx.beginPath();
          ctx.arc(gx - 8, gy + 53, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#666";
          ctx.beginPath();
          ctx.arc(gx - 8, gy + 52, 3, 0, Math.PI * 2);
          ctx.fill();

          // Buttons (LARGER)
          const btnColors = [PINK, CYAN, GREEN];
          for (let b = 0; b < 3; b++) {
            ctx.fillStyle = btnColors[b];
            ctx.shadowColor = btnColors[b];
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(gx + 6 + b * 9, gy + 53, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.shadowBlur = 0;

          // Game name (LARGER)
          ctx.font = "bold 7px Orbitron, monospace";
          ctx.fillStyle = game.color;
          ctx.textAlign = "center";
          ctx.shadowColor = game.color;
          ctx.shadowBlur = 5;
          ctx.fillText(game.name, gx, gy + 66);
          ctx.shadowBlur = 0;

          ctx.restore();
        }

        // ═══ ROW 3: PRIZE MACHINES & CLAW GAMES - ENLARGED ═══
        const prizeItems = [
          { emoji: "🧸", color: PINK },
          { emoji: "🎁", color: PURPLE },
          { emoji: "🏆", color: GOLD },
        ];

        for (let i = 0; i < 3; i++) {
          const px = cx - W * 0.28 + i * (W * 0.28);
          const py = midY + 80;
          const item = prizeItems[i];
          const pulse = Math.sin(t * 2 + i * 1.5) * 0.25 + 0.75;
          const floatY = Math.sin(t * 1.5 + i) * 4;

          ctx.save();

          // Glass case (LARGER)
          ctx.fillStyle = "rgba(10,15,25,0.85)";
          ctx.strokeStyle = item.color;
          ctx.lineWidth = 3;
          ctx.shadowColor = item.color;
          ctx.shadowBlur = 18 * pulse;
          rr(px - 35, py, 70, 60, 8);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Inner glow (LARGER)
          const innerGlow = ctx.createRadialGradient(
            px,
            py + 30,
            0,
            px,
            py + 30,
            35,
          );
          innerGlow.addColorStop(0, item.color + "35");
          innerGlow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = innerGlow;
          ctx.beginPath();
          ctx.arc(px, py + 30, 35, 0, Math.PI * 2);
          ctx.fill();

          // Prize item (LARGER)
          ctx.font = "38px serif";
          ctx.textAlign = "center";
          ctx.shadowColor = item.color;
          ctx.shadowBlur = 20;
          ctx.fillText(item.emoji, px, py + 40 + floatY);
          ctx.shadowBlur = 0;

          // "INSERT COIN" text (LARGER)
          ctx.font = "bold 7px Orbitron, monospace";
          ctx.fillStyle = Math.sin(t * 4) > 0 ? GOLD : "#444";
          ctx.shadowColor = GOLD;
          ctx.shadowBlur = Math.sin(t * 4) > 0 ? 6 : 0;
          ctx.fillText("INSERT COIN", px, py + 55);
          ctx.shadowBlur = 0;

          ctx.restore();
        }

        // ═══ AMBIENT EFFECTS ═══
        ctx.save();
        // Floating particles (MORE)
        for (let pi = 0; pi < 15; pi++) {
          const px = cx - W * 0.45 + ((t * 12 + pi * 65) % (W * 0.9));
          const py =
            topY + 25 + Math.sin(t * 0.6 + pi * 0.7) * 50 + ((pi * 22) % 100);
          const alpha = Math.sin(t * 2 + pi) * 0.35 + 0.45;
          const colors = [CYAN, PINK, GOLD, GREEN];
          ctx.fillStyle =
            colors[pi % 4].slice(0, 7) +
            Math.floor(alpha * 255)
              .toString(16)
              .padStart(2, "0");
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // ═══ PRIZE COUNTER / DISPLAY STAND (between slot machines and cabinets) ═══
        ctx.save();
        const counterPulse = Math.sin(t * 2.5) * 0.3 + 0.7;

        // Counter base - positioned between slot machines and arcade cabinets (lowered)
        const standX = cx - 70;
        const standY = topY + 155;
        const standW = 140;
        const standH = 35;

        // Counter shadow
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(standX + 5, standY + standH + 3, standW, 6);

        // Counter body
        const counterGrad = ctx.createLinearGradient(
          standX,
          standY,
          standX,
          standY + standH,
        );
        counterGrad.addColorStop(0, "#1a1a2e");
        counterGrad.addColorStop(1, "#0a0a14");
        ctx.fillStyle = counterGrad;
        rr(standX, standY, standW, standH, 8);
        ctx.fill();

        // Counter border with glow
        ctx.strokeStyle = PURPLE;
        ctx.lineWidth = 3;
        ctx.shadowColor = PURPLE;
        ctx.shadowBlur = 15 * counterPulse;
        rr(standX, standY, standW, standH, 8);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Top edge glow
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 2;
        ctx.shadowColor = CYAN;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(standX + 8, standY + 3);
        ctx.lineTo(standX + standW - 8, standY + 3);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Display items on counter
        const counterItems = ["🎫", "🎟️", "🏅"];
        for (let ci = 0; ci < 3; ci++) {
          const itemX = standX + 30 + ci * 40;
          const itemFloat = Math.sin(t * 2 + ci) * 2;
          ctx.font = "20px serif";
          ctx.textAlign = "center";
          ctx.shadowColor = GOLD;
          ctx.shadowBlur = 8;
          ctx.fillText(counterItems[ci], itemX, standY + 22 + itemFloat);
        }
        ctx.shadowBlur = 0;

        // "PRIZES" text
        ctx.font = "bold 9px Orbitron, monospace";
        ctx.fillStyle = GOLD;
        ctx.shadowColor = GOLD;
        ctx.shadowBlur = 8;
        ctx.textAlign = "center";
        ctx.fillText("★ PRIZES ★", cx, standY + standH + 18);
        ctx.shadowBlur = 0;

        ctx.restore();
      } else if (!!this.map?.config?.zombie) {
        // ═══ ZOMBIE: DEAD ZONE ARCADE ═══
        const t=performance.now()/1000;
        // Sign
        ctx.fillStyle="rgba(30,0,0,0.9)"; rr(W/2-90,room.S-22,180,26,5); ctx.fill();
        ctx.strokeStyle=`rgba(220,40,40,${0.5+0.4*Math.abs(Math.sin(t*2.5))})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#FFCCCC"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
        ctx.fillText("☠  DEAD ZONE  ☠", W/2, room.S-9);
        // Broken arcade cabinets (left column, 3 rows)
        const cabW=60, cabH=70;
        for (let ci=0;ci<4;ci++) {
          const cx3=28+ci%2*(cabW+8), cy3=topY+10+Math.floor(ci/2)*(cabH+10);
          ctx.fillStyle="#0a0a0a"; rr(cx3,cy3,cabW,cabH,4); ctx.fill();
          ctx.strokeStyle="rgba(180,0,0,0.4)"; ctx.lineWidth=1; ctx.stroke();
          // Cracked/dead screen
          ctx.fillStyle="#050505"; rr(cx3+5,cy3+5,cabW-10,cabH-24,2); ctx.fill();
          if (ci%2===0) { // broken screen — static
            ctx.fillStyle=`rgba(40,40,40,${0.3+0.2*Math.sin(t*15+ci)})`; ctx.fillRect(cx3+5,cy3+5,cabW-10,cabH-24);
            ctx.strokeStyle="rgba(100,100,100,0.5)"; ctx.lineWidth=0.8;
            ctx.beginPath(); ctx.moveTo(cx3+15,cy3+5); ctx.lineTo(cx3+30,cy3+cabH-20); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx3+45,cy3+8); ctx.lineTo(cx3+22,cy3+cabH-22); ctx.stroke();
          } else { // dead screen
            ctx.fillStyle="rgba(0,0,0,0.9)"; ctx.fillRect(cx3+5,cy3+5,cabW-10,cabH-24);
          }
          // Buttons (some lit red, some dark)
          for (let bi=0;bi<4;bi++) {
            ctx.fillStyle=bi%3===0?`rgba(200,0,0,${0.5+0.4*Math.sin(t*3+bi+ci)})`:"rgba(20,20,20,0.8)";
            ctx.beginPath(); ctx.arc(cx3+12+bi*11,cy3+cabH-12,4,0,Math.PI*2); ctx.fill();
          }
        }
        // Smashed machines right side
        for (let si=0;si<3;si++) {
          const sx=W*0.52+si*(cabW+14), sy=topY+14;
          ctx.fillStyle="#0d0d0d"; rr(sx,sy,cabW,cabH*1.2,4); ctx.fill();
          ctx.strokeStyle="rgba(120,0,0,0.4)"; ctx.lineWidth=1; ctx.stroke();
          // Smashed screen
          ctx.fillStyle="#030303"; rr(sx+5,sy+5,cabW-10,cabH*0.7-10,2); ctx.fill();
          ctx.strokeStyle="rgba(140,0,0,0.5)"; ctx.lineWidth=0.8;
          for (let cr=0;cr<3;cr++) { ctx.beginPath(); ctx.moveTo(sx+8+cr*14,sy+5); ctx.lineTo(sx+20+cr*10,sy+cabH*0.7-12); ctx.stroke(); }
          // Hazard tape across machine
          ctx.save(); ctx.translate(sx+cabW/2,sy+cabH*0.6); ctx.rotate(-0.08);
          ctx.fillStyle="rgba(255,200,0,0.25)"; ctx.fillRect(-30,-4,60,8);
          ctx.restore();
        }
        // Emergency red lighting
        for (let li=0;li<4;li++) {
          const lx=W*0.22+li*W*0.22, la=0.06+0.04*Math.sin(t*4+li*1.6);
          ctx.fillStyle=`rgba(200,0,0,${la})`; ctx.fillRect(0,0,W,H);
        }
        // Survivor graffiti
        ctx.fillStyle="rgba(180,0,0,0.65)"; ctx.font="bold 8px monospace"; ctx.textAlign="center";
        ctx.fillText("GAME OVER.", W/2, H*0.82);
        ctx.fillStyle="rgba(140,0,0,0.5)"; ctx.font="6px monospace";
        ctx.fillText("FOR REAL THIS TIME", W/2, H*0.89);
      } else if (!this.map?.config?.galactica) {
        // ── Default Arcade (other maps) ────────────────────────
        const aColors = [
          "#FF0044",
          "#00AAFF",
          "#00FF88",
          "#FFAA00",
          "#AA00FF",
          "#FF6600",
        ];
        const aPos = [
          [cx - W * 0.36, topY + 6],
          [cx - W * 0.14, topY + 6],
          [cx + W * 0.1, topY + 6],
          [cx - W * 0.28, midY - 4],
          [cx - W * 0.02, midY - 4],
          [cx + W * 0.24, midY - 4],
        ];
        for (let i = 0; i < aPos.length; i++) {
          const [ax, ay] = aPos[i],
            ac = aColors[i];
          ctx.fillStyle = "#1a1a2a";
          ctx.strokeStyle = ac;
          ctx.lineWidth = 1.5;
          rr(ax - 17, ay, 34, 46, 3);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#000820";
          ctx.fillRect(ax - 13, ay + 4, 26, 20);
          ctx.fillStyle = ac + "44";
          ctx.fillRect(ax - 13, ay + 4, 26, 20);
          ctx.shadowColor = ac;
          ctx.shadowBlur = 8;
          ctx.fillStyle = ac;
          ctx.fillRect(ax - 5, ay + 8, 10, 7);
          ctx.fillRect(ax - 7, ay + 10, 14, 4);
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#2a2a3a";
          ctx.fillRect(ax - 15, ay + 26, 30, 11);
          ctx.fillStyle = "#888";
          ctx.beginPath();
          ctx.arc(ax - 4, ay + 31, 4, 0, Math.PI * 2);
          ctx.fill();
          const bC = ["#FF3333", "#33FF33", "#3333FF"];
          for (let bi = 0; bi < 3; bi++) {
            ctx.fillStyle = bC[bi];
            ctx.shadowColor = bC[bi];
            ctx.shadowBlur = 3;
            ctx.beginPath();
            ctx.arc(ax + 5 + bi * 4, ay + 31, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.shadowBlur = 0;
        }
        // Prize counter
        ctx.fillStyle = "#2a1a3a";
        ctx.strokeStyle = "#AA44FF";
        ctx.lineWidth = 1.5;
        rr(cx - 46, midY + 32, 92, 22, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#FFEE44";
        ctx.font = "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.fillText("PRIZE COUNTER", cx, midY + 48);
      } else {
        // ═══ GALACTICA: STAR GATE ARCADE ═══
        const t = performance.now() / 1000;
        const PURP = "#AA88FF",
          GOLD = "#FFDD55",
          CYAN = "#55DDFF",
          PINK = "#FF55CC";

        // Title
        ctx.save();
        ctx.font = "bold 16px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.shadowColor = PURP;
        ctx.shadowBlur = 22;
        ctx.fillText("⬡ STAR GATE ARCADE ⬡", cx, topY - 2);
        ctx.shadowBlur = 0;
        ctx.restore();

        // Divider
        const dg = ctx.createLinearGradient(cx - W * 0.44, 0, cx + W * 0.44, 0);
        dg.addColorStop(0, "rgba(170,136,255,0)");
        dg.addColorStop(0.5, "rgba(170,136,255,0.9)");
        dg.addColorStop(1, "rgba(170,136,255,0)");
        ctx.strokeStyle = dg;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - W * 0.44, topY + 12);
        ctx.lineTo(cx + W * 0.44, topY + 12);
        ctx.stroke();

        // ── ROW 1: HOLOGRAPHIC GAME PODS ──
        const podColors = [PURP, CYAN, GOLD, PINK];
        for (let i = 0; i < 4; i++) {
          const px2 = cx - W * 0.36 + i * (W * 0.24);
          const py2 = topY + 28;
          const col = podColors[i];
          const pulse = Math.sin(t * 2.5 + i) * 0.3 + 0.7;
          // Pod body — hexagonal shape
          ctx.save();
          ctx.translate(px2, py2 + 36);
          ctx.fillStyle = "rgba(10,5,25,0.95)";
          ctx.strokeStyle = col;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = col;
          ctx.shadowBlur = 14 * pulse;
          ctx.beginPath();
          for (let h = 0; h < 6; h++) {
            const ha = (h * Math.PI) / 3 - Math.PI / 6;
            const hx = Math.cos(ha) * 30,
              hy = Math.sin(ha) * 36;
            h === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
          // Holographic screen inside
          ctx.fillStyle = `rgba(20,5,40,0.9)`;
          ctx.beginPath();
          for (let h = 0; h < 6; h++) {
            const ha = (h * Math.PI) / 3 - Math.PI / 6;
            const hx = Math.cos(ha) * 22,
              hy = Math.sin(ha) * 26;
            h === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.fill();
          // Animated alien symbol on screen
          ctx.fillStyle = col;
          ctx.shadowColor = col;
          ctx.shadowBlur = 8;
          ctx.font = `${14 + Math.sin(t * 3 + i) * 2}px serif`;
          ctx.textAlign = "center";
          const aliens = ["⬡", "◈", "✦", "⬢"];
          ctx.fillText(aliens[i], 0, 6);
          ctx.shadowBlur = 0;
          // Top glow bar
          ctx.fillStyle = col;
          ctx.shadowColor = col;
          ctx.shadowBlur = 10;
          ctx.fillRect(-22, -30, 44, 8);
          ctx.shadowBlur = 0;
          ctx.restore();
          // Label below
          ctx.fillStyle = "#FFFFFF";
          ctx.shadowColor = col;
          ctx.shadowBlur = 6;
          ctx.font = "bold 7px Orbitron, monospace";
          ctx.textAlign = "center";
          ctx.fillText(
            ["VOID QUEST", "STAR RACE", "NOVA ARENA", "NEBULA"][i],
            px2,
            py2 + 82,
          );
          ctx.shadowBlur = 0;
        }

        // ── ROW 2: ENERGY DRINK DISPENSERS ──
        const drinkPos = [
          cx - W * 0.28,
          cx - W * 0.08,
          cx + W * 0.08,
          cx + W * 0.28,
        ];
        const drinkCols = [PURP, GOLD, CYAN, PINK];
        for (let i = 0; i < 4; i++) {
          const dx = drinkPos[i],
            dy = midY + 10;
          const dc = drinkCols[i];
          const lp = Math.sin(t * 2 + i * 1.5) * 0.5 + 0.5;
          // Machine body
          ctx.fillStyle = "#080518";
          ctx.strokeStyle = dc;
          ctx.lineWidth = 1.5;
          ctx.shadowColor = dc;
          ctx.shadowBlur = 8 * lp;
          rr(dx - 16, dy - 28, 32, 48, 6);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
          // Liquid level
          ctx.fillStyle = dc + "55";
          ctx.fillRect(dx - 10, dy - 18 + (1 - lp) * 18, 20, 18 * lp);
          // Dispenser nozzle
          ctx.fillStyle = "#333";
          ctx.fillRect(dx - 5, dy + 18, 10, 6);
          // Glow dot
          ctx.fillStyle = dc;
          ctx.shadowColor = dc;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(dx, dy - 24, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // ── PRIZE COUNTER (bottom) ──
        ctx.fillStyle = "#0a0520";
        ctx.strokeStyle = PURP;
        ctx.lineWidth = 2;
        ctx.shadowColor = PURP;
        ctx.shadowBlur = 10;
        rr(cx - 52, midY + 38, 104, 24, 4);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = GOLD;
        ctx.shadowColor = GOLD;
        ctx.shadowBlur = 8;
        ctx.font = "bold 8px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("◈ STAR GATE PRIZES ◈", cx, midY + 55);
        ctx.shadowBlur = 0;

        // Ambient floating stars
        for (let i = 0; i < 10; i++) {
          const sx = (t * 25 + i * 90) % W;
          const sy = topY + 14 + ((i * 37) % (H * 0.75));
          const sa = Math.sin(t * 2 + i) * 0.4 + 0.5;
          ctx.fillStyle = `rgba(220,200,255,${sa * 0.4})`;
          ctx.beginPath();
          ctx.arc(sx, sy, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (type === 5) {
      // PHARMACY
      if (!!this.map?.config?.galactica) {
        // ═══ GALACTICA: STELLAR PHARMACY ═══
        const t = performance.now() / 1000;

        // ── Cosmic floor tiles ────────────────────────
        const tileSize = 54;
        for (let gy = 0; gy < Math.ceil(H / tileSize) + 1; gy++) {
          for (let gx = 0; gx < Math.ceil(W / tileSize) + 1; gx++) {
            const tx = gx * tileSize, ty = gy * tileSize;
            const seed = gx * 11 + gy * 17;
            ctx.fillStyle = (seed % 3 === 0) ? "rgba(0,18,32,0.88)"
                          : (seed % 3 === 1) ? "rgba(0,24,24,0.88)"
                          : "rgba(0,14,28,0.88)";
            ctx.fillRect(tx, ty, tileSize, tileSize);
            ctx.strokeStyle = "rgba(0,200,180,0.14)";
            ctx.lineWidth = 0.5;
            ctx.strokeRect(tx, ty, tileSize, tileSize);
            if (seed % 6 === 0) {
              ctx.fillStyle = `rgba(0,220,200,${0.25 + 0.12 * Math.sin(t * 1.1 + seed)})`;
              ctx.beginPath();
              ctx.arc(tx + 27, ty + 27, 1.2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // ── Room border glow ──────────────────────────
        ctx.strokeStyle = "rgba(0,220,180,0.55)";
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, W - 4, H - 4);
        ctx.strokeStyle = "rgba(0,160,200,0.18)";
        ctx.lineWidth = 1;
        ctx.strokeRect(6, 6, W - 12, H - 12);

        // ── Title sign ────────────────────────────────
        const signW = 300, signH = 28;
        const signX = W / 2 - signW / 2, signY = room.S - 24;
        const signGrad = ctx.createLinearGradient(signX, signY, signX + signW, signY);
        signGrad.addColorStop(0, "rgba(0,80,70,0.92)");
        signGrad.addColorStop(0.5, "rgba(0,160,140,0.98)");
        signGrad.addColorStop(1, "rgba(0,80,70,0.92)");
        ctx.fillStyle = signGrad;
        rr(signX, signY, signW, signH, 6);
        ctx.fill();
        ctx.strokeStyle = `rgba(0,240,200,${0.7 + 0.3 * Math.sin(t * 2.2)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Glowing cross on sign
        ctx.fillStyle = `rgba(0,255,200,${0.9 + 0.1 * Math.sin(t * 3)})`;
        ctx.shadowColor = "#00FFCC";
        ctx.shadowBlur = 10;
        ctx.fillRect(signX + 14, signY + 8, 5, 13);
        ctx.fillRect(signX + 9, signY + 12, 15, 5);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#CCFFEE";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.fillText("✦  STELLAR PHARMACY  ✦", W / 2, signY + 18);

        // ── Service counter (top) ─────────────────────
        const ctrY = topY + 32;
        const ctrW = 380, ctrH = 28;
        const ctrX = W / 2 - ctrW / 2;
        const ctrGrad = ctx.createLinearGradient(ctrX, ctrY, ctrX + ctrW, ctrY);
        ctrGrad.addColorStop(0, "#001818");
        ctrGrad.addColorStop(0.5, "#003030");
        ctrGrad.addColorStop(1, "#001818");
        ctx.fillStyle = ctrGrad;
        rr(ctrX, ctrY, ctrW, ctrH, 6);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,200,170,0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Counter gleam
        ctx.fillStyle = "rgba(0,220,180,0.08)";
        ctx.fillRect(ctrX + 4, ctrY + 3, ctrW - 8, 6);
        // Rx terminal on counter
        const rxX = ctrX + ctrW - 44, rxY = ctrY + 3;
        ctx.fillStyle = "#000d18";
        rr(rxX, rxY, 34, 22, 3);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,200,160,0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "rgba(0,200,160,0.8)";
        ctx.font = "bold 5px monospace";
        ctx.textAlign = "center";
        ctx.fillText("Rx SYSTEM", rxX + 17, rxY + 9);
        ctx.fillStyle = "rgba(0,255,180,0.5)";
        ctx.font = "4px monospace";
        ctx.fillText("ONLINE", rxX + 17, rxY + 17);

        // ── Medicine shelf rows (left half) ───────────
        const shelfColors = ["#FF5566","#5577FF","#44FFCC","#FFCC44","#FF88FF","#44FF99","#FF7733","#88CCFF"];
        const shelfLabels = ["MEDI-X","STIM+","NANO-K","VITA-Z","ANTI-R","NEURO","PLASMA","BOOST"];
        for (let row = 0; row < 3; row++) {
          const shelfY = topY + 68 + row * 62;
          const shelfX = 18, shelfW = W * 0.44;
          // Shelf backing
          ctx.fillStyle = "#001c1c";
          ctx.strokeStyle = "rgba(0,180,150,0.4)";
          ctx.lineWidth = 1.5;
          rr(shelfX, shelfY, shelfW, 48, 4);
          ctx.fill();
          ctx.stroke();
          // Shelf rails
          ctx.strokeStyle = "rgba(0,140,120,0.3)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(shelfX + 4, shelfY + 16);
          ctx.lineTo(shelfX + shelfW - 4, shelfY + 16);
          ctx.moveTo(shelfX + 4, shelfY + 32);
          ctx.lineTo(shelfX + shelfW - 4, shelfY + 32);
          ctx.stroke();
          // Medicine bottles and boxes on each row
          const itemCount = 8;
          for (let mi = 0; mi < itemCount; mi++) {
            const mc = shelfColors[(row * itemCount + mi) % shelfColors.length];
            const mx = shelfX + 8 + mi * (shelfW - 16) / itemCount;
            // Top shelf: tall bottles
            const bH = 10 + (mi % 3) * 4;
            ctx.fillStyle = mc;
            ctx.globalAlpha = 0.85;
            rr(mx, shelfY + 3, 10, bH, 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = "rgba(255,255,255,0.3)";
            ctx.lineWidth = 0.5;
            ctx.stroke();
            // Bottle cap
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            ctx.fillRect(mx + 2, shelfY + 2, 6, 3);
            // Bottom shelf: flat boxes
            ctx.fillStyle = mc;
            ctx.globalAlpha = 0.7;
            ctx.fillRect(mx, shelfY + 20, 12, 8);
            ctx.globalAlpha = 1;
            // Label
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.font = "3px monospace";
            ctx.textAlign = "center";
            ctx.fillText(shelfLabels[(row * itemCount + mi) % shelfLabels.length].slice(0,4), mx + 6, shelfY + 26);
          }
          // Shelf label tag
          ctx.fillStyle = "rgba(0,200,160,0.7)";
          ctx.font = "bold 5px monospace";
          ctx.textAlign = "left";
          ctx.fillText(`AISLE ${row + 1}`, shelfX + 4, shelfY + 45);
        }

        // ── Display cases (right side — premium items) ─
        const caseConfigs = [
          { x: W * 0.55, y: H * 0.30, label: "NANO HEAL", price: "180 CR", color: "#00FFCC" },
          { x: W * 0.72, y: H * 0.30, label: "STIM PACK", price: "95 CR",  color: "#88AAFF" },
          { x: W * 0.88, y: H * 0.30, label: "ANTI-TOX",  price: "120 CR", color: "#FF88CC" },
          { x: W * 0.55, y: H * 0.50, label: "REGEN+",    price: "240 CR", color: "#AAFFAA" },
          { x: W * 0.72, y: H * 0.50, label: "BOOST X",   price: "75 CR",  color: "#FFCC44" },
          { x: W * 0.88, y: H * 0.50, label: "NEURO-K",   price: "310 CR", color: "#FF77AA" },
        ];
        for (const cc of caseConfigs) {
          const { x: px, y: py, label, price, color } = cc;
          const pW = 70, pH = 56;
          // Platform shadow
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          rr(px - pW / 2 + 3, py - pH / 2 + 4, pW, pH, 5);
          ctx.fill();
          // Platform base
          const pGrad = ctx.createLinearGradient(px - pW / 2, py, px + pW / 2, py);
          pGrad.addColorStop(0, "#001818");
          pGrad.addColorStop(0.5, "#002828");
          pGrad.addColorStop(1, "#001818");
          ctx.fillStyle = pGrad;
          rr(px - pW / 2, py - pH / 2, pW, pH, 5);
          ctx.fill();
          ctx.strokeStyle = `${color}88`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // Glow under item
          const glowR = ctx.createRadialGradient(px, py, 0, px, py, 22);
          glowR.addColorStop(0, `${color}44`);
          glowR.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = glowR;
          ctx.beginPath();
          ctx.arc(px, py, 22, 0, Math.PI * 2);
          ctx.fill();
          // Item: pill capsule
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.9 + 0.1 * Math.sin(t * 1.8 + px);
          ctx.beginPath();
          ctx.ellipse(px, py - 6, 10, 5, 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "rgba(255,255,255,0.3)";
          ctx.lineWidth = 0.5;
          ctx.stroke();
          // Plus symbol on pill
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.font = "bold 7px monospace";
          ctx.textAlign = "center";
          ctx.fillText("+", px, py - 3);
          // Label
          ctx.fillStyle = color;
          ctx.font = "bold 5px monospace";
          ctx.fillText(label, px, py + 8);
          // Price
          ctx.fillStyle = "#AAFFEE";
          ctx.font = "5px monospace";
          ctx.fillText(price, px, py + 16);
          // Hover pulse ring
          const ring = 0.5 + 0.5 * Math.sin(t * 2 + px * 0.01);
          ctx.strokeStyle = `${color}${Math.floor(ring * 80).toString(16).padStart(2,'0')}`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(px, py - 6, 14 + ring * 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        // ── Medicine queue line (left side) ──────────────
        // Label
        ctx.fillStyle = "rgba(0,200,160,0.7)";
        ctx.font = "bold 5.5px monospace";
        ctx.textAlign = "left";
        ctx.fillText("▶ QUEUE", 16, H * 0.58 - 10);
        // Queue rope
        ctx.strokeStyle = "rgba(0,180,140,0.4)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(16, H * 0.58);
        ctx.lineTo(16, H * 0.85);
        ctx.stroke();
        ctx.setLineDash([]);
        // Queued patients (4 people waiting in line)
        const queueSkinTones = ["#FFDDBB","#F0C080","#EECCAA","#D4956A"];
        const queueColors    = ["#3355CC","#CC3355","#338844","#8833CC"];
        for (let qi = 0; qi < 4; qi++) {
          const qx = 30, qy = H * 0.61 + qi * 34;
          const qSkin = queueSkinTones[qi];
          const qCol  = queueColors[qi];
          const isFem = qi % 2 !== 0;
          ctx.save();
          // Shadow
          ctx.fillStyle = "rgba(0,0,0,0.15)";
          ctx.beginPath(); ctx.ellipse(qx, qy + 10, 7, 3, 0, 0, Math.PI*2); ctx.fill();
          // Body
          ctx.fillStyle = qCol;
          rr(qx - 6, qy - 4, 12, 14, 3); ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 0.5; ctx.stroke();
          // Neck
          ctx.fillStyle = qSkin; ctx.fillRect(qx - 2, qy - 6, 4, 4);
          // Head
          ctx.beginPath(); ctx.arc(qx, qy - 12, 6, 0, Math.PI*2); ctx.fill();
          // Hair
          ctx.fillStyle = qi % 3 === 0 ? "#332211" : qi % 3 === 1 ? "#1a1a2a" : "#AA5522";
          if (isFem) {
            ctx.beginPath(); ctx.arc(qx, qy - 15, 5, Math.PI, 0); ctx.fill();
            ctx.fillRect(qx - 6, qy - 16, 3, 9);
            ctx.fillRect(qx + 3, qy - 16, 3, 9);
          } else {
            ctx.fillRect(qx - 5, qy - 16, 10, 5);
          }
          // Eyes
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.ellipse(qx - 2.5, qy - 13, 1.5, 1.2, 0, 0, Math.PI*2);
          ctx.ellipse(qx + 2.5, qy - 13, 1.5, 1.2, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = "#333";
          ctx.beginPath();
          ctx.arc(qx - 2.5, qy - 13, 0.8, 0, Math.PI*2);
          ctx.arc(qx + 2.5, qy - 13, 0.8, 0, Math.PI*2); ctx.fill();
          // Mouth (bored waiting expression)
          ctx.strokeStyle = "#AA7755"; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(qx - 2, qy - 9); ctx.lineTo(qx + 2, qy - 9); ctx.stroke();
          // Holding a ticket/clipboard
          if (qi === 0) {
            ctx.fillStyle = "#001a18";
            rr(qx + 7, qy - 4, 10, 12, 2); ctx.fill();
            ctx.strokeStyle = "rgba(0,200,160,0.6)"; ctx.lineWidth = 0.8; ctx.stroke();
            ctx.fillStyle = "rgba(0,200,160,0.5)"; ctx.font = "3px monospace"; ctx.textAlign = "center";
            ctx.fillText("Rx", qx + 12, qy + 2);
            ctx.fillStyle = "rgba(0,200,160,0.4)";
            ctx.fillRect(qx + 8, qy + 4, 8, 1);
            ctx.fillRect(qx + 8, qy + 6, 6, 1);
          }
          // Number badge
          ctx.fillStyle = "rgba(0,200,160,0.8)";
          ctx.beginPath(); ctx.arc(qx - 8, qy - 10, 5, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = "#001a18"; ctx.font = "bold 5px monospace"; ctx.textAlign = "center";
          ctx.fillText(qi + 1, qx - 8, qy - 8);
          ctx.restore();
        }

        // ── Waiting area seats (bottom) ────────────────
        const seatY = H * 0.80;
        for (let si = 0; si < 5; si++) {
          const sx = W * 0.12 + si * W * 0.16;
          // Seat
          ctx.fillStyle = "#001a20";
          ctx.strokeStyle = "rgba(0,180,150,0.5)";
          ctx.lineWidth = 1;
          rr(sx - 14, seatY - 9, 28, 20, 4);
          ctx.fill();
          ctx.stroke();
          // Back
          ctx.fillStyle = "#001518";
          rr(sx - 13, seatY - 18, 26, 10, 3);
          ctx.fill();
          ctx.strokeStyle = "rgba(0,160,130,0.4)";
          ctx.stroke();
          // Seated figure (alternating occupied)
          if (si % 2 === 0) {
            const sitSkin = queueSkinTones[si % queueSkinTones.length];
            const sitCol  = queueColors[si % queueColors.length];
            // Body
            ctx.fillStyle = sitCol;
            rr(sx - 7, seatY - 6, 14, 15, 3); ctx.fill();
            // Neck
            ctx.fillStyle = sitSkin; ctx.fillRect(sx - 2, seatY - 8, 4, 4);
            // Head
            ctx.beginPath(); ctx.arc(sx, seatY - 15, 6, 0, Math.PI * 2); ctx.fill();
            // Hair
            ctx.fillStyle = si === 0 ? "#332211" : "#1a1a2a";
            ctx.fillRect(sx - 5, seatY - 19, 10, 5);
            // Eyes
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.ellipse(sx - 2.5, seatY - 16, 1.5, 1.2, 0, 0, Math.PI*2);
            ctx.ellipse(sx + 2.5, seatY - 16, 1.5, 1.2, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#333";
            ctx.beginPath();
            ctx.arc(sx - 2.5, seatY - 16, 0.8, 0, Math.PI*2);
            ctx.arc(sx + 2.5, seatY - 16, 0.8, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }

        // ── Glowing cross emblem (wall center-right) ───
        const crossX = W * 0.72, crossY = H * 0.71;
        const crossGlow = ctx.createRadialGradient(crossX, crossY, 0, crossX, crossY, 30);
        crossGlow.addColorStop(0, `rgba(0,255,200,${0.3 + 0.15 * Math.sin(t * 1.5)})`);
        crossGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = crossGlow;
        ctx.beginPath();
        ctx.arc(crossX, crossY, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(0,255,190,${0.8 + 0.2 * Math.sin(t * 2)})`;
        ctx.shadowColor = "#00FFCC";
        ctx.shadowBlur = 14;
        ctx.fillRect(crossX - 3, crossY - 14, 6, 28);
        ctx.fillRect(crossX - 14, crossY - 3, 28, 6);
        ctx.shadowBlur = 0;

        // ── Ambient particles ─────────────────────────
        for (let pi = 0; pi < 6; pi++) {
          const px = (Math.sin(pi * 2.1 + t * 0.5) * 0.38 + 0.5) * W;
          const py = (Math.cos(pi * 1.9 + t * 0.35) * 0.3 + 0.5) * H;
          ctx.fillStyle = `rgba(0,220,180,${0.2 + 0.15 * Math.sin(t * 1.4 + pi)})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── [T] TALK hint ─────────────────────────────
        ctx.fillStyle = "rgba(0,160,130,0.88)";
        rr(W / 2 - 40, topY + 62, 80, 14, 4);
        ctx.fill();
        ctx.fillStyle = "#CCFFEE";
        ctx.font = "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.fillText("[T] BUY MEDICINE", W / 2, topY + 72);

      } else if (!!this.map?.config?.zombie) {
        // ═══ ZOMBIE: INFECTED PHARMACY ═══
        const t = performance.now() / 1000;

        // ── Room sign (top) ──────────────────────────────
        ctx.fillStyle = "#1a0000";
        rr(W/2-130, room.S-24, 260, 28, 5); ctx.fill();
        ctx.strokeStyle = `rgba(220,40,40,${0.7+0.3*Math.sin(t*1.8)})`; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "#FF8888"; ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
        ctx.shadowColor = "#FF0000"; ctx.shadowBlur = 8;
        ctx.fillText("☠  INFECTED PHARMACY  ☠", W/2, room.S-9);
        ctx.shadowBlur = 0;

        // ── Pharmacy counter (top of room) ───────────────
        // Counter body
        ctx.fillStyle = "#3a2a1a";
        rr(cx-W*0.43, topY+22, W*0.86, 26, 4); ctx.fill();
        ctx.strokeStyle = "#7a5a30"; ctx.lineWidth = 2; ctx.stroke();
        // Counter surface highlight (cracked white laminate)
        ctx.fillStyle = "#c8b890";
        ctx.fillRect(cx-W*0.42, topY+23, W*0.84, 5);
        ctx.fillStyle = "rgba(0,0,0,0.3)"; // crack lines
        ctx.fillRect(cx-W*0.10, topY+23, 1, 5);
        ctx.fillRect(cx+W*0.15, topY+24, 1, 4);

        // ── Medicine bottles on counter ──────────────────
        const bottleColors = ["#cc3333","#3355cc","#229944","#cc8800","#882299","#22aacc"];
        for (let bi = 0; bi < 7; bi++) {
          const bx = cx - W*0.38 + bi*(W*0.76/6), by = topY + 5;
          const bc = bottleColors[bi % bottleColors.length];
          // Bottle body
          ctx.fillStyle = bc; ctx.beginPath(); ctx.ellipse(bx, by+11, 5, 11, 0, 0, Math.PI*2); ctx.fill();
          // Bottle neck
          ctx.fillStyle = bc; ctx.fillRect(bx-2, by-2, 4, 5);
          // White label
          ctx.fillStyle = "rgba(255,255,220,0.75)"; ctx.fillRect(bx-4, by+5, 8, 8);
          // Highlight on bottle
          ctx.fillStyle = "rgba(255,255,255,0.25)";
          ctx.beginPath(); ctx.ellipse(bx-2, by+8, 2, 5, 0, 0, Math.PI*2); ctx.fill();
          // Crossed-out Rx label on some
          if (bi % 2 === 0) {
            ctx.fillStyle = "#cc0000"; ctx.font = "bold 4px sans-serif"; ctx.textAlign = "center";
            ctx.fillText("Rx", bx, by+11);
          }
        }

        // ── Left shelving unit (medicine stock) ──────────
        const shlX = 12, shlY = topY+60, shlW = 68, shlH = H*0.38;
        // Back panel
        ctx.fillStyle = "#2a1a0a"; rr(shlX, shlY, shlW, shlH, 3); ctx.fill();
        ctx.strokeStyle = "#6a4a20"; ctx.lineWidth = 1.5; ctx.stroke();
        // 4 shelves with items
        for (let row = 0; row < 4; row++) {
          const ry = shlY + 6 + row*(shlH/4);
          // Shelf plank
          ctx.fillStyle = "#5a3a18"; ctx.fillRect(shlX+2, ry, shlW-4, 4);
          // Items on shelf
          for (let col = 0; col < 4; col++) {
            const ix = shlX + 5 + col*15, iy = ry + 6;
            const itype = (row*4+col) % 4;
            if (itype === 0) {
              // Tall white pill bottle
              ctx.fillStyle = "#e8e8e8"; ctx.beginPath(); ctx.ellipse(ix+4, iy+7, 3.5, 8, 0, 0, Math.PI*2); ctx.fill();
              ctx.fillStyle = "#cc3333"; ctx.fillRect(ix+1, iy+3, 6, 4);
              ctx.fillStyle = "#ffffff"; ctx.font = "bold 3px sans-serif"; ctx.textAlign = "center"; ctx.fillText("+", ix+4, iy+6);
            } else if (itype === 1) {
              // Red first aid box
              ctx.fillStyle = "#cc2222"; rr(ix, iy+2, 10, 10, 1); ctx.fill();
              ctx.fillStyle = "#ffffff"; ctx.fillRect(ix+3, iy+4, 4, 6); ctx.fillRect(ix+1, iy+6, 8, 2);
            } else if (itype === 2) {
              // Blue medicine pack
              ctx.fillStyle = "#2244aa"; rr(ix, iy+4, 12, 8, 1); ctx.fill();
              ctx.strokeStyle = "#4488ff"; ctx.lineWidth = 0.8; ctx.stroke();
              ctx.fillStyle = "#aaccff"; ctx.font = "3px sans-serif"; ctx.textAlign = "center"; ctx.fillText("MED", ix+6, iy+9);
            } else {
              // Green syrup bottle (tipped over)
              ctx.save(); ctx.translate(ix+6, iy+8); ctx.rotate(0.6);
              ctx.fillStyle = "#228833"; ctx.beginPath(); ctx.ellipse(0, 0, 3, 7, 0, 0, Math.PI*2); ctx.fill();
              ctx.fillStyle = "rgba(100,220,100,0.4)"; ctx.beginPath(); ctx.ellipse(-5, 5, 5, 3, 0, 0, Math.PI*2); ctx.fill();
              ctx.restore();
            }
          }
        }

        // ── Right shelving unit (supplies) ───────────────
        const shlX2 = W - 80, shlY2 = topY+60, shlW2 = 68, shlH2 = H*0.38;
        ctx.fillStyle = "#2a1a0a"; rr(shlX2, shlY2, shlW2, shlH2, 3); ctx.fill();
        ctx.strokeStyle = "#6a4a20"; ctx.lineWidth = 1.5; ctx.stroke();
        for (let row = 0; row < 4; row++) {
          const ry = shlY2 + 6 + row*(shlH2/4);
          ctx.fillStyle = "#5a3a18"; ctx.fillRect(shlX2+2, ry, shlW2-4, 4);
          for (let col = 0; col < 4; col++) {
            const ix = shlX2 + 5 + col*15, iy = ry + 6;
            const itype = (row*3+col+1) % 4;
            if (itype === 0) {
              // Bandage roll
              ctx.fillStyle = "#e8ddc8"; ctx.beginPath(); ctx.arc(ix+5, iy+6, 5, 0, Math.PI*2); ctx.fill();
              ctx.strokeStyle = "#aaa080"; ctx.lineWidth = 0.8; ctx.stroke();
              ctx.fillStyle = "#cc3333"; ctx.fillRect(ix+2, iy+4, 6, 1.5); ctx.fillRect(ix+4, iy+2, 1.5, 6);
            } else if (itype === 1) {
              // White spray canister
              ctx.fillStyle = "#d8d8d8"; ctx.beginPath(); ctx.ellipse(ix+4, iy+7, 4, 9, 0, 0, Math.PI*2); ctx.fill();
              ctx.fillStyle = "#e84444"; ctx.fillRect(ix+1, iy+2, 7, 4);
              ctx.fillStyle = "#333"; ctx.fillRect(ix+2, iy+1, 4, 2);
            } else if (itype === 2) {
              // Orange pill bottle
              ctx.fillStyle = "#cc6600"; ctx.beginPath(); ctx.ellipse(ix+4, iy+7, 4, 9, 0, 0, Math.PI*2); ctx.fill();
              ctx.fillStyle = "#ffffff"; ctx.fillRect(ix+1, iy+5, 6, 5);
              ctx.fillStyle = "#cc6600"; ctx.font = "bold 3px sans-serif"; ctx.textAlign="center"; ctx.fillText("RX", ix+4, iy+10);
            } else {
              // IV bag hanging
              ctx.fillStyle = "rgba(180,240,200,0.85)"; rr(ix+1, iy, 8, 12, 2); ctx.fill();
              ctx.strokeStyle = "rgba(80,180,100,0.8)"; ctx.lineWidth = 0.8; ctx.stroke();
              ctx.strokeStyle = "rgba(100,200,120,0.6)"; ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(ix+5, iy+12); ctx.lineTo(ix+5, iy+17); ctx.stroke();
            }
          }
        }

        // ── Examination table (center) ───────────────────
        const exX = cx-44, exY = H*0.42, exW = 88, exH = 48;
        // Table legs
        ctx.fillStyle = "#555555";
        for (const lx of [exX+4, exX+exW-8]) {
          ctx.fillRect(lx, exY+exH, 4, 10);
        }
        // Table body (cream/white stained)
        ctx.fillStyle = "#c8c0a0"; rr(exX, exY, exW, exH, 4); ctx.fill();
        ctx.strokeStyle = "#8a8060"; ctx.lineWidth = 2; ctx.stroke();
        // Stains (blood + green infection)
        ctx.fillStyle = "rgba(140,20,20,0.5)"; ctx.beginPath(); ctx.ellipse(exX+30, exY+20, 14, 8, 0.4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "rgba(40,160,40,0.4)"; ctx.beginPath(); ctx.ellipse(exX+60, exY+32, 10, 6, -0.3, 0, Math.PI*2); ctx.fill();
        // Paper roll on table (exam paper)
        ctx.fillStyle = "#e8e0c8"; ctx.fillRect(exX+2, exY+2, exW-4, 8);
        ctx.strokeStyle = "rgba(100,90,70,0.3)"; ctx.lineWidth = 0.5;
        for (let li = 0; li < 6; li++) { ctx.beginPath(); ctx.moveTo(exX+2, exY+3+li*1.2); ctx.lineTo(exX+exW-2, exY+3+li*1.2); ctx.stroke(); }
        // Instrument tray on table
        ctx.fillStyle = "#aaaaaa"; rr(exX+exW-28, exY+12, 24, 18, 2); ctx.fill();
        ctx.strokeStyle = "#777777"; ctx.lineWidth = 1; ctx.stroke();
        // Scalpel on tray
        ctx.fillStyle = "#cccccc"; ctx.fillRect(exX+exW-26, exY+15, 20, 2);
        ctx.fillStyle = "#666666"; ctx.fillRect(exX+exW-8, exY+14, 4, 4);
        // Syringe on tray
        ctx.fillStyle = "#dddddd"; ctx.fillRect(exX+exW-26, exY+21, 16, 3);
        ctx.fillStyle = "rgba(100,200,100,0.8)"; ctx.fillRect(exX+exW-26, exY+21, 7, 3);
        ctx.fillStyle = "#aaaaaa"; ctx.fillRect(exX+exW-11, exY+21, 3, 3);
        // Label on table side
        ctx.fillStyle = "rgba(180,20,20,0.8)"; ctx.font = "bold 5px monospace"; ctx.textAlign="center";
        ctx.fillText("QUARANTINE", cx, exY+exH+10);

        // ── IV drip stand (left of table) ────────────────
        const ivPoleX = exX - 14;
        ctx.strokeStyle = "#888888"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ivPoleX, exY-30); ctx.lineTo(ivPoleX, exY+exH+10); ctx.stroke();
        // Horizontal arm
        ctx.beginPath(); ctx.moveTo(ivPoleX, exY-30); ctx.lineTo(ivPoleX+18, exY-30); ctx.stroke();
        // IV bag
        ctx.fillStyle = "rgba(160,230,180,0.88)"; rr(ivPoleX+4, exY-52, 20, 24, 4); ctx.fill();
        ctx.strokeStyle = "#66aa77"; ctx.lineWidth = 1; ctx.stroke();
        // Fluid level in bag
        const ivfl = 0.35 + 0.12*Math.sin(t*0.4);
        ctx.fillStyle = `rgba(60,200,90,${0.55+0.15*Math.sin(t*0.6)})`;
        ctx.fillRect(ivPoleX+6, exY-52+24*(1-ivfl), 16, 24*ivfl-2);
        // Drip tube
        ctx.strokeStyle = "rgba(100,200,120,0.7)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(ivPoleX+14, exY-28); ctx.lineTo(ivPoleX+14, exY-4); ctx.stroke();

        // ── Medical monitor (right of table) ─────────────
        const monX = exX+exW+8, monY = H*0.42;
        ctx.fillStyle = "#222222"; rr(monX, monY, 52, 38, 4); ctx.fill();
        ctx.strokeStyle = "#444444"; ctx.lineWidth = 1.5; ctx.stroke();
        // Screen bezel
        ctx.fillStyle = "#111111"; rr(monX+3, monY+3, 46, 28, 2); ctx.fill();
        // Animated pulse line (erratic / flatline)
        ctx.strokeStyle = `rgba(44,255,44,${0.7+0.2*Math.sin(t*3.5)})`; ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let mx2 = 0; mx2 < 44; mx2++) {
          const spike = mx2 > 10 && mx2 < 20;
          const mpy = (monY+17) + Math.sin(mx2*0.9+t*5)*4*(spike ? 1 : 0.08);
          mx2 === 0 ? ctx.moveTo(monX+4+mx2, mpy) : ctx.lineTo(monX+4+mx2, mpy);
        }
        ctx.stroke();
        // CRITICAL label below screen
        ctx.fillStyle = `rgba(255,50,50,${0.7+0.3*Math.sin(t*2)})`; ctx.font = "bold 5px monospace"; ctx.textAlign = "center";
        ctx.fillText("CRITICAL", monX+26, monY+35);
        // Monitor stand
        ctx.fillStyle = "#333333"; ctx.fillRect(monX+20, monY+38, 12, 8);
        ctx.fillRect(monX+14, monY+44, 24, 4);

        // ── First aid cross on left wall ──────────────────
        ctx.fillStyle = "#cc2222"; ctx.shadowColor="#ff4444"; ctx.shadowBlur=10;
        ctx.fillRect(shlX+shlW+8, topY+62, 22, 8);   // horizontal bar
        ctx.fillRect(shlX+shlW+15, topY+55, 8, 22);  // vertical bar
        ctx.shadowBlur = 0;
        ctx.fillStyle="#ffffff"; ctx.font="bold 5px sans-serif"; ctx.textAlign="center";
        ctx.fillText("+", shlX+shlW+19, topY+83);

        // ── Hazmat warning board (right of right shelf) ──
        ctx.fillStyle = "#1a1000"; rr(shlX2-70, H*0.44, 58, 80, 4); ctx.fill();
        ctx.strokeStyle = "#cc8800"; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = "#ffcc00"; ctx.font = "bold 6px monospace"; ctx.textAlign = "center";
        ctx.fillText("⚠ WARNING", shlX2-41, H*0.44+14);
        ctx.strokeStyle = "#aa6600"; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(shlX2-68, H*0.44+18); ctx.lineTo(shlX2-14, H*0.44+18); ctx.stroke();
        const warnLines = ["CONTAMINATED","DO NOT ENTER","WEAR HAZMAT","SUIT REQUIRED"];
        warnLines.forEach((ln, i) => {
          ctx.fillStyle = i > 1 ? "#ff8888" : "#ffddaa";
          ctx.font = "4px monospace"; ctx.textAlign = "left";
          ctx.fillText(ln, shlX2-68, H*0.44+28+i*13);
        });

        // ── Corpse 1: dead pharmacist on floor ────────────
        drawCorpse(cx+W*0.05, H*0.68, 0.9, '#3a2010', 0.6);
        // ── Corpse 2: customer who didn't make it ─────────
        drawCorpse(cx-W*0.25, H*0.76, -0.5, '#2a1808', 0.5);

        // ── Scattered pills on floor ──────────────────────
        const pillColors = ["#ee4444","#4488ff","#44cc44","#ffcc00","#cc44cc","#ffffff"];
        for (let pi = 0; pi < 18; pi++) {
          const px5 = cx - W*0.30 + Math.sin(pi*137.5)*W*0.30;
          const py5 = H*0.55 + Math.cos(pi*73.1)*H*0.22;
          ctx.fillStyle = pillColors[pi % pillColors.length];
          ctx.save(); ctx.translate(px5, py5); ctx.rotate(pi*0.7);
          ctx.beginPath(); ctx.ellipse(0, 0, 3, 5, 0, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        }

        // ── Broken glass / spilled liquid on floor ────────
        ctx.fillStyle = "rgba(180,240,200,0.22)";
        ctx.beginPath(); ctx.ellipse(cx-W*0.12, H*0.62, 22, 12, 0.3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "rgba(180,240,200,0.12)";
        ctx.beginPath(); ctx.ellipse(cx+W*0.18, H*0.72, 16, 9, -0.2, 0, Math.PI*2); ctx.fill();
        // Glass shard triangles
        for (let gi = 0; gi < 8; gi++) {
          const gx = cx-W*0.15+gi*W*0.048, gy = H*0.61+(gi%3)*6;
          ctx.fillStyle = `rgba(200,240,220,${0.25+gi%3*0.08})`;
          ctx.save(); ctx.translate(gx, gy); ctx.rotate(gi*0.7);
          ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(4,3); ctx.lineTo(-4,3); ctx.closePath(); ctx.fill();
          ctx.restore();
        }

        // ── Biohazard tape across floor bottom ────────────
        for (let hi = 0; hi < 6; hi++) {
          ctx.fillStyle = hi % 2 === 0 ? "rgba(220,180,0,0.55)" : "rgba(0,0,0,0.55)";
          ctx.fillRect(W*0.04 + hi*(W*0.155), H*0.88, W*0.155, 8);
        }
        ctx.fillStyle = "#ffdd00"; ctx.font = "bold 5px monospace"; ctx.textAlign = "center";
        ctx.fillText("⚠ BIOHAZARD — NO ENTRY ⚠", cx, H*0.88-4);

        // ── Overhead flickering fluorescent light ─────────
        const flick = 0.6 + 0.4*Math.abs(Math.sin(t*7.8 + Math.sin(t*3.1)*2));
        ctx.fillStyle = `rgba(180,255,200,${flick*0.12})`;
        ctx.fillRect(cx-80, 0, 160, H*0.20);
        ctx.fillStyle = `rgba(200,255,210,${flick*0.9})`;
        ctx.fillRect(cx-60, 4, 120, 6);
        ctx.strokeStyle = "#aaaaaa"; ctx.lineWidth = 1;
        ctx.strokeRect(cx-60, 4, 120, 6);

      } else if (!!this.map?.config?.snow) {
        // ═══ FROZEN TUNDRA: FROST PHARMACY ═══
        const t = performance.now() / 1000;

        // ── Room sign (top) ──────────────────────────────
        ctx.fillStyle = "#AADDFF";
        ctx.shadowColor = "#66BBFF";
        ctx.shadowBlur = 12;
        ctx.font = "bold 11px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("❄ FROST PHARMACY ❄", cx, topY - 4);
        ctx.shadowBlur = 0;

        // ── Medicine shelves (left side) ────────────────
        for (let row = 0; row < 3; row++) {
          const shelfY = topY + 8 + row * 36;
          const shelfX = W * 0.05;
          const shelfW = W * 0.35;

          // Shelf backing (frosted white)
          ctx.fillStyle = "#E8F4FF";
          ctx.strokeStyle = "#AACCDD";
          ctx.lineWidth = 1.5;
          rr(shelfX, shelfY, shelfW, 30, 3);
          ctx.fill();
          ctx.stroke();

          // Shelf dividers
          ctx.fillStyle = "#CCDDEE";
          ctx.fillRect(shelfX + 2, shelfY + 14, shelfW - 4, 2);

          // Medicine bottles on shelf
          const medicineColors = ["#FF6666", "#6688FF", "#66CC88", "#FFAA55", "#AA66FF", "#66DDDD"];
          for (let mi = 0; mi < 6; mi++) {
            const mx = shelfX + 8 + mi * (shelfW - 16) / 6;
            const mc = medicineColors[(row + mi) % medicineColors.length];

            // Bottle body
            ctx.fillStyle = mc;
            const bH = 8 + (mi % 3) * 3;
            ctx.beginPath();
            ctx.roundRect(mx, shelfY + 2, 12, bH, 2);
            ctx.fill();
            // Bottle cap
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(mx + 2, shelfY + 1, 8, 3);
            // Label
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(mx + 1, shelfY + bH - 4, 10, 4);

            // Lower shelf: pill boxes
            ctx.fillStyle = mc;
            ctx.globalAlpha = 0.8;
            rr(mx, shelfY + 17, 14, 10, 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            // Cross on box
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(mx + 5, shelfY + 19, 4, 1);
            ctx.fillRect(mx + 6, shelfY + 18, 2, 3);
          }
        }

        // ── Pharmacy counter (center) ───────────────────
        ctx.fillStyle = "#E0F0FF";
        ctx.strokeStyle = "#88AACC";
        ctx.lineWidth = 2;
        rr(cx - 60, midY - 10, 120, 36, 4);
        ctx.fill();
        ctx.stroke();

        // Counter top (clean white)
        ctx.fillStyle = "#F8FCFF";
        ctx.fillRect(cx - 58, midY - 8, 116, 8);

        // Cash register
        ctx.fillStyle = "#2a3a4a";
        rr(cx + 20, midY - 6, 28, 20, 2);
        ctx.fill();
        ctx.fillStyle = "#66BBFF";
        ctx.fillRect(cx + 24, midY - 2, 20, 10);
        ctx.fillStyle = "#AADDFF";
        ctx.font = "bold 5px monospace";
        ctx.textAlign = "center";
        ctx.fillText("$$$", cx + 34, midY + 4);

        // Prescription pad on counter
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(cx - 40, midY - 4, 24, 18);
        ctx.fillStyle = "#88AACC";
        for (let li = 0; li < 4; li++) {
          ctx.fillRect(cx - 38, midY + li * 4, 20, 1);
        }
        ctx.fillStyle = "#6688AA";
        ctx.font = "bold 4px monospace";
        ctx.fillText("Rx", cx - 28, midY + 2);

        // ── Pharmacist in white lab coat ────────────────
        const pharmacistX = cx;
        const pharmacistY = midY - 40;
        const breathe = Math.sin(t * 1.2) * 1;
        const sway = Math.sin(t * 0.5) * 0.5;

        ctx.save();
        ctx.translate(pharmacistX + sway, pharmacistY);

        // Shadow
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.ellipse(2, 50, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Legs (dark pants)
        ctx.fillStyle = "#2a3a4a";
        ctx.fillRect(-6, 32, 5, 16);
        ctx.fillRect(1, 32, 5, 16);

        // Shoes
        ctx.fillStyle = "#1a2530";
        ctx.fillRect(-8, 46, 7, 5);
        ctx.fillRect(1, 46, 7, 5);

        // Body (white lab coat)
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.roundRect(-14, 2 + breathe * 0.3, 28, 32, 3);
        ctx.fill();
        // Coat buttons
        ctx.fillStyle = "#CCDDEE";
        ctx.beginPath();
        ctx.arc(0, 12 + breathe * 0.3, 2, 0, Math.PI * 2);
        ctx.arc(0, 20 + breathe * 0.3, 2, 0, Math.PI * 2);
        ctx.arc(0, 28 + breathe * 0.3, 2, 0, Math.PI * 2);
        ctx.fill();

        // Lab coat collar
        ctx.fillStyle = "#EEFFFF";
        ctx.beginPath();
        ctx.moveTo(-10, 4 + breathe * 0.3);
        ctx.lineTo(0, 10 + breathe * 0.3);
        ctx.lineTo(10, 4 + breathe * 0.3);
        ctx.lineTo(8, 2 + breathe * 0.3);
        ctx.lineTo(0, 6 + breathe * 0.3);
        ctx.lineTo(-8, 2 + breathe * 0.3);
        ctx.closePath();
        ctx.fill();

        // Shirt underneath (light blue)
        ctx.fillStyle = "#DDEEFF";
        ctx.beginPath();
        ctx.moveTo(-4, 6 + breathe * 0.3);
        ctx.lineTo(0, 12 + breathe * 0.3);
        ctx.lineTo(4, 6 + breathe * 0.3);
        ctx.closePath();
        ctx.fill();

        // Arms (lab coat sleeves)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(-18, 6 + breathe * 0.3, 5, 18);
        ctx.fillRect(13, 6 + breathe * 0.3, 5, 18);

        // Hands (holding clipboard)
        ctx.fillStyle = "#E8D4C4";
        ctx.beginPath();
        ctx.arc(-15.5, 26 + breathe * 0.3, 4, 0, Math.PI * 2);
        ctx.arc(15.5, 26 + breathe * 0.3, 4, 0, Math.PI * 2);
        ctx.fill();

        // Clipboard in left hand
        ctx.fillStyle = "#3a4a5a";
        ctx.fillRect(-22, 18 + breathe * 0.3, 10, 14);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(-21, 19 + breathe * 0.3, 8, 11);
        ctx.fillStyle = "#88AACC";
        ctx.fillRect(-20, 21 + breathe * 0.3, 6, 1);
        ctx.fillRect(-20, 24 + breathe * 0.3, 6, 1);
        ctx.fillRect(-20, 27 + breathe * 0.3, 4, 1);

        // Neck
        ctx.fillStyle = "#E8D4C4";
        ctx.fillRect(-3, -4, 6, 7);

        // Head
        ctx.fillStyle = "#EEDDCC";
        ctx.beginPath();
        ctx.ellipse(0, -12 + breathe * 0.2, 10, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.beginPath();
        ctx.ellipse(-10, -12 + breathe * 0.2, 2, 3, 0, 0, Math.PI * 2);
        ctx.ellipse(10, -12 + breathe * 0.2, 2, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hair (professional, neat)
        ctx.fillStyle = "#554433";
        ctx.beginPath();
        ctx.ellipse(0, -20 + breathe * 0.2, 9, 5, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(-9, -18 + breathe * 0.2, 18, 5);

        // Eyes
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.ellipse(-4, -12 + breathe * 0.2, 3, 2.5, 0, 0, Math.PI * 2);
        ctx.ellipse(4, -12 + breathe * 0.2, 3, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pupils
        ctx.fillStyle = "#4477AA";
        ctx.beginPath();
        ctx.arc(-4, -12 + breathe * 0.2, 1.2, 0, Math.PI * 2);
        ctx.arc(4, -12 + breathe * 0.2, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Glasses
        ctx.strokeStyle = "#6688AA";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(-4, -12 + breathe * 0.2, 4.5, 3.5, 0, 0, Math.PI * 2);
        ctx.ellipse(4, -12 + breathe * 0.2, 4.5, 3.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Bridge
        ctx.beginPath();
        ctx.moveTo(-0.5, -12 + breathe * 0.2);
        ctx.lineTo(0.5, -12 + breathe * 0.2);
        ctx.stroke();

        // Nose (subtle)
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -10 + breathe * 0.2);
        ctx.lineTo(0, -6 + breathe * 0.2);
        ctx.stroke();

        // Friendly smile
        ctx.strokeStyle = "#AA8877";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -6 + breathe * 0.2, 3, 0.2, Math.PI - 0.2);
        ctx.stroke();

        // Name badge
        ctx.fillStyle = "#4488AA";
        ctx.fillRect(8, 8 + breathe * 0.3, 14, 10);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 4px monospace";
        ctx.textAlign = "center";
        ctx.fillText("DR.", 15, 13 + breathe * 0.3);
        ctx.fillText("SNOW", 15, 17 + breathe * 0.3);

        // Stethoscope around neck
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 6 + breathe * 0.3, 8, 0.3, Math.PI - 0.3);
        ctx.stroke();
        // Stethoscope ends
        ctx.fillStyle = "#444";
        ctx.beginPath();
        ctx.arc(-6, 10 + breathe * 0.3, 3, 0, Math.PI * 2);
        ctx.fill();

        // Label above
        ctx.fillStyle = "#AADDFF";
        ctx.shadowColor = "#66BBFF";
        ctx.shadowBlur = 8;
        ctx.font = "bold 7px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("DR. SNOW", 0, -30 + breathe * 0.2);
        ctx.shadowBlur = 0;

        ctx.restore();

        // ── Display cases (right side) ──────────────────
        const displayItems = [
          { x: W * 0.68, y: topY + 24, label: "COLD MEDS", color: "#66BBFF" },
          { x: W * 0.84, y: topY + 24, label: "VITAMINS", color: "#FFAA55" },
          { x: W * 0.68, y: topY + 68, label: "BANDAGES", color: "#FFFFFF" },
          { x: W * 0.84, y: topY + 68, label: "FIRST AID", color: "#FF6666" },
        ];
        for (const item of displayItems) {
          ctx.fillStyle = "#E8F4FF";
          ctx.strokeStyle = "#AACCDD";
          ctx.lineWidth = 1.5;
          rr(item.x - 26, item.y - 14, 52, 36, 4);
          ctx.fill();
          ctx.stroke();

          // Item inside
          ctx.fillStyle = item.color;
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.ellipse(item.x, item.y + 2, 14, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;

          // Cross on medical items
          if (item.label === "FIRST AID") {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(item.x - 1, item.y - 3, 2, 10);
            ctx.fillRect(item.x - 4, item.y, 8, 2);
          }

          // Label
          ctx.fillStyle = "#446688";
          ctx.font = "bold 5px monospace";
          ctx.textAlign = "center";
          ctx.fillText(item.label, item.x, item.y + 18);
        }

        // ── Pharmacy cross emblem (wall) ────────────────
        const crossX2 = W * 0.76;
        const crossY2 = midY + 30;
        ctx.fillStyle = "#22AA66";
        ctx.shadowColor = "#44DD88";
        ctx.shadowBlur = 12;
        ctx.fillRect(crossX2 - 3, crossY2 - 12, 6, 24);
        ctx.fillRect(crossX2 - 12, crossY2 - 3, 24, 6);
        ctx.shadowBlur = 0;

        // ── Waiting chairs (bottom) ─────────────────────
        for (let ci = 0; ci < 3; ci++) {
          const chairX = cx - 60 + ci * 60;
          const chairY = midY + 50;
          ctx.fillStyle = "#DDEEFF";
          ctx.strokeStyle = "#AABBCC";
          ctx.lineWidth = 1;
          rr(chairX - 12, chairY, 24, 16, 3);
          ctx.fill();
          ctx.stroke();
          // Back
          ctx.fillStyle = "#CCDDEF";
          rr(chairX - 10, chairY - 12, 20, 14, 3);
          ctx.fill();
          ctx.stroke();
        }

        // ── Ice/frost particles ─────────────────────────
        for (let pi = 0; pi < 6; pi++) {
          const px2 = W * 0.15 + (t * 10 + pi * 55) % (W * 0.7);
          const py2 = topY + 30 + Math.sin(t * 0.8 + pi * 2) * 25 + pi * 10;
          const alpha = Math.sin(t * 1.5 + pi) * 0.2 + 0.35;
          ctx.fillStyle = `rgba(180,220,255,${alpha})`;
          ctx.beginPath();
          ctx.arc(px2, py2, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

      } else {
        // ── Default pharmacy (non-galactica) ────────────
        const mC = ["#FF4444","#4444FF","#44FF44","#FFAA44","#FF44FF","#44FFFF"];
        for (let row = 0; row < 2; row++) {
          const sy2 = topY + 6 + row * 38;
          ctx.fillStyle = "#EEEEFF";
          ctx.strokeStyle = "#AAAACC";
          ctx.lineWidth = 1;
          ctx.fillRect(cx - W * 0.4, sy2, W * 0.8, 30);
          ctx.fillStyle = "#CCCCEE";
          ctx.fillRect(cx - W * 0.4, sy2 + 13, W * 0.8, 3);
          ctx.fillRect(cx - W * 0.4, sy2 + 25, W * 0.8, 3);
          for (let pi = 0; pi < 10; pi++) {
            const px3 = cx - W * 0.38 + pi * ((W * 0.76) / 10);
            ctx.fillStyle = mC[pi % mC.length];
            const bh = 6 + (pi % 3) * 3;
            ctx.fillRect(px3, sy2 + 2, (W * 0.76) / 10 - 2, bh);
            ctx.fillRect(px3, sy2 + 15, (W * 0.76) / 10 - 2, bh - 2);
          }
        }
        // ── Counter + cross ─────────────────────────────
        ctx.fillStyle = "#EEEEFF";
        ctx.strokeStyle = "#4488FF";
        ctx.lineWidth = 1.5;
        rr(cx - 46, midY + 2, 92, 26, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#22CC44";
        ctx.shadowColor = "#22FF66";
        ctx.shadowBlur = 12;
        ctx.fillRect(cx - 4, midY - 18, 8, 20);
        ctx.fillRect(cx - 10, midY - 12, 20, 8);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#111118";
        ctx.fillRect(cx + 18, midY + 4, 22, 16);
        ctx.fillStyle = "#003322";
        ctx.fillRect(cx + 20, midY + 6, 18, 12);
      } // end default pharmacy
    } else if (type === 6) {
      // GYM
      if (!!this.map?.config?.zombie) {
        // ═══ ZOMBIE: SURVIVOR FORTRESS ═══
        const t=performance.now()/1000;
        ctx.fillStyle="rgba(0,50,0,0.9)"; rr(W/2-100,room.S-22,200,26,5); ctx.fill();
        ctx.strokeStyle=`rgba(44,200,44,${0.6+0.3*Math.sin(t*2)})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#AAFFAA"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
        ctx.fillText("☠ SURVIVOR FORTRESS", W/2, room.S-9);
        // Barricaded windows (left/right walls — stacked weights/benches)
        for (const [bx3,by3,bw3,bh3] of [[14,H*0.28,50,H*0.55],[W-64,H*0.28,50,H*0.55]]) {
          ctx.fillStyle="#0a1800"; rr(bx3,by3,bw3,bh3,4); ctx.fill();
          ctx.strokeStyle="rgba(44,120,44,0.5)"; ctx.lineWidth=1; ctx.stroke();
          // planks/barricade stripes
          for (let pi=0;pi<4;pi++) { ctx.fillStyle=pi%2===0?"rgba(20,60,20,0.5)":"rgba(0,30,0,0.4)"; ctx.fillRect(bx3+2,by3+12+pi*28,bw3-4,12); }
          ctx.fillStyle="rgba(44,200,44,0.6)"; ctx.font="bold 5px monospace"; ctx.textAlign="center"; ctx.fillText("SAFE", bx3+bw3/2, by3-6);
        }
        // Treadmill as weapon stand
        ctx.fillStyle="#0d1a0d"; rr(cx-W*0.38,topY+8,55,56,3); ctx.fill();
        ctx.strokeStyle="rgba(44,160,44,0.4)"; ctx.lineWidth=1; ctx.stroke();
        for (let wi=0;wi<3;wi++) { ctx.fillStyle="rgba(140,60,0,0.7)"; ctx.fillRect(cx-W*0.35,topY+14+wi*14,40,8); }// bats/pipes
        ctx.fillStyle="rgba(44,160,44,0.5)"; ctx.font="5px monospace"; ctx.textAlign="center"; ctx.fillText("WEAPONS", cx-W*0.38+27,topY+72);
        // Sleeping mats (survivors rest area)
        for (let mi=0;mi<3;mi++) {
          ctx.fillStyle="#0a1200"; rr(cx-40+mi*55,midY+20,48,22,3); ctx.fill();
          ctx.strokeStyle="rgba(44,100,44,0.4)"; ctx.lineWidth=1; ctx.stroke();
          ctx.fillStyle=["rgba(44,100,44,0.4)","rgba(100,40,0,0.4)","rgba(0,80,80,0.4)"][mi];
          ctx.fillRect(cx-38+mi*55,midY+22,44,18);
        }
        // Supply crate (top-right)
        ctx.fillStyle="#0d1a08"; rr(W*0.68,topY+12,64,64,4); ctx.fill();
        ctx.strokeStyle="rgba(80,140,40,0.5)"; ctx.lineWidth=1.5; ctx.stroke();
        ctx.strokeStyle="rgba(60,100,30,0.4)"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(W*0.68,topY+44); ctx.lineTo(W*0.68+64,topY+44); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W*0.68+32,topY+12); ctx.lineTo(W*0.68+32,topY+76); ctx.stroke();
        ctx.fillStyle="rgba(100,160,40,0.7)"; ctx.font="bold 5px monospace"; ctx.textAlign="center";
        ctx.fillText("SUPPLIES", W*0.68+32, topY+88);
        // Blood marks on floor (fight happened here)
        for (const [px6,py6] of [[W*0.38,H*0.55],[W*0.6,H*0.68],[W*0.45,H*0.75]]) {
          ctx.fillStyle="rgba(140,8,8,0.22)"; ctx.beginPath(); ctx.ellipse(px6,py6,14,8,px6*0.01,0,Math.PI*2); ctx.fill();
        }
      } else {
      // ── Treadmills (left) ────────────────────────
      for (let i = 0; i < 2; i++) {
        const tx2 = cx - W * 0.38,
          ty2 = topY + 8 + i * 62;
        ctx.fillStyle = "#1a1a2a";
        ctx.strokeStyle = "#FF4422";
        ctx.lineWidth = 1.5;
        rr(tx2, ty2, 56, 40, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#333344";
        ctx.fillRect(tx2 + 4, ty2 + 16, 48, 14);
        ctx.fillStyle = "#FF4422";
        ctx.fillRect(tx2 + 4, ty2 + 16, 48, 4);
        ctx.fillStyle = "#222";
        ctx.fillRect(tx2 + 10, ty2 + 4, 30, 12);
        ctx.fillStyle = "#FF4422";
        ctx.fillRect(tx2 + 12, ty2 + 5, 26, 10);
        ctx.strokeStyle = "#888";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx2 + 2, ty2 + 4);
        ctx.lineTo(tx2 + 2, ty2 + 16);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(tx2 + 54, ty2 + 4);
        ctx.lineTo(tx2 + 54, ty2 + 16);
        ctx.stroke();
      }
      // ── Weight rack (right) ──────────────────────
      const wrx = cx + W * 0.08,
        wry = topY + 6;
      ctx.fillStyle = "#2a2a2a";
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 1;
      ctx.fillRect(wrx, wry, 16, 84);
      for (let ri = 0; ri < 3; ri++) {
        ctx.fillStyle = "#888";
        ctx.fillRect(wrx - 2, wry + 8 + ri * 26, 20, 4);
        const pC2 = ["#FF3333", "#3333FF", "#33FF33", "#FFAA33"];
        for (let pi = 0; pi < 3; pi++) {
          const pw = 8 + ri * 4;
          ctx.fillStyle = pC2[(ri + pi) % 4];
          ctx.beginPath();
          ctx.ellipse(
            wrx + 8 + (pi - 1) * (pw + 5),
            wry + 12 + ri * 26,
            pw / 2,
            11,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
      // ── Bench press (center-right) ───────────────
      const bpx = cx + W * 0.1,
        bpy = midY - 4;
      ctx.fillStyle = "#2a2a30";
      ctx.strokeStyle = "#444455";
      ctx.lineWidth = 1;
      rr(bpx, bpy, 62, 20, 3);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#AAAAAA";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bpx - 16, bpy - 9);
      ctx.lineTo(bpx + 78, bpy - 9);
      ctx.stroke();
      ctx.fillStyle = "#FF3333";
      ctx.fillRect(bpx - 16, bpy - 17, 12, 16);
      ctx.fillRect(bpx + 66, bpy - 17, 12, 16);
      // Exercise mat
      ctx.fillStyle = "#1a3a1a";
      ctx.strokeStyle = "#2a6a2a";
      ctx.lineWidth = 1;
      rr(cx - W * 0.4, midY + 30, W * 0.32, 22, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2a5a2a";
      for (let mi = 0; mi < 4; mi++)
        ctx.fillRect(cx - W * 0.4 + mi * ((W * 0.32) / 4), midY + 30, 2, 22);
      } // end gym default
    } else if (type === 7) {
      // BANK
      if (!!this.map?.config?.zombie) {
        // ═══ ZOMBIE: LOOTED VAULT ═══
        const t=performance.now()/1000;
        ctx.fillStyle="rgba(30,20,0,0.9)"; rr(W/2-90,room.S-22,180,26,5); ctx.fill();
        ctx.strokeStyle=`rgba(220,180,0,${0.6+0.3*Math.sin(t*2)})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#FFEEAA"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
        ctx.fillText("☠  LOOTED VAULT  ☠", W/2, room.S-9);
        // Blown-open vault door (left, massive)
        ctx.fillStyle="#141400"; rr(14,topY+10,56,120,4); ctx.fill();
        ctx.strokeStyle="rgba(160,140,0,0.5)"; ctx.lineWidth=2; ctx.stroke();
        // Blast damage marks
        ctx.fillStyle="rgba(80,60,0,0.3)"; ctx.beginPath(); ctx.arc(42,topY+70,28,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle="rgba(200,160,0,0.4)"; ctx.lineWidth=0.8;
        for (let vi=0;vi<6;vi++) {
          const va=vi*1.05; ctx.beginPath(); ctx.moveTo(42,topY+70); ctx.lineTo(42+Math.cos(va)*34,topY+70+Math.sin(va)*34); ctx.stroke();
        }
        ctx.fillStyle="rgba(200,160,0,0.6)"; ctx.font="bold 7px monospace"; ctx.textAlign="center"; ctx.fillText("VAULT", 42,topY+130);
        // Scattered money/valuables on floor
        for (const [mx2,my2] of [[W*0.3,H*0.40],[W*0.45,H*0.48],[W*0.6,H*0.52],[W*0.35,H*0.62],[W*0.7,H*0.58],[W*0.5,H*0.70],[W*0.25,H*0.68]]) {
          ctx.fillStyle=`rgba(44,${140+Math.floor(Math.random()*80)},0,0.3)`;
          rr(mx2,my2,18,8,2); ctx.fill();
          ctx.strokeStyle="rgba(44,160,0,0.2)"; ctx.lineWidth=0.5; ctx.stroke();
        }
        // Teller windows (smashed)
        for (let i=0;i<3;i++) {
          const twx=cx-70+i*58, twy=topY+14;
          ctx.fillStyle="#0d0d00"; rr(twx,twy,40,42,3); ctx.fill();
          ctx.strokeStyle="rgba(120,100,0,0.4)"; ctx.lineWidth=1; ctx.stroke();
          ctx.strokeStyle="rgba(80,80,80,0.5)"; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(twx+8,twy+2); ctx.lineTo(twx+26,twy+42); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(twx+32,twy+4); ctx.lineTo(twx+14,twy+40); ctx.stroke();
        }
        // Safe deposit boxes (right wall — all broken open)
        ctx.fillStyle="#0d0d08"; rr(W*0.65,H*0.28,W*0.28,H*0.42,4); ctx.fill();
        ctx.strokeStyle="rgba(140,120,0,0.4)"; ctx.lineWidth=1; ctx.stroke();
        for (let row=0;row<4;row++) for (let col=0;col<3;col++) {
          const bx4=W*0.66+col*W*0.09, by4=H*0.30+row*H*0.09;
          ctx.fillStyle=Math.random()>0.5?"rgba(0,0,0,0.8)":"rgba(20,18,0,0.9)";
          rr(bx4,by4,W*0.085,H*0.07,2); ctx.fill();
          ctx.strokeStyle="rgba(100,80,0,0.3)"; ctx.lineWidth=0.5; ctx.stroke();
          // Pried/open
          if ((row+col)%2===0) { ctx.fillStyle="rgba(0,0,0,0.95)"; ctx.fillRect(bx4+2,by4+2,W*0.085-4,H*0.07-4); }
        }
        // Blood trail leading to vault
        ctx.fillStyle="rgba(140,8,8,0.18)"; ctx.beginPath(); ctx.ellipse(W*0.38,H*0.56,30,8,0.1,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(W*0.28,H*0.62,16,5,0.2,0,Math.PI*2); ctx.fill();
      } else {
      // ── 3 teller windows ─────────────────────────
      for (let i = 0; i < 3; i++) {
        const twx = cx - 76 + i * 52,
          twy = topY + 4;
        ctx.fillStyle = "#2a2a3a";
        ctx.strokeStyle = "#FFCC44";
        ctx.lineWidth = 1.5;
        rr(twx, twy, 44, 54, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(100,200,255,0.15)";
        ctx.fillRect(twx + 2, twy + 2, 40, 36);
        ctx.strokeStyle = "rgba(100,200,255,0.45)";
        ctx.lineWidth = 1;
        ctx.strokeRect(twx + 2, twy + 2, 40, 36);
        ctx.fillStyle = "#FFDD88";
        ctx.beginPath();
        ctx.arc(twx + 22, twy + 14, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3a4a5a";
        ctx.fillRect(twx + 13, twy + 21, 18, 14);
        ctx.fillStyle = "#FFCC44";
        ctx.fillRect(twx + 9, twy + 40, 26, 3);
        ctx.font = "bold 5px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`WIN ${i + 1}`, twx + 22, twy + 50);
      }
      // ── Velvet rope queue ─────────────────────────
      ctx.strokeStyle = "#AA2222";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 64, midY - 6);
      ctx.lineTo(cx - 64, midY + 16);
      ctx.moveTo(cx - 64, midY + 16);
      ctx.lineTo(cx + 22, midY + 16);
      ctx.moveTo(cx + 22, midY + 16);
      ctx.lineTo(cx + 22, midY - 6);
      ctx.stroke();
      for (const rpx of [cx - 64, cx + 22]) {
        ctx.fillStyle = "#FFCC44";
        ctx.shadowColor = "#FFCC44";
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(rpx, midY - 6, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rpx, midY + 16, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      // ── Vault door (right side) ───────────────────
      const vx = cx + W * 0.3,
        vy = midY - 22;
      ctx.fillStyle = "#222222";
      ctx.strokeStyle = "#888888";
      ctx.lineWidth = 2;
      rr(vx - 24, vy, 48, 58, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#444444";
      ctx.strokeStyle = "#AAAAAA";
      ctx.lineWidth = 1.5;
      rr(vx - 20, vy + 4, 40, 50, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#FFCC44";
      ctx.shadowColor = "#FFCC44";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(vx, vy + 29, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(vx, vy + 29);
      ctx.lineTo(vx + 8, vy + 24);
      ctx.stroke();
      ctx.strokeStyle = "#CCCCCC";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(vx + 12, vy + 42, 6, 0, Math.PI);
      ctx.stroke();
      ctx.fillStyle = "#CCCCCC";
      for (const [bx2, by2] of [
        [-16, 9],
        [-16, 49],
        [16, 9],
        [16, 49],
      ]) {
        ctx.beginPath();
        ctx.arc(vx + bx2, vy + by2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      } // end bank default
    } else if (type === 8) {
      // NIGHTCLUB
      if (!!this.map?.config?.galactica) {
        // ═══ GALACTICA: GALAXY CLUB ═══
        const t = performance.now() / 1000;
        const PURP = "#CC44FF", PINK = "#FF44CC", CYAN = "#44DDFF",
              GOLD = "#FFDD44", HOT  = "#FF2299", BLUE = "#4455FF";

        // ── SPACE FLOOR (same cosmic tiles as room) ──
        for (let ty2 = 0; ty2 < room.H; ty2++) {
          for (let tx2 = 0; tx2 < room.W; tx2++) {
            if (room.layout[ty2][tx2] !== 0) continue;
            const px2 = tx2 * room.S, py2 = ty2 * room.S;
            ctx.fillStyle = (tx2 + ty2) % 2 === 0 ? "#06031e" : "#040118";
            ctx.fillRect(px2, py2, room.S, room.S);
            ctx.strokeStyle = "rgba(120,60,200,0.06)";
            ctx.lineWidth = 1;
            ctx.strokeRect(px2, py2, room.S, room.S);
          }
        }

        // ── ROOM BORDER ──
        ctx.strokeStyle = HOT;
        ctx.lineWidth = 2;
        ctx.shadowColor = HOT;
        ctx.shadowBlur = 18;
        ctx.strokeRect(room.S + 2, room.S + 2, W - room.S * 2 - 4, H - room.S * 2 - 4);
        ctx.shadowBlur = 0;

        // ── TITLE SIGN ──
        ctx.save();
        ctx.font = "bold 22px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.shadowColor = PINK;
        ctx.shadowBlur = 30;
        ctx.fillText("✦  GALAXY CLUB  ✦", W / 2, room.S - 18);
        ctx.shadowBlur = 0;
        ctx.restore();

        // ── TOP ACCENT BAR ──
        const tg = ctx.createLinearGradient(0, room.S, W, room.S);
        tg.addColorStop(0,   "rgba(255,68,204,0)");
        tg.addColorStop(0.5, "rgba(255,68,204,0.6)");
        tg.addColorStop(1,   "rgba(255,68,204,0)");
        ctx.fillStyle = tg;
        ctx.fillRect(room.S, room.S, W - room.S * 2, 4);

        // ── DJ BOOTH (top-center, large + detailed) ──
        const djX = W / 2 - 110, djY = room.S * 1.1, djW = 220, djH = 54;
        // Booth body
        ctx.fillStyle = "#110020";
        ctx.strokeStyle = PURP;
        ctx.lineWidth = 2;
        ctx.shadowColor = PURP;
        ctx.shadowBlur = 14;
        rr(djX, djY, djW, djH, 8);
        ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        // Booth top strip
        const djG = ctx.createLinearGradient(djX, 0, djX + djW, 0);
        djG.addColorStop(0, PINK + "00");
        djG.addColorStop(0.5, PINK + "BB");
        djG.addColorStop(1, PINK + "00");
        ctx.fillStyle = djG;
        ctx.fillRect(djX + 4, djY, djW - 8, 4);
        // Turntable L
        const tt = (t * 1.2) % (Math.PI * 2);
        for (const [tx2, sign] of [[djX + 42, 1], [djX + djW - 42, -1]]) {
          ctx.fillStyle = "#0a001a";
          ctx.strokeStyle = PURP + "88";
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(tx2, djY + 28, 24, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
          // Vinyl grooves
          for (let gr = 1; gr <= 4; gr++) {
            ctx.strokeStyle = `rgba(160,80,255,${0.1 + gr * 0.06})`;
            ctx.beginPath(); ctx.arc(tx2, djY + 28, gr * 5, 0, Math.PI * 2);
            ctx.stroke();
          }
          // Label sticker
          ctx.fillStyle = PINK;
          ctx.beginPath(); ctx.arc(tx2, djY + 28, 6, 0, Math.PI * 2);
          ctx.fill();
          // Rotation arm
          ctx.strokeStyle = "#888";
          ctx.lineWidth = 2;
          ctx.save(); ctx.translate(tx2, djY + 28); ctx.rotate(tt * sign);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(22, -6); ctx.stroke();
          ctx.fillStyle = "#aaa"; ctx.beginPath(); ctx.arc(22, -6, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        // Mixer — animated EQ bars
        const eqColors = [CYAN, PURP, PINK, HOT, GOLD, BLUE, CYAN, PURP];
        for (let ei = 0; ei < 8; ei++) {
          const bh = 8 + Math.sin(t * 8 + ei * 0.9) * 14;
          ctx.fillStyle = eqColors[ei];
          ctx.shadowColor = eqColors[ei];
          ctx.shadowBlur = 6;
          ctx.fillRect(djX + 80 + ei * 8, djY + djH - 6 - bh, 6, bh);
        }
        ctx.shadowBlur = 0;
        // "DJ" label
        ctx.fillStyle = PINK;
        ctx.shadowColor = PINK;
        ctx.shadowBlur = 10;
        ctx.font = "bold 9px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("⬡ GALAXY MIX ⬡", W / 2, djY + djH + 14);
        ctx.shadowBlur = 0;

        // ── SPEAKERS — left & right of DJ booth ──
        for (const [spX, spY] of [[djX - 50, djY - 4], [djX + djW + 24, djY - 4]]) {
          ctx.fillStyle = "#0a0018";
          ctx.strokeStyle = PURP + "88";
          ctx.lineWidth = 1.5;
          rr(spX, spY, 32, 56, 5);
          ctx.fill(); ctx.stroke();
          // Woofer rings
          for (let ri = 0; ri < 4; ri++) {
            const rp = Math.sin(t * 6 + ri) * 0.5 + 0.5;
            ctx.strokeStyle = `rgba(160,80,255,${0.2 + rp * 0.5})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(spX + 16, spY + 20, 4 + ri * 3, 0, Math.PI * 2);
            ctx.stroke();
          }
          // Tweeter
          ctx.fillStyle = PURP;
          ctx.shadowColor = PURP;
          ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(spX + 16, spY + 44, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // ── DANCE FLOOR (center of room, animated tiles) ──
        const dfCols = 8, dfRows = 5;
        const dfW2 = W * 0.62, dfH2 = H * 0.32;
        const dfX = W / 2 - dfW2 / 2, dfY2 = H * 0.40;
        const tw = dfW2 / dfCols, th2 = dfH2 / dfRows;
        const tileColors = [HOT, PURP, CYAN, PINK, BLUE, GOLD, "#44FFAA", PINK];
        for (let tr = 0; tr < dfRows; tr++) {
          for (let tc = 0; tc < dfCols; tc++) {
            const seed = tc * 3 + tr * 7;
            const phase = Math.sin(t * 4 + seed * 1.1) * 0.5 + 0.5;
            const col = tileColors[(tc + tr + Math.floor(t * 2)) % tileColors.length];
            // Tile base
            ctx.fillStyle = `rgba(8,0,20,0.9)`;
            ctx.fillRect(dfX + tc * tw + 1, dfY2 + tr * th2 + 1, tw - 2, th2 - 2);
            // Lit tile
            ctx.fillStyle = col + Math.floor(phase * 80 + 20).toString(16).padStart(2, "0");
            ctx.fillRect(dfX + tc * tw + 1, dfY2 + tr * th2 + 1, tw - 2, th2 - 2);
            // Border glow
            ctx.strokeStyle = col + Math.floor(phase * 180 + 40).toString(16).padStart(2, "0");
            ctx.lineWidth = 1;
            ctx.strokeRect(dfX + tc * tw + 1, dfY2 + tr * th2 + 1, tw - 2, th2 - 2);
            // Shine
            ctx.fillStyle = `rgba(255,255,255,${0.04 + phase * 0.06})`;
            ctx.fillRect(dfX + tc * tw + 2, dfY2 + tr * th2 + 2, tw / 2, th2 / 2);
          }
        }
        // Dance floor label
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.font = "bold 7px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("DANCE FLOOR", W / 2, dfY2 + dfH2 + 12);

        // ── DANCERS on the dance floor ──
        const dancerDefs = [
          { x: W * 0.25, y: H * 0.50, color: PINK,  gender: "f", skin: "#F0C080", hair: "#AA5522" },
          { x: W * 0.38, y: H * 0.53, color: CYAN,  gender: "m", skin: "#DDAA88", hair: "#1a1a1a" },
          { x: W * 0.50, y: H * 0.50, color: GOLD,  gender: "f", skin: "#FFDDBB", hair: "#441100" },
          { x: W * 0.62, y: H * 0.53, color: PURP,  gender: "m", skin: "#D4956A", hair: "#2a1a00" },
          { x: W * 0.75, y: H * 0.50, color: HOT,   gender: "f", skin: "#EECCAA", hair: "#1a002a" },
        ];
        for (const d of dancerDefs) {
          const bounce   = Math.sin(t * 4 + d.x * 0.05) * 5;
          const armSwing = Math.sin(t * 4 + d.x * 0.05) * 18;
          const stepL    = Math.sin(t * 4 + d.x) * 5;
          ctx.save();
          ctx.translate(d.x, d.y + bounce);

          // Shadow
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.beginPath(); ctx.ellipse(0, 22, 9, 3, 0, 0, Math.PI * 2); ctx.fill();

          // Legs with shoes
          const legColor = d.gender === "f" ? "#1a0030" : "#0a1a2a";
          ctx.fillStyle = legColor;
          ctx.beginPath(); ctx.roundRect(-8, 10, 5, 12 + stepL, 1); ctx.fill();
          ctx.beginPath(); ctx.roundRect(3,  10, 5, 12 - stepL, 1); ctx.fill();
          // Shoes
          ctx.fillStyle = d.gender === "f" ? d.color + "AA" : "#222";
          ctx.beginPath(); ctx.ellipse(-5, 22 + stepL, 5, 2, 0, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(5,  22 - stepL, 5, 2, 0, 0, Math.PI*2); ctx.fill();

          // Body / outfit
          ctx.fillStyle = d.color + "CC";
          ctx.shadowColor = d.color; ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.roundRect(d.gender === "f" ? -8 : -7, -8, d.gender === "f" ? 16 : 14, 20, 3);
          ctx.fill(); ctx.shadowBlur = 0;
          if (d.gender === "f") {
            // Dress flare
            ctx.fillStyle = d.color + "88";
            ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(-13, 22); ctx.lineTo(13, 22); ctx.lineTo(8, 8); ctx.closePath(); ctx.fill();
            // Dress waist detail
            ctx.strokeStyle = d.color + "FF"; ctx.lineWidth = 1.5; ctx.shadowColor = d.color; ctx.shadowBlur = 4;
            ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(8, 4); ctx.stroke(); ctx.shadowBlur = 0;
          } else {
            // Shirt collar
            ctx.fillStyle = d.skin;
            ctx.beginPath(); ctx.moveTo(-3,-8); ctx.lineTo(0,-4); ctx.lineTo(3,-8); ctx.fill();
          }

          // Arms (swinging)
          ctx.strokeStyle = d.skin; ctx.lineWidth = 4; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(-14 - armSwing * 0.3, 6); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(7, -4); ctx.lineTo(14 + armSwing * 0.3, 2); ctx.stroke();
          // Hands
          ctx.fillStyle = d.skin;
          ctx.beginPath(); ctx.arc(-14 - armSwing * 0.3, 6, 3, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(14 + armSwing * 0.3, 2, 3, 0, Math.PI*2); ctx.fill();
          ctx.lineCap = "butt";

          // Neck
          ctx.fillStyle = d.skin;
          ctx.fillRect(-3, -9, 6, 5);

          // Head
          ctx.beginPath(); ctx.arc(0, -16, 9, 0, Math.PI * 2); ctx.fill();

          // Hair
          ctx.fillStyle = d.hair;
          if (d.gender === "f") {
            ctx.beginPath(); ctx.arc(0, -20, 8, Math.PI, 0); ctx.fill();
            ctx.fillRect(-9, -21, 5, 14);
            ctx.fillRect(4,  -21, 5, 14);
          } else {
            ctx.beginPath(); ctx.arc(0, -21, 7, Math.PI * 1.1, Math.PI * 1.9); ctx.fill();
            ctx.fillRect(-6, -21, 12, 6);
          }

          // Eyes — white + iris + glowing neon tint
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.ellipse(-3.5, -17, 2.2, 1.8, 0, 0, Math.PI*2);
          ctx.ellipse( 3.5, -17, 2.2, 1.8, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = d.color; ctx.shadowColor = d.color; ctx.shadowBlur = 3;
          ctx.beginPath();
          ctx.arc(-3.5, -17, 1.2, 0, Math.PI*2);
          ctx.arc( 3.5, -17, 1.2, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
          // Pupil
          ctx.fillStyle = "#000";
          ctx.beginPath(); ctx.arc(-3.5, -17, 0.5, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc( 3.5, -17, 0.5, 0, Math.PI*2); ctx.fill();

          // Eyebrows
          ctx.strokeStyle = d.hair; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(-6, -20); ctx.lineTo(-2, -21); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(2, -21); ctx.lineTo(6, -20); ctx.stroke();

          // Nose
          ctx.fillStyle = "rgba(0,0,0,0.18)";
          ctx.beginPath(); ctx.arc(0, -14, 1.2, 0, Math.PI*2); ctx.fill();

          // Mouth — smiling, animated
          const mOpen = Math.abs(Math.sin(t * 4 + d.x)) * 2;
          ctx.strokeStyle = d.gender === "f" ? "#EE4466" : "#AA6644"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(0, -11, 3, 0.1, Math.PI - 0.1); ctx.stroke();
          if (mOpen > 0.5) {
            ctx.fillStyle = "#441122"; ctx.beginPath();
            ctx.arc(0, -10, mOpen, 0, Math.PI); ctx.fill();
          }

          // Earrings (female)
          if (d.gender === "f") {
            ctx.fillStyle = d.color; ctx.shadowColor = d.color; ctx.shadowBlur = 4;
            ctx.beginPath(); ctx.arc(-9, -16, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc( 9, -16, 2, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
          }

          ctx.restore();
        }

        // ── STAGE / PODIUMS (left and right) ──
        for (const [pdX, pdCol] of [[W * 0.12, PINK], [W * 0.88, CYAN]]) {
          const podBounce = Math.sin(t * 3 + pdX) * 4;
          // Platform
          ctx.fillStyle = "#110025";
          ctx.strokeStyle = pdCol;
          ctx.lineWidth = 2;
          ctx.shadowColor = pdCol;
          ctx.shadowBlur = 12;
          rr(pdX - 22, H * 0.42, 44, 14, 4);
          ctx.fill(); ctx.stroke();
          ctx.shadowBlur = 0;
          // Pole dancer (realistic)
          const pdSkin = pdCol === PINK ? "#F0C080" : "#FFDDBB";
          const pdHair = pdCol === PINK ? "#220044" : "#1a002a";
          ctx.save();
          ctx.translate(pdX, H * 0.42 - 5 + podBounce);
          // Pole
          const poleG = ctx.createLinearGradient(-1, 0, 1, -50);
          poleG.addColorStop(0, "#888"); poleG.addColorStop(1, "#ccc");
          ctx.strokeStyle = poleG; ctx.lineWidth = 3;
          ctx.shadowColor = pdCol; ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -50); ctx.stroke();
          ctx.shadowBlur = 0;
          // Legs
          const pLegStep = Math.sin(t * 3 + pdX) * 6;
          ctx.fillStyle = pdCol === PINK ? "#1a0030" : "#0a0818";
          ctx.beginPath(); ctx.roundRect(-7, -20, 5, 14 + pLegStep, 1); ctx.fill();
          ctx.beginPath(); ctx.roundRect(2, -20, 5, 14 - pLegStep, 1); ctx.fill();
          // Heels
          ctx.fillStyle = pdCol + "AA";
          ctx.beginPath(); ctx.ellipse(-4, -6 + pLegStep, 5, 2, 0, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(4, -6 - pLegStep, 5, 2, 0, 0, Math.PI*2); ctx.fill();
          // Body / outfit
          ctx.fillStyle = pdCol + "CC"; ctx.shadowColor = pdCol; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.roundRect(-7, -38, 14, 20, 3); ctx.fill(); ctx.shadowBlur = 0;
          // Dress flare
          ctx.fillStyle = pdCol + "77";
          ctx.beginPath(); ctx.moveTo(-7,-20); ctx.lineTo(-11,-8); ctx.lineTo(11,-8); ctx.lineTo(7,-20); ctx.closePath(); ctx.fill();
          // Waist sparkle
          ctx.strokeStyle = pdCol; ctx.lineWidth = 1.5; ctx.shadowColor = pdCol; ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.moveTo(-7,-22); ctx.lineTo(7,-22); ctx.stroke(); ctx.shadowBlur = 0;
          // Neck
          ctx.fillStyle = pdSkin; ctx.fillRect(-3, -40, 6, 4);
          // Head
          ctx.beginPath(); ctx.arc(0, -47, 8, 0, Math.PI*2); ctx.fill();
          // Hair
          ctx.fillStyle = pdHair;
          ctx.beginPath(); ctx.arc(0, -50, 7, Math.PI, 0); ctx.fill();
          ctx.fillRect(-8, -52, 4, 12); ctx.fillRect(4, -52, 4, 12);
          // Eyes
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.ellipse(-3, -48, 2, 1.6, 0, 0, Math.PI*2);
          ctx.ellipse( 3, -48, 2, 1.6, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = pdCol; ctx.shadowColor = pdCol; ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.arc(-3, -48, 1.1, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc( 3, -48, 1.1, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
          // Lashes
          ctx.strokeStyle = "#000"; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(-5, -49.5); ctx.lineTo(-6, -51); ctx.stroke();
          ctx.beginPath(); ctx.moveTo( 5, -49.5); ctx.lineTo( 6, -51); ctx.stroke();
          // Nose
          ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.arc(0, -45.5, 1, 0, Math.PI*2); ctx.fill();
          // Mouth (smile)
          ctx.strokeStyle = "#EE4466"; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(0, -43.5, 2.5, 0.1, Math.PI-0.1); ctx.stroke();
          // Earrings
          ctx.fillStyle = pdCol; ctx.shadowColor = pdCol; ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.arc(-9, -47, 2, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc( 9, -47, 2, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
          // Arms
          ctx.strokeStyle = pdSkin; ctx.lineWidth = 3; ctx.lineCap = "round";
          const armA = Math.sin(t * 3 + pdX) * 0.4;
          ctx.beginPath(); ctx.moveTo(7, -34); ctx.lineTo(0 + Math.cos(armA) * 16, -42 + Math.sin(armA) * 8); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-7, -34); ctx.lineTo(-14, -26); ctx.stroke();
          ctx.lineCap = "butt";
          ctx.restore();
        }

        // ── NEON LASER LIGHTS ──
        for (let li = 0; li < 6; li++) {
          const angle = t * 0.7 + (li * Math.PI * 2) / 6;
          const originX = W / 2 + (li % 3 - 1) * 80;
          const originY = room.S * 1.5;
          const len = 180 + Math.sin(t * 2 + li) * 60;
          const lCol = tileColors[li % tileColors.length];
          ctx.strokeStyle = lCol + "55";
          ctx.lineWidth = 1.5;
          ctx.shadowColor = lCol;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(originX, originY);
          ctx.lineTo(originX + Math.cos(angle) * len, originY + Math.sin(angle) * len);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // ── STROBE SPOTLIGHTS on dance floor ──
        for (let si = 0; si < 3; si++) {
          const sp = Math.sin(t * 5 + si * 2) * 0.5 + 0.5;
          const sCol = [PINK, CYAN, GOLD][si];
          const sx = dfX + dfW2 * (0.2 + si * 0.3);
          const sg = ctx.createRadialGradient(sx, dfY2 + dfH2 / 2, 0, sx, dfY2 + dfH2 / 2, 60);
          sg.addColorStop(0, sCol + Math.floor(sp * 60).toString(16).padStart(2, "0"));
          sg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.arc(sx, dfY2 + dfH2 / 2, 60, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── BAR (bottom-left) ──
        const barX = room.S + 4, barY = H * 0.78, barW = W * 0.22, barH = 42;
        ctx.fillStyle = "#0e0020";
        ctx.strokeStyle = PURP;
        ctx.lineWidth = 2;
        ctx.shadowColor = PURP;
        ctx.shadowBlur = 10;
        rr(barX, barY, barW, barH, 6);
        ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        // Bar counter top
        ctx.fillStyle = "#1e0040";
        ctx.fillRect(barX, barY, barW, 6);
        // Glowing bottles
        const bColors = [HOT, PURP, CYAN, GOLD];
        for (let bi = 0; bi < 4; bi++) {
          const bc = bColors[bi];
          const bx = barX + 12 + bi * (barW - 24) / 3;
          const bp = Math.sin(t * 1.5 + bi) * 0.3 + 0.7;
          ctx.fillStyle = bc + "50";
          ctx.strokeStyle = bc;
          ctx.lineWidth = 1;
          ctx.shadowColor = bc;
          ctx.shadowBlur = 6 * bp;
          ctx.beginPath();
          ctx.moveTo(bx - 5, barY + barH - 4);
          ctx.lineTo(bx - 4, barY + 12);
          ctx.lineTo(bx - 2, barY + 8);
          ctx.lineTo(bx + 2, barY + 8);
          ctx.lineTo(bx + 4, barY + 12);
          ctx.lineTo(bx + 5, barY + barH - 4);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.shadowBlur = 0;
        }
        ctx.fillStyle = PINK;
        ctx.font = "bold 6px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("SPACE BAR", barX + barW / 2, barY + barH + 11);

        // ── VIP LOUNGE (bottom-right) ──
        const vipX = W - room.S - 4 - W * 0.22, vipY = H * 0.78;
        ctx.fillStyle = "#0e0020";
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 2;
        ctx.shadowColor = GOLD;
        ctx.shadowBlur = 10;
        rr(vipX, vipY, barW, barH, 6);
        ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        // VIP sofas
        for (let vi = 0; vi < 2; vi++) {
          const vsx = vipX + 10 + vi * (barW / 2 - 8);
          ctx.fillStyle = "#2a0040";
          ctx.strokeStyle = GOLD + "88";
          ctx.lineWidth = 1;
          rr(vsx, vipY + 10, barW / 2 - 14, 24, 4);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#1a002a";
          rr(vsx, vipY + 8, barW / 2 - 14, 8, 2);
          ctx.fill();
        }
        ctx.fillStyle = GOLD;
        ctx.shadowColor = GOLD;
        ctx.shadowBlur = 8;
        ctx.font = "bold 6px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("★ VIP LOUNGE ★", vipX + barW / 2, vipY + barH + 11);
        ctx.shadowBlur = 0;

        // ── AMBIENT PARTICLES ──
        for (let pi = 0; pi < 16; pi++) {
          const px2 = (t * 18 + pi * 67) % W;
          const py2 = room.S * 2 + Math.sin(t * 1.2 + pi * 0.7) * 30 + (pi * (H * 0.7)) / 16;
          const al  = Math.sin(t * 2 + pi) * 0.3 + 0.4;
          ctx.fillStyle = tileColors[pi % tileColors.length] + Math.floor(al * 200).toString(16).padStart(2, "0");
          ctx.beginPath();
          ctx.arc(px2, py2, pi % 4 === 0 ? 2 : 1, 0, Math.PI * 2);
          ctx.fill();
        }

        // Side neon strips
        ctx.fillStyle = "rgba(255,68,204,0.25)";
        ctx.fillRect(room.S, room.S * 1.5, 3, H - room.S * 3);
        ctx.fillRect(W - room.S - 3, room.S * 1.5, 3, H - room.S * 3);

      } else if (!!this.map?.config?.zombie) {
        // ═══ ZOMBIE: DEAD RAVE ═══
        const t = performance.now() / 1000;
        // Sign
        const sg = ctx.createLinearGradient(W/2-110, 0, W/2+110, 0);
        sg.addColorStop(0,"rgba(0,60,0,0.9)"); sg.addColorStop(0.5,"rgba(0,140,0,0.95)"); sg.addColorStop(1,"rgba(0,60,0,0.9)");
        ctx.fillStyle = sg; rr(W/2-110, room.S-22, 220, 26, 5); ctx.fill();
        ctx.strokeStyle = `rgba(44,255,44,${0.7+0.3*Math.sin(t*2.2)})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#AAFFAA"; ctx.font="bold 12px monospace"; ctx.textAlign="center";
        ctx.fillText("☠  DEAD RAVE  ☠", W/2, room.S-9);
        // Cracked dance floor
        const tiles=5, tSize=Math.floor((W*0.7)/tiles);
        const dfX=cx-(tSize*tiles)/2, dfY=midY-tSize*1.5;
        const dColors=["#003300","#001a00","#004400","#002200","#003a00"];
        for (let ty=0;ty<3;ty++) for (let tx=0;tx<tiles;tx++) {
          const col=dColors[(tx+ty)%dColors.length];
          ctx.fillStyle=col; ctx.fillRect(dfX+tx*tSize, dfY+ty*tSize, tSize-1, tSize-1);
          // Blood/moss cracks
          ctx.fillStyle="rgba(180,0,0,0.18)"; ctx.fillRect(dfX+tx*tSize+tSize/2, dfY+ty*tSize, 1, tSize);
          ctx.fillStyle=`rgba(44,200,44,${0.12+0.08*Math.sin(t+tx+ty)})`; ctx.fillRect(dfX+tx*tSize, dfY+ty*tSize+tSize/2, tSize, 1);
        }
        // Broken disco ball (cracked sphere)
        const dbx=W/2, dby=topY+52;
        ctx.fillStyle="#111"; ctx.beginPath(); ctx.arc(dbx, dby, 16, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle="rgba(44,200,44,0.6)"; ctx.lineWidth=1;
        for (let i=0;i<6;i++) { ctx.beginPath(); ctx.moveTo(dbx,dby); ctx.lineTo(dbx+Math.cos(i*1.05)*20, dby+Math.sin(i*1.05)*20); ctx.stroke(); }
        // Zombie dancers (5 silhouettes, lurching)
        const dpos=[[W*0.2,dfY+tSize*1.2],[W*0.35,dfY+tSize*1.5],[W*0.5,dfY+tSize*1.1],[W*0.65,dfY+tSize*1.6],[W*0.8,dfY+tSize*1.3]];
        for (let [dx,dy] of dpos) {
          const lurch=Math.sin(t*1.1+dx)*8;
          ctx.fillStyle="rgba(30,80,30,0.85)"; ctx.beginPath(); ctx.ellipse(dx, dy+lurch, 8, 14, lurch*0.05, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle="rgba(44,200,44,0.7)"; ctx.beginPath(); ctx.arc(dx, dy+lurch-20, 7, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle="rgba(0,0,0,0.4)"; ctx.lineWidth=0.5; ctx.stroke();
          // glowing eyes
          ctx.fillStyle="rgba(255,80,0,0.9)"; ctx.beginPath(); ctx.arc(dx-3,dy+lurch-21,1.5,0,Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(dx+3,dy+lurch-21,1.5,0,Math.PI*2); ctx.fill();
        }
        // Green fog machine effects (bottom)
        for (let fi=0;fi<4;fi++) {
          const fx=W*0.15+fi*(W*0.25), fy=H*0.82;
          ctx.fillStyle="#222"; rr(fx-10,fy,20,16,3); ctx.fill();
          ctx.strokeStyle="rgba(44,200,44,0.5)"; ctx.lineWidth=1; ctx.stroke();
          const fogG=ctx.createRadialGradient(fx,fy,0,fx,fy-20,30+10*Math.sin(t*1.2+fi));
          fogG.addColorStop(0,`rgba(20,120,20,${0.18+0.08*Math.sin(t*0.8+fi)})`); fogG.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=fogG; ctx.beginPath(); ctx.arc(fx,fy-10,36,0,Math.PI*2); ctx.fill();
        }
        // Zombie bar (left wall) - broken bottles, green drinks
        const barX=14, barY=H*0.32, barW2=70, barH2=120;
        ctx.fillStyle="#0a1a0a"; rr(barX,barY,barW2,barH2,4); ctx.fill();
        ctx.strokeStyle="rgba(44,180,44,0.5)"; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="#AAFFAA"; ctx.font="bold 6px monospace"; ctx.textAlign="center";
        ctx.fillText("☠ BAR", barX+barW2/2, barY+12);
        for (let bi=0;bi<4;bi++) {
          const bx2=barX+8+bi*16, by2=barY+22;
          const bc2=["rgba(44,220,44,0.8)","rgba(140,0,0,0.7)","rgba(44,160,44,0.7)","rgba(0,80,0,0.8)"][bi];
          ctx.fillStyle=bc2; ctx.beginPath(); ctx.ellipse(bx2, by2+8, 4, 12, bi%2*0.3, 0, Math.PI*2); ctx.fill();
        }
        // Speakers with green glow
        for (const [spx,spy] of [[W-56,H*0.35],[W-56,H*0.60]]) {
          ctx.fillStyle="#0a1a0a"; ctx.strokeStyle="rgba(44,180,44,0.5)"; ctx.lineWidth=1; rr(spx,spy,44,56,4); ctx.fill(); ctx.stroke();
          const spG=ctx.createRadialGradient(spx+22,spy+22,2,spx+22,spy+22,20);
          spG.addColorStop(0,`rgba(44,200,44,${0.25+0.15*Math.sin(t*4+spx)})`); spG.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=spG; ctx.beginPath(); ctx.arc(spx+22,spy+22,22,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#0a200a"; ctx.beginPath(); ctx.arc(spx+22,spy+22,16,0,Math.PI*2); ctx.fill();
          for (let ri=1;ri<=3;ri++) { ctx.strokeStyle=`rgba(44,200,44,${0.12*ri})`; ctx.lineWidth=0.8; ctx.beginPath(); ctx.arc(spx+22,spy+22,5*ri,0,Math.PI*2); ctx.stroke(); }
        }
        // DANGER strobes
        for (let li=0;li<3;li++) {
          const lx=W*0.3+li*(W*0.2), la=0.3+0.3*Math.sin(t*6+li*2.1);
          const lg=ctx.createRadialGradient(lx,topY+80,0,lx,topY+80,40);
          lg.addColorStop(0,`rgba(44,255,44,${la})`); lg.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=lg; ctx.beginPath(); ctx.arc(lx,topY+80,40,0,Math.PI*2); ctx.fill();
        }
      } else {
        // ── DEFAULT NIGHTCLUB (other maps) ──────────
        // ── Dance floor (center) ─────────────────────
      const tiles = 5;
      const tSize = Math.floor((W * 0.7) / tiles);
      const dfX = cx - (tSize * tiles) / 2,
        dfY = midY - tSize * 1.5;
      const dColors = ["#FF00AA", "#AA00FF", "#0044FF", "#00AAFF", "#FF4400"];
      for (let ty = 0; ty < 3; ty++)
        for (let tx = 0; tx < tiles; tx++) {
          const col = dColors[(tx + ty) % dColors.length];
          ctx.fillStyle = col + "55";
          ctx.strokeStyle = col + "AA";
          ctx.lineWidth = 1;
          ctx.fillRect(
            dfX + tx * tSize,
            dfY + ty * tSize,
            tSize - 1,
            tSize - 1,
          );
          ctx.strokeRect(
            dfX + tx * tSize,
            dfY + ty * tSize,
            tSize - 1,
            tSize - 1,
          );
          // Tile shine
          ctx.fillStyle = "rgba(255,255,255,0.08)";
          ctx.fillRect(
            dfX + tx * tSize + 2,
            dfY + ty * tSize + 2,
            tSize / 2,
            tSize / 2,
          );
        }
      // ── DJ booth (top) ───────────────────────────
      ctx.fillStyle = "#1a0a2a";
      ctx.strokeStyle = "#FF00CC";
      ctx.lineWidth = 2;
      rr(cx - 52, topY + 4, 104, 34, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2a1040";
      rr(cx - 46, topY + 6, 92, 22, 3);
      ctx.fill();
      for (let ki = 0; ki < 8; ki++) {
        ctx.fillStyle = ki % 2 === 0 ? "#FF00AA" : "#AA00FF";
        ctx.fillRect(cx - 42 + ki * 11, topY + 8, 9, 16);
      }
      ctx.fillStyle = "#FF00CC";
      ctx.shadowColor = "#FF00AA";
      ctx.shadowBlur = 10;
      ctx.fillRect(cx - 18, topY + 10, 36, 6);
      ctx.shadowBlur = 0;
      // ── Bar (left side) ──────────────────────────
      ctx.fillStyle = "#1a0a28";
      ctx.strokeStyle = "#8800AA";
      ctx.lineWidth = 1.5;
      rr(cx - W * 0.44, topY + 46, 62, 66, 4);
      ctx.fill();
      ctx.stroke();
      for (let bi = 0; bi < 4; bi++) {
        const bc = ["#FF00AA", "#AA00FF", "#4400FF", "#FF4488"][bi];
        ctx.fillStyle = bc + "AA";
        ctx.shadowColor = bc;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(
          cx - W * 0.44 + 8 + bi * 14,
          topY + 58,
          5,
          14,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      // ── Speakers (corners) ───────────────────────
      for (const [spx, spy] of [
        [cx - W * 0.4, topY + 4],
        [cx + W * 0.28, topY + 4],
      ]) {
        ctx.fillStyle = "#111";
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1;
        rr(spx, spy, 26, 38, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.arc(spx + 13, spy + 14, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#555";
        ctx.beginPath();
        ctx.arc(spx + 13, spy + 14, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#222";
        ctx.beginPath();
        ctx.arc(spx + 13, spy + 14, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      // ── Neon sign ────────────────────────────────
      ctx.fillStyle = "#FF00AA";
      ctx.shadowColor = "#FF00CC";
      ctx.shadowBlur = 18;
      ctx.font = "bold 14px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillText("NEON CLUB", cx, topY + 42);
      ctx.shadowBlur = 0;
      } // end default nightclub
    } else if (type === 9) {
      // HOSPITAL
      // ── Operating table (center) ─────────────────
      ctx.fillStyle = "#EEFFEE";
      ctx.strokeStyle = "#44AA44";
      ctx.lineWidth = 1.5;
      rr(cx - 34, midY - 16, 68, 32, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#CCEECC";
      ctx.fillRect(cx - 30, midY - 12, 60, 24);
      // Pillow
      ctx.fillStyle = "#FFFFFF";
      rr(cx - 24, midY - 14, 22, 14, 3);
      ctx.fill();
      // Heart monitor line
      ctx.strokeStyle = "#22CC44";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#22FF44";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(cx - 10, midY + 2);
      ctx.lineTo(cx - 4, midY + 2);
      ctx.lineTo(cx, midY - 10);
      ctx.lineTo(cx + 4, midY + 10);
      ctx.lineTo(cx + 8, midY + 2);
      ctx.lineTo(cx + 22, midY + 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // ── Medical shelves (left) ───────────────────
      ctx.fillStyle = "#EEEEFF";
      ctx.strokeStyle = "#AACCAA";
      ctx.lineWidth = 1;
      rr(cx - W * 0.44, topY + 4, 52, 84, 2);
      ctx.fill();
      ctx.stroke();
      const medColors = ["#FF4444", "#4444FF", "#44AA44", "#FFAA00"];
      for (let mi = 0; mi < 3; mi++) {
        ctx.fillStyle = "#DDEEEE";
        ctx.fillRect(cx - W * 0.44 + 2, topY + 4 + mi * 26 + 20, 48, 3);
        for (let pi = 0; pi < 3; pi++) {
          ctx.fillStyle = medColors[(mi + pi) % 4];
          ctx.fillRect(
            cx - W * 0.44 + 4 + pi * 14,
            topY + 4 + mi * 26 + 4,
            10,
            15,
          );
        }
      }
      // ── Heart monitor machine (right) ────────────
      ctx.fillStyle = "#1a2a1a";
      ctx.strokeStyle = "#22CC44";
      ctx.lineWidth = 1.5;
      rr(cx + W * 0.24, topY + 8, 52, 58, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#002200";
      ctx.fillRect(cx + W * 0.24 + 4, topY + 12, 44, 28);
      ctx.strokeStyle = "#22FF44";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#22FF44";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      const mx2 = cx + W * 0.24 + 4;
      ctx.moveTo(mx2, topY + 26);
      ctx.lineTo(mx2 + 8, topY + 26);
      ctx.lineTo(mx2 + 12, topY + 16);
      ctx.lineTo(mx2 + 16, topY + 36);
      ctx.lineTo(mx2 + 20, topY + 26);
      ctx.lineTo(mx2 + 44, topY + 26);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // ── Red cross on wall ─────────────────────────
      ctx.fillStyle = "#FF2222";
      ctx.shadowColor = "#FF4444";
      ctx.shadowBlur = 10;
      ctx.fillRect(cx + 4, topY + 4, 10, 28);
      ctx.fillRect(cx - 5, topY + 13, 28, 10);
      ctx.shadowBlur = 0;
    } else if (type === 10) {
      // GARAGE
      // ── Car lift (center) ─────────────────────────
      ctx.fillStyle = "#1a1a20";
      ctx.strokeStyle = "#555566";
      ctx.lineWidth = 2;
      rr(cx - 54, midY - 14, 108, 36, 3);
      ctx.fill();
      ctx.stroke();
      // Car silhouette on lift
      ctx.fillStyle = "#2a2a3a";
      ctx.strokeStyle = "#4a4a5a";
      ctx.lineWidth = 1;
      rr(cx - 42, midY - 10, 84, 20, 4);
      ctx.fill();
      ctx.stroke();
      rr(cx - 28, midY - 22, 56, 14, 6);
      ctx.fill();
      ctx.stroke();
      // Wheels
      for (const wx of [cx - 28, cx + 18]) {
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(wx, midY + 10, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#444";
        ctx.beginPath();
        ctx.arc(wx, midY + 10, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Lift hydraulics
      ctx.strokeStyle = "#666";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - 52, midY + 22);
      ctx.lineTo(cx - 52, midY + 38);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 52, midY + 22);
      ctx.lineTo(cx + 52, midY + 38);
      ctx.stroke();
      // ── Tool board (top wall) ─────────────────────
      ctx.fillStyle = "#2a2014";
      ctx.strokeStyle = "#6a5030";
      ctx.lineWidth = 1.5;
      rr(cx - 64, topY + 4, 128, 48, 2);
      ctx.fill();
      ctx.stroke();
      const toolColors = ["#888", "#AAAAFF", "#FF8800", "#CC4444", "#8888AA"];
      const tools = [
        ["🔧", cx - 52],
        [" ⚙", cx - 30],
        ["🔨", cx - 8],
        ["⛏", cx + 14],
        ["🔩", cx + 36],
      ];
      ctx.font = "14px serif";
      ctx.textAlign = "center";
      tools.forEach(([ic, tx2]) => ctx.fillText(ic, tx2, topY + 32));
      // ── Oil stain (floor) ─────────────────────────
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(cx, midY + 8, 44, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      // ── Parts shelf (right) ──────────────────────
      ctx.fillStyle = "#1a1810";
      ctx.strokeStyle = "#44403a";
      ctx.lineWidth = 1;
      rr(cx + W * 0.28, topY + 4, 38, 78, 2);
      ctx.fill();
      ctx.stroke();
      const pColors = ["#888888", "#AAAAFF", "#FF6600", "#CC4422"];
      for (let si = 0; si < 3; si++) {
        ctx.fillStyle = "#2a2818";
        ctx.fillRect(cx + W * 0.28 + 2, topY + 4 + si * 24 + 18, 34, 3);
        for (let pi = 0; pi < 2; pi++) {
          ctx.fillStyle = pColors[(si + pi) % 4];
          ctx.beginPath();
          ctx.arc(
            cx + W * 0.28 + 10 + pi * 16,
            topY + 4 + si * 24 + 8,
            7,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
    } else if (type === 11) {
      // BAR
      const isNeonCityBar = this.map?.config?.id === "neon_city";

      if (isNeonCityBar) {
        // ═══ NEON CITY CYBER LOUNGE ═══
        const t = performance.now() / 1000;

        // Neon City colors
        const CYAN = "#44EEFF";
        const PINK = "#FF4466";
        const GREEN = "#44FF88";
        const PURPLE = "#CC88FF";
        const GOLD = "#FFDD44";
        const ORANGE = "#FF8844";

        // ── Title Header ──
        ctx.save();
        ctx.font = "bold 16px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.shadowColor = PURPLE;
        ctx.shadowBlur = 22;
        ctx.fillText("🍸 NEON LOUNGE 🍸", cx, topY - 50);
        ctx.shadowBlur = 0;
        ctx.restore();

        // ── Divider line ──
        // ctx.save();
        // const divGrad = ctx.createLinearGradient(cx - W * 0.42, 0, cx + W * 0.42, 0);
        // divGrad.addColorStop(0, "rgba(204,136,255,0)");
        // divGrad.addColorStop(0.5, "rgba(204,136,255,0.9)");
        // divGrad.addColorStop(1, "rgba(204,136,255,0)");
        // ctx.strokeStyle = divGrad;
        // ctx.lineWidth = 2;
        // ctx.beginPath();
        // ctx.moveTo(cx - W * 0.42, topY + 8);
        // ctx.lineTo(cx + W * 0.42, topY + 8);
        // ctx.stroke();
        // ctx.restore();

        // ═══ BACK BAR SHELF (with bottles) ═══
        // ctx.save();
        // // Shelf
        // ctx.fillStyle = "#1a1218";
        // ctx.strokeStyle = PURPLE;
        // ctx.lineWidth = 2;
        // rr(cx - W * 0.38, topY + 12, W * 0.76, 8, 2);
        // ctx.fill();
        // ctx.stroke();
        // ctx.restore();

        // ═══ DRINK BOTTLES (Vibrant & Colorful) ═══
        const drinks = [
          { label: "🍷", glow: "#FF2266" },
          { label: "🥃", glow: "#FFAA44" },
          { label: "🍸", glow: CYAN },
          { label: "🍹", glow: "#FF66AA" },
          { label: "🍺", glow: GOLD },
          { label: "🍾", glow: "#88FF88" },
        ];

        for (let di = 0; di < drinks.length; di++) {
          const dx = cx - W * 0.32 + di * (W * 0.13);
          const dy = topY + 12;
          const drink = drinks[di];
          const pulse = Math.sin(t * 3 + di) * 0.3 + 0.7;

          ctx.save();
          // Glow background
          ctx.fillStyle = drink.glow + "40";
          ctx.beginPath();
          ctx.arc(dx, dy - 8, 18, 0, Math.PI * 2);
          ctx.fill();

          // Drink emoji (larger)
          ctx.font = "28px serif";
          ctx.textAlign = "center";
          ctx.shadowColor = drink.glow;
          ctx.shadowBlur = 15 * pulse;
          ctx.fillText(drink.label, dx, dy);
          ctx.shadowBlur = 0;
          ctx.restore();
        }

        // ═══ MAIN BAR COUNTER (lowered further) ═══
        ctx.save();
        const barPulse = Math.sin(t * 2) * 0.3 + 0.7;

        // Bar counter body (wooden look with neon trim)
        const barGrad = ctx.createLinearGradient(0, topY + 60, 0, topY + 95);
        barGrad.addColorStop(0, "#2a1a12");
        barGrad.addColorStop(0.5, "#1a100a");
        barGrad.addColorStop(1, "#0a0805");
        ctx.fillStyle = barGrad;
        rr(cx - W * 0.42, topY + 60, W * 0.84, 35, 6);
        ctx.fill();

        // Bar neon edge
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 3;
        ctx.shadowColor = CYAN;
        ctx.shadowBlur = 15 * barPulse;
        rr(cx - W * 0.42, topY + 60, W * 0.84, 35, 6);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Bar top surface highlight
        ctx.fillStyle = "rgba(68,238,255,0.1)";
        ctx.fillRect(cx - W * 0.4, topY + 62, W * 0.8, 6);
        ctx.restore();

        // ═══ BAR STOOLS (Realistic - lowered further) ═══
        for (let si = 0; si < 5; si++) {
          const sx = cx - W * 0.34 + si * ((W * 0.68) / 4);
          const sy = topY + 120;

          ctx.save();
          // Stool legs (4 legs)
          ctx.strokeStyle = "#333";
          ctx.lineWidth = 2;
          for (let leg = 0; leg < 4; leg++) {
            const legAngle = (leg * Math.PI) / 2 + Math.PI / 4;
            const legX = sx + Math.cos(legAngle) * 8;
            const legY = sy + 8 + Math.sin(legAngle) * 4;
            ctx.beginPath();
            ctx.moveTo(sx, sy + 5);
            ctx.lineTo(legX, legY + 12);
            ctx.stroke();
          }

          // Foot rest ring
          ctx.strokeStyle = GOLD;
          ctx.lineWidth = 2;
          ctx.shadowColor = GOLD;
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.ellipse(sx, sy + 12, 10, 4, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Seat cushion
          const cushionGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 14);
          cushionGrad.addColorStop(0, "#3a2020");
          cushionGrad.addColorStop(0.7, "#2a1515");
          cushionGrad.addColorStop(1, "#1a0a0a");
          ctx.fillStyle = cushionGrad;
          ctx.beginPath();
          ctx.ellipse(sx, sy, 14, 8, 0, 0, Math.PI * 2);
          ctx.fill();

          // Cushion highlight
          ctx.fillStyle = "rgba(255,100,100,0.2)";
          ctx.beginPath();
          ctx.ellipse(sx - 3, sy - 2, 6, 3, -0.3, 0, Math.PI * 2);
          ctx.fill();

          // Cushion border
          ctx.strokeStyle = PINK;
          ctx.lineWidth = 2;
          ctx.shadowColor = PINK;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.ellipse(sx, sy, 14, 8, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.restore();
        }

        // ═══ PATRONS SITTING AT BAR (with facial features) ═══
        // Patron 1 (on stool 1) - Male
        ctx.save();
        const p1x = cx - W * 0.34 + 1 * ((W * 0.68) / 4);
        const p1y = topY + 103;

        // Body
        ctx.fillStyle = "#2255BB";
        rr(p1x - 10, p1y - 20, 20, 24, 5);
        ctx.fill();
        // Shirt collar
        ctx.fillStyle = "#1144AA";
        ctx.beginPath();
        ctx.moveTo(p1x - 5, p1y - 20);
        ctx.lineTo(p1x, p1y - 15);
        ctx.lineTo(p1x + 5, p1y - 20);
        ctx.fill();

        // Neck
        ctx.fillStyle = "#DDBB99";
        ctx.fillRect(p1x - 3, p1y - 24, 6, 6);

        // Head
        ctx.fillStyle = "#EECCA8";
        ctx.beginPath();
        ctx.arc(p1x, p1y - 32, 10, 0, Math.PI * 2);
        ctx.fill();

        // Hair
        ctx.fillStyle = "#332211";
        ctx.beginPath();
        ctx.ellipse(p1x, p1y - 38, 9, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(p1x - 9, p1y - 36, 18, 4);

        // Eyes
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.ellipse(p1x - 4, p1y - 33, 3, 2, 0, 0, Math.PI * 2);
        ctx.ellipse(p1x + 4, p1y - 33, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#2244AA";
        ctx.beginPath();
        ctx.arc(p1x - 4, p1y - 33, 1.5, 0, Math.PI * 2);
        ctx.arc(p1x + 4, p1y - 33, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Eyebrows
        ctx.strokeStyle = "#332211";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p1x - 6, p1y - 36);
        ctx.lineTo(p1x - 2, p1y - 37);
        ctx.moveTo(p1x + 2, p1y - 37);
        ctx.lineTo(p1x + 6, p1y - 36);
        ctx.stroke();

        // Nose
        ctx.fillStyle = "#DDAA88";
        ctx.beginPath();
        ctx.moveTo(p1x, p1y - 32);
        ctx.lineTo(p1x - 2, p1y - 28);
        ctx.lineTo(p1x + 2, p1y - 28);
        ctx.fill();

        // Smile
        ctx.strokeStyle = "#AA6644";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p1x, p1y - 26, 4, 0.2, Math.PI - 0.2);
        ctx.stroke();

        // Arm holding drink
        ctx.fillStyle = "#2255BB";
        ctx.fillRect(p1x + 8, p1y - 16, 14, 6);
        ctx.fillStyle = "#EECCA8";
        ctx.beginPath();
        ctx.arc(p1x + 22, p1y - 13, 5, 0, Math.PI * 2);
        ctx.fill();

        // Drink in hand (with glow)
        ctx.font = "18px serif";
        ctx.shadowColor = GOLD;
        ctx.shadowBlur = 10;
        ctx.fillText("🍺", p1x + 28, p1y - 6);
        ctx.shadowBlur = 0;
        ctx.restore();

        // Patron 2 (on stool 3) - Female
        ctx.save();
        const p2x = cx - W * 0.34 + 3 * ((W * 0.68) / 4);
        const p2y = topY + 103;

        // Body (dress)
        ctx.fillStyle = "#CC2266";
        rr(p2x - 10, p2y - 20, 20, 24, 5);
        ctx.fill();
        // Dress neckline
        ctx.fillStyle = "#EECCA8";
        ctx.beginPath();
        ctx.ellipse(p2x, p2y - 20, 6, 3, 0, 0, Math.PI);
        ctx.fill();

        // Neck
        ctx.fillStyle = "#EECCA8";
        ctx.fillRect(p2x - 3, p2y - 24, 6, 5);

        // Head
        ctx.fillStyle = "#FFDDBB";
        ctx.beginPath();
        ctx.arc(p2x, p2y - 32, 10, 0, Math.PI * 2);
        ctx.fill();

        // Hair (long flowing)
        ctx.fillStyle = "#AA5522";
        ctx.beginPath();
        ctx.ellipse(p2x, p2y - 36, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(p2x - 11, p2y - 34, 6, 20);
        ctx.fillRect(p2x + 5, p2y - 34, 6, 20);

        // Eyes (with eyelashes)
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.ellipse(p2x - 4, p2y - 33, 3, 2.5, 0, 0, Math.PI * 2);
        ctx.ellipse(p2x + 4, p2y - 33, 3, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#228844";
        ctx.beginPath();
        ctx.arc(p2x - 4, p2y - 33, 1.5, 0, Math.PI * 2);
        ctx.arc(p2x + 4, p2y - 33, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Eyelashes
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p2x - 6, p2y - 35);
        ctx.lineTo(p2x - 7, p2y - 37);
        ctx.moveTo(p2x + 6, p2y - 35);
        ctx.lineTo(p2x + 7, p2y - 37);
        ctx.stroke();

        // Eyebrows (thin)
        ctx.strokeStyle = "#AA5522";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p2x - 4, p2y - 38, 4, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p2x + 4, p2y - 38, 4, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();

        // Nose
        ctx.fillStyle = "#EEBB99";
        ctx.beginPath();
        ctx.moveTo(p2x, p2y - 32);
        ctx.lineTo(p2x - 1.5, p2y - 28);
        ctx.lineTo(p2x + 1.5, p2y - 28);
        ctx.fill();

        // Lips (with lipstick)
        ctx.fillStyle = "#EE4466";
        ctx.beginPath();
        ctx.ellipse(p2x, p2y - 25, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Arm holding drink
        ctx.fillStyle = "#CC2266";
        ctx.fillRect(p2x - 22, p2y - 16, 14, 6);
        ctx.fillStyle = "#FFDDBB";
        ctx.beginPath();
        ctx.arc(p2x - 22, p2y - 13, 5, 0, Math.PI * 2);
        ctx.fill();

        // Drink in hand (with glow)
        ctx.font = "18px serif";
        ctx.shadowColor = PINK;
        ctx.shadowBlur = 10;
        ctx.fillText("🍹", p2x - 32, p2y - 6);
        ctx.shadowBlur = 0;
        ctx.restore();

        // ═══ SERVICE COUNTER (for bartender - lowered further) ═══
        ctx.save();
        const counterPulse = Math.sin(t * 2.5) * 0.3 + 0.7;
        const svcX = cx - 60;
        const svcY = topY + 165;
        const svcW = 120;
        const svcH = 32;

        // Counter shadow
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(svcX + 4, svcY + svcH + 2, svcW, 5);

        // Counter body
        const svcGrad = ctx.createLinearGradient(svcX, svcY, svcX, svcY + svcH);
        svcGrad.addColorStop(0, "#1a1a2e");
        svcGrad.addColorStop(1, "#0a0a14");
        ctx.fillStyle = svcGrad;
        rr(svcX, svcY, svcW, svcH, 6);
        ctx.fill();

        // Counter border
        ctx.strokeStyle = PURPLE;
        ctx.lineWidth = 3;
        ctx.shadowColor = PURPLE;
        ctx.shadowBlur = 12 * counterPulse;
        rr(svcX, svcY, svcW, svcH, 6);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Counter top edge
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 2;
        ctx.shadowColor = CYAN;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(svcX + 8, svcY + 3);
        ctx.lineTo(svcX + svcW - 8, svcY + 3);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Drinks on counter
        ctx.font = "18px serif";
        ctx.textAlign = "center";
        ctx.shadowColor = CYAN;
        ctx.shadowBlur = 6;
        ctx.fillText("🍸", svcX + 25, svcY + 22);
        ctx.fillText("🍹", svcX + 60, svcY + 22);
        ctx.fillText("🥃", svcX + 95, svcY + 22);
        ctx.shadowBlur = 0;

        // "SERVICE" text
        ctx.font = "bold 8px Orbitron, monospace";
        ctx.fillStyle = GOLD;
        ctx.shadowColor = GOLD;
        ctx.shadowBlur = 6;
        ctx.fillText("★ SERVICE ★", cx, svcY + svcH + 14);
        ctx.shadowBlur = 0;
        ctx.restore();

        // ═══ POOL TABLE (Improved) ═══
        ctx.save();
        const tableX = cx - W * 0.26;
        const tableY = midY + 55;
        const tableW = W * 0.52;
        const tableH = H * 0.26;

        // Table wooden frame
        ctx.fillStyle = "#2a1a0a";
        ctx.strokeStyle = "#4a3020";
        ctx.lineWidth = 6;
        rr(tableX - 8, tableY - 8, tableW + 16, tableH + 16, 10);
        ctx.fill();
        ctx.stroke();

        // Table inner frame
        ctx.fillStyle = "#1a3318";
        ctx.strokeStyle = GREEN;
        ctx.lineWidth = 3;
        ctx.shadowColor = GREEN;
        ctx.shadowBlur = 12;
        rr(tableX, tableY, tableW, tableH, 6);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Felt surface
        const feltGrad = ctx.createLinearGradient(
          tableX,
          tableY,
          tableX + tableW,
          tableY + tableH,
        );
        feltGrad.addColorStop(0, "#0d4422");
        feltGrad.addColorStop(0.5, "#0f5528");
        feltGrad.addColorStop(1, "#0d4422");
        ctx.fillStyle = feltGrad;
        rr(tableX + 4, tableY + 4, tableW - 8, tableH - 8, 4);
        ctx.fill();

        // Pockets (6 pockets)
        const pocketPositions = [
          [tableX, tableY],
          [tableX + tableW / 2, tableY - 4],
          [tableX + tableW, tableY],
          [tableX, tableY + tableH],
          [tableX + tableW / 2, tableY + tableH + 4],
          [tableX + tableW, tableY + tableH],
        ];
        for (const [px, py] of pocketPositions) {
          ctx.fillStyle = "#000";
          ctx.beginPath();
          ctx.arc(px, py, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#3a2a1a";
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // ═══ POOL BALLS IN TRIANGLE ═══
        const ballRadius = 7;
        const triangleX = tableX + tableW * 0.7;
        const triangleY = tableY + tableH / 2;
        const ballSpacing = ballRadius * 2 + 2;

        // Triangle formation (5 rows: 1-2-3-4-5 = 15 balls)
        const ballColors2 = [
          GOLD, // Row 1: 1 ball
          PINK,
          CYAN, // Row 2: 2 balls
          GREEN,
          "#111",
          ORANGE, // Row 3: 3 balls (black 8 in center)
          PURPLE,
          "#FF6666",
          "#6666FF",
          GOLD, // Row 4: 4 balls
          PINK,
          CYAN,
          GREEN,
          ORANGE,
          PURPLE, // Row 5: 5 balls
        ];

        let ballIndex = 0;
        for (let row = 0; row < 5; row++) {
          const ballsInRow = row + 1;
          const rowX = triangleX + row * ballSpacing * 0.9;
          const rowStartY = triangleY - ((ballsInRow - 1) * ballSpacing) / 2;

          for (let b = 0; b < ballsInRow; b++) {
            const bx = rowX;
            const by = rowStartY + b * ballSpacing;

            // Ball shadow
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.beginPath();
            ctx.arc(bx + 2, by + 2, ballRadius, 0, Math.PI * 2);
            ctx.fill();

            // Ball
            const ballCol = ballColors2[ballIndex] || GOLD;
            const ballGrad = ctx.createRadialGradient(
              bx - 2,
              by - 2,
              0,
              bx,
              by,
              ballRadius,
            );
            ballGrad.addColorStop(0, "#fff");
            ballGrad.addColorStop(0.3, ballCol);
            ballGrad.addColorStop(1, ballCol === "#111" ? "#000" : ballCol);
            ctx.fillStyle = ballGrad;
            ctx.beginPath();
            ctx.arc(bx, by, ballRadius, 0, Math.PI * 2);
            ctx.fill();

            // Ball shine
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.beginPath();
            ctx.arc(bx - 2, by - 2, 2, 0, Math.PI * 2);
            ctx.fill();

            ballIndex++;
          }
        }

        // Cue ball
        const cueBallX = tableX + tableW * 0.25;
        const cueBallY = tableY + tableH / 2;
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.arc(cueBallX + 2, cueBallY + 2, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        const cueGrad = ctx.createRadialGradient(
          cueBallX - 2,
          cueBallY - 2,
          0,
          cueBallX,
          cueBallY,
          ballRadius,
        );
        cueGrad.addColorStop(0, "#fff");
        cueGrad.addColorStop(0.5, "#f8f8ff");
        cueGrad.addColorStop(1, "#e0e0e8");
        ctx.fillStyle = cueGrad;
        ctx.beginPath();
        ctx.arc(cueBallX, cueBallY, ballRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // ═══ CYBER JUKEBOX (top right corner) ═══
        ctx.save();
        const jukeX = cx + W * 0.38;
        const jukeY = topY - 35;

        // Jukebox body
        ctx.fillStyle = "#0a0812";
        ctx.strokeStyle = PINK;
        ctx.lineWidth = 3;
        ctx.shadowColor = PINK;
        ctx.shadowBlur = 15;
        rr(jukeX, jukeY, 50, 75, 8);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Jukebox screen
        ctx.fillStyle = "#050508";
        rr(jukeX + 6, jukeY + 8, 38, 28, 4);
        ctx.fill();

        // Animated music bars
        for (let mb = 0; mb < 5; mb++) {
          const mbHeight = 8 + Math.sin(t * 8 + mb * 1.5) * 8;
          const mbColor = [CYAN, PINK, GREEN, GOLD, PURPLE][mb];
          ctx.fillStyle = mbColor;
          ctx.shadowColor = mbColor;
          ctx.shadowBlur = 6;
          ctx.fillRect(jukeX + 10 + mb * 7, jukeY + 28 - mbHeight, 5, mbHeight);
        }
        ctx.shadowBlur = 0;

        // Speaker grille
        ctx.fillStyle = "#1a1a25";
        rr(jukeX + 8, jukeY + 38, 34, 30, 3);
        ctx.fill();
        for (let sg = 0; sg < 4; sg++) {
          ctx.strokeStyle = `rgba(204,136,255,${0.3 + Math.sin(t * 4) * 0.3})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(jukeX + 25, jukeY + 53, 4 + sg * 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        // "JUKEBOX" label
        ctx.font = "bold 7px Orbitron, monospace";
        ctx.fillStyle = PINK;
        ctx.shadowColor = PINK;
        ctx.shadowBlur = 8;
        ctx.textAlign = "center";
        ctx.fillText("♫ JUKEBOX", jukeX + 25, jukeY + 80);
        ctx.shadowBlur = 0;
        ctx.restore();

        // ═══ AMBIENT PARTICLES ═══
        ctx.save();
        for (let pi = 0; pi < 12; pi++) {
          const px = cx - W * 0.4 + ((t * 10 + pi * 70) % (W * 0.8));
          const py =
            topY + 30 + Math.sin(t * 0.6 + pi * 0.7) * 50 + ((pi * 20) % 80);
          const alpha = Math.sin(t * 2 + pi) * 0.3 + 0.4;
          const colors = [CYAN, PINK, PURPLE, GOLD];
          ctx.fillStyle =
            colors[pi % 4].slice(0, 7) +
            Math.floor(alpha * 255)
              .toString(16)
              .padStart(2, "0");
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (!!this.map?.config?.zombie) {
        // ═══ ZOMBIE: ZOMBIE TAVERN ═══
        const t=performance.now()/1000;
        // Sign
        ctx.fillStyle="rgba(40,0,0,0.9)"; rr(W/2-100,room.S-22,200,26,5); ctx.fill();
        ctx.strokeStyle=`rgba(200,30,30,${0.6+0.3*Math.sin(t*1.8)})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#FFAAAA"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
        ctx.fillText("☠  ZOMBIE TAVERN  ☠", W/2, room.S-9);
        // Bar counter (top) — cracked/broken
        ctx.fillStyle="#1a0800"; rr(cx-W*0.44,topY+6,W*0.88,24,3); ctx.fill();
        ctx.strokeStyle="rgba(120,40,0,0.5)"; ctx.lineWidth=1.5; ctx.stroke();
        ctx.strokeStyle="rgba(0,0,0,0.4)"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(cx-80,topY+6); ctx.lineTo(cx-60,topY+30); ctx.stroke();
        // Broken bottles on bar
        const bColors=["rgba(44,160,44,0.8)","rgba(140,0,0,0.7)","rgba(44,100,44,0.75)","rgba(80,120,0,0.7)","rgba(200,140,0,0.6)"];
        for (let bi=0;bi<7;bi++) {
          const bx=cx-W*0.4+bi*W*0.13, by=topY+6;
          const broken=bi%3===1;
          ctx.fillStyle=bColors[bi%bColors.length];
          if (broken) { // knocked over
            ctx.save(); ctx.translate(bx+10,by+16); ctx.rotate(1.5);
            ctx.beginPath(); ctx.ellipse(0,0,4,12,0,0,Math.PI*2); ctx.fill(); ctx.restore();
            // spill
            ctx.fillStyle="rgba(44,160,44,0.25)"; ctx.beginPath(); ctx.ellipse(bx+16,by+20,12,5,-0.3,0,Math.PI*2); ctx.fill();
          } else {
            ctx.beginPath(); ctx.ellipse(bx+5,by+12,4,12,0,0,Math.PI*2); ctx.fill();
          }
        }
        // Bar stools (overturned)
        for (let si=0;si<4;si++) {
          const stx=cx-W*0.32+si*W*0.22, sty=topY+40;
          ctx.save(); ctx.translate(stx,sty); ctx.rotate(si%2===0?0.5:-0.4);
          ctx.fillStyle="#160800"; rr(-10,-10,20,20,10); ctx.fill();
          ctx.strokeStyle="rgba(80,40,0,0.4)"; ctx.lineWidth=1; ctx.stroke();
          ctx.fillStyle="#0d0500"; ctx.fillRect(-2,-10,-0,18); // leg
          ctx.restore();
        }
        // Pool table (center, cracked felt)
        ctx.fillStyle="#081a08"; rr(cx-70,midY-30,140,60,5); ctx.fill();
        ctx.strokeStyle="rgba(44,100,44,0.5)"; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle="rgba(20,80,20,0.6)"; rr(cx-62,midY-22,124,44,3); ctx.fill();
        ctx.strokeStyle="rgba(0,30,0,0.5)"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(cx-20,midY-22); ctx.lineTo(cx+30,midY+22); ctx.stroke(); // crack
        // Bloodied pool balls
        for (const [bx3,by3] of [[cx-30,midY-5],[cx,midY+5],[cx+25,midY-8],[cx-10,midY+8]]) {
          ctx.fillStyle="rgba(140,8,8,0.8)"; ctx.beginPath(); ctx.arc(bx3,by3,6,0,Math.PI*2); ctx.fill();
        }
        // Wanted posters/survivor notes (right wall)
        ctx.fillStyle="rgba(160,120,20,0.7)"; rr(W-70,H*0.35,52,70,3); ctx.fill();
        ctx.strokeStyle="rgba(200,160,40,0.4)"; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="rgba(20,8,0,0.85)"; ctx.font="bold 5px monospace"; ctx.textAlign="center";
        ctx.fillText("WANTED:", W-44, H*0.35+14); ctx.fillText("ZOMBIES", W-44, H*0.35+24);
        ctx.fillStyle="rgba(140,0,0,0.7)"; ctx.font="5px monospace";
        ctx.fillText("SHOOT ON SIGHT", W-44, H*0.35+42);
        // ── Corpse 1: patron slumped at bar ──
        drawCorpse(cx-W*0.22, topY+52, 0.25, '#1a0d06', 0.55);
        // ── Corpse 2: bartender collapsed behind counter ──
        drawCorpse(cx+W*0.12, topY+16, Math.PI+0.3, '#140a04', 0.38);
        // ── Corpse 3: body face-down center floor ──
        drawCorpse(cx-W*0.05, midY+22, 0.85, '#1a1008', 0.6);
        // ── Corpse 4: near pool table ──
        drawCorpse(cx+W*0.28, midY+30, -0.55, '#180808', 0.45);
        // ── Blood trails from corpses to center ──
        for (let tri=0;tri<3;tri++) {
          const [tx1,ty1,tx2,ty2]=[
            [cx-W*0.22,topY+52,cx-W*0.12,midY+10],
            [cx+W*0.12,topY+16,cx,midY-10],
            [cx+W*0.28,midY+30,cx+W*0.1,midY+15]
          ][tri];
          const trG=ctx.createLinearGradient(tx1,ty1,tx2,ty2);
          trG.addColorStop(0,`rgba(110,0,0,0.45)`); trG.addColorStop(1,'rgba(80,0,0,0)');
          ctx.strokeStyle=trG; ctx.lineWidth=3+tri*0.8;
          ctx.beginPath(); ctx.moveTo(tx1,ty1); ctx.lineTo(tx2,ty2); ctx.stroke();
        }
        // ── Overturned chairs scattered around ──
        for (let ci2=0;ci2<4;ci2++) {
          const chx=cx-W*0.38+ci2*W*0.25, chy=midY-10+ci2*22;
          ctx.save(); ctx.translate(chx,chy); ctx.rotate(ci2*0.55-0.6);
          ctx.fillStyle="#160400"; rr(-8,-8,16,16,3); ctx.fill();
          ctx.strokeStyle="rgba(70,20,0,0.4)"; ctx.lineWidth=1; ctx.stroke();
          ctx.fillStyle="#0d0200";
          ctx.fillRect(-1,-8,2,14); // leg
          ctx.fillRect(-8,-1,14,2); // crossbar
          ctx.restore();
        }
        // ── Broken glass shards near bar ──
        for (let gi=0;gi<10;gi++) {
          const gx=cx-W*0.38+gi*W*0.085, gy=topY+34+(gi%3)*7;
          ctx.fillStyle=`rgba(160,200,160,${0.18+gi%3*0.08})`;
          ctx.save(); ctx.translate(gx,gy); ctx.rotate(gi*0.65);
          ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(3.5,2); ctx.lineTo(-3,2.5); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        // ── Overturned table (bottom area) ──
        ctx.save(); ctx.translate(cx-W*0.15, H*0.78); ctx.rotate(0.2);
        ctx.fillStyle="#140600"; rr(-40,-8,80,16,3); ctx.fill();
        ctx.strokeStyle="rgba(80,30,0,0.35)"; ctx.lineWidth=1; ctx.stroke();
        ctx.restore();
      } else if (!this.map?.config?.galactica) {
        // ── Default Bar (other maps) ───────────────────
        ctx.fillStyle = "#2a1508";
        ctx.strokeStyle = "#7a4520";
        ctx.lineWidth = 2;
        rr(cx - W * 0.44, topY + 4, W * 0.88, 28, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(255,160,80,0.15)";
        ctx.fillRect(cx - W * 0.42, topY + 6, W * 0.84, 10);
        // Bar stools
        for (let si = 0; si < 5; si++) {
          const sx = cx - W * 0.36 + si * ((W * 0.72) / 4);
          ctx.fillStyle = "#8B4513";
          ctx.strokeStyle = "#A0522D";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(sx, topY + 44, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = "#6B3410";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx, topY + 44);
          ctx.lineTo(sx, topY + 38);
          ctx.stroke();
        }
        // Bottles behind bar
        const btColors = [
          "#884422",
          "#225588",
          "#226622",
          "#AA8822",
          "#882244",
        ];
        for (let bi = 0; bi < 7; bi++) {
          const bx3 = cx - W * 0.38 + bi * ((W * 0.76) / 6);
          ctx.fillStyle = btColors[bi % btColors.length];
          ctx.strokeStyle = "#CCAA55";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.roundRect(bx3 - 4, topY - 18, 8, 20, [2, 2, 0, 0]);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#CCAA55BB";
          ctx.beginPath();
          ctx.roundRect(bx3 - 2, topY - 6, 4, 4, 1);
          ctx.fill();
        }
        // ── Pool table (center) ───────────────────────
        ctx.fillStyle = "#1a5522";
        ctx.strokeStyle = "#3a7744";
        ctx.lineWidth = 2;
        rr(cx - W * 0.22, midY - 10, W * 0.44, W * 0.28, 4);
        ctx.fill();
        ctx.stroke();
        // Felt detail
        ctx.fillStyle = "#225533";
        ctx.fillRect(cx - W * 0.2, midY - 8, W * 0.4, W * 0.24);
        // Pockets
        for (const [px2, py2] of [
          [cx - W * 0.22, midY - 10],
          [cx, midY - 10],
          [cx + W * 0.22, midY - 10],
          [cx - W * 0.22, midY - 10 + W * 0.28],
          [cx, midY - 10 + W * 0.28],
          [cx + W * 0.22, midY - 10 + W * 0.28],
        ]) {
          ctx.fillStyle = "#111";
          ctx.beginPath();
          ctx.arc(px2, py2, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        // Balls
        const bColors2 = [
          "#FFDD00",
          "#FF3300",
          "#0033FF",
          "#FF6600",
          "#880088",
        ];
        for (let bi = 0; bi < 5; bi++) {
          ctx.fillStyle = bColors2[bi];
          ctx.shadowColor = bColors2[bi];
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(cx - W * 0.12 + bi * W * 0.06, midY, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        // Jukebox (right wall)
        ctx.fillStyle = "#220a10";
        ctx.strokeStyle = "#FF4466";
        ctx.lineWidth = 1.5;
        rr(cx + W * 0.3, topY + 8, 36, 62, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#440a18";
        rr(cx + W * 0.3 + 4, topY + 12, 28, 20, 2);
        ctx.fill();
        ctx.fillStyle = "#FF4466";
        ctx.shadowColor = "#FF2244";
        ctx.shadowBlur = 8;
        ctx.fillRect(cx + W * 0.3 + 8, topY + 14, 20, 6);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#FFAACC";
        ctx.font = "bold 5px monospace";
        ctx.textAlign = "center";
        ctx.fillText("JUKEBOX", cx + W * 0.3 + 18, topY + 44);
      } else {
        // ═══ GALACTICA: NEBULA CANTINA ═══
        const t = performance.now() / 1000;
        const PURP = "#AA88FF",
          GOLD = "#FFDD55",
          CYAN = "#55DDFF",
          PINK = "#FF55CC";

        // Title
        ctx.save();
        ctx.font = "bold 16px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.shadowColor = PURP;
        ctx.shadowBlur = 22;
        ctx.fillText("◈ NEBULA CANTINA ◈", cx, topY - 50);
        ctx.shadowBlur = 0;
        ctx.restore();

        // ── COSMIC BAR COUNTER (curved top) ──
        ctx.fillStyle = "#0c0420";
        ctx.strokeStyle = PURP;
        ctx.lineWidth = 2;
        ctx.shadowColor = PURP;
        ctx.shadowBlur = 14;
        rr(cx - W * 0.38, topY + 6, W * 0.76, 28, 6);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Counter top surface glow
        const ctGrad = ctx.createLinearGradient(
          cx - W * 0.38,
          0,
          cx + W * 0.38,
          0,
        );
        ctGrad.addColorStop(0, "rgba(170,136,255,0)");
        ctGrad.addColorStop(0.5, "rgba(170,136,255,0.4)");
        ctGrad.addColorStop(1, "rgba(170,136,255,0)");
        ctx.fillStyle = ctGrad;
        ctx.fillRect(cx - W * 0.38, topY + 6, W * 0.76, 5);

        // ── ALIEN DRINK BOTTLES (on counter shelf) ──
        const drinkData = [
          { col: PURP, symbol: "◈", label: "VOID" },
          { col: CYAN, symbol: "⬡", label: "CRYO" },
          { col: PINK, symbol: "✦", label: "NOVA" },
          { col: GOLD, symbol: "⬢", label: "SOLAR" },
          { col: "#88FFCC", symbol: "◎", label: "NEBULA" },
        ];
        for (let i = 0; i < drinkData.length; i++) {
          const dd = drinkData[i];
          const bx = cx - W * 0.3 + i * (W * 0.15);
          const by = topY + 2;
          const lp = Math.sin(t * 1.5 + i * 1.2) * 0.3 + 0.7;
          // Bottle body — tall hexagonal vial
          ctx.fillStyle = dd.col + "30";
          ctx.strokeStyle = dd.col;
          ctx.lineWidth = 1.5;
          ctx.shadowColor = dd.col;
          ctx.shadowBlur = 8 * lp;
          ctx.beginPath();
          ctx.moveTo(bx - 6, by + 36);
          ctx.lineTo(bx - 8, by + 28);
          ctx.lineTo(bx - 5, by + 8);
          ctx.lineTo(bx - 3, by);
          ctx.lineTo(bx + 3, by);
          ctx.lineTo(bx + 5, by + 8);
          ctx.lineTo(bx + 8, by + 28);
          ctx.lineTo(bx + 6, by + 36);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
          // Liquid fill
          ctx.fillStyle = dd.col + "70";
          ctx.beginPath();
          ctx.moveTo(bx - 5.5, by + 36);
          ctx.lineTo(bx - 7, by + 28);
          ctx.lineTo(bx - 4, by + (8 + (1 - lp) * 16));
          ctx.lineTo(bx + 4, by + (8 + (1 - lp) * 16));
          ctx.lineTo(bx + 7, by + 28);
          ctx.lineTo(bx + 5.5, by + 36);
          ctx.closePath();
          ctx.fill();
          // Symbol
          ctx.fillStyle = "#FFF";
          ctx.shadowColor = dd.col;
          ctx.shadowBlur = 5;
          ctx.font = "8px serif";
          ctx.textAlign = "center";
          ctx.fillText(dd.symbol, bx, by + 22);
          ctx.shadowBlur = 0;
          // Label
          ctx.fillStyle = dd.col;
          ctx.font = "5px Orbitron, monospace";
          ctx.fillText(dd.label, bx, by + 42);
        }

        // ── BAR STOOLS along counter ──────────────────
        for (let si = 0; si < 5; si++) {
          const bsx = cx - W * 0.3 + si * (W * 0.15);
          const bsy = topY + 56;
          // Stool legs
          ctx.strokeStyle = PURP + "77"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(bsx - 6, bsy + 6); ctx.lineTo(bsx - 8, bsy + 20); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bsx + 6, bsy + 6); ctx.lineTo(bsx + 8, bsy + 20); ctx.stroke();
          // Cross bar
          ctx.beginPath(); ctx.moveTo(bsx - 6, bsy + 14); ctx.lineTo(bsx + 6, bsy + 14); ctx.stroke();
          // Seat
          ctx.fillStyle = "#1a0040"; ctx.strokeStyle = PURP; ctx.lineWidth = 1.5;
          ctx.shadowColor = PURP; ctx.shadowBlur = 5;
          ctx.beginPath(); ctx.ellipse(bsx, bsy, 11, 6, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
          ctx.shadowBlur = 0;
        }
        // ── BAR PATRONS on stools ─────────────────────
        const barPatrons = [
          { x: cx - W * 0.3 + 0 * (W * 0.15), skin: "#FFDDBB", hair: "#1a1a2a", col: PURP, gender: "m", drink: PURP },
          { x: cx - W * 0.3 + 1 * (W * 0.15), skin: "#F0C080", hair: "#AA5522", col: PINK, gender: "f", drink: PINK },
          { x: cx - W * 0.3 + 2 * (W * 0.15), skin: "#D4956A", hair: "#2a1a00", col: CYAN, gender: "m", drink: CYAN },
          { x: cx - W * 0.3 + 3 * (W * 0.15), skin: "#EECCAA", hair: "#1a002a", col: GOLD, gender: "f", drink: GOLD },
          { x: cx - W * 0.3 + 4 * (W * 0.15), skin: "#DDBB99", hair: "#332211", col: "#88FFCC", gender: "m", drink: "#88FFCC" },
        ];
        for (const bp of barPatrons) {
          const bpx = bp.x, bpy = topY + 36;
          ctx.save();
          // Body
          ctx.fillStyle = bp.col + "CC"; ctx.shadowColor = bp.col; ctx.shadowBlur = 5;
          rr(bpx - 8, bpy - 4, 16, 18, 3); ctx.fill(); ctx.shadowBlur = 0;
          if (bp.gender === "f") {
            ctx.fillStyle = bp.col + "55";
            ctx.beginPath(); ctx.moveTo(bpx-8,bpy+10); ctx.lineTo(bpx-10,bpy+20); ctx.lineTo(bpx+10,bpy+20); ctx.lineTo(bpx+8,bpy+10); ctx.closePath(); ctx.fill();
          }
          // Neck
          ctx.fillStyle = bp.skin; ctx.fillRect(bpx-2, bpy-6, 4, 4);
          // Head
          ctx.beginPath(); ctx.arc(bpx, bpy-13, 9, 0, Math.PI*2); ctx.fill();
          // Hair
          ctx.fillStyle = bp.hair;
          if (bp.gender === "f") {
            ctx.beginPath(); ctx.arc(bpx, bpy-16, 8, Math.PI, 0); ctx.fill();
            ctx.fillRect(bpx-8, bpy-18, 4, 12); ctx.fillRect(bpx+4, bpy-18, 4, 12);
          } else {
            ctx.fillRect(bpx-7, bpy-19, 14, 7);
          }
          // Eyes
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.ellipse(bpx-3.5, bpy-14, 2.2, 1.8, 0, 0, Math.PI*2);
          ctx.ellipse(bpx+3.5, bpy-14, 2.2, 1.8, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = bp.col; ctx.shadowColor = bp.col; ctx.shadowBlur = 3;
          ctx.beginPath(); ctx.arc(bpx-3.5, bpy-14, 1.2, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(bpx+3.5, bpy-14, 1.2, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#000";
          ctx.beginPath(); ctx.arc(bpx-3.5, bpy-14, 0.5, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(bpx+3.5, bpy-14, 0.5, 0, Math.PI*2); ctx.fill();
          // Nose
          ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.arc(bpx, bpy-11, 1.2, 0, Math.PI*2); ctx.fill();
          // Mouth
          ctx.strokeStyle = bp.gender==="f" ? "#EE4466" : "#AA6644"; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(bpx, bpy-8.5, 3, 0.1, Math.PI-0.1); ctx.stroke();
          // Arm holding drink at counter
          ctx.strokeStyle = bp.skin; ctx.lineWidth = 3; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(bpx+8, bpy+2); ctx.lineTo(bpx+16, bpy-4); ctx.stroke();
          ctx.lineCap = "butt";
          // Drink
          ctx.fillStyle = bp.drink + "50"; ctx.strokeStyle = bp.drink; ctx.lineWidth = 1;
          ctx.shadowColor = bp.drink; ctx.shadowBlur = 7;
          ctx.beginPath();
          ctx.moveTo(bpx+13, bpy-14); ctx.lineTo(bpx+11, bpy-6); ctx.lineTo(bpx+20, bpy-6); ctx.lineTo(bpx+18, bpy-14);
          ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
          ctx.restore();
        }

        // ── 3 CIRCULAR HOVER TABLES with alien seating ──
        const tableData = [
          { x: cx - W * 0.3, y: midY - 8, col: PURP },
          { x: cx, y: midY + 6, col: CYAN },
          { x: cx + W * 0.28, y: midY - 8, col: GOLD },
        ];
        for (const td of tableData) {
          const hover = Math.sin(t * 1.2 + td.x * 0.01) * 2;
          // Table hover shadow
          ctx.fillStyle = "rgba(0,0,0,0.3)";
          ctx.beginPath();
          ctx.ellipse(td.x + 2, td.y + 16 + hover, 20, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          // Table surface
          ctx.fillStyle = "#0c0420";
          ctx.strokeStyle = td.col;
          ctx.lineWidth = 2;
          ctx.shadowColor = td.col;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(td.x, td.y + hover, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
          // Inner ring
          ctx.strokeStyle = td.col + "55";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(td.x, td.y + hover, 16, 0, Math.PI * 2);
          ctx.stroke();
          // Center holo-candle
          const cp = Math.sin(t * 3 + td.x) * 0.5 + 0.5;
          ctx.fillStyle = `rgba(220,180,255,${0.5 + cp * 0.5})`;
          ctx.shadowColor = td.col;
          ctx.shadowBlur = 8 + cp * 6;
          ctx.beginPath();
          ctx.arc(td.x, td.y + hover, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          // 3 floating alien stools
          for (let si = 0; si < 3; si++) {
            const sa = (si / 3) * Math.PI * 2 - Math.PI / 2;
            const sx = td.x + Math.cos(sa) * 32;
            const sy = td.y + hover + Math.sin(sa) * 32;
            ctx.fillStyle = "#0a0318";
            ctx.strokeStyle = td.col + "88";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(sx, sy, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }

        // ── PATRONS at hover tables ──
        const patronData = [
          { tx: cx - W * 0.3, ty: midY - 8, skin: "#FFDDBB", hair: "#1a1a2a", col: PURP, gender: "m" },
          { tx: cx - W * 0.3 + 28, ty: midY - 8 - 26, skin: "#F0C080", hair: "#AA5522", col: PINK, gender: "f" },
          { tx: cx, ty: midY + 6, skin: "#D4956A", hair: "#2a1a00", col: CYAN, gender: "m" },
          { tx: cx + 28, ty: midY + 6 - 26, skin: "#EECCAA", hair: "#332211", col: GOLD, gender: "f" },
          { tx: cx + W * 0.28, ty: midY - 8, skin: "#FFDDBB", hair: "#1a002a", col: GOLD, gender: "f" },
          { tx: cx + W * 0.28 - 28, ty: midY - 8 - 26, skin: "#DDBB99", hair: "#1a1a1a", col: PURP, gender: "m" },
        ];
        for (const p of patronData) {
          const px2 = p.tx, py2 = p.ty;
          ctx.save();
          // Shadow
          ctx.fillStyle = "rgba(0,0,0,0.2)";
          ctx.beginPath(); ctx.ellipse(px2, py2 + 4, 8, 3, 0, 0, Math.PI*2); ctx.fill();
          // Body
          ctx.fillStyle = p.col + "CC"; ctx.shadowColor = p.col; ctx.shadowBlur = 6;
          rr(px2 - 8, py2 - 6, 16, 18, 3); ctx.fill(); ctx.shadowBlur = 0;
          if (p.gender === "f") {
            ctx.fillStyle = p.col + "66";
            ctx.beginPath(); ctx.moveTo(px2-8,py2+8); ctx.lineTo(px2-11,py2+18); ctx.lineTo(px2+11,py2+18); ctx.lineTo(px2+8,py2+8); ctx.closePath(); ctx.fill();
          }
          // Neck
          ctx.fillStyle = p.skin; ctx.fillRect(px2 - 3, py2 - 8, 6, 4);
          // Head
          ctx.beginPath(); ctx.arc(px2, py2 - 15, 9, 0, Math.PI*2); ctx.fill();
          // Hair
          ctx.fillStyle = p.hair;
          if (p.gender === "f") {
            ctx.beginPath(); ctx.arc(px2, py2 - 18, 8, Math.PI, 0); ctx.fill();
            ctx.fillRect(px2 - 9, py2 - 20, 4, 12);
            ctx.fillRect(px2 + 5, py2 - 20, 4, 12);
          } else {
            ctx.fillRect(px2 - 7, py2 - 21, 14, 7);
          }
          // Eyes
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.ellipse(px2-3.5, py2-16, 2.2, 1.8, 0, 0, Math.PI*2);
          ctx.ellipse(px2+3.5, py2-16, 2.2, 1.8, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = p.col; ctx.shadowColor = p.col; ctx.shadowBlur = 3;
          ctx.beginPath(); ctx.arc(px2-3.5, py2-16, 1.2, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(px2+3.5, py2-16, 1.2, 0, Math.PI*2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#000";
          ctx.beginPath(); ctx.arc(px2-3.5, py2-16, 0.5, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(px2+3.5, py2-16, 0.5, 0, Math.PI*2); ctx.fill();
          // Nose
          ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.arc(px2, py2-13, 1.2, 0, Math.PI*2); ctx.fill();
          // Mouth (smiling)
          ctx.strokeStyle = p.gender==="f" ? "#EE4466" : "#AA6644"; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(px2, py2-10.5, 3, 0.1, Math.PI-0.1); ctx.stroke();
          // Arm holding alien drink
          ctx.strokeStyle = p.skin; ctx.lineWidth = 3; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(px2+8, py2); ctx.lineTo(px2+16, py2-8); ctx.stroke();
          ctx.lineCap = "butt";
          // Alien drink in hand
          const drinkC = p.drink || PURP;
          ctx.fillStyle = drinkC + "55"; ctx.strokeStyle = drinkC; ctx.lineWidth = 1;
          ctx.shadowColor = drinkC; ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.moveTo(px2+12, py2-18); ctx.lineTo(px2+10, py2-10); ctx.lineTo(px2+20, py2-10); ctx.lineTo(px2+18, py2-18); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.restore();
        }

        // ── HOLOGRAPHIC JUKEBOX (right) ──
        const jx = cx + W * 0.3,
          jy = topY + 10;
        ctx.fillStyle = "#0a0220";
        ctx.strokeStyle = PINK;
        ctx.lineWidth = 2;
        ctx.shadowColor = PINK;
        ctx.shadowBlur = 12;
        rr(jx, jy, 44, 68, 6);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Rotating hologram inside
        ctx.save();
        ctx.translate(jx + 22, jy + 30);
        ctx.rotate(t * 0.5);
        for (let ri = 0; ri < 6; ri++) {
          const ra = (ri / 6) * Math.PI * 2;
          const rp = Math.sin(t * 2 + ri) * 0.5 + 0.5;
          ctx.fillStyle = `rgba(255,100,220,${0.2 + rp * 0.4})`;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, 14, ra, ra + Math.PI / 3);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = PINK;
        ctx.shadowColor = PINK;
        ctx.shadowBlur = 8;
        ctx.font = "5px monospace";
        ctx.textAlign = "center";
        ctx.fillText("HOLO JUKEBOX", jx + 22, jy + 60);
        ctx.shadowBlur = 0;

        // Ambient nebula particles
        for (let i = 0; i < 12; i++) {
          const nx = (t * 18 + i * 75) % W;
          const ny =
            topY + 40 + Math.sin(t + i * 0.8) * 20 + (i * (H * 0.55)) / 12;
          const na = Math.sin(t * 1.5 + i) * 0.3 + 0.35;
          ctx.fillStyle =
            i % 3 === 0
              ? `rgba(170,136,255,${na})`
              : i % 3 === 1
                ? `rgba(85,221,255,${na})`
                : `rgba(255,85,204,${na})`;
          ctx.beginPath();
          ctx.arc(nx, ny, i % 4 === 0 ? 2 : 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (type === 12) {
      const t = performance.now() / 1000;
      const isWasteland = !!this.map?.config?.wasteland;

      if (isWasteland) {
        // ═══ WASTELAND PAWNSHOP - POST-APOCALYPTIC STYLE ═══

        // Wasteland theme colors (dusty, industrial, muted)
        const RUST = "#8a6040";
        const TAN = "#a08060";
        const BROWN = "#6a5040";
        const GRAY = "#6a6a68";

        // ── Vertical offset to ensure visibility ──
        const vOffset = 35;

        // ── Shop title (weathered sign) ──
        ctx.save();
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#c0a080";
        ctx.fillText("▲ SCRAP TRADER ▲", cx, topY + vOffset - 12);
        ctx.restore();

        // ── Divider line under title (rusty) ──
        ctx.save();
        const divGrad = ctx.createLinearGradient(
          cx - W * 0.35,
          0,
          cx + W * 0.35,
          0,
        );
        divGrad.addColorStop(0, "rgba(138,96,64,0)");
        divGrad.addColorStop(0.5, "rgba(138,96,64,0.7)");
        divGrad.addColorStop(1, "rgba(138,96,64,0)");
        ctx.strokeStyle = divGrad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - W * 0.35, topY + vOffset);
        ctx.lineTo(cx + W * 0.35, topY + vOffset);
        ctx.stroke();
        ctx.restore();

        // ═══ TOP ROW: 3 DISPLAY CRATES (SALVAGED GOODS) ═══
        const topDisplays = [
          { emoji: "🔫", label: "WEAPONS", color: RUST },
          { emoji: "💣", label: "EXPLOSIVES", color: BROWN },
          { emoji: "⚙️", label: "PARTS", color: GRAY },
        ];

        for (let i = 0; i < 3; i++) {
          const dx = cx - W * 0.3 + i * (W * 0.3);
          const dy = topY + vOffset + 30;
          const item = topDisplays[i];

          // Wooden crate background
          ctx.save();
          ctx.fillStyle = "#3a3228";
          ctx.strokeStyle = "#5a4a38";
          ctx.lineWidth = 3;
          rr(dx - 38, dy - 20, 76, 58, 4);
          ctx.fill();
          ctx.stroke();

          // Wood grain lines
          ctx.strokeStyle = "rgba(90,74,56,0.5)";
          ctx.lineWidth = 1;
          for (let li = 0; li < 4; li++) {
            ctx.beginPath();
            ctx.moveTo(dx - 36, dy - 16 + li * 15);
            ctx.lineTo(dx + 36, dy - 16 + li * 15);
            ctx.stroke();
          }

          // Corner brackets (metal)
          ctx.fillStyle = "#5a5a58";
          ctx.fillRect(dx - 38, dy - 20, 12, 4);
          ctx.fillRect(dx - 38, dy - 20, 4, 12);
          ctx.fillRect(dx + 26, dy - 20, 12, 4);
          ctx.fillRect(dx + 34, dy - 20, 4, 12);
          ctx.fillRect(dx - 38, dy + 34, 12, 4);
          ctx.fillRect(dx - 38, dy + 26, 4, 12);
          ctx.fillRect(dx + 26, dy + 34, 12, 4);
          ctx.fillRect(dx + 34, dy + 26, 4, 12);

          // Item emoji
          ctx.font = "38px serif";
          ctx.textAlign = "center";
          ctx.fillText(item.emoji, dx, dy + 16);

          // Label on metal plate
          ctx.fillStyle = "#4a4a48";
          rr(dx - 28, dy + 24, 56, 14, 2);
          ctx.fill();
          ctx.font = "bold 8px monospace";
          ctx.fillStyle = TAN;
          ctx.fillText(item.label, dx, dy + 34);
          ctx.restore();
        }

        // ═══ MIDDLE ROW: RUSTY COUNTER ═══
        const counterX = cx - 55;
        const counterY = midY + 55;
        const counterW = 110;
        const counterH = 30;

        // Counter shadow
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(counterX + 4, counterY + counterH + 2, counterW, 5);

        // Counter base (rusty metal)
        const counterGrad = ctx.createLinearGradient(
          counterX,
          counterY,
          counterX,
          counterY + counterH,
        );
        counterGrad.addColorStop(0, "#4a4038");
        counterGrad.addColorStop(1, "#2a2420");
        ctx.fillStyle = counterGrad;
        rr(counterX, counterY, counterW, counterH, 4);
        ctx.fill();

        // Counter top edge (worn wood)
        ctx.fillStyle = "#5a4a38";
        ctx.fillRect(counterX - 3, counterY, counterW + 6, 5);

        // Rust stains on counter
        ctx.fillStyle = "rgba(100,50,20,0.3)";
        ctx.beginPath();
        ctx.ellipse(counterX + 25, counterY + 15, 12, 8, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // "TRADE" sign on counter
        ctx.fillStyle = "#3a3028";
        rr(counterX + counterW / 2 - 25, counterY + 8, 50, 16, 2);
        ctx.fill();
        ctx.fillStyle = TAN;
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("TRADE", counterX + counterW / 2, counterY + 20);

        // ═══ BOTTOM ROW: 4 SMALLER SALVAGE ITEMS ═══
        const bottomItems = [
          { emoji: "🔧", color: GRAY },
          { emoji: "⛽", color: RUST },
          { emoji: "🔋", color: BROWN },
          { emoji: "📻", color: TAN },
        ];

        for (let i = 0; i < 4; i++) {
          const bx = cx - W * 0.32 + i * (W * 0.22);
          const by = midY + 25;
          const item = bottomItems[i];

          // Small metal box
          ctx.save();
          ctx.fillStyle = "#2a2820";
          ctx.strokeStyle = "#4a4540";
          ctx.lineWidth = 1.5;
          rr(bx - 18, by - 14, 36, 32, 3);
          ctx.fill();
          ctx.stroke();

          // Dents/damage
          ctx.fillStyle = "rgba(0,0,0,0.2)";
          ctx.beginPath();
          ctx.arc(bx - 8, by - 6, 5, 0, Math.PI * 2);
          ctx.fill();

          // Item emoji
          ctx.font = "20px serif";
          ctx.textAlign = "center";
          ctx.fillText(item.emoji, bx, by + 8);
          ctx.restore();
        }

        // ═══ AMBIENT DUST PARTICLES ═══
        ctx.save();
        for (let pi = 0; pi < 6; pi++) {
          const px = cx - W * 0.35 + ((t * 8 + pi * 90) % (W * 0.7));
          const py = topY + 25 + Math.sin(t * 0.6 + pi) * 20 + ((pi * 18) % 50);
          const alpha = Math.sin(t * 1.5 + pi) * 0.15 + 0.2;
          ctx.fillStyle = `rgba(120,100,70,${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // ═══ WALL DECORATIONS ═══
        // Hanging tools on left
        ctx.fillStyle = "#5a5a58";
        ctx.fillRect(cx - W * 0.42, topY - 5, 3, 25);
        ctx.fillRect(cx - W * 0.38, topY - 5, 3, 20);
        ctx.fillRect(cx - W * 0.34, topY - 5, 3, 30);

        // Shelf with junk on right
        ctx.fillStyle = "#4a4038";
        ctx.fillRect(cx + W * 0.28, topY + 5, 50, 6);
        ctx.fillStyle = "#6a6058";
        ctx.fillRect(cx + W * 0.30, topY - 8, 12, 13);
        ctx.fillRect(cx + W * 0.38, topY - 5, 8, 10);
        ctx.fillRect(cx + W * 0.44, topY - 10, 10, 15);

      } else {
        // ═══ CYBER PAWNSHOP - NEON CITY STYLE ═══

        // Neon City theme colors (matching the map)
        const CYAN = "#44EEFF";
        const PINK = "#FF4466";
        const GREEN = "#44FF88";
        const PURPLE = "#CC88FF";

      // ── Vertical offset to ensure visibility ──
      const vOffset = 35;

      // ── Shop title with glow ──
      ctx.save();
      ctx.font = "bold 12px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.shadowColor = CYAN;
      ctx.shadowBlur = 18;
      ctx.fillText("◈ CYBER PAWN ◈", cx, topY + vOffset - 12);
      ctx.shadowBlur = 0;
      ctx.restore();

      // ── Divider line under title ──
      ctx.save();
      const divGrad = ctx.createLinearGradient(
        cx - W * 0.35,
        0,
        cx + W * 0.35,
        0,
      );
      divGrad.addColorStop(0, "rgba(68,238,255,0)");
      divGrad.addColorStop(0.5, "rgba(68,238,255,0.8)");
      divGrad.addColorStop(1, "rgba(68,238,255,0)");
      ctx.strokeStyle = divGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - W * 0.35, topY + vOffset);
      ctx.lineTo(cx + W * 0.35, topY + vOffset);
      ctx.stroke();
      ctx.restore();

      // ═══ TOP ROW: 3 LARGE DISPLAY CASES (HIGH VISIBILITY) ═══
      const topDisplays = [
        { emoji: "🔫", label: "WEAPONS", color: PINK },
        { emoji: "💣", label: "GRENADES", color: "#FF8844" },
        { emoji: "💎", label: "VALUABLES", color: CYAN },
      ];

      for (let i = 0; i < 3; i++) {
        const dx = cx - W * 0.3 + i * (W * 0.3);
        const dy = topY + vOffset + 30;
        const item = topDisplays[i];
        const pulse = Math.sin(t * 2 + i * 1.5) * 0.3 + 0.7;
        const floatY = Math.sin(t * 1.5 + i * 2) * 3;

        // Display case background - BRIGHTER for visibility
        ctx.save();
        ctx.fillStyle = "rgba(20,25,40,0.98)";
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 20 * pulse;
        rr(dx - 38, dy - 20, 76, 58, 10);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Inner bright glow background for contrast
        const innerGlow = ctx.createRadialGradient(
          dx,
          dy + 8,
          0,
          dx,
          dy + 8,
          35,
        );
        innerGlow.addColorStop(
          0,
          `rgba(${item.color === CYAN ? "68,238,255" : item.color === PINK ? "255,68,102" : "255,136,68"},0.25)`,
        );
        innerGlow.addColorStop(
          0.6,
          `rgba(${item.color === CYAN ? "68,238,255" : item.color === PINK ? "255,68,102" : "255,136,68"},0.08)`,
        );
        innerGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(dx, dy + 8, 35, 0, Math.PI * 2);
        ctx.fill();

        // LARGER emoji with stronger glow
        ctx.font = "42px serif";
        ctx.textAlign = "center";
        ctx.shadowColor = "#fff";
        ctx.shadowBlur = 8;
        ctx.fillText(item.emoji, dx, dy + 18 + floatY);
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 25;
        ctx.fillText(item.emoji, dx, dy + 18 + floatY);
        ctx.shadowBlur = 0;

        // Label with better visibility
        ctx.font = "bold 8px Orbitron, monospace";
        ctx.fillStyle = "#fff";
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 10;
        ctx.fillText(item.label, dx, dy + 30);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // ═══ MIDDLE ROW: CYBER COUNTER ═══
      const counterX = cx - 55;
      const counterY = midY + 55;
      const counterW = 110;
      const counterH = 30;

      // Counter shadow
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(counterX + 4, counterY + counterH + 2, counterW, 5);

      // Counter base
      const counterGrad = ctx.createLinearGradient(
        counterX,
        counterY,
        counterX,
        counterY + counterH,
      );
      counterGrad.addColorStop(0, "#1a1a2e");
      counterGrad.addColorStop(1, "#0a0a14");
      ctx.fillStyle = counterGrad;
      rr(counterX, counterY, counterW, counterH, 6);
      ctx.fill();

      // Counter top edge with cyan glow
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 2;
      ctx.shadowColor = CYAN;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(counterX, counterY + 2);
      ctx.lineTo(counterX + counterW, counterY + 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // ═══ BOTTOM ROW: 4 SMALLER ITEM DISPLAYS ═══
      const bottomItems = [
        { emoji: "⌚", color: PURPLE },
        { emoji: "💍", color: PINK },
        { emoji: "📱", color: CYAN },
        { emoji: "🎮", color: GREEN },
      ];

      for (let i = 0; i < 4; i++) {
        const bx = cx - W * 0.32 + i * (W * 0.22);
        const by = midY + 25;
        const item = bottomItems[i];
        const pulse = Math.sin(t * 2.5 + i) * 0.3 + 0.7;
        const floatY = Math.sin(t * 1.8 + i * 1.5) * 3;

        // Small display case
        ctx.save();
        ctx.fillStyle = "rgba(8,12,20,0.9)";
        ctx.strokeStyle = `rgba(${item.color === CYAN ? "68,238,255" : item.color === PINK ? "255,68,102" : item.color === GREEN ? "68,255,136" : "204,136,255"},${0.5 + pulse * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 8 * pulse;
        rr(bx - 18, by - 14, 36, 32, 5);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Item emoji
        ctx.font = "20px serif";
        ctx.textAlign = "center";
        ctx.shadowColor = item.color;
        ctx.shadowBlur = 10;
        ctx.fillText(item.emoji, bx, by + 8 + floatY);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // ═══ AMBIENT PARTICLES (subtle) ═══
      ctx.save();
      for (let pi = 0; pi < 6; pi++) {
        const px = cx - W * 0.35 + ((t * 10 + pi * 90) % (W * 0.7));
        const py = topY + 25 + Math.sin(t * 0.8 + pi) * 25 + ((pi * 18) % 50);
        const alpha = Math.sin(t * 2 + pi) * 0.25 + 0.35;
        ctx.fillStyle =
          pi % 2 === 0
            ? `rgba(68,238,255,${alpha})`
            : `rgba(255,68,102,${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      }
    } else if (type === 13) {
      // TECH LAB / WASTELAND TECH SHOP / FROZEN TUNDRA CRYO LAB
      const isTechShop = room.isTechShop;
      const isSnowTech = !!this.map?.config?.snow;

      if (isSnowTech) {
        // ═══ FROZEN TUNDRA: CRYO RESEARCH LAB ═══
        const t = performance.now() / 1000;

        // ── Lab sign ───────────────────
        ctx.fillStyle = "#AADDFF";
        ctx.shadowColor = "#66BBFF";
        ctx.shadowBlur = 15;
        ctx.font = "bold 12px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("❄ CRYO RESEARCH LAB ❄", cx, topY - 4);
        ctx.shadowBlur = 0;

        // ── Main cryo chamber bank (top) ───────────────────
        ctx.fillStyle = "#081420";
        ctx.strokeStyle = "#66BBFF";
        ctx.lineWidth = 1.5;
        rr(cx - W * 0.44, topY + 4, W * 0.88, 44, 3);
        ctx.fill();
        ctx.stroke();
        // Cryo units
        for (let si = 0; si < 5; si++) {
          const sx2 = cx - W * 0.4 + si * ((W * 0.8) / 4.5);
          ctx.fillStyle = "#0c1825";
          rr(sx2 - 14, topY + 6, 28, 40, 2);
          ctx.fill();
          // Ice frost lines
          const pulse = Math.sin(t * 1.5 + si) * 0.3 + 0.7;
          ctx.fillStyle = `rgba(100,180,255,${0.2 * pulse})`;
          ctx.fillRect(sx2 - 12, topY + 8, 24, 4);
          ctx.fillRect(sx2 - 12, topY + 16, 24, 4);
          ctx.fillRect(sx2 - 12, topY + 24, 24, 4);
          // Status lights - ice blue
          ctx.fillStyle = ["#66BBFF", "#88DDFF", "#AADDFF", "#66CCFF", "#88EEFF"][si];
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(sx2 + 10, topY + 40, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // ── Holographic ice workstation (center) ─────────
        ctx.fillStyle = "#081015";
        ctx.strokeStyle = "#4488BB";
        ctx.lineWidth = 1.5;
        rr(cx - 36, midY - 14, 72, 36, 4);
        ctx.fill();
        ctx.stroke();
        // Hologram display - ice crystal projection
        ctx.fillStyle = "rgba(100,180,255,0.12)";
        ctx.strokeStyle = "#66BBFF88";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 20, midY - 10);
        ctx.lineTo(cx + 20, midY - 10);
        ctx.lineTo(cx + 28, midY - 28);
        ctx.lineTo(cx - 28, midY - 28);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Snowflake hologram
        ctx.fillStyle = "#88DDFF";
        ctx.shadowColor = "#66BBFF";
        ctx.shadowBlur = 12;
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("❄", cx, midY - 16);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#AADDFF";
        ctx.font = "bold 6px Orbitron, monospace";
        ctx.fillText("CRYO ONLINE", cx, midY - 6);
        // Frozen keyboard
        ctx.fillStyle = "#0c1820";
        rr(cx - 28, midY - 2, 56, 12, 2);
        ctx.fill();
        for (let ki = 0; ki < 8; ki++) {
          ctx.fillStyle = `rgba(100,180,255,${0.3 + Math.sin(t * 2 + ki) * 0.1})`;
          ctx.fillRect(cx - 26 + ki * 7, midY, 5, 8);
        }

        // ── Cryo sample station (left) ───────────────────
        ctx.fillStyle = "#0a1418";
        ctx.strokeStyle = "#4488AA";
        ctx.lineWidth = 1;
        rr(cx - W * 0.44, midY - 8, 52, 48, 3);
        ctx.fill();
        ctx.stroke();
        // Ice sample tubes
        const sColors = ["#88DDFF", "#66BBFF", "#AAEEFF", "#55AACC"];
        for (let fi = 0; fi < 4; fi++) {
          ctx.fillStyle = sColors[fi];
          ctx.shadowColor = sColors[fi];
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.roundRect(cx - W * 0.42 + fi * 12, midY - 4, 9, 22, [3, 3, 0, 0]);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        ctx.fillStyle = "#AADDFF";
        ctx.font = "bold 5px monospace";
        ctx.textAlign = "center";
        ctx.fillText("SAMPLES", cx - W * 0.42 + 20, midY + 24);

        // ── Frozen storage rack (right) ───────────────────
        ctx.fillStyle = "#0a1420";
        ctx.strokeStyle = "#5599BB";
        ctx.lineWidth = 1.5;
        rr(W * 0.72, topY + 8, 56, 70, 3);
        ctx.fill();
        ctx.stroke();
        // Shelves
        ctx.fillStyle = "#1a2a3a";
        ctx.fillRect(W * 0.74, topY + 24, 48, 3);
        ctx.fillRect(W * 0.74, topY + 44, 48, 3);
        // Ice containers
        for (let ci = 0; ci < 3; ci++) {
          for (let ri = 0; ri < 2; ri++) {
            ctx.fillStyle = "#0c1825";
            ctx.strokeStyle = "#4488AA";
            ctx.lineWidth = 0.5;
            rr(W * 0.74 + 4 + ci * 16, topY + 10 + ri * 24, 12, 12, 2);
            ctx.fill();
            ctx.stroke();
            // Frost effect
            ctx.fillStyle = `rgba(150,200,255,${0.3 + Math.sin(t + ci + ri) * 0.1})`;
            ctx.fillRect(W * 0.74 + 6 + ci * 16, topY + 12 + ri * 24, 8, 8);
          }
        }
        ctx.fillStyle = "#88CCFF";
        ctx.font = "bold 6px monospace";
        ctx.textAlign = "center";
        ctx.fillText("STORAGE", W * 0.72 + 28, topY + 82);

        // ── Frozen specimen pod (bottom) ───────────────────
        ctx.fillStyle = "#081520";
        ctx.strokeStyle = "#66BBFF";
        ctx.lineWidth = 1.5;
        rr(cx - 30, midY + 20, 60, 40, 4);
        ctx.fill();
        ctx.stroke();
        // Specimen inside
        const specPulse = Math.sin(t * 0.8) * 0.2 + 0.8;
        ctx.fillStyle = `rgba(100,180,255,${0.15 * specPulse})`;
        ctx.beginPath();
        ctx.ellipse(cx, midY + 38, 20, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#AADDFF";
        ctx.font = "bold 5px monospace";
        ctx.textAlign = "center";
        ctx.fillText("SPECIMEN A-7", cx, midY + 66);

        // ── Ice particles ───────────────────
        for (let i = 0; i < 8; i++) {
          const px2 = W * 0.1 + (t * 15 + i * 50) % (W * 0.8);
          const py2 = topY + 10 + Math.sin(t + i * 2) * 30 + i * 8;
          const alpha = Math.sin(t * 2 + i) * 0.3 + 0.4;
          ctx.fillStyle = `rgba(180,220,255,${alpha})`;
          ctx.beginPath();
          ctx.arc(px2, py2, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

      } else if (isTechShop) {
        // ═══ WASTELAND TECH SHOP ═══
        // ── Sales counter (top center) ───────────────────
        ctx.fillStyle = "#3a3530";
        ctx.strokeStyle = "#5a5048";
        ctx.lineWidth = 2;
        rr(cx - 60, topY + 8, 120, 38, 3);
        ctx.fill();
        ctx.stroke();
        // Counter top (worn metal)
        ctx.fillStyle = "#4a4540";
        rr(cx - 58, topY + 10, 116, 8, 2);
        ctx.fill();
        // Cash register
        ctx.fillStyle = "#2a2520";
        rr(cx + 20, topY + 12, 32, 28, 2);
        ctx.fill();
        ctx.fillStyle = "#00FFCC";
        ctx.fillRect(cx + 24, topY + 16, 24, 12);
        ctx.fillStyle = "#00AA88";
        ctx.font = "bold 6px monospace";
        ctx.textAlign = "center";
        ctx.fillText("$$$", cx + 36, topY + 24);
        // Items on counter
        ctx.fillStyle = "#1a1a2a";
        rr(cx - 50, topY + 18, 18, 22, 2);
        ctx.fill();
        ctx.fillStyle = "#00FFCC";
        ctx.fillRect(cx - 48, topY + 20, 14, 16);

        // ── Display shelves (left wall) ───────────────────
        ctx.fillStyle = "#3a3530";
        ctx.strokeStyle = "#5a5048";
        ctx.lineWidth = 1.5;
        rr(W * 0.08, topY + 4, 48, 80, 2);
        ctx.fill();
        ctx.stroke();
        // Shelf dividers
        ctx.fillStyle = "#4a4540";
        ctx.fillRect(W * 0.08, topY + 28, 48, 3);
        ctx.fillRect(W * 0.08, topY + 54, 48, 3);
        // Tech items on shelves
        const shelfItems = [
          { x: W * 0.10, y: topY + 10, w: 14, h: 14, color: "#00FFCC" },
          { x: W * 0.10 + 18, y: topY + 12, w: 18, h: 12, color: "#FF8844" },
          { x: W * 0.10, y: topY + 34, w: 20, h: 16, color: "#4488FF" },
          { x: W * 0.10 + 24, y: topY + 36, w: 12, h: 14, color: "#FFCC00" },
          { x: W * 0.10, y: topY + 60, w: 16, h: 18, color: "#FF44AA" },
          { x: W * 0.10 + 20, y: topY + 62, w: 20, h: 14, color: "#44FF88" },
        ];
        for (const item of shelfItems) {
          ctx.fillStyle = "#1a1a1a";
          rr(item.x, item.y, item.w, item.h, 2);
          ctx.fill();
          ctx.fillStyle = item.color;
          ctx.shadowColor = item.color;
          ctx.shadowBlur = 4;
          ctx.fillRect(item.x + 2, item.y + 2, item.w - 4, item.h - 4);
          ctx.shadowBlur = 0;
        }

        // ── Display table (center) with gadgets ───────────────────
        ctx.fillStyle = "#3a3028";
        ctx.strokeStyle = "#5a4a38";
        ctx.lineWidth = 1.5;
        rr(cx - 45, midY - 8, 90, 40, 3);
        ctx.fill();
        ctx.stroke();
        // Gadgets on table
        const gadgets = [
          { x: cx - 38, y: midY - 2, w: 24, h: 18, color: "#00FFCC", label: "CHIP" },
          { x: cx - 8, y: midY, w: 20, h: 14, color: "#FFAA00", label: "MOD" },
          { x: cx + 18, y: midY - 4, w: 26, h: 22, color: "#4488FF", label: "CORE" },
        ];
        for (const g of gadgets) {
          ctx.fillStyle = "#1a1a2a";
          rr(g.x, g.y, g.w, g.h, 2);
          ctx.fill();
          ctx.fillStyle = g.color;
          ctx.shadowColor = g.color;
          ctx.shadowBlur = 5;
          ctx.fillRect(g.x + 3, g.y + 3, g.w - 6, g.h - 6);
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 5px monospace";
          ctx.textAlign = "center";
          ctx.fillText(g.label, g.x + g.w / 2, g.y + g.h + 8);
        }

        // ── Repair station (right) ───────────────────
        ctx.fillStyle = "#2a2a30";
        ctx.strokeStyle = "#4a4a50";
        ctx.lineWidth = 1.5;
        rr(W * 0.72, topY + 8, 56, 70, 3);
        ctx.fill();
        ctx.stroke();
        // Tools
        ctx.fillStyle = "#6a6a70";
        ctx.fillRect(W * 0.74, topY + 14, 8, 24);
        ctx.fillRect(W * 0.74 + 12, topY + 16, 6, 20);
        ctx.fillRect(W * 0.74 + 22, topY + 12, 10, 26);
        // Soldering station glow
        ctx.fillStyle = "#FF6600";
        ctx.shadowColor = "#FF6600";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(W * 0.74 + 40, topY + 50, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // "REPAIRS" sign
        ctx.fillStyle = "#00FFCC";
        ctx.font = "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.fillText("REPAIRS", W * 0.72 + 28, topY + 82);

        // ── Crate with parts (bottom left) ───────────────────
        ctx.fillStyle = "#4a3a22";
        ctx.strokeStyle = "#6a5a32";
        ctx.lineWidth = 1;
        rr(W * 0.10, midY + 20, 36, 30, 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = "#5a4a28";
        ctx.beginPath();
        ctx.moveTo(W * 0.10 + 4, midY + 24);
        ctx.lineTo(W * 0.10 + 32, midY + 46);
        ctx.moveTo(W * 0.10 + 32, midY + 24);
        ctx.lineTo(W * 0.10 + 4, midY + 46);
        ctx.stroke();
        ctx.fillStyle = "#8a7a68";
        ctx.font = "bold 6px monospace";
        ctx.textAlign = "center";
        ctx.fillText("PARTS", W * 0.10 + 18, midY + 56);

        // ── Shop sign ───────────────────
        ctx.fillStyle = "#00FFCC";
        ctx.shadowColor = "#00FFCC";
        ctx.shadowBlur = 10;
        ctx.font = "bold 10px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("TECH TRADER", cx, topY - 2);
        ctx.shadowBlur = 0;

      } else {
        // ═══ DEFAULT TECH LAB ═══
        // ── Main server bank (top) ───────────────────
        ctx.fillStyle = "#050a0f";
        ctx.strokeStyle = "#00FFCC";
        ctx.lineWidth = 1.5;
        rr(cx - W * 0.44, topY + 4, W * 0.88, 44, 3);
        ctx.fill();
        ctx.stroke();
        // Server units
        for (let si = 0; si < 5; si++) {
          const sx2 = cx - W * 0.4 + si * ((W * 0.8) / 4.5);
          ctx.fillStyle = "#0a1218";
          rr(sx2 - 14, topY + 6, 28, 40, 2);
          ctx.fill();
          ctx.fillStyle = "#00FFCC" + (si % 2 === 0 ? "88" : "44");
          ctx.fillRect(sx2 - 12, topY + 8, 24, 4);
          ctx.fillRect(sx2 - 12, topY + 16, 24, 4);
          ctx.fillRect(sx2 - 12, topY + 24, 24, 4);
          ctx.fillStyle = ["#00FF88", "#FF4400", "#4488FF", "#FFCC00", "#FF00CC"][si];
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(sx2 + 10, topY + 40, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        // ── Holographic workstation (center) ─────────
        ctx.fillStyle = "#050810";
        ctx.strokeStyle = "#0088FF";
        ctx.lineWidth = 1.5;
        rr(cx - 36, midY - 14, 72, 36, 4);
        ctx.fill();
        ctx.stroke();
        // Hologram display
        ctx.fillStyle = "rgba(0,136,255,0.12)";
        ctx.strokeStyle = "#0088FF88";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 20, midY - 10);
        ctx.lineTo(cx + 20, midY - 10);
        ctx.lineTo(cx + 28, midY - 28);
        ctx.lineTo(cx - 28, midY - 28);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#00FFCC";
        ctx.shadowColor = "#00FFCC";
        ctx.shadowBlur = 10;
        ctx.font = "bold 6px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("SYSTEM ONLINE", cx, midY - 18);
        ctx.shadowBlur = 0;
        // Keyboard glow
        ctx.fillStyle = "#0a1820";
        rr(cx - 28, midY - 8, 56, 12, 2);
        ctx.fill();
        for (let ki = 0; ki < 8; ki++) {
          ctx.fillStyle = "#00FFCC44";
          ctx.fillRect(cx - 26 + ki * 7, midY - 6, 5, 8);
        }
        // ── Chemical station (left) ───────────────────
        ctx.fillStyle = "#0a1210";
        ctx.strokeStyle = "#44FF88";
        ctx.lineWidth = 1;
        rr(cx - W * 0.44, midY - 8, 52, 48, 3);
        ctx.fill();
        ctx.stroke();
        const cColors = ["#FF4444", "#44FFCC", "#FFCC00", "#4444FF"];
        for (let fi = 0; fi < 4; fi++) {
          ctx.fillStyle = cColors[fi];
          ctx.shadowColor = cColors[fi];
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.roundRect(cx - W * 0.42 + fi * 12, midY - 4, 9, 22, [3, 3, 0, 0]);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    } else if (type === 14) {
      // WAREHOUSE
      if (!!this.map?.config?.zombie) {
        // ═══ ZOMBIE: INFECTED WAREHOUSE ═══
        const t = performance.now() / 1000;
        // Sign
        ctx.fillStyle="rgba(20,10,0,0.92)"; rr(W/2-130,room.S-22,260,26,5); ctx.fill();
        ctx.strokeStyle=`rgba(180,60,0,${0.6+0.3*Math.sin(t*1.6)})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#FFCC88"; ctx.font="bold 11px monospace"; ctx.textAlign="center";
        ctx.fillText("☠  INFECTED WAREHOUSE  ☠", W/2, room.S-9);
        // ── Dark infected crates (top rows) ──
        const zCratePositions = [
          [cx-W*0.42, topY+4, 3, 2],
          [cx-W*0.08, topY+4, 2, 2],
          [cx+W*0.18, topY+4, 3, 2],
          [cx-W*0.40, midY-6, 2, 2],
          [cx+W*0.20, midY-6, 2, 2],
        ];
        for (const [bx3,by3,cols,rows] of zCratePositions) {
          for (let cr=0;cr<rows;cr++) for (let cc=0;cc<cols;cc++) {
            const px3=bx3+cc*22, py3=by3+cr*22;
            const seed=(px3*7+py3*13)%100;
            // Some crates are cracked/infected
            const infected=seed<35;
            ctx.fillStyle=infected?"#1a0e04":"#2a1c0a";
            ctx.strokeStyle=infected?"rgba(44,140,0,0.5)":"rgba(80,60,20,0.6)";
            ctx.lineWidth=1;
            rr(px3,py3,20,20,2); ctx.fill(); ctx.stroke();
            ctx.strokeStyle=infected?"rgba(44,100,0,0.4)":"rgba(60,40,10,0.4)";
            ctx.lineWidth=0.8;
            ctx.beginPath(); ctx.moveTo(px3+3,py3+3); ctx.lineTo(px3+17,py3+17); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(px3+17,py3+3); ctx.lineTo(px3+3,py3+17); ctx.stroke();
            if (infected) {
              // Green slime seeping from crack
              const sg=ctx.createRadialGradient(px3+10,py3+18,0,px3+10,py3+18,10);
              sg.addColorStop(0,`rgba(44,180,0,${0.25+0.1*Math.sin(t*0.7+seed)})`);
              sg.addColorStop(1,"rgba(0,0,0,0)");
              ctx.fillStyle=sg; ctx.beginPath(); ctx.ellipse(px3+10,py3+22,8,5,0,0,Math.PI*2); ctx.fill();
              // Biohazard label on infected crate
              ctx.fillStyle=`rgba(44,200,0,${0.55+0.2*Math.sin(t*1.1+cc)})`; ctx.font="8px serif";
              ctx.textAlign="center"; ctx.fillText("☢",px3+10,py3+13);
            }
          }
        }
        // ── Aisle markings (cracked/faded) ──
        ctx.strokeStyle="rgba(140,100,0,0.3)"; ctx.lineWidth=1;
        ctx.setLineDash([5,5]);
        ctx.beginPath(); ctx.moveTo(cx-8,topY+4); ctx.lineTo(cx-8,H-14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+8,topY+4); ctx.lineTo(cx+8,H-14); ctx.stroke();
        ctx.setLineDash([]);
        // ── Hazard tape strips (floor — yellow/black) ──
        for (let hi=0;hi<5;hi++) {
          const htx=W*0.06+hi*(W*0.195), hty=H*0.82;
          ctx.fillStyle=hi%2===0?"rgba(200,160,0,0.22)":"rgba(0,0,0,0.20)";
          ctx.save(); ctx.translate(htx,hty); ctx.rotate(-0.04+hi*0.01);
          ctx.fillRect(0,0,W*0.18,7); ctx.restore();
        }
        // ── Broken forklift (center, derelict) ──
        ctx.fillStyle="#1a1000"; rr(cx-22,midY-18,44,34,3); ctx.fill();
        ctx.strokeStyle="rgba(100,70,0,0.5)"; ctx.lineWidth=1.5; ctx.stroke();
        // Forklift forks
        ctx.fillStyle="#0e0a00";
        ctx.fillRect(cx-18,midY-24,6,10); ctx.fillRect(cx+12,midY-24,6,10);
        // Rust stains
        ctx.fillStyle="rgba(140,60,0,0.35)"; ctx.beginPath(); ctx.ellipse(cx,midY-5,14,6,0,0,Math.PI*2); ctx.fill();
        // Infection pool under forklift
        const ifkG=ctx.createRadialGradient(cx,midY+12,0,cx,midY+12,22);
        ifkG.addColorStop(0,`rgba(44,160,0,${0.22+0.1*Math.sin(t*0.9)})`); ifkG.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=ifkG; ctx.beginPath(); ctx.arc(cx,midY+12,22,0,Math.PI*2); ctx.fill();
        // ── Flickering hanging light ──
        const flicker=0.6+0.4*Math.abs(Math.sin(t*8.3));
        ctx.fillStyle=`rgba(220,180,60,${flicker*0.85})`;
        ctx.shadowColor="#FFCC44"; ctx.shadowBlur=14*flicker;
        ctx.beginPath(); ctx.ellipse(cx,topY+2,11,4,0,0,Math.PI*2); ctx.fill();
        ctx.shadowBlur=0;
        ctx.strokeStyle="rgba(100,100,100,0.8)"; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(cx,topY+2); ctx.lineTo(cx,0); ctx.stroke();
        // ── Corpse 1: worker collapsed by left crates ──
        drawCorpse(cx-W*0.30, topY+52, 0.4, '#1a1208', 0.5);
        // ── Corpse 2: worker in center aisle ──
        drawCorpse(cx+W*0.04, midY+30, -0.6, '#160e06', 0.55);
        // ── Corpse 3: near right crates ──
        drawCorpse(cx+W*0.32, topY+46, 1.8, '#141008', 0.42);
        // ── Blood smears across aisle ──
        for (let bsi=0;bsi<3;bsi++) {
          const bsx1=cx-W*0.30+bsi*W*0.18, bsy1=topY+52+bsi*20;
          const bsx2=cx-W*0.15+bsi*W*0.1, bsy2=midY+10+bsi*12;
          const bsG=ctx.createLinearGradient(bsx1,bsy1,bsx2,bsy2);
          bsG.addColorStop(0,"rgba(100,0,0,0.4)"); bsG.addColorStop(1,"rgba(60,0,0,0)");
          ctx.strokeStyle=bsG; ctx.lineWidth=4+bsi;
          ctx.beginPath(); ctx.moveTo(bsx1,bsy1); ctx.lineTo(bsx2,bsy2); ctx.stroke();
        }
        // ── Warning board (right wall) ──
        ctx.fillStyle="#1a0e00"; rr(W-74,H*0.36,58,80,4); ctx.fill();
        ctx.strokeStyle="rgba(180,80,0,0.5)"; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="rgba(200,100,0,0.8)"; ctx.font="bold 5px monospace"; ctx.textAlign="center";
        ctx.fillText("QUARANTINE", W-45, H*0.36+14);
        ctx.strokeStyle="rgba(180,80,0,0.3)"; ctx.lineWidth=0.5;
        ctx.beginPath(); ctx.moveTo(W-70,H*0.36+18); ctx.lineTo(W-20,H*0.36+18); ctx.stroke();
        const wNotes=["ZONE INFECTED","ALL STAFF DOWN","DO NOT REOPEN","☢ HAZMAT REQ."];
        wNotes.forEach((n,i)=>{
          ctx.fillStyle=`rgba(${i>1?220:160},${i>1?60:120},0,0.7)`;
          ctx.font=`${i>1?"bold ":""}5px monospace`; ctx.textAlign="left";
          ctx.fillText(n, W-70, H*0.36+30+i*14);
        });
        // ── Green infection pools (floor) ──
        for (const [ipx,ipy,ipr] of [[W*0.28,H*0.64,16],[W*0.55,H*0.75,14],[W*0.40,H*0.86,12]]) {
          const ipG=ctx.createRadialGradient(ipx,ipy,0,ipx,ipy,ipr);
          ipG.addColorStop(0,`rgba(44,180,0,${0.25+0.1*Math.sin(t*0.7+ipx)})`);
          ipG.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=ipG; ctx.beginPath(); ctx.arc(ipx,ipy,ipr,0,Math.PI*2); ctx.fill();
        }
      } else {
        // ── Default Warehouse ──────────────────────────
        const crateColor = "#4a3a22",
          crateStroke = "#8a6a3a";
        const cratePositions = [
          [cx - W * 0.42, topY + 4, 3, 2],
          [cx - W * 0.08, topY + 4, 2, 3],
          [cx + W * 0.2, topY + 4, 3, 2],
          [cx - W * 0.42, midY - 6, 2, 2],
          [cx + W * 0.22, midY - 6, 2, 2],
        ];
        for (const [bx3, by3, cols, rows] of cratePositions) {
          for (let cr = 0; cr < rows; cr++)
            for (let cc = 0; cc < cols; cc++) {
              const px3 = bx3 + cc * 22,
                py3 = by3 + cr * 22;
              ctx.fillStyle = crateColor;
              ctx.strokeStyle = crateStroke;
              ctx.lineWidth = 1;
              rr(px3, py3, 20, 20, 2);
              ctx.fill();
              ctx.stroke();
              // Crate X mark
              ctx.strokeStyle = "#6a4a22";
              ctx.lineWidth = 0.8;
              ctx.beginPath();
              ctx.moveTo(px3 + 3, py3 + 3);
              ctx.lineTo(px3 + 17, py3 + 17);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(px3 + 17, py3 + 3);
              ctx.lineTo(px3 + 3, py3 + 17);
              ctx.stroke();
            }
        }
        // ── Forklift path (center aisle) ─────────────
        ctx.strokeStyle = "#FFCC00";
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(cx - 8, topY + 4);
        ctx.lineTo(cx - 8, H - 14);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 8, topY + 4);
        ctx.lineTo(cx + 8, H - 14);
        ctx.stroke();
        ctx.setLineDash([]);
        // ── Hanging light (center) ────────────────────
        ctx.fillStyle = "#FFEE88";
        ctx.shadowColor = "#FFCC44";
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.ellipse(cx, topY + 2, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#888";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, topY + 2);
        ctx.lineTo(cx, 0);
        ctx.stroke();
        // ── Shipping label on ground ──────────────────
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        rr(cx - 36, midY + 24, 72, 28, 2);
        ctx.fill();
        ctx.fillStyle = "#AAAAAA";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText("FRAGILE", cx, midY + 41);
      }
    } else if (type === 15) {
      // POLICE STATION
      // ── Police badge and sign on wall (top-left corner) ──────────────────
      ctx.fillStyle = "#FFD700";
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 16;
      ctx.font = "28px serif";
      ctx.textAlign = "center";
      ctx.fillText("⭐", W * 0.12, topY + 24);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#4477FF";
      ctx.font = "bold 10px Orbitron, monospace";
      ctx.fillText("NCPD", W * 0.12, topY + 42);

      // ── Evidence board (center-top wall) ───────────
      ctx.fillStyle = "#0a1020";
      rr(cx - 55, topY + 4, 110, 40, 2);
      ctx.fill();
      ctx.strokeStyle = "#4477FF";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 55, topY + 4, 110, 40);
      // Mug shots
      for (let mi = 0; mi < 6; mi++) {
        ctx.fillStyle = "#EEDDCC";
        ctx.beginPath();
        ctx.arc(cx - 44 + mi * 18, topY + 16, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a1a2a";
        ctx.fillRect(cx - 47 + mi * 18, topY + 22, 10, 16);
      }
      ctx.fillStyle = "#FF4444";
      ctx.font = "bold 6px monospace";
      ctx.textAlign = "center";
      ctx.fillText("WANTED", cx, topY + 8);

      // ── Prison cell with criminal (top-right corner) ─────────────────
      const cellX = W * 0.78;
      const cellY = topY + 8;
      const cellW = 72;
      const cellH = 58;

      // Cell floor/interior
      ctx.fillStyle = "#0a0e14";
      ctx.strokeStyle = "#3a4a6a";
      ctx.lineWidth = 2;
      rr(cellX, cellY, cellW, cellH, 2);
      ctx.fill();
      ctx.stroke();

      // Cell bench
      ctx.fillStyle = "#2a2a3a";
      rr(cellX + 4, cellY + cellH - 16, cellW - 8, 12, 2);
      ctx.fill();

      // Cell bars (vertical)
      ctx.strokeStyle = "#6688AA";
      ctx.lineWidth = 3;
      for (let bi = 0; bi < 5; bi++) {
        ctx.beginPath();
        ctx.moveTo(cellX + 10 + bi * 14, cellY);
        ctx.lineTo(cellX + 10 + bi * 14, cellY + cellH);
        ctx.stroke();
      }
      // Horizontal bars
      ctx.beginPath();
      ctx.moveTo(cellX, cellY + cellH * 0.33);
      ctx.lineTo(cellX + cellW, cellY + cellH * 0.33);
      ctx.moveTo(cellX, cellY + cellH * 0.66);
      ctx.lineTo(cellX + cellW, cellY + cellH * 0.66);
      ctx.stroke();

      // Criminal sitting on bench
      const crimX = cellX + cellW / 2;
      const crimY = cellY + cellH - 24;

      // Legs
      ctx.fillStyle = "#4a4a4a";
      ctx.fillRect(crimX - 7, crimY + 6, 6, 10);
      ctx.fillRect(crimX + 1, crimY + 6, 6, 10);

      // Body (orange jumpsuit)
      ctx.fillStyle = "#DD6600";
      ctx.beginPath();
      ctx.roundRect(crimX - 9, crimY - 10, 18, 18, 3);
      ctx.fill();

      // Arms
      ctx.fillRect(crimX - 14, crimY - 6, 6, 12);
      ctx.fillRect(crimX + 8, crimY - 6, 6, 12);

      // Head
      ctx.fillStyle = "#CCAA88";
      ctx.beginPath();
      ctx.arc(crimX, crimY - 18, 8, 0, Math.PI * 2);
      ctx.fill();

      // Shaved head
      ctx.fillStyle = "#3a3a3a";
      ctx.beginPath();
      ctx.arc(crimX, crimY - 20, 7, Math.PI, 0);
      ctx.fill();

      // Angry eyes
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(crimX - 3, crimY - 18, 2, 0, Math.PI * 2);
      ctx.arc(crimX + 3, crimY - 18, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(crimX - 3, crimY - 18, 1, 0, Math.PI * 2);
      ctx.arc(crimX + 3, crimY - 18, 1, 0, Math.PI * 2);
      ctx.fill();

      // Frown
      ctx.strokeStyle = "#886655";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(crimX, crimY - 12, 3, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // ── Second empty prison cell (below first) ─────────────────
      const cell2Y = cellY + cellH + 10;
      ctx.fillStyle = "#0a0e14";
      ctx.strokeStyle = "#3a4a6a";
      ctx.lineWidth = 2;
      rr(cellX, cell2Y, cellW, cellH, 2);
      ctx.fill();
      ctx.stroke();
      // Cell bench
      ctx.fillStyle = "#2a2a3a";
      rr(cellX + 4, cell2Y + cellH - 16, cellW - 8, 12, 2);
      ctx.fill();
      // Cell bars
      ctx.strokeStyle = "#6688AA";
      ctx.lineWidth = 3;
      for (let bi = 0; bi < 5; bi++) {
        ctx.beginPath();
        ctx.moveTo(cellX + 10 + bi * 14, cell2Y);
        ctx.lineTo(cellX + 10 + bi * 14, cell2Y + cellH);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cellX, cell2Y + cellH * 0.33);
      ctx.lineTo(cellX + cellW, cell2Y + cellH * 0.33);
      ctx.moveTo(cellX, cell2Y + cellH * 0.66);
      ctx.lineTo(cellX + cellW, cell2Y + cellH * 0.66);
      ctx.stroke();

      // ── Officer's desk (left-center) ───────────────
      const deskX = W * 0.12;
      const deskY = H * 0.38;
      ctx.fillStyle = "#2a3040";
      ctx.strokeStyle = "#4477FF";
      ctx.lineWidth = 1.5;
      rr(deskX, deskY, 85, 36, 3);
      ctx.fill();
      ctx.stroke();
      // Computer monitor
      ctx.fillStyle = "#0a1020";
      rr(deskX + 50, deskY + 4, 28, 20, 2);
      ctx.fill();
      ctx.fillStyle = "#4488FF";
      ctx.fillRect(deskX + 52, deskY + 6, 24, 14);
      // Desk items
      ctx.fillStyle = "#EEDDCC";
      ctx.fillRect(deskX + 8, deskY + 8, 20, 14);
      ctx.fillStyle = "#FF4444";
      ctx.beginPath();
      ctx.arc(deskX + 38, deskY + 16, 5, 0, Math.PI * 2);
      ctx.fill();

      // ── Filing cabinets (bottom-left) ───────────────
      ctx.fillStyle = "#3a3a4a";
      ctx.strokeStyle = "#5a5a6a";
      ctx.lineWidth = 1;
      rr(W * 0.08, midY + 30, 32, 48, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2a2a3a";
      for (let fi = 0; fi < 3; fi++) {
        rr(W * 0.08 + 3, midY + 34 + fi * 15, 26, 13, 1);
        ctx.fill();
      }
      // Second cabinet
      ctx.fillStyle = "#3a3a4a";
      rr(W * 0.08 + 38, midY + 30, 32, 48, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2a2a3a";
      for (let fi = 0; fi < 3; fi++) {
        rr(W * 0.08 + 41, midY + 34 + fi * 15, 26, 13, 1);
        ctx.fill();
      }

      // ── Second desk with chair (center-bottom area) ───────────────
      const desk2X = W * 0.32;
      const desk2Y = H * 0.54;
      ctx.fillStyle = "#2a3040";
      ctx.strokeStyle = "#4477FF";
      ctx.lineWidth = 1.5;
      rr(desk2X, desk2Y, 90, 38, 3);
      ctx.fill();
      ctx.stroke();
      // Computer monitor on desk
      ctx.fillStyle = "#0a1020";
      rr(desk2X + 55, desk2Y + 5, 28, 20, 2);
      ctx.fill();
      ctx.fillStyle = "#4488FF";
      ctx.fillRect(desk2X + 57, desk2Y + 7, 24, 14);
      // Papers and items
      ctx.fillStyle = "#EEDDCC";
      ctx.fillRect(desk2X + 8, desk2Y + 8, 22, 16);
      ctx.fillStyle = "#886644";
      ctx.fillRect(desk2X + 10, desk2Y + 10, 18, 2);
      ctx.fillRect(desk2X + 10, desk2Y + 14, 18, 2);
      ctx.fillRect(desk2X + 10, desk2Y + 18, 18, 2);
      // Coffee mug
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(desk2X + 42, desk2Y + 18, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a2a1a";
      ctx.beginPath();
      ctx.arc(desk2X + 42, desk2Y + 18, 3, 0, Math.PI * 2);
      ctx.fill();

      // Chair for sitting officer
      const chairX = desk2X + 20;
      const chairY = desk2Y + 42;
      ctx.fillStyle = "#2a2a3a";
      ctx.strokeStyle = "#4a4a5a";
      ctx.lineWidth = 1;
      // Chair seat
      rr(chairX - 12, chairY, 24, 18, 3);
      ctx.fill();
      ctx.stroke();
      // Chair back
      ctx.fillStyle = "#3a3a4a";
      rr(chairX - 10, chairY - 20, 20, 22, 3);
      ctx.fill();
      ctx.stroke();
    } else if (type === 16) {
      // TATTOO PARLOR
      // ── Reclining chair (center) ──────────────────
      ctx.fillStyle = "#1a0a18";
      ctx.strokeStyle = "#FF44AA";
      ctx.lineWidth = 1.5;
      rr(cx - 48, midY - 16, 96, 38, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2a1028";
      rr(cx - 44, midY - 12, 88, 28, 4);
      ctx.fill();
      // Headrest
      ctx.fillStyle = "#1a0820";
      rr(cx + 32, midY - 20, 20, 18, 5);
      ctx.fill();
      // ── Tattoo flash art wall (top) ───────────────
      ctx.fillStyle = "#0a0814";
      ctx.strokeStyle = "#FF44AA";
      ctx.lineWidth = 1;
      rr(cx - W * 0.44, topY + 4, W * 0.88, 48, 2);
      ctx.fill();
      ctx.stroke();
      const tattooIcons = ["🐉", "💀", "⚡", "🌹", "🦋", "🗡"];
      ctx.font = "16px serif";
      ctx.textAlign = "center";
      for (let ti = 0; ti < 6; ti++) {
        const tx2 = cx - W * 0.38 + ti * ((W * 0.76) / 5);
        ctx.fillText(tattooIcons[ti], tx2, topY + 32);
        ctx.strokeStyle = "#FF44AA33";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(tx2 - 12, topY + 8, 24, 30);
      }
      // ── Ink station (right) ───────────────────────
      ctx.fillStyle = "#0a0814";
      ctx.strokeStyle = "#AA44FF";
      ctx.lineWidth = 1.5;
      rr(cx + W * 0.2, topY + 58, 52, 52, 3);
      ctx.fill();
      ctx.stroke();
      const inkColors = [
        "#FF0044",
        "#0044FF",
        "#00FF88",
        "#FFCC00",
        "#FF44AA",
        "#AA00FF",
      ];
      for (let ii = 0; ii < 6; ii++) {
        ctx.fillStyle = inkColors[ii];
        ctx.shadowColor = inkColors[ii];
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.roundRect(
          cx + W * 0.22 + (ii % 3) * 15,
          topY + 60 + Math.floor(ii / 3) * 22,
          11,
          18,
          [3, 3, 0, 0],
        );
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      // Neon TATTOO sign
      ctx.fillStyle = "#FF44AA";
      ctx.shadowColor = "#FF00CC";
      ctx.shadowBlur = 15;
      ctx.font = "bold 12px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillText("INK CITY", cx - W * 0.1, midY + 30);
      ctx.shadowBlur = 0;
    } else if (type === 17) {
      // AMMO DEPOT
      // ── Ammo crate wall (top + right) ────────────
      const ammoColors = ["#664422", "#553311", "#776633", "#443311"];
      for (let row = 0; row < 2; row++)
        for (let col = 0; col < 6; col++) {
          const ax = cx - W * 0.42 + col * W * 0.14,
            ay = topY + 4 + row * 26;
          ctx.fillStyle = ammoColors[(row + col) % 4];
          ctx.strokeStyle = "#FFAA44";
          ctx.lineWidth = 0.7;
          rr(ax, ay, W * 0.12, 22, 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#FFAA44";
          ctx.font = "bold 5px monospace";
          ctx.textAlign = "center";
          ctx.fillText("AMMO", ax + W * 0.06, ay + 14);
        }
      // ── Weapon rack (center) ──────────────────────
      ctx.fillStyle = "#1a1410";
      ctx.strokeStyle = "#886644";
      ctx.lineWidth = 1.5;
      rr(cx - W * 0.3, midY - 10, W * 0.6, 36, 3);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#664422";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - W * 0.28, midY - 10);
      ctx.lineTo(cx - W * 0.28, midY + 26);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - W * 0.28, midY + 4);
      ctx.lineTo(cx + W * 0.28, midY + 4);
      ctx.stroke();
      const weaponIcons = ["🔫", "⚙", "🔩", "🔫", "⚙"];
      ctx.font = "15px serif";
      ctx.textAlign = "center";
      for (let wi = 0; wi < 5; wi++)
        ctx.fillText(weaponIcons[wi], cx - W * 0.22 + wi * W * 0.11, midY + 1);
      // ── Target range (back) ───────────────────────
      for (let ti = 0; ti < 3; ti++) {
        const tx2 = cx - W * 0.28 + ti * W * 0.28;
        ctx.fillStyle = "#EEDDCC";
        ctx.strokeStyle = "#AA4422";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(tx2, topY + 26, 14, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = "#FF4422";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(tx2, topY + 26, 9, 12, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "#FF2222";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(tx2, topY + 26, 4, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (type === 18) {
      // HACKER DEN
      // ── Monitor wall (top) ───────────────────────
      for (let mi = 0; mi < 4; mi++) {
        const mx2 = cx - W * 0.4 + mi * ((W * 0.8) / 3);
        ctx.fillStyle = "#050a08";
        ctx.strokeStyle = "#00FF88";
        ctx.lineWidth = 1;
        rr(mx2 - 18, topY + 4, 36, 28, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#001a10";
        ctx.fillRect(mx2 - 16, topY + 6, 32, 24);
        ctx.fillStyle = "#00FF88";
        ctx.shadowColor = "#00FF44";
        ctx.shadowBlur = 6;
        ctx.font = "4px monospace";
        ctx.textAlign = "center";
        for (let li = 0; li < 4; li++) {
          const lineText =
            "01" +
            Math.floor(Math.random() * 1000)
              .toString()
              .padStart(4, "0");
          ctx.fillText(lineText, mx2, topY + 10 + li * 5);
        }
        ctx.shadowBlur = 0;
      }
      // ── Hacker desk (center) ─────────────────────
      ctx.fillStyle = "#050a08";
      ctx.strokeStyle = "#00FF88";
      ctx.lineWidth = 1.5;
      rr(cx - 52, midY - 8, 104, 32, 4);
      ctx.fill();
      ctx.stroke();
      // Triple monitor setup
      for (let mi2 = -1; mi2 <= 1; mi2++) {
        ctx.fillStyle = "#020806";
        ctx.strokeStyle = "#00FF44";
        ctx.lineWidth = 1;
        rr(cx + mi2 * 34 - 14, midY - 24, 28, 18, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#001a10";
        ctx.fillRect(cx + mi2 * 34 - 12, midY - 22, 24, 14);
        ctx.fillStyle = "#00FF88";
        ctx.shadowColor = "#00FF44";
        ctx.shadowBlur = 5;
        ctx.fillRect(cx + mi2 * 34 - 10, midY - 20, 20, 4);
        ctx.fillRect(cx + mi2 * 34 - 10, midY - 14, 20, 2);
        ctx.shadowBlur = 0;
      }
      // Keyboard
      ctx.fillStyle = "#0a1208";
      rr(cx - 30, midY - 4, 60, 12, 2);
      ctx.fill();
      for (let ki = 0; ki < 9; ki++) {
        ctx.fillStyle =
          "#00FF88" + Math.floor(Math.random() * 99 + 20).toString(16);
        ctx.fillRect(cx - 28 + ki * 7, midY - 2, 5, 8);
      }
      // ── Pizza boxes (on floor) ────────────────────
      ctx.fillStyle = "#4a2a10";
      ctx.strokeStyle = "#8a5a28";
      ctx.lineWidth = 1;
      for (let pi = 0; pi < 3; pi++) {
        rr(cx - W * 0.4 + pi * 24, midY + 28, 22, 22, 1);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#FF6622";
        ctx.beginPath();
        ctx.arc(cx - W * 0.4 + pi * 24 + 11, midY + 39, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#4a2a10";
      }
    } else if (type === 19) {
      // DOJO
      // ── Tatami mat (center) ──────────────────────
      ctx.fillStyle = "#4a3820";
      ctx.strokeStyle = "#8a6840";
      ctx.lineWidth = 1.5;
      rr(cx - W * 0.38, midY - W * 0.22, W * 0.76, W * 0.44, 3);
      ctx.fill();
      ctx.stroke();
      // Mat pattern
      ctx.strokeStyle = "#6a5030";
      ctx.lineWidth = 0.5;
      for (let mi = -1; mi <= 1; mi++) {
        ctx.beginPath();
        ctx.moveTo(cx + mi * W * 0.19, midY - W * 0.22);
        ctx.lineTo(cx + mi * W * 0.19, midY + W * 0.22);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx - W * 0.38, midY);
      ctx.lineTo(cx + W * 0.38, midY);
      ctx.stroke();
      // ── Weapons rack (top left) ───────────────────
      ctx.fillStyle = "#2a1a10";
      ctx.strokeStyle = "#8a5a28";
      ctx.lineWidth = 1.5;
      rr(cx - W * 0.44, topY + 4, 52, 60, 2);
      ctx.fill();
      ctx.stroke();
      const dojoWeapons = ["🗡", "🥊", "🪃", "⚔"];
      ctx.font = "16px serif";
      ctx.textAlign = "center";
      dojoWeapons.forEach((w, i) =>
        ctx.fillText(
          w,
          cx - W * 0.44 + 14 + (i % 2) * 24,
          topY + 20 + Math.floor(i / 2) * 28,
        ),
      );
      // ── Punching bag (top right) ──────────────────
      const pbx = cx + W * 0.3,
        pby = topY + 16;
      ctx.fillStyle = "#662222";
      ctx.strokeStyle = "#884444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(pbx, pby, 14, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#442222";
      ctx.beginPath();
      ctx.arc(pbx, pby - 10, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#AA6644";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pbx, pby - 26);
      ctx.lineTo(pbx, topY);
      ctx.stroke();
      // ── Calligraphy scroll (wall) ─────────────────
      ctx.fillStyle = "#F5E8D0";
      ctx.strokeStyle = "#8a6840";
      ctx.lineWidth = 1;
      rr(cx + W * 0.1, topY + 4, 30, 70, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2a1a10";
      ctx.font = "bold 12px serif";
      ctx.textAlign = "center";
      ctx.fillText("武", cx + W * 0.1 + 15, topY + 30);
      ctx.fillText("道", cx + W * 0.1 + 15, topY + 54);
    } else if (type === 20) {
      // SAFEHOUSE
      // ── Bed (top-left) ────────────────────────────
      ctx.fillStyle = "#1a2438";
      ctx.strokeStyle = "#2a3a5a";
      ctx.lineWidth = 1.5;
      rr(cx - W * 0.44, topY + 4, 70, 52, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2a3a5a";
      rr(cx - W * 0.44, topY + 4, 70, 14, [4, 4, 0, 0]);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF44";
      rr(cx - W * 0.4, topY + 20, 62, 34, 2);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF88";
      rr(cx - W * 0.42, topY + 22, 26, 16, 3);
      ctx.fill();
      // ── Computer station (right) ──────────────────
      ctx.fillStyle = "#0a1018";
      ctx.strokeStyle = "#2244AA";
      ctx.lineWidth = 1.5;
      rr(cx + W * 0.16, topY + 4, 64, 60, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#050810";
      rr(cx + W * 0.16 + 4, topY + 8, 56, 34, 2);
      ctx.fill();
      // Maps on screen
      ctx.strokeStyle = "#2244AA";
      ctx.lineWidth = 0.7;
      for (let li = 0; li < 4; li++)
        ctx.strokeRect(cx + W * 0.16 + 8 + li * 13, topY + 12, 10, 10);
      ctx.strokeStyle = "#FFCC00";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx + W * 0.16 + 28, topY + 28, 6, 0, Math.PI * 2);
      ctx.stroke();
      // ── Safe (bottom-right) ───────────────────────
      ctx.fillStyle = "#2a2a2a";
      ctx.strokeStyle = "#666666";
      ctx.lineWidth = 2;
      rr(cx + W * 0.24, midY + 2, 44, 44, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#444444";
      rr(cx + W * 0.24 + 4, midY + 6, 36, 36, 2);
      ctx.fill();
      ctx.fillStyle = "#AAAAAA";
      ctx.shadowColor = "#AAAAAA";
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(cx + W * 0.24 + 22, midY + 24, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(cx + W * 0.24 + 22, midY + 24, 4, 0, Math.PI * 2);
      ctx.fill();
      // ── Corkboard (center top) ────────────────────
      ctx.fillStyle = "#8B5E3C";
      ctx.strokeStyle = "#6B4E2C";
      ctx.lineWidth = 1;
      rr(cx - W * 0.12, topY + 4, W * 0.24, 48, 2);
      ctx.fill();
      ctx.stroke();
      const pinColors = ["#FF3333", "#3333FF", "#33FF33", "#FFCC00"];
      for (let pi = 0; pi < 4; pi++) {
        const px2 = cx - W * 0.1 + (pi % 2) * (W * 0.08),
          py2 = topY + 12 + Math.floor(pi / 2) * 22;
        ctx.fillStyle = "#FFFFEE";
        ctx.fillRect(px2, py2, W * 0.07, 14);
        ctx.fillStyle = pinColors[pi];
        ctx.beginPath();
        ctx.arc(px2 + W * 0.035, py2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 21) {
      // CHOP SHOP
      const isSnowChop = !!this.map?.config?.snow;
      const t = performance.now() / 1000;

      if (isSnowChop) {
        // ═══ FROZEN TUNDRA: ICE CHOP SHOP ═══

        // ── Shop sign ───────────────────
        ctx.fillStyle = "#AADDFF";
        ctx.shadowColor = "#66BBFF";
        ctx.shadowBlur = 12;
        ctx.font = "bold 10px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("❄ FROST CHOP SHOP ❄", cx, topY - 4);
        ctx.shadowBlur = 0;

        // ── Car lift with stripped vehicle (center) ───────────────────
        // Lift platform
        ctx.fillStyle = "#1a2830";
        ctx.strokeStyle = "#3a5868";
        ctx.lineWidth = 2;
        rr(cx - 60, midY - 20, 120, 50, 4);
        ctx.fill();
        ctx.stroke();
        // Lift hydraulics
        ctx.fillStyle = "#4a6878";
        ctx.fillRect(cx - 55, midY + 30, 10, 25);
        ctx.fillRect(cx + 45, midY + 30, 10, 25);

        // Stripped car body on lift
        ctx.fillStyle = "#2a4050";
        ctx.strokeStyle = "#4a6878";
        ctx.lineWidth = 1.5;
        rr(cx - 45, midY - 15, 90, 30, 4);
        ctx.fill();
        ctx.stroke();
        // Car roof cutaway
        ctx.fillStyle = "#1a3040";
        rr(cx - 30, midY - 20, 60, 12, 3);
        ctx.fill();
        // Missing parts (holes)
        ctx.fillStyle = "#0a1520";
        ctx.beginPath();
        ctx.arc(cx - 30, midY + 8, 12, 0, Math.PI * 2);
        ctx.arc(cx + 30, midY + 8, 12, 0, Math.PI * 2);
        ctx.fill();
        // Sparks from cutting
        const sparkPulse = Math.sin(t * 6) * 0.5 + 0.5;
        if (sparkPulse > 0.6) {
          ctx.fillStyle = "#FFAA44";
          ctx.shadowColor = "#FF8800";
          ctx.shadowBlur = 8;
          for (let sp = 0; sp < 5; sp++) {
            const sx = cx - 20 + Math.random() * 40;
            const sy = midY - 10 + Math.random() * 20;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.shadowBlur = 0;
        }

        // ── Tool wall (left) ───────────────────
        ctx.fillStyle = "#0c1820";
        ctx.strokeStyle = "#3a5868";
        ctx.lineWidth = 1.5;
        rr(cx - W * 0.44, topY + 6, 55, 80, 2);
        ctx.fill();
        ctx.stroke();
        // Tools on pegboard
        const tools = [
          { x: 10, y: 12, icon: "🔧", size: 14 },
          { x: 30, y: 14, icon: "⚙", size: 14 },
          { x: 10, y: 34, icon: "🔩", size: 12 },
          { x: 30, y: 32, icon: "🪛", size: 14 },
          { x: 10, y: 54, icon: "🔨", size: 14 },
          { x: 30, y: 56, icon: "🪚", size: 14 },
        ];
        tools.forEach(tool => {
          ctx.font = `${tool.size}px serif`;
          ctx.fillText(tool.icon, cx - W * 0.44 + tool.x, topY + 6 + tool.y);
        });

        // ── Parts shelf (right) ───────────────────
        ctx.fillStyle = "#0c1820";
        ctx.strokeStyle = "#3a5868";
        ctx.lineWidth = 1.5;
        rr(cx + W * 0.2, topY + 6, 60, 75, 2);
        ctx.fill();
        ctx.stroke();
        // Shelf dividers
        ctx.fillStyle = "#2a4050";
        ctx.fillRect(cx + W * 0.2, topY + 30, 60, 3);
        ctx.fillRect(cx + W * 0.2, topY + 54, 60, 3);
        // Car parts on shelves
        const parts = [
          { x: 8, y: 10, w: 18, h: 14, color: "#4a6878" },
          { x: 32, y: 12, w: 22, h: 12, color: "#3a5868" },
          { x: 10, y: 36, w: 20, h: 14, color: "#5a7888" },
          { x: 36, y: 34, w: 16, h: 16, color: "#4a6070" },
          { x: 12, y: 60, w: 16, h: 12, color: "#3a5060" },
          { x: 34, y: 58, w: 20, h: 14, color: "#4a6878" },
        ];
        for (const part of parts) {
          ctx.fillStyle = part.color;
          rr(cx + W * 0.2 + part.x, topY + 6 + part.y, part.w, part.h, 2);
          ctx.fill();
        }

        // ── Tire stack (bottom left) ───────────────────
        for (let ti = 0; ti < 3; ti++) {
          ctx.fillStyle = "#1a1a1a";
          ctx.strokeStyle = "#3a3a3a";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(cx - W * 0.38 + ti * 6, midY + 40 + ti * 2, 16, 10, 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // Tire rim
          ctx.fillStyle = "#4a6070";
          ctx.beginPath();
          ctx.arc(cx - W * 0.38 + ti * 6, midY + 40 + ti * 2, 6, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── Oil barrel (bottom right) ───────────────────
        ctx.fillStyle = "#2a4050";
        ctx.strokeStyle = "#4a6878";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx + W * 0.32, midY + 44, 18, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#1a3040";
        ctx.fillRect(cx + W * 0.32 - 16, midY + 44, 32, 18);
        ctx.fillStyle = "#66BBFF";
        ctx.font = "bold 6px monospace";
        ctx.textAlign = "center";
        ctx.fillText("OIL", cx + W * 0.32, midY + 56);

        // ── Ice particles ───────────────────
        for (let i = 0; i < 6; i++) {
          const px2 = W * 0.1 + (t * 10 + i * 50) % (W * 0.8);
          const py2 = topY + 15 + Math.sin(t * 0.7 + i * 2) * 20 + i * 10;
          const alpha = Math.sin(t * 1.5 + i) * 0.25 + 0.3;
          ctx.fillStyle = `rgba(180,220,255,${alpha})`;
          ctx.beginPath();
          ctx.arc(px2, py2, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

      } else {
        // ═══ DEFAULT CHOP SHOP (ENHANCED) ═══

        // ── Shop sign ───────────────────
        ctx.fillStyle = "#FF6633";
        ctx.shadowColor = "#FF4400";
        ctx.shadowBlur = 10;
        ctx.font = "bold 10px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("⚙ CHOP SHOP ⚙", cx, topY - 2);
        ctx.shadowBlur = 0;

        // ── Car lift with stripped vehicle (center) ───────────────────
        // Lift platform
        ctx.fillStyle = "#2a2a2a";
        ctx.strokeStyle = "#555555";
        ctx.lineWidth = 2;
        rr(cx - 60, midY - 20, 120, 50, 4);
        ctx.fill();
        ctx.stroke();
        // Yellow safety stripes
        ctx.fillStyle = "#FFCC00";
        for (let si = 0; si < 8; si++) {
          ctx.fillRect(cx - 58 + si * 15, midY - 18, 8, 4);
        }
        // Lift hydraulics
        ctx.fillStyle = "#666666";
        ctx.fillRect(cx - 55, midY + 30, 10, 25);
        ctx.fillRect(cx + 45, midY + 30, 10, 25);

        // Stripped car body on lift
        ctx.fillStyle = "#3a3a4a";
        ctx.strokeStyle = "#5a5a6a";
        ctx.lineWidth = 1.5;
        rr(cx - 45, midY - 15, 90, 30, 4);
        ctx.fill();
        ctx.stroke();
        // Car roof (partially cut)
        ctx.fillStyle = "#2a2a3a";
        rr(cx - 30, midY - 22, 60, 12, 3);
        ctx.fill();
        // Missing wheel areas
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.arc(cx - 30, midY + 8, 12, 0, Math.PI * 2);
        ctx.arc(cx + 30, midY + 8, 12, 0, Math.PI * 2);
        ctx.fill();
        // Exposed engine
        ctx.fillStyle = "#444455";
        rr(cx - 10, midY - 8, 20, 16, 2);
        ctx.fill();
        ctx.fillStyle = "#FF6600";
        ctx.shadowColor = "#FF6600";
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(cx, midY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // ── Tool wall (left) ───────────────────
        ctx.fillStyle = "#1a1408";
        ctx.strokeStyle = "#556644";
        ctx.lineWidth = 1.5;
        rr(cx - W * 0.44, topY + 4, 55, 85, 2);
        ctx.fill();
        ctx.stroke();
        // Tool pegboard holes
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 3; col++) {
            ctx.fillStyle = "#0a0804";
            ctx.beginPath();
            ctx.arc(cx - W * 0.44 + 12 + col * 16, topY + 20 + row * 18, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // Tools hanging
        const chopTools = ["🔨", "🪚", "⛏", "🔧", "🪛", "🔩"];
        ctx.font = "14px serif";
        ctx.textAlign = "center";
        chopTools.forEach((tool, i) =>
          ctx.fillText(
            tool,
            cx - W * 0.44 + 14 + (i % 2) * 24,
            topY + 22 + Math.floor(i / 2) * 26,
          ),
        );

        // ── Parts shelf (right) ───────────────────
        ctx.fillStyle = "#2a2a20";
        ctx.strokeStyle = "#5a5a48";
        ctx.lineWidth = 1.5;
        rr(cx + W * 0.2, topY + 4, 62, 80, 2);
        ctx.fill();
        ctx.stroke();
        // Shelves
        ctx.fillStyle = "#3a3a30";
        ctx.fillRect(cx + W * 0.2, topY + 30, 62, 4);
        ctx.fillRect(cx + W * 0.2, topY + 56, 62, 4);
        // Parts on shelves
        const partColors = ["#666677", "#555566", "#777788", "#888899"];
        for (let si = 0; si < 3; si++) {
          for (let pi = 0; pi < 2; pi++) {
            ctx.fillStyle = partColors[(si + pi) % partColors.length];
            rr(cx + W * 0.2 + 8 + pi * 28, topY + 10 + si * 26, 22, 16, 2);
            ctx.fill();
          }
        }

        // ── Tire stack (bottom left) ───────────────────
        for (let ti = 0; ti < 4; ti++) {
          ctx.fillStyle = "#1a1a1a";
          ctx.strokeStyle = "#333333";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(cx - W * 0.36 + ti * 5, midY + 42 + ti * 2, 15, 9, 0.15, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#666666";
          ctx.beginPath();
          ctx.arc(cx - W * 0.36 + ti * 5, midY + 42 + ti * 2, 5, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── Oil barrels (bottom right) ───────────────────
        for (let bi = 0; bi < 2; bi++) {
          ctx.fillStyle = "#333344";
          ctx.strokeStyle = "#555566";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(cx + W * 0.28 + bi * 26, midY + 46, 14, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#222233";
          ctx.fillRect(cx + W * 0.28 + bi * 26 - 12, midY + 46, 24, 16);
          ctx.fillStyle = bi === 0 ? "#FF4400" : "#00AAFF";
          ctx.font = "bold 5px monospace";
          ctx.textAlign = "center";
          ctx.fillText(bi === 0 ? "OIL" : "COOL", cx + W * 0.28 + bi * 26, midY + 58);
        }

        // ── Spray paint cans (floor) ───────────────────
        for (let si = 0; si < 4; si++) {
          ctx.fillStyle = ["#FF3344", "#3344FF", "#33FF44", "#FFCC33"][si];
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.roundRect(cx - 20 + si * 14, midY + 36, 10, 18, [4, 4, 0, 0]);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    } else if (type === 22) {
      // RADIO STATION
      if (!!this.map?.config?.galactica) {
        // ═══ GALACTICA: NOVA BROADCAST ═══
        const t = performance.now() / 1000;

        // ── Cosmic floor tiles ────────────────────────
        const tileSize = 54;
        for (let gy = 0; gy < Math.ceil(H / tileSize) + 1; gy++) {
          for (let gx = 0; gx < Math.ceil(W / tileSize) + 1; gx++) {
            const tx = gx * tileSize, ty = gy * tileSize;
            const seed = gx * 19 + gy * 13;
            ctx.fillStyle = (seed % 3 === 0) ? "rgba(20,0,30,0.88)"
                          : (seed % 3 === 1) ? "rgba(14,0,24,0.88)"
                          : "rgba(18,0,28,0.88)";
            ctx.fillRect(tx, ty, tileSize, tileSize);
            ctx.strokeStyle = "rgba(255,80,200,0.12)";
            ctx.lineWidth = 0.5;
            ctx.strokeRect(tx, ty, tileSize, tileSize);
            if (seed % 5 === 0) {
              ctx.fillStyle = `rgba(255,120,220,${0.22 + 0.12 * Math.sin(t * 1.3 + seed)})`;
              ctx.beginPath();
              ctx.arc(tx + 27, ty + 27, 1.2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // ── Room border glow ──────────────────────────
        ctx.strokeStyle = "rgba(255,80,200,0.55)";
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, W - 4, H - 4);
        ctx.strokeStyle = "rgba(180,60,255,0.18)";
        ctx.lineWidth = 1;
        ctx.strokeRect(6, 6, W - 12, H - 12);

        // ── Title sign ────────────────────────────────
        const signW = 340, signH = 28;
        const signX = W / 2 - signW / 2, signY = room.S - 24;
        const signGrad = ctx.createLinearGradient(signX, signY, signX + signW, signY);
        signGrad.addColorStop(0, "rgba(80,0,60,0.92)");
        signGrad.addColorStop(0.5, "rgba(200,0,140,0.98)");
        signGrad.addColorStop(1, "rgba(80,0,60,0.92)");
        ctx.fillStyle = signGrad;
        rr(signX, signY, signW, signH, 6);
        ctx.fill();
        ctx.strokeStyle = `rgba(255,100,220,${0.7 + 0.3 * Math.sin(t * 2.4)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#FFDDFF";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.fillText("◉  NOVA BROADCAST  ◉", W / 2, signY + 18);

        // ── ON AIR sign (animated blink) ──────────────
        const onAirAlpha = 0.7 + 0.3 * Math.sin(t * 4);
        ctx.fillStyle = `rgba(255,20,60,${onAirAlpha})`;
        ctx.shadowColor = "#FF0040";
        ctx.shadowBlur = 16 * onAirAlpha;
        rr(W / 2 - 44, topY + 36, 88, 22, 5);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(255,80,100,${onAirAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText("● ON AIR", W / 2, topY + 51);

        // ── Broadcast desk (main, top-center) ─────────
        const deskY = topY + 66, deskW = 420, deskH = 34;
        const deskX = W / 2 - deskW / 2;
        const deskGrad = ctx.createLinearGradient(deskX, deskY, deskX + deskW, deskY);
        deskGrad.addColorStop(0, "#1a0028");
        deskGrad.addColorStop(0.5, "#2e0048");
        deskGrad.addColorStop(1, "#1a0028");
        ctx.fillStyle = deskGrad;
        rr(deskX, deskY, deskW, deskH, 6);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,80,200,0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,120,220,0.08)";
        ctx.fillRect(deskX + 4, deskY + 3, deskW - 8, 7);

        // ── Mixing board on desk ───────────────────────
        const mbX = deskX + 16, mbY = deskY + 4, mbW = deskW - 32, mbH = 26;
        ctx.fillStyle = "#0d0020";
        rr(mbX, mbY, mbW, mbH, 3);
        ctx.fill();
        ctx.strokeStyle = "rgba(200,60,180,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
        // Fader channels
        const faderCount = 14;
        for (let fi = 0; fi < faderCount; fi++) {
          const fx = mbX + 10 + fi * (mbW - 20) / faderCount;
          // Track groove
          ctx.fillStyle = "#1a0030";
          ctx.fillRect(fx + 2, mbY + 3, 5, 20);
          // Fader knob at animated position
          const fPos = 4 + 10 * (0.5 + 0.5 * Math.sin(t * (0.8 + fi * 0.15) + fi));
          ctx.fillStyle = fi % 3 === 0 ? "#FF88CC" : fi % 3 === 1 ? "#AA66FF" : "#88CCFF";
          ctx.fillRect(fx, mbY + 3 + fPos, 9, 5);
        }
        // VU meter (right side of board)
        const vuX = mbX + mbW - 28, vuY = mbY + 3;
        const vuH = 20;
        const vuBars = 5;
        const vuColors = ["#44FF88","#44FF88","#FFCC00","#FF8800","#FF2244"];
        for (let vi = 0; vi < vuBars; vi++) {
          const barH = vuH / vuBars - 1;
          const active = Math.sin(t * 5 + vi * 0.7) > (vi / vuBars - 0.4);
          ctx.fillStyle = active ? vuColors[vi] : "#1a0030";
          ctx.fillRect(vuX, vuY + (vuBars - 1 - vi) * (barH + 1), 24, barH);
        }

        // ── Soundproof foam panels (top wall row) ─────
        const panelCount = 6;
        const panelW = (W - 32) / panelCount - 4;
        for (let pi = 0; pi < panelCount; pi++) {
          const px = 16 + pi * ((W - 32) / panelCount);
          const py = topY + 4;
          ctx.fillStyle = "#120020";
          ctx.strokeStyle = "rgba(180,40,160,0.35)";
          ctx.lineWidth = 1;
          rr(px, py, panelW, 28, 3);
          ctx.fill();
          ctx.stroke();
          // Wedge foam pattern
          const cols = 4, rows = 3;
          const wW = (panelW - 6) / cols, wH = 22 / rows;
          for (let wr = 0; wr < rows; wr++) {
            for (let wc = 0; wc < cols; wc++) {
              ctx.fillStyle = (wr + wc) % 2 === 0 ? "#1e0032" : "#160028";
              ctx.beginPath();
              ctx.moveTo(px + 3 + wc * wW,          py + 3 + wr * wH + wH);
              ctx.lineTo(px + 3 + wc * wW + wW,     py + 3 + wr * wH + wH);
              ctx.lineTo(px + 3 + wc * wW + wW / 2, py + 3 + wr * wH);
              ctx.closePath();
              ctx.fill();
            }
          }
        }

        // ── Left side: speaker monitors ───────────────
        for (let si = 0; si < 2; si++) {
          const spX = 18, spY = H * 0.35 + si * 110;
          const spW = 64, spH = 80;
          ctx.fillStyle = "#100018";
          ctx.strokeStyle = "rgba(255,80,200,0.5)";
          ctx.lineWidth = 1.5;
          rr(spX, spY, spW, spH, 6);
          ctx.fill();
          ctx.stroke();
          // Woofer cone
          const wg = ctx.createRadialGradient(spX + spW/2, spY + 30, 2, spX + spW/2, spY + 30, 22);
          wg.addColorStop(0, "#2a0040");
          wg.addColorStop(0.6, "#180028");
          wg.addColorStop(1, "#0a0018");
          ctx.fillStyle = wg;
          ctx.beginPath();
          ctx.arc(spX + spW / 2, spY + 30, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,80,200,0.4)";
          ctx.lineWidth = 1;
          ctx.stroke();
          // Speaker rings
          for (let ri = 1; ri <= 3; ri++) {
            ctx.strokeStyle = `rgba(255,80,200,${0.15 * ri})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(spX + spW / 2, spY + 30, 7 * ri, 0, Math.PI * 2);
            ctx.stroke();
          }
          // Tweeter
          ctx.fillStyle = "#1a0030";
          ctx.beginPath();
          ctx.arc(spX + spW / 2, spY + 62, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,80,200,0.3)";
          ctx.lineWidth = 0.8;
          ctx.stroke();
          // Pulsing glow when sound is "playing"
          const pulse = 0.3 + 0.2 * Math.sin(t * 6 + si * 1.5);
          const spGlow = ctx.createRadialGradient(spX + spW/2, spY + 30, 0, spX + spW/2, spY + 30, 28);
          spGlow.addColorStop(0, `rgba(255,80,200,${pulse})`);
          spGlow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = spGlow;
          ctx.beginPath();
          ctx.arc(spX + spW / 2, spY + 30, 28, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── Right side: waveform display screen ───────
        const scrX = W - 110, scrY = H * 0.33, scrW = 88, scrH = 64;
        ctx.fillStyle = "#080014";
        ctx.strokeStyle = "rgba(255,80,200,0.6)";
        ctx.lineWidth = 1.5;
        rr(scrX, scrY, scrW, scrH, 5);
        ctx.fill();
        ctx.stroke();
        // Screen inner
        ctx.fillStyle = "#0a0018";
        rr(scrX + 3, scrY + 3, scrW - 6, scrH - 6, 3);
        ctx.fill();
        // Waveform animation
        ctx.strokeStyle = `rgba(255,100,220,0.9)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let wx = 0; wx < scrW - 12; wx += 2) {
          const amp = 10 + 8 * Math.sin(t * 3 + wx * 0.18);
          const wy = scrY + scrH / 2 + amp * Math.sin(t * 8 + wx * 0.22);
          wx === 0 ? ctx.moveTo(scrX + 6 + wx, wy) : ctx.lineTo(scrX + 6 + wx, wy);
        }
        ctx.stroke();
        // Screen label
        ctx.fillStyle = "rgba(255,160,240,0.7)";
        ctx.font = "5px monospace";
        ctx.textAlign = "center";
        ctx.fillText("LIVE SIGNAL", scrX + scrW / 2, scrY + scrH - 6);

        // ── Right side: playlist / track display ──────
        const plX = W - 110, plY = H * 0.55, plW = 88, plH = 96;
        ctx.fillStyle = "#080014";
        ctx.strokeStyle = "rgba(180,60,255,0.5)";
        ctx.lineWidth = 1.5;
        rr(plX, plY, plW, plH, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#AA66FF";
        ctx.font = "bold 5px monospace";
        ctx.textAlign = "center";
        ctx.fillText("▶ NOW PLAYING", plX + plW / 2, plY + 12);
        ctx.strokeStyle = "rgba(180,60,255,0.3)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(plX + 6, plY + 15);
        ctx.lineTo(plX + plW - 6, plY + 15);
        ctx.stroke();
        const tracks = ["NOVA WAVE","VOID BEAT","STARFIELD","PLASMA FX","NEBULA DUB"];
        tracks.forEach((tr, ti) => {
          const isActive = ti === Math.floor(t * 0.4) % tracks.length;
          ctx.fillStyle = isActive ? "#FF88CC" : "rgba(200,140,255,0.6)";
          ctx.font = isActive ? "bold 5px monospace" : "5px monospace";
          ctx.textAlign = "left";
          ctx.fillText((isActive ? "▶ " : "  ") + tr, plX + 7, plY + 26 + ti * 14);
        });

        // ── Equipment rack (center-left wall) ─────────
        const rackX = W * 0.18, rackY = H * 0.32, rackW = 62, rackH = 110;
        ctx.fillStyle = "#0a0018";
        ctx.strokeStyle = "rgba(255,80,200,0.45)";
        ctx.lineWidth = 1.5;
        rr(rackX, rackY, rackW, rackH, 4); ctx.fill(); ctx.stroke();
        // Rack units
        const rackUnits = [
          { col: "#FF88CC", label: "AMP" },
          { col: "#AA66FF", label: "EQ" },
          { col: "#44CCFF", label: "COMP" },
          { col: "#FFCC44", label: "FX" },
          { col: "#88FF88", label: "OUT" },
        ];
        for (let ri = 0; ri < rackUnits.length; ri++) {
          const ru = rackUnits[ri];
          const ruy = rackY + 8 + ri * 20;
          ctx.fillStyle = "#110020";
          ctx.strokeStyle = ru.col + "55"; ctx.lineWidth = 1;
          ctx.fillRect(rackX + 4, ruy, rackW - 8, 16);
          ctx.strokeRect(rackX + 4, ruy, rackW - 8, 16);
          // LED strip
          ctx.fillStyle = ru.col;
          ctx.shadowColor = ru.col; ctx.shadowBlur = 4;
          ctx.fillRect(rackX + 7, ruy + 5, 5, 6);
          ctx.shadowBlur = 0;
          // Knob
          ctx.fillStyle = "#2a0040";
          ctx.beginPath(); ctx.arc(rackX + rackW - 14, ruy + 8, 5, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = ru.col + "88"; ctx.lineWidth = 1; ctx.stroke();
          ctx.fillStyle = ru.col; ctx.font = "4px monospace"; ctx.textAlign = "center";
          ctx.fillText(ru.label, rackX + rackW / 2 + 4, ruy + 10);
        }
        ctx.fillStyle = "rgba(255,80,200,0.5)"; ctx.font = "bold 5px monospace"; ctx.textAlign = "center";
        ctx.fillText("RACK", rackX + rackW / 2, rackY + rackH - 5);

        // ── Headphones on desk ──────────────────────────
        const hpX = deskX + deskW * 0.72, hpY = deskY - 6;
        ctx.fillStyle = "#1a0030";
        ctx.strokeStyle = "rgba(255,80,200,0.6)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(hpX, hpY, 12, Math.PI, 0); ctx.stroke();
        // Ear cups
        ctx.fillStyle = "#2a0044";
        ctx.beginPath(); ctx.ellipse(hpX - 12, hpY, 5, 7, 0.2, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "rgba(255,80,200,0.5)"; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(hpX + 12, hpY, 5, 7, -0.2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        // Inner cushion
        ctx.fillStyle = "rgba(255,80,200,0.25)";
        ctx.beginPath(); ctx.ellipse(hpX - 12, hpY, 3, 5, 0.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(hpX + 12, hpY, 3, 5, -0.2, 0, Math.PI*2); ctx.fill();

        // ── Coffee mug on desk ──────────────────────────
        const mugX = deskX + deskW * 0.85, mugY = deskY;
        ctx.fillStyle = "#1a0028";
        ctx.strokeStyle = "rgba(255,80,200,0.5)"; ctx.lineWidth = 1;
        rr(mugX - 9, mugY - 2, 18, 22, 3); ctx.fill(); ctx.stroke();
        // Coffee liquid
        ctx.fillStyle = "rgba(80,40,0,0.8)";
        ctx.fillRect(mugX - 7, mugY, 14, 16);
        // Steam
        for (let si = 0; si < 3; si++) {
          const sx2 = mugX - 4 + si * 4;
          const sa = Math.sin(t * 2 + si * 1.2) * 3;
          ctx.strokeStyle = `rgba(255,200,160,${0.3 + 0.15 * Math.sin(t * 1.5 + si)})`;
          ctx.lineWidth = 1; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(sx2 + sa, mugY - 2); ctx.lineTo(sx2 - sa, mugY - 8); ctx.stroke();
          ctx.lineCap = "butt";
        }
        // Handle
        ctx.strokeStyle = "rgba(255,80,200,0.5)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(mugX + 12, mugY + 9, 5, -Math.PI/2, Math.PI/2); ctx.stroke();

        // ── Note papers on desk ─────────────────────────
        const noteX = deskX + 8, noteY = deskY - 4;
        ctx.fillStyle = "rgba(240,230,255,0.85)";
        ctx.save(); ctx.rotate(-0.08);
        ctx.fillRect(noteX, noteY, 28, 20);
        ctx.restore();
        ctx.fillStyle = "rgba(200,150,255,0.85)";
        ctx.save(); ctx.translate(noteX + 18, noteY); ctx.rotate(0.12);
        ctx.fillRect(0, 0, 26, 18); ctx.restore();
        // Lines on notes
        ctx.strokeStyle = "rgba(100,50,200,0.4)"; ctx.lineWidth = 0.7;
        for (let li = 0; li < 3; li++) {
          ctx.beginPath(); ctx.moveTo(noteX + 2, noteY + 4 + li * 5); ctx.lineTo(noteX + 22, noteY + 4 + li * 5); ctx.stroke();
        }

        // ── Presenter NPC at desk ───────────────────────
        const npX = W / 2 - 60, npY = deskY + 18;
        ctx.save();
        // Chair
        ctx.fillStyle = "#180028"; ctx.strokeStyle = "rgba(255,80,200,0.4)"; ctx.lineWidth = 1;
        rr(npX - 14, npY + 6, 28, 22, 4); ctx.fill(); ctx.stroke();
        rr(npX - 13, npY - 8, 26, 14, 3); ctx.fill(); ctx.stroke();
        // Chair legs
        ctx.strokeStyle = "rgba(255,80,200,0.3)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(npX - 10, npY + 28); ctx.lineTo(npX - 12, npY + 38); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(npX + 10, npY + 28); ctx.lineTo(npX + 12, npY + 38); ctx.stroke();
        // Body
        ctx.fillStyle = "#3344AA"; rr(npX - 9, npY - 4, 18, 22, 3); ctx.fill();
        // Collar
        ctx.fillStyle = "#FFDDBB"; ctx.beginPath(); ctx.moveTo(npX - 3, npY - 4); ctx.lineTo(npX, npY); ctx.lineTo(npX + 3, npY - 4); ctx.fill();
        // Neck
        ctx.fillRect(npX - 3, npY - 8, 6, 6);
        // Head
        ctx.beginPath(); ctx.arc(npX, npY - 16, 9, 0, Math.PI*2); ctx.fill();
        // Hair
        ctx.fillStyle = "#1a1a2a";
        ctx.beginPath(); ctx.arc(npX, npY - 20, 8, Math.PI * 1.1, Math.PI * 1.9); ctx.fill();
        ctx.fillRect(npX - 7, npY - 21, 14, 6);
        // Eyes
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.ellipse(npX - 3, npY - 17, 2.2, 1.8, 0, 0, Math.PI*2);
        ctx.ellipse(npX + 3, npY - 17, 2.2, 1.8, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#2244AA";
        ctx.beginPath(); ctx.arc(npX - 3, npY - 17, 1.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(npX + 3, npY - 17, 1.2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath(); ctx.arc(npX - 3, npY - 17, 0.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(npX + 3, npY - 17, 0.5, 0, Math.PI*2); ctx.fill();
        // Eyebrows
        ctx.strokeStyle = "#1a1a2a"; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(npX - 6, npY - 21); ctx.lineTo(npX - 1, npY - 22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(npX + 1, npY - 22); ctx.lineTo(npX + 6, npY - 21); ctx.stroke();
        // Nose
        ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.arc(npX, npY - 14, 1.2, 0, Math.PI*2); ctx.fill();
        // Mouth (talking, open)
        ctx.fillStyle = "#441122";
        ctx.beginPath(); ctx.ellipse(npX, npY - 11, 3, 2.5, 0, 0, Math.PI); ctx.fill();
        ctx.strokeStyle = "#AA6644"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(npX, npY - 11, 3, 0.1, Math.PI - 0.1); ctx.stroke();
        // Arm on desk
        ctx.strokeStyle = "#FFDDBB"; ctx.lineWidth = 3.5; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(npX + 9, npY + 5); ctx.lineTo(npX + 22, npY - 2); ctx.stroke();
        ctx.lineCap = "butt";
        // Headset (on-air)
        ctx.fillStyle = "#0a0018"; ctx.strokeStyle = "rgba(255,80,200,0.7)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(npX, npY - 16, 11, Math.PI, 0); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(npX - 11, npY - 16, 4, 5, 0.2, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "rgba(255,80,200,0.5)"; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(npX + 11, npY - 16, 4, 5, -0.2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        // Boom mic
        ctx.strokeStyle = "rgba(200,120,255,0.7)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(npX + 11, npY - 16); ctx.quadraticCurveTo(npX + 22, npY - 22, npX + 20, npY - 10); ctx.stroke();
        ctx.fillStyle = "#2a0044"; ctx.beginPath(); ctx.ellipse(npX + 20, npY - 10, 4, 6, -0.3, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "rgba(255,80,200,0.6)"; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.restore();

        // ── Center: microphone stand (in front of desk) ─
        const micX = W / 2, micY = deskY + deskH + 36;
        // Stand base
        ctx.fillStyle = "#1a0030";
        ctx.strokeStyle = "rgba(255,80,200,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(micX, micY + 14, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Stand pole
        ctx.strokeStyle = "rgba(200,120,255,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(micX, micY + 14);
        ctx.lineTo(micX, micY - 16);
        ctx.stroke();
        // Arm
        ctx.beginPath();
        ctx.moveTo(micX, micY - 10);
        ctx.lineTo(micX + 18, micY - 20);
        ctx.stroke();
        // Mic capsule
        ctx.fillStyle = "#2a0044";
        ctx.strokeStyle = "rgba(255,80,200,0.7)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(micX + 18, micY - 24, 9, 14, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Mesh grid on mic
        ctx.strokeStyle = "rgba(255,120,220,0.3)";
        ctx.lineWidth = 0.5;
        for (let mg = 0; mg < 4; mg++) {
          ctx.beginPath();
          ctx.ellipse(micX + 18, micY - 24, 9, 14 - mg * 3, -0.3, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Mic glow
        const micGlow = ctx.createRadialGradient(micX + 18, micY - 24, 0, micX + 18, micY - 24, 18);
        micGlow.addColorStop(0, `rgba(255,80,200,${0.25 + 0.15 * Math.sin(t * 3)})`);
        micGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = micGlow;
        ctx.beginPath();
        ctx.arc(micX + 18, micY - 24, 18, 0, Math.PI * 2);
        ctx.fill();

        // ── Sound wave rings (ambient) ─────────────────
        for (let ri = 1; ri <= 3; ri++) {
          const rr2 = ri * 28 + 10 * Math.sin(t * 2 - ri);
          const alpha = (0.18 - ri * 0.04) * (0.5 + 0.5 * Math.sin(t * 2 + ri));
          ctx.strokeStyle = `rgba(255,80,200,${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(micX + 18, micY - 24, rr2, 0, Math.PI * 2);
          ctx.stroke();
        }

        // ── Ambient particles ─────────────────────────
        for (let pi = 0; pi < 7; pi++) {
          const px = (Math.sin(pi * 2.5 + t * 0.45) * 0.38 + 0.5) * W;
          const py = (Math.cos(pi * 1.8 + t * 0.3) * 0.32 + 0.5) * H;
          ctx.fillStyle = `rgba(255,100,220,${0.2 + 0.12 * Math.sin(t * 1.6 + pi)})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── [T] TALK hint ─────────────────────────────
        ctx.fillStyle = "rgba(180,0,120,0.88)";
        rr(W / 2 - 42, topY + 100, 84, 14, 4);
        ctx.fill();
        ctx.fillStyle = "#FFDDFF";
        ctx.font = "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.fillText("[T] TALK TO DJ", W / 2, topY + 110);

      } else if (!!this.map?.config?.zombie) {
        // ═══ ZOMBIE: EMERGENCY BROADCAST ═══
        const t=performance.now()/1000;
        // Blinking ON AIR / EMERGENCY sign
        const ea=0.6+0.4*Math.abs(Math.sin(t*3));
        ctx.fillStyle=`rgba(180,0,0,${ea})`; rr(W/2-60,room.S-22,120,26,5); ctx.fill();
        ctx.strokeStyle=`rgba(255,60,60,${ea})`; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle="#FFCCCC"; ctx.font="bold 10px monospace"; ctx.textAlign="center";
        ctx.fillText("⚠ EMERGENCY BROADCAST", W/2, room.S-9);
        // Broadcast desk (damaged)
        const deskZ=topY+60, deskZW=380, deskZH=30, deskZX=W/2-deskZW/2;
        ctx.fillStyle="#0d1a0d"; rr(deskZX,deskZ,deskZW,deskZH,5); ctx.fill();
        ctx.strokeStyle="rgba(44,180,44,0.6)"; ctx.lineWidth=1.5; ctx.stroke();
        // Crack on desk
        ctx.strokeStyle="rgba(0,0,0,0.5)"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(deskZX+100,deskZ); ctx.lineTo(deskZX+120,deskZ+deskZH); ctx.stroke();
        // Mixing board — damaged, some faders stuck
        for (let fi=0;fi<10;fi++) {
          const fx=deskZX+20+fi*34;
          ctx.fillStyle="#060e06"; ctx.fillRect(fx,deskZ+3,12,24);
          const stuck=fi%3===1;
          ctx.fillStyle=stuck?"rgba(180,0,0,0.8)":`rgba(44,200,44,${0.6+0.4*Math.sin(t*(0.8+fi*0.15)+fi)})`;
          ctx.fillRect(fx+1,deskZ+4+(stuck?0:6+8*Math.sin(t*(0.9+fi*0.1)+fi)),10,5);
        }
        // Soundproof panels (damaged, some torn)
        for (let pi=0;pi<5;pi++) {
          const px5=20+pi*(W-40)/4;
          ctx.fillStyle="#0a1200"; rr(px5,topY+4,(W-40)/4-4,24,3); ctx.fill();
          ctx.strokeStyle="rgba(44,120,44,0.3)"; ctx.lineWidth=0.8; ctx.stroke();
          if (pi%2===0) { // torn panel
            ctx.fillStyle="rgba(0,0,0,0.5)";
            ctx.beginPath(); ctx.moveTo(px5+10,topY+4); ctx.lineTo(px5+18,topY+28); ctx.lineTo(px5+4,topY+28); ctx.closePath(); ctx.fill();
          }
        }
        // Emergency generator (right side)
        ctx.fillStyle="#0a1a0a"; rr(W-80,H*0.36,60,80,4); ctx.fill();
        ctx.strokeStyle="rgba(44,180,44,0.5)"; ctx.lineWidth=1.5; ctx.stroke();
        ctx.fillStyle=`rgba(44,255,44,${0.5+0.3*Math.sin(t*8)})`; ctx.beginPath(); ctx.arc(W-50,H*0.36+20,8,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="rgba(44,200,44,0.7)"; ctx.font="bold 5px monospace"; ctx.textAlign="center";
        ctx.fillText("GEN", W-50, H*0.36+52); ctx.fillText("ONLINE", W-50, H*0.36+62);
        // Waveform (emergency signal) on screen
        ctx.fillStyle="#050e05"; rr(20,H*0.38,90,60,4); ctx.fill();
        ctx.strokeStyle="rgba(44,200,44,0.5)"; ctx.lineWidth=1; ctx.stroke();
        ctx.strokeStyle=`rgba(255,60,60,0.9)`; ctx.lineWidth=1.5; ctx.beginPath();
        for (let wx=0;wx<80;wx+=2) {
          const wy=H*0.38+30+18*Math.sin(t*8+wx*0.18)*(wx%14<7?1:-0.3); // interrupted signal
          wx===0?ctx.moveTo(22+wx,wy):ctx.lineTo(22+wx,wy);
        }
        ctx.stroke();
        ctx.fillStyle="rgba(255,80,80,0.6)"; ctx.font="5px monospace"; ctx.textAlign="center"; ctx.fillText("SIGNAL WEAK",65,H*0.38+53);
        // Survivor notes taped to wall
        ctx.fillStyle="rgba(180,160,40,0.75)"; rr(W/2-40,H*0.66,80,50,3); ctx.fill();
        ctx.strokeStyle="rgba(200,180,60,0.4)"; ctx.lineWidth=1; ctx.stroke();
        ctx.fillStyle="rgba(20,8,0,0.85)"; ctx.font="5px monospace"; ctx.textAlign="center";
        ["BROADCAST HELP","SECTOR 7 CLEAR","DONT STOP SIGNAL"].forEach((ln,i)=>ctx.fillText(ln,W/2,H*0.66+14+i*12));
        // Red emergency strobe
        const strA=0.06+0.05*Math.sin(t*5);
        ctx.fillStyle=`rgba(200,0,0,${strA})`; ctx.fillRect(0,0,W,H);
      } else if (!!this.map?.config?.wasteland) {
        // ═══ WASTELAND: RADIO STATION ═══
        const t = performance.now() / 1000;

        // ── ON AIR sign (blinking) ──────────────────
        const onAirAlpha = 0.6 + 0.4 * Math.sin(t * 3);
        ctx.fillStyle = `rgba(255,40,60,${onAirAlpha})`;
        ctx.shadowColor = "#FF0040";
        ctx.shadowBlur = 12 * onAirAlpha;
        rr(cx - 38, topY + 8, 76, 22, 4);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(255,80,100,${onAirAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("● ON AIR", cx, topY + 23);

        // ── Soundproof panels (top wall - fixed alignment) ──────
        const panelCount = 4;
        const panelGap = 8;
        const totalPanelWidth = W - 40;
        const panelW = (totalPanelWidth - (panelCount - 1) * panelGap) / panelCount;
        for (let pi = 0; pi < panelCount; pi++) {
          const px = 20 + pi * (panelW + panelGap);
          ctx.fillStyle = "#2a1a28";
          ctx.strokeStyle = "#5a3a58";
          ctx.lineWidth = 1;
          rr(px, topY + 34, panelW, 32, 3);
          ctx.fill();
          ctx.stroke();
          // Foam wedge pattern
          ctx.fillStyle = "#3a2a38";
          const cols = Math.floor(panelW / 14);
          for (let ri = 0; ri < 2; ri++) {
            for (let ci = 0; ci < cols; ci++) {
              ctx.beginPath();
              ctx.moveTo(px + 4 + ci * 14, topY + 38 + ri * 14 + 12);
              ctx.lineTo(px + 4 + ci * 14 + 12, topY + 38 + ri * 14 + 12);
              ctx.lineTo(px + 4 + ci * 14 + 6, topY + 38 + ri * 14);
              ctx.closePath();
              ctx.fill();
            }
          }
        }

        // ── Main broadcast desk (center-top) ──────────────
        const deskX = cx - 80;
        const deskY = topY + 74;
        ctx.fillStyle = "#3a3530";
        ctx.strokeStyle = "#5a5048";
        ctx.lineWidth = 2;
        rr(deskX, deskY, 160, 38, 4);
        ctx.fill();
        ctx.stroke();

        // Mixing board on desk
        ctx.fillStyle = "#1a1a20";
        rr(deskX + 10, deskY + 4, 100, 28, 2);
        ctx.fill();
        // Faders
        for (let fi = 0; fi < 8; fi++) {
          const fx = deskX + 16 + fi * 12;
          ctx.fillStyle = "#2a2a30";
          ctx.fillRect(fx, deskY + 8, 8, 18);
          const fPos = 4 + 8 * (0.5 + 0.5 * Math.sin(t * (0.7 + fi * 0.12) + fi));
          ctx.fillStyle = fi % 2 === 0 ? "#FF88CC" : "#88CCFF";
          ctx.fillRect(fx + 1, deskY + 8 + fPos, 6, 4);
        }

        // VU meters
        ctx.fillStyle = "#44FF88";
        ctx.shadowColor = "#44FF88";
        ctx.shadowBlur = 4;
        ctx.fillRect(deskX + 118, deskY + 8, 12, 5);
        ctx.fillRect(deskX + 118, deskY + 15, 10, 4);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#FFCC00";
        ctx.fillRect(deskX + 118, deskY + 21, 8, 3);
        ctx.fillStyle = "#FF4400";
        ctx.fillRect(deskX + 118, deskY + 26, 5, 3);

        // Microphone on desk
        ctx.fillStyle = "#4a4a50";
        ctx.beginPath();
        ctx.ellipse(deskX + 145, deskY + 10, 6, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#6a6a70";
        ctx.lineWidth = 1;
        ctx.stroke();
        // Mic stand
        ctx.strokeStyle = "#5a5a60";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(deskX + 145, deskY + 20);
        ctx.lineTo(deskX + 145, deskY + 32);
        ctx.stroke();

        // ── Worker desk 1 (left side) ──────────────
        const desk1X = W * 0.10;
        const desk1Y = H * 0.42;
        ctx.fillStyle = "#3a3028";
        ctx.strokeStyle = "#5a4a38";
        ctx.lineWidth = 1.5;
        rr(desk1X, desk1Y, 70, 34, 3);
        ctx.fill();
        ctx.stroke();
        // Computer/equipment on desk
        ctx.fillStyle = "#1a1a20";
        rr(desk1X + 8, desk1Y + 4, 28, 20, 2);
        ctx.fill();
        ctx.fillStyle = "#00AAFF";
        ctx.fillRect(desk1X + 10, desk1Y + 6, 24, 14);
        // Papers
        ctx.fillStyle = "#EEDDCC";
        ctx.fillRect(desk1X + 42, desk1Y + 8, 20, 16);

        // ── Worker desk 2 (right side) ──────────────
        const desk2X = W * 0.62;
        const desk2Y = H * 0.42;
        ctx.fillStyle = "#3a3028";
        ctx.strokeStyle = "#5a4a38";
        ctx.lineWidth = 1.5;
        rr(desk2X, desk2Y, 75, 34, 3);
        ctx.fill();
        ctx.stroke();
        // Equipment
        ctx.fillStyle = "#2a2a30";
        rr(desk2X + 6, desk2Y + 4, 32, 22, 2);
        ctx.fill();
        ctx.fillStyle = "#FF88CC";
        ctx.shadowColor = "#FF88CC";
        ctx.shadowBlur = 4;
        ctx.fillRect(desk2X + 10, desk2Y + 8, 24, 14);
        ctx.shadowBlur = 0;
        // Headphones
        ctx.fillStyle = "#2a2a30";
        ctx.beginPath();
        ctx.arc(desk2X + 55, desk2Y + 12, 8, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(desk2X + 47, desk2Y + 12, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(desk2X + 63, desk2Y + 12, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // ── Speaker monitors (left wall) ──────────────
        for (let si = 0; si < 2; si++) {
          const spX = 16;
          const spY = H * 0.58 + si * 50;
          ctx.fillStyle = "#2a2520";
          ctx.strokeStyle = "#4a4540";
          ctx.lineWidth = 1.5;
          rr(spX, spY, 44, 40, 4);
          ctx.fill();
          ctx.stroke();
          // Speaker cone
          ctx.fillStyle = "#1a1a18";
          ctx.beginPath();
          ctx.arc(spX + 22, spY + 20, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#3a3a38";
          ctx.lineWidth = 1;
          for (let ri = 1; ri <= 2; ri++) {
            ctx.beginPath();
            ctx.arc(spX + 22, spY + 20, 5 * ri, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // ── Equipment rack (right wall) ──────────────
        const rackX = W - 70;
        const rackY = H * 0.34;
        ctx.fillStyle = "#2a2a28";
        ctx.strokeStyle = "#4a4a48";
        ctx.lineWidth = 1.5;
        rr(rackX, rackY, 52, 90, 3);
        ctx.fill();
        ctx.stroke();
        // Rack units with lights and labels
        const rackUnits = [
          { col: "#FF88CC", label: "AMP" },
          { col: "#44FF88", label: "EQ" },
          { col: "#FFAA00", label: "COMP" },
          { col: "#44AAFF", label: "OUT" },
        ];
        for (let ri = 0; ri < rackUnits.length; ri++) {
          const ru = rackUnits[ri];
          const ruy = rackY + 8 + ri * 20;
          ctx.fillStyle = "#1a1a1a";
          ctx.strokeStyle = ru.col + "44";
          ctx.lineWidth = 1;
          rr(rackX + 4, ruy, 44, 16, 2);
          ctx.fill();
          ctx.stroke();
          // LED strip
          ctx.fillStyle = ru.col;
          ctx.shadowColor = ru.col;
          ctx.shadowBlur = 4;
          ctx.fillRect(rackX + 8, ruy + 5, 6, 6);
          ctx.shadowBlur = 0;
          // Knob
          ctx.fillStyle = "#3a3a3a";
          ctx.beginPath();
          ctx.arc(rackX + 38, ruy + 8, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = ru.col + "66";
          ctx.lineWidth = 1;
          ctx.stroke();
          // Label
          ctx.fillStyle = ru.col;
          ctx.font = "3px monospace";
          ctx.textAlign = "center";
          ctx.fillText(ru.label, rackX + 24, ruy + 10);
        }
        // Rack label at bottom
        ctx.fillStyle = "rgba(255,136,204,0.5)";
        ctx.font = "bold 4px monospace";
        ctx.textAlign = "center";
        ctx.fillText("RACK", rackX + 26, rackY + 86);

        // ── Chairs for workers ──────────────
        // Chair 1 (near desk 1)
        ctx.fillStyle = "#3a3530";
        ctx.strokeStyle = "#5a5048";
        ctx.lineWidth = 1;
        rr(desk1X + 20, desk1Y + 38, 26, 18, 3);
        ctx.fill();
        ctx.stroke();
        rr(desk1X + 22, desk1Y + 22, 22, 18, 3);
        ctx.fill();
        ctx.stroke();

        // Chair 2 (near desk 2)
        rr(desk2X + 22, desk2Y + 38, 26, 18, 3);
        ctx.fill();
        ctx.stroke();
        rr(desk2X + 24, desk2Y + 22, 22, 18, 3);
        ctx.fill();
        ctx.stroke();

        // ── Waveform display screen (left wall, below speakers) ──────────────
        const scrX = 16, scrY = H * 0.36, scrW = 52, scrH = 38;
        ctx.fillStyle = "#1a1815";
        ctx.strokeStyle = "#4a4540";
        ctx.lineWidth = 1.5;
        rr(scrX, scrY, scrW, scrH, 4);
        ctx.fill();
        ctx.stroke();
        // Screen inner
        ctx.fillStyle = "#0a0808";
        rr(scrX + 3, scrY + 3, scrW - 6, scrH - 6, 2);
        ctx.fill();
        // Waveform animation
        ctx.strokeStyle = `rgba(255,100,140,0.9)`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let wx = 0; wx < scrW - 12; wx += 2) {
          const amp = 6 + 5 * Math.sin(t * 3 + wx * 0.18);
          const wy = scrY + scrH / 2 + amp * Math.sin(t * 8 + wx * 0.22);
          wx === 0 ? ctx.moveTo(scrX + 6 + wx, wy) : ctx.lineTo(scrX + 6 + wx, wy);
        }
        ctx.stroke();
        // Screen label
        ctx.fillStyle = "rgba(255,140,180,0.7)";
        ctx.font = "4px monospace";
        ctx.textAlign = "center";
        ctx.fillText("LIVE SIGNAL", scrX + scrW / 2, scrY + scrH - 4);

        // ── Playlist / track display (right wall, below rack) ──────────────
        const plX = W - 70, plY = H * 0.58, plW = 52, plH = 62;
        ctx.fillStyle = "#1a1815";
        ctx.strokeStyle = "#5a4a38";
        ctx.lineWidth = 1.5;
        rr(plX, plY, plW, plH, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#FF88CC";
        ctx.font = "bold 4px monospace";
        ctx.textAlign = "center";
        ctx.fillText("▶ NOW PLAYING", plX + plW / 2, plY + 10);
        ctx.strokeStyle = "rgba(255,136,204,0.3)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(plX + 4, plY + 13);
        ctx.lineTo(plX + plW - 4, plY + 13);
        ctx.stroke();
        const tracks = ["DUST STORM","DESERT ECHO","NEON DRIFT","RUST WAVE"];
        tracks.forEach((tr, ti) => {
          const isActive = ti === Math.floor(t * 0.4) % tracks.length;
          ctx.fillStyle = isActive ? "#FF88CC" : "rgba(200,160,180,0.6)";
          ctx.font = isActive ? "bold 4px monospace" : "4px monospace";
          ctx.textAlign = "left";
          ctx.fillText((isActive ? "▶ " : "  ") + tr, plX + 5, plY + 24 + ti * 10);
        });

        // ── Coffee mug on main desk ──────────────
        const mugX = deskX + 132, mugY = deskY + 8;
        ctx.fillStyle = "#3a3028";
        ctx.strokeStyle = "#5a4a38";
        ctx.lineWidth = 1;
        rr(mugX - 6, mugY, 12, 16, 2);
        ctx.fill();
        ctx.stroke();
        // Coffee liquid
        ctx.fillStyle = "rgba(60,30,10,0.8)";
        ctx.fillRect(mugX - 4, mugY + 2, 8, 10);
        // Steam
        for (let si = 0; si < 2; si++) {
          const sx2 = mugX - 2 + si * 4;
          const sa = Math.sin(t * 2 + si * 1.2) * 2;
          ctx.strokeStyle = `rgba(200,180,160,${0.3 + 0.15 * Math.sin(t * 1.5 + si)})`;
          ctx.lineWidth = 1;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(sx2 + sa, mugY);
          ctx.lineTo(sx2 - sa, mugY - 6);
          ctx.stroke();
          ctx.lineCap = "butt";
        }
        // Handle
        ctx.strokeStyle = "#5a4a38";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(mugX + 8, mugY + 8, 4, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        // ── Note papers on main desk ──────────────
        const noteX = deskX + 4, noteY = deskY + 6;
        ctx.fillStyle = "rgba(220,210,190,0.85)";
        ctx.save();
        ctx.rotate(-0.06);
        ctx.fillRect(noteX, noteY, 18, 14);
        ctx.restore();
        ctx.fillStyle = "rgba(180,140,120,0.85)";
        ctx.save();
        ctx.translate(noteX + 10, noteY);
        ctx.rotate(0.1);
        ctx.fillRect(0, 0, 16, 12);
        ctx.restore();
        // Lines on notes
        ctx.strokeStyle = "rgba(80,60,40,0.4)";
        ctx.lineWidth = 0.5;
        for (let li = 0; li < 2; li++) {
          ctx.beginPath();
          ctx.moveTo(noteX + 2, noteY + 4 + li * 4);
          ctx.lineTo(noteX + 14, noteY + 4 + li * 4);
          ctx.stroke();
        }

        // ── Microphone stand (center, in front of main desk) ──────────────
        const micX = cx, micY = deskY + 60;
        // Stand base
        ctx.fillStyle = "#2a2520";
        ctx.strokeStyle = "#4a4540";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(micX, micY + 10, 12, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Stand pole
        ctx.strokeStyle = "#5a5550";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(micX, micY + 10);
        ctx.lineTo(micX, micY - 12);
        ctx.stroke();
        // Arm
        ctx.beginPath();
        ctx.moveTo(micX, micY - 6);
        ctx.lineTo(micX + 14, micY - 14);
        ctx.stroke();
        // Mic capsule
        ctx.fillStyle = "#3a3530";
        ctx.strokeStyle = "#5a5550";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(micX + 14, micY - 18, 7, 11, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Mesh grid on mic
        ctx.strokeStyle = "rgba(255,136,204,0.25)";
        ctx.lineWidth = 0.5;
        for (let mg = 0; mg < 3; mg++) {
          ctx.beginPath();
          ctx.ellipse(micX + 14, micY - 18, 7, 11 - mg * 2.5, -0.3, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Mic glow
        const micGlow = ctx.createRadialGradient(micX + 14, micY - 18, 0, micX + 14, micY - 18, 14);
        micGlow.addColorStop(0, `rgba(255,136,204,${0.2 + 0.12 * Math.sin(t * 3)})`);
        micGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = micGlow;
        ctx.beginPath();
        ctx.arc(micX + 14, micY - 18, 14, 0, Math.PI * 2);
        ctx.fill();

        // ── Sound wave rings (around mic) ──────────────
        for (let ri = 1; ri <= 2; ri++) {
          const rr2 = ri * 20 + 8 * Math.sin(t * 2 - ri);
          const alpha = (0.15 - ri * 0.04) * (0.5 + 0.5 * Math.sin(t * 2 + ri));
          ctx.strokeStyle = `rgba(255,136,204,${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(micX + 14, micY - 18, rr2, 0, Math.PI * 2);
          ctx.stroke();
        }

        // ── Ambient particles ──────────────
        for (let pi = 0; pi < 5; pi++) {
          const px = (Math.sin(pi * 2.5 + t * 0.45) * 0.36 + 0.5) * W;
          const py = (Math.cos(pi * 1.8 + t * 0.3) * 0.30 + 0.5) * H;
          ctx.fillStyle = `rgba(255,136,204,${0.18 + 0.1 * Math.sin(t * 1.6 + pi)})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // ── Station sign ──────────────
        ctx.fillStyle = "#FF88CC";
        ctx.shadowColor = "#FF88CC";
        ctx.shadowBlur = 8;
        ctx.font = "bold 9px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("WASTELAND RADIO", cx, H - 20);
        ctx.shadowBlur = 0;

      } else {
        // ── Default radio station (non-galactica, non-wasteland) ───────
        // ── Broadcast desk (center) ───────────────────
        ctx.fillStyle = "#0a0a18";
        ctx.strokeStyle = "#FF88CC";
        ctx.lineWidth = 1.5;
        rr(cx - 52, midY - 14, 104, 36, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#111122";
        rr(cx - 44, midY - 10, 88, 28, 2);
        ctx.fill();
        for (let fi = 0; fi < 8; fi++) {
          ctx.fillStyle = "#334";
          ctx.fillRect(cx - 40 + fi * 11, midY - 8, 9, 20);
          ctx.fillStyle = "#88AAFF";
          ctx.fillRect(cx - 40 + fi * 11, midY - 8 + Math.floor(Math.random() * 14), 9, 6);
        }
        ctx.fillStyle = "#44FF88";
        ctx.shadowColor = "#44FF44";
        ctx.shadowBlur = 6;
        ctx.fillRect(cx + 26, midY - 10, 14, 6);
        ctx.fillRect(cx + 26, midY - 2, 14, 4);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#FFCC00";
        ctx.fillRect(cx + 26, midY + 4, 10, 3);
        ctx.fillStyle = "#FF4400";
        ctx.fillRect(cx + 26, midY + 9, 6, 3);
        // Soundproof panels (fixed alignment)
        ctx.fillStyle = "#1a1228";
        ctx.strokeStyle = "#442266";
        ctx.lineWidth = 1;
        const defPanelCount = 4;
        const defPanelW = (W - 40) / defPanelCount - 4;
        for (let pi = 0; pi < defPanelCount; pi++) {
          const px2 = 20 + pi * ((W - 40) / defPanelCount);
          rr(px2, topY + 4, defPanelW, 44, 4);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#2a1a38";
          for (let ri = 0; ri < 3; ri++)
            for (let ci2 = 0; ci2 < 3; ci2++) {
              ctx.beginPath();
              ctx.moveTo(px2 + 4 + ci2 * 12, topY + 6 + ri * 12);
              ctx.lineTo(px2 + 10 + ci2 * 12, topY + 6 + ri * 12);
              ctx.lineTo(px2 + 7 + ci2 * 12, topY + 14 + ri * 12);
              ctx.closePath();
              ctx.fill();
            }
          ctx.fillStyle = "#1a1228";
        }
        ctx.fillStyle = "#FF2244";
        ctx.shadowColor = "#FF0022";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.roundRect(cx - 28, topY + 52, 56, 18, 4);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 9px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.shadowBlur = 0;
        ctx.fillText("● ON AIR", cx, topY + 64);
        ctx.fillStyle = "#AAAAAA";
        ctx.beginPath();
        ctx.ellipse(cx, midY - 28, 8, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#888";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, midY - 16, 12, 0, Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, midY - 4);
        ctx.lineTo(cx, midY + 8);
        ctx.stroke();
      } // end default radio station
    } else if (type === 23) {
      // UNDERGROUND LAB
      // ── Experiment pods (top) ────────────────────
      for (let pi = 0; pi < 3; pi++) {
        const px2 = cx - W * 0.34 + pi * W * 0.34,
          py2 = topY + 4;
        ctx.fillStyle = "#0a1a0e";
        ctx.strokeStyle = "#44FF88";
        ctx.lineWidth = 1.5;
        rr(px2 - 20, py2, 40, 52, 5);
        ctx.fill();
        ctx.stroke();
        // Glowing liquid
        const liqColors = ["#00FF88", "#FF00CC", "#FFCC00"];
        ctx.fillStyle = liqColors[pi] + "44";
        rr(px2 - 18, py2 + 2, 36, 48, 4);
        ctx.fill();
        ctx.fillStyle = liqColors[pi];
        ctx.shadowColor = liqColors[pi];
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(px2, py2 + 26, 10, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Tube lines
        ctx.strokeStyle = liqColors[pi] + "88";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px2 - 20, py2 + 26);
        ctx.lineTo(px2 - 32, py2 + 26);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px2 + 20, py2 + 26);
        ctx.lineTo(px2 + 32, py2 + 26);
        ctx.stroke();
      }
      // ── Control console (center) ──────────────────
      ctx.fillStyle = "#050810";
      ctx.strokeStyle = "#55FF99";
      ctx.lineWidth = 2;
      rr(cx - 48, midY - 14, 96, 40, 5);
      ctx.fill();
      ctx.stroke();
      // Danger indicators
      for (let di = 0; di < 6; di++) {
        const dc = [
          "#FF4400",
          "#FFCC00",
          "#44FF88",
          "#44FF88",
          "#FFCC00",
          "#FF4400",
        ][di];
        ctx.fillStyle = dc;
        ctx.shadowColor = dc;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(cx - 38 + di * 15, midY - 6, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = "#002a10";
      rr(cx - 42, midY + 2, 84, 18, 2);
      ctx.fill();
      ctx.strokeStyle = "#44FF88";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 40, midY + 10);
      ctx.lineTo(cx - 28, midY + 10);
      ctx.lineTo(cx - 20, midY + 2);
      ctx.lineTo(cx - 12, midY + 18);
      ctx.lineTo(cx - 4, midY + 10);
      ctx.lineTo(cx + 8, midY + 10);
      ctx.lineTo(cx + 14, midY + 4);
      ctx.lineTo(cx + 20, midY + 16);
      ctx.lineTo(cx + 32, midY + 10);
      ctx.lineTo(cx + 40, midY + 10);
      ctx.stroke();
      // ── Hazmat barrel (left) ─────────────────────
      ctx.fillStyle = "#1a2a0a";
      ctx.strokeStyle = "#88FF22";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx - W * 0.34, midY + 22, 18, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#44FF00";
      ctx.shadowColor = "#22FF00";
      ctx.shadowBlur = 8;
      ctx.font = "12px serif";
      ctx.textAlign = "center";
      ctx.fillText("☢", cx - W * 0.34, midY + 27);
      ctx.shadowBlur = 0;
      // Warning stripes on floor
      ctx.fillStyle = "rgba(255,200,0,0.12)";
      for (let ws = 0; ws < 5; ws++) {
        ctx.save();
        ctx.translate(cx + W * 0.12, midY + 14);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(ws * 10 - 20, -30, 6, 60);
        ctx.restore();
      }
    }

    // ── ZOMBIE MAP: atmospheric decay overlay ──────────────
    if (!!this.map?.config?.zombie) {
      const zt = performance.now() / 1000;
      ctx.save();

      // Biohazard fog tint
      ctx.globalAlpha = 0.08 + 0.03 * Math.sin(zt * 0.7);
      ctx.fillStyle = "#22FF44";
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;

      // Biohazard sign on left wall
      const bhx = W * 0.08, bhy = H * 0.38;
      const bhGlow = ctx.createRadialGradient(bhx, bhy, 0, bhx, bhy, 28);
      bhGlow.addColorStop(0, `rgba(44,220,44,${0.3 + 0.15 * Math.sin(zt * 1.2)})`);
      bhGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bhGlow;
      ctx.beginPath(); ctx.arc(bhx, bhy, 28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(44,255,44,${0.7 + 0.3 * Math.sin(zt * 1.2)})`;
      ctx.font = "22px serif";
      ctx.textAlign = "center";
      ctx.fillText("☢", bhx, bhy + 8);

      // WARNING tape strips along bottom
      const stripeCount = Math.floor(W / 28);
      for (let si = 0; si < stripeCount; si++) {
        ctx.fillStyle = si % 2 === 0 ? "rgba(44,200,44,0.18)" : "rgba(0,0,0,0.18)";
        ctx.fillRect(si * 28, H - 12, 28, 12);
      }

      // Blood splatters on floor
      for (const [sx, sy] of [[W*0.22,H*0.55],[W*0.65,H*0.38],[W*0.44,H*0.72],[W*0.78,H*0.60]]) {
        ctx.fillStyle = "rgba(140,8,8,0.22)";
        ctx.beginPath(); ctx.ellipse(sx, sy, 14, 8, sx * 0.02, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(120,6,6,0.18)";
        ctx.beginPath(); ctx.arc(sx + 18, sy - 5, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx - 12, sy + 8, 3, 0, Math.PI * 2); ctx.fill();
      }

      // Overgrown vines from corners
      ctx.strokeStyle = `rgba(30,160,40,${0.35 + 0.10 * Math.sin(zt * 0.5)})`;
      ctx.lineWidth = 1.5;
      for (const [vx0, vy0, vx1, vy1, vx2, vy2] of [
        [0,   0,   W*0.18, H*0.22, W*0.06, H*0.45],
        [W,   0,   W*0.82, H*0.18, W*0.92, H*0.42],
        [0,   H,   W*0.14, H*0.80, W*0.04, H*0.60],
        [W,   H,   W*0.86, H*0.78, W*0.94, H*0.58],
      ]) {
        ctx.beginPath();
        ctx.moveTo(vx0, vy0);
        ctx.quadraticCurveTo(vx1, vy1, vx2, vy2);
        ctx.stroke();
      }

      // Floating spores
      for (let pi = 0; pi < 8; pi++) {
        const sx2 = (Math.sin(pi * 2.3 + zt * 0.4) * 0.4 + 0.5) * W;
        const sy2 = (Math.cos(pi * 1.7 + zt * 0.35) * 0.35 + 0.5) * H;
        ctx.fillStyle = `rgba(44,220,44,${0.18 + 0.10 * Math.sin(zt * 1.3 + pi)})`;
        ctx.beginPath(); ctx.arc(sx2, sy2, 1.5, 0, Math.PI * 2); ctx.fill();
      }

      ctx.restore();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Metro helpers ────────────────────────────────────────────
  _buildMetroRoom() {
    const RS = 48;
    const layout = ROOM_LAYOUT_METRO;
    const RH = layout.length,
      RW = layout[0].length;
    const RW_px = RW * RS,
      RH_px = RH * RS;
    // Entry gap at cols 8-10 → center col 9
    const entryX = (8 + 1.5) * RS; // 9.5 * 48 = 456
    const entryY = RH_px - RS - 12;
    const floorPositions = [];
    for (let fy = 3; fy < RH - 1; fy++) {
      for (let fx = 1; fx < RW - 1; fx++) {
        if (layout[fy][fx] === 0)
          floorPositions.push({ x: (fx + 0.5) * RS, y: (fy + 0.5) * RS });
      }
    }
    return {
      isMetro: true,
      layout,
      W: RW,
      H: RH,
      S: RS,
      roomW: RW_px,
      roomH: RH_px,
      doorDoor: this.map.metroEntrance,
      entryX,
      entryY,
      floorPositions,
      isBlocked(wx, wy) {
        const tx2 = Math.floor(wx / RS),
          ty2 = Math.floor(wy / RS);
        if (tx2 < 0 || ty2 < 0 || tx2 >= RW || ty2 >= RH) return true;
        return layout[ty2][tx2] !== 0;
      },
      isBlockedCircle(wx, wy, r) {
        return (
          this.isBlocked(wx - r + 1, wy - r + 1) ||
          this.isBlocked(wx + r - 1, wy - r + 1) ||
          this.isBlocked(wx - r + 1, wy + r - 1) ||
          this.isBlocked(wx + r - 1, wy + r - 1)
        );
      },
      randomRoadPos() {
        const p =
          floorPositions[Math.floor(Math.random() * floorPositions.length)];
        return new Vec2(p.x, p.y);
      },
    };
  }

  _spawnMetroWave() {
    this._metroWave++;
    const room = this._indoor;
    const waveNum = this._metroWave;
    const base = 2 + Math.floor(this.wave / 2);
    const count = Math.min(base + waveNum, 10);
    const types = ["normal", "normal", "mini", "big", "normal"];
    for (let i = 0; i < count; i++) {
      const pos = room.randomRoadPos();
      const type =
        waveNum >= 3 && i === count - 1
          ? "big"
          : waveNum >= 2 && i % 3 === 0
            ? "mini"
            : types[i % types.length];
      this._indoorBots.push(
        new Bot(pos.x, pos.y, this.wave + waveNum - 1, type, this.map.config),
      );
    }
  }

  _renderMetroIndoor(ctx, W, H, shake) {
    const room = this._indoor;
    const offX = (W - room.roomW) / 2,
      offY = (H - room.roomH) / 2;
    const S = room.S;
    const T = Date.now() / 1000;

    // Map type detection
    const isWasteland = !!this.map?.config?.wasteland;
    const isGalactica = !!this.map?.config?.galactica;

    // Color schemes based on map type
    const colors = isWasteland ? {
      bg: "#0a0806",
      ambient1: 'rgba(60,40,20,0.06)',
      wall: "#1a1410",
      wallHighlight: 'rgba(255,200,150,0.012)',
      wallEdge: 'rgba(255,180,120,0.022)',
      bench: "#1a1612",
      benchLeg: "#4a3a28",
      benchLegHighlight: "#5a4a38",
      benchSeat: "#3a2a1a",
      benchSeatHighlight: "#4a3a2a",
      trackBase: "#080604",
      trackGravel: "#100c08",
      tie: "#2a1a08",
      tieHighlight: "#3a2a10",
      tieShadow: "#0a0804",
      rail: "#3a3020",
      railMid: "#4a4030",
      railTop: "#5a5040",
      thirdRail: "#1a1810",
      thirdRailGlow: "rgba(255,140,80,0.25)",
      thirdRailColor: "#FF8844",
      floor: "#161410",
      floorAlt: "#121010",
      tactile: "#4a4028",
      neon: "rgba(255,136,100,0.45)",
      neonColor: "#FF8866",
      trainBody1: "#3a2a1a",
      trainBody2: "#2a1a0a",
      trainBody3: "#1a1008",
      trainPanel: "#3a2818",
      trainRoof: "#1a1408",
      trainWindow: "#2a1810",
      trainWindowInner: "#1a1008",
      trainWindowLight: "rgba(255,180,100,0.75)",
      trainStripe: "#AA5500",
      trainStripeGlow: "#FF8800",
      trainDoor: "#0a0804",
      trainDoorInner: "rgba(255,160,80,0.08)",
      trainDoorStroke: "#4a3a28",
      trainHandle: "#6a5a4a",
      destSign: "#0a0600",
      destText: "#FF8800",
      destGlow: "#FF6600",
      carNum: "#FFDDAA",
      safety: "#FFAA00",
      safetyGlow: "#FF8800",
      safetyStripe: "#1a0800",
      caution: "#1a0800",
      lightBox: "#100c08",
      lightGlow: "rgba(255,220,180,0.95)",
      lightGlowColor: "#FFDDAA",
      pillar: "#1a1410",
      pillarHighlight: "#2a2418",
      pillarCap: "#2a2418",
      pillarBase: "#1a1410",
      pillarStripe: "rgba(255,120,60,0.85)",
      pillarStripeGlow: "#FF6633",
      signBg: "#100800",
      signStroke: "#FF8844",
      signText: "#FF8844",
      signGlow: "#FF8844",
      exitBg: "#100800",
      exitStroke: "#FF8844",
      exitText: "#FF8844",
      exitGlow: "#FF8844",
      waveText: "#FF8844",
      waveGlow: "#FF6622",
      exitHint: "#FFDDAA",
      exitHintGlow: "#FFAA00"
    } : {
      bg: "#020308",
      ambient1: 'rgba(30,50,80,0.06)',
      wall: "#0d0d18",
      wallHighlight: 'rgba(255,255,255,0.012)',
      wallEdge: 'rgba(255,255,255,0.022)',
      bench: "#12121c",
      benchLeg: "#3a3a4a",
      benchLegHighlight: "#4a4a5a",
      benchSeat: "#1a4a6a",
      benchSeatHighlight: "#2a6a9a",
      trackBase: "#030308",
      trackGravel: "#080810",
      tie: "#1a1408",
      tieHighlight: "#231a0c",
      tieShadow: "#0a0804",
      rail: "#2a2a40",
      railMid: "#4a4a60",
      railTop: "#6a6a80",
      thirdRail: "#1a1a28",
      thirdRailGlow: "rgba(80,160,255,0.25)",
      thirdRailColor: "#4488FF",
      floor: "#16161f",
      floorAlt: "#121218",
      tactile: "#4a4a30",
      neon: "rgba(68,238,255,0.45)",
      neonColor: "#44EEFF",
      trainBody1: "#2a3d4e",
      trainBody2: "#1c2d3e",
      trainBody3: "#14222e",
      trainPanel: "#253848",
      trainRoof: "#1a2838",
      trainWindow: "#1a2028",
      trainWindowInner: "#3a2a10",
      trainWindowLight: "rgba(255,215,100,0.75)",
      trainStripe: "#0055CC",
      trainStripeGlow: "#0088FF",
      trainDoor: "#060a10",
      trainDoorInner: "rgba(255,200,100,0.08)",
      trainDoorStroke: "#3a5570",
      trainHandle: "#5a6a7a",
      destSign: "#000a10",
      destText: "#FF8800",
      destGlow: "#FF6600",
      carNum: "#FFFFFF",
      safety: "#FFCC00",
      safetyGlow: "#FFAA00",
      safetyStripe: "#1a0a00",
      caution: "#1a0800",
      lightBox: "#080810",
      lightGlow: "rgba(220,240,255,0.95)",
      lightGlowColor: "#AADDFF",
      pillar: "#181828",
      pillarHighlight: "#222236",
      pillarCap: "#242438",
      pillarBase: "#1a1a2a",
      pillarStripe: "rgba(0,100,255,0.85)",
      pillarStripeGlow: "#0066FF",
      signBg: "#001408",
      signStroke: "#22FF66",
      signText: "#22FF66",
      signGlow: "#22FF66",
      exitBg: "#001808",
      exitStroke: "#22FF44",
      exitText: "#22FF44",
      exitGlow: "#22FF44",
      waveText: "#44FF88",
      waveGlow: "#22FF44",
      exitHint: "#FFFFAA",
      exitHintGlow: "#FFFF00"
    };

    const metroName = isWasteland ? "WASTELAND METRO" : "NEON CITY METRO";
    const lineName = isWasteland ? "◉  METRO  LINE W  ◉" : "◉  METRO  LINE 1  ◉";

    // ── Sky/background ─────────────────────────────────────────
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(offX + shake.x, offY + shake.y);

    // ── Ambient underground glow ───────────────────────────────
    const ambientGrad = ctx.createRadialGradient(room.roomW / 2, room.roomH / 2, 0, room.roomW / 2, room.roomH / 2, room.roomW * 0.7);
    ambientGrad.addColorStop(0, colors.ambient1);
    ambientGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ambientGrad;
    ctx.fillRect(0, 0, room.roomW, room.roomH);

    const platEdge = 3 * S;

    // ── Tile pass ─────────────────────────────────────────────
    for (let ty = 0; ty < room.H; ty++) {
      for (let tx = 0; tx < room.W; tx++) {
        const tile = room.layout[ty][tx];
        const px = tx * S,
          py = ty * S;
        if (tile === 1) {
          // Concrete wall / ceiling with panel texture
          ctx.fillStyle = colors.wall;
          ctx.fillRect(px, py, S, S);
          ctx.fillStyle = colors.wallHighlight;
          ctx.fillRect(px + 2, py + 2, S - 4, S - 4);
          ctx.fillStyle = colors.wallEdge;
          ctx.fillRect(px, py, S, 2);
          ctx.fillRect(px, py, 2, S);
          // Vertical groove on walls
          if (ty >= 3) {
            ctx.fillStyle = "rgba(0,0,0,0.25)";
            ctx.fillRect(px + S / 2 - 1, py, 2, S);
          }
        } else if (tile === 2) {
          // Enhanced bench with metal frame
          ctx.fillStyle = colors.bench;
          ctx.fillRect(px, py, S, S);
          // Bench legs (chrome)
          ctx.fillStyle = colors.benchLeg;
          ctx.fillRect(px + 8, py + S * 0.48, 5, S * 0.42);
          ctx.fillRect(px + S - 13, py + S * 0.48, 5, S * 0.42);
          ctx.fillStyle = colors.benchLegHighlight;
          ctx.fillRect(px + 9, py + S * 0.48, 2, S * 0.42);
          ctx.fillRect(px + S - 12, py + S * 0.48, 2, S * 0.42);
          // Seat
          ctx.fillStyle = colors.benchSeat;
          ctx.fillRect(px + 4, py + S * 0.38, S - 8, 14);
          ctx.fillStyle = colors.benchSeatHighlight;
          ctx.fillRect(px + 4, py + S * 0.38, S - 8, 4);
          // Backrest
          ctx.fillStyle = colors.benchSeat;
          ctx.fillRect(px + 4, py + S * 0.15, S - 8, 12);
          ctx.fillStyle = colors.benchSeatHighlight;
          ctx.fillRect(px + 4, py + S * 0.15, S - 8, 3);
          // Armrests
          ctx.fillStyle = colors.benchLeg;
          ctx.fillRect(px + 2, py + S * 0.32, 7, 18);
          ctx.fillRect(px + S - 9, py + S * 0.32, 7, 18);
          // Floor under bench
          ctx.fillStyle = (tx + ty) % 2 === 0 ? colors.floor : colors.floorAlt;
          ctx.fillRect(px, py + S * 0.9, S, S * 0.1);
        } else if (tile === 3) {
          // Enhanced train tracks / pit with depth
          ctx.fillStyle = colors.trackBase;
          ctx.fillRect(px, py, S, S);
          // Gravel bed texture
          ctx.fillStyle = colors.trackGravel;
          ctx.fillRect(px, py, S, S);
          for (let gi = 0; gi < 8; gi++) {
            ctx.fillStyle = isWasteland ? `rgba(30,20,10,${0.3 + Math.random() * 0.2})` : `rgba(20,20,30,${0.3 + Math.random() * 0.2})`;
            ctx.fillRect(px + Math.random() * S, py + Math.random() * S, 3, 3);
          }
          // Cross ties (wooden sleepers) with detail
          for (let ci = 0; ci < 3; ci++) {
            const tieY = py + ci * (S / 3) + 4;
            ctx.fillStyle = colors.tie;
            ctx.fillRect(px, tieY, S, 9);
            ctx.fillStyle = colors.tieHighlight;
            ctx.fillRect(px, tieY, S, 2);
            ctx.fillStyle = colors.tieShadow;
            ctx.fillRect(px, tieY + 7, S, 2);
            // Bolt marks
            ctx.fillStyle = colors.tieHighlight;
            ctx.fillRect(px + 10, tieY + 3, 3, 3);
            ctx.fillRect(px + S - 13, tieY + 3, 3, 3);
          }
          // Rails with 3D effect
          ctx.fillStyle = colors.rail;
          ctx.fillRect(px + 5, py, 8, S);
          ctx.fillRect(px + S - 13, py, 8, S);
          ctx.fillStyle = colors.railMid;
          ctx.fillRect(px + 6, py, 5, S);
          ctx.fillRect(px + S - 12, py, 5, S);
          ctx.fillStyle = colors.railTop;
          ctx.fillRect(px + 7, py, 3, S);
          ctx.fillRect(px + S - 11, py, 3, S);
          // Third rail (electric) with glow
          if (ty === 2) {
            ctx.fillStyle = colors.thirdRail;
            ctx.fillRect(px + S / 2 - 4, py + S - 10, 8, 8);
            const pulse = Math.sin(T * 3 + tx * 0.5) * 0.3 + 0.7;
            ctx.fillStyle = colors.thirdRailGlow.replace('0.25', (0.25 * pulse).toFixed(2));
            ctx.shadowColor = colors.thirdRailColor;
            ctx.shadowBlur = 8 * pulse;
            ctx.fillRect(px + S / 2 - 3, py + S - 9, 6, 6);
            ctx.shadowBlur = 0;
          }
        } else {
          // Platform floor — polished tile pattern
          const isDark = (tx + ty) % 2 === 0;
          ctx.fillStyle = isDark ? colors.floor : colors.floorAlt;
          ctx.fillRect(px, py, S, S);
          // Tile edge highlights
          ctx.fillStyle = "rgba(255,255,255,0.025)";
          ctx.fillRect(px, py, S, 1);
          ctx.fillRect(px, py, 1, S);
          ctx.fillStyle = "rgba(0,0,0,0.2)";
          ctx.fillRect(px + S - 1, py, 1, S);
          ctx.fillRect(px, py + S - 1, S, 1);
          // Tactile safety strips near edge
          if (ty === 3 && tx > 0 && tx < room.W - 1) {
            ctx.fillStyle = colors.tactile;
            for (let dot = 0; dot < 4; dot++) {
              ctx.fillRect(px + 6 + dot * 11, py + S - 9, 7, 7);
            }
          }
        }
      }
    }

    // ── Floor guide lines (walking paths) ──────────────────────
    ctx.save();
    ctx.strokeStyle = isWasteland ? "rgba(255,136,100,0.06)" : "rgba(68,238,255,0.06)";
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 12]);
    for (const lineX of [S * 4.5, S * 10, S * 15.5]) {
      ctx.beginPath();
      ctx.moveTo(lineX, platEdge + 25);
      ctx.lineTo(lineX, room.roomH - S - 15);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // ── Subtle floor glow strips ───────────────────────────────
    for (let stripX = S * 2; stripX < room.roomW - S * 2; stripX += S * 3.5) {
      const glowPulse = Math.sin(T * 1.2 + stripX * 0.008) * 0.3 + 0.7;
      ctx.fillStyle = isWasteland ? `rgba(255,136,100,${0.025 * glowPulse})` : `rgba(68,238,255,${0.025 * glowPulse})`;
      ctx.fillRect(stripX - 25, room.roomH - S - 5, 50, 4);
    }

    // ── Subway train parked at top ─────────────────────────────
    const trainTop = S,
      trainH = S * 2;
    // Car shell gradient
    const trainGrad = ctx.createLinearGradient(0, trainTop, 0, trainTop + trainH);
    trainGrad.addColorStop(0, colors.trainBody1);
    trainGrad.addColorStop(0.3, colors.trainBody2);
    trainGrad.addColorStop(1, colors.trainBody3);
    ctx.fillStyle = trainGrad;
    ctx.fillRect(0, trainTop, room.roomW, trainH);
    // Body panel
    ctx.fillStyle = colors.trainPanel;
    ctx.fillRect(3, trainTop + 5, room.roomW - 6, trainH - 12);
    // Roof detail
    ctx.fillStyle = colors.trainRoof;
    ctx.fillRect(0, trainTop, room.roomW, 6);
    // Windows with interior
    const numWin = Math.floor(room.roomW / 78);
    for (let wi = 0; wi < numWin; wi++) {
      const wx2 = 18 + wi * 78;
      ctx.fillStyle = colors.trainWindow;
      ctx.fillRect(wx2 - 2, trainTop + 7, 50, 30);
      ctx.fillStyle = colors.trainWindowInner;
      ctx.fillRect(wx2, trainTop + 9, 46, 26);
      const winFlick = Math.sin(T * 0.4 + wi * 0.7) > -0.2 ? 1 : 0.8;
      ctx.fillStyle = colors.trainWindowLight.replace('0.75', (0.75 * winFlick).toFixed(2));
      ctx.fillRect(wx2 + 2, trainTop + 11, 42, 22);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(wx2 + 2, trainTop + 11, 14, 10);
      // Passenger silhouettes
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(wx2 + 20, trainTop + 18, 8, 12);
      if (wi % 2 === 0) ctx.fillRect(wx2 + 32, trainTop + 16, 6, 14);
    }
    // Color stripe with glow
    ctx.fillStyle = colors.trainStripe;
    ctx.shadowColor = colors.trainStripeGlow;
    ctx.shadowBlur = 10;
    ctx.fillRect(0, trainTop + trainH - 14, room.roomW, 8);
    ctx.shadowBlur = 0;
    // Door openings
    for (const dx of [room.roomW * 0.22, room.roomW * 0.5, room.roomW * 0.78]) {
      ctx.fillStyle = colors.trainDoor;
      ctx.fillRect(dx - 20, trainTop + 4, 40, trainH - 8);
      ctx.fillStyle = colors.trainDoorInner;
      ctx.fillRect(dx - 18, trainTop + 6, 36, trainH - 12);
      ctx.strokeStyle = colors.trainDoorStroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(dx - 20, trainTop + 4, 40, trainH - 8);
      // Door handles
      ctx.fillStyle = colors.trainHandle;
      ctx.fillRect(dx - 3, trainTop + trainH / 2, 6, 14);
    }
    // Headlight flicker
    const flickOn = Math.sin(T * 2.4) > 0.3;
    if (flickOn) {
      ctx.fillStyle = isWasteland ? "rgba(255,200,150,0.12)" : "rgba(180,220,255,0.12)";
      ctx.fillRect(0, trainTop, room.roomW * 0.08, trainH);
      ctx.fillRect(room.roomW * 0.92, trainTop, room.roomW * 0.08, trainH);
    }
    // Destination sign
    ctx.fillStyle = colors.destSign;
    ctx.fillRect(room.roomW / 2 - 58, trainTop + 2, 116, 17);
    ctx.fillStyle = colors.destText;
    ctx.shadowColor = colors.destGlow;
    ctx.shadowBlur = 8;
    ctx.font = "bold 10px Orbitron, monospace";
    ctx.textAlign = "center";
    ctx.fillText(isWasteland ? "DESERT EXPRESS" : "DOWNTOWN EXPRESS", room.roomW / 2, trainTop + 14);
    ctx.shadowBlur = 0;
    // Car number
    ctx.fillStyle = colors.carNum;
    ctx.font = "bold 11px monospace";
    ctx.fillText(isWasteland ? "LINE W · " + metroName : "LINE 1 · " + metroName, room.roomW / 2, trainTop + trainH - 3);

    // ── Platform edge safety stripe ────────────────────────────
    ctx.fillStyle = colors.safety;
    ctx.shadowColor = colors.safetyGlow;
    ctx.shadowBlur = 14;
    ctx.fillRect(0, platEdge - 8, room.roomW, 8);
    ctx.shadowBlur = 0;
    // Hazard diagonal stripes
    ctx.fillStyle = colors.safetyStripe;
    for (let hx = -8; hx < room.roomW; hx += 16) {
      ctx.beginPath();
      ctx.moveTo(hx, platEdge - 8);
      ctx.lineTo(hx + 8, platEdge - 8);
      ctx.lineTo(hx + 16, platEdge);
      ctx.lineTo(hx + 8, platEdge);
      ctx.closePath();
      ctx.fill();
    }
    // Caution text
    ctx.fillStyle = colors.caution;
    ctx.font = "bold 5px monospace";
    ctx.textAlign = "left";
    for (let xi = 0; xi < 8; xi++)
      ctx.fillText("▲ CAUTION — PLATFORM EDGE ▲", xi * 135 + 8, platEdge - 1);

    // ── Ceiling fluorescent lights ─────────────────────────────
    for (const lx of [room.roomW * 0.12, room.roomW * 0.32, room.roomW * 0.5, room.roomW * 0.68, room.roomW * 0.88]) {
      const flick = Math.sin(T * 50 + lx * 0.08) > 0.96 ? 0.35 : 1;
      ctx.fillStyle = colors.lightBox;
      ctx.fillRect(lx - 30, 2, 60, 11);
      ctx.fillStyle = colors.lightGlow.replace('0.95', (0.95 * flick).toFixed(2));
      ctx.shadowColor = colors.lightGlowColor;
      ctx.shadowBlur = 22 * flick;
      ctx.fillRect(lx - 26, 4, 52, 7);
      ctx.shadowBlur = 0;
      // Light cone
      const cone = ctx.createLinearGradient(0, 14, 0, platEdge + 60);
      if (isWasteland) {
        cone.addColorStop(0, `rgba(255,200,150,${0.055 * flick})`);
        cone.addColorStop(0.6, `rgba(255,180,120,${0.02 * flick})`);
        cone.addColorStop(1, "rgba(255,180,120,0)");
      } else {
        cone.addColorStop(0, `rgba(180,210,255,${0.055 * flick})`);
        cone.addColorStop(0.6, `rgba(160,200,255,${0.02 * flick})`);
        cone.addColorStop(1, "rgba(160,200,255,0)");
      }
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(lx - 26, 14);
      ctx.lineTo(lx + 26, 14);
      ctx.lineTo(lx + 75, platEdge + 60);
      ctx.lineTo(lx - 75, platEdge + 60);
      ctx.closePath();
      ctx.fill();
    }

    // ── Wall neon accent strips ────────────────────────────────
    const neonPulse = Math.sin(T * 1.8) * 0.25 + 0.75;
    ctx.fillStyle = isWasteland ? `rgba(255,136,100,${0.45 * neonPulse})` : `rgba(68,238,255,${0.45 * neonPulse})`;
    ctx.shadowColor = colors.neonColor;
    ctx.shadowBlur = 12;
    ctx.fillRect(3, platEdge + 25, 3, room.roomH - platEdge - S - 35);
    ctx.fillRect(room.roomW - 6, platEdge + 25, 3, room.roomH - platEdge - S - 35);
    ctx.shadowBlur = 0;

    // ── Concrete pillars with neon ─────────────────────────────
    for (let pi = 2; pi <= room.W - 3; pi += 4) {
      const pilX = (pi + 0.5) * S;
      const pilH = room.roomH - platEdge - S;
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(pilX - 5, platEdge - 4, 18, pilH);
      ctx.fillStyle = colors.pillar;
      ctx.fillRect(pilX - 8, platEdge - 6, 16, pilH);
      ctx.fillStyle = colors.pillarHighlight;
      ctx.fillRect(pilX - 8, platEdge - 6, 5, pilH);
      ctx.fillStyle = colors.pillarCap;
      ctx.fillRect(pilX - 12, platEdge - 10, 24, 8);
      ctx.fillStyle = colors.pillarBase;
      ctx.fillRect(pilX - 10, room.roomH - S - 6, 20, 6);
      // Neon stripe
      const stripPulse = Math.sin(T * 2.2 + pi * 0.8) * 0.25 + 0.75;
      ctx.fillStyle = colors.pillarStripe.replace('0.85', (0.85 * stripPulse).toFixed(2));
      ctx.shadowColor = colors.pillarStripeGlow;
      ctx.shadowBlur = 14 * stripPulse;
      ctx.fillRect(pilX - 2, platEdge + 12, 4, pilH - 35);
      ctx.shadowBlur = 0;
    }

    // ── Metro passengers (waiting NPCs) ─────────────────────────
    const passengers = isWasteland ? [
      // Wasteland passengers with warm/dusty colors
      { x: S * 2.5, y: S * 4.5, pose: 'sit_phone', color: '#AA6633', accent: '#FF8844', id: 1 },
      { x: S * 5.5, y: S * 4.5, pose: 'sit_relaxed', color: '#886644', accent: '#FFAA66', id: 2 },
      { x: S * 12.5, y: S * 7.5, pose: 'sit_leaning', color: '#996644', accent: '#FFCC88', id: 3 },
      { x: S * 15.5, y: S * 7.5, pose: 'sit_looking', color: '#774422', accent: '#FF8866', id: 4 },
      { x: S * 8, y: platEdge + 38, pose: 'stand_phone', color: '#885533', accent: '#FFAA44', id: 5 },
      { x: S * 11, y: platEdge + 55, pose: 'stand_crossed', color: '#AA7744', accent: '#FF9966', id: 6 },
      { x: S * 16, y: platEdge + 42, pose: 'stand_looking', color: '#775533', accent: '#FFBB77', id: 7 },
      { x: S * 3.5, y: platEdge + 60, pose: 'stand_waiting', color: '#996655', accent: '#FFCC99', id: 8 },
    ] : [
      // Neon City passengers with neon colors
      { x: S * 2.5, y: S * 4.5, pose: 'sit_phone', color: '#FF4488', accent: '#44EEFF', id: 1 },
      { x: S * 5.5, y: S * 4.5, pose: 'sit_relaxed', color: '#44EEFF', accent: '#FF8844', id: 2 },
      { x: S * 12.5, y: S * 7.5, pose: 'sit_leaning', color: '#AA88FF', accent: '#44FF88', id: 3 },
      { x: S * 15.5, y: S * 7.5, pose: 'sit_looking', color: '#FFAA44', accent: '#FF4488', id: 4 },
      { x: S * 8, y: platEdge + 38, pose: 'stand_phone', color: '#44FF88', accent: '#FF4488', id: 5 },
      { x: S * 11, y: platEdge + 55, pose: 'stand_crossed', color: '#FF4488', accent: '#44EEFF', id: 6 },
      { x: S * 16, y: platEdge + 42, pose: 'stand_looking', color: '#44EEFF', accent: '#AA88FF', id: 7 },
      { x: S * 3.5, y: platEdge + 60, pose: 'stand_waiting', color: '#AA88FF', accent: '#FFAA44', id: 8 },
    ];

    for (const p of passengers) {
      ctx.save();
      // Unique animation phase per passenger
      const phase = p.id * 1.3;
      const breathe = Math.sin(T * 2.2 + phase) * 0.8;
      const sway = Math.sin(T * 0.8 + phase) * 2;
      const headTurn = Math.sin(T * 0.4 + phase * 0.7) * 3;
      const lookUp = Math.sin(T * 0.3 + phase) > 0.7;

      if (p.pose.startsWith('sit')) {
        const sitY = p.y - 8;
        const leanAngle = p.pose === 'sit_leaning' ? 0.15 : 0;

        ctx.translate(p.x, sitY);
        ctx.rotate(leanAngle);
        ctx.translate(-p.x, -sitY);

        // Legs (varied positions)
        ctx.fillStyle = '#1a1a2a';
        if (p.pose === 'sit_relaxed') {
          // Crossed legs
          ctx.fillRect(p.x - 8, sitY + 12, 6, 10);
          ctx.fillRect(p.x - 2, sitY + 14, 6, 8);
        } else {
          ctx.fillRect(p.x - 6, sitY + 12, 5, 10);
          ctx.fillRect(p.x + 1, sitY + 12, 5, 10);
        }

        // Body with breathing
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.ellipse(p.x, sitY + 6 + breathe * 0.3, 7 + breathe * 0.2, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p.accent;
        ctx.fillRect(p.x - 2, sitY + 2, 4, 8);
        ctx.shadowBlur = 0;

        // Head with subtle movement
        const headX = p.x + headTurn * 0.3;
        const headY = sitY - 6 + (lookUp ? -1 : 0);
        ctx.fillStyle = '#e8c8a8';
        ctx.beginPath();
        ctx.arc(headX, headY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Eyes (blinking)
        const blink = Math.sin(T * 8 + phase * 2) > 0.95;
        if (!blink) {
          ctx.fillStyle = '#222';
          ctx.fillRect(headX - 3, headY - 1, 2, blink ? 0.5 : 2);
          ctx.fillRect(headX + 1, headY - 1, 2, blink ? 0.5 : 2);
        }

        // Hair
        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.ellipse(headX, headY - 3, 6, 4, 0, Math.PI, Math.PI * 2);
        ctx.fill();

        // Cyber implant with pulse
        const implantGlow = Math.sin(T * 4 + phase) * 0.3 + 0.7;
        ctx.fillStyle = p.accent;
        ctx.shadowColor = p.accent;
        ctx.shadowBlur = 4 * implantGlow;
        ctx.fillRect(headX + 4, headY - 2, 3, 2);
        ctx.shadowBlur = 0;

        if (p.pose === 'sit_phone') {
          // Arms holding phone
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 5, sitY + 6, 4, 8);
          ctx.fillRect(p.x + 1, sitY + 6, 4, 8);
          // Phone
          ctx.fillStyle = '#111';
          ctx.fillRect(p.x - 3, sitY + 12, 6, 9);
          const phoneGlow = Math.sin(T * 3 + phase) * 0.2 + 0.8;
          ctx.fillStyle = `rgba(68,238,255,${0.85 * phoneGlow})`;
          ctx.shadowColor = '#44EEFF';
          ctx.shadowBlur = 8 * phoneGlow;
          ctx.fillRect(p.x - 2, sitY + 13, 4, 7);
          ctx.shadowBlur = 0;
          // Screen reflection on face
          ctx.fillStyle = `rgba(68,238,255,${0.18 * phoneGlow})`;
          ctx.beginPath();
          ctx.arc(headX, headY, 7, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.pose === 'sit_looking') {
          // Looking at train - head turned up
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 9, sitY + 4, 4, 10);
          ctx.fillRect(p.x + 5, sitY + 4, 4, 10);
        }
      } else {
        // Standing passengers
        const standY = p.y;
        const weightShift = p.pose === 'stand_waiting' ? sway : 0;

        // Legs with weight shift
        ctx.fillStyle = '#1a1a2a';
        const legSpread = p.pose === 'stand_crossed' ? 2 : 6;
        ctx.fillRect(p.x - legSpread + weightShift * 0.3, standY + 8, 4, 16);
        ctx.fillRect(p.x + legSpread - 4 - weightShift * 0.3, standY + 8, 4, 16);

        // Shoes
        ctx.fillStyle = p.accent;
        ctx.shadowColor = p.accent;
        ctx.shadowBlur = 3;
        ctx.fillRect(p.x - legSpread - 1 + weightShift * 0.3, standY + 22, 5, 3);
        ctx.fillRect(p.x + legSpread - 4 - weightShift * 0.3, standY + 22, 5, 3);
        ctx.shadowBlur = 0;

        // Body with breathing and sway
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.ellipse(p.x + weightShift * 0.2, standY + breathe * 0.2, 8 + breathe * 0.15, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(p.x - 1, standY - 8, 2, 16);
        ctx.shadowBlur = 0;

        // Neon trim
        ctx.fillStyle = p.accent;
        ctx.shadowColor = p.accent;
        ctx.shadowBlur = 4;
        ctx.fillRect(p.x - 8, standY - 2, 2, 8);
        ctx.fillRect(p.x + 6, standY - 2, 2, 8);
        ctx.shadowBlur = 0;

        // Head with movement
        const headX = p.x + headTurn * 0.4 + weightShift * 0.15;
        const headY = standY - 14;
        ctx.fillStyle = '#e8c8a8';
        ctx.beginPath();
        ctx.arc(headX, headY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Eyes with blinking
        const blink = Math.sin(T * 6 + phase * 3) > 0.92;
        if (!blink) {
          ctx.fillStyle = '#222';
          ctx.fillRect(headX - 3, headY - 1, 2, 2);
          ctx.fillRect(headX + 1, headY - 1, 2, 2);
        }

        // Hair/helmet
        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.ellipse(headX, headY - 3, 7, 4, 0, Math.PI, Math.PI * 2);
        ctx.fill();

        // Visor
        ctx.fillStyle = '#111';
        ctx.fillRect(headX - 6, headY - 1, 12, 3);
        const visorGlow = Math.sin(T * 2 + phase) * 0.2 + 0.8;
        ctx.fillStyle = p.accent;
        ctx.shadowColor = p.accent;
        ctx.shadowBlur = 5 * visorGlow;
        ctx.fillRect(headX - 5, headY - 1, 4, 2);
        ctx.fillRect(headX + 1, headY - 1, 4, 2);
        ctx.shadowBlur = 0;

        if (p.pose === 'stand_phone') {
          // Arm bent holding phone
          const armBob = Math.sin(T * 1.5 + phase) * 1;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x + 6, standY - 6 + armBob, 12, 4);
          ctx.fillStyle = '#e8c8a8';
          ctx.beginPath();
          ctx.arc(p.x + 16, standY - 4 + armBob, 3, 0, Math.PI * 2);
          ctx.fill();
          // Phone
          ctx.fillStyle = '#111';
          ctx.fillRect(p.x + 13, standY - 12 + armBob, 6, 10);
          const phoneGlow = Math.sin(T * 2.8 + phase) * 0.2 + 0.8;
          ctx.fillStyle = `rgba(68,238,255,${0.9 * phoneGlow})`;
          ctx.shadowColor = '#44EEFF';
          ctx.shadowBlur = 10 * phoneGlow;
          ctx.fillRect(p.x + 14, standY - 11 + armBob, 4, 8);
          ctx.shadowBlur = 0;
          // Other arm relaxed
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 10, standY - 2, 4, 10);
          // Face glow from phone
          ctx.fillStyle = `rgba(68,238,255,${0.15 * phoneGlow})`;
          ctx.beginPath();
          ctx.arc(headX, headY, 8, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.pose === 'stand_crossed') {
          // Arms crossed
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 9, standY - 3, 18, 5);
          ctx.fillStyle = '#e8c8a8';
          ctx.beginPath();
          ctx.arc(p.x - 7, standY, 3, 0, Math.PI * 2);
          ctx.arc(p.x + 7, standY, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.pose === 'stand_looking') {
          // Looking at train, hand shading eyes
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 10, standY - 4, 4, 12);
          ctx.fillRect(p.x + 4, standY - 10, 10, 4);
          ctx.fillStyle = '#e8c8a8';
          ctx.beginPath();
          ctx.arc(p.x + 12, standY - 8, 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Waiting - arms at sides with subtle movement
          const armSwing = Math.sin(T * 0.6 + phase) * 2;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 10, standY - 4 + armSwing, 4, 12);
          ctx.fillRect(p.x + 6, standY - 4 - armSwing, 4, 12);
          ctx.fillStyle = '#e8c8a8';
          ctx.beginPath();
          ctx.arc(p.x - 8, standY + 9 + armSwing, 3, 0, Math.PI * 2);
          ctx.arc(p.x + 8, standY + 9 - armSwing, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // ── Advertisement panels (small posters) ────────────────────
    const ads = isWasteland ? [
      { x: S * 1.5, text: "SALVAGE", color: "#FF8844" },
      { x: S * 6.5, text: "HYDRATE", color: "#FFAA66" },
      { x: S * 13.5, text: "SCRAP", color: "#CC8833" },
      { x: S * 18.5, text: "TRADER", color: "#FFCC88" }
    ] : [
      { x: S * 1.5, text: "CYBER", color: "#FF4488" },
      { x: S * 6.5, text: "NEURO", color: "#44FFAA" },
      { x: S * 13.5, text: "HOLO", color: "#FF8844" },
      { x: S * 18.5, text: "SYNTH", color: "#AA88FF" }
    ];
    for (const ad of ads) {
      const adY = platEdge + 42;
      const adW = 28;
      const adH = 22;
      ctx.fillStyle = isWasteland ? "#0c0806" : "#06080c";
      ctx.fillRect(ad.x - adW / 2, adY, adW, adH);
      ctx.strokeStyle = ad.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(ad.x - adW / 2, adY, adW, adH);
      const adPulse = Math.sin(T * 1.3 + ad.x * 0.015) * 0.2 + 0.8;
      ctx.fillStyle = ad.color;
      ctx.shadowColor = ad.color;
      ctx.shadowBlur = 6 * adPulse;
      ctx.font = "bold 6px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillText(ad.text, ad.x, adY + 14);
      ctx.shadowBlur = 0;
    }

    // ── Destination board (compact) ─────────────────────────────
    const boardX = room.roomW / 2;
    const boardY = platEdge + 32;
    ctx.fillStyle = isWasteland ? "#100800" : "#000810";
    ctx.fillRect(boardX - 65, boardY, 130, 28);
    ctx.strokeStyle = isWasteland ? "#443322" : "#224466";
    ctx.lineWidth = 1;
    ctx.strokeRect(boardX - 65, boardY, 130, 28);
    ctx.fillStyle = "#FFAA00";
    ctx.shadowColor = "#FF8800";
    ctx.shadowBlur = 6;
    ctx.font = "bold 8px Orbitron, monospace";
    ctx.textAlign = "center";
    ctx.fillText(isWasteland ? "NEXT: OUTPOST" : "NEXT: CENTRAL", boardX, boardY + 11);
    ctx.fillStyle = isWasteland ? "#FF8844" : "#44FF88";
    ctx.shadowColor = isWasteland ? "#FF6622" : "#22FF44";
    ctx.font = "7px Orbitron, monospace";
    ctx.fillText("2 MIN", boardX, boardY + 22);
    ctx.shadowBlur = 0;

    // ── Map panel (compact) ────────────────────────────────────
    const mapX = S * 4.5;
    const mapY = platEdge + 75;
    ctx.fillStyle = isWasteland ? "#100c08" : "#080c18";
    ctx.fillRect(mapX - 28, mapY, 56, 38);
    ctx.strokeStyle = isWasteland ? "#FF8844" : "#44EEFF";
    ctx.lineWidth = 1;
    ctx.strokeRect(mapX - 28, mapY, 56, 38);
    ctx.fillStyle = isWasteland ? "#FF8844" : "#44EEFF";
    ctx.font = "bold 5px monospace";
    ctx.textAlign = "center";
    ctx.fillText("MAP", mapX, mapY + 9);
    // Line representation
    ctx.strokeStyle = isWasteland ? "#FFAA44" : "#FF4466";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mapX - 20, mapY + 20);
    ctx.lineTo(mapX + 20, mapY + 20);
    ctx.stroke();
    ctx.fillStyle = isWasteland ? "#FFAA44" : "#FF4466";
    ctx.beginPath();
    ctx.arc(mapX - 12, mapY + 20, 3, 0, Math.PI * 2);
    ctx.arc(mapX, mapY + 20, 3, 0, Math.PI * 2);
    ctx.arc(mapX + 12, mapY + 20, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isWasteland ? "#FF8844" : "#44FF88";
    ctx.font = "4px monospace";
    ctx.fillText("HERE", mapX, mapY + 32);
    ctx.strokeStyle = isWasteland ? "#FF8844" : "#44FF88";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(mapX, mapY + 20, 5, 0, Math.PI * 2);
    ctx.stroke();

    // ── Overhead METRO sign ────────────────────────────────────
    ctx.fillStyle = colors.signBg;
    ctx.strokeStyle = colors.signStroke;
    ctx.lineWidth = 2;
    ctx.fillRect(room.roomW / 2 - 82, 0, 164, 23);
    ctx.strokeRect(room.roomW / 2 - 82, 0, 164, 23);
    ctx.fillStyle = colors.signText;
    ctx.shadowColor = colors.signGlow;
    ctx.shadowBlur = 18;
    ctx.font = "bold 13px Orbitron, monospace";
    ctx.textAlign = "center";
    ctx.fillText(lineName, room.roomW / 2, 17);
    ctx.shadowBlur = 0;

    // EXIT signs
    for (const sx2 of [30, room.roomW - 30]) {
      ctx.fillStyle = colors.exitBg;
      ctx.fillRect(sx2 - 24, platEdge + 5, 48, 19);
      ctx.strokeStyle = colors.exitStroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(sx2 - 24, platEdge + 5, 48, 19);
      ctx.fillStyle = colors.exitText;
      ctx.shadowColor = colors.exitGlow;
      ctx.shadowBlur = 12;
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText("← EXIT →", sx2, platEdge + 17);
      ctx.shadowBlur = 0;
    }

    // ── Wave counter ───────────────────────────────────────────
    const aliveCnt = this._indoorBots.filter((b) => !b.dead && !b.dying).length;
    ctx.fillStyle = colors.waveText;
    ctx.font = "bold 11px Orbitron, monospace";
    ctx.textAlign = "right";
    ctx.shadowColor = colors.waveGlow;
    ctx.shadowBlur = 10;
    ctx.fillText(`METRO WAVE ${this._metroWave}`, room.roomW - 10, 17);
    if (aliveCnt > 0) {
      ctx.fillStyle = "#FF4444";
      ctx.shadowColor = "#FF0000";
      ctx.fillText(`▼ ${aliveCnt} HOSTILE`, room.roomW - 10, 32);
    } else if (this._metroWaveTimer !== undefined) {
      ctx.fillStyle = "#FFEE44";
      ctx.shadowColor = "#FFAA00";
      ctx.fillText(`NEXT WAVE ${Math.ceil(this._metroWaveTimer)}s`, room.roomW - 10, 32);
    } else {
      ctx.fillStyle = colors.waveText;
      ctx.fillText("SECTOR CLEAR", room.roomW - 10, 32);
    }
    ctx.shadowBlur = 0;

    // ── Entities ─────────────────────────────────────────────
    for (const d of this.decals) d.render(ctx);
    for (const p of this._indoorPickups) p.render(ctx);
    for (const p of this.particles) p.render(ctx);
    for (const b of this._indoorBullets) if (!b.isPlayer) b.render(ctx);
    for (const bot of this._indoorBots) bot.render(ctx);
    for (const b of this._indoorBullets) if (b.isPlayer) b.render(ctx);
    if (!this.player.dead) this.player.render(ctx);

    // ── Exit hint ─────────────────────────────────────────────
    ctx.save();
    ctx.font = "bold 12px Orbitron, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = colors.exitHint;
    ctx.shadowColor = colors.exitHintGlow;
    ctx.shadowBlur = 12;
    ctx.fillText("[E] EXIT METRO", room.roomW / 2, room.roomH - 10);
    ctx.restore();

    ctx.restore();
  }

  _renderDealershipIndoor(ctx, W, H, shake) {
    const room = this._indoor;
    const offX = (W - room.roomW) / 2,
      offY = (H - room.roomH) / 2;
    const S = room.S;
    const isNeonCity = this.map.config.id === "neon_city";
    const isGalactica = !!this.map.config.galactica;
    const isWasteland = !!this.map.config.wasteland;
    const isSnow = !!this.map.config.snow;
    const t = performance.now() / 1000;

    // Background
    ctx.fillStyle = isNeonCity
      ? "#020208"
      : isGalactica
        ? "#00000e"
        : isWasteland
          ? "#0c0a08"
          : isSnow
            ? "#050810"
            : "#06060a";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(offX + shake.x, offY + shake.y);

    if (isNeonCity) {
      // ═══ NEON CITY CYBERPUNK SHOWROOM ═══

      // Dark reflective floor base
      for (let ty = 0; ty < room.H; ty++) {
        for (let tx = 0; tx < room.W; tx++) {
          const px = tx * S,
            py = ty * S,
            tile = room.layout[ty][tx];
          if (tile === 1) {
            // Walls - dark cyber panels
            ctx.fillStyle = "#0a0a14";
            ctx.fillRect(px, py, S, S);
            // Vertical neon strips on walls
            if ((tx + ty) % 3 === 0) {
              ctx.fillStyle = "rgba(0,255,255,0.15)";
              ctx.fillRect(px + S / 2 - 1, py, 2, S);
            }
          } else {
            // Floor - dark with subtle grid
            ctx.fillStyle = "#08080e";
            ctx.fillRect(px, py, S, S);

            // Neon grid lines
            ctx.strokeStyle = "rgba(0,255,255,0.08)";
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, S, S);

            // Glowing floor tiles at intervals
            if ((tx + ty) % 4 === 0) {
              const pulse = Math.sin(t * 2 + tx + ty) * 0.5 + 0.5;
              ctx.fillStyle = `rgba(0,255,255,${0.03 + pulse * 0.02})`;
              ctx.fillRect(px + 4, py + 4, S - 8, S - 8);
            }
          }
        }
      }

      // Neon border around room
      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#00FFFF";
      ctx.shadowBlur = 15;
      ctx.strokeRect(
        S + 2,
        S + 2,
        room.roomW - S * 2 - 4,
        room.roomH - S * 2 - 4,
      );
      ctx.shadowBlur = 0;

      // Top accent bar with animated gradient
      const topGrad = ctx.createLinearGradient(0, S, room.roomW, S);
      topGrad.addColorStop(0, "rgba(255,0,255,0.3)");
      topGrad.addColorStop(0.5, "rgba(0,255,255,0.5)");
      topGrad.addColorStop(1, "rgba(255,0,255,0.3)");
      ctx.fillStyle = topGrad;
      ctx.fillRect(S, S, room.roomW - S * 2, 4);

      // Showroom title (above the neon border)
      ctx.save();
      ctx.font = "bold 20px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#00FFFF";
      ctx.shadowColor = "#00FFFF";
      ctx.shadowBlur = 25;
      ctx.fillText("◈ CYBER MOTORS ◈", room.roomW / 2, S - 20);
      ctx.shadowBlur = 0;
      ctx.restore();

      // ═══ CASHIER COUNTER AREA ═══
      const counterX = room.roomW / 2 - 75;
      const counterY = S * 1.2;
      const counterW = 150;
      const counterH = 40;

      // Counter shadow
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(counterX + 4, counterY + counterH + 2, counterW, 6);

      // Counter base (dark cyber desk)
      const counterGrad = ctx.createLinearGradient(
        counterX,
        counterY,
        counterX,
        counterY + counterH,
      );
      counterGrad.addColorStop(0, "#1a1a2e");
      counterGrad.addColorStop(0.5, "#12121e");
      counterGrad.addColorStop(1, "#0a0a14");
      ctx.fillStyle = counterGrad;
      ctx.fillRect(counterX, counterY, counterW, counterH);

      // Counter top surface
      ctx.fillStyle = "#2a2a3e";
      ctx.fillRect(counterX - 5, counterY, counterW + 10, 6);

      // Neon edge on counter
      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#00FFFF";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(counterX - 5, counterY + 3);
      ctx.lineTo(counterX + counterW + 5, counterY + 3);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // "SALES" sign on counter front
      ctx.fillStyle = "#00FFFF";
      ctx.shadowColor = "#00FFFF";
      ctx.shadowBlur = 10;
      ctx.font = "bold 12px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillText("SALES DESK", counterX + counterW / 2, counterY + 26);
      ctx.shadowBlur = 0;

      // ═══ DISPLAY CARS ON PLATFORMS ═══
      const carDisplays = [
        // Front row
        {
          x: room.roomW * 0.18,
          y: room.roomH * 0.45,
          color: "#FF3333",
          name: "SPORT",
        },
        {
          x: room.roomW * 0.38,
          y: room.roomH * 0.42,
          color: "#3366FF",
          name: "SEDAN",
        },
        {
          x: room.roomW * 0.62,
          y: room.roomH * 0.42,
          color: "#FFAA00",
          name: "MUSCLE",
        },
        {
          x: room.roomW * 0.82,
          y: room.roomH * 0.45,
          color: "#33FF99",
          name: "SUV",
        },
        // Back row
        {
          x: room.roomW * 0.28,
          y: room.roomH * 0.58,
          color: "#AA44FF",
          name: "COUPE",
        },
        {
          x: room.roomW * 0.72,
          y: room.roomH * 0.58,
          color: "#FF66AA",
          name: "TURBO",
        },
      ];

      for (const car of carDisplays) {
        const pulse = Math.sin(t * 1.5 + car.x * 0.01) * 0.3 + 0.7;
        ctx.save();
        ctx.translate(car.x, car.y);

        // Platform base (circular with glow)
        ctx.beginPath();
        ctx.arc(0, 15, 45, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,255,255,0.06)";
        ctx.fill();
        ctx.strokeStyle = `rgba(0,255,255,${0.5 * pulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner platform ring
        ctx.beginPath();
        ctx.arc(0, 15, 35, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,0,255,${0.3 * pulse})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Rotating light effect under car
        ctx.save();
        ctx.translate(0, 15);
        ctx.rotate(t * 0.5);
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = `rgba(0,255,255,${0.15 * pulse})`;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, 40, (i * Math.PI) / 2, (i * Math.PI) / 2 + 0.4);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // ═══ DISPLAY CAR (top-down view) ═══
        ctx.save();
        // Car shadow
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath();
        ctx.ellipse(3, 18, 28, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Car body
        const carGrad = ctx.createLinearGradient(-25, -15, 25, 15);
        carGrad.addColorStop(0, car.color);
        carGrad.addColorStop(0.5, car.color + "CC");
        carGrad.addColorStop(1, car.color + "88");
        ctx.fillStyle = carGrad;

        // Main body shape
        ctx.beginPath();
        ctx.moveTo(-22, -8);
        ctx.lineTo(-25, 0);
        ctx.lineTo(-22, 10);
        ctx.lineTo(22, 10);
        ctx.lineTo(25, 0);
        ctx.lineTo(22, -8);
        ctx.closePath();
        ctx.fill();

        // Roof/cabin
        ctx.fillStyle = "#111122";
        ctx.beginPath();
        ctx.roundRect(-12, -5, 24, 12, 3);
        ctx.fill();

        // Windshield
        ctx.fillStyle = "rgba(100,200,255,0.4)";
        ctx.beginPath();
        ctx.moveTo(-12, -4);
        ctx.lineTo(-8, -8);
        ctx.lineTo(8, -8);
        ctx.lineTo(12, -4);
        ctx.closePath();
        ctx.fill();

        // Rear window
        ctx.beginPath();
        ctx.moveTo(-10, 6);
        ctx.lineTo(-6, 10);
        ctx.lineTo(6, 10);
        ctx.lineTo(10, 6);
        ctx.closePath();
        ctx.fill();

        // Headlights
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = "#FFFFFF";
        ctx.shadowBlur = 6;
        ctx.fillRect(-20, -6, 4, 3);
        ctx.fillRect(16, -6, 4, 3);
        ctx.shadowBlur = 0;

        // Taillights
        ctx.fillStyle = "#FF0000";
        ctx.shadowColor = "#FF0000";
        ctx.shadowBlur = 4;
        ctx.fillRect(-20, 6, 4, 2);
        ctx.fillRect(16, 6, 4, 2);
        ctx.shadowBlur = 0;

        // Wheels
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.arc(-16, -10, 5, 0, Math.PI * 2);
        ctx.arc(16, -10, 5, 0, Math.PI * 2);
        ctx.arc(-16, 12, 5, 0, Math.PI * 2);
        ctx.arc(16, 12, 5, 0, Math.PI * 2);
        ctx.fill();

        // Wheel rims
        ctx.fillStyle = "#444455";
        ctx.beginPath();
        ctx.arc(-16, -10, 3, 0, Math.PI * 2);
        ctx.arc(16, -10, 3, 0, Math.PI * 2);
        ctx.arc(-16, 12, 3, 0, Math.PI * 2);
        ctx.arc(16, 12, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Car name label
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = car.color;
        ctx.shadowBlur = 8;
        ctx.font = "bold 8px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText(car.name, 0, 45);
        ctx.shadowBlur = 0;

        // Price tag
        ctx.fillStyle = "#00FF88";
        ctx.font = "7px Orbitron, monospace";
        ctx.fillText("ON DISPLAY", 0, 54);

        ctx.restore();
      }

      // Ambient particles
      for (let i = 0; i < 8; i++) {
        const px = (t * 30 + i * 100) % room.roomW;
        const py =
          S * 1.5 + Math.sin(t + i * 2) * 20 + (i * (room.roomH - S * 3)) / 8;
        const alpha = Math.sin(t * 2 + i) * 0.3 + 0.4;
        ctx.fillStyle =
          i % 2 === 0 ? `rgba(0,255,255,${alpha})` : `rgba(255,0,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Side neon strips
      ctx.fillStyle = "rgba(255,0,255,0.2)";
      ctx.fillRect(S, S * 1.5, 3, room.roomH - S * 3);
      ctx.fillRect(room.roomW - S - 3, S * 1.5, 3, room.roomH - S * 3);
    } else if (isGalactica) {
      // ═══ GALACTICA: COSMIC SPACE SHOWROOM ═══

      // Deep space floor — near-black with subtle nebula hue
      for (let ty = 0; ty < room.H; ty++) {
        for (let tx = 0; tx < room.W; tx++) {
          const px = tx * S,
            py = ty * S,
            tile = room.layout[ty][tx];
          if (tile === 1) {
            // Void walls
            ctx.fillStyle = "#04020c";
            ctx.fillRect(px, py, S, S);
            if ((tx + ty) % 4 === 0) {
              ctx.fillStyle = "rgba(170,100,255,0.12)";
              ctx.fillRect(px + S / 2 - 1, py, 2, S);
            }
          } else {
            // Space floor — alternating deep tones
            ctx.fillStyle = (tx + ty) % 2 === 0 ? "#05031a" : "#030114";
            ctx.fillRect(px, py, S, S);
            // Purple grid
            ctx.strokeStyle = "rgba(150,80,255,0.07)";
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, S, S);
            // Twinkling star inlays
            const seed = tx * 17 + ty * 11;
            if (seed % 7 === 0) {
              const twinkle = Math.sin(t * 3 + seed) * 0.5 + 0.5;
              ctx.fillStyle = `rgba(220,200,255,${0.06 + twinkle * 0.12})`;
              ctx.beginPath();
              ctx.arc(
                px + (seed % S),
                py + ((seed * 3) % S),
                1,
                0,
                Math.PI * 2,
              );
              ctx.fill();
            }
            // Animated nebula glow patches
            if (seed % 11 === 0) {
              const pulse = Math.sin(t * 1.2 + seed * 0.5) * 0.5 + 0.5;
              ctx.fillStyle = `rgba(120,60,220,${0.02 + pulse * 0.03})`;
              ctx.fillRect(px + 2, py + 2, S - 4, S - 4);
            }
          }
        }
      }

      // Purple cosmos border
      ctx.strokeStyle = "#AA88FF";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#AA88FF";
      ctx.shadowBlur = 20;
      ctx.strokeRect(
        S + 2,
        S + 2,
        room.roomW - S * 2 - 4,
        room.roomH - S * 2 - 4,
      );
      ctx.shadowBlur = 0;

      // Top accent bar — purple gradient
      const topGrad = ctx.createLinearGradient(0, S, room.roomW, S);
      topGrad.addColorStop(0, "rgba(200,100,255,0.15)");
      topGrad.addColorStop(0.5, "rgba(170,136,255,0.5)");
      topGrad.addColorStop(1, "rgba(200,100,255,0.15)");
      ctx.fillStyle = topGrad;
      ctx.fillRect(S, S, room.roomW - S * 2, 4);

      // Showroom title
      ctx.save();
      ctx.font = "bold 20px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#CC99FF";
      ctx.shadowColor = "#AA88FF";
      ctx.shadowBlur = 28;
      ctx.fillText("◈ GALACTIC MOTORS ◈", room.roomW / 2, S - 20);
      ctx.shadowBlur = 0;
      ctx.restore();

      // ═══ COMMAND COUNTER ═══
      const counterX = room.roomW / 2 - 75;
      const counterY = S * 1.2;
      const counterW = 150,
        counterH = 40;

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(counterX + 4, counterY + counterH + 2, counterW, 6);

      // Counter body
      ctx.fillStyle = "#0e0520";
      ctx.fillRect(counterX, counterY, counterW, counterH);
      // Top surface
      ctx.fillStyle = "#1e0d38";
      ctx.fillRect(counterX - 5, counterY, counterW + 10, 6);
      // Glowing edge
      ctx.strokeStyle = "#AA88FF";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#AA88FF";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(counterX - 5, counterY + 3);
      ctx.lineTo(counterX + counterW + 5, counterY + 3);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Label
      ctx.fillStyle = "#CC99FF";
      ctx.shadowColor = "#AA88FF";
      ctx.shadowBlur = 10;
      ctx.font = "bold 12px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillText("COMMAND DECK", counterX + counterW / 2, counterY + 26);
      ctx.shadowBlur = 0;

      // ═══ UFO / SPACECRAFT DISPLAYS ON PLATFORMS ═══
      const shipDisplays = [
        {
          x: room.roomW * 0.18,
          y: room.roomH * 0.45,
          color: "#FF55FF",
          name: "SPECTER",
        },
        {
          x: room.roomW * 0.38,
          y: room.roomH * 0.42,
          color: "#55AAFF",
          name: "NOVA",
        },
        {
          x: room.roomW * 0.62,
          y: room.roomH * 0.42,
          color: "#AAFFAA",
          name: "PHANTOM",
        },
        {
          x: room.roomW * 0.82,
          y: room.roomH * 0.45,
          color: "#FFAA55",
          name: "TITAN",
        },
        {
          x: room.roomW * 0.28,
          y: room.roomH * 0.58,
          color: "#AA88FF",
          name: "WRAITH",
        },
        {
          x: room.roomW * 0.72,
          y: room.roomH * 0.58,
          color: "#FF8888",
          name: "VOIDSHIP",
        },
      ];

      for (const ship of shipDisplays) {
        const pulse = Math.sin(t * 1.5 + ship.x * 0.01) * 0.3 + 0.7;
        const hover = Math.sin(t * 2 + ship.x * 0.02) * 4; // hovering effect
        ctx.save();
        ctx.translate(ship.x, ship.y + hover);

        // Platform base — glowing purple ring
        ctx.beginPath();
        ctx.arc(0, 18, 45, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(100,50,200,0.08)";
        ctx.fill();
        ctx.strokeStyle = `rgba(170,136,255,${0.55 * pulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner ring
        ctx.beginPath();
        ctx.arc(0, 18, 34, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(200,100,255,${0.3 * pulse})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Rotating energy ring beneath ship
        ctx.save();
        ctx.translate(0, 18);
        ctx.rotate(t * 0.8);
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = `rgba(170,136,255,${0.18 * pulse})`;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(
            0,
            0,
            38,
            (i * Math.PI * 2) / 6,
            (i * Math.PI * 2) / 6 + 0.35,
          );
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // ═══ UFO (top-down view) ═══
        ctx.save();
        // Shadow ellipse
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.beginPath();
        ctx.ellipse(2, 14, 26, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // UFO saucer body
        ctx.beginPath();
        ctx.ellipse(0, 0, 28, 11, 0, 0, Math.PI * 2);
        ctx.fillStyle = ship.color + "BB";
        ctx.fill();
        ctx.strokeStyle = ship.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // UFO dome (cockpit)
        ctx.beginPath();
        ctx.ellipse(0, -2, 13, 8, 0, 0, Math.PI);
        ctx.fillStyle = "rgba(180,220,255,0.35)";
        ctx.fill();
        ctx.strokeStyle = "rgba(200,240,255,0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Engine lights (rotating)
        const numLights = 5;
        for (let i = 0; i < numLights; i++) {
          const ang = (i / numLights) * Math.PI * 2 + t * 2;
          const lx = Math.cos(ang) * 20;
          const ly = Math.sin(ang) * 7 + 2;
          ctx.fillStyle =
            i % 2 === 0
              ? `rgba(255,200,100,${0.7 + Math.sin(t * 4 + i) * 0.3})`
              : `rgba(100,200,255,${0.7 + Math.sin(t * 4 + i) * 0.3})`;
          ctx.beginPath();
          ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Center beam glow downward
        ctx.fillStyle = `rgba(170,136,255,${0.15 + pulse * 0.1})`;
        ctx.beginPath();
        ctx.moveTo(-4, 5);
        ctx.lineTo(4, 5);
        ctx.lineTo(8, 20);
        ctx.lineTo(-8, 20);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Ship name label
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = ship.color;
        ctx.shadowBlur = 8;
        ctx.font = "bold 8px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText(ship.name, 0, 48);
        ctx.shadowBlur = 0;

        // "ON DISPLAY" tag
        ctx.fillStyle = "#AA88FF";
        ctx.font = "7px Orbitron, monospace";
        ctx.fillText("ON DISPLAY", 0, 57);

        ctx.restore();
      }

      // Ambient space particles — drifting stars
      for (let i = 0; i < 12; i++) {
        const px = (t * 20 + i * 80) % room.roomW;
        const py =
          S * 1.5 +
          Math.sin(t * 0.8 + i * 1.3) * 25 +
          (i * (room.roomH - S * 3)) / 12;
        const alpha = Math.sin(t * 1.5 + i) * 0.3 + 0.4;
        ctx.fillStyle =
          i % 3 === 0
            ? `rgba(170,136,255,${alpha})`
            : i % 3 === 1
              ? `rgba(200,100,255,${alpha})`
              : `rgba(100,180,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, i % 4 === 0 ? 2 : 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Side purple strips
      ctx.fillStyle = "rgba(150,80,255,0.22)";
      ctx.fillRect(S, S * 1.5, 3, room.roomH - S * 3);
      ctx.fillRect(room.roomW - S - 3, S * 1.5, 3, room.roomH - S * 3);
    } else if (isWasteland) {
      // ═══ WASTELAND: POST-APOCALYPTIC GARAGE ═══

      // Dusty concrete floor base
      for (let ty = 0; ty < room.H; ty++) {
        for (let tx = 0; tx < room.W; tx++) {
          const px = tx * S,
            py = ty * S,
            tile = room.layout[ty][tx];
          if (tile === 1) {
            // Rusted metal walls
            ctx.fillStyle = "#1a1612";
            ctx.fillRect(px, py, S, S);
            // Rust streaks
            if ((tx + ty) % 4 === 0) {
              ctx.fillStyle = "rgba(120,60,30,0.25)";
              ctx.fillRect(px + S / 2 - 2, py, 4, S);
            }
            // Rivets
            if ((tx * 3 + ty * 5) % 5 === 0) {
              ctx.fillStyle = "#3a3230";
              ctx.beginPath();
              ctx.arc(px + 10, py + 10, 3, 0, Math.PI * 2);
              ctx.arc(px + S - 10, py + 10, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            // Cracked concrete floor
            const floorSeed = tx * 17 + ty * 31;
            ctx.fillStyle = floorSeed % 2 === 0 ? "#28241e" : "#242018";
            ctx.fillRect(px, py, S, S);

            // Floor cracks
            ctx.strokeStyle = "rgba(0,0,0,0.3)";
            ctx.lineWidth = 1;
            if (floorSeed % 7 === 0) {
              ctx.beginPath();
              ctx.moveTo(px + 5, py + S / 2);
              ctx.lineTo(px + S - 10, py + S / 3);
              ctx.stroke();
            }

            // Oil stains
            if (floorSeed % 11 === 0) {
              ctx.fillStyle = "rgba(20,15,10,0.4)";
              ctx.beginPath();
              ctx.ellipse(px + S / 2, py + S / 2, 15, 10, floorSeed * 0.5, 0, Math.PI * 2);
              ctx.fill();
            }

            // Grid lines (faded)
            ctx.strokeStyle = "rgba(80,60,40,0.12)";
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, S, S);
          }
        }
      }

      // Rusty border around room
      ctx.strokeStyle = "#8a6040";
      ctx.lineWidth = 3;
      ctx.strokeRect(
        S + 2,
        S + 2,
        room.roomW - S * 2 - 4,
        room.roomH - S * 2 - 4,
      );

      // Top warning stripe bar
      const stripeW = 20;
      for (let sx = S; sx < room.roomW - S; sx += stripeW * 2) {
        ctx.fillStyle = "#8a7030";
        ctx.fillRect(sx, S, stripeW, 6);
        ctx.fillStyle = "#2a2420";
        ctx.fillRect(sx + stripeW, S, stripeW, 6);
      }

      // Showroom title
      ctx.save();
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#a08060";
      ctx.fillText("▲ WASTELAND MOTORS ▲", room.roomW / 2, S - 20);
      ctx.restore();

      // ═══ WORK COUNTER / DESK ═══
      const counterX = room.roomW / 2 - 75;
      const counterY = S * 1.2;
      const counterW = 150;
      const counterH = 40;

      // Counter shadow
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(counterX + 4, counterY + counterH + 2, counterW, 6);

      // Counter base (rusty metal)
      const counterGrad = ctx.createLinearGradient(
        counterX,
        counterY,
        counterX,
        counterY + counterH,
      );
      counterGrad.addColorStop(0, "#4a4038");
      counterGrad.addColorStop(0.5, "#3a3228");
      counterGrad.addColorStop(1, "#2a2420");
      ctx.fillStyle = counterGrad;
      ctx.fillRect(counterX, counterY, counterW, counterH);

      // Counter top surface (worn wood)
      ctx.fillStyle = "#5a4a38";
      ctx.fillRect(counterX - 5, counterY, counterW + 10, 6);

      // Rust edge on counter
      ctx.strokeStyle = "#6a5040";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(counterX - 5, counterY + 3);
      ctx.lineTo(counterX + counterW + 5, counterY + 3);
      ctx.stroke();

      // "PARTS" sign on counter
      ctx.fillStyle = "#9a8060";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("PARTS & SERVICE", counterX + counterW / 2, counterY + 26);

      // ═══ SALVAGED VEHICLES ON PLATFORMS ═══
      const carDisplays = [
        // Front row
        { x: room.roomW * 0.18, y: room.roomH * 0.45, color: "#6a5040", name: "RUST BUCKET" },
        { x: room.roomW * 0.38, y: room.roomH * 0.42, color: "#5a6050", name: "SURVIVOR" },
        { x: room.roomW * 0.62, y: room.roomH * 0.42, color: "#7a6a50", name: "WAR WAGON" },
        { x: room.roomW * 0.82, y: room.roomH * 0.45, color: "#6a6055", name: "TANK" },
        // Back row
        { x: room.roomW * 0.28, y: room.roomH * 0.58, color: "#5a5048", name: "SALVAGE" },
        { x: room.roomW * 0.72, y: room.roomH * 0.58, color: "#8a7060", name: "BEAST" },
      ];

      for (const car of carDisplays) {
        ctx.save();
        ctx.translate(car.x, car.y);

        // Platform base (concrete slab with cracks)
        ctx.fillStyle = "#3a3530";
        ctx.beginPath();
        ctx.arc(0, 15, 45, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#4a4540";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner platform ring (oil ring)
        ctx.beginPath();
        ctx.arc(0, 15, 35, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(40,30,20,0.5)";
        ctx.lineWidth = 3;
        ctx.stroke();

        // ═══ SALVAGED CAR (top-down view) ═══
        ctx.save();
        // Car shadow
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath();
        ctx.ellipse(3, 18, 28, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Car body (rusty, dented)
        const carGrad = ctx.createLinearGradient(-25, -15, 25, 15);
        carGrad.addColorStop(0, car.color);
        carGrad.addColorStop(0.5, car.color);
        carGrad.addColorStop(1, "#3a3530");
        ctx.fillStyle = carGrad;

        // Main body shape
        ctx.beginPath();
        ctx.moveTo(-22, -8);
        ctx.lineTo(-25, 0);
        ctx.lineTo(-22, 10);
        ctx.lineTo(22, 10);
        ctx.lineTo(25, 0);
        ctx.lineTo(22, -8);
        ctx.closePath();
        ctx.fill();

        // Rust patches
        ctx.fillStyle = "rgba(100,50,20,0.4)";
        ctx.fillRect(-18, -6, 8, 5);
        ctx.fillRect(12, 4, 10, 4);

        // Roof/cabin (dented)
        ctx.fillStyle = "#2a2520";
        ctx.beginPath();
        ctx.roundRect(-12, -5, 24, 12, 2);
        ctx.fill();

        // Cracked windshield
        ctx.fillStyle = "rgba(80,80,70,0.5)";
        ctx.beginPath();
        ctx.moveTo(-12, -4);
        ctx.lineTo(-8, -8);
        ctx.lineTo(8, -8);
        ctx.lineTo(12, -4);
        ctx.closePath();
        ctx.fill();
        // Crack line
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-6, -7);
        ctx.lineTo(4, -4);
        ctx.stroke();

        // Headlights (one broken, one dim)
        ctx.fillStyle = "#6a6050";
        ctx.fillRect(-20, -6, 4, 3);
        ctx.fillStyle = "#888870";
        ctx.fillRect(16, -6, 4, 3);

        // Taillights (dim red)
        ctx.fillStyle = "#5a3030";
        ctx.fillRect(-20, 6, 4, 2);
        ctx.fillRect(16, 6, 4, 2);

        // Wheels (worn)
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.arc(-16, -10, 5, 0, Math.PI * 2);
        ctx.arc(16, -10, 5, 0, Math.PI * 2);
        ctx.arc(-16, 12, 5, 0, Math.PI * 2);
        ctx.arc(16, 12, 5, 0, Math.PI * 2);
        ctx.fill();

        // Wheel rims (rusty)
        ctx.fillStyle = "#4a4038";
        ctx.beginPath();
        ctx.arc(-16, -10, 3, 0, Math.PI * 2);
        ctx.arc(16, -10, 3, 0, Math.PI * 2);
        ctx.arc(-16, 12, 3, 0, Math.PI * 2);
        ctx.arc(16, 12, 3, 0, Math.PI * 2);
        ctx.fill();

        // Armor plating / modifications
        ctx.fillStyle = "#4a4540";
        ctx.fillRect(-24, -2, 4, 6);
        ctx.fillRect(20, -2, 4, 6);

        ctx.restore();

        // Car name label
        ctx.fillStyle = "#a09080";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(car.name, 0, 45);

        // Price tag
        ctx.fillStyle = "#8a7a60";
        ctx.font = "7px monospace";
        ctx.fillText("SALVAGED", 0, 54);

        ctx.restore();
      }

      // Dust particles
      for (let i = 0; i < 6; i++) {
        const px = (t * 15 + i * 120) % room.roomW;
        const py = S * 1.5 + Math.sin(t * 0.5 + i * 2) * 30 + (i * (room.roomH - S * 3)) / 6;
        const alpha = Math.sin(t + i) * 0.15 + 0.2;
        ctx.fillStyle = `rgba(120,100,70,${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Side rust strips
      ctx.fillStyle = "rgba(100,60,30,0.25)";
      ctx.fillRect(S, S * 1.5, 4, room.roomH - S * 3);
      ctx.fillRect(room.roomW - S - 4, S * 1.5, 4, room.roomH - S * 3);

      // Tool rack on left wall
      ctx.fillStyle = "#3a3530";
      ctx.fillRect(S + 8, S * 2, 20, 80);
      ctx.fillStyle = "#5a5550";
      ctx.fillRect(S + 10, S * 2 + 10, 3, 15);
      ctx.fillRect(S + 16, S * 2 + 8, 3, 20);
      ctx.fillRect(S + 22, S * 2 + 12, 3, 12);

      // Barrel on right wall
      ctx.fillStyle = "#4a4540";
      ctx.beginPath();
      ctx.ellipse(room.roomW - S - 30, S * 2.5, 18, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5a5550";
      ctx.fillRect(room.roomW - S - 48, S * 2.5, 36, 3);
    } else if (isSnow) {
      // ═══ FROZEN TUNDRA: ICE CRYSTAL SHOWROOM ═══

      // Frozen floor base with ice patterns
      for (let ty = 0; ty < room.H; ty++) {
        for (let tx = 0; tx < room.W; tx++) {
          const px = tx * S,
            py = ty * S,
            tile = room.layout[ty][tx];
          if (tile === 1) {
            // Ice walls - frozen blue panels
            ctx.fillStyle = "#0a1520";
            ctx.fillRect(px, py, S, S);
            // Frost crystal strips on walls
            if ((tx + ty) % 3 === 0) {
              ctx.fillStyle = "rgba(100,180,255,0.15)";
              ctx.fillRect(px + S / 2 - 1, py, 2, S);
            }
            // Ice crystals on walls
            if ((tx * 3 + ty * 5) % 7 === 0) {
              ctx.fillStyle = "rgba(180,220,255,0.2)";
              ctx.beginPath();
              ctx.moveTo(px + S/2, py + 5);
              ctx.lineTo(px + S/2 - 5, py + 15);
              ctx.lineTo(px + S/2 + 5, py + 15);
              ctx.closePath();
              ctx.fill();
            }
          } else {
            // Frozen floor - ice blue with subtle pattern
            const floorSeed = tx * 17 + ty * 31;
            ctx.fillStyle = floorSeed % 2 === 0 ? "#0c1825" : "#081420";
            ctx.fillRect(px, py, S, S);

            // Ice grid lines
            ctx.strokeStyle = "rgba(100,180,255,0.08)";
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, S, S);

            // Frost patches
            if (floorSeed % 9 === 0) {
              const pulse = Math.sin(t * 1.5 + tx + ty) * 0.3 + 0.7;
              ctx.fillStyle = `rgba(150,200,255,${0.04 * pulse})`;
              ctx.fillRect(px + 2, py + 2, S - 4, S - 4);
            }

            // Ice cracks
            if (floorSeed % 11 === 0) {
              ctx.strokeStyle = "rgba(180,220,255,0.12)";
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(px + 3, py + S/2);
              ctx.lineTo(px + S - 5, py + S/3);
              ctx.stroke();
            }
          }
        }
      }

      // Ice crystal border around room
      ctx.strokeStyle = "#66BBFF";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#66BBFF";
      ctx.shadowBlur = 15;
      ctx.strokeRect(
        S + 2,
        S + 2,
        room.roomW - S * 2 - 4,
        room.roomH - S * 2 - 4,
      );
      ctx.shadowBlur = 0;

      // Top frost accent bar with animated shimmer
      const topGrad = ctx.createLinearGradient(0, S, room.roomW, S);
      topGrad.addColorStop(0, "rgba(100,180,255,0.2)");
      topGrad.addColorStop(0.5, "rgba(180,220,255,0.5)");
      topGrad.addColorStop(1, "rgba(100,180,255,0.2)");
      ctx.fillStyle = topGrad;
      ctx.fillRect(S, S, room.roomW - S * 2, 4);

      // Showroom title with ice theme
      ctx.save();
      ctx.font = "bold 20px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#AADDFF";
      ctx.shadowColor = "#66BBFF";
      ctx.shadowBlur = 25;
      ctx.fillText("❄ FROST MOTORS ❄", room.roomW / 2, S - 20);
      ctx.shadowBlur = 0;
      ctx.restore();

      // ═══ ICE COUNTER AREA ═══
      const counterX = room.roomW / 2 - 75;
      const counterY = S * 1.2;
      const counterW = 150;
      const counterH = 40;

      // Counter shadow
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(counterX + 4, counterY + counterH + 2, counterW, 6);

      // Counter base (frozen ice desk)
      const counterGrad = ctx.createLinearGradient(
        counterX,
        counterY,
        counterX,
        counterY + counterH,
      );
      counterGrad.addColorStop(0, "#1a2a3e");
      counterGrad.addColorStop(0.5, "#12202e");
      counterGrad.addColorStop(1, "#0a1820");
      ctx.fillStyle = counterGrad;
      ctx.fillRect(counterX, counterY, counterW, counterH);

      // Counter top surface - frosted
      ctx.fillStyle = "#2a3a4e";
      ctx.fillRect(counterX - 5, counterY, counterW + 10, 6);

      // Ice edge glow on counter
      ctx.strokeStyle = "#66BBFF";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#66BBFF";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(counterX - 5, counterY + 3);
      ctx.lineTo(counterX + counterW + 5, counterY + 3);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // "SALES" sign on counter front
      ctx.fillStyle = "#88CCFF";
      ctx.shadowColor = "#66BBFF";
      ctx.shadowBlur = 10;
      ctx.font = "bold 12px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillText("FROST SALES", counterX + counterW / 2, counterY + 26);
      ctx.shadowBlur = 0;

      // ═══ DISPLAY VEHICLES ON ICE PLATFORMS ═══
      const carDisplays = [
        // Front row
        {
          x: room.roomW * 0.18,
          y: room.roomH * 0.45,
          color: "#4488BB",
          name: "ICE RUNNER",
        },
        {
          x: room.roomW * 0.38,
          y: room.roomH * 0.42,
          color: "#5599CC",
          name: "BLIZZARD",
        },
        {
          x: room.roomW * 0.62,
          y: room.roomH * 0.42,
          color: "#6699AA",
          name: "FROSTBITE",
        },
        {
          x: room.roomW * 0.82,
          y: room.roomH * 0.45,
          color: "#77AACC",
          name: "AVALANCHE",
        },
        // Back row
        {
          x: room.roomW * 0.28,
          y: room.roomH * 0.58,
          color: "#3388AA",
          name: "GLACIER",
        },
        {
          x: room.roomW * 0.72,
          y: room.roomH * 0.58,
          color: "#66BBDD",
          name: "SNOWSTORM",
        },
      ];

      for (const car of carDisplays) {
        const pulse = Math.sin(t * 1.5 + car.x * 0.01) * 0.3 + 0.7;
        ctx.save();
        ctx.translate(car.x, car.y);

        // Platform base (ice circle with frost glow)
        ctx.beginPath();
        ctx.arc(0, 15, 45, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(100,180,255,0.06)";
        ctx.fill();
        ctx.strokeStyle = `rgba(100,180,255,${0.5 * pulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner ice ring
        ctx.beginPath();
        ctx.arc(0, 15, 35, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(150,200,255,${0.3 * pulse})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Rotating snowflake pattern under vehicle
        ctx.save();
        ctx.translate(0, 15);
        ctx.rotate(t * 0.3);
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = `rgba(150,200,255,${0.12 * pulse})`;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, 40, (i * Math.PI) / 3, (i * Math.PI) / 3 + 0.3);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // ═══ WINTER VEHICLE (top-down view) ═══
        ctx.save();
        // Vehicle shadow
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.ellipse(3, 18, 28, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Vehicle body with frost coating
        const carGrad = ctx.createLinearGradient(-25, -15, 25, 15);
        carGrad.addColorStop(0, car.color);
        carGrad.addColorStop(0.5, car.color + "DD");
        carGrad.addColorStop(1, car.color + "AA");
        ctx.fillStyle = carGrad;

        // Main body shape
        ctx.beginPath();
        ctx.moveTo(-22, -8);
        ctx.lineTo(-25, 0);
        ctx.lineTo(-22, 10);
        ctx.lineTo(22, 10);
        ctx.lineTo(25, 0);
        ctx.lineTo(22, -8);
        ctx.closePath();
        ctx.fill();

        // Snow on roof
        ctx.fillStyle = "rgba(220,240,255,0.6)";
        ctx.beginPath();
        ctx.roundRect(-14, -7, 28, 4, 2);
        ctx.fill();

        // Roof/cabin
        ctx.fillStyle = "#152030";
        ctx.beginPath();
        ctx.roundRect(-12, -5, 24, 12, 3);
        ctx.fill();

        // Windshield with frost
        ctx.fillStyle = "rgba(150,200,255,0.4)";
        ctx.beginPath();
        ctx.moveTo(-12, -4);
        ctx.lineTo(-8, -8);
        ctx.lineTo(8, -8);
        ctx.lineTo(12, -4);
        ctx.closePath();
        ctx.fill();

        // Frost crystals on windshield
        ctx.fillStyle = "rgba(220,240,255,0.3)";
        ctx.fillRect(-10, -7, 4, 2);
        ctx.fillRect(6, -7, 4, 2);

        // Rear window
        ctx.fillStyle = "rgba(150,200,255,0.35)";
        ctx.beginPath();
        ctx.moveTo(-10, 6);
        ctx.lineTo(-6, 10);
        ctx.lineTo(6, 10);
        ctx.lineTo(10, 6);
        ctx.closePath();
        ctx.fill();

        // Headlights - bright ice blue
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = "#88DDFF";
        ctx.shadowBlur = 6;
        ctx.fillRect(-20, -6, 4, 3);
        ctx.fillRect(16, -6, 4, 3);
        ctx.shadowBlur = 0;

        // Taillights - cold red
        ctx.fillStyle = "#CC4444";
        ctx.shadowColor = "#CC4444";
        ctx.shadowBlur = 4;
        ctx.fillRect(-20, 6, 4, 2);
        ctx.fillRect(16, 6, 4, 2);
        ctx.shadowBlur = 0;

        // Winter tires
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.arc(-16, -10, 5, 0, Math.PI * 2);
        ctx.arc(16, -10, 5, 0, Math.PI * 2);
        ctx.arc(-16, 12, 5, 0, Math.PI * 2);
        ctx.arc(16, 12, 5, 0, Math.PI * 2);
        ctx.fill();

        // Wheel rims - chrome/silver
        ctx.fillStyle = "#667788";
        ctx.beginPath();
        ctx.arc(-16, -10, 3, 0, Math.PI * 2);
        ctx.arc(16, -10, 3, 0, Math.PI * 2);
        ctx.arc(-16, 12, 3, 0, Math.PI * 2);
        ctx.arc(16, 12, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Car name label
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = car.color;
        ctx.shadowBlur = 8;
        ctx.font = "bold 8px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText(car.name, 0, 45);
        ctx.shadowBlur = 0;

        // Price tag
        ctx.fillStyle = "#88CCFF";
        ctx.font = "7px Orbitron, monospace";
        ctx.fillText("ON DISPLAY", 0, 54);

        ctx.restore();
      }

      // Snowflake particles
      for (let i = 0; i < 10; i++) {
        const px = (t * 20 + i * 90) % room.roomW;
        const py =
          S * 1.5 + Math.sin(t * 0.8 + i * 1.5) * 25 + (i * (room.roomH - S * 3)) / 10;
        const alpha = Math.sin(t * 2 + i) * 0.3 + 0.4;
        const size = (i % 3) + 1;
        ctx.fillStyle = `rgba(200,230,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Side ice crystal strips
      ctx.fillStyle = "rgba(100,180,255,0.15)";
      ctx.fillRect(S, S * 1.5, 3, room.roomH - S * 3);
      ctx.fillRect(room.roomW - S - 3, S * 1.5, 3, room.roomH - S * 3);

      // Ice stalactites on ceiling (left)
      for (let i = 0; i < 4; i++) {
        const ix = S + 30 + i * 35;
        const ih = 15 + (i % 2) * 10;
        ctx.fillStyle = "rgba(150,200,255,0.25)";
        ctx.beginPath();
        ctx.moveTo(ix - 6, S);
        ctx.lineTo(ix, S + ih);
        ctx.lineTo(ix + 6, S);
        ctx.closePath();
        ctx.fill();
      }

      // Ice stalactites on ceiling (right)
      for (let i = 0; i < 4; i++) {
        const ix = room.roomW - S - 30 - i * 35;
        const ih = 12 + (i % 2) * 8;
        ctx.fillStyle = "rgba(150,200,255,0.25)";
        ctx.beginPath();
        ctx.moveTo(ix - 5, S);
        ctx.lineTo(ix, S + ih);
        ctx.lineTo(ix + 5, S);
        ctx.closePath();
        ctx.fill();
      }

      // Frozen barrel/container on right
      ctx.fillStyle = "#2a3a4a";
      ctx.beginPath();
      ctx.ellipse(room.roomW - S - 30, S * 2.5, 18, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(150,200,255,0.3)";
      ctx.fillRect(room.roomW - S - 48, S * 2.5, 36, 3);
    } else {
      // ═══ DEFAULT SHOWROOM (other maps) ═══
      for (let ty = 0; ty < room.H; ty++) {
        for (let tx = 0; tx < room.W; tx++) {
          const px = tx * S,
            py = ty * S,
            tile = room.layout[ty][tx];
          if (tile === 1) {
            ctx.fillStyle = "#111120";
            ctx.fillRect(px, py, S, S);
          } else {
            ctx.fillStyle = (tx + ty) % 2 === 0 ? "#12121e" : "#0e0e18";
            ctx.fillRect(px, py, S, S);
            ctx.fillStyle = "rgba(68,238,255,0.018)";
            ctx.fillRect(px, py, S, S);
          }
        }
      }
      // Neon accent stripe
      ctx.fillStyle = "rgba(68,238,255,0.20)";
      ctx.fillRect(0, S, room.roomW, 3);
      ctx.fillStyle = "rgba(68,238,255,0.08)";
      ctx.fillRect(0, S, room.roomW, S * 0.3);
    }

    // Salespersons + bullets + player
    for (const sp of this._salespersons) sp.render(ctx);
    for (const b of this._indoorBullets) b.render(ctx);
    if (!this.player.dead) this.player.render(ctx);

    // [T] hint near salesperson
    if (this._nearSalesperson) {
      const nearSp = this._salespersons.find(
        (sp) => Math.hypot(sp.x - this.player.x, sp.y - this.player.y) < 60,
      );
      if (nearSp) {
        ctx.save();
        ctx.font = "bold 14px Orbitron, monospace";
        ctx.textAlign = "center";
        if (isNeonCity) {
          ctx.fillStyle = "#00FFFF";
          ctx.shadowColor = "#00FFFF";
          ctx.shadowBlur = 12;
          ctx.fillText("[T] OPEN SHOP", nearSp.x, nearSp.y - 102);
        } else if (isGalactica) {
          ctx.fillStyle = "#CC99FF";
          ctx.shadowColor = "#AA88FF";
          ctx.shadowBlur = 14;
          ctx.fillText("[T] OPEN SHOP", nearSp.x, nearSp.y - 102);
        } else if (isWasteland) {
          ctx.fillStyle = "#c0a080";
          ctx.shadowColor = "#8a6040";
          ctx.shadowBlur = 8;
          ctx.fillText("[T] OPEN SHOP", nearSp.x, nearSp.y - 102);
        } else if (isSnow) {
          ctx.fillStyle = "#AADDFF";
          ctx.shadowColor = "#66BBFF";
          ctx.shadowBlur = 12;
          ctx.fillText("[T] OPEN SHOP", nearSp.x, nearSp.y - 102);
        } else {
          ctx.fillStyle = "#FFFFAA";
          ctx.shadowColor = "#FFFF00";
          ctx.shadowBlur = 10;
          ctx.fillText("[T] OPEN SHOP", nearSp.x, nearSp.y - 62);
        }
        ctx.restore();
      }
    }

    // [E] EXIT hint
    ctx.save();
    ctx.font = "bold 16px Orbitron, monospace";
    ctx.textAlign = "center";
    if (isNeonCity) {
      ctx.fillStyle = "#00FFFF";
      ctx.shadowColor = "#00FFFF";
      ctx.shadowBlur = 10;
      ctx.fillText("[E] EXIT", room.roomW / 2, room.roomH - 25);
      ctx.fillText("[E] EXIT", room.entryX, room.roomH - 25);
    } else if (isGalactica) {
      ctx.fillStyle = "#CC99FF";
      ctx.shadowColor = "#AA88FF";
      ctx.shadowBlur = 12;
      ctx.fillText("[E] EXIT", room.entryX, room.roomH - 25);
    } else if (isWasteland) {
      ctx.fillStyle = "#c0a080";
      ctx.shadowColor = "#8a6040";
      ctx.shadowBlur = 8;
      ctx.fillText("[E] EXIT", room.entryX, room.roomH - 25);
    } else if (isSnow) {
      ctx.fillStyle = "#AADDFF";
      ctx.shadowColor = "#66BBFF";
      ctx.shadowBlur = 10;
      ctx.fillText("[E] EXIT", room.entryX, room.roomH - 25);
    } else {
      ctx.fillStyle = "#FFFFAA";
      ctx.shadowColor = "#FFFF00";
      ctx.shadowBlur = 10;
      ctx.fillText("[E] EXIT", room.entryX, room.roomH - 8);
    }
    ctx.restore();

    ctx.restore();
  }

  _renderCasinoIndoor(ctx, W, H, shake) {
    const room = this._indoor;
    const offX = (W - room.roomW) / 2,
      offY = (H - room.roomH) / 2;
    const S = room.S;
    ctx.fillStyle = "#06030a";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(offX + shake.x, offY + shake.y);
    // Rich casino floor: dark red velvet + gold trim
    for (let ty = 0; ty < room.H; ty++) {
      for (let tx = 0; tx < room.W; tx++) {
        const px = tx * S,
          py = ty * S,
          t = room.layout[ty][tx];
        if (t === 1) {
          ctx.fillStyle = "#110008";
          ctx.fillRect(px, py, S, S);
        } else if (t === 2) {
          // Casino table
          ctx.fillStyle = "#0a1a08";
          ctx.fillRect(px, py, S, S);
          ctx.fillStyle = "#1a3a18";
          ctx.fillRect(px + 6, py + 6, S - 12, S - 12);
          ctx.strokeStyle = "#CC9900";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 6, py + 6, S - 12, S - 12);
          ctx.fillStyle = "#FFDD00";
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "center";
          ctx.fillText("♠", px + S / 2, py + S / 2 + 3);
        } else {
          ctx.fillStyle = (tx + ty) % 2 === 0 ? "#150010" : "#120008";
          ctx.fillRect(px, py, S, S);
          // Gold border lines
          ctx.fillStyle = "rgba(204,153,0,0.12)";
          ctx.fillRect(px, py, S, 1);
          ctx.fillRect(px, py, 1, S);
        }
      }
    }
    // Neon accent
    ctx.fillStyle = "rgba(255,68,170,0.22)";
    ctx.fillRect(0, S, room.roomW, 3);
    ctx.fillStyle = "rgba(255,68,170,0.07)";
    ctx.fillRect(0, S, room.roomW, S * 0.3);
    // Casino hosts + player
    for (const h of this._casinoHosts) h.render(ctx);
    if (!this.player.dead) this.player.render(ctx);
    // [T] hint near host
    if (this._nearCasinoHost) {
      const nearH = this._casinoHosts.find(
        (h) => Math.hypot(h.x - this.player.x, h.y - this.player.y) < 65,
      );
      if (nearH) {
        ctx.save();
        ctx.font = "bold 11px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#FFEEAA";
        ctx.shadowColor = "#FF44AA";
        ctx.shadowBlur = 12;
        ctx.fillText("[T] OPEN CASINO", nearH.x, nearH.y - 62);
        ctx.restore();
      }
    }
    // [E] EXIT hint
    ctx.save();
    ctx.font = "bold 11px Orbitron, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFEEAA";
    ctx.shadowColor = "#FF44AA";
    ctx.shadowBlur = 10;
    ctx.fillText("[E] EXIT", room.entryX, room.roomH - 8);
    ctx.restore();
    ctx.restore();
  }

  // ── Render ─────────────────────────────────────────────────
  _render() {
    const ctx = this.ctx;
    const W = this.canvas.width,
      H = this.canvas.height;
    const shake = this.hud.getShakeOffset();

    this.canvas.style.cursor =
      this.state === "shop" ||
      this.state === "blackmarket" ||
      this.state === "carshop" ||
      this.state === "casino" ||
      this.state === "buildingshop" ||
      this.state === "bigmap" ||
      this.state === "paused" ||
      this.state === "gameover"
        ? "default"
        : "none";

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#08080f";
    ctx.fillRect(0, 0, W, H);

    // World
    if (this._indoor) {
      this._renderIndoorScene(ctx, W, H, shake);
    } else {
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(-this.camX + shake.x, -this.camY + shake.y);
      this.map.render(ctx, this.camX, this.camY, W, H);
      this.map.renderStreetLightPoles(
        ctx,
        this.camX,
        this.camY,
        W,
        H,
        this._nightAlpha,
      );
      this.map.renderMetroEntrance(ctx);
      if (this._districtLayout) {
        const mapPxW = this.map.W * this.map.S;
        const mapPxH = this.map.H * this.map.S;
        const zoneW = mapPxW / 3;
        for (let i = 0; i < 3; i++) {
          const cfg = CONFIG.DISTRICTS.find(
            (d) => d.id === this._districtLayout[i],
          );
          ctx.fillStyle = cfg.tint;
          ctx.fillRect(i * zoneW, 0, zoneW, mapPxH);
        }
      }
      for (const d of this.decals) d.render(ctx);
      for (const p of this.pickups) p.render(ctx);
      for (const v of this.vehicles) v.render(ctx);
      for (const p of this.particles) p.render(ctx);
      for (const b of this.bullets) if (!b.isPlayer) b.render(ctx);
      for (const bot of this.bots) {
        try {
          bot.render(ctx);
        } catch (e) {
          console.error("bot render error", bot.type, e);
          // Fully reset canvas transform so remaining entities render correctly
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
          ctx.translate(-this.camX + shake.x, -this.camY + shake.y);
        }
      }
      for (const npc of this._cityNpcs) npc.render(ctx);
      for (const c of this._ambientCars) c.render(ctx);
      if (this.boss && !this.boss.dead) {
        try {
          this.boss.render(ctx);
        } catch (e) {
          console.error("boss render error", e);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
          ctx.translate(-this.camX + shake.x, -this.camY + shake.y);
        }
      }
      for (const b of this.bullets) if (b.isPlayer) b.render(ctx);
      if (!this.player.dead) this.player.render(ctx);
      if (this.player.companion && !this.player.companion.dead)
        this.player.companion.render(ctx);
      for (const bg of this._bodyguards) bg.render(ctx);

      // Drones
      for (const d of this._drones) d.render(ctx);
      if (this._playerDrone) this._playerDrone.render(ctx);

      // Grenades
      for (const g of this._grenades) g.render(ctx);

      // Glitch portals (world-space)
      for (const p of this._glitchPortals) {
        const pulse = Math.sin(p.t * 4) * 0.3 + 0.7;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.shadowColor = "#AA44FF";
        ctx.shadowBlur = 30 * pulse;
        ctx.fillStyle = `rgba(100,20,200,${pulse * 0.28})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, 28, 40, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(170,68,255,${pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, 28, 40, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(68,238,255,${pulse * 0.7})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 28, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#CC88FF";
        ctx.font = "bold 8px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("PORTAL", 0, -48);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Map teleport portals (world-space)
      for (const p of this._portals) {
        const pulse = Math.sin(p._animT * 3.5) * 0.35 + 0.65;
        const near = Math.hypot(p.x - this.player.x, p.y - this.player.y) < 55;
        const isNeonCity = this.map.config.id === "neon_city";
        const isWasteland = !!this.map.config.wasteland;
        const isGalactica = !!this.map.config.galactica;
        const isSnow = !!this.map.config.snow;
        ctx.save();
        ctx.translate(p.x, p.y);

        if (isSnow) {
          // ── FROZEN TUNDRA: Ice crystal portal — ice blue / white snowflakes ─
          const t = p._animT;
          const pulse2 = Math.sin(t * 2) * 0.3 + 0.7;
          const pulse3 = Math.sin(t * 3.5) * 0.25 + 0.75;

          // Frosty halo mist
          const haloG = ctx.createRadialGradient(0, 0, 8, 0, 0, 52);
          haloG.addColorStop(0, `rgba(200,240,255,${pulse * 0.2})`);
          haloG.addColorStop(0.5, `rgba(100,180,220,${pulse * 0.12})`);
          haloG.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = haloG;
          ctx.beginPath();
          ctx.arc(0, 0, 52, 0, Math.PI * 2);
          ctx.fill();

          // Outer rotating ice ring
          ctx.save();
          ctx.rotate(t * 0.35);
          ctx.strokeStyle = `rgba(136,221,255,${pulse * 0.65})`;
          ctx.lineWidth = 2.5;
          ctx.setLineDash([12, 6]);
          ctx.beginPath();
          ctx.arc(0, 0, 38, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Middle counter-rotating frost ring
          ctx.save();
          ctx.rotate(-t * 0.6);
          ctx.strokeStyle = `rgba(220,240,255,${pulse2 * 0.55})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 10]);
          ctx.beginPath();
          ctx.arc(0, 0, 30, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Inner fast ring — icy shimmer
          ctx.save();
          ctx.rotate(t * 1.1);
          ctx.strokeStyle = `rgba(180,220,240,${pulse3 * 0.35})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.arc(0, 0, 21, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Ice crystal core gradient
          const coreG = ctx.createRadialGradient(0, 0, 0, 0, 0, 24);
          coreG.addColorStop(0, `rgba(255,255,255,${pulse3 * 0.95})`);
          coreG.addColorStop(0.25, `rgba(180,220,255,${pulse2 * 0.75})`);
          coreG.addColorStop(0.6, `rgba(100,160,200,${pulse * 0.45})`);
          coreG.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = coreG;
          ctx.beginPath();
          ctx.arc(0, 0, 24, 0, Math.PI * 2);
          ctx.fill();

          // Orbiting snowflake particles
          for (let i = 0; i < 8; i++) {
            const angle = t * 1.5 + (i * Math.PI) / 4;
            const dist = 22 + Math.sin(t * 2.5 + i * 1.3) * 5;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            const r = i % 3 === 0 ? 3 : 2;
            ctx.fillStyle = i % 2 === 0
              ? `rgba(200,240,255,${pulse})`
              : `rgba(255,255,255,${pulse2})`;
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fill();
          }

          // Bright central ice core
          ctx.shadowColor = "#88DDFF";
          ctx.shadowBlur = 22 * pulse;
          ctx.fillStyle = `rgba(255,255,255,${pulse3})`;
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.fill();

          // 6-point snowflake/ice crystal frame
          ctx.shadowBlur = 14 * pulse;
          ctx.strokeStyle = `rgba(136,221,255,${pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 12; i++) {
            const ang = (Math.PI / 6) * i - Math.PI / 2;
            const r = i % 2 === 0 ? 28 : 18;
            const fx = Math.cos(ang) * r;
            const fy = Math.sin(ang) * r;
            i === 0 ? ctx.moveTo(fx, fy) : ctx.lineTo(fx, fy);
          }
          ctx.closePath();
          ctx.stroke();

          // Ice accent inner ring
          ctx.shadowBlur = 6 * pulse2;
          ctx.strokeStyle = `rgba(200,240,255,${pulse2 * 0.4})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0, Math.PI * 2);
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.fillStyle = near ? "#FFFFEE" : "#AAEEFF";
          ctx.font = "bold 9px Orbitron, monospace";
          ctx.textAlign = "center";
          ctx.shadowColor = "#88DDFF";
          ctx.shadowBlur = 12;
          ctx.fillText("❄ ICE PORTAL ❄", 0, -50);
          if (near) {
            ctx.fillStyle = "#FFFFEE";
            ctx.shadowColor = "#FFFF88";
            ctx.shadowBlur = 14;
            ctx.fillText("[E] TELEPORT", 0, -64);
          }
        } else if (isNeonCity || isWasteland) {
          // ── NEON CITY: Cyber portal — cyan / magenta rings ────────
          const t = p._animT;
          const pulse2 = Math.sin(t * 2) * 0.3 + 0.7;
          const pulse3 = Math.sin(t * 4) * 0.2 + 0.8;

          // Outer rotating ring
          ctx.save();
          ctx.rotate(t * 0.5);
          ctx.strokeStyle = `rgba(0,255,255,${pulse * 0.6})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 12]);
          ctx.beginPath();
          ctx.arc(0, 0, 38, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Middle counter-rotating ring
          ctx.save();
          ctx.rotate(-t * 0.8);
          ctx.strokeStyle = `rgba(255,0,255,${pulse2 * 0.5})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 8]);
          ctx.beginPath();
          ctx.arc(0, 0, 30, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Inner glow core
          const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 24);
          coreGrad.addColorStop(0, `rgba(0,255,255,${pulse3 * 0.8})`);
          coreGrad.addColorStop(0.3, `rgba(100,0,255,${pulse2 * 0.5})`);
          coreGrad.addColorStop(0.7, `rgba(255,0,150,${pulse * 0.3})`);
          coreGrad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = coreGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 24, 0, Math.PI * 2);
          ctx.fill();

          // Energy particles orbiting
          for (let i = 0; i < 6; i++) {
            const angle = t * 2 + (i * Math.PI) / 3;
            const dist = 20 + Math.sin(t * 3 + i) * 5;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            ctx.fillStyle =
              i % 2 === 0
                ? `rgba(0,255,255,${pulse})`
                : `rgba(255,0,255,${pulse})`;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
          }

          // Central bright core
          ctx.shadowColor = "#00FFFF";
          ctx.shadowBlur = 20 * pulse;
          ctx.fillStyle = `rgba(255,255,255,${pulse3})`;
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI * 2);
          ctx.fill();

          // Hexagon frame
          ctx.shadowBlur = 15 * pulse;
          ctx.strokeStyle = `rgba(0,255,255,${pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const hx = Math.cos(angle) * 26;
            const hy = Math.sin(angle) * 26;
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.fillStyle = near ? "#FFFFAA" : "#00FFFF";
          ctx.font = "bold 9px Orbitron, monospace";
          ctx.textAlign = "center";
          ctx.shadowColor = "#00FFFF";
          ctx.shadowBlur = 10;
          ctx.fillText("◈ PORTAL ◈", 0, -48);
          if (near) {
            ctx.fillStyle = "#FFFFAA";
            ctx.shadowColor = "#FFFF00";
            ctx.shadowBlur = 12;
            ctx.fillText("[E] TELEPORT", 0, -62);
          }
        } else if (isGalactica) {
          // ── GALACTICA: Cosmic warp gate — purple / gold star rings ─
          const t = p._animT;
          const pulse2 = Math.sin(t * 2.2) * 0.3 + 0.7;
          const pulse3 = Math.sin(t * 4.5) * 0.2 + 0.8;

          // Wide soft nebula halo
          const haloG = ctx.createRadialGradient(0, 0, 10, 0, 0, 55);
          haloG.addColorStop(0, `rgba(140,60,255,${pulse * 0.18})`);
          haloG.addColorStop(0.5, `rgba(80,0,180,${pulse * 0.1})`);
          haloG.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = haloG;
          ctx.beginPath();
          ctx.arc(0, 0, 55, 0, Math.PI * 2);
          ctx.fill();

          // Outer rotating ring — purple dashes
          ctx.save();
          ctx.rotate(t * 0.4);
          ctx.strokeStyle = `rgba(180,80,255,${pulse * 0.7})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([9, 11]);
          ctx.beginPath();
          ctx.arc(0, 0, 40, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Middle counter-rotating ring — gold dashes
          ctx.save();
          ctx.rotate(-t * 0.7);
          ctx.strokeStyle = `rgba(255,200,40,${pulse2 * 0.6})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 9]);
          ctx.beginPath();
          ctx.arc(0, 0, 32, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Inner fast ring — faint lavender
          ctx.save();
          ctx.rotate(t * 1.3);
          ctx.strokeStyle = `rgba(210,170,255,${pulse3 * 0.28})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 7]);
          ctx.beginPath();
          ctx.arc(0, 0, 23, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // Deep-space core gradient
          const coreG = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
          coreG.addColorStop(0, `rgba(240,200,255,${pulse3 * 0.95})`);
          coreG.addColorStop(0.25, `rgba(160,60,255,${pulse2 * 0.7})`);
          coreG.addColorStop(0.65, `rgba(60,0,120,${pulse * 0.4})`);
          coreG.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = coreG;
          ctx.beginPath();
          ctx.arc(0, 0, 26, 0, Math.PI * 2);
          ctx.fill();

          // Orbiting particles — 8 alternating purple + gold stars
          for (let i = 0; i < 8; i++) {
            const angle = t * 1.8 + (i * Math.PI) / 4;
            const dist = 24 + Math.sin(t * 2.5 + i * 1.2) * 6;
            const gp = Math.cos(angle) * dist;
            const hp = Math.sin(angle) * dist;
            const r = i % 3 === 0 ? 2.8 : 1.8;
            ctx.fillStyle =
              i % 2 === 0
                ? `rgba(180,90,255,${pulse})`
                : `rgba(255,200,40,${pulse2})`;
            ctx.beginPath();
            ctx.arc(gp, hp, r, 0, Math.PI * 2);
            ctx.fill();
          }

          // Bright central star core
          ctx.shadowColor = "#BB66FF";
          ctx.shadowBlur = 24 * pulse;
          ctx.fillStyle = `rgba(255,240,200,${pulse3})`;
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.fill();

          // 8-point star-gate frame
          ctx.shadowBlur = 16 * pulse;
          ctx.strokeStyle = `rgba(180,80,255,${pulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const ang = (Math.PI / 4) * i - Math.PI / 2;
            const r = i % 2 === 0 ? 30 : 20;
            const fx = Math.cos(ang) * r;
            const fy = Math.sin(ang) * r;
            i === 0 ? ctx.moveTo(fx, fy) : ctx.lineTo(fx, fy);
          }
          ctx.closePath();
          ctx.stroke();

          // Gold accent ring on 8-point frame
          ctx.shadowBlur = 8 * pulse2;
          ctx.strokeStyle = `rgba(255,200,40,${pulse2 * 0.45})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, 25, 0, Math.PI * 2);
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.fillStyle = near ? "#FFE080" : "#BB88FF";
          ctx.font = "bold 9px Orbitron, monospace";
          ctx.textAlign = "center";
          ctx.shadowColor = "#8844FF";
          ctx.shadowBlur = 12;
          ctx.fillText("⬡ WARP GATE ⬡", 0, -52);
          if (near) {
            ctx.fillStyle = "#FFE080";
            ctx.shadowColor = "#FFD700";
            ctx.shadowBlur = 14;
            ctx.fillText("[E]  ENTER WARP", 0, -66);
          }
        } else {
          // ── DEFAULT portal style ──────────────────────────────────
          ctx.shadowColor = "#44EEFF";
          ctx.shadowBlur = 28 * pulse;
          ctx.fillStyle = `rgba(0,120,200,${pulse * 0.25})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, 22, 34, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = `rgba(68,238,255,${pulse})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, 22, 34, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,255,${pulse * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(0, 0, 13, 20, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.fillStyle = near ? "#FFFFAA" : "#88FFFF";
          ctx.font = `bold 8px Orbitron, monospace`;
          ctx.textAlign = "center";
          ctx.fillText("PORTAL", 0, -40);
          if (near) {
            ctx.fillStyle = "#FFFFAA";
            ctx.shadowColor = "#FFFF00";
            ctx.shadowBlur = 8;
            ctx.fillText("[E] TELEPORT", 0, -52);
          }
        }
        ctx.restore();
      }

      // Black market vendor NPC
      if (this._bmVendor && this._nightAlpha > 0.1) {
        ctx.save();
        ctx.shadowColor = "#00FFCC";
        ctx.shadowBlur = 30;
        ctx.fillStyle = "#00FFCC";
        ctx.strokeStyle = "#00CCAA";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this._bmVendor.x, this._bmVendor.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#111";
        ctx.font = "bold 9px Orbitron, monospace";
        ctx.textAlign = "center";
        ctx.fillText("⬢", this._bmVendor.x, this._bmVendor.y + 4);
        if (
          Math.hypot(
            this._bmVendor.x - this.player.x,
            this._bmVendor.y - this.player.y,
          ) < 70
        ) {
          ctx.fillStyle = "#FFAA00";
          ctx.font = "bold 11px Orbitron, monospace";
          ctx.shadowColor = "#FF8800";
          ctx.shadowBlur = 10;
          ctx.fillText(
            "[N] BLACK MARKET",
            this._bmVendor.x,
            this._bmVendor.y - 24,
          );
        }
        ctx.restore();
      }

      // "[F] ENTER" hint near vehicles, "[E] ENTER" hint near doors
      if (!this._playerVehicle && !this.player.dead) {
        for (const v of this.vehicles) {
          if (v.dead || v._exploding || v.occupied) continue;
          if (Math.hypot(v.x - this.player.x, v.y - this.player.y) < 74) {
            ctx.save();
            ctx.font = "bold 11px Orbitron, monospace";
            ctx.textAlign = "center";
            ctx.fillStyle = "#FFFFAA";
            ctx.shadowColor = "#FFFF00";
            ctx.shadowBlur = 10;
            ctx.fillText("[F] ENTER", v.x, v.y - v.radius - 18);
            ctx.restore();
          }
        }
        for (const door of this.map.doors) {
          if (
            Math.hypot(door.wx - this.player.x, door.wy - this.player.y) < 55
          ) {
            ctx.save();
            ctx.font = "bold 11px Orbitron, monospace";
            ctx.textAlign = "center";
            const hintText =
              door.specialType === "dealership"
                ? "[E] CAR SHOP"
                : door.specialType === "casino"
                  ? "[E] CASINO"
                  : "[E] ENTER";
            ctx.fillStyle =
              door.specialType === "dealership"
                ? "#FFDD44"
                : door.specialType === "casino"
                  ? "#FF44AA"
                  : "#FFFFAA";
            ctx.shadowColor =
              door.specialType === "dealership"
                ? "#FFBB00"
                : door.specialType === "casino"
                  ? "#FF0088"
                  : "#FFFF00";
            ctx.shadowBlur = 10;
            ctx.fillText(hintText, door.wx, door.wy - 16);
            ctx.restore();
          }
        }
        // Metro entrance hint
        if (this.map.metroEntrance) {
          const me = this.map.metroEntrance;
          if (Math.hypot(me.wx - this.player.x, me.wy - this.player.y) < 70) {
            ctx.save();
            ctx.font = "bold 11px Orbitron, monospace";
            ctx.textAlign = "center";
            const isWasteland = !!this.map.config.wasteland;
            ctx.fillStyle = isWasteland ? "#FF8844" : "#44FF88";
            ctx.shadowColor = isWasteland ? "#FF6622" : "#22FF66";
            ctx.shadowBlur = 14;
            ctx.fillText("[E] METRO", me.wx, me.wy - 40);
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
      ctx.fillStyle = this.map.config.snow ? "#000e28" : "#000820";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Snow map: permanent cold-blue tint (always winter)
    if (this.map.config.snow) {
      ctx.save();
      ctx.fillStyle = "rgba(8,32,72,0.16)";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // Robot City: subtle electric-cyan tint
    if (this._robotMode) {
      ctx.save();
      ctx.fillStyle = "rgba(0,40,60,0.14)";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // Jungle: warm green-amber tint
    if (this._jungleMode) {
      ctx.save();
      ctx.fillStyle = "rgba(10,30,5,0.12)";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // Desert: warm sandy haze tint
    if (this._desertMode) {
      ctx.save();
      ctx.fillStyle = "rgba(30,18,4,0.10)";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // Galactica: deep space darkness tint
    if (this._galacticaMode) {
      ctx.save();
      ctx.fillStyle = "rgba(2,0,18,0.14)";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // Sky Realm: soft aerial haze tint
    if (this._skyMode) {
      ctx.save();
      ctx.fillStyle = "rgba(135,206,235,0.05)";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    // Dino: lush prehistoric green tint
    if (this._dinoMode) {
      ctx.save();
      ctx.fillStyle = "rgba(5,18,2,0.11)";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Tower: elevator in world-space
    if (this._towerMode) {
      ctx.save();
      ctx.translate(-this.camX + shake.x, -this.camY + shake.y);
      this.map.renderTowerElevator(
        ctx,
        this._towerElevatorActive,
        this._towerFloor,
      );
      ctx.restore();
    }

    // Street light glows — additive, world-space, after night overlay
    // so the warm halos visibly punch through the darkness
    if (!this._indoor && this._nightAlpha > 0.01) {
      ctx.save();
      ctx.translate(-this.camX + shake.x, -this.camY + shake.y);
      this.map.renderStreetLightGlows(
        ctx,
        this.camX,
        this.camY,
        W,
        H,
        this._nightAlpha,
      );
      ctx.restore();
    }

    // ── Global Event overlays ─────────────────────────────
    if (this._globalEvent) {
      if (this._globalEvent.id === "blackout") {
        const psx = this.player.x - this.camX;
        const psy = this.player.y - this.camY;
        const grad = ctx.createRadialGradient(
          psx,
          psy,
          55,
          psx,
          psy,
          Math.max(W, H),
        );
        grad.addColorStop(0, "rgba(0,4,8,0)");
        grad.addColorStop(0.18, "rgba(0,4,8,0.88)");
        grad.addColorStop(1, "rgba(0,4,8,0.97)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }
      if (this._globalEvent.id === "cyber_virus") {
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = "#00FFFF";
        for (let yl = 0; yl < H; yl += 4) ctx.fillRect(0, yl, W, 1);
        if (Math.random() < 0.25) {
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = Math.random() < 0.5 ? "#00FFFF" : "#FF00AA";
          ctx.fillRect(0, Math.random() * H, W, 2 + Math.random() * 6);
        }
        ctx.restore();
      }
      if (this._globalEvent.id === "glitch_mode") {
        ctx.save();
        // Purple scanlines
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = "#AA44FF";
        for (let yl = 0; yl < H; yl += 3) ctx.fillRect(0, yl, W, 1);
        // Glitch strips
        if (Math.random() < 0.35) {
          const gy = Math.random() * H,
            gh = 2 + Math.random() * 10;
          ctx.globalAlpha = 0.22;
          ctx.fillStyle = Math.random() < 0.5 ? "#AA00FF" : "#00FFAA";
          ctx.fillRect(0, gy, W, gh);
          ctx.globalAlpha = 0.14;
          ctx.fillStyle = "#FF00AA";
          ctx.fillRect(rnd(-30, 30), gy, W, gh);
        }
        // Pixel corruption bursts
        if (Math.random() < 0.18) {
          ctx.globalAlpha = 0.5;
          for (let i = 0; i < 6; i++) {
            ctx.fillStyle = Math.random() < 0.5 ? "#AA44FF" : "#44FFCC";
            ctx.fillRect(
              Math.random() * W,
              Math.random() * H,
              rnd(2, 24),
              rnd(1, 4),
            );
          }
        }
        // Vignette tint
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = "#5500AA";
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    // ── Force screen-space before HUD ──────────────────────
    // If any entity render threw (unmatched ctx.save), the transform may be
    // in world-space; setTransform resets it unconditionally so HUD always shows.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Weather (screen-space, drawn over world)
    this.weather.render(ctx, W, H);

    // HUD
    const playing = this.state !== "gameover";
    if (playing) {
      this.hud.renderMinimap(
        this.map,
        this.player,
        this.bots,
        this.camX,
        this.camY,
        this.boss,
        this._districtLayout,
        this.vehicles,
      );
      if (this._waypointDoor)
        this.hud.renderWaypointNav(this.player, this._waypointDoor, this.map);
      this.hud.renderHealthBar(this.player);
      this.hud.renderControls(this._arenaMode, this._isMobile);
      if (this._isMobile) this.hud.renderMobileHints(this._arenaMode);
      this.hud.renderMoney(this.money);
      this.hud.renderKills(this.kills);
      if (this._arenaMode) {
        const remaining = Math.max(0, this._arenaWaveSize - this._arenaKilled);
        this.hud.renderWave(
          this.wave,
          remaining,
          !!(this.boss && !this.boss.dead),
        );
        if (this._arenaCountdown > 0)
          this.hud.renderArenaCountdown(this._arenaCountdown);
      } else if (this._zombieMode) {
        const remaining = this.bots.filter((b) => !b.dead && !b.dying).length;
        this.hud.renderZombieWave(
          this.wave,
          remaining,
          this._zombieCountdown,
          this._zombieWaveSize,
        );
        if (this._zombieCountdown > 0)
          this.hud.renderArenaCountdown(this._zombieCountdown);
      } else if (!this._lifeMode && !this._towerMode) {
        this.hud.renderWave(
          this.wave,
          this.bots.length,
          !!(this.boss && !this.boss.dead),
        );
      }
      if (this._wantedLevel > 0 && !this._zombieMode) {
        this.hud.renderWantedLevel(this._wantedLevel, this._wantedDecay);
      }
      this.hud.renderWeaponInfo(this.player);
      if (this._grenadeCount > 0)
        this.hud.renderGrenadeCount(this._grenadeCount);
      if (
        !this._arenaMode &&
        !this._zombieMode &&
        !this._lifeMode &&
        !this._blitzMode &&
        !this._towerMode
      )
        this.hud.renderShopButton(this.state === "shop", this._isMobile);
      if (this._hardcoreMode)
        this.hud.renderModeBadge("⚡ HARDCORE · 2× DMG · 3× $", "#FF8800");
      if (this._blitzMode)
        this.hud.renderModeBadge("⚡ BLITZ · 3× SPEED · 5× $", "#FF4400");
      if (this._campaignMode)
        this.hud.renderCampaignLevel(
          this._campaignLevel,
          this._campaignKills,
          this._campaignTarget,
          this._levelComplete,
          this._levelCompleteT,
        );
      if (this._towerMode) this._renderTowerHUD(ctx, W, H);
      if (this.player.companion && !this.player.companion.dead)
        this.hud.renderCompanionHP(this.player.companion);
      if (this.player._buffs && this.player._buffs.size > 0)
        this.hud.renderActiveBuffs(this.player._buffs);
      this.hud.renderAchButton(this._achPanelOpen);
      if (!this._zombieMode && !this._lifeMode)
        this.hud.renderDayNight(this._nightAlpha, this._gameTime);
      if (this._globalEvent)
        this.hud.renderEventBanner(
          ctx,
          W,
          H,
          this._globalEvent,
          this._eventAnnounceTimer,
        );
      if (this._playerDrone)
        this.hud.renderDroneStatus(this._playerDrone, this._droneControl);
      this.hud.renderDamageNumbers();
      this.hud.renderSurviveTimer(ctx, W, this._surviveTime);
      if (this._districtLayout && this._currentDistrict) {
        this.hud.renderDistrictHUD(
          this._districtLayout,
          this._reputation,
          this._currentDistrict,
          this._shopDiscount,
        );
        // Neon City & Wasteland: skip the center screen district entry notification
        if (this._districtTimer > 0 && this.map.config.id !== "neon_city" && !this.map.config.wasteland) {
          this.hud.renderDistrictEntry(
            this._currentDistrict,
            this._districtTimer,
          );
        }
      }
      if (this.boss && !this.boss.dead && !this.boss.dying) {
        this.hud.renderBossBar(this.boss);
      }
      if (this._killStreak >= 2 || this._streakPopup.timer > 0) {
        this.hud.renderKillStreak(
          this._killStreak,
          this._streakMultiplier(),
          this._streakPopup,
          this._streakTimer,
        );
      }
      if (this._playerVehicle) {
        this.hud.renderVehicleHud(this._playerVehicle);
      }
      if (
        !this.player.dead &&
        this.state === "playing" &&
        !this._playerVehicle
      ) {
        this.hud.renderCrosshair(
          this.input.mouseScreen.x,
          this.input.mouseScreen.y,
        );
      }
    }

    // ACH button click (bottom-right area: W-136, H-66, 124×26)
    if (this.input.mouseJustDown && this.state === "playing") {
      const mx = this.input.mouseScreen.x,
        my = this.input.mouseScreen.y;
      const ax = W - 136,
        ay = H - 66;
      if (mx >= ax && mx <= ax + 124 && my >= ay && my <= ay + 26) {
        this._achPanelOpen = !this._achPanelOpen;
      }
    }

    if (this.state === "paused") {
      const mx = this.input.mouseScreen.x,
        my = this.input.mouseScreen.y;
      const pauseButtons = this.hud.renderPause(mx, my);

      // Handle button clicks
      if (this.input.mouseJustDown && pauseButtons) {
        // Check Resume button
        if (pauseButtons.resume) {
          const btn = pauseButtons.resume;
          if (
            mx >= btn.x &&
            mx <= btn.x + btn.w &&
            my >= btn.y &&
            my <= btn.y + btn.h
          ) {
            this.state = "playing";
          }
        }
        // Check Back to Maps button
        if (pauseButtons.maps) {
          const btn = pauseButtons.maps;
          if (
            mx >= btn.x &&
            mx <= btn.x + btn.w &&
            my >= btn.y &&
            my <= btn.y + btn.h
          ) {
            this._destroy();
            window.location.href = "index.html";
          }
        }
      }
    }
    if (this.state === "gameover") {
      // Save session to backend once (first gameover frame)
      this._onGameOver();
      if (this._towerVictory) {
        this._renderTowerVictory(ctx, W, H);
        // Only respond to OK button click
        if (this.input.mouseJustDown && this._towerVictoryBtn) {
          const mx = this.input.mouseScreen.x,
            my = this.input.mouseScreen.y;
          const btn = this._towerVictoryBtn;
          if (
            mx >= btn.x &&
            mx <= btn.x + btn.w &&
            my >= btn.y &&
            my <= btn.y + btn.h
          ) {
            this._destroy();
            window.location.href = "index.html";
          }
        }
      } else {
        const mx = this.input.mouseScreen.x,
          my = this.input.mouseScreen.y;
        const gameOverButtons = this.hud.renderGameOver(
          this.money,
          this.kills,
          this._surviveTime,
          mx,
          my,
        );

        // Handle button clicks (same pattern as keyboard R handler)
        if (this.input.mouseJustDown && gameOverButtons) {
          // Check Restart button
          const restartBtn = gameOverButtons.restart;
          if (
            restartBtn &&
            mx >= restartBtn.x &&
            mx <= restartBtn.x + restartBtn.w &&
            my >= restartBtn.y &&
            my <= restartBtn.y + restartBtn.h
          ) {
            this._destroy();
            window.startGame(this.charData, this.map.config);
            return;
          }
          // Check Main Menu button
          const menuBtn = gameOverButtons.menu;
          if (
            menuBtn &&
            mx >= menuBtn.x &&
            mx <= menuBtn.x + menuBtn.w &&
            my >= menuBtn.y &&
            my <= menuBtn.y + menuBtn.h
          ) {
            this._destroy();
            window.location.href = "index.html";
            return;
          }
        }
      }
    }

    // Tower floor transition fade
    if (this._towerMode && this._towerTransitionAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0,0,0,${this._towerTransitionAlpha})`;
      ctx.fillRect(0, 0, W, H);
      // Floor number during fade-in
      if (
        this._towerTransitionState === 2 &&
        this._towerTransitionAlpha > 0.5
      ) {
        ctx.font = "bold 48px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#FFD700";
        ctx.shadowColor = "#FFD700";
        ctx.shadowBlur = 24;
        ctx.fillText(`FLOOR ${this._towerFloor}`, W / 2, H / 2 - 20);
        ctx.shadowBlur = 0;
        ctx.font = "22px monospace";
        ctx.fillStyle = "#CCCCCC";
        ctx.fillText(
          this._towerFloorSubtitle(this._towerFloor),
          W / 2,
          H / 2 + 20,
        );
      }
      ctx.restore();
    }

    // Shop overlay
    if (this.state === "shop") {
      this.shop._guardCount = this._bodyguards.length;
      this.shop.render(
        ctx,
        W,
        H,
        this.player,
        this.money,
        this.input.mouseScreen.x,
        this.input.mouseScreen.y,
      );
      if (this.input.mouseJustDown) {
        this.shop.handleClick(
          this.input.mouseScreen.x,
          this.input.mouseScreen.y,
          this.player,
          this,
        );
        if (!this.shop.isOpen) this.state = "playing";
      }
    }

    // Car dealership overlay
    if (this.state === "carshop") {
      this._dealership.render(
        ctx,
        W,
        H,
        this.player,
        this.money,
        this._grenadeCount,
        this.input.mouseScreen.x,
        this.input.mouseScreen.y,
      );
      if (this.input.mouseJustDown) {
        this._dealership.handleClick(
          this.input.mouseScreen.x,
          this.input.mouseScreen.y,
          this.player,
          this,
        );
        if (!this._dealership.isOpen) this.state = "playing";
      }
    }

    // Casino overlay
    if (this.state === "casino") {
      this._casino.render(
        ctx,
        W,
        H,
        this.player,
        this.money,
        this.input.mouseScreen.x,
        this.input.mouseScreen.y,
      );
      if (this.input.mouseJustDown) {
        this._casino.handleClick(
          this.input.mouseScreen.x,
          this.input.mouseScreen.y,
          this.player,
          this,
        );
        if (!this._casino.isOpen) this.state = "playing";
      }
    }

    // Building NPC shop overlay
    if (this.state === "buildingshop") {
      this._buildingShop.render(
        ctx,
        W,
        H,
        this.player,
        this.money,
        this.input.mouseScreen.x,
        this.input.mouseScreen.y,
      );
      if (this.input.mouseJustDown) {
        this._buildingShop.handleClick(
          this.input.mouseScreen.x,
          this.input.mouseScreen.y,
          this.player,
          this,
        );
        if (!this._buildingShop.isOpen) this.state = "playing";
      }
    }

    // Black market overlay
    if (this.state === "blackmarket" && this._bmOpen) {
      const clickAreas = this.hud.renderBlackMarket(
        ctx,
        W,
        H,
        CONFIG.BLACK_MARKET,
        this.money,
        this.input.mouseScreen.x,
        this.input.mouseScreen.y,
        this._bmBought,
      );
      if (this.input.mouseJustDown) {
        const mx = this.input.mouseScreen.x,
          my = this.input.mouseScreen.y;
        for (const ca of clickAreas) {
          if (
            mx >= ca.ix &&
            mx <= ca.ix + ca.itemW &&
            my >= ca.iy &&
            my <= ca.iy + ca.itemH
          ) {
            const item = ca.item;
            // Non-consumable implants can only be bought once
            const isOnce =
              item.type === "implant" && item.effect === "overclock";
            if (!this._bmBought.has(item.id) && this.money >= item.price) {
              this.money -= item.price;
              this._applyBmItem(item);
              if (isOnce) this._bmBought.add(item.id);
              window.audio?.[item.type === "implant" ? "upgrade" : "buy"]();
            }
            break;
          }
        }
      }
    }

    // ── Big-map overlay ───────────────────────────────────────
    if (this.state === "bigmap") {
      const mx = this.input.mouseScreen.x,
        my = this.input.mouseScreen.y;
      const hoveredDoor = this.hud.renderBigMap(
        ctx,
        W,
        H,
        this.map,
        this.player,
        this.map.doors,
        this._waypointDoor,
        mx,
        my,
      );
      if (this.input.mouseJustDown) {
        if (hoveredDoor) {
          // Toggle: click same door/metro again clears waypoint, otherwise set it
          let same = false;
          if (this._waypointDoor) {
            if (hoveredDoor.isMetro && this._waypointDoor.isMetro) {
              // Both are metro
              same = true;
            } else if (!hoveredDoor.isMetro && !this._waypointDoor.isMetro) {
              // Both are doors
              same = this._waypointDoor.tx === hoveredDoor.tx &&
                     this._waypointDoor.ty === hoveredDoor.ty;
            }
          }
          this._waypointDoor = same ? null : hoveredDoor;
          this.state = "playing";
        } else {
          // Click empty space closes map
          this.state = "playing";
        }
      }
    }

    // Achievement popup
    if (this._achPopup) {
      const ap = this._achPopup;
      const alpha = clamp(Math.min(ap.timer, 3.5 - ap.timer) * 1.5, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(0,0,0,0.80)";
      ctx.beginPath();
      ctx.roundRect(W / 2 - 140, 28, 280, 50, 8);
      ctx.fill();
      ctx.strokeStyle = "#FFCC00";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#FFCC00";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(W / 2 - 140, 28, 280, 50, 8);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#FFCC00";
      ctx.font = "bold 9px Orbitron, monospace";
      ctx.textAlign = "left";
      ctx.fillText("ACHIEVEMENT UNLOCKED", W / 2 - 124, 50);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px Orbitron, monospace";
      ctx.fillText(`${ap.icon}  ${ap.name}`, W / 2 - 124, 68);
      ctx.restore();
    }

    // Achievement panel (Tab)
    if (this._achPanelOpen) {
      const achs = CONFIG.ACHIEVEMENTS;
      const cw = Math.min(400, W / 2 - 40);
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.90)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#FFCC00";
      ctx.font = "bold 18px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillText("ACHIEVEMENTS", W / 2, 48);
      achs.forEach((ach, i) => {
        const col = i % 2,
          row = Math.floor(i / 2);
        const x = col === 0 ? W / 2 - cw - 10 : W / 2 + 10;
        const y = 70 + row * 44;
        const unlocked = this._unlockedAch.has(ach.id);
        ctx.globalAlpha = unlocked ? 1 : 0.35;
        ctx.fillStyle = "rgba(20,20,30,0.9)";
        ctx.beginPath();
        ctx.roundRect(x, y, cw, 36, 6);
        ctx.fill();
        ctx.strokeStyle = unlocked ? "#FFCC00" : "#444";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, cw, 36, 6);
        ctx.stroke();
        ctx.fillStyle = unlocked ? "#FFCC00" : "#888";
        ctx.font = "bold 11px Orbitron, monospace";
        ctx.textAlign = "left";
        ctx.fillText(`${ach.icon}  ${ach.name}`, x + 10, y + 14);
        ctx.fillStyle = "#aaa";
        ctx.font = "9px Orbitron, monospace";
        ctx.fillText(ach.desc, x + 10, y + 27);
        ctx.globalAlpha = 1;
      });
      ctx.fillStyle = "#666";
      ctx.font = "10px Orbitron, monospace";
      ctx.textAlign = "center";
      ctx.fillText("[ TAB ] CLOSE", W / 2, H - 20);
      ctx.restore();
    }
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────
window.startGame = function (charData, mapData) {
  window._game = new Game(charData, mapData);
  window._gameInstance = window._game;
  window.dispatchEvent(new Event("gameStarted"));
};
