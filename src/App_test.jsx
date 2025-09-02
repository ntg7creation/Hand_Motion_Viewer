import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// ---------- Utils ----------

// Load .jsonl and parse into array-of-frames
async function loadJSONL(path) {
    const res = await fetch(path);
    const text = await res.text();
    if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);

    return text
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
}

// Strip [x, y, z, 1.0] → [x, y, z] (works for [x,y,z] too)
function stripW(frame) {
    return frame.map(([x, y, z]) => [x, y, z]);
}

// ---------- Visuals ----------

function DotCloud({ points, color }) {
    return (
        <>
            {points.map((pos, i) => (
                <mesh key={i} position={pos}>
                    <sphereGeometry args={[0.015, 8, 8]} />
                    <meshStandardMaterial color={color} />
                </mesh>
            ))}
        </>
    );
}

function BoneLines({ points, bones }) {
    return (
        <>
            {bones.map(([start, end], i) => {
                if (!points[start] || !points[end]) return null;
                const geometry = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(...points[start]),
                    new THREE.Vector3(...points[end]),
                ]);
                const material = new THREE.LineBasicMaterial({
                    color: new THREE.Color(`hsl(${(i / bones.length) * 360}, 100%, 50%)`),
                });
                return <line key={i} geometry={geometry} material={material} />;
            })}
        </>
    );
}

/** A minimal “bones” set. Keep or replace with your full hand skeleton edges. */
const SIMPLE_BONES = [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
];

/** Renders a single frame from a motion sequence (no internal ticking). */
function FrameLayer({ motion, frameIndex, color = "lime", withBones = true, bones = SIMPLE_BONES }) {
    if (!motion?.length) return null;
    const idx = frameIndex % motion.length;
    const frameData = motion[idx].map((p) => new THREE.Vector3(...p));
    return (
        <>
            <DotCloud points={frameData} color={color} />
            {withBones && <BoneLines points={frameData} bones={bones} />}
        </>
    );
}

/** Drives a shared playhead so multiple layers stay perfectly in sync. */
function Playhead({ length, speedSec = 0.05, onFrame }) {
    const t = useRef(0);
    const f = useRef(0);
    useFrame((_, delta) => {
        if (!length) return;
        t.current += delta;
        if (t.current >= speedSec) {
            t.current = 0;
            f.current = (f.current + 1) % length;
            onFrame(f.current);
        }
    });
    return null;
}

// ---------- App ----------

export default function App() {
    const [modelMotion, setModelMotion] = useState([]); // from model_inference.jsonl
    const [ghLeftMotion, setGhLeftMotion] = useState([]); // from GigaHands left.jsonl

    // Shared playhead (both layers use this)
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        // 1) Generated motion
        loadJSONL("/model_inference.jsonl")
            .then((data) => {
                console.log("✅ Loaded model_inference.jsonl:", data.length, "frames");
                setModelMotion(data.map(stripW));
            })
            .catch((err) => console.error("❌ Failed to load model_inference.jsonl:", err));

        // 2) Ground-truth GigaHands sequence (left hand)
        //    Path maps from your public folder: D:\repos\Hand_Motion_Viewer\public\hand_poses\...
        const ghBase = "/hand_poses/p001-folder/keypoints_3d/000/left.jsonl";
        loadJSONL(ghBase)
            .then((data) => {
                console.log("✅ Loaded GigaHands left.jsonl:", data.length, "frames");
                setGhLeftMotion(data.map(stripW));
            })
            .catch((err) => console.error("❌ Failed to load GigaHands left.jsonl:", err));
    }, []);

    // The playhead should loop the longest clip so both keep moving
    const maxLen = Math.max(modelMotion.length || 0, ghLeftMotion.length || 0);

    return (
        <div style={{ height: "100vh", width: "100vw" }}>
            <Canvas camera={{ position: [0, 1, 3] }} style={{ background: "#1e1e2f" }}>
                <primitive object={new THREE.AxesHelper(0.5)} />
                <ambientLight intensity={0.5} />
                <directionalLight position={[2, 3, 2]} intensity={0.6} />
                <OrbitControls />

                {/* shared ticker to keep layers in sync */}
                {maxLen > 0 && <Playhead length={maxLen} speedSec={0.05} onFrame={setFrame} />}

                {/* Model output (lime, with simple bones) */}
                {modelMotion.length > 0 && (
                    <FrameLayer motion={modelMotion} frameIndex={frame} color="lime" withBones bones={SIMPLE_BONES} />
                )}

                {/* GigaHands GT overlay (cyan points, no bones by default) */}
                {ghLeftMotion.length > 0 && (
                    <FrameLayer motion={ghLeftMotion} frameIndex={frame} color="#00c8ff" withBones={false} />
                )}
            </Canvas>
        </div>
    );
}
