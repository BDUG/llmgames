import { assets, loadAssets } from "./assets.js";

/***********************
 * Global Game Settings
 ***********************/
const worldWidth = 4800, worldHeight = 3200;
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
const hudDiv = document.getElementById('hud');
const questLogDiv = document.getElementById('questLog');
const logDiv = document.getElementById('log');
  const tradeMenuDiv = document.getElementById('tradeMenu');
  const governorMenuDiv = document.getElementById('governorMenu');
  const upgradeMenuDiv = document.getElementById('upgradeMenu');
  const cardContainer = document.getElementById('cardContainer');

  function addCard(imgSrc) {
    const img = document.createElement('img');
    img.src = imgSrc;
    img.className = 'card';
    cardContainer.appendChild(img);
  }

  const CITY_ICON_SIZE = 16;

  const BASE_SPRITE_SIZE = 32;
  const SPRITE_HD_SCALE = 2;
  const SHIP_CLASS_SCALE = { Sloop: 1, Brig: 1.5, Galleon: 2 };
  function getShipSpriteDimensions(type){
    const scale = SHIP_CLASS_SCALE[type] || 1;
    const size = BASE_SPRITE_SIZE * SPRITE_HD_SCALE * scale;
    return { w: size, h: size };
  }
  function getShipSprite(type, nation){
    return assets.ship && assets.ship[type] ? assets.ship[type][nation] : null;
  }

  let lastTime = 0;
let isPaused = false;
let inTradeMode = false;
let showMinimap = true;

// Global wind state (direction radians, speed pixels per update)
let windDirection = 0;
let windSpeed = 0.5;
let weatherState = { condition: "calm", visibility: 1 };
let stormSlowdown = 1;
let viewDistance = Infinity;

function updateWind() {
  windDirection = normalizeAngle(
    windDirection + (Math.random() - 0.5) * 0.2
  );
  const roll = Math.random();
  if (roll < 0.1) weatherState.condition = "storm";
  else if (roll < 0.2) weatherState.condition = "calm";
  else if (roll < 0.3) weatherState.condition = "fog";
  else weatherState.condition = "calm";

  switch (weatherState.condition) {
    case "storm":
      windSpeed = 1 + Math.random();
      weatherState.visibility = 1;
      break;
    case "calm":
      windSpeed = 0.05 + Math.random() * 0.2;
      weatherState.visibility = 1;
      break;
    case "fog":
      windSpeed = 0.2 + Math.random() * 0.3;
      weatherState.visibility = 0.4;
      break;
    default:
      windSpeed = 0.3 + Math.random() * 0.7;
      weatherState.visibility = 1;
  }
}
updateWind();
setInterval(updateWind, 15000);

// Arrays to hold game objects.
let islands = [];
let cities = [];
let ships = [];
let cannonballs = [];
let boardCandidate = null;
let quests = []; // Global quest log.
// Seed controlling world generation. Can be set before starting the game.
let worldSeed = Math.random() * 1000;

// Navigation grid for AI pathfinding
const gridSize = 128;
const gridCols = Math.floor(worldWidth / gridSize);
const gridRows = Math.floor(worldHeight / gridSize);
const Terrain = { WATER: 0, LAND: 1, VILLAGE: 2, COAST: 3, HILL: 4 };
let tiles = Array.from({ length: gridRows }, () => Array(gridCols).fill(Terrain.WATER));

const tileWidth = gridSize;
const tileHeight = gridSize;

function worldToIso(x, y) {
  return { x: (x - y) / 2, y: (x + y) / 4 };
}

function drawTile(row, col, offsetX, offsetY) {
  const type = tiles[row][col];
  let img;
  if (type === Terrain.WATER) img = assets.tiles.water;
  else if (type === Terrain.COAST) img = assets.tiles.coast;
  else if (type === Terrain.HILL) img = assets.tiles.hill;
  else if (type === Terrain.VILLAGE) img = assets.tiles.village;
  else img = assets.tiles.land;
  const isoX = (col - row) * tileWidth / 2 - offsetX;
  const isoY = (col + row) * tileHeight / 2 - offsetY;
  if (img) {
    ctx.drawImage(img, isoX, isoY, tileWidth, tileHeight);
  }
}

function movementCost(r, c, naval = true) {
  if (r < 0 || r >= gridRows || c < 0 || c >= gridCols) return Infinity;
  const tile = tiles[r][c];
  if (naval) return tile === Terrain.WATER ? 1 : Infinity;
  return tile === Terrain.WATER ? Infinity : 1;
}

function isWalkableRC(r, c, naval = true) {
  return movementCost(r, c, naval) !== Infinity;
}

function isWalkable(x, y, naval = true) {
  return isWalkableRC(Math.floor(y / gridSize), Math.floor(x / gridSize), naval);
}

function hasLineOfSight(x0, y0, x1, y1, naval = true) {
  let c0 = Math.floor(x0 / gridSize);
  let r0 = Math.floor(y0 / gridSize);
  const c1 = Math.floor(x1 / gridSize);
  const r1 = Math.floor(y1 / gridSize);
  let dc = Math.abs(c1 - c0);
  let dr = Math.abs(r1 - r0);
  let stepC = c0 < c1 ? 1 : -1;
  let stepR = r0 < r1 ? 1 : -1;
  let err = dc - dr;
  while (true) {
    if (!isWalkableRC(r0, c0, naval)) return false;
    if (c0 === c1 && r0 === r1) break;
    const e2 = err * 2;
    if (e2 > -dr) { err -= dr; c0 += stepC; }
    if (e2 < dc) { err += dc; r0 += stepR; }
  }
  return true;
}

function smoothPath(path, naval = true) {
  if (path.length <= 2) return path;
  const newPath = [path[0]];
  let i = 0;
  while (i < path.length - 1) {
    let j = path.length - 1;
    for (; j > i + 1; j--) {
      if (hasLineOfSight(path[i].x, path[i].y, path[j].x, path[j].y, naval)) break;
    }
    newPath.push(path[j]);
    i = j;
  }
  return newPath;
}

function findPath(sx, sy, gx, gy, naval = true) {
  const start = { c: Math.floor(sx / gridSize), r: Math.floor(sy / gridSize) };
  const goal  = { c: Math.floor(gx / gridSize), r: Math.floor(gy / gridSize) };

  const key = p => p.r + ',' + p.c;
  let open = [start];
  const came = {};
  const gScore = { [key(start)]: 0 };
  const fScore = { [key(start)]: distance(start.c, start.r, goal.c, goal.r) };

  while (open.length) {
    let idx = 0;
    for (let i = 1; i < open.length; i++) {
      if (fScore[key(open[i])] < fScore[key(open[idx])]) idx = i;
    }
    const current = open.splice(idx, 1)[0];
    if (current.c === goal.c && current.r === goal.r) {
      const path = [];
      let curKey = key(current);
      while (curKey) {
        const [r, c] = curKey.split(',').map(Number);
        path.push({ x: c * gridSize + gridSize / 2, y: r * gridSize + gridSize / 2 });
        curKey = came[curKey];
      }
      path.reverse();
      const smoothed = smoothPath(path, naval);
      smoothed.shift();
      return smoothed;
    }
    const neighbors = [
      { r: current.r - 1, c: current.c },
      { r: current.r + 1, c: current.c },
      { r: current.r, c: current.c - 1 },
      { r: current.r, c: current.c + 1 },
      { r: current.r - 1, c: current.c - 1 },
      { r: current.r - 1, c: current.c + 1 },
      { r: current.r + 1, c: current.c - 1 },
      { r: current.r + 1, c: current.c + 1 },
    ];
    for (let n of neighbors) {
      const tileCost = movementCost(n.r, n.c, naval);
      if (!isFinite(tileCost)) continue;
      if (n.r !== current.r && n.c !== current.c) {
        if (!isWalkableRC(current.r, n.c, naval) || !isWalkableRC(n.r, current.c, naval)) continue;
      }
      const nk = key(n);
      const cost = (n.r !== current.r && n.c !== current.c) ? Math.SQRT2 : 1;
      const tentativeG = gScore[key(current)] + cost * tileCost;
      if (tentativeG < (gScore[nk] ?? Infinity)) {
        came[nk] = key(current);
        gScore[nk] = tentativeG;
        fScore[nk] = tentativeG + distance(n.c, n.r, goal.c, goal.r);
        if (!open.some(o => o.r === n.r && o.c === n.c)) open.push(n);
      }
    }
  }
  return [];
}

