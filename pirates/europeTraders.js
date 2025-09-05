import { NpcShip } from './entities/npcShip.js';
import { cartesian } from './utils/distance.js';

// Interval (ms) between spawns of European traders
export const EUROPE_TRADER_INTERVAL = 60000;

// Possible goods carried by European traders by nation
const EUROPEAN_CARGO_TABLE = {
  England: { Tools: 5, Cloth: 5 },
  France: { Wine: 5, Cloth: 5 },
  Spain: { Tools: 5, Guns: 5 },
  Netherlands: { Cloth: 5, Tools: 5 }
};

const EUROPEAN_NATIONS = Object.keys(EUROPEAN_CARGO_TABLE);

// Compute a random spawn point along the world edge
function randomEdgePoint(width, height) {
  const edge = Math.floor(Math.random() * 4);
  switch (edge) {
    case 0:
      return { x: 0, y: Math.random() * height };
    case 1:
      return { x: width, y: Math.random() * height };
    case 2:
      return { x: Math.random() * width, y: 0 };
    default:
      return { x: Math.random() * width, y: height };
  }
}

export function spawnEuropeanTrader(worldWidth, worldHeight, cities) {
  if (!cities?.length) return null;
  const spawn = randomEdgePoint(worldWidth, worldHeight);
  const nation =
    EUROPEAN_NATIONS[Math.floor(Math.random() * EUROPEAN_NATIONS.length)];
  const ship = new NpcShip(spawn.x, spawn.y, nation);
  ship.state = 'europe-trade';
  ship.home = { ...spawn };
  ship.cargo = { ...(EUROPEAN_CARGO_TABLE[nation] || {}) };
  ship.loaded = true;

  // Find nearest city to deliver goods
  const nearest = cities.reduce(
    (closest, c) => {
      const d = cartesian(spawn.x, spawn.y, c.x, c.y);
      return d < closest.dist ? { city: c, dist: d } : closest;
    },
    { city: null, dist: Infinity }
  );
  ship.targetCity = nearest.city;
  return ship;
}
