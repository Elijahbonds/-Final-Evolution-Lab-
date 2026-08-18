/**
 * Meshy Venice court + surround: fetch + File + glTF import on the live
 * scene, resolved (and hideCheap run) BEFORE the athlete's hang-required
 * timeout can even start — not wrapped inside it, not sharing its abort.
 */
import './venice-place-canvas-polyfill.ts';
import { readFileSync } from 'node:fs';
import { MeshBuilder, NullEngine, Scene, TransformNode, Vector3 } from '@babylonjs/core';

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
import { directedFraming } from '../src/lib/babylon/veniceDunkCamera';
import {
  fitMeshyPieceToFootprint,
  hideCheapCourtMeshes,
  hideCheapSurroundMeshes,
  loadMeshyVeniceCourt,
  MeshyPiece,
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

  // This fixture ships ~2.6x bigger than the regulation 15.2x28 footprint —
  // a rich Meshy export, not a toy slab. It must NOT be shrunk down to fit;
  // it keeps its own native size and worldScale reports how much bigger.
  const loadedAndNotShrunk =
    meshy.courtLoaded &&
    meshy.surroundLoaded &&
    courtWidth > 15.2 + 1 &&
    courtDepth > 28 + 1 &&
    surroundWidth > 60 + 1 &&
    meshy.worldScale > 1.5;

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

  // Isolated floor check: a degenerate/tiny export (unrelated to the fixture
  // above) must still be grown UP to regulation size, not left as a sliver.
  const tinyRoot = new TransformNode('tiny_root', scene);
  const tinyMesh = MeshBuilder.CreatePlane('tiny_mesh', { width: 0.5, height: 0.5 }, scene);
  tinyMesh.rotation.x = Math.PI / 2;
  tinyMesh.parent = tinyRoot;
  const tinyPiece: MeshyPiece = { root: tinyRoot, meshes: [tinyMesh], dispose: () => tinyRoot.dispose() };
  const tinyScale = fitMeshyPieceToFootprint(tinyPiece, 15.2, 28, 5.0);
  const tinyBounds = tinyRoot.getHierarchyBoundingVectors();
  const tinyFinalWidth = tinyBounds.max.x - tinyBounds.min.x;
  const growsToFloor = Math.abs(tinyFinalWidth - 15.2) < 0.05 && Math.abs(tinyScale - 1) < 0.01;
  tinyPiece.dispose();

  // Camera: idle/runway/gather/plant/takeoff/default pull back proportionally
  // to worldScale; HANG and CONTACT stay exactly as locked regardless of it.
  const rim = new Vector3(0, 3.05, 5.5);
  const athletePos = new Vector3(0, 0, -2);
  const idleNoScale = directedFraming('IDLE', athletePos, rim, undefined, undefined, 1);
  const idleBigScale = directedFraming('IDLE', athletePos, rim, undefined, undefined, 2.6);
  const idlePullsBack =
    Vector3.Distance(idleBigScale.pos, athletePos) > Vector3.Distance(idleNoScale.pos, athletePos) + 1;
  const hangNoScale = directedFraming('HANG', athletePos, rim, undefined, undefined, 1);
  const hangBigScale = directedFraming('HANG', athletePos, rim, undefined, undefined, 2.6);
  const contactNoScale = directedFraming('CONTACT', athletePos, rim, undefined, undefined, 1);
  const contactBigScale = directedFraming('CONTACT', athletePos, rim, undefined, undefined, 2.6);
  const hangContactLocked =
    Vector3.Distance(hangNoScale.pos, hangBigScale.pos) < 1e-9 &&
    Vector3.Distance(hangNoScale.target, hangBigScale.target) < 1e-9 &&
    Vector3.Distance(contactNoScale.pos, contactBigScale.pos) < 1e-9 &&
    Vector3.Distance(contactNoScale.target, contactBigScale.target) < 1e-9;

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

  const worldScaleWiring =
    modeSrc.includes('worldScaleRef.current = meshy.worldScale') &&
    modeSrc.includes('directedFraming(') &&
    modeSrc.includes('worldScaleRef.current') &&
    modeSrc.includes("courtRef.current?.rim.scaling.set(s, s, s)") &&
    modeSrc.includes("courtRef.current?.backboard.scaling.set(s, s, s)") &&
    !modeSrc.includes('court.rim.position.y = court.hoopRestY + snap.rimYOffset * s') &&
    modeSrc.includes('court.rim.position.y = court.hoopRestY + snap.rimYOffset');

  const results = [
    {
      name: 'A mural bigger than regulation is not shrunk to fit — it keeps its own size',
      passed: loadedAndNotShrunk,
      actual: `courtLoaded=${meshy.courtLoaded} surroundLoaded=${meshy.surroundLoaded} courtW=${courtWidth.toFixed(2)} courtD=${courtDepth.toFixed(2)} surroundW=${surroundWidth.toFixed(2)} worldScale=${meshy.worldScale.toFixed(2)}`,
      expected: 'court/surround stay near native (~2.6x regulation), worldScale > 1.5 — no forced shrink to 15.2x28/60x60',
    },
    {
      name: 'A too-small export is still grown up to the regulation floor (not left a sliver)',
      passed: growsToFloor,
      actual: `finalWidth=${tinyFinalWidth.toFixed(2)} scale=${tinyScale.toFixed(3)}`,
      expected: 'a 0.5-unit degenerate plane grows to 15.2 width, uniform scale === 1 return value (grown-to-floor, not "already big")',
    },
    {
      name: 'Idle/runway camera pulls back proportionally to worldScale; HANG/CONTACT ignore it (locked)',
      passed: idlePullsBack && hangContactLocked,
      actual: `idleNoScaleDist=${Vector3.Distance(idleNoScale.pos, athletePos).toFixed(2)} idleBigScaleDist=${Vector3.Distance(idleBigScale.pos, athletePos).toFixed(2)} hangContactLocked=${hangContactLocked}`,
      expected: 'idle offset grows with worldScale; hang/contact framing identical at scale=1 and scale=2.6',
    },
    {
      name: 'Rim/backboard/post are scaled visually to match a bigger mural — rim Y stays gameplay-driven',
      passed: worldScaleWiring,
      actual: `wired=${worldScaleWiring}`,
      expected: 'worldScaleRef feeds directedFraming and rim/backboard/post .scaling; rim.position.y keeps hoopRestY + rimYOffset only',
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
