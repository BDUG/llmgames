import { Terrain } from '../world.js';
import { bus } from '../bus.js';

// Build a simple orthogonal road between two cities.
// Updates the tiles grid to mark road tiles and records the connection
// in city metadata adjacency sets.
export function buildRoad(tiles, cityA, cityB, cityMetadata, gridSize) {
  if (!tiles || !cityA || !cityB || !cityMetadata) return false;
  const r1 = Math.floor(cityA.y / gridSize);
  const c1 = Math.floor(cityA.x / gridSize);
  const r2 = Math.floor(cityB.y / gridSize);
  const c2 = Math.floor(cityB.x / gridSize);

  let r = r1;
  let c = c1;
  const dr = Math.sign(r2 - r1);
  const dc = Math.sign(c2 - c1);

  while (r !== r2) {
    r += dr;
    if (tiles[r] && tiles[r][c] !== Terrain.VILLAGE) {
      tiles[r][c] = Terrain.ROAD;
    }
  }
  while (c !== c2) {
    c += dc;
    if (tiles[r] && tiles[r][c] !== Terrain.VILLAGE) {
      tiles[r][c] = Terrain.ROAD;
    }
  }

  const metaA = cityMetadata.get(cityA);
  const metaB = cityMetadata.get(cityB);
  if (metaA) {
    metaA.roads = metaA.roads || new Set();
    metaA.roads.add(cityB);
  }
  if (metaB) {
    metaB.roads = metaB.roads || new Set();
    metaB.roads.add(cityA);
  }
  cityA.roads?.add(cityB);
  cityB.roads?.add(cityA);
  bus.emit('log', `Built road between ${cityA.name} and ${cityB.name}`);
  return true;
}
