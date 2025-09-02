import { bus } from './bus.js';
import { updateHUD } from './ui/hud.js';

export function startBoarding(player, enemy) {
  if (!player || !enemy) return;

  bus.emit('log', `Boarding ${enemy.nation} ship!`);

  let playerCrew = player.crew;
  let enemyCrew = enemy.crew;

  // Simple combat loop
  while (playerCrew > 0 && enemyCrew > 0) {
    const playerRoll = Math.random() * playerCrew;
    const enemyRoll = Math.random() * enemyCrew;
    if (playerRoll > enemyRoll) {
      enemyCrew--;
      bus.emit('log', `Enemy loses a crew member (${enemyCrew} left)`);
    } else {
      playerCrew--;
      bus.emit('log', `You lose a crew member (${playerCrew} left)`);
    }
  }

  player.crew = playerCrew;
  enemy.crew = enemyCrew;

  if (playerCrew > 0) {
    bus.emit('log', `You captured the ${enemy.nation} ship!`);

    // Transfer gold and cargo
    if (enemy.gold) {
      player.gold += enemy.gold;
      bus.emit('log', `Plundered ${enemy.gold} gold`);
    }

    if (enemy.cargo) {
      let used = Object.values(player.cargo).reduce((a, b) => a + b, 0);
      const capacity = player.cargoCapacity;
      for (const [good, qty] of Object.entries(enemy.cargo)) {
        const space = capacity - used;
        if (space <= 0) break;
        const add = Math.min(qty, space);
        player.cargo[good] = (player.cargo[good] || 0) + add;
        used += add;
        bus.emit('log', `Seized ${add} ${good}`);
      }
    }

    player.adjustReputation(enemy.nation, -5);
    bus.emit('log', `Reputation with ${enemy.nation} decreased`);

    enemy.sunk = true;
  } else {
    bus.emit('log', 'Boarding failed! Your crew was repelled.');
    player.adjustReputation(enemy.nation, -1);
  }

  updateHUD(player);
}
