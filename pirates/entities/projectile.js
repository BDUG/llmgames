import { cartToIso } from '../world.js';

export class Projectile {
  constructor(x, y, angle, damage = 25, range = 300) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 6;
    this.damage = damage;
    this.range = range;
    this.traveled = 0;
  }

  update(dt) {
    const dx = Math.cos(this.angle) * this.speed * dt;
    const dy = Math.sin(this.angle) * this.speed * dt;
    this.x += dx;
    this.y += dy;
    this.traveled += Math.hypot(dx, dy);
    return this.traveled < this.range;
  }

  draw(ctx, offsetX = 0, offsetY = 0, tileWidth, tileIsoHeight, tileImageHeight) {
    const { isoX: offX, isoY: offY } = cartToIso(
      offsetX,
      offsetY,
      tileWidth,
      tileIsoHeight,
      tileImageHeight
    );
    const { isoX, isoY } = cartToIso(this.x, this.y, tileWidth, tileIsoHeight, tileImageHeight);
    ctx.save();
    ctx.translate(isoX - offX, isoY - offY);
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