// Key tracking.
const keys = {};

// Define nations and their Unicode flags.
const nations = {
  "Netherlands": "🇳🇱",
  "Spain":      "🇪🇸",
  "France":     "🇫🇷",
  "England":    "🇬🇧"
};

// Relationships between nations.
  let relationships = {};
  let playerReputation = {};
  let lettersOfMarque = {};
  let storyMilestones = {};
function initRelationships() {
  const nationKeys = Object.keys(nations);
  for (let i = 0; i < nationKeys.length; i++) {
    for (let j = i + 1; j < nationKeys.length; j++) {
      const key = nationKeys[i] + '-' + nationKeys[j];
      relationships[key] = Math.random() < 0.5 ? 'peace' : 'war';
    }
  }
  logMessage("Initial relationships set.");
}
setInterval(() => {
  const nationKeys = Object.keys(nations);
  for (let i = 0; i < nationKeys.length; i++) {
    for (let j = i + 1; j < nationKeys.length; j++) {
      const key = nationKeys[i] + '-' + nationKeys[j];
      relationships[key] = Math.random() < 0.5 ? 'peace' : 'war';
      logMessage(`Relationship between ${nationKeys[i]} and ${nationKeys[j]} is now ${relationships[key]}.`);
    }
  }
}, 120000);

function initReputation() {
  Object.keys(nations).forEach(n => {
    playerReputation[n] = 0;
    lettersOfMarque[n] = false;
  });
}

function areAtWar(nationA, nationB) {
  if (nationA === nationB) return false;
  const sorted = [nationA, nationB].sort();
  return relationships[sorted[0] + '-' + sorted[1]] === 'war';
}

/***********************
 * Utility Functions
 ***********************/
