/**
 * Mixamo 65-bone athlete loader (Gate 0 sanitizer + @babylonjs/loaders).
 * The mesh you see is the skinned GLB — not box/sphere/cylinder stand-ins.
 * Hidden 0.01 ghost limbs are not used.
 */

import '@babylonjs/loaders/glTF';
import {
  Scene,
  SceneLoader,
  AssetContainer,
  AnimationGroup,
  Skeleton,
  Bone,
  AbstractMesh,
  Mesh,
  MeshBuilder,
  Quaternion,
  Color3,
  StandardMaterial,
  TransformNode,
  Space,
  ShadowGenerator,
} from '@babylonjs/core';
import { sanitizeBoneName } from '../rigSanitizer';

export interface MixamoAthlete {
  root: TransformNode;
  meshes: AbstractMesh[];
  skeleton: Skeleton | null;
  bones: Map<string, Bone>;
  rest: Map<string, Quaternion>;
  anims: {
    idle?: AnimationGroup;
    walk?: AnimationGroup;
    run?: AnimationGroup;
    tpose?: AnimationGroup;
  };
  basketball: Mesh;
  playRun: (rate?: number) => void;
  playIdle: () => void;
  stopClips: () => void;
  posePlant: (intensity: number) => void;
  poseTakeoff: (intensity: number) => void;
  poseReverseTwoHand: (intensity: number) => void;
  poseWindmill: (intensity: number) => void;
  poseTomahawk: (intensity: number) => void;
  poseThreeSixty: (intensity: number) => void;
  poseHangStyle: (style: HangStyle, intensity: number) => void;
  poseSit: () => void;
  poseReact: (kind: CrowdReact, intensity?: number) => void;
  resetPose: () => void;
  dispose: () => void;
}

export type CrowdReact = 'sit' | 'watch' | 'rise' | 'cheer' | 'miss';
export type HangStyle = 'REVERSE_TWO_HAND' | 'WINDMILL' | 'TOMAHAWK' | '360_SPIN';

const containers = new WeakMap<Scene, AssetContainer>();

export async function loadMixamoContainer(scene: Scene): Promise<AssetContainer> {
  const existing = containers.get(scene);
  if (existing) return existing;
  const loaded = await SceneLoader.LoadAssetContainerAsync(
    '/assets/',
    'dunker-transformed.glb',
    scene
  );
  containers.set(scene, loaded);
  return loaded;
}

