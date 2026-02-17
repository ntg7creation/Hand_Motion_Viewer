// src/hand/createFingerGui.js
import { GUI } from "lil-gui";
import {
  FINGER_JOINTS,
  FINGER_NAMES,
  HAND_BONES_21,
  REST_FINGER_DIRECTIONS,
} from "./handConstants";

/**
 * Create a GUI to control finger phi/theta for left/right HandModel instances.
 *
 * @param {Object} params
 * @param {import("./HandModel").HandModel} params.leftHand
 * @param {import("./HandModel").HandModel} params.rightHand
 * @param {boolean} [params.degrees=true]
 * @param {number} [params.phiMin=-180]
 * @param {number} [params.phiMax=180]
 * @param {number} [params.thetaMin=-180]
 * @param {number} [params.thetaMax=180]
 */
export function createFingerGui({
  leftHand,
  rightHand,
  degrees = true,
  phiMin = -180,
  phiMax = 180,
  thetaMin = -180,
  thetaMax = 180,
} = {}) {
  if (!leftHand || !rightHand) {
    throw new Error("createFingerGui: leftHand and rightHand are required.");
  }

  // --- Build mapping: (finger, seg) -> boneIndex in HAND_BONES_21 ---
  // seg: 0..3, child joint is FINGER_JOINTS[finger][seg+1]
  const boneIndexByFingerSeg = {};
  for (const finger of FINGER_NAMES) {
    boneIndexByFingerSeg[finger] = {};
    for (let seg = 0; seg < 4; seg++) {
      const childJointIdx = FINGER_JOINTS[finger][seg + 1];
      const boneIndex = HAND_BONES_21.findIndex(
        ([, child]) => child === childJointIdx,
      );
      if (boneIndex === -1) {
        // If your bones list ever changes, this will protect you.
        console.warn(
          `No bone found for finger=${finger} seg=${seg} childJoint=${childJointIdx}`,
        );
      }
      boneIndexByFingerSeg[finger][seg] = boneIndex;
    }
  }

  // // --- State: one boneAngles array per hand (length == number of bones) ---
  // const makeAngles = () => HAND_BONES_21.map(() => [0, 0]); // [phi, theta] per bone
  // const anglesLeft = makeAngles();
  // const anglesRight = makeAngles();

  // --- helpers: finger/segment lookup (we'll reuse this for defaults too) ---
  const childToFingerSegment = (childIdx) => {
    for (const finger of FINGER_NAMES) {
      const ids = FINGER_JOINTS[finger];
      const s = ids.indexOf(childIdx);
      if (s > 0) return { finger, seg: s - 1 };
    }
    return null;
  };

  // Convert a direction vector (x,y,z) to phi/theta using YOUR convention:
  // dirFromPhiTheta(phi, theta):
  //   x = sin(phi)*cos(theta), y = cos(phi), z = sin(phi)*sin(theta)
  function dirToPhiTheta(v, degrees = true) {
    const x = v.x ?? 0;
    const y = v.y ?? 1;
    const z = v.z ?? 0;

    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    const nx = x / len,
      ny = y / len,
      nz = z / len;

    const clampedY = Math.max(-1, Math.min(1, ny));
    const phi = Math.acos(clampedY); // 0..pi
    let theta = Math.atan2(nz, nx); // -pi..pi
    if (theta < 0) theta += Math.PI * 2; // 0..2pi

    if (!degrees) return [phi, theta];
    return [(phi * 180) / Math.PI, (theta * 180) / Math.PI];
  }

  function makeDefaultAngles({ mirrorX = false } = {}) {
    // one [phi,theta] per bone (same length/order as HAND_BONES_21)
    return HAND_BONES_21.map(([, child]) => {
      const ab = childToFingerSegment(child);
      const finger = ab?.finger;

      // fall back to "up" if something is missing
      const base = finger ? REST_FINGER_DIRECTIONS[finger] : null;
      const dir = base
        ? { x: base.x, y: base.y, z: base.z }
        : { x: 0, y: 1, z: 0 };

      if (mirrorX) dir.x *= -1;

      return dirToPhiTheta(dir, degrees);
    });
  }

  // --- State: one boneAngles array per hand (length == number of bones) ---
  const cloneAngles = (arr) => arr.map((x) => [x[0], x[1]]);

  const defaultLeft = makeDefaultAngles({ mirrorX: true });
  const defaultRight = makeDefaultAngles({ mirrorX: false });

  const anglesLeft = cloneAngles(defaultLeft);
  const anglesRight = cloneAngles(defaultRight);

  // --- GUI model ---
  const state = {
    hand: "left", // 'left' | 'right'
    finger: "index", // thumb/index/middle/ring/pinky
    segment: 0, // 0..3
    phi: 0,
    theta: 0,
    applyToWholeFinger: false, // optional convenience
    resetSelected: () => {
      const arr = getActiveAnglesArray();
      const boneIndex = boneIndexByFingerSeg[state.finger]?.[state.segment];
      if (boneIndex == null || boneIndex < 0) return;

      const def = state.hand === "left" ? defaultLeft : defaultRight;
      arr[boneIndex] = [def[boneIndex][0], def[boneIndex][1]];

      loadSelectedFromAngles();
      apply();
      syncGuiDisplays();
    },

    resetHand: () => {
      const arr = state.hand === "left" ? anglesLeft : anglesRight;
      const def = state.hand === "left" ? defaultLeft : defaultRight;

      for (let i = 0; i < arr.length; i++) {
        arr[i] = [def[i][0], def[i][1]];
      }

      const hm = state.hand === "left" ? leftHand : rightHand;
      hm.setFromPhiTheta({
        angles: arr,
        degrees,
        offset: hm.offset,
      });

      loadSelectedFromAngles();
      syncGuiDisplays();
    },
  };

  const gui = new GUI({ title: "Finger Controls (phi/theta)" });

  const handCtrl = gui
    .add(state, "hand", ["left", "right"])
    .name("Hand")
    .onChange(() => {
      loadSelectedFromAngles();
      syncGuiDisplays();
    });

  const fingerCtrl = gui
    .add(state, "finger", FINGER_NAMES)
    .name("Finger")
    .onChange(() => {
      loadSelectedFromAngles();
      syncGuiDisplays();
    });

  const segmentCtrl = gui
    .add(state, "segment", 0, 3, 1)
    .name("Segment")
    .onChange(() => {
      loadSelectedFromAngles();
      syncGuiDisplays();
    });

  const applyWholeCtrl = gui
    .add(state, "applyToWholeFinger")
    .name("Apply to whole finger");

  const phiCtrl = gui
    .add(state, "phi", phiMin, phiMax, 1)
    .name("phi (deg)")
    .onChange(apply);
  const thetaCtrl = gui
    .add(state, "theta", thetaMin, thetaMax, 1)
    .name("theta (deg)")
    .onChange(apply);

  gui.add(state, "resetSelected").name("Reset selected");
  gui.add(state, "resetHand").name("Reset hand");

  function getActiveAnglesArray() {
    return state.hand === "left" ? anglesLeft : anglesRight;
  }

  function getActiveHandModel() {
    return state.hand === "left" ? leftHand : rightHand;
  }

  function loadSelectedFromAngles() {
    const arr = getActiveAnglesArray();
    const boneIndex = boneIndexByFingerSeg[state.finger]?.[state.segment];
    if (boneIndex == null || boneIndex < 0) return;
    const [phi, theta] = arr[boneIndex] ?? [0, 0];
    state.phi = phi;
    state.theta = theta;
  }

  function syncGuiDisplays() {
    // lil-gui: update displayed numbers after programmatic changes
    handCtrl.updateDisplay();
    fingerCtrl.updateDisplay();
    segmentCtrl.updateDisplay();
    applyWholeCtrl.updateDisplay();
    phiCtrl.updateDisplay();
    thetaCtrl.updateDisplay();
  }

  function apply() {
    const arr = getActiveAnglesArray();
    const hm = getActiveHandModel();

    if (state.applyToWholeFinger) {
      for (let seg = 0; seg < 4; seg++) {
        const boneIndex = boneIndexByFingerSeg[state.finger]?.[seg];
        if (boneIndex != null && boneIndex >= 0) {
          arr[boneIndex] = [state.phi, state.theta];
        }
      }
    } else {
      const boneIndex = boneIndexByFingerSeg[state.finger]?.[state.segment];
      if (boneIndex != null && boneIndex >= 0) {
        arr[boneIndex] = [state.phi, state.theta];
      }
    }

    hm.setFromPhiTheta({
      angles: arr,
      degrees,
      offset: hm.offset,
    });
  }

  // initialize display based on current defaults
  loadSelectedFromAngles();
  syncGuiDisplays();

  return {
    gui,
    state,
    anglesLeft,
    anglesRight,
    dispose: () => gui.destroy(),
  };
}