function logMessage(message) {
  const p = document.createElement('p');
  p.textContent = message;
  logDiv.appendChild(p);
  logDiv.scrollTop = logDiv.scrollHeight;
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Ray-casting algorithm for point-in-polygon.
function pointInPolygon(x, y, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

function randomPrice(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/***********************
 * Quest System
 ***********************/
  class Quest {
    constructor(id, type, data) {
      this.id = id;
      this.type = type;
      Object.assign(this, data);
      this.status = "active"; // active, completed, or failed.

      switch (type) {
        case "delivery":
          this.description = `Deliver ${this.amount} ${this.good} from ${this.originCity.name} to ${this.targetCity.name} for ${this.reward} gold.`;
          break;
        case "treasure":
          this.description = `Find hidden treasure near ${this.targetCity.name} for ${this.reward} gold.`;
          break;
        case "rescue":
          this.rescued = false;
          this.description = `Rescue the captive at ${this.targetCity.name} and return to ${this.originCity.name} for ${this.reward} gold.`;
          break;
        case "bounty":
          this.enemyDefeated = false;
          this.description = `Hunt down the pirate ${this.enemy} near ${this.targetCity.name} for ${this.reward} gold.`;
          break;
      }
    }
  }

  // Individual quest generators.
  function generateDeliveryQuest() {
    if (cities.length < 2) return null;
    let origin = cities[Math.floor(Math.random() * cities.length)];
    let target;
    do {
      target = cities[Math.floor(Math.random() * cities.length)];
    } while (target.id === origin.id);
    const goods = ["Rum", "Spices", "Gold"];
    const good = goods[Math.floor(Math.random() * goods.length)];
    const amount = Math.floor(Math.random() * 3) + 1;
    const reward = Math.floor(Math.random() * 100) + 50;
    return new Quest(Date.now(), "delivery", { originCity: origin, targetCity: target, good, amount, reward });
  }

  function generateTreasureHuntQuest() {
    if (cities.length === 0) return null;
    const target = cities[Math.floor(Math.random() * cities.length)];
    const reward = Math.floor(Math.random() * 200) + 100;
    return new Quest(Date.now(), "treasure", { targetCity: target, reward });
  }

  function generateRescueQuest() {
    if (cities.length < 2) return null;
    let origin = cities[Math.floor(Math.random() * cities.length)];
    let target;
    do {
      target = cities[Math.floor(Math.random() * cities.length)];
    } while (target.id === origin.id);
    const reward = Math.floor(Math.random() * 150) + 75;
    return new Quest(Date.now(), "rescue", { originCity: origin, targetCity: target, reward });
  }

  function generateBountyHuntQuest() {
    if (cities.length === 0) return null;
    const target = cities[Math.floor(Math.random() * cities.length)];
    const reward = Math.floor(Math.random() * 200) + 100;
    const enemy = "Notorious Pirate";
    return new Quest(Date.now(), "bounty", { targetCity: target, reward, enemy });
  }

  // Generate a random quest.
  function generateRandomQuest() {
    const generators = [generateDeliveryQuest, generateTreasureHuntQuest, generateRescueQuest, generateBountyHuntQuest];
    const generator = generators[Math.floor(Math.random() * generators.length)];
    const quest = generator();
    if (quest) {
      quests.push(quest);
      logMessage("New quest added: " + quest.description);
      updateQuestLogUI();
    }
  }

  function unlockStoryMissions() {
    const totalRep = Object.values(playerReputation).reduce((a, b) => a + b, 0);
    if (totalRep >= 20 && !storyMilestones.firstStory) {
      const target = cities[Math.floor(Math.random() * cities.length)];
      const quest = new Quest(Date.now(), "treasure", { targetCity: target, reward: 500 });
      quest.isStory = true;
      quests.push(quest);
      storyMilestones.firstStory = true;
      logMessage("Story mission unlocked: " + quest.description);
      updateQuestLogUI();
    }
  }

  // Check for quest completions.
  function checkQuestCompletions() {
    for (let i = quests.length - 1; i >= 0; i--) {
      let quest = quests[i];
      if (quest.status !== "active") continue;

      if (quest.type === "delivery") {
        if (distance(playerShip.x, playerShip.y, quest.targetCity.x, quest.targetCity.y) < 100) {
          if ((playerShip.inventory[quest.good] || 0) >= quest.amount) {
            playerShip.inventory[quest.good] -= quest.amount;
            playerShip.money += quest.reward;
            playerReputation[quest.originCity.nation]++;
            quest.status = "completed";
            logMessage("Quest completed: " + quest.description);
            quests.splice(i, 1);
            updateQuestLogUI();
            unlockStoryMissions();
          }
        }
      } else if (quest.type === "treasure") {
        if (distance(playerShip.x, playerShip.y, quest.targetCity.x, quest.targetCity.y) < 100) {
          playerShip.money += quest.reward;
          playerReputation[quest.targetCity.nation]++;
          quest.status = "completed";
          logMessage("Quest completed: " + quest.description);
          quests.splice(i, 1);
          updateQuestLogUI();
          unlockStoryMissions();
        }
      } else if (quest.type === "rescue") {
        if (!quest.rescued && distance(playerShip.x, playerShip.y, quest.targetCity.x, quest.targetCity.y) < 100) {
          quest.rescued = true;
          quest.description = `Return the captive to ${quest.originCity.name}.`;
          logMessage("Captive rescued! Return to " + quest.originCity.name + ".");
          updateQuestLogUI();
        } else if (quest.rescued && distance(playerShip.x, playerShip.y, quest.originCity.x, quest.originCity.y) < 100) {
          playerShip.money += quest.reward;
          playerReputation[quest.originCity.nation] += 2;
          quest.status = "completed";
          logMessage("Quest completed: " + quest.description);
          quests.splice(i, 1);
          updateQuestLogUI();
          unlockStoryMissions();
        }
      } else if (quest.type === "bounty") {
        if (distance(playerShip.x, playerShip.y, quest.targetCity.x, quest.targetCity.y) < 100) {
          playerShip.money += quest.reward;
          playerReputation[quest.targetCity.nation] += 2;
          quest.status = "completed";
          logMessage("Quest completed: " + quest.description);
          quests.splice(i, 1);
          updateQuestLogUI();
          unlockStoryMissions();
        }
      }
    }
  }

// Update the quest log UI.
function updateQuestLogUI() {
  if (quests.length === 0) {
    questLogDiv.innerHTML = "<strong>No active quests.</strong>";
  } else {
    let html = "<strong>Active Quests:</strong><br>";
    quests.forEach(q => {
      html += `<p>${q.description}</p>`;
    });
    questLogDiv.innerHTML = html;
  }
}

// Generate a new quest every 60 seconds.
setInterval(generateRandomQuest, 60000);

/***********************
 * Object Classes (Game Objects)
 ***********************/
class Island {
  constructor(vertices) {
    this.vertices = vertices;
    this.city = null;
  }
  draw(ctx, offsetX, offsetY) {
    ctx.fillStyle = "#228B22";
    ctx.beginPath();
    const start = worldToIso(this.vertices[0].x, this.vertices[0].y);
    ctx.moveTo(start.x - offsetX, start.y - offsetY);
    for (let i = 1; i < this.vertices.length; i++) {
      const p = worldToIso(this.vertices[i].x, this.vertices[i].y);
      ctx.lineTo(p.x - offsetX, p.y - offsetY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#006400";
    ctx.stroke();
  }
  drawMinimap(ctx, scale) {
    ctx.fillStyle = "#228B22";
    ctx.beginPath();
    ctx.moveTo(this.vertices[0].x * scale, this.vertices[0].y * scale);
    for (let i = 1; i < this.vertices.length; i++) {
      ctx.lineTo(this.vertices[i].x * scale, this.vertices[i].y * scale);
    }
    ctx.closePath();
    ctx.fill();
  }
}

class City {
  constructor(id, name, x, y, nation) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.nation = nation;
    this.population = 1000;

    // Each good now tracks its economic behaviour.  Prices are seeded
    // randomly but we also keep a basePrice to anchor future
    // fluctuations.  productionRate/consumptionRate are measured per
    // second and tradeVolume captures player trading since the last
    // economy update.
    const rumBase = randomPrice(10, 20);
    const spiceBase = randomPrice(15, 30);
    const goldBase = randomPrice(50, 100);
    this.goods = {
      "Rum": {
        price: rumBase,
        basePrice: rumBase,
        quantity: 100,
        productionRate: 2,
        consumptionRate: 1,
        maxStorage: 200,
        tradeVolume: 0
      },
      "Spices": {
        price: spiceBase,
        basePrice: spiceBase,
        quantity: 100,
        productionRate: 1.5,
        consumptionRate: 1,
        maxStorage: 200,
        tradeVolume: 0
      },
      "Gold": {
        price: goldBase,
        basePrice: goldBase,
        quantity: 50,
        productionRate: 0.5,
        consumptionRate: 0.2,
        maxStorage: 100,
        tradeVolume: 0
      }
    };
  }
    draw(ctx, offsetX, offsetY) {
      const iso = worldToIso(this.x, this.y);
      const width = CITY_ICON_SIZE;
      const height = CITY_ICON_SIZE;
      if (assets.tiles && assets.tiles.village) {
        ctx.drawImage(
          assets.tiles.village,
          iso.x - offsetX - width / 2,
          iso.y - offsetY - height / 2,
          width,
          height
        );
      }
      ctx.font = "12px sans-serif";
      ctx.fillText(this.name, iso.x - offsetX - 8, iso.y - offsetY + 22);
    }
  drawMinimap(ctx, scale) {
    ctx.fillStyle = "black";
    ctx.fillText("🏠", this.x * scale - 6, this.y * scale + 6);
    ctx.fillText(nations[this.nation], this.x * scale + 6, this.y * scale - 6);
  }
}

class Ship {
  constructor(id, type, nation, x, y, isPlayer = false) {
    this.id = id;
    this.type = type;
    this.nation = nation;
    this.x = x;
    this.y = y;
    this.angle = Math.random() * 2 * Math.PI;
    this.speed = 0;
    this.maxSpeed = type === "Sloop" ? 2 : type === "Brig" ? 1.5 : 1;
    this.hull = type === "Sloop" ? 100 : type === "Brig" ? 150 : 200;
    this.maxHull = this.hull;
    this.sail = 100;
    this.maxSail = 100;
    this.inventory = { "Rum": 0, "Spices": 0, "Gold": 0 };
    this.cannons = type === "Sloop" ? 2 : type === "Brig" ? 4 : 8;
    this.ammo = this.cannons * 10;
    this.maxAmmo = this.ammo;
    this.crew = type === "Sloop" ? 10 : type === "Brig" ? 20 : 30;
    this.maxCrew = this.crew;
    this.isPlayer = isPlayer;
    this.targetCity = null;
    this.homeCity = null;
    this.fireCooldown = 0;
    this.captured = false;
    this.money = 0;
    this.specialists = [];
    this.navigationAccuracy = 0;
    this.cannonDamage = 20;
    this.path = [];
    this.pathIndex = 0;
    this.behavior = 'trade';
    this.tradeRoute = [];
    this.routeIndex = 0;
    this.patrolPoints = [];
    this.patrolIndex = 0;
    this.chasing = null;
    this.dest = null;
    this.lastWindDirection = windDirection;
    this.lastWindSpeed = windSpeed;

    // Crew management
    this.morale = 100;          // overall happiness of the crew
    this.wages = 1;             // gold per crew member when paying wages
    this.mutinyThreshold = 20;  // morale level at which mutiny occurs
    this.wageTimer = 0;         // track time for periodic morale decay

    const dims = getShipSpriteDimensions(type);
    this.spriteWidth = dims.w;
    this.spriteHeight = dims.h;
  }
  setCourse(destX, destY) {
    this.dest = { x: destX, y: destY };
    this.lastWindDirection = windDirection;
    this.lastWindSpeed = windSpeed;
    this.path = findPath(this.x, this.y, destX, destY, true);
    this.pathIndex = 0;
    if (this.path.length === 0) {
      logMessage(`${this.nation} ship failed to plot course.`);
    } else {
      logMessage(`${this.nation} ship plotting course with ${this.path.length} waypoints.`);
    }
  }
  update(dt) {
    const windX = Math.cos(windDirection) * windSpeed;
    const windY = Math.sin(windDirection) * windSpeed;
    const relWind = normalizeAngle(windDirection - this.angle);
    const typeTurn =
      this.type === "Sloop" ? 0.07 : this.type === "Brig" ? 0.05 : 0.03;
    const windTurnFactor = 1 + Math.sin(relWind) * 0.3;
    const sailEfficiency =
      this.type === "Sloop" ? 1 : this.type === "Brig" ? 0.8 : 0.6;
    const baseSpeed = this.maxSpeed * sailEfficiency * (this.sail / this.maxSail) * (this.morale/100) * stormSlowdown;
    const windMod = Math.cos(relWind) * windSpeed;
    if (this.isPlayer) {
      this.wageTimer += dt;
      if (this.wageTimer >= 60) {
        this.morale = Math.max(0, this.morale - 5);
        this.wageTimer = 0;
        if (this.morale <= this.mutinyThreshold) {
          logMessage("Mutiny! The crew seizes your gold and morale resets.");
          this.money = 0;
          this.morale = 50;
        }
      }
    }

    if (this.isPlayer) {
      if (keys["ArrowLeft"]) this.angle -= typeTurn * windTurnFactor;
      if (keys["ArrowRight"]) this.angle += typeTurn * windTurnFactor;
      this.speed = keys["ArrowUp"] ? Math.max(0, baseSpeed + windMod) : 0;
    } else {
      if (this.dest && this.path.length) {
        const windDirChange = Math.abs(normalizeAngle(windDirection - (this.lastWindDirection || 0)));
        const windSpdChange = Math.abs(windSpeed - (this.lastWindSpeed || 0));
        const finalTarget = this.dest;
        if (
          windDirChange > 0.5 ||
          windSpdChange > 0.5 ||
          !hasLineOfSight(this.x, this.y, finalTarget.x, finalTarget.y, true)
        ) {
          this.setCourse(finalTarget.x, finalTarget.y);
        }
      }
      if (this.chasing && distance(this.chasing.x, this.chasing.y, this.x, this.y) > 400) {
        logMessage(`${this.nation} patrol ship lost target.`);
        this.chasing = null;
      }
      if (this.path.length === 0) {
        if (this.chasing) {
          this.setCourse(this.chasing.x, this.chasing.y);
        } else if (this.behavior === 'trade' && this.targetCity) {
          this.setCourse(this.targetCity.x, this.targetCity.y);
        } else if (this.behavior === 'patrol' && this.patrolPoints.length) {
          const pt = this.patrolPoints[this.patrolIndex];
          this.setCourse(pt.x, pt.y);
        }
      }
      if (this.path.length) {
        const waypoint = this.path[this.pathIndex];
        let desired = {
          x: waypoint.x - this.x,
          y: waypoint.y - this.y,
        };
        let mag = Math.hypot(desired.x, desired.y);
        if (mag > 0) { desired.x /= mag; desired.y /= mag; }
        let targetAngle = Math.atan2(desired.y, desired.x);
        let angleDiff = normalizeAngle(targetAngle - this.angle);
        let turnRate = typeTurn * windTurnFactor;
        if (angleDiff > turnRate) this.angle += turnRate;
        else if (angleDiff < -turnRate) this.angle -= turnRate;
        else this.angle = targetAngle;
        this.speed = Math.max(0, baseSpeed * 0.8 + windMod);
        if (distance(this.x, this.y, waypoint.x, waypoint.y) < gridSize / 3) {
          this.pathIndex++;
          if (this.pathIndex >= this.path.length) {
            this.path = [];
            this.dest = null;
          }
        }
      } else {
        this.speed = Math.max(0, baseSpeed * 0.5 + windMod);
      }
    }
    const newX =
      this.x + Math.cos(this.angle) * this.speed + windX;
    const newY =
      this.y + Math.sin(this.angle) * this.speed + windY;
    if (isWalkable(newX, newY, true)) { this.x = newX; this.y = newY; }
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (!this.isPlayer && !inTradeMode && this.fireCooldown <= 0 && playerShip) {
      const d = distance(this.x, this.y, playerShip.x, playerShip.y);
      if (d < 300 && areAtWar(this.nation, playerShip.nation)) {
        fireCannon(this, playerShip.x, playerShip.y);
        this.fireCooldown = 2;
      }
    }
    if (!this.isPlayer) {
      if (!isWalkable(this.x, this.y, true)) { repositionEnemyShip(this); }
      if (this.behavior === 'trade' && this.targetCity &&
          distance(this.x, this.y, this.targetCity.x, this.targetCity.y) < 100) {
        this.routeIndex = (this.routeIndex + 1) % this.tradeRoute.length;
        this.targetCity = this.tradeRoute[this.routeIndex];
        logMessage(`${this.nation} ship now trading to ${this.targetCity.name}.`);
        this.setCourse(this.targetCity.x, this.targetCity.y);
      }
      if (this.behavior === 'patrol' && this.patrolPoints.length) {
        if (distance(this.x, this.y, this.patrolPoints[this.patrolIndex].x, this.patrolPoints[this.patrolIndex].y) < 50) {
          this.patrolIndex = (this.patrolIndex + 1) % this.patrolPoints.length;
          const pt = this.patrolPoints[this.patrolIndex];
          logMessage(`${this.nation} patrol ship moving to waypoint ${this.patrolIndex}.`);
          this.setCourse(pt.x, pt.y);
        }
        if (!this.chasing) {
          for (let s of ships) {
            if (s !== this && s.nation !== this.nation && areAtWar(s.nation, this.nation) && distance(this.x, this.y, s.x, s.y) < 300) {
              this.chasing = s;
              logMessage(`${this.nation} patrol ship engaging ${s.nation} vessel.`);
              this.path = [];
              break;
            }
          }
        } else {
          if (distance(this.x, this.y, this.chasing.x, this.chasing.y) < 50) {
            this.chasing = null;
          }
        }
      }
    }
    checkQuestCompletions();
  }
  draw(ctx, offsetX, offsetY) {
    ctx.save();
    const iso = worldToIso(this.x, this.y);
    ctx.translate(iso.x - offsetX, iso.y - offsetY);
    ctx.rotate(this.angle);
    const sprite = getShipSprite(this.type, this.nation);
    if (sprite) {
      ctx.drawImage(sprite, -this.spriteWidth/2, -this.spriteHeight/2, this.spriteWidth, this.spriteHeight);
    } else {
      ctx.font = "20px serif";
      ctx.fillText("⛵", -10, 10);
    }
    if (this.isPlayer) {
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const bow = this.spriteWidth/2;
      ctx.lineTo(bow, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bow, 0);
      ctx.lineTo(bow - 5, -5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bow, 0);
      ctx.lineTo(bow - 5, 5);
      ctx.stroke();
    }
    ctx.restore();
    ctx.font = "12px sans-serif";
    ctx.fillText(nations[this.nation], iso.x - offsetX + 15, iso.y - offsetY - 15);
  }
  drawMinimap(ctx, scale) {
    ctx.fillStyle = this.isPlayer ? "blue" : "red";
    ctx.beginPath();
    ctx.arc(this.x * scale, this.y * scale, 3, 0, 2 * Math.PI);
    ctx.fill();
  }
}

class Cannonball {
  constructor(x, y, angle, owner) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 5;
    this.damage = 20;
    this.range = 300;
    this.distanceTraveled = 0;
    this.owner = owner;
  }
  update(dt) {
    const dx = Math.cos(this.angle) * this.speed;
    const dy = Math.sin(this.angle) * this.speed;
    this.x += dx;
    this.y += dy;
    this.distanceTraveled += Math.hypot(dx, dy);
  }
  draw(ctx, offsetX, offsetY) {
    const iso = worldToIso(this.x, this.y);
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(iso.x - offsetX, iso.y - offsetY, 5, 0, 2 * Math.PI);
    ctx.fill();
  }
  drawMinimap(ctx, scale) {
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(this.x * scale, this.y * scale, 2, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function fireCannon(ship, targetX, targetY) {
  if (ship.ammo <= 0) {
    logMessage((ship.isPlayer ? "Player" : ship.nation + " ship") + " is out of ammo!");
    return;
  }
  ship.ammo--;
  const accuracy = Math.min(1, ship.morale / 100 + (ship.navigationAccuracy || 0));
  const angle = Math.atan2(targetY - ship.y, targetX - ship.x) + (Math.random() - 0.5) * (1 - accuracy) * 0.3;
  const cannonball = new Cannonball(
    ship.x + Math.cos(angle) * 20,
    ship.y + Math.sin(angle) * 20,
    angle,
    ship
  );
  cannonball.damageType = Math.random() < 0.5 ? "hull" : "sail";
  cannonball.damage = ship.cannonDamage || cannonball.damage;
  cannonballs.push(cannonball);
  logMessage((ship.isPlayer ? "Player" : ship.nation + " ship") +
    ` fired a cannonball. Ammo: ${ship.ammo}`);
}

function repositionEnemyShip(ship) {
  let baseCity = ship.homeCity || cities[0];
  let repositioned = false;
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const offsetDistance = Math.random() * 50 + 150;
    const newX = baseCity.x + Math.cos(angle) * offsetDistance;
    const newY = baseCity.y + Math.sin(angle) * offsetDistance;
    if (isWalkable(newX, newY, true)) {
      ship.x = newX;
      ship.y = newY;
      repositioned = true;
      logMessage(`${ship.nation} ship repositioned near ${baseCity.name}.`);
      break;
    }
  }
  if (!repositioned) {
    ship.x = baseCity.x + 200;
    ship.y = baseCity.y + 200;
    logMessage(`${ship.nation} ship repositioned (fallback) near ${baseCity.name}.`);
  }
}

/***********************
 * World Generation
 ***********************/
function random2(x, y, seed) {
  return Math.abs(Math.sin(x * 127.1 + y * 311.7 + seed * 101.3)) % 1;
}
function lerp(a, b, t) { return a + (b - a) * t; }
function valueNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const sx = x - x0;
  const sy = y - y0;
  const n00 = random2(x0, y0, seed);
  const n10 = random2(x1, y0, seed);
  const n01 = random2(x0, y1, seed);
  const n11 = random2(x1, y1, seed);
  const ix0 = lerp(n00, n10, sx);
  const ix1 = lerp(n01, n11, sx);
  return lerp(ix0, ix1, sy);
}
function fbm(x, y, seed = 0) {
  let total = 0, freq = 1, amp = 1, max = 0;
  for (let i = 0; i < 4; i++) {
    total += valueNoise(x * freq, y * freq, seed + i * 10) * amp;
    max += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return total / max;
}
function generateIslands(seed = worldSeed) {
  islands = [];
  tiles = [];
  const scale = 0.1;
  for (let r = 0; r < gridRows; r++) {
    const row = [];
    for (let c = 0; c < gridCols; c++) {
      const h = fbm(c * scale, r * scale, seed);
      let type;
      if (h > 0.75) type = Terrain.HILL;
      else if (h > 0.55) type = Terrain.LAND;
      else if (h > 0.45) type = Terrain.COAST;
      else type = Terrain.WATER;
      row.push(type);
    }
    tiles.push(row);
  }

  // After tiles have been classified, identify contiguous landmasses.
  const visited = Array.from({ length: gridRows }, () => Array(gridCols).fill(false));
  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1]
  ];

  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      if (visited[r][c]) continue;
      const tileType = tiles[r][c];
      if (tileType === Terrain.WATER) {
        visited[r][c] = true;
        continue;
      }

      // Flood fill to gather all tiles in this landmass.
      const queue = [[r, c]];
      visited[r][c] = true;
      let minR = r, maxR = r, minC = c, maxC = c;

      while (queue.length) {
        const [cr, cc] = queue.shift();
        minR = Math.min(minR, cr);
        maxR = Math.max(maxR, cr);
        minC = Math.min(minC, cc);
        maxC = Math.max(maxC, cc);
        for (const [dr, dc] of dirs) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr < 0 || nr >= gridRows || nc < 0 || nc >= gridCols) continue;
          if (visited[nr][nc]) continue;
          if (tiles[nr][nc] === Terrain.WATER) continue;
          visited[nr][nc] = true;
          queue.push([nr, nc]);
        }
      }

      // Convert bounding box to polygon vertices in world coordinates.
      const vertices = [
        { x: minC * gridSize,       y: minR * gridSize },
        { x: (maxC + 1) * gridSize, y: minR * gridSize },
        { x: (maxC + 1) * gridSize, y: (maxR + 1) * gridSize },
        { x: minC * gridSize,       y: (maxR + 1) * gridSize }
      ];
      islands.push(new Island(vertices));
    }
  }
}

