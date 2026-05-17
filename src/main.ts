import { Game } from './game/game';
import { adService } from './ads/admob';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const game = new Game(canvas);
game.start();

// Fire-and-forget; ad init is async and the game must run regardless.
adService.init().catch((e) => console.warn('ads init failed', e));
