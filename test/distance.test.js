import test from 'node:test';
import assert from 'node:assert/strict';
import { cartesian, iso } from '../pirates/utils/distance.js';
import { cartToIso } from '../pirates/world.js';

const tileWidth = 64;
const tileImageHeight = 64;
const tileIsoHeight = 32;

test('cartesian returns 0 for identical points', () => {
  assert.equal(cartesian(1, 2, 1, 2), 0);
});

test('cartesian matches hypot for diagonal movement', () => {
  const dist = cartesian(0, 0, 3, 4);
  assert.equal(dist, 5);
});

test('iso returns 0 for the same isometric point', () => {
  const { isoX, isoY } = cartToIso(10, 20, tileWidth, tileIsoHeight, tileImageHeight);
  const dist = iso(
    isoX,
    isoY,
    isoX,
    isoY,
    tileWidth,
    tileIsoHeight,
    tileImageHeight
  );
  assert.equal(dist, 0);
});

test('iso matches cartesian distance for diagonal movement', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 64, y: 64 };
  const isoA = cartToIso(a.x, a.y, tileWidth, tileIsoHeight, tileImageHeight);
  const isoB = cartToIso(b.x, b.y, tileWidth, tileIsoHeight, tileImageHeight);
  const expected = cartesian(a.x, a.y, b.x, b.y);
  const dist = iso(
    isoA.isoX,
    isoA.isoY,
    isoB.isoX,
    isoB.isoY,
    tileWidth,
    tileIsoHeight,
    tileImageHeight
  );
  assert.equal(dist, expected);
});
