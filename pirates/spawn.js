import { Terrain } from './world.js';

// Find a water tile adjacent to a city belonging to playerNation.
// Returns { x, y, city } or null if no suitable city is found.
export function findSpawnPoint(cityMetadata, tiles, gridSize, playerNation) {
  if (!cityMetadata) return null;
  const isWater = t =>
    t === Terrain.WATER || t === Terrain.RIVER || t === Terrain.REEF;
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];
  for (const [city, meta] of cityMetadata.entries()) {
    if (meta.nation !== playerNation) continue;
    const startR = Math.floor(city.y / gridSize);
    const startC = Math.floor(city.x / gridSize);
    const queue = [{ r: startR, c: startC, d: 0 }];
    const visited = new Set([`${startR},${startC}`]);
    while (queue.length) {
      const { r, c, d } = queue.shift();
      if (d > 0 && isWater(tiles[r]?.[c])) {
        if (d === 1) {
          return {
            x: c * gridSize + gridSize / 2,
            y: r * gridSize + gridSize / 2,
            city
          };
        } else {
          break; // not adjacent, try next city
        }
      }
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (
          nr >= 0 &&
          nr < tiles.length &&
          nc >= 0 &&
          nc < tiles[0].length &&
          !visited.has(`${nr},${nc}`)
        ) {
          visited.add(`${nr},${nc}`);
          queue.push({ r: nr, c: nc, d: d + 1 });
        }
      }
    }
  }
  return null;
}
