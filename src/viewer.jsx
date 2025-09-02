import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import React, { useEffect, useRef, useState } from 'react';



const MotionViewer = ({ motion }) => {
    const rootRef = useRef();
    const jointRefs = useRef([]);
    const frameRef = useRef(0);
    const tickCounter = useRef(0);
    const scale = 1.0;
    const speed = 4; // Increase this to slow down (e.g. 4 = update every 4 frames)

    useFrame(() => {
        if (!motion || motion.length !== 263 || !motion[0]?.[0]?.length) return;

      tickCounter.current += 1;
      if (tickCounter.current % speed !== 0) return;

      const totalFrames = motion[0][0].length;
      const currentIndex = frameRef.current % totalFrames;

      const frame = motion.map(channel => channel[0][currentIndex]); // [263]
      const rootX = Number(frame[0]) * scale;
      const rootY = Number(frame[1]) * scale;
      const rootZ = Number(frame[2]) * scale;

      rootRef.current?.position.set(rootX, rootY, rootZ);

      const ric = frame.slice(9, 69); // 20 joints × 3

      for (let i = 1; i < 20; i++) {
          const x = Number(ric[i * 3]);
          const y = Number(ric[i * 3 + 1]);
          const z = Number(ric[i * 3 + 2]);

          const px = x * scale;
          const py = y * scale;
          const pz = z * scale;

          jointRefs.current[i]?.position.set(px, py, pz);
      }

      frameRef.current += 1;
  });

    return (
      <group>
          {/* Moving Root Joint (red) */}
          <mesh ref={rootRef}>
              <sphereGeometry args={[0.05, 16, 16]} />
              <meshStandardMaterial color="red" />
              {/* Child Joints */}
              {Array.from({ length: 19 }).map((_, i) => (
                  <mesh key={i + 1} ref={(el) => (jointRefs.current[i + 1] = el)}>
                      <sphereGeometry args={[0.04, 16, 16]} />
                      <meshStandardMaterial color="orange" />
                  </mesh>
              ))}
          </mesh>
      </group>
  );
};





export default function Viewer() {
    const [motion, setMotion] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('[INFO] Loading motion data...');
        fetch('/generated_motion/results.json')
            .then((res) => res.json())
            .then((data) => {
                const raw = data.motion?.[0]; // shape: [263][1][60]
                console.log('[DEBUG] Loaded motion shape:', raw?.length, raw?.[0]?.[0]?.length);
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
                    Loading motion...
                </div>
            )}
            {!loading && motion && (
                <div style={{ position: 'absolute', top: 10, left: 10, color: 'white' }}>
                    Playing RIC motion
                </div>
            )}

            <div style={{ width: '100vw', height: '100vh' }}>
                <Canvas camera={{ position: [0, 0.5, 3], fov: 50 }}>
                    <ambientLight />
                    <pointLight position={[10, 10, 10]} />
                    {motion && <MotionViewer motion={motion} />}
                    <axesHelper args={[1]} />
                    <OrbitControls />
        </Canvas>
            </div>
        </>
    );
}
