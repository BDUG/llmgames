import test from 'node:test';
import assert from 'node:assert/strict';
import { Terrain } from '../pirates/world.js';
import { City } from '../pirates/entities/city.js';
import { buildRoad } from '../pirates/ui/buildRoad.js';
import { calculateProduction } from '../pirates/npcEconomy.js';

const gridSize = 10;

function createCity(r, c, name) {
  const x = c * gridSize + gridSize / 2;
  const y = r * gridSize + gridSize / 2;
  return new City(x, y, name, 'Test');
}

test('building a road increases production', () => {
  const tiles = [
    [Terrain.LAND, Terrain.LAND, Terrain.LAND],
    [Terrain.LAND, Terrain.VILLAGE, Terrain.LAND],
    [Terrain.LAND, Terrain.LAND, Terrain.VILLAGE]
  ];

  const cityA = createCity(1, 1, 'A');
  const cityB = createCity(2, 2, 'B');

  const cityMetadata = new Map();
  cityMetadata.set(cityA, { production: { Sugar: 1 }, roads: new Set() });
  cityMetadata.set(cityB, { production: { Sugar: 1 }, roads: new Set() });

  const before = calculateProduction(cityMetadata.get(cityA)).Sugar;
  assert.equal(before, 1);

  buildRoad(tiles, cityA, cityB, cityMetadata, gridSize);
  assert.equal(tiles[2][1], Terrain.ROAD);
  assert.ok(cityMetadata.get(cityA).roads.has(cityB));

  const after = calculateProduction(cityMetadata.get(cityA)).Sugar;
  assert.ok(after > before);
});
