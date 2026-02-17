// src/motion/motionLoader.js
import { parseJsonlText } from "./jsonl";
import { publicUrl } from "./motionPaths";

const _textCache = new Map(); // url -> raw text
const _clipCache = new Map(); // url -> parsed clip
const _inFlight = new Map(); // url -> Promise

export function clearMotionCache() {
  _textCache.clear();
  _clipCache.clear();
  _inFlight.clear();
}

export async function fetchTextCached(url, { force = false, signal } = {}) {
  if (!force && _textCache.has(url)) return _textCache.get(url);
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);
  const text = await res.text();
  _textCache.set(url, text);
  return text;
}

/**
 * motionMeta:
 * {
 *   id?: string
 *   filename: "converted_angles_phi_theta/json/<scene>/keypoints_3d/<seq>/angles_both.jsonl"
 *   scene?: string
 *   sequence?: string
 *   text?: string
 *   ...anything
 * }
 */
export async function loadMotionJsonl(
  motionMeta,
  { force = false, signal } = {},
) {
  if (!motionMeta?.filename)
    throw new Error("loadMotionJsonl: motionMeta.filename missing");

  const url = publicUrl(motionMeta.filename);

  if (!force && _clipCache.has(url)) return _clipCache.get(url);
  if (!force && _inFlight.has(url)) return _inFlight.get(url);

  const p = (async () => {
    const text = await fetchTextCached(url, { force, signal });
    const frames = parseJsonlText(text);

    const clip = {
      meta: motionMeta,
      url,
      numFrames: frames.length,
      frames,
    };

    _clipCache.set(url, clip);
    return clip;
  })();

  _inFlight.set(url, p);
  try {
    return await p;
  } finally {
    _inFlight.delete(url);
  }
}

export function prefetchMotionJsonl(motionMeta) {
  // no await; still cached
  loadMotionJsonl(motionMeta).catch(() => {});
}
