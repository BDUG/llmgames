export class Ship {
  constructor(x, y, nation = 'Pirate') {
    this.x = x;
    this.y = y;
    this.nation = nation;
    this.speed = 1;
  }

  update(dt) {
    // Simple drift to show movement
    this.x += Math.cos(0) * this.speed * dt;
    this.y += Math.sin(0) * this.speed * dt;
  }

  draw(ctx) {
    ctx.fillStyle = 'brown';
    ctx.fillRect(this.x - 5, this.y - 5, 10, 10);
  }
}
