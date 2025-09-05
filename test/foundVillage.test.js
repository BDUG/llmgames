import test from 'node:test';
import assert from 'node:assert/strict';
import { Terrain } from '../pirates/world.js';
import { drawMinimap } from '../pirates/ui/minimap.js';
import {
  foundVillage,
  computeIslands,
  foundVillageAt
} from '../pirates/foundVillage.js';
import { City } from '../pirates/entities/city.js';
import { NpcShip } from '../pirates/entities/npcShip.js';
import { bus } from '../pirates/bus.js';

const GOODS = ['Sugar'];

function makeCtx() {
  const calls = [];
  return {
    calls,
    canvas: { width: 100, height: 100 },
    fillStyle: '#000',
    clearRect: () => {},
    fillRect: (...args) => calls.push(args)
  };
}

test('foundVillage creates village and renders on minimap', () => {
  const W = Terrain.WATER, C = Terrain.COAST, L = Terrain.LAND;
  const tiles = [
    [W, C, W],
    [C, L, C],
    [W, C, W]
  ];
  const gridSize = 10;
  const cities = [];
  const cityMetadata = new Map();
  const city = foundVillage(
    tiles,
    gridSize,
    cities,
    cityMetadata,
    'England',
    GOODS,
    () => 0
  );
  assert.ok(city);
  assert.equal(tiles[0][1], Terrain.VILLAGE);
  assert.equal(cities.length, 1);
  assert.equal(cityMetadata.get(city).nation, 'England');
  const ctx = makeCtx();
  const worldWidth = tiles[0].length * gridSize;
  const worldHeight = tiles.length * gridSize;
  drawMinimap(ctx, tiles, null, worldWidth, worldHeight, cities);
  assert.ok(ctx.calls.some(c => c[2] === 2 && c[3] === 2));
});

test('new village joins trade routes and respects diplomacy', () => {
  const W = Terrain.WATER, C = Terrain.COAST, L = Terrain.LAND, V = Terrain.VILLAGE;
  const tiles = [
    [W, V, W, W, C, W],
    [W, L, W, W, L, W],
    [W, C, W, W, C, W]
  ];
  const gridSize = 10;
  const cities = [];
  const cityMetadata = new Map();
  const { islandMap } = computeIslands(tiles);
  const islandAId = islandMap[0][1];
  const cityA = new City(1 * gridSize + gridSize / 2, gridSize / 2, 'A', 'France');
  cities.push(cityA);
  cityMetadata.set(cityA, {
    nation: 'France',
    supplies: [],
    demands: [],
    production: {},
    consumption: {},
    islandId: islandAId
  });
  bus.nationRelations = {
    England: { France: 'peace' },
    France: { England: 'peace' }
  };
  bus.getRelation = (a, b) => bus.nationRelations[a]?.[b] || 'peace';
  const cityB = foundVillage(
    tiles,
    gridSize,
    cities,
    cityMetadata,
    'England',
    GOODS,
    () => 0
  );
  assert.ok(cityB);
  assert.equal(cityMetadata.get(cityB).nation, 'England');
  const npc = new NpcShip(0, 0, 'England');
  const route = npc.chooseTradeRoute(cityMetadata);
  assert.deepEqual(new Set([route.source, route.dest]), new Set([cityA, cityB]));
  assert.equal(bus.getRelation('England', 'France'), 'peace');
});

test('cannot found village adjacent to another', () => {
  const V = Terrain.VILLAGE, C = Terrain.COAST;
  const tiles = [
    [C, C, C],
    [C, V, C],
    [C, C, C]
  ];
  const gridSize = 10;
  const cities = [];
  const cityMetadata = new Map();
  const city = foundVillage(
    tiles,
    gridSize,
    cities,
    cityMetadata,
    'England',
    GOODS,
    () => 0
  );
  assert.equal(city, null);
  const villageCount = tiles.flat().filter(t => t === Terrain.VILLAGE).length;
  assert.equal(villageCount, 1);
});

test('foundVillageAt builds at specified coordinates when valid', () => {
  const W = Terrain.WATER,
    C = Terrain.COAST,
    L = Terrain.LAND;
  const tiles = [
    [W, C, W],
    [W, L, W],
    [W, C, W]
  ];
  const gridSize = 10;
  const cities = [];
  const cityMetadata = new Map();
  const city = foundVillageAt(
    tiles,
    gridSize,
    cities,
    cityMetadata,
    'England',
    GOODS,
    { r: 0, c: 1 },
    () => 0
  );
  assert.ok(city);
  assert.equal(tiles[0][1], Terrain.VILLAGE);
});

test('foundVillageAt rejects invalid site', () => {
  const V = Terrain.VILLAGE,
    C = Terrain.COAST,
    W = Terrain.WATER;
  const tiles = [
    [W, V, W],
    [W, C, W],
    [W, W, W]
  ];
  const gridSize = 10;
  const cities = [];
  const cityMetadata = new Map();
  const city = foundVillageAt(
    tiles,
    gridSize,
    cities,
    cityMetadata,
    'England',
    GOODS,
    { r: 1, c: 1 },
    () => 0
  );
  assert.equal(city, null);
});
