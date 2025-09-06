export const assets = {
  tiles: {},
  ship: {},
  city: null,
  flags: {},
};
let gridSize = 16;

const FLAG_COLORS = {
  Pirate: '#000',
  England: '#c00',
  France: '#00c',
  Spain: '#c90',
  Netherlands: '#f60',
};
const shipPlaceholders = {};

export async function loadAssets(tileSize){
  if (typeof tileSize === 'number') gridSize = tileSize;
  try {
    const response = await fetch('/pirates/assets.json');
    const data = await response.json();
    await loadNested(data, assets);
    if (!assets.tiles.mission) {
      assets.tiles.mission = assets.tiles.village;
    }
    if (!assets.tiles.coast) {
      assets.tiles.coast = assets.tiles.land;
    }
    if (!assets.tiles.native) {
      assets.tiles.native = assets.tiles.village;
    }
    if (!assets.tiles.road) {
      assets.tiles.road = assets.tiles.land;
    }
    if (!assets.tiles.reef) {
      assets.tiles.reef = assets.tiles.water;
    }
    if (!assets.tiles.river) {
      assets.tiles.river = assets.tiles.water;
    }
    if (!assets.tiles.desert) {
      assets.tiles.desert = assets.tiles.land;
    }
    if (!assets.tiles.forest) {
      assets.tiles.forest = assets.tiles.land;
    }
    ensureFlags();
    const sampleTile = assets.tiles && Object.values(assets.tiles)[0];
    const tileWidth = sampleTile?.tileWidth || sampleTile?.width || gridSize;
    const tileImageHeight = sampleTile?.tileImageHeight || sampleTile?.height || gridSize;
    return { assets, tileWidth, tileImageHeight };
  } catch (err) {
    console.error('Failed to load asset manifest:', err);
    throw err;
  }
}

async function loadNested(src, target, path = []) {
  const entries = Object.entries(src);
  await Promise.all(
    entries.map(async ([key, value]) => {
      if (typeof value === 'string') {
        const isTile = path[0] === 'tiles';
        // When ship assets are provided without a direction layer, treat the
        // value as the default direction.
        if (path[0] === 'ship' && path.length === 2) {
          const img = await loadImage(value, isTile);
          target[key] = { default: img };
        } else {
          target[key] = await loadImage(value, isTile);
        }
      } else if (typeof value === 'object' && value !== null) {
        const obj = {};
        target[key] = obj;
        await loadNested(value, obj, path.concat(key));
      }
    })
  );
}

function loadImage(url, isTile = false){
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      if (isTile){
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.tileWidth = img.width;
        canvas.tileImageHeight = img.height;
        resolve(canvas);
      } else {
        resolve(img);
      }
    };
    img.onerror = () => {
      console.warn('Failed to load image:', url);
      if (isTile){
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = gridSize;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f0f';
        ctx.fillRect(0, 0, gridSize, gridSize);
        canvas.tileWidth = gridSize;
        canvas.tileImageHeight = gridSize;
        resolve(canvas);
      } else {
        resolve(null);
      }
    };
    img.src = url;
  });
}

function ensureFlags() {
  Object.keys(FLAG_COLORS).forEach(n => {
    if (!assets.flags[n]) {
      assets.flags[n] = createFlagPlaceholder(n);
      console.warn(`Missing flag asset for ${n}`);
    }
  });
  if (!assets.flags.Unknown) {
    assets.flags.Unknown = createFlagPlaceholder();
  }
}

export function getFlag(nation) {
  return assets.flags[nation] || assets.flags.Unknown || createFlagPlaceholder();
}

function createFlagPlaceholder(nation){
  if (typeof document === 'undefined') {
    return { width: gridSize, height: gridSize };
  }
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = gridSize;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = FLAG_COLORS[nation] || '#888';
  ctx.fillRect(0, 0, gridSize, gridSize);
  ctx.fillStyle = '#fff';
  ctx.font = `${gridSize * 0.6}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(nation ? nation[0] : '?', gridSize / 2, gridSize / 2 + 1);
  return canvas;
}

function createShipPlaceholder(direction = 'E') {
  if (typeof document === 'undefined') {
    return { width: gridSize, height: gridSize };
  }
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = gridSize;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#999';
  ctx.fillRect(0, 0, gridSize, gridSize);

  const angles = {
    E: 0,
    SE: Math.PI / 4,
    S: Math.PI / 2,
    SW: (3 * Math.PI) / 4,
    W: Math.PI,
    NW: (5 * Math.PI) / 4,
    N: (3 * Math.PI) / 2,
    NE: (7 * Math.PI) / 4,
  };

  ctx.save();
  ctx.translate(gridSize / 2, gridSize / 2);
  ctx.rotate(angles[direction] || 0);
  ctx.fillStyle = '#555';
  ctx.beginPath();
  ctx.moveTo(gridSize * 0.3, 0);
  ctx.lineTo(-gridSize * 0.2, -gridSize * 0.2);
  ctx.lineTo(-gridSize * 0.2, gridSize * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  return canvas;
}

export function getShipSprite(type, nation, direction = 'default') {
  const byType = assets.ship?.[type] || {};
  const byNation = byType[nation] || byType.default || {};
  const sprite =
    byNation[direction] ||
    byNation.default ||
    byType.default?.[direction] ||
    byType.default?.default;
  if (sprite) return sprite;
  return (shipPlaceholders[direction] ||= createShipPlaceholder(direction));
}

