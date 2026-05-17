// Swipe-to-steer. Touch anywhere; the horizontal distance from the touch's
// origin is the steering amount. Lift to release. Works with mouse for desktop.

export class SwipeInput {
  steer = 0;          // -1..1 output
  active = false;
  private originX = 0;
  // How many px of horizontal drag = full lock. Sized per screen below.
  private fullLockPx = 120;
  private pointerId: number | null = null;

  // Tap-to-restart hook: set by game when in game-over state.
  onTap: (() => void) | null = null;
  private touchedAt = 0;
  private movedDist = 0;

  attach(target: HTMLElement) {
    target.addEventListener('pointerdown', (e) => {
      if (this.pointerId !== null) return;
      this.pointerId = e.pointerId;
      target.setPointerCapture(e.pointerId);
      this.active = true;
      this.originX = e.clientX;
      this.fullLockPx = Math.max(140, Math.min(260, window.innerWidth * 0.32));
      this.touchedAt = performance.now();
      this.movedDist = 0;
    });
    const move = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      const dx = e.clientX - this.originX;
      this.movedDist = Math.max(this.movedDist, Math.abs(dx));
      this.steer = Math.max(-1, Math.min(1, dx / this.fullLockPx));
    };
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      const wasTap = this.movedDist < 8 && performance.now() - this.touchedAt < 250;
      this.pointerId = null;
      this.active = false;
      this.steer = 0;
      if (wasTap && this.onTap) this.onTap();
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);

    // Keyboard fallback so desktop dev doesn't require a mouse-drag.
    const keys = new Set<string>();
    window.addEventListener('keydown', (e) => {
      keys.add(e.key);
      if (e.key === ' ' && this.onTap) this.onTap();
      this.steer = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0)
                 + (keys.has('ArrowLeft')  || keys.has('a') ? -1 : 0);
    });
    window.addEventListener('keyup', (e) => {
      keys.delete(e.key);
      this.steer = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0)
                 + (keys.has('ArrowLeft')  || keys.has('a') ? -1 : 0);
    });
  }
}
