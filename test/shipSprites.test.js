import test from 'node:test';
import assert from 'node:assert/strict';
import { Ship } from '../pirates/entities/ship.js';
import { getShipSprite, assets } from '../pirates/assets.js';

const DIRS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];

// Test that setting angles updates the ship heading to the expected direction key.
test('Ship resolves direction key from angle', () => {
  const ship = new Ship(0, 0);
  const cases = [
    [0, 'E'],
    [Math.PI / 4, 'SE'],
    [Math.PI / 2, 'S'],
    [(3 * Math.PI) / 4, 'SW'],
    [Math.PI, 'W'],
    [(5 * Math.PI) / 4, 'NW'],
    [(3 * Math.PI) / 2, 'N'],
    [(7 * Math.PI) / 4, 'NE'],
    [-Math.PI / 4, 'NE'], // negative angle wraps correctly
  ];

  for (const [angle, expected] of cases) {
    ship.angle = angle;
    assert.equal(DIRS[ship.heading], expected, `angle ${angle} -> ${expected}`);
  }
});

// Test that getShipSprite falls back to a default sprite when a direction is missing.
test('getShipSprite falls back to default direction sprite', () => {
  const originalShip = assets.ship;
  try {
    assets.ship = {
      TestType: {
        TestNation: {
          default: 'DEFAULT_SPRITE',
        },
      },
    };

    const sprite = getShipSprite('TestType', 'TestNation', 'N');
    assert.equal(sprite, 'DEFAULT_SPRITE');
  } finally {
    assets.ship = originalShip;
  }
});
