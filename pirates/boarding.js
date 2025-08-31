import { bus } from './bus.js';

export function startBoarding(player, enemy) {
  bus.emit('log', `Boarding ${enemy.nation} ship!`);
}
