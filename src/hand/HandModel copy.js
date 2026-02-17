// src/hand/HandModel.js
import * as THREE from "three";
import {
  DEFAULTS,
  FINGER_JOINTS,
  FINGER_NAMES,
  HAND_BONES_21,
  REST_FINGER_DIRECTIONS, // still used only for initial rest pose in constructor
  buildDefaultBoneLength,
  buildLocalFrame,
  dirFromPhiThetaLocal,
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

function toRad(x, degrees) {
  return degrees ? (x * Math.PI) / 180 : x;
}

export class HandModel {
  _childToFingerSegment(childIdx) {
    for (const finger of FINGER_NAMES) {
      const ids = FINGER_JOINTS[finger];
      const s = ids.indexOf(childIdx);
      if (s > 0) return { finger, seg: s - 1 };
    }
    return null;
  }

  _buildRestPosePoints() {
    const pts = Array.from({ length: 21 }, () => new THREE.Vector3());
    pts[0].set(0, 0, 0); // wrist

    for (let i = 0; i < this.bones.length; i++) {
      const [a, b] = this.bones[i];
      const ab = this._childToFingerSegment(b);
      if (!ab) continue;

      const dir =
        REST_FINGER_DIRECTIONS[ab.finger] ?? new THREE.Vector3(0, 1, 0);
      const len = this.boneLengths?.[ab.finger]?.[ab.seg] ?? 1;

      pts[b].copy(pts[a]).addScaledVector(dir, len);
    }

    return pts.map((v) => [v.x, v.y, v.z]);
  }

  constructor({
    name = "hand",
    bones = HAND_BONES_21,
    pointRadius = DEFAULTS.pointRadius,
    rootAtOrigin = false,
    colorScheme = HandColorSchemes.mono({ baseColor: "#ffffff" }),
    boneLengths = buildDefaultBoneLength(), // only for initial rest pose
    offset = [0, 0, 0],
  } = {}) {
    this.name = name;
    this.bones = bones;
    this.pointRadius = pointRadius;
    this.rootAtOrigin = rootAtOrigin;
    this.boneLengths = boneLengths;
    this.offset = offset;

    this.group = new THREE.Group();
    this.group.name = name;

    const sphereGeo = new THREE.SphereGeometry(pointRadius, 12, 12);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.joints = new THREE.InstancedMesh(sphereGeo, sphereMat, 21);
    this.joints.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.joints);

    this.linePositions = new Float32Array(bones.length * 2 * 3);
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

    this._dummy = new THREE.Object3D();
    this._points = Array.from({ length: 21 }, () => new THREE.Vector3());

    this.setColorScheme(colorScheme);

    // initial rest pose (only for first render; real data will override)
    const restPts = this._buildRestPosePoints();
    this.setPointsXYZ(restPts, { offset: this.offset });
    this._applyJointOrientationsFromBoneForward(this._points);
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

  _applyJointOrientationsFromBoneForward(jointPos) {
    const UP = new THREE.Vector3(0, 1, 0);

    const parentOf = Array(21).fill(-1);
    for (const [a, b] of this.bones) parentOf[b] = a;

    for (let j = 0; j < 21; j++) {
      const parent = parentOf[j];
      this._dummy.position.copy(jointPos[j]);

      if (parent >= 0) {
        const fwd = jointPos[j].clone().sub(jointPos[parent]).normalize();
        this._dummy.quaternion.setFromUnitVectors(UP, fwd);
      } else {
        this._dummy.quaternion.identity();
      }

      this._dummy.scale.set(1, 1, 1);
      this._dummy.updateMatrix();
      this.joints.setMatrixAt(j, this._dummy.matrix);
    }

    this.joints.instanceMatrix.needsUpdate = true;
  }

  setPointsXYZ(points21, { offset = [0, 0, 0] } = {}) {
    if (!points21 || points21.length < 21) return;

    const root = points21[0];
    const ox = offset[0] ?? 0,
      oy = offset[1] ?? 0,
      oz = offset[2] ?? 0;

    for (let i = 0; i < 21; i++) {
      const p = points21[i];
      const x = p[0],
        y = p[1],
        z = p[2];

      const nx = this.rootAtOrigin ? x - root[0] : x;
      const ny = this.rootAtOrigin ? y - root[1] : y;
      const nz = this.rootAtOrigin ? z - root[2] : z;

      this._points[i].set(nx + ox, ny + oy, nz + oz);
    }

    // position-only write (rotation later)
    for (let i = 0; i < 21; i++) {
      this._dummy.position.copy(this._points[i]);
      this._dummy.quaternion.identity();
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

  /**
   * Build joint positions from per-bone [phi, theta, r].
   *
   * IMPORTANT:
   * - r comes from the data (your synthetic has r=1 everywhere)
   * - We do NOT use boneLengths here at all.
   * - We also do NOT seed the finger axis from REST_FINGER_DIRECTIONS.
   *   We seed EVERY finger with the SAME global axis so the data defines the pose.
   *
   * angles: Array(20) of [phi, theta, r]
   */
  setFromPhiTheta({ angles, degrees, offset }) {
    this.degrees = degrees ?? DEFAULTS.degrees;

    const boneAngles = Array.isArray(angles) ? angles : angles?.boneAngles;
    if (!boneAngles || boneAngles.length < this.bones.length) return;

    this.offset = offset ?? this.offset ?? [0, 0, 0];

    const jointPos = Array.from(
      { length: 21 },
      () => new THREE.Vector3(0, 0, 0),
    );

    const childToFingerSegment = (childIdx) => {
      for (const finger of FINGER_NAMES) {
        const ids = FINGER_JOINTS[finger];
        const s = ids.indexOf(childIdx);
        if (s > 0) return { finger, seg: s - 1 };
      }
      return null;
    };

    // ✅ seed axis purely from a global basis (data defines pose)
    const GLOBAL_AXIS = new THREE.Vector3(0, 1, 0); // choose your canonical forward
    const lastDirByFinger = {};
    for (const f of FINGER_NAMES) lastDirByFinger[f] = GLOBAL_AXIS.clone();

    for (let i = 0; i < this.bones.length; i++) {
      const [a, b] = this.bones[i];
      const ab = childToFingerSegment(b);

      const triple = boneAngles[i];
      const phiRaw = triple?.[0] ?? 0;
      const thetaRaw = triple?.[1] ?? 0;
      const rRaw = triple?.[2] ?? 1; // ✅ from data

      const phi = toRad(phiRaw, this.degrees);
      const theta = toRad(thetaRaw, this.degrees);

      const parentAxis = ab ? lastDirByFinger[ab.finger] : GLOBAL_AXIS;
      const dir = dirFromPhiThetaLocal(parentAxis, phi, theta);

      if (ab) lastDirByFinger[ab.finger] = dir.clone();

      const len = Number.isFinite(rRaw) ? rRaw : 1;

      jointPos[b] = jointPos[a].clone().add(dir.clone().multiplyScalar(len));
    }

    const pts = jointPos.map((v) => [v.x, v.y, v.z]);
    this.setPointsXYZ(pts, { offset: this.offset });

    // ✅ now rotate spheres based on final bone directions
    this._applyJointOrientationsFromBoneForward(this._points);
  }
}
