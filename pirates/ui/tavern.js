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
  crewDiv.textContent = `Crew: ${player.crew}/${player.crewMax}`;
  menu.appendChild(crewDiv);
  const hireContainer = document.createElement('div');
  const hireInput = document.createElement('input');
  hireInput.type = 'number';
  hireInput.min = 1;
  hireInput.value = 1;
  const hireBtn = document.createElement('button');
  hireBtn.textContent = 'Hire crew (20g ea)';

  const updateControls = () => {
    const maxByGold = Math.floor(player.gold / 20);
    const maxByCapacity = player.crewMax - player.crew;
    const max = Math.min(maxByGold, maxByCapacity);
    hireInput.max = max;
    if (parseInt(hireInput.value, 10) > max) hireInput.value = max;
    hireBtn.disabled = max <= 0 || parseInt(hireInput.value, 10) <= 0;
  };

  hireInput.oninput = updateControls;

  hireBtn.onclick = () => {
    const qty = parseInt(hireInput.value, 10) || 0;
    const cost = qty * 20;
    if (qty > 0 && player.gold >= cost && player.crew + qty <= player.crewMax) {
      player.gold -= cost;
      player.crew += qty;
      bus.emit(
        'log',
        `Hired ${qty} crew member${qty !== 1 ? 's' : ''} for ${cost}g`
      );
      updateHUD(player);
      openTavernMenu(player, city);
    }
  };

  updateControls();

  hireContainer.appendChild(hireInput);
  hireContainer.appendChild(hireBtn);
  menu.appendChild(hireContainer);

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
