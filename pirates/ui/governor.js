import { bus } from '../bus.js';
import { questManager } from '../questManager.js';
import { Quest } from '../quest.js';
import { updateHUD } from './hud.js';
import { openCrewMenu } from './crew.js';

const NATIONS = ['England', 'France', 'Spain', 'Netherlands'];

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

  const crewBtn = document.createElement('button');
  crewBtn.textContent = 'Crew';
  crewBtn.onclick = () => openCrewMenu(player);
  menu.appendChild(crewBtn);

  // diplomacy controls
  const diplomacyDiv = document.createElement('div');
  const targetSelect = document.createElement('select');
  NATIONS.filter(n => n !== nation).forEach(n => {
    const opt = document.createElement('option');
    opt.value = n;
    opt.textContent = n;
    targetSelect.appendChild(opt);
  });
  diplomacyDiv.appendChild(targetSelect);

  const warBtn = document.createElement('button');
  warBtn.textContent = 'Declare War';
  warBtn.onclick = () => {
    const target = targetSelect.value;
    bus.emit('relation-change', { from: nation, to: target, status: 'war' });
    bus.emit('log', `${nation} declares war on ${target}`);
  };
  diplomacyDiv.appendChild(warBtn);

  const peaceBtn = document.createElement('button');
  peaceBtn.textContent = 'Make Peace';
  peaceBtn.onclick = () => {
    const target = targetSelect.value;
    bus.emit('relation-change', { from: nation, to: target, status: 'peace' });
    bus.emit('log', `${nation} makes peace with ${target}`);
  };
  diplomacyDiv.appendChild(peaceBtn);

  const allyBtn = document.createElement('button');
  allyBtn.textContent = 'Form Alliance';
  allyBtn.onclick = () => {
    const target = targetSelect.value;
    bus.emit('relation-change', { from: nation, to: target, status: 'alliance' });
    bus.emit('log', `${nation} forms alliance with ${target}`);
  };
  diplomacyDiv.appendChild(allyBtn);

  menu.appendChild(diplomacyDiv);

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
