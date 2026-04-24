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
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
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
    this.type     = type; // 'blood' | 'zombie_blood' | 'ice_blood' | 'water_blood' | 'hole'
    this.lifetime = 15.0;
    this.dead     = false;
    const isZBlood = type === 'zombie_blood';
    const isIceBlood = type === 'ice_blood';
    const isWaterBlood = type === 'water_blood';
    const isBloodType = type === 'blood' || isZBlood || isIceBlood || isWaterBlood;
    const s = isBloodType ? rnd(isZBlood ? 16 : isIceBlood ? 14 : isWaterBlood ? 15 : 12, isZBlood ? 28 : isIceBlood ? 24 : isWaterBlood ? 26 : 22) : rnd(3, 6);
    this._size   = s;
    this._splats = [];
    const n = isZBlood ? Math.floor(rnd(5, 10)) : isIceBlood ? Math.floor(rnd(4, 8)) : isWaterBlood ? Math.floor(rnd(5, 9)) : type === 'blood' ? Math.floor(rnd(3, 7)) : 1;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * s * (isZBlood ? 1.1 : isIceBlood ? 0.8 : isWaterBlood ? 0.9 : 0.6);
      this._splats.push({ dx: Math.cos(a)*d, dy: Math.sin(a)*d, r: rnd(s*0.35, s*0.75) });
    }
    // Ice blood: add ice crystal shards
    if (isIceBlood) {
      this._crystals = [];
      const nc = Math.floor(rnd(3, 6));
      for (let i = 0; i < nc; i++) {
        this._crystals.push({
          angle: Math.random() * Math.PI * 2,
          len: rnd(s * 0.4, s * 0.9),
          width: rnd(1.5, 3)
        });
      }
    }
    // Water blood: add bubble effects
    if (isWaterBlood) {
      this._bubbles = [];
      const nb = Math.floor(rnd(4, 8));
      for (let i = 0; i < nb; i++) {
        const ba = Math.random() * Math.PI * 2;
        const bd = Math.random() * s * 0.8;
        this._bubbles.push({
          dx: Math.cos(ba) * bd,
          dy: Math.sin(ba) * bd,
          r: rnd(2, 5)
        });
      }
    }
  }

  update(dt) { this.lifetime -= dt; if (this.lifetime <= 0) this.dead = true; }

  render(ctx) {
    const alpha = Math.min(1, this.lifetime / 3.0) * 0.78;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (this.type === 'blood' || this.type === 'zombie_blood') {
      ctx.fillStyle = this.type === 'zombie_blood' ? '#1a4a04' : '#3a0000';
      for (const s of this._splats) {
        ctx.beginPath(); ctx.arc(this.x + s.dx, this.y + s.dy, s.r, 0, Math.PI * 2); ctx.fill();
      }
    } else if (this.type === 'ice_blood') {
      // Ice/snow splatter - cyan-white crystalline effect
      // Base snow splat
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this._size);
      grad.addColorStop(0, 'rgba(200, 240, 255, 0.9)');
      grad.addColorStop(0.5, 'rgba(136, 221, 255, 0.7)');
      grad.addColorStop(1, 'rgba(100, 180, 220, 0.3)');
      ctx.fillStyle = grad;
      for (const s of this._splats) {
        ctx.beginPath(); ctx.arc(this.x + s.dx, this.y + s.dy, s.r, 0, Math.PI * 2); ctx.fill();
      }
      // Ice crystal shards
      ctx.strokeStyle = 'rgba(200, 245, 255, 0.85)';
      ctx.shadowColor = '#88DDFF';
      ctx.shadowBlur = 4;
      for (const c of this._crystals) {
        ctx.lineWidth = c.width;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + Math.cos(c.angle) * c.len, this.y + Math.sin(c.angle) * c.len);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      // Sparkle highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath(); ctx.arc(this.x - this._size * 0.2, this.y - this._size * 0.2, this._size * 0.15, 0, Math.PI * 2); ctx.fill();
    } else if (this.type === 'water_blood') {
      // Water/ocean splatter - blue watery effect with bubbles
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this._size);
      grad.addColorStop(0, 'rgba(0, 150, 200, 0.8)');
      grad.addColorStop(0.4, 'rgba(0, 100, 180, 0.6)');
      grad.addColorStop(1, 'rgba(0, 60, 120, 0.2)');
      ctx.fillStyle = grad;
      for (const s of this._splats) {
        ctx.beginPath(); ctx.arc(this.x + s.dx, this.y + s.dy, s.r, 0, Math.PI * 2); ctx.fill();
      }
      // Bubble effects
      ctx.strokeStyle = 'rgba(150, 220, 255, 0.7)';
      ctx.lineWidth = 1;
      for (const b of this._bubbles) {
        ctx.beginPath();
        ctx.arc(this.x + b.dx, this.y + b.dy, b.r, 0, Math.PI * 2);
        ctx.stroke();
        // Bubble highlight
        ctx.fillStyle = 'rgba(200, 240, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(this.x + b.dx - b.r * 0.3, this.y + b.dy - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      // Water ripple
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(this.x, this.y, this._size * 0.8, 0, Math.PI * 2); ctx.stroke();
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
      case 'blizzard': {
        // Fine snow layer
        for (let i = 0; i < 220; i++)
          this._p.push({ x: Math.random()*W*1.3-W*0.15, y: Math.random()*H, spd: rnd(70,190), r: rnd(1.2,3.0), a: rnd(0.25,0.70), drift: rnd(30,80), big: false });
        // Large drifting flakes
        for (let i = 0; i < 38; i++)
          this._p.push({ x: Math.random()*W, y: Math.random()*H, spd: rnd(28,70), r: rnd(3.5,7.5), a: rnd(0.12,0.38), drift: rnd(15,50), big: true });
        break;
      }
      case 'electric': {
        // Electrical sparks — fast-moving streaks
        for (let i = 0; i < 55; i++) {
          const ml = rnd(0.12, 0.45);
          this._p.push({ type: 'spark', x: Math.random()*W, y: Math.random()*H,
            vx: rnd(-220, 220), vy: rnd(-50, 50),
            len: rnd(6, 22), a: rnd(0.2, 0.75),
            life: Math.random()*ml, maxLife: ml });
        }
        // Horizontal scan-lines
        for (let i = 0; i < 10; i++)
          this._p.push({ type: 'scanline', y: Math.random()*H, a: rnd(0.03, 0.09), spd: rnd(40, 160) });
        break;
      }
      case 'jungle_rain': {
        // Heavy tropical rain droplets
        for (let i = 0; i < 180; i++)
          this._p.push({ type: 'rain', x: Math.random()*W*1.2-W*0.1, y: Math.random()*H, spd: rnd(400,750), len: rnd(8,16), a: rnd(0.18,0.48) });
        // Drifting mist patches
        for (let i = 0; i < 10; i++)
          this._p.push({ type: 'fog', x: Math.random()*W, y: Math.random()*H, r: rnd(150,350), spd: rnd(8,22), a: rnd(0.03,0.09), dir: Math.random()*Math.PI*2 });
        // Fireflies
        for (let i = 0; i < 14; i++)
          this._p.push({ type: 'firefly', x: Math.random()*W, y: Math.random()*H, spd: rnd(12,30), phase: Math.random()*Math.PI*2, dir: Math.random()*Math.PI*2 });
        break;
      }
      case 'starfield': {
        // Static distant stars (twinkle in place)
        for (let i = 0; i < 200; i++)
          this._p.push({ type:'star', x:Math.random()*W, y:Math.random()*H, r:rnd(0.5,2.0), a:rnd(0.3,0.95), phase:Math.random()*Math.PI*2 });
        // Nebula wisps — slow drifting colored blobs
        const nebCols = ['#6622AA','#AA2266','#2244BB','#4488CC'];
        for (let i = 0; i < 8; i++)
          this._p.push({ type:'nebula', x:Math.random()*W, y:Math.random()*H, r:rnd(80,200), col:nebCols[i%4], a:rnd(0.025,0.07), dx:rnd(-8,8), dy:rnd(-5,5) });
        // Shooting stars (respawn on exit)
        for (let i = 0; i < 4; i++)
          this._p.push({ type:'streak', x:Math.random()*W, y:Math.random()*H, vx:rnd(200,500), vy:rnd(-80,80), len:rnd(40,110), a:rnd(0.55,0.9), life:Math.random(), maxLife:rnd(0.4,1.1) });
        break;
      }
      case 'sky_breeze': {
        // Drifting cloud wisps — kept small (5 instead of 10) for performance;
        // each wisp draws 3 ellipses so fewer wisps matters a lot at 60fps
        for (let i = 0; i < 5; i++)
          this._p.push({ type:'cloud_wisp', x:Math.random()*W, y:Math.random()*H*0.65,
            vx:rnd(10,24), vy:rnd(-2,2), size:rnd(44,110), a:rnd(0.07,0.16), phase:Math.random()*Math.PI*2 });
        // Wind streaks — fast thin horizontal lines (cheap fillRect)
        for (let i = 0; i < 14; i++)
          this._p.push({ type:'wind_streak', x:Math.random()*W, y:Math.random()*H,
            vx:rnd(70,150), len:rnd(24,72), a:rnd(0.05,0.12) });
        // Distant birds — tiny V-shapes crossing the screen
        for (let i = 0; i < 5; i++)
          this._p.push({ type:'sky_bird', x:Math.random()*W, y:Math.random()*H*0.55,
            vx:rnd(28,60), vy:rnd(-3,3), size:rnd(2,4), phase:Math.random()*Math.PI*2 });
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
      case 'blizzard': {
        for (const p of this._p) {
          p.y += p.spd * dt;
          p.x += p.drift * dt;
          // Subtle horizontal sway
          p.x += Math.sin(p.y * 0.012 + p.drift) * (p.big ? 14 : 6) * dt;
          if (p.y > H + p.r*2) { p.y = -p.r*2; p.x = Math.random()*W*1.3-W*0.15; }
          if (p.x > W + 50) p.x = -50;
          if (p.x < -50) p.x = W + 50;
        }
        break;
      }
      case 'jungle_rain': {
        for (const p of this._p) {
          if (p.type === 'rain') {
            p.y += p.spd * dt; p.x += p.spd * 0.08 * dt;
            if (p.y > H + 30) { p.y = -30; p.x = Math.random()*W*1.2-W*0.1; }
            if (p.x > W + 20) p.x = -20;
          } else if (p.type === 'fog') {
            p.x += Math.cos(p.dir)*p.spd*dt; p.y += Math.sin(p.dir)*p.spd*dt;
            if (p.x < -p.r*2) p.x = W+p.r; if (p.x > W+p.r*2) p.x = -p.r;
            if (p.y < -p.r*2) p.y = H+p.r; if (p.y > H+p.r*2) p.y = -p.r;
          } else if (p.type === 'firefly') {
            p.phase += dt * 3.5;
            p.x += Math.cos(p.dir + Math.sin(p.phase) * 0.8) * p.spd * dt;
            p.y += Math.sin(p.dir + Math.cos(p.phase) * 0.6) * p.spd * dt * 0.5;
            if (p.x < -20) p.x = W+20; if (p.x > W+20) p.x = -20;
            if (p.y < -20) p.y = H+20; if (p.y > H+20) p.y = -20;
          }
        }
        break;
      }
      case 'electric': {
        for (const p of this._p) {
          if (p.type === 'spark') {
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0 || p.x < -30 || p.x > W + 30 || p.y < -20 || p.y > H + 20) {
              p.x = Math.random()*W; p.y = Math.random()*H;
              p.vx = rnd(-220, 220); p.vy = rnd(-50, 50);
              p.maxLife = rnd(0.12, 0.45);
              p.life = p.maxLife;
              p.a = rnd(0.2, 0.75); p.len = rnd(6, 22);
            }
          } else if (p.type === 'scanline') {
            p.y += p.spd * dt;
            if (p.y > H + 2) p.y = -2;
          }
        }
        break;
      }
      case 'starfield': {
        for (const p of this._p) {
          if (p.type === 'star') {
            p.phase += dt * rnd(0.4, 1.6);
          } else if (p.type === 'nebula') {
            p.x += p.dx * dt; p.y += p.dy * dt;
            if (p.x < -p.r) p.x = W+p.r; if (p.x > W+p.r) p.x = -p.r;
            if (p.y < -p.r) p.y = H+p.r; if (p.y > H+p.r) p.y = -p.r;
          } else if (p.type === 'streak') {
            p.life -= dt;
            p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.life <= 0 || p.x > W + 130 || p.y < -40 || p.y > H + 40) {
              p.x = -20; p.y = Math.random()*H;
              p.maxLife = rnd(0.4, 1.1); p.life = p.maxLife;
              p.vx = rnd(200,500); p.vy = rnd(-80,80); p.len = rnd(40,110); p.a = rnd(0.55,0.9);
            }
          }
        }
        break;
      }
      case 'sky_breeze': {
        for (const p of this._p) {
          p.x += p.vx * dt;
          if (p.type === 'cloud_wisp') {
            p.y  += p.vy * dt; p.phase += dt * 0.25;
            if (p.x > W + 130) { p.x = -130; p.y = Math.random()*H*0.65; }
          } else if (p.type === 'wind_streak') {
            if (p.x > W + 80) { p.x = -p.len; p.y = Math.random()*H; }
          } else if (p.type === 'sky_bird') {
            p.phase += dt * 2.2; p.y += Math.sin(p.phase) * 5 * dt;
            if (p.x > W + 50) { p.x = -50; p.y = Math.random()*H*0.55; }
          }
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
        // Flat soft fog patches — no radialGradient per particle
        ctx.fillStyle = 'rgba(200,220,240,0.55)';
        for (const p of this._p) {
          ctx.globalAlpha = p.a * 0.55;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = 'rgba(0,18,28,1)';
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
        ctx.restore(); break;
      }
      case 'smoke': {
        ctx.save();
        ctx.fillStyle = 'rgba(75,55,35,0.5)';
        for (const p of this._p) {
          ctx.globalAlpha = p.a * 0.45;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore(); break;
      }
      case 'neon_haze': {
        ctx.save();
        for (const p of this._p) {
          // Outer glow ring with globalAlpha instead of radialGradient
          ctx.globalAlpha = p.a * 0.22;
          ctx.fillStyle = p.col;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
          // Bright core
          ctx.globalAlpha = p.a * 0.7;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.35, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore(); break;
      }
      case 'blizzard': {
        ctx.save();
        // Fine snow — solid white dots
        ctx.fillStyle = 'rgba(230,245,255,0.92)';
        for (const p of this._p) {
          if (p.big) continue;
          ctx.globalAlpha = p.a;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
        }
        // Large flakes — soft glow
        for (const p of this._p) {
          if (!p.big) continue;
          ctx.globalAlpha = p.a * 0.55;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.5);
          g.addColorStop(0, 'rgba(200,230,255,1)'); g.addColorStop(1, 'rgba(180,220,255,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI*2); ctx.fill();
          // Core bright dot
          ctx.globalAlpha = p.a;
          ctx.fillStyle = 'rgba(240,250,255,0.95)';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.55, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // Cold blue ground tint
        ctx.fillStyle = 'rgba(180,215,255,0.055)'; ctx.fillRect(0, 0, W, H);
        // Vignette — darker cold edges
        const vg = ctx.createRadialGradient(W/2, H/2, H*0.22, W/2, H/2, H*0.88);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(4,14,30,0.28)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
        ctx.restore(); break;
      }
      case 'electric': {
        ctx.save();
        // Scan lines — thin horizontal bands
        for (const p of this._p) {
          if (p.type !== 'scanline') continue;
          ctx.globalAlpha = p.a;
          ctx.fillStyle = 'rgba(0,210,255,1)';
          ctx.fillRect(0, p.y, W, 1);
        }
        // Electrical sparks
        ctx.lineWidth = 1.2;
        for (const p of this._p) {
          if (p.type !== 'spark') continue;
          const fade = p.maxLife > 0 ? (p.life / p.maxLife) : 1;
          ctx.globalAlpha = p.a * fade;
          ctx.strokeStyle = (p.len % 3 === 0) ? 'rgba(0,255,200,1)' : 'rgba(0,200,255,1)';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.055, p.y - p.vy * 0.055);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // Subtle electric-blue tint
        ctx.fillStyle = 'rgba(0,20,40,0.07)'; ctx.fillRect(0, 0, W, H);
        // Vignette
        const vg2 = ctx.createRadialGradient(W/2, H/2, H*0.25, W/2, H/2, H*0.9);
        vg2.addColorStop(0, 'rgba(0,0,0,0)'); vg2.addColorStop(1, 'rgba(0,10,25,0.28)');
        ctx.fillStyle = vg2; ctx.fillRect(0, 0, W, H);
        ctx.restore(); break;
      }
      case 'jungle_rain': {
        ctx.save();
        // Rain droplets
        ctx.strokeStyle = 'rgba(140,180,160,0.55)'; ctx.lineWidth = 0.9;
        for (const p of this._p) {
          if (p.type !== 'rain') continue;
          ctx.globalAlpha = p.a;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.len*0.08, p.y + p.len); ctx.stroke();
        }
        // Mist patches
        ctx.fillStyle = 'rgba(180,220,180,0.5)';
        for (const p of this._p) {
          if (p.type !== 'fog') continue;
          ctx.globalAlpha = p.a * 0.45;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
        }
        // Fireflies
        for (const p of this._p) {
          if (p.type !== 'firefly') continue;
          const fb = Math.sin(p.phase) * 0.5 + 0.5;
          ctx.globalAlpha = fb * 0.9;
          ctx.fillStyle = '#FFFF44';
          ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = fb * 0.35;
          ctx.fillStyle = '#FFFFAA';
          ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        // Green jungle tint
        ctx.fillStyle = 'rgba(20,50,10,0.06)'; ctx.fillRect(0, 0, W, H);
        // Vignette
        const jvg = ctx.createRadialGradient(W/2, H/2, H*0.28, W/2, H/2, H*0.92);
        jvg.addColorStop(0, 'rgba(0,0,0,0)'); jvg.addColorStop(1, 'rgba(5,18,5,0.32)');
        ctx.fillStyle = jvg; ctx.fillRect(0, 0, W, H);
        ctx.restore(); break;
      }
      case 'starfield': {
        ctx.save();
        // Deep space base tint
        ctx.fillStyle = 'rgba(0,0,14,0.20)'; ctx.fillRect(0, 0, W, H);
        // Nebula wisps
        for (const p of this._p) {
          if (p.type !== 'nebula') continue;
          ctx.globalAlpha = p.a * 0.38;
          ctx.fillStyle = p.col;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
        }
        // Stars — twinkle via alpha and size
        for (const p of this._p) {
          if (p.type !== 'star') continue;
          const tw = Math.sin(p.phase) * 0.35 + 0.65;
          ctx.globalAlpha = p.a * tw;
          ctx.fillStyle = p.r > 1.5 ? '#AADDFF' : '#FFFFFF';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * tw, 0, Math.PI*2); ctx.fill();
        }
        // Shooting stars
        ctx.lineWidth = 1.8;
        for (const p of this._p) {
          if (p.type !== 'streak') continue;
          const fade = p.maxLife > 0 ? (p.life / p.maxLife) : 1;
          ctx.globalAlpha = p.a * fade;
          ctx.strokeStyle = '#EEEEFF';
          const spd = Math.hypot(p.vx, p.vy) || 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx/spd*p.len, p.y - p.vy/spd*p.len);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // Edge vignette — deepen space at corners
        const svg = ctx.createRadialGradient(W/2, H/2, H*0.20, W/2, H/2, H*0.90);
        svg.addColorStop(0, 'rgba(0,0,0,0)'); svg.addColorStop(1, 'rgba(2,0,20,0.40)');
        ctx.fillStyle = svg; ctx.fillRect(0, 0, W, H);
        ctx.restore(); break;
      }
      case 'sky_breeze': {
        ctx.save();
        for (const p of this._p) {
          if (p.type === 'cloud_wisp') {
            // Single oval cloud — 1 op (was 3)
            ctx.globalAlpha = p.a * (0.7 + Math.sin(p.phase) * 0.2);
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size, p.size*0.34, 0, 0, Math.PI*2); ctx.fill();
          } else if (p.type === 'wind_streak') {
            ctx.globalAlpha = p.a;
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.fillRect(p.x, p.y, p.len, 1);
            if (p.len > 38) ctx.fillRect(p.x + 8, p.y + 2, p.len * 0.50, 0.5);
          } else if (p.type === 'sky_bird') {
            // Tiny V-shaped bird silhouette
            const sz = p.size;
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = '#1a2838';
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - sz*1.6, p.y - sz*0.7); ctx.lineTo(p.x - sz*0.5, p.y + sz*0.2); ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + sz*1.6, p.y - sz*0.7); ctx.lineTo(p.x + sz*0.5, p.y + sz*0.2); ctx.closePath(); ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
        // Soft atmospheric haze — brighter at top, slight blue tint
        const skyHaze = ctx.createLinearGradient(0, 0, 0, H);
        skyHaze.addColorStop(0,   'rgba(180,220,255,0.07)');
        skyHaze.addColorStop(0.5, 'rgba(135,195,235,0.04)');
        skyHaze.addColorStop(1,   'rgba(90,155,200,0.10)');
        ctx.fillStyle = skyHaze; ctx.fillRect(0, 0, W, H);
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
    // Trail — no save/restore per point for perf
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      ctx.globalAlpha = (i / this.trail.length) * 0.28;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Core bullet — flat fill, no shadowBlur, no radialGradient
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * 0.42, 0, Math.PI * 2); ctx.fill();
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
      cash:   { color: '#00FFCC', glow: '#00CCAA', icon: '⬢' },
    }[this.type] || { color: '#FFFFFF', glow: '#AAAAAA', icon: '?' };

    // Outer glow ring via globalAlpha instead of shadowBlur
    ctx.globalAlpha = alpha * (0.28 + pulse * 0.15);
    ctx.fillStyle   = cfg.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, r + 5 + pulse * 2, 0, Math.PI * 2); ctx.fill();
    // Body
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = cfg.color + '33';
    ctx.beginPath(); ctx.arc(this.x, this.y, r + 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cfg.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(r * 0.9)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(cfg.icon, this.x, this.y + 1);
    ctx.globalAlpha = 1;
    ctx.textBaseline = 'alphabetic';
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
  constructor(x, y, color, mapConfig) {
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
    this._isOcean      = !!(mapConfig && mapConfig.ocean);
    this._isSky        = !!(mapConfig && mapConfig.sky);
    this._isPolice     = false;
    this._isMiniBoat   = false;  // Small boat for ocean maps
    this._sirenPhase   = 0;
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
      // Explosion — outer ring + inner core, no shadowBlur
      const exColor = this._isOcean ? '#0088AA' : '#FF4400';
      ctx.globalAlpha = t * 0.35;
      ctx.fillStyle   = exColor;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * (2.6 - t * 1.0), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = t * 0.85;
      ctx.fillStyle   = this._isOcean ? '#00CCEE' : '#FF8822';
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * (2.2 - t * 0.9), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }

    // Ocean map: render ship instead of car
    if (this._isOcean) {
      this._renderShip(ctx);
      return;
    }

    // Sky Realm: render driveable airplane instead of car
    if (this._isSky) {
      this._renderSkyPlane(ctx);
      return;
    }

    const flash     = this._damageFlash > 0;
    const isSports  = this.speed >= 400 && !this.bulletproof;
    const isHeavy   = this.radius >= 31 && !this.bulletproof;
    const isArmored = !!this.bulletproof;

    // ── Ground shadow ─────────────────────────────────────────
    ctx.save(); ctx.globalAlpha = 0.32; ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(this.x + 7, this.y + this.height * 0.45 + 8,
                this.width * 0.52, this.height * 0.28, this.angle, 0, Math.PI * 2);
    ctx.fill(); ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y); ctx.rotate(this.angle);
    const hw = this.width / 2, hh = this.height / 2;

    // ── Pseudo-3D south wall ──────────────────────────────────
    const VH = isArmored ? 12 : isHeavy ? 10 : 7;
    ctx.fillStyle = flash ? '#CC3322' : this._darkenVehicleColor(this.color);
    ctx.beginPath();
    ctx.moveTo(-hw, hh); ctx.lineTo(hw, hh);
    ctx.lineTo(hw, hh + VH); ctx.lineTo(-hw, hh + VH);
    ctx.closePath(); ctx.fill();
    // East face
    ctx.fillStyle = flash ? '#DD4433' : this._darkenVehicleColor(this.color, 0.72);
    ctx.beginPath();
    ctx.moveTo(hw, -hh); ctx.lineTo(hw, hh);
    ctx.lineTo(hw + VH * 0.55, hh + VH * 0.3);
    ctx.lineTo(hw + VH * 0.55, -hh + VH * 0.3);
    ctx.closePath(); ctx.fill();
    // Armor rivets on south wall
    if (isArmored) {
      ctx.fillStyle = '#6a7a8a';
      for (let ri = -2; ri <= 2; ri++) {
        ctx.beginPath(); ctx.arc(ri * (hw * 0.46), hh + VH * 0.5, 1.8, 0, Math.PI * 2); ctx.fill();
      }
    }

    // ── Body top face — flat color, no gradient for perf ─────
    ctx.fillStyle = flash ? '#CC3322' : this.color;
    if (isSports) {
      // Wedge: wider front, tapered rear
      ctx.beginPath();
      ctx.moveTo(-hw, hh * 0.82); ctx.lineTo(-hw * 0.82, hh);
      ctx.lineTo(hw, hh);          ctx.lineTo(hw, -hh);
      ctx.lineTo(-hw, -hh * 0.78); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.roundRect(-hw, -hh, this.width, this.height, isArmored ? 2 : 5); ctx.fill();
    }
    // Flash highlight instead of shadowBlur
    if (flash) {
      ctx.globalAlpha = 0.38;
      ctx.fillStyle = '#FF6644';
      if (isSports) {
        ctx.beginPath();
        ctx.moveTo(-hw, hh * 0.82); ctx.lineTo(-hw * 0.82, hh);
        ctx.lineTo(hw, hh);          ctx.lineTo(hw, -hh);
        ctx.lineTo(-hw, -hh * 0.78); ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath(); ctx.roundRect(-hw, -hh, this.width, this.height, isArmored ? 2 : 5); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ── Windshield (front = +X in rotated space) ──────────────
    const wsTint = isArmored ? 'rgba(80,130,150,0.42)' : 'rgba(175,235,255,0.42)';
    ctx.fillStyle = wsTint;
    if (isSports) {
      ctx.beginPath();
      ctx.moveTo(hw - 21, -hh + 3); ctx.lineTo(hw - 4, -hh + 3);
      ctx.lineTo(hw - 4, hh - 3);   ctx.lineTo(hw - 21, hh - 3);
      ctx.closePath(); ctx.fill();
    } else if (isArmored) {
      ctx.beginPath(); ctx.roundRect(hw - 18, -hh + 5, 12, this.height - 10, 1); ctx.fill();
    } else {
      ctx.beginPath(); ctx.roundRect(hw - 21, -hh + 3, 16, this.height - 6, 3); ctx.fill();
    }
    // Glass glare strip
    ctx.fillStyle = 'rgba(255,255,255,0.24)';
    ctx.beginPath(); ctx.roundRect(hw - 19, -hh + 4, 4, this.height * 0.36, 1); ctx.fill();

    // ── Rear window (-X) ─────────────────────────────────────
    if (!isSports) {
      ctx.fillStyle = 'rgba(140,205,230,0.18)';
      ctx.beginPath(); ctx.roundRect(-hw + 4, -hh + 4, isArmored ? 8 : 11, this.height - 8, 2); ctx.fill();
    }

    // ── Roof cabin ────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    if (isSports) {
      ctx.beginPath(); ctx.roundRect(-hw * 0.28, -hh + 3, hw * 0.68, this.height - 6, 3); ctx.fill();
    } else {
      const rfX = -hw + (isArmored ? 14 : 18);
      const rfW = this.width - (isArmored ? 24 : 36);
      ctx.beginPath(); ctx.roundRect(rfX, -hh + 4, rfW, this.height - 8, 3); ctx.fill();
    }

    // ── Chrome trim lines ─────────────────────────────────────
    ctx.strokeStyle = 'rgba(215,228,242,0.52)'; ctx.lineWidth = 1.0; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-hw + 5, -hh + 1.2); ctx.lineTo(hw - 5, -hh + 1.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-hw + 5,  hh - 1.2); ctx.lineTo(hw - 5,  hh - 1.2); ctx.stroke();

    // ── Armor plate lines ─────────────────────────────────────
    if (isArmored) {
      ctx.strokeStyle = 'rgba(75,100,120,0.55)'; ctx.lineWidth = 1.4;
      for (const sy3 of [-hh * 0.52, hh * 0.52]) {
        ctx.beginPath(); ctx.moveTo(-hw + 14, sy3); ctx.lineTo(hw - 20, sy3); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(55,75,95,0.38)'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(0, -hh + 3); ctx.lineTo(0, hh - 3); ctx.stroke();
    }

    // ── Spoiler (sports only) ─────────────────────────────────
    if (isSports) {
      ctx.fillStyle = this._darkenVehicleColor(this.color, 0.62);
      ctx.beginPath(); ctx.roundRect(-hw - 4, -hh * 0.68, 5, hh * 1.36, 1); ctx.fill();
      ctx.fillStyle = this._darkenVehicleColor(this.color, 0.50);
      ctx.beginPath(); ctx.roundRect(-hw - 3.5, -hh * 0.72, 7.5, 2.8, 1); ctx.fill();
    }

    // ── Wheels ────────────────────────────────────────────────
    const wWh = isArmored ? 12 : isHeavy ? 11 : 9;
    const wHh = isArmored ? 8  : isHeavy ? 7  : 6;
    const wxo = hw - 4, wyo = hh + 1;
    for (const [wX, wY] of [[-wxo + wWh/2, -wyo + wHh/2], [-wxo + wWh/2, wyo - wHh/2 - 1],
                              [wxo - wWh/2 - 1, -wyo + wHh/2], [wxo - wWh/2 - 1, wyo - wHh/2 - 1]]) {
      // Tire
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.ellipse(wX, wY, wWh / 2 + 1.2, wHh / 2 + 1.2, 0, 0, Math.PI * 2); ctx.fill();
      // Rim
      ctx.fillStyle = isArmored ? '#5a6a7a' : '#C4CDD6';
      ctx.beginPath(); ctx.ellipse(wX, wY, wWh / 2 - 0.8, wHh / 2 - 0.8, 0, 0, Math.PI * 2); ctx.fill();
      // Hub
      ctx.fillStyle = '#8a8a8a';
      ctx.beginPath(); ctx.arc(wX, wY, 1.6, 0, Math.PI * 2); ctx.fill();
    }

    // ── Headlights ────────────────────────────────────────────
    const hlY1 = -hh + (isArmored ? 5 : 4), hlY2 = hh - (isArmored ? 5 : 4);
    ctx.fillStyle = flash ? 'rgba(255,255,180,0.5)' : 'rgba(255,255,210,1)';
    ctx.beginPath(); ctx.ellipse(hw - 5, hlY1, 3.8, isArmored ? 2.5 : 3.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hw - 5, hlY2, 3.8, isArmored ? 2.5 : 3.2, 0, 0, Math.PI * 2); ctx.fill();
    // Light beams
    ctx.fillStyle = 'rgba(255,255,180,0.08)';
    ctx.beginPath(); ctx.moveTo(hw - 3, hlY1 - 2); ctx.lineTo(hw + 42, hlY1 - 13); ctx.lineTo(hw + 42, hlY1 + 13); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hw - 3, hlY2 - 2); ctx.lineTo(hw + 42, hlY2 - 13); ctx.lineTo(hw + 42, hlY2 + 13); ctx.closePath(); ctx.fill();

    // ── Police siren lights (flashing red/blue) ────────────────
    if (this._isPolice) {
      this._sirenPhase += 0.18;
      const sirenOn1 = Math.sin(this._sirenPhase) > 0;
      const sirenOn2 = Math.sin(this._sirenPhase + Math.PI) > 0;

      // Light bar on roof
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.roundRect(-hw * 0.3, -hh * 0.4, hw * 0.6, hh * 0.8, 2);
      ctx.fill();

      // Blue light (left) — halo via globalAlpha instead of shadowBlur
      if (sirenOn1) {
        ctx.globalAlpha = 0.35; ctx.fillStyle = '#0044CC';
        ctx.beginPath(); ctx.arc(-hw * 0.12, 0, 9, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = '#0066FF';
        ctx.beginPath(); ctx.arc(-hw * 0.12, 0, 4, 0, Math.PI * 2); ctx.fill();
      }

      // Red light (right)
      if (sirenOn2) {
        ctx.globalAlpha = 0.35; ctx.fillStyle = '#CC0033';
        ctx.beginPath(); ctx.arc(hw * 0.12, 0, 9, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = '#FF0044';
        ctx.beginPath(); ctx.arc(hw * 0.12, 0, 4, 0, Math.PI * 2); ctx.fill();
      }
    }

    // ── Taillights ────────────────────────────────────────────
    ctx.fillStyle = '#FF2200';
    ctx.beginPath(); ctx.ellipse(-hw + 5, hlY1, 2.6, 2.0, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-hw + 5, hlY2, 2.6, 2.0, 0, 0, Math.PI * 2); ctx.fill();

    // ── Exhaust ───────────────────────────────────────────────
    if (!isArmored) {
      ctx.fillStyle = '#1c1c1c';
      ctx.beginPath(); ctx.ellipse(-hw + 3, hh * (isSports ? 0.58 : 0.42), 3.2, 2, 0, 0, Math.PI * 2); ctx.fill();
      if (isSports) {
        ctx.beginPath(); ctx.ellipse(-hw + 3, -hh * 0.58, 3.2, 2, 0, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.restore();

    // ── HP bar ────────────────────────────────────────────────
    if (this.hp < this.maxHp) {
      const bw = 58, bh = 5, bx2 = this.x - bw/2, by2 = this.y - this.radius - 14;
      const pct = this.hp / this.maxHp;
      ctx.fillStyle = '#111'; ctx.fillRect(bx2, by2, bw, bh);
      ctx.fillStyle   = pct > 0.5 ? '#44FF88' : pct > 0.25 ? '#FFCC00' : '#FF4444';
      ctx.fillRect(bx2, by2, bw * pct, bh);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 0.5;
      ctx.strokeRect(bx2, by2, bw, bh);
    }
  }

  _renderSkyPlane(ctx) {
    // Top-down driveable airplane — matches the ambient AmbientCar airplane aesthetic
    const t      = this._animT;
    const flash  = this._damageFlash > 0;
    const ang    = this.angle;
    const cx     = this.x, cy = this.y;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);

    // ── Contrail (engine exhaust plume behind fuselage) ─────────────────
    const pulseA = 0.14 + Math.sin(t * 9) * 0.06;
    for (let ci = 0; ci < 3; ci++) {
      ctx.globalAlpha = pulseA * (1 - ci * 0.28);
      ctx.fillStyle = '#CCE8FF';
      ctx.beginPath();
      ctx.ellipse(-38 - ci * 18, 0, 10 + ci * 4, 5 + ci * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── Ground shadow ───────────────────────────────────────────────────
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(6, 12, 42, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // ── Swept main wings ────────────────────────────────────────────────
    const wingColor = flash ? '#CC3322' : (this._isPolice ? '#1a3a6a' : '#C0C8D8');
    ctx.fillStyle = wingColor;
    // left wing
    ctx.beginPath();
    ctx.moveTo(-4, -5);
    ctx.lineTo(-26, -30);
    ctx.lineTo(-34, -22);
    ctx.lineTo(4, -4);
    ctx.closePath(); ctx.fill();
    // right wing
    ctx.beginPath();
    ctx.moveTo(-4, 5);
    ctx.lineTo(-26, 30);
    ctx.lineTo(-34, 22);
    ctx.lineTo(4, 4);
    ctx.closePath(); ctx.fill();
    // Wing shading
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.moveTo(-4, -5); ctx.lineTo(-26, -30); ctx.lineTo(-16, -20); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4, 5);  ctx.lineTo(-26, 30);  ctx.lineTo(-16, 20);  ctx.closePath(); ctx.fill();

    // ── Horizontal tail stabilisers ──────────────────────────────────────
    const tailColor = flash ? '#AA2211' : (this._isPolice ? '#142a52' : '#A8B4C4');
    ctx.fillStyle = tailColor;
    ctx.beginPath();
    ctx.moveTo(-22, -4); ctx.lineTo(-30, -14); ctx.lineTo(-32, -10); ctx.lineTo(-24, -3); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-22, 4);  ctx.lineTo(-30, 14);  ctx.lineTo(-32, 10);  ctx.lineTo(-24, 3);  ctx.closePath(); ctx.fill();

    // ── Fuselage (main body) ─────────────────────────────────────────────
    const bodyG = ctx.createLinearGradient(-30, -6, 30, 6);
    if (flash) {
      bodyG.addColorStop(0, '#CC3322'); bodyG.addColorStop(1, '#881111');
    } else if (this._isPolice) {
      bodyG.addColorStop(0, '#2a5a9a'); bodyG.addColorStop(0.5, '#1a3a6a'); bodyG.addColorStop(1, '#0e2244');
    } else {
      bodyG.addColorStop(0, '#D8E4F0'); bodyG.addColorStop(0.5, '#B0BECE'); bodyG.addColorStop(1, '#8898A8');
    }
    ctx.fillStyle = bodyG;
    ctx.beginPath(); ctx.roundRect(-30, -6, 62, 12, 4); ctx.fill();

    // ── Engine pods on wings ─────────────────────────────────────────────
    const engineColor = flash ? '#AA2211' : '#8898A8';
    ctx.fillStyle = engineColor;
    ctx.beginPath(); ctx.roundRect(-18, -23, 16, 6, 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-18,  17, 16, 6, 2); ctx.fill();
    // Afterburner glow
    ctx.globalAlpha = 0.5 + Math.sin(t * 14) * 0.25;
    ctx.fillStyle = '#88CCFF';
    ctx.beginPath(); ctx.arc(-18, -20, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-18,  20, 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // ── Cockpit windows ──────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(135,210,255,0.65)';
    ctx.beginPath(); ctx.ellipse(22, -3, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.beginPath(); ctx.ellipse(20, -3.5, 2.5, 2, 0, 0, Math.PI * 2); ctx.fill();

    // ── Nose cone ────────────────────────────────────────────────────────
    ctx.fillStyle = flash ? '#CC3322' : (this._isPolice ? '#87CEEB' : '#E8F0F8');
    ctx.beginPath(); ctx.moveTo(32, 0); ctx.lineTo(24, -4); ctx.lineTo(24, 4); ctx.closePath(); ctx.fill();

    // ── Police markings: sky-blue/white cheatline ────────────────────────
    if (this._isPolice) {
      ctx.strokeStyle = '#87CEEB'; ctx.lineWidth = 2.5; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(-20, -5.5); ctx.lineTo(20, -5.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-20,  5.5); ctx.lineTo(20,  5.5); ctx.stroke();
      // Flashing siren light on roof
      const sirenOn = Math.floor(t * 6) % 2 === 0;
      ctx.fillStyle = sirenOn ? '#0066FF' : '#FF2200';
      ctx.shadowColor = sirenOn ? '#0044CC' : '#CC0000'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(8, 0, 2.8, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();

    // ── HP bar ───────────────────────────────────────────────────────────
    if (this.hp < this.maxHp) {
      const bw = 64, bh = 5, bx2 = cx - bw / 2, by2 = cy - this.radius - 18;
      const pct = this.hp / this.maxHp;
      ctx.fillStyle = '#111'; ctx.fillRect(bx2, by2, bw, bh);
      ctx.fillStyle = pct > 0.5 ? '#44FF88' : pct > 0.25 ? '#FFCC00' : '#FF4444';
      ctx.fillRect(bx2, by2, bw * pct, bh);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 0.5;
      ctx.strokeRect(bx2, by2, bw, bh);
    }
  }

  _renderShip(ctx) {
    const flash = this._damageFlash > 0;
    this._sirenPhase += 0.15;

    // Render mini boat (speedboat) differently
    if (this._isMiniBoat) {
      this._renderMiniBoat(ctx);
      return;
    }

    // Water wake/ripple effect
    ctx.save();
    ctx.globalAlpha = 0.25;
    const waveOffset = Math.sin(this._animT * 3) * 3;
    ctx.strokeStyle = '#00CCFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(this.x - Math.cos(this.angle) * 10, this.y - Math.sin(this.angle) * 10 + waveOffset,
                this.width * 0.6, this.height * 0.4, this.angle, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const hw = this.width / 2 + 5;
    const hh = this.height / 2 + 3;

    // Ship hull shadow
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#001122';
    ctx.beginPath();
    ctx.ellipse(4, 4, hw * 0.9, hh * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Ship hull (pointed bow)
    const hullGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
    if (flash) {
      hullGrad.addColorStop(0, '#FF6644');
      hullGrad.addColorStop(1, '#CC3322');
    } else {
      hullGrad.addColorStop(0, this._darkenVehicleColor(this.color, 0.7));
      hullGrad.addColorStop(0.5, this.color);
      hullGrad.addColorStop(1, this._lightenVehicleColor(this.color, 1.2));
    }
    ctx.fillStyle = hullGrad;
    ctx.shadowColor = flash ? '#FF4444' : this.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(hw + 8, 0);           // Bow point
    ctx.lineTo(hw - 5, -hh);         // Starboard front
    ctx.lineTo(-hw + 5, -hh * 0.8);  // Starboard rear
    ctx.lineTo(-hw, 0);              // Stern
    ctx.lineTo(-hw + 5, hh * 0.8);   // Port rear
    ctx.lineTo(hw - 5, hh);          // Port front
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Deck
    ctx.fillStyle = '#1a1a2a';
    ctx.beginPath();
    ctx.moveTo(hw - 2, 0);
    ctx.lineTo(hw - 10, -hh + 5);
    ctx.lineTo(-hw + 10, -hh * 0.7 + 3);
    ctx.lineTo(-hw + 5, 0);
    ctx.lineTo(-hw + 10, hh * 0.7 - 3);
    ctx.lineTo(hw - 10, hh - 5);
    ctx.closePath();
    ctx.fill();

    // Cabin/bridge
    ctx.fillStyle = this._darkenVehicleColor(this.color, 0.5);
    ctx.beginPath();
    ctx.roundRect(-hw * 0.3, -hh * 0.5, hw * 0.7, hh, 3);
    ctx.fill();

    // Cabin windows
    ctx.fillStyle = 'rgba(100, 200, 255, 0.5)';
    ctx.beginPath();
    ctx.roundRect(-hw * 0.15, -hh * 0.35, hw * 0.45, hh * 0.7, 2);
    ctx.fill();
    // Window glare
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.roundRect(-hw * 0.12, -hh * 0.3, hw * 0.15, hh * 0.5, 1);
    ctx.fill();

    // Mast/antenna
    ctx.strokeStyle = '#445566';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -hh - 12);
    ctx.stroke();

    // Flag on mast
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(0, -hh - 12);
    ctx.lineTo(8, -hh - 8);
    ctx.lineTo(0, -hh - 4);
    ctx.closePath();
    ctx.fill();

    // Port lights (navigation)
    ctx.fillStyle = '#FF0000';
    ctx.shadowColor = '#FF0000';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(hw - 8, hh - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Starboard light
    ctx.fillStyle = '#00FF00';
    ctx.shadowColor = '#00FF00';
    ctx.beginPath();
    ctx.arc(hw - 8, -hh + 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Police ship siren lights (red and blue flashing) - VERY VISIBLE
    if (this._isPolice) {
      const sirenOn1 = Math.sin(this._sirenPhase) > 0;
      const sirenOn2 = Math.sin(this._sirenPhase + Math.PI) > 0;

      // Large light bar base on TOP of cabin (above everything)
      ctx.fillStyle = '#000000';
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-12, -hh - 8, 24, 10, 3);
      ctx.fill();
      ctx.stroke();

      // Blue light (left) - BIG and BRIGHT
      if (sirenOn1) {
        // Outer glow
        ctx.fillStyle = 'rgba(0, 100, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(-6, -hh - 3, 18, 0, Math.PI * 2);
        ctx.fill();
        // Main light
        ctx.fillStyle = '#0088FF';
        ctx.shadowColor = '#0066FF';
        ctx.shadowBlur = 50;
        ctx.beginPath();
        ctx.arc(-6, -hh - 3, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fill(); // Double fill for brightness
        // Bright center
        ctx.fillStyle = '#66CCFF';
        ctx.beginPath();
        ctx.arc(-6, -hh - 3, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Red light (right) - BIG and BRIGHT
      if (sirenOn2) {
        // Outer glow
        ctx.fillStyle = 'rgba(255, 0, 50, 0.3)';
        ctx.beginPath();
        ctx.arc(6, -hh - 3, 18, 0, Math.PI * 2);
        ctx.fill();
        // Main light
        ctx.fillStyle = '#FF0044';
        ctx.shadowColor = '#FF0044';
        ctx.shadowBlur = 50;
        ctx.beginPath();
        ctx.arc(6, -hh - 3, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fill(); // Double fill for brightness
        // Bright center
        ctx.fillStyle = '#FF6688';
        ctx.beginPath();
        ctx.arc(6, -hh - 3, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // "COAST GUARD" text on hull
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('COAST', 0, hh * 0.3);
      ctx.fillText('GUARD', 0, hh * 0.6);
    }

    // Bow light
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(hw + 4, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Wake bubbles at stern
    ctx.fillStyle = 'rgba(150, 220, 255, 0.4)';
    for (let i = 0; i < 3; i++) {
      const bx = -hw - 8 - i * 6 + Math.sin(this._animT * 5 + i) * 2;
      const by = (Math.random() - 0.5) * hh * 0.6;
      ctx.beginPath();
      ctx.arc(bx, by, 2 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // HP bar
    if (this.hp < this.maxHp) {
      const bw = 58, bh = 5, bx2 = this.x - bw/2, by2 = this.y - this.radius - 18;
      const pct = this.hp / this.maxHp;
      ctx.fillStyle = '#001122';
      ctx.fillRect(bx2, by2, bw, bh);
      ctx.fillStyle = pct > 0.5 ? '#00FFAA' : pct > 0.25 ? '#FFCC00' : '#FF4444';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 6;
      ctx.fillRect(bx2, by2, bw * pct, bh);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(100,200,255,0.3)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(bx2, by2, bw, bh);
    }
  }

  _renderMiniBoat(ctx) {
    const flash = this._damageFlash > 0;

    // Small wake ripple
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#00AADD';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(this.x - Math.cos(this.angle) * 6, this.y - Math.sin(this.angle) * 6,
                this.width * 0.5, this.height * 0.35, this.angle, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const hw = this.width / 2;
    const hh = this.height / 2;

    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#001122';
    ctx.beginPath();
    ctx.ellipse(2, 2, hw * 0.8, hh * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Speedboat hull - sleek pointed shape
    const hullGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
    if (flash) {
      hullGrad.addColorStop(0, '#FF6644');
      hullGrad.addColorStop(1, '#CC3322');
    } else {
      hullGrad.addColorStop(0, this._darkenVehicleColor(this.color, 0.6));
      hullGrad.addColorStop(0.5, this.color);
      hullGrad.addColorStop(1, this._lightenVehicleColor(this.color, 1.15));
    }
    ctx.fillStyle = hullGrad;
    ctx.shadowColor = flash ? '#FF4444' : this.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(hw + 6, 0);           // Bow point
    ctx.lineTo(hw - 4, -hh * 0.9);   // Starboard
    ctx.lineTo(-hw + 2, -hh * 0.7);  // Rear starboard
    ctx.lineTo(-hw, 0);              // Stern
    ctx.lineTo(-hw + 2, hh * 0.7);   // Rear port
    ctx.lineTo(hw - 4, hh * 0.9);    // Port
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Deck
    ctx.fillStyle = '#1a2030';
    ctx.beginPath();
    ctx.moveTo(hw - 2, 0);
    ctx.lineTo(hw - 8, -hh * 0.6);
    ctx.lineTo(-hw + 6, -hh * 0.5);
    ctx.lineTo(-hw + 4, 0);
    ctx.lineTo(-hw + 6, hh * 0.5);
    ctx.lineTo(hw - 8, hh * 0.6);
    ctx.closePath();
    ctx.fill();

    // Small windscreen
    ctx.fillStyle = 'rgba(100, 200, 255, 0.45)';
    ctx.beginPath();
    ctx.moveTo(hw * 0.2, -hh * 0.4);
    ctx.lineTo(hw * 0.5, -hh * 0.35);
    ctx.lineTo(hw * 0.5, hh * 0.35);
    ctx.lineTo(hw * 0.2, hh * 0.4);
    ctx.closePath();
    ctx.fill();

    // Outboard motor at stern
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.roundRect(-hw - 3, -hh * 0.25, 6, hh * 0.5, 1);
    ctx.fill();

    // Bow light
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(hw + 3, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Wake spray
    ctx.fillStyle = 'rgba(180, 230, 255, 0.35)';
    for (let i = 0; i < 2; i++) {
      const bx = -hw - 4 - i * 4 + Math.sin(this._animT * 6 + i) * 1.5;
      const by = (Math.random() - 0.5) * hh * 0.5;
      ctx.beginPath();
      ctx.arc(bx, by, 1.5 + Math.random(), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // HP bar for mini boat
    if (this.hp < this.maxHp) {
      const bw = 40, bh = 4, bx2 = this.x - bw/2, by2 = this.y - this.radius - 12;
      const pct = this.hp / this.maxHp;
      ctx.fillStyle = '#001122';
      ctx.fillRect(bx2, by2, bw, bh);
      ctx.fillStyle = pct > 0.5 ? '#00FFAA' : pct > 0.25 ? '#FFCC00' : '#FF4444';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 5;
      ctx.fillRect(bx2, by2, bw * pct, bh);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(100,200,255,0.25)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(bx2, by2, bw, bh);
    }
  }

  _darkenVehicleColor(hex, factor = 0.58) {
    const r = Math.round(parseInt(hex.slice(1,3),16) * factor);
    const g = Math.round(parseInt(hex.slice(3,5),16) * factor);
    const b = Math.round(parseInt(hex.slice(5,7),16) * factor);
    return `rgb(${r},${g},${b})`;
  }

  _lightenVehicleColor(hex, factor = 1.35) {
    const r = Math.min(255, Math.round(parseInt(hex.slice(1,3),16) * factor));
    const g = Math.min(255, Math.round(parseInt(hex.slice(3,5),16) * factor));
    const b = Math.min(255, Math.round(parseInt(hex.slice(5,7),16) * factor));
    return `rgb(${r},${g},${b})`;
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

    // ── Active Buffs (building interactions) ──────────────
    // Map<id, {name,icon,color,remaining,maxDur, speedAdd?,fireMult?,dmgMult?,armorAdd?,
    //          regenAdd?,dodgeAdd?,moneyMult?,noPolice?,botsConfused?,piercingBullets?,
    //          explosiveBullets?,leechAdd?,pendingMoney?}>
    this._buffs = new Map();

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
    let mult = this.damageMult;
    for (const b of this._buffs.values()) if (b.dmgMult) mult *= b.dmgMult;
    return Math.max(1, Math.round(base * mult));
  }

  _activeFireRate() {
    const base = this._weapon.fireRate > 0 ? this._weapon.fireRate : this.charData.fireRate;
    const ammoBonusMult = this._ammoBoost > 0 ? Math.max(0.35, 0.72 / (this._ammoCapMult || 1)) : 1.0;
    let rate = base * this.fireRateMult * ammoBonusMult;
    for (const b of this._buffs.values()) if (b.fireMult) rate *= b.fireMult;
    return Math.max(35, rate);
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

      // Neon City: allow shooting while driving
      if (gameMap.config.id === 'neon_city') {
        this.angle = Math.atan2(input.mouseWorld.y - this.y, input.mouseWorld.x - this.x);
        this.fireCooldown -= dt * 1000;
        if (input.mouseDown && this.fireCooldown <= 0) {
          this._shoot(bullets, particles);
          this.fireCooldown = this._activeFireRate();
        }
      }
      return;
    }

    let dx = 0, dy = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp'))    dy -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown'))  dy += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft'))  dx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) dx += 1;

    // Tick active buffs
    if (this._buffs.size > 0) {
      for (const [id, b] of this._buffs) {
        b.remaining -= dt;
        if (b.remaining <= 0) this._buffs.delete(id);
      }
    }

    const dir  = new Vec2(dx, dy).norm();
    let buffedSpd = this.speed;
    for (const b of this._buffs.values()) if (b.speedAdd) buffedSpd += b.speedAdd;
    const dist = buffedSpd * dt;
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

    let totalRegen = this.regenRate;
    for (const b of this._buffs.values()) if (b.regenAdd) totalRegen += b.regenAdd;
    if (totalRegen > 0 && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + totalRegen * dt);
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
    let dodge = this._dodgeChance || 0;
    for (const b of this._buffs.values()) if (b.dodgeAdd) dodge += b.dodgeAdd;
    if (dodge > 0 && Math.random() < dodge) return 0;
    let totalArmor = this.armor;
    for (const b of this._buffs.values()) if (b.armorAdd) totalArmor += b.armorAdd;
    totalArmor = Math.min(0.85, totalArmor);
    const reduced = Math.max(1, Math.round(amount * (1 - totalArmor)));
    this.health  -= reduced;
    this.invincible = 0.15;
    if (hud) hud.shake(6);
    if (this.health <= 0) { this.health = 0; this.dead = true; }
    return reduced;
  }

  render(ctx) {
    const x = this.x, y = this.y, r = this.radius;
    const ang = this.angle;
    const wColor = this._weaponColor();

    // ── Ground shadow ──────────────────────────────────────────
    const bodyScale = this.charData.bodyScale || 1.0;
    const sr = r * bodyScale;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x + 5, y + sr * 0.6, sr * 1.2, sr * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── Character body rendering based on ID ────────────────────────
    const charId = this.charData.id;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang - Math.PI / 2);

    if (charId === 'cyber_wolf') {
      // ── CYBER WOLF - Lean wolf with pointed ears ──
      // Back legs (lean)
      for (const s of [-1, 1]) {
        ctx.fillStyle = this.color + 'BB';
        ctx.beginPath();
        ctx.ellipse(s * sr * 0.32, sr * 0.35, sr * 0.1, sr * 0.45, s * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
      // Lean body
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, sr * 0.4, sr * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      // Cyber spine ridge
      ctx.strokeStyle = this.accent; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, sr * 0.4); ctx.lineTo(0, -sr * 0.5); ctx.stroke();
      // Front legs
      for (const s of [-1, 1]) {
        ctx.fillStyle = this.color + 'DD';
        ctx.beginPath();
        ctx.ellipse(s * sr * 0.25, -sr * 0.45, sr * 0.08, sr * 0.35, s * -0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      // Wolf head (long snout)
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(0, -sr * 0.75, sr * 0.35, sr * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Long snout
      ctx.fillStyle = this.accent;
      ctx.beginPath();
      ctx.moveTo(-sr * 0.12, -sr * 0.85);
      ctx.lineTo(0, -sr * 1.15);
      ctx.lineTo(sr * 0.12, -sr * 0.85);
      ctx.closePath();
      ctx.fill();
      // Pointed ears
      for (const s of [-1, 1]) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(s * sr * 0.25, -sr * 0.75);
        ctx.lineTo(s * sr * 0.35, -sr * 1.1);
        ctx.lineTo(s * sr * 0.15, -sr * 0.85);
        ctx.closePath();
        ctx.fill();
      }
      // Glowing eyes
      ctx.fillStyle = this.accent;
      ctx.shadowColor = this.accent; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(-sr * 0.15, -sr * 0.78, sr * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sr * 0.15, -sr * 0.78, sr * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      // Bushy tail
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(0, sr * 0.5);
      ctx.quadraticCurveTo(sr * 0.5, sr * 0.7, sr * 0.3, sr * 1.0);
      ctx.quadraticCurveTo(sr * 0.1, sr * 0.8, 0, sr * 0.5);
      ctx.fill();

    } else if (charId === 'neon_panther') {
      // ── NEON PANTHER - Sleek cat with spots ──
      // Back legs (muscular)
      for (const s of [-1, 1]) {
        ctx.fillStyle = this.color + 'CC';
        ctx.beginPath();
        ctx.ellipse(s * sr * 0.35, sr * 0.25, sr * 0.15, sr * 0.4, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Sleek body
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(0, -sr * 0.05, sr * 0.45, sr * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      // Spots
      ctx.fillStyle = this.accent + '66';
      for (let i = 0; i < 5; i++) {
        const sx = (Math.sin(i * 1.5) * sr * 0.25);
        const sy = -sr * 0.1 + (i - 2) * sr * 0.15;
        ctx.beginPath(); ctx.arc(sx, sy, sr * 0.08, 0, Math.PI * 2); ctx.fill();
      }
      // Front legs
      for (const s of [-1, 1]) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(s * sr * 0.28, -sr * 0.5, sr * 0.1, sr * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Rounded cat head
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, -sr * 0.75, sr * 0.32, 0, Math.PI * 2);
      ctx.fill();
      // Small nose
      ctx.fillStyle = this.accent;
      ctx.beginPath();
      ctx.arc(0, -sr * 0.85, sr * 0.06, 0, Math.PI * 2);
      ctx.fill();
      // Rounded ears
      for (const s of [-1, 1]) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(s * sr * 0.25, -sr * 0.95, sr * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.accent + '88';
        ctx.beginPath();
        ctx.arc(s * sr * 0.25, -sr * 0.95, sr * 0.06, 0, Math.PI * 2);
        ctx.fill();
      }
      // Cat eyes (slitted)
      ctx.fillStyle = this.accent;
      ctx.shadowColor = this.accent; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.ellipse(-sr * 0.12, -sr * 0.75, sr * 0.1, sr * 0.06, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(sr * 0.12, -sr * 0.75, sr * 0.1, sr * 0.06, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      // Long tail
      ctx.strokeStyle = this.color; ctx.lineWidth = sr * 0.1; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, sr * 0.4);
      ctx.bezierCurveTo(sr * 0.6, sr * 0.5, sr * 0.8, sr * 0.9, sr * 0.4, sr * 1.1);
      ctx.stroke();

    } else if (charId === 'mecha_bulldog') {
      // ── MECHA BULLDOG - Stocky, flat face, wide ──
      // Thick back legs
      for (const s of [-1, 1]) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(s * sr * 0.35 - sr * 0.15, sr * 0.1, sr * 0.3, sr * 0.5, sr * 0.08);
        ctx.fill();
      }
      // Wide stocky body
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.roundRect(-sr * 0.55, -sr * 0.4, sr * 1.1, sr * 0.7, sr * 0.2);
      ctx.fill();
      // Armor plates
      ctx.fillStyle = this.accent + '77';
      ctx.beginPath();
      ctx.roundRect(-sr * 0.4, -sr * 0.3, sr * 0.8, sr * 0.35, sr * 0.1);
      ctx.fill();
      // Front legs (thick)
      for (const s of [-1, 1]) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.roundRect(s * sr * 0.3 - sr * 0.12, -sr * 0.65, sr * 0.24, sr * 0.45, sr * 0.06);
        ctx.fill();
      }
      // Wide flat head
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.roundRect(-sr * 0.4, -sr * 0.95, sr * 0.8, sr * 0.45, sr * 0.15);
      ctx.fill();
      // Flat wrinkled snout
      ctx.fillStyle = this.accent;
      ctx.beginPath();
      ctx.roundRect(-sr * 0.25, -sr * 1.05, sr * 0.5, sr * 0.2, sr * 0.08);
      ctx.fill();
      // Wrinkle lines
      ctx.strokeStyle = this.color + '88'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-sr * 0.15, -sr * 1.0); ctx.lineTo(sr * 0.15, -sr * 1.0); ctx.stroke();
      // Floppy ears
      for (const s of [-1, 1]) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(s * sr * 0.45, -sr * 0.75, sr * 0.15, sr * 0.2, s * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Small tough eyes
      ctx.fillStyle = this.accent;
      ctx.beginPath(); ctx.arc(-sr * 0.18, -sr * 0.8, sr * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sr * 0.18, -sr * 0.8, sr * 0.08, 0, Math.PI * 2); ctx.fill();
      // Stubby tail
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(0, sr * 0.45, sr * 0.1, sr * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();

    } else if (charId === 'spider_drone') {
      // ── Spider Drone ──
      const bodyR = sr * 0.4;

      // Legs (8)
      ctx.strokeStyle = this.color; ctx.lineWidth = sr * 0.08; ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const side = i < 4 ? -1 : 1;
        const idx = i % 4;
        const baseAng = (idx - 1.5) * 0.5;
        const legX = side * bodyR * 0.7;
        const midX = side * sr * 0.9;
        const endX = side * sr * 1.1;
        const midY = (idx - 1.5) * sr * 0.35;
        const endY = midY + sr * 0.3;
        ctx.beginPath();
        ctx.moveTo(legX * 0.5, midY * 0.3);
        ctx.quadraticCurveTo(midX, midY - sr * 0.2, endX, endY);
        ctx.stroke();
      }

      // Body (abdomen)
      ctx.fillStyle = this.accent;
      ctx.beginPath();
      ctx.ellipse(0, sr * 0.25, bodyR * 0.9, bodyR * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Thorax
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(0, -sr * 0.15, bodyR * 0.7, bodyR * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(0, -sr * 0.45, bodyR * 0.5, bodyR * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eyes (multiple)
      ctx.fillStyle = this.accent;
      ctx.shadowColor = this.accent; ctx.shadowBlur = 6;
      for (let i = 0; i < 4; i++) {
        const ex = (i - 1.5) * bodyR * 0.25;
        const ey = -sr * 0.5 + (i % 2) * bodyR * 0.12;
        ctx.beginPath(); ctx.arc(ex, ey, bodyR * 0.1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;

    } else if (charId === 'robo_hawk') {
      // ── Robo Hawk (Bird) ──
      const wingSpan = sr * 1.4;
      const bodyLen = sr * 0.9;

      // Wings
      const wingFlap = Math.sin(Date.now() * 0.012) * 0.15;
      for (const s of [-1, 1]) {
        ctx.fillStyle = this.color + 'DD';
        ctx.save();
        ctx.rotate(s * (0.3 + wingFlap));
        ctx.beginPath();
        ctx.moveTo(0, -sr * 0.1);
        ctx.quadraticCurveTo(s * wingSpan * 0.5, -sr * 0.4, s * wingSpan * 0.8, -sr * 0.1);
        ctx.quadraticCurveTo(s * wingSpan * 0.5, sr * 0.1, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Body
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, sr * 0.35, bodyLen * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = this.accent;
      ctx.beginPath();
      ctx.ellipse(0, -bodyLen * 0.45, sr * 0.28, sr * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#FFCC44';
      ctx.beginPath();
      ctx.moveTo(-sr * 0.08, -bodyLen * 0.55);
      ctx.lineTo(0, -bodyLen * 0.8);
      ctx.lineTo(sr * 0.08, -bodyLen * 0.55);
      ctx.closePath();
      ctx.fill();

      // Eyes
      ctx.fillStyle = this.accent;
      ctx.shadowColor = this.accent; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(-sr * 0.12, -bodyLen * 0.45, sr * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sr * 0.12, -bodyLen * 0.45, sr * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      // Tail feathers
      ctx.fillStyle = this.color + 'AA';
      ctx.beginPath();
      ctx.moveTo(-sr * 0.15, bodyLen * 0.35);
      ctx.lineTo(0, bodyLen * 0.7);
      ctx.lineTo(sr * 0.15, bodyLen * 0.35);
      ctx.closePath();
      ctx.fill();

    } else if (charId === 'nano_rat') {
      // ── Nano Rat (Small rodent) ──
      const bodyLen = sr * 0.7;

      // Tail
      ctx.strokeStyle = this.accent; ctx.lineWidth = sr * 0.06; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, sr * 0.25);
      ctx.quadraticCurveTo(sr * 0.3, sr * 0.7, -sr * 0.1, sr * 1.0);
      ctx.stroke();

      // Back legs
      for (const s of [-1, 1]) {
        ctx.fillStyle = this.color + 'BB';
        ctx.beginPath();
        ctx.ellipse(s * sr * 0.25, sr * 0.15, sr * 0.12, sr * 0.2, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Body
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, sr * 0.35, bodyLen * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Front legs
      for (const s of [-1, 1]) {
        ctx.fillStyle = this.color + 'CC';
        ctx.beginPath();
        ctx.ellipse(s * sr * 0.2, -sr * 0.3, sr * 0.08, sr * 0.15, s * -0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Head
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(0, -sr * 0.5, sr * 0.28, sr * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();

      // Snout
      ctx.fillStyle = this.accent;
      ctx.beginPath();
      ctx.ellipse(0, -sr * 0.7, sr * 0.12, sr * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ears
      for (const s of [-1, 1]) {
        ctx.fillStyle = this.accent;
        ctx.beginPath();
        ctx.ellipse(s * sr * 0.22, -sr * 0.45, sr * 0.12, sr * 0.15, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Eyes
      ctx.fillStyle = this.accent;
      ctx.shadowColor = this.accent; ctx.shadowBlur = 4;
      ctx.beginPath(); ctx.arc(-sr * 0.1, -sr * 0.5, sr * 0.06, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sr * 0.1, -sr * 0.5, sr * 0.06, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'mini_bee') {
      // ── Mini Drone Bee ──
      const bodyLen = sr * 0.6;

      // Wings
      const wingFlap = Math.sin(Date.now() * 0.03) * 0.3;
      ctx.fillStyle = 'rgba(200,220,255,0.5)';
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.rotate(s * (0.4 + wingFlap * s));
        ctx.beginPath();
        ctx.ellipse(s * sr * 0.45, -sr * 0.1, sr * 0.5, sr * 0.2, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Abdomen (striped)
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(0, sr * 0.15, sr * 0.32, bodyLen * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Stripes
      ctx.fillStyle = '#111';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(0, sr * 0.05 + i * sr * 0.15, sr * 0.34, sr * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Thorax
      ctx.fillStyle = this.accent;
      ctx.beginPath();
      ctx.ellipse(0, -sr * 0.15, sr * 0.25, sr * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(0, -sr * 0.4, sr * 0.2, sr * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eyes (large compound eyes)
      ctx.fillStyle = this.accent;
      ctx.shadowColor = this.accent; ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.arc(-sr * 0.12, -sr * 0.42, sr * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sr * 0.12, -sr * 0.42, sr * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      // Antennae
      ctx.strokeStyle = this.color; ctx.lineWidth = sr * 0.03;
      ctx.beginPath(); ctx.moveTo(-sr * 0.08, -sr * 0.52); ctx.lineTo(-sr * 0.15, -sr * 0.7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sr * 0.08, -sr * 0.52); ctx.lineTo(sr * 0.15, -sr * 0.7); ctx.stroke();

      // Stinger
      ctx.fillStyle = '#AAA';
      ctx.beginPath();
      ctx.moveTo(-sr * 0.05, sr * 0.45);
      ctx.lineTo(0, sr * 0.65);
      ctx.lineTo(sr * 0.05, sr * 0.45);
      ctx.closePath();
      ctx.fill();

    } else if (charId === 'electric_eel') {
      // ── Electric Eel (serpentine) ──
      const segments = 6;
      const segLen = sr * 0.3;
      const waveAmp = sr * 0.15;
      const wavePhase = Date.now() * 0.005;

      // Body segments
      ctx.lineCap = 'round';
      for (let i = segments - 1; i >= 0; i--) {
        const segY = -sr * 0.6 + i * segLen * 0.7;
        const segX = Math.sin(wavePhase + i * 0.5) * waveAmp;
        const segR = sr * 0.2 * (1 - i * 0.08);

        // Electric glow
        if (Math.random() < 0.3) {
          ctx.fillStyle = this.accent;
          ctx.shadowColor = this.accent; ctx.shadowBlur = 15;
          ctx.beginPath(); ctx.arc(segX, segY, segR * 1.3, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = i === 0 ? this.accent : this.color;
        ctx.beginPath();
        ctx.ellipse(segX, segY, segR, segR * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Head
      const headY = -sr * 0.75;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(0, headY, sr * 0.25, sr * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = this.accent;
      ctx.shadowColor = this.accent; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(-sr * 0.1, headY - sr * 0.05, sr * 0.07, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sr * 0.1, headY - sr * 0.05, sr * 0.07, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      // Tail fin
      ctx.fillStyle = this.accent + 'AA';
      ctx.beginPath();
      const tailX = Math.sin(wavePhase + segments * 0.5) * waveAmp;
      ctx.moveTo(tailX - sr * 0.1, sr * 0.5);
      ctx.quadraticCurveTo(tailX, sr * 0.85, tailX + sr * 0.1, sr * 0.5);
      ctx.closePath();
      ctx.fill();

    } else if (charId === 'tank_commander' || charId === 'plasma_titan') {
      // ── Titan (Large Heavy Humanoid) ──
      const bw = sr * 0.8, bh = sr * 1.1, hhr = sr * 0.5;

      // Massive legs
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath(); ctx.ellipse(s * sr * 0.35, sr * 0.4, sr * 0.28, sr * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = this.color + '88';
        ctx.beginPath(); ctx.ellipse(s * sr * 0.35, sr * 0.3, sr * 0.22, sr * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      }

      // Massive torso
      const tGrad = ctx.createLinearGradient(-bw, -bh * 0.5, bw, bh * 0.4);
      tGrad.addColorStop(0, this.color); tGrad.addColorStop(1, this.accent);
      ctx.fillStyle = tGrad;
      ctx.beginPath(); ctx.roundRect(-bw, -bh * 0.5, bw * 2, bh * 1.0, [bw * 0.3, bw * 0.3, bw * 0.15, bw * 0.15]); ctx.fill();

      // Armor plates
      ctx.fillStyle = this.accent + '60';
      ctx.beginPath(); ctx.roundRect(-bw * 0.7, -bh * 0.4, bw * 1.4, bh * 0.5, bw * 0.1); ctx.fill();
      ctx.strokeStyle = this.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -bh * 0.45); ctx.lineTo(0, bh * 0.1); ctx.stroke();

      // Massive arms
      for (const s of [-1, 1]) {
        ctx.fillStyle = this.color + 'CC';
        ctx.beginPath(); ctx.roundRect(s * bw * 1.0, -bh * 0.4, sr * 0.35 * s, sr * 0.9, sr * 0.12); ctx.fill();
        // Shoulder pads
        ctx.fillStyle = this.accent;
        ctx.beginPath(); ctx.ellipse(s * bw * 0.95, -bh * 0.35, sr * 0.25, sr * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      }

      // Small head (relative to body)
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(0, -bh * 0.6, hhr * 0.7, 0, Math.PI * 2); ctx.fill();

      // Visor
      ctx.fillStyle = this.accent;
      ctx.shadowColor = this.accent; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.rect(-hhr * 0.5, -bh * 0.62, hhr * 1.0, hhr * 0.25); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'phantom') {
      // ── THE PHANTOM - Ethereal smoke wraith, dissolving edges ──
      const t = performance.now() * 0.001;

      // Flickering afterimages (phase shifting)
      ctx.globalAlpha = 0.15;
      for (let i = 1; i <= 3; i++) {
        const ox = Math.sin(t * 3 + i) * sr * 0.15;
        const oy = Math.cos(t * 2.5 + i) * sr * 0.1;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(ox, oy, sr * 0.7, sr * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Smoke tendrils rising from bottom
      ctx.fillStyle = this.color + '33';
      for (let i = 0; i < 5; i++) {
        const tx = (i - 2) * sr * 0.25;
        const ty = sr * 0.5 + Math.sin(t * 4 + i) * sr * 0.1;
        const tendrilH = sr * 0.4 + Math.sin(t * 3 + i * 0.5) * sr * 0.15;
        ctx.beginPath();
        ctx.moveTo(tx - sr * 0.08, ty);
        ctx.quadraticCurveTo(tx + Math.sin(t * 5 + i) * sr * 0.1, ty - tendrilH * 0.5, tx, ty - tendrilH);
        ctx.quadraticCurveTo(tx - Math.sin(t * 5 + i) * sr * 0.1, ty - tendrilH * 0.5, tx + sr * 0.08, ty);
        ctx.fill();
      }

      // Core body - wispy translucent form
      const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, sr);
      bodyGrad.addColorStop(0, this.color + 'CC');
      bodyGrad.addColorStop(0.5, this.color + '77');
      bodyGrad.addColorStop(0.8, this.color + '33');
      bodyGrad.addColorStop(1, this.color + '00');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.ellipse(0, sr * 0.1, sr * 0.55, sr * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hollow face area - darker void
      ctx.fillStyle = 'rgba(5,5,15,0.9)';
      ctx.beginPath();
      ctx.ellipse(0, -sr * 0.25, sr * 0.22, sr * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();

      // Single glowing eye (cyclops style - "Death without a face")
      const eyePulse = 0.7 + Math.sin(t * 6) * 0.3;
      ctx.fillStyle = this.accent;
      ctx.shadowColor = this.accent; ctx.shadowBlur = 18 * eyePulse;
      ctx.beginPath();
      ctx.ellipse(0, -sr * 0.28, sr * 0.12 * eyePulse, sr * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner eye glow
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(0, -sr * 0.28, sr * 0.04, sr * 0.02, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Dissolving particle edges
      ctx.fillStyle = this.color + '55';
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + t * 0.5;
        const dist = sr * 0.6 + Math.sin(t * 4 + i * 2) * sr * 0.15;
        const px = Math.cos(angle) * dist;
        const py = Math.sin(angle) * dist * 0.8;
        const pSize = sr * 0.06 + Math.sin(t * 5 + i) * sr * 0.03;
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (charId === 'ghost' || charId === 'shadow_lord' || charId === 'quantum_ghost') {
      // ── Cloaked / Ghost type ──
      const cloakH = sr * 1.3;

      // Flowing cloak shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.moveTo(-sr * 0.7, -sr * 0.3);
      ctx.quadraticCurveTo(-sr * 0.8, sr * 0.5, -sr * 0.5, sr * 0.7);
      ctx.lineTo(sr * 0.5, sr * 0.7);
      ctx.quadraticCurveTo(sr * 0.8, sr * 0.5, sr * 0.7, -sr * 0.3);
      ctx.closePath();
      ctx.fill();

      // Cloak body
      const cGrad = ctx.createLinearGradient(0, -sr * 0.5, 0, sr * 0.6);
      cGrad.addColorStop(0, this.color + 'EE');
      cGrad.addColorStop(0.5, this.color + 'AA');
      cGrad.addColorStop(1, this.color + '44');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.moveTo(-sr * 0.55, -sr * 0.4);
      ctx.quadraticCurveTo(-sr * 0.7, sr * 0.3, -sr * 0.4, sr * 0.55);
      ctx.lineTo(sr * 0.4, sr * 0.55);
      ctx.quadraticCurveTo(sr * 0.7, sr * 0.3, sr * 0.55, -sr * 0.4);
      ctx.closePath();
      ctx.fill();

      // Hood
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, -sr * 0.35, sr * 0.45, Math.PI * 0.8, Math.PI * 2.2);
      ctx.closePath();
      ctx.fill();

      // Dark face void
      ctx.fillStyle = '#0a0a15';
      ctx.beginPath();
      ctx.ellipse(0, -sr * 0.25, sr * 0.28, sr * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glowing eyes
      ctx.fillStyle = this.accent;
      ctx.shadowColor = this.accent; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(-sr * 0.12, -sr * 0.28, sr * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sr * 0.12, -sr * 0.28, sr * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'cyber_ninja') {
      // ── Ninja (Agile, slim) ──
      const bw = sr * 0.5, bh = sr * 0.8, hhr = sr * 0.4;

      // Slim legs
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath(); ctx.ellipse(s * sr * 0.22, sr * 0.25, sr * 0.15, sr * 0.38, 0, 0, Math.PI * 2); ctx.fill();
      }

      // Slim torso
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.roundRect(-bw, -bh * 0.45, bw * 2, bh * 0.75, bw * 0.3); ctx.fill();

      // Crossed straps
      ctx.strokeStyle = this.accent; ctx.lineWidth = sr * 0.06;
      ctx.beginPath(); ctx.moveTo(-bw * 0.8, -bh * 0.4); ctx.lineTo(bw * 0.8, bh * 0.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bw * 0.8, -bh * 0.4); ctx.lineTo(-bw * 0.8, bh * 0.2); ctx.stroke();

      // Arms
      ctx.fillStyle = this.color + 'DD';
      ctx.beginPath(); ctx.roundRect(-bw * 1.15, -bh * 0.35, sr * 0.2, sr * 0.55, sr * 0.08); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw * 0.95, -bh * 0.35, sr * 0.2, sr * 0.55, sr * 0.08); ctx.fill();

      // Masked head
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(0, -bh * 0.5, hhr, 0, Math.PI * 2); ctx.fill();

      // Mask (covers lower face)
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(0, -bh * 0.5 + hhr * 0.2, hhr * 0.85, 0.2, Math.PI - 0.2); ctx.closePath(); ctx.fill();

      // Intense eyes
      ctx.fillStyle = this.accent;
      ctx.shadowColor = this.accent; ctx.shadowBlur = 8;
      const ey = -bh * 0.5 - hhr * 0.1;
      ctx.beginPath(); ctx.ellipse(-hhr * 0.3, ey, hhr * 0.2, hhr * 0.1, -0.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(hhr * 0.3, ey, hhr * 0.2, hhr * 0.1, 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'hacker') {
      // ── THE HACKER - Digital visor, slim tech suit ──
      const bw = sr * 0.5, bh = sr * 0.85, hhr = sr * 0.48;
      // Slim legs
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#1a2a3a';
        ctx.beginPath(); ctx.ellipse(s * sr * 0.22, sr * 0.28, sr * 0.16, sr * 0.38, 0, 0, Math.PI * 2); ctx.fill();
      }
      // Tech bodysuit
      ctx.fillStyle = '#0a1520';
      ctx.beginPath(); ctx.roundRect(-bw, -bh * 0.45, bw * 2, bh * 0.8, bw * 0.3); ctx.fill();
      // Circuit lines
      ctx.strokeStyle = this.color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-bw * 0.8, -bh * 0.4); ctx.lineTo(-bw * 0.4, -bh * 0.2); ctx.lineTo(-bw * 0.4, bh * 0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bw * 0.8, -bh * 0.4); ctx.lineTo(bw * 0.4, -bh * 0.2); ctx.lineTo(bw * 0.4, bh * 0.1); ctx.stroke();
      // LED nodes
      ctx.fillStyle = this.accent;
      ctx.beginPath(); ctx.arc(-bw * 0.4, -bh * 0.2, sr * 0.04, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bw * 0.4, -bh * 0.2, sr * 0.04, 0, Math.PI * 2); ctx.fill();
      // Arms
      ctx.fillStyle = '#0a1520';
      ctx.beginPath(); ctx.roundRect(-bw * 1.1, -bh * 0.32, sr * 0.2, sr * 0.55, sr * 0.06); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw * 0.9, -bh * 0.32, sr * 0.2, sr * 0.55, sr * 0.06); ctx.fill();
      // Holographic wrist display
      ctx.fillStyle = this.accent + '88';
      ctx.beginPath(); ctx.roundRect(-bw * 1.15, bh * 0.05, sr * 0.25, sr * 0.15, 3); ctx.fill();
      // Head
      ctx.fillStyle = '#D8C8B8';
      ctx.beginPath(); ctx.arc(0, -bh * 0.48, hhr * 0.85, 0, Math.PI * 2); ctx.fill();
      // Cyber mohawk
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(-sr * 0.05, -bh * 0.55);
      ctx.lineTo(0, -bh * 0.9);
      ctx.lineTo(sr * 0.05, -bh * 0.55);
      ctx.closePath();
      ctx.fill();
      // VR visor
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.roundRect(-hhr * 0.75, -bh * 0.52, hhr * 1.5, hhr * 0.3, 5); ctx.fill();
      ctx.fillStyle = this.accent;
      ctx.shadowColor = this.accent; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.roundRect(-hhr * 0.65, -bh * 0.5, hhr * 1.3, hhr * 0.2, 3); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'sniper_elite') {
      // ── SNIPER ELITE - Ghillie hood, scope visor ──
      const bw = sr * 0.55, bh = sr * 0.88, hhr = sr * 0.5;
      // Camouflage legs
      ctx.fillStyle = '#3a4a3a';
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(s * sr * 0.24, sr * 0.3, sr * 0.17, sr * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      }
      // Ghillie suit body
      ctx.fillStyle = '#2a3a2a';
      ctx.beginPath(); ctx.roundRect(-bw, -bh * 0.45, bw * 2, bh * 0.82, bw * 0.25); ctx.fill();
      // Ghillie strands
      ctx.strokeStyle = '#4a5a4a'; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const sx = -bw * 0.8 + i * bw * 0.25;
        ctx.beginPath(); ctx.moveTo(sx, -bh * 0.3); ctx.lineTo(sx + sr * 0.1, bh * 0.1); ctx.stroke();
      }
      // Arms in ghillie
      ctx.fillStyle = '#2a3a2a';
      ctx.beginPath(); ctx.roundRect(-bw * 1.1, -bh * 0.35, sr * 0.22, sr * 0.6, sr * 0.08); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw * 0.88, -bh * 0.35, sr * 0.22, sr * 0.6, sr * 0.08); ctx.fill();
      // Head with hood
      ctx.fillStyle = '#3a4a3a';
      ctx.beginPath(); ctx.arc(0, -bh * 0.5, hhr, Math.PI * 0.7, Math.PI * 2.3); ctx.closePath(); ctx.fill();
      // Face paint
      ctx.fillStyle = '#2a3a2a';
      ctx.beginPath(); ctx.arc(0, -bh * 0.48, hhr * 0.7, 0, Math.PI * 2); ctx.fill();
      // Scope eye piece
      ctx.fillStyle = this.accent;
      ctx.shadowColor = this.accent; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(hhr * 0.25, -bh * 0.5, hhr * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      // Other eye
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.ellipse(-hhr * 0.3, -bh * 0.48, hhr * 0.1, hhr * 0.06, 0, 0, Math.PI * 2); ctx.fill();

    } else if (charId === 'ronin') {
      // ── THE RONIN - Samurai armor, katana ──
      const bw = sr * 0.6, bh = sr * 0.9, hhr = sr * 0.5;
      // Hakama pants
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.moveTo(-bw * 0.8, bh * 0.1);
      ctx.lineTo(-bw * 1.0, bh * 0.65);
      ctx.lineTo(bw * 1.0, bh * 0.65);
      ctx.lineTo(bw * 0.8, bh * 0.1);
      ctx.closePath();
      ctx.fill();
      // Samurai chest armor (do)
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.roundRect(-bw, -bh * 0.45, bw * 2, bh * 0.6, [bw * 0.2, bw * 0.2, bw * 0.1, bw * 0.1]); ctx.fill();
      // Armor plates
      ctx.strokeStyle = this.accent; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(-bw * 0.9, -bh * 0.35 + i * bh * 0.15); ctx.lineTo(bw * 0.9, -bh * 0.35 + i * bh * 0.15); ctx.stroke();
      }
      // Shoulder guards (sode)
      ctx.fillStyle = this.accent;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.roundRect(s * bw * 0.85, -bh * 0.5, sr * 0.35 * s, sr * 0.4, 5); ctx.fill();
      }
      // Arms
      ctx.fillStyle = '#2a2a3e';
      ctx.beginPath(); ctx.roundRect(-bw * 1.2, -bh * 0.35, sr * 0.22, sr * 0.55, sr * 0.08); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw * 0.98, -bh * 0.35, sr * 0.22, sr * 0.55, sr * 0.08); ctx.fill();
      // Katana on back
      ctx.fillStyle = '#654321';
      ctx.save(); ctx.rotate(-0.4);
      ctx.beginPath(); ctx.roundRect(bw * 0.3, -bh * 0.8, sr * 0.08, sr * 0.9, 2); ctx.fill();
      ctx.fillStyle = '#888';
      ctx.beginPath(); ctx.roundRect(bw * 0.28, -bh * 0.85, sr * 0.12, sr * 0.08, 1); ctx.fill();
      ctx.restore();
      // Kabuto helmet
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(0, -bh * 0.52, hhr, Math.PI * 0.65, Math.PI * 2.35); ctx.closePath(); ctx.fill();
      // Menpo (face guard)
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(0, -bh * 0.42, hhr * 0.6, 0.3, Math.PI - 0.3); ctx.closePath(); ctx.fill();
      // Fierce eyes
      ctx.fillStyle = this.accent;
      ctx.shadowColor = this.accent; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.ellipse(-hhr * 0.3, -bh * 0.52, hhr * 0.15, hhr * 0.08, -0.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(hhr * 0.3, -bh * 0.52, hhr * 0.15, hhr * 0.08, 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'blade_dancer') {
      // ── BLADE DANCER - Graceful, blades on arms ──
      const bw = sr * 0.5, bh = sr * 0.85, hhr = sr * 0.45;
      // Dancer legs (slim)
      for (const s of [-1, 1]) {
        ctx.fillStyle = this.color + 'CC';
        ctx.beginPath(); ctx.ellipse(s * sr * 0.2, sr * 0.3, sr * 0.12, sr * 0.4, s * 0.1, 0, Math.PI * 2); ctx.fill();
      }
      // Sleek bodysuit
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.roundRect(-bw, -bh * 0.45, bw * 2, bh * 0.75, bw * 0.35); ctx.fill();
      // Decorative swirls
      ctx.strokeStyle = this.accent; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-bw * 0.6, -bh * 0.35);
      ctx.quadraticCurveTo(-bw * 0.3, -bh * 0.1, -bw * 0.6, bh * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bw * 0.6, -bh * 0.35);
      ctx.quadraticCurveTo(bw * 0.3, -bh * 0.1, bw * 0.6, bh * 0.1);
      ctx.stroke();
      // Arms with blade attachments
      ctx.fillStyle = this.color + 'DD';
      ctx.beginPath(); ctx.roundRect(-bw * 1.1, -bh * 0.32, sr * 0.18, sr * 0.5, sr * 0.06); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw * 0.92, -bh * 0.32, sr * 0.18, sr * 0.5, sr * 0.06); ctx.fill();
      // Arm blades
      ctx.fillStyle = '#AADDFF';
      ctx.beginPath();
      ctx.moveTo(-bw * 1.25, -bh * 0.3);
      ctx.lineTo(-bw * 1.5, -bh * 0.15);
      ctx.lineTo(-bw * 1.25, bh * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bw * 1.25, -bh * 0.3);
      ctx.lineTo(bw * 1.5, -bh * 0.15);
      ctx.lineTo(bw * 1.25, bh * 0.1);
      ctx.closePath();
      ctx.fill();
      // Graceful head
      ctx.fillStyle = '#E8D0C0';
      ctx.beginPath(); ctx.arc(0, -bh * 0.5, hhr * 0.85, 0, Math.PI * 2); ctx.fill();
      // Flowing hair
      ctx.fillStyle = this.accent;
      ctx.beginPath();
      ctx.moveTo(-hhr * 0.8, -bh * 0.55);
      ctx.quadraticCurveTo(-hhr * 1.2, -bh * 0.3, -hhr * 0.9, bh * 0.0);
      ctx.lineTo(-hhr * 0.5, -bh * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hhr * 0.8, -bh * 0.55);
      ctx.quadraticCurveTo(hhr * 1.2, -bh * 0.3, hhr * 0.9, bh * 0.0);
      ctx.lineTo(hhr * 0.5, -bh * 0.45);
      ctx.closePath();
      ctx.fill();
      // Determined eyes
      ctx.fillStyle = this.accent;
      ctx.beginPath(); ctx.ellipse(-hhr * 0.3, -bh * 0.48, hhr * 0.12, hhr * 0.08, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(hhr * 0.3, -bh * 0.48, hhr * 0.12, hhr * 0.08, 0, 0, Math.PI * 2); ctx.fill();

    } else if (charId === 'volt_runner') {
      // ── VOLT RUNNER - Electric, speed lines ──
      const bw = sr * 0.5, bh = sr * 0.8, hhr = sr * 0.45;
      // Speed legs
      for (const s of [-1, 1]) {
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.ellipse(s * sr * 0.22, sr * 0.25, sr * 0.14, sr * 0.38, s * 0.15, 0, Math.PI * 2); ctx.fill();
      }
      // Aerodynamic bodysuit
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.roundRect(-bw, -bh * 0.45, bw * 2, bh * 0.75, bw * 0.4); ctx.fill();
      // Lightning bolt pattern
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(-bw * 0.3, -bh * 0.4);
      ctx.lineTo(bw * 0.1, -bh * 0.15);
      ctx.lineTo(-bw * 0.1, -bh * 0.15);
      ctx.lineTo(bw * 0.3, bh * 0.2);
      ctx.lineTo(bw * 0.1, -bh * 0.05);
      ctx.lineTo(bw * 0.3, -bh * 0.05);
      ctx.lineTo(-bw * 0.1, -bh * 0.35);
      ctx.closePath();
      ctx.fill();
      // Speed lines (motion blur)
      ctx.strokeStyle = this.accent + '66'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(-bw * 1.5 - i * sr * 0.15, -bh * 0.3 + i * bh * 0.2);
        ctx.lineTo(-bw * 0.9, -bh * 0.3 + i * bh * 0.2);
        ctx.stroke();
      }
      // Arms
      ctx.fillStyle = this.color + 'CC';
      ctx.beginPath(); ctx.roundRect(-bw * 1.05, -bh * 0.32, sr * 0.18, sr * 0.5, sr * 0.06); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw * 0.87, -bh * 0.32, sr * 0.18, sr * 0.5, sr * 0.06); ctx.fill();
      // Aerodynamic helmet
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.ellipse(0, -bh * 0.5, hhr, hhr * 0.9, 0, 0, Math.PI * 2); ctx.fill();
      // Electric visor
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.roundRect(-hhr * 0.8, -bh * 0.52, hhr * 1.6, hhr * 0.25, 8); ctx.fill();
      ctx.shadowBlur = 0;
      // Antenna
      ctx.strokeStyle = this.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -bh * 0.65); ctx.lineTo(0, -bh * 0.85); ctx.stroke();
      ctx.fillStyle = this.accent;
      ctx.beginPath(); ctx.arc(0, -bh * 0.85, sr * 0.04, 0, Math.PI * 2); ctx.fill();

    } else if (charId === 'mercenary') {
      // ── THE MERCENARY - Heavy armor, ammo belts ──
      const bw = sr * 0.8, bh = sr * 1.05, hhr = sr * 0.52;
      // Combat boots
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath(); ctx.ellipse(s * sr * 0.35, sr * 0.4, sr * 0.28, sr * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.roundRect(s * sr * 0.18, sr * 0.7, sr * 0.35, sr * 0.2, 5); ctx.fill();
      }
      // Heavy combat armor
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.roundRect(-bw, -bh * 0.5, bw * 2, bh * 0.95, [bw * 0.25, bw * 0.25, bw * 0.1, bw * 0.1]); ctx.fill();
      // Tactical vest
      ctx.fillStyle = '#3a4a3a';
      ctx.beginPath(); ctx.roundRect(-bw * 0.85, -bh * 0.45, bw * 1.7, bh * 0.7, 8); ctx.fill();
      // Ammo pouches
      ctx.fillStyle = '#4a5a4a';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.roundRect(-bw * 0.7 + i * bw * 0.45, -bh * 0.15, bw * 0.35, bh * 0.2, 3); ctx.fill();
      }
      // Ammo belt across chest
      ctx.fillStyle = '#654321';
      ctx.save(); ctx.rotate(-0.3);
      ctx.beginPath(); ctx.roundRect(-bw * 1.1, -bh * 0.35, bw * 2.2, sr * 0.12, 3); ctx.fill();
      // Bullets
      ctx.fillStyle = '#C9A227';
      for (let i = 0; i < 8; i++) {
        ctx.beginPath(); ctx.roundRect(-bw * 0.95 + i * bw * 0.26, -bh * 0.34, sr * 0.06, sr * 0.1, 1); ctx.fill();
      }
      ctx.restore();
      // Massive shoulder pads
      ctx.fillStyle = this.accent;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.roundRect(s * bw * 0.8, -bh * 0.55, sr * 0.35 * s, sr * 0.35, 8); ctx.fill();
      }
      // Thick arms
      ctx.fillStyle = this.color + 'CC';
      ctx.beginPath(); ctx.roundRect(-bw * 1.25, -bh * 0.4, sr * 0.35, sr * 0.85, sr * 0.1); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw * 0.9, -bh * 0.4, sr * 0.35, sr * 0.85, sr * 0.1); ctx.fill();
      // Head with combat helmet
      ctx.fillStyle = '#3a4a3a';
      ctx.beginPath(); ctx.arc(0, -bh * 0.58, hhr, 0, Math.PI * 2); ctx.fill();
      // Helmet details
      ctx.fillStyle = '#2a3a2a';
      ctx.beginPath(); ctx.arc(0, -bh * 0.58, hhr * 1.05, Math.PI * 0.6, Math.PI * 2.4); ctx.closePath(); ctx.fill();
      // Night vision mount
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.roundRect(-hhr * 0.15, -bh * 0.75, hhr * 0.3, hhr * 0.25, 3); ctx.fill();
      // Tactical visor
      ctx.fillStyle = this.accent + 'CC';
      ctx.beginPath(); ctx.roundRect(-hhr * 0.7, -bh * 0.58, hhr * 1.4, hhr * 0.22, 5); ctx.fill();

    } else if (charId === 'pyro') {
      // ── THE PYRO - Flame suit, gas tanks ──
      const bw = sr * 0.75, bh = sr * 1.0, hhr = sr * 0.5;
      // Fire-resistant boots
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath(); ctx.ellipse(s * sr * 0.32, sr * 0.38, sr * 0.26, sr * 0.48, 0, 0, Math.PI * 2); ctx.fill();
      }
      // Heat suit
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.roundRect(-bw, -bh * 0.48, bw * 2, bh * 0.9, [bw * 0.25, bw * 0.25, bw * 0.12, bw * 0.12]); ctx.fill();
      // Flame patterns
      ctx.fillStyle = this.accent;
      ctx.beginPath();
      ctx.moveTo(-bw * 0.5, bh * 0.3);
      ctx.quadraticCurveTo(-bw * 0.3, 0, -bw * 0.5, -bh * 0.2);
      ctx.quadraticCurveTo(-bw * 0.2, -bh * 0.1, -bw * 0.4, bh * 0.3);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bw * 0.5, bh * 0.3);
      ctx.quadraticCurveTo(bw * 0.3, 0, bw * 0.5, -bh * 0.2);
      ctx.quadraticCurveTo(bw * 0.2, -bh * 0.1, bw * 0.4, bh * 0.3);
      ctx.fill();
      // Fuel tanks on back (visible from sides)
      ctx.fillStyle = '#444';
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(s * bw * 0.95, -bh * 0.1, sr * 0.15, sr * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      }
      // Tank warning stripes
      ctx.fillStyle = this.color;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.rect(s * bw * 0.88, -bh * 0.2, sr * 0.14, sr * 0.08); ctx.fill();
        ctx.beginPath(); ctx.rect(s * bw * 0.88, bh * 0.0, sr * 0.14, sr * 0.08); ctx.fill();
      }
      // Arms
      ctx.fillStyle = this.color + 'DD';
      ctx.beginPath(); ctx.roundRect(-bw * 1.15, -bh * 0.38, sr * 0.3, sr * 0.75, sr * 0.1); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw * 0.85, -bh * 0.38, sr * 0.3, sr * 0.75, sr * 0.1); ctx.fill();
      // Full face mask
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(0, -bh * 0.55, hhr, 0, Math.PI * 2); ctx.fill();
      // Respirator
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.roundRect(-hhr * 0.6, -bh * 0.45, hhr * 1.2, hhr * 0.5, hhr * 0.15); ctx.fill();
      // Heat-resistant visor (orange glow)
      ctx.fillStyle = this.accent;
      ctx.shadowColor = this.accent; ctx.shadowBlur = 15;
      ctx.beginPath(); ctx.roundRect(-hhr * 0.65, -bh * 0.62, hhr * 1.3, hhr * 0.28, 8); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'overlord') {
      // ── THE OVERLORD - Cape, crown, commanding ──
      const bw = sr * 0.75, bh = sr * 1.0, hhr = sr * 0.52;
      // Royal boots
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath(); ctx.ellipse(s * sr * 0.32, sr * 0.35, sr * 0.25, sr * 0.48, 0, 0, Math.PI * 2); ctx.fill();
      }
      // Flowing cape (behind)
      ctx.fillStyle = this.color + '88';
      ctx.beginPath();
      ctx.moveTo(-bw * 1.2, -bh * 0.45);
      ctx.quadraticCurveTo(-bw * 1.4, bh * 0.2, -bw * 1.0, bh * 0.6);
      ctx.lineTo(bw * 1.0, bh * 0.6);
      ctx.quadraticCurveTo(bw * 1.4, bh * 0.2, bw * 1.2, -bh * 0.45);
      ctx.closePath();
      ctx.fill();
      // Royal armor
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.roundRect(-bw, -bh * 0.48, bw * 2, bh * 0.88, [bw * 0.2, bw * 0.2, bw * 0.1, bw * 0.1]); ctx.fill();
      // Royal emblem
      ctx.fillStyle = this.accent;
      ctx.beginPath();
      ctx.moveTo(0, -bh * 0.35);
      ctx.lineTo(-bw * 0.25, -bh * 0.15);
      ctx.lineTo(0, bh * 0.05);
      ctx.lineTo(bw * 0.25, -bh * 0.15);
      ctx.closePath();
      ctx.fill();
      // Ornate shoulder guards
      ctx.fillStyle = this.accent;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * bw * 0.8, -bh * 0.5);
        ctx.lineTo(s * bw * 1.15, -bh * 0.4);
        ctx.lineTo(s * bw * 1.1, -bh * 0.2);
        ctx.lineTo(s * bw * 0.85, -bh * 0.25);
        ctx.closePath();
        ctx.fill();
      }
      // Arms
      ctx.fillStyle = this.color + 'DD';
      ctx.beginPath(); ctx.roundRect(-bw * 1.18, -bh * 0.38, sr * 0.3, sr * 0.75, sr * 0.1); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw * 0.88, -bh * 0.38, sr * 0.3, sr * 0.75, sr * 0.1); ctx.fill();
      // Regal head
      ctx.fillStyle = '#D8C8B8';
      ctx.beginPath(); ctx.arc(0, -bh * 0.58, hhr * 0.85, 0, Math.PI * 2); ctx.fill();
      // Crown
      ctx.fillStyle = this.accent;
      ctx.beginPath();
      ctx.moveTo(-hhr * 0.7, -bh * 0.65);
      ctx.lineTo(-hhr * 0.5, -bh * 0.85);
      ctx.lineTo(-hhr * 0.25, -bh * 0.7);
      ctx.lineTo(0, -bh * 0.95);
      ctx.lineTo(hhr * 0.25, -bh * 0.7);
      ctx.lineTo(hhr * 0.5, -bh * 0.85);
      ctx.lineTo(hhr * 0.7, -bh * 0.65);
      ctx.closePath();
      ctx.fill();
      // Commanding eyes
      ctx.fillStyle = this.accent;
      ctx.shadowColor = this.accent; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(-hhr * 0.3, -bh * 0.56, hhr * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hhr * 0.3, -bh * 0.56, hhr * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'omega_prime') {
      // ── OMEGA PRIME - Ultimate golden form ──
      const bw = sr * 0.8, bh = sr * 1.05, hhr = sr * 0.55;
      // Powerful legs
      for (const s of [-1, 1]) {
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.ellipse(s * sr * 0.35, sr * 0.38, sr * 0.28, sr * 0.52, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = this.accent; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(s * sr * 0.35, sr * 0.38, sr * 0.28, sr * 0.52, 0, 0, Math.PI * 2); ctx.stroke();
      }
      // Ultimate armor
      const goldGrad = ctx.createLinearGradient(-bw, -bh * 0.5, bw, bh * 0.4);
      goldGrad.addColorStop(0, this.color); goldGrad.addColorStop(0.5, '#FFFFFF'); goldGrad.addColorStop(1, this.accent);
      ctx.fillStyle = goldGrad;
      ctx.beginPath(); ctx.roundRect(-bw, -bh * 0.5, bw * 2, bh * 0.95, [bw * 0.25, bw * 0.25, bw * 0.12, bw * 0.12]); ctx.fill();
      // Omega symbol on chest
      ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -bh * 0.15, sr * 0.2, Math.PI * 0.2, Math.PI * 0.8);
      ctx.moveTo(-sr * 0.18, -bh * 0.08);
      ctx.lineTo(-sr * 0.25, bh * 0.05);
      ctx.moveTo(sr * 0.18, -bh * 0.08);
      ctx.lineTo(sr * 0.25, bh * 0.05);
      ctx.stroke();
      // Epic shoulder armor
      ctx.fillStyle = this.color;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * bw * 0.85, -bh * 0.55);
        ctx.lineTo(s * bw * 1.25, -bh * 0.45);
        ctx.lineTo(s * bw * 1.2, -bh * 0.2);
        ctx.lineTo(s * bw * 0.9, -bh * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = this.accent; ctx.lineWidth = 2;
        ctx.stroke();
      }
      // Powerful arms
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.roundRect(-bw * 1.25, -bh * 0.4, sr * 0.35, sr * 0.85, sr * 0.12); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw * 0.9, -bh * 0.4, sr * 0.35, sr * 0.85, sr * 0.12); ctx.fill();
      // Ultimate helmet
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(0, -bh * 0.58, hhr, 0, Math.PI * 2); ctx.fill();
      // Crown crest
      ctx.fillStyle = this.accent;
      ctx.beginPath();
      ctx.moveTo(-hhr * 0.5, -bh * 0.7);
      ctx.lineTo(0, -bh * 1.0);
      ctx.lineTo(hhr * 0.5, -bh * 0.7);
      ctx.closePath();
      ctx.fill();
      // Power visor
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.roundRect(-hhr * 0.75, -bh * 0.6, hhr * 1.5, hhr * 0.25, 5); ctx.fill();
      ctx.fillStyle = this.accent;
      ctx.shadowColor = this.accent; ctx.shadowBlur = 15;
      ctx.beginPath(); ctx.roundRect(-hhr * 0.65, -bh * 0.58, hhr * 1.3, hhr * 0.18, 3); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'gangster') {
      // ── THE GANGSTER - Fedora hat, suit, cigar ──
      const bw = sr * 0.65, bh = sr * 0.92, hhr = sr * 0.55;
      // Legs in suit pants
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.ellipse(s * sr * 0.29, sr * 0.32, sr * 0.22, sr * 0.44, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.ellipse(s * (sr * 0.3 + s * sr * 0.07), sr * 0.66, sr * 0.26, sr * 0.16, -s * 0.28, 0, Math.PI * 2); ctx.fill();
      }
      // Suit torso
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.roundRect(-bw, -bh * 0.48, bw * 2, bh * 0.86, [bw * 0.3, bw * 0.3, bw * 0.15, bw * 0.15]); ctx.fill();
      // Red tie
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.moveTo(0, -bh * 0.4); ctx.lineTo(-sr * 0.08, -bh * 0.3); ctx.lineTo(0, bh * 0.2); ctx.lineTo(sr * 0.08, -bh * 0.3); ctx.closePath(); ctx.fill();
      // Suit lapels
      ctx.strokeStyle = '#333'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-bw * 0.6, -bh * 0.45); ctx.lineTo(-bw * 0.2, bh * 0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bw * 0.6, -bh * 0.45); ctx.lineTo(bw * 0.2, bh * 0.1); ctx.stroke();
      // Arms in suit
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.roundRect(-bw * 1.18, -bh * 0.36, sr * 0.28, sr * 0.72, sr * 0.1); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw * 0.9, -bh * 0.36, sr * 0.28, sr * 0.72, sr * 0.1); ctx.fill();
      // Head
      ctx.fillStyle = '#E8C89A';
      ctx.beginPath(); ctx.arc(0, -bh * 0.5, hhr * 0.9, 0, Math.PI * 2); ctx.fill();
      // Fedora hat
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.ellipse(0, -bh * 0.65, hhr * 1.3, hhr * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.roundRect(-hhr * 0.7, -bh * 0.85, hhr * 1.4, hhr * 0.5, hhr * 0.15); ctx.fill();
      // Hat band
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.rect(-hhr * 0.7, -bh * 0.72, hhr * 1.4, hhr * 0.12); ctx.fill();
      // Stern eyes
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.ellipse(-hhr * 0.28, -bh * 0.48, hhr * 0.12, hhr * 0.08, -0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(hhr * 0.28, -bh * 0.48, hhr * 0.12, hhr * 0.08, 0.15, 0, Math.PI * 2); ctx.fill();
      // Cigar
      ctx.fillStyle = '#8B4513';
      ctx.beginPath(); ctx.roundRect(hhr * 0.4, -bh * 0.38, sr * 0.35, sr * 0.1, 2); ctx.fill();
      ctx.fillStyle = '#FF4400';
      ctx.beginPath(); ctx.arc(hhr * 0.75, -bh * 0.33, sr * 0.06, 0, Math.PI * 2); ctx.fill();

    } else if (charId === 'engineer') {
      // ── THE ENGINEER - Goggles, tool belt, wrench ──
      const bw = sr * 0.65, bh = sr * 0.92, hhr = sr * 0.55;
      // Work pants
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#3a3a2e';
        ctx.beginPath(); ctx.ellipse(s * sr * 0.29, sr * 0.32, sr * 0.22, sr * 0.44, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a2a1e';
        ctx.beginPath(); ctx.ellipse(s * (sr * 0.3 + s * sr * 0.07), sr * 0.66, sr * 0.26, sr * 0.16, -s * 0.28, 0, Math.PI * 2); ctx.fill();
      }
      // Work vest
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.roundRect(-bw, -bh * 0.48, bw * 2, bh * 0.86, [bw * 0.3, bw * 0.3, bw * 0.15, bw * 0.15]); ctx.fill();
      // Pockets
      ctx.fillStyle = this.accent + '88';
      ctx.beginPath(); ctx.roundRect(-bw * 0.7, -bh * 0.1, bw * 0.5, bh * 0.25, 3); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw * 0.2, -bh * 0.1, bw * 0.5, bh * 0.25, 3); ctx.fill();
      // Tool belt
      ctx.fillStyle = '#654321';
      ctx.beginPath(); ctx.roundRect(-bw * 0.9, bh * 0.18, bw * 1.8, sr * 0.2, 3); ctx.fill();
      // Tools on belt
      ctx.fillStyle = '#888';
      ctx.beginPath(); ctx.roundRect(-bw * 0.6, bh * 0.15, sr * 0.08, sr * 0.25, 2); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw * 0.5, bh * 0.15, sr * 0.08, sr * 0.25, 2); ctx.fill();
      // Arms
      ctx.fillStyle = this.color + 'DD';
      ctx.beginPath(); ctx.roundRect(-bw * 1.18, -bh * 0.36, sr * 0.28, sr * 0.72, sr * 0.1); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw * 0.9, -bh * 0.36, sr * 0.28, sr * 0.72, sr * 0.1); ctx.fill();
      // Head
      ctx.fillStyle = '#E8C89A';
      ctx.beginPath(); ctx.arc(0, -bh * 0.5, hhr * 0.9, 0, Math.PI * 2); ctx.fill();
      // Hard hat
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(0, -bh * 0.55, hhr * 0.95, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = this.accent;
      ctx.beginPath(); ctx.ellipse(0, -bh * 0.5, hhr * 1.1, hhr * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      // Goggles on forehead
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.roundRect(-hhr * 0.6, -bh * 0.58, hhr * 1.2, hhr * 0.25, 5); ctx.fill();
      ctx.fillStyle = '#88CCFF';
      ctx.beginPath(); ctx.ellipse(-hhr * 0.25, -bh * 0.53, hhr * 0.2, hhr * 0.15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(hhr * 0.25, -bh * 0.53, hhr * 0.2, hhr * 0.15, 0, 0, Math.PI * 2); ctx.fill();
      // Eyes
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-hhr * 0.25, -bh * 0.42, hhr * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hhr * 0.25, -bh * 0.42, hhr * 0.1, 0, Math.PI * 2); ctx.fill();

    } else if (charId === 'chemist') {
      // ── THE CHEMIST - Gas mask, lab coat, tubes ──
      const bw = sr * 0.65, bh = sr * 0.92, hhr = sr * 0.55;
      // Legs
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#2a2a2e';
        ctx.beginPath(); ctx.ellipse(s * sr * 0.29, sr * 0.32, sr * 0.22, sr * 0.44, 0, 0, Math.PI * 2); ctx.fill();
      }
      // Lab coat (white/green tinted)
      ctx.fillStyle = '#e8ffe8';
      ctx.beginPath(); ctx.roundRect(-bw * 1.1, -bh * 0.48, bw * 2.2, bh * 1.0, [bw * 0.2, bw * 0.2, bw * 0.3, bw * 0.3]); ctx.fill();
      // Coat buttons
      ctx.fillStyle = this.color;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(0, -bh * 0.25 + i * sr * 0.2, sr * 0.05, 0, Math.PI * 2); ctx.fill();
      }
      // Chemical tubes on chest
      ctx.strokeStyle = this.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-bw * 0.5, -bh * 0.3); ctx.quadraticCurveTo(-bw * 0.7, 0, -bw * 0.4, bh * 0.15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bw * 0.5, -bh * 0.3); ctx.quadraticCurveTo(bw * 0.7, 0, bw * 0.4, bh * 0.15); ctx.stroke();
      // Vials
      ctx.fillStyle = this.accent;
      ctx.beginPath(); ctx.roundRect(-bw * 0.55, bh * 0.1, sr * 0.12, sr * 0.2, 3); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw * 0.35, bh * 0.1, sr * 0.12, sr * 0.2, 3); ctx.fill();
      // Gas mask head
      ctx.fillStyle = '#3a3a3a';
      ctx.beginPath(); ctx.arc(0, -bh * 0.5, hhr, 0, Math.PI * 2); ctx.fill();
      // Respirator
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.roundRect(-hhr * 0.5, -bh * 0.35, hhr * 1.0, hhr * 0.6, hhr * 0.2); ctx.fill();
      // Filter canisters
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.ellipse(-hhr * 0.7, -bh * 0.35, hhr * 0.25, hhr * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(hhr * 0.7, -bh * 0.35, hhr * 0.25, hhr * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      // Goggles
      ctx.fillStyle = this.accent;
      ctx.shadowColor = this.accent; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.ellipse(-hhr * 0.35, -bh * 0.55, hhr * 0.25, hhr * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(hhr * 0.35, -bh * 0.55, hhr * 0.25, hhr * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'medic') {
      // ── THE MEDIC - White coat, medical cross ──
      const bw = sr * 0.65, bh = sr * 0.92, hhr = sr * 0.55;
      // Legs
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#2a4a3a';
        ctx.beginPath(); ctx.ellipse(s * sr * 0.29, sr * 0.32, sr * 0.22, sr * 0.44, 0, 0, Math.PI * 2); ctx.fill();
      }
      // White medical coat
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.roundRect(-bw * 1.1, -bh * 0.48, bw * 2.2, bh * 1.0, [bw * 0.2, bw * 0.2, bw * 0.3, bw * 0.3]); ctx.fill();
      // Green scrubs underneath
      ctx.fillStyle = this.color + '88';
      ctx.beginPath(); ctx.roundRect(-bw * 0.5, -bh * 0.45, bw * 1.0, bh * 0.35, 5); ctx.fill();
      // Medical cross
      ctx.fillStyle = '#FF3333';
      ctx.beginPath(); ctx.roundRect(-sr * 0.08, -bh * 0.35, sr * 0.16, sr * 0.35, 2); ctx.fill();
      ctx.beginPath(); ctx.roundRect(-sr * 0.17, -bh * 0.25, sr * 0.34, sr * 0.15, 2); ctx.fill();
      // Stethoscope
      ctx.strokeStyle = '#333'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-bw * 0.3, -bh * 0.2); ctx.quadraticCurveTo(-bw * 0.5, bh * 0.1, -bw * 0.2, bh * 0.15); ctx.stroke();
      ctx.fillStyle = '#555';
      ctx.beginPath(); ctx.arc(-bw * 0.2, bh * 0.15, sr * 0.08, 0, Math.PI * 2); ctx.fill();
      // Head with surgical cap
      ctx.fillStyle = '#E8C89A';
      ctx.beginPath(); ctx.arc(0, -bh * 0.5, hhr * 0.85, 0, Math.PI * 2); ctx.fill();
      // Surgical cap
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(0, -bh * 0.55, hhr * 0.9, Math.PI, 0); ctx.closePath(); ctx.fill();
      // Face mask pulled down
      ctx.fillStyle = '#88DDAA';
      ctx.beginPath(); ctx.roundRect(-hhr * 0.5, -bh * 0.32, hhr * 1.0, hhr * 0.2, 3); ctx.fill();
      // Kind eyes
      ctx.fillStyle = '#334433';
      ctx.beginPath(); ctx.arc(-hhr * 0.28, -bh * 0.48, hhr * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hhr * 0.28, -bh * 0.48, hhr * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this.accent;
      ctx.beginPath(); ctx.arc(-hhr * 0.26, -bh * 0.47, hhr * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hhr * 0.3, -bh * 0.47, hhr * 0.05, 0, Math.PI * 2); ctx.fill();

    } else if (charId === 'drone_pilot') {
      // ── DRONE PILOT - Headset, controller, tech vest ──
      const bw = sr * 0.65, bh = sr * 0.92, hhr = sr * 0.55;
      // Legs
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#2a3a4a';
        ctx.beginPath(); ctx.ellipse(s * sr * 0.29, sr * 0.32, sr * 0.22, sr * 0.44, 0, 0, Math.PI * 2); ctx.fill();
      }
      // Tech vest
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.roundRect(-bw, -bh * 0.48, bw * 2, bh * 0.86, [bw * 0.3, bw * 0.3, bw * 0.15, bw * 0.15]); ctx.fill();
      // Tech panels
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.roundRect(-bw * 0.7, -bh * 0.35, bw * 1.4, bh * 0.3, 5); ctx.fill();
      // LED indicators
      ctx.fillStyle = this.accent;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.arc(-bw * 0.4 + i * bw * 0.28, -bh * 0.2, sr * 0.04, 0, Math.PI * 2); ctx.fill();
      }
      // Controller in hands
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.roundRect(-bw * 0.4, bh * 0.15, bw * 0.8, sr * 0.18, 5); ctx.fill();
      ctx.fillStyle = this.accent;
      ctx.beginPath(); ctx.arc(-bw * 0.2, bh * 0.22, sr * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bw * 0.2, bh * 0.22, sr * 0.05, 0, Math.PI * 2); ctx.fill();
      // Head
      ctx.fillStyle = '#E8C89A';
      ctx.beginPath(); ctx.arc(0, -bh * 0.5, hhr * 0.85, 0, Math.PI * 2); ctx.fill();
      // Headset
      ctx.strokeStyle = '#333'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, -bh * 0.55, hhr * 0.9, Math.PI * 0.8, Math.PI * 0.2, true); ctx.stroke();
      // Ear pieces
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.ellipse(-hhr * 0.85, -bh * 0.5, hhr * 0.2, hhr * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(hhr * 0.85, -bh * 0.5, hhr * 0.2, hhr * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      // Mic
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-hhr * 0.7, -bh * 0.42); ctx.quadraticCurveTo(-hhr * 0.5, -bh * 0.25, -hhr * 0.2, -bh * 0.3); ctx.stroke();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(-hhr * 0.2, -bh * 0.3, sr * 0.06, 0, Math.PI * 2); ctx.fill();
      // Eyes with HUD reflection
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-hhr * 0.28, -bh * 0.48, hhr * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hhr * 0.28, -bh * 0.48, hhr * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this.accent;
      ctx.beginPath(); ctx.arc(-hhr * 0.25, -bh * 0.5, hhr * 0.04, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hhr * 0.31, -bh * 0.5, hhr * 0.04, 0, Math.PI * 2); ctx.fill();

    } else if (charId === 'frost_walker') {
      // ── FROST WALKER - Ice crystals, cold aura ──
      const bw = sr * 0.65, bh = sr * 0.92, hhr = sr * 0.55;
      // Ice crystal legs
      for (const s of [-1, 1]) {
        ctx.fillStyle = this.color + 'AA';
        ctx.beginPath(); ctx.ellipse(s * sr * 0.29, sr * 0.32, sr * 0.22, sr * 0.44, 0, 0, Math.PI * 2); ctx.fill();
      }
      // Icy torso
      const iceGrad = ctx.createLinearGradient(-bw, -bh * 0.48, bw, bh * 0.38);
      iceGrad.addColorStop(0, this.color); iceGrad.addColorStop(0.5, '#ffffff'); iceGrad.addColorStop(1, this.accent);
      ctx.fillStyle = iceGrad;
      ctx.beginPath(); ctx.roundRect(-bw, -bh * 0.48, bw * 2, bh * 0.86, [bw * 0.3, bw * 0.3, bw * 0.15, bw * 0.15]); ctx.fill();
      // Ice crystals on shoulders
      ctx.fillStyle = '#AAEEFF';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * bw * 0.9, -bh * 0.45);
        ctx.lineTo(s * bw * 1.2, -bh * 0.7);
        ctx.lineTo(s * bw * 1.0, -bh * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(s * bw * 1.0, -bh * 0.5);
        ctx.lineTo(s * bw * 1.35, -bh * 0.55);
        ctx.lineTo(s * bw * 1.05, -bh * 0.4);
        ctx.closePath();
        ctx.fill();
      }
      // Arms
      ctx.fillStyle = this.color + 'CC';
      ctx.beginPath(); ctx.roundRect(-bw * 1.18, -bh * 0.36, sr * 0.28, sr * 0.72, sr * 0.1); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw * 0.9, -bh * 0.36, sr * 0.28, sr * 0.72, sr * 0.1); ctx.fill();
      // Head with ice crown
      ctx.fillStyle = '#CCE8FF';
      ctx.beginPath(); ctx.arc(0, -bh * 0.5, hhr * 0.9, 0, Math.PI * 2); ctx.fill();
      // Ice crown
      ctx.fillStyle = this.accent;
      for (let i = 0; i < 5; i++) {
        const ang = Math.PI + (i - 2) * 0.35;
        const cx = Math.cos(ang) * hhr * 0.7;
        const cy = -bh * 0.5 + Math.sin(ang) * hhr * 0.7;
        ctx.beginPath();
        ctx.moveTo(cx - sr * 0.05, cy);
        ctx.lineTo(cx, cy - sr * 0.25);
        ctx.lineTo(cx + sr * 0.05, cy);
        ctx.closePath();
        ctx.fill();
      }
      // Cold eyes
      ctx.fillStyle = this.accent;
      ctx.shadowColor = this.accent; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(-hhr * 0.28, -bh * 0.48, hhr * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hhr * 0.28, -bh * 0.48, hhr * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'timebreaker') {
      // ── TIMEBREAKER - Clock motifs, time distortion ──
      const bw = sr * 0.65, bh = sr * 0.92, hhr = sr * 0.55;
      // Legs
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#2a2a3e';
        ctx.beginPath(); ctx.ellipse(s * sr * 0.29, sr * 0.32, sr * 0.22, sr * 0.44, 0, 0, Math.PI * 2); ctx.fill();
      }
      // Torso with clock pattern
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.roundRect(-bw, -bh * 0.48, bw * 2, bh * 0.86, [bw * 0.3, bw * 0.3, bw * 0.15, bw * 0.15]); ctx.fill();
      // Clock on chest
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(0, -bh * 0.15, sr * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = this.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -bh * 0.15, sr * 0.28, 0, Math.PI * 2); ctx.stroke();
      // Clock hands
      const timeAng = Date.now() * 0.002;
      ctx.strokeStyle = this.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -bh * 0.15); ctx.lineTo(Math.cos(timeAng) * sr * 0.2, -bh * 0.15 + Math.sin(timeAng) * sr * 0.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -bh * 0.15); ctx.lineTo(Math.cos(timeAng * 12) * sr * 0.15, -bh * 0.15 + Math.sin(timeAng * 12) * sr * 0.15); ctx.stroke();
      // Arms
      ctx.fillStyle = this.color + 'DD';
      ctx.beginPath(); ctx.roundRect(-bw * 1.18, -bh * 0.36, sr * 0.28, sr * 0.72, sr * 0.1); ctx.fill();
      ctx.beginPath(); ctx.roundRect(bw * 0.9, -bh * 0.36, sr * 0.28, sr * 0.72, sr * 0.1); ctx.fill();
      // Hourglass shoulder pads
      ctx.fillStyle = this.accent;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * bw * 0.9, -bh * 0.55);
        ctx.lineTo(s * bw * 1.1, -bh * 0.45);
        ctx.lineTo(s * bw * 0.9, -bh * 0.35);
        ctx.lineTo(s * bw * 1.1, -bh * 0.25);
        ctx.lineTo(s * bw * 0.9, -bh * 0.35);
        ctx.closePath();
        ctx.fill();
      }
      // Head
      ctx.fillStyle = '#E8D8B8';
      ctx.beginPath(); ctx.arc(0, -bh * 0.5, hhr * 0.85, 0, Math.PI * 2); ctx.fill();
      // Time visor
      ctx.fillStyle = this.accent;
      ctx.shadowColor = this.accent; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.roundRect(-hhr * 0.7, -bh * 0.52, hhr * 1.4, hhr * 0.25, 5); ctx.fill();
      ctx.shadowBlur = 0;

    } else if (charId === 'ai_avatar') {
      // ── AI AVATAR - Digital/holographic appearance ──
      const bw = sr * 0.65, bh = sr * 0.92, hhr = sr * 0.55;
      // Digital legs (wireframe style)
      ctx.strokeStyle = this.color; ctx.lineWidth = 2;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(s * sr * 0.29, sr * 0.32, sr * 0.2, sr * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
      }
      // Holographic torso
      ctx.fillStyle = this.color + '44';
      ctx.beginPath(); ctx.roundRect(-bw, -bh * 0.48, bw * 2, bh * 0.86, [bw * 0.3, bw * 0.3, bw * 0.15, bw * 0.15]); ctx.fill();
      ctx.strokeStyle = this.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-bw, -bh * 0.48, bw * 2, bh * 0.86, [bw * 0.3, bw * 0.3, bw * 0.15, bw * 0.15]); ctx.stroke();
      // Digital grid pattern
      ctx.strokeStyle = this.color + '66'; ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(-bw, -bh * 0.4 + i * bh * 0.25); ctx.lineTo(bw, -bh * 0.4 + i * bh * 0.25); ctx.stroke();
      }
      // Binary data flowing
      ctx.fillStyle = this.accent;
      ctx.font = `${sr * 0.12}px monospace`;
      const binY = (Date.now() * 0.05) % (bh * 0.8);
      ctx.fillText('01', -bw * 0.5, -bh * 0.3 + binY * 0.3);
      ctx.fillText('10', bw * 0.2, -bh * 0.1 + binY * 0.2);
      // Arms (wireframe)
      ctx.strokeStyle = this.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-bw * 1.15, -bh * 0.36, sr * 0.25, sr * 0.7, sr * 0.08); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(bw * 0.9, -bh * 0.36, sr * 0.25, sr * 0.7, sr * 0.08); ctx.stroke();
      // Holographic head
      ctx.fillStyle = this.color + '66';
      ctx.beginPath(); ctx.arc(0, -bh * 0.5, hhr * 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = this.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -bh * 0.5, hhr * 0.9, 0, Math.PI * 2); ctx.stroke();
      // Digital face
      ctx.fillStyle = this.accent;
      ctx.shadowColor = this.accent; ctx.shadowBlur = 10;
      // Pixelated eyes
      ctx.fillRect(-hhr * 0.4, -bh * 0.52, hhr * 0.25, hhr * 0.12);
      ctx.fillRect(hhr * 0.15, -bh * 0.52, hhr * 0.25, hhr * 0.12);
      // Digital mouth
      ctx.fillRect(-hhr * 0.3, -bh * 0.38, hhr * 0.6, hhr * 0.06);
      ctx.shadowBlur = 0;

    } else {
      // ── Default Humanoid ──
      const bw = sr * 0.65, bh = sr * 0.92, hhr = sr * 0.55;

      // Legs
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath(); ctx.ellipse(s * sr * 0.29, sr * 0.32, sr * 0.22, sr * 0.44, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#120c06';
        ctx.beginPath(); ctx.ellipse(s * (sr * 0.3 + s * sr * 0.07), sr * 0.66, sr * 0.26, sr * 0.16, -s * 0.28, 0, Math.PI * 2); ctx.fill();
      }

      // Torso
      const tGrad = ctx.createLinearGradient(-bw, -bh * 0.48, bw, bh * 0.38);
      tGrad.addColorStop(0, this.color + 'EE'); tGrad.addColorStop(1, this.color + '88');
      ctx.fillStyle = tGrad;
      ctx.beginPath(); ctx.roundRect(-bw, -bh * 0.48, bw * 2, bh * 0.86, [bw * 0.36, bw * 0.36, bw * 0.2, bw * 0.2]); ctx.fill();
      // Chest plate
      ctx.fillStyle = this.accent + '50';
      ctx.beginPath(); ctx.roundRect(-bw * 0.5, -bh * 0.4, bw * 1.0, bh * 0.44, bw * 0.14); ctx.fill();
      // Vest seam
      ctx.strokeStyle = this.color + '88'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -bh * 0.42); ctx.lineTo(0, bh * 0.04); ctx.stroke();
      // Belt
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(-bw * 0.82, bh * 0.22, bw * 1.64, sr * 0.15, 2); ctx.fill();
      ctx.fillStyle = '#CCC'; ctx.beginPath(); ctx.roundRect(-sr * 0.11, bh * 0.21, sr * 0.22, sr * 0.17, 2); ctx.fill();

      // Off-arm (left)
      ctx.fillStyle = this.color + 'BB';
      ctx.beginPath(); ctx.roundRect(-bw * 1.18, -bh * 0.36, sr * 0.28, sr * 0.72, sr * 0.1); ctx.fill();
      ctx.fillStyle = '#FFDDBB';
      ctx.beginPath(); ctx.ellipse(-bw * 1.06, bh * 0.18, sr * 0.17, sr * 0.19, 0, 0, Math.PI * 2); ctx.fill();

      // Gun arm (right, angled forward)
      ctx.fillStyle = this.color + 'BB';
      ctx.save(); ctx.translate(bw * 1.08, -bh * 0.18); ctx.rotate(-0.44);
      ctx.beginPath(); ctx.roundRect(-sr * 0.13, -sr * 0.62, sr * 0.26, sr * 0.66, sr * 0.1); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#FFDDBB';
      ctx.beginPath(); ctx.ellipse(bw * 0.88 + sr * 0.23, -bh * 0.22 - sr * 0.44, sr * 0.17, sr * 0.2, -0.44, 0, Math.PI * 2); ctx.fill();

      // Head (skin)
      const hGrad = ctx.createRadialGradient(-hhr * 0.22, -bh * 0.5 - hhr * 0.2, 1, 0, -bh * 0.5, hhr);
      hGrad.addColorStop(0, '#FFE8CC'); hGrad.addColorStop(0.7, '#E8C89A'); hGrad.addColorStop(1, '#C8A070');
      ctx.fillStyle = hGrad;
      ctx.beginPath(); ctx.arc(0, -bh * 0.5, hhr, 0, Math.PI * 2); ctx.fill();
      // Helmet / hair
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(0, -bh * 0.5, hhr * 1.02, Math.PI * 0.7, Math.PI * 2.3);
      ctx.lineTo(0, -bh * 0.5); ctx.closePath(); ctx.fill();
      // Visor strip
      ctx.fillStyle = this.accent + '90';
      ctx.beginPath(); ctx.rect(-hhr * 0.85, -bh * 0.5 - hhr * 0.1, hhr * 1.7, hhr * 0.28); ctx.fill();
      // Eyes
      const ey = -bh * 0.5 + hhr * 0.06;
      ctx.fillStyle = '#111122';
      ctx.beginPath(); ctx.ellipse(-hhr * 0.28, ey, hhr * 0.18, hhr * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse( hhr * 0.28, ey, hhr * 0.18, hhr * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this.accent;
      ctx.beginPath(); ctx.arc(-hhr * 0.24, ey, hhr * 0.07, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc( hhr * 0.32, ey, hhr * 0.07, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore(); // end rotated body

    // ── Outer energy ring ──────────────────────────────────────
    const srRing = r * (this.charData.bodyScale || 1.0);
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = this.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, srRing + 4, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;

    // ── Gun (world space) ─────────────────────────────────────
    const gunLen = srRing + 14;
    const gx = x + Math.cos(ang) * gunLen;
    const gy = y + Math.sin(ang) * gunLen;
    const bx0 = x + Math.cos(ang) * (srRing - 2), by0 = y + Math.sin(ang) * (srRing - 2);
    ctx.save();
    if (this._weapon && this._weapon.melee) {
      const tipX = gx + Math.cos(ang) * 10, tipY = gy + Math.sin(ang) * 10;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx0+1.2, by0+1.8); ctx.lineTo(tipX+1.2, tipY+1.8); ctx.stroke();
      ctx.strokeStyle = '#AADDFF'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.lineTo(tipX, tipY); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(tipX, tipY); ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,0.60)'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx0+1.2, by0+1.8); ctx.lineTo(gx+1.2, gy+1.8); ctx.stroke();
      ctx.strokeStyle = wColor; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.lineTo(gx, gy); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.32)'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(bx0-0.8, by0-0.8); ctx.lineTo(gx-0.8, gy-0.8); ctx.stroke();
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(gx - Math.cos(ang)*2, gy - Math.sin(ang)*2);
      ctx.lineTo(gx + Math.cos(ang)*8, gy + Math.sin(ang)*8);
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
        ctx.lineCap      = 'round';
        ctx.beginPath();
        ctx.arc(x, y, swingRange, ang - arcSpan / 2, ang + arcSpan / 2);
        ctx.stroke();
        // Tip glow via globalAlpha
        const tipX = x + Math.cos(ang) * swingRange;
        const tipY = y + Math.sin(ang) * swingRange;
        ctx.globalAlpha = Math.min(1, this._muzzleFlash / 0.12) * 0.72;
        ctx.fillStyle = '#DDEEFF';
        ctx.beginPath(); ctx.arc(tipX, tipY, 5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      } else {
        const fx = x + Math.cos(ang) * (gunLen + 12);
        const fy = y + Math.sin(ang) * (gunLen + 12);
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
      ctx.beginPath(); ctx.arc(x, y, srRing, 0, Math.PI * 2); ctx.fill();
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
      ctx.beginPath(); ctx.arc(x, y, srRing + 8 + Math.sin(et * 3) * 3, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    } else if (this._custEffect === 'static') {
      if (Math.random() < 0.4) {
        ctx.save(); ctx.globalAlpha = 0.55;
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = this.color;
          const ang = Math.random() * Math.PI * 2;
          const d   = srRing + Math.random() * 10;
          ctx.fillRect(x + Math.cos(ang) * d - 1, y + Math.sin(ang) * d - 1, 2, 2);
        }
        ctx.restore();
      }
    } else if (this._custEffect === 'glitch') {
      if (Math.sin(et * 7) > 0.6) {
        const off = (Math.random() - 0.5) * 12;
        ctx.save();
        ctx.globalAlpha = 0.35; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(x + off, y, srRing, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    // ── Player name tag (world space, below circle) ───────────
    if (this._displayName) {
      ctx.save();
      ctx.font = '7px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.fillText(this._displayName, x, y + srRing + 13);
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
    this._sirenT        = 0; // police/swat: drives flashing light phase
    this._mapTheme = mapConfig ? (mapConfig.snow ? 'snow' : mapConfig.desert ? 'desert' : mapConfig.ocean ? 'ocean' : mapConfig.robot ? 'robot' : mapConfig.jungle ? 'jungle' : mapConfig.galactica ? 'galactica' : mapConfig.sky ? 'sky' : mapConfig.dino ? 'dino' : null) : null;
    this._animalType = pal?.animal || null;
  }

  update(dt, player, gameMap, bullets, particles) {
    if (this.dying) {
      this.dyingTimer -= dt;
      if (this.dyingTimer <= 0) this.dead = true;
      return;
    }

    this._animT += dt;
    if (this.type === 'police' || this.type === 'swat' || this.type === 'heavyswat') {
      this._sirenT += dt;
    }
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

    // Minimum distance prevents enemies from overlapping with player
    const playerRadius = 14;
    const minSeparation = this.radius + playerRadius + 8; // Keep a small gap
    const minAttackDist = this._cfg.keepDistance ? this._cfg.keepDistance : Math.max(minSeparation, 45);

    // Push away if too close to player (collision prevention)
    if (dist < minSeparation && dist > 0) {
      const pushDx = this.x - player.x, pushDy = this.y - player.y;
      const pushD = Math.hypot(pushDx, pushDy) || 1;
      const pushAmount = (minSeparation - dist) * 0.5;
      const newX = this.x + (pushDx / pushD) * pushAmount;
      const newY = this.y + (pushDy / pushD) * pushAmount;
      if (!gameMap.isBlockedCircle(newX, this.y, this.radius - 2)) this.x = newX;
      if (!gameMap.isBlockedCircle(this.x, newY, this.radius - 2)) this.y = newY;
    }

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
    if      (this._mapTheme === 'snow')                                             this._renderSnowman(ctx, x, y, r);
    else if (this._mapTheme === 'desert')                                           this._renderDesertEnemy(ctx, x, y, r);
    else if (this._mapTheme === 'ocean')                                            this._renderOceanEnemy(ctx, x, y, r);
    else if (this._mapTheme === 'robot')                                            this._renderRobotUnit(ctx, x, y, r);
    else if (this._mapTheme === 'jungle')                                           this._renderAnimalEnemy(ctx, x, y, r);
    else if (this._mapTheme === 'galactica')                                        this._renderGalacticEnemy(ctx, x, y, r);
    else if (this._mapTheme === 'sky')                                              this._renderSkyEnemy(ctx, x, y, r);
    else if (this._mapTheme === 'dino')                                             this._renderDinoEnemy(ctx, x, y, r);
    else if (this.type === 'mini')                                                  this._renderMini(ctx, x, y, r);
    else if (this.type === 'big')                                                   this._renderBig(ctx, x, y, r);
    else if (this.type === 'police' || this.type === 'swat' || this.type === 'heavyswat') this._renderPolice(ctx, x, y, r);
    else if (this.type === 'sniper')                                                this._renderSniper(ctx, x, y, r);
    else if (this.type === 'bomber')                                                this._renderBomber(ctx, x, y, r);
    else if (this.type === 'juggernaut')                                            this._renderJuggernaut(ctx, x, y, r);
    else                                                                            this._renderNormal(ctx, x, y, r);
    ctx.restore();
  }

  _renderMini(ctx, x, y, r) {
    // Outer glow via globalAlpha instead of shadowBlur/radialGradient
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = this.bodyColor;
    ctx.beginPath(); ctx.arc(x, y, r * 1.45, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.accentColor;
    ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = this.bodyColor;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

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
    // Ground shadow
    ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+4, y+r*0.55, r*1.1, r*0.28, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y); ctx.rotate(this._angle - Math.PI/2);
    const bw = r*0.6, bh = r*0.88, hhr = r*0.5;

    // Legs
    for (const s of [-1,1]) {
      ctx.fillStyle = '#111120';
      ctx.beginPath(); ctx.ellipse(s*r*0.28, r*0.3, r*0.2, r*0.4, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#0a0a10';
      ctx.beginPath(); ctx.ellipse(s*r*0.3+s*r*0.06, r*0.62, r*0.23, r*0.14, -s*0.25, 0, Math.PI*2); ctx.fill();
    }
    // Torso (hoodie) — flat color for perf
    ctx.fillStyle = this.bodyColor + 'EE';
    ctx.beginPath(); ctx.roundRect(-bw, -bh*0.46, bw*2, bh*0.82, [bw*0.35, bw*0.35, bw*0.18, bw*0.18]); ctx.fill();
    // Pocket detail
    ctx.fillStyle = this.bodyColor+'55'; ctx.beginPath(); ctx.roundRect(-bw*0.45, bh*0.02, bw*0.9, bh*0.24, bw*0.12); ctx.fill();
    // Belt
    ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.roundRect(-bw*0.8, bh*0.22, bw*1.6, r*0.14, 2); ctx.fill();
    // Off-arm
    ctx.fillStyle = this.bodyColor+'AA';
    ctx.beginPath(); ctx.roundRect(-bw*1.16, -bh*0.34, r*0.26, r*0.68, r*0.1); ctx.fill();
    ctx.fillStyle = '#EEDDBB'; ctx.beginPath(); ctx.ellipse(-bw*1.04, bh*0.16, r*0.16, r*0.18, 0, 0, Math.PI*2); ctx.fill();
    // Gun arm
    ctx.fillStyle = this.bodyColor+'AA';
    ctx.save(); ctx.translate(bw*1.06, -bh*0.16); ctx.rotate(-0.42);
    ctx.beginPath(); ctx.roundRect(-r*0.12, -r*0.58, r*0.24, r*0.62, r*0.1); ctx.fill(); ctx.restore();
    // Head — flat skin color for perf
    ctx.fillStyle = '#E0B88A';
    ctx.beginPath(); ctx.arc(0, -bh*0.48, hhr, 0, Math.PI*2); ctx.fill();
    // Hood / cap
    ctx.fillStyle = this.bodyColor;
    ctx.beginPath(); ctx.arc(0, -bh*0.48, hhr*1.04, Math.PI*0.65, Math.PI*2.35);
    ctx.lineTo(0, -bh*0.48); ctx.closePath(); ctx.fill();
    // Cap brim forward
    ctx.fillStyle = this.accentColor;
    ctx.beginPath(); ctx.ellipse(0, -bh*0.48-hhr*0.92, hhr*0.7, hhr*0.18, 0, 0, Math.PI*2); ctx.fill();
    // Eyes — bright flat red dots
    const ey = -bh*0.48+hhr*0.08;
    ctx.fillStyle = '#FF2222';
    ctx.beginPath(); ctx.ellipse(-hhr*0.27, ey, hhr*0.16, hhr*0.12, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( hhr*0.27, ey, hhr*0.16, hhr*0.12, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Gun barrel
    const gl = r+12, gx = x+Math.cos(this._angle)*gl, gy = y+Math.sin(this._angle)*gl;
    const ga0x = x+Math.cos(this._angle)*r, ga0y = y+Math.sin(this._angle)*r;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(ga0x+1,ga0y+1.5); ctx.lineTo(gx+1,gy+1.5); ctx.stroke();
    ctx.strokeStyle = this.accentColor; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(ga0x,ga0y); ctx.lineTo(gx,gy); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ga0x-0.7,ga0y-0.7); ctx.lineTo(gx-0.7,gy-0.7); ctx.stroke();
    ctx.restore();

    this._renderHPBar(ctx, x, y, r, 40, 5);
  }

  _renderBig(ctx, x, y, r) {
    // Ground shadow
    ctx.save(); ctx.globalAlpha = 0.36; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+6, y+r*0.58, r*1.2, r*0.32, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Outer armor glow ring — globalAlpha instead of shadowBlur
    ctx.globalAlpha = 0.38;
    ctx.strokeStyle = this.accentColor; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, r+5, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(x, y); ctx.rotate(this._angle - Math.PI/2);
    const bw = r*0.72, bh = r*0.96, hhr = r*0.56;

    // Legs (thick, armored)
    for (const s of [-1,1]) {
      ctx.fillStyle = '#1a1820';
      ctx.beginPath(); ctx.ellipse(s*r*0.32, r*0.32, r*0.26, r*0.46, 0, 0, Math.PI*2); ctx.fill();
      // Knee plate
      ctx.fillStyle = this.accentColor+'88';
      ctx.beginPath(); ctx.ellipse(s*r*0.32, r*0.22, r*0.18, r*0.14, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#0e0c12';
      ctx.beginPath(); ctx.ellipse(s*r*0.33+s*r*0.08, r*0.68, r*0.28, r*0.16, -s*0.25, 0, Math.PI*2); ctx.fill();
    }
    // Heavy torso (armored) — flat color for perf
    ctx.fillStyle = this.bodyColor + 'EE';
    ctx.beginPath(); ctx.roundRect(-bw, -bh*0.48, bw*2, bh*0.88, [bw*0.3, bw*0.3, bw*0.18, bw*0.18]); ctx.fill();
    // Chest armor plates
    ctx.fillStyle = this.accentColor+'40';
    ctx.beginPath(); ctx.roundRect(-bw*0.56, -bh*0.42, bw*0.52, bh*0.46, bw*0.12); ctx.fill();
    ctx.beginPath(); ctx.roundRect( bw*0.04, -bh*0.42, bw*0.52, bh*0.46, bw*0.12); ctx.fill();
    // Center seam
    ctx.fillStyle = '#0a0a10'; ctx.fillRect(-r*0.06, -bh*0.44, r*0.12, bh*0.5);
    // Shoulder pads
    for (const s of [-1,1]) {
      ctx.fillStyle = this.bodyColor;
      ctx.beginPath(); ctx.ellipse(s*bw*1.1, -bh*0.28, r*0.32, r*0.24, s*0.3, 0, Math.PI*2); ctx.fill();
      // Rivet on shoulder
      ctx.fillStyle = this.accentColor;
      ctx.beginPath(); ctx.arc(s*bw*1.1, -bh*0.28, r*0.1, 0, Math.PI*2); ctx.fill();
    }
    // Heavy arms
    for (const s of [-1,1]) {
      ctx.fillStyle = this.bodyColor+'CC';
      ctx.beginPath(); ctx.roundRect(s*bw*0.9, -bh*0.22, s*r*0.32, r*0.7, r*0.1); ctx.fill();
    }
    // Head (armored helmet) — flat color for perf
    ctx.fillStyle = this.bodyColor;
    ctx.beginPath(); ctx.arc(0, -bh*0.48, hhr, 0, Math.PI*2); ctx.fill();
    // Visor (red cyclops)
    ctx.fillStyle = '#FF4400';
    ctx.beginPath(); ctx.rect(-hhr*0.8, -bh*0.48-hhr*0.12, hhr*1.6, hhr*0.3); ctx.fill();
    ctx.fillStyle = '#FFAA33';
    ctx.beginPath(); ctx.arc(0, -bh*0.48, hhr*0.16, 0, Math.PI*2); ctx.fill();
    // Helmet ridge
    ctx.fillStyle = this.accentColor;
    ctx.beginPath(); ctx.rect(-hhr*0.12, -bh*0.48-hhr, hhr*0.24, hhr); ctx.fill();
    ctx.restore();

    // Heavy gun
    const gl = r+14, gx = x+Math.cos(this._angle)*gl, gy = y+Math.sin(this._angle)*gl;
    const gsx = x+Math.cos(this._angle)*(r-3), gsy = y+Math.sin(this._angle)*(r-3);
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.60)'; ctx.lineWidth = 13;
    ctx.beginPath(); ctx.moveTo(gsx+1.5,gsy+2); ctx.lineTo(gx+1.5,gy+2); ctx.stroke();
    ctx.strokeStyle = this.accentColor; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(gsx,gsy); ctx.lineTo(gx,gy); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.20)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(gsx-1,gsy-1); ctx.lineTo(gx-1,gy-1); ctx.stroke();
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(gx,gy); ctx.lineTo(gx+Math.cos(this._angle)*14,gy+Math.sin(this._angle)*14); ctx.stroke();
    ctx.restore();

    this._renderHPBar(ctx, x, y, r, 60, 6);
  }

  _renderPolice(ctx, x, y, r) {
    const isSwat  = this.type === 'swat' || this.type === 'heavyswat';
    const isHeavy = this.type === 'heavyswat';
    const bodyCol   = isSwat ? '#181828' : '#1144BB';
    const accentCol = isSwat ? (isHeavy ? '#5566AA' : '#7788CC') : '#4488FF';
    const eyeCol    = isSwat ? '#FF5500' : '#88BBFF';

    // Ground shadow
    ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+4, y+r*0.55, r*1.1, r*0.28, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y); ctx.rotate(this._angle - Math.PI/2);
    const bw = r*(isHeavy?0.7:0.62), bh = r*(isHeavy?0.94:0.9), hhr = r*(isHeavy?0.56:0.52);

    // Legs
    for (const s of [-1,1]) {
      ctx.fillStyle = isSwat ? '#101018' : '#0a1a44';
      ctx.beginPath(); ctx.ellipse(s*r*0.28, r*0.3, r*0.21, r*0.42, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#080810';
      ctx.beginPath(); ctx.ellipse(s*r*0.3+s*r*0.06, r*0.64, r*0.24, r*0.14, -s*0.25, 0, Math.PI*2); ctx.fill();
    }
    // Torso (uniform) — flat color for perf
    ctx.fillStyle = bodyCol + 'EE';
    ctx.beginPath(); ctx.roundRect(-bw, -bh*0.46, bw*2, bh*0.84, [bw*0.32, bw*0.32, bw*0.18, bw*0.18]); ctx.fill();
    if (!isSwat) {
      // Police badge
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.arc(0, -bh*0.16, r*0.15, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#AA8800'; ctx.font = `bold ${Math.round(r*0.1)}px monospace`; ctx.textAlign = 'center';
      ctx.fillText('★', 0, -bh*0.12);
      // Blue stripe
      ctx.fillStyle = accentCol+'88';
      ctx.beginPath(); ctx.roundRect(-bw*0.5, -bh*0.46, bw*1.0, bh*0.12, bw*0.1); ctx.fill();
    } else {
      // SWAT tactical vest
      ctx.fillStyle = accentCol+'30';
      ctx.beginPath(); ctx.roundRect(-bw*0.52, -bh*0.4, bw*1.04, bh*0.44, bw*0.12); ctx.fill();
      ctx.strokeStyle = accentCol+'60'; ctx.lineWidth = 1;
      ctx.strokeRect(-bw*0.52, -bh*0.4, bw*1.04, bh*0.44);
      // SWAT text
      ctx.fillStyle = '#CCDDFF'; ctx.font = `bold ${Math.round(r*0.14)}px monospace`; ctx.textAlign = 'center';
      ctx.fillText('SWAT', 0, -bh*0.14);
    }
    // Belt
    ctx.fillStyle = '#0a0a14'; ctx.beginPath(); ctx.roundRect(-bw*0.82, bh*0.2, bw*1.64, r*0.14, 2); ctx.fill();
    // Arms
    ctx.fillStyle = bodyCol+'BB';
    ctx.beginPath(); ctx.roundRect(-bw*1.14, -bh*0.34, r*0.26, r*0.7, r*0.1); ctx.fill();
    ctx.fillStyle = '#EEDDBB'; ctx.beginPath(); ctx.ellipse(-bw*1.02, bh*0.18, r*0.16, r*0.18, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = bodyCol+'BB';
    ctx.save(); ctx.translate(bw*1.06, -bh*0.16); ctx.rotate(-0.42);
    ctx.beginPath(); ctx.roundRect(-r*0.12, -r*0.58, r*0.24, r*0.62, r*0.1); ctx.fill(); ctx.restore();
    // Head (helmet) — flat color for perf
    ctx.fillStyle = isSwat ? '#222233' : '#1144CC';
    ctx.beginPath(); ctx.arc(0, -bh*0.48, hhr, 0, Math.PI*2); ctx.fill();
    // Visor
    ctx.fillStyle = isSwat ? 'rgba(60,80,200,0.35)' : 'rgba(80,120,255,0.4)';
    ctx.beginPath(); ctx.rect(-hhr*0.82, -bh*0.48-hhr*0.1, hhr*1.64, hhr*0.28); ctx.fill();
    // Cap brim / helmet rim
    ctx.fillStyle = isSwat ? '#222233' : '#001166';
    ctx.beginPath(); ctx.ellipse(0, -bh*0.48-hhr*0.9, hhr*0.82, hhr*0.2, 0, 0, Math.PI*2); ctx.fill();
    // Eyes — flat color
    const ey = -bh*0.48+hhr*0.06;
    ctx.fillStyle = eyeCol;
    ctx.beginPath(); ctx.ellipse(-hhr*0.27, ey, hhr*0.16, hhr*0.12, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( hhr*0.27, ey, hhr*0.16, hhr*0.12, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Gun
    const gl = r+(isHeavy?17:12);
    const gx = x+Math.cos(this._angle)*gl, gy = y+Math.sin(this._angle)*gl;
    const gsxP = x+Math.cos(this._angle)*(r-2), gsyP = y+Math.sin(this._angle)*(r-2);
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = (isHeavy?9:4)+3;
    ctx.beginPath(); ctx.moveTo(gsxP+1.2,gsyP+1.8); ctx.lineTo(gx+1.2,gy+1.8); ctx.stroke();
    ctx.shadowColor = accentCol; ctx.shadowBlur = 6;
    ctx.strokeStyle = accentCol; ctx.lineWidth = isHeavy?9:4;
    ctx.beginPath(); ctx.moveTo(gsxP,gsyP); ctx.lineTo(gx,gy); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = isHeavy?2.5:1.5; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.moveTo(gsxP-0.8,gsyP-0.8); ctx.lineTo(gx-0.8,gy-0.8); ctx.stroke();
    ctx.restore();

    this._renderHPBar(ctx, x, y, r, isHeavy?56:40, isHeavy?6:5);

    // ── Police/SWAT siren lights (alternating red ↔ blue, fixed above head) ─
    if (!this.dying) {
      const phase = (this._sirenT * 5) % 1;
      const redOn = phase < 0.5;
      // Fixed world-space position: centered directly above the officer
      const ly = y - r - 7;
      ctx.save();
      // Red light (left side, fixed)
      const redCol  = redOn  ? '#FF1010' : '#881010';
      const redGlow = redOn  ? '#FF0000' : '#440000';
      ctx.shadowColor = redGlow; ctx.shadowBlur = redOn ? 18 : 4;
      ctx.fillStyle   = redCol; ctx.globalAlpha = redOn ? 1.0 : 0.35;
      ctx.beginPath(); ctx.arc(x - 6, ly, 4.5, 0, Math.PI * 2); ctx.fill();
      // Blue light (right side, fixed)
      const bluCol  = redOn  ? '#103088' : '#1030FF';
      const bluGlow = redOn  ? '#001144' : '#0044FF';
      ctx.shadowColor = bluGlow; ctx.shadowBlur = redOn ? 4 : 18;
      ctx.fillStyle   = bluCol; ctx.globalAlpha = redOn ? 0.35 : 1.0;
      ctx.beginPath(); ctx.arc(x + 6, ly, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      // Ground colour spill (additive)
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.09;
      ctx.fillStyle = redOn ? '#FF0000' : '#0044FF';
      ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  _renderSniper(ctx, x, y, r) {
    // Ground shadow
    ctx.save(); ctx.globalAlpha = 0.24; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+4, y+r*0.52, r*1.05, r*0.26, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Scope/laser ring
    ctx.globalAlpha = 0.28; ctx.strokeStyle = '#88DDFF'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, r+5, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(x, y); ctx.rotate(this._angle - Math.PI/2);
    const bw = r*0.56, bh = r*0.88, hhr = r*0.5;

    // Legs (sleek, camo)
    for (const s of [-1,1]) {
      ctx.fillStyle = '#1a2218';
      ctx.beginPath(); ctx.ellipse(s*r*0.26, r*0.28, r*0.19, r*0.4, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#0e120c';
      ctx.beginPath(); ctx.ellipse(s*r*0.27+s*r*0.06, r*0.6, r*0.22, r*0.13, -s*0.22, 0, Math.PI*2); ctx.fill();
    }
    // Long coat torso — flat color for perf
    ctx.fillStyle = this.bodyColor + 'DD';
    ctx.beginPath(); ctx.roundRect(-bw, -bh*0.46, bw*2, bh*0.84, [bw*0.3, bw*0.3, bw*0.14, bw*0.14]); ctx.fill();
    // Coat lapels
    ctx.fillStyle = this.bodyColor+'88';
    ctx.beginPath(); ctx.moveTo(-bw*0.5,-bh*0.46); ctx.lineTo(0,-bh*0.1); ctx.lineTo(bw*0.5,-bh*0.46); ctx.closePath(); ctx.fill();
    // Scope device on chest
    ctx.fillStyle = '#88DDFF';
    ctx.beginPath(); ctx.arc(0, -bh*0.18, r*0.12, 0, Math.PI*2); ctx.fill();
    // Belt
    ctx.fillStyle = '#151512'; ctx.beginPath(); ctx.roundRect(-bw*0.8, bh*0.2, bw*1.6, r*0.13, 2); ctx.fill();
    // Off-arm
    ctx.fillStyle = this.bodyColor+'AA';
    ctx.beginPath(); ctx.roundRect(-bw*1.12, -bh*0.32, r*0.24, r*0.66, r*0.1); ctx.fill();
    // Head (tactical balaclava)
    const hg = ctx.createRadialGradient(-hhr*0.18,-bh*0.5-hhr*0.18,1, 0,-bh*0.48,hhr);
    hg.addColorStop(0,'#2a3428'); hg.addColorStop(1,'#1a2018');
    ctx.fillStyle = hg; ctx.shadowColor = '#334433'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0, -bh*0.48, hhr, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    // Scope eye piece
    ctx.fillStyle = '#88DDFF'; ctx.shadowColor = '#44AAFF'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.ellipse(hhr*0.28, -bh*0.48+hhr*0.08, hhr*0.22, hhr*0.16, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#002244'; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.ellipse(hhr*0.28, -bh*0.48+hhr*0.08, hhr*0.12, hhr*0.09, 0, 0, Math.PI*2); ctx.fill();
    // Other eye (glowing blue)
    ctx.fillStyle = '#4499FF'; ctx.shadowColor = '#2277FF'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.ellipse(-hhr*0.28, -bh*0.48+hhr*0.08, hhr*0.14, hhr*0.11, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Long rifle
    const gl = r+22;
    const gbx = x+Math.cos(this._angle)*(r-2), gby = y+Math.sin(this._angle)*(r-2);
    const gtx = x+Math.cos(this._angle)*gl, gty = y+Math.sin(this._angle)*gl;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(gbx+1.2,gby+1.8); ctx.lineTo(gtx+1.2,gty+1.8); ctx.stroke();
    ctx.shadowColor = '#88DDFF'; ctx.shadowBlur = 8;
    ctx.strokeStyle = '#88DDFF'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(gbx,gby); ctx.lineTo(gtx,gty); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.30)'; ctx.lineWidth = 1.2; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.moveTo(gbx-0.8,gby-0.8); ctx.lineTo(gtx-0.8,gty-0.8); ctx.stroke();
    // Scope
    ctx.strokeStyle = '#CCDDFF'; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x+Math.cos(this._angle)*(r+4), y+Math.sin(this._angle)*(r+4));
    ctx.lineTo(x+Math.cos(this._angle)*(r+12), y+Math.sin(this._angle)*(r+12));
    ctx.stroke();
    ctx.restore();
    this._renderHPBar(ctx, x, y, r, 42, 5);
  }

  _renderBomber(ctx, x, y, r) {
    // Ground shadow
    ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+4, y+r*0.56, r*1.1, r*0.28, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Vest heat glow
    ctx.save(); ctx.strokeStyle = '#FF660044'; ctx.lineWidth = 3;
    ctx.shadowColor = '#FF4400'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(x, y, r+4, 0, Math.PI*2); ctx.stroke(); ctx.restore();

    ctx.save();
    ctx.translate(x, y); ctx.rotate(this._angle - Math.PI/2);
    const bw = r*0.66, bh = r*0.9, hhr = r*0.5;

    // Legs (stocky)
    for (const s of [-1,1]) {
      ctx.fillStyle = '#1a1208';
      ctx.beginPath(); ctx.ellipse(s*r*0.3, r*0.32, r*0.24, r*0.43, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#0e0a04';
      ctx.beginPath(); ctx.ellipse(s*r*0.32+s*r*0.07, r*0.65, r*0.26, r*0.15, -s*0.25, 0, Math.PI*2); ctx.fill();
    }
    // Explosive vest torso
    const tg = ctx.createLinearGradient(-bw,-bh*0.46, bw, bh*0.36);
    tg.addColorStop(0, '#4a3822'); tg.addColorStop(0.5, '#3a2a18'); tg.addColorStop(1, '#2a1c10');
    ctx.fillStyle = tg; ctx.shadowColor = '#FF6600'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.roundRect(-bw, -bh*0.46, bw*2, bh*0.84, [bw*0.3, bw*0.3, bw*0.18, bw*0.18]); ctx.fill();
    ctx.shadowBlur = 0;
    // Vest pockets (bomb pouches)
    const pouchColor = '#556644';
    for (const [px2, py2] of [[-bw*0.55,-bh*0.36],[bw*0.15,-bh*0.36],[-bw*0.55,-bh*0.06],[bw*0.15,-bh*0.06]]) {
      ctx.fillStyle = pouchColor; ctx.strokeStyle = '#667755'; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.roundRect(px2, py2, bw*0.38, bh*0.24, 3); ctx.fill(); ctx.stroke();
    }
    // Vest straps (orange warning)
    ctx.strokeStyle = '#FFAA22'; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.moveTo(-bw*0.12,-bh*0.46); ctx.lineTo(-bw*0.12, bh*0.22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( bw*0.12,-bh*0.46); ctx.lineTo( bw*0.12, bh*0.22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-bw*0.5, -bh*0.12); ctx.lineTo( bw*0.5, -bh*0.12); ctx.stroke();
    ctx.globalAlpha = 1;
    // Belt with detonator
    ctx.fillStyle = '#0e0a04'; ctx.beginPath(); ctx.roundRect(-bw*0.8, bh*0.2, bw*1.6, r*0.15, 2); ctx.fill();
    ctx.fillStyle = '#FF3300'; ctx.shadowColor = '#FF3300'; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.roundRect(-r*0.18, bh*0.19, r*0.36, r*0.18, 3); ctx.fill();
    ctx.shadowBlur = 0;
    // Arms
    ctx.fillStyle = '#3a2a18BB';
    ctx.beginPath(); ctx.roundRect(-bw*1.14,-bh*0.34, r*0.28, r*0.7, r*0.1); ctx.fill();
    ctx.fillStyle = '#EEDDBB'; ctx.beginPath(); ctx.ellipse(-bw*1.02, bh*0.18, r*0.17, r*0.19, 0, 0, Math.PI*2); ctx.fill();
    // Head (balaclava, angry)
    const hg = ctx.createRadialGradient(-hhr*0.18,-bh*0.5-hhr*0.18,1, 0,-bh*0.48,hhr);
    hg.addColorStop(0,'#2a2010'); hg.addColorStop(1,'#1a1408');
    ctx.fillStyle = hg; ctx.shadowColor = '#FF4400'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0, -bh*0.48, hhr, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    // Angry red eyes
    ctx.fillStyle = '#FF4400'; ctx.shadowColor = '#FF2200'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.ellipse(-hhr*0.3, -bh*0.48+hhr*0.06, hhr*0.2, hhr*0.13, -0.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( hhr*0.3, -bh*0.48+hhr*0.06, hhr*0.2, hhr*0.13,  0.2, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    // Angry brow line
    ctx.strokeStyle = '#FF6622'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-hhr*0.5,-bh*0.48-hhr*0.02); ctx.lineTo(-hhr*0.12,-bh*0.48+hhr*0.06); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( hhr*0.5,-bh*0.48-hhr*0.02); ctx.lineTo( hhr*0.12,-bh*0.48+hhr*0.06); ctx.stroke();
    ctx.restore();

    // Bomb in hand (world space)
    const bx2 = x+Math.cos(this._angle)*(r+10), by2 = y+Math.sin(this._angle)*(r+10);
    ctx.save();
    ctx.fillStyle = '#334433'; ctx.strokeStyle = '#88CC88'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(bx2,by2, 8, 6, this._angle, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FF3300'; ctx.shadowColor = '#FF3300'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(bx2+Math.cos(this._angle-Math.PI/2)*8, by2+Math.sin(this._angle-Math.PI/2)*8, 3, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    this._renderHPBar(ctx, x, y, r, 44, 5);
  }

  _renderJuggernaut(ctx, x, y, r) {
    // Massive ground shadow
    ctx.save(); ctx.globalAlpha = 0.42; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+8, y+r*0.62, r*1.3, r*0.35, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Power armor aura
    ctx.save(); ctx.strokeStyle = '#FFAA0055'; ctx.lineWidth = 4;
    ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.arc(x, y, r+6, 0, Math.PI*2); ctx.stroke(); ctx.restore();

    ctx.save();
    ctx.translate(x, y); ctx.rotate(this._angle - Math.PI/2);
    const bw = r*0.82, bh = r*1.02, hhr = r*0.6;

    // Legs (massive power armor legs)
    for (const s of [-1,1]) {
      ctx.fillStyle = '#2a2a2a';
      ctx.beginPath(); ctx.ellipse(s*r*0.38, r*0.35, r*0.3, r*0.5, 0, 0, Math.PI*2); ctx.fill();
      // Leg armor plates
      ctx.fillStyle = '#444444';
      ctx.beginPath(); ctx.ellipse(s*r*0.38, r*0.2, r*0.22, r*0.18, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FFAA00'; ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.arc(s*r*0.38, r*0.2, r*0.09, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      // Boot
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.ellipse(s*r*0.4+s*r*0.1, r*0.72, r*0.32, r*0.18, -s*0.25, 0, Math.PI*2); ctx.fill();
    }
    // Massive torso (power armor)
    const tg = ctx.createLinearGradient(-bw,-bh*0.48, bw, bh*0.4);
    tg.addColorStop(0, '#555555'); tg.addColorStop(0.5, '#333333'); tg.addColorStop(1, '#111111');
    ctx.fillStyle = tg; ctx.shadowColor = '#666666'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.roundRect(-bw,-bh*0.48, bw*2, bh*0.9, [bw*0.28, bw*0.28, bw*0.16, bw*0.16]); ctx.fill();
    ctx.shadowBlur = 0;
    // Chest armor segments
    ctx.fillStyle = '#444444'; ctx.strokeStyle = '#666666'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(-bw*0.6,-bh*0.44, bw*0.54, bh*0.46, 5); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect( bw*0.06,-bh*0.44, bw*0.54, bh*0.46, 5); ctx.fill(); ctx.stroke();
    // Chest reactor core
    ctx.fillStyle = '#FFAA00'; ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(0, -bh*0.18, r*0.18, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFEE88'; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(0, -bh*0.18, r*0.09, 0, Math.PI*2); ctx.fill();
    // Spine bolts
    ctx.fillStyle = '#888888';
    ctx.beginPath(); ctx.moveTo(-r*0.08,-bh*0.46); ctx.lineTo(r*0.08,-bh*0.46);
    ctx.lineTo(r*0.08, bh*0.28); ctx.lineTo(-r*0.08, bh*0.28); ctx.fill();
    // Massive shoulder pads
    for (const s of [-1,1]) {
      ctx.fillStyle = '#555555'; ctx.shadowColor = '#444444'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.ellipse(s*bw*1.18,-bh*0.32, r*0.42, r*0.3, s*0.25, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FFAA00'; ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.arc(s*bw*1.18,-bh*0.32, r*0.13, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    // Heavy arms
    for (const s of [-1,1]) {
      ctx.fillStyle = '#444444';
      ctx.beginPath(); ctx.roundRect(s*bw*0.92, -bh*0.24, s*r*0.38, r*0.78, r*0.12); ctx.fill();
    }
    // Head (full face power helmet)
    const hg = ctx.createRadialGradient(-hhr*0.2,-bh*0.5-hhr*0.2,1, 0,-bh*0.48,hhr);
    hg.addColorStop(0,'#555555'); hg.addColorStop(1,'#222222');
    ctx.fillStyle = hg; ctx.shadowColor = '#666666'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(0, -bh*0.48, hhr, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    // Full visor (glowing orange/red)
    ctx.fillStyle = '#FF4400'; ctx.shadowColor = '#FF2200'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.rect(-hhr*0.84, -bh*0.48-hhr*0.12, hhr*1.68, hhr*0.32); ctx.fill();
    // Dual eye scanners
    ctx.fillStyle = '#FFEE44'; ctx.shadowColor = '#FFCC00'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.ellipse(-hhr*0.3, -bh*0.48, hhr*0.2, hhr*0.14, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( hhr*0.3, -bh*0.48, hhr*0.2, hhr*0.14, 0, 0, Math.PI*2); ctx.fill();
    // Helmet crest
    ctx.fillStyle = '#FFAA00'; ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.rect(-r*0.14, -bh*0.48-hhr, r*0.28, hhr*0.65); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // 3x Minigun barrels
    const gl = r+14;
    for (let i = -1; i <= 1; i++) {
      const off = i*4;
      const ox = Math.cos(this._angle+Math.PI/2)*off, oy = Math.sin(this._angle+Math.PI/2)*off;
      const mg0x = x+ox+Math.cos(this._angle)*(r-2), mg0y = y+oy+Math.sin(this._angle)*(r-2);
      const mg1x = x+ox+Math.cos(this._angle)*gl,    mg1y = y+oy+Math.sin(this._angle)*gl;
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(mg0x+1.2,mg0y+1.8); ctx.lineTo(mg1x+1.2,mg1y+1.8); ctx.stroke();
      ctx.strokeStyle = '#FFAA00'; ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 5; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(mg0x,mg0y); ctx.lineTo(mg1x,mg1y); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,220,100,0.30)'; ctx.lineWidth = 1.5; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.moveTo(mg0x-0.8,mg0y-0.8); ctx.lineTo(mg1x-0.8,mg1y-0.8); ctx.stroke();
      ctx.restore();
    }
    this._renderHPBar(ctx, x, y, r, 70, 8);
  }

  // ── SNOWMAN: themed render for snow maps ──────────────────
  _renderSnowman(ctx, x, y, r) {
    const isMini   = this.type === 'mini';
    const isBig    = this.type === 'big' || this.type === 'juggernaut';
    const isPolice = this.type === 'police' || this.type === 'swat' || this.type === 'heavyswat';
    const isBomber = this.type === 'bomber';

    // Ground shadow
    ctx.save(); ctx.globalAlpha = 0.20; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+2, y+r*0.60, r*(isBig?1.10:0.88), r*0.26, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2);

    const ss = isMini ? 0.78 : isBig ? 1.22 : 1.0;
    const sb = r * 0.50 * ss;  // bottom sphere radius
    const sm = r * 0.38 * ss;  // middle sphere radius
    const sh = r * 0.30 * ss;  // head sphere radius

    const by_ = r * 0.26;
    const my_ = by_ - sb * 0.78 - sm * 0.78;
    const hy_ = my_ - sm * 0.78 - sh * 0.78;

    // Snow ball draw helper
    const drawBall = (cy, br) => {
      const g = ctx.createRadialGradient(-br*0.28, cy-br*0.28, 0.5, 0, cy, br);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#d8eeff'); g.addColorStop(1, '#9abbcc');
      ctx.fillStyle = g; ctx.shadowColor = '#aaddff'; ctx.shadowBlur = 7;
      ctx.beginPath(); ctx.arc(0, cy, br, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    };

    if (isMini) {
      // 2-ball mini snowman
      const by2 = r * 0.18, hy2 = by2 - sb * 0.88;
      drawBall(by2, sb);
      drawBall(hy2, sh * 1.1);
      // Eyes
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-sh*0.28, hy2 - sh*0.06, sh*0.10, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( sh*0.28, hy2 - sh*0.06, sh*0.10, 0, Math.PI*2); ctx.fill();
      // Carrot nose
      ctx.fillStyle = '#FF6600';
      ctx.beginPath(); ctx.moveTo(0, hy2 - sh*0.28); ctx.lineTo(sh*0.11, hy2 + sh*0.04); ctx.lineTo(-sh*0.11, hy2 + sh*0.04); ctx.closePath(); ctx.fill();
    } else {
      // 3-ball snowman
      drawBall(by_, sb);
      drawBall(my_, sm);
      drawBall(hy_, sh);

      // Coal buttons (3) on middle
      ctx.fillStyle = '#1a1a2a';
      for (let i = 0; i < 3; i++)
        { ctx.beginPath(); ctx.arc(0, my_ - sm*0.28 + i*sm*0.30, sm*0.08, 0, Math.PI*2); ctx.fill(); }

      // Stick arms
      ctx.strokeStyle = '#5a3a18'; ctx.lineWidth = isBig ? 3 : 2; ctx.lineCap = 'round';
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * sm * 0.95, my_ + sm*0.10);
        ctx.lineTo(s * (sm * 0.95 + r*0.46), my_ + sm*0.10 - r*0.18*s);
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s*(sm*0.95 + r*0.28), my_ + sm*0.10 - r*0.12*s);
        ctx.lineTo(s*(sm*0.95 + r*0.40), my_ + sm*0.10 - r*0.30*s);
        ctx.stroke();
      }

      // Coal eyes
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-sh*0.30, hy_ - sh*0.06, sh*0.10, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( sh*0.30, hy_ - sh*0.06, sh*0.10, 0, Math.PI*2); ctx.fill();

      // Carrot nose
      ctx.fillStyle = '#FF6600';
      ctx.beginPath(); ctx.moveTo(0, hy_ - sh*0.30); ctx.lineTo(sh*0.11, hy_ + sh*0.05); ctx.lineTo(-sh*0.11, hy_ + sh*0.05); ctx.closePath(); ctx.fill();

      // Mouth (coal dots)
      ctx.fillStyle = '#111';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.arc(i * sh*0.14, hy_ + sh*0.32 + Math.abs(i)*sh*0.05, sh*0.06, 0, Math.PI*2); ctx.fill();
      }

      // Hat
      if (isPolice) {
        ctx.fillStyle = '#10102a';
        ctx.beginPath(); ctx.ellipse(0, hy_ - sh*0.68, sh*0.48, sh*0.17, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(-sh*0.29, hy_ - sh*1.30, sh*0.58, sh*0.64, sh*0.06); ctx.fill();
        ctx.fillStyle = '#FFDD44'; ctx.shadowColor = '#FFDD44'; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(sh*0.28, my_ - sm*0.50, sh*0.14, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
      } else if (isBig) {
        ctx.fillStyle = '#0a1a0a';
        ctx.beginPath(); ctx.ellipse(0, hy_ - sh*0.72, sh*0.54, sh*0.20, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(-sh*0.34, hy_ - sh*1.44, sh*0.68, sh*0.74, sh*0.06); ctx.fill();
        ctx.fillStyle = this.accentColor;
        ctx.beginPath(); ctx.roundRect(-sh*0.34, hy_ - sh*0.90, sh*0.68, sh*0.16, sh*0.04); ctx.fill();
      } else {
        ctx.fillStyle = '#0d1a2e';
        ctx.beginPath(); ctx.ellipse(0, hy_ - sh*0.68, sh*0.44, sh*0.16, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(-sh*0.26, hy_ - sh*1.24, sh*0.52, sh*0.58, sh*0.05); ctx.fill();
        // Scarf
        ctx.fillStyle = this.bodyColor; ctx.globalAlpha = 0.88;
        ctx.beginPath(); ctx.ellipse(0, my_ - sm*0.65, sm*0.56, sm*0.18, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Bomber fuse
      if (isBomber) {
        ctx.fillStyle = '#AA4400';
        ctx.beginPath(); ctx.arc(0, by_ - sb*0.22, sm*0.30, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#884400'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, by_ - sb*0.50); ctx.lineTo(sm*0.26, by_ - sb*0.90); ctx.stroke();
        ctx.fillStyle = '#FF8800'; ctx.shadowColor = '#FF4400'; ctx.shadowBlur = 9;
        ctx.beginPath(); ctx.arc(sm*0.26, by_ - sb*0.90, sm*0.12, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();

    // Ice-blue gun barrel
    const gl = r + 10;
    const gx = x + Math.cos(this._angle)*gl, gy = y + Math.sin(this._angle)*gl;
    const ga0x = x + Math.cos(this._angle)*r*0.55, ga0y = y + Math.sin(this._angle)*r*0.55;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(ga0x+1, ga0y+1.5); ctx.lineTo(gx+1, gy+1.5); ctx.stroke();
    ctx.strokeStyle = '#88ccff'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(ga0x, ga0y); ctx.lineTo(gx, gy); ctx.stroke();
    ctx.restore();

    this._renderHPBar(ctx, x, y, r, 40, 5);
  }

  // ── DESERT ENEMY: dispatches to sub-renders ───────────────
  _renderDesertEnemy(ctx, x, y, r) {
    if (this.type === 'mini')            this._renderScarab(ctx, x, y, r);
    else if (this.type === 'big')        this._renderSandGolem(ctx, x, y, r);
    else if (this.type === 'juggernaut') this._renderSandworm(ctx, x, y, r);
    else if (this.type === 'bomber')     this._renderScorpion(ctx, x, y, r);
    else                                 this._renderMummy(ctx, x, y, r);
    this._renderHPBar(ctx, x, y, r, 40, 5);
  }

  // ── SCARAB: fast beetle mini enemy ───────────────────────
  _renderScarab(ctx, x, y, r) {
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+1, y+r*0.35, r*1.05, r*0.22, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2);

    // Abdomen (oval) — golden bronze scarab shell
    const ag = ctx.createRadialGradient(0, r*0.18, 1, 0, r*0.12, r*0.55);
    ag.addColorStop(0, '#c8860a'); ag.addColorStop(0.5, '#8a5a04'); ag.addColorStop(1, '#4a3002');
    ctx.fillStyle = ag; ctx.shadowColor = '#FFAA30'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.ellipse(0, r*0.12, r*0.46, r*0.52, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Shell sheen (gold shimmer)
    ctx.strokeStyle = 'rgba(255,200,80,0.40)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, r*0.10, r*0.28, r*0.32, 0.3, Math.PI*1.2, Math.PI*1.8); ctx.stroke();

    // Thorax — dark bronze
    const tg = ctx.createRadialGradient(0, -r*0.24, 1, 0, -r*0.20, r*0.32);
    tg.addColorStop(0, '#b07810'); tg.addColorStop(1, '#5a3e06');
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.ellipse(0, -r*0.24, r*0.34, r*0.30, 0, 0, Math.PI*2); ctx.fill();

    // 6 legs (3 per side) scuttling animation
    const legSwing = Math.sin(Date.now() * 0.014) * 0.28;
    ctx.strokeStyle = '#5a3a04'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const ly = -r*0.12 + i * r*0.22;
      const swing = (i % 2 === 0) ? legSwing : -legSwing;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * r*0.42, ly);
        ctx.lineTo(s * r*(0.76 + Math.abs(swing)*0.2), ly + r*0.22 + swing*s*r*0.18);
        ctx.stroke();
      }
    }

    // Head — dark brown
    ctx.fillStyle = '#4a2e04';
    ctx.beginPath(); ctx.ellipse(0, -r*0.60, r*0.22, r*0.18, 0, 0, Math.PI*2); ctx.fill();
    // Compound eyes — amber/gold glow (no green)
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#FFCC44'; ctx.shadowColor = '#FF9900'; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(s*r*0.14, -r*0.64, r*0.09, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    // Antennae
    ctx.strokeStyle = '#7a5210'; ctx.lineWidth = 1;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s*r*0.10, -r*0.72); ctx.lineTo(s*r*0.32, -r*0.98); ctx.stroke();
      ctx.beginPath(); ctx.arc(s*r*0.32, -r*0.98, r*0.05, 0, Math.PI*2); ctx.fill();
    }
    // Pincers
    ctx.strokeStyle = '#3a1e00'; ctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s*r*0.16, -r*0.72); ctx.lineTo(s*r*0.30, -r*0.88); ctx.stroke();
    }

    ctx.restore();
  }

  // ── MUMMY: bandage-wrapped ancient soldier ────────────────
  _renderMummy(ctx, x, y, r) {
    const isPolice  = this.type === 'police' || this.type === 'swat' || this.type === 'heavyswat';
    const isSniper  = this.type === 'sniper';

    ctx.save(); ctx.globalAlpha = 0.20; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+3, y+r*0.52, r*1.0, r*0.25, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2);

    const bw = r * 0.56, bh = r * 0.82;
    const hhr = r * 0.46;
    const walk = Math.sin(Date.now() * 0.005) * 0.22;

    // Legs — wrapped
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#d4c090';
      ctx.beginPath(); ctx.ellipse(s*r*0.26, r*0.22+s*walk*r*0.22, r*0.18, r*0.38, s*walk*0.18, 0, Math.PI*2); ctx.fill();
      // Bandage strips on legs
      ctx.strokeStyle = '#b8a070'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6;
      for (let i = 0; i < 3; i++) {
        const ly = r*0.08 + i*r*0.12;
        ctx.beginPath(); ctx.moveTo(s*r*0.14, ly); ctx.lineTo(s*r*0.36, ly+r*0.02); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Foot
      ctx.fillStyle = '#a08050';
      ctx.beginPath(); ctx.ellipse(s*r*0.28+s*0.05*r, r*0.54, r*0.20, r*0.09, 0, 0, Math.PI*2); ctx.fill();
    }

    // Torso — bandage wrapping
    const tg = ctx.createLinearGradient(-bw, -bh*0.42, bw, bh*0.32);
    tg.addColorStop(0, '#e8d8a8'); tg.addColorStop(1, '#c8b880');
    ctx.fillStyle = tg; ctx.shadowColor = '#000'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.roundRect(-bw, -bh*0.42, bw*2, bh*0.78, [bw*0.22, bw*0.22, bw*0.14, bw*0.14]); ctx.fill();
    ctx.shadowBlur = 0;

    // Bandage strip details on torso (horizontal lines)
    ctx.strokeStyle = '#b8a460'; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.55;
    for (let i = 0; i < 5; i++) {
      const by2 = -bh*0.36 + i * bh*0.18;
      ctx.beginPath(); ctx.moveTo(-bw*0.88, by2); ctx.lineTo(bw*0.88, by2 + (i%2===0?2:-2)); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Diagonal wrap bands
    ctx.strokeStyle = '#c8b06a'; ctx.lineWidth = 1.8; ctx.globalAlpha = 0.40;
    ctx.beginPath(); ctx.moveTo(-bw*0.85, -bh*0.42); ctx.lineTo(bw*0.85, bh*0.22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bw*0.85, -bh*0.42); ctx.lineTo(-bw*0.85, bh*0.22); ctx.stroke();
    ctx.globalAlpha = 1;

    // Scarab amulet
    if (isPolice) {
      ctx.fillStyle = '#FFDD44'; ctx.shadowColor = '#FFAA00'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.ellipse(0, -bh*0.10, bw*0.26, bw*0.20, 0, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Arms — outstretched (classic mummy pose)
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * bw * 0.94, -bh * 0.26);
      ctx.rotate(s * 0.55 + walk * s * 0.14);
      ctx.fillStyle = '#d4c090';
      ctx.beginPath(); ctx.roundRect(-r*0.14, -r*0.62, r*0.28, r*0.72, r*0.10); ctx.fill();
      // Bandage on arm
      ctx.strokeStyle = '#b8a070'; ctx.lineWidth = 1.3; ctx.globalAlpha = 0.55;
      for (let i=0; i<3; i++) { ctx.beginPath(); ctx.moveTo(-r*0.15, -r*0.42+i*r*0.18); ctx.lineTo(r*0.15, -r*0.40+i*r*0.18); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // Rotted hand
      ctx.fillStyle = '#c4a878';
      ctx.beginPath(); ctx.ellipse(0, r*0.14, r*0.16, r*0.17, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // Head — fully wrapped
    const hy = -bh * 0.46;
    const hg = ctx.createRadialGradient(-hhr*0.2, hy-hhr*0.2, 1, 0, hy, hhr);
    hg.addColorStop(0, '#ede0b0'); hg.addColorStop(1, '#c8a860');
    ctx.fillStyle = hg; ctx.shadowColor = '#000'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.ellipse(0, hy, hhr, hhr*0.94, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Head bandage strips
    ctx.strokeStyle = '#b8a060'; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.55;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(-hhr*0.95, hy - hhr*0.50 + i*hhr*0.34); ctx.lineTo(hhr*0.95, hy - hhr*0.52 + i*hhr*0.34); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Glowing golden eyes (ancient)
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#FFCC44'; ctx.shadowColor = '#FFAA00'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.ellipse(s*hhr*0.30, hy - hhr*0.06, hhr*0.17, hhr*0.13, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FF6600'; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.ellipse(s*hhr*0.30, hy - hhr*0.06, hhr*0.08, hhr*0.10, 0, 0, Math.PI*2); ctx.fill();
    }

    // Headdress (police/swat = anubis nemes headcloth)
    if (isPolice) {
      ctx.fillStyle = '#2a1a04';
      ctx.beginPath(); ctx.moveTo(-hhr*0.90, hy-hhr*0.55); ctx.lineTo(-hhr*1.10, hy+hhr*0.50);
      ctx.lineTo(-hhr*0.70, hy+hhr*0.65); ctx.lineTo(-hhr*0.85, hy-hhr*0.52); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hhr*0.90, hy-hhr*0.55); ctx.lineTo(hhr*1.10, hy+hhr*0.50);
      ctx.lineTo(hhr*0.70, hy+hhr*0.65); ctx.lineTo(hhr*0.85, hy-hhr*0.52); ctx.closePath(); ctx.fill();
      // Gold bands on headdress
      ctx.strokeStyle = '#FFDD44'; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.moveTo(-hhr*0.95, hy-hhr*0.20); ctx.lineTo(-hhr*0.68, hy-hhr*0.20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hhr*0.68, hy-hhr*0.20); ctx.lineTo(hhr*0.95, hy-hhr*0.20); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Ancient scepter / crook (pointing in angle direction)
    const gl = r + 14;
    const gx = x + Math.cos(this._angle)*gl, gy = y + Math.sin(this._angle)*gl;
    const ga0x = x + Math.cos(this._angle)*r*0.55, ga0y = y + Math.sin(this._angle)*r*0.55;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(ga0x+1, ga0y+1.5); ctx.lineTo(gx+1, gy+1.5); ctx.stroke();
    ctx.strokeStyle = isPolice ? '#FFDD44' : '#c8a040'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(ga0x, ga0y); ctx.lineTo(gx, gy); ctx.stroke();
    ctx.restore();
  }

  // ── SAND GOLEM: massive ancient construct ─────────────────
  _renderSandGolem(ctx, x, y, r) {
    const isJug = this.type === 'juggernaut';

    ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+4, y+r*0.58, r*(isJug?1.35:1.15), r*0.32, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2);

    const bw = r * (isJug ? 1.0 : 0.88);
    const bh = r * (isJug ? 1.0 : 0.90);

    // Stone-sand cracked body
    const pulse = 1 + Math.sin(Date.now()*0.003)*0.015;
    const bg = ctx.createRadialGradient(0, 0, r*0.1, 0, 0, r*0.95);
    bg.addColorStop(0, '#c8a050'); bg.addColorStop(0.6, '#a07830'); bg.addColorStop(1, '#6a4e1a');
    ctx.fillStyle = bg; ctx.shadowColor = '#FF8800'; ctx.shadowBlur = isJug ? 18 : 10;
    ctx.beginPath(); ctx.roundRect(-bw*pulse, -bh*0.44*pulse, bw*2*pulse, bh*0.88*pulse, [bw*0.18, bw*0.18, bw*0.12, bw*0.12]); ctx.fill();
    ctx.shadowBlur = 0;

    // Crack lines on body
    ctx.strokeStyle = '#4a3010'; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.moveTo(-bw*0.28, -bh*0.38); ctx.lineTo(-bw*0.10, bh*0.12); ctx.lineTo(-bw*0.22, bh*0.30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bw*0.22, -bh*0.28); ctx.lineTo(bw*0.38, bh*0.22); ctx.stroke();
    ctx.globalAlpha = 1;

    // Sandy dust rings
    ctx.strokeStyle = 'rgba(200,160,60,0.18)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r*1.05 + Math.sin(Date.now()*0.004)*4, 0, Math.PI*2); ctx.stroke();

    // Legs — stone pillars
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#8a6228';
      ctx.beginPath(); ctx.ellipse(s*r*0.32, r*0.22, r*0.22, r*0.40, s*0.12, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#6a4a18';
      ctx.beginPath(); ctx.ellipse(s*r*0.34+s*0.06*r, r*0.56, r*0.26, r*0.12, 0, 0, Math.PI*2); ctx.fill();
    }

    // Massive arms
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * bw * 0.95, -bh*0.20);
      ctx.rotate(s * 0.50);
      ctx.fillStyle = '#9a7832';
      ctx.beginPath(); ctx.roundRect(-r*0.24, -r*0.74, r*0.48, r*0.84, r*0.14); ctx.fill();
      // Giant sandy fist
      ctx.fillStyle = '#c8a040';
      ctx.beginPath(); ctx.ellipse(0, r*0.18, r*0.30, r*0.28, 0, 0, Math.PI*2); ctx.fill();
      // Crack on fist
      ctx.strokeStyle = '#6a4a10'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-r*0.14, r*0.10); ctx.lineTo(-r*0.04, r*0.28); ctx.stroke();
      ctx.restore();
    }

    // Head — ancient carved stone
    const hhr = r * (isJug ? 0.54 : 0.46);
    const hy  = -bh * 0.46;
    const hg  = ctx.createRadialGradient(-hhr*0.2, hy-hhr*0.2, 1, 0, hy, hhr);
    hg.addColorStop(0, '#d4a858'); hg.addColorStop(1, '#8a6230');
    ctx.fillStyle = hg; ctx.shadowColor = '#000'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0, hy, hhr, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Glowing amber eyes
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#FFCC00'; ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.ellipse(s*hhr*0.30, hy - hhr*0.06, hhr*0.20, hhr*0.15, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FF4400'; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.ellipse(s*hhr*0.30, hy - hhr*0.06, hhr*0.10, hhr*0.11, 0, 0, Math.PI*2); ctx.fill();
    }

    // Ancient runes carved in torso
    ctx.strokeStyle = 'rgba(255,180,60,0.30)'; ctx.lineWidth = 0.9;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-bw*0.48 + i*bw*0.38, -bh*0.28); ctx.lineTo(-bw*0.44 + i*bw*0.38, -bh*0.06); ctx.stroke();
    }

    ctx.restore();

    // Sandy weapon — heavy stone club
    const gl = r + 14;
    const gx = x + Math.cos(this._angle)*gl, gy = y + Math.sin(this._angle)*gl;
    const ga0x = x + Math.cos(this._angle)*r*0.55, ga0y = y + Math.sin(this._angle)*r*0.55;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(ga0x+1, ga0y+1.5); ctx.lineTo(gx+1, gy+1.5); ctx.stroke();
    ctx.strokeStyle = '#c8a040'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(ga0x, ga0y); ctx.lineTo(gx, gy); ctx.stroke();
    ctx.restore();
  }

  // ── SCORPION: desert bomber — venomous arachnid ──────────
  _renderScorpion(ctx, x, y, r) {
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+2, y+r*0.40, r*1.10, r*0.24, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2);

    // Segmented abdomen (6 segments tapering to tail)
    for (let i = 0; i < 6; i++) {
      const segR = r * (0.36 - i * 0.042);
      const segY = -r * 0.20 + i * r * 0.38 - r * 0.60;
      ctx.fillStyle = i % 2 === 0 ? '#3a1808' : '#2a1004';
      ctx.beginPath(); ctx.ellipse(0, segY, segR * 0.78, segR, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,100,20,0.18)';
      ctx.beginPath(); ctx.ellipse(-segR*0.2, segY - segR*0.25, segR*0.35, segR*0.25, 0, 0, Math.PI*2); ctx.fill();
    }

    // Curved stinger tail (metasoma)
    ctx.save();
    ctx.strokeStyle = '#2a1004'; ctx.lineWidth = r * 0.28; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, r * 0.60);
    ctx.bezierCurveTo(r * 0.85, r * 0.45, r * 1.20, -r * 0.10, r * 0.55, -r * 0.72); ctx.stroke();
    ctx.strokeStyle = '#FF4400'; ctx.lineWidth = r * 0.12; ctx.shadowColor = '#FF2200'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(r * 0.55, -r * 0.72); ctx.lineTo(r * 0.30, -r * 1.05); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Main body (cephalothorax)
    const bg = ctx.createRadialGradient(-r*0.15, -r*0.10, 1, 0, 0, r*0.56);
    bg.addColorStop(0, '#5a2a0a'); bg.addColorStop(0.55, '#3a1808'); bg.addColorStop(1, '#200e04');
    ctx.fillStyle = bg; ctx.shadowColor = '#FF4400'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.ellipse(0, 0, r*0.54, r*0.44, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // 8 legs with scuttle animation
    const legSwing = Math.sin(Date.now() * 0.018) * 0.32;
    ctx.strokeStyle = '#2a1004'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const ly2 = -r * 0.24 + i * r * 0.18;
      const swing = (i % 2 === 0) ? legSwing : -legSwing;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * r * 0.50, ly2);
        ctx.lineTo(s * r * (0.80 + Math.abs(swing)*0.14), ly2 + r * 0.22 + swing * s * r * 0.12); ctx.stroke();
      }
    }

    // Front pedipalp claws
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * r * 0.28, -r * 0.54); ctx.rotate(s * 0.55);
      ctx.strokeStyle = '#3a1808'; ctx.lineWidth = r * 0.20;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * r * 0.42, -r * 0.52); ctx.stroke();
      ctx.fillStyle = '#4a2010';
      ctx.beginPath(); ctx.ellipse(s * r * 0.42, -r * 0.52, r * 0.20, r * 0.12, s * 0.65, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#4a2010'; ctx.lineWidth = r * 0.12;
      ctx.beginPath(); ctx.moveTo(s * r * 0.40, -r * 0.45); ctx.lineTo(s * r * 0.60, -r * 0.32); ctx.stroke();
      ctx.restore();
    }

    // Compound eyes (orange glow)
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#FF8800'; ctx.shadowColor = '#FF4400'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(s * r * 0.18, -r * 0.38, r * 0.09, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = '#FFAA22'; ctx.shadowColor = '#FF6600'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(0, -r * 0.46, r * 0.08, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── SANDWORM: colossal desert juggernaut — emerging maw ──
  _renderSandworm(ctx, x, y, r) {
    const pT = Date.now() * 0.002;

    ctx.save(); ctx.globalAlpha = 0.32; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+6, y+r*0.62, r*1.55, r*0.36, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);

    // Receding body rings
    for (let i = 2; i >= 0; i--) {
      const rs = 1 - i * 0.18, ringY = i * r * 0.30 + r * 0.18;
      ctx.fillStyle = `rgba(${Math.round(140 - i*22)},${Math.round(90 - i*14)},${Math.round(20 - i*4)},1)`;
      ctx.beginPath(); ctx.ellipse(0, ringY, r * 1.30 * rs, r * 0.38 * rs, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(80,40,5,0.50)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, ringY, r * 0.85 * rs, r * 0.25 * rs, 0, 0, Math.PI*2); ctx.stroke();
    }

    // Frontal collar ring
    const cG = ctx.createRadialGradient(-r*0.25, -r*0.15, 2, 0, 0, r*1.28);
    cG.addColorStop(0, '#c8a050'); cG.addColorStop(0.5, '#8a6020'); cG.addColorStop(1, '#4a3010');
    ctx.fillStyle = cG; ctx.shadowColor = '#D4A017'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.28, r * 0.58, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Outer teeth ring
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2 + pT * 0.3;
      const tx2 = Math.cos(ang) * r * 1.22, ty2 = Math.sin(ang) * r * 0.54;
      ctx.fillStyle = i % 2 === 0 ? '#F5E8C0' : '#D4C8A0';
      ctx.save(); ctx.translate(tx2, ty2); ctx.rotate(ang + Math.PI/2);
      ctx.beginPath(); ctx.moveTo(-r*0.08, 0); ctx.lineTo(0, -r*0.22); ctx.lineTo(r*0.08, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // Dark maw interior
    const mawG = ctx.createRadialGradient(0, 0, 4, 0, 0, r * 0.65);
    mawG.addColorStop(0, '#050200'); mawG.addColorStop(0.55, '#1a0e04'); mawG.addColorStop(1, '#3a1e08');
    ctx.fillStyle = mawG;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.68, r * 0.30, 0, 0, Math.PI*2); ctx.fill();

    // Inner teeth
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 - pT * 0.5;
      const tx2 = Math.cos(ang) * r * 0.58, ty2 = Math.sin(ang) * r * 0.26;
      ctx.fillStyle = '#C8A860';
      ctx.save(); ctx.translate(tx2, ty2); ctx.rotate(ang + Math.PI/2);
      ctx.beginPath(); ctx.moveTo(-r*0.06, 0); ctx.lineTo(0, -r*0.15); ctx.lineTo(r*0.06, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // Glowing pit eyes
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#FF8800'; ctx.shadowColor = '#FF4400'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(s * r * 0.28, -r * 0.05, r * 0.14, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FF2200'; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(s * r * 0.28, -r * 0.05, r * 0.07, 0, Math.PI*2); ctx.fill();
    }

    // Sand spray particles
    ctx.fillStyle = 'rgba(200,168,60,0.22)';
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + pT;
      ctx.beginPath(); ctx.ellipse(Math.cos(ang)*r*1.48, Math.sin(ang)*r*0.66, r*0.08, r*0.04, ang, 0, Math.PI*2); ctx.fill();
    }

    ctx.restore();
  }

  // ── OCEAN ENEMY: dispatches to water-themed renders ────────
  _renderOceanEnemy(ctx, x, y, r) {
    if (this.type === 'big' || this.type === 'juggernaut')       this._renderLeviathan(ctx, x, y, r);
    else if (this.type === 'police' || this.type === 'swat' || this.type === 'heavyswat') this._renderCoastGuard(ctx, x, y, r);
    else                                                          this._renderSeaWarrior(ctx, x, y, r);
    this._renderHPBar(ctx, x, y, r, 40, 5);
  }

  // ── SEA WARRIOR: aquatic humanoid with scales and fins ─────
  _renderSeaWarrior(ctx, x, y, r) {
    const isSniper = this.type === 'sniper';
    const isBomber = this.type === 'bomber';
    const walk = Math.sin(Date.now() * 0.006) * 0.18;

    // Shadow/ripple effect
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#003366';
    ctx.beginPath(); ctx.ellipse(x+2, y+r*0.45, r*1.1, r*0.26, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2);

    const bw = r * 0.54, bh = r * 0.76;

    // Legs with fins
    for (const s of [-1, 1]) {
      // Leg
      const lg = ctx.createLinearGradient(s*r*0.24, -r*0.14, s*r*0.24, r*0.50);
      lg.addColorStop(0, '#006688'); lg.addColorStop(1, '#003344');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.ellipse(s*r*0.24, r*0.12+s*walk*r*0.18, r*0.16, r*0.34, s*walk*0.14, 0, Math.PI*2); ctx.fill();
      // Webbed foot
      ctx.fillStyle = '#00AACC';
      ctx.beginPath(); ctx.ellipse(s*r*0.26, r*0.42, r*0.18, r*0.10, s*0.20, 0, Math.PI*2); ctx.fill();
      // Fin on leg
      ctx.fillStyle = 'rgba(0,180,220,0.6)';
      ctx.beginPath();
      ctx.moveTo(s*r*0.38, r*0.05); ctx.lineTo(s*r*0.58, r*0.20); ctx.lineTo(s*r*0.38, r*0.30);
      ctx.closePath(); ctx.fill();
    }

    // Torso with scales pattern
    const tg = ctx.createRadialGradient(0, -bh*0.1, bw*0.3, 0, 0, bw*1.4);
    tg.addColorStop(0, '#00AACC'); tg.addColorStop(0.6, '#006688'); tg.addColorStop(1, '#003344');
    ctx.fillStyle = tg; ctx.shadowColor = '#00CCFF'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.roundRect(-bw, -bh*0.40, bw*2, bh*0.82, [bw*0.20, bw*0.20, bw*0.12, bw*0.12]); ctx.fill();
    ctx.shadowBlur = 0;

    // Scale pattern on torso
    ctx.fillStyle = 'rgba(0,200,255,0.25)';
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const sx = -bw*0.65 + col*bw*0.35 + (row%2)*bw*0.18;
        const sy = -bh*0.32 + row*bh*0.24;
        ctx.beginPath();
        ctx.arc(sx, sy, bw*0.14, 0, Math.PI, true);
        ctx.fill();
      }
    }

    // Arms with fins
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * bw * 0.92, -bh * 0.22);
      ctx.rotate(s * 0.48 + walk * s * 0.12);
      // Arm
      const ag = ctx.createLinearGradient(0, -r*0.55, 0, r*0.10);
      ag.addColorStop(0, '#00AACC'); ag.addColorStop(1, '#004466');
      ctx.fillStyle = ag;
      ctx.beginPath(); ctx.roundRect(-r*0.13, -r*0.58, r*0.26, r*0.68, r*0.09); ctx.fill();
      // Webbed hand
      ctx.fillStyle = '#00CCEE';
      ctx.beginPath(); ctx.ellipse(0, r*0.14, r*0.15, r*0.14, 0, 0, Math.PI*2); ctx.fill();
      // Clawed fingers
      ctx.strokeStyle = '#88EEFF'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let f = -1; f <= 1; f++) {
        ctx.beginPath(); ctx.moveTo(f*r*0.08, r*0.20); ctx.lineTo(f*r*0.12, r*0.32); ctx.stroke();
      }
      // Arm fin
      ctx.fillStyle = 'rgba(0,200,255,0.5)';
      ctx.beginPath();
      ctx.moveTo(-r*0.08, -r*0.50); ctx.lineTo(-r*0.24, -r*0.38); ctx.lineTo(-r*0.08, -r*0.20);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // Back fin (dorsal)
    ctx.fillStyle = 'rgba(0,180,220,0.7)';
    ctx.beginPath();
    ctx.moveTo(0, -bh*0.36); ctx.lineTo(-bw*0.20, -bh*0.70); ctx.lineTo(bw*0.20, -bh*0.70);
    ctx.closePath(); ctx.fill();

    // Head with fish features
    const hhr = r * 0.44;
    const hy = -bh * 0.44;
    const hg = ctx.createRadialGradient(-hhr*0.2, hy-hhr*0.2, 1, 0, hy, hhr);
    hg.addColorStop(0, '#00CCEE'); hg.addColorStop(0.7, '#0088AA'); hg.addColorStop(1, '#005577');
    ctx.fillStyle = hg; ctx.shadowColor = '#00CCFF'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.ellipse(0, hy, hhr, hhr*0.90, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Gill slits
    ctx.strokeStyle = '#003355'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6;
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(s*hhr*0.70, hy - hhr*0.20 + i*hhr*0.18);
        ctx.lineTo(s*hhr*0.85, hy - hhr*0.12 + i*hhr*0.18);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // Glowing eyes
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#44FFFF'; ctx.shadowColor = '#00FFFF'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.ellipse(s*hhr*0.32, hy - hhr*0.06, hhr*0.16, hhr*0.12, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#88FFFF'; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.ellipse(s*hhr*0.32, hy - hhr*0.06, hhr*0.07, hhr*0.08, 0, 0, Math.PI*2); ctx.fill();
    }

    // Head fin crest
    ctx.fillStyle = 'rgba(0,200,255,0.65)';
    ctx.beginPath();
    ctx.moveTo(-hhr*0.50, hy - hhr*0.55);
    ctx.lineTo(0, hy - hhr*1.10);
    ctx.lineTo(hhr*0.50, hy - hhr*0.55);
    ctx.closePath(); ctx.fill();

    ctx.restore();

    // Trident weapon
    const gl = r + 16;
    const gx = x + Math.cos(this._angle)*gl, gy = y + Math.sin(this._angle)*gl;
    const ga0x = x + Math.cos(this._angle)*r*0.50, ga0y = y + Math.sin(this._angle)*r*0.50;
    ctx.save(); ctx.lineCap = 'round';
    // Shadow
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(ga0x+1, ga0y+1.5); ctx.lineTo(gx+1, gy+1.5); ctx.stroke();
    // Trident shaft
    ctx.strokeStyle = '#0088AA'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(ga0x, ga0y); ctx.lineTo(gx, gy); ctx.stroke();
    // Trident prongs
    const tx = gx, ty = gy;
    const tAngle = this._angle;
    ctx.strokeStyle = '#00CCFF'; ctx.lineWidth = 2.5;
    for (let p = -1; p <= 1; p++) {
      const pAngle = tAngle + p * 0.25;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + Math.cos(pAngle)*12, ty + Math.sin(pAngle)*12);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── LEVIATHAN: giant sea monster ────────────────────────────
  _renderLeviathan(ctx, x, y, r) {
    const isJug = this.type === 'juggernaut';
    const pulse = 1 + Math.sin(Date.now()*0.003)*0.02;

    // Deep shadow
    ctx.save(); ctx.globalAlpha = 0.30; ctx.fillStyle = '#001122';
    ctx.beginPath(); ctx.ellipse(x+4, y+r*0.58, r*(isJug?1.40:1.20), r*0.35, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2);

    const bw = r * (isJug ? 1.05 : 0.90);
    const bh = r * (isJug ? 1.05 : 0.95);

    // Massive body
    const bg = ctx.createRadialGradient(0, 0, r*0.15, 0, 0, r*1.0);
    bg.addColorStop(0, '#005577'); bg.addColorStop(0.5, '#003355'); bg.addColorStop(1, '#001833');
    ctx.fillStyle = bg; ctx.shadowColor = '#0088CC'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.roundRect(-bw*pulse, -bh*0.48*pulse, bw*2*pulse, bh*0.96*pulse, [bw*0.22]); ctx.fill();
    ctx.shadowBlur = 0;

    // Barnacle/scale patches
    ctx.fillStyle = 'rgba(0,180,200,0.35)';
    for (let i = 0; i < 5; i++) {
      const bx = (Math.random()-0.5)*bw*1.4;
      const by = (Math.random()-0.5)*bh*0.7;
      ctx.beginPath(); ctx.arc(bx, by, bw*0.12 + Math.random()*bw*0.08, 0, Math.PI*2); ctx.fill();
    }

    // Massive tentacle-like legs
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#004466';
      ctx.beginPath(); ctx.ellipse(s*r*0.38, r*0.25, r*0.26, r*0.52, s*0.15, 0, Math.PI*2); ctx.fill();
      // Suckers
      ctx.fillStyle = '#0066AA';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(s*r*0.38, r*0.05 + i*r*0.22, r*0.08, 0, Math.PI*2); ctx.fill();
      }
    }

    // Massive arms
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * bw, -bh*0.18);
      ctx.rotate(s * 0.45);
      ctx.fillStyle = '#003855';
      ctx.beginPath(); ctx.roundRect(-r*0.28, -r*0.80, r*0.56, r*0.95, r*0.16); ctx.fill();
      // Giant claw
      ctx.fillStyle = '#00AACC';
      ctx.beginPath(); ctx.ellipse(0, r*0.22, r*0.38, r*0.32, 0, 0, Math.PI*2); ctx.fill();
      // Pincer claws
      ctx.strokeStyle = '#00DDFF'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r*0.15, r*0.30); ctx.lineTo(-r*0.28, r*0.55); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r*0.15, r*0.30); ctx.lineTo(r*0.28, r*0.55); ctx.stroke();
      ctx.restore();
    }

    // Head - monstrous
    const hhr = r * (isJug ? 0.58 : 0.50);
    const hy = -bh * 0.50;
    const hg = ctx.createRadialGradient(-hhr*0.2, hy-hhr*0.2, 1, 0, hy, hhr);
    hg.addColorStop(0, '#0088AA'); hg.addColorStop(0.7, '#005577'); hg.addColorStop(1, '#002233');
    ctx.fillStyle = hg; ctx.shadowColor = '#00AACC'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(0, hy, hhr, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Multiple glowing eyes
    const eyePositions = [[-0.35, -0.12], [0.35, -0.12], [-0.18, 0.15], [0.18, 0.15]];
    for (const [ex, ey] of eyePositions) {
      ctx.fillStyle = '#00FFFF'; ctx.shadowColor = '#00FFFF'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.ellipse(hhr*ex, hy + hhr*ey, hhr*0.12, hhr*0.10, 0, 0, Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Maw with teeth
    ctx.fillStyle = '#001122';
    ctx.beginPath();
    ctx.arc(0, hy + hhr*0.25, hhr*0.45, 0.1, Math.PI - 0.1);
    ctx.fill();
    // Teeth
    ctx.fillStyle = '#88EEFF';
    for (let i = 0; i < 5; i++) {
      const tAngle = 0.3 + i * 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(tAngle)*hhr*0.40, hy + hhr*0.25 + Math.sin(tAngle)*hhr*0.40);
      ctx.lineTo(Math.cos(tAngle)*hhr*0.28, hy + hhr*0.25 + Math.sin(tAngle)*hhr*0.25);
      ctx.lineTo(Math.cos(tAngle+0.15)*hhr*0.40, hy + hhr*0.25 + Math.sin(tAngle+0.15)*hhr*0.40);
      ctx.closePath(); ctx.fill();
    }

    // Dorsal spines
    ctx.fillStyle = '#00AACC';
    for (let i = 0; i < 4; i++) {
      const sy = -bh*0.44 + i*bh*0.22;
      ctx.beginPath();
      ctx.moveTo(-bw*0.08, sy); ctx.lineTo(0, sy - bh*0.18); ctx.lineTo(bw*0.08, sy);
      ctx.closePath(); ctx.fill();
    }

    ctx.restore();

    // Anchor weapon
    const gl = r + 18;
    const gx = x + Math.cos(this._angle)*gl, gy = y + Math.sin(this._angle)*gl;
    const ga0x = x + Math.cos(this._angle)*r*0.55, ga0y = y + Math.sin(this._angle)*r*0.55;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.50)'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(ga0x+2, ga0y+2); ctx.lineTo(gx+2, gy+2); ctx.stroke();
    ctx.strokeStyle = '#005588'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(ga0x, ga0y); ctx.lineTo(gx, gy); ctx.stroke();
    // Anchor flukes
    ctx.strokeStyle = '#0088AA'; ctx.lineWidth = 4;
    const ax = gx, ay = gy;
    const aAngle = this._angle;
    ctx.beginPath();
    ctx.moveTo(ax + Math.cos(aAngle - 0.8)*14, ay + Math.sin(aAngle - 0.8)*14);
    ctx.lineTo(ax, ay);
    ctx.lineTo(ax + Math.cos(aAngle + 0.8)*14, ay + Math.sin(aAngle + 0.8)*14);
    ctx.stroke();
    ctx.restore();
  }

  // ── COAST GUARD: armored naval officer ──────────────────────
  _renderCoastGuard(ctx, x, y, r) {
    const isSwat = this.type === 'swat' || this.type === 'heavyswat';
    const walk = Math.sin(Date.now() * 0.005) * 0.16;

    ctx.save(); ctx.globalAlpha = 0.20; ctx.fillStyle = '#002244';
    ctx.beginPath(); ctx.ellipse(x+2, y+r*0.50, r*1.05, r*0.24, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2);

    const bw = r * 0.52, bh = r * 0.74;

    // Legs in naval uniform
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#002244';
      ctx.beginPath(); ctx.ellipse(s*r*0.22, r*0.14+s*walk*r*0.16, r*0.15, r*0.32, s*walk*0.12, 0, Math.PI*2); ctx.fill();
      // Boots
      ctx.fillStyle = '#001122';
      ctx.beginPath(); ctx.ellipse(s*r*0.24, r*0.42, r*0.18, r*0.10, s*0.15, 0, Math.PI*2); ctx.fill();
    }

    // Torso - naval uniform
    const tg = ctx.createLinearGradient(-bw, -bh*0.40, bw, bh*0.35);
    tg.addColorStop(0, '#0066AA'); tg.addColorStop(0.5, '#004488'); tg.addColorStop(1, '#003366');
    ctx.fillStyle = tg; ctx.shadowColor = '#0088CC'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.roundRect(-bw, -bh*0.38, bw*2, bh*0.78, [bw*0.18, bw*0.18, bw*0.10, bw*0.10]); ctx.fill();
    ctx.shadowBlur = 0;

    // Gold buttons
    ctx.fillStyle = '#FFCC44';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.arc(0, -bh*0.28 + i*bh*0.16, bw*0.09, 0, Math.PI*2); ctx.fill();
    }

    // Epaulettes
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#FFDD66';
      ctx.beginPath(); ctx.ellipse(s*bw*0.95, -bh*0.32, bw*0.20, bw*0.12, 0, 0, Math.PI*2); ctx.fill();
      // Fringe
      ctx.strokeStyle = '#FFCC44'; ctx.lineWidth = 1;
      for (let f = 0; f < 4; f++) {
        ctx.beginPath();
        ctx.moveTo(s*bw*0.85 + s*f*bw*0.06, -bh*0.28);
        ctx.lineTo(s*bw*0.85 + s*f*bw*0.06, -bh*0.18);
        ctx.stroke();
      }
    }

    // Arms
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * bw * 0.90, -bh * 0.20);
      ctx.rotate(s * 0.42 + walk * s * 0.10);
      ctx.fillStyle = '#004488';
      ctx.beginPath(); ctx.roundRect(-r*0.12, -r*0.55, r*0.24, r*0.65, r*0.08); ctx.fill();
      // Gold cuff
      ctx.fillStyle = '#FFCC44';
      ctx.beginPath(); ctx.roundRect(-r*0.13, r*0.02, r*0.26, r*0.08, r*0.03); ctx.fill();
      // Gloved hand
      ctx.fillStyle = '#EEEEDD';
      ctx.beginPath(); ctx.ellipse(0, r*0.14, r*0.12, r*0.12, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // Head
    const hhr = r * 0.42;
    const hy = -bh * 0.42;
    ctx.fillStyle = '#CC9977';
    ctx.beginPath(); ctx.arc(0, hy, hhr, 0, Math.PI*2); ctx.fill();

    // Captain's cap
    ctx.fillStyle = '#002244';
    ctx.beginPath(); ctx.ellipse(0, hy - hhr*0.72, hhr*1.15, hhr*0.35, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#003366';
    ctx.beginPath(); ctx.roundRect(-hhr*0.90, hy - hhr*1.20, hhr*1.80, hhr*0.55, [hhr*0.15, hhr*0.15, 0, 0]); ctx.fill();
    // Cap badge
    ctx.fillStyle = '#FFDD44'; ctx.shadowColor = '#FFAA00'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(0, hy - hhr*0.85, hhr*0.18, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Eyes
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.ellipse(s*hhr*0.30, hy - hhr*0.02, hhr*0.14, hhr*0.11, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#224488';
      ctx.beginPath(); ctx.ellipse(s*hhr*0.30, hy - hhr*0.02, hhr*0.08, hhr*0.09, 0, 0, Math.PI*2); ctx.fill();
    }

    // Stern expression
    ctx.strokeStyle = '#664433'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-hhr*0.25, hy + hhr*0.28); ctx.lineTo(hhr*0.25, hy + hhr*0.28); ctx.stroke();

    ctx.restore();

    // Harpoon gun
    const gl = r + 15;
    const gx = x + Math.cos(this._angle)*gl, gy = y + Math.sin(this._angle)*gl;
    const ga0x = x + Math.cos(this._angle)*r*0.50, ga0y = y + Math.sin(this._angle)*r*0.50;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(ga0x+1, ga0y+1.5); ctx.lineTo(gx+1, gy+1.5); ctx.stroke();
    ctx.strokeStyle = '#445566'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(ga0x, ga0y); ctx.lineTo(gx, gy); ctx.stroke();
    // Harpoon tip
    ctx.strokeStyle = '#88AACC'; ctx.lineWidth = 2;
    const hx = gx, hy2 = gy;
    const hAngle = this._angle;
    ctx.beginPath();
    ctx.moveTo(hx, hy2);
    ctx.lineTo(hx + Math.cos(hAngle)*10, hy2 + Math.sin(hAngle)*10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(hAngle)*6 + Math.cos(hAngle - 0.6)*6, hy2 + Math.sin(hAngle)*6 + Math.sin(hAngle - 0.6)*6);
    ctx.lineTo(hx + Math.cos(hAngle)*10, hy2 + Math.sin(hAngle)*10);
    ctx.lineTo(hx + Math.cos(hAngle)*6 + Math.cos(hAngle + 0.6)*6, hy2 + Math.sin(hAngle)*6 + Math.sin(hAngle + 0.6)*6);
    ctx.stroke();
    ctx.restore();
  }

  // ── ROBOT UNIT: dispatches to robot-themed renders ───────────
  _renderRobotUnit(ctx, x, y, r) {
    if      (this.type === 'mini')                                      this._renderScoutDrone(ctx, x, y, r);
    else if (this.type === 'big')                                       this._renderHeavyMech(ctx, x, y, r);
    else if (this.type === 'juggernaut')                               this._renderTitanMech(ctx, x, y, r);
    else if (this.type === 'police' || this.type === 'swat')           this._renderSecurityUnit(ctx, x, y, r);
    else if (this.type === 'heavyswat')                                this._renderBattleAndroid(ctx, x, y, r);
    else if (this.type === 'sniper')                                   this._renderTargetingDrone(ctx, x, y, r);
    else if (this.type === 'bomber')                                   this._renderExplosiveUnit(ctx, x, y, r);
    else                                                               this._renderHumanoidBot(ctx, x, y, r);
    this._renderHPBar(ctx, x, y, r, 40, 5);
  }

  // ── SCOUT DRONE: mini flying robot ─────
  _renderScoutDrone(ctx, x, y, r) {
    const hover = Math.sin(Date.now() * 0.006) * 2.5;
    ctx.save(); ctx.translate(x, y + hover);
    // Shadow
    ctx.globalAlpha = 0.18; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(0, r * 0.55, r * 0.7, r * 0.2, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    // Rotor arms
    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(-r*1.1, -r*0.12, r*0.5, r*0.12);
    ctx.fillRect(r*0.6, -r*0.12, r*0.5, r*0.12);
    // Rotor discs
    ctx.fillStyle = 'rgba(0,200,255,0.25)';
    ctx.beginPath(); ctx.ellipse(-r*0.88, -r*0.06, r*0.28, r*0.09, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r*0.88, -r*0.06, r*0.28, r*0.09, 0, 0, Math.PI*2); ctx.fill();
    // Body
    ctx.fillStyle = '#1c2e40';
    ctx.beginPath(); ctx.ellipse(0, 0, r*0.62, r*0.42, 0, 0, Math.PI*2); ctx.fill();
    // Lens/eye
    const eyePulse = Math.sin(Date.now() * 0.004) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255,50,50,${eyePulse})`;
    ctx.beginPath(); ctx.arc(0, -r*0.05, r*0.2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(r*0.06, -r*0.1, r*0.07, 0, Math.PI*2); ctx.fill();
    // Gun barrel (points toward angle)
    ctx.fillStyle = '#0a1828';
    ctx.fillRect(-r*0.06, r*0.3, r*0.12, r*0.32);
    ctx.restore();
  }

  // ── HUMANOID BOT: standard android enemy ─────
  _renderHumanoidBot(ctx, x, y, r) {
    const walk = Math.sin(Date.now() * 0.007) * 0.14;
    ctx.save(); ctx.translate(x, y);
    // Leg stubs
    ctx.fillStyle = '#162438';
    ctx.fillRect(-r*0.35, r*0.45, r*0.25, r*0.48);
    ctx.fillRect(r*0.1, r*0.45 + walk*6, r*0.25, r*0.48);
    // Torso
    ctx.fillStyle = '#1c2e40';
    ctx.beginPath(); ctx.roundRect(-r*0.55, -r*0.45, r*1.1, r*0.95, r*0.12); ctx.fill();
    // Chest panel glow
    ctx.fillStyle = 'rgba(0,210,255,0.35)';
    ctx.fillRect(-r*0.25, -r*0.28, r*0.5, r*0.35);
    // Head
    ctx.fillStyle = '#162438';
    ctx.beginPath(); ctx.roundRect(-r*0.32, -r*0.95, r*0.64, r*0.54, r*0.1); ctx.fill();
    // Visor
    ctx.fillStyle = 'rgba(0,200,255,0.6)';
    ctx.fillRect(-r*0.26, -r*0.85, r*0.52, r*0.2);
    // Arm stubs
    ctx.fillStyle = '#1a2a38';
    ctx.fillRect(-r*0.82, -r*0.4, r*0.28, r*0.5);
    ctx.fillRect(r*0.54, -r*0.4 + walk*4, r*0.28, r*0.5);
    // Gun
    ctx.fillStyle = '#0a1020';
    ctx.fillRect(r*0.55, -r*0.15, r*0.42, r*0.12);
    ctx.restore();
  }

  // ── ANIMAL ENEMY: jungle map — type-specific animal ─────────────────────────
  _renderAnimalEnemy(ctx, x, y, r) {
    const t = this.type;
    if (t === 'mini')                                             this._renderMonkey(ctx, x, y, r);
    else if (t === 'big' || t === 'heavyswat')                    this._renderGorilla(ctx, x, y, r);
    else if (t === 'police' || t === 'swat')                      this._renderWolf(ctx, x, y, r);
    else if (t === 'sniper')                                      this._renderPanther(ctx, x, y, r);
    else if (t === 'bomber')                                      this._renderWarthog(ctx, x, y, r);
    else if (t === 'juggernaut')                                  this._renderRhino(ctx, x, y, r);
    else                                                          this._renderTiger(ctx, x, y, r);
    this._renderHPBar(ctx, x, y, r, 36, 5);
  }

  // ── Galactica alien enemies ─────────────────────────────────────────
  _renderGalacticEnemy(ctx, x, y, r) {
    const t = this.type;
    if      (t === 'mini')                       this._renderSpaceDrone(ctx, x, y, r);
    else if (t === 'big' || t === 'heavyswat')   this._renderNovaTitan(ctx, x, y, r);
    else if (t === 'juggernaut')                 this._renderVoidColossus(ctx, x, y, r);
    else if (t === 'bomber')                     this._renderPlasmaBomber(ctx, x, y, r);
    else if (t === 'sniper')                     this._renderCosmicPhantom(ctx, x, y, r);
    else if (t === 'police' || t === 'swat')     this._renderNebulaEnforcer(ctx, x, y, r);
    else                                         this._renderXenomorph(ctx, x, y, r);
    this._renderHPBar(ctx, x, y, r, 40, 5);
  }

  _renderSpaceDrone(ctx, x, y, r) {
    // Hovering saucer disc — top-down view
    const t = this._animT;
    ctx.save();
    ctx.shadowColor = '#AA44FF'; ctx.shadowBlur = 14;
    const g = ctx.createRadialGradient(x - r*0.3, y - r*0.3, 1, x, y, r);
    g.addColorStop(0, '#CC88FF'); g.addColorStop(0.65, '#6622AA'); g.addColorStop(1, '#220033');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, r, r*0.50, 0, 0, Math.PI*2); ctx.fill();
    // Dome on top
    ctx.fillStyle = '#EE88FF';
    ctx.beginPath(); ctx.ellipse(x, y - r*0.15, r*0.40, r*0.26, 0, Math.PI, Math.PI*2); ctx.fill();
    // Rotating light ring
    ctx.shadowBlur = 0;
    const ringA = t * 2.8;
    for (let i = 0; i < 6; i++) {
      const a = ringA + i * Math.PI * 2 / 6;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(180,80,255,0.90)' : 'rgba(255,80,200,0.75)';
      ctx.beginPath(); ctx.arc(x + Math.cos(a)*r*0.82, y + Math.sin(a)*r*0.38, r*0.11, 0, Math.PI*2); ctx.fill();
    }
    // Tractor beam (pulsing downward)
    const bp = Math.sin(t * 5) * 0.4 + 0.6;
    ctx.globalAlpha = 0.18 * bp;
    ctx.fillStyle = '#AA44FF';
    ctx.beginPath();
    ctx.moveTo(x - r*0.28, y + r*0.14); ctx.lineTo(x + r*0.28, y + r*0.14);
    ctx.lineTo(x + r*0.10, y + r*1.15); ctx.lineTo(x - r*0.10, y + r*1.15);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _renderXenomorph(ctx, x, y, r) {
    // Tall elongated alien body
    const t = this._animT;
    ctx.save();
    ctx.shadowColor = '#FF44AA'; ctx.shadowBlur = 12;
    const g = ctx.createRadialGradient(x, y - r*0.2, 2, x, y, r);
    g.addColorStop(0, '#FF88CC'); g.addColorStop(0.6, '#AA0066'); g.addColorStop(1, '#330022');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, r*0.62, r, 0, 0, Math.PI*2); ctx.fill();
    // Elongated alien head
    ctx.fillStyle = '#CC2288';
    ctx.beginPath(); ctx.ellipse(x, y - r*0.88, r*0.40, r*0.45, 0, 0, Math.PI*2); ctx.fill();
    // 4 narrow eye slits
    ctx.shadowBlur = 0; ctx.fillStyle = '#FF00CC';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.ellipse(x + (i-1.5)*r*0.20, y - r*0.95, r*0.065, r*0.035, 0, 0, Math.PI*2); ctx.fill();
    }
    // 4 thin spindly arms
    ctx.lineWidth = 2; ctx.strokeStyle = '#880044'; ctx.shadowBlur = 0;
    for (let i = 0; i < 4; i++) {
      const side = i < 2 ? -1 : 1;
      const hy   = i % 2 === 0 ? -0.08 : 0.22;
      const armT = t * (1.8 + i*0.3);
      ctx.beginPath();
      ctx.moveTo(x + side*r*0.58, y + hy*r);
      ctx.lineTo(x + side*(r*0.58 + Math.cos(armT)*r*0.6 + r*1.05), y + (hy + Math.sin(armT)*0.32)*r);
      ctx.stroke();
    }
    ctx.restore();
  }

  _renderNovaTitan(ctx, x, y, r) {
    // Giant pulsating energy being
    const t = this._animT;
    ctx.save();
    ctx.shadowColor = '#44AAFF'; ctx.shadowBlur = 20;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, '#88CCFF'); g.addColorStop(0.5, '#2266CC'); g.addColorStop(1, '#001144');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
    // Energy rings
    ctx.lineWidth = 2;
    for (let ri = 0; ri < 3; ri++) {
      const phase = t * (1.5 + ri*0.5) + ri * Math.PI * 2 / 3;
      ctx.globalAlpha = 0.40 + Math.sin(phase) * 0.20;
      ctx.strokeStyle = ['#44FFFF','#4488FF','#AADDFF'][ri];
      ctx.beginPath(); ctx.arc(x, y, r * (0.55 + ri*0.20), 0, Math.PI*2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Glowing core
    ctx.shadowBlur = 28; ctx.fillStyle = '#AAEEFF';
    ctx.beginPath(); ctx.arc(x, y, r * 0.28, 0, Math.PI*2); ctx.fill();
    // 3 orbiting plasma bolts
    for (let i = 0; i < 3; i++) {
      const a = t * 2.2 + i * Math.PI * 2 / 3;
      ctx.shadowColor = '#44FFFF'; ctx.shadowBlur = 10; ctx.fillStyle = '#88FFFF';
      ctx.beginPath(); ctx.arc(x + Math.cos(a)*r*0.78, y + Math.sin(a)*r*0.78, r*0.14, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  _renderVoidColossus(ctx, x, y, r) {
    // Massive dark void entity with gravitational rings
    const t = this._animT;
    ctx.save();
    ctx.shadowColor = '#8800FF'; ctx.shadowBlur = 28;
    const g = ctx.createRadialGradient(x, y, 4, x, y, r);
    g.addColorStop(0, '#4400AA'); g.addColorStop(0.55, '#1a0044'); g.addColorStop(1, '#050008');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
    // Gravitational distortion rings
    ctx.lineWidth = 1.5;
    for (let ri = 0; ri < 5; ri++) {
      ctx.globalAlpha = (1 - ri/5) * 0.28;
      ctx.strokeStyle = '#AA44FF';
      ctx.lineWidth = 1.5 - ri*0.18;
      ctx.beginPath(); ctx.arc(x, y, r * (1.12 + ri*0.36), 0, Math.PI*2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Void eye
    ctx.shadowBlur = 22; ctx.fillStyle = '#FF00FF';
    ctx.beginPath(); ctx.arc(x, y, r * 0.22, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#220000';
    ctx.beginPath(); ctx.arc(x, y, r * 0.10, 0, Math.PI*2); ctx.fill();
    // 6 rotating void tendrils
    ctx.lineWidth = 2.5; ctx.shadowBlur = 10;
    for (let i = 0; i < 6; i++) {
      const a = t * 0.9 + i * Math.PI * 2 / 6;
      ctx.strokeStyle = i % 2 === 0 ? '#AA00FF' : '#6600CC';
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a)*r*0.85, y + Math.sin(a)*r*0.85);
      ctx.lineTo(x + Math.cos(a + 0.7)*r*1.55, y + Math.sin(a + 0.7)*r*1.55);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _renderPlasmaBomber(ctx, x, y, r) {
    // Compact sphere crackling with plasma arcs
    const t = this._animT;
    ctx.save();
    ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 16;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, '#FFCC44'); g.addColorStop(0.5, '#FF6600'); g.addColorStop(1, '#330a00');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
    // 8 crackling plasma arcs
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const a   = t*3 + i * Math.PI / 4;
      const endR = r * (1.5 + Math.sin(t*4+i)*0.3);
      ctx.strokeStyle = i%3===0 ? '#FFFF44' : '#FFAA00';
      ctx.globalAlpha = 0.70 + Math.sin(t*5+i)*0.28;
      const mx = x + Math.cos(a)*r*0.85 + Math.sin(t*6+i)*8;
      const my = y + Math.sin(a)*r*0.85 + Math.cos(t*6+i)*8;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a)*r*0.50, y + Math.sin(a)*r*0.50);
      ctx.lineTo(mx, my);
      ctx.lineTo(x + Math.cos(a)*endR, y + Math.sin(a)*endR);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _renderCosmicPhantom(ctx, x, y, r) {
    // Translucent cloaked sniper — barely visible teal shimmer
    const t = this._animT;
    ctx.save();
    ctx.shadowColor = '#44FFCC'; ctx.shadowBlur = 18;
    ctx.globalAlpha = 0.76;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, '#AAFFEE'); g.addColorStop(0.6, '#006644'); g.addColorStop(1, '#001a10');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    // Scope lens
    ctx.shadowBlur = 10; ctx.fillStyle = '#88FFDD';
    ctx.beginPath(); ctx.arc(x, y - r*0.05, r*0.30, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#002a1a';
    ctx.beginPath(); ctx.arc(x, y - r*0.05, r*0.16, 0, Math.PI*2); ctx.fill();
    // Crosshair
    ctx.strokeStyle = '#44FFCC'; ctx.lineWidth = 1; ctx.globalAlpha = 0.78;
    ctx.beginPath(); ctx.moveTo(x - r*0.28, y - r*0.05); ctx.lineTo(x + r*0.28, y - r*0.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - r*0.32); ctx.lineTo(x, y + r*0.22); ctx.stroke();
    ctx.globalAlpha = 1;
    // Cloaking shimmer particles
    for (let i = 0; i < 5; i++) {
      const a = t * 1.5 + i * Math.PI * 2 / 5;
      ctx.fillStyle = 'rgba(68,255,200,0.32)';
      ctx.beginPath(); ctx.arc(x + Math.cos(a)*r*1.1, y + Math.sin(a)*r*1.1, 2, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  _renderNebulaEnforcer(ctx, x, y, r) {
    // Galactic police — deep blue + gold star badge + siren
    const t = this._animT;
    ctx.save();
    ctx.shadowColor = '#4466FF'; ctx.shadowBlur = 14;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, '#88AAFF'); g.addColorStop(0.5, '#2244CC'); g.addColorStop(1, '#080020');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
    // Gold 7-point star badge
    ctx.shadowBlur = 8; ctx.fillStyle = '#FFCC00';
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = i * Math.PI * 2 / 7 - Math.PI/2;
      const bx = x + Math.cos(a)*r*0.42;
      const by = y + Math.sin(a)*r*0.42;
      if (i === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
    }
    ctx.closePath(); ctx.fill();
    // Alternating police siren
    const sirenOn = Math.floor(t * 4) % 2 === 0;
    ctx.fillStyle = sirenOn ? 'rgba(0,80,255,0.70)' : 'rgba(255,30,30,0.70)';
    ctx.shadowColor = sirenOn ? '#0055FF' : '#FF2200'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(x, y - r*0.72, r*0.18, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // ── SKY REALM enemies ─────────────────────────────────────────────────────
  _renderSkyEnemy(ctx, x, y, r) {
    const t = this.type;
    if      (t === 'mini')                       this._renderAngryBird(ctx, x, y, r);
    else if (t === 'big' || t === 'heavyswat')   this._renderWarHawk(ctx, x, y, r);
    else if (t === 'juggernaut')                 this._renderStormCondor(ctx, x, y, r);
    else if (t === 'bomber')                     this._renderBombPelican(ctx, x, y, r);
    else if (t === 'sniper')                     this._renderFalcon(ctx, x, y, r);
    else if (t === 'police' || t === 'swat')     this._renderFighterJet(ctx, x, y, r);
    else                                         this._renderEagle(ctx, x, y, r);
    this._renderHPBar(ctx, x, y, r, 38, 5);
  }

  // Angry Bird (mini) — lean round red bird
  _renderAngryBird(ctx, x, y, r) {
    const bob = Math.sin(this._animT * 9) * r * 0.06;
    ctx.save(); ctx.translate(x, y + bob);
    // Body
    ctx.fillStyle = '#DD1100';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
    // Belly
    ctx.fillStyle = '#FFEEEE';
    ctx.beginPath(); ctx.ellipse(r*0.06, r*0.20, r*0.34, r*0.24, 0, 0, Math.PI*2); ctx.fill();
    // Wings
    const flap = Math.sin(this._animT * 12) * r * 0.10;
    ctx.fillStyle = '#AA0800';
    ctx.beginPath(); ctx.ellipse(-r*0.88, r*0.05-flap, r*0.26, r*0.11, -0.3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( r*0.88, r*0.05-flap, r*0.26, r*0.11,  0.3, 0, Math.PI*2); ctx.fill();
    // Eyes + beak
    ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(-r*0.22, -r*0.20, r*0.16, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.22, -r*0.20, r*0.16, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-r*0.20, -r*0.19, r*0.08, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.23, -r*0.19, r*0.08, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFAA00';
    ctx.beginPath(); ctx.moveTo(-r*0.10, r*0.06); ctx.lineTo(r*0.10, r*0.06); ctx.lineTo(0, r*0.20); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Eagle (normal) — lean top-down raptor
  _renderEagle(ctx, x, y, r) {
    const flap = Math.sin(this._animT * 5) * r * 0.12;
    ctx.save(); ctx.translate(x, y);
    // Wings
    ctx.fillStyle = '#7A4A18';
    ctx.beginPath(); ctx.moveTo(0, -r*0.28); ctx.lineTo(-r*1.55, -r*0.10+flap); ctx.lineTo(-r*1.40, r*0.22); ctx.lineTo(0, r*0.28); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -r*0.28); ctx.lineTo( r*1.55, -r*0.10+flap); ctx.lineTo( r*1.40, r*0.22); ctx.lineTo(0, r*0.28); ctx.closePath(); ctx.fill();
    // Body
    ctx.fillStyle = '#6A3A10';
    ctx.beginPath(); ctx.ellipse(0, 0, r*0.44, r*0.62, 0, 0, Math.PI*2); ctx.fill();
    // White head
    ctx.fillStyle = '#F5F5F5';
    ctx.beginPath(); ctx.arc(0, -r*0.45, r*0.28, 0, Math.PI*2); ctx.fill();
    // Beak + eye
    ctx.fillStyle = '#FFB800';
    ctx.beginPath(); ctx.moveTo(-r*0.07, -r*0.66); ctx.lineTo(r*0.07, -r*0.66); ctx.lineTo(0, -r*0.88); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FF4400'; ctx.beginPath(); ctx.arc(0, -r*0.44, r*0.08, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // War Hawk (big/heavyswat) — lean armored battle bird
  _renderWarHawk(ctx, x, y, r) {
    const flap = Math.sin(this._animT * 4) * r * 0.10;
    ctx.save(); ctx.translate(x, y);
    // Armored wings
    ctx.fillStyle = '#2A3A4A';
    ctx.beginPath(); ctx.moveTo(0, -r*0.32); ctx.lineTo(-r*1.65, -r*0.25+flap); ctx.lineTo(-r*1.55, r*0.22); ctx.lineTo(0, r*0.32); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -r*0.32); ctx.lineTo( r*1.65, -r*0.25+flap); ctx.lineTo( r*1.55, r*0.22); ctx.lineTo(0, r*0.32); ctx.closePath(); ctx.fill();
    // Body
    ctx.fillStyle = '#1C2C3C';
    ctx.beginPath(); ctx.ellipse(0, 0, r*0.46, r*0.64, 0, 0, Math.PI*2); ctx.fill();
    // Head
    ctx.fillStyle = '#1C2C3C';
    ctx.beginPath(); ctx.arc(0, -r*0.48, r*0.28, 0, Math.PI*2); ctx.fill();
    // Red eyes
    ctx.fillStyle = '#FF2200';
    ctx.beginPath(); ctx.arc(-r*0.12, -r*0.50, r*0.08, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.12, -r*0.50, r*0.08, 0, Math.PI*2); ctx.fill();
    // Beak
    ctx.fillStyle = '#666'; ctx.beginPath(); ctx.moveTo(-r*0.07, -r*0.66); ctx.lineTo(r*0.07, -r*0.66); ctx.lineTo(0, -r*0.86); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Fighter Jet (police/swat) — lean delta-wing jet
  _renderFighterJet(ctx, x, y, r) {
    const isSwat = this.type === 'swat';
    ctx.save(); ctx.translate(x, y);
    // Contrail
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#88DDFF';
    ctx.beginPath(); ctx.ellipse(0, r*0.82, r*0.10, r*0.32, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    // Delta wings + fuselage
    ctx.fillStyle = isSwat ? '#2A3A5A' : '#3A4A6A';
    ctx.beginPath();
    ctx.moveTo(0, -r*0.88); ctx.lineTo(-r*1.10, r*0.55); ctx.lineTo(0, r*0.75); ctx.lineTo(r*1.10, r*0.55);
    ctx.closePath(); ctx.fill();
    // Cockpit
    ctx.fillStyle = 'rgba(120,200,255,0.60)';
    ctx.beginPath(); ctx.ellipse(0, -r*0.28, r*0.11, r*0.22, 0, 0, Math.PI*2); ctx.fill();
    // Missile tips
    ctx.fillStyle = '#FF4444';
    ctx.beginPath(); ctx.arc(-r*0.58, r*0.14, r*0.06, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.58, r*0.14, r*0.06, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Falcon (sniper) — lean swept-wing hunter
  _renderFalcon(ctx, x, y, r) {
    const glide = Math.sin(this._animT * 3) * r * 0.03;
    ctx.save(); ctx.translate(x, y + glide);
    // Swept wings
    ctx.fillStyle = '#1A2A3A';
    ctx.beginPath(); ctx.moveTo(0, -r*0.18); ctx.lineTo(-r*1.10, r*0.30); ctx.lineTo(-r*0.90, r*0.40); ctx.lineTo(0, r*0.18); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -r*0.18); ctx.lineTo( r*1.10, r*0.30); ctx.lineTo( r*0.90, r*0.40); ctx.lineTo(0, r*0.18); ctx.closePath(); ctx.fill();
    // Sleek dark body
    const bg = ctx.createRadialGradient(0, -r*0.12, 1, 0, 0, r*0.42);
    bg.addColorStop(0, '#3A4A5A'); bg.addColorStop(1, '#08121C');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(0, 0, r*0.28, r*0.60, 0, 0, Math.PI*2); ctx.fill();
    // Head — dark with white malar stripe
    ctx.fillStyle = '#0A1828';
    ctx.beginPath(); ctx.arc(0, -r*0.46, r*0.24, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#DDDDCC';
    ctx.beginPath(); ctx.arc(r*0.10, -r*0.40, r*0.08, 0, Math.PI*2); ctx.fill(); // white cheek patch
    // Sharp hooked beak
    ctx.fillStyle = '#DDAA00';
    ctx.beginPath(); ctx.moveTo(-r*0.06, -r*0.62); ctx.lineTo(r*0.06, -r*0.62);
    ctx.lineTo(r*0.04, -r*0.78); ctx.lineTo(-r*0.06, -r*0.70); ctx.closePath(); ctx.fill();
    // Piercing yellow eye
    ctx.fillStyle = '#FFCC00';
    ctx.beginPath(); ctx.arc(0, -r*0.46, r*0.09, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(0, -r*0.45, r*0.05, 0, Math.PI*2); ctx.fill();
    // Tail fan — single triangle
    ctx.fillStyle = '#0A1828';
    ctx.beginPath(); ctx.moveTo(-r*0.18, r*0.52); ctx.lineTo(0, r*0.80); ctx.lineTo(r*0.18, r*0.52); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Bomb Pelican (bomber) — lean fat bird with visible bomb
  _renderBombPelican(ctx, x, y, r) {
    const bob = Math.sin(this._animT * 4) * r * 0.04;
    ctx.save(); ctx.translate(x, y + bob);
    // Stubby wings
    ctx.fillStyle = '#778899';
    ctx.beginPath(); ctx.moveTo(0, -r*0.18); ctx.lineTo(-r*1.0, r*0.08); ctx.lineTo(-r*0.85, r*0.30); ctx.lineTo(0, r*0.18); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -r*0.18); ctx.lineTo( r*1.0, r*0.08); ctx.lineTo( r*0.85, r*0.30); ctx.lineTo(0, r*0.18); ctx.closePath(); ctx.fill();
    // Fat body
    ctx.fillStyle = '#667788';
    ctx.beginPath(); ctx.ellipse(0, r*0.06, r*0.52, r*0.64, 0, 0, Math.PI*2); ctx.fill();
    // Belly + bomb
    ctx.fillStyle = '#EEF2F5';
    ctx.beginPath(); ctx.ellipse(0, r*0.28, r*0.30, r*0.36, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(0, r*0.34, r*0.18, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FF4400'; ctx.beginPath(); ctx.arc(0, r*0.20, r*0.05, 0, Math.PI*2); ctx.fill();
    // Head + bill + eye
    ctx.fillStyle = '#667788'; ctx.beginPath(); ctx.arc(0, -r*0.50, r*0.26, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFBB44';
    ctx.beginPath(); ctx.moveTo(-r*0.08, -r*0.64); ctx.lineTo(r*0.08, -r*0.64); ctx.lineTo(r*0.06, -r*0.94); ctx.lineTo(-r*0.06, -r*0.94); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFCC00'; ctx.beginPath(); ctx.arc(0, -r*0.50, r*0.08, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Storm Condor (juggernaut) — lean massive dark raptor
  _renderStormCondor(ctx, x, y, r) {
    const slow = Math.sin(this._animT * 2.5) * r * 0.08;
    ctx.save(); ctx.translate(x, y);
    // Massive wings
    ctx.fillStyle = '#0E0E1A';
    ctx.beginPath(); ctx.moveTo(0, -r*0.38); ctx.lineTo(-r*1.90, -r*0.30+slow); ctx.lineTo(-r*1.80, r*0.26); ctx.lineTo(0, r*0.38); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -r*0.38); ctx.lineTo( r*1.90, -r*0.30+slow); ctx.lineTo( r*1.80, r*0.26); ctx.lineTo(0, r*0.38); ctx.closePath(); ctx.fill();
    // Gold lightning bolt on each wing
    ctx.fillStyle = 'rgba(255,210,0,0.72)';
    ctx.beginPath(); ctx.moveTo(-r*0.70, -r*0.38+slow*0.5); ctx.lineTo(-r*0.55, -r*0.18+slow*0.5); ctx.lineTo(-r*0.68, -r*0.18+slow*0.5); ctx.lineTo(-r*0.52, r*0.06-slow*0.5); ctx.lineTo(-r*0.76, -r*0.24+slow*0.5); ctx.lineTo(-r*0.62, -r*0.24+slow*0.5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo( r*0.70, -r*0.38+slow*0.5); ctx.lineTo( r*0.55, -r*0.18+slow*0.5); ctx.lineTo( r*0.68, -r*0.18+slow*0.5); ctx.lineTo( r*0.52, r*0.06-slow*0.5); ctx.lineTo( r*0.76, -r*0.24+slow*0.5); ctx.lineTo( r*0.62, -r*0.24+slow*0.5); ctx.closePath(); ctx.fill();
    // Body
    ctx.fillStyle = '#1A1A28';
    ctx.beginPath(); ctx.ellipse(0, 0, r*0.52, r*0.72, 0, 0, Math.PI*2); ctx.fill();
    // Head + yellow eyes + beak
    ctx.fillStyle = '#1A1A28'; ctx.beginPath(); ctx.arc(0, -r*0.54, r*0.30, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFE030';
    ctx.beginPath(); ctx.arc(-r*0.13, -r*0.56, r*0.09, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.13, -r*0.56, r*0.09, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#888'; ctx.beginPath(); ctx.moveTo(-r*0.08, -r*0.70); ctx.lineTo(r*0.08, -r*0.70); ctx.lineTo(r*0.04, -r*0.90); ctx.lineTo(-r*0.08, -r*0.78); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Monkey (mini) — small, fast, brown
  _renderMonkey(ctx, x, y, r) {
    const bob = Math.sin(this._animT * 8) * r * 0.06;
    // Shadow
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+2, y+r*0.55, r*1.0, r*0.22, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(x, y + bob);
    // Body
    ctx.fillStyle = '#8B4513'; ctx.beginPath(); ctx.ellipse(0, 0, r*0.52, r*0.62, 0, 0, Math.PI*2); ctx.fill();
    // Belly — lighter patch
    ctx.fillStyle = '#D2A070'; ctx.beginPath(); ctx.ellipse(0, r*0.1, r*0.28, r*0.38, 0, 0, Math.PI*2); ctx.fill();
    // Arms (two arcs)
    ctx.strokeStyle = '#6B3410'; ctx.lineWidth = r*0.22;
    ctx.beginPath(); ctx.arc(-r*0.55, -r*0.2, r*0.38, 0.4, Math.PI-0.4); ctx.stroke();
    ctx.beginPath(); ctx.arc( r*0.55, -r*0.2, r*0.38, 0, Math.PI*0.6); ctx.stroke();
    // Head
    ctx.fillStyle = '#8B4513'; ctx.beginPath(); ctx.arc(0, -r*0.68, r*0.48, 0, Math.PI*2); ctx.fill();
    // Face — tan muzzle
    ctx.fillStyle = '#D2A070'; ctx.beginPath(); ctx.ellipse(0, -r*0.58, r*0.28, r*0.22, 0, 0, Math.PI*2); ctx.fill();
    // Eyes
    const ea = this._angle;
    const ex0 = Math.cos(ea) * r*0.15, ey0 = Math.sin(ea) * r*0.15;
    ctx.fillStyle = '#1a0800'; ctx.beginPath(); ctx.arc(-r*0.16 + ex0*0.3, -r*0.72 + ey0*0.3, r*0.08, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.16 + ex0*0.3, -r*0.72 + ey0*0.3, r*0.08, 0, Math.PI*2); ctx.fill();
    // Ears
    ctx.fillStyle = '#6B3410';
    ctx.beginPath(); ctx.arc(-r*0.42, -r*0.85, r*0.15, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.42, -r*0.85, r*0.15, 0, Math.PI*2); ctx.fill();
    // Tail arc
    ctx.strokeStyle = '#6B3410'; ctx.lineWidth = r*0.12;
    ctx.beginPath(); ctx.arc(r*0.52, r*0.3, r*0.55, -Math.PI*0.5, Math.PI*0.4); ctx.stroke();
    ctx.restore();
  }

  // Tiger (normal) — orange with stripes
  _renderTiger(ctx, x, y, r) {
    const walk = Math.sin(this._animT * 5) * 0.12;
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+3, y+r*0.58, r*1.1, r*0.24, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.rotate(this._angle - Math.PI/2);
    const bw = r*0.55, bh = r*0.82;
    // Legs (animated)
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#CC6600';
      ctx.beginPath(); ctx.ellipse(s*r*0.26, r*0.30 + s*walk*r*0.4, r*0.18, r*0.36, s*walk*0.3, 0, Math.PI*2); ctx.fill();
    }
    // Body — orange gradient effect with flat fills
    ctx.fillStyle = '#E87820';
    ctx.beginPath(); ctx.roundRect(-bw, -bh*0.44, bw*2, bh*0.84, bw*0.32); ctx.fill();
    // Belly
    ctx.fillStyle = '#F5C880'; ctx.beginPath(); ctx.ellipse(0, bh*0.1, bw*0.55, bh*0.34, 0, 0, Math.PI*2); ctx.fill();
    // Stripes
    ctx.strokeStyle = '#1a0800'; ctx.lineWidth = r*0.08;
    for (let i = -1; i <= 1; i++) {
      ctx.save(); ctx.translate(i*bw*0.5, -bh*0.1);
      ctx.beginPath(); ctx.moveTo(-r*0.18, -bh*0.30); ctx.lineTo(r*0.10, bh*0.22); ctx.stroke();
      ctx.restore();
    }
    // Arms
    ctx.fillStyle = '#CC6600';
    ctx.beginPath(); ctx.roundRect(-bw*1.12, -bh*0.30, r*0.26, r*0.62, r*0.1); ctx.fill();
    ctx.beginPath(); ctx.roundRect( bw*0.86, -bh*0.28, r*0.26, r*0.62, r*0.1); ctx.fill();
    // Head
    ctx.fillStyle = '#E87820'; ctx.beginPath(); ctx.arc(0, -bh*0.50, r*0.44, 0, Math.PI*2); ctx.fill();
    // Muzzle
    ctx.fillStyle = '#F5C880'; ctx.beginPath(); ctx.ellipse(0, -bh*0.42, r*0.25, r*0.18, 0, 0, Math.PI*2); ctx.fill();
    // Eyes — green
    ctx.fillStyle = '#44FF44'; ctx.beginPath(); ctx.arc(-r*0.18, -bh*0.52, r*0.1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.18, -bh*0.52, r*0.1, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-r*0.18, -bh*0.52, r*0.05, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.18, -bh*0.52, r*0.05, 0, Math.PI*2); ctx.fill();
    // Ears
    ctx.fillStyle = '#CC6600';
    ctx.beginPath(); ctx.arc(-r*0.36, -bh*0.68, r*0.13, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.36, -bh*0.68, r*0.13, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Gorilla (big) — massive dark ape
  _renderGorilla(ctx, x, y, r) {
    ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+4, y+r*0.60, r*1.3, r*0.28, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(x, y);
    const bw = r*0.72, bh = r*0.80;
    // Massive legs
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#2a1a08';
      ctx.beginPath(); ctx.ellipse(s*r*0.32, r*0.35, r*0.28, r*0.44, s*0.12, 0, Math.PI*2); ctx.fill();
    }
    // Body — barrel chest
    ctx.fillStyle = '#1a1008';
    ctx.beginPath(); ctx.roundRect(-bw, -bh*0.42, bw*2, bh*0.82, bw*0.22); ctx.fill();
    // Silver-back patch
    ctx.fillStyle = '#5a5040'; ctx.beginPath(); ctx.ellipse(0, -bh*0.05, bw*0.60, bh*0.38, 0, 0, Math.PI*2); ctx.fill();
    // Long arms — knuckle-dragging
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#1a1008';
      ctx.beginPath(); ctx.roundRect(s*(bw*0.90), -bh*0.34, r*0.38*s > 0 ? r*0.38 : -r*0.38, r*0.88, r*0.16); ctx.fill();
      // Fist
      ctx.fillStyle = '#3a2810'; ctx.beginPath(); ctx.ellipse(s*(bw*1.08), r*0.42, r*0.22, r*0.20, 0, 0, Math.PI*2); ctx.fill();
    }
    // Head — large with brow
    ctx.fillStyle = '#1a1008'; ctx.beginPath(); ctx.arc(0, -bh*0.58, r*0.52, 0, Math.PI*2); ctx.fill();
    // Brow ridge
    ctx.fillStyle = '#0a0804'; ctx.beginPath(); ctx.ellipse(0, -bh*0.70, r*0.48, r*0.14, 0, Math.PI, Math.PI*2); ctx.fill();
    // Muzzle
    ctx.fillStyle = '#4a3020'; ctx.beginPath(); ctx.ellipse(0, -bh*0.50, r*0.30, r*0.22, 0, 0, Math.PI*2); ctx.fill();
    // Nostrils
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-r*0.10, -bh*0.50, r*0.06, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.10, -bh*0.50, r*0.06, 0, Math.PI*2); ctx.fill();
    // Eyes — golden yellow
    ctx.fillStyle = '#CC8800'; ctx.beginPath(); ctx.arc(-r*0.20, -bh*0.60, r*0.10, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.20, -bh*0.60, r*0.10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-r*0.20, -bh*0.60, r*0.05, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.20, -bh*0.60, r*0.05, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Wolf (police/swat) — grey stalking wolf
  _renderWolf(ctx, x, y, r) {
    const walk = Math.sin(this._animT * 6) * 0.10;
    ctx.save(); ctx.globalAlpha = 0.20; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+2, y+r*0.55, r*1.05, r*0.22, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.rotate(this._angle - Math.PI/2);
    const bw = r*0.52, bh = r*0.78;
    // Legs
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#6a6a7a';
      ctx.beginPath(); ctx.ellipse(s*r*0.24, r*0.28 + s*walk*r*0.3, r*0.16, r*0.34, s*walk*0.22, 0, Math.PI*2); ctx.fill();
    }
    // Body
    ctx.fillStyle = '#888898'; ctx.beginPath(); ctx.roundRect(-bw, -bh*0.40, bw*2, bh*0.78, bw*0.28); ctx.fill();
    // Belly (lighter)
    ctx.fillStyle = '#CCCCCC'; ctx.beginPath(); ctx.ellipse(0, bh*0.08, bw*0.48, bh*0.30, 0, 0, Math.PI*2); ctx.fill();
    // Arms
    ctx.fillStyle = '#6a6a7a';
    ctx.beginPath(); ctx.roundRect(-bw*1.08, -bh*0.28, r*0.24, r*0.56, r*0.1); ctx.fill();
    ctx.beginPath(); ctx.roundRect( bw*0.84, -bh*0.28, r*0.24, r*0.56, r*0.1); ctx.fill();
    // Head
    ctx.fillStyle = '#888898'; ctx.beginPath(); ctx.arc(0, -bh*0.50, r*0.40, 0, Math.PI*2); ctx.fill();
    // Snout (elongated)
    ctx.fillStyle = '#6a6a7a'; ctx.beginPath(); ctx.ellipse(0, -bh*0.38, r*0.20, r*0.26, 0, 0, Math.PI*2); ctx.fill();
    // Eyes — ice blue
    ctx.fillStyle = '#88CCFF'; ctx.beginPath(); ctx.arc(-r*0.16, -bh*0.52, r*0.09, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.16, -bh*0.52, r*0.09, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-r*0.16, -bh*0.52, r*0.04, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.16, -bh*0.52, r*0.04, 0, Math.PI*2); ctx.fill();
    // Ears (pointed)
    ctx.fillStyle = '#6a6a7a';
    ctx.beginPath(); ctx.moveTo(-r*0.30, -bh*0.68); ctx.lineTo(-r*0.42, -bh*0.92); ctx.lineTo(-r*0.14, -bh*0.68); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo( r*0.30, -bh*0.68); ctx.lineTo( r*0.42, -bh*0.92); ctx.lineTo( r*0.14, -bh*0.68); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Panther (sniper) — sleek black cat, crouched
  _renderPanther(ctx, x, y, r) {
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+2, y+r*0.50, r*1.05, r*0.18, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.rotate(this._angle - Math.PI/2);
    const bw = r*0.46, bh = r*0.68;
    // Low crouched body
    ctx.fillStyle = '#0a0a12'; ctx.beginPath(); ctx.roundRect(-bw, -bh*0.30, bw*2, bh*0.62, bw*0.30); ctx.fill();
    // Green gem spots
    ctx.fillStyle = '#22AA44'; ctx.globalAlpha = 0.35;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i*bw*0.52, -bh*0.05, r*0.08, 0, Math.PI*2); ctx.fill(); }
    ctx.globalAlpha = 1;
    // Lithe arms
    ctx.fillStyle = '#0a0a12';
    ctx.beginPath(); ctx.roundRect(-bw*1.06, -bh*0.22, r*0.22, r*0.50, r*0.09); ctx.fill();
    ctx.beginPath(); ctx.roundRect( bw*0.84, -bh*0.22, r*0.22, r*0.50, r*0.09); ctx.fill();
    // Head — sleek oval
    ctx.fillStyle = '#0a0a12'; ctx.beginPath(); ctx.ellipse(0, -bh*0.48, r*0.36, r*0.32, 0, 0, Math.PI*2); ctx.fill();
    // Glowing green eyes
    ctx.fillStyle = '#22FF66'; ctx.beginPath(); ctx.arc(-r*0.15, -bh*0.50, r*0.10, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.15, -bh*0.50, r*0.10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-r*0.15, -bh*0.50, r*0.04, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.15, -bh*0.50, r*0.04, 0, Math.PI*2); ctx.fill();
    // Small ears
    ctx.fillStyle = '#1a1a22';
    ctx.beginPath(); ctx.moveTo(-r*0.26, -bh*0.64); ctx.lineTo(-r*0.34, -bh*0.82); ctx.lineTo(-r*0.12, -bh*0.64); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo( r*0.26, -bh*0.64); ctx.lineTo( r*0.34, -bh*0.82); ctx.lineTo( r*0.12, -bh*0.64); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Warthog (bomber) — stocky wild pig
  _renderWarthog(ctx, x, y, r) {
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+2, y+r*0.55, r*1.1, r*0.22, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.rotate(this._angle - Math.PI/2);
    const bw = r*0.60, bh = r*0.72;
    // Stubby legs
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#6B4010';
      ctx.beginPath(); ctx.ellipse(s*r*0.28, r*0.32, r*0.18, r*0.30, 0, 0, Math.PI*2); ctx.fill();
    }
    // Barrel body
    ctx.fillStyle = '#8B5a28'; ctx.beginPath(); ctx.roundRect(-bw, -bh*0.38, bw*2, bh*0.76, bw*0.26); ctx.fill();
    // Dark back stripe
    ctx.fillStyle = '#3a2810'; ctx.beginPath(); ctx.roundRect(-bw*0.60, -bh*0.42, bw*1.20, bh*0.22, bw*0.12); ctx.fill();
    // Head — wide snout
    ctx.fillStyle = '#8B5a28'; ctx.beginPath(); ctx.ellipse(0, -bh*0.50, r*0.48, r*0.38, 0, 0, Math.PI*2); ctx.fill();
    // Disc snout
    ctx.fillStyle = '#CC8855'; ctx.beginPath(); ctx.ellipse(0, -bh*0.38, r*0.28, r*0.20, 0, 0, Math.PI*2); ctx.fill();
    // Nostrils
    ctx.fillStyle = '#5a2808'; ctx.beginPath(); ctx.arc(-r*0.10, -bh*0.36, r*0.07, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.10, -bh*0.36, r*0.07, 0, Math.PI*2); ctx.fill();
    // Tusks
    ctx.strokeStyle = '#EEE8AA'; ctx.lineWidth = r*0.10;
    ctx.beginPath(); ctx.arc(-r*0.16, -bh*0.34, r*0.22, -0.4, Math.PI*0.2); ctx.stroke();
    ctx.beginPath(); ctx.arc( r*0.16, -bh*0.34, r*0.22, -Math.PI*0.2, 0.4); ctx.stroke();
    // Tiny eyes
    ctx.fillStyle = '#FF4400'; ctx.beginPath(); ctx.arc(-r*0.22, -bh*0.54, r*0.08, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.22, -bh*0.54, r*0.08, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Rhino (juggernaut) — armored behemoth
  _renderRhino(ctx, x, y, r) {
    ctx.save(); ctx.globalAlpha = 0.32; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+5, y+r*0.60, r*1.4, r*0.30, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(x, y);
    const bw = r*0.76, bh = r*0.78;
    // Thick legs
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#5a5a5a';
      ctx.beginPath(); ctx.ellipse(s*r*0.35, r*0.38, r*0.28, r*0.42, s*0.08, 0, Math.PI*2); ctx.fill();
      // Hooves
      ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.ellipse(s*r*0.36, r*0.66, r*0.22, r*0.12, 0, 0, Math.PI*2); ctx.fill();
    }
    // Massive body
    ctx.fillStyle = '#6a6a6a'; ctx.beginPath(); ctx.roundRect(-bw, -bh*0.40, bw*2, bh*0.80, bw*0.18); ctx.fill();
    // Armored plates / folds
    ctx.fillStyle = '#5a5a5a'; ctx.lineWidth = 0;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.roundRect(i*bw*0.48 - bw*0.22, -bh*0.30, bw*0.44, bh*0.60, bw*0.08); ctx.fill();
    }
    // Head — tank-like
    ctx.fillStyle = '#5a5a5a'; ctx.beginPath(); ctx.roundRect(-r*0.52, -bh*0.68, r*1.04, r*0.72, r*0.12); ctx.fill();
    // Horn
    ctx.fillStyle = '#3a3028'; ctx.beginPath();
    ctx.moveTo(-r*0.08, -bh*0.70); ctx.lineTo(r*0.08, -bh*0.70); ctx.lineTo(0, -bh*1.05); ctx.closePath(); ctx.fill();
    // Small second horn
    ctx.fillStyle = '#4a4030'; ctx.beginPath();
    ctx.moveTo(-r*0.06, -bh*0.55); ctx.lineTo(r*0.06, -bh*0.55); ctx.lineTo(0, -bh*0.72); ctx.closePath(); ctx.fill();
    // Tiny eyes — red glow
    ctx.fillStyle = '#FF2200'; ctx.beginPath(); ctx.arc(-r*0.28, -bh*0.52, r*0.10, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.28, -bh*0.52, r*0.10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FF6600'; ctx.beginPath(); ctx.arc(-r*0.28, -bh*0.52, r*0.05, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.28, -bh*0.52, r*0.05, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // ── HEAVY MECH: big armored robot ─────
  _renderHeavyMech(ctx, x, y, r) {
    const step = Math.sin(Date.now() * 0.004) * 0.1;
    ctx.save(); ctx.translate(x, y);
    // Thick legs
    ctx.fillStyle = '#101c2c';
    ctx.beginPath(); ctx.roundRect(-r*0.48, r*0.4, r*0.38, r*0.62, r*0.06); ctx.fill();
    ctx.beginPath(); ctx.roundRect(r*0.1, r*0.4 + step*8, r*0.38, r*0.62, r*0.06); ctx.fill();
    // Wide torso
    ctx.fillStyle = '#0e1e30';
    ctx.beginPath(); ctx.roundRect(-r*0.78, -r*0.52, r*1.56, r*0.96, r*0.1); ctx.fill();
    // Shoulder cannons
    ctx.fillStyle = '#FF4400';
    ctx.beginPath(); ctx.arc(-r*0.82, -r*0.42, r*0.22, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(r*0.82, -r*0.42, r*0.22, 0, Math.PI*2); ctx.fill();
    // Cannon barrels
    ctx.fillStyle = '#080e18';
    ctx.fillRect(-r*0.92, -r*0.48, r*0.48, r*0.12);
    ctx.fillRect(r*0.44, -r*0.48, r*0.48, r*0.12);
    // Head block
    ctx.fillStyle = '#101a28';
    ctx.beginPath(); ctx.roundRect(-r*0.3, -r*1.02, r*0.6, r*0.52, r*0.08); ctx.fill();
    // Red visor
    ctx.fillStyle = 'rgba(255,60,0,0.75)';
    ctx.fillRect(-r*0.24, -r*0.92, r*0.48, r*0.18);
    // Chest glow
    ctx.fillStyle = 'rgba(255,80,0,0.28)';
    ctx.beginPath(); ctx.arc(0, -r*0.05, r*0.28, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // ── SECURITY UNIT: police-style android ─────
  _renderSecurityUnit(ctx, x, y, r) {
    const walk = Math.sin(Date.now() * 0.007) * 0.12;
    ctx.save(); ctx.translate(x, y);
    // Legs
    ctx.fillStyle = '#0c1c3a';
    ctx.fillRect(-r*0.36, r*0.42, r*0.26, r*0.5);
    ctx.fillRect(r*0.1, r*0.42 + walk*5, r*0.26, r*0.5);
    // Torso — blue-tinted armor
    ctx.fillStyle = '#0a1a3a';
    ctx.beginPath(); ctx.roundRect(-r*0.58, -r*0.5, r*1.16, r*0.95, r*0.1); ctx.fill();
    // Shield badge
    ctx.fillStyle = 'rgba(50,100,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(0, -r*0.42); ctx.lineTo(r*0.28, -r*0.18); ctx.lineTo(r*0.22, r*0.18);
    ctx.lineTo(0, r*0.3); ctx.lineTo(-r*0.22, r*0.18); ctx.lineTo(-r*0.28, -r*0.18);
    ctx.closePath(); ctx.fill();
    // Head — rounded helmet
    ctx.fillStyle = '#0c1c38';
    ctx.beginPath(); ctx.arc(0, -r*0.72, r*0.38, 0, Math.PI*2); ctx.fill();
    // Blue visor strip
    ctx.fillStyle = 'rgba(60,140,255,0.7)';
    ctx.fillRect(-r*0.3, -r*0.82, r*0.6, r*0.18);
    // Arms
    ctx.fillStyle = '#0a182e';
    ctx.fillRect(-r*0.84, -r*0.38, r*0.28, r*0.44);
    ctx.fillRect(r*0.56, -r*0.38 + walk*4, r*0.28, r*0.44);
    // Siren flash
    const sirenOn = Math.sin(Date.now() * 0.008) > 0;
    ctx.fillStyle = sirenOn ? 'rgba(60,140,255,0.8)' : 'rgba(255,60,60,0.8)';
    ctx.fillRect(-r*0.14, -r*1.12, r*0.28, r*0.1);
    ctx.restore();
  }

  // ── BATTLE ANDROID: heavy swat robot ─────
  _renderBattleAndroid(ctx, x, y, r) {
    const walk = Math.sin(Date.now() * 0.005) * 0.1;
    ctx.save(); ctx.translate(x, y);
    // Legs
    ctx.fillStyle = '#1a1400';
    ctx.fillRect(-r*0.42, r*0.4, r*0.32, r*0.56);
    ctx.fillRect(r*0.1, r*0.4 + walk*7, r*0.32, r*0.56);
    // Torso — black with yellow markings
    ctx.fillStyle = '#1a1400';
    ctx.beginPath(); ctx.roundRect(-r*0.68, -r*0.56, r*1.36, r*0.98, r*0.1); ctx.fill();
    // Yellow hazard stripes
    ctx.fillStyle = 'rgba(255,200,0,0.5)';
    ctx.fillRect(-r*0.55, -r*0.18, r*1.1, r*0.12);
    ctx.fillRect(-r*0.55, r*0.12, r*1.1, r*0.12);
    // Head
    ctx.fillStyle = '#141000';
    ctx.beginPath(); ctx.roundRect(-r*0.34, -r*1.0, r*0.68, r*0.48, r*0.08); ctx.fill();
    // Yellow visor
    ctx.fillStyle = 'rgba(255,180,0,0.75)';
    ctx.fillRect(-r*0.28, -r*0.9, r*0.56, r*0.18);
    // Arms — thick
    ctx.fillStyle = '#12100a';
    ctx.fillRect(-r*0.96, -r*0.48, r*0.3, r*0.56);
    ctx.fillRect(r*0.66, -r*0.48 + walk*4, r*0.3, r*0.56);
    // Dual gun barrels
    ctx.fillStyle = '#0a0800';
    ctx.fillRect(-r*1.08, -r*0.3, r*0.46, r*0.1);
    ctx.fillRect(-r*1.08, -r*0.18, r*0.46, r*0.1);
    ctx.restore();
  }

  // ── TARGETING DRONE: sniper flying unit ─────
  _renderTargetingDrone(ctx, x, y, r) {
    const hover = Math.sin(Date.now() * 0.005) * 3;
    const rotorSpin = (Date.now() * 0.01) % (Math.PI * 2);
    ctx.save(); ctx.translate(x, y + hover);
    // Shadow
    ctx.globalAlpha = 0.15; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(0, r * 0.6, r * 0.8, r * 0.22, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    // 4 rotor arms
    for (let i = 0; i < 4; i++) {
      const ang = rotorSpin + i * Math.PI * 0.5;
      ctx.save(); ctx.rotate(ang);
      ctx.fillStyle = '#0a1a28';
      ctx.fillRect(0, -r*0.08, r*1.0, r*0.08);
      ctx.fillStyle = 'rgba(0,180,255,0.2)';
      ctx.beginPath(); ctx.ellipse(r*0.92, 0, r*0.18, r*0.06, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    // Body
    ctx.fillStyle = '#080e16';
    ctx.beginPath(); ctx.arc(0, 0, r*0.44, 0, Math.PI*2); ctx.fill();
    // Scope lens
    ctx.fillStyle = '#001820';
    ctx.beginPath(); ctx.arc(0, 0, r*0.3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(0,255,100,0.6)';
    ctx.beginPath(); ctx.arc(0, 0, r*0.18, 0, Math.PI*2); ctx.fill();
    // Crosshair
    ctx.strokeStyle = 'rgba(0,255,100,0.4)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-r*0.38, 0); ctx.lineTo(r*0.38, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -r*0.38); ctx.lineTo(0, r*0.38); ctx.stroke();
    // Long sniper barrel
    ctx.fillStyle = '#060c14';
    ctx.fillRect(-r*0.05, r*0.38, r*0.1, r*0.55);
    ctx.restore();
  }

  // ── EXPLOSIVE UNIT: bomber robot ─────
  _renderExplosiveUnit(ctx, x, y, r) {
    const bob = Math.sin(Date.now() * 0.007) * 2.5;
    ctx.save(); ctx.translate(x, y + bob);
    // Round bomb body
    ctx.fillStyle = '#1a0e00';
    ctx.beginPath(); ctx.arc(0, 0, r*0.72, 0, Math.PI*2); ctx.fill();
    // Warning stripes
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#FF8800';
    for (let s = 0; s < 4; s++) {
      ctx.save(); ctx.rotate(s * Math.PI * 0.5 + 0.4);
      ctx.fillRect(-r*0.08, -r*0.75, r*0.16, r*0.38);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // Orange hazard ring
    ctx.strokeStyle = 'rgba(255,120,0,0.65)'; ctx.lineWidth = r*0.1;
    ctx.beginPath(); ctx.arc(0, 0, r*0.6, 0, Math.PI*2); ctx.stroke();
    // Fuse
    ctx.strokeStyle = '#886622'; ctx.lineWidth = r*0.08;
    ctx.beginPath(); ctx.moveTo(0, -r*0.7); ctx.quadraticCurveTo(r*0.3, -r*1.0, r*0.1, -r*1.1); ctx.stroke();
    // Fuse spark
    const sparkAmt = Math.sin(Date.now() * 0.015) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255,${120+Math.round(sparkAmt*120)},0,${0.7+sparkAmt*0.3})`;
    ctx.beginPath(); ctx.arc(r*0.1, -r*1.1, r*0.1, 0, Math.PI*2); ctx.fill();
    // Eye — single red LED
    const eyeFlash = Math.sin(Date.now() * 0.003) > 0.6;
    ctx.fillStyle = eyeFlash ? '#FF0000' : '#880000';
    ctx.beginPath(); ctx.arc(0, -r*0.08, r*0.2, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // ── TITAN MECH: juggernaut massive robot ─────
  _renderTitanMech(ctx, x, y, r) {
    const step = Math.sin(Date.now() * 0.003) * 0.08;
    ctx.save(); ctx.translate(x, y);
    // Massive legs
    ctx.fillStyle = '#0c0c0c';
    ctx.beginPath(); ctx.roundRect(-r*0.6, r*0.42, r*0.48, r*0.7, r*0.06); ctx.fill();
    ctx.beginPath(); ctx.roundRect(r*0.12, r*0.42 + step*10, r*0.48, r*0.7, r*0.06); ctx.fill();
    // Massive torso
    ctx.fillStyle = '#101010';
    ctx.beginPath(); ctx.roundRect(-r*0.9, -r*0.62, r*1.8, r*1.06, r*0.08); ctx.fill();
    // Red glowing reactor core
    const corePulse = Math.sin(Date.now() * 0.004) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(255,0,0,${corePulse * 0.5})`;
    ctx.beginPath(); ctx.arc(0, r*0.06, r*0.38, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FF0000';
    ctx.beginPath(); ctx.arc(0, r*0.06, r*0.18, 0, Math.PI*2); ctx.fill();
    // Shoulder weapon mounts
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath(); ctx.roundRect(-r*1.1, -r*0.58, r*0.24, r*0.46, r*0.04); ctx.fill();
    ctx.beginPath(); ctx.roundRect(r*0.86, -r*0.58, r*0.24, r*0.46, r*0.04); ctx.fill();
    // Shoulder gun barrels × 2 each side
    ctx.fillStyle = '#050505';
    ctx.fillRect(-r*1.28, -r*0.5, r*0.48, r*0.1);
    ctx.fillRect(-r*1.28, -r*0.36, r*0.48, r*0.1);
    ctx.fillRect(r*0.8, -r*0.5, r*0.48, r*0.1);
    ctx.fillRect(r*0.8, -r*0.36, r*0.48, r*0.1);
    // Helmet
    ctx.fillStyle = '#0e0e0e';
    ctx.beginPath(); ctx.roundRect(-r*0.42, -r*1.18, r*0.84, r*0.58, r*0.08); ctx.fill();
    // Red visor bar
    ctx.fillStyle = `rgba(255,0,0,${corePulse * 0.85})`;
    ctx.fillRect(-r*0.36, -r*1.06, r*0.72, r*0.2);
    ctx.restore();
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

  // ── DINO ENEMY: prehistoric map — type-specific dinosaur ─────────────────
  _renderDinoEnemy(ctx, x, y, r) {
    const t = this.type;
    if      (t === 'mini')                       this._renderRaptor(ctx, x, y, r);
    else if (t === 'big' || t === 'heavyswat')   this._renderAnkylosaurus(ctx, x, y, r);
    else if (t === 'juggernaut')                 this._renderSpinosaurus(ctx, x, y, r);
    else if (t === 'bomber')                     this._renderPterosaur(ctx, x, y, r);
    else if (t === 'sniper')                     this._renderPlesiosaur(ctx, x, y, r);
    else if (t === 'police' || t === 'swat')     this._renderCeratopsian(ctx, x, y, r);
    else                                         this._renderTRexMini(ctx, x, y, r);
    this._renderHPBar(ctx, x, y, r, 40, 5);
  }

  // ── RAPTOR: fast sleek pack hunter ─────────────────────────────────────────
  _renderRaptor(ctx, x, y, r) {
    const t = this._animT;
    const run = Math.sin(t * 14) * 0.18;
    // Ground shadow
    ctx.save(); ctx.globalAlpha = 0.20; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+1, y+r*0.25, r*0.85, r*0.18, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2);

    // Tail — drawn first (behind body), sweeping curve
    ctx.strokeStyle = '#3a7a18'; ctx.lineWidth = r*0.18; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, r*0.5);
    ctx.bezierCurveTo(r*(0.25+run*0.3), r*0.75, r*(0.35+run*0.2), r*0.88, r*0.18, r*1.02);
    ctx.stroke();
    // Tail taper
    ctx.strokeStyle = '#2a5c10'; ctx.lineWidth = r*0.08;
    ctx.beginPath(); ctx.moveTo(r*0.16, r*0.96); ctx.lineTo(r*0.24, r*1.14); ctx.stroke();
    ctx.lineCap = 'butt';

    // Body — elongated teardrop, olive-green with gradient
    const bg = ctx.createLinearGradient(0, -r*0.5, 0, r*0.5);
    bg.addColorStop(0, '#7acc38'); bg.addColorStop(0.4, '#5a9a28'); bg.addColorStop(1, '#2e5c10');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(0, 0, r*0.36, r*0.64, 0, 0, Math.PI*2); ctx.fill();

    // Scale texture — small arcs across body
    ctx.strokeStyle = 'rgba(20,60,5,0.45)'; ctx.lineWidth = r*0.06;
    for (let si = -2; si <= 2; si++) {
      const sy = si * r*0.18;
      ctx.beginPath(); ctx.arc(0, sy, r*0.22, Math.PI*0.1, Math.PI*0.9); ctx.stroke();
    }
    // Dorsal stripe
    ctx.strokeStyle = 'rgba(10,40,2,0.5)'; ctx.lineWidth = r*0.07;
    ctx.beginPath(); ctx.moveTo(0, -r*0.55); ctx.lineTo(0, r*0.48); ctx.stroke();

    // Legs — animating sickle claws
    const legOff = run * r;
    ctx.fillStyle = '#4a8820';
    ctx.beginPath(); ctx.ellipse(-r*0.20+legOff*0.6, r*0.38, r*0.09, r*0.20, 0.4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( r*0.20-legOff*0.6, r*0.38, r*0.09, r*0.20, -0.4, 0, Math.PI*2); ctx.fill();
    // Sickle claw marks
    ctx.strokeStyle = '#c8d090'; ctx.lineWidth = r*0.055; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-r*0.20+legOff*0.6, r*0.54, r*0.09, 0.2, 1.4); ctx.stroke();
    ctx.beginPath(); ctx.arc( r*0.20-legOff*0.6, r*0.54, r*0.09, 0.2, 1.4); ctx.stroke();
    ctx.lineCap = 'butt';

    // Neck — connecting body to head
    ctx.fillStyle = '#5a9a28';
    ctx.beginPath(); ctx.moveTo(-r*0.16, -r*0.44); ctx.lineTo(r*0.16, -r*0.44);
    ctx.lineTo(r*0.12, -r*0.6); ctx.lineTo(-r*0.12, -r*0.6); ctx.closePath(); ctx.fill();

    // Head — distinct wedge shape
    const hg = ctx.createRadialGradient(0, -r*0.7, 1, 0, -r*0.68, r*0.3);
    hg.addColorStop(0, '#88cc44'); hg.addColorStop(1, '#4a8820');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.ellipse(0, -r*0.70, r*0.26, r*0.22, 0, 0, Math.PI*2); ctx.fill();

    // Upper jaw — elongated snout
    ctx.fillStyle = '#5a9a28';
    ctx.beginPath(); ctx.moveTo(-r*0.10, -r*0.82); ctx.lineTo(r*0.10, -r*0.82);
    ctx.lineTo(r*0.06, -r*0.98); ctx.lineTo(-r*0.06, -r*0.98); ctx.closePath(); ctx.fill();
    // Lower jaw (open, showing red)
    ctx.fillStyle = '#cc3300';
    ctx.beginPath(); ctx.moveTo(-r*0.09, -r*0.80); ctx.lineTo(r*0.09, -r*0.80);
    ctx.lineTo(r*0.05, -r*0.92); ctx.lineTo(-r*0.05, -r*0.92); ctx.closePath(); ctx.fill();
    // Teeth — tiny white triangles
    ctx.fillStyle = '#eeeebb';
    for (let ti = -2; ti <= 2; ti++) {
      ctx.beginPath(); ctx.moveTo(ti*r*0.04, -r*0.82); ctx.lineTo(ti*r*0.04+r*0.02, -r*0.88); ctx.lineTo(ti*r*0.04-r*0.02, -r*0.88); ctx.closePath(); ctx.fill();
    }

    // Slit-pupil eye — glowing yellow
    ctx.fillStyle = '#FFE000'; ctx.shadowColor = '#FFEE00'; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.ellipse(-r*0.10, -r*0.72, r*0.075, r*0.065, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(-r*0.10, -r*0.72, r*0.025, r*0.058, 0, 0, Math.PI*2); ctx.fill();
    // Eye shine
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(-r*0.115, -r*0.732, r*0.018, 0, Math.PI*2); ctx.fill();

    // Tiny vestigial forearms
    ctx.strokeStyle = '#4a8820'; ctx.lineWidth = r*0.09; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r*0.22, -r*0.10); ctx.lineTo(-r*0.34, r*0.04); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( r*0.22, -r*0.10); ctx.lineTo( r*0.34, r*0.04); ctx.stroke();
    ctx.lineCap = 'butt';

    ctx.restore();
  }

  // ── T-REX MINI: heavy bipedal predator ────────────────────────────────────
  _renderTRexMini(ctx, x, y, r) {
    const t = this._animT;
    const stomp = Math.abs(Math.sin(t * 7)) * 0.14;
    // Shadow
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+2, y+r*0.32, r*1.05, r*0.22, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2);

    // Thick tail first
    ctx.strokeStyle = '#4a7820'; ctx.lineWidth = r*0.26; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, r*0.62);
    ctx.bezierCurveTo(r*0.30, r*0.80, r*0.44, r*0.94, r*0.28, r*1.12);
    ctx.stroke();
    ctx.strokeStyle = '#2e5210'; ctx.lineWidth = r*0.10;
    ctx.beginPath(); ctx.moveTo(r*0.26, r*1.06); ctx.lineTo(r*0.34, r*1.22); ctx.stroke();
    ctx.lineCap = 'butt';

    // Bulky body
    const bg = ctx.createLinearGradient(0, -r*0.45, 0, r*0.65);
    bg.addColorStop(0, '#9acc44'); bg.addColorStop(0.35, '#6a9a28'); bg.addColorStop(0.7, '#4a7018'); bg.addColorStop(1, '#2a4810');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(0, r*0.10, r*0.54, r*0.72, 0, 0, Math.PI*2); ctx.fill();

    // Scale rows across back
    ctx.strokeStyle = 'rgba(15,50,5,0.40)'; ctx.lineWidth = r*0.07;
    for (let si = -2; si <= 3; si++) {
      ctx.beginPath(); ctx.arc(0, si*r*0.20+r*0.1, r*0.35, Math.PI*0.1, Math.PI*0.9); ctx.stroke();
    }
    // Belly lighter shade
    const belly = ctx.createLinearGradient(-r*0.2, 0, r*0.2, 0);
    belly.addColorStop(0, 'rgba(0,0,0,0)'); belly.addColorStop(0.5, 'rgba(180,220,100,0.18)'); belly.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(0, r*0.2, r*0.28, r*0.52, 0, 0, Math.PI*2); ctx.fill();

    // Heavy stomp legs
    ctx.fillStyle = '#5a8820';
    ctx.beginPath(); ctx.ellipse(-r*0.22, r*0.62+stomp*r, r*0.15, r*0.25, 0.25, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( r*0.22, r*0.62-stomp*r, r*0.15, r*0.25, -0.25, 0, Math.PI*2); ctx.fill();
    // Clawed feet
    ctx.strokeStyle = '#c8d080'; ctx.lineWidth = r*0.055; ctx.lineCap = 'round';
    for (let ci = -1; ci <= 1; ci++) {
      ctx.beginPath(); ctx.moveTo(-r*0.22+ci*r*0.06, r*0.84+stomp*r); ctx.lineTo(-r*0.22+ci*r*0.10, r*0.96+stomp*r); ctx.stroke();
      ctx.beginPath(); ctx.moveTo( r*0.22+ci*r*0.06, r*0.84-stomp*r); ctx.lineTo( r*0.22+ci*r*0.10, r*0.96-stomp*r); ctx.stroke();
    }
    ctx.lineCap = 'butt';

    // Tiny vestigial arms
    ctx.strokeStyle = '#6a9820'; ctx.lineWidth = r*0.11; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r*0.32, -r*0.12); ctx.lineTo(-r*0.48, r*0.06); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( r*0.32, -r*0.12); ctx.lineTo( r*0.48, r*0.06); ctx.stroke();
    ctx.lineCap = 'butt';

    // Massive head
    const hg = ctx.createRadialGradient(0, -r*0.54, 2, 0, -r*0.50, r*0.44);
    hg.addColorStop(0, '#aad848'); hg.addColorStop(0.6, '#7aaa30'); hg.addColorStop(1, '#4a7818');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.ellipse(0, -r*0.54, r*0.44, r*0.34, 0, 0, Math.PI*2); ctx.fill();

    // Snout extending forward
    ctx.fillStyle = '#7aaa30';
    ctx.beginPath(); ctx.moveTo(-r*0.22, -r*0.72); ctx.lineTo(r*0.22, -r*0.72);
    ctx.lineTo(r*0.18, -r*0.94); ctx.lineTo(-r*0.18, -r*0.94); ctx.closePath(); ctx.fill();

    // Open jaw (lower)
    ctx.fillStyle = '#dd3300';
    ctx.beginPath(); ctx.moveTo(-r*0.20, -r*0.68); ctx.lineTo(r*0.20, -r*0.68);
    ctx.lineTo(r*0.16, -r*0.86); ctx.lineTo(-r*0.16, -r*0.86); ctx.closePath(); ctx.fill();
    // Tongue
    ctx.fillStyle = '#ff6644';
    ctx.beginPath(); ctx.moveTo(-r*0.06, -r*0.70); ctx.lineTo(r*0.06, -r*0.70);
    ctx.lineTo(0, -r*0.82); ctx.closePath(); ctx.fill();

    // Teeth rows — both jaws
    ctx.fillStyle = '#eeeebb';
    for (let ti = -3; ti <= 3; ti++) {
      ctx.beginPath(); ctx.moveTo(ti*r*0.06, -r*0.72); ctx.lineTo(ti*r*0.06+r*0.025, -r*0.80); ctx.lineTo(ti*r*0.06-r*0.025, -r*0.80); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(ti*r*0.06, -r*0.68); ctx.lineTo(ti*r*0.06+r*0.025, -r*0.76); ctx.lineTo(ti*r*0.06-r*0.025, -r*0.76); ctx.closePath(); ctx.fill();
    }

    // Amber slit eye
    ctx.fillStyle = '#FF8800'; ctx.shadowColor = '#FF8800'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.ellipse(r*0.18, -r*0.58, r*0.09, r*0.075, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#220000';
    ctx.beginPath(); ctx.ellipse(r*0.18, -r*0.58, r*0.028, r*0.068, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath(); ctx.arc(r*0.165, -r*0.595, r*0.02, 0, Math.PI*2); ctx.fill();

    // Brow ridge
    ctx.strokeStyle = '#3a5c10'; ctx.lineWidth = r*0.07;
    ctx.beginPath(); ctx.moveTo(r*0.08, -r*0.64); ctx.lineTo(r*0.28, -r*0.60); ctx.stroke();

    ctx.restore();
  }

  // ── ANKYLOSAURUS: heavily armored tank dino ───────────────────────────────
  _renderAnkylosaurus(ctx, x, y, r) {
    const t = this._animT;
    const sway = Math.sin(t * 3.5) * 0.07;
    // Shadow — very wide
    ctx.save(); ctx.globalAlpha = 0.24; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+2, y+r*0.35, r*1.25, r*0.24, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2 + sway);

    // Club tail first
    ctx.strokeStyle = '#5a7228'; ctx.lineWidth = r*0.20; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, r*0.68); ctx.lineTo(0, r*0.94); ctx.stroke();
    ctx.lineCap = 'butt';
    // Club head — spiked ball
    ctx.fillStyle = '#8aaa44'; ctx.shadowColor = '#aabb55'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0, r*1.04, r*0.26, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    // Spikes on club
    ctx.fillStyle = '#c8d890'; ctx.strokeStyle = '#556622'; ctx.lineWidth = 0.8;
    for (let si = 0; si < 6; si++) {
      const sa = (si/6)*Math.PI*2;
      const sx2 = Math.cos(sa)*r*0.22, sy2 = r*1.04+Math.sin(sa)*r*0.22;
      ctx.beginPath(); ctx.moveTo(sx2,sy2); ctx.lineTo(Math.cos(sa)*r*0.34+0, r*1.04+Math.sin(sa)*r*0.34); ctx.stroke();
    }

    // Wide armored body — nearly circular top
    const bg = ctx.createRadialGradient(0, 0, r*0.1, 0, 0, r*0.94);
    bg.addColorStop(0, '#bbd070'); bg.addColorStop(0.4, '#889944'); bg.addColorStop(0.75, '#5a7228'); bg.addColorStop(1, '#384a18');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(0, 0, r*0.86, r*0.96, 0, 0, Math.PI*2); ctx.fill();

    // Armor plates — hexagonal pattern
    const plateCenters = [
      [0,-r*0.58],[r*0.30,-r*0.46],[-r*0.30,-r*0.46],
      [r*0.46,-r*0.12],[-r*0.46,-r*0.12],[0,-r*0.20],
      [r*0.30, r*0.14],[-r*0.30, r*0.14],[0, r*0.12]
    ];
    ctx.fillStyle = '#ccd870'; ctx.strokeStyle = '#445518'; ctx.lineWidth = r*0.06;
    for (const [px2,py2] of plateCenters) {
      ctx.beginPath();
      for (let i=0;i<6;i++){const a=(i/6)*Math.PI*2-Math.PI/6;ctx.lineTo(px2+Math.cos(a)*r*0.14,py2+Math.sin(a)*r*0.14);}
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // Lateral scute rows (side ridges)
    ctx.fillStyle = '#a8b858'; ctx.strokeStyle = '#334410'; ctx.lineWidth = 0.8;
    for (let ri = -3; ri <= 3; ri++) {
      ctx.beginPath(); ctx.arc(r*0.78, ri*r*0.22, r*0.08, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-r*0.78, ri*r*0.22, r*0.08, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    }

    // Four short stumpy legs at corners
    ctx.fillStyle = '#6a8830';
    for (const [lx,ly] of [[-r*0.52,-r*0.42],[r*0.52,-r*0.42],[-r*0.52,r*0.42],[r*0.52,r*0.42]]) {
      ctx.beginPath(); ctx.ellipse(lx, ly, r*0.14, r*0.20, 0.3*(lx<0?-1:1), 0, Math.PI*2); ctx.fill();
    }
    // Claw tips
    ctx.fillStyle = '#c8d080';
    for (const [lx,ly] of [[-r*0.52,-r*0.42],[r*0.52,-r*0.42],[-r*0.52,r*0.42],[r*0.52,r*0.42]]) {
      for (let ci=-1;ci<=1;ci++){ctx.beginPath();ctx.arc(lx+ci*r*0.05,ly+(ly<0?-1:1)*r*0.18,r*0.04,0,Math.PI*2);ctx.fill();}
    }

    // Tiny head barely visible, low to ground
    ctx.fillStyle = '#9aaa55';
    ctx.beginPath(); ctx.ellipse(0, -r*0.75, r*0.24, r*0.18, 0, 0, Math.PI*2); ctx.fill();
    // Beak-like mouth
    ctx.fillStyle = '#7a8a38';
    ctx.beginPath(); ctx.moveTo(-r*0.10,-r*0.88); ctx.lineTo(r*0.10,-r*0.88); ctx.lineTo(0,-r*0.96); ctx.closePath(); ctx.fill();
    // Small eyes (wide-set)
    ctx.fillStyle = '#FFAA00'; ctx.shadowColor = '#FFAA00'; ctx.shadowBlur = 4;
    ctx.beginPath(); ctx.arc(-r*0.12,-r*0.76, r*0.065, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.12,-r*0.76, r*0.065, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-r*0.12,-r*0.76, r*0.03, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.12,-r*0.76, r*0.03, 0, Math.PI*2); ctx.fill();

    ctx.restore();
  }

  // ── SPINOSAURUS: giant water/land predator (juggernaut) ────────────────────
  _renderSpinosaurus(ctx, x, y, r) {
    const t = this._animT;
    const undulate = Math.sin(t * 3.5) * 0.10;
    ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+3, y+r*0.42, r*1.35, r*0.28, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2 + undulate);

    // Massive body
    const bg = ctx.createRadialGradient(0, r*0.12, 3, 0, 0, r*1.1);
    bg.addColorStop(0, '#55CCEE'); bg.addColorStop(0.45, '#2288AA'); bg.addColorStop(1, '#0a3a55');
    ctx.fillStyle = bg; ctx.shadowColor = '#44AACC'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.ellipse(0, r*0.08, r*0.72, r*1.0, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Sail fin (dorsal) — iconic
    ctx.fillStyle = '#FF8844'; ctx.strokeStyle = '#CC4422'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r*0.10, -r*0.55);
    ctx.lineTo(-r*0.40, -r*1.10);
    ctx.lineTo(-r*0.20, -r*1.30);
    ctx.lineTo( r*0.20, -r*1.30);
    ctx.lineTo( r*0.40, -r*1.10);
    ctx.lineTo( r*0.10, -r*0.55);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Sail highlights
    ctx.strokeStyle = 'rgba(255,180,100,0.40)'; ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(i*r*0.08, -r*0.62); ctx.lineTo(i*r*0.10, -r*1.20); ctx.stroke();
    }

    // Head
    ctx.fillStyle = '#44AACC';
    ctx.beginPath(); ctx.ellipse(0, -r*0.80, r*0.32, r*0.28, 0, 0, Math.PI*2); ctx.fill();
    // Long crocodilian snout
    ctx.fillStyle = '#3388AA';
    ctx.beginPath(); ctx.moveTo(-r*0.14, -r*0.96); ctx.lineTo(r*0.14, -r*0.96); ctx.lineTo(r*0.10, -r*1.16); ctx.lineTo(-r*0.10, -r*1.16); ctx.closePath(); ctx.fill();

    // Eyes — yellow
    ctx.fillStyle = '#FFCC00'; ctx.beginPath(); ctx.arc(-r*0.14, -r*0.82, r*0.08, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#330000'; ctx.beginPath(); ctx.arc(-r*0.14, -r*0.82, r*0.04, 0, Math.PI*2); ctx.fill();

    // Powerful legs
    ctx.fillStyle = '#1a6888';
    ctx.beginPath(); ctx.ellipse(-r*0.36, r*0.50, r*0.16, r*0.28, 0.3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( r*0.36, r*0.50, r*0.16, r*0.28,-0.3, 0, Math.PI*2); ctx.fill();

    // Tail
    ctx.strokeStyle = '#2288AA'; ctx.lineWidth = r*0.22;
    ctx.beginPath(); ctx.moveTo(0, r*0.88); ctx.quadraticCurveTo(r*0.50, r*1.08, r*0.38, r*1.26); ctx.stroke();
    ctx.restore();
  }

  // ── PTEROSAUR: flying bomber dino ─────────────────────────────────────────
  _renderPterosaur(ctx, x, y, r) {
    const t = this._animT;
    const flap = Math.sin(t * 8) * 0.22;
    ctx.save(); ctx.globalAlpha = 0.15; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x, y+r*0.25, r*1.4, r*0.18, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2);

    // Left wing
    ctx.fillStyle = '#AA6622';
    ctx.save(); ctx.rotate(-flap);
    ctx.beginPath(); ctx.moveTo(-r*0.10, 0); ctx.lineTo(-r*1.10, -r*0.28); ctx.lineTo(-r*0.90, r*0.18); ctx.closePath(); ctx.fill();
    ctx.restore();

    // Right wing
    ctx.save(); ctx.rotate(flap);
    ctx.beginPath(); ctx.moveTo(r*0.10, 0); ctx.lineTo(r*1.10, -r*0.28); ctx.lineTo(r*0.90, r*0.18); ctx.closePath(); ctx.fill();
    ctx.restore();

    // Body
    const bg = ctx.createRadialGradient(0, 0, 1, 0, 0, r*0.44);
    bg.addColorStop(0, '#CC8844'); bg.addColorStop(1, '#6a3a18');
    ctx.fillStyle = bg; ctx.shadowColor = '#FF8844'; ctx.shadowBlur = 7;
    ctx.beginPath(); ctx.ellipse(0, 0, r*0.28, r*0.50, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Head + crest
    ctx.fillStyle = '#BB6622';
    ctx.beginPath(); ctx.ellipse(0, -r*0.45, r*0.20, r*0.18, 0, 0, Math.PI*2); ctx.fill();
    // Head crest
    ctx.fillStyle = '#FF7722';
    ctx.beginPath(); ctx.moveTo(-r*0.08, -r*0.52); ctx.lineTo(r*0.08, -r*0.52); ctx.lineTo(r*0.14, -r*0.80); ctx.lineTo(-r*0.14, -r*0.80); ctx.closePath(); ctx.fill();

    // Beak
    ctx.fillStyle = '#FFDD88';
    ctx.beginPath(); ctx.moveTo(-r*0.06, -r*0.56); ctx.lineTo(r*0.06, -r*0.56); ctx.lineTo(0, -r*0.72); ctx.closePath(); ctx.fill();

    // Eye
    ctx.fillStyle = '#FF0000'; ctx.beginPath(); ctx.arc(0, -r*0.46, r*0.06, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000';    ctx.beginPath(); ctx.arc(0, -r*0.46, r*0.03, 0, Math.PI*2); ctx.fill();

    ctx.restore();
  }

  // ── PLESIOSAUR: long-neck sniper water dino ─────────────────────────────────
  _renderPlesiosaur(ctx, x, y, r) {
    const t = this._animT;
    const neckSway = Math.sin(t * 2.5) * 0.18;
    ctx.save(); ctx.globalAlpha = 0.20; ctx.fillStyle = '#0044AA';
    ctx.beginPath(); ctx.ellipse(x, y, r*1.1, r*0.55, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2);

    // Water ripples
    ctx.strokeStyle = 'rgba(80,180,255,0.30)'; ctx.lineWidth = 1.5;
    for (let ri = 1; ri <= 3; ri++) {
      ctx.beginPath(); ctx.ellipse(0, 0, r*(0.5+ri*0.28), r*(0.25+ri*0.14), 0, 0, Math.PI*2); ctx.stroke();
    }

    // Body — wide oval paddle
    const bg = ctx.createRadialGradient(0, 0, 2, 0, 0, r*0.8);
    bg.addColorStop(0, '#44AACC'); bg.addColorStop(0.55, '#1a6688'); bg.addColorStop(1, '#0a2a44');
    ctx.fillStyle = bg; ctx.shadowColor = '#66CCFF'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.ellipse(0, 0, r*0.75, r*0.60, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Flippers
    ctx.fillStyle = '#1a5577';
    ctx.beginPath(); ctx.ellipse(-r*0.68, -r*0.18, r*0.32, r*0.14, 0.6, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( r*0.68, -r*0.18, r*0.32, r*0.14,-0.6, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-r*0.68,  r*0.18, r*0.28, r*0.12, 0.4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( r*0.68,  r*0.18, r*0.28, r*0.12,-0.4, 0, Math.PI*2); ctx.fill();

    // Long neck
    ctx.save(); ctx.rotate(neckSway);
    ctx.strokeStyle = '#2288AA'; ctx.lineWidth = r*0.24;
    ctx.beginPath(); ctx.moveTo(0, -r*0.48); ctx.quadraticCurveTo(r*0.18, -r*0.90, 0, -r*1.10); ctx.stroke();
    // Small head
    ctx.fillStyle = '#33AACC';
    ctx.beginPath(); ctx.ellipse(0, -r*1.22, r*0.20, r*0.16, 0, 0, Math.PI*2); ctx.fill();
    // Eye
    ctx.fillStyle = '#FFCC00'; ctx.beginPath(); ctx.arc(r*0.08, -r*1.24, r*0.06, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000';    ctx.beginPath(); ctx.arc(r*0.08, -r*1.24, r*0.03, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  // ── CERATOPSIAN: horned armored bruiser (police/swat dino) ────────────────
  _renderCeratopsian(ctx, x, y, r) {
    const t = this._animT;
    const stomp = Math.abs(Math.sin(t * 5)) * 0.08;
    // Shadow
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x+1, y+r*0.34, r*1.08, r*0.24, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2);

    // Tail
    ctx.strokeStyle = '#8a6010'; ctx.lineWidth = r*0.18; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, r*0.72); ctx.quadraticCurveTo(r*0.28, r*0.90, r*0.20, r*1.06); ctx.stroke();
    ctx.lineCap = 'butt';

    // Stocky body
    const bg = ctx.createLinearGradient(0, -r*0.5, 0, r*0.72);
    bg.addColorStop(0, '#ddb840'); bg.addColorStop(0.4, '#aa8820'); bg.addColorStop(0.8, '#7a6015'); bg.addColorStop(1, '#4a3c0a');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(0, r*0.10, r*0.60, r*0.80, 0, 0, Math.PI*2); ctx.fill();

    // Scale texture across body
    ctx.strokeStyle = 'rgba(60,40,5,0.35)'; ctx.lineWidth = r*0.07;
    for (let si = -3; si <= 3; si++) {
      ctx.beginPath(); ctx.arc(0, si*r*0.20+r*0.1, r*0.42, Math.PI*0.1, Math.PI*0.9); ctx.stroke();
    }

    // Four thick legs
    ctx.fillStyle = '#8a6a18';
    for (const [lx,ly,rot] of [[-r*0.36,r*0.50+stomp*r,0.3],[r*0.36,r*0.50-stomp*r,-0.3],[-r*0.34,-r*0.14,0.2],[r*0.34,-r*0.14,-0.2]]) {
      ctx.beginPath(); ctx.ellipse(lx, ly, r*0.14, r*0.24, rot, 0, Math.PI*2); ctx.fill();
    }
    // Hoof/claw tips
    ctx.fillStyle = '#554010';
    ctx.beginPath(); ctx.arc(-r*0.36, r*0.70+stomp*r, r*0.09, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.36, r*0.70-stomp*r, r*0.09, 0, Math.PI*2); ctx.fill();

    // Bony neck frill — large dramatic semicircle
    const frillGrad = ctx.createRadialGradient(0,-r*0.46,r*0.1,0,-r*0.46,r*0.54);
    frillGrad.addColorStop(0,'#ff6622');frillGrad.addColorStop(0.6,'#dd4411');frillGrad.addColorStop(1,'#991100');
    ctx.fillStyle = frillGrad; ctx.strokeStyle = '#cc3300'; ctx.lineWidth = r*0.05;
    ctx.beginPath();
    ctx.moveTo(-r*0.48, -r*0.46);
    ctx.arc(0, -r*0.46, r*0.48, Math.PI, 0, false);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Frill vein pattern
    ctx.strokeStyle = 'rgba(255,150,80,0.5)'; ctx.lineWidth = r*0.04;
    for (let vi = -3; vi <= 3; vi++) {
      const va = (vi/3)*0.5*Math.PI;
      ctx.beginPath(); ctx.moveTo(0,-r*0.46); ctx.lineTo(Math.sin(va)*r*0.46,-r*0.46-Math.cos(va)*r*0.46); ctx.stroke();
    }
    // Frill spots — ocellus pattern
    ctx.fillStyle = 'rgba(255,220,60,0.65)';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.arc(i*r*0.18, -r*0.62, r*0.075, 0, Math.PI*2); ctx.fill();
    }

    // Thick head
    const hg = ctx.createRadialGradient(0,-r*0.60,r*0.05,0,-r*0.58,r*0.34);
    hg.addColorStop(0,'#ddb840');hg.addColorStop(1,'#8a6a18');
    ctx.fillStyle=hg;
    ctx.beginPath(); ctx.ellipse(0,-r*0.60,r*0.32,r*0.26,0,0,Math.PI*2); ctx.fill();

    // Three prominent horns
    ctx.fillStyle='#eeeebb'; ctx.strokeStyle='#aa9910'; ctx.lineWidth=r*0.05;
    // Center nose horn (longest)
    ctx.beginPath(); ctx.moveTo(-r*0.07,-r*0.78); ctx.lineTo(r*0.07,-r*0.78); ctx.lineTo(0,-r*1.02); ctx.closePath(); ctx.fill(); ctx.stroke();
    // Left brow horn
    ctx.beginPath(); ctx.moveTo(-r*0.24,-r*0.64); ctx.lineTo(-r*0.14,-r*0.64); ctx.lineTo(-r*0.19,-r*0.86); ctx.closePath(); ctx.fill(); ctx.stroke();
    // Right brow horn
    ctx.beginPath(); ctx.moveTo(r*0.14,-r*0.64); ctx.lineTo(r*0.24,-r*0.64); ctx.lineTo(r*0.19,-r*0.86); ctx.closePath(); ctx.fill(); ctx.stroke();

    // Beak
    ctx.fillStyle='#c8a820';
    ctx.beginPath(); ctx.moveTo(-r*0.10,-r*0.78); ctx.lineTo(r*0.10,-r*0.78); ctx.lineTo(0,-r*0.88); ctx.closePath(); ctx.fill();

    // Eyes — red aggressive
    ctx.fillStyle='#cc0000'; ctx.shadowColor='#ff2200'; ctx.shadowBlur=5;
    ctx.beginPath(); ctx.arc(-r*0.15,-r*0.62,r*0.08,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0; ctx.fillStyle='#000';
    ctx.beginPath(); ctx.arc(-r*0.15,-r*0.62,r*0.04,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(-r*0.165,-r*0.632,r*0.022,0,Math.PI*2); ctx.fill();

    ctx.restore();
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
  ocean_depths: {
    name: 'THE KRAKEN',     color: '#00AACC', accent: '#00EEFF',
    radius: 48, speed: 55,  hp: 1400, dmg: 35, fr: 1100, bspd: 280,
    special: 'slam',    // tidal wave slam + water burst
  },
  robot_city: {
    name: 'SENTINEL',       color: '#0a1828', accent: '#00DDFF',
    radius: 54, speed: 58,  hp: 1800, dmg: 32, fr: 900, bspd: 340,
    special: 'burst',   // fires ring of laser bolts
  },
  galactica: {
    name: 'GALACTIC OVERLORD', color: '#7722CC', accent: '#FF88FF',
    radius: 54, speed: 58,  hp: 2200, dmg: 36, fr: 860, bspd: 370,
    special: 'burst',   // fires ring of plasma bolts
  },
  tower: {
    name: 'THE GOLDEN EMPEROR', color: '#FFD700', accent: '#FFF0AA',
    radius: 52, speed: 68,  hp: 2200, dmg: 38, fr: 720, bspd: 380,
    special: 'burst',   // fires devastating gold bullet ring
  },
  sky_realm: {
    name: 'THE STORM EMPEROR', color: '#1c3c58', accent: '#FFD700',
    radius: 50, speed: 80,  hp: 1600, dmg: 26, fr: 840, bspd: 355,
    special: 'burst',   // fires ring of lightning bolts
  },
  dino_world: {
    name: 'REX KING',        color: '#88FF44', accent: '#CCFF88',
    radius: 56, speed: 62,   hp: 2000, dmg: 40, fr: 1000, bspd: 310,
    special: 'charge',   // thundering charge attack
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

    // 3D ground shadow
    const H3D_boss = Math.round(r * 0.36);
    ctx.save(); ctx.globalAlpha = 0.36; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x + 8, y + r + H3D_boss + 5, r * 1.1, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Boss cylinder body (side walls)
    ctx.save();
    const bcg = ctx.createLinearGradient(x - r, y, x + r, y + H3D_boss);
    bcg.addColorStop(0, this.color + 'BB');
    bcg.addColorStop(1, this.color + '1A');
    ctx.fillStyle = bcg; ctx.shadowColor = this.color; ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(x - r, y); ctx.lineTo(x - r * 0.82, y + H3D_boss);
    ctx.lineTo(x + r * 0.82, y + H3D_boss); ctx.lineTo(x + r, y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = this.color + '44';
    ctx.beginPath(); ctx.ellipse(x, y + H3D_boss, r * 0.88, r * 0.27, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Per-boss body
    switch (this.mapId) {
      case 'downtown':     this._renderKingpin(ctx, x, y, r, pulse); break;
      case 'industrial':   this._renderColossus(ctx, x, y, r, pulse); break;
      case 'suburbs':      this._renderSwarmQueen(ctx, x, y, r, pulse); break;
      case 'ruins':        this._renderWarlord(ctx, x, y, r, pulse); break;
      case 'docks':        this._renderHarbormaster(ctx, x, y, r, pulse); break;
      case 'casino':       this._renderDealer(ctx, x, y, r, pulse); break;
      case 'ocean_depths': this._renderKraken(ctx, x, y, r, pulse); break;
      case 'robot_city':   this._renderSentinel(ctx, x, y, r, pulse); break;
      case 'jungle':        this._renderJungleLord(ctx, x, y, r, pulse); break;
      case 'desert_sands':  this._renderPharaoh(ctx, x, y, r, pulse); break;
      case 'galactica':     this._renderGalacticOverlord(ctx, x, y, r, pulse); break;
      case 'tower':         this._renderPenthouseLord(ctx, x, y, r, pulse); break;
      case 'sky_realm':     this._renderStormEmperor(ctx, x, y, r, pulse);  break;
      case 'dino_world':    this._renderRexKing(ctx, x, y, r, pulse); break;
      default:              this._renderKingpin(ctx, x, y, r, pulse); break;
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

  _renderKraken(ctx, x, y, r, pulse) {
    // Massive tentacled sea monster - THE KRAKEN

    // Water ripple aura
    ctx.save();
    ctx.strokeStyle = 'rgba(0,200,255,0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const rippleR = r + 15 + i * 12 + pulse * 8;
      ctx.globalAlpha = 0.3 - i * 0.08;
      ctx.beginPath();
      ctx.arc(x, y, rippleR, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Main body - bulbous head
    ctx.save();
    ctx.shadowColor = '#00CCFF';
    ctx.shadowBlur = 25 + pulse * 18;
    const bodyGrad = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 2, x, y, r);
    bodyGrad.addColorStop(0, '#00EEFF');
    bodyGrad.addColorStop(0.4, '#00AACC');
    bodyGrad.addColorStop(0.7, '#006688');
    bodyGrad.addColorStop(1, '#003344');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Tentacles (8 writhing appendages)
    ctx.save();
    const tentacleCount = 8;
    for (let i = 0; i < tentacleCount; i++) {
      const baseAngle = (i / tentacleCount) * Math.PI * 2 + this._pulseT * 0.3;
      const waveOffset = Math.sin(this._pulseT * 2 + i * 0.8) * 0.3;

      ctx.strokeStyle = i % 2 === 0 ? '#00AACC' : '#006688';
      ctx.lineWidth = 6 - i * 0.3;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#00CCFF';
      ctx.shadowBlur = 8;

      const startX = x + Math.cos(baseAngle) * r * 0.7;
      const startY = y + Math.sin(baseAngle) * r * 0.7;
      const midX = x + Math.cos(baseAngle + waveOffset) * r * 1.3;
      const midY = y + Math.sin(baseAngle + waveOffset) * r * 1.3;
      const endX = x + Math.cos(baseAngle + waveOffset * 1.5) * r * 1.7;
      const endY = y + Math.sin(baseAngle + waveOffset * 1.5) * r * 1.7;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();

      // Suction cups on tentacles
      ctx.fillStyle = '#004466';
      ctx.shadowBlur = 0;
      for (let s = 0; s < 3; s++) {
        const t = 0.3 + s * 0.25;
        const sx = startX + (endX - startX) * t + Math.sin(this._pulseT + s) * 3;
        const sy = startY + (endY - startY) * t + Math.cos(this._pulseT + s) * 3;
        ctx.beginPath();
        ctx.arc(sx, sy, 3 - s * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Mantle/hood texture
    ctx.save();
    ctx.strokeStyle = 'rgba(0,180,220,0.4)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const arcR = r * (0.3 + i * 0.15);
      ctx.beginPath();
      ctx.arc(x, y, arcR, Math.PI * 0.8, Math.PI * 2.2);
      ctx.stroke();
    }
    ctx.restore();

    // Multiple glowing eyes (6 eyes arranged around head)
    const eyePositions = [
      { angle: this._angle - 0.4, dist: 0.45 },
      { angle: this._angle + 0.4, dist: 0.45 },
      { angle: this._angle - 0.15, dist: 0.55 },
      { angle: this._angle + 0.15, dist: 0.55 },
      { angle: this._angle - 0.6, dist: 0.35 },
      { angle: this._angle + 0.6, dist: 0.35 },
    ];

    for (const eye of eyePositions) {
      const ex = x + Math.cos(eye.angle) * r * eye.dist;
      const ey = y + Math.sin(eye.angle) * r * eye.dist;

      // Eye glow
      ctx.save();
      ctx.fillStyle = '#00FFFF';
      ctx.shadowColor = '#00FFFF';
      ctx.shadowBlur = 15 + pulse * 8;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 6, 5, eye.angle, 0, Math.PI * 2);
      ctx.fill();

      // Pupil
      ctx.fillStyle = '#000033';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.ellipse(ex + Math.cos(this._angle) * 2, ey + Math.sin(this._angle) * 2, 2.5, 3, eye.angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Beak/mouth
    ctx.save();
    const beakX = x + Math.cos(this._angle) * r * 0.4;
    const beakY = y + Math.sin(this._angle) * r * 0.4;
    ctx.fillStyle = '#FF6600';
    ctx.shadowColor = '#FF4400';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(beakX + Math.cos(this._angle) * 12, beakY + Math.sin(this._angle) * 12);
    ctx.lineTo(beakX + Math.cos(this._angle - 0.6) * 6, beakY + Math.sin(this._angle - 0.6) * 6);
    ctx.lineTo(beakX + Math.cos(this._angle + 0.6) * 6, beakY + Math.sin(this._angle + 0.6) * 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Bubbles around the kraken
    ctx.save();
    ctx.fillStyle = 'rgba(150,230,255,0.4)';
    for (let i = 0; i < 6; i++) {
      const bubbleAngle = this._pulseT * 0.5 + i * 1.1;
      const bubbleR = r * 1.2 + Math.sin(bubbleAngle * 2) * 15;
      const bx = x + Math.cos(bubbleAngle) * bubbleR;
      const by = y + Math.sin(bubbleAngle) * bubbleR;
      const bSize = 3 + Math.sin(this._pulseT + i) * 2;
      ctx.beginPath();
      ctx.arc(bx, by, bSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Enrage: extra tentacle glow
    if (this._enraged) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,100,100,0.5)';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#FF4444';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(x, y, r + 8 + pulse * 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  _renderSentinel(ctx, x, y, r, pulse) {
    // THE SENTINEL — Giant Mech Boss
    const breathe = Math.sin(this._pulseT * 1.5) * 0.06;
    const step = Math.sin(this._pulseT * 1.2) * 0.08;
    ctx.save(); ctx.translate(x, y);
    ctx.scale(1 + breathe * 0.5, 1 + breathe * 0.3);

    // Massive legs
    ctx.fillStyle = '#101010';
    ctx.beginPath(); ctx.roundRect(-r*0.56, r*0.48, r*0.46, r*0.72, r*0.05); ctx.fill();
    ctx.beginPath(); ctx.roundRect(r*0.1, r*0.48 + step*12, r*0.46, r*0.72, r*0.05); ctx.fill();
    // Leg joints
    ctx.fillStyle = '#00AACC';
    ctx.beginPath(); ctx.arc(-r*0.33, r*0.52, r*0.1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(r*0.33, r*0.52 + step*8, r*0.1, 0, Math.PI*2); ctx.fill();

    // Main torso — massive
    ctx.fillStyle = '#0a1828';
    ctx.beginPath(); ctx.roundRect(-r*1.0, -r*0.7, r*2.0, r*1.18, r*0.1); ctx.fill();
    ctx.fillStyle = 'rgba(0,180,255,0.08)';
    ctx.beginPath(); ctx.roundRect(-r*0.9, -r*0.62, r*1.8, r*1.0, r*0.08); ctx.fill();

    // Reactor core — pulsing
    const corePulse = Math.sin(this._pulseT * 3) * 0.25 + 0.75;
    ctx.fillStyle = `rgba(0,200,255,${corePulse * 0.4})`;
    ctx.beginPath(); ctx.arc(0, r*0.08, r*0.48, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = `rgba(0,240,255,${corePulse})`;
    ctx.beginPath(); ctx.arc(0, r*0.08, r*0.22, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, r*0.08, r*0.08, 0, Math.PI*2); ctx.fill();

    // Shoulder weapon pods
    ctx.fillStyle = '#060e1c';
    ctx.beginPath(); ctx.roundRect(-r*1.42, -r*0.65, r*0.44, r*0.54, r*0.05); ctx.fill();
    ctx.beginPath(); ctx.roundRect(r*0.98, -r*0.65, r*0.44, r*0.54, r*0.05); ctx.fill();
    // Weapon pod accent
    ctx.fillStyle = 'rgba(0,180,255,0.3)';
    ctx.fillRect(-r*1.38, -r*0.58, r*0.36, r*0.08);
    ctx.fillRect(r*1.02, -r*0.58, r*0.36, r*0.08);
    // Gun barrels × 3 per side
    ctx.fillStyle = '#040a14';
    for (let b = 0; b < 3; b++) {
      ctx.fillRect(-r*1.55, -r*0.58 + b * r*0.13, r*0.55, r*0.08);
      ctx.fillRect(r*1.0, -r*0.58 + b * r*0.13, r*0.55, r*0.08);
    }
    // Muzzle flash
    if (pulse > 0.6) {
      ctx.fillStyle = `rgba(0,240,255,${(pulse - 0.6) * 2.5})`;
      ctx.beginPath(); ctx.arc(-r*1.6, -r*0.52, r*0.22, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(r*1.6, -r*0.52, r*0.22, 0, Math.PI*2); ctx.fill();
    }

    // Arms
    ctx.fillStyle = '#0c1a2c';
    ctx.beginPath(); ctx.roundRect(-r*1.38, -r*0.12, r*0.4, r*0.68, r*0.06); ctx.fill();
    ctx.beginPath(); ctx.roundRect(r*0.98, -r*0.12 + step*6, r*0.4, r*0.68, r*0.06); ctx.fill();

    // Head — square helmet with scan visor
    ctx.fillStyle = '#080e1c';
    ctx.beginPath(); ctx.roundRect(-r*0.5, -r*1.3, r*1.0, r*0.62, r*0.08); ctx.fill();
    // Scan visor — glowing cyan bar
    const visFlicker = Math.sin(this._pulseT * 8) > 0.4 ? 1 : 0.6;
    ctx.fillStyle = `rgba(0,220,255,${0.7 * visFlicker})`;
    ctx.fillRect(-r*0.44, -r*1.2, r*0.88, r*0.22);
    // Antenna
    ctx.fillStyle = '#060e1a';
    ctx.fillRect(-r*0.06, -r*1.52, r*0.12, r*0.24);
    ctx.fillStyle = 'rgba(0,255,200,0.9)';
    ctx.beginPath(); ctx.arc(0, -r*1.56, r*0.07, 0, Math.PI*2); ctx.fill();

    // Boss name plate
    ctx.font = `bold ${Math.round(r*0.28)}px monospace`;
    ctx.fillStyle = '#00DDFF'; ctx.textAlign = 'center';
    ctx.fillText('SENTINEL', 0, -r*1.75);
    ctx.restore();
  }

  // ── JUNGLE LORD — colossal ancient gorilla-lion hybrid boss ────────────────
  _renderJungleLord(ctx, x, y, r, pulse) {
    const breathe = Math.sin(this._pulseT * 1.2) * 0.04;
    const roar    = this._enraged ? Math.sin(this._pulseT * 8) * 0.05 : 0;
    ctx.save(); ctx.translate(x, y);
    ctx.scale(1 + breathe, 1 + breathe * 0.5);

    // 3D shadow
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(6, r + 12, r*1.3, r*0.32, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Massive legs — tree-trunk thick
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#3a2010';
      ctx.beginPath(); ctx.roundRect(s*(r*0.26), r*0.52, s > 0 ? r*0.52 : -r*0.52, r*0.80, r*0.14); ctx.fill();
      // Clawed feet
      ctx.fillStyle = '#2a1808';
      ctx.beginPath(); ctx.ellipse(s*(r*0.52), r*1.22, r*0.30, r*0.18, 0, 0, Math.PI*2); ctx.fill();
      for (let ci = -1; ci <= 1; ci++) {
        ctx.fillStyle = '#1a1208';
        ctx.beginPath(); ctx.moveTo(s*(r*0.52 + ci*r*0.14), r*1.28);
        ctx.lineTo(s*(r*0.52 + ci*r*0.14) + s*ci*r*0.06, r*1.48);
        ctx.lineTo(s*(r*0.52 + ci*r*0.14) + s*r*0.06, r*1.30); ctx.closePath(); ctx.fill();
      }
    }

    // Body — barrel-chested, golden mane base
    const bG = ctx.createLinearGradient(-r, -r*0.4, r, r*0.5);
    bG.addColorStop(0, '#5a3018'); bG.addColorStop(0.5, '#3a2010'); bG.addColorStop(1, '#281808');
    ctx.fillStyle = bG;
    ctx.beginPath(); ctx.roundRect(-r*0.92, -r*0.60, r*1.84, r*1.20, r*0.22); ctx.fill();

    // Mane — layered golden fur
    const maneColors = ['#CC8800', '#FFAA00', '#FFD700', '#FF8800'];
    for (let mi = 0; mi < 4; mi++) {
      ctx.fillStyle = maneColors[mi];
      ctx.globalAlpha = 0.75 - mi * 0.12;
      const mr2 = r * (1.12 - mi * 0.12);
      ctx.beginPath(); ctx.arc(0, -r*0.45, mr2, Math.PI*0.55, Math.PI*2.45); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Silver-back patch
    ctx.fillStyle = '#7a7060'; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.ellipse(0, -r*0.05, r*0.56, r*0.50, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

    // Arms — long, powerful, dragging
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#3a2010';
      // Upper arm
      ctx.save(); ctx.translate(s*r*0.84, -r*0.28);
      ctx.rotate(s * (0.55 + Math.sin(this._pulseT * 1.4) * 0.08));
      ctx.beginPath(); ctx.roundRect(-r*0.22, 0, r*0.44, r*0.92, r*0.18); ctx.fill();
      // Forearm
      ctx.translate(0, r*0.88); ctx.rotate(s * 0.30);
      ctx.fillStyle = '#2a1808';
      ctx.beginPath(); ctx.roundRect(-r*0.20, 0, r*0.40, r*0.80, r*0.16); ctx.fill();
      // Clawed hand
      ctx.fillStyle = '#1a1008';
      ctx.beginPath(); ctx.ellipse(0, r*0.86, r*0.28, r*0.24, 0, 0, Math.PI*2); ctx.fill();
      for (let ci = -1; ci <= 1; ci++) {
        ctx.fillStyle = '#0a0808';
        ctx.beginPath(); ctx.moveTo(ci*r*0.14, r*0.98); ctx.lineTo(ci*r*0.14 + s*ci*r*0.06, r*1.22);
        ctx.lineTo(ci*r*0.14 + s*r*0.08, r*1.00); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    // Head — lion-gorilla hybrid
    ctx.save(); ctx.translate(0, -r*0.90 + roar*r);
    // Skull
    ctx.fillStyle = '#4a2c10'; ctx.beginPath(); ctx.arc(0, 0, r*0.70, 0, Math.PI*2); ctx.fill();
    // Brow ridge — heavy overhang
    ctx.fillStyle = '#2a1808'; ctx.beginPath(); ctx.ellipse(0, -r*0.28, r*0.65, r*0.22, 0, Math.PI, Math.PI*2); ctx.fill();
    // Muzzle — wide primate snout
    ctx.fillStyle = '#5a3820'; ctx.beginPath(); ctx.ellipse(0, r*0.16, r*0.42, r*0.32, 0, 0, Math.PI*2); ctx.fill();
    // Lips / teeth
    if (this._enraged) {
      ctx.fillStyle = '#EEEECC'; ctx.beginPath();
      for (let ti = -2; ti <= 2; ti++) { ctx.rect(ti*r*0.12 - r*0.06, r*0.24, r*0.10, r*0.14); }
      ctx.fill();
    }
    // Nostrils
    ctx.fillStyle = '#1a0a00';
    ctx.beginPath(); ctx.arc(-r*0.14, r*0.08, r*0.08, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.14, r*0.08, r*0.08, 0, Math.PI*2); ctx.fill();
    // Eyes — burning amber
    const eyeColor = this._enraged ? '#FF2200' : '#FF8800';
    ctx.fillStyle = eyeColor; ctx.beginPath(); ctx.arc(-r*0.28, -r*0.14, r*0.14, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.28, -r*0.14, r*0.14, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFFF00'; ctx.beginPath(); ctx.arc(-r*0.28, -r*0.14, r*0.07, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.28, -r*0.14, r*0.07, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-r*0.28, -r*0.14, r*0.04, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( r*0.28, -r*0.14, r*0.04, 0, Math.PI*2); ctx.fill();
    // Scar across right eye
    ctx.strokeStyle = '#8B4513'; ctx.lineWidth = r*0.06;
    ctx.beginPath(); ctx.moveTo(-r*0.40, -r*0.28); ctx.lineTo(-r*0.14, r*0.04); ctx.stroke();
    // Bone crown / horns
    ctx.fillStyle = '#EEE8AA';
    ctx.beginPath(); ctx.moveTo(-r*0.48, -r*0.38); ctx.lineTo(-r*0.38, -r*0.78); ctx.lineTo(-r*0.24, -r*0.38); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo( r*0.48, -r*0.38); ctx.lineTo( r*0.38, -r*0.78); ctx.lineTo( r*0.24, -r*0.38); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-r*0.08, -r*0.60); ctx.lineTo(0, -r*0.96); ctx.lineTo( r*0.08, -r*0.60); ctx.closePath(); ctx.fill();
    ctx.restore();

    // Vine/vine wrappings on arms
    ctx.strokeStyle = '#2a5010'; ctx.lineWidth = r*0.06; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.arc(-r*0.84, r*0.42, r*0.32, -Math.PI*0.5, Math.PI*0.8); ctx.stroke();
    ctx.beginPath(); ctx.arc( r*0.84, r*0.42, r*0.32, Math.PI*0.2, Math.PI*1.5); ctx.stroke();
    ctx.globalAlpha = 1;

    // Enraged — fire aura
    if (this._enraged) {
      ctx.globalAlpha = 0.28 + pulse * 0.18;
      ctx.fillStyle = '#FF4400';
      ctx.beginPath(); ctx.arc(0, -r*0.20, r*1.35 + pulse*r*0.18, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Name label
    ctx.save(); ctx.font = 'bold 12px Orbitron, monospace';
    ctx.fillStyle = '#FFD700'; ctx.textAlign = 'center';
    ctx.fillText('JUNGLE LORD', 0, -r*1.70);
    if (this._enraged) {
      ctx.fillStyle = '#FF4400'; ctx.font = 'bold 9px Orbitron, monospace';
      ctx.fillText('⚡ ENRAGED ⚡', 0, -r*1.85);
    }
    ctx.restore();
  }

  // ── PHARAOH GOD — divine ancient ruler of the desert ─────────────────────────
  _renderPharaoh(ctx, x, y, r, pulse) {
    const breathe   = Math.sin(this._pulseT * 1.0) * 0.03;
    const sandSwirl = this._pulseT;

    ctx.save();
    ctx.translate(x, y);

    // Sandstorm aura
    if (this._enraged) {
      ctx.globalAlpha = 0.22 + pulse * 0.14; ctx.fillStyle = '#D4A017';
      ctx.beginPath(); ctx.arc(0, 0, r * 1.65 + pulse * r * 0.22, 0, Math.PI*2); ctx.fill();
    }
    for (let ring = 0; ring < 3; ring++) {
      const ringR = r * (1.15 + ring * 0.28);
      ctx.globalAlpha = (0.10 - ring * 0.025) * (0.6 + pulse * 0.4);
      ctx.strokeStyle = '#D4A017'; ctx.lineWidth = 2.5 - ring * 0.6;
      ctx.setLineDash([8, 12]); ctx.lineDashOffset = -sandSwirl * (22 + ring * 8);
      ctx.beginPath(); ctx.arc(0, 0, ringR, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.globalAlpha = 1;

    // Body (divine robes)
    const bodyScale = 1 + breathe;
    const rG = ctx.createRadialGradient(-r*0.28, -r*0.20, 2, 0, r*0.12, r * 1.05);
    rG.addColorStop(0, '#F5E090'); rG.addColorStop(0.40, '#D4A017'); rG.addColorStop(0.78, '#9a6e0a'); rG.addColorStop(1, '#5a3e06');
    ctx.fillStyle = rG; ctx.shadowColor = '#D4A017'; ctx.shadowBlur = 20 + pulse * 14;
    ctx.beginPath(); ctx.roundRect(-r*0.82*bodyScale, -r*0.62*bodyScale, r*1.64*bodyScale, r*1.30*bodyScale, [r*0.18, r*0.18, r*0.28, r*0.28]); ctx.fill();
    ctx.shadowBlur = 0;

    // Cartouche chest medallion
    ctx.fillStyle = '#4a2a00';
    ctx.beginPath(); ctx.roundRect(-r*0.32, -r*0.28, r*0.64, r*0.56, r*0.08); ctx.fill();
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-r*0.32, -r*0.28, r*0.64, r*0.56, r*0.08); ctx.stroke();
    ctx.fillStyle = '#FFD700';
    ctx.beginPath(); ctx.ellipse(0, 0, r*0.18, r*0.10, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2a1200';
    ctx.beginPath(); ctx.ellipse(0, 0, r*0.09, r*0.07, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-r*0.18, 0); ctx.lineTo(-r*0.28, r*0.06); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r*0.18, 0); ctx.lineTo(r*0.28, r*0.06); ctx.stroke();

    // Usekh collar
    const collG = ctx.createLinearGradient(0, -r*0.60, 0, -r*0.30);
    collG.addColorStop(0, '#FFD700'); collG.addColorStop(0.5, '#E8A800'); collG.addColorStop(1, '#C89000');
    ctx.fillStyle = collG;
    ctx.beginPath(); ctx.arc(0, -r*0.55, r*0.72, Math.PI*0.12, Math.PI*0.88); ctx.closePath(); ctx.fill();
    for (let j = 0; j < 9; j++) {
      const jAng = Math.PI * (0.14 + j * 0.082);
      ctx.fillStyle = ['#FF4444','#4488FF','#44FF88'][j % 3];
      ctx.beginPath(); ctx.arc(Math.cos(jAng)*r*0.70, -r*0.55 + Math.sin(jAng)*r*0.70, r*0.055, 0, Math.PI*2); ctx.fill();
    }

    // Legs
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#c8900e';
      ctx.beginPath(); ctx.roundRect(s*r*0.30, r*0.56, r*0.38, r*0.60, r*0.10); ctx.fill();
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(s*r*0.30, r*1.04); ctx.lineTo(s*r*0.68, r*1.04); ctx.stroke();
    }

    // Heka crook (left)
    ctx.save(); ctx.translate(-r*0.78, -r*0.18); ctx.rotate(-0.38);
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, r*0.52); ctx.lineTo(0, -r*0.68); ctx.stroke();
    ctx.beginPath(); ctx.arc(-r*0.22, -r*0.68, r*0.22, 0, Math.PI * 0.82); ctx.stroke();
    ctx.restore();

    // Nekhakha flail (right)
    ctx.save(); ctx.translate(r*0.78, -r*0.18); ctx.rotate(0.38);
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, r*0.52); ctx.lineTo(0, -r*0.50); ctx.stroke();
    for (let fi = 0; fi < 3; fi++) {
      const fang = -Math.PI*0.42 + fi * 0.30 + Math.sin(sandSwirl * 2.5 + fi) * 0.14;
      ctx.strokeStyle = '#E8A800'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(0, -r*0.50);
      ctx.lineTo(Math.cos(fang)*r*0.30, -r*0.50 + Math.sin(fang + Math.PI*0.5)*r*0.26); ctx.stroke();
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.arc(Math.cos(fang)*r*0.30, -r*0.50 + Math.sin(fang + Math.PI*0.5)*r*0.26, r*0.07, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();

    // Head
    const headY = -r * 0.78;
    const hG = ctx.createRadialGradient(-r*0.12, headY - r*0.10, 1, 0, headY, r * 0.44);
    hG.addColorStop(0, '#F0D070'); hG.addColorStop(0.6, '#c8900e'); hG.addColorStop(1, '#8a5e08');
    ctx.fillStyle = hG; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 14 + pulse * 8;
    ctx.beginPath(); ctx.ellipse(0, headY, r * 0.44, r * 0.42, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Nemes headdress
    ctx.fillStyle = '#1a0e00';
    ctx.beginPath(); ctx.ellipse(-r*0.28, headY + r*0.08, r*0.22, r*0.36, -0.28, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r*0.28, headY + r*0.08, r*0.22, r*0.36, 0.28, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1; ctx.globalAlpha = 0.40;
    for (let ns = 0; ns < 3; ns++) {
      ctx.beginPath(); ctx.moveTo(-r*0.44, headY - r*0.05 + ns*r*0.16); ctx.lineTo(-r*0.10, headY - r*0.05 + ns*r*0.16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r*0.44, headY - r*0.05 + ns*r*0.16); ctx.lineTo(r*0.10, headY - r*0.05 + ns*r*0.16); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Deshret (red lower crown)
    ctx.fillStyle = '#CC2200';
    ctx.beginPath(); ctx.roundRect(-r*0.36, headY - r*0.82, r*0.72, r*0.56, [r*0.06, r*0.06, 0, 0]); ctx.fill();
    // Hedjet (white upper crown — tall cone)
    ctx.fillStyle = '#F5F0E0';
    ctx.beginPath();
    ctx.moveTo(-r*0.24, headY - r*0.82); ctx.lineTo(r*0.24, headY - r*0.82);
    ctx.lineTo(r*0.14, headY - r*2.00);  ctx.lineTo(-r*0.14, headY - r*2.00);
    ctx.closePath(); ctx.fill();
    // Crown tip gold knob
    ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 10 + pulse * 6;
    ctx.beginPath(); ctx.arc(0, headY - r*2.02, r*0.12, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Uraeus (cobra)
    ctx.fillStyle = '#22AA44'; ctx.shadowColor = '#00FF88'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.ellipse(0, headY - r*0.85, r*0.10, r*0.16, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FF2200';
    ctx.beginPath(); ctx.arc(0, headY - r*1.00, r*0.06, 0, Math.PI*2); ctx.fill();

    // Kohl-lined eyes (glowing gold)
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(s*r*0.20, headY - r*0.04, r*0.17, r*0.09, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 14 + pulse * 8;
      ctx.beginPath(); ctx.ellipse(s*r*0.20, headY - r*0.04, r*0.11, r*0.07, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FF8800'; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.ellipse(s*r*0.20, headY - r*0.04, r*0.05, r*0.05, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(s*r*0.30, headY - r*0.04); ctx.lineTo(s*r*0.40, headY + r*0.06); ctx.stroke();
    }

    // Divine false beard
    ctx.fillStyle = '#D4A017'; ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(-r*0.10, headY + r*0.34, r*0.20, r*0.26, [r*0.02, r*0.02, r*0.08, r*0.08]); ctx.fill(); ctx.stroke();

    // Sand particles orbiting (divine aura)
    ctx.fillStyle = 'rgba(212,160,23,0.30)';
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + sandSwirl * 0.8;
      const orR = r * (1.30 + Math.sin(sandSwirl * 1.5 + i * 1.2) * 0.22);
      ctx.beginPath(); ctx.arc(Math.cos(ang)*orR, Math.sin(ang)*orR*0.55, r*0.055, 0, Math.PI*2); ctx.fill();
    }

    ctx.restore();
  }

  _renderGalacticOverlord(ctx, x, y, r, pulse) {
    const sw = this._pulseT;
    ctx.save();
    ctx.translate(x, y);

    // ── 1. OUTER COSMIC AURA — 3 expanding neon halos ──────────────────────
    const haloColors = ['#AA44FF','#FF44AA','#44AAFF'];
    for (let hi = 0; hi < 3; hi++) {
      const hR = r * (1.45 + hi * 0.35 + Math.sin(sw * 0.8 + hi * 1.1) * 0.10);
      ctx.globalAlpha = (0.22 - hi * 0.06) + pulse * 0.10;
      ctx.strokeStyle = haloColors[hi];
      ctx.lineWidth   = 3.5 - hi;
      ctx.shadowColor = haloColors[hi]; ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.arc(0, 0, hR, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;

    // ── 2. GALAXY DISC — flattened ellipse spinning behind body ────────────
    ctx.save();
    ctx.rotate(sw * 0.25);
    // Outer disc glow
    ctx.globalAlpha = 0.35 + pulse * 0.15;
    ctx.fillStyle = '#AA44FF';
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.55, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // Bright disc core ring
    ctx.strokeStyle = '#FFAAFF'; ctx.lineWidth = 3;
    ctx.globalAlpha = 0.55;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.20, r * 0.30, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();

    // ── 3. SPIRAL GALAXY ARMS — 4 arms sweeping outward ───────────────────
    for (let arm = 0; arm < 4; arm++) {
      const armBase = sw * 0.55 + arm * Math.PI / 2;
      const armCol  = ['rgba(200,100,255,0.65)','rgba(255,80,200,0.55)','rgba(80,180,255,0.55)','rgba(100,255,180,0.45)'][arm];
      ctx.strokeStyle = armCol;
      ctx.lineWidth   = 3.5;
      ctx.shadowColor = armCol; ctx.shadowBlur = 12;
      ctx.beginPath();
      for (let s = 0; s <= 50; s++) {
        const t2    = s / 50;
        const spirA = armBase + t2 * Math.PI * 1.8;
        const spirR = r * 0.14 + t2 * r * 1.10;
        if (s === 0) ctx.moveTo(Math.cos(spirA) * spirR, Math.sin(spirA) * spirR * 0.58);
        else         ctx.lineTo(Math.cos(spirA) * spirR, Math.sin(spirA) * spirR * 0.58);
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // ── 4. CORE NEBULA BODY ─────────────────────────────────────────────────
    const bg = ctx.createRadialGradient(-r*0.22, -r*0.22, 4, 0, 0, r);
    bg.addColorStop(0,   '#FFFFFF');
    bg.addColorStop(0.12,'#EE99FF');
    bg.addColorStop(0.38,'#AA33EE');
    bg.addColorStop(0.68,'#5500BB');
    bg.addColorStop(1,   '#1a003a');
    ctx.fillStyle = bg;
    ctx.shadowColor = '#CC66FF'; ctx.shadowBlur = 40 + pulse * 22;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();

    // ── 5. ENERGY CROWN — 9 blazing spikes ─────────────────────────────────
    ctx.shadowColor = '#FF88FF'; ctx.shadowBlur = 18;
    for (let i = 0; i < 9; i++) {
      const sa    = (i / 9) * Math.PI * 2 + sw * 0.22;
      const sLen  = r * (0.40 + (i % 3 === 0 ? 0.32 : 0.18) + Math.sin(sw * 2.5 + i) * 0.10) + pulse * 8;
      const inner = r * 0.92;
      const outer = r + sLen;
      // Spike body
      ctx.lineWidth = 4 - (i % 3) * 0.8;
      ctx.strokeStyle = i % 3 === 0 ? '#FFCCFF' : (i % 3 === 1 ? '#FF44FF' : '#AA44FF');
      ctx.beginPath();
      ctx.moveTo(Math.cos(sa) * inner, Math.sin(sa) * inner);
      ctx.lineTo(Math.cos(sa) * outer, Math.sin(sa) * outer);
      ctx.stroke();
      // Spike tip orb
      ctx.fillStyle = i % 3 === 0 ? '#FFFFFF' : '#FF88FF';
      ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(Math.cos(sa) * outer, Math.sin(sa) * outer, r * 0.07 + (i%3===0 ? r*0.04 : 0), 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;

    // ── 6. ORBITING PLANETS — 6 colored worlds ─────────────────────────────
    const planetCols = ['#FF6633','#AAFFAA','#6699FF','#FFEE44','#FF44CC','#44FFDD'];
    for (let i = 0; i < 6; i++) {
      const a   = sw * 1.35 + i * Math.PI * 2 / 6;
      const orR = r * 1.28 + Math.sin(sw * 0.6 + i) * r * 0.08;
      const px  = Math.cos(a) * orR;
      const py  = Math.sin(a) * orR * 0.50;  // flattened to galaxy plane
      const pr  = r * (0.11 + (i % 2) * 0.05);
      // Planet glow
      ctx.shadowColor = planetCols[i]; ctx.shadowBlur = 12;
      const pg = ctx.createRadialGradient(px - pr*0.3, py - pr*0.3, 1, px, py, pr);
      pg.addColorStop(0, '#FFFFFF'); pg.addColorStop(0.4, planetCols[i]); pg.addColorStop(1, '#000010');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
      // Ring on 2 planets
      if (i === 1 || i === 4) {
        ctx.shadowBlur = 0; ctx.globalAlpha = 0.55;
        ctx.strokeStyle = planetCols[i]; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(px, py, pr * 1.7, pr * 0.45, a * 0.4, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    ctx.shadowBlur = 0;

    // ── 7. VOID EYE — central cosmic stare ─────────────────────────────────
    // Black sclera
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2); ctx.fill();
    // Iris — 3 layered rings
    const irisGrd = ctx.createRadialGradient(0, 0, r * 0.05, 0, 0, r * 0.30);
    irisGrd.addColorStop(0, '#FF00FF');
    irisGrd.addColorStop(0.35, '#AA00CC');
    irisGrd.addColorStop(0.7, '#550088');
    irisGrd.addColorStop(1, '#000000');
    ctx.fillStyle = irisGrd;
    ctx.shadowColor = '#FF00FF'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.30, 0, Math.PI * 2); ctx.fill();
    // Spinning star-shaped pupil
    ctx.shadowBlur = 0;
    ctx.save(); ctx.rotate(sw * 2.2);
    ctx.fillStyle = '#FFFFFF';
    const pts = 6;
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const a  = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
      const pr = i % 2 === 0 ? r * 0.165 : r * 0.07;
      if (i === 0) ctx.moveTo(Math.cos(a)*pr, Math.sin(a)*pr);
      else         ctx.lineTo(Math.cos(a)*pr, Math.sin(a)*pr);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // Pupil highlight
    ctx.fillStyle = 'rgba(255,255,255,0.60)';
    ctx.beginPath(); ctx.arc(-r*0.07, -r*0.07, r*0.06, 0, Math.PI*2); ctx.fill();

    // ── 8. PLASMA RING BELT — 2 tilted rings ───────────────────────────────
    const beltColors = ['#FFFF88','#FF88FF'];
    for (let bi = 0; bi < 2; bi++) {
      ctx.globalAlpha = 0.60 + pulse * 0.25;
      ctx.strokeStyle = beltColors[bi];
      ctx.lineWidth   = 2.5 - bi * 0.5;
      ctx.shadowColor = beltColors[bi]; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * (1.08 + bi * 0.12), r * (0.25 + bi * 0.06), sw * (0.35 + bi * 0.2), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;

    // ── 9. STARDUST PARTICLES — orbiting glitter ───────────────────────────
    for (let i = 0; i < 18; i++) {
      const a   = (i / 18) * Math.PI * 2 + sw * (i % 2 === 0 ? 0.9 : -0.7);
      const orR = r * (0.68 + (i % 3) * 0.22 + Math.sin(sw * 1.2 + i) * 0.08);
      ctx.fillStyle = i % 3 === 0 ? '#FFCCFF' : (i % 3 === 1 ? '#CCFFFF' : '#FFFFCC');
      ctx.globalAlpha = 0.55 + Math.sin(sw * 2 + i) * 0.35;
      ctx.beginPath(); ctx.arc(Math.cos(a) * orR, Math.sin(a) * orR * 0.55, r * 0.038, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // ── Golden Emperor (Tower final boss) — Majestic & Powerful ─────────────────
  _renderPenthouseLord(ctx, x, y, r, pulse) {
    const sw = this._pulseT;
    ctx.save();
    ctx.translate(x, y);

    // 1. Grand outer aura — 5 pulsing halo rings with fire effect
    for (let hi = 0; hi < 5; hi++) {
      const hR = r * (1.25 + hi * 0.25 + Math.sin(sw * 1.2 + hi * 0.8) * 0.12);
      ctx.globalAlpha = (0.25 - hi * 0.04) + pulse * 0.12;
      const hueShift = hi * 15;
      ctx.strokeStyle = hi === 0 ? '#FFD700' : hi === 1 ? '#FFAA00' : hi === 2 ? '#FF8800' : hi === 3 ? '#FFF0AA' : '#FFCC00';
      ctx.lineWidth = 4 - hi * 0.6;
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(0, 0, hR, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // 2. Rotating golden sun disc with rays
    ctx.save();
    ctx.rotate(sw * 0.4);
    ctx.globalAlpha = 0.25 + pulse * 0.12;
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.5, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
    // Inner rotating disc
    ctx.rotate(-sw * 0.8);
    ctx.strokeStyle = '#FFAA00'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.3, r * 0.4, Math.PI/4, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();

    // 3. Radiating sun rays
    ctx.save();
    ctx.globalAlpha = 0.35 + pulse * 0.15;
    for (let ri = 0; ri < 12; ri++) {
      const ra = (ri / 12) * Math.PI * 2 + sw * 0.2;
      const rayLen = r * (0.6 + Math.sin(sw * 2 + ri) * 0.15);
      ctx.strokeStyle = ri % 2 === 0 ? '#FFD700' : '#FFAA00';
      ctx.lineWidth = ri % 3 === 0 ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ra) * r * 1.05, Math.sin(ra) * r * 1.05);
      ctx.lineTo(Math.cos(ra) * (r + rayLen), Math.sin(ra) * (r + rayLen));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // 4. Core body — luxurious black and gold gradient
    const bodyGrd = ctx.createRadialGradient(-r*0.3, -r*0.35, r*0.08, 0, 0, r);
    bodyGrd.addColorStop(0, '#FFFACC'); bodyGrd.addColorStop(0.25, '#FFD700');
    bodyGrd.addColorStop(0.55, '#CC8800'); bodyGrd.addColorStop(0.8, '#442200');
    bodyGrd.addColorStop(1, '#1a0a00');
    ctx.fillStyle = bodyGrd;
    ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // 5. Elegant suit pattern — diamond grid
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1;
    for (let di = -4; di <= 4; di++) {
      ctx.beginPath();
      ctx.moveTo(di * r * 0.25 - r, -r);
      ctx.lineTo(di * r * 0.25 + r, r);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(di * r * 0.25 + r, -r);
      ctx.lineTo(di * r * 0.25 - r, r);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 6. Majestic Crown — 9 golden spikes with jewels
    const crownSpikes = 9;
    for (let ci = 0; ci < crownSpikes; ci++) {
      const ca = (ci / crownSpikes) * Math.PI * 2 - Math.PI / 2;
      const tR = r * (1.22 + Math.sin(sw * 1.8 + ci * 0.7) * 0.08);
      const tx2 = Math.cos(ca) * tR, ty2 = Math.sin(ca) * tR;
      // Golden spike
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3;
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(Math.cos(ca) * r * 0.92, Math.sin(ca) * r * 0.92);
      ctx.lineTo(tx2, ty2); ctx.stroke();
      // Diamond jewel tips — alternating colors
      const jewelColors = ['#FF0066', '#00FFAA', '#FF00FF', '#00AAFF', '#FFFF00', '#FF6600', '#AA00FF', '#00FF66', '#FF4444'];
      ctx.fillStyle = jewelColors[ci];
      ctx.shadowColor = jewelColors[ci]; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(tx2, ty2, r * 0.08, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 7. Menacing eyes — twin golden eyes
    // Left eye
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.ellipse(-r*0.22, -r*0.12, r*0.18, r*0.12, -0.15, 0, Math.PI*2); ctx.fill();
    const eyeGrdL = ctx.createRadialGradient(-r*0.22, -r*0.12, 0, -r*0.22, -r*0.12, r*0.12);
    eyeGrdL.addColorStop(0, '#FF0000'); eyeGrdL.addColorStop(0.5, '#FFD700'); eyeGrdL.addColorStop(1, '#220000');
    ctx.fillStyle = eyeGrdL;
    ctx.beginPath(); ctx.ellipse(-r*0.22, -r*0.12, r*0.10, r*0.07, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-r*0.22, -r*0.12, r*0.04, 0, Math.PI*2); ctx.fill();
    // Right eye
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.ellipse(r*0.22, -r*0.12, r*0.18, r*0.12, 0.15, 0, Math.PI*2); ctx.fill();
    const eyeGrdR = ctx.createRadialGradient(r*0.22, -r*0.12, 0, r*0.22, -r*0.12, r*0.12);
    eyeGrdR.addColorStop(0, '#FF0000'); eyeGrdR.addColorStop(0.5, '#FFD700'); eyeGrdR.addColorStop(1, '#220000');
    ctx.fillStyle = eyeGrdR;
    ctx.beginPath(); ctx.ellipse(r*0.22, -r*0.12, r*0.10, r*0.07, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(r*0.22, -r*0.12, r*0.04, 0, Math.PI*2); ctx.fill();
    // Eye glow
    ctx.fillStyle = `rgba(255,0,0,${0.3 + pulse * 0.2})`;
    ctx.beginPath(); ctx.arc(-r*0.22, -r*0.12, r*0.05, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(r*0.22, -r*0.12, r*0.05, 0, Math.PI*2); ctx.fill();

    // 8. Orbiting treasure — 8 gold coins + gems
    for (let oi = 0; oi < 8; oi++) {
      const oa = sw * 1.2 + (oi / 8) * Math.PI * 2;
      const orbitR = r * 1.65;
      const ox2 = Math.cos(oa) * orbitR;
      const oy2 = Math.sin(oa) * orbitR * 0.6;
      // Coin
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(ox2, oy2, r * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      // NEX sign on coin
      ctx.fillStyle = '#006655';
      ctx.font = `bold ${Math.round(r * 0.14)}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('⬢', ox2, oy2);
    }
    ctx.textBaseline = 'alphabetic';

    // 9. Central power emblem — glowing NEX symbol
    ctx.font = `bold ${Math.round(r * 0.5)}px monospace`;
    ctx.fillStyle = '#00FFCC';
    ctx.shadowColor = '#00FFCC'; ctx.shadowBlur = 25 + pulse * 15;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⬢', 0, r * 0.15);
    ctx.shadowBlur = 0;
    ctx.textBaseline = 'alphabetic';

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Storm Emperor (Sky Realm final boss) ──────────────────────────────────
  _renderStormEmperor(ctx, x, y, r, pulse) {
    const t      = Date.now() * 0.001;
    const flap   = Math.sin(t * 2.8) * 0.18;          // wing flap
    const rage   = 0.75 + Math.sin(t * 6.0) * 0.25;  // rage pulse
    const twitch = Math.sin(t * 11) * 2;               // angry twitch
    ctx.save();
    ctx.translate(x, y);

    // ── 0. Cover the generic cylinder body the BossBot draws first ──
    // Draw an opaque dark shape so the generic cylinder is hidden
    ctx.fillStyle = '#1a0800';
    ctx.beginPath(); ctx.ellipse(0, 0, r*1.05, r*1.15, 0, 0, Math.PI*2); ctx.fill();

    // ── 1. RAGE AURA — pulsing red-orange glow around the whole body ──
    ctx.globalAlpha = 0.55 * rage;
    ctx.shadowColor = '#FF3300'; ctx.shadowBlur = 50;
    ctx.fillStyle = '#FF2200';
    ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 0.35 * rage;
    ctx.fillStyle = '#FF7700';
    ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;

    // ── 2. TAIL FEATHERS — ragged spikes pointing down ────────────
    for (let ti = -3; ti <= 3; ti++) {
      const ta = Math.PI*0.5 + ti * 0.20 + Math.sin(t*3 + ti)*0.04;
      const len = r * (ti === 0 ? 1.7 : ti % 2 === 0 ? 1.4 : 1.1);
      ctx.strokeStyle = ti % 2 === 0 ? '#7a2a00' : '#5a1500';
      ctx.lineWidth = ti === 0 ? 6 : 4;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ta)*r*0.6, Math.sin(ta)*r*0.6);
      ctx.lineTo(Math.cos(ta)*len,   Math.sin(ta)*len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ── 3. WINGS — massive, jagged mutant feathers ────────────────
    for (const s of [-1, 1]) {
      // Main wing membrane (black-brown, solid and opaque)
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#2a0e02';
      ctx.strokeStyle = '#5a1800'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s*r*0.5,   r*0.4);
      ctx.lineTo(s*r*1.5,  -r*(0.2+flap));
      ctx.lineTo(s*r*2.2,  -r*(0.55+flap));
      ctx.lineTo(s*r*3.2,  -r*(0.3+flap*0.8));
      ctx.lineTo(s*r*3.0,   r*(0.35+flap*0.3));
      ctx.lineTo(s*r*2.3,   r*(0.55+flap*0.2));
      ctx.lineTo(s*r*1.4,   r*0.5);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      // Dark red inner wing
      ctx.fillStyle = '#4a1200';
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(s*r*0.48,  r*0.32);
      ctx.lineTo(s*r*2.0,  -r*(0.45+flap));
      ctx.lineTo(s*r*2.5,  -r*(0.20+flap*0.6));
      ctx.lineTo(s*r*2.2,   r*(0.20+flap*0.2));
      ctx.lineTo(s*r*1.1,   r*0.42);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;

      // Jagged feather spikes along trailing edge (6 bright-tipped)
      for (let fi = 0; fi < 6; fi++) {
        const ft   = fi / 5;
        const bx2  = s * (r*0.9 + ft * r*2.1);
        const by2  = r*0.45 + ft*(r*(0.5+flap*0.25) - r*0.45) - Math.sin(ft*Math.PI)*r*0.45;
        const spkL = (fi % 2 === 0 ? 26 : 16) + Math.sin(t*4+fi)*4;
        ctx.fillStyle = '#1a0800';
        ctx.beginPath();
        ctx.moveTo(bx2 - s*6, by2);
        ctx.lineTo(bx2 + s*2, by2 + spkL);
        ctx.lineTo(bx2 + s*9, by2);
        ctx.closePath(); ctx.fill();
        // Bright orange tip
        ctx.fillStyle = '#FF5500';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(bx2 - s*2, by2 + spkL*0.6);
        ctx.lineTo(bx2 + s*2, by2 + spkL);
        ctx.lineTo(bx2 + s*5, by2 + spkL*0.6);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // BRIGHT glowing red vein along wing bone
      ctx.strokeStyle = '#FF4400'; ctx.lineWidth = 3;
      ctx.globalAlpha = 0.85 * rage;
      ctx.shadowColor = '#FF2200'; ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(s*r*0.5,  r*0.35);
      ctx.quadraticCurveTo(s*r*1.8, -r*(0.4+flap*0.5), s*r*3.0, -r*(0.28+flap*0.7));
      ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;

      // Bone spur on mid-wing (bright bone color)
      ctx.fillStyle = '#E8C870';
      ctx.shadowColor = '#FFD000'; ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(s*r*1.5,       -r*(0.18+flap*0.5));
      ctx.lineTo(s*r*1.5 + s*7,  -r*(0.18+flap*0.5) - 20);
      ctx.lineTo(s*r*1.5 + s*15, -r*(0.18+flap*0.5));
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // ── 4. BODY — big hunched mutant bird torso ───────────────────
    // Dark body (clearly visible, covers cylinder)
    ctx.shadowColor = '#FF2200'; ctx.shadowBlur = 20;
    ctx.fillStyle = '#2a0c00';
    ctx.beginPath(); ctx.ellipse(0, r*0.05, r*0.72, r*0.88, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    // Chest lighter feather patch
    ctx.fillStyle = '#4a1a06';
    ctx.beginPath(); ctx.ellipse(0, r*0.12, r*0.42, r*0.52, 0, 0, Math.PI*2); ctx.fill();
    // Visible feather lines
    ctx.strokeStyle = '#8a3a10'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8;
    for (let fi = -2; fi <= 2; fi++) {
      const fx = fi * r * 0.16;
      ctx.beginPath();
      ctx.moveTo(fx, -r*0.12);
      ctx.quadraticCurveTo(fx + fi*5, r*0.2, fx, r*0.48);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // BRIGHT glowing red scar crack on chest
    ctx.strokeStyle = '#FF3300'; ctx.lineWidth = 3;
    ctx.globalAlpha = 0.9 * rage;
    ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(-r*0.12, -r*0.05);
    ctx.lineTo( r*0.06, r*0.14);
    ctx.lineTo(-r*0.05, r*0.20);
    ctx.lineTo( r*0.10, r*0.38);
    ctx.stroke();
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;

    // ── 5. HEAD — large, round, menacing ─────────────────────────
    ctx.shadowColor = '#FF2200'; ctx.shadowBlur = 18;
    ctx.fillStyle = '#2a0c00';
    ctx.beginPath(); ctx.arc(twitch*0.5, -r*0.80, r*0.60, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    // Feather detail ring
    ctx.fillStyle = '#3e1608';
    ctx.beginPath(); ctx.arc(twitch*0.5, -r*0.82, r*0.50, 0, Math.PI*2); ctx.fill();

    // Head crest — 5 jagged spikes on top (mohawk)
    for (let ci = 0; ci < 5; ci++) {
      const cx    = twitch*0.5 + (ci - 2) * r * 0.20;
      const cH    = r * (ci === 2 ? 0.62 : ci % 2 === 0 ? 0.44 : 0.34) + Math.sin(t*5+ci)*4;
      const baseY = -r * 1.32;
      // Dark spike base
      ctx.fillStyle = '#1a0600';
      ctx.beginPath();
      ctx.moveTo(cx - 7, baseY);
      ctx.lineTo(cx,      baseY - cH);
      ctx.lineTo(cx + 7,  baseY);
      ctx.closePath(); ctx.fill();
      // Bright red tip
      ctx.fillStyle = ci === 2 ? '#FF2200' : '#CC2200';
      ctx.shadowColor = '#FF0000'; ctx.shadowBlur = ci === 2 ? 14 : 6;
      ctx.globalAlpha = rage;
      ctx.beginPath();
      ctx.moveTo(cx - 4, baseY - cH*0.5);
      ctx.lineTo(cx,      baseY - cH);
      ctx.lineTo(cx + 4,  baseY - cH*0.5);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    // ── 6. ANGRY EYES — huge glowing red rage eyes ───────────────
    const eyeHX = twitch * 0.5;
    for (const s of [-1, 1]) {
      const ex = eyeHX + s * r * 0.27;
      const ey = -r * 0.82;
      // Outer glow
      ctx.globalAlpha = 0.5 * rage;
      ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 22;
      ctx.fillStyle = '#FF2200';
      ctx.beginPath(); ctx.arc(ex, ey, r*0.22, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      // Iris (bright burning orange)
      ctx.fillStyle = '#FF5500';
      ctx.beginPath(); ctx.arc(ex, ey, r*0.17, 0, Math.PI*2); ctx.fill();
      // Pupil — vertical slit (angry)
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.ellipse(ex, ey, r*0.05, r*0.13, 0, 0, Math.PI*2); ctx.fill();
      // Eye shine
      ctx.fillStyle = '#FFAA44';
      ctx.beginPath(); ctx.arc(ex - r*0.05, ey - r*0.06, r*0.05, 0, Math.PI*2); ctx.fill();
      // ANGRY EYEBROW — thick dark slash angled inward
      ctx.strokeStyle = '#000000'; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ex - s*r*0.20, ey - r*0.20);
      ctx.lineTo(ex + s*r*0.04, ey - r*0.10);
      ctx.stroke();
    }

    // ── 7. BEAK — wide open screaming, showing throat ─────────────
    const bx = eyeHX;
    ctx.shadowColor = '#FFA000'; ctx.shadowBlur = 10;
    // Upper beak
    ctx.fillStyle = '#D4920A';
    ctx.beginPath();
    ctx.moveTo(bx - r*0.24, -r*0.62);
    ctx.lineTo(bx + r*0.24, -r*0.62);
    ctx.lineTo(bx + r*0.14, -r*0.38);
    ctx.lineTo(bx,           -r*0.30);
    ctx.lineTo(bx - r*0.14, -r*0.38);
    ctx.closePath(); ctx.fill();
    // Upper beak ridge
    ctx.fillStyle = '#D49000';
    ctx.beginPath();
    ctx.moveTo(bx - r*0.10, -r*0.62);
    ctx.lineTo(bx + r*0.10, -r*0.62);
    ctx.lineTo(bx,           -r*0.33);
    ctx.closePath(); ctx.fill();
    // Lower beak (open / dropped down)
    ctx.fillStyle = '#B87B00';
    ctx.beginPath();
    ctx.moveTo(bx - r*0.20, -r*0.38);
    ctx.lineTo(bx + r*0.20, -r*0.38);
    ctx.lineTo(bx + r*0.08, -r*0.18);
    ctx.lineTo(bx - r*0.08, -r*0.18);
    ctx.closePath(); ctx.fill();
    // Open throat / mouth interior (dark red)
    ctx.fillStyle = '#5a0000';
    ctx.beginPath();
    ctx.moveTo(bx - r*0.18, -r*0.57);
    ctx.lineTo(bx + r*0.18, -r*0.57);
    ctx.lineTo(bx + r*0.09, -r*0.22);
    ctx.lineTo(bx - r*0.09, -r*0.22);
    ctx.closePath(); ctx.fill();
    // Tongue
    ctx.fillStyle = '#8B0000';
    ctx.beginPath();
    ctx.ellipse(bx, -r*0.40, r*0.07, r*0.14, 0, 0, Math.PI*2); ctx.fill();
    // Teeth — 3 small triangles on upper jaw
    ctx.fillStyle = '#F0E0A0';
    for (let ti = -1; ti <= 1; ti++) {
      const tx = bx + ti * r * 0.12;
      ctx.beginPath();
      ctx.moveTo(tx - 4, -r*0.57);
      ctx.lineTo(tx,      -r*0.48);
      ctx.lineTo(tx + 4,  -r*0.57);
      ctx.closePath(); ctx.fill();
    }

    // ── 8. MUTANT EXTRA EYE — center of forehead ─────────────────
    const mx = eyeHX, my = -r*1.02;
    ctx.globalAlpha = 0.65 * rage;
    ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#FF0000';
    ctx.beginPath(); ctx.arc(mx, my, r*0.13, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    ctx.fillStyle = '#AA0000';
    ctx.beginPath(); ctx.arc(mx, my, r*0.08, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(mx, my, r*0.04, 0, Math.PI*2); ctx.fill();

    ctx.shadowBlur = 0;

    // ── 9. LEGS and MASSIVE TALONS ────────────────────────────────
    ctx.strokeStyle = '#5a2200'; ctx.lineWidth = 8;
    ctx.shadowColor = '#FF2200'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(-r*0.25, r*0.82); ctx.lineTo(-r*0.30, r*1.10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( r*0.25, r*0.82); ctx.lineTo( r*0.30, r*1.10); ctx.stroke();
    // Claw feet — 3 big talons each foot
    ctx.strokeStyle = '#E8C060'; ctx.lineWidth = 4;
    ctx.shadowColor = '#FFD000'; ctx.shadowBlur = 8;
    for (const s of [-1, 1]) {
      const fx = s * r * 0.30, fy = r * 1.10;
      // 3 spreading claws
      for (let ci = -1; ci <= 1; ci++) {
        const ca = Math.PI*0.5 + ci * 0.45;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx + Math.cos(ca)*s*20, fy + Math.sin(ca)*16);
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  // ── REX KING — the apex predator, ruler of Dino World ─────────────────────
  _renderRexKing(ctx, x, y, r, pulse) {
    const breathe    = Math.sin(this._pulseT * 0.8) * 0.04;
    const roarOpen   = this._enraged ? Math.abs(Math.sin(this._pulseT * 3.5)) * 0.45 : 0.12;
    const stomped    = Math.abs(Math.sin(this._pulseT * 2.5));
    const t          = this._pulseT;

    ctx.save();
    ctx.translate(x, y);

    // ── 0. Cover generic base ─────────────────────────────────
    ctx.fillStyle = '#0a1a04';
    ctx.beginPath(); ctx.ellipse(0, 0, r*1.10, r*1.20, 0, 0, Math.PI*2); ctx.fill();

    // ── 1. Ground shadow ──────────────────────────────────────
    ctx.save(); ctx.globalAlpha = 0.30; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(r*0.15, r*0.22, r*(1.4+breathe), r*0.38, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // ── 2. Thundering footstep shockwave rings ────────────────
    if (stomped > 0.7) {
      for (let ri = 1; ri <= 3; ri++) {
        ctx.save();
        ctx.globalAlpha = (1 - ri * 0.28) * (stomped - 0.7) * 2.5;
        ctx.strokeStyle = '#AAFF44'; ctx.lineWidth = 2.5 - ri * 0.5;
        ctx.shadowColor = '#66FF00'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(0, r*0.7, r*(0.5 + ri * 0.5), 0, Math.PI*2); ctx.stroke();
        ctx.restore();
      }
    }

    // ── 3. Massive body ───────────────────────────────────────
    const bodyG = ctx.createRadialGradient(-r*0.12, -r*0.18, r*0.1, 0, 0, r*(1.1+breathe));
    bodyG.addColorStop(0.0, '#AADDBB');
    bodyG.addColorStop(0.25, '#66AA44');
    bodyG.addColorStop(0.55, '#337722');
    bodyG.addColorStop(0.85, '#1a4a10');
    bodyG.addColorStop(1.0, '#0a2a08');
    ctx.fillStyle = bodyG;
    ctx.shadowColor = '#88FF44'; ctx.shadowBlur = 22 * pulse;
    ctx.beginPath(); ctx.ellipse(0, r*0.08, r*0.88, r*(1.0+breathe), 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // ── 4. Armored back-plates ────────────────────────────────
    const plateG = ctx.createLinearGradient(0, -r*0.70, 0, r*0.40);
    plateG.addColorStop(0, '#CCEE88'); plateG.addColorStop(1, '#557733');
    ctx.fillStyle = plateG; ctx.strokeStyle = 'rgba(180,255,100,0.35)'; ctx.lineWidth = 1.5;
    const plates = [
      [0, -r*0.65, r*0.28, r*0.14],
      [-r*0.22, -r*0.45, r*0.22, r*0.12],
      [ r*0.22, -r*0.45, r*0.22, r*0.12],
      [0, -r*0.22, r*0.24, r*0.11],
      [-r*0.20, r*0.04, r*0.20, r*0.10],
      [ r*0.20, r*0.04, r*0.20, r*0.10],
    ];
    for (const [px, py, pw, ph] of plates) {
      ctx.beginPath(); ctx.ellipse(px, py, pw, ph, 0, 0, Math.PI*2);
      ctx.fill(); ctx.stroke();
    }

    // ── 5. Head ────────────────────────────────────────────────
    const headY   = -r * 0.88;
    const headPulse = this._enraged ? Math.sin(t * 4) * r * 0.04 : 0;
    const headG   = ctx.createRadialGradient(-r*0.08, headY - r*0.08, r*0.05, 0, headY, r*0.50);
    headG.addColorStop(0, '#CCEE66'); headG.addColorStop(0.5, '#88BB33'); headG.addColorStop(1, '#336611');
    ctx.fillStyle = headG;
    ctx.shadowColor = this._enraged ? '#FF4400' : '#88FF44'; ctx.shadowBlur = this._enraged ? 20 : 8;
    ctx.beginPath(); ctx.ellipse(0, headY + headPulse, r*0.52, r*0.44, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // ── 6. Snout ───────────────────────────────────────────────
    const snoutLen = r * (0.52 + roarOpen * 0.18);
    ctx.fillStyle = '#66AA33';
    ctx.beginPath();
    ctx.moveTo(-r*0.32, headY - r*0.08);
    ctx.lineTo(-r*0.28, headY - r*0.08 - snoutLen);
    ctx.lineTo( r*0.28, headY - r*0.08 - snoutLen);
    ctx.lineTo( r*0.32, headY - r*0.08);
    ctx.closePath(); ctx.fill();

    // ── 7. Open jaw ────────────────────────────────────────────
    ctx.fillStyle = '#CC3311';
    ctx.beginPath();
    ctx.moveTo(-r*0.32, headY + r*0.06);
    ctx.lineTo( r*0.32, headY + r*0.06);
    ctx.lineTo( r*0.28, headY + r*0.06 + r*roarOpen);
    ctx.lineTo(-r*0.28, headY + r*0.06 + r*roarOpen);
    ctx.closePath(); ctx.fill();

    // ── 8. Teeth ───────────────────────────────────────────────
    ctx.fillStyle = '#FFFFCC'; ctx.strokeStyle = '#CCCC88'; ctx.lineWidth = 0.8;
    for (let ti = -3; ti <= 3; ti++) {
      const tx2 = ti * r * 0.085;
      // Upper teeth
      ctx.beginPath(); ctx.moveTo(tx2 - r*0.04, headY - r*0.06); ctx.lineTo(tx2, headY - r*0.22); ctx.lineTo(tx2 + r*0.04, headY - r*0.06); ctx.closePath(); ctx.fill(); ctx.stroke();
      // Lower teeth
      ctx.beginPath(); ctx.moveTo(tx2 - r*0.04, headY + r*0.08); ctx.lineTo(tx2, headY + r*0.22); ctx.lineTo(tx2 + r*0.04, headY + r*0.08); ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    // ── 9. Eyes ────────────────────────────────────────────────
    const eyeCol  = this._enraged ? '#FF2200' : '#FFCC00';
    const eyeGlow = this._enraged ? '#FF0000' : '#FFAA00';
    for (const ex of [-r*0.22, r*0.22]) {
      ctx.shadowColor = eyeGlow; ctx.shadowBlur = this._enraged ? 18 : 8;
      ctx.fillStyle = eyeCol;
      ctx.beginPath(); ctx.arc(ex, headY - r*0.10, r*0.12, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      // Slit pupil
      ctx.fillStyle = '#000';
      ctx.save(); ctx.translate(ex, headY - r*0.10);
      ctx.scale(0.35, 1); ctx.beginPath(); ctx.arc(0, 0, r*0.10, 0, Math.PI*2); ctx.fill();
      ctx.restore();
      // Eye glint
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.arc(ex - r*0.04, headY - r*0.14, r*0.04, 0, Math.PI*2); ctx.fill();
    }

    // ── 10. Brow ridges ────────────────────────────────────────
    ctx.strokeStyle = '#224411'; ctx.lineWidth = r*0.08;
    ctx.beginPath(); ctx.moveTo(-r*0.34, headY - r*0.15); ctx.lineTo(-r*0.12, headY - r*0.20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( r*0.34, headY - r*0.15); ctx.lineTo( r*0.12, headY - r*0.20); ctx.stroke();

    // ── 11. Nostrils ───────────────────────────────────────────
    ctx.fillStyle = '#1a3a08';
    ctx.beginPath(); ctx.ellipse(-r*0.12, headY - r*0.42, r*0.06, r*0.04, 0.4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( r*0.12, headY - r*0.42, r*0.06, r*0.04,-0.4, 0, Math.PI*2); ctx.fill();

    // ── 12. Tiny arms ──────────────────────────────────────────
    ctx.strokeStyle = '#66AA33'; ctx.lineWidth = r*0.13;
    ctx.beginPath(); ctx.moveTo(-r*0.62, -r*0.22); ctx.lineTo(-r*0.90, r*0.02); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( r*0.62, -r*0.22); ctx.lineTo( r*0.90, r*0.02); ctx.stroke();
    // Claws
    ctx.strokeStyle = '#CCEE88'; ctx.lineWidth = r*0.055;
    for (const [cx2, dir] of [[-r*0.90, -1], [r*0.90, 1]]) {
      ctx.beginPath(); ctx.moveTo(cx2, r*0.02); ctx.lineTo(cx2 + dir*r*0.10, r*0.12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx2, r*0.02); ctx.lineTo(cx2 + dir*r*0.02, r*0.14); ctx.stroke();
    }

    // ── 13. Stomping legs ──────────────────────────────────────
    const lStompY = r*(0.82 + stomped * 0.14);
    const rStompY = r*(0.82 - stomped * 0.14);
    const legG = ctx.createLinearGradient(0, r*0.5, 0, r*1.2);
    legG.addColorStop(0, '#559922'); legG.addColorStop(1, '#224410');
    ctx.fillStyle = legG;
    ctx.beginPath(); ctx.ellipse(-r*0.34, lStompY, r*0.22, r*0.34, 0.15, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( r*0.34, rStompY, r*0.22, r*0.34,-0.15, 0, Math.PI*2); ctx.fill();

    // Clawed feet
    ctx.strokeStyle = '#CCEE66'; ctx.lineWidth = r*0.08;
    for (const [fx, fy, dir] of [[-r*0.34, lStompY + r*0.30, -1], [r*0.34, rStompY + r*0.30, 1]]) {
      for (let ci = -1; ci <= 1; ci++) {
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + dir*ci*r*0.12, fy + r*0.18); ctx.stroke();
      }
    }

    // ── 14. Enrage: lava glow cracks ──────────────────────────
    if (this._enraged) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#FF6600'; ctx.lineWidth = r*0.06;
      ctx.shadowColor = '#FF4400'; ctx.shadowBlur = 10;
      const cracks = [
        [[-r*0.20, r*0.14], [-r*0.44, r*0.36], [-r*0.28, r*0.60]],
        [[ r*0.14, r*0.06], [ r*0.38, r*0.30], [ r*0.22, r*0.52]],
        [[-r*0.06, -r*0.32], [-r*0.26, -r*0.50], [-r*0.18, -r*0.66]],
      ];
      for (const pts of cracks) {
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let pi = 1; pi < pts.length; pi++) ctx.lineTo(pts[pi][0], pts[pi][1]);
        ctx.stroke();
      }
      ctx.restore();
      // Shockwave ring on enrage
      ctx.save();
      ctx.globalAlpha = 0.40 * Math.abs(Math.sin(t * 6));
      ctx.strokeStyle = '#FF2200'; ctx.lineWidth = 3;
      ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(0, 0, r*(1.18 + Math.sin(t*5)*0.08), 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }

    // ── 15. Crown: bone horns on head ─────────────────────────
    ctx.fillStyle = '#FFFFAA'; ctx.strokeStyle = '#AABB66'; ctx.lineWidth = 1.2;
    const horns = [[-r*0.20, headY - r*0.28], [0, headY - r*0.32], [r*0.20, headY - r*0.28]];
    for (const [hx, hy] of horns) {
      ctx.beginPath(); ctx.moveTo(hx - r*0.07, hy + r*0.04); ctx.lineTo(hx, hy - r*0.22); ctx.lineTo(hx + r*0.07, hy + r*0.04); ctx.closePath(); ctx.fill(); ctx.stroke();
    }

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

    // Individual size — each zombie is a different scale (0.68 → 1.42)
    this._scale  = 0.68 + Math.random() * 0.74;
    // Big = slower/tankier, small = faster/frailer
    const sc = this._scale;
    this.radius = Math.round(this._cfg.radius * sc);
    this.speed  = this._cfg.speed * (1.25 - sc * 0.25);  // inverse speed scaling
    this.damage = Math.round(this._cfg.damage * (0.8 + sc * 0.2));
    this.hp     = Math.round((this._cfg.hp + wave * 8) * (0.7 + sc * 0.3));
    this.maxHp  = this.hp;

    this.dead  = false;
    this.dying = false;
    this._isZombie    = true;
    this._style       = Math.floor(Math.random() * 4); // colour variant
    this._headStyle   = Math.floor(Math.random() * 4); // head shape variant
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

    // Hit spray
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      particles.push(new Particle(this.x, this.y, Math.cos(a)*(40+Math.random()*70), Math.sin(a)*(40+Math.random()*70),
        Math.random()<0.5?'#55BB11':'#33DD00', 1.5+Math.random()*2.0, 0.22+Math.random()*0.28));
    }

    if (this.hp <= 0) {
      this.dying = true;
      this._dyingTimer = 0.3;
      // Death burst
      const dc = this.type==='brute'?11 : this.type==='bloater'?13 : this.type==='charger'?9 : 7;
      const cols = ['#55BB11','#33DD00','#77FF33','#1a4a04','#226600'];
      for (let i = 0; i < dc; i++) {
        const a = Math.random()*Math.PI*2, spd = 30+Math.random()*110;
        particles.push(new Particle(this.x,this.y,Math.cos(a)*spd,Math.sin(a)*spd,
          cols[Math.floor(Math.random()*cols.length)], 2+Math.random()*3, 0.30+Math.random()*0.45));
      }
      // 1 goop chunk
      const ga = Math.random()*Math.PI*2;
      particles.push(new Particle(this.x,this.y,Math.cos(ga)*22,Math.sin(ga)*22,'#1a4a04',5+Math.random()*4,0.45+Math.random()*0.5));
    }
  }

  render(ctx) {
    if (this.dead) return;
    const x = this.x, y = this.y, r = this.radius;
    const td   = this.dying ? Math.max(0, this._dyingTimer / 0.3) : 1;
    const walk = Math.sin(Date.now() * 0.007 * (this._rageMult > 1 ? 2.2 : 1)) * 0.28;

    // Each type has its own dedicated render for truly distinct silhouettes
    if (this.type === 'crawler') { this._renderCrawler(ctx, x, y, r, td, walk); ctx.restore(); this._renderZombieHPBar(ctx, x, y, r); return; }
    if (this.type === 'charger') { this._renderCharger(ctx, x, y, r, td, walk); ctx.restore(); this._renderZombieHPBar(ctx, x, y, r); return; }
    if (this.type === 'runner')  { this._renderRunner (ctx, x, y, r, td, walk); this._renderZombieHPBar(ctx, x, y, r); return; }
    if (this.type === 'brute')   { this._renderBrute  (ctx, x, y, r, td, walk); this._renderZombieHPBar(ctx, x, y, r); return; }
    if (this.type === 'bloater') { this._renderBloater(ctx, x, y, r, td, walk); this._renderZombieHPBar(ctx, x, y, r); return; }
    if (this.type === 'mutant')  { this._renderMutant (ctx, x, y, r, td, walk); this._renderZombieHPBar(ctx, x, y, r); return; }

    const sv = this._zSkin(this._style);
    const skinBase = sv.base, skinDark = sv.dark;
    const bloodCol = sv.wound;

    ctx.save();
    ctx.globalAlpha = td;
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2);

    // Ground shadow
    ctx.globalAlpha = td * 0.20;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(2, r * 0.42, r * 0.92, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = td;

    // Rage glow
    if (this._rageMult > 1) { ctx.shadowColor = '#FF3300'; ctx.shadowBlur = 20; }

    // ── Legs (uneven shambling) ───────────────────────────────
    for (const s of [-1, 1]) {
      const legOff = s * walk * r * 0.22;
      ctx.fillStyle = skinDark;
      ctx.beginPath();
      ctx.ellipse(s * r * 0.28, r * 0.18 + legOff, r * 0.19, r * 0.40, s * walk * 0.28, 0, Math.PI * 2);
      ctx.fill();
      // Foot / boot remnant
      ctx.fillStyle = '#100808';
      ctx.beginPath();
      ctx.ellipse(s * r * 0.30 + s * 0.06 * r, r * 0.52 + legOff, r * 0.22, r * 0.10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Torso ────────────────────────────────────────────────
    const bw = r * 0.64;
    const bh = r * 0.80;
    ctx.shadowColor = '#000'; ctx.shadowBlur = 7;
    const tg = ctx.createLinearGradient(-bw, -bh * 0.44, bw, bh * 0.36);
    tg.addColorStop(0, skinBase); tg.addColorStop(1, skinDark);
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.roundRect(-bw, -bh * 0.44, bw * 2, bh * 0.82, [bw * 0.22, bw * 0.22, bw * 0.14, bw * 0.14]);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Torn shirt scraps (colour varies by style)
    ctx.fillStyle = sv.rag;
    ctx.globalAlpha = td * 0.55;
    ctx.beginPath(); ctx.roundRect(-bw * 0.7, -bh * 0.38, bw * 0.55, bh * 0.30, 3); ctx.fill();
    ctx.beginPath(); ctx.roundRect(bw * 0.15, -bh * 0.44, bw * 0.5, bh * 0.25, 3); ctx.fill();
    ctx.globalAlpha = td;

    // Style-specific torso detail
    ctx.globalAlpha = td * 0.45;
    if (this._style === 1) { // brown: exposed ribs
      ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 1.0;
      for (let ri = 0; ri < 4; ri++) { ctx.beginPath(); ctx.arc(0, -bh*0.28 + ri*bh*0.18, bw*0.70, Math.PI*0.15, Math.PI*0.85); ctx.stroke(); }
    } else if (this._style === 2) { // pale: dark veins
      ctx.strokeStyle = '#336688'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-bw*0.4,-bh*0.38); ctx.bezierCurveTo(-bw*0.55,0, bw*0.2,-bh*0.1, bw*0.1,bh*0.22); ctx.stroke();
    } else if (this._style === 3) { // purple: fungal spots
      ctx.fillStyle = '#550077';
      for (let fi = 0; fi < 5; fi++) { ctx.beginPath(); ctx.arc(-bw*0.5+fi*bw*0.25, -bh*0.2+fi*bh*0.1, r*0.08, 0, Math.PI*2); ctx.fill(); }
    }
    ctx.globalAlpha = td;

    // Blood streaks
    ctx.strokeStyle = bloodCol; ctx.lineWidth = 1.5; ctx.globalAlpha = td * 0.70;
    ctx.beginPath(); ctx.moveTo(-r * 0.14, -bh * 0.28); ctx.lineTo(-r * 0.20, bh * 0.14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.10, -bh * 0.10); ctx.lineTo(r * 0.16, bh * 0.28); ctx.stroke();
    ctx.globalAlpha = td;

    // ── Arms (outstretched reaching) ─────────────────────────
    const armReach = 0.58;
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(s * bw * 0.90, -bh * 0.28);
      ctx.rotate(s * armReach + walk * s * 0.18);
      ctx.fillStyle = skinDark;
      ctx.beginPath();
      ctx.roundRect(-r * 0.15, -r * 0.64, r * 0.30, r * 0.74, r * 0.10);
      ctx.fill();
      // Rotted hand
      ctx.fillStyle = skinBase;
      ctx.beginPath(); ctx.ellipse(0, r * 0.14, r * 0.17, r * 0.19, 0, 0, Math.PI * 2); ctx.fill();
      // Bony claws
      ctx.strokeStyle = '#0a0808'; ctx.lineWidth = 1.3;
      for (let fi = -1; fi <= 1; fi++) {
        ctx.beginPath();
        ctx.moveTo(fi * r * 0.09, r * 0.16);
        ctx.lineTo(fi * r * 0.11, r * 0.28);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── Head ─────────────────────────────────────────────────
    const hhr = r * 0.50;
    const hy  = -bh * 0.48;
    this._drawZombieHead(ctx, 0, hy, hhr, skinBase, skinDark, '#ddc87a', '#880000', bloodCol, td);

    ctx.restore();

    this._renderZombieHPBar(ctx, x, y, r);
  }

  // ── Shared zombie skin palette helper ────────────────────
  _zSkin(style) {
    return [
      { base:'#22301a', dark:'#304222', rag:'#0e1a08', wound:'#5a0c0c' },
      { base:'#382808', dark:'#503a10', rag:'#1a1008', wound:'#7a0808' },
      { base:'#1a2a2a', dark:'#263838', rag:'#0a1414', wound:'#5a0a2a' },
      { base:'#2a1a30', dark:'#3a2440', rag:'#140e18', wound:'#7700aa' },
    ][style & 3];
  }

  // ── Shared head renderer — 4 distinct head shapes ─────────
  // cx,cy = centre in local ctx; skinBase/skinDark for fill; eyeCol/pupilCol/woundCol for details
  _drawZombieHead(ctx, cx, cy, hhr, skinBase, skinDark, eyeCol, pupilCol, woundCol, td) {
    const hs = this._headStyle;
    // 0=oval  1=wide & flat  2=tall narrow skull  3=lopsided
    const hrx = hs===1 ? hhr*1.38 : hs===2 ? hhr*0.70 : hs===3 ? hhr*1.12 : hhr;
    const hry = hs===1 ? hhr*0.76 : hs===2 ? hhr*1.32 : hs===3 ? hhr*0.90 : hhr;
    const tilt = hs===3 ? 0.20 : 0;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);

    // Head fill
    const hg = ctx.createRadialGradient(-hrx*0.18,-hry*0.18,1,0,0,Math.max(hrx,hry));
    hg.addColorStop(0, skinDark); hg.addColorStop(1, skinBase);
    ctx.fillStyle=hg; ctx.shadowColor='#000'; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.ellipse(0,0,hrx,hry,0,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;

    // Head-style detail
    if (hs===1) { // wide: heavy brow ridge
      ctx.fillStyle='rgba(0,0,0,0.32)';
      ctx.beginPath(); ctx.ellipse(0,-hry*0.36,hrx*0.76,hry*0.17,0,0,Math.PI*2); ctx.fill();
    } else if (hs===2) { // tall skull: faint suture line
      ctx.strokeStyle='rgba(255,255,255,0.07)'; ctx.lineWidth=1.0;
      ctx.beginPath(); ctx.moveTo(0,-hry*0.90); ctx.lineTo(0,-hry*0.30); ctx.stroke();
    } else if (hs===3) { // lopsided: chin lump
      ctx.fillStyle=skinDark;
      ctx.beginPath(); ctx.ellipse(hrx*0.30,hry*0.58,hrx*0.34,hry*0.20,0.4,0,Math.PI*2); ctx.fill();
    }

    // Jaw (open, rotting)
    ctx.fillStyle='#060402';
    ctx.beginPath(); ctx.ellipse(0, hry*0.54, hrx*0.46, hry*0.20, 0, 0, Math.PI*2); ctx.fill();
    // Teeth — count varies by head style
    const tCount = hs===1?4 : hs===2?2 : 3;
    const tSpacing = hrx*0.36 / Math.max(tCount-1,1);
    ctx.fillStyle = hs===2 ? '#ddcc88' : '#bbaa66';
    for (let ti=0; ti<tCount; ti++) {
      const tx2 = -hrx*0.18 + ti*tSpacing;
      ctx.beginPath(); ctx.roundRect(tx2-hry*0.07, hry*0.40, hry*0.13, hry*0.20, 2); ctx.fill();
    }
    // Blood drip
    ctx.fillStyle=woundCol; ctx.globalAlpha=td*0.75;
    ctx.beginPath(); ctx.ellipse(hrx*0.06, hry*0.72, 1.8, 3.5, 0.2, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha=td;

    // Eyes — shape varies
    const ey = -hry*0.08;
    const spread = hs===1 ? hrx*0.36 : hs===2 ? hrx*0.28 : hrx*0.30;
    const eyeW = hs===1 ? hrx*0.22 : hs===2 ? hrx*0.18 : hrx*0.20;
    const eyeH = hs===1 ? hry*0.12 : hs===2 ? hry*0.18 : hry*0.15;
    for (const s of [-1,1]) {
      ctx.fillStyle=eyeCol; ctx.shadowColor=pupilCol==='#880000'?'#DD1100':'#00BB44'; ctx.shadowBlur=this._rageMult>1?14:5;
      ctx.beginPath(); ctx.ellipse(s*spread, ey, eyeW, eyeH, 0, 0, Math.PI*2); ctx.fill();
      // Bloodshot vein
      ctx.strokeStyle=woundCol; ctx.lineWidth=0.7; ctx.globalAlpha=td*0.5;
      ctx.beginPath(); ctx.moveTo(s*spread-eyeW*0.85,ey); ctx.lineTo(s*spread-eyeW*0.15,ey); ctx.stroke();
      ctx.globalAlpha=td;
      // Pupil
      ctx.fillStyle=pupilCol; ctx.shadowBlur=this._rageMult>1?10:3;
      ctx.beginPath(); ctx.ellipse(s*spread,ey,eyeW*0.50,eyeH*0.80,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
    }
    // Head wound
    ctx.globalAlpha=td*0.60; ctx.fillStyle=woundCol;
    ctx.beginPath(); ctx.ellipse(-hrx*0.26,-hry*0.30,hrx*0.18,hry*0.09,-0.55,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=td;
    ctx.restore();
  }

  // ── RUNNER: very thin, lean, fast ────────────────────────
  // Long skinny torso, trailing arms, craned-forward head
  _renderRunner(ctx, x, y, r, td, walk) {
    const sv = this._zSkin(this._style);
    ctx.save();
    ctx.globalAlpha = td;
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2);

    // Ground shadow (narrow)
    ctx.globalAlpha = td * 0.15; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(0, r*0.38, r*0.55, r*0.14, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = td;

    if (this._rageMult > 1) { ctx.shadowColor = '#FF2200'; ctx.shadowBlur = 18; }

    // Legs — long, thin, stride pose
    for (const s of [-1, 1]) {
      const legA = s * walk * 0.55;
      ctx.save(); ctx.translate(s * r*0.16, r*0.22);
      ctx.rotate(legA);
      ctx.fillStyle = sv.dark;
      ctx.beginPath(); ctx.roundRect(-r*0.10, 0, r*0.20, r*0.60, r*0.08); ctx.fill();
      // Foot
      ctx.fillStyle = '#0e0808';
      ctx.beginPath(); ctx.ellipse(s*r*0.04, r*0.62, r*0.18, r*0.08, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // Thin torso
    const bw = r*0.30, bh = r*0.92;
    const tg = ctx.createLinearGradient(-bw, -bh*0.44, bw, bh*0.36);
    tg.addColorStop(0, sv.base); tg.addColorStop(1, sv.dark);
    ctx.fillStyle = tg; ctx.shadowColor = '#000'; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.roundRect(-bw, -bh*0.44, bw*2, bh*0.82, bw*0.25); ctx.fill();
    ctx.shadowBlur = 0;
    // Torn scraps
    ctx.fillStyle = sv.rag; ctx.globalAlpha = td*0.5;
    ctx.beginPath(); ctx.roundRect(-bw*0.9, -bh*0.35, bw*0.8, bh*0.22, 2); ctx.fill();
    ctx.globalAlpha = td;
    // Blood streak
    ctx.strokeStyle = sv.wound; ctx.lineWidth = 1.2; ctx.globalAlpha = td*0.6;
    ctx.beginPath(); ctx.moveTo(0, -bh*0.28); ctx.lineTo(r*0.06, bh*0.14); ctx.stroke();
    ctx.globalAlpha = td;

    // Arms — trailing behind (sprinting)
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s*bw*0.85, -bh*0.22);
      ctx.rotate(s * -0.65 + walk*s*0.2); // swept back
      ctx.fillStyle = sv.dark;
      ctx.beginPath(); ctx.roundRect(-r*0.09, -r*0.55, r*0.18, r*0.60, r*0.07); ctx.fill();
      // Bony hand
      ctx.fillStyle = sv.base;
      ctx.beginPath(); ctx.ellipse(0, r*0.08, r*0.12, r*0.14, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // Head — craned far forward
    const hhr = r*0.36;
    const hy  = -bh*0.44 - hhr*0.85;
    this._drawZombieHead(ctx, 0, hy, hhr, sv.base, sv.dark, '#ffee88', '#CC0000', sv.wound, td);
    ctx.restore();
  }

  // ── BRUTE: massive wide body, tiny head, huge arms ────────
  _renderBrute(ctx, x, y, r, td, walk) {
    ctx.save();
    ctx.globalAlpha = td;
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2);

    // Big ground shadow
    ctx.globalAlpha = td*0.25; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(4, r*0.5, r*1.3, r*0.32, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = td;

    // Short wide legs
    for (const s of [-1, 1]) {
      const legOff = s * walk * r * 0.14;
      ctx.fillStyle = '#3a1606';
      ctx.beginPath(); ctx.ellipse(s*r*0.42, r*0.20+legOff, r*0.30, r*0.38, s*walk*0.15, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#180804';
      ctx.beginPath(); ctx.ellipse(s*r*0.44+s*0.06*r, r*0.52+legOff, r*0.30, r*0.12, 0, 0, Math.PI*2); ctx.fill();
    }

    // MASSIVE wide torso
    const bw = r*1.10, bh = r*0.68;
    const tg = ctx.createLinearGradient(-bw, -bh*0.44, bw, bh*0.36);
    tg.addColorStop(0, '#3a1808'); tg.addColorStop(1, '#5a2a10');
    ctx.fillStyle = tg; ctx.shadowColor = '#000'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.roundRect(-bw, -bh*0.44, bw*2, bh*0.82, [bw*0.15,bw*0.15,bw*0.10,bw*0.10]); ctx.fill();
    ctx.shadowBlur = 0;
    // Torn rags on huge torso
    ctx.fillStyle = '#180808'; ctx.globalAlpha = td*0.5;
    ctx.beginPath(); ctx.roundRect(-bw*0.7,-bh*0.38,bw*0.55,bh*0.28,3); ctx.fill();
    ctx.beginPath(); ctx.roundRect(bw*0.18,-bh*0.44,bw*0.48,bh*0.22,3); ctx.fill();
    ctx.globalAlpha = td;
    // Exposed rib arcs
    ctx.strokeStyle = '#2a1006'; ctx.lineWidth = 1.2; ctx.globalAlpha = td*0.45;
    for (let ri=0;ri<3;ri++) { ctx.beginPath(); ctx.arc(0,-bh*0.22+ri*bh*0.22,bw*0.62,Math.PI*0.18,Math.PI*0.82); ctx.stroke(); }
    ctx.globalAlpha = td;

    // HUGE arms
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s*bw*0.92, -bh*0.22);
      ctx.rotate(s*0.42 + walk*s*0.12);
      ctx.fillStyle = '#4a2010';
      ctx.beginPath(); ctx.roundRect(-r*0.28, -r*0.72, r*0.56, r*0.82, r*0.12); ctx.fill();
      // Massive fist
      ctx.fillStyle = '#3a1808';
      ctx.beginPath(); ctx.ellipse(0, r*0.16, r*0.28, r*0.26, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#0a0404'; ctx.lineWidth = 1.6;
      for (let fi=-1;fi<=1;fi++) { ctx.beginPath(); ctx.moveTo(fi*r*0.14,r*0.20); ctx.lineTo(fi*r*0.17,r*0.36); ctx.stroke(); }
      ctx.restore();
    }

    // Tiny head (small relative to massive body)
    const hhr = r*0.36;
    const hy  = -bh*0.44 - hhr;
    this._drawZombieHead(ctx, 0, hy, hhr, '#2e1006', '#4a1c0a', '#ffcc66', '#880000', '#5a0c0c', td);
    ctx.restore();
  }

  // ── BLOATER: huge round fat body ─────────────────────────
  _renderBloater(ctx, x, y, r, td, walk) {
    ctx.save();
    ctx.globalAlpha = td;
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2);

    // Very wide shadow
    ctx.globalAlpha=td*0.22; ctx.fillStyle='#000';
    ctx.beginPath(); ctx.ellipse(4, r*0.55, r*1.4, r*0.30, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha=td;

    // Stubby legs barely visible under belly
    for (const s of [-1,1]) {
      ctx.fillStyle='#223318';
      ctx.beginPath(); ctx.ellipse(s*r*0.30, r*0.65, r*0.20, r*0.28, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle='#0e1808';
      ctx.beginPath(); ctx.ellipse(s*r*0.32, r*0.88, r*0.22, r*0.09, 0, 0, Math.PI*2); ctx.fill();
    }

    // ROUND MASSIVE BODY — almost circular
    const pulse = 1 + Math.sin(Date.now()*0.003)*0.03; // subtle throb
    const bw = r*0.96*pulse, bh = r*0.96/pulse;
    const bg = ctx.createRadialGradient(0,0,r*0.1,0,0,r*0.95);
    bg.addColorStop(0,'#3a5a1a'); bg.addColorStop(0.7,'#223314'); bg.addColorStop(1,'#142208');
    ctx.fillStyle=bg; ctx.shadowColor='#000'; ctx.shadowBlur=12;
    ctx.beginPath(); ctx.ellipse(0, 0, bw, bh, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    // Swollen veins on belly
    ctx.strokeStyle='#558822'; ctx.lineWidth=1.4; ctx.globalAlpha=td*0.55;
    ctx.beginPath(); ctx.moveTo(-bw*0.6,-bh*0.2); ctx.bezierCurveTo(-bw*0.8,0,-bw*0.5,bh*0.3,-bw*0.2,bh*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bw*0.4,-bh*0.3); ctx.bezierCurveTo(bw*0.75,0,bw*0.6,bh*0.4,bw*0.1,bh*0.55); ctx.stroke();
    ctx.globalAlpha=td;
    // Stretch marks / tears
    ctx.strokeStyle='#1a4a08'; ctx.lineWidth=1.0; ctx.globalAlpha=td*0.40;
    for (let sm=0;sm<5;sm++) {
      const a = (sm/5)*Math.PI - Math.PI*0.3;
      ctx.beginPath(); ctx.moveTo(Math.cos(a)*bw*0.5,Math.sin(a)*bh*0.5); ctx.lineTo(Math.cos(a)*bw*0.85,Math.sin(a)*bh*0.85); ctx.stroke();
    }
    ctx.globalAlpha=td;

    // Tiny stub arms
    for (const s of [-1,1]) {
      ctx.fillStyle='#334d22';
      ctx.beginPath(); ctx.ellipse(s*bw*0.88, -bh*0.1, r*0.16, r*0.28, s*0.5, 0, Math.PI*2); ctx.fill();
    }

    // Head — sits right on top of body, no neck
    const hhr=r*0.40;
    const hy=-bh*0.82;
    this._drawZombieHead(ctx, 0, hy, hhr, '#223310', '#3a5018', '#ddcc88', '#004400', '#336600', td);
    ctx.restore();
  }

  // ── MUTANT: deformed, one huge arm, asymmetric ────────────
  _renderMutant(ctx, x, y, r, td, walk) {
    const sv = this._zSkin(this._style);
    ctx.save();
    ctx.globalAlpha = td;
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2);

    // Shadow
    ctx.globalAlpha=td*0.18; ctx.fillStyle='#000';
    ctx.beginPath(); ctx.ellipse(3,r*0.44,r*1.05,r*0.24,0,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=td;

    // Legs — one normal, one deformed shorter
    ctx.fillStyle = sv.dark;
    ctx.beginPath(); ctx.ellipse(-r*0.24, r*0.20+walk*r*0.20, r*0.19, r*0.40, -walk*0.25, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#334400'; // mutated leg — slightly different
    ctx.beginPath(); ctx.ellipse(r*0.26, r*0.26-walk*r*0.15, r*0.24, r*0.32, walk*0.30, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#0e0808';
    ctx.beginPath(); ctx.ellipse(-r*0.26, r*0.52, r*0.22, r*0.10, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r*0.30, r*0.52, r*0.20, r*0.10, 0, 0, Math.PI*2); ctx.fill();

    // Torso — slightly asymmetric
    const bw=r*0.62, bh=r*0.85;
    const tg=ctx.createLinearGradient(-bw,-bh*0.44,bw,bh*0.36);
    tg.addColorStop(0,sv.base); tg.addColorStop(1,sv.dark);
    ctx.fillStyle=tg; ctx.shadowColor='#000'; ctx.shadowBlur=7;
    ctx.beginPath();
    // Asymmetric: right side bulges (tumor/mutation)
    ctx.moveTo(-bw, bh*0.38);
    ctx.bezierCurveTo(-bw,-bh*0.44+bh*0.20, -bw*0.50,-bh*0.44, 0,-bh*0.44);
    ctx.bezierCurveTo(bw*0.60,-bh*0.44, bw*1.18,-bh*0.10, bw*1.08,bh*0.38);
    ctx.closePath();
    ctx.fill(); ctx.shadowBlur=0;
    // Tumor growth on right
    const tumG=ctx.createRadialGradient(bw*0.72,0,2,bw*0.72,0,r*0.36);
    tumG.addColorStop(0,'#aabb00'); tumG.addColorStop(1,'#445500');
    ctx.fillStyle=tumG; ctx.globalAlpha=td*0.85;
    ctx.beginPath(); ctx.ellipse(bw*0.72,0,r*0.32,r*0.38,0.3,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=td;
    // Torn scraps
    ctx.fillStyle=sv.rag; ctx.globalAlpha=td*0.5;
    ctx.beginPath(); ctx.roundRect(-bw*0.7,-bh*0.38,bw*0.55,bh*0.28,3); ctx.fill();
    ctx.globalAlpha=td;

    // LEFT ARM — small, withered
    ctx.save(); ctx.translate(-bw*0.88,-bh*0.28);
    ctx.rotate(-0.45+walk*(-0.15));
    ctx.fillStyle=sv.dark;
    ctx.beginPath(); ctx.roundRect(-r*0.09,-r*0.42,r*0.18,r*0.50,r*0.07); ctx.fill();
    ctx.fillStyle=sv.base;
    ctx.beginPath(); ctx.ellipse(0,r*0.12,r*0.10,r*0.12,0,0,Math.PI*2); ctx.fill();
    ctx.restore();

    // RIGHT ARM — huge mutated arm
    ctx.save(); ctx.translate(bw*0.95,-bh*0.20);
    ctx.rotate(0.60+walk*0.18);
    ctx.fillStyle='#445500';
    ctx.beginPath(); ctx.roundRect(-r*0.22,-r*0.90,r*0.44,r*1.05,r*0.14); ctx.fill();
    // Huge mutant claws
    ctx.fillStyle='#334400';
    ctx.beginPath(); ctx.ellipse(0,r*0.20,r*0.26,r*0.24,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#111'; ctx.lineWidth=1.8;
    for (let fi=-2;fi<=2;fi++) { ctx.beginPath(); ctx.moveTo(fi*r*0.10,r*0.22); ctx.lineTo(fi*r*0.13,r*0.42); ctx.stroke(); }
    ctx.restore();

    // Head
    const hhr=r*0.46;
    const hy=-bh*0.48;
    this._drawZombieHead(ctx, 0, hy, hhr, sv.base, sv.dark, '#ccee44', '#224400', sv.wound, td);
    ctx.restore();
  }

  _renderZombieHPBar(ctx, x, y, r) {
    const showBar = this.type === 'brute' || this.type === 'bloater' || this.type === 'charger' || this._damagedTimer > 0;
    if (showBar && !this.dying) {
      const bw2 = r * 2 + 8, bh2 = 3;
      const bx2 = x - bw2 / 2, by2 = y - r - 10;
      ctx.save();
      ctx.fillStyle = '#111'; ctx.fillRect(bx2, by2, bw2, bh2);
      ctx.fillStyle = '#44FF44'; ctx.fillRect(bx2, by2, bw2 * (this.hp / this.maxHp), bh2);
      ctx.restore();
    }
  }

  // ── Crawler: flat fast ground-hugger ─────────────────────
  _renderCrawler(ctx, x, y, r, td, walk) {
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2);
    // Flat elongated body (crawling on all fours)
    const bw = r * 1.1, bh = r * 0.38;
    // Ground shadow
    ctx.globalAlpha = td * 0.18; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(2, r * 0.15, r * 1.1, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = td;
    // Body — low slung
    const cg = ctx.createLinearGradient(-bw, -bh, bw, bh);
    cg.addColorStop(0, '#2a3a10'); cg.addColorStop(1, '#3a5018');
    ctx.fillStyle = cg; ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.ellipse(0, 0, bw, bh, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Clawed front limbs (outstretched)
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#304418';
      ctx.beginPath(); ctx.ellipse(s * r * 0.52, -r * 0.55 + walk * s * r * 0.18, r * 0.14, r * 0.32, s * 0.3, 0, Math.PI * 2); ctx.fill();
      // Claws
      ctx.strokeStyle = '#0a0a06'; ctx.lineWidth = 1.1;
      for (let fi = -1; fi <= 1; fi++) {
        ctx.beginPath();
        ctx.moveTo(s * r * 0.52 + fi * r * 0.06, -r * 0.72);
        ctx.lineTo(s * r * 0.54 + fi * r * 0.07, -r * 0.86);
        ctx.stroke();
      }
    }
    // Head — narrow and forward
    const hhr = r * 0.40;
    ctx.fillStyle = '#304018'; ctx.shadowColor = '#000'; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.ellipse(0, -r * 0.72, hhr * 0.7, hhr, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Eyes — small yellow predator eyes
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#BBFF22'; ctx.shadowColor = '#88FF00'; ctx.shadowBlur = 7;
      ctx.beginPath(); ctx.ellipse(s * hhr * 0.30, -r * 0.78, hhr * 0.14, hhr * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.ellipse(s * hhr * 0.30, -r * 0.78, hhr * 0.06, hhr * 0.09, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Speed-line motion blur hint on body
    ctx.strokeStyle = '#44660888'; ctx.lineWidth = 1; ctx.globalAlpha = td * 0.30;
    for (let li = 1; li <= 3; li++) {
      ctx.beginPath(); ctx.moveTo(-bw * 0.6, bh * li * 0.5); ctx.lineTo(bw * 0.4, bh * li * 0.5); ctx.stroke();
    }
    ctx.globalAlpha = td;
  }

  // ── Charger: muscular blood-red berserker ─────────────────
  _renderCharger(ctx, x, y, r, td, walk) {
    ctx.translate(x, y);
    ctx.rotate(this._angle - Math.PI / 2);
    const bw = r * 0.74, bh = r * 0.88;
    // Rage glow
    ctx.shadowColor = '#FF2200'; ctx.shadowBlur = 22 + Math.sin(Date.now() * 0.012) * 8;
    // Ground shadow
    ctx.globalAlpha = td * 0.24; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(3, r * 0.44, r * 0.95, r * 0.24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = td;
    // Legs — pumping hard
    for (const s of [-1, 1]) {
      const legOff = s * walk * r * 0.32;
      ctx.fillStyle = '#7a0a06';
      ctx.beginPath(); ctx.ellipse(s * r * 0.30, r * 0.18 + legOff, r * 0.21, r * 0.42, s * walk * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a0404';
      ctx.beginPath(); ctx.ellipse(s * r * 0.32 + s * 0.07 * r, r * 0.54 + legOff, r * 0.24, r * 0.11, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Torso — wide, muscular
    const rg = ctx.createLinearGradient(-bw, -bh * 0.44, bw, bh * 0.36);
    rg.addColorStop(0, '#9a1408'); rg.addColorStop(1, '#5a0c04');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.roundRect(-bw, -bh * 0.44, bw * 2, bh * 0.82, [bw * 0.22, bw * 0.22, bw * 0.14, bw * 0.14]); ctx.fill();
    // Veins on chest
    ctx.strokeStyle = '#CC1100'; ctx.lineWidth = 1.4; ctx.globalAlpha = td * 0.55;
    ctx.beginPath(); ctx.moveTo(-r*0.22, -bh*0.35); ctx.lineTo(-r*0.30, bh*0.12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r*0.18, -bh*0.22); ctx.lineTo(r*0.26, bh*0.20); ctx.stroke();
    ctx.globalAlpha = td;
    // Arms — massive, forward-thrust
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * bw * 0.92, -bh * 0.30);
      ctx.rotate(s * 0.45 + walk * s * 0.22);
      ctx.fillStyle = '#7a1008';
      ctx.beginPath(); ctx.roundRect(-r * 0.18, -r * 0.68, r * 0.36, r * 0.78, r * 0.12); ctx.fill();
      ctx.fillStyle = '#5a0c06';
      ctx.beginPath(); ctx.ellipse(0, r * 0.16, r * 0.20, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1a0404'; ctx.lineWidth = 1.4;
      for (let fi = -1; fi <= 1; fi++) {
        ctx.beginPath(); ctx.moveTo(fi * r * 0.11, r * 0.18); ctx.lineTo(fi * r * 0.14, r * 0.32); ctx.stroke();
      }
      ctx.restore();
    }
    // Head — brutish, low brow
    const hhr = r * 0.52;
    const hg  = ctx.createRadialGradient(-hhr * 0.2, -bh * 0.50, 1, 0, -bh * 0.48, hhr);
    hg.addColorStop(0, '#8a1006'); hg.addColorStop(1, '#4a0804');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(0, -bh * 0.48, hhr, 0, Math.PI * 2); ctx.fill();
    // Jaw
    ctx.fillStyle = '#2a0404';
    ctx.beginPath(); ctx.ellipse(0, -bh * 0.48 + hhr * 0.56, hhr * 0.52, hhr * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ccaa66';
    for (let ti = -1; ti <= 1; ti++) {
      ctx.beginPath(); ctx.roundRect(ti * hhr * 0.24 - hhr * 0.09, -bh * 0.48 + hhr * 0.42, hhr * 0.16, hhr * 0.22, 2); ctx.fill();
    }
    // Eyes — solid burning orange
    const ey = -bh * 0.48 - hhr * 0.06;
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#FF4400'; ctx.shadowColor = '#FF2200'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.ellipse(s * hhr * 0.30, ey, hhr * 0.18, hhr * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FF8800'; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.ellipse(s * hhr * 0.30, ey, hhr * 0.08, hhr * 0.10, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.shadowBlur = 0;
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
    const pulse = (Math.sin(this._t * 3) + 1) * 0.5;

    ctx.save();
    if (this.dying) ctx.globalAlpha = Math.max(0, 1 - this._dyingT / 0.6);

    // Render based on tier
    switch (this._tier) {
      case 'light':  this._renderLight(ctx, x, y, r, pulse); break;
      case 'heavy':  this._renderHeavy(ctx, x, y, r, pulse); break;
      case 'elite':  this._renderElite(ctx, x, y, r, pulse); break;
      case 'sniper': this._renderSniper(ctx, x, y, r, pulse); break;
      case 'medic':  this._renderMedic(ctx, x, y, r, pulse); break;
      case 'ghost':  this._renderGhost(ctx, x, y, r, pulse); break;
      default:       this._renderLight(ctx, x, y, r, pulse); break;
    }

    // Gun arm (all guards)
    this._renderGunArm(ctx, x, y, r);

    // HP bar
    const bw = r * 2.8, bh = 5;
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.roundRect(x - bw/2, y - r - 12, bw, bh, 2);
    ctx.fill();
    const hpPct = this.hp / this.maxHp;
    const hpColor = hpPct > 0.6 ? '#44FF88' : hpPct > 0.3 ? '#FFAA44' : '#FF4444';
    ctx.fillStyle = hpColor;
    ctx.beginPath();
    ctx.roundRect(x - bw/2, y - r - 12, bw * hpPct, bh, 2);
    ctx.fill();

    // Tier label
    const labels = { light: 'SCOUT', heavy: 'TANK', elite: 'ELITE', sniper: 'SNIPER', medic: 'MEDIC', ghost: 'GHOST' };
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color; ctx.shadowBlur = 8;
    ctx.font = 'bold 7px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(labels[this._tier] || 'GUARD', x, y - r - 17);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  _renderGunArm(ctx, x, y, r) {
    const gx = x + Math.cos(this._angle) * (r + 12);
    const gy = y + Math.sin(this._angle) * (r + 12);

    // Arm
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(this._angle) * (r - 2), y + Math.sin(this._angle) * (r - 2));
    ctx.lineTo(gx, gy);
    ctx.stroke();

    // Gun muzzle
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(gx, gy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ── Light Guard — Fast Scout ──────────────────────────────────────────────
  _renderLight(ctx, x, y, r, pulse) {
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x + 2, y + r * 0.8, r * 0.9, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();

    // Outer glow ring
    ctx.strokeStyle = `rgba(68,204,255,${0.2 + pulse * 0.15})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r + 4 + pulse * 2, 0, Math.PI * 2); ctx.stroke();

    // Body gradient — sleek blue armor
    const bodyGrd = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    bodyGrd.addColorStop(0, '#88DDFF');
    bodyGrd.addColorStop(0.4, '#44CCFF');
    bodyGrd.addColorStop(0.8, '#2288CC');
    bodyGrd.addColorStop(1, '#115588');
    ctx.fillStyle = bodyGrd;
    ctx.shadowColor = '#44CCFF'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

    // Armor plates
    ctx.strokeStyle = '#88EEFF';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, r * 0.7, -0.8, 0.8); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r * 0.7, Math.PI - 0.5, Math.PI + 0.5); ctx.stroke();

    // Visor
    ctx.fillStyle = '#001122';
    ctx.beginPath(); ctx.ellipse(x, y - r * 0.15, r * 0.5, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(68,238,255,${0.6 + pulse * 0.3})`;
    ctx.beginPath(); ctx.ellipse(x, y - r * 0.15, r * 0.35, r * 0.12, 0, 0, Math.PI * 2); ctx.fill();

    // Speed lines
    ctx.strokeStyle = `rgba(68,204,255,${0.15 + pulse * 0.1})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const ly = y - r * 0.4 + i * r * 0.4;
      ctx.beginPath(); ctx.moveTo(x - r * 1.5, ly); ctx.lineTo(x - r * 0.8, ly); ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // ── Heavy Guard — Tank ────────────────────────────────────────────────────
  _renderHeavy(ctx, x, y, r, pulse) {
    // Ground shadow (larger)
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(x + 3, y + r * 0.7, r * 1.1, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();

    // Outer armor plating glow
    ctx.strokeStyle = `rgba(255,136,68,${0.25 + pulse * 0.15})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.stroke();

    // Heavy body — orange/bronze armor
    const bodyGrd = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
    bodyGrd.addColorStop(0, '#FFCC88');
    bodyGrd.addColorStop(0.3, '#FF9944');
    bodyGrd.addColorStop(0.7, '#CC6622');
    bodyGrd.addColorStop(1, '#663311');
    ctx.fillStyle = bodyGrd;
    ctx.shadowColor = '#FF8844'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

    // Thick armor plates
    ctx.fillStyle = '#884422';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.8, y - r * 0.3);
    ctx.lineTo(x - r * 0.5, y - r * 0.7);
    ctx.lineTo(x + r * 0.5, y - r * 0.7);
    ctx.lineTo(x + r * 0.8, y - r * 0.3);
    ctx.closePath();
    ctx.fill();

    // Shoulder pads
    ctx.fillStyle = '#AA5522';
    ctx.beginPath(); ctx.ellipse(x - r * 0.7, y, r * 0.4, r * 0.5, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r * 0.7, y, r * 0.4, r * 0.5, 0.3, 0, Math.PI * 2); ctx.fill();

    // Visor — narrow angry slit
    ctx.fillStyle = '#220000';
    ctx.fillRect(x - r * 0.6, y - r * 0.3, r * 1.2, r * 0.25);
    ctx.fillStyle = `rgba(255,100,0,${0.7 + pulse * 0.3})`;
    ctx.fillRect(x - r * 0.5, y - r * 0.25, r * 1.0, r * 0.12);

    // Chest emblem
    ctx.fillStyle = '#FFAA44';
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.1);
    ctx.lineTo(x - r * 0.2, y + r * 0.4);
    ctx.lineTo(x + r * 0.2, y + r * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ── Elite Guard — Special Forces ──────────────────────────────────────────
  _renderElite(ctx, x, y, r, pulse) {
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(x + 2, y + r * 0.75, r * 0.95, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();

    // Pulsing elite aura
    ctx.strokeStyle = `rgba(170,255,170,${0.3 + pulse * 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r + 6 + pulse * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(170,255,170,${0.15 + pulse * 0.1})`;
    ctx.beginPath(); ctx.arc(x, y, r + 10 + pulse * 4, 0, Math.PI * 2); ctx.stroke();

    // Body — green tactical armor
    const bodyGrd = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    bodyGrd.addColorStop(0, '#CCFFCC');
    bodyGrd.addColorStop(0.35, '#88DD88');
    bodyGrd.addColorStop(0.7, '#44AA44');
    bodyGrd.addColorStop(1, '#226622');
    ctx.fillStyle = bodyGrd;
    ctx.shadowColor = '#88FF88'; ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

    // Tactical vest pattern
    ctx.strokeStyle = '#44CC44';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r * 0.6); ctx.lineTo(x - r * 0.4, y + r * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + r * 0.4, y - r * 0.6); ctx.lineTo(x + r * 0.4, y + r * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r * 0.6, y); ctx.lineTo(x + r * 0.6, y); ctx.stroke();

    // Night vision goggles
    ctx.fillStyle = '#112211';
    ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.2, r * 0.22, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r * 0.25, y - r * 0.2, r * 0.22, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    // Glowing lenses
    ctx.fillStyle = `rgba(0,255,100,${0.7 + pulse * 0.3})`;
    ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.2, r * 0.14, r * 0.10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r * 0.25, y - r * 0.2, r * 0.14, r * 0.10, 0, 0, Math.PI * 2); ctx.fill();

    // Star emblem
    ctx.fillStyle = '#FFFF44';
    this._drawStar(ctx, x, y + r * 0.35, 5, r * 0.18, r * 0.08);
    ctx.shadowBlur = 0;
  }

  // ── Sniper Guard — Long Range ─────────────────────────────────────────────
  _renderSniper(ctx, x, y, r, pulse) {
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x + 2, y + r * 0.8, r * 0.85, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();

    // Targeting reticle aura
    ctx.strokeStyle = `rgba(255,68,255,${0.2 + pulse * 0.15})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, r + 8, 0, Math.PI * 2); ctx.stroke();
    // Crosshair lines
    ctx.beginPath(); ctx.moveTo(x - r - 12, y); ctx.lineTo(x - r - 5, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + r + 5, y); ctx.lineTo(x + r + 12, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - r - 12); ctx.lineTo(x, y - r - 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + r + 5); ctx.lineTo(x, y + r + 12); ctx.stroke();

    // Body — purple/magenta stealth suit
    const bodyGrd = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    bodyGrd.addColorStop(0, '#FFAAFF');
    bodyGrd.addColorStop(0.4, '#DD66DD');
    bodyGrd.addColorStop(0.75, '#AA44AA');
    bodyGrd.addColorStop(1, '#552255');
    ctx.fillStyle = bodyGrd;
    ctx.shadowColor = '#FF44FF'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

    // Hood/cloak outline
    ctx.strokeStyle = '#CC88CC';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - r * 0.1, r * 0.85, -2.5, -0.6);
    ctx.stroke();

    // Scope eye piece
    ctx.fillStyle = '#220022';
    ctx.beginPath(); ctx.ellipse(x, y - r * 0.15, r * 0.45, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,0,255,${0.6 + pulse * 0.4})`;
    ctx.beginPath(); ctx.ellipse(x, y - r * 0.15, r * 0.25, r * 0.10, 0, 0, Math.PI * 2); ctx.fill();
    // Targeting dot
    ctx.fillStyle = '#FF0000';
    ctx.beginPath(); ctx.arc(x, y - r * 0.15, 2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ── Medic Guard — Healer ──────────────────────────────────────────────────
  _renderMedic(ctx, x, y, r, pulse) {
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x + 2, y + r * 0.8, r * 0.9, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();

    // Healing aura — soft cyan rings
    ctx.strokeStyle = `rgba(68,255,238,${0.15 + pulse * 0.15})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r + 5 + pulse * 4, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(68,255,238,${0.08 + pulse * 0.08})`;
    ctx.beginPath(); ctx.arc(x, y, r + 12 + pulse * 6, 0, Math.PI * 2); ctx.stroke();

    // Body — white/cyan medical suit
    const bodyGrd = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
    bodyGrd.addColorStop(0, '#FFFFFF');
    bodyGrd.addColorStop(0.3, '#AAFFEE');
    bodyGrd.addColorStop(0.65, '#55DDCC');
    bodyGrd.addColorStop(1, '#228877');
    ctx.fillStyle = bodyGrd;
    ctx.shadowColor = '#44FFEE'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

    // Medical cross
    ctx.fillStyle = '#FF4444';
    ctx.fillRect(x - r * 0.12, y - r * 0.4, r * 0.24, r * 0.8);
    ctx.fillRect(x - r * 0.4, y - r * 0.12, r * 0.8, r * 0.24);
    // Cross outline
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - r * 0.12, y - r * 0.4, r * 0.24, r * 0.8);
    ctx.strokeRect(x - r * 0.4, y - r * 0.12, r * 0.8, r * 0.24);

    // Friendly eyes
    ctx.fillStyle = '#003333';
    ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.25, r * 0.15, r * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r * 0.25, y - r * 0.25, r * 0.15, r * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(68,255,238,${0.8 + pulse * 0.2})`;
    ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.25, y - r * 0.25, r * 0.08, 0, Math.PI * 2); ctx.fill();

    // Floating heal particles
    for (let i = 0; i < 4; i++) {
      const pa = this._t * 2 + i * Math.PI / 2;
      const px = x + Math.cos(pa) * (r + 8);
      const py = y + Math.sin(pa) * (r + 8) - pulse * 5;
      ctx.fillStyle = `rgba(68,255,238,${0.4 + pulse * 0.3})`;
      ctx.font = 'bold 8px monospace';
      ctx.fillText('+', px - 3, py + 3);
    }
    ctx.shadowBlur = 0;
  }

  // ── Ghost Guard — Stealth ─────────────────────────────────────────────────
  _renderGhost(ctx, x, y, r, pulse) {
    // Ethereal shadow
    ctx.fillStyle = 'rgba(100,50,150,0.25)';
    ctx.beginPath(); ctx.ellipse(x + 3, y + r * 0.6, r * 1.0, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();

    // Ghost trails
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#CC88FF';
    ctx.beginPath(); ctx.arc(x - 8, y + 2, r * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.08;
    ctx.beginPath(); ctx.arc(x - 14, y + 4, r * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Spectral aura
    ctx.strokeStyle = `rgba(200,136,255,${0.25 + pulse * 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r + 6 + pulse * 4, 0, Math.PI * 2); ctx.stroke();

    // Body — semi-transparent purple ghost
    const bodyGrd = ctx.createRadialGradient(x - r * 0.2, y - r * 0.3, 0, x, y, r);
    bodyGrd.addColorStop(0, 'rgba(238,200,255,0.9)');
    bodyGrd.addColorStop(0.4, 'rgba(200,136,255,0.75)');
    bodyGrd.addColorStop(0.75, 'rgba(150,80,200,0.6)');
    bodyGrd.addColorStop(1, 'rgba(80,40,120,0.4)');
    ctx.fillStyle = bodyGrd;
    ctx.shadowColor = '#CC88FF'; ctx.shadowBlur = 25;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

    // Wavy ghost bottom
    ctx.fillStyle = 'rgba(200,136,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(x - r, y + r * 0.3);
    for (let i = 0; i <= 6; i++) {
      const wx = x - r + (i / 6) * r * 2;
      const wy = y + r * 0.5 + Math.sin(this._t * 4 + i) * r * 0.2;
      ctx.lineTo(wx, wy);
    }
    ctx.lineTo(x + r, y + r * 0.3);
    ctx.closePath();
    ctx.fill();

    // Glowing eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.15, r * 0.15, r * 0.20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r * 0.25, y - r * 0.15, r * 0.15, r * 0.20, 0, 0, Math.PI * 2); ctx.fill();
    // Eye pupils
    ctx.fillStyle = '#8844CC';
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.1, r * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.25, y - r * 0.1, r * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Helper: Draw a star shape
  _drawStar(ctx, cx, cy, spikes, outerR, innerR) {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
    ctx.fill();
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
  constructor(x, y, color = '#FFAA55', label = 'DEALER', mapType = false) {
    this.x = x; this.y = y; this.color = color; this.label = label; this.radius = 16;
    // mapType can be: true (neonCity), 'galactica', 'wasteland', 'snow', 'desert', or false (default)
    this.isNeonCity = mapType === true || mapType === 'neonCity';
    this.isGalactica = mapType === 'galactica';
    this.isWasteland = mapType === 'wasteland';
    this.isSnow = mapType === 'snow';
    this.isDesert = mapType === 'desert';
    this._waveT = 0;
  }
  update(dt) { this._waveT += dt * 1.4; }
  render(ctx) {
    const sway = Math.sin(this._waveT) * 2;
    ctx.save();
    ctx.translate(this.x + sway, this.y);

    if (this.isWasteland) {
      // ═══ WASTELAND: Grizzled mechanic in work clothes ═══
      const breathe = Math.sin(this._waveT * 0.8) * 1;

      // Shadow
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(2, 4, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Legs (worn work pants)
      ctx.fillStyle = '#3a3530';
      ctx.fillRect(-6, -8, 5, 12);
      ctx.fillRect(1, -8, 5, 12);

      // Boots (heavy work boots)
      ctx.fillStyle = '#2a2420';
      ctx.fillRect(-8, 2, 7, 5);
      ctx.fillRect(1, 2, 7, 5);
      // Boot details
      ctx.fillStyle = '#4a4038';
      ctx.fillRect(-7, 2, 5, 2);
      ctx.fillRect(2, 2, 5, 2);

      // Body (worn mechanic jumpsuit)
      const suitGrad = ctx.createLinearGradient(-12, -38, 12, -10);
      suitGrad.addColorStop(0, '#5a5048');
      suitGrad.addColorStop(0.5, '#4a4238');
      suitGrad.addColorStop(1, '#3a3530');
      ctx.fillStyle = suitGrad;
      ctx.beginPath();
      ctx.moveTo(-11, -10);
      ctx.lineTo(-13, -38 + breathe);
      ctx.lineTo(-8, -42 + breathe);
      ctx.lineTo(8, -42 + breathe);
      ctx.lineTo(13, -38 + breathe);
      ctx.lineTo(11, -10);
      ctx.closePath();
      ctx.fill();

      // Oil stains on jumpsuit
      ctx.fillStyle = 'rgba(30,20,10,0.4)';
      ctx.beginPath();
      ctx.ellipse(-5, -25 + breathe, 4, 3, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(7, -18 + breathe, 3, 4, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Collar (dirty undershirt)
      ctx.fillStyle = '#8a8078';
      ctx.beginPath();
      ctx.moveTo(-5, -40 + breathe);
      ctx.lineTo(0, -37 + breathe);
      ctx.lineTo(5, -40 + breathe);
      ctx.lineTo(4, -42 + breathe);
      ctx.lineTo(-4, -42 + breathe);
      ctx.closePath();
      ctx.fill();

      // Neck (weathered skin)
      ctx.fillStyle = '#C4A090';
      ctx.fillRect(-3, -46 + breathe, 6, 6);

      // Head (weathered, rugged)
      const headGrad = ctx.createRadialGradient(-3, -54 + breathe, 2, 0, -52 + breathe, 12);
      headGrad.addColorStop(0, '#D4B8A0');
      headGrad.addColorStop(1, '#B49880');
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.ellipse(0, -54 + breathe, 10, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stubble/beard shadow
      ctx.fillStyle = 'rgba(60,50,40,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, -48 + breathe, 7, 5, 0, 0, Math.PI);
      ctx.fill();

      // Hair (messy, graying)
      ctx.fillStyle = '#4a4540';
      ctx.beginPath();
      ctx.ellipse(0, -62 + breathe, 9, 5, 0, Math.PI, 0);
      ctx.fill();
      // Messy strands
      ctx.fillStyle = '#5a5550';
      ctx.beginPath();
      ctx.moveTo(-8, -60 + breathe);
      ctx.quadraticCurveTo(-11, -56 + breathe, -9, -52 + breathe);
      ctx.lineTo(-7, -58 + breathe);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(7, -61 + breathe);
      ctx.quadraticCurveTo(10, -55 + breathe, 8, -51 + breathe);
      ctx.lineTo(6, -58 + breathe);
      ctx.fill();

      // Eyes (tired but sharp)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(-4, -54 + breathe, 2.5, 1.8, 0, 0, Math.PI * 2);
      ctx.ellipse(4, -54 + breathe, 2.5, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a3020';
      ctx.beginPath();
      ctx.arc(-4, -54 + breathe, 1.2, 0, Math.PI * 2);
      ctx.arc(4, -54 + breathe, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Slight frown/serious expression
      ctx.strokeStyle = '#8a6655';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-3, -48 + breathe);
      ctx.lineTo(3, -48 + breathe);
      ctx.stroke();

      // Arms (muscular, work-worn)
      ctx.fillStyle = '#4a4238';
      ctx.beginPath();
      ctx.moveTo(-13, -36 + breathe);
      ctx.lineTo(-17, -20);
      ctx.lineTo(-15, -10);
      ctx.lineTo(-11, -10);
      ctx.lineTo(-11, -34 + breathe);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(13, -36 + breathe);
      ctx.lineTo(17, -20);
      ctx.lineTo(15, -10);
      ctx.lineTo(11, -10);
      ctx.lineTo(11, -34 + breathe);
      ctx.closePath();
      ctx.fill();

      // Hands (calloused)
      ctx.fillStyle = '#C4A090';
      ctx.beginPath();
      ctx.arc(-16, -8, 4, 0, Math.PI * 2);
      ctx.arc(16, -8, 4, 0, Math.PI * 2);
      ctx.fill();

      // Wrench in hand
      ctx.fillStyle = '#6a6a68';
      ctx.fillRect(-20, -12, 8, 3);
      ctx.fillStyle = '#5a5a58';
      ctx.fillRect(-22, -14, 4, 7);

      // Name patch on chest
      ctx.fillStyle = '#6a5a48';
      ctx.fillRect(-16, -32 + breathe, 16, 9);
      ctx.fillStyle = '#3a3028';
      ctx.fillRect(-15, -31 + breathe, 14, 7);
      ctx.fillStyle = '#a09080';
      ctx.font = 'bold 5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('MECH', -8, -26 + breathe);

      // Label above head
      ctx.fillStyle = '#c0a080';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.label, 0, -76 + breathe);

    } else if (this.isNeonCity) {
      // ═══ NEON CITY: Professional cyber salesperson ═══
      const breathe = Math.sin(this._waveT * 0.8) * 1;

      // Shadow
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(2, 4, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Legs (dark pants)
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(-6, -8, 5, 12);
      ctx.fillRect(1, -8, 5, 12);

      // Shoes
      ctx.fillStyle = '#0a0a14';
      ctx.fillRect(-7, 2, 6, 4);
      ctx.fillRect(1, 2, 6, 4);

      // Body (fitted suit jacket)
      const suitGrad = ctx.createLinearGradient(-12, -38, 12, -10);
      suitGrad.addColorStop(0, '#2a2a3e');
      suitGrad.addColorStop(0.5, '#1e1e2e');
      suitGrad.addColorStop(1, '#14141e');
      ctx.fillStyle = suitGrad;
      ctx.beginPath();
      ctx.moveTo(-11, -10);
      ctx.lineTo(-13, -38 + breathe);
      ctx.lineTo(-8, -42 + breathe);
      ctx.lineTo(8, -42 + breathe);
      ctx.lineTo(13, -38 + breathe);
      ctx.lineTo(11, -10);
      ctx.closePath();
      ctx.fill();

      // Suit lapels
      ctx.strokeStyle = '#00FFFF';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(-4, -38 + breathe);
      ctx.lineTo(-6, -20);
      ctx.moveTo(4, -38 + breathe);
      ctx.lineTo(6, -20);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Tie (cyan neon)
      ctx.fillStyle = '#00FFFF';
      ctx.shadowColor = '#00FFFF';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(0, -38 + breathe);
      ctx.lineTo(-3, -34 + breathe);
      ctx.lineTo(0, -12);
      ctx.lineTo(3, -34 + breathe);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Shirt collar
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-5, -40 + breathe);
      ctx.lineTo(0, -37 + breathe);
      ctx.lineTo(5, -40 + breathe);
      ctx.lineTo(4, -42 + breathe);
      ctx.lineTo(-4, -42 + breathe);
      ctx.closePath();
      ctx.fill();

      // Neck
      ctx.fillStyle = '#E8D0C0';
      ctx.fillRect(-3, -46 + breathe, 6, 6);

      // Head
      const headGrad = ctx.createRadialGradient(-3, -54 + breathe, 2, 0, -52 + breathe, 12);
      headGrad.addColorStop(0, '#F5E0D0');
      headGrad.addColorStop(1, '#D4B8A8');
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.ellipse(0, -54 + breathe, 10, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hair (styled, dark)
      ctx.fillStyle = '#1a1a24';
      ctx.beginPath();
      ctx.ellipse(0, -62 + breathe, 9, 6, 0, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-9, -58 + breathe);
      ctx.quadraticCurveTo(-10, -52 + breathe, -8, -50 + breathe);
      ctx.lineTo(-8, -58 + breathe);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(9, -58 + breathe);
      ctx.quadraticCurveTo(10, -52 + breathe, 8, -50 + breathe);
      ctx.lineTo(8, -58 + breathe);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(-4, -54 + breathe, 2.5, 2, 0, 0, Math.PI * 2);
      ctx.ellipse(4, -54 + breathe, 2.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#224466';
      ctx.beginPath();
      ctx.arc(-4, -54 + breathe, 1.2, 0, Math.PI * 2);
      ctx.arc(4, -54 + breathe, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Friendly smile
      ctx.strokeStyle = '#AA7766';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, -50 + breathe, 4, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Arms (at sides, professional stance)
      ctx.fillStyle = '#1e1e2e';
      ctx.beginPath();
      ctx.moveTo(-13, -36 + breathe);
      ctx.lineTo(-16, -20);
      ctx.lineTo(-14, -10);
      ctx.lineTo(-11, -10);
      ctx.lineTo(-11, -34 + breathe);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(13, -36 + breathe);
      ctx.lineTo(16, -20);
      ctx.lineTo(14, -10);
      ctx.lineTo(11, -10);
      ctx.lineTo(11, -34 + breathe);
      ctx.closePath();
      ctx.fill();

      // Hands
      ctx.fillStyle = '#E8D0C0';
      ctx.beginPath();
      ctx.arc(-15, -8, 4, 0, Math.PI * 2);
      ctx.arc(15, -8, 4, 0, Math.PI * 2);
      ctx.fill();

      // Name badge on chest
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(-16, -32 + breathe, 14, 8);
      ctx.fillStyle = '#00FFFF';
      ctx.font = 'bold 5px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('REP', -9, -26 + breathe);

      // Label above head
      ctx.fillStyle = '#00FFFF';
      ctx.shadowColor = '#00FFFF';
      ctx.shadowBlur = 10;
      ctx.font = 'bold 8px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.label, 0, -76 + breathe);
      ctx.shadowBlur = 0;

    } else if (this.isGalactica) {
      // ═══ GALACTICA: Cosmic agent in deep-space dress suit ═══
      const breathe = Math.sin(this._waveT * 0.8) * 1;

      // Shadow
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(2, 4, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Legs (dark cosmic pants)
      ctx.fillStyle = '#0d0020';
      ctx.fillRect(-6, -8, 5, 12);
      ctx.fillRect(1, -8, 5, 12);

      // Space boots with gold trim
      ctx.fillStyle = '#07001a';
      ctx.fillRect(-7, 2, 6, 5);
      ctx.fillRect(1, 2, 6, 5);
      ctx.fillStyle = '#FFDD44';
      ctx.fillRect(-7, 2, 6, 1.5);
      ctx.fillRect(1, 2, 6, 1.5);

      // Body (fitted space-suit jacket — deep indigo with purple sheen)
      const suitGrad = ctx.createLinearGradient(-12, -38, 12, -10);
      suitGrad.addColorStop(0, '#2a0050');
      suitGrad.addColorStop(0.5, '#1a0038');
      suitGrad.addColorStop(1, '#0e0020');
      ctx.fillStyle = suitGrad;
      ctx.beginPath();
      ctx.moveTo(-11, -10);
      ctx.lineTo(-13, -38 + breathe);
      ctx.lineTo(-8, -42 + breathe);
      ctx.lineTo(8, -42 + breathe);
      ctx.lineTo(13, -38 + breathe);
      ctx.lineTo(11, -10);
      ctx.closePath();
      ctx.fill();

      // Suit lapels with gold edge
      ctx.strokeStyle = '#FFDD44';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(-4, -38 + breathe);
      ctx.lineTo(-6, -20);
      ctx.moveTo(4, -38 + breathe);
      ctx.lineTo(6, -20);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Gold cosmic tie
      ctx.fillStyle = '#FFDD44';
      ctx.shadowColor = '#FFDD44';
      ctx.shadowBlur = 7;
      ctx.beginPath();
      ctx.moveTo(0, -38 + breathe);
      ctx.lineTo(-3, -34 + breathe);
      ctx.lineTo(0, -12);
      ctx.lineTo(3, -34 + breathe);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Shirt collar (white)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-5, -40 + breathe);
      ctx.lineTo(0, -37 + breathe);
      ctx.lineTo(5, -40 + breathe);
      ctx.lineTo(4, -42 + breathe);
      ctx.lineTo(-4, -42 + breathe);
      ctx.closePath();
      ctx.fill();

      // Neck
      ctx.fillStyle = '#E8D0C0';
      ctx.fillRect(-3, -46 + breathe, 6, 6);

      // Head
      const headGrad = ctx.createRadialGradient(-3, -54 + breathe, 2, 0, -52 + breathe, 12);
      headGrad.addColorStop(0, '#F0DDD0');
      headGrad.addColorStop(1, '#D0B8A8');
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.ellipse(0, -54 + breathe, 10, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hair (dark with purple tint)
      ctx.fillStyle = '#0d0022';
      ctx.beginPath();
      ctx.ellipse(0, -62 + breathe, 9, 6, 0, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-9, -58 + breathe);
      ctx.quadraticCurveTo(-10, -52 + breathe, -8, -50 + breathe);
      ctx.lineTo(-8, -58 + breathe);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(9, -58 + breathe);
      ctx.quadraticCurveTo(10, -52 + breathe, 8, -50 + breathe);
      ctx.lineTo(8, -58 + breathe);
      ctx.fill();

      // Eyes with glowing violet iris
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(-4, -54 + breathe, 2.5, 2, 0, 0, Math.PI * 2);
      ctx.ellipse(4, -54 + breathe, 2.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#CC66FF';
      ctx.shadowColor = '#AA44FF';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(-4, -54 + breathe, 1.3, 0, Math.PI * 2);
      ctx.arc(4, -54 + breathe, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(-4, -54 + breathe, 0.5, 0, Math.PI * 2);
      ctx.arc(4, -54 + breathe, 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Friendly smile
      ctx.strokeStyle = '#AA7766';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, -50 + breathe, 4, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Arms (professional stance)
      ctx.fillStyle = '#1a0038';
      ctx.beginPath();
      ctx.moveTo(-13, -36 + breathe);
      ctx.lineTo(-16, -20);
      ctx.lineTo(-14, -10);
      ctx.lineTo(-11, -10);
      ctx.lineTo(-11, -34 + breathe);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(13, -36 + breathe);
      ctx.lineTo(16, -20);
      ctx.lineTo(14, -10);
      ctx.lineTo(11, -10);
      ctx.lineTo(11, -34 + breathe);
      ctx.closePath();
      ctx.fill();

      // Hands
      ctx.fillStyle = '#E8D0C0';
      ctx.beginPath();
      ctx.arc(-15, -8, 4, 0, Math.PI * 2);
      ctx.arc(15, -8, 4, 0, Math.PI * 2);
      ctx.fill();

      // Chest badge (cosmic emblem)
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(-16, -32 + breathe, 14, 8);
      ctx.fillStyle = '#FFDD44';
      ctx.shadowColor = '#FFAA00';
      ctx.shadowBlur = 4;
      ctx.font = 'bold 5px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('STAR', -9, -26 + breathe);
      ctx.shadowBlur = 0;

      // Star-pip shoulder rank (gold)
      ctx.fillStyle = '#FFDD44';
      ctx.shadowColor = '#FFAA00';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(-10, -40 + breathe, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-14, -38 + breathe, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Label above head
      ctx.fillStyle = '#CC99FF';
      ctx.shadowColor = '#AA66FF';
      ctx.shadowBlur = 12;
      ctx.font = 'bold 8px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.label, 0, -76 + breathe);
      ctx.shadowBlur = 0;

    } else if (this.isSnow) {
      // ═══ FROZEN TUNDRA: Winter-dressed salesperson ═══
      const breathe = Math.sin(this._waveT * 0.8) * 1;

      // Shadow
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(2, 4, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Legs (warm winter pants)
      ctx.fillStyle = '#2a3a4a';
      ctx.fillRect(-6, -8, 5, 12);
      ctx.fillRect(1, -8, 5, 12);

      // Winter boots (insulated, furry top)
      ctx.fillStyle = '#1a2530';
      ctx.fillRect(-8, 2, 7, 6);
      ctx.fillRect(1, 2, 7, 6);
      // Fur trim on boots
      ctx.fillStyle = '#CCDDEE';
      ctx.fillRect(-8, 1, 7, 3);
      ctx.fillRect(1, 1, 7, 3);

      // Body (thick winter parka)
      const parkaGrad = ctx.createLinearGradient(-14, -42, 14, -8);
      parkaGrad.addColorStop(0, '#3a5a7a');
      parkaGrad.addColorStop(0.5, '#2a4a6a');
      parkaGrad.addColorStop(1, '#1a3a5a');
      ctx.fillStyle = parkaGrad;
      ctx.beginPath();
      ctx.moveTo(-13, -8);
      ctx.lineTo(-15, -38 + breathe);
      ctx.lineTo(-10, -44 + breathe);
      ctx.lineTo(10, -44 + breathe);
      ctx.lineTo(15, -38 + breathe);
      ctx.lineTo(13, -8);
      ctx.closePath();
      ctx.fill();

      // Parka fur-lined hood (down)
      ctx.fillStyle = '#DDEEFF';
      ctx.beginPath();
      ctx.ellipse(0, -44 + breathe, 12, 5, 0, Math.PI, 0);
      ctx.fill();

      // Parka zipper
      ctx.fillStyle = '#88AACC';
      ctx.fillRect(-1, -42 + breathe, 2, 34);
      // Zipper teeth
      ctx.fillStyle = '#AACCDD';
      for (let z = 0; z < 8; z++) {
        ctx.fillRect(-2, -40 + z * 4 + breathe, 4, 2);
      }

      // Fur collar
      ctx.fillStyle = '#EEFFFF';
      ctx.beginPath();
      ctx.ellipse(0, -42 + breathe, 10, 4, 0, 0, Math.PI);
      ctx.fill();

      // Neck (warm scarf showing)
      ctx.fillStyle = '#88BBDD';
      ctx.fillRect(-4, -48 + breathe, 8, 6);

      // Head
      const headGrad = ctx.createRadialGradient(-2, -56 + breathe, 2, 0, -54 + breathe, 11);
      headGrad.addColorStop(0, '#FFDDCC');
      headGrad.addColorStop(1, '#E8C8B8');
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.ellipse(0, -56 + breathe, 10, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rosy cheeks (cold weather)
      ctx.fillStyle = 'rgba(255,150,150,0.35)';
      ctx.beginPath();
      ctx.ellipse(-6, -53 + breathe, 3, 2, 0, 0, Math.PI * 2);
      ctx.ellipse(6, -53 + breathe, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Winter hat (beanie)
      ctx.fillStyle = '#4477AA';
      ctx.beginPath();
      ctx.ellipse(0, -64 + breathe, 11, 6, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-11, -64 + breathe, 22, 6);
      // Hat fold
      ctx.fillStyle = '#5588BB';
      ctx.fillRect(-10, -60 + breathe, 20, 3);
      // Pom pom
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, -70 + breathe, 4, 0, Math.PI * 2);
      ctx.fill();

      // Eyes (friendly)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(-4, -56 + breathe, 2.5, 2, 0, 0, Math.PI * 2);
      ctx.ellipse(4, -56 + breathe, 2.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3355AA';
      ctx.beginPath();
      ctx.arc(-4, -56 + breathe, 1.3, 0, Math.PI * 2);
      ctx.arc(4, -56 + breathe, 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Friendly smile
      ctx.strokeStyle = '#AA7766';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, -52 + breathe, 4, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Arms (thick parka sleeves)
      ctx.fillStyle = '#2a4a6a';
      ctx.beginPath();
      ctx.moveTo(-15, -38 + breathe);
      ctx.lineTo(-18, -22);
      ctx.lineTo(-16, -10);
      ctx.lineTo(-12, -10);
      ctx.lineTo(-13, -36 + breathe);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(15, -38 + breathe);
      ctx.lineTo(18, -22);
      ctx.lineTo(16, -10);
      ctx.lineTo(12, -10);
      ctx.lineTo(13, -36 + breathe);
      ctx.closePath();
      ctx.fill();

      // Winter gloves
      ctx.fillStyle = '#4488BB';
      ctx.beginPath();
      ctx.arc(-17, -8, 5, 0, Math.PI * 2);
      ctx.arc(17, -8, 5, 0, Math.PI * 2);
      ctx.fill();

      // Clipboard in hand
      ctx.fillStyle = '#2a3a4a';
      ctx.fillRect(-22, -16, 10, 14);
      ctx.fillStyle = '#EEFFFF';
      ctx.fillRect(-21, -15, 8, 11);
      ctx.fillStyle = '#88AACC';
      ctx.fillRect(-20, -13, 6, 1);
      ctx.fillRect(-20, -10, 6, 1);
      ctx.fillRect(-20, -7, 4, 1);

      // Name badge
      ctx.fillStyle = '#3a5a7a';
      ctx.fillRect(4, -34 + breathe, 14, 10);
      ctx.fillStyle = '#EEFFFF';
      ctx.fillRect(5, -33 + breathe, 12, 8);
      ctx.fillStyle = '#2a4a6a';
      ctx.font = 'bold 4px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('FROST', 11, -27 + breathe);

      // Label above head
      ctx.fillStyle = '#AADDFF';
      ctx.shadowColor = '#66BBFF';
      ctx.shadowBlur = 10;
      ctx.font = 'bold 8px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.label, 0, -82 + breathe);
      ctx.shadowBlur = 0;

    } else if (this.isDesert) {
      // ═══ DESERT SANDS: Egyptian gold-robed Trade Master ═══
      // Neon City structure with Egyptian/amber palette
      const breathe = Math.sin(this._waveT * 0.8) * 1;

      // Shadow
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(2, 4, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Legs (linen/cream sandals)
      ctx.fillStyle = '#c8b080';
      ctx.fillRect(-6, -8, 5, 12);
      ctx.fillRect(1, -8, 5, 12);

      // Sandals
      ctx.fillStyle = '#8a6030';
      ctx.fillRect(-7, 2, 6, 4);
      ctx.fillRect(1, 2, 6, 4);
      // Sandal straps
      ctx.strokeStyle = '#6a4010'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-6, 3); ctx.lineTo(-4, 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2, 3); ctx.lineTo(4, 5); ctx.stroke();

      // Body (linen robe with gold trim)
      const robeGrad = ctx.createLinearGradient(-12, -38, 12, -10);
      robeGrad.addColorStop(0, '#e8d8a8');
      robeGrad.addColorStop(0.5, '#dcc890');
      robeGrad.addColorStop(1, '#c8b070');
      ctx.fillStyle = robeGrad;
      ctx.beginPath();
      ctx.moveTo(-11, -10);
      ctx.lineTo(-13, -38 + breathe);
      ctx.lineTo(-8, -42 + breathe);
      ctx.lineTo(8, -42 + breathe);
      ctx.lineTo(13, -38 + breathe);
      ctx.lineTo(11, -10);
      ctx.closePath();
      ctx.fill();

      // Gold trim stripes on robe (Neon City lapel style but golden)
      ctx.strokeStyle = '#FFD060';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(-4, -38 + breathe); ctx.lineTo(-6, -20);
      ctx.moveTo(4, -38 + breathe); ctx.lineTo(6, -20);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Gold pectoral collar (replaces tie)
      ctx.fillStyle = '#FFD060';
      ctx.shadowColor = '#FFD060'; ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(0, -38 + breathe, 8, Math.PI * 0.1, Math.PI * 0.9);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      // Collar detail lines
      ctx.strokeStyle = '#FF9900'; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.6;
      for (let ci = 0; ci < 3; ci++) {
        ctx.beginPath();
        ctx.arc(0, -38 + breathe, 5 + ci * 1.5, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Collar/neckline
      ctx.fillStyle = '#F0E8D0';
      ctx.beginPath();
      ctx.moveTo(-5, -40 + breathe);
      ctx.lineTo(0, -37 + breathe);
      ctx.lineTo(5, -40 + breathe);
      ctx.lineTo(4, -42 + breathe);
      ctx.lineTo(-4, -42 + breathe);
      ctx.closePath(); ctx.fill();

      // Neck (warm Egyptian skin tone)
      ctx.fillStyle = '#A0682A';
      ctx.fillRect(-3, -46 + breathe, 6, 6);

      // Head
      const headGrad = ctx.createRadialGradient(-3, -54 + breathe, 2, 0, -52 + breathe, 12);
      headGrad.addColorStop(0, '#B87832');
      headGrad.addColorStop(1, '#8a5820');
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.ellipse(0, -54 + breathe, 10, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Nemes headdress (blue + gold stripes, like Neon City's styled hair)
      ctx.fillStyle = '#1050AA';
      ctx.beginPath();
      ctx.ellipse(0, -62 + breathe, 9.5, 6, 0, Math.PI, 0);
      ctx.fill();
      // Side panels of nemes
      ctx.beginPath();
      ctx.moveTo(-9, -58 + breathe); ctx.lineTo(-14, -42 + breathe); ctx.lineTo(-8, -58 + breathe); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(9, -58 + breathe); ctx.lineTo(14, -42 + breathe); ctx.lineTo(8, -58 + breathe); ctx.fill();
      // Gold stripe on headdress
      ctx.strokeStyle = '#FFD060'; ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;
      for (let hs = 0; hs < 3; hs++) {
        ctx.beginPath(); ctx.moveTo(-8 - hs * 1.2, -55 + breathe + hs * 4); ctx.lineTo(-13 - hs * 0.4, -44 + breathe); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(8 + hs * 1.2, -55 + breathe + hs * 4); ctx.lineTo(13 + hs * 0.4, -44 + breathe); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Kohl-lined eyes
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(-4, -54 + breathe, 2.5, 2, 0, 0, Math.PI * 2);
      ctx.ellipse(4, -54 + breathe, 2.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a0a00';
      ctx.beginPath();
      ctx.arc(-4, -54 + breathe, 1.2, 0, Math.PI * 2);
      ctx.arc(4, -54 + breathe, 1.2, 0, Math.PI * 2);
      ctx.fill();
      // Eye liner (kohl)
      ctx.strokeStyle = '#1a0a00'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-7, -54 + breathe); ctx.lineTo(-2, -54 + breathe); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2, -54 + breathe); ctx.lineTo(7, -54 + breathe); ctx.stroke();

      // Slight smile
      ctx.strokeStyle = '#6a4020'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, -50 + breathe, 4, 0.2, Math.PI - 0.2); ctx.stroke();

      // Arms (robe sleeves)
      ctx.fillStyle = '#dcc890';
      ctx.beginPath();
      ctx.moveTo(-13, -36 + breathe); ctx.lineTo(-16, -20); ctx.lineTo(-14, -10); ctx.lineTo(-11, -10); ctx.lineTo(-11, -34 + breathe); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(13, -36 + breathe); ctx.lineTo(16, -20); ctx.lineTo(14, -10); ctx.lineTo(11, -10); ctx.lineTo(11, -34 + breathe); ctx.closePath(); ctx.fill();

      // Hands (skin tone)
      ctx.fillStyle = '#A0682A';
      ctx.beginPath();
      ctx.arc(-15, -8, 4, 0, Math.PI * 2);
      ctx.arc(15, -8, 4, 0, Math.PI * 2);
      ctx.fill();

      // Name badge / cartouche on chest
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-16, -32 + breathe, 14, 8);
      ctx.fillStyle = '#FFD060';
      ctx.font = 'bold 5px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('MASTER', -9, -26 + breathe);

      // Label above head
      ctx.fillStyle = '#FFD060';
      ctx.shadowColor = '#FF9900'; ctx.shadowBlur = 10;
      ctx.font = 'bold 8px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.label, 0, -76 + breathe);
      ctx.shadowBlur = 0;

    } else {
      // ═══ DEFAULT: Simple salesperson ═══
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.roundRect(-10, -26, 20, 24, 3);
      ctx.fill();
      ctx.fillStyle = '#FFDDBB';
      ctx.beginPath();
      ctx.arc(0, -34, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 6;
      ctx.font = 'bold 7px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.label, 0, -50);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}

// ─── BuildingNPC ─────────────────────────────────────────────────────────────
// Interactive NPC that appears inside buildings. Unique per building type.
class BuildingNPC {
  constructor(x, y, buildingType, renderType = false, isGirl = false) {
    const cfg        = CONFIG.BUILDING_INTERACTIONS[buildingType] || CONFIG.BUILDING_INTERACTIONS[0];
    this.x = x; this.y = y;
    this.radius      = 18;
    this.color       = cfg.npcColor;
    this.name        = cfg.npcName;
    this.dialogue    = cfg.dialogue;
    this._waveT      = 0;
    this._interactR  = 65;
    // renderType can be: true (neonCity for backwards compat), 'wasteland', or false (default)
    this._isNeonCity = renderType === true || renderType === 'neonCity';
    this._isWasteland = renderType === 'wasteland';
    this._isGirl     = isGirl;
    this._buildingType = buildingType;
  }

  update(dt) { this._waveT += dt * 1.2; }

  render(ctx) {
    if (this._hidden) return;
    if (this._isGirl) {
      this._renderGirl(ctx);
    } else if (this._isWasteland) {
      this._renderWasteland(ctx);
    } else if (this._isNeonCity) {
      this._renderNeonCity(ctx);
    } else {
      this._renderDefault(ctx);
    }
  }

  _renderWasteland(ctx) {
    const t = performance.now() / 1000;
    const breathe = Math.sin(t * 1.5) * 1;
    const sway = Math.sin(this._waveT) * 1.2;

    ctx.save();
    ctx.translate(this.x + sway, this.y);

    // ═══ WASTELAND NPC RENDERING (Rugged trader/worker) ═══

    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(3, 28, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Legs (worn cargo pants)
    ctx.fillStyle = '#3a3530';
    ctx.fillRect(-8, 12, 6, 16);
    ctx.fillRect(2, 12, 6, 16);

    // Boots (heavy work boots)
    ctx.fillStyle = '#2a2420';
    ctx.fillRect(-9, 26, 8, 5);
    ctx.fillRect(1, 26, 8, 5);
    // Boot straps
    ctx.fillStyle = '#4a4038';
    ctx.fillRect(-8, 27, 6, 2);
    ctx.fillRect(2, 27, 6, 2);

    // Body/Torso (worn work vest over dirty shirt)
    const bodyGrad = ctx.createLinearGradient(-12, -8, 12, 14);
    bodyGrad.addColorStop(0, '#5a5048');
    bodyGrad.addColorStop(0.5, '#4a4238');
    bodyGrad.addColorStop(1, '#3a3530');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(-12, -8 + breathe * 0.3, 24, 22, 3);
    ctx.fill();

    // Vest/jacket opening
    ctx.fillStyle = '#6a6058';
    ctx.beginPath();
    ctx.moveTo(-3, -6 + breathe * 0.3);
    ctx.lineTo(0, 12 + breathe * 0.3);
    ctx.lineTo(3, -6 + breathe * 0.3);
    ctx.closePath();
    ctx.fill();

    // Undershirt visible
    ctx.fillStyle = '#8a8078';
    ctx.beginPath();
    ctx.moveTo(-3, -6 + breathe * 0.3);
    ctx.lineTo(0, 4 + breathe * 0.3);
    ctx.lineTo(3, -6 + breathe * 0.3);
    ctx.closePath();
    ctx.fill();

    // Stains on clothes
    ctx.fillStyle = 'rgba(40,30,20,0.3)';
    ctx.beginPath();
    ctx.ellipse(-6, 4 + breathe * 0.3, 4, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(8, 8 + breathe * 0.3, 3, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    ctx.fillStyle = '#4a4238';
    ctx.fillRect(-16, -4 + breathe * 0.3, 5, 14);
    ctx.fillRect(11, -4 + breathe * 0.3, 5, 14);

    // Hands (calloused)
    ctx.fillStyle = '#C4A090';
    ctx.beginPath();
    ctx.arc(-13.5, 12 + breathe * 0.3, 3, 0, Math.PI * 2);
    ctx.arc(13.5, 12 + breathe * 0.3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Neck (weathered skin)
    ctx.fillStyle = '#C4A090';
    ctx.fillRect(-3, -12, 6, 6);

    // Head (rugged, weathered)
    const headGrad = ctx.createRadialGradient(-2, -20 + breathe * 0.2, 2, 0, -18 + breathe * 0.2, 11);
    headGrad.addColorStop(0, '#D4B8A0');
    headGrad.addColorStop(1, '#B49880');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.ellipse(0, -20 + breathe * 0.2, 10, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stubble/beard
    ctx.fillStyle = 'rgba(60,50,40,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, -14 + breathe * 0.2, 7, 5, 0, 0, Math.PI);
    ctx.fill();

    // Hair (messy, graying)
    ctx.fillStyle = '#4a4540';
    ctx.beginPath();
    ctx.ellipse(0, -28 + breathe * 0.2, 9, 5, 0, Math.PI, 0);
    ctx.fill();
    // Messy strands
    ctx.fillStyle = '#5a5550';
    ctx.beginPath();
    ctx.moveTo(-9, -26 + breathe * 0.2);
    ctx.quadraticCurveTo(-11, -22 + breathe * 0.2, -8, -18 + breathe * 0.2);
    ctx.lineTo(-7, -24 + breathe * 0.2);
    ctx.fill();

    // Eyes (tired but alert)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(-4, -20 + breathe * 0.2, 2.5, 1.8, 0, 0, Math.PI * 2);
    ctx.ellipse(4, -20 + breathe * 0.2, 2.5, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a3020';
    ctx.beginPath();
    ctx.arc(-4, -20 + breathe * 0.2, 1.2, 0, Math.PI * 2);
    ctx.arc(4, -20 + breathe * 0.2, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Serious expression
    ctx.strokeStyle = '#8a6655';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-3, -14 + breathe * 0.2);
    ctx.lineTo(3, -14 + breathe * 0.2);
    ctx.stroke();

    // Name badge (worn metal)
    ctx.fillStyle = '#5a5048';
    ctx.fillRect(-15, -2 + breathe * 0.3, 12, 7);
    ctx.fillStyle = '#a09080';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TRADE', -9, 4 + breathe * 0.3);

    // Label above head
    ctx.fillStyle = '#c0a080';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, 0, -42 + breathe * 0.2);

    ctx.restore();
  }

  _renderNeonCity(ctx) {
    const t = performance.now() / 1000;
    const breathe = Math.sin(t * 1.8) * 1.5;
    const sway = Math.sin(this._waveT) * 1.5;

    ctx.save();
    ctx.translate(this.x + sway, this.y);

    // ═══ CYBERPUNK NPC RENDERING ═══

    // Shadow with neon tint
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = this.color + '44';
    ctx.beginPath();
    ctx.ellipse(4, 28, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Legs
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(-8, 12, 6, 16);
    ctx.fillRect(2, 12, 6, 16);

    // Shoes with neon accent
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(-9, 26, 8, 4);
    ctx.fillRect(1, 26, 8, 4);
    ctx.fillStyle = this.color + '88';
    ctx.fillRect(-9, 29, 8, 1);
    ctx.fillRect(1, 29, 8, 1);

    // Body/Torso with cyber suit gradient
    const bodyGrad = ctx.createLinearGradient(-12, -8, 12, 14);
    bodyGrad.addColorStop(0, '#2a2a3e');
    bodyGrad.addColorStop(0.5, '#1a1a2e');
    bodyGrad.addColorStop(1, '#14141e');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(-12, -8 + breathe * 0.3, 24, 22, 4);
    ctx.fill();

    // Suit lapels with neon trim
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(-10, -6 + breathe * 0.3);
    ctx.lineTo(-4, 6 + breathe * 0.3);
    ctx.moveTo(10, -6 + breathe * 0.3);
    ctx.lineTo(4, 6 + breathe * 0.3);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Collar/shirt
    ctx.fillStyle = '#ddd';
    ctx.beginPath();
    ctx.moveTo(-4, -6 + breathe * 0.3);
    ctx.lineTo(0, -2 + breathe * 0.3);
    ctx.lineTo(4, -6 + breathe * 0.3);
    ctx.closePath();
    ctx.fill();

    // Neon tie
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(-2, -2 + breathe * 0.3);
    ctx.lineTo(0, 10 + breathe * 0.3);
    ctx.lineTo(2, -2 + breathe * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Arms
    ctx.fillStyle = '#2a2a3e';
    ctx.fillRect(-16, -4 + breathe * 0.3, 5, 14);
    ctx.fillRect(11, -4 + breathe * 0.3, 5, 14);

    // Hands
    ctx.fillStyle = '#DDBB99';
    ctx.beginPath();
    ctx.arc(-13.5, 12 + breathe * 0.3, 3, 0, Math.PI * 2);
    ctx.arc(13.5, 12 + breathe * 0.3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Neck
    ctx.fillStyle = '#DDBB99';
    ctx.fillRect(-3, -12, 6, 6);

    // Head
    const headGrad = ctx.createRadialGradient(-3, -20, 2, 0, -18, 12);
    headGrad.addColorStop(0, '#FFE4C4');
    headGrad.addColorStop(1, '#D4A574');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, -18, 10, 0, Math.PI * 2);
    ctx.fill();

    // Hair with style
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(0, -22, 9, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-8, -24, 16, 4);

    // Eyes
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-4, -19, 1.5, 0, Math.PI * 2);
    ctx.arc(4, -19, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Cyber eye glow (optional accent)
    ctx.fillStyle = this.color + '44';
    ctx.beginPath();
    ctx.arc(-4, -19, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = '#886655';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -14, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Name badge on chest
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.roundRect(-10, 2, 20, 8, 2);
    ctx.fill();
    ctx.fillStyle = this.color;
    ctx.font = 'bold 4px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STAFF', 0, 8);

    ctx.restore();

    // ═══ FLOATING UI ELEMENTS ═══
    ctx.save();
    const pulse = Math.sin(t * 3) * 0.2 + 0.8;

    // Name badge above head with glow
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(this.x + sway - 36, this.y - 52, 72, 16, 4);
    ctx.fill();

    // Neon border on badge
    ctx.strokeStyle = this.color + 'AA';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(this.x + sway - 36, this.y - 52, 72, 16, 4);
    ctx.stroke();

    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.font = 'bold 8px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.x + sway, this.y - 40);

    // [T] TALK prompt with animation - LARGER AND MORE VISIBLE
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(0,0,0,${0.85 + pulse * 0.1})`;
    ctx.beginPath();
    ctx.roundRect(this.x + sway - 32, this.y - 75, 64, 20, 6);
    ctx.fill();

    ctx.strokeStyle = `rgba(68,238,255,${0.6 + pulse * 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(this.x + sway - 32, this.y - 75, 64, 20, 6);
    ctx.stroke();

    ctx.fillStyle = '#FFDD44';
    ctx.shadowColor = '#FFAA00';
    ctx.shadowBlur = 10 * pulse;
    ctx.font = 'bold 11px Orbitron, monospace';
    ctx.fillText('[T] TALK', this.x + sway, this.y - 61);
    ctx.restore();
  }

  _renderGirl(ctx) {
    const t     = performance.now() / 1000;
    const breathe = Math.sin(t * 1.6) * 1.2;
    const sway   = Math.sin(this._waveT * 0.9) * 1.8;

    ctx.save();
    ctx.translate(this.x + sway, this.y);

    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(3, 30, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── DRESS / SKIRT ──
    ctx.fillStyle = '#220040';
    ctx.beginPath();
    ctx.moveTo(-10, 12 + breathe * 0.2);
    ctx.lineTo(-14, 30);
    ctx.lineTo(14, 30);
    ctx.lineTo(10, 12 + breathe * 0.2);
    ctx.closePath();
    ctx.fill();
    // Dress shimmer strip
    ctx.fillStyle = this.color + '88';
    ctx.beginPath();
    ctx.moveTo(-6, 14 + breathe * 0.2);
    ctx.lineTo(-7, 30);
    ctx.lineTo(7, 30);
    ctx.lineTo(6, 14 + breathe * 0.2);
    ctx.closePath();
    ctx.fill();
    // Dress glitter lines
    for (let gl = 0; gl < 3; gl++) {
      const gp = Math.sin(t * 3 + gl * 2) * 0.5 + 0.5;
      ctx.strokeStyle = `rgba(255,180,255,${0.2 + gp * 0.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-9 + gl * 3, 14 + breathe * 0.2);
      ctx.lineTo(-11 + gl * 4, 30);
      ctx.stroke();
    }

    // ── BODY / TORSO ──
    const bodyG = ctx.createLinearGradient(-10, -8, 10, 12);
    bodyG.addColorStop(0, '#2a0050');
    bodyG.addColorStop(1, '#180030');
    ctx.fillStyle = bodyG;
    ctx.beginPath();
    ctx.roundRect(-10, -8 + breathe * 0.3, 20, 22, [4, 4, 2, 2]);
    ctx.fill();
    // Top neckline
    ctx.fillStyle = this.color + '55';
    ctx.beginPath();
    ctx.moveTo(-8, -8 + breathe * 0.3);
    ctx.lineTo(8, -8 + breathe * 0.3);
    ctx.lineTo(5, -1 + breathe * 0.3);
    ctx.lineTo(-5, -1 + breathe * 0.3);
    ctx.closePath();
    ctx.fill();
    // Neon trim on dress edge
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(-10, -8 + breathe * 0.3);
    ctx.lineTo(-10, 12 + breathe * 0.2);
    ctx.moveTo(10, -8 + breathe * 0.3);
    ctx.lineTo(10, 12 + breathe * 0.2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ── ARMS ──
    ctx.fillStyle = '#DDAA88';
    // Left arm
    ctx.beginPath();
    ctx.moveTo(-10, -4 + breathe * 0.3);
    ctx.quadraticCurveTo(-18, 4, -15, 14 + breathe * 0.3);
    ctx.lineTo(-12, 14 + breathe * 0.3);
    ctx.quadraticCurveTo(-14, 5, -7, -2 + breathe * 0.3);
    ctx.closePath();
    ctx.fill();
    // Right arm (raised slightly — welcoming gesture)
    ctx.beginPath();
    ctx.moveTo(10, -4 + breathe * 0.3);
    ctx.quadraticCurveTo(20, -8 + breathe, 18, 4 + breathe * 0.3);
    ctx.lineTo(15, 5 + breathe * 0.3);
    ctx.quadraticCurveTo(16, -4, 7, -1 + breathe * 0.3);
    ctx.closePath();
    ctx.fill();

    // Hands
    ctx.fillStyle = '#DDAA88';
    ctx.beginPath();
    ctx.arc(-14, 15 + breathe * 0.3, 3, 0, Math.PI * 2);
    ctx.arc(18, 4 + breathe * 0.3, 3, 0, Math.PI * 2);
    ctx.fill();

    // ── NECK ──
    ctx.fillStyle = '#DDAA88';
    ctx.fillRect(-3, -13, 6, 7);

    // ── HEAD ──
    const headG = ctx.createRadialGradient(-3, -22, 2, 0, -20, 11);
    headG.addColorStop(0, '#FFE4C4');
    headG.addColorStop(1, '#D4916A');
    ctx.fillStyle = headG;
    ctx.beginPath();
    ctx.arc(0, -20, 11, 0, Math.PI * 2);
    ctx.fill();

    // ── HAIR — long, flowing ──
    // Back layer (darker)
    ctx.fillStyle = '#1a0030';
    ctx.beginPath();
    ctx.ellipse(0, -22, 12, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    // Side strands
    ctx.fillStyle = '#2a0050';
    ctx.beginPath();
    ctx.moveTo(-11, -26);
    ctx.quadraticCurveTo(-18, -10, -14, 8);
    ctx.lineTo(-10, 8);
    ctx.quadraticCurveTo(-14, -8, -9, -24);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(11, -26);
    ctx.quadraticCurveTo(18, -10, 14, 8);
    ctx.lineTo(10, 8);
    ctx.quadraticCurveTo(14, -8, 9, -24);
    ctx.closePath();
    ctx.fill();
    // Top hair with purple highlight
    ctx.fillStyle = '#3a0060';
    ctx.beginPath();
    ctx.arc(0, -24, 10, Math.PI, 0);
    ctx.fill();
    // Hair shimmer
    const hs = Math.sin(t * 2) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(200,100,255,${0.15 + hs * 0.2})`;
    ctx.beginPath();
    ctx.arc(-2, -27, 6, Math.PI * 1.1, Math.PI * 1.9);
    ctx.fill();

    // ── FACE ──
    // Eyes — almond shaped, dramatic
    for (const [ex, ey] of [[-4, -21], [4, -21]]) {
      // Eye white
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.ellipse(ex, ey, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Iris — purple/pink
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 1.8, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Pupil
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(ex, ey, 0.9, 0, Math.PI * 2);
      ctx.fill();
      // Lash line
      ctx.strokeStyle = '#1a001a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ex - 3, ey - 1);
      ctx.lineTo(ex + 3, ey - 1);
      ctx.stroke();
    }
    // Eyebrows
    ctx.strokeStyle = '#2a0040';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-6, -24); ctx.quadraticCurveTo(-4, -25.5, -2, -24);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, -24); ctx.quadraticCurveTo(4, -25.5, 6, -24);
    ctx.stroke();
    // Lips — pink
    ctx.fillStyle = '#FF6699';
    ctx.shadowColor = '#FF4488';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.ellipse(0, -16, 3.5, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Blush
    ctx.fillStyle = 'rgba(255,100,150,0.18)';
    ctx.beginPath();
    ctx.ellipse(-5, -18, 3, 2, 0, 0, Math.PI * 2);
    ctx.ellipse(5, -18, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── NAME BADGE (chest) ──
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.beginPath();
    ctx.roundRect(-12, 0, 24, 9, 2);
    ctx.fill();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.font = 'bold 4px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HOSTESS', 0, 7);
    ctx.shadowBlur = 0;

    ctx.restore();

    // ── FLOATING UI — name tag + [T] prompt ──
    const pulse = Math.sin(t * 3) * 0.2 + 0.8;
    ctx.save();
    // Name badge
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(this.x + sway - 38, this.y - 58, 76, 16, 4);
    ctx.fill();
    ctx.strokeStyle = this.color + 'AA';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(this.x + sway - 38, this.y - 58, 76, 16, 4);
    ctx.stroke();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 14;
    ctx.font = 'bold 8px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.x + sway, this.y - 46);

    // [T] TALK
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(0,0,0,${0.85 + pulse * 0.1})`;
    ctx.beginPath();
    ctx.roundRect(this.x + sway - 34, this.y - 82, 68, 21, 6);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,100,200,${0.5 + pulse * 0.4})`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8 * pulse;
    ctx.beginPath();
    ctx.roundRect(this.x + sway - 34, this.y - 82, 68, 21, 6);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFDD44';
    ctx.shadowColor = '#FFAA00';
    ctx.shadowBlur = 8;
    ctx.font = 'bold 10px Orbitron, monospace';
    ctx.fillText('[T] TALK', this.x + sway, this.y - 66);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  _renderDefault(ctx) {
    const sway = Math.sin(this._waveT) * 2.5;
    const H3D  = 8;

    // Shadow
    ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(this.x + 4, this.y + this.radius + H3D + 3, this.radius * 0.9, this.radius * 0.28, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.restore();

    // Body cylinder
    ctx.save();
    ctx.translate(this.x + sway, this.y);
    const grad = ctx.createLinearGradient(-this.radius, 0, this.radius, H3D);
    grad.addColorStop(0, this.color + 'CC'); grad.addColorStop(1, this.color + '22');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-this.radius, 0); ctx.lineTo(-this.radius * 0.82, H3D);
    ctx.lineTo(this.radius * 0.82, H3D); ctx.lineTo(this.radius, 0);
    ctx.closePath(); ctx.fill();
    // Top disc
    ctx.shadowColor = this.color; ctx.shadowBlur = 16;
    const tg = ctx.createRadialGradient(-this.radius * 0.3, -this.radius * 0.3, 1, 0, 0, this.radius);
    tg.addColorStop(0, '#FFEECC'); tg.addColorStop(1, this.color + 'BB');
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
    // Specular
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.arc(-5, -5, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // [E] interact prompt + dialogue bubble
    ctx.save();
    ctx.font = 'bold 7px Orbitron, monospace';
    ctx.textAlign = 'center';
    // Name badge
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.beginPath(); ctx.roundRect(this.x + sway - 32, this.y - this.radius - 28, 64, 14, 3); ctx.fill();
    ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 8;
    ctx.fillText(this.name, this.x + sway, this.y - this.radius - 17);
    // [T] hint - LARGER AND MORE VISIBLE
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.beginPath(); ctx.roundRect(this.x + sway - 28, this.y - this.radius - 48, 56, 18, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(68,238,255,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(this.x + sway - 28, this.y - this.radius - 48, 56, 18, 5); ctx.stroke();
    ctx.fillStyle = '#FFDD44'; ctx.shadowColor = '#FFAA00'; ctx.shadowBlur = 8;
    ctx.font = 'bold 10px Orbitron, monospace';
    ctx.fillText('[T] TALK', this.x + sway, this.y - this.radius - 35);
    ctx.restore();
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
    // Airplanes and birds fly freely — skip road collision and turn logic
    if (this.isAirplane || this.isBird) {
      this._lightT += dt;
      this.x += Math.cos(this.angle) * this.speed * dt;
      this.y += Math.sin(this.angle) * this.speed * dt;
      const maxW = gameMap.W * gameMap.S, maxH = gameMap.H * gameMap.S;
      if (this.x < -350 || this.y < -350 || this.x > maxW + 350 || this.y > maxH + 350) this.dead = true;
      return;
    }
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
    if (this.isAirplane) { this._renderAirplane(ctx); return; }
    if (this.isBird)     { this._renderBird(ctx);     return; }
    if (this.isHorse)    { this._renderHorse(ctx);    return; }
    if (this.isCamel)    { this._renderCamel(ctx);    return; }
    if (this.isUFO)      { this._renderUFO(ctx);      return; }
    if (this.isDino)     { this._renderDino(ctx);     return; }
    const w = this.width, h = this.height;
    const bs = this.bodyStyle;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);

    // Ground shadow
    ctx.save(); ctx.globalAlpha = 0.20; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(2, 5, w * 0.50, h * 0.36, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // ── Body with paint gradient ──────────────────────────────
    const bG = ctx.createLinearGradient(-w/2, 0, w * 0.5, 0);
    bG.addColorStop(0, this._acBrighten(this.color, 1.32));
    bG.addColorStop(0.55, this.color);
    bG.addColorStop(1, this._acDarken(this.color, 0.72));
    ctx.shadowColor = this.color; ctx.shadowBlur = 4;
    ctx.fillStyle = bG;
    if (bs === 2) {  // sports: wedge
      ctx.beginPath();
      ctx.moveTo(-w/2, h/2 * 0.78); ctx.lineTo(-w/2 * 0.82, h/2);
      ctx.lineTo(w/2, h/2);          ctx.lineTo(w/2, -h/2);
      ctx.lineTo(-w/2, -h/2 * 0.74); ctx.closePath(); ctx.fill();
    } else if (bs === 1) {  // SUV: boxy, slightly taller
      ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 4); ctx.fill();
    }
    ctx.shadowBlur = 0;

    // ── Windshield ────────────────────────────────────────────
    if (bs === 3) {  // van: front cab slit
      ctx.fillStyle = 'rgba(160,220,255,0.30)';
      ctx.beginPath(); ctx.roundRect(-w/2 + 3, -h/2 + 2, w * 0.36, h/2 - 1, 1); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(175,235,255,0.38)';
      ctx.beginPath(); ctx.roundRect(w/2 - 17, -h/2 + 2, 13, h - 4, 2); ctx.fill();
      // Glare
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath(); ctx.roundRect(w/2 - 16, -h/2 + 3, 3.5, h * 0.34, 1); ctx.fill();
    }

    // ── Rear window ───────────────────────────────────────────
    if (bs !== 3) {
      ctx.fillStyle = 'rgba(140,200,230,0.16)';
      ctx.beginPath(); ctx.roundRect(-w/2 + 3, -h/2 + 2, 9, h - 4, 1); ctx.fill();
    }

    // ── Roof cabin ────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    if (bs === 3) {  // van: cargo bay darker
      ctx.beginPath(); ctx.roundRect(w * 0.05, -h/2 + 2, w * 0.36, h - 4, 1); ctx.fill();
    } else if (bs === 2) {  // sports: low center cabin
      ctx.beginPath(); ctx.roundRect(-w * 0.14, -h/2 + 2, w * 0.34, h - 4, 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.roundRect(-w/2 + 14, -h/2 + 2, w - 26, h - 4, 2); ctx.fill();
    }

    // ── Chrome trim ───────────────────────────────────────────
    ctx.strokeStyle = 'rgba(210,226,240,0.48)'; ctx.lineWidth = 0.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-w/2 + 4, -h/2 + 1); ctx.lineTo(w/2 - 4, -h/2 + 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-w/2 + 4,  h/2 - 1); ctx.lineTo(w/2 - 4,  h/2 - 1); ctx.stroke();

    // ── Taxi sign ─────────────────────────────────────────────
    if (bs === 4) {
      ctx.fillStyle = '#FFCC00'; ctx.shadowColor = '#FFCC00'; ctx.shadowBlur = 9;
      ctx.beginPath(); ctx.roundRect(-9, -h/2 - 6, 18, 6, 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#000'; ctx.font = 'bold 4px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('TAXI', 0, -h/2 - 3);
      ctx.textBaseline = 'alphabetic';
    }

    // ── Spoiler (sports) ──────────────────────────────────────
    if (bs === 2) {
      ctx.fillStyle = this._acDarken(this.color, 0.60);
      ctx.beginPath(); ctx.roundRect(-w/2 - 4, -h/2 * 0.62, 4, h * 1.24, 1); ctx.fill();
      ctx.fillStyle = this._acDarken(this.color, 0.50);
      ctx.beginPath(); ctx.roundRect(-w/2 - 3.5, -h/2 * 0.68, 6.5, 2.4, 1); ctx.fill();
    }

    // ── Wheels ────────────────────────────────────────────────
    const ww2 = 7, wh2 = 4.5;
    const wxo2 = w/2 - 3.5, wyo2 = h/2 - 0.5;
    for (const [wX, wY] of [[-wxo2 + ww2/2, -wyo2 + wh2/2], [-wxo2 + ww2/2, wyo2 - wh2/2],
                              [wxo2 - ww2/2 - 1, -wyo2 + wh2/2], [wxo2 - ww2/2 - 1, wyo2 - wh2/2]]) {
      // Tire
      ctx.fillStyle = '#181818';
      ctx.beginPath(); ctx.ellipse(wX, wY, ww2/2 + 0.9, wh2/2 + 0.9, 0, 0, Math.PI * 2); ctx.fill();
      // Rim
      ctx.fillStyle = bs === 1 ? '#8898A8' : '#C0CAD2';
      ctx.beginPath(); ctx.ellipse(wX, wY, ww2/2 - 0.7, wh2/2 - 0.7, 0, 0, Math.PI * 2); ctx.fill();
      // Hub
      ctx.fillStyle = '#777';
      ctx.beginPath(); ctx.arc(wX, wY, 1.1, 0, Math.PI * 2); ctx.fill();
    }

    // ── Headlights (front = -y in rotated space) ──────────────
    const blink = this._lightT % 1.2 < 0.9 ? 1 : 0.6;
    ctx.fillStyle = `rgba(255,255,205,${blink})`; ctx.shadowColor = '#FFFF88'; ctx.shadowBlur = 13;
    ctx.beginPath(); ctx.ellipse(-w/2 + 4, -h/2 + 3, 2.8, 1.9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-w/2 + 4,  h/2 - 3, 2.8, 1.9, 0, 0, Math.PI * 2); ctx.fill();

    // ── Taillights ────────────────────────────────────────────
    ctx.fillStyle = '#FF1100'; ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 7;
    ctx.beginPath(); ctx.ellipse(w/2 - 4, -h/2 + 3, 2.2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w/2 - 4,  h/2 - 3, 2.2, 1.5, 0, 0, Math.PI * 2); ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  _acBrighten(hex, f) {
    const r = Math.min(255, Math.round(parseInt(hex.slice(1,3),16) * f));
    const g = Math.min(255, Math.round(parseInt(hex.slice(3,5),16) * f));
    const b = Math.min(255, Math.round(parseInt(hex.slice(5,7),16) * f));
    return `rgb(${r},${g},${b})`;
  }
  _acDarken(hex, f) {
    const r = Math.round(parseInt(hex.slice(1,3),16) * f);
    const g = Math.round(parseInt(hex.slice(3,5),16) * f);
    const b = Math.round(parseInt(hex.slice(5,7),16) * f);
    return `rgb(${r},${g},${b})`;
  }

  _renderHorse(ctx) {
    // Top-down horse — animated gallop
    const gait = Math.sin(this._lightT * 9) * 0.18;  // leg swing
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);

    // Shadow
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(1, 6, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Legs (4) — animated pairs
    const legColor = this._acDarken(this.color, 0.72);
    // Front pair
    ctx.fillStyle = legColor;
    ctx.save(); ctx.translate(-5, -14 + gait * 8); ctx.rotate(gait * 0.3);
    ctx.beginPath(); ctx.roundRect(-2.5, 0, 5, 14, 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(5, -14 - gait * 8); ctx.rotate(-gait * 0.3);
    ctx.beginPath(); ctx.roundRect(-2.5, 0, 5, 14, 2); ctx.fill(); ctx.restore();
    // Rear pair
    ctx.save(); ctx.translate(-5, 10 - gait * 8); ctx.rotate(-gait * 0.3);
    ctx.beginPath(); ctx.roundRect(-2.5, 0, 5, 12, 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(5, 10 + gait * 8); ctx.rotate(gait * 0.3);
    ctx.beginPath(); ctx.roundRect(-2.5, 0, 5, 12, 2); ctx.fill(); ctx.restore();

    // Body
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.roundRect(-10, -16, 20, 30, 6); ctx.fill();
    // Belly highlight
    ctx.fillStyle = this._acBrighten(this.color, 1.22);
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 11, 0, 0, Math.PI * 2); ctx.fill();

    // Neck
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.roundRect(-5, -26, 10, 14, 4); ctx.fill();

    // Head
    ctx.beginPath(); ctx.ellipse(0, -30, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
    // Snout
    ctx.fillStyle = this._acDarken(this.color, 0.82);
    ctx.beginPath(); ctx.ellipse(0, -35, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
    // Nostril
    ctx.fillStyle = '#3a1a08';
    ctx.beginPath(); ctx.arc(-2, -35, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 2, -35, 1.5, 0, Math.PI * 2); ctx.fill();
    // Eye
    ctx.fillStyle = '#1a0a00';
    ctx.beginPath(); ctx.arc(4, -30, 2, 0, Math.PI * 2); ctx.fill();
    // Mane
    ctx.fillStyle = '#2a1200';
    ctx.beginPath(); ctx.roundRect(-2, -36, 4, 18, 2); ctx.fill();
    // Tail
    ctx.strokeStyle = '#2a1200'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 18, 10, Math.PI*0.3 + gait*0.3, Math.PI*0.85 + gait*0.3); ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 20, 13, Math.PI*0.35 - gait*0.2, Math.PI*0.80 - gait*0.2); ctx.stroke();

    ctx.restore();
  }

  _renderCamel(ctx) {
    // Top-down dromedary camel — animated sway walk
    const sway = Math.sin(this._lightT * 5.5) * 0.14;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);

    // Ground shadow
    ctx.save(); ctx.globalAlpha = 0.20; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(2, 8, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 4 long legs — alternating pairs for walk
    const legColor = this._acDarken(this.color, 0.68);
    ctx.fillStyle = legColor;
    ctx.save(); ctx.translate(-6, -18 + sway * 10); ctx.rotate(sway * 0.22);
    ctx.beginPath(); ctx.roundRect(-2, 0, 4, 16, 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(6, -18 - sway * 10); ctx.rotate(-sway * 0.22);
    ctx.beginPath(); ctx.roundRect(-2, 0, 4, 16, 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(-6, 12 - sway * 10); ctx.rotate(-sway * 0.22);
    ctx.beginPath(); ctx.roundRect(-2, 0, 4, 14, 2); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(6, 12 + sway * 10); ctx.rotate(sway * 0.22);
    ctx.beginPath(); ctx.roundRect(-2, 0, 4, 14, 2); ctx.fill(); ctx.restore();

    // Main body
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.roundRect(-11, -20, 22, 36, 7); ctx.fill();
    ctx.fillStyle = this._acBrighten(this.color, 1.18);
    ctx.beginPath(); ctx.ellipse(0, 4, 7, 13, 0, 0, Math.PI * 2); ctx.fill();

    // Hump (dromedary — single large hump)
    ctx.fillStyle = this._acBrighten(this.color, 1.12);
    ctx.beginPath(); ctx.ellipse(0, -8, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = this._acBrighten(this.color, 1.30);
    ctx.beginPath(); ctx.ellipse(-2, -10, 6, 5, -0.2, 0, Math.PI * 2); ctx.fill();

    // Long neck + elongated head
    ctx.fillStyle = this.color;
    ctx.save(); ctx.rotate(sway * 0.08);
    ctx.beginPath(); ctx.roundRect(-4, -30, 8, 14, 3); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -36, 5, 9, 0, 0, Math.PI * 2); ctx.fill();
    // Camel's flat squared snout
    ctx.fillStyle = this._acDarken(this.color, 0.80);
    ctx.beginPath(); ctx.roundRect(-4, -45, 8, 8, [1, 1, 4, 4]); ctx.fill();
    // Iconic lip split
    ctx.strokeStyle = '#3a2008'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -43); ctx.lineTo(0, -38); ctx.stroke();
    // Nostrils
    ctx.fillStyle = '#3a1a06';
    ctx.beginPath(); ctx.arc(-2, -42, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 2, -42, 1.4, 0, Math.PI * 2); ctx.fill();
    // Eye with long lash
    ctx.fillStyle = '#1a0a00'; ctx.beginPath(); ctx.arc(3.5, -37, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FF8800'; ctx.beginPath(); ctx.arc(3.5, -37, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a0a00'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.arc(3.5, -37, 3.2, -Math.PI*0.75, -Math.PI*0.2); ctx.stroke();
    // Ear
    ctx.fillStyle = this._acDarken(this.color, 0.82);
    ctx.beginPath(); ctx.ellipse(-3.5, -44, 2.5, 4, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Short stubby tail + tuft
    ctx.strokeStyle = this._acDarken(this.color, 0.70); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 18); ctx.quadraticCurveTo(5, 23, 2, 26); ctx.stroke();
    ctx.fillStyle = '#3a2208'; ctx.beginPath(); ctx.arc(2, 26, 3, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  _renderUFO(ctx) {
    // Top-down flying saucer — hovers and drifts along road lanes
    const t = this._lightT || 0;
    ctx.save();
    ctx.translate(this.x, this.y);

    // Outer glow halo
    ctx.shadowColor = this.color; ctx.shadowBlur = 18;
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.ellipse(0, 0, 38, 17, 0, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

    // Main disc body
    const g = ctx.createRadialGradient(-8, -5, 2, 0, 0, 30);
    g.addColorStop(0, this._acBrighten(this.color, 1.5));
    g.addColorStop(0.5, this.color);
    g.addColorStop(1, this._acDarken(this.color, 0.55));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 13, 0, 0, Math.PI*2); ctx.fill();

    // Dome on top
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(200,180,255,0.80)';
    ctx.beginPath(); ctx.ellipse(0, -3, 14, 10, 0, Math.PI, Math.PI*2); ctx.fill();
    // Dome shine
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.ellipse(-4, -6, 6, 4, -0.4, 0, Math.PI*2); ctx.fill();

    // Rotating light ring (6 colored lights)
    const ringA = t * 3.5;
    const lightCols = ['#FF44AA','#AA44FF','#44FFAA','#FFAA44','#44AAFF','#FF4444'];
    for (let i = 0; i < 6; i++) {
      const a   = ringA + i * Math.PI * 2 / 6;
      const lx  = Math.cos(a) * 22;
      const ly  = Math.sin(a) * 9;
      ctx.shadowColor = lightCols[i]; ctx.shadowBlur = 8;
      ctx.fillStyle = lightCols[i];
      ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  _renderAirplane(ctx) {
    const t = this._lightT || 0;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);

    // Contrail — 3 fading bands behind the fuselage
    for (let ci = 0; ci < 3; ci++) {
      ctx.globalAlpha = 0.07 - ci * 0.018;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-2 + ci * 0.4, 14 + ci * 7, 4 - ci, 20 + ci * 10);
    }
    ctx.globalAlpha = 1;

    // Ground shadow
    ctx.save(); ctx.globalAlpha = 0.10; ctx.fillStyle = '#002244';
    ctx.beginPath(); ctx.ellipse(3, 3, 28, 10, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();

    // Swept-back wings
    const wingCol = this._acDarken(this.color, 0.86);
    ctx.fillStyle = wingCol;
    ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(-34, 9); ctx.lineTo(-30, 13); ctx.lineTo(0, 5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo( 34, 9); ctx.lineTo( 30, 13); ctx.lineTo(0, 5); ctx.closePath(); ctx.fill();
    // Wing highlight strip
    ctx.fillStyle = 'rgba(255,255,255,0.11)';
    ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(-30, 8); ctx.lineTo(-28, 9); ctx.lineTo(0, -1); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo( 30, 8); ctx.lineTo( 28, 9); ctx.lineTo(0, -1); ctx.closePath(); ctx.fill();

    // Fuselage
    const fg = ctx.createLinearGradient(-6, -22, 6, 22);
    fg.addColorStop(0, this._acBrighten(this.color, 1.30));
    fg.addColorStop(0.45, this.color);
    fg.addColorStop(1, this._acDarken(this.color, 0.72));
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.ellipse(0, 0, 6, 23, 0, 0, Math.PI*2); ctx.fill();

    // Cockpit window
    ctx.fillStyle = 'rgba(100,185,255,0.80)';
    ctx.beginPath(); ctx.ellipse(0, -14, 4, 7, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(220,245,255,0.42)';
    ctx.beginPath(); ctx.ellipse(-1.5, -15, 1.5, 4, -0.2, 0, Math.PI*2); ctx.fill();

    // Tail fins
    ctx.fillStyle = wingCol;
    ctx.beginPath(); ctx.moveTo(0, 15); ctx.lineTo(-13, 23); ctx.lineTo(-11, 25); ctx.lineTo(0, 19); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 15); ctx.lineTo( 13, 23); ctx.lineTo( 11, 25); ctx.lineTo(0, 19); ctx.closePath(); ctx.fill();

    // Engine pods with afterburner glow
    ctx.fillStyle = this._acDarken(this.color, 0.62);
    ctx.beginPath(); ctx.ellipse(-22, 8, 5, 3, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( 22, 8, 5, 3, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,155,50,0.50)';
    ctx.beginPath(); ctx.ellipse(-22, 10, 3, 1.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( 22, 10, 3, 1.5, 0, 0, Math.PI*2); ctx.fill();

    ctx.restore();
  }

  _renderBird(ctx) {
    const t = this._lightT || 0;
    const flap = Math.sin(t * 9);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);

    // Soft shadow
    ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = '#002244';
    ctx.beginPath(); ctx.ellipse(2, 2, 13, 5, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();

    const wSplay = 19 + flap * 7;
    // Wings — animated flap
    ctx.fillStyle = '#1a2838';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-wSplay, -5+flap*3); ctx.lineTo(-wSplay+4, 3+flap*2); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo( wSplay, -5+flap*3); ctx.lineTo( wSplay-4, 3+flap*2); ctx.lineTo( 3, 4); ctx.closePath(); ctx.fill();
    // Wing sheen
    ctx.fillStyle = 'rgba(80,130,170,0.28)';
    ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(-wSplay+3, -4+flap*3); ctx.lineTo(-3, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo( wSplay-3, -4+flap*3); ctx.lineTo( 3, 0); ctx.closePath(); ctx.fill();

    // Body
    ctx.fillStyle = '#243040';
    ctx.beginPath(); ctx.ellipse(0, 0, 4, 9, 0, 0, Math.PI*2); ctx.fill();
    // Head
    ctx.fillStyle = '#1a2838';
    ctx.beginPath(); ctx.arc(0, -9, 4, 0, Math.PI*2); ctx.fill();
    // Beak
    ctx.fillStyle = '#E8B840';
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(-2, -16); ctx.lineTo(2, -16); ctx.closePath(); ctx.fill();
    // Eye glint
    ctx.fillStyle = '#AAE0FF';
    ctx.beginPath(); ctx.arc(1.5, -9.5, 1.2, 0, Math.PI*2); ctx.fill();
    // Tail feathers
    ctx.fillStyle = '#1a2838';
    ctx.beginPath(); ctx.moveTo(-4, 7); ctx.lineTo(0, 14); ctx.lineTo(4, 7); ctx.closePath(); ctx.fill();

    ctx.restore();
  }

  _renderDino(ctx) {
    // Top-down diplodocus/brachiosaurus — ambles along paths
    const t = this._lightT || 0;
    const stride = Math.sin(t * 4.0) * 0.16;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);

    // Ground shadow
    ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = '#002200';
    ctx.beginPath(); ctx.ellipse(2, 4, 28, 12, 0, 0, Math.PI*2); ctx.fill(); ctx.restore();

    // Body — wide oval
    const bg = ctx.createRadialGradient(-4, -4, 2, 0, 0, 20);
    bg.addColorStop(0, '#88CC66'); bg.addColorStop(0.55, '#559933'); bg.addColorStop(1, '#2a5518');
    ctx.fillStyle = bg;
    ctx.shadowColor = '#66AA44'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.ellipse(0, 2, 14, 20, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Neck + tiny head (long-neck dino)
    ctx.strokeStyle = '#66AA44'; ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -16); ctx.quadraticCurveTo(stride*14, -28, 0, -34); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#77BB55';
    ctx.beginPath(); ctx.ellipse(0, -34, 6, 5, 0, 0, Math.PI*2); ctx.fill();

    // Eye
    ctx.fillStyle = '#FFCC00'; ctx.beginPath(); ctx.arc(-3, -35, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000';    ctx.beginPath(); ctx.arc(-3, -35, 1.2, 0, Math.PI*2); ctx.fill();

    // 4 walking legs
    ctx.fillStyle = '#447722';
    ctx.beginPath(); ctx.ellipse(-8, 8+stride*10,  4, 8,  0.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( 8, 8-stride*10,  4, 8, -0.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-8, 20-stride*8,  4, 8,  0.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( 8, 20+stride*8,  4, 8, -0.2, 0, Math.PI*2); ctx.fill();

    // Tail
    ctx.strokeStyle = '#558833'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 20); ctx.quadraticCurveTo(-stride*10, 32, 0, 40); ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(0, 50); ctx.stroke();
    ctx.lineCap = 'butt';

    ctx.restore();
  }
}
