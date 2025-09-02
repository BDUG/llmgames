import { assets } from '../assets.js';
import { Terrain, cartToIso } from '../world.js';
import { Projectile } from './projectile.js';

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

    // cannon fire control
    this.fireCooldown = 0; // frames until next shot allowed
    this.fireRate = 30; // cooldown frames between shots
  }

  rotate(direction) {
    this.angle += this.turnSpeed * direction;
  }

  forward(dt) {
    return {
      x: Math.cos(this.angle) * this.speed * dt,
      y: Math.sin(this.angle) * this.speed * dt
    };
  }

  update(dt, tiles, gridSize) {
    this.projectiles = this.projectiles.filter(p => p.update());

    if (this.fireCooldown > 0) {
      this.fireCooldown = Math.max(this.fireCooldown - dt, 0);
    }

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
    this.speed *= 0.98;
    if (Math.abs(this.speed) < 0.01) {
      this.speed = 0;
    }
  }

  draw(ctx, offsetX = 0, offsetY = 0, tileWidth, tileIsoHeight, tileImageHeight) {
    if (!this.sunk) {
      const img = assets.ship?.Sloop?.[this.nation] || assets.ship?.Sloop?.England;
      if (img) {
        const { isoX, isoY } = cartToIso(this.x, this.y, tileWidth, tileIsoHeight, tileImageHeight);
        ctx.save();
        ctx.translate(isoX - offsetX, isoY - offsetY);
        ctx.rotate(this.angle);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();
      } else {
        const { isoX, isoY } = cartToIso(this.x, this.y, tileWidth, tileIsoHeight, tileImageHeight);
        ctx.fillStyle = 'brown';
        ctx.fillRect(isoX - 5 - offsetX, isoY - 5 - offsetY, 10, 10);
      }
    }

    this.projectiles.forEach(p => p.draw(ctx, offsetX, offsetY, tileWidth, tileIsoHeight, tileImageHeight));
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

  adjustReputation(nation, amount) {
    if (this.reputation[nation] === undefined) this.reputation[nation] = 0;
    this.reputation[nation] += amount;
  }
}

function tileAt(tiles, x, y, gridSize) {
  const row = Math.floor(y / gridSize);
  const col = Math.floor(x / gridSize);
  if (row < 0 || row >= tiles.length || col < 0 || col >= tiles[0].length) {
    return Terrain.LAND;
  }
  return tiles[row][col];
}
