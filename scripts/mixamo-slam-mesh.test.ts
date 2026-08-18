/**
 * Mesh proof: load the Mixamo GLB and measure hand world positions.
 * Euler tables that do not move the skin fail this.
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

function dist(a: Vector3, b: Vector3): number {
  return Vector3.Distance(a, b);
}

export async function runMixamoSlamMeshTests(): Promise<Array<{ name: string; passed: boolean; actual: string; expected: string }>> {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const bytes = readFileSync(new URL('../public/assets/dunker-transformed.glb', import.meta.url));
  const athlete = await createMixamoAthlete(scene, 'meshProof', undefined, {
    file: new File([bytes], 'dunker-transformed.glb'),
  });
  athlete.stopClips();
  athlete.resetPose();

  const tposeL = athlete.boneWorld('LeftHand');
  const tposeR = athlete.boneWorld('RightHand');
  const tposeHead = athlete.boneWorld('Head');

  const styles: HangStyle[] = ['REVERSE_TWO_HAND', 'WINDMILL', 'TOMAHAWK', '360_SPIN'];
  const posed = {} as Record<HangStyle, { l: Vector3; r: Vector3; h: Vector3 }>;
  for (const style of styles) {
    athlete.seekSlam(style, 1);
    posed[style] = {
      l: athlete.boneWorld('LeftHand'),
      r: athlete.boneWorld('RightHand'),
      h: athlete.boneWorld('Head'),
    };
  }

  athlete.seekSlam('WINDMILL', 0);
  const mill0 = { l: athlete.boneWorld('LeftHand'), r: athlete.boneWorld('RightHand') };
  athlete.seekSlam('WINDMILL', 0.32);
  const millMid = { l: athlete.boneWorld('LeftHand'), r: athlete.boneWorld('RightHand') };
  athlete.seekSlam('WINDMILL', 1);
  const millEnd = { l: athlete.boneWorld('LeftHand'), r: athlete.boneWorld('RightHand') };
  const millSweep =
    dist(millMid.l, mill0.l) > 0.12 &&
    dist(millEnd.l, millMid.l) > 0.1 &&
    athlete.anims.slam.WINDMILL.targetedAnimations.length > 0;

  const rev = posed.REVERSE_TWO_HAND;
  const mill = posed.WINDMILL;
  const hawk = posed.TOMAHAWK;
  const spin = posed['360_SPIN'];

  const reverseUp =
    rev.l.y >= tposeHead.y + 0.32 &&
    rev.r.y >= tposeHead.y + 0.32 &&
    rev.l.y >= tposeL.y + 0.40 &&
    rev.r.y >= tposeR.y + 0.40 &&
    Math.abs(rev.l.x - rev.r.x) < 0.5;

  const millDifferent =
    dist(mill.l, rev.l) > 0.28 &&
    dist(mill.r, mill.l) > 0.22;

  const hawkChop = hawk.r.y > hawk.l.y + 0.28 && hawk.r.y >= tposeHead.y + 0.2;

  const wrapNotReverse =
    (spin.l.y + spin.r.y) / 2 < (rev.l.y + rev.r.y) / 2 - 0.1 &&
    dist(spin.l, rev.l) > 0.2;

  const src = readFileSync(new URL('../src/lib/babylon/MixamoAthlete.ts', import.meta.url), 'utf8');
  const recipeFree =
    !src.includes("from './slamSilhouettes'") &&
    !src.includes('SLAM_CLIP_KEYS') &&
    !src.includes('SLAM_SPINS') &&
    src.includes('slamClips') &&
    src.includes('applyBakedSlamFrame') &&
    !src.includes('applyLocalSlam');

  const results = [
    {
      name: 'Reverse two-hand puts both Mixamo hands overhead (not a T-pose shrug)',
      passed: reverseUp,
      actual: `tposeL=${tposeL.y.toFixed(3)} revL=${rev.l.y.toFixed(3)} revR=${rev.r.y.toFixed(3)} head=${tposeHead.y.toFixed(3)} spread=${Math.abs(rev.l.x - rev.r.x).toFixed(3)}`,
      expected: 'both hands >= head+0.32 and tpose+0.40, together',
    },
    {
      name: 'Windmill and tomahawk change the seen hands, not just a 360 yaw',
      passed: millDifferent && hawkChop && wrapNotReverse && millSweep,
      actual: `millΔ=${dist(mill.l, rev.l).toFixed(3)} hawkR-L=${(hawk.r.y - hawk.l.y).toFixed(3)} spinΔ=${dist(spin.l, rev.l).toFixed(3)} millSweep=${dist(millMid.l, mill0.l).toFixed(3)}→${dist(millEnd.l, millMid.l).toFixed(3)} clips=${athlete.anims.slam.WINDMILL.targetedAnimations.length}`,
      expected: 'windmill clip sweeps the left hand; tomahawk right high / left low; 360 wrap lower',
    },
    {
      name: 'Dunker slam path is baked clips, not slamSilhouettes Euler after resetPose',
      passed: recipeFree,
      actual: `importsSilhouettes=${src.includes("from './slamSilhouettes'")} clipKeys=${src.includes('SLAM_CLIP_KEYS')} spins=${src.includes('SLAM_SPINS')} baked=${src.includes('slamClips')}`,
      expected: 'MixamoAthlete hang slam imports slamClips tracks, not slamSilhouettes maps',
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
