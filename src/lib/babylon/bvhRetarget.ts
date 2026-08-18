/**
 * Parse a BVH take and retarget it onto the Mixamo 65-bone / mixamorig skin.
 * Hang, plant, and takeoff play windows on this AnimationGroup. It is not SLAM_CLIP_KEYS.
 */

import {
  Animation,
  AnimationGroup,
  Bone,
  Quaternion,
  Scene,
  Space,
  TransformNode,
} from '@babylonjs/core';
import { sanitizeBoneName } from '../rigSanitizer';
import { fetchLocalText, isRemoteAssetUrl, localAssetUrl, LOCAL_ELIJAH_BVH } from './localAssets';

export const ELIJAH_DUNK_BVH = 'basketball_dunk__elijah.bvh';
export const ELIJAH_DUNK_CLIP = 'basketball_dunk__elijah';
export const CMU_LAYUP_BVH = 'cmu_124_06_basketball_layup.bvh';

export interface BvhTakeMeta {
  clipName: string;
  source: string;
  restRelative: boolean;
  hangStart: number;
  hangEnd: number;
  /** Rim pose in the hang window. Not hangEnd — hangEnd can be the land squash. */
  hangContact: number;
  /** Last gather/plant on the floor, before hangStart. */
  plantStart: number;
  plantEnd: number;
  /** Rise from that plant into apex (hangStart). */
  takeoffStart: number;
  takeoffEnd: number;
  frameCount: number;
  frameTime: number;
}

export interface ParsedBvh {
  meta: BvhTakeMeta;
  joints: BvhJoint[];
  frames: number[][];
}

export interface BvhJoint {
  name: string;
  channels: string[];
  channelOffset: number;
}

const CMU_TO_MIXAMO: Record<string, string> = {
  root: 'Hips',
  lowerback: 'Spine',
  upperback: 'Spine1',
  thorax: 'Spine2',
  lowerneck: 'Neck',
  upperneck: 'Head',
  head: 'Head',
  lclavicle: 'LeftShoulder',
  lhumerus: 'LeftArm',
  lradius: 'LeftForeArm',
  lwrist: 'LeftHand',
  rclavicle: 'RightShoulder',
  rhumerus: 'RightArm',
  rradius: 'RightForeArm',
  rwrist: 'RightHand',
  lfemur: 'LeftUpLeg',
  ltibia: 'LeftLeg',
  lfoot: 'LeftFoot',
  ltoes: 'LeftToeBase',
  rfemur: 'RightUpLeg',
  rtibia: 'RightLeg',
  rfoot: 'RightFoot',
  rtoes: 'RightToeBase',
};

export function mapBvhJointToMixamo(raw: string): string {
  const clean = sanitizeBoneName(raw);
  if (CMU_TO_MIXAMO[clean.toLowerCase()]) return CMU_TO_MIXAMO[clean.toLowerCase()];
  return clean;
}

function readMeta(
  text: string
): Omit<
  BvhTakeMeta,
  | 'frameCount'
  | 'frameTime'
  | 'hangContact'
  | 'plantStart'
  | 'plantEnd'
  | 'takeoffStart'
  | 'takeoffEnd'
> {
  let clipName = ELIJAH_DUNK_CLIP;
  let source = ELIJAH_DUNK_BVH;
  let restRelative = false;
  let hangStart = 0;
  let hangEnd = -1;
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith('#')) continue;
    const parts = t.slice(1).trim().split(/\s+/);
    const key = parts[0];
    if (key === 'clip_name' && parts[1]) clipName = parts[1];
    if (key === 'source' && parts[1]) source = parts.slice(1).join(' ');
    if (key === 'rest_relative') restRelative = parts[1] === '1' || parts[1] === 'true';
    if (key === 'hang_start') hangStart = Number(parts[1]) || 0;
    if (key === 'hang_end') hangEnd = Number(parts[1]);
  }
  return { clipName, source, restRelative, hangStart, hangEnd };
}

