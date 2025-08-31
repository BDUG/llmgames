export class Quest {
  constructor(id, description, nation, reputation = 0) {
    this.id = id;
    this.description = description;
    this.nation = nation;
    this.reputation = reputation;
    this.completed = false;
  }

  complete() {
    this.completed = true;
  }
}
