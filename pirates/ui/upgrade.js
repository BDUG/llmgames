import { bus } from '../bus.js';
import { updateHUD } from './hud.js';
import { Ship } from '../entities/ship.js';

export function openUpgradeMenu(player) {
  const menu = document.getElementById('upgradeMenu');
  if (!menu) return;
  menu.innerHTML = '';

  const title = document.createElement('div');
  title.textContent = 'Shipwright';
  menu.appendChild(title);

  const goldDiv = document.createElement('div');
  goldDiv.textContent = `Gold: ${player.gold}`;
  menu.appendChild(goldDiv);

  const hullDiv = document.createElement('div');
  hullDiv.textContent = `Hull: ${player.hull}/${player.hullMax}`;
  menu.appendChild(hullDiv);

  const typeDiv = document.createElement('div');
  typeDiv.textContent = `Ship: ${player.type}`;
  menu.appendChild(typeDiv);

  const repairBtn = document.createElement('button');
  repairBtn.textContent = 'Repair (10g for 10 hull)';
  repairBtn.onclick = () => {
    if (player.gold >= 10 && player.hull < player.hullMax) {
      player.gold -= 10;
      player.hull = Math.min(player.hull + 10, player.hullMax);
      bus.emit('log', 'Repaired ship for 10g');
      updateHUD(player);
      openUpgradeMenu(player);
    }
  };
  menu.appendChild(repairBtn);

  const cargoBtn = document.createElement('button');
  cargoBtn.textContent = 'Increase cargo (+10) - 50g';
  cargoBtn.onclick = () => {
    if (player.gold >= 50) {
      player.gold -= 50;
      player.cargoCapacity += 10;
      bus.emit('log', 'Increased cargo capacity');
      updateHUD(player);
      openUpgradeMenu(player);
    }
  };
  menu.appendChild(cargoBtn);

  const cannonBtn = document.createElement('button');
  cannonBtn.textContent = 'Improve cannons - 100g';
  cannonBtn.onclick = () => {
    if (player.gold >= 100) {
      player.gold -= 100;
      player.fireRate = Math.max(5, player.fireRate - 5);
      bus.emit('log', 'Improved cannons');
      updateHUD(player);
      openUpgradeMenu(player);
    }
  };
  menu.appendChild(cannonBtn);

  const shipTitle = document.createElement('div');
  shipTitle.textContent = 'Buy new ship:';
  menu.appendChild(shipTitle);

  Object.entries(Ship.TYPES).forEach(([type, stats]) => {
    if (type === player.type) return;
    const btn = document.createElement('button');
    btn.textContent = `${type} - ${stats.cost}g`;
    btn.onclick = () => {
      if (player.gold >= stats.cost) {
        player.gold -= stats.cost;
        player.changeType(type);
        bus.emit('log', `Upgraded to a ${type}`);
        updateHUD(player);
        openUpgradeMenu(player);
      }
    };
    menu.appendChild(btn);
  });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.onclick = () => {
    menu.style.display = 'none';
  };
  menu.appendChild(closeBtn);

  menu.style.display = 'block';
}

export function closeUpgradeMenu() {
  const menu = document.getElementById('upgradeMenu');
  if (menu) menu.style.display = 'none';
}
