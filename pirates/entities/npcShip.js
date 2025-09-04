import { Ship } from './ship.js';
import { bus } from '../bus.js';
import { Projectile } from './projectile.js';
import { cartesian } from '../utils/distance.js';

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

    // firing behavior parameters
    this.fireRange = difficulty.range;
    this.accuracy = difficulty.accuracy;
  }

  update(dt, tiles, gridSize, player, worldWidth, worldHeight) {
    const dist = cartesian(player.x, player.y, this.x, this.y);
    const relation = bus.getRelation
      ? bus.getRelation(this.nation, player.nation)
      : 'peace';

    switch (this.state) {
      case 'patrol':
        this.speed = 1.5;
        this._changeTimer -= dt;
        if (this._changeTimer <= 0) {
          this.angle = Math.random() * Math.PI * 2;
          this._changeTimer = 60 + Math.random() * 60;
        }
        if (dist < this.detectRadius) {
          if (relation === 'war') {
            this.state = 'pursue';
            bus.emit('npc-spotted', { npc: this });
          } else if (relation === 'alliance') {
            this.state = 'escort';
          } else {
            this.state = 'avoid';
          }
        }
        break;

      case 'pursue':
        this.speed = 2.5;
        this.angle = Math.atan2(player.y - this.y, player.x - this.x);
        if (relation !== 'war' || dist > this.detectRadius * 1.5) {
          this.state = 'patrol';
        }
        break;

      case 'escort':
        this.speed = 2;
        this.angle = Math.atan2(player.y - this.y, player.x - this.x);
        if (relation !== 'alliance' || dist > this.detectRadius * 1.5) {
          this.state = 'patrol';
        }
        break;

      case 'avoid':
        this.speed = 3;
        this.angle = Math.atan2(this.y - player.y, this.x - player.x);
        if (relation !== 'peace' || dist > this.detectRadius) {
          this.state = 'patrol';
        }
        break;
    }

    super.update(dt, tiles, gridSize, worldWidth, worldHeight);
  }

  fireCannons(target) {
    if (!target || this.sunk || this.fireCooldown > 0) return;

    const relation = bus.getRelation
      ? bus.getRelation(this.nation, target.nation)
      : 'peace';
    if (relation !== 'war') return;

    const dist = cartesian(target.x, target.y, this.x, this.y);
    if (dist > this.fireRange) return;

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

    this.projectiles.push(new Projectile(this.x, this.y, aimAngle));
    this.fireCooldown = this.fireRate;
  }
}
