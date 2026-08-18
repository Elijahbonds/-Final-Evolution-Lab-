/**
 * Mixamo-local slam maps. Same-sign arm Z raises both hands from this
 * Soldier bind (z=-1.2, shoulder z=-0.55 → hands at y≈2.02, head at 1.56).
 * Mirrored world-Z / 180° spine yaw does not.
 */

export type HangStyle = 'REVERSE_TWO_HAND' | 'WINDMILL' | 'TOMAHAWK' | '360_SPIN';

export interface BoneSpin {
  x: number;
  y: number;
  z: number;
}

export type SlamMap = Record<string, BoneSpin>;

export const REVERSE_TWO_HAND_SLAM: SlamMap = {
  Spine: { x: -0.14, y: 0, z: 0 },
  Spine1: { x: -0.08, y: 0, z: 0 },
  Neck: { x: 0.22, y: 0, z: 0 },
  Head: { x: 0.16, y: 0, z: 0 },
  LeftShoulder: { x: 0, y: 0, z: -0.55 },
  RightShoulder: { x: 0, y: 0, z: -0.55 },
  LeftArm: { x: 0, y: 0, z: -1.2 },
  RightArm: { x: 0, y: 0, z: -1.2 },
  LeftForeArm: { x: -0.22, y: 0, z: 0 },
  RightForeArm: { x: -0.22, y: 0, z: 0 },
  LeftUpLeg: { x: 1.02, y: 0.1, z: 0 },
  RightUpLeg: { x: 1.08, y: -0.1, z: 0 },
  LeftLeg: { x: 1.12, y: 0, z: 0 },
  RightLeg: { x: 1.18, y: 0, z: 0 },
};

export const WINDMILL_SLAM: SlamMap = {
  Spine: { x: 0.06, y: 0.38, z: 0 },
  Spine1: { x: 0.04, y: 0.18, z: 0 },
  Neck: { x: 0.1, y: -0.16, z: 0 },
  LeftShoulder: { x: 0, y: 0.45, z: 0.15 },
  RightShoulder: { x: 0, y: 0, z: -0.55 },
  LeftArm: { x: 0.35, y: 1.15, z: 0.85 },
  RightArm: { x: 0, y: 0, z: -1.2 },
  LeftForeArm: { x: -0.2, y: 0.4, z: 0 },
  RightForeArm: { x: -0.22, y: 0, z: 0 },
  LeftUpLeg: { x: 0.28, y: 0.16, z: 0 },
  RightUpLeg: { x: 1.15, y: -0.18, z: 0 },
  LeftLeg: { x: 0.3, y: 0, z: 0 },
  RightLeg: { x: 1.05, y: 0, z: 0 },
};

export const TOMAHAWK_SLAM: SlamMap = {
  Spine: { x: 0.1, y: -0.22, z: 0 },
  Spine1: { x: 0.06, y: -0.12, z: 0 },
  Neck: { x: 0.2, y: 0.1, z: 0 },
  LeftShoulder: { x: 0, y: 0.25, z: 0.2 },
  RightShoulder: { x: 0, y: 0, z: -0.55 },
  LeftArm: { x: 0.45, y: 0.75, z: 0.95 },
  RightArm: { x: 0, y: 0, z: -1.2 },
  LeftForeArm: { x: -1.05, y: 0.2, z: 0 },
  RightForeArm: { x: -0.12, y: 0, z: 0 },
  LeftUpLeg: { x: 1.12, y: 0.18, z: 0 },
  RightUpLeg: { x: 0.22, y: -0.1, z: 0 },
  LeftLeg: { x: 1.02, y: 0, z: 0 },
  RightLeg: { x: 0.28, y: 0, z: 0 },
};

export const THREE_SIXTY_SLAM: SlamMap = {
  Spine: { x: 0.04, y: 0.28, z: 0 },
  Spine1: { x: 0.04, y: 0.14, z: 0 },
  Neck: { x: 0.08, y: -0.2, z: 0 },
  LeftShoulder: { x: 0, y: 0.35, z: -0.15 },
  RightShoulder: { x: 0, y: -0.35, z: -0.15 },
  LeftArm: { x: 0.15, y: 1.05, z: -0.45 },
  RightArm: { x: 0.15, y: -1.05, z: -0.45 },
  LeftForeArm: { x: -0.9, y: 0.35, z: 0 },
  RightForeArm: { x: -0.9, y: -0.35, z: 0 },
  LeftUpLeg: { x: 0.7, y: 0.16, z: 0 },
  RightUpLeg: { x: 0.55, y: -0.16, z: 0 },
  LeftLeg: { x: 0.6, y: 0, z: 0 },
  RightLeg: { x: 0.48, y: 0, z: 0 },
};

export const SLAM_SPINS: Record<HangStyle, SlamMap> = {
  REVERSE_TWO_HAND: REVERSE_TWO_HAND_SLAM,
  WINDMILL: WINDMILL_SLAM,
  TOMAHAWK: TOMAHAWK_SLAM,
  '360_SPIN': THREE_SIXTY_SLAM,
};

export function slamArmSignature(style: HangStyle): string {
  const slam = SLAM_SPINS[style];
  const l = slam.LeftArm;
  const r = slam.RightArm;
  return `${l.x.toFixed(2)},${l.y.toFixed(2)},${l.z.toFixed(2)}|${r.x.toFixed(2)},${r.y.toFixed(2)},${r.z.toFixed(2)}`;
}
