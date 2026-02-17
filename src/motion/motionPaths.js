// src/motion/motionPaths.js
export function publicUrl(relPath) {
  const clean = String(relPath || "").replace(/^\/+/, "");
  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "/");
  return `${base}${clean}`;
}
