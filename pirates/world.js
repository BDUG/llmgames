import { assets } from './assets.js';

// Attempt to import simplex-noise locally for Node environments; fall back to CDN for browsers.
let createNoise2D;
try {
  ({ createNoise2D } = await import('simplex-noise'));
} catch {
  ({ createNoise2D } = await import('https://cdn.skypack.dev/simplex-noise'));
}

export const Terrain = {
  WATER: 0,
  LAND: 1,
  HILL: 2,
  VILLAGE: 3,
  COAST: 4
};

export function generateWorld(width, height, gridSize, seed = Math.random()) {
  const rows = Math.floor(height / gridSize);
  const cols = Math.floor(width / gridSize);
  const tiles = Array.from({ length: rows }, () => Array(cols).fill(Terrain.WATER));
  const islandIds = Array.from({ length: rows }, () => Array(cols).fill(-1));

  let rngSeed = seed;
  const numIslands = 3 + Math.floor(seededRandom(rngSeed++) * 3); // 3-5 islands
  const islands = [];
  for (let i = 0; i < numIslands; i++) {
    const cx = Math.floor(seededRandom(rngSeed++) * cols);
    const cy = Math.floor(seededRandom(rngSeed++) * rows);
    const radius = Math.floor(6 + seededRandom(rngSeed++) * 10);
    const noise = createNoise2D(() => seededRandom(rngSeed++));
    islands.push({ cx, cy, radius, noise });
  }

  // Build islands
  islands.forEach((island, id) => {
    const { cx, cy, radius, noise } = island;
    const rStart = Math.max(0, Math.floor(cy - radius * 2));
    const rEnd = Math.min(rows - 1, Math.ceil(cy + radius * 2));
    const cStart = Math.max(0, Math.floor(cx - radius * 2));
    const cEnd = Math.min(cols - 1, Math.ceil(cx + radius * 2));
    for (let r = rStart; r <= rEnd; r++) {
      for (let c = cStart; c <= cEnd; c++) {
        const nx = (c - cx) / radius;
        const ny = (r - cy) / radius;
        const dist = Math.sqrt(nx * nx + ny * ny);
        const elevation = noise(c * 0.1, r * 0.1) - dist;
        if (elevation > 0) {
          tiles[r][c] = Terrain.LAND;
          islandIds[r][c] = id;
        }
      }
    }
  });

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

  // Randomly assign hills on interior land tiles.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (tiles[r][c] === Terrain.LAND) {
        const rand = seededRandom(rngSeed++);
        if (rand < 0.1) tiles[r][c] = Terrain.HILL;
      }
    }
  }

  // Choose one village on the coast of each island.
  const coastByIsland = islands.map(() => []);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (tiles[r][c] === Terrain.COAST) {
        const id = islandIds[r][c];
        if (id >= 0) coastByIsland[id].push({ r, c });
      }
    }
  }

  const villages = [];
  coastByIsland.forEach((coasts) => {
    if (!coasts.length) return;
    const idx = Math.floor(seededRandom(rngSeed++) * coasts.length);
    const { r, c } = coasts[idx];
    tiles[r][c] = Terrain.VILLAGE;
    villages.push({ r, c });
  });

  return { tiles, rows, cols, villages };
}

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function worldToIso(r, c, tileWidth, tileIsoHeight, tileImageHeight, offsetX = 0, offsetY = 0) {
  return {
    x: (c - r) * tileWidth / 2 - offsetX,
    y: (c + r) * tileIsoHeight / 2 - (tileImageHeight - tileIsoHeight) - offsetY
  };
}

export function cartToIso(x, y, tileWidth, tileIsoHeight, tileImageHeight) {
  tileWidth = tileWidth ?? assets.tiles?.land?.width ?? assets.tiles?.water?.width;
  tileImageHeight = tileImageHeight ?? assets.tiles?.land?.height ?? assets.tiles?.water?.height ?? tileWidth;
  tileIsoHeight = tileIsoHeight ?? tileImageHeight / 2;
  if (!tileWidth || !tileIsoHeight) return { isoX: x, isoY: y };
  return {
    isoX: (x - y) / 2,
    isoY: (x + y) * (tileIsoHeight / (2 * tileWidth)) - tileIsoHeight / 2
  };
}

// Convert isometric coordinates back into cartesian world space.
export function isoToCart(isoX, isoY, tileWidth, tileIsoHeight, tileImageHeight) {
  tileWidth = tileWidth ?? assets.tiles?.land?.width ?? assets.tiles?.water?.width;
  tileImageHeight = tileImageHeight ?? assets.tiles?.land?.height ?? assets.tiles?.water?.height ?? tileWidth;
  tileIsoHeight = tileIsoHeight ?? tileImageHeight / 2;
  if (!tileWidth || !tileIsoHeight) return { x: isoX, y: isoY };
  const cartX =
    isoX + ((isoY + tileIsoHeight / 2) * tileWidth) / tileIsoHeight;
  const cartY =
    ((isoY + tileIsoHeight / 2) * tileWidth) / tileIsoHeight - isoX;
  return { x: cartX, y: cartY };
}

