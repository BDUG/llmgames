import { assets } from '../assets.js';
import { Terrain } from '../world.js';

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
    return {
      x: Math.cos(this.angle) * this.speed * dt,
      y: Math.sin(this.angle) * this.speed * dt
    };
  }

  update(dt, tiles, gridSize) {
    const { x: dx, y: dy } = this.forward(dt);
    let newX = this.x + dx;
    let newY = this.y + dy;

    if (tiles && gridSize) {
      const tile = tileAt(tiles, newX, newY, gridSize);
      if (
        tile === Terrain.LAND ||
        tile === Terrain.COAST ||
        tile === Terrain.HILL ||
        tile === Terrain.VILLAGE
      ) {
        const tileX = tileAt(tiles, this.x + dx, this.y, gridSize);
        const tileY = tileAt(tiles, this.x, this.y + dy, gridSize);
        if (
          tileX !== Terrain.LAND &&
          tileX !== Terrain.COAST &&
          tileX !== Terrain.HILL &&
          tileX !== Terrain.VILLAGE
        ) {
          this.x += dx;
        } else if (
          tileY !== Terrain.LAND &&
          tileY !== Terrain.COAST &&
          tileY !== Terrain.HILL &&
          tileY !== Terrain.VILLAGE
        ) {
          this.y += dy;
        }
        return;
      }
    }

    this.x = newX;
    this.y = newY;
  }

  draw(ctx, offsetX = 0, offsetY = 0) {
    const img = assets.ship?.Sloop?.[this.nation] || assets.ship?.Sloop?.England;
    if (img) {
      ctx.save();
      ctx.translate(this.x - offsetX, this.y - offsetY);
      ctx.rotate(this.angle);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    } else {
      ctx.fillStyle = 'brown';
      ctx.fillRect(this.x - 5 - offsetX, this.y - 5 - offsetY, 10, 10);
    }
  }
}

function tileAt(tiles, x, y, gridSize) {
  const row = Math.floor(y / gridSize);
  const col = Math.floor(x / gridSize);
  if (row < 0 || row >= tiles.length || col < 0 || col >= tiles[0].length) {
    return Terrain.LAND;
  }
  return tiles[row][col];
}
