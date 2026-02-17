import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// Your existing original mapping list (same one used by the old viewer)
// Expected item shape (at least): { filename, scene, sequence, ... }
import FILE_LIST from "./file_list_old";

/**
 * =========================
 * CONFIG (EDIT THESE PATHS)
 * =========================
 *
 * You need these folders to be reachable by the Vite dev server.
 * Easiest: copy them under `public/` and use absolute URLs below.
 *
 * Example structure:
 * public/
 *   hand_poses/<scene>/keypoints_3d/<sequence>/left.jsonl
 *   hand_poses/<scene>/keypoints_3d/<sequence>/right.jsonl
 *   infer/run_train_seen_20251230_125615/filelist.js
 *   infer/run_train_seen_20251230_125615/samples/<motion_id>/*.jsonl
 *   infer/run_unseen_text_20251230_145655/filelist.js
 *   infer/run_unseen_text_20251230_145655/samples/<motion_id>/*.jsonl
 */

const ORIG_FOLDER = "/hand_poses";

const TRAIN_SEEN_RUN = "/infer/run_train_seen_20251230_125615";
const UNSEEN_TEXT_RUN = "/infer/run_unseen_text_20251230_145909";

// If your filelist.js exports something else, we still try to normalize.
const TRAIN_SEEN_FILELIST = `${TRAIN_SEEN_RUN}/file_list.js`;
const UNSEEN_TEXT_FILELIST = `${UNSEEN_TEXT_RUN}/file_list.js`;

// Rendering
const DEFAULT_FPS = 30;
const POINT_RADIUS = 0.012;

// Your hand skeleton (21 joints per hand)
const HAND_BONES_21 = [
    // thumb
    [0, 1], [1, 2], [2, 3], [3, 4],
    // index
    [0, 5], [5, 6], [6, 7], [7, 8],
    // middle
    [0, 9], [9, 10], [10, 11], [11, 12],
    // ring
    [0, 13], [13, 14], [14, 15], [15, 16],
    // pinky
    [0, 17], [17, 18], [18, 19], [19, 20],
];

// Colors (simple, stable)
const LEFT_COLOR = "#ff6b6b";
const RIGHT_COLOR = "#4dabf7";

const COLOR_ORIG = "#ff3b30";   // red
const COLOR_SEEN = "#34c759";   // green
const COLOR_UNSEEN = "#0a84ff"; // blue

// -----------------------------
// Helpers: parsing + indexing
// -----------------------------

function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
}

