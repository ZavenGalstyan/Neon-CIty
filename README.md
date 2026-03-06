# NEON CITY — Top-Down GTA Browser Game

A canvas-based, no-framework, vanilla JavaScript top-down 2D GTA-style game.
Open `index.html` in any modern browser — no build step required.

---

## Controls

### Select Screen
| Key | Action |
|-----|--------|
| `1–6` | Select character (page 1) |
| `1–2` | Select character (page 2) |
| `Q–I` | Select map |
| `Tab` | Switch map page |
| `Shift+Tab` | Switch character page |
| `Enter` | Start game |

### In-Game
| Key | Action |
|-----|--------|
| `WASD` | Move player |
| `Mouse` | Aim |
| `LMB` | Shoot |
| `R` | Reload |
| `F` | Enter / exit vehicle |
| `E` | Enter building / interact |
| `B` | Open shop |
| `T` | Open car dealership (near salesperson) |
| `G` | Throw grenade |
| `P` | Pause |
| `Esc` | Close overlay / menu |

---

## File Structure

```
Z-Gta/
├── index.html          # Character & map selection screen
├── game.html           # Game canvas screen
├── css/
│   └── style.css       # All styles (select screen + responsive)
└── js/
    ├── config.js       # Global CONFIG — all tunable constants
    ├── utils.js        # Vec2, lerp, clamp, rnd, circlesOverlap, hexToRgb
    ├── input.js        # InputManager — keyboard, mouse, touch/virtual joystick
    ├── entities.js     # All entity classes (Player, Bot, Vehicle, Grenade, …)
    ├── map.js          # GameMap — tile generation, collision, portals, doors
    ├── shop.js         # ShopManager, DealershipManager, CasinoManager
    ├── ui.js           # HUD class — all screen-space rendering
    ├── audio.js        # AudioManager — Web Audio API sound effects
    ├── game.js         # Game class — main loop, state machine, collision
    └── select.js       # Select-screen logic — char/map selection, keyboard
```

---

## Characters

| # | ID | Name | Companion | Starter Weapon | Playstyle |
|---|----|------|-----------|---------------|-----------|
| 01 | gangster | THE GANGSTER | Dog | Default gun | Balanced |
| 02 | hacker | THE HACKER | Cat | Default gun | Fast, fragile |
| 03 | mercenary | THE MERCENARY | Wolf | Default gun | Slow, tanky |
| 04 | ghost | THE GHOST | Raven | Default gun | High damage, slow fire |
| 05 | medic | THE MEDIC | Bear (heals) | Default gun | Sustain |
| 06 | ronin | THE RONIN | Fox | Knife | Melee specialist |
| 07 | pyro | THE PYRO | Salamander (AoE fire) | Flamethrower | AoE damage |
| 08 | phantom | THE PHANTOM | Spirit (freeze) | Crossbow | 22% bullet dodge |

**Animal companion behaviors:**
- Dog / Cat / Wolf / Raven / Fox — orbit player, attack nearest bot within 240 px
- Bear — heals player +8 HP every 4.5 s instead of attacking
- Salamander — AoE fire burst (110 px, 38 dmg) every 1.8 s
- Spirit — teleports to nearest enemy, 52 dmg + 1.2 s freeze

---

## Maps (18 Total)

### Page 1
| Map | Weather | Special |
|-----|---------|---------|
| Downtown | Rain | Default city |
| Industrial | Smoke | — |
| Suburbs | Clear | — |
| Ruins | Sandstorm | — |
| Docks | Fog | — |
| Casino | Neon haze | CasinoManager overlay |
| Arena | Blood rain | arena:true, 24×24, wave survival |
| Zombie | Fog | zombie:true, 36×36, zombie bots |
| Life Sim | Clear | Ambient NPCs |

### Page 2
| Map | Weather | Special |
|-----|---------|---------|
| Harbor | Fog | — |
| Neon District | Neon haze | — |
| Military | Sandstorm | — |
| Badlands | Sandstorm | — |
| Survival | Blood rain | No shop |
| Hardcore | Blood rain | 2× player dmg, 3× money |
| Campaign | Clear | campaign:true, 100 levels, boss every 10 |
| Blitz | Blood rain | 3× speed, 5× money, no shop |
| Siege | Fog | Bots from all 4 edges, no shop |

---

## Enemy Types

| Type | Spawns at Wave | Notes |
|------|---------------|-------|
| mini | 1+ | Weakest |
| normal | 1+ | Standard |
| big | 2+ | More HP |
| police | 3+ (wanted) | Spawned by wanted system |
| swat | 4+ (wanted) | High HP |
| heavyswat | 5+ | Very high HP |
| sniper | 6+ | Keeps distance 380 px, piercing bullet |
| bomber | 4+ | AoE bomb bullet (80 px radius) |
| juggernaut | 10+ | 12× HP, 6 bullets, slow, huge payout |

