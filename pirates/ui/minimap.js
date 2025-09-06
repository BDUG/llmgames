import { Terrain } from '../world.js';

export function initMinimap() {
  // nothing needed for now
}

export function drawMinimap(
  ctx,
  tiles,
  player,
  worldWidth,
  worldHeight,
  cities = []
) {
  if (!ctx || !tiles) return;
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0af';
  ctx.fillRect(0, 0, width, height);
  const landColor = '#070';
  const coastColor = '#c90';
  const isWater = t =>
    t === Terrain.WATER || t === Terrain.RIVER || t === Terrain.REEF;
  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < tiles[0].length; c++) {
      const t = tiles[r][c];
      if (isWater(t)) continue;
      const x = (c / tiles[0].length) * width;
      const y = (r / tiles.length) * height;
      ctx.fillStyle = t === Terrain.COAST ? coastColor : landColor;
      ctx.fillRect(x, y, width / tiles[0].length, height / tiles.length);
    }
  }
  // Draw city markers
  ctx.fillStyle = '#ff0';
  cities.forEach(city => {
    const x = (city.x / worldWidth) * width;
    const y = (city.y / worldHeight) * height;
    ctx.fillRect(x - 1, y - 1, 2, 2);
  });
  if (player) {
    ctx.fillStyle = '#f00';
    const x = (player.x / worldWidth) * width;
    const y = (player.y / worldHeight) * height;
    ctx.fillRect(x - 2, y - 2, 4, 4);
  }
}
