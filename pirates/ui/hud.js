import { questManager } from '../questManager.js';
import { Ship } from '../entities/ship.js';

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

export function updateHUD(player, wind) {
  const hudDiv = document.getElementById('hud');
  if (!hudDiv || !player) return;
  const quests =
    questManager
      .getActive()
      .map(q => q.description)
      .join('; ') || 'None';
  const w = wind || Ship.wind || { speed: 0, angle: 0 };
  const windDir = (w.angle * 180 / Math.PI).toFixed(0);
  const windSpd = w.speed.toFixed(1);
  const fleetInfo =
    player.fleet?.map(s => `${s === player ? '*' : ''}${s.type} ${s.hull}/${s.hullMax}`)
      .join(', ') || 'None';

  let html =
    `Unit: (${player.x.toFixed(0)}, ${player.y.toFixed(0)})` +
    `<br>Gold: ${player.gold}` +
    `<br>Cargo: ${cargoSummary(player)}`;

  if (typeof player.crew === 'number') {
    html +=
      `<br>Crew: ${player.crew}/${player.crewMax}` +
      `<br>Hull: ${player.hull}/${player.hullMax}` +
      `<br><progress value="${player.hull}" max="${player.hullMax}"></progress>` +
      `<br>Morale: ${player.morale?.toFixed(0)}` +
      `<br>Food: ${player.food?.toFixed(0)}` +
      `<br>Sails: ${(player.sail * 100).toFixed(0)}%`;
  }

  html +=
    `<br>Wind: ${windSpd} @ ${windDir}&deg;` +
    `<br>Quests: ${quests}` +
    `<br>Fleet: ${fleetInfo}`;

  hudDiv.innerHTML = html;
}
