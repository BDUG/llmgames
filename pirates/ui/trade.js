import { bus } from '../bus.js';

const GOODS = ['Sugar', 'Rum', 'Tobacco', 'Cotton'];
const PRICES = { Sugar: 10, Rum: 12, Tobacco: 15, Cotton: 8 };

function cargoUsed(player) {
  return Object.values(player.cargo).reduce((a, b) => a + b, 0);
}

export function openTradeMenu(player) {
  const menu = document.getElementById('tradeMenu');
  if (!menu || !player) return;
  menu.innerHTML = '';

  const goldDiv = document.createElement('div');
  goldDiv.textContent = `Gold: ${player.gold}`;
  menu.appendChild(goldDiv);

  const capacityDiv = document.createElement('div');
  capacityDiv.textContent = `Cargo: ${cargoUsed(player)}/${player.cargoCapacity}`;
  menu.appendChild(capacityDiv);

  const table = document.createElement('table');
  const header = document.createElement('tr');
  header.innerHTML = '<th>Good</th><th>Qty</th><th>Price</th><th></th><th></th>';
  table.appendChild(header);

  GOODS.forEach(good => {
    const row = document.createElement('tr');
    const qty = player.cargo[good] || 0;
    row.innerHTML = `<td>${good}</td><td>${qty}</td><td>${PRICES[good]}g</td>`;

    const buyCell = document.createElement('td');
    const buyBtn = document.createElement('button');
    buyBtn.textContent = 'Buy';
    buyBtn.onclick = () => {
      if (player.gold >= PRICES[good] && cargoUsed(player) < player.cargoCapacity) {
        player.gold -= PRICES[good];
        player.cargo[good] = (player.cargo[good] || 0) + 1;
        bus.emit('log', `Bought 1 ${good} for ${PRICES[good]}g`);
        openTradeMenu(player);
      }
    };
    buyCell.appendChild(buyBtn);
    row.appendChild(buyCell);

    const sellCell = document.createElement('td');
    const sellBtn = document.createElement('button');
    sellBtn.textContent = 'Sell';
    sellBtn.onclick = () => {
      if ((player.cargo[good] || 0) > 0) {
        player.cargo[good] -= 1;
        player.gold += PRICES[good];
        bus.emit('log', `Sold 1 ${good} for ${PRICES[good]}g`);
        openTradeMenu(player);
      }
    };
    sellCell.appendChild(sellBtn);
    row.appendChild(sellCell);

    table.appendChild(row);
  });

  menu.appendChild(table);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => {
    menu.style.display = 'none';
  });
  menu.appendChild(closeBtn);

  menu.style.display = 'block';
}

export function closeTradeMenu() {
  const menu = document.getElementById('tradeMenu');
  if (menu) menu.style.display = 'none';
}
