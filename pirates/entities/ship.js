import { getFlag, getShipSprite } from '../assets.js';
import { Terrain, cartToIso, tileAt } from '../world.js';
import { Projectile } from './projectile.js';
import { bus } from '../bus.js';
import { cartesian } from '../utils/distance.js';

export const SHIP_TYPES = {
  Sloop: { speed: 5, hull: 100, cargo: 20, crew: 10, cost: 0 },
  Brig: { speed: 4, hull: 150, cargo: 40, crew: 20, cost: 300 },
  Galleon: { speed: 3, hull: 200, cargo: 60, crew: 40, cost: 600 }
};

export class Ship {
  constructor(x, y, nation = 'Pirate', type = 'Sloop') {
    this.x = x;
    this.y = y;
    this.nation = nation;
    this.type = type;
    this.updateAppearance();
    const stats = SHIP_TYPES[type] || SHIP_TYPES.Sloop;
    this.speed = 0;
    this.baseMaxSpeed = stats.speed;
    this.maxSpeed = stats.speed;
    this.angle = 0;
    this.turnSpeed = 0.05;
    this.cargo = {};
    this.cargoCapacity = stats.cargo;
    this.gold = 100;
    this.crew = stats.crew;
    this.crewMax = stats.crew;
    this.hullMax = stats.hull;
    this.hull = this.hullMax;
    this.sunk = false;
    this.projectiles = [];
    this.reputation = {};

    // sail control
    this.sail = 1; // 0 = furled, 1 = full

    // supplies and crew management
    this.food = 100;
    this.morale = 100;
    this.timeAtSea = 0;
    this.inPort = false;
    this.mutinied = false;

    // cannon fire control
    this.fireCooldown = 0; // frames until next shot allowed
    this.baseFireRate = 30; // base cooldown frames between shots
    this.fireRate = this.baseFireRate;
    this.cannonRange = 300;
    this.cannonDamage = 25;

    // ramming
    this.ramCooldown = 0;
    this.ramRate = 120;
  }

  rotate(direction) {
    this.angle += this.turnSpeed * direction;
  }

  forward(dt) {
    const wind = Ship.wind || { speed: 0, angle: 0 };
    const rel = wind.angle - this.angle;
    const windAlong = Math.cos(rel) * wind.speed * this.sail;
    const windSide = Math.sin(rel) * wind.speed * this.sail;
    const forward = this.speed + windAlong;
    const sideways = windSide;
    return {
      x:
        Math.cos(this.angle) * forward * dt +
        Math.cos(this.angle + Math.PI / 2) * sideways * dt,
      y:
        Math.sin(this.angle) * forward * dt +
        Math.sin(this.angle + Math.PI / 2) * sideways * dt
    };
  }

  update(dt, tiles, gridSize, worldWidth, worldHeight) {
    this.projectiles = this.projectiles.filter(p => p.update(dt));

    if (this.fireCooldown > 0) {
      this.fireCooldown = Math.max(this.fireCooldown - dt, 0);
    }
    if (this.ramCooldown > 0) {
      this.ramCooldown = Math.max(this.ramCooldown - dt, 0);
    }

    // time at sea and supplies affect morale
    if (!this.inPort) this.timeAtSea += dt;
    this.food = Math.max(this.food - dt * 0.05, 0);
    let moraleLoss = dt * 0.02 + (this.timeAtSea / 1000) * dt * 0.01;
    if (this.food <= 0) moraleLoss += dt * 0.1;
    this.adjustMorale(-moraleLoss);

    this.checkMutiny();

    const { x: dx, y: dy } = this.forward(dt);
    let newX = this.x + dx;
    let newY = this.y + dy;

    if (tiles && gridSize) {
      const tile = tileAt(tiles, newX, newY, gridSize);
      const isBlocked = t =>
        t === Terrain.LAND ||
        t === Terrain.COAST ||
        t === Terrain.HILL ||
        t === Terrain.VILLAGE;

      if (isBlocked(tile)) {
        const tileX = tileAt(tiles, this.x + dx, this.y, gridSize);
        const tileY = tileAt(tiles, this.x, this.y + dy, gridSize);
        if (!isBlocked(tileX)) {
          newX = this.x + dx;
          newY = this.y;
        } else if (!isBlocked(tileY)) {
          newX = this.x;
          newY = this.y + dy;
        } else {
          newX = this.x;
          newY = this.y;
        }
      }
    }

    // Clamp to world bounds before committing
    if (typeof worldWidth === 'number') {
      newX = Math.max(0, Math.min(newX, worldWidth));
    }
    if (typeof worldHeight === 'number') {
      newY = Math.max(0, Math.min(newY, worldHeight));
    }

    this.x = newX;
    this.y = newY;

    // Apply friction so ships gradually slow down
    this.speed *= Math.pow(0.98, dt);
    if (Math.abs(this.speed) < 0.01) {
      this.speed = 0;
    }
  }

