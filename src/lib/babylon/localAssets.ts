/** Same-origin /assets only. No Mixamo CDN or remote fetch. */

export const LOCAL_DUNKER_GLB = 'dunker-transformed.glb';
export const LOCAL_ELIJAH_BVH = 'basketball_dunk__elijah.bvh';
export const LOCAL_ASSET_TIMEOUT_MS = 12000;

export function localAssetUrl(filename: string): string {
  const base =
    (typeof import.meta !== 'undefined' &&
      (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) ||
    '/';
  const root = base.endsWith('/') ? base : `${base}/`;
  return `${root}assets/${filename.replace(/^\/+/, '')}`;
}

export function isRemoteAssetUrl(url: string): boolean {
  if (/mixamo\.com|models\.mixamo|cdn\.|readyplayer/i.test(url)) return true;
  if (!/^https?:\/\//i.test(url)) return false;
  if (typeof location === 'undefined') return true;
  try {
    return new URL(url).origin !== location.origin;
  } catch {
    return true;
  }
}

export async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let id: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        id = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
      }),
    ]);
  } finally {
    if (id !== undefined) clearTimeout(id);
  }
}

export async function fetchLocalBytes(
  url: string,
  ms = LOCAL_ASSET_TIMEOUT_MS
): Promise<ArrayBuffer> {
  if (isRemoteAssetUrl(url)) {
    throw new Error('blocked remote Mixamo fetch');
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`local asset missing: ${url}`);
    return await res.arrayBuffer();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchLocalText(url: string, ms = LOCAL_ASSET_TIMEOUT_MS): Promise<string> {
  const bytes = await fetchLocalBytes(url, ms);
  return new TextDecoder().decode(bytes);
}
