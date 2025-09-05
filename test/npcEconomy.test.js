import test from 'node:test';
import assert from 'node:assert/strict';
import { City } from '../pirates/entities/city.js';
import { cartesian } from '../pirates/utils/distance.js';
import {
  initEconomy,
  nationEconomy,
  spawnNpcFromEconomy
} from '../pirates/npcEconomy.js';

// Helper test ensuring nations purchase ships and spawn near cities

test('NPC nations buy ships, paying gold and stock and spawn adjacent', () => {
  const nations = ['England'];
  const city = new City(0, 0, 'London', 'England');
  const cities = [city];
  const cityMetadata = new Map();
  cityMetadata.set(city, {
    nation: 'England',
    shipyard: { Sloop: { price: 100, stock: 1 } }
  });
  const npcShips = [];
  const targetCounts = { England: 1 };
  const gridSize = 10;
  initEconomy(nations, 150);

  spawnNpcFromEconomy(
    nations,
    cities,
    cityMetadata,
    npcShips,
    targetCounts,
    gridSize
  );

  assert.equal(npcShips.length, 1);
  const econ = nationEconomy.get('England');
  assert.equal(econ.gold, 50);
  assert.equal(cityMetadata.get(city).shipyard.Sloop.stock, 0);
  const ship = npcShips[0];
  const dist = cartesian(ship.x, ship.y, city.x, city.y);
  assert.ok(dist <= gridSize);
});

// Ensure spawnNpcFromEconomy respects per-nation target counts so nations can
// field multiple ships when funds and stock allow.
test('spawnNpcFromEconomy creates ships up to target count', () => {
  const nations = ['England'];
  const city = new City(0, 0, 'London', 'England');
  const cities = [city];
  const cityMetadata = new Map();
  cityMetadata.set(city, {
    nation: 'England',
    shipyard: { Sloop: { price: 100, stock: 3 } }
  });
  const npcShips = [];
  const targetCounts = { England: 3 };
  const gridSize = 10;
  initEconomy(nations, 500);

  spawnNpcFromEconomy(
    nations,
    cities,
    cityMetadata,
    npcShips,
    targetCounts,
    gridSize
  );

  assert.equal(npcShips.length, 3);
});