export async function createMixamoAthlete(
  scene: Scene,
  name: string,
  shadowGen?: ShadowGenerator,
  options?: { seated?: boolean; tint?: Color3 }
): Promise<MixamoAthlete> {
  const container = await loadMixamoContainer(scene);
  const instance = container.instantiateModelsToScene((n) => `${name}_${n}`, false, {
    doNotInstantiate: true,
  });

  const root = instance.rootNodes[0] as TransformNode;
  if (!root) {
    throw new Error('Mixamo dunker GLB produced no root');
  }

  const meshes: AbstractMesh[] = [];
  root.getChildMeshes().forEach((m) => meshes.push(m));

  const bounds = root.getHierarchyBoundingVectors();
  const height = Math.max(0.01, bounds.max.y - bounds.min.y);
  const targetHeight = 1.85;
  const scale = targetHeight / height;
  root.scaling.setAll(scale);

  let skeleton: Skeleton | null = instance.skeletons[0] ?? null;
  if (!skeleton) {
    for (const mesh of meshes) {
      if (mesh.skeleton) {
        skeleton = mesh.skeleton;
        break;
      }
    }
  }

  const bones = new Map<string, Bone>();
  const rest = new Map<string, Quaternion>();
  if (skeleton) {
    for (const bone of skeleton.bones) {
      const clean = sanitizeBoneName(bone.name);
      bones.set(clean, bone);
      const q = bone.getRotationQuaternion(Space.LOCAL);
      rest.set(clean, q ? q.clone() : Quaternion.Identity());
    }
  }

  const anims: MixamoAthlete['anims'] = {};
  for (const group of instance.animationGroups) {
    const key = group.name.toLowerCase();
    if (key.includes('run')) anims.run = group;
    else if (key.includes('walk')) anims.walk = group;
    else if (key.includes('idle')) anims.idle = group;
    else if (key.includes('tpose') || key.includes('t-pose')) anims.tpose = group;
    group.stop();
    group.reset();
  }
  anims.tpose?.stop();

  const tint = options?.tint;
  for (const mesh of meshes) {
    mesh.receiveShadows = true;
    shadowGen?.addShadowCaster(mesh);
    if (tint && mesh.material && 'emissiveColor' in mesh.material) {
      const mat = mesh.material as StandardMaterial;
      mat.emissiveColor = tint.scale(0.12);
    }
  }

  const ballMat = new StandardMaterial(`${name}_ballMat`, scene);
  ballMat.diffuseColor = new Color3(1.0, 0.42, 0.05);
  ballMat.emissiveColor = new Color3(0.22, 0.08, 0.01);
  const basketball = MeshBuilder.CreateSphere(`${name}_basketball`, { diameter: 0.24, segments: 12 }, scene);
  basketball.material = ballMat;
  basketball.parent = root;
  basketball.position.set(0.22, 0.95, 0.18);
  shadowGen?.addShadowCaster(basketball);

  const hand = bones.get('RightHand');
  if (hand && meshes[0]) {
    basketball.attachToBone(hand, meshes[0]);
    basketball.position.set(0.04, 0.08, 0.02);
  }

  const stopClips = () => {
    anims.run?.stop();
    anims.walk?.stop();
    anims.idle?.stop();
    anims.tpose?.stop();
  };

  const playRun = (rate = 1) => {
    stopClips();
    if (anims.run) {
      anims.run.start(true, rate);
    }
  };

  const playIdle = () => {
    stopClips();
    if (anims.idle) {
      anims.idle.start(true, 1);
    }
  };

  const applyEuler = (boneName: string, x: number, y: number, z: number) => {
    const bone = bones.get(boneName);
    const bind = rest.get(boneName);
    if (!bone || !bind) return;
    const delta = Quaternion.FromEulerAngles(x, y, z);
    bone.setRotationQuaternion(bind.multiply(delta), Space.LOCAL);
  };

  const resetPose = () => {
    for (const [name, bone] of bones) {
      const bind = rest.get(name);
      if (bind) bone.setRotationQuaternion(bind.clone(), Space.LOCAL);
    }
    basketball.position.set(0.04, 0.08, 0.02);
  };

  const posePlant = (intensity: number) => {
    stopClips();
    const i = intensity;
    applyEuler('Spine', 0.28 * i, 0, 0);
    applyEuler('Spine1', 0.18 * i, 0, 0);
    applyEuler('LeftUpLeg', 0.85 * i, 0.08 * i, 0);
    applyEuler('RightUpLeg', 0.95 * i, -0.06 * i, 0);
    applyEuler('LeftLeg', 1.15 * i, 0, 0);
    applyEuler('RightLeg', 1.25 * i, 0, 0);
    applyEuler('LeftArm', 0.35 * i, 0, 0.55 * i);
    applyEuler('RightArm', 0.45 * i, 0, -0.65 * i);
  };

  const poseTakeoff = (intensity: number) => {
    stopClips();
    const i = intensity;
    applyEuler('Spine', -0.12 * i, 0, 0);
    applyEuler('LeftUpLeg', -0.15 * i, 0, 0);
    applyEuler('RightUpLeg', 0.55 * i, 0, 0);
    applyEuler('LeftLeg', 0.2 * i, 0, 0);
    applyEuler('RightLeg', 0.85 * i, 0, 0);
    applyEuler('LeftArm', -1.4 * i, 0.2 * i, 0.4 * i);
    applyEuler('RightArm', -1.55 * i, -0.15 * i, -0.35 * i);
    applyEuler('LeftForeArm', -0.35 * i, 0, 0);
    applyEuler('RightForeArm', -0.4 * i, 0, 0);
  };

  const poseReverseTwoHand = (intensity: number) => {
    stopClips();
    resetPose();
    const i = intensity;
    applyEuler('Spine', -0.2 * i, 0, 0);
    applyEuler('Spine1', -0.15 * i, Math.PI * i, 0);
    applyEuler('Spine2', -0.1 * i, 0, 0);
    applyEuler('Hips', 0.08 * i, Math.PI * i, 0);
    applyEuler('LeftUpLeg', 1.05 * i, 0.12 * i, 0);
    applyEuler('RightUpLeg', 1.15 * i, -0.1 * i, 0);
    applyEuler('LeftLeg', 1.35 * i, 0, 0);
    applyEuler('RightLeg', 1.45 * i, 0, 0);
    applyEuler('LeftArm', -2.35 * i, 0.35 * i, 0.55 * i);
    applyEuler('RightArm', -2.45 * i, -0.3 * i, -0.5 * i);
    applyEuler('LeftForeArm', -0.55 * i, 0, 0.2 * i);
    applyEuler('RightForeArm', -0.6 * i, 0, -0.2 * i);
    applyEuler('LeftHand', -0.2 * i, 0, 0);
    applyEuler('RightHand', -0.2 * i, 0, 0);
  };

  /** One-arm chop: right arm high, left tucked. Hang finish from a right cut. */
  const poseTomahawk = (intensity: number) => {
    stopClips();
    resetPose();
    const i = intensity;
    applyEuler('Spine', 0.28 * i, -0.22 * i, 0.08 * i);
    applyEuler('Spine1', 0.18 * i, -0.12 * i, 0);
    applyEuler('Spine2', 0.14 * i, -0.1 * i, 0);
    applyEuler('Neck', 0.28 * i, 0.1 * i, 0);
    applyEuler('Head', 0.2 * i, 0.08 * i, 0);
    applyEuler('RightShoulder', 0.35 * i, -0.55 * i, 0.1 * i);
    applyEuler('LeftShoulder', -0.2 * i, 0.35 * i, 0);
    applyEuler('RightArm', -2.85 * i, -0.15 * i, -0.35 * i);
    applyEuler('LeftArm', -0.45 * i, 0.85 * i, 0.4 * i);
    applyEuler('RightForeArm', -0.05 * i, 0, 0);
    applyEuler('LeftForeArm', -1.35 * i, 0.2 * i, 0);
    applyEuler('LeftUpLeg', 0.55 * i, 0.22 * i, 0.08 * i);
    applyEuler('RightUpLeg', 0.08 * i, -0.12 * i, 0);
    applyEuler('LeftLeg', 0.75 * i, 0, 0);
    applyEuler('RightLeg', 0.18 * i, 0, 0);
    applyEuler('LeftFoot', 0.25 * i, 0, 0);
    applyEuler('RightFoot', 0.12 * i, 0, 0);
  };

  /** Windmill: left arm sweeps low-to-high across the body. Hang finish from a left cut. */
  const poseWindmill = (intensity: number) => {
    stopClips();
    resetPose();
    const i = intensity;
    applyEuler('Spine', 0.22 * i, 0.35 * i, -0.12 * i);
    applyEuler('Spine1', 0.16 * i, 0.22 * i, 0);
    applyEuler('Spine2', 0.12 * i, 0.18 * i, 0);
    applyEuler('Neck', 0.15 * i, -0.15 * i, 0);
    applyEuler('Head', 0.1 * i, -0.1 * i, 0);
    applyEuler('LeftShoulder', 0.4 * i, 0.7 * i, 0.2 * i);
    applyEuler('RightShoulder', -0.15 * i, -0.25 * i, 0);
    applyEuler('LeftArm', -0.35 * i, 1.55 * i, 1.8 * i);
    applyEuler('RightArm', -1.65 * i, -0.45 * i, -0.2 * i);
    applyEuler('LeftForeArm', -0.25 * i, 0.4 * i, 0);
    applyEuler('RightForeArm', -0.85 * i, 0, 0);
    applyEuler('LeftUpLeg', 0.18 * i, 0.15 * i, 0);
    applyEuler('RightUpLeg', 0.62 * i, -0.28 * i, -0.1 * i);
    applyEuler('LeftLeg', 0.22 * i, 0, 0);
    applyEuler('RightLeg', 0.88 * i, 0, 0);
    applyEuler('LeftFoot', 0.15 * i, 0, 0);
    applyEuler('RightFoot', 0.28 * i, 0, 0);
  };

  /** 360: body yaw lives on the root; arms wrap the ball for the spin. */
  const poseThreeSixty = (intensity: number) => {
    stopClips();
    resetPose();
    const i = intensity;
    applyEuler('Spine', 0.08 * i, 0.45 * i, 0);
    applyEuler('Spine1', 0.1 * i, 0.2 * i, 0);
    applyEuler('Spine2', 0.08 * i, 0.12 * i, 0);
    applyEuler('Neck', 0.05 * i, -0.25 * i, 0);
    applyEuler('Head', 0.08 * i, -0.15 * i, 0);
    applyEuler('LeftShoulder', 0.2 * i, 0.55 * i, 0.15 * i);
    applyEuler('RightShoulder', 0.2 * i, -0.55 * i, -0.15 * i);
    applyEuler('LeftArm', -1.85 * i, 1.15 * i, 0.55 * i);
    applyEuler('RightArm', -1.85 * i, -1.15 * i, -0.55 * i);
    applyEuler('LeftForeArm', -0.95 * i, 0.35 * i, 0);
    applyEuler('RightForeArm', -0.95 * i, -0.35 * i, 0);
    applyEuler('LeftUpLeg', 0.42 * i, 0.18 * i, 0.15 * i);
    applyEuler('RightUpLeg', 0.28 * i, -0.22 * i, -0.12 * i);
    applyEuler('LeftLeg', 0.48 * i, 0, 0);
    applyEuler('RightLeg', 0.35 * i, 0, 0);
    applyEuler('LeftFoot', 0.18 * i, 0, 0);
    applyEuler('RightFoot', 0.16 * i, 0, 0);
  };

  const poseHangStyle = (style: HangStyle, intensity: number) => {
    if (style === 'WINDMILL') poseWindmill(intensity);
    else if (style === 'TOMAHAWK') poseTomahawk(intensity);
    else if (style === '360_SPIN') poseThreeSixty(intensity);
    else poseReverseTwoHand(intensity);
  };

  const poseSit = () => {
    stopClips();
    applyEuler('Spine', 0.15, 0, 0);
    applyEuler('LeftUpLeg', 1.35, 0.08, 0);
    applyEuler('RightUpLeg', 1.35, -0.08, 0);
    applyEuler('LeftLeg', 1.45, 0, 0);
    applyEuler('RightLeg', 1.45, 0, 0);
    applyEuler('LeftArm', 0.35, 0, 0.4);
    applyEuler('RightArm', 0.35, 0, -0.4);
  };

  const poseReact = (kind: CrowdReact, intensity = 1) => {
    stopClips();
    const i = intensity;
    applyEuler('LeftUpLeg', 1.28, 0.08, 0);
    applyEuler('RightUpLeg', 1.28, -0.08, 0);
    applyEuler('LeftLeg', 1.4, 0, 0);
    applyEuler('RightLeg', 1.4, 0, 0);
    if (kind === 'sit') {
      poseSit();
      return;
    }
    if (kind === 'watch') {
      applyEuler('Spine', 0.28 * i, 0, 0);
      applyEuler('Neck', 0.22 * i, 0, 0);
      applyEuler('LeftArm', 0.5 * i, 0, 0.2);
      applyEuler('RightArm', 0.5 * i, 0, -0.2);
      return;
    }
    if (kind === 'rise' || kind === 'cheer') {
      const up = kind === 'cheer' ? 1 : 0.62;
      applyEuler('Spine', -0.18 * i, 0, 0);
      applyEuler('LeftArm', -2.05 * i * up, 0.18 * i, 0.28 * i);
      applyEuler('RightArm', -2.15 * i * up, -0.16 * i, -0.28 * i);
      return;
    }
    applyEuler('Spine', -0.08 * i, 0.12 * i, 0);
    applyEuler('LeftArm', 0.55 * i, 0, 0.75 * i);
    applyEuler('RightArm', -0.9 * i, 0, -0.35 * i);
  };

  if (options?.seated) {
    poseSit();
    basketball.setEnabled(false);
  } else {
    playIdle();
  }

  const dispose = () => {
    stopClips();
    instance.animationGroups.forEach((g) => g.dispose());
    instance.skeletons.forEach((s) => s.dispose());
    instance.rootNodes.forEach((n) => n.dispose());
    basketball.dispose();
  };

  return {
    root,
    meshes,
    skeleton,
    bones,
    rest,
    anims,
    basketball,
    playRun,
    playIdle,
    stopClips,
    posePlant,
    poseTakeoff,
    poseReverseTwoHand,
    poseWindmill,
    poseTomahawk,
    poseThreeSixty,
    poseHangStyle,
    poseSit,
    poseReact,
    resetPose,
    dispose,
  };
}
