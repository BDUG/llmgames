import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld, Terrain } from '../pirates/world.js';

test('generateWorld creates at least 10 islands by default', () => {
  const { islands } = generateWorld(640, 640, 16, { seed: 1 });
  assert.ok(
    islands.length >= 10,
    `expected at least 10 islands, got ${islands.length}`
  );
});

test('generateWorld returns villages with island ids', () => {
  const { villages } = generateWorld(160, 160, 16, { seed: 1, villagesPerIsland: 2 });
  assert.ok(villages.length > 0, 'should create at least one village');
  villages.forEach(v => {
    assert.equal(typeof v.islandId, 'number');
  });
});

test('villages do not touch each other', () => {
  const { tiles } = generateWorld(160, 160, 16, { seed: 2, villagesPerIsland: 2 });
  const rows = tiles.length;
  const cols = tiles[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (tiles[r][c] !== Terrain.VILLAGE) continue;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (
            nr >= 0 &&
            nr < rows &&
            nc >= 0 &&
            nc < cols
          ) {
            assert.notEqual(tiles[nr][nc], Terrain.VILLAGE);
          }
        }
      }
    }
  }
});

test('generateWorld enforces maxIslandSize', () => {
  const max = 20;
  const { islands } = generateWorld(160, 160, 16, {
    seed: 3,
    maxIslandSize: max
  });
  for (const island of islands) {
    assert.ok(
      island.size <= max,
      `island ${island.id} exceeds max size: ${island.size} > ${max}`
    );
  }
});