// Translate canvas/screen coordinates into fractional tile indices.
export function screenToTile(
  cssX,
  cssY,
  tileWidth,
  tileIsoHeight,
  tileImageHeight,
  isoX = 0,
  isoY = 0
) {
  tileWidth = tileWidth ?? assets.tiles?.land?.width ?? assets.tiles?.water?.width;
  tileImageHeight = tileImageHeight ?? assets.tiles?.land?.height ?? assets.tiles?.water?.height ?? tileWidth;
  tileIsoHeight = tileIsoHeight ?? tileImageHeight / 2;
  const sy = cssY + isoY + (tileImageHeight - tileIsoHeight);
  const sx = cssX + isoX;
  return {
    r: sy / tileIsoHeight - sx / tileWidth,
    c: sy / tileIsoHeight + sx / tileWidth
  };
}

// Backward compatibility: accept cartesian offsets and convert internally.
export function screenToTileWithOffset(
  cssX,
  cssY,
  tileWidth,
  tileIsoHeight,
  tileImageHeight,
  offsetX = 0,
  offsetY = 0
) {
  const { isoX, isoY } = cartToIso(
    offsetX,
    offsetY,
    tileWidth,
    tileIsoHeight,
    tileImageHeight
  );
  return screenToTile(
    cssX,
    cssY,
    tileWidth,
    tileIsoHeight,
    tileImageHeight,
    isoX,
    isoY
  );
}

// Safely fetch the tile type for a cartesian world coordinate.
export function tileAt(tiles, x, y, gridSize) {
  const row = Math.floor(y / gridSize);
  const col = Math.floor(x / gridSize);
  if (row < 0 || row >= tiles.length || col < 0 || col >= tiles[0].length) {
    return Terrain.WATER;
  }
  return tiles[row][col];
}

export function drawWorld(ctx, tiles, tileWidth, tileIsoHeight, tileImageHeight, assets, offsetX=0, offsetY=0) {
  tileWidth = tileWidth ?? assets.tiles?.land?.width ?? assets.tiles?.water?.width;
  tileImageHeight = tileImageHeight ?? assets.tiles?.land?.height ?? assets.tiles?.water?.height ?? tileWidth;
  tileIsoHeight = tileIsoHeight ?? tileImageHeight / 2;
  if (!tileWidth || !tileIsoHeight || !tileImageHeight) return;

  const canvasWidth = ctx.canvas?.clientWidth ?? ctx.canvas?.width ?? 0;
  const canvasHeight = ctx.canvas?.clientHeight ?? ctx.canvas?.height ?? 0;

  const { isoX, isoY } = cartToIso(offsetX, offsetY, tileWidth, tileIsoHeight, tileImageHeight);

  const corners = [
    screenToTile(-tileWidth, -tileImageHeight, tileWidth, tileIsoHeight, tileImageHeight, isoX, isoY),
    screenToTile(canvasWidth + tileWidth, -tileImageHeight, tileWidth, tileIsoHeight, tileImageHeight, isoX, isoY),
    screenToTile(-tileWidth, canvasHeight + tileImageHeight, tileWidth, tileIsoHeight, tileImageHeight, isoX, isoY),
    screenToTile(canvasWidth + tileWidth, canvasHeight + tileImageHeight, tileWidth, tileIsoHeight, tileImageHeight, isoX, isoY)
  ];

  const rVals = corners.map(p => p.r);
  const cVals = corners.map(p => p.c);

  let firstRow = Math.max(0, Math.floor(Math.min(...rVals)));
  let lastRow = Math.min(tiles.length - 1, Math.ceil(Math.max(...rVals)));
  let firstCol = Math.max(0, Math.floor(Math.min(...cVals)));
  let lastCol = Math.min(tiles[0].length - 1, Math.ceil(Math.max(...cVals)));

  for (let r = firstRow; r <= lastRow; r++) {
    for (let c = firstCol; c <= lastCol; c++) {
      const t = tiles[r][c];
      let img;
      if (t === Terrain.WATER) img = assets.tiles?.water;
      else if (t === Terrain.HILL) img = assets.tiles?.hill;
      else if (t === Terrain.VILLAGE) img = assets.tiles?.village;
      else if (t === Terrain.COAST) img = assets.tiles?.coast || assets.tiles?.land;
      else img = assets.tiles?.land;
      if (!img) continue;
      const { x, y } = worldToIso(r, c, tileWidth, tileIsoHeight, tileImageHeight, isoX, isoY);
      ctx.drawImage(img, Math.round(x), Math.round(y), tileWidth, tileImageHeight);
    }
  }
}
