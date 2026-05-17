// Pseudo-3D renderer. The world is still tracked in 2D (x,y); each point is
// projected through the chase camera to give a tilted-perspective view.
//
// Projection: rotate world->camera so the camera's forward vector points
// along screen-up. In camera-local space, lateral = lx, forward-depth = -ly.
// Screen position: cx + (lx/depth) * focal, horizonY + (camHeight/depth) * focal.
// Far-away things compress toward the horizon, which is exactly why distant
// road curves and obstacles "emerge" only as the car closes in.

import type { World } from './world';
import type { Car } from './car';
import type { Camera } from './camera';
import { ROAD_HALF_WIDTH } from './world';
import { drawCarSprite, CarSkin } from './carsprites';
import { getDuckSprite, getLogSprite } from './sprites';

interface Projected {
  x: number;
  y: number;
  scale: number;
  depth: number;
}

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
    const horizonY = this.h * 0.42;
    // Sky
    const sky = c.createLinearGradient(0, 0, 0, horizonY);
    sky.addColorStop(0, '#1d2a3a');
    sky.addColorStop(1, '#3b556e');
    c.fillStyle = sky;
    c.fillRect(0, 0, this.w, horizonY);
    // Ground / distant grass
    const ground = c.createLinearGradient(0, horizonY, 0, this.h);
    ground.addColorStop(0, '#1f3a22');
    ground.addColorStop(1, '#0e1c10');
    c.fillStyle = ground;
    c.fillRect(0, horizonY, this.w, this.h - horizonY);
    // Distant haze on the horizon line
    c.fillStyle = 'rgba(180, 200, 220, 0.10)';
    c.fillRect(0, horizonY - 2, this.w, 4);
  }

  drawWorld(world: World, car: Car, cam: Camera, skin: string) {
    const c = this.ctx;
    const focal = this.w * cam.focalFrac;
    const horizonY = this.h * cam.horizonFrac;
    const cx = this.w / 2;
    // Camera's forward axis in world coords (canvas, y-down):
    //   f = (cos θ, sin θ)        rightward = (-sin θ, cos θ)
    // Change-of-basis: local lateral = dot(delta, right), local forward = dot(delta, f).
    const cs = Math.cos(cam.angle);
    const sn = Math.sin(cam.angle);

    const project = (wx: number, wy: number): Projected | null => {
      const dx = wx - cam.x;
      const dy = wy - cam.y;
      const lx = -dx * sn + dy * cs; // lateral (positive = camera's right)
      const depth = dx * cs + dy * sn; // forward distance ahead of camera
      if (depth < cam.nearPlane || depth > cam.farPlane) return null;
      const sx = cx + (lx * focal) / depth;
      const sy = horizonY + (cam.height * focal) / depth;
      return { x: sx, y: sy, scale: focal / depth, depth };
    };

    // ---- Road ribbon ----
    // Build per-sample left/right projected edges in along-road order (far->near),
    // then draw adjacent pairs as filled trapezoids. Iterating in natural order
    // (rather than depth-sorting) avoids spurious cross-chunk pairings when the
    // road curves sharply.
    type Edge = { l: Projected; r: Projected } | null;
    const edges: Edge[] = [];
    // Far end first: walk chunks from newest (furthest) back to oldest. Within
    // each chunk, walk samples from end-of-chunk back to start. Skip the seam
    // sample (samples[0]) on all chunks but the very first to avoid duplicates.
    for (let ci = world.chunks.length - 1; ci >= 0; ci--) {
      const chunk = world.chunks[ci];
      const startIdx = ci === 0 ? 0 : 1;
      for (let si = chunk.samples.length - 1; si >= startIdx; si--) {
        const s = chunk.samples[si];
        const l = project(s.x - s.nx * ROAD_HALF_WIDTH, s.y - s.ny * ROAD_HALF_WIDTH);
        const r = project(s.x + s.nx * ROAD_HALF_WIDTH, s.y + s.ny * ROAD_HALF_WIDTH);
        edges.push(l && r ? { l, r } : null);
      }
    }

    for (let i = 0; i < edges.length - 1; i++) {
      const far = edges[i];
      const near = edges[i + 1];
      if (!far || !near) continue;

      // asphalt fill
      c.fillStyle = depthShade('#2b3548', '#11161f', near.l.depth, cam.farPlane);
      c.beginPath();
      c.moveTo(far.l.x, far.l.y);
      c.lineTo(far.r.x, far.r.y);
      c.lineTo(near.r.x, near.r.y);
      c.lineTo(near.l.x, near.l.y);
      c.closePath();
      c.fill();

      // shoulder stripes (alternating white/red rumble) on a depth-based phase
      const stripeOn = (Math.floor(near.l.depth / 22) & 1) === 0;
      c.fillStyle = stripeOn ? '#e8e8e8' : '#c83a3a';
      strip(c, far.l, near.l, far.r, near.r, 0.97, 1.0);
      strip(c, far.l, near.l, far.r, near.r, 0.0, 0.03);

      // dashed centerline (only on the "on" segments)
      if (stripeOn) {
        c.fillStyle = '#dfe5ee';
        strip(c, far.l, near.l, far.r, near.r, 0.49, 0.51);
      }
    }

    // ---- Obstacles (logs) ----
    // Drawn ground-aligned: project center; size width by lateral half-width,
    // height by the sprite's aspect at that depth.
    const logCv = getLogSprite();
    const obstacleDraws: { p: Projected; halfWidth: number; halfLength: number }[] = [];
    for (const chunk of world.chunks) {
      for (const o of chunk.obstacles) {
        const p = project(o.x, o.y);
        if (p) obstacleDraws.push({ p, halfWidth: o.halfWidth, halfLength: o.halfLength });
      }
    }
    obstacleDraws.sort((a, b) => b.p.depth - a.p.depth);
    for (const od of obstacleDraws) {
      const screenWidth = od.halfWidth * 2 * od.p.scale;
      const screenHeight = (logCv.height / logCv.width) * screenWidth;
      const cwn = this.ctx;
      const prev = cwn.imageSmoothingEnabled;
      cwn.imageSmoothingEnabled = true;
      cwn.drawImage(
        logCv,
        od.p.x - screenWidth / 2,
        od.p.y - screenHeight * 0.55,
        screenWidth,
        screenHeight,
      );
      cwn.imageSmoothingEnabled = prev;
    }

    // ---- Ducks (pickups) ----
    const duckCv = getDuckSprite();
    const duckDraws: { p: Projected; t0: number; isIngredient: boolean; tint: string | null }[] = [];
    for (const chunk of world.chunks) {
      for (const pk of chunk.pickups) {
        if (pk.taken) continue;
        const p = project(pk.x, pk.y);
        if (!p) continue;
        duckDraws.push({
          p,
          t0: pk.t0,
          isIngredient: pk.kind !== 'bolt',
          tint: pk.kind === 'bolt' ? null : INGREDIENT_TINT[pk.kind],
        });
      }
    }
    duckDraws.sort((a, b) => b.p.depth - a.p.depth);
    const tNow = performance.now() / 1000;
    for (const d of duckDraws) {
      const bob = Math.sin(tNow * 4 + d.t0) * 0.5;
      const baseSize = d.isIngredient ? 28 : 22;
      const w = baseSize * d.p.scale;
      const h = (duckCv.height / duckCv.width) * w;
      c.save();
      c.translate(d.p.x, d.p.y - h * 0.5 - bob * d.p.scale);
      if (d.tint) {
        // ingredient: render the duck with a color overlay halo so rares are
        // visually distinct from common yellow ducks.
        c.shadowColor = d.tint;
        c.shadowBlur = 12 * d.p.scale;
      }
      c.drawImage(duckCv, -w / 2, -h / 2, w, h);
      c.restore();
    }

    // ---- Player car ----
    // The car is always near (cx, ~82% screen height) thanks to the chase
    // camera, but we still project so lateral drift moves it on screen.
    const carP = project(car.x, car.y);
    if (carP) {
      c.save();
      c.translate(carP.x, carP.y);
      // Sprite is authored with +x = nose. We want screen "up" (=ahead) when
      // car heading matches camera angle. So rotate -PI/2 + (heading - angle).
      const yaw = car.heading - cam.angle;
      c.rotate(yaw - Math.PI / 2);
      const carScale = carP.scale * 0.4;
      c.scale(carScale, carScale);
      drawCarSprite(c, 0, 0, 0, skin as CarSkin);
      c.restore();
    }
  }
}

