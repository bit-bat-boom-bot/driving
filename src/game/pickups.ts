// Pickups scattered along the road. Two kinds:
// - Bolts: common currency, used for most upgrades.
// - Ingredients: rarer (neon, chrome, glitter, ember, prism). Each ties into
//   specific upgrade branches and Easter-egg car unlocks.

import type { Chunk } from './world';
import type { RNG } from './rng';
import { CHUNK_LEN, CHUNK_SAMPLES, ROAD_HALF_WIDTH } from './world';

export type IngredientKind = 'neon' | 'chrome' | 'glitter' | 'ember' | 'prism';
export type PickupKind = 'bolt' | IngredientKind;

export interface Pickup {
  kind: PickupKind;
  x: number;
  y: number;
  taken: boolean;
  // anim phase
  t0: number;
}

const INGREDIENT_RATES: Record<IngredientKind, number> = {
  neon:    0.030,
  chrome:  0.022,
  glitter: 0.016,
  ember:   0.012,
  prism:   0.005,
};

export function spawnPickupsForChunk(chunk: Chunk, r: RNG) {
  // ~6-10 bolts per chunk, occasional ingredient.
  const count = 6 + Math.floor(r() * 5);
  for (let i = 0; i < count; i++) {
    // pick a parametric position along the chunk's centerline
    const t = (i + r()) / count;
    const idx = Math.min(CHUNK_SAMPLES - 1, Math.floor(t * CHUNK_SAMPLES));
    const local = t * CHUNK_SAMPLES - idx;
    const a = chunk.samples[idx], b = chunk.samples[idx + 1];
    const cx = a.x + (b.x - a.x) * local;
    const cy = a.y + (b.y - a.y) * local;
    // lateral offset within the road
    const off = (r() - 0.5) * (ROAD_HALF_WIDTH * 1.4);
    const nx = a.nx + (b.nx - a.nx) * local;
    const ny = a.ny + (b.ny - a.ny) * local;
    const x = cx + nx * off;
    const y = cy + ny * off;

    let kind: PickupKind = 'bolt';
    const roll = r();
    let acc = 0;
    for (const k of Object.keys(INGREDIENT_RATES) as IngredientKind[]) {
      acc += INGREDIENT_RATES[k];
      if (roll < acc) { kind = k; break; }
    }
    chunk.pickups.push({ kind, x, y, taken: false, t0: r() * 6.28 });
  }
  // Avoid trivially-easy 100% chunks: cap an absolute number of ingredients.
  let ingCount = chunk.pickups.filter((p) => p.kind !== 'bolt').length;
  for (const p of chunk.pickups) {
    if (ingCount > 2 && p.kind !== 'bolt') { p.kind = 'bolt'; ingCount--; }
  }
  // Avoid bunching near the chunk seam; the first sample is shared with
  // the previous chunk so pickups near s=0 visually overlap.
  chunk.pickups = chunk.pickups.filter((p, i) => {
    const seam = chunk.samples[0];
    if (i === 0) return Math.hypot(p.x - seam.x, p.y - seam.y) > CHUNK_LEN * 0.05;
    return true;
  });
}

export const PICKUP_COLORS: Record<PickupKind, string> = {
  bolt:    '#ffd34d',
  neon:    '#39ff88',
  chrome:  '#cfd6dd',
  glitter: '#ff7ad9',
  ember:   '#ff6a3d',
  prism:   '#7ad7ff',
};

export const PICKUP_RADIUS: Record<PickupKind, number> = {
  bolt:    9,
  neon:    11,
  chrome:  11,
  glitter: 11,
  ember:   11,
  prism:   13,
};
