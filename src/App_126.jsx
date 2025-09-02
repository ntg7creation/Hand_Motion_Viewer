import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import { loadGigaHandsJSONL } from "./utils/loadGigaHands";

import * as THREE from "three";

async function loadJSONL(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  const text = await res.text();
  return text.trim().split("\n").map(line => JSON.parse(line));
}

function extractFirst21Positions(frame) {
  return frame.slice(0, 21).map(([x, y, z]) => [x, y, z]);
}

const JOINT_COLORS = [
  "#ffffff", // 0: Root (white)

  "#ff8c00", "#ff8c00", "#ff8c00", "#ff8c00", // 1-4: Thumb (orange)
  "#00bfff", "#00bfff", "#00bfff", "#00bfff", // 5-8: Index (blue)
  "#7fff00", "#7fff00", "#7fff00", "#7fff00", // 9-12: Middle (green)
  "#ff1493", "#ff1493", "#ff1493", "#ff1493", // 13-16: Ring (pink)
  "#9932cc", "#9932cc", "#9932cc", "#9932cc", // 17-20: Pinky (purple)
];

function DotCloud({ points, colorOverride }) {
  return points.map((pos, i) => (
    <mesh key={i} position={pos}>
      <sphereGeometry args={[0.015, 8, 8]} />
      <meshStandardMaterial color={colorOverride || JOINT_COLORS[i] || "gray"} />
    </mesh>
  ));
}

const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],        // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],        // Index
  [0, 9], [9, 10], [10, 11], [11, 12],   // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20]  // Pinky
];

function BoneLines({ points }) {
  return BONES.map(([a, b], i) => {
    if (!points[a] || !points[b]) return null;
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...points[a]),
      new THREE.Vector3(...points[b])
    ]);
    const material = new THREE.LineBasicMaterial({ color: "white" });
    return <line key={i} geometry={geometry} material={material} />;
  });
}

function FrameAnimator({ frames, ghFrames = [], showGH = false, fps, paused = false }) {

  const [index, setIndex] = useState(0);
  const acc = useRef(0);
  const refIdx = useRef(0);
  const dt = 1 / fps;

  useFrame((_, delta) => {
    if (paused) return;  // ⏸️ skip frame advancement
    acc.current += delta;
    if (acc.current > dt) {
      acc.current = 0;
      refIdx.current = (refIdx.current + 1) % frames.length;
      setIndex(refIdx.current);
    }
  });


  const points = frames[index];
  // const ghPoints = ghFrames[index]; // May be undefined
  // Offset GigaHands by +0.15 in Y
  const ghPoints = ghFrames[index]?.map(([x, y, z]) => [x, y + 0.55, z]);


  return (
    <>
      <DotCloud points={points} />          {/* Model output */}
      <BoneLines points={points} />

      {showGH && ghPoints && (
        <>
          <DotCloud points={ghPoints} colorOverride="red" />
          <BoneLines points={ghPoints} colorOverride="red" />
        </>
      )}
    </>
  );
}


export default function App_126() {
  const [frames, setFrames] = useState([]);
  const [fps, setFps] = useState(20);
  const [showGH, setShowGH] = useState(false);
  const [ghFrames, setGhFrames] = useState([]);
  const [paused, setPaused] = useState(false);


  useEffect(() => {
    if (!showGH) return;
    loadGigaHandsJSONL("/hand_poses/p001-folder/keypoints_3d/000/left.jsonl")
      .then(setGhFrames)
      .catch(console.error);
  }, [showGH]);

  useEffect(() => {
    loadJSONL("/model_inference_denorm.jsonl").then(rawFrames => {
      const cleaned = rawFrames.map(f => extractFirst21Positions(f));
      setFrames(cleaned);
      console.log("✔ Loaded frames:", cleaned.length);
    }).catch(console.error);
  }, []);

  return (
    <>
      <Canvas camera={{ position: [0, 1, 3], fov: 50 }} style={{ height: "100vh", background: "#111" }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[1, 2, 1]} intensity={1} />
        <primitive object={new THREE.AxesHelper(1)} />
        <OrbitControls />
        {frames.length > 0 && (
          <FrameAnimator
            frames={frames}
            ghFrames={ghFrames}
            showGH={showGH}
            fps={fps}
            paused={paused}
          />
        )}

      </Canvas>
      <div style={{
        position: "absolute", top: 10, left: 10, color: "white",
        background: "rgba(0,0,0,0.6)", padding: 12, borderRadius: 8
      }}>

        <div style={{ fontWeight: "bold" }}>App_126 Viewer</div>
        <div>Showing 21 locations from 42-joint frame</div>
        <button
          onClick={() => setPaused(p => !p)}
          style={{
            marginTop: 10,
            padding: "6px 12px",
            background: "#444",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer"
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

        {/* ✅ Add checkbox for showing GigaHands */}
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <input type="checkbox" checked={showGH} onChange={e => setShowGH(e.target.checked)} />
          Show original GigaHands data
        </label>
      </div>

    </>
  );
}
