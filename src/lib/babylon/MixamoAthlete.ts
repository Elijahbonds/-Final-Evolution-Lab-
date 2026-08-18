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
  Animation,
  AnimationGroup,
  Skeleton,
  Bone,
  AbstractMesh,
  Mesh,
  MeshBuilder,
  Quaternion,
  Vector3,
  Color3,
  StandardMaterial,
  TransformNode,
  Space,
  ShadowGenerator,
} from '@babylonjs/core';
import { sanitizeBoneName } from '../rigSanitizer';
import {
  HangStyle,
  HANG_STYLES,
  SLAM_TRACKS,
  APPROACH_TRACKS,
  slamTrackFrame,
  sampleTrackQuat,
  type SlamTrack,
} from './slamClips';

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
    slam: Record<HangStyle, AnimationGroup>;
  };
  basketball: Mesh;
  playRun: (rate?: number) => void;
  playIdle: () => void;
  stopClips: () => void;
  playSlam: (style: HangStyle, t01?: number) => void;
  seekSlam: (style: HangStyle, t01: number) => void;
  posePlant: (intensity: number) => void;
  poseTakeoff: (intensity: number) => void;
  poseReverseTwoHand: (intensity: number) => void;
  poseWindmill: (intensity: number) => void;
  poseTomahawk: (intensity: number) => void;
  poseThreeSixty: (intensity: number) => void;
  poseHangStyle: (style: HangStyle, intensity: number) => void;
  boneWorld: (name: string) => Vector3;
  poseSit: () => void;
  poseReact: (kind: CrowdReact, intensity?: number) => void;
  resetPose: () => void;
  dispose: () => void;
}

export type CrowdReact = 'sit' | 'watch' | 'rise' | 'cheer' | 'miss';
export type { HangStyle } from './slamClips';

const containers = new WeakMap<Scene, AssetContainer>();

export async function loadMixamoContainer(
  scene: Scene,
  rootUrl: string | File = '/assets/'
): Promise<AssetContainer> {
  const existing = containers.get(scene);
  if (existing) return existing;
  const loaded =
    rootUrl instanceof File
      ? await SceneLoader.LoadAssetContainerAsync('', rootUrl, scene)
      : await SceneLoader.LoadAssetContainerAsync(rootUrl, 'dunker-transformed.glb', scene);
  containers.set(scene, loaded);
  return loaded;
}

