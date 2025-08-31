import { createNoise2D } from 'https://cdn.skypack.dev/simplex-noise';
import { assets } from './assets.js';

export const Terrain = {
  WATER: 0,
  LAND: 1,
  HILL: 2,
  VILLAGE: 3,
  COAST: 4
};

export function generateWorld(width, height, gridSize, seed=Math.random()) {
  const rows = Math.floor(height / gridSize);
  const cols = Math.floor(width / gridSize);
  const noise2D = createNoise2D(() => seededRandom(seed++));
  // Basic heightmap using noise combined with a radial falloff to form an island.
  const tiles = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const nx = (c / cols) * 2 - 1;
      const ny = (r / rows) * 2 - 1;
      const dist = Math.sqrt(nx * nx + ny * ny); // 0 at center, ~1 at edges
      const elevation = noise2D(c * 0.05, r * 0.05) - dist; // falloff creates island
      return elevation > 0 ? Terrain.LAND : Terrain.WATER;
    })
  );

  // Mark land tiles adjacent to water as coast.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (tiles[r][c] !== Terrain.LAND) continue;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || tiles[nr][nc] === Terrain.WATER) {
            tiles[r][c] = Terrain.COAST;
            dr = 2; // break out
            break;
          }
        }
      }
    }
  }

  // Randomly assign hills and villages on interior land tiles.
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

export function worldToHalfStep(r, c, tileWidth, tileHeight, offsetX = 0, offsetY = 0) {
  const rowShift = (r % 2 === 0) ? -tileWidth / 2 : tileWidth / 2;
  return {
    x: c * tileWidth / 2 + rowShift - offsetX,
    y: r * tileHeight / 2 - offsetY
  };
}

export function cartToIso(x, y, tileWidth, tileHeight) {
  tileWidth = tileWidth ?? assets.tiles?.land?.width ?? assets.tiles?.water?.width;
  tileHeight = tileHeight ?? assets.tiles?.land?.height ?? assets.tiles?.water?.height ?? (tileWidth ? tileWidth / 2 : undefined);
  if (!tileWidth || !tileHeight) return { isoX: x, isoY: y };
  return {
    isoX: (x - y) / 2,
    isoY: (x + y) * (tileHeight / (2 * tileWidth))
  };
}

export function drawWorld(ctx, tiles, tileWidth, tileHeight, assets, offsetX=0, offsetY=0) {
  tileWidth = tileWidth ?? assets.tiles?.land?.width ?? assets.tiles?.water?.width;
  tileHeight = tileHeight ?? assets.tiles?.land?.height ?? assets.tiles?.water?.height ?? (tileWidth ? tileWidth / 2 : undefined);
  if (!tileWidth || !tileHeight) return;

  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < tiles[0].length; c++) {
      const t = tiles[r][c];
      let img;
      if (t === Terrain.WATER) img = assets.tiles?.water;
      else if (t === Terrain.HILL) img = assets.tiles?.hill;
      else if (t === Terrain.VILLAGE) img = assets.tiles?.village;
      else if (t === Terrain.COAST) img = assets.tiles?.coast || assets.tiles?.land;
      else img = assets.tiles?.land;
      if (!img) continue;
      const { x, y } = worldToHalfStep(r, c, tileWidth, tileHeight, offsetX, offsetY);
      ctx.drawImage(img, x, y, tileWidth, tileHeight);
    }
  }
}
