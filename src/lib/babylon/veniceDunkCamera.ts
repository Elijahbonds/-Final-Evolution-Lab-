/**
 * Directed Venice dunk cam. Not an orbit toy.
 * Hang height is locked to the rim so a ½gt² fall reads as a fall, not a hover.
 */

import { Vector3 } from '@babylonjs/core';
import type { DunkPhase } from '../../core/VeniceDunkLoop';

export function directedFraming(
  phase: DunkPhase,
  athlete: Vector3,
  rim: Vector3
): { pos: Vector3; target: Vector3 } {
  if (phase === 'IDLE' || phase === 'RUNWAY') {
    return {
      pos: new Vector3(athlete.x + 2.6, 1.65, athlete.z - 3.6),
      target: new Vector3(athlete.x, 1.25, athlete.z + 3.2),
    };
  }
  if (phase === 'GATHER' || phase === 'BLOWN') {
    return {
      pos: new Vector3(athlete.x + 2.15, 1.5, athlete.z - 2.2),
      target: new Vector3(athlete.x, 1.4, athlete.z + 2.4),
    };
  }
  if (phase === 'PLANT') {
    return {
      pos: new Vector3(1.8, 1.35, athlete.z - 1.4),
      target: new Vector3(0, 1.55, athlete.z + 1.6),
    };
  }
  if (phase === 'TAKEOFF') {
    return {
      pos: new Vector3(2.0, athlete.y + 1.1, athlete.z - 1.8),
      target: new Vector3(0, athlete.y + 1.4, athlete.z + 1.8),
    };
  }
  if (phase === 'HANG') {
    return {
      pos: new Vector3(2.55, rim.y - 0.08, athlete.z - 1.28),
      target: new Vector3(0.08, rim.y - 0.04, rim.z - 0.12),
    };
  }
  if (phase === 'CONTACT') {
    return {
      pos: new Vector3(1.15, rim.y + 0.15, rim.z - 1.55),
      target: new Vector3(0, rim.y, rim.z),
    };
  }
  return {
    pos: new Vector3(3.2, 1.8, rim.z - 4.5),
    target: new Vector3(0, 1.2, rim.z - 0.6),
  };
}
