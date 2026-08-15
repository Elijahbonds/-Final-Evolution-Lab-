/**
 * Final Evolution Lab — Canonical Rig Sanitizer & Bone Normalizer (Gate 0 Contract)
 * Normalizes Mixamo / DeepMotion / SayMotion skeletal hierarchies to a canonical 65-bone dictionary.
 * Prevents T-pose / bind-pose fallback caused by 'mixamorig:' or root armature prefix mismatches.
 */

export const CANONICAL_MIXAMO_BONES = [
  'Hips',
  'Spine',
  'Spine1',
  'Spine2',
  'Neck',
  'Head',
  'HeadTop_End',
  'LeftShoulder',
  'LeftArm',
  'LeftForeArm',
  'LeftHand',
  'LeftHandThumb1',
  'LeftHandThumb2',
  'LeftHandThumb3',
  'LeftHandThumb4',
  'LeftHandIndex1',
  'LeftHandIndex2',
  'LeftHandIndex3',
  'LeftHandIndex4',
  'LeftHandMiddle1',
  'LeftHandMiddle2',
  'LeftHandMiddle3',
  'LeftHandMiddle4',
  'LeftHandRing1',
  'LeftHandRing2',
  'LeftHandRing3',
  'LeftHandRing4',
  'LeftHandPinky1',
  'LeftHandPinky2',
  'LeftHandPinky3',
  'LeftHandPinky4',
  'RightShoulder',
  'RightArm',
  'RightForeArm',
  'RightHand',
  'RightHandThumb1',
  'RightHandThumb2',
  'RightHandThumb3',
  'RightHandThumb4',
  'RightHandIndex1',
  'RightHandIndex2',
  'RightHandIndex3',
  'RightHandIndex4',
  'RightHandMiddle1',
  'RightHandMiddle2',
  'RightHandMiddle3',
  'RightHandMiddle4',
  'RightHandRing1',
  'RightHandRing2',
  'RightHandRing3',
  'RightHandRing4',
  'RightHandPinky1',
  'RightHandPinky2',
  'RightHandPinky3',
  'RightHandPinky4',
  'LeftUpLeg',
  'LeftLeg',
  'LeftFoot',
  'LeftToeBase',
  'LeftToe_End',
  'RightUpLeg',
  'RightLeg',
  'RightFoot',
  'RightToeBase',
  'RightToe_End'
] as const;

export type CanonicalBoneName = typeof CANONICAL_MIXAMO_BONES[number];

/**
 * Strips all namespace prefixes ('mixamorig:', 'mixamorig_', 'Armature|', 'Character|', etc.)
 * returning the normalized bone identifier.
 */
export function sanitizeBoneName(rawName: string): string {
  if (!rawName) return '';
  // Remove common export prefixes and armature names
  return rawName
    .replace(/^.*mixamorig\d*[:_]/i, '')
    .replace(/^Armature\|/i, '')
    .replace(/^Character\|/i, '')
    .replace(/^Skeleton\|/i, '')
    .replace(/^[a-zA-Z0-9_-]+:/, '') // generic namespace:
    .trim();
}

/**
 * Validates whether a given bone name is in the canonical 65-bone Mixamo rig specification.
 */
export function isCanonicalMixamoBone(boneName: string): boolean {
  const sanitized = sanitizeBoneName(boneName);
  return (CANONICAL_MIXAMO_BONES as readonly string[]).includes(sanitized);
}

/**
 * Socket attachment points for equipment & balls.
 */
export const RIG_SOCKETS = {
  RIGHT_HAND_ITEM: 'RightHandIndex3',   // Tennis racket, baseball bat, sword grip
  LEFT_HAND_ITEM: 'LeftHandIndex3',
  RIGHT_FOOT_BALL: 'RightToeBase',      // Soccer strike zone
  LEFT_FOOT_BALL: 'LeftToeBase',
  HEAD_CROWN: 'HeadTop_End',
  ROOT_CENTER: 'Hips'
} as const;

export interface AnimationRetargetMap {
  sourceBone: string;
  targetBone: CanonicalBoneName;
  isValid: boolean;
}

/**
 * Builds a dynamic retarget mapping table for imported animation tracks.
 */
export function buildRetargetMap(sourceBoneNames: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const src of sourceBoneNames) {
    const clean = sanitizeBoneName(src);
    if ((CANONICAL_MIXAMO_BONES as readonly string[]).includes(clean)) {
      map.set(src, clean);
    }
  }
  return map;
}
