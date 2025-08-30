(function(global){
  const assets = {};
  global.assets = assets;

  async function loadAssets(){
    const response = await fetch('assets.json');
    const data = await response.json();
    await loadNested(data, assets);
    return assets;
  }

  async function loadNested(src, target){
    const entries = Object.entries(src);
    await Promise.all(entries.map(async ([key, value]) => {
      if (typeof value === 'string'){
        target[key] = await loadImage(value);
      } else if (typeof value === 'object' && value !== null){
        const obj = {};
        target[key] = obj;
        await loadNested(value, obj);
      }
    }));
  }

  function loadImage(url){
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => { console.warn('Failed to load image:', url); resolve(null); };
      img.src = url;
    });
  }

  global.loadAssets = loadAssets;
})(window);
