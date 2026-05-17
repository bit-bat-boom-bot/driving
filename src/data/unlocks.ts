// Easter-egg car unlocks. Conditions are intentionally varied so each one
// feels like a discovery rather than just "spend money".

import type { SaveData } from '../store/save';
import type { CarSkin } from '../game/carsprites';

export interface UnlockDef {
  skin: CarSkin;
  name: string;
  hint: string;            // shown until unlocked
  check: (s: SaveData) => boolean;
}

export const UNLOCKS: UnlockDef[] = [
  { skin: 'racer',   name: 'Racer',   hint: 'Drive 5,000m in one run',         check: (s) => s.bestDistance >= 5000 },
  { skin: 'truck',   name: 'Hauler',  hint: 'Earn 1,000 bolts total',          check: (s) => s.lifetimeBolts >= 1000 },
  { skin: 'cop',     name: 'Patrol',  hint: 'Survive 25 runs',                 check: (s) => s.runs >= 25 },
  { skin: 'taxi',    name: 'Cabbie',  hint: 'Drive 25,000m total',             check: (s) => s.totalDistance >= 25000 },
  { skin: 'ufo',     name: 'Visitor', hint: 'Collect 3 prism crystals',        check: (s) => (s.ingredients.prism ?? 0) >= 3 },
  { skin: 'banana',  name: 'Bananas', hint: 'Collect 20 glitter & 20 neon',    check: (s) => s.ingredients.glitter >= 20 && s.ingredients.neon >= 20 },
  { skin: 'phantom', name: 'Phantom', hint: 'Max out any upgrade',             check: (s) => Object.values(s.upgrades).some((v) => v >= 5) },
];

export function checkUnlocks(save: SaveData) {
  for (const u of UNLOCKS) {
    if (!save.unlockedSkins.includes(u.skin) && u.check(save)) {
      save.unlockedSkins.push(u.skin);
    }
  }
}
