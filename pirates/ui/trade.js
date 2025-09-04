import { bus } from '../bus.js';
import { updateHUD } from './hud.js';

export const PRICES = { Sugar: 10, Rum: 12, Tobacco: 15, Cotton: 8 };

function listGoods(metadata) {
  const goods = new Set();
  if (metadata?.supplies) metadata.supplies.forEach(g => goods.add(g));
  if (metadata?.demands) metadata.demands.forEach(g => goods.add(g));
  return Array.from(goods);
}

function basePriceFor(good, metadata) {
  let price = PRICES[good];
  if (metadata?.supplies?.includes(good)) price = Math.round(price * 0.8);
  if (metadata?.demands?.includes(good)) price = Math.round(price * 1.2);
  return price;
}

function priceFor(good, metadata, multiplier = 1) {
  metadata.prices = metadata.prices || {};
  if (metadata.prices[good] == null) {
    metadata.prices[good] = basePriceFor(good, metadata);
  }
  return Math.round(metadata.prices[good] * multiplier);
}

function cargoUsed(player) {
  return Object.values(player.cargo).reduce((a, b) => a + b, 0);
}

export function closeTradeMenu() {
  const menu = document.getElementById('tradeMenu');
  if (menu) menu.style.display = 'none';
}

export function openTradeMenu(player, city, metadata, priceMultiplier = 1) {
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
  header.innerHTML = '<th>Good</th><th>Qty</th><th>Stock</th><th>Buy Price</th><th>Sell Price</th><th></th><th></th>';
  table.appendChild(header);

  metadata.inventory = metadata.inventory || {};
  listGoods(metadata).forEach(good => {
    const row = document.createElement('tr');
    const qty = player.cargo[good] || 0;
    if (metadata.inventory[good] == null) metadata.inventory[good] = 10;
    const stock = metadata.inventory[good];

    const basePrice = basePriceFor(good, metadata);
    const currentPrice = priceFor(good, metadata);
    const buyPrice = Math.round(currentPrice * priceMultiplier);
    const sellPrice = Math.floor(buyPrice * 0.9);
    const trend = currentPrice - basePrice;

    row.innerHTML = `<td>${good}</td><td>${qty}</td><td>${stock}</td><td class="buyPrice">${buyPrice}g</td><td>${sellPrice}g</td>`;

    const priceCell = row.querySelector('.buyPrice');
    if (trend > 0) {
      priceCell.style.color = 'red';
      priceCell.textContent += ' \u2191';
    } else if (trend < 0) {
      priceCell.style.color = 'green';
      priceCell.textContent += ' \u2193';
    }

    const buyCell = document.createElement('td');
    const buyBtn = document.createElement('button');
    buyBtn.textContent = 'Buy';

    const buyDisabledReasons = [];
    if (player.gold < buyPrice) buyDisabledReasons.push('Not enough gold');
    if (cargoUsed(player) >= player.cargoCapacity) buyDisabledReasons.push('No cargo space');
    if (stock <= 0) buyDisabledReasons.push('Out of stock');
    if (buyDisabledReasons.length) {
      buyBtn.disabled = true;
      buyBtn.title = buyDisabledReasons.join(', ');
    }

    buyBtn.onclick = () => {
      if (buyBtn.disabled) return;
      player.gold -= buyPrice;
      player.cargo[good] = (player.cargo[good] || 0) + 1;
      metadata.inventory[good] -= 1;
      const oldPrice = metadata.prices[good];
      metadata.prices[good] = Math.round(oldPrice * 1.1);
      bus.emit('log', `Bought 1 ${good} for ${buyPrice}g`);
      bus.emit('price-change', { city, good, delta: metadata.prices[good] - oldPrice });
      updateHUD(player);
      openTradeMenu(player, city, metadata, priceMultiplier);
    };
    buyCell.appendChild(buyBtn);
    row.appendChild(buyCell);

    const sellCell = document.createElement('td');
    const sellBtn = document.createElement('button');
    sellBtn.textContent = 'Sell';

    if ((player.cargo[good] || 0) <= 0) {
      sellBtn.disabled = true;
      sellBtn.title = 'Nothing to sell';
    }

    sellBtn.onclick = () => {
      if (sellBtn.disabled) return;
      player.cargo[good] -= 1;
      player.gold += sellPrice;
      metadata.inventory[good] += 1;
      const oldPrice = metadata.prices[good];
      metadata.prices[good] = Math.max(1, Math.round(oldPrice * 0.9));
      bus.emit('log', `Sold 1 ${good} for ${sellPrice}g`);
      bus.emit('price-change', { city, good, delta: metadata.prices[good] - oldPrice });
      updateHUD(player);
      openTradeMenu(player, city, metadata, priceMultiplier);
    };
    sellCell.appendChild(sellBtn);
    row.appendChild(sellCell);

    table.appendChild(row);
  });

  menu.appendChild(table);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', closeTradeMenu);
  menu.appendChild(closeBtn);

  menu.style.display = 'block';
  return menu;
}
