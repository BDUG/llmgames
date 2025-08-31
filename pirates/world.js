import { createNoise2D } from 'simplex-noise';

export const Terrain = {
  WATER: 0,
  LAND: 1,
  COAST: 2
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

  // Mark coastal water tiles adjacent to land.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (tiles[r][c] === Terrain.WATER) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && tiles[nr][nc] === Terrain.LAND) {
              tiles[r][c] = Terrain.COAST;
              dr = 2; // break outer loops
              break;
            }
          }
        }
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
      else if (t === Terrain.COAST) img = assets.tiles?.coast;
      else img = assets.tiles?.land;
      if (!img) continue;
      const x = c * gridSize - offsetX;
      const y = r * gridSize - offsetY;
      ctx.drawImage(img, x, y, gridSize, gridSize);
    }
  }
}
