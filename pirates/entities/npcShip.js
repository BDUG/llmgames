import { Ship } from './ship.js';
import { bus } from '../bus.js';

export class NpcShip extends Ship {
  constructor(x, y, nation = 'Pirate') {
    super(x, y, nation);
    this.state = 'patrol';
    this.detectRadius = 300;
    this.fleeRadius = 80;
    this._changeTimer = 0;
  }

  update(dt, tiles, gridSize, player) {
    const dist = Math.hypot(player.x - this.x, player.y - this.y);

    switch (this.state) {
      case 'patrol':
        this.speed = 1.5;
        this._changeTimer -= dt;
        if (this._changeTimer <= 0) {
          this.angle = Math.random() * Math.PI * 2;
          this._changeTimer = 60 + Math.random() * 60;
        }
        if (dist < this.detectRadius) {
          this.state = 'pursue';
          bus.emit('npc-spotted', { npc: this });
        }
        break;

      case 'pursue':
        this.speed = 2.5;
        this.angle = Math.atan2(player.y - this.y, player.x - this.x);
        if (dist < this.fleeRadius) {
          this.state = 'flee';
          bus.emit('npc-flee', { npc: this });
        } else if (dist > this.detectRadius * 1.5) {
          this.state = 'patrol';
        }
        break;

      case 'flee':
        this.speed = 3;
        this.angle = Math.atan2(this.y - player.y, this.x - player.x);
        if (dist > this.detectRadius * 2) {
          this.state = 'patrol';
        }
        break;
    }

    super.update(dt, tiles, gridSize);
  }
}
