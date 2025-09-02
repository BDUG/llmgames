export function initLog(bus) {
  const logDiv = document.getElementById('log');
  if (!logDiv || !bus) return;
  bus.on('log', msg => {
    const messages = Array.isArray(msg) ? msg : [msg];
    for (const m of messages) {
      const div = document.createElement('div');
      div.textContent = m;
      logDiv.appendChild(div);
    }
    logDiv.scrollTop = logDiv.scrollHeight;
  });
}
