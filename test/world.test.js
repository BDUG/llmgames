import test from 'node:test';
import assert from 'node:assert/strict';
import { tileAt, Terrain } from '../pirates/world.js';
import { Ship } from '../pirates/entities/ship.js';

// Helper tiles: single water tile
const waterTiles = [[Terrain.WATER]];
const gridSize = 10;

test('tileAt returns water for out-of-bounds coordinates', () => {
  assert.equal(tileAt(waterTiles, -1, 0, gridSize), Terrain.WATER);
  assert.equal(tileAt(waterTiles, 0, -1, gridSize), Terrain.WATER);
  assert.equal(tileAt(waterTiles, gridSize + 1, 0, gridSize), Terrain.WATER);
  assert.equal(tileAt(waterTiles, 0, gridSize + 1, gridSize), Terrain.WATER);
});

test('ship can move beyond grid without collision', () => {
  const ship = new Ship(5, 5);
  ship.speed = 10; // move east fast enough to leave the grid
  ship.angle = 0; // east
  ship.update(1, waterTiles, gridSize);
  assert.ok(ship.x > gridSize, `Ship did not move beyond grid: ${ship.x}`);
});
