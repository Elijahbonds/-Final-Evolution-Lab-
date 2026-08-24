#!/usr/bin/env node
/**
 * Studio-safe ZIP of this branch. Pure Node — no `zip` binary.
 *
 * Packs dunk code and same-origin assets. NEVER packs
 * venice-blue-court.glb / venice-court-surround.glb (any case, any parent
 * folder, / or \\) and NEVER packs a FEL-meshy-placeholder stub. Empty
 * emit and write failure are fail-closed: no archive left behind.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const STUDIO_UNSAFE_MESHY_GLBS = Object.freeze([
  'venice-blue-court.glb',
  'venice-court-surround.glb',
]);

export const STUDIO_MESHY_STUB_MAX_BYTES = 8192;
export const STUDIO_MESHY_PLACEHOLDER_GENERATOR = 'FEL-meshy-placeholder';

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

const UNSAFE_BASENAMES = new Set(STUDIO_UNSAFE_MESHY_GLBS.map((n) => n.toLowerCase()));

/** Normalize separators so basename works for / and \\. */
export function normalizeZipPath(relPath) {
  return String(relPath ?? '').replace(/\\/g, '/');
}

export function zipBasename(relPath) {
  const parts = normalizeZipPath(relPath).split('/').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

/** Case-insensitive mural basename, any parent folder, / or \\. */
export function isStudioUnsafeMeshyPath(relPath) {
  return UNSAFE_BASENAMES.has(zipBasename(relPath).toLowerCase());
}

export function readGlbGenerator(bytes) {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (buf.length < 20) return null;
  if (buf.readUInt32LE(0) !== 0x46546c67) return null;
  const jsonChunkLength = buf.readUInt32LE(12);
  const jsonChunkType = buf.readUInt32LE(16);
  if (jsonChunkType !== 0x4e4f534a) return null;
  if (20 + jsonChunkLength > buf.length) return null;
  try {
    const json = JSON.parse(buf.subarray(20, 20 + jsonChunkLength).toString('utf8'));
    return json.asset?.generator ?? null;
  } catch {
    return null;
  }
}

export function isPlaceholderMeshyBytes(bytes) {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (buf.length <= STUDIO_MESHY_STUB_MAX_BYTES && readGlbGenerator(buf) === STUDIO_MESHY_PLACEHOLDER_GENERATOR) {
    return true;
  }
  return readGlbGenerator(buf) === STUDIO_MESHY_PLACEHOLDER_GENERATOR;
}

function looksLikeGlbName(relPath) {
  return zipBasename(relPath).toLowerCase().endsWith('.glb');
}

/** Name or FEL-meshy-placeholder tag — either is enough to refuse. */
export function shouldOmitFromStudioSafeZip(relPath, bytes) {
  if (isStudioUnsafeMeshyPath(relPath)) return true;
  if (bytes && isPlaceholderMeshyBytes(bytes)) return true;
  return false;
}

function shouldSkipDir(name) {
  return SKIP_DIR_NAMES.has(name);
}

function readMaybeGlb(abs, rel) {
  if (!looksLikeGlbName(rel)) return null;
  try {
    return readFileSync(abs);
  } catch {
    return null;
  }
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
    const sniff = readMaybeGlb(abs, rel);
    if (shouldOmitFromStudioSafeZip(rel, sniff ?? undefined)) continue;
    acc.push(rel);
  }
}

export function collectStudioSafeEntries(root) {
  const acc = [];
  for (const dir of INCLUDE_DIRS) {
    const abs = join(root, dir);
    if (existsSync(abs)) walkFiles(abs, root, acc);
  }
  for (const f of INCLUDE_ROOT_FILES) {
    const abs = join(root, f);
    if (!existsSync(abs)) continue;
    const sniff = readMaybeGlb(abs, f);
    if (shouldOmitFromStudioSafeZip(f, sniff ?? undefined)) continue;
    acc.push(f);
  }
  return [...new Set(acc)].sort();
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const dosTime =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

/** Store-method ZIP in process. No `zip` binary. */
export function buildStoredZip(files) {
  const { dosTime, dosDate } = dosDateTime();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(normalizeZipPath(file.name), 'utf8');
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += 30 + name.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, cd, eocd]);
}

function removeIfPresent(outPath) {
  try {
    if (existsSync(outPath)) unlinkSync(outPath);
  } catch {
    /* fail-closed best effort */
  }
}

export function writeStudioSafeZip({ root, outPath }) {
  let entries = collectStudioSafeEntries(root).filter((rel) => {
    const abs = join(root, rel);
    const sniff = existsSync(abs) ? readMaybeGlb(abs, rel) : null;
    return !shouldOmitFromStudioSafeZip(rel, sniff ?? undefined);
  });
  if (entries.length === 0) {
    removeIfPresent(outPath);
    throw new Error('refusing to emit an empty Studio-safe ZIP');
  }
  mkdirSync(dirname(outPath), { recursive: true });
  removeIfPresent(outPath);
  try {
    const files = [];
    for (const rel of entries) {
      const abs = join(root, rel);
      const data = readFileSync(abs);
      if (shouldOmitFromStudioSafeZip(rel, data)) continue;
      files.push({ name: normalizeZipPath(rel), data });
    }
    if (files.length === 0) {
      throw new Error('refusing to emit an empty Studio-safe ZIP');
    }
    const archive = buildStoredZip(files);
    writeFileSync(outPath, archive);
    const listed = listZipEntries(outPath);
    if (listed.length === 0 || zipHasStudioUnsafeMeshy(listed) || zipHasMeshyStubAtUnsafeNames(listed)) {
      throw new Error('refusing to emit a ZIP that contains Studio Meshy mural paths or is empty');
    }
    return { outPath, entries: files.map((f) => f.name) };
  } catch (err) {
    removeIfPresent(outPath);
    throw err;
  }
}

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
  console.log(`wrote ${outPath} (${entries.length} files, mural GLBs and FEL-meshy-placeholder omitted)`);
}
