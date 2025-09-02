import { bus } from './bus.js';
import { updateHUD } from './ui/hud.js';

export function startBoarding(player, enemy) {
  if (!player || !enemy) return;

  bus.emit('log', `Boarding ${enemy.nation} ship!`);

  let playerCrew = player.crew;
  let enemyCrew = enemy.crew;
  const logs = [];

  function flushLogs() {
    if (logs.length) {
      bus.emit('log', logs.slice());
      logs.length = 0;
    }
  }

  function tick() {
    if (playerCrew > 0 && enemyCrew > 0) {
      const playerRoll = Math.random() * playerCrew;
      const enemyRoll = Math.random() * enemyCrew;
      if (playerRoll > enemyRoll) {
        enemyCrew--;
        logs.push(`Enemy loses a crew member (${enemyCrew} left)`);
      } else {
        playerCrew--;
        logs.push(`You lose a crew member (${playerCrew} left)`);
      }
      flushLogs();
      requestAnimationFrame(tick);
    } else {
      player.crew = playerCrew;
      enemy.crew = enemyCrew;

      if (playerCrew > 0) {
        logs.push(`You captured the ${enemy.nation} ship!`);

        if (enemy.gold) {
          player.gold += enemy.gold;
          logs.push(`Plundered ${enemy.gold} gold`);
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
            logs.push(`Seized ${add} ${good}`);
          }
        }

        player.adjustReputation(enemy.nation, -5);
        logs.push(`Reputation with ${enemy.nation} decreased`);

        enemy.sunk = true;
      } else {
        logs.push('Boarding failed! Your crew was repelled.');
        player.adjustReputation(enemy.nation, -1);
      }

      flushLogs();
      updateHUD(player);
    }
  }

  requestAnimationFrame(tick);
}
