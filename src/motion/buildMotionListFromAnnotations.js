// src/motion/buildMotionListFromAnnotations.js
import { parseJsonlText } from "./jsonl";
import { publicUrl } from "./motionPaths";
import { MOTION_CONFIG } from "./motionRegistry";

function pickText(a) {
  return (
    a?.description ||
    a?.clarify_annotation ||
    (Array.isArray(a?.rewritten_annotation) ? a.rewritten_annotation[0] : "") ||
    ""
  );
}

export async function loadAnnotations({
  annotationsRel = MOTION_CONFIG.annotationsRel,
} = {}) {
  const url = publicUrl(annotationsRel);
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Failed to fetch annotations: ${res.status} ${url}`);
  const text = await res.text();
  return parseJsonlText(text);
}

/**
 * Returns array of motionMeta objects compatible with loadMotionJsonl().
 */
export async function buildMotionListFromAnnotations({
  limit = null,
  anglesBaseRel = MOTION_CONFIG.anglesBaseRel,
  anglesFileName = MOTION_CONFIG.anglesFileName,
  annotationsRel = MOTION_CONFIG.annotationsRel,
} = {}) {
  const ann = await loadAnnotations({ annotationsRel });
  const rows = limit ? ann.slice(0, limit) : ann;

  return rows.map((a, idx) => {
    const scene = a.scene;
    const sequence = a.sequence;

    const filename = `${anglesBaseRel}/${scene}/keypoints_3d/${sequence}/${anglesFileName}`;

    return {
      id: `${scene}_${sequence}_${idx}`,
      filename,
      scene,
      sequence,
      text: pickText(a),
      source: "angles_phi_theta",
      annotation: a,
    };
  });
}
