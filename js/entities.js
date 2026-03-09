'use strict';

/**
 * @file entities.js
 * All game entity classes. Loaded after utils.js and config.js.
 *
 * Classes (in order):
 *   Particle       — short-lived visual effect (sparks, blood, fire)
 *   Decal          — persistent floor mark (blood pool, scorch)
 *   Weather        — screen-space rain / smoke / sandstorm / fog / neon-haze particles
 *   Bullet         — projectile fired by player or bot
 *   MeleeAttack    — instant-hit melee arc (knife, electric whip)
 *   Pickup         — health / ammo / money drop on bot death
 *   Vehicle        — driveable car; player enters with F key
 *   Player         — player entity; reads InputManager each frame
 *   Bot            — enemy AI; types: mini/normal/big/police/swat/heavyswat/sniper/bomber/juggernaut
 *   BossBot        — wave boss with shield phase and charge attack
 *   ZombieBot      — melee-only zombie; contact damage, no ranged attack
 *   Bodyguard      — hired escort; follows player, shoots enemies
 *   Drone          — airborne enemy that orbits and fires; spawned by special buildings
 *   Grenade        — arc projectile thrown by player (G key); explodes on fuse or wall
 *   Salesperson    — passive NPC inside car dealership showroom; triggers shop on T press
 *   CityNPC        — ambient pedestrian (life_sim map)
 *   AnimalCompanion — character-specific companion (dog/cat/wolf/raven/bear/fox/salamander/spirit)
 *   AmbientCar     — traffic vehicle driving along road tiles
 *
 * Bullet constructor: (x, y, angle, speed, damage, isPlayer, color)
 * Particle constructor: (x, y, vx, vy, color, size, life)  ← ALL 7 args required
 */

// ─── Particle ──────────────────────────────────────────────────────────────────
class Particle {
  constructor(x, y, vx, vy, color, size, life) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.size  = size;
    this.life  = this.maxLife = life;
    this.dead  = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.92;
    this.vy *= 0.92;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  render(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  static burst(x, y, color, count, sMin, sMax, szMin, szMax, lMin, lMax) {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rnd(sMin, sMax);
      arr.push(new Particle(x, y, Math.cos(a)*s, Math.sin(a)*s, color, rnd(szMin,szMax), rnd(lMin,lMax)));
    }
    return arr;
  }
}

