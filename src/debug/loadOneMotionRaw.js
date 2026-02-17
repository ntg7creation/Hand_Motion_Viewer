export async function loadOneMotionRaw() {
  const url =
    "/converted_angles_phi_theta/json/p002-firstaid/keypoints_3d/003/angles_both.jsonl";

  console.time("[RAW] fetch");
  const res = await fetch(url);
  console.timeEnd("[RAW] fetch");

  if (!res.ok) {
    throw new Error(`fetch failed: ${res.status}`);
  }

  console.time("[RAW] text()");
  const text = await res.text();
  console.timeEnd("[RAW] text()");

  console.log("[RAW] text length:", text.length);

  console.time("[RAW] parse jsonl");
  const lines = text.split("\n").filter(Boolean);
  const frames = lines.map(JSON.parse);
  console.timeEnd("[RAW] parse jsonl");

  console.log("[RAW] frames:", frames.length);
  console.log("[RAW] first frame keys:", Object.keys(frames[0] || {}));

  return frames;
}
