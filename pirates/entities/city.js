import { assets } from '../assets.js';
import { cartToIso } from '../world.js';

export class City {
  constructor(x, y, name) {
    this.x = x;
    this.y = y;
    this.name = name;
  }

  draw(ctx, offsetX = 0, offsetY = 0) {
    const { isoX, isoY } = cartToIso(this.x, this.y);
    const img = assets.tiles.village;
    if (img) {
      ctx.save();
      ctx.translate(isoX - offsetX, isoY - offsetY);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    } else {
      ctx.fillStyle = 'gray';
      ctx.fillRect(isoX - 8 - offsetX, isoY - 8 - offsetY, 16, 16);
    }
  }
}
