import { bus } from '../bus.js';
import { updateHUD } from './hud.js';
import { SHIP_TYPES } from '../entities/ship.js';
import { isUnlocked } from '../research.js';

export function openShipyardMenu(player, city, metadata) {
  const menu = document.getElementById('shipyardMenu');
  if (!menu) return;
  menu.innerHTML = '';

  const title = document.createElement('div');
  title.textContent = `Shipyard - ${city.name}`;
  menu.appendChild(title);

  const goldDiv = document.createElement('div');
  goldDiv.textContent = `Gold: ${player.gold}`;
  menu.appendChild(goldDiv);

  const ships = metadata.shipyard || {};
  Object.entries(ships).forEach(([type, info]) => {
    const btn = document.createElement('button');
    const required = SHIP_TYPES[type]?.tech;
    const unlocked = !required || isUnlocked(required);
    btn.textContent = `${type} - ${info.price}g (${info.stock} available)` +
      (unlocked ? '' : ' (Locked)');
    if (info.stock <= 0 || type === player.type || player.gold < info.price || !unlocked) {
      btn.disabled = true;
    }
    if (!unlocked) {
      bus.emit('log', `${type} requires ${required} research`);
    }
    btn.onclick = () => {
      if (!unlocked) {
        bus.emit('log', `${type} requires ${required} research`);
        return;
      }
      if (player.gold >= info.price && info.stock > 0) {
        player.gold -= info.price;
        player.changeType(type);
        info.stock -= 1;
        bus.emit('log', `Purchased a ${type}`);
        updateHUD(player);
        openShipyardMenu(player, city, metadata);
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

export function closeShipyardMenu() {
  const menu = document.getElementById('shipyardMenu');
  if (menu) menu.style.display = 'none';
}
