// Trade route management for automated trading ships
// Stores route definitions and provides serialization hooks

const routes = new Map(); // ship -> route

// route structure: {
//   cities: [City],        // ordered list of city objects
//   buy: [string],         // goods to buy
//   sell: [string],        // goods to sell
//   index: 0               // current waypoint index
// }

export function setRoute(ship, route) {
  if (!ship || !route || !route.cities || route.cities.length === 0) return;
  route.index = route.index || 0;
  routes.set(ship, route);
}

export function getRoute(ship) {
  return routes.get(ship);
}

export function clearRoute(ship) {
  routes.delete(ship);
}

// Serialization of routes for saving
export function serializeRoutes(fleet) {
  const data = [];
  routes.forEach((route, ship) => {
    const idx = fleet.indexOf(ship);
    if (idx === -1) return;
    data.push({
      shipIndex: idx,
      cities: route.cities.map(c => c.name),
      buy: route.buy || [],
      sell: route.sell || [],
      index: route.index || 0
    });
  });
  return data;
}

export function deserializeRoutes(data, fleet, cities) {
  routes.clear();
  data.forEach(entry => {
    const ship = fleet[entry.shipIndex];
    if (!ship) return;
    const routeCities = (entry.cities || [])
      .map(name => cities.find(c => c.name === name))
      .filter(Boolean);
    if (routeCities.length) {
      routes.set(ship, {
        cities: routeCities,
        buy: entry.buy || [],
        sell: entry.sell || [],
        index: entry.index || 0
      });
    }
  });
}

// Execute automatic trading for a ship at a city
import { priceFor } from './ui/trade.js';
import { bus } from './bus.js';

function cargoUsed(ship) {
  return Object.values(ship.cargo || {}).reduce((a, b) => a + b, 0);
}

export function autoTrade(ship, city, metadata, route) {
  if (!ship || !city || !metadata || !route) return;
  metadata.inventory = metadata.inventory || {};
  metadata.prices = metadata.prices || {};

  // Buying goods
  (route.buy || []).forEach(good => {
    if (metadata.inventory[good] == null) metadata.inventory[good] = 10;
    const price = priceFor(good, metadata);
    while (
      ship.gold >= price &&
      metadata.inventory[good] > 0 &&
      cargoUsed(ship) < ship.cargoCapacity
    ) {
      ship.gold -= price;
      ship.cargo[good] = (ship.cargo[good] || 0) + 1;
      metadata.inventory[good] -= 1;
      const oldPrice = metadata.prices[good];
      metadata.prices[good] = Math.round(oldPrice * 1.1);
      bus.emit('log', `${ship.type} bought 1 ${good} in ${city.name}`);
    }
  });

  // Selling goods
  (route.sell || []).forEach(good => {
    if (metadata.inventory[good] == null) metadata.inventory[good] = 10;
    const sellPrice = Math.floor(priceFor(good, metadata) * 0.9);
    while (ship.cargo[good] > 0) {
      ship.cargo[good] -= 1;
      ship.gold += sellPrice;
      metadata.inventory[good] += 1;
      const oldPrice = metadata.prices[good];
      metadata.prices[good] = Math.max(1, Math.round(oldPrice * 0.9));
      bus.emit('log', `${ship.type} sold 1 ${good} in ${city.name}`);
    }
    if (ship.cargo[good] <= 0) delete ship.cargo[good];
  });
}

export default {
  setRoute,
  getRoute,
  clearRoute,
  serializeRoutes,
  deserializeRoutes,
  autoTrade
};