// Quad-strip helper: fill a sub-strip between fractional positions u0..u1
// across two trapezoid edges (far->near).
function strip(
  c: CanvasRenderingContext2D,
  fl: Projected, nl: Projected, fr: Projected, nr: Projected,
  u0: number, u1: number,
) {
  const lerp = (a: Projected, b: Projected, t: number) => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  });
  const a = lerp(fl, fr, u0);
  const b = lerp(fl, fr, u1);
  const d = lerp(nl, nr, u1);
  const e = lerp(nl, nr, u0);
  c.beginPath();
  c.moveTo(a.x, a.y);
  c.lineTo(b.x, b.y);
  c.lineTo(d.x, d.y);
  c.lineTo(e.x, e.y);
  c.closePath();
  c.fill();
}

// Blend two hex colors based on how close to the far plane we are; gives
// distant road a hazier feel without a separate fog pass.
function depthShade(near: string, far: string, depth: number, farPlane: number): string {
  const t = Math.max(0, Math.min(1, depth / farPlane));
  const a = hex(near), b = hex(far);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}
function hex(s: string): [number, number, number] {
  const h = s.replace('#', '');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const INGREDIENT_TINT: Record<string, string> = {
  neon: '#39ff88',
  chrome: '#cfd6dd',
  glitter: '#ff7ad9',
  ember: '#ff6a3d',
  prism: '#7ad7ff',
};