function generateCities() {
  cities = [];
  let cityId = 1;
  let fallback = null;
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      if (tiles[r][c] !== Terrain.COAST) continue;
      const neighbors = [
        [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]
      ];
      let isShore = neighbors.some(([nr, nc]) =>
        nr >= 0 && nr < gridRows && nc >= 0 && nc < gridCols &&
        tiles[nr][nc] === Terrain.WATER
      );
      if (!isShore) continue;
      if (Math.random() > 0.1) {
        if (!fallback) fallback = { r, c };
        continue;
      }
      tiles[r][c] = Terrain.VILLAGE;
      const x = c * gridSize + gridSize / 2;
      const y = r * gridSize + gridSize / 2;
      const nationKeys = Object.keys(nations);
      const nation = nationKeys[Math.floor(Math.random() * nationKeys.length)];
      const city = new City(cityId, "City " + cityId, x, y, nation);
      cities.push(city);
      cityId++;
    }
  }
  if (!cities.length && fallback) {
    const { r, c } = fallback;
    tiles[r][c] = Terrain.VILLAGE;
    const x = c * gridSize + gridSize / 2;
    const y = r * gridSize + gridSize / 2;
    const nationKeys = Object.keys(nations);
    const nation = nationKeys[Math.floor(Math.random() * nationKeys.length)];
    cities.push(new City(cityId, "City " + cityId, x, y, nation));
  }
}

