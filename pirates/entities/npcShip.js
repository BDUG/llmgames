import { Ship } from './ship.js';
import { bus } from '../bus.js';
import { Projectile } from './projectile.js';
import { cartesian } from '../utils/distance.js';
import { priceFor } from '../ui/trade.js';
import { findPath } from '../utils/pathfinding.js';
import { tileAt, Terrain } from '../world.js';

// Tunable difficulty parameters for NPC behavior
export const npcDifficulty = {
  range: 200, // max distance to attempt firing
  accuracy: Math.PI / 8 // required facing tolerance (radians)
};

export class NpcShip extends Ship {
  constructor(x, y, nation = 'Pirate', type = 'Sloop', difficulty = npcDifficulty) {
    super(x, y, nation, type);
    this.state = 'patrol';
    this.detectRadius = 300;
    this._changeTimer = 0;
    this.tradeRoute = null;
    this.targetCity = null;
    this.loaded = false;
    this.prevState = null;
    this.home = null;

    // firing behavior parameters
    this.cannonRange = difficulty.range;
    this.accuracy = difficulty.accuracy;

    // pathfinding
    this.path = null;
    this.pathIndex = 0;
    this._pathTarget = null;
    this._pathTargetObj = null;
    this._repathTimer = 0;
  }

  chooseTradeRoute(cityMetadata, fromCity = null) {
    const cities = Array.from(cityMetadata?.keys?.() || []);
    if (cities.length < 2) return null;
    const source = fromCity || cities[Math.floor(Math.random() * cities.length)];
    let dest = source;
    while (dest === source) dest = cities[Math.floor(Math.random() * cities.length)];
    return { source, dest };
  }

  cargoUsed() {
    return Object.values(this.cargo).reduce((a, b) => a + b, 0);
  }

  loadCargo(city, metadata) {
    if (!metadata) return;
    metadata.inventory = metadata.inventory || {};
    const goods = (metadata.supplies || []).filter(
      g => (metadata.inventory[g] || 0) > 0
    );
    if (!goods.length) return;
    const good = goods[Math.floor(Math.random() * goods.length)];
    while (
      this.cargoUsed() < this.cargoCapacity &&
      metadata.inventory[good] > 0
    ) {
      const price = priceFor(good, metadata);
      if (this.gold < price) break;
      this.gold -= price;
      this.cargo[good] = (this.cargo[good] || 0) + 1;
      metadata.inventory[good] -= 1;
      const oldPrice = metadata.prices[good];
      metadata.prices[good] = Math.round(oldPrice * 1.1);
      bus.emit('price-change', {
        city,
        good,
        delta: metadata.prices[good] - oldPrice
      });
    }
  }

  unloadCargo(city, metadata) {
    if (!metadata) return;
    metadata.inventory = metadata.inventory || {};
    for (const good of Object.keys(this.cargo)) {
      while (this.cargo[good] > 0) {
        const sellPrice = Math.floor(priceFor(good, metadata) * 0.9);
        this.cargo[good] -= 1;
        this.gold += sellPrice;
        metadata.inventory[good] = (metadata.inventory[good] || 0) + 1;
        const oldPrice = metadata.prices[good];
        metadata.prices[good] = Math.max(
          1,
          Math.round(oldPrice * 0.9)
        );
        bus.emit('price-change', {
          city,
          good,
          delta: metadata.prices[good] - oldPrice
        });
      }
      if (this.cargo[good] <= 0) delete this.cargo[good];
    }
  }

  computePath(destX, destY, tiles, gridSize, obj = null) {
    if (!tiles) {
      this.path = null;
      this.pathIndex = 0;
      this._pathTarget = { x: destX, y: destY };
      this._pathTargetObj = obj;
      this._repathTimer = 60;
      return;
    }
    this.path = findPath(this.x, this.y, destX, destY, tiles, gridSize);
    this.pathIndex = 0;
    this._pathTarget = { x: destX, y: destY };
    this._pathTargetObj = obj;
    this._repathTimer = 120;
  }

