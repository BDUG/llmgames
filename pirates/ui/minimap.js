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
  const desertColor = '#edc';
  const forestColor = '#040';
  const riverColor = '#05f';
  const roadColor = '#aaa';
  const isWater = t => t === Terrain.WATER || t === Terrain.REEF;
  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < tiles[0].length; c++) {
      const t = tiles[r][c];
      if (isWater(t)) continue;
      const x = (c / tiles[0].length) * width;
      const y = (r / tiles.length) * height;
      let color = landColor;
      if (t === Terrain.COAST) color = coastColor;
      else if (t === Terrain.DESERT) color = desertColor;
      else if (t === Terrain.FOREST) color = forestColor;
      else if (t === Terrain.RIVER) color = riverColor;
      else if (t === Terrain.ROAD) color = roadColor;
      ctx.fillStyle = color;
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