function generateEnemyShips() {
  ships = ships.filter(s => s.isPlayer);
  let shipId = 1;
  for (let city of cities) {
    let spawnX = city.x + Math.random() * 100 - 50;
    let spawnY = city.y + Math.random() * 100 - 50;
    if (!isWalkable(spawnX, spawnY, true)) {
      spawnX = city.x + 100;
      spawnY = city.y + 100;
    }
    const types = ["Sloop", "Brig", "Galleon"];
    const type = types[Math.floor(Math.random() * types.length)];
    const ship = new Ship(shipId, type, city.nation, spawnX, spawnY);
    ship.homeCity = city;
    if (Math.random() < 0.5) {
      ship.behavior = 'trade';
      ship.tradeRoute = [city];
      let available = cities.filter(c => c.id !== city.id);
      while (ship.tradeRoute.length < 3 && available.length) {
        let next = available.splice(Math.floor(Math.random() * available.length), 1)[0];
        ship.tradeRoute.push(next);
      }
      ship.routeIndex = 1;
      ship.targetCity = ship.tradeRoute[1];
      logMessage(`${ship.nation} trade ship from ${city.name} bound for ${ship.targetCity.name}.`);
      ship.setCourse(ship.targetCity.x, ship.targetCity.y);
    } else {
      ship.behavior = 'patrol';
      const radius = 200;
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * 2 * Math.PI;
        ship.patrolPoints.push({ x: city.x + Math.cos(ang) * radius, y: city.y + Math.sin(ang) * radius });
      }
      ship.patrolIndex = 0;
      const pt = ship.patrolPoints[0];
      logMessage(`${ship.nation} patrol ship guarding ${city.name}.`);
      ship.setCourse(pt.x, pt.y);
    }
    ships.push(ship);
    shipId++;
  }
}

let playerShip = null;
function spawnPlayerShip() {
  if (!cities.length) {
    console.error("No cities generated; cannot spawn player ship.");
    return; // or regenerate cities / use fallback coordinates
  }
  const englishCities = cities.filter(c => c.nation === "England");
  let spawnCity = englishCities.length ? englishCities[Math.floor(Math.random() * englishCities.length)] : cities[0];
  let spawnX = spawnCity.x + Math.random() * 100 - 50;
  let spawnY = spawnCity.y + Math.random() * 100 - 50;
  if (!isWalkable(spawnX, spawnY, true)) {
    spawnX = spawnCity.x + 100;
    spawnY = spawnCity.y + 100;
  }
  playerShip = new Ship(0, "Sloop", "England", spawnX, spawnY, true);
  playerShip.money = 100;
  ships.push(playerShip);
  logMessage("Player ship spawned near " + spawnCity.name);
}

/***********************
 * Game Mechanics & Updates
 ***********************/
function updateCityEconomies(dt) {
  // Simulate simple supply/demand dynamics for each city.  Production and
  // consumption adjust quantities, while recent trade and scarcity affect
  // prices.
  for (let city of cities) {
    for (let goodName in city.goods) {
      const good = city.goods[goodName];

      // Apply local production and consumption.
      good.quantity += good.productionRate * dt;
      good.quantity -= good.consumptionRate * dt;

      // Apply player trade impact from since the last update.
      good.quantity += good.tradeVolume;

      // Adjust price based on trade volume: buying from the city (negative
      // tradeVolume) drives prices up, selling drives them down.
      if (good.tradeVolume !== 0) {
        good.price += (-good.tradeVolume) * 0.5;
      }
      good.tradeVolume = 0;

      // Clamp inventory within storage limits.
      if (good.quantity > good.maxStorage) good.quantity = good.maxStorage;
      if (good.quantity < 0) good.quantity = 0;

      // Scarcity influences price relative to the base price.
      const scarcity = 1 - (good.quantity / good.maxStorage);
      good.price = Math.max(
        1,
        good.basePrice * (1 + scarcity)
      );
    }
  }
}