// Many of your IDs look like: 0002_p025-firstaid_017
function normalizeMotionId(s) {
    if (!s) return "";
    return String(s)
        .replace(/^.*samples\//, "")
        .replace(/^.*samples\\/, "")
        .replace(/\.jsonl$/i, "")
        .replace(/\\/g, "/")
        .split("/")[0]; // keep folder name if path-like
}

// Try to extract <motion_id> from: samples/<motion_id>/whatever.jsonl
function motionIdFromSamplePath(p) {
    const s = String(p).replace(/\\/g, "/");
    const idx = s.indexOf("samples/");
    if (idx === -1) return "";
    const rest = s.slice(idx + "samples/".length);
    return rest.split("/")[0];
}

function looksLikeNumberArray(x) {
    return Array.isArray(x) && x.length > 0 && typeof x[0] === "number";
}

function looksLikePointArray(x) {
    // [[x,y,z], ...]
    return Array.isArray(x) && x.length > 0 && Array.isArray(x[0]) && x[0].length >= 3;
}

function toPoints3(arr) {
    // arr: flat [x1,y1,z1,x2,y2,z2,...]
    const pts = [];
    for (let i = 0; i + 2 < arr.length; i += 3) {
        pts.push([arr[i], arr[i + 1], arr[i + 2]]);
    }
    return pts;
}

/**
 * Parse JSONL (or single JSON) into frames, where each frame becomes an array of points [[x,y,z], ...]
 * Then slice to first 42 points (positions) in case it contains 84 (pos+vel).
 */
function parseMotionTextToFrames(rawText) {
    const text = (rawText ?? "").trim();
    if (!text) return [];

    // If it's a single JSON array file (not really jsonl)
    if (text.startsWith("[") && !text.includes("\n")) {
        const single = JSON.parse(text);
        return normalizeFrames(single);
    }

    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const parsed = lines.map(l => JSON.parse(l));
    return normalizeFrames(parsed);
}

function normalizeFrames(parsed) {
    // parsed can be:
    // - [frame0, frame1, ...] (jsonl lines parsed)
    // - or a single array of frames already
    let frames = parsed;

    // If someone stored {frames:[...]}:
    if (!Array.isArray(frames) && frames && typeof frames === "object") {
        frames =
            frames.frames ||
            frames.motion ||
            frames.data ||
            frames.xyz ||
            frames.points ||
            [];
    }

    if (!Array.isArray(frames)) return [];

    // If file has one line and that line is itself an array-of-frames:
    if (frames.length === 1 && Array.isArray(frames[0]) && Array.isArray(frames[0][0])) {
        frames = frames[0];
    }

    const out = [];

    for (const f of frames) {
        let pts = null;

        if (looksLikePointArray(f)) {
            // f is already [[x,y,z], ...]
            pts = f;
        } else if (looksLikeNumberArray(f)) {
            // f is [x1,y1,z1,...]
            pts = toPoints3(f);
        } else if (f && typeof f === "object") {
            const cand =
                f.points ||
                f.xyz ||
                f.joints ||
                f.pose ||
                f.frame ||
                f.data;

            if (looksLikePointArray(cand)) pts = cand;
            else if (looksLikeNumberArray(cand)) pts = toPoints3(cand);
        }

        if (!pts) continue;

        // 🚨 Your new format: 84 points per frame, but only first 42 are positions.
        // Keep it general: always slice first 42 if there are >= 42.
        const pts42 = pts.slice(0, 42).map(p => [p[0], p[1], p[2]]);

        // optional small lift for visibility
        out.push(pts42.map(([x, y, z]) => [x, y + 0.5, z]));
    }

    return out;
}

async function fetchText(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch: ${url}`);
    return await res.text();
}

/**
 * Load run filelist.js and return an array of paths/entries.
 * We try:
 *  1) dynamic import (works if the file is served as ESM)
 *  2) fallback: fetch the JS text and extract the first [...] array via regex
 */
async function loadFileListAny(filelistUrl) {
    // 1) dynamic import (best)
    try {
        const mod = await import(/* @vite-ignore */ `${filelistUrl}?t=${Date.now()}`);
        const data = mod.default ?? mod.FILE_LIST ?? mod.file_list ?? mod;
        if (Array.isArray(data)) return data;
        // eslint-disable-next-line no-unused-vars
    } catch (e) {
        // continue to fallback
    }

    // 2) fallback: fetch+regex extract array
    const js = await fetchText(`${filelistUrl}?t=${Date.now()}`);

    // Try to find an array literal
    const match = js.match(/\[\s*(.|\n|\r)*?\]\s*/m);
    if (!match) throw new Error(`Could not parse filelist array from: ${filelistUrl}`);

    // eslint-disable-next-line no-new-func
    const arr = new Function(`return (${match[0]});`)();
    if (!Array.isArray(arr)) throw new Error(`Parsed filelist is not an array: ${filelistUrl}`);
    return arr;
}

/**
 * Build an index:
 *  motionId -> [relativeSamplePath1, relativeSamplePath2, relativeSamplePath3, ...]
 *
 * We expect sample paths contain "samples/<motionId>/..."
 */
function buildRunIndex(filelistArray) {
    const map = new Map();

    for (const item of filelistArray) {
        let p = item;

        if (typeof item === "object" && item) {
            // common fields
            p = item.path || item.file || item.filename || item.url || item.name;
        }

        if (typeof p !== "string") continue;

        const motionId = motionIdFromSamplePath(p);
        if (!motionId) continue;

        const list = map.get(motionId) || [];
        list.push(p);
        map.set(motionId, list);
    }

    // Sort for stable "variant 0/1/2"
    for (const [k, v] of map.entries()) {
        v.sort((a, b) => a.localeCompare(b));
        map.set(k, v);
    }

    return map;
}

function splitHandsFrom42(points42) {
    const left = points42.slice(0, 21);
    const right = points42.slice(21, 42);
    return { left, right };
}

// -----------------------------
// R3F components
// -----------------------------

function InstancedPoints({ points, color = "white", radius = POINT_RADIUS }) {
    const ref = useRef();

    useEffect(() => {
        if (!ref.current) return;
        const mesh = ref.current;
        const dummy = new THREE.Object3D();

        for (let i = 0; i < points.length; i++) {
            const [x, y, z] = points[i];
            dummy.position.set(x, y, z);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
    }, [points]);

    return (
        <instancedMesh ref={ref} args={[null, null, points.length]}>
            <sphereGeometry args={[radius, 12, 12]} />
            <meshStandardMaterial color={color} />
        </instancedMesh>
    );
}

function BoneLines({ points, bones, color = "white" }) {
    const geoRef = useRef();
    const matRef = useRef();

    // Create typed array once
    const positions = useMemo(() => {
        return new Float32Array(bones.length * 2 * 3); // 2 vertices * xyz
    }, [bones.length]);

    useEffect(() => {
        if (!geoRef.current) return;
        geoRef.current.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geoRef.current.computeBoundingSphere();
    }, [positions]);

    useEffect(() => {
        // update positions when points change
        let idx = 0;
        for (const [a, b] of bones) {
            const pa = points[a];
            const pb = points[b];
            if (!pa || !pb) continue;

            positions[idx++] = pa[0];
            positions[idx++] = pa[1];
            positions[idx++] = pa[2];

            positions[idx++] = pb[0];
            positions[idx++] = pb[1];
            positions[idx++] = pb[2];
        }

        if (geoRef.current?.attributes?.position) {
            geoRef.current.attributes.position.needsUpdate = true;
        }
    }, [points, bones, positions]);

    return (
        <lineSegments>
            <bufferGeometry ref={geoRef} />
            <lineBasicMaterial ref={matRef} color={color} linewidth={1} />
        </lineSegments>
    );
}

function MotionLayer({
    framePoints42,
    visible,
    baseColor = "white",
    leftColor = LEFT_COLOR,
    rightColor = RIGHT_COLOR,
    opacity = 1.0,
}) {
    if (!visible || !framePoints42 || framePoints42.length < 42) return null;

    const { left, right } = splitHandsFrom42(framePoints42);

    // For bones: left indices 0..20, right indices 21..41
    const rightBones = HAND_BONES_21.map(([a, b]) => [a + 21, b + 21]);

    return (
        <group>
            {/* bones */}
            <BoneLines points={framePoints42} bones={HAND_BONES_21} color={baseColor} />
            <BoneLines points={framePoints42} bones={rightBones} color={baseColor} />

            {/* points */}
            <group>
                <InstancedPoints points={left} color={leftColor} />
                <group position={[0, 0, 0]}>
                    <InstancedPoints points={right} color={rightColor} />
                </group>
            </group>

            {/* faint overlay tint if you want */}
            {opacity < 1.0 ? (
                <mesh>
                    <meshBasicMaterial transparent opacity={opacity} />
                </mesh>
            ) : null}
        </group>
    );
}

/**
 * Shared animator:
 * - single time cursor (so all layers are synced)
 * - exposes current frame index
 */
function useAnimator(frameCount, fps, paused) {
    const [idx, setIdx] = useState(0);
    const acc = useRef(0);

    useFrame((_, delta) => {
        if (paused) return;
        if (!frameCount || frameCount <= 0) return;

        acc.current += delta;
        const dt = 1 / fps;
        if (acc.current >= dt) {
            const steps = Math.floor(acc.current / dt);
            acc.current -= steps * dt;
            setIdx((prev) => (prev + steps) % frameCount);
        }
    });

    useEffect(() => {
        // reset when length changes
        setIdx(0);
        acc.current = 0;
    }, [frameCount]);

    return [idx, setIdx];
}

// -----------------------------
// Main App
// -----------------------------

export default function App_render_infer_3sets() {
    const [selectedMotionId, setSelectedMotionId] = useState("");

    const [showOrig, setShowOrig] = useState(true);
    const [showSeen, setShowSeen] = useState(true);
    const [showUnseen, setShowUnseen] = useState(true);

    const [seenVariant, setSeenVariant] = useState(0);     // 0..2
    const [unseenVariant, setUnseenVariant] = useState(0); // 0..2

    const [fps, setFps] = useState(DEFAULT_FPS);
    const [paused, setPaused] = useState(false);

    // Run indexes
    const [seenIndex, setSeenIndex] = useState(new Map());
    const [unseenIndex, setUnseenIndex] = useState(new Map());

    // Loaded frames (each frame is 42 points [[x,y,z],...])
    const [origFrames42, setOrigFrames42] = useState([]);
    const [seenFrames42, setSeenFrames42] = useState([]);
    const [unseenFrames42, setUnseenFrames42] = useState([]);

    const selectedOrigObj = useMemo(() => {
        if (!selectedMotionId) return null;

        // Try direct match on filename, then normalized
        const direct = FILE_LIST.find((f) => f.filename === selectedMotionId);
        if (direct) return direct;

        const norm = normalizeMotionId(selectedMotionId);
        return FILE_LIST.find((f) => normalizeMotionId(f.filename) === norm) || null;
    }, [selectedMotionId]);

    // Dropdown options based on your original FILE_LIST
    const motionOptions = useMemo(() => {
        return FILE_LIST.map((f) => {
            const id = normalizeMotionId(f.filename) || f.filename;
            return { id, raw: f.filename, scene: f.scene, sequence: f.sequence };
        });
    }, []);

    // Load the run filelists once
    useEffect(() => {
        (async () => {
            try {
                const arr = await loadFileListAny(TRAIN_SEEN_FILELIST);
                setSeenIndex(buildRunIndex(arr));
                console.log("✅ Loaded train-seen filelist:", arr.length);
            } catch (e) {
                console.warn("⚠️ Failed to load train-seen filelist:", e);
            }

            try {
                const arr = await loadFileListAny(UNSEEN_TEXT_FILELIST);
                setUnseenIndex(buildRunIndex(arr));
                console.log("✅ Loaded unseen-text filelist:", arr.length);
            } catch (e) {
                console.warn("⚠️ Failed to load unseen-text filelist:", e);
            }
        })();
    }, []);

    // Auto-select first motion on load
    useEffect(() => {
        if (!selectedMotionId && motionOptions.length > 0) {
            setSelectedMotionId(motionOptions[0].id);
        }
    }, [motionOptions, selectedMotionId]);

    // Load ORIGINAL (left + right) if enabled
    useEffect(() => {
        (async () => {
            if (!showOrig) {
                setOrigFrames42([]);
                return;
            }
            if (!selectedOrigObj) {
                setOrigFrames42([]);
                return;
            }

            const { scene, sequence } = selectedOrigObj;
            const leftPath = `${ORIG_FOLDER}/${scene}/keypoints_3d/${sequence}/left.jsonl`;
            const rightPath = `${ORIG_FOLDER}/${scene}/keypoints_3d/${sequence}/right.jsonl`;

            try {
                const [leftTxt, rightTxt] = await Promise.all([fetchText(leftPath), fetchText(rightPath)]);
                const leftFrames = parseMotionTextToFrames(leftTxt).map(splitHandsFrom42).map(x => x.left);
                const rightFrames = parseMotionTextToFrames(rightTxt).map(splitHandsFrom42).map(x => x.right);

                const n = Math.min(leftFrames.length, rightFrames.length);
                const merged = [];
                for (let i = 0; i < n; i++) {
                    merged.push([...leftFrames[i], ...rightFrames[i]]); // 42 points
                }
                setOrigFrames42(merged);
                console.log("✅ Loaded ORIGINAL frames:", n);
            } catch (e) {
                console.warn("⚠️ Could not load ORIGINAL:", e);
                setOrigFrames42([]);
            }
        })();
    }, [showOrig, selectedOrigObj]);

    // Load TRAIN-SEEN inference motion (variant 0..2)
    useEffect(() => {
        (async () => {
            if (!showSeen) {
                setSeenFrames42([]);
                return;
            }
            if (!selectedMotionId) {
                setSeenFrames42([]);
                return;
            }

            const id = normalizeMotionId(selectedMotionId);
            const files = seenIndex.get(id);
            if (!files || files.length === 0) {
                setSeenFrames42([]);
                return;
            }

            const v = clamp(seenVariant, 0, files.length - 1);
            const rel = files[v]; // usually "samples/<id>/....jsonl"
            const url = `${TRAIN_SEEN_RUN}/${rel}`.replace(/\\/g, "/");

            try {
                const txt = await fetchText(url);
                const frames = parseMotionTextToFrames(txt);
                setSeenFrames42(frames);
                console.log("✅ Loaded TRAIN-SEEN:", id, "variant", v, "frames", frames.length);
            } catch (e) {
                console.warn("⚠️ Could not load TRAIN-SEEN:", e);
                setSeenFrames42([]);
            }
        })();
    }, [showSeen, selectedMotionId, seenVariant, seenIndex]);

    // Load UNSEEN-TEXT inference motion (variant 0..2)
    useEffect(() => {
        (async () => {
            if (!showUnseen) {
                setUnseenFrames42([]);
                return;
            }
            if (!selectedMotionId) {
                setUnseenFrames42([]);
                return;
            }

            const id = normalizeMotionId(selectedMotionId);
            const files = unseenIndex.get(id);
            if (!files || files.length === 0) {
                setUnseenFrames42([]);
                return;
            }

            const v = clamp(unseenVariant, 0, files.length - 1);
            const rel = files[v];
            const url = `${UNSEEN_TEXT_RUN}/${rel}`.replace(/\\/g, "/");

            try {
                const txt = await fetchText(url);
                const frames = parseMotionTextToFrames(txt);
                setUnseenFrames42(frames);
                console.log("✅ Loaded UNSEEN:", id, "variant", v, "frames", frames.length);
            } catch (e) {
                console.warn("⚠️ Could not load UNSEEN:", e);
                setUnseenFrames42([]);
            }
        })();
    }, [showUnseen, selectedMotionId, unseenVariant, unseenIndex]);

    // Choose a shared frameCount (sync layers). Use max available to keep timeline consistent.
    const frameCount = useMemo(() => {
        return Math.max(origFrames42.length, seenFrames42.length, unseenFrames42.length, 0);
    }, [origFrames42.length, seenFrames42.length, unseenFrames42.length]);

    function frameAt(frames, i) {
        if (!frames || frames.length === 0) return null;
        return frames[i % frames.length];
    }

    // Animator lives inside Canvas, so we use a small wrapper component
    function Scene() {
        const [i] = useAnimator(frameCount, fps, paused);

        const orig = frameAt(origFrames42, i);
        const seen = frameAt(seenFrames42, i);
        const unseen = frameAt(unseenFrames42, i);

        return (
            <>
                <ambientLight intensity={0.9} />
                <directionalLight position={[3, 5, 2]} intensity={1.2} />
                <gridHelper args={[8, 16]} />
                <axesHelper args={[1.5]} />
                <OrbitControls />

                {/* Original (red-ish) */}
                <MotionLayer
                    framePoints42={orig}
                    visible={showOrig}
                    baseColor={COLOR_ORIG}
                    leftColor={COLOR_ORIG}
                    rightColor={COLOR_ORIG}
                />

                {/* Train-seen (green) */}
                <MotionLayer
                    framePoints42={seen}
                    visible={showSeen}
                    baseColor={COLOR_SEEN}
                    leftColor={COLOR_SEEN}
                    rightColor={COLOR_SEEN}
                />

                {/* Unseen (blue) */}
                <MotionLayer
                    framePoints42={unseen}
                    visible={showUnseen}
                    baseColor={COLOR_UNSEEN}
                    leftColor={COLOR_UNSEEN}
                    rightColor={COLOR_UNSEEN}
                />
            </>
        );
    }

    const hasSeen = useMemo(() => {
        const id = normalizeMotionId(selectedMotionId);
        return (seenIndex.get(id) || []).length;
    }, [seenIndex, selectedMotionId]);

    const hasUnseen = useMemo(() => {
        const id = normalizeMotionId(selectedMotionId);
        return (unseenIndex.get(id) || []).length;
    }, [unseenIndex, selectedMotionId]);

    return (
        <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
            {/* LEFT: Canvas */}
            <div style={{ flex: 1 }}>
                <Canvas camera={{ position: [0, 1.2, 3.2], fov: 50 }}>
                    <Scene />
                </Canvas>
            </div>

            {/* RIGHT: Controls */}
            <div
                style={{
                    width: 380,
                    padding: 14,
                    borderLeft: "1px solid #333",
                    background: "#111",
                    color: "#eee",
                    fontFamily: "system-ui, Arial",
                }}
            >
                <h3 style={{ margin: "6px 0 10px" }}>GigaHands Motion Viewer (3 sets)</h3>

                <div style={{ marginBottom: 10 }}>
                    <label style={{ display: "block", marginBottom: 6 }}>Motion ID</label>
                    <select
                        value={normalizeMotionId(selectedMotionId)}
                        onChange={(e) => setSelectedMotionId(e.target.value)}
                        style={{ width: "100%", padding: 8, borderRadius: 6 }}
                    >
                        {motionOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                                {opt.id}
                            </option>
                        ))}
                    </select>

                    {selectedOrigObj ? (
                        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                            <div>scene: <b>{selectedOrigObj.scene}</b></div>
                            <div>sequence: <b>{selectedOrigObj.sequence}</b></div>
                        </div>
                    ) : null}
                </div>

                <hr style={{ borderColor: "#333" }} />

                <div style={{ display: "grid", gap: 10 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="checkbox" checked={showOrig} onChange={(e) => setShowOrig(e.target.checked)} />
                        <span>Show Original (red)</span>
                    </label>

                    <div style={{ display: "grid", gap: 6 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input type="checkbox" checked={showSeen} onChange={(e) => setShowSeen(e.target.checked)} />
                            <span>Show Train-Seen (green)</span>
                            <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.8 }}>
                                {hasSeen ? `${hasSeen} files` : "missing"}
                            </span>
                        </label>

                        <label style={{ fontSize: 12, opacity: showSeen ? 1 : 0.5 }}>
                            Variant:
                            <select
                                disabled={!showSeen}
                                value={seenVariant}
                                onChange={(e) => setSeenVariant(parseInt(e.target.value, 10))}
                                style={{ marginLeft: 8, padding: 4, borderRadius: 6 }}
                            >
                                {[0, 1, 2].map((v) => (
                                    <option key={v} value={v}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div style={{ display: "grid", gap: 6 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input type="checkbox" checked={showUnseen} onChange={(e) => setShowUnseen(e.target.checked)} />
                            <span>Show Unseen-Text (blue)</span>
                            <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.8 }}>
                                {hasUnseen ? `${hasUnseen} files` : "missing"}
                            </span>
                        </label>

                        <label style={{ fontSize: 12, opacity: showUnseen ? 1 : 0.5 }}>
                            Variant:
                            <select
                                disabled={!showUnseen}
                                value={unseenVariant}
                                onChange={(e) => setUnseenVariant(parseInt(e.target.value, 10))}
                                style={{ marginLeft: 8, padding: 4, borderRadius: 6 }}
                            >
                                {[0, 1, 2].map((v) => (
                                    <option key={v} value={v}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <hr style={{ borderColor: "#333" }} />

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                            onClick={() => setPaused((p) => !p)}
                            style={{
                                padding: "8px 10px",
                                borderRadius: 8,
                                border: "1px solid #444",
                                background: "#222",
                                color: "#eee",
                                cursor: "pointer",
                            }}
                        >
                            {paused ? "Play" : "Pause"}
                        </button>

                        <div style={{ fontSize: 12, opacity: 0.85 }}>
                            frames: <b>{frameCount}</b>
                        </div>
                    </div>

                    <label style={{ fontSize: 12 }}>
                        FPS: <b>{fps}</b>
                        <input
                            type="range"
                            min={5}
                            max={60}
                            value={fps}
                            onChange={(e) => setFps(parseInt(e.target.value, 10))}
                            style={{ width: "100%" }}
                        />
                    </label>

                    <div style={{ fontSize: 12, opacity: 0.85, lineHeight: 1.35 }}>
                        <div><b>Note:</b> If a frame contains 84 points, we slice first 42 (positions) and ignore the rest.</div>
                        <div style={{ marginTop: 6 }}>
                            If train-seen/unseen shows “missing”, it means your run’s <code>filelist.js</code> doesn’t include that motion id.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
