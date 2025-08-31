import { assets } from '../assets.js';

export class Ship {
  constructor(x, y, nation = 'Pirate') {
    this.x = x;
    this.y = y;
    this.nation = nation;
    this.speed = 0;
    this.angle = 0;
    this.turnSpeed = 0.05;
  }

  rotate(direction) {
    this.angle += this.turnSpeed * direction;
  }

  forward(dt) {
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
  }

  update(dt) {
    this.forward(dt);
  }

  draw(ctx) {
    const img = assets.ship?.Sloop?.[this.nation] || assets.ship?.Sloop?.England;
    if (img) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    } else {
      ctx.fillStyle = 'brown';
      ctx.fillRect(this.x - 5, this.y - 5, 10, 10);
    }
  }
}