function update(dt) {
  if (isPaused || inTradeMode) return;
  stormSlowdown = weatherState.condition === "storm" ? 0.7 : 1;
  viewDistance = weatherState.condition === "fog" ? 200 : Infinity;
  boardCandidate = null;
  for (let ship of ships) {
    ship.update(dt);
    if (playerShip && ship !== playerShip && !ship.captured &&
        distance(playerShip.x, playerShip.y, ship.x, ship.y) < 20) {
      boardCandidate = ship;
    }
  }
  for (let i = cannonballs.length - 1; i >= 0; i--) {
    const cb = cannonballs[i];
    cb.update(dt);
    if (cb.distanceTraveled > cb.range) { cannonballs.splice(i, 1); continue; }
    for (let ship of ships) {
      if (ship === cb.owner) continue;
      if (distance(cb.x, cb.y, ship.x, ship.y) < 15) {
        if (cb.damageType === "sail") {
          ship.sail = Math.max(0, ship.sail - cb.damage);
        } else {
          ship.hull = Math.max(0, ship.hull - cb.damage);
        }
        const casualties = Math.floor(Math.random() * 3);
        ship.crew = Math.max(0, ship.crew - casualties);
        logMessage((ship.isPlayer ? "Player" : ship.nation + " ship") +
          ` hit! Hull: ${ship.hull.toFixed(0)} Sails: ${ship.sail.toFixed(0)}`);
        cannonballs.splice(i, 1);
        break;
      }
    }
  }
  if (playerShip && (playerShip.hull <= 0 || playerShip.crew <= 0)) {
    let nearestCity = cities[0];
    let minDist = distance(playerShip.x, playerShip.y, cities[0].x, cities[0].y);
    for (let city of cities) {
      const d = distance(playerShip.x, playerShip.y, city.x, city.y);
      if (d < minDist) { minDist = d; nearestCity = city; }
    }
    logMessage("Player ship lost! Respawning at " + nearestCity.name);
    playerShip.x = nearestCity.x + 50;
    playerShip.y = nearestCity.y + 50;
    playerShip.type = "Sloop";
    playerShip.hull = playerShip.maxHull = 100;
    playerShip.sail = playerShip.maxSail = 100;
    playerShip.cannons = 2;
    playerShip.ammo = playerShip.maxAmmo = playerShip.cannons * 10;
    playerShip.money = 100;
    playerShip.crew = playerShip.maxCrew = 10;
  }
  updateCityEconomies(dt);
}

