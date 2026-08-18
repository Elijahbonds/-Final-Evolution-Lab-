/**
 * Parse a BVH take and retarget it onto the Mixamo 65-bone / mixamorig skin.
 * Hang plays this AnimationGroup. It is not SLAM_CLIP_KEYS.
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

export const ELIJAH_DUNK_BVH = 'basketball_dunk__elijah.bvh';
export const ELIJAH_DUNK_CLIP = 'basketball_dunk__elijah';
export const CMU_LAYUP_BVH = 'cmu_124_06_basketball_layup.bvh';

export interface BvhTakeMeta {
  clipName: string;
  source: string;
  restRelative: boolean;
  hangStart: number;
  hangEnd: number;
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

function readMeta(text: string): Omit<BvhTakeMeta, 'frameCount' | 'frameTime'> {
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
  return {
    meta: {
      ...metaHead,
      hangStart,
      hangEnd,
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
): { hangStart: number; hangEnd: number } {
  const last = Math.max(0, frames.length - 1);
  const hips = joints.find((j) => mapBvhJointToMixamo(j.name) === 'Hips');
  const yi = hips?.channels.indexOf('Yposition') ?? -1;
  if (!hips || yi < 0 || frames.length < 8) {
    return { hangStart: 0, hangEnd: last };
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
  const endFrame = Math.max(0, parsed.frames.length - 1);

  for (const joint of parsed.joints) {
    const mixamo = mapBvhJointToMixamo(joint.name);
    const bone = bones.get(mixamo);
    const bind = rest.get(mixamo);
    if (!bone || !bind) continue;
    const rotIdx = joint.channels
      .map((ch, i) => ({ ch, i }))
      .filter((c) => c.ch.endsWith('rotation'));
    if (!rotIdx.length) continue;

    const keys = parsed.frames.map((frame, fi) => {
      const vals = joint.channels.map((_, ci) => frame[joint.channelOffset + ci] ?? 0);
      const e = eulerFromChannels(joint.channels, vals);
      const delta = rotationFromSxyz(e.x, e.y, e.z);
      const value = parsed.meta.restRelative ? bind.multiply(delta) : delta;
      return { frame: fi, value };
    });

    const makeAnim = (animName: string) => {
      const anim = new Animation(
        animName,
        'rotationQuaternion',
        fps,
        Animation.ANIMATIONTYPE_QUATERNION,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
      anim.setKeys(keys.map((k) => ({ frame: k.frame, value: k.value.clone() })));
      return anim;
    };

    group.addTargetedAnimation(makeAnim(`${groupName}_${mixamo}`), bone);
    const node = bone.getTransformNode();
    if (node) {
      if (!node.rotationQuaternion) node.rotationQuaternion = bind.clone();
      group.addTargetedAnimation(makeAnim(`${groupName}_${mixamo}_node`), node);
    }
  }

  group.normalize(0, endFrame);
  group.onAnimationGroupEndObservable.add(() => {
    group.goToFrame(endFrame);
    group.pause();
  });
  return { group, meta: parsed.meta };
}

export function hangFrame01(meta: BvhTakeMeta, t01: number): number {
  const t = Math.max(0, Math.min(1, t01));
  const start = Math.max(0, meta.hangStart);
  const end = Math.max(start, meta.hangEnd);
  const span = Math.max(1, end - start);
  return start + t * span;
}

export function quatAtFrame(anim: Animation, frame: number): Quaternion | null {
  const keys = anim.getKeys();
  if (!keys.length) return null;
  if (frame <= keys[0].frame) return (keys[0].value as Quaternion).clone();
  const last = keys[keys.length - 1];
  if (frame >= last.frame) return (last.value as Quaternion).clone();
  let i = 1;
  while (keys[i].frame < frame) i += 1;
  const a = keys[i - 1];
  const b = keys[i];
  const u = (frame - a.frame) / Math.max(1e-6, b.frame - a.frame);
  return Quaternion.Slerp(a.value as Quaternion, b.value as Quaternion, u);
}

export function applyGroupFrame(
  group: AnimationGroup,
  frame: number,
  bones: Map<string, Bone> | null
) {
  for (const { animation, target } of group.targetedAnimations) {
    const q = quatAtFrame(animation, frame);
    if (!q) continue;
    if (target instanceof Bone) {
      writeLocal(target, q);
    } else if (target && 'rotationQuaternion' in target) {
      const node = target as TransformNode;
      if (!node.rotationQuaternion) node.rotationQuaternion = q;
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
  const urls = [options?.url, `/assets/${ELIJAH_DUNK_BVH}`].filter((u): u is string => !!u);
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        if (isElijahDunkTake(text)) return text;
      }
    } catch {
      /* try next */
    }
  }
  return '';
}
