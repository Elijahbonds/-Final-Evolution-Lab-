/**
 * Baked Mixamo slam clips. Quaternion tracks, not Euler recipes.
 * GLB only ships Idle/Walk/Run/TPose — these clips are the dunk.
 */

import tracks from './slamClipTracks.json';

export type HangStyle = 'REVERSE_TWO_HAND' | 'WINDMILL' | 'TOMAHAWK' | '360_SPIN';

export interface SlamKey {
  frame: number;
  q: number[];
}

export interface SlamTrack {
  fps: number;
  duration: number;
  bones: Record<string, SlamKey[]>;
}

export const HANG_STYLES: HangStyle[] = ['REVERSE_TWO_HAND', 'WINDMILL', 'TOMAHAWK', '360_SPIN'];

export const SLAM_TRACKS = tracks as Record<HangStyle, SlamTrack>;

export const APPROACH_TRACKS = tracks as Record<'PLANT' | 'TAKEOFF', SlamTrack>;

export function slamTrackSweeps(style: HangStyle): boolean {
  const keys = SLAM_TRACKS[style]?.bones.LeftArm ?? [];
  if (keys.length < 3) return false;
  const a = keys[0].q;
  const b = keys[1].q;
  const c = keys[keys.length - 1].q;
  const d = (p: number[], q: number[]) =>
    Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) + Math.abs(p[3] - q[3]);
  return d(a, b) > 0.04 && d(b, c) > 0.02;
}

export function slamTrackFrame(track: SlamTrack, t01: number): number {
  return Math.max(0, Math.min(1, t01)) * track.duration * track.fps;
}

export function sampleTrackQuat(keys: SlamKey[], frame: number): [number, number, number, number] | null {
  if (!keys.length) return null;
  if (frame <= keys[0].frame) {
    const q = keys[0].q;
    return [q[0], q[1], q[2], q[3]];
  }
  const last = keys[keys.length - 1];
  if (frame >= last.frame) {
    const q = last.q;
    return [q[0], q[1], q[2], q[3]];
  }
  let i = 1;
  while (keys[i].frame < frame) i += 1;
  const a = keys[i - 1];
  const b = keys[i];
  const u = (frame - a.frame) / Math.max(1e-6, b.frame - a.frame);
  const ax = a.q[0];
  const ay = a.q[1];
  const az = a.q[2];
  const aw = a.q[3];
  const bx = b.q[0];
  const by = b.q[1];
  const bz = b.q[2];
  const bw = b.q[3];
  const dot = ax * bx + ay * by + az * bz + aw * bw;
  const sign = dot < 0 ? -1 : 1;
  const ox = ax + (bx * sign - ax) * u;
  const oy = ay + (by * sign - ay) * u;
  const oz = az + (bz * sign - az) * u;
  const ow = aw + (bw * sign - aw) * u;
  const len = Math.hypot(ox, oy, oz, ow) || 1;
  return [ox / len, oy / len, oz / len, ow / len];
}
