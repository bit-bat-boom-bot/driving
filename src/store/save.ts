// Persisted save. On the web we use localStorage; the Capacitor build can
// swap this for @capacitor/preferences without changing the API.

import type { IngredientKind } from '../game/pickups';
import type { CarSkin } from '../game/carsprites';

export interface SaveData {
  bolts: number;
  lifetimeBolts: number;            // never decremented; for unlock conditions
  ingredients: Record<IngredientKind, number>;
  upgrades: Record<string, number>; // upgrade id -> level
  unlockedSkins: CarSkin[];
  equippedCar: CarSkin;
  runs: number;
  bestDistance: number;
  totalDistance: number;
  v: number;                        // schema version
}

const KEY = 'driftrunner.save.v1';
const SCHEMA = 1;

export function newSave(): SaveData {
  return {
    bolts: 0,
    lifetimeBolts: 0,
    ingredients: { neon: 0, chrome: 0, glitter: 0, ember: 0, prism: 0 },
    upgrades: {},
    unlockedSkins: ['classic'],
    equippedCar: 'classic',
    runs: 0,
    bestDistance: 0,
    totalDistance: 0,
    v: SCHEMA,
  };
}

export function load(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw) as SaveData;
    if (obj.v !== SCHEMA) return null;
    return obj;
  } catch {
    return null;
  }
}

export function save(s: SaveData) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* quota */ }
}
