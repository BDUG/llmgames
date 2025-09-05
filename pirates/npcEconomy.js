import { NpcShip } from './entities/npcShip.js';
import { SHIP_TYPES } from './entities/ship.js';
import { isUnlocked } from './research.js';

export const nationEconomy = new Map();

export function initEconomy(nations, initialGold = 1000) {
  nationEconomy.clear();
  nations.forEach(n => {
    nationEconomy.set(n, { gold: initialGold });
  });
}

export function earnIncome(amount = 100) {
  nationEconomy.forEach(e => {
    e.gold += amount;
  });
}

export function restockShipyards(cityMetadata, amount = 1) {
  cityMetadata.forEach(meta => {
    if (meta.shipyard) {
      Object.entries(meta.shipyard).forEach(([type, info]) => {
        const required = SHIP_TYPES[type]?.tech;
        if (required && !isUnlocked(required)) {
          info.stock = 0;
          return;
        }
        info.stock += amount;
      });
    }
  });
}

// Calculate effective production for a city, applying a bonus for each road
// connection. Each connection increases output by 50%.
export function calculateProduction(metadata) {
  const connections = metadata?.roads?.size || 0;
  const techBonus = isUnlocked('villageImprovements') ? 1.25 : 1;
  const multiplier = techBonus * (1 + connections * 0.5);
  const result = {};
  Object.entries(metadata?.production || {}).forEach(([good, amt]) => {
    result[good] = Math.round(amt * multiplier);
  });
  return result;
}

export function spawnNpcFromEconomy(
  nations,
  cities,
  cityMetadata,
  npcShips,
  targetCounts,
  gridSize
) {
  nations.forEach(nation => {
    const econ = nationEconomy.get(nation);
    if (!econ) return;
    let count = npcShips.filter(s => s.nation === nation).length;
    while (count < targetCounts[nation]) {
      const cityCandidates = cities.filter(c => {
        const meta = cityMetadata.get(c);
        if (!meta || meta.nation !== nation || !meta.shipyard) return false;
        return Object.values(meta.shipyard).some(
          info => info.stock > 0 && econ.gold >= info.price
        );
      });
      if (!cityCandidates.length) break;
      const city =
        cityCandidates[Math.floor(Math.random() * cityCandidates.length)];
      const meta = cityMetadata.get(city);
      const availableTypes = Object.entries(meta.shipyard).filter(
        ([type, info]) => {
          const required = SHIP_TYPES[type]?.tech;
          if (required && !isUnlocked(required)) return false;
          return info.stock > 0 && econ.gold >= info.price;
        }
      );
      if (!availableTypes.length) break;
      const [type, info] =
        availableTypes[Math.floor(Math.random() * availableTypes.length)];
      econ.gold -= info.price;
      info.stock -= 1;
      const x = city.x + gridSize;
      const y = city.y;
      npcShips.push(new NpcShip(x, y, nation, type));
      count++;
    }
  });
}

export function adjustNativeRelation(metadata, delta) {
  if (typeof metadata.relation !== 'number') metadata.relation = 0;
  metadata.relation += delta;
}
