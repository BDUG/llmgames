import { bus } from '../bus.js';
import { updateHUD } from './hud.js';

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
    btn.textContent = `${type} - ${info.price}g (${info.stock} available)`;
    if (info.stock <= 0 || type === player.type || player.gold < info.price) {
      btn.disabled = true;
    }
    btn.onclick = () => {
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
