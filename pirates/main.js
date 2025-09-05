import { assets, loadAssets } from './assets.js';
import {
  generateWorld,
  drawWorld,
  Terrain,
  cartToIso,
  isoToCart,
  tileAt
} from './world.js';
import { cartesian } from './utils/distance.js';
import { Ship } from './entities/ship.js';
import { City } from './entities/city.js';
import { NativeSettlement } from './entities/nativeSettlement.js';
import { Mission } from './entities/mission.js';
import {
  initEconomy,
  earnIncome,
  restockShipyards,
  spawnNpcFromEconomy,
  nationEconomy
} from './npcEconomy.js';
import { spawnEuropeanTrader, EUROPE_TRADER_INTERVAL } from './europeTraders.js';
import { foundVillage } from './foundVillage.js';
import { initHUD, updateHUD } from './ui/hud.js';
import { initMinimap, drawMinimap } from './ui/minimap.js';
import { initLog } from './ui/log.js';
import { initQuestLog, updateQuestLog } from './ui/questLog.js';
import { Quest } from './quest.js';
import { questManager } from './questManager.js';
import { bus } from './bus.js';
import { openTradeMenu, closeTradeMenu, PRICES } from './ui/trade.js';
import { openGovernorMenu, closeGovernorMenu } from './ui/governor.js';
import { openUpgradeMenu, closeUpgradeMenu } from './ui/upgrade.js';
import { openTavernMenu, closeTavernMenu } from './ui/tavern.js';
import { startBoarding } from './boarding.js';
import { initCommandKeys, updateCommandKeys } from './ui/commandKeys.js';
import { openFleetMenu, closeFleetMenu } from './ui/fleet.js';
import { openShipyardMenu, closeShipyardMenu } from './ui/shipyard.js';
import { FleetController } from './fleet.js';

let worldWidth, worldHeight, gridSize, tileWidth, tileIsoHeight, tileImageHeight;
const CSS_WIDTH = 800, CSS_HEIGHT = 600;

const canvas = document.getElementById('gameCanvas');
const dpr = window.devicePixelRatio || 1;
canvas.style.width = CSS_WIDTH + 'px';
canvas.style.height = CSS_HEIGHT + 'px';
canvas.width = CSS_WIDTH * dpr;
canvas.height = CSS_HEIGHT * dpr;
const ctx = canvas.getContext('2d');
ctx.scale(dpr, dpr);

const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');

initHUD();
initMinimap();
initLog(bus);
initQuestLog();
initCommandKeys();
bus.on('quest-updated', () => updateQuestLog(questManager));
bus.on('quest-completed', ({ quest }) => {
  player.adjustReputation(quest.nation, quest.reputation);
});
bus.on('npc-spotted', ({ npc }) => {
  bus.emit('log', `${npc.nation} ship spotted you!`);
});
bus.on('npc-flee', ({ npc }) => {
  bus.emit('log', `${npc.nation} ship fled!`);
});
bus.on('switch-flagship', ({ ship }) => {
  const fleet = player.fleet;
  player = ship;
  player.fleet = fleet;
  if (fleetController) fleetController.setFlagship(player);
  updateHUD(player, wind);
});

// Dynamic game state collections
let tiles, player, cities, cityMetadata, nativeSettlements, nativeMetadata, npcShips, missions, priceEvents = [], seasonalEvents = [];
let fleetController;
let npcSpawnIntervalId, europeTraderIntervalId;
const keys = {};

bus.on('price-change', ({ city, good, delta }) => {
  priceEvents.push({ origin: city, good, strength: delta });
});
let paused = false;
let showMinimap = true;
let currentSeed = Math.random();

window.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
    e.preventDefault();
  }
  const map = { w: 'ArrowUp', a: 'ArrowLeft', s: 'ArrowDown', d: 'ArrowRight' };
  if (map[e.key]) keys[map[e.key]] = true;
  else keys[e.key] = true;
});

