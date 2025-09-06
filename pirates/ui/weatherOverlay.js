import { cartToIso } from '../world.js';

export function drawWeatherOverlay(
  ctx,
  storms = [],
  wind,
  offsetX = 0,
  offsetY = 0,
  tileWidth = 0,
  tileIsoHeight = 0,
  tileImageHeight = 0
) {
  if (!ctx) return;
  ctx.save();
  storms.forEach(s => {
    const { isoX, isoY } = cartToIso(
      s.x,
      s.y,
      tileWidth,
      tileIsoHeight,
      tileImageHeight
    );
    ctx.fillStyle = `rgba(100,100,100,${0.2 + 0.3 * s.intensity})`;
    ctx.beginPath();
    ctx.arc(isoX - offsetX, isoY - offsetY, s.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  if (wind) {
    const len = 40;
    const cx = 50;
    const cy = 50;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(wind.angle) * len, cy + Math.sin(wind.angle) * len);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
  ctx.restore();
}

export function drawWeatherMinimap(
  ctx,
  storms = [],
  wind,
  worldWidth,
  worldHeight
) {
  if (!ctx) return;
  ctx.save();
  storms.forEach(s => {
    const x = (s.x / worldWidth) * ctx.canvas.width;
    const y = (s.y / worldHeight) * ctx.canvas.height;
    const r = (s.radius / worldWidth) * ctx.canvas.width;
    ctx.fillStyle = 'rgba(100,100,100,0.5)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  if (wind) {
    const len = 15;
    const cx = ctx.canvas.width - 20;
    const cy = ctx.canvas.height - 20;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(wind.angle) * len, cy + Math.sin(wind.angle) * len);
    ctx.stroke();
  }
  ctx.restore();
}
