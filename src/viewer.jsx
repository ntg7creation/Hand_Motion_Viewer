import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

function FrameAnimator({ motion }) {
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

    if (!motion[frame] || motion[frame].length === 0) return null;


    return (
        <>
            {motion[frame].map((joint, i) => (
                <mesh key={i} position={joint}>
                    <sphereGeometry args={[0.015, 8, 8]} />
                    <meshStandardMaterial color="white" />
                </mesh>
            ))}
        </>
    );
}

export default function Viewer() {
    const [motions, setMotions] = useState([]);

    useEffect(() => {
        async function fetchMotion() {
            try {
                const res = await fetch("/results.json");
                const json = await res.json();
                console.log("[LOADED] Results JSON", json);

                const motions = json.motion.map((seq, sIdx) => {
                    return seq.map((frame, fIdx) => {
                        if (!Array.isArray(frame) || frame.length < 21) {
                            console.warn(`[SKIP] Frame ${fIdx} in sample ${sIdx} has ${frame.length} joints`);
                            return null;
                        }
                        return frame.map(([x, y, z]) => new THREE.Vector3(x, y, z));
                    }).filter(f => f); // filter out invalid frames
                });

                console.log("[INFO] Parsed", motions.length, "valid samples");
                console.log("[INFO] First frame joint 0 pos:", motions[0]?.[0]?.[0]);

                setMotions(motions);
            } catch (err) {
                console.error("[ERROR] Loading or parsing motion data", err);
            }
        }

        fetchMotion();
    }, []);


    return (
        <Canvas camera={{ position: [0, 1, 3] }} style={{ height: "100vh", background: "#1e1e2f" }}>
            <OrbitControls />
            <primitive object={new THREE.AxesHelper(0.5)} />
            <ambientLight />
            <directionalLight position={[1, 1, 1]} />
            {motions[0] && <FrameAnimator motion={motions[0]} />}
        </Canvas>
    );
}
