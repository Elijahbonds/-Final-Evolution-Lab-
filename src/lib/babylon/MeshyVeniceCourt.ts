/**
 * Meshy-exported Venice court + surround GLBs (fetch + File + glTF loader).
 * Loaded on the LIVE scene, entirely independent of the Mixamo athlete's
 * hang-required load/abort. This piece is best-effort: any failure keeps
 * the cheap procedural court visible and never throws out of boot().
 *
 * Same-origin /assets only — no CDN, same rule as the dunker GLB.
 */

import '@babylonjs/loaders/glTF';
import { AbstractMesh, AssetContainer, Scene, SceneLoader, TransformNode } from '@babylonjs/core';
import { fetchLocalBytes, localAssetUrl, withTimeout } from './localAssets';

export const MESHY_COURT_GLB = 'venice-blue-court.glb';
export const MESHY_SURROUND_GLB = 'venice-court-surround.glb';
/** Independent of LOCAL_ASSET_TIMEOUT_MS — the mural is best-effort and must not borrow the athlete's hang-required budget. */
export const MESHY_LOAD_TIMEOUT_MS = 9000;

/** Cheap procedural meshes the Meshy court replaces once it loads. Rim/backboard/post stay — gameplay is anchored to them. */
const CHEAP_COURT_MESH_NAMES = ['venice_court', 'venice_key', 'venice_sand'];
const CHEAP_SURROUND_MESH_NAMES = ['venice_sky', 'venice_ocean'];
const CHEAP_SURROUND_PREFIXES = ['fence_', 'bleacher_'];

export interface MeshyPiece {
  root: TransformNode;
  meshes: AbstractMesh[];
  dispose: () => void;
}

export interface MeshyVeniceCourt {
  court: MeshyPiece | null;
  surround: MeshyPiece | null;
  courtLoaded: boolean;
  surroundLoaded: boolean;
  /** How much bigger than the default regulation footprint the mural came in at. 1 when no mural loaded — never < 1: the mural is never shrunk. */
  worldScale: number;
  dispose: () => void;
}

async function loadMeshyFile(filename: string): Promise<File> {
  const bytes = await fetchLocalBytes(localAssetUrl(filename), MESHY_LOAD_TIMEOUT_MS);
  return new File([bytes], filename);
}

/**
 * Fetch + File + glTF import for one Meshy piece, with its OWN timeout and
 * abort — never shares state with the athlete's Mixamo container tracking.
 * `fileOverride` lets tests inject a File directly, same pattern as the
 * dunker GLB loader, without needing a live same-origin server.
 */
async function attachMeshyPiece(
  scene: Scene,
  filename: string,
  rootName: string,
  fileOverride?: File
): Promise<MeshyPiece> {
  if (scene.isDisposed) {
    throw new Error(`${rootName} scene disposed`);
  }
  const file = fileOverride ?? (await loadMeshyFile(filename));
  if (scene.isDisposed) {
    throw new Error(`${rootName} scene disposed`);
  }

  let activePlugin: { dispose?: () => void } | undefined;
  const pluginObs = SceneLoader.OnPluginActivatedObservable.add((plugin) => {
    activePlugin = plugin as { dispose?: () => void };
  });

  const disposeLate = (container?: AssetContainer) => {
    try {
      activePlugin?.dispose?.();
    } catch {
      /* plugin may already be torn down */
    }
    try {
      container?.dispose();
    } catch {
      /* late container must not stay attached to a disposed scene */
    }
  };

  let container: AssetContainer;
  try {
    container = await withTimeout(
      SceneLoader.LoadAssetContainerAsync('', file, scene),
      MESHY_LOAD_TIMEOUT_MS,
      rootName,
      disposeLate
    );
  } finally {
    SceneLoader.OnPluginActivatedObservable.remove(pluginObs);
  }

  if (scene.isDisposed) {
    disposeLate(container);
    throw new Error(`${rootName} scene disposed`);
  }

  // One load per scene — this is a singleton piece of environment art, not
  // a template spawning many instances (unlike the crowd athletes), so add
  // the container's own nodes directly rather than cloning/instancing them.
  const root = container.rootNodes[0] as TransformNode | undefined;
  if (!root) {
    try {
      container.dispose();
    } catch {
      /* already gone */
    }
    throw new Error(`${rootName} produced no root`);
  }
  root.name = rootName;
  container.addAllToScene();

  if (scene.isDisposed) {
    try {
      root.dispose();
    } catch {
      /* already gone */
    }
    throw new Error(`${rootName} scene disposed`);
  }

  const meshes: AbstractMesh[] = [];
  root.getChildMeshes().forEach((m) => {
    m.isPickable = false;
    meshes.push(m);
  });

  return {
    root,
    meshes,
    dispose: () => {
      try {
        root.dispose();
      } catch {
        /* already gone */
      }
    },
  };
}

