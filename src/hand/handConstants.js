// src/hand/handConstants.js
import * as THREE from "three";

// Same 21-joint skeleton you used before:
export const HAND_BONES_21 = [
  // thumb
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  // index
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  // middle
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  // ring
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  // pinky
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
];

export const FINGER_JOINTS = {
  thumb: [0, 1, 2, 3, 4],
  index: [0, 5, 6, 7, 8],
  middle: [0, 9, 10, 11, 12],
  ring: [0, 13, 14, 15, 16],
  pinky: [0, 17, 18, 19, 20],
};

export const FINGER_NAMES = ["thumb", "index", "middle", "ring", "pinky"];

export const DEFAULTS = {
  pointRadius: 0.052,
  lineWidth: 1,
  degrees: true,
};

// Rest pose directions (unit vectors)
export const REST_FINGER_DIRECTIONS = {
  thumb: new THREE.Vector3(0.6, 0.8, 0.0).normalize(),
  index: new THREE.Vector3(0.2, 1.0, 0.0).normalize(),
  middle: new THREE.Vector3(0.0, 1.0, 0.0).normalize(),
  ring: new THREE.Vector3(-0.1, 1.0, 0.0).normalize(),
  pinky: new THREE.Vector3(-0.2, 1.0, 0.0).normalize(),
};

const TOTAL_LENGTH_MM = {
  thumb: 49.5,
  index: 63.9,
  middle: 70.7,
  ring: 65.5,
  pinky: 53.3,
};

// metacarpal : proximal : middle : distal
const FIB_WEIGHTS_4 = [4.236, 2.618, 1.618, 1.0];

function normalizeWeights(ws) {
  const s = ws.reduce((a, b) => a + b, 0);
  return ws.map((w) => w / s);
}

const W4 = normalizeWeights(FIB_WEIGHTS_4);

export function buildDefaultBoneLength({ scale = 0.03 } = {}) {
  // returns: { thumb:[l0,l1,l2,l3], index:[...], ... } lengths in "scene units"
  const out = {};
  for (const k of Object.keys(TOTAL_LENGTH_MM)) {
    const total = TOTAL_LENGTH_MM[k] * scale;
    out[k] = W4.map((w) => w * total);
  }
  return out;
}

/**
 * WORLD-space spherical direction (Y-up convention).
 * - phi: polar angle from +Y (0..pi)
 * - theta: azimuth around Y (0..2pi)
 *
 * This returns a unit vector in world coordinates.
 */
export function dirFromPhiTheta(phi, theta) {
  const sinP = Math.sin(phi);
  const cosP = Math.cos(phi);

  const x = sinP * Math.cos(theta);
  const z = sinP * Math.sin(theta);
  const y = cosP;

  return new THREE.Vector3(x, y, z).normalize();
}

/**
 * Build an orthonormal basis given a forward axis (zAxis).
 * Returns {x, y, z} unit vectors.
 */
export function buildLocalFrame(zAxis) {
  const z = zAxis.clone().normalize();

  // Choose a fallback that isn't parallel to z
  const fallback =
    Math.abs(z.y) < 0.99
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);

  const x = new THREE.Vector3().crossVectors(fallback, z).normalize();
  const y = new THREE.Vector3().crossVectors(z, x).normalize();

  return { x, y, z };
}

/**
 * LOCAL-frame spherical direction:
 * Interprets (phi, theta) relative to parentAxis (the previous bone forward direction).
 *
 * Convention:
 * - phi   = polar angle from +parentAxis (0 => straight)
 * - theta = azimuth around parentAxis
 *
 * Returns a world-space unit vector.
 */
export function dirFromPhiThetaLocal(parentAxis, phi, theta) {
  const { x, y, z } = buildLocalFrame(parentAxis);

  const sinP = Math.sin(phi);
  const cosP = Math.cos(phi);

  // Local coordinates in the frame (x,y,z)
  const lx = sinP * Math.cos(theta);
  const ly = sinP * Math.sin(theta);
  const lz = cosP;

  return x
    .clone()
    .multiplyScalar(lx)
    .add(y.clone().multiplyScalar(ly))
    .add(z.clone().multiplyScalar(lz))
    .normalize();
}
