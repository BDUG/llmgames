import test from 'node:test';
import assert from 'node:assert/strict';
import { tileAt, Terrain, drawWorld } from '../pirates/world.js';
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

test('ship cannot move past corner boundaries', () => {
  const ship = new Ship(5, 5);
  const worldWidth = 100;
  const worldHeight = 100;

  // attempt to move northwest beyond the top-left corner
  ship.speed = 100;
  ship.angle = -Math.PI * 0.75; // northwest
  ship.update(1, waterTiles, gridSize, worldWidth, worldHeight);
  assert.equal(ship.x, 0);
  assert.equal(ship.y, 0);
});

test('drawWorld renders edge tile near map boundary', () => {
  // bottom-right tile is land to test drawing at edge
  const tiles = [
    [Terrain.WATER, Terrain.WATER],
    [Terrain.WATER, Terrain.LAND]
  ];
  const tileWidth = 64;
  const tileImageHeight = 64;
  const tileIsoHeight = 32;
  const assets = {
    tiles: {
      land: { width: tileWidth, height: tileImageHeight },
      water: { width: tileWidth, height: tileImageHeight }
    }
  };
  const calls = [];
  const ctx = {
    canvas: { clientWidth: tileWidth, clientHeight: tileImageHeight },
    drawImage: (...args) => calls.push(args)
  };
  // Pan close to the bottom-right corner
  drawWorld(
    ctx,
    tiles,
    tileWidth,
    tileIsoHeight,
    tileImageHeight,
    assets,
    tileWidth - 1,
    tileImageHeight - 1
  );
  assert.ok(
    calls.some(args => args[0] === assets.tiles.land),
    'edge tile should be drawn'
  );
});