// ─── Decal ─────────────────────────────────────────────────────────────────────
class Decal {
  constructor(x, y, type) {
    this.x = x; this.y = y;
    this.type     = type; // 'blood' | 'hole'
    this.lifetime = 15.0;
    this.dead     = false;
    const s = type === 'blood' ? rnd(12, 22) : rnd(3, 6);
    this._size   = s;
    this._splats = [];
    const n = type === 'blood' ? Math.floor(rnd(3, 7)) : 1;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * s * 0.6;
      this._splats.push({ dx: Math.cos(a)*d, dy: Math.sin(a)*d, r: rnd(s*0.35, s*0.75) });
    }
  }

  update(dt) { this.lifetime -= dt; if (this.lifetime <= 0) this.dead = true; }

  render(ctx) {
    const alpha = Math.min(1, this.lifetime / 3.0) * 0.78;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (this.type === 'blood') {
      ctx.fillStyle = '#3a0000';
      for (const s of this._splats) {
        ctx.beginPath(); ctx.arc(this.x + s.dx, this.y + s.dy, s.r, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      ctx.fillStyle = '#070707';
      ctx.beginPath(); ctx.arc(this.x, this.y, this._size, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.arc(this.x, this.y, this._size + 1.5, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
}

// ─── Weather ───────────────────────────────────────────────────────────────────
class Weather {
  constructor(type) {
    this.type = type;
    this._p   = [];
    this._W   = 1920; this._H = 1080;
    this._init(1920, 1080);
  }

  _init(W, H) {
    this._p = []; this._W = W; this._H = H;
    switch (this.type) {
      case 'rain': case 'blood_rain': {
        const n = this.type === 'blood_rain' ? 180 : 230;
        for (let i = 0; i < n; i++)
          this._p.push({ x: Math.random()*W*1.2-W*0.1, y: Math.random()*H, spd: rnd(500,900), len: rnd(10,20), a: rnd(0.14,0.42) });
        break;
      }
      case 'sandstorm': {
        for (let i = 0; i < 160; i++)
          this._p.push({ x: Math.random()*W, y: Math.random()*H, spd: rnd(280,700), len: rnd(20,55), a: rnd(0.08,0.32) });
        break;
      }
      case 'fog': {
        for (let i = 0; i < 14; i++)
          this._p.push({ x: Math.random()*W, y: Math.random()*H, r: rnd(120,300), spd: rnd(10,28), a: rnd(0.04,0.11), dir: Math.random()*Math.PI*2 });
        break;
      }
      case 'smoke': {
        for (let i = 0; i < 65; i++)
          this._p.push({ x: Math.random()*W, y: H+Math.random()*200, r: rnd(30,85), spd: rnd(18,55), a: rnd(0.04,0.13) });
        break;
      }
      case 'neon_haze': {
        const cols = ['#FF0066','#00FFCC','#FFCC00','#9900FF','#00AAFF'];
        for (let i = 0; i < 28; i++)
          this._p.push({ x: Math.random()*W, y: Math.random()*H, r: rnd(80,220), spd: rnd(6,20), col: cols[i%cols.length], a: rnd(0.025,0.08), dir: Math.random()*Math.PI*2 });
        break;
      }
    }
  }

  update(dt, W, H) {
    if (W !== this._W || H !== this._H) { this._init(W, H); return; }
    switch (this.type) {
      case 'rain': case 'blood_rain': {
        for (const p of this._p) {
          p.y += p.spd * dt; p.x += p.spd * 0.16 * dt;
          if (p.y > H + 30) { p.y = -30; p.x = Math.random()*W*1.2-W*0.1; }
          if (p.x > W + 20)  p.x = -20;
        }
        break;
      }
      case 'sandstorm': {
        for (const p of this._p) {
          p.x += p.spd * dt;
          p.y += Math.sin(p.x * 0.009) * 18 * dt;
          if (p.x > W + 65) { p.x = -65; p.y = Math.random()*H; }
        }
        break;
      }
      case 'fog': {
        for (const p of this._p) {
          p.x += Math.cos(p.dir)*p.spd*dt; p.y += Math.sin(p.dir)*p.spd*dt;
          if (p.x < -p.r*2) p.x = W+p.r; if (p.x > W+p.r*2) p.x = -p.r;
          if (p.y < -p.r*2) p.y = H+p.r; if (p.y > H+p.r*2) p.y = -p.r;
        }
        break;
      }
      case 'smoke': {
        for (const p of this._p) {
          p.y -= p.spd*dt; p.x += Math.sin(p.y*0.009)*8*dt;
          p.r += 3.5*dt; p.a -= 0.016*dt;
          if (p.y < -p.r || p.a <= 0) { p.y = H+Math.random()*60; p.x = Math.random()*W; p.r = rnd(30,60); p.a = rnd(0.04,0.12); }
        }
        break;
      }
      case 'neon_haze': {
        for (const p of this._p) {
          p.x += Math.cos(p.dir)*p.spd*dt; p.y += Math.sin(p.dir)*p.spd*dt;
          if (p.x < -p.r) p.x = W+p.r; if (p.x > W+p.r) p.x = -p.r;
          if (p.y < -p.r) p.y = H+p.r; if (p.y > H+p.r) p.y = -p.r;
        }
        break;
      }
    }
  }

  render(ctx, W, H) {
    switch (this.type) {
      case 'rain': {
        ctx.save(); ctx.strokeStyle = 'rgba(160,200,255,0.55)'; ctx.lineWidth = 0.8;
        for (const p of this._p) {
          ctx.globalAlpha = p.a;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.len*0.16, p.y + p.len); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        const gr = ctx.createLinearGradient(0, H*0.78, 0, H);
        gr.addColorStop(0, 'rgba(68,120,255,0)'); gr.addColorStop(1, 'rgba(68,120,255,0.05)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        ctx.restore(); break;
      }
      case 'blood_rain': {
        ctx.save(); ctx.strokeStyle = 'rgba(160,15,25,0.62)'; ctx.lineWidth = 1.1;
        for (const p of this._p) {
          ctx.globalAlpha = p.a;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + p.len); ctx.stroke();
        }
        ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(35,0,0,0.13)'; ctx.fillRect(0, 0, W, H);
        ctx.restore(); break;
      }
      case 'sandstorm': {
        ctx.save(); ctx.strokeStyle = 'rgba(190,148,68,0.5)'; ctx.lineWidth = 1.2;
        for (const p of this._p) {
          ctx.globalAlpha = p.a;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.len, p.y); ctx.stroke();
        }
        ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(110,72,18,0.09)'; ctx.fillRect(0, 0, W, H);
        ctx.restore(); break;
      }
      case 'fog': {
        ctx.save();
        for (const p of this._p) {
          ctx.globalAlpha = p.a;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, 'rgba(200,220,240,0.85)'); g.addColorStop(1, 'rgba(200,220,240,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        const vg = ctx.createRadialGradient(W/2, H/2, H*0.28, W/2, H/2, H*0.92);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,18,28,0.38)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
        ctx.restore(); break;
      }
      case 'smoke': {
        ctx.save();
        for (const p of this._p) {
          ctx.globalAlpha = p.a;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, 'rgba(75,55,35,0.65)'); g.addColorStop(1, 'rgba(38,28,18,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore(); break;
      }
      case 'neon_haze': {
        ctx.save();
        for (const p of this._p) {
          ctx.globalAlpha = p.a;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, p.col + 'AA'); g.addColorStop(1, p.col + '00');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore(); break;
      }
    }
  }
}

// ─── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle, speed, damage, isPlayer, color) {
    this.x = x; this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage   = damage;
    this.isPlayer = isPlayer;
    this.color    = color;
    this.radius   = 4;
    this.life     = CONFIG.BULLET_LIFETIME;
    this.dead     = false;
    this.trail    = [];
  }

  update(dt, gameMap) {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 6) this.trail.shift();
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0 || gameMap.isBlocked(this.x, this.y)) this.dead = true;
  }

  render(ctx) {
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      ctx.save();
      ctx.globalAlpha = (i / this.trail.length) * 0.35;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.shadowColor = this.color; ctx.shadowBlur = 16;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ─── MeleeAttack ───────────────────────────────────────────────────────────────
class MeleeAttack {
  constructor(x, y, angle, range, damage) {
    this.x = x; this.y = y;
    this.angle    = angle;
    this.range    = range;
    this.damage   = damage;
    this.radius   = range;   // used for broad-phase check
    this._arc     = 1.15;    // ~66 degrees total arc half-angle
    this.isPlayer = true;
    this.isMelee  = true;
    this.dead     = false;
    this.trail    = [];      // expected by bullet loop
  }
  update(dt, map) { this.dead = true; }  // instant hit
  render(ctx) {}  // swing arc rendered by Player.render
}

// ─── Pickup ────────────────────────────────────────────────────────────────────
class Pickup {
  constructor(x, y, type) {
    this.x = x; this.y = y;
    this.type     = type;   // 'health' | 'ammo' | 'cash'
    this.radius   = 14;
    this.dead     = false;
    this.lifetime = 12.0;
    this._pulse   = 0;
  }

  update(dt) {
    this._pulse   += dt * 3;
    this.lifetime -= dt;
    if (this.lifetime <= 0) this.dead = true;
  }

  render(ctx) {
    const alpha = Math.min(1, this.lifetime * 0.5);
    const pulse = (Math.sin(this._pulse) + 1) * 0.5;
    const r     = this.radius * (0.88 + pulse * 0.12);
    const cfg   = {
      health: { color: '#FF4488', glow: '#FF0066', icon: '♥' },
      ammo:   { color: '#FFCC00', glow: '#FF8800', icon: '◉' },
      cash:   { color: '#FFD700', glow: '#FFAA00', icon: '$' },
    }[this.type] || { color: '#FFFFFF', glow: '#AAAAAA', icon: '?' };

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = cfg.glow; ctx.shadowBlur = 14 + pulse * 8;
    ctx.fillStyle   = cfg.color + '33';
    ctx.beginPath(); ctx.arc(this.x, this.y, r + 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cfg.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.shadowBlur = 5;
    ctx.font = `bold ${Math.round(r * 0.9)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(cfg.icon, this.x, this.y + 1);
    ctx.restore();
  }

  applyTo(player) {
    switch (this.type) {
      case 'health': player.health = Math.min(player.maxHealth, player.health + 35); break;
      case 'ammo':   player.fireCooldown = 0; player._ammoBoost = 6.0 * (player._ammoCapMult || 1); break;
      case 'cash':   return 300;
    }
    return 0;
  }
}

// ─── Vehicle ───────────────────────────────────────────────────────────────────
class Vehicle {
  constructor(x, y, color) {
    this.x = x; this.y = y;
    this.color     = color;
    this.radius    = 28;
    this.width     = 54; this.height = 28;
    this.speed     = 295;
    this.hp        = 200; this.maxHp = 200;
    this.dead      = false;
    this.occupied  = false;
    this.angle     = 0;
    this._ramCooldown  = 0;
    this._exploding    = false;
    this._explodeTimer = 0;
    this._ejected      = false;
    this._damageFlash  = 0;
    this._animT        = 0;
  }

  update(dt, occupant, input, gameMap) {
    this._ramCooldown -= dt;
    this._damageFlash -= dt;
    this._animT       += dt;

    if (this._exploding) {
      this._explodeTimer -= dt;
      if (this._explodeTimer <= 0) this.dead = true;
      return;
    }

    if (this.occupied && occupant && input) {
      let dx = 0, dy = 0;
      if (input.isDown('KeyW') || input.isDown('ArrowUp'))    dy -= 1;
      if (input.isDown('KeyS') || input.isDown('ArrowDown'))  dy += 1;
      if (input.isDown('KeyA') || input.isDown('ArrowLeft'))  dx -= 1;
      if (input.isDown('KeyD') || input.isDown('ArrowRight')) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        dx /= len; dy /= len;
        this.angle = Math.atan2(dy, dx);
        const d = this.speed * dt;
        const nx = this.x + dx * d;
        if (!gameMap.isBlockedCircle(nx, this.y, this.radius - 4)) this.x = nx;
        const ny = this.y + dy * d;
        if (!gameMap.isBlockedCircle(this.x, ny, this.radius - 4)) this.y = ny;
      }
      occupant.x = this.x;
      occupant.y = this.y;
    }
  }

  takeDamage(amount, particles) {
    this.hp -= amount;
    this._damageFlash = 0.1;
    if (amount >= 10) {
      particles.push(...Particle.burst(this.x, this.y, this.color, 4, 40, 120, 2, 4, 0.1, 0.25));
    }
    if (this.hp <= 0 && !this._exploding) {
      this.hp = 0;
      this._exploding    = true;
      this._explodeTimer = 0.9;
      window.audio?.vehicleExplosion();
      particles.push(...Particle.burst(this.x, this.y, '#FF8800', 28, 80, 300, 4, 12, 0.4, 1.2));
      particles.push(...Particle.burst(this.x, this.y, '#FFCC00', 16, 60, 220, 3,  9, 0.3, 0.9));
      particles.push(...Particle.burst(this.x, this.y, '#FF4400', 20, 50, 200, 3, 10, 0.35, 1.0));
    }
  }

  render(ctx) {
    if (this._exploding) {
      const t = this._explodeTimer / 0.9;
      ctx.save();
      ctx.globalAlpha = t * 0.85;
      ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 50;
      ctx.fillStyle   = '#FF4400';
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * (2.2 - t * 0.9), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }

    // Shadow
    ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(this.x + 5, this.y + 7, this.width * 0.47, this.height * 0.38, this.angle, 0, Math.PI * 2);
    ctx.fill(); ctx.restore();

    // Body
    ctx.save();
    ctx.translate(this.x, this.y); ctx.rotate(this.angle);
    const flash = this._damageFlash > 0;
    ctx.shadowColor = flash ? '#FF4444' : this.color;
    ctx.shadowBlur  = flash ? 22 : 10;
    ctx.fillStyle   = flash ? '#FF6644' : this.color;
    ctx.beginPath(); ctx.roundRect(-this.width/2, -this.height/2, this.width, this.height, 5); ctx.fill();

    // Windshield (front)
    ctx.fillStyle = 'rgba(180,230,255,0.36)';
    ctx.beginPath(); ctx.roundRect(this.width/2 - 19, -this.height/2 + 3, 15, this.height - 6, 3); ctx.fill();
    // Rear window
    ctx.fillStyle = 'rgba(180,230,255,0.20)';
    ctx.beginPath(); ctx.roundRect(-this.width/2 + 4, -this.height/2 + 3, 11, this.height - 6, 3); ctx.fill();
    // Roof panel (darker)
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.roundRect(-this.width/2 + 16, -this.height/2 + 4, this.width - 30, this.height - 8, 3); ctx.fill();

    // Wheels
    ctx.fillStyle = '#161616'; ctx.shadowBlur = 0;
    const wx = this.width / 2 - 4, wy = this.height / 2 + 1;
    for (const [sx2, sy2] of [[-wx, -wy - 1], [-wx, wy - 6], [wx - 9, -wy - 1], [wx - 9, wy - 6]]) {
      ctx.beginPath(); ctx.roundRect(sx2, sy2, 10, 7, 2); ctx.fill();
    }

    // Headlights
    ctx.fillStyle = '#FFFFDD'; ctx.shadowColor = '#FFFF88'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(this.width/2 - 5, -this.height/2 + 4, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(this.width/2 - 5,  this.height/2 - 4, 3.5, 0, Math.PI * 2); ctx.fill();
    // Taillights
    ctx.fillStyle = '#FF2200'; ctx.shadowColor = '#FF2200'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(-this.width/2 + 5, -this.height/2 + 4, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-this.width/2 + 5,  this.height/2 - 4, 2.5, 0, Math.PI * 2); ctx.fill();

    ctx.restore();

    // HP bar (only when damaged)
    if (this.hp < this.maxHp) {
      const bw = 58, bh = 5, bx2 = this.x - bw/2, by2 = this.y - this.radius - 14;
      const pct = this.hp / this.maxHp;
      ctx.fillStyle = '#111'; ctx.fillRect(bx2, by2, bw, bh);
      ctx.fillStyle   = pct > 0.5 ? '#44FF88' : pct > 0.25 ? '#FFCC00' : '#FF4444';
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6;
      ctx.fillRect(bx2, by2, bw * pct, bh);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 0.5;
      ctx.strokeRect(bx2, by2, bw, bh);
    }
  }
}

// ─── Player ────────────────────────────────────────────────────────────────────
class Player {
  constructor(charData, spawnX, spawnY) {
    this.charData  = charData;
    this.x = spawnX; this.y = spawnY;
    this.radius    = charData.radius;
    this.speed     = charData.speed;
    this.health    = charData.health;
    this.maxHealth = charData.health;
    this.color     = charData.color;
    this.accent    = charData.accent;
    this.angle     = 0;
    this.dead      = false;
    this.invincible = 0;
    this._footAnim  = 0;
    this._muzzleFlash = 0;
    this.fireCooldown = 0;

    // ── Weapon system ──────────────────────────────────────
    this.ownedWeapons    = new Set(['pistol']);
    this.equippedWeaponId = 'pistol';
    this._weapon          = CONFIG.WEAPONS[0];

    // ── Upgrade system ────────────────────────────────────
    this.upgradeLevel  = {};
    this.damageMult    = 1.0;
    this.fireRateMult  = 1.0;
    this.armor         = 0;
    this.regenRate     = 0;
    this._regenAccum   = 0;
    this.inVehicle     = false;
    this._ammoBoost    = 0;
    // ── Customization ─────────────────────────────────────
    const _custRaw = localStorage.getItem('customization');
    const _cust    = _custRaw ? JSON.parse(_custRaw) : {};
    if (_cust.neonColor && _cust.neonColor !== 'default') {
      this.color  = _cust.neonColor;
      this.accent = _cust.neonColor + 'BB';
    }
    this._custMask   = _cust.mask   || 'none';
    this._custEffect = _cust.effect || 'none';
    this._effectT    = 0;

    // ── Animal Companion ──────────────────────────────────
    this.companion = charData.companion ? new AnimalCompanion(charData.companion) : null;
    if (this.companion) { this.companion.x = spawnX; this.companion.y = spawnY; }

    // ── Starter weapon override (Ronin starts with knife) ──
    if (charData.starterWeapon) {
      const sw = CONFIG.WEAPONS.find(w => w.id === charData.starterWeapon);
      if (sw) { this.ownedWeapons.add(sw.id); this.equippedWeaponId = sw.id; this._weapon = sw; }
    }
  }

  equipWeapon(id) {
    const w = CONFIG.WEAPONS.find(w => w.id === id);
    if (w && this.ownedWeapons.has(id)) {
      this.equippedWeaponId = id;
      this._weapon = w;
    }
  }

  cycleWeapon(dir) {
    const owned = CONFIG.WEAPONS.filter(w => this.ownedWeapons.has(w.id));
    const idx = owned.findIndex(w => w.id === this.equippedWeaponId);
    this.equipWeapon(owned[(idx + dir + owned.length) % owned.length].id);
  }

  equipBySlot(slot) {
    const owned = CONFIG.WEAPONS.filter(w => this.ownedWeapons.has(w.id));
    if (owned[slot - 1]) this.equipWeapon(owned[slot - 1].id);
  }

  _activeDamage() {
    const base = this._weapon.damage > 0 ? this._weapon.damage : this.charData.damage;
    return Math.max(1, Math.round(base * this.damageMult));
  }

  _activeFireRate() {
    const base = this._weapon.fireRate > 0 ? this._weapon.fireRate : this.charData.fireRate;
    const ammoBonusMult = this._ammoBoost > 0 ? Math.max(0.35, 0.72 / (this._ammoCapMult || 1)) : 1.0;
    return base * this.fireRateMult * ammoBonusMult;
  }

  _activeSpread()      { return this._weapon.spread; }
  _activeBulletSpeed() { return this._weapon.bulletSpeed; }
  _weaponColor()       { return this._weapon.color; }

  applyUpgrade(id) {
    this.upgradeLevel[id] = (this.upgradeLevel[id] || 0) + 1;
    switch (id) {
      case 'health':   this.maxHealth += 25; this.health = Math.min(this.health + 25, this.maxHealth); break;
      case 'speed':    this.speed += 18; break;
      case 'damage':   this.damageMult += 0.15; break;
      case 'firerate': this.fireRateMult = Math.max(0.2, this.fireRateMult * 0.92); break;
      case 'armor':    this.armor = Math.min(0.5, this.armor + 0.1); break;
      case 'regen':    this.regenRate += 1; break;
      case 'dodge':    this._dodgeChance = Math.min(0.55, (this._dodgeChance || 0) + 0.06); break;
      case 'wealth':   this._wealthMult  = (this._wealthMult  || 1) + 0.20; break;
      case 'leech':    this._leechHp     = (this._leechHp     || 0) + 2;    break;
      case 'critical': this._critChance  = Math.min(0.60, (this._critChance || 0) + 0.08); break;
      case 'ammo':     this._ammoCapMult = (this._ammoCapMult || 1) + 0.25; break;
    }
  }

  update(dt, input, gameMap, bullets, particles) {
    if (this.dead) return;

    // Inside vehicle — only tick timers, movement handled by Vehicle
    if (this.inVehicle) {
      if (this.regenRate > 0 && this.health < this.maxHealth) {
        this.health = Math.min(this.maxHealth, this.health + this.regenRate * dt);
      }
      this.invincible   -= dt;
      this._muzzleFlash -= dt;
      if (this._ammoBoost > 0) this._ammoBoost -= dt;
      return;
    }

    let dx = 0, dy = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp'))    dy -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown'))  dy += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft'))  dx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) dx += 1;

    const dir  = new Vec2(dx, dy).norm();
    const dist = this.speed * dt;
    if (dx !== 0 || dy !== 0) {
      this._footAnim += dt * 8;
      const nx = this.x + dir.x * dist;
      if (!gameMap.isBlockedCircle(nx, this.y, this.radius - 2)) this.x = nx;
      const ny = this.y + dir.y * dist;
      if (!gameMap.isBlockedCircle(this.x, ny, this.radius - 2)) this.y = ny;
    }

    this.angle = Math.atan2(input.mouseWorld.y - this.y, input.mouseWorld.x - this.x);

    this.fireCooldown -= dt * 1000;
    if (input.mouseDown && this.fireCooldown <= 0) {
      this._shoot(bullets, particles);
      this.fireCooldown = this._activeFireRate();
    }

    if (this.regenRate > 0 && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + this.regenRate * dt);
    }

    if (this._ammoBoost > 0) this._ammoBoost -= dt;
    this.invincible   -= dt;
    this._muzzleFlash -= dt;
    this._effectT     += dt;
  }

  _shoot(bullets, particles) {
    const w      = this._weapon;
    const damage = this._activeDamage();
    const color  = this._weaponColor();

    // ── Melee (knife / electric whip) ──────────────────────
    if (w.melee) {
      window.audio?.shoot('melee');
      const ma = new MeleeAttack(this.x, this.y, this.angle, w.range, damage);
      ma.special = w.special || null;
      bullets.push(ma);
      this._muzzleFlash = 0.20;
      const bx = this.x + Math.cos(this.angle) * (this.radius + 10);
      const by = this.y + Math.sin(this.angle) * (this.radius + 10);
      particles.push(...Particle.burst(bx, by, color, 5, 30, 100, 1, 3, 0.06, 0.18));
      return;
    }

    // ── Ranged (all other weapons) ─────────────────────────
    const _sndType = w.id === 'flamethrower' ? 'flame' : w.id === 'rocket' ? 'rocket' : (w.bullets > 2 ? 'shotgun' : 'gun');
    window.audio?.shoot(_sndType);
    const count  = w.bullets;
    const spread = this._activeSpread();
    const speed  = this._activeBulletSpeed();
    const gunTip = this.radius + 6;
    const bx = this.x + Math.cos(this.angle) * gunTip;
    const by = this.y + Math.sin(this.angle) * gunTip;

    for (let i = 0; i < count; i++) {
      const angle = this.angle + (Math.random() - 0.5) * spread;
      const isCrit = this._critChance && Math.random() < this._critChance;
      const blt = new Bullet(bx, by, angle, speed, isCrit ? damage * 2 : damage, true, isCrit ? '#FFDD00' : color);
      blt.special = w.special || null;
      if (isCrit) blt._isCrit = true;
      bullets.push(blt);
    }
    this._muzzleFlash = 0.08;
    particles.push(...Particle.burst(bx, by, color, 3 + Math.floor(count / 2), 80, 220, 1, 3, 0.05, 0.16));
  }

  takeDamage(amount, hud) {
    if (this.invincible > 0) return;
    if (this._dodgeChance && Math.random() < this._dodgeChance) return 0;
    const reduced = Math.max(1, Math.round(amount * (1 - this.armor)));
    this.health  -= reduced;
    this.invincible = 0.15;
    if (hud) hud.shake(6);
    if (this.health <= 0) { this.health = 0; this.dead = true; }
    return reduced;
  }

  render(ctx) {
    const x = this.x, y = this.y, r = this.radius;
    const wColor = this._weaponColor();

    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 5, r * 0.9, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = this.color; ctx.shadowBlur = 28;
    ctx.strokeStyle = this.color; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = this.color; ctx.shadowBlur = 18;
    const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
    grad.addColorStop(0, this.accent);
    grad.addColorStop(1, this.color + '99');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    const gunLen = r + 14;
    const gx = x + Math.cos(this.angle) * gunLen;
    const gy = y + Math.sin(this.angle) * gunLen;
    ctx.save();
    ctx.shadowColor = wColor; ctx.shadowBlur = 12;
    if (this._weapon && this._weapon.melee) {
      // Knife blade
      ctx.strokeStyle = '#AADDFF'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(this.angle) * (r - 2), y + Math.sin(this.angle) * (r - 2));
      ctx.lineTo(gx + Math.cos(this.angle) * 10, gy + Math.sin(this.angle) * 10);
      ctx.stroke();
      // Blade edge
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + Math.cos(this.angle) * 10, gy + Math.sin(this.angle) * 10);
      ctx.stroke();
    } else {
      ctx.strokeStyle = wColor; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(this.angle) * (r - 2), y + Math.sin(this.angle) * (r - 2));
      ctx.lineTo(gx, gy);
      ctx.stroke();
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(gx - Math.cos(this.angle) * 2, gy - Math.sin(this.angle) * 2);
      ctx.lineTo(gx + Math.cos(this.angle) * 8, gy + Math.sin(this.angle) * 8);
      ctx.stroke();
    }
    ctx.restore();

    if (this._muzzleFlash > 0) {
      if (this._weapon && this._weapon.melee) {
        // Knife swing arc
        const swingRange = this._weapon.range;
        const arcSpan    = 1.15;
        ctx.save();
        ctx.globalAlpha  = Math.min(1, this._muzzleFlash / 0.12) * 0.72;
        ctx.strokeStyle  = '#AADDFF';
        ctx.lineWidth    = 2.5;
        ctx.shadowColor  = '#88CCFF'; ctx.shadowBlur = 14;
        ctx.lineCap      = 'round';
        ctx.beginPath();
        ctx.arc(x, y, swingRange, this.angle - arcSpan / 2, this.angle + arcSpan / 2);
        ctx.stroke();
        // Tip glow
        const tipX = x + Math.cos(this.angle) * swingRange;
        const tipY = y + Math.sin(this.angle) * swingRange;
        ctx.fillStyle = '#DDEEFF'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(tipX, tipY, 5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        const fx = x + Math.cos(this.angle) * (gunLen + 12);
        const fy = y + Math.sin(this.angle) * (gunLen + 12);
        ctx.save();
        ctx.shadowColor = wColor; ctx.shadowBlur = 30;
        ctx.fillStyle   = '#ffffaa';
        ctx.globalAlpha = this._muzzleFlash / 0.08;
        ctx.beginPath(); ctx.arc(fx, fy, 7, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    if (this.invincible > 0) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // ── Mask overlay ─────────────────────────────────────────
    if (this._custMask === 'skull') {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(220,220,220,0.82)';
      ctx.beginPath(); ctx.arc(0, -1, r * 0.72, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath(); ctx.ellipse(-5, -3, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse( 5, -3, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(-4, 4, 8, 2);
      ctx.fillRect(-7, 6, 14, 2);
      ctx.restore();
    } else if (this._custMask === 'visor') {
      ctx.save();
      ctx.translate(x, y);
      const vg = ctx.createLinearGradient(-r, -4, r, 4);
      vg.addColorStop(0,   this.color + '44');
      vg.addColorStop(0.5, this.color + 'CC');
      vg.addColorStop(1,   this.color + '44');
      ctx.fillStyle = vg; ctx.shadowColor = this.color; ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(-r + 2, -6, (r - 2) * 2, 12, 3); ctx.fill();
      ctx.restore();
    } else if (this._custMask === 'cyber') {
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = this.color; ctx.lineWidth = 1; ctx.shadowColor = this.color; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.82, -0.5, 0.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.82, Math.PI - 0.5, Math.PI + 0.5); ctx.stroke();
      ctx.fillStyle = this.color + 'CC';
      ctx.beginPath(); ctx.rect(-8, -3, 16, 6); ctx.fill();
      ctx.fillStyle = '#000'; ctx.fillRect(-5, -2, 10, 4);
      ctx.restore();
    }

    // ── Cyber effect ─────────────────────────────────────────
    const et = this._effectT || 0;
    if (this._custEffect === 'aura') {
      const pulse = Math.sin(et * 3) * 0.3 + 0.7;
      ctx.save();
      ctx.shadowColor = this.color; ctx.shadowBlur = 40 * pulse;
      ctx.strokeStyle = this.color + Math.round(pulse * 88).toString(16).padStart(2,'0');
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, r + 8 + Math.sin(et * 3) * 3, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    } else if (this._custEffect === 'static') {
      if (Math.random() < 0.4) {
        ctx.save(); ctx.globalAlpha = 0.55;
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = this.color;
          const ang = Math.random() * Math.PI * 2;
          const d   = r + Math.random() * 10;
          ctx.fillRect(x + Math.cos(ang) * d - 1, y + Math.sin(ang) * d - 1, 2, 2);
        }
        ctx.restore();
      }
    } else if (this._custEffect === 'glitch') {
      if (Math.sin(et * 7) > 0.6) {
        const off = (Math.random() - 0.5) * 12;
        ctx.save();
        ctx.globalAlpha = 0.35; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(x + off, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    // ── Player name tag (world space, below circle) ───────────
    if (this._displayName) {
      ctx.save();
      ctx.font = '7px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.fillText(this._displayName, x, y + r + 13);
      ctx.restore();
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// BOT  (types: 'mini' | 'normal' | 'big')
// ══════════════════════════════════════════════════════════════════════════════
const BOT_STATE = { PATROL: 0, CHASE: 1, ATTACK: 2 };

const BOT_CFG = {
  mini: {
    radius: 9, speedMult: 1.72, hpMult: 0.28, dmgMult: 0.50,
    frBase: 580, frMin: 240,
    palette: [
      { body: '#7722EE', accent: '#AA66FF' },
      { body: '#5511CC', accent: '#8844DD' },
      { body: '#9933FF', accent: '#CC77FF' },
    ],
    bulletColor: '#CC88FF', bulletSpeed: 360, bulletRadius: 3, bulletCount: 1,
    attackRange: 170, visionRange: 330, moneyMult: 0.4,
  },
  normal: {
    radius: 16, speedMult: 1.0, hpMult: 1.0, dmgMult: 1.0,
    frBase: null, frMin: 400,
    palette: [
      { body: '#FF3344', accent: '#FF0022' },
      { body: '#FF6600', accent: '#FF4400' },
      { body: '#AA0000', accent: '#CC2222' },
      { body: '#DD0066', accent: '#FF0088' },
    ],
    bulletColor: '#FF4400', bulletSpeed: 320, bulletRadius: 4, bulletCount: 1,
    attackRange: 300, visionRange: 500, moneyMult: 1.0,
  },
  big: {
    radius: 26, speedMult: 0.56, hpMult: 3.2, dmgMult: 2.4,
    frBase: 1500, frMin: 900,
    palette: [
      { body: '#884400', accent: '#CC6600' },
      { body: '#553300', accent: '#886644' },
    ],
    bulletColor: '#FF8800', bulletSpeed: 240, bulletRadius: 7, bulletCount: 3,
    attackRange: 360, visionRange: 520, moneyMult: 2.0,
  },
  police: {
    radius: 15, speedMult: 1.28, hpMult: 0.88, dmgMult: 0.78,
    frBase: 680, frMin: 320,
    palette: [{ body: '#1144BB', accent: '#4488FF' }],
    bulletColor: '#4488FF', bulletSpeed: 355, bulletRadius: 4, bulletCount: 1,
    attackRange: 290, visionRange: 490, moneyMult: 1.3,
  },
  swat: {
    radius: 19, speedMult: 0.88, hpMult: 2.2, dmgMult: 1.5,
    frBase: 960, frMin: 480,
    palette: [{ body: '#1a1a1a', accent: '#555555' }],
    bulletColor: '#AAAAAA', bulletSpeed: 370, bulletRadius: 5, bulletCount: 2,
    attackRange: 330, visionRange: 530, moneyMult: 2.0,
  },
  heavyswat: {
    radius: 25, speedMult: 0.60, hpMult: 3.8, dmgMult: 2.2,
    frBase: 1300, frMin: 750,
    palette: [{ body: '#111111', accent: '#444444' }],
    bulletColor: '#888888', bulletSpeed: 260, bulletRadius: 8, bulletCount: 3,
    attackRange: 360, visionRange: 550, moneyMult: 2.8,
  },
  sniper: {
    radius: 13, speedMult: 0.60, hpMult: 1.1, dmgMult: 4.5,
    frBase: 2400, frMin: 1800,
    palette: [{ body: '#223344', accent: '#4488BB' }, { body: '#1a2a38', accent: '#336688' }],
    bulletColor: '#88DDFF', bulletSpeed: 1200, bulletRadius: 5, bulletCount: 1,
    attackRange: 580, visionRange: 700, moneyMult: 2.5,
    keepDistance: 380,
  },
  bomber: {
    radius: 18, speedMult: 0.85, hpMult: 1.6, dmgMult: 1.8,
    frBase: 1600, frMin: 1200,
    palette: [{ body: '#884400', accent: '#FF6600' }, { body: '#662200', accent: '#FF4400' }],
    bulletColor: '#FF6600', bulletSpeed: 260, bulletRadius: 8, bulletCount: 1,
    attackRange: 340, visionRange: 480, moneyMult: 2.2,
    isBomber: true,
  },
  juggernaut: {
    radius: 30, speedMult: 0.22, hpMult: 12, dmgMult: 0.75,
    frBase: 48, frMin: 38,
    palette: [{ body: '#222222', accent: '#666666' }, { body: '#1a1a1a', accent: '#555555' }],
    bulletColor: '#FFAA00', bulletSpeed: 200, bulletRadius: 6, bulletCount: 6,
    attackRange: 240, visionRange: 380, moneyMult: 6.0,
  },
};

class Bot {
  constructor(spawnX, spawnY, wave, type = 'normal', mapConfig = null) {
    this.type = type;
    const cfg = BOT_CFG[type] || BOT_CFG.normal;
    this._cfg = cfg;

    this.x = spawnX; this.y = spawnY;
    this.radius   = cfg.radius;
    this.speed    = (CONFIG.BOT_SPEED + wave * 4) * cfg.speedMult;
    this.health   = Math.round((CONFIG.BOT_HEALTH + wave * 8) * cfg.hpMult);
    this.maxHealth = this.health;
    this.damage   = Math.round((CONFIG.BOT_DAMAGE + wave * 2) * cfg.dmgMult);
    this.fireRate = cfg.frBase
      ? Math.max(cfg.frMin, cfg.frBase - wave * 20)
      : Math.max(cfg.frMin, CONFIG.BOT_FIRE_RATE - wave * 30);

    this.dead       = false;
    this.dying      = false;
    this.dyingTimer = 0;

    const palList = (mapConfig && mapConfig.botPalettes && mapConfig.botPalettes[type])
      ? mapConfig.botPalettes[type]
      : cfg.palette;
    const pal = rndChoice(palList);
    this.bodyColor   = pal.body;
    this.accentColor = pal.accent;

    this.state          = BOT_STATE.PATROL;
    this.fireCooldown   = rnd(0, this.fireRate);
    this._patrolTarget  = new Vec2(spawnX, spawnY);
    this._patrolTimer   = 0;
    this._stuckTimer    = 0;
    this._lastX         = spawnX;
    this._lastY         = spawnY;
    this._angle         = Math.random() * Math.PI * 2;
    this._eyeBlink      = 0;
    this._eyeBlinkTimer = rnd(1, 4);
    this._animT         = 0;
  }

  update(dt, player, gameMap, bullets, particles) {
    if (this.dying) {
      this.dyingTimer -= dt;
      if (this.dyingTimer <= 0) this.dead = true;
      return;
    }

    this._animT += dt;
    const dist        = Math.hypot(player.x - this.x, player.y - this.y);
    const attackRange = this._cfg.attackRange;
    const visionRange = this._cfg.visionRange;

    if (!player.dead) {
      if (dist < attackRange)      this.state = BOT_STATE.ATTACK;
      else if (dist < visionRange) this.state = BOT_STATE.CHASE;
      else                         this.state = BOT_STATE.PATROL;
    } else {
      this.state = BOT_STATE.PATROL;
    }

    if (this.state !== BOT_STATE.PATROL) {
      this._angle = Math.atan2(player.y - this.y, player.x - this.x);
    }

    // Movement
    let targetX = this.x, targetY = this.y;
    if (this.state === BOT_STATE.CHASE || this.state === BOT_STATE.ATTACK) {
      targetX = player.x; targetY = player.y;
    } else {
      this._patrolTimer -= dt;
      if (this._patrolTimer <= 0 || Math.hypot(this._patrolTarget.x - this.x, this._patrolTarget.y - this.y) < 20) {
        this._patrolTarget = gameMap.randomRoadPos();
        this._patrolTimer  = rnd(2, 6);
      }
      targetX = this._patrolTarget.x; targetY = this._patrolTarget.y;
    }

    const minAttackDist = this.type === 'mini' ? 0 : this._cfg.keepDistance ? this._cfg.keepDistance : 75;
    // Sniper backs away when player gets too close
    if (this._cfg.keepDistance && this.state === BOT_STATE.ATTACK && dist < this._cfg.keepDistance) {
      const dx = this.x - player.x, dy = this.y - player.y;
      const d  = Math.hypot(dx, dy) || 1;
      const md = this.speed * dt;
      const newX = this.x + (dx / d) * md;
      if (!gameMap.isBlockedCircle(newX, this.y, this.radius - 2)) this.x = newX;
      const newY = this.y + (dy / d) * md;
      if (!gameMap.isBlockedCircle(this.x, newY, this.radius - 2)) this.y = newY;
    } else if (!(this.state === BOT_STATE.ATTACK && dist < minAttackDist)) {
      const dx = targetX - this.x, dy = targetY - this.y;
      const d  = Math.hypot(dx, dy);
      if (d > 5) {
        const nx = dx / d, ny = dy / d;
        const md = this.speed * dt;
        const newX = this.x + nx * md;
        if (!gameMap.isBlockedCircle(newX, this.y, this.radius - 2)) {
          this.x = newX;
        } else {
          const sa = this._angle + Math.PI / 2;
          if (!gameMap.isBlockedCircle(this.x + Math.cos(sa)*md, this.y + Math.sin(sa)*md, this.radius - 2)) {
            this.x += Math.cos(sa) * md;
            this.y += Math.sin(sa) * md;
          }
        }
        const newY = this.y + ny * md;
        if (!gameMap.isBlockedCircle(this.x, newY, this.radius - 2)) this.y = newY;
      }
    }

    // Stuck detection
    this._stuckTimer += dt;
    if (this._stuckTimer > 1.5) {
      if (Math.hypot(this.x - this._lastX, this.y - this._lastY) < 10) {
        this._patrolTarget = gameMap.randomRoadPos();
        this._patrolTimer  = 0;
      }
      this._lastX = this.x; this._lastY = this.y;
      this._stuckTimer = 0;
    }

    // Shooting
    if (this.state === BOT_STATE.ATTACK) {
      this.fireCooldown -= dt * 1000;
      if (this.fireCooldown <= 0) {
        this._shoot(bullets, particles);
        this.fireCooldown = this.fireRate;
      }
    }

    // Eye blink
    this._eyeBlinkTimer -= dt;
    if (this._eyeBlinkTimer <= 0) { this._eyeBlink = 0.12; this._eyeBlinkTimer = rnd(2, 5); }
    this._eyeBlink -= dt;
  }

  _shoot(bullets, particles) {
    const cfg   = this._cfg;
    const count = cfg.bulletCount;
    const go    = this.radius + 5;
    const bx    = this.x + Math.cos(this._angle) * go;
    const by    = this.y + Math.sin(this._angle) * go;

    if (cfg.isBomber) {
      // Bomber throws a slow AOE explosive blob
      const bull = new Bullet(bx, by, this._angle, cfg.bulletSpeed, this.damage, false, cfg.bulletColor);
      bull.radius  = 9;
      bull._isBomb = true;   // game.js handles AoE on impact
      bull._aoeRadius = 80;
      bull._aoeDamage = this.damage * 1.5;
      bullets.push(bull);
      particles.push(...Particle.burst(bx, by, '#FF6600', 5, 40, 100, 2, 5, 0.05, 0.14));
      return;
    }

    for (let i = 0; i < count; i++) {
      const t     = count > 1 ? (i / (count - 1) - 0.5) * 0.55 : 0;
      const angle = this._angle + t + (Math.random() - 0.5) * (this.type === 'sniper' ? 0.012 : 0.09);
      const bull  = new Bullet(bx, by, angle, cfg.bulletSpeed, this.damage, false, cfg.bulletColor);
      bull.radius = cfg.bulletRadius;
      if (this.type === 'sniper') bull._isPiercing = true;
      bullets.push(bull);
    }
    particles.push(...Particle.burst(bx, by, cfg.bulletColor, count * 2, 60, 150, 1, 3, 0.05, 0.14));
  }

  takeDamage(amount, particles) {
    this.health -= amount;
    particles.push(...Particle.burst(this.x, this.y, this.bodyColor, CONFIG.HIT_PARTICLES, 60, 180, 2, 4, 0.1, 0.3));
    if (this.health <= 0) {
      this.health = 0;
      this.dying  = true;
      this.dyingTimer = this.type === 'mini' ? 0.12 : 0.35;
      const pc = this.type === 'big' ? 20 : this.type === 'mini' ? 6 : CONFIG.DEATH_PARTICLES;
      particles.push(...Particle.burst(this.x, this.y, this.bodyColor, pc, 80, 260, 3, 8, 0.3, 0.9));
      particles.push(...Particle.burst(this.x, this.y, '#FF8800', this.type === 'big' ? 10 : 4, 40, 130, 2, 5, 0.2, 0.5));
    }
  }

  render(ctx) {
    const x  = this.x, y = this.y, r = this.radius;
    const ds = this.dying ? Math.max(0, this.dyingTimer / (this.type === 'mini' ? 0.12 : 0.35)) : 1;
    ctx.save();
    ctx.translate(x, y); ctx.scale(ds, ds); ctx.translate(-x, -y);
    if      (this.type === 'mini')                                                  this._renderMini(ctx, x, y, r);
    else if (this.type === 'big')                                                   this._renderBig(ctx, x, y, r);
    else if (this.type === 'police' || this.type === 'swat' || this.type === 'heavyswat') this._renderPolice(ctx, x, y, r);
    else if (this.type === 'sniper')                                                this._renderSniper(ctx, x, y, r);
    else if (this.type === 'bomber')                                                this._renderBomber(ctx, x, y, r);
    else if (this.type === 'juggernaut')                                            this._renderJuggernaut(ctx, x, y, r);
    else                                                                            this._renderNormal(ctx, x, y, r);
    ctx.restore();
  }

  _renderMini(ctx, x, y, r) {
    // Glowing orb
    ctx.save();
    ctx.shadowColor = this.bodyColor; ctx.shadowBlur = 12;
    const g = ctx.createRadialGradient(x - r*0.3, y - r*0.3, 0.5, x, y, r);
    g.addColorStop(0, this.accentColor); g.addColorStop(1, this.bodyColor + 'BB');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Spinning ring
    ctx.save();
    ctx.strokeStyle = this.accentColor; ctx.lineWidth = 1; ctx.globalAlpha = 0.55;
    ctx.translate(x, y); ctx.rotate(this._animT * 4.5);
    ctx.beginPath(); ctx.arc(0, 0, r + 2.5, 0, Math.PI * 1.5); ctx.stroke();
    ctx.restore();

    // Single eye
    const ex = x + Math.cos(this._angle) * r * 0.45;
    const ey = y + Math.sin(this._angle) * r * 0.45;
    ctx.save();
    ctx.fillStyle = '#FF2222'; ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Health bar
    const bw = 22, bh = 3, bx2 = x - bw/2, by2 = y - r - 7;
    ctx.fillStyle = '#111'; ctx.fillRect(bx2, by2, bw, bh);
    const pct = this.health / this.maxHealth;
    ctx.fillStyle = pct > 0.5 ? '#AA66FF' : '#FF4444';
    ctx.fillRect(bx2, by2, bw * pct, bh);
  }

  _renderNormal(ctx, x, y, r) {
    // Shadow
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+3, y+4, r*0.9, r*0.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Body (rotated square)
    ctx.save();
    ctx.shadowColor = this.bodyColor; ctx.shadowBlur = 14; ctx.fillStyle = this.bodyColor;
    ctx.translate(x, y); ctx.rotate(this._angle + Math.PI/4);
    const s = r * 0.85;
    ctx.beginPath(); ctx.roundRect(-s, -s, s*2, s*2, 4); ctx.fill();
    ctx.restore();

    // Hex pattern
    ctx.save();
    ctx.strokeStyle = this.accentColor; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.55;
    ctx.translate(x, y); ctx.rotate(this._angle);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i/6)*Math.PI*2;
      i === 0 ? ctx.moveTo(Math.cos(a)*r*0.4, Math.sin(a)*r*0.4)
              : ctx.lineTo(Math.cos(a)*r*0.4, Math.sin(a)*r*0.4);
    }
    ctx.closePath(); ctx.stroke();
    ctx.restore();

    // Eyes
    const eyeOpen = this._eyeBlink > 0 ? 0.1 : 1.0;
    const fwdX = Math.cos(this._angle)*r*0.4, fwdY = Math.sin(this._angle)*r*0.4;
    const perpX = -Math.sin(this._angle)*r*0.3, perpY = Math.cos(this._angle)*r*0.3;
    for (let i = -1; i <= 1; i += 2) {
      ctx.save();
      ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 12; ctx.fillStyle = '#FF2222';
      ctx.beginPath();
      ctx.ellipse(x+fwdX+perpX*i, y+fwdY+perpY*i, 3.5, 3.5*eyeOpen, 0, 0, Math.PI*2);
      ctx.fill(); ctx.restore();
    }

    // Gun arm
    const gl = r + 12, gx = x + Math.cos(this._angle)*gl, gy = y + Math.sin(this._angle)*gl;
    ctx.save();
    ctx.shadowColor = '#888'; ctx.shadowBlur = 5;
    ctx.strokeStyle = '#666'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(this._angle)*r, y + Math.sin(this._angle)*r);
    ctx.lineTo(gx, gy); ctx.stroke(); ctx.restore();

    // Health bar
    const bw = 40, bh = 5, bx2 = x-bw/2, by2 = y-r-14;
    const pct = this.health / this.maxHealth;
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(bx2, by2, bw, bh);
    ctx.fillStyle = pct > 0.6 ? '#44FF44' : pct > 0.3 ? '#FFCC00' : '#FF4444';
    ctx.fillRect(bx2, by2, bw*pct, bh);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(bx2, by2, bw, bh);
  }

  _renderBig(ctx, x, y, r) {
    // Shadow
    ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+5, y+7, r*0.95, r*0.55, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Outer armor ring
    ctx.save();
    ctx.strokeStyle = this.accentColor; ctx.lineWidth = 5; ctx.globalAlpha = 0.45;
    ctx.shadowColor = this.bodyColor; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(x, y, r + 6, 0, Math.PI*2); ctx.stroke();
    ctx.restore();

    // Body (thick square)
    ctx.save();
    ctx.shadowColor = this.bodyColor; ctx.shadowBlur = 20; ctx.fillStyle = this.bodyColor;
    ctx.translate(x, y); ctx.rotate(this._angle + Math.PI/4);
    const s = r * 0.9;
    ctx.beginPath(); ctx.roundRect(-s, -s, s*2, s*2, 6); ctx.fill();
    ctx.fillStyle = this.accentColor + '22';
    ctx.beginPath(); ctx.roundRect(-s*0.55, -s*0.55, s*1.1, s*1.1, 4); ctx.fill();
    ctx.restore();

    // Rivets
    ctx.save(); ctx.fillStyle = this.accentColor;
    for (let i = 0; i < 4; i++) {
      const ba = this._angle + Math.PI/4 + (i/4)*Math.PI*2;
      ctx.beginPath(); ctx.arc(x + Math.cos(ba)*r*0.78, y + Math.sin(ba)*r*0.78, 3.5, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();

    // Cyclops eye
    const ex = x + Math.cos(this._angle)*r*0.35, ey = y + Math.sin(this._angle)*r*0.35;
    ctx.save();
    ctx.fillStyle = '#FF4400'; ctx.shadowColor = '#FF2200'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(ex, ey, 7.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFAA44'; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Heavy gun arm
    const gl = r + 14, gx = x + Math.cos(this._angle)*gl, gy = y + Math.sin(this._angle)*gl;
    ctx.save();
    ctx.strokeStyle = this.accentColor; ctx.shadowColor = this.bodyColor; ctx.shadowBlur = 8;
    ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(this._angle)*(r-3), y + Math.sin(this._angle)*(r-3));
    ctx.lineTo(gx, gy); ctx.stroke();
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(this._angle)*14, gy + Math.sin(this._angle)*14); ctx.stroke();
    ctx.restore();

    // Health bar (wide)
    const bw = 60, bh = 6, bx2 = x-bw/2, by2 = y-r-18;
    const pct = this.health / this.maxHealth;
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(bx2, by2, bw, bh);
    ctx.fillStyle = pct > 0.6 ? '#FF8800' : pct > 0.3 ? '#FFAA00' : '#FF4444';
    ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 6;
    ctx.fillRect(bx2, by2, bw*pct, bh);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(bx2, by2, bw, bh);
  }

  _renderPolice(ctx, x, y, r) {
    const isSwat  = this.type === 'swat' || this.type === 'heavyswat';
    const isHeavy = this.type === 'heavyswat';
    const bodyCol   = isSwat ? '#181818' : '#1144BB';
    const accentCol = isSwat ? (isHeavy ? '#444' : '#555') : '#4488FF';

    // Shadow
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+3, y+4, r*0.9, r*0.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Body
    ctx.save();
    ctx.shadowColor = bodyCol; ctx.shadowBlur = isHeavy ? 18 : 12; ctx.fillStyle = bodyCol;
    ctx.translate(x, y); ctx.rotate(this._angle + Math.PI/4);
    const s = r * 0.87;
    ctx.beginPath(); ctx.roundRect(-s, -s, s*2, s*2, isHeavy ? 3 : 5); ctx.fill();
    // Uniform stripe / badge
    if (!isSwat) {
      ctx.fillStyle = '#FFD700'; // gold badge
      ctx.fillRect(-s*0.22, -s*0.22, s*0.44, s*0.38);
    } else {
      ctx.strokeStyle = accentCol; ctx.lineWidth = isHeavy ? 3 : 2; ctx.globalAlpha = 0.55;
      ctx.strokeRect(-s*0.55, -s*0.55, s*1.1, s*1.1);
    }
    ctx.restore();

    // Helmet / cap (forward-facing)
    ctx.save();
    ctx.translate(x, y); ctx.rotate(this._angle);
    const capCol = isSwat ? '#2a2a2a' : '#002288';
    ctx.fillStyle = capCol; ctx.shadowColor = capCol; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.ellipse(r*0.28, 0, r*0.42, r*0.3, 0, 0, Math.PI*2); ctx.fill();
    if (isSwat) {
      ctx.fillStyle = 'rgba(80,160,220,0.3)';
      ctx.beginPath(); ctx.ellipse(r*0.32, 0, r*0.32, r*0.2, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();

    // Eyes
    const eyeOpen = this._eyeBlink > 0 ? 0.1 : 1.0;
    const fwdX = Math.cos(this._angle)*r*0.36, fwdY = Math.sin(this._angle)*r*0.36;
    const perpX = -Math.sin(this._angle)*r*0.28, perpY = Math.cos(this._angle)*r*0.28;
    for (let i = -1; i <= 1; i += 2) {
      ctx.save();
      ctx.shadowColor = isSwat ? '#FF4400' : '#4488FF'; ctx.shadowBlur = 10;
      ctx.fillStyle = isSwat ? '#FF3300' : '#DDDDFF';
      ctx.beginPath();
      ctx.ellipse(x+fwdX+perpX*i, y+fwdY+perpY*i, 3, 3*eyeOpen, 0, 0, Math.PI*2);
      ctx.fill(); ctx.restore();
    }

    // Gun
    const gl = r + (isHeavy ? 17 : 12);
    const gx = x + Math.cos(this._angle)*gl, gy = y + Math.sin(this._angle)*gl;
    ctx.save();
    ctx.shadowColor = accentCol; ctx.shadowBlur = 6;
    ctx.strokeStyle = accentCol; ctx.lineWidth = isHeavy ? 9 : 4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(this._angle)*(r-2), y + Math.sin(this._angle)*(r-2));
    ctx.lineTo(gx, gy); ctx.stroke(); ctx.restore();

    // HP bar
    const bw = isHeavy ? 56 : 40, bh = isHeavy ? 6 : 5;
    const bx2 = x-bw/2, by2 = y-r-14;
    const pct = this.health / this.maxHealth;
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(bx2, by2, bw, bh);
    ctx.fillStyle = pct > 0.6 ? accentCol : pct > 0.3 ? '#FFCC00' : '#FF4444';
    ctx.fillRect(bx2, by2, bw*pct, bh);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(bx2, by2, bw, bh);
  }

  _renderSniper(ctx, x, y, r) {
    // Lean, hooded figure with long rifle
    ctx.save();
    ctx.shadowColor = '#4488BB'; ctx.shadowBlur = 14;
    const g = ctx.createRadialGradient(x - r*0.3, y - r*0.3, 0.5, x, y, r);
    g.addColorStop(0, this.accentColor); g.addColorStop(1, this.bodyColor + 'CC');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    // Scope ring
    ctx.strokeStyle = '#88DDFF'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
    // Long rifle barrel
    const gl = r + 22;
    ctx.save();
    ctx.shadowColor = '#88DDFF'; ctx.shadowBlur = 8;
    ctx.strokeStyle = '#88DDFF'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(this._angle)*(r-2), y + Math.sin(this._angle)*(r-2));
    ctx.lineTo(x + Math.cos(this._angle)*gl, y + Math.sin(this._angle)*gl);
    ctx.stroke();
    // Scope
    ctx.strokeStyle = '#CCDDFF'; ctx.lineWidth = 5;
    const sm = 0.55;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(this._angle)*(r+4), y + Math.sin(this._angle)*(r+4));
    ctx.lineTo(x + Math.cos(this._angle)*(r+12), y + Math.sin(this._angle)*(r+12));
    ctx.stroke();
    ctx.restore();
    this._renderHPBar(ctx, x, y, r, 42, 5);
  }

  _renderBomber(ctx, x, y, r) {
    // Stocky with explosive vest
    ctx.save();
    ctx.shadowColor = '#FF6600'; ctx.shadowBlur = 18;
    const g = ctx.createRadialGradient(x, y - r*0.3, 0.5, x, y, r);
    g.addColorStop(0, '#FF8833'); g.addColorStop(1, this.bodyColor + 'CC');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    // Vest stripes
    ctx.strokeStyle = '#FFAA44'; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.7;
    for (let i = -1; i <= 1; i++) {
      const ox = Math.cos(this._angle + Math.PI/2) * (i * 5);
      const oy = Math.sin(this._angle + Math.PI/2) * (i * 5);
      ctx.beginPath();
      ctx.arc(x + ox, y + oy, r * 0.65, this._angle - 0.5, this._angle + 0.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Bomb in hand
    const bx2 = x + Math.cos(this._angle) * (r + 10);
    const by2 = y + Math.sin(this._angle) * (r + 10);
    ctx.fillStyle = '#334433'; ctx.strokeStyle = '#88CC88'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(bx2, by2, 8, 6, this._angle, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FF4400'; ctx.beginPath(); ctx.arc(bx2, by2 - 8, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    this._renderHPBar(ctx, x, y, r, 44, 5);
  }

  _renderJuggernaut(ctx, x, y, r) {
    // Massive armored behemoth
    ctx.save();
    ctx.shadowColor = '#666666'; ctx.shadowBlur = 24;
    const g = ctx.createRadialGradient(x - r*0.25, y - r*0.25, 1, x, y, r);
    g.addColorStop(0, '#555555'); g.addColorStop(1, '#111111');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    // Armor plates
    ctx.strokeStyle = '#888888'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, r - 4, -0.6, 0.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r - 4, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke();
    // Minigun barrels
    const gl = r + 14;
    for (let i = -1; i <= 1; i++) {
      const off = i * 4;
      const ox = Math.cos(this._angle + Math.PI/2) * off;
      const oy = Math.sin(this._angle + Math.PI/2) * off;
      ctx.save();
      ctx.strokeStyle = '#FFAA00'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + ox + Math.cos(this._angle)*(r-2), y + oy + Math.sin(this._angle)*(r-2));
      ctx.lineTo(x + ox + Math.cos(this._angle)*gl, y + oy + Math.sin(this._angle)*gl);
      ctx.stroke();
      ctx.restore();
    }
    // Glowing eyes
    ctx.fillStyle = '#FF4400'; ctx.shadowColor = '#FF4400'; ctx.shadowBlur = 14;
    const eOff = r * 0.35;
    ctx.beginPath(); ctx.arc(x + Math.cos(this._angle - 0.4)*eOff, y + Math.sin(this._angle - 0.4)*eOff, 3.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + Math.cos(this._angle + 0.4)*eOff, y + Math.sin(this._angle + 0.4)*eOff, 3.5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    this._renderHPBar(ctx, x, y, r, 70, 8);
  }

  _renderHPBar(ctx, x, y, r, bw, bh) {
    const bx2 = x - bw/2, by2 = y - r - 16;
    const pct = this.health / this.maxHealth;
    ctx.fillStyle = '#111'; ctx.fillRect(bx2, by2, bw, bh);
    ctx.fillStyle = pct > 0.6 ? this.accentColor : pct > 0.3 ? '#FFCC00' : '#FF4444';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 4;
    ctx.fillRect(bx2, by2, bw * pct, bh);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 0.5;
    ctx.strokeRect(bx2, by2, bw, bh);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// BOSS BOT  — one unique boss per map
// ══════════════════════════════════════════════════════════════════════════════
const BOSS_CONFIGS = {
  downtown: {
    name: 'THE KINGPIN',    color: '#FF0066', accent: '#FF88AA',
    radius: 38, speed: 82,  hp: 900,  dmg: 22, fr: 950,  bspd: 340,
    special: 'burst',   // ring of 10 bullets
  },
  industrial: {
    name: 'IRON COLOSSUS',  color: '#FF7700', accent: '#FFAA55',
    radius: 46, speed: 46,  hp: 1500, dmg: 38, fr: 1600, bspd: 210,
    special: 'slam',    // shockwave + 3 heavy shots
  },
  suburbs: {
    name: 'SWARM QUEEN',    color: '#9900FF', accent: '#CC77FF',
    radius: 34, speed: 106, hp: 700,  dmg: 16, fr: 1050, bspd: 300,
    special: 'spawn',   // summons 2 mini bots
  },
  ruins: {
    name: 'THE WARLORD',    color: '#FF2200', accent: '#FF7755',
    radius: 36, speed: 148, hp: 800,  dmg: 14, fr: 660,  bspd: 380,
    special: 'charge',  // rushes at player
  },
  docks: {
    name: 'THE HARBORMASTER', color: '#00AACC', accent: '#44DDFF',
    radius: 40, speed: 70,  hp: 950,  dmg: 28, fr: 800,  bspd: 420,
    special: 'volley',  // rapid harpoon burst
  },
  casino: {
    name: 'THE DEALER',     color: '#FFCC00', accent: '#FF88AA',
    radius: 36, speed: 115, hp: 750,  dmg: 20, fr: 700,  bspd: 360,
    special: 'scatter',  // card scatter burst
  },
  arena: {
    name: 'THE EXECUTIONER', color: '#FF0044', accent: '#FF6688',
    radius: 42, speed: 92,  hp: 1100, dmg: 30, fr: 820,  bspd: 390,
    special: 'burst',    // ring of bullets
  },
};

class BossBot {
  constructor(spawnX, spawnY, wave, mapId) {
    this.mapId = mapId;
    this.type  = 'boss';
    this.wave  = wave;

    const bc = BOSS_CONFIGS[mapId] || BOSS_CONFIGS.downtown;
    this.name        = bc.name;
    this.color       = bc.color;
    this.accentColor = bc.accent;
    this.radius      = bc.radius;
    this.speed       = bc.speed + wave * 2;
    this.health      = bc.hp + wave * 55;
    this.maxHealth   = this.health;
    this.damage      = bc.dmg + wave * 2;
    this.fireRate    = bc.fr;
    this._bulletSpeed = bc.bspd;
    this._special    = bc.special;

    this.x = spawnX; this.y = spawnY;
    this.dead = false; this.dying = false; this.dyingTimer = 0;

    this.state         = BOT_STATE.PATROL;
    this.fireCooldown  = 2500;
    this._patrolTarget = new Vec2(spawnX, spawnY);
    this._patrolTimer  = 0;
    this._stuckTimer   = 0;
    this._lastX        = spawnX;
    this._lastY        = spawnY;
    this._angle        = 0;

    this._enraged         = false;
    this._specialCooldown = 8000;
    this._chargeActive    = false;
    this._chargeTimer     = 0;
    this._chargeVx        = 0;
    this._chargeVy        = 0;
    this._chargeDmgTimer  = 0;
    this._pulseT          = 0;
    this._introTimer      = 1.8;
  }

  update(dt, player, gameMap, bullets, particles, bots) {
    if (this.dying) {
      this.dyingTimer -= dt;
      if (this.dyingTimer <= 0) this.dead = true;
      return;
    }

    this._pulseT    += dt * 2;
    this._introTimer = Math.max(0, this._introTimer - dt);

    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    if (!player.dead) {
      if      (dist < 370) this.state = BOT_STATE.ATTACK;
      else if (dist < 620) this.state = BOT_STATE.CHASE;
      else                 this.state = BOT_STATE.PATROL;
    } else {
      this.state = BOT_STATE.PATROL;
    }

    if (this.state !== BOT_STATE.PATROL) {
      this._angle = Math.atan2(player.y - this.y, player.x - this.x);
    }

    // Enrage at 40% HP
    if (!this._enraged && this.health < this.maxHealth * 0.4) {
      this._enraged = true;
      particles.push(...Particle.burst(this.x, this.y, this.color, 22, 100, 310, 4, 10, 0.4, 1.1));
    }

    // Movement
    if (this._chargeActive) {
      const spd = Math.hypot(this._chargeVx, this._chargeVy) * dt;
      const nx  = this._chargeVx / Math.hypot(this._chargeVx, this._chargeVy);
      const ny  = this._chargeVy / Math.hypot(this._chargeVx, this._chargeVy);
      if (!gameMap.isBlockedCircle(this.x + nx * spd, this.y, this.radius - 4)) this.x += nx * spd;
      if (!gameMap.isBlockedCircle(this.x, this.y + ny * spd, this.radius - 4)) this.y += ny * spd;
      this._chargeTimer -= dt;
      if (this._chargeTimer <= 0) { this._chargeActive = false; }
      this._chargeDmgTimer -= dt;
    } else {
      let targetX = this.x, targetY = this.y;
      if (this.state === BOT_STATE.CHASE || this.state === BOT_STATE.ATTACK) {
        targetX = player.x; targetY = player.y;
      } else {
        this._patrolTimer -= dt;
        if (this._patrolTimer <= 0) { this._patrolTarget = gameMap.randomRoadPos(); this._patrolTimer = rnd(3, 7); }
        targetX = this._patrolTarget.x; targetY = this._patrolTarget.y;
      }
      const minD = this.state === BOT_STATE.ATTACK ? 130 : 0;
      if (dist > minD) {
        const dx = targetX - this.x, dy = targetY - this.y;
        const d  = Math.hypot(dx, dy);
        if (d > 8) {
          const spd = this.speed * (this._enraged ? 1.35 : 1.0) * dt;
          if (!gameMap.isBlockedCircle(this.x + (dx/d)*spd, this.y, this.radius - 4)) this.x += (dx/d)*spd;
          if (!gameMap.isBlockedCircle(this.x, this.y + (dy/d)*spd, this.radius - 4)) this.y += (dy/d)*spd;
        }
      }
    }

    // Stuck detection
    this._stuckTimer += dt;
    if (this._stuckTimer > 2.0) {
      if (Math.hypot(this.x - this._lastX, this.y - this._lastY) < 12) this._patrolTarget = gameMap.randomRoadPos();
      this._lastX = this.x; this._lastY = this.y; this._stuckTimer = 0;
    }

    // Normal shoot
    if (this.state === BOT_STATE.ATTACK && !this._chargeActive) {
      this.fireCooldown -= dt * 1000;
      if (this.fireCooldown <= 0) {
        this._shoot(bullets, particles);
        this.fireCooldown = this._enraged ? this.fireRate * 0.6 : this.fireRate;
      }
    }

    // Special ability
    this._specialCooldown -= dt * 1000;
    if (this._specialCooldown <= 0 && this.state !== BOT_STATE.PATROL) {
      this._useSpecial(player, bullets, particles, bots, gameMap);
      this._specialCooldown = this._enraged ? 5000 : 8500;
    }
  }

  _shoot(bullets, particles) {
    const go = this.radius + 10;
    const bx = this.x + Math.cos(this._angle) * go;
    const by = this.y + Math.sin(this._angle) * go;
    const count = (this._special === 'charge' && this._enraged) ? 5 : (this._special === 'charge' ? 3 : 1);

    for (let i = 0; i < count; i++) {
      const t     = count > 1 ? (i / (count - 1) - 0.5) * 0.55 : 0;
      const angle = this._angle + t + (Math.random() - 0.5) * 0.07;
      const bRad  = this.mapId === 'industrial' ? 8 : 6;
      const bull  = new Bullet(bx, by, angle, this._bulletSpeed * (this._enraged ? 1.15 : 1.0), this.damage, false, this.color);
      bull.radius = bRad;
      bullets.push(bull);
    }
    particles.push(...Particle.burst(bx, by, this.color, 6, 80, 210, 2, 6, 0.06, 0.2));
  }

  _useSpecial(player, bullets, particles, bots, gameMap) {
    switch (this._special) {
      case 'burst': {
        // Kingpin: 10-bullet ring + enraged 16-bullet ring
        const n = this._enraged ? 16 : 10;
        for (let i = 0; i < n; i++) {
          const a    = (i / n) * Math.PI * 2;
          const bull = new Bullet(this.x, this.y, a, this._bulletSpeed * 0.85, this.damage * 0.75, false, this.color);
          bull.radius = 5;
          bullets.push(bull);
        }
        particles.push(...Particle.burst(this.x, this.y, '#FF0066', 18, 100, 260, 3, 8, 0.2, 0.6));
        break;
      }
      case 'slam': {
        // Iron Colossus: shockwave particles + 3 heavy shots
        particles.push(...Particle.burst(this.x, this.y, '#FF7700', 35, 50, 350, 5, 14, 0.3, 0.9));
        const go = this.radius + 12;
        const bx = this.x + Math.cos(this._angle) * go;
        const by = this.y + Math.sin(this._angle) * go;
        const c  = this._enraged ? 5 : 3;
        for (let i = 0; i < c; i++) {
          const a    = this._angle + (i - Math.floor(c/2)) * 0.32;
          const bull = new Bullet(bx, by, a, this._bulletSpeed * 0.75, this.damage * 1.6, false, '#FF8800');
          bull.radius = 11;
          bullets.push(bull);
        }
        break;
      }
      case 'spawn': {
        // Swarm Queen: spawn 2-3 mini bots
        const minis = bots.filter(b => b.type === 'mini' && !b.dead).length;
        if (minis < 10) {
          const n = this._enraged ? 3 : 2;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + Math.random();
            const sx = this.x + Math.cos(a) * (this.radius + 28);
            const sy = this.y + Math.sin(a) * (this.radius + 28);
            if (!gameMap.isBlocked(sx, sy)) bots.push(new Bot(sx, sy, this.wave, 'mini', null));
          }
        }
        particles.push(...Particle.burst(this.x, this.y, '#9900FF', 14, 80, 210, 3, 8, 0.2, 0.6));
        break;
      }
      case 'charge': {
        // Warlord: charge at player
        const dx = player.x - this.x, dy = player.y - this.y;
        const d  = Math.hypot(dx, dy);
        if (d > 0) {
          const spd = this.speed * (this._enraged ? 4.5 : 3.2);
          this._chargeVx     = (dx / d) * spd;
          this._chargeVy     = (dy / d) * spd;
          this._chargeActive = true;
          this._chargeTimer  = 1.3;
          this._chargeDmgTimer = 0;
        }
        particles.push(...Particle.burst(this.x, this.y, '#FF2200', 12, 100, 290, 3, 9, 0.2, 0.6));
        break;
      }
      case 'volley': {
        // Harbormaster: rapid harpoon burst — 5-7 quick aimed shots
        const n = this._enraged ? 7 : 5;
        const go = this.radius + 12;
        const bx = this.x + Math.cos(this._angle) * go;
        const by = this.y + Math.sin(this._angle) * go;
        for (let i = 0; i < n; i++) {
          const spread = (Math.random() - 0.5) * 0.14;
          const bull = new Bullet(bx, by, this._angle + spread, this._bulletSpeed * 1.35, this.damage * 0.65, false, this.color);
          bull.radius = 5;
          bullets.push(bull);
        }
        particles.push(...Particle.burst(this.x, this.y, '#00AACC', 16, 100, 260, 3, 8, 0.18, 0.55));
        break;
      }
      case 'scatter': {
        // The Dealer: scatter bullets in all directions + one powerful aimed shot
        const n = this._enraged ? 12 : 8;
        for (let i = 0; i < n; i++) {
          const a    = (i / n) * Math.PI * 2;
          const bull = new Bullet(this.x, this.y, a, this._bulletSpeed * 0.88, this.damage * 0.7, false, this.color);
          bull.radius = 5;
          bullets.push(bull);
        }
        const go   = this.radius + 12;
        const bx2  = this.x + Math.cos(this._angle) * go;
        const by2  = this.y + Math.sin(this._angle) * go;
        const ace  = new Bullet(bx2, by2, this._angle, this._bulletSpeed * 1.25, this.damage * 1.8, false, '#FF88AA');
        ace.radius = 8;
        bullets.push(ace);
        particles.push(...Particle.burst(this.x, this.y, '#FFCC00', 20, 90, 260, 3, 9, 0.18, 0.65));
        break;
      }
    }
  }

  takeDamage(amount, particles) {
    this.health -= amount;
    particles.push(...Particle.burst(this.x, this.y, this.color, 8, 60, 180, 2, 5, 0.1, 0.3));
    if (this.health <= 0) {
      this.health = 0;
      this.dying  = true;
      this.dyingTimer = 1.2;
      for (let i = 0; i < 4; i++) {
        particles.push(...Particle.burst(
          this.x + rnd(-35, 35), this.y + rnd(-35, 35),
          this.color, 18, 80, 300, 4, 12, 0.4, 1.2
        ));
      }
      particles.push(...Particle.burst(this.x, this.y, '#FFD700', 25, 100, 380, 5, 15, 0.5, 1.4));
    }
  }

  render(ctx) {
    if (this.dying) {
      const ds = Math.max(0, this.dyingTimer / 1.2);
      ctx.save();
      ctx.translate(this.x, this.y); ctx.scale(ds, ds); ctx.translate(-this.x, -this.y);
    }

    const x = this.x, y = this.y, r = this.radius;
    const pulse = (Math.sin(this._pulseT) + 1) * 0.5;

    // Intro scale-in
    if (this._introTimer > 0) {
      const sc = 1 - (this._introTimer / 1.8);
      ctx.save();
      ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
    }

    // Outer warning ring
    ctx.save();
    ctx.strokeStyle = this.color; ctx.lineWidth = 2;
    ctx.globalAlpha = 0.12 + pulse * 0.18;
    ctx.shadowColor = this.color; ctx.shadowBlur = 28;
    ctx.beginPath(); ctx.arc(x, y, r + 18 + pulse * 12, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // Shadow
    ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x + 6, y + 9, r, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Per-boss body
    switch (this.mapId) {
      case 'downtown':   this._renderKingpin(ctx, x, y, r, pulse); break;
      case 'industrial': this._renderColossus(ctx, x, y, r, pulse); break;
      case 'suburbs':    this._renderSwarmQueen(ctx, x, y, r, pulse); break;
      case 'ruins':      this._renderWarlord(ctx, x, y, r, pulse); break;
      case 'docks':      this._renderHarbormaster(ctx, x, y, r, pulse); break;
      case 'casino':     this._renderDealer(ctx, x, y, r, pulse); break;
      default:           this._renderKingpin(ctx, x, y, r, pulse); break;
    }

    // Name + enrage label
    ctx.save();
    ctx.font = 'bold 11px Orbitron, monospace';
    ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 12;
    ctx.textAlign = 'center';
    ctx.fillText(this.name, x, y - r - 30);
    if (this._enraged) {
      ctx.font = 'bold 9px Orbitron, monospace';
      ctx.fillStyle = '#FF4444'; ctx.shadowColor = '#FF0000';
      ctx.fillText('⚡ ENRAGED ⚡', x, y - r - 45);
    }
    ctx.restore();

    // Boss on-world health bar
    const bw = r * 3.4, bh = 8, bx2 = x - bw/2, by2 = y - r - 22;
    const pct = this.health / this.maxHealth;
    ctx.fillStyle = '#111'; ctx.fillRect(bx2, by2, bw, bh);
    ctx.fillStyle = pct > 0.5 ? this.color : '#FF2200';
    ctx.shadowColor = pct > 0.5 ? this.color : '#FF0000'; ctx.shadowBlur = 8;
    ctx.fillRect(bx2, by2, bw * pct, bh);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
    ctx.strokeRect(bx2, by2, bw, bh);

    if (this._introTimer > 0) ctx.restore();
    if (this.dying) ctx.restore();
  }

  _renderKingpin(ctx, x, y, r, pulse) {
    // Body
    ctx.save();
    ctx.shadowColor = '#FF0066'; ctx.shadowBlur = 22 + pulse * 14;
    const g = ctx.createRadialGradient(x - r*0.3, y - r*0.3, 2, x, y, r);
    g.addColorStop(0, '#FF88AA'); g.addColorStop(0.6, '#FF0066'); g.addColorStop(1, '#880033');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Pinstripe rings
    ctx.save(); ctx.strokeStyle = '#FF88AA'; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.35;
    for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(x, y, r*(0.35+i*0.22), 0, Math.PI*2); ctx.stroke(); }
    ctx.restore();

    // Crown
    ctx.save(); ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 14;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a0 = (i/5)*Math.PI*2 - Math.PI/2, a1 = ((i+0.5)/5)*Math.PI*2 - Math.PI/2;
      const a2 = ((i+1)/5)*Math.PI*2 - Math.PI/2;
      if (i === 0) ctx.moveTo(x + Math.cos(a0)*r*0.72, y + Math.sin(a0)*r*0.72);
      ctx.lineTo(x + Math.cos(a0+0.01)*(r+13), y + Math.sin(a0+0.01)*(r+13));
      ctx.lineTo(x + Math.cos(a1)*(r*0.72), y + Math.sin(a1)*(r*0.72));
      ctx.lineTo(x + Math.cos(a2-0.01)*(r+13), y + Math.sin(a2-0.01)*(r+13));
    }
    ctx.closePath(); ctx.fill(); ctx.restore();

    // Eyes
    for (let i = -1; i <= 1; i += 2) {
      const ex = x + Math.cos(this._angle)*r*0.35 + (-Math.sin(this._angle))*r*0.24*i;
      const ey = y + Math.sin(this._angle)*r*0.35 + Math.cos(this._angle)*r*0.24*i;
      ctx.save(); ctx.fillStyle = '#FF88AA'; ctx.shadowColor = '#FF0066'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI*2); ctx.fill(); ctx.restore();
    }

    // Dual gun arms
    for (let i = -1; i <= 1; i += 2) {
      const ga = this._angle + (Math.PI/10)*i, gl = r + 16;
      const gx = x + Math.cos(ga)*gl, gy = y + Math.sin(ga)*gl;
      ctx.save(); ctx.strokeStyle = '#FF0066'; ctx.shadowColor = '#FF0066'; ctx.shadowBlur = 10;
      ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + Math.cos(ga)*(r-4), y + Math.sin(ga)*(r-4)); ctx.lineTo(gx, gy); ctx.stroke();
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(ga)*10, gy + Math.sin(ga)*10); ctx.stroke();
      ctx.restore();
    }
  }

  _renderColossus(ctx, x, y, r, pulse) {
    // Armored square body
    ctx.save(); ctx.shadowColor = '#FF7700'; ctx.shadowBlur = 20 + pulse * 12;
    ctx.translate(x, y); ctx.rotate(Math.PI/4);
    const g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, '#CC5500'); g.addColorStop(0.5, '#FF7700'); g.addColorStop(1, '#883300');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.roundRect(-r, -r, r*2, r*2, 7); ctx.fill();
    ctx.restore();

    // Armor plating lines
    ctx.save(); ctx.strokeStyle = '#FFAA55'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.45;
    ctx.strokeRect(x - r*0.85, y - r*0.85, r*1.7, r*1.7);
    ctx.strokeRect(x - r*0.5,  y - r*0.5,  r*1.0, r*1.0);
    ctx.restore();

    // Rivets
    ctx.save(); ctx.fillStyle = '#FFAA55';
    for (const [bx2, by2] of [[-0.7,-0.7],[0.7,-0.7],[-0.7,0.7],[0.7,0.7]]) {
      ctx.beginPath(); ctx.arc(x + bx2*r, y + by2*r, 4.5, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();

    // Cyclops eye
    const ex = x + Math.cos(this._angle)*r*0.3, ey = y + Math.sin(this._angle)*r*0.3;
    ctx.save(); ctx.fillStyle = '#FF4400'; ctx.shadowColor = '#FF4400'; ctx.shadowBlur = 20 + pulse*8;
    ctx.beginPath(); ctx.arc(ex, ey, 11 + pulse*3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFCC44'; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(ex, ey, 5.5, 0, Math.PI*2); ctx.fill(); ctx.restore();

    // Massive cannon
    const gl = r + 22, gx = x + Math.cos(this._angle)*gl, gy = y + Math.sin(this._angle)*gl;
    ctx.save(); ctx.strokeStyle = '#FFAA55'; ctx.shadowColor = '#FF7700'; ctx.shadowBlur = 14;
    ctx.lineWidth = 13; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + Math.cos(this._angle)*r, y + Math.sin(this._angle)*r); ctx.lineTo(gx, gy); ctx.stroke();
    ctx.strokeStyle = '#FF7700'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(this._angle)*16, gy + Math.sin(this._angle)*16); ctx.stroke();
    ctx.restore();
  }

  _renderSwarmQueen(ctx, x, y, r, pulse) {
    // Wobbly organic blob
    ctx.save(); ctx.shadowColor = '#9900FF'; ctx.shadowBlur = 22 + pulse * 15;
    const g = ctx.createRadialGradient(x - r*0.25, y - r*0.25, 2, x, y, r);
    g.addColorStop(0, '#CC66FF'); g.addColorStop(0.55, '#9900FF'); g.addColorStop(1, '#440088');
    ctx.fillStyle = g;
    ctx.beginPath();
    const segs = 10;
    for (let i = 0; i <= segs; i++) {
      const a  = (i / segs) * Math.PI * 2;
      const wo = r * (0.82 + Math.sin(this._pulseT * 1.6 + i * 1.1) * 0.14);
      if (i === 0) ctx.moveTo(x + Math.cos(a)*wo, y + Math.sin(a)*wo);
      else         ctx.lineTo(x + Math.cos(a)*wo, y + Math.sin(a)*wo);
    }
    ctx.closePath(); ctx.fill(); ctx.restore();

    // Tendrils
    ctx.save(); ctx.strokeStyle = '#CC66FF'; ctx.lineWidth = 2; ctx.globalAlpha = 0.55;
    for (let i = 0; i < 7; i++) {
      const a = (i/7)*Math.PI*2 + this._pulseT * 0.35;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a)*r*0.65, y + Math.sin(a)*r*0.65);
      ctx.lineTo(x + Math.cos(a)*(r+16), y + Math.sin(a)*(r+16));
      ctx.stroke();
    }
    ctx.restore();

    // Three eyes
    for (let i = 0; i < 3; i++) {
      const ea = this._angle + (i - 1) * (Math.PI / 3.5);
      const ex = x + Math.cos(ea)*r*0.4, ey = y + Math.sin(ea)*r*0.4;
      const sz = i === 1 ? 8 : 4.5;
      ctx.save(); ctx.fillStyle = '#FF00FF'; ctx.shadowColor = '#FF00FF'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(ex, ey, sz, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(ex, ey, sz * 0.4, 0, Math.PI*2); ctx.fill(); ctx.restore();
    }

    // Tendril gun
    const gl = r + 14, gx = x + Math.cos(this._angle)*gl, gy = y + Math.sin(this._angle)*gl;
    ctx.save(); ctx.strokeStyle = '#CC66FF'; ctx.shadowColor = '#9900FF'; ctx.shadowBlur = 10;
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + Math.cos(this._angle)*r*0.6, y + Math.sin(this._angle)*r*0.6); ctx.lineTo(gx, gy); ctx.stroke();
    ctx.restore();
  }

  _renderWarlord(ctx, x, y, r, pulse) {
    // Spiked star body
    ctx.save(); ctx.shadowColor = '#FF2200'; ctx.shadowBlur = 20 + pulse * 16;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, '#FF6644'); g.addColorStop(0.5, '#FF2200'); g.addColorStop(1, '#660000');
    ctx.fillStyle = g;
    ctx.beginPath();
    const spikes = 8, outer = r * (this._chargeActive ? 1.18 : 1.0), inner = r * 0.58;
    for (let i = 0; i < spikes; i++) {
      const a  = (i / spikes) * Math.PI * 2 + this._pulseT * 0.12;
      const ra = ((i + 0.5) / spikes) * Math.PI * 2 + this._pulseT * 0.12;
      if (i === 0) ctx.moveTo(x + Math.cos(a)*outer, y + Math.sin(a)*outer);
      else         ctx.lineTo(x + Math.cos(a)*outer, y + Math.sin(a)*outer);
      ctx.lineTo(x + Math.cos(ra)*inner, y + Math.sin(ra)*inner);
    }
    ctx.closePath(); ctx.fill(); ctx.restore();

    // Skull eyes
    for (let i = -1; i <= 1; i += 2) {
      const ex = x + Math.cos(this._angle)*r*0.3 + (-Math.sin(this._angle))*r*0.22*i;
      const ey = y + Math.sin(this._angle)*r*0.3 + Math.cos(this._angle)*r*0.22*i;
      ctx.save(); ctx.fillStyle = '#FF4400'; ctx.shadowColor = '#FF2200'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.ellipse(ex, ey, 7, 5.5, this._angle, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FFAA00'; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI*2); ctx.fill(); ctx.restore();
    }

    // Triple shotgun barrel
    for (let i = -1; i <= 1; i++) {
      const ga = this._angle + i * 0.13, gl = r + 18;
      const gx = x + Math.cos(ga)*gl, gy = y + Math.sin(ga)*gl;
      ctx.save(); ctx.strokeStyle = '#FF6644'; ctx.shadowColor = '#FF2200'; ctx.shadowBlur = 8;
      ctx.lineWidth = i === 0 ? 7 : 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + Math.cos(ga)*(r-4), y + Math.sin(ga)*(r-4)); ctx.lineTo(gx, gy); ctx.stroke();
      ctx.restore();
    }

    // Charge trail effect
    if (this._chargeActive) {
      ctx.save(); ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#FF2200'; ctx.shadowColor = '#FF2200'; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(x, y, r * 1.25, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  _renderHarbormaster(ctx, x, y, r, pulse) {
    // Octagonal steel hull
    ctx.save(); ctx.shadowColor = '#00AACC'; ctx.shadowBlur = 18 + pulse * 12;
    const g = ctx.createRadialGradient(x - r*0.25, y - r*0.25, 2, x, y, r);
    g.addColorStop(0, '#44DDFF'); g.addColorStop(0.55, '#00AACC'); g.addColorStop(1, '#004466');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
      if (i === 0) ctx.moveTo(x + Math.cos(a)*r, y + Math.sin(a)*r);
      else         ctx.lineTo(x + Math.cos(a)*r, y + Math.sin(a)*r);
    }
    ctx.closePath(); ctx.fill(); ctx.restore();

    // Armor rings
    ctx.save(); ctx.strokeStyle = '#44DDFF'; ctx.lineWidth = 2; ctx.globalAlpha = 0.38;
    for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.arc(x, y, r*(0.42+i*0.24), 0, Math.PI*2); ctx.stroke(); }
    ctx.restore();

    // Rivets
    ctx.save(); ctx.fillStyle = '#44DDFF'; ctx.globalAlpha = 0.7;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(x + Math.cos(a)*r*0.82, y + Math.sin(a)*r*0.82, 3, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();

    // Targeting eyes
    for (let i = -1; i <= 1; i += 2) {
      const ex = x + Math.cos(this._angle)*r*0.35 + (-Math.sin(this._angle))*r*0.25*i;
      const ey = y + Math.sin(this._angle)*r*0.35 + Math.cos(this._angle)*r*0.25*i;
      ctx.save(); ctx.fillStyle = '#00DDFF'; ctx.shadowColor = '#00AACC'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI*2); ctx.fill(); ctx.restore();
    }

    // Harpoon cannon
    const gl = r + 20, gx = x + Math.cos(this._angle)*gl, gy = y + Math.sin(this._angle)*gl;
    ctx.save(); ctx.strokeStyle = '#44DDFF'; ctx.shadowColor = '#00AACC'; ctx.shadowBlur = 12;
    ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + Math.cos(this._angle)*r, y + Math.sin(this._angle)*r); ctx.lineTo(gx, gy); ctx.stroke();
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(this._angle)*18, gy + Math.sin(this._angle)*18); ctx.stroke();
    ctx.restore();
  }

  _renderDealer(ctx, x, y, r, pulse) {
    // Diamond body
    ctx.save(); ctx.shadowColor = '#FFCC00'; ctx.shadowBlur = 18 + pulse * 14;
    const g = ctx.createRadialGradient(x, y - r*0.2, 2, x, y, r);
    g.addColorStop(0, '#FFEE88'); g.addColorStop(0.5, '#FFCC00'); g.addColorStop(1, '#CC8800');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x,         y - r);
    ctx.lineTo(x + r*0.85, y);
    ctx.lineTo(x,          y + r);
    ctx.lineTo(x - r*0.85, y);
    ctx.closePath(); ctx.fill(); ctx.restore();

    // Inner diamond facet lines
    ctx.save(); ctx.strokeStyle = '#FFEE88'; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(x, y - r*0.5); ctx.lineTo(x + r*0.42, y); ctx.lineTo(x, y + r*0.5); ctx.lineTo(x - r*0.42, y); ctx.closePath();
    ctx.stroke(); ctx.restore();

    // Spinning suit icons
    ctx.save(); ctx.globalAlpha = 0.5;
    ctx.translate(x, y); ctx.rotate(this._pulseT * 0.55);
    ctx.font = `bold ${Math.round(r * 0.4)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const suits = ['♦', '♥', '♠', '♣'];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.fillStyle = i % 2 === 0 ? '#FFCC00' : '#FF88AA';
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
      ctx.save(); ctx.rotate(a); ctx.fillText(suits[i], 0, -r * 0.6); ctx.restore();
    }
    ctx.restore();

    // Eyes
    for (let i = -1; i <= 1; i += 2) {
      const ex = x + Math.cos(this._angle)*r*0.3 + (-Math.sin(this._angle))*r*0.22*i;
      const ey = y + Math.sin(this._angle)*r*0.3 + Math.cos(this._angle)*r*0.22*i;
      ctx.save(); ctx.fillStyle = '#FF88AA'; ctx.shadowColor = '#FF88AA'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(ex, ey, 5.5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(ex, ey, 2.5, 0, Math.PI*2); ctx.fill(); ctx.restore();
    }

    // Elegant pistol
    const gl = r + 16, gx = x + Math.cos(this._angle)*gl, gy = y + Math.sin(this._angle)*gl;
    ctx.save(); ctx.strokeStyle = '#FFCC00'; ctx.shadowColor = '#FFCC00'; ctx.shadowBlur = 10;
    ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + Math.cos(this._angle)*(r-4), y + Math.sin(this._angle)*(r-4)); ctx.lineTo(gx, gy); ctx.stroke();
    ctx.strokeStyle = '#FF88AA'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(this._angle)*14, gy + Math.sin(this._angle)*14); ctx.stroke();
    ctx.restore();
  }
}

// ── Drone ──────────────────────────────────────────────────────────────────────
class Drone {
  constructor(x, y, type) {
    this.x    = x;
    this.y    = y;
    this.type = type;  // 'police' | 'combat' | 'player'
    this._cfg = CONFIG.DRONE_CONFIGS[type];
    this.hp   = this._cfg.hp;
    this.maxHp = this._cfg.hp;
    this.radius = this._cfg.radius;
    this.speed  = this._cfg.speed;
    this.angle  = 0;
    this.dead   = false;
    this.dying  = false;

    // Orbit AI
    this._orbitAngle  = Math.random() * Math.PI * 2;
    this._orbitRadius = 90 + Math.random() * 50;
    this._fireTimer   = (Math.random() * (this._cfg.fireRate || 1500));

    // Visual bob
    this._altTimer  = Math.random() * Math.PI * 2;
    this._altitude  = 0;
  }

  update(dt, target, map, bullets, particles) {
    if (this.dead || this.type === 'player') return;

    // Orbit target
    this._orbitAngle += dt * 0.9;
    const ox = target.x + Math.cos(this._orbitAngle) * this._orbitRadius;
    const oy = target.y + Math.sin(this._orbitAngle) * this._orbitRadius;
    const dx = ox - this.x, dy = oy - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 5) {
      const spd = Math.min(this.speed * dt, dist);
      this.x += (dx / dist) * spd;
      this.y += (dy / dist) * spd;
    }

    // Face target
    this.angle = Math.atan2(target.y - this.y, target.x - this.x);

    // Visual bob
    this._altTimer += dt * 3;
    this._altitude  = Math.sin(this._altTimer) * 5;

    // Shoot at target
    this._fireTimer -= dt * 1000;
    if (this._fireTimer <= 0) {
      this._fireTimer = this._cfg.fireRate;
      const spd = 400;
      const blt = new Bullet(this.x, this.y, this.angle, this._cfg.damage, false, spd);
      bullets.push(blt);
    }
  }

  takeDamage(amount, particles) {
    if (this.dead) return;
    this.hp -= amount;
    if (particles) {
      for (let i = 0; i < 5; i++) {
        const a = Math.random() * Math.PI * 2;
        particles.push(new Particle(this.x, this.y, Math.cos(a)*120, Math.sin(a)*120, this._cfg.color, 0.4));
      }
    }
    if (this.hp <= 0) {
      this.dead = true;
      if (particles) {
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * Math.PI * 2;
          particles.push(new Particle(this.x, this.y, Math.cos(a)*200, Math.sin(a)*200, '#FF8800', 0.7));
        }
      }
    }
  }

  render(ctx) {
    if (this.dead) return;
    const x = this.x;
    const y = this.y + this._altitude;
    const col = this._cfg.color;
    const r   = this.radius;

    // Ground shadow
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(this.x, this.y + r + 8, r * 1.1, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    // Body — cross arms at 45° orientation
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.angle + Math.PI / 4);

    // Arms
    ctx.strokeStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur  = 10;
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
    ctx.moveTo(0, -r); ctx.lineTo(0, r);
    ctx.stroke();

    // Center hub
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2); ctx.fill();

    // Rotor tips
    const tips = [[r, 0], [-r, 0], [0, r], [0, -r]];
    ctx.shadowBlur = 14;
    for (const [tx, ty] of tips) {
      ctx.beginPath(); ctx.arc(tx, ty, 4.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // HP bar when damaged
    if (this.hp < this.maxHp) {
      const bw = r * 2 + 8, bh = 3;
      const bx = x - bw / 2, by = y - r - 10;
      ctx.save();
      ctx.fillStyle = '#111'; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = col;
      ctx.fillRect(bx, by, bw * (this.hp / this.maxHp), bh);
      ctx.restore();
    }
  }
}

// ══════════════════════════════════════════════════════════════════
// ZombieBot — experimental mode enemy
// ══════════════════════════════════════════════════════════════════
class ZombieBot {
  constructor(x, y, wave, type = 'shambler') {
    this.x    = x;
    this.y    = y;
    this.type = type;
    this._cfg = CONFIG.ZOMBIE_CONFIGS[type];

    this.hp     = this._cfg.hp + Math.floor(wave * 8);
    this.maxHp  = this.hp;
    this.radius = this._cfg.radius;
    this.speed  = this._cfg.speed;
    this.damage = this._cfg.damage;

    this.dead  = false;
    this.dying = false;
    this._dyingTimer  = 0;
    this._angle       = 0;
    this._contactTimer = 0;   // cooldown between melee hits (seconds)
    this._acidTimer   = 0;   // ms until next acid spit
    this._rageMult    = 1;
    this._damagedTimer = 0;  // seconds to show HP bar after taking damage
  }

  update(dt, player, map, bullets, particles) {
    if (this.dying) {
      this._dyingTimer -= dt;
      if (this._dyingTimer <= 0) this.dead = true;
      return;
    }

    if (this._contactTimer > 0) this._contactTimer -= dt;
    if (this._damagedTimer > 0) this._damagedTimer -= dt;

    const dx   = player.x - this.x;
    const dy   = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 1) {
      this._angle = Math.atan2(dy, dx);
      const spd = this.speed * this._rageMult * dt;
      const nx  = dx / dist, ny = dy / dist;
      const tx  = this.x + nx * spd;
      const ty  = this.y + ny * spd;

      if (!map.isBlockedCircle(tx, this.y, this.radius - 2)) this.x = tx;
      if (!map.isBlockedCircle(this.x, ty, this.radius - 2)) this.y = ty;
    }

    // Runner rage at 50% HP
    if (this.type === 'runner' && this.hp <= this.maxHp * 0.5) {
      this._rageMult = 1.8;
    }

    // Acid spit (mutant / bloater)
    if (!this._cfg.melee && dist < 380) {
      this._acidTimer -= dt * 1000;
      if (this._acidTimer <= 0) {
        this._acidTimer = this._cfg.acidRate;
        const b = new Bullet(this.x, this.y, this._angle, this._cfg.acidSpeed,
                             this._cfg.damage, false, '#88FF44');
        b.radius = 7;
        bullets.push(b);
      }
    }
  }

  takeDamage(amount, particles) {
    if (this.dying || this.dead) return;
    this.hp -= amount;
    this._damagedTimer = 1.5;

    // Green particle burst
    for (let i = 0; i < 5; i++) {
      const a   = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 80;
      particles.push(new Particle(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd,
                                  '#88FF44', 3, 0.3 + Math.random() * 0.3));
    }

    if (this.hp <= 0) {
      this.dying = true;
      this._dyingTimer = 0.3;
    }
  }

  render(ctx) {
    if (this.dead) return;
    const x = this.x, y = this.y, r = this.radius;
    const t = this.dying ? Math.max(0, this._dyingTimer / 0.3) : 1;

    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = t;

    // Rage glow for enraged runner
    if (this._rageMult > 1) {
      ctx.shadowColor = '#99FF44';
      ctx.shadowBlur  = 18;
    }

    // Spiky star body (7 spikes)
    const spikes = 7;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const a  = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const sr = i % 2 === 0 ? r : r * 0.55;
      if (i === 0) ctx.moveTo(Math.cos(a) * sr, Math.sin(a) * sr);
      else         ctx.lineTo(Math.cos(a) * sr, Math.sin(a) * sr);
    }
    ctx.closePath();
    ctx.fillStyle   = this._cfg.color;
    ctx.fill();
    ctx.strokeStyle = this._cfg.accent;
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Eyes oriented toward movement angle
    const perpX = -Math.sin(this._angle);
    const perpY =  Math.cos(this._angle);
    const fwdX  = Math.cos(this._angle) * r * 0.35;
    const fwdY  = Math.sin(this._angle) * r * 0.35;
    const eo    = r * 0.28;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(fwdX + perpX * eo, fwdY + perpY * eo, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fwdX - perpX * eo, fwdY - perpY * eo, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // HP bar — always for brute/bloater, brief flash after damage for others
    const showBar = this.type === 'brute' || this.type === 'bloater' || this._damagedTimer > 0;
    if (showBar && !this.dying) {
      const bw = r * 2 + 8, bh = 3;
      const bx = x - bw / 2, by = y - r - 10;
      ctx.save();
      ctx.fillStyle = '#111';  ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#44FF44'; ctx.fillRect(bx, by, bw * (this.hp / this.maxHp), bh);
      ctx.restore();
    }
  }
}

// ─── Bodyguard ───────────────────────────────────────────────────────────────
class Bodyguard {
  constructor(x, y, tier = 'light') {
    this.x = x; this.y = y;
    this.dead = false; this.dying = false;
    this._tier = tier;
    const tiers = {
      light:  { hp:80,  speed:170, damage:25, fireRate:600,  color:'#44CCFF', radius:14 },
      heavy:  { hp:200, speed:130, damage:50, fireRate:850,  color:'#FF8844', radius:19 },
      elite:  { hp:150, speed:195, damage:42, fireRate:480,  color:'#AAFFAA', radius:15 },
      sniper: { hp:100, speed:155, damage:95, fireRate:1400, color:'#FF44FF', radius:14 },
      medic:  { hp:120, speed:160, damage:18, fireRate:700,  color:'#44FFEE', radius:14 },
      ghost:  { hp:90,  speed:220, damage:35, fireRate:520,  color:'#CC88FF', radius:13 },
    };
    const cfg  = tiers[tier] || tiers.light;
    this.hp    = cfg.hp; this.maxHp = cfg.hp;
    this.speed = cfg.speed; this.damage = cfg.damage;
    this.fireRate = cfg.fireRate; this.color = cfg.color; this.radius = cfg.radius;
    this._fireCooldown = Math.random() * cfg.fireRate;
    this._angle  = 0; this._t = 0; this._dyingT = 0;
    this._healTimer = 4.5;
    this._onHeal = null;
  }

  update(dt, playerX, playerY, bots, bullets, particles, playerHp = 100, playerMaxHp = 100) {
    this._t += dt;
    if (this.dying) { this._dyingT += dt; if (this._dyingT > 0.6) this.dead = true; return; }
    if (this.hp <= 0) { this.dying = true; return; }

    // Follow player — stay ~60px offset
    const dx = playerX - this.x, dy = playerY - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 65) {
      const spd = this.speed * dt;
      this.x += (dx / dist) * spd;
      this.y += (dy / dist) * spd;
    }

    // Target nearest bot in range (sniper has longer range)
    const range = this._tier === 'sniper' ? 580 : 360;
    let target = null, minDist = range;
    for (const bot of bots) {
      if (bot.dead || bot.dying) continue;
      const d = Math.hypot(bot.x - this.x, bot.y - this.y);
      if (d < minDist) { target = bot; minDist = d; }
    }
    if (target) {
      this._angle = Math.atan2(target.y - this.y, target.x - this.x);
      this._fireCooldown -= dt * 1000;
      if (this._fireCooldown <= 0) {
        this._fireCooldown = this.fireRate;
        const blt = new Bullet(this.x, this.y, this._angle, 380, this.damage, true, this.color);
        if (this._tier === 'sniper') blt._isPiercing = true;
        bullets.push(blt);
      }
    }

    // Medic: heal player when HP < 70%
    if (this._tier === 'medic' && !target) {
      this._healTimer -= dt;
      if (this._healTimer <= 0 && playerHp < playerMaxHp * 0.7) {
        this._healTimer = 4.5;
        if (this._onHeal) this._onHeal(8);
      }
    }
  }

  takeDamage(dmg) {
    if (this._tier === 'ghost' && Math.random() < 0.22) return;
    this.hp -= dmg;
    if (this.hp <= 0) this.dying = true;
  }

  render(ctx) {
    if (this.dead) return;
    const x = this.x, y = this.y, r = this.radius;
    ctx.save();
    if (this.dying) ctx.globalAlpha = Math.max(0, 1 - this._dyingT / 0.6);
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(x + 2, y + 4, r * 0.85, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    // Body
    ctx.shadowColor = this.color; ctx.shadowBlur = 14;
    ctx.fillStyle   = this.color + '88';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = this.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    // Gun arm
    const gx = x + Math.cos(this._angle) * (r + 10);
    const gy = y + Math.sin(this._angle) * (r + 10);
    ctx.strokeStyle = this.color; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(this._angle) * (r - 2), y + Math.sin(this._angle) * (r - 2));
    ctx.lineTo(gx, gy); ctx.stroke();
    // HP bar
    const bw = r * 2.5, bh = 4;
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - bw / 2, y - r - 10, bw, bh);
    ctx.fillStyle = this.hp / this.maxHp > 0.45 ? '#44FF88' : '#FF4444';
    ctx.fillRect(x - bw / 2, y - r - 10, bw * (this.hp / this.maxHp), bh);
    // Label
    ctx.fillStyle = this.color; ctx.font = 'bold 6px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.fillText('GUARD', x, y - r - 14);
    ctx.restore();
  }
}