window.addEventListener('keyup', e => {
  const map = { w: 'ArrowUp', a: 'ArrowLeft', s: 'ArrowDown', d: 'ArrowRight' };
  if (map[e.key]) keys[map[e.key]] = false;
  else keys[e.key] = false;
});

const NATIONS = ['England', 'France', 'Spain', 'Netherlands'];
// All tradable goods in the world
const GOODS = ['Sugar', 'Rum', 'Tobacco', 'Cotton', 'Spice', 'Tea', 'Coffee'];

// Relationship map between nations. By default everyone is at peace.
const ALL_NATIONS = [...NATIONS, 'Pirate'];
const nationRelations = {};
ALL_NATIONS.forEach(a => {
  nationRelations[a] = {};
  ALL_NATIONS.forEach(b => {
    if (a !== b) nationRelations[a][b] = 'peace';
  });
});

function setRelation(a, b, status) {
  nationRelations[a][b] = status;
  nationRelations[b][a] = status;
  bus.emit('relations-updated', { from: a, to: b, status, map: nationRelations });
}

function getRelation(a, b) {
  return nationRelations[a]?.[b] || 'peace';
}

// expose through bus
bus.nationRelations = nationRelations;
bus.getRelation = getRelation;
bus.on('relation-change', ({ from, to, status }) => setRelation(from, to, status));
bus.emit('relations-updated', { map: nationRelations });

const REP_SURCHARGE_THRESHOLD = 0;
const REP_DENY_THRESHOLD = -20;
const REP_SURCHARGE_RATE = 1.2;

const DAY_MS = 5000;

let wind = { speed: 0, angle: 0 };
function updateWind() {
  wind.speed = 0.5 + Math.random() * 2;
  wind.angle = Math.random() * Math.PI * 2;
}
setInterval(updateWind, 10000);
updateWind();
Ship.wind = wind;
setInterval(updateMarkets, DAY_MS);

function getCameraOffset(player) {
  // Camera math works in cartesian world units, but the canvas is rendered in
  // isometric pixels.  Convert both the origin and the screen centre from
  // isometric space back into cartesian space so distances can be measured
  // consistently.  isoToCart uses `tileIsoHeight` when converting the vertical
  // axis – a larger value stretches the diamond-shaped tiles and pushes the
  // calculated centre further down, changing the vertical offset of the camera.
  const origin = isoToCart(0, 0, tileWidth, tileIsoHeight, tileImageHeight);
  const center = isoToCart(
    CSS_WIDTH / 2,
    CSS_HEIGHT / 2,
    tileWidth,
    tileIsoHeight,
    tileImageHeight
  );
  const centerX = center.x - origin.x;
  const centerY = center.y - origin.y;

  // Viewable dimensions in cartesian coordinates for clamping.
  const viewWidth = centerX * 2;
  const viewHeight = centerY * 2;

  // Center the camera on the player ship, clamping to the world bounds.
  const x = Math.max(0, Math.min(player.x - centerX, worldWidth - viewWidth));
  const y = Math.max(0, Math.min(player.y - centerY, worldHeight - viewHeight));

  return { x, y };
}

function basePriceFor(good, metadata) {
  let price = PRICES[good];
  if (metadata?.supplies?.includes(good)) price = Math.round(price * 0.8);
  if (metadata?.demands?.includes(good)) price = Math.round(price * 1.2);
  return price;
}

function baseStockFor(good, metadata) {
  let stock = 10;
  if (metadata?.production?.[good]) stock += metadata.production[good] * 2;
  if (metadata?.consumption?.[good]) stock -= metadata.consumption[good];
  if (metadata?.supplies?.includes(good)) stock += 5;
  if (metadata?.demands?.includes(good)) stock -= 5;
  return Math.max(0, stock);
}

