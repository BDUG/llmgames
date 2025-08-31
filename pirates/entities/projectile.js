export class Projectile {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 6;
    this.life = 120; // frames
  }

  update() {
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
    this.life--;
    return this.life > 0;
  }

  draw(ctx, offsetX = 0, offsetY = 0) {
    ctx.save();
    ctx.translate(this.x - offsetX, this.y - offsetY);
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
