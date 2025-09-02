import { bus } from '../bus.js';
import { updateHUD } from './hud.js';

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
  hullDiv.textContent = `Hull: ${player.hull}/100`;
  menu.appendChild(hullDiv);

  const repairBtn = document.createElement('button');
  repairBtn.textContent = 'Repair (10g for 10 hull)';
  repairBtn.onclick = () => {
    if (player.gold >= 10 && player.hull < 100) {
      player.gold -= 10;
      player.hull = Math.min(player.hull + 10, 100);
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
