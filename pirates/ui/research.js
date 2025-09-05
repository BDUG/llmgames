import { bus } from '../bus.js';
import {
  getResearchNodes,
  getResearchState,
  startResearch
} from '../research.js';

function render() {
  const menu = document.getElementById('researchMenu');
  if (!menu || menu.style.display === 'none') return;
  const state = getResearchState();
  menu.innerHTML = '';

  const title = document.createElement('div');
  title.textContent = `Research Points: ${state.points}`;
  menu.appendChild(title);

  const list = document.createElement('div');
  getResearchNodes().forEach(node => {
    const item = document.createElement('div');
    const btn = document.createElement('button');
    btn.textContent = node.id;
    const completed = state.completed.includes(node.id);
    const active = state.activeProject?.id === node.id;
    const prereqsMet = node.prerequisites.every(p => state.completed.includes(p));
    btn.disabled = completed || !prereqsMet || (state.activeProject && !active);
    btn.onclick = () => startResearch(node.id);
    item.appendChild(btn);
    let status = '';
    if (completed) status = ' (Completed)';
    else if (active) status = ` (${state.activeProject.progress}/${node.cost})`;
    else if (!prereqsMet) status = ' (Locked)';
    else status = ` (Cost: ${node.cost})`;
    const span = document.createElement('span');
    span.textContent = status;
    item.appendChild(span);
    list.appendChild(item);
  });
  menu.appendChild(list);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.onclick = () => (menu.style.display = 'none');
  menu.appendChild(closeBtn);
}

export function openResearchMenu() {
  const menu = document.getElementById('researchMenu');
  if (!menu) return;
  menu.style.display = 'block';
  render();
}

export function closeResearchMenu() {
  const menu = document.getElementById('researchMenu');
  if (menu) menu.style.display = 'none';
}

bus.on('research-updated', render);
