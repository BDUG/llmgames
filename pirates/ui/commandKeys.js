export function initCommandKeys() {
  const div = document.getElementById('commandKeys');
  if (!div) return;
  div.innerHTML = `
    <strong>Command Keys:</strong>
    <div data-cmd="move">&uarr; / W : Move forward</div>
    <div data-cmd="slow">&darr; / S : Slow down</div>
    <div data-cmd="rotate">&larr; / &rarr; or A / D : Rotate ship</div>
    <div data-cmd="fire">Space: Fire cannon</div>
    <div data-cmd="pause">P: Pause/Unpause</div>
    <div data-cmd="minimap">M: Toggle minimap</div>
    <div data-cmd="autopilot">X: Autopilot to nearest city</div>
    <div data-cmd="sails">1/2/3: Set sails (none/half/full)</div>
    <div data-cmd="trade" style="display:none">T: Trade (if near a settlement)</div>
    <div data-cmd="governor" style="display:none">G: Visit governor</div>
    <div data-cmd="tavern" style="display:none">V: Visit tavern</div>
    <div data-cmd="upgrade" style="display:none">U: Shipwright</div>
    <div data-cmd="shipyard" style="display:none">Y: Shipyard</div>
    <div data-cmd="board" style="display:none">B: Board enemy ship</div>
    <div data-cmd="buildVillage" style="display:none">B: Build Village</div>
    <div data-cmd="buildRoad" style="display:none">R: Build Road</div>
    <div data-cmd="capture" style="display:none">C: Capture enemy ship</div>
    <div data-cmd="land" style="display:none">Q: Disembark/Board</div>
    <div data-cmd="fleet">F: Manage fleet</div>
    <div data-cmd="shareLoot" style="display:none">H: Share Loot</div>
    <div data-cmd="research">I: Research</div>
    <div data-cmd="save">S: Save game</div>
    <div data-cmd="load">L: Load game</div>
  `;
}

export function updateCommandKeys({
  nearCity = false,
  nearEnemy = false,
  shipyard = false,
  nearLand = false,
  canBuildVillage = false,
  canBuildRoad = false,
  canShareLoot = false
}) {
  const div = document.getElementById('commandKeys');
  if (!div) return;
  toggle(div.querySelector('[data-cmd="trade"]'), nearCity);
   toggle(div.querySelector('[data-cmd="governor"]'), nearCity);
   toggle(div.querySelector('[data-cmd="tavern"]'), nearCity);
   toggle(div.querySelector('[data-cmd="upgrade"]'), nearCity);
  toggle(div.querySelector('[data-cmd="shipyard"]'), shipyard);
  toggle(div.querySelector('[data-cmd="board"]'), nearEnemy && !canBuildVillage);
  toggle(div.querySelector('[data-cmd="buildVillage"]'), canBuildVillage);
  toggle(div.querySelector('[data-cmd="buildRoad"]'), canBuildRoad);
  toggle(div.querySelector('[data-cmd="capture"]'), nearEnemy);
  toggle(div.querySelector('[data-cmd="land"]'), nearLand);
  toggle(div.querySelector('[data-cmd="shareLoot"]'), canShareLoot);
}

function toggle(el, show) {
  if (el) el.style.display = show ? 'block' : 'none';
}
