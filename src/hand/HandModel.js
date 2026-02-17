// src/hand/HandModel.js
import * as THREE from "three";
import { log } from "three/tsl";
import {
  DEFAULTS,
  FINGER_JOINTS,
  FINGER_NAMES,
  HAND_BONES_21,
} from "./handConstants";

// Color schemes: keep simple + stable
export const HandColorSchemes = {
  mono: ({ baseColor = "#ffffff" } = {}) => ({
    jointColors: Array(21).fill(baseColor),
    lineColor: baseColor,
  }),

  byFinger: ({ palette } = {}) => {
    const pal = palette ?? {
      thumb: "#ff6b6b",
      index: "#ffd43b",
      middle: "#69db7c",
      ring: "#4dabf7",
      pinky: "#b197fc",
    };
    const jointColors = Array(21).fill("#ffffff");
    for (const name of FINGER_NAMES) {
      const ids = FINGER_JOINTS[name];
      for (const j of ids) jointColors[j] = pal[name];
    }
    return { jointColors, lineColor: "#ffffff" };
  },

  rainbowJoints: () => {
    const jointColors = Array.from({ length: 21 }, (_, i) => {
      const c = new THREE.Color().setHSL(i / 21, 0.75, 0.55);
      return `#${c.getHexString()}`;
    });
    return { jointColors, lineColor: "#ffffff" };
  },
};

export class HandModel {
  constructor({
    name = "hand",
    bones = HAND_BONES_21,
    pointRadius = DEFAULTS.pointRadius,
    rootAtOrigin = false,
    colorScheme = HandColorSchemes.mono({ baseColor: "#ffffff" }),
    offset = [0, 0, 0],
  } = {}) {
    this.name = name;
    this.bones = bones;
    this.pointRadius = pointRadius;
    this.rootAtOrigin = !!rootAtOrigin;
    this.offset = offset;

    this.group = new THREE.Group();
    this.group.name = name;

    // --- joints ---
    const sphereGeo = new THREE.SphereGeometry(pointRadius, 12, 12);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.joints = new THREE.InstancedMesh(sphereGeo, sphereMat, 21);
    this.joints.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.joints);

    // --- bones (line segments) ---
    this.linePositions = new Float32Array(this.bones.length * 2 * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(this.linePositions, 3),
    );
    const lineMat = new THREE.LineBasicMaterial({
      color: colorScheme.lineColor ?? "#ffffff",
    });
    this.boneLines = new THREE.LineSegments(lineGeo, lineMat);
    this.group.add(this.boneLines);

    // internal buffers
    this._dummy = new THREE.Object3D();
    this._points = Array.from({ length: 21 }, () => new THREE.Vector3());

    this.setColorScheme(colorScheme);

