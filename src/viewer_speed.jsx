import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const VelocityViewer = ({ motion }) => {
    const jointRefs = useRef([]);
    const frameRef = useRef(0);
    const stepSize = 0.1; // Controls how much velocity affects movement
    const speed = 4; // How many ticks between frame updates
    const tickCounter = useRef(0);
    const scale = 1.0;

    // Initialize position buffer
    const positionsRef = useRef(
        Array.from({ length: 20 }, () => new THREE.Vector3(0, 0, 0))
    );

    useEffect(() => {
        if (!motion || motion.length !== 263 || !motion[0]?.[0]?.length) return;

        // Initialize joint positions from frame 0's RIC
        const frame0 = motion.map((c) => c[0][0]); // [263]
        const ric = frame0.slice(9, 69); // 20 joints * 3
        for (let i = 0; i < 20; i++) {
            const x = Number(ric[i * 3]) * scale;
            const y = Number(ric[i * 3 + 1]) * scale;
            const z = Number(ric[i * 3 + 2]) * scale;
            positionsRef.current[i] = new THREE.Vector3(x, y, z);
        }
    }, [motion]);

    useFrame(() => {
        if (!motion || motion.length !== 263 || !motion[0]?.[0]?.length) return;

        tickCounter.current += 1;
        if (tickCounter.current % speed !== 0) return;

        const totalFrames = motion[0][0].length;
        const index = frameRef.current % totalFrames;
        const frame = motion.map((c) => c[0][index]); // [263]

        const velocity = frame.slice(189, 249); // 20 joints * 3

        for (let i = 0; i < 20; i++) {
            const dx = Number(velocity[i * 3]) * stepSize * scale;
            const dy = Number(velocity[i * 3 + 1]) * stepSize * scale;
            const dz = Number(velocity[i * 3 + 2]) * stepSize * scale;

            positionsRef.current[i].x += dx;
            positionsRef.current[i].y += dy;
            positionsRef.current[i].z += dz;

            if (jointRefs.current[i]) {
                jointRefs.current[i].position.copy(positionsRef.current[i]);
            }
        }

        frameRef.current += 1;
    });

    return (
        <group>
            {Array.from({ length: 20 }).map((_, i) => (
                <mesh key={i} ref={(el) => (jointRefs.current[i] = el)}>
                    <sphereGeometry args={[0.04, 16, 16]} />
                    <meshStandardMaterial color={i === 0 ? 'red' : 'orange'} />
                </mesh>
            ))}
        </group>
    );
};

export default function ViewerSpeed() {
    const [motion, setMotion] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('[INFO] Loading motion data...');
        fetch('/generated_motion/results.json')
            .then((res) => res.json())
            .then((data) => {
                const raw = data.motion?.[0]; // shape: [263][1][60]
                console.log('[DEBUG] Motion loaded:', raw?.length, raw?.[0]?.[0]?.length);
                setMotion(raw);
                setLoading(false);
            })
            .catch((err) => {
                console.error('[ERROR] Failed to load motion data:', err);
                setLoading(false);
            });
    }, []);

    return (
        <>
            {loading && (
                <div style={{ position: 'absolute', top: 10, left: 10, color: 'white' }}>
                    Loading velocity motion...
                </div>
            )}
            {!loading && motion && (
                <div style={{ position: 'absolute', top: 10, left: 10, color: 'white' }}>
                    Velocity-based motion
                </div>
            )}

            <div style={{ width: '100vw', height: '100vh' }}>
                <Canvas camera={{ position: [0, 0.5, 3], fov: 50 }}>
                    <ambientLight />
                    <pointLight position={[10, 10, 10]} />
                    {motion && <VelocityViewer motion={motion} />}
                    <axesHelper args={[1]} />
                    <OrbitControls />
                </Canvas>
            </div>
        </>
    );
}
