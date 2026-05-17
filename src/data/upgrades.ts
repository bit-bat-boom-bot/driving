// Upgrade tree. Each node has a max level, cost curve, and effect.
// Effects compose into the car's base stats at run start.

import type { CarStats } from '../game/car';
import type { SaveData } from '../store/save';
import type { IngredientKind } from '../game/pickups';

export interface UpgradeDef {
  id: string;
  branch: 'engine' | 'tires' | 'collect' | 'meta';
  name: string;
  desc: (lvl: number) => string;
  maxLevel: number;
  cost: (lvl: number) => { bolts: number; ing?: Partial<Record<IngredientKind, number>> };
  // Prereq for unlocking this upgrade (other upgrade id, min level).
  requires?: { id: string; level: number };
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'topspeed', branch: 'engine', name: 'Turbo',
    desc: (l) => `+${l * 8}% top speed`,
    maxLevel: 6,
    cost: (l) => ({ bolts: 25 * (l + 1) ** 2, ing: l >= 2 ? { ember: 1 } : undefined }),
  },
  {
    id: 'accel', branch: 'engine', name: 'Nitrous',
    desc: (l) => `+${l * 10}% acceleration`,
    maxLevel: 5,
    cost: (l) => ({ bolts: 20 * (l + 1) ** 2, ing: l >= 3 ? { ember: 2 } : undefined }),
    requires: { id: 'topspeed', level: 1 },
  },
  {
    id: 'turn', branch: 'tires', name: 'Steering',
    desc: (l) => `+${l * 7}% turn response`,
    maxLevel: 5,
    cost: (l) => ({ bolts: 18 * (l + 1) ** 2, ing: l >= 2 ? { chrome: 1 } : undefined }),
  },
  {
    id: 'grip', branch: 'tires', name: 'Grip',
    desc: (l) => `Drift settles ${l * 12}% faster`,
    maxLevel: 5,
    cost: (l) => ({ bolts: 22 * (l + 1) ** 2, ing: l >= 2 ? { chrome: 2 } : undefined }),
    requires: { id: 'turn', level: 1 },
  },
  {
    id: 'magnet', branch: 'collect', name: 'Magnet',
    desc: (l) => `Pickup range +${l * 14}px`,
    maxLevel: 5,
    cost: (l) => ({ bolts: 30 * (l + 1) ** 2, ing: l >= 1 ? { neon: 1 } : undefined }),
  },
  {
    id: 'payout', branch: 'collect', name: 'Lucky',
    desc: (l) => `Bolts worth +${l * 50}%`,
    maxLevel: 4,
    cost: (l) => ({ bolts: 40 * (l + 1) ** 2, ing: l >= 1 ? { glitter: 1 } : undefined }),
    requires: { id: 'magnet', level: 1 },
  },
  {
    id: 'forgive', branch: 'meta', name: 'Bumper',
    desc: (l) => `Off-road tolerance +${l * 30}%`,
    maxLevel: 3,
    cost: (l) => ({ bolts: 60 * (l + 1) ** 2, ing: { prism: 1 } }),
  },
];

export function levelOf(save: SaveData, id: string): number {
  return save.upgrades[id] ?? 0;
}

export function canAfford(save: SaveData, up: UpgradeDef): boolean {
  const lvl = levelOf(save, up.id);
  if (lvl >= up.maxLevel) return false;
  if (up.requires && levelOf(save, up.requires.id) < up.requires.level) return false;
  const c = up.cost(lvl);
  if (save.bolts < c.bolts) return false;
  if (c.ing) {
    for (const k of Object.keys(c.ing) as IngredientKind[]) {
      if ((save.ingredients[k] ?? 0) < (c.ing[k] ?? 0)) return false;
    }
  }
  return true;
}

export function purchase(save: SaveData, up: UpgradeDef): boolean {
  if (!canAfford(save, up)) return false;
  const lvl = levelOf(save, up.id);
  const c = up.cost(lvl);
  save.bolts -= c.bolts;
  if (c.ing) {
    for (const k of Object.keys(c.ing) as IngredientKind[]) {
      save.ingredients[k] -= (c.ing[k] ?? 0);
    }
  }
  save.upgrades[up.id] = lvl + 1;
  return true;
}

export function applyUpgrades(base: CarStats, save: SaveData): CarStats {
  const lv = (id: string) => save.upgrades[id] ?? 0;
  return {
    topSpeed: base.topSpeed * (1 + 0.08 * lv('topspeed')),
    accel:    base.accel    * (1 + 0.10 * lv('accel')),
    turnRate: base.turnRate * (1 + 0.07 * lv('turn')),
    grip:     base.grip     * (1 + 0.12 * lv('grip')),
    drag:     base.drag,
  };
}
