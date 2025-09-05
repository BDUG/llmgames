import test from 'node:test';
import assert from 'node:assert/strict';
import { Terrain } from '../pirates/world.js';
import { findSpawnPoint } from '../pirates/spawn.js';
import { Ship } from '../pirates/entities/ship.js';

// Verify the spawn tile is water adjacent to the starting village and
// that the player's nation matches that village's nation.
test('spawn near starting village with matching nation', () => {
  const W = Terrain.WATER;
  const L = Terrain.LAND;
  const tiles = [
    [W, W, W],
    [W, L, W],
    [W, W, W]
  ];
  const gridSize = 10;
  const city = { x: 1 * gridSize + gridSize / 2, y: 1 * gridSize + gridSize / 2 };
  const cityMetadata = new Map([[city, { nation: 'England' }]]);
  const spawn = findSpawnPoint(cityMetadata, tiles, gridSize, 'England');
  assert.ok(spawn, 'spawn should be found');
  const ship = new Ship(spawn.x, spawn.y, 'England');
  assert.equal(ship.nation, cityMetadata.get(spawn.city).nation);
  const r = Math.floor(spawn.y / gridSize);
  const c = Math.floor(spawn.x / gridSize);
  assert.equal(tiles[r][c], Terrain.WATER);
  const cityR = Math.floor(city.y / gridSize);
  const cityC = Math.floor(city.x / gridSize);
  const dist = Math.abs(r - cityR) + Math.abs(c - cityC);
  assert.equal(dist, 1);
});
