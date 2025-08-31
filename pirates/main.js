import { assets, loadAssets } from './assets.js';
import { generateWorld, drawWorld, Terrain } from './world.js';
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
import { openTradeMenu, closeTradeMenu } from './ui/trade.js';
import { startBoarding } from './boarding.js';
import { initCommandKeys, updateCommandKeys } from './ui/commandKeys.js';

const worldWidth = 4800, worldHeight = 3200, gridSize = 128;
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

let tiles, player, cities, cityMetadata, npcShips;
const keys = {};

window.addEventListener('keydown', e => {
  keys[e.key] = true;
});

window.addEventListener('keyup', e => {
  keys[e.key] = false;
});

const NATIONS = ['England', 'France', 'Spain', 'Netherlands'];
const GOODS = ['Sugar', 'Rum', 'Tobacco', 'Cotton'];

function setup(seed=Math.random()) {
  const result = generateWorld(worldWidth, worldHeight, gridSize, seed);
  tiles = result.tiles;
  player = new Ship(worldWidth / 2, worldHeight / 2);
  cities = [];
  cityMetadata = new Map();
  npcShips = [];
  questManager.active = [];
  questManager.completed = [];
  bus.emit('quest-updated');

  let rngSeed = seed; // seeded randomness for deterministic placement
  const rand = () => {
    const x = Math.sin(rngSeed++) * 10000;
    return x - Math.floor(x);
  };

  // Collect all land tiles eligible for city placement.
  const landTiles = [], waterTiles = [];
  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < tiles[0].length; c++) {
      if (tiles[r][c] !== Terrain.WATER) landTiles.push({ r, c });
      else waterTiles.push({ r, c });
    }
  }

  const numCities = Math.min(5, landTiles.length);
  for (let i = 0; i < numCities; i++) {
    const idx = Math.floor(rand() * landTiles.length);
    const { r, c } = landTiles.splice(idx, 1)[0];
    const x = c * gridSize + gridSize / 2;
    const y = r * gridSize + gridSize / 2;
    const name = `City ${i + 1}`;
    const city = new City(x, y, name);
    cities.push(city);

    const nation = NATIONS[Math.floor(rand() * NATIONS.length)];
    const supplies = GOODS.filter(() => rand() < 0.5);
    const demands = GOODS.filter(g => !supplies.includes(g) && rand() < 0.5);
    cityMetadata.set(city, { nation, supplies, demands });
  }

  const numNpcs = 3;
  for (let i = 0; i < numNpcs && waterTiles.length; i++) {
    const idx = Math.floor(rand() * waterTiles.length);
    const { r, c } = waterTiles[idx];
    const x = c * gridSize + gridSize / 2;
    const y = r * gridSize + gridSize / 2;
    npcShips.push(new NpcShip(x, y, NATIONS[Math.floor(rand() * NATIONS.length)]));
  }

  questManager.addQuest(new Quest('capture', 'Capture an enemy ship', 'England', 10));

  bus.emit('log', 'World generated');
}

async function start() {
  await loadAssets(gridSize);
  setup();
  requestAnimationFrame(loop);
}

function loop(timestamp) {
  ctx.clearRect(0, 0, CSS_WIDTH, CSS_HEIGHT);
  if (keys['ArrowLeft']) player.rotate(-1);
  if (keys['ArrowRight']) player.rotate(1);
  if (keys['ArrowUp']) player.speed = Math.min(player.speed + 0.1, 5);
  if (keys['ArrowDown']) player.speed = Math.max(player.speed - 0.1, 0);
  if (keys[' ']) player.fireCannons();
  player.update(1, tiles, gridSize); // simplistic update with collision

  const offsetX = player.x - CSS_WIDTH / 2;
  const offsetY = player.y - CSS_HEIGHT / 2;

  drawWorld(ctx, tiles, gridSize, assets, offsetX, offsetY);
  cities.forEach(c => c.draw(ctx, offsetX, offsetY));
  npcShips.forEach(n => {
    n.update(1, tiles, gridSize, player);
    const dist = Math.hypot(player.x - n.x, player.y - n.y);
    if (dist < 200) n.fireCannons();
    n.draw(ctx, offsetX, offsetY);
  });
  player.draw(ctx, offsetX, offsetY);

  // projectile collisions
  npcShips.forEach(n => {
    player.projectiles.forEach(p => {
      if (!n.sunk && Math.hypot(p.x - n.x, p.y - n.y) < 20) {
        n.takeDamage(25);
        p.life = 0;
        bus.emit('log', `Hit ${n.nation} ship for 25 damage`);
        if (n.sunk) bus.emit('log', `${n.nation} ship sank!`);
      }
    });
    n.projectiles.forEach(p => {
      if (!player.sunk && Math.hypot(p.x - player.x, p.y - player.y) < 20) {
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
    const dist = Math.hypot(player.x - n.x, player.y - n.y);
    if (dist < 30) nearEnemy = true;
    if (dist < 30 && (keys['b'] || keys['B'])) {
      startBoarding(player, n);
      keys['b'] = keys['B'] = false;
    }
    if (dist < 30 && (keys['c'] || keys['C'])) {
      bus.emit('log', `Captured ${n.nation} ship!`);
      player.adjustReputation(n.nation, -5);
      questManager.completeQuest('capture');
      npcShips.splice(i, 1);
      keys['c'] = keys['C'] = false;
      i--;
    }
  }
  updateHUD(player);
  drawMinimap(minimapCtx, tiles, player, worldWidth, worldHeight);

  const nearbyCity = cities.find(c => Math.hypot(player.x - c.x, player.y - c.y) < 32);
  updateCommandKeys({ nearCity: !!nearbyCity, nearEnemy });
  if (nearbyCity) {
    openTradeMenu(player);
  } else {
    closeTradeMenu();
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
