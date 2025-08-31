export class City {
  constructor(x, y, name) {
    this.x = x;
    this.y = y;
    this.name = name;
  }

  draw(ctx) {
    ctx.fillStyle = 'gray';
    ctx.fillRect(this.x - 8, this.y - 8, 16, 16);
  }
}
