import { getRoute, autoTrade } from './tradeRoutes.js';

export class FleetController {
  constructor(flagship) {
    this.flagship = flagship;
    this._lastCount = flagship?.fleet?.length || 0;
    this.assignFormation();
  }

  setFlagship(ship) {
    this.flagship = ship;
    this._lastCount = ship?.fleet?.length || 0;
    this.assignFormation();
  }

  assignFormation() {
    const fleet = this.flagship?.fleet;
    if (!fleet) return;
    const spacing = 80;
    fleet.forEach((ship, idx) => {
      if (idx === 0) {
        ship.formationOffset = { x: 0, y: 0 };
      } else {
        const row = Math.floor((idx - 1) / 2) + 1;
        const side = idx % 2 ? -1 : 1;
        ship.formationOffset = { x: -spacing * row, y: side * 40 * row };
      }
    });
  }

  update(
    dt,
    tiles,
    gridSize,
    worldWidth,
    worldHeight,
    cities = [],
    cityMetadata = new Map()
  ) {
    const fleet = this.flagship?.fleet;
    if (!fleet) return;
    if (fleet.length !== this._lastCount) {
      this._lastCount = fleet.length;
      this.assignFormation();
    }
    const leader = this.flagship;
    const cos = Math.cos(leader.angle);
    const sin = Math.sin(leader.angle);
    for (let i = 1; i < fleet.length; i++) {
      const ship = fleet[i];
      if (getRoute(ship)) continue; // routed ships handle their own movement
      const off = ship.formationOffset || { x: 0, y: 0 };
      const targetX = leader.x + cos * off.x - sin * off.y;
      const targetY = leader.y + sin * off.x + cos * off.y;
      const desired = Math.atan2(targetY - ship.y, targetX - ship.x);
      ship.angle = desired;
      const dist = Math.hypot(targetX - ship.x, targetY - ship.y);
      if (dist > 10) {
        ship.speed = Math.min(ship.speed + 0.05 * dt, ship.maxSpeed);
      } else {
        ship.speed = Math.max(ship.speed - 0.1 * dt, 0);
      }
    }

    fleet.forEach(s => {
      const route = getRoute(s);
      if (route && route.cities.length) {
        const target = route.cities[route.index % route.cities.length];
        if (target) {
          s.routeTarget = { x: target.x, y: target.y };
          const dist = Math.hypot(target.x - s.x, target.y - s.y);
          if (dist < gridSize) {
            const metadata = cityMetadata.get(target);
            if (metadata) autoTrade(s, target, metadata, route);
            route.index = (route.index + 1) % route.cities.length;
            const next = route.cities[route.index % route.cities.length];
            s.routeTarget = next ? { x: next.x, y: next.y } : null;
            s.visitPort?.();
          }
        }
      } else {
        s.routeTarget = null;
      }
      s.update(dt, tiles, gridSize, worldWidth, worldHeight);
    });
  }
}
