import { Terrain, cartToIso, tileAt } from '../world.js';

export class LandUnit {
  constructor(x, y, nation = 'Pirate') {
    this.x = x;
    this.y = y;
    this.nation = nation;
    this.speed = 0;
    this.maxSpeed = 2;
    this.angle = 0;
    this.turnSpeed = 0.05;
    this.cargo = {};
    this.cargoCapacity = 20;
    this.gold = 100;
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

  update(dt, tiles, gridSize, worldWidth, worldHeight) {
    const { x: dx, y: dy } = this.forward(dt);
    let newX = this.x + dx;
    let newY = this.y + dy;

    if (tiles && gridSize) {
      const tile = tileAt(tiles, newX, newY, gridSize);
      const isBlocked = t =>
        t === Terrain.WATER ||
        t === Terrain.REEF ||
        t === Terrain.RIVER;
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

    if (typeof worldWidth === 'number') {
      newX = Math.max(0, Math.min(newX, worldWidth));
    }
    if (typeof worldHeight === 'number') {
      newY = Math.max(0, Math.min(newY, worldHeight));
    }

    this.x = newX;
    this.y = newY;

    this.speed *= Math.pow(0.9, dt);
    if (Math.abs(this.speed) < 0.01) {
      this.speed = 0;
    }
  }

  cargoUsed() {
    return Object.values(this.cargo).reduce((a, b) => a + b, 0);
  }

  addCargo(good, amount) {
    const space = this.cargoCapacity - this.cargoUsed();
    const toAdd = Math.min(space, amount);
    if (toAdd > 0) {
      this.cargo[good] = (this.cargo[good] || 0) + toAdd;
    }
    return toAdd;
  }

  removeCargo(good, amount) {
    const available = this.cargo[good] || 0;
    const toRemove = Math.min(available, amount);
    if (toRemove > 0) {
      this.cargo[good] -= toRemove;
      if (this.cargo[good] <= 0) delete this.cargo[good];
    }
    return toRemove;
  }

  addGold(amount) {
    this.gold += amount;
  }

  spendGold(amount) {
    if (this.gold >= amount) {
      this.gold -= amount;
      return true;
    }
    return false;
  }

  draw(ctx, offsetX = 0, offsetY = 0, tileWidth, tileIsoHeight, tileImageHeight) {
    const { isoX: offX, isoY: offY } = cartToIso(
      offsetX,
      offsetY,
      tileWidth,
      tileIsoHeight,
      tileImageHeight
    );
    const { isoX, isoY } = cartToIso(
      this.x,
      this.y,
      tileWidth,
      tileIsoHeight,
      tileImageHeight
    );
    ctx.fillStyle = 'green';
    ctx.beginPath();
    ctx.arc(isoX - offX, isoY - offY, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