export function parseBvh(text: string): ParsedBvh {
  const metaHead = readMeta(text);
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const joints: BvhJoint[] = [];
  let i = 0;
  let channelOffset = 0;
  while (i < lines.length && lines[i] !== 'MOTION') {
    const line = lines[i];
    const root = line.match(/^ROOT\s+(.+)$/);
    const joint = line.match(/^JOINT\s+(.+)$/);
    const name = root?.[1] ?? joint?.[1];
    if (name) {
      let channels: string[] = [];
      for (let j = i; j < Math.min(i + 6, lines.length); j++) {
        if (lines[j].startsWith('CHANNELS')) {
          const bits = lines[j].split(/\s+/);
          channels = bits.slice(2);
          break;
        }
      }
      joints.push({ name, channels, channelOffset });
      channelOffset += channels.length;
    }
    i += 1;
  }
  if (lines[i] === 'MOTION') i += 1;
  let frameCount = 0;
  let frameTime = 1 / 60;
  if (lines[i]?.startsWith('Frames:')) {
    frameCount = Number(lines[i].split(/\s+/)[1]);
    i += 1;
  }
  if (lines[i]?.startsWith('Frame Time:')) {
    frameTime = Number(lines[i].split(/\s+/)[2]);
    i += 1;
  }
  const frames: number[][] = [];
  while (i < lines.length) {
    const nums = lines[i].split(/\s+/).map(Number).filter((n) => Number.isFinite(n));
    if (nums.length) frames.push(nums);
    i += 1;
  }
  const inferred = inferHangWindow(joints, frames);
  const hangStart = metaHead.hangEnd >= 0 ? metaHead.hangStart : inferred.hangStart;
  const hangEnd = metaHead.hangEnd >= 0 ? metaHead.hangEnd : inferred.hangEnd;
  const hangContact = Math.max(hangStart, Math.min(hangEnd, inferred.hangContact));
  const approach = inferApproachWindows(joints, frames, hangStart);
  return {
    meta: {
      ...metaHead,
      hangStart,
      hangEnd,
      hangContact,
      ...approach,
      frameCount: frames.length || frameCount,
      frameTime,
    },
    joints,
    frames,
  };
}

/** Apex through rim: start at peak Hips Y, play the drop — not the gather. */
export function inferHangWindow(
  joints: BvhJoint[],
  frames: number[][]
): { hangStart: number; hangEnd: number; hangContact: number } {
  const last = Math.max(0, frames.length - 1);
  const hips = joints.find((j) => mapBvhJointToMixamo(j.name) === 'Hips');
  const yi = hips?.channels.indexOf('Yposition') ?? -1;
  if (!hips || yi < 0 || frames.length < 8) {
    return { hangStart: 0, hangEnd: last, hangContact: last };
  }
  const ys = frames.map((f) => f[hips.channelOffset + yi] ?? 0);
  let peak = 0;
  for (let i = 1; i < ys.length; i++) {
    if (ys[i] > ys[peak]) peak = i;
  }
  const ymin = ys.reduce((m, y) => Math.min(m, y), ys[0]);
  const ymax = ys[peak];
  const thr = ymin + 0.7 * (ymax - ymin);
  let end = peak;
  while (end < last && ys[end + 1] >= thr) end += 1;
  return {
    hangStart: peak,
    hangEnd: Math.min(last, end + 6),
    hangContact: end,
  };
}

function hipsY(joints: BvhJoint[], frames: number[][]): number[] | null {
  const hips = joints.find((j) => mapBvhJointToMixamo(j.name) === 'Hips');
  const yi = hips?.channels.indexOf('Yposition') ?? -1;
  if (!hips || yi < 0) return null;
  return frames.map((f) => f[hips.channelOffset + yi] ?? 0);
}

/**
 * Same take as hang: last floor gather/plant, then the rise into hangStart.
 * Does not use another clip when this take has a plant before apex.
 */
