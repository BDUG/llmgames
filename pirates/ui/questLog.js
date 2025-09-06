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
    .map(q => {
      const max = q.target?.quantity || q.target?.count || 1;
      const reward = [];
      if (q.reward?.gold) reward.push(`${q.reward.gold}g`);
      if (q.reward?.reputation) reward.push(`${q.reward.reputation} rep`);
      return (
        `<div>${q.description} [${q.type}] - ${q.completed ? 'Completed' : 'Active'}<br>` +
        `<progress value="${q.progress}" max="${max}"></progress>` +
        `${reward.length ? '<br>Reward: ' + reward.join(', ') : ''}</div>`
      );
    })
    .join('');
}
