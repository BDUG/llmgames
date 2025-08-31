import { assets, loadAssets } from './assets.js';
import { generateWorld, drawWorld } from './world.js';
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

let tiles, player, cities;
const keys = {};

window.addEventListener('keydown', e => {
  keys[e.key] = true;
});

window.addEventListener('keyup', e => {
  keys[e.key] = false;
});

function setup(seed=Math.random()) {
  const result = generateWorld(worldWidth, worldHeight, gridSize, seed);
  tiles = result.tiles;
  player = new Ship(worldWidth / 2, worldHeight / 2);
  cities = [new City(600, 600, 'Port Royal')];
  bus.emit('log', 'World generated');
}

async function start() {
  await loadAssets(gridSize);
  setup();
  requestAnimationFrame(loop);
}

function loop(timestamp) {
  ctx.clearRect(0, 0, CSS_WIDTH, CSS_HEIGHT);
  drawWorld(ctx, tiles, gridSize, assets);
  cities.forEach(c => c.draw(ctx));
  if (keys['ArrowLeft']) player.rotate(-1);
  if (keys['ArrowRight']) player.rotate(1);
  if (keys['ArrowUp']) player.speed = Math.min(player.speed + 0.1, 5);
  if (keys['ArrowDown']) player.speed = Math.max(player.speed - 0.1, 0);
  player.update(1, tiles, gridSize); // simplistic update with collision
  player.draw(ctx);
  updateHUD(player);
  drawMinimap(minimapCtx, tiles, player, worldWidth, worldHeight);
  requestAnimationFrame(loop);
}

start();

window.startGame = seed => {
  setup(seed);
};
