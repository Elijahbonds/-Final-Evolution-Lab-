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
  Axis,
} from '@babylonjs/core';
import { sanitizeBoneName } from '../rigSanitizer';
import { HangStyle, SLAM_SPINS, SlamMap } from './slamSilhouettes';

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
export type { HangStyle } from './slamSilhouettes';

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

  const writeLocal = (bone: Bone, q: Quaternion) => {
    bone.setRotationQuaternion(q, Space.LOCAL);
    const node = bone.getTransformNode();
    if (node) {
      if (!node.rotationQuaternion) node.rotationQuaternion = q.clone();
      else node.rotationQuaternion.copyFrom(q);
    }
  };

  const applyEuler = (boneName: string, x: number, y: number, z: number) => {
    const bone = bones.get(boneName);
    const bind = rest.get(boneName);
    if (!bone || !bind) return;
    const delta = Quaternion.FromEulerAngles(x, y, z);
    writeLocal(bone, bind.multiply(delta));
  };

  const resetPose = () => {
    for (const [name, bone] of bones) {
      const bind = rest.get(name);
      if (bind) writeLocal(bone, bind.clone());
    }
    basketball.position.set(0.04, 0.08, 0.02);
  };

  /**
   * Drive the skinned mesh from T-pose bind with world-space spins.
   * Local Euler-on-bind was a spine twist on a T-pose — the mesh never slammed.
   */
  const applyWorldSlam = (map: SlamMap, intensity: number) => {
    stopClips();
    resetPose();
    const i = Math.max(0, Math.min(1, intensity));
    for (const [name, spin] of Object.entries(map)) {
      const bone = bones.get(name);
      const bind = rest.get(name);
      if (!bone || !bind) continue;
      writeLocal(bone, bind.clone());
      if (spin.x) bone.rotate(Axis.X, spin.x * i, Space.WORLD);
      if (spin.y) bone.rotate(Axis.Y, spin.y * i, Space.WORLD);
      if (spin.z) bone.rotate(Axis.Z, spin.z * i, Space.WORLD);
      const q = bone.getRotationQuaternion(Space.LOCAL);
      if (q) writeLocal(bone, q);
    }
    skeleton?.computeAbsoluteTransforms();
  };

  const posePlant = (intensity: number) => {
    applyWorldSlam(
      {
        Spine: { x: 0.32, y: 0, z: 0 },
        Spine1: { x: 0.2, y: 0, z: 0 },
        LeftUpLeg: { x: 0.95, y: 0.08, z: 0 },
        RightUpLeg: { x: 1.05, y: -0.06, z: 0 },
        LeftLeg: { x: 1.15, y: 0, z: 0 },
        RightLeg: { x: 1.22, y: 0, z: 0 },
        LeftArm: { x: 0.25, y: 0.15, z: 0.45 },
        RightArm: { x: 0.28, y: -0.15, z: -0.5 },
      },
      intensity
    );
  };

  const poseTakeoff = (intensity: number) => {
    applyWorldSlam(
      {
        Spine: { x: -0.14, y: 0, z: 0 },
        LeftUpLeg: { x: -0.12, y: 0, z: 0 },
        RightUpLeg: { x: 0.72, y: 0, z: 0 },
        LeftLeg: { x: 0.22, y: 0, z: 0 },
        RightLeg: { x: 0.85, y: 0, z: 0 },
        LeftArm: { x: 0.15, y: 0.12, z: 1.15 },
        RightArm: { x: 0.18, y: -0.12, z: -1.22 },
        LeftForeArm: { x: -0.28, y: 0, z: 0 },
        RightForeArm: { x: -0.32, y: 0, z: 0 },
      },
      intensity
    );
  };

  const poseReverseTwoHand = (intensity: number) => {
    applyWorldSlam(SLAM_SPINS.REVERSE_TWO_HAND, intensity);
  };

  const poseTomahawk = (intensity: number) => {
    applyWorldSlam(SLAM_SPINS.TOMAHAWK, intensity);
  };

  const poseWindmill = (intensity: number) => {
    applyWorldSlam(SLAM_SPINS.WINDMILL, intensity);
  };

  const poseThreeSixty = (intensity: number) => {
    applyWorldSlam(SLAM_SPINS['360_SPIN'], intensity);
  };

  const poseHangStyle = (style: HangStyle, intensity: number) => {
    applyWorldSlam(SLAM_SPINS[style], intensity);
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
