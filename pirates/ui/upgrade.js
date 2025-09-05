import { bus } from '../bus.js';
import { updateHUD } from './hud.js';
import { isUnlocked } from '../research.js';

export function openUpgradeMenu(player, metadata = {}) {
  const menu = document.getElementById('upgradeMenu');
  if (!menu) return;
  menu.innerHTML = '';

  const title = document.createElement('div');
  title.textContent = 'Shipwright';
  menu.appendChild(title);

  const goldDiv = document.createElement('div');
  goldDiv.textContent = `Gold: ${player.gold}`;
  menu.appendChild(goldDiv);

  const hullDiv = document.createElement('div');
  hullDiv.textContent = `Hull: ${player.hull}/${player.hullMax}`;
  menu.appendChild(hullDiv);

  const typeDiv = document.createElement('div');
  typeDiv.textContent = `Ship: ${player.type}`;
  menu.appendChild(typeDiv);

  const repairBtn = document.createElement('button');
  repairBtn.textContent = 'Repair (10g for 10 hull)';
  repairBtn.onclick = () => {
    if (player.gold >= 10 && player.hull < player.hullMax) {
      player.gold -= 10;
      player.hull = Math.min(player.hull + 10, player.hullMax);
      bus.emit('log', 'Repaired ship for 10g');
      updateHUD(player);
      openUpgradeMenu(player, metadata);
    }
  };
  menu.appendChild(repairBtn);

  const cargoBtn = document.createElement('button');
  cargoBtn.textContent = 'Increase cargo (+10) - 50g';
  cargoBtn.onclick = () => {
    if (player.gold >= 50) {
      player.gold -= 50;
      player.cargoCapacity += 10;
      bus.emit('log', 'Increased cargo capacity');
      updateHUD(player);
      openUpgradeMenu(player, metadata);
    }
  };
  menu.appendChild(cargoBtn);

  const cannonBtn = document.createElement('button');
  cannonBtn.textContent = 'Improve cannons - 100g';
  if (!isUnlocked('cannonFoundry')) {
    cannonBtn.disabled = true;
    cannonBtn.title = 'Requires cannonFoundry research';
    bus.emit('log', 'Cannon upgrades require cannonFoundry research');
  }
  cannonBtn.onclick = () => {
    if (!isUnlocked('cannonFoundry')) {
      bus.emit('log', 'Cannon upgrades require cannonFoundry research');
      return;
    }
    if (player.gold >= 100) {
      player.gold -= 100;
      player.baseFireRate = Math.max(5, player.baseFireRate - 5);
      player.updateCrewStats();
      bus.emit('log', 'Improved cannons');
      updateHUD(player);
      openUpgradeMenu(player, metadata);
    }
  };
  menu.appendChild(cannonBtn);

  const available = metadata.upgrades || {};

  const upgradeDefs = {
    reinforcedHull: {
      cost: 150,
      label: 'Reinforced hull (+20 hull)',
      apply: () => {
        player.hullMax += 20;
        player.hull += 20;
      },
      log: 'Reinforced hull installed'
    },
    improvedSails: {
      cost: 120,
      label: 'Improved sails (+0.5 speed)',
      apply: () => {
        player.baseMaxSpeed += 0.5;
        player.updateCrewStats();
      },
      log: 'Improved sails fitted'
    },
    crewQuarters: {
      cost: 80,
      label: 'Crew quarters (+5 crew)',
      apply: () => {
        player.crewMax += 5;
        player.crew += 5;
        player.updateCrewStats();
      },
      log: 'Crew quarters expanded'
    }
  };

  Object.entries(upgradeDefs).forEach(([key, info]) => {
    if (available[key] === undefined) return;
    const multiplier = available[key];
    const cost = Math.floor(info.cost * multiplier);
    const level = player.upgrades?.[key] || 0;
    const btn = document.createElement('button');
    btn.textContent = `${info.label} - ${cost}g (Lv ${level})`;
    const requiredTech = key; // upgrade id matches research id
    if (['reinforcedHull', 'improvedSails'].includes(key) && !isUnlocked(requiredTech)) {
      btn.disabled = true;
      btn.title = `Requires ${requiredTech} research`;
      bus.emit('log', `${info.label} requires ${requiredTech} research`);
    }
    btn.onclick = () => {
      if (['reinforcedHull', 'improvedSails'].includes(key) && !isUnlocked(requiredTech)) {
        bus.emit('log', `${info.label} requires ${requiredTech} research`);
        return;
      }
      if (player.gold >= cost) {
        player.gold -= cost;
        info.apply();
        player.upgrades[key] = level + 1;
        bus.emit('log', info.log);
        updateHUD(player);
        openUpgradeMenu(player, metadata);
      }
    };
    menu.appendChild(btn);
  });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.onclick = () => {
    menu.style.display = 'none';
  };
  menu.appendChild(closeBtn);

  menu.style.display = 'block';
}

export function closeUpgradeMenu() {
  const menu = document.getElementById('upgradeMenu');
  if (menu) menu.style.display = 'none';
}
