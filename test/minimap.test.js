import test from 'node:test';
import assert from 'node:assert/strict';
import { drawMinimap } from '../pirates/ui/minimap.js';
import { Terrain } from '../pirates/world.js';

test('minimap uses Terrain.WATER constant', () => {
  const originalWater = Terrain.WATER;
  try {
    Terrain.WATER = 9;
    const tiles = [[9]];
    const calls = [];
    const ctx = {
      canvas: { width: 10, height: 10 },
      clearRect() {},
      fillStyle: '',
      fillRect(x, y, w, h) {
        calls.push({ x, y, w, h, fillStyle: this.fillStyle });
      }
    };
    drawMinimap(ctx, tiles, null, 10, 10);
    assert.equal(calls.length, 1);
  } finally {
    Terrain.WATER = originalWater;
  }
});

test('minimap draws land tiles', () => {
  const tiles = [[Terrain.LAND]];
  const calls = [];
  const ctx = {
    canvas: { width: 10, height: 10 },
    clearRect() {},
    fillStyle: '',
    fillRect(x, y, w, h) {
      calls.push({ x, y, w, h, fillStyle: this.fillStyle });
    }
  };
  drawMinimap(ctx, tiles, null, 10, 10);
  assert.equal(calls.length, 2);
});

test('minimap draws city markers', () => {
  const tiles = [[Terrain.LAND]];
  const calls = [];
  const ctx = {
    canvas: { width: 10, height: 10 },
    clearRect() {},
    fillStyle: '',
    fillRect(x, y, w, h) {
      calls.push({ x, y, w, h, fillStyle: this.fillStyle });
    }
  };
  const cities = [{ x: 5, y: 5 }];
  drawMinimap(ctx, tiles, null, 10, 10, cities);
  // Expect background + land + city marker
  assert.equal(calls.length, 3);
});
