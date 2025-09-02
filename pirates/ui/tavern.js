import { bus } from '../bus.js';
import { updateHUD } from './hud.js';

export function openTavernMenu(player, city) {
  const menu = document.getElementById('tavernMenu');
  if (!menu) return;
  menu.innerHTML = '';

  const title = document.createElement('div');
  title.textContent = city?.name ? `Tavern in ${city.name}` : 'Tavern';
  menu.appendChild(title);

  const goldDiv = document.createElement('div');
  goldDiv.textContent = `Gold: ${player.gold}`;
  menu.appendChild(goldDiv);

  const crewDiv = document.createElement('div');
  crewDiv.textContent = `Crew: ${player.crew}`;
  menu.appendChild(crewDiv);

  const hireBtn = document.createElement('button');
  hireBtn.textContent = 'Hire crew (20g)';
  hireBtn.onclick = () => {
    if (player.gold >= 20) {
      player.gold -= 20;
      player.crew += 1;
      bus.emit('log', 'Hired 1 crew member for 20g');
      updateHUD(player);
      openTavernMenu(player, city);
    }
  };
  menu.appendChild(hireBtn);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.onclick = () => {
    menu.style.display = 'none';
  };
  menu.appendChild(closeBtn);

  menu.style.display = 'block';
}

export function closeTavernMenu() {
  const menu = document.getElementById('tavernMenu');
  if (menu) menu.style.display = 'none';
}
