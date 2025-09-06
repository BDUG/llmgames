export class Quest {
  constructor(
    id,
    description,
    nation,
    reputation = 0,
    type = 'explore',
    target = {},
    reward = { gold: 0, reputation }
  ) {
    this.id = id;
    this.description = description;
    this.nation = nation;
    this.type = type;
    this.target = target;
    this.reward = { gold: reward.gold || 0, reputation: reward.reputation ?? reputation };
    // retain direct reputation field for legacy uses
    this.reputation = this.reward.reputation;
    this.progress = 0;
    this.completed = false;
  }

  complete() {
    this.completed = true;
    this.progress = this.target?.quantity || 1;
  }
}
