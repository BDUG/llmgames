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
import { NpcShip } from './entities/npcShip.js';
import { City } from './entities/city.js';
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

let tiles, player, cities, cityMetadata, npcShips, priceEvents = [];
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
const GOODS = ['Sugar', 'Rum', 'Tobacco', 'Cotton'];

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
  if (metadata?.supplies?.includes(good)) stock = 15;
  if (metadata?.demands?.includes(good)) stock = 5;
  return stock;
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

function updateMarkets() {
  if (!cityMetadata) return;
  for (const [city, metadata] of cityMetadata.entries()) {
    metadata.prices = metadata.prices || {};
    metadata.inventory = metadata.inventory || {};
    GOODS.forEach(good => {
      const base = basePriceFor(good, metadata);
      const current = metadata.prices[good] ?? base;
      metadata.prices[good] = Math.round(current + (base - current) * 0.1);

      const baseStock = baseStockFor(good, metadata);
      const stock = metadata.inventory[good] ?? baseStock;
      if (stock < baseStock) metadata.inventory[good] = stock + 1;
      else if (stock > baseStock) metadata.inventory[good] = stock - 1;
    });
  }
  processPriceEvents();
}

function setup(seed = currentSeed) {
  currentSeed = seed;
  const result = generateWorld(worldWidth, worldHeight, gridSize, seed);
  tiles = result.tiles;
  worldWidth = result.cols * gridSize;
  worldHeight = result.rows * gridSize;
  // Place the player's ship roughly at the center of the generated world.
  let spawnX = worldWidth / 2;
  let spawnY = worldHeight / 2;

  // Ensure the spawn point is on water; if not, search outward for the nearest
  // water tile using a simple breadth-first search.
  if (tileAt(tiles, spawnX, spawnY, gridSize) !== Terrain.WATER) {
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
      if (tiles[r]?.[c] === Terrain.WATER) {
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
  cities = [];
  cityMetadata = new Map();
  npcShips = [];
  priceEvents = [];
  questManager.active = [];
  questManager.completed = [];
  bus.emit('quest-updated');

  let rngSeed = seed; // seeded randomness for deterministic placement
  const rand = () => {
    const x = Math.sin(rngSeed++) * 10000;
    return x - Math.floor(x);
  };

  // Collect water tiles for NPC spawning.
  const waterTiles = [];
  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < tiles[0].length; c++) {
      if (tiles[r][c] === Terrain.WATER) {
        waterTiles.push({ r, c });
      }
    }
  }

  // Prepare city metadata for all village tiles provided by generateWorld.
  const cityConfigs = [];
  result.villages.forEach(({ r, c }, i) => {
    const x = c * gridSize + gridSize / 2;
    const y = r * gridSize + gridSize / 2;
    const name = `Village ${i + 1}`;
    const supplies = GOODS.filter(() => rand() < 0.5);
    const demands = GOODS.filter(g => !supplies.includes(g) && rand() < 0.5);
    cityConfigs.push({ x, y, name, supplies, demands });
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
    cityMetadata.set(city, { nation, supplies: cfg.supplies, demands: cfg.demands });
  });

  const numNpcs = 3;
  for (let i = 0; i < numNpcs && waterTiles.length; i++) {
    const idx = Math.floor(rand() * waterTiles.length);
    const { r, c } = waterTiles[idx];
    const x = c * gridSize + gridSize / 2;
    const y = r * gridSize + gridSize / 2;
    const typeNames = Object.keys(Ship.TYPES);
    const type = typeNames[Math.floor(rand() * typeNames.length)];
    npcShips.push(
      new NpcShip(x, y, NATIONS[Math.floor(rand() * NATIONS.length)], type)
    );
  }

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
      cargoCapacity: player.cargoCapacity,
      gold: player.gold,
      crew: player.crew,
      hull: player.hull,
      hullMax: player.hullMax,
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
    setup(data.seed);
    Object.assign(player, data.player);
    player.cargo = data.player.cargo || {};
    player.reputation = data.player.reputation || {};
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
  // Update the player and clamp to the generated world's size
  player.update(dt, tiles, gridSize, worldWidth, worldHeight);

  if (player.mutinied) {
    updateHUD(player, wind);
    return;
  }

  const { x: offsetX, y: offsetY } = getCameraOffset(player);

  drawWorld(ctx, tiles, tileWidth, tileIsoHeight, tileImageHeight, assets, offsetX, offsetY);

  npcShips.forEach(n => {
    n.update(dt, tiles, gridSize, player, worldWidth, worldHeight);
    n.fireCannons(player);
  });

  const drawables = [...cities, ...npcShips, player];
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
    player.projectiles.forEach(p => {
      if (!n.sunk && cartesian(p.x, p.y, n.x, n.y) < 20) {
        n.takeDamage(25);
        p.life = 0;
        bus.emit('log', `Hit ${n.nation} ship for 25 damage`);
        if (n.sunk) {
          bus.emit('log', `${n.nation} ship sank!`);
          player.distributeLoot();
        }
      }
    });
    n.projectiles.forEach(p => {
      if (!player.sunk && cartesian(p.x, p.y, player.x, player.y) < 20) {
        player.takeDamage(25);
        p.life = 0;
        bus.emit('log', `Hit by ${n.nation} ship!`);
        if (player.sunk) bus.emit('log', 'You sank!');
      }
    });
    n.projectiles = n.projectiles.filter(p => p.life > 0);
  });
  player.projectiles = player.projectiles.filter(p => p.life > 0);
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
      npcShips.splice(i, 1);
      keys['c'] = keys['C'] = false;
      i--;
    }
  }
  updateHUD(player, wind);
  if (showMinimap) {
    drawMinimap(minimapCtx, tiles, player, worldWidth, worldHeight);
  }
  const nearestCityInfo = cities.reduce(
    (nearest, c) => {
      const dist = cartesian(player.x, player.y, c.x, c.y);
      return dist < nearest.dist ? { city: c, dist } : nearest;
    },
    { city: null, dist: Infinity }
  );
  const nearbyCity = nearestCityInfo.dist < 32 ? nearestCityInfo.city : null;
  if (nearbyCity) {
    console.log(
      `${nearbyCity.name} is ${nearestCityInfo.dist.toFixed(1)} units away`
    );
    if (!player.inPort) {
      bus.emit('log', `Approaching ${nearbyCity.name}`);
      player.visitPort();
    }
  } else {
    player.inPort = false;
  }
  updateCommandKeys({ nearCity: !!nearbyCity, nearEnemy });
  if (nearbyCity) {
    const metadata = cityMetadata.get(nearbyCity);
    if (keys['t'] || keys['T']) {
      closeTradeMenu();
      closeGovernorMenu();
      closeTavernMenu();
      closeUpgradeMenu();
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
      keys['t'] = keys['T'] = false;
    }
    if (keys['g'] || keys['G']) {
      closeTradeMenu();
      closeTavernMenu();
      closeUpgradeMenu();
      openGovernorMenu(player, nearbyCity, metadata);
      keys['g'] = keys['G'] = false;
    }
    if (keys['v'] || keys['V']) {
      closeTradeMenu();
      closeGovernorMenu();
      closeUpgradeMenu();
      openTavernMenu(player, nearbyCity);
      keys['v'] = keys['V'] = false;
    }
    if (keys['u'] || keys['U']) {
      closeTradeMenu();
      closeGovernorMenu();
      closeTavernMenu();
      openUpgradeMenu(player);
      keys['u'] = keys['U'] = false;
    }
  } else {
    closeTradeMenu();
    closeGovernorMenu();
    closeTavernMenu();
    closeUpgradeMenu();
  }
  requestAnimationFrame(loop);
}

start();

function startGame(seed) {
  setup(seed);
}

window.startGame = startGame;

const startBtn = document.getElementById('startButton');
if (startBtn) {
  startBtn.addEventListener('click', () => {
    const seed = parseFloat(document.getElementById('seedInput').value);
    startGame(seed);
  });
}
