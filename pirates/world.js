import { createNoise2D } from 'simplex-noise';

export const Terrain = {
  WATER: 0,
  LAND: 1,
  HILL: 2,
  VILLAGE: 3
};

export function generateWorld(width, height, gridSize, seed=Math.random()) {
  const rows = Math.floor(height / gridSize);
  const cols = Math.floor(width / gridSize);
  const noise2D = createNoise2D(() => seededRandom(seed++));
  const tiles = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) =>
      noise2D(c * 0.05, r * 0.05) > 0 ? Terrain.LAND : Terrain.WATER
    )
  );

  // Randomly assign hills and villages on land tiles.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (tiles[r][c] === Terrain.LAND) {
        const rand = seededRandom(seed++);
        if (rand < 0.1) tiles[r][c] = Terrain.HILL;
        else if (rand < 0.13) tiles[r][c] = Terrain.VILLAGE;
      }
    }
  }

  return { tiles, rows, cols };
}

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function drawWorld(ctx, tiles, gridSize, assets, offsetX=0, offsetY=0) {
  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < tiles[0].length; c++) {
      const t = tiles[r][c];
      let img;
      if (t === Terrain.WATER) img = assets.tiles?.water;
      else if (t === Terrain.HILL) img = assets.tiles?.hill;
      else if (t === Terrain.VILLAGE) img = assets.tiles?.village;
      else img = assets.tiles?.land;
      if (!img) continue;
      const x = c * gridSize - offsetX;
      const y = r * gridSize - offsetY;
      ctx.drawImage(img, x, y, gridSize, gridSize);
    }
  }
}
