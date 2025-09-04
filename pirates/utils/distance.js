import { isoToCart } from '../world.js';

export function cartesian(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function iso(
  aIsoX,
  aIsoY,
  bIsoX,
  bIsoY,
  tileWidth,
  tileIsoHeight,
  tileImageHeight
) {
  const a = isoToCart(aIsoX, aIsoY, tileWidth, tileIsoHeight, tileImageHeight);
  const b = isoToCart(bIsoX, bIsoY, tileWidth, tileIsoHeight, tileImageHeight);
  return cartesian(a.x, a.y, b.x, b.y);
}
