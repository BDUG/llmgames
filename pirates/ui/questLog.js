export function initQuestLog() {
  const log = document.getElementById('questLog');
  if (log) log.textContent = 'No quests';
}

export function updateQuestLog(questManager) {
  const log = document.getElementById('questLog');
  if (!log) return;
  const quests = [...questManager.getActive(), ...questManager.getCompleted()];
  if (!quests.length) {
    log.textContent = 'No quests';
    return;
  }
  log.innerHTML = quests
    .map(q => `<div>${q.description} - ${q.completed ? 'Completed' : 'Active'}</div>`)
    .join('');
}
