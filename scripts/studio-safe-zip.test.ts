/**
 * Studio-safe packer: ZIP listing must never include Studio mural GLBs
 * or a <8KB stub at those names — even if the files exist on disk.
 */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MESHY_COURT_GLB,
  MESHY_SURROUND_GLB,
  MESHY_PLACEHOLDER_MAX_BYTES,
} from '../src/lib/babylon/VeniceNightCourt';
import {
  STUDIO_MESHY_STUB_MAX_BYTES,
  STUDIO_UNSAFE_MESHY_GLBS,
  collectStudioSafeEntries,
  isStudioUnsafeMeshyPath,
  listZipEntries,
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

export function runStudioSafeZipTests(): TestResult[] {
  const results: TestResult[] = [];
  const repoRoot = fileURLToPath(new URL('..', import.meta.url));

  {
    const namesMatch =
      STUDIO_UNSAFE_MESHY_GLBS.includes(MESHY_COURT_GLB) &&
      STUDIO_UNSAFE_MESHY_GLBS.includes(MESHY_SURROUND_GLB) &&
      STUDIO_MESHY_STUB_MAX_BYTES === MESHY_PLACEHOLDER_MAX_BYTES &&
      isStudioUnsafeMeshyPath(`public/assets/${MESHY_COURT_GLB}`) &&
      isStudioUnsafeMeshyPath(`public/assets/${MESHY_SURROUND_GLB}`) &&
      !isStudioUnsafeMeshyPath('public/assets/basketball_dunk__elijah.bvh') &&
      !isStudioUnsafeMeshyPath('public/assets/dunker-transformed.glb');
    results.push({
      name: 'Packer skip list is the two Studio mural GLBs (not Elijah / dunker)',
      passed: namesMatch,
      actual: STUDIO_UNSAFE_MESHY_GLBS.join(','),
      expected: `${MESHY_COURT_GLB},${MESHY_SURROUND_GLB}; stubMax=${MESHY_PLACEHOLDER_MAX_BYTES}`,
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
    'package.json': '{"name":"fixture"}\n',
    'index.html': '<html></html>\n',
  });

  {
    const collected = collectStudioSafeEntries(fixture);
    const skipped =
      !collected.some((e) => isStudioUnsafeMeshyPath(e)) &&
      collected.includes('src/App.tsx') &&
      collected.includes('public/assets/basketball_dunk__elijah.bvh') &&
      collected.includes('public/assets/dunker-transformed.glb');
    results.push({
      name: 'Collector omits mural GLBs even when stub files are present on disk',
      passed: skipped,
      actual: collected.filter((e) => e.includes('assets/')).join(',') || collected.join(','),
      expected: 'elijah + dunker in list; no venice-blue-court.glb / venice-court-surround.glb',
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
    results.push({
      name: 'Fixture ZIP listing has dunk code + same-origin assets and no mural GLB / <8KB stub at those names',
      passed: hasDunk && noMuralNames && noStubAtThoseNames && noTinyMural,
      actual: `files=${names.join('|')} unsafe=${zipHasStudioUnsafeMeshy(listing)} stub=${zipHasMeshyStubAtUnsafeNames(listing)}`,
      expected: 'pad/loop/retain/App/elijah present; no venice-blue-court.glb or venice-court-surround.glb',
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
    const retainSrc = names.some((n) => n.includes('VeniceNightCourt'));
    const noMural = !zipHasStudioUnsafeMeshy(listing) && !zipHasMeshyStubAtUnsafeNames(listing);
    results.push({
      name: 'Branch ZIP listing has no venice-blue-court.glb / venice-court-surround.glb and no <8KB stub at those names',
      passed: hasBranchDunk && retainSrc && noMural && listing.length > 10,
      actual: `count=${listing.length} unsafe=${listing.filter((e) => isStudioUnsafeMeshyPath(e.name)).map((e) => `${e.name}:${e.size}`).join(',') || 'none'}`,
      expected: 'dunk code + elijah packed; mural GLB names absent at any size',
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
