export function initHUD() {
  const hudDiv = document.getElementById('hud');
  if (hudDiv) hudDiv.textContent = 'Loading...';
}

export function updateHUD(player) {
  const hudDiv = document.getElementById('hud');
  if (!hudDiv || !player) return;
  hudDiv.textContent = `Ship: (${player.x.toFixed(0)}, ${player.y.toFixed(0)})`;
}
