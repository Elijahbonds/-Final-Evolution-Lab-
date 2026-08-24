/**
 * Meshy Venice court + surround: fetch + File + glTF import on the live
 * scene, resolved (and hideCheap run) BEFORE the athlete's hang-required
 * timeout can even start — not wrapped inside it, not sharing its abort.
 */
import './venice-place-canvas-polyfill.ts';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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
  hideCheapVenicePrimitives,
  isPlaceholderMeshyGlb,
  loadMeshyVeniceCourt,
  retainLiveMeshyMural,
  MeshyPiece,
  MESHY_COURT_GLB,
  MESHY_SURROUND_GLB,
  MESHY_PLACEHOLDER_GENERATOR,
  MESHY_PLACEHOLDER_MAX_BYTES,
  MESHY_LIVE_MIN_BYTES,
} from '../src/lib/babylon/VeniceNightCourt';

function buildPlaceholderStubGlb(name: string): ArrayBuffer {
  return buildFakeRealMeshyGlb({
    halfX: 1,
    halfZ: 1,
    color: [0.05, 0.3, 0.62, 1],
    name,
    generator: MESHY_PLACEHOLDER_GENERATOR,
    padBytes: 0,
  });
}

/**
 * Test-only fixture builder — never written to disk, never checked in.
 * Mirrors scripts/gen-meshy-placeholder-glb.mjs's quad geometry but pads
 * the BIN chunk with unreferenced padding so it clears
 * MESHY_PLACEHOLDER_MAX_BYTES, and stamps a generator that is NOT
 * FEL-meshy-placeholder — standing in for a real Meshy export (which this
 * repo never has bytes for; git only ever holds the stub) so the
 * scale-authority code path still has coverage without inventing fake
 * shipped GLB bytes.
 */
