import type { Game } from '../game/game';
import { UNLOCKS } from '../data/unlocks';
import { ALL_SKINS, CarSkin, drawCarSprite } from '../game/carsprites';
import { save as saveSave } from '../store/save';
import { roundRect } from './gameover';

interface Hit { x: number; y: number; w: number; h: number; onClick: () => void }

export class GarageScreen {
  private hits: Hit[] = [];

  constructor(private game: Game) {
    this.game.canvas.addEventListener('click', (e) => {
      if (this.game.scene !== 'garage') return;
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

    c.fillStyle = '#e8eef5';
    c.font = '700 26px system-ui, sans-serif';
    c.textAlign = 'center';
    c.fillText('GARAGE', w / 2, 44);

    c.font = '500 13px system-ui, sans-serif';
    c.fillStyle = '#9aa6b2';
    c.fillText(`${this.game.save.unlockedSkins.length} / ${ALL_SKINS.length} cars`, w / 2, 68);

    const cols = 2;
    const margin = 16;
    const top = 100;
    const cardW = (w - margin * (cols + 1)) / cols;
    const cardH = 130;

    ALL_SKINS.forEach((skin, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = margin + col * (cardW + margin);
      const y = top + row * (cardH + margin);
      this.drawCard(c, skin, x, y, cardW, cardH);
    });

    const bw = 220, bh = 56;
    const bx = (w - bw) / 2;
    const by = h - bh - 24;
    c.fillStyle = '#2c3e57';
    roundRect(c, bx, by, bw, bh, 12);
    c.fill();
    c.fillStyle = '#fff';
    c.font = '700 18px system-ui, sans-serif';
    c.textBaseline = 'middle';
    c.fillText('BACK', bx + bw / 2, by + bh / 2);
    c.textBaseline = 'alphabetic';
    this.hits.push({ x: bx, y: by, w: bw, h: bh, onClick: () => this.game.closeOverlay() });
  }

  private drawCard(c: CanvasRenderingContext2D, skin: CarSkin, x: number, y: number, w: number, h: number) {
    const unlocked = this.game.save.unlockedSkins.includes(skin);
    const equipped = this.game.save.equippedCar === skin;
    const def = UNLOCKS.find((u) => u.skin === skin);
    const name = skin === 'classic' ? 'Classic' : def?.name ?? skin;

    c.fillStyle = unlocked ? '#1a2230' : '#141a23';
    roundRect(c, x, y, w, h, 10);
    c.fill();
    c.strokeStyle = equipped ? '#ffd34d' : '#2a3548';
    c.lineWidth = equipped ? 3 : 1.5;
    c.stroke();

    // car preview (or silhouette)
    const cx = x + 60, cy = y + h / 2;
    c.save();
    c.translate(cx, cy);
    if (unlocked) {
      drawCarSprite(c, 0, 0, -Math.PI / 2, skin);
    } else {
      // silhouette
      c.globalAlpha = 0.25;
      drawCarSprite(c, 0, 0, -Math.PI / 2, skin);
      c.globalAlpha = 1;
      c.fillStyle = '#9aa6b2';
      c.font = '700 32px system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('?', 0, 2);
    }
    c.restore();

    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    c.fillStyle = unlocked ? '#e8eef5' : '#5a6776';
    c.font = '700 16px system-ui, sans-serif';
    c.fillText(name, x + 120, y + 30);

    c.font = '500 12px system-ui, sans-serif';
    c.fillStyle = '#9aa6b2';
    const hint = unlocked ? (equipped ? 'Equipped' : 'Tap to equip') : (def?.hint ?? '???');
    wrapText(c, hint, x + 120, y + 52, w - 132, 16);

    if (unlocked) {
      this.hits.push({
        x, y, w, h,
        onClick: () => {
          this.game.save.equippedCar = skin;
          saveSave(this.game.save);
        },
      });
    }
  }
}

function wrapText(c: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (c.measureText(test).width > maxW && line) {
      c.fillText(line, x, y);
      y += lh;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) c.fillText(line, x, y);
}