export async function createMixamoAthlete(
  scene: Scene,
  name: string,
  shadowGen?: ShadowGenerator,
  options?: { seated?: boolean; tint?: Color3; rootUrl?: string; file?: File }
): Promise<MixamoAthlete> {
  const container = await loadMixamoContainer(scene, options?.file ?? options?.rootUrl ?? '/assets/');
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

  const anims: MixamoAthlete['anims'] = {
    slam: {} as Record<HangStyle, AnimationGroup>,
  };
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

  const stopLocoClips = () => {
    anims.run?.stop();
    anims.walk?.stop();
    anims.idle?.stop();
    anims.tpose?.stop();
  };

  const stopSlamClips = () => {
    for (const group of Object.values(anims.slam)) {
      group.stop();
    }
  };

  const stopClips = () => {
    stopLocoClips();
    stopSlamClips();
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

  const flushPose = () => {
    skeleton?.computeAbsoluteTransforms();
    root.computeWorldMatrix(true);
  };

  const writeTrack = (track: SlamTrack, t01: number) => {
    const frame = slamTrackFrame(track, t01);
    for (const [boneName, keys] of Object.entries(track.bones)) {
      const bone = bones.get(boneName);
      const sampled = sampleTrackQuat(keys, frame);
      if (!bone || !sampled) continue;
      writeLocal(bone, new Quaternion(sampled[0], sampled[1], sampled[2], sampled[3]));
    }
    flushPose();
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

  const boneWorld = (name: string): Vector3 => {
    const bone = bones.get(name);
    if (!bone) return new Vector3(Number.NaN, Number.NaN, Number.NaN);
    skeleton?.computeAbsoluteTransforms();
    const node = bone.getTransformNode();
    if (node) {
      node.computeWorldMatrix(true);
      return node.getAbsolutePosition().clone();
    }
    return Vector3.TransformCoordinates(Vector3.Zero(), bone.getAbsoluteTransform());
  };

  const posePlant = (intensity: number) => {
    stopLocoClips();
    stopSlamClips();
    writeTrack(APPROACH_TRACKS.PLANT, intensity);
  };

  const poseTakeoff = (intensity: number) => {
    stopLocoClips();
    stopSlamClips();
    writeTrack(APPROACH_TRACKS.TAKEOFF, intensity);
  };

  const buildSlamClip = (style: HangStyle): AnimationGroup => {
    const track = SLAM_TRACKS[style];
    const group = new AnimationGroup(`${name}_slam_${style}`, scene);
    const endFrame = Math.round(track.duration * track.fps);
    for (const [boneName, keys] of Object.entries(track.bones)) {
      const bone = bones.get(boneName);
      const bind = rest.get(boneName);
      if (!bone || !bind) continue;
      const makeAnim = (animName: string) => {
        const anim = new Animation(
          animName,
          'rotationQuaternion',
          track.fps,
          Animation.ANIMATIONTYPE_QUATERNION,
          Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        anim.setKeys(
          keys.map((k) => ({
            frame: k.frame,
            value: new Quaternion(k.q[0], k.q[1], k.q[2], k.q[3]),
          }))
        );
        return anim;
      };
      group.addTargetedAnimation(makeAnim(`${name}_${style}_${boneName}`), bone);
      const node = bone.getTransformNode();
      if (node) {
        if (!node.rotationQuaternion) node.rotationQuaternion = bind.clone();
        group.addTargetedAnimation(makeAnim(`${name}_${style}_${boneName}_node`), node);
      }
    }
    group.normalize(0, endFrame);
    group.onAnimationGroupEndObservable.add(() => {
      group.goToFrame(endFrame);
      group.pause();
    });
    return group;
  };

  HANG_STYLES.forEach((style) => {
    anims.slam[style] = buildSlamClip(style);
  });

  const applyBakedSlamFrame = (style: HangStyle, t01: number) => {
    writeTrack(SLAM_TRACKS[style], t01);
    const group = anims.slam[style];
    if (group) {
      const frame = slamTrackFrame(SLAM_TRACKS[style], t01);
      if (!group.isPlaying) group.start(false, 1, 0, group.to);
      group.goToFrame(frame);
    }
  };

  let playingSlam: HangStyle | null = null;
  let slamStartedMs = 0;

  const seekSlam = (style: HangStyle, t01: number) => {
    stopLocoClips();
    for (const [other, group] of Object.entries(anims.slam)) {
      if (other !== style) group.stop();
    }
    playingSlam = style;
    applyBakedSlamFrame(style, t01);
  };

  const playSlam = (style: HangStyle, t01?: number) => {
    const group = anims.slam[style];
    if (!group) return;
    stopLocoClips();
    if (t01 != null) {
      seekSlam(style, t01);
      return;
    }
    if (playingSlam !== style) {
      for (const [other, otherGroup] of Object.entries(anims.slam)) {
        if (other !== style) otherGroup.stop();
      }
      playingSlam = style;
      slamStartedMs = performance.now();
      group.start(false, 1, 0, group.to);
    }
    const elapsed = (performance.now() - slamStartedMs) / 1000;
    const t = Math.min(1, elapsed / Math.max(0.08, SLAM_TRACKS[style].duration));
    applyBakedSlamFrame(style, t);
  };

  const poseReverseTwoHand = (intensity: number) => {
    seekSlam('REVERSE_TWO_HAND', intensity);
  };

  const poseTomahawk = (intensity: number) => {
    seekSlam('TOMAHAWK', intensity);
  };

  const poseWindmill = (intensity: number) => {
    seekSlam('WINDMILL', intensity);
  };

  const poseThreeSixty = (intensity: number) => {
    seekSlam('360_SPIN', intensity);
  };

  const poseHangStyle = (style: HangStyle, intensity: number) => {
    seekSlam(style, intensity);
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
    Object.values(anims.slam).forEach((g) => g.dispose());
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
    playSlam,
    seekSlam,
    posePlant,
    poseTakeoff,
    poseReverseTwoHand,
    poseWindmill,
    poseTomahawk,
    poseThreeSixty,
    poseHangStyle,
    boneWorld,
    poseSit,
    poseReact,
    resetPose,
    dispose,
  };
}