function draw() {
  let offsetX = 0, offsetY = 0;
  if (playerShip) {
    const pIso = worldToIso(playerShip.x, playerShip.y);
    offsetX = pIso.x - CSS_WIDTH / 2;
    offsetY = pIso.y - CSS_HEIGHT / 2;
    const isoMinX = -worldHeight / 2;
    const isoMaxX = worldWidth / 2;
    const isoMinY = 0;
    const isoMaxY = (worldWidth + worldHeight) / 4;
    offsetX = Math.max(isoMinX, Math.min(isoMaxX - CSS_WIDTH, offsetX));
    offsetY = Math.max(isoMinY, Math.min(isoMaxY - CSS_HEIGHT, offsetY));
  }

  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(0, 0, CSS_WIDTH, CSS_HEIGHT);
  // Draw landmasses derived from the flood-fill.
  islands.forEach(island => island.draw(ctx, offsetX, offsetY));
  cities.forEach(city => city.draw(ctx, offsetX, offsetY));
  ships.forEach(ship => ship.draw(ctx, offsetX, offsetY));
  cannonballs.forEach(cb => cb.draw(ctx, offsetX, offsetY));
  if (weatherState.condition === "fog" && playerShip) {
    const radius = viewDistance;
    const pIso = worldToIso(playerShip.x, playerShip.y);
    const grad = ctx.createRadialGradient(
      pIso.x - offsetX,
      pIso.y - offsetY,
      radius * 0.2,
      pIso.x - offsetX,
      pIso.y - offsetY,
      radius
    );
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(1, "rgba(255,255,255,0.8)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CSS_WIDTH, CSS_HEIGHT);
  }

  if (playerShip) {
    hudDiv.innerHTML = `
      <p>Hull: ${playerShip.hull.toFixed(0)} / ${playerShip.maxHull}</p>
      <p>Sails: ${playerShip.sail.toFixed(0)} / ${playerShip.maxSail}</p>
      <p>Ammo: ${playerShip.ammo} / ${playerShip.maxAmmo}</p>
      <p>Crew: ${playerShip.crew} / ${playerShip.maxCrew}</p>
      <p>Morale: ${playerShip.morale.toFixed(0)}%</p>
      <p>Money: ${playerShip.money}</p>
      <p>Ship: ${playerShip.type}</p>
      <p>Nation: ${playerShip.nation} ${nations[playerShip.nation]}</p>
      <p>Cannons: ${playerShip.cannons}</p>
      <p>Nav. Accuracy: ${(playerShip.navigationAccuracy*100).toFixed(0)}%</p>
      <p>Cannon Damage: ${playerShip.cannonDamage}</p>
      <p>Wind: ${windSpeed.toFixed(1)} @ ${(windDirection * 180/Math.PI).toFixed(0)}°</p>
      <p>Weather: ${weatherState.condition}</p>
    `;
    if (boardCandidate) {
      hudDiv.innerHTML += `<p>Press B to board!</p>`;
    }
  }

  updateQuestLogUI();

  if (showMinimap) {
    minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    const scale = minimapCanvas.width / worldWidth;
    minimapCtx.fillStyle = "#87CEEB";
    minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    islands.forEach(island => island.drawMinimap(minimapCtx, scale));
    cities.forEach(city => city.drawMinimap(minimapCtx, scale));
    ships.forEach(ship => ship.drawMinimap(minimapCtx, scale));
    cannonballs.forEach(cb => cb.drawMinimap(minimapCtx, scale));
  }
}

function gameLoop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

/***********************
 * Input & Controls
 ***********************/
document.addEventListener("keydown", (e) => {
  if (!inTradeMode) keys[e.key] = true;
  if (e.key === " ") {
    if (playerShip && playerShip.fireCooldown <= 0) {
      fireCannon(playerShip,
        playerShip.x + Math.cos(playerShip.angle) * 300,
        playerShip.y + Math.sin(playerShip.angle) * 300);
      playerShip.fireCooldown = 1;
    }
  }
  if (e.key.toLowerCase() === "p") {
    isPaused = !isPaused;
    logMessage(isPaused ? "Game Paused" : "Game Resumed");
  }
  if (e.key.toLowerCase() === "m") { showMinimap = !showMinimap; }
  if (e.key.toLowerCase() === "s") { saveGame(); }
  if (e.key.toLowerCase() === "l") { loadGame(); }
  if (e.key.toLowerCase() === "t") { toggleTradeMode(); }
  if (e.key.toLowerCase() === "c") { attemptCapture(); }
  if (e.key.toLowerCase() === "b") { attemptBoarding(); }
});

document.addEventListener("keyup", (e) => { keys[e.key] = false; });

/***********************
 * Trading Mode
 ***********************/
function toggleTradeMode() {
  if (!inTradeMode) {
    let nearbyCity = cities.find(city => distance(playerShip.x, playerShip.y, city.x, city.y) < 100);
    if (nearbyCity) {
      inTradeMode = true;
      isPaused = true;
      openTradeMenu(nearbyCity);
    } else { logMessage("Not near any city to trade."); }
  } else {
    inTradeMode = false;
    isPaused = false;
    closeTradeMenu();
  }
}

function openTradeMenu(city) {
  tradeMenuDiv.style.display = "block";

  // Build inventory list dynamically to reflect current prices and
  // quantities that may fluctuate over time.
  const inventory = Object.entries(city.goods)
    .map(([name, data]) => `<li>${name}: ${data.quantity.toFixed(0)} @ ${data.price.toFixed(0)}</li>`)
    .join("");

  tradeMenuDiv.innerHTML = `
    <h3>Trading at ${city.name} (${city.nation} ${nations[city.nation]})</h3>
    <p>Your Money: ${playerShip.money}</p>
    <p>Reputation with ${city.nation}: ${playerReputation[city.nation]}</p>
    <p>City Inventory:</p>
    <ul>${inventory}</ul>
    <p>Controls:</p>
    <p>Buy: 1 (Rum), 2 (Spices), 3 (Gold)</p>
    <p>Sell: Q (Rum), W (Spices), E (Gold)</p>
    <p>Buy Cannon: 4 | Recruit Crew: R</p>
    <p>Sell Captured Ship: V | Sell Cannon: Y</p>
    <p>Visit Governor: G | Accept Mission: M</p>
    <p>Refit Ship: F | Hire Specialists: H</p>
    <p>Pay Crew: P | Share Loot: L</p>
    <p>Press T to exit trading.</p>
  `;
}

function closeTradeMenu() {
  tradeMenuDiv.style.display = "none";
  governorMenuDiv.style.display = "none";
  upgradeMenuDiv.style.display = "none";
}

function openGovernorMenu(city) {
  governorMenuDiv.style.display = "block";
  governorMenuDiv.innerHTML = `
    <h3>Governor of ${city.name}</h3>
    <p>Nation: ${city.nation} ${nations[city.nation]}</p>
    <p>Your Reputation: ${playerReputation[city.nation]}</p>
    <p>M: Accept Mission (Rep ≥ 10)</p>
    <p>L: Request Letter of Marque (Rep ≥ 20)</p>
    <p>Esc: Exit</p>
  `;
}

function closeGovernorMenu() { governorMenuDiv.style.display = "none"; }

function openUpgradeMenu(city) {
  upgradeMenuDiv.style.display = "block";
  upgradeMenuDiv.innerHTML = `
    <h3>Shipyard at ${city.name}</h3>
    <p>Money: ${playerShip.money}</p>
    <p>1: Reinforce Hull (+20 max hull, 100 gold)</p>
    <p>2: Improve Sails (+20 max sail, 100 gold)</p>
    <p>3: Refine Navigation (+5% accuracy, 100 gold)</p>
    <p>4: Upgrade Cannons (+5 damage, 100 gold)</p>
    <p>Esc: Exit</p>
  `;
}

function closeUpgradeMenu() { upgradeMenuDiv.style.display = "none"; }

function payCrew() {
  const cost = playerShip.wages * playerShip.crew;
  if (playerShip.money >= cost) {
    playerShip.money -= cost;
    playerShip.morale = Math.min(100, playerShip.morale + 15);
    logMessage(`Crew paid ${cost} gold.`);
  } else {
    logMessage("Not enough gold to pay the crew.");
    playerShip.morale = Math.max(0, playerShip.morale - 5);
  }
}

function distributeLoot() {
  if (playerShip.money <= 0) {
    logMessage("No loot to share.");
    return;
  }
  const share = Math.floor(playerShip.money * 0.2);
  playerShip.money -= share;
  playerShip.morale = Math.min(100, playerShip.morale + 20);
  logMessage(`Crew shares ${share} gold in loot.`);
}

function acceptMissionFromCity(city) {
  if (playerReputation[city.nation] < 10) {
    logMessage("Reputation too low for missions.");
    return;
  }
  if (cities.length < 2) return;
  let target;
  do {
    target = cities[Math.floor(Math.random() * cities.length)];
  } while (target.id === city.id);
  const goods = ["Rum", "Spices", "Gold"];
  const good = goods[Math.floor(Math.random() * goods.length)];
  const amount = Math.floor(Math.random() * 3) + 1;
  const reward = Math.floor(Math.random() * 100) + 50;
  const quest = new Quest(Date.now(), "delivery", city, target, good, amount, reward);
  quests.push(quest);
  logMessage("Mission accepted: " + quest.description);
  updateQuestLogUI();
}

function requestLetterOfMarque(city) {
  if (playerReputation[city.nation] < 20) {
    logMessage("Reputation too low for letter of marque.");
    return;
  }
  if (lettersOfMarque[city.nation]) {
    logMessage("Letter of marque already granted.");
    return;
  }
  lettersOfMarque[city.nation] = true;
  logMessage(`${city.nation} grants you a letter of marque!`);
}

document.addEventListener("keydown", (e) => {
  if (inTradeMode) {
    let currentCity = cities.find(city => distance(playerShip.x, playerShip.y, city.x, city.y) < 100);
    if (!currentCity) return;

    if (governorMenuDiv.style.display === "block") {
      switch (e.key.toLowerCase()) {
        case "m":
          acceptMissionFromCity(currentCity);
          break;
        case "l":
          requestLetterOfMarque(currentCity);
          break;
        case "escape":
          closeGovernorMenu();
          break;
      }
      return;
    }

    if (upgradeMenuDiv.style.display === "block") {
      switch (e.key) {
        case "1":
          if (playerShip.money >= 100) {
            playerShip.money -= 100;
            playerShip.maxHull += 20;
            playerShip.hull = playerShip.maxHull;
            logMessage("Hull upgraded.");
          } else {
            logMessage("Not enough gold for hull upgrade.");
          }
          break;
        case "2":
          if (playerShip.money >= 100) {
            playerShip.money -= 100;
            playerShip.maxSail += 20;
            playerShip.sail = playerShip.maxSail;
            logMessage("Sails upgraded.");
          } else {
            logMessage("Not enough gold for sail upgrade.");
          }
          break;
        case "3":
          if (playerShip.money >= 100) {
            playerShip.money -= 100;
            playerShip.navigationAccuracy += 0.05;
            logMessage("Navigation accuracy improved.");
          } else {
            logMessage("Not enough gold for navigation upgrade.");
          }
          break;
        case "4":
          if (playerShip.money >= 100) {
            playerShip.money -= 100;
            playerShip.cannonDamage += 5;
            logMessage("Cannon damage increased.");
          } else {
            logMessage("Not enough gold for cannon upgrade.");
          }
          break;
        case "Escape":
          closeUpgradeMenu();
          break;
      }
      if (upgradeMenuDiv.style.display === "block") openUpgradeMenu(currentCity);
      return;
    }

    switch (e.key) {
      case "1":
        if (playerShip.money >= currentCity.goods["Rum"].price && currentCity.goods["Rum"].quantity > 0) {
          playerShip.money -= currentCity.goods["Rum"].price;
          playerShip.inventory["Rum"] = (playerShip.inventory["Rum"] || 0) + 1;
          currentCity.goods["Rum"].quantity--;
          currentCity.goods["Rum"].tradeVolume--;
          playerReputation[currentCity.nation]++;
          logMessage("Bought 1 Rum.");
        }
        break;
      case "2":
        if (playerShip.money >= currentCity.goods["Spices"].price && currentCity.goods["Spices"].quantity > 0) {
          playerShip.money -= currentCity.goods["Spices"].price;
          playerShip.inventory["Spices"] = (playerShip.inventory["Spices"] || 0) + 1;
          currentCity.goods["Spices"].quantity--;
          currentCity.goods["Spices"].tradeVolume--;
          playerReputation[currentCity.nation]++;
          logMessage("Bought 1 Spices.");
        }
        break;
      case "3":
        if (playerShip.money >= currentCity.goods["Gold"].price && currentCity.goods["Gold"].quantity > 0) {
          playerShip.money -= currentCity.goods["Gold"].price;
          playerShip.inventory["Gold"] = (playerShip.inventory["Gold"] || 0) + 1;
          currentCity.goods["Gold"].quantity--;
          currentCity.goods["Gold"].tradeVolume--;
          playerReputation[currentCity.nation]++;
          logMessage("Bought 1 Gold.");
        }
        break;
      case "q":
      case "Q":
        if ((playerShip.inventory["Rum"] || 0) > 0) {
          playerShip.money += currentCity.goods["Rum"].price;
          playerShip.inventory["Rum"]--;
          currentCity.goods["Rum"].quantity++;
          currentCity.goods["Rum"].tradeVolume++;
          playerReputation[currentCity.nation]++;
          logMessage("Sold 1 Rum.");
        }
        break;
      case "w":
      case "W":
        if ((playerShip.inventory["Spices"] || 0) > 0) {
          playerShip.money += currentCity.goods["Spices"].price;
          playerShip.inventory["Spices"]--;
          currentCity.goods["Spices"].quantity++;
          currentCity.goods["Spices"].tradeVolume++;
          playerReputation[currentCity.nation]++;
          logMessage("Sold 1 Spices.");
        }
        break;
      case "e":
      case "E":
        if ((playerShip.inventory["Gold"] || 0) > 0) {
          playerShip.money += currentCity.goods["Gold"].price;
          playerShip.inventory["Gold"]--;
          currentCity.goods["Gold"].quantity++;
          currentCity.goods["Gold"].tradeVolume++;
          playerReputation[currentCity.nation]++;
          logMessage("Sold 1 Gold.");
        }
        break;
      case "4":
        if (playerShip.money >= 50) {
          playerShip.money -= 50;
          playerShip.cannons++;
          logMessage("Bought a Cannon.");
        }
        break;
      case "r":
      case "R":
        if (playerShip.money >= 10) {
          playerShip.money -= 10;
          playerShip.crew += 5;
          logMessage("Recruited 5 Crew members.");
        }
        break;
      case "v":
      case "V":
        let capturedIndex = ships.findIndex(s => s.captured);
        if (capturedIndex !== -1) {
          playerShip.money += 100;
          ships.splice(capturedIndex, 1);
          logMessage("Sold captured ship for 100 gold.");
        }
        break;
      case "y":
      case "Y":
        if (playerShip.cannons > 0) {
          playerShip.cannons--;
          playerShip.money += 30;
          logMessage("Sold a Cannon for 30 gold.");
        }
        break;
      case "g":
      case "G":
        openGovernorMenu(currentCity);
        break;
      case "m":
      case "M":
        acceptMissionFromCity(currentCity);
        break;
      case "f":
      case "F":
        openUpgradeMenu(currentCity);
        break;
      case "h":
      case "H":
        openUpgradeMenu(currentCity);
        break;
      case "p":
      case "P":
        payCrew();
        break;
      case "l":
      case "L":
        distributeLoot();
        break;
    }
    openTradeMenu(currentCity);
  }
});

/***********************
 * Boarding Sequence
 ***********************/
function attemptBoarding() {
  if (!boardCandidate) { logMessage("No ship to board."); return; }
  const enemy = boardCandidate;
  logMessage("Boarding " + enemy.nation + " ship!");
  while (playerShip.crew > 0 && enemy.crew > 0) {
    const playerPower = (Math.random() * 3 + 1) * (playerShip.morale / 100);
    const enemyMorale = enemy.morale !== undefined ? enemy.morale : 100;
    const enemyPower = (Math.random() * 3 + 1) * (enemyMorale / 100);
    enemy.crew -= Math.max(1, Math.floor(playerPower));
    playerShip.crew -= Math.max(1, Math.floor(enemyPower));
  }
  if (playerShip.crew > 0) {
    enemy.captured = true;
    enemy.nation = playerShip.nation;
    playerShip.morale = Math.min(100, playerShip.morale + 10);
    logMessage("Enemy ship captured!");
  } else {
    playerShip.morale = Math.max(0, playerShip.morale - 20);
    logMessage("Your crew was defeated!");
    playerShip.hull = 0;
  }
  boardCandidate = null;
}

/***********************
 * Capturing Enemy Ships
 ***********************/
function attemptCapture() {
  for (let ship of ships) {
    if (!ship.isPlayer && !ship.captured && distance(playerShip.x, playerShip.y, ship.x, ship.y) < 50 && ship.hull < 15) {
      const choice = confirm("Capture enemy ship: OK to take over, Cancel to sink.");
      if (choice) {
        ship.captured = true;
        ship.nation = playerShip.nation;
        logMessage("Captured enemy ship!");
      } else {
        playerShip.money += 50;
        logMessage("Sunk enemy ship for loot!");
        ships = ships.filter(s => s !== ship);
      }
      break;
    }
  }
}

/***********************
 * Saving & Loading (with Rehydration)
 ***********************/
function saveGame() {
  const state = {
    seed: worldSeed,
    cities,
    ships,
    cannonballs,
    playerShip: {
      ...playerShip,
      navigationAccuracy: playerShip.navigationAccuracy,
      cannonDamage: playerShip.cannonDamage
    },
    quests,
    relationships,
    playerReputation,
    lettersOfMarque,
    storyMilestones
  };

  // Ensure all economic fields on goods are persisted.
  state.cities.forEach(city => {
    Object.values(city.goods).forEach(good => {
      if (good.tradeVolume === undefined) good.tradeVolume = 0;
      if (good.productionRate === undefined) good.productionRate = 0;
      if (good.consumptionRate === undefined) good.consumptionRate = 0;
      if (good.maxStorage === undefined) good.maxStorage = 0;
      if (good.basePrice === undefined) good.basePrice = good.price;
    });
  });

  localStorage.setItem("pirateGameSave", JSON.stringify(state));
  logMessage("Game saved.");
}

function loadGame() {
  const stateStr = localStorage.getItem("pirateGameSave");
  if (stateStr) {
    const state = JSON.parse(stateStr);
    worldSeed = state.seed || worldSeed;
    generateIslands(worldSeed);
    cities = state.cities;
    ships = state.ships;
    cannonballs = state.cannonballs;
    quests = state.quests || [];
    relationships = state.relationships;
    playerReputation = state.playerReputation || {};
    lettersOfMarque = state.lettersOfMarque || {};
    storyMilestones = state.storyMilestones || {};
    cities.forEach(c => {
      Object.setPrototypeOf(c, City.prototype);
      // Restore economy fields for each good, providing defaults for older saves.
      Object.values(c.goods).forEach(good => {
        if (good.tradeVolume === undefined) good.tradeVolume = 0;
        if (good.productionRate === undefined) good.productionRate = 0;
        if (good.consumptionRate === undefined) good.consumptionRate = 0;
        if (good.maxStorage === undefined) good.maxStorage = 100;
        if (good.basePrice === undefined) good.basePrice = good.price;
      });
    });
    ships.forEach(s => {
      Object.setPrototypeOf(s, Ship.prototype);
      if (s.navigationAccuracy === undefined) s.navigationAccuracy = 0;
      if (s.cannonDamage === undefined) s.cannonDamage = 20;
    });
    playerShip = ships.find(s => s.isPlayer);
    if (state.playerShip) {
      if (state.playerShip.navigationAccuracy !== undefined)
        playerShip.navigationAccuracy = state.playerShip.navigationAccuracy;
      if (state.playerShip.cannonDamage !== undefined)
        playerShip.cannonDamage = state.playerShip.cannonDamage;
    }
    cannonballs.forEach(cb => Object.setPrototypeOf(cb, Cannonball.prototype));
    quests.forEach(q => Object.setPrototypeOf(q, Quest.prototype));
    // Ensure reputation and marque objects have all nations
    Object.keys(nations).forEach(n => {
      if (playerReputation[n] === undefined) playerReputation[n] = 0;
      if (lettersOfMarque[n] === undefined) lettersOfMarque[n] = false;
    });
    logMessage("Game loaded.");
    updateQuestLogUI();
  } else {
    logMessage("No saved game found.");
  }
}

/***********************
 * Initialization & Loop Start
 ***********************/
async function initGame() {
  let loadedAssets = {};
  try {
    loadedAssets = await loadAssets(gridSize);
    if (!loadedAssets || Object.keys(loadedAssets).length === 0) {
      console.warn("Starting game with empty asset map.");
    }
  } catch (err) {
    console.error("Failed to load assets; starting with empty set.", err);
  }
  initRelationships();
  initReputation();
  generateIslands(worldSeed);
  generateCities();
  if (!cities.length) {
    console.error("No cities generated; creating fallback city.");
    cities.push(new City(1, "Fallback City", worldWidth / 2, worldHeight / 2, "England"));
  }
  generateEnemyShips();
  spawnPlayerShip();
  requestAnimationFrame(gameLoop);
}

function startGame(seed) {
  if (seed !== undefined && !isNaN(seed)) {
    worldSeed = seed;
  }
  initGame();
  addCard('https://via.placeholder.com/100x150');
  addCard('https://via.placeholder.com/100x150?text=2');
  // Generate a new quest every 60 seconds.
  setInterval(generateRandomQuest, 60000);
}

// Expose startGame globally so HTML UI can trigger it.
window.startGame = startGame;