function processPriceEvents() {
  priceEvents = priceEvents.filter(event => {
    const effect = Math.round(event.strength);
    if (effect) {
      for (const [city, metadata] of cityMetadata.entries()) {
        if (city === event.origin) continue;
        metadata.prices = metadata.prices || {};
        const base = basePriceFor(event.good, metadata);
        const current = metadata.prices[event.good] ?? base;
        metadata.prices[event.good] = Math.max(1, current + effect);
      }
    }
    event.strength *= 0.5;
    return Math.abs(event.strength) >= 1;
  });
}

function handleSeasonalEvents() {
  if (!cityMetadata) return;
  // Apply existing events
  seasonalEvents = seasonalEvents.filter(event => {
    const metadata = cityMetadata.get(event.city);
    if (metadata) {
      metadata.inventory = metadata.inventory || {};
      const base = baseStockFor(event.good, metadata);
      const current = metadata.inventory[event.good] ?? base;
      metadata.inventory[event.good] = Math.max(0, current + event.effect);
    }
    event.duration -= 1;
    return event.duration > 0;
  });

  // Possibly trigger a new random event
  if (Math.random() < 0.05 && cityMetadata.size) {
    const citiesArr = Array.from(cityMetadata.keys());
    const city = citiesArr[Math.floor(Math.random() * citiesArr.length)];
    const good = GOODS[Math.floor(Math.random() * GOODS.length)];
    const shortage = Math.random() < 0.5;
    const effect = shortage ? -2 : 2; // change per tick
    const duration = 5;
    seasonalEvents.push({ city, good, effect, duration });

    // Immediate price impact
    const metadata = cityMetadata.get(city);
    metadata.prices = metadata.prices || {};
    const base = basePriceFor(good, metadata);
    const oldPrice = metadata.prices[good] ?? base;
    const newPrice = Math.max(1, Math.round(oldPrice + (shortage ? base * 0.3 : -base * 0.3)));
    metadata.prices[good] = newPrice;
    bus.emit('price-change', { city, good, delta: newPrice - oldPrice });
  }
}

function updateMarkets() {
  if (!cityMetadata) return;
  handleSeasonalEvents();

  const totals = {};
  for (const metadata of cityMetadata.values()) {
    metadata.inventory = metadata.inventory || {};
    GOODS.forEach(good => {
      if (metadata.inventory[good] == null) {
        metadata.inventory[good] = baseStockFor(good, metadata);
      }
      totals[good] = (totals[good] || 0) + metadata.inventory[good];
    });
  }
  const averages = {};
  GOODS.forEach(good => {
    averages[good] = totals[good] / cityMetadata.size;
  });

  for (const [city, metadata] of cityMetadata.entries()) {
    metadata.prices = metadata.prices || {};
    metadata.inventory = metadata.inventory || {};
    GOODS.forEach(good => {
      const baseStock = baseStockFor(good, metadata);
      const prod = metadata.production?.[good] || 0;
      const cons = metadata.consumption?.[good] || 0;
      let stock = metadata.inventory[good];
      stock = stock + prod - cons;
      if (stock < 0) stock = 0;
      metadata.inventory[good] = stock;

      const base = basePriceFor(good, metadata);
      const current = metadata.prices[good] ?? base;
      const ratio = baseStock ? stock / baseStock : 1;
      const deficit = averages[good] - stock;
      let price = current;
      price += base * (1 - ratio) * 0.1;
      price += (deficit / baseStock) * base * 0.05;
      price += (base - current) * 0.05;
      metadata.prices[good] = Math.max(1, Math.round(price));
    });
  }
  processPriceEvents();
  attemptFoundVillages();
}

function attemptFoundVillages() {
  if (!tiles) return;
  NATIONS.forEach(nation => {
    const econ = nationEconomy.get(nation);
    if (!econ || econ.gold < 500) return;
    const city = foundVillage(
      tiles,
      gridSize,
      cities,
      cityMetadata,
      nation,
      GOODS
    );
    if (city) {
      econ.gold -= 500;
    }
  });
}

