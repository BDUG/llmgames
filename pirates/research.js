import { bus } from './bus.js';

export class InnovationNode {
  constructor(id, cost, prerequisites = [], effects = []) {
    this.id = id;
    this.cost = cost;
    this.prerequisites = prerequisites;
    this.effects = effects;
  }
}

// Define a small example research tree. Games can extend this at runtime.
const nodes = new Map();
nodes.set('improvedSails', new InnovationNode('improvedSails', 20, [], [{ type: 'speed', value: 1 }]));
nodes.set(
  'reinforcedHull',
  new InnovationNode('reinforcedHull', 30, ['improvedSails'], [{ type: 'hull', value: 10 }])
);

// Village economy improvements add a small production bonus to all goods.
nodes.set(
  'villageImprovements',
  new InnovationNode('villageImprovements', 40, [], [{ type: 'production', value: 0.25 }])
);

// Unlock additional ship designs for construction.
nodes.set(
  'brigDesign',
  new InnovationNode('brigDesign', 35, [], [{ type: 'ship', value: 'Brig' }])
);
nodes.set(
  'galleonDesign',
  new InnovationNode('galleonDesign', 60, ['brigDesign'], [{ type: 'ship', value: 'Galleon' }])
);

// Cannon foundry speeds up reload time and increases damage.
nodes.set(
  'cannonFoundry',
  new InnovationNode('cannonFoundry', 30, [], [{ type: 'cannon', value: 1 }])
);

export function getResearchNodes() {
  return Array.from(nodes.values());
}

export let researchPoints = 0;
export let activeProject = null; // { id, progress }
export const completedTech = new Set();

export function isUnlocked(id) {
  return completedTech.has(id);
}

export function startResearch(id) {
  const node = nodes.get(id);
  if (!node) return false;
  if (completedTech.has(id)) return false;
  if (!node.prerequisites.every(p => completedTech.has(p))) return false;
  if (activeProject && activeProject.id !== id) return false;
  if (!activeProject) activeProject = { id, progress: 0 };
  applyResearch();
  bus.emit('research-started', { id });
  return true;
}

export function addResearchPoints(amount) {
  researchPoints += amount;
  applyResearch();
  bus.emit('research-points', { points: researchPoints });
}

function applyResearch() {
  if (!activeProject) return;
  const node = nodes.get(activeProject.id);
  if (!node) return;
  const needed = node.cost - activeProject.progress;
  const used = Math.min(needed, researchPoints);
  activeProject.progress += used;
  researchPoints -= used;
  if (activeProject.progress >= node.cost) {
    completedTech.add(node.id);
    const finished = activeProject.id;
    activeProject = null;
    bus.emit('research-completed', { id: finished });
    let msg = `${finished} research completed`;
    if (node.effects) {
      node.effects.forEach(effect => {
        if (effect.type === 'ship')
          msg += `; ${effect.value} class ships available`;
        if (effect.type === 'cannon') msg += '; cannon performance improved';
        if (effect.type === 'production') msg += '; village production increased';
      });
    }
    bus.emit('log', msg);
  }
  bus.emit('research-updated');
}

export function getResearchState() {
  return {
    points: researchPoints,
    activeProject,
    completed: Array.from(completedTech)
  };
}

export function setResearchState(data = {}) {
  researchPoints = data.points || 0;
  activeProject = data.activeProject || null;
  completedTech.clear();
  (data.completed || []).forEach(id => completedTech.add(id));
  bus.emit('research-updated');
}

// Periodic passive research point generation in browsers
if (typeof window !== 'undefined') {
  setInterval(() => addResearchPoints(1), 30000);
}

// Hooks for earning research points from gameplay events
bus.on('quest-completed', () => addResearchPoints(5));
bus.on('village-founded', () => addResearchPoints(2));
