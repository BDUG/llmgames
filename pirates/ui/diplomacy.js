import { bus } from '../bus.js';

const STATES = ['war', 'truce', 'peace', 'alliance', 'embargo'];

export function openDiplomacyMenu(player) {
  const menu = document.getElementById('diplomacyMenu');
  if (!menu || !player) return;

  const nations = Object.keys(bus.nationRelations || {}).filter(
    n => n !== player.nation
  );

  menu.innerHTML = '';
  const title = document.createElement('div');
  title.textContent = 'Diplomacy';
  menu.appendChild(title);

  const targetSelect = document.createElement('select');
  nations.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n;
    opt.textContent = n;
    targetSelect.appendChild(opt);
  });
  menu.appendChild(targetSelect);

  const statusSelect = document.createElement('select');
  (bus.relationStates || STATES).forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    statusSelect.appendChild(opt);
  });
  menu.appendChild(statusSelect);

  const proposeBtn = document.createElement('button');
  proposeBtn.textContent = 'Propose';
  proposeBtn.onclick = () => {
    const target = targetSelect.value;
    const status = statusSelect.value;
    bus.emit('relation-change', {
      from: player.nation,
      to: target,
      status
    });
    bus.emit('log', `${player.nation} proposes ${status} with ${target}`);
    menu.style.display = 'none';
  };
  menu.appendChild(proposeBtn);

  const tributeBtn = document.createElement('button');
  tributeBtn.textContent = 'Pay Tribute (100g)';
  tributeBtn.onclick = () => {
    const target = targetSelect.value;
    if (player.gold < 100) return;
    player.gold -= 100;
    bus.emit('log', `Paid 100g tribute to ${target}`);
    bus.emit('relation-change', {
      from: player.nation,
      to: target,
      status: 'truce'
    });
    menu.style.display = 'none';
  };
  menu.appendChild(tributeBtn);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.onclick = () => {
    menu.style.display = 'none';
  };
  menu.appendChild(closeBtn);

  menu.style.display = 'block';
}

export function closeDiplomacyMenu() {
  const menu = document.getElementById('diplomacyMenu');
  if (menu) menu.style.display = 'none';
}
