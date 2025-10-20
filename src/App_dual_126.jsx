// App_dual_126.jsx
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

async function loadJSONL(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    const text = await res.text();
    return text.trim().split("\n").map(line => JSON.parse(line));
}

// --- Helpers ---------------------------------------------------------------

function extractHands(frame) {
    // frame: [[x,y,z], ... 42 entries]
    const left = frame.slice(0, 21).map(([x, y, z]) => [x, y, z]);
    const right = frame.slice(21, 42).map(([x, y, z]) => [x, y, z]);
    return { left, right };
}

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

const BONES = [
    [0, 1], [1, 2], [2, 3], [3, 4],        // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8],        // Index
    [0, 9], [9, 10], [10, 11], [11, 12],   // Middle
    [0, 13], [13, 14], [14, 15], [15, 16], // Ring
    [0, 17], [17, 18], [18, 19], [19, 20]  // Pinky
];

function DotCloud({ points, colors }) {
    return points.map((pos, i) => (
        <mesh key={i} position={pos}>
            <sphereGeometry args={[0.015, 8, 8]} />
            <meshStandardMaterial color={colors?.[i] || "white"} />
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

// --- Animator --------------------------------------------------------------

function FrameAnimator({ frames, fps, paused = false }) {
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
            <DotCloud points={left} colors={JOINT_COLORS_LEFT} />
            <BoneLines points={left} color="white" />
            <DotCloud points={right} colors={JOINT_COLORS_RIGHT} />
            <BoneLines points={right} color="cyan" />
        </>
    );
}

// --- Main component --------------------------------------------------------

export default function App_dual_126() {
    const [frames, setFrames] = useState([]);
    const [fps, setFps] = useState(20);
    const [paused, setPaused] = useState(false);
    useEffect(() => {
        loadJSONL("/gigahands_concat/identity.jsonl")
            .then(rawFrames => {
                const parsed = rawFrames.map(extractHands);
                setFrames(parsed);
                console.log("✔ Loaded dual-hand frames:", rawFrames.length);
            })
            .catch(console.error);
    }, []);

    const haveFrames = frames.length > 0;

    return (
        <>
            <Canvas camera={{ position: [0, 1, 3], fov: 50 }} style={{ height: "100vh", background: "#111" }}>
                <ambientLight intensity={0.8} />
                <directionalLight position={[1, 2, 1]} intensity={1} />
                <primitive object={new THREE.AxesHelper(1)} />
                <OrbitControls />
                {haveFrames && <FrameAnimator frames={frames} fps={fps} paused={paused} />}
            </Canvas>

            {/* UI */}
            <div style={{
                position: "absolute", top: 10, left: 10, color: "white",
                background: "rgba(0,0,0,0.6)", padding: 12, borderRadius: 8
            }}>
                <div style={{ fontWeight: "bold" }}>App_dual_126 Viewer</div>
                <div>Showing 2 hands (21 joints each)</div>

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
                        type="range"
                        min={1}
                        max={60}
                        value={fps}
                        onChange={e => setFps(parseInt(e.target.value))}
                        style={{ width: 160 }}
                    />
                    <span>FPS: {fps}</span>
                </label>
            </div>
        </>
    );
}
