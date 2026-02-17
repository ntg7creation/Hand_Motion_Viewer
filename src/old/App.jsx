import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";




// Load .jsonl and return array of parsed lines
async function loadJSONL(path) {
  console.log("[loadJSONL] Loading:", path);
  const res = await fetch(path);
  const text = await res.text();

  if (res.status !== 200) {
    console.error(`[loadJSONL] Failed to load ${path}, status:`, res.status);
  }

  if (text.trim().startsWith("<!DOCTYPE")) {
    console.error(`[loadJSONL] Got HTML instead of JSONL at ${path}`);
  }

  try {
    const parsed = text.trim().split("\n").map((line, i) => {
      try {
        return JSON.parse(line);
      } catch (e) {
        console.error(`[loadJSONL] JSON parse error at line ${i}:`, line);
        throw e;
      }
    });
    console.log(`[loadJSONL] Loaded ${parsed.length} entries from ${path}`);
    return parsed;
  } catch (e) {
    console.error(`[loadJSONL] Error parsing JSONL from ${path}:`, e);
    throw e;
  }
}


function BoneLines({ points }) {
  const bones = [
    [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8],       // Index
    [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
    [0, 13], [13, 14], [14, 15], [15, 16],// Ring
    [0, 17], [17, 18], [18, 19], [19, 20] // Pinky
  ];

  return (
    <>
      {bones.map(([start, end], i) => {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...points[start]),
          new THREE.Vector3(...points[end]),
        ]);
        const material = new THREE.LineBasicMaterial({
          color: new THREE.Color(`hsl(${(i / bones.length) * 360}, 100%, 50%)`)
        });

        return <line key={i} geometry={geometry} material={material} />;
      })}
    </>
  );
}


// Drop the 4th component (usually 1.0)
function stripW(frame) {
  return frame.map(([x, y, z]) => [x, y, z]);
}

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

function FrameAnimator({ motion, color }) {
  const [frame, setFrame] = useState(0);
  const frameRef = useRef(0);
  const timer = useRef(0);

  useFrame((_, delta) => {
    if (!motion || motion.length === 0) return;
    timer.current += delta;
    if (timer.current > 0.02) {
      timer.current = 0;
      frameRef.current = (frameRef.current + 1) % motion.length;
      setFrame(frameRef.current);
    }
  });

  if (!motion || !motion[frame]) return null; // ✅ prevent crash

  const frameData = motion[frame].map((p) => new THREE.Vector3(...p));
  return (
    <>
      <DotCloud points={frameData} color={color} />
      <BoneLines points={frameData} />
    </>
  );
}


export default function App() {
  const [annotations, setAnnotations] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [leftMotion, setLeftMotion] = useState([]);
  const [rightMotion, setRightMotion] = useState([]);
  const [annotationText, setAnnotationText] = useState("");

  useEffect(() => {
    async function loadAnnotations() {
      try {
      const data = await loadJSONL("/annotations_v2.jsonl");
      console.log("[loadAnnotations] Loaded", data.length, "annotations");
      setAnnotations(data);
    } catch (e) {
      console.error("[loadAnnotations] Failed:", e);
    }
    }
    loadAnnotations();
  }, []);


  useEffect(() => {
    async function loadMotion() {
      if (annotations.length === 0) return;
      const selected = annotations[selectedIndex];
    console.log("[loadMotion] Selected:", selected);

    setAnnotationText(selected.clarify_annotation);

    const basePath = `/hand_poses/${selected.scene}/keypoints_3d/${selected.sequence}`;
    const leftPath = `${basePath}/left.jsonl`;
    const rightPath = `${basePath}/right.jsonl`;

    try {
      const leftRaw = await loadJSONL(leftPath);
      const rightRaw = await loadJSONL(rightPath);
      console.log("[loadMotion] Loaded left:", leftRaw.length, "frames");
      console.log("[loadMotion] Loaded right:", rightRaw.length, "frames");

      setLeftMotion(leftRaw.map(stripW));
      setRightMotion(rightRaw.map(stripW));
    } catch (e) {
      console.error("[loadMotion] Failed to load motion files:", e);
    }
  }

  loadMotion();
}, [annotations, selectedIndex]);


  return (
    <div className="canvas-container" style={{ height: "100vh", width: "100vw", position: "relative" }}>
      {/* Dropdown Selector */}
      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 10 }}>
        <select
          style={{ padding: "0.5em", fontSize: "1em", width: "250px" }}
          value={selectedIndex}
          onChange={(e) => setSelectedIndex(Number(e.target.value))}
        >
          {annotations.map((a, i) => (
            <option key={i} value={i}>
              {a.scene} / {a.sequence}
            </option>
          ))}
        </select>
        <div style={{ color: "white", marginTop: "0.5em", maxWidth: "400px", fontSize: "0.9em" }}>
          <div><strong>Clarify:</strong> {annotationText}</div>
          <div><strong>Description:</strong> {annotations[selectedIndex]?.description}</div>
          <div><strong>Start Frame:</strong> {annotations[selectedIndex]?.start_frame_id}</div>
          <div><strong>End Frame:</strong> {annotations[selectedIndex]?.end_frame_id}</div>
          <div><strong>Scene / Sequence:</strong> {annotations[selectedIndex]?.scene} / {annotations[selectedIndex]?.sequence}</div>
          <div><strong>Rewritten Annotations:</strong></div>
          <ul>
            {(annotations[selectedIndex]?.rewritten_annotation || []).map((line, idx) => (
              <li key={idx} style={{ lineHeight: "1.3" }}>{line}</li>
            ))}
          </ul>
        </div>


        <div style={{ color: "white", marginTop: "0.5em", maxWidth: "300px" }}>
          <strong>Clarified:</strong> {annotationText}
        </div>
      </div>

      {/* Canvas with custom background */}
      <Canvas camera={{ position: [0, 1, 3] }} style={{ background: "#1e1e2f" }}>
        <primitive object={new THREE.AxesHelper(0.5)} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 3, 2]} intensity={0.6} />
        <OrbitControls />
        {leftMotion.length > 0 && <FrameAnimator motion={leftMotion} color="red" />}
        {rightMotion.length > 0 && <FrameAnimator motion={rightMotion} color="blue" />}
      </Canvas>
    </div>
  );
}
