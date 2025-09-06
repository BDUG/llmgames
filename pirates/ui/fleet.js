import { bus } from '../bus.js';
import { updateHUD } from './hud.js';
import { setRoute, getRoute, clearRoute } from '../tradeRoutes.js';

export function openFleetMenu(player) {
  const div = document.getElementById('fleetMenu');
  if (!div) return;
  div.innerHTML = '';

  const tabs = document.createElement('div');
  const fleetBtn = document.createElement('button');
  fleetBtn.textContent = 'Fleet';
  const routeBtn = document.createElement('button');
  routeBtn.textContent = 'Trade Route';
  tabs.appendChild(fleetBtn);
  tabs.appendChild(routeBtn);
  div.appendChild(tabs);

  const content = document.createElement('div');
  div.appendChild(content);

  function renderFleetTab() {
    content.innerHTML = '';
    player.fleet.forEach(ship => {
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
      content.appendChild(shipDiv);
    });
  }

  function renderRouteTab() {
    content.innerHTML = '';
    const shipSelect = document.createElement('select');
    player.fleet.forEach((s, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = s === player ? `${s.type} (Flagship)` : s.type;
      shipSelect.appendChild(opt);
    });
    content.appendChild(shipSelect);

    const info = document.createElement('div');
    content.appendChild(info);

    function refresh() {
      const ship = player.fleet[parseInt(shipSelect.value)];
      const route = getRoute(ship);
      if (route) {
        const cityNames = route.cities.map(c => c.name).join(' -> ');
        info.textContent = `Route: ${cityNames} | Buy: ${route.buy.join(', ')} | Sell: ${route.sell.join(', ')}`;
      } else {
        info.textContent = 'No route';
      }
    }

    shipSelect.onchange = refresh;

    const setBtn = document.createElement('button');
    setBtn.textContent = 'Set Route';
    setBtn.onclick = () => {
      const cityNames = prompt('Comma-separated city names:');
      if (!cityNames) return;
      const names = cityNames
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const metaMap = bus.getCityMetadata?.() || new Map();
      const allCities = Array.from(metaMap.keys());
      const cities = names
        .map(n => allCities.find(c => c.name === n))
        .filter(Boolean);
      if (!cities.length) {
        alert('No valid cities');
        return;
      }
      const buy =
        prompt('Goods to buy (comma separated):')
          ?.split(',')
          .map(s => s.trim())
          .filter(Boolean) || [];
      const sell =
        prompt('Goods to sell (comma separated):')
          ?.split(',')
          .map(s => s.trim())
          .filter(Boolean) || [];
      setRoute(player.fleet[parseInt(shipSelect.value)], {
        cities,
        buy,
        sell,
        index: 0
      });
      refresh();
    };
    content.appendChild(setBtn);

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear Route';
    clearBtn.onclick = () => {
      const ship = player.fleet[parseInt(shipSelect.value)];
      clearRoute(ship);
      refresh();
    };
    content.appendChild(clearBtn);

    refresh();
  }

  fleetBtn.onclick = renderFleetTab;
  routeBtn.onclick = renderRouteTab;
  renderFleetTab();

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
