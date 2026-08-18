/**
 * Mesh proof: hang plumbing is the imported BVH AnimationGroup.
 * Hang body is basketball_dunk__elijah.bvh only — CMU 124_06 is not BODY YES.
 */
import { existsSync, readFileSync } from 'node:fs';
import { NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { createMixamoAthlete } from '../src/lib/babylon/MixamoAthlete';
import { ELIJAH_DUNK_BVH, ELIJAH_DUNK_CLIP, isElijahDunkTake } from '../src/lib/babylon/bvhRetarget';
import { isRemoteAssetUrl, LOCAL_DUNKER_GLB } from '../src/lib/babylon/localAssets';

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
  const elijahPath = elijahUrl.pathname;
  const hasElijah = existsSync(elijahPath);
  const dunkBvh = hasElijah ? readFileSync(elijahUrl, 'utf8') : undefined;
  const athlete = await createMixamoAthlete(scene, 'meshProof', undefined, {
    file: new File([bytes], 'dunker-transformed.glb'),
    dunkBvh,
  });
  athlete.stopClips();
  athlete.resetPose();

  const tposeL = athlete.boneWorld('LeftHand');
  const clipName = athlete.dunkTakeName;
  const groupName = athlete.anims.dunkTake?.name ?? '';
  const src = readFileSync(new URL('../src/lib/babylon/MixamoAthlete.ts', import.meta.url), 'utf8');
  const loader = readFileSync(new URL('../src/lib/babylon/bvhRetarget.ts', import.meta.url), 'utf8');
  const modeSrc = readFileSync(new URL('../src/components/modes/BabylonDunkMode.tsx', import.meta.url), 'utf8');
  const hangFromBvh =
    src.includes('bvhRetarget') &&
    src.includes('dunkTake') &&
    src.includes('loadDunkBvhText') &&
    !src.includes('SLAM_CLIP_KEYS') &&
    loader.includes('ELIJAH_DUNK_BVH') &&
    !loader.includes('/assets/cmu_124_06');

  const results = [
    {
      name: 'Hang plumbing is dunkTake from bvhRetarget, not SLAM_CLIP_KEYS',
      passed: hangFromBvh,
      actual: `bvh=${src.includes('bvhRetarget')} dunkTake=${src.includes('dunkTake')} clipKeys=${src.includes('SLAM_CLIP_KEYS')} elijahUrl=${loader.includes(ELIJAH_DUNK_BVH)} cmuFallback=${loader.includes('/assets/cmu_124_06')}`,
      expected: 'MixamoAthlete hang loads /assets/basketball_dunk__elijah.bvh only',
    },
    {
      name: 'Dunker GLB is a timed local /assets fetch, not SceneLoader URL or Mixamo CDN',
      passed:
        src.includes('fetchLocalBytes') &&
        src.includes('LOCAL_DUNKER_GLB') &&
        src.includes('withTimeout') &&
        !src.includes("LoadAssetContainerAsync(rootUrl, 'dunker-transformed.glb'") &&
        !src.includes('mixamo.com') &&
        loader.includes('fetchLocalText') &&
        loader.includes('isRemoteAssetUrl') &&
        modeSrc.includes('spectators: false') &&
        modeSrc.includes('previewSafe: true') &&
        modeSrc.includes('withTimeout') &&
        src.includes('anims.run.isPlaying') &&
        !src.includes('group.start(false, 1, 0, group.to)') &&
        isRemoteAssetUrl('https://www.mixamo.com/foo') &&
        !isRemoteAssetUrl(`/assets/${LOCAL_DUNKER_GLB}`),
      actual: `localFetch=${src.includes('fetchLocalBytes')} timeout=${src.includes('withTimeout')} sceneUrl=${src.includes("LoadAssetContainerAsync(rootUrl, 'dunker-transformed.glb'")} remoteMixamo=${isRemoteAssetUrl('https://www.mixamo.com/foo')} specsOff=${modeSrc.includes('spectators: false')}`,
      expected: 'fetch local dunker-transformed.glb + BVH with timeout; no Mixamo CDN; dunk court skips crowd skins',
    },
    {
      name: 'Hang body is basketball_dunk__elijah.bvh — CMU 124_06 is not BODY YES',
      passed:
        hasElijah &&
        !!dunkBvh &&
        isElijahDunkTake(dunkBvh) &&
        clipName === ELIJAH_DUNK_CLIP &&
        groupName === ELIJAH_DUNK_CLIP &&
        (athlete.anims.dunkTake?.targetedAnimations.length ?? 0) > 8,
      actual: hasElijah
        ? `clip=${clipName} group=${groupName} tracks=${athlete.anims.dunkTake?.targetedAnimations.length ?? 0}`
        : `missing public/assets/${ELIJAH_DUNK_BVH}; CMU lay-up is not the hang take`,
      expected: 'AnimationGroup basketball_dunk__elijah from FEL-unity',
    },
  ];

  if (hasElijah && athlete.anims.dunkTake) {
    athlete.seekSlam('REVERSE_TWO_HAND', 0);
    const hang0 = { l: athlete.boneWorld('LeftHand') };
    athlete.seekSlam('REVERSE_TWO_HAND', 0.5);
    const hangMid = { l: athlete.boneWorld('LeftHand') };
    athlete.seekSlam('REVERSE_TWO_HAND', 1);
    const hangEnd = { l: athlete.boneWorld('LeftHand') };
    const leftTheTpose =
      dist(hangEnd.l, tposeL) > 0.12 ||
      dist(hangMid.l, tposeL) > 0.12 ||
      Math.abs(hangEnd.l.y - tposeL.y) > 0.1;
    results.push({
      name: 'Elijah hang take moves the Mixamo skin off T-pose',
      passed: leftTheTpose && dist(hangMid.l, hang0.l) + dist(hangEnd.l, hangMid.l) > 0.08,
      actual: `tposeL=${tposeL.y.toFixed(3)} hang0=${hang0.l.y.toFixed(3)} mid=${hangMid.l.y.toFixed(3)} end=${hangEnd.l.y.toFixed(3)}`,
      expected: 'hands leave T-pose as the Elijah hang window is sampled',
    });

    athlete.seekSlam('REVERSE_TWO_HAND', 1);
    const landFoot = athlete.boneWorld('LeftFoot');
    const landHand = athlete.boneWorld('LeftHand');
    athlete.seekSlam('REVERSE_TWO_HAND', athlete.hangContactT01);
    const rimFoot = athlete.boneWorld('LeftFoot');
    const rimHand = athlete.boneWorld('LeftHand');
    const contactNotLand =
      athlete.hangContactT01 < 1 - 1e-6 &&
      dist(rimFoot, landFoot) > 0.25 &&
      rimFoot.y > landFoot.y + 0.2 &&
      dist(rimHand, landHand) > 0.08;
    results.push({
      name: 'CONTACT hang sample is the Elijah rim pose, not hang t=1 land squash',
      passed: contactNotLand,
      actual: `contactT=${athlete.hangContactT01.toFixed(3)} rimFootY=${rimFoot.y.toFixed(3)} landFootY=${landFoot.y.toFixed(3)} dFoot=${dist(rimFoot, landFoot).toFixed(3)} dHand=${dist(rimHand, landHand).toFixed(3)}`,
      expected: 'hangContactT01 < 1; rim foot still up, not the t=1 land squash',
    });

    athlete.posePlant(0);
    const plant0 = { l: athlete.boneWorld('LeftHand'), f: athlete.boneWorld('LeftFoot') };
    athlete.posePlant(1);
    const plant1 = { l: athlete.boneWorld('LeftHand'), f: athlete.boneWorld('LeftFoot') };
    athlete.poseTakeoff(0);
    const take0 = { l: athlete.boneWorld('LeftHand'), f: athlete.boneWorld('LeftFoot') };
    athlete.poseTakeoff(1);
    const take1 = { l: athlete.boneWorld('LeftHand'), f: athlete.boneWorld('LeftFoot') };
    athlete.seekSlam('REVERSE_TWO_HAND', 0);
    const hangApex = { l: athlete.boneWorld('LeftHand'), f: athlete.boneWorld('LeftFoot') };
    const plantMoves = dist(plant0.l, plant1.l) + dist(plant0.f, plant1.f) > 0.08;
    const takeoffRises = dist(take0.l, take1.l) + dist(take0.f, take1.f) > 0.12;
    const takeoffMeetsHang = dist(take1.l, hangApex.l) + dist(take1.f, hangApex.f) < 0.08;
    const plantNotHang = dist(plant1.l, hangApex.l) + dist(plant1.f, hangApex.f) > 0.15;
    const plantLeavesT = dist(plant1.l, tposeL) > 0.08;
    const liveFromBake = src.includes('APPROACH_TRACKS') || src.includes('writeTrack') || src.includes('slamClipTracks');
    const samplesWindows = src.includes('plantFrame01') && src.includes('takeoffFrame01');
    results.push({
      name: 'Plant and takeoff sample Elijah dunkTake windows, not slamClipTracks',
      passed:
        plantMoves &&
        takeoffRises &&
        takeoffMeetsHang &&
        plantNotHang &&
        plantLeavesT &&
        !liveFromBake &&
        samplesWindows &&
        (athlete.dunkTakeMeta?.takeoffEnd ?? -1) === (athlete.dunkTakeMeta?.hangStart ?? -2),
      actual: `dPlant=${(dist(plant0.l, plant1.l) + dist(plant0.f, plant1.f)).toFixed(3)} dTake=${(dist(take0.l, take1.l) + dist(take0.f, take1.f)).toFixed(3)} takeToHang=${(dist(take1.l, hangApex.l) + dist(take1.f, hangApex.f)).toFixed(3)} plantToHang=${(dist(plant1.l, hangApex.l) + dist(plant1.f, hangApex.f)).toFixed(3)} bake=${liveFromBake} windows=${athlete.dunkTakeMeta?.plantStart}-${athlete.dunkTakeMeta?.plantEnd}/${athlete.dunkTakeMeta?.takeoffStart}-${athlete.dunkTakeMeta?.takeoffEnd}`,
      expected: 'same imported take; plant on floor; takeoff t=1 is hang apex; not APPROACH_TRACKS',
    });
  }

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
