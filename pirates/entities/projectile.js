import { cartToIso } from '../world.js';

export class Projectile {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 6;
    this.life = 120; // frames
  }

  update(dt) {
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    this.life -= dt;
    return this.life > 0;
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
