(function(global){
  const assets = {};
  global.assets = assets;

  async function loadAssets(){
    const response = await fetch('http://localhost:8000/pirates/assets.json');
    const data = await response.json();
    await loadNested(data, assets);
    return assets;
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
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn('Failed to load image:', url);
        if (isTile){
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 16;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#f0f';
          ctx.fillRect(0, 0, 16, 16);
          resolve(canvas);
        } else {
          resolve(null);
        }
      };
      img.src = url;
    });
  }

  global.loadAssets = loadAssets;
})(window);
