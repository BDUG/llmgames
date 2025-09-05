import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld, Terrain } from '../pirates/world.js';

// Ensure every island coast is reachable from the player's spawn water tile.
test('all island coasts touch reachable ocean from spawn', () => {
  const gridSize = 16;
  const result = generateWorld(160, 160, gridSize, { seed: 5 });
  const { tiles, islands, missions } = result;
  let spawnR = missions[0].r;
  let spawnC = missions[0].c;
  const rows = tiles.length;
  const cols = tiles[0].length;

  const isWater = t => t === Terrain.WATER || t === Terrain.RIVER || t === Terrain.REEF;
  if (!isWater(tiles[spawnR][spawnC])) {
    const queue = [{ r: spawnR, c: spawnC }];
    const visited = new Set([`${spawnR},${spawnC}`]);
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];
    while (queue.length) {
      const { r, c } = queue.shift();
      if (isWater(tiles[r]?.[c])) {
        spawnR = r;
        spawnC = c;
        break;
      }
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (
          nr >= 0 &&
          nr < rows &&
          nc >= 0 &&
          nc < cols &&
          !visited.has(`${nr},${nc}`)
        ) {
          visited.add(`${nr},${nc}`);
          queue.push({ r: nr, c: nc });
        }
      }
    }
  }

  const reachable = new Set([`${spawnR},${spawnC}`]);
  const waterQueue = [{ r: spawnR, c: spawnC }];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];
  while (waterQueue.length) {
    const { r, c } = waterQueue.shift();
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (
        nr >= 0 &&
        nr < rows &&
        nc >= 0 &&
        nc < cols &&
        !reachable.has(`${nr},${nc}`) &&
        isWater(tiles[nr][nc])
      ) {
        reachable.add(`${nr},${nc}`);
        waterQueue.push({ r: nr, c: nc });
      }
    }
  }

  for (const island of islands) {
    assert.ok(
      island.coast.some(({ r, c }) =>
        dirs.some(([dr, dc]) =>
          reachable.has(`${r + dr},${c + dc}`)
        )
      ),
      `coast of island ${island.id} not reachable from spawn`
    );
  }
});
