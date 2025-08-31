export function initLog(bus) {
  const logDiv = document.getElementById('log');
  if (!logDiv || !bus) return;
  bus.on('log', msg => {
    const div = document.createElement('div');
    div.textContent = msg;
    logDiv.appendChild(div);
    logDiv.scrollTop = logDiv.scrollHeight;
  });
}
