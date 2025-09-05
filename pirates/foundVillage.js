import { Terrain } from './world.js';
import { City } from './entities/city.js';
import { bus } from './bus.js';
import { isUnlocked } from './research.js';

function isIslandLand(t) {
  return (
    t === Terrain.LAND ||
    t === Terrain.HILL ||
    t === Terrain.DESERT ||
    t === Terrain.FOREST ||
    t === Terrain.COAST ||
    t === Terrain.VILLAGE ||
    t === Terrain.ROAD ||
    t === Terrain.NATIVE
  );
}

export function computeIslands(tiles) {
  const rows = tiles.length;
  const cols = tiles[0].length;
  const islandMap = Array.from({ length: rows }, () => Array(cols).fill(-1));
  const islands = [];
  let islandId = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (islandMap[r][c] !== -1 || !isIslandLand(tiles[r][c])) continue;
      const queue = [{ r, c }];
      islandMap[r][c] = islandId;
      const coast = [];
      while (queue.length) {
        const { r: qr, c: qc } = queue.shift();
        if (tiles[qr][qc] === Terrain.COAST) coast.push({ r: qr, c: qc });
        const dirs = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1]
        ];
        for (const [dr, dc] of dirs) {
          const nr = qr + dr;
          const nc = qc + dc;
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
      islands.push({ id: islandId, coast });
      islandId++;
    }
  }
  return { islands, islandMap };
}

export function foundVillage(
  tiles,
  gridSize,
  cities,
  cityMetadata,
  nation,
  goods = [],
  rng = Math.random,
  target = null
) {
  if (!tiles || !tiles.length) return null;
  const { islands, islandMap } = computeIslands(tiles);

  let tile, island;
  if (target) {
    const { r, c } = target;
    island = islands.find(i => i.id === islandMap[r]?.[c]);
    if (!island) return null;
    tile = target;
  } else {
    const candidates = islands
      .map(island => {
        const available = island.coast.filter(({ r, c }) => {
          if (tiles[r][c] !== Terrain.COAST) return false;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r + dr;
              const nc = c + dc;
              if (
                nr >= 0 &&
                nr < tiles.length &&
                nc >= 0 &&
                nc < tiles[0].length &&
                tiles[nr][nc] === Terrain.VILLAGE
              )
                return false;
            }
          }
          return true;
        });
        if (!available.length) return null;
        const owners = new Set();
        cityMetadata.forEach(meta => {
          if (meta.islandId === island.id) owners.add(meta.nation);
        });
        if (owners.size > 1 && !owners.has(nation)) return null;
        if (owners.size === 1 && !owners.has(nation)) return null;
        return { island, available };
      })
      .filter(Boolean);
    if (!candidates.length) return null;
    const choice = candidates[Math.floor(rng() * candidates.length)];
    island = choice.island;
    tile = choice.available[Math.floor(rng() * choice.available.length)];
  }

  tiles[tile.r][tile.c] = Terrain.VILLAGE;
  const x = tile.c * gridSize + gridSize / 2;
  const y = tile.r * gridSize + gridSize / 2;
  const count =
    [...cityMetadata.values()].filter(m => m.islandId === island.id).length + 1;
  const name = `Village ${island.id}-${count}`;
  const supplies = goods.filter(() => rng() < 0.5);
  const demands = goods.filter(g => !supplies.includes(g) && rng() < 0.5);
  const production = {};
  const consumption = {};
  const techBonus = isUnlocked('villageImprovements') ? 1 : 0;
  goods.forEach(g => {
    production[g] = supplies.includes(g)
      ? Math.floor(rng() * 3) + 1 + techBonus
      : 0;
    consumption[g] = demands.includes(g) ? Math.floor(rng() * 3) + 1 : 0;
  });
  const city = new City(x, y, name, nation);
  cities.push(city);
  cityMetadata.set(city, {
    nation,
    supplies,
    demands,
    production,
    consumption,
    islandId: island.id,
    shipyard: null,
    upgrades: {},
    roads: new Set()
  });
  bus.emit('village-founded', { city, nation });
  return city;
}

export function foundVillageAt(
  tiles,
  gridSize,
  cities,
  cityMetadata,
  nation,
  goods = [],
  target,
  rng = Math.random
) {
  if (!target) return null;
  const { islands, islandMap } = computeIslands(tiles);
  const { r, c } = target;
  if (tiles[r]?.[c] !== Terrain.COAST) return null;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (
        nr >= 0 &&
        nr < tiles.length &&
        nc >= 0 &&
        nc < tiles[0].length &&
        tiles[nr][nc] === Terrain.VILLAGE
      )
        return null;
    }
  }
  const islandId = islandMap[r]?.[c];
  const island = islands.find(i => i.id === islandId);
  if (!island) return null;
  const owners = new Set();
  cityMetadata.forEach(meta => {
    if (meta.islandId === islandId) owners.add(meta.nation);
  });
  if (owners.size > 1 && !owners.has(nation)) return null;
  if (owners.size === 1 && !owners.has(nation)) return null;
  return foundVillage(
    tiles,
    gridSize,
    cities,
    cityMetadata,
    nation,
    goods,
    rng,
    target
  );
}
