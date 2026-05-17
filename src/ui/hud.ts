import type { Game } from '../game/game';
import { PICKUP_COLORS } from '../game/pickups';

export class Hud {
  constructor(private game: Game) {}

  draw(c: CanvasRenderingContext2D, w: number, _h: number) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.font = '600 22px system-ui, sans-serif';
    c.textBaseline = 'top';

    // distance (left)
    const dist = Math.floor(this.game.runDistance);
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.fillRect(12, 12, 160, 64);
    c.fillStyle = '#e8eef5';
    c.fillText(`${dist} m`, 24, 20);
    c.font = '500 12px system-ui, sans-serif';
    c.fillStyle = '#9aa6b2';
    c.fillText(`best ${Math.floor(this.game.save.bestDistance)} m`, 24, 50);

    // run currency (right)
    c.font = '600 18px system-ui, sans-serif';
    let y = 16;
    const x = w - 16;
    c.textAlign = 'right';
    c.fillStyle = PICKUP_COLORS.bolt;
    c.fillText(`${this.game.runBolts} 🦆`, x, y);
    y += 26;
    c.font = '500 14px system-ui, sans-serif';
    for (const k of ['neon', 'chrome', 'glitter', 'ember', 'prism'] as const) {
      const n = this.game.runIngredients[k];
      if (n > 0) {
        c.fillStyle = PICKUP_COLORS[k];
        c.fillText(`${n} ${k}`, x, y);
        y += 18;
      }
    }
    c.textAlign = 'left';

    // off-road warning
    if (this.game.scene === 'playing' && this.game.offRoadFor > 0.3) {
      const a = Math.min(1, this.game.offRoadFor / 1.6);
      c.fillStyle = `rgba(255,80,80,${0.3 + a * 0.5})`;
      c.font = '700 28px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillText('OFF ROAD', w / 2, 24);
      c.textAlign = 'left';
    }
  }
}
