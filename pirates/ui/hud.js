import { questManager } from '../questManager.js';

export function initHUD() {
  const hudDiv = document.getElementById('hud');
  if (hudDiv) hudDiv.textContent = 'Loading...';
}

function cargoSummary(player) {
  const used = Object.values(player.cargo).reduce((a, b) => a + b, 0);
  const details = Object.entries(player.cargo)
    .map(([g, q]) => `${g}:${q}`)
    .join(', ');
  return `${used}/${player.cargoCapacity}${details ? ' (' + details + ')' : ''}`;
}

export function updateHUD(player) {
  const hudDiv = document.getElementById('hud');
  if (!hudDiv || !player) return;
  const quests = questManager
    .getActive()
    .map(q => q.description)
    .join('; ') || 'None';
  hudDiv.innerHTML =
    `Ship: (${player.x.toFixed(0)}, ${player.y.toFixed(0)})` +
    `<br>Gold: ${player.gold}` +
    `<br>Crew: ${player.crew}` +
    `<br>Morale: ${player.morale.toFixed(0)}` +
    `<br>Food: ${player.food.toFixed(0)}` +
    `<br>Cargo: ${cargoSummary(player)}` +
    `<br>Quests: ${quests}`;
}
