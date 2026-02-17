import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import FILE_LIST from "./file_list_old";

// --- CONFIG ---
const FOLDER = "/infer_rewritten_500";         // generated motions
const ORIG_FOLDER = "/hand_poses";   // <--- path to your real motions



const JOINT_COLORS_LEFT = [
    "#ffffff", "#ff8c00", "#ff8c00", "#ff8c00", "#ff8c00",
    "#00bfff", "#00bfff", "#00bfff", "#00bfff",
    "#7fff00", "#7fff00", "#7fff00", "#7fff00",
    "#ff1493", "#ff1493", "#ff1493", "#ff1493",
    "#9932cc", "#9932cc", "#9932cc", "#9932cc",
];

const JOINT_COLORS_RIGHT = [
    "#aaaaaa", "#ffbb55", "#ffbb55", "#ffbb55", "#ffbb55",
    "#55ddff", "#55ddff", "#55ddff", "#55ddff",
    "#99ff55", "#99ff55", "#99ff55", "#99ff55",
    "#ff77bb", "#ff77bb", "#ff77bb", "#ff77bb",
    "#cc88ff", "#cc88ff", "#cc88ff", "#cc88ff",
];

async function loadJSONL(path) {
    console.log("🔄 Fetching:", path);
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    const text = await res.text();
    console.log(" Fetched:", path);
    return text.trim().split("\n").map(line => JSON.parse(line));
}

function extractHands(frame) {
    const left = frame.slice(0, 21).map(([x, y, z]) => [x, y, z]);
    const right = frame.slice(21, 42).map(([x, y, z]) => [x, y, z]);
    return { left, right };
}

const BONES = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
];

function DotCloud({ points, colors, scale = 1.0 }) {
    return points.map((pos, i) => (
        <mesh key={i} position={pos}>
            <sphereGeometry args={[0.015 * scale, 8, 8]} />
            <meshStandardMaterial color={colors?.[i] || "red"} />
        </mesh>
    ));
}

function BoneLines({ points, color = "white" }) {
    return BONES.map(([a, b], i) => {
        if (!points[a] || !points[b]) return null;
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(...points[a]),
            new THREE.Vector3(...points[b])
        ]);
        const material = new THREE.LineBasicMaterial({ color });
        return <line key={i} geometry={geometry} material={material} />;
    });
}

function FrameAnimator({ frames, fps, paused = false, colorLeft = "white", colorRight = "cyan", scale = 1.0, solidColor = false }) {
    const [index, setIndex] = useState(0);
    const acc = useRef(0);
    const refIdx = useRef(0);
    const dt = 1 / fps;

    useFrame((_, delta) => {
        if (paused) return;
        acc.current += delta;
        if (acc.current > dt) {
            acc.current = 0;
            refIdx.current = (refIdx.current + 1) % frames.length;
            setIndex(refIdx.current);
        }
    });

    const { left, right } = frames[index] || { left: [], right: [] };
    return (
        <>
            <DotCloud points={left} colors={solidColor ? Array(left.length).fill(colorLeft) : JOINT_COLORS_LEFT} scale={scale} />
            <BoneLines points={left} color={colorLeft} />
            <DotCloud points={right} colors={solidColor ? Array(right.length).fill(colorRight) : JOINT_COLORS_RIGHT} scale={scale} />
            <BoneLines points={right} color={colorRight} />
        </>
    );
}

export default function App_render_infrance() {
    const [frames, setFrames] = useState([]);
    const [origFrames, setOrigFrames] = useState([]);
    const [fps, setFps] = useState(20);
    const [paused, setPaused] = useState(false);
    const [selectedFile, setSelectedFile] = useState("");
    const [showOriginal, setShowOriginal] = useState(false);

    // Load generated motion
    useEffect(() => {
        if (!selectedFile) return;
        const path = `${FOLDER}/${selectedFile}`;
        loadJSONL(path)
            .then(rawFrames => {
                setFrames(rawFrames.map(extractHands));
                console.log("✔ Loaded generated motion:", rawFrames.length);
            })
            .catch(console.error);
    }, [selectedFile]);

    // Load original motion (left + right)
    // Load original motion (left + right)
    useEffect(() => {
        if (!showOriginal) return;
        if (!selectedFile) return;

        const fileObj = FILE_LIST.find(f => f.filename === selectedFile);
        if (!fileObj) return;

        const { scene, sequence } = fileObj;
        const leftPath = `${ORIG_FOLDER}/${scene}/keypoints_3d/${sequence}/left.jsonl`;
        const rightPath = `${ORIG_FOLDER}/${scene}/keypoints_3d/${sequence}/right.jsonl`;

        console.log("Loading original:", scene, sequence);
        Promise.all([loadJSONL(leftPath), loadJSONL(rightPath)])
            .then(([leftFrames, rightFrames]) => {
                const frameCount = Math.min(leftFrames.length, rightFrames.length);
                const merged = Array.from({ length: frameCount }, (_, i) => ({
                    left: leftFrames[i].map(([x, y, z]) => [x, y + 0.5, z]),
                    right: rightFrames[i].map(([x, y, z]) => [x, y + 0.5, z]),
                }));
                setOrigFrames(merged);
            })
            .catch(err => console.warn("⚠️ Could not load original motion:", err));
    }, [showOriginal, selectedFile]);




    return (
        <>
            <Canvas camera={{ position: [0, 1, 3], fov: 50 }} style={{ height: "100vh", background: "#111" }}>
                <ambientLight intensity={0.8} />
                <directionalLight position={[1, 2, 1]} intensity={1} />
                <primitive object={new THREE.AxesHelper(1)} />
                <OrbitControls />

                {frames.length > 0 && (
                    <FrameAnimator frames={frames} fps={fps} paused={paused} />
                )}

                {showOriginal && origFrames.length > 0 && (
                    <FrameAnimator frames={origFrames} fps={fps} paused={paused}
                        colorLeft="red" colorRight="red" scale={0.9} solidColor={true} />
                )}
            </Canvas>

            {/* UI Panel */}
            <div style={{
                position: "absolute", top: 10, left: 10, color: "white",
                background: "rgba(0,0,0,0.6)", padding: 12, borderRadius: 8
            }}>
                <div style={{ fontWeight: "bold" }}>App_renderer Viewer</div>

                <label style={{ display: "block", marginTop: 10 }}>
                    File:&nbsp;
                    <select value={selectedFile}
                        onChange={e => setSelectedFile(e.target.value)}
                        style={{ padding: 4, borderRadius: 4 }}>
                        <option value="">Select a motion...</option>
                        {FILE_LIST.map((item, idx) => (
                            <option
                                key={`${item.filename}-${idx}`}
                                value={item.filename}
                            >
                                {`${item.scene} (${item.sequence})`}
                            </option>
                        ))}

                    </select>
                </label>

                <button
                    onClick={() => setPaused(p => !p)}
                    style={{
                        marginTop: 10, padding: "6px 12px",
                        background: "#444", color: "white",
                        border: "none", borderRadius: 4, cursor: "pointer"
                    }}
                >
                    {paused ? "▶ Play" : "⏸ Pause"}
                </button>

                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                    <input
                        type="range" min={1} max={60}
                        value={fps}
                        onChange={e => setFps(parseInt(e.target.value))}
                        style={{ width: 160 }}
                    />
                    <span>FPS: {fps}</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                    <input
                        type="checkbox"
                        checked={showOriginal}
                        onChange={e => setShowOriginal(e.target.checked)}
                    />
                    <span>Show Original (red)</span>
                </label>
            </div>
        </>
    );
}
