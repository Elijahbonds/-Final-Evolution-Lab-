/**
 * World-space slam silhouettes from Mixamo T-pose bind.
 * Arms in that bind stick out on X — world Z raises them, world X sends them
 * toward the rim. No 180° spine yaw. Style must change the seen limbs.
 */

export type HangStyle = 'REVERSE_TWO_HAND' | 'WINDMILL' | 'TOMAHAWK' | '360_SPIN';

export interface BoneSpin {
  x: number;
  y: number;
  z: number;
}

export type SlamMap = Record<string, BoneSpin>;

/** Both hands up and slightly back — reverse two-hand. */
export const REVERSE_TWO_HAND_SLAM: SlamMap = {
  Spine: { x: -0.18, y: 0, z: 0 },
  Spine1: { x: -0.12, y: 0, z: 0 },
  Spine2: { x: -0.08, y: 0, z: 0 },
  Neck: { x: 0.22, y: 0, z: 0 },
  Head: { x: 0.16, y: 0, z: 0 },
  LeftShoulder: { x: 0.1, y: 0.12, z: 0.32 },
  RightShoulder: { x: 0.1, y: -0.12, z: -0.32 },
  LeftArm: { x: -0.28, y: 0.12, z: 1.52 },
  RightArm: { x: -0.28, y: -0.12, z: -1.52 },
  LeftForeArm: { x: -0.35, y: 0.08, z: 0 },
  RightForeArm: { x: -0.35, y: -0.08, z: 0 },
  LeftUpLeg: { x: 1.05, y: 0.1, z: 0 },
  RightUpLeg: { x: 1.12, y: -0.1, z: 0 },
  LeftLeg: { x: 1.15, y: 0, z: 0 },
  RightLeg: { x: 1.22, y: 0, z: 0 },
};

/** Left arm sweeps across; right stays high. */
export const WINDMILL_SLAM: SlamMap = {
  Spine: { x: 0.08, y: 0.42, z: -0.1 },
  Spine1: { x: 0.06, y: 0.22, z: 0 },
  Spine2: { x: 0.04, y: 0.14, z: 0 },
  Neck: { x: 0.12, y: -0.18, z: 0 },
  Head: { x: 0.1, y: -0.12, z: 0 },
  LeftShoulder: { x: 0.2, y: 0.55, z: 0.15 },
  RightShoulder: { x: 0.12, y: -0.2, z: -0.28 },
  LeftArm: { x: 0.55, y: 1.45, z: 0.42 },
  RightArm: { x: 0.18, y: -0.18, z: -1.48 },
  LeftForeArm: { x: -0.15, y: 0.55, z: 0.2 },
  RightForeArm: { x: -0.4, y: 0, z: 0 },
  LeftUpLeg: { x: 0.28, y: 0.18, z: 0.08 },
  RightUpLeg: { x: 1.18, y: -0.22, z: -0.08 },
  LeftLeg: { x: 0.32, y: 0, z: 0 },
  RightLeg: { x: 1.05, y: 0, z: 0 },
};

/** Right arm chops from high; left tucks across the ribs. */
export const TOMAHAWK_SLAM: SlamMap = {
  Spine: { x: 0.16, y: -0.28, z: 0.08 },
  Spine1: { x: 0.1, y: -0.16, z: 0 },
  Spine2: { x: 0.08, y: -0.1, z: 0 },
  Neck: { x: 0.24, y: 0.12, z: 0 },
  Head: { x: 0.18, y: 0.08, z: 0 },
  LeftShoulder: { x: -0.12, y: 0.28, z: 0.08 },
  RightShoulder: { x: 0.22, y: -0.38, z: -0.22 },
  LeftArm: { x: 0.85, y: 0.95, z: 0.22 },
  RightArm: { x: 0.62, y: -0.12, z: -1.62 },
  LeftForeArm: { x: -1.15, y: 0.25, z: 0 },
  RightForeArm: { x: -0.08, y: 0, z: 0 },
  LeftUpLeg: { x: 1.15, y: 0.2, z: 0.1 },
  RightUpLeg: { x: 0.22, y: -0.12, z: 0 },
  LeftLeg: { x: 1.05, y: 0, z: 0 },
  RightLeg: { x: 0.28, y: 0, z: 0 },
};

/** Arms wrap the ball at the chest — spin lives on the root. */
export const THREE_SIXTY_SLAM: SlamMap = {
  Spine: { x: 0.04, y: 0.35, z: 0 },
  Spine1: { x: 0.06, y: 0.18, z: 0 },
  Spine2: { x: 0.04, y: 0.1, z: 0 },
  Neck: { x: 0.08, y: -0.22, z: 0 },
  Head: { x: 0.06, y: -0.14, z: 0 },
  LeftShoulder: { x: 0.12, y: 0.42, z: 0.18 },
  RightShoulder: { x: 0.12, y: -0.42, z: -0.18 },
  LeftArm: { x: 0.22, y: 1.18, z: 0.72 },
  RightArm: { x: 0.22, y: -1.18, z: -0.72 },
  LeftForeArm: { x: -0.95, y: 0.4, z: 0 },
  RightForeArm: { x: -0.95, y: -0.4, z: 0 },
  LeftUpLeg: { x: 0.72, y: 0.2, z: 0.12 },
  RightUpLeg: { x: 0.55, y: -0.22, z: -0.1 },
  LeftLeg: { x: 0.62, y: 0, z: 0 },
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
