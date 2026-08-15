/**
 * NBA Live 07/08 Era Momentum & Weight Physics Core
 * Kinematic velocity model with realistic inertia, plant-and-cut momentum bleed,
 * turn-rate limiting, and skilled crossover burst mechanics.
 */

export interface MovementTuning {
  // Speed bounds (m/s)
  walkSpeed: number;
  jogSpeed: number;
  sprintSpeed: number;

  // Inertial acceleration & deceleration ramps
  accelRampTime: number;      // Seconds to reach top speed (~0.45s - 0.50s)
  sprintAccel: number;        // Explicit accel (m/s^2)
  decelDrag: number;          // Braking decel (m/s^2) - stronger than accel (~0.2s stop)
  idleThreshold: number;      // Velocity below which player snaps to idle (m/s)

  // Turn rate and directional inertia
  maxTurnRateRadPerSec: number; // Max yaw slew rate (e.g. ~3.14 rad/s = 180 deg/s => ~3 deg/frame @ 60fps)

  // Plant-and-cut penalties
  cutAngleThresholdRad: number; // Angle deviation (e.g. > 90 deg = PI/2) triggering plant
  sprintCutRetention: number;   // Momentum kept on hard cut from full sprint (~0.45)
  jogCutRetention: number;      // Momentum kept on hard cut from jog (~0.63)
  plantRecoveryDuration: number;// Seconds player is locked in plant transition (~0.12s)

  // Skilled cut (crossover / quickstrike)
  skilledCutSpeedBoost: number; // Speed multiplier on execution (~1.15x)
  skilledCutCooldown: number;   // Minimum seconds between skilled cuts
}

export const GUARD_TUNING: MovementTuning = {
  walkSpeed: 3.2,
  jogSpeed: 5.6,
  sprintSpeed: 8.8,
  accelRampTime: 0.46,
  sprintAccel: 19.2,          // 8.8 / 0.46 ≈ 19.13 m/s^2
  decelDrag: 38.5,            // Stops 8.8 m/s in ~0.23s
  idleThreshold: 0.15,
  maxTurnRateRadPerSec: 3.25, // ~3.1° per frame at 60Hz
  cutAngleThresholdRad: Math.PI / 2.2, // ~81 degrees
  sprintCutRetention: 0.45,
  jogCutRetention: 0.63,
  plantRecoveryDuration: 0.12,
  skilledCutSpeedBoost: 1.18,
  skilledCutCooldown: 0.75,
};

export const BIG_TUNING: MovementTuning = {
  walkSpeed: 2.8,
  jogSpeed: 4.8,
  sprintSpeed: 7.4,
  accelRampTime: 0.58,
  sprintAccel: 13.0,
  decelDrag: 32.0,
  idleThreshold: 0.18,
  maxTurnRateRadPerSec: 2.4, // Slower turning arc for bigs
  cutAngleThresholdRad: Math.PI / 2.5,
  sprintCutRetention: 0.38,
  jogCutRetention: 0.55,
  plantRecoveryDuration: 0.18,
  skilledCutSpeedBoost: 1.10,
  skilledCutCooldown: 1.1,
};

export interface MovementOutput {
  velX: number;
  velZ: number;
  speed: number;
  speed01: number;       // Normalized against sprintSpeed (0.0 to 1.0)
  facingYaw: number;     // Current facing angle in radians
  isPlanting: boolean;   // True when weight transfer/plant step is occurring
  isSprinting: boolean;  // True when sprint is active and moving
  isSkilledCutting: boolean; // True when a crossover bypass burst just fired
}

export class CourtMovement {
  private tuning: MovementTuning;

  // Velocity state
  public velX = 0;
  public velZ = 0;
  public facingYaw = 0;

  // Internal state
  private plantTimer = 0;
  private skilledCutTimer = 0;
  private lastSkilledCutTime = -999;
  private isPlanting = false;
  private isSkilledCutting = false;

  constructor(tuning: MovementTuning = GUARD_TUNING, initialYaw = 0) {
    this.tuning = tuning;
    this.facingYaw = initialYaw;
  }

  public setTuning(tuning: MovementTuning): void {
    this.tuning = tuning;
  }

  public reset(yaw = 0): void {
    this.velX = 0;
    this.velZ = 0;
    this.facingYaw = yaw;
    this.plantTimer = 0;
    this.skilledCutTimer = 0;
    this.isPlanting = false;
    this.isSkilledCutting = false;
  }

