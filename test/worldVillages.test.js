import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld } from '../pirates/world.js';

test('generateWorld returns villages with island ids', () => {
  const { villages } = generateWorld(160, 160, 16, { seed: 1, villagesPerIsland: 2 });
  assert.ok(villages.length > 0, 'should create at least one village');
  villages.forEach(v => {
    assert.equal(typeof v.islandId, 'number');
  });
});
