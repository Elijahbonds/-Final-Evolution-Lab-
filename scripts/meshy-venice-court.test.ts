/**
 * Meshy Venice court + surround: fetch + File + glTF import on the live
 * scene, resolved (and hideCheap run) BEFORE the athlete's hang-required
 * timeout can even start — not wrapped inside it, not sharing its abort.
 */
import './venice-place-canvas-polyfill.ts';
import { readFileSync } from 'node:fs';
import { NullEngine, Scene, Vector3 } from '@babylonjs/core';

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
import { buildVeniceNightCourt } from '../src/lib/babylon/VeniceNightCourt';
import {
  hideCheapCourtMeshes,
  hideCheapSurroundMeshes,
  loadMeshyVeniceCourt,
  MESHY_COURT_GLB,
  MESHY_SURROUND_GLB,
} from '../src/lib/babylon/MeshyVeniceCourt';

export async function runMeshyVeniceCourtTests(): Promise<
  Array<{ name: string; passed: boolean; actual: string; expected: string }>
> {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const hoop = new Vector3(0, 3.05, 5.5);
  const court = await buildVeniceNightCourt(scene, undefined, hoop, {
    spectators: false,
    previewSafe: true,
  });
  void court;

  const courtBytes = readFileSync(new URL(`../public/assets/${MESHY_COURT_GLB}`, import.meta.url));
  const surroundBytes = readFileSync(new URL(`../public/assets/${MESHY_SURROUND_GLB}`, import.meta.url));
  const courtFile = new File([courtBytes], MESHY_COURT_GLB);
  const surroundFile = new File([surroundBytes], MESHY_SURROUND_GLB);

  const meshy = await loadMeshyVeniceCourt(scene, {
    courtWidth: 15.2,
    courtDepth: 28,
    surroundWidth: 60,
    surroundDepth: 60,
    courtCenterZ: 5.0,
    courtFile,
    surroundFile,
  });

  const courtBounds = meshy.court?.root.getHierarchyBoundingVectors();
  const courtWidth = courtBounds ? courtBounds.max.x - courtBounds.min.x : 0;
  const courtDepth = courtBounds ? courtBounds.max.z - courtBounds.min.z : 0;
  const surroundBounds = meshy.surround?.root.getHierarchyBoundingVectors();
  const surroundWidth = surroundBounds ? surroundBounds.max.x - surroundBounds.min.x : 0;

  const loadedAndFit =
    meshy.courtLoaded &&
    meshy.surroundLoaded &&
    Math.abs(courtWidth - 15.2) < 0.05 &&
    Math.abs(courtDepth - 28) < 0.05 &&
    Math.abs(surroundWidth - 60) < 0.2;

  hideCheapCourtMeshes(scene);
  hideCheapSurroundMeshes(scene);

  const cheapCourtGone =
    scene.getMeshByName('venice_court')?.isEnabled() === false &&
    scene.getMeshByName('venice_key')?.isEnabled() === false &&
    scene.getMeshByName('venice_sand')?.isEnabled() === false;
  const cheapSurroundGone =
    scene.getMeshByName('venice_sky')?.isEnabled() === false &&
    scene.getMeshByName('venice_ocean')?.isEnabled() === false &&
    scene.getMeshByName('fence_l')?.isEnabled() === false &&
    scene.getMeshByName('bleacher_row_0')?.isEnabled() === false;
  const rimStaysUp =
    scene.getMeshByName('venice_rim')?.isEnabled() === true &&
    scene.getMeshByName('venice_backboard')?.isEnabled() === true &&
    scene.getMeshByName('venice_post')?.isEnabled() === true;

  // A total fetch failure (no override, no live server here) must resolve
  // gracefully, never throw out of loadMeshyVeniceCourt, and never touch
  // the athlete — the cheap procedural court simply stays visible.
  let failSafeThrew = false;
  let failSafeResult: { courtLoaded: boolean; surroundLoaded: boolean } | null = null;
  try {
    failSafeResult = await loadMeshyVeniceCourt(scene, {
      courtWidth: 15.2,
      courtDepth: 28,
      surroundWidth: 60,
      surroundDepth: 60,
      courtCenterZ: 5.0,
    });
  } catch {
    failSafeThrew = true;
  }

  const modeSrc = (() => {
    try {
      return readFileSync(new URL('../src/components/modes/BabylonDunkMode.tsx', import.meta.url), 'utf8');
    } catch {
      return '';
    }
  })();
  const meshySrc = (() => {
    try {
      return readFileSync(new URL('../src/lib/babylon/MeshyVeniceCourt.ts', import.meta.url), 'utf8');
    } catch {
      return '';
    }
  })();

  const meshyCallIdx = modeSrc.indexOf('loadMeshyVeniceCourt(scene');
  const athleteTimeoutIdx = modeSrc.indexOf("'Mixamo dunker'");
  const meshyBeforeAthleteTimeout =
    meshyCallIdx > -1 && athleteTimeoutIdx > -1 && meshyCallIdx < athleteTimeoutIdx;

  const killHungLoadBlock = (() => {
    const start = modeSrc.indexOf('const killHungLoad');
    const end = modeSrc.indexOf('};', start);
    return start > -1 && end > -1 ? modeSrc.slice(start, end) : '';
  })();
  const hangRequiredIsAthleteOnly =
    !killHungLoadBlock.includes('meshyCourtRef') &&
    !killHungLoadBlock.includes('MeshyVeniceCourt') &&
    killHungLoadBlock.includes('abortMixamoLoad') &&
    killHungLoadBlock.includes('athleteRef');

  const meshyLoadIndependentOfAthleteAbort =
    meshySrc.includes('never shares state with the athlete') &&
    !meshySrc.includes('abortMixamoLoad') &&
    !meshySrc.includes("from './MixamoAthlete'");

  const results = [
    {
      name: 'Meshy court + surround load via fetch/File + glTF and fit to the live court footprint',
      passed: loadedAndFit,
      actual: `courtLoaded=${meshy.courtLoaded} surroundLoaded=${meshy.surroundLoaded} courtW=${courtWidth.toFixed(2)} courtD=${courtDepth.toFixed(2)} surroundW=${surroundWidth.toFixed(2)}`,
      expected: 'both pieces attach; court fits 15.2x28, surround fits 60x60 — same map, fit to its footprint',
    },
    {
      name: 'hideCheap removes the beige/procedural slab and backdrop once Meshy loads',
      passed: cheapCourtGone && cheapSurroundGone && rimStaysUp,
      actual: `cheapCourtGone=${cheapCourtGone} cheapSurroundGone=${cheapSurroundGone} rimStaysUp=${rimStaysUp}`,
      expected: 'venice_court/key/sand + sky/ocean/fence/bleachers disabled; rim/backboard/post stay enabled',
    },
    {
      name: 'A failed Meshy fetch resolves gracefully — never throws, never blocks the athlete',
      passed: !failSafeThrew && failSafeResult?.courtLoaded === false && failSafeResult?.surroundLoaded === false,
      actual: `threw=${failSafeThrew} courtLoaded=${failSafeResult?.courtLoaded} surroundLoaded=${failSafeResult?.surroundLoaded}`,
      expected: 'loadMeshyVeniceCourt resolves with courtLoaded=false, surroundLoaded=false; no throw',
    },
    {
      name: 'Meshy import runs before the athlete hang-required timeout can start (not wrapped inside it)',
      passed: meshyBeforeAthleteTimeout,
      actual: `meshyCallIdx=${meshyCallIdx} athleteTimeoutIdx=${athleteTimeoutIdx}`,
      expected: "loadMeshyVeniceCourt(scene call appears before the 'Mixamo dunker' withTimeout in boot()",
    },
    {
      name: 'Hang-required + abort stay on the athlete only — killHungLoad never touches Meshy state',
      passed: hangRequiredIsAthleteOnly && meshyLoadIndependentOfAthleteAbort,
      actual: `killHungLoadTouchesMeshy=${killHungLoadBlock.includes('meshyCourtRef')} meshyImportsMixamo=${meshySrc.includes("from './MixamoAthlete'")}`,
      expected: 'killHungLoad only disposes athleteRef/abortMixamoLoad; MeshyVeniceCourt.ts never imports MixamoAthlete abort state',
    },
  ];

  scene.dispose();
  engine.dispose();
  return results;
}

const nodeProcess = typeof process !== 'undefined' ? process : undefined;
if (nodeProcess?.argv?.[1]?.includes('meshy-venice-court')) {
  console.log('=== MESHY VENICE COURT ===\n');
  const rows = await runMeshyVeniceCourtTests();
  let all = true;
  for (const t of rows) {
    console.log(`${t.passed ? '✓ PASS' : '✗ FAIL'} | ${t.name}`);
    console.log(`  Actual: ${t.actual}`);
    console.log(`  Expected: ${t.expected}\n`);
    if (!t.passed) all = false;
  }
  if (!all) {
    console.error('Meshy Venice court tests failed.');
    nodeProcess?.exit(1);
  } else {
    console.log('Meshy Venice court verified.');
  }
}
