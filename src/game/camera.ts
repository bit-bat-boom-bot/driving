// Pseudo-3D chase camera. The camera sits behind the car at `chase` units,
// `height` units off the ground, and looks straight along its own forward
// vector. The renderer projects world points using camera-local (x lateral,
// z forward) plus camera height to produce a tilted-perspective view.

import type { Car } from './car';

export class Camera {
  x = 0;
  y = 0;
  // World-space heading that the camera is facing. Smoothed toward the
  // car's heading so that sharp drifts don't whip the view around.
  angle = 0;

  // Perspective parameters (world units / fractional pixels):
  readonly chase = 80;           // chase distance behind the car
  readonly height = 58;          // camera height off the ground
  // Near plane sits a hair forward of the chase distance so the road
  // doesn't render past the car (otherwise the quad fills to off-screen-bottom).
  readonly nearPlane = 65;
  readonly farPlane = 900;       // bounds the visible road; tunes how far ahead curves reveal
  readonly horizonFrac = 0.45;   // horizon at this fraction of screen height
  readonly focalFrac = 0.7;      // focal length as fraction of screen width

  update(dt: number, car: Car) {
    // Position the camera chase-dist behind the car along its heading.
    const targetX = car.x - Math.cos(car.heading) * this.chase;
    const targetY = car.y - Math.sin(car.heading) * this.chase;
    const k = 1 - Math.exp(-7 * dt);
    this.x += (targetX - this.x) * k;
    this.y += (targetY - this.y) * k;

    // Smooth the camera angle toward the car's heading. Slower than the
    // position lerp so quick steering swings don't yank the view.
    let delta = car.heading - this.angle;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    this.angle += delta * (1 - Math.exp(-4 * dt));
  }
}
