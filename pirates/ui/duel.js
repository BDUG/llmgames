import { updateHUD } from './hud.js';
import { bus as defaultBus } from '../bus.js';
import { Ship } from '../entities/ship.js';

// Starts a simple duel UI where the player and enemy exchange attacks/blocks
// via key presses. Returns a promise that resolves when the duel completes.
// If the environment cannot create the duel interface, the promise is
// rejected so callers can fall back to other logic.
export function startDuel(player, enemy, bus = defaultBus) {
  return new Promise((resolve, reject) => {
    try {
      if (!player || !enemy || typeof document === 'undefined') {
        reject(new Error('Duel UI unavailable'));
        return;
      }

      bus.emit('log', `Boarding ${enemy.nation} ship!`);

      const overlay = document.createElement('div');
      overlay.id = 'duelOverlay';
      Object.assign(overlay.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      });

      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 150;
      overlay.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        overlay.remove();
        reject(new Error('Canvas unsupported'));
        return;
      }

      document.body.appendChild(overlay);

      let playerCrew = player.crew;
      let enemyCrew = enemy.crew;
      const logs = [];
      function flushLogs() {
        if (logs.length) {
          bus.emit('log', logs.slice());
          logs.length = 0;
        }
      }

      const skill = player.skill || 1; // higher skill -> shorter reaction window
      const sword = player.sword || 0; // better swords do more damage
      const reactionWindow = Math.max(300, 1000 - skill * 100);
      const playerDamage = 1 + sword;

      let currentAction = '';
      let waiting = false;
      let turnTimeout;

      function draw(message = '') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '16px sans-serif';
        ctx.fillText(`Your crew: ${playerCrew}`, 10, 20);
        ctx.fillText(`Enemy crew: ${enemyCrew}`, 10, 40);
        ctx.fillText('A: attack  D: block', 10, 80);
        if (message) ctx.fillText(message, 10, 110);
      }

      function nextTurn() {
        if (playerCrew <= 0 || enemyCrew <= 0) {
          end();
          return;
        }
        waiting = true;
        currentAction = Math.random() < 0.5 ? 'attack' : 'block';
        const msg = currentAction === 'attack' ? 'Enemy attacks!' : 'Enemy blocks!';
        draw(msg);
        turnTimeout = setTimeout(() => {
          if (!waiting) return;
          waiting = false;
          if (currentAction === 'attack') {
            playerCrew--;
            logs.push(`Enemy hits you! (${playerCrew} left)`);
            updateHUD(player);
          }
          flushLogs();
          nextTurn();
        }, reactionWindow);
      }

      function keyHandler(e) {
        if (!waiting) return;
        const key = e.key.toLowerCase();
        if (key !== 'a' && key !== 'd') return;
        waiting = false;
        clearTimeout(turnTimeout);
        if (currentAction === 'attack' && key === 'd') {
          enemyCrew -= playerDamage;
          logs.push(`You parry and strike! Enemy crew ${enemyCrew} left`);
        } else if (currentAction === 'block' && key === 'a') {
          enemyCrew -= playerDamage;
          logs.push(`Direct hit! Enemy crew ${enemyCrew} left`);
        } else {
          playerCrew--;
          logs.push(`You are struck! (${playerCrew} left)`);
          updateHUD(player);
        }
        flushLogs();
        draw();
        nextTurn();
      }

      window.addEventListener('keydown', keyHandler);

      function end() {
        clearTimeout(turnTimeout);
        window.removeEventListener('keydown', keyHandler);
        overlay.remove();

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
          flushLogs();

          const captured = new Ship(enemy.x, enemy.y, 'Pirate', enemy.type);
          captured.hull = Math.min(enemy.hull, captured.hullMax);
          captured.cargo = { ...enemy.cargo };
          captured.gold = 0;
          captured.crew = 0;
          captured.fleet = player.fleet || (player.fleet = [player]);
          player.fleet.push(captured);
          logs.push(`Captured ${enemy.type} added to fleet.`);

          enemy.sunk = true;
        } else {
          logs.push('Boarding failed! Your crew was repelled.');
          player.adjustReputation(enemy.nation, -1);
        }

        flushLogs();
        updateHUD(player);
        resolve();
      }

      draw('Prepare to duel!');
      flushLogs();
      nextTurn();
    } catch (e) {
      reject(e);
    }
  });
}

