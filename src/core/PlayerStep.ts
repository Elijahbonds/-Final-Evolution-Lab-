/**
 * PlayerStep: Integrates CourtMovement kinematics with Babylon.js TransformNode/Meshes,
 * enforces court boundary constraints, and extracts animation driving channels.
 */

import { CourtMovement, MovementTuning, GUARD_TUNING, MovementOutput } from './CourtMovement';

export interface CourtBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const VENICE_COURT_BOUNDS: CourtBounds = {
  minX: -6.5,
  maxX: 6.5,
  minZ: -12.5,
  maxZ: 12.5,
};

export interface TransformTarget {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

export class PlayerStep {
  public movement: CourtMovement;
  public bounds: CourtBounds;
  public lastOutput: MovementOutput;

  constructor(
    tuning: MovementTuning = GUARD_TUNING, 
    bounds: CourtBounds = VENICE_COURT_BOUNDS,
    initialYaw = 0
  ) {
    this.movement = new CourtMovement(tuning, initialYaw);
    this.bounds = bounds;
    this.lastOutput = {
      velX: 0,
      velZ: 0,
      speed: 0,
      speed01: 0,
      facingYaw: initialYaw,
      isPlanting: false,
      isSprinting: false,
      isSkilledCutting: false,
    };
  }

  /**
   * Performs the per-frame integration step
   * @param node Target TransformNode or mesh to move and rotate
   * @param dt Frame delta time in seconds
   * @param stickX Input horizontal [-1, 1]
   * @param stickY Input vertical/forward [-1, 1]
   * @param sprint Sprint modifier held
   * @param skilledCut Skilled cut trigger
   */
  public step(
    node: TransformTarget,
    dt: number,
    stickX: number,
    stickY: number,
    sprint = false,
    skilledCut = false
  ): MovementOutput {
    // 1. Compute kinematic velocity and weight state
    const output = this.movement.update(dt, stickX, stickY, sprint, skilledCut);
    this.lastOutput = output;

    // 2. Integrate position
    node.position.x += output.velX * dt;
    node.position.z += output.velZ * dt;

    // 3. Enforce court boundaries with restitution bleed
    if (node.position.x < this.bounds.minX) {
      node.position.x = this.bounds.minX;
      this.movement.velX = Math.max(0, this.movement.velX * 0.2);
    } else if (node.position.x > this.bounds.maxX) {
      node.position.x = this.bounds.maxX;
      this.movement.velX = Math.min(0, this.movement.velX * 0.2);
    }

    if (node.position.z < this.bounds.minZ) {
      node.position.z = this.bounds.minZ;
      this.movement.velZ = Math.max(0, this.movement.velZ * 0.2);
    } else if (node.position.z > this.bounds.maxZ) {
      node.position.z = this.bounds.maxZ;
      this.movement.velZ = Math.min(0, this.movement.velZ * 0.2);
    }

    // 4. Set facing orientation (smooth yaw rotation)
    node.rotation.y = output.facingYaw;

    return output;
  }

  public setPosition(node: TransformTarget, x: number, z: number, yaw = 0): void {
    node.position.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, x));
    node.position.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, z));
    node.rotation.y = yaw;
    this.movement.reset(yaw);
  }
}
