// src/motion/anglesAdapters.js

/**
 * Converts a JSONL frame into:
 *   leftAngles/rightAngles: Array(20) where each entry is [phi, theta, r]
 *
 * Input format (your synthetic / real):
 *   frame.angles_nested: [2 hands][5 fingers][4 joints][3 components]
 *   layout.angles_per_joint: ["phi","theta","r"]
 *
 * Output ordering MUST match HAND_BONES_21 order in HandModel:
 *   thumb 0-1-2-3-4  (4 bones)
 *   index 0-5-6-7-8  (4 bones)
 *   middle 0-9-10-11-12
 *   ring 0-13-14-15-16
 *   pinky 0-17-18-19-20
 *
 * Within angles_nested you store 4 joints per finger: ["root","mip","pip","dip"]
 * Those correspond to the 4 bones per finger in order.
 */

function isFiniteNumber(x) {
  return typeof x === "number" && Number.isFinite(x);
}

const FINGER_ORDER = ["thumb", "index", "middle", "ring", "pinky"];
const JOINT_ORDER = ["root", "mip", "pip", "dip"]; // 4 bones per finger

// helper: normalize one hand: [5][4][3] -> [20][3]
function normalizeHandAnglesNested3(handNested) {
  if (!Array.isArray(handNested) || handNested.length !== 5) return null;

  const out = [];

  for (let f = 0; f < 5; f++) {
    const finger = handNested[f];
    if (!Array.isArray(finger) || finger.length !== 4) return null;

    for (let j = 0; j < 4; j++) {
      const triple = finger[j];
      if (!Array.isArray(triple) || triple.length !== 3) return null;

      const phi = triple[0];
      const theta = triple[1];
      const r = triple[2];

      if (!isFiniteNumber(phi) || !isFiniteNumber(theta) || !isFiniteNumber(r))
        return null;

      out.push([phi, theta, r]); // keep order EXACT: [phi, theta, r]
    }
  }

  // 5 fingers * 4 bones = 20
  return out;
}

export function frameToTwoHandsBoneAngles(frame) {
  if (!frame || typeof frame !== "object") {
    return { leftAngles: null, rightAngles: null };
  }

  // ✅ new format: angles_nested = [2][5][4][3]
  if (Array.isArray(frame.angles_nested) && frame.angles_nested.length === 2) {
    const left = normalizeHandAnglesNested3(frame.angles_nested[0]);
    const right = normalizeHandAnglesNested3(frame.angles_nested[1]);

    if (!left || !right) {
      console.error("[frameToTwoHandsBoneAngles] angles_nested shape invalid");
      console.log("angles_nested sample:", frame.angles_nested);
      return { leftAngles: null, rightAngles: null };
    }

    // your synthetic values are degrees
    return { leftAngles: left, rightAngles: right };
  }

  // fallback old formats if needed
  if (frame.leftAngles && frame.rightAngles) {
    return {
      leftAngles: frame.leftAngles,
      rightAngles: frame.rightAngles,
      degrees: frame.degrees ?? true,
    };
  }

  console.error(
    "[frameToTwoHandsBoneAngles] Unrecognized frame format. Keys:",
    Object.keys(frame),
  );
  console.log("[frameToTwoHandsBoneAngles] Frame sample:", frame);
  return { leftAngles: null, rightAngles: null };
}
