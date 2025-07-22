import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

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
    timer.current += delta;
    if (timer.current > 0.02) {
      timer.current = 0;
      frameRef.current = (frameRef.current + 1) % motion.length;
      setFrame(frameRef.current);
    }
  });

  const frameData = motion[frame].map((p) => new THREE.Vector3(...p));
  return <DotCloud points={frameData} color={color} />;
}

export default function App() {
  const [motions, setMotions] = useState([]);

  useEffect(() => {
    fetch("/results.json")
      .then((res) => res.json())
      .then((data) => {
        setMotions(data.motion); // [object, hand mesh, joints]
      });
  }, []);

  return (
    <div className="canvas-container">
      <Canvas camera={{ position: [0, 1, 3] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 3, 2]} intensity={0.6} />
        <OrbitControls />
        {motions.length > 0 && (
          <>
            {/* object */}
            <FrameAnimator motion={motions[0]} color="orange" />
            {/* hand mesh */}
            {/* <FrameAnimator motion={motions[1]} color="skyblue" /> */}
            {/* joints */}
            <FrameAnimator motion={motions[2]} color="white" />
          </>
        )}
      </Canvas>
    </div>
  );
}