// ─── Grenade ────────────────────────────────────────────────────────────────
class Grenade {
  constructor(x, y, tx, ty) {
    this.x = x; this.y = y; this.dead = false; this.radius = 8;
    const dist  = Math.hypot(tx - x, ty - y);
    const speed = Math.min(420, Math.max(180, dist * 1.1));
    const ang   = Math.atan2(ty - y, tx - x);
    this.vx = Math.cos(ang) * speed;
    this.vy = Math.sin(ang) * speed;
    this.timer  = CONFIG.GRENADE.fuseTime;
    this._spinT = 0;
    this.explode = false;
  }
  update(dt, gameMap) {
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vx *= Math.pow(0.18, dt); this.vy *= Math.pow(0.18, dt);
    this._spinT += dt * 7;
    this.timer -= dt;
    if (this.timer <= 0 || gameMap.isBlocked(this.x, this.y)) {
      this.explode = true; this.dead = true;
    }
  }
  render(ctx) {
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this._spinT);
    ctx.fillStyle = '#3a5c3a'; ctx.strokeStyle = '#88CC88'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (this.timer < 0.8 && Math.floor(this.timer / 0.12) % 2 === 0) {
      ctx.fillStyle = '#FF4400';
      ctx.beginPath(); ctx.arc(0, -7, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

// ─── Salesperson ─────────────────────────────────────────────────────────────
class Salesperson {
  constructor(x, y, color = '#FFAA55', label = 'DEALER') {
    this.x = x; this.y = y; this.color = color; this.label = label; this.radius = 16;
    this._waveT = 0;
  }
  update(dt) { this._waveT += dt * 1.4; }
  render(ctx) {
    const sway = Math.sin(this._waveT) * 2;
    ctx.save(); ctx.translate(this.x + sway, this.y);
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.roundRect(-10, -26, 20, 24, 3); ctx.fill();
    ctx.fillStyle = '#FFDDBB';
    ctx.beginPath(); ctx.arc(0, -34, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.shadowColor = this.color; ctx.shadowBlur = 6;
    ctx.font = 'bold 7px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.fillText(this.label, 0, -50);
    ctx.shadowBlur = 0; ctx.restore();
  }
}

// ─── CityNPC ──────────────────────────────────────────────────────────────────
class CityNPC {
  constructor(x, y, map) {
    this.x = x; this.y = y; this._map = map;
    this.radius = 14;
    this.dead   = false;
    this._color = ['#AADDFF','#FFDDAA','#AAFFCC','#FFAACC','#DDCCFF'][Math.floor(Math.random()*5)];
    this._dir   = Math.random() * Math.PI * 2;
    this._speed = 30 + Math.random() * 25;
    this._turnTimer = 1 + Math.random() * 3;
    this._bobT  = Math.random() * Math.PI * 2;
  }
  update(dt) {
    this._bobT      += dt * 2.5;
    this._turnTimer -= dt;
    if (this._turnTimer <= 0) {
      this._dir = Math.random() * Math.PI * 2;
      this._turnTimer = 1.5 + Math.random() * 3;
    }
    const nx = this.x + Math.cos(this._dir) * this._speed * dt;
    const ny = this.y + Math.sin(this._dir) * this._speed * dt;
    if (!this._map.isBlockedCircle(nx, ny, this.radius)) {
      this.x = nx; this.y = ny;
    } else {
      this._dir += Math.PI * (0.5 + Math.random());
    }
  }
  render(ctx) {
    const bob = Math.sin(this._bobT) * 2;
    ctx.save(); ctx.translate(this.x, this.y + bob);
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 14, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Body
    ctx.fillStyle = this._color;
    ctx.beginPath(); ctx.roundRect(-8, -22, 16, 20, 3); ctx.fill();
    // Head
    ctx.fillStyle = '#FFDDBB';
    ctx.beginPath(); ctx.arc(0, -28, 9, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(-3, -29, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3,  -29, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ANIMAL COMPANION — unique per character, orbits player, attacks nearby enemies
// ══════════════════════════════════════════════════════════════════════════════
class AnimalCompanion {
  constructor(type) {
    this.type          = type;   // 'dog'|'cat'|'wolf'|'raven'|'bear'|'fox'|'salamander'|'spirit'
    this.x             = 0;
    this.y             = 0;
    this.radius        = 10;
    this.hp            = type === 'spirit' ? 50 : 80;
    this.maxHp         = this.hp;
    this.dead          = false;
    this._attackTimer  = 0;
    this._cooldown     = type === 'bear' ? 4.5 : type === 'wolf' ? 2.2 : type === 'salamander' ? 1.8 : type === 'spirit' ? 2.5 : 3.0;
    this._animT        = Math.random() * Math.PI * 2;
    this._orbitAngle   = Math.random() * Math.PI * 2;
    this._followDist   = type === 'spirit' ? 35 : 50;
  }

  update(dt, owner, bots, bullets, particles) {
    if (this.dead) return;
    this._animT += dt;
    // Orbit around owner
    this._orbitAngle += dt * (this.type === 'raven' ? 2.2 : 1.6);
    const tx = owner.x + Math.cos(this._orbitAngle) * this._followDist;
    const ty = owner.y + Math.sin(this._orbitAngle) * this._followDist;
    this.x += (tx - this.x) * 0.14;
    this.y += (ty - this.y) * 0.14;

    // Bear passive heals owner every 4.5s
    if (this.type === 'bear') {
      this._attackTimer -= dt;
      if (this._attackTimer <= 0) {
        if (owner.health < owner.maxHealth) {
          owner.health = Math.min(owner.maxHealth, owner.health + 8);
          particles.push(...Particle.burst(owner.x, owner.y - 20, '#FFAA66', 4, 30, 80, 1, 3, 0.2, 0.6));
        }
        this._attackTimer = this._cooldown;
      }
      return;
    }

    // Salamander: AoE fire burst around self
    if (this.type === 'salamander') {
      this._attackTimer -= dt;
      if (this._attackTimer <= 0) {
        const burnRange = 110;
        let hit = false;
        for (const b of bots) {
          if (b.dead || b.dying) continue;
          if (Math.hypot(b.x - this.x, b.y - this.y) < burnRange) {
            b.takeDamage(38, particles);
            hit = true;
          }
        }
        if (hit || Math.random() < 0.4) {
          for (let i = 0; i < 12; i++) {
            const a = Math.random() * Math.PI * 2, s = rnd(60, 160);
            particles.push(new Particle(this.x, this.y, Math.cos(a)*s, Math.sin(a)*s, i%2===0?'#FF5500':'#FF8800', rnd(3,7), 0.6));
          }
        }
        this._attackTimer = this._cooldown;
      }
      return;
    }

    // Spirit: teleports to nearest enemy, stuns + deals damage
    if (this.type === 'spirit') {
      this._attackTimer -= dt;
      if (this._attackTimer <= 0) {
        let nearest = null, nearDist = 280;
        for (const b of bots) {
          if (b.dead || b.dying) continue;
          const d = Math.hypot(b.x - owner.x, b.y - owner.y);
          if (d < nearDist) { nearest = b; nearDist = d; }
        }
        if (nearest) {
          this.x = nearest.x + rnd(-8, 8);
          this.y = nearest.y + rnd(-8, 8);
          nearest.takeDamage(52, particles);
          nearest._frozen = (nearest._frozen || 0) + 1.2; // brief stun
          for (let i = 0; i < 10; i++) {
            const a = Math.random() * Math.PI * 2;
            particles.push(new Particle(nearest.x, nearest.y, Math.cos(a)*rnd(40,120), Math.sin(a)*rnd(40,120), '#BB66FF', rnd(2,5), 0.7));
          }
          this._attackTimer = this._cooldown;
        } else {
          this._attackTimer = 0.5;
        }
      }
      return;
    }

    // Others attack nearest enemy with projectile
    this._attackTimer -= dt;
    if (this._attackTimer <= 0) {
      let nearest = null, nearDist = 240;
      for (const b of bots) {
        if (b.dead || b.dying) continue;
        const d = Math.hypot(b.x - owner.x, b.y - owner.y);
        if (d < nearDist) { nearest = b; nearDist = d; }
      }
      if (nearest) {
        const ang  = Math.atan2(nearest.y - this.y, nearest.x - this.x);
        const dmg  = this.type === 'wolf' ? 55 : this.type === 'dog' ? 45 : this.type === 'fox' ? 38 : 28;
        const spd  = this.type === 'raven' ? 520 : 400;
        const col  = { dog:'#FF8844', cat:'#44EEFF', wolf:'#AAAAFF', raven:'#CC44FF', fox:'#FFAA44' }[this.type] || '#FFDDAA';
        const b2   = new Bullet(this.x, this.y, ang, spd, dmg, true, col);
        b2._isCompanionBullet = true;
        bullets.push(b2);
        particles.push(...Particle.burst(this.x, this.y, col, 3, 40, 100, 1, 3, 0.05, 0.12));
        this._attackTimer = this._cooldown;
      } else {
        this._attackTimer = 0.5;
      }
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
  }

  render(ctx) {
    if (this.dead) return;
    const bob = Math.sin(this._animT * (this.type === 'raven' ? 10 : this.type === 'spirit' ? 6 : 4)) * (this.type === 'spirit' ? 4 : 2);
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    switch (this.type) {
      case 'dog':        this._renderDog(ctx);        break;
      case 'cat':        this._renderCat(ctx);        break;
      case 'wolf':       this._renderWolf(ctx);       break;
      case 'raven':      this._renderRaven(ctx);      break;
      case 'bear':       this._renderBear(ctx);       break;
      case 'fox':        this._renderFox(ctx);        break;
      case 'salamander': this._renderSalamander(ctx); break;
      case 'spirit':     this._renderSpirit(ctx);     break;
    }
    ctx.restore();
    // HP bar when damaged
    if (this.hp < this.maxHp) {
      const bw = 28, bh = 3, bx2 = this.x - bw/2, by2 = this.y - 18;
      ctx.fillStyle = '#111'; ctx.fillRect(bx2, by2, bw, bh);
      const pct = this.hp / this.maxHp;
      ctx.fillStyle = pct > 0.5 ? '#44FF88' : '#FF4444';
      ctx.fillRect(bx2, by2, bw * pct, bh);
    }
  }

  _renderDog(ctx) {
    ctx.fillStyle = '#CC8844'; ctx.shadowColor = '#FF8844'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.ellipse(0, 2, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8, -3, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#BB7733';
    ctx.beginPath(); ctx.ellipse(5, -9, 3, 5, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(11, -9, 3, 5, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(10, -4, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#CC8844'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-9, 2); ctx.quadraticCurveTo(-14, -8, -10, -12); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  _renderCat(ctx) {
    ctx.fillStyle = '#8888AA'; ctx.shadowColor = '#44EEFF'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.ellipse(0, 2, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, -3, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6666AA';
    ctx.beginPath(); ctx.moveTo(3, -8); ctx.lineTo(5, -14); ctx.lineTo(8, -8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(9, -8); ctx.lineTo(12, -14); ctx.lineTo(14, -8); ctx.fill();
    ctx.fillStyle = '#44EEFF';
    ctx.beginPath(); ctx.ellipse(5, -4, 1.5, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(9, -4, 1.5, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8888AA'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-8, 2); ctx.quadraticCurveTo(-14, -5, -10, -12); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  _renderWolf(ctx) {
    ctx.fillStyle = '#8899CC'; ctx.shadowColor = '#AAAAFF'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(9, -3, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#CCCCFF'; ctx.beginPath(); ctx.arc(9, -2, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7788BB';
    ctx.beginPath(); ctx.moveTo(6, -9); ctx.lineTo(9, -17); ctx.lineTo(12, -9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(12, -9); ctx.lineTo(16, -17); ctx.lineTo(18, -9); ctx.fill();
    ctx.fillStyle = '#FF4466'; ctx.beginPath(); ctx.arc(11, -3, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8899CC'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(-18, -6, -14, -14); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  _renderRaven(ctx) {
    const wing = Math.sin(this._animT * 9) * 5;
    ctx.fillStyle = '#221133'; ctx.shadowColor = '#CC44FF'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 5, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#331144';
    ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-15, -3 - wing); ctx.lineTo(-10, 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(15, -3 - wing); ctx.lineTo(10, 4); ctx.fill();
    ctx.fillStyle = '#221133'; ctx.beginPath(); ctx.arc(6, -3, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#AAAAAA'; ctx.beginPath(); ctx.moveTo(9, -3); ctx.lineTo(14, -2); ctx.lineTo(9, -1); ctx.fill();
    ctx.fillStyle = '#CC44FF'; ctx.beginPath(); ctx.arc(7, -4, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  _renderBear(ctx) {
    ctx.fillStyle = '#886644'; ctx.shadowColor = '#FFAA66'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.ellipse(0, 2, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -4, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#775533';
    ctx.beginPath(); ctx.arc(3, -11, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(11, -11, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#AA7755';
    ctx.beginPath(); ctx.arc(3, -11, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(11, -11, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(4, -5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(10, -5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFAA44'; ctx.beginPath(); ctx.arc(4, -5, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(10, -5, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#AA8866'; ctx.beginPath(); ctx.ellipse(7, -1, 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#331100'; ctx.beginPath(); ctx.arc(7, -1, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  _renderFox(ctx) {
    ctx.fillStyle = '#EE8833'; ctx.shadowColor = '#FFAA44'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.ellipse(0, 2, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -3, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#DD6622';
    ctx.beginPath(); ctx.moveTo(3, -9); ctx.lineTo(6, -18); ctx.lineTo(9, -9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, -9); ctx.lineTo(14, -18); ctx.lineTo(17, -9); ctx.fill();
    ctx.fillStyle = '#FFCCAA';
    ctx.beginPath(); ctx.moveTo(4, -9); ctx.lineTo(6, -14); ctx.lineTo(8, -9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(11, -9); ctx.lineTo(14, -14); ctx.lineTo(16, -9); ctx.fill();
    ctx.fillStyle = '#66AA33';
    ctx.beginPath(); ctx.arc(5, -4, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(10, -4, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(5, -4, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(10, -4, 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFEECC'; ctx.beginPath(); ctx.ellipse(8, -1, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
    const tailSway = Math.sin(this._animT * 3) * 5;
    ctx.strokeStyle = '#EE8833'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-9, 2); ctx.quadraticCurveTo(-18 + tailSway, -5, -16 + tailSway, -14); ctx.stroke();
    ctx.strokeStyle = '#FFEECC'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-9, 2); ctx.quadraticCurveTo(-18 + tailSway, -5, -16 + tailSway, -14); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  _renderSalamander(ctx) {
    const flicker = Math.sin(this._animT * 9) * 2;
    // Body
    ctx.fillStyle = '#CC3300'; ctx.shadowColor = '#FF5500'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.ellipse(0, 2, 11, 7, 0.1, 0, Math.PI * 2); ctx.fill();
    // Head
    ctx.fillStyle = '#DD4400';
    ctx.beginPath(); ctx.ellipse(8, -3, 7, 5, -0.2, 0, Math.PI * 2); ctx.fill();
    // Snout
    ctx.fillStyle = '#BB3300';
    ctx.beginPath(); ctx.ellipse(14, -2, 4, 3, -0.1, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#FFDD00'; ctx.shadowColor = '#FFAA00'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(10, -5, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(10, -5, 1, 0, Math.PI * 2); ctx.fill();
    // Dorsal spines
    ctx.strokeStyle = '#FF6600'; ctx.lineWidth = 1.5; ctx.shadowColor = '#FF4400'; ctx.shadowBlur = 8;
    for (let i = 0; i < 4; i++) {
      const sx = -4 + i * 3.5;
      ctx.beginPath(); ctx.moveTo(sx, -2); ctx.lineTo(sx + 1, -7 - flicker); ctx.stroke();
    }
    // Tail
    ctx.strokeStyle = '#CC3300'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(-10, 3); ctx.quadraticCurveTo(-20, 10, -16, -6); ctx.stroke();
    // Flame tongue
    ctx.strokeStyle = '#FFDD00'; ctx.lineWidth = 1.5; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.moveTo(17, -2); ctx.lineTo(21 + flicker, -4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(17, -2); ctx.lineTo(21 + flicker, 0); ctx.stroke();
  }

  _renderSpirit(ctx) {
    const pulse = Math.sin(this._animT * 5) * 0.15;
    // Outer aura
    ctx.save(); ctx.globalAlpha = 0.18 + pulse;
    ctx.fillStyle = '#9922FF'; ctx.shadowColor = '#AA44FF'; ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Translucent body
    ctx.save(); ctx.globalAlpha = 0.72 + pulse;
    ctx.fillStyle = '#AA44FF'; ctx.shadowColor = '#CC66FF'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.ellipse(0, -1, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
    // Wispy tails
    ctx.strokeStyle = '#CC66FF'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4, 8); ctx.quadraticCurveTo(-10, 16, -6, 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, 8); ctx.quadraticCurveTo(10, 16, 6, 20); ctx.stroke();
    ctx.restore();
    // White glowing eyes
    ctx.save(); ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#FFFFFF'; ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(-3, -3, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3, -3, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // 3 orbiting sparks
    for (let i = 0; i < 3; i++) {
      const a = this._animT * 2.5 + (i * Math.PI * 2 / 3);
      ctx.save(); ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#CC44FF'; ctx.shadowColor = '#CC44FF'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(Math.cos(a) * 14, Math.sin(a) * 9, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// AMBIENT CAR — NPC traffic cars that drive on roads
// ══════════════════════════════════════════════════════════════════════════════
class AmbientCar {
  constructor(x, y, angle, color, bodyStyle) {
    this.x          = x;
    this.y          = y;
    this.angle      = angle;
    this.color      = color;
    this.bodyStyle  = bodyStyle || 0;  // 0=sedan 1=suv 2=sports 3=van 4=taxi
    this.speed      = 75 + Math.random() * 55;
    this.dead       = false;
    this.radius     = 20;
    this.width      = [30, 34, 26, 38, 30][this.bodyStyle] || 30;
    this.height     = [18, 22, 13, 22, 18][this.bodyStyle] || 18;
    this._turnTimer = 2 + Math.random() * 4;
    this._lightT    = 0;
    this._mapW      = 0;
    this._mapH      = 0;
  }

  update(dt, gameMap) {
    this._lightT    += dt;
    this._turnTimer -= dt;
    const nx = this.x + Math.cos(this.angle) * this.speed * dt;
    const ny = this.y + Math.sin(this.angle) * this.speed * dt;

    if (!gameMap.isBlocked(nx, this.y) && !gameMap.isBlocked(nx, ny)) {
      this.x = nx;
    } else {
      // Hit obstacle — turn to snap to 90° grid angles
      const angles = [0, Math.PI/2, Math.PI, -Math.PI/2];
      const candidates = angles.filter(a => {
        const tx2 = this.x + Math.cos(a) * this.speed * 0.2;
        const ty2 = this.y + Math.sin(a) * this.speed * 0.2;
        return !gameMap.isBlocked(tx2, ty2);
      });
      if (candidates.length > 0)
        this.angle = candidates[Math.floor(Math.random() * candidates.length)];
    }
    if (!gameMap.isBlocked(this.x, ny)) {
      this.y = ny;
    }

    // Random turn at intersections
    if (this._turnTimer <= 0) {
      const roadAngles = [0, Math.PI/2, Math.PI, -Math.PI/2];
      this.angle = roadAngles[Math.floor(Math.random() * roadAngles.length)];
      this._turnTimer = 2 + Math.random() * 5;
    }

    // Kill if out of map bounds
    const maxW = gameMap.W * gameMap.S, maxH = gameMap.H * gameMap.S;
    if (this.x < -40 || this.y < -40 || this.x > maxW + 40 || this.y > maxH + 40) this.dead = true;
  }

  render(ctx) {
    const w = this.width, h = this.height;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);

    // Shadow
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(3, 5, w * 0.48, h * 0.38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Body
    ctx.shadowColor = this.color; ctx.shadowBlur = 5;
    ctx.fillStyle   = this.color;
    ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 4); ctx.fill();

    // Windshield / cabin
    ctx.shadowBlur = 0;
    if (this.bodyStyle === 2) {  // sports — low wedge
      ctx.fillStyle = 'rgba(0,200,255,0.32)';
      ctx.beginPath(); ctx.roundRect(-w/2 + 7, -h/2 + 2, w - 14, h - 6, 2); ctx.fill();
    } else if (this.bodyStyle === 3) {  // van — cab + cargo
      ctx.fillStyle = 'rgba(0,180,255,0.28)';
      ctx.beginPath(); ctx.roundRect(-w/2 + 4, -h/2 + 2, w * 0.38, h / 2, 2); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(0,200,255,0.28)';
      ctx.beginPath(); ctx.roundRect(-w/2 + 5, -h/2 + 2, w - 10, h / 2, 2); ctx.fill();
    }

    // Taxi sign
    if (this.bodyStyle === 4) {
      ctx.fillStyle = '#FFCC00'; ctx.shadowColor = '#FFCC00'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.roundRect(-8, -h/2 - 5, 16, 5, 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Wheels
    ctx.fillStyle = '#1a1a1a';
    const ww = 9, wh = 5;
    const wx2 = w/2 - 3, wy2 = h/2;
    for (const [sx, sy] of [[-wx2, -wy2 + 1], [-wx2, wy2 - 6], [wx2 - ww, -wy2 + 1], [wx2 - ww, wy2 - 6]]) {
      ctx.beginPath(); ctx.roundRect(sx, sy, ww, wh, 1.5); ctx.fill();
    }

    // Headlights (front = negative y after rotation)
    const blink = this._lightT % 1 < 0.5 ? 1 : 0.7;
    ctx.fillStyle = `rgba(255,255,200,${blink})`; ctx.shadowColor = '#FFFF88'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(-w/2 + 5, -h/2 + 4, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-w/2 + 5,  h/2 - 4, 2.5, 0, Math.PI * 2); ctx.fill();

    // Taillights
    ctx.fillStyle = '#FF1100'; ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(w/2 - 5, -h/2 + 4, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(w/2 - 5,  h/2 - 4, 2, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }
}
