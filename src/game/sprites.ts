// Sprites for collectibles (duck) and obstacles (log). Drawn once into an
// offscreen canvas at a small resolution and then blitted with the renderer's
// perspective scale. Composited primitives instead of ASCII pixel grids
// because round shapes (duck head, log ends) read much cleaner that way.

let DUCK_CV: HTMLCanvasElement | null = null;
let LOG_CV: HTMLCanvasElement | null = null;

export function getDuckSprite(): HTMLCanvasElement {
  if (DUCK_CV) return DUCK_CV;
  const w = 32, h = 32;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d')!;
  // body
  c.fillStyle = '#ffd23d';
  c.beginPath(); c.ellipse(15, 19, 11, 8, 0, 0, Math.PI * 2); c.fill();
  // chest highlight
  c.fillStyle = '#ffe680';
  c.beginPath(); c.ellipse(13, 17, 5, 3, 0, 0, Math.PI * 2); c.fill();
  // tail bump
  c.fillStyle = '#ffd23d';
  c.beginPath(); c.moveTo(5, 18); c.lineTo(2, 14); c.lineTo(6, 17); c.closePath(); c.fill();
  // head
  c.fillStyle = '#ffd23d';
  c.beginPath(); c.arc(22, 10, 6, 0, Math.PI * 2); c.fill();
  // beak (upper + lower)
  c.fillStyle = '#ff8a1a';
  c.beginPath(); c.moveTo(26, 9); c.lineTo(31, 10); c.lineTo(26, 11); c.closePath(); c.fill();
  c.fillStyle = '#d96a08';
  c.beginPath(); c.moveTo(26, 11); c.lineTo(31, 11); c.lineTo(26, 12); c.closePath(); c.fill();
  // eye
  c.fillStyle = '#1a1208';
  c.beginPath(); c.arc(23, 8, 1.3, 0, Math.PI * 2); c.fill();
  // outlines for readability against grass
  c.strokeStyle = 'rgba(60, 30, 0, 0.85)';
  c.lineWidth = 1.2;
  c.beginPath(); c.ellipse(15, 19, 11, 8, 0, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(22, 10, 6, 0, Math.PI * 2); c.stroke();
  DUCK_CV = cv;
  return cv;
}

export function getLogSprite(): HTMLCanvasElement {
  if (LOG_CV) return LOG_CV;
  const w = 64, h = 22;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d')!;
  // shaft
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#5e3a1c');
  g.addColorStop(0.5, '#7a4a26');
  g.addColorStop(1, '#3a2010');
  c.fillStyle = g;
  c.fillRect(7, 2, w - 14, h - 4);
  // bark grooves
  c.strokeStyle = 'rgba(40,22,12,0.55)';
  c.lineWidth = 1;
  for (let x = 11; x < w - 11; x += 5) {
    c.beginPath(); c.moveTo(x, 3); c.lineTo(x + 1, h - 3); c.stroke();
  }
  // ends (cut faces)
  for (const cx of [7, w - 7]) {
    c.fillStyle = '#a8784a';
    c.beginPath(); c.ellipse(cx, h / 2, 5, 9, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#6b3a1a';
    c.lineWidth = 1;
    for (const r of [1.8, 3.4]) {
      c.beginPath(); c.ellipse(cx, h / 2, r, r * 1.4, 0, 0, Math.PI * 2); c.stroke();
    }
    c.strokeStyle = '#1a1208';
    c.lineWidth = 1.2;
    c.beginPath(); c.ellipse(cx, h / 2, 5, 9, 0, 0, Math.PI * 2); c.stroke();
  }
  // overall outline along top and bottom of the shaft
  c.strokeStyle = '#1a1208';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(7, 2); c.lineTo(w - 7, 2);
  c.moveTo(7, h - 2); c.lineTo(w - 7, h - 2);
  c.stroke();
  LOG_CV = cv;
  return cv;
}
