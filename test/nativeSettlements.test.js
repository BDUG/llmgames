import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld, Terrain } from '../pirates/world.js';
import { adjustNativeRelation } from '../pirates/npcEconomy.js';

test('generateWorld returns native settlements', () => {
  const { tiles, natives } = generateWorld(160, 160, 16, { seed: 1, nativeDensity: 0.5 });
  assert.ok(natives.length > 0, 'should create at least one native settlement');
  natives.forEach(n => {
    assert.equal(tiles[n.r][n.c], Terrain.NATIVE);
  });
});

test('adjustNativeRelation updates relation value', () => {
  const meta = { relation: 0 };
  adjustNativeRelation(meta, 2);
  assert.equal(meta.relation, 2);
});
