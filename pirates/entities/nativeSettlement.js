import { assets } from '../assets.js';
import { cartToIso } from '../world.js';

export class NativeSettlement {
  constructor(x, y, tribe) {
    this.x = x;
    this.y = y;
    this.name = tribe;
    this.tribe = tribe;
    this.relation = 0;
  }

  draw(ctx, offsetX = 0, offsetY = 0, tileWidth, tileIsoHeight, tileImageHeight) {
    const { isoX: offX, isoY: offY } = cartToIso(
      offsetX,
      offsetY,
      tileWidth,
      tileIsoHeight,
      tileImageHeight
    );
    const { isoX, isoY } = cartToIso(
      this.x,
      this.y,
      tileWidth,
      tileIsoHeight,
      tileImageHeight
    );
    const img = assets.tiles.native || assets.tiles.village;
    if (img) {
      ctx.save();
      ctx.translate(isoX - offX, isoY - offY);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    } else {
      ctx.fillStyle = 'brown';
      ctx.fillRect(isoX - 8 - offX, isoY - 8 - offY, 16, 16);
    }
  }
}