  followPath(gridSize, tiles) {
    if (!this.path || this.pathIndex >= this.path.length) return false;
    const waypoint = this.path[this.pathIndex];
    const tile = tileAt(tiles, waypoint.x, waypoint.y, gridSize);
    const isBlocked = t =>
      t === Terrain.LAND ||
      t === Terrain.COAST ||
      t === Terrain.HILL ||
      t === Terrain.VILLAGE;
    if (isBlocked(tile)) {
      this.path = null;
      return false;
    }
    const d = cartesian(this.x, this.y, waypoint.x, waypoint.y);
    if (d < gridSize * 0.5) {
      this.pathIndex++;
      if (this.pathIndex >= this.path.length) return false;
    }
    const next = this.path[this.pathIndex];
    this.angle = Math.atan2(next.y - this.y, next.x - this.x);
    return true;
  }

  update(
    dt,
    tiles,
    gridSize,
    player,
    worldWidth,
    worldHeight,
    cityMetadata
  ) {
    const dist = cartesian(player.x, player.y, this.x, this.y);
    const relation = bus.getRelation
      ? bus.getRelation(this.nation, player.nation)
      : 'peace';

    this._repathTimer = Math.max(this._repathTimer - dt, 0);

    if (
      this.state !== 'pursue' &&
      this.state !== 'escort' &&
      this.state !== 'avoid' &&
      dist < this.detectRadius
    ) {
      this.prevState = this.state;
      if (relation === 'war') {
        this.state = 'pursue';
        bus.emit('npc-spotted', { npc: this });
      } else if (relation === 'alliance') {
        this.state = 'escort';
      } else {
        this.state = 'avoid';
      }
    }

    const wind = Ship.wind || { speed: 0, angle: 0 };
    switch (this.state) {
      case 'patrol':
        this.speed = 1.5;
        this._changeTimer -= dt;
        if (this._changeTimer <= 0) {
          this.angle = Math.random() * Math.PI * 2;
          this._changeTimer = 60 + Math.random() * 60;
        }
        if (!this.tradeRoute && cityMetadata?.size >= 2) {
          this.tradeRoute = this.chooseTradeRoute(cityMetadata);
          this.targetCity = this.tradeRoute?.source || null;
          this.state = this.tradeRoute ? 'trade' : 'patrol';
        }
        break;

      case 'trade': {
        if (!this.tradeRoute || !cityMetadata?.size) {
          this.state = 'patrol';
          break;
        }
        if (!this.targetCity) this.targetCity = this.tradeRoute.source;
        const target = this.targetCity;
        this.speed = 2;
        if (
          !this.path ||
          this._repathTimer <= 0 ||
          this._pathTargetObj !== target
        ) {
          this.computePath(target.x, target.y, tiles, gridSize, target);
        }
        const routed = this.followPath(gridSize, tiles);
        if (!routed) {
          this.angle = Math.atan2(target.y - this.y, target.x - this.x);
        }
        const cityDist = cartesian(target.x, target.y, this.x, this.y);
        if (cityDist < gridSize) {
          this.inPort = true;
          this.speed = 0;
          const metadata = cityMetadata.get(target);
          if (!this.loaded && target === this.tradeRoute.source) {
            this.loadCargo(target, metadata);
            this.loaded = true;
            this.targetCity = this.tradeRoute.dest;
          } else if (this.loaded && target === this.tradeRoute.dest) {
            this.unloadCargo(target, metadata);
            const route = this.chooseTradeRoute(cityMetadata, target);
            if (route) {
              this.tradeRoute = route;
              this.targetCity = route.dest;
              this.loadCargo(route.source, cityMetadata.get(route.source));
              this.loaded = true;
            } else {
              this.state = 'patrol';
            }
          }
        } else {
          this.inPort = false;
        }
        break;
      }

      case 'europe-trade': {
        if (this.loaded && this.targetCity) {
          const t = this.targetCity;
          this.speed = 2;
          if (
            !this.path ||
            this._repathTimer <= 0 ||
            this._pathTargetObj !== t
          ) {
            this.computePath(t.x, t.y, tiles, gridSize, t);
          }
          const routed = this.followPath(gridSize, tiles);
          if (!routed) {
            this.angle = Math.atan2(t.y - this.y, t.x - this.x);
          }
          const d = cartesian(t.x, t.y, this.x, this.y);
          if (d < gridSize) {
            const metadata = cityMetadata.get(t);
            if (metadata) {
              metadata.inventory = metadata.inventory || {};
              for (const good of Object.keys(this.cargo)) {
                metadata.inventory[good] =
                  (metadata.inventory[good] || 0) + this.cargo[good];
              }
            }
            this.cargo = {};
            this.loaded = false;
          }
        } else if (this.home) {
          this.speed = 2;
          if (
            !this.path ||
            this._repathTimer <= 0 ||
            this._pathTargetObj !== this.home
          ) {
            this.computePath(this.home.x, this.home.y, tiles, gridSize, this.home);
          }
          const routed = this.followPath(gridSize, tiles);
          if (!routed) {
            this.angle = Math.atan2(this.home.y - this.y, this.home.x - this.x);
          }
          const d = cartesian(this.home.x, this.home.y, this.x, this.y);
          if (d < gridSize) {
            this.sunk = true;
          }
        }
        break;
      }

      case 'pursue': {
        this.speed = 2.5;
        if (
          !this.path ||
          this._repathTimer <= 0 ||
          cartesian(
            player.x,
            player.y,
            this._pathTarget?.x || 0,
            this._pathTarget?.y || 0
          ) > gridSize
        ) {
          this.computePath(player.x, player.y, tiles, gridSize, player);
        }
        const routed = this.followPath(gridSize, tiles);
        if (!routed) {
          this.angle = Math.atan2(player.y - this.y, player.x - this.x);
        }
        // tack slightly toward the wind to maintain speed when sailing upwind
        if (Math.cos(wind.angle - this.angle) < 0) {
          this.angle += 0.02 * Math.sign(Math.sin(wind.angle - this.angle));
        }
        if (relation !== 'war' || dist > this.detectRadius * 1.5) {
          this.state = this.prevState || 'patrol';
        }
        break;
      }

      case 'escort': {
        this.speed = 2;
        if (
          !this.path ||
          this._repathTimer <= 0 ||
          cartesian(
            player.x,
            player.y,
            this._pathTarget?.x || 0,
            this._pathTarget?.y || 0
          ) > gridSize
        ) {
          this.computePath(player.x, player.y, tiles, gridSize, player);
        }
        const routed = this.followPath(gridSize, tiles);
        if (!routed) {
          this.angle = Math.atan2(player.y - this.y, player.x - this.x);
        }
        if (relation !== 'alliance' || dist > this.detectRadius * 1.5) {
          this.state = this.prevState || 'patrol';
        }
        break;
      }

      case 'avoid': {
        this.speed = 3;
        if (
          !this.path ||
          this._repathTimer <= 0 ||
          cartesian(
            player.x,
            player.y,
            this._pathTarget?.x || 0,
            this._pathTarget?.y || 0
          ) > gridSize
        ) {
          // move away from player
          const awayX = this.x + (this.x - player.x);
          const awayY = this.y + (this.y - player.y);
          this.computePath(awayX, awayY, tiles, gridSize);
        }
        const routed = this.followPath(gridSize, tiles);
        if (!routed) {
          this.angle = Math.atan2(this.y - player.y, this.x - player.x);
        }
        // favor sailing with the wind when fleeing
        if (Math.cos(wind.angle - this.angle) < 0) {
          this.angle += 0.02 * Math.sign(Math.sin(wind.angle - this.angle));
        }
        if (relation !== 'peace' || dist > this.detectRadius) {
          this.state = this.prevState || 'patrol';
        }
        break;
      }
    }

    super.update(dt, tiles, gridSize, worldWidth, worldHeight);
    if (this.state === 'pursue') {
      this.ram(player);
    }
  }

  fireCannons(target) {
    if (!target || this.sunk || this.fireCooldown > 0) return;

    const relation = bus.getRelation
      ? bus.getRelation(this.nation, target.nation)
      : 'peace';
    if (relation !== 'war') return;

    const dist = cartesian(target.x, target.y, this.x, this.y);
    if (dist > this.cannonRange) return;

    // predict target movement to lead shots
    const projectileSpeed = 6; // matches Projectile default speed
    const targetVx = Math.cos(target.angle) * target.speed;
    const targetVy = Math.sin(target.angle) * target.speed;
    const time = dist / projectileSpeed;
    const predictedX = target.x + targetVx * time;
    const predictedY = target.y + targetVy * time;
    const aimAngle = Math.atan2(predictedY - this.y, predictedX - this.x);

    // orientation check based on accuracy tolerance
    const angleDiff = Math.atan2(
      Math.sin(aimAngle - this.angle),
      Math.cos(aimAngle - this.angle)
    );
    if (Math.abs(angleDiff) > this.accuracy) return;

    this.projectiles.push(
      new Projectile(
        this.x,
        this.y,
        aimAngle,
        this.cannonDamage,
        this.cannonRange
      )
    );
    this.fireCooldown = this.fireRate;
  }
}
