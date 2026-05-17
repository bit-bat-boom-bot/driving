import type { World } from './world';
import type { Car } from './car';
import type { Camera } from './camera';
import { ROAD_HALF_WIDTH } from './world';
import { PICKUP_COLORS, PICKUP_RADIUS } from './pickups';
import { drawCarSprite, CarSkin } from './carsprites';

export class Renderer {
  w = 0;
  h = 0;
  dpr = 1;

  constructor(public ctx: CanvasRenderingContext2D) {}

  setSize(w: number, h: number, dpr: number) {
    this.w = w;
    this.h = h;
    this.dpr = dpr;
  }

  beginFrame() {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    // sky/ground background
    const g = c.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, '#0a0e14');
    g.addColorStop(1, '#11202b');
    c.fillStyle = g;
    c.fillRect(0, 0, this.w, this.h);
  }

  drawWorld(world: World, car: Car, cam: Camera, skin: string) {
    const c = this.ctx;
    const cx = this.w / 2;
    const cy = this.h * 0.62;
    const scale = this.dpr * 1.05;

    c.save();
    c.translate(cx, cy);
    c.scale(scale, scale);
    c.rotate(-cam.angle);
    c.translate(-cam.x, -cam.y);

    // grass texture: subtle radial vignette tied to camera so it doesn't feel infinite-flat
    c.fillStyle = '#0f1a14';
    c.beginPath();
    c.arc(cam.x, cam.y, 1800, 0, Math.PI * 2);
    c.fill();

    // Road: draw thick polyline (dark asphalt) + dashed centerline
    for (const chunk of world.chunks) {
      c.strokeStyle = '#1a2230';
      c.lineWidth = ROAD_HALF_WIDTH * 2;
      c.lineCap = 'butt';
      c.lineJoin = 'round';
      c.beginPath();
      const s0 = chunk.samples[0];
      c.moveTo(s0.x, s0.y);
      for (let i = 1; i < chunk.samples.length; i++) {
        c.lineTo(chunk.samples[i].x, chunk.samples[i].y);
      }
      c.stroke();

      // shoulders
      c.strokeStyle = '#27313f';
      c.lineWidth = 6;
      c.setLineDash([]);
      for (const sign of [-1, 1]) {
        c.beginPath();
        for (let i = 0; i < chunk.samples.length; i++) {
          const s = chunk.samples[i];
          const x = s.x + s.nx * sign * (ROAD_HALF_WIDTH - 3);
          const y = s.y + s.ny * sign * (ROAD_HALF_WIDTH - 3);
          if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.stroke();
      }

      // dashed centerline
      c.strokeStyle = '#3a4658';
      c.setLineDash([20, 18]);
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(s0.x, s0.y);
      for (let i = 1; i < chunk.samples.length; i++) {
        c.lineTo(chunk.samples[i].x, chunk.samples[i].y);
      }
      c.stroke();
      c.setLineDash([]);
    }

    // pickups
    for (const chunk of world.chunks) {
      for (const p of chunk.pickups) {
        if (p.taken) continue;
        const t = (performance.now() / 1000) + p.t0;
        const wob = 1 + Math.sin(t * 4) * 0.06;
        const r = PICKUP_RADIUS[p.kind] * wob;
        c.fillStyle = PICKUP_COLORS[p.kind];
        c.beginPath();
        c.arc(p.x, p.y, r, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.45)';
        c.lineWidth = 1.5;
        c.stroke();
        if (p.kind !== 'bolt') {
          // small inner ring marks rare ingredients
          c.beginPath();
          c.arc(p.x, p.y, r * 0.5, 0, Math.PI * 2);
          c.strokeStyle = 'rgba(255,255,255,0.7)';
          c.lineWidth = 1.5;
          c.stroke();
        }
      }
    }

    // skid marks under car when sliding
    const slip = Math.abs(car.slipAngle());
    if (slip > 0.2 && car.fwdSpeed > 80) {
      c.fillStyle = `rgba(0,0,0,${Math.min(0.4, slip * 0.5)})`;
      const back = -10;
      const bx = car.x + Math.cos(car.heading) * back;
      const by = car.y + Math.sin(car.heading) * back;
      for (const sign of [-1, 1]) {
        const px = bx - Math.sin(car.heading) * 6 * sign;
        const py = by + Math.cos(car.heading) * 6 * sign;
        c.beginPath();
        c.arc(px, py, 2.5, 0, Math.PI * 2);
        c.fill();
      }
    }

    // car
    drawCarSprite(c, car.x, car.y, car.heading, skin as CarSkin);
    c.restore();
  }
}
