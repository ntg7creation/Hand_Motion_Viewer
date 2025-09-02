// App_126.jsx
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { loadGigaHandsJSONL } from "./utils/loadGigaHands";

async function loadJSONL(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  const text = await res.text();
  return text.trim().split("\n").map(line => JSON.parse(line));
}

// --- Helpers ---------------------------------------------------------------

function extractFirst21Positions(frame) {
  // first 21 entries = positions (RIC), keep xyz
  return frame.slice(0, 21).map(([x, y, z]) => [x, y, z]);
}
function extractSecond21Velocities(frame) {
  // second 21 entries = velocities, keep xyz
  return frame.slice(21, 42).map(([x, y, z]) => [x, y, z]);
}

/** Integrate velocities to get a new hand pose sequence.
 *  Starts at the same place as the original positions at t=0,
 *  then pos[t] = pos[t-1] + vel[t] (you can switch to vel[t-1] if that’s your convention)
 */
function integrateVelocityFrom(pos0, velPerFrame) {
  const T = velPerFrame.length;
  const J = pos0.length;
  const out = new Array(T);
  out[0] = pos0.map(p => [...p]);

  for (let t = 1; t < T; t++) {
    const prev = out[t - 1];
    const vel = velPerFrame[t - 1]; // <-- CURRENT LINE
    const next = new Array(J);
    for (let j = 0; j < J; j++) {
      const [px, py, pz] = prev[j];
      const [vx, vy, vz] = vel[j];
      const dt = 1 / 5; // or whatever fps you use
      next[j] = [px + vx * dt, py + vy * dt, pz + vz * dt];
    }
    out[t] = next;
  }
  return out;
}


// --- Colors & drawing ------------------------------------------------------

const JOINT_COLORS = [
  "#ffffff", // 0: Root (white)
  "#ff8c00", "#ff8c00", "#ff8c00", "#ff8c00", // Thumb (orange)
  "#00bfff", "#00bfff", "#00bfff", "#00bfff", // Index (blue)
  "#7fff00", "#7fff00", "#7fff00", "#7fff00", // Middle (green)
  "#ff1493", "#ff1493", "#ff1493", "#ff1493", // Ring (pink)
  "#9932cc", "#9932cc", "#9932cc", "#9932cc", // Pinky (purple)
];

// Distinct palette for the velocity-integrated hand
const VELOCITY_COLORS = [
  "#00ffff", // root cyan
  "#00e5ff", "#00e5ff", "#00e5ff", "#00e5ff",
  "#00ffd0", "#00ffd0", "#00ffd0", "#00ffd0",
  "#76ff03", "#76ff03", "#76ff03", "#76ff03",
  "#ffea00", "#ffea00", "#ffea00", "#ffea00",
  "#ff9100", "#ff9100", "#ff9100", "#ff9100",
];

function DotCloud({ points, color, colors }) {
  return points.map((pos, i) => (
    <mesh key={i} position={pos}>
      <sphereGeometry args={[0.015, 8, 8]} />
      <meshStandardMaterial color={colors?.[i] || color || JOINT_COLORS[i] || "gray"} />
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

function FrameAnimator({
  frames,               // RIC position frames (21 points)
  velIntegratedFrames,  // velocity-integrated position frames (21 points)
  ghFrames = [],
  showGH = false,
  showVelHand = true,
  fps,
  paused = false
}) {
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

  const posPoints = frames[index];
  const velPoints = velIntegratedFrames?.[index]?.map(([x, y, z]) => [x, y + 0.55, z]);
  const ghPoints = ghFrames[index]?.map(([x, y, z]) => [x, y + 0.55, z]); // lift GH for clarity

  return (
    <>
      {/* Original hand (positions / RIC) */}
      <DotCloud points={posPoints} />
      <BoneLines points={posPoints} color="white" />

      {/* Velocity-integrated ghost hand */}
      {showVelHand && velPoints && (
        <>
          <DotCloud points={velPoints} colors={VELOCITY_COLORS} />
          <BoneLines points={velPoints} color="#00ffff" />
        </>
      )}

      {/* Optional: GigaHands overlay */}
      {showGH && ghPoints && (
        <>
          <DotCloud points={ghPoints} color="red" />
          <BoneLines points={ghPoints} color="red" />
        </>
      )}
    </>
  );
}

// --- Main component --------------------------------------------------------

export default function App_126() {
  const [posFrames, setPosFrames] = useState([]);
  const [velIntegratedFrames, setVelIntegratedFrames] = useState([]);
  const [ghFrames, setGhFrames] = useState([]);
  const [fps, setFps] = useState(20);
  const [showGH, setShowGH] = useState(false);
  const [showVelHand, setShowVelHand] = useState(true);
  const [paused, setPaused] = useState(false);

  // Optional GH overlay
  useEffect(() => {
    if (!showGH) return;
    loadGigaHandsJSONL("/hand_poses/p001-folder/keypoints_3d/000/left.jsonl")
      .then(setGhFrames)
      .catch(console.error);
  }, [showGH]);

  // Load model output JSONL and split into pos/vel, then integrate vel
  useEffect(() => {
    loadJSONL("/gigahands/model_full_inference_132_3.jsonl")
      .then(rawFrames => {
        // 1) positions
        const pos = rawFrames.map(f => extractFirst21Positions(f));
        setPosFrames(pos);

        // 2) per-frame per-joint velocities
        const velPerFrame = rawFrames.map(f => extractSecond21Velocities(f));

        // 3) integrate velocities from the same start pose as pos[0]
        const integrated = integrateVelocityFrom(pos[0], velPerFrame);
        setVelIntegratedFrames(integrated);

        console.log("✔ Loaded frames:", rawFrames.length);
      })
      .catch(console.error);
  }, []);

  const haveFrames = posFrames.length > 0 && velIntegratedFrames.length === posFrames.length;

  return (
    <>
      <Canvas camera={{ position: [0, 1, 3], fov: 50 }} style={{ height: "100vh", background: "#111" }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[1, 2, 1]} intensity={1} />
        <primitive object={new THREE.AxesHelper(1)} />
        <OrbitControls />

        {haveFrames && (
          <FrameAnimator
            frames={posFrames}
            velIntegratedFrames={velIntegratedFrames}
            ghFrames={ghFrames}
            showGH={showGH}
            showVelHand={showVelHand}
            fps={fps}
            paused={paused}
          />
        )}
      </Canvas>

      {/* UI */}
      <div style={{
        position: "absolute", top: 10, left: 10, color: "white",
        background: "rgba(0,0,0,0.6)", padding: 12, borderRadius: 8
      }}>
        <div style={{ fontWeight: "bold" }}>App_126 Viewer</div>
        <div>Showing 21 locations from 42-joint frame</div>

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

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <input type="checkbox" checked={showVelHand} onChange={e => setShowVelHand(e.target.checked)} />
          Show velocity-integrated hand
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <input type="checkbox" checked={showGH} onChange={e => setShowGH(e.target.checked)} />
          Show original GigaHands data
        </label>
      </div>
    </>
  );
}
