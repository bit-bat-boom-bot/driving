import type { Game } from '../game/game';
import { PICKUP_COLORS, IngredientKind } from '../game/pickups';
import { UNLOCKS } from '../data/unlocks';

interface Button { x: number; y: number; w: number; h: number; label: string; onClick: () => void }

export class GameOverScreen {
  private buttons: Button[] = [];

  constructor(private game: Game) {
    this.attachClick();
  }

  private attachClick() {
    this.game.canvas.addEventListener('click', (e) => {
      if (this.game.scene !== 'gameover') return;
      const r = this.game.canvas.getBoundingClientRect();
      const px = (e.clientX - r.left) * (this.game.canvas.width / r.width);
      const py = (e.clientY - r.top) * (this.game.canvas.height / r.height);
      for (const b of this.buttons) {
        if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
          b.onClick();
          return;
        }
      }
    });
  }

  onTap() {
    // Tap-anywhere-outside-buttons: restart.
    this.game.restart();
  }

  draw(c: CanvasRenderingContext2D, w: number, h: number) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = 'rgba(10,14,20,0.78)';
    c.fillRect(0, 0, w, h);

    const cx = w / 2;
    let y = h * 0.18;
    c.textAlign = 'center';
    c.fillStyle = '#e8eef5';
    c.font = '700 36px system-ui, sans-serif';
    c.fillText('RUN OVER', cx, y);
    y += 50;

    c.font = '600 22px system-ui, sans-serif';
    c.fillText(`${Math.floor(this.game.runDistance)} m`, cx, y);
    y += 30;
    c.font = '500 14px system-ui, sans-serif';
    c.fillStyle = '#9aa6b2';
    c.fillText(`best ${Math.floor(this.game.save.bestDistance)} m  ·  run ${this.game.save.runs}`, cx, y);
    y += 36;

    // earned line
    c.font = '600 18px system-ui, sans-serif';
    c.fillStyle = PICKUP_COLORS.bolt;
    c.fillText(`+${this.game.runBolts} ducks`, cx, y);
    y += 24;
    const earnedIng: string[] = [];
    for (const k of ['neon', 'chrome', 'glitter', 'ember', 'prism'] as IngredientKind[]) {
      const n = this.game.runIngredients[k];
      if (n > 0) earnedIng.push(`${n} ${k}`);
    }
    if (earnedIng.length) {
      c.font = '500 14px system-ui, sans-serif';
      c.fillStyle = '#cfd6dd';
      c.fillText(earnedIng.join(' · '), cx, y);
      y += 24;
    }

    // unlock toast
    const lastUnlock = this.lastUnlock();
    if (lastUnlock) {
      y += 16;
      c.fillStyle = '#ffd34d';
      c.font = '700 16px system-ui, sans-serif';
      c.fillText(`✦ UNLOCKED: ${lastUnlock} ✦`, cx, y);
      y += 26;
    }

    // buttons
    this.buttons = [];
    const bw = 220, bh = 56;
    const gap = 12;
    const layoutY = h - bh * 3 - gap * 2 - 32;
    this.button(c, 'TAP TO RESTART', cx - bw / 2, layoutY, bw, bh, () => this.game.restart(), '#33c275');
    this.button(c, 'UPGRADES',       cx - bw / 2, layoutY + bh + gap, bw, bh, () => this.game.openUpgrades(), '#2c3e57');
    this.button(c, 'GARAGE',         cx - bw / 2, layoutY + (bh + gap) * 2, bw, bh, () => this.game.openGarage(), '#2c3e57');

    c.textAlign = 'left';
  }

  private button(c: CanvasRenderingContext2D, label: string, x: number, y: number, w: number, h: number, onClick: () => void, color: string) {
    this.buttons.push({ x, y, w, h, label, onClick });
    c.fillStyle = color;
    roundRect(c, x, y, w, h, 12);
    c.fill();
    c.fillStyle = '#fff';
    c.font = '700 18px system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(label, x + w / 2, y + h / 2);
    c.textBaseline = 'alphabetic';
  }

  private lastUnlock(): string | null {
    // Show toast for the highest-index unlocked skin if it was unlocked this session.
    // Simple approximation: if we have more than 1 unlock and the most recent one's
    // check just became true, surface it.
    const s = this.game.save;
    for (let i = UNLOCKS.length - 1; i >= 0; i--) {
      const u = UNLOCKS[i];
      if (s.unlockedSkins.includes(u.skin) && s.unlockedSkins[s.unlockedSkins.length - 1] === u.skin && u.skin !== 'classic') {
        return u.name;
      }
    }
    return null;
  }
}

export function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
