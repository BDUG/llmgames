import { assets, loadAssets } from './assets.js';
import { generateWorld, drawWorld, Terrain } from './world.js';
import { Ship } from './entities/ship.js';
import { City } from './entities/city.js';
import { initHUD, updateHUD } from './ui/hud.js';
import { initMinimap, drawMinimap } from './ui/minimap.js';
import { initLog } from './ui/log.js';
import { bus } from './bus.js';

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

let tiles, player, cities, cityMetadata;
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

  let rngSeed = seed; // seeded randomness for deterministic placement
  const rand = () => {
    const x = Math.sin(rngSeed++) * 10000;
    return x - Math.floor(x);
  };

  // Collect all land tiles eligible for city placement.
  const landTiles = [];
  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < tiles[0].length; c++) {
      if (tiles[r][c] !== Terrain.WATER) landTiles.push({ r, c });
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
  player.update(1, tiles, gridSize); // simplistic update with collision

  const offsetX = player.x - CSS_WIDTH / 2;
  const offsetY = player.y - CSS_HEIGHT / 2;

  drawWorld(ctx, tiles, gridSize, assets, offsetX, offsetY);
  cities.forEach(c => c.draw(ctx, offsetX, offsetY));
  player.draw(ctx, offsetX, offsetY);
  updateHUD(player);
  drawMinimap(minimapCtx, tiles, player, worldWidth, worldHeight);
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
