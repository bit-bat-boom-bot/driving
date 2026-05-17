// Smooth follow camera that leads the car based on its velocity, so the
// player sees more of where they're going than where they've been.

import type { Car } from './car';

export class Camera {
  x = 0;
  y = 0;
  angle = 0;       // smoothed road tangent angle (radians); used to rotate view
  zoom = 1;

  followLead = 0.45; // 0..1 how much we lead toward velocity vector

  update(dt: number, car: Car, roadTangent: { tx: number; ty: number }) {
    const leadDist = Math.min(220, car.fwdSpeed * 0.55);
    const targetX = car.x + Math.cos(car.heading) * leadDist * this.followLead;
    const targetY = car.y + Math.sin(car.heading) * leadDist * this.followLead;
    const k = 1 - Math.exp(-6 * dt);
    this.x += (targetX - this.x) * k;
    this.y += (targetY - this.y) * k;
    // Rotate camera to keep "up" pointed along the road (north-up driving feel).
    const targetAngle = Math.atan2(roadTangent.ty, roadTangent.tx) + Math.PI / 2;
    let delta = targetAngle - this.angle;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    this.angle += delta * (1 - Math.exp(-3 * dt));
  }
}
