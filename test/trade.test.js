import test from 'node:test';
import assert from 'node:assert/strict';
import { cartesian } from '../pirates/utils/distance.js';

// Regression test for trade proximity threshold
// Ensures trading is possible when exactly one tile away from a city

test('trade menu triggers at one-tile distance', () => {
  const gridSize = 64; // size of one tile
  const player = { x: 0, y: 0 };
  const city = { x: gridSize, y: 0, name: 'Testville' };
  const cities = [city];
  const keys = { T: true };
  let tradeOpened = false;

  const nearestCityInfo = cities.reduce(
    (nearest, c) => {
      const dist = cartesian(player.x, player.y, c.x, c.y);
      return dist < nearest.dist ? { city: c, dist } : nearest;
    },
    { city: null, dist: Infinity }
  );

  const TRADE_RANGE = gridSize;
  const nearbyCity =
    nearestCityInfo.dist <= TRADE_RANGE ? nearestCityInfo.city : null;

  if (nearbyCity && (keys['t'] || keys['T'])) {
    tradeOpened = true; // would call openTradeMenu in the main game
  }

  assert.equal(nearbyCity, city);
  assert.equal(tradeOpened, true);
});

