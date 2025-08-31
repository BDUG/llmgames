import { assets } from '../assets.js';

export class City {
  constructor(x, y, name) {
    this.x = x;
    this.y = y;
    this.name = name;
  }

  draw(ctx, offsetX = 0, offsetY = 0) {
    const img = assets.tiles.village;
    if (img) {
      ctx.drawImage(img, this.x - img.width / 2 - offsetX, this.y - img.height / 2 - offsetY);
    } else {
      ctx.fillStyle = 'gray';
      ctx.fillRect(this.x - 8 - offsetX, this.y - 8 - offsetY, 16, 16);
    }
  }
}
