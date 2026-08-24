/**
 * Studio-safe packer: ZIP listing must never include Studio mural GLBs
 * or a <8KB stub at those names — even mixed-case, backslashes, renamed
 * parents, or FEL-meshy-placeholder tags.
 */
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MESHY_COURT_GLB,
  MESHY_SURROUND_GLB,
  MESHY_PLACEHOLDER_GENERATOR,
  MESHY_PLACEHOLDER_MAX_BYTES,
} from '../src/lib/babylon/VeniceNightCourt';
import {
  STUDIO_MESHY_PLACEHOLDER_GENERATOR,
  STUDIO_MESHY_STUB_MAX_BYTES,
  STUDIO_UNSAFE_MESHY_GLBS,
  collectStudioSafeEntries,
  isStudioUnsafeMeshyPath,
  listZipEntries,
  shouldOmitFromStudioSafeZip,
  writeStudioSafeZip,
  zipHasMeshyStubAtUnsafeNames,
  zipHasStudioUnsafeMeshy,
} from './pack-studio-safe-zip.mjs';

export interface TestResult {
  name: string;
  passed: boolean;
  actual: string;
  expected: string;
}

function writeTree(root: string, files: Record<string, string | Buffer>): void {
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, body);
  }
}

function buildPlaceholderGlb(name: string): Buffer {
  const json = JSON.stringify({
    asset: { version: '2.0', generator: MESHY_PLACEHOLDER_GENERATOR },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: `${name}Root` }],
  });
  const jsonPad = (4 - (json.length % 4)) % 4;
  const jsonChunk = Buffer.concat([Buffer.from(json, 'utf8'), Buffer.alloc(jsonPad, 0x20)]);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const bin = Buffer.alloc(0);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(0, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  const total = 12 + jsonHeader.length + jsonChunk.length + binHeader.length + bin.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);
  return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, bin]);
}

