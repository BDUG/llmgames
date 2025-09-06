import { bus } from '../bus.js';
import { updateHUD } from './hud.js';

export function openCrewMenu(player) {
  const menu = document.getElementById('crewMenu');
  if (!menu) return;
  menu.innerHTML = '';

  const title = document.createElement('div');
  title.textContent = 'Crew Management';
  menu.appendChild(title);

  const goldDiv = document.createElement('div');
  goldDiv.textContent = `Gold: ${player.gold}`;
  menu.appendChild(goldDiv);

  const crewDiv = document.createElement('div');
  crewDiv.textContent = `Crew: ${player.crew}/${player.crewMax}`;
  menu.appendChild(crewDiv);

  const wageDiv = document.createElement('div');
  wageDiv.textContent = `Wage Rate: ${player.wageRate}g/day`;
  menu.appendChild(wageDiv);

  const unpaidDiv = document.createElement('div');
  unpaidDiv.textContent = `Unpaid Wages: ${player.unpaidWages}`;
  menu.appendChild(unpaidDiv);

  const wageContainer = document.createElement('div');
  const wageInput = document.createElement('input');
  wageInput.type = 'number';
  wageInput.min = 0;
  wageInput.value = player.wageRate;
  const wageBtn = document.createElement('button');
  wageBtn.textContent = 'Set Wage Rate';
  wageBtn.onclick = () => {
    const rate = parseFloat(wageInput.value);
    if (!isNaN(rate) && rate >= 0) {
      player.wageRate = rate;
      openCrewMenu(player);
    }
  };
  wageContainer.appendChild(wageInput);
  wageContainer.appendChild(wageBtn);
  menu.appendChild(wageContainer);

  const hireContainer = document.createElement('div');
  const hireInput = document.createElement('input');
  hireInput.type = 'number';
  hireInput.min = 1;
  hireInput.value = 1;
  const hireBtn = document.createElement('button');
  hireBtn.textContent = 'Hire (20g ea)';

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
      player.updateCrewStats && player.updateCrewStats();
      bus.emit('log', `Hired ${qty} crew for ${cost}g`);
      updateHUD(player);
      openCrewMenu(player);
    }
  };

  updateControls();
  hireContainer.appendChild(hireInput);
  hireContainer.appendChild(hireBtn);
  menu.appendChild(hireContainer);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.onclick = closeCrewMenu;
  menu.appendChild(closeBtn);

  menu.style.display = 'block';
}

export function closeCrewMenu() {
  const menu = document.getElementById('crewMenu');
  if (menu) menu.style.display = 'none';
}

