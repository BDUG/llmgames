(function(global){
  /**
   * Load an image for the city icon.
   * @param {string} url - URL of the city icon image.
   * @returns {Promise<HTMLImageElement|null>} Resolves with the loaded image or null on failure.
   */
  function loadCityImage(url){
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn('Failed to load city image:', url);
        resolve(null); // Fallback handled in rendering.
      };
      img.src = url;
    });
  }

  /**
   * Load ship sprites keyed by ship type and nation.
   * @param {Object} urlMap - Nested map of ship types to nation URLs.
   * @returns {Promise<Object>} Resolves with a similarly structured map of images.
   */
  async function loadShipSprites(urlMap){
    const spriteMap = {};
    const promises = [];
    for (const [type, nations] of Object.entries(urlMap)){
      spriteMap[type] = {};
      for (const [nation, url] of Object.entries(nations)){
        const img = new Image();
        const p = new Promise(resolve => {
          img.onload = () => resolve({type, nation, img});
          img.onerror = () => {
            console.warn('Failed to load ship sprite:', type, nation, url);
            resolve({type, nation, img: null});
          };
        });
        img.src = url;
        promises.push(p);
      }
    }
    const results = await Promise.all(promises);
    results.forEach(({type, nation, img}) => {
      if (!spriteMap[type]) spriteMap[type] = {};
      spriteMap[type][nation] = img;
    });
    return spriteMap;
  }

  // Expose globally so inline scripts can access it.
  global.loadCityImage = loadCityImage;
  global.loadShipSprites = loadShipSprites;
})(window);