/**
 * Recenter a loaded mural on the live court's center/floor and scale it up
 * to AT LEAST the regulation footprint — never down. Vision: shrinking a
 * rich Meshy mural down to the old procedural court's small footprint is
 * what produced the "toy slab, tiny hoop/palms, empty void" complaint.
 * A mural that already ships bigger than regulation stays at its own
 * native size (uniform === 1, no scale applied); a too-small export is
 * grown up to the floor so it is never a degenerate sliver. Returns the
 * uniform scale actually applied, so the caller can size camera/hoop
 * dressing to match instead of forcing the mural smaller.
 */
export function fitMeshyPieceToFootprint(
  piece: MeshyPiece,
  targetWidth: number,
  targetDepth: number,
  centerZ: number
): number {
  const bounds = piece.root.getHierarchyBoundingVectors();
  const width = Math.max(1e-4, bounds.max.x - bounds.min.x);
  const depth = Math.max(1e-4, bounds.max.z - bounds.min.z);
  const growX = targetWidth / width;
  const growZ = targetDepth / depth;
  // Floor, not a forced fit: grow a too-small export up to regulation size,
  // but never shrink a mural that already reads bigger than the floor.
  const uniform = Math.max(1, Math.min(growX, growZ));
  piece.root.scaling.set(uniform, uniform, uniform);

  const scaledBounds = piece.root.getHierarchyBoundingVectors();
  const centerX = (scaledBounds.max.x + scaledBounds.min.x) / 2;
  const centerZActual = (scaledBounds.max.z + scaledBounds.min.z) / 2;
  const floorY = scaledBounds.min.y;
  piece.root.position.x -= centerX;
  piece.root.position.z += centerZ - centerZActual;
  piece.root.position.y -= floorY;

  const finalWidth = width * uniform;
  const finalDepth = depth * uniform;
  // How much bigger than regulation the mural reads once fit — 1 when it
  // was grown exactly to the floor, > 1 when it kept its own bigger size.
  return Math.max(finalWidth / targetWidth, finalDepth / targetDepth);
}

export async function loadMeshyVeniceCourt(
  scene: Scene,
  opts: {
    courtWidth: number;
    courtDepth: number;
    surroundWidth: number;
    surroundDepth: number;
    courtCenterZ: number;
    courtFile?: File;
    surroundFile?: File;
  }
): Promise<MeshyVeniceCourt> {
  const results = await Promise.allSettled([
    attachMeshyPiece(scene, MESHY_COURT_GLB, 'meshy_venice_court', opts.courtFile),
    attachMeshyPiece(scene, MESHY_SURROUND_GLB, 'meshy_venice_surround', opts.surroundFile),
  ]);

  const [courtResult, surroundResult] = results;
  const court = courtResult.status === 'fulfilled' ? courtResult.value : null;
  const surround = surroundResult.status === 'fulfilled' ? surroundResult.value : null;

  let courtScale = 1;
  let surroundScale = 1;
  if (court && !scene.isDisposed) {
    courtScale = fitMeshyPieceToFootprint(court, opts.courtWidth, opts.courtDepth, opts.courtCenterZ);
  } else if (court) {
    court.dispose();
  }
  if (surround && !scene.isDisposed) {
    surroundScale = fitMeshyPieceToFootprint(surround, opts.surroundWidth, opts.surroundDepth, opts.courtCenterZ);
  } else if (surround) {
    surround.dispose();
  }

  const courtLoaded = !!court && !scene.isDisposed;
  const surroundLoaded = !!surround && !scene.isDisposed;
  // The court floor is the regulation reference; the surround (palms, pier,
  // sky) rides along at whichever scale reads bigger so it never looks like
  // an empty void around a correctly-sized floor.
  const worldScale = Math.max(courtLoaded ? courtScale : 1, surroundLoaded ? surroundScale : 1);

  return {
    court: courtLoaded ? court : null,
    surround: surroundLoaded ? surround : null,
    courtLoaded,
    surroundLoaded,
    worldScale,
    dispose: () => {
      court?.dispose();
      surround?.dispose();
    },
  };
}

/** Hide only the cheap floor slab the Meshy court GLB replaces. Rim/backboard/post are untouched. */
export function hideCheapCourtMeshes(scene: Scene): void {
  for (const name of CHEAP_COURT_MESH_NAMES) {
    scene.getMeshByName(name)?.setEnabled(false);
  }
}

/** Hide only the cheap sky/water/fence/bleacher backdrop the Meshy surround GLB replaces. */
export function hideCheapSurroundMeshes(scene: Scene): void {
  for (const name of CHEAP_SURROUND_MESH_NAMES) {
    scene.getMeshByName(name)?.setEnabled(false);
  }
  for (const mesh of scene.meshes) {
    if (CHEAP_SURROUND_PREFIXES.some((prefix) => mesh.name.startsWith(prefix))) {
      mesh.setEnabled(false);
    }
  }
}