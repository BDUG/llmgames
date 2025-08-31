import { bus } from './bus.js';

class QuestManager {
  constructor() {
    this.active = [];
    this.completed = [];
  }

  addQuest(quest) {
    this.active.push(quest);
    bus.emit('log', `Quest added: ${quest.description}`);
    bus.emit('quest-updated');
  }

  completeQuest(id) {
    const idx = this.active.findIndex(q => q.id === id);
    if (idx === -1) return;
    const quest = this.active[idx];
    quest.complete();
    this.active.splice(idx, 1);
    this.completed.push(quest);
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
