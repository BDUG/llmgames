import { assets, getFlag } from '../assets.js';
import { cartToIso } from '../world.js';

export class City {
  constructor(x, y, name, nation) {
    this.x = x;
    this.y = y;
    this.name = name;
    this.nation = nation;
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
    const img = assets.tiles.village;
    const flag = getFlag(this.nation);
    if (img) {
      ctx.save();
      ctx.translate(isoX - offX, isoY - offY);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      if (flag) {
        ctx.drawImage(flag, -flag.width / 2, -img.height / 2 - flag.height);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = 'gray';
      ctx.fillRect(isoX - 8 - offX, isoY - 8 - offY, 16, 16);
    }
  }
}