export function inferApproachWindows(
  joints: BvhJoint[],
  frames: number[][],
  hangStart: number
): { plantStart: number; plantEnd: number; takeoffStart: number; takeoffEnd: number } {
  const apex = Math.max(0, Math.min(hangStart, Math.max(0, frames.length - 1)));
  const ys = hipsY(joints, frames);
  if (!ys || apex < 8) {
    return { plantStart: 0, plantEnd: apex, takeoffStart: 0, takeoffEnd: apex };
  }
  let takeoffStart = apex;
  while (takeoffStart > 1 && ys[takeoffStart - 1] < ys[takeoffStart]) takeoffStart -= 1;
  let plantStart = takeoffStart;
  while (plantStart > 1 && ys[plantStart - 1] >= ys[plantStart]) plantStart -= 1;
  if (takeoffStart - plantStart < 6) {
    plantStart = Math.max(0, takeoffStart - 12);
  }
  return {
    plantStart,
    plantEnd: takeoffStart,
    takeoffStart,
    takeoffEnd: apex,
  };
}

/** Static XYZ (sxyz): R = Rz(z) Ry(y) Rx(x). Matches the CMU converter. */
export function rotationFromSxyz(xRad: number, yRad: number, zRad: number): Quaternion {
  const cx = Math.cos(xRad * 0.5);
  const sx = Math.sin(xRad * 0.5);
  const cy = Math.cos(yRad * 0.5);
  const sy = Math.sin(yRad * 0.5);
  const cz = Math.cos(zRad * 0.5);
  const sz = Math.sin(zRad * 0.5);
  const qx = new Quaternion(sx, 0, 0, cx);
  const qy = new Quaternion(0, sy, 0, cy);
  const qz = new Quaternion(0, 0, sz, cz);
  return qz.multiply(qy).multiply(qx);
}

function eulerFromChannels(channels: string[], values: number[]): { x: number; y: number; z: number } {
  let x = 0;
  let y = 0;
  let z = 0;
  channels.forEach((ch, i) => {
    const v = (values[i] ?? 0) * (Math.PI / 180);
    if (ch === 'Xrotation') x = v;
    if (ch === 'Yrotation') y = v;
    if (ch === 'Zrotation') z = v;
  });
  return { x, y, z };
}

function writeLocal(bone: Bone, q: Quaternion) {
  bone.setRotationQuaternion(q, Space.LOCAL);
  const node = bone.getTransformNode();
  if (node) {
    if (!node.rotationQuaternion) node.rotationQuaternion = q.clone();
    else node.rotationQuaternion.copyFrom(q);
  }
}

export function buildMixamoGroupFromBvh(
  scene: Scene,
  groupName: string,
  bones: Map<string, Bone>,
  rest: Map<string, Quaternion>,
  bvhText: string
): { group: AnimationGroup; meta: BvhTakeMeta } {
  const parsed = parseBvh(bvhText);
  const fps = Math.max(1, Math.round(1 / Math.max(1e-4, parsed.meta.frameTime)));
  const group = new AnimationGroup(parsed.meta.clipName || groupName, scene);
  const last = Math.max(0, parsed.frames.length - 1);
  // Live pose only samples plant → hang. Do not keep 2029-frame tracks in the iframe.
  const keyStart = Math.max(0, Math.min(parsed.meta.plantStart, parsed.meta.hangStart));
  const keyEnd = Math.min(last, Math.max(keyStart, parsed.meta.hangEnd));

  for (const joint of parsed.joints) {
    const mixamo = mapBvhJointToMixamo(joint.name);
    const bone = bones.get(mixamo);
    const bind = rest.get(mixamo);
    if (!bone || !bind) continue;
    if (!joint.channels.some((ch) => ch.endsWith('rotation'))) continue;

    const keys: Array<{ frame: number; value: Quaternion }> = [];
    const vals = new Array<number>(joint.channels.length);
    for (let fi = keyStart; fi <= keyEnd; fi++) {
      const frame = parsed.frames[fi];
      for (let ci = 0; ci < joint.channels.length; ci++) {
        vals[ci] = frame[joint.channelOffset + ci] ?? 0;
      }
      const e = eulerFromChannels(joint.channels, vals);
      const delta = rotationFromSxyz(e.x, e.y, e.z);
      keys.push({ frame: fi, value: parsed.meta.restRelative ? bind.multiply(delta) : delta });
    }

    const anim = new Animation(
      `${groupName}_${mixamo}`,
      'rotationQuaternion',
      fps,
      Animation.ANIMATIONTYPE_QUATERNION,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );
    anim.setKeys(keys);
    group.addTargetedAnimation(anim, bone);
    const node = bone.getTransformNode();
    if (node && !node.rotationQuaternion) node.rotationQuaternion = bind.clone();
  }

  group.normalize(keyStart, keyEnd);
  return { group, meta: parsed.meta };
}

