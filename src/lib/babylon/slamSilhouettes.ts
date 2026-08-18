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

/** First hang frame — continues the takeoff reach, not a T-pose reset. */
export const TAKEOFF_HANG_START: SlamMap = {
  Spine: { x: -0.12, y: 0, z: 0 },
  Spine1: { x: -0.04, y: 0, z: 0 },
  Neck: { x: 0.08, y: 0, z: 0 },
  LeftShoulder: { x: 0, y: 0, z: -0.35 },
  RightShoulder: { x: 0, y: 0, z: -0.35 },
  LeftArm: { x: 0, y: 0, z: -0.85 },
  RightArm: { x: 0, y: 0, z: -0.85 },
  LeftForeArm: { x: -0.22, y: 0, z: 0 },
  RightForeArm: { x: -0.22, y: 0, z: 0 },
  LeftUpLeg: { x: -0.12, y: 0, z: 0 },
  RightUpLeg: { x: 0.72, y: 0, z: 0 },
  LeftLeg: { x: 0.22, y: 0, z: 0 },
  RightLeg: { x: 0.85, y: 0, z: 0 },
};

const WINDMILL_WINDUP: SlamMap = {
  Spine: { x: 0.02, y: 0.18, z: 0 },
  Spine1: { x: 0.02, y: 0.1, z: 0 },
  Neck: { x: 0.08, y: -0.08, z: 0 },
  LeftShoulder: { x: 0, y: 0.22, z: 0.42 },
  RightShoulder: { x: 0, y: 0, z: -0.48 },
  LeftArm: { x: 0.95, y: 0.4, z: 0.12 },
  RightArm: { x: 0, y: 0, z: -1.05 },
  LeftForeArm: { x: -0.35, y: 0.22, z: 0 },
  RightForeArm: { x: -0.2, y: 0, z: 0 },
  LeftUpLeg: { x: 0.08, y: 0.12, z: 0 },
  RightUpLeg: { x: 0.95, y: -0.14, z: 0 },
  LeftLeg: { x: 0.18, y: 0, z: 0 },
  RightLeg: { x: 0.95, y: 0, z: 0 },
};

const TOMAHAWK_COCK: SlamMap = {
  Spine: { x: 0.04, y: -0.12, z: 0 },
  Spine1: { x: 0.04, y: -0.08, z: 0 },
  Neck: { x: 0.16, y: 0.06, z: 0 },
  LeftShoulder: { x: 0, y: 0.18, z: 0.28 },
  RightShoulder: { x: -0.12, y: 0, z: -0.62 },
  LeftArm: { x: 0.72, y: 0.38, z: 0.42 },
  RightArm: { x: -0.18, y: 0.12, z: -1.38 },
  LeftForeArm: { x: -0.55, y: 0.16, z: 0 },
  RightForeArm: { x: -0.08, y: 0, z: 0 },
  LeftUpLeg: { x: 0.85, y: 0.14, z: 0 },
  RightUpLeg: { x: 0.18, y: -0.08, z: 0 },
  LeftLeg: { x: 0.72, y: 0, z: 0 },
  RightLeg: { x: 0.22, y: 0, z: 0 },
};

const THREE_SIXTY_WRAP: SlamMap = {
  Spine: { x: 0.02, y: 0.55, z: 0 },
  Spine1: { x: 0.02, y: 0.28, z: 0 },
  Neck: { x: 0.06, y: -0.28, z: 0 },
  LeftShoulder: { x: 0, y: 0.55, z: -0.08 },
  RightShoulder: { x: 0, y: -0.55, z: -0.08 },
  LeftArm: { x: 0.28, y: 1.35, z: -0.22 },
  RightArm: { x: 0.28, y: -1.35, z: -0.22 },
  LeftForeArm: { x: -0.7, y: 0.45, z: 0 },
  RightForeArm: { x: -0.7, y: -0.45, z: 0 },
  LeftUpLeg: { x: 0.55, y: 0.2, z: 0 },
  RightUpLeg: { x: 0.4, y: -0.2, z: 0 },
  LeftLeg: { x: 0.48, y: 0, z: 0 },
  RightLeg: { x: 0.36, y: 0, z: 0 },
};

