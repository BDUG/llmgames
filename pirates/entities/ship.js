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
    ctx.fillStyle = 'brown';
    ctx.fillRect(this.x - 5, this.y - 5, 10, 10);
  }
}
