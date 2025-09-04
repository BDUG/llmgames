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

test('ship is clamped within world bounds', () => {
  const ship = new Ship(50, 50);
  const worldWidth = 100;
  const worldHeight = 100;

  // move west beyond 0
  ship.speed = 100;
  ship.angle = Math.PI; // west
  ship.update(1, waterTiles, gridSize, worldWidth, worldHeight);
  assert.equal(ship.x, 0);

  // move east beyond width
  ship.x = 95;
  ship.speed = 100;
  ship.angle = 0; // east
  ship.update(1, waterTiles, gridSize, worldWidth, worldHeight);
  assert.equal(ship.x, worldWidth);

  // move north beyond 0
  ship.x = 50;
  ship.y = 5;
  ship.speed = 100;
  ship.angle = -Math.PI / 2; // north
  ship.update(1, waterTiles, gridSize, worldWidth, worldHeight);
  assert.equal(ship.y, 0);

  // move south beyond height
  ship.y = 95;
  ship.speed = 100;
  ship.angle = Math.PI / 2; // south
  ship.update(1, waterTiles, gridSize, worldWidth, worldHeight);
  assert.equal(ship.y, worldHeight);
});
