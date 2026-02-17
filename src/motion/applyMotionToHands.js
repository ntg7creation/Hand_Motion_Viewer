// src/motion/applyMotionToHands.js
import { frameToTwoHandsBoneAngles } from "./anglesAdapters";

/**
 * Applies a JSONL frame to a TwoHandsModel.
 * Supports both old format ([theta_open_deg, phi_deg]) and new synthetic format ([phi, theta, r]).
 *
 * anglesAdapters.frameToTwoHandsBoneAngles returns:
 *   leftAngles/rightAngles: [20][2] (phi,theta)
 *   leftLengths/rightLengths: { thumb:[4], index:[4], ... } OR null
 */
export function applyFrameToTwoHands(twoHandsModel, frame, opts = {}) {
  if (!twoHandsModel || !frame) return false;
  twoHandsModel.setFromFrame(frame);
  return true;
}

/**
 * Legacy helper you had: start from REST + overwrite only the middle finger bones.
 * This will still work, BUT it will ignore your per-joint r lengths unless you extend it.
 *
 * For the synthetic test motion, use applyFrameToTwoHands(...) instead.
 */
export function applyFrameMiddleFingerOnly(twoHandsModel, frame, opts = {}) {
  if (!twoHandsModel || !frame) return false;

  const { leftOffset, rightOffset, degreesOverride } = opts;

  const { leftAngles, rightAngles, leftLengths, rightLengths, degrees } =
    frameToTwoHandsBoneAngles(frame);

  if (!leftAngles || !rightAngles) return false;

  // Bones for middle finger chain in HAND_BONES_21 order:
  // middle finger is bones: [0->9], [9->10], [10->11], [11->12]
  // which are indices 8,9,10,11 in HAND_BONES_21.
  const middleBoneIdx = [8, 9, 10, 11];

  const makeRestAngles = () => Array.from({ length: 20 }, () => [0, 0]);
  const L = makeRestAngles();
  const R = makeRestAngles();

  for (const i of middleBoneIdx) {
    if (leftAngles[i]) L[i] = leftAngles[i];
    if (rightAngles[i]) R[i] = rightAngles[i];
  }

  // For lengths: if present, keep defaults everywhere but copy middle finger segments
  // so you can still test r if you want.
  const copyLengths = (src) => {
    if (!src) return null;
    return {
      thumb: [...src.thumb],
      index: [...src.index],
      middle: [...src.middle],
      ring: [...src.ring],
      pinky: [...src.pinky],
    };
  };

  const Llen = copyLengths(leftLengths);
  const Rlen = copyLengths(rightLengths);

  twoHandsModel.setFromPhiTheta({
    leftAngles: L,
    rightAngles: R,
    leftLengths: Llen,
    rightLengths: Rlen,
    ...(leftOffset ? { leftOffset } : {}),
    ...(rightOffset ? { rightOffset } : {}),
  });

  return true;
}
