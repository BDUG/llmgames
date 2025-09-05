import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld } from '../pirates/world.js';

test('islands maintain minimum spacing', () => {
  const { islands } = generateWorld(320, 320, 16, { seed: 7, frequencyScale: 2 });
  for (let i = 0; i < islands.length; i++) {
    for (let j = i + 1; j < islands.length; j++) {
      let minDist = Infinity;
      for (const a of islands[i].coast) {
        for (const b of islands[j].coast) {
          const d = Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c));
          if (d < minDist) minDist = d;
        }
      }
      assert.ok(
        minDist >= 5,
        `islands ${i} and ${j} too close: ${minDist}`
      );
    }
  }
});