function setup(options = {}) {
  const {
    seed = currentSeed,
    difficulty = 1,
    npcSpawnFrequency = 30000
  } = options;
  currentSeed = seed;
  const result = generateWorld(worldWidth, worldHeight, gridSize, options);
  tiles = result.tiles;
  worldWidth = result.cols * gridSize;
  worldHeight = result.rows * gridSize;
  // Spawn at mission coordinates if available, otherwise centre of the map.
  let spawnX, spawnY;
  if (result.missions && result.missions.length) {
    spawnX = result.missions[0].c * gridSize + gridSize / 2;
    spawnY = result.missions[0].r * gridSize + gridSize / 2;
  } else {
    spawnX = worldWidth / 2;
    spawnY = worldHeight / 2;
  }

  // Ensure the spawn point is on water; if not, search outward for the nearest
  // water tile using a simple breadth-first search.
  const isWater = t =>
    t === Terrain.WATER || t === Terrain.RIVER || t === Terrain.REEF;
  if (!isWater(tileAt(tiles, spawnX, spawnY, gridSize))) {
    const startR = Math.floor(spawnY / gridSize);
    const startC = Math.floor(spawnX / gridSize);
    const queue = [{ r: startR, c: startC }];
    const visited = new Set([`${startR},${startC}`]);
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];

    while (queue.length) {
      const { r, c } = queue.shift();
      if (isWater(tiles[r]?.[c])) {
        spawnX = c * gridSize + gridSize / 2;
        spawnY = r * gridSize + gridSize / 2;
        break;
      }
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (
          nr >= 0 &&
          nr < tiles.length &&
          nc >= 0 &&
          nc < tiles[0].length &&
          !visited.has(`${nr},${nc}`)
        ) {
          visited.add(`${nr},${nc}`);
          queue.push({ r: nr, c: nc });
        }
      }
    }
  }

  player = new Ship(spawnX, spawnY, 'Pirate');
  player.fleet = [player];
  fleetController = new FleetController(player);
  cities = [];
  cityMetadata = new Map();
  nativeSettlements = [];
  nativeMetadata = new Map();
  npcShips = [];
  priceEvents = [];
  seasonalEvents = [];
  questManager.active = [];
  questManager.completed = [];
  bus.emit('quest-updated');

  missions = [];
  if (result.missions && result.missions.length) {
    const m = result.missions[0];
    const mx = m.c * gridSize + gridSize / 2;
    const my = m.r * gridSize + gridSize / 2;
    const mission = new Mission(mx, my, 'Mission');
    missions.push(mission);
    cities.push(mission);
    nativeSettlements.push(mission);
    cityMetadata.set(mission, {
      nation: 'Mission',
      supplies: [],
      demands: [],
      production: {},
      consumption: {},
      islandId: m.islandId
    });
    nativeMetadata.set(mission, { tribe: 'Mission', supplies: [], demands: [], relation: 0 });
  }

  let rngSeed = seed; // seeded randomness for deterministic placement
  const rand = () => {
    const x = Math.sin(rngSeed++) * 10000;
    return x - Math.floor(x);
  };

  // Prepare city metadata for all village tiles provided by generateWorld.
  const cityConfigs = [];
  const islandVillageCounts = new Map();
  result.villages.forEach(({ r, c, islandId }) => {
    const x = c * gridSize + gridSize / 2;
    const y = r * gridSize + gridSize / 2;
    const count = (islandVillageCounts.get(islandId) || 0) + 1;
    islandVillageCounts.set(islandId, count);
    const name = `Village ${islandId}-${count}`;
    const supplies = GOODS.filter(() => rand() < 0.5);
    const demands = GOODS.filter(g => !supplies.includes(g) && rand() < 0.5);
    const production = {};
    const consumption = {};
    GOODS.forEach(good => {
      production[good] = supplies.includes(good) ? Math.floor(rand() * 3) + 1 : 0;
      consumption[good] = demands.includes(good) ? Math.floor(rand() * 3) + 1 : 0;
    });
    cityConfigs.push({ x, y, name, supplies, demands, production, consumption, islandId });
  });

  // Deterministically shuffle configs for nation assignment
  for (let i = cityConfigs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cityConfigs[i], cityConfigs[j]] = [cityConfigs[j], cityConfigs[i]];
  }

  if (cityConfigs.length < NATIONS.length) {
    bus.emit('log', `Warning: ${cityConfigs.length} cities for ${NATIONS.length} nations`);
  }

  // Assign nations and instantiate cities
  cityConfigs.forEach((cfg, i) => {
    let nation;
    if (i < NATIONS.length) {
      nation = NATIONS[i];
    } else {
      nation = NATIONS[Math.floor(rand() * NATIONS.length)];
    }
    const city = new City(cfg.x, cfg.y, cfg.name, nation);
    cities.push(city);
    let shipyard = null;
    if (rand() < 0.5) {
      shipyard = {};
      Object.entries(Ship.TYPES).forEach(([type, stats]) => {
        if (rand() < 0.5) {
          shipyard[type] = {
            price: stats.cost,
            stock: Math.floor(rand() * 3) + 1
          };
        }
      });
      if (!Object.keys(shipyard).length) shipyard = null;
    }
    const upgrades = {};
    ['reinforcedHull', 'improvedSails', 'crewQuarters'].forEach(u => {
      if (rand() < 0.7) {
        let mult = 1;
        if (rand() < 0.3) mult = 0.8;
        upgrades[u] = mult;
      }
    });
    cityMetadata.set(city, {
      nation,
      supplies: cfg.supplies,
      demands: cfg.demands,
      production: cfg.production,
      consumption: cfg.consumption,
      islandId: cfg.islandId,
      shipyard,
      upgrades
    });
  });

  // Instantiate native settlements from world generation metadata
  result.natives.forEach((n, i) => {
    const x = n.c * gridSize + gridSize / 2;
    const y = n.r * gridSize + gridSize / 2;
    const tribe = `Tribe ${i + 1}`;
    const settlement = new NativeSettlement(x, y, tribe);
    nativeSettlements.push(settlement);
    const supplies = GOODS.filter(() => rand() < 0.3);
    nativeMetadata.set(settlement, { tribe, supplies, demands: [], relation: 0 });
  });

  const worldTiles = result.rows * result.cols;
  const perNation = Math.max(1, Math.floor((worldTiles / 5000) * difficulty));
  const targetCounts = {};
  NATIONS.forEach(n => (targetCounts[n] = perNation));

  initEconomy(NATIONS);

  const spawnNpc = () => {
    earnIncome();
    restockShipyards(cityMetadata);
    spawnNpcFromEconomy(
      NATIONS,
      cities,
      cityMetadata,
      npcShips,
      targetCounts,
      gridSize
    );
  };

  spawnNpc();
  if (npcSpawnIntervalId) clearInterval(npcSpawnIntervalId);
  npcSpawnIntervalId = setInterval(spawnNpc, npcSpawnFrequency);

  const spawnEuropean = () => {
    const trader = spawnEuropeanTrader(worldWidth, worldHeight, cities);
    if (trader) npcShips.push(trader);
  };
  spawnEuropean();
  if (europeTraderIntervalId) clearInterval(europeTraderIntervalId);
  europeTraderIntervalId = setInterval(
    spawnEuropean,
    EUROPE_TRADER_INTERVAL
  );

  questManager.addQuest(new Quest('capture', 'Capture an enemy ship', 'England', 10));

  bus.emit('log', 'World generated');
}