  /**
   * Main per-frame update loop
   * @param dt Delta time in seconds (frame-rate independent)
   * @param stickX Input X [-1.0, 1.0]
   * @param stickY Input Y (Z forward/back) [-1.0, 1.0]
   * @param sprint Sprint button held
   * @param skilledCutTrigger Skilled cut/crossover button pressed this frame
   */
  public update(
    dt: number,
    stickX: number,
    stickY: number,
    sprint = false,
    skilledCutTrigger = false
  ): MovementOutput {
    if (dt <= 0) {
      const speed = Math.hypot(this.velX, this.velZ);
      return {
        velX: this.velX,
        velZ: this.velZ,
        speed,
        speed01: speed / this.tuning.sprintSpeed,
        facingYaw: this.facingYaw,
        isPlanting: this.isPlanting,
        isSprinting: sprint && speed > this.tuning.jogSpeed,
        isSkilledCutting: this.isSkilledCutting,
      };
    }

    // Process timers
    if (this.plantTimer > 0) {
      this.plantTimer -= dt;
      if (this.plantTimer <= 0) {
        this.isPlanting = false;
      }
    }

    if (this.skilledCutTimer > 0) {
      this.skilledCutTimer -= dt;
      if (this.skilledCutTimer <= 0) {
        this.isSkilledCutting = false;
      }
    }

    const inputMag = Math.hypot(stickX, stickY);
    const hasInput = inputMag > 0.08;
    const currentSpeed = Math.hypot(this.velX, this.velZ);

    // 1. Skilled Crossover / Quickstrike bypass check
    if (skilledCutTrigger && hasInput && (this.plantTimer <= 0) && (performanceNowSeconds() - this.lastSkilledCutTime > this.tuning.skilledCutCooldown)) {
      this.isSkilledCutting = true;
      this.skilledCutTimer = 0.22;
      this.lastSkilledCutTime = performanceNowSeconds();
      this.isPlanting = false;
      this.plantTimer = 0;

      // Instant target alignment + speed burst
      const targetYaw = Math.atan2(stickX, stickY);
      this.facingYaw = targetYaw;
      const boostSpeed = Math.min(
        this.tuning.sprintSpeed * this.tuning.skilledCutSpeedBoost,
        Math.max(currentSpeed, this.tuning.jogSpeed) * this.tuning.skilledCutSpeedBoost
      );
      this.velX = Math.sin(targetYaw) * boostSpeed;
      this.velZ = Math.cos(targetYaw) * boostSpeed;

      const speed = Math.hypot(this.velX, this.velZ);
      return {
        velX: this.velX,
        velZ: this.velZ,
        speed,
        speed01: Math.min(1.0, speed / this.tuning.sprintSpeed),
        facingYaw: this.facingYaw,
        isPlanting: false,
        isSprinting: true,
        isSkilledCutting: true,
      };
    }

    // 2. Input Direction & Plant-and-Cut Detection
    if (hasInput) {
      const normInputX = stickX / inputMag;
      const normInputY = stickY / inputMag;
      const desiredYaw = Math.atan2(normInputX, normInputY);

      // Check for hard directional cut if currently moving with momentum
      if (currentSpeed > this.tuning.walkSpeed * 0.9 && !this.isSkilledCutting) {
        const velDirX = this.velX / currentSpeed;
        const velDirZ = this.velZ / currentSpeed;
        const currentVelYaw = Math.atan2(velDirX, velDirZ);

        // Angular difference between current motion and requested input
        let angleDiff = Math.abs(desiredYaw - currentVelYaw);
        while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - 2 * Math.PI);

        // If sharp cut threshold reached, trigger plant-and-cut penalty
        if (angleDiff > this.tuning.cutAngleThresholdRad && this.plantTimer <= 0) {
          this.isPlanting = true;
          this.plantTimer = this.tuning.plantRecoveryDuration;

          // Speed-scaled momentum retention (Sprint keeps ~45%, Jog keeps ~63%)
          const speedFraction = Math.min(1.0, currentSpeed / this.tuning.sprintSpeed);
          const retention = lerp(this.tuning.jogCutRetention, this.tuning.sprintCutRetention, speedFraction);
          const retainedSpeed = currentSpeed * retention;

          this.velX = velDirX * retainedSpeed;
          this.velZ = velDirZ * retainedSpeed;
        }
      }

      // 3. Turn Rate Capping (smooth angular slew, prevents instant twitch turning)
      let yawDiff = desiredYaw - this.facingYaw;
      while (yawDiff < -Math.PI) yawDiff += 2 * Math.PI;
      while (yawDiff > Math.PI) yawDiff -= 2 * Math.PI;

      const maxTurnThisFrame = this.tuning.maxTurnRateRadPerSec * dt;
      const turnAmount = clamp(yawDiff, -maxTurnThisFrame, maxTurnThisFrame);
      this.facingYaw += turnAmount;

      // 4. Acceleration Ramp toward target speed along facing direction
      const targetMaxSpeed = sprint ? this.tuning.sprintSpeed : (inputMag > 0.7 ? this.tuning.jogSpeed : this.tuning.walkSpeed);
      const targetSpeed = targetMaxSpeed * inputMag;

      const desiredVelX = Math.sin(this.facingYaw) * targetSpeed;
      const desiredVelZ = Math.cos(this.facingYaw) * targetSpeed;

      const accelStep = this.tuning.sprintAccel * dt;
      this.velX = moveTowards(this.velX, desiredVelX, accelStep);
      this.velZ = moveTowards(this.velZ, desiredVelZ, accelStep);
    } else {
      // 5. Deceleration Drag (stronger braking than acceleration)
      const decelStep = this.tuning.decelDrag * dt;
      this.velX = moveTowards(this.velX, 0, decelStep);
      this.velZ = moveTowards(this.velZ, 0, decelStep);

      if (Math.hypot(this.velX, this.velZ) < this.tuning.idleThreshold) {
        this.velX = 0;
        this.velZ = 0;
        this.isPlanting = false;
      }
    }

    const finalSpeed = Math.hypot(this.velX, this.velZ);
    const speed01 = Math.min(1.0, finalSpeed / this.tuning.sprintSpeed);

    return {
      velX: this.velX,
      velZ: this.velZ,
      speed: finalSpeed,
      speed01,
      facingYaw: this.facingYaw,
      isPlanting: this.isPlanting,
      isSprinting: sprint && finalSpeed > this.tuning.jogSpeed,
      isSkilledCutting: this.isSkilledCutting,
    };
  }
}

// Helpers
function moveTowards(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) {
    return target;
  }
  return current + Math.sign(target - current) * maxDelta;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

function performanceNowSeconds(): number {
  if (typeof performance !== 'undefined') {
    return performance.now() / 1000;
  }
  return Date.now() / 1000;
}
