import { assets } from '../assets.js';

export class City {
  constructor(x, y, name) {
    this.x = x;
    this.y = y;
    this.name = name;
  }

  draw(ctx) {
    const img = assets.city;
    if (img) {
      ctx.drawImage(img, this.x - img.width / 2, this.y - img.height / 2);
    } else {
      ctx.fillStyle = 'gray';
      ctx.fillRect(this.x - 8, this.y - 8, 16, 16);
    }
  }
}
