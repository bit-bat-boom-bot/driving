// Log obstacles laid across the road. Collision ends the run.

import type { Chunk } from './world';
import type { RNG } from './rng';
import { CHUNK_SAMPLES, ROAD_HALF_WIDTH } from './world';

export interface Obstacle {
  x: number;
  y: number;
  // Half-extents in road-aligned space: lateral (across road) and along-road.
  // Used both for collision and as a hint for sprite sizing in the renderer.
  halfWidth: number;
  halfLength: number;
}

const HALF_WIDTH = 38;   // logs span a bit less than half the road
const HALF_LENGTH = 9;

export function spawnObstaclesForChunk(chunk: Chunk, r: RNG) {
  // First few chunks are clear so the player gets a clean ramp-up.
  if (chunk.id < 5) return;
  // Mostly 1 log per chunk; occasional double for variety. Placed at random
  // parametric positions, offset to one side or the other so there's always
  // a gap to thread.
  const count = r() < 0.8 ? 1 : 2;
  const used: number[] = [];
  for (let i = 0; i < count; i++) {
    // pick t in [0.15, 0.95] avoiding chunk seams
    let t = 0;
    for (let tries = 0; tries < 6; tries++) {
      const candidate = 0.15 + r() * 0.8;
      if (used.every((u) => Math.abs(u - candidate) > 0.25)) {
        t = candidate;
        break;
      }
    }
    if (t === 0) continue;
    used.push(t);

    const idx = Math.min(CHUNK_SAMPLES - 1, Math.floor(t * CHUNK_SAMPLES));
    const local = t * CHUNK_SAMPLES - idx;
    const a = chunk.samples[idx], b = chunk.samples[idx + 1];
    const cx = a.x + (b.x - a.x) * local;
    const cy = a.y + (b.y - a.y) * local;

    // Offset roughly halfway to one shoulder so the other half is clear.
    const side = r() < 0.5 ? -1 : 1;
    const off = side * (ROAD_HALF_WIDTH * 0.4 + r() * (ROAD_HALF_WIDTH * 0.25));
    const nx = a.nx + (b.nx - a.nx) * local;
    const ny = a.ny + (b.ny - a.ny) * local;

    chunk.obstacles.push({
      x: cx + nx * off,
      y: cy + ny * off,
      halfWidth: HALF_WIDTH,
      halfLength: HALF_LENGTH,
    });
  }
}
