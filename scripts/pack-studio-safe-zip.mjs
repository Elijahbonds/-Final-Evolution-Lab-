#!/usr/bin/env node
/**
 * Studio-safe ZIP of this branch.
 *
 * Packs dunk code (pad, loop, Meshy retain, App full-bleed) and same-origin
 * assets. NEVER packs venice-blue-court.glb / venice-court-surround.glb —
 * those live only in AI Studio (~3.0MB / ~1.8MB). Omit the paths, or skip
 * them if they are present on disk, so an import cannot wipe the mural.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const STUDIO_UNSAFE_MESHY_GLBS = Object.freeze([
  'venice-blue-court.glb',
  'venice-court-surround.glb',
]);

/** Same ceiling as MESHY_PLACEHOLDER_MAX_BYTES — a stub at these names is never PLACE. */
export const STUDIO_MESHY_STUB_MAX_BYTES = 8192;

const INCLUDE_DIRS = ['src', 'public', 'scripts'];
const INCLUDE_ROOT_FILES = [
  'package.json',
  'package-lock.json',
  'index.html',
  'vite.config.ts',
  'tsconfig.json',
  'tsconfig.node.json',
  'tailwind.config.js',
  'postcss.config.js',
  'metadata.json',
  '.gitignore',
];
const SKIP_DIR_NAMES = new Set(['node_modules', '.git', 'dist', 'coverage']);

export function isStudioUnsafeMeshyPath(relPath) {
  const base = String(relPath).replace(/\\/g, '/').split('/').pop();
  return STUDIO_UNSAFE_MESHY_GLBS.includes(base ?? '');
}

function shouldSkipDir(name) {
  return SKIP_DIR_NAMES.has(name);
}

function walkFiles(dir, root, acc) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.env')) continue;
    const abs = join(dir, ent.name);
    const rel = relative(root, abs).split(sep).join('/');
    if (ent.isDirectory()) {
      if (shouldSkipDir(ent.name)) continue;
      walkFiles(abs, root, acc);
      continue;
    }
    if (!ent.isFile()) continue;
    if (rel.endsWith('.zip')) continue;
    if (isStudioUnsafeMeshyPath(rel)) continue;
    acc.push(rel);
  }
}

/** Branch snapshot for Studio. Mural GLB basenames are never collected. */
export function collectStudioSafeEntries(root) {
  const acc = [];
  for (const dir of INCLUDE_DIRS) {
    const abs = join(root, dir);
    if (existsSync(abs)) walkFiles(abs, root, acc);
  }
  for (const f of INCLUDE_ROOT_FILES) {
    if (!existsSync(join(root, f))) continue;
    if (isStudioUnsafeMeshyPath(f)) continue;
    acc.push(f);
  }
  return [...new Set(acc)].sort();
}

export function writeStudioSafeZip({ root, outPath }) {
  const entries = collectStudioSafeEntries(root).filter((rel) => !isStudioUnsafeMeshyPath(rel));
  mkdirSync(dirname(outPath), { recursive: true });
  if (existsSync(outPath)) unlinkSync(outPath);
  const r = spawnSync('zip', ['-q', '-X', '-@', outPath], {
    cwd: root,
    input: entries.length ? `${entries.join('\n')}\n` : '',
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    throw new Error(r.stderr?.trim() || r.stdout?.trim() || 'zip failed');
  }
  return { outPath, entries };
}

/** Central-directory listing: name + uncompressed size. */
export function listZipEntries(zipPath) {
  const buf = readFileSync(zipPath);
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('not a zip');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const listed = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error('bad zip central directory');
    const size = buf.readUInt32LE(off + 24);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const name = buf.subarray(off + 46, off + 46 + nameLen).toString('utf8');
    listed.push({ name, size });
    off += 46 + nameLen + extraLen + commentLen;
  }
  return listed;
}

export function zipHasStudioUnsafeMeshy(entries) {
  return entries.some((e) => isStudioUnsafeMeshyPath(e.name));
}

export function zipHasMeshyStubAtUnsafeNames(entries, stubMax = STUDIO_MESHY_STUB_MAX_BYTES) {
  return entries.some((e) => isStudioUnsafeMeshyPath(e.name) && e.size < stubMax);
}

function repoRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] || repoRoot());
  const outPath = resolve(process.argv[3] || join(root, 'dist', 'venice-dunk-studio-safe.zip'));
  const { entries } = writeStudioSafeZip({ root, outPath });
  const listed = listZipEntries(outPath);
  if (zipHasStudioUnsafeMeshy(listed) || zipHasMeshyStubAtUnsafeNames(listed)) {
    unlinkSync(outPath);
    throw new Error('refusing to emit a ZIP that contains Studio Meshy mural paths');
  }
  console.log(`wrote ${outPath} (${entries.length} files, mural GLBs omitted)`);
}