function toggleMinimap() {
  showMinimap = !showMinimap;
  minimapCanvas.style.display = showMinimap ? 'block' : 'none';
}

function saveGame() {
  if (!player) return;
  const data = {
    seed: currentSeed,
    player: {
      x: player.x,
      y: player.y,
      speed: player.speed,
      angle: player.angle,
      type: player.type,
      maxSpeed: player.maxSpeed,
      baseMaxSpeed: player.baseMaxSpeed,
      cargoCapacity: player.cargoCapacity,
      gold: player.gold,
      crew: player.crew,
      crewMax: player.crewMax,
      hull: player.hull,
      hullMax: player.hullMax,
      baseFireRate: player.baseFireRate,
      fireRate: player.fireRate,
      upgrades: player.upgrades,
      cargo: player.cargo,
      reputation: player.reputation
    }
  };
  try {
    localStorage.setItem('pirates-save', JSON.stringify(data));
    bus.emit('log', 'Game saved');
  } catch (e) {
    console.error('Save failed', e);
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem('pirates-save');
    if (!raw) return;
    const data = JSON.parse(raw);
    setup({ seed: data.seed });
    Object.assign(player, data.player);
    player.cargo = data.player.cargo || {};
    player.reputation = data.player.reputation || {};
    player.upgrades = data.player.upgrades || {
      reinforcedHull: 0,
      improvedSails: 0,
      crewQuarters: 0
    };
    player.fleet = [player];
    player.updateCrewStats();
    fleetController = new FleetController(player);
    bus.emit('log', 'Game loaded');
  } catch (e) {
    console.error('Load failed', e);
  }
}

