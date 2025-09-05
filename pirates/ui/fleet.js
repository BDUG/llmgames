import { bus } from '../bus.js';
import { updateHUD } from './hud.js';

export function openFleetMenu(player) {
  const div = document.getElementById('fleetMenu');
  if (!div) return;
  div.innerHTML = '';
  player.fleet.forEach((ship, idx) => {
    const shipDiv = document.createElement('div');
    shipDiv.textContent = `${ship.type} - Crew: ${ship.crew} Hull: ${ship.hull}/${ship.hullMax}`;
    if (ship === player) {
      const span = document.createElement('span');
      span.textContent = ' (Flagship)';
      shipDiv.appendChild(span);
    } else {
      const flagBtn = document.createElement('button');
      flagBtn.textContent = 'Make Flagship';
      flagBtn.onclick = () => {
        bus.emit('switch-flagship', { ship });
        closeFleetMenu();
      };
      shipDiv.appendChild(flagBtn);

      const crewBtn = document.createElement('button');
      crewBtn.textContent = 'Transfer Crew';
      crewBtn.onclick = () => {
        const amt = parseInt(
          prompt('Crew amount (positive to transfer from flagship, negative for reverse):'),
          10
        );
        if (isNaN(amt) || amt === 0) return;
        if (amt > 0 && player.crew >= amt) {
          player.crew -= amt;
          ship.crew += amt;
        } else if (amt < 0 && ship.crew >= -amt) {
          ship.crew += amt;
          player.crew -= amt;
        } else {
          alert('Insufficient crew');
          return;
        }
        ship.updateCrewStats();
        player.updateCrewStats();
        updateHUD(player);
      };
      shipDiv.appendChild(crewBtn);

      const cargoBtn = document.createElement('button');
      cargoBtn.textContent = 'Transfer Cargo';
      cargoBtn.onclick = () => {
        const good = prompt('Good to transfer:');
        if (!good) return;
        const amt = parseInt(
          prompt('Amount (positive from flagship to ship, negative for reverse):'),
          10
        );
        if (isNaN(amt) || amt === 0) return;
        const from = amt > 0 ? player : ship;
        const to = amt > 0 ? ship : player;
        const quantity = Math.abs(amt);
        if ((from.cargo[good] || 0) < quantity) {
          alert('Not enough goods');
          return;
        }
        const used = Object.values(to.cargo).reduce((a, b) => a + b, 0);
        if (amt > 0 && used + quantity > to.cargoCapacity) {
          alert('No space');
          return;
        }
        from.cargo[good] -= quantity;
        if (from.cargo[good] <= 0) delete from.cargo[good];
        to.cargo[good] = (to.cargo[good] || 0) + quantity;
        updateHUD(player);
      };
      shipDiv.appendChild(cargoBtn);

      const dismissBtn = document.createElement('button');
      dismissBtn.textContent = 'Dismiss';
      dismissBtn.onclick = () => {
        if (confirm('Dismiss this ship?')) {
          const index = player.fleet.indexOf(ship);
          if (index !== -1) player.fleet.splice(index, 1);
          closeFleetMenu();
        }
      };
      shipDiv.appendChild(dismissBtn);
    }
    div.appendChild(shipDiv);
  });
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.onclick = closeFleetMenu;
  div.appendChild(closeBtn);
  div.style.display = 'block';
}

export function closeFleetMenu() {
  const div = document.getElementById('fleetMenu');
  if (div) div.style.display = 'none';
}
