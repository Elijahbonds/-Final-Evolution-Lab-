/**
 * Mesh proof: load the Mixamo GLB and measure hand world positions.
 * Euler tables that do not move the skin fail this.
 */
import { readFileSync } from 'node:fs';
import { NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { createMixamoAthlete } from '../src/lib/babylon/MixamoAthlete';
import { CMU_LAYUP_BVH, ELIJAH_DUNK_BVH } from '../src/lib/babylon/bvhRetarget';

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

function dist(a: Vector3, b: Vector3): number {
  return Vector3.Distance(a, b);
}

export async function runMixamoSlamMeshTests(): Promise<Array<{ name: string; passed: boolean; actual: string; expected: string }>> {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const bytes = readFileSync(new URL('../public/assets/dunker-transformed.glb', import.meta.url));
  const elijahUrl = new URL(`../public/assets/${ELIJAH_DUNK_BVH}`, import.meta.url);
  const cmuUrl = new URL(`../public/assets/${CMU_LAYUP_BVH}`, import.meta.url);
  let bvhPath = cmuUrl;
  try {
    readFileSync(elijahUrl);
    bvhPath = elijahUrl;
  } catch {
    /* FEL-unity take is not in this checkout */
  }
  const bvhText = readFileSync(bvhPath, 'utf8');
  const athlete = await createMixamoAthlete(scene, 'meshProof', undefined, {
    file: new File([bytes], 'dunker-transformed.glb'),
    dunkBvh: bvhText,
  });
  athlete.stopClips();
  athlete.resetPose();

  const tposeL = athlete.boneWorld('LeftHand');
  const tposeHead = athlete.boneWorld('Head');

  athlete.seekSlam('REVERSE_TWO_HAND', 0);
  const hang0 = { l: athlete.boneWorld('LeftHand'), r: athlete.boneWorld('RightHand') };
  athlete.seekSlam('REVERSE_TWO_HAND', 0.5);
  const hangMid = { l: athlete.boneWorld('LeftHand'), r: athlete.boneWorld('RightHand') };
  athlete.seekSlam('REVERSE_TWO_HAND', 1);
  const hangEnd = { l: athlete.boneWorld('LeftHand'), r: athlete.boneWorld('RightHand') };

  const clipName = athlete.dunkTakeName;
  const groupName = athlete.anims.dunkTake?.name ?? '';
  const notEulerKeys =
    !clipName.includes('SLAM_CLIP_KEYS') &&
    !groupName.includes('SLAM_CLIP_KEYS') &&
    !groupName.includes('_slam_REVERSE') &&
    (clipName === 'basketball_dunk__elijah' || clipName === 'cmu_124_06_basketball_layup');

  const sweep =
    dist(hangMid.l, hang0.l) + dist(hangEnd.l, hangMid.l) + dist(hangMid.r, hang0.r) > 0.18 &&
    (athlete.anims.dunkTake?.targetedAnimations.length ?? 0) > 8;

  const leftTheTpose =
    dist(hangEnd.l, tposeL) > 0.12 ||
    dist(hangMid.l, tposeL) > 0.12 ||
    Math.abs(hangEnd.l.y - tposeL.y) > 0.1;

  const src = readFileSync(new URL('../src/lib/babylon/MixamoAthlete.ts', import.meta.url), 'utf8');
  const hangFromBvh =
    src.includes('bvhRetarget') &&
    src.includes('dunkTake') &&
    !src.includes('SLAM_CLIP_KEYS') &&
    !src.includes("from './slamSilhouettes'") &&
    !src.includes('applyLocalSlam') &&
    !src.includes('buildSlamClip');

  const results = [
    {
      name: 'Hang clip is the imported mocap take, not SLAM_CLIP_KEYS',
      passed: notEulerKeys && !!athlete.anims.dunkTake,
      actual: `clip=${clipName} group=${groupName} tracks=${athlete.anims.dunkTake?.targetedAnimations.length ?? 0}`,
      expected: 'basketball_dunk__elijah or cmu_124_06_basketball_layup — not SLAM_CLIP_KEYS',
    },
    {
      name: 'Retargeted hang take moves the Mixamo skin off T-pose',
      passed: sweep && leftTheTpose,
      actual: `tposeL=${tposeL.y.toFixed(3)} hang0=${hang0.l.y.toFixed(3)} mid=${hangMid.l.y.toFixed(3)} end=${hangEnd.l.y.toFixed(3)} head=${tposeHead.y.toFixed(3)} sweep=${(dist(hangMid.l, hang0.l) + dist(hangEnd.l, hangMid.l)).toFixed(3)}`,
      expected: 'hands leave T-pose as the mocap hang window is sampled',
    },
    {
      name: 'Hang slam path is the imported BVH take, not slamSilhouettes Euler',
      passed: hangFromBvh,
      actual: `bvh=${src.includes('bvhRetarget')} dunkTake=${src.includes('dunkTake')} clipKeys=${src.includes('SLAM_CLIP_KEYS')}`,
      expected: 'MixamoAthlete hang imports bvhRetarget / dunkTake, not SLAM_CLIP_KEYS',
    },
  ];

  athlete.dispose();
  scene.dispose();
  engine.dispose();
  return results;
}

const nodeProcess = typeof process !== 'undefined' ? process : undefined;
if (nodeProcess?.argv?.[1]?.includes('mixamo-slam-mesh')) {
  console.log('=== MIXAMO SLAM MESH ===\n');
  const rows = await runMixamoSlamMeshTests();
  let all = true;
  for (const t of rows) {
    console.log(`${t.passed ? '✓ PASS' : '✗ FAIL'} | ${t.name}`);
    console.log(`  Actual: ${t.actual}`);
    console.log(`  Expected: ${t.expected}\n`);
    if (!t.passed) all = false;
  }
  if (!all) {
    console.error('Mixamo slam mesh tests failed.');
    nodeProcess?.exit(1);
  } else {
    console.log('Mixamo slam mesh verified.');
  }
}
