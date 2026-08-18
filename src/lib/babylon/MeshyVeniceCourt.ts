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
 * Scale + recenter a loaded mural to the SAME gameplay footprint the
 * procedural court already uses — derived from the live map's own
 * dimensions, not an invented number. Floor sits at y = 0.
 */
export function fitMeshyPieceToFootprint(
  piece: MeshyPiece,
  targetWidth: number,
  targetDepth: number,
  centerZ: number
): void {
  const bounds = piece.root.getHierarchyBoundingVectors();
  const width = Math.max(1e-4, bounds.max.x - bounds.min.x);
  const depth = Math.max(1e-4, bounds.max.z - bounds.min.z);
  const scaleX = targetWidth / width;
  const scaleZ = targetDepth / depth;
  const uniform = Math.min(scaleX, scaleZ);
  piece.root.scaling.set(uniform, uniform, uniform);

  const scaledBounds = piece.root.getHierarchyBoundingVectors();
  const centerX = (scaledBounds.max.x + scaledBounds.min.x) / 2;
  const centerZActual = (scaledBounds.max.z + scaledBounds.min.z) / 2;
  const floorY = scaledBounds.min.y;
  piece.root.position.x -= centerX;
  piece.root.position.z += centerZ - centerZActual;
  piece.root.position.y -= floorY;
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

  if (court && !scene.isDisposed) {
    fitMeshyPieceToFootprint(court, opts.courtWidth, opts.courtDepth, opts.courtCenterZ);
  } else if (court) {
    court.dispose();
  }
  if (surround && !scene.isDisposed) {
    fitMeshyPieceToFootprint(surround, opts.surroundWidth, opts.surroundDepth, opts.courtCenterZ);
  } else if (surround) {
    surround.dispose();
  }

  const courtLoaded = !!court && !scene.isDisposed;
  const surroundLoaded = !!surround && !scene.isDisposed;

  return {
    court: courtLoaded ? court : null,
    surround: surroundLoaded ? surround : null,
    courtLoaded,
    surroundLoaded,
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