    // seed: simple visible pose (so it always renders even with no data)
    const seedPts = this._buildSeedPosePoints();
    this.setPointsXYZ(seedPts, { offset: this.offset });
  }

  setVisible(v) {
    this.group.visible = !!v;
  }

  setRootAtOrigin(v) {
    this.rootAtOrigin = !!v;
  }

  setColorScheme(scheme) {
    this.colorScheme = scheme;

    const jointColors = scheme.jointColors ?? Array(21).fill("#ffffff");
    const tmp = new THREE.Color();

    for (let i = 0; i < 21; i++) {
      tmp.set(jointColors[i] ?? "#ffffff");
      this.joints.setColorAt(i, tmp);
    }
    if (this.joints.instanceColor) {
      this.joints.instanceColor.needsUpdate = true;
    }
    this.joints.material.needsUpdate = true;

    const lc = scheme.lineColor ?? "#ffffff";
    this.boneLines.material.color.set(lc);
    this.boneLines.material.needsUpdate = true;
  }

  /**
   * The one "truth" function: render 21 xyz joints.
   * points21: Array(21) of [x,y,z]
   */
  setPointsXYZ(points21, { offset = [0, 0, 0] } = {}) {
    if (!points21 || points21.length < 21) return;

    const root = points21[0];
    const ox = offset?.[0] ?? 0;
    const oy = offset?.[1] ?? 0;
    const oz = offset?.[2] ?? 0;

    // store points
    for (let i = 0; i < 21; i++) {
      const p = points21[i] ?? [0, 0, 0];
      const x = p[0] ?? 0;
      const y = p[1] ?? 0;
      const z = p[2] ?? 0;

      const nx = this.rootAtOrigin ? x - (root?.[0] ?? 0) : x;
      const ny = this.rootAtOrigin ? y - (root?.[1] ?? 0) : y;
      const nz = this.rootAtOrigin ? z - (root?.[2] ?? 0) : z;

      this._points[i].set(nx + ox, ny + oy, nz + oz);
    }

    // update joint instances (position only)
    for (let i = 0; i < 21; i++) {
      this._dummy.position.copy(this._points[i]);
      this._dummy.quaternion.identity();
      this._dummy.scale.set(1, 1, 1);
      this._dummy.updateMatrix();
      this.joints.setMatrixAt(i, this._dummy.matrix);
    }
    this.joints.instanceMatrix.needsUpdate = true;

    // update bone lines
    let idx = 0;
    for (const [a, b] of this.bones) {
      const pa = this._points[a];
      const pb = this._points[b];

      this.linePositions[idx++] = pa.x;
      this.linePositions[idx++] = pa.y;
      this.linePositions[idx++] = pa.z;

      this.linePositions[idx++] = pb.x;
      this.linePositions[idx++] = pb.y;
      this.linePositions[idx++] = pb.z;
    }
    this.boneLines.geometry.attributes.position.needsUpdate = true;
    this.boneLines.geometry.computeBoundingSphere();
  }
  // Inside HandModel class (src/hand/HandModel.js)

  setFromPhiTheta(anglesNestedOneHand) {
    /**
     * Convert per-finger, per-segment spherical angles into 21 XYZ joint positions.
     *
     * Input shape:
     *   anglesNestedOneHand: [5][4][3]
     *     finger index f in [0..4] follows FINGER_NAMES
     *     segment index s in [0..3] corresponds to joints ids[s+1]
     *     triple = [thetaDeg, phiDeg, r]
     *
     * Current convention (WORLD-SPACE directions per segment):
     *   dx = r * cos(theta) * sin(phi)
     *   dy = r * sin(theta)
     *   dz = r * cos(theta) * cos(phi)
     *
     * Base offsets:
     *   Each finger starts from a small (x,z,y) offset near the wrist so fingers
     *   don’t overlap at the origin.
     *
     * TODO (important):
     *   Decide whether angles are:
     *   (A) WORLD-SPACE per segment (current behavior), OR
     *   (B) PARENT-RELATIVE (each segment direction is defined in its parent’s local frame).
     *   For (B), you must propagate orientation down the chain (compose rotations / apply a basis),
     *   not just treat each segment as an independent world-space vector.
     */

    if (
      !Array.isArray(anglesNestedOneHand) ||
      anglesNestedOneHand.length !== 5 ||
      !Array.isArray(anglesNestedOneHand[0]) ||
      anglesNestedOneHand[0].length !== 4
    ) {
      console.error(
        "[HandModel.setFromPhiTheta] bad shape, expected [5][4][3]:",
        anglesNestedOneHand,
      );
      return;
    }

    const deg2rad = (d) => (d * Math.PI) / 180;
    const raduiseScaler = 5;

    const vecFromRThetaPhi = (r, theta, phi) => {
      const ct = Math.cos(theta);
      const st = Math.sin(theta);
      const sp = Math.sin(phi);
      const cp = Math.cos(phi);
      return [r * ct * sp, r * st, r * ct * cp];
    };

    const baseX = {
      thumb: 0,
      index: 0,
      middle: 0,
      ring: 0,
      pinky: 0,
    };
    const baseZ = {
      thumb: 0,
      index: 0,
      middle: 0,
      ring: 0,
      pinky: 0,
    };
    const baseY = 0.12;

    const pts = Array.from({ length: 21 }, () => [0, 0, 0]);
    pts[0] = [0, 0, 0];

    for (let f = 0; f < 5; f++) {
      const fingerName = FINGER_NAMES[f];
      const ids = FINGER_JOINTS[fingerName];
      const fingerAngles = anglesNestedOneHand[f];

      let x = baseX[fingerName] ?? 0;
      let y = baseY;
      let z = baseZ[fingerName] ?? 0;

      for (let seg = 0; seg < 4; seg++) {
        const triple = fingerAngles?.[seg] ?? [0, 0, 1];
        const theta = deg2rad(triple[0] ?? 0);
        const phi = deg2rad(triple[1] ?? 0);
        const r = (triple[2] ?? 1) * raduiseScaler;

        const [dx, dy, dz] = vecFromRThetaPhi(r, theta, phi);

        x += dx;
        y += dy;
        z += dz;

        pts[ids[seg + 1]] = [x, y, z];
      }
    }

    this.setPointsXYZ(pts, { offset: this.offset });
  }

  /**
   * Optional TODO: if you ever need xyz -> angles again.
   */
  getPhiThetaFromCurrentPose({ degrees } = {}) {
    // TODO: implement xyz (this._points) -> angles
    // return angles;
    return null;
  }

  /**
   * Simple “always visible” seed pose:
   * wrist at origin, 5 fingers spread in X going +Y.
   */
  _buildSeedPosePoints() {
    const pts = Array.from({ length: 21 }, () => [0, 0, 0]);
    pts[0] = [0, 0, 0];

    const baseX = {
      thumb: -0.35,
      index: -0.15,
      middle: 0.0,
      ring: 0.15,
      pinky: 0.3,
    };
    const baseZ = {
      thumb: 0.08,
      index: 0.04,
      middle: 0.0,
      ring: -0.03,
      pinky: -0.06,
    };

    const segY = [0.35, 0.25, 0.2, 0.16];
    const thumbXDrift = [0.18, 0.12, 0.08, 0.05];

    for (const finger of FINGER_NAMES) {
      const ids = FINGER_JOINTS[finger]; // [0, a,b,c,d]
      const x0 = baseX[finger] ?? 0;
      const z0 = baseZ[finger] ?? 0;

      let x = x0;
      let y = 0.12;
      let z = z0;

      pts[ids[1]] = [x, y, z];

      for (let s = 0; s < 3; s++) {
        y += segY[s] ?? 0.2;

        if (finger === "thumb") {
          x += thumbXDrift[s] ?? 0.1;
          z += 0.01;
        } else {
          z += 0.01 * (s + 1);
        }

        pts[ids[s + 2]] = [x, y, z];
      }

      y += segY[3] ?? 0.16;
      if (finger === "thumb") x += thumbXDrift[3] ?? 0.05;
      else z += 0.01 * 4;

      pts[ids[4]] = [x, y, z];
    }

    return pts;
  }
}
