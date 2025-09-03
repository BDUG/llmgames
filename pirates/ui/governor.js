import { bus } from '../bus.js';
import { questManager } from '../questManager.js';
import { Quest } from '../quest.js';
import { updateHUD } from './hud.js';

export function openGovernorMenu(player, city, metadata) {
  const menu = document.getElementById('governorMenu');
  if (!menu) return;

  if (!metadata?.nation) {
    bus.emit('log', `Cannot open governor menu for ${city?.name || 'unknown city'}: nation unknown`);
    return;
  }

  menu.innerHTML = '';

  const title = document.createElement('div');
  if (city?.name) title.textContent = `Governor of ${city.name}`;
  menu.appendChild(title);

  const nation = metadata.nation;
  const rep = player.reputation?.[nation] || 0;
  const repDiv = document.createElement('div');
  repDiv.textContent = `Reputation with ${nation}: ${rep}`;
  menu.appendChild(repDiv);

  const missionBtn = document.createElement('button');
  missionBtn.textContent = 'Accept mission';
  missionBtn.onclick = () => {
    const quest = new Quest('capture', 'Capture an enemy ship', nation, 10);
    questManager.addQuest(quest);
    bus.emit('log', 'Accepted mission from governor');
    updateHUD(player);
    menu.style.display = 'none';
  };
  menu.appendChild(missionBtn);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.onclick = () => {
    menu.style.display = 'none';
  };
  menu.appendChild(closeBtn);

  menu.style.display = 'block';
}

export function closeGovernorMenu() {
  const menu = document.getElementById('governorMenu');
  if (menu) menu.style.display = 'none';
}
