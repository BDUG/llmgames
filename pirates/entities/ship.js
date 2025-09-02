import { assets } from '../assets.js';
import { Terrain, cartToIso } from '../world.js';
import { Projectile } from './projectile.js';
import { bus } from '../bus.js';

export class Ship {
  constructor(x, y, nation = 'Pirate') {
    this.x = x;
    this.y = y;
    this.nation = nation;
    this.speed = 0;
    this.angle = 0;
    this.turnSpeed = 0.05;
    this.cargo = {};
    this.cargoCapacity = 20;
    this.gold = 100;
    this.crew = 10;
    this.hull = 100;
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
    this.fireRate = 30; // cooldown frames between shots
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

  update(dt, tiles, gridSize) {
    this.projectiles = this.projectiles.filter(p => p.update(dt));

    if (this.fireCooldown > 0) {
      this.fireCooldown = Math.max(this.fireCooldown - dt, 0);
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
      if (
        tile === Terrain.LAND ||
        tile === Terrain.COAST ||
        tile === Terrain.HILL ||
        tile === Terrain.VILLAGE
      ) {
        const tileX = tileAt(tiles, this.x + dx, this.y, gridSize);
        const tileY = tileAt(tiles, this.x, this.y + dy, gridSize);
        if (
          tileX !== Terrain.LAND &&
          tileX !== Terrain.COAST &&
          tileX !== Terrain.HILL &&
          tileX !== Terrain.VILLAGE
        ) {
          this.x += dx;
        } else if (
          tileY !== Terrain.LAND &&
          tileY !== Terrain.COAST &&
          tileY !== Terrain.HILL &&
          tileY !== Terrain.VILLAGE
        ) {
          this.y += dy;
        }
        return;
      }
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

  draw(ctx, offsetX = 0, offsetY = 0, tileWidth, tileIsoHeight, tileImageHeight) {
    const { isoX: offX, isoY: offY } = cartToIso(
      offsetX,
      offsetY,
      tileWidth,
      tileIsoHeight,
      tileImageHeight
    );

    if (!this.sunk) {
      const img = assets.ship?.Sloop?.[this.nation] || assets.ship?.Sloop?.England;
      const { isoX, isoY } = cartToIso(this.x, this.y, tileWidth, tileIsoHeight, tileImageHeight);
      if (img) {
        ctx.save();
        ctx.translate(isoX - offX, isoY - offY);
        ctx.rotate(this.angle);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
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
    this.projectiles.push(new Projectile(this.x, this.y, this.angle));
    this.fireCooldown = this.fireRate;
  }

  takeDamage(amount) {
    this.hull -= amount;
    if (this.hull <= 0) {
      this.sunk = true;
    }
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

function tileAt(tiles, x, y, gridSize) {
  const row = Math.floor(y / gridSize);
  const col = Math.floor(x / gridSize);
  if (row < 0 || row >= tiles.length || col < 0 || col >= tiles[0].length) {
    return Terrain.LAND;
  }
  return tiles[row][col];
}