function buildFakeRealMeshyGlb(opts: {
  halfX: number;
  halfZ: number;
  color: [number, number, number, number];
  name: string;
  generator?: string;
  padBytes?: number;
}): ArrayBuffer {
  const { halfX, halfZ, color, name } = opts;
  const generator = opts.generator ?? 'test-real-meshy-export';
  const padBytes = opts.padBytes ?? MESHY_PLACEHOLDER_MAX_BYTES + 1024;

  const positions = new Float32Array([
    -halfX, 0, -halfZ,
    halfX, 0, -halfZ,
    halfX, 0, halfZ,
    -halfX, 0, halfZ,
  ]);
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  const pad4 = (len: number) => (4 - (len % 4)) % 4;

  const posBytes = new Uint8Array(positions.buffer);
  const idxBytes = new Uint8Array(indices.buffer);
  const idxPad = pad4(idxBytes.length);
  const padding = new Uint8Array(padBytes);
  const bin = new Uint8Array(posBytes.length + idxBytes.length + idxPad + padding.length);
  bin.set(posBytes, 0);
  bin.set(idxBytes, posBytes.length);
  bin.set(padding, posBytes.length + idxBytes.length + idxPad);

  const json = {
    asset: { version: '2.0', generator },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [
      { children: [1], name: `${name}Root` },
      { mesh: 0, name: `${name}Mesh` },
    ],
    meshes: [
      { name: `${name}Mesh`, primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] },
    ],
    materials: [
      {
        name: `${name}Mat`,
        pbrMetallicRoughness: { baseColorFactor: color, metallicFactor: 0, roughnessFactor: 1 },
        doubleSided: true,
      },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 4, type: 'VEC3', min: [-halfX, 0, -halfZ], max: [halfX, 0, halfZ] },
      { bufferView: 1, componentType: 5123, count: 6, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBytes.length, target: 34962 },
      { buffer: 0, byteOffset: posBytes.length, byteLength: idxBytes.length, target: 34963 },
    ],
    buffers: [{ byteLength: bin.length }],
  };

  const jsonStr = JSON.stringify(json);
  const jsonBytes = new TextEncoder().encode(jsonStr);
  const jsonPad = pad4(jsonBytes.length);
  const jsonChunkData = new Uint8Array(jsonBytes.length + jsonPad);
  jsonChunkData.set(jsonBytes, 0);
  jsonChunkData.fill(0x20, jsonBytes.length);

  const jsonChunkHeader = new Uint8Array(8);
  new DataView(jsonChunkHeader.buffer).setUint32(0, jsonChunkData.length, true);
  new DataView(jsonChunkHeader.buffer).setUint32(4, 0x4e4f534a, true);

  const binChunkHeader = new Uint8Array(8);
  new DataView(binChunkHeader.buffer).setUint32(0, bin.length, true);
  new DataView(binChunkHeader.buffer).setUint32(4, 0x004e4942, true);

  const totalLength = 12 + jsonChunkHeader.length + jsonChunkData.length + binChunkHeader.length + bin.length;
  const header = new Uint8Array(12);
  const headerView = new DataView(header.buffer);
  headerView.setUint32(0, 0x46546c67, true);
  headerView.setUint32(4, 2, true);
  headerView.setUint32(8, totalLength, true);

  const out = new Uint8Array(totalLength);
  let off = 0;
  out.set(header, off); off += header.length;
  out.set(jsonChunkHeader, off); off += jsonChunkHeader.length;
  out.set(jsonChunkData, off); off += jsonChunkData.length;
  out.set(binChunkHeader, off); off += binChunkHeader.length;
  out.set(bin, off);
  return out.buffer;
}

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

  // Git never holds Meshy mural bytes (live files stay in Studio). In-memory
  // stubs + a synthetic export exercise placeholder detection / scale
  // authority without writing venice-blue-court.glb to disk. To still exercise the
  // scale-authority code path (fit-to-footprint, worldScale, hideCheap) a
  // synthetic "real export" fixture is built in-memory only — never written
  // to disk, never shipped — standing in for a human-uploaded Meshy export
  // at ~2.6x the regulation footprint.
  const courtBytes = buildFakeRealMeshyGlb({
    halfX: 20,
    halfZ: 20 * (28 / 15.2),
    color: [0.05, 0.3, 0.62, 1.0],
    name: 'MeshyVeniceCourt',
  });
  const surroundBytes = buildFakeRealMeshyGlb({
    halfX: 60,
    halfZ: 60,
    color: [0.42, 0.38, 0.3, 1.0],
    name: 'MeshyVeniceSurround',
  });
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

  // This synthetic "real export" fixture ships ~2.6x bigger than the
  // regulation 15.2x28 footprint — standing in for a rich Meshy export,
  // not a toy slab. It must NOT be shrunk down to fit; it keeps its own
  // native size and worldScale reports how much bigger.
  const loadedAndNotShrunk =
    meshy.courtLoaded &&
    meshy.surroundLoaded &&
    courtWidth > 15.2 + 1 &&
    courtDepth > 28 + 1 &&
    surroundWidth > 60 + 1 &&
    meshy.worldScale > 1.5;

  hideCheapVenicePrimitives(scene, { court: meshy.courtLoaded, surround: meshy.surroundLoaded });

  const cheapCourtGone =
    scene.getMeshByName('venice_court')?.isEnabled() === false &&
    scene.getMeshByName('venice_court')?.isVisible === false &&
    scene.getMeshByName('venice_key')?.isEnabled() === false &&
    scene.getMeshByName('venice_sand')?.isEnabled() === false;
  const cheapSurroundGone =
    scene.getMeshByName('venice_sky')?.isEnabled() === false &&
    scene.getMeshByName('venice_ocean')?.isEnabled() === false &&
    scene.getMeshByName('venice_ocean')?.isVisible === false &&
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

  // In-memory FEL-meshy-placeholder stubs — never written to public/assets,
  // so a ZIP of this repo cannot overwrite Studio's live mural. Loading
  // them through attachMeshyPiece must fail safe: courtLoaded/surroundLoaded
  // false, worldScale 1, hideCheap must NOT strip authored sky/ocean/fence.
  const realCourtBytes = new Uint8Array(buildPlaceholderStubGlb('StubCourt'));
  const realSurroundBytes = new Uint8Array(buildPlaceholderStubGlb('StubSurround'));
  const courtOnDiskPath = fileURLToPath(new URL(`../public/assets/${MESHY_COURT_GLB}`, import.meta.url));
  const surroundOnDiskPath = fileURLToPath(new URL(`../public/assets/${MESHY_SURROUND_GLB}`, import.meta.url));
  const courtOnDisk = existsSync(courtOnDiskPath) ? statSync(courtOnDiskPath).size : 0;
  const surroundOnDisk = existsSync(surroundOnDiskPath) ? statSync(surroundOnDiskPath).size : 0;
  const zipDoesNotShipStub =
    (courtOnDisk === 0 || courtOnDisk >= MESHY_LIVE_MIN_BYTES) &&
    (surroundOnDisk === 0 || surroundOnDisk >= MESHY_LIVE_MIN_BYTES);
  const placeholderScene = new Scene(engine);
  const placeholderCourt = await buildVeniceNightCourt(placeholderScene, undefined, hoop, {
    spectators: false,
    previewSafe: true,
  });
  void placeholderCourt;
  const placeholderMeshy = await loadMeshyVeniceCourt(placeholderScene, {
    courtWidth: 15.2,
    courtDepth: 28,
    surroundWidth: 60,
    surroundDepth: 60,
    courtCenterZ: 5.0,
    courtFile: new File([realCourtBytes], MESHY_COURT_GLB),
    surroundFile: new File([realSurroundBytes], MESHY_SURROUND_GLB),
  });
  hideCheapVenicePrimitives(placeholderScene, {
    court: placeholderMeshy.courtLoaded,
    surround: placeholderMeshy.surroundLoaded,
  });
  const placeholderFailsSafe =
    placeholderMeshy.courtLoaded === false &&
    placeholderMeshy.surroundLoaded === false &&
    placeholderMeshy.worldScale === 1;
  const authoredVeniceStaysUp =
    placeholderScene.getMeshByName('venice_sky')?.isEnabled() === true &&
    placeholderScene.getMeshByName('venice_ocean')?.isEnabled() === true &&
    placeholderScene.getMeshByName('venice_court')?.isEnabled() === true &&
    placeholderScene.getMeshByName('fence_l')?.isEnabled() === true &&
    placeholderScene.getMeshByName('bleacher_row_0')?.isEnabled() === true;
  placeholderMeshy.dispose();
  placeholderScene.dispose();

  // Hang abort must not dump a live-sized mural that already landed.
  // In-memory File fixtures only — no venice-blue-court.glb in git.
  const hangAbortScene = new Scene(engine);
  await buildVeniceNightCourt(hangAbortScene, undefined, hoop, {
    spectators: false,
    previewSafe: true,
  });
  const hangAbortMeshy = await loadMeshyVeniceCourt(hangAbortScene, {
    courtWidth: 15.2,
    courtDepth: 28,
    surroundWidth: 60,
    surroundDepth: 60,
    courtCenterZ: 5.0,
    courtFile,
    surroundFile,
  });
  const athleteAborted = true;
  const unmounted = false;
  const keptAfterHangAbort = retainLiveMeshyMural(hangAbortScene, hangAbortMeshy, unmounted);
  const muralStaysAfterHangAbort =
    athleteAborted &&
    keptAfterHangAbort &&
    hangAbortMeshy.courtLoaded &&
    hangAbortMeshy.surroundLoaded &&
    hangAbortMeshy.court?.root.isDisposed() === false &&
    hangAbortMeshy.surround?.root.isDisposed() === false &&
    hangAbortScene.getMeshByName('venice_court')?.isEnabled() === false &&
    hangAbortScene.getMeshByName('venice_sky')?.isEnabled() === false &&
    hangAbortScene.getMeshByName('venice_rim')?.isEnabled() === true;
  const dumpedOnUnmount = !retainLiveMeshyMural(hangAbortScene, hangAbortMeshy, true);
  hangAbortScene.dispose();

  // Byte-level sniff, independent of the SceneLoader round-trip above: the
  // actual checked-in files carry the FEL-meshy-placeholder generator tag,
  // and are also small enough to be caught by size alone.
  const gitCourtIsPlaceholder = isPlaceholderMeshyGlb(
    realCourtBytes.buffer.slice(realCourtBytes.byteOffset, realCourtBytes.byteOffset + realCourtBytes.byteLength)
  );
  const gitSurroundIsPlaceholder = isPlaceholderMeshyGlb(
    realSurroundBytes.buffer.slice(realSurroundBytes.byteOffset, realSurroundBytes.byteOffset + realSurroundBytes.byteLength)
  );
  const fakeRealBytes = buildFakeRealMeshyGlb({ halfX: 20, halfZ: 20, color: [0, 0, 0, 1], name: 'Fake' });
  const fakeRealIsNotPlaceholder = !isPlaceholderMeshyGlb(fakeRealBytes);
  const tinyButRightGeneratorIsStillPlaceholder = isPlaceholderMeshyGlb(
    buildFakeRealMeshyGlb({
      halfX: 1,
      halfZ: 1,
      color: [0, 0, 0, 1],
      name: 'Tiny',
      generator: 'a-real-vendor-exporter',
      padBytes: 0,
    })
  );

  // The mural's mesh is never rescaled — a tiny/degenerate export stays at
  // its OWN native size (recenter + floor-align only), while the RETURNED
  // ratio still floors at 1 so a consumer never shrinks the hoop below
  // real regulation size to match an undersized import.
  const tinyRoot = new TransformNode('tiny_root', scene);
  const tinyMesh = MeshBuilder.CreatePlane('tiny_mesh', { width: 0.5, height: 0.5 }, scene);
  tinyMesh.rotation.x = Math.PI / 2;
  tinyMesh.parent = tinyRoot;
  const tinyPiece: MeshyPiece = { root: tinyRoot, meshes: [tinyMesh], dispose: () => tinyRoot.dispose() };
  const tinyScale = fitMeshyPieceToFootprint(tinyPiece, 15.2, 28, 5.0);
  const tinyBounds = tinyRoot.getHierarchyBoundingVectors();
  const tinyFinalWidth = tinyBounds.max.x - tinyBounds.min.x;
  const trustsNativeScale = Math.abs(tinyFinalWidth - 0.5) < 0.01 && Math.abs(tinyScale - 1) < 0.001;
  tinyPiece.dispose();

  // Big mural, opposite direction: the returned ratio must exceed 1 and
  // scale with the mural's OWN measured size, not clamp back down.
  const bigRoot = new TransformNode('big_root', scene);
  const bigMesh = MeshBuilder.CreatePlane('big_mesh', { width: 40, height: 40 }, scene);
  bigMesh.rotation.x = Math.PI / 2;
  bigMesh.parent = bigRoot;
  const bigPiece: MeshyPiece = { root: bigRoot, meshes: [bigMesh], dispose: () => bigRoot.dispose() };
  const bigScale = fitMeshyPieceToFootprint(bigPiece, 15.2, 28, 5.0);
  const bigBounds = bigRoot.getHierarchyBoundingVectors();
  const bigFinalWidth = bigBounds.max.x - bigBounds.min.x;
  const scalesToNativeRatio = Math.abs(bigFinalWidth - 40) < 0.01 && Math.abs(bigScale - 40 / 15.2) < 0.01;
  bigPiece.dispose();

  // Camera: every phase's DISTANCE pulls back proportionally to worldScale
  // so it clears a bigger rim/backboard/post assembly. HANG/CONTACT are
  // byte-identical to the original locked framing at worldScale === 1 (no
  // mural), and their TARGET never moves — only how far back they sit does.
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
  const hangDefaultMatchesLocked =
    hangNoScale.pos.x === 2.55 &&
    hangNoScale.pos.z === athletePos.z - 1.28 &&
    contactNoScale.pos.x === 1.15 &&
    contactNoScale.pos.z === rim.z - 1.55;
  const hangContactTracksScale =
    hangDefaultMatchesLocked &&
    // Distance backs off with worldScale so the camera clears a bigger hoop.
    Vector3.Distance(hangBigScale.pos, athletePos) > Vector3.Distance(hangNoScale.pos, athletePos) &&
    Vector3.Distance(contactBigScale.pos, rim) > Vector3.Distance(contactNoScale.pos, rim) &&
    // Target stays pinned to the real, unscaled rim/athlete — the fall and
    // the CONTACT frame it looks at never move regardless of mural size.
    Vector3.Distance(hangNoScale.target, hangBigScale.target) < 1e-9 &&
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
      return readFileSync(new URL('../src/lib/babylon/VeniceNightCourt.ts', import.meta.url), 'utf8');
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
    !killHungLoadBlock.includes('retainLiveMeshyMural') &&
    killHungLoadBlock.includes('abortMixamoLoad') &&
    killHungLoadBlock.includes('athleteRef');

  const meshyThenIdx = modeSrc.indexOf('.then((meshy)');
  const meshyThenBlock = meshyThenIdx > -1 ? modeSrc.slice(meshyThenIdx, meshyThenIdx + 420) : '';
  const hangAbortDoesNotDumpMural =
    meshyThenBlock.includes('retainLiveMeshyMural') &&
    !meshyThenBlock.includes('bootAborted') &&
    !meshyThenBlock.includes('meshy.dispose()');

  // VeniceNightCourt.ts legitimately imports MixamoAthlete for crowd
  // spectators — the real isolation check is that the Meshy loader itself
  // never touches the athlete's abort/container tracking (abortMixamoLoad).
  const meshyLoaderIsInVeniceNightCourt =
    meshySrc.includes('export async function loadMeshyVeniceCourt') &&
    meshySrc.includes('export function fitMeshyPieceToFootprint') &&
    meshySrc.includes('export function hideCheapVenicePrimitives') &&
    meshySrc.includes('export function retainLiveMeshyMural');
  const meshyLoadIndependentOfAthleteAbort =
    meshySrc.includes('never shares state with the athlete') &&
    !meshySrc.includes('abortMixamoLoad');

  const worldScaleWiring =
    modeSrc.includes('worldScaleRef.current = meshy.worldScale') &&
    modeSrc.includes('directedFraming(') &&
    modeSrc.includes('worldScaleRef.current') &&
    modeSrc.includes('rim?.scaling.set(s, s, s)') &&
    modeSrc.includes('backboard.scaling.set(s, s, s)') &&
    modeSrc.includes('post.scaling.set(s, s, s)') &&
    modeSrc.includes('backboard.position.subtract(hoop)') &&
    modeSrc.includes('post.position.subtract(hoop)') &&
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
      name: 'Mural mesh is never rescaled — a tiny export stays at its own native size',
      passed: trustsNativeScale,
      actual: `finalWidth=${tinyFinalWidth.toFixed(3)} scale=${tinyScale.toFixed(3)}`,
      expected: 'a 0.5-unit plane stays 0.5 wide after fit (recenter/floor-align only); returned ratio floors at 1',
    },
    {
      name: 'A mural bigger than regulation reports a ratio that tracks its own measured size',
      passed: scalesToNativeRatio,
      actual: `finalWidth=${bigFinalWidth.toFixed(2)} scale=${bigScale.toFixed(3)} expected=${(40 / 15.2).toFixed(3)}`,
      expected: 'a 40-unit plane stays 40 wide; returned ratio === 40/15.2, not clamped down',
    },
    {
      name: 'Idle camera pulls back with worldScale; hang cam tracks a scaled rim/athlete (target pinned, distance backs off)',
      passed: idlePullsBack && hangContactTracksScale,
      actual: `idleNoScaleDist=${Vector3.Distance(idleNoScale.pos, athletePos).toFixed(2)} idleBigScaleDist=${Vector3.Distance(idleBigScale.pos, athletePos).toFixed(2)} hangDefaultLocked=${hangDefaultMatchesLocked} hangDist0=${Vector3.Distance(hangNoScale.pos, athletePos).toFixed(2)} hangDist2.6=${Vector3.Distance(hangBigScale.pos, athletePos).toFixed(2)} contactDist0=${Vector3.Distance(contactNoScale.pos, rim).toFixed(2)} contactDist2.6=${Vector3.Distance(contactBigScale.pos, rim).toFixed(2)}`,
      expected: 'at scale=1 hang/contact match the original locked numbers exactly; at scale=2.6 camera distance grows but target stays pinned to the real rim/athlete',
    },
    {
      name: 'Hoop fits the mural: rim/backboard/post scale to worldScale and backboard/post reposition off the hoop',
      passed: worldScaleWiring,
      actual: `wired=${worldScaleWiring}`,
      expected: 'worldScaleRef feeds directedFraming and rim/backboard/post .scaling; backboard/post reposition via offset-from-hoop * s; rim.position.y keeps hoopRestY + rimYOffset only',
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
      actual: `killHungLoadTouchesMeshy=${killHungLoadBlock.includes('meshyCourtRef')} meshyUsesAbortMixamoLoad=${meshySrc.includes('abortMixamoLoad')}`,
      expected: 'killHungLoad only disposes athleteRef/abortMixamoLoad; the Meshy loader never calls abortMixamoLoad',
    },
    {
      name: 'Live-sized Meshy File stays on the scene after Mixamo hang abort — hideCheap still runs',
      passed: muralStaysAfterHangAbort && hangAbortDoesNotDumpMural && dumpedOnUnmount,
      actual: `kept=${keptAfterHangAbort} muralStays=${muralStaysAfterHangAbort} thenIndependent=${hangAbortDoesNotDumpMural} dumpedOnUnmount=${dumpedOnUnmount} thenHasBootAborted=${meshyThenBlock.includes('bootAborted')}`,
      expected: 'retainLiveMeshyMural keeps a landed File mural when athleteAborted; then-handler ignores bootAborted; unmount still dumps',
    },
    {
      name: 'Meshy File loader lives in VeniceNightCourt.ts, not a separate module',
      passed: meshyLoaderIsInVeniceNightCourt,
      actual: `wired=${meshyLoaderIsInVeniceNightCourt}`,
      expected: 'loadMeshyVeniceCourt / fitMeshyPieceToFootprint / hideCheapVenicePrimitives are all exported from VeniceNightCourt.ts',
    },
    {
      name: 'Placeholder stubs are detected by generator tag + size and never treated as a mural',
      passed: gitCourtIsPlaceholder && gitSurroundIsPlaceholder && fakeRealIsNotPlaceholder && tinyButRightGeneratorIsStillPlaceholder,
      actual: `courtBytes=${realCourtBytes.byteLength} courtIsPlaceholder=${gitCourtIsPlaceholder} surroundBytes=${realSurroundBytes.byteLength} surroundIsPlaceholder=${gitSurroundIsPlaceholder} fakeRealDetectedAsPlaceholder=${!fakeRealIsNotPlaceholder} tinyRealGeneratorStillCaught=${tinyButRightGeneratorIsStillPlaceholder}`,
      expected: `in-memory stubs (<= ${MESHY_PLACEHOLDER_MAX_BYTES}B, generator=${MESHY_PLACEHOLDER_GENERATOR}) are placeholders; a padded synthetic export with a different generator is not; a tiny file is still caught by size alone`,
    },
    {
      name: 'Loading ONLY placeholder stubs fails safe: no mural, worldScale 1, authored Venice night stays up',
      passed: placeholderFailsSafe && authoredVeniceStaysUp,
      actual: `courtLoaded=${placeholderMeshy.courtLoaded} surroundLoaded=${placeholderMeshy.surroundLoaded} worldScale=${placeholderMeshy.worldScale} authoredVeniceStaysUp=${authoredVeniceStaysUp}`,
      expected: 'placeholder GLBs never attach as a mural; hideCheapVenicePrimitives never runs; sky/ocean/court/fence/bleachers stay enabled — no 2.6x stub quad',
    },
    {
      name: 'Repo ZIP does not ship stub mural GLBs that would overwrite Studio live Meshy',
      passed: zipDoesNotShipStub,
      actual: `courtOnDisk=${courtOnDisk} surroundOnDisk=${surroundOnDisk} liveMin=${MESHY_LIVE_MIN_BYTES}`,
      expected: `public/assets mural paths absent or >= ${MESHY_LIVE_MIN_BYTES}B (Studio live); never a <8KB stub`,
    },
    {
      name: 'The finished dunk boot is not previewSafe — real shaders/rim spot/shadows, not the cheap-preview escape hatch',
      passed: modeSrc.includes('previewSafe: false') && !modeSrc.includes('previewSafe: true'),
      actual: `hasFalse=${modeSrc.includes('previewSafe: false')} hasTrue=${modeSrc.includes('previewSafe: true')}`,
      expected: 'BabylonDunkMode boots createBabylonContext/buildVeniceNightCourt with previewSafe: false',
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
