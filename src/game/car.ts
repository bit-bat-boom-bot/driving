// Arcade drift physics. Heading is the visual angle; velocity is decomposed
// into forward (along heading) and lateral (perpendicular). Grip pulls the
// lateral component back toward zero; lower grip = longer drifts.

export interface CarStats {
  topSpeed: number;     // px/s cap on forward speed
  accel: number;        // px/s^2 added forward per second
  turnRate: number;     // rad/s at full steer
  grip: number;         // 0..1 fraction of lateral vel killed per second
  drag: number;         // fraction of forward speed killed per second
}

export const BASE_STATS: CarStats = {
  topSpeed: 360,
  accel: 220,
  turnRate: 1.55,
  grip: 3.6,
  drag: 0.18,
};

export class Car {
  x = 0;
  y = 0;
  heading = -Math.PI / 2; // facing up
  fwdSpeed = 0;
  latSpeed = 0;
  alive = true;

  // -1..1 player steering input (raw); smoothed internally to filteredSteer
  steer = 0;
  private filteredSteer = 0;
  // 0..1 throttle multiplier (1 = always accelerating). Reduced if off-road.
  throttleMul = 1;

  constructor(public stats: CarStats) {}

  update(dt: number) {
    if (!this.alive) {
      // coast to a stop
      this.fwdSpeed *= Math.max(0, 1 - 2 * dt);
      this.latSpeed *= Math.max(0, 1 - 4 * dt);
    } else {
      // always accelerating
      this.fwdSpeed += this.stats.accel * this.throttleMul * dt;
      this.fwdSpeed -= this.stats.drag * this.fwdSpeed * dt;
      if (this.fwdSpeed > this.stats.topSpeed) this.fwdSpeed = this.stats.topSpeed;
      if (this.fwdSpeed < 0) this.fwdSpeed = 0;

      // Low-pass the raw input so taps don't whip the car. ~120ms time constant.
      const steerK = 1 - Math.exp(-8 * dt);
      this.filteredSteer += (clamp(this.steer, -1, 1) - this.filteredSteer) * steerK;

      // Steering scales with speed (no zero-speed pivots, more bite mid-range).
      const speedFactor = Math.min(1, this.fwdSpeed / (this.stats.topSpeed * 0.55));
      this.heading += this.filteredSteer * this.stats.turnRate * speedFactor * dt;

      // Steering induces lateral slip proportional to speed.
      const slipGain = 0.32;
      this.latSpeed += this.filteredSteer * this.fwdSpeed * slipGain * dt;
    }

    // grip kills lateral velocity over time
    const gripDecay = Math.exp(-this.stats.grip * dt);
    this.latSpeed *= gripDecay;

    // integrate position
    const cos = Math.cos(this.heading);
    const sin = Math.sin(this.heading);
    // forward direction
    const fx = cos, fy = sin;
    // lateral direction (right of heading)
    const lx = -sin, ly = cos;
    this.x += (fx * this.fwdSpeed + lx * this.latSpeed) * dt;
    this.y += (fy * this.fwdSpeed + ly * this.latSpeed) * dt;
  }

  // True magnitude of velocity vector.
  speed(): number {
    return Math.hypot(this.fwdSpeed, this.latSpeed);
  }

  // Angle between velocity vector and heading; used to render drift trails.
  slipAngle(): number {
    if (this.fwdSpeed < 1) return 0;
    return Math.atan2(this.latSpeed, this.fwdSpeed);
  }
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}
