/**
 * Load the Mixamo GLB under NullEngine and measure hand world positions.
 * Proves the skinned bones actually leave T-pose — tables of Euler numbers do not.
 */
import { readFileSync } from 'node:fs';
import { NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { createMixamoAthlete } from '../src/lib/babylon/MixamoAthlete';
import type { HangStyle } from '../src/lib/babylon/slamClips';

if (typeof globalThis.FileReader === 'undefined') {
  class NodeFileReader {
    result: ArrayBuffer | null = null;
    onload: ((ev: { target: NodeFileReader }) => void) | null = null;
    onerror: ((ev: unknown) => void) | null = null;
    readAsArrayBuffer(blob: Blob) {
      void blob.arrayBuffer().then((buf) => {
        this.result = buf;
        this.onload?.({ target: this });
      }, (err) => this.onerror?.(err));
    }
    abort() {}
  }
  (globalThis as unknown as { FileReader: typeof NodeFileReader }).FileReader = NodeFileReader;
}

function boneWorld(athlete: Awaited<ReturnType<typeof createMixamoAthlete>>, name: string): Vector3 {
  return athlete.boneWorld(name);
}

async function main() {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const bytes = readFileSync(new URL('../public/assets/dunker-transformed.glb', import.meta.url));
  const file = new File([bytes], 'dunker-transformed.glb');
  const athlete = await createMixamoAthlete(scene, 'measureDunker', undefined, { file });
  athlete.stopClips();
  athlete.resetPose();
  athlete.root.position.set(0, 0, 0);
  athlete.root.rotation.set(0, 0, 0);
  athlete.root.computeWorldMatrix(true);

  const tpose = {
    left: boneWorld(athlete, 'LeftHand'),
    right: boneWorld(athlete, 'RightHand'),
    head: boneWorld(athlete, 'Head'),
    hips: boneWorld(athlete, 'Hips'),
  };

  const styles: HangStyle[] = ['REVERSE_TWO_HAND', 'WINDMILL', 'TOMAHAWK', '360_SPIN'];
  const posed: Record<string, { left: Vector3; right: Vector3; head: Vector3 }> = {};
  for (const style of styles) {
    athlete.poseHangStyle(style, 1);
    athlete.root.computeWorldMatrix(true);
    posed[style] = {
      left: boneWorld(athlete, 'LeftHand'),
      right: boneWorld(athlete, 'RightHand'),
      head: boneWorld(athlete, 'Head'),
    };
  }

  const report = {
    tpose: {
      left: tpose.left.asArray().map((n) => +n.toFixed(3)),
      right: tpose.right.asArray().map((n) => +n.toFixed(3)),
      head: tpose.head.asArray().map((n) => +n.toFixed(3)),
      hips: tpose.hips.asArray().map((n) => +n.toFixed(3)),
    },
    posed: Object.fromEntries(
      styles.map((s) => [
        s,
        {
          left: posed[s].left.asArray().map((n) => +n.toFixed(3)),
          right: posed[s].right.asArray().map((n) => +n.toFixed(3)),
          head: posed[s].head.asArray().map((n) => +n.toFixed(3)),
          leftUp: +(posed[s].left.y - tpose.left.y).toFixed(3),
          rightUp: +(posed[s].right.y - tpose.right.y).toFixed(3),
          leftAboveHead: posed[s].left.y > posed[s].head.y - 0.08,
          rightAboveHead: posed[s].right.y > posed[s].head.y - 0.08,
        },
      ])
    ),
  };
  console.log(JSON.stringify(report, null, 2));

  athlete.dispose();
  scene.dispose();
  engine.dispose();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