  setSail(state) {
    this.sail = Math.max(0, Math.min(1, state));
  }

  changeType(type) {
    const stats = SHIP_TYPES[type];
    if (!stats) return;
    this.type = type;
    this.baseMaxSpeed = stats.speed;
    this.maxSpeed = stats.speed;
    this.hullMax = stats.hull;
    this.hull = Math.min(this.hull, this.hullMax);
    this.cargoCapacity = stats.cargo;
    this.crew = Math.min(this.crew, stats.crew);
    this.crewMax = stats.crew;
    let used = Object.values(this.cargo).reduce((a, b) => a + b, 0);
    if (used > this.cargoCapacity) {
      for (const good of Object.keys(this.cargo)) {
        if (used <= this.cargoCapacity) break;
        const remove = Math.min(this.cargo[good], used - this.cargoCapacity);
        this.cargo[good] -= remove;
        if (this.cargo[good] <= 0) delete this.cargo[good];
        used -= remove;
      }
    }
    this.updateCrewStats();
    this.updateAppearance();
  }

  setNation(nation) {
    this.nation = nation;
    this.updateAppearance();
  }

  updateAppearance() {
    this.img = getShipSprite(this.type, this.nation);
    this.flag = getFlag(this.nation);
  }

  draw(ctx, offsetX = 0, offsetY = 0, tileWidth, tileIsoHeight, tileImageHeight) {
    const { isoX: offX, isoY: offY } = cartToIso(
      offsetX,
      offsetY,
      tileWidth,
      tileIsoHeight,
      tileImageHeight
    );

    if (!this.sunk) {
      const img = this.img;
      const flag = this.flag;
      const { isoX, isoY } = cartToIso(
        this.x,
        this.y,
        tileWidth,
        tileIsoHeight,
        tileImageHeight
      );
      if (img) {
        ctx.save();
        ctx.translate(isoX - offX, isoY - offY);
        ctx.rotate(this.angle);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        if (flag) {
          ctx.drawImage(flag, -flag.width / 2, -img.height / 2 - flag.height);
        }
        ctx.restore();
      } else {
        ctx.fillStyle = 'brown';
        ctx.fillRect(isoX - 5 - offX, isoY - 5 - offY, 10, 10);
      }
    }

    this.projectiles.forEach(p =>
      p.draw(ctx, offsetX, offsetY, tileWidth, tileIsoHeight, tileImageHeight)
    );
  }

  fireCannons() {
    if (this.sunk || this.fireCooldown > 0) return;
    this.projectiles.push(
      new Projectile(this.x, this.y, this.angle, this.cannonDamage, this.cannonRange)
    );
    this.fireCooldown = this.fireRate;
  }

  takeDamage(amount) {
    this.hull -= amount;
    const crewLoss = Math.min(this.crew, Math.floor(amount / 10));
    if (crewLoss > 0) {
      this.crew -= crewLoss;
      this.adjustMorale(-crewLoss * 2);
      this.updateCrewStats();
    }
    if (this.hull <= 0) {
      this.sunk = true;
    }
  }

  ram(target) {
    if (this.ramCooldown > 0 || !target || this.sunk || target.sunk) return;
    const dist = cartesian(this.x, this.y, target.x, target.y);
    if (dist > 20) return;
    const impact = this.speed * 20;
    target.takeDamage(impact);
    this.takeDamage(impact * 0.5);
    this.speed *= 0.5;
    this.ramCooldown = this.ramRate;
  }

  updateCrewStats() {
    const ratio = Math.max(this.crew / this.crewMax, 0.1);
    this.fireRate = this.baseFireRate / ratio;
    this.maxSpeed = this.baseMaxSpeed * ratio;
  }

  adjustMorale(amount) {
    this.morale = Math.max(0, Math.min(100, this.morale + amount));
  }

  visitPort() {
    this.inPort = true;
    this.timeAtSea = 0;
    this.food = 100;
    this.adjustMorale(20);
  }

  distributeLoot(amount = 10) {
    if (this.gold >= amount) {
      this.gold -= amount;
      this.adjustMorale(amount);
      bus.emit('log', 'Crew shares the loot. Morale rises.');
    }
  }

  checkMutiny() {
    if (this.morale < 20 && Math.random() < 0.005) {
      if (this.crew > 0) {
        this.crew--;
        bus.emit('log', 'Mutiny! A crew member deserted.');
        this.adjustMorale(5);
      }
    }
    if (this.crew <= 0 && !this.mutinied) {
      this.mutinied = true;
      bus.emit('log', 'Your crew has taken the ship! Game over.');
    }
  }

  adjustReputation(nation, amount) {
    if (this.reputation[nation] === undefined) this.reputation[nation] = 0;
    this.reputation[nation] += amount;
  }
}

Ship.wind = { speed: 0, angle: 0 };
Ship.TYPES = SHIP_TYPES;

