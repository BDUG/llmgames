import { assets } from './assets.js';
import { iso } from './utils/distance.js';

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
  COAST: 4,
  RIVER: 5,
  REEF: 6,
  DESERT: 7,
  FOREST: 8,
  ROAD: 9,
  NATIVE: 10,
  MISSION: 11
};

export function generateWorld(width, height, gridSize, options = {}, _attempt = 0) {
  const {
    seed = Math.random(),
    octaves = 4,
    persistence = 0.5,
    lacunarity = 2,
    seaLevel = 0,
    reefLevel = -0.05,
    hillLevel = 0.6,
    riverThreshold = 0.02,
    temperatureScale = 1,
    moistureScale = 1,
    // Multiplies the normalised coordinates before feeding them into the noise
    // function. Higher values produce more fragmented terrain by increasing the
    // noise frequency. The default is tuned for small islands.
    frequencyScale = 3,
    maxRetries = 10,
    // Limit for island size; islands exceeding this will be eroded.
    maxIslandSize = 400
  } = options;

  const rows = Math.floor(height / gridSize);
  const cols = Math.floor(width / gridSize);
  const tiles = Array.from({ length: rows }, () => Array(cols).fill(Terrain.WATER));

  let rngSeed = seed;
  const elevationNoise = createNoise2D(() => seededRandom(rngSeed++));
  const moistureNoise = createNoise2D(() => seededRandom(rngSeed++));
  const temperatureNoise = createNoise2D(() => seededRandom(rngSeed++));
  const riverNoise = createNoise2D(() => seededRandom(rngSeed++));

  const cardinals = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  const fbm = (noiseFn, x, y) => {
    let amp = 1;
    let freq = 1;
    let max = 0;
    let total = 0;
    for (let i = 0; i < octaves; i++) {
      total += amp * noiseFn(x * freq, y * freq);
      max += amp;
      amp *= persistence;
      freq *= lacunarity;
    }
    return total / max; // roughly [-1,1]
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const nx = c / cols;
      const ny = r / rows;
      const fx = nx * frequencyScale;
      const fy = ny * frequencyScale;
      const elevation = fbm(elevationNoise, fx, fy);
      const moisture = ((fbm(moistureNoise, fx, fy) + 1) / 2) * moistureScale;
      const temperature = ((fbm(temperatureNoise, fx, fy) + 1) / 2) * temperatureScale;
      const riverVal = Math.abs(riverNoise(nx * 4, ny * 4));

      if (elevation < seaLevel + reefLevel) {
        tiles[r][c] = Terrain.WATER;
      } else if (elevation < seaLevel) {
        tiles[r][c] = Terrain.REEF;
      } else if (riverVal < riverThreshold && elevation > seaLevel + 0.05) {
        tiles[r][c] = Terrain.RIVER;
      } else if (elevation > hillLevel) {
        tiles[r][c] = Terrain.HILL;
      } else {
        if (moisture < 0.3 && temperature > 0.5) tiles[r][c] = Terrain.DESERT;
        else if (moisture > 0.7) tiles[r][c] = Terrain.FOREST;
        else tiles[r][c] = Terrain.LAND;
      }
    }
  }

  // Flood-fill from map borders to identify the main ocean and remove inland lakes.
  const isWaterTile = t => t === Terrain.WATER || t === Terrain.REEF;
  const oceanMask = Array.from({ length: rows }, () => Array(cols).fill(false));
  const queue = [];
  for (let r = 0; r < rows; r++) {
    if (isWaterTile(tiles[r][0])) {
      oceanMask[r][0] = true;
      queue.push({ r, c: 0 });
    }
    if (isWaterTile(tiles[r][cols - 1])) {
      oceanMask[r][cols - 1] = true;
      queue.push({ r, c: cols - 1 });
    }
  }
  for (let c = 0; c < cols; c++) {
    if (isWaterTile(tiles[0][c])) {
      oceanMask[0][c] = true;
      queue.push({ r: 0, c });
    }
    if (isWaterTile(tiles[rows - 1][c])) {
      oceanMask[rows - 1][c] = true;
      queue.push({ r: rows - 1, c });
    }
  }
  while (queue.length) {
    const { r, c } = queue.shift();
    for (const [dr, dc] of cardinals) {
      const nr = r + dr;
      const nc = c + dc;
      if (
        nr >= 0 &&
        nr < rows &&
        nc >= 0 &&
        nc < cols &&
        !oceanMask[nr][nc] &&
        isWaterTile(tiles[nr][nc])
      ) {
        oceanMask[nr][nc] = true;
        queue.push({ r: nr, c: nc });
      }
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isWaterTile(tiles[r][c]) && !oceanMask[r][c]) {
        tiles[r][c] = Terrain.LAND;
      }
    }
  }

  // Mark shoreline tiles as coast (adjacent to ocean or reefs but not rivers).
  const isLand = t =>
    t === Terrain.LAND ||
    t === Terrain.HILL ||
    t === Terrain.DESERT ||
    t === Terrain.FOREST ||
    t === Terrain.ROAD ||
    t === Terrain.NATIVE ||
    t === Terrain.MISSION;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!isLand(tiles[r][c])) continue;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr,
            nc = c + dc;
          if (
            nr < 0 ||
            nr >= rows ||
            nc < 0 ||
            nc >= cols ||
            tiles[nr][nc] === Terrain.WATER ||
            tiles[nr][nc] === Terrain.REEF
          ) {
            tiles[r][c] = Terrain.COAST;
            dr = 2;
            break;
          }
        }
      }
    }
  }

  // Identify islands (contiguous land/coast masses).
  const buildIslands = () => {
    const islandMap = Array.from({ length: rows }, () => Array(cols).fill(-1));
    const islands = [];
    const isIslandLand = t =>
      t === Terrain.LAND ||
      t === Terrain.HILL ||
      t === Terrain.DESERT ||
      t === Terrain.FOREST ||
      t === Terrain.COAST ||
      t === Terrain.ROAD ||
      t === Terrain.NATIVE ||
      t === Terrain.MISSION;

    let islandId = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (islandMap[r][c] !== -1 || !isIslandLand(tiles[r][c])) continue;
        const queue = [{ r, c }];
        islandMap[r][c] = islandId;
        const coast = [];
        let size = 0;
        while (queue.length) {
          const { r: qr, c: qc } = queue.shift();
          size++;
          if (tiles[qr][qc] === Terrain.COAST) coast.push({ r: qr, c: qc });
          const dirs = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1]
          ];
          for (const [dr, dc] of dirs) {
            const nr = qr + dr,
              nc = qc + dc;
            if (
              nr < 0 ||
              nr >= rows ||
              nc < 0 ||
              nc >= cols ||
              islandMap[nr][nc] !== -1 ||
              !isIslandLand(tiles[nr][nc])
            )
              continue;
            islandMap[nr][nc] = islandId;
            queue.push({ r: nr, c: nc });
          }
        }
        islands.push({ id: islandId, coast, size });
        islandId++;
      }
    }
    return { islands, islandMap };
  };

  let { islands, islandMap } = buildIslands();

  // Erode islands that exceed the maximum allowed size.
  for (const island of islands) {
    if (island.size <= maxIslandSize) continue;
    const erodeQueue = island.coast.slice();
    while (island.size > maxIslandSize && erodeQueue.length) {
      const { r, c } = erodeQueue.shift();
      if (tiles[r][c] === Terrain.WATER) continue;
      tiles[r][c] = Terrain.WATER;
      oceanMask[r][c] = true;
      islandMap[r][c] = -1;
      island.size--;
      for (const [dr, dc] of cardinals) {
        const nr = r + dr,
          nc = c + dc;
        if (
          nr >= 0 &&
          nr < rows &&
          nc >= 0 &&
          nc < cols &&
          islandMap[nr][nc] === island.id &&
          tiles[nr][nc] !== Terrain.WATER
        ) {
          erodeQueue.push({ r: nr, c: nc });
        }
      }
    }
  }

  // Recompute islands after erosion to reflect updated tiles.
  ({ islands, islandMap } = buildIslands());

  const touchesOcean = island => {
    for (const { r, c } of island.coast) {
      for (const [dr, dc] of cardinals) {
        const nr = r + dr;
        const nc = c + dc;
        if (
          nr >= 0 &&
          nr < rows &&
          nc >= 0 &&
          nc < cols &&
          oceanMask[nr][nc]
        ) {
          return true;
        }
      }
    }
    return false;
  };

  if (
    (islands.length < 10 || islands.some(i => !touchesOcean(i))) &&
    _attempt < maxRetries
  ) {
    return generateWorld(
      width,
      height,
      gridSize,
      { ...options, seed: seed + 1 },
      _attempt + 1
    );
  }

  const {
    villagesPerIsland = 1,
    villageDensity,
    nativeDensity = 0.01
  } = options;

  const villages = [];
  const natives = [];
  const hasVillageNearby = (r, c) => {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr,
          nc = c + dc;
        if (
          nr >= 0 &&
          nr < rows &&
          nc >= 0 &&
          nc < cols &&
          tiles[nr][nc] === Terrain.VILLAGE
        )
          return true;
      }
    }
    return false;
  };
  for (const island of islands) {
    if (!island.coast.length) continue;
    let count;
    if (typeof villageDensity === 'number') {
      count = Math.max(1, Math.round(island.coast.length * villageDensity));
    } else {
      count = Math.min(villagesPerIsland, island.coast.length);
    }
    for (let i = 0; i < count && island.coast.length; ) {
      const idx = Math.floor(seededRandom(rngSeed++) * island.coast.length);
      const { r, c } = island.coast.splice(idx, 1)[0];
      if (hasVillageNearby(r, c)) continue;
      tiles[r][c] = Terrain.VILLAGE;
      villages.push({ r, c, islandId: island.id });
      i++;
    }
  }

  // Place native settlements after villages.
  const hasForestOrRiver = (r, c) => {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (
          nr >= 0 &&
          nr < rows &&
          nc >= 0 &&
          nc < cols &&
          (tiles[nr][nc] === Terrain.FOREST || tiles[nr][nc] === Terrain.RIVER)
        ) {
          return true;
        }
      }
    }
    return false;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (tiles[r][c] !== Terrain.LAND) continue;
      if (hasForestOrRiver(r, c) && seededRandom(rngSeed++) < nativeDensity) {
        tiles[r][c] = Terrain.NATIVE;
        natives.push({ r, c });
      }
    }
  }

  // Ensure at least one mission tile exists. Prefer converting a village
  // (so missions appear on settled coasts) but fall back to any coastal tile.
  const missions = [];
  if (villages.length) {
    const first = villages.shift();
    tiles[first.r][first.c] = Terrain.MISSION;
    missions.push(first);
  } else {
    for (let r = 0; r < rows && missions.length === 0; r++) {
      for (let c = 0; c < cols && missions.length === 0; c++) {
        if (tiles[r][c] === Terrain.COAST || tiles[r][c] === Terrain.LAND) {
          tiles[r][c] = Terrain.MISSION;
          missions.push({ r, c, islandId: islandMap?.[r]?.[c] ?? -1 });
        }
      }
    }
  }

  return { tiles, rows, cols, villages, natives, missions, islands };
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

