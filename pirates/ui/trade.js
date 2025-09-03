import { bus } from '../bus.js';
import { updateHUD } from './hud.js';

const PRICES = { Sugar: 10, Rum: 12, Tobacco: 15, Cotton: 8 };

function listGoods(metadata) {
  const goods = new Set();
  if (metadata?.supplies) metadata.supplies.forEach(g => goods.add(g));
  if (metadata?.demands) metadata.demands.forEach(g => goods.add(g));
  return Array.from(goods);
}

function priceFor(good, metadata) {
  metadata.prices = metadata.prices || {};
  if (metadata.prices[good] == null) {
    let price = PRICES[good];
    if (metadata?.supplies?.includes(good)) price = Math.round(price * 0.8);
    if (metadata?.demands?.includes(good)) price = Math.round(price * 1.2);
    metadata.prices[good] = price;
  }
  return metadata.prices[good];
}

function cargoUsed(player) {
  return Object.values(player.cargo).reduce((a, b) => a + b, 0);
}

export function openTradeMenu(player, city, metadata) {
  const menu = document.getElementById('tradeMenu');
  if (!menu || !player) return;

  if (!metadata?.nation) {
    bus.emit('log', `Cannot open trade menu for ${city?.name || 'unknown city'}: nation unknown`);
    return;
  }

  menu.innerHTML = '';

  const title = document.createElement('div');
  if (city?.name) title.textContent = `Trading in ${city.name}`;
  menu.appendChild(title);

  const goldDiv = document.createElement('div');
  goldDiv.textContent = `Gold: ${player.gold}`;
  menu.appendChild(goldDiv);

  const capacityDiv = document.createElement('div');
  capacityDiv.textContent = `Cargo: ${cargoUsed(player)}/${player.cargoCapacity}`;
  menu.appendChild(capacityDiv);

  const table = document.createElement('table');
  const header = document.createElement('tr');
  header.innerHTML = '<th>Good</th><th>Qty</th><th>Stock</th><th>Price</th><th></th><th></th>';
  table.appendChild(header);

  metadata.inventory = metadata.inventory || {};
  listGoods(metadata).forEach(good => {
    const row = document.createElement('tr');
    const qty = player.cargo[good] || 0;
    if (metadata.inventory[good] == null) metadata.inventory[good] = 10;
    const stock = metadata.inventory[good];
    const price = priceFor(good, metadata);
    row.innerHTML = `<td>${good}</td><td>${qty}</td><td>${stock}</td><td>${price}g</td>`;

    const buyCell = document.createElement('td');
    const buyBtn = document.createElement('button');
    buyBtn.textContent = 'Buy';
    buyBtn.onclick = () => {
      if (
        player.gold >= price &&
        cargoUsed(player) < player.cargoCapacity &&
        metadata.inventory[good] > 0
      ) {
        player.gold -= price;
        player.cargo[good] = (player.cargo[good] || 0) + 1;
        metadata.inventory[good] -= 1;
        metadata.prices[good] = Math.round(metadata.prices[good] * 1.1);
        bus.emit('log', `Bought 1 ${good} for ${price}g`);
        updateHUD(player);
        openTradeMenu(player, city, metadata);
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
        player.gold += price;
        metadata.inventory[good] += 1;
        metadata.prices[good] = Math.max(1, Math.round(metadata.prices[good] * 0.9));
        bus.emit('log', `Sold 1 ${good} for ${price}g`);
        updateHUD(player);
        openTradeMenu(player, city, metadata);
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
