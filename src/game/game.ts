import { Car, BASE_STATS, CarStats } from './car';
import { SwipeInput } from './input';
import { World, ROAD_HALF_WIDTH } from './world';
import { Camera } from './camera';
import { PICKUP_COLORS, PICKUP_RADIUS, IngredientKind, PickupKind } from './pickups';
import { Renderer } from './render';
import { SaveData, load, save, newSave } from '../store/save';
import { applyUpgrades } from '../data/upgrades';
import { checkUnlocks } from '../data/unlocks';
import { Hud } from '../ui/hud';
import { UpgradeScreen } from '../ui/upgrades';
import { GarageScreen } from '../ui/garage';
import { GameOverScreen } from '../ui/gameover';
import { adService } from '../ads/admob';

export type Scene = 'playing' | 'gameover' | 'upgrades' | 'garage';

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  renderer: Renderer;
  input = new SwipeInput();
  car!: Car;
  world!: World;
  camera = new Camera();
  hud!: Hud;
  upgrades!: UpgradeScreen;
  garage!: GarageScreen;
  gameover!: GameOverScreen;

  save: SaveData;
  scene: Scene = 'playing';

  // run-scoped
  runBolts = 0;
  runIngredients: Record<IngredientKind, number> = blankIng();
  runDistance = 0;
  runStartedAt = 0;
  offRoadFor = 0;
  runsSinceAd = 0;
  pendingAd = false;

  private lastT = 0;
  private dprPixels = { w: 0, h: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2d context unavailable');
    this.ctx = ctx;
    this.renderer = new Renderer(ctx);
    this.save = load() ?? newSave();
    this.hud = new Hud(this);
    this.upgrades = new UpgradeScreen(this);
    this.garage = new GarageScreen(this);
    this.gameover = new GameOverScreen(this);
    this.input.attach(canvas);
    this.input.onTap = () => this.handleTap();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.startRun();
  }

  private resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.floor(this.canvas.clientWidth * dpr);
    const h = Math.floor(this.canvas.clientHeight * dpr);
    if (w !== this.dprPixels.w || h !== this.dprPixels.h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.dprPixels = { w, h };
      this.renderer.setSize(w, h, dpr);
    }
  }

  startRun() {
    const stats: CarStats = applyUpgrades({ ...BASE_STATS }, this.save);
    this.car = new Car(stats);
    this.world = new World((Math.random() * 1e9) | 0);
    const start = this.world.chunks[0].samples[0];
    this.car.x = start.x;
    this.car.y = start.y;
    this.car.heading = Math.atan2(start.ty, start.tx);
    this.runBolts = 0;
    this.runIngredients = blankIng();
    this.runDistance = 0;
    this.runStartedAt = performance.now();
    this.offRoadFor = 0;
    this.scene = 'playing';
  }

  private handleTap() {
    if (this.scene === 'gameover') {
      this.gameover.onTap();
    } else if (this.scene === 'upgrades') {
      // taps within upgrade screen are handled by its own pointer routing
    }
  }

  loop = (t: number) => {
    const dt = Math.min(0.05, (t - this.lastT) / 1000 || 0);
    this.lastT = t;

    if (this.scene === 'playing') this.updatePlaying(dt);
    this.render();
    requestAnimationFrame(this.loop);
  };

  start() {
    requestAnimationFrame((t) => {
      this.lastT = t;
      requestAnimationFrame(this.loop);
    });
  }

  private updatePlaying(dt: number) {
    this.car.steer = this.input.steer;
    this.world.ensureAhead(this.car.x, this.car.y, 4);

    // road detection
    const cp = this.world.closestOnRoad(this.car.x, this.car.y);
    const onRoad = Math.abs(cp.offset) < ROAD_HALF_WIDTH;
    if (onRoad) {
      this.car.throttleMul = 1;
      this.offRoadFor = 0;
    } else {
      // sand penalty
      this.car.throttleMul = 0.45;
      this.offRoadFor += dt;
      // bleed speed faster off-road
      this.car.fwdSpeed *= Math.max(0, 1 - 0.7 * dt);
    }

    this.car.update(dt);

    // pickup collection
    const pickRadius = 22 + (this.save.upgrades.magnet ?? 0) * 14;
    for (const chunk of this.world.chunks) {
      for (const p of chunk.pickups) {
        if (p.taken) continue;
        const dx = p.x - this.car.x, dy = p.y - this.car.y;
        if (dx * dx + dy * dy < pickRadius * pickRadius) {
          p.taken = true;
          this.collect(p.kind);
        }
      }
    }

    this.camera.update(dt, this.car, { tx: cp.tx, ty: cp.ty });
    this.runDistance = this.world.distanceAlong(this.car.x, this.car.y);

    // die condition: too far off road for too long
    if (this.offRoadFor > 1.6) this.endRun('crashed');
  }

  private collect(kind: PickupKind) {
    const mul = 1 + (this.save.upgrades.payout ?? 0) * 0.5;
    if (kind === 'bolt') this.runBolts += Math.round(1 * mul);
    else this.runIngredients[kind] += 1;
  }

  endRun(_reason: string) {
    if (this.scene !== 'playing') return;
    this.car.alive = false;
    this.scene = 'gameover';
    // bank currency
    this.save.bolts += this.runBolts;
    this.save.lifetimeBolts += this.runBolts;
    for (const k of Object.keys(this.runIngredients) as IngredientKind[]) {
      this.save.ingredients[k] = (this.save.ingredients[k] ?? 0) + this.runIngredients[k];
    }
    this.save.runs += 1;
    this.save.bestDistance = Math.max(this.save.bestDistance, this.runDistance);
    this.save.totalDistance += this.runDistance;
    checkUnlocks(this.save);
    save(this.save);
    this.runsSinceAd += 1;
    // Show an interstitial every 3rd run.
    if (this.runsSinceAd >= 3) {
      this.pendingAd = true;
      this.runsSinceAd = 0;
    }
  }

  // Called by GameOverScreen when player taps "Restart" (or anywhere).
  async restart() {
    if (this.pendingAd) {
      this.pendingAd = false;
      try { await adService.showInterstitial(); } catch { /* ignore */ }
    }
    this.startRun();
  }

  openUpgrades() { this.scene = 'upgrades'; }
  openGarage() { this.scene = 'garage'; }
  closeOverlay() { this.scene = 'gameover'; }

  private render() {
    this.renderer.beginFrame();
    if (this.scene === 'playing' || this.scene === 'gameover') {
      this.renderer.drawWorld(this.world, this.car, this.camera, this.save.equippedCar);
      this.hud.draw(this.ctx, this.dprPixels.w, this.dprPixels.h);
      if (this.scene === 'gameover') {
        this.gameover.draw(this.ctx, this.dprPixels.w, this.dprPixels.h);
      }
    } else if (this.scene === 'upgrades') {
      this.renderer.drawWorld(this.world, this.car, this.camera, this.save.equippedCar);
      this.upgrades.draw(this.ctx, this.dprPixels.w, this.dprPixels.h);
    } else if (this.scene === 'garage') {
      this.renderer.drawWorld(this.world, this.car, this.camera, this.save.equippedCar);
      this.garage.draw(this.ctx, this.dprPixels.w, this.dprPixels.h);
    }
  }
}

function blankIng(): Record<IngredientKind, number> {
  return { neon: 0, chrome: 0, glitter: 0, ember: 0, prism: 0 };
}

export { PICKUP_COLORS, PICKUP_RADIUS };