async function start() {
  await loadAssets();
  const land = assets.tiles.land;
  tileWidth = land.width;
  tileImageHeight = land.height;
  tileIsoHeight = tileWidth / 2;
  gridSize = tileWidth;
  worldWidth = 75 * tileWidth;
  worldHeight = 50 * tileWidth;
  setup();
  requestAnimationFrame(loop);
}

let lastTime = 0;

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = (timestamp - lastTime) / 16;
  lastTime = timestamp;
  if (keys['p'] || keys['P']) { paused = !paused; keys['p'] = keys['P'] = false; }
  if (keys['m'] || keys['M']) { toggleMinimap(); keys['m'] = keys['M'] = false; }
  if (keys['s'] || keys['S']) { saveGame(); keys['s'] = keys['S'] = false; }
  if (keys['l'] || keys['L']) { loadGame(); keys['l'] = keys['L'] = false; }
  if (keys['f'] || keys['F']) {
    closeTradeMenu();
    closeGovernorMenu();
    closeTavernMenu();
    closeUpgradeMenu();
    openFleetMenu(player);
    keys['f'] = keys['F'] = false;
  }

  if (paused) {
    requestAnimationFrame(loop);
    return;
  }

  ctx.clearRect(0, 0, CSS_WIDTH, CSS_HEIGHT);
  if (keys['ArrowLeft']) player.rotate(-dt);
  if (keys['ArrowRight']) player.rotate(dt);
  if (keys['ArrowUp']) player.speed = Math.min(player.speed + 0.1 * dt, player.maxSpeed);
  if (keys['ArrowDown']) player.speed = Math.max(player.speed - 0.1 * dt, 0);
  if (keys['1']) { player.setSail(0); keys['1'] = false; }
  if (keys['2']) { player.setSail(0.5); keys['2'] = false; }
  if (keys['3']) { player.setSail(1); keys['3'] = false; }
  if (keys[' ']) player.fireCannons();
  if (keys['r'] || keys['R']) {
    npcShips.forEach(n => {
      if (cartesian(player.x, player.y, n.x, n.y) < 20) {
        player.ram(n);
      }
    });
    keys['r'] = keys['R'] = false;
  }
  // Update all player ships via fleet controller
  fleetController.update(dt, tiles, gridSize, worldWidth, worldHeight);

  if (player.mutinied) {
    updateHUD(player, wind);
    return;
  }

  const { x: offsetX, y: offsetY } = getCameraOffset(player);

  drawWorld(ctx, tiles, tileWidth, tileIsoHeight, tileImageHeight, assets, offsetX, offsetY);

  npcShips.forEach(n => {
    n.update(dt, tiles, gridSize, player, worldWidth, worldHeight, cityMetadata);
    n.fireCannons(player);
  });

  const drawables = [...cities, ...nativeSettlements, ...npcShips, ...player.fleet];
  drawables
    .sort(
      (a, b) =>
        cartToIso(a.x, a.y, tileWidth, tileIsoHeight, tileImageHeight).isoY -
        cartToIso(b.x, b.y, tileWidth, tileIsoHeight, tileImageHeight).isoY
    )
    .forEach(d =>
      d.draw(ctx, offsetX, offsetY, tileWidth, tileIsoHeight, tileImageHeight)
    );

  // projectile collisions
  npcShips.forEach(n => {
    player.fleet.forEach(ship => {
      ship.projectiles.forEach(p => {
        if (!n.sunk && cartesian(p.x, p.y, n.x, n.y) < 20) {
          const damage = Math.max(0, p.damage * (1 - p.traveled / p.range));
          n.takeDamage(damage);
          p.traveled = p.range;
          bus.emit('log', `Hit ${n.nation} ship for ${damage.toFixed(0)} damage`);
          if (n.sunk) {
            bus.emit('log', `${n.nation} ship sank!`);
            player.distributeLoot();
          }
        }
      });
      n.projectiles.forEach(p => {
        if (!ship.sunk && cartesian(p.x, p.y, ship.x, ship.y) < 20) {
          const damage = Math.max(0, p.damage * (1 - p.traveled / p.range));
          ship.takeDamage(damage);
          p.traveled = p.range;
          bus.emit('log', `Hit by ${n.nation} ship!`);
          if (ship === player && player.sunk) bus.emit('log', 'You sank!');
        }
      });
    });
    n.projectiles = n.projectiles.filter(p => p.traveled < p.range);
  });
  player.fleet.forEach(ship => {
    ship.projectiles = ship.projectiles.filter(p => p.traveled < p.range);
  });
  npcShips = npcShips.filter(n => !n.sunk);

  // boarding and capturing
  let nearEnemy = false;
  for (let i = 0; i < npcShips.length; i++) {
    const n = npcShips[i];
    const dist = cartesian(player.x, player.y, n.x, n.y);
    if (dist < 30) nearEnemy = true;
    if (dist < 30 && (keys['b'] || keys['B'])) {
      startBoarding(player, n);
      keys['b'] = keys['B'] = false;
    }
    if (dist < 30 && (keys['c'] || keys['C'])) {
      bus.emit('log', `Captured ${n.nation} ship!`);
      player.adjustReputation(n.nation, -5);
      player.distributeLoot();
      questManager.completeQuest('capture');
      const captured = new Ship(n.x, n.y, 'Pirate', n.type);
      captured.hull = Math.min(n.hull, captured.hullMax);
      captured.cargo = { ...n.cargo };
      captured.gold = 0;
      captured.crew = 0;
      captured.fleet = player.fleet;
      player.fleet.push(captured);
      if (fleetController) fleetController.assignFormation();
      bus.emit('log', `${n.type} added to fleet`);
      npcShips.splice(i, 1);
      keys['c'] = keys['C'] = false;
      i--;
    }
  }
  updateHUD(player, wind);
  if (showMinimap) {
    drawMinimap(minimapCtx, tiles, player, worldWidth, worldHeight, cities);
  }
  const allSettlements = [...cities, ...nativeSettlements];
  const nearestCityInfo = allSettlements.reduce(
    (nearest, c) => {
      const dist = cartesian(player.x, player.y, c.x, c.y);
      return dist < nearest.dist ? { city: c, dist } : nearest;
    },
    { city: null, dist: Infinity }
  );
  const TRADE_RANGE = gridSize; // distance at which trade becomes available
  const nearbyCity =
    nearestCityInfo.dist <= TRADE_RANGE ? nearestCityInfo.city : null;
  let metadata;
  if (nearbyCity) {
    console.log(
      `${nearbyCity.name} is ${nearestCityInfo.dist.toFixed(1)} units away`
    );
    if (!player.inPort) {
      bus.emit('log', `Approaching ${nearbyCity.name}`);
      player.visitPort();
    }
    metadata = cityMetadata.get(nearbyCity) || nativeMetadata.get(nearbyCity);
  } else {
    player.inPort = false;
  }
  updateCommandKeys({ nearCity: !!nearbyCity, nearEnemy, shipyard: !!metadata?.shipyard });
  if (nearbyCity) {
    if (keys['t'] || keys['T']) {
      closeTradeMenu();
      closeGovernorMenu();
      closeTavernMenu();
      closeUpgradeMenu();
      closeFleetMenu();
      closeShipyardMenu();
      if (metadata?.tribe) {
        const multiplier = 1 + Math.max(0, -metadata.relation) * 0.1;
        openTradeMenu(player, nearbyCity, metadata, multiplier);
        bus.emit('log', `Opened trade with ${metadata.tribe}`);
      } else {
        const nation = metadata?.nation;
        const rep = player.reputation?.[nation] || 0;
        if (rep < REP_DENY_THRESHOLD) {
          bus.emit('log', `${nation} merchants refuse to trade with you.`);
        } else {
          let multiplier = 1;
          if (rep < REP_SURCHARGE_THRESHOLD) {
            multiplier = REP_SURCHARGE_RATE;
            bus.emit('log', `${nation} merchants levy a surcharge due to your reputation.`);
          }
          openTradeMenu(player, nearbyCity, metadata, multiplier);
          bus.emit('log', `Opened trade with ${nearbyCity.name}`);
        }
      }
      keys['t'] = keys['T'] = false;
    }
    if (!metadata?.tribe && (keys['g'] || keys['G'])) {
      closeTradeMenu();
      closeTavernMenu();
      closeUpgradeMenu();
      closeFleetMenu();
      closeShipyardMenu();
      openGovernorMenu(player, nearbyCity, metadata);
      keys['g'] = keys['G'] = false;
    }
    if (!metadata?.tribe && (keys['v'] || keys['V'])) {
      closeTradeMenu();
      closeGovernorMenu();
      closeUpgradeMenu();
      closeFleetMenu();
      closeShipyardMenu();
      openTavernMenu(player, nearbyCity);
      keys['v'] = keys['V'] = false;
    }
    if (!metadata?.tribe && (keys['u'] || keys['U'])) {
      closeTradeMenu();
      closeGovernorMenu();
      closeTavernMenu();
      closeFleetMenu();
      closeShipyardMenu();
      openUpgradeMenu(player, metadata);
      keys['u'] = keys['U'] = false;
    }
    if (!metadata?.tribe && (keys['y'] || keys['Y'])) {
      closeTradeMenu();
      closeGovernorMenu();
      closeTavernMenu();
      closeUpgradeMenu();
      closeFleetMenu();
      if (metadata?.shipyard) {
        openShipyardMenu(player, nearbyCity, metadata);
      } else {
        bus.emit('log', 'No shipyard here');
      }
      keys['y'] = keys['Y'] = false;
    }
  } else {
    closeTradeMenu();
    closeGovernorMenu();
    closeTavernMenu();
    closeUpgradeMenu();
    closeFleetMenu();
    closeShipyardMenu();
  }
  requestAnimationFrame(loop);
}

start();

function startGame(opts) {
  setup(opts);
}

window.startGame = startGame;

const startBtn = document.getElementById('startButton');
if (startBtn) {
  startBtn.addEventListener('click', () => {
    const seedVal = parseFloat(document.getElementById('seedInput').value);
    const octavesVal = parseInt(document.getElementById('octavesInput').value);
    const tempVal = parseFloat(document.getElementById('tempInput').value);
    const moistVal = parseFloat(document.getElementById('moistInput').value);
    const options = {
      seed: isNaN(seedVal) ? Math.random() : seedVal,
      octaves: isNaN(octavesVal) ? undefined : octavesVal,
      temperatureScale: isNaN(tempVal) ? undefined : tempVal,
      moistureScale: isNaN(moistVal) ? undefined : moistVal
    };
    startGame(options);
  });
}