---

## Vehicles

- **F** — enter/exit vehicle, player becomes invulnerable to bullets
- WASD to steer, auto-accelerate in movement direction
- Ram enemies to deal damage
- Vehicles explode when HP reaches 0

### Car Dealership (yellow `[E] CAR SHOP` doors)
Enter showroom → walk near salesperson → press **T** to open shop:

| Tab | Contents |
|-----|---------|
| Vehicles | Sedan $2 000, Sports $5 500, SUV $4 000, Armored $8 500 |
| Weapons | Same as regular shop, with discount applied |
| Grenades | 1 for $500, 5 for $2 000 |

---

## Weapons

| ID | Name | Price | Notes |
|----|------|-------|-------|
| pistol | Pistol | $400 | Starter tier |
| shotgun | Shotgun | $800 | Spread shot |
| smg | SMG | $1 200 | High fire rate |
| rifle | Assault Rifle | $2 200 | Balanced |
| burst | Burst Rifle | $1 500 | 3-round burst |
| sniper | Sniper Rifle | $3 500 | Long range |
| flamethrower | Flamethrower | $3 200 | DoT AoE |
| crossbow | Crossbow | $2 800 | Piercing bolt |
| rocket | Rocket Launcher | $7 800 | Splash damage |
| knife | Combat Knife | — | Ronin starter |

---

## Grenades

- Bought at car dealership ($500 each)
- Press **G** to lob toward mouse cursor
- 2 s fuse, then explode; also explode on wall contact
- **120 damage**, 95 px blast radius, camera shake on detonation

---

## Shop System

Opened with **B** (disabled in blitz / siege / survival modes):

| Tab | Contents |
|-----|---------|
| Weapons | Buy any weapon |
| Upgrades | Speed / Health / Damage / Fire Rate / Armor + 5 advanced |
| Security | Hire bodyguards ($1 500 each, max 3) |

**Advanced upgrades:** Dodge chance, Wealth (money on kill), Leech (HP on kill), Critical hit, Ammo reserve

**Shop discount:** Accumulates with certain upgrades; applied to all purchases.

---

## Game Systems

### Wanted / Police
- Kill civilians or cops → wanted level rises (1–4 stars)
- Police / SWAT spawn automatically above wanted thresholds [0, 5, 15, 30, 55 kills]
- Wanted level resets on wave change or shop visit

### Kill Streak
- Consecutive kills build a multiplier (shown as streak popup)
- Streak timer resets after a few seconds without a kill

### Global Events
5 random events (shown as banner):
`blackout` · `riot` · `corporate` · `cyber_virus` · `glitch_mode`

### Portals
- 2 per normal map (purple glowing rings)
- Walk into or press **E** → teleport to paired portal with particle flash + camera shake

### Day / Night Cycle
- Ambient lighting shifts over time; affects rendering atmosphere

### Metro (Campaign)
- Enter metro door on campaign map → travel between district areas

### Ambient Traffic
- 6–14 `AmbientCar` entities drive along roads (5 body styles)
- Respawn off-camera every 4 s; despawn when out of map bounds

---

## Technical Notes

- **No framework** — pure Canvas 2D API, vanilla JS, `'use strict'`
- **dt cap** — `dt = Math.min(dt, 0.05)` prevents physics explosion on tab hide
- **Collision** — `circlesOverlap(x1,y1,r1, x2,y2,r2)` for all entity checks
- **Camera** — lerps toward player each frame (`CAM_LERP = 0.09`)
- **Particles** — constructor: `(x, y, vx, vy, color, size, life)` — all 7 args required
- **Bullets** — constructor: `(x, y, angle, speed, damage, isPlayer, color)`
- **Mobile** — virtual joystick (`#joystickZone`) + touch action buttons; detected via `_isMobile` flag; responsive CSS breakpoints at 480 px / 768 px / 1024 px

---

## Audio

`js/audio.js` — Web Audio API (no external files needed, all sounds synthesized):

| Sound | Triggered by |
|-------|-------------|
| Shoot (melee/gun/shotgun/flame/rocket) | Player._shoot() |
| Kill | game.js _onKill() |
| Pickup | game.js pickup collision |
| Explosion | game.js _explodeGrenade() |
| Vehicle enter/exit | game.js _toggleVehicle() |
| Throw grenade | game.js KeyG handler |
| Dodge | game.js phantom dodge |
| Wave up | game.js wave increment |
| Buy / upgrade | shop.js purchase handlers |