export { iso };

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

  // Determine visible tile bounds.
  let firstRow = Math.max(0, Math.floor(Math.min(...rVals)));
  let lastRow = Math.min(tiles.length - 1, Math.ceil(Math.max(...rVals)));
  let firstCol = Math.max(0, Math.floor(Math.min(...cVals)));
  let lastCol = Math.min(tiles[0].length - 1, Math.ceil(Math.max(...cVals)));

  // Expand bounds by one tile in all directions to ensure edge tiles are drawn
  // when the camera pans near map boundaries.
  firstRow = Math.max(0, firstRow - 1);
  firstCol = Math.max(0, firstCol - 1);
  lastRow = Math.min(tiles.length - 1, lastRow + 1);
  lastCol = Math.min(tiles[0].length - 1, lastCol + 1);

  for (let r = firstRow; r <= lastRow; r++) {
    for (let c = firstCol; c <= lastCol; c++) {
      const t = tiles[r][c];
      let img;
      if (t === Terrain.WATER || t === Terrain.RIVER) img = assets.tiles?.water;
      else if (t === Terrain.HILL) img = assets.tiles?.hill;
      else if (t === Terrain.VILLAGE) img = assets.tiles?.village;
      else if (t === Terrain.MISSION) img = assets.tiles?.mission || assets.tiles?.village;
      else if (t === Terrain.NATIVE) img = assets.tiles?.native || assets.tiles?.village;
      else if (t === Terrain.ROAD) img = assets.tiles?.road || assets.tiles?.land;
      else if (t === Terrain.COAST || t === Terrain.REEF) img = assets.tiles?.coast || assets.tiles?.land;
      else img = assets.tiles?.land;
      if (!img) continue;
      const { x, y } = worldToIso(r, c, tileWidth, tileIsoHeight, tileImageHeight, isoX, isoY);
      ctx.drawImage(img, Math.round(x), Math.round(y), tileWidth, tileImageHeight);
    }
  }
}