export function windowFrame01(start: number, end: number, t01: number): number {
  const t = Math.max(0, Math.min(1, t01));
  const a = Math.max(0, start);
  const b = Math.max(a, end);
  const span = Math.max(1, b - a);
  return a + t * span;
}

export function hangFrame01(meta: BvhTakeMeta, t01: number): number {
  return windowFrame01(meta.hangStart, meta.hangEnd, t01);
}

export function plantFrame01(meta: BvhTakeMeta, t01: number): number {
  return windowFrame01(meta.plantStart, meta.plantEnd, t01);
}

export function takeoffFrame01(meta: BvhTakeMeta, t01: number): number {
  return windowFrame01(meta.takeoffStart, meta.takeoffEnd, t01);
}

/** CONTACT samples this t01 — the rim pose, not hangFrame01(..., 1) land squash. */
export function hangContactT01(meta: BvhTakeMeta): number {
  const start = Math.max(0, meta.hangStart);
  const end = Math.max(start, meta.hangEnd);
  const span = Math.max(1, end - start);
  const contact = Math.max(start, Math.min(end, meta.hangContact));
  return (contact - start) / span;
}

const _frameQuat = new Quaternion();

export function quatAtFrame(anim: Animation, frame: number): Quaternion | null {
  if (!quatAtFrameToRef(anim, frame, _frameQuat)) return null;
  return _frameQuat.clone();
}

function quatAtFrameToRef(anim: Animation, frame: number, out: Quaternion): Quaternion | null {
  const keys = anim.getKeys();
  if (!keys.length) return null;
  if (frame <= keys[0].frame) {
    out.copyFrom(keys[0].value as Quaternion);
    return out;
  }
  const last = keys[keys.length - 1];
  if (frame >= last.frame) {
    out.copyFrom(last.value as Quaternion);
    return out;
  }
  let i = 1;
  while (keys[i].frame < frame) i += 1;
  const a = keys[i - 1];
  const b = keys[i];
  const u = (frame - a.frame) / Math.max(1e-6, b.frame - a.frame);
  Quaternion.SlerpToRef(a.value as Quaternion, b.value as Quaternion, u, out);
  return out;
}

export function applyGroupFrame(
  group: AnimationGroup,
  frame: number,
  bones: Map<string, Bone> | null
) {
  for (const { animation, target } of group.targetedAnimations) {
    const q = quatAtFrameToRef(animation, frame, _frameQuat);
    if (!q) continue;
    if (target instanceof Bone) {
      writeLocal(target, q);
    } else if (target && 'rotationQuaternion' in target) {
      const node = target as TransformNode;
      if (!node.rotationQuaternion) node.rotationQuaternion = q.clone();
      else node.rotationQuaternion.copyFrom(q);
    }
  }
  void bones;
}

export function isElijahDunkTake(text: string): boolean {
  if (!text.includes('HIERARCHY') || !text.includes('MOTION')) return false;
  const meta = readMeta(text);
  const blob = `${meta.clipName} ${meta.source}`.toLowerCase();
  if (blob.includes('cmu') || blob.includes('layup') || blob.includes('lay_up')) return false;
  return meta.clipName === ELIJAH_DUNK_CLIP;
}

export async function loadDunkBvhText(options?: {
  text?: string;
  file?: File;
  url?: string;
}): Promise<string> {
  if (options?.text) return isElijahDunkTake(options.text) ? options.text : '';
  if (options?.file) {
    const text = await options.file.text();
    return isElijahDunkTake(text) ? text : '';
  }
  const urls = [options?.url, localAssetUrl(LOCAL_ELIJAH_BVH)].filter((u): u is string => {
    return !!u && !isRemoteAssetUrl(u);
  });
  for (const url of urls) {
    try {
      const text = await fetchLocalText(url);
      if (isElijahDunkTake(text)) return text;
    } catch {
      /* try next */
    }
  }
  return '';
}
