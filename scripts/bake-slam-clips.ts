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

  const out = new URL('../src/lib/babylon/slamClipTracks.json', import.meta.url);
  writeFileSync(out, `${JSON.stringify(tracks, null, 2)}\n`);
  console.log(`baked ${Object.keys(tracks).length} slam clips → ${out.pathname}`);
  scene.dispose();
  engine.dispose();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
