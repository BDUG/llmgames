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

  // Expose globally so inline scripts can access it.
  global.loadCityImage = loadCityImage;
})(window);
