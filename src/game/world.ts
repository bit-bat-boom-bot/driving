// Endless procedural road. The road is a centerline polyline emitted in
// chunks as the car advances. Chunks are recycled when the car has moved
// well past them. Chunks also carry pickups and obstacle hazards.

import { rng, RNG } from './rng';
import { Pickup, spawnPickupsForChunk } from './pickups';
import { Obstacle, spawnObstaclesForChunk } from './obstacles';

export const ROAD_HALF_WIDTH = 140;
export const CHUNK_LEN = 600;     // distance along road per chunk
export const CHUNK_SAMPLES = 12;  // centerline samples per chunk

export interface ChunkSample {
  x: number; y: number;
  tx: number; ty: number; // tangent (unit)
  nx: number; ny: number; // normal (unit, points to road's right)
}

export interface Chunk {
  id: number;
  samples: ChunkSample[]; // length CHUNK_SAMPLES+1; index 0 = previous chunk's last
  pickups: Pickup[];
  obstacles: Obstacle[];
}

export class World {
  rng: RNG;
  chunks: Chunk[] = [];
  // running centerline state used to extend the next chunk
  private headX = 0;
  private headY = 0;
  private headHeading = -Math.PI / 2; // road initially heading up (-y)
  private nextId = 0;
  // gentle curvature noise state
  private curveState = 0;

  constructor(seed: number) {
    this.rng = rng(seed);
    // seed the very first sample so chunk[0].samples[0] exists
    this.appendChunk();
  }

  // Ensure at least N chunks ahead of the given world-space position.
  ensureAhead(x: number, y: number, ahead = 3) {
    while (this.chunks.length < ahead) this.appendChunk();
    const carLastChunk = this.chunkIndexAt(x, y);
    while (this.chunks.length - carLastChunk - 1 < ahead) this.appendChunk();
    // recycle anything well behind
    while (carLastChunk > 2) {
      this.chunks.shift();
    }
  }

  private chunkIndexAt(x: number, y: number): number {
    // approximate: nearest sample center
    let bestI = 0, bestD = Infinity;
    for (let i = 0; i < this.chunks.length; i++) {
      const s = this.chunks[i].samples[Math.floor(CHUNK_SAMPLES / 2)];
      const d = (s.x - x) ** 2 + (s.y - y) ** 2;
      if (d < bestD) { bestD = d; bestI = i; }
    }
    return bestI;
  }

  private appendChunk() {
    const samples: ChunkSample[] = [];
    const prev = this.chunks.length
      ? this.chunks[this.chunks.length - 1].samples[CHUNK_SAMPLES]
      : this.makeSample(this.headX, this.headY, this.headHeading);
    samples.push(prev);
    const stepLen = CHUNK_LEN / CHUNK_SAMPLES;
    for (let i = 1; i <= CHUNK_SAMPLES; i++) {
      // Smooth random curvature (1D random walk, bounded). Tightness tuned so
      // the road never bends faster than the car can comfortably track at top speed.
      this.curveState += (this.rng() - 0.5) * 0.05;
      this.curveState *= 0.9;
      this.headHeading += this.curveState * 0.35;
      this.headX += Math.cos(this.headHeading) * stepLen;
      this.headY += Math.sin(this.headHeading) * stepLen;
      samples.push(this.makeSample(this.headX, this.headY, this.headHeading));
    }
    const chunk: Chunk = { id: this.nextId++, samples, pickups: [], obstacles: [] };
    // First couple chunks are pickup-free so the player can settle in.
    if (chunk.id >= 2) spawnPickupsForChunk(chunk, this.rng);
    spawnObstaclesForChunk(chunk, this.rng);
    this.chunks.push(chunk);
  }

  private makeSample(x: number, y: number, heading: number): ChunkSample {
    const tx = Math.cos(heading), ty = Math.sin(heading);
    return { x, y, tx, ty, nx: -ty, ny: tx };
  }

  // Returns the closest point on the centerline to (x,y), the signed offset
  // from center (positive = right of road), and tangent at that point.
  closestOnRoad(x: number, y: number) {
    let best = { dist: Infinity, offset: 0, tx: 1, ty: 0, px: x, py: y };
    for (const chunk of this.chunks) {
      for (let i = 0; i < chunk.samples.length - 1; i++) {
        const a = chunk.samples[i], b = chunk.samples[i + 1];
        const abx = b.x - a.x, aby = b.y - a.y;
        const abLen2 = abx * abx + aby * aby;
        const apx = x - a.x, apy = y - a.y;
        let t = (apx * abx + apy * aby) / abLen2;
        if (t < 0) t = 0; else if (t > 1) t = 1;
        const px = a.x + abx * t, py = a.y + aby * t;
        const dx = x - px, dy = y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < best.dist) {
          const tlen = Math.hypot(abx, aby) || 1;
          const tx = abx / tlen, ty = aby / tlen;
          const nx = -ty, ny = tx;
          const offset = dx * nx + dy * ny;
          best = { dist: d2, offset, tx, ty, px, py };
        }
      }
    }
    return { ...best, dist: Math.sqrt(best.dist) };
  }

  // Distance traveled along the road from origin to (x,y), approximated.
  // Used as the run "score".
  distanceAlong(x: number, y: number): number {
    let total = 0;
    let lastA = this.chunks[0]?.samples[0];
    if (!lastA) return 0;
    for (const chunk of this.chunks) {
      for (let i = 0; i < chunk.samples.length - 1; i++) {
        const a = chunk.samples[i], b = chunk.samples[i + 1];
        const segLen = Math.hypot(b.x - a.x, b.y - a.y);
        // are we past this segment?
        const abx = b.x - a.x, aby = b.y - a.y;
        const apx = x - a.x, apy = y - a.y;
        const t = (apx * abx + apy * aby) / (segLen * segLen);
        if (t >= 1) {
          total += segLen;
          lastA = b;
        } else if (t > 0) {
          total += t * segLen;
          return total;
        } else {
          return total;
        }
      }
    }
    return total;
  }
}
