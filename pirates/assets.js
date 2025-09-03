export const assets = {
  tiles: {},
  ship: {},
  city: null,
  flags: {},
};
let gridSize = 16;

export async function loadAssets(tileSize){
  if (typeof tileSize === 'number') gridSize = tileSize;
  try {
    const response = await fetch('/pirates/assets.json');
    const data = await response.json();
    await loadNested(data, assets);
    return assets;
  } catch (err) {
    console.error('Failed to load asset manifest:', err);
    throw err;
  }
}

async function loadNested(src, target, path = []){
  const entries = Object.entries(src);
  await Promise.all(entries.map(async ([key, value]) => {
    if (typeof value === 'string'){
      const isTile = path[0] === 'tiles';
      target[key] = await loadImage(value, isTile);
    } else if (typeof value === 'object' && value !== null){
      const obj = {};
      target[key] = obj;
      await loadNested(value, obj, path.concat(key));
    }
  }));
}

function loadImage(url, isTile = false){
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      if (isTile){
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = gridSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, gridSize, gridSize);
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
        resolve(canvas);
      } else {
        resolve(null);
      }
    };
    img.src = url;
  });
}