export interface SlamKeyframe {
  t: number;
  map: SlamMap;
}

/** Legacy Euler maps. Live hang is the imported BVH take, not these keys. */
export const SLAM_CLIP_KEYS: Record<HangStyle, SlamKeyframe[]> = {
  REVERSE_TWO_HAND: [
    { t: 0, map: TAKEOFF_HANG_START },
    {
      t: 0.42,
      map: {
        ...REVERSE_TWO_HAND_SLAM,
        LeftArm: { x: 0.12, y: 0.22, z: -0.55 },
        RightArm: { x: 0.12, y: -0.22, z: -0.55 },
      },
    },
    { t: 1, map: REVERSE_TWO_HAND_SLAM },
  ],
  WINDMILL: [
    { t: 0, map: TAKEOFF_HANG_START },
    { t: 0.3, map: WINDMILL_WINDUP },
    { t: 0.68, map: WINDMILL_SLAM },
    { t: 1, map: WINDMILL_SLAM },
  ],
  TOMAHAWK: [
    { t: 0, map: TAKEOFF_HANG_START },
    { t: 0.34, map: TOMAHAWK_COCK },
    { t: 0.72, map: TOMAHAWK_SLAM },
    { t: 1, map: TOMAHAWK_SLAM },
  ],
  '360_SPIN': [
    { t: 0, map: TAKEOFF_HANG_START },
    { t: 0.38, map: THREE_SIXTY_WRAP },
    { t: 1, map: THREE_SIXTY_SLAM },
  ],
};

export function slamClipSweeps(style: HangStyle): boolean {
  const keys = SLAM_CLIP_KEYS[style];
  if (keys.length < 3) return false;
  const a = keys[0].map.LeftArm;
  const b = keys[1].map.LeftArm;
  const c = keys[keys.length - 1].map.LeftArm;
  if (!a || !b || !c) return false;
  const d = (p: BoneSpin, q: BoneSpin) =>
    Math.abs(p.x - q.x) + Math.abs(p.y - q.y) + Math.abs(p.z - q.z);
  return d(a, b) > 0.35 && d(b, c) > 0.12;
}

export function sampleSlamMap(style: HangStyle, t01: number): SlamMap {
  const keys = SLAM_CLIP_KEYS[style];
  const t = Math.max(0, Math.min(1, t01));
  if (t <= keys[0].t) return keys[0].map;
  const last = keys[keys.length - 1];
  if (t >= last.t) return last.map;
  let i = 1;
  while (i < keys.length && keys[i].t < t) i += 1;
  const a = keys[i - 1];
  const b = keys[i];
  const u = (t - a.t) / Math.max(1e-6, b.t - a.t);
  const names = new Set([...Object.keys(a.map), ...Object.keys(b.map)]);
  const out: SlamMap = {};
  for (const name of names) {
    const pa = a.map[name] ?? { x: 0, y: 0, z: 0 };
    const pb = b.map[name] ?? { x: 0, y: 0, z: 0 };
    out[name] = {
      x: pa.x + (pb.x - pa.x) * u,
      y: pa.y + (pb.y - pa.y) * u,
      z: pa.z + (pb.z - pa.z) * u,
    };
  }
  return out;
}

export function slamArmSignature(style: HangStyle): string {
  const slam = SLAM_SPINS[style];
  const l = slam.LeftArm;
  const r = slam.RightArm;
  return `${l.x.toFixed(2)},${l.y.toFixed(2)},${l.z.toFixed(2)}|${r.x.toFixed(2)},${r.y.toFixed(2)},${r.z.toFixed(2)}`;
}
