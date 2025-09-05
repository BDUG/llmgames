import test from 'node:test';
import assert from 'node:assert/strict';
import { City } from '../pirates/entities/city.js';
import { spawnEuropeanTrader } from '../pirates/europeTraders.js';

// Ensure European traders spawn with proper nation and deliver goods

test('European traders reach nearest city', () => {
  const worldWidth = 200;
  const worldHeight = 200;
  const gridSize = 10;
  const city = new City(100, 100, 'Testopolis', 'England');
  const cities = [city];
  const cityMetadata = new Map([[city, { inventory: {} }]]);
  const npcShips = [];

  const trader = spawnEuropeanTrader(worldWidth, worldHeight, cities);
  npcShips.push(trader);

  const europeanNations = ['England', 'France', 'Spain', 'Netherlands'];
  assert.ok(europeanNations.includes(trader.nation));

  const player = { x: 1000, y: 1000, nation: 'Pirate' };
  let steps = 0;
  while (trader.loaded && steps < 1000) {
    trader.update(
      1,
      null,
      gridSize,
      player,
      worldWidth,
      worldHeight,
      cityMetadata
    );
    steps++;
  }

  assert.equal(trader.loaded, false);
  const meta = cityMetadata.get(city);
  const total = Object.values(meta.inventory).reduce((a, b) => a + b, 0);
  assert.ok(total > 0);
});
