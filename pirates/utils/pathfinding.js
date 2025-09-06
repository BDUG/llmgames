import { Terrain } from '../world.js';

function isBlocked(t) {
  return (
    t === Terrain.LAND ||
    t === Terrain.COAST ||
    t === Terrain.HILL ||
    t === Terrain.VILLAGE
  );
}

function heuristic(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

export function findPath(startX, startY, goalX, goalY, tiles, gridSize) {
  if (!tiles || !tiles.length) return [];
  const rows = tiles.length;
  const cols = tiles[0].length;
  const startR = Math.floor(startY / gridSize);
  const startC = Math.floor(startX / gridSize);
  let goalR = Math.floor(goalY / gridSize);
  let goalC = Math.floor(goalX / gridSize);

  const inBounds = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols;

  // if goal is blocked, search nearby for nearest passable tile
  if (!inBounds(goalR, goalC)) return [];
  if (isBlocked(tiles[goalR][goalC])) {
    const queue = [{ r: goalR, c: goalC }];
    const seen = new Set([`${goalR},${goalC}`]);
    let found = null;
    while (queue.length && !found) {
      const { r, c } = queue.shift();
      const neigh = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ];
      for (const [dr, dc] of neigh) {
        const nr = r + dr,
          nc = c + dc;
        const key = `${nr},${nc}`;
        if (!inBounds(nr, nc) || seen.has(key)) continue;
        seen.add(key);
        if (!isBlocked(tiles[nr][nc])) {
          found = { r: nr, c: nc };
          break;
        }
        queue.push({ r: nr, c: nc });
      }
    }
    if (found) {
      goalR = found.r;
      goalC = found.c;
    } else {
      return [];
    }
  }

  const open = [];
  const g = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  const f = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  const cameFrom = new Map();

  g[startR][startC] = 0;
  f[startR][startC] = heuristic(startR, startC, goalR, goalC);
  open.push({ r: startR, c: startC, f: f[startR][startC] });

  const openKey = (r, c) => `${r},${c}`;

  while (open.length) {
    // get node with lowest f
    let idx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[idx].f) idx = i;
    }
    const current = open.splice(idx, 1)[0];
    const { r, c } = current;
    if (r === goalR && c === goalC) {
      const path = [];
      let key = openKey(r, c);
      while (cameFrom.has(key)) {
        const [rr, cc] = key.split(',').map(Number);
        path.push({ r: rr, c: cc });
        key = cameFrom.get(key);
      }
      path.push({ r: startR, c: startC });
      path.reverse();
      return path.map(p => ({
        x: (p.c + 0.5) * gridSize,
        y: (p.r + 0.5) * gridSize
      }));
    }

    const neigh = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];
    for (const [dr, dc] of neigh) {
      const nr = r + dr,
        nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      if (isBlocked(tiles[nr][nc]) && !(nr === goalR && nc === goalC)) continue;
      const tentative = g[r][c] + 1;
      if (tentative < g[nr][nc]) {
        cameFrom.set(openKey(nr, nc), openKey(r, c));
        g[nr][nc] = tentative;
        f[nr][nc] = tentative + heuristic(nr, nc, goalR, goalC);
        const existing = open.find(n => n.r === nr && n.c === nc);
        if (existing) {
          existing.f = f[nr][nc];
        } else {
          open.push({ r: nr, c: nc, f: f[nr][nc] });
        }
      }
    }
  }
  return [];
}

