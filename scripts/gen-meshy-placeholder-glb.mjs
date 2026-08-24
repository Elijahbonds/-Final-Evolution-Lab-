#!/usr/bin/env node
/**
 * Hand-built minimal valid .glb fixtures standing in for the Meshy-exported
 * Venice court + surround. Same map, same footprint intent — just a flat
 * tinted quad at a DIFFERENT native scale than the live court, so the
 * fit-to-footprint code path in MeshyVeniceCourt.ts is actually exercised.
 *
 * Swap these two files in place once the real Meshy exports land; the
 * loader (fetch + File + glTF SceneLoader) and filenames do not change.
 */
import { existsSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets');

function pad4(len) {
  return (4 - (len % 4)) % 4;
}

function buildQuadGlb({ halfX, halfZ, color, name }) {
  // Unit-ish quad on the XZ plane, y = 0, centered at origin. Aspect ratio
  // deliberately matches the live court's target footprint so the
  // fit-to-footprint scale in MeshyVeniceCourt.ts stays uniform (no stretch).
  const positions = new Float32Array([
    -halfX, 0, -halfZ,
    halfX, 0, -halfZ,
    halfX, 0, halfZ,
    -halfX, 0, halfZ,
  ]);
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

  const posBytes = Buffer.from(positions.buffer);
  const idxBytes = Buffer.from(indices.buffer);
  const idxPad = pad4(idxBytes.length);
  const bin = Buffer.concat([posBytes, idxBytes, Buffer.alloc(idxPad)]);

  const json = {
    asset: { version: '2.0', generator: 'FEL-meshy-placeholder' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [
      { children: [1], name: `${name}Root` },
      { mesh: 0, name: `${name}Mesh` },
    ],
    meshes: [
      {
        name: `${name}Mesh`,
        primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }],
      },
    ],
    materials: [
      {
        name: `${name}Mat`,
        pbrMetallicRoughness: { baseColorFactor: color, metallicFactor: 0, roughnessFactor: 1 },
        doubleSided: true,
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 4,
        type: 'VEC3',
        min: [-halfX, 0, -halfZ],
        max: [halfX, 0, halfZ],
      },
      {
        bufferView: 1,
        componentType: 5123,
        count: 6,
        type: 'SCALAR',
      },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBytes.length, target: 34962 },
      { buffer: 0, byteOffset: posBytes.length, byteLength: idxBytes.length, target: 34963 },
    ],
    buffers: [{ byteLength: posBytes.length + idxBytes.length }],
  };

  const jsonStr = JSON.stringify(json);
  const jsonBytes = Buffer.from(jsonStr, 'utf8');
  const jsonPad = pad4(jsonBytes.length);
  const jsonChunkData = Buffer.concat([jsonBytes, Buffer.alloc(jsonPad, 0x20)]);

  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(jsonChunkData.length, 0);
  jsonChunkHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'

  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(bin.length, 0);
  binChunkHeader.writeUInt32LE(0x004e4942, 4); // 'BIN\0'

  const totalLength = 12 + jsonChunkHeader.length + jsonChunkData.length + binChunkHeader.length + bin.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // 'glTF'
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);

  return Buffer.concat([header, jsonChunkHeader, jsonChunkData, binChunkHeader, bin]);
}

// Aspect ratios mirror the real gameplay footprint (court 15.2x28, surround
// square) but at ~2.6x the regulation size — a real Meshy export ships as a
// rich, big environment, not a toy slab. fitMeshyPieceToFootprint must keep
// this native size (grow-only floor, never a forced shrink).
const court = buildQuadGlb({ halfX: 20, halfZ: 20 * (28 / 15.2), color: [0.05, 0.3, 0.62, 1.0], name: 'MeshyVeniceCourt' });
const surround = buildQuadGlb({ halfX: 60, halfZ: 60, color: [0.42, 0.38, 0.3, 1.0], name: 'MeshyVeniceSurround' });

const LIVE_MIN = 1_500_000;
const forceStub = process.argv.includes('--force-stub');
function writeUnlessLive(name, bytes) {
  const dest = join(outDir, name);
  if (!forceStub) {
    console.error(`refusing to write ${name} into public/assets (Studio live mural must not be overwritten)`);
    return;
  }
  if (existsSync(dest) && statSync(dest).size >= LIVE_MIN) {
    console.error(`refusing to overwrite live Meshy mural ${dest} (${statSync(dest).size} B)`);
    return;
  }
  writeFileSync(dest, bytes);
  console.log(`wrote ${bytes.length}B -> ${name}`);
}
writeUnlessLive('venice-blue-court.glb', court);
writeUnlessLive('venice-court-surround.glb', surround);
