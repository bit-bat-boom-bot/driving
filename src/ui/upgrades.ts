import type { Game } from '../game/game';
import { UPGRADES, levelOf, canAfford, purchase, UpgradeDef } from '../data/upgrades';
import { PICKUP_COLORS, IngredientKind } from '../game/pickups';
import { save as saveSave } from '../store/save';
import { roundRect } from './gameover';

interface Hit { x: number; y: number; w: number; h: number; onClick: () => void }

export class UpgradeScreen {
  private hits: Hit[] = [];

  constructor(private game: Game) {
    this.game.canvas.addEventListener('click', (e) => {
      if (this.game.scene !== 'upgrades') return;
      const r = this.game.canvas.getBoundingClientRect();
      const px = (e.clientX - r.left) * (this.game.canvas.width / r.width);
      const py = (e.clientY - r.top) * (this.game.canvas.height / r.height);
      for (const hit of this.hits) {
        if (px >= hit.x && px <= hit.x + hit.w && py >= hit.y && py <= hit.y + hit.h) {
          hit.onClick();
          return;
        }
      }
    });
  }

  draw(c: CanvasRenderingContext2D, w: number, h: number) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = 'rgba(8,12,18,0.92)';
    c.fillRect(0, 0, w, h);
    this.hits = [];

    // header
    c.fillStyle = '#e8eef5';
    c.font = '700 26px system-ui, sans-serif';
    c.textAlign = 'center';
    c.fillText('UPGRADES', w / 2, 44);

    // wallet
    c.font = '600 16px system-ui, sans-serif';
    c.textAlign = 'left';
    let wx = 24, wy = 84;
    c.fillStyle = PICKUP_COLORS.bolt;
    c.fillText(`${this.game.save.bolts} ducks`, wx, wy);
    wx += 80;
    for (const k of ['neon', 'chrome', 'glitter', 'ember', 'prism'] as IngredientKind[]) {
      const n = this.game.save.ingredients[k];
      if (n > 0) {
        c.fillStyle = PICKUP_COLORS[k];
        c.fillText(`${n} ${k.slice(0, 3)}`, wx, wy);
        wx += 70;
      }
    }

    // grid of upgrade cards
    const cols = 2;
    const margin = 16;
    const top = 110;
    const cardW = (w - margin * (cols + 1)) / cols;
    const cardH = 96;
    UPGRADES.forEach((u, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = margin + col * (cardW + margin);
      const y = top + row * (cardH + margin);
      this.drawCard(c, u, x, y, cardW, cardH);
    });

    // back button
    const bw = 220, bh = 56;
    const bx = (w - bw) / 2;
    const by = h - bh - 24;
    c.fillStyle = '#2c3e57';
    roundRect(c, bx, by, bw, bh, 12);
    c.fill();
    c.fillStyle = '#fff';
    c.font = '700 18px system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('BACK', bx + bw / 2, by + bh / 2);
    c.textBaseline = 'alphabetic';
    this.hits.push({ x: bx, y: by, w: bw, h: bh, onClick: () => this.game.closeOverlay() });
  }

  private drawCard(c: CanvasRenderingContext2D, u: UpgradeDef, x: number, y: number, w: number, h: number) {
    const lvl = levelOf(this.game.save, u.id);
    const maxed = lvl >= u.maxLevel;
    const locked = u.requires ? levelOf(this.game.save, u.requires.id) < u.requires.level : false;
    const afford = !locked && !maxed && canAfford(this.game.save, u);

    c.fillStyle = locked ? '#181f2b' : '#1a2230';
    roundRect(c, x, y, w, h, 10);
    c.fill();
    c.strokeStyle = afford ? '#33c275' : '#2a3548';
    c.lineWidth = 2;
    c.stroke();

    c.textAlign = 'left';
    c.fillStyle = locked ? '#5a6776' : '#e8eef5';
    c.font = '700 16px system-ui, sans-serif';
    c.fillText(u.name, x + 12, y + 22);

    c.font = '500 12px system-ui, sans-serif';
    c.fillStyle = '#9aa6b2';
    if (locked) {
      const req = UPGRADES.find((up) => up.id === u.requires!.id);
      c.fillText(`needs ${req?.name ?? u.requires!.id} L${u.requires!.level}`, x + 12, y + 40);
    } else {
      c.fillText(u.desc(Math.min(lvl + 1, u.maxLevel)), x + 12, y + 40);
    }

    // level pips
    const pipY = y + 56;
    for (let i = 0; i < u.maxLevel; i++) {
      const px = x + 12 + i * 14;
      c.fillStyle = i < lvl ? '#33c275' : '#2a3548';
      c.fillRect(px, pipY, 10, 6);
    }

    // cost / button
    if (!maxed && !locked) {
      const c2 = u.cost(lvl);
      c.font = '600 12px system-ui, sans-serif';
      c.fillStyle = PICKUP_COLORS.bolt;
      const costText = `${c2.bolts} ducks`;
      c.textAlign = 'right';
      c.fillText(costText, x + w - 12, y + 22);
      if (c2.ing) {
        let cy2 = y + 38;
        for (const k of Object.keys(c2.ing) as IngredientKind[]) {
          c.fillStyle = PICKUP_COLORS[k];
          c.fillText(`${c2.ing[k]} ${k.slice(0, 3)}`, x + w - 12, cy2);
          cy2 += 14;
        }
      }
      // tap card to buy
      this.hits.push({
        x, y, w, h,
        onClick: () => {
          if (purchase(this.game.save, u)) saveSave(this.game.save);
        },
      });
    } else if (maxed) {
      c.font = '700 12px system-ui, sans-serif';
      c.fillStyle = '#ffd34d';
      c.textAlign = 'right';
      c.fillText('MAX', x + w - 12, y + 22);
    }
    c.textAlign = 'left';
  }
}