export function runStudioSafeZipTests(): TestResult[] {
  const results: TestResult[] = [];
  const repoRoot = fileURLToPath(new URL('..', import.meta.url));

  {
    const namesMatch =
      STUDIO_UNSAFE_MESHY_GLBS.includes(MESHY_COURT_GLB) &&
      STUDIO_UNSAFE_MESHY_GLBS.includes(MESHY_SURROUND_GLB) &&
      STUDIO_MESHY_STUB_MAX_BYTES === MESHY_PLACEHOLDER_MAX_BYTES &&
      STUDIO_MESHY_PLACEHOLDER_GENERATOR === MESHY_PLACEHOLDER_GENERATOR &&
      isStudioUnsafeMeshyPath(`public/assets/${MESHY_COURT_GLB}`) &&
      isStudioUnsafeMeshyPath(`public/assets/${MESHY_SURROUND_GLB}`) &&
      isStudioUnsafeMeshyPath(`Import\\Assets\\VENICE-BLUE-COURT.GLB`) &&
      isStudioUnsafeMeshyPath('renamed-parent/Venice-Court-Surround.Glb') &&
      !isStudioUnsafeMeshyPath('public/assets/basketball_dunk__elijah.bvh') &&
      !isStudioUnsafeMeshyPath('public/assets/dunker-transformed.glb');
    const taggedStub = buildPlaceholderGlb('Sneak');
    const tagOmit =
      shouldOmitFromStudioSafeZip('public/assets/harmless-lookalike.glb', taggedStub) &&
      shouldOmitFromStudioSafeZip('public/assets/VENICE-BLUE-COURT.GLB', Buffer.alloc(200));
    results.push({
      name: 'Omit is case-insensitive basename + FEL-meshy-placeholder tag (not Elijah / dunker)',
      passed: namesMatch && tagOmit && taggedStub.byteLength < STUDIO_MESHY_STUB_MAX_BYTES,
      actual: `${STUDIO_UNSAFE_MESHY_GLBS.join(',')} tag=${STUDIO_MESHY_PLACEHOLDER_GENERATOR}`,
      expected: `mixed-case/backslash mural names + ${MESHY_PLACEHOLDER_GENERATOR} omitted; stubMax=${MESHY_PLACEHOLDER_MAX_BYTES}`,
    });
  }

  const fixture = mkdtempSync(join(tmpdir(), 'fel-studio-safe-'));
  writeTree(fixture, {
    'src/App.tsx': 'export const dunkLive = true;\n',
    'src/core/VeniceDunkLoop.ts': 'export class VeniceDunkAttempt {}\n',
    'src/components/modes/EmulatorPadOverlay.tsx': 'export function EmulatorPadOverlay() { return null; }\n',
    'src/lib/babylon/VeniceNightCourt.ts': 'export function retainLiveMeshyMural() { return true; }\n',
    'public/assets/basketball_dunk__elijah.bvh': 'HIERARCHY\n',
    'public/assets/dunker-transformed.glb': Buffer.alloc(64, 1),
    [`public/assets/${MESHY_COURT_GLB}`]: Buffer.alloc(200, 2),
    [`public/assets/${MESHY_SURROUND_GLB}`]: Buffer.alloc(300, 3),
    'public/Import/VENICE-BLUE-COURT.GLB': Buffer.alloc(180, 4),
    'public/renamed-parent/Venice-Court-Surround.Glb': Buffer.alloc(220, 5),
    'public/assets/harmless-lookalike.glb': buildPlaceholderGlb('Lookalike'),
    'package.json': '{"name":"fixture"}\n',
    'index.html': '<html></html>\n',
  });

  {
    const collected = collectStudioSafeEntries(fixture);
    const skipped =
      !collected.some((e) => isStudioUnsafeMeshyPath(e)) &&
      !collected.some((e) => e.toLowerCase().includes('venice-blue-court')) &&
      !collected.some((e) => e.toLowerCase().includes('venice-court-surround')) &&
      !collected.includes('public/assets/harmless-lookalike.glb') &&
      collected.includes('src/App.tsx') &&
      collected.includes('public/assets/basketball_dunk__elijah.bvh') &&
      collected.includes('public/assets/dunker-transformed.glb');
    results.push({
      name: 'Collector omits mixed-case mural names, renamed parents, and FEL-meshy-placeholder even when stubs are on disk',
      passed: skipped,
      actual: collected.filter((e) => e.includes('assets/') || e.includes('Import') || e.includes('renamed')).join(',') || collected.join(','),
      expected: 'elijah + dunker in list; no mixed-case mural paths; no tagged lookalike',
    });
  }

  {
    const outPath = join(fixture, 'dist', 'venice-dunk-studio-safe.zip');
    writeStudioSafeZip({ root: fixture, outPath });
    const listing = listZipEntries(outPath);
    const names = listing.map((e) => e.name);
    const hasDunk =
      names.some((n) => n.endsWith('App.tsx')) &&
      names.some((n) => n.includes('VeniceDunkLoop')) &&
      names.some((n) => n.includes('EmulatorPadOverlay')) &&
      names.some((n) => n.includes('VeniceNightCourt')) &&
      names.some((n) => n.includes('basketball_dunk__elijah.bvh'));
    const noMuralNames = !zipHasStudioUnsafeMeshy(listing);
    const noStubAtThoseNames = !zipHasMeshyStubAtUnsafeNames(listing);
    const noTinyMural = !listing.some(
      (e) => isStudioUnsafeMeshyPath(e.name) && e.size < STUDIO_MESHY_STUB_MAX_BYTES
    );
    const noMixedOrTagged = !names.some((n) => {
      const lower = n.toLowerCase().replace(/\\/g, '/');
      return (
        lower.endsWith('venice-blue-court.glb') ||
        lower.endsWith('venice-court-surround.glb') ||
        lower.endsWith('harmless-lookalike.glb')
      );
    });
    results.push({
      name: 'Fixture ZIP listing has dunk code + same-origin assets and no mural GLB / <8KB stub at those names',
      passed: hasDunk && noMuralNames && noStubAtThoseNames && noTinyMural && noMixedOrTagged,
      actual: `files=${names.join('|')} unsafe=${zipHasStudioUnsafeMeshy(listing)} stub=${zipHasMeshyStubAtUnsafeNames(listing)}`,
      expected: 'pad/loop/retain/App/elijah present; no venice-blue-court.glb or venice-court-surround.glb (any case); no tagged stub',
    });
  }

  {
    const outPath = join(fixture, 'dist', 'branch-studio-safe.zip');
    writeStudioSafeZip({ root: repoRoot, outPath });
    const listing = listZipEntries(outPath);
    const names = listing.map((e) => e.name.replace(/\\/g, '/'));
    const hasBranchDunk =
      names.some((n) => n.endsWith('src/App.tsx') || n === 'src/App.tsx') &&
      names.some((n) => n.includes('EmulatorPadOverlay')) &&
      names.some((n) => n.includes('VeniceDunkLoop')) &&
      names.some((n) => n.includes('VeniceNightCourt')) &&
      names.some((n) => n.includes('basketball_dunk__elijah.bvh'));
    const noMural = !zipHasStudioUnsafeMeshy(listing) && !zipHasMeshyStubAtUnsafeNames(listing);
    const noMixed = !names.some((n) => {
      const base = n.toLowerCase().split('/').pop() ?? '';
      return base === 'venice-blue-court.glb' || base === 'venice-court-surround.glb';
    });
    results.push({
      name: 'Branch ZIP listing has no venice-blue-court.glb / venice-court-surround.glb and no <8KB stub at those names',
      passed: hasBranchDunk && noMural && noMixed && listing.length > 10,
      actual: `count=${listing.length} unsafe=${listing.filter((e) => isStudioUnsafeMeshyPath(e.name)).map((e) => `${e.name}:${e.size}`).join(',') || 'none'}`,
      expected: 'dunk code + elijah packed; mural GLB names absent at any size/case',
    });
  }

  {
    const emptyRoot = mkdtempSync(join(tmpdir(), 'fel-studio-empty-'));
    const leftover = join(emptyRoot, 'pre-existing.zip');
    writeFileSync(leftover, 'not-a-real-zip');
    const outPath = leftover;
    let threw = false;
    let message = '';
    try {
      writeStudioSafeZip({ root: emptyRoot, outPath });
    } catch (err) {
      threw = true;
      message = err instanceof Error ? err.message : String(err);
    }
    const gone = !existsSync(outPath);
    results.push({
      name: 'Empty zip is fail-closed — throws and leaves no archive behind',
      passed: threw && gone && /empty/i.test(message),
      actual: `threw=${threw} gone=${gone} msg=${message}`,
      expected: 'refusing empty ZIP; leftover archive removed',
    });
  }

  return results;
}

const nodeProcess = typeof process !== 'undefined' ? process : undefined;
if (nodeProcess?.argv?.[1]?.includes('studio-safe-zip')) {
  console.log('=== STUDIO-SAFE ZIP ===\n');
  const rows = runStudioSafeZipTests();
  let all = true;
  for (const t of rows) {
    console.log(`${t.passed ? '✓ PASS' : '✗ FAIL'} | ${t.name}`);
    console.log(`  Actual: ${t.actual}`);
    console.log(`  Expected: ${t.expected}\n`);
    if (!t.passed) all = false;
  }
  if (!all) {
    console.error('Studio-safe zip tests failed.');
    nodeProcess?.exit(1);
  } else {
    console.log('Studio-safe zip verified.');
  }
}
