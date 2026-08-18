/**
 * Directed Venice dunk cam. Not an orbit toy.
 * Hang height is locked to the rim so a ½gt² fall reads as a fall, not a hover.
 *
 * `worldScale` (default 1) pulls the camera back proportionally when the
 * loaded Meshy mural reads bigger than the regulation court, so idle/runway
 * framing does not look cramped in a bigger place. HANG and CONTACT ignore
 * it entirely — that framing is locked to the rim regardless of mural size.
 */

import { Vector3 } from '@babylonjs/core';
import type { DunkPhase } from '../../core/VeniceDunkLoop';

export function directedFraming(
  phase: DunkPhase,
  athlete: Vector3,
  rim: Vector3,
  outPos?: Vector3,
  outTarget?: Vector3,
  worldScale = 1
): { pos: Vector3; target: Vector3 } {
  const pos = outPos ?? new Vector3();
  const target = outTarget ?? new Vector3();
  const s = Math.max(1, worldScale);

  if (phase === 'IDLE' || phase === 'RUNWAY') {
    pos.set(athlete.x + 2.6 * s, 1.65, athlete.z - 3.6 * s);
    target.set(athlete.x, 1.25, athlete.z + 3.2);
    return { pos, target };
  }
  if (phase === 'GATHER' || phase === 'BLOWN') {
    pos.set(athlete.x + 2.15 * s, 1.5, athlete.z - 2.2 * s);
    target.set(athlete.x, 1.4, athlete.z + 2.4);
    return { pos, target };
  }
  if (phase === 'PLANT') {
    pos.set(1.8 * s, 1.35, athlete.z - 1.4 * s);
    target.set(0, 1.55, athlete.z + 1.6);
    return { pos, target };
  }
  if (phase === 'TAKEOFF') {
    pos.set(2.0 * s, athlete.y + 1.1, athlete.z - 1.8 * s);
    target.set(0, athlete.y + 1.4, athlete.z + 1.8);
    return { pos, target };
  }
  if (phase === 'HANG') {
    pos.set(2.55, rim.y - 0.08, athlete.z - 1.28);
    target.set(0.08, rim.y - 0.04, rim.z - 0.12);
    return { pos, target };
  }
  if (phase === 'CONTACT') {
    pos.set(1.15, rim.y + 0.15, rim.z - 1.55);
    target.set(0, rim.y, rim.z);
    return { pos, target };
  }
  pos.set(3.2 * s, 1.8, rim.z - 4.5 * s);
  target.set(0, 1.2, rim.z - 0.6);
  return { pos, target };
}
