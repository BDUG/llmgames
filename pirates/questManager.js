import { bus } from './bus.js';
import { cartesian } from './utils/distance.js';

class QuestManager {
  constructor() {
    this.active = [];
    this.completed = [];
    bus.on('trade', e => this.recordProgress('trade', e));
    bus.on('combat', e => this.recordProgress('combat', e));
  }

  addQuest(quest) {
    this.active.push(quest);
    bus.emit('log', `Quest added: ${quest.description}`);
    bus.emit('quest-updated');
  }

  recordProgress(type, data) {
    let updated = false;
    this.active.forEach(q => {
      if (q.type !== type || q.completed) return;
      switch (type) {
        case 'trade': {
          if (!q.target.good || q.target.good === data.good) {
            q.progress += data.quantity || 1;
            if (q.progress >= (q.target.quantity || 1)) {
              this.completeQuest(q.id);
            }
            updated = true;
          }
          break;
        }
        case 'combat': {
          if (!q.target.nation || q.target.nation === data.nation) {
            q.progress += 1;
            if (q.progress >= (q.target.count || 1)) {
              this.completeQuest(q.id);
            }
            updated = true;
          }
          break;
        }
      }
    });
    if (updated) bus.emit('quest-updated');
  }

  update(player, npcShips = []) {
    this.active.forEach(q => {
      if (q.completed) return;
      switch (q.type) {
        case 'explore': {
          const loc = q.target.location || q.target;
          const radius = q.target.radius || 20;
          const d = cartesian(player.x, player.y, loc.x, loc.y);
          if (d < radius) {
            q.progress = 1;
            this.completeQuest(q.id);
          }
          break;
        }
        case 'escort': {
          const npc = q.target.npc;
          const dest = q.target.destination;
          const radius = q.target.radius || 20;
          if (!npc || npc.sunk) return;
          const d = cartesian(npc.x, npc.y, dest.x, dest.y);
          if (d < radius) {
            q.progress = 1;
            this.completeQuest(q.id);
          }
          break;
        }
      }
    });
  }

  completeQuest(id) {
    const idx = this.active.findIndex(q => q.id === id);
    if (idx === -1) return;
    const quest = this.active[idx];
    quest.complete();
    this.active.splice(idx, 1);
    this.completed.push(quest);
    const player = bus.getPlayer ? bus.getPlayer() : null;
    if (player) {
      player.gold = (player.gold || 0) + (quest.reward?.gold || 0);
      if (quest.reward?.reputation) {
        player.adjustReputation?.(quest.nation, quest.reward.reputation);
      }
    }
    bus.emit('quest-completed', { quest });
    bus.emit('log', `Quest completed: ${quest.description}`);
    bus.emit('quest-updated');
  }

  getActive() {
    return this.active;
  }

  getCompleted() {
    return this.completed;
  }
}

export const questManager = new QuestManager();
