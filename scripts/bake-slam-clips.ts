/**
 * Bake Mixamo-local quaternion slam tracks from the GLB bind.
 * Runtime hang plays these clips — it does not applyEuler after resetPose.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { NullEngine, Scene, Quaternion, Space } from '@babylonjs/core';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';
import { sanitizeBoneName } from '../src/lib/rigSanitizer';
import { SLAM_CLIP_KEYS, type HangStyle } from '../src/lib/babylon/slamSilhouettes';

if (typeof globalThis.FileReader === 'undefined') {
  class NodeFileReader {
    result: ArrayBuffer | null = null;
    onload: ((ev: { target: NodeFileReader }) => void) | null = null;
    onerror: ((ev: unknown) => void) | null = null;
    readAsArrayBuffer(blob: Blob) {
      void blob.arrayBuffer().then(
        (buf) => {
          this.result = buf;
          this.onload?.({ target: this });
        },
        (err) => this.onerror?.(err)
      );
    }
    abort() {}
  }
  (globalThis as unknown as { FileReader: typeof NodeFileReader }).FileReader = NodeFileReader;
}

const FPS = 60;
const DURATION = 0.4;

async function main() {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const bytes = readFileSync(new URL('../public/assets/dunker-transformed.glb', import.meta.url));
  const container = await SceneLoader.LoadAssetContainerAsync(
    '',
    new File([bytes], 'dunker-transformed.glb'),
    scene
  );
  const skeleton = container.skeletons[0];
  if (!skeleton) throw new Error('GLB has no skeleton');

  const rest = new Map<string, Quaternion>();
  for (const bone of skeleton.bones) {
    const q = bone.getRotationQuaternion(Space.LOCAL);
    rest.set(sanitizeBoneName(bone.name), q ? q.clone() : Quaternion.Identity());
  }

  const styles: HangStyle[] = ['REVERSE_TWO_HAND', 'WINDMILL', 'TOMAHAWK', '360_SPIN'];
  const tracks: Record<
    string,
    { fps: number; duration: number; bones: Record<string, Array<{ frame: number; q: number[] }>> }
  > = {};

  for (const style of styles) {
    const keys = SLAM_CLIP_KEYS[style];
    const endFrame = Math.round(DURATION * FPS);
    const boneNames = new Set<string>();
    for (const kf of keys) {
      for (const name of Object.keys(kf.map)) boneNames.add(name);
    }
    const bones: Record<string, Array<{ frame: number; q: number[] }>> = {};
    for (const boneName of boneNames) {
      const bind = rest.get(boneName);
      if (!bind) continue;
      bones[boneName] = keys.map((kf) => {
        const spin = kf.map[boneName];
        const q = spin
          ? bind.multiply(Quaternion.FromEulerAngles(spin.x, spin.y, spin.z))
          : bind.clone();
        return { frame: Math.round(kf.t * endFrame), q: [q.x, q.y, q.z, q.w] };
      });
    }
    tracks[style] = { fps: FPS, duration: DURATION, bones };
  }

  const approach: Record<string, Array<{ t: number; map: Record<string, { x: number; y: number; z: number }> }>> = {
    PLANT: [
      { t: 0, map: {} },
      {
        t: 1,
        map: {
          Spine: { x: 0.32, y: 0, z: 0 },
          Spine1: { x: 0.2, y: 0, z: 0 },
          LeftUpLeg: { x: 0.95, y: 0.08, z: 0 },
          RightUpLeg: { x: 1.05, y: -0.06, z: 0 },
          LeftLeg: { x: 1.15, y: 0, z: 0 },
          RightLeg: { x: 1.22, y: 0, z: 0 },
          LeftArm: { x: 0, y: 0, z: -0.45 },
          RightArm: { x: 0, y: 0, z: -0.45 },
        },
      },
    ],
    TAKEOFF: [
      { t: 0, map: {} },
      {
        t: 1,
        map: {
          Spine: { x: -0.12, y: 0, z: 0 },
          LeftUpLeg: { x: -0.12, y: 0, z: 0 },
          RightUpLeg: { x: 0.72, y: 0, z: 0 },
          LeftLeg: { x: 0.22, y: 0, z: 0 },
          RightLeg: { x: 0.85, y: 0, z: 0 },
          LeftShoulder: { x: 0, y: 0, z: -0.35 },
          RightShoulder: { x: 0, y: 0, z: -0.35 },
          LeftArm: { x: 0, y: 0, z: -0.85 },
          RightArm: { x: 0, y: 0, z: -0.85 },
          LeftForeArm: { x: -0.22, y: 0, z: 0 },
          RightForeArm: { x: -0.22, y: 0, z: 0 },
        },
      },
    ],
  };

  for (const [name, keys] of Object.entries(approach)) {
    const endFrame = Math.round(0.2 * FPS);
    const boneNames = new Set<string>();
    for (const kf of keys) {
      for (const bone of Object.keys(kf.map)) boneNames.add(bone);
    }
    const bones: Record<string, Array<{ frame: number; q: number[] }>> = {};
    for (const boneName of boneNames) {
      const bind = rest.get(boneName);
      if (!bind) continue;
      bones[boneName] = keys.map((kf) => {
        const spin = kf.map[boneName];
        const q = spin
          ? bind.multiply(Quaternion.FromEulerAngles(spin.x, spin.y, spin.z))
          : bind.clone();
        return { frame: Math.round(kf.t * endFrame), q: [q.x, q.y, q.z, q.w] };
      });
    }
    tracks[name] = { fps: FPS, duration: 0.2, bones };
  }

  const out = new URL('../src/lib/babylon/slamClipTracks.json', import.meta.url);
  writeFileSync(out, `${JSON.stringify(tracks, null, 2)}\n`);
  console.log(`baked ${Object.keys(tracks).length} body clips → ${out.pathname}`);
  scene.dispose();
  engine.dispose();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